# Contrato HTTP: mudanças da spec 007

**Feature**: [../spec.md](../spec.md) | **Contrato base**:
[spec 002 — `/products`](../../002-produtos/contracts/products-api.md)

O contrato da spec 002 continua valendo por inteiro, com as três mudanças abaixo. Os testes de
integração do back-end verificam cada uma.

---

## 1. Ordem de `GET /products`

| Antes (spec 002, FR-009) | Agora (spec 007, FR-005) |
|---|---|
| ordem de cadastro, do mais antigo para o mais novo | ordem de cadastro, **do mais novo para o mais antigo** |

Parâmetros, corpo da resposta (`ProductPageOutput`) e erros não mudam. A ordem continua estável:
percorrer as páginas devolve cada produto exatamente uma vez (SC-005 da 002). Um produto editado
(`PUT`) mantém a posição; só o cadastro define a ordem.

## 2. CORS

| Item | Antes (Prática 7) | Agora |
|---|---|---|
| Origens | `CORS_ORIGINS` (padrão: Vite local) | sem mudança |
| Métodos | `GET`, `POST` | `GET`, `POST`, `PUT`, `DELETE` |
| Cabeçalhos | `Content-Type` | sem mudança |
| Credenciais | não | sem mudança |

Comportamento verificado:

| Requisição | Origem | Resultado |
|---|---|---|
| preflight `OPTIONS /products/{id}` pedindo `PUT` | do front-end | 200, `access-control-allow-methods` inclui `PUT` |
| preflight `OPTIONS /products/{id}` pedindo `DELETE` | do front-end | 200, inclui `DELETE` |
| preflight pedindo `PATCH` | do front-end | 400 (método não usado pelo painel) |
| qualquer preflight | origem desconhecida | 400, sem `access-control-allow-origin` |

## 3. Recurso `/items` removido

| Antes (Prática 7) | Agora |
|---|---|
| `GET /items/`, `POST /items/` (laboratório) | não existem: **404** |
| tabela `items` no banco | removida por migração nova ([../data-model.md](../data-model.md) §6) |

Nenhum outro cliente usa `/items`: o único consumidor era o front-end do laboratório, que também
sai nesta spec.

## Operações que o painel usa

| Tela | Requisição | Respostas tratadas |
|---|---|---|
| Lista e busca | `GET /products?page={n}&size=10&name={termo}` | 200; falha de rede ou 5xx → estado de erro |
| Cadastro | `POST /products` com `ProductInput` | 201; 409 → campo código de barras; 422 → campo em `loc` |
| Edição | `PUT /products/{id}` com `ProductInput` completo | 200; 404 → "não existe mais"; 409; 422 |
| Remoção | `DELETE /products/{id}` | 204; 404 → "não existe mais" |

O painel não usa `GET /products/{id}`, `GET /products/barcode/{barcode}` nem `PATCH`; as rotas
continuam na API para outros clientes (e para o caixa, nas specs futuras).
