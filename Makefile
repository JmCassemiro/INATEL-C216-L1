.PHONY: help install test test-verbose lint format run clean setup-hooks \
        up down build rebuild logs ps shell db-shell docker-clean

BACKEND := backend
PYTHON := poetry run python
PYTEST := poetry run pytest
UVICORN := poetry run uvicorn
RUFF := poetry run ruff
COMPOSE := docker compose

help:
	@echo "Comandos disponiveis:"
	@echo ""
	@echo " Ambiente local (Poetry):"
	@echo "  install - Instalar dependencias"
	@echo "  test - Executar testes"
	@echo "  test-verbose - Executar testes com saida detalhada"
	@echo "  lint - Executar linter"
	@echo "  format - Formatar codigo"
	@echo "  run - Executar servidor"
	@echo "  clean - Limpar artefatos"
	@echo "  setup-hooks - Ativar git hooks do projeto (valida mensagens de commit)"
	@echo ""
	@echo " Ambiente Docker:"
	@echo "  up - Subir os containers em background"
	@echo "  down - Parar e remover os containers"
	@echo "  build - Construir as imagens"
	@echo "  rebuild - Reconstruir as imagens e subir os containers"
	@echo "  logs - Acompanhar os logs de todos os servicos"
	@echo "  ps - Listar o status dos containers"
	@echo "  shell - Abrir um terminal dentro do container da API"
	@echo "  db-shell - Abrir o psql dentro do container do banco"
	@echo "  docker-clean - Remover containers e volumes (APAGA os dados do banco)"

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
	cd $(BACKEND) && $(UVICORN) main:app --reload

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

rebuild:
	$(COMPOSE) up -d --build

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps

shell:
	$(COMPOSE) exec api sh

db-shell:
	$(COMPOSE) exec db sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

docker-clean:
	$(COMPOSE) down -v
