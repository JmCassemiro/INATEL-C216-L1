import builtins
from typing import Any, NoReturn
from uuid import UUID

from sqlalchemy import ColumnElement, case, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.application.commands import ProductOrder
from app.domain.barcode import Barcode
from app.domain.errors import DuplicateBarcodeError, ProductNotFoundError
from app.domain.product import Product
from app.infrastructure.models.product import ProductModel
from app.infrastructure.repositories.search import searchable

_ACTIVE = ProductModel.removed_at.is_(None)

_SHORTFALL = ProductModel.min_stock - ProductModel.stock_quantity

_ORDERING: dict[ProductOrder, tuple[ColumnElement[Any], ...]] = {
    # O id é UUID v7, que cresce com o tempo: em ordem decrescente, o produto
    # cadastrado por último vem primeiro (spec 007, FR-005).
    ProductOrder.NEWEST: (ProductModel.id.desc(),),
    ProductOrder.NAME: (ProductModel.name_search, ProductModel.id),
    # A falta do domínio nunca é negativa: `max(min - saldo, 0)` (spec 011, FR-014).
    ProductOrder.SHORTFALL: (
        case((_SHORTFALL > 0, _SHORTFALL), else_=0).desc(),
        ProductModel.name_search,
        ProductModel.id,
    ),
}


class SqlAlchemyProductRepository:
    """Repositório no banco relacional que satisfaz a porta `ProductRepository` (D9).

    A atomicidade vem do próprio banco: a unicidade do código é a constraint única de
    `gtin14`, e a atualização é um único `UPDATE` que só acerta um produto ativo. Cada
    escrita é uma transação, confirmada antes de o método retornar.
    """

    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, product: Product) -> None:
        self._session.add(ProductModel.from_entity(product))
        self._commit()

    def update(self, product: Product) -> None:
        statement = (
            update(ProductModel)
            .where(ProductModel.id == product.id, _ACTIVE)
            .values(**ProductModel.values_from(product))
            .returning(ProductModel.id)
        )
        try:
            updated_id = self._session.scalar(statement)
        except IntegrityError as error:
            self._session.rollback()
            _raise_duplicate_barcode_or(error)
        if updated_id is None:
            self._session.rollback()
            raise ProductNotFoundError()
        self._commit()

    def get_by_id(self, product_id: UUID) -> Product | None:
        return self._find_active(ProductModel.id == product_id)

    def get_by_barcode(self, barcode: Barcode) -> Product | None:
        return self._find_active(ProductModel.gtin14 == barcode.gtin14)

    def list(
        self,
        offset: int,
        limit: int,
        name: str | None,
        *,
        restock_only: bool = False,
        order: ProductOrder = ProductOrder.NEWEST,
    ) -> tuple[builtins.list[Product], int]:
        conditions: builtins.list[ColumnElement[bool]] = [_ACTIVE]
        if name:
            conditions.append(
                ProductModel.name_search.contains(searchable(name), autoescape=True)
            )
        if restock_only:
            # O mesmo predicado de `needs_restock` do domínio (spec 011, D7).
            conditions.append(ProductModel.stock_quantity < ProductModel.min_stock)
        total = self._session.scalar(
            select(func.count()).select_from(ProductModel).where(*conditions)
        )
        models = self._session.scalars(
            select(ProductModel)
            .where(*conditions)
            .order_by(*_ORDERING[order])
            .offset(offset)
            .limit(limit)
            .execution_options(populate_existing=True)
        )
        return [model.to_entity() for model in models], total or 0

    def _find_active(self, condition: ColumnElement[bool]) -> Product | None:
        # `populate_existing`: o saldo pode ter mudado por outra sessão (estoque).
        model = self._session.scalars(
            select(ProductModel)
            .where(condition, _ACTIVE)
            .execution_options(populate_existing=True)
        ).one_or_none()
        return model.to_entity() if model is not None else None

    def _commit(self) -> None:
        try:
            self._session.commit()
        except IntegrityError as error:
            self._session.rollback()
            _raise_duplicate_barcode_or(error)


def _raise_duplicate_barcode_or(error: IntegrityError) -> NoReturn:
    """Traduz a violação da constraint única de `gtin14`; outras falhas sobem."""
    if "gtin14" in str(error.orig):
        raise DuplicateBarcodeError() from error
    raise error
