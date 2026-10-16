import builtins
import threading
import unicodedata
from uuid import UUID

from app.domain.barcode import Barcode
from app.domain.errors import DuplicateBarcodeError, ProductNotFoundError
from app.domain.product import Product


class InMemoryProductRepository:
    """Repositório em memória que satisfaz a porta `ProductRepository` (D9).

    Guarda todos os produtos, inclusive removidos, em ordem de cadastro, com um índice
    por `gtin14`. Todas as operações rodam sob um lock: as rotas síncronas do FastAPI
    rodam em threads, e verificar e gravar precisam ser uma operação só.
    """

    def __init__(self) -> None:
        self._products: dict[UUID, Product] = {}
        self._ids_by_gtin14: dict[str, UUID] = {}
        self._lock = threading.Lock()

    def add(self, product: Product) -> None:
        with self._lock:
            if product.barcode.gtin14 in self._ids_by_gtin14:
                raise DuplicateBarcodeError()
            self._products[product.id] = product
            self._ids_by_gtin14[product.barcode.gtin14] = product.id

    def update(self, product: Product) -> None:
        with self._lock:
            current = self._products.get(product.id)
            if current is None or not current.is_active:
                raise ProductNotFoundError()
            owner_id = self._ids_by_gtin14.get(product.barcode.gtin14)
            if owner_id is not None and owner_id != product.id:
                raise DuplicateBarcodeError()
            del self._ids_by_gtin14[current.barcode.gtin14]
            self._ids_by_gtin14[product.barcode.gtin14] = product.id
            self._products[product.id] = product

    def get_by_id(self, product_id: UUID) -> Product | None:
        with self._lock:
            return self._active(self._products.get(product_id))

    def get_by_barcode(self, barcode: Barcode) -> Product | None:
        with self._lock:
            product_id = self._ids_by_gtin14.get(barcode.gtin14)
            if product_id is None:
                return None
            return self._active(self._products[product_id])

    def list(
        self, offset: int, limit: int, name: str | None
    ) -> tuple[builtins.list[Product], int]:
        search = _searchable(name or "")
        with self._lock:
            matches = [
                product
                for product in self._products.values()
                if product.is_active and search in _searchable(product.name)
            ]
        return matches[offset : offset + limit], len(matches)

    @staticmethod
    def _active(product: Product | None) -> Product | None:
        return product if product is not None and product.is_active else None


def _searchable(text: str) -> str:
    """Forma de comparação da busca: sem acentos e sem diferenciar maiúsculas (D11)."""
    decomposed = unicodedata.normalize("NFKD", text)
    return "".join(
        char for char in decomposed if not unicodedata.combining(char)
    ).casefold()
