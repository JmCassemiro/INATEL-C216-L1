import pytest

from app.schemas.produto import ProdutoCreate, ProdutoUpdate
from app.services.produto import ProdutoNaoEncontrado, ProdutoService


@pytest.fixture
def service():
    return ProdutoService()


@pytest.fixture
def camiseta():
    return ProdutoCreate(nome="Camiseta", descricao="Branca M", preco=49.9)


def test_criar_atribui_ids_sequenciais(service, camiseta):
    primeiro = service.criar(camiseta)
    segundo = service.criar(camiseta)

    assert (primeiro.id, segundo.id) == (1, 2)
    assert primeiro.nome == "Camiseta"


def test_listar_respeita_o_limite(service, camiseta):
    for _ in range(3):
        service.criar(camiseta)

    assert len(service.listar(limit=2)) == 2


def test_obter_produto_inexistente_lanca_erro(service):
    with pytest.raises(ProdutoNaoEncontrado):
        service.obter(99)


def test_substituir_troca_todos_os_dados_e_mantem_o_id(service, camiseta):
    criado = service.criar(camiseta)

    novo = service.substituir(criado.id, ProdutoCreate(nome="Calça", preco=99.9))

    assert novo.id == criado.id
    assert (novo.nome, novo.descricao, novo.preco) == ("Calça", None, 99.9)


def test_atualizar_muda_apenas_os_campos_enviados(service, camiseta):
    criado = service.criar(camiseta)

    alterado = service.atualizar(criado.id, ProdutoUpdate(preco=44.9))

    assert alterado.preco == 44.9
    assert (alterado.nome, alterado.descricao) == ("Camiseta", "Branca M")


def test_remover_tira_o_produto_do_catalogo(service, camiseta):
    criado = service.criar(camiseta)

    service.remover(criado.id)

    with pytest.raises(ProdutoNaoEncontrado):
        service.obter(criado.id)


@pytest.mark.parametrize("operacao", ["substituir", "atualizar", "remover"])
def test_operacoes_em_produto_inexistente_lancam_erro(service, camiseta, operacao):
    argumentos = {
        "substituir": (99, camiseta),
        "atualizar": (99, ProdutoUpdate(preco=1)),
        "remover": (99,),
    }[operacao]

    with pytest.raises(ProdutoNaoEncontrado):
        getattr(service, operacao)(*argumentos)
