"""Contrato da porta `ItemRepository`, verificado em todas as implementações."""

from collections.abc import Iterator

import pytest

from app.application.ports.item_repository import ItemRepository
from app.domain.errors import DuplicateItemNameError
from app.domain.item import Item
from app.infrastructure.repositories.in_memory_item_repository import (
    InMemoryItemRepository,
)
from app.infrastructure.repositories.sqlalchemy_item_repository import (
    SqlAlchemyItemRepository,
)


@pytest.fixture(params=["in_memory", "sqlalchemy"])
def repository(request) -> Iterator[ItemRepository]:
    if request.param == "in_memory":
        yield InMemoryItemRepository()
        return

    with request.getfixturevalue("session_factory")() as session:
        yield SqlAlchemyItemRepository(session)


def test_list_returns_added_items_in_registration_order(repository):
    first = Item.create("Notebook", "14 polegadas")
    second = Item.create("Mouse", None)

    repository.add(first)
    repository.add(second)

    assert repository.list() == [first, second]


def test_add_rejects_a_name_already_registered(repository):
    """O nome é único; a recusa não grava nada."""
    repository.add(Item.create("Notebook", None))

    with pytest.raises(DuplicateItemNameError):
        repository.add(Item.create("Notebook", "outro"))

    assert [item.name for item in repository.list()] == ["Notebook"]


def test_repository_still_works_after_a_rejected_add(repository):
    """Depois de um conflito, o repositório continua gravando."""
    repository.add(Item.create("Notebook", None))
    with pytest.raises(DuplicateItemNameError):
        repository.add(Item.create("Notebook", None))

    repository.add(Item.create("Mouse", None))

    assert [item.name for item in repository.list()] == ["Notebook", "Mouse"]
