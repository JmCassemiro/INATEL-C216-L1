# Quickstart: validar o Cadastro de Produtos

**Feature**: [spec.md](spec.md) | **Contrato**: [contracts/products-api.md](contracts/products-api.md)

Roteiro para provar, de ponta a ponta, que a feature funciona. Comandos a partir da raiz do
repositório.

## Pré-requisitos

- Python 3.14 e Poetry (`make install`)
- Docker, só para o passo 4

## 1. Verificação automatizada

```bash
make test     # unitários (domínio, aplicação, repositório, arquitetura) e integração (TestClient)
make lint
make format   # o CI falha se o código não estiver formatado
```

Esperado: tudo verde. Os testes cobrem todos os cenários de aceitação da spec (SC-006).

## 2. Subir a API localmente

```bash
make run      # http://localhost:8000 — documentação interativa em /docs
```

## 3. Roteiro manual (US1 a US4)

Use `/docs` ou um cliente HTTP. Os resultados esperados seguem o
[contrato](contracts/products-api.md).

| # | Ação | Esperado |
|---|---|---|
| 1 | `POST /products` com `{"name": "Camiseta Básica Branca M", "barcode": "7891000315507", "price": 49.90}` | 201, `Location` com o id, `price: "49.90"` |
| 2 | `GET /products/{id}` com o id do passo 1 | 200, mesmos dados |
| 3 | `GET /products/barcode/7891000315507` e depois `/07891000315507` | 200 nas duas, mesmo produto |
| 4 | Repetir o passo 1 | 409 |
| 5 | `POST` com `"barcode": "7891000315508"`, com `"price": 0` e com `"name": "   "` | 422, com o campo em `loc` |
| 6 | `GET /products/abc` | 422 (não 404) |
| 7 | Cadastrar "Calça Jeans 40" (`7891000100103`) e "calça moletom" (`7891000053508`); `GET /products?name=calca` | os dois produtos de calça, `total: 2` |
| 8 | `GET /products?size=0` e `?size=101` | 422 |
| 9 | `PATCH /products/{id}` com `{"price": "44.90"}` | 200, só o preço mudou |
| 10 | `PATCH /products/{id}` com `{}` | 422 |
| 11 | `PATCH /products/{id}` com o código de barras de outro produto | 409, produto inalterado |
| 12 | `DELETE /products/{id}` | 204 |
| 13 | `GET /products/{id}`, `PATCH` e `DELETE` no mesmo id | 404 nos três |
| 14 | `POST` de outro produto com `7891000315507` | 409 (código reservado) |

> Os códigos dos passos 7 são EAN-13 válidos de exemplo; qualquer GTIN com dígito verificador
> correto serve.

## 4. Regressão das Práticas anteriores (RP-008)

```bash
make up       # API + PostgreSQL via Docker Compose
curl http://localhost:8000/            # {"message": "Olá, Sistemas Distribuídos!"}
make down
```

Esperado: a imagem constrói com `app.main:app` e a rota inicial responde. O CI (Ruff + Pytest)
fica verde no PR.
