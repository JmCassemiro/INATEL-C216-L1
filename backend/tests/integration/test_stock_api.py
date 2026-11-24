"""API do estoque (spec 011, contracts/stock-api.md §2–§6)."""

import uuid
from datetime import datetime

import pytest

PRODUCT = {
    "name": "Camiseta Básica Branca M",
    "barcode": "7891000315507",
    "price": "49.90",
}


def create_product(client, **overrides) -> dict:
    response = client.post("/products", json=PRODUCT | overrides)
    assert response.status_code == 201, response.text
    return response.json()


def entries_path(product: dict) -> str:
    return f"/products/{product['id']}/stock/entries"


def adjustments_path(product: dict) -> str:
    return f"/products/{product['id']}/stock/adjustments"


def movements_path(product: dict) -> str:
    return f"/products/{product['id']}/stock/movements"


def enter(client, product: dict, quantity: int, note: str | None = None) -> dict:
    response = client.post(
        entries_path(product), json={"quantity": quantity, "note": note}
    )
    assert response.status_code == 201, response.text
    return response.json()


def stock_of(client, product: dict) -> int:
    return client.get(f"/products/{product['id']}").json()["stock_quantity"]


def error_locs(response) -> list[list]:
    return [error["loc"] for error in response.json()["detail"]]


@pytest.fixture
def product(client) -> dict:
    return create_product(client)


# --- entrada ------------------------------------------------------------------


def test_entry_returns_201_with_the_movement(client, product):
    """FR-003, FR-007, RP-002: a entrada devolve a movimentação registrada."""
    response = client.post(
        entries_path(product), json={"quantity": 24, "note": "  NF 1234 "}
    )

    assert response.status_code == 201
    body = response.json()
    assert uuid.UUID(body["id"]).version == 7
    assert datetime.fromisoformat(body["occurred_at"]).tzinfo is not None
    assert body | {"id": None, "occurred_at": None} == {
        "id": None,
        "product_id": product["id"],
        "sequence": 1,
        "kind": "entry",
        "quantity": 24,
        "balance_after": 24,
        "note": "NF 1234",
        "occurred_at": None,
    }


def test_entry_changes_the_product_stock(client, product):
    """FR-003, FR-025: o saldo novo aparece no produto, com a situação."""
    client.patch(f"/products/{product['id']}", json={"min_stock": 30})

    enter(client, product, 24)

    body = client.get(f"/products/{product['id']}").json()
    assert body["stock_quantity"] == 24
    assert body["shortfall"] == 6
    assert body["stock_status"] == "restock"


def test_entry_without_note_stores_null(client, product):
    """FR-003: a observação é opcional."""
    response = client.post(entries_path(product), json={"quantity": 1})

    assert response.status_code == 201
    assert response.json()["note"] is None


@pytest.mark.parametrize(
    "quantity",
    [None, "2", 2.5, True, 0, -1, 100_000],
    ids=["missing", "text", "fraction", "bool", "zero", "negative", "too-big"],
)
def test_entry_rejects_invalid_quantity(client, product, quantity):
    """FR-003, RP-002: quantidade inteira de 1 a 99.999, no campo `quantity`."""
    body = {} if quantity is None else {"quantity": quantity}

    response = client.post(entries_path(product), json=body)

    assert response.status_code == 422
    assert error_locs(response) == [["body", "quantity"]]
    assert stock_of(client, product) == 0


def test_entry_rejects_long_note(client, product):
    """FR-003: observação de até 200 caracteres."""
    response = client.post(
        entries_path(product), json={"quantity": 1, "note": "x" * 201}
    )

    assert response.status_code == 422
    assert error_locs(response) == [["body", "note"]]


# --- ajuste -------------------------------------------------------------------


