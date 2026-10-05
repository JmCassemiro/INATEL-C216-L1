from app.schemas.produto import Produto, ProdutoCreate, ProdutoUpdate


class ProdutoNaoEncontrado(Exception):
    def __init__(self, produto_id: int) -> None:
        super().__init__(f"Produto {produto_id} nao encontrado")


class ProdutoService:
    """Regras do cadastro de produtos, com os dados mantidos em memoria."""

    def __init__(self) -> None:
        self._produtos: dict[int, Produto] = {}
        self._proximo_id = 1

    def listar(self, limit: int) -> list[Produto]:
        return list(self._produtos.values())[:limit]

    def obter(self, produto_id: int) -> Produto:
        try:
            return self._produtos[produto_id]
        except KeyError:
            raise ProdutoNaoEncontrado(produto_id) from None

    def criar(self, dados: ProdutoCreate) -> Produto:
        produto = Produto(id=self._proximo_id, **dados.model_dump())
        self._produtos[produto.id] = produto
        self._proximo_id += 1
        return produto

    def substituir(self, produto_id: int, dados: ProdutoCreate) -> Produto:
        self.obter(produto_id)
        produto = Produto(id=produto_id, **dados.model_dump())
        self._produtos[produto_id] = produto
        return produto

    def atualizar(self, produto_id: int, dados: ProdutoUpdate) -> Produto:
        atual = self.obter(produto_id)
        produto = atual.model_copy(update=dados.model_dump(exclude_unset=True))
        self._produtos[produto_id] = produto
        return produto

    def remover(self, produto_id: int) -> None:
        self.obter(produto_id)
        del self._produtos[produto_id]
