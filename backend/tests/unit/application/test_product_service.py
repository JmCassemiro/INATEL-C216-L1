import uuid
from datetime import UTC, datetime
from decimal import Decimal

import pytest

from app.application.commands import ProductChanges, ProductData
from app.application.pagination import Page
from app.application.services.product_service import ProductService
from app.domain.barcode import Barcode
from app.domain.errors import (
    DuplicateBarcodeError,
    InvalidDataError,
    ProductNotFoundError,
)
from app.domain.price import Price
from app.domain.product import Product
from app.infrastructure.repositories.in_memory_product_repository import (
    InMemoryProductRepository,
)
from tests.helpers import gtin13


def product_data(**overrides) -> ProductData:
    data = {
        "name": "Camiseta Básica Branca M",
        "description": "Algodão",
        "barcode": "7891000315507",
        "price": Decimal("49.90"),
    } | overrides
    return ProductData(**data)


@pytest.fixture
def repository() -> InMemoryProductRepository:
    return InMemoryProductRepository()


@pytest.fixture
def service(repository) -> ProductService:
    return ProductService(repository)


# --- cadastrar --------------------------------------------------------------


def test_create_returns_product_with_id_and_normalized_data(service):
    """FR-001, FR-002: o cadastro devolve o produto com id e dados normalizados."""
    product = service.create(
        product_data(name="  Camiseta  ", description="", price=Decimal("49.9"))
    )

    assert product.id.version == 7
    assert product.name == "Camiseta"
    assert product.description is None
    assert product.barcode == Barcode("7891000315507")
    assert product.price == Price("49.90")


def test_create_rejects_repeated_barcode(service):
    """FR-005: código de barras repetido é recusado."""
    service.create(product_data())

    with pytest.raises(DuplicateBarcodeError):
        service.create(product_data(name="Outro produto"))


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("name", "   "),
        ("price", Decimal("0")),
        ("barcode", "7891000315508"),
    ],
)
def test_create_rejects_invalid_data_and_stores_nothing(
    service, repository, field, value
):
    """FR-002 a FR-004, FR-017: dado inválido é recusado sem gravar nada."""
    with pytest.raises(InvalidDataError) as error:
        service.create(product_data(**{field: value}))

    assert error.value.field == field
    assert repository.get_by_barcode(Barcode("7891000315507")) is None


# --- consultar por id -------------------------------------------------------


def test_get_returns_the_product(service):
    """FR-006: o produto é consultado pelo id."""
    created = service.create(product_data())

    assert service.get(created.id) == created


def test_get_unknown_id_raises_not_found(service):
    """FR-008: id desconhecido é "não encontrado"."""
    with pytest.raises(ProductNotFoundError):
        service.get(uuid.uuid7())


# --- consultar por código de barras ------------------------------------------


@pytest.mark.parametrize("code", ["7891000315507", "07891000315507"])
def test_get_by_barcode_returns_the_product(service, code):
    """FR-007: o produto é consultado pelo código, inclusive na forma GTIN-14."""
    created = service.create(product_data(barcode="7891000315507"))

    assert service.get_by_barcode(code) == created


def test_get_by_barcode_unknown_code_raises_not_found(service):
    """FR-008: código válido não cadastrado é "não encontrado"."""
    with pytest.raises(ProductNotFoundError):
        service.get_by_barcode("7891000315507")


def test_get_by_barcode_invalid_code_raises_invalid_data(service):
    """FR-004: código fora do padrão GTIN é dado inválido."""
    with pytest.raises(InvalidDataError) as error:
        service.get_by_barcode("7891000315508")

    assert error.value.field == "barcode"


# --- US2: listar ---------------------------------------------------------------


@pytest.fixture
def catalog(service) -> list[Product]:
    return [
        service.create(product_data(name=f"Produto {number}", barcode=gtin13(number)))
        for number in range(25)
    ]


def test_list_returns_page_with_items_and_metadata(service, catalog):
    """FR-009: a página traz itens, total, número e tamanho."""
    page = service.list(page=1, size=10, name=None)

    assert page == Page(items=catalog[:10], total=25, page=1, size=10)


def test_walking_all_pages_returns_each_product_once_in_order(service, catalog):
    """SC-005: percorrer as páginas devolve cada produto uma vez, em ordem."""
    pages = [service.list(page=number, size=10, name=None) for number in (1, 2, 3)]

    assert [len(page.items) for page in pages] == [10, 10, 5]
    assert [item for page in pages for item in page.items] == catalog


def test_page_past_the_last_is_empty_with_total(service, catalog):
    """FR-009: página além da última vem vazia, com o total."""
    page = service.list(page=4, size=10, name=None)

    assert page.items == []
    assert page.total == 25


def test_list_filters_by_name(service, catalog):
    """FR-010: a listagem filtra por parte do nome."""
    page = service.list(page=1, size=10, name="produto 2")

    assert [item.name for item in page.items] == [
        "Produto 2",
        *(f"Produto {number}" for number in range(20, 25)),
    ]
    assert page.total == 6


