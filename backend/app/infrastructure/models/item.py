import uuid
from typing import Self

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.item import ITEM_DESCRIPTION_MAX_LENGTH, ITEM_NAME_MAX_LENGTH, Item
from app.infrastructure.database.base import Base


class ItemModel(Base):
    """Tabela `items`; a constraint única de `name` impede nomes repetidos."""

    __tablename__ = "items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(ITEM_NAME_MAX_LENGTH), unique=True)
    description: Mapped[str | None] = mapped_column(String(ITEM_DESCRIPTION_MAX_LENGTH))

    @classmethod
    def from_entity(cls, item: Item) -> Self:
        return cls(id=item.id, name=item.name, description=item.description)

    def to_entity(self) -> Item:
        return Item(id=self.id, name=self.name, description=self.description)
