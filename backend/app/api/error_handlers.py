"""Tradução dos erros de domínio para HTTP, por categoria (D8).

As rotas não têm `try/except`: um erro de uma nova spec só precisa herdar da categoria
certa para sair com o status certo.
"""

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.domain.errors import ConflictError, InvalidDataError, NotFoundError


def register_error_handlers(app: FastAPI) -> None:
    # `exception_handler` aceita handlers tipados com a subclasse do erro; o
    # `add_exception_handler` do Starlette exige `Exception` no segundo parâmetro.
    app.exception_handler(NotFoundError)(_not_found)
    app.exception_handler(ConflictError)(_conflict)
    app.exception_handler(InvalidDataError)(_invalid_data)


def _not_found(request: Request, error: NotFoundError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND, content={"detail": str(error)}
    )


def _conflict(request: Request, error: ConflictError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT, content={"detail": str(error)}
    )


def _invalid_data(request: Request, error: InvalidDataError) -> JSONResponse:
    """Mesmo formato do 422 de validação do FastAPI, com o campo em `loc`."""
    loc = ["body"] if error.field is None else ["body", error.field]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={"detail": [{"loc": loc, "msg": str(error), "type": "value_error"}]},
    )
