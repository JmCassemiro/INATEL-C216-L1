import pytest

CAMISETA = {"nome": "Camiseta", "descricao": "Branca M", "preco": 49.9}


@pytest.fixture
def produto(client):
    return client.post("/produtos", json=CAMISETA).json()


def test_post_cria_produto_e_retorna_201(client):
    resposta = client.post("/produtos", json=CAMISETA)

    assert resposta.status_code == 201
    assert resposta.json() == {"id": 1, **CAMISETA}


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"preco": 10},
        {"nome": "", "preco": 10},
        {"nome": "Camiseta", "preco": 0},
        {"nome": "Camiseta", "preco": "abc"},
    ],
)
def test_post_com_dados_invalidos_retorna_422(client, payload):
    resposta = client.post("/produtos", json=payload)

    assert resposta.status_code == 422


def test_get_lista_produtos_cadastrados(client, produto):
    resposta = client.get("/produtos")

    assert resposta.status_code == 200
    assert resposta.json() == [produto]


def test_get_lista_respeita_query_parameter_limit(client):
    for _ in range(3):
        client.post("/produtos", json=CAMISETA)

    resposta = client.get("/produtos", params={"limit": 2})

    assert len(resposta.json()) == 2


@pytest.mark.parametrize("limit", [0, 101])
def test_get_lista_com_limit_invalido_retorna_422(client, limit):
    resposta = client.get("/produtos", params={"limit": limit})

    assert resposta.status_code == 422


def test_get_por_id_retorna_o_produto(client, produto):
    resposta = client.get(f"/produtos/{produto['id']}")

    assert resposta.status_code == 200
    assert resposta.json() == produto


def test_put_substitui_o_produto(client, produto):
    novo = {"nome": "Calça", "descricao": None, "preco": 99.9}

    resposta = client.put(f"/produtos/{produto['id']}", json=novo)

    assert resposta.status_code == 200
    assert resposta.json() == {"id": produto["id"], **novo}


def test_put_incompleto_retorna_422(client, produto):
    resposta = client.put(f"/produtos/{produto['id']}", json={"preco": 10})

    assert resposta.status_code == 422


def test_patch_altera_apenas_o_preco(client, produto):
    resposta = client.patch(f"/produtos/{produto['id']}", json={"preco": 44.9})

    assert resposta.status_code == 200
    assert resposta.json() == {**produto, "preco": 44.9}


def test_delete_remove_o_produto(client, produto):
    resposta = client.delete(f"/produtos/{produto['id']}")

    assert resposta.status_code == 204
    assert client.get(f"/produtos/{produto['id']}").status_code == 404


@pytest.mark.parametrize(
    ("metodo", "corpo"),
    [
        ("get", None),
        ("put", CAMISETA),
        ("patch", {"preco": 10}),
        ("delete", None),
    ],
)
def test_produto_inexistente_retorna_404(client, metodo, corpo):
    resposta = client.request(metodo, "/produtos/99", json=corpo)

    assert resposta.status_code == 404


def test_id_em_formato_invalido_retorna_422(client):
    resposta = client.get("/produtos/abc")

    assert resposta.status_code == 422
