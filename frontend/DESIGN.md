---
name: NexoPDV — Painel e site
colors:
  light:
    nevoa: "#F3F5FB"        # fundo da aplicação
    papel: "#FFFFFF"        # cartões, tabela, formulários, diálogos
    tinta: "#141938"        # texto principal
    tinta-suave: "#5B6180"  # texto secundário
    linha: "#E3E7F0"        # divisórias e contorno de cartões
    linha-campo: "#8A90A5"  # borda de campos (≥ 3:1 sobre o papel)
    indigo: "#4F46E5"       # cor da marca: ação, página ativa, foco
    violeta: "#7C3AED"      # par do índigo nos gradientes e brilhos
    noite: "#0E1330"        # menu lateral, faixa de título, hero do site
    noite-2: "#161C44"      # segunda parada do gradiente da noite
    etiqueta: "#FFD43B"     # amarelo de etiqueta: preço e a ação principal
    etiqueta-borda: "#E5B800"
    remarcacao: "#E11D48"   # vermelho: remover, erros
    caixa-livre: "#047857"  # verde: confirmações, "online"
    alerta: "#B45309"       # âmbar: avisos
  dark:
    nevoa: "#0B0F26"
    papel: "#131938"
    tinta: "#E8EAF6"
    tinta-suave: "#A3A9C9"
    linha: "#262E5A"
    linha-campo: "#6E77A6"
    indigo: "#8B87FF"       # texto sobre ele: #0B0F26
    noite: "#080B1F"
    etiqueta: "#FFD43B"     # igual nos dois temas: é um adesivo físico
    remarcacao: "#FB7185"
    caixa-livre: "#34D399"
    alerta: "#FBBF24"
typography:
  ui: "Plus Jakarta Sans Variable (wght 200–800), auto-hospedada"
  preco: "Archivo Variable (wght e wdth), auto-hospedada; só em preço"
  scale:
    display: { size: "clamp(40px, 5vw + 12px, 64px)", weight: 800, tracking: "-0.035em", line-height: 1.04 }
    page-title: { size: "clamp(28px, 2vw + 18px, 40px)", weight: 800, tracking: "-0.025em" }
    kpi: { size: 30px, weight: 800, tracking: "-0.02em" }
    body: { size: 15px, weight: 400, line-height: 1.5 }
    meta: { size: 13px, weight: 500 }
    price-list: { family: Archivo, size: 20px, weight: 850, width: 72 }
    price-label: { family: Archivo, size: 48px, weight: 850, width: 68 }
rounded:
  tag: 6px        # etiqueta de preço
  control: 12px   # campos e botões quadrados
  pill: 9999px    # botões de ação, filtros, status
  card: 20px      # cartões, tabela, painel lateral
  band: 28px      # faixa de título, hero
elevation:
  card: "0 1px 2px rgb(20 25 56 / .04), 0 8px 24px -12px rgb(20 25 56 / .12)"
  float: "0 24px 60px -20px rgb(14 19 48 / .45)"
  glow-brand: "0 10px 30px -8px rgb(79 70 229 / .55)"
  glow-tag: "0 10px 30px -10px rgb(255 212 59 / .6)"
---

# NexoPDV — Painel e site

## Visão geral

**Assunto:** o NexoPDV, frente de caixa e retaguarda offline-first para lojas de varejo físico.
São duas superfícies: o **site** (página de entrada em `/`, que apresenta o produto) e o
**painel** (retaguarda em `/products`, onde o lojista mantém o catálogo).

**Quem usa:** o dono ou o gerente da loja, no computador ou no tablet. Não é especialista em
sistemas; quer uma ferramenta que pareça profissional e confiável, como os SaaS de gestão que já
conhece.

**Direção: SaaS de varejo, rico e confiante.** Profundidade (cartões com sombra suave sobre um
fundo névoa), uma cor de marca forte (índigo → violeta), superfícies noturnas com brilho para dar
peso ao topo de cada tela, e o **amarelo da etiqueta de gôndola** como assinatura: é a cor do
preço e da ação principal. A etiqueta inclinada, com o preço em numeral condensado e centavos
elevados, é o elemento que ninguém confunde com outro produto.

## Cores

- **Noite** (`#0E1330`) com gradiente para **Noite 2** e brilhos radiais de **Índigo** e
  **Violeta**: menu lateral, faixa de título do painel e hero do site.
