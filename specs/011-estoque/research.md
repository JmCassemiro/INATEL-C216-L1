# Research: Controle de Estoque

**Feature**: [spec.md](spec.md) | **Plano**: [plan.md](plan.md) | **Identidade visual**:
[frontend/DESIGN.md](../../frontend/DESIGN.md)

Decisões técnicas da spec 011. Cada uma traz o que foi escolhido, por quê e o que foi descartado
(Princípio IV). Nenhuma dependência nova de npm ou de Python.

---

## Back-end

### D1 — Saldo e mínimo em `products`; histórico em `stock_movements`

- **Decisão:** duas colunas novas em `products`: `stock_quantity` (saldo atual) e `min_stock`
  (mínimo), inteiros, com padrão 0. Uma tabela nova, `stock_movements`, guarda cada movimentação
  (entrada ou ajuste) com o saldo resultante. O saldo é **materializado** na linha do produto e o
  histórico explica como se chegou a ele; o invariante "soma das movimentações = saldo" (FR-010)
  é verificado por teste.
- **Por quê:** a lista de reposição filtra e ordena pela falta (`min_stock - stock_quantity`), e
  a lista de produtos mostra o saldo de cada linha. Com o saldo na própria linha, as duas são
  consultas simples sobre uma tabela, e a linha do produto é o ponto natural para o bloqueio de
  concorrência (D4). Uma loja tem um único estoque (C-09), então não há relação 1:N a modelar.
- **Alternativas:** calcular o saldo somando as movimentações a cada leitura (event sourcing
  puro): elegante para auditoria, mas cada listagem viraria uma agregação e a ordenação pela
  falta ficaria cara; o histórico já cumpre o papel de trilha de auditoria. Tabela `stock_items`
  1:1 com `products`: mais um JOIN em toda listagem sem ganho, porque não existe estoque sem
  produto nem produto em mais de um estoque.

### D2 — Dois caminhos de escrita: o cadastro nunca grava o saldo

- **Decisão:** a entidade `Product` ganha `min_stock` (dado do cadastro, editado no formulário) e
  `stock_quantity` (só leitura para o cadastro). `ProductRepository.update` (PUT, PATCH e
  remoção) grava todas as colunas do cadastro **menos** `stock_quantity`. O saldo só é escrito
  pelo `StockRepository` (D6), na mesma transação que grava a movimentação.
- **Por quê:** hoje o `update` regrava a linha inteira a partir da entidade lida antes. Se o
  saldo fosse junto, um PUT que leu "12 unidades" e grava depois de uma entrada concorrente
  apagaria a entrada (atualização perdida). Separar quem escreve o quê elimina o problema sem
  bloqueio no cadastro, e torna literal o FR-002 ("o cadastro não altera a quantidade"). Um teste
  de contrato prova: atualizar o produto depois de uma entrada mantém o saldo.
- **Alternativas:** tirar o saldo da entidade `Product` e montar a saída da API com uma consulta
  de leitura à parte (CQRS de leitura): mais limpo em teoria, mas duplica a listagem de produtos
  e os repositórios no prazo da C-12, para o mesmo resultado. Bloquear a linha também no PUT:
  resolve, mas põe concorrência onde ela não é necessária.

### D3 — Domínio do estoque em `app/domain/stock.py`

- **Decisão:** um módulo de domínio com:
  - limites: `MAX_MOVEMENT_QUANTITY = 99_999`, `MAX_MIN_STOCK = 99_999`,
    `MAX_STOCK_QUANTITY = 999_999`, `NOTE_MAX_LENGTH = 200`, `REASON_MIN_LENGTH = 3`;
  - `MovementKind` (`entry`, `adjustment`) e `StockStatus` (`out_of_stock`, `restock`, `ok`);
  - `StockChange`: o pedido de movimentação já validado, criado por `StockChange.entry(quantity,
    note)` ou `StockChange.adjustment(quantity, reason)` (quantidade com sinal, nunca zero);
  - `StockChange.apply(product_id, balance, sequence, at) -> StockMovement`: soma a quantidade ao
    saldo e recusa o resultado negativo (`InsufficientStockError`, com o saldo disponível) ou
    acima do teto (`StockLimitExceededError`);
  - `StockMovement`: o registro imutável (id UUID v7, produto, número, tipo, quantidade, saldo
    resultante, texto, momento);
  - funções puras `normalize_min_stock`, `shortfall(quantity, minimum)` e
    `stock_status(quantity, minimum)`; `Product` as expõe como propriedades.
  Os dois erros novos herdam de `ConflictError` (409): o pedido é válido, mas conflita com o
  saldo atual. Erros de preenchimento continuam `InvalidDataError` (422), com o campo
  (`quantity`, `note`, `reason`, `min_stock`).
