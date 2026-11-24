"""CORS: só as origens configuradas podem chamar a API pelo navegador, e só com os
métodos que o painel usa (spec 007, RP-003)."""

import pytest
from fastapi.testclient import TestClient

from app.api.cors import cors_origins
from app.main import create_app

FRONTEND = "http://localhost:5173"
PRODUCT_PATH = "/products/0190f2a4-0000-7000-8000-000000000000"


def preflight(client, origin: str, method: str = "POST", path: str = "/products"):
    """Requisição OPTIONS que o navegador envia antes de um pedido com JSON."""
    return client.options(
        path,
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": method,
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


@pytest.mark.parametrize("method", ["PUT", "DELETE"])
def test_preflight_for_edit_and_remove_is_authorized(client, method):
    """RP-003 (spec 007): o painel edita com PUT e remove com DELETE."""
    response = preflight(client, FRONTEND, method=method, path=PRODUCT_PATH)

    assert response.status_code == 200
    assert method in response.headers["access-control-allow-methods"]


def test_preflight_for_patch_is_refused(client):
    """RP-003 (spec 007): PATCH existe na API, mas o painel não usa; o navegador
    não é autorizado a chamá-lo."""
    response = preflight(client, FRONTEND, method="PATCH", path=PRODUCT_PATH)

    assert response.status_code == 400


def test_response_to_allowed_origin_carries_the_cors_header(client):
    response = client.get("/products", headers={"Origin": FRONTEND})

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == FRONTEND


@pytest.mark.parametrize("origin", ["http://evil.test", "http://localhost:3000"])
def test_unknown_origin_is_not_authorized(client, origin):
    """Origem desconhecida: o preflight é recusado e a resposta não libera a leitura."""
    assert preflight(client, origin).status_code == 400
    response = client.get("/products", headers={"Origin": origin})
    assert "access-control-allow-origin" not in response.headers


def test_configured_origin_replaces_the_default(monkeypatch, engine, session_factory):
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5174")

    with TestClient(create_app(engine)) as client:
        assert preflight(client, "http://localhost:5174").status_code == 200
        assert preflight(client, FRONTEND).status_code == 400


def test_preflight_for_stock_entry_is_authorized(client):
    """RP-005 (spec 011): o painel registra entradas com POST, já liberado."""
    response = preflight(client, FRONTEND, "POST", f"{PRODUCT_PATH}/stock/entries")

    assert response.status_code == 200
    assert "POST" in response.headers["access-control-allow-methods"]


def test_preflight_for_registering_a_sale_is_authorized(client):
    """RP-005 (spec 004): o painel registra a venda com POST, já liberado."""
    response = preflight(client, FRONTEND, "POST", "/sales")

    assert response.status_code == 200
    assert "POST" in response.headers["access-control-allow-methods"]
