import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from tests.helpers import gtin13

PRODUCT = {
    "name": "Camiseta Básica Branca M",
    "description": "Algodão",
    "barcode": "7891000315507",
    "price": "49.90",
}


def create_product(client, **overrides) -> dict:
    response = client.post("/products", json=PRODUCT | overrides)
    assert response.status_code == 201, response.text
    return response.json()


def error_locs(response) -> list[list]:
    return [error["loc"] for error in response.json()["detail"]]


# --- US1: cadastrar ----------------------------------------------------------


def test_post_creates_product_and_returns_201(client):
    """FR-001, RP-001: o cadastro devolve 201 com o produto criado."""
    response = client.post("/products", json=PRODUCT)

    assert response.status_code == 201
    body = response.json()
    assert uuid.UUID(body["id"]).version == 7
    assert body == {
        "id": body["id"],
        "name": "Camiseta Básica Branca M",
        "description": "Algodão",
        "barcode": "7891000315507",
        "price": "49.90",
    }


def test_post_returns_location_header(client):
    """RP-001: o cabeçalho Location aponta para o produto criado."""
    response = client.post("/products", json=PRODUCT)

    assert response.headers["location"] == f"/products/{response.json()['id']}"


@pytest.mark.parametrize("price", ["49.9", 49.9, 49.90])
def test_post_normalizes_price_to_two_decimals(client, price):
    """FR-003, D5: preço como número ou string sai como string com duas casas."""
    body = create_product(client, price=price)

    assert body["price"] == "49.90"


def test_post_without_description_stores_null(client):
    """FR-002: descrição é opcional."""
    data = {key: value for key, value in PRODUCT.items() if key != "description"}

    response = client.post("/products", json=data)

    assert response.status_code == 201
    assert response.json()["description"] is None


def test_post_repeated_barcode_returns_409_and_keeps_catalog(client):
    """FR-005, FR-017: código repetido é recusado e o catálogo não muda."""
    original = create_product(client)

    response = client.post(
        "/products", json=PRODUCT | {"barcode": "07891000315507", "name": "Outro"}
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "Código de barras já cadastrado"}
    assert client.get("/products/barcode/7891000315507").json() == original


@pytest.mark.parametrize(
    ("field", "value"),
    [
        pytest.param("name", None, id="name-missing"),
        pytest.param("name", "   ", id="name-blank"),
        pytest.param("name", "x" * 121, id="name-121-chars"),
        pytest.param("description", "x" * 501, id="description-501-chars"),
        pytest.param("price", 0, id="price-zero"),
        pytest.param("price", -1, id="price-negative"),
        pytest.param("price", "10.999", id="price-3-decimals"),
        pytest.param("price", 1000000, id="price-too-high"),
        pytest.param("barcode", "7891000315508", id="barcode-check-digit"),
        pytest.param("barcode", 7891000315507, id="barcode-json-number"),
    ],
)
def test_post_invalid_data_returns_422_with_the_field(client, field, value):
    """FR-002 a FR-004, FR-017, RP-003: dado inválido devolve 422 com o campo."""
    data = PRODUCT | {field: value}
    if value is None:
        del data[field]

    response = client.post("/products", json=data)

    assert response.status_code == 422
    assert ["body", field] in error_locs(response)
    assert client.get("/products/barcode/7891000315507").status_code == 404


def test_post_reports_all_invalid_fields_at_once(client):
    """SC-003: o cliente recebe todos os campos inválidos de uma vez."""
    response = client.post("/products", json=PRODUCT | {"name": "", "price": 0})

    assert response.status_code == 422
    assert ["body", "name"] in error_locs(response)
    assert ["body", "price"] in error_locs(response)


# --- US1: consultar por id ---------------------------------------------------


def test_get_by_id_returns_the_product(client):
    """FR-006: o produto é consultado pelo id."""
    created = create_product(client)

    response = client.get(f"/products/{created['id']}")

    assert response.status_code == 200
    assert response.json() == created


def test_get_unknown_id_returns_404(client):
    """FR-008: id desconhecido devolve 404."""
    response = client.get(f"/products/{uuid.uuid7()}")

    assert response.status_code == 404
    assert response.json() == {"detail": "Produto não encontrado"}


def test_get_malformed_id_returns_422(client):
    """Edge case: id fora do formato UUID devolve 422."""
    response = client.get("/products/abc")

    assert response.status_code == 422


# --- US1: consultar por código de barras -------------------------------------


@pytest.mark.parametrize("code", ["7891000315507", "07891000315507"])
def test_get_by_barcode_returns_the_product(client, code):
    """FR-007: consulta pelo código, inclusive na forma GTIN-14."""
    created = create_product(client)

    response = client.get(f"/products/barcode/{code}")

    assert response.status_code == 200
    assert response.json() == created


