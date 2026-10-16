from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

from app.domain.errors import InvalidDataError

CENT = Decimal("0.01")
MAX_PRICE = Decimal("999999.99")


@dataclass(frozen=True, slots=True, init=False)
class Price:
    """Preço de venda em reais (FR-003, D5).

    Valor exato em `Decimal`, maior que zero, com no máximo duas casas, até 999.999,99,
    sempre normalizado para duas casas. `float` é recusado por não representar centavos
    com exatidão.
    """

    value: Decimal

    def __init__(self, value: Decimal | int | str) -> None:
        # O construtor aceita mais tipos do que o campo guarda: converte e normaliza.
        object.__setattr__(self, "value", _parse(value))


def _parse(amount: Decimal | int | str) -> Decimal:
    if isinstance(amount, float):
        raise InvalidDataError("price", "Preço deve ser informado como valor exato")
    try:
        value = Decimal(amount)
    except InvalidOperation, TypeError, ValueError:
        raise InvalidDataError("price", "Preço deve ser um número") from None
    if not value.is_finite():
        raise InvalidDataError("price", "Preço deve ser um número")
    if value <= 0:
        raise InvalidDataError("price", "Preço deve ser maior que zero")
    if value > MAX_PRICE:
        raise InvalidDataError("price", "Preço deve ser no máximo 999999.99")
    normalized = value.quantize(CENT)
    if normalized != value:
        raise InvalidDataError("price", "Preço deve ter no máximo duas casas decimais")
    return normalized
