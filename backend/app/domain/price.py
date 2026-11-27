from dataclasses import dataclass
from decimal import Decimal

from app.domain.money import parse_money


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
        object.__setattr__(
            self, "value", parse_money(value, field="price", label="Preço")
        )
