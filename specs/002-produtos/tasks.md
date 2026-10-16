---

description: "Tarefas da spec 002 — Cadastro de Produtos"
---

# Tasks: Cadastro de Produtos

**Input**: `specs/002-produtos/` — [plan.md](plan.md), [spec.md](spec.md),
[research.md](research.md), [data-model.md](data-model.md),
[contracts/products-api.md](contracts/products-api.md), [quickstart.md](quickstart.md)

**Tests**: obrigatórios (constituição, Princípio I). Cada tarefa de teste é um passo RED da skill
`python-tdd`: escrever, rodar e ver falhar **por asserção**. Se o módulo testado ainda não existe,
criar só o esboço (assinatura com `raise NotImplementedError` ou retorno vazio) para o teste rodar.
Cada tarefa de implementação é GREEN + REFACTOR e só termina com os testes dela e `make test`
verdes.

**Idioma**: identificadores de código (pastas, arquivos, classes, funções, atributos, nomes de
teste) e a API pública (rotas, campos JSON, parâmetros) em **inglês**; mensagens ao usuário (ex.:
`"Produto não encontrado"`), docstrings e documentação em **português** (research D15).

**Rastreabilidade**: o docstring de cada teste cita o requisito que cobre
(ex.: `"""FR-004: recusa dígito verificador inválido."""`).

**Comandos**: da raiz, `make test`, `make lint`, `make format`. Um arquivo só:
`cd backend && poetry run pytest tests/unit/domain/test_price.py`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem depender de tarefa incompleta)
- **[Story]**: história de usuário da tarefa (US1 a US4)
- Caminhos relativos à raiz do repositório

---

## Phase 1: Setup

**Purpose**: confirmar o ponto de partida e criar os pacotes das camadas.

- [X] T001 Confirmar a linha de base na branch `002-produtos`: `make test` (38 testes verdes) e `make lint` sem erros, antes de qualquer mudança
- [X] T002 Criar os pacotes das camadas com `__init__.py` vazio, como os pacotes atuais: `backend/app/domain/`, `backend/app/application/`, `backend/app/application/ports/`, `backend/app/application/services/`, `backend/app/infrastructure/`, `backend/app/infrastructure/repositories/` e `backend/app/api/schemas/`; e as pastas de teste `backend/tests/unit/domain/`, `backend/tests/unit/application/` e `backend/tests/unit/infrastructure/` (sem `__init__.py`: o pytest usa `--import-mode=importlib`)

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**: núcleo de domínio usado por todas as histórias (erros, value objects, entidade),
composição da aplicação e retirada do CRUD da Prática 4.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase terminar.

### Regra de dependência

- [X] T003 [P] Escrever `backend/tests/unit/test_architecture.py` (D14, Princípio V): um verificador que lê com `ast` os imports de um módulo e acusa `fastapi`, `pydantic`, `starlette`, `app.api` e `app.infrastructure`; um teste prova que ele acusa um código-fonte com `import fastapi` e `from app.infrastructure.repositories import x` (RED enquanto o verificador não acusa nada); outro percorre todos os `.py` de `backend/app/domain/` e `backend/app/application/` e exige zero violações

### Erros de domínio

- [X] T004 [P] Testes em `backend/tests/unit/domain/test_errors.py` (FR-017): `InvalidDataError(field, message)` é `DomainError` e `ValueError`, expõe `field` (pode ser `None`, erro do corpo inteiro) e usa a mensagem em `str()`; `ProductNotFoundError` é `NotFoundError` com mensagem `"Produto não encontrado"`; `DuplicateBarcodeError` é `ConflictError` com mensagem `"Código de barras já cadastrado"`; `InvalidDataError`, `NotFoundError` e `ConflictError` não herdam umas das outras
- [X] T005 Implementar `backend/app/domain/errors.py` conforme o data-model: `DomainError` → `InvalidDataError(DomainError, ValueError)`, `NotFoundError`, `ConflictError`; `ProductNotFoundError(NotFoundError)` e `DuplicateBarcodeError(ConflictError)`

### Value objects

