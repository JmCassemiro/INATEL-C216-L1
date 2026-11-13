from app.application.commands import ItemData
from app.application.ports.item_repository import ItemRepository
from app.domain.item import Item


class ItemService:
    """Casos de uso do gerenciador de itens.

    A unicidade do nome é garantida pelo repositório, de forma atômica; o serviço não a
    verifica antes de gravar (mesma decisão do cadastro de produtos, D9).
    """

    def __init__(self, repository: ItemRepository) -> None:
        self._repository = repository

    def create(self, data: ItemData) -> Item:
        item = Item.create(data.name, data.description)
        self._repository.add(item)
        return item

    def list(self) -> list[Item]:
        return self._repository.list()
