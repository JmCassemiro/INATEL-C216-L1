"""Regras da venda (spec 004): forma do pedido, problemas por item, total e troco."""

import uuid
from dataclasses import FrozenInstanceError, replace
from datetime import UTC, datetime
from decimal import Decimal

import pytest

from app.domain.errors import InvalidDataError, SaleRejectedError
from app.domain.price import Price
from app.domain.product import Product
from app.domain.sale import (
    MAX_LINE_QUANTITY,
    MAX_PAYMENTS,
    MAX_SALE_LINES,
    Payment,
    PaymentMethod,
    ProblemReason,
    SaleLine,
    SaleOrder,
    SalesSummary,
)
from tests.helpers import gtin13

AT = datetime(2026, 11, 25, 17, 35, tzinfo=UTC)
CASH = PaymentMethod.CASH
PIX = PaymentMethod.PIX
CREDIT = PaymentMethod.CREDIT_CARD
DEBIT = PaymentMethod.DEBIT_CARD


def product(name: str, price: str, stock: int, number: int = 1) -> Product:
    created = Product.create(name, None, gtin13(number), price)
    return replace(created, stock_quantity=stock)


def line(item: Product, quantity: int = 1, price: str | None = None) -> SaleLine:
    return SaleLine.create(item.id, quantity, price or str(item.price.value))


def order(lines: list[SaleLine], payments: list[Payment]) -> SaleOrder:
    return SaleOrder.create(uuid.uuid4(), lines, payments)


def catalog(*items: Product) -> dict[uuid.UUID, Product]:
    return {item.id: item for item in items}


SHIRT = product("Camiseta Básica Branca M", "49.90", stock=10, number=1)
SOCKS = product("Meia Cano Curto", "37.70", stock=10, number=2)


# --- pagamento ----------------------------------------------------------------


@pytest.mark.parametrize(
    ("amount", "expected"),
    [
        ("0.01", Decimal("0.01")),
        ("87.5", Decimal("87.50")),
        (100, Decimal("100.00")),
        (Decimal("999999.99"), Decimal("999999.99")),
    ],
)
def test_payment_accepts_amount_and_normalizes_to_two_places(amount, expected):
    """FR-009: valor em reais maior que zero, com até duas casas."""
    payment = Payment(CASH, amount)

    assert payment.amount == expected
    assert str(payment.amount) == str(expected)


@pytest.mark.parametrize(
    "amount", [0, -1, "10.999", "1000000.00", 49.9, "abc", "", "NaN"]
)
def test_payment_rejects_invalid_amount(amount):
    """FR-009: zero, negativo, três casas, acima do teto ou `float` são recusados."""
    with pytest.raises(InvalidDataError) as error:
        Payment(PIX, amount)

    assert error.value.field == "amount"


def test_payment_accepts_the_method_as_text():
    """FR-009: os meios aceitos são dinheiro, Pix, crédito e débito."""
    assert [
        Payment(m, 1).method for m in ("cash", "pix", "credit_card", "debit_card")
    ] == [
        CASH,
        PIX,
        CREDIT,
        DEBIT,
    ]


def test_payment_rejects_unknown_method():
    """FR-009: um meio fora da lista é recusado no campo `method`."""
    with pytest.raises(InvalidDataError) as error:
        Payment("check", 10)

    assert error.value.field == "method"


def test_payment_is_immutable():
    payment = Payment(CASH, 10)

    with pytest.raises(FrozenInstanceError):
        payment.amount = Decimal(1)  # pyright: ignore[reportAttributeAccessIssue]


# --- forma do pedido -------------------------------------------------------------


@pytest.mark.parametrize("quantity", [1, 2, MAX_LINE_QUANTITY])
def test_line_accepts_quantity_from_1_to_999(quantity):
    """FR-005: quantidade inteira de 1 a 999 por item."""
    assert line(SHIRT, quantity).quantity == quantity


@pytest.mark.parametrize("quantity", [0, -1, MAX_LINE_QUANTITY + 1, True, 2.0, "2"])
def test_line_rejects_quantity_out_of_range_or_not_integer(quantity):
    """FR-005: fora de 1 a 999, fração, texto ou bool são recusados no `quantity`."""
    with pytest.raises(InvalidDataError) as error:
        SaleLine.create(SHIRT.id, quantity, "49.90")

    assert error.value.field == "quantity"


