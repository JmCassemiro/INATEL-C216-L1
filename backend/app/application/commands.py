"""Comandos de entrada da camada de aplicação (sem Pydantic)."""

from dataclasses import dataclass, fields
from decimal import Decimal
from enum import Enum
from typing import Literal


class _Unset(Enum):
    UNSET = "UNSET"


UNSET = _Unset.UNSET
"""Campo não enviado: diferente de `None`, que é um valor (só a descrição o aceita)."""

type Unset = Literal[_Unset.UNSET]


@dataclass(frozen=True, slots=True)
class ProductData:
    """Cadastro completo de um produto: usado para cadastrar e substituir."""

    name: str
    description: str | None
    barcode: str
    price: Decimal


@dataclass(frozen=True, slots=True)
class ProductChanges:
    """Alteração parcial: só os campos diferentes de `UNSET` mudam."""

    name: str | Unset = UNSET
    description: str | None | Unset = UNSET
    barcode: str | Unset = UNSET
    price: Decimal | Unset = UNSET

    def is_empty(self) -> bool:
        return all(getattr(self, field.name) is UNSET for field in fields(self))
