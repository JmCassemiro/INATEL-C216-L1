# INATEL-C216-L1

Laboratório da disciplina C216 — Sistemas Distribuídos.

## Estrutura

```text
INATEL-C216-L1/
├── .github/
│   └── workflows/
│       ├── ci-backend.yml
│       └── ci-frontend.yml
├── backend/
│   ├── app/                     # Clean Architecture: dependências apontam para dentro
│   │   ├── domain/              # entidades Product e Item, value objects Barcode e Price, erros
│   │   ├── application/         # ProductService e ItemService (casos de uso), portas, comandos
│   │   ├── infrastructure/
│   │   │   ├── database/        # Base ORM, engine e sessões (URL via DATABASE_URL)
│   │   │   ├── models/          # modelos SQLAlchemy (tabelas products e items)
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
├── frontend/                    # React + Vite + Tailwind, consumindo a API de itens
│   ├── src/
│   │   ├── components/          # ItemForm (formulário) e ItemList (listagem e estado vazio)
│   │   ├── services/items.js    # cliente HTTP (fetch): listItems e createItem
│   │   ├── App.jsx              # carrega os itens da API e guarda o estado da interface
│   │   └── validation.js        # regra de validação (função pura)
│   ├── tests/
│   │   ├── unit/                # Vitest: validação, cliente HTTP e componentes isolados
│   │   ├── integration/         # Vitest: formulário + lista no App, com fetch mockado
│   │   └── e2e/                 # Playwright contra a stack completa
│   ├── Dockerfile               # servidor de desenvolvimento do Vite
│   ├── biome.json
│   ├── package.json
│   ├── playwright.config.js
│   └── vite.config.js           # Vite + Tailwind + Vitest
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

### O que é testado

| Tipo | Verificação |
|---|---|
| Unitário (`tests/unit`) | Domínio, `ProductService`, leitura do `DATABASE_URL` e a regra de dependência entre camadas, sem banco e sem servidor |
| Integração (`tests/integration`) | Todos os endpoints (`/`, `/products` e `/items/`) pelo `TestClient`; CORS (origem permitida e desconhecida); o contrato dos repositórios nas implementações SQLAlchemy e em memória; migrations (`upgrade`/`downgrade` e conferência com os modelos); persistência após reiniciar a aplicação |
| Erro | `404` para rota ou produto inexistente, `405` para método não permitido, `409` para código de barras ou nome de item repetido, `422` para dados inválidos |

## Endpoints de itens

Usados pelo frontend. Os itens ficam no PostgreSQL (tabela `items`).

| Método | Rota | Sucesso | Erros |
|---|---|---|---|
| `GET` | `/items/` | `200` com a lista de itens, em ordem de cadastro | — |
| `POST` | `/items/` | `201` com o item criado (`id`, `name`, `description`) | `409` nome repetido, `422` corpo inválido |

- `name`: obrigatório, de 1 a 100 caracteres (espaços nas pontas são removidos) e único:
  repetir um nome devolve `409` com `{"detail": "Já existe um item com esse nome"}`.
- `description`: opcional, até 500 caracteres; vazia vira `null`.
- As rotas terminam em `/`: `/items` sem a barra responde `307` (redirecionamento), que o
  navegador trata mal em requisições com CORS.

### CORS

O frontend (`localhost:5173`) e a API (`localhost:8000`) são origens diferentes, então a API
autoriza explicitamente as origens da variável `CORS_ORIGINS` (lista separada por vírgulas;
padrão `http://localhost:5173,http://127.0.0.1:5173`), só com `GET`, `POST` e o cabeçalho
`Content-Type`. Nada de `"*"`. O CORS é uma regra do navegador: não substitui autenticação.

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
  "price": "49.90"
}
```

- `name`: obrigatório, de 1 a 120 caracteres (espaços nas pontas são removidos).
- `description`: opcional, até 500 caracteres; vazia vira `null`.
- `barcode`: string com um GTIN-8, 12, 13 ou 14 e dígito verificador válido. É único entre
  todos os produtos, inclusive os removidos, e `7891000315507` e `07891000315507` são o mesmo
  código.
- `price`: número ou string, maior que zero, até 2 casas decimais e até 999999.99. Na resposta,
  sai sempre como string com duas casas (`"49.90"`).

No `PATCH`, todos os campos são opcionais, mas ao menos um precisa ser enviado. `null` só é aceito
em `description` (remove a descrição).

Parâmetros da listagem: `page` (≥ 1, padrão 1), `size` (de 1 a 100, padrão 20) e `name` (parte do
nome, sem diferenciar maiúsculas e acentos). A resposta é `{"items": [...], "total": 25, "page": 1,
"size": 20}`.

| Status | Quando | Corpo |
|---|---|---|
| `404` | Produto inexistente ou removido | `{"detail": "Produto não encontrado"}` |
| `409` | Código de barras já pertence a outro produto | `{"detail": "Código de barras já cadastrado"}` |
| `422` | Dado inválido no corpo, no caminho ou na consulta | `{"detail": [{"loc": [...], "msg": "...", "type": "..."}]}` |

O `DELETE` não apaga o registro: o produto some das consultas e da listagem, mas o código de
barras continua reservado. Nenhuma operação recusada altera o catálogo.

## Frontend

Gerenciador de itens (nome obrigatório com até 100 caracteres e descrição opcional) em
React, Vite e Tailwind CSS, consumindo a API com `fetch`. Ao abrir, a página carrega os
itens com `GET /items/`; o cadastro faz `POST /items/`. Os itens ficam no PostgreSQL, então
continuam lá depois de recarregar a página. Erros da API (ex.: nome repetido) aparecem no
formulário, sem apagar o que foi digitado.

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
| `make frontend-build` | Build de produção |
| `make e2e` | E2E full-stack numa stack isolada (exige Docker) |
| `make check-all` | Backend (Ruff + Pytest), frontend (Biome, Vitest, build) e `make e2e` |

### Testes

| Tipo | Ferramenta | O que verifica |
|---|---|---|
| Unitário | Vitest | `validation.js`, `services/items.js` e os componentes isolados, com `fetch` mockado |
| Integração | Vitest + Testing Library | `App` + `ItemForm` + `ItemList` com `fetch` mockado: carregando, lista vazia, itens da API, erro de conexão, erro `409` e envio do `POST` |
| E2E | Playwright | navegador real → React → FastAPI → PostgreSQL, sem mocks: cadastro, persistência após recarregar a página, nome repetido e validação |

`make e2e` sobe uma stack **separada** da de desenvolvimento (projeto Compose `lab-e2e`,
frontend em `5174`, API em `8001`, banco em `5434` e volume próprio), roda o Playwright e
derruba tudo com `down -v`, mesmo se os testes falharem. O banco de desenvolvimento nunca
é tocado. Antes do primeiro E2E, instale o navegador: `npx playwright install chromium`
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
Biome (lint e formatação), Vitest, build e `make e2e` (stack completa no Docker Compose).
Se o E2E falhar, o relatório do Playwright fica disponível como artefato.

## Serviços

| Serviço | Porta (host) | Descrição |
|---|---|---|
| `frontend` | 5173 | React servido pelo Vite (desenvolvimento) |
| `api` | 8000 | Backend FastAPI |
| `db` | 5432 | PostgreSQL 17 |

Os três serviços têm *healthcheck*: a API só sobe depois que o banco está saudável, e o
frontend só depois da API. A API se comunica com o banco pelo nome do serviço (`db`),
através da rede interna criada pelo Compose. Já o navegador acessa a API por
`localhost:8000`, a porta publicada no host, porque o código React roda nele, e não no
container. O banco utiliza um volume nomeado (`postgres_data`), então os dados persistem
entre reinicializações dos containers.
