# Data Model: Painel de Produtos

**Feature**: [spec.md](spec.md) | **Pesquisa**: [research.md](research.md)

A spec 007 não cria entidade de domínio nova: o **Produto** é o da spec 002
([data-model da 002](../002-produtos/data-model.md)). Este documento descreve como o painel
representa esses dados, os estados das telas e a única mudança no banco (a saída da tabela
`items`).

---

## 1. Tipos do painel (`frontend/src/features/products/types.ts`)

Espelham o contrato HTTP ([contracts/products-api-changes.md](contracts/products-api-changes.md)).

| Tipo | Campos | Observações |
|---|---|---|
| `Product` | `id: string`, `name: string`, `description: string \| null`, `barcode: string`, `price: string` | `price` chega como string decimal com duas casas (`"49.90"`); nunca vira `number` para cálculo |
| `ProductInput` | `name`, `description: string \| null`, `barcode`, `price: string` | corpo de `POST` e `PUT`; `price` normalizado com ponto (`"49.90"`) |
| `ProductPage` | `items: Product[]`, `total: number`, `page: number`, `size: number` | resposta de `GET /products` |
| `ApiError` | `kind: 'network' \| 'validation' \| 'not-found' \| 'conflict' \| 'unexpected'`, `message: string`, `fieldErrors: Partial<Record<ProductField, string>>` | criado pelo `apiClient` (research D7) |

`ProductField = 'name' | 'description' | 'barcode' | 'price'`.

## 2. Regras de validação no formulário

As mesmas da spec 002 (FR-002 a FR-004 de lá), aplicadas antes do envio (FR-009). A API continua
sendo a autoridade.

| Campo | Regra | Mensagem |
|---|---|---|
| `name` | obrigatório; 1 a 120 caracteres sem os espaços das pontas | "Informe o nome do produto." / "Use no máximo 120 caracteres." |
| `description` | opcional; até 500 caracteres; vazia vira `null` | "Use no máximo 500 caracteres." |
| `barcode` | obrigatório | "Informe o código de barras." |
| `barcode` | só dígitos; 8, 12, 13 ou 14 dígitos | "Use só números: 8, 12, 13 ou 14 dígitos." |
| `barcode` | dígito verificador GTIN válido | "Confira os dígitos: o código de barras não é válido." |
| `price` | obrigatório; número com vírgula ou ponto | "Informe o preço de venda." / "Use só números, com vírgula para os centavos." |
| `price` | maior que zero | "Informe um preço maior que zero." |
| `price` | no máximo duas casas decimais | "Use no máximo duas casas decimais." |
| `price` | até R$ 999.999,99 | "O preço máximo é R$ 999.999,99." |

Erros do servidor (FR-011): `conflict` → no campo `barcode`, com a mensagem da API ("Código de
barras já cadastrado"); `validation` → no campo indicado em `loc`; `not-found` → toast + lista
atualizada (FR-016); `network`/`unexpected` → mensagem geral no formulário, dados preservados.

### Preço: texto, não `float`

| Entrada | Normalizado (enviado) | Exibido |
|---|---|---|
| `49,90` | `"49.90"` | R$ 49,90 |
| `49.9` | `"49.90"` | R$ 49,90 |
| `1234,5` | `"1234.50"` | R$ 1.234,50 |
| `49,999` | recusado (três casas) | — |
| `0` / `0,00` | recusado (zero) | — |

A comparação com o máximo é feita em centavos inteiros (`99999999`), sem ponto flutuante.

## 3. Estado da lista na URL (`useProductListParams`)

| Parâmetro | Tipo | Padrão | Normalização |
|---|---|---|---|
| `search` | string | `""` | espaços das pontas removidos; vazio some da URL |
| `page` | inteiro ≥ 1 | `1` | não numérico, zero ou negativo vira 1; `page=1` some da URL |

Regras de transição:

- Termo novo na busca (depois de 300 ms sem digitar) → `page` volta a 1 (FR-003).
- `page` além da última, com `total > 0` → substitui pela última página existente (Edge Cases).
- Remoção que esvazia a página atual, com `page > 1` → `page - 1` (FR-014).

## 4. Estados da lista (FR-006)

```text
                ┌────────────┐
   abre/muda ──▶│ carregando │── erro ──▶ [erro: "Tentar de novo"] ── tentar ──┐
   busca/página └─────┬──────┘                                                  │
                      │ sucesso                                                 │
        ┌─────────────┼──────────────────────┐                                  │
        ▼             ▼                      ▼                                  │
  [catálogo vazio] [sem resultado]      [com produtos] ◀────────────────────────┘
  total=0, sem     total=0, com busca   total>0
  busca
```

- **Carregando**: só na primeira carga de uma chave; ao trocar de página, a lista anterior fica
  visível com um indicador discreto (research D6).
- **Catálogo vazio** e **sem resultado** são estados diferentes, com textos diferentes
  (DESIGN.md, "Texto da interface").

## 5. Estados do formulário (cadastro e edição)

```text
[fechado] ── "Novo produto" / "Editar" ──▶ [editando]
[editando] ── enviar com erro de validação ──▶ [editando + erros nos campos]
[editando] ── enviar válido ──▶ [enviando] (botão desabilitado, spinner)
[enviando] ── sucesso ──▶ [fechado] + toast + lista atualizada + linha destacada
[enviando] ── conflict/validation ──▶ [editando + erro no campo]
[enviando] ── network/unexpected ──▶ [editando + mensagem geral]
[enviando] ── not-found (edição) ──▶ [fechado] + toast "não existe mais" + lista atualizada
[editando] ── Cancelar / Esc / fora do painel ──▶ [fechado], nada muda
```

A remoção segue o mesmo desenho com o diálogo de confirmação: `[confirmando] → [removendo] →
[fechado]` + toast, ou erro no diálogo, com o produto ainda na lista.

## 6. Banco de dados

| Mudança | Como | Reversível |
|---|---|---|
| Tabela `items` (laboratório da Prática 7) deixa de existir | migração Alembic nova, com `down_revision = "4f1e2a7c9b3d"`; `upgrade` faz `drop_table("items")` | sim: o `downgrade` recria a tabela como na migração original (`id` UUID, `name` até 100 caracteres com `uq_items_name`, `description` até 500) |
| Tabela `products` | sem mudança de esquema; só a ordem da consulta (`ORDER BY id DESC`) | — |

Depois do `upgrade head`, o banco tem só `products` (e `alembic_version`), igual aos modelos ORM.
