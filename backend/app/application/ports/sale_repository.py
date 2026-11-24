import builtins
from datetime import datetime
from typing import Protocol
from uuid import UUID

from app.domain.sale import Sale, SaleOrder, SalesSummary


class SaleRepository(Protocol):
    """Vendas registradas (spec 004, research D5 e D6).

    `register` é o único caminho de escrita de uma venda e baixa o estoque dos itens
    na mesma operação: ou tudo é gravado, ou nada. Os produtos da venda ficam
    bloqueados do momento em que são lidos até a gravação, sempre na mesma ordem (por
    id), para que vendas e movimentações simultâneas não se percam nem travem.
    """

    def register(self, order: SaleOrder, at: datetime) -> tuple[Sale, bool]:
        """Registra a venda e baixa o estoque; devolve a venda e se foi criada agora.

        Se já existe venda com `order.id`, devolve-a com `False`, sem alterar nada
        (idempotência). Levanta `SaleRejectedError` e `InvalidDataError` do domínio
        sem gravar nada.
        """
        ...

    def get(self, sale_id: UUID) -> Sale:
        """A venda com esse id; `SaleNotFoundError` se não existe."""
        ...

    def list(self, offset: int, limit: int) -> tuple[builtins.list[Sale], int]:
        """Vendas do maior número para o menor, com o total."""
        ...

    def summary(self, start: datetime, end: datetime) -> SalesSummary:
        """Indicadores das vendas com `start <= occurred_at < end`."""
        ...
