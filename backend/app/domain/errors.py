"""Erros de domínio, agrupados por categoria.

A borda HTTP traduz cada categoria num status (D8); o domínio não conhece HTTP.
"""


class DomainError(Exception):
    """Base de todos os erros de domínio."""


class InvalidDataError(DomainError, ValueError):
    """Dado que viola uma regra do domínio.

    Também é `ValueError` para que o Pydantic o converta em erro de validação comum.
    `field` é `None` quando o erro é do corpo inteiro.
    """

    def __init__(self, field: str | None, message: str) -> None:
        super().__init__(message)
        self.field = field


class NotFoundError(DomainError):
    """O recurso pedido não existe (ou não está mais ativo)."""


class ConflictError(DomainError):
    """A operação conflita com o estado atual do catálogo."""


class ProductNotFoundError(NotFoundError):
    def __init__(self) -> None:
        super().__init__("Produto não encontrado")


class DuplicateBarcodeError(ConflictError):
    def __init__(self) -> None:
        super().__init__("Código de barras já cadastrado")
