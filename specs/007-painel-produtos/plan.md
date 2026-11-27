# Implementation Plan: Painel de Produtos

**Branch**: `007-painel-produtos` | **Date**: 2026-11-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-painel-produtos/spec.md`

## Summary

Trocar o front-end do laboratório de itens (Práticas 6 e 7) pela primeira seção do painel do
NexoPDV: a de produtos, com listagem paginada e busca, cadastro, edição e remoção, cada ação com
estados de carregamento, sucesso e erro. O front-end é refeito em **TypeScript estrito**, com
**shadcn/ui** tematizado pela identidade do [DESIGN.md](../../frontend/DESIGN.md) (etiqueta de
gôndola, Archivo em três larguras, temas claro e escuro), **React Router** para guardar busca e
página na URL e **TanStack Query** para os dados do servidor. No back-end, três mudanças pequenas:
a listagem passa a vir do mais novo para o mais antigo, o CORS libera `PUT` e `DELETE`, e o
recurso `items` do laboratório sai por inteiro, com uma migração nova que apaga a tabela. Os
testes cobrem tudo: Vitest + Testing Library + MSW no front-end, pytest no back-end e um E2E do
fluxo completo com recarga da página para provar a persistência.

## Technical Context

**Language/Version**: TypeScript 7 (front-end, modo estrito); Python 3.14 (back-end)

**Primary Dependencies**: React 19, Vite 8, Tailwind CSS 4, shadcn/ui (estilo `nova`, base Radix),
React Router 8, TanStack Query 5, sonner, lucide-react, Archivo via Fontsource; FastAPI,
SQLAlchemy e Alembic (sem dependência nova no back-end)

**Storage**: PostgreSQL 17 (Compose). Sem mudança no esquema de `products`; a tabela `items` é
removida por migração nova

**Testing**: Vitest 5 + Testing Library + user-event + MSW 2 (unitários e integração do
front-end); Playwright (E2E contra a stack real); pytest (back-end, SQLite temporário e
PostgreSQL no CI)

**Target Platform**: navegadores atuais (Chrome, Edge, Firefox, Safari), de 360 px a desktop;
API e banco em containers Linux

**Project Type**: aplicação web (front-end SPA + API REST + banco)

**Performance Goals**: resultado da busca em até 1 s após parar de digitar, com até 1.000
produtos (SC-005); páginas de 10 itens

**Constraints**: offline-first não se aplica ao painel (só ao caixa, specs 008/009); fonte
auto-hospedada (sem CDN); contraste AA; nada de rolagem horizontal; prazo da spec: 2026-11-21
(C-12)

**Scale/Scope**: 1 seção (produtos), 4 histórias, ~25 arquivos de front-end próprios + os
componentes gerados pelo shadcn; 3 mudanças no back-end

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Como o plano cumpre | Situação |
|---|---|---|
| **I. TDD** | Toda tarefa de produção vem depois do teste que a cobre. Front-end: funções puras com teste unitário primeiro; telas com teste de integração (Testing Library + MSW) primeiro, pelo que o usuário vê (papéis e nomes do [contrato da interface](contracts/ui.md)). Estilo puramente visual (tokens, tipografia, etiqueta) é conferido por capturas de tela do Playwright antes do commit. Back-end: ordem, CORS e remoção dos itens começam por teste que falha. | ✅ |
| **II. Requisitos do PDF** | RP-001 a RP-009 mapeados abaixo; extras marcados na spec (busca, paginação, URL, tema escuro, prévia da etiqueta). Nenhum extra substitui um requisito. | ✅ |
| **III. Stack** | Exatamente a stack da v2.1.0. Dependências novas justificadas em [research D20](research.md#d20--dependências-novas-princípio-iii). TS estrito (D1); estilos só por tokens (D3); skills `frontend-design`, `shadcn` e `react-best-practices` (regras de cliente). Nada exigido pelo PDF é substituído. | ✅ |
| **IV. Complexidade justificada** | Abstrações com propósito: `apiClient` com erros por categoria (D7), hooks de consulta (D6), hook de parâmetros da URL (D5), pasta por funcionalidade. Recusadas por não se pagarem: react-hook-form + zod (D8), biblioteca de código de barras (D10), biblioteca de animação (D14), página de design system (D2). | ✅ |
| **V. Clean Architecture** (back-end) | A ordem muda só na infraestrutura (repositórios); o CORS só no adaptador; a remoção dos itens percorre todas as camadas sem criar dependência nova. `test_architecture.py` continua valendo. | ✅ |
| **Qualidade** | `make test`, `make lint`, `make format`, `make frontend-check`, `make frontend-test`, `make frontend-build` e `make e2e` no fim de cada fatia que os afeta; CI de back-end e front-end verdes. | ✅ |

**Requisitos do PDF (RP) → onde são cumpridos**

| RP | Onde |
|---|---|
| RP-001 CRUD pela interface | US1–US4; E2E (D13) |
| RP-002 React com estados | telas da `features/products`; estados no [data-model §4–5](data-model.md) |
| RP-003 CORS coerente | `app/api/cors.py` + `test_cors.py` (D9, D17) |
| RP-004 Vitest + Testing Library | `frontend/tests/unit`, `frontend/tests/integration` (D12) |
| RP-005 E2E real | `frontend/tests/e2e/products.spec.ts` + `make e2e` (D13) |
| RP-006 Compose | `compose.yaml` sem mudança de serviços; o front-end novo sobe no mesmo container (D19) |
| RP-007 CI | `ci-backend.yml` e `ci-frontend.yml`; o `build` passa a incluir `tsc -b` |
| RP-008 laboratório substituído | remoção completa do `items` (D16) e do front-end do laboratório |
| RP-009 o que existia continua | testes de produtos, home, migrações e CORS ajustados, Makefile e CI |

**Re-check pós-design (Fase 1):** os artefatos ([data-model](data-model.md),
[contratos](contracts/), [quickstart](quickstart.md)) não introduziram violação. O único ponto
de atenção é o TypeScript 7 (D1): se alguma ferramenta (shadcn CLI, Vitest) não aceitar a 7, o
plano B é a 6, sem mudar o restante. ✅

## Project Structure

### Documentation (this feature)

```text
specs/007-painel-produtos/
├── spec.md
├── plan.md              # este arquivo
├── research.md          # decisões D1–D20
├── data-model.md        # tipos do painel, estados das telas, mudança no banco
├── quickstart.md        # roteiro de validação (e do vídeo)
├── contracts/
│   ├── products-api-changes.md   # o que muda na API em relação à spec 002
│   └── ui.md                     # rotas, nomes acessíveis e teclado
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

