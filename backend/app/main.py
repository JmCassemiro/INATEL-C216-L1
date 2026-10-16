from fastapi import FastAPI

from app.api.error_handlers import register_error_handlers
from app.api.routes import home, products
from app.infrastructure.repositories.in_memory_product_repository import (
    InMemoryProductRepository,
)


def create_app() -> FastAPI:
    """Cria a aplicação: rotas, tradução de erros e repositório próprio (D12)."""
    app = FastAPI(title="NexoPDV")
    app.state.product_repository = InMemoryProductRepository()
    app.include_router(home.router)
    app.include_router(products.router)
    register_error_handlers(app)
    return app


app = create_app()
