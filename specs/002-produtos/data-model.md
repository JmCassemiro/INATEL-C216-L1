# Data Model: Cadastro de Produtos

**Feature**: [spec.md](spec.md) | **Decisões**: [research.md](research.md)

Modelo da camada de domínio. Os schemas da API ([contracts/](contracts/products-api.md)) são
derivados daqui e nunca o contrário.

---

## Value object `Barcode`

Código GTIN de um produto (FR-004). Imutável; inválido não existe.

| Atributo | Tipo | Regra |
|---|---|---|
| `value` | `str` | Como foi informado. Só dígitos; 8, 12, 13 ou 14 dígitos; dígito verificador módulo 10 GS1 válido. |
| `gtin14` | `str` (derivado) | `value` com zeros à esquerda até 14 dígitos. |

- **Igualdade**: dois códigos são iguais quando `gtin14` é igual (D6). `7891000315507` e
  `07891000315507` são o mesmo código.
- **Dígito verificador**: excluído o último dígito, multiplicar os dígitos por 3 e 1 alternados a
  partir da direita, somar; o verificador é `(10 - weighted_sum % 10) % 10`.
  Ex.: `7891000315507` → soma 73 → verificador 7 (válido); `7891000315508` é inválido.
- **Erro**: `InvalidDataError(field="barcode")`.

## Value object `Price`

Preço de venda em reais (FR-003). Imutável.

| Atributo | Tipo | Regra |
|---|---|---|
| `value` | `Decimal` | `> 0`; no máximo 2 casas decimais; `≤ 999999.99`; normalizado para 2 casas. |

- Aceita `Decimal`, `int` ou `str` na criação; `float` é recusado no domínio (a borda converte o
  número do JSON sem passar por `float`).
- **Erro**: `InvalidDataError(field="price")`.

## Regras de nome e descrição

Funções puras do domínio, usadas pela entidade e reaproveitadas pelos schemas (D7):

| Função | Regra | Erro |
|---|---|---|
| `normalize_name(text)` | Remove espaços das pontas; resultado com 1 a 120 caracteres. | `InvalidDataError(field="name")` |
| `normalize_description(text | None)\| None)` | Remove espaços das pontas; vazio vira `None`; até 500 caracteres. | `InvalidDataError(field="description")` |

## Entidade `Product`

`dataclass(frozen=True, slots=True)` (D10).

| Atributo | Tipo | Regra |
|---|---|---|
| `id` | `UUID` | UUID v7, gerado na criação (D4). Nunca muda. |
| `name` | `str` | Normalizado por `normalize_name`. Não é único. |
| `description` | `str \| None` | Normalizada por `normalize_description`. |
| `barcode` | `Barcode` | Único entre **todos** os produtos, inclusive removidos (FR-005). |
| `price` | `Price` | — |
| `removed_at` | `datetime \| None` | `None` enquanto ativo; momento (UTC) da remoção depois. |

- **Derivado**: `is_active` = `removed_at is None`.
- **Fábrica**: `Product.create(name, description, barcode, price)` gera o id e aplica as
  normalizações.
- **Transformações** (devolvem nova instância, mesmo `id`):
  - `updated(name, description, barcode, price)` — recebe o cadastro completo e aplica as
    mesmas normalizações de `create`. Serve ao PUT (FR-012) e ao PATCH (FR-013, FR-014): no PATCH,
    o serviço de aplicação combina os campos informados com os valores atuais antes de chamar
    `updated`, porque distinguir "campo omitido" de "campo nulo" é assunto da entrada da
    aplicação, não do domínio.
  - `removed(at)` — DELETE (FR-016).
  - As duas recusam operar sobre produto já removido (`ProductNotFoundError`).

### Ciclo de vida

```text
          create()                removed(at)
 (nada) ─────────► ATIVO ───────────────────────► REMOVIDO
                   │  ▲                          (terminal nesta spec:
                   └──┘ updated()                 sem reativação; o código
                                                  de barras segue reservado)
```

- **ATIVO**: aparece em consultas e listagens; pode ser substituído, alterado e removido.
- **REMOVIDO**: invisível para consultas, listagens, substituição, alteração e nova remoção (tudo
  responde "não encontrado", FR-016/FR-016a); o registro e o código de barras continuam guardados.

## Erros de domínio

```text
DomainError
├── InvalidDataError(field, message)   [também é ValueError]   → 422 (field None = corpo inteiro)
├── NotFoundError                                              → 404
│   └── ProductNotFoundError
└── ConflictError                                              → 409
    └── DuplicateBarcodeError
```

O mapeamento para HTTP fica na borda (D8); o domínio não conhece status codes.

## Camada de aplicação

### Comandos de entrada (dataclasses, sem Pydantic)

| Comando | Campos | Uso |
|---|---|---|
| `ProductData` | `name: str`, `description: str \| None`, `barcode: str`, `price: Decimal` | cadastrar, substituir |
| `ProductChanges` | os mesmos quatro campos, cada um podendo ser `UNSET` | alterar parcialmente |

`UNSET` é um sentinela que separa "campo não enviado" de "campo enviado como nulo" (só a
descrição aceita nulo). Uma alteração com todos os campos `UNSET` é recusada
(`InvalidDataError`, FR-013).

### Resultado paginado

`Page[T]` (dataclass genérica): `items: list[T]`, `total: int`, `page: int`, `size: int`.
Constantes: `DEFAULT_PAGE_SIZE = 20`, `MAX_PAGE_SIZE = 100`.

### Porta `ProductRepository` (`Protocol`)

| Método | Contrato |
|---|---|
| `add(product)` | Grava produto novo. `DuplicateBarcodeError` se o `gtin14` já pertence a qualquer produto. |
| `update(product)` | Substitui o registro de mesmo `id`. `DuplicateBarcodeError` se o código pertence a outro produto; `ProductNotFoundError` se o registro guardado já está removido. |
| `get_by_id(id)` | Produto **ativo** com esse id, ou `None`. |
| `get_by_barcode(barcode)` | Produto **ativo** com esse GTIN (comparação por `gtin14`), ou `None`. |
| `list(offset, limit, name)` | `(items, total)` dos produtos **ativos**, em ordem de cadastro, filtrados por nome (substring, sem diferenciar maiúsculas e acentos). |

Verificação e gravação são atômicas em cada implementação (D9).
