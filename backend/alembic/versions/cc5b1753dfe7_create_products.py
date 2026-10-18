"""create products: tabela do cadastro de produtos (spec 002).

Revision ID: cc5b1753dfe7
Revises:
Create Date: 2026-10-16 20:27:38.468060

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "cc5b1753dfe7"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "products",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("name_search", sa.Text(), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("barcode", sa.String(length=14), nullable=False),
        sa.Column("gtin14", sa.String(length=14), nullable=False),
        sa.Column("price", sa.Numeric(precision=8, scale=2), nullable=False),
        sa.Column("removed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_products")),
        sa.UniqueConstraint("gtin14", name=op.f("uq_products_gtin14")),
    )


def downgrade() -> None:
    op.drop_table("products")