- [X] T006 [P] Testes em `backend/tests/unit/domain/test_barcode.py` (FR-004, D6): aceita GTIN-8 `96385074`, UPC-A `012345678905`, EAN-13 `7891000315507` e GTIN-14 `07891000315507`; recusa `7891000315508` (dígito verificador), letras, espaços, string vazia e comprimentos 7, 9, 10, 11 e 15, sempre com `InvalidDataError` de `field == "barcode"`; `value` preserva o código como informado; `gtin14` completa com zeros à esquerda até 14 dígitos; `Barcode("7891000315507") == Barcode("07891000315507")` e os dois têm o mesmo `hash`; é imutável
- [X] T007 Implementar `backend/app/domain/barcode.py`: `dataclass(frozen=True, slots=True)` com `value: str`; regra "Só dígitos; 8, 12, 13 ou 14 dígitos; dígito verificador módulo 10 GS1 válido" (excluído o verificador, pesos 3 e 1 alternados a partir da direita; verificador = `(10 - weighted_sum % 10) % 10`); propriedade `gtin14`; igualdade e `hash` pela forma `gtin14`
- [X] T008 [P] Testes em `backend/tests/unit/domain/test_price.py` (FR-003, D5): aceita `Decimal("49.90")`, `"49.9"` e `50`; normaliza para 2 casas (`Price("49.9").value == Decimal("49.90")` e `str(Price("49.9").value) == "49.90"`); aceita `"999999.99"`; recusa `0`, `-1`, `"10.999"`, `1000000`, `float` (`49.9`), `"NaN"`, `"Infinity"` e texto não numérico, sempre com `InvalidDataError` de `field == "price"`; é imutável
- [X] T009 Implementar `backend/app/domain/price.py`: `dataclass(frozen=True, slots=True)` com `value: Decimal`; regra "`> 0`; no máximo 2 casas decimais; `≤ 999999.99`; normalizado para 2 casas"; aceita `Decimal`, `int` ou `str` e recusa `float`

### Entidade

- [X] T010 [P] Testes em `backend/tests/unit/domain/test_product.py` (FR-001, FR-002): `normalize_name` remove espaços das pontas e aceita de 1 a 120 caracteres; recusa `""`, `"   "` e 121 caracteres com `InvalidDataError` de `field == "name"`; `normalize_description` devolve `None` para `None`, `""` e `"   "`, remove espaços das pontas, aceita 500 e recusa 501 caracteres (`field == "description"`); `Product.create(name, description, barcode, price)` recebe tipos primitivos, gera `id` UUID versão 7, normaliza nome e descrição, constrói `Barcode` e `Price`, nasce com `removed_at is None` e `is_active is True`; dois produtos novos têm ids diferentes; atribuir um campo lança `FrozenInstanceError`
- [X] T011 Implementar `backend/app/domain/product.py`: funções `normalize_name` e `normalize_description`; entidade `Product` como `dataclass(frozen=True, slots=True)` com `id: UUID`, `name: str`, `description: str | None`, `barcode: Barcode`, `price: Price` e `removed_at: datetime | None = None`; propriedade `is_active`; fábrica `create` com `uuid.uuid7()`

### Composição da aplicação e retirada do CRUD da Prática 4

