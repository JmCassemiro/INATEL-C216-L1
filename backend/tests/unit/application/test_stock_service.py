"""Casos de uso do estoque (spec 011), com os repositórios em memória."""

import uuid
from datetime import UTC, datetime
from decimal import Decimal

import pytest

from app.application.pagination import Page
from app.application.services.stock_service import StockService
from app.domain.errors import (
    InsufficientStockError,
    InvalidDataError,
    ProductNotFoundError,
)
from app.domain.product import Product
from app.domain.stock import MovementKind
from app.infrastructure.repositories.in_memory_product_repository import (
    InMemoryProductRepository,
)
from app.infrastructure.repositories.in_memory_stock_repository import (
    InMemoryStockRepository,
)
from app.infrastructure.repositories.in_memory_store import InMemoryStore

NOW = datetime(2026, 11, 24, 17, 35, tzinfo=UTC)


@pytest.fixture
def store() -> InMemoryStore:
    return InMemoryStore()


@pytest.fixture
def products(store) -> InMemoryProductRepository:
    return InMemoryProductRepository(store)


@pytest.fixture
def service(store) -> StockService:
    return StockService(InMemoryStockRepository(store), clock=lambda: NOW)


@pytest.fixture
def shirt(products) -> Product:
    product = Product.create(
        "Camiseta", None, "7891000315507", Decimal("49.90"), min_stock=10
    )
    products.add(product)
    return product


def test_register_entry_returns_the_movement_at_clock_time(service, shirt):
    """FR-003, FR-007: a entrada é registrada no horário do relógio do serviço."""
    movement = service.register_entry(shirt.id, 24, "NF 1234")

    assert movement.kind is MovementKind.ENTRY
    assert movement.quantity == 24
    assert movement.balance_after == 24
    assert movement.note == "NF 1234"
    assert movement.occurred_at == NOW


def test_register_entry_changes_the_product_balance(service, products, shirt):
    """FR-003: o saldo do produto passa a ser o da movimentação."""
    service.register_entry(shirt.id, 24)

    found = products.get_by_id(shirt.id)
    assert found is not None
    assert found.stock_quantity == 24


def test_register_entry_validates_the_quantity(service, shirt):
    """FR-003: quantidade fora da faixa é recusada antes de chegar ao saldo."""
    with pytest.raises(InvalidDataError) as error:
        service.register_entry(shirt.id, 0)

    assert error.value.field == "quantity"


def test_adjust_with_reason_changes_the_balance(service, shirt):
    """FR-005: o ajuste com motivo retira do saldo."""
    service.register_entry(shirt.id, 36)

    movement = service.adjust(shirt.id, -2, "Avaria no transporte")

    assert movement.kind is MovementKind.ADJUSTMENT
    assert movement.balance_after == 34
    assert movement.note == "Avaria no transporte"


def test_adjust_below_zero_is_rejected(service, shirt):
    """FR-006: o saldo nunca fica negativo."""
    service.register_entry(shirt.id, 3)

    with pytest.raises(InsufficientStockError):
        service.adjust(shirt.id, -5, "Perda")


def test_adjust_requires_a_reason(service, shirt):
    """FR-005: sem motivo, o ajuste é recusado no campo `reason`."""
    with pytest.raises(InvalidDataError) as error:
        service.adjust(shirt.id, 1, "  ")

    assert error.value.field == "reason"


def test_movements_returns_a_page_newest_first(service, shirt):
    """FR-009: o histórico vem em páginas, do mais recente ao mais antigo."""
    for quantity in [5, 3, 2]:
        service.register_entry(shirt.id, quantity)

    page = service.movements(shirt.id, page=2, size=2)

    assert isinstance(page, Page)
    assert page.total == 3
    assert page.page == 2
    assert page.size == 2
    assert [movement.quantity for movement in page.items] == [5]


def test_operations_on_unknown_product_raise_not_found(service):
    """Edge case: produto inexistente."""
    unknown = uuid.uuid7()

    with pytest.raises(ProductNotFoundError):
        service.register_entry(unknown, 1)
    with pytest.raises(ProductNotFoundError):
        service.movements(unknown, page=1, size=10)


def test_summary_reports_restock_out_of_stock_and_value(service, products, shirt):
    """FR-018: indicadores calculados sobre os produtos ativos."""
    service.register_entry(shirt.id, 4)

    summary = service.summary()

    assert summary.restock_count == 1
    assert summary.out_of_stock_count == 0
    assert summary.stock_value == Decimal("199.60")
