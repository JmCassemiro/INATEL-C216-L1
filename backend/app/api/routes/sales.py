"""Rotas das vendas (spec 004, contracts/sales-api.md).

Erros de domínio saem pelos tradutores por categoria (`error_handlers`); a recusa da
venda tem o seu, com os problemas de cada item.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from pydantic import AwareDatetime

from app.api.dependencies import get_sale_service
from app.api.schemas.sale import (
    SaleInput,
    SaleOutput,
    SalePageOutput,
    SalesSummaryOutput,
)
from app.application.pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from app.application.services.sale_service import SaleService

router = APIRouter(prefix="/sales", tags=["Sales"])

Service = Annotated[SaleService, Depends(get_sale_service)]


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    responses={200: {"description": "A venda já estava registrada (reenvio)"}},
)
def register_sale(data: SaleInput, service: Service, response: Response) -> SaleOutput:
    registration = service.register(data.id, data.lines(), data.payment_data())
    if not registration.created:
        response.status_code = status.HTTP_200_OK
    response.headers["Location"] = f"/sales/{registration.sale.id}"
    return SaleOutput.from_entity(registration.sale)


@router.get("")
def list_sales(
    service: Service,
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
) -> SalePageOutput:
    return SalePageOutput.from_page(service.list(page, size))


@router.get("/summary")
def sales_summary(
    service: Service, start: AwareDatetime, end: AwareDatetime
) -> SalesSummaryOutput:
    """Indicadores das vendas com `start <= momento < end` (o dia do navegador)."""
    return SalesSummaryOutput.from_summary(service.summary(start, end))


@router.get("/{sale_id}")
def get_sale(sale_id: UUID, service: Service) -> SaleOutput:
    return SaleOutput.from_entity(service.get(sale_id))
