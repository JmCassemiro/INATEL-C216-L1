"""Regras do estoque (spec 011): movimentações, saldo, mínimo e situação."""

import uuid
from dataclasses import FrozenInstanceError
from datetime import UTC, datetime

import pytest

from app.domain.errors import (
    InsufficientStockError,
    InvalidDataError,
    StockLimitExceededError,
)
from app.domain.stock import (
    MAX_MOVEMENT_QUANTITY,
    MAX_STOCK_QUANTITY,
    MovementKind,
    StockChange,
    StockStatus,
    needs_restock,
    normalize_min_stock,
    shortfall,
    stock_status,
)

PRODUCT_ID = uuid.uuid7()
AT = datetime(2026, 11, 24, 17, 35, tzinfo=UTC)


# --- entrada ----------------------------------------------------------------


@pytest.mark.parametrize("quantity", [1, 24, MAX_MOVEMENT_QUANTITY])
def test_entry_accepts_quantity_from_1_to_99999(quantity):
    """FR-003: entrada com quantidade inteira de 1 a 99.999."""
    change = StockChange.entry(quantity)

    assert change.kind is MovementKind.ENTRY
    assert change.quantity == quantity


@pytest.mark.parametrize("quantity", [0, -1, MAX_MOVEMENT_QUANTITY + 1])
def test_entry_rejects_quantity_out_of_range(quantity):
    """FR-003: zero, negativa ou acima de 99.999 é recusada no campo `quantity`."""
    with pytest.raises(InvalidDataError) as error:
        StockChange.entry(quantity)

    assert error.value.field == "quantity"


@pytest.mark.parametrize("quantity", [True, 2.0, "2"])
def test_entry_rejects_quantity_that_is_not_an_integer(quantity):
    """FR-003: a quantidade é um inteiro (nem texto, nem fração, nem bool)."""
    with pytest.raises(InvalidDataError) as error:
        StockChange.entry(quantity)

    assert error.value.field == "quantity"


@pytest.mark.parametrize(
    ("note", "expected"),
    [
        (None, None),
        ("", None),
        ("   ", None),
        ("  NF 1234  ", "NF 1234"),
        pytest.param("x" * 200, "x" * 200, id="200-chars"),
    ],
)
def test_entry_note_is_optional_trimmed_and_blank_becomes_none(note, expected):
    """FR-003: observação opcional, aparada; vazia vira ausência de observação."""
    assert StockChange.entry(1, note).note == expected


def test_entry_rejects_note_longer_than_200_chars():
    """FR-003: observação com mais de 200 caracteres é recusada no campo `note`."""
    with pytest.raises(InvalidDataError) as error:
        StockChange.entry(1, "x" * 201)

    assert error.value.field == "note"


# --- ajuste -----------------------------------------------------------------


@pytest.mark.parametrize(
    "quantity", [-MAX_MOVEMENT_QUANTITY, -2, 1, MAX_MOVEMENT_QUANTITY]
)
def test_adjustment_accepts_signed_quantity(quantity):
    """FR-005: ajuste para mais ou para menos, de 1 a 99.999 unidades."""
    change = StockChange.adjustment(quantity, "Contagem de inventário")

    assert change.kind is MovementKind.ADJUSTMENT
    assert change.quantity == quantity


@pytest.mark.parametrize(
    "quantity", [0, MAX_MOVEMENT_QUANTITY + 1, -MAX_MOVEMENT_QUANTITY - 1, 1.5]
)
def test_adjustment_rejects_zero_or_out_of_range_quantity(quantity):
    """FR-005: ajuste zero ou fora da faixa é recusado no campo `quantity`."""
    with pytest.raises(InvalidDataError) as error:
        StockChange.adjustment(quantity, "Avaria")

    assert error.value.field == "quantity"


@pytest.mark.parametrize(
    ("reason", "expected"),
    [
        ("Avaria no transporte", "Avaria no transporte"),
        ("  Vencimento  ", "Vencimento"),
        ("abc", "abc"),
        pytest.param("x" * 200, "x" * 200, id="200-chars"),
    ],
)
def test_adjustment_reason_is_trimmed(reason, expected):
    """FR-005: motivo de 3 a 200 caracteres, sem contar espaços nas pontas."""
    assert StockChange.adjustment(-1, reason).note == expected


@pytest.mark.parametrize(
    "reason",
    ["", "   ", "ok", "  ok  ", pytest.param("x" * 201, id="201-chars")],
)
def test_adjustment_rejects_missing_short_or_long_reason(reason):
    """FR-005: motivo obrigatório, de 3 a 200 caracteres, recusado no campo `reason`."""
    with pytest.raises(InvalidDataError) as error:
        StockChange.adjustment(-1, reason)

    assert error.value.field == "reason"


def test_stock_change_is_immutable():
    """D3: o pedido de movimentação não muda depois de validado."""
    change = StockChange.entry(1)

    with pytest.raises(FrozenInstanceError):
        change.quantity = 2  # type: ignore[misc]


# --- aplicar ao saldo -------------------------------------------------------


def test_apply_entry_adds_quantity_and_builds_the_movement():
    """FR-003, FR-007: a entrada soma ao saldo e vira uma movimentação registrada."""
    movement = StockChange.entry(24, "NF 1234").apply(
        PRODUCT_ID, balance=12, sequence=3, at=AT
    )

    assert movement.product_id == PRODUCT_ID
    assert movement.sequence == 3
    assert movement.kind is MovementKind.ENTRY
    assert movement.quantity == 24
    assert movement.balance_after == 36
    assert movement.note == "NF 1234"
    assert movement.occurred_at == AT


