# Research: Cadastro de Produtos

**Feature**: [spec.md](spec.md) | **Plano**: [plan.md](plan.md) | **Data**: 2026-10-05

Decisões técnicas tomadas antes do design. Cada uma registra o que foi escolhido, por quê e o que
foi descartado (constituição, Princípio IV). Nenhum item do Technical Context ficou em aberto.

---

## D1 — Organização em camadas

- **Decisão**: quatro pacotes dentro de `backend/app/`, um por camada da Clean Architecture:
  `domain/` (entidade, value objects, erros), `application/` (serviço de casos de uso, porta do
  repositório, comandos de entrada), `infrastructure/` (repositório em memória) e `api/` (rotas,
  schemas Pydantic, tratamento de erros, composição das dependências). O `main.py` só cria a
  aplicação.
- **Por quê**: é o que a constituição exige (Princípio V) e torna visível a regra de dependência:
  `api` e `infrastructure` importam `application` e `domain`; o contrário nunca acontece. Os
  schemas saem de `app/schemas/` e vão para `app/api/schemas/`, porque são DTOs da borda HTTP
  (adaptadores de interface), não modelos do sistema.
- **Alternativas descartadas**:
  - *Manter `routes/ schemas/ services/` sem domínio*: é o que a Prática 4 entregou; as regras
    (GTIN, preço, unicidade) ficariam espalhadas entre Pydantic e serviço, acopladas ao framework.
  - *Organizar por feature* (`app/products/{domain,application,...}`): faz sentido com muitos
    módulos; com um único agregado, só adicionaria um nível de pasta. Reavaliar quando houver
    vendas, turnos e usuários.

## D2 — Casos de uso: um serviço de aplicação por agregado

- **Decisão**: uma classe `ProductService` em `application/`, com um método por caso de uso
  (`create`, `get`, `get_by_barcode`, `list`, `replace`, `update`,
  `remove`), recebendo o repositório pelo construtor.
- **Por quê**: os sete casos de uso são curtos e dependem da mesma porta. Uma classe por caso de
  uso geraria sete classes e sete provedores de dependência sem ganho concreto hoje. O sufixo
  `Service` mantém a continuidade com a Prática 4 e com a estrutura da aula ("services"). Quando um caso de uso crescer (ex.: registrar venda, que orquestra estoque,
  turno e pagamento), ele ganha classe própria.
- **Alternativas descartadas**: *uma classe por caso de uso* (`CadastrarProduto`, ...) —
  SRP mais estrito, mas burocrático para um CRUD; *regras dentro das rotas* — viola o
  Princípio V.

## D3 — Porta do repositório como `typing.Protocol`

- **Decisão**: `ProductRepository` é um `Protocol` em `application/ports/`. A implementação
  `InMemoryProductRepository` (infraestrutura) o satisfaz por estrutura, sem herdar dele.
- **Por quê**: inversão de dependência (o "D" do SOLID) sem acoplamento por herança; qualquer
  objeto com os mesmos métodos serve, inclusive o futuro repositório PostgreSQL. O ruff e o
  type checker continuam enxergando o contrato.
- **Alternativas descartadas**: *`abc.ABC`* — funciona, mas força herança e não traz nada a
  mais aqui; *sem porta* (serviço usando o dicionário direto) — impede trocar o armazenamento na
  Prática de banco sem reescrever os casos de uso.

## D4 — Identificador: UUID v7 gerado pelo domínio

- **Decisão**: o id do produto é um `UUID` versão 7 (`uuid.uuid7()`, disponível na stdlib do
  Python 3.14), gerado pela própria entidade ao ser criada. Na API, aparece como string UUID no
  caminho (`/products/{product_id}`); formato inválido gera 422 (edge case da spec).
