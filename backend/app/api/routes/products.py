from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status

from app.api.dependencies import get_product_service
from app.api.schemas.product import (
    BarcodeCode,
    ProductChangesInput,
    ProductInput,
    ProductOutput,
    ProductPageOutput,
)
from app.application.pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from app.application.services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["Products"])

Service = Annotated[ProductService, Depends(get_product_service)]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_product(
    data: ProductInput, service: Service, response: Response
) -> ProductOutput:
    product = service.create(data.to_command())
    response.headers["Location"] = f"/products/{product.id}"
    return ProductOutput.from_entity(product)


@router.get("")
def list_products(
    service: Service,
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
    name: str | None = None,
) -> ProductPageOutput:
    return ProductPageOutput.from_page(service.list(page, size, name))


@router.get("/barcode/{barcode}")
def get_product_by_barcode(barcode: BarcodeCode, service: Service) -> ProductOutput:
    return ProductOutput.from_entity(service.get_by_barcode(barcode))


@router.get("/{product_id}")
def get_product(product_id: UUID, service: Service) -> ProductOutput:
    return ProductOutput.from_entity(service.get(product_id))


@router.put("/{product_id}")
def replace_product(
    product_id: UUID, data: ProductInput, service: Service
) -> ProductOutput:
    return ProductOutput.from_entity(service.replace(product_id, data.to_command()))


@router.patch("/{product_id}")
def update_product(
    product_id: UUID, changes: ProductChangesInput, service: Service
) -> ProductOutput:
    return ProductOutput.from_entity(service.update(product_id, changes.to_command()))


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_product(product_id: UUID, service: Service) -> None:
    service.remove(product_id)
