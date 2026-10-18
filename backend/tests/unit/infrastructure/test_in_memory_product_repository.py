"""Garantias próprias do repositório em memória; o contrato da porta fica em
`tests/integration/test_product_repository_contract.py`."""

import time
from decimal import Decimal

from app.domain.barcode import Barcode
from app.domain.product import Product
from app.infrastructure.repositories.in_memory_product_repository import (
    InMemoryProductRepository,
)
from tests.helpers import gtin13


def make_product(barcode: str) -> Product:
    return Product.create("Camiseta", None, barcode, Decimal("49.90"))


def test_get_by_barcode_is_fast_with_10000_products():
    """SC-004: com 10.000 produtos, a busca por código responde em menos de 1 s."""
    repository = InMemoryProductRepository()
    for number in range(10_000):
        repository.add(make_product(gtin13(number)))
    target = Barcode(gtin13(9_999))

    start = time.perf_counter()
    found = repository.get_by_barcode(target)
    elapsed = time.perf_counter() - start

    assert found is not None
    assert elapsed < 1