- **Por quê:** todas as regras da spec (FR-001 a FR-006, FR-013, FR-015) ficam testáveis sem banco
  e sem HTTP (Princípio V). O `apply` é a única porta para mudar um saldo, então a regra "nunca
  negativo" não se repete em outro lugar.
- **Alternativas:** regras dentro do serviço de aplicação: misturaria orquestração e negócio.
  Classe de entidade `Stock` com estado mutável: as entidades do projeto são imutáveis (spec
  002, D4), e o saldo vivo é do banco (D4).

### D4 — Concorrência: bloqueio pessimista da linha do produto

- **Decisão:** `SqlAlchemyStockRepository.record` faz tudo numa transação: lê o produto ativo com
  `SELECT … FOR UPDATE`, descobre o último número de movimentação do produto, chama
  `change.apply(...)` (regra do domínio), grava o novo saldo e a movimentação e confirma. Uma
  segunda transação sobre o mesmo produto **espera** a primeira terminar e então lê o saldo já
  atualizado; produtos diferentes não se bloqueiam. Se o domínio recusar, a transação é
  desfeita (libera o bloqueio) e o erro sobe. Como defesa em profundidade, o banco tem
  `CHECK` de faixa no saldo e no mínimo e `UNIQUE (product_id, sequence)` nas movimentações.
- **Por quê:** é o caso clássico de exclusão mútua sobre um recurso compartilhado (Sistemas
  Distribuídos): várias requisições, em threads e conexões diferentes, disputam o mesmo saldo. O
  bloqueio pessimista é simples de explicar e de provar com teste (SC-003: 50 entradas
  simultâneas somam exatamente 50), mantém a regra no domínio e não exige repetir a operação.
- **Alternativas:** `UPDATE … SET stock_quantity = stock_quantity + :q WHERE stock_quantity +
  :q >= 0` (atualização atômica condicional): também é correto, mas copia a regra do domínio
  para o SQL e não diz, sem outra consulta, por que falhou. Bloqueio otimista (coluna de versão
  + nova tentativa): com 50 escritas no mesmo produto, quase todas colidiriam e repetiriam.
  Isolamento `SERIALIZABLE`: mesma necessidade de repetir, em toda a transação.
- **SQLite:** os testes locais usam SQLite, que ignora `FOR UPDATE` e serializa escritas no
  arquivo inteiro. O teste de concorrência do repositório SQL roda **só em PostgreSQL** (CI e
  `TEST_DATABASE_URL` local) e é pulado no SQLite, com o motivo escrito. O repositório em memória
  usa `threading.Lock` e tem o próprio teste de concorrência.

### D5 — Ordem do histórico por número sequencial por produto

- **Decisão:** cada movimentação recebe `sequence` (1, 2, 3… por produto), atribuído **sob o
  bloqueio** de D4 como `max(sequence) + 1`. O histórico é ordenado por `sequence` decrescente.
- **Por quê:** o UUID v7 e o relógio são gerados antes de o bloqueio ser obtido; sob
  concorrência, a ordem deles pode não ser a ordem em que os saldos foram aplicados, e o
  histórico mostraria um saldo resultante "fora de ordem". O número sequencial é exatamente a
  ordem de aplicação, e torna verificável o FR-010 (saldo de `n` = saldo de `n-1` + quantidade).
  A constraint única impede dois números iguais, mesmo se o bloqueio falhar.
- **Alternativas:** ordenar por `occurred_at` ou pelo id: errado sob concorrência, pelo motivo
  acima. Contador na linha do produto (`last_movement_sequence`): evita o `max()`, mas é mais uma
  coluna a manter; com o índice único, o `max()` por produto é barato.

### D6 — Porta `StockRepository`: o repositório garante a atomicidade

