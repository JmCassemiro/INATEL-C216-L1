from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

# Nomes de constraints previsíveis: as migrations geradas ficam estáveis entre bancos.
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Base dos modelos ORM; o Alembic compara as migrations com o `metadata` dela."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)
