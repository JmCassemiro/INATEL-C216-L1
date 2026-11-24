# Feature Specification: Controle de Estoque

**Feature Branch**: `011-estoque`

**Created**: 2026-11-24

**Status**: Draft

**Input**: Parent roadmap: `.specify/memory/roadmap.md` → entry **002 — Produtos e estoque** (parte
pendente) e decisão **C-12** (segunda etapa do Projeto Final). Quantidade em estoque e estoque
mínimo por produto, entrada de mercadoria, ajuste de estoque com motivo obrigatório, histórico de
movimentações por produto e lista de produtos que precisam de reposição, na API e no painel (seção
Estoque, hoje marcada como "em breve").

## Contexto

O catálogo de produtos já é operado pelo painel (spec 007), mas o sistema não sabe quantas
unidades de cada produto a loja tem. A visão do NexoPDV pede um "controle de estoque inteligente":
controle simples de quantidade e um estoque mínimo com alerta de reposição.

Esta feature dá ao lojista o controle do estoque da loja: ele registra a mercadoria que chega,
corrige o saldo quando a contagem não bate ou quando há perda, define o mínimo de cada produto e
vê quais produtos precisam ser repostos. Todo saldo é explicado por um histórico de movimentações
que não se apaga nem se edita, coerente com a regra de auditoria do roadmap.

É também a feature com regras de negócio próprias do NexoPDV no Projeto Final (C-12): vai além do
CRUD de produtos e envolve uma regra típica de sistemas distribuídos, a de que operações
simultâneas sobre o mesmo saldo não podem se perder.

**Fora desta spec** (registrado no roadmap): baixa de estoque por venda (spec 004); sincronização
de estoque entre caixas e estoque negativo em vendas offline (spec 009, pergunta Q3); registro de
quem fez cada movimentação (depende do login, spec 001); estoque inicial no formulário de cadastro
do produto; quantidades fracionadas (produtos vendidos a granel ou por peso); fornecedores e
pedidos de compra; transferência entre lojas (C-09); estorno ou edição de movimentações.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar a entrada de mercadoria e ver o saldo (Priority: P1)

A mercadoria chega do fornecedor. O lojista abre a seção Estoque, encontra o produto e registra a
entrada com a quantidade recebida e, se quiser, uma observação (por exemplo, o número da nota do
fornecedor). O saldo do produto aumenta na hora.

**Why this priority**: sem saldo não existe controle de estoque; é o primeiro dado que o lojista
precisa ver e a base das demais histórias (mínimo, ajuste e histórico).

**Independent Test**: com produtos já cadastrados, abrir a seção Estoque, registrar uma entrada
num produto, ver o novo saldo, recarregar a página e conferir que o saldo continua o mesmo.

**Acceptance Scenarios**:

1. **Given** produtos cadastrados, **When** o lojista abre a seção Estoque, **Then** vê cada
   produto ativo com o nome, a quantidade em estoque e o estoque mínimo, em ordem alfabética, em
   páginas de 10, com busca por parte do nome.
2. **Given** um produto recém-cadastrado, **When** o lojista o procura na seção Estoque, **Then**
   ele aparece com quantidade 0 e marcado como sem estoque.
3. **Given** o produto "Camiseta Básica Branca M" com 12 unidades, **When** o lojista registra
   uma entrada de 24 unidades com a observação "NF 1234", **Then** vê a confirmação de sucesso e
   o saldo passa a 36, sem recarregar a página.
4. **Given** uma entrada registrada, **When** o lojista recarrega a página ou o sistema é
   reiniciado, **Then** o saldo continua o mesmo.
5. **Given** o formulário de entrada, **When** o lojista informa quantidade vazia, zero, negativa,
   fracionada ou acima de 99.999, **Then** nada é enviado e o campo mostra o motivo.
6. **Given** uma entrada que levaria o saldo acima de 999.999 unidades, **When** o lojista
   confirma, **Then** a entrada é recusada com uma mensagem clara e o saldo não muda.
