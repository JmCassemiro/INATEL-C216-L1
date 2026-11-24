# Contrato da interface: estoque

**Feature**: [../spec.md](../spec.md) | **Contrato base**:
[interface do painel de produtos](../../007-painel-produtos/contracts/ui.md) | **Identidade
visual**: [frontend/DESIGN.md](../../../frontend/DESIGN.md)

O que a interface promete a quem a usa, inclusive aos testes: rotas, nomes acessíveis e
comportamento. Os testes de integração (Testing Library) e o E2E (Playwright) acham os elementos
**pelo papel e pelo nome acessível** listados aqui. Tudo o que o contrato da 007 define continua
valendo; abaixo, só o que é novo ou muda.

---

## Rotas

| Endereço | Conteúdo |
|---|---|
| `/stock` | seção Estoque, todos os produtos ativos em ordem alfabética, página 1 |
| `/stock?view=restock` | só os produtos para repor, maior falta primeiro |
| `/stock?search=camis&page=2` | busca e página, como em `/products` |

O título da aba é "Estoque | NexoPDV". A trilha da barra superior mostra "Estoque".

## Menu lateral e seção Produtos

| Elemento | Papel e nome acessível |
|---|---|
| Seção Estoque no menu | `link` "Estoque" (`aria-current="page"` em `/stock`); deixa de ser "em breve". Com produtos para repor, mostra o número ao lado (oculto do leitor de tela, como a contagem de Produtos) |
| Indicador "Estoque" em Produtos | texto "Para repor" com o número; `link` "Ver lista de reposição" → `/stock?view=restock` |
| Coluna nova da lista de produtos | cabeçalho "Estoque"; célula com o saldo ("36 un.") e, se não estiver em dia, a pílula "Sem estoque" ou "Repor" |
| Campo novo do formulário de produto | `textbox` "Estoque mínimo (opcional)", com a descrição "Abaixo dessa quantidade, o produto entra na lista de reposição." |

## Seção Estoque

| Região | Papel e nome acessível |
|---|---|
| Título | `heading` nível 1 "Estoque" |
| Indicadores | `region` "Indicadores do estoque", com "Para repor", "Sem estoque" e "Valor em estoque" (este em reais, com o amarelo da etiqueta) |
| Visão | `group` "Mostrar", com os botões "Todos" e "Para repor" (`aria-pressed`) |
| Busca | `searchbox` "Buscar pelo nome" |
| Total | texto "{n} produto(s)" ou "{n} produto(s) para repor" |
| Lista | `table` "Estoque" (desktop) / `list` "Estoque" (celular), uma linha por produto |
| Colunas | Produto (nome e código de barras), Quantidade, Mínimo, Situação, Ações |
| Situação | texto "Sem estoque", "Repor · faltam {n}" ou "Em dia" (a cor nunca é a única pista) |
| Registrar entrada | `button` "Registrar entrada de {nome}" |
| Ajustar | `button` "Ajustar estoque de {nome}" |
| Histórico | `button` "Ver histórico de {nome}" |
| Ações no celular | `button` "Ações de {nome}" abre um menu com "Registrar entrada", "Ajustar estoque" e "Ver histórico" |
| Paginação | a mesma da seção Produtos (`navigation` "Paginação") |

Mensagens dos estados: "Carregando o estoque…" (esqueleto com esse nome acessível), "Não foi
possível carregar o estoque." + `button` "Tentar de novo", "Nenhum produto cadastrado ainda." +
`link` "Ir para Produtos", "Nenhum produto encontrado para “{termo}”." + `button` "Limpar busca",
"Nenhum produto precisa de reposição." (visão `restock`).

## Diálogo "Registrar entrada"

| Elemento | Papel e nome acessível |
|---|---|
| Diálogo | `dialog` "Registrar entrada", com o nome do produto e o saldo atual ("Saldo atual: 12 un.") |
| Quantidade | `textbox` "Quantidade" (`inputMode="numeric"`) |
| Observação | `textbox` "Observação (opcional)", com a descrição "Ex.: número da nota do fornecedor." |
| Confirmar | `button` "Registrar entrada" (durante o envio: desabilitado, "Registrando…") |
| Cancelar | `button` "Cancelar"; Esc também fecha sem gravar |

Sucesso: o diálogo fecha e aparece o aviso "Entrada registrada: {nome} agora tem {n} un.".

## Diálogo "Ajustar estoque"

| Elemento | Papel e nome acessível |
|---|---|
| Diálogo | `dialog` "Ajustar estoque", com o nome do produto |
| Direção | `radiogroup` "Tipo de ajuste", com os `radio` "Retirar" (marcado ao abrir) e "Adicionar" |
| Quantidade | `textbox` "Quantidade" |
| Prévia | `status` com o texto "Saldo: {atual} → {resultado}" (atualizado ao digitar; some com a quantidade inválida) |
| Motivo | `textbox` "Motivo", com a descrição "Ex.: avaria, vencimento, contagem de inventário." |
| Confirmar | `button` "Salvar ajuste" (durante o envio: desabilitado, "Salvando…") |
| Cancelar | `button` "Cancelar"; Esc também fecha |

Sucesso: "Ajuste salvo: {nome} agora tem {n} un.". Saldo insuficiente (no navegador ou devolvido
pelo servidor): a mensagem aparece junto ao campo "Quantidade".

## Histórico

| Elemento | Papel e nome acessível |
|---|---|
| Painel lateral | `dialog` "Histórico de {nome}", com o saldo atual |
| Lista | `table` "Movimentações" (desktop) / `list` "Movimentações" (celular) |
| Colunas | Data, Tipo ("Entrada" / "Ajuste"), Quantidade ("+24" / "−2"), Saldo, Observação |
| Vazio | "Nenhuma movimentação ainda." + `button` "Registrar entrada" |
| Paginação | `navigation` "Paginação do histórico" |

Não existe ação de editar ou apagar uma movimentação.

## Página de entrada do site

O recurso "Estoque com alerta" passa a aparecer como "Disponível", e o texto da seção de recursos
diz que o catálogo e o estoque já estão no ar.

## Teclado

Tudo acima é alcançável com Tab; os diálogos prendem o foco e o devolvem ao botão que os abriu
(como o formulário de produto da 007); Enter confirma o formulário; Esc fecha.