# --- US3: substituir e alterar ------------------------------------------------------


@pytest.fixture
def product(service) -> Product:
    return service.create(product_data())


@pytest.fixture
def other_product(service) -> Product:
    return service.create(product_data(name="Outro", barcode="96385074"))


def test_replace_changes_all_data_and_keeps_id(service, product):
    """FR-012: a substituição troca todos os dados e mantém o id."""
    replaced = service.replace(
        product.id,
        ProductData(
            name="Camiseta Preta",
            description=None,
            barcode="012345678905",
            price=Decimal("39.90"),
        ),
    )

    assert replaced.id == product.id
    assert (replaced.name, replaced.description) == ("Camiseta Preta", None)
    assert replaced.barcode == Barcode("012345678905")
    assert replaced.price == Price("39.90")
    assert service.get(product.id) == replaced


def test_update_changes_only_the_given_fields(service, product):
    """FR-013: a alteração parcial muda só os campos informados."""
    updated = service.update(product.id, ProductChanges(price=Decimal("44.90")))

    assert updated.price == Price("44.90")
    assert (updated.name, updated.description, updated.barcode) == (
        product.name,
        product.description,
        product.barcode,
    )
    assert service.get(product.id) == updated


def test_update_with_null_description_removes_it(service, product):
    """FR-014: descrição nula remove a descrição."""
    updated = service.update(product.id, ProductChanges(description=None))

    assert updated.description is None


def test_update_without_fields_is_invalid(service, product):
    """FR-013: alteração sem nenhum campo é recusada."""
    with pytest.raises(InvalidDataError) as error:
        service.update(product.id, ProductChanges())

    assert error.value.field is None
    assert service.get(product.id) == product


def test_update_validates_the_given_fields(service, product):
    """FR-015, FR-017: a alteração usa as regras do cadastro e não grava nada."""
    with pytest.raises(InvalidDataError) as error:
        service.update(product.id, ProductChanges(price=Decimal("0")))

    assert error.value.field == "price"
    assert service.get(product.id) == product


def test_replace_unknown_id_raises_not_found(service):
    """FR-008: substituir id desconhecido é "não encontrado"."""
    with pytest.raises(ProductNotFoundError):
        service.replace(uuid.uuid7(), product_data())


def test_update_unknown_id_raises_not_found(service):
    """FR-008: alterar id desconhecido é "não encontrado"."""
    with pytest.raises(ProductNotFoundError):
        service.update(uuid.uuid7(), ProductChanges(name="Outro"))


def test_replace_with_another_products_barcode_is_rejected(
    service, product, other_product
):
    """FR-015, FR-017: o código de outro produto é recusado e nada muda."""
    with pytest.raises(DuplicateBarcodeError):
        service.replace(product.id, product_data(barcode="96385074"))

    assert service.get(product.id) == product


def test_update_with_another_products_barcode_is_rejected(
    service, product, other_product
):
    """FR-015, FR-017: o código de outro produto é recusado e nada muda."""
    with pytest.raises(DuplicateBarcodeError):
        service.update(product.id, ProductChanges(barcode="96385074"))

    assert service.get(product.id) == product


# --- US4: remover ------------------------------------------------------------------

NOW = datetime(2026, 10, 16, 12, 0, tzinfo=UTC)


@pytest.fixture
def clocked_service(repository) -> ProductService:
    return ProductService(repository, clock=lambda: NOW)


@pytest.fixture
def removed(clocked_service) -> Product:
    product = clocked_service.create(product_data())
    return clocked_service.remove(product.id)


def test_remove_returns_product_removed_at_clock_time(removed):
    """FR-016: a remoção guarda o momento dado pelo relógio."""
    assert removed.removed_at == NOW
    assert removed.is_active is False


@pytest.mark.parametrize(
    "operation",
    [
        lambda service, product: service.get(product.id),
        lambda service, product: service.get_by_barcode(product.barcode.value),
        lambda service, product: service.replace(product.id, product_data()),
        lambda service, product: service.update(product.id, ProductChanges(name="X")),
        lambda service, product: service.remove(product.id),
    ],
    ids=["get", "get_by_barcode", "replace", "update", "remove"],
)
def test_removed_product_is_not_found(clocked_service, removed, operation):
    """FR-016a: produto removido não é encontrado por nenhuma operação."""
    with pytest.raises(ProductNotFoundError):
        operation(clocked_service, removed)


def test_removed_products_barcode_stays_reserved(clocked_service, removed):
    """FR-005, FR-016: o código do produto removido não pode ser reutilizado."""
    with pytest.raises(DuplicateBarcodeError):
        clocked_service.create(product_data(name="Outro"))


def test_remove_unknown_id_raises_not_found(service):
    """FR-008: remover id desconhecido é "não encontrado"."""
    with pytest.raises(ProductNotFoundError):
        service.remove(uuid.uuid7())
