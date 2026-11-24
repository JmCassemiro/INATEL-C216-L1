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


class InsufficientStockError(ConflictError):
    """A retirada deixaria o saldo negativo (spec 011, FR-006)."""

    def __init__(self, available: int) -> None:
        super().__init__(f"Saldo insuficiente: há {_units(available)} em estoque")
        self.available = available


class StockLimitExceededError(ConflictError):
    """A movimentação levaria o saldo acima do teto (spec 011, FR-004)."""

    def __init__(self) -> None:
        super().__init__("O saldo não pode passar de 999.999 unidades")


def _units(quantity: int) -> str:
    """Quantidade no formato brasileiro, com a palavra no singular ou no plural."""
    number = f"{quantity:,}".replace(",", ".")
    return f"{number} unidade" if quantity == 1 else f"{number} unidades"
