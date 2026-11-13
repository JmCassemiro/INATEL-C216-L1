import uuid

import pytest

from app.domain.errors import InvalidDataError
from app.domain.item import ITEM_NAME_MAX_LENGTH, Item


def test_create_generates_uuid7_and_normalizes_the_data():
    """O item nasce com id UUID v7 e os textos sem espaços nas pontas."""
    item = Item.create("  Notebook  ", "  14 polegadas  ")

    assert uuid.UUID(str(item.id)).version == 7
    assert item.name == "Notebook"
    assert item.description == "14 polegadas"


@pytest.mark.parametrize("description", [None, "", "   "])
def test_empty_description_becomes_none(description):
    """A descrição é opcional: vazia vira `None`."""
    assert Item.create("Notebook", description).description is None


@pytest.mark.parametrize("name", ["", "   "])
def test_name_is_required(name):
    """Nome vazio ou só com espaços é recusado."""
    with pytest.raises(InvalidDataError, match="Nome é obrigatório") as error:
        Item.create(name, None)

    assert error.value.field == "name"


def test_name_accepts_up_to_100_characters():
    """O nome tem de 1 a 100 caracteres."""
    name = "a" * ITEM_NAME_MAX_LENGTH

    assert Item.create(name, None).name == name


def test_name_longer_than_100_characters_is_rejected():
    """Acima de 100 caracteres, o nome é recusado."""
    with pytest.raises(InvalidDataError, match="no máximo 100 caracteres"):
        Item.create("a" * (ITEM_NAME_MAX_LENGTH + 1), None)


def test_description_longer_than_500_characters_is_rejected():
    """A descrição tem no máximo 500 caracteres."""
    with pytest.raises(InvalidDataError, match="no máximo 500 caracteres") as error:
        Item.create("Notebook", "a" * 501)

    assert error.value.field == "description"
