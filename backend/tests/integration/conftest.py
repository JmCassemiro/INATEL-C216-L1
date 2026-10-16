import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client():
    """Cliente HTTP com uma aplicação nova por teste, sem estado compartilhado."""
    with TestClient(create_app()) as c:
        yield c
