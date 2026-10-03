from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.dependencies import get_produto_service
from app.schemas.produto import Produto, ProdutoCreate, ProdutoUpdate
from app.services.produto import ProdutoNaoEncontrado, ProdutoService

router = APIRouter(prefix="/produtos", tags=["Produtos"])

Service = Annotated[ProdutoService, Depends(get_produto_service)]


def _nao_encontrado(erro: ProdutoNaoEncontrado) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(erro))


@router.get("")
def listar_produtos(
    service: Service, limit: Annotated[int, Query(ge=1, le=100)] = 10
) -> list[Produto]:
    return service.listar(limit)


@router.get("/{produto_id}")
def obter_produto(produto_id: int, service: Service) -> Produto:
    try:
        return service.obter(produto_id)
    except ProdutoNaoEncontrado as erro:
        raise _nao_encontrado(erro) from erro


@router.post("", status_code=status.HTTP_201_CREATED)
def criar_produto(dados: ProdutoCreate, service: Service) -> Produto:
    return service.criar(dados)


@router.put("/{produto_id}")
def substituir_produto(
    produto_id: int, dados: ProdutoCreate, service: Service
) -> Produto:
    try:
        return service.substituir(produto_id, dados)
    except ProdutoNaoEncontrado as erro:
        raise _nao_encontrado(erro) from erro


@router.patch("/{produto_id}")
def atualizar_produto(
    produto_id: int, dados: ProdutoUpdate, service: Service
) -> Produto:
    try:
        return service.atualizar(produto_id, dados)
    except ProdutoNaoEncontrado as erro:
        raise _nao_encontrado(erro) from erro


@router.delete("/{produto_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_produto(produto_id: int, service: Service) -> None:
    try:
        service.remover(produto_id)
    except ProdutoNaoEncontrado as erro:
        raise _nao_encontrado(erro) from erro
