from collections.abc import Callable
from datetime import UTC, datetime
from uuid import UUID

from app.application.commands import UNSET, ProductChanges, ProductData, Unset
from app.application.pagination import Page
from app.application.ports.product_repository import ProductRepository
from app.domain.barcode import Barcode
from app.domain.errors import InvalidDataError, ProductNotFoundError
from app.domain.product import Product


def _utc_now() -> datetime:
    return datetime.now(UTC)


class ProductService:
    """Casos de uso do cadastro de produtos (D2).

    A unicidade do código de barras é garantida pelo repositório, de forma atômica (D9);
    o serviço não a verifica antes de gravar.
    """

    def __init__(
        self,
        repository: ProductRepository,
        clock: Callable[[], datetime] = _utc_now,
    ) -> None:
        self._repository = repository
        self._clock = clock

    def create(self, data: ProductData) -> Product:
        product = Product.create(data.name, data.description, data.barcode, data.price)
        self._repository.add(product)
        return product

    def get(self, product_id: UUID) -> Product:
        product = self._repository.get_by_id(product_id)
        if product is None:
            raise ProductNotFoundError()
        return product

    def get_by_barcode(self, barcode: str) -> Product:
        product = self._repository.get_by_barcode(Barcode(barcode))
        if product is None:
            raise ProductNotFoundError()
        return product

    def list(self, page: int, size: int, name: str | None) -> Page[Product]:
        items, total = self._repository.list((page - 1) * size, size, name)
        return Page(items=items, total=total, page=page, size=size)

    def replace(self, product_id: UUID, data: ProductData) -> Product:
        """Substitui o cadastro completo (PUT, FR-012)."""
        current = self.get(product_id)
        return self._save(current, data)

    def update(self, product_id: UUID, changes: ProductChanges) -> Product:
        """Altera só os campos informados (PATCH, FR-013, FR-014)."""
        if changes.is_empty():
            raise InvalidDataError(None, "Informe ao menos um campo para alterar")
        current = self.get(product_id)
        data = ProductData(
            name=_given_or(changes.name, current.name),
            description=_given_or(changes.description, current.description),
            barcode=_given_or(changes.barcode, current.barcode.value),
            price=_given_or(changes.price, current.price.value),
        )
        return self._save(current, data)

    def remove(self, product_id: UUID) -> Product:
        """Inativa o produto; registro e código de barras ficam guardados (FR-016)."""
        product = self.get(product_id).removed(self._clock())
        self._repository.update(product)
        return product

    def _save(self, current: Product, data: ProductData) -> Product:
        product = current.updated(data.name, data.description, data.barcode, data.price)
        self._repository.update(product)
        return product


def _given_or[T](value: T | Unset, current: T) -> T:
    return current if value is UNSET else value
