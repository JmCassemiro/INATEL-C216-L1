import builtins
from typing import NoReturn
from uuid import UUID

from sqlalchemy import ColumnElement, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.domain.barcode import Barcode
from app.domain.errors import DuplicateBarcodeError, ProductNotFoundError
from app.domain.product import Product
from app.infrastructure.models.product import ProductModel
from app.infrastructure.repositories.search import searchable

_ACTIVE = ProductModel.removed_at.is_(None)


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
        self, offset: int, limit: int, name: str | None
    ) -> tuple[builtins.list[Product], int]:
        conditions: builtins.list[ColumnElement[bool]] = [_ACTIVE]
        if name:
            conditions.append(
                ProductModel.name_search.contains(searchable(name), autoescape=True)
            )
        total = self._session.scalar(
            select(func.count()).select_from(ProductModel).where(*conditions)
        )
        # O id é UUID v7, que cresce com o tempo: ordenar por ele é a ordem de cadastro.
        models = self._session.scalars(
            select(ProductModel)
            .where(*conditions)
            .order_by(ProductModel.id)
            .offset(offset)
            .limit(limit)
        )
        return [model.to_entity() for model in models], total or 0

    def _find_active(self, condition: ColumnElement[bool]) -> Product | None:
        model = self._session.scalars(
            select(ProductModel).where(condition, _ACTIVE)
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
