# Implementation Plan: Cadastro de Produtos

**Branch**: `002-produtos` | **Date**: 2026-10-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-produtos/spec.md`

## Summary

Cadastro de produtos do NexoPDV: cadastrar, consultar por id e por código de barras, listar com
paginação e busca por nome, substituir, alterar parcialmente e remover por inativação, com os
dados em memória. A Prática 4 já entregou um CRUD mínimo (`routes/ schemas/ services/`); este
plano o reorganiza em Clean Architecture (constituição v2.0.0, Princípio V) e acrescenta o que a
spec pede além dele: código de barras GTIN único (inclusive entre removidos), preço como valor
monetário exato, remoção por inativação, paginação com total e busca sem acento.

Abordagem: as regras ficam no domínio (entidade imutável `Product` e value objects `Barcode`
e `Price`); um serviço de aplicação orquestra os casos de uso sobre uma porta de repositório; o
repositório em memória garante a unicidade de forma atômica; a borda FastAPI valida com Pydantic
reaproveitando as regras do domínio e traduz erros de domínio em 404/409/422. Decisões e
alternativas em [research.md](research.md).

## Technical Context

**Language/Version**: Python 3.14

**Primary Dependencies**: FastAPI 0.141, Pydantic 2.13 (via FastAPI), Uvicorn. Nenhuma
dependência nova: o resto é stdlib (`uuid.uuid7`, `decimal`, `dataclasses`, `threading`,
`unicodedata`, `ast`).

**Storage**: em memória (dicionário + índice por GTIN-14, protegidos por lock), atrás da porta
`ProductRepository`. PostgreSQL entra numa Prática futura, como nova implementação da porta.

**Testing**: pytest; unitários sem infraestrutura real (domínio, serviço com o repositório em
memória, repositório, regra de dependência) e integração pela borda com `TestClient`.

**Target Platform**: servidor Linux em container Docker (imagem `python:3.14-slim`); CI no GitHub
Actions (Ruff + Pytest).

**Project Type**: web service (API REST), parte de um sistema web + desktop futuro.

**Performance Goals**: consulta por código de barras com 10.000 produtos em menos de 1 s (SC-004);
atendido com busca O(1) no índice por GTIN-14.

**Constraints**: preço exato em centavos (sem `float`); nenhuma operação recusada altera o catálogo
(FR-017); unicidade do código de barras sob requisições concorrentes; domínio e aplicação sem
FastAPI/Pydantic.

**Scale/Scope**: uma loja (C-09), catálogo da ordem de 10⁴ produtos; 7 operações HTTP.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Verificação | Situação |
|---|---|---|
| I. TDD obrigatório | `tasks.md` terá tarefa de teste antes de cada tarefa de código; cada história fecha com `make test` verde. Os testes de produtos da Prática 4 são substituídos por testes escritos antes do novo código. | ✅ |
| II. Requisitos da Prática | RP-001 a RP-008 mapeados abaixo; extras (FR-005, FR-007, FR-010) já marcados na spec. | ✅ |
| III. Stack definida | Python 3.14, FastAPI, Poetry, pytest, ruff. Sem biblioteca nova. | ✅ |
| IV. Complexidade justificada | Cada abstração listada em "Abstrações e justificativas" com a alternativa descartada; descartadas de propósito: uma classe por caso de uso, interface `Relogio`, `lifespan`, `import-linter`. | ✅ |
| V. Clean Architecture | Quatro camadas, dependências para dentro (verificadas por teste, D14), porta do repositório na aplicação, composição na borda (`Depends` + `create_app`), `main.py` só inicializa. Camada de cada arquivo indicada na estrutura abaixo. | ✅ |
| Qualidade | `make test`, `make lint`, `make format` e CI verdes antes de concluir. | ✅ |

**Reavaliação pós-design (Fase 1)**: o modelo de dados e o contrato não introduziram nada além do
previsto. Domínio e aplicação usam só stdlib; os schemas (borda) importam o domínio, o que respeita
a regra de dependência. Gate aprovado, sem violações a justificar.

### Requisitos de entrega da Prática 4 (RP-001 a RP-008)

| Requisito | Como é atendido |
|---|---|
| RP-001 GET, POST, PUT, PATCH, DELETE | As sete operações do [contrato](contracts/products-api.md) |
| RP-002 parâmetros de caminho e consulta | `{product_id}`, `{barcode}`; `page`, `size`, `name` |
| RP-003 validação com Pydantic | `ProductInput` e `ProductChangesInput`, com `AfterValidator` chamando as regras do domínio |
| RP-004 estrutura organizada; `main.py` só inicializa | Rotas, schemas e serviço separados por camada; `main.py` com `create_app()` |
| RP-005 todos os endpoints com `TestClient` | `tests/integration/test_products_api.py` cobre cada operação e cada erro |
| RP-006 unitários separados de integração | `tests/unit/` e `tests/integration/` (mantido) |
| RP-007 CI executa todos os testes | Workflow atual roda `pytest` em `tests/` inteiro; sem mudança |
| RP-008 nada anterior quebra | Rota `GET /` e seus testes intactos; Dockerfile e Makefile continuam em `app.main:app` |

## Project Structure

### Documentation (this feature)

```text
specs/002-produtos/
├── spec.md
├── plan.md              # este arquivo
├── research.md          # decisões D1–D15
├── data-model.md        # entidade, value objects, erros, porta
├── quickstart.md        # roteiro de validação
├── contracts/
│   └── products-api.md  # contrato HTTP de /products
├── checklists/
│   └── requirements.md
└── tasks.md             # gerado por /speckit-tasks
```

### Source Code (repository root)

Camadas: **[D]** domínio · **[A]** aplicação · **[I]** adaptadores de interface · **[F]**
infraestrutura · **[C]** composição/inicialização.

```text
backend/
├── app/
│   ├── main.py                                  [C] ALTERADO   create_app(): rotas, handlers, repositório em app.state; app = create_app()
│   ├── domain/                                  [D] NOVO
│   │   ├── errors.py                            [D] DomainError, InvalidDataError, NotFoundError, ConflictError e concretos
│   │   ├── barcode.py                           [D] value object Barcode (GTIN, gtin14)
│   │   ├── price.py                             [D] value object Price (Decimal)
│   │   └── product.py                           [D] entidade Product + normalize_name / normalize_description
│   ├── application/                             [A] NOVO
│   │   ├── ports/
│   │   │   └── product_repository.py            [A] Protocol ProductRepository
│   │   ├── commands.py                          [A] ProductData, ProductChanges, UNSET
│   │   ├── pagination.py                        [A] Page[T], DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
│   │   └── services/
│   │       └── product_service.py               [A] ProductService (7 casos de uso)
│   ├── infrastructure/                          [F] NOVO
│   │   └── repositories/
│   │       └── in_memory_product_repository.py  [F] InMemoryProductRepository (lock, índice gtin14, busca sem acento)
│   ├── api/                                     [I]
│   │   ├── dependencies.py                      [I] ALTERADO   provedores: repositório (app.state) → ProductService
│   │   ├── error_handlers.py                    [I] NOVO       exception handlers por categoria (404/409/422)
│   │   ├── schemas/
│   │   │   └── product.py                       [I] NOVO       ProductInput, ProductChangesInput, ProductOutput, ProductPageOutput
│   │   └── routes/
│   │       ├── home.py                          [I] sem mudança
│   │       └── products.py                      [I] NOVO       7 rotas, sem try/except (substitui produtos.py)
│   ├── schemas/                                 REMOVIDO (substituído por api/schemas/)
│   └── services/                                REMOVIDO (substituído por application/services/)
└── tests/
    ├── unit/
    │   ├── test_home.py                         ALTERADO   nomes dos testes em inglês
    │   ├── test_architecture.py                 NOVO       regra de dependência (D14)
    │   ├── test_produto_service.py              REMOVIDO
    │   ├── domain/
    │   │   ├── test_errors.py                   NOVO
    │   │   ├── test_barcode.py                  NOVO
    │   │   ├── test_price.py                    NOVO
    │   │   └── test_product.py                  NOVO
    │   ├── application/
    │   │   └── test_product_service.py          NOVO
    │   └── infrastructure/
    │       └── test_in_memory_product_repository.py  NOVO  unicidade, ordem, busca, concorrência
    └── integration/
        ├── conftest.py                          ALTERADO   fixture client com create_app()
        ├── test_app.py                          NOVO       create_app() e tradução de erros
        ├── test_home_api.py                     ALTERADO   nomes dos testes em inglês
        ├── test_produtos_api.py                 REMOVIDO
        └── test_products_api.py                 NOVO       contrato completo