7. **Given** a lista de produtos (seção Produtos), **When** o lojista a abre, **Then** vê a
   quantidade em estoque de cada produto ao lado dos demais dados.
8. **Given** que o servidor está indisponível, **When** o lojista confirma uma entrada, **Then** vê
   uma mensagem de erro, os dados digitados continuam no formulário e o saldo não muda.

---

### User Story 2 - Definir o estoque mínimo e ver o que precisa de reposição (Priority: P2)

O lojista define, para cada produto, a quantidade mínima que quer ter na loja. Quando o saldo de
um produto fica abaixo desse mínimo, o produto passa a constar da lista de reposição, que mostra
primeiro o que está mais urgente.

**Why this priority**: é o "alerta de reposição" da visão e o resultado esperado da entrada 002
do roadmap; transforma o saldo numa decisão de compra.

**Independent Test**: definir o mínimo de um produto acima do saldo atual, conferir que ele entra
na lista de reposição e que sai dela depois de uma entrada que leve o saldo ao mínimo.

**Acceptance Scenarios**:

1. **Given** o formulário de cadastro ou de edição de um produto, **When** o lojista informa o
   estoque mínimo 10 e confirma, **Then** o produto passa a ter mínimo 10; quando o campo fica
   vazio no cadastro, o mínimo é 0.
2. **Given** um produto com 4 unidades e mínimo 10, **When** o lojista abre a seção Estoque,
   **Then** o produto aparece marcado como "Repor", com a falta para o mínimo (6 unidades).
3. **Given** produtos abaixo do mínimo, **When** o lojista filtra a seção Estoque por "Para
   repor", **Then** vê só esses produtos, do que tem a maior falta para o mínimo ao de menor falta
   (empate pelo nome).
4. **Given** um produto com 10 unidades e mínimo 10, **When** o lojista consulta a lista de
   reposição, **Then** o produto não está nela: ter exatamente o mínimo não é falta.
5. **Given** um produto com mínimo 0, **When** o saldo dele chega a 0, **Then** ele aparece como
   sem estoque, mas não entra na lista de reposição: mínimo 0 significa que o lojista não
   controla o mínimo desse produto.
6. **Given** um produto na lista de reposição, **When** o lojista registra uma entrada que leva o
   saldo ao mínimo ou acima, **Then** o produto sai da lista sem recarregar a página.
7. **Given** o painel, **When** existem produtos para repor, **Then** a quantidade deles aparece
   no menu lateral (seção Estoque) e nos indicadores da seção Produtos, com atalho para a lista de
   reposição.
8. **Given** o formulário de produto, **When** o lojista informa um mínimo negativo, fracionado ou
   acima de 99.999, **Then** nada é enviado e o campo mostra o motivo.

---

### User Story 3 - Ajustar o saldo com motivo (Priority: P3)

A contagem da prateleira não bate com o sistema, ou uma unidade quebrou, venceu ou foi usada na
loja. O lojista ajusta o saldo, para mais ou para menos, e é obrigado a dizer o motivo.

**Why this priority**: mantém o saldo fiel à realidade e explica cada correção; é menos frequente
que a entrada, mas sem ele o lojista não tem como registrar perdas.

**Independent Test**: retirar 2 unidades de um produto com o motivo "Avaria no transporte", ver o
saldo cair 2 e conferir que um ajuste sem motivo é recusado.

**Acceptance Scenarios**:

1. **Given** um produto com 36 unidades, **When** o lojista escolhe retirar 2 unidades com o
   motivo "Avaria no transporte" e confirma, **Then** vê a confirmação de sucesso e o saldo passa
   a 34.
2. **Given** um produto com 34 unidades, **When** o lojista escolhe adicionar 1 unidade com o
   motivo "Contagem de inventário", **Then** o saldo passa a 35.
3. **Given** o formulário de ajuste, **When** o lojista digita a quantidade, **Then** vê, antes de
   confirmar, o saldo atual e o saldo que vai ficar (ex.: 36 → 34).
