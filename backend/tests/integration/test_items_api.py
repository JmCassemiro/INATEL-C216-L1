import uuid

from fastapi.testclient import TestClient

from app.main import create_app

ITEM = {"name": "Notebook", "description": "14 polegadas"}


def test_post_creates_item_and_returns_201(client):
    response = client.post("/items/", json=ITEM)

    assert response.status_code == 201
    body = response.json()
    assert uuid.UUID(body["id"]).version == 7
    assert body == {"id": body["id"], "name": "Notebook", "description": "14 polegadas"}


def test_post_accepts_missing_or_null_description(client):
    without = client.post("/items/", json={"name": "Notebook"})
    with_null = client.post("/items/", json={"name": "Mouse", "description": None})

    assert without.status_code == 201
    assert without.json()["description"] is None
    assert with_null.status_code == 201
    assert with_null.json()["description"] is None


def test_get_lists_items_in_registration_order(client):
    first = client.post("/items/", json=ITEM).json()
    second = client.post("/items/", json={"name": "Mouse"}).json()

    response = client.get("/items/")

    assert response.status_code == 200
    assert response.json() == [first, second]


def test_get_returns_empty_list_without_items(client):
    response = client.get("/items/")

    assert response.status_code == 200
    assert response.json() == []


def test_post_with_duplicate_name_returns_409(client):
    client.post("/items/", json=ITEM)

    response = client.post("/items/", json={"name": " Notebook "})

    assert response.status_code == 409
    assert response.json() == {"detail": "Já existe um item com esse nome"}
    assert len(client.get("/items/").json()) == 1


def test_post_with_invalid_name_returns_422(client):
    blank = client.post("/items/", json={"name": "   "})
    too_long = client.post("/items/", json={"name": "a" * 101})
    missing = client.post("/items/", json={"description": "sem nome"})

    for response in (blank, too_long, missing):
        assert response.status_code == 422
        assert response.json()["detail"][0]["loc"] == ["body", "name"]
    assert client.get("/items/").json() == []


def test_items_data_persist_after_restarting_the_app(engine, session_factory):
    """O item fica no banco: uma aplicação nova o encontra."""
    with TestClient(create_app(engine)) as first_run:
        created = first_run.post("/items/", json=ITEM).json()

    with TestClient(create_app(engine)) as second_run:
        assert second_run.get("/items/").json() == [created]
