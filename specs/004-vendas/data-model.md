# Data Model: Venda Mínima

**Feature**: [spec.md](spec.md) | **Decisões**: [research.md](research.md)

## 1. Domínio (`backend/app/domain/sale.py`)

### Limites

| Constante | Valor | Regra |
|---|---|---|
| `MAX_SALE_LINES` | 100 | itens distintos por venda (FR-008) |
| `MAX_LINE_QUANTITY` | 999 | unidades por item (FR-005) |
| `MAX_PAYMENTS` | 5 | pagamentos por venda (FR-009) |
| `MAX_SALE_TOTAL` | 999.999,99 | total da venda (FR-008) |
| `MAX_PAYMENT_AMOUNT` | 999.999,99 | valor de um pagamento |

### Tipos

| Tipo | Campos | Regras |
|---|---|---|
| `PaymentMethod` (StrEnum) | `cash`, `pix`, `credit_card`, `debit_card` | rótulos no painel: Dinheiro, Pix, Cartão de crédito, Cartão de débito |
| `Payment` | `method`, `amount: Decimal` | valor > 0, até 2 casas, até 999.999,99; `float` recusado (como `Price`) |
| `SaleLine` | `product_id`, `quantity: int`, `unit_price: Price` | quantidade inteira de 1 a 999; `unit_price` é o preço que o caixa mostrou |
| `SaleOrder` | `id: UUID`, `lines: tuple[SaleLine, ...]`, `payments: tuple[Payment, ...]` | `create` valida: 1 a 100 linhas, sem produto repetido, 1 a 5 pagamentos |
| `SaleProblem` | `product_id`, `reason`, `message`, `available: int \| None`, `current_price: Decimal \| None` | `reason`: `unavailable`, `price_changed`, `insufficient_stock` |
| `Checkout` | `order_id`, `items: tuple[SaleItem, ...]`, `payments`, `total`, `paid`, `change` | resultado de `SaleOrder.checkout(products)`; `register(number, at) -> Sale` |
| `SaleItem` | `product_id`, `name`, `barcode`, `unit_price`, `quantity`, `subtotal` | cópia do produto no momento da venda; `subtotal = unit_price × quantity` |
| `Sale` | `id`, `number`, `occurred_at`, `items`, `payments`, `total`, `paid`, `change`; propriedade `item_count` | imutável (FR-017, FR-018); `item_count` = soma das quantidades |
| `SalesSummary` | `count`, `revenue`, `average_ticket` | ticket = receita / quantidade, arredondado ao centavo (meio centavo para cima); 0 sem vendas |

### `SaleOrder.checkout(products: Mapping[UUID, Product]) -> Checkout`

