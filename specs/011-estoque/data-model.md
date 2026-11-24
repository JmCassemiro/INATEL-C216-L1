# Data Model: Controle de Estoque

**Feature**: [spec.md](spec.md) | **Plano**: [plan.md](plan.md) | **Decisões**:
[research.md](research.md)

---

## 1. Domínio (back-end, `app/domain/`)

### Product (alterado, `product.py`)

| Atributo | Tipo | Regra |
|---|---|---|
| `id`, `name`, `description`, `barcode`, `price`, `removed_at` | — | sem mudança (spec 002) |
| `min_stock` | `int` | 0 a 99.999 (`normalize_min_stock`); padrão 0. Muda por `create` e `updated` |
| `stock_quantity` | `int` | 0 a 999.999; padrão 0. **Só leitura no cadastro**: `create` começa em 0 e `updated` mantém o valor lido; só o `StockRepository` grava (D2) |

Propriedades derivadas (delegam às funções de `stock.py`):

| Propriedade | Regra |
|---|---|
| `shortfall` | `max(min_stock - stock_quantity, 0)` |
| `needs_restock` | `stock_quantity < min_stock` (com mínimo 0, sempre falso) |
| `stock_status` | `OUT_OF_STOCK` se `stock_quantity == 0`; senão `RESTOCK` se `needs_restock`; senão `OK` |

### StockChange (novo, `stock.py`)

Pedido de movimentação já validado; imutável.

| Atributo | Tipo | Regra |
|---|---|---|
| `kind` | `MovementKind` | `ENTRY` ou `ADJUSTMENT` |
| `quantity` | `int` | entrada: 1 a 99.999; ajuste: -99.999 a 99.999, nunca 0 |
| `note` | `str \| None` | entrada: opcional, até 200 caracteres (pontas aparadas; vazio vira `None`); ajuste: motivo obrigatório, 3 a 200 caracteres aparados |

| Construtor | Erros (`InvalidDataError`, com o campo) |
|---|---|
| `StockChange.entry(quantity, note)` | `quantity` fora da faixa; `note` longa demais |
| `StockChange.adjustment(quantity, reason)` | `quantity` zero ou fora da faixa; `reason` curto, vazio ou longo demais |

`apply(product_id, balance, sequence, at) -> StockMovement`:

1. `new_balance = balance + quantity`;
2. `new_balance < 0` → `InsufficientStockError(available=balance)`;
3. `new_balance > 999.999` → `StockLimitExceededError()`;
4. devolve a movimentação com `balance_after = new_balance`.

### StockMovement (novo, `stock.py`)

Registro imutável; nunca editado nem apagado (FR-008).

| Atributo | Tipo | Observação |
|---|---|---|
| `id` | `UUID` | v7, gerado em `apply` |
| `product_id` | `UUID` | |
| `sequence` | `int` | 1, 2, 3… por produto, na ordem de aplicação (D5) |
| `kind` | `MovementKind` | |
| `quantity` | `int` | com sinal |
| `balance_after` | `int` | saldo logo depois desta movimentação |
| `note` | `str \| None` | observação da entrada ou motivo do ajuste |
| `occurred_at` | `datetime` | UTC, do relógio do serviço |

Invariantes (FR-010), verificados por teste: `balance_after(n) = balance_after(n-1) + quantity(n)`
(com `balance_after(0) = 0`) e `Σ quantity = stock_quantity` do produto.

### StockSummary (novo, `stock.py`)

| Atributo | Tipo | Regra |
|---|---|---|
| `restock_count` | `int` | produtos ativos com `needs_restock` |
| `out_of_stock_count` | `int` | produtos ativos com saldo 0 |
| `stock_value` | `Decimal` | Σ `stock_quantity × price` dos ativos, 2 casas |

### Erros novos (`errors.py`)

| Erro | Categoria | HTTP | Mensagem |
|---|---|---|---|
| `InsufficientStockError(available)` | `ConflictError` | 409 | "Saldo insuficiente: há {n} unidade(s) em estoque" (`1 unidade`, `3 unidades`, `0 unidades`) |
| `StockLimitExceededError` | `ConflictError` | 409 | "O saldo não pode passar de 999.999 unidades" |

## 2. Aplicação (`app/application/`)

