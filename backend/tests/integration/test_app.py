import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.domain.errors import (
    DuplicateBarcodeError,
    InvalidDataError,
    ProductNotFoundError,
)
from app.main import create_app


def raise_error(error: Exception):
    def route():
        raise error

    return route


@pytest.fixture
def client_with_failing_routes(engine):
    """Aplicação real com rotas de teste que levantam erros de domínio."""
    app = create_app(engine)
    app.add_api_route("/test/not-found", raise_error(ProductNotFoundError()))
    app.add_api_route("/test/conflict", raise_error(DuplicateBarcodeError()))
    app.add_api_route(
        "/test/invalid-field",
        raise_error(InvalidDataError("price", "Preço deve ser maior que zero")),
    )
    app.add_api_route(
        "/test/invalid-body",
        raise_error(InvalidDataError(None, "Informe ao menos um campo")),
    )
    with TestClient(app, raise_server_exceptions=False) as client:
        yield client


def test_create_app_returns_a_new_fastapi_instance_each_call(engine):
    """D12: cada chamada cria uma aplicação própria."""
    first, second = create_app(engine), create_app(engine)

    assert isinstance(first, FastAPI)
    assert first is not second


def test_created_app_serves_home(engine):
    """RP-008: a rota GET / continua respondendo."""
    with TestClient(create_app(engine)) as client:
        response = client.get("/")

    assert response.status_code == 200


def test_not_found_error_becomes_404(client_with_failing_routes):
    """D8, FR-017: "não encontrado" vira 404 com a mensagem do domínio."""
    response = client_with_failing_routes.get("/test/not-found")

    assert response.status_code == 404
    assert response.json() == {"detail": "Produto não encontrado"}


def test_conflict_error_becomes_409(client_with_failing_routes):
    """D8, FR-017: conflito vira 409 com a mensagem do domínio."""
    response = client_with_failing_routes.get("/test/conflict")

    assert response.status_code == 409
    assert response.json() == {"detail": "Código de barras já cadastrado"}


def test_invalid_data_error_becomes_422_with_the_field(client_with_failing_routes):
    """D8, FR-017: dado inválido vira 422 no formato do FastAPI, com o campo."""
    response = client_with_failing_routes.get("/test/invalid-field")

    assert response.status_code == 422
    assert response.json() == {
        "detail": [
            {
                "loc": ["body", "price"],
                "msg": "Preço deve ser maior que zero",
                "type": "value_error",
            }
        ]
    }


def test_invalid_data_error_without_field_points_to_body(client_with_failing_routes):
    """D8, FR-017: erro do corpo inteiro aponta só para "body"."""
    response = client_with_failing_routes.get("/test/invalid-body")

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body"]
    assert response.json()["detail"][0]["msg"] == "Informe ao menos um campo"