**Front-end** (Princípio V não se aplica; o papel de cada arquivo segue a estrutura abaixo).
Arquivos em kebab-case, como os gerados pelo shadcn; componentes em PascalCase.

```text
frontend/
├── DESIGN.md                     # identidade visual (doc)                       [novo]
├── components.json               # configuração do shadcn                        [novo]
├── index.html                    # título, favicon, script de tema               [alterado]
├── package.json                  # dependências, build com tsc -b                [alterado]
├── biome.json                    # TS + overrides para componentes gerados       [alterado se preciso]
├── tsconfig.json                 # referências                                   [novo]
├── tsconfig.app.json             # código e testes, strict, alias @/             [novo]
├── tsconfig.node.json            # configs do Vite e do Playwright               [novo]
├── vite.config.ts                # alias @/, Vitest                              [era .js]
├── playwright.config.ts          #                                               [era .js]
├── public/favicon.svg            # marca de barras                               [novo]
├── src/
│   ├── main.tsx                  # entrada: monta <App />                        [era .jsx]
│   ├── vite-env.d.ts             # tipo de VITE_API_URL                          [novo]
│   ├── index.css                 # tokens, fonte, utilitários type-*            [alterado]
│   ├── app/                      # composição da aplicação
│   │   ├── app.tsx               # providers: Query, tema, tooltip, toasts, rotas
│   │   ├── router.tsx            # rotas (/ → /products)
│   │   └── app-layout.tsx        # barra superior + <Outlet />
│   ├── components/
│   │   ├── ui/                   # componentes shadcn (gerados, código do projeto)
│   │   ├── brand/brand-mark.tsx  # marca NexoPDV
│   │   └── theme/                # theme-provider.tsx, theme-toggle.tsx
│   ├── lib/                      # utilitários sem regra de produto
│   │   ├── utils.ts              # cn() (shadcn)
│   │   ├── api-client.ts         # acesso à API: fetch + ApiError por categoria
│   │   ├── money.ts              # preço como texto: parse e formatação BRL
│   │   └── use-debounced-value.ts
│   └── features/products/        # tudo da seção de produtos
│       ├── types.ts              # contrato: Product, ProductInput, ProductPage
│       ├── api.ts                # acesso à API: list/create/update/remove
│       ├── queries.ts            # hooks do TanStack Query
│       ├── gtin.ts               # regra de validação: GTIN e dígito verificador
│       ├── ean.ts                # regra: codificação EAN-13/UPC-A/EAN-8 em barras
│       ├── validation.ts         # regra de validação do formulário
│       ├── use-product-list-params.ts  # busca e página na URL
│       ├── products-page.tsx     # página: orquestra lista, formulário e remoção
│       ├── products-list.tsx     # componente: tabela/lista + estados
│       ├── products-pagination.tsx
│       ├── product-form-sheet.tsx    # componente: painel lateral com o formulário
│       ├── delete-product-dialog.tsx
│       ├── price-tag.tsx         # etiqueta de preço
│       ├── shelf-label.tsx       # prévia da etiqueta de gôndola (extra)
│       └── barcode.tsx           # SVG das barras
└── tests/
    ├── setup.ts                  # jest-dom, MSW, polyfills do jsdom
    ├── render.tsx                # render com providers reais
    ├── msw/                      # server.ts, catalog.ts (catálogo falso), handlers.ts
    ├── unit/                     # gtin, ean, money, validation, api-client, params
    ├── integration/              # lista, busca, cadastro, edição, remoção, tema, rotas
    └── e2e/products.spec.ts      # fluxo completo na stack real

Removidos: src/App.jsx, src/components/Item*.jsx, src/services/items.js, src/validation.js,
src/main.jsx, tests/setup.js, tests/helpers.js, tests/unit/*, tests/integration/App.test.jsx,
tests/e2e/items.spec.js
```

