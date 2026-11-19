# Research: Painel de Produtos

**Feature**: [spec.md](spec.md) | **Plano**: [plan.md](plan.md) | **Identidade visual**:
[frontend/DESIGN.md](../../frontend/DESIGN.md)

Decisões técnicas da spec 007. Cada uma traz o que foi escolhido, por quê e o que foi descartado
(Princípio IV). Versões conferidas no npm em 2026-11-19.

---

## Front-end

### D1 — TypeScript estrito, começando do zero

- **Decisão:** o front-end passa a ser TypeScript 7 (`typescript@^7.0`) em modo `strict`, com
  `noUncheckedIndexedAccess`, `noUnusedLocals` e `noUnusedParameters`. Configuração no padrão do
  Vite: `tsconfig.json` com referências para `tsconfig.app.json` (código e testes) e
  `tsconfig.node.json` (configs do Vite e do Playwright). O `npm run build` vira
  `tsc -b && vite build`, então a verificação de tipos entra no CI sem passo novo. Os arquivos do
  laboratório (`.jsx`/`.js`) são **apagados**, não convertidos: nada deles é reaproveitado.
- **Por quê:** a constituição v2.1.0 (Princípio III) exige TypeScript estrito. Os contratos da API
  (produto, página, erros) viram tipos, e o compilador pega campo errado antes do teste.
- **Alternativas:** TypeScript 6 (última versão escrita em JS) foi descartado por ser a linha
  antiga, mas fica como plano B se alguma ferramenta não aceitar a 7. Manter JS com JSDoc foi
  descartado porque a constituição pede TS.

### D2 — shadcn/ui: estilo `nova`, base Radix, ícones Lucide

- **Decisão:** `npx shadcn@latest init --base radix --preset nova` no `frontend/` existente
  (Vite + Tailwind 4), com o alias `@/` → `src/` no `tsconfig.app.json` (`paths`, sem `baseUrl`,
  que o TS 7 removeu) e no `vite.config.ts`. Componentes adicionados um a um, só os usados:
  `button`, `input`, `textarea`, `field`, `input-group`, `table`, `sheet`, `alert-dialog`,
  `dropdown-menu`, `tooltip`, `skeleton`, `empty`, `alert`, `sonner`, `spinner` e `separator`.
  A altura dos controles sobe de 32 px para 36 px (DESIGN.md) em `button.tsx`, `input.tsx` e
  `input-group.tsx`, juntos.
- **Por quê:** `nova` é o estilo compacto, com linhas finas em vez de sombras, o mais próximo do
  DESIGN.md. A base Radix é a mais madura, funciona bem com Testing Library no jsdom e usa
  `sonner` para os toasts. Com o prazo curto, ela tem menos risco do que a Base UI.
- **Alternativas:** a base Base UI (padrão atual do shadcn) foi descartada só por risco de prazo.
  `add --all` mais a página de design system do fluxo `design-system.md` da skill foram
  descartados: dezenas de componentes sem uso e uma página que a spec não pede.

### D3 — Tema por tokens a partir do DESIGN.md

- **Decisão:** toda cor, raio, sombra e fonte do DESIGN.md vira variável CSS em `src/index.css`:
  os papéis do shadcn (`--background` = Gôndola, `--card`/`--popover` = Papel, `--foreground` =
  Grafite, `--primary` = Tinta, `--destructive` = Remarcação, `--border` = Linha, `--input` =
  Linha de campo, `--ring` = Tinta), em hex, com `.dark` derivado. Os tokens sem equivalente no
  shadcn (`--price-tag`, `--price-tag-border`, `--price-tag-foreground`, `--success`) são
  registrados no `@theme inline`. Os raios ficam fixos na escala do DESIGN.md (2/6/10 px) e a
  sombra única `overlay` substitui `--shadow-lg`. As tipografias viram utilitários `type-*`
  (`type-page-title`, `type-price-list`…), não chaves `--text-*` (o `cn()` as confundiria com
  cores).
- **Por quê:** o Princípio III exige tokens em vez de valores soltos; os temas claro e escuro e a
  identidade ficam num lugar só.
- **Alternativas:** usar o tema cinza padrão do shadcn foi descartado: é exatamente o visual
  genérico que a spec (FR-018) quer evitar.

### D4 — Fonte Archivo auto-hospedada, com eixo de largura

- **Decisão:** `@fontsource-variable/archivo` (5.3), importando `standard.css`, que declara
  `font-weight: 100 900` e `font-stretch: 62% 125%` (conferido no pacote). As três larguras do
  DESIGN.md usam `font-stretch` (118% Letreiro, 100% Leitura, 72% Etiqueta).
