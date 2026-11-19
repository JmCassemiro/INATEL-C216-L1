"""Migrations do Alembic: reproduzem o esquema dos modelos num banco vazio."""

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.runtime.migration import MigrationContext
from sqlalchemy import inspect

from app.infrastructure.database.base import Base
from tests.helpers import alembic_config

APP_TABLES = {"products", "alembic_version"}


def table_names(engine) -> set[str]:
    return set(inspect(engine).get_table_names())


def test_migrations_match_the_orm_models(engine):
    """Depois do `upgrade head`, não sobra diferença entre o banco e os modelos."""
    with engine.connect() as connection:
        differences = compare_metadata(
            MigrationContext.configure(connection), Base.metadata
        )

    assert differences == []


def test_upgrade_head_leaves_only_the_products_table(engine):
    """FR-024 (spec 007): a tabela `items` do laboratório não existe mais no head."""
    assert table_names(engine) == APP_TABLES


def test_dropping_items_can_be_reverted(engine):
    """FR-024 (spec 007): voltar uma migração recria a tabela `items` como era."""
    try:
        with engine.begin() as connection:
            command.downgrade(alembic_config(connection), "-1")
        assert "items" in table_names(engine)
    finally:
        with engine.begin() as connection:
            command.upgrade(alembic_config(connection), "head")

    assert table_names(engine) == APP_TABLES


def test_migrations_can_be_reverted_and_reapplied(engine):
    """O `downgrade` desfaz o esquema, e o `upgrade` o recria do zero."""
    try:
        with engine.begin() as connection:
            command.downgrade(alembic_config(connection), "base")
        assert not {"products", "items"} & table_names(engine)
    finally:
        with engine.begin() as connection:
            command.upgrade(alembic_config(connection), "head")

    assert table_names(engine) == APP_TABLES