**Back-end** (camada da Clean Architecture entre colchetes):

```text
backend/
├── app/
│   ├── main.py                                   [composição]      sem o router de itens
│   ├── api/
│   │   ├── cors.py                               [adaptador]       GET, POST, PUT, DELETE
│   │   ├── dependencies.py                       [adaptador]       sem as dependências de itens
│   │   ├── routes/items.py                       [adaptador]       REMOVIDO
│   │   └── schemas/item.py                       [adaptador]       REMOVIDO
│   ├── application/
│   │   ├── commands.py                           [aplicação]       sem ItemData
│   │   ├── ports/item_repository.py              [aplicação]       REMOVIDO
│   │   └── services/item_service.py              [aplicação]       REMOVIDO
│   ├── domain/
│   │   ├── item.py                               [domínio]         REMOVIDO
│   │   └── errors.py                             [domínio]         sem DuplicateItemNameError
│   └── infrastructure/
│       ├── models/item.py                        [infraestrutura]  REMOVIDO
│       └── repositories/
│           ├── sqlalchemy_product_repository.py  [infraestrutura]  ORDER BY id DESC
│           ├── in_memory_product_repository.py   [infraestrutura]  ordem invertida
│           ├── sqlalchemy_item_repository.py     [infraestrutura]  REMOVIDO
│           └── in_memory_item_repository.py      [infraestrutura]  REMOVIDO
├── alembic/
│   ├── env.py                                    [infraestrutura]  sem o import de itens
│   └── versions/<rev>_drop_items.py              [infraestrutura]  NOVO (reversível)
└── tests/
    ├── integration/test_cors.py                  via /products; PUT/DELETE sim, PATCH não
    ├── integration/test_migrations.py            sem items depois do head
    ├── integration/test_items_api.py             REMOVIDO
    ├── integration/test_item_repository_contract.py  REMOVIDO
    ├── integration/test_product_repository_contract.py  ordem decrescente
    ├── integration/test_products_api.py          ordem decrescente na listagem
    ├── unit/application/test_product_service.py  ordem decrescente (SC-005)
    ├── unit/application/test_item_service.py     REMOVIDO
    ├── unit/domain/test_item.py                  REMOVIDO
    └── unit/domain/test_errors.py                sem o erro de itens
```

