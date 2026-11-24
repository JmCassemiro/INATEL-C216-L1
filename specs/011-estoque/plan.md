# Implementation Plan: Controle de Estoque

**Branch**: `011-estoque` | **Date**: 2026-11-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/011-estoque/spec.md`

## Summary

Dar ao NexoPDV o controle de estoque da visão: saldo e estoque mínimo por produto, entrada de
mercadoria, ajuste com motivo obrigatório, histórico imutável de movimentações e lista de
reposição, na API e numa seção nova do painel. No back-end, um módulo de domínio
(`stock.py`) concentra as regras (saldo nunca negativo, teto, situação, falta), e uma porta nova
(`StockRepository`) aplica cada movimentação de forma atômica: a linha do produto é bloqueada
(`SELECT … FOR UPDATE`), o domínio decide, e saldo e movimentação são gravados na mesma
transação. Assim, movimentações simultâneas não se perdem, que é o ponto de Sistemas Distribuídos
da feature. O cadastro do produto deixa de poder sobrescrever o saldo. A listagem de produtos
ganha filtro de reposição e ordenação, e uma migração nova cria as colunas e a tabela. No
front-end, a seção Estoque (`features/stock`) traz indicadores, posição com busca e filtro,
diálogos de entrada e de ajuste com prévia do saldo e o histórico em painel lateral; a seção
Produtos ganha a coluna de estoque, o campo de mínimo e o indicador de reposição. Testes em todas
as camadas, com o teste de 50 entradas simultâneas em PostgreSQL e um E2E novo.

## Technical Context

**Language/Version**: Python 3.14 (back-end); TypeScript 7, modo estrito (front-end)

**Primary Dependencies**: FastAPI, Pydantic, SQLAlchemy, Alembic (back-end); React 19, Vite 8,
Tailwind CSS 4, shadcn/ui (base Radix), React Router 8, TanStack Query 5, sonner, lucide-react
(front-end). **Nenhuma dependência nova**: os componentes shadcn novos (`dialog`, `radio-group`,
`toggle-group`) usam o pacote `radix-ui` já instalado

**Storage**: PostgreSQL 17 (Compose). Duas colunas novas em `products` e a tabela
`stock_movements`, por migração nova e reversível ([data-model §3](data-model.md))

**Testing**: pytest (SQLite temporário por padrão; PostgreSQL no CI e no `make test-postgres`);
Vitest 5 + Testing Library + user-event + MSW; Playwright contra a stack real

**Target Platform**: navegadores atuais, de 360 px a desktop; API e banco em containers Linux

**Project Type**: aplicação web (SPA + API REST + banco)

**Performance Goals**: listas e indicadores atualizados em até 1 s depois de cada operação
(SC-006); 50 movimentações simultâneas no mesmo produto sem perda (SC-003); páginas de 10

**Constraints**: saldo nunca negativo e nunca acima de 999.999; movimentações imutáveis; amarelo
só em dinheiro (DESIGN.md); prazo da spec: 2026-11-26, para sobrar o fechamento até 2026-11-28
(C-12)

**Scale/Scope**: 4 histórias; back-end: 1 módulo de domínio, 1 porta, 2 repositórios, 1 serviço,
4 rotas, 1 migração; front-end: 1 seção nova (~12 arquivos), 3 componentes shadcn, mudanças em
Produtos, menu e site

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Como o plano cumpre | Situação |
|---|---|---|
| **I. TDD** | Cada fatia começa pelo teste que falha: domínio (`test_stock.py`), serviço com repositórios em memória, contrato dos repositórios (inclusive concorrência), rotas pelo `TestClient`, migração; no front-end, funções puras com teste unitário e telas com Testing Library + MSW, pelos nomes de [contracts/ui.md](contracts/ui.md). Estilo visual conferido por capturas antes do commit. | ✅ |
| **II. Requisitos do PDF** | RP-001 a RP-008 mapeados abaixo. Extras marcados na spec (indicadores, prévia do ajuste) e na pesquisa (`make test-postgres`); nenhum substitui requisito. | ✅ |
| **III. Stack** | Só a stack da v2.1.0; sem dependência nova (D14, D19). Estilos por tokens (`warning`, `success`, `destructive`, `price-tag`), TS estrito, skills de front-end. | ✅ |
| **IV. Complexidade justificada** | Abstrações novas com propósito registrado: porta `StockRepository` com atomicidade no repositório (D6), bloqueio pessimista (D4), número sequencial (D5), armazenamento em memória compartilhado (D6), paginação e parâmetros de URL movidos para peças neutras (D12). Recusadas: Unit of Work (D6), rota `/stock` própria (D7), event sourcing puro (D1), bloqueio otimista (D4), `testcontainers` (D19). | ✅ |
| **V. Clean Architecture** | Regras só no domínio; `StockService` só orquestra; a porta fica na aplicação e as duas implementações na infraestrutura; rotas e schemas na borda; composição em `dependencies.py`. Domínio e aplicação não importam FastAPI, Pydantic nem SQLAlchemy (`test_architecture.py` continua valendo). | ✅ |
| **Qualidade** | `make test`, `make test-postgres`, `make lint`, `make format`, `make frontend-check`, `make frontend-test`, `make frontend-build` e `make e2e` verdes no fim das fatias que os afetam; CI de back-end (com PostgreSQL) e de front-end verdes. | ✅ |

**Requisitos do PDF (RP) → onde são cumpridos**

| RP | Onde |
|---|---|
| RP-001 fluxo interface → API → banco | seção Estoque + rotas novas + `stock_movements`; E2E (D18) |
| RP-002 REST com validação e erros HTTP | `api/routes/stock.py`, `api/schemas/stock.py`; 404/409/422 por categoria ([contracts/stock-api.md §4](contracts/stock-api.md)) |
| RP-003 migração versionada | `alembic/versions/<rev>_add_stock.py` (D10) + `test_migrations.py` |
| RP-004 formulários, listas e estados | `features/stock`; estados no [data-model §4](data-model.md) |
| RP-005 CORS coerente | sem método novo; preflight testado em `test_cors.py` (D11) |
| RP-006 pytest, Vitest, Playwright | D18; `tests/e2e/stock.spec.ts` |
| RP-007 Compose, Makefile e CI | migração na subida; `make test-postgres`; workflows sem mudança de passos |
| RP-008 README fiel | seção de estoque no README (fatia 11); a reescrita completa fica para o fechamento (C-12) |

**Re-check pós-design (Fase 1):** os artefatos ([data-model](data-model.md),
[contratos](contracts/), [quickstart](quickstart.md)) não introduziram violação. Ponto de atenção
registrado: o teste de concorrência do repositório SQL só roda em PostgreSQL (D4); o
`make test-postgres` e o CI cobrem essa lacuna do SQLite. ✅

## Project Structure

### Documentation (this feature)

```text
specs/011-estoque/
├── spec.md
├── plan.md              # este arquivo
├── research.md          # decisões D1–D19
├── data-model.md        # domínio, aplicação, banco, tipos e estados do painel
├── quickstart.md        # roteiro de validação (e do vídeo)
├── contracts/
│   ├── stock-api.md     # campos novos de produto e rotas de estoque
│   └── ui.md            # rotas, nomes acessíveis e teclado da seção Estoque
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

