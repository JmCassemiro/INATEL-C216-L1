<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.1.0
Bump rationale: MINOR — nova decisão (C-11, Clean Architecture) e mudança material de escopo da
spec 002 (recorte da Prática 4); inclui também a transição 002 planned → specced.

Changes this revision:
  - Decision recorded: C-11 — Clean Architecture obrigatória no back-end (constituição v2.0.0,
    Princípios IV e V)
  - Status: 002 planned → specced (specs/002-produtos/)
  - Scope changed on 002: Prática 4 cobre só o CRUD de produtos (em memória); estoque, alertas,
    restrição de preço por papel e persistência ficam pendentes dentro da 002
  - Decisões da spec 002 registradas: código de barras GTIN com dígito verificador; remoção por
    inativação com código reservado
  - Open question Q6 parcialmente resolvida: Prática 4 → spec 002 (recorte CRUD)

Specs affected: 002
Open questions added/resolved: Q6 parcialmente resolvida

Notes: emenda feita logo após a constituição 2.0.0 e o /speckit-specify da 002. Histórico da
1.0.0 (2026-10-02): criação inicial — visão, C-01 a C-10, specs 001–010, Q1–Q6.
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
  Ainda não consta na constituição (Princípio III diz "a definir"): confirmar contra o PDF da
  Prática de front-end e, então, emendar a constituição (MINOR). Se o PDF exigir outra
  tecnologia, o PDF prevalece (Princípio II). _Fonte: visão §6._
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

### 002 — Produtos e estoque  [status: specced]

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

### 004 — Vendas  [status: planned]

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

### 007 — Painel web administrativo  [status: planned]

- **Description:** interface web do Admin (e do Gerente, no que couber) em cima das specs
  001–006.
- **Outcome:** o Admin faz login no navegador e gerencia funcionários, produtos, estoque e
  clientes, e vê o dashboard com gráficos.
- **Scope (in):** login, telas de funcionários, produtos/estoque, clientes/crediário e dashboard
  com gráficos; tema claro e escuro.
- **Scope (out):** tela de venda do caixa (spec 008).
- **Depends on:** 001–006 (cada tela depende da spec da sua API)
- **Governed by:** C-03
- **Addresses:** docs/product/visao.md §6, jornada 3

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

**Version**: 1.1.0 | **Ratified**: 2026-10-02 | **Last Amended**: 2026-10-03
