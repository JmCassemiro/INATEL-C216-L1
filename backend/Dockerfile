FROM python:3.14-slim

# Nao gera arquivos .pyc e envia os logs direto para o stdout (visiveis no docker logs)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_VERSION=2.4.1

WORKDIR /app

# Dependencias sao copiadas antes do codigo para aproveitar o cache de camadas:
# enquanto pyproject.toml e poetry.lock nao mudarem, o poetry install nao roda de novo.
COPY pyproject.toml poetry.lock ./

RUN pip install --no-cache-dir "poetry==${POETRY_VERSION}" \
    && poetry config virtualenvs.create false \
    && poetry install --no-root --only main --no-interaction --no-ansi

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./

# Executa a aplicacao com um usuario sem privilegios (principio do menor privilegio)
RUN useradd --create-home appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Aplica as migrations pendentes antes de subir a API: o banco sempre esta na versao
# que o codigo espera. --factory: o uvicorn chama create_app() para criar a aplicacao.
# 0.0.0.0 e necessario para o servidor aceitar conexoes vindas de fora do container.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:create_app --factory --host 0.0.0.0 --port 8000"]
