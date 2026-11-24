import builtins
from dataclasses import replace
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from app.domain.errors import ProductNotFoundError
from app.domain.price import CENT
from app.domain.stock import StockChange, StockMovement, StockSummary
from app.infrastructure.repositories.in_memory_store import InMemoryStore


class InMemoryStockRepository:
    """Repositório em memória que satisfaz a porta `StockRepository` (research D6).

    Ler o saldo, aplicar a regra do domínio e gravar acontecem sob o lock do store,
    o mesmo do repositório de produtos: nenhuma movimentação simultânea se perde (D4).
    """

    def __init__(self, store: InMemoryStore) -> None:
        self._store = store

    def record(
        self, product_id: UUID, change: StockChange, at: datetime
    ) -> StockMovement:
        store = self._store
        with store.lock:
            product = store.active(product_id)
            if product is None:
                raise ProductNotFoundError()
            history = store.movements.setdefault(product_id, [])
            movement = change.apply(
                product_id,
                balance=product.stock_quantity,
                sequence=len(history) + 1,
                at=at,
            )
            store.products[product_id] = replace(
                product, stock_quantity=movement.balance_after
            )
            history.append(movement)
            return movement

    def movements(
        self, product_id: UUID, offset: int, limit: int
    ) -> tuple[builtins.list[StockMovement], int]:
        store = self._store
        with store.lock:
            if store.active(product_id) is None:
                raise ProductNotFoundError()
            newest_first = list(reversed(store.movements.get(product_id, [])))
        return newest_first[offset : offset + limit], len(newest_first)

    def summary(self) -> StockSummary:
        with self._store.lock:
            active = [p for p in self._store.products.values() if p.is_active]
        value = sum(
            (p.price.value * p.stock_quantity for p in active), start=Decimal(0)
        )
        return StockSummary(
            restock_count=sum(1 for p in active if p.needs_restock),
            out_of_stock_count=sum(1 for p in active if p.stock_quantity == 0),
            stock_value=value.quantize(CENT),
        )
