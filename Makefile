.PHONY: help install test test-verbose test-postgres lint format run clean setup-hooks \
        up down build rebuild logs ps shell db-shell docker-clean \
        frontend-install frontend-dev frontend-lint frontend-format frontend-check \
        frontend-test frontend-test-e2e frontend-build e2e check-all

BACKEND := backend
FRONTEND := frontend
# No Windows, o script "npm" chama "bash", que pode ser o do WSL; o npm.cmd nao depende dele.
ifeq ($(OS),Windows_NT)
NPM := npm.cmd --prefix $(FRONTEND)
else
NPM := npm --prefix $(FRONTEND)
endif
PYTHON := poetry run python
PYTEST := poetry run pytest
UVICORN := poetry run uvicorn
RUFF := poetry run ruff
ALEMBIC := poetry run alembic
COMPOSE := docker compose
# Stack do E2E: outro projeto do Compose, isolado do ambiente de desenvolvimento
E2E_COMPOSE := $(COMPOSE) -p nexopdv-e2e

# Variaveis do .env (se existir), as mesmas que o Compose usa para criar o banco.
-include .env
POSTGRES_USER ?= app
POSTGRES_PASSWORD ?= app
POSTGRES_DB ?= app
POSTGRES_PORT ?= 5432

# Fora do Docker, a API e o Alembic acessam o banco do Compose pela porta publicada no
# host (localhost). Dentro do Compose, o host e "db" (veja compose.yaml).
DATABASE_URL ?= postgresql+psycopg://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@localhost:$(POSTGRES_PORT)/$(POSTGRES_DB)
export DATABASE_URL

help:
	@echo "Comandos disponiveis:"
	@echo ""
	@echo " Ambiente local (Poetry):"
	@echo "  install - Instalar dependencias"
	@echo "  test - Executar testes"
	@echo "  test-verbose - Executar testes com saida detalhada"
	@echo "  test-postgres - Executar os testes num PostgreSQL descartavel (como no CI)"
	@echo "  lint - Executar linter"
	@echo "  format - Formatar codigo"
	@echo "  run - Executar servidor (usa o banco do Compose: rode make up antes)"
	@echo "  clean - Limpar artefatos"
	@echo "  setup-hooks - Ativar git hooks do projeto (valida mensagens de commit)"
	@echo ""
	@echo " Ambiente Docker:"
	@echo "  up - Subir os containers (db, api e frontend) em background"
	@echo "  down - Parar e remover os containers"
	@echo "  build - Construir as imagens"
	@echo "  rebuild / up-build - Reconstruir as imagens e subir os containers"
	@echo "  logs - Acompanhar os logs de todos os servicos"
	@echo "  logs-api - Acompanhar os logs da API"
	@echo "  ps - Listar o status dos containers"
	@echo "  shell - Abrir um terminal dentro do container da API"
	@echo "  db-shell - Abrir o psql dentro do container do banco"
	@echo "  docker-clean - Remover containers e volumes (APAGA os dados do banco)"
	@echo ""
	@echo " Migrations (Alembic, no banco do Compose):"
	@echo "  db-upgrade - Aplicar as migrations pendentes"
	@echo "  db-downgrade - Desfazer a ultima migration"
	@echo "  db-migration msg=\"...\" - Gerar uma migration a partir dos modelos"
	@echo "  db-current - Mostrar a versao atual do banco"
	@echo "  db-history - Listar o historico de migrations"
	@echo ""
	@echo " Frontend (npm):"
	@echo "  frontend-install - Instalar dependencias (npm ci)"
	@echo "  frontend-dev - Servidor de desenvolvimento (Vite)"
	@echo "  frontend-lint - Executar o lint (Biome)"
	@echo "  frontend-format - Formatar codigo (Biome)"
	@echo "  frontend-check - Lint + formatacao sem alterar arquivos"
	@echo "  frontend-test - Testes unitarios e de integracao (Vitest)"
	@echo "  frontend-test-e2e - Testes E2E (Playwright) contra uma stack ja no ar (E2E_BASE_URL)"
	@echo "  frontend-build - Build de producao"
	@echo ""
	@echo " Full-stack (exige Docker):"
	@echo "  e2e - E2E em stack isolada (nexopdv-e2e): sobe, testa e apaga tudo"
	@echo "  check-all - Backend (Ruff + Pytest) + frontend (Biome, Vitest, build) + e2e"

