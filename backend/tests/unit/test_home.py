from app.api.routes.home import home

EXPECTED_MESSAGE = {"message": "Olá, Sistemas Distribuídos!"}


def test_home_returns_the_expected_message():
    assert home() == EXPECTED_MESSAGE


def test_home_returns_a_dict():
    assert isinstance(home(), dict)


def test_home_exposes_only_the_message_key():
    assert list(home().keys()) == ["message"]