def test_line_keeps_the_price_shown_by_the_register():
    """D2: a linha leva o preço que o caixa mostrou."""
    assert line(SHIRT, 1, "49.9").unit_price == Price("49.90")


def test_order_requires_at_least_one_line():
    """FR-008: a venda tem pelo menos um item."""
    with pytest.raises(InvalidDataError) as error:
        order([], [Payment(CASH, 10)])

    assert error.value.field == "items"
    assert str(error.value) == "Inclua pelo menos um item"


def test_order_accepts_up_to_100_distinct_lines():
    """FR-008: até 100 itens distintos."""
    lines = [SaleLine.create(uuid.uuid4(), 1, "1.00") for _ in range(MAX_SALE_LINES)]

    assert len(order(lines, [Payment(CASH, 100)]).lines) == MAX_SALE_LINES


def test_order_rejects_more_than_100_lines():
    """FR-008: o 101º item distinto é recusado."""
    lines = [
        SaleLine.create(uuid.uuid4(), 1, "1.00") for _ in range(MAX_SALE_LINES + 1)
    ]

    with pytest.raises(InvalidDataError) as error:
        order(lines, [Payment(CASH, 101)])

    assert error.value.field == "items"
    assert str(error.value) == "A venda pode ter no máximo 100 itens"


def test_order_rejects_the_same_product_twice():
    """FR-002: o mesmo produto ocupa uma linha só."""
    with pytest.raises(InvalidDataError) as error:
        order([line(SHIRT), line(SHIRT)], [Payment(CASH, 100)])

    assert error.value.field == "items"
    assert str(error.value) == "Produto repetido na venda"


@pytest.mark.parametrize("count", [0, MAX_PAYMENTS + 1])
def test_order_requires_from_1_to_5_payments(count):
    """FR-009: de 1 a 5 pagamentos."""
    with pytest.raises(InvalidDataError) as error:
        order([line(SHIRT)], [Payment(PIX, 10)] * count)

    assert error.value.field == "payments"


def test_order_accepts_the_same_method_more_than_once():
    """FR-009: o mesmo meio pode aparecer mais de uma vez (dois cartões)."""
    payments = [Payment(CREDIT, "20.00"), Payment(CREDIT, "29.90")]

    assert order([line(SHIRT)], payments).payments == tuple(payments)


# --- problemas por item ----------------------------------------------------------


def rejection(sale: SaleOrder, products: dict[uuid.UUID, Product]) -> SaleRejectedError:
    with pytest.raises(SaleRejectedError) as error:
        sale.checkout(products)
    return error.value


def test_checkout_rejects_a_product_that_no_longer_exists():
    """FR-014: produto inexistente torna o item indisponível."""
    sale = order([line(SHIRT)], [Payment(CASH, 50)])

    (problem,) = rejection(sale, {}).problems

    assert problem.product_id == SHIRT.id
    assert problem.reason is ProblemReason.UNAVAILABLE
    assert problem.message == "Produto não está mais à venda"


def test_checkout_rejects_a_removed_product_by_name():
    """FR-014: produto removido do catálogo diz qual item saiu."""
    removed = SHIRT.removed(AT)
    sale = order([line(SHIRT)], [Payment(CASH, 50)])

    (problem,) = rejection(sale, catalog(removed)).problems

    assert problem.reason is ProblemReason.UNAVAILABLE
    assert problem.message == "Camiseta Básica Branca M não está mais à venda"


def test_checkout_rejects_a_changed_price_with_the_current_one():
    """FR-014, D2: preço diferente do que o caixa mostrou recusa a venda."""
    sale = order([line(SHIRT, 1, "45.00")], [Payment(CASH, 50)])

    (problem,) = rejection(sale, catalog(SHIRT)).problems

    assert problem.reason is ProblemReason.PRICE_CHANGED
    assert problem.current_price == Decimal("49.90")
    assert problem.message == "O preço de Camiseta Básica Branca M mudou para R$ 49,90"


