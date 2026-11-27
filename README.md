# NexoPDV

[![CI - Backend](https://github.com/JmCassemiro/INATEL-C216-L1/actions/workflows/ci-backend.yml/badge.svg?branch=projeto-final)](https://github.com/JmCassemiro/INATEL-C216-L1/actions/workflows/ci-backend.yml)
[![CI - Frontend](https://github.com/JmCassemiro/INATEL-C216-L1/actions/workflows/ci-frontend.yml/badge.svg?branch=projeto-final)](https://github.com/JmCassemiro/INATEL-C216-L1/actions/workflows/ci-frontend.yml)

Frente de caixa e gestão de estoque para lojas de varejo físico. Projeto Final da disciplina
C216 L1 (Sistemas Distribuídos) do INATEL.

**Vídeo de apresentação:** [assistir no YouTube](LINK_DO_VIDEO)

## Sumário

- [Objetivo e tema](#objetivo-e-tema)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Como executar](#como-executar)
- [Como acessar a aplicação](#como-acessar-a-aplicação)
- [Banco de dados e migrations](#banco-de-dados-e-migrations)
- [Testes](#testes)
- [Integração contínua (CI)](#integração-contínua-ci)
- [Comandos do Makefile](#comandos-do-makefile)
- [Referência da API](#referência-da-api)
- [Próximos passos](#próximos-passos)

## Objetivo e tema

O **NexoPDV** é um sistema de automação comercial para lojas de varejo físico de pequeno e médio
porte, como lojas de roupas, calçados e variedades. Ele junta dois mundos: o **painel de gestão**
(catálogo de produtos e estoque) e a **frente de caixa** (a venda no balcão).

O tema foi escolhido por ser um domínio real, com regras de negócio que vão além de um cadastro:
o estoque não pode ficar negativo nem perder movimentações quando dois caixas vendem ao mesmo
tempo, uma venda precisa baixar o estoque de todos os itens de uma vez, e uma venda repetida por
queda de conexão não pode ser registrada duas vezes. São problemas típicos de sistemas
distribuídos: concorrência, transações e idempotência.

A visão completa do produto, que vai além desta entrega (login com perfis, turno de caixa e caixa
que funciona sem internet), está em [docs/product/visao.md](docs/product/visao.md). O que já foi
feito e o que vem depois estão em [Próximos passos](#próximos-passos).

## Funcionalidades

**Site e painel**

- Página de entrada do site (`/`), com o que já está disponível e o que vem depois.
- Painel com menu lateral, tema claro e escuro, layout para celular (menu em gaveta e tabelas
  viram listas) e indicador de conexão com a internet.
- Todas as telas mostram os estados de carregando, vazio, sucesso e erro.

**Produtos (CRUD completo pela interface)**

- Listar com busca por nome (sem diferenciar maiúsculas e acentos) e paginação; a busca e a
  página ficam na URL.
- Cadastrar e editar num painel lateral, com validação de nome, preço e código de barras (GTIN-8,
  12, 13 ou 14, com dígito verificador) e uma prévia da etiqueta de gôndola com as barras do
  código desenhadas na tela.
- Remover com confirmação. A remoção é lógica: o produto some do catálogo, mas o código de barras
  continua reservado e o histórico das vendas continua íntegro.

**Estoque**

- Saldo e estoque mínimo de cada produto, com a situação (ok, para repor ou sem estoque).
- Indicadores: produtos para repor, sem estoque e valor do estoque a preço de venda.
- Lista do que precisa de reposição, ordenada pela maior falta.
- Entrada de mercadoria e ajuste (para mais ou para menos) com motivo obrigatório e prévia do
  saldo que vai ficar.
- Histórico de movimentações que não se edita nem se apaga.
- O saldo nunca fica negativo, mesmo com movimentações simultâneas no mesmo produto.

**Vendas (frente de caixa)**

- Nova venda pelo código de barras (o leitor USB digita o código e tecla Enter) ou pela busca por
  nome.
- Carrinho guardado no navegador até a venda ser finalizada ou descartada.
- Pagamento em um ou mais meios (dinheiro, Pix, cartão de crédito e de débito), com troco só no
  dinheiro.
- Baixa do estoque de todos os itens na mesma transação da venda.
- Recusa explicada item por item: produto removido, preço alterado ou saldo insuficiente.
- Venda idempotente: se a conexão cai e o painel tenta de novo, a venda não é registrada duas
  vezes.
- Comprovante, histórico de vendas com detalhe e indicadores do dia (vendas, faturamento e ticket
  médio).

## Tecnologias

| Parte | Tecnologias |
|---|---|
| Back-end | Python 3.14, FastAPI, Pydantic, Uvicorn, Poetry |
| Banco de dados | PostgreSQL 17, SQLAlchemy 2, Alembic, psycopg 3 |
| Front-end | React 19, TypeScript (modo estrito), Vite 8, Tailwind CSS 4, shadcn/ui (Radix), TanStack Query 5, React Router |
| Qualidade do back-end | Pytest, Ruff (lint e formatação) |
| Qualidade do front-end | Vitest, Testing Library, MSW (API simulada), Playwright (E2E), Biome (lint e formatação) |
| Infraestrutura | Docker, Docker Compose, Make, GitHub Actions |
| Processo | Spec-Driven Development com GitHub Spec Kit (specs em [specs/](specs/)), TDD, Conventional Commits |

## Arquitetura

O sistema tem três serviços, cada um num container do Docker Compose:

```mermaid
flowchart LR
    browser(["Navegador"])
    frontend["frontend<br/>Vite + React<br/>:5173"]
    api["api<br/>FastAPI<br/>:8000"]
    db[("db<br/>PostgreSQL 17<br/>:5432")]

    browser -- "1. baixa o painel (HTML, JS e CSS)" --> frontend
    browser -- "2. chama a API (HTTP + JSON, CORS)" --> api
    api -- "SQLAlchemy, pela rede interna (host db)" --> db
```

- O **frontend** só entrega o painel. O React roda **no navegador**, e é o navegador que chama a
  API pela porta publicada no host (`localhost:8000`). Por isso a API libera a origem do painel
  no CORS.
- A **API** recebe JSON, valida com Pydantic, aplica as regras de negócio e grava no banco.
  Dentro do Compose, ela acessa o banco pelo nome do serviço (`db`), não por `localhost`.
- O **banco** guarda os dados num volume nomeado (`postgres_data`), então eles continuam lá depois
  de reiniciar os containers. A API aplica as migrations pendentes ao subir.

**Back-end em Clean Architecture.** O código da API fica em camadas, e as dependências sempre
apontam para dentro, para as regras de negócio:

```mermaid
flowchart LR
    api["api/<br/>rotas, schemas, CORS, erros HTTP"]
    infrastructure["infrastructure/<br/>modelos ORM, repositórios, sessão"]
    application["application/<br/>casos de uso, portas, comandos"]
    domain["domain/<br/>entidades, value objects, regras"]

    api --> application
    infrastructure --> application
    application --> domain
```

- `domain/` não conhece FastAPI nem SQLAlchemy: as regras (preço, código de barras, saldo,
  troco) são testadas sem banco e sem servidor.
- `application/` define as portas (interfaces dos repositórios) que a infraestrutura implementa.
- `main.py` tem só a `create_app()`, que liga tudo. Um teste garante que nenhuma camada importa
  uma camada de fora.

Equivalência com a separação pedida no projeto: **rotas** e **schemas** ficam em `api/`,
**services** (casos de uso) em `application/`, **repositories** e **models** em
`infrastructure/`.

**Front-end por funcionalidade.** Cada seção do painel fica em `src/features/<seção>/`, com suas
telas, chamadas à API, consultas do TanStack Query e regras. A identidade visual está em
[frontend/DESIGN.md](frontend/DESIGN.md), aplicada só por tokens de `src/index.css`.

## Estrutura do projeto

```text
INATEL-C216-L1/
├── .github/
│   └── workflows/
│       ├── ci-backend.yml       # Ruff + Pytest (com PostgreSQL)
│       └── ci-frontend.yml      # Biome, Vitest, build e Playwright (stack completa)
├── backend/
│   ├── app/                     # Clean Architecture: dependências apontam para dentro
│   │   ├── domain/              # produto, estoque e venda (regras), value objects, erros
│   │   ├── application/         # casos de uso (produtos, estoque, vendas), portas, comandos
│   │   ├── infrastructure/
│   │   │   ├── database/        # Base ORM, engine e sessões (URL via DATABASE_URL)
│   │   │   ├── models/          # modelos SQLAlchemy (produtos, movimentações e vendas)
│   │   │   └── repositories/    # repositórios SQLAlchemy e em memória
│   │   ├── api/                 # rotas, schemas Pydantic, CORS, tratamento de erros, dependências
│   │   └── main.py              # create_app(): apenas compõe e inicializa a aplicação
│   ├── alembic/
│   │   ├── versions/            # migrations versionadas do banco
│   │   └── env.py               # integra o Alembic aos modelos e ao DATABASE_URL
│   ├── tests/
│   │   ├── unit/                # domínio, aplicação, repositório e regra de dependência
│   │   └── integration/         # endpoints, repositório no banco e migrations
│   ├── alembic.ini
│   ├── Dockerfile
│   ├── poetry.lock
│   └── pyproject.toml
├── frontend/                    # site e painel do NexoPDV
│   ├── src/
│   │   ├── app/                 # composição: providers, rotas e layout (menu lateral e barra)
│   │   ├── components/          # ui/ (shadcn), marca, indicador e tema claro/escuro
│   │   ├── features/landing/    # página de entrada do site (/)
│   │   ├── features/products/   # produtos: telas, API, consultas e regras do formulário
│   │   ├── features/stock/      # estoque: posição, entrada, ajuste e histórico
│   │   ├── features/sales/      # frente de caixa (nova venda) e histórico de vendas
│   │   ├── lib/                 # cliente HTTP, preço como texto e hooks utilitários
│   │   └── index.css            # tokens do tema (cores, fontes, raios, sombras) do DESIGN.md
│   ├── tests/
│   │   ├── unit/                # Vitest: regras puras (GTIN, EAN, preço, carrinho, validação)
│   │   ├── integration/         # Vitest + Testing Library: telas com a API simulada (MSW)
│   │   ├── msw/                 # API falsa que segue o contrato de produtos, estoque e vendas
│   │   └── e2e/                 # Playwright contra a stack completa
│   ├── DESIGN.md                # identidade visual do site e do painel
│   ├── Dockerfile               # servidor de desenvolvimento do Vite
│   ├── biome.json
│   ├── components.json          # configuração do shadcn/ui
│   ├── package.json
│   ├── playwright.config.ts
│   ├── tsconfig.json            # TypeScript estrito (app e configs)
│   └── vite.config.ts           # Vite + Tailwind + Vitest
├── docs/product/visao.md        # documento de visão do produto
├── specs/                       # especificação, plano e tarefas de cada funcionalidade
├── .env.example                 # modelo das variáveis de ambiente (sem segredos reais)
├── compose.yaml                 # frontend, api e db
├── Makefile                     # atalhos para subir, testar e manter o projeto
└── README.md
```

## Pré-requisitos

Para rodar a aplicação (o jeito recomendado, tudo no Docker):

- **Docker** com **Docker Compose** v2 (Docker Desktop no Windows e no macOS).
- **Make** (GNU Make). Sem ele, use os comandos `docker compose` equivalentes, mostrados em
  [Como executar](#como-executar).
- As portas **5173**, **8000** e **5432** livres no host, ou outras definidas no `.env`.

Para desenvolver e rodar os testes fora do Docker:

- **Python 3.14+** e **Poetry 2** (back-end).
- **Node.js 22+** e **npm** (front-end).
- Para o E2E, o navegador do Playwright: `npx playwright install chromium` (dentro de
  `frontend/`).

## Variáveis de ambiente

Todas têm valor padrão no `compose.yaml`, então o ambiente sobe mesmo sem `.env`. Para mudar
algum valor, copie o modelo e edite:

```bash
cp .env.example .env
```

O `.env` não é versionado. O `.env.example` só traz valores de exemplo, nenhum segredo real.

| Variável | Padrão | Usada por | Para que serve |
|---|---|---|---|
| `POSTGRES_DB` | `app` | `db`, `api`, Makefile | Nome do banco criado pelo container |
| `POSTGRES_USER` | `app` | `db`, `api`, Makefile | Usuário do banco |
| `POSTGRES_PASSWORD` | `app` | `db`, `api`, Makefile | Senha do banco |
| `POSTGRES_PORT` | `5432` | `db`, Makefile | Porta do banco no host (use `5433` se já houver um PostgreSQL instalado) |
| `API_PORT` | `8000` | `api` | Porta da API no host |
| `FRONTEND_PORT` | `5173` | `frontend` | Porta do painel no host |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | `api` | Origens que podem chamar a API pelo navegador, separadas por vírgula |
| `VITE_API_URL` | `http://localhost:8000` | `frontend` | Endereço da API visto pelo navegador (por isso `localhost`, e não `api`) |
| `DATABASE_URL` | montada pelo `compose.yaml` e pelo `Makefile` | `api`, Alembic | Conexão com o banco (`postgresql+psycopg://usuario:senha@host:5432/banco`) |
| `TEST_DATABASE_URL` | vazia (SQLite temporário) | Pytest | Banco dos testes de integração; o CI usa um PostgreSQL |
| `E2E_BASE_URL` | `http://localhost:5173` | Playwright | Endereço do painel testado pelo E2E (`make e2e` define o seu) |

`CORS_ORIGINS` e `VITE_API_URL` acompanham `FRONTEND_PORT` e `API_PORT` quando não são
definidas. Nunca coloque senhas em variáveis `VITE_*`: elas vão para o código que roda no
navegador.

## Como executar

### Com Docker (recomendado)

```bash
git clone https://github.com/JmCassemiro/INATEL-C216-L1.git
cd INATEL-C216-L1
git switch projeto-final

cp .env.example .env   # opcional: só para mudar portas ou credenciais
make up-build          # constrói as imagens e sobe db, api e frontend
make ps                # os três serviços devem aparecer como "healthy"
```

Sem Make: `docker compose up -d --build --wait`.

O Compose sobe primeiro o banco; a API só inicia quando o banco está saudável, aplica as
migrations (`alembic upgrade head`) e sobe o servidor; o frontend só inicia quando a API responde.
O código é copiado para as imagens: depois de alterá-lo, rode `make up-build` de novo.

Para parar: `make down` (os dados ficam no volume). Para apagar também os dados do banco:
`make docker-clean`.

### API fora do Docker (desenvolvimento)

```bash
make install     # dependências do back-end (Poetry)
make up          # sobe o PostgreSQL (e a API do container, que pode ser parada)
make db-upgrade  # aplica as migrations
make run         # API em http://localhost:8000, com recarga automática
```

O `Makefile` monta o `DATABASE_URL` com as variáveis do `.env` (ou os padrões do
`compose.yaml`) apontando para `localhost`. Para usar outro banco, defina `DATABASE_URL` no
ambiente.

### Front-end fora do Docker (desenvolvimento)

Com a API no ar:

```bash
make frontend-install
make frontend-dev   # http://localhost:5173
```

## Como acessar a aplicação

Com a stack no ar (`make up-build`):

| Endereço | O que é |
|---|---|
| <http://localhost:5173> | Site do NexoPDV; o botão **Abrir o painel** leva ao painel |
| <http://localhost:5173/products> | Produtos: lista, busca, cadastro, edição e remoção |
| <http://localhost:5173/stock> | Estoque: posição, reposição, entrada, ajuste e histórico |
| <http://localhost:5173/sales/new> | Nova venda (frente de caixa) |
| <http://localhost:5173/sales> | Histórico de vendas e indicadores do dia |
| <http://localhost:8000/docs> | Documentação interativa da API (Swagger) |
| <http://localhost:8000> | API (a raiz responde se ela está no ar) |
| `localhost:5432` | PostgreSQL, para inspecionar com `psql`, DBeaver ou pgAdmin (`make db-shell` abre o `psql` no container) |

Os endereços mudam se `FRONTEND_PORT`, `API_PORT` ou `POSTGRES_PORT` forem alterados no `.env`.

Um roteiro rápido para ver tudo funcionando: cadastre um produto com estoque mínimo 10, registre
uma entrada de 5 unidades no estoque (ele aparece em **Para repor**), faça uma venda de 2 unidades
pelo código de barras e recarregue a página: a venda, o saldo de 3 unidades e o histórico vêm do
banco.

## Banco de dados e migrations

A conexão vem de `DATABASE_URL`. Dentro do Compose o host é `db`, o nome do serviço; fora dele,
`localhost`. A estrutura do banco é versionada com Alembic, em `backend/alembic/versions/`, e a
API aplica as migrations pendentes ao subir.

| Migration | O que faz |
|---|---|
| `cc5b1753dfe7` | Cria a tabela `products` |
| `4f1e2a7c9b3d` | Cria a tabela `items` (laboratório da Prática 7) |
| `799308dbf8c8` | Remove `items`, substituída pelo painel de produtos (a migration anterior fica no histórico) |
| `330c84df2ee3` | Estoque: saldo e mínimo em `products` e o histórico `stock_movements` |
| `a7d4e2c91b3f` | Vendas: `sales`, `sale_items`, `sale_payments` e a baixa por venda em `stock_movements` |

| Comando | Descrição |
|---|---|
| `make db-upgrade` | Aplica as migrations pendentes |
| `make db-downgrade` | Desfaz a última migration |
| `make db-migration msg="..."` | Gera uma migration comparando os modelos com o banco (revise o arquivo antes de aplicar) |
| `make db-current` | Mostra a versão atual do banco |
| `make db-history` | Lista o histórico de migrations |

Esses comandos rodam do host, no banco do Compose. Um teste de integração aplica e desfaz todas as
migrations e confere se o resultado bate com os modelos.

## Testes

```bash
make test             # back-end (Pytest), num SQLite temporário
make test-postgres    # back-end num PostgreSQL 17 descartável, como no CI
make lint             # Ruff no back-end
make frontend-test    # front-end (Vitest + Testing Library)
make frontend-check   # Biome no front-end
make frontend-build   # verificação de tipos e build
make e2e              # Playwright: navegador real → React → FastAPI → PostgreSQL
make check-all        # tudo acima (exige Docker)
```

### Cobertura

```bash
make coverage           # back-end: resumo no terminal + backend/htmlcov/index.html
make frontend-coverage  # front-end: resumo no terminal + frontend/coverage/index.html
```

O relatório em HTML mostra o total do projeto e, ao clicar num arquivo, as linhas que os testes
não executam. No back-end mede o pacote `app/` (linhas e desvios); no front-end, `src/`, sem os
componentes gerados pelo shadcn (`src/components/ui/`). Os relatórios ficam fora do git.

### Back-end

Os testes ficam em `backend/tests/` e rodam com Pytest (configuração em
`backend/pyproject.toml`).

| Tipo | Verificação |
|---|---|
| Unitário (`tests/unit`) | Domínio (produto, regras de estoque e de venda: itens, total, pagamento e troco), `ProductService`, `StockService`, `SaleService`, leitura do `DATABASE_URL` e a regra de dependência entre camadas, sem banco e sem servidor |
| Integração (`tests/integration`) | Todos os endpoints (`/`, `/products`, o estoque e `/sales`) pelo `TestClient`; CORS (origem desconhecida e métodos liberados); o contrato dos repositórios de produto, estoque e venda nas implementações SQLAlchemy e em memória, inclusive 50 entradas simultâneas no mesmo produto, 25 vendas disputando 20 unidades e vendas com os mesmos produtos em ordens opostas (sem impasse); idempotência da venda; migrations (`upgrade`/`downgrade` e conferência com os modelos); persistência após reiniciar a aplicação |
| Erro | `404` para rota, produto ou venda inexistente, `405` para método não permitido, `409` para código de barras repetido, saldo que ficaria negativo ou acima do teto e venda recusada (com os problemas de cada item), `422` para dados inválidos |

Os testes de integração usam um banco próprio, criado pelas migrations: por padrão um SQLite
temporário, para rodar sem Docker. Com `TEST_DATABASE_URL` definida, rodam nesse banco.

`make test-postgres` faz o mesmo que o CI sem tocar no banco de desenvolvimento: sobe um
PostgreSQL 17 descartável num container, roda a suíte contra ele e apaga o container no final,
mesmo se algum teste falhar. Só nele (e no CI) rodam os testes de concorrência do estoque e das
vendas, que o SQLite pula com o motivo escrito.

### Front-end

| Tipo | Ferramenta | O que verifica |
|---|---|---|
| Unitário | Vitest | Regras puras: GTIN, código de barras EAN, preço, valor e quantidade como texto, datas, validação dos formulários, o carrinho da venda (itens, pagamentos, troco e recusas), parâmetros da URL e o cliente HTTP |
| Integração | Vitest + Testing Library + MSW | As telas com a API simulada na rede: produtos (lista, busca, paginação, cadastro, edição e remoção), estoque (posição, reposição, indicadores, entrada, ajuste e histórico) e vendas (leitura, busca, carrinho, pagamento dividido, troco, finalização, recusa, falha de rede com nova tentativa, comprovante, histórico e indicadores), com os estados de carregando, vazio, erro, `404`, `409` e `422`, tema e teclado |
| E2E | Playwright | Navegador real → React → FastAPI → PostgreSQL, sem mocks: o CRUD de produtos, o fluxo do estoque (reposição, entrada e ajuste) e uma venda pelo código com Pix e dinheiro, recarregando a página para provar a persistência |

`make e2e` sobe uma stack **separada** da de desenvolvimento (projeto Compose `nexopdv-e2e`,
frontend em `5174`, API em `8001`, banco em `5434` e volume próprio), roda o Playwright e
derruba tudo com `down -v`, mesmo se os testes falharem. O banco de desenvolvimento nunca é
tocado. Os arquivos de E2E rodam um de cada vez, porque dividem o mesmo banco.

## Integração contínua (CI)

Dois workflows do GitHub Actions rodam as mesmas verificações disponíveis localmente:

| Workflow | Quando roda | Jobs |
|---|---|---|
| [`ci-backend.yml`](.github/workflows/ci-backend.yml) | Todo `push` e todo `pull_request` | `Ruff (Lint & Format)`: `ruff format --check .` e `ruff check .`; `Pytest`: a suíte contra um PostgreSQL 17 (service container) |
| [`ci-frontend.yml`](.github/workflows/ci-frontend.yml) | Pull requests (e pushes na `main`) que alterem `frontend/`, `backend/`, o `compose.yaml` ou o `Makefile` | `Biome, Vitest, Build e Playwright`: `npm ci`, Biome (lint e formatação), Vitest, build com verificação de tipos e `make e2e` (stack completa no Docker Compose) |

O workflow do front-end também roda quando o back-end muda, porque o E2E usa a stack completa. Se
o E2E falhar, o relatório do Playwright fica disponível como artefato da execução.

## Comandos do Makefile

Rode `make help` para ver a lista no terminal.

**Docker**

| Comando | Descrição |
|---|---|
| `make up` | Sobe os containers (`db`, `api` e `frontend`) em background |
| `make up-build` / `make rebuild` | Reconstrói as imagens e sobe os containers |
| `make down` | Para e remove os containers (os dados ficam no volume) |
| `make build` | Constrói as imagens |
| `make ps` | Lista o status dos containers |
| `make logs` | Acompanha os logs de todos os serviços |
| `make logs-api` | Acompanha os logs da API |
| `make shell` | Abre um terminal dentro do container da API |
| `make db-shell` | Abre o `psql` dentro do container do banco |
| `make docker-clean` | Remove containers e volumes (**apaga os dados do banco**) |

**Back-end**

| Comando | Descrição |
|---|---|
| `make install` | Instala as dependências (Poetry) |
| `make run` | Sobe a API fora do Docker, usando o banco do Compose |
| `make test` | Executa os testes |
| `make test-verbose` | Executa os testes com saída detalhada |
| `make coverage` | Executa os testes com cobertura (terminal e `backend/htmlcov/index.html`) |
| `make test-postgres` | Executa os testes num PostgreSQL descartável (Docker), como no CI |
| `make lint` | Executa o linter (Ruff) |
| `make format` | Formata o código (Ruff); o CI falha se o código não estiver formatado |
| `make clean` | Remove artefatos de build e cache |
| `make setup-hooks` | Ativa os git hooks do projeto (valida as mensagens de commit) |

**Front-end**

| Comando | Descrição |
|---|---|
| `make frontend-install` | Instala as dependências (`npm ci`) |
| `make frontend-dev` | Sobe o servidor de desenvolvimento (Vite) |
| `make frontend-lint` | Executa o lint (Biome) |
| `make frontend-format` | Formata o código (Biome) |
| `make frontend-check` | Lint + verificação da formatação, sem alterar arquivos |
| `make frontend-test` | Testes unitários e de integração (Vitest + Testing Library) |
| `make frontend-coverage` | Os mesmos testes com cobertura (terminal e `frontend/coverage/index.html`) |
| `make frontend-test-e2e` | Playwright contra uma stack já no ar (`E2E_BASE_URL`) |
| `make frontend-build` | Verificação de tipos (TypeScript) e build de produção |

**Full-stack** (exigem Docker)

| Comando | Descrição |
|---|---|
| `make e2e` | E2E numa stack isolada (`nexopdv-e2e`): sobe, testa e apaga tudo |
| `make check-all` | Back-end (Ruff + Pytest), front-end (Biome, Vitest, build) e `make e2e` |

As migrations estão em [Banco de dados e migrations](#banco-de-dados-e-migrations).

## Referência da API

Documentação interativa em <http://localhost:8000/docs>. Os erros de regra de negócio (`404` e
`409`) trazem a mensagem em português no `detail`; os `422` seguem o formato padrão do FastAPI.

### CORS

O painel (`localhost:5173`) e a API (`localhost:8000`) são origens diferentes, então a API
autoriza explicitamente as origens de `CORS_ORIGINS`, só com os métodos que o painel usa (`GET`,
`POST`, `PUT` e `DELETE`) e o cabeçalho `Content-Type`. Nada de `"*"`. O CORS é uma regra do
navegador: não substitui autenticação.

### Produtos

Os dados ficam no PostgreSQL (tabela `products`) e continuam lá depois de reiniciar a API.

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
  "price": "49.90",
  "min_stock": 10
}
```

- `name`: obrigatório, de 1 a 120 caracteres (espaços nas pontas são removidos).
- `description`: opcional, até 500 caracteres; vazia vira `null`.
- `barcode`: string com um GTIN-8, 12, 13 ou 14 e dígito verificador válido. É único entre
  todos os produtos, inclusive os removidos, e `7891000315507` e `07891000315507` são o mesmo
  código.
- `price`: número ou string, maior que zero, até 2 casas decimais e até 999999.99. Na resposta,
  sai sempre como string com duas casas (`"49.90"`).
- `min_stock`: opcional, inteiro de 0 a 99.999 (padrão 0). Veja [Estoque](#estoque).

A resposta traz também o estoque: `stock_quantity` (saldo), `min_stock`, `shortfall` (quanto falta
para o mínimo) e `stock_status` (`out_of_stock`, `restock` ou `ok`). O saldo não entra pelo
cadastro: se enviado, é ignorado.

No `PATCH`, todos os campos são opcionais, mas ao menos um precisa ser enviado. `null` só é aceito
em `description` (remove a descrição). O painel usa o `PUT` para editar; o `PATCH` fica para
outros clientes da API.

Parâmetros da listagem: `page` (≥ 1, padrão 1), `size` (de 1 a 100, padrão 20), `name` (parte do
nome, sem diferenciar maiúsculas e acentos), `restock=true` (só os produtos abaixo do mínimo) e
`sort` (`newest`, padrão, do mais recente para o mais antigo; `name`, alfabética; `shortfall`,
maior falta primeiro). A resposta é `{"items": [...], "total": 25, "page": 1, "size": 20}`.

| Status | Quando | Corpo |
|---|---|---|
| `404` | Produto inexistente ou removido | `{"detail": "Produto não encontrado"}` |
| `409` | Código de barras já pertence a outro produto | `{"detail": "Código de barras já cadastrado"}` |
| `422` | Dado inválido no corpo, no caminho ou na consulta | `{"detail": [{"loc": [...], "msg": "...", "type": "..."}]}` |

O `DELETE` não apaga o registro: o produto some das consultas e da listagem, mas o código de
barras continua reservado. Nenhuma operação recusada altera o catálogo.

### Estoque

Cada produto tem um **saldo** (`stock_quantity`) e um **estoque mínimo** (`min_stock`). O saldo
só muda por **movimentações**, que ficam num histórico que não se edita nem se apaga (tabela
`stock_movements`); o cadastro do produto nunca altera o saldo.

| Método | Rota | Sucesso | Descrição |
|---|---|---|---|
| `POST` | `/products/{product_id}/stock/entries` | 201 | Entrada de mercadoria: `{"quantity": 24, "note": "NF 1234"}` |
| `POST` | `/products/{product_id}/stock/adjustments` | 201 | Ajuste com sinal e motivo: `{"quantity": -2, "reason": "Avaria"}` |
| `GET` | `/products/{product_id}/stock/movements?page=1&size=20` | 200 | Histórico, da movimentação mais recente para a mais antiga |
| `GET` | `/stock/summary` | 200 | Produtos para repor, sem estoque e valor do estoque a preço de venda |

Regras:

- Entrada: quantidade inteira de 1 a 99.999; observação opcional, até 200 caracteres.
- Ajuste: quantidade inteira com sinal (positiva adiciona, negativa retira), de 1 a 99.999 para
  mais ou para menos; motivo obrigatório, de 3 a 200 caracteres.
- O saldo nunca fica negativo nem passa de 999.999 unidades: a movimentação que faria isso é
  recusada com `409` (por exemplo, `"Saldo insuficiente: há 3 unidades em estoque"`), sem gravar
  nada.
- **Para repor** é ter saldo **menor** que o mínimo (mínimo 0 desliga o alerta); a falta é
  `mínimo − saldo`. Saldo 0 é **sem estoque**.
- Cada movimentação guarda o número dela no produto, o saldo resultante e o momento; a soma das
  movimentações é sempre igual ao saldo.

**Concorrência.** Duas movimentações no mesmo produto ao mesmo tempo (duas abas, dois caixas)
não podem se perder. O repositório faz cada uma numa transação só: `SELECT … FOR UPDATE` trava a
linha do produto, a regra do domínio decide com o saldo atual, e o novo saldo e a movimentação são
gravados juntos. A segunda transação espera a primeira terminar e já lê o saldo atualizado. O teste
de contrato prova isso com 50 entradas simultâneas, que somam exatamente 50; ele roda no
PostgreSQL (`make test-postgres` e CI), porque o SQLite dos testes locais ignora o `FOR UPDATE`.

A venda (abaixo) também baixa o saldo: cada item vendido vira uma movimentação do tipo `sale`,
com a quantidade negativa e o texto `"Venda nº 12"`.

### Vendas

A frente de caixa registra uma venda com um ou mais itens e um ou mais pagamentos, e baixa o
estoque de todos os itens **na mesma transação** (tabelas `sales`, `sale_items` e
`sale_payments`). Uma venda registrada não se edita nem se apaga.

| Método | Rota | Sucesso | Descrição |
|---|---|---|---|
| `POST` | `/sales` | 201 ou 200 | Registra a venda (201); se o mesmo `id` já foi registrado, devolve a venda existente (200) |
| `GET` | `/sales?page=1&size=20` | 200 | Vendas, da mais recente para a mais antiga, com itens e pagamentos |
| `GET` | `/sales/{sale_id}` | 200 | Uma venda |
| `GET` | `/sales/summary?start=…&end=…` | 200 | Vendas, faturamento e ticket médio das vendas com `start ≤ momento < end` (datas ISO com fuso) |

Corpo de `POST /sales`:

```json
{
  "id": "0193a7c2-5f1e-7c3a-9d2b-1f4e6a8b0c11",
  "items": [{ "product_id": "…", "quantity": 2, "unit_price": "49.90" }],
  "payments": [
    { "method": "pix", "amount": "50.00" },
    { "method": "cash", "amount": "100.00" }
  ]
}
```

A resposta traz o `number` (nº legível, dado pelo banco), `occurred_at`, os itens com nome,
código, preço e subtotal do momento da venda, os pagamentos, `total`, `paid`, `change` (troco) e
`item_count`. Valores em dinheiro saem como string com duas casas.

Regras:

- De 1 a 100 itens distintos, de 1 a 999 unidades cada, total de até R$ 999.999,99.
- De 1 a 5 pagamentos: `cash` (dinheiro), `pix`, `credit_card` ou `debit_card`.
- A soma dos pagamentos cobre o total; **só o dinheiro gera troco** (o que não é dinheiro não passa
  do total, e o troco é menor que o valor em dinheiro). Senão, `422` no campo `payments`.
- `409` quando algum item não pode ser vendido, com todos os problemas de uma vez em `problems`:
  produto fora do catálogo (`unavailable`), preço diferente do que o caixa mostrou
  (`price_changed`, com o `current_price`) ou saldo insuficiente (`insufficient_stock`, com o
  `available`). Nada é gravado.

**Idempotência.** O `id` da venda é criado pelo painel quando a venda começa. Se a resposta se
perde (queda de conexão) e o painel tenta de novo, a API devolve a venda já registrada, sem
registrar outra e sem baixar o estoque de novo. É a mesma base que a sincronização dos caixas
offline vai usar.

**Concorrência.** A venda trava as linhas de todos os seus produtos (`SELECT … FOR UPDATE`) **em
ordem de id**: duas vendas com os mesmos produtos em ordens diferentes esperam uma pela outra em
vez de se travarem mutuamente. Com 20 unidades e 25 vendas simultâneas de 1 unidade, exatamente
20 são registradas, 5 são recusadas e o saldo termina em 0 (teste de contrato no PostgreSQL).

## Próximos passos

Esta entrega cobre o catálogo, o estoque e uma venda mínima, sem login. O plano completo, com as
decisões e as perguntas em aberto, está em [.specify/memory/roadmap.md](.specify/memory/roadmap.md).
Em seguida vêm:

1. **Login e perfis** (Admin, Gerente e Operador): JWT, senhas com hash e rotas restritas por
   perfil.
2. **Turno de caixa** e o restante da venda: venda ligada ao operador e ao turno, desconto com
   aprovação do gerente e cancelamento.
3. **Clientes e crediário** e o **dashboard** do administrador.
4. **Caixa desktop que funciona sem internet** e sincroniza com o servidor quando a conexão
   volta, usando o `id` da venda criado no caixa para não duplicar vendas.
5. **Nota fiscal** por uma API fiscal parceira.