1. Para cada linha, na ordem do pedido, um problema por linha (o primeiro que se aplica):
   - produto ausente do mapa ou removido → `unavailable` ("{nome} não está mais à venda", ou
     "Produto não está mais à venda" quando não há nome);
   - preço atual ≠ `unit_price` → `price_changed`, com `current_price` ("O preço de {nome} mudou
     para R$ X");
   - saldo < quantidade → `insufficient_stock`, com `available` ("Há só {n} un. de {nome} em
     estoque").
2. Com algum problema → `SaleRejectedError(problems)` (409), sem efeito.
3. Itens com subtotal; total = soma. Total > 999.999,99 → `InvalidDataError("items", …)`.
4. Regras de pagamento (research D3) → `InvalidDataError("payments", …)`.
5. Troco = pago − total.

### Mudanças em módulos existentes

| Módulo | Mudança |
|---|---|
| `stock.py` | `MovementKind.SALE = "sale"`; `StockChange.sale(quantity, sale_number)` → quantidade negativa, texto "Venda nº {n}" |
| `errors.py` | `SaleRejectedError(ConflictError)` com `problems`; `SaleNotFoundError(NotFoundError)` ("Venda não encontrada") |

## 2. Aplicação

| Peça | Responsabilidade |
|---|---|
| `ports/sale_repository.py` — `SaleRepository` | `register(order, at) -> tuple[Sale, bool]` (atômico, idempotente; research D5, D6); `get(sale_id) -> Sale` (`SaleNotFoundError`); `list(offset, limit) -> (list[Sale], total)` (maior número primeiro); `summary(start, end) -> SalesSummary` |
| `services/sale_service.py` — `SaleService` | `register(sale_id, lines, payments) -> SaleRegistration` (cria o `SaleOrder`, passa o relógio, delega); `get`; `list(page, size) -> Page[Sale]`; `summary(start, end)` (recusa `end <= start` com `InvalidDataError`) |
| `commands.py` | `SaleLineData(product_id, quantity, unit_price)` e `PaymentData(method, amount)`: dados crus vindos da borda |

`SaleRegistration` é `(sale, created)`: a rota responde 201 ou 200 por ele.

## 3. Banco (migração nova, `revises 330c84df2ee3`)

### `sales`

| Coluna | Tipo | Regra |
|---|---|---|
| `number` | `INTEGER` PK autoincremental | atribuído na inserção (research D4) |
| `id` | `UUID` único, não nulo | gerado pelo painel; chave de idempotência |
| `occurred_at` | `TIMESTAMPTZ` | relógio do servidor, UTC |
| `total` | `NUMERIC(10,2)` | `CHECK total > 0` |
| `paid` | `NUMERIC(10,2)` | `CHECK paid >= total` |
| `change` | `NUMERIC(10,2)` | `CHECK change >= 0` |

Não há `CHECK paid - change = total`: no SQLite dos testes, `NUMERIC` vira ponto flutuante e a
igualdade exata de uma subtração falharia (10,30 − 0,20 ≠ 10,10); a regra é do domínio e é testada
lá e no contrato do repositório.

### `sale_items`

| Coluna | Tipo | Regra |
|---|---|---|
| `sale_id` | `UUID` FK → `sales.id` | PK (`sale_id`, `position`) |
| `position` | `INTEGER` | ordem do item no carrinho (0, 1, …) |
| `product_id` | `UUID` FK → `products.id` | |
| `name` | `VARCHAR(120)` | cópia |
| `barcode` | `VARCHAR(14)` | cópia |
| `unit_price` | `NUMERIC(8,2)` | cópia |
| `quantity` | `INTEGER` | `CHECK quantity BETWEEN 1 AND 999` |
| `subtotal` | `NUMERIC(10,2)` | |

### `sale_payments`

| Coluna | Tipo | Regra |
|---|---|---|
| `sale_id` | `UUID` FK → `sales.id` | PK (`sale_id`, `position`) |
| `position` | `INTEGER` | ordem do pagamento |
| `method` | `VARCHAR(16)` | `CHECK method IN ('cash', 'pix', 'credit_card', 'debit_card')` |
| `amount` | `NUMERIC(8,2)` | `CHECK amount > 0` |

### `stock_movements`

`CHECK kind IN ('entry', 'adjustment', 'sale')` (recriado em modo batch).

### Memória (`InMemoryStore`)

Ganha `sales: dict[UUID, Sale]` (em ordem de registro) e o próximo número; o registro roda sob o
mesmo `lock` de produtos e estoque.

## 4. Front-end

### Tipos (`features/sales/types.ts`)

```ts
type PaymentMethod = "cash" | "pix" | "credit_card" | "debit_card";
type Payment = { method: PaymentMethod; amount: string };        // "87.50"
type SaleItem = { product_id: string; name: string; barcode: string;
                  unit_price: string; quantity: number; subtotal: string };
type Sale = { id: string; number: number; occurred_at: string; items: SaleItem[];
              payments: Payment[]; total: string; paid: string; change: string;
              item_count: number };
type SalePage = { items: Sale[]; total: number; page: number; size: number };
type SalesSummary = { count: number; revenue: string; average_ticket: string };
type SaleInput = { id: string;
                   items: { product_id: string; quantity: number; unit_price: string }[];
                   payments: Payment[] };
type SaleProblem = { product_id: string;
                     reason: "unavailable" | "price_changed" | "insufficient_stock";
                     message: string; available?: number; current_price?: string };
```

`StockMovement.kind` (features/stock) ganha `"sale"`, exibido como "Venda".

### Carrinho (`features/sales/cart.ts`)

```ts
type CartLine = { product: Product; quantity: number;     // produto como foi lido
                  problem: SaleProblem | null };
type Cart = { saleId: string; lines: CartLine[]; payments: Payment[] };
```

| Derivado | Regra |
|---|---|
| `total(cart)` | soma de `price × quantity`, em centavos |
| `paid(cart)` | soma dos pagamentos, em centavos |
| `remaining(cart)` | `max(total − paid, 0)` |
| `change(cart)` | `max(paid − total, 0)` |
| `paymentError(cart, novo)` | as regras de D3 aplicadas antes de adicionar o pagamento |
| `canFinish(cart)` | há linhas, nenhuma com problema, pago ≥ total e regras de D3 cumpridas |

Ações: `add(product)` (soma 1 se já existe; recusa sem estoque ou no limite do saldo), `setQuantity`
(1 a 999, até o saldo conhecido), `remove`, `addPayment`, `removePayment`, `applyProblems(problems)`
(research D16), `reset()` (novo `saleId`, carrinho vazio).

### Estados das telas

| Tela | Estados |
|---|---|
| Nova venda | carrinho vazio (convite a ler o primeiro código); montando; finalizando (botão desabilitado, "Finalizando…"); recusada (alerta + linhas marcadas); falha de rede (alerta, carrinho mantido); comprovante |
| Histórico | carregando; nenhuma venda (com o atalho "Nova venda"); lista; erro com "Tentar de novo" |
| Indicadores | carregando; valores; erro (os indicadores somem, sem bloquear a lista) |
