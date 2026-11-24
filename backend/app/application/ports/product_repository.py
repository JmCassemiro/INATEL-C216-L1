import builtins
from typing import Protocol
from uuid import UUID

from app.application.commands import ProductOrder
from app.domain.barcode import Barcode
from app.domain.product import Product


class ProductRepository(Protocol):
    """Armazenamento de produtos (D3).

    Cada implementação garante que verificação e gravação são atômicas (D9). As leituras
    devolvem só produtos ativos. O saldo (`stock_quantity`) é lido aqui, mas só o
    `StockRepository` o grava (spec 011, research D2).
    """

    def add(self, product: Product) -> None:
        """Grava um produto novo.

        Levanta `DuplicateBarcodeError` se o `gtin14` já pertence a qualquer produto,
        inclusive removido.
        """
        ...

    def update(self, product: Product) -> None:
        """Substitui o cadastro do registro de mesmo id, sem tocar no saldo guardado.

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
        self,
        offset: int,
        limit: int,
        name: str | None,
        *,
        restock_only: bool = False,
        order: ProductOrder = ProductOrder.NEWEST,
    ) -> tuple[builtins.list[Product], int]:
        """Produtos ativos na ordem pedida, recortados, com o total filtrado.

        `name` filtra por parte do nome, sem diferenciar maiúsculas e acentos; `None`
        ou vazio não filtra. `restock_only` deixa só os produtos abaixo do mínimo.
        """
        ...
