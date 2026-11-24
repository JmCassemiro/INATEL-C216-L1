import builtins
from dataclasses import replace
from uuid import UUID

from app.application.commands import ProductOrder
from app.domain.barcode import Barcode
from app.domain.errors import DuplicateBarcodeError, ProductNotFoundError
from app.domain.product import Product
from app.infrastructure.repositories.in_memory_store import InMemoryStore
from app.infrastructure.repositories.search import searchable


class InMemoryProductRepository:
    """Repositório em memória que satisfaz a porta `ProductRepository` (D9).

    Usa um `InMemoryStore`, que pode ser compartilhado com o repositório de estoque.
    Todas as operações rodam sob o lock do store: as rotas síncronas do FastAPI rodam
    em threads, e verificar e gravar precisam ser uma operação só.
    """

    def __init__(self, store: InMemoryStore | None = None) -> None:
        self._store = store or InMemoryStore()

    def add(self, product: Product) -> None:
        store = self._store
        with store.lock:
            if product.barcode.gtin14 in store.ids_by_gtin14:
                raise DuplicateBarcodeError()
            store.products[product.id] = product
            store.ids_by_gtin14[product.barcode.gtin14] = product.id

    def update(self, product: Product) -> None:
        store = self._store
        with store.lock:
            current = store.active(product.id)
            if current is None:
                raise ProductNotFoundError()
            owner_id = store.ids_by_gtin14.get(product.barcode.gtin14)
            if owner_id is not None and owner_id != product.id:
                raise DuplicateBarcodeError()
            del store.ids_by_gtin14[current.barcode.gtin14]
            store.ids_by_gtin14[product.barcode.gtin14] = product.id
            # O saldo guardado prevalece: só o estoque o grava (spec 011, D2).
            store.products[product.id] = replace(
                product, stock_quantity=current.stock_quantity
            )

    def get_by_id(self, product_id: UUID) -> Product | None:
        with self._store.lock:
            return self._store.active(product_id)

    def get_by_barcode(self, barcode: Barcode) -> Product | None:
        store = self._store
        with store.lock:
            product_id = store.ids_by_gtin14.get(barcode.gtin14)
            return None if product_id is None else store.active(product_id)

    def list(
        self,
        offset: int,
        limit: int,
        name: str | None,
        *,
        restock_only: bool = False,
        order: ProductOrder = ProductOrder.NEWEST,
    ) -> tuple[builtins.list[Product], int]:
        search = searchable(name or "")
        with self._store.lock:
            # O dicionário guarda a ordem de inserção (e a atualização mantém a
            # posição); invertido, o produto cadastrado por último vem primeiro.
            matches = [
                product
                for product in reversed(self._store.products.values())
                if product.is_active
                and search in searchable(product.name)
                and (product.needs_restock or not restock_only)
            ]
        match order:
            case ProductOrder.NAME:
                matches.sort(key=lambda p: (searchable(p.name), p.id))
            case ProductOrder.SHORTFALL:
                matches.sort(key=lambda p: (-p.shortfall, searchable(p.name), p.id))
            case ProductOrder.NEWEST:
                pass
        return matches[offset : offset + limit], len(matches)
