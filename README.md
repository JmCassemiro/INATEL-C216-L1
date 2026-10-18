# INATEL-C216-L1

Laboratório da disciplina C216 — Sistemas Distribuídos.

## Estrutura

```text
INATEL-C216-L1/
├── .github/
│   └── workflows/
│       └── ci-backend.yml
├── backend/
│   ├── app/                     # Clean Architecture: dependências apontam para dentro
│   │   ├── domain/              # entidade Product, value objects Barcode e Price, erros
│   │   ├── application/         # ProductService (casos de uso), porta do repositório, comandos
│   │   ├── infrastructure/
│   │   │   ├── database/        # Base ORM, engine e sessões (URL via DATABASE_URL)
│   │   │   ├── models/          # modelos SQLAlchemy (tabela products)
│   │   │   └── repositories/    # repositório SQLAlchemy e repositório em memória
│   │   ├── api/                 # rotas, schemas Pydantic, tratamento de erros, dependências
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

A API fica disponível em <http://localhost:8000>. Ao subir, o container da API aplica as
migrations pendentes (`alembic upgrade head`) antes de iniciar o servidor.

Sem o `.env`, o ambiente sobe com os valores padrão definidos no `compose.yaml`.

### Comandos Docker

| Comando | Descrição |
|---|---|
| `make up` | Sobe os containers em background |
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
| Integração (`tests/integration`) | Todos os endpoints (`/` e `/products`) pelo `TestClient`; o contrato do repositório (inclusive concorrência) nas implementações SQLAlchemy e em memória; migrations (`upgrade`/`downgrade` e conferência com os modelos); persistência após reiniciar a aplicação |
| Erro | `404` para rota ou produto inexistente, `405` para método não permitido, `409` para código de barras repetido, `422` para dados inválidos |

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

## Integração contínua (CI)

O workflow `.github/workflows/ci-backend.yml` roda no GitHub Actions a cada
`push` e a cada `pull_request`, em dois jobs:

| Job | O que executa |
|---|---|
| `Ruff (Lint & Format)` | `ruff format --check .` e `ruff check .` |
| `Pytest` | `poetry run pytest`, contra um PostgreSQL 17 (service container) |

São as mesmas verificações disponíveis localmente (`make format`, `make lint` e
`make test`), então é possível reproduzir o resultado do CI antes de abrir a PR.

## Serviços

| Serviço | Porta (host) | Descrição |
|---|---|---|
| `api` | 8000 | Backend FastAPI |
| `db` | 5432 | PostgreSQL 17 |

A API se comunica com o banco pelo nome do serviço (`db`), através da rede interna criada pelo Compose. O banco utiliza um volume nomeado (`postgres_data`), então os dados persistem entre reinicializações dos containers.
