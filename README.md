# INATEL-C216-L1

NexoPDV: frente de caixa e gestão para lojas de varejo físico. Projeto da disciplina C216 —
Sistemas Distribuídos.

## Estrutura

```text
INATEL-C216-L1/
├── .github/
│   └── workflows/
│       ├── ci-backend.yml
│       └── ci-frontend.yml
├── backend/
│   ├── app/                     # Clean Architecture: dependências apontam para dentro
│   │   ├── domain/              # produto, estoque e venda (regras), value objects, erros
│   │   ├── application/         # casos de uso (produtos, estoque, vendas), portas, comandos
│   │   ├── infrastructure/
│   │   │   ├── database/        # Base ORM, engine e sessões (URL via DATABASE_URL)
│   │   │   ├── models/          # modelos SQLAlchemy (produtos, movimentações e vendas)
│   │   │   └── repositories/    # repositórios SQLAlchemy e em memória
│   │   ├── api/                 # rotas, schemas Pydantic, CORS, tratamento de erros, dependências
│   │   └── main.py              # create_app(): apenas compõe e inicializa a aplicação
│   ├── alembic/
│   │   ├── versions/            # migrations versionadas do banco
│   │   └── env.py               # integra o Alembic aos modelos e ao DATABASE_URL
│   ├── tests/
│   │   ├── unit/                # domínio, aplicação, repositório e regra de dependência
│   │   └── integration/         # endpoints, repositório no banco e migrations
│   ├── .dockerignore
│   ├── alembic.ini
│   ├── Dockerfile
│   ├── poetry.lock
│   └── pyproject.toml
├── frontend/                    # site e painel do NexoPDV: React + TypeScript + Vite + shadcn/ui
│   ├── src/
│   │   ├── app/                 # composição: providers, rotas e layout (menu lateral e barra)
│   │   ├── components/          # ui/ (shadcn), marca, indicador e tema claro/escuro
│   │   ├── features/landing/    # página de entrada do site (/)
│   │   ├── features/products/   # seção de produtos: telas, API, consultas e regras do formulário
│   │   ├── features/stock/      # seção de estoque: posição, entrada, ajuste e histórico
│   │   ├── features/sales/      # frente de caixa (nova venda) e histórico de vendas
│   │   ├── lib/                 # cliente HTTP, preço como texto e hooks utilitários
│   │   └── index.css            # tokens do tema (cores, fontes, raios, sombras) do DESIGN.md
│   ├── tests/
│   │   ├── unit/                # Vitest: regras puras (GTIN, EAN, preço, validação, URL)
│   │   ├── integration/         # Vitest + Testing Library: telas com a API simulada (MSW)
│   │   ├── msw/                 # API falsa que segue o contrato de produtos, estoque e vendas
│   │   └── e2e/                 # Playwright contra a stack completa
│   ├── DESIGN.md                # identidade visual do site e do painel
│   ├── Dockerfile               # servidor de desenvolvimento do Vite
│   ├── biome.json
│   ├── components.json          # configuração do shadcn/ui
│   ├── package.json
│   ├── playwright.config.ts
│   ├── tsconfig.json            # TypeScript estrito (app e configs)
│   └── vite.config.ts           # Vite + Tailwind + Vitest
├── .env.example
├── compose.yaml
├── Makefile
└── README.md
```

## Executando com Docker

Pré-requisitos: Docker e Docker Compose.

```bash
# (opcional) ajustar as variaveis de ambiente
cp .env.example .env

make up
```

O Compose sobe três serviços: `db`, `api` e `frontend`. O frontend fica em
<http://localhost:5173> e a API em <http://localhost:8000> (Swagger em
<http://localhost:8000/docs>). Ao subir, o container da API aplica as migrations
pendentes (`alembic upgrade head`) antes de iniciar o servidor; `make db-upgrade` faz o
mesmo a partir do host. O código é copiado para as imagens: depois de alterá-lo, use
`make up-build`.

Sem o `.env`, o ambiente sobe com os valores padrão definidos no `compose.yaml`.

