"""Contrato da porta `ProductRepository`, verificado em todas as implementações."""

import threading
import uuid
from collections.abc import Callable, Iterator
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.application.commands import ProductOrder
from app.application.ports.product_repository import ProductRepository
from app.domain.barcode import Barcode
from app.domain.errors import DuplicateBarcodeError, ProductNotFoundError
from app.domain.product import Product
from app.infrastructure.repositories.in_memory_product_repository import (
    InMemoryProductRepository,
)
from app.infrastructure.repositories.sqlalchemy_product_repository import (
    SqlAlchemyProductRepository,
)
from tests.helpers import gtin13

type RepositoryFactory = Callable[[], ProductRepository]


def make_product(barcode: str = "7891000315507", name: str = "Camiseta") -> Product:
    return Product.create(name, None, barcode, Decimal("49.90"))


@pytest.fixture(params=["in_memory", "sqlalchemy"])
def repository_factory(request) -> Iterator[RepositoryFactory]:
    """Cria repositórios que enxergam o mesmo armazenamento.

    No SQLAlchemy, cada repositório tem a própria sessão, como cada requisição na API.
    """
    if request.param == "in_memory":
        repository = InMemoryProductRepository()
        yield lambda: repository
        return

    session_factory = request.getfixturevalue("session_factory")
    sessions: list[Session] = []

    def make_repository() -> ProductRepository:
        session = session_factory()
        sessions.append(session)
        return SqlAlchemyProductRepository(session)

    yield make_repository
    for session in sessions:
        session.close()


@pytest.fixture
def repository(repository_factory) -> ProductRepository:
    return repository_factory()


def test_get_by_id_returns_added_product(repository):
    """FR-006: o produto cadastrado é encontrado pelo id."""
    product = make_product()

    repository.add(product)

    assert repository.get_by_id(product.id) == product


def test_get_by_id_returns_none_for_unknown_id(repository):
    """FR-008: id desconhecido não é encontrado."""
    assert repository.get_by_id(uuid.uuid7()) is None


@pytest.mark.parametrize("code", ["7891000315507", "07891000315507"])
def test_get_by_barcode_finds_by_equivalent_gtin(repository, code):
    """FR-007, D6: busca pelo mesmo código ou pela forma com zero à esquerda."""
    product = make_product("7891000315507")
    repository.add(product)

    assert repository.get_by_barcode(Barcode(code)) == product


def test_get_by_barcode_returns_none_for_unknown_code(repository):
    """FR-008: código não cadastrado não é encontrado."""
    assert repository.get_by_barcode(Barcode("7891000315507")) is None


@pytest.mark.parametrize("code", ["7891000315507", "07891000315507"])
def test_add_rejects_used_gtin_and_stores_nothing(repository, code):
    """FR-005, SC-001: código já usado (inclusive na forma equivalente) é recusado."""
    repository.add(make_product("7891000315507"))
    duplicate = make_product(code)

    with pytest.raises(DuplicateBarcodeError):
        repository.add(duplicate)

    assert repository.get_by_id(duplicate.id) is None


