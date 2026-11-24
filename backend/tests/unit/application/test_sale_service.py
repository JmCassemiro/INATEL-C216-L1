"""Casos de uso das vendas (spec 004), com os repositórios em memória."""

import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest

from app.application.commands import PaymentData, SaleLineData
from app.application.pagination import Page
from app.application.services.sale_service import SaleService
from app.domain.errors import InvalidDataError, SaleNotFoundError
from app.domain.product import Product
from app.domain.stock import StockChange
from app.infrastructure.repositories.in_memory_product_repository import (
    InMemoryProductRepository,
)
from app.infrastructure.repositories.in_memory_sale_repository import (
    InMemorySaleRepository,
)
from app.infrastructure.repositories.in_memory_stock_repository import (
    InMemoryStockRepository,
)
from app.infrastructure.repositories.in_memory_store import InMemoryStore

NOW = datetime(2026, 11, 25, 17, 35, tzinfo=UTC)


@pytest.fixture
def store() -> InMemoryStore:
    return InMemoryStore()


@pytest.fixture
def service(store) -> SaleService:
    return SaleService(InMemorySaleRepository(store), clock=lambda: NOW)


@pytest.fixture
def shirt(store) -> Product:
    product = Product.create("Camiseta", None, "7891000315507", Decimal("49.90"))
    InMemoryProductRepository(store).add(product)
    InMemoryStockRepository(store).record(product.id, StockChange.entry(10), NOW)
    return product


def register(service: SaleService, product: Product, sale_id: uuid.UUID | None = None):
    return service.register(
        sale_id or uuid.uuid4(),
        [SaleLineData(product.id, 2, Decimal("49.90"))],
        [PaymentData("cash", Decimal("100.00"))],
    )


def test_register_creates_the_sale_at_clock_time(service, shirt):
    """FR-013, FR-017: a venda é registrada no horário do relógio do serviço."""
    registration = register(service, shirt)

    assert registration.created is True
    sale = registration.sale
    assert sale.occurred_at == NOW
    assert (sale.total, sale.change) == (Decimal("99.80"), Decimal("0.20"))
    assert sale.item_count == 2


def test_register_again_returns_the_same_sale(service, shirt):
    """FR-016: o mesmo id devolve a venda já registrada."""
    sale_id = uuid.uuid4()
    first = register(service, shirt, sale_id)

    again = register(service, shirt, sale_id)

    assert (again.sale, again.created) == (first.sale, False)


def test_register_validates_the_order_shape(service):
    """FR-008: a forma do pedido é validada antes de chegar ao repositório."""
    with pytest.raises(InvalidDataError) as error:
        service.register(uuid.uuid4(), [], [PaymentData("pix", Decimal(1))])

    assert error.value.field == "items"


def test_get_and_list(service, shirt):
    """FR-021, FR-022: consulta por id e listagem paginada."""
    first = register(service, shirt).sale
    second = register(service, shirt).sale

    assert service.get(first.id) == first
    assert service.list(page=1, size=1) == Page(items=[second], total=2, page=1, size=1)
    with pytest.raises(SaleNotFoundError):
        service.get(uuid.uuid4())


def test_summary_of_an_interval(service, shirt):
    """FR-023: indicadores das vendas do intervalo."""
    register(service, shirt)

    summary = service.summary(NOW - timedelta(hours=1), NOW + timedelta(hours=1))

    assert (summary.count, summary.revenue) == (1, Decimal("99.80"))


def test_summary_rejects_an_empty_interval(service):
    """FR-023: o fim do intervalo vem depois do início."""
    with pytest.raises(InvalidDataError) as error:
        service.summary(NOW, NOW)

    assert error.value.field == "end"
