# Implementation Plan: Venda Mínima

**Branch**: `004-vendas` | **Date**: 2026-11-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-vendas/spec.md`

## Summary

Dar ao NexoPDV a venda no balcão, pelo painel: carrinho montado pelo código de barras (ou pela busca
por nome), um ou mais meios de pagamento com troco, baixa de estoque de todos os itens junto com o
registro da venda, comprovante e histórico com indicadores do dia. No back-end, um módulo de
domínio (`sale.py`) concentra as regras (forma do pedido, problemas por item, total, pagamento e
troco), e uma porta nova (`SaleRepository`) registra cada venda numa transação só: bloqueia as
linhas dos produtos **em ordem de id** (sem impasse entre vendas concorrentes), o domínio decide, e
venda, itens, pagamentos, saldos e movimentações do tipo "Venda" são gravados juntos. A venda
carrega um id criado pelo painel, que torna o envio **idempotente** (reenvio não duplica), e recebe
do banco um número legível. No front-end, a seção `features/sales` traz a nova venda (carrinho como
redutor puro, guardado no navegador) e o histórico com detalhe e indicadores. Testes em todas as
camadas, com concorrência no PostgreSQL e um E2E novo.

## Technical Context

**Language/Version**: Python 3.14 (back-end); TypeScript 7, modo estrito (front-end)

**Primary Dependencies**: FastAPI, Pydantic, SQLAlchemy, Alembic (back-end); React 19, Vite 8,
Tailwind CSS 4, shadcn/ui (base Radix), React Router 8, TanStack Query 5, sonner, lucide-react
(front-end). **Nenhuma dependência nova**; os componentes shadcn necessários (`dialog`, `sheet`,
`radio-group`, `alert-dialog`, `table`) já estão no projeto

**Storage**: PostgreSQL 17 (Compose). Tabelas novas `sales`, `sale_items` e `sale_payments`, e o tipo
`sale` no `CHECK` de `stock_movements`, por migração nova e reversível
([data-model §3](data-model.md))

**Testing**: pytest (SQLite temporário por padrão; PostgreSQL no CI e no `make test-postgres`);
Vitest + Testing Library + user-event + MSW; Playwright contra a stack real

**Target Platform**: navegadores atuais, de 360 px a desktop; API e banco em containers Linux

**Project Type**: aplicação web (SPA + API REST + banco)

**Performance Goals**: venda de 3 itens em menos de 30 s (SC-001); 25 vendas simultâneas
disputando 20 unidades sem saldo negativo (SC-004); páginas de 10

**Constraints**: tudo ou nada na finalização; saldo nunca negativo; vendas imutáveis; dinheiro sem
`float`; amarelo só em dinheiro (DESIGN.md); prazo: implementação em 25 e 26/11, fechamento até
27/11 (C-12)

**Scale/Scope**: 3 histórias; back-end: 1 módulo de domínio, 1 porta, 2 repositórios, 1 serviço,
4 rotas, 1 migração; front-end: 1 seção nova (~14 arquivos), mudanças no menu, nas rotas, no
histórico de estoque e no site

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Como o plano cumpre | Situação |
|---|---|---|
| **I. TDD** | Cada fatia começa pelo teste que falha: domínio (`test_sale.py`, `test_stock.py`), serviço com repositórios em memória, contrato dos repositórios (inclusive concorrência e idempotência), rotas pelo `TestClient`, migração; no front-end, funções puras (dinheiro, carrinho, intervalo do dia) com teste unitário e telas com Testing Library + MSW, pelos nomes de [contracts/ui.md](contracts/ui.md). Estilo visual conferido por capturas antes do commit. | ✅ |
| **II. Requisitos do PDF** | RP-001 a RP-008 mapeados abaixo. Extras marcados na spec (FR-023 indicadores, FR-028 carrinho guardado); nenhum substitui requisito. | ✅ |
| **III. Stack** | Só a stack da v2.1.0; nenhuma dependência nova. Estilos por tokens; TS estrito; skills de front-end. | ✅ |
| **IV. Complexidade justificada** | Abstrações novas com propósito registrado: porta `SaleRepository` com atomicidade no repositório (D5), bloqueio em ordem de id (D5), idempotência pelo id do cliente (D6), número do banco (D4), recusa com problemas por item (D7), gravação de saldo compartilhada (D8), carrinho como redutor puro (D13). Recusadas: Unit of Work (D5), `Idempotency-Key` e `PUT` (D6), tabela-contador (D4), carrinho no servidor e biblioteca de estado (D13). | ✅ |
| **V. Clean Architecture** | Regras só no domínio; `SaleService` só orquestra; a porta fica na aplicação e as duas implementações na infraestrutura; rotas, schemas e o tradutor do 409 na borda; composição em `dependencies.py`. Domínio e aplicação não importam FastAPI, Pydantic nem SQLAlchemy (`test_architecture.py`). | ✅ |
| **Qualidade** | `make test`, `make test-postgres`, `make lint`, `make format`, `make frontend-check`, `make frontend-test`, `make frontend-build` e `make e2e` verdes no fim das fatias que os afetam; CI verde. | ✅ |

**Requisitos do PDF (RP) → onde são cumpridos**

| RP | Onde |
|---|---|
| RP-001 fluxo interface → API → banco | nova venda e histórico + rotas `/sales` + tabelas novas; E2E (D18) |
| RP-002 REST com validação e erros HTTP | `api/routes/sales.py`, `api/schemas/sale.py`; 201/200/404/409/422 ([contracts/sales-api.md](contracts/sales-api.md)) |
| RP-003 migração versionada | `alembic/versions/<rev>_add_sales.py` (D10) + `test_migrations.py` |
| RP-004 formulários, listas e estados | `features/sales`; estados no [data-model §4](data-model.md) |
| RP-005 CORS coerente | sem método novo; preflight de `POST /sales` testado (D11) |
| RP-006 pytest, Vitest, Playwright | D18; `tests/e2e/sales.spec.ts` |
| RP-007 Compose, Makefile e CI | migração na subida; workflows sem mudança de passos |
| RP-008 README fiel | seção de vendas no README (última fatia); a reescrita completa fica para o fechamento (C-12) |

**Re-check pós-design (Fase 1):** os artefatos ([data-model](data-model.md),
[contratos](contracts/), [quickstart](quickstart.md)) não introduziram violação. Pontos de atenção:
os testes de concorrência do repositório SQL só rodam em PostgreSQL (D5), cobertos pelo
`make test-postgres` e pelo CI; o `CHECK paid − change = total` ficou de fora do banco por causa do
SQLite (data-model §3), e a regra é garantida pelo domínio. ✅

## Project Structure

### Documentation (this feature)

```text
specs/004-vendas/
├── spec.md
├── plan.md              # este arquivo
├── research.md          # decisões D1–D18
├── data-model.md        # domínio, aplicação, banco, tipos, carrinho e estados
├── quickstart.md        # roteiro de validação (e do vídeo)
├── contracts/
│   ├── sales-api.md     # rotas de vendas, recusa 409 e efeito no estoque
│   └── ui.md            # rotas, nomes acessíveis e teclado da nova venda e do histórico
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

