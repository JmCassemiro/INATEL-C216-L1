# INATEL-C216-L1

Laboratório da disciplina C216 — Sistemas Distribuídos.

## Estrutura

```text
INATEL-C216-L1/
├── .github/
│   └── workflows/
│       └── ci-backend.yml
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/          # endpoints (home e produtos)
│   │   │   └── dependencies.py  # injecao do service nas rotas
│   │   ├── schemas/             # modelos Pydantic
│   │   ├── services/            # regras do cadastro de produtos (em memoria)
│   │   └── main.py              # apenas inicializa a aplicacao
│   ├── tests/
│   │   ├── unit/                # service e funcoes chamados diretamente
│   │   └── integration/         # endpoints via TestClient
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── poetry.lock
│   └── pyproject.toml
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

A API fica disponível em <http://localhost:8000>.

Sem o `.env`, o ambiente sobe com os valores padrão definidos no `compose.yaml`.

### Comandos Docker

| Comando | Descrição |
|---|---|
| `make up` | Sobe os containers em background |
| `make down` | Para e remove os containers |
| `make build` | Constrói as imagens |
| `make rebuild` | Reconstrói as imagens e sobe os containers |
| `make logs` | Acompanha os logs de todos os serviços |
| `make ps` | Lista o status dos containers |
| `make shell` | Abre um terminal dentro do container da API |
| `make db-shell` | Abre o `psql` dentro do container do banco |
| `make docker-clean` | Remove containers e volumes (**apaga os dados do banco**) |

## Executando localmente (sem Docker)

Pré-requisitos: Python 3.14+ e Poetry.

```bash
make install
make run
```

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

### O que é testado

| Tipo | Verificação |
|---|---|
| Unitário (`tests/unit`) | `home()` e o `ProdutoService` chamados diretamente, sem subir o servidor |
| Integração (`tests/integration`) | Todos os endpoints (`/` e `/produtos`) pela camada HTTP, com o `TestClient` |
| Erro | `404` para rota ou produto inexistente, `405` para método não permitido, `422` para dados inválidos |

## Endpoints de produtos

Os dados ficam em memória (são perdidos ao reiniciar a API). Documentação interativa em
<http://localhost:8000/docs>.

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/produtos?limit=10` | Lista produtos (query parameter `limit`, de 1 a 100) |
| `GET` | `/produtos/{produto_id}` | Consulta um produto |
| `POST` | `/produtos` | Cadastra um produto |
| `PUT` | `/produtos/{produto_id}` | Substitui todos os dados do produto |
| `PATCH` | `/produtos/{produto_id}` | Altera só os campos enviados |
| `DELETE` | `/produtos/{produto_id}` | Remove o produto |

## Integração contínua (CI)

O workflow `.github/workflows/ci-backend.yml` roda no GitHub Actions a cada
`push` e a cada `pull_request`, em dois jobs:

| Job | O que executa |
|---|---|
| `Ruff (Lint & Format)` | `ruff format --check .` e `ruff check .` |
| `Pytest` | `poetry run pytest` |

São as mesmas verificações disponíveis localmente (`make format`, `make lint` e
`make test`), então é possível reproduzir o resultado do CI antes de abrir a PR.

## Serviços

| Serviço | Porta (host) | Descrição |
|---|---|---|
| `api` | 8000 | Backend FastAPI |
| `db` | 5432 | PostgreSQL 17 |

A API se comunica com o banco pelo nome do serviço (`db`), através da rede interna criada pelo Compose. O banco utiliza um volume nomeado (`postgres_data`), então os dados persistem entre reinicializações dos containers.
