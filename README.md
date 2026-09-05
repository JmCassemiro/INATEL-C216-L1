# INATEL-C216-L1

Laboratório da disciplina C216 — Sistemas Distribuídos.

## Estrutura

```text
INATEL-C216-L1/
├── backend/
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── main.py
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
| `make lint` | Executa o linter |
| `make format` | Formata o código |
| `make clean` | Remove artefatos de build e cache |
| `make setup-hooks` | Ativa os git hooks do projeto |

Rode `make help` para ver todos os comandos disponíveis.

## Serviços

| Serviço | Porta (host) | Descrição |
|---|---|---|
| `api` | 8000 | Backend FastAPI |
| `db` | 5432 | PostgreSQL 17 |

A API se comunica com o banco pelo nome do serviço (`db`), através da rede interna criada pelo Compose. O banco utiliza um volume nomeado (`postgres_data`), então os dados persistem entre reinicializações dos containers.
