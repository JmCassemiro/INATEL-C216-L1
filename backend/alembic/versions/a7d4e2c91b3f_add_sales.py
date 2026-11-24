"""add sales: vendas, itens, pagamentos e a baixa por venda no histórico (spec 004).

`sales.number` é a chave autoincremental (o número legível da venda) e `sales.id`, o
UUID criado pelo caixa, único. O `CHECK` de tipo de `stock_movements` passa a aceitar
`sale`; ele é recriado em modo batch porque o SQLite (usado nos testes) não altera um
`CHECK` com `ALTER TABLE`. Ao reverter, as baixas por venda viram ajustes (o texto
"Venda nº …" fica como motivo), para que o histórico continue explicando o saldo.

Revision ID: a7d4e2c91b3f
Revises: 330c84df2ee3
Create Date: 2026-11-24 23:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a7d4e2c91b3f"
down_revision: str | Sequence[str] | None = "330c84df2ee3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "sales",
        sa.Column("number", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("total", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("paid", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("change", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.CheckConstraint("total > 0", name=op.f("ck_sales_total_positive")),
        sa.CheckConstraint("paid >= total", name=op.f("ck_sales_paid_covers_total")),
        sa.CheckConstraint("change >= 0", name=op.f("ck_sales_change_not_negative")),
        sa.PrimaryKeyConstraint("number", name=op.f("pk_sales")),
        sa.UniqueConstraint("id", name=op.f("uq_sales_id")),
    )
    op.create_table(
        "sale_items",
        sa.Column("sale_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), autoincrement=False, nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("barcode", sa.String(length=14), nullable=False),
        sa.Column("unit_price", sa.Numeric(precision=8, scale=2), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("subtotal", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.CheckConstraint(
            "quantity BETWEEN 1 AND 999", name=op.f("ck_sale_items_quantity_range")
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            name=op.f("fk_sale_items_product_id_products"),
        ),
        sa.ForeignKeyConstraint(
            ["sale_id"], ["sales.id"], name=op.f("fk_sale_items_sale_id_sales")
        ),
        sa.PrimaryKeyConstraint("sale_id", "position", name=op.f("pk_sale_items")),
    )
    op.create_table(
        "sale_payments",
        sa.Column("sale_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), autoincrement=False, nullable=False),
        sa.Column("method", sa.String(length=16), nullable=False),
        sa.Column("amount", sa.Numeric(precision=8, scale=2), nullable=False),
        sa.CheckConstraint(
            "method IN ('cash', 'pix', 'credit_card', 'debit_card')",
            name=op.f("ck_sale_payments_method"),
        ),
        sa.CheckConstraint("amount > 0", name=op.f("ck_sale_payments_amount_positive")),
        sa.ForeignKeyConstraint(
            ["sale_id"], ["sales.id"], name=op.f("fk_sale_payments_sale_id_sales")
        ),
        sa.PrimaryKeyConstraint("sale_id", "position", name=op.f("pk_sale_payments")),
    )
    with op.batch_alter_table("stock_movements") as batch_op:
        batch_op.drop_constraint(op.f("ck_stock_movements_kind"), type_="check")
        batch_op.create_check_constraint(
            op.f("ck_stock_movements_kind"),
            "kind IN ('entry', 'adjustment', 'sale')",
        )


def downgrade() -> None:
    op.execute("UPDATE stock_movements SET kind = 'adjustment' WHERE kind = 'sale'")
    with op.batch_alter_table("stock_movements") as batch_op:
        batch_op.drop_constraint(op.f("ck_stock_movements_kind"), type_="check")
        batch_op.create_check_constraint(
            op.f("ck_stock_movements_kind"), "kind IN ('entry', 'adjustment')"
        )
    op.drop_table("sale_payments")
    op.drop_table("sale_items")
    op.drop_table("sales")