def test_adjustment_returns_201_and_subtracts(client, product):
    """FR-005: retirar 2 de 36 deixa 34; o motivo vira a observação."""
    enter(client, product, 36)

    response = client.post(
        adjustments_path(product),
        json={"quantity": -2, "reason": "Avaria no transporte"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["kind"] == "adjustment"
    assert body["quantity"] == -2
    assert body["balance_after"] == 34
    assert body["note"] == "Avaria no transporte"
    assert body["sequence"] == 2
    assert stock_of(client, product) == 34


@pytest.mark.parametrize(
    ("body", "loc"),
    [
        ({"quantity": 0, "reason": "Contagem"}, ["body", "quantity"]),
        ({"quantity": -100_000, "reason": "Contagem"}, ["body", "quantity"]),
        ({"quantity": "1", "reason": "Contagem"}, ["body", "quantity"]),
        ({"quantity": 1}, ["body", "reason"]),
        ({"quantity": 1, "reason": "   "}, ["body", "reason"]),
        ({"quantity": 1, "reason": "ok"}, ["body", "reason"]),
        ({"quantity": 1, "reason": "x" * 201}, ["body", "reason"]),
    ],
    ids=["zero", "too-big", "text", "no-reason", "blank", "short", "long"],
)
def test_adjustment_rejects_invalid_data(client, product, body, loc):
    """FR-005, RP-002: quantidade com sinal e motivo de 3 a 200 caracteres."""
    response = client.post(adjustments_path(product), json=body)

    assert response.status_code == 422
    assert error_locs(response) == [loc]


def test_adjustment_below_zero_returns_409_and_saves_nothing(client, product):
    """FR-006: o saldo não fica negativo; a mensagem diz o disponível."""
    enter(client, product, 3)

    response = client.post(
        adjustments_path(product), json={"quantity": -5, "reason": "Perda"}
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "Saldo insuficiente: há 3 unidades em estoque"}
    assert stock_of(client, product) == 3
    assert client.get(movements_path(product)).json()["total"] == 1


def test_movement_above_the_limit_returns_409(client, product):
    """FR-004: o saldo não passa de 999.999 unidades."""
    for _ in range(10):
        enter(client, product, 99_999)

    response = client.post(entries_path(product), json={"quantity": 10})

    assert response.status_code == 409
    assert response.json() == {"detail": "O saldo não pode passar de 999.999 unidades"}
    assert stock_of(client, product) == 999_990


# --- produto inexistente ------------------------------------------------------


@pytest.mark.parametrize(
    ("method", "suffix", "body"),
    [
        ("post", "entries", {"quantity": 1}),
        ("post", "adjustments", {"quantity": 1, "reason": "Contagem"}),
        ("get", "movements", None),
    ],
)
def test_unknown_or_removed_product_returns_404(client, product, method, suffix, body):
    """Edge case: produto inexistente ou removido não tem estoque."""
    client.delete(f"/products/{product['id']}")

    for product_id in [product["id"], str(uuid.uuid7())]:
        response = client.request(
            method, f"/products/{product_id}/stock/{suffix}", json=body
        )
        assert response.status_code == 404
        assert response.json() == {"detail": "Produto não encontrado"}


def test_invalid_product_id_returns_422(client):
    """RP-002: o id precisa ser um UUID."""
    response = client.post("/products/abc/stock/entries", json={"quantity": 1})

    assert response.status_code == 422
    assert error_locs(response) == [["path", "product_id"]]


# --- histórico ----------------------------------------------------------------


def test_movements_are_listed_newest_first_with_pagination(client, product):
    """FR-009: histórico paginado, do mais recente ao mais antigo."""
    for quantity in [5, 3, 2]:
        enter(client, product, quantity)

    response = client.get(movements_path(product), params={"page": 1, "size": 2})

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 3
    assert body["page"] == 1
    assert body["size"] == 2
    assert [item["sequence"] for item in body["items"]] == [3, 2]
    assert [item["balance_after"] for item in body["items"]] == [10, 8]


def test_movements_default_page_size_is_20(client, product):
    """FR-009: sem parâmetros, page=1 e size=20."""
    body = client.get(movements_path(product)).json()

    assert body == {"items": [], "total": 0, "page": 1, "size": 20}


@pytest.mark.parametrize("params", [{"page": 0}, {"size": 0}, {"size": 101}])
def test_movements_reject_invalid_pagination(client, product, params):
    """FR-009: page ≥ 1 e size de 1 a 100."""
    response = client.get(movements_path(product), params=params)

    assert response.status_code == 422


# --- resumo -------------------------------------------------------------------


def test_summary_reports_restock_out_of_stock_and_value(client):
    """FR-018: para repor, sem estoque e valor do estoque a preço de venda."""
    shirt = create_product(client, min_stock=10)
    create_product(client, name="Calça", barcode="96385074")
    enter(client, shirt, 8)

    response = client.get("/stock/summary")

    assert response.status_code == 200
    assert response.json() == {
        "restock_count": 1,
        "out_of_stock_count": 1,
        "stock_value": "399.20",
    }


def test_summary_of_an_empty_catalog(client):
    """FR-018: sem produtos, tudo zerado, valor com duas casas."""
    assert client.get("/stock/summary").json() == {
        "restock_count": 0,
        "out_of_stock_count": 0,
        "stock_value": "0.00",
    }