- [X] T012 Retirar o CRUD da Prática 4, que as histórias refazem: apagar `backend/app/services/`, `backend/app/schemas/`, `backend/app/api/routes/produtos.py`, `backend/tests/unit/test_produto_service.py` e `backend/tests/integration/test_produtos_api.py`; esvaziar `backend/app/api/dependencies.py` (volta na US1); tirar o router de produtos de `backend/app/main.py`; simplificar a fixture `client` de `backend/tests/integration/conftest.py` para `TestClient(app)`; confirmar `make test` verde
- [X] T013 Testes em `backend/tests/integration/test_app.py` (D8, D12, FR-017): `create_app()` devolve uma nova instância de `FastAPI` a cada chamada; numa aplicação criada por ela, rotas de teste que levantam `ProductNotFoundError`, `DuplicateBarcodeError`, `InvalidDataError("price", "...")` e `InvalidDataError(None, "...")` respondem 404 `{"detail": "Produto não encontrado"}`, 409 `{"detail": "Código de barras já cadastrado"}`, 422 com `detail[0]["loc"] == ["body", "price"]` (com `msg` e `type`) e 422 com `loc == ["body"]`; `GET /` responde pela aplicação criada
- [X] T014 Implementar `backend/app/api/error_handlers.py` (exception handlers por categoria: `NotFoundError` → 404 e `ConflictError` → 409 com `{"detail": str(error)}`; `InvalidDataError` → 422 com `{"detail": [{"loc": ["body", field], "msg": message, "type": "value_error"}]}`, ou `["body"]` sem campo) e reescrever `backend/app/main.py` com `create_app()`, que cria o FastAPI, inclui o router `home` e registra os handlers, mais `app = create_app()` no fim do módulo (Dockerfile e Makefile continuam em `app.main:app`); trocar a fixture `client` de `backend/tests/integration/conftest.py` para `with TestClient(create_app()) as c: yield c`

**Checkpoint**: domínio pronto e testado; a aplicação sobe só com `GET /`; `make test` verde.

---

## Phase 3: User Story 1 - Cadastrar um produto e encontrá-lo pelo código de barras (Priority: P1) 🎯 MVP

**Goal**: cadastrar produto e consultá-lo por id e por código de barras, com validação e código
único (FR-001 a FR-008, FR-017).

**Independent Test**: cadastrar um produto e consultá-lo pelo id e pelo código de barras, obtendo
os dados informados.

### Repositório

- [X] T015 [P] [US1] Criar a porta em `backend/app/application/ports/product_repository.py`: `Protocol` `ProductRepository` com `add(product: Product) -> None`, `get_by_id(product_id: UUID) -> Product | None` e `get_by_barcode(barcode: Barcode) -> Product | None`, com docstrings do contrato do data-model (leituras devolvem só ativos; `add` levanta `DuplicateBarcodeError` "se o `gtin14` já pertence a qualquer produto")
- [X] T016 [P] [US1] Testes em `backend/tests/unit/infrastructure/test_in_memory_product_repository.py` (FR-005, FR-006, FR-007, SC-001, SC-002, SC-004): `add` e depois `get_by_id` devolve o mesmo produto; id desconhecido → `None`; `get_by_barcode` acha pelo mesmo código e pela forma equivalente com zero à esquerda; `add` com GTIN já usado (inclusive na forma equivalente) levanta `DuplicateBarcodeError` e não grava nada; 20 threads sincronizadas por `threading.Barrier` adicionando produtos com o mesmo código → exatamente 1 sucesso e 19 `DuplicateBarcodeError`; com 10.000 produtos, `get_by_barcode` responde em menos de 1 s (`time.perf_counter`)
- [X] T017 [US1] Implementar `InMemoryProductRepository` em `backend/app/infrastructure/repositories/in_memory_product_repository.py` (D9): `dict[UUID, Product]` (preserva a ordem de cadastro) e índice `dict[str, UUID]` por `gtin14`, com todas as operações sob um `threading.Lock`; `add` verifica e grava de forma atômica; leituras devolvem só produtos ativos

### Caso de uso

- [X] T018 [P] [US1] Criar `ProductData` em `backend/app/application/commands.py`: `dataclass(frozen=True, slots=True)` com `name: str`, `description: str | None`, `barcode: str` e `price: Decimal`
- [X] T019 [US1] Testes em `backend/tests/unit/application/test_product_service.py`, com o `InMemoryProductRepository` real (Princípio V; FR-001 a FR-008, FR-017): `create(ProductData)` devolve o produto com id e dados normalizados; `get(id)` devolve o produto; id desconhecido → `ProductNotFoundError`; `get_by_barcode("7891000315507")` e `("07891000315507")` devolvem o produto; código válido não cadastrado → `ProductNotFoundError`; código inválido → `InvalidDataError` (`field == "barcode"`); cadastro com código repetido → `DuplicateBarcodeError`; nome `"   "`, preço `0` e código `7891000315508` → `InvalidDataError` com o campo certo, sem gravar nada
- [X] T020 [US1] Implementar `ProductService` em `backend/app/application/services/product_service.py` (D2, D13): construtor `(repository: ProductRepository, clock: Callable[[], datetime] = <agora em UTC>)`; métodos `create`, `get` e `get_by_barcode`; sem checagem prévia de unicidade (quem garante é o repositório)

