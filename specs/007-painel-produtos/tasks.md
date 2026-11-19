---

description: "Tarefas da spec 007 — Painel de Produtos"
---

# Tasks: Painel de Produtos

**Input**: `specs/007-painel-produtos/`: [plan.md](plan.md), [spec.md](spec.md),
[research.md](research.md), [data-model.md](data-model.md),
[contracts/products-api-changes.md](contracts/products-api-changes.md),
[contracts/ui.md](contracts/ui.md), [quickstart.md](quickstart.md) e
[frontend/DESIGN.md](../../frontend/DESIGN.md)

**Tests**: obrigatórios (constituição v2.1.0, Princípio I). Cada tarefa de teste é um passo RED:
escrever, rodar e ver falhar **por asserção** (não por import, sintaxe ou tipo). Se o módulo
testado ainda não existe, criar só o esboço (função que lança `Error("não implementado")` ou
componente que devolve `null`; no Python, `raise NotImplementedError`) para o teste rodar. Cada
tarefa de implementação é GREEN + REFACTOR e só termina com os testes dela e a suíte da parte
afetada verdes (`make test` no back-end, `make frontend-test` no front-end). Estilo puramente
visual é conferido por capturas de tela (T061).

**Como os testes do front-end acham os elementos**: pelo papel e pelo nome acessível do
[contrato da interface](contracts/ui.md) (`getByRole('button', { name: 'Novo produto' })`),
nunca por classe CSS ou `data-testid`. A API é simulada pelo MSW (research D12); um teste que
precisa de outro comportamento troca a rota com `server.use(...)`.

**Idioma**: código, arquivos, rotas e parâmetros em **inglês**; textos da interface, mensagens,
comentários e documentação em **português**. Arquivos do front-end em kebab-case.

**Rastreabilidade**: cada teste cita o requisito que cobre: docstring no Python
(`"""FR-005: …"""`), nome do `it`/`test` ou comentário no TypeScript
(`it("FR-006: mostra o erro com 'Tentar de novo'", …)`).

**Comandos**: da raiz, `make test`, `make lint`, `make format`, `make frontend-check`,
`make frontend-test`, `make frontend-build`, `make e2e`. Um arquivo só:
`cd backend && poetry run pytest tests/integration/test_cors.py` ou
`cd frontend && npx vitest run tests/unit/gtin.test.ts`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem depender de tarefa incompleta)
- **[Story]**: história de usuário da tarefa (US1 a US4)
- Caminhos relativos à raiz do repositório

---

## Phase 1: Setup

**Purpose**: confirmar o ponto de partida.

- [X] T001 Confirmar a linha de base na branch `007-painel-produtos`: `make test`, `make lint`, `make frontend-check` e `make frontend-test` verdes antes de qualquer mudança; anotar o número de testes do back-end e do front-end

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**: API pronta para o painel (ordem, CORS, laboratório fora) e a base do front-end
(TypeScript, shadcn, tema, testes, cliente HTTP, layout).

**⚠️ CRITICAL**: nenhuma história começa antes desta fase terminar.

### Back-end: listagem do mais recente para o mais antigo (FR-005, research D15)

- [X] T002 [P] Inverter as expectativas de ordem nos testes do back-end (RED): em `backend/tests/integration/test_product_repository_contract.py`, `test_list_returns_products_in_insertion_order_with_total` vira `test_list_returns_newest_products_first_with_total` (espera `list(reversed(clothes))`), e ajustar `test_list_slices_with_offset_and_limit`, `test_list_filters_by_name_ignoring_case_and_accents`, `test_list_filters_and_paginates_together`, `test_list_without_name_does_not_filter` e `test_update_replaces_product_and_keeps_its_position` para a ordem decrescente; em `backend/tests/integration/test_products_api.py`, as listagens (`test_list_uses_default_page_and_size`, `test_walking_all_pages_returns_each_product_once`, `test_list_filters_by_name_without_accents` com `[sweatpants, jeans]`); em `backend/tests/unit/application/test_product_service.py`, `test_walking_all_pages_returns_each_product_once_in_order` passa a esperar do mais novo para o mais antigo. Docstrings citam "FR-005 (spec 007)"
- [X] T003 Implementar a ordem decrescente (GREEN): `order_by(ProductModel.id.desc())` em `backend/app/infrastructure/repositories/sqlalchemy_product_repository.py`, atualizando o comentário (UUID v7 crescente → mais novo primeiro); `matches` invertido em `backend/app/infrastructure/repositories/in_memory_product_repository.py` (a atualização mantém a posição do dicionário); `make test` verde
- [X] T004 [P] Acrescentar nota sem apagar o texto: no FR-009 de `specs/002-produtos/spec.md` e na seção de listagem de `specs/002-produtos/contracts/products-api.md`, "Alterado pela spec 007 (2026-11-19): do mais recente para o mais antigo"

### Back-end: CORS com os métodos do painel (RP-003, research D9 e D17)

- [X] T005 Reescrever `backend/tests/integration/test_cors.py` sobre `/products` (RED): o `preflight` recebe o método e o caminho; preflight `PUT` e `DELETE` em `/products/{um uuid qualquer}` vindos de `http://localhost:5173` respondem 200 com o método em `access-control-allow-methods`; preflight `PATCH` responde 400; `GET /products` com origem permitida traz `access-control-allow-origin`; origem desconhecida continua recusada; os testes de `cors_origins()` continuam iguais
- [X] T006 Implementar `allow_methods=["GET", "POST", "PUT", "DELETE"]` em `backend/app/api/cors.py`, com o docstring explicando que são exatamente os métodos usados pelo painel (PATCH fica fora); `make test` verde

