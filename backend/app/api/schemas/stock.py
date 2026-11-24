"""DTOs da borda HTTP do estoque (spec 011, contracts/stock-api.md).

Como nos produtos, as regras de conteúdo vêm do domínio via `AfterValidator`, então
cada erro sai com o campo no `loc`. Quantidades são `StrictInt`: "2", 2.5 e `true` são
recusados antes de chegar ao domínio.
"""

from datetime import datetime
from decimal import Decimal
from typing import Annotated, Self
from uuid import UUID

from pydantic import AfterValidator, BaseModel, StrictInt

from app.application.pagination import Page
from app.domain.stock import (
    MovementKind,
    StockMovement,
    StockSummary,
    adjustment_quantity,
    entry_quantity,
    normalize_note,
    normalize_reason,
)

EntryQuantity = Annotated[StrictInt, AfterValidator(entry_quantity)]
AdjustmentQuantity = Annotated[StrictInt, AfterValidator(adjustment_quantity)]
Note = Annotated[str | None, AfterValidator(normalize_note)]
Reason = Annotated[str, AfterValidator(normalize_reason)]


class EntryInput(BaseModel):
    """Entrada de mercadoria: quantidade e observação opcional."""

    quantity: EntryQuantity
    note: Note = None


class AdjustmentInput(BaseModel):
    """Ajuste: quantidade com sinal (positiva adiciona, negativa retira) e motivo."""

    quantity: AdjustmentQuantity
    reason: Reason


class MovementOutput(BaseModel):
    """Movimentação registrada; `note` é a observação da entrada ou o motivo."""

    id: UUID
    product_id: UUID
    sequence: int
    kind: MovementKind
    quantity: int
    balance_after: int
    note: str | None
    occurred_at: datetime

    @classmethod
    def from_entity(cls, movement: StockMovement) -> Self:
        return cls(
            id=movement.id,
            product_id=movement.product_id,
            sequence=movement.sequence,
            kind=movement.kind,
            quantity=movement.quantity,
            balance_after=movement.balance_after,
            note=movement.note,
            occurred_at=movement.occurred_at,
        )


class MovementPageOutput(BaseModel):
    """Página do histórico de um produto."""

    items: list[MovementOutput]
    total: int
    page: int
    size: int

    @classmethod
    def from_page(cls, page: Page[StockMovement]) -> Self:
        return cls(
            items=[MovementOutput.from_entity(movement) for movement in page.items],
            total=page.total,
            page=page.page,
            size=page.size,
        )


class StockSummaryOutput(BaseModel):
    """Indicadores do estoque; o valor sai como string com 2 casas, como o preço."""

    restock_count: int
    out_of_stock_count: int
    stock_value: str

    @classmethod
    def from_summary(cls, summary: StockSummary) -> Self:
        value: Decimal = summary.stock_value
        return cls(
            restock_count=summary.restock_count,
            out_of_stock_count=summary.out_of_stock_count,
            stock_value=str(value),
        )
