from app.api.routes.home import home

MENSAGEM_ESPERADA = {"message": "Olá, Sistemas Distribuídos!"}


def test_home_retorna_a_mensagem_esperada():
    assert home() == MENSAGEM_ESPERADA


def test_home_retorna_um_dicionario():
    assert isinstance(home(), dict)


def test_home_expoe_apenas_a_chave_message():
    assert list(home().keys()) == ["message"]
