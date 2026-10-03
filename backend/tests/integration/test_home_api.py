import pytest

MENSAGEM_ESPERADA = {"message": "Olá, Sistemas Distribuídos!"}


def test_home_responde_com_status_200(client):
    resposta = client.get("/")

    assert resposta.status_code == 200


def test_home_responde_com_o_json_esperado(client):
    resposta = client.get("/")

    assert resposta.json() == MENSAGEM_ESPERADA


@pytest.mark.parametrize("rota", ["/ping", "/usuarios", "/health"])
def test_rota_inexistente_retorna_404(client, rota):
    resposta = client.get(rota)

    assert resposta.status_code == 404


def test_metodo_nao_permitido_retorna_405(client):
    resposta = client.post("/")

    assert resposta.status_code == 405