### Back-end: remoção do laboratório de itens (FR-023, FR-024, RP-008, research D16)

- [X] T007 Escrever os testes da remoção (RED): em `backend/tests/integration/test_migrations.py`, depois do `upgrade head` as tabelas são exatamente `{"products", "alembic_version"}` e, depois do `downgrade base`, nenhuma tabela da aplicação sobra; em `backend/tests/integration/test_app.py`, `GET /items/` e `POST /items/` respondem 404 (FR-023)
- [X] T008 Apagar o recurso em todas as camadas: `backend/app/domain/item.py`, `DuplicateItemNameError` em `backend/app/domain/errors.py`, `ItemData` em `backend/app/application/commands.py`, `backend/app/application/ports/item_repository.py`, `backend/app/application/services/item_service.py`, `backend/app/infrastructure/models/item.py`, `backend/app/infrastructure/repositories/sqlalchemy_item_repository.py`, `backend/app/infrastructure/repositories/in_memory_item_repository.py`, `backend/app/api/schemas/item.py`, `backend/app/api/routes/items.py`, as funções `get_item_repository`/`get_item_service` e seus imports em `backend/app/api/dependencies.py`, o `include_router(items.router)` e o import em `backend/app/main.py`, o import de `app.infrastructure.models.item` em `backend/alembic/env.py`; e os testes `backend/tests/integration/test_items_api.py`, `backend/tests/integration/test_item_repository_contract.py`, `backend/tests/unit/application/test_item_service.py`, `backend/tests/unit/domain/test_item.py` e o teste `test_duplicate_item_name_error_is_conflict_with_message` (com o import) em `backend/tests/unit/domain/test_errors.py`. Confirmar com `grep -ri item backend/app backend/alembic/env.py` que não sobra referência (exceto `items` da paginação)
- [X] T009 Criar a migração `backend/alembic/versions/<rev>_drop_items.py` com `down_revision = "4f1e2a7c9b3d"`: `upgrade` faz `op.drop_table("items")`; `downgrade` recria a tabela como na migração original (`id` `sa.Uuid()` não nulo com `pk_items`, `name` `sa.String(length=100)` não nulo com `uq_items_name`, `description` `sa.String(length=500)` anulável). Gerar o esqueleto com `make db-migration msg="drop items"` (com o modelo já removido) e conferir/ajustar à mão; `make test`, `make lint` e `make format` verdes (fecha T007)

**Checkpoint de commit (back-end)**: três commits, `feat(produtos)` (T002–T004), `feat(api)`
(T005–T006) e `refactor` (T007–T009), cada um verde.

### Front-end: base TypeScript (research D1, D18, D19)

