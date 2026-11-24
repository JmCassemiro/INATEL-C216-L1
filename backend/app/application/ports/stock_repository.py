import builtins
from datetime import datetime
from typing import Protocol
from uuid import UUID

from app.domain.stock import StockChange, StockMovement, StockSummary


class StockRepository(Protocol):
    """Saldo e movimentações de estoque (spec 011, research D6).

    É o único caminho de escrita do saldo. Cada implementação garante que ler o saldo,
    aplicar a regra do domínio e gravar o resultado sejam uma operação só: duas
    movimentações simultâneas no mesmo produto nunca leem o mesmo saldo (D4).
    """

    def record(
        self, product_id: UUID, change: StockChange, at: datetime
    ) -> StockMovement:
        """Aplica a mudança ao saldo atual do produto ativo e grava a movimentação.

        Levanta `ProductNotFoundError` se o produto não existe ou foi removido e os
        erros do domínio (`InsufficientStockError`, `StockLimitExceededError`) sem
        gravar nada.
        """
        ...

    def movements(
        self, product_id: UUID, offset: int, limit: int
    ) -> tuple[builtins.list[StockMovement], int]:
        """Movimentações do produto ativo, da mais recente à mais antiga, com o total.

        Levanta `ProductNotFoundError` se o produto não existe ou foi removido.
        """
        ...

    def summary(self) -> StockSummary:
        """Indicadores dos ativos: para repor, sem estoque e valor em estoque."""
        ...