def test_checkout_rejects_insufficient_stock_with_the_available_quantity():
    """FR-014: saldo menor que a quantidade diz quanto há."""
    scarce = replace(SHIRT, stock_quantity=1)
    sale = order([line(scarce, 3)], [Payment(CASH, 200)])

    (problem,) = rejection(sale, catalog(scarce)).problems

    assert problem.reason is ProblemReason.INSUFFICIENT_STOCK
    assert problem.available == 1
    assert problem.message == "Há só 1 un. de Camiseta Básica Branca M em estoque"


def test_checkout_rejects_an_out_of_stock_product():
    """FR-007: produto sem estoque não pode ser vendido."""
    empty = replace(SHIRT, stock_quantity=0)
    sale = order([line(empty)], [Payment(CASH, 50)])

    (problem,) = rejection(sale, catalog(empty)).problems

    assert problem.available == 0
    assert problem.message == "Camiseta Básica Branca M está sem estoque"


def test_checkout_reports_every_problem_at_once_in_line_order():
    """D7: todos os problemas juntos, um por linha, na ordem do carrinho."""
    scarce = replace(SOCKS, stock_quantity=0)
    gone = product("Boné Aba Reta", "59.90", stock=5, number=3)
    sale = order(
        [line(SHIRT, 1, "45.00"), line(scarce), line(gone)],
        [Payment(CASH, 200)],
    )

    problems = rejection(sale, catalog(SHIRT, scarce)).problems

    assert [(p.product_id, p.reason) for p in problems] == [
        (SHIRT.id, ProblemReason.PRICE_CHANGED),
        (scarce.id, ProblemReason.INSUFFICIENT_STOCK),
        (gone.id, ProblemReason.UNAVAILABLE),
    ]


def test_checkout_allows_selling_exactly_the_stock():
    """FR-007: vender todo o saldo é permitido."""
    sale = order([line(SHIRT, 10)], [Payment(PIX, "499.00")])

    assert sale.checkout(catalog(SHIRT)).total == Decimal("499.00")


# --- total ------------------------------------------------------------------------


def test_checkout_copies_the_product_and_computes_subtotals_and_total():
    """FR-006, FR-017: subtotal = preço × quantidade; cópia do produto do momento."""
    sale = order([line(SHIRT, 2), line(SOCKS, 1)], [Payment(PIX, "137.50")])

    checkout = sale.checkout(catalog(SHIRT, SOCKS))

    first, second = checkout.items
    assert (first.product_id, first.name, first.barcode) == (
        SHIRT.id,
        "Camiseta Básica Branca M",
        SHIRT.barcode.value,
    )
    assert (first.unit_price, first.quantity, first.subtotal) == (
        Decimal("49.90"),
        2,
        Decimal("99.80"),
    )
    assert second.subtotal == Decimal("37.70")
    assert checkout.total == Decimal("137.50")


def test_checkout_rejects_a_total_above_the_limit():
    """FR-008: o total da venda vai até R$ 999.999,99."""
    expensive = product("Relógio", "999999.99", stock=5, number=4)
    sale = order([line(expensive, 2)], [Payment(PIX, "999999.99")])

    with pytest.raises(InvalidDataError) as error:
        sale.checkout(catalog(expensive))

    assert error.value.field == "items"
    assert str(error.value) == "O total da venda passa de R$ 999.999,99"


# --- pagamento e troco --------------------------------------------------------------


def checkout_of(total_item: Product, quantity: int, *payments: Payment):
    sale = order([line(total_item, quantity)], list(payments))
    return sale.checkout(catalog(total_item))


ITEM_87_50 = product("Calça Moletom", "87.50", stock=10, number=5)
ITEM_150 = product("Tênis Casual", "150.00", stock=10, number=6)


def test_payments_must_cover_the_total():
    """FR-010: a soma dos pagamentos é igual ou maior que o total."""
    with pytest.raises(InvalidDataError) as error:
        checkout_of(ITEM_150, 1, Payment(PIX, "50.00"), Payment(CASH, "87.50"))

    assert error.value.field == "payments"
    assert str(error.value) == "Os pagamentos não cobrem o total: faltam R$ 12,50"