- [X] T010 Apagar o front-end do laboratório: `frontend/src/App.jsx`, `frontend/src/main.jsx`, `frontend/src/components/ItemForm.jsx`, `frontend/src/components/ItemList.jsx`, `frontend/src/services/items.js`, `frontend/src/validation.js`, `frontend/tests/setup.js`, `frontend/tests/helpers.js`, `frontend/tests/unit/ItemForm.test.jsx`, `frontend/tests/unit/ItemList.test.jsx`, `frontend/tests/unit/items.test.js`, `frontend/tests/unit/validation.test.js`, `frontend/tests/integration/App.test.jsx` e `frontend/tests/e2e/items.spec.js`
- [X] T011 Instalar e configurar o TypeScript em `frontend/`: `npm install -D typescript@^7 @types/react @types/react-dom @types/node`; criar `frontend/tsconfig.json` (só `references` para app e node), `frontend/tsconfig.app.json` (`strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `jsx: react-jsx`, `moduleResolution: bundler`, `types: ["vite/client"]` (sem os globais do Vitest: os testes importam `describe`, `it` e `expect`), `paths: {"@/*": ["./src/*"]}`, `include: ["src", "tests"]` sem `tests/e2e`) e `frontend/tsconfig.node.json` (`vite.config.ts`, `playwright.config.ts`, `tests/e2e`); renomear `frontend/vite.config.js` → `frontend/vite.config.ts` com `resolve.alias` `@` → `./src` e o Vitest com `setupFiles: ["./tests/setup.ts"]` e `include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.{ts,tsx}"]`; renomear `frontend/playwright.config.js` → `frontend/playwright.config.ts`; criar `frontend/src/vite-env.d.ts` tipando `VITE_API_URL`; criar `frontend/src/main.tsx` mínimo (renderiza `<div />` por enquanto); `package.json`: `"build": "tsc -b && vite build"` e `"typecheck": "tsc -b"`; `index.html` aponta para `/src/main.tsx`. Se o TS 7 não for aceito pelo Vitest ou pelo shadcn, usar `typescript@^6` e registrar em research D1
- [X] T012 Instalar as dependências de execução e de teste (research D20): `npm install react-router @tanstack/react-query @fontsource-variable/archivo` e `npm install -D msw`; conferir no `package-lock.json` que React, Vite e Biome não mudaram de major
- [X] T013 Inicializar o shadcn em `frontend/` (research D2): `npx shadcn@latest init --base radix --preset nova` (conferir as flags com `npx shadcn@latest init --help`; ícones `lucide`, CSS `src/index.css`, alias `@/components`, `@/lib`); depois `npx shadcn@latest add button input textarea field input-group table sheet alert-dialog dropdown-menu tooltip skeleton empty alert sonner spinner separator`; ler cada arquivo gerado (passo 7 da skill shadcn) e subir a altura padrão dos controles de 32 px para 36 px em `frontend/src/components/ui/button.tsx`, `input.tsx` e `input-group.tsx` juntos; `npm run typecheck` e `make frontend-check` verdes (usar `overrides` no `frontend/biome.json` só se uma regra acusar código gerado, com o motivo comentado)
- [X] T014 Aplicar o tema do DESIGN.md em `frontend/src/index.css` (research D3, D4): `@import "@fontsource-variable/archivo/standard.css"`; papéis do shadcn em hex no `:root` (`--background #EEF1F3`, `--card`/`--popover #FFFFFF`, `--foreground` e `--card-foreground`/`--popover-foreground #1B1E2E`, `--muted-foreground #5B6075`, `--border #D9DDE4`, `--input #8A90A5`, `--primary #2B39A8`, `--primary-foreground #FFFFFF`, `--ring #2B39A8`, `--destructive #C21F32`) e no `.dark` (`#121528`, `#1A1E36`, `#E8EAF4`, `#A2A7C0`, `#2C3150`, `#6E7499`, `--primary #8F9BFF` com `--primary-foreground #121528`, `#FF7A7A`); tokens próprios registrados no `@theme inline`: `--price-tag #FFD43B`, `--price-tag-border #D9AE00`, `--price-tag-foreground #1B1E2E` (iguais nos dois temas), `--success #1F7A4D`/`#5FD69A`; `--font-sans: "Archivo Variable", system-ui, sans-serif`; raios fixos (`--radius-sm: 2px` etiqueta, `--radius-md`/`--radius-lg: 6px` controles, `--radius-xl`/`--radius-2xl: 10px` superfícies); `--shadow-lg: 0 16px 40px -12px rgb(18 21 40 / 0.28)` e `--shadow-xs: 0 0 #0000`; utilitários `@utility type-page-title`, `type-brand`, `type-meta`, `type-price-list` e `type-price-label` com os valores do frontmatter do DESIGN.md (`font-stretch` 118%/125%/100%/72%/68%); `@keyframes row-highlight` (amarelo-etiqueta → transparente em 1,2 s) com a variante estática sob `prefers-reduced-motion` (research D14)
- [X] T015 [P] Ajustar `frontend/index.html` e criar `frontend/public/favicon.svg`: título "Produtos | NexoPDV", `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`, sem as classes do laboratório no `<body>`, e o script inline que lê `localStorage["nexopdv-theme"]` (ou `prefers-color-scheme`) e aplica a classe `dark` no `<html>` antes do React (research D11); o favicon é a marca: cinco barras verticais de larguras 1-2-1-3-1 em `#2B39A8`

### Front-end: infraestrutura de testes (research D12)

- [X] T016 Criar `frontend/tests/setup.ts`: `@testing-library/jest-dom/vitest`; `cleanup` e `localStorage.clear()` depois de cada teste; polyfills que o jsdom não tem (`window.matchMedia` controlável por teste, `ResizeObserver`, `Element.prototype.hasPointerCapture`/`releasePointerCapture`, `scrollIntoView`); ciclo do MSW (`server.listen({ onUnhandledRequest: "error" })`, `resetHandlers` e `catalog.reset()` depois de cada teste, `close` no fim)
- [X] T017 [P] Criar a API simulada em `frontend/tests/msw/`: `catalog.ts`, catálogo falso em memória que segue o contrato (`GET /products` com `page`, `size` e `name` sem diferenciar maiúsculas e acentos, **do mais novo para o mais antigo**, resposta `{ items, total, page, size }`; `POST` devolve 201 com `id` novo e `price` com duas casas, 409 `{"detail": "Código de barras já cadastrado"}` se o código já existiu, inclusive removido; `PUT /products/:id` 200 ou 404 `{"detail": "Produto não encontrado"}` ou 409; `DELETE /products/:id` 204 ou 404, mantendo o código reservado), com `seed(products)`, `reset()` e um contador de requisições por método; `handlers.ts` (rotas sobre `${VITE_API_URL}/products`); `server.ts` (`setupServer(...handlers)`)
- [X] T018 [P] Criar `frontend/tests/render.tsx`: `renderApp(route = "/products")` monta a aplicação real (providers de `src/app/app.tsx` com um `QueryClient` novo por teste, `retry: false`) num roteador em memória (`createMemoryRouter` com as rotas de `src/app/router.tsx`), devolvendo `user` (`userEvent.setup()`), o roteador (para ler `location`) e os utilitários do `render`

### Front-end: cliente HTTP e tipos (research D7)

- [X] T019 [P] Escrever `frontend/tests/unit/api-client.test.ts` (RED), com MSW: resposta 2xx devolve o JSON; 204 devolve `undefined`; `fetch` que falha vira `ApiError` `kind: "network"`; 404 vira `not-found` com a `message` do `detail`; 409 vira `conflict`; 422 vira `validation` com `fieldErrors` extraídos de `detail[].loc[1]` (`{ barcode: "…" }`) e ignora `loc` sem campo; 500 vira `unexpected`; a URL base vem de `VITE_API_URL` e o corpo vai como JSON com `Content-Type: application/json`
- [X] T020 Implementar `frontend/src/lib/api-client.ts` (`apiRequest<T>(path, { method, body })`, `class ApiError` com `kind`, `message`, `fieldErrors`) e `frontend/src/features/products/types.ts` (`Product`, `ProductInput`, `ProductPage`, `ProductField`, conforme o [data-model §1](data-model.md)); T019 verde

### Front-end: layout, marca e tema (FR-018 a FR-021, research D5, D11)

- [X] T021 [P] Escrever `frontend/tests/integration/app-shell.test.tsx` (RED): `/` redireciona para `/products`; rota desconhecida redireciona para `/products`; existe `banner` com o link "NexoPDV"; `navigation` "Seções" com o link "Produtos" e `aria-current="page"`; `main` com `heading` nível 1 "Produtos" (FR-018)
- [X] T022 [P] Escrever `frontend/tests/integration/theme.test.tsx` (RED, FR-019): sem escolha salva, segue `matchMedia('(prefers-color-scheme: dark)')`; o `button` "Usar tema escuro" põe a classe `dark` no `<html>`, vira "Usar tema claro" e grava `nexopdv-theme` no `localStorage`; com `dark` salvo, a aplicação abre escura
- [X] T023 Implementar a composição e o layout: `frontend/src/app/app.tsx` (`ThemeProvider`, `QueryClientProvider`, `TooltipProvider`, `Toaster` do sonner, `RouterProvider`), `frontend/src/app/router.tsx` (rotas exportadas para o teste: layout com `/products`, `/` e `*` redirecionando), `frontend/src/app/app-layout.tsx` (barra superior com marca, navegação "Seções", troca de tema e `<Outlet />`, coluna de até 1120 px, margens 16/24/32 px), `frontend/src/components/brand/brand-mark.tsx` (barras 1-2-1-3-1 em `text-primary` + "NexoPDV" em `type-brand`), `frontend/src/components/theme/theme-provider.tsx` e `theme-toggle.tsx`, `frontend/src/features/products/products-page.tsx` provisório (só o título) e `frontend/src/main.tsx` montando `<App />`; T021 e T022 verdes; `make frontend-build` verde

**Checkpoint de commit (front-end base)**: `build(frontend)` (T010–T012, T016–T020) e
`feat(frontend)` (T013–T015, T021–T023), cada um com `make frontend-check`,
`make frontend-test` e `make frontend-build` verdes.

---

## Phase 3: User Story 1 - Ver e encontrar produtos do catálogo (Priority: P1) 🎯 MVP

**Goal**: o lojista vê o catálogo paginado, com preço em etiqueta, busca por nome e todos os
estados da lista; busca e página ficam na URL.

**Independent Test**: com produtos semeados no catálogo falso (ou criados pela API), abrir
`/products`, conferir linhas e total, mudar de página, buscar e recarregar mantendo a visão.

### Tests for User Story 1 ⚠️

- [X] T024 [P] [US1] Escrever `frontend/tests/unit/money.test.ts` (RED) para `formatPrice` e `splitPrice`: `"49.90"` → `"R$ 49,90"` e `{ integer: "49", cents: "90" }`; `"1234.50"` → `"R$ 1.234,50"` e `{ integer: "1.234", cents: "50" }`; `"999999.99"` → `"R$ 999.999,99"`; sem converter para `float` no caminho (FR-001)
- [X] T025 [P] [US1] Escrever `frontend/tests/unit/use-product-list-params.test.tsx` (RED), com `renderHook` num roteador em memória: lê `search` e `page` da URL; `page=abc`, `page=0` e `page=-3` viram 1; `setSearch("  camis ")` grava `search=camis` e remove `page`; `setSearch("")` remove `search`; `setPage(1)` remove `page` da URL; `setPage(3)` grava `page=3` (FR-003, FR-004, [data-model §3](data-model.md))
- [X] T026 [P] [US1] Escrever `frontend/tests/integration/products-list.test.tsx` (RED), com o catálogo falso: carregando mostra `status` "Carregando produtos" (handler com atraso) (FR-006, US1-2); com 3 produtos, a `table` "Produtos" mostra nome, descrição, código de barras e preço com nome acessível "R$ 49,90", em ordem do mais novo para o mais antigo, e o texto "3 produtos no catálogo" (FR-001, FR-005, US1-1); catálogo vazio mostra "Nenhum produto cadastrado ainda." e `button` "Cadastrar produto" (US1-6); erro 500 mostra `alert` "Não foi possível carregar os produtos." e "Tentar de novo" volta a lista depois que o handler é restaurado (US1-7); com 12 produtos, "Página 1 de 2", "Próxima página" leva à página 2 e grava `page=2` na URL, e "Página anterior" fica desabilitada na página 1 (FR-002, US1-3); digitar "camis" no `searchbox` "Buscar pelo nome" filtra depois da pausa, volta à página 1, grava `search=camis` e mostra "{n} produtos encontrados" (FR-003, US1-4); busca sem resultado mostra "Nenhum produto com “xyz”." e "Limpar busca" limpa (US1-5); abrir `/products?search=camis&page=2` restaura busca e página (FR-004, US1-8); `page=999` com 12 produtos mostra a última página (Edge Cases); digitar "ca" e logo "cam" com a resposta de "ca" atrasada mostra só o resultado de "cam" (Edge Cases); com `matchMedia` de celular (< 640 px), aparece a `list` "Produtos" em vez da tabela, com as ações num menu (FR-020)

### Implementation for User Story 1

- [X] T027 [P] [US1] Implementar `frontend/src/lib/money.ts` (`formatPrice`, `splitPrice`, só com operações de texto e `Intl.NumberFormat("pt-BR")` sobre a parte inteira); T024 verde
- [X] T028 [P] [US1] Implementar `frontend/src/features/products/use-product-list-params.ts` sobre `useSearchParams` e `frontend/src/lib/use-debounced-value.ts` (300 ms); T025 verde
- [X] T029 [US1] Implementar `listProducts({ search, page })` em `frontend/src/features/products/api.ts` (`GET /products?page&size=10&name`, `name` só se houver busca) e `useProductsPage` em `frontend/src/features/products/queries.ts` (chave `["products", { search, page }]`, `placeholderData: keepPreviousData`, `retry: 1` fora dos testes)
- [X] T030 [P] [US1] Implementar `frontend/src/features/products/price-tag.tsx` (DESIGN.md: fundo `bg-price-tag`, borda `border-price-tag-border`, raio `rounded-sm`, `R$` pequeno, inteiro em `type-price-list`, centavos menores e elevados; `aria-label` com `formatPrice` e partes visuais com `aria-hidden`; tamanhos `list` e `label`)
- [X] T031 [US1] Implementar `frontend/src/features/products/products-list.tsx` (desktop: `Table` "Produtos" com Produto — nome e descrição resumida em segunda linha —, Código de barras com `tabular-nums`, Preço à direita com `PriceTag`, e ações `ghost` com `Tooltip`; celular: `list` empilhada com ações num `DropdownMenu`; escolha por `useIsMobile` em `frontend/src/lib/use-is-mobile.ts`, `matchMedia("(max-width: 639px)")`; estados com `Skeleton` + `status`, `Empty` e `Alert` + "Tentar de novo", textos do [contrato da interface](contracts/ui.md)) e `frontend/src/features/products/products-pagination.tsx` (`navigation` "Paginação", "Página {p} de {n}", "Mostrando {a}–{b} de {total}")
- [X] T032 [US1] Completar `frontend/src/features/products/products-page.tsx`: título "Produtos" em `type-page-title`, total, `searchbox` "Buscar pelo nome" com ícone (`InputGroup`), botão "Novo produto" (ainda sem ação), lista e paginação; ajuste de `page` além da última; T026 verde e `make frontend-build` verde

**Checkpoint**: US1 funciona sozinha; commit `feat(painel): lista e busca produtos com paginação`.

---

## Phase 4: User Story 2 - Cadastrar um produto (Priority: P2)

**Goal**: o lojista cadastra pelo painel lateral, com validação junto aos campos, erros do
servidor tratados e o produto novo aparecendo no topo, destacado.

**Independent Test**: cadastrar pelo painel, ver o toast e o produto no topo; recarregar e
continuar vendo; tentar código repetido e inválido.

### Tests for User Story 2 ⚠️

- [X] T033 [P] [US2] Escrever `frontend/tests/unit/gtin.test.ts` (RED) para `isValidGtin` e `gtinError`: válidos `7891000315507` (EAN-13), `96385074` (EAN-8), `036000291452` (UPC-A), `17891000315504` (GTIN-14); dígito errado `7891000315508` → "Confira os dígitos: o código de barras não é válido."; `123`, `789100031550` com letra, 9 ou 15 dígitos → "Use só números: 8, 12, 13 ou 14 dígitos." (FR-009)
- [X] T034 [P] [US2] Escrever testes de `parsePriceInput` em `frontend/tests/unit/money.test.ts` (RED): `"49,90"` e `"49.90"` → `"49.90"`; `"49.9"` → `"49.90"`; `"1234,5"` → `"1234.50"`; `" 10 "` → `"10.00"`; `""` → "Informe o preço de venda."; `"abc"` e `"1,2,3"` → "Use só números, com vírgula para os centavos."; `"0"` e `"0,00"` → "Informe um preço maior que zero."; `"49,999"` → "Use no máximo duas casas decimais."; `"1000000"` → "O preço máximo é R$ 999.999,99." (comparação em centavos inteiros) (FR-009, FR-010)
- [X] T035 [P] [US2] Escrever `frontend/tests/unit/validation.test.ts` (RED) para `validateProductForm(values)` → `{ ok: true, input: ProductInput } | { ok: false, errors }`: nome vazio ou só espaços → "Informe o nome do produto."; nome com 121 caracteres (após aparar) → "Use no máximo 120 caracteres."; nome aparado no `input`; descrição com 501 caracteres → "Use no máximo 500 caracteres."; descrição vazia ou só espaços → `null`; código e preço delegam a `gtinError` e `parsePriceInput`; vários erros ao mesmo tempo (FR-009, [data-model §2](data-model.md))
- [X] T036 [US2] Escrever `frontend/tests/integration/product-create.test.tsx` (RED): "Novo produto" abre o `dialog` "Novo produto" com foco no `textbox` "Nome"; preencher "Camiseta Básica Branca M", "7891000315507", "49,90" e "Cadastrar produto" envia `POST` com `{ name, description: null, barcode, price: "49.90" }`, mostra o toast "Produto cadastrado", fecha o painel e mostra o produto **na primeira linha** com `data-highlighted` (US2-1, FR-005, FR-015, FR-017); enviar vazio não faz requisição e marca `aria-invalid` + mensagem em cada campo (US2-3, FR-009); código `7891000315508` mostra o erro do dígito (US2-3); código já cadastrado (409) mostra "Código de barras já cadastrado" no campo e mantém os dados (US2-4, FR-011); 422 com `loc: ["body", "price"]` mostra a mensagem no campo preço (FR-011); servidor fora do ar mostra `alert` dentro do painel e mantém os dados (US2-6); com resposta atrasada, o botão fica desabilitado e dois cliques fazem uma requisição só (US2-5, FR-012); `Esc` fecha sem requisição e o foco volta ao "Novo produto" (FR-021); no catálogo vazio, "Cadastrar produto" também abre o painel (US1-6)

### Implementation for User Story 2

- [X] T037 [P] [US2] Implementar `frontend/src/features/products/gtin.ts` (`isValidGtin`, `gtinError`, mesmo algoritmo do domínio do back-end: pesos 3 e 1 da direita para a esquerda, sem contar o dígito verificador); T033 verde
- [X] T038 [P] [US2] Implementar `parsePriceInput` em `frontend/src/lib/money.ts` (texto → `{ ok, value } | { ok, error }`, sem `float`); T034 verde
- [X] T039 [US2] Implementar `frontend/src/features/products/validation.ts` (`validateProductForm`, `ProductFormValues` com os quatro campos como texto); T035 verde
- [X] T040 [US2] Implementar `createProduct(input)` em `frontend/src/features/products/api.ts` e `useCreateProduct` em `frontend/src/features/products/queries.ts` (sem retry; invalida `["products"]` no sucesso)
- [X] T041 [US2] Implementar `frontend/src/features/products/product-form-sheet.tsx`: `Sheet` pela direita (tela cheia no celular) com `SheetTitle` "Novo produto"; `FieldGroup`/`Field` com "Nome", "Descrição (opcional)" (`Textarea`), "Código de barras" (`inputMode="numeric"`) e "Preço de venda" (`InputGroup` com prefixo "R$", `inputMode="decimal"`); erros com `data-invalid` no `Field`, `aria-invalid` e `aria-describedby` no controle; validação no envio e, depois do primeiro envio, a cada alteração; erros do servidor por categoria (`conflict` → código de barras; `validation` → campo do `fieldErrors`; `network`/`unexpected` → `Alert` geral); botão "Cadastrar produto" com `Spinner` e `disabled` durante o envio; "Cancelar"
- [X] T042 [US2] Ligar o cadastro em `frontend/src/features/products/products-page.tsx` e `products-list.tsx`: "Novo produto" e o "Cadastrar produto" do estado vazio abrem o painel; no sucesso, toast "Produto cadastrado", volta à página 1 sem busca se preciso para o produto aparecer, e a linha do id criado recebe `data-highlighted` (animação `row-highlight`, research D14); T036 verde e `make frontend-build` verde

**Checkpoint**: US1 + US2 funcionam; commit `feat(painel): cadastra produtos pelo painel`.

---

## Phase 5: User Story 3 - Editar um produto (Priority: P3)

**Goal**: o lojista edita a partir dos dados atuais, com as mesmas validações, e é avisado se o
produto sumiu.

**Independent Test**: editar o preço de um produto e ver o valor novo, também depois de
recarregar.

### Tests for User Story 3 ⚠️

- [X] T043 [US3] Escrever `frontend/tests/integration/product-edit.test.tsx` (RED): "Editar Camiseta Básica Branca M" abre o `dialog` "Editar produto" com os campos preenchidos (preço como "49,90") (US3-1); mudar o preço para "54,90" e "Salvar alterações" envia `PUT /products/{id}` com o cadastro completo, mostra o toast "Alterações salvas", fecha e a linha mostra "R$ 54,90" com `data-highlighted`, na mesma posição (US3-2, FR-005, FR-017); apagar a descrição envia `description: null` (US3-3); código de outro produto (409) mostra o erro no campo (US3-4); 404 fecha o painel, mostra o toast "Este produto não existe mais. A lista foi atualizada." e a lista é recarregada sem ele (US3-5, FR-016); "Cancelar" e `Esc` não fazem requisição (US3-6)

### Implementation for User Story 3

- [X] T044 [US3] Implementar `updateProduct(id, input)` em `frontend/src/features/products/api.ts` e `useUpdateProduct` em `frontend/src/features/products/queries.ts` (sem retry; invalida `["products"]` no sucesso e no 404)
- [X] T045 [US3] Estender `frontend/src/features/products/product-form-sheet.tsx` com o modo edição (`product` opcional: título "Editar produto", valores iniciais a partir do `Product`, com `price` "49.90" exibido como "49,90", botão "Salvar alterações") e ligar em `products-page.tsx`/`products-list.tsx` o "Editar {nome}" de cada linha, o toast "Alterações salvas", o destaque da linha e o tratamento do `not-found` (FR-016); T043 verde

**Checkpoint**: US1–US3 funcionam; commit `feat(painel): edita produtos pelo painel`.

---

## Phase 6: User Story 4 - Remover um produto (Priority: P4)

**Goal**: remover com confirmação que mostra o nome e avisa do código reservado.

**Independent Test**: remover um produto, ver que some e continua fora depois de recarregar.

### Tests for User Story 4 ⚠️

- [X] T046 [US4] Escrever `frontend/tests/integration/product-delete.test.tsx` (RED): "Remover Camiseta Básica Branca M" abre o `alertdialog` "Remover Camiseta Básica Branca M?" com o texto do código reservado (7891000315507) e foco em "Cancelar" (US4-1, FR-013); "Remover produto" envia `DELETE`, mostra o toast "Produto removido" e o produto some (US4-2); "Cancelar" não faz requisição (US4-3); remover o único produto da página 2 leva à página 1 (`page` some da URL) (US4-4, FR-014); 404 mostra o toast "Este produto não existe mais. A lista foi atualizada." e recarrega a lista (US4-5, FR-016); servidor fora do ar mostra o erro no diálogo e o produto continua na lista (US4-6); com resposta atrasada, "Remover produto" fica desabilitado (FR-012)

### Implementation for User Story 4

- [X] T047 [US4] Implementar `removeProduct(id)` em `frontend/src/features/products/api.ts` e `useRemoveProduct` em `frontend/src/features/products/queries.ts` (sem retry; invalida `["products"]` no sucesso e no 404)
- [X] T048 [US4] Implementar `frontend/src/features/products/delete-product-dialog.tsx` (`AlertDialog`, título "Remover {nome}?", texto "O produto sai do catálogo. O código de barras {código} continua reservado e não poderá ser usado em outro produto.", "Cancelar" e "Remover produto" `destructive` com `Spinner`, erro em `Alert` dentro do diálogo) e ligar em `products-page.tsx`/`products-list.tsx` o "Remover {nome}" de cada linha, o toast, a volta de página (FR-014) e o `not-found`; T046 verde e `make frontend-build` verde

**Checkpoint**: CRUD completo pela interface (RP-001); commit `feat(painel): remove produtos com confirmação`.

---

## Phase 7: Prévia da etiqueta de gôndola (FR-022, extra — fora do PDF)

**Goal**: o formulário mostra a etiqueta do produto enquanto o lojista digita, com as barras
reais do código quando ele é válido. Fase cortável se o prazo apertar (C-12).

**Independent Test**: digitar nome, preço e um código válido e ver a etiqueta com as barras;
trocar por um código inválido e ver só os dígitos.

### Tests ⚠️

- [ ] T049 [P] [US2] Escrever `frontend/tests/unit/ean.test.ts` (RED) para `encodeEan(digits)`: EAN-13 `5901234123457` igual ao padrão de referência de 95 módulos (gerado de forma independente, por exemplo com um script Python à parte, e colado no teste como texto `"101…"`); começa e termina com `101` e tem `01010` no meio; UPC-A `036000291452` codifica igual ao EAN-13 `0036000291452`; EAN-8 `96385074` tem 67 módulos e confere com o padrão de referência; GTIN-14 `17891000315504`, código inválido e texto com letras devolvem `null` (research D10)
- [ ] T050 [P] [US2] Escrever `frontend/tests/integration/shelf-label.test.tsx` (RED): no `dialog` "Novo produto", a `figure` "Prévia da etiqueta" mostra o nome digitado e o preço com nome acessível "R$ 49,90"; com código válido aparece o `img` "Código de barras 7891000315507"; com `7891000315508` o `img` some e os dígitos continuam; no modo edição a prévia abre preenchida (FR-022)

### Implementation

- [ ] T051 [P] [US2] Implementar `frontend/src/features/products/ean.ts` (tabelas L, G e R, paridade do primeiro dígito, guardas `101`/`01010`/`101`; UPC-A como EAN-13 com zero à esquerda); T049 verde
- [ ] T052 [US2] Implementar `frontend/src/features/products/barcode.tsx` (SVG com um `rect` por barra, `role="img"`, `aria-label` "Código de barras {dígitos}", dígitos embaixo com `tabular-nums`) e `frontend/src/features/products/shelf-label.tsx` (`figure` com `figcaption` acessível "Prévia da etiqueta", nome, `PriceTag` tamanho `label`, `Barcode` ou só os dígitos) e colocar a prévia no topo de `product-form-sheet.tsx`; T050 verde

**Checkpoint**: commit `feat(painel): mostra a prévia da etiqueta de gôndola no formulário`.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: E2E, capturas de tela, documentação e verificação final.

- [ ] T053 Escrever `frontend/tests/e2e/products.spec.ts` (RP-005, SC-008, research D13): gerar um GTIN-13 único por execução (prefixo `2`, 11 dígitos do relógio, dígito verificador calculado) e um nome único; abrir `/`; cadastrar; ver o toast e o produto no topo; recarregar e ver de novo (SC-004); buscar pelo nome; editar o preço para outro valor; recarregar e ver o preço novo; remover confirmando; recarregar e confirmar que sumiu
- [ ] T054 Renomear o projeto do Compose do E2E de `lab-e2e` para `nexopdv-e2e` no `Makefile` (variável `E2E_COMPOSE`, comentário e texto do `help`) e rodar `make e2e` (Docker Desktop ligado) até ficar verde
- [ ] T055 [P] Conferir que nada mais cita o laboratório: `grep -rniE "items?\b|item manager|gerenciador de itens" frontend/src frontend/tests backend/app Makefile compose.yaml .github` sem ocorrências fora da paginação (`items` de `ProductPage`) e do histórico de migrações
- [ ] T056 [P] Atualizar `CLAUDE.md`: comandos do front-end (`make frontend-install`, `frontend-dev`, `frontend-check`, `frontend-test`, `frontend-build`, `e2e`, `check-all`) e a estrutura de `frontend/` (`src/app`, `src/components`, `src/lib`, `src/features/<nome>`, `tests/{unit,integration,e2e,msw}`, `DESIGN.md`)
- [ ] T057 [P] Atualizar em `README.md` só os trechos que descrevem o laboratório de itens ou o front-end antigo, para que nada descreva o que não existe mais; a reescrita completa fica para o fechamento (C-12)
- [ ] T058 Rodar a verificação completa: `make format`, `make lint`, `make test`, `make frontend-check`, `make frontend-test`, `make frontend-build` e `make e2e`, todos verdes
- [ ] T059 Seguir o roteiro manual do [quickstart.md](quickstart.md) com `make up-build` sobre o volume existente do Compose (prova que a migração apaga a tabela `items` num banco que a tinha) e anotar qualquer divergência
- [ ] T060 [P] Conferir acessibilidade e responsividade no navegador: só teclado nos fluxos de cadastro, edição e remoção (foco visível, `Esc`, foco devolvido); 360 px sem rolagem horizontal (`document.documentElement.scrollWidth <= innerWidth`); contraste dos pares do DESIGN.md nos dois temas (FR-020, FR-021, SC-006)
- [ ] T061 Capturar telas com o Playwright (lista desktop clara e escura, celular 360 px, painel de cadastro com a prévia, erro de campo, diálogo de remoção, estado vazio e erro de carregamento), criticar contra o [DESIGN.md](../../frontend/DESIGN.md) (cores, Archivo nas três larguras, raios, amarelo só em preço, nada de padrão genérico) e corrigir o que destoar; mostrar as capturas ao usuário antes do commit final (Princípio I, estilo visual)
- [ ] T062 Escrever `explicacao/05-spec-007-painel-produtos.md` (pasta local, nunca versionada), didático para quem não conhece front-end: o que é cada peça (TypeScript, Vite, React, shadcn, Tailwind, tokens, TanStack Query, React Router, MSW, Playwright), por que foi escolhida, como os dados vão da tela ao banco, como explicar a identidade visual e o roteiro do vídeo (quickstart)

**Checkpoint final**: commit `test(e2e): cobre o fluxo completo do painel com persistência`
(T053–T057); depois, PR `007-painel-produtos` → `projeto-final`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depois do Setup; **bloqueia todas as histórias**. Dentro dela, o
  bloco do back-end (T002–T009) e o do front-end (T010–T023) são independentes entre si.
- **US1 (Phase 3)**: depois da Foundational.
- **US2 (Phase 4)**: depois da US1, porque o produto cadastrado aparece na lista da US1 e o
  formulário entra na página da US1.
- **US3 (Phase 5)**: depois da US2 (reaproveita o painel de formulário).
- **US4 (Phase 6)**: depois da US1; independente de US2 e US3, mas segue a ordem para os
  commits saírem em sequência.
- **Prévia (Phase 7)**: depois da US2 (e da US3 para o caso de edição do T050). Cortável.
- **Polish (Phase 8)**: depois das histórias; o E2E (T053) precisa de US1–US4.

### Within Each Phase

- Teste (RED) antes da implementação (GREEN), sempre.
- Funções puras (money, gtin, validation, ean, params) antes dos componentes que as usam.
- `api.ts`/`queries.ts` antes dos componentes da mesma história.

### Parallel Opportunities

- T002 e T004; T005 e T007 (arquivos de teste diferentes) podem ser escritos juntos.
- Back-end (T002–T009) em paralelo com o front-end base (T010–T023).
- T015, T017, T018 e T019 em paralelo depois do T013/T014.
- US1: T024, T025 e T026 juntos; depois T027, T028 e T030 juntos.
- US2: T033, T034 e T035 juntos; depois T037 e T038 juntos.
- Prévia: T049 e T050 juntos.
- Polish: T055, T056, T057 e T060 juntos.

---

## Parallel Example: User Story 1

```text
# Testes RED juntos (arquivos diferentes):
T024 frontend/tests/unit/money.test.ts
T025 frontend/tests/unit/use-product-list-params.test.tsx
T026 frontend/tests/integration/products-list.test.tsx

# Implementações independentes juntas:
T027 frontend/src/lib/money.ts
T028 frontend/src/features/products/use-product-list-params.ts
T030 frontend/src/features/products/price-tag.tsx
```

## Parallel Example: User Story 2

```text
T033 frontend/tests/unit/gtin.test.ts
T034 frontend/tests/unit/money.test.ts (parsePriceInput)
T035 frontend/tests/unit/validation.test.ts
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 e Phase 2 (API pronta, base do front-end com tema e layout).
2. Phase 3 (US1): o painel já mostra o catálogo real, com busca e paginação.
3. **Parar e validar**: `make frontend-test`, `make up-build` e abrir o painel.

### Incremental Delivery

1. Base → US1 (ver) → US2 (cadastrar) → US3 (editar) → US4 (remover): a cada história, um commit
   verde e demonstrável. Depois da US4, o requisito central do PDF (RP-001) está cumprido.
2. Prévia da etiqueta (extra) só depois do CRUD completo; se o prazo de 21/11 apertar, ela é a
   primeira a sair (fica registrada no roadmap).
3. Polish: E2E, capturas, docs e verificação final antes do PR.

---

## Notes

- **[P]**: arquivos diferentes, sem dependência de tarefa incompleta.
- Cada teste falha por asserção antes da implementação; a suíte da parte afetada fica verde ao
  fim de cada tarefa.
- Commits atômicos nos checkpoints, conforme o [plano](plan.md#ordem-de-implementação-e-commits);
  o commit `chore` da skill `frontend-design` e o `docs` com os artefatos da spec vêm antes de
  tudo.
- Nada de atribuição de IA em commits, PR ou documentos.
