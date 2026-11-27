"""Contrato da porta `StockRepository` em todas as implementações (spec 011)."""

import threading
import uuid
from collections.abc import Callable, Iterator
from dataclasses import dataclass, replace
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.application.ports.product_repository import ProductRepository
from app.application.ports.stock_repository import StockRepository
from app.domain.errors import (
    InsufficientStockError,
    ProductNotFoundError,
    StockLimitExceededError,
)
from app.domain.product import Product
from app.domain.stock import (
    MAX_MOVEMENT_QUANTITY,
    MAX_STOCK_QUANTITY,
    MovementKind,
    StockChange,
)
from app.infrastructure.repositories.in_memory_product_repository import (
    InMemoryProductRepository,
)
from app.infrastructure.repositories.in_memory_stock_repository import (
    InMemoryStockRepository,
)
from app.infrastructure.repositories.in_memory_store import InMemoryStore
from app.infrastructure.repositories.sqlalchemy_product_repository import (
    SqlAlchemyProductRepository,
)
from app.infrastructure.repositories.sqlalchemy_stock_repository import (
    SqlAlchemyStockRepository,
)
from tests.helpers import gtin13

AT = datetime(2026, 11, 24, 17, 35, tzinfo=UTC)


@dataclass(frozen=True)
class Repositories:
    products: ProductRepository
    stock: StockRepository


type RepositoriesFactory = Callable[[], Repositories]


@pytest.fixture(params=["in_memory", "sqlalchemy"])
def factory(request) -> Iterator[RepositoriesFactory]:
    """Cria pares de repositórios que enxergam o mesmo armazenamento.

    No SQLAlchemy, cada par tem a própria sessão, como cada requisição na API.
    """
    if request.param == "in_memory":
        store = InMemoryStore()
        yield lambda: Repositories(
            InMemoryProductRepository(store), InMemoryStockRepository(store)
        )
        return

    session_factory = request.getfixturevalue("session_factory")
    sessions: list[Session] = []

    def make() -> Repositories:
        session = session_factory()
        sessions.append(session)
        return Repositories(
            SqlAlchemyProductRepository(session), SqlAlchemyStockRepository(session)
        )

    yield make
    for session in sessions:
        session.close()


@pytest.fixture
def repos(factory) -> Repositories:
    return factory()


def add_product(
    repos: Repositories, number: int = 1, name: str = "Camiseta", **overrides
) -> Product:
    product = Product.create(
        name,
        None,
        gtin13(number),
        overrides.pop("price", Decimal("49.90")),
        **overrides,
    )
    repos.products.add(product)
    return product


def balance(factory: RepositoriesFactory, product: Product) -> int:
    """Saldo lido por outro "cliente", como numa nova requisição."""
    found = factory().products.get_by_id(product.id)
    assert found is not None
    return found.stock_quantity


# --- registrar movimentações ------------------------------------------------------


def test_record_entry_updates_balance_and_returns_the_movement(factory, repos):
    """FR-003, FR-007: a entrada soma ao saldo e fica registrada com número 1."""
    product = add_product(repos)

    movement = repos.stock.record(product.id, StockChange.entry(24, "NF 1234"), AT)

    assert movement.product_id == product.id
    assert movement.sequence == 1
    assert movement.kind is MovementKind.ENTRY
    assert movement.quantity == 24
    assert movement.balance_after == 24
    assert movement.note == "NF 1234"
    assert balance(factory, product) == 24


def test_record_adjustment_subtracts_from_the_current_balance(factory, repos):
    """FR-005: o ajuste vale sobre o saldo guardado, e a sequência continua."""
    product = add_product(repos)
    repos.stock.record(product.id, StockChange.entry(36), AT)

    movement = factory().stock.record(
        product.id, StockChange.adjustment(-2, "Avaria"), AT
    )

    assert movement.sequence == 2
    assert movement.balance_after == 34
    assert balance(factory, product) == 34


