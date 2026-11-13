import uuid
from dataclasses import dataclass
from uuid import UUID

from app.domain.errors import InvalidDataError

ITEM_NAME_MAX_LENGTH = 100
ITEM_DESCRIPTION_MAX_LENGTH = 500


def normalize_item_name(text: str) -> str:
    """Remove os espaços das pontas e exige de 1 a 100 caracteres."""
    name = text.strip()
    if not name:
        raise InvalidDataError("name", "Nome é obrigatório")
    if len(name) > ITEM_NAME_MAX_LENGTH:
        raise InvalidDataError(
            "name", f"Nome deve ter no máximo {ITEM_NAME_MAX_LENGTH} caracteres"
        )
    return name


def normalize_item_description(text: str | None) -> str | None:
    """Remove os espaços das pontas; vazia vira `None`; até 500 caracteres."""
    description = (text or "").strip()
    if len(description) > ITEM_DESCRIPTION_MAX_LENGTH:
        raise InvalidDataError(
            "description",
            f"Descrição deve ter no máximo {ITEM_DESCRIPTION_MAX_LENGTH} caracteres",
        )
    return description or None


@dataclass(frozen=True, slots=True)
class Item:
    """Item do gerenciador consumido pelo frontend (Prática 7).

    O nome é único entre os itens; quem garante isso é o repositório.
    """

    id: UUID
    name: str
    description: str | None

    @classmethod
    def create(cls, name: str, description: str | None) -> Item:
        """Cria um item com id UUID v7 e os dados normalizados."""
        return cls(
            id=uuid.uuid7(),
            name=normalize_item_name(name),
            description=normalize_item_description(description),
        )