### Comandos Docker

| Comando | Descrição |
|---|---|
| `make up` | Sobe os containers (`db`, `api` e `frontend`) em background |
| `make down` | Para e remove os containers |
| `make build` | Constrói as imagens |
| `make rebuild` / `make up-build` | Reconstrói as imagens e sobe os containers |
| `make logs` | Acompanha os logs de todos os serviços |
| `make logs-api` | Acompanha os logs da API |
| `make ps` | Lista o status dos containers |
| `make shell` | Abre um terminal dentro do container da API |
| `make db-shell` | Abre o `psql` dentro do container do banco |
| `make docker-clean` | Remove containers e volumes (**apaga os dados do banco**) |

## Executando localmente (API fora do Docker)

Pré-requisitos: Python 3.14+ e Poetry. O banco continua sendo o PostgreSQL do Compose,
acessado pela porta publicada no host.

```bash
make install
make up          # sobe o PostgreSQL (e a API do container, que pode ser parada)
make db-upgrade  # aplica as migrations
make run
```

O `Makefile` monta o `DATABASE_URL` com as variáveis do `.env` (ou os padrões do
`compose.yaml`) apontando para `localhost`. Para usar outro banco, defina `DATABASE_URL`
no ambiente.

### Comandos locais

| Comando | Descrição |
|---|---|
| `make install` | Instala as dependências |
| `make test` | Executa os testes |
| `make test-verbose` | Executa os testes com saída detalhada |
| `make test-postgres` | Executa os testes num PostgreSQL descartável (Docker), como no CI |
| `make lint` | Executa o linter |
| `make format` | Formata o código |
| `make clean` | Remove artefatos de build e cache |
| `make setup-hooks` | Ativa os git hooks do projeto |

### Banco de dados e migrations

A conexão vem da variável de ambiente `DATABASE_URL`
(`postgresql+psycopg://usuario:senha@host:5432/banco`). Dentro do Compose o host é `db`, o
nome do serviço; fora dele, `localhost`. A estrutura do banco é versionada com Alembic, em
`backend/alembic/versions/`.

| Comando | Descrição |
|---|---|
| `make db-upgrade` | Aplica as migrations pendentes |
| `make db-downgrade` | Desfaz a última migration |
| `make db-migration msg="..."` | Gera uma migration comparando os modelos com o banco (revise o arquivo antes de aplicar) |
| `make db-current` | Mostra a versão atual do banco |
| `make db-history` | Lista o histórico de migrations |

Rode `make help` para ver todos os comandos disponíveis.

## Testes

Os testes ficam em `backend/tests/` e são executados com Pytest.

```bash
make install   # apenas na primeira vez
make test
```

Para uma saída detalhada, com o nome de cada teste:

```bash
make test-verbose
```

Também é possível rodar o Pytest diretamente:

```bash
cd backend
poetry run pytest
```

A configuração do Pytest fica em `backend/pyproject.toml`, na seção
`[tool.pytest.ini_options]`.

Os testes de integração usam um banco próprio, criado pelas migrations: por padrão um
SQLite temporário, para rodar sem Docker. Com `TEST_DATABASE_URL` definida, rodam nesse
banco; o CI usa um PostgreSQL.

`make test-postgres` faz o mesmo que o CI sem tocar no banco de desenvolvimento: sobe um
PostgreSQL 17 descartável num container, roda a suíte contra ele e apaga o container no final,
mesmo se algum teste falhar. Só nele (e no CI) rodam os testes de concorrência do estoque e das
vendas, que o SQLite pula com o motivo escrito.

### O que é testado