**Back-end** (camada da Clean Architecture entre colchetes):

```text
backend/
├── app/
│   ├── domain/
│   │   ├── sale.py                               [domínio]         NOVO: limites, Payment, SaleLine, SaleOrder, Checkout, Sale, SalesSummary
│   │   ├── stock.py                              [domínio]         + MovementKind.SALE, StockChange.sale
│   │   └── errors.py                             [domínio]         + SaleRejectedError (com problems), SaleNotFoundError
│   ├── application/
│   │   ├── commands.py                           [aplicação]       + SaleLineData, PaymentData
│   │   ├── ports/sale_repository.py              [aplicação]       NOVO: register, get, list, summary
│   │   └── services/sale_service.py              [aplicação]       NOVO
│   ├── infrastructure/
│   │   ├── models/sale.py                        [infraestrutura]  NOVO: SaleModel, SaleItemModel, SalePaymentModel
│   │   ├── models/stock_movement.py              [infraestrutura]  CHECK com 'sale'
│   │   └── repositories/
│   │       ├── stock_ledger.py                   [infraestrutura]  NOVO: grava saldo + movimentação com a linha já bloqueada (D8)
│   │       ├── sqlalchemy_stock_repository.py    [infraestrutura]  usa o stock_ledger
│   │       ├── sqlalchemy_sale_repository.py     [infraestrutura]  NOVO: FOR UPDATE em ordem de id, idempotência, número, transação
│   │       ├── in_memory_store.py                [infraestrutura]  + vendas, próximo número e aplicação de movimentação
│   │       ├── in_memory_stock_repository.py     [infraestrutura]  usa a aplicação do store
│   │       └── in_memory_sale_repository.py      [infraestrutura]  NOVO
│   ├── api/
│   │   ├── schemas/sale.py                       [adaptador]       NOVO: SaleInput, SaleOutput, SalePageOutput, SalesSummaryOutput
│   │   ├── routes/sales.py                       [adaptador]       NOVO: POST /sales, GET /sales, GET /sales/{id}, GET /sales/summary
│   │   ├── error_handlers.py                     [adaptador]       + tradutor do SaleRejectedError (409 com problems)
│   │   └── dependencies.py                       [adaptador]       + get_sale_repository, get_sale_service
│   └── main.py                                   [composição]      + router de vendas
├── alembic/versions/<rev>_add_sales.py           [infraestrutura]  NOVO (reversível, batch no SQLite)
└── tests/
    ├── unit/domain/test_sale.py                  NOVO
    ├── unit/domain/test_stock.py                 StockChange.sale
    ├── unit/domain/test_errors.py                erros novos e categoria
    ├── unit/application/test_sale_service.py     NOVO
    ├── integration/test_sale_repository_contract.py    NOVO (concorrência: em memória sempre, SQL só em PostgreSQL)
    ├── integration/test_stock_repository_contract.py   continua verde depois do stock_ledger
    ├── integration/test_sales_api.py             NOVO
    ├── integration/test_cors.py                  preflight de POST /sales
    └── integration/test_migrations.py            tabelas novas, CHECK de tipo, reversão
```

