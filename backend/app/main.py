from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import Engine

from app.api.cors import add_cors
from app.api.error_handlers import register_error_handlers
from app.api.routes import home, items, products
from app.infrastructure.database.session import (
    create_database_engine,
    create_session_factory,
)


def create_app(engine: Engine | None = None) -> FastAPI:
    """Cria a aplicação: rotas, CORS, tradução de erros e acesso ao banco (D12).

    Sem `engine`, conecta no banco de `DATABASE_URL` e fecha as conexões ao desligar;
    os testes passam o próprio engine.
    """
    owns_engine = engine is None
    engine = engine or create_database_engine()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        yield
        if owns_engine:
            engine.dispose()

    app = FastAPI(title="NexoPDV", lifespan=lifespan)
    app.state.session_factory = create_session_factory(engine)
    app.include_router(home.router)
    app.include_router(products.router)
    app.include_router(items.router)
    add_cors(app)
    register_error_handlers(app)
    return app
