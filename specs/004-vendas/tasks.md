---

description: "Lista de tarefas da spec 004 — Venda Mínima"
---

# Tasks: Venda Mínima

**Input**: Design documents from `specs/004-vendas/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/sales-api.md](contracts/sales-api.md),
[contracts/ui.md](contracts/ui.md), [quickstart.md](quickstart.md)

**Tests**: obrigatórios (constituição, Princípio I — TDD). Cada tarefa de teste vem antes da
implementação que ela cobre e precisa falhar pelo motivo certo antes de a implementação começar.

**Organization**: o back-end inteiro e a base do front-end são fundação (servem às três
histórias); depois, uma fase por história, na ordem de prioridade da spec. Os checkpoints de
commit seguem a tabela "Ordem de implementação e commits" do plano.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa pendente)
- **[Story]**: história da spec (US1–US3)
- Caminhos relativos à raiz do repositório

---

## Phase 1: Setup

**Purpose**: partir de uma base verde e registrar os artefatos da spec.

- [ ] T001 Confirmar a base verde antes de mudar código: `make test`, `make lint`, `make frontend-check`, `make frontend-test` e `make frontend-build` a partir de `projeto-final` atualizado
- [ ] T002 Atualizar `.specify/memory/roadmap.md` para 1.5.0: 004 `planned → specced` (recorte de venda mínima, `specs/004-vendas/`, decisões D4–D6 da pesquisa), 011 com o PR #13 mergeado em 2026-11-24; manter `specs/011-estoque/spec.md` com o status "Implemented"

**Checkpoint (commit 1)**: `docs(vendas): especifica e planeja a venda minima (spec 004)` — `specs/004-vendas/` completo, roadmap 1.5.0 e status da 011.

---

## Phase 2: Foundational — back-end (bloqueia todas as histórias)

**Purpose**: regras, persistência e API de vendas, usadas por todas as telas.

### Domínio (D1, D2, D3, D7)

- [ ] T003 [P] Escrever `backend/tests/unit/domain/test_sale.py`:
  - `Payment`: aceita "0.01" a "999999.99" (texto, `Decimal` ou inteiro), normaliza para duas casas; recusa 0, negativo, 3 casas, `float` e acima do teto com `InvalidDataError` no campo `amount`; `PaymentMethod` só `cash`, `pix`, `credit_card`, `debit_card`
  - `SaleOrder.create`: recusa 0 linhas ("Inclua pelo menos um item"), 101 linhas ("A venda pode ter no máximo 100 itens"), produto repetido ("Produto repetido na venda") no campo `items`; quantidade "inteira de 1 a 999" (0, 1000 e `bool` recusados, campo `quantity`); 0 ou 6 pagamentos recusados no campo `payments`
  - `checkout`: produto ausente ou removido → problema `unavailable`; preço diferente → `price_changed` com `current_price`; saldo menor que a quantidade → `insufficient_stock` com `available`; vários problemas juntos numa só `SaleRejectedError`, na ordem das linhas, um por linha
  - `checkout` válido: subtotal = preço × quantidade, total = soma, cópia de nome, código e preço; total acima de 999.999,99 → `InvalidDataError` no campo `items`
  - pagamentos (campo `payments`): soma < total recusada com "Os pagamentos não cobrem o total: faltam R$ X" (valor no formato brasileiro); não-dinheiro > total recusado ("Só o pagamento em dinheiro pode passar do total e gerar troco"); troco ≥ dinheiro recusado ("O troco não pode ser igual ou maior que o valor pago em dinheiro"); dinheiro exato → troco 0; R$ 100,00 em dinheiro para R$ 87,50 → troco 12,50; Pix 50 + crédito 100 para 150 → troco 0
  - `Checkout.register(number, at)` → `Sale` com id do pedido, número, momento, itens e pagamentos na ordem, `item_count` = soma das quantidades
  - `SalesSummary.of(count, revenue)`: ticket = receita / quantidade arredondado ao centavo (meio centavo para cima); 0 sem vendas
- [ ] T004 [P] Acrescentar a `backend/tests/unit/domain/test_stock.py`: `StockChange.sale(2, 12)` tem `kind` `sale`, quantidade -2 e texto "Venda nº 12"; quantidade fora de 1 a 999 recusada; `apply` recusa saldo insuficiente como as demais
- [ ] T005 [P] Acrescentar a `backend/tests/unit/domain/test_errors.py`: `SaleRejectedError` é `ConflictError`, guarda `problems` e tem a mensagem "Não foi possível finalizar a venda. Revise os itens destacados."; `SaleNotFoundError` é `NotFoundError` com "Venda não encontrada"
- [ ] T006 Implementar os erros em `backend/app/domain/errors.py`
- [ ] T007 Implementar `MovementKind.SALE` e `StockChange.sale(quantity, sale_number)` em `backend/app/domain/stock.py`
- [ ] T008 Implementar `backend/app/domain/sale.py` (limites, `PaymentMethod`, `Payment`, `SaleLine`, `SaleOrder`, `SaleProblem`, `Checkout`, `SaleItem`, `Sale`, `SalesSummary`), reaproveitando `Price` para o preço unitário e as regras de valor

**Checkpoint (commit 2)**: `feat(vendas): modela venda, pagamentos e troco no dominio` — `make test` e `make lint` verdes.

### Persistência (D4, D5, D6, D8, D10)

- [ ] T009 Atualizar `backend/tests/integration/test_migrations.py`: o head tem `sales`, `sale_items` e `sale_payments`; o `CHECK` de `stock_movements` aceita `sale`; reverter a migração nova remove as três tabelas e volta o `CHECK` a `entry` e `adjustment`
- [ ] T010 Definir a porta `backend/app/application/ports/sale_repository.py` (`register(order, at) -> tuple[Sale, bool]`, `get(sale_id)`, `list(offset, limit)`, `summary(start, end)`, com as garantias de D5 e D6 na docstring) e os comandos `SaleLineData` e `PaymentData` em `backend/app/application/commands.py`
- [ ] T011 [P] Escrever `backend/tests/integration/test_sale_repository_contract.py` (parametrizado: em memória e SQLAlchemy, com repositórios de produto e estoque sobre o mesmo armazenamento):
  - registrar baixa o saldo de cada produto e cria uma movimentação `sale` por item, com `note` "Venda nº {n}" e a sequência seguinte do produto; devolve `created=True`
  - números 1, 2, 3 em vendas seguidas
  - reenviar o mesmo `id` devolve a mesma venda com `created=False` e não baixa de novo, mesmo depois de o produto ser removido
  - recusa (`SaleRejectedError`, `InvalidDataError`) não grava venda, saldo nem movimentação
  - `get` de id inexistente → `SaleNotFoundError`; `list` do maior número ao menor, paginada, com total, itens e pagamentos na ordem
  - `summary(start, end)` conta só `start ≤ occurred_at < end`
  - soma das movimentações de cada produto = saldo depois das vendas
  - concorrência: 20 unidades e 25 vendas de 1 unidade em threads → 20 registradas, 5 `SaleRejectedError`, saldo 0, números distintos; duas vendas com os produtos A e B em ordens opostas, repetidas em threads, terminam sem impasse (no SQLAlchemy, `pytest.skip` fora do PostgreSQL, com o motivo de D5)
- [ ] T012 Extrair `apply_stock_change(session, product_id, balance, change, at)` para `backend/app/infrastructure/repositories/stock_ledger.py` e usá-lo em `sqlalchemy_stock_repository.py`; mover a aplicação em memória para `InMemoryStore.apply_change` e usá-la em `in_memory_stock_repository.py` (refatoração: `test_stock_repository_contract.py` continua verde)
- [ ] T013 Gerar a migração `backend/alembic/versions/<rev>_add_sales.py` (revises `330c84df2ee3`) conforme data-model §3: `sales` (`number` PK autoincremental, `id` único, `occurred_at`, `total`/`paid`/`change` `NUMERIC(10,2)`, `CHECK total > 0`, `CHECK paid >= total`, `CHECK change >= 0`), `sale_items` (PK `(sale_id, position)`, FKs, `name VARCHAR(120)`, `barcode VARCHAR(14)`, `unit_price NUMERIC(8,2)`, `CHECK quantity BETWEEN 1 AND 999`, `subtotal NUMERIC(10,2)`), `sale_payments` (PK `(sale_id, position)`, `CHECK method IN ('cash', 'pix', 'credit_card', 'debit_card')`, `amount NUMERIC(8,2)`, `CHECK amount > 0`) e o `CHECK kind IN ('entry', 'adjustment', 'sale')` recriado em batch; `downgrade` completo
- [ ] T014 Implementar `backend/app/infrastructure/models/sale.py` (`SaleModel`, `SaleItemModel`, `SalePaymentModel`, com `from`/`to_entity`) e atualizar o `CHECK` de tipo em `backend/app/infrastructure/models/stock_movement.py`
- [ ] T015 Implementar a parte em memória: vendas e próximo número em `backend/app/infrastructure/repositories/in_memory_store.py` e `backend/app/infrastructure/repositories/in_memory_sale_repository.py`
- [ ] T016 Implementar `backend/app/infrastructure/repositories/sqlalchemy_sale_repository.py`: venda existente → devolve; `SELECT … WHERE id IN (…) ORDER BY id FOR UPDATE` (inclui removidos); confere de novo; `checkout`; insere o cabeçalho e faz `flush` para o número; `register`; baixa cada item pelo `stock_ledger`; grava itens e pagamentos; confirma; `IntegrityError` na única de `sales.id` → desfaz e devolve a venda gravada

**Checkpoint (commit 3)**: `feat(vendas): grava a venda e baixa o estoque numa transacao so` — `make test`, `make test-postgres` e `make lint` verdes.

### API (D6, D7, D9, D11)

- [ ] T017 [P] Escrever `backend/tests/unit/application/test_sale_service.py` com os repositórios em memória: `register` cria o pedido e passa o relógio (venda com o momento injetado); reenvio devolve `created=False`; `list` monta a `Page`; `summary` recusa `end <= start` com `InvalidDataError`
- [ ] T018 [P] Escrever `backend/tests/integration/test_sales_api.py`: `POST /sales` → 201, `Location: /sales/{id}` e o corpo de contracts §3 (valores como texto com 2 casas, `item_count`); mesmo corpo de novo → 200 com a mesma venda; 409 com `detail` e `problems` (os três motivos, com `available` e `current_price`); 422 por campo (`items`, `payments`, quantidade `"2"` e `2.5` recusadas, meio desconhecido); `GET /sales` paginado do mais novo ao mais antigo; `GET /sales/{id}` e 404 "Venda não encontrada"; `GET /sales/summary` com `start`/`end` (contagem, receita, ticket) e 422 sem eles ou com `end <= start`; o saldo do produto e o histórico de movimentações refletem a venda
- [ ] T019 [P] Acrescentar a `backend/tests/integration/test_cors.py` o preflight de `POST /sales`
- [ ] T020 Implementar `backend/app/application/services/sale_service.py`
- [ ] T021 Implementar `backend/app/api/schemas/sale.py` (`SaleInput` com `StrictInt` e validadores do domínio; `SaleOutput`, `SalePageOutput`, `SalesSummaryOutput` com dinheiro como texto)
- [ ] T022 Acrescentar o tradutor de `SaleRejectedError` (409 com `problems`) em `backend/app/api/error_handlers.py`
- [ ] T023 Implementar `backend/app/api/routes/sales.py` (resumo declarado antes de `/{sale_id}`), `get_sale_repository`/`get_sale_service` em `backend/app/api/dependencies.py` e o router em `backend/app/main.py`

**Checkpoint (commit 4)**: `feat(vendas): expoe registro, consulta e resumo de vendas na API` — `make test`, `make test-postgres`, `make lint` e `make format` verdes.

---

## Phase 3: Foundational — base do front-end

**Purpose**: dinheiro, datas, cliente HTTP, API de vendas e API simulada, usados pelas três telas.

- [ ] T024 [P] Escrever os testes unitários: `frontend/tests/unit/money.test.ts` (`parseMoneyInput` aceita "100", "87,5", "87,50", "49.90", "1.234,56" e recusa vazio, zero, letras, 3 casas e acima de 999.999,99; `toCents`/`fromCents`; `formatCents`), `frontend/tests/unit/date.test.ts` (`todayRange(now)` devolve o início do dia local e o do dia seguinte em ISO) e `frontend/tests/unit/api-client.test.ts` (`ApiError.body` com o corpo do 409)
- [ ] T025 Implementar `frontend/src/lib/money.ts`, `frontend/src/lib/date.ts`, `frontend/src/lib/api-client.ts` e `SALES_KEY` em `frontend/src/lib/query-keys.ts`
- [ ] T026 Criar `frontend/src/features/sales/types.ts`, `payment-methods.ts` (rótulos "Dinheiro", "Pix", "Cartão de crédito", "Cartão de débito"), `api.ts` (`findProductByBarcode`, `registerSale`, `listSales`, `getSalesSummary`) e `queries.ts` (`useSalesPage`, `useSalesSummary`, `useRegisterSale`, que invalida `["sales"]`, `["products"]` e `["stock"]`)
- [ ] T027 Ampliar a API simulada em `frontend/tests/msw/catalog.ts` e `frontend/tests/msw/handlers.ts`: `GET /products/barcode/:code` (404 para código desconhecido); `POST /sales` com idempotência (201/200), problemas 409 e regras 422 de pagamento iguais às do back-end, baixa do saldo e movimentação `sale`; `GET /sales`, `GET /sales/:id`, `GET /sales/summary`

---

## Phase 4: User Story 1 — Registrar uma venda pelo código de barras (Priority: P1) 🎯 MVP

**Goal**: o lojista monta o carrinho pelo leitor ou pelo nome, paga com um meio (com troco no dinheiro), finaliza, vê o comprovante e o estoque baixa.

**Independent Test**: ler dois códigos (um duas vezes), pagar em dinheiro acima do total, finalizar, ver o troco no comprovante e o saldo baixado na seção Estoque.

- [ ] T028 [P] [US1] Escrever `frontend/tests/unit/cart.test.ts`: `add` cria a linha com quantidade 1 e soma 1 na repetição; recusa produto sem estoque e quantidade acima do saldo conhecido; `setQuantity` "de 1 a 999" e até o saldo; `remove`; `addPayment`/`removePayment`; `total`, `paid`, `remaining`, `change` em centavos; `canFinish` (sem linhas, com problema, pago < total → falso); `applyProblems` (preço atualizado, saldo limitado, fora do catálogo); `reset` troca o `saleId`
- [ ] T029 [US1] Implementar `frontend/src/features/sales/cart.ts` e `frontend/src/features/sales/use-cart.ts` (redutor + `localStorage` em `nexopdv:sale-in-progress`, leitura e escrita em `try/catch`, `crypto.randomUUID()` para o id)
- [ ] T030 [P] [US1] Escrever `frontend/tests/integration/new-sale-cart.test.tsx` pelos nomes de contracts/ui.md: foco inicial no "Código de barras"; código + Enter adiciona com preço e subtotal e limpa o campo; repetir soma 1; código desconhecido → "Produto não encontrado" sem mudar o carrinho; sem estoque e acima do saldo → aviso com o saldo; busca pelo nome lista e "Adicionar {nome}" adiciona; mudar a quantidade e remover recalculam o total; carrinho mantido depois de desmontar e montar a página de novo
- [ ] T031 [P] [US1] Escrever `frontend/tests/integration/new-sale-checkout.test.tsx`: Dinheiro marcado e "Valor" preenchido com o total; R$ 100,00 para R$ 87,50 → "Troco: R$ 12,50"; "Finalizar venda" desabilitado enquanto falta pagar; finalizar → comprovante "Venda nº 1 registrada" com itens, pagamento, total e troco, uma única requisição mesmo com duplo clique; "Nova venda" esvazia e devolve o foco ao código; falha de rede → `alert` "Sem conexão com o servidor.", carrinho mantido e nova tentativa com o **mesmo** id; 409 → `alert` com a mensagem e linhas marcadas ("Preço atualizado", "Há só {n} un.", "Fora do catálogo"); "Descartar venda" pede confirmação e esvazia
- [ ] T032 [P] [US1] Atualizar `frontend/tests/integration/app-shell.test.tsx`: grupo "Frente de caixa" com o link "Nova venda" (`/sales/new`) e "Vendas" como link (`/sales`), sem "em breve"
- [ ] T033 [US1] Implementar `frontend/src/features/sales/barcode-reader.tsx` (código + busca por nome, D15) e `frontend/src/features/sales/cart-table.tsx` (tabela no desktop, lista no celular, quantidade com diminuir/aumentar, problema da linha)
- [ ] T034 [US1] Implementar `frontend/src/features/sales/payment-panel.tsx` (meio, valor, lista, situação, finalizar), `frontend/src/features/sales/sale-receipt-dialog.tsx` e `frontend/src/features/sales/new-sale-page.tsx` (recusa e falha em `alert`, descarte com `AlertDialog`)
- [ ] T035 [US1] Registrar `/sales/new` (handle "Nova venda") em `frontend/src/app/router.tsx` e o grupo "Frente de caixa" com "Nova venda" (e o número de itens da venda em andamento) em `frontend/src/app/sidebar.tsx`; "Vendas" vira link para `/sales`

**Checkpoint (commit 5)**: `feat(vendas): registra a venda pelo codigo de barras no painel` — `make frontend-check`, `make frontend-test` e `make frontend-build` verdes; capturas da nova venda revisadas (desktop e 360 px, claro e escuro).

---

## Phase 5: User Story 2 — Dividir o pagamento em vários meios (Priority: P2)

**Goal**: vários pagamentos numa venda, com o que falta, o troco e as regras de troco só em dinheiro.

**Independent Test**: num carrinho de R$ 150,00, R$ 50,00 em Pix e R$ 100,00 no crédito; finalizar e ver os dois pagamentos no comprovante.

- [ ] T036 [US2] Escrever `frontend/tests/integration/new-sale-split-payment.test.tsx`: Pix 50 em 150 → "Falta pagar R$ 100,00" e "Valor" sugerido 100,00; crédito 100 → "Pagamento completo" e venda com dois pagamentos; débito 100 + dinheiro 60 → "Troco: R$ 10,00"; Pix ou cartão acima do que falta → erro "Só o pagamento em dinheiro pode passar do total e gerar troco" junto ao "Valor"; dinheiro desnecessário (cartão já cobre) → "O troco não pode ser igual ou maior que o valor pago em dinheiro"; "Remover pagamento …" recalcula; mudar os itens recalcula falta e troco; 6º pagamento recusado ("Use no máximo 5 pagamentos.")
- [ ] T037 [US2] Implementar as regras de pagamento (`paymentError` em `frontend/src/features/sales/cart.ts`, com teste em `frontend/tests/unit/cart.test.ts`) e a lista com remoção e recálculo em `frontend/src/features/sales/payment-panel.tsx`

**Checkpoint (commit 6)**: `feat(vendas): divide o pagamento em varios meios com troco` — suíte do front-end verde.

---

## Phase 6: User Story 3 — Consultar as vendas realizadas (Priority: P3)

**Goal**: histórico paginado, detalhe imutável e indicadores do dia; a baixa por venda aparece no histórico de estoque.

**Independent Test**: depois de duas vendas, ver as duas no topo do histórico, abrir uma, e conferir os indicadores do dia.

- [ ] T038 [P] [US3] Escrever `frontend/tests/integration/sales-history.test.tsx`: carregando ("Carregando as vendas…"), vazio ("Nenhuma venda registrada ainda." + "Registrar a primeira venda"), erro com "Tentar de novo"; lista "Vendas realizadas" do mais novo ao mais antigo com nº, data, "3 un.", "Pix + Dinheiro" e total; página na URL (`/sales?page=2`); "Ver venda nº {n}" abre o detalhe com itens, pagamentos, total, pago e troco e sem ações de editar ou apagar; indicadores "Vendas hoje", "Faturamento hoje" e "Ticket médio hoje" pedidos com o intervalo do dia local; uma venda nova aparece no topo e nos indicadores sem recarregar
- [ ] T039 [P] [US3] Atualizar `frontend/tests/integration/stock-movements.test.tsx` (tipo "Venda", "−2", "Venda nº 1") e `frontend/tests/integration/landing.test.tsx` ("Frente de caixa" disponível)
- [ ] T040 [US3] Implementar `frontend/src/features/sales/sales-page.tsx`, `sales-overview.tsx` (com `StatCard`), `sales-list.tsx` e `sale-detail-sheet.tsx`, e registrar `/sales` (handle "Vendas") em `frontend/src/app/router.tsx`
- [ ] T041 [US3] Acrescentar o tipo `"sale"` ("Venda") em `frontend/src/features/stock/types.ts` e `frontend/src/features/stock/movements-sheet.tsx`, e marcar "Frente de caixa" como disponível em `frontend/src/features/landing/landing-page.tsx`

**Checkpoint (commit 7)**: `feat(vendas): mostra o historico e os indicadores do dia` — suíte do front-end verde; capturas do histórico e do detalhe revisadas.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T042 Escrever `frontend/tests/e2e/sales.spec.ts`: cadastrar um produto pelo painel, registrar entrada de 10 un., fazer a venda pelo código (2 un.) com Pix e dinheiro com troco, ver o comprovante, conferir em Estoque o saldo 8 e a movimentação "Venda", recarregar e conferir a venda no histórico; rodar `make e2e`
- [ ] T043 Revisar as capturas de tela das telas novas (desktop e 360 px, tema claro e escuro) e corrigir o que destoar do DESIGN.md
- [ ] T044 [P] Documentar a venda em `README.md` (funcionalidades, uso e rotas) e a tela de nova venda em `frontend/DESIGN.md`
- [ ] T045 Rodar a verificação completa: `make check-all`, `make test-postgres` e `make e2e`; percorrer o [quickstart.md](quickstart.md)

**Checkpoint (commits 8 e 9)**: `test(e2e): cobre a venda com baixa de estoque e persistencia` e `docs(vendas): documenta a venda minima`.

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → **back-end (Phase 2)** → **base do front-end (Phase 3)** → histórias.
- Dentro do back-end: domínio → persistência → API (cada etapa usa a anterior).
- **US1 (Phase 4)** depende das Phases 2 e 3; **US2 (Phase 5)** estende o painel de pagamento da
  US1; **US3 (Phase 6)** depende só das Phases 2 e 3 (pode ser feita em paralelo à US2).
- **Polish (Phase 7)** depois das três histórias.

### Parallel Opportunities

- T003, T004 e T005 (testes de domínio em arquivos diferentes).
- T011 com T012–T014 em andamento (o teste de contrato não depende da implementação para ser
  escrito).
- T017, T018 e T019 (testes da API).
- T028, T030, T031 e T032 (testes da US1); T038 e T039 (testes da US3).
- T044 com T043.

## Implementation Strategy

1. **MVP**: Phases 1–4 entregam a venda completa com um meio de pagamento (US1), já com baixa de
   estoque, idempotência e recusa por item: é o recorte mínimo da C-12.
2. **Incremento 2**: US2 (pagamento dividido).
3. **Incremento 3**: US3 (histórico e indicadores).
4. Polish: E2E, capturas e documentação; depois, branch, commits e PR para `projeto-final`.
