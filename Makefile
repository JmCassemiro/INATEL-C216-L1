.PHONY: help install test lint format run clean

BACKEND := backend
PYTHON := poetry run python
PYTEST := poetry run pytest
UVICORN := poetry run uvicorn
RUFF := poetry run ruff

help:
	@echo "Comandos disponiveis:"
	@echo "  install - Instalar dependencias"
	@echo "  test - Executar testes"
	@echo "  lint - Executar linter"
	@echo "  format - Formatar codigo"
	@echo "  run - Executar servidor"
	@echo "  clean - Limpar artefatos"

install:
	cd $(BACKEND) && poetry install --no-root

test:
	cd $(BACKEND) && $(PYTEST)

lint:
	cd $(BACKEND) && $(RUFF) check .

format:
	cd $(BACKEND) && $(RUFF) format .

run:
	cd $(BACKEND) && $(UVICORN) main:app --reload

clean:
	rm -rf $(BACKEND)/__pycache__ $(BACKEND)/.pytest_cache $(BACKEND)/.ruff_cache
