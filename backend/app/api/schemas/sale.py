"""DTOs da borda HTTP das vendas (spec 004, contracts/sales-api.md).

Os campos de cada item e pagamento são validados pelas regras do domínio, via
`AfterValidator`, para que o erro saia com o caminho exato no `loc`
(`["body", "items", 0, "quantity"]`). As regras da lista (quantos itens, produto
repetido) e as de pagamento contra o total ficam no domínio e saem no campo `items` ou
`payments`. Dinheiro entra como número ou texto e sai sempre como texto com 2 casas.
"""

from datetime import datetime
from decimal import Decimal
from typing import Annotated, Self
from uuid import UUID

from pydantic import AfterValidator, BaseModel, StrictInt

from app.application.commands import PaymentData, SaleLineData
from app.application.pagination import Page
from app.domain.price import Price
from app.domain.sale import (
    PaymentMethod,
    ProblemReason,
    Sale,
    SaleProblem,
    SalesSummary,
    line_quantity,
    payment_amount,
)


def validate_unit_price(amount: Decimal) -> Decimal:
    return Price(amount).value


LineQuantity = Annotated[StrictInt, AfterValidator(line_quantity)]
UnitPrice = Annotated[Decimal, AfterValidator(validate_unit_price)]
Amount = Annotated[Decimal, AfterValidator(payment_amount)]


class SaleItemInput(BaseModel):
    product_id: UUID
    quantity: LineQuantity
    unit_price: UnitPrice
    """Preço que o caixa mostrou (research D2)."""


class PaymentInput(BaseModel):
    method: PaymentMethod
    amount: Amount


class SaleInput(BaseModel):
    """Venda enviada pelo caixa; `id` é criado por ele e torna o envio idempotente."""

    id: UUID
    items: list[SaleItemInput]
    payments: list[PaymentInput]

    def lines(self) -> list[SaleLineData]:
        return [
            SaleLineData(item.product_id, item.quantity, item.unit_price)
            for item in self.items
        ]

    def payment_data(self) -> list[PaymentData]:
        return [PaymentData(p.method.value, p.amount) for p in self.payments]


class SaleItemOutput(BaseModel):
    product_id: UUID
    name: str
    barcode: str
    unit_price: str
    quantity: int
    subtotal: str


class PaymentOutput(BaseModel):
    method: PaymentMethod
    amount: str


class SaleOutput(BaseModel):
    id: UUID
    number: int
    occurred_at: datetime
    items: list[SaleItemOutput]
    payments: list[PaymentOutput]
    total: str
    paid: str
    change: str
    item_count: int

    @classmethod
    def from_entity(cls, sale: Sale) -> Self:
        return cls(
            id=sale.id,
            number=sale.number,
            occurred_at=sale.occurred_at,
            items=[
                SaleItemOutput(
                    product_id=item.product_id,
                    name=item.name,
                    barcode=item.barcode,
                    unit_price=_money(item.unit_price),
                    quantity=item.quantity,
                    subtotal=_money(item.subtotal),
                )
                for item in sale.items
            ],
            payments=[
                PaymentOutput(method=p.method, amount=_money(p.amount))
                for p in sale.payments
            ],
            total=_money(sale.total),
            paid=_money(sale.paid),
            change=_money(sale.change),
            item_count=sale.item_count,
        )


class SalePageOutput(BaseModel):
    items: list[SaleOutput]
    total: int
    page: int
    size: int

    @classmethod
    def from_page(cls, page: Page[Sale]) -> Self:
        return cls(
            items=[SaleOutput.from_entity(sale) for sale in page.items],
            total=page.total,
            page=page.page,
            size=page.size,
        )


class SalesSummaryOutput(BaseModel):
    count: int
    revenue: str
    average_ticket: str

    @classmethod
    def from_summary(cls, summary: SalesSummary) -> Self:
        return cls(
            count=summary.count,
            revenue=_money(summary.revenue),
            average_ticket=_money(summary.average_ticket),
        )


class SaleProblemOutput(BaseModel):
    """Um item recusado no 409 (research D7)."""

    product_id: UUID
    reason: ProblemReason
    message: str
    available: int | None
    current_price: str | None

    @classmethod
    def from_problem(cls, problem: SaleProblem) -> Self:
        return cls(
            product_id=problem.product_id,
            reason=problem.reason,
            message=problem.message,
            available=problem.available,
            current_price=None
            if problem.current_price is None
            else _money(problem.current_price),
        )


def _money(amount: Decimal) -> str:
    return f"{amount:.2f}"
