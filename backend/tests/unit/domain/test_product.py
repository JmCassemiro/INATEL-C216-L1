from dataclasses import FrozenInstanceError, fields
from datetime import UTC, datetime
from decimal import Decimal

import pytest

from app.domain.barcode import Barcode
from app.domain.errors import InvalidDataError, ProductNotFoundError
from app.domain.price import Price
from app.domain.product import Product, normalize_description, normalize_name

FIELDS = [field.name for field in fields(Product)]


def make_product(**overrides) -> Product:
    data = {
        "name": "Camiseta Básica Branca M",
        "description": "Algodão",
        "barcode": "7891000315507",
        "price": Decimal("49.90"),
    } | overrides
    return Product.create(**data)


# --- nome -------------------------------------------------------------------


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Camiseta", "Camiseta"),
        ("  Camiseta  ", "Camiseta"),
        ("A", "A"),
        pytest.param("x" * 120, "x" * 120, id="120-chars"),
    ],
)
def test_normalize_name_strips_and_accepts_1_to_120_chars(text, expected):
    """FR-002: nome sem espaços nas pontas, de 1 a 120 caracteres."""
    assert normalize_name(text) == expected


@pytest.mark.parametrize("text", ["", "   ", pytest.param("x" * 121, id="121-chars")])
def test_normalize_name_rejects_blank_or_too_long(text):
    """FR-002: nome vazio ou com mais de 120 caracteres é recusado."""
    with pytest.raises(InvalidDataError) as error:
        normalize_name(text)

    assert error.value.field == "name"


# --- descrição --------------------------------------------------------------


@pytest.mark.parametrize("text", [None, "", "   "])
def test_normalize_description_turns_blank_into_none(text):
    """FR-002: descrição vazia vira ausência de descrição."""
    assert normalize_description(text) is None


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("  Algodão  ", "Algodão"),
        pytest.param("x" * 500, "x" * 500, id="500-chars"),
    ],
)
def test_normalize_description_strips_and_accepts_up_to_500_chars(text, expected):
    """FR-002: descrição sem espaços nas pontas, até 500 caracteres."""
    assert normalize_description(text) == expected


def test_normalize_description_rejects_more_than_500_chars():
    """FR-002: descrição com mais de 500 caracteres é recusada."""
    with pytest.raises(InvalidDataError) as error:
        normalize_description("x" * 501)

    assert error.value.field == "description"


# --- criação ----------------------------------------------------------------


def test_create_builds_product_with_normalized_data():
    """FR-001: o produto nasce com os dados informados, normalizados."""
    product = make_product(name="  Camiseta  ", description="   ", price="49.9")

    assert product.name == "Camiseta"
    assert product.description is None
    assert product.barcode == Barcode("7891000315507")
    assert product.price == Price("49.90")


def test_create_generates_uuid_v7():
    """D4: o id é um UUID versão 7 gerado pelo domínio."""
    assert make_product().id.version == 7


def test_new_products_have_different_ids():
    """D4: cada produto novo tem um id próprio."""
    assert make_product().id != make_product().id


def test_new_product_is_active():
    """FR-016: produto nasce ativo."""
    product = make_product()

    assert product.removed_at is None
    assert product.is_active is True


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("name", "   "),
        pytest.param("description", "x" * 501, id="description-501-chars"),
        ("barcode", "7891000315508"),
        ("price", 0),
    ],
)
def test_create_rejects_invalid_data_with_the_field(field, value):
    """FR-002 a FR-004: dado inválido impede a criação e indica o campo."""
    with pytest.raises(InvalidDataError) as error:
        make_product(**{field: value})

    assert error.value.field == field


def test_product_is_immutable():
    """D10: entidade imutável."""
    product = make_product()

    with pytest.raises(FrozenInstanceError):
        product.name = "Outro"  # pyright: ignore[reportAttributeAccessIssue]


# --- US3: atualizar -------------------------------------------------------------


def test_updated_returns_new_instance_with_same_id_and_new_data():
    """FR-012: a substituição troca todos os dados e mantém o id."""
    original = make_product()

    changed = original.updated(
        name="  Camiseta Preta  ",
        description=None,
        barcode="96385074",
        price="44.9",
    )

    assert changed.id == original.id
    assert changed.name == "Camiseta Preta"
    assert changed.description is None
    assert changed.barcode == Barcode("96385074")
    assert changed.price == Price("44.90")


def test_updated_does_not_change_the_original():
    """FR-017, D10: a instância original continua igual."""
    original = make_product()
    snapshot = Product(**{field: getattr(original, field) for field in FIELDS})

    original.updated("Outro", None, "96385074", "1.00")

    assert original == snapshot


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("name", "   "),
        pytest.param("description", "x" * 501, id="description-501-chars"),
        ("barcode", "7891000315508"),
        ("price", 0),
    ],
)
def test_updated_validates_like_create(field, value):
    """FR-015: a atualização aplica as mesmas regras do cadastro."""
    product = make_product()
    data = {
        "name": product.name,
        "description": product.description,
        "barcode": product.barcode.value,
        "price": product.price.value,
    } | {field: value}

    with pytest.raises(InvalidDataError) as error:
        product.updated(**data)

    assert error.value.field == field


# --- US4: remover ------------------------------------------------------------------

REMOVED_AT = datetime(2026, 10, 16, 12, 0, tzinfo=UTC)


def test_removed_returns_inactive_instance_with_same_id():
    """FR-016: remover inativa o produto e guarda o momento da remoção."""
    product = make_product()

    removed = product.removed(REMOVED_AT)

    assert removed.id == product.id
    assert removed.removed_at == REMOVED_AT
    assert removed.is_active is False
    assert product.is_active is True


def test_removed_product_cannot_be_removed_again():
    """FR-016a: produto removido não é encontrado para nova remoção."""
    removed = make_product().removed(REMOVED_AT)

    with pytest.raises(ProductNotFoundError):
        removed.removed(REMOVED_AT)


def test_removed_product_cannot_be_updated():
    """FR-016a: produto removido não é encontrado para alteração."""
    removed = make_product().removed(REMOVED_AT)

    with pytest.raises(ProductNotFoundError):
        removed.updated("Outro", None, "96385074", "1.00")