**Front-end** (papel de cada arquivo na estrutura da 007):

```text
frontend/src/
├── app/
│   ├── router.tsx                     # + /sales e /sales/new                               [alterado]
│   └── sidebar.tsx                    # grupo "Frente de caixa", "Nova venda" e "Vendas"     [alterado]
├── lib/
│   ├── api-client.ts                  # ApiError ganha `body`                                [alterado]
│   ├── money.ts                       # exporta toCents/fromCents; + parseMoneyInput, formatCents [alterado]
│   ├── date.ts                        # + todayRange (início e fim do dia local)             [alterado]
│   └── query-keys.ts                  # + SALES_KEY                                          [alterado]
├── features/sales/                    # frente de caixa e histórico
│   ├── types.ts                       # Sale, SaleInput, Payment, SaleProblem, SalesSummary
│   ├── api.ts                         # registerSale, listSales, getSalesSummary, findByBarcode
│   ├── queries.ts                     # useSalesPage, useSalesSummary, useRegisterSale
│   ├── payment-methods.ts             # rótulos e ordem dos meios
│   ├── cart.ts                        # redutor e cálculos do carrinho (puros)
│   ├── use-cart.ts                    # redutor + localStorage
│   ├── new-sale-page.tsx              # página: orquestra leitura, carrinho, pagamento e comprovante
│   ├── barcode-reader.tsx             # campo do código + busca por nome
│   ├── cart-table.tsx                 # itens, quantidades, problemas
│   ├── payment-panel.tsx              # meio, valor, lista, situação, finalizar
│   ├── sale-receipt-dialog.tsx        # comprovante
│   ├── sales-page.tsx                 # histórico + indicadores
│   ├── sales-overview.tsx             # indicadores do dia
│   ├── sales-list.tsx                 # tabela/lista + estados
│   └── sale-detail-sheet.tsx          # detalhe da venda
├── features/stock/types.ts, movements-sheet.tsx   # tipo "Venda" no histórico              [alterado]
└── features/landing/landing-page.tsx  # frente de caixa "Disponível"                       [alterado]

frontend/tests/
├── msw/catalog.ts, handlers.ts        # busca por código, vendas (idempotência, recusas), resumo [alterado]
├── unit/money.test.ts, date.test.ts, cart.test.ts                                           [alterados/novo]
├── integration/new-sale-*.test.tsx    # leitura, busca, carrinho, pagamentos, finalização, recusa [novos]
├── integration/sales-history.test.tsx # histórico, detalhe, indicadores                     [novo]
├── integration/app-shell.test.tsx, landing.test.tsx, stock-movements.test.tsx              [alterados]
└── e2e/sales.spec.ts                  # venda com baixa de estoque e persistência           [novo]
```

