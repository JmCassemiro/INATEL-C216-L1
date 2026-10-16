import builtins
from typing import Protocol
from uuid import UUID

from app.domain.barcode import Barcode
from app.domain.product import Product


class ProductRepository(Protocol):
    """Armazenamento de produtos (D3).

    Cada implementação garante que verificação e gravação são atômicas (D9). As leituras
    devolvem só produtos ativos.
    """

    def add(self, product: Product) -> None:
        """Grava um produto novo.

        Levanta `DuplicateBarcodeError` se o `gtin14` já pertence a qualquer produto,
        inclusive removido.
        """
        ...

    def update(self, product: Product) -> None:
        """Substitui o registro de mesmo id.

        Levanta `DuplicateBarcodeError` se o código pertence a outro produto e
        `ProductNotFoundError` se o registro guardado não existe ou já está removido.
        """
        ...

    def get_by_id(self, product_id: UUID) -> Product | None:
        """Produto ativo com esse id, ou `None`."""
        ...

    def get_by_barcode(self, barcode: Barcode) -> Product | None:
        """Produto ativo com esse GTIN (comparação por `gtin14`), ou `None`."""
        ...

    def list(
        self, offset: int, limit: int, name: str | None
    ) -> tuple[builtins.list[Product], int]:
        """Produtos ativos em ordem de cadastro, recortados, com o total filtrado.

        `name` filtra por parte do nome, sem diferenciar maiúsculas e acentos; `None`
        ou vazio não filtra.
        """
        ...
