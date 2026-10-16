# INATEL C216 L1

Projeto da disciplina C216 (Sistemas Distribuídos), entregue em Práticas incrementais:
cada Prática acrescenta funcionalidades ao mesmo sistema.

O sistema é o **NexoPDV**: ERP e frente de caixa híbrido, offline-first, para lojas de varejo
físico. A visão completa está em `docs/product/visao.md`; as specs planejadas, as decisões e as
perguntas em aberto estão em `.specify/memory/roadmap.md`. Antes de especificar uma feature,
consulte a entrada correspondente no roadmap.

## Comandos

Rodar a partir da raiz do repositório:

- `make install` — instala as dependências do back-end (Poetry)
- `make test` — roda os testes (pytest)
- `make lint` — verifica o código (`ruff check`)
- `make format` — formata o código (`ruff format`); o CI falha se o código não estiver formatado
- `make up` / `make down` — sobe/derruba a API e o PostgreSQL (Docker Compose)

Uma mudança só está pronta com `make test` e `make lint` passando e o código formatado.

## Regras

- **TDD obrigatório**, inclusive fora do Spec Kit: teste falhando antes do código, seguindo
  a skill `python-tdd`.
- Os princípios completos estão em `.specify/memory/constitution.md` e valem para qualquer
  mudança.
- Tudo o que o PDF da Prática pede é obrigatório. Extras são permitidos, mas nunca no lugar
  do que foi pedido.
- O código Python segue a skill `python-patterns`.
- **Idioma:** código e API pública em **inglês**: pastas, arquivos, classes, funções, atributos,
  nomes de teste, rotas, campos do JSON e parâmetros. Em **português** ficam as mensagens que
  chegam ao usuário final (ex.: `"Produto não encontrado"`), docstrings, comentários,
  documentação e specs.
- Mensagens de commit seguem Conventional Commits, em português (validado pelo hook em
  `.githooks/`, ativado com `make setup-hooks`).

## Fluxo

- Features maiores: Spec Kit, `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` →
  `/speckit-implement`. Os artefatos ficam em `specs/`.
- Mudanças pequenas: direto com TDD, sem spec.
- Branch, commit, push e PR são feitos à parte, depois da implementação.

## Estrutura

- `backend/app/` — API em Clean Architecture, com dependências apontando para dentro:
  `domain/` (entidades, value objects, erros), `application/` (casos de uso, portas, comandos),
  `infrastructure/` (repositórios) e `api/` (rotas, schemas, tratamento de erros, dependências).
  `main.py` só tem `create_app()`, que compõe a aplicação.
- `backend/tests/` — `unit/` (por camada, mais a regra de dependência) e `integration/`
  (`TestClient`)
- `docs/product/visao.md` — documento de visão do NexoPDV
- `specs/` — spec, plano e tarefas de cada feature
- `.specify/` — constituição, roadmap, templates e scripts do Spec Kit
