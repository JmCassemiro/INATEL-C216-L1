"""drop items

Remove a tabela do laboratório de itens (Prática 7), substituído pelo painel de
produtos na spec 007. A migração que criou a tabela continua no histórico, para que
bancos já existentes e bancos novos cheguem ao mesmo estado.

Revision ID: 799308dbf8c8
Revises: 4f1e2a7c9b3d
Create Date: 2026-11-19 01:37:05.028692

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "799308dbf8c8"
down_revision: str | Sequence[str] | None = "4f1e2a7c9b3d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_table("items")


def downgrade() -> None:
    """Recria a tabela exatamente como a migração 4f1e2a7c9b3d a criou."""
    op.create_table(
        "items",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_items")),
        sa.UniqueConstraint("name", name=op.f("uq_items_name")),
    )
