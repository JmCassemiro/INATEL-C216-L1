"""Provedores de dependência: compõem os casos de uso na borda (D12)."""

from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.application.ports.product_repository import ProductRepository
from app.application.services.product_service import ProductService
from app.infrastructure.repositories.sqlalchemy_product_repository import (
    SqlAlchemyProductRepository,
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