**Outros arquivos**

| Arquivo | Mudança |
|---|---|
| `Makefile` | projeto do E2E `lab-e2e` → `nexopdv-e2e`; textos de ajuda |
| `.github/workflows/ci-frontend.yml` | sem mudança de passos (o `build` já inclui `tsc -b`); conferir que roda |
| `CLAUDE.md` | comandos e estrutura do front-end |
| `README.md` | trechos que citam o laboratório de itens (a reescrita completa fica para o fechamento, C-12) |
| `specs/002-produtos/spec.md` e `contracts/products-api.md` | nota de que a ordem mudou na 007 (sem apagar o texto) |
| `.claude/skills/frontend-design/` | versionada (commit `chore` próprio, primeiro da branch) |

**Structure Decision**: aplicação web com `backend/` (Clean Architecture, já existente) e
`frontend/` organizado por funcionalidade (`features/products`), com `app/` para a composição,
`components/` para peças sem regra de produto e `lib/` para utilitários. As próximas specs
(estoque, vendas) entram como `features/<nome>` e rotas novas no mesmo layout.

## Ordem de implementação e commits

Cada fatia termina verde e vira um commit atômico (política do projeto: ~8–15 commits por spec).

| # | Fatia | Commit (Conventional Commits, em português) |
|---|---|---|
| 0 | Skill `frontend-design` | `chore: versiona a skill frontend-design do projeto` |
| 1 | Spec, plano, constituição 2.1.0, roadmap 1.2.0, DESIGN.md | `docs(painel): especifica e planeja o painel de produtos (spec 007)` |
| 2 | Back-end: ordem decrescente | `feat(produtos): lista os produtos do mais recente para o mais antigo` |
| 3 | Back-end: CORS | `feat(api): libera PUT e DELETE no CORS para o painel` |
| 4 | Back-end: remoção dos itens + migração | `refactor: remove o recurso de itens do laboratório` |
| 5 | Front-end: base TS, Vite, Biome, testes (sai o laboratório) | `build(frontend): migra o frontend para typescript estrito` |
| 6 | Front-end: shadcn, tokens, fonte, layout, marca, tema | `feat(frontend): adiciona a identidade visual e o layout do painel` |
| 7 | US1: lista, busca, paginação, estados | `feat(painel): lista e busca produtos com paginação` |
| 8 | US2: cadastro | `feat(painel): cadastra produtos pelo painel` |
| 9 | US3: edição | `feat(painel): edita produtos pelo painel` |
| 10 | US4: remoção | `feat(painel): remove produtos com confirmação` |
| 11 | Prévia da etiqueta com barras (extra) | `feat(painel): mostra a prévia da etiqueta de gôndola no formulário` |
| 12 | E2E, Makefile, docs | `test(e2e): cobre o fluxo completo do painel com persistência` |

## Complexity Tracking

Nenhuma violação da constituição a justificar.
