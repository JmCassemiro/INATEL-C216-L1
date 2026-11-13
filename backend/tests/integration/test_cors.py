"""CORS: só as origens configuradas podem chamar a API pelo navegador."""

import pytest
from fastapi.testclient import TestClient

from app.api.cors import cors_origins
from app.main import create_app

FRONTEND = "http://localhost:5173"


def preflight(client, origin: str):
    """Requisição OPTIONS que o navegador envia antes de um POST com JSON."""
    return client.options(
        "/items/",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )


def test_default_origins_are_the_local_vite_server(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)

    assert cors_origins() == ["http://localhost:5173", "http://127.0.0.1:5173"]


def test_origins_come_from_the_environment(monkeypatch):
    """`CORS_ORIGINS` é uma lista separada por vírgulas; espaços são ignorados."""
    monkeypatch.setenv("CORS_ORIGINS", " http://a.test , http://b.test,")

    assert cors_origins() == ["http://a.test", "http://b.test"]


def test_preflight_from_allowed_origin_is_authorized(client):
    response = preflight(client, FRONTEND)

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == FRONTEND
    assert "POST" in response.headers["access-control-allow-methods"]


def test_response_to_allowed_origin_carries_the_cors_header(client):
    response = client.get("/items/", headers={"Origin": FRONTEND})

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == FRONTEND


@pytest.mark.parametrize("origin", ["http://evil.test", "http://localhost:3000"])
def test_unknown_origin_is_not_authorized(client, origin):
    """Origem desconhecida: o preflight é recusado e a resposta não libera a leitura."""
    assert preflight(client, origin).status_code == 400
    response = client.get("/items/", headers={"Origin": origin})
    assert "access-control-allow-origin" not in response.headers


def test_configured_origin_replaces_the_default(monkeypatch, engine, session_factory):
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5174")

    with TestClient(create_app(engine)) as client:
        assert preflight(client, "http://localhost:5174").status_code == 200
        assert preflight(client, FRONTEND).status_code == 400
