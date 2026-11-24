# Contrato HTTP: estoque

**Feature**: [../spec.md](../spec.md) | **Contratos base**:
[spec 002 — `/products`](../../002-produtos/contracts/products-api.md) e
[mudanças da 007](../../007-painel-produtos/contracts/products-api-changes.md)

O contrato de `/products` continua valendo, com os acréscimos abaixo. Erros seguem o formato já
existente: 404 e 409 com `{"detail": "mensagem"}`; 422 com `{"detail": [{"loc": ["body",
"campo"], "msg": "...", "type": "..."}]}` (ou `["query", "parâmetro"]`). Os testes de integração
do back-end verificam cada linha das tabelas.

---

## 1. Produto: campos novos

### Saída (`ProductOutput`, em todas as respostas de produto)

```json
{
  "id": "0193...",
  "name": "Camiseta Básica Branca M",
  "description": null,
  "barcode": "7891000315507",
  "price": "49.90",
  "stock_quantity": 4,
  "min_stock": 10,
  "shortfall": 6,
  "stock_status": "restock"
}
```

| Campo | Tipo | Regra |
|---|---|---|
| `stock_quantity` | inteiro | saldo atual; 0 num produto novo |
| `min_stock` | inteiro | mínimo definido no cadastro |
| `shortfall` | inteiro | `max(min_stock - stock_quantity, 0)` |
| `stock_status` | `"out_of_stock"` \| `"restock"` \| `"ok"` | `out_of_stock` se o saldo é 0; senão `restock` se saldo < mínimo; senão `ok` |

### Entrada (`POST /products`, `PUT /products/{id}`, `PATCH /products/{id}`)

| Campo | Regra | Erro |
|---|---|---|
| `min_stock` | inteiro de 0 a 99.999; opcional (padrão 0 em POST e PUT); no PATCH, `null` é recusado | 422, `loc: ["body", "min_stock"]` |
| `stock_quantity` | **não é aceito como entrada**: se enviado, é ignorado, como qualquer campo desconhecido | — |

Nenhuma operação de cadastro altera `stock_quantity`.

### Listagem (`GET /products`): parâmetros novos

| Parâmetro | Valores | Padrão | Efeito |
|---|---|---|---|
| `restock` | `true` / `false` | `false` | `true`: só produtos com saldo < mínimo |
| `sort` | `newest`, `name`, `shortfall` | `newest` | `newest`: do mais recente ao mais antigo (007); `name`: alfabética, sem diferenciar maiúsculas e acentos; `shortfall`: maior falta primeiro, empate pelo nome |

Valor inválido em `sort` → 422 (`loc: ["query", "sort"]`). `name`, `page` e `size` seguem iguais.
A seção Estoque usa `?sort=name` (todos) e `?restock=true&sort=shortfall` (para repor).

## 2. Entrada de mercadoria

`POST /products/{id}/stock/entries`

```json
{ "quantity": 24, "note": "NF 1234" }
```

| Campo | Regra |
|---|---|
| `quantity` | inteiro estrito de 1 a 99.999 |
| `note` | opcional; até 200 caracteres depois de aparar as pontas; vazio vira `null` |

Resposta **201** com a movimentação:

```json
{
  "id": "0193...",
  "product_id": "0193...",
  "sequence": 3,
  "kind": "entry",
  "quantity": 24,
  "balance_after": 36,
  "note": "NF 1234",
  "occurred_at": "2026-11-24T17:35:02.123456Z"
}
```

## 3. Ajuste

`POST /products/{id}/stock/adjustments`

```json
{ "quantity": -2, "reason": "Avaria no transporte" }
```

| Campo | Regra |
|---|---|
| `quantity` | inteiro estrito de -99.999 a 99.999, diferente de 0; positivo adiciona, negativo retira |
| `reason` | obrigatório; 3 a 200 caracteres depois de aparar as pontas |

Resposta **201** com a movimentação (`kind: "adjustment"`, `quantity: -2`, `note` = o motivo).

## 4. Erros das movimentações

| Situação | Status | Corpo |
|---|---|---|
| produto inexistente ou removido | 404 | `{"detail": "Produto não encontrado"}` |
| `id` que não é UUID | 422 | `loc: ["path", "product_id"]` |
| `quantity` ausente, não inteiro (`"2"`, `2.5`, `true`), zero ou fora da faixa | 422 | `loc: ["body", "quantity"]` |
| `note` com mais de 200 caracteres | 422 | `loc: ["body", "note"]` |
| `reason` ausente, vazio, só espaços, com menos de 3 ou mais de 200 caracteres | 422 | `loc: ["body", "reason"]` |
| retirada maior que o saldo | 409 | `{"detail": "Saldo insuficiente: há 3 unidades em estoque"}` |
| saldo resultante acima de 999.999 | 409 | `{"detail": "O saldo não pode passar de 999.999 unidades"}` |

Em todos os erros, nada é gravado: nem saldo, nem movimentação.

## 5. Histórico

`GET /products/{id}/stock/movements?page=1&size=10`

| Parâmetro | Regra |
|---|---|
| `page` | inteiro ≥ 1; padrão 1 |
| `size` | inteiro de 1 a 100; padrão 20 (o painel usa 10) |

Resposta **200**: `{"items": [StockMovement...], "total": 12, "page": 1, "size": 10}`, da maior
`sequence` para a menor. Produto inexistente ou removido → 404.

## 6. Resumo

`GET /stock/summary`

```json
{ "restock_count": 3, "out_of_stock_count": 1, "stock_value": "12345.60" }
```

| Campo | Regra |
|---|---|
| `restock_count` | produtos ativos com saldo < mínimo |
| `out_of_stock_count` | produtos ativos com saldo 0 |
| `stock_value` | Σ saldo × preço dos produtos ativos, decimal com 2 casas, como texto |

## 7. CORS

Sem mudança: as rotas novas usam `GET` e `POST`, já liberados. Verificado: preflight de
`POST /products/{id}/stock/entries` vindo do front-end → 200.

## 8. Concorrência (garantia do contrato)

Movimentações simultâneas sobre o mesmo produto são aplicadas uma de cada vez: cada uma vê o
saldo deixado pela anterior, nenhuma se perde, e as recusas de saldo (409) valem sobre o saldo
real do momento. Movimentações em produtos diferentes não esperam umas pelas outras.
