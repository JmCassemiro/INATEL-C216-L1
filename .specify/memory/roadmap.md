<!--
SYNC IMPACT REPORT
==================
Version change: 1.6.0 → 1.7.0
Bump rationale: MINOR — andamento do C-12: as três etapas de código concluídas; começa o
  fechamento.

Changes this revision (1.7.0, 2026-11-25):
  - 004: PR #14 mergeado em projeto-final (2026-11-24)
  - C-12, andamento: fechamento iniciado em 2026-11-25 (README com as seções do PDF; vídeo e PR
    projeto-final → main em seguida)

Specs affected: 004

Changes in 1.6.0 (2026-11-24):
  - Status: 004 specced → implemented (branch 004-vendas, PR → projeto-final, em revisão)
  - Notes on 004: o que ficou provado nos testes (concorrência sem impasse, idempotência)

Specs affected: 004

Changes in 1.5.0 (2026-11-24):
  - Status: 004 planned → specced (recorte de venda mínima em specs/004-vendas/)
  - Notes on 004: decisões da spec (saldo nunca negativo, troco só em dinheiro, preço do momento,
    id da venda criado no painel para envio idempotente, número legível atribuído pelo banco)
  - 011: PR #13 mergeado em projeto-final (2026-11-24)

Specs affected: 004, 011

