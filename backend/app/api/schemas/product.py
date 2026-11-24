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
    StrictInt,
    StrictStr,
    field_validator,
    model_validator,
)

from app.application.commands import ProductChanges, ProductData
from app.application.pagination import Page
from app.domain.barcode import Barcode
from app.domain.price import Price
from app.domain.product import Product, normalize_description, normalize_name
from app.domain.stock import StockStatus, normalize_min_stock


def validate_barcode(code: str) -> str:
    return Barcode(code).value


def validate_price(amount: Decimal) -> Decimal:
    return Price(amount).value


Name = Annotated[str, AfterValidator(normalize_name)]
Description = Annotated[str | None, AfterValidator(normalize_description)]
BarcodeCode = Annotated[StrictStr, AfterValidator(validate_barcode)]
PriceAmount = Annotated[Decimal, AfterValidator(validate_price)]
MinStock = Annotated[StrictInt, AfterValidator(normalize_min_stock)]


class ProductInput(BaseModel):
    """Cadastro completo (corpo de POST e PUT)."""

    name: Name
    description: Description = None
    barcode: BarcodeCode
    price: PriceAmount
    min_stock: MinStock = 0
    """Estoque mínimo (spec 011); omitido, é 0. O saldo não entra pelo cadastro."""

    def to_command(self) -> ProductData:
        return ProductData(
            name=self.name,
            description=self.description,
            barcode=self.barcode,
            price=self.price,
            min_stock=self.min_stock,
        )


class ProductChangesInput(BaseModel):
    """Alteração parcial (corpo de PATCH): só os campos enviados mudam.

    `null` é aceito só na descrição (remove-a); nos outros campos é recusado.
    """

    name: Name | None = None
    description: Description = None
    barcode: BarcodeCode | None = None
    price: PriceAmount | None = None
    min_stock: MinStock | None = None

    @field_validator("name", "barcode", "price", "min_stock", mode="before")
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
    """Produto na resposta: código como cadastrado e preço como string com 2 casas.

    Desde a spec 011, traz também o estoque: saldo, mínimo e a falta e a situação
    calculadas pelo domínio, para que o painel não repita a regra de reposição.
    """

    id: UUID
    name: str
    description: str | None
    barcode: str
    price: str
    stock_quantity: int
    min_stock: int
    shortfall: int
    stock_status: StockStatus

    @classmethod
    def from_entity(cls, product: Product) -> Self:
        return cls(
            id=product.id,
            name=product.name,
            description=product.description,
            barcode=product.barcode.value,
            price=str(product.price.value),
            stock_quantity=product.stock_quantity,
            min_stock=product.min_stock,
            shortfall=product.shortfall,
            stock_status=product.stock_status,
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