- **Decisão:** uma porta nova em `application/ports/stock_repository.py`:
  - `record(product_id, change, at) -> StockMovement`: aplica a mudança ao saldo atual do produto
    ativo, de forma atômica (D4); `ProductNotFoundError` se o produto não existe ou foi removido;
  - `movements(product_id, offset, limit) -> (list[StockMovement], total)`: histórico, do mais
    recente ao mais antigo; `ProductNotFoundError` para produto inexistente ou removido;
  - `summary() -> StockSummary`: contagem de produtos para repor e sem estoque e o valor do
    estoque a preço de venda.
  Implementações: `SqlAlchemyStockRepository` e `InMemoryStockRepository`. O repositório em
  memória compartilha com o `InMemoryProductRepository` um armazenamento comum
  (`InMemoryStore`: produtos, movimentações e um único lock), para que os dois enxerguem o mesmo
  produto.
- **Por quê:** é o mesmo desenho da spec 002 (D9 de lá): cada repositório garante que verificar e
  gravar sejam uma operação só, e o serviço não precisa saber de transação. O serviço
  (`StockService`) só cria o `StockChange`, passa o relógio e devolve o resultado.
- **Alternativas:** Unit of Work (o serviço abre a transação, pede `get_for_update`, aplica e
  salva): é o padrão clássico, mas introduz uma abstração de transação na aplicação inteira para
  um único caso de uso, e mudaria os repositórios de produto que hoje confirmam sozinhos.

### D7 — Listagem de produtos com filtro e ordenação de estoque

- **Decisão:** a seção Estoque usa a mesma coleção `GET /products`, com dois parâmetros novos:
  `restock=true` (só produtos para repor) e `sort` (`newest`, padrão; `name`; `shortfall`). A
  saída do produto ganha `stock_quantity`, `min_stock`, `shortfall` e `stock_status`.
  `ProductRepository.list` ganha os argumentos nomeados `restock_only` e `order`
  (`ProductOrder`, enum da aplicação), com padrão igual ao comportamento atual. Ordem `name`:
  pelo nome normalizado (`name_search`) e, no empate, pelo id; ordem `shortfall`: da maior falta
  para a menor e, no empate, pelo nome.
- **Por quê:** a posição de estoque **é** o catálogo visto pelo saldo; uma coleção só, com filtros,
  evita um segundo DTO, uma segunda rota e uma segunda consulta para os mesmos produtos. A
  situação (`stock_status`) e a falta vêm calculadas pela API, então a regra "para repor" não é
  reescrita no front-end. No SQL, o filtro `restock` é `stock_quantity < min_stock`, o mesmo
  predicado de `shortfall() > 0`; um teste de contrato confere que os dois concordam.
- **Alternativas:** rota `GET /stock` com DTO próprio: duplicação sem ganho. Calcular a situação
  no front-end: a regra ficaria em dois lugares.

### D8 — Rotas novas e formato das movimentações

- **Decisão:**
  - `POST /products/{id}/stock/entries` com `{"quantity": 24, "note": "NF 1234"}` → 201 com a
    movimentação;
  - `POST /products/{id}/stock/adjustments` com `{"quantity": -2, "reason": "Avaria"}` → 201
    (quantidade com sinal: positiva adiciona, negativa retira);
  - `GET /products/{id}/stock/movements?page=&size=` → página de movimentações;
  - `GET /stock/summary` → `{"restock_count", "out_of_stock_count", "stock_value"}`.
  Quantidades são `StrictInt` (recusa `"2"`, `2.5` e `true`). O texto da movimentação sai sempre
  no campo `note` (observação da entrada ou motivo do ajuste). Detalhes em
  [contracts/stock-api.md](contracts/stock-api.md).
- **Por quê:** entrada e ajuste são ações de negócio diferentes, com regras diferentes (observação
  opcional × motivo obrigatório, só positiva × com sinal); um recurso para cada uma deixa a
  validação declarativa e as mensagens precisas. Ficam sob `/products/{id}` porque o estoque é do
  produto.
- **Alternativas:** um único `POST /stock-movements` com `kind`: união discriminada no schema e
  validação condicional. Ajuste informado como novo saldo contado: descartado na spec (ajustes
  simultâneos se apagariam).

### D9 — `min_stock` no cadastro do produto

