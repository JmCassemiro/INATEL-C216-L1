"""Gravação de uma movimentação no banco, com a linha do produto já bloqueada.

Usada pelo repositório de estoque (entrada e ajuste) e pelo de vendas (baixa por
venda), para que as duas gravem saldo e histórico do mesmo jeito (spec 004, research
D8). Quem chama abre a transação, bloqueia o produto (`SELECT … FOR UPDATE`), passa o
saldo lido e confirma no final.
"""

from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.domain.stock import StockChange, StockMovement
from app.infrastructure.models.product import ProductModel
from app.infrastructure.models.stock_movement import StockMovementModel


def apply_stock_change(
    session: Session,
    product_id: UUID,
    balance: int,
    change: StockChange,
    at: datetime,
) -> StockMovement:
    """Aplica a mudança ao saldo bloqueado e grava saldo e movimentação (sem confirmar).

    O número da movimentação é `max(sequence) + 1` do produto, calculado sob o
    bloqueio (spec 011, research D5). Os erros do domínio sobem sem gravar nada.
    """
    last_sequence = session.scalar(
        select(func.max(StockMovementModel.sequence)).where(
            StockMovementModel.product_id == product_id
        )
    )
    movement = change.apply(
        product_id, balance=balance, sequence=(last_sequence or 0) + 1, at=at
    )
    session.execute(
        update(ProductModel)
        .where(ProductModel.id == product_id)
        .values(stock_quantity=movement.balance_after)
    )
    session.add(StockMovementModel.from_entity(movement))
    return movement
