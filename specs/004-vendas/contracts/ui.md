# Contrato da interface: vendas

**Feature**: [../spec.md](../spec.md) | **Contratos base**:
[painel de produtos](../../007-painel-produtos/contracts/ui.md),
[estoque](../../011-estoque/contracts/ui.md) | **Identidade visual**:
[frontend/DESIGN.md](../../../frontend/DESIGN.md)

O que a interface promete a quem a usa, inclusive aos testes: rotas, nomes acessíveis e
comportamento. Os testes (Testing Library e Playwright) acham os elementos **pelo papel e pelo nome
acessível** listados aqui. O que os contratos da 007 e da 011 definem continua valendo.

---

## Rotas

| Endereço | Conteúdo | Título da aba |
|---|---|---|
| `/sales/new` | nova venda | "Nova venda \| NexoPDV" |
| `/sales` | histórico, página 1, com os indicadores do dia | "Vendas \| NexoPDV" |
| `/sales?page=2` | histórico, página 2 | "Vendas \| NexoPDV" |

## Menu lateral

| Elemento | Papel e nome acessível |
|---|---|
| Grupo novo | rótulo "Frente de caixa", acima de "Retaguarda" |
| Nova venda | `link` "Nova venda" → `/sales/new` |
| Vendas | `link` "Vendas" → `/sales` (deixa de ser "em breve") |

## Nova venda

| Região | Papel e nome acessível |
|---|---|
| Título | `heading` nível 1 "Nova venda" |
| Leitura | `textbox` "Código de barras" (foco ao abrir a tela), com a descrição "Leia com o leitor ou digite e tecle Enter."; `button` "Adicionar" |
| Busca | `searchbox` "Buscar pelo nome"; resultados numa `list` "Produtos encontrados", cada um com o nome, o preço, o saldo e o `button` "Adicionar {nome}" |
| Aviso da leitura | `status` "Leitura" com "{nome} adicionado", "Produto não encontrado", "{nome} está sem estoque" ou "Há só {n} un. de {nome} em estoque" |
| Carrinho | `table` "Itens da venda" (desktop) / `list` "Itens da venda" (celular): Produto (nome e código), Preço, Quantidade, Subtotal, Ações |
| Quantidade | `textbox` "Quantidade de {nome}" (`inputMode="numeric"`), com `button` "Diminuir {nome}" e "Aumentar {nome}" |
| Remover | `button` "Remover {nome}" |
| Problema do item | texto junto à linha: "Preço atualizado", "Há só {n} un." ou "Fora do catálogo" |
| Vazio | "Nenhum item ainda. Leia o código de barras do primeiro produto." |
| Total | `region` "Resumo da venda": "Itens: {n} un." e "Total", com o valor na etiqueta amarela |
| Meio | `radiogroup` "Meio de pagamento": `radio` "Dinheiro" (marcado ao abrir), "Pix", "Cartão de crédito", "Cartão de débito" |
| Valor | `textbox` "Valor" (`inputMode="decimal"`), preenchido com o que falta pagar |
| Adicionar pagamento | `button` "Adicionar pagamento"; erro de regra junto ao campo "Valor" |
| Pagamentos | `list` "Pagamentos", cada um com o meio, o valor e o `button` "Remover pagamento {meio} de R$ {x}" |
| Situação | `status` "Situação do pagamento": "Falta pagar R$ {x}", "Troco: R$ {x}" ou "Pagamento completo", mais a regra quebrada quando os itens mudam depois do pagamento |
| Finalizar | `button` "Finalizar venda" (desabilitado até a venda poder ser finalizada; durante o envio, "Finalizando…") |
| Recusa ou falha | `alert` com a mensagem do servidor ou "Sem conexão com o servidor." |
| Descartar | `button` "Descartar venda" → `alertdialog` "Descartar a venda?" com `button` "Descartar" e "Continuar vendendo" |

Atalhos: Enter no código adiciona; Enter no valor adiciona o pagamento. Depois de cada leitura, o
campo de código fica limpo e com o foco.

### Comprovante

| Elemento | Papel e nome acessível |
|---|---|
| Diálogo | `dialog` "Venda nº {n} registrada", com data e hora, itens (quantidade × nome, subtotal), pagamentos, total e troco |
| Nova venda | `button` "Nova venda" (foco ao abrir): fecha, esvazia o carrinho e devolve o foco ao código |
| Histórico | `link` "Ver vendas" → `/sales` |

## Vendas (histórico)

| Região | Papel e nome acessível |
|---|---|
| Título | `heading` nível 1 "Vendas"; `link` "Nova venda" → `/sales/new` |
| Indicadores | `region` "Indicadores de hoje": "Vendas hoje", "Faturamento hoje" e "Ticket médio hoje" (valores em reais com o amarelo da etiqueta) |
| Total | texto "{n} venda(s)" |
| Lista | `table` "Vendas realizadas" (desktop) / `list` "Vendas realizadas" (celular): Venda ("nº 12"), Data, Itens ("3 un."), Pagamento ("Pix + Dinheiro"), Total, Ações |
| Detalhe | `button` "Ver venda nº {n}" abre o painel lateral |
| Paginação | `navigation` "Paginação" (a mesma das outras seções) |

Estados: "Carregando as vendas…" (esqueleto com esse nome), "Não foi possível carregar as vendas." +
`button` "Tentar de novo", "Nenhuma venda registrada ainda." + `link` "Registrar a primeira venda".

### Detalhe

| Elemento | Papel e nome acessível |
|---|---|
| Painel lateral | `dialog` "Venda nº {n}", com data e hora |
| Itens | `list` "Itens" ("{n} × {nome}", preço unitário, código e subtotal), o mesmo bloco do comprovante |
| Pagamentos | `list` "Pagamentos" (meio e valor) |
| Totais | "Total", "Pago", "Troco" |

Não existe ação de editar, cancelar ou apagar uma venda.

## Histórico de movimentações (seção Estoque)

O tipo "Venda" aparece ao lado de "Entrada" e "Ajuste", com a quantidade negativa ("−2") e o texto
"Venda nº {n}".

## Página de entrada do site

O recurso "Frente de caixa" passa a aparecer como "Disponível".

## Teclado

Tudo acima é alcançável com Tab; diálogos e painéis prendem o foco e o devolvem a quem os abriu; Esc
fecha. A venda inteira pode ser feita sem mouse: código + Enter, Tab até "Valor", Enter, Tab até
"Finalizar venda", Enter.