Changes in 1.4.0 (2026-11-24):
  - Status: 011 specced → implemented (PR #13 → projeto-final, em revisão; CI verde)
  - Status: 007 specced → in-progress (seção de produtos entregue no PR #11; reforma visual e
    página de entrada no PR #12; telas de estoque entregues pela 011)
  - C-12, andamento: o estoque ficou pronto em 2026-11-24, dentro da condição da venda mínima;
    decidido fazer a venda mínima (004) a partir de 2026-11-25 e o fechamento em 26 ou 27/11

Specs affected: 007, 011

Changes in 1.3.0 (2026-11-24):
  - Spec added: 011 — Controle de estoque [specced] (specs/011-estoque/)
  - Scope changed on 002: estoque, mínimo e alertas passam para a 011; resta a alteração de
    preço só por Admin

Specs affected: 002, 011

Changes in 1.2.0 (2026-11-19):
  - Decision confirmed: C-03 — stack de front-end confirmada e registrada na constituição v2.1.0
    (Princípio III)
  - Decision recorded: C-12 — Projeto Final (prazo 2026-11-28): 007 painel de produtos →
    estoque → venda mínima (esta só se o estoque terminar até 2026-11-24)
  - Status: 002 specced → in-progress (CRUD implementado e persistido em PostgreSQL; estoque e
    preço por papel pendentes)
  - Status: 007 planned → specced (specs/007-painel-produtos/)
  - Scope changed on 007: o Projeto Final cobre só o painel de produtos, que substitui o
    laboratório de itens (Práticas 6 e 7); as demais telas ficam pendentes dentro da 007
  - Decisão da spec 007 registrada: a listagem da API passa a ser do mais recente para o mais
    antigo (altera o FR-009 da 002)
  - Notes on 004: recorte possível de venda mínima no Projeto Final (C-12)
  - Open question Q6 resolvida: Práticas encerradas na 7; Projeto Final → C-12

Specs affected: 002, 004, 007
Open questions added/resolved: Q6 resolvida

Notes: emenda feita logo após a constituição 2.1.0 e o /speckit-specify da 007. Histórico:
1.0.0 (2026-10-02) criação inicial — visão, C-01 a C-10, specs 001–010, Q1–Q6; 1.1.0
(2026-10-03) C-11, 002 specced com o recorte da Prática 4, Q6 parcialmente resolvida.
-->

# NexoPDV — Spec Roadmap

Mapa vivo e não vinculante das specs planejadas para o NexoPDV. **Não é um compromisso de ordem
nem de escopo**: registra a visão, as decisões, as escolhas de tecnologia, os resultados
esperados e as restrições discutidos antes das specs existirem, para que não se percam até o
momento em que cada spec for escrita. Cada spec é detalhada e esclarecida quando for iniciada.
Fundamentos: a [constituição](constitution.md) do projeto e o documento de visão
[docs/product/visao.md](../../docs/product/visao.md).

Status legend (lifecycle): **undecided** · **needs-info** · **planned** ·
**specced** · **in-progress** · **implemented** · **verified** · **deferred** ·
**abandoned**.

---

## Vision & End States

O NexoPDV é um sistema híbrido de automação comercial (frente de caixa) e gestão de retaguarda
(ERP) para lojas de varejo físico de pequeno e médio porte, com arquitetura offline-first.

- O caixa da loja vende normalmente sem internet; quando a conexão volta, vendas e estoque são
  sincronizados automaticamente com a nuvem, **sem perda e sem duplicação** de vendas.
- O dono gerencia a loja pelo painel web: funcionários e papéis, produtos, preços e estoque,
  clientes e crediário, relatórios financeiros.
- Toda operação financeira é **auditável**: cada turno de caixa e cada venda ficam vinculados ao
  funcionário que os realizou.
- O acesso é seguro e restrito por papel (Admin, Gerente, Operador), validado no back-end.
- A nota fiscal é emitida por meio de uma API fiscal parceira.

## Constraints & Decisions

- **C-01 — Autenticação e autorização:** login com JWT com tempo de expiração; senhas armazenadas
  apenas como hash seguro (bcrypt ou argon2); restrição de rotas por papel (RBAC) aplicada no
  FastAPI. _Fonte: visão §3 (Segurança)._
- **C-02 — Infraestrutura da nuvem:** API administrativa em FastAPI e banco central PostgreSQL,
  em containers Docker. _Governed by: constituição, Princípio III._
- **C-03 — Front-end:** React + TypeScript, Tailwind CSS + shadcn/ui, com tema claro e escuro.
  ~~Ainda não consta na constituição (Princípio III diz "a definir"): confirmar contra o PDF da
  Prática de front-end e, então, emendar a constituição (MINOR). Se o PDF exigir outra
  tecnologia, o PDF prevalece (Princípio II).~~ **Confirmado em 2026-11-19:** os PDFs da
  Prática 6 e do Projeto Final exigem React, Vite e Biome e permitem TypeScript; a stack completa
  (React 19 + TypeScript + Vite, Tailwind CSS + shadcn/ui, Biome, Vitest + Testing Library,
  Playwright) consta na constituição v2.1.0. _Fonte: visão §6. Governed by: constituição v2.1.0,
  Princípio III._
- **C-04 — Offline-first:** o caixa precisa operar sem internet e sincronizar depois. Ordem
  adotada: construir primeiro o sistema online (API e painel) e o caixa offline por último,
  quando a API já estiver estável. _Fonte: visão §1 e §5._
- **C-05 — Nota fiscal delegada:** a emissão é feita por uma API parceira (ex.: Focus NFe,
  PlugNotas), consumida de forma assíncrona; o NexoPDV não emite nota fiscal por conta própria.
  _Fonte: visão §5 e §7._
- **C-06 — Fora do escopo:** recuperação de senha por e-mail (o Admin redefine a senha pelo
  painel), emissão própria de nota fiscal, integração com maquininha de cartão (TEF) e
  e-commerce (por enquanto). _Fonte: visão §7._
- **C-07 — Tema livre:** o professor não impõe domínio; os requisitos técnicos de cada PDF de
  Prática são aplicados ao NexoPDV.
- **C-08 — Papéis:** três papéis.
  - **Admin:** acesso total, incluindo financeiro e gestão de funcionários.
  - **Gerente:** aprova descontos e cancelamentos no balcão; não vê lucro nem relatórios
    financeiros.
  - **Operador:** vende, abre e fecha o próprio turno.
- **C-09 — Uma loja por instalação:** o sistema atende uma única loja (sem multi-loja nem SaaS
  multiempresa).
- **C-10 — Vários caixas por loja:** uma loja pode ter vários caixas operando ao mesmo tempo,
  inclusive offline simultaneamente; a sincronização precisa suportar isso.
- **C-11 — Clean Architecture no back-end (desde a Prática 4):** código organizado em domínio,
  aplicação (casos de uso), adaptadores de interface (rotas e schemas) e infraestrutura, com
  dependências apontando para dentro e acesso a dados por portas (repositórios). Aplicar SOLID e
  padrões de projeto quando se pagarem, sem abstração sem propósito; cada escolha justificada no
  `plan.md`. Escolhido para que o projeto sirva de referência profissional e de estudo. _Governed
  by: constituição v2.0.0, Princípios IV e V._
- **C-12 — Recorte do Projeto Final (prazo 2026-11-28):** o PDF do Projeto Final exige CRUD
  completo de um recurso principal pela interface, além do fluxo interface → API → banco em
  containers. Ordem decidida em 2026-11-19:
  1. **007 — painel de produtos** (recorte da 007), que substitui o laboratório de itens;
  2. **estoque** (parte pendente da 002), numa spec própria com número a definir;
  3. **venda mínima** (recorte da 004, sem vínculo com operador e turno), **só se** o estoque
     estiver concluído até 2026-11-24; caso contrário, o tempo restante vai para o fechamento
     (README, vídeo e PR `projeto-final` → `main`).

  O código vai para a branch `projeto-final`; cada spec sai dela e volta para ela por PR. O que
  não couber no prazo continua no roadmap para depois da entrega. _Fonte: PDF do Projeto Final
  (não versionado); Governed by: constituição v2.1.0, Princípio II._

  **Andamento (2026-11-24):** etapa 1 entregue (007, PR #11, merge em 2026-11-19), mais a reforma
  visual e a página de entrada (PR #12, merge em 2026-11-24). Etapa 2 implementada em
  2026-11-24 (011, PR #13, CI verde, aguardando merge): a condição da etapa 3 foi atendida no
  prazo. **Decidido com o usuário (2026-11-24):** fazer a venda mínima (spec 004, recorte abaixo)
  a partir de 2026-11-25 e o fechamento na quinta (2026-11-26) ou na sexta (2026-11-27), com o
  sábado (2026-11-28) de folga para a entrega. O fechamento inclui README com as seções do PDF e
  o link do vídeo, o vídeo gravado pelo usuário e o PR `projeto-final` → `main` com os checks
  verdes, que nunca é mergeado.

  **Andamento (2026-11-25):** etapa 3 entregue (004, PR #14, merge em 2026-11-24). As três
  etapas de código estão em `projeto-final`; o fechamento começou um dia antes do previsto.

## Planned Specs

### Back-end (API na nuvem)

### 001 — Usuários e autenticação  [status: planned]

- **Description:** login com JWT, armazenamento de senha com hash e controle de acesso por papel;
  o Admin cadastra funcionários e define o papel de cada um.
- **Outcome:** um funcionário faz login e recebe um token com expiração; rotas protegidas recusam
  requisições sem token ou com papel insuficiente; o Admin gerencia funcionários.
- **Scope (in):** login, emissão e validação de JWT, hash de senha, papéis Admin/Gerente/Operador
  (C-08), cadastro, edição e desativação de funcionários pelo Admin, redefinição de senha pelo
  Admin.
- **Scope (out):** recuperação de senha por e-mail (C-06); login offline no caixa (spec 009).
- **Depends on:** none
- **Governed by:** C-01, C-08, C-06
- **Addresses:** docs/product/visao.md §2, §3 (Segurança), jornada 3
- **Notes:** proposta a confirmar na spec: "demitir" = **desativar** o funcionário, nunca
  excluir, para que vendas e turnos antigos continuem apontando para ele (auditoria).

### 002 — Produtos e estoque  [status: in-progress]

- **Description:** cadastro de produtos com código de barras e preço, e controle de estoque com
  quantidade mínima e alerta de reposição.
- **Outcome:** o Admin cadastra produtos; é possível buscar um produto pelo código de barras;
  produtos abaixo do estoque mínimo aparecem em alerta.
- **Scope (in):** CRUD de produtos, código de barras único, preço, quantidade em estoque,
  estoque mínimo, consulta de produtos em alerta; alteração de preço só por Admin.
  - **Recorte da Prática 4 (especificado em `specs/002-produtos/`):** cadastro, consulta por id e
    por código de barras, listagem paginada com busca por nome, substituição (PUT), alteração
    parcial (PATCH) e remoção por inativação (DELETE), com dados em memória.
  - **Pendente dentro da 002 (fora do recorte da Prática 4):** quantidade em estoque, estoque
    mínimo e alertas de reposição; alteração de preço só por Admin (depende da 001); persistência
    em banco (próxima Prática).
- **Scope (out):** baixa de estoque por venda (spec 004); sincronização de estoque entre caixas
  (spec 009).
- **Depends on:** 001
- **Governed by:** C-01, C-08
- **Addresses:** docs/product/visao.md §3 (Controle de Estoque)
- **Spec dir:** specs/002-produtos/
- **Notes:** decisões da spec (2026-10-03): código de barras no padrão GTIN (8, 12, 13 ou 14
  dígitos) com dígito verificador validado — regra de domínio; remoção é inativação (registro
  mantido, código de barras continua reservado), coerente com a nota de auditoria. Reativação de
  produto removido fica para uma spec futura.
  **Andamento (2026-11-19):** o recorte da Prática 4 foi implementado (PR #7) e a persistência em
  PostgreSQL entrou na Prática 5. Continuam pendentes: estoque, estoque mínimo e alertas, que
  viram uma spec própria no Projeto Final (C-12, número a definir), e a alteração de preço só
  por Admin (depende da 001). A spec 007 inverte a ordem padrão da listagem (FR-009 daqui):
  mais recentes primeiro.
  **2026-11-24:** estoque, estoque mínimo e alertas saíram da 002 para a spec **011**; aqui
  resta só a alteração de preço restrita ao Admin (depende da 001).

### 011 — Controle de estoque  [status: implemented]

- **Description:** quantidade em estoque e estoque mínimo por produto, entrada de mercadoria,
  ajuste com motivo obrigatório, histórico de movimentações e lista de reposição, na API e no
  painel (seção Estoque).
- **Outcome:** o lojista registra entradas e ajustes pelo painel, vê o saldo e o histórico de
  cada produto, e os produtos abaixo do mínimo aparecem na lista de reposição e nos indicadores.
- **Scope (in):** saldo que só muda por movimentação; entrada (com observação opcional) e ajuste
  para mais ou para menos (com motivo obrigatório); saldo nunca negativo; movimentações imutáveis;
  movimentações simultâneas sem perda; estoque mínimo no formulário de produto; lista de reposição
  (quantidade < mínimo, maior falta primeiro); seção Estoque com indicadores; quantidade na lista
  de produtos.
- **Scope (out):** baixa por venda (004); sincronização entre caixas e estoque negativo offline
  (009, Q3); autoria das movimentações (001); estoque inicial no cadastro; quantidades
  fracionadas; fornecedores e pedidos de compra; estorno ou edição de movimentações.
- **Depends on:** 002, 007
- **Governed by:** C-11, C-12
- **Addresses:** docs/product/visao.md §3 (Controle de Estoque)
- **Spec dir:** specs/011-estoque/
- **Notes:** desmembrada da 002 no Projeto Final (C-12). Número 011, e não o próximo sequencial
  (008), para que o número da pasta continue igual ao da entrada do roadmap. Decisões da spec
  (2026-11-24): "para repor" é quantidade **menor** que o mínimo (mínimo 0 desliga o alerta);
  ajuste informado como diferença (adicionar ou retirar), não como novo saldo contado, para que
  ajustes simultâneos se somem; limites de 99.999 por movimentação e 999.999 de saldo.
  **Implementada em 2026-11-24** (PR #13, 11 commits, CI verde, mergeado em `projeto-final` no
  mesmo dia): movimentações simultâneas
  serializadas por `SELECT … FOR UPDATE` na linha do produto, com teste de 50 entradas
  simultâneas no PostgreSQL (`make test-postgres`); o cadastro do produto deixou de gravar o
  saldo, para não apagar uma entrada concorrente. Falta o `/speckit-roadmap-debrief` para passar
  a `verified`.

### 003 — Turno de caixa  [status: planned]

- **Description:** abertura e fechamento de turno vinculados ao operador logado, com registro do
  fundo de troco.
- **Outcome:** o operador abre um turno informando o fundo de troco, e o fecha no fim do dia;
  fica registrado quem abriu, quem fechou, quando e com quais valores.
- **Scope (in):** abrir turno (com fundo de troco), fechar turno, consultar turno aberto, histórico
  de turnos por operador e por caixa.
- **Scope (out):** vendas dentro do turno (spec 004).
- **Depends on:** 001
- **Governed by:** C-08, C-10
- **Addresses:** docs/product/visao.md §3 (Abertura e Fechamento de Turno), jornada 1

### 004 — Vendas  [status: implemented]

- **Description:** registro de venda por código de barras, com pagamento dividido em vários meios,
  baixa de estoque e vínculo com o operador e o turno.
- **Outcome:** o operador registra uma venda com vários itens e um ou mais meios de pagamento; o
  estoque é baixado e a venda fica vinculada ao operador e ao turno.
- **Scope (in):** criar venda, adicionar itens por código de barras, múltiplos meios de pagamento
  (ex.: Pix + cartão), baixa de estoque, desconto com limite e aprovação do Gerente, cancelamento
  por Gerente ou Admin.
- **Scope (out):** venda no fiado (spec 005); nota fiscal (spec 010); venda offline (spec 009).
- **Depends on:** 002, 003
- **Governed by:** C-08, C-10
- **Addresses:** docs/product/visao.md §2, §3 (Venda Ágil, Múltiplos Meios de Pagamento),
  jornada 2
- **Notes:** propostas a confirmar na spec: uma venda nunca é excluída, só cancelada, com motivo
  e responsável registrados; cada venda tem um identificador UUID para permitir a sincronização
  idempotente da spec 009. O limite de desconto que exige aprovação é a pergunta Q4.
  **Recorte possível no Projeto Final (C-12):** venda mínima, com carrinho por código de barras,
  um ou mais meios de pagamento, troco, baixa de estoque na mesma transação e histórico de
  vendas. Fica de fora do recorte: vínculo com operador e turno (dependem da 001 e da 003),
  desconto com aprovação e cancelamento. Só entra se o estoque estiver concluído até 2026-11-24.
  **Confirmado em 2026-11-24:** o estoque (011) ficou pronto no prazo, e o recorte de venda mínima
  será especificado a seguir, em `specs/004-…`, com prazo até 2026-11-26.
  **Especificada em 2026-11-24** (`specs/004-vendas/`): venda pelo painel, com carrinho por código
  de barras ou busca por nome, até 5 pagamentos (dinheiro, Pix, crédito, débito), troco só em
  dinheiro, baixa de estoque na mesma transação (movimentação do tipo "Venda") e histórico com
  indicadores do dia. Decisões: saldo nunca negativo (venda sem saldo é recusada; Q3 continua para
  a 009); preço do momento da venda, e preço alterado no meio da venda recusa a finalização; o id
  (UUID) da venda é criado no painel e torna o envio idempotente, base da sincronização da 009; o
  número legível é atribuído pelo banco. Continuam fora: operador e turno, desconto (Q4) e
  cancelamento.
  **Implementada em 2026-11-24** (branch `004-vendas`, 11 commits, PR #14, merge em
  `projeto-final` no mesmo dia): a
  venda trava os produtos em ordem de id; no PostgreSQL, 25 vendas disputando 20 unidades
  registram exatamente 20, e vendas com os mesmos produtos em ordens opostas terminam sem
  impasse. Falta o `/speckit-roadmap-debrief` para passar a `verified`. O restante da 004
  (operador, turno, desconto e cancelamento) continua planejado para depois da entrega.
- **Spec dir:** specs/004-vendas/

### 005 — Clientes e crediário  [status: planned]

- **Description:** cadastro de clientes da loja e conta corrente de crediário ("fiado").
- **Outcome:** um cliente cadastrado compra no fiado, o valor entra na conta dele, e ele quita o
  saldo de forma consolidada (por exemplo, no fim do mês).
- **Scope (in):** cadastro de clientes, crediário como meio de pagamento na venda, saldo e
  extrato da conta, registro de pagamento do saldo.
- **Scope (out):** juros, limite de crédito automático e cobrança (podem virar extra depois).
- **Depends on:** 004
- **Addresses:** docs/product/visao.md §3 (Gestão de Clientes e Crediário)

### 006 — Dashboard financeiro  [status: planned]

- **Description:** indicadores financeiros exclusivos do Admin.
- **Outcome:** o Admin consulta faturamento diário, produtos mais vendidos da semana e ticket
  médio; Gerente e Operador recebem acesso negado.
- **Scope (in):** endpoints de faturamento por dia, ranking de produtos mais vendidos por período
  e ticket médio, restritos ao Admin.
- **Scope (out):** gráficos e telas (spec 007).
- **Depends on:** 004
- **Governed by:** C-01, C-08
- **Addresses:** docs/product/visao.md §3 (Dashboard Financeiro)

### Front-end

### 007 — Painel web administrativo  [status: in-progress]

- **Description:** interface web do Admin (e do Gerente, no que couber) em cima das specs
  001–006.
- **Outcome:** o Admin faz login no navegador e gerencia funcionários, produtos, estoque e
  clientes, e vê o dashboard com gráficos.
- **Scope (in):** login, telas de funcionários, produtos/estoque, clientes/crediário e dashboard
  com gráficos; tema claro e escuro.
  - **Recorte do Projeto Final (especificado em `specs/007-painel-produtos/`):** a seção de
    produtos do painel, com listagem paginada e busca por nome, cadastro, edição e remoção com
    confirmação, e estados de carregamento, sucesso e erro; identidade visual do NexoPDV, tema
    claro e escuro e estrutura de navegação pronta para as próximas seções. Substitui o
    laboratório de itens das Práticas 6 e 7 (API, tabela e telas) e libera no CORS os métodos que
    o painel usa.
  - **Pendente dentro da 007:** login (depende da 001), telas de estoque (depende da spec de
    estoque), funcionários, clientes/crediário e dashboard (dependem das specs das APIs delas).
- **Scope (out):** tela de venda do caixa (spec 008).
- **Depends on:** 001–006 (cada tela depende da spec da sua API). O recorte do painel de
  produtos depende só da 002.
- **Governed by:** C-03, C-12
- **Addresses:** docs/product/visao.md §6, jornada 3
- **Spec dir:** specs/007-painel-produtos/
- **Notes:** decisões da spec (2026-11-19): sem login no recorte, pois a 001 ainda não existe
  (qualquer pessoa com acesso ao endereço opera o catálogo); a listagem da API passa a ser do
  mais recente para o mais antigo, para que o produto recém-cadastrado apareça no topo (altera
  o FR-009 da 002); a remoção dos dados de itens é feita por uma migração nova, sem reescrever as
  já registradas.
  **Andamento (2026-11-24):** seção de produtos entregue (PR #11); reforma visual com menu lateral
  e página de entrada em `/` (PR #12); as telas de estoque saíram da lista de pendências e foram
  entregues pela spec 011 (PR #13). Continuam pendentes: login, funcionários,
  clientes/crediário e dashboard.

### 008 — App do caixa (desktop)  [status: needs-info]

- **Description:** aplicativo instalado no computador do balcão, focado em venda ágil.
- **Outcome:** _to be defined_ — depende da tecnologia do desktop (Q2).
- **Scope (in):** _to be defined_ — previsto: login do operador, abertura e fechamento de turno,
  tela de venda com leitura contínua de código de barras.
- **Depends on:** 003, 004
- **Governed by:** C-03, C-04
- **Addresses:** docs/product/visao.md §1, §6, jornadas 1 e 2
- **Notes:** sai de `needs-info` quando a Q2 for respondida.

### Sistema distribuído

### 009 — Operação offline e sincronização  [status: needs-info]

- **Description:** o caixa registra vendas sem internet numa base local e as envia à nuvem quando
  a conexão volta.
- **Outcome:** _to be defined_ — depende de Q1, Q2 e Q3.
- **Scope (in):** _to be defined_ — previsto: fila local de vendas, envio automático na
  reconexão, idempotência por UUID da venda, vários caixas offline ao mesmo tempo (C-10),
  atualização do catálogo de produtos no caixa.
- **Depends on:** 008
- **Governed by:** C-04, C-10
- **Addresses:** docs/product/visao.md §1, §5 (Sincronização Assíncrona)
- **Notes:** é o núcleo "distribuído" do projeto (réplicas locais, consistência eventual,
  conflitos). Deixado por último de propósito (C-04).

### 010 — Nota fiscal  [status: needs-info]

- **Description:** emissão de nota fiscal da venda por meio de uma API fiscal parceira,
  de forma assíncrona.
- **Outcome:** _to be defined_ — depende de Q5.
- **Scope (in):** _to be defined_ — previsto: solicitar a nota após a venda sem travar o caixa,
  consultar o status e registrar falhas para nova tentativa.
- **Depends on:** 004
- **Governed by:** C-05
- **Addresses:** docs/product/visao.md §5 (Integração com API Externa), §7

## Open Questions

- **Q1 — Login offline do operador:** o JWT expira; se a internet cair por muito tempo, como o
  operador faz login no caixa? (ex.: credencial validada localmente, com cache no app). Bloqueia
  a spec 009.
- **Q2 — Tecnologia do app desktop:** Electron ou Tauri (empacotando o React) ou outra opção; e o
  banco local (ex.: SQLite). Bloqueia as specs 008 e 009.
- **Q3 — Conflito de estoque entre caixas offline:** dois caixas vendem a última unidade sem
  internet. Proposta: aceitar as duas vendas (o cliente já levou o produto), permitir estoque
  negativo e gerar alerta. Confirmar na spec 009.
- **Q4 — Limite de desconto:** a partir de qual valor ou percentual o desconto exige aprovação do
  Gerente? Resolver na spec 004.
- **Q5 — Nota fiscal no projeto:** qual API (Focus NFe, PlugNotas...) e se usamos o ambiente de
  homologação (sandbox) dela ou uma versão simulada, já que a nota real exige CNPJ e certificado
  digital. Bloqueia a spec 010.
- **Q6 — Prática de cada spec:** a ordem e o encaixe nas Práticas são definidos conforme cada PDF
  chega; o PDF pode pedir uma combinação diferente de specs.
  _Parcialmente resolvida (2026-10-03): Prática 4 → spec 002, recorte CRUD de produtos._
  _Resolvida (2026-11-19): as Práticas terminaram na 7. A Prática 5 trouxe a persistência da 002
  em PostgreSQL; as Práticas 6 e 7 foram laboratórios (gerenciador de itens) fora das specs. O
  Projeto Final segue a C-12: 007 (painel de produtos), estoque e venda mínima se houver tempo._

## Cross-Cutting Notes

- **Auditoria:** registros financeiros (vendas, turnos, pagamentos) nunca são excluídos; mudanças
  de estado (cancelamento, desativação) guardam quem fez, quando e por quê.
- **Valores monetários:** sugestão para as specs com dinheiro: usar `Decimal` (ou centavos em
  inteiro), nunca `float`, para evitar erros de arredondamento.
- **Identificadores das vendas:** UUID gerado na origem (o caixa), para que a sincronização da
  spec 009 possa reenviar sem duplicar.
- **Autorização no back-end:** as restrições por papel valem na API, não só na interface; o
  front-end apenas esconde o que o papel não pode usar.

---

**Version**: 1.7.0 | **Ratified**: 2026-10-02 | **Last Amended**: 2026-11-25