def fill(stock: StockRepository, product: Product, total: int) -> int:
    """Leva o saldo a `total` com entradas de até 99.999; devolve quantas foram."""
    entries = 0
    while total > 0:
        quantity = min(total, MAX_MOVEMENT_QUANTITY)
        stock.record(product.id, StockChange.entry(quantity), AT)
        total -= quantity
        entries += 1
    return entries


@pytest.mark.parametrize(
    ("initial", "change", "error"),
    [
        (3, StockChange.adjustment(-5, "Perda"), InsufficientStockError),
        (MAX_STOCK_QUANTITY - 9, StockChange.entry(10), StockLimitExceededError),
    ],
    ids=["negative", "above-limit"],
)
def test_rejected_movement_saves_nothing(factory, repos, initial, change, error):
    """FR-004, FR-006: a recusa não muda o saldo nem grava movimentação."""
    product = add_product(repos)
    entries = fill(repos.stock, product, initial)

    with pytest.raises(error):
        factory().stock.record(product.id, change, AT)

    assert balance(factory, product) == initial
    assert factory().stock.movements(product.id, 0, 100)[1] == entries


def test_record_on_unknown_product_is_rejected(repos):
    """Edge case: produto inexistente não aceita movimentação."""
    with pytest.raises(ProductNotFoundError):
        repos.stock.record(uuid.uuid7(), StockChange.entry(1), AT)


def test_record_on_removed_product_is_rejected(factory, repos):
    """Edge case: produto removido não aceita movimentação."""
    product = add_product(repos)
    repos.products.update(product.removed(AT))

    with pytest.raises(ProductNotFoundError):
        factory().stock.record(product.id, StockChange.entry(1), AT)


def test_product_update_keeps_the_balance(factory, repos):
    """FR-002, D2: editar o cadastro depois de uma entrada não apaga a entrada."""
    product = add_product(repos)
    factory().stock.record(product.id, StockChange.entry(12), AT)

    repos.products.update(
        product.updated("Camiseta Preta", None, product.barcode.value, "39.90", 5)
    )

    found = factory().products.get_by_id(product.id)
    assert found is not None
    assert found.name == "Camiseta Preta"
    assert found.min_stock == 5
    assert found.stock_quantity == 12


# --- histórico ----------------------------------------------------------------


@pytest.fixture
def history(factory, repos) -> tuple[Product, list[int]]:
    """Produto com entradas de 5, 3 e 2 e uma retirada de 4 (saldo 6)."""
    product = add_product(repos)
    other = add_product(repos, number=2, name="Calça")
    stock = factory().stock
    for change in [
        StockChange.entry(5),
        StockChange.entry(3),
        StockChange.entry(2),
        StockChange.adjustment(-4, "Contagem"),
    ]:
        stock.record(product.id, change, AT)
    stock.record(other.id, StockChange.entry(9), AT)
    return product, [5, 3, 2, -4]


def test_movements_come_newest_first_with_total(factory, history):
    """FR-009, D5: do mais recente ao mais antigo, só os do produto."""
    product, _ = history

    items, total = factory().stock.movements(product.id, 0, 10)

    assert total == 4
    assert [movement.sequence for movement in items] == [4, 3, 2, 1]
    assert [movement.quantity for movement in items] == [-4, 2, 3, 5]
    assert all(movement.occurred_at == AT for movement in items), "com fuso (UTC)"


def test_movements_are_paginated(factory, history):
    """FR-009: o histórico é paginado."""
    product, _ = history

    items, total = factory().stock.movements(product.id, 1, 2)

    assert total == 4
    assert [movement.sequence for movement in items] == [3, 2]