- **Decisão:** `ProductInput` (POST e PUT) ganha `min_stock: int = 0`, validado por
  `normalize_min_stock` (inteiro de 0 a 99.999); o PATCH aceita `min_stock` (sem `null`).
  `ProductData` e `ProductChanges` ganham o campo; `Product.create` e `Product.updated` o recebem.
- **Por quê:** o mínimo é um parâmetro do cadastro (FR-012), editado no mesmo formulário do
  produto. Com padrão 0, clientes que não o enviam continuam funcionando; no PUT, que substitui o
  cadastro, omitir o campo volta o mínimo a 0, a mesma semântica da descrição.

### D10 — Migração nova e reversível

- **Decisão:** uma revisão nova depois de `799308dbf8c8`: adiciona as duas colunas com
  `server_default="0"` (produtos existentes ficam com 0 e 0) e os `CHECK` de faixa, e cria
  `stock_movements` com chave estrangeira para `products`, `CHECK` de tipo, de quantidade
  diferente de zero e de saldo não negativo, e a única `(product_id, sequence)`. Usa
  `op.batch_alter_table` em `products`, porque o SQLite (testes) não acrescenta `CHECK` a uma
  tabela existente com `ALTER`; no PostgreSQL vira `ALTER TABLE` comum. O `downgrade` apaga a
  tabela e as colunas.
- **Por quê:** RP-003 (migração versionada aplicada na subida do Compose) e o mesmo critério da
  007: instalação nova e existente chegam ao mesmo estado. O teste
  `test_migrations_match_the_orm_models` garante que modelos e migração concordam.

### D11 — CORS sem mudança

- **Decisão:** o painel só usa `GET` e `POST` nas rotas novas, que já estão liberados. Um teste de
  CORS novo confirma o preflight de `POST /products/{id}/stock/entries`.
- **Por quê:** RP-005 pede exatamente os métodos usados; nenhum método novo entra.

## Front-end

### D12 — Pasta `features/stock` e o que vira compartilhado

- **Decisão:** a seção Estoque vive em `src/features/stock/` (tipos, API, consultas, validação,
  página, lista, diálogos, histórico). Duas peças da 007 que a seção nova também usa saem de
  `features/products` para lugares neutros, sem mudar o comportamento:
  `products-pagination.tsx` → `src/components/list-pagination.tsx` e
  `use-product-list-params.ts` → `src/lib/use-list-params.ts` (busca e página na URL). A seção
  Estoque acrescenta o parâmetro `view` (`restock`) num hook próprio.
- **Por quê:** importar uma feature de dentro da outra acoplaria as seções; mover para
  `components/` e `lib/` segue a estrutura definida na 007 (peças sem regra de produto). Os
  testes existentes da paginação e dos parâmetros só mudam o caminho do import.

### D13 — Consultas e invalidação (TanStack Query)

- **Decisão:** chaves `["products", …]` (já existente, também usada pela seção Estoque, com os
  parâmetros novos), `["stock", "summary"]` e `["stock", "movements", productId, page]`. Toda
  movimentação invalida `["products"]` e `["stock"]`; cadastro, edição e remoção de produto
  passam a invalidar também `["stock"]` (o mínimo, o saldo listado e os indicadores mudam).
- **Por quê:** FR-023 e SC-006 (tudo atualizado sem recarregar). Invalidar por prefixo é a forma
  já usada na 007, e o menu lateral, os indicadores e as listas leem do mesmo cache.

### D14 — Formulários em diálogo; histórico em painel lateral

- **Decisão:** entrada e ajuste abrem num `Dialog` (formulários de dois ou três campos); o
  histórico abre num `Sheet` lateral, como o formulário de produto. O ajuste usa um
  `RadioGroup` "Adicionar / Retirar", a quantidade sempre positiva e a prévia "Saldo: 36 → 34"
  (FR-020), calculada a partir do saldo exibido. Componentes shadcn novos, gerados pela CLI:
  `dialog`, `radio-group` e `toggle-group` (filtro "Todos / Para repor"); o pacote `radix-ui`
  já instalado cobre os três, então não há dependência nova.
- **Por quê:** o diálogo mantém a lista visível atrás e é o padrão para ações curtas; o painel
  lateral comporta a tabela paginada do histórico. O lojista nunca digita sinal de menos: a
  direção é uma escolha explícita.
