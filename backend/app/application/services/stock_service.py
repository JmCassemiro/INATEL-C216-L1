from collections.abc import Callable
from datetime import UTC, datetime
from uuid import UUID

from app.application.pagination import Page
from app.application.ports.stock_repository import StockRepository
from app.domain.stock import StockChange, StockMovement, StockSummary


def _utc_now() -> datetime:
    return datetime.now(UTC)


class StockService:
    """Casos de uso do estoque (spec 011, research D6).

    O serviço só orquestra: cria o pedido de movimentação (o domínio o valida), passa o
    relógio e delega ao repositório, que aplica a mudança ao saldo de forma atômica.
    """

    def __init__(
        self,
        repository: StockRepository,
        clock: Callable[[], datetime] = _utc_now,
    ) -> None:
        self._repository = repository
        self._clock = clock

    def register_entry(
        self, product_id: UUID, quantity: int, note: str | None = None
    ) -> StockMovement:
        """Entrada de mercadoria (FR-003)."""
        change = StockChange.entry(quantity, note)
        return self._repository.record(product_id, change, self._clock())

    def adjust(self, product_id: UUID, quantity: int, reason: str) -> StockMovement:
        """Ajuste com sinal e motivo obrigatório (FR-005)."""
        change = StockChange.adjustment(quantity, reason)
        return self._repository.record(product_id, change, self._clock())

    def movements(self, product_id: UUID, page: int, size: int) -> Page[StockMovement]:
        """Histórico do produto, do mais recente ao mais antigo (FR-009)."""
        items, total = self._repository.movements(product_id, (page - 1) * size, size)
        return Page(items=items, total=total, page=page, size=size)

    def summary(self) -> StockSummary:
        """Indicadores do estoque (FR-018)."""
        return self._repository.summary()
