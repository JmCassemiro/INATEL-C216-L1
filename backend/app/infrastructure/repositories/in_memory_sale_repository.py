import builtins
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from app.domain.errors import SaleNotFoundError
from app.domain.sale import Sale, SaleOrder, SalesSummary
from app.domain.stock import StockChange
from app.infrastructure.repositories.in_memory_store import InMemoryStore


class InMemorySaleRepository:
    """Repositório em memória que satisfaz a porta `SaleRepository` (research D5).

    O registro inteiro (conferir a idempotência, ler os produtos, decidir, numerar e
    baixar o estoque) roda sob o lock do store, o mesmo de produtos e estoque: é uma
    operação só, como a transação do banco.
    """

    def __init__(self, store: InMemoryStore) -> None:
        self._store = store

    def register(self, order: SaleOrder, at: datetime) -> tuple[Sale, bool]:
        store = self._store
        with store.lock:
            existing = store.sales.get(order.id)
            if existing is not None:
                return existing, False
            products = {
                line.product_id: store.products[line.product_id]
                for line in order.lines
                if line.product_id in store.products
            }
            sale = order.checkout(products).register(len(store.sales) + 1, at)
            for item in sale.items:
                store.apply_change(
                    store.products[item.product_id],
                    StockChange.sale(item.quantity, sale.number),
                    at,
                )
            store.sales[sale.id] = sale
            return sale, True

    def get(self, sale_id: UUID) -> Sale:
        with self._store.lock:
            sale = self._store.sales.get(sale_id)
        if sale is None:
            raise SaleNotFoundError()
        return sale

    def list(self, offset: int, limit: int) -> tuple[builtins.list[Sale], int]:
        with self._store.lock:
            # As vendas estão em ordem de registro, que é a ordem dos números.
            newest_first = list(reversed(self._store.sales.values()))
        return newest_first[offset : offset + limit], len(newest_first)

    def summary(self, start: datetime, end: datetime) -> SalesSummary:
        with self._store.lock:
            totals = [
                sale.total
                for sale in self._store.sales.values()
                if start <= sale.occurred_at < end
            ]
        return SalesSummary.of(len(totals), sum(totals, start=Decimal(0)))
