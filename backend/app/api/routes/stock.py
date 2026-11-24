"""Rotas do estoque (spec 011, contracts/stock-api.md).

Entrada, ajuste e histórico ficam sob o produto, porque o estoque é dele; o resumo é
da loja. Erros de domínio saem pelos tradutores por categoria (`error_handlers`).
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.api.dependencies import get_stock_service
from app.api.schemas.stock import (
    AdjustmentInput,
    EntryInput,
    MovementOutput,
    MovementPageOutput,
    StockSummaryOutput,
)
from app.application.pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from app.application.services.stock_service import StockService

router = APIRouter(tags=["Stock"])

Service = Annotated[StockService, Depends(get_stock_service)]


@router.post(
    "/products/{product_id}/stock/entries", status_code=status.HTTP_201_CREATED
)
def register_entry(
    product_id: UUID, data: EntryInput, service: Service
) -> MovementOutput:
    movement = service.register_entry(product_id, data.quantity, data.note)
    return MovementOutput.from_entity(movement)


@router.post(
    "/products/{product_id}/stock/adjustments", status_code=status.HTTP_201_CREATED
)
def adjust_stock(
    product_id: UUID, data: AdjustmentInput, service: Service
) -> MovementOutput:
    movement = service.adjust(product_id, data.quantity, data.reason)
    return MovementOutput.from_entity(movement)


@router.get("/products/{product_id}/stock/movements")
def list_movements(
    product_id: UUID,
    service: Service,
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
) -> MovementPageOutput:
    return MovementPageOutput.from_page(service.movements(product_id, page, size))


@router.get("/stock/summary")
def stock_summary(service: Service) -> StockSummaryOutput:
    return StockSummaryOutput.from_summary(service.summary())