def test_apply_generates_uuid_v7_for_each_movement():
    """D3: cada movimentação tem id próprio, UUID v7."""
    change = StockChange.entry(1)

    first = change.apply(PRODUCT_ID, balance=0, sequence=1, at=AT)
    second = change.apply(PRODUCT_ID, balance=1, sequence=2, at=AT)

    assert first.id.version == 7
    assert first.id != second.id


def test_apply_negative_adjustment_subtracts_from_balance():
    """FR-005: retirar 2 de 36 deixa 34."""
    movement = StockChange.adjustment(-2, "Avaria no transporte").apply(
        PRODUCT_ID, balance=36, sequence=4, at=AT
    )

    assert movement.quantity == -2
    assert movement.balance_after == 34


def test_apply_can_take_the_balance_to_exactly_zero():
    """FR-006: retirar tudo é permitido; o saldo chega a zero, não abaixo."""
    movement = StockChange.adjustment(-3, "Perda").apply(
        PRODUCT_ID, balance=3, sequence=2, at=AT
    )

    assert movement.balance_after == 0


def test_apply_rejects_negative_balance_with_the_available_quantity():
    """FR-006: retirar 5 de 3 é recusado e informa o saldo disponível."""
    with pytest.raises(InsufficientStockError) as error:
        StockChange.adjustment(-5, "Perda").apply(
            PRODUCT_ID, balance=3, sequence=2, at=AT
        )

    assert error.value.available == 3


def test_apply_accepts_balance_up_to_the_limit():
    """FR-004: o saldo pode chegar a 999.999 unidades."""
    movement = StockChange.entry(1).apply(
        PRODUCT_ID, balance=MAX_STOCK_QUANTITY - 1, sequence=2, at=AT
    )

    assert movement.balance_after == MAX_STOCK_QUANTITY


def test_apply_rejects_balance_above_the_limit():
    """FR-004: a movimentação que passaria de 999.999 unidades é recusada."""
    with pytest.raises(StockLimitExceededError):
        StockChange.entry(2).apply(
            PRODUCT_ID, balance=MAX_STOCK_QUANTITY - 1, sequence=2, at=AT
        )


# --- baixa por venda (spec 004) -----------------------------------------------


def test_sale_change_takes_the_quantity_out_with_the_sale_number():
    """FR-019 (spec 004): a baixa por venda é negativa e traz o número da venda."""
    change = StockChange.sale(2, 12)

    assert change.kind is MovementKind.SALE
    assert change.quantity == -2
    assert change.note == "Venda nº 12"


@pytest.mark.parametrize("quantity", [0, -1, MAX_MOVEMENT_QUANTITY + 1, True])
def test_sale_change_rejects_quantity_out_of_range(quantity):
    """FR-019 (spec 004): a quantidade vendida é um inteiro positivo."""
    with pytest.raises(InvalidDataError) as error:
        StockChange.sale(quantity, 1)

    assert error.value.field == "quantity"


def test_apply_sale_subtracts_and_refuses_insufficient_stock():
    """FR-015 (spec 004): a baixa segue a regra do saldo nunca negativo."""
    movement = StockChange.sale(2, 7).apply(PRODUCT_ID, balance=10, sequence=5, at=AT)

    assert movement.balance_after == 8
    with pytest.raises(InsufficientStockError) as error:
        StockChange.sale(3, 8).apply(PRODUCT_ID, balance=2, sequence=6, at=AT)
    assert error.value.available == 2


# --- mínimo, falta e situação -----------------------------------------------


@pytest.mark.parametrize("value", [0, 10, 99_999])
def test_normalize_min_stock_accepts_0_to_99999(value):
    """FR-001: estoque mínimo inteiro de 0 a 99.999."""
    assert normalize_min_stock(value) == value


@pytest.mark.parametrize("value", [-1, 100_000, 1.5, "10", True])
def test_normalize_min_stock_rejects_invalid_values(value):
    """FR-001: mínimo negativo, acima de 99.999 ou não inteiro é recusado."""
    with pytest.raises(InvalidDataError) as error:
        normalize_min_stock(value)

    assert error.value.field == "min_stock"


@pytest.mark.parametrize(
    ("quantity", "minimum", "expected"),
    [(4, 10, 6), (10, 10, 0), (12, 10, 0), (0, 0, 0), (0, 5, 5)],
)
def test_shortfall_is_what_is_missing_to_reach_the_minimum(quantity, minimum, expected):
    """FR-013: a falta é a diferença até o mínimo, nunca negativa."""
    assert shortfall(quantity, minimum) == expected


@pytest.mark.parametrize(
    ("quantity", "minimum", "expected"),
    [(4, 10, True), (9, 10, True), (10, 10, False), (11, 10, False), (0, 0, False)],
)
def test_needs_restock_only_below_the_minimum(quantity, minimum, expected):
    """FR-013: para repor é estar abaixo do mínimo; mínimo 0 desliga o alerta."""
    assert needs_restock(quantity, minimum) is expected


@pytest.mark.parametrize(
    ("quantity", "minimum", "expected"),
    [
        (0, 0, StockStatus.OUT_OF_STOCK),
        (0, 10, StockStatus.OUT_OF_STOCK),
        (4, 10, StockStatus.RESTOCK),
        (10, 10, StockStatus.OK),
        (5, 0, StockStatus.OK),
    ],
)
def test_stock_status(quantity, minimum, expected):
    """FR-013, FR-015: sem estoque tem prioridade; depois, para repor; senão, em dia."""
    assert stock_status(quantity, minimum) is expected