def test_get_by_invalid_barcode_returns_422(client):
    """FR-004: código fora do padrão GTIN devolve 422."""
    response = client.get("/products/barcode/7891000315508")

    assert response.status_code == 422
    assert ["path", "barcode"] in error_locs(response)


def test_get_by_unknown_barcode_returns_404(client):
    """FR-008: código válido não cadastrado devolve 404."""
    response = client.get("/products/barcode/7891000315507")

    assert response.status_code == 404
    assert response.json() == {"detail": "Produto não encontrado"}


# --- composição ---------------------------------------------------------------


def test_apps_do_not_share_the_catalog():
    """D12: cada aplicação criada tem o próprio catálogo."""
    with TestClient(create_app()) as first, TestClient(create_app()) as second:
        created = create_product(first)

        assert second.get(f"/products/{created['id']}").status_code == 404


# --- US2: listar e buscar ------------------------------------------------------


@pytest.fixture
def catalog(client) -> list[dict]:
    return [
        create_product(client, name=f"Produto {number}", barcode=gtin13(number))
        for number in range(25)
    ]


def test_list_uses_default_page_and_size(client, catalog):
    """FR-009, RP-002: sem parâmetros, page=1 e size=20."""
    response = client.get("/products")

    assert response.status_code == 200
    assert response.json() == {
        "items": catalog[:20],
        "total": 25,
        "page": 1,
        "size": 20,
    }


def test_list_respects_size(client, catalog):
    """FR-009, RP-002: o tamanho da página é o pedido, com o total do catálogo."""
    body = client.get("/products", params={"size": 10}).json()

    assert len(body["items"]) == 10
    assert body["total"] == 25


def test_walking_all_pages_returns_each_product_once(client, catalog):
    """SC-005: percorrer as páginas devolve os 25 produtos, sem repetir nem pular."""
    items = [
        item
        for page in (1, 2, 3)
        for item in client.get("/products", params={"page": page, "size": 10}).json()[
            "items"
        ]
    ]

    assert items == catalog


def test_list_filters_by_name_without_accents(client):
    """FR-010: busca por parte do nome, sem diferenciar maiúsculas e acentos."""
    jeans = create_product(client, name="Calça Jeans 40", barcode=gtin13(1))
    create_product(client, name="Camiseta Básica", barcode=gtin13(2))
    sweatpants = create_product(client, name="calça moletom", barcode=gtin13(3))

    body = client.get("/products", params={"name": "calca"}).json()

    assert body["items"] == [jeans, sweatpants]
    assert body["total"] == 2


def test_list_empty_catalog_returns_200(client):
    """FR-011: catálogo vazio devolve lista vazia, não erro."""
    response = client.get("/products")

    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0, "page": 1, "size": 20}


@pytest.mark.parametrize(
    "params",
    [{"size": 0}, {"size": -1}, {"size": 101}, {"page": 0}],
    ids=["size-0", "size-negative", "size-101", "page-0"],
)
def test_list_invalid_pagination_returns_422(client, params):
    """FR-009, RP-002: page e size fora dos limites devolvem 422."""
    response = client.get("/products", params=params)

    assert response.status_code == 422


def test_list_accepts_max_size(client):
    """FR-009: size=100 é o maior tamanho aceito."""
    response = client.get("/products", params={"size": 100})

    assert response.status_code == 200


# --- US3: substituir (PUT) e alterar (PATCH) -------------------------------------

NEW_DATA = {
    "name": "Camiseta Preta G",
    "description": "Malha fria",
    "barcode": "012345678905",
    "price": "39.90",
}


@pytest.fixture
def product(client) -> dict:
    return create_product(client)


@pytest.fixture
def other_product(client) -> dict:
    return create_product(client, name="Outro", barcode="96385074")


def test_put_replaces_all_data_and_keeps_id(client, product):
    """FR-012: PUT troca todos os dados e mantém o id."""
    response = client.put(f"/products/{product['id']}", json=NEW_DATA)

    assert response.status_code == 200
    assert response.json() == {"id": product["id"], **NEW_DATA}
    assert client.get(f"/products/{product['id']}").json() == response.json()


def test_put_without_description_clears_it(client, product):
    """FR-012: PUT exige o cadastro completo; sem descrição, ela some."""
    data = {key: value for key, value in NEW_DATA.items() if key != "description"}

    response = client.put(f"/products/{product['id']}", json=data)

    assert response.json()["description"] is None


def test_put_without_price_returns_422_and_keeps_product(client, product):
    """FR-012, FR-017: PUT incompleto é recusado e nada muda."""
    data = {key: value for key, value in NEW_DATA.items() if key != "price"}

    response = client.put(f"/products/{product['id']}", json=data)

    assert response.status_code == 422
    assert ["body", "price"] in error_locs(response)
    assert client.get(f"/products/{product['id']}").json() == product


