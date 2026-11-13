import pytest

from app.application.commands import ItemData
from app.application.services.item_service import ItemService
from app.domain.errors import DuplicateItemNameError
from app.infrastructure.repositories.in_memory_item_repository import (
    InMemoryItemRepository,
)


@pytest.fixture
def service() -> ItemService:
    return ItemService(InMemoryItemRepository())


def test_create_returns_the_item_with_normalized_data(service):
    """O cadastro devolve o item com id e os dados normalizados."""
    item = service.create(ItemData(name="  Notebook ", description=""))

    assert item.name == "Notebook"
    assert item.description is None
    assert service.list() == [item]


def test_create_rejects_a_name_already_registered(service):
    """O nome é único: repetir um nome cadastrado é conflito."""
    service.create(ItemData(name="Notebook", description=None))

    with pytest.raises(DuplicateItemNameError):
        service.create(ItemData(name=" Notebook ", description="outro"))

    assert len(service.list()) == 1


def test_list_returns_items_in_registration_order(service):
    """A listagem segue a ordem de cadastro."""
    first = service.create(ItemData(name="Notebook", description=None))
    second = service.create(ItemData(name="Mouse", description=None))

    assert service.list() == [first, second]


def test_list_is_empty_without_items(service):
    assert service.list() == []
