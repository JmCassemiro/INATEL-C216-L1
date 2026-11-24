"""Valores em reais: leitura exata e formato brasileiro.

O preço do produto (`Price`) e o valor de um pagamento (`Payment`) seguem a mesma regra:
`Decimal` exato, maior que zero, com até duas casas e até 999.999,99. `float` é
recusado por não representar centavos com exatidão.
"""

from decimal import Decimal, InvalidOperation

from app.domain.errors import InvalidDataError

CENT = Decimal("0.01")
MAX_AMOUNT = Decimal("999999.99")


def parse_money(amount: Decimal | int | str, *, field: str, label: str) -> Decimal:
    """Lê um valor em reais e o normaliza para duas casas.

    `label` começa as mensagens ("Preço deve ser maior que zero"); `field` vai no erro.
    """
    if isinstance(amount, float):
        raise InvalidDataError(field, f"{label} deve ser informado como valor exato")
    try:
        value = Decimal(amount)
    except InvalidOperation, TypeError, ValueError:
        raise InvalidDataError(field, f"{label} deve ser um número") from None
    if not value.is_finite():
        raise InvalidDataError(field, f"{label} deve ser um número")
    if value <= 0:
        raise InvalidDataError(field, f"{label} deve ser maior que zero")
    if value > MAX_AMOUNT:
        raise InvalidDataError(field, f"{label} deve ser no máximo 999999.99")
    normalized = value.quantize(CENT)
    if normalized != value:
        raise InvalidDataError(field, f"{label} deve ter no máximo duas casas decimais")
    return normalized


def format_brl(amount: Decimal) -> str:
    """Decimal(1234.5) → "R$ 1.234,50"."""
    text = f"{amount.quantize(CENT):,.2f}"
    return "R$ " + text.replace(",", "_").replace(".", ",").replace("_", ".")