**Back-end** (camada da Clean Architecture entre colchetes):

```text
backend/
├── app/
│   ├── domain/
│   │   ├── stock.py                              [domínio]         NOVO: limites, StockChange, StockMovement, StockSummary, status e falta
│   │   ├── product.py                            [domínio]         + min_stock, stock_quantity e propriedades de estoque
│   │   └── errors.py                             [domínio]         + InsufficientStockError, StockLimitExceededError
│   ├── application/
│   │   ├── commands.py                           [aplicação]       + min_stock em ProductData/ProductChanges; ProductOrder
│   │   ├── ports/product_repository.py           [aplicação]       list com restock_only e order; update não grava o saldo
│   │   ├── ports/stock_repository.py             [aplicação]       NOVO: record, movements, summary
│   │   ├── services/product_service.py           [aplicação]       repassa filtro e ordem; min_stock no PATCH
│   │   └── services/stock_service.py             [aplicação]       NOVO: entrada, ajuste, histórico, resumo
│   ├── infrastructure/
│   │   ├── models/product.py                     [infraestrutura]  + colunas e CHECK; values_from sem o saldo
│   │   ├── models/stock_movement.py              [infraestrutura]  NOVO
│   │   └── repositories/
│   │       ├── in_memory_store.py                [infraestrutura]  NOVO: produtos, movimentações e lock compartilhados
│   │       ├── in_memory_product_repository.py   [infraestrutura]  usa o store; filtro e ordens; update preserva o saldo
│   │       ├── in_memory_stock_repository.py     [infraestrutura]  NOVO
│   │       ├── sqlalchemy_product_repository.py  [infraestrutura]  filtro e ordens; update sem o saldo
│   │       └── sqlalchemy_stock_repository.py    [infraestrutura]  NOVO: FOR UPDATE + sequence + transação
│   ├── api/
│   │   ├── schemas/product.py                    [adaptador]       + min_stock na entrada; campos de estoque na saída
│   │   ├── schemas/stock.py                      [adaptador]       NOVO: EntryInput, AdjustmentInput, MovementOutput, páginas, resumo
│   │   ├── routes/products.py                    [adaptador]       + parâmetros restock e sort
│   │   ├── routes/stock.py                       [adaptador]       NOVO: entries, adjustments, movements, summary
│   │   └── dependencies.py                       [adaptador]       + get_stock_repository, get_stock_service
│   └── main.py                                   [composição]      + router de estoque
├── alembic/versions/<rev>_add_stock.py           [infraestrutura]  NOVO (reversível, batch no SQLite)
└── tests/
    ├── unit/domain/test_stock.py                 NOVO
    ├── unit/domain/test_product.py               mínimo e propriedades de estoque
    ├── unit/domain/test_errors.py                erros novos e categoria
    ├── unit/application/test_stock_service.py    NOVO
    ├── unit/application/test_product_service.py  filtro, ordem e min_stock
    ├── integration/test_stock_repository_contract.py   NOVO (concorrência: em memória sempre, SQL só em PostgreSQL)
    ├── integration/test_product_repository_contract.py restock_only, order, update preserva o saldo
    ├── integration/test_stock_api.py             NOVO
    ├── integration/test_products_api.py          campos novos, min_stock, restock e sort
    ├── integration/test_cors.py                  preflight do POST de entrada
    └── integration/test_migrations.py            tabela nova; reversão
```