**Outros arquivos**

| Arquivo | Mudança |
|---|---|
| `README.md` | funcionalidades e uso da venda |
| `frontend/DESIGN.md` | tela de nova venda (leitura, carrinho, resumo em amarelo, comprovante) |
| `.specify/memory/roadmap.md` | 1.5.0: 004 specced (recorte), 011 com o PR #13 mergeado |
| `specs/011-estoque/spec.md` | status "Implemented" (pendente desde o PR #13) |

**Structure Decision**: a mesma aplicação web: `backend/` em Clean Architecture e `frontend/` por
funcionalidade. A venda entra como `features/sales` e as rotas `/sales/new` e `/sales` no layout do
painel; nada é importado de outra feature além dos tipos e da API de produtos (leitura do catálogo),
como a seção Estoque já faz.

## Ordem de implementação e commits

Cada fatia termina verde e vira um commit atômico (política do projeto: ~8–15 commits por spec).
Back-end primeiro (fundação comum às três histórias), depois o front-end por história.

| # | Fatia | Commit (Conventional Commits, em português) |
|---|---|---|
| 1 | Spec, plano, pesquisa, contratos, tarefas, roadmap 1.5.0, status da 011 | `docs(vendas): especifica e planeja a venda minima (spec 004)` |
| 2 | Domínio: `sale.py`, `StockChange.sale`, erros | `feat(vendas): modela venda, pagamentos e troco no dominio` |
| 3 | Banco: migração, modelos, `stock_ledger`, repositórios (bloqueio em ordem, idempotência, número) | `feat(vendas): grava a venda e baixa o estoque numa transacao so` |
| 4 | API: serviço, schemas, rotas, tradutor do 409 | `feat(vendas): expoe registro, consulta e resumo de vendas na API` |
| 5 | Base do front-end: dinheiro, datas, cliente HTTP, API de vendas, API simulada, tipo "Venda" no estoque | `feat(vendas): prepara dinheiro, datas e a API de vendas no painel` |
| 6 | Carrinho (redutor puro e armazenamento no navegador) | `feat(vendas): monta o carrinho com as regras de quantidade e troco` |
| 7 | US1: nova venda (leitura, busca, carrinho, pagamento, finalização, comprovante, recusa, menu) | `feat(vendas): registra a venda pelo codigo de barras no painel` |
| 8 | US2: cenários de pagamento dividido na tela (as regras vieram no carrinho) | `test(vendas): cobre o pagamento dividido e as regras de troco na tela` |
| 9 | US3: histórico, detalhe, indicadores, site | `feat(vendas): mostra o historico e os indicadores do dia` |
| 10 | E2E e capturas de tela revisadas | `test(e2e): cobre a venda com baixa de estoque e persistencia` |
| 11 | README, DESIGN.md, tarefas concluídas, notas da implementação, roadmap 1.6.0 | `docs(vendas): documenta a venda minima` |

Na implementação, a base do front-end e o carrinho viraram commits próprios (eram parte da US1),
para cada commit ficar revisável.

## Complexity Tracking

Nenhuma violação da constituição a justificar.
