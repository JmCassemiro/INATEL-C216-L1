import builtins
from typing import Protocol

from app.domain.item import Item


class ItemRepository(Protocol):
    """Armazenamento de itens.

    Cada implementação garante que verificar o nome e gravar são uma operação atômica.
    """

    def add(self, item: Item) -> None:
        """Grava um item novo.

        Levanta `DuplicateItemNameError` se já existe um item com o mesmo nome.
        """
        ...

    def list(self) -> builtins.list[Item]:
        """Todos os itens, em ordem de cadastro."""
        ...