def test_patch_changes_only_the_price(client, product):
    """FR-013: PATCH muda só os campos enviados."""
    response = client.patch(f"/products/{product['id']}", json={"price": "44.90"})

    assert response.status_code == 200
    assert response.json() == product | {"price": "44.90"}
    assert client.get(f"/products/{product['id']}").json() == response.json()


@pytest.mark.parametrize("description", [None, ""])
def test_patch_null_or_empty_description_removes_it(client, product, description):
    """FR-014: descrição nula ou vazia remove a descrição."""
    response = client.patch(
        f"/products/{product['id']}", json={"description": description}
    )

    assert response.status_code == 200
    assert response.json() == product | {"description": None}


def test_patch_empty_body_returns_422(client, product):
    """FR-013: PATCH sem nenhum campo é recusado."""
    response = client.patch(f"/products/{product['id']}", json={})

    assert response.status_code == 422
    assert ["body"] in error_locs(response)


@pytest.mark.parametrize("field", ["name", "barcode", "price"])
def test_patch_null_in_required_field_returns_422(client, product, field):
    """FR-014: nulo só é aceito na descrição."""
    response = client.patch(f"/products/{product['id']}", json={field: None})

    assert response.status_code == 422
    assert ["body", field] in error_locs(response)
    assert client.get(f"/products/{product['id']}").json() == product


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("name", "   "),
        ("price", 0),
        ("price", "10.999"),
        ("barcode", "7891000315508"),
        pytest.param("description", "x" * 501, id="description-501-chars"),
    ],
)
def test_patch_invalid_value_returns_422_and_keeps_product(
    client, product, field, value
):
    """FR-015, FR-017: PATCH usa as regras do cadastro e não muda nada se falhar."""
    response = client.patch(f"/products/{product['id']}", json={field: value})

    assert response.status_code == 422
    assert ["body", field] in error_locs(response)
    assert client.get(f"/products/{product['id']}").json() == product


@pytest.mark.parametrize("method", ["put", "patch"])
def test_change_to_another_products_barcode_returns_409(
    client, product, other_product, method
):
    """FR-005, FR-015, FR-017: o código de outro produto é conflito e nada muda."""
    data = NEW_DATA | {"barcode": other_product["barcode"]}
    if method == "patch":
        data = {"barcode": other_product["barcode"]}

    response = getattr(client, method)(f"/products/{product['id']}", json=data)

    assert response.status_code == 409
    assert response.json() == {"detail": "Código de barras já cadastrado"}
    assert client.get(f"/products/{product['id']}").json() == product


@pytest.mark.parametrize("method", ["put", "patch"])
def test_change_unknown_id_returns_404(client, method):
    """FR-008: PUT e PATCH em id desconhecido devolvem 404."""
    response = getattr(client, method)(f"/products/{uuid.uuid7()}", json=NEW_DATA)

    assert response.status_code == 404
    assert response.json() == {"detail": "Produto não encontrado"}


# --- US4: remover (DELETE) --------------------------------------------------------


def test_delete_returns_204_without_body(client, product):
    """FR-016, RP-001: a remoção devolve 204 sem corpo."""
    response = client.delete(f"/products/{product['id']}")

    assert response.status_code == 204
    assert response.content == b""


def test_removed_product_disappears_from_queries(client, product):
    """FR-016: depois de removido, o produto não é achado nem listado."""
    client.delete(f"/products/{product['id']}")

    assert client.get(f"/products/{product['id']}").status_code == 404
    assert client.get(f"/products/barcode/{product['barcode']}").status_code == 404
    assert client.get("/products").json()["items"] == []


@pytest.mark.parametrize(
    ("method", "kwargs"),
    [
        ("delete", {}),
        ("put", {"json": NEW_DATA}),
        ("patch", {"json": {"price": "1.00"}}),
    ],
)
def test_removed_product_cannot_be_changed(client, product, method, kwargs):
    """FR-016a: remover de novo, substituir ou alterar um removido devolve 404."""
    client.delete(f"/products/{product['id']}")

    response = client.request(method.upper(), f"/products/{product['id']}", **kwargs)

    assert response.status_code == 404
    assert response.json() == {"detail": "Produto não encontrado"}


def test_removed_products_barcode_stays_reserved(client, product):
    """FR-005, FR-016: o código do produto removido continua reservado."""
    client.delete(f"/products/{product['id']}")

    response = client.post("/products", json=PRODUCT | {"name": "Outro"})

    assert response.status_code == 409


def test_delete_malformed_id_returns_422(client):
    """Edge case: id fora do formato UUID devolve 422."""
    assert client.delete("/products/abc").status_code == 422


def test_delete_unknown_id_returns_404(client):
    """FR-008: remover id desconhecido devolve 404."""
    assert client.delete(f"/products/{uuid.uuid7()}").status_code == 404