4. **Given** o formulário de ajuste, **When** o motivo está vazio, só com espaços, com menos de 3
   ou mais de 200 caracteres, **Then** nada é enviado e o campo mostra o motivo da recusa.
5. **Given** um produto com 3 unidades, **When** o lojista tenta retirar 5, **Then** o ajuste é
   recusado com a mensagem de que o saldo não pode ficar negativo, e o saldo continua 3.
6. **Given** um ajuste que leva o saldo abaixo do mínimo, **When** é confirmado, **Then** o
   produto passa a constar da lista de reposição.

---

### User Story 4 - Consultar o histórico de movimentações (Priority: P4)

O lojista quer entender por que o saldo de um produto está como está. Ele abre o histórico do
produto e vê cada entrada e cada ajuste, do mais recente para o mais antigo.

**Why this priority**: é a trilha de auditoria do estoque; o saldo já funciona sem ela, mas sem
ela ninguém consegue explicar uma diferença.

**Independent Test**: depois de uma entrada e um ajuste num produto, abrir o histórico dele e
conferir as duas movimentações com data, tipo, quantidade, saldo resultante e texto.

**Acceptance Scenarios**:

1. **Given** um produto com movimentações, **When** o lojista abre o histórico dele, **Then** vê
   as movimentações da mais recente para a mais antiga, cada uma com data e hora, tipo (entrada ou
   ajuste), quantidade com sinal (+24, −2), saldo depois da movimentação e a observação ou o
   motivo.
2. **Given** um produto com mais de 10 movimentações, **When** o lojista navega no histórico,
   **Then** vê as movimentações em páginas de 10.
3. **Given** um produto sem movimentações, **When** o lojista abre o histórico, **Then** vê que
   ainda não há movimentações e o atalho para registrar a primeira entrada.
4. **Given** uma movimentação registrada, **When** o lojista consulta o histórico, **Then** não
   existe opção de editá-la nem de apagá-la; uma correção é feita com um novo ajuste.
5. **Given** o histórico de um produto, **When** o lojista soma as quantidades de todas as
   movimentações, **Then** o resultado é igual ao saldo atual do produto.

---

### Edge Cases

- **Operações simultâneas no mesmo produto** (duas abas, ou dois funcionários): todas as
  movimentações confirmadas são aplicadas, nenhuma se perde, e o saldo final é a soma de todas
  elas. Cada movimentação mostra no histórico o saldo correto logo depois dela.
- **Retirada simultânea da última unidade**: se duas retiradas concorrentes juntas levariam o saldo
  abaixo de zero, só a que chegar primeiro é aplicada; a outra é recusada e o saldo nunca fica
  negativo.
- **Produto removido** (inativado, spec 002): não aparece na seção Estoque nem na lista de
  reposição, e não aceita movimentações; as movimentações que ele já tinha são guardadas, não
  apagadas.
- **Produto removido em outra aba** enquanto o formulário de entrada ou de ajuste está aberto: ao
  confirmar, o painel informa que o produto não existe mais e atualiza a lista.
- **Saldo exibido desatualizado** (outra aba registrou uma movimentação): o ajuste vale sobre o
  saldo real do momento em que é aplicado; a prévia "atual → fica" é só uma referência e a lista
  se atualiza depois da operação.
- **Envio duplicado** (duplo clique, Enter repetido): a mesma entrada não é registrada duas vezes
  pelo mesmo formulário.
- **Produtos existentes antes desta feature**: passam a ter quantidade 0 e mínimo 0, sem nenhuma
  movimentação.
- **Mudança do mínimo**: não é uma movimentação e não altera o saldo; o produto entra ou sai da
  lista de reposição na hora.
- **Observação e motivo longos**: o texto é resumido no histórico e continua acessível por
  inteiro.
- **Quantidade digitada com separador de milhar** (ex.: "1.000"): aceita como mil unidades.
- **Telas estreitas (360 px)**: a seção Estoque, os formulários e o histórico continuam usáveis,
  sem rolagem horizontal da página.

