"""Regras do estoque (spec 011, research D3).

O saldo de um produto só muda por movimentações: uma entrada de mercadoria, um
ajuste com motivo ou a baixa por uma venda (spec 004). `StockChange` é o pedido já
validado; `apply` o aplica a um saldo e devolve a `StockMovement` registrada, ou recusa
o resultado inválido. Quem chama `apply` (o repositório) garante que o saldo lido é o
atual (research D4).
"""

import uuid
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Self
from uuid import UUID

from app.domain.errors import (
    InsufficientStockError,
    InvalidDataError,
    StockLimitExceededError,
)

MAX_MOVEMENT_QUANTITY = 99_999
MAX_MIN_STOCK = 99_999
MAX_STOCK_QUANTITY = 999_999
NOTE_MAX_LENGTH = 200
REASON_MIN_LENGTH = 3


class MovementKind(StrEnum):
    ENTRY = "entry"
    ADJUSTMENT = "adjustment"
    SALE = "sale"


class StockStatus(StrEnum):
    OUT_OF_STOCK = "out_of_stock"
    RESTOCK = "restock"
    OK = "ok"


@dataclass(frozen=True, slots=True)
class StockMovement:
    """Movimentação registrada: imutável, nunca editada nem apagada (FR-007, FR-008)."""

    id: UUID
    product_id: UUID
    sequence: int
    kind: MovementKind
    quantity: int
    balance_after: int
    note: str | None
    occurred_at: datetime


@dataclass(frozen=True, slots=True)
class StockChange:
    """Pedido de movimentação já validado. Crie com `entry` ou `adjustment`."""

    kind: MovementKind
    quantity: int
    note: str | None

    @classmethod
    def entry(cls, quantity: int, note: str | None = None) -> Self:
        """Entrada de mercadoria: 1 a 99.999 unidades, observação opcional (FR-003)."""
        return cls(MovementKind.ENTRY, entry_quantity(quantity), normalize_note(note))

    @classmethod
    def adjustment(cls, quantity: int, reason: str) -> Self:
        """Ajuste com sinal (positivo adiciona, negativo retira) e motivo (FR-005)."""
        return cls(
            MovementKind.ADJUSTMENT,
            adjustment_quantity(quantity),
            normalize_reason(reason),
        )

    @classmethod
    def sale(cls, quantity: int, sale_number: int) -> Self:
        """Baixa por venda: retira a quantidade vendida (spec 004, FR-019)."""
        return cls(
            MovementKind.SALE, -entry_quantity(quantity), f"Venda nº {sale_number}"
        )

    def apply(
        self, product_id: UUID, *, balance: int, sequence: int, at: datetime
    ) -> StockMovement:
        """Aplica a mudança ao saldo atual; recusa saldo negativo ou acima do teto."""
        new_balance = balance + self.quantity
        if new_balance < 0:
            raise InsufficientStockError(balance)
        if new_balance > MAX_STOCK_QUANTITY:
            raise StockLimitExceededError()
        return StockMovement(
            id=uuid.uuid7(),
            product_id=product_id,
            sequence=sequence,
            kind=self.kind,
            quantity=self.quantity,
            balance_after=new_balance,
            note=self.note,
            occurred_at=at,
        )


@dataclass(frozen=True, slots=True)
class StockSummary:
    """Indicadores do estoque dos produtos ativos (FR-018)."""

    restock_count: int
    out_of_stock_count: int
    stock_value: Decimal


def normalize_min_stock(value: int) -> int:
    """Estoque mínimo: inteiro de 0 a 99.999 (FR-001)."""
    if not _is_integer(value) or not 0 <= value <= MAX_MIN_STOCK:
        raise InvalidDataError(
            "min_stock", "Estoque mínimo deve ser um número inteiro de 0 a 99.999"
        )
    return value


def shortfall(quantity: int, minimum: int) -> int:
    """Quanto falta para chegar ao mínimo; zero quando não falta nada (FR-013)."""
    return max(minimum - quantity, 0)


def needs_restock(quantity: int, minimum: int) -> bool:
    """Para repor é estar abaixo do mínimo; com mínimo 0, nunca (FR-013)."""
    return quantity < minimum


def stock_status(quantity: int, minimum: int) -> StockStatus:
    """Sem estoque tem prioridade sobre "para repor" (FR-015)."""
    if quantity == 0:
        return StockStatus.OUT_OF_STOCK
    if needs_restock(quantity, minimum):
        return StockStatus.RESTOCK
    return StockStatus.OK


def entry_quantity(value: int) -> int:
    """Quantidade de uma entrada: inteiro de 1 a 99.999 (FR-003)."""
    if not _is_integer(value) or not 1 <= value <= MAX_MOVEMENT_QUANTITY:
        raise InvalidDataError(
            "quantity", "Quantidade deve ser um número inteiro de 1 a 99.999"
        )
    return value


def adjustment_quantity(value: int) -> int:
    """Quantidade de um ajuste: inteiro com sinal, de 1 a 99.999 unidades (FR-005)."""
    if not _is_integer(value) or value == 0 or abs(value) > MAX_MOVEMENT_QUANTITY:
        raise InvalidDataError(
            "quantity",
            "Quantidade do ajuste deve ser um número inteiro de 1 a 99.999, "
            "para mais ou para menos",
        )
    return value


def normalize_note(text: str | None) -> str | None:
    """Observação da entrada: opcional, aparada, até 200 caracteres (FR-003)."""
    note = (text or "").strip()
    if len(note) > NOTE_MAX_LENGTH:
        raise InvalidDataError(
            "note", f"Observação deve ter no máximo {NOTE_MAX_LENGTH} caracteres"
        )
    return note or None


def normalize_reason(text: str) -> str:
    """Motivo do ajuste: obrigatório, de 3 a 200 caracteres aparados (FR-005)."""
    reason = text.strip()
    if not reason:
        raise InvalidDataError("reason", "Informe o motivo do ajuste")
    if len(reason) < REASON_MIN_LENGTH:
        raise InvalidDataError(
            "reason", f"Motivo deve ter pelo menos {REASON_MIN_LENGTH} caracteres"
        )
    if len(reason) > NOTE_MAX_LENGTH:
        raise InvalidDataError(
            "reason", f"Motivo deve ter no máximo {NOTE_MAX_LENGTH} caracteres"
        )
    return reason


def _is_integer(value: object) -> bool:
    """`bool` é subclasse de `int` em Python, mas não é uma quantidade."""
    return isinstance(value, int) and not isinstance(value, bool)