| Tipo | Verificação |
|---|---|
| Unitário (`tests/unit`) | Domínio (produto, regras de estoque e de venda: itens, total, pagamento e troco), `ProductService`, `StockService`, `SaleService`, leitura do `DATABASE_URL` e a regra de dependência entre camadas, sem banco e sem servidor |
| Integração (`tests/integration`) | Todos os endpoints (`/`, `/products`, o estoque e `/sales`) pelo `TestClient`; CORS (origem desconhecida e métodos liberados); o contrato dos repositórios de produto, estoque e venda nas implementações SQLAlchemy e em memória, inclusive 50 entradas simultâneas no mesmo produto, 25 vendas disputando 20 unidades e vendas com os mesmos produtos em ordens opostas (sem impasse); idempotência da venda; migrations (`upgrade`/`downgrade` e conferência com os modelos); persistência após reiniciar a aplicação |
| Erro | `404` para rota, produto ou venda inexistente, `405` para método não permitido, `409` para código de barras repetido, saldo que ficaria negativo ou acima do teto e venda recusada (com os problemas de cada item), `422` para dados inválidos |

## CORS

O frontend (`localhost:5173`) e a API (`localhost:8000`) são origens diferentes, então a API
autoriza explicitamente as origens da variável `CORS_ORIGINS` (lista separada por vírgulas;
padrão `http://localhost:5173,http://127.0.0.1:5173`), só com os métodos que o painel usa
(`GET`, `POST`, `PUT` e `DELETE`) e o cabeçalho `Content-Type`. Nada de `"*"`. O CORS é uma regra do navegador: não substitui autenticação.

## Endpoints de produtos

Os dados ficam no PostgreSQL (tabela `products`) e continuam lá depois de reiniciar a API.
Documentação interativa em
<http://localhost:8000/docs>.

| Método | Rota | Sucesso | Descrição |
|---|---|---|---|
| `POST` | `/products` | 201 | Cadastra um produto (cabeçalho `Location` com o id) |
| `GET` | `/products?page=1&size=20&name=calca` | 200 | Lista com paginação e busca por nome |
| `GET` | `/products/{product_id}` | 200 | Consulta pelo id (UUID) |
| `GET` | `/products/barcode/{barcode}` | 200 | Consulta pelo código de barras |
| `PUT` | `/products/{product_id}` | 200 | Substitui o cadastro completo |
| `PATCH` | `/products/{product_id}` | 200 | Altera só os campos enviados |
| `DELETE` | `/products/{product_id}` | 204 | Remove (inativa) o produto |

Corpo de `POST` e `PUT`:

```json
{
  "name": "Camiseta Básica Branca M",
  "description": "Algodão",
  "barcode": "7891000315507",
  "price": "49.90",
  "min_stock": 10
}
```

- `name`: obrigatório, de 1 a 120 caracteres (espaços nas pontas são removidos).
- `description`: opcional, até 500 caracteres; vazia vira `null`.
- `barcode`: string com um GTIN-8, 12, 13 ou 14 e dígito verificador válido. É único entre
  todos os produtos, inclusive os removidos, e `7891000315507` e `07891000315507` são o mesmo
  código.
- `price`: número ou string, maior que zero, até 2 casas decimais e até 999999.99. Na resposta,
  sai sempre como string com duas casas (`"49.90"`).
