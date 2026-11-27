# Research: Venda Mínima

**Feature**: [spec.md](spec.md) | **Plano**: [plan.md](plan.md) | **Identidade visual**:
[frontend/DESIGN.md](../../frontend/DESIGN.md)

Decisões técnicas da spec 004 (recorte de venda mínima). Cada uma traz o que foi escolhido, por quê
e o que foi descartado (Princípio IV). Nenhuma dependência nova de npm ou de Python. As decisões da
spec 011 (bloqueio da linha do produto, número sequencial das movimentações, atomicidade no
repositório) continuam valendo e são reaproveitadas aqui.

---

## Back-end

### D1 — Domínio da venda em `app/domain/sale.py`

- **Decisão:** um módulo de domínio com:
  - limites: `MAX_SALE_LINES = 100`, `MAX_LINE_QUANTITY = 999`, `MAX_PAYMENTS = 5`,
    `MAX_SALE_TOTAL = Decimal("999999.99")`;
  - `PaymentMethod` (`cash`, `pix`, `credit_card`, `debit_card`) e `Payment` (meio e valor, com o
    valor validado: maior que zero, até duas casas, até 999.999,99);
  - `SaleLine` (produto, quantidade e o preço unitário que o caixa mostrou) e `SaleOrder` (o pedido
    vindo do caixa: identificador, linhas e pagamentos), criado por `SaleOrder.create(...)`, que
    valida a forma: de 1 a 100 linhas, sem produto repetido, quantidade de 1 a 999, de 1 a 5
    pagamentos;
  - `SaleOrder.checkout(products) -> Checkout`: confere cada linha contra o produto atual
    (inexistente ou removido, preço diferente, saldo insuficiente), juntando **todos** os
    problemas antes de recusar (`SaleRejectedError`, D5); calcula subtotais e total; aplica as
    regras de pagamento (D3);
  - `Checkout.register(number, at) -> Sale`: a venda registrada, imutável, com a cópia de nome,
    código e preço de cada item;
  - `StockChange.sale(quantity, sale_number)` em `stock.py`: movimentação do tipo `sale`, com a
    quantidade negativa e o texto "Venda nº {n}".
- **Por quê:** todas as regras da spec (FR-005 a FR-014, FR-017) ficam testáveis sem banco e sem
  HTTP (Princípio V). Separar `checkout` (decidir) de `register` (numerar) deixa o repositório
  obter o número só depois de a venda ser aceita (D4). A baixa de estoque continua passando por
  `StockChange.apply`, então a regra "saldo nunca negativo" não ganha uma segunda cópia.
- **Alternativas:** um `Sale.create` único que recebe o número: obrigaria o repositório a reservar o
  número antes de saber se a venda é válida. Regras no serviço de aplicação: misturaria orquestração
  e negócio.

### D2 — O caixa manda o preço que mostrou; preço diferente recusa a venda

- **Decisão:** cada linha do pedido leva o `unit_price` que o carrinho exibiu. O domínio compara com
  o preço atual do produto; se for diferente, a venda é recusada com o problema `price_changed` e o
  preço atual, para o painel atualizar o carrinho e o lojista revisar.
- **Por quê:** FR-014 e a regra "o cliente nunca paga um valor diferente do que viu". Sem o preço
  no pedido, a API cobraria o preço novo sem que o lojista soubesse, e os pagamentos, calculados
  sobre o total antigo, deixariam de fechar com uma mensagem confusa.
- **Alternativas:** mandar só o total esperado: diz que algo mudou, mas não qual item. Aceitar o
  preço do caixa: abriria a porta para vender por um preço que não existe no catálogo.

### D3 — Regras de pagamento e troco

