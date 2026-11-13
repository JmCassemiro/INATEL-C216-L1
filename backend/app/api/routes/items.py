from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.dependencies import get_item_service
from app.api.schemas.item import ItemInput, ItemOutput
from app.application.services.item_service import ItemService

# As rotas terminam em "/": "/items" sem a barra responde 307 (redirecionamento).
router = APIRouter(prefix="/items", tags=["Items"])

Service = Annotated[ItemService, Depends(get_item_service)]


@router.get("/")
def list_items(service: Service) -> list[ItemOutput]:
    return [ItemOutput.from_entity(item) for item in service.list()]


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_item(data: ItemInput, service: Service) -> ItemOutput:
    return ItemOutput.from_entity(service.create(data.to_command()))
