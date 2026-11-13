import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client(engine, session_factory):
    """Cliente HTTP com uma aplicação nova por teste, sobre um banco vazio."""
    with TestClient(create_app(engine)) as c:
        yield c