- **Por quê**:
  - A entidade nasce com identidade, sem depender do armazenamento para numerar (regra de
    dependência).
  - O NexoPDV é offline-first (roadmap C-04, C-10): ids gerados em qualquer ponto não colidem na
    sincronização, e o roadmap já usa UUID para vendas — mantém um padrão único.
  - O v7 é ordenado pelo tempo de criação: no PostgreSQL, vira índice B-tree sem fragmentação
    (diferente do v4, aleatório), e a ordem dos ids acompanha a ordem de cadastro.
  - Ids sequenciais expõem o tamanho do catálogo e permitem enumeração.
- **Alternativas descartadas**: *int sequencial* (Prática 4) — exige um contador central, que
  não existe offline; *UUID v4* — aleatório, ruim como chave de índice.
- **Impacto**: muda o contrato da Prática 4 (`id` deixa de ser inteiro). A Prática 4 já foi
  entregue; os testes de produtos dela são reescritos para o novo contrato.

## D5 — Preço: value object `Price` sobre `Decimal`

- **Decisão**: o domínio representa o preço com o value object `Price`, que guarda um
  `Decimal` e garante as regras da FR-003: maior que zero, no máximo duas casas decimais, até
  999.999,99. O valor é normalizado para duas casas (`49.9` → `49.90`).
  Na API, a entrada aceita número ou string (`49.90` ou `"49.90"`) e a saída é sempre **string
  com duas casas** (`"49.90"`).
- **Por quê**: `float` não representa centavos com exatidão (roadmap, nota sobre valores
  monetários). String na saída evita que clientes JavaScript convertam o valor para `float` ao
  ler o JSON. O value object concentra as regras num só lugar e será reutilizado pelo item de
  venda (spec 004).
- **Verificado**: o Pydantic 2.13 aceita número e string para `Decimal` e serializa como string,
  mas sem fixar as casas (`"49.9"`); por isso a normalização fica no value object.
- **Alternativas descartadas**: *centavos em inteiro* — exato, mas espalha conversões por toda a
  borda e deixa o JSON menos legível; *`float`* — proibido pela nota do roadmap.

## D6 — Código de barras: value object `Barcode` (GTIN)

- **Decisão**: o value object `Barcode` valida o padrão GTIN (FR-004): só dígitos, com 8,
  12, 13 ou 14 dígitos, e dígito verificador correto pelo algoritmo módulo 10 do GS1 (pesos 3 e 1
  alternados da direita para a esquerda). Guarda o código como foi informado (é o que está
  impresso na etiqueta) e expõe a forma canônica de 14 dígitos (`gtin14`, com zeros à esquerda).
  **Dois códigos são o mesmo GTIN quando a forma de 14 dígitos é igual**: a unicidade e a busca
  usam essa forma.
- **Por quê**: o GS1 define que todo GTIN, alinhado à direita num campo de 14 dígitos, é único.
  Um UPC-A (`012345678905`) e o mesmo código lido como EAN-13 (`0012345678905`) são o mesmo
  produto — leitores diferentes devolvem formas diferentes, e o cadastro precisa tratá-las como
  iguais (FR-005, SC-001). No JSON, o código é sempre string: zeros à esquerda importam.
- **Alternativas descartadas**: *comparar a string exata* — permitiria dois cadastros do mesmo
  produto; *guardar só a forma de 14 dígitos* — o lojista veria um código diferente do que
  digitou.

## D7 — Validação: regras no domínio, reaproveitadas pelos schemas

- **Decisão**: o domínio é a única fonte das regras de conteúdo (nome, descrição, código de
  barras, preço). Os schemas Pydantic validam estrutura e tipos e chamam as mesmas funções e
  value objects do domínio através de `AfterValidator`. O erro de domínio `InvalidDataError` herda de
  `ValueError`, então o Pydantic o converte em erro de validação comum, com o campo no `loc`.
- **Por quê**: nenhuma regra fica duplicada; o cliente recebe todos os campos inválidos de uma
  vez, no formato 422 padrão do FastAPI (SC-003); e o domínio continua impedindo um produto
  inválido de existir, venha a chamada da API ou de outro ponto (sincronização, importação). Os
  schemas podem importar o domínio porque a dependência aponta para dentro.
