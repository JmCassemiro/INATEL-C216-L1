# Contrato HTTP: `/products`

**Feature**: [../spec.md](../spec.md) | **Modelo**: [../data-model.md](../data-model.md)

Contrato da borda HTTP do cadastro de produtos. O OpenAPI gerado pelo FastAPI (`/docs`) é a
referência executável; este documento fixa o comportamento que os testes de integração verificam.
A rota `GET /` (Prática 2) continua igual (RP-008).

---

## Representações

### `ProductInput` (corpo de POST e PUT)

| Campo | Tipo JSON | Obrigatório | Regras |
|---|---|---|---|
| `name` | string | sim | 1–120 caracteres após remover espaços das pontas |
| `description` | string \| null | não (padrão `null`) | até 500 caracteres; vazia vira `null` |
| `barcode` | string | sim | GTIN-8/12/13/14 com dígito verificador válido; número JSON é recusado |
| `price` | number \| string | sim | `> 0`, até 2 casas, `≤ 999999.99` |

### `ProductChangesInput` (corpo de PATCH)

Mesmos campos, todos opcionais. Pelo menos um precisa ser enviado. `description: null` (ou `""`)
remove a descrição; `null` em `name`, `barcode` ou `price` é recusado (FR-014).

### `Product` (resposta)

```json
{
  "id": "01a10d8f-bd53-73d4-b442-7934c2c03919",
  "name": "Camiseta Básica Branca M",
  "description": null,
  "barcode": "7891000315507",
  "price": "49.90"
}
```

`price` sempre sai como string com duas casas; `barcode` sai como foi cadastrado. Produtos
removidos nunca aparecem em respostas.

### `ProductPageOutput` (resposta da listagem)

```json
{ "items": [ /* Product */ ], "total": 25, "page": 1, "size": 10 }
```

### Erros

| Status | Quando | Corpo |
|---|---|---|
| 404 | produto inexistente ou removido | `{"detail": "Produto não encontrado"}` |
| 409 | código de barras já pertence a outro produto (ativo ou removido) | `{"detail": "Código de barras já cadastrado"}` |
| 422 | dado inválido no corpo, no caminho ou na consulta | formato padrão do FastAPI: `{"detail": [{"loc": [...], "msg": "...", "type": "..."}]}`, com o campo em `loc` |

Toda resposta de erro deixa o catálogo inalterado (FR-017).

---

## Operações

| Método e caminho | Sucesso | Erros | Requisitos |
|---|---|---|---|
| `POST /products` | **201** + `Product`; cabeçalho `Location: /products/{id}` | 409, 422 | FR-001–005, RP-001 |
| `GET /products` | **200** + `ProductPageOutput` | 422 | FR-009–011, RP-002 |
| `GET /products/{product_id}` | **200** + `Product` | 404, 422 (id não é UUID) | FR-006, FR-008 |
| `GET /products/barcode/{barcode}` | **200** + `Product` | 404, 422 (GTIN inválido) | FR-007, FR-008 *(extra)* |
| `PUT /products/{product_id}` | **200** + `Product` | 404, 409, 422 | FR-012, FR-015 |
| `PATCH /products/{product_id}` | **200** + `Product` | 404, 409, 422 | FR-013–015 |
| `DELETE /products/{product_id}` | **204** sem corpo | 404, 422 | FR-016, FR-016a |

### Parâmetros de consulta de `GET /products`

| Parâmetro | Tipo | Padrão | Regras |
|---|---|---|---|
| `page` | inteiro | 1 | `≥ 1`; página além da última devolve `items: []` |
| `size` | inteiro | 20 | `1 ≤ size ≤ 100` |
| `name` | string | — | parte do nome, sem diferenciar maiúsculas e acentos *(extra)*; vazio = sem filtro |

### Observações

- `GET /products/barcode/{barcode}` compara pela forma GTIN-14: buscar
  `07891000315507` encontra o produto cadastrado como `7891000315507`.
- `PUT` exige o cadastro completo: omitir `description` deixa o produto sem descrição.
- `DELETE` é inativação: o produto some das consultas, mas o código de barras continua reservado
  (um novo `POST` com ele devolve 409).

## Mudanças em relação à Prática 4

| Antes (Prática 4) | Agora |
|---|---|
| `id` inteiro sequencial | `id` UUID v7 |
| rotas em `/produtos` e campos em português (`nome`, `descricao`, `preco`) | rotas em `/products` e campos em inglês (`name`, `description`, `price`) |
| `GET /produtos?limit=10` devolvia uma lista | `GET /products?page&size&name` devolve `ProductPageOutput` |
| `preco` como número (`float`) | `price` como string decimal com duas casas |
| sem código de barras | `barcode` obrigatório e único |
| `DELETE` apagava o registro | `DELETE` inativa e reserva o código |