def test_movements_explain_the_balance(factory, history):
    """FR-010: soma das quantidades = saldo; cada saldo = anterior + quantidade."""
    product, quantities = history

    items, _ = factory().stock.movements(product.id, 0, 10)
    oldest_first = list(reversed(items))

    assert sum(movement.quantity for movement in items) == balance(factory, product)
    previous = 0
    for movement, quantity in zip(oldest_first, quantities, strict=True):
        assert movement.quantity == quantity
        assert movement.balance_after == previous + quantity
        previous = movement.balance_after


def test_movements_of_unknown_or_removed_product_are_not_found(factory, history):
    """Edge case: o histórico de produto removido não é exposto (os dados ficam)."""
    product, _ = history
    factory().products.update(product.removed(AT))

    with pytest.raises(ProductNotFoundError):
        factory().stock.movements(product.id, 0, 10)
    with pytest.raises(ProductNotFoundError):
        factory().stock.movements(uuid.uuid7(), 0, 10)


# --- resumo -------------------------------------------------------------------


def test_summary_of_an_empty_store(repos):
    """FR-018: sem produtos, tudo zerado."""
    summary = repos.stock.summary()

    assert summary.restock_count == 0
    assert summary.out_of_stock_count == 0
    assert summary.stock_value == Decimal("0.00")


def test_summary_counts_active_products_and_values_the_stock(factory, repos):
    """FR-018: para repor (saldo < mínimo), sem estoque (0) e Σ saldo × preço."""
    shirt = add_product(repos, 1, min_stock=10, price=Decimal("49.90"))  # 8 < 10
    add_product(repos, 2, min_stock=5)  # 0: sem estoque e para repor
    add_product(repos, 3)  # 0, mínimo 0: sem estoque, não repor
    pants = add_product(repos, 4, min_stock=2, price=Decimal("10.05"))  # 3: em dia
    gone = add_product(repos, 5, min_stock=50)
    stock = factory().stock
    stock.record(shirt.id, StockChange.entry(8), AT)
    stock.record(pants.id, StockChange.entry(3), AT)
    stock.record(gone.id, StockChange.entry(7), AT)
    factory().products.update(gone.removed(AT))

    summary = factory().stock.summary()

    assert summary.restock_count == 2
    assert summary.out_of_stock_count == 2
    assert summary.stock_value == Decimal("429.35")  # 8 × 49,90 + 3 × 10,05


# --- concorrência (SC-003, D4) -------------------------------------------------


def test_concurrent_entries_are_all_applied(request, factory, repos):
    """SC-003: 50 entradas simultâneas somam 50, com sequências e saldos 1 a 50."""
    if "sqlalchemy" in request.node.callspec.id:
        dialect = request.getfixturevalue("engine").dialect.name
        if dialect != "postgresql":
            pytest.skip(
                "SQLite ignora SELECT ... FOR UPDATE (research D4); "
                "rode com make test-postgres"
            )
    product = add_product(repos)
    threads_count = 50
    barrier = threading.Barrier(threads_count)
    errors: list[BaseException] = []

    def enter_one():
        stock = factory().stock
        barrier.wait()
        try:
            stock.record(product.id, StockChange.entry(1), AT)
        except BaseException as error:  # noqa: BLE001 (o teste mostra qualquer falha)
            errors.append(error)

    threads = [threading.Thread(target=enter_one) for _ in range(threads_count)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert errors == []
    assert balance(factory, product) == threads_count
    items, total = factory().stock.movements(product.id, 0, 100)
    assert total == threads_count
    assert sorted(movement.sequence for movement in items) == list(range(1, 51))
    assert sorted(movement.balance_after for movement in items) == list(range(1, 51))
    assert all(movement.balance_after == movement.sequence for movement in items), (
        "o saldo de cada movimentação segue a ordem de aplicação"
    )


def test_product_with_stock_fields_round_trips(factory, repos):
    """FR-001: o mínimo gravado no cadastro volta igual; o saldo começa em 0."""
    product = add_product(repos, min_stock=7)

    found = factory().products.get_by_id(product.id)

    assert found == replace(product, min_stock=7, stock_quantity=0)