- **Névoa** e **Papel**: fundo frio e cartões brancos, separados por sombra suave e 1 px de linha.
- **Índigo**: marca, página ativa da paginação, foco, ícones de destaque.
- **Etiqueta** (amarelo): preço, botão da ação principal da tela ("Novo produto", "Abrir o
  painel"), item ativo do menu e destaques de texto no site. Texto sobre ela é sempre Noite
  (contraste 12,8:1).
- **Remarcação** (vermelho) para remover e erros; **Caixa livre** (verde) para confirmação e
  "online"; **Alerta** (âmbar) para avisos.
- Os blocos coloridos das linhas usam seis gradientes fixos (céu, âmbar, índigo, esmeralda,
  ardósia, rosa), sorteados de forma estável pelo id do produto.

Contraste (WCAG 2.x): texto ≥ 4,5:1 nos dois temas; verde #047857 sobre papel 5,48:1; vermelho
#E11D48 sobre papel 4,70:1; texto do menu (#C3C8E6 sobre #0E1330) 11,0:1; branco sobre índigo 6,29:1.

## Tipografia

- **Plus Jakarta Sans** em toda a interface: geométrica, amigável, com peso 800 para títulos
  grandes e espaçamento negativo. Lembra os SaaS de gestão brasileiros sem copiar nenhum.
- **Archivo condensada** só no preço: `R$` pequeno, inteiro grande, `,90` menor e elevado. Leitor
  de tela ouve o preço inteiro ("R$ 49,90"); as partes visuais ficam ocultas.
- Código de barras em algarismos tabulares com respiro de `0.04em`.
- As duas fontes são auto-hospedadas (pacotes npm), sem CDN: a loja pode ter internet ruim.

## Layout do painel

```text
Desktop (≥ 1024 px)
┌────────────┬─────────────────────────────────────────────────────────────┐
│ ▌▌▍▌ Nexo  │ Painel / Produtos                     ⟳ Ver site   ◐        │ barra 64 px
│            ├─────────────────────────────────────────────────────────────┤
│ ▣ Produtos │ ╭─ faixa noite com brilho ──────────────────────────────╮   │
│   12       │ │ Catálogo da loja                          ╱R$ 49,⁹⁰╱   │   │
│ ▢ Estoque  │ │ Produtos             [+ Novo produto]                  │   │
│   3        │ ╰───────────────────────────────────────────────────────╯   │
│ ▢ Vendas   │ [Catálogo 12] [Último cadastrado] [Códigos] [Estoque]       │
│   em breve │ ╭─ tabela ──────────────────────────────────────────────╮   │
│            │ │ [🔍 Buscar pelo nome]                                  │   │
│ ╭────────╮ │ │ ▣ Camiseta Básica   7891000315507  EAN-13  R$49,⁹⁰ ✎ 🗑 │   │
│ │Conectado│ │ │ Mostrando 1–10 de 12      ‹ [1] 2 ›                    │   │
│ ╰────────╯ │ ╰───────────────────────────────────────────────────────╯   │
└────────────┴─────────────────────────────────────────────────────────────┘
```

- **Menu lateral** (noite, 256 px) com a marca, as seções em dois grupos ("Frente de caixa" e
  "Retaguarda") e o cartão de conexão. Seções que ainda não existem aparecem desabilitadas com
  "em breve": nunca link morto.
- **Barra superior** (papel translúcido com desfoque): trilha, link para o site e tema. Abaixo
  de 1024 px o menu lateral sai e um botão "Abrir menu" abre o mesmo menu numa gaveta.
- **Faixa de título**: gradiente noite com brilhos, título grande, contagem do catálogo e a ação
  principal em pílula amarela com brilho. À direita, a etiqueta inclinada com o preço do produto
  mais recente (decorativa, oculta para leitor de tela).
- **Indicadores**: só dados reais da API. O que depende de uma spec futura aparece como
  "em breve", nunca com número inventado. O de estoque mostra quantos produtos estão para repor,
  com o atalho para a lista de reposição.
- **Seção Estoque** (spec 011): a mesma faixa noite, três indicadores (para repor, sem estoque e
  valor em estoque, este em amarelo por ser dinheiro), a busca com o filtro "Todos / Para
  repor" e a tabela com saldo, mínimo, situação e as ações de entrada, ajuste e histórico.
  Entrada e ajuste abrem em `Dialog` com ícone no cabeçalho; o histórico, em `Sheet` com
  cabeçalho noite. O número de produtos para repor aparece em âmbar ao lado de Estoque no menu.
- **Nova venda** (spec 004): faixa noite compacta com "Descartar venda"; à esquerda, o cartão
  de leitura (campo do código grande, com foco, e a busca por nome) e o carrinho (tabela com
  quantidade em − / campo / +, subtotal e remover; problema da recusa numa pílula âmbar ou
  vermelha junto ao nome); à direita, fixo no desktop, o pagamento: o resumo noite com o total
  na etiqueta amarela grande, os quatro meios em `RadioGroup`, o valor com prefixo `R$`, a lista
  de pagamentos, a situação ("Falta pagar", "Troco", "Pagamento completo", em verde quando
  fecha) e o botão amarelo "Finalizar venda". O comprovante abre num `Dialog` com selo verde.
- **Vendas**: a mesma faixa noite com o botão amarelo "Nova venda", três indicadores do dia
  (faturamento e ticket médio em amarelo, por serem dinheiro), a tabela das vendas e o detalhe
  em `Sheet` com cabeçalho noite. No menu, o grupo "Frente de caixa" vem antes da retaguarda.
- **Situação do estoque**: pílula com texto sempre visível. "Sem estoque" em Remarcação
  (`destructive`), "Repor" (ou "Repor · faltam N") em Alerta (`warning`, âmbar), "Em dia" em
  Caixa livre (`success`). Na tabela de produtos, só aparece quando não está em dia.
- **Tabela** dentro de um cartão: busca no topo, bloco colorido com as iniciais em cada linha,
  pílula do tipo de código (EAN-13, EAN-8, UPC-A, GTIN-14), etiqueta de preço e ações.
  Paginação numerada com a página ativa em índigo.
- **Celular** (< 640 px): a tabela vira lista empilhada; ações num menu `⋯`.

## Layout do site (`/`)

Hero noite com brilhos e uma grade sutil; manchete enorme com a palavra de destaque em gradiente
amarelo; pílulas de recurso; à direita, a ilustração de uma venda no caixa com cartões flutuando
(sincronização, estoque baixo, faturamento). Uma faixa de números sobrepõe o fim do hero. Depois:
recursos em cartões (com selo "Disponível" ou "Em breve", conforme o que já existe), "como o
offline funciona" em três passos, chamada final e rodapé. Toda ação leva ao painel; não há
"Entrar" nem "Teste grátis" enquanto não houver login.

## Elevação e formas

- Cartões com a sombra `card` e 1 px de linha; flutuantes (gaveta, diálogo, toast, cartões do
  hero) com `float`.
- Brilho colorido só no que é ação ou marca: `glow-brand` no logotipo e na página ativa,
  `glow-tag` no botão amarelo.
- Raios grandes: 12 px em campos, pílula em botões de ação, 20 px em cartões, 28 px nas faixas.

## Componentes

shadcn/ui (estilo `nova`), tematizado pelos tokens de `src/index.css`.

| Necessidade | Componente |
|---|---|
| Ação principal | `Button` variante `highlight` (pílula amarela com brilho) |
| Ações secundárias | `Button` `outline`, `ghost` + ícone na linha, `destructive` para confirmar remoção |
| Formulário | `Field`/`FieldGroup`, `Input`, `Textarea`, `InputGroup` (prefixo `R$`) |
| Cadastro e edição | `Sheet` pela direita, com cabeçalho noite |
| Entrada e ajuste de estoque | `Dialog` com ícone no cabeçalho; ajuste com `RadioGroup` (Retirar / Adicionar) |
| Histórico de movimentações | `Sheet` pela direita, com cabeçalho noite |
| Filtro de visão | dois `Toggle` com `aria-pressed` num grupo em pílula |
| Remover | `AlertDialog` |
| Menu no celular | `Sheet` pela esquerda |
| Carregando, vazio, erro | `Skeleton`, `Empty`, `Alert` |
| Retorno das ações | toast (`sonner`) |

Componentes próprios: `PriceTag` (etiqueta), `ShelfLabel` (prévia da etiqueta de gôndola com
barras reais), `BrandMark` (cinco barras 1-2-1-3-1 num quadrado índigo → violeta, com
"Nexo**PDV**"), `ProductAvatar` (bloco colorido com iniciais), `StatCard` (indicador).

## Movimento

- A linha cadastrada ou editada recebe uma lavagem amarela que some em 1,2 s.
- Cartões e linhas sobem 1–2 px no hover; botões amarelos clareiam.
- No site, os cartões do hero flutuam devagar (6 s). Com `prefers-reduced-motion`, nada se
  move sozinho e a lavagem fica estática.

## Texto da interface

Português do Brasil, frases curtas, voz ativa. A ação mantém o nome do botão no toast:

| Ação | Botão | Toast |
|---|---|---|
| Cadastrar | "Cadastrar produto" | "Produto cadastrado" |
| Editar | "Salvar alterações" | "Alterações salvas" |
| Remover | "Remover produto" | "Produto removido" |

Os textos de vazio, busca sem resultado, erro e confirmação de remoção seguem os da spec 007
(`specs/007-painel-produtos/contracts/ui.md`).

## Faça e não faça

- **Faça:** só tokens semânticos (`bg-primary`, `bg-sidebar`, `text-price-tag-foreground`);
  dados reais nos indicadores; "em breve" para o que ainda não existe; rótulo visível em todo
  campo; foco visível em tudo.
- **Não faça:** número inventado no painel; link para tela que não existe; cor solta
  (`bg-blue-500`) fora dos gradientes de `ProductAvatar` e dos cartões de recurso do site;
  `dark:` manual onde um token resolve; fonte monoespaçada para dados.
- **Exceção:** a ilustração do caixa no hero do site é um "print" do produto, sempre clara, e
  usa a paleta fixa do Tailwind. Os números dela são de exemplo, e ela é uma imagem (`role="img"`
  com descrição) para leitores de tela.

## Responsivo

- < 640 px: lista empilhada, painel de cadastro em tela cheia, margem de 16 px.
- 640–1023 px: tabela, menu na gaveta, indicadores em duas colunas.
- ≥ 1024 px: menu lateral fixo, indicadores em quatro colunas, margem de 32 px.
- Nunca rolagem horizontal da página.
