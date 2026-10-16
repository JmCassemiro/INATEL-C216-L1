"""Provedores de dependência: compõem os casos de uso na borda (D12)."""

from typing import Annotated

from fastapi import Depends, Request

from app.application.ports.product_repository import ProductRepository
from app.application.services.product_service import ProductService


def get_product_repository(request: Request) -> ProductRepository:
    return request.app.state.product_repository


def get_product_service(
    repository: Annotated[ProductRepository, Depends(get_product_repository)],
) -> ProductService:
    return ProductService(repository)