- `min_stock`: opcional, inteiro de 0 a 99.999 (padrão 0). Veja [Estoque](#estoque).

A resposta traz também o estoque: `stock_quantity` (saldo), `min_stock`, `shortfall` (quanto falta
para o mínimo) e `stock_status` (`out_of_stock`, `restock` ou `ok`). O saldo não entra pelo
cadastro: se enviado, é ignorado.

No `PATCH`, todos os campos são opcionais, mas ao menos um precisa ser enviado. `null` só é aceito
em `description` (remove a descrição).

Parâmetros da listagem: `page` (≥ 1, padrão 1), `size` (de 1 a 100, padrão 20), `name` (parte do
nome, sem diferenciar maiúsculas e acentos), `restock=true` (só os produtos abaixo do mínimo) e
`sort` (`newest`, padrão, do mais recente para o mais antigo; `name`, alfabética; `shortfall`,
maior falta primeiro). A resposta é `{"items": [...], "total": 25, "page": 1, "size": 20}`.

| Status | Quando | Corpo |
|---|---|---|
| `404` | Produto inexistente ou removido | `{"detail": "Produto não encontrado"}` |
| `409` | Código de barras já pertence a outro produto | `{"detail": "Código de barras já cadastrado"}` |
| `422` | Dado inválido no corpo, no caminho ou na consulta | `{"detail": [{"loc": [...], "msg": "...", "type": "..."}]}` |

O `DELETE` não apaga o registro: o produto some das consultas e da listagem, mas o código de
barras continua reservado. Nenhuma operação recusada altera o catálogo.

## Estoque

Cada produto tem um **saldo** (`stock_quantity`) e um **estoque mínimo** (`min_stock`). O saldo
só muda por **movimentações**, que ficam num histórico que não se edita nem se apaga (tabela
`stock_movements`); o cadastro do produto nunca altera o saldo.

| Método | Rota | Sucesso | Descrição |
|---|---|---|---|
| `POST` | `/products/{product_id}/stock/entries` | 201 | Entrada de mercadoria: `{"quantity": 24, "note": "NF 1234"}` |
| `POST` | `/products/{product_id}/stock/adjustments` | 201 | Ajuste com sinal e motivo: `{"quantity": -2, "reason": "Avaria"}` |
| `GET` | `/products/{product_id}/stock/movements?page=1&size=20` | 200 | Histórico, da movimentação mais recente para a mais antiga |
| `GET` | `/stock/summary` | 200 | Produtos para repor, sem estoque e valor do estoque a preço de venda |

Regras:

- Entrada: quantidade inteira de 1 a 99.999; observação opcional, até 200 caracteres.
- Ajuste: quantidade inteira com sinal (positiva adiciona, negativa retira), de 1 a 99.999 para
  mais ou para menos; motivo obrigatório, de 3 a 200 caracteres.
- O saldo nunca fica negativo nem passa de 999.999 unidades: a movimentação que faria isso é
  recusada com `409` (por exemplo, `"Saldo insuficiente: há 3 unidades em estoque"`), sem gravar
  nada.
- **Para repor** é ter saldo **menor** que o mínimo (mínimo 0 desliga o alerta); a falta é
  `mínimo − saldo`. Saldo 0 é **sem estoque**.
- Cada movimentação guarda o número dela no produto, o saldo resultante e o momento; a soma das
  movimentações é sempre igual ao saldo.

**Concorrência.** Duas movimentações no mesmo produto ao mesmo tempo (duas abas, dois caixas)
não podem se perder. O repositório faz cada uma numa transação só: `SELECT … FOR UPDATE` trava a
linha do produto, a regra do domínio decide com o saldo atual, e o novo saldo e a movimentação são
gravados juntos. A segunda transação espera a primeira terminar e já lê o saldo atualizado. O teste
de contrato prova isso com 50 entradas simultâneas, que somam exatamente 50; ele roda no
PostgreSQL (`make test-postgres` e CI), porque o SQLite dos testes locais ignora o `FOR UPDATE`.

A venda (abaixo) também baixa o saldo: cada item vendido vira uma movimentação do tipo `sale`,
com a quantidade negativa e o texto `"Venda nº 12"`.

## Vendas

A frente de caixa registra uma venda com um ou mais itens e um ou mais pagamentos, e baixa o
estoque de todos os itens **na mesma transação** (tabelas `sales`, `sale_items` e
`sale_payments`). Uma venda registrada não se edita nem se apaga.

| Método | Rota | Sucesso | Descrição |
|---|---|---|---|
| `POST` | `/sales` | 201 ou 200 | Registra a venda (201); se o mesmo `id` já foi registrado, devolve a venda existente (200) |
| `GET` | `/sales?page=1&size=20` | 200 | Vendas, da mais recente para a mais antiga, com itens e pagamentos |
| `GET` | `/sales/{sale_id}` | 200 | Uma venda |
| `GET` | `/sales/summary?start=…&end=…` | 200 | Vendas, faturamento e ticket médio das vendas com `start ≤ momento < end` (datas ISO com fuso) |

Corpo de `POST /sales`:

```json
{
  "id": "0193a7c2-5f1e-7c3a-9d2b-1f4e6a8b0c11",
  "items": [{ "product_id": "…", "quantity": 2, "unit_price": "49.90" }],
  "payments": [
    { "method": "pix", "amount": "50.00" },
    { "method": "cash", "amount": "100.00" }
  ]
}
```

A resposta traz o `number` (nº legível, dado pelo banco), `occurred_at`, os itens com nome,
código, preço e subtotal do momento da venda, os pagamentos, `total`, `paid`, `change` (troco) e
`item_count`. Valores em dinheiro saem como string com duas casas.

Regras:

- De 1 a 100 itens distintos, de 1 a 999 unidades cada, total de até R$ 999.999,99.
- De 1 a 5 pagamentos: `cash` (dinheiro), `pix`, `credit_card` ou `debit_card`.
- A soma dos pagamentos cobre o total; **só o dinheiro gera troco** (o que não é dinheiro não passa
  do total, e o troco é menor que o valor em dinheiro). Senão, `422` no campo `payments`.
- `409` quando algum item não pode ser vendido, com todos os problemas de uma vez em `problems`:
  produto fora do catálogo (`unavailable`), preço diferente do que o caixa mostrou
  (`price_changed`, com o `current_price`) ou saldo insuficiente (`insufficient_stock`, com o
  `available`). Nada é gravado.

**Idempotência.** O `id` da venda é criado pelo painel quando a venda começa. Se a resposta se
perde (queda de conexão) e o painel tenta de novo, a API devolve a venda já registrada, sem
registrar outra e sem baixar o estoque de novo. É a mesma base que a sincronização dos caixas
offline vai usar.

**Concorrência.** A venda trava as linhas de todos os seus produtos (`SELECT … FOR UPDATE`) **em
ordem de id**: duas vendas com os mesmos produtos em ordens diferentes esperam uma pela outra em
vez de se travarem mutuamente. Com 20 unidades e 25 vendas simultâneas de 1 unidade, exatamente
20 são registradas, 5 são recusadas e o saldo termina em 0 (teste de contrato no PostgreSQL).

## Frontend

Painel do NexoPDV em React, TypeScript (estrito), Vite, Tailwind CSS e shadcn/ui, com tema
claro e escuro. A seção de produtos faz o CRUD completo do catálogo: lista paginada com busca
por nome (busca e página ficam na URL), cadastro e edição num painel lateral com prévia da
etiqueta de gôndola, e remoção com confirmação. A seção de estoque mostra o saldo, o mínimo e a
situação de cada produto, com indicadores, a lista do que precisa de reposição, entrada de
mercadoria, ajuste com motivo (com a prévia do saldo) e o histórico de movimentações. A **nova
venda** (`/sales/new`) lê os produtos pelo código de barras (o leitor USB digita e tecla Enter)
ou pela busca por nome, monta o carrinho, recebe em um ou mais meios com o troco calculado e
mostra o comprovante; a venda em andamento fica guardada no navegador até ser finalizada ou
descartada. A seção **Vendas** (`/sales`) mostra os indicadores do dia (vendas, faturamento e
ticket médio), o histórico paginado e o detalhe de cada venda. Cada ação mostra carregando,
sucesso e erro. Os dados vêm da API pelo TanStack Query; a identidade visual
está em `frontend/DESIGN.md`.

A URL da API vem de `VITE_API_URL` (padrão `http://localhost:8000`). Como o React roda no
navegador, ela usa a porta publicada no host, e não o nome do serviço do Compose.

Pela stack completa, `make up-build` já sobe o frontend. Para rodá-lo fora do Docker
(com a API no ar), são necessários Node.js 22+ e npm:

```bash
make frontend-install
make frontend-dev   # http://localhost:5173
```

| Comando | Descrição |
|---|---|
| `make frontend-install` | Instala as dependências (`npm ci`) |
| `make frontend-dev` | Sobe o servidor de desenvolvimento (Vite) |
| `make frontend-lint` | Executa o lint (Biome) |
| `make frontend-format` | Formata o código (Biome) |
| `make frontend-check` | Lint + verificação da formatação, sem alterar arquivos |
| `make frontend-test` | Testes unitários e de integração (Vitest + React Testing Library) |
| `make frontend-test-e2e` | Playwright contra uma stack já no ar (`E2E_BASE_URL`, padrão `http://localhost:5173`) |
| `make frontend-build` | Verificação de tipos (TypeScript) e build de produção |
| `make e2e` | E2E full-stack numa stack isolada (exige Docker) |
| `make check-all` | Backend (Ruff + Pytest), frontend (Biome, Vitest, build) e `make e2e` |

### Testes

| Tipo | Ferramenta | O que verifica |
|---|---|---|
| Unitário | Vitest | Regras puras: GTIN, código de barras EAN, preço, valor e quantidade como texto, datas, validação dos formulários, o carrinho da venda (itens, pagamentos, troco e recusas), parâmetros da URL e o cliente HTTP |
| Integração | Vitest + Testing Library + MSW | As telas com a API simulada na rede: produtos (lista, busca, paginação, cadastro, edição e remoção), estoque (posição, reposição, indicadores, entrada, ajuste e histórico) e vendas (leitura, busca, carrinho, pagamento dividido, troco, finalização, recusa, falha de rede com nova tentativa, comprovante, histórico e indicadores), com os estados de carregando, vazio, erro, `404`, `409` e `422`, tema e teclado |
| E2E | Playwright | navegador real → React → FastAPI → PostgreSQL, sem mocks: o CRUD de produtos, o fluxo do estoque (reposição, entrada e ajuste) e uma venda pelo código com Pix e dinheiro, recarregando a página para provar a persistência |

`make e2e` sobe uma stack **separada** da de desenvolvimento (projeto Compose `nexopdv-e2e`,
frontend em `5174`, API em `8001`, banco em `5434` e volume próprio), roda o Playwright e
derruba tudo com `down -v`, mesmo se os testes falharem. O banco de desenvolvimento nunca
é tocado. Os arquivos de E2E rodam um de cada vez, porque dividem o mesmo banco. Antes do primeiro E2E, instale o navegador: `npx playwright install chromium`
(dentro de `frontend/`).

## Integração contínua (CI)

O workflow `.github/workflows/ci-backend.yml` roda no GitHub Actions a cada
`push` e a cada `pull_request`, em dois jobs:

| Job | O que executa |
|---|---|
| `Ruff (Lint & Format)` | `ruff format --check .` e `ruff check .` |
| `Pytest` | `poetry run pytest`, contra um PostgreSQL 17 (service container) |

São as mesmas verificações disponíveis localmente (`make format`, `make lint` e
`make test`), então é possível reproduzir o resultado do CI antes de abrir a PR.

O workflow `.github/workflows/ci-frontend.yml` roda em pull requests (e em pushes na
`main`) que alterem `frontend/`, `backend/`, o `compose.yaml` ou o `Makefile`: `npm ci`,
Biome (lint e formatação), Vitest, build (com verificação de tipos) e `make e2e` (stack completa no Docker Compose).
Se o E2E falhar, o relatório do Playwright fica disponível como artefato.

## Serviços

| Serviço | Porta (host) | Descrição |
|---|---|---|
| `frontend` | 5173 | Painel (React) servido pelo Vite (desenvolvimento) |
| `api` | 8000 | Backend FastAPI |
| `db` | 5432 | PostgreSQL 17 |

Os três serviços têm *healthcheck*: a API só sobe depois que o banco está saudável, e o
frontend só depois da API. A API se comunica com o banco pelo nome do serviço (`db`),
através da rede interna criada pelo Compose. Já o navegador acessa a API por
`localhost:8000`, a porta publicada no host, porque o código React roda nele, e não no
container. O banco utiliza um volume nomeado (`postgres_data`), então os dados persistem
entre reinicializações dos containers.
