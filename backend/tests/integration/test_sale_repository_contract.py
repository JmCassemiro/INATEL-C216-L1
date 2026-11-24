"""Contrato da porta `SaleRepository` em todas as implementações (spec 004)."""

import threading
import uuid
from collections.abc import Callable, Iterator
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.application.ports.product_repository import ProductRepository
from app.application.ports.sale_repository import SaleRepository
from app.application.ports.stock_repository import StockRepository
from app.domain.errors import InvalidDataError, SaleNotFoundError, SaleRejectedError
from app.domain.product import Product
from app.domain.sale import Payment, PaymentMethod, SaleLine, SaleOrder
from app.domain.stock import MovementKind, StockChange
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
from app.infrastructure.repositories.sqlalchemy_product_repository import (
    SqlAlchemyProductRepository,
)
from app.infrastructure.repositories.sqlalchemy_sale_repository import (
    SqlAlchemySaleRepository,
)
from app.infrastructure.repositories.sqlalchemy_stock_repository import (
    SqlAlchemyStockRepository,
)
from tests.helpers import gtin13

AT = datetime(2026, 11, 25, 17, 35, tzinfo=UTC)


@dataclass(frozen=True)
class Repositories:
    products: ProductRepository
    stock: StockRepository
    sales: SaleRepository


type RepositoriesFactory = Callable[[], Repositories]


@pytest.fixture(params=["in_memory", "sqlalchemy"])
def factory(request) -> Iterator[RepositoriesFactory]:
    """Cria trios de repositórios que enxergam o mesmo armazenamento.

    No SQLAlchemy, cada trio tem a própria sessão, como cada requisição na API.
    """
    if request.param == "in_memory":
        store = InMemoryStore()
        yield lambda: Repositories(
            InMemoryProductRepository(store),
            InMemoryStockRepository(store),
            InMemorySaleRepository(store),
        )
        return

    session_factory = request.getfixturevalue("session_factory")
    sessions: list[Session] = []

    def make() -> Repositories:
        session = session_factory()
        sessions.append(session)
        return Repositories(
            SqlAlchemyProductRepository(session),
            SqlAlchemyStockRepository(session),
            SqlAlchemySaleRepository(session),
        )

    yield make
    for session in sessions:
        session.close()


@pytest.fixture
def repos(factory) -> Repositories:
    return factory()


def require_postgresql(request) -> None:
    """Os testes de concorrência do SQL só valem no PostgreSQL (research D5)."""
    if "sqlalchemy" in request.node.callspec.id:
        dialect = request.getfixturevalue("engine").dialect.name
        if dialect != "postgresql":
            pytest.skip(
                "SQLite ignora SELECT ... FOR UPDATE (research D5); "
                "rode com make test-postgres"
            )


def add_product(
    repos: Repositories,
    number: int,
    name: str,
    price: str = "49.90",
    stock: int = 10,
) -> Product:
    product = Product.create(name, None, gtin13(number), Decimal(price))
    repos.products.add(product)
    if stock:
        repos.stock.record(product.id, StockChange.entry(stock), AT)
    return product


def order(
    *lines: tuple[Product, int],
    payments: list[Payment] | None = None,
    sale_id: uuid.UUID | None = None,
) -> SaleOrder:
    sale_lines = [
        SaleLine.create(item.id, quantity, item.price.value) for item, quantity in lines
    ]
    total = sum(
        (item.price.value * quantity for item, quantity in lines), start=Decimal(0)
    )
    return SaleOrder.create(
        sale_id or uuid.uuid4(),
        sale_lines,
        payments or [Payment(PaymentMethod.PIX, total)],
    )


def balance(factory: RepositoriesFactory, product: Product) -> int:
    """Saldo lido por outro "cliente", como numa nova requisição."""
    found = factory().products.get_by_id(product.id)
    assert found is not None
    return found.stock_quantity


def movements(factory: RepositoriesFactory, product: Product):
    items, _ = factory().stock.movements(product.id, 0, 100)
    return items


@pytest.fixture
def shirt(repos) -> Product:
    return add_product(repos, 1, "Camiseta Básica Branca M", "49.90")


@pytest.fixture
def socks(repos) -> Product:
    return add_product(repos, 2, "Meia Cano Curto", "37.70")


# --- registrar ----------------------------------------------------------------


