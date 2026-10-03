import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_produto_service
from app.main import app
from app.services.produto import ProdutoService


@pytest.fixture
def client():
    """Cliente HTTP com um catalogo novo por teste, evitando estado compartilhado."""
    service = ProdutoService()
    app.dependency_overrides[get_produto_service] = lambda: service
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