## Requirements *(mandatory)*

### Functional Requirements

**Saldo e entrada**

- **FR-001**: Cada produto ativo MUST ter uma quantidade em estoque (inteiro, nunca negativo) e um
  estoque mínimo (inteiro de 0 a 99.999). Um produto novo começa com quantidade 0 e, se o
  lojista não informar outro valor, mínimo 0.
- **FR-002**: A quantidade em estoque MUST mudar apenas por movimentações (entrada ou ajuste); o
  cadastro e a edição do produto MUST NOT alterá-la.
- **FR-003**: O sistema MUST permitir registrar a entrada de mercadoria num produto ativo, com
  quantidade inteira de 1 a 99.999 e observação opcional de até 200 caracteres; a entrada soma a
  quantidade ao saldo.
- **FR-004**: O saldo de um produto MUST NOT passar de 999.999 unidades; a movimentação que o
  levaria além disso é recusada sem alterar nada.

**Ajuste**

- **FR-005**: O sistema MUST permitir ajustar o saldo de um produto ativo, para mais ou para
  menos, com quantidade inteira de 1 a 99.999 e motivo obrigatório de 3 a 200 caracteres (sem
  contar espaços nas pontas).
- **FR-006**: Um ajuste que deixaria o saldo negativo MUST ser recusado com uma mensagem que diga
  o saldo disponível, sem alterar nada.

**Histórico**

- **FR-007**: Toda movimentação aplicada MUST ficar registrada com data e hora, tipo (entrada ou
  ajuste), quantidade com sinal, saldo resultante e observação ou motivo.
- **FR-008**: As movimentações MUST NOT ser editadas nem apagadas, inclusive quando o produto é
  removido; correções são feitas com novos ajustes.
- **FR-009**: O sistema MUST permitir consultar o histórico de um produto, da movimentação mais
  recente para a mais antiga, em páginas.
- **FR-010**: Em qualquer momento, a soma das quantidades das movimentações de um produto MUST ser
  igual ao saldo dele, e o saldo resultante de cada movimentação MUST ser o saldo anterior mais a
  quantidade dela.

**Concorrência**

- **FR-011**: Movimentações simultâneas sobre o mesmo produto MUST ser aplicadas uma de cada vez:
  nenhuma movimentação confirmada se perde, e as regras de saldo (FR-004 e FR-006) valem sobre o
  saldo real no momento em que cada uma é aplicada.

**Estoque mínimo e reposição**

- **FR-012**: O lojista MUST poder definir o estoque mínimo ao cadastrar e ao editar um produto.
- **FR-013**: Um produto MUST ser considerado "para repor" quando a quantidade em estoque é menor
  que o estoque mínimo; a falta para o mínimo é a diferença entre os dois. Com mínimo 0, o
  produto nunca está para repor.
- **FR-014**: O sistema MUST oferecer a lista de produtos para repor, ordenada da maior falta para
  a menor e, em caso de empate, pelo nome.
- **FR-015**: Produtos com quantidade 0 MUST ser identificados como "sem estoque", estejam ou não
  na lista de reposição.

**Seção Estoque do painel**