- **Alternativas:** página própria para cada ação: mais navegação para uma tarefa de segundos.
  Campo único com sinal ("-2"): sujeito a erro de digitação e pouco claro.

### D15 — Quantidade digitada como texto, convertida por função pura

- **Decisão:** os campos de quantidade e de mínimo são `input` de texto com `inputMode="numeric"`;
  `parseQuantity(text)` (em `src/lib/quantity.ts`, peça neutra: a usam o formulário de produto e os de estoque) aceita só dígitos, com ponto como
  separador de milhar ("1.000" = 1000), e recusa vírgula decimal, sinal e vazio quando
  obrigatório. As validações dos formulários (`validation.ts`) usam os mesmos limites do domínio.
- **Por quê:** `type="number"` aceita "1e3", muda o valor com a rolagem do mouse e não
  entende o separador de milhar brasileiro. É a mesma escolha do preço na 007 (texto até o fim).

### D16 — Situação do estoque por cor e por texto

- **Decisão:** uma pílula de situação, com texto sempre visível: "Sem estoque" (token
  `destructive`), "Repor" (token `warning`, âmbar) com "faltam N" ao lado, "Em dia" (token
  `success`). O amarelo da etiqueta continua reservado a dinheiro: aparece só no indicador "Valor
  em estoque". Na lista de produtos, a coluna "Estoque" mostra o saldo e a pílula quando não está
  em dia.
- **Por quê:** DESIGN.md (âmbar para avisos; amarelo só onde há dinheiro) e acessibilidade: a
  situação nunca depende só da cor.

### D17 — Datas no fuso do navegador

- **Decisão:** `formatDateTime(iso)` em `src/lib/date.ts`, com
  `Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" })`; a API devolve
  `occurred_at` em ISO 8601 com fuso (UTC).
- **Por quê:** a spec pede o formato brasileiro no fuso do navegador; o `Intl` resolve sem
  biblioteca de datas.

### D18 — Testes

- **Decisão:**
  - **Back-end:** unitários de domínio (`test_stock.py`: limites, `apply`, situação, falta) e do
    `StockService` com os repositórios em memória; contrato do `StockRepository` nas duas
    implementações (entrada, ajuste, recusa sem efeito, produto removido, histórico em ordem,
    soma = saldo, resumo), com o teste de 50 entradas simultâneas (em memória sempre; SQL só no
    PostgreSQL, D4); contrato do `ProductRepository` com `restock_only`, `order` e "update não
    apaga o saldo"; integração das rotas novas (201, 404, 409, 422 por campo) e dos campos novos de
    produto; migração.
  - **Front-end:** o catálogo falso do MSW (`tests/msw/catalog.ts`) ganha saldo, mínimo,
    movimentações e as regras de recusa; unitários de `parseQuantity` e das validações;
    integração da seção Estoque (estados, busca, filtro, entrada, ajuste com prévia e recusa,
    histórico), do campo de mínimo, da coluna de estoque, do menu e dos indicadores.
  - **E2E:** `tests/e2e/stock.spec.ts`: cadastra um produto pela API com mínimo 30, vê-o em "Para
    repor", registra uma entrada e um ajuste pelo painel, recarrega e confere saldo e histórico.
- **Por quê:** Princípio I e RP-006; os nomes acessíveis usados pelos testes estão em
  [contracts/ui.md](contracts/ui.md).

## Ferramentas

### D19 — `make test-postgres`

- **Decisão:** um alvo novo no `Makefile` que sobe um PostgreSQL 17 descartável num container
  (porta própria, sem volume), roda `make test` com `TEST_DATABASE_URL` apontando para ele e apaga
  o container no final, mesmo se os testes falharem (mesmo padrão do `make e2e`).
- **Por quê:** o teste de concorrência (D4) só roda em PostgreSQL. Sem o alvo, a única forma de
  vê-lo passar seria esperar o CI; apontar `TEST_DATABASE_URL` para o banco do Compose apagaria os
  dados de desenvolvimento, porque a suíte esvazia as tabelas a cada teste. O alvo também é
  documentado no README (rubrica: comandos de teste no Makefile).
- **Alternativas:** `testcontainers` no pytest: dependência nova para algo que o `docker run` do
  Makefile resolve.
