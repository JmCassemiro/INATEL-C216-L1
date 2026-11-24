from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from app.application.commands import PaymentData, SaleLineData
from app.application.pagination import Page
from app.application.ports.sale_repository import SaleRepository
from app.domain.errors import InvalidDataError
from app.domain.sale import Payment, Sale, SaleLine, SaleOrder, SalesSummary


def _utc_now() -> datetime:
    return datetime.now(UTC)


@dataclass(frozen=True, slots=True)
class SaleRegistration:
    """A venda e se ela foi criada agora (201) ou já existia (200) (research D6)."""

    sale: Sale
    created: bool


class SaleService:
    """Casos de uso das vendas (spec 004, research D5).

    O serviço só orquestra: monta o pedido (o domínio valida a forma), passa o relógio
    e delega ao repositório, que registra a venda e baixa o estoque de forma atômica.
    """

    def __init__(
        self,
        repository: SaleRepository,
        clock: Callable[[], datetime] = _utc_now,
    ) -> None:
        self._repository = repository
        self._clock = clock

    def register(
        self, sale_id: UUID, lines: list[SaleLineData], payments: list[PaymentData]
    ) -> SaleRegistration:
        """Registra a venda (FR-013) ou devolve a já registrada com o mesmo id (FR-016).

        A forma do pedido é validada pelo domínio antes de chegar ao repositório.
        """
        order = SaleOrder.create(
            sale_id,
            [
                SaleLine.create(line.product_id, line.quantity, line.unit_price)
                for line in lines
            ],
            [Payment(payment.method, payment.amount) for payment in payments],
        )
        sale, created = self._repository.register(order, self._clock())
        return SaleRegistration(sale, created)

    def get(self, sale_id: UUID) -> Sale:
        """Detalhe da venda (FR-022)."""
        return self._repository.get(sale_id)

    def list(self, page: int, size: int) -> Page[Sale]:
        """Vendas da mais recente para a mais antiga (FR-021)."""
        items, total = self._repository.list((page - 1) * size, size)
        return Page(items=items, total=total, page=page, size=size)

    def summary(self, start: datetime, end: datetime) -> SalesSummary:
        """Indicadores do intervalo `[start, end)` (FR-023)."""
        if end <= start:
            raise InvalidDataError("end", "O fim do período deve ser depois do início")
        return self._repository.summary(start, end)
