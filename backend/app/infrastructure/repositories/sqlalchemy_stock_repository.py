import builtins
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.domain.errors import ProductNotFoundError
from app.domain.money import CENT
from app.domain.stock import StockChange, StockMovement, StockSummary
from app.infrastructure.models.product import ProductModel
from app.infrastructure.models.stock_movement import StockMovementModel

_ACTIVE = ProductModel.removed_at.is_(None)


class SqlAlchemyStockRepository:
    """Repositório no banco relacional que satisfaz a porta `StockRepository` (D6).

    `record` é uma transação só (research D4):

    1. `SELECT … FOR UPDATE` bloqueia a linha do produto ativo. Outra movimentação no
       mesmo produto espera aqui até esta terminar, e então lê o saldo já atualizado;
       produtos diferentes não se bloqueiam.
    2. O próximo número da movimentação é `max(sequence) + 1`, calculado sob o bloqueio
       (D5).
    3. O domínio (`StockChange.apply`) decide: devolve a movimentação ou recusa.
    4. O novo saldo e a movimentação são gravados e confirmados juntos.

    Qualquer erro desfaz a transação e libera o bloqueio. No SQLite (só nos testes), o
    `FOR UPDATE` é ignorado; o teste de concorrência roda no PostgreSQL.
    """

    def __init__(self, session: Session) -> None:
        self._session = session

    def record(
        self, product_id: UUID, change: StockChange, at: datetime
    ) -> StockMovement:
        session = self._session
        try:
            balance = session.scalar(
                select(ProductModel.stock_quantity)
                .where(ProductModel.id == product_id, _ACTIVE)
                .with_for_update()
            )
            if balance is None:
                raise ProductNotFoundError()
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
            session.commit()
        except BaseException:
            session.rollback()
            raise
        return movement

    def movements(
        self, product_id: UUID, offset: int, limit: int
    ) -> tuple[builtins.list[StockMovement], int]:
        session = self._session
        exists = session.scalar(
            select(ProductModel.id).where(ProductModel.id == product_id, _ACTIVE)
        )
        if exists is None:
            raise ProductNotFoundError()
        of_product = StockMovementModel.product_id == product_id
        total = session.scalar(
            select(func.count()).select_from(StockMovementModel).where(of_product)
        )
        models = session.scalars(
            select(StockMovementModel)
            .where(of_product)
            .order_by(StockMovementModel.sequence.desc())
            .offset(offset)
            .limit(limit)
        )
        return [model.to_entity() for model in models], total or 0

    def summary(self) -> StockSummary:
        restock = ProductModel.stock_quantity < ProductModel.min_stock
        out_of_stock = ProductModel.stock_quantity == 0
        row = self._session.execute(
            select(
                func.count().filter(restock),
                func.count().filter(out_of_stock),
                func.sum(ProductModel.stock_quantity * ProductModel.price),
            ).where(_ACTIVE)
        ).one()
        restock_count, out_of_stock_count, value = row
        # No SQLite o produto volta como número de ponto flutuante: `str` antes de
        # `Decimal` evita levar o erro de arredondamento para os centavos.
        return StockSummary(
            restock_count=restock_count or 0,
            out_of_stock_count=out_of_stock_count or 0,
            stock_value=Decimal(str(value or 0)).quantize(CENT),
        )