- **Por quê:** uma família só, usada em três larguras, dá personalidade sem misturar fontes. Sem
  CDN, porque o NexoPDV nasce para loja com internet ruim.
- **Alternativas:** Google Fonts via `<link>` (depende de rede externa); duas famílias (uma
  normal e uma condensada), que é mais peso e menos coesão.

### D5 — Rotas e estado na URL com React Router

- **Decisão:** `react-router` 8, em modo de dados (`createBrowserRouter`). Rotas: `/` redireciona
  para `/products`; `/products` é a seção de produtos, dentro de um layout com a barra superior.
  A busca e a página ficam na query string (`/products?search=camis&page=2`), lidas e gravadas
  com `useSearchParams` por um hook `useProductListParams`, que também normaliza valores
  inválidos (`page=abc` vira 1). Rotas e parâmetros em inglês (regra de idioma do CLAUDE.md).
- **Por quê:** FR-004 pede que recarregar, voltar e compartilhar o endereço mantenham a visão. As
  próximas specs (estoque, vendas) entram como rotas novas no mesmo layout.
- **Alternativas:** `URLSearchParams` + `history.pushState` à mão (resolve o FR-004, mas reinventa
  o roteador que a próxima spec vai precisar); TanStack Router (parâmetros tipados, mas uma curva
  de aprendizado a mais para o prazo).

### D6 — Dados do servidor com TanStack Query

- **Decisão:** `@tanstack/react-query` 5. Consulta `['products', { search, page }]` com
  `placeholderData: keepPreviousData` (trocar de página não pisca o esqueleto) e `retry: 1`.
  Mutações (`create`, `update`, `remove`) sem retry, que invalidam `['products']` no sucesso. Os
  hooks ficam em `features/products/queries.ts`; os componentes não chamam `fetch`.
- **Por quê:** resolve de graça os requisitos de estado da spec: carregando, erro com "tentar de
  novo" (`refetch`), envio pendente (`isPending`, FR-012), lista atualizada sem recarregar
  (invalidação, FR-017) e "a resposta atrasada não sobrescreve a busca atual" (cada termo é uma
  chave de cache diferente, e a tela só mostra a chave atual).
- **Alternativas:** SWR (mais simples, mas mutações e invalidação são mais manuais); `fetch` em
  `useEffect` com estado próprio, que exigiria tratar à mão corrida entre respostas,
  cancelamento, cache e repetição. É o tipo de código que vira bug.

### D7 — Cliente HTTP com erros por categoria

- **Decisão:** um `apiClient` pequeno sobre `fetch` (`src/lib/api-client.ts`): monta a URL a
  partir de `VITE_API_URL`, envia e lê JSON e transforma toda falha num `ApiError` com `kind`:
  `network` (o `fetch` lançou), `validation` (422, com `fieldErrors` extraídos de
  `detail[].loc[1]`), `not-found` (404), `conflict` (409) ou `unexpected` (qualquer outro). As
  funções de `features/products/api.ts` usam o cliente e devolvem tipos de domínio.
- **Por quê:** as telas decidem a mensagem pela categoria, não pelo número do status, o mesmo
  desenho por categoria dos erros do back-end (D8 da spec 002). Mensagens do servidor por campo
  (422) são as das regras de domínio, já em português; as do Pydantic não chegam ao usuário
  porque o formulário valida as mesmas regras antes (D8).
- **Alternativas:** axios (dependência sem ganho real aqui); tratar status em cada componente
  (duplicação).

### D8 — Formulário controlado e validação própria

- **Decisão:** formulário controlado com `useState`, validado por funções puras em
  `features/products/validation.ts` (nome, descrição, preço) e `features/products/gtin.ts`
  (formato e dígito verificador, o mesmo algoritmo do back-end). O preço é tratado como texto,
  nunca como `float`: aceita vírgula ou ponto, recusa mais de duas casas, compara com o máximo
  como inteiro de centavos e é enviado como string `"49.90"`. A validação roda no envio e, depois
  do primeiro envio, a cada alteração do campo.
- **Por quê:** são quatro campos com regras simples e bem definidas. Funções puras são fáceis de
  testar primeiro (Princípio I) e de explicar. Os erros vão para `Field data-invalid` +
  `aria-invalid` + `aria-describedby` (FR-021).
- **Alternativas:** react-hook-form + zod: padrão de mercado para formulários grandes, mas aqui
  seriam duas bibliotecas e uma segunda linguagem de schema para quatro campos.

### D9 — Edição por PUT; CORS só com os métodos usados

