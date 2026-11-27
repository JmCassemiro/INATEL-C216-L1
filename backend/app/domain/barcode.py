from dataclasses import dataclass

from app.domain.errors import InvalidDataError

GTIN_LENGTHS = frozenset({8, 12, 13, 14})
GTIN14_LENGTH = 14


@dataclass(frozen=True, slots=True)
class Barcode:
    """Código GTIN de um produto (FR-004, D6).

    Guarda o código como foi informado; dois códigos são o mesmo GTIN quando a forma de
    14 dígitos (`gtin14`) é igual.
    """

    value: str

    def __post_init__(self) -> None:
        if not _is_gtin(self.value):
            raise InvalidDataError(
                "barcode",
                "Código de barras inválido: informe um GTIN de 8, 12, 13 ou 14 "
                "dígitos com dígito verificador correto",
            )

    @property
    def gtin14(self) -> str:
        return self.value.zfill(GTIN14_LENGTH)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Barcode):
            return NotImplemented
        return self.gtin14 == other.gtin14

    def __hash__(self) -> int:
        return hash(self.gtin14)


def _is_gtin(code: str) -> bool:
    if not (code.isascii() and code.isdigit() and len(code) in GTIN_LENGTHS):
        return False
    *body, check_digit = map(int, code)
    return _check_digit(body) == check_digit


def _check_digit(body: list[int]) -> int:
    """Dígito verificador módulo 10 do GS1: pesos 3 e 1 a partir da direita."""
    weighted_sum = sum(
        digit * (3 if position % 2 == 0 else 1)
        for position, digit in enumerate(reversed(body))
    )
    return (10 - weighted_sum % 10) % 10
