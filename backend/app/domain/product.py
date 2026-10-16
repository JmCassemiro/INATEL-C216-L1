import uuid
from dataclasses import dataclass, replace
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from app.domain.barcode import Barcode
from app.domain.errors import InvalidDataError, ProductNotFoundError
from app.domain.price import Price

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
    """Produto do catálogo (data-model). Imutável: cada mudança gera nova instância."""

    id: UUID
    name: str
    description: str | None
    barcode: Barcode
    price: Price
    removed_at: datetime | None = None

    @property
    def is_active(self) -> bool:
        return self.removed_at is None

    @classmethod
    def create(
        cls,
        name: str,
        description: str | None,
        barcode: str,
        price: Decimal | int | str,
    ) -> Product:
        """Cria um produto ativo, com id UUID v7 e os dados normalizados."""
        return cls(
            id=uuid.uuid7(),
            name=normalize_name(name),
            description=normalize_description(description),
            barcode=Barcode(barcode),
            price=Price(price),
        )

    def updated(
        self,
        name: str,
        description: str | None,
        barcode: str,
        price: Decimal | int | str,
    ) -> Product:
        """Nova versão com o cadastro completo trocado e o mesmo id (FR-012, FR-015)."""
        self._ensure_active()
        return replace(
            self,
            name=normalize_name(name),
            description=normalize_description(description),
            barcode=Barcode(barcode),
            price=Price(price),
        )

    def removed(self, at: datetime) -> Product:
        """Nova versão inativa, removida no momento `at` (FR-016)."""
        self._ensure_active()
        return replace(self, removed_at=at)

    def _ensure_active(self) -> None:
        """Produto removido não existe para quem o procura (FR-016a)."""
        if not self.is_active:
            raise ProductNotFoundError()
