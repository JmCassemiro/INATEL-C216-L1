"""DTOs da borda HTTP de itens.

As regras de conteúdo vêm do domínio, via `AfterValidator`, como nos produtos.
"""

from typing import Annotated, Self
from uuid import UUID

from pydantic import AfterValidator, BaseModel

from app.application.commands import ItemData
from app.domain.item import Item, normalize_item_description, normalize_item_name

ItemName = Annotated[str, AfterValidator(normalize_item_name)]
ItemDescription = Annotated[str | None, AfterValidator(normalize_item_description)]


class ItemInput(BaseModel):
    """Corpo do POST: nome obrigatório (1 a 100 caracteres) e descrição opcional."""

    name: ItemName
    description: ItemDescription = None

    def to_command(self) -> ItemData:
        return ItemData(name=self.name, description=self.description)


class ItemOutput(BaseModel):
    id: UUID
    name: str
    description: str | None

    @classmethod
    def from_entity(cls, item: Item) -> Self:
        return cls(id=item.id, name=item.name, description=item.description)
