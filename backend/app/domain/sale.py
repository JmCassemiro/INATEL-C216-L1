"""Regras da venda (spec 004, research D1–D3).

O caixa envia um `SaleOrder`: o id da venda, as linhas com o preço que mostrou e os
pagamentos. `SaleOrder.create` valida a forma do pedido. `checkout` confronta o pedido
com os produtos atuais e com as regras de pagamento e devolve o `Checkout`, a venda
aceita ainda sem número; `Checkout.register` a numera e data. Quem chama `checkout`
(o repositório) garante que os produtos lidos estão bloqueados até a gravação (D5).
"""

from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal
from enum import StrEnum
from typing import Self
from uuid import UUID

from app.domain.errors import InvalidDataError, SaleRejectedError
from app.domain.money import CENT, MAX_AMOUNT, format_brl, parse_money
from app.domain.price import Price
from app.domain.product import Product

MAX_SALE_LINES = 100
MAX_LINE_QUANTITY = 999
MAX_PAYMENTS = 5
MAX_SALE_TOTAL = MAX_AMOUNT


class PaymentMethod(StrEnum):
    CASH = "cash"
    PIX = "pix"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"


class ProblemReason(StrEnum):
    UNAVAILABLE = "unavailable"
    PRICE_CHANGED = "price_changed"
    INSUFFICIENT_STOCK = "insufficient_stock"


@dataclass(frozen=True, slots=True)
class SaleProblem:
    """O que impede um item de ser vendido; `available` e `current_price` ajudam o
    caixa a corrigir o carrinho (FR-014, research D7)."""

    product_id: UUID
    reason: ProblemReason
    message: str
    available: int | None = None
    current_price: Decimal | None = None


@dataclass(frozen=True, slots=True, init=False)
class Payment:
    """Uma parte do pagamento: meio e valor em reais (FR-009)."""

    method: PaymentMethod
    amount: Decimal

    def __init__(
        self, method: PaymentMethod | str, amount: Decimal | int | str
    ) -> None:
        object.__setattr__(self, "method", payment_method(method))
        object.__setattr__(self, "amount", payment_amount(amount))


def payment_method(value: PaymentMethod | str) -> PaymentMethod:
    try:
        return PaymentMethod(value)
    except ValueError:
        raise InvalidDataError("method", "Meio de pagamento inválido") from None


def payment_amount(value: Decimal | int | str) -> Decimal:
    """Valor de um pagamento: maior que zero, até duas casas, até 999.999,99."""
    return parse_money(value, field="amount", label="Valor")


def line_quantity(value: int) -> int:
    """Quantidade de um item da venda: inteiro de 1 a 999 (FR-005)."""
    if (
        not isinstance(value, int)
        or isinstance(value, bool)
        or not 1 <= value <= MAX_LINE_QUANTITY
    ):
        raise InvalidDataError(
            "quantity", "Quantidade deve ser um número inteiro de 1 a 999"
        )
    return value


@dataclass(frozen=True, slots=True)
class SaleLine:
    """Uma linha do carrinho: produto, quantidade e o preço que o caixa mostrou (D2)."""

    product_id: UUID
    quantity: int
    unit_price: Price

    @classmethod
    def create(
        cls, product_id: UUID, quantity: int, unit_price: Decimal | int | str
    ) -> Self:
        return cls(product_id, line_quantity(quantity), Price(unit_price))


@dataclass(frozen=True, slots=True)
class SaleItem:
    """Item da venda registrada: cópia do produto no momento da venda (FR-017)."""

    product_id: UUID
    name: str
    barcode: str
    unit_price: Decimal
    quantity: int
    subtotal: Decimal

    @classmethod
    def of(cls, product: Product, quantity: int) -> Self:
        price = product.price.value
        return cls(
            product_id=product.id,
            name=product.name,
            barcode=product.barcode.value,
            unit_price=price,
            quantity=quantity,
            subtotal=price * quantity,
        )


@dataclass(frozen=True, slots=True)
class Sale:
    """Venda registrada: imutável, nunca editada nem apagada (FR-017, FR-018)."""

    id: UUID
    number: int
    occurred_at: datetime
    items: tuple[SaleItem, ...]
    payments: tuple[Payment, ...]
    total: Decimal
    paid: Decimal
    change: Decimal

    @property
    def item_count(self) -> int:
        """Unidades vendidas: a soma das quantidades (FR-021)."""
        return sum(item.quantity for item in self.items)


@dataclass(frozen=True, slots=True)
class Checkout:
    """Venda aceita pelo domínio, ainda sem número e sem momento (research D4)."""

    order_id: UUID
    items: tuple[SaleItem, ...]
    payments: tuple[Payment, ...]
    total: Decimal
    paid: Decimal
    change: Decimal

    def register(self, number: int, at: datetime) -> Sale:
        return Sale(
            id=self.order_id,
            number=number,
            occurred_at=at,
            items=self.items,
            payments=self.payments,
            total=self.total,
            paid=self.paid,
            change=self.change,
        )