**Front-end** (papel de cada arquivo na estrutura da 007):

```text
frontend/src/
├── app/
│   ├── router.tsx                     # + rota /stock (handle: "Estoque")                 [alterado]
│   └── sidebar.tsx                    # Estoque vira link, com o número para repor          [alterado]
├── components/
│   ├── list-pagination.tsx            # paginação numerada (era products-pagination)       [movido]
│   └── ui/dialog.tsx, radio-group.tsx, toggle-group.tsx, toggle.tsx   # shadcn (gerados)   [novos]
├── lib/
│   ├── use-list-params.ts             # busca e página na URL (era use-product-list-params) [movido]
│   ├── quantity.ts                    # parseQuantity: inteiro com separador de milhar       [novo]
│   └── date.ts                        # formatDateTime em pt-BR                             [novo]
├── features/products/
│   ├── types.ts                       # campos de estoque; ProductInput explícito          [alterado]
│   ├── api.ts                         # listProducts com restock e sort                     [alterado]
│   ├── queries.ts                     # invalida também ["stock"]                           [alterado]
│   ├── validation.ts                  # campo min_stock                                     [alterado]
│   ├── product-form-sheet.tsx         # campo "Estoque mínimo (opcional)"                   [alterado]
│   ├── products-list.tsx              # coluna "Estoque"                                    [alterado]
│   └── catalog-overview.tsx           # indicador "Para repor" com link                     [alterado]
├── features/stock/                    # seção Estoque
│   ├── types.ts                       # StockMovement, MovementPage, StockSummary, entradas
│   ├── api.ts                         # registerEntry, adjustStock, listMovements, getStockSummary
│   ├── queries.ts                     # useStockPage, useStockSummary, useMovements, mutações
│   ├── validation.ts                  # validação dos formulários de entrada e ajuste
│   ├── use-stock-list-params.ts       # busca, página e visão na URL
│   ├── stock-page.tsx                 # página: orquestra indicadores, lista e diálogos
│   ├── stock-overview.tsx             # indicadores
│   ├── stock-list.tsx                 # tabela/lista + estados
│   ├── stock-status.tsx               # pílula de situação
│   ├── stock-entry-dialog.tsx         # diálogo de entrada
│   ├── stock-adjustment-dialog.tsx    # diálogo de ajuste com prévia
│   └── movements-sheet.tsx            # histórico em painel lateral
└── features/landing/landing-page.tsx  # estoque "Disponível"                                 [alterado]

frontend/tests/
├── msw/catalog.ts, handlers.ts        # saldo, mínimo, movimentações e rotas novas           [alterado]
├── unit/quantity.test.ts, stock-validation.test.ts, date.test.ts                            [novos]
├── unit/use-list-params.test.tsx, pagination…   # imports movidos                           [alterado]
├── integration/stock-*.test.tsx       # lista, filtro, entrada, ajuste, histórico            [novos]
├── integration/product-*.test.tsx, products-overview.test.tsx, app-shell.test.tsx, landing.test.tsx  [alterados]
└── e2e/stock.spec.ts                  # reposição, entrada, ajuste, recarga e histórico       [novo]
```