| Item | Mudança |
|---|---|
| `commands.ProductData` | + `min_stock: int = 0` |
| `commands.ProductChanges` | + `min_stock: int \| Unset` |
| `commands.ProductOrder` (novo enum) | `NEWEST` (padrão), `NAME`, `SHORTFALL` |
| `ports.ProductRepository.list` | + argumentos nomeados `restock_only: bool = False`, `order: ProductOrder = NEWEST`; `update` não grava `stock_quantity` |
| `ports.StockRepository` (novo) | `record`, `movements`, `summary` ([research D6](research.md#d6--porta-stockrepository-o-repositório-garante-a-atomicidade)) |
| `services.ProductService.list` | repassa `restock_only` e `order` |
| `services.StockService` (novo) | `register_entry(product_id, quantity, note)`, `adjust(product_id, quantity, reason)`, `movements(product_id, page, size) -> Page[StockMovement]`, `summary()`; relógio injetável, como o `ProductService` |

## 3. Banco (PostgreSQL; migração nova depois de `799308dbf8c8`)

### `products` (alterada)

| Coluna | Tipo | Restrição |
|---|---|---|
| `stock_quantity` | `INTEGER NOT NULL DEFAULT 0` | `ck_products_stock_quantity_range`: `stock_quantity BETWEEN 0 AND 999999` |
| `min_stock` | `INTEGER NOT NULL DEFAULT 0` | `ck_products_min_stock_range`: `min_stock BETWEEN 0 AND 99999` |

### `stock_movements` (nova)

| Coluna | Tipo | Restrição |
|---|---|---|
| `id` | `UUID` | `pk_stock_movements` |
| `product_id` | `UUID NOT NULL` | `fk_stock_movements_product_id_products` → `products.id` |
| `sequence` | `INTEGER NOT NULL` | `uq_stock_movements_product_id` em `(product_id, sequence)` (também serve de índice do histórico) |
| `kind` | `VARCHAR(16) NOT NULL` | `ck_stock_movements_kind`: `kind IN ('entry', 'adjustment')` |
| `quantity` | `INTEGER NOT NULL` | `ck_stock_movements_quantity_not_zero`: `quantity <> 0` |
| `balance_after` | `INTEGER NOT NULL` | `ck_stock_movements_balance_not_negative`: `balance_after >= 0` |
| `note` | `VARCHAR(200)` | nulo na entrada sem observação |
| `occurred_at` | `TIMESTAMP WITH TIME ZONE NOT NULL` | |

Produtos existentes ficam com saldo 0, mínimo 0 e nenhuma movimentação. Produtos nunca são
apagados (remoção é inativação), então a chave estrangeira não precisa de `ON DELETE`.

## 4. Front-end (`frontend/src/`)

### Tipos

```ts
// features/products/types.ts (alterado)
type StockStatus = "out_of_stock" | "restock" | "ok";
type Product = {
  id: string; name: string; description: string | null; barcode: string; price: string;
  stock_quantity: number; min_stock: number; shortfall: number; stock_status: StockStatus;
};
type ProductInput = {            // deixa de ser Omit<Product, "id">
  name: string; description: string | null; barcode: string; price: string; min_stock: number;
};

// features/stock/types.ts (novo)
type MovementKind = "entry" | "adjustment";
type StockMovement = {
  id: string; product_id: string; sequence: number; kind: MovementKind;
  quantity: number; balance_after: number; note: string | null; occurred_at: string;
};
type MovementPage = { items: StockMovement[]; total: number; page: number; size: number };
type StockSummary = { restock_count: number; out_of_stock_count: number; stock_value: string };
type EntryInput = { quantity: number; note: string | null };
type AdjustmentInput = { quantity: number; reason: string };   // quantidade com sinal
```

### Estado na URL da seção Estoque

| Parâmetro | Valores | Padrão (some da URL) |
|---|---|---|
| `search` | termo aparado | vazio |
| `page` | inteiro ≥ 1 (inválido vira 1) | 1 |
| `view` | `restock` | todos os produtos |

`view=restock` → `GET /products?restock=true&sort=shortfall`; sem `view` → `GET
/products?sort=name`. Trocar a visão volta à página 1.

### Formulários

| Formulário | Campo (texto digitado) | Regra no navegador | Enviado como |
|---|---|---|---|
| Produto | Estoque mínimo | vazio = 0; inteiro de 0 a 99.999 (`parseQuantity`) | `min_stock` |
| Entrada | Quantidade | obrigatório; inteiro de 1 a 99.999 | `quantity` |
| Entrada | Observação | opcional; até 200 caracteres | `note` (vazio → `null`) |
| Ajuste | Adicionar / Retirar | obrigatório; começa em "Retirar" | sinal de `quantity` |
| Ajuste | Quantidade | obrigatório; inteiro de 1 a 99.999 | `quantity` (negativo se "Retirar") |
| Ajuste | Motivo | obrigatório; 3 a 200 caracteres aparados | `reason` |

O ajuste "Retirar" maior que o saldo exibido já é recusado no navegador, com a mesma mensagem
do servidor; o servidor continua sendo a autoridade (o saldo pode ter mudado, research D4).

### Estados das telas

| Tela | Estados |
|---|---|
| Seção Estoque (lista) | carregando (esqueleto), erro com "Tentar de novo", catálogo vazio (atalho para Produtos), busca sem resultado (limpar busca), nenhum produto para repor (visão `restock`), lista |
| Indicadores | carregando (esqueleto), erro ("—"), valores |
| Diálogos de entrada e ajuste | editando, enviando (botão desabilitado com indicador), erro por campo, erro geral, sucesso (fecha + aviso) |
| Histórico | carregando, erro com "Tentar de novo", sem movimentações (atalho "Registrar entrada"), lista paginada |
