---
name: NexoPDV — Painel
colors:
  light:
    gondola: "#EEF1F3"      # fundo da aplicação (aço claro da gôndola)
    papel: "#FFFFFF"        # superfícies: lista, formulários, diálogos
    grafite: "#1B1E2E"      # texto principal
    grafite-suave: "#5B6075" # texto secundário
    linha: "#D9DDE4"        # divisórias e bordas estruturais
    linha-campo: "#8A90A5"  # borda de campos (≥ 3:1 sobre o papel)
    tinta: "#2B39A8"        # cor da marca e ação principal (azul de caneta)
    etiqueta: "#FFD43B"     # amarelo de etiqueta de preço — só em preço
    etiqueta-borda: "#D9AE00"
    remarcacao: "#C21F32"   # vermelho: remover, erros
    caixa-livre: "#1F7A4D"  # verde: confirmações
  dark:
    gondola: "#121528"
    papel: "#1A1E36"
    grafite: "#E8EAF4"
    grafite-suave: "#A2A7C0"
    linha: "#2C3150"
    linha-campo: "#6E7499"
    tinta: "#8F9BFF"        # texto sobre ela: #121528
    etiqueta: "#FFD43B"     # igual nos dois temas: é um adesivo físico
    etiqueta-borda: "#D9AE00"
    remarcacao: "#FF7A7A"
    caixa-livre: "#5FD69A"
typography:
  family: "Archivo Variable (eixos wght 100–900 e wdth 62–125), auto-hospedada"
  widths:
    letreiro: 118   # marca e títulos de página
    leitura: 100    # interface e texto corrido
    etiqueta: 72    # preços
  scale:
    page-title: { size: "clamp(24px, 1.6vw + 16px, 30px)", weight: 760, width: 118, line-height: 1.15, tracking: "-0.01em" }
    brand: { size: 18px, weight: 800, width: 125, line-height: 1 }
    body: { size: 15px, weight: 400, width: 100, line-height: 1.5 }
    table: { size: 14px, weight: 400, width: 100, line-height: 1.4 }
    meta: { size: 13px, weight: 450, width: 100, line-height: 1.4 }
    price-list: { size: 20px, weight: 800, width: 72, cents: 12px }
    price-label: { size: 48px, weight: 850, width: 68, cents: 22px }
rounded:
  tag: 2px        # etiquetas de preço (adesivo)
  control: 6px    # botões, campos, itens de menu
  surface: 10px   # lista, painel lateral, diálogos, toasts
spacing:
  base: 4px
  gutter-mobile: 16px
  gutter-desktop: 32px
  content-max: 1120px
controls:
  height: 36px
  icon-button: 36px
elevation:
  flat: "nenhuma sombra; superfícies separadas por 1px de linha"
  overlay: "0 16px 40px -12px rgb(18 21 40 / 0.28)"
---

# NexoPDV — Painel

## Visão geral

**Assunto:** o painel de retaguarda do NexoPDV, sistema de frente de caixa e gestão para lojas de
varejo físico pequenas e médias no Brasil (roupas, papelaria, material de construção, mercadinho).

**Quem usa:** o dono ou o gerente da loja, no computador ou no tablet da retaguarda, todo dia,
entre um atendimento e outro. Não é especialista em sistemas; conhece bem a loja.

**Trabalho principal da tela de produtos:** manter o catálogo certo, rápido e sem medo de errar:
achar um produto, conferir ou corrigir o preço, cadastrar o que chegou.

**Conceito: a etiqueta de gôndola.** O objeto mais característico do varejo físico é a etiqueta
de preço na borda da prateleira: amarela, preço em numeral condensado e pesado, centavos menores
e elevados, código de barras embaixo. O painel trata o catálogo como a loja trata a prateleira: a
lista é calma e organizada (aço e papel), e o preço é a única coisa que "grita", sempre no mesmo
formato de etiqueta. É aí que gastamos a ousadia; o resto fica quieto e disciplinado.

## Cores

- **Gôndola** (fundo) e **Papel** (superfícies): neutros frios, como prateleira de aço e papel de
  bobina térmica. Nada de creme.
- **Grafite**: texto. Derivado da Tinta, para a paleta ficar coesa.
- **Tinta**: o azul de caneta esferográfica do caderno de fiado e da nota preenchida à mão. É a
  cor da marca e da ação principal (um botão primário por tela).
- **Etiqueta**: amarelo de etiqueta de preço. **Regra: amarelo só aparece onde há dinheiro**
  (preço na lista, prévia da etiqueta, destaque da linha que acabou de mudar de preço). Não é cor
  de botão, de link nem de alerta.
- **Remarcação** (vermelho) para remover e para erros; **Caixa livre** (verde) para confirmações.