- **Alternativas descartadas**: *regras repetidas em `Field(...)` e no domínio* — duas fontes da
  verdade; *validar só no domínio e traduzir na borda* — o cliente veria só o primeiro erro e o
  RP-003 (validação por modelo Pydantic) ficaria fraco.

## D8 — Erros de domínio por categoria e tradução na borda

- **Decisão**: hierarquia em `domain/errors.py`: `DomainError` → `InvalidDataError` (com `field`),
  `NotFoundError`, `ConflictError`; erros concretos herdam delas (`ProductNotFoundError`,
  `DuplicateBarcodeError`). Exception handlers registrados na criação da aplicação traduzem por
  categoria: `NotFoundError` → 404, `ConflictError` → 409, `InvalidDataError` → 422 (no mesmo formato da
  validação do FastAPI). As rotas não têm `try/except`.
- **Por quê**: atende a FR-017 (categorias distintas) e é aberto para extensão: erros das
  próximas specs só escolhem a categoria e já saem com o status certo (Open/Closed). O domínio
  não conhece HTTP.
- **Alternativas descartadas**: *`HTTPException` dentro do serviço* — acopla a aplicação ao
  FastAPI (proibido pelo Princípio V); *`try/except` em cada rota* (Prática 4) — repetição.

## D9 — Unicidade e concorrência: garantidas pelo repositório

- **Decisão**: o repositório em memória mantém um índice `gtin14 → id` e faz verificação e
  gravação de forma atômica, sob um `threading.Lock`. `add` e `update` levantam
  `DuplicateBarcodeError` quando o código pertence a outro produto, inclusive removido. O serviço
  **não** verifica a unicidade antes de gravar. `update` também recusa gravar sobre um produto
  já removido (levanta `ProductNotFoundError`), para que uma alteração concorrente com uma remoção
  não "ressuscite" o produto.
- **Por quê**: as rotas síncronas do FastAPI rodam em threads, então dois cadastros podem
  acontecer ao mesmo tempo (edge case da spec). Verificar no serviço e depois gravar gera condição
  de corrida (*check-then-act*). Deixar a regra no armazenamento reproduz o que a constraint
  `UNIQUE` fará no PostgreSQL, sem mudar o serviço. O lock cobre também as leituras, porque
  iterar um dicionário enquanto outra thread grava pode falhar (e o Python 3.14 tem build sem
  GIL).
- **Alternativas descartadas**: *verificar no serviço* — corrida; *rotas `async` sem `await`* —
  serializa por acaso, não por garantia, e bloqueia o event loop; *controle de versão otimista
  (ETag)* — resolve alterações concorrentes no mesmo produto, mas está fora do escopo da spec
  (última gravação vence).

## D10 — Entidade imutável

- **Decisão**: `Product` é uma `dataclass(frozen=True, slots=True)`. Alterar, substituir e remover
  produzem uma nova instância (`dataclasses.replace`), que o serviço entrega ao repositório.
