import uuid
from dataclasses import dataclass, replace
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from app.domain.barcode import Barcode
from app.domain.errors import InvalidDataError, ProductNotFoundError
from app.domain.price import Price
from app.domain.stock import (
    StockStatus,
    needs_restock,
    normalize_min_stock,
    shortfall,
    stock_status,
)

NAME_MAX_LENGTH = 120
DESCRIPTION_MAX_LENGTH = 500


def normalize_name(text: str) -> str:
    """Remove os espaços das pontas e exige de 1 a 120 caracteres (FR-002)."""
    name = text.strip()
    if not name:
        raise InvalidDataError("name", "Nome é obrigatório")
    if len(name) > NAME_MAX_LENGTH:
        raise InvalidDataError(
            "name", f"Nome deve ter no máximo {NAME_MAX_LENGTH} caracteres"
        )
    return name


def normalize_description(text: str | None) -> str | None:
    """Remove os espaços das pontas; vazia vira `None`; até 500 caracteres (FR-002)."""
    description = (text or "").strip()
    if len(description) > DESCRIPTION_MAX_LENGTH:
        raise InvalidDataError(
            "description",
            f"Descrição deve ter no máximo {DESCRIPTION_MAX_LENGTH} caracteres",
        )
    return description or None


@dataclass(frozen=True, slots=True)
class Product:
    """Produto do catálogo (data-model). Imutável: cada mudança gera nova instância.

    `min_stock` é dado do cadastro. `stock_quantity` é só leitura para o cadastro:
    começa em 0 e só muda por movimentação de estoque (spec 011, FR-002, research D2).
    """

    id: UUID
    name: str
    description: str | None
    barcode: Barcode
    price: Price
    removed_at: datetime | None = None
    min_stock: int = 0
    stock_quantity: int = 0

    @property
    def is_active(self) -> bool:
        return self.removed_at is None

    @property
    def shortfall(self) -> int:
        return shortfall(self.stock_quantity, self.min_stock)

    @property
    def needs_restock(self) -> bool:
        return needs_restock(self.stock_quantity, self.min_stock)

    @property
    def stock_status(self) -> StockStatus:
        return stock_status(self.stock_quantity, self.min_stock)

    @classmethod
    def create(
        cls,
        name: str,
        description: str | None,
        barcode: str,
        price: Decimal | int | str,
        min_stock: int = 0,
    ) -> Product:
        """Cria um produto ativo, com id UUID v7, os dados normalizados e saldo 0."""
        return cls(
            id=uuid.uuid7(),
            name=normalize_name(name),
            description=normalize_description(description),
            barcode=Barcode(barcode),
            price=Price(price),
            min_stock=normalize_min_stock(min_stock),
        )

    def updated(
        self,
        name: str,
        description: str | None,
        barcode: str,
        price: Decimal | int | str,
        min_stock: int = 0,
    ) -> Product:
        """Nova versão com o cadastro completo trocado e o mesmo id (FR-012, FR-015).

        O saldo (`stock_quantity`) continua o mesmo: o cadastro não o altera.
        """
        self._ensure_active()
        return replace(
            self,
            name=normalize_name(name),
            description=normalize_description(description),
            barcode=Barcode(barcode),
            price=Price(price),
            min_stock=normalize_min_stock(min_stock),
        )

    def removed(self, at: datetime) -> Product:
        """Nova versão inativa, removida no momento `at` (FR-016)."""
        self._ensure_active()
        return replace(self, removed_at=at)

    def _ensure_active(self) -> None:
        """Produto removido não existe para quem o procura (FR-016a)."""
        if not self.is_active:
            raise ProductNotFoundError()