Contraste verificado (WCAG 2.x): todo par de texto ≥ 4,5:1 nos dois temas (menor: verde sobre
papel claro, 5,32:1); borda de campo ≥ 3:1 (3,18 claro, 3,60 escuro). O amarelo sobre o papel
branco tem 1,43:1, por isso a etiqueta leva a borda `etiqueta-borda`; o texto sobre ela tem
11,58:1.

## Tipografia

Uma família só, **Archivo**, usada em três larguras do eixo `wdth`, como a sinalização de uma
loja:

- **Letreiro** (expandida, pesada): a marca e o título da página. Lembra fachada e placa de
  seção.
- **Leitura** (largura normal): tudo o que se lê na interface.
- **Etiqueta** (condensada, pesadíssima): preços. Lembra o numeral da etiqueta de gôndola.

Números de preço e código de barras usam algarismos tabulares (`tabular-nums`), para alinhar em
coluna. O código de barras **não** usa fonte monoespaçada: é a Archivo de leitura com algarismos
tabulares e um respiro de `0.02em`.

Preço é sempre composto assim: `R$` pequeno, inteiro grande, `,90` menor e elevado. Para leitores
de tela, o conjunto tem rótulo único ("R$ 49,90") e as partes visuais ficam ocultas.

A fonte é auto-hospedada (pacote npm), sem CDN: o NexoPDV nasce para funcionar em loja com
internet ruim.

## Layout

Barra superior com a marca, as seções e a troca de tema; conteúdo alinhado à esquerda numa coluna
de até 1120 px. Não há menu lateral: com uma seção só, ele seria uma coluna vazia. As próximas
seções (Estoque, Vendas) entram como novas abas na barra.

