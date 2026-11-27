import builtins
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.domain.errors import SaleNotFoundError
from app.domain.product import Product
from app.domain.sale import Sale, SaleOrder, SalesSummary
from app.domain.stock import StockChange
from app.infrastructure.models.product import ProductModel
from app.infrastructure.models.sale import SaleModel
from app.infrastructure.repositories.stock_ledger import apply_stock_change


class SqlAlchemySaleRepository:
    """Repositório no banco relacional que satisfaz a porta `SaleRepository`.

    `register` é uma transação só (spec 004, research D5 e D6):

    1. Se a venda já existe (mesmo id), devolve-a sem mudar nada.
    2. `SELECT … FOR UPDATE` bloqueia as linhas dos produtos da venda **em ordem de
       id**, inclusive removidos. Duas vendas com produtos em comum pedem os bloqueios
       na mesma ordem: uma espera a outra, sem impasse.
    3. Confere de novo a venda: outra requisição com o mesmo id pode ter terminado
       enquanto esta esperava.
    4. O domínio (`SaleOrder.checkout`) decide ou recusa.
    5. A venda é inserida e o `flush` traz o número dado pelo banco (D4); cada item
       baixa o saldo com `apply_stock_change`, o mesmo das entradas e ajustes.
    6. A transação é confirmada. Qualquer erro desfaz tudo e libera os bloqueios; a
       única de `sales.id` cobre o caso raro de duas requisições iguais em paralelo.

    No SQLite (só nos testes), `FOR UPDATE` é ignorado; os testes de concorrência
    rodam no PostgreSQL.
    """

    def __init__(self, session: Session) -> None:
        self._session = session

    def register(self, order: SaleOrder, at: datetime) -> tuple[Sale, bool]:
        session = self._session
        existing = self._find(order.id)
        if existing is not None:
            return existing.to_entity(), False
        try:
            products = self._lock_products(order)
            existing = self._find(order.id)
            if existing is not None:
                sale = existing.to_entity()
                session.rollback()
                return sale, False
            checkout = order.checkout(products)
            model = SaleModel.from_checkout(checkout, at)
            session.add(model)
            session.flush()
            sale = checkout.register(model.number, at)
            for item in sale.items:
                apply_stock_change(
                    session,
                    item.product_id,
                    products[item.product_id].stock_quantity,
                    StockChange.sale(item.quantity, sale.number),
                    at,
                )
            session.commit()
        except IntegrityError:
            session.rollback()
            existing = self._find(order.id)
            if existing is None:
                raise
            return existing.to_entity(), False
        except BaseException:
            session.rollback()
            raise
        return sale, True

    def get(self, sale_id: UUID) -> Sale:
        model = self._find(sale_id)
        if model is None:
            raise SaleNotFoundError()
        return model.to_entity()

    def list(self, offset: int, limit: int) -> tuple[builtins.list[Sale], int]:
        session = self._session
        total = session.scalar(select(func.count()).select_from(SaleModel))
        models = session.scalars(
            select(SaleModel)
            .order_by(SaleModel.number.desc())
            .offset(offset)
            .limit(limit)
        )
        return [model.to_entity() for model in models], total or 0

    def summary(self, start: datetime, end: datetime) -> SalesSummary:
        # O SQLite guarda a data sem fuso (sempre em UTC): os limites vão em UTC.
        start, end = start.astimezone(UTC), end.astimezone(UTC)
        count, revenue = self._session.execute(
            select(func.count(), func.sum(SaleModel.total)).where(
                SaleModel.occurred_at >= start, SaleModel.occurred_at < end
            )
        ).one()
        # No SQLite a soma volta como ponto flutuante: `str` antes de `Decimal`.
        return SalesSummary.of(count, Decimal(str(revenue or 0)))

    def _find(self, sale_id: UUID) -> SaleModel | None:
        return self._session.scalar(select(SaleModel).where(SaleModel.id == sale_id))

    def _lock_products(self, order: SaleOrder) -> dict[UUID, Product]:
        ids = sorted({line.product_id for line in order.lines})
        rows = self._session.scalars(
            select(ProductModel)
            .where(ProductModel.id.in_(ids))
            .order_by(ProductModel.id)
            .with_for_update()
            # Relê a linha mesmo que a sessão já a conheça: o saldo vale o do bloqueio.
            .execution_options(populate_existing=True)
        )
        return {row.id: row.to_entity() for row in rows}
