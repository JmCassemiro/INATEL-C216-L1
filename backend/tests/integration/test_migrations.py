"""Migrations do Alembic: reproduzem o esquema dos modelos num banco vazio."""

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.runtime.migration import MigrationContext
from sqlalchemy import inspect

from app.infrastructure.database.base import Base
from tests.helpers import alembic_config

SALE_TABLES = {"sales", "sale_items", "sale_payments"}
APP_TABLES = {"products", "stock_movements", "alembic_version"} | SALE_TABLES
DROP_ITEMS_PARENT = "4f1e2a7c9b3d"
"""Revisão anterior à que apaga `items` (spec 007)."""
ADD_STOCK_PARENT = "799308dbf8c8"
"""Revisão anterior à que cria o estoque (spec 011)."""


def table_names(engine) -> set[str]:
    return set(inspect(engine).get_table_names())


def test_migrations_match_the_orm_models(engine):
    """Depois do `upgrade head`, não sobra diferença entre o banco e os modelos."""
    with engine.connect() as connection:
        differences = compare_metadata(
            MigrationContext.configure(connection), Base.metadata
        )

    assert differences == []


def test_upgrade_head_creates_only_the_app_tables(engine):
    """FR-024 (spec 007), RP-003 (spec 011): produtos e movimentações; sem `items`."""
    assert table_names(engine) == APP_TABLES


def test_dropping_items_can_be_reverted(engine):
    """FR-024 (spec 007): voltar uma migração recria a tabela `items` como era."""
    try:
        with engine.begin() as connection:
            command.downgrade(alembic_config(connection), DROP_ITEMS_PARENT)
        assert "items" in table_names(engine)
    finally:
        with engine.begin() as connection:
            command.upgrade(alembic_config(connection), "head")

    assert table_names(engine) == APP_TABLES


def column_names(engine, table: str) -> set[str]:
    return {column["name"] for column in inspect(engine).get_columns(table)}


def test_upgrade_head_adds_stock_columns_to_products(engine):
    """RP-003 (spec 011): saldo e mínimo viram colunas de `products`."""
    assert {"stock_quantity", "min_stock"} <= column_names(engine, "products")


def test_stock_migration_can_be_reverted(engine):
    """RP-003 (spec 011): voltar a migração apaga a tabela e as colunas novas."""
    try:
        with engine.begin() as connection:
            command.downgrade(alembic_config(connection), ADD_STOCK_PARENT)
        assert "stock_movements" not in table_names(engine)
        assert not {"stock_quantity", "min_stock"} & column_names(engine, "products")
    finally:
        with engine.begin() as connection:
            command.upgrade(alembic_config(connection), "head")

    assert table_names(engine) == APP_TABLES


def movement_kind_check(engine) -> str:
    """Texto do `CHECK` de tipo de `stock_movements`."""
    (check,) = [
        constraint["sqltext"]
        for constraint in inspect(engine).get_check_constraints("stock_movements")
        if constraint["name"] == "ck_stock_movements_kind"
    ]
    return check


def test_upgrade_head_accepts_sale_movements(engine):
    """RP-003, FR-019 (spec 004): o histórico aceita a baixa por venda."""
    assert "'sale'" in movement_kind_check(engine)


def test_sales_migration_can_be_reverted(engine):
    """RP-003 (spec 004): voltar a migração apaga as vendas e o tipo `sale`."""
    try:
        with engine.begin() as connection:
            command.downgrade(alembic_config(connection), "-1")
        assert not SALE_TABLES & table_names(engine)
        assert "'sale'" not in movement_kind_check(engine)
        assert "'adjustment'" in movement_kind_check(engine)
    finally:
        with engine.begin() as connection:
            command.upgrade(alembic_config(connection), "head")

    assert table_names(engine) == APP_TABLES


def test_migrations_can_be_reverted_and_reapplied(engine):
    """O `downgrade` desfaz o esquema, e o `upgrade` o recria do zero."""
    try:
        with engine.begin() as connection:
            command.downgrade(alembic_config(connection), "base")
        assert not {"products", "items", "stock_movements"} & table_names(engine)
        assert not SALE_TABLES & table_names(engine)
    finally:
        with engine.begin() as connection:
            command.upgrade(alembic_config(connection), "head")

    assert table_names(engine) == APP_TABLES