- **Por quê**: o repositório em memória guarda referências. Com entidade mutável, o serviço
  alteraria o objeto guardado antes da verificação de unicidade e, em caso de conflito, o
  catálogo já estaria modificado, violando a FR-017 ("operação recusada deixa o catálogo
  inalterado"). Com instâncias imutáveis, nada muda até o repositório aceitar a gravação.
- **Alternativas descartadas**: *entidade mutável com cópia defensiva no repositório* — funciona,
  mas depende de disciplina em toda implementação de repositório.

## D11 — Paginação por página e busca sem acento

- **Decisão**: `GET /products?page=1&size=20&name=calca`. `page` ≥ 1 (padrão 1), `size`
  entre 1 e 100 (padrão 20), `name` opcional. Resposta em envelope
  `{items, total, page, size}`; página além da última devolve `items` vazio. Os limites são
  constantes da camada de aplicação, usadas pelos `Query(...)` da rota. A busca compara o nome
  normalizado (Unicode NFKD sem marcas de acento + `casefold`) por substring; o repositório em
  memória aplica essa normalização (no PostgreSQL será `unaccent` + `ILIKE`). Ordem: de cadastro.
- **Por quê**: a spec define página, tamanho e total (FR-009, FR-011), e o painel (spec 007) vai
  mostrar páginas numeradas. Os nomes seguem a convenção de idioma da API (D15).
- **Alternativas descartadas**: *`limit`/`offset`* — expõe detalhe de armazenamento ao cliente;
  *paginação por cursor* — melhor para listas enormes e sincronização, mas não oferece total nem
  salto de página, que a spec pede.

## D12 — Composição: fábrica `create_app()` e `app.state`

- **Decisão**: `main.py` expõe `create_app()`, que cria o FastAPI, registra rotas e exception
  handlers e cria o repositório em memória em `app.state`. `app = create_app()` continua sendo o
  alvo do Uvicorn (Dockerfile e Makefile não mudam). Em `api/dependencies.py`, um provedor lê o
  repositório de `request.app.state` e outro monta o `ProductService`.
- **Por quê**: cada chamada de `create_app()` gera uma aplicação com catálogo próprio, então os
  testes de integração ficam isolados sem `dependency_overrides` nem variável global de módulo. Na
  Prática de banco, o mesmo ponto passa a criar o engine (via `lifespan`).
- **Alternativas descartadas**: *instância global de módulo* (Prática 4) — estado compartilhado
  entre testes, exige override; *`lifespan` já agora* — só se paga quando houver recurso para
  abrir e fechar.

## D13 — Relógio injetável

- **Decisão**: `ProductService` recebe um `clock: Callable[[], datetime]` com padrão
  `datetime.now(UTC)`, usado para preencher `removed_at`.
- **Por quê**: os testes fixam o momento da remoção sem *monkeypatch*. Uma função basta; uma
  interface `Relogio` seria abstração sem ganho (Princípio IV).

## D14 — Regra de dependência verificada por teste

- **Decisão**: um teste unitário lê (com `ast`) os módulos de `app/domain` e `app/application` e
  falha se algum importar `fastapi`, `pydantic`, `starlette`, `app.api` ou `app.infrastructure`.
- **Por quê**: transforma a regra de dependência da constituição em verificação executada a cada
  CI, sem nova dependência.
- **Alternativas descartadas**: *`import-linter`* — mais completo, mas é uma ferramenta a mais
  para uma regra que cabe em um teste.

## D15 — Idioma: código em inglês, textos ao usuário em português

- **Decisão**: identificadores de código (pastas, arquivos, classes, funções, atributos, nomes de
  teste) e a API pública (rotas, campos do JSON, parâmetros de consulta) em **inglês**. Mensagens
  que chegam ao usuário final (ex.: `"Produto não encontrado"`), docstrings, comentários e
  documentação ficam em **português**. Os testes das Práticas anteriores são renomeados para
  inglês.
- **Por quê**: inglês é o padrão de mercado para código e APIs: casa com as palavras-chave do
  Python e com as bibliotecas, e facilita a leitura por qualquer pessoa que avalie o projeto. O
  usuário do NexoPDV, porém, é brasileiro: o que ele lê continua em português.
- **Alternativas descartadas**: *tudo em português* (como na Prática 4) — mistura idiomas com
  Python e FastAPI (`get`, `list`, `Service`); *mensagens em inglês* — o lojista não é o público.
- **Impacto**: mais uma mudança de contrato em relação à Prática 4 (`/produtos` → `/products`,
  `nome` → `name` etc.), já registrada no [contrato](contracts/products-api.md).

## Sem novas dependências

Tudo usa a stdlib (`uuid`, `decimal`, `dataclasses`, `threading`, `unicodedata`, `ast`) e o que
já está no projeto (FastAPI 0.141, Pydantic 2.13, pytest, ruff). Princípio III atendido sem
justificativa adicional.