- **Decisão:** salvar a edição envia o cadastro completo com `PUT /products/{id}`. Assim o painel
  usa GET, POST, PUT e DELETE, e o CORS libera exatamente esses quatro (o preflight `OPTIONS` é
  respondido pelo middleware). `PATCH` continua na API para outros clientes, mas não é liberado
  para o navegador.
- **Por quê:** o formulário de edição sempre tem todos os campos, e o `PUT` é a operação que
  corresponde a "salvar o formulário" (inclusive apagar a descrição, US3-3). O PDF pede CORS
  coerente com os métodos usados (RP-003).
- **Alternativas:** `PATCH` só com os campos alterados (exigiria comparar com o original e não
  muda a regra de "vale a última gravação"); liberar `PATCH` por garantia (liberaria um método
  que o front-end não usa).

### D10 — Código de barras desenhado por código próprio

- **Decisão:** `features/products/ean.ts` codifica EAN-13, UPC-A (como EAN-13 com zero à
  esquerda) e EAN-8 numa sequência de módulos (barra/espaço), com as tabelas L, G e R e a
  paridade do primeiro dígito. O componente `Barcode` desenha a sequência em SVG com `rect`
  (`role="img"`, `aria-label` com os dígitos). GTIN-14 e códigos inválidos mostram só os dígitos.
- **Por quê:** são cerca de 50 linhas de função pura, testáveis com códigos conhecidos, sem
  dependência. É o elemento marcante do DESIGN.md (FR-022, extra).
- **Alternativas:** JsBarcode ou bwip-js (dezenas de formatos que não usamos, e o desenho
  sairia de uma caixa-preta).

### D11 — Tema claro e escuro

- **Decisão:** um `ThemeProvider` próprio (receita do shadcn para Vite) com `light`, `dark` e
  `system`, guardado em `localStorage` (`nexopdv-theme`), que aplica a classe `.dark` no
  `<html>`. Um script inline no `index.html` aplica o tema antes do React carregar, para não
  piscar o tema errado. O botão da barra alterna entre claro e escuro, e o padrão é o do sistema.
- **Por quê:** FR-019. O shadcn usa `@custom-variant dark (&:is(.dark *))`.
- **Alternativas:** `next-themes` (feito para Next.js); só `prefers-color-scheme` (não deixa
  trocar à mão).

### D12 — Testes do front-end: Testing Library + MSW

- **Decisão:** Vitest 5 + Testing Library + `user-event`, com **MSW 2** (`msw/node`,
  `setupServer`) simulando a API: um catálogo falso em memória responde `GET/POST/PUT/DELETE
  /products` como o contrato, e cada teste pode trocar uma rota para simular 404, 409, 422,
  servidor fora do ar ou demora. Funções puras (GTIN, EAN, dinheiro, validação, parâmetros da
  URL) têm testes unitários em `tests/unit/`; telas e fluxos, testes de integração em
  `tests/integration/`, renderizados com os providers reais (QueryClient novo por teste, sem
  retry; roteador em memória). O `tests/setup.ts` inclui os polyfills que o jsdom não tem e o
  Radix usa (`matchMedia`, `ResizeObserver`, `hasPointerCapture`, `scrollIntoView`).
- **Por quê:** testar pelo que o usuário vê (Princípio I) pede que a tela converse com uma API de
  verdade; o MSW intercepta na camada de rede, então o `apiClient` e o TanStack Query reais
  entram no teste. O substituto de `fetch` do laboratório (`vi.stubGlobal`) não aguenta fluxos
  com várias chamadas.
- **Alternativas:** `vi.stubGlobal('fetch')` com respostas em fila (frágil com várias consultas e
  invalidações); mockar os hooks de consulta (o teste deixaria de cobrir a integração com a API).

### D13 — E2E do fluxo completo com persistência

- **Decisão:** um `tests/e2e/products.spec.ts` (Playwright, Chromium) contra a stack real do
  Compose: cadastrar um produto, recarregar e conferir; buscar pelo nome; editar o preço,
  recarregar e conferir; remover com confirmação, recarregar e conferir que sumiu. Cada execução
  gera um GTIN-13 único (prefixo de uso interno 2, sufixo do relógio e dígito verificador
  calculado), então o teste também roda contra a stack de desenvolvimento sem colidir. O projeto
  do Compose do E2E passa de `lab-e2e` para `nexopdv-e2e`.
- **Por quê:** RP-005 e SC-008; o "persiste depois de recarregar" é também o roteiro do vídeo.
- **Alternativas:** um teste por história, mais lento e com estado repetido; limpar o banco antes
  de cada teste, o que impede rodar contra a stack de desenvolvimento.