def test_concurrent_adds_with_same_barcode_store_only_one(repository_factory):
    """SC-002, D9: com cadastros simultâneos do mesmo código, só um é aceito."""
    threads_count = 20
    barrier = threading.Barrier(threads_count)
    results: list[str] = []

    def add_product():
        repository = repository_factory()
        product = make_product()
        barrier.wait()
        try:
            repository.add(product)
            results.append("ok")
        except DuplicateBarcodeError:
            results.append("duplicate")

    threads = [threading.Thread(target=add_product) for _ in range(threads_count)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert results.count("ok") == 1
    assert results.count("duplicate") == threads_count - 1


# --- US2: listar ---------------------------------------------------------------


def newest_first(products: list[Product]) -> list[Product]:
    """Ordem da listagem (FR-005 da spec 007): o último cadastrado vem primeiro."""
    return list(reversed(products))


@pytest.fixture
def clothes(repository) -> list[Product]:
    products = [
        make_product(gtin13(1), "Calça Jeans 40"),
        make_product(gtin13(2), "Camiseta Básica"),
        make_product(gtin13(3), "calça moletom"),
    ]
    for product in products:
        repository.add(product)
    return products


def test_list_returns_newest_products_first_with_total(repository, clothes):
    """FR-009 (002), FR-005 (007): do mais recente para o mais antigo, com o total."""
    assert repository.list(0, 10, None) == (newest_first(clothes), 3)


def test_list_slices_with_offset_and_limit(repository, clothes):
    """FR-009: offset e limit recortam a lista; o total é o do catálogo."""
    assert repository.list(1, 1, None) == ([clothes[1]], 3)


def test_list_offset_past_the_end_returns_empty_with_total(repository, clothes):
    """FR-009: página além do fim vem vazia, com o total."""
    assert repository.list(10, 10, None) == ([], 3)


@pytest.mark.parametrize("name", ["calca", "CALÇA", "Calç"])
def test_list_filters_by_name_ignoring_case_and_accents(repository, clothes, name):
    """FR-010: busca por parte do nome, sem diferenciar maiúsculas e acentos."""
    assert repository.list(0, 10, name) == ([clothes[2], clothes[0]], 2)


def test_list_filters_and_paginates_together(repository, clothes):
    """FR-009, FR-010: o total é o da busca, e a página recorta o resultado."""
    assert repository.list(1, 1, "calca") == ([clothes[0]], 2)


@pytest.mark.parametrize("name", [None, ""])
def test_list_without_name_does_not_filter(repository, clothes, name):
    """FR-010: sem nome, a listagem não é filtrada."""
    assert repository.list(0, 10, name) == (newest_first(clothes), 3)


# --- US3: atualizar --------------------------------------------------------------


def changed(product: Product, **overrides) -> Product:
    data = {
        "name": product.name,
        "description": product.description,
        "barcode": product.barcode.value,
        "price": product.price.value,
    } | overrides
    return product.updated(**data)


def test_update_replaces_product_and_keeps_its_position(repository, clothes):
    """FR-012: a atualização substitui o registro e mantém a posição na lista."""
    new_version = changed(clothes[1], name="Camiseta Preta")

    repository.update(new_version)

    assert repository.get_by_id(new_version.id) == new_version
    assert repository.list(0, 10, None) == ([clothes[2], new_version, clothes[0]], 3)


def test_update_keeping_own_barcode_is_allowed(repository, clothes):
    """FR-015: manter o próprio código não é conflito."""
    new_version = changed(clothes[0], price="10.00")

    repository.update(new_version)

    assert repository.get_by_id(new_version.id) == new_version


def test_update_to_another_products_barcode_is_rejected(repository, clothes):
    """FR-005, FR-015, FR-017: o código de outro produto é recusado e nada muda."""
    with pytest.raises(DuplicateBarcodeError):
        repository.update(changed(clothes[0], barcode=clothes[1].barcode.value))

    assert repository.get_by_id(clothes[0].id) == clothes[0]
    assert repository.get_by_id(clothes[1].id) == clothes[1]


def test_update_barcode_frees_the_old_code(repository, clothes):
    """FR-015: ao trocar de código, o antigo fica livre e o novo acha o produto."""
    new_version = changed(clothes[0], barcode=gtin13(99))

    repository.update(new_version)

    assert repository.get_by_barcode(clothes[0].barcode) is None
    assert repository.get_by_barcode(Barcode(gtin13(99))) == new_version
    repository.add(make_product(clothes[0].barcode.value))


# --- US4: remover ------------------------------------------------------------------

REMOVED_AT = datetime(2026, 10, 16, 12, 0, tzinfo=UTC)


@pytest.fixture
def removed(repository, clothes) -> Product:
    removed = clothes[0].removed(REMOVED_AT)
    repository.update(removed)
    return removed


def test_removed_product_is_not_found(repository, clothes, removed):
    """FR-016: o produto removido some das consultas e da listagem."""
    assert repository.get_by_id(removed.id) is None
    assert repository.get_by_barcode(removed.barcode) is None
    assert repository.list(0, 10, None) == ([clothes[2], clothes[1]], 2)


def test_removed_products_barcode_stays_reserved(repository, removed):
    """FR-005, FR-016: o código do produto removido continua reservado."""
    with pytest.raises(DuplicateBarcodeError):
        repository.add(make_product(removed.barcode.value))


def test_update_over_removed_product_is_rejected(repository, clothes, removed):
    """D9, FR-016a: gravar sobre um produto removido não o ressuscita."""
    stale_version = changed(clothes[0], name="Calça Nova")

    with pytest.raises(ProductNotFoundError):
        repository.update(stale_version)

    assert repository.get_by_id(removed.id) is None


def test_update_unknown_product_is_rejected(repository):
    """FR-008: atualizar um produto que não está guardado é "não encontrado"."""
    with pytest.raises(ProductNotFoundError):
        repository.update(make_product())


# --- estoque (spec 011) -------------------------------------------------------


@pytest.fixture
def shelf(repository) -> dict[str, Product]:
    """Produtos com mínimos diferentes e saldo 0: a falta é o próprio mínimo."""
    products = {
        "banana": Product.create("Banana", None, gtin13(11), Decimal("5.00"), 4),
        "agua": Product.create("Água Mineral", None, gtin13(12), Decimal("2.50"), 9),
        "abacate": Product.create("abacate", None, gtin13(13), Decimal("8.00"), 0),
        "cafe": Product.create("Café", None, gtin13(14), Decimal("19.90"), 9),
    }
    for product in products.values():
        repository.add(product)
    return products


def names(products: list[Product]) -> list[str]:
    return [product.name for product in products]


def test_min_stock_is_stored(repository, shelf):
    """FR-012 (011): o mínimo do cadastro é gravado e lido."""
    found = repository.get_by_id(shelf["agua"].id)

    assert found is not None
    assert found.min_stock == 9
    assert found.stock_quantity == 0


def test_list_by_name_ignores_case_and_accents(repository, shelf):
    """FR-016 (011): ordem alfabética, sem diferenciar maiúsculas e acentos."""
    items, total = repository.list(0, 10, None, order=ProductOrder.NAME)

    assert total == 4
    assert names(items) == ["abacate", "Água Mineral", "Banana", "Café"]


def test_list_restock_only_keeps_products_below_the_minimum(repository, shelf):
    """FR-013, FR-014 (011): só saldo < mínimo; maior falta primeiro; empate: nome."""
    items, total = repository.list(
        0, 10, None, restock_only=True, order=ProductOrder.SHORTFALL
    )

    assert total == 3
    assert names(items) == ["Água Mineral", "Café", "Banana"]


def test_list_restock_filter_combines_with_name_and_pages(repository, shelf):
    """FR-017 (011): filtro, busca e paginação juntos."""
    items, total = repository.list(
        1, 1, "a", restock_only=True, order=ProductOrder.SHORTFALL
    )

    assert total == 3
    assert names(items) == ["Café"]


def test_list_default_order_is_still_newest_first(repository, shelf):
    """FR-005 (007): sem ordem pedida, do mais recente para o mais antigo."""
    items, _ = repository.list(0, 10, None)

    assert names(items) == ["Café", "abacate", "Água Mineral", "Banana"]