```text
Desktop (≥ 1024 px)
┌──────────────────────────────────────────────────────────────────────────┐
│ ▌▌▍▌ NexoPDV    Produtos                                      ◐ Tema     │  barra 56 px
├──────────────────────────────────────────────────────────────────────────┤
│  Produtos                                            [+ Novo produto]    │
│  128 produtos no catálogo                                                │
│  [🔍 Buscar pelo nome                         ]                          │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ Produto                        Código de barras        Preço         │ │
│ │──────────────────────────────────────────────────────────────────────│ │
│ │ Camiseta Básica Branca M       7891000315507       ▕R$ 49,⁹⁰▏  ✎ 🗑   │ │
│ │ Algodão penteado, gola careca                                        │ │
│ │──────────────────────────────────────────────────────────────────────│ │
│ │ Calça Jeans Azul 42            7896543210985      ▕R$ 159,⁹⁰▏  ✎ 🗑   │ │
│ │──────────────────────────────────────────────────────────────────────│ │
│ │ Mostrando 1–10 de 128            Página 1 de 13   [Anterior][Próxima]│ │
│ └──────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

A coluna de preços, com as etiquetas amarelas empilhadas, lembra a borda de uma prateleira.

```text
Painel lateral de cadastro e edição (abre pela direita; tela cheia no celular)
┌───────────────────────────────┐
│ Novo produto               ✕  │
│ ┌───────────────────────────┐ │
│ │ Camiseta Básica Branca M  │ │  prévia da etiqueta de gôndola,
│ │ R$ 49,⁹⁰                  │ │  atualizada enquanto se digita
│ │ ▌▍▌▌▍▌▍▌▌▍  7891000315507 │ │  (barras só com código válido)
│ └───────────────────────────┘ │
│ Nome                          │
│ [                           ] │
│ Descrição (opcional)          │
│ [                           ] │
│ Código de barras              │
│ [                           ] │
│ Preço de venda                │
│ [ R$                        ] │
│                               │
│ [Cancelar] [Cadastrar produto]│
└───────────────────────────────┘
```

```text
Celular (< 640 px): a tabela vira lista de linhas, sem cartões
┌──────────────────────────────┐
│ ▌▌▍▌ NexoPDV          ◐      │
├──────────────────────────────┤
│ Produtos          [+ Novo]   │
│ [🔍 Buscar pelo nome       ] │
│ Camiseta Básica Branca M     │
│ 7891000315507   ▕R$ 49,⁹⁰▏ ⋯ │
│──────────────────────────────│
│ Calça Jeans Azul 42          │
│ 7896543210985  ▕R$ 159,⁹⁰▏ ⋯ │
│──────────────────────────────│
│ 1–10 de 128   [‹] [›]        │
└──────────────────────────────┘
```

Alinhamento: texto à esquerda; preço à direita (moeda se compara pela direita); código de barras
em coluna de largura fixa.

## Elevação e formas

- Plano por padrão: superfícies se separam por 1 px de `linha`, sem sombra.
- Sombra só no que flutua sobre a página: painel lateral, diálogo, toast, dica (tooltip). Uma
  sombra só (`overlay`).
- Raios por hierarquia, não um raio para tudo: 2 px na etiqueta (adesivo), 6 px nos controles,
  10 px nas superfícies.

## Componentes

shadcn/ui (estilo `nova`, compacto), tematizado pelos tokens acima, com controles de 36 px.

| Necessidade | Componente |
|---|---|
| Ações | `Button`: `default` (Tinta) para a ação principal, `outline` para cancelar, `ghost` + ícone para editar e remover na linha, `destructive` para confirmar remoção |
| Formulário | `Field`/`FieldGroup`, `Input`, `Textarea`, `InputGroup` (prefixo `R$` no preço) |
| Cadastro e edição | `Sheet` pela direita |
| Remover | `AlertDialog` |
| Lista | `Table` (desktop) e a mesma informação em linhas empilhadas (celular) |
| Carregando | `Skeleton` com o formato das linhas |
| Vazio e busca sem resultado | `Empty` |
| Erro ao carregar | `Alert` com "Tentar de novo" |
| Retorno das ações | toast (`sonner`) |
| Dicas dos botões de ícone | `Tooltip` |

Componentes próprios do NexoPDV:

- **Etiqueta de preço** (`PriceTag`): amarelo, numeral condensado, centavos elevados. Dois
  tamanhos: lista e prévia.
- **Prévia da etiqueta de gôndola** (`ShelfLabel`): nome, preço e código de barras desenhado em
  barras reais (EAN-13, UPC-A e EAN-8) quando o código é válido. *(Extra — fora do PDF.)*
- **Marca** (`BrandMark`): cinco barras verticais de larguras 1-2-1-3-1, em Tinta, com o nome
  NexoPDV em Letreiro. Também é o favicon.

## Movimento

Um único momento, em resposta ao lojista: a linha que acabou de ser cadastrada ou editada recebe
uma lavagem amarela-etiqueta que some em 1,2 s, para mostrar o que mudou. Abrir e fechar o painel
lateral e o diálogo usam a animação padrão dos componentes. Nada se move sozinho. Com
`prefers-reduced-motion`, a lavagem fica estática por 2 s e some sem transição.

## Texto da interface

Português do Brasil, frases curtas, voz ativa, sem caixa alta. A ação mantém o nome do botão ao
toast:

| Ação | Botão | Toast |
|---|---|---|
| Cadastrar | "Cadastrar produto" | "Produto cadastrado" |
| Editar | "Salvar alterações" | "Alterações salvas" |
| Remover | "Remover produto" | "Produto removido" |

- Vazio: "Nenhum produto cadastrado ainda." / "Cadastre o primeiro produto para começar a
  vender." / botão "Cadastrar produto".
- Busca sem resultado: "Nenhum produto com “{termo}”." / botão "Limpar busca".
- Erro ao carregar: "Não foi possível carregar os produtos." / "Verifique a conexão com o
  servidor e tente de novo." / botão "Tentar de novo".
- Remover: título "Remover {nome}?" / "O produto sai do catálogo. O código de barras {código}
  continua reservado e não poderá ser usado em outro produto."
- Produto sumiu: "Este produto não existe mais. A lista foi atualizada."
- Erros de campo dizem o que fazer: "Informe o nome do produto.", "Confira os dígitos: o código
  de barras não é válido.", "Use no máximo duas casas decimais."

## Faça e não faça

- **Faça:** usar só tokens semânticos; amarelo só em preço; um botão primário por tela; texto à
  esquerda e preço à direita; rótulo visível em todo campo.
- **Não faça:** cartões com sombra para cada produto; caixa alta com espaçamento em rótulos;
  numeração decorativa (01/02/03); `→` em botões; separadores com ponto médio ("A · B"); fonte
  monoespaçada para dados; gradientes; cores soltas (`bg-blue-500`); `dark:` manual.

## Responsivo

- < 640 px: lista empilhada, ações num menu `⋯`, painel lateral em tela cheia, margem de 16 px.
- ≥ 640 px: tabela, com a descrição numa segunda linha sob o nome; margem de 24 px até 1023 px
  e de 32 px a partir de 1024 px.
- Nunca rolagem horizontal da página.

## Lacunas conhecidas

- O tema escuro foi derivado da paleta clara (não há referência de marca para ele).
- GTIN-14 (ITF-14) não é desenhado em barras na prévia: mostra só os dígitos.
- Sem página de design system (showcase) nesta etapa; os tokens vivem em `src/index.css`.
- Confirmar no plano que o pacote da Archivo traz o eixo `wdth`; se não trouxer, a alternativa é
  usar só `wght` e trocar o "Letreiro" por peso, mantendo a Etiqueta numa fonte condensada da
  mesma família de desenho.