### D14 — Destaque da linha alterada

- **Decisão:** depois de cadastrar ou editar, a página guarda o id do produto e a linha recebe
  `data-highlighted`, com uma animação CSS de 1,2 s do amarelo-etiqueta para o transparente. Com
  `prefers-reduced-motion`, a cor fica fixa e some sem transição.
- **Por quê:** o único movimento do DESIGN.md, em resposta a uma ação do lojista.
- **Alternativas:** biblioteca de animação (framer-motion), desproporcional para uma transição.

## Back-end

### D15 — Listagem do mais recente para o mais antigo

- **Decisão:** o repositório SQLAlchemy ordena por `ProductModel.id.desc()` (UUID v7 cresce com o
  tempo e é monotônico dentro do mesmo milissegundo); o repositório em memória devolve a lista
  invertida. Os testes de contrato e o `SC-005` passam a esperar a ordem decrescente. A spec e o
  contrato da 002 recebem uma nota apontando para a 007; o conteúdo antigo não é apagado.
- **Por quê:** decisão do usuário na spec (FR-005). Continua estável para a paginação.
- **Alternativas:** parâmetro `sort` na API (escopo maior, recusado na clarificação).

### D16 — Remoção do recurso `items` do laboratório

- **Decisão:** apagar o recurso inteiro, camada por camada: `domain/item.py`,
  `DuplicateItemNameError`, `ItemData`, `ports/item_repository.py`, `services/item_service.py`,
  os dois repositórios, `models/item.py`, `schemas/item.py`, `routes/items.py`, as dependências e
  o `include_router` no `main.py`, o import no `alembic/env.py` e os testes (`test_item*`,
  `test_items_api.py`, a parte de itens em `test_errors.py`). O banco perde a tabela por uma
  **migração nova** (`drop items`), com `downgrade` que recria a tabela como era. A migração
  `4f1e2a7c9b3d_create_items.py` continua no histórico.
- **Por quê:** FR-023/FR-024 e RP-008. Reescrever ou apagar uma migração já aplicada deixaria os
  bancos existentes (o volume do Compose da Prática 7) fora de sincronia com o histórico.
- **Alternativas:** apagar a migração dos itens (quebra bancos existentes); deixar a tabela
  órfã (o `test_migrations_match_the_orm_models` acusaria a diferença, e sobraria lixo do
  laboratório).

### D17 — Testes de CORS pelo recurso de produtos

- **Decisão:** os testes de CORS passam a usar `/products` e ganham casos novos: preflight de
  `PUT` e `DELETE` autorizado para a origem do front-end; preflight de `PATCH` recusado (método
  não usado pelo painel).
- **Por quê:** o recurso `/items` deixa de existir (D16), e o RP-003 precisa de evidência
  automatizada.

## Infra e ferramentas

### D18 — Biome com TypeScript e componentes gerados

- **Decisão:** o Biome 2.6 já entende TS/TSX. Os arquivos gerados pelo shadcn em
  `src/components/ui/` passam pelo formatador e pelo lint como o resto; se alguma regra
  recomendada acusar código gerado, ela é desligada só nessa pasta, por `overrides` no
  `biome.json`, com o motivo num comentário.
- **Por quê:** os componentes gerados viram código do projeto (o shadcn copia o fonte), então
  seguem o mesmo padrão.

### D19 — Container do front-end e variáveis

- **Decisão:** o container continua rodando o servidor do Vite, como na Prática 7, com
  `VITE_API_URL` vindo do Compose; o `vite-env.d.ts` tipa a variável. O `index.html` muda o título
  para "Produtos | NexoPDV", ganha o favicon em SVG (a marca de barras) e o script de tema (D11).
- **Por quê:** o PDF exige que os containers subam e funcionem; trocar para build de produção
  com nginx exigiria resolver a URL da API em tempo de build e fica fora do prazo.
- **Alternativas:** build estático com nginx (melhor para produção; registrado como evolução
  futura).

### D20 — Dependências novas (Princípio III)

| Pacote | Papel | Justificativa |
|---|---|---|
| `typescript`, `@types/react`, `@types/react-dom` | tipos | D1, constituição |
| `react-router` | rotas e URL | D5 |
| `@tanstack/react-query` | dados do servidor | D6 |
| `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `lucide-react`, `sonner` | trazidos pelo shadcn | D2 |
| `@fontsource-variable/archivo` | fonte auto-hospedada | D4 |
| `msw` (dev) | API simulada nos testes | D12 |

Nenhuma substitui tecnologia exigida pelo PDF (React, Vite e Biome continuam).