- **Decisão:** com o total calculado, `checkout` exige, nesta ordem (todas `InvalidDataError` no
  campo `payments`, 422):
  1. soma dos pagamentos ≥ total ("Os pagamentos não cobrem o total: faltam R$ X");
  2. soma dos pagamentos que não são em dinheiro ≤ total ("Só o pagamento em dinheiro pode passar
     do total e gerar troco");
  3. troco < soma em dinheiro, quando há troco ("O troco não pode ser igual ou maior que o valor
     pago em dinheiro").
  O troco é `soma − total`. Valores em `Decimal`; o total passar de R$ 999.999,99 é erro do campo
  `items`.
- **Por quê:** FR-010 a FR-012. A regra 3 recusa o dinheiro desnecessário (cartão já cobre o total e
  o lojista acrescenta dinheiro), que geraria um troco igual ao próprio dinheiro.
- **Alternativas:** limitar cada pagamento ao valor que falta: proibiria o caso comum de receber
  R$ 100,00 em dinheiro numa compra de R$ 87,50.

### D4 — Identificador do caixa, número do banco

- **Decisão:** a venda tem dois identificadores:
  - `id` (UUID), **criado pelo painel** quando a venda começa a ser montada e enviado no pedido: é
    a chave de idempotência (D6) e o identificador global, que a spec 009 usará para sincronizar
    vendas feitas offline;
  - `number` (inteiro), **atribuído pelo banco** na inserção: chave primária autoincremental de
    `sales` (`SERIAL` no PostgreSQL, `INTEGER PRIMARY KEY` no SQLite dos testes). Crescente e
    único; uma transação desfeita pode deixar um salto, como a spec admite.
  O repositório SQL insere o cabeçalho da venda, faz `flush` para obter o número, chama
  `checkout.register(number, at)` e grava itens, pagamentos e movimentações com esse número.
- **Por quê:** é a separação clássica entre identidade global (gerada na origem, sem coordenação) e
  numeração local (gerada pelo servidor central). A sequência do banco não serializa vendas de
  produtos diferentes, que nem se bloqueiam (D5).
- **Alternativas:** `max(number) + 1`: duas vendas simultâneas de produtos diferentes leriam o mesmo
  máximo. Tabela-contador com bloqueio: numeração sem saltos, mas serializa todas as vendas da loja
  e é apagada pela limpeza de tabelas da suíte. `Identity()` numa coluna que não é chave: o SQLite
  dos testes não preenche.

### D5 — Uma transação, bloqueio dos produtos em ordem de id

- **Decisão:** a porta nova `SaleRepository.register(order, at) -> (Sale, created)` faz tudo numa
  transação:
  1. se já existe venda com `order.id`, devolve-a com `created=False` (D6);
  2. `SELECT … FROM products WHERE id IN (…) ORDER BY id FOR UPDATE`, incluindo removidos (o
     domínio precisa saber que o produto existe mas saiu do catálogo);
  3. confere de novo se a venda já existe (outra requisição com o mesmo id pode ter terminado
     enquanto esta esperava o bloqueio);
  4. `order.checkout(products)` decide ou recusa;
  5. insere a venda (número, D4), `checkout.register(...)`, e para cada item aplica
     `StockChange.sale(...)` ao saldo bloqueado, gravando saldo e movimentação com a mesma lógica
     da spec 011 (extraída para `stock_ledger.py`, D8);
  6. confirma. Qualquer erro desfaz tudo.
- **Por quê:** FR-013 (tudo ou nada) e FR-015 (vendas e movimentações simultâneas sem perda). A
  ordem fixa de bloqueio (por id) evita o impasse clássico: a venda A com os produtos {1, 2} e a
  venda B com {2, 1} pedem os bloqueios na mesma ordem, então uma espera a outra em vez de cada uma
  segurar o que a outra quer. Entradas e ajustes da 011 bloqueiam um produto só, então não formam
  ciclo com as vendas.
- **SQLite:** como na 011, `FOR UPDATE` é ignorado; os testes de concorrência do repositório SQL
  (25 vendas disputando 20 unidades; duas vendas com os mesmos produtos em ordens opostas) rodam só
  no PostgreSQL (`make test-postgres` e CI). O repositório em memória usa o lock do
  `InMemoryStore`, compartilhado com produtos e estoque, e tem os próprios testes de concorrência.
- **Alternativas:** Unit of Work com o serviço abrindo a transação e chamando o
  `StockRepository` item a item: mesmo motivo da 011 (D6 de lá) para não introduzir a abstração;
  além disso, cada `record` confirma sozinho, e a venda precisa de uma confirmação só.

### D6 — Idempotência pelo id da venda

- **Decisão:** reenviar um pedido com um `id` já registrado devolve a venda existente, sem alterar
  nada: **201** quando a venda é criada, **200** quando já existia. O conteúdo do reenvio não é
  comparado: o painel nunca reutiliza um id para outra venda (o id muda a cada venda finalizada ou
  descartada). Se duas requisições com o mesmo id passarem juntas pelo passo 3 de D5 (só possível
  com produtos diferentes, o que não acontece num reenvio), a única de `sales.id` recusa a segunda,
  que desfaz a transação e devolve a venda gravada.
- **Por quê:** FR-016 e SC-005. A resposta pode se perder depois de a venda ser gravada (queda de
  rede); com a idempotência, o painel pode tentar de novo com segurança. É o mesmo mecanismo que a
  sincronização offline da 009 vai precisar.
- **Alternativas:** cabeçalho `Idempotency-Key`: o mesmo efeito, mas separa da venda o identificador
  que a própria venda já tem. `PUT /sales/{id}`: idempotente por definição, mas o `PUT` promete
  substituir a representação, e uma venda é imutável. Bloquear o botão no painel: necessário
  (FR-026), mas não cobre a resposta perdida.

### D7 — Recusa com os problemas de cada item

- **Decisão:** `SaleRejectedError(problems)` herda de `ConflictError` (409) e carrega a lista de
  problemas, cada um com `product_id`, `reason` (`unavailable`, `price_changed`,
  `insufficient_stock`), a mensagem em português e o dado útil (`current_price` ou `available`).
  Um tradutor próprio em `error_handlers.py` devolve `{"detail": "...", "problems": [...]}`. O
  Starlette escolhe o tradutor pela classe mais específica, então os demais 409 não mudam.
- **Por quê:** FR-014 pede que o painel diga **qual** item e **quanto** há, e o carrinho precisa dos
  preços atuais para se atualizar. Juntar todos os problemas evita o vai e volta de corrigir um
  item, tentar, e descobrir o próximo.
- **Alternativas:** 404 para produto removido: o recurso pedido (a venda) não é o que falta; o que
  existe é um conflito entre o carrinho e o catálogo. 422: o pedido está bem formado; quem mudou foi
  o estado do servidor.

### D8 — Gravação de saldo compartilhada entre estoque e venda

- **Decisão:** o trecho do `SqlAlchemyStockRepository.record` que, com a linha já bloqueada, calcula
  o próximo número da movimentação, chama `change.apply`, grava o saldo e adiciona a movimentação
  sai para `infrastructure/repositories/stock_ledger.py` (`apply_stock_change(session, product_id,
  balance, change, at)`). O repositório de estoque e o de vendas o usam; o de memória ganha o
  equivalente no `InMemoryStore`.
- **Por quê:** a baixa por venda é uma movimentação como as outras (FR-019); duplicar a gravação
  arriscaria as duas divergirem (por exemplo, no cálculo do número sequencial).

### D9 — Rotas e formato

- **Decisão:**
  - `POST /sales` com `{"id", "items": [{"product_id", "quantity", "unit_price"}], "payments":
    [{"method", "amount"}]}` → 201 (criada) ou 200 (já existia), cabeçalho `Location`;
  - `GET /sales?page=&size=` → página de vendas, da mais recente (maior número) para a mais antiga;
  - `GET /sales/{id}` → a venda, ou 404 "Venda não encontrada";
  - `GET /sales/summary?start=&end=` → `{"count", "revenue", "average_ticket"}` das vendas com
    `start ≤ occurred_at < end`.
  Valores em dinheiro entram e saem como texto com duas casas ("49.90"), como o preço; quantidades
  são `StrictInt`. A listagem devolve as vendas completas (itens e pagamentos), para o histórico
  abrir o detalhe sem outra requisição. Detalhes em [contracts/sales-api.md](contracts/sales-api.md).
- **Por quê:** a venda é um recurso próprio da loja, não de um produto. O resumo recebe o intervalo
  já no fuso do navegador (o painel calcula o início e o fim do dia local), então a API não precisa
  saber o fuso da loja, e o mesmo endpoint serve à spec 006. Ordenar pelo número segue a ordem real
  de registro (como o `sequence` da 011, D5 de lá).
- **Alternativas:** `?date=2026-11-25` com o fuso fixo do servidor: erraria a virada do dia para quem
  usa outro fuso. Listagem só com o cabeçalho e detalhe sob demanda: mais uma requisição por clique,
  para páginas de 10 vendas.

### D10 — Banco: três tabelas novas e o tipo `sale` nas movimentações

- **Decisão:** migração nova depois de `330c84df2ee3`:
  - `sales`: `number` (PK autoincremental), `id` (UUID, único), `occurred_at`, `total`, `paid`,
    `change`; `CHECK` de total positivo, pago ≥ total e troco não negativo;
  - `sale_items`: `(sale_id, position)` como PK, `product_id` (FK), cópias de `name`, `barcode` e
    `unit_price`, `quantity` (`CHECK` 1 a 999) e `subtotal`;
  - `sale_payments`: `(sale_id, position)` como PK, `method` (`CHECK` nos quatro meios), `amount`
    (`CHECK` > 0);
  - `stock_movements`: o `CHECK` de tipo passa a aceitar `sale` (recriado em modo batch, por causa
    do SQLite).
  Dinheiro em `NUMERIC`: `(8, 2)` para preço e pagamento, `(10, 2)` para subtotal, total, pago e
  troco. O `downgrade` apaga as tabelas e volta o `CHECK`.
- **Por quê:** RP-003. Itens e pagamentos são listas da venda, sem identidade própria fora dela, por
  isso a chave é a posição dentro da venda. Os `CHECK` repetem regras do domínio como defesa em
  profundidade, como na 011.

### D11 — CORS sem mudança

- **Decisão:** o painel usa só `GET` e `POST` nas rotas novas, já liberados. Um teste de preflight de
  `POST /sales` entra em `test_cors.py`. RP-005.

## Front-end

### D12 — Pasta `features/sales` e duas rotas

- **Decisão:** a seção vive em `src/features/sales/` e tem duas rotas no layout do painel:
  `/sales/new` (nova venda) e `/sales` (histórico com indicadores). O menu lateral ganha o grupo
  "Frente de caixa" com o link "Nova venda", e "Vendas" deixa de ser "em breve" e passa a levar ao
  histórico. O detalhe da venda abre num painel lateral (`Sheet`), como o histórico de estoque; o
  comprovante, num `Dialog` ao finalizar.
- **Por quê:** a nova venda é uma tela de operação, usada de pé no balcão, e o histórico é consulta;
  separar as rotas deixa a nova venda a um clique e o endereço da página do histórico na URL
  (FR-021).

### D13 — Carrinho como redutor puro, guardado no navegador

- **Decisão:** o estado da venda em andamento (id, linhas com o produto como foi lido, pagamentos e
  marcações de problema) é um redutor puro em `features/sales/cart.ts`, com as ações `add`,
  `setQuantity`, `remove`, `addPayment`, `removePayment`, `applyProblems` e `reset`, e os cálculos
  derivados (total, pago, falta, troco, se pode finalizar) em funções puras. Um hook
  (`use-cart.ts`) liga o redutor ao `localStorage` (chave `nexopdv:sale-in-progress`), com
  `try/catch` em toda leitura e escrita. O id da venda vem de `crypto.randomUUID()` quando a venda
  começa, e muda depois de finalizar ou descartar.
- **Por quê:** as regras do carrinho (FR-002, FR-005 a FR-007, FR-010, FR-011) ficam testáveis como
  funções, sem renderizar nada; guardar no navegador cumpre FR-028 e mantém o mesmo id entre uma
  falha e a nova tentativa (D6).
- **Alternativas:** biblioteca de estado global: dependência nova para um estado de uma tela só.
  Carrinho no servidor (venda "aberta"): exigiria estados e limpeza de vendas abandonadas, fora do
  recorte.

### D14 — Dinheiro em centavos inteiros no navegador

- **Decisão:** `src/lib/money.ts` passa a exportar `toCents` e `fromCents` (hoje internos) e ganha
  `parseMoneyInput(text)`: aceita "100", "87,5", "87,50", "49.90" e "1.234,56" (com vírgula, os
  pontos são de milhar; sem vírgula, um ponto seguido de uma ou duas casas é o decimal). Somas,
  falta e troco são calculados em centavos; o texto vai para a API no formato "87.50".
- **Por quê:** o mesmo princípio do preço desde a 007: nada de `float` em dinheiro. A spec pede o
  formato brasileiro com milhar (edge case).

### D15 — Leitura pelo código e busca pelo nome

- **Decisão:** o campo "Código de barras" fica com o foco ao abrir a tela; Enter (que o leitor USB
  envia no fim da leitura) busca o produto em `GET /products/barcode/{código}` e o adiciona; 404 ou
  422 viram "Produto não encontrado". Depois de cada leitura o campo é limpo e o foco volta a ele.
  Sem estoque, ou com a quantidade no carrinho já igual ao saldo, o produto não entra e aparece o
  aviso com o saldo. A busca pelo nome usa `GET /products?name=…&size=5` com o termo atrasado
  (`useDebouncedValue`, já existente) e lista até 5 produtos com o botão "Adicionar".
- **Por quê:** FR-001 a FR-004 e FR-007 com as rotas que já existem; nenhuma rota nova de produto.

### D16 — Recusa do servidor aplicada ao carrinho

- **Decisão:** o `ApiError` ganha o campo `body` com o corpo da resposta. Num 409 da venda, o painel
  lê `problems`: `price_changed` troca o preço da linha e a marca como "Preço atualizado";
  `insufficient_stock` marca a linha com "Há só {n} un." e limita o saldo conhecido;
  `unavailable` marca a linha como "Fora do catálogo", com o botão de remover. A mensagem geral
  aparece num alerta acima do botão de finalizar. O carrinho e os pagamentos são preservados.
- **Por quê:** FR-014 e FR-025. Mantém o carrinho como fonte da verdade da tela e o servidor como
  juiz.

### D17 — Consultas e invalidação

- **Decisão:** chave `["sales"]` (lista por página e resumo por intervalo). Uma venda registrada
  invalida `["sales"]`, `["products"]` e `["stock"]`: saldo listado, reposição, indicadores e
  histórico de movimentações mudam (FR-020).

### D18 — Testes

- **Back-end:** unitários de domínio (`test_sale.py`: forma do pedido, problemas por item, total,
  regras de pagamento e troco, `register`; `test_stock.py`: `StockChange.sale`) e do `SaleService`
  com os repositórios em memória; contrato do `SaleRepository` nas duas implementações (registro
  com baixa e movimentações, recusa sem efeito, idempotência, numeração, listagem, busca, resumo
  por intervalo) e concorrência (em memória sempre; SQL só no PostgreSQL); integração das rotas
  (201, 200, 404, 409 com `problems`, 422 por campo); migração; preflight de CORS.
- **Front-end:** unitários de `parseMoneyInput`, do redutor e dos cálculos do carrinho e do
  intervalo "hoje"; o catálogo falso do MSW ganha a busca por código, as vendas (com idempotência e
  recusas) e o resumo; integração da nova venda (leitura, busca, quantidades, pagamentos, troco,
  finalização, recusa, falha de rede, descarte, carrinho guardado), do histórico e do detalhe, do
  menu e da página de entrada.
- **E2E:** `tests/e2e/sales.spec.ts`: cadastra um produto com entrada de estoque pelo painel, faz
  uma venda pelo código com pagamento em Pix e em dinheiro com troco, vê o comprovante, confere o
  saldo baixado e a movimentação "Venda", recarrega e confere a venda no histórico.
- **Por quê:** Princípio I e RP-006; os nomes acessíveis estão em [contracts/ui.md](contracts/ui.md).

## Na implementação (2026-11-24)

- **Dinheiro no domínio:** a leitura de valores em reais saiu de `price.py` para
  `domain/money.py` (`parse_money` e `format_brl`), usada pelo `Price` e pelo `Payment`, para as
  duas regras (exato, maior que zero, duas casas, teto) não se repetirem.
- **Baixa por venda:** `StockChange.sale` aceita de 1 a 99.999 unidades, a faixa de qualquer
  movimentação; o teto de 999 é da linha da venda (`SaleLine`), conferido antes.
- **Comprovante e detalhe** usam o mesmo bloco (`sale-breakdown.tsx`): itens, pagamentos e
  totais.
- **Menu:** o número de itens da venda em andamento ao lado de "Nova venda" ficou de fora (exigiria
  um estado global só para isso); o contrato da interface foi ajustado.
- **US2:** as regras de pagamento entraram no carrinho já na US1, guiadas pelos testes unitários
  de `cart.test.ts`; por isso os testes de integração da US2 passaram na primeira execução e
  servem como cenários de aceitação na tela.
- **Concorrência verificada no PostgreSQL:** 25 vendas disputando 20 unidades (20 registradas, 5
  recusadas, saldo 0) e 20 vendas com os mesmos dois produtos em ordens opostas, sem impasse.
