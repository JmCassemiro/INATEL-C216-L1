"""DTOs da borda HTTP de produtos (D7).

As regras de conteúdo vêm do domínio, via `AfterValidator`: o erro de domínio é um
`ValueError`, que o Pydantic converte em erro de validação com o campo no `loc`.
"""

from decimal import Decimal
from typing import Annotated, Self
from uuid import UUID

from pydantic import (
    AfterValidator,
    BaseModel,
    StrictStr,
    field_validator,
    model_validator,
)

from app.application.commands import ProductChanges, ProductData
from app.application.pagination import Page
from app.domain.barcode import Barcode
from app.domain.price import Price
from app.domain.product import Product, normalize_description, normalize_name


def validate_barcode(code: str) -> str:
    return Barcode(code).value


def validate_price(amount: Decimal) -> Decimal:
    return Price(amount).value


Name = Annotated[str, AfterValidator(normalize_name)]
Description = Annotated[str | None, AfterValidator(normalize_description)]
BarcodeCode = Annotated[StrictStr, AfterValidator(validate_barcode)]
PriceAmount = Annotated[Decimal, AfterValidator(validate_price)]


class ProductInput(BaseModel):
    """Cadastro completo (corpo de POST e PUT)."""

    name: Name
    description: Description = None
    barcode: BarcodeCode
    price: PriceAmount

    def to_command(self) -> ProductData:
        return ProductData(
            name=self.name,
            description=self.description,
            barcode=self.barcode,
            price=self.price,
        )


class ProductChangesInput(BaseModel):
    """Alteração parcial (corpo de PATCH): só os campos enviados mudam.

    `null` é aceito só na descrição (remove-a); nos outros campos é recusado.
    """

    name: Name | None = None
    description: Description = None
    barcode: BarcodeCode | None = None
    price: PriceAmount | None = None

    @field_validator("name", "barcode", "price", mode="before")
    @classmethod
    def reject_null(cls, value: object) -> object:
        if value is None:
            raise ValueError("Campo não pode ser nulo")
        return value

    @model_validator(mode="after")
    def require_some_field(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Informe ao menos um campo para alterar")
        return self

    def to_command(self) -> ProductChanges:
        return ProductChanges(
            **{field: getattr(self, field) for field in self.model_fields_set}
        )


class ProductOutput(BaseModel):
    """Produto na resposta: código como cadastrado e preço como string com 2 casas."""

    id: UUID
    name: str
    description: str | None
    barcode: str
    price: str

    @classmethod
    def from_entity(cls, product: Product) -> Self:
        return cls(
            id=product.id,
            name=product.name,
            description=product.description,
            barcode=product.barcode.value,
            price=str(product.price.value),
        )


class ProductPageOutput(BaseModel):
    """Página da listagem de produtos."""

    items: list[ProductOutput]
    total: int
    page: int
    size: int

    @classmethod
    def from_page(cls, page: Page[Product]) -> Self:
        return cls(
            items=[ProductOutput.from_entity(product) for product in page.items],
            total=page.total,
            page=page.page,
            size=page.size,
        )
