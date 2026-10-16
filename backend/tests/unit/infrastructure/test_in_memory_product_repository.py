import threading
import time
import uuid
from datetime import UTC, datetime
from decimal import Decimal

import pytest

from app.domain.barcode import Barcode
from app.domain.errors import DuplicateBarcodeError, ProductNotFoundError
from app.domain.product import Product
from app.infrastructure.repositories.in_memory_product_repository import (
    InMemoryProductRepository,
)
from tests.helpers import gtin13


def make_product(barcode: str = "7891000315507", name: str = "Camiseta") -> Product:
    return Product.create(name, None, barcode, Decimal("49.90"))


@pytest.fixture
def repository() -> InMemoryProductRepository:
    return InMemoryProductRepository()


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


def test_concurrent_adds_with_same_barcode_store_only_one(repository):
    """SC-002, D9: com cadastros simultâneos do mesmo código, só um é aceito."""
    threads_count = 20
    barrier = threading.Barrier(threads_count)
    results: list[str] = []

    def add_product():
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


def test_get_by_barcode_is_fast_with_10000_products(repository):
    """SC-004: com 10.000 produtos, a busca por código responde em menos de 1 s."""
    for number in range(10_000):
        repository.add(make_product(gtin13(number)))
    target = Barcode(gtin13(9_999))

    start = time.perf_counter()
    found = repository.get_by_barcode(target)
    elapsed = time.perf_counter() - start

    assert found is not None
    assert elapsed < 1


# --- US2: listar ---------------------------------------------------------------


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


def test_list_returns_products_in_insertion_order_with_total(repository, clothes):
    """FR-009: lista em ordem de cadastro, com o total."""
    assert repository.list(0, 10, None) == (clothes, 3)


def test_list_slices_with_offset_and_limit(repository, clothes):
    """FR-009: offset e limit recortam a lista; o total é o do catálogo."""
    assert repository.list(1, 1, None) == ([clothes[1]], 3)


def test_list_offset_past_the_end_returns_empty_with_total(repository, clothes):
    """FR-009: página além do fim vem vazia, com o total."""
    assert repository.list(10, 10, None) == ([], 3)


@pytest.mark.parametrize("name", ["calca", "CALÇA", "Calç"])
def test_list_filters_by_name_ignoring_case_and_accents(repository, clothes, name):
    """FR-010: busca por parte do nome, sem diferenciar maiúsculas e acentos."""
    assert repository.list(0, 10, name) == ([clothes[0], clothes[2]], 2)


def test_list_filters_and_paginates_together(repository, clothes):
    """FR-009, FR-010: o total é o da busca, e a página recorta o resultado."""
    assert repository.list(1, 1, "calca") == ([clothes[2]], 2)


@pytest.mark.parametrize("name", [None, ""])
def test_list_without_name_does_not_filter(repository, clothes, name):
    """FR-010: sem nome, a listagem não é filtrada."""
    assert repository.list(0, 10, name) == (clothes, 3)


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
    """FR-012: a atualização substitui o registro e mantém a ordem de cadastro."""
    new_version = changed(clothes[1], name="Camiseta Preta")

    repository.update(new_version)

    assert repository.get_by_id(new_version.id) == new_version
    assert repository.list(0, 10, None) == ([clothes[0], new_version, clothes[2]], 3)


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
    assert repository.list(0, 10, None) == ([clothes[1], clothes[2]], 2)


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
