import pytest

EXPECTED_MESSAGE = {"message": "Olá, Sistemas Distribuídos!"}


def test_home_returns_status_200(client):
    response = client.get("/")

    assert response.status_code == 200


def test_home_returns_the_expected_json(client):
    response = client.get("/")

    assert response.json() == EXPECTED_MESSAGE


@pytest.mark.parametrize("route", ["/ping", "/usuarios", "/health"])
def test_unknown_route_returns_404(client, route):
    response = client.get(route)

    assert response.status_code == 404


def test_method_not_allowed_returns_405(client):
    response = client.post("/")

    assert response.status_code == 405