**Outros arquivos**

| Arquivo | Mudança |
|---|---|
| `Makefile` | alvo `test-postgres` (D19) e texto de ajuda |
| `README.md` | funcionalidades e uso do estoque; `make test-postgres` |
| `CLAUDE.md` | comando `make test-postgres` |
| `frontend/DESIGN.md` | pílulas de situação do estoque (âmbar, verde, vermelho) |
| `.specify/memory/roadmap.md` | 1.3.0 com a entrada 011 (já feita no `/speckit-specify`) |
| `specs/002-produtos/spec.md` | nota de que estoque e alertas foram para a 011 |

**Structure Decision**: a mesma aplicação web: `backend/` em Clean Architecture e `frontend/` por
funcionalidade. O estoque entra como `features/stock` e rota `/stock` no layout do painel; peças
usadas por duas seções saem das features para `components/` e `lib/`.

## Ordem de implementação e commits

Cada fatia termina verde e vira um commit atômico (política do projeto: ~8–15 commits por spec).
Back-end primeiro (fundação comum às quatro histórias), depois o front-end por história.

| # | Fatia | Commit (Conventional Commits, em português) |
|---|---|---|
| 1 | Spec, plano, pesquisa, contratos, tarefas, roadmap 1.3.0 | `docs(estoque): especifica e planeja o controle de estoque (spec 011)` |
| 2 | Domínio: `stock.py`, produto com mínimo e saldo, erros | `feat(estoque): modela saldo, minimo e movimentacoes no dominio` |
| 3 | Banco: migração, modelos, repositórios (bloqueio, sequência, store em memória), filtro e ordens | `feat(estoque): grava saldo e movimentacoes com bloqueio da linha do produto` |
| 4 | API: serviço, schemas, rotas, `min_stock` no produto, `make test-postgres` | `feat(estoque): expoe entradas, ajustes, historico e resumo na API` |
| 5 | Front-end: peças compartilhadas movidas, tipos novos, coluna e campo de mínimo em Produtos | `feat(painel): mostra o saldo dos produtos e o estoque minimo no cadastro` |
| 6 | US1: seção Estoque, posição, busca e diálogo de entrada | `feat(estoque): cria a secao estoque com a entrada de mercadoria` |
| 7 | US2: visão "Para repor", indicadores, menu, indicador em Produtos, site | `feat(estoque): mostra a lista de reposicao e os indicadores` |
| 8 | US3: diálogo de ajuste com prévia e recusa | `feat(estoque): ajusta o saldo com motivo e previa` |
| 9 | US4: histórico em painel lateral | `feat(estoque): mostra o historico de movimentacoes` |
| 10 | E2E e capturas de tela revisadas | `test(e2e): cobre reposicao, entrada e ajuste com persistencia` |
| 11 | README, CLAUDE.md, DESIGN.md, nota na spec 002 | `docs(estoque): documenta o controle de estoque` |

## Complexity Tracking

Nenhuma violação da constituição a justificar.
