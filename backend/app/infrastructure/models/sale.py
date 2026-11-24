"""Tabelas das vendas (spec 004, data-model §3).

`sales.number` é a chave primária autoincremental: o banco atribui o número legível na
inserção, sem coordenação entre vendas simultâneas (research D4). `sales.id` é o UUID
criado pelo caixa, único, usado na idempotência e nas referências dos itens e
pagamentos. Itens e pagamentos são listas da venda: a chave é a posição dentro dela.
"""

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Self

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.barcode import GTIN14_LENGTH
from app.domain.product import NAME_MAX_LENGTH
from app.domain.sale import (
    MAX_LINE_QUANTITY,
    Checkout,
    Payment,
    PaymentMethod,
    Sale,
    SaleItem,
)
from app.infrastructure.database.base import Base

METHOD_MAX_LENGTH = 16
_METHODS = ", ".join(f"'{method.value}'" for method in PaymentMethod)


class SaleModel(Base):
    __tablename__ = "sales"
    __table_args__ = (
        CheckConstraint("total > 0", name="total_positive"),
        CheckConstraint("paid >= total", name="paid_covers_total"),
        CheckConstraint("change >= 0", name="change_not_negative"),
    )

    number: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id: Mapped[uuid.UUID] = mapped_column(unique=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    total: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    paid: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    change: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    items: Mapped[list[SaleItemModel]] = relationship(
        order_by="SaleItemModel.position", lazy="selectin", cascade="all"
    )
    payments: Mapped[list[SalePaymentModel]] = relationship(
        order_by="SalePaymentModel.position", lazy="selectin", cascade="all"
    )

    @classmethod
    def from_checkout(cls, checkout: Checkout, at: datetime) -> Self:
        """Linha nova, ainda sem número: o banco o atribui no `flush`."""
        return cls(
            id=checkout.order_id,
            occurred_at=at,
            total=checkout.total,
            paid=checkout.paid,
            change=checkout.change,
            items=[
                SaleItemModel.from_entity(checkout.order_id, position, item)
                for position, item in enumerate(checkout.items)
            ],
            payments=[
                SalePaymentModel.from_entity(checkout.order_id, position, payment)
                for position, payment in enumerate(checkout.payments)
            ],
        )

    def to_entity(self) -> Sale:
        return Sale(
            id=self.id,
            number=self.number,
            # O SQLite devolve a data sem fuso; o valor gravado é sempre UTC.
            occurred_at=self.occurred_at
            if self.occurred_at.tzinfo is not None
            else self.occurred_at.replace(tzinfo=UTC),
            items=tuple(item.to_entity() for item in self.items),
            payments=tuple(payment.to_entity() for payment in self.payments),
            total=self.total,
            paid=self.paid,
            change=self.change,
        )


class SaleItemModel(Base):
    __tablename__ = "sale_items"
    __table_args__ = (
        CheckConstraint(
            f"quantity BETWEEN 1 AND {MAX_LINE_QUANTITY}", name="quantity_range"
        ),
    )

    sale_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sales.id"), primary_key=True)
    position: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=False
    )
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"))
    name: Mapped[str] = mapped_column(String(NAME_MAX_LENGTH))
    barcode: Mapped[str] = mapped_column(String(GTIN14_LENGTH))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(8, 2))
    quantity: Mapped[int] = mapped_column(Integer)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    @classmethod
    def from_entity(cls, sale_id: uuid.UUID, position: int, item: SaleItem) -> Self:
        return cls(
            sale_id=sale_id,
            position=position,
            product_id=item.product_id,
            name=item.name,
            barcode=item.barcode,
            unit_price=item.unit_price,
            quantity=item.quantity,
            subtotal=item.subtotal,
        )

    def to_entity(self) -> SaleItem:
        return SaleItem(
            product_id=self.product_id,
            name=self.name,
            barcode=self.barcode,
            unit_price=self.unit_price,
            quantity=self.quantity,
            subtotal=self.subtotal,
        )


class SalePaymentModel(Base):
    __tablename__ = "sale_payments"
    __table_args__ = (
        CheckConstraint(f"method IN ({_METHODS})", name="method"),
        CheckConstraint("amount > 0", name="amount_positive"),
    )

    sale_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sales.id"), primary_key=True)
    position: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=False
    )
    method: Mapped[str] = mapped_column(String(METHOD_MAX_LENGTH))
    amount: Mapped[Decimal] = mapped_column(Numeric(8, 2))

    @classmethod
    def from_entity(cls, sale_id: uuid.UUID, position: int, payment: Payment) -> Self:
        return cls(
            sale_id=sale_id,
            position=position,
            method=payment.method.value,
            amount=payment.amount,
        )

    def to_entity(self) -> Payment:
        return Payment(self.method, self.amount)
