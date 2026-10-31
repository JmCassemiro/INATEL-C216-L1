.PHONY: help install test test-verbose lint format run clean setup-hooks \
        up down build rebuild logs ps shell db-shell docker-clean \
        frontend-install frontend-dev frontend-lint frontend-format frontend-check \
        frontend-test frontend-test-e2e frontend-build check-all

BACKEND := backend
FRONTEND := frontend
NPM := npm --prefix $(FRONTEND)
PYTHON := poetry run python
PYTEST := poetry run pytest
UVICORN := poetry run uvicorn
RUFF := poetry run ruff
ALEMBIC := poetry run alembic
COMPOSE := docker compose

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
	@echo "  lint - Executar linter"
	@echo "  format - Formatar codigo"
	@echo "  run - Executar servidor (usa o banco do Compose: rode make up antes)"
	@echo "  clean - Limpar artefatos"
	@echo "  setup-hooks - Ativar git hooks do projeto (valida mensagens de commit)"
	@echo ""
	@echo " Ambiente Docker:"
	@echo "  up - Subir os containers em background"
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
	@echo "  frontend-test-e2e - Testes E2E (Playwright)"
	@echo "  frontend-build - Build de producao"
	@echo ""
	@echo "  check-all - Backend (Ruff + Pytest) + frontend (Biome, Vitest, build, E2E)"

install:
	cd $(BACKEND) && poetry install --no-root

test:
	cd $(BACKEND) && $(PYTEST)

test-verbose:
	cd $(BACKEND) && $(PYTEST) -v

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

check-all:
	cd $(BACKEND) && $(RUFF) format --check . && $(RUFF) check . && $(PYTEST)
	$(MAKE) frontend-check frontend-test frontend-build frontend-test-e2e
