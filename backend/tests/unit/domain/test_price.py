from dataclasses import FrozenInstanceError
from decimal import Decimal

import pytest

from app.domain.errors import InvalidDataError
from app.domain.price import Price


@pytest.mark.parametrize(
    ("amount", "expected"),
    [
        (Decimal("49.90"), Decimal("49.90")),
        ("49.9", Decimal("49.90")),
        (50, Decimal("50.00")),
        ("999999.99", Decimal("999999.99")),
        ("0.01", Decimal("0.01")),
    ],
)
def test_accepts_valid_price(amount, expected):
    """FR-003: aceita valor positivo com até 2 casas, em Decimal, int ou str."""
    assert Price(amount).value == expected


def test_normalizes_to_two_decimal_places():
    """FR-003, D5: o valor é normalizado para duas casas."""
    assert str(Price("49.9").value) == "49.90"
    assert str(Price(50).value) == "50.00"


@pytest.mark.parametrize(
    "amount",
    [
        0,
        -1,
        "10.999",
        1000000,
        "1000000.00",
        49.9,  # float é recusado
        "NaN",
        "Infinity",
        "abc",
        "",
    ],
)
def test_rejects_invalid_price(amount):
    """FR-003: recusa preço não positivo, com mais de 2 casas, alto ou inexato."""
    with pytest.raises(InvalidDataError) as error:
        Price(amount)

    assert error.value.field == "price"


def test_is_immutable():
    """D5: value object imutável."""
    price = Price("49.90")

    with pytest.raises(FrozenInstanceError):
        price.value = Decimal("1.00")  # pyright: ignore[reportAttributeAccessIssue]
