.PHONY: help install test lint format run clean

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
	poetry install

test:
	$(PYTEST)

lint:
	$(RUFF) check .

format:
	$(RUFF) format .

run:
	$(UVICORN) backend.main:app --reload

clean:
	rm -rf __pycache__ .pytest_cache .ruff_cache