### Borda HTTP

- [X] T021 [US1] Testes da US1 em `backend/tests/integration/test_products_api.py` (contrato; FR-001 a FR-008, FR-017, RP-001 a RP-005): `POST /products` → 201, corpo `{id, name, description, barcode, price}` com `price == "49.90"` e cabeçalho `Location: /products/{id}`; `GET /products/{id}` → 200 com os mesmos dados; `GET /products/barcode/7891000315507` e `/07891000315507` → 200; `POST` repetido → 409 `{"detail": "Código de barras já cadastrado"}` e o catálogo não muda; `POST` inválido → 422 com o campo em `loc`, parametrizado (sem `name`, `name` `"   "`, `name` com 121 caracteres, `description` com 501, `price` `0`, `-1`, `10.999` e `1000000`, `barcode` `7891000315508` e como número JSON); dois campos inválidos → os dois aparecem em `detail`; UUID desconhecido → 404; `GET /products/abc` → 422; `GET /products/barcode/7891000315508` → 422; código válido não cadastrado → 404; duas aplicações de `create_app()` não compartilham o catálogo
- [X] T022 [US1] Implementar os schemas em `backend/app/api/schemas/product.py` (D7): `ProductInput` (`name`; `description` com padrão `None`; `barcode` como string estrita; `price` como `Decimal`), com `AfterValidator` chamando `normalize_name`, `normalize_description`, `Barcode` e `Price` do domínio, e `to_command() -> ProductData`; `ProductOutput` (`id`, `name`, `description`, `barcode` como cadastrado, `price` como string com duas casas) com `from_entity(product)`
- [X] T023 [US1] Ligar a composição: em `backend/app/main.py`, `create_app()` passa a criar `InMemoryProductRepository()` em `app.state.product_repository` e a incluir o router de produtos; em `backend/app/api/dependencies.py`, `get_product_repository(request)` lê `request.app.state.product_repository` e `get_product_service` monta o `ProductService` com ele via `Depends`
- [X] T024 [US1] Implementar as rotas em `backend/app/api/routes/products.py`: `POST /products` (201 + `Location`), `GET /products/{product_id}` (`UUID`) e `GET /products/barcode/{barcode}` (validado pelo domínio → 422), sem `try/except`

**Checkpoint**: MVP: cadastro e consulta funcionam de ponta a ponta; `make test` verde.

---

## Phase 4: User Story 2 - Listar e buscar produtos (Priority: P2)

**Goal**: listagem paginada com total e busca por nome sem diferenciar maiúsculas e acentos
(FR-009 a FR-011).

**Independent Test**: cadastrar alguns produtos e verificar o tamanho de página, o percurso
completo sem repetir nem pular produtos e o filtro por nome.

