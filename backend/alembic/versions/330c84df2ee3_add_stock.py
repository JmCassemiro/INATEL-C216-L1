"""add stock: saldo e mínimo em `products` e o histórico `stock_movements` (spec 011).

Produtos já existentes ficam com saldo 0 e mínimo 0, sem movimentações. As colunas
entram em modo batch porque o SQLite (usado nos testes) não acrescenta `CHECK` a uma
tabela existente com `ALTER TABLE`; no PostgreSQL, o batch vira `ALTER TABLE` comum.

Revision ID: 330c84df2ee3
Revises: 799308dbf8c8
Create Date: 2026-11-24 19:10:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "330c84df2ee3"
down_revision: str | Sequence[str] | None = "799308dbf8c8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("products") as batch_op:
        batch_op.add_column(
            sa.Column("min_stock", sa.Integer(), server_default="0", nullable=False)
        )
        batch_op.add_column(
            sa.Column(
                "stock_quantity", sa.Integer(), server_default="0", nullable=False
            )
        )
        batch_op.create_check_constraint(
            op.f("ck_products_stock_quantity_range"),
            "stock_quantity BETWEEN 0 AND 999999",
        )
        batch_op.create_check_constraint(
            op.f("ck_products_min_stock_range"), "min_stock BETWEEN 0 AND 99999"
        )

    op.create_table(
        "stock_movements",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("balance_after", sa.Integer(), nullable=False),
        sa.Column("note", sa.String(length=200), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "kind IN ('entry', 'adjustment')", name=op.f("ck_stock_movements_kind")
        ),
        sa.CheckConstraint(
            "quantity <> 0", name=op.f("ck_stock_movements_quantity_not_zero")
        ),
        sa.CheckConstraint(
            "balance_after >= 0", name=op.f("ck_stock_movements_balance_not_negative")
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            name=op.f("fk_stock_movements_product_id_products"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_stock_movements")),
        sa.UniqueConstraint(
            "product_id", "sequence", name=op.f("uq_stock_movements_product_id")
        ),
    )


def downgrade() -> None:
    op.drop_table("stock_movements")
    with op.batch_alter_table("products") as batch_op:
        batch_op.drop_constraint(op.f("ck_products_min_stock_range"), type_="check")
        batch_op.drop_constraint(
            op.f("ck_products_stock_quantity_range"), type_="check"
        )
        batch_op.drop_column("stock_quantity")
        batch_op.drop_column("min_stock")
