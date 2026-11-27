"""Provedores de dependência: compõem os casos de uso na borda (D12)."""

from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.application.ports.product_repository import ProductRepository
from app.application.ports.sale_repository import SaleRepository
from app.application.ports.stock_repository import StockRepository
from app.application.services.product_service import ProductService
from app.application.services.sale_service import SaleService
from app.application.services.stock_service import StockService
from app.infrastructure.repositories.sqlalchemy_product_repository import (
    SqlAlchemyProductRepository,
)
from app.infrastructure.repositories.sqlalchemy_sale_repository import (
    SqlAlchemySaleRepository,
)
from app.infrastructure.repositories.sqlalchemy_stock_repository import (
    SqlAlchemyStockRepository,
)


def get_session(request: Request) -> Iterator[Session]:
    """Uma sessão de banco por requisição, fechada quando a resposta termina."""
    with request.app.state.session_factory() as session:
        yield session


def get_product_repository(
    session: Annotated[Session, Depends(get_session)],
) -> ProductRepository:
    return SqlAlchemyProductRepository(session)


def get_product_service(
    repository: Annotated[ProductRepository, Depends(get_product_repository)],
) -> ProductService:
    return ProductService(repository)


def get_stock_repository(
    session: Annotated[Session, Depends(get_session)],
) -> StockRepository:
    return SqlAlchemyStockRepository(session)


def get_stock_service(
    repository: Annotated[StockRepository, Depends(get_stock_repository)],
) -> StockService:
    return StockService(repository)


def get_sale_repository(
    session: Annotated[Session, Depends(get_session)],
) -> SaleRepository:
    return SqlAlchemySaleRepository(session)


def get_sale_service(
    repository: Annotated[SaleRepository, Depends(get_sale_repository)],
) -> SaleService:
    return SaleService(repository)
