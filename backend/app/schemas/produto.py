from pydantic import BaseModel, Field


class ProdutoCreate(BaseModel):
    """Dados para cadastrar ou substituir (PUT) um produto."""

    nome: str = Field(min_length=1, max_length=120)
    descricao: str | None = Field(default=None, max_length=500)
    preco: float = Field(gt=0)


class ProdutoUpdate(BaseModel):
    """Alteracao parcial (PATCH): todos os campos sao opcionais."""

    nome: str | None = Field(default=None, min_length=1, max_length=120)
    descricao: str | None = Field(default=None, max_length=500)
    preco: float | None = Field(default=None, gt=0)


class Produto(ProdutoCreate):
    id: int