install:
	cd $(BACKEND) && poetry install --no-root

test:
	cd $(BACKEND) && $(PYTEST)

test-verbose:
	cd $(BACKEND) && $(PYTEST) -v

# Os mesmos testes num PostgreSQL 17 descartavel, como no CI: inclui o teste de
# concorrencia do estoque, que o SQLite pula. O container nao tem volume e e apagado no
# final, mesmo se os testes falharem. O pg_isready usa TCP (-h 127.0.0.1) porque o
# servidor temporario da inicializacao da imagem so escuta no socket local.
TEST_DB_CONTAINER := nexopdv-test-db
TEST_DB_PORT ?= 5435
TEST_DB_URL := postgresql+psycopg://test:test@localhost:$(TEST_DB_PORT)/test
test-postgres:
	docker run --rm -d --name $(TEST_DB_CONTAINER) -e POSTGRES_USER=test \
		-e POSTGRES_PASSWORD=test -e POSTGRES_DB=test -p $(TEST_DB_PORT):5432 postgres:17-alpine
	for i in $$(seq 1 60); do \
		docker exec $(TEST_DB_CONTAINER) pg_isready -h 127.0.0.1 -U test -d test >/dev/null 2>&1 && break; \
		sleep 1; \
	done
	cd $(BACKEND) && TEST_DATABASE_URL=$(TEST_DB_URL) $(PYTEST) -rs || (docker stop $(TEST_DB_CONTAINER) && exit 1)
	docker stop $(TEST_DB_CONTAINER)

lint:
	cd $(BACKEND) && $(RUFF) check .

format:
	cd $(BACKEND) && $(RUFF) format .

run:
	cd $(BACKEND) && $(UVICORN) app.main:create_app --factory --reload

clean:
	rm -rf $(BACKEND)/__pycache__ $(BACKEND)/.pytest_cache $(BACKEND)/.ruff_cache

setup-hooks:
	git config core.hooksPath .githooks
	@echo "Hooks ativados: mensagens de commit agora sao validadas (padrao Conventional Commits)."

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

build:
	$(COMPOSE) build

rebuild up-build:
	$(COMPOSE) up -d --build

logs:
	$(COMPOSE) logs -f

logs-api:
	$(COMPOSE) logs -f api

ps:
	$(COMPOSE) ps

shell:
	$(COMPOSE) exec api sh

db-shell:
	$(COMPOSE) exec db sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

docker-clean:
	$(COMPOSE) down -v

db-upgrade:
	cd $(BACKEND) && $(ALEMBIC) upgrade head

db-downgrade:
	cd $(BACKEND) && $(ALEMBIC) downgrade -1

db-migration:
	cd $(BACKEND) && $(ALEMBIC) revision --autogenerate -m "$(msg)"

db-current:
	cd $(BACKEND) && $(ALEMBIC) current

db-history:
	cd $(BACKEND) && $(ALEMBIC) history

frontend-install:
	$(NPM) ci

frontend-dev:
	$(NPM) run dev

frontend-lint:
	$(NPM) run lint

frontend-format:
	$(NPM) run format

frontend-check:
	$(NPM) run lint
	$(NPM) run format:check

frontend-test:
	$(NPM) run test

frontend-test-e2e:
	$(NPM) run test:e2e

frontend-build:
	$(NPM) run build

# E2E full-stack numa stack separada da de desenvolvimento: projeto "nexopdv-e2e", outras
# portas e um volume proprio do banco. A API aplica as migrations ao subir. No final,
# "down -v" apaga tudo, inclusive o banco de teste, mesmo se os testes falharem.
e2e: export API_PORT := 8001
e2e: export FRONTEND_PORT := 5174
e2e: export POSTGRES_PORT := 5434
e2e: export CORS_ORIGINS := http://localhost:5174,http://127.0.0.1:5174
e2e: export VITE_API_URL := http://localhost:8001
e2e: export E2E_BASE_URL := http://localhost:5174
e2e:
	$(E2E_COMPOSE) up -d --build --wait || ($(E2E_COMPOSE) down -v && exit 1)
	$(NPM) run test:e2e || ($(E2E_COMPOSE) down -v && exit 1)
	$(E2E_COMPOSE) down -v

check-all:
	cd $(BACKEND) && $(RUFF) format --check . && $(RUFF) check . && $(PYTEST)
	$(MAKE) frontend-check frontend-test frontend-build e2e
