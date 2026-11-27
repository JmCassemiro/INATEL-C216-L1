"""API de vendas (spec 004, contracts/sales-api.md)."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest

from tests.helpers import gtin13


def create_product(client, number: int, name: str, price: str, stock: int) -> dict:
    response = client.post(
        "/products", json={"name": name, "barcode": gtin13(number), "price": price}
    )
    assert response.status_code == 201, response.text
    product = response.json()
    if stock:
        entry = client.post(
            f"/products/{product['id']}/stock/entries", json={"quantity": stock}
        )
        assert entry.status_code == 201, entry.text
    return product


def stock_of(client, product: dict) -> int:
    return client.get(f"/products/{product['id']}").json()["stock_quantity"]


def sale_body(*lines: tuple[dict, int], payments: list[dict], **overrides) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "items": [
            {"product_id": product["id"], "quantity": quantity, "unit_price": price}
            for product, quantity, price in (
                (product, quantity, product["price"]) for product, quantity in lines
            )
        ],
        "payments": payments,
    } | overrides


def error_locs(response) -> list[list]:
    return [error["loc"] for error in response.json()["detail"]]


@pytest.fixture
def shirt(client) -> dict:
    return create_product(client, 1, "Camiseta Básica Branca M", "49.90", 10)


@pytest.fixture
def socks(client) -> dict:
    return create_product(client, 2, "Meia Cano Curto", "37.70", 10)


@pytest.fixture
def body(shirt, socks) -> dict:
    return sale_body(
        (shirt, 2),
        (socks, 1),
        payments=[
            {"method": "pix", "amount": "50.00"},
            {"method": "cash", "amount": "100.00"},
        ],
    )


# --- registrar ----------------------------------------------------------------


def test_register_returns_201_with_the_sale(client, body, shirt, socks):
    """FR-013, FR-017, RP-002: a venda registrada, com valores como texto."""
    response = client.post("/sales", json=body)

    assert response.status_code == 201, response.text
    assert response.headers["location"] == f"/sales/{body['id']}"
    sale = response.json()
    assert isinstance(sale["number"], int)
    assert datetime.fromisoformat(sale["occurred_at"]).tzinfo is not None
    assert sale | {"number": None, "occurred_at": None} == {
        "id": body["id"],
        "number": None,
        "occurred_at": None,
        "items": [
            {
                "product_id": shirt["id"],
                "name": "Camiseta Básica Branca M",
                "barcode": shirt["barcode"],
                "unit_price": "49.90",
                "quantity": 2,
                "subtotal": "99.80",
            },
            {
                "product_id": socks["id"],
                "name": "Meia Cano Curto",
                "barcode": socks["barcode"],
                "unit_price": "37.70",
                "quantity": 1,
                "subtotal": "37.70",
            },
        ],
        "payments": [
            {"method": "pix", "amount": "50.00"},
            {"method": "cash", "amount": "100.00"},
        ],
        "total": "137.50",
        "paid": "150.00",
        "change": "12.50",
        "item_count": 3,
    }


def test_register_takes_the_stock_out_with_a_sale_movement(client, body, shirt):
    """FR-019: o saldo baixa e o histórico mostra a venda."""
    sale = client.post("/sales", json=body).json()

    assert stock_of(client, shirt) == 8
    latest = client.get(f"/products/{shirt['id']}/stock/movements").json()["items"][0]
    assert (latest["kind"], latest["quantity"], latest["balance_after"]) == (
        "sale",
        -2,
        8,
    )
    assert latest["note"] == f"Venda nº {sale['number']}"


def test_resending_the_same_sale_returns_200_and_changes_nothing(client, body, shirt):
    """FR-016, SC-005: reenvio devolve a mesma venda, sem nova baixa."""
    first = client.post("/sales", json=body)

    again = client.post("/sales", json=body)

    assert again.status_code == 200
    assert again.json() == first.json()
    assert stock_of(client, shirt) == 8


def test_rejected_sale_returns_409_with_the_problems(client, shirt, socks):
    """FR-014, D7: os problemas de cada item, sem gravar nada."""
    client.put(
        f"/products/{socks['id']}",
        json={"name": socks["name"], "barcode": socks["barcode"], "price": "39.90"},
    )
    body = sale_body(
        (shirt, 11), (socks, 1), payments=[{"method": "cash", "amount": "999.00"}]
    )

    response = client.post("/sales", json=body)

    assert response.status_code == 409
    assert response.json() == {
        "detail": "Não foi possível finalizar a venda. Revise os itens destacados.",
        "problems": [
            {
                "product_id": shirt["id"],
                "reason": "insufficient_stock",
                "message": "Há só 10 un. de Camiseta Básica Branca M em estoque",
                "available": 10,
                "current_price": None,
            },
            {
                "product_id": socks["id"],
                "reason": "price_changed",
                "message": "O preço de Meia Cano Curto mudou para R$ 39,90",
                "available": None,
                "current_price": "39.90",
            },
        ],
    }
    assert stock_of(client, shirt) == 10
    assert client.get("/sales").json()["total"] == 0


def test_sale_with_a_removed_product_returns_409(client, shirt, socks):
    """FR-014: produto removido do catálogo."""
    client.delete(f"/products/{socks['id']}")
    body = sale_body(
        (shirt, 1), (socks, 1), payments=[{"method": "cash", "amount": "100.00"}]
    )

    response = client.post("/sales", json=body)

    assert response.status_code == 409
    (problem,) = response.json()["problems"]
    assert (problem["reason"], problem["message"]) == (
        "unavailable",
        "Meia Cano Curto não está mais à venda",
    )


@pytest.mark.parametrize(
    ("payments", "message"),
    [
        (
            [{"method": "pix", "amount": "10.00"}],
            "Os pagamentos não cobrem o total: faltam R$ 39,90",
        ),
        (
            [{"method": "credit_card", "amount": "60.00"}],
            "Só o pagamento em dinheiro pode passar do total e gerar troco",
        ),
        (
            [
                {"method": "debit_card", "amount": "49.90"},
                {"method": "cash", "amount": "5.00"},
            ],
            "O troco não pode ser igual ou maior que o valor pago em dinheiro",
        ),
    ],
)
def test_payments_that_do_not_close_return_422_on_payments(
    client, shirt, payments, message
):
    """FR-010, FR-011: erro no campo `payments`, sem gravar nada."""
    response = client.post("/sales", json=sale_body((shirt, 1), payments=payments))

    assert response.status_code == 422
    assert response.json()["detail"] == [
        {"loc": ["body", "payments"], "msg": message, "type": "value_error"}
    ]
    assert stock_of(client, shirt) == 10


@pytest.mark.parametrize(
    ("change", "loc"),
    [
        ({"items": []}, ["body", "items"]),
        ({"payments": []}, ["body", "payments"]),
        ({"id": "nao-e-uuid"}, ["body", "id"]),
    ],
)
def test_invalid_shape_returns_422(client, shirt, change, loc):
    """FR-008, FR-009: forma inválida, com o campo no `loc`."""
    body = sale_body((shirt, 1), payments=[{"method": "pix", "amount": "49.90"}])

    response = client.post("/sales", json=body | change)

    assert response.status_code == 422
    assert loc in error_locs(response)


@pytest.mark.parametrize(
    ("item_change", "field"),
    [
        ({"quantity": "2"}, "quantity"),
        ({"quantity": 2.5}, "quantity"),
        ({"quantity": 1000}, "quantity"),
        ({"unit_price": "0"}, "unit_price"),
    ],
)
def test_invalid_item_returns_422(client, shirt, item_change, field):
    """FR-005: quantidade inteira de 1 a 999; preço válido."""
    body = sale_body((shirt, 1), payments=[{"method": "pix", "amount": "49.90"}])
    body["items"][0] |= item_change

    response = client.post("/sales", json=body)

    assert response.status_code == 422
    assert ["body", "items", 0, field] in error_locs(response)


@pytest.mark.parametrize(
    ("payment", "field"),
    [
        ({"method": "check", "amount": "49.90"}, "method"),
        ({"method": "pix", "amount": "0"}, "amount"),
        ({"method": "pix", "amount": "49.999"}, "amount"),
    ],
)
def test_invalid_payment_returns_422(client, shirt, payment, field):
    """FR-009: meio conhecido e valor positivo com até duas casas."""
    response = client.post("/sales", json=sale_body((shirt, 1), payments=[payment]))

    assert response.status_code == 422
    assert ["body", "payments", 0, field] in error_locs(response)


# --- consultar ----------------------------------------------------------------


def test_list_comes_newest_first_and_paginated(client, shirt):
    """FR-021: da mais recente para a mais antiga."""
    payments = [{"method": "pix", "amount": "49.90"}]
    ids = [
        client.post("/sales", json=sale_body((shirt, 1), payments=payments)).json()[
            "id"
        ]
        for _ in range(3)
    ]

    response = client.get("/sales", params={"page": 1, "size": 2})

    assert response.status_code == 200
    page = response.json()
    assert (page["total"], page["page"], page["size"]) == (3, 1, 2)
    assert [sale["id"] for sale in page["items"]] == [ids[2], ids[1]]


def test_get_one_sale(client, body):
    """FR-022: o detalhe da venda."""
    created = client.post("/sales", json=body).json()

    response = client.get(f"/sales/{body['id']}")

    assert response.status_code == 200
    assert response.json() == created


def test_get_unknown_sale_returns_404(client):
    """FR-022: venda inexistente."""
    response = client.get(f"/sales/{uuid.uuid4()}")

    assert response.status_code == 404
    assert response.json() == {"detail": "Venda não encontrada"}


def test_summary_of_the_day(client, body, shirt):
    """FR-023: vendas, faturamento e ticket médio do intervalo pedido."""
    client.post("/sales", json=body)
    client.post(
        "/sales",
        json=sale_body((shirt, 1), payments=[{"method": "pix", "amount": "49.90"}]),
    )
    now = datetime.now(UTC)
    local = now.astimezone().replace(hour=0, minute=0, second=0, microsecond=0)

    response = client.get(
        "/sales/summary",
        params={
            "start": local.isoformat(),
            "end": (local + timedelta(days=1)).isoformat(),
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "count": 2,
        "revenue": "187.40",
        "average_ticket": "93.70",
    }


def test_summary_of_an_interval_without_sales(client, body):
    client.post("/sales", json=body)
    past = datetime(2020, 1, 1, tzinfo=UTC)

    response = client.get(
        "/sales/summary",
        params={
            "start": past.isoformat(),
            "end": (past + timedelta(days=1)).isoformat(),
        },
    )

    assert response.json() == {"count": 0, "revenue": "0.00", "average_ticket": "0.00"}


@pytest.mark.parametrize(
    "params",
    [
        {},
        {"start": "2026-11-25T00:00:00-03:00"},
        {"start": "2026-11-25T00:00:00", "end": "2026-11-26T00:00:00"},
        {"start": "2026-11-26T00:00:00-03:00", "end": "2026-11-25T00:00:00-03:00"},
    ],
    ids=["missing", "no-end", "no-timezone", "end-before-start"],
)
def test_summary_requires_a_valid_interval_with_timezone(client, params):
    """FR-023: início e fim obrigatórios, com fuso, e o fim depois do início."""
    response = client.get("/sales/summary", params=params)

    assert response.status_code == 422
