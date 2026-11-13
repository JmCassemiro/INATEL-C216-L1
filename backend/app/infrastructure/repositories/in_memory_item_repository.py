import builtins
import threading

from app.domain.errors import DuplicateItemNameError
from app.domain.item import Item


class InMemoryItemRepository:
    """Repositório em memória que satisfaz a porta `ItemRepository`.

    Guarda os itens por nome, em ordem de cadastro, sob um lock: verificar o nome e
    gravar precisam ser uma operação só.
    """

    def __init__(self) -> None:
        self._items_by_name: dict[str, Item] = {}
        self._lock = threading.Lock()

    def add(self, item: Item) -> None:
        with self._lock:
            if item.name in self._items_by_name:
                raise DuplicateItemNameError()
            self._items_by_name[item.name] = item

    def list(self) -> builtins.list[Item]:
        with self._lock:
            return list(self._items_by_name.values())