def test_register_saves_the_sale_and_takes_the_stock_out(factory, shirt, socks):
    """FR-013, FR-019: a venda é gravada e cada item baixa o saldo, com movimentação."""
    sale_order = order(
        (shirt, 2),
        (socks, 1),
        payments=[Payment("pix", "50.00"), Payment("cash", "100.00")],
    )

    sale, created = factory().sales.register(sale_order, AT)

    assert created is True
    assert sale.id == sale_order.id
    assert (sale.total, sale.paid, sale.change) == (
        Decimal("137.50"),
        Decimal("150.00"),
        Decimal("12.50"),
    )
    assert (balance(factory, shirt), balance(factory, socks)) == (8, 9)
    latest = movements(factory, shirt)[0]
    assert (latest.kind, latest.quantity, latest.balance_after, latest.sequence) == (
        MovementKind.SALE,
        -2,
        8,
        2,
    )
    assert latest.note == f"Venda nº {sale.number}"


def test_registered_sale_round_trips(factory, shirt, socks):
    """FR-017: a venda volta com itens e pagamentos na ordem, e o momento com fuso."""
    sale_order = order(
        (socks, 1),
        (shirt, 2),
        payments=[Payment("debit_card", "100.00"), Payment("cash", "50.00")],
    )
    sale, _ = factory().sales.register(sale_order, AT)

    found = factory().sales.get(sale.id)

    assert found == sale
    assert [item.name for item in found.items] == [
        "Meia Cano Curto",
        "Camiseta Básica Branca M",
    ]
    assert [item.subtotal for item in found.items] == [
        Decimal("37.70"),
        Decimal("99.80"),
    ]
    assert [p.method for p in found.payments] == [
        PaymentMethod.DEBIT_CARD,
        PaymentMethod.CASH,
    ]
    assert found.occurred_at == AT


def test_sales_get_increasing_numbers(factory, shirt):
    """FR-017: número crescente e sem repetição."""
    numbers = [
        factory().sales.register(order((shirt, 1)), AT)[0].number for _ in range(3)
    ]

    assert numbers == [numbers[0], numbers[0] + 1, numbers[0] + 2]


def test_sale_keeps_the_product_data_of_the_moment(factory, repos, shirt):
    """US3-3: mudar o produto depois não muda a venda."""
    sale, _ = factory().sales.register(order((shirt, 1)), AT)

    repos.products.update(
        shirt.updated("Camiseta Preta", None, shirt.barcode.value, "59.90")
    )

    item = factory().sales.get(sale.id).items[0]
    assert (item.name, item.unit_price) == (
        "Camiseta Básica Branca M",
        Decimal("49.90"),
    )


# --- idempotência -------------------------------------------------------------


def test_resending_the_same_sale_returns_it_without_changing_anything(factory, shirt):
    """FR-016, SC-005: o mesmo id registra uma vez só e baixa uma vez só."""
    sale_order = order((shirt, 2))
    first, _ = factory().sales.register(sale_order, AT)

    replays = [factory().sales.register(sale_order, AT) for _ in range(4)]

    assert all(sale == first and created is False for sale, created in replays)
    assert balance(factory, shirt) == 8
    assert factory().sales.list(0, 10)[1] == 1


def test_resending_returns_the_sale_even_after_the_product_left_the_catalog(
    factory, repos, shirt
):
    """FR-016: a nova tentativa devolve a venda registrada, sem reavaliar o catálogo."""
    sale_order = order((shirt, 1))
    first, _ = factory().sales.register(sale_order, AT)
    repos.products.update(shirt.removed(AT))

    again, created = factory().sales.register(sale_order, AT)

    assert (again, created) == (first, False)


# --- recusas ------------------------------------------------------------------


def test_rejected_sale_saves_nothing(factory, shirt, socks):
    """FR-013, FR-014: um item sem saldo recusa a venda inteira, sem baixar o outro."""
    sale_order = order((socks, 1), (shirt, 11))

    with pytest.raises(SaleRejectedError) as error:
        factory().sales.register(sale_order, AT)

    (problem,) = error.value.problems
    assert (problem.product_id, problem.available) == (shirt.id, 10)
    assert (balance(factory, shirt), balance(factory, socks)) == (10, 10)
    assert len(movements(factory, socks)) == 1
    with pytest.raises(SaleNotFoundError):
        factory().sales.get(sale_order.id)


def test_sale_with_a_removed_product_is_rejected(factory, repos, shirt, socks):
    """FR-014: produto removido do catálogo torna o item indisponível."""
    repos.products.update(shirt.removed(AT))

    with pytest.raises(SaleRejectedError) as error:
        factory().sales.register(order((socks, 1), (shirt, 1)), AT)

    assert [p.product_id for p in error.value.problems] == [shirt.id]
    assert balance(factory, socks) == 10


def test_sale_with_unknown_product_is_rejected(factory, shirt):
    """FR-014: produto inexistente também é indisponível."""
    ghost = Product.create("Fantasma", None, gtin13(99), "10.00")

    with pytest.raises(SaleRejectedError):
        factory().sales.register(order((shirt, 1), (ghost, 1)), AT)

    assert balance(factory, shirt) == 10