- [X] T025 [P] [US2] Criar `backend/app/application/pagination.py` com `Page[T]` (`dataclass(frozen=True, slots=True)`: `items: list[T]`, `total: int`, `page: int`, `size: int`), `DEFAULT_PAGE_SIZE = 20` e `MAX_PAGE_SIZE = 100`; acrescentar à porta em `backend/app/application/ports/product_repository.py` o método `list(offset: int, limit: int, name: str | None) -> tuple[list[Product], int]` (ativos, em ordem de cadastro, com o total filtrado)
- [X] T026 [P] [US2] Testes de `list` em `backend/tests/unit/infrastructure/test_in_memory_product_repository.py` (FR-009, FR-010, SC-005): devolve só ativos, em ordem de cadastro, com o total; `offset` e `limit` recortam a lista; `offset` além do fim → lista vazia com o total; `name="calca"` acha "Calça Jeans 40" e "calça moletom" e não acha "Camiseta Básica"; filtro e paginação juntos (total = quantidade filtrada); `name` `None` ou `""` = sem filtro
- [X] T027 [US2] Implementar `list` em `backend/app/infrastructure/repositories/in_memory_product_repository.py`, sob o lock, comparando por substring o nome normalizado (Unicode NFKD, sem marcas de acento, `casefold`) (D11)
- [X] T028 [US2] Testes de `list(page, size, name)` em `backend/tests/unit/application/test_product_service.py` (FR-009, SC-005): devolve `Page` com `items`, `total`, `page` e `size`; com 25 produtos e páginas de 10 → 10, 10 e 5 itens, cada produto exatamente uma vez e em ordem de cadastro; página além da última → `items` vazio com `total == 25`
- [X] T029 [US2] Implementar `list` em `backend/app/application/services/product_service.py` (`offset = (page - 1) * size`)
- [X] T030 [US2] Testes da US2 em `backend/tests/integration/test_products_api.py` (FR-009 a FR-011, RP-002): `GET /products` sem parâmetros usa `page=1` e `size=20`; com 25 produtos e `size=10` → 10 itens e `total == 25`; percorrer as páginas devolve os 25 uma única vez; `?name=calca` → os dois produtos de calça; catálogo vazio → 200 com `items == []` e `total == 0`; `size=0`, `-1` e `101` e `page=0` → 422; `size=100` → 200
- [X] T031 [US2] Implementar `ProductPageOutput` em `backend/app/api/schemas/product.py` e a rota `GET /products` em `backend/app/api/routes/products.py`, com `page` (`Query(ge=1)`, padrão 1), `size` (`Query(ge=1, le=MAX_PAGE_SIZE)`, padrão `DEFAULT_PAGE_SIZE`) e `name: str | None = None`

**Checkpoint**: US1 e US2 funcionam de forma independente; `make test` verde.

---

## Phase 5: User Story 3 - Atualizar o cadastro de um produto (Priority: P3)

**Goal**: substituir (PUT) e alterar parcialmente (PATCH), com as mesmas validações e a mesma
unicidade do cadastro (FR-012 a FR-015).

**Independent Test**: cadastrar um produto, alterá-lo de forma completa e parcial, e conferir pela
consulta que só os dados esperados mudaram.

- [X] T032 [P] [US3] Testes em `backend/tests/unit/domain/test_product.py` (FR-012, FR-015): `updated(name, description, barcode, price)` devolve nova instância com o mesmo `id` e todos os dados novos, sem alterar a original; aplica as mesmas normalizações e validações de `create` (`InvalidDataError` com o campo certo)
- [X] T033 [US3] Implementar `updated` em `backend/app/domain/product.py` (via `dataclasses.replace`, reaplicando as normalizações e construindo `Barcode` e `Price`)
- [X] T034 [P] [US3] Testes de `update` em `backend/tests/unit/infrastructure/test_in_memory_product_repository.py` (FR-005, FR-015, SC-002): substitui o registro de mesmo id e mantém a posição na ordem de cadastro; manter o próprio código é permitido; trocar para o código de outro produto levanta `DuplicateBarcodeError` e nenhum dos dois muda; ao trocar de código, o antigo fica livre (`get_by_barcode` dele → `None`) e o novo passa a achar o produto
- [X] T035 [US3] Acrescentar `update(product: Product) -> None` à porta em `backend/app/application/ports/product_repository.py` e implementá-lo em `backend/app/infrastructure/repositories/in_memory_product_repository.py`, de forma atômica sob o lock e atualizando o índice por `gtin14`
- [X] T036 [US3] Testes em `backend/tests/unit/application/test_product_service.py` (FR-012 a FR-015, FR-017): `replace(id, ProductData)` troca todos os dados e mantém o id; `update(id, ProductChanges(price=Decimal("44.90")))` muda só o preço; `ProductChanges(description=None)` remove a descrição; alteração com todos os campos `UNSET` → `InvalidDataError`; id desconhecido → `ProductNotFoundError` nos dois métodos; código de outro produto → `DuplicateBarcodeError` e o produto não muda
- [X] T037 [US3] Criar `UNSET` e `ProductChanges` em `backend/app/application/commands.py` (os quatro campos de `ProductData`, cada um com padrão `UNSET`) e implementar `replace` e `update` em `backend/app/application/services/product_service.py` (`update` combina os campos informados com os valores atuais e chama `updated`)
- [X] T038 [US3] Testes da US3 em `backend/tests/integration/test_products_api.py` (FR-012 a FR-015, FR-017, RP-001): `PUT` → 200 com os dados novos e o mesmo id; `PUT` sem `price` → 422 e o produto não muda; `PATCH {"price": "44.90"}` → só o preço muda; `PATCH {"description": null}` e `{"description": ""}` → produto sem descrição; `PATCH {}` → 422; `PATCH {"name": null}` → 422; `PATCH` com valores inválidos → 422 e nada muda; `PUT` e `PATCH` com o código de outro produto → 409 e nada muda; `PUT` e `PATCH` em id desconhecido → 404
- [X] T039 [US3] Implementar `ProductChangesInput` em `backend/app/api/schemas/product.py` (campos opcionais com os mesmos `AfterValidator`; `null` recusado em `name`, `barcode` e `price`; corpo sem nenhum campo recusado; `to_command()` usa `model_fields_set` para montar `ProductChanges` com `UNSET` nos campos omitidos) e as rotas `PUT /products/{product_id}` e `PATCH /products/{product_id}` em `backend/app/api/routes/products.py`

