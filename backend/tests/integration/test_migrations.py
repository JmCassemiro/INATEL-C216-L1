"""Migrations do Alembic: reproduzem o esquema dos modelos num banco vazio."""

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.runtime.migration import MigrationContext
from sqlalchemy import inspect

from app.infrastructure.database.base import Base
from tests.helpers import alembic_config


def test_migrations_match_the_orm_models(engine):
    """Depois do `upgrade head`, não sobra diferença entre o banco e os modelos."""
    with engine.connect() as connection:
        differences = compare_metadata(
            MigrationContext.configure(connection), Base.metadata
        )

    assert differences == []


def test_migrations_can_be_reverted_and_reapplied(engine):
    """O `downgrade` desfaz o esquema, e o `upgrade` o recria do zero."""
    try:
        with engine.begin() as connection:
            command.downgrade(alembic_config(connection), "base")
        assert "products" not in inspect(engine).get_table_names()
    finally:
        with engine.begin() as connection:
            command.upgrade(alembic_config(connection), "head")

    assert "products" in inspect(engine).get_table_names()