```

Fora de `backend/`: `README.md` (seção da API de produtos) e `CLAUDE.md` (convenção de idioma e seção Estrutura,
que ainda cita `backend/main.py`) são atualizados. Dockerfile, Makefile, `compose.yaml` e o workflow
de CI não mudam.

**Structure Decision**: web service único em `backend/app/`, com um pacote por camada da Clean
Architecture (D1). A organização por feature fica para quando houver mais de um agregado. Os
testes unitários espelham as camadas.

## Abstrações e justificativas (Princípio IV)

| Abstração | O que resolve | Alternativa descartada |
|---|---|---|
| Value object `Barcode` | Regra GTIN e igualdade por GTIN-14 num só lugar; reutilizado na venda | Validar string solta no serviço e no schema (D6) |
| Value object `Price` | Valor exato, regras e normalização de casas; reutilizado na venda | `Decimal` solto com regras repetidas (D5) |
| Entidade imutável | Operação recusada não altera o catálogo (FR-017) | Entidade mutável + cópia defensiva (D10) |
| Porta `ProductRepository` (`Protocol`) | Trocar memória por PostgreSQL sem tocar nos casos de uso | Serviço acessando o dicionário (D3) |
| `ProductService` | Casos de uso fora das rotas e do framework | Uma classe por caso de uso (D2) |
| Comandos `ProductData` / `ProductChanges` | Entrada da aplicação sem Pydantic; distingue omitido de nulo no PATCH | Passar o schema Pydantic à aplicação (viola Princípio V) |
| Hierarquia de erros por categoria + handlers | Tradução única para HTTP; novas specs só escolhem a categoria | `HTTPException` no serviço ou `try/except` por rota (D8) |
| `create_app()` + `app.state` | Composição na borda; testes isolados sem override | Instância global de módulo (D12) |
| Lock no repositório | Unicidade atômica com rotas em threads | Checagem prévia no serviço (D9) |

## Complexity Tracking

Sem violações da constituição a justificar.