**Checkpoint**: US1 a US3 funcionam; `make test` verde.

---

## Phase 6: User Story 4 - Remover um produto do catálogo (Priority: P4)

**Goal**: remoção por inativação, com o registro mantido e o código de barras reservado (FR-016,
FR-016a).

**Independent Test**: cadastrar, remover e confirmar que o produto não é mais encontrado por id,
por código de barras nem na listagem, e que o código continua reservado.

- [X] T040 [P] [US4] Testes em `backend/tests/unit/domain/test_product.py` (FR-016, FR-016a): `removed(at)` devolve nova instância com `removed_at == at`, `is_active is False` e o mesmo id; `removed` e `updated` sobre produto já removido levantam `ProductNotFoundError`
- [X] T041 [US4] Implementar `removed(at)` e a recusa de operar sobre produto removido em `backend/app/domain/product.py`
- [X] T042 [P] [US4] Testes em `backend/tests/unit/infrastructure/test_in_memory_product_repository.py` (FR-005, FR-016, D9): depois de `update` com o produto removido, `get_by_id` e `get_by_barcode` devolvem `None` e `list` não o inclui nem o conta; `add` outro produto com o mesmo código → `DuplicateBarcodeError` (código reservado); `update` com uma versão ativa de um produto guardado como removido → `ProductNotFoundError`, e ele continua removido
- [X] T043 [US4] Implementar em `backend/app/infrastructure/repositories/in_memory_product_repository.py` a recusa de `update` sobre registro removido
- [X] T044 [US4] Testes em `backend/tests/unit/application/test_product_service.py` (FR-016, FR-016a), com relógio fixo injetado: `remove(id)` devolve o produto com `removed_at` igual ao momento do relógio; depois, `get`, `get_by_barcode`, `replace`, `update` e um novo `remove` levantam `ProductNotFoundError`; `create` com o mesmo código → `DuplicateBarcodeError`
- [X] T045 [US4] Implementar `remove` em `backend/app/application/services/product_service.py`, usando o relógio injetado
- [X] T046 [US4] Testes da US4 em `backend/tests/integration/test_products_api.py` (FR-016, FR-016a, RP-001): `DELETE` → 204 sem corpo; depois, `GET` por id e por código → 404 e a listagem não o mostra; `DELETE` repetido → 404; `PUT` e `PATCH` → 404; `POST` com o mesmo código → 409; `DELETE /products/abc` → 422; `DELETE` de UUID desconhecido → 404
- [X] T047 [US4] Implementar a rota `DELETE /products/{product_id}` (204) em `backend/app/api/routes/products.py`