- **FR-016**: O painel MUST ter a seção Estoque, acessível pelo menu lateral (deixa de ser "em
  breve"), com a posição de estoque dos produtos ativos: nome, código de barras, quantidade,
  mínimo e situação (sem estoque, para repor ou em dia), em páginas de 10, em ordem alfabética,
  com busca por parte do nome.
- **FR-017**: A seção Estoque MUST permitir alternar entre todos os produtos e só os produtos para
  repor (na ordem de FR-014), e essa escolha, a busca e a página MUST ficar registradas no
  endereço da página.
- **FR-018**: A seção Estoque MUST mostrar indicadores com o número de produtos para repor, o
  número de produtos sem estoque e o valor total do estoque a preço de venda (soma de quantidade
  × preço dos produtos ativos). *(Extra — fora do PDF.)*
- **FR-019**: De cada produto da seção Estoque, o lojista MUST poder registrar uma entrada, fazer
  um ajuste e abrir o histórico.
- **FR-020**: O formulário de ajuste MUST deixar explícito se a quantidade será adicionada ou
  retirada e mostrar o saldo atual e o saldo resultante antes da confirmação. *(Extra — fora do
  PDF.)*
- **FR-021**: Os formulários de entrada e de ajuste MUST validar os dados antes de enviar, com as
  regras de FR-003 e FR-005, mostrando o motivo junto ao campo; erros devolvidos pelo servidor
  MUST aparecer junto ao campo quando o servidor indicar o campo, e como mensagem geral nos demais
  casos, preservando os dados digitados.
- **FR-022**: Durante um envio, o painel MUST indicar que está processando e MUST impedir o envio
  duplicado.
- **FR-023**: Toda operação concluída MUST gerar uma confirmação visível e breve, e a seção
  Estoque, a lista de produtos, os indicadores e o histórico MUST refletir o novo saldo sem que o
  lojista recarregue a página; toda falha MUST gerar uma mensagem em português, sem detalhes
  técnicos.
- **FR-024**: A seção Estoque e o histórico MUST distinguir, com mensagens próprias, os estados de
  carregando, lista vazia, busca sem resultado, nenhum produto para repor e erro ao carregar (com
  a opção de tentar de novo).

**Integração com o restante do painel e do site**

- **FR-025**: A lista de produtos (seção Produtos) MUST mostrar a quantidade em estoque de cada
  produto e destacar os que estão sem estoque ou para repor, e o formulário de produto MUST ter o
  campo de estoque mínimo, validado antes do envio.
- **FR-026**: O indicador "Estoque" da seção Produtos, hoje "em breve", MUST mostrar o número de
  produtos para repor, com atalho para a lista de reposição; o menu lateral MUST mostrar o mesmo
  número junto à seção Estoque quando ele for maior que zero.
- **FR-027**: A página de entrada do site MUST passar a apresentar o controle de estoque como
  disponível.
- **FR-028**: As telas novas MUST seguir as mesmas regras de acessibilidade, responsividade e
  tema do painel (spec 007, FR-019 a FR-021) e a identidade visual do NexoPDV, em que o amarelo
  da etiqueta de gôndola marca só valores em dinheiro.

### Requisitos de entrega do Projeto Final *(restrições do PDF — Princípio II)*

Estes requisitos vêm do PDF do Projeto Final e são, por natureza, técnicos; o *como* fica no
`plan.md`.

- **RP-001**: O estoque MUST funcionar no fluxo completo interface → API → banco: tudo o que esta
  spec descreve é operado pelo painel e persistido no PostgreSQL.
- **RP-002**: A API MUST ser REST em FastAPI, com validação dos dados e respostas HTTP adequadas
  a cada erro (dado inválido, produto inexistente, regra de saldo violada), mantendo a separação
  entre rotas, casos de uso, repositórios, schemas e modelos.
- **RP-003**: As mudanças no banco MUST ser feitas por uma migração versionada nova (Alembic),
  aplicada na subida do Compose, de modo que uma instalação existente e uma nova cheguem ao mesmo
  estado.
- **RP-004**: O frontend MUST usar formulários, listagens, chamadas HTTP e estados de
  carregamento, sucesso e erro também nas telas de estoque.
- **RP-005**: O CORS MUST continuar liberando exatamente os métodos HTTP que o frontend usa,
  incluindo os que esta feature introduzir.
- **RP-006**: As regras de negócio e os endpoints de estoque MUST ter testes com pytest; as telas,
  testes com Vitest e Testing Library; e o teste de ponta a ponta com Playwright MUST passar a
  cobrir o registro de uma movimentação, com persistência real.
- **RP-007**: O Docker Compose, os comandos do Makefile e os workflows do GitHub Actions MUST
  continuar funcionando e verdes com a feature.
- **RP-008**: O README MUST refletir a feature (funcionalidades e uso), sem descrever o que não
  existe.

### Key Entities

- **Produto**: o mesmo das specs 002 e 007, com dois atributos novos: a quantidade em estoque
  (só muda por movimentação) e o estoque mínimo (definido pelo lojista).
- **Movimentação de estoque**: um registro imutável de mudança no saldo de um produto: o produto,
  o tipo (entrada ou ajuste), a quantidade com sinal, o saldo resultante, o texto (observação da
  entrada ou motivo do ajuste) e o momento em que foi aplicada.
- **Posição de estoque**: a visão de um produto ativo para a seção Estoque: quantidade, mínimo,
  falta para o mínimo e situação (sem estoque, para repor ou em dia).
- **Resumo do estoque**: os indicadores da seção Estoque: produtos para repor, produtos sem
  estoque e valor do estoque a preço de venda.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um lojista registra a entrada de um produto, da abertura da seção Estoque até ver o
  novo saldo, em menos de 30 segundos.
- **SC-002**: 100% das operações de estoque (consultar a posição, registrar entrada, ajustar,
  definir o mínimo, ver a lista de reposição e o histórico) podem ser feitas só pela interface.
- **SC-003**: Com 50 entradas de 1 unidade aplicadas ao mesmo tempo sobre o mesmo produto, o saldo
  aumenta exatamente 50 e o histórico mostra 50 movimentações com saldos resultantes distintos e
  consecutivos.
- **SC-004**: Em 100% dos produtos, a soma das movimentações é igual ao saldo, e nenhum saldo
  fica negativo, inclusive sob operações simultâneas.
- **SC-005**: 100% dos saldos e movimentações registrados pelo painel continuam iguais depois de
  recarregar a página e depois de reiniciar o sistema.
- **SC-006**: Depois de qualquer movimentação ou mudança de mínimo, o lojista vê a lista de
  reposição e os indicadores atualizados em até 1 segundo, sem recarregar a página.
- **SC-007**: Em 100% das ações que dependem do servidor, o lojista vê o andamento e o resultado;
  nenhuma falha é silenciosa, e cada estado tem verificação automatizada.
- **SC-008**: O fluxo principal (registrar uma entrada e ver o saldo persistido) é verificado
  automaticamente de ponta a ponta, contra o sistema real, a cada entrega.

## Assumptions

- **Sem login**: até a spec 001, qualquer pessoa com acesso ao painel registra movimentações, e
  o histórico não diz quem fez cada uma; esse vínculo entra com a 001.
- **Unidades inteiras**: o estoque é contado em unidades; produtos a granel ou por peso ficam para
  depois.
- **Limites**: até 99.999 unidades por movimentação e por mínimo, e até 999.999 unidades de saldo
  por produto, suficientes para uma loja física pequena ou média (C-09).
- **Ajuste como diferença**: o lojista informa quanto adicionar ou retirar, e não o novo saldo
  contado; a prévia "atual → fica" cobre o caso da contagem de inventário. Assim, ajustes
  simultâneos se somam em vez de um apagar o outro.
- **Regra do mínimo**: "para repor" é estar abaixo do mínimo (quantidade < mínimo), como já diz a
  página de entrada do site; ter exatamente o mínimo não é falta, e mínimo 0 desliga o alerta.
- **Saldo nunca negativo nesta spec**: só entradas e ajustes mexem no saldo. Estoque negativo por
  vendas offline concorrentes é a pergunta Q3 do roadmap, resolvida na spec 009.
- **Remoção de produto**: segue a spec 002 (inativação). Remover um produto com saldo não exige
  zerá-lo antes, e as movimentações dele ficam guardadas.
- **Data e hora**: registradas pelo servidor e exibidas no fuso horário do navegador, no formato
  brasileiro (ex.: 24/11/2026 14:35).
- **Página**: 10 itens por página na seção Estoque e no histórico, como na seção Produtos.
- **Conexão**: o painel precisa de conexão com a API; operar sem internet é papel do caixa
  (specs 008 e 009).
- **Navegadores**: versões atuais de Chrome, Edge, Firefox e Safari.