@dataclass(frozen=True, slots=True)
class SaleOrder:
    """Pedido de venda vindo do caixa, já com a forma validada. Crie com `create`."""

    id: UUID
    lines: tuple[SaleLine, ...]
    payments: tuple[Payment, ...]

    @classmethod
    def create(
        cls, id: UUID, lines: Iterable[SaleLine], payments: Iterable[Payment]
    ) -> Self:
        lines, payments = tuple(lines), tuple(payments)
        _check_lines(lines)
        _check_payment_count(payments)
        return cls(id, lines, payments)

    def checkout(self, products: Mapping[UUID, Product]) -> Checkout:
        """Confronta o pedido com os produtos atuais e com as regras de pagamento.

        Levanta `SaleRejectedError` com um problema por linha recusada (FR-014) e
        `InvalidDataError` para total acima do teto ou pagamentos que não fecham.
        """
        problems = [
            problem
            for line in self.lines
            if (problem := _problem(line, products.get(line.product_id))) is not None
        ]
        if problems:
            raise SaleRejectedError(problems)

        items = tuple(
            SaleItem.of(products[line.product_id], line.quantity) for line in self.lines
        )
        total = sum((item.subtotal for item in items), start=Decimal("0.00"))
        if total > MAX_SALE_TOTAL:
            raise InvalidDataError(
                "items", f"O total da venda passa de {format_brl(MAX_SALE_TOTAL)}"
            )
        paid, change = _settle(total, self.payments)
        return Checkout(self.id, items, self.payments, total, paid, change)


@dataclass(frozen=True, slots=True)
class SalesSummary:
    """Indicadores de um período: vendas, faturamento e ticket médio (FR-023)."""

    count: int
    revenue: Decimal
    average_ticket: Decimal

    @classmethod
    def of(cls, count: int, revenue: Decimal) -> Self:
        revenue = revenue.quantize(CENT)
        if count == 0:
            return cls(count=0, revenue=revenue, average_ticket=Decimal("0.00"))
        average = (revenue / count).quantize(CENT, ROUND_HALF_UP)
        return cls(count=count, revenue=revenue, average_ticket=average)


def _check_lines(lines: tuple[SaleLine, ...]) -> None:
    if not lines:
        raise InvalidDataError("items", "Inclua pelo menos um item")
    if len(lines) > MAX_SALE_LINES:
        raise InvalidDataError(
            "items", f"A venda pode ter no máximo {MAX_SALE_LINES} itens"
        )
    if len({line.product_id for line in lines}) != len(lines):
        raise InvalidDataError("items", "Produto repetido na venda")


def _check_payment_count(payments: tuple[Payment, ...]) -> None:
    if not payments:
        raise InvalidDataError("payments", "Informe pelo menos um pagamento")
    if len(payments) > MAX_PAYMENTS:
        raise InvalidDataError(
            "payments", f"A venda pode ter no máximo {MAX_PAYMENTS} pagamentos"
        )


def _problem(line: SaleLine, product: Product | None) -> SaleProblem | None:
    """O primeiro problema da linha, ou `None` se ela pode ser vendida."""
    if product is None or not product.is_active:
        name = product.name if product is not None else "Produto"
        return SaleProblem(
            line.product_id,
            ProblemReason.UNAVAILABLE,
            f"{name} não está mais à venda",
        )
    if product.price != line.unit_price:
        current = product.price.value
        return SaleProblem(
            line.product_id,
            ProblemReason.PRICE_CHANGED,
            f"O preço de {product.name} mudou para {format_brl(current)}",
            current_price=current,
        )
    if product.stock_quantity < line.quantity:
        available = product.stock_quantity
        message = (
            f"{product.name} está sem estoque"
            if available == 0
            else f"Há só {available} un. de {product.name} em estoque"
        )
        return SaleProblem(
            line.product_id,
            ProblemReason.INSUFFICIENT_STOCK,
            message,
            available=available,
        )
    return None


def _settle(total: Decimal, payments: tuple[Payment, ...]) -> tuple[Decimal, Decimal]:
    """Pago e troco; só o dinheiro pode passar do total (FR-010 a FR-012, D3)."""
    paid = sum((p.amount for p in payments), start=Decimal("0.00"))
    if paid < total:
        raise InvalidDataError(
            "payments",
            f"Os pagamentos não cobrem o total: faltam {format_brl(total - paid)}",
        )
    cash = sum(
        (p.amount for p in payments if p.method is PaymentMethod.CASH),
        start=Decimal("0.00"),
    )
    if paid - cash > total:
        raise InvalidDataError(
            "payments", "Só o pagamento em dinheiro pode passar do total e gerar troco"
        )
    change = paid - total
    if change > 0 and change >= cash:
        raise InvalidDataError(
            "payments",
            "O troco não pode ser igual ou maior que o valor pago em dinheiro",
        )
    return paid, change