**Checkpoint**: todas as histórias funcionam; `make test` verde.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T048 [P] Atualizar a seção da API de produtos em `README.md` conforme `specs/002-produtos/contracts/products-api.md` (rotas, parâmetros, exemplo de corpo, erros)
- [X] T049 [P] Atualizar a seção "Estrutura" de `CLAUDE.md` (a convenção de idioma já foi registrada em "Regras"): `backend/app/` com as camadas `domain/`, `application/`, `infrastructure/` e `api/`, e `main.py` com `create_app()`
- [X] T050 Renomear para inglês as funções de teste das Práticas anteriores em `backend/tests/unit/test_home.py` e `backend/tests/integration/test_home_api.py` (ex.: `test_home_responde_com_status_200` → `test_home_returns_status_200`), sem mudar o que elas verificam
- [X] T051 Rodar `make format`, `make lint` e `make test`; conferir que nenhum `float` ficou no caminho do preço e que `test_architecture.py` percorre todos os módulos de `domain/` e `application/`
- [X] T052 Validar o roteiro manual de `specs/002-produtos/quickstart.md` (passos 1 a 14) com `make run`
- [X] T053 Regressão Docker (RP-008): `make up`, `curl http://localhost:8000/` e um `POST /products`, depois `make down`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup; **bloqueia todas as histórias**.
  - T005 (erros) antes de T006–T011, que usam `InvalidDataError`.
  - T007 e T009 (value objects) antes de T010–T011 (entidade).
  - T012 (retirada do CRUD) antes de T013–T014, para a suíte continuar verde.
- **US1 (Phase 3)**: depende da Fundação.
- **US2, US3 e US4 (Phases 4–6)**: dependem da US1, que cria a porta, o repositório, o serviço, os
  schemas e o arquivo de rotas que elas estendem — e porque não há como listar, alterar ou remover
  sem cadastrar. Entre si, são independentes em comportamento, mas tocam os mesmos arquivos; por
  isso rodam em sequência (P2 → P3 → P4).
- **US4** reaproveita `update` da US3 (T035) para gravar a remoção.
- **Polish (Phase 7)**: depende de todas as histórias.

### Within Each User Story

- Teste (RED) antes da implementação que ele cobre; camada por camada: domínio → repositório →
  serviço → borda HTTP.
- Uma tarefa de implementação só é marcada `[X]` com os testes dela e `make test` verdes.

### Parallel Opportunities

- Fundação: T003, T004, T006, T008 e T010 são arquivos de teste distintos (T006–T010 depois de
  T005).
- US1: T015, T016 e T018 (porta, testes do repositório, comando).
- US2: T025 e T026.
- US3: T032 e T034.
- US4: T040 e T042.
- Polish: T048, T049 e T050.

---

## Parallel Example: User Story 1

```bash
# Depois da Fundação, em paralelo:
Task: "T015 Criar a porta ProdutoRepository em backend/app/application/ports/produto_repository.py"
Task: "T016 Testes do repositório em memória em backend/tests/unit/infrastructure/test_produto_memoria.py"
Task: "T018 Criar DadosProduto em backend/app/application/comandos.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Fases 1 e 2 (Setup + Fundação).
2. Fase 3 (US1): cadastrar e consultar por id e por código de barras.
3. **Parar e validar**: `make test` e os passos 1 a 6 do `quickstart.md`.

### Incremental Delivery

1. Setup + Fundação → domínio testado, aplicação no ar só com `GET /`.
2. US1 → cadastro e consulta (MVP).
3. US2 → listagem e busca.
4. US3 → PUT e PATCH.
5. US4 → DELETE por inativação; a partir daqui os requisitos da Prática 4 (RP-001: todos os
   métodos HTTP) voltam a ser atendidos por completo.
6. Polish → documentação, validação manual e regressão Docker.

---

## Notes

- Entre a T012 e a T047 a API fica temporariamente sem parte das rotas de produtos da Prática 4; a
  branch só vai para PR com todas as fases concluídas.
- Branch, commit, push e PR ficam fora destas tarefas (constituição, "Fora do Escopo").
