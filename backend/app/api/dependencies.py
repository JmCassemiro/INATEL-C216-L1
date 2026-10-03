from app.services.produto import ProdutoService

# Unica instancia enquanto a aplicacao estiver no ar (os dados ficam em memoria).
_produto_service = ProdutoService()


def get_produto_service() -> ProdutoService:
    return _produto_service
