import uuid
from datetime import datetime
from decimal import Decimal
from typing import Self

from sqlalchemy import CheckConstraint, DateTime, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.barcode import GTIN14_LENGTH, Barcode
from app.domain.price import Price
from app.domain.product import DESCRIPTION_MAX_LENGTH, NAME_MAX_LENGTH, Product
from app.domain.stock import MAX_MIN_STOCK, MAX_STOCK_QUANTITY
from app.infrastructure.database.base import Base
from app.infrastructure.repositories.search import searchable


class ProductModel(Base):
    """Tabela `products`: como o produto é guardado, não como entra ou sai da API.

    Além dos campos da entidade, guarda duas formas derivadas para o banco consultar:
    `gtin14` (único, garante o código sem repetição, inclusive entre removidos) e
    `name_search` (nome sem acentos e em minúsculas, para a busca por nome).

    O saldo (`stock_quantity`) fica na linha do produto, mas só o repositório de
    estoque o grava (spec 011, research D2); os `CHECK` repetem as faixas do domínio
    como defesa em profundidade.
    """

    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint(
            f"stock_quantity BETWEEN 0 AND {MAX_STOCK_QUANTITY}",
            name="stock_quantity_range",
        ),
        CheckConstraint(
            f"min_stock BETWEEN 0 AND {MAX_MIN_STOCK}", name="min_stock_range"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(NAME_MAX_LENGTH))
    name_search: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(String(DESCRIPTION_MAX_LENGTH))
    barcode: Mapped[str] = mapped_column(String(GTIN14_LENGTH))
    gtin14: Mapped[str] = mapped_column(String(GTIN14_LENGTH), unique=True)
    price: Mapped[Decimal] = mapped_column(Numeric(8, 2))
    removed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    min_stock: Mapped[int] = mapped_column(Integer, server_default="0")
    stock_quantity: Mapped[int] = mapped_column(Integer, server_default="0")

    @classmethod
    def from_entity(cls, product: Product) -> Self:
        return cls(
            id=product.id,
            stock_quantity=product.stock_quantity,
            **cls.values_from(product),
        )

    @staticmethod
    def values_from(product: Product) -> dict[str, object]:
        """Colunas que o cadastro grava: tudo menos o id e o saldo (research D2)."""
        return {
            "name": product.name,
            "name_search": searchable(product.name),
            "description": product.description,
            "barcode": product.barcode.value,
            "gtin14": product.barcode.gtin14,
            "price": product.price.value,
            "removed_at": product.removed_at,
            "min_stock": product.min_stock,
        }

    def to_entity(self) -> Product:
        return Product(
            id=self.id,
            name=self.name,
            description=self.description,
            barcode=Barcode(self.barcode),
            price=Price(self.price),
            removed_at=self.removed_at,
            min_stock=self.min_stock,
            stock_quantity=self.stock_quantity,
        )
