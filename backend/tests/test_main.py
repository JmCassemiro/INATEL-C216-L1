import pytest
from fastapi.testclient import TestClient

from main import app, home

MENSAGEM_ESPERADA = {"message": "Olá, Sistemas Distribuídos!"}


@pytest.fixture
def client():
    """Cliente HTTP isolado por teste, evitando estado compartilhado entre eles."""
    return TestClient(app)


# --- Testes unitarios: chamam a funcao diretamente, sem subir o servidor ---


def test_home_retorna_a_mensagem_esperada():
    assert home() == MENSAGEM_ESPERADA


def test_home_retorna_um_dicionario():
    assert isinstance(home(), dict)


def test_home_expoe_apenas_a_chave_message():
    assert list(home().keys()) == ["message"]


# --- Testes de integracao: exercitam a aplicacao pela camada HTTP ---


def test_home_responde_com_status_200(client):
    resposta = client.get("/")

    assert resposta.status_code == 200


def test_home_responde_com_o_json_esperado(client):
    resposta = client.get("/")

    assert resposta.json() == MENSAGEM_ESPERADA


# --- Casos de erro ---


@pytest.mark.parametrize("rota", ["/ping", "/usuarios", "/health"])
def test_rota_inexistente_retorna_404(client, rota):
    resposta = client.get(rota)

    assert resposta.status_code == 404


def test_metodo_nao_permitido_retorna_405(client):
    resposta = client.post("/")

    assert resposta.status_code == 405