def test_cash_above_the_total_gives_change():
    """FR-011, FR-012: R$ 100,00 em dinheiro para R$ 87,50 → troco de R$ 12,50."""
    checkout = checkout_of(ITEM_87_50, 1, Payment(CASH, 100))

    assert (checkout.paid, checkout.change) == (Decimal("100.00"), Decimal("12.50"))


def test_exact_cash_gives_no_change():
    """Edge case: troco exato é zero."""
    assert checkout_of(ITEM_87_50, 1, Payment(CASH, "87.50")).change == Decimal("0.00")


def test_split_payment_without_change():
    """US2: Pix 50 + crédito 100 para 150, sem troco."""
    checkout = checkout_of(ITEM_150, 1, Payment(PIX, 50), Payment(CREDIT, 100))

    assert (checkout.paid, checkout.change) == (Decimal("150.00"), Decimal("0.00"))
    assert [p.method for p in checkout.payments] == [PIX, CREDIT]


def test_card_plus_cash_gives_change_from_the_cash():
    """US2: débito 100 + dinheiro 60 para 150 → troco de R$ 10,00."""
    checkout = checkout_of(ITEM_150, 1, Payment(DEBIT, 100), Payment(CASH, 60))

    assert checkout.change == Decimal("10.00")


@pytest.mark.parametrize("method", [PIX, CREDIT, DEBIT])
def test_only_cash_may_exceed_the_total(method):
    """FR-011: pagamento que não é em dinheiro não passa do total."""
    with pytest.raises(InvalidDataError) as error:
        checkout_of(ITEM_150, 1, Payment(method, 200))

    assert error.value.field == "payments"
    assert (
        str(error.value)
        == "Só o pagamento em dinheiro pode passar do total e gerar troco"
    )


def test_change_must_be_less_than_the_cash():
    """FR-011: dinheiro desnecessário (o cartão já cobre o total) é recusado."""
    with pytest.raises(InvalidDataError) as error:
        checkout_of(ITEM_150, 1, Payment(CREDIT, 150), Payment(CASH, 20))

    assert error.value.field == "payments"
    assert (
        str(error.value)
        == "O troco não pode ser igual ou maior que o valor pago em dinheiro"
    )


# --- venda registrada ---------------------------------------------------------------


def test_register_numbers_and_dates_the_sale():
    """FR-017: a venda guarda número, momento, itens, pagamentos e totais."""
    sale = order(
        [line(SHIRT, 2), line(SOCKS, 1)], [Payment(PIX, 50), Payment(CASH, 100)]
    )

    registered = sale.checkout(catalog(SHIRT, SOCKS)).register(12, AT)

    assert (registered.id, registered.number, registered.occurred_at) == (
        sale.id,
        12,
        AT,
    )
    assert [item.product_id for item in registered.items] == [SHIRT.id, SOCKS.id]
    assert [p.method for p in registered.payments] == [PIX, CASH]
    assert (registered.total, registered.paid, registered.change) == (
        Decimal("137.50"),
        Decimal("150.00"),
        Decimal("12.50"),
    )
    assert registered.item_count == 3


def test_registered_sale_is_immutable():
    """FR-018: venda registrada não é editada."""
    sale = order([line(SHIRT)], [Payment(CASH, 50)])
    registered = sale.checkout(catalog(SHIRT)).register(1, AT)

    with pytest.raises(FrozenInstanceError):
        registered.total = Decimal(1)  # pyright: ignore[reportAttributeAccessIssue]


# --- resumo ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("count", "revenue", "average"),
    [
        (0, "0", "0.00"),
        (2, "237.60", "118.80"),
        (3, "100.00", "33.33"),
        (2, "0.05", "0.03"),  # meio centavo para cima
    ],
)
def test_summary_average_ticket(count, revenue, average):
    """FR-023: ticket médio = faturamento / vendas, ao centavo; zero sem vendas."""
    summary = SalesSummary.of(count, Decimal(revenue))

    assert summary.count == count
    assert summary.revenue == Decimal(revenue).quantize(Decimal("0.01"))
    assert summary.average_ticket == Decimal(average)
