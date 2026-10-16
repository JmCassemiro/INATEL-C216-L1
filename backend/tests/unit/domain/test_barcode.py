from dataclasses import FrozenInstanceError

import pytest

from app.domain.barcode import Barcode
from app.domain.errors import InvalidDataError


@pytest.mark.parametrize(
    "code",
    [
        "96385074",  # GTIN-8
        "012345678905",  # UPC-A (GTIN-12)
        "7891000315507",  # EAN-13
        "07891000315507",  # GTIN-14
    ],
)
def test_accepts_valid_gtin(code):
    """FR-004: aceita GTIN-8, 12, 13 e 14 com dígito verificador válido."""
    assert Barcode(code).value == code


@pytest.mark.parametrize(
    "code",
    [
        "7891000315508",  # dígito verificador errado
        "789100031550A",  # letra
        "789100 315507",  # espaço
        "",
        "1234567",  # 7 dígitos
        "123456789",  # 9
        "1234567890",  # 10
        "12345678901",  # 11
        "123456789012345",  # 15
    ],
)
def test_rejects_invalid_gtin(code):
    """FR-004: recusa código fora do padrão GTIN."""
    with pytest.raises(InvalidDataError) as error:
        Barcode(code)

    assert error.value.field == "barcode"


def test_value_keeps_the_code_as_given():
    """D6: o código é guardado como foi informado."""
    assert Barcode("012345678905").value == "012345678905"


@pytest.mark.parametrize(
    ("code", "gtin14"),
    [
        ("96385074", "00000096385074"),
        ("012345678905", "00012345678905"),
        ("7891000315507", "07891000315507"),
        ("07891000315507", "07891000315507"),
    ],
)
def test_gtin14_pads_with_leading_zeros(code, gtin14):
    """D6: a forma canônica tem 14 dígitos, com zeros à esquerda."""
    assert Barcode(code).gtin14 == gtin14


def test_equivalent_codes_are_equal_and_share_hash():
    """FR-005, D6: códigos com o mesmo GTIN-14 são o mesmo código."""
    short, padded = Barcode("7891000315507"), Barcode("07891000315507")

    assert short == padded
    assert hash(short) == hash(padded)


def test_different_codes_are_not_equal():
    """D6: GTINs diferentes não são iguais."""
    assert Barcode("7891000315507") != Barcode("96385074")


def test_is_immutable():
    """D6: value object imutável."""
    barcode = Barcode("7891000315507")

    with pytest.raises(FrozenInstanceError):
        barcode.value = "96385074"  # pyright: ignore[reportAttributeAccessIssue]
