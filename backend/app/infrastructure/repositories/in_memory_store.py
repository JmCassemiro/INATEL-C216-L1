import threading
from dataclasses import dataclass, field
from uuid import UUID

from app.domain.product import Product
from app.domain.stock import StockMovement


@dataclass
class InMemoryStore:
    """Armazenamento em memória compartilhado pelos repositórios de produto e estoque.

    Os dois repositórios precisam enxergar o mesmo produto (o estoque grava o saldo que
    o catálogo lê) e usar o mesmo lock, para que ler e gravar o saldo seja uma operação
    só também aqui (spec 011, research D6). Guarda todos os produtos, inclusive
    removidos, em ordem de cadastro.
    """

    products: dict[UUID, Product] = field(default_factory=dict)
    ids_by_gtin14: dict[str, UUID] = field(default_factory=dict)
    movements: dict[UUID, list[StockMovement]] = field(default_factory=dict)
    lock: threading.Lock = field(default_factory=threading.Lock)

    def active(self, product_id: UUID) -> Product | None:
        """Produto ativo com esse id, ou `None`. Chame com o lock adquirido."""
        product = self.products.get(product_id)
        return product if product is not None and product.is_active else None
