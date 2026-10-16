import pytest

from app.domain.errors import (
    ConflictError,
    DomainError,
    DuplicateBarcodeError,
    InvalidDataError,
    NotFoundError,
    ProductNotFoundError,
)


def test_invalid_data_error_is_domain_error_and_value_error():
    """FR-017: dado inválido é erro de domínio e ValueError (vira 422 no Pydantic)."""
    error = InvalidDataError("price", "Preço deve ser maior que zero")

    assert isinstance(error, DomainError)
    assert isinstance(error, ValueError)


def test_invalid_data_error_exposes_field_and_message():
    """FR-017: o erro informa o campo e usa a mensagem em str()."""
    error = InvalidDataError("price", "Preço deve ser maior que zero")

    assert error.field == "price"
    assert str(error) == "Preço deve ser maior que zero"


def test_invalid_data_error_accepts_no_field():
    """FR-017: erro do corpo inteiro não tem campo."""
    error = InvalidDataError(None, "Informe ao menos um campo")

    assert error.field is None
    assert str(error) == "Informe ao menos um campo"


def test_product_not_found_error_is_not_found_with_message():
    """FR-008: produto inexistente é da categoria "não encontrado"."""
    error = ProductNotFoundError()

    assert isinstance(error, NotFoundError)
    assert isinstance(error, DomainError)
    assert str(error) == "Produto não encontrado"


def test_duplicate_barcode_error_is_conflict_with_message():
    """FR-005: código repetido é da categoria "conflito"."""
    error = DuplicateBarcodeError()

    assert isinstance(error, ConflictError)
    assert isinstance(error, DomainError)
    assert str(error) == "Código de barras já cadastrado"


@pytest.mark.parametrize(
    ("category", "other"),
    [
        (InvalidDataError, NotFoundError),
        (InvalidDataError, ConflictError),
        (NotFoundError, InvalidDataError),
        (NotFoundError, ConflictError),
        (ConflictError, InvalidDataError),
        (ConflictError, NotFoundError),
    ],
)
def test_error_categories_are_distinct(category, other):
    """FR-017: as categorias de erro não herdam umas das outras."""
    assert not issubclass(category, other)
