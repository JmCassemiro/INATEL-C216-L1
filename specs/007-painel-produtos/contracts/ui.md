# Contrato da interface: painel de produtos

**Feature**: [../spec.md](../spec.md) | **Identidade visual**:
[frontend/DESIGN.md](../../../frontend/DESIGN.md)

O que a interface promete a quem a usa, inclusive aos testes: rotas, nomes acessíveis e
comportamento do teclado. Os testes de integração (Testing Library) e o E2E (Playwright) acham
os elementos **pelo papel e pelo nome acessível** listados aqui, nunca por classe CSS ou
`data-testid`. Mudar um nome desta tabela é mudar o contrato.

---

## Rotas

| Endereço | Conteúdo |
|---|---|
| `/` | redireciona para `/products` |
| `/products` | seção de produtos, primeira página, sem busca |
| `/products?search=camis` | busca "camis", primeira página |
| `/products?search=camis&page=2` | busca "camis", página 2 |
| qualquer outra | redireciona para `/products` |

O título da aba é "Produtos | NexoPDV".

## Estrutura da página

| Região | Papel e nome acessível |
|---|---|
| Barra superior | `banner`, com o link `NexoPDV` (vai para `/products`) |
| Navegação de seções | `navigation` "Seções", com o link "Produtos" (`aria-current="page"`) |
| Troca de tema | `button` "Usar tema escuro" / "Usar tema claro" |
| Conteúdo | `main`, com o título `heading` nível 1 "Produtos" |
| Total | texto "{n} produto(s) no catálogo" ou "{n} produto(s) encontrado(s)" com busca |
| Novo produto | `button` "Novo produto" |
| Busca | `searchbox` "Buscar pelo nome" |
| Lista | `table` "Produtos" (desktop) / `list` "Produtos" (celular), uma linha por produto |
| Preço | texto com nome acessível "R$ 49,90" (as partes visuais ficam ocultas) |
| Editar | `button` "Editar {nome do produto}" |
| Remover | `button` "Remover {nome do produto}" |
| Paginação | `navigation` "Paginação", com `button` "Página anterior" e "Próxima página" e o texto "Página {p} de {n}" |

## Estados da lista

| Estado | O que aparece |
|---|---|
| Carregando | `status` "Carregando produtos" com esqueletos das linhas |
| Catálogo vazio | "Nenhum produto cadastrado ainda." + `button` "Cadastrar produto" |
| Busca sem resultado | "Nenhum produto com “{termo}”." + `button` "Limpar busca" |
| Erro ao carregar | `alert` "Não foi possível carregar os produtos." + `button` "Tentar de novo" |

## Formulário (painel lateral)

| Elemento | Papel e nome acessível |
|---|---|
| Painel | `dialog` "Novo produto" ou "Editar produto" |
| Prévia | `figure` "Prévia da etiqueta"; código válido desenhado como `img` "Código de barras {dígitos}" |
| Nome | `textbox` "Nome" |
| Descrição | `textbox` "Descrição (opcional)" |
| Código de barras | `textbox` "Código de barras" (`inputmode="numeric"`) |
| Preço | `textbox` "Preço de venda" (`inputmode="decimal"`, prefixo visual "R$") |
| Erro de campo | texto ligado ao campo por `aria-describedby`, campo com `aria-invalid="true"` |
| Erro geral | `alert` dentro do painel |
| Enviar | `button` "Cadastrar produto" / "Salvar alterações"; desabilitado durante o envio |
| Cancelar | `button` "Cancelar" |

## Remoção

| Elemento | Papel e nome acessível |
|---|---|
| Confirmação | `alertdialog` "Remover {nome}?" |
| Confirmar | `button` "Remover produto"; desabilitado durante o envio |
| Cancelar | `button` "Cancelar" |

## Retorno das ações (toasts)

| Ação | Mensagem |
|---|---|
| Cadastro | "Produto cadastrado" |
| Edição | "Alterações salvas" |
| Remoção | "Produto removido" |
| Produto sumiu | "Este produto não existe mais. A lista foi atualizada." |

## Teclado (FR-021)

- `Tab` percorre: logo, seção, tema, "Novo produto", busca, ações de cada linha, paginação.
- Abrir o painel lateral ou o diálogo leva o foco ao primeiro campo (ou ao "Cancelar", na
  remoção); `Esc` fecha; ao fechar, o foco volta ao botão que abriu.
- `Enter` num campo do formulário envia.
- Todo elemento focado tem contorno visível (`--ring`, Tinta).
