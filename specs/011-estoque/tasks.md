---

description: "Lista de tarefas da spec 011 — Controle de Estoque"
---

# Tasks: Controle de Estoque

**Input**: Design documents from `specs/011-estoque/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/stock-api.md](contracts/stock-api.md),
[contracts/ui.md](contracts/ui.md), [quickstart.md](quickstart.md)

**Tests**: obrigatórios (constituição, Princípio I — TDD). Cada tarefa de teste vem antes da
implementação que ela cobre e precisa falhar pelo motivo certo antes de a implementação começar.

**Organization**: o back-end inteiro e a base do front-end são fundação (servem às quatro
histórias); depois, uma fase por história, na ordem de prioridade da spec. Os checkpoints de
commit seguem a tabela "Ordem de implementação e commits" do plano.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa pendente)
- **[Story]**: história da spec (US1–US4)
- Caminhos relativos à raiz do repositório

---

## Phase 1: Setup

**Purpose**: partir de uma base verde e registrar os artefatos da spec.

- [X] T001 Confirmar a base verde antes de mudar código: `make test`, `make lint`, `make frontend-check`, `make frontend-test` e `make frontend-build` na branch `011-estoque`
- [X] T002 Ajustar os artefatos para `parseQuantity` em `frontend/src/lib/quantity.ts` (peça neutra usada por Produtos e Estoque, D12/D15) em `specs/011-estoque/plan.md` e `specs/011-estoque/research.md`

**Checkpoint (commit 1)**: `docs(estoque): especifica e planeja o controle de estoque (spec 011)` — `specs/011-estoque/` completo e `.specify/memory/roadmap.md` 1.3.0.

---

## Phase 2: Foundational — back-end (bloqueia todas as histórias)

**Purpose**: regras, persistência e API do estoque, usadas por todas as telas.

### Domínio (D3)

- [X] T003 [P] Escrever `backend/tests/unit/domain/test_stock.py`: `StockChange.entry` aceita 1 a 99.999 e recusa 0, negativo e 100.000 com `InvalidDataError` no campo `quantity`; observação "até 200 caracteres" aparada, vazia vira `None`, 201 caracteres recusado no campo `note`; `StockChange.adjustment` aceita -99.999 a 99.999 "nunca 0" e exige motivo "3 a 200 caracteres aparados" (campo `reason`); `apply` soma ao saldo, recusa saldo negativo com `InsufficientStockError(available=saldo)` e saldo acima de 999.999 com `StockLimitExceededError`, e devolve `StockMovement` com `balance_after`, `sequence`, `kind`, `note`, `occurred_at` e id UUID v7; `shortfall` = `max(min - qty, 0)`; `stock_status`: `out_of_stock` com saldo 0, `restock` com saldo < mínimo, senão `ok`; `normalize_min_stock` aceita 0 a 99.999 e recusa negativo e 100.000 no campo `min_stock`
- [X] T004 [P] Acrescentar a `backend/tests/unit/domain/test_errors.py`: `InsufficientStockError` e `StockLimitExceededError` são `ConflictError`; mensagens "Saldo insuficiente: há 1 unidade em estoque", "… há 3 unidades em estoque", "… há 0 unidades em estoque" e "O saldo não pode passar de 999.999 unidades"
- [X] T005 [P] Acrescentar a `backend/tests/unit/domain/test_product.py`: `Product.create` começa com `stock_quantity` 0 e `min_stock` 0 (ou o informado); `updated` troca `min_stock` e **mantém** `stock_quantity`; mínimo inválido levanta `InvalidDataError` no campo `min_stock`; propriedades `shortfall`, `needs_restock` e `stock_status`
- [X] T006 Implementar os erros em `backend/app/domain/errors.py`
- [X] T007 Implementar `backend/app/domain/stock.py` (limites, `MovementKind`, `StockStatus`, `StockChange`, `StockMovement`, `StockSummary`, `normalize_min_stock`, `shortfall`, `stock_status`)
- [X] T008 Acrescentar `min_stock` e `stock_quantity` a `backend/app/domain/product.py` (`create(..., min_stock=0)`, `updated(..., min_stock)`, propriedades) e ajustar quem chama `create`/`updated` em `backend/app/application/services/product_service.py`

**Checkpoint (commit 2)**: `feat(estoque): modela saldo, minimo e movimentacoes no dominio` — `make test` e `make lint` verdes.

### Persistência (D1, D2, D4, D5, D6, D7, D10)

- [X] T009 Atualizar `backend/tests/integration/test_migrations.py`: o head tem `products`, `stock_movements` e `alembic_version`; reverter a migração nova remove `stock_movements` e as colunas `stock_quantity` e `min_stock`; o teste da tabela `items` passa a descer até a revisão `4f1e2a7c9b3d`
- [X] T010 Definir as portas: `ProductOrder` (`NEWEST`, `NAME`, `SHORTFALL`) em `backend/app/application/commands.py`; `list(..., restock_only=False, order=ProductOrder.NEWEST)` e a regra "update não grava `stock_quantity`" na docstring de `backend/app/application/ports/product_repository.py`; porta nova `backend/app/application/ports/stock_repository.py` com `record`, `movements` e `summary`
- [X] T011 [P] Escrever `backend/tests/integration/test_stock_repository_contract.py` (parametrizado: em memória e SQLAlchemy, repositórios que enxergam o mesmo armazenamento): entrada grava movimentação `sequence` 1 e o produto passa a ter o saldo; ajuste negativo; recusa por saldo insuficiente e por teto não grava nada; produto removido ou inexistente → `ProductNotFoundError` em `record` e `movements`; histórico do mais recente ao mais antigo, paginado, com total; soma das quantidades = saldo e `balance_after(n) = balance_after(n-1) + quantity(n)`; `ProductRepository.update` depois de uma entrada mantém o saldo; `summary` (para repor, sem estoque, valor com 2 casas, ignora removidos); 50 entradas de 1 unidade em threads simultâneas → saldo 50, sequências 1–50 e saldos 1–50 (no SQLAlchemy, `pytest.skip` fora do PostgreSQL, com o motivo de D4)
- [X] T012 [P] Acrescentar a `backend/tests/integration/test_product_repository_contract.py`: `min_stock` gravado e lido; `restock_only=True` traz só saldo < mínimo; `order=NAME` alfabética sem diferenciar maiúsculas e acentos; `order=SHORTFALL` maior falta primeiro e empate pelo nome; padrão continua do mais novo ao mais antigo
- [X] T013 Atualizar `backend/app/infrastructure/models/product.py`: colunas `stock_quantity` e `min_stock` (`INTEGER NOT NULL DEFAULT 0`), `CheckConstraint` `stock_quantity_range` (`BETWEEN 0 AND 999999`) e `min_stock_range` (`BETWEEN 0 AND 99999`); `values_from` grava `min_stock` mas **não** `stock_quantity`; `from_entity` e `to_entity` com os dois campos
- [X] T014 Criar `backend/app/infrastructure/models/stock_movement.py` (`stock_movements`: `id` UUID, `product_id` FK, `sequence`, `kind` `VARCHAR(16)`, `quantity`, `balance_after`, `note` `VARCHAR(200)`, `occurred_at` com fuso; `UNIQUE (product_id, sequence)`; `CHECK` `kind IN ('entry', 'adjustment')`, `quantity <> 0`, `balance_after >= 0`) e registrá-lo onde o Alembic lê os modelos (`backend/alembic/env.py`)
- [X] T015 Gerar e revisar a migração `backend/alembic/versions/<rev>_add_stock.py` depois de `799308dbf8c8`, com `op.batch_alter_table("products")` e `downgrade` completo (D10)
- [X] T016 Criar `backend/app/infrastructure/repositories/in_memory_store.py` e passar `backend/app/infrastructure/repositories/in_memory_product_repository.py` a usá-lo (filtro `restock_only`, ordens `NAME` e `SHORTFALL`, `update` preservando o saldo guardado)
- [X] T017 Criar `backend/app/infrastructure/repositories/in_memory_stock_repository.py` sobre o mesmo store e o mesmo lock
- [X] T018 Implementar filtro e ordens em `backend/app/infrastructure/repositories/sqlalchemy_product_repository.py` (`stock_quantity < min_stock`; `name_search, id`; `min_stock - stock_quantity desc, name_search, id`)
- [X] T019 Criar `backend/app/infrastructure/repositories/sqlalchemy_stock_repository.py`: `record` com `SELECT … FOR UPDATE` do produto ativo, `max(sequence) + 1`, `change.apply(...)`, grava saldo e movimentação e confirma; `rollback` em qualquer erro; `movements` e `summary`

**Checkpoint (commit 3)**: `feat(estoque): grava saldo e movimentacoes com bloqueio da linha do produto` — `make test` e `make lint` verdes.

### Aplicação e API (D8, D9, D11, D19)

- [X] T020 [P] Escrever `backend/tests/unit/application/test_stock_service.py` (repositórios em memória e relógio fixo): `register_entry` e `adjust` devolvem a movimentação com o horário do relógio; erros de domínio sobem; `movements` devolve `Page` com `page` e `size`; `summary`
- [X] T021 [P] Acrescentar a `backend/tests/unit/application/test_product_service.py`: `create` e `replace` com `min_stock`; PATCH só de `min_stock`; `list` repassa `restock_only` e `order`
- [X] T022 Criar `backend/app/application/services/stock_service.py` e ajustar `ProductData`/`ProductChanges` (`min_stock`) em `backend/app/application/commands.py` e o `ProductService` em `backend/app/application/services/product_service.py`
- [X] T023 [P] Escrever `backend/tests/integration/test_stock_api.py` com todas as linhas de [contracts/stock-api.md](contracts/stock-api.md) §2–§6: 201 de entrada e de ajuste, 404, 422 por campo (`quantity` com `"2"`, `2.5`, `true`, 0 e fora da faixa; `note`; `reason`; id inválido), 409 com as mensagens exatas, nada gravado nos erros, histórico paginado e resumo
- [X] T024 [P] Acrescentar a `backend/tests/integration/test_products_api.py`: saída com `stock_quantity`, `min_stock`, `shortfall` e `stock_status`; `min_stock` no POST, PUT (omitido → 0) e PATCH (`null` → 422); `stock_quantity` enviado é ignorado; `restock=true`; `sort=name` e `sort=shortfall`; `sort=xyz` → 422 em `["query", "sort"]`
- [X] T025 [P] Acrescentar a `backend/tests/integration/test_cors.py`: preflight de `POST /products/{id}/stock/entries` vindo do front-end → 200
- [X] T026 Implementar `backend/app/api/schemas/product.py` (`min_stock` na entrada e no PATCH; campos de estoque na saída) e `backend/app/api/schemas/stock.py` (`EntryInput`, `AdjustmentInput` com `StrictInt`, `MovementOutput`, `MovementPageOutput`, `StockSummaryOutput`)
- [X] T027 Implementar `backend/app/api/routes/stock.py` (entries, adjustments, movements, summary), os parâmetros `restock` e `sort` em `backend/app/api/routes/products.py`, `get_stock_repository`/`get_stock_service` em `backend/app/api/dependencies.py` e o router em `backend/app/main.py`
- [X] T028 Criar o alvo `test-postgres` no `Makefile` (PostgreSQL 17 descartável, `TEST_DATABASE_URL`, container apagado mesmo com falha) e rodá-lo: nenhum teste pulado

**Checkpoint (commit 4)**: `feat(estoque): expoe entradas, ajustes, historico e resumo na API` — `make test`, `make test-postgres` e `make lint` verdes; `make format` sem mudanças.

---

## Phase 2: Foundational — base do front-end

**Purpose**: tipos, dublê da API e peças compartilhadas que as telas de estoque usam.

- [ ] T029 Mover `frontend/src/features/products/products-pagination.tsx` → `frontend/src/components/list-pagination.tsx` (`ListPagination`, com o rótulo da navegação como propriedade) e `frontend/src/features/products/use-product-list-params.ts` → `frontend/src/lib/use-list-params.ts` (`useListParams`); atualizar imports e os testes `frontend/tests/unit/use-product-list-params.test.tsx` (renomeado para `use-list-params.test.tsx`); suíte verde sem mudar comportamento
- [ ] T030 Gerar os componentes shadcn `dialog`, `radio-group` e `toggle-group` em `frontend/src/components/ui/` (`npx shadcn@latest add`), conferindo que só usam `radix-ui` e tokens do tema
- [ ] T031 [P] Escrever `frontend/tests/unit/quantity.test.ts`: `parseQuantity` aceita "24", " 24 ", "1.000" (mil), recusa "", "0" quando o mínimo é 1, "-1", "1,5", "1.5" (não é milhar válido), "abc" e acima do máximo, com mensagens em português
- [ ] T032 Implementar `frontend/src/lib/quantity.ts`
- [ ] T033 Atualizar os tipos em `frontend/src/features/products/types.ts` (`StockStatus`; `Product` com `stock_quantity`, `min_stock`, `shortfall`, `stock_status`; `ProductInput` explícito com `min_stock`) e `listProducts` com `restock` e `sort` em `frontend/src/features/products/api.ts`
- [ ] T034 Atualizar o dublê da API em `frontend/tests/msw/catalog.ts` e `frontend/tests/msw/handlers.ts`: saldo e mínimo nos produtos, `restock` e `sort` na listagem, movimentações com `sequence`, entrada, ajuste (409 com as mensagens do contrato), histórico paginado e resumo
- [ ] T035 [P] Acrescentar a `frontend/tests/unit/validation.test.ts`: estoque mínimo vazio → 0; "10" → 10; "-1", "1,5" e "100000" recusados no campo `min_stock`
- [ ] T036 [P] Acrescentar a `frontend/tests/integration/product-create.test.tsx` e `product-edit.test.tsx`: campo "Estoque mínimo (opcional)" enviado como `min_stock`, preenchido na edição; e a `frontend/tests/integration/products-list.test.tsx`: coluna "Estoque" com "36 un." e as pílulas "Sem estoque" e "Repor"
- [ ] T037 Implementar o campo em `frontend/src/features/products/validation.ts` e `frontend/src/features/products/product-form-sheet.tsx`, a coluna em `frontend/src/features/products/products-list.tsx` e a pílula compartilhada `frontend/src/features/stock/stock-status.tsx`; `frontend/src/features/products/queries.ts` invalida também `["stock"]`

**Checkpoint (commit 5)**: `feat(painel): mostra o saldo dos produtos e o estoque minimo no cadastro` — `make frontend-check`, `make frontend-test` e `make frontend-build` verdes.

---

## Phase 3: User Story 1 — Registrar a entrada de mercadoria e ver o saldo (Priority: P1) 🎯 MVP

**Goal**: o lojista abre a seção Estoque, encontra o produto e registra a entrada; o saldo muda na hora e persiste.

**Independent Test**: com produtos cadastrados, abrir `/stock`, registrar uma entrada, ver o novo saldo e recarregar.

- [ ] T038 [P] [US1] Escrever `frontend/tests/unit/use-stock-list-params.test.tsx`: busca, página e `view=restock` na URL; trocar a visão volta à página 1
- [ ] T039 [P] [US1] Escrever `frontend/tests/unit/stock-validation.test.ts`: entrada exige quantidade de 1 a 99.999 e aceita observação vazia (→ `null`) até 200 caracteres
- [ ] T040 [P] [US1] Escrever `frontend/tests/integration/stock-list.test.tsx`: link "Estoque" no menu leva a `/stock` com `aria-current`; título "Estoque"; pede `sort=name`; colunas e situação; estados (carregando, erro com "Tentar de novo", catálogo vazio com "Ir para Produtos", busca sem resultado com "Limpar busca"); paginação; busca na URL
- [ ] T041 [P] [US1] Escrever `frontend/tests/integration/stock-entry.test.tsx`: "Registrar entrada de {nome}" abre o diálogo com o saldo atual; erros no campo sem envio; envio com `quantity` e `note`; botão "Registrando…" sem envio duplicado; aviso "Entrada registrada: {nome} agora tem {n} un."; saldo novo na lista sem recarregar; 404 fecha e atualiza; erro de rede mantém os dados; Esc fecha sem gravar
- [ ] T042 [US1] Implementar `frontend/src/features/stock/types.ts`, `api.ts` e `queries.ts` (chaves `["stock", …]`; mutações invalidam `["products"]` e `["stock"]`)
- [ ] T043 [US1] Implementar `frontend/src/features/stock/use-stock-list-params.ts` e a validação da entrada em `frontend/src/features/stock/validation.ts`
- [ ] T044 [US1] Implementar `frontend/src/features/stock/stock-list.tsx`, `frontend/src/features/stock/stock-entry-dialog.tsx` e `frontend/src/features/stock/stock-page.tsx`; rota `/stock` com `handle: { title: "Estoque" }` em `frontend/src/app/router.tsx`; "Estoque" vira link em `frontend/src/app/sidebar.tsx`; atualizar `frontend/tests/integration/app-shell.test.tsx`
- [ ] T045 [US1] Capturas de tela da seção Estoque e do diálogo (claro, escuro, 360 px), revisadas antes do commit

**Checkpoint (commit 6)**: `feat(estoque): cria a secao estoque com a entrada de mercadoria`.

---

## Phase 4: User Story 2 — Estoque mínimo e lista de reposição (Priority: P2)

**Goal**: produtos abaixo do mínimo aparecem na visão "Para repor", nos indicadores, no menu e na seção Produtos.

**Independent Test**: com mínimo acima do saldo, o produto aparece em "Para repor"; uma entrada que leva o saldo ao mínimo o tira de lá.

- [ ] T046 [P] [US2] Escrever `frontend/tests/integration/stock-restock.test.tsx`: grupo "Mostrar" com "Todos" e "Para repor" (`aria-pressed`); "Para repor" pede `restock=true&sort=shortfall` e grava `view=restock`; "Repor · faltam 6"; estado "Nenhum produto precisa de reposição."; indicadores "Para repor", "Sem estoque" e "Valor em estoque" (R$) com esqueleto e "—" no erro; após uma entrada, o produto sai da reposição e os números mudam sem recarregar
- [ ] T047 [P] [US2] Atualizar `frontend/tests/integration/products-overview.test.tsx` (indicador "Estoque" com "Para repor" e o link "Ver lista de reposição" → `/stock?view=restock`), `frontend/tests/integration/app-shell.test.tsx` (número para repor no menu, oculto do leitor de tela; some quando é 0) e `frontend/tests/integration/landing.test.tsx` ("Estoque com alerta" como "Disponível")
- [ ] T048 [US2] Implementar o filtro e o estado vazio da visão em `frontend/src/features/stock/stock-page.tsx` e `stock-list.tsx`, e `frontend/src/features/stock/stock-overview.tsx`
- [ ] T049 [US2] Implementar o número no menu em `frontend/src/app/sidebar.tsx`, o indicador em `frontend/src/features/products/catalog-overview.tsx` e o estoque disponível em `frontend/src/features/landing/landing-page.tsx`

**Checkpoint (commit 7)**: `feat(estoque): mostra a lista de reposicao e os indicadores`.

---

## Phase 5: User Story 3 — Ajustar o saldo com motivo (Priority: P3)

**Goal**: o lojista adiciona ou retira unidades com motivo obrigatório, vendo a prévia do saldo.

**Independent Test**: retirar 2 com "Avaria no transporte" baixa o saldo em 2; ajuste sem motivo é recusado.

- [ ] T050 [P] [US3] Acrescentar a `frontend/tests/unit/stock-validation.test.ts`: ajuste exige direção, quantidade de 1 a 99.999 e motivo de 3 a 200 caracteres aparados; "Retirar" acima do saldo exibido recusado com "Saldo insuficiente: há {n} unidade(s) em estoque"; quantidade enviada com sinal
- [ ] T051 [P] [US3] Escrever `frontend/tests/integration/stock-adjustment.test.tsx`: diálogo "Ajustar estoque" com "Retirar" marcado; prévia "Saldo: 36 → 34" (e → 37 com "Adicionar"); erros de motivo e quantidade sem envio; envio `{"quantity": -2, "reason": …}`; aviso "Ajuste salvo: {nome} agora tem {n} un."; 409 do servidor no campo "Quantidade"; envio único
- [ ] T052 [US3] Implementar a validação do ajuste em `frontend/src/features/stock/validation.ts` e `frontend/src/features/stock/stock-adjustment-dialog.tsx`; ligar a ação "Ajustar estoque de {nome}" em `stock-list.tsx` e `stock-page.tsx`

**Checkpoint (commit 8)**: `feat(estoque): ajusta o saldo com motivo e previa`.

---

## Phase 6: User Story 4 — Histórico de movimentações (Priority: P4)

**Goal**: o lojista vê todas as movimentações de um produto, da mais recente para a mais antiga.

**Independent Test**: depois de uma entrada e um ajuste, o histórico mostra as duas com data, tipo, quantidade com sinal, saldo e texto.

- [ ] T053 [P] [US4] Escrever `frontend/tests/unit/date.test.ts`: `formatDateTime` no formato "24/11/2026 14:35" (fuso fixo no teste)
- [ ] T054 [P] [US4] Escrever `frontend/tests/integration/stock-movements.test.tsx`: "Ver histórico de {nome}" abre "Histórico de {nome}"; tabela "Movimentações" com Data, Tipo, "+24"/"−2", Saldo e Observação; paginação "Paginação do histórico"; vazio com "Registrar entrada" (abre o diálogo de entrada); erro com "Tentar de novo"; nenhuma ação de editar ou apagar
- [ ] T055 [US4] Implementar `frontend/src/lib/date.ts` e `frontend/src/features/stock/movements-sheet.tsx`; ligar a ação "Ver histórico de {nome}" (e o menu "Ações de {nome}" no celular) em `stock-list.tsx` e `stock-page.tsx`

**Checkpoint (commit 9)**: `feat(estoque): mostra o historico de movimentacoes`.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T056 Escrever `frontend/tests/e2e/stock.spec.ts`: produto criado pela API com `min_stock` 30; em `/stock`, "Para repor" mostra o produto; entrada de 24 com "NF 1234"; ajuste "Retirar" 2 com "Avaria no transporte"; recarregar mostra 22 e "Repor · faltam 8"; histórico com as duas movimentações; rodar `make e2e`
- [ ] T057 Capturas de tela finais (Estoque, visão "Para repor", diálogos, histórico, Produtos com a coluna; claro, escuro e 360 px) revisadas

**Checkpoint (commit 10)**: `test(e2e): cobre reposicao, entrada e ajuste com persistencia`.

- [ ] T058 [P] Documentar: seção de estoque e `make test-postgres` no `README.md`; comando em `CLAUDE.md`; pílulas de situação em `frontend/DESIGN.md`; nota em `specs/002-produtos/spec.md` de que estoque e alertas foram para a 011
- [ ] T059 Rodar `make check-all` e `make test-postgres`; conferir o roteiro de [quickstart.md](quickstart.md) na stack do Compose

**Checkpoint (commit 11)**: `docs(estoque): documenta o controle de estoque`.

- [ ] T060 Escrever `explicacao/07-spec-011-estoque.md` (local, nunca versionado): o que foi feito, por que o bloqueio da linha, a sequência do histórico e como explicar no vídeo
- [ ] T061 Push da branch `011-estoque` e PR para `projeto-final` com os labels de costume (o PR #12 entra antes; até lá, o diff mostra também os commits dele)

---

## Dependencies & Execution Order

- **Setup (T001–T002)** → **Fundação back-end (T003–T028)** → **Fundação front-end (T029–T037)** → **US1 (T038–T045)** → **US2 (T046–T049)**, **US3 (T050–T052)** e **US4 (T053–T055)** → **Polish (T056–T061)**.
- Dentro da fundação back-end: domínio → portas → persistência → aplicação → API.
- US2, US3 e US4 dependem da página da US1 (`stock-page.tsx`, `stock-list.tsx`), mas não umas das outras; aqui seguem em ordem de prioridade, uma por commit.
- Cada tarefa de teste precede a implementação que ela cobre e precisa ser vista falhando.

## Parallel Opportunities

- T003, T004 e T005 (testes de domínio, arquivos diferentes).
- T011 e T012 (contratos dos dois repositórios); T020 e T021; T023, T024 e T025.
- T031, T035 e T036 (testes do front-end em arquivos diferentes).
- Em cada história, os testes marcados [P] (ex.: T038–T041 na US1).

```text
# Exemplo — US1, testes em paralelo:
T038 tests/unit/use-stock-list-params.test.tsx
T039 tests/unit/stock-validation.test.ts
T040 tests/integration/stock-list.test.tsx
T041 tests/integration/stock-entry.test.tsx
```

## Implementation Strategy

- **MVP**: fundação + US1 — o lojista já registra entradas e vê o saldo pelo painel, com persistência.
- **Incremental**: US2 (reposição e indicadores) é o "alerta" da visão; US3 (ajuste) e US4
  (histórico) completam a auditoria. Cada história termina num commit verde.
- **Prazo (C-12)**: se o tempo apertar, US4 é a última a entrar; o histórico já fica gravado e
  disponível pela API desde o commit 4.
