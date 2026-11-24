# Quickstart: validar o controle de estoque

**Feature**: [spec.md](spec.md) | **Contratos**: [API](contracts/stock-api.md),
[interface](contracts/ui.md)

Roteiro para provar que a spec 011 funciona de ponta a ponta. Comandos rodados a partir da raiz
do repositório. Também serve de base para a parte de estoque do vídeo do Projeto Final.

## Pré-requisitos

- Docker Desktop rodando.
- `make install` (back-end) e `make frontend-install` (front-end) já executados.
- `.env` copiado de `.env.example`. Se houver um PostgreSQL local ocupando a 5432, use
  `POSTGRES_PORT=5433`.

## 1. Verificações automatizadas

| Comando | O que prova | Esperado |
|---|---|---|
| `make test` | domínio, serviço, repositórios, rotas e migração do estoque (SQLite) | tudo verde; o teste de concorrência do repositório SQL aparece como pulado (`skipped`), com o motivo |
| `make test-postgres` | a mesma suíte num PostgreSQL descartável, como no CI, **incluindo** as 50 entradas simultâneas (SC-003) | tudo verde, nada pulado; o container é apagado no final |
| `make lint` e `make format` | Ruff | sem erros, nada a formatar |
| `make frontend-check` | Biome | sem erros |
| `make frontend-test` | Vitest + Testing Library + MSW: seção Estoque, diálogos, histórico, mínimo, menu e indicadores | tudo verde |
| `make frontend-build` | tipos (TS estrito) e build | sem erros |
| `make e2e` | Playwright contra a stack real: reposição, entrada, ajuste, recarga e histórico | verde; a stack é apagada no final |

## 2. Subir o sistema

```bash
make up-build
```

A migração nova roda na subida da API. Num banco que já tinha produtos, todos aparecem com saldo
0 e mínimo 0. Painel em `http://localhost:5173/products`; API em `http://localhost:8000/docs`.

## 3. Roteiro manual (espelha as histórias da spec)

| # | Passo | Resultado esperado |
|---|---|---|
| 1 | Abrir **Estoque** no menu lateral | a seção abre (não é mais "em breve"); produtos em ordem alfabética, com saldo, mínimo e situação (US1-1) |
| 2 | Cadastrar em Produtos "Camiseta Básica Branca M" (7891000315507, 49,90) com estoque mínimo 10 | na lista de produtos: "0 un." e "Sem estoque"; o menu mostra 1 produto para repor (US1-2, US2-1, US2-7) |
| 3 | Em Estoque, "Registrar entrada" da camiseta: 4, observação "NF 1234" | aviso "Entrada registrada: … agora tem 4 un."; situação "Repor · faltam 6" (US1-3, US2-2) |
| 4 | Clicar em "Para repor" | só a camiseta, com a maior falta primeiro; a URL ganha `?view=restock` (US2-3) |
| 5 | Registrar entrada de 6 | a camiseta sai da lista de reposição: 10 = mínimo não é falta (US2-4, US2-6) |
| 6 | Recarregar a página (F5) e reiniciar a API (`docker compose restart api`) | saldo 10 nos dois casos (US1-4) |
| 7 | "Ajustar estoque": Retirar 2, motivo "Avaria no transporte" | a prévia mostra "Saldo: 10 → 8"; ao salvar, saldo 8 e de volta à reposição (US3-1, US3-3, US3-6) |
| 8 | Ajustar: Retirar 50, motivo "Teste" | recusado junto ao campo: saldo insuficiente, há 8 unidades; nada muda (US3-5) |
| 9 | Ajustar com o motivo "ok" | "Informe o motivo com pelo menos 3 caracteres." e nada é enviado (US3-4) |
| 10 | Entrada com quantidade 0, -1, 1,5 ou 100000 | erro no campo, nada é enviado (US1-5) |
| 11 | "Ver histórico" | 3 movimentações, da mais recente para a mais antiga, com data, tipo, "+4", "+6", "−2", saldo 4, 10, 8 e os textos; sem opção de editar ou apagar (US4-1, US4-4, US4-5) |
| 12 | Conferir os indicadores da seção Estoque | "Para repor" 1, "Sem estoque" 0, "Valor em estoque" R$ 399,20 (8 × 49,90) (FR-018) |
| 13 | Na seção Produtos, o indicador "Estoque" | "Para repor: 1" e o link "Ver lista de reposição" leva a `/stock?view=restock` (FR-026) |
| 14 | Remover a camiseta em Produtos | ela some da seção Estoque e da reposição; as movimentações continuam no banco (edge case) |
| 15 | `docker compose stop api` e recarregar a seção Estoque | "Não foi possível carregar o estoque." com "Tentar de novo" (FR-024) |
| 16 | Largura de 360 px e uso só pelo teclado | lista empilhada com "Ações de {nome}"; diálogos prendem e devolvem o foco (FR-028) |
| 17 | Abrir `/` (site) | "Estoque com alerta" aparece como "Disponível" (FR-027) |

## 4. Banco

| Verificação | Esperado |
|---|---|
| `make db-shell` e `\d products` | colunas `stock_quantity` e `min_stock` com os `CHECK` de faixa |
| `\d stock_movements` | chave estrangeira para `products` e a única `(product_id, sequence)` |
| `select sum(quantity) from stock_movements where product_id = '…'` | igual ao `stock_quantity` do produto (FR-010) |

## 5. Encerrar

```bash
make down
```
