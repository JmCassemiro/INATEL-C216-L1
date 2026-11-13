"""Utilitários compartilhados pelos testes."""

from pathlib import Path

from alembic.config import Config
from sqlalchemy import Connection

ALEMBIC_INI = Path(__file__).resolve().parents[1] / "alembic.ini"


def gtin13(number: int) -> str:
    """Gera um EAN-13 válido a partir de um número, para montar catálogos grandes."""
    body = f"789{number:09d}"
    weighted_sum = sum(
        int(digit) * (3 if position % 2 == 0 else 1)
        for position, digit in enumerate(reversed(body))
    )
    return body + str((10 - weighted_sum % 10) % 10)


def alembic_config(connection: Connection) -> Config:
    """Configuração do Alembic que roda as migrations nessa conexão."""
    config = Config(ALEMBIC_INI)
    config.attributes["connection"] = connection
    return config