def test_sale_with_payments_that_do_not_close_saves_nothing(factory, shirt):
    """FR-010: pagamento menor que o total é recusado sem efeito."""
    sale_order = order((shirt, 1), payments=[Payment("pix", "10.00")])

    with pytest.raises(InvalidDataError):
        factory().sales.register(sale_order, AT)

    assert balance(factory, shirt) == 10
    assert factory().sales.list(0, 10) == ([], 0)


def test_get_unknown_sale_is_not_found(repos):
    """FR-022: venda inexistente."""
    with pytest.raises(SaleNotFoundError):
        repos.sales.get(uuid.uuid4())


# --- histórico e resumo -------------------------------------------------------


def test_list_comes_from_the_highest_number_with_total(factory, shirt):
    """FR-021: da mais recente para a mais antiga, paginada."""
    registered = [factory().sales.register(order((shirt, 1)), AT)[0] for _ in range(3)]

    items, total = factory().sales.list(1, 2)

    assert total == 3
    assert [sale.number for sale in items] == [
        registered[1].number,
        registered[0].number,
    ]
    assert items[0] == registered[1]


def test_summary_counts_only_the_sales_in_the_interval(factory, shirt, socks):
    """FR-023: vendas com início ≤ momento < fim."""
    day = datetime(2026, 11, 25, 3, 0, tzinfo=UTC)
    factory().sales.register(order((shirt, 1)), day - timedelta(seconds=1))
    factory().sales.register(order((shirt, 2)), day)
    factory().sales.register(order((socks, 1)), day + timedelta(hours=23))
    factory().sales.register(order((socks, 1)), day + timedelta(days=1))

    summary = factory().sales.summary(day, day + timedelta(days=1))

    assert summary.count == 2
    assert summary.revenue == Decimal("137.50")
    assert summary.average_ticket == Decimal("68.75")


def test_summary_without_sales_is_zero(repos):
    summary = repos.sales.summary(AT, AT + timedelta(days=1))

    assert (summary.count, summary.revenue, summary.average_ticket) == (
        0,
        Decimal("0.00"),
        Decimal("0.00"),
    )


def test_movements_still_explain_the_balance_after_sales(factory, shirt):
    """FR-019, FR-010 (spec 011): soma das movimentações = saldo."""
    for quantity in (1, 3, 2):
        factory().sales.register(order((shirt, quantity)), AT)

    items = movements(factory, shirt)

    assert sum(m.quantity for m in items) == balance(factory, shirt) == 4
    assert [m.sequence for m in items] == [4, 3, 2, 1]


# --- concorrência (SC-004, research D5) ---------------------------------------


def run_together(count: int, action: Callable[[int], None]) -> list[BaseException]:
    """Roda `action(i)` em `count` threads liberadas ao mesmo tempo."""
    barrier = threading.Barrier(count)
    errors: list[BaseException] = []

    def run(index: int) -> None:
        barrier.wait()
        try:
            action(index)
        except BaseException as error:  # noqa: BLE001 (o teste mostra qualquer falha)
            errors.append(error)

    threads = [threading.Thread(target=run, args=(i,)) for i in range(count)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    return errors


def test_concurrent_sales_never_take_the_balance_below_zero(request, factory, repos):
    """SC-004: 25 vendas de 1 un. disputando 20 → 20 registradas, 5 recusadas."""
    require_postgresql(request)
    product = add_product(repos, 1, "Camiseta", stock=20)
    clients = [factory() for _ in range(25)]

    errors = run_together(
        25, lambda i: clients[i].sales.register(order((product, 1)), AT)
    )

    assert len(errors) == 5
    assert all(isinstance(error, SaleRejectedError) for error in errors)
    assert balance(factory, product) == 0
    sales, total = factory().sales.list(0, 100)
    assert total == 20
    assert len({sale.number for sale in sales}) == 20
    items = movements(factory, product)
    assert sum(m.quantity for m in items) == 0
    assert sorted(
        m.balance_after for m in items if m.kind is MovementKind.SALE
    ) == list(range(20))


def test_sales_locking_products_in_opposite_orders_do_not_deadlock(
    request, factory, repos
):
    """Research D5: vendas com {A, B} e {B, A} ao mesmo tempo terminam todas."""
    require_postgresql(request)
    first = add_product(repos, 1, "Camiseta", stock=100)
    second = add_product(repos, 2, "Meia", stock=100)
    clients = [factory() for _ in range(20)]

    def sell(index: int) -> None:
        pair = ((first, 1), (second, 1)) if index % 2 else ((second, 1), (first, 1))
        clients[index].sales.register(order(*pair), AT)

    errors = run_together(20, sell)

    assert errors == []
    assert (balance(factory, first), balance(factory, second)) == (80, 80)
