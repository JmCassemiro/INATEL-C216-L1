import uuid
from datetime import datetime
from decimal import Decimal
from typing import Self

from sqlalchemy import DateTime, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.barcode import GTIN14_LENGTH, Barcode
from app.domain.price import Price
from app.domain.product import DESCRIPTION_MAX_LENGTH, NAME_MAX_LENGTH, Product
from app.infrastructure.database.base import Base
from app.infrastructure.repositories.search import searchable


class ProductModel(Base):
    """Tabela `products`: como o produto é guardado, não como entra ou sai da API.

    Além dos campos da entidade, guarda duas formas derivadas para o banco consultar:
    `gtin14` (único, garante o código sem repetição, inclusive entre removidos) e
    `name_search` (nome sem acentos e em minúsculas, para a busca por nome).
    """

    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(NAME_MAX_LENGTH))
    name_search: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(String(DESCRIPTION_MAX_LENGTH))
    barcode: Mapped[str] = mapped_column(String(GTIN14_LENGTH))
    gtin14: Mapped[str] = mapped_column(String(GTIN14_LENGTH), unique=True)
    price: Mapped[Decimal] = mapped_column(Numeric(8, 2))
    removed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    @classmethod
    def from_entity(cls, product: Product) -> Self:
        return cls(id=product.id, **cls.values_from(product))

    @staticmethod
    def values_from(product: Product) -> dict[str, object]:
        """Colunas que mudam quando o produto muda (tudo menos o id)."""
        return {
            "name": product.name,
            "name_search": searchable(product.name),
            "description": product.description,
            "barcode": product.barcode.value,
            "gtin14": product.barcode.gtin14,
            "price": product.price.value,
            "removed_at": product.removed_at,
        }

    def to_entity(self) -> Product:
        return Product(
            id=self.id,
            name=self.name,
            description=self.description,
            barcode=Barcode(self.barcode),
            price=Price(self.price),
            removed_at=self.removed_at,
        )
