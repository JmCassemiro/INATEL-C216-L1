import uuid
from datetime import datetime
from typing import Self

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.stock import NOTE_MAX_LENGTH, MovementKind, StockMovement
from app.infrastructure.database.base import Base

KIND_MAX_LENGTH = 16


class StockMovementModel(Base):
    """Tabela `stock_movements`: o histórico imutável do saldo (spec 011).

    A única `(product_id, sequence)` impede dois números iguais no mesmo produto,
    mesmo que o bloqueio da linha do produto falhe (research D4, D5); ela também é o
    índice usado pelo histórico.
    """

    __tablename__ = "stock_movements"
    __table_args__ = (
        UniqueConstraint("product_id", "sequence"),
        CheckConstraint("kind IN ('entry', 'adjustment')", name="kind"),
        CheckConstraint("quantity <> 0", name="quantity_not_zero"),
        CheckConstraint("balance_after >= 0", name="balance_not_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"))
    sequence: Mapped[int] = mapped_column(Integer)
    kind: Mapped[str] = mapped_column(String(KIND_MAX_LENGTH))
    quantity: Mapped[int] = mapped_column(Integer)
    balance_after: Mapped[int] = mapped_column(Integer)
    note: Mapped[str | None] = mapped_column(String(NOTE_MAX_LENGTH))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    @classmethod
    def from_entity(cls, movement: StockMovement) -> Self:
        return cls(
            id=movement.id,
            product_id=movement.product_id,
            sequence=movement.sequence,
            kind=movement.kind.value,
            quantity=movement.quantity,
            balance_after=movement.balance_after,
            note=movement.note,
            occurred_at=movement.occurred_at,
        )

    def to_entity(self) -> StockMovement:
        return StockMovement(
            id=self.id,
            product_id=self.product_id,
            sequence=self.sequence,
            kind=MovementKind(self.kind),
            quantity=self.quantity,
            balance_after=self.balance_after,
            note=self.note,
            occurred_at=self.occurred_at,
        )
