# Quickstart: validar o painel de produtos

**Feature**: [spec.md](spec.md) | **Contratos**: [API](contracts/products-api-changes.md),
[interface](contracts/ui.md)

Roteiro para provar que a spec 007 funciona de ponta a ponta. Comandos rodados a partir da raiz
do repositório. Também serve de base para a demonstração do vídeo do Projeto Final.

## Pré-requisitos

- Docker Desktop rodando.
- `make install` (back-end) e `make frontend-install` (front-end) já executados.
- `.env` copiado de `.env.example`. Se houver um PostgreSQL local ocupando a 5432, use
  `POSTGRES_PORT=5433`.

## 1. Verificações automatizadas

| Comando | O que prova | Esperado |
|---|---|---|
| `make test` | regras e API do back-end, incluindo ordem decrescente, CORS e ausência de `/items` | tudo verde |
| `make lint` e `make format` | Ruff | sem erros, nada a formatar |
| `make frontend-check` | Biome (lint e formatação) | sem erros |
| `make frontend-test` | Vitest + Testing Library + MSW: estados, formulário, remoção, URL | tudo verde |
| `make frontend-build` | verificação de tipos (TS estrito) e build | sem erros |
| `make e2e` | Playwright contra a stack real isolada (`nexopdv-e2e`) | fluxo completo verde; a stack é apagada no final |

## 2. Subir o sistema

```bash
make up-build
```

Abrir `http://localhost:5173` → redireciona para `/products`. A API responde em
`http://localhost:8000/docs`.

## 3. Roteiro manual (espelha as histórias da spec)

| # | Passo | Resultado esperado |
|---|---|---|
| 1 | Com o banco vazio, abrir o painel | "Nenhum produto cadastrado ainda." e o botão "Cadastrar produto" (US1-6) |
| 2 | "Novo produto": Camiseta Básica Branca M, 7891000315507, 49,90 | a prévia mostra a etiqueta com as barras; ao cadastrar, toast "Produto cadastrado" e o produto no topo da lista, destacado (US2-1) |
| 3 | Recarregar a página (F5) | o produto continua lá (US2-2) |
| 4 | Cadastrar outro com o mesmo código | erro "Código de barras já cadastrado" no campo, dados mantidos (US2-4) |
| 5 | Digitar 7891000315508 no código | sem barras na prévia; ao enviar, "Confira os dígitos…" (US2-3) |
| 6 | Cadastrar uns 12 produtos e navegar | "Página 1 de 2", "Próxima página" funciona (US1-3) |
| 7 | Buscar "camis", ir à página 2 (se houver) e recarregar | mesma busca e página (US1-4, US1-8) |
| 8 | Buscar "xyz" | "Nenhum produto com “xyz”." e "Limpar busca" (US1-5) |
| 9 | Editar o preço para 54,90 | toast "Alterações salvas", preço novo na lista, também após recarregar (US3-2) |
| 10 | Remover o produto | diálogo com o nome e o aviso do código reservado; ao confirmar, toast "Produto removido" e o produto some, também após recarregar (US4-1, US4-2) |
| 11 | `docker compose stop api` e recarregar o painel | "Não foi possível carregar os produtos." com "Tentar de novo"; `docker compose start api` e "Tentar de novo" volta a lista (US1-7) |
| 12 | Trocar o tema na barra; recarregar | o tema escolhido continua (FR-019) |
| 13 | Largura de 360 px (DevTools) | lista empilhada, sem rolagem horizontal (FR-020) |
| 14 | Fazer o roteiro 2, 9 e 10 só com o teclado | foco visível; `Esc` fecha painel e diálogo (FR-021) |

## 4. Laboratório removido

| Verificação | Esperado |
|---|---|
| `curl -i http://localhost:8000/items/` | `404` |
| `make db-shell` e `\dt` | só `products` e `alembic_version` |
| Front-end | nenhuma tela de itens |

## 5. Encerrar

```bash
make down
```
