import threading
from dataclasses import dataclass, field, replace
from datetime import datetime
from uuid import UUID

from app.domain.product import Product
from app.domain.sale import Sale
from app.domain.stock import StockChange, StockMovement


@dataclass
class InMemoryStore:
    """Armazenamento em memória compartilhado pelos repositórios de produto, estoque e
    vendas.

    Os repositórios precisam enxergar o mesmo produto (o estoque e a venda gravam o
    saldo que o catálogo lê) e usar o mesmo lock, para que ler e gravar o saldo seja uma
    operação só também aqui (spec 011, research D6; spec 004, research D5). Guarda
    todos os produtos, inclusive removidos, em ordem de cadastro, e as vendas em ordem
    de registro.
    """

    products: dict[UUID, Product] = field(default_factory=dict)
    ids_by_gtin14: dict[str, UUID] = field(default_factory=dict)
    movements: dict[UUID, list[StockMovement]] = field(default_factory=dict)
    sales: dict[UUID, Sale] = field(default_factory=dict)
    lock: threading.Lock = field(default_factory=threading.Lock)

    def active(self, product_id: UUID) -> Product | None:
        """Produto ativo com esse id, ou `None`. Chame com o lock adquirido."""
        product = self.products.get(product_id)
        return product if product is not None and product.is_active else None

    def apply_change(
        self, product: Product, change: StockChange, at: datetime
    ) -> StockMovement:
        """Aplica a mudança ao saldo do produto e grava a movimentação.

        Chame com o lock adquirido; os erros do domínio sobem sem gravar nada.
        """
        history = self.movements.setdefault(product.id, [])
        movement = change.apply(
            product.id,
            balance=product.stock_quantity,
            sequence=len(history) + 1,
            at=at,
        )
        self.products[product.id] = replace(
            product, stock_quantity=movement.balance_after
        )
        history.append(movement)
        return movement
