"""create items: tabela do gerenciador de itens (Prática 7).

Revision ID: 4f1e2a7c9b3d
Revises: cc5b1753dfe7
Create Date: 2026-11-13 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "4f1e2a7c9b3d"
down_revision: str | Sequence[str] | None = "cc5b1753dfe7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "items",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_items")),
        sa.UniqueConstraint("name", name=op.f("uq_items_name")),
    )


def downgrade() -> None:
    op.drop_table("items")
