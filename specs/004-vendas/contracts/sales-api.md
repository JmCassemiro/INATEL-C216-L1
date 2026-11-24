# Contrato da API: vendas

**Feature**: [../spec.md](../spec.md) | **Decisões**: [../research.md](../research.md) (D6, D7, D9)

Valores em dinheiro são texto com duas casas (`"87.50"`), como o preço dos produtos. Datas em ISO
8601 com fuso. Erros de validação seguem o formato 422 do FastAPI (`detail[].loc`, `msg`).

---

## 1. `POST /sales` — registrar uma venda

```json
{
  "id": "0193a7c2-5f1e-7c3a-9d2b-1f4e6a8b0c11",
  "items": [
    { "product_id": "…", "quantity": 2, "unit_price": "49.90" },
    { "product_id": "…", "quantity": 1, "unit_price": "37.70" }
  ],
  "payments": [
    { "method": "pix", "amount": "50.00" },
    { "method": "cash", "amount": "100.00" }
  ]
}
```

| Campo | Regra |
|---|---|
| `id` | UUID criado pelo cliente; chave de idempotência |
| `items` | 1 a 100, sem `product_id` repetido |
| `items[].quantity` | `StrictInt` de 1 a 999 |
| `items[].unit_price` | preço que o cliente mostrou; texto ou número inteiro, > 0, até 2 casas |
| `payments` | 1 a 5 |
| `payments[].method` | `cash`, `pix`, `credit_card` ou `debit_card` |
| `payments[].amount` | > 0, até 2 casas, até 999999.99 |

**Respostas**

| Status | Quando | Corpo |
|---|---|---|
| 201 | venda registrada agora; cabeçalho `Location: /sales/{id}` | a venda (§3) |
| 200 | já havia venda com esse `id`; nada muda | a venda já registrada |
| 409 | algum item recusado (§4) | `detail` + `problems` |
| 422 | forma inválida ou pagamentos que não fecham com o total | erros por campo (`items`, `payments`, …) |

Mensagens de 422 no campo `payments`:

- "Os pagamentos não cobrem o total: faltam R$ {x}"
- "Só o pagamento em dinheiro pode passar do total e gerar troco"
- "O troco não pode ser igual ou maior que o valor pago em dinheiro"

No campo `items`: "Inclua pelo menos um item", "A venda pode ter no máximo 100 itens", "Produto
repetido na venda", "O total da venda passa de R$ 999.999,99".

## 2. Consultas

| Rota | Resposta |
|---|---|
| `GET /sales?page=1&size=10` | `{"items": [venda…], "total", "page", "size"}`, do maior número para o menor; `size` até o máximo das outras listagens |
| `GET /sales/{id}` | a venda; 404 `{"detail": "Venda não encontrada"}` |
| `GET /sales/summary?start=…&end=…` | `{"count": 2, "revenue": "237.60", "average_ticket": "118.80"}` das vendas com `start ≤ occurred_at < end`; `start` e `end` obrigatórios, com fuso; `end <= start` → 422 |

## 3. Venda

```json
{
  "id": "0193a7c2-5f1e-7c3a-9d2b-1f4e6a8b0c11",
  "number": 12,
  "occurred_at": "2026-11-25T17:35:12.481Z",
  "items": [
    { "product_id": "…", "name": "Camiseta Básica Branca M", "barcode": "7891234567895",
      "unit_price": "49.90", "quantity": 2, "subtotal": "99.80" },
    { "product_id": "…", "name": "Meia Cano Curto", "barcode": "7890000000017",
      "unit_price": "37.70", "quantity": 1, "subtotal": "37.70" }
  ],
  "payments": [
    { "method": "pix", "amount": "50.00" },
    { "method": "cash", "amount": "100.00" }
  ],
  "total": "137.50",
  "paid": "150.00",
  "change": "12.50",
  "item_count": 3
}
```

`items` e `payments` saem na ordem em que foram enviados.

## 4. Recusa (409)

```json
{
  "detail": "Não foi possível finalizar a venda. Revise os itens destacados.",
  "problems": [
    { "product_id": "…", "reason": "insufficient_stock", "available": 1,
      "message": "Há só 1 un. de Camiseta Básica Branca M em estoque" },
    { "product_id": "…", "reason": "price_changed", "current_price": "39.90",
      "message": "O preço de Meia Cano Curto mudou para R$ 39,90" },
    { "product_id": "…", "reason": "unavailable",
      "message": "Boné Aba Reta não está mais à venda" }
  ]
}
```

Nada é gravado: nem venda, nem baixa, nem movimentação.

## 5. Efeito no estoque

Cada item registrado gera, no histórico do produto (`GET /products/{id}/stock/movements`), uma
movimentação com `kind: "sale"`, `quantity` negativa, `balance_after` e `note: "Venda nº {número}"`.
O `stock_quantity` do produto diminui a quantidade vendida.

## 6. CORS

Sem método novo: `GET` e `POST` já são liberados. Preflight de `POST /sales` testado.
