# Feature Specification: Painel de Produtos

**Feature Branch**: `007-painel-produtos`

**Created**: 2026-11-19

**Status**: Draft

**Input**: Parent roadmap: `.specify/memory/roadmap.md` → entry **007 — Painel web administrativo**.
Recorte do Projeto Final: a primeira seção do painel do NexoPDV, a de produtos, que substitui o
gerenciador de itens do laboratório (Práticas 6 e 7). Listagem com busca por nome e paginação;
cadastro, edição e remoção com confirmação; estados de carregamento, sucesso e erro. Inclui
liberar no CORS os métodos que o painel usa, remover o recurso de itens do laboratório (API,
tabela e telas) e os testes de interface e de ponta a ponta.

## Contexto

O cadastro de produtos existe na API desde a spec 002 e é guardado em banco desde a Prática 5,
mas hoje só pode ser operado por ferramentas HTTP. A interface web que existe é o gerenciador de
itens do laboratório (Práticas 6 e 7): ele não faz parte do NexoPDV, e o PDF do Projeto Final não
o aceita como entrega sem evolução substancial.

Esta feature entrega a primeira seção do painel administrativo (roadmap 007): o lojista gerencia o
catálogo de produtos pelo navegador, do cadastro à remoção. Ela cumpre o requisito central do
Projeto Final (CRUD completo de um recurso principal, utilizável pela interface) e cria a base
visual e de navegação sobre a qual as seções de estoque e de vendas vão ser construídas.

**Fora desta spec** (registrado no roadmap): login e restrição por papel (spec 001); estoque e
alertas de reposição (próxima spec); telas de funcionários, clientes e dashboard; busca de produto
pelo código de barras na interface; reativação de produto removido; importação e exportação,
imagens e categorias de produto.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver e encontrar produtos do catálogo (Priority: P1)

O lojista abre o painel e vê o catálogo da loja: cada produto com nome, descrição (quando houver),
código de barras e preço em reais. Com o catálogo crescendo, ele navega entre páginas e encontra
um produto digitando parte do nome.

**Why this priority**: é a porta de entrada do painel; sem ver o catálogo, nenhuma outra ação tem
contexto. É também o primeiro ponto em que a interface prova estar ligada à API e ao banco reais.

**Independent Test**: com produtos já cadastrados (pela API), abrir o painel, conferir que eles
aparecem com os dados corretos, mudar de página e buscar por parte do nome.

**Acceptance Scenarios**:

1. **Given** um catálogo com produtos, **When** o lojista abre o painel, **Then** vê a primeira
   página com nome, descrição, código de barras e preço (no formato R$ 49,90) de cada produto, e o
   total de produtos do catálogo.
2. **Given** que a lista ainda está sendo obtida, **When** o painel abre, **Then** o lojista vê um
   indicador de carregamento no lugar da lista, e não uma lista vazia.
3. **Given** um catálogo com mais produtos do que cabem numa página, **When** o lojista avança ou
   volta de página, **Then** vê a página correspondente e sabe em qual página está e quantas
   existem.
4. **Given** os produtos "Camiseta Básica Branca M" e "Calça Jeans Azul 42", **When** o lojista
   digita "camis" (ou "CAMISETA", ou "basica" sem acento), **Then** só aparecem os produtos cujo
   nome contém o termo, a partir da primeira página de resultados.
5. **Given** uma busca que não encontra nada, **When** o resultado chega, **Then** o lojista vê
   que nenhum produto corresponde ao termo e tem a opção de limpar a busca.
6. **Given** um catálogo vazio, **When** o lojista abre o painel, **Then** vê que ainda não há
   produtos e um atalho para cadastrar o primeiro.
7. **Given** que o servidor está indisponível, **When** o painel tenta obter a lista, **Then** o
   lojista vê uma mensagem de erro clara com a opção de tentar de novo, e a tela não trava.
8. **Given** que o lojista está na página 2 de uma busca, **When** recarrega a página do navegador,
   **Then** continua na mesma busca e na mesma página.

---

### User Story 2 - Cadastrar um produto (Priority: P2)

O lojista cadastra um produto novo informando nome, descrição (opcional), código de barras e
preço. Erros de preenchimento aparecem junto ao campo antes do envio, e o resultado do envio é
sempre informado.

**Why this priority**: junto com a US1, forma o mínimo útil do painel: o lojista monta o catálogo
sem precisar de ferramenta externa.

**Independent Test**: cadastrar um produto pelo painel, vê-lo na lista, recarregar a página e
confirmar que ele continua lá.

**Acceptance Scenarios**:

1. **Given** o formulário de cadastro aberto, **When** o lojista preenche "Camiseta Básica Branca
   M", o código 7891000315507 e o preço 49,90 e confirma, **Then** vê a confirmação de sucesso, o
   formulário fecha e o produto aparece na lista.
2. **Given** um produto cadastrado pelo painel, **When** o lojista recarrega a página ou o sistema
   é reiniciado, **Then** o produto continua na lista com os mesmos dados.
3. **Given** o formulário de cadastro, **When** o lojista deixa o nome vazio, informa preço zero,
   negativo ou com mais de duas casas decimais, ou um código de barras com dígito verificador
   errado (ex.: 7891000315508), **Then** nada é enviado e cada campo com problema mostra o motivo.
4. **Given** que já existe um produto (ativo ou removido) com o código 7891000315507, **When** o
   lojista tenta cadastrar outro com o mesmo código, **Then** o painel informa, junto ao campo de
   código de barras, que ele já está cadastrado, e mantém os dados digitados.
5. **Given** um envio em andamento, **When** o lojista tenta confirmar de novo, **Then** nada é
   enviado em duplicidade e ele vê que o cadastro está sendo processado.
6. **Given** que o servidor está indisponível, **When** o lojista confirma o cadastro, **Then** vê
   uma mensagem de erro e os dados digitados continuam no formulário para tentar de novo.
7. **Given** o campo de preço, **When** o lojista digita "49,90" ou "49.90", **Then** os dois são
   aceitos como R$ 49,90.

---

### User Story 3 - Editar um produto (Priority: P3)

O lojista corrige ou atualiza um produto, por exemplo com um preço novo, partindo dos dados
atuais.

**Why this priority**: preços e descrições mudam, mas um catálogo recém-montado já é útil antes da
primeira edição.

**Independent Test**: editar o preço de um produto e ver o valor novo na lista, inclusive depois
de recarregar a página.

**Acceptance Scenarios**:

1. **Given** um produto na lista, **When** o lojista escolhe editá-lo, **Then** o formulário abre
   preenchido com os dados atuais do produto.
2. **Given** o formulário de edição, **When** o lojista muda o preço para 54,90 e confirma,
   **Then** vê a confirmação de sucesso e a lista mostra o novo preço, com os demais dados iguais.
3. **Given** um produto com descrição, **When** o lojista apaga a descrição e confirma, **Then** o
   produto passa a não ter descrição.
4. **Given** o formulário de edição, **When** o lojista informa dados inválidos ou um código de
   barras que pertence a outro produto, **Then** recebe as mesmas indicações do cadastro e o
   produto não muda.
5. **Given** que o produto foi removido (por exemplo, em outra aba) enquanto o formulário estava
   aberto, **When** o lojista confirma, **Then** o painel informa que o produto não existe mais e
   atualiza a lista.
6. **Given** o formulário de edição aberto, **When** o lojista desiste (cancelar ou tecla Esc),
   **Then** nada muda.

---

### User Story 4 - Remover um produto (Priority: P4)

O lojista tira do catálogo um produto que a loja não vende mais, confirmando antes de remover.

**Why this priority**: completa o ciclo do cadastro; é a ação menos frequente e a única
irreversível pelo painel.

**Independent Test**: remover um produto, confirmar que ele some da lista e continua fora dela
depois de recarregar a página.

**Acceptance Scenarios**:

1. **Given** um produto na lista, **When** o lojista escolhe removê-lo, **Then** o painel pede
   confirmação mostrando o nome do produto e avisando que o código de barras continua reservado.
2. **Given** o pedido de confirmação, **When** o lojista confirma, **Then** vê a confirmação de
   sucesso e o produto some da lista, inclusive depois de recarregar a página.
3. **Given** o pedido de confirmação, **When** o lojista cancela, **Then** nada muda.
4. **Given** que o produto era o único da última página, **When** o lojista o remove, **Then** o
   painel mostra a página anterior em vez de uma página vazia.
5. **Given** que o produto já foi removido em outra aba, **When** o lojista confirma a remoção,
   **Then** o painel informa que o produto não existe mais e atualiza a lista.
6. **Given** que o servidor está indisponível, **When** o lojista confirma a remoção, **Then** vê
   uma mensagem de erro e o produto continua na lista.

---

### Edge Cases

- Nomes de 120 caracteres e descrições de 500 não quebram o layout: o texto é resumido na lista e
  continua acessível por inteiro.
- Busca só com espaços, ou com espaços nas pontas: espaços nas pontas são ignorados, e um termo
  vazio equivale a não filtrar.
- Digitação rápida na busca: o resultado exibido corresponde sempre ao último termo digitado; uma
  resposta atrasada de um termo anterior nunca o substitui.
- Endereço com página inexistente ou inválida (ex.: página 999 ou "abc"): o painel mostra uma
  página válida, sem erro técnico.
- Erro inesperado do servidor: mensagem genérica em português, sem detalhes técnicos.
- Duas abas editando o mesmo produto: prevalece a última gravação (não há controle de edição
  simultânea nesta spec).
- Código de barras com zeros à esquerda equivalente a um já cadastrado (ex.: 07891000315507 e
  7891000315507): o conflito é indicado no campo, como em qualquer código repetido.
- Telas estreitas (celular): a lista continua legível e as ações de editar e remover continuam
  acessíveis.

## Requirements *(mandatory)*

### Functional Requirements

**Listagem e busca**

- **FR-001**: O painel MUST exibir o catálogo em páginas de 10 produtos, mostrando de cada um o
  nome, a descrição (resumida quando longa), o código de barras e o preço em reais no formato
  brasileiro (ex.: R$ 1.234,56).
- **FR-002**: O painel MUST mostrar o total de produtos que atendem à busca atual, a página atual
  e o total de páginas, e permitir ir para a página anterior e a seguinte. *(Extra — fora do
  PDF.)*
- **FR-003**: O painel MUST permitir filtrar a lista por parte do nome, sem diferenciar
  maiúsculas, minúsculas e acentos, aplicando a busca enquanto o lojista digita (após uma breve
  pausa) e voltando à primeira página a cada termo novo. *(Extra — fora do PDF.)*
- **FR-004**: A busca e a página atuais MUST ficar registradas no endereço da página, de modo que
  recarregar, usar o botão de voltar do navegador ou abrir o mesmo endereço mostre a mesma visão.
  *(Extra — fora do PDF.)*
- **FR-005**: A lista MUST apresentar os produtos do mais recente para o mais antigo, para que um
  produto recém-cadastrado apareça no topo da primeira página. Isso inverte a ordem padrão da
  listagem da API definida na spec 002 (FR-009 de lá: "em ordem de cadastro"), que continua
  estável para a paginação.
- **FR-006**: O painel MUST distinguir, com mensagens próprias, os estados da lista: carregando,
  catálogo vazio, busca sem resultado e erro ao carregar (com a opção de tentar de novo).

**Cadastro e edição**

- **FR-007**: O painel MUST permitir cadastrar um produto por um formulário com nome, descrição
  opcional, código de barras e preço.
- **FR-008**: O painel MUST permitir editar todos os dados de um produto, abrindo o formulário
  preenchido com os dados atuais.
- **FR-009**: O formulário MUST validar os dados antes de enviar, com as mesmas regras do catálogo
  (spec 002): nome com 1 a 120 caracteres sem contar espaços nas pontas; descrição de até 500
  caracteres; código de barras GTIN com 8, 12, 13 ou 14 dígitos e dígito verificador válido;
  preço maior que zero, com até duas casas decimais e até R$ 999.999,99. Cada campo inválido
  MUST mostrar o motivo junto a ele.
- **FR-010**: O campo de preço MUST aceitar vírgula ou ponto como separador decimal.
- **FR-011**: Erros devolvidos pelo servidor MUST aparecer junto ao campo correspondente quando o
  servidor indicar o campo (dado inválido, código de barras já cadastrado) e como mensagem geral
  nos demais casos; em todos eles os dados digitados MUST ser preservados.
- **FR-012**: Durante um envio, o painel MUST indicar que está processando e MUST impedir o envio
  duplicado.

**Remoção**

- **FR-013**: O painel MUST pedir confirmação antes de remover um produto, mostrando o nome dele e
  avisando que o código de barras continua reservado (não poderá ser usado em outro produto).
- **FR-014**: Se a página atual ficar vazia depois de uma remoção e houver páginas anteriores, o
  painel MUST mostrar a página anterior.

**Retorno ao lojista**

- **FR-015**: Toda operação concluída (cadastro, edição, remoção) MUST gerar uma confirmação
  visível e breve; toda falha MUST gerar uma mensagem em português, sem detalhes técnicos.
- **FR-016**: Quando o produto que o lojista tenta editar ou remover não existir mais, o painel
  MUST avisar e atualizar a lista.
- **FR-017**: Depois de cada operação concluída, a lista MUST refletir o estado atual do catálogo
  sem que o lojista precise recarregar a página.

**Estrutura e identidade do painel**

- **FR-018**: O painel MUST ter identidade visual própria do NexoPDV (nome, cores e tipografia) e
  uma estrutura de navegação em que Produtos é a primeira seção, pronta para as seções das
  próximas specs. O painel MUST NOT exibir atalhos para seções que ainda não existem.
- **FR-019**: O painel MUST oferecer tema claro e escuro: segue a preferência do sistema
  operacional por padrão, permite trocar manualmente e lembra a escolha. *(Extra — fora do PDF;
  roadmap C-03.)*
- **FR-020**: O painel MUST ser utilizável em telas de 360 px de largura até desktop, sem rolagem
  horizontal da página.
- **FR-021**: O painel MUST ser operável só pelo teclado, com foco visível, rótulos em todos os
  campos, mensagens de erro associadas aos campos e anunciadas a leitores de tela, e contraste de
  texto de nível AA.
- **FR-022**: O formulário de cadastro e edição MUST mostrar uma prévia da etiqueta de gôndola do
  produto (nome, preço e código de barras), atualizada enquanto o lojista digita; as barras do
  código só são desenhadas quando o código é válido (EAN-13, UPC-A ou EAN-8; GTIN-14 mostra só
  os dígitos). *(Extra — fora do PDF.)*

**Substituição do laboratório**

- **FR-023**: O gerenciador de itens do laboratório (Práticas 6 e 7) MUST ser removido por
  completo (telas, operações da API e dados guardados), e o painel de produtos passa a ser a
  interface do sistema.
- **FR-024**: A remoção dos dados de itens MUST ser aplicada como uma nova etapa da evolução do
  banco, de modo que uma instalação existente e uma nova cheguem ao mesmo estado, sem reescrever
  as etapas já registradas.

### Requisitos de entrega do Projeto Final *(restrições do PDF — Princípio II)*

Estes requisitos vêm do PDF do Projeto Final e são, por natureza, técnicos; o *como* fica no
`plan.md`.

- **RP-001**: Pelo menos um recurso principal MUST ter CRUD completo (criar, consultar, alterar e
  remover) utilizável pela interface; nesta spec, os produtos.
- **RP-002**: O frontend MUST ser em React, com formulários, listagens, chamadas HTTP e estados de
  carregamento, sucesso e erro. React, Vite e Biome MUST NOT ser substituídos; TypeScript é
  permitido.
- **RP-003**: O CORS da API MUST liberar apenas as origens do frontend e todos os métodos HTTP que
  o frontend usa.
- **RP-004**: O frontend MUST ter testes com Vitest e Testing Library.
- **RP-005**: Pelo menos um teste de ponta a ponta com Playwright MUST passar pelo frontend, pela
  API e pela persistência real.
- **RP-006**: O Docker Compose MUST subir frontend, backend e banco, aplicar as migrações e deixar
  o painel funcionando.
- **RP-007**: O GitHub Actions MUST rodar os testes e o lint/formatação do frontend e do backend.
- **RP-008**: O código do laboratório não é aceito sem evolução substancial: o gerenciador de
  itens MUST ser substituído pelo painel, não renomeado.
- **RP-009**: Os testes, os comandos do Makefile e o CI existentes MUST continuar funcionando,
  ajustados à remoção dos itens.

### Key Entities

- **Produto**: o mesmo da spec 002 (identificador, nome, descrição opcional, código de barras e
  preço de venda). O painel não acrescenta atributos nem muda regras; só os exibe e edita.
- **Página de produtos**: o pedaço do catálogo exibido de uma vez: os produtos da página, o total
  que atende à busca, o número da página e o tamanho dela.
- **Visão da lista**: o termo de busca e a página atual, guardados no endereço da página.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um lojista que nunca usou o painel cadastra um produto, do primeiro clique até
  vê-lo na lista, em menos de 1 minuto.
- **SC-002**: 100% das operações do catálogo (listar, buscar, cadastrar, editar e remover) podem
  ser feitas só pela interface, sem ferramenta externa.
- **SC-003**: Em 100% das ações que dependem do servidor, o lojista vê o andamento e o resultado
  (sucesso ou erro); nenhuma falha é silenciosa, e cada estado tem verificação automatizada.
- **SC-004**: 100% dos produtos cadastrados ou editados pelo painel aparecem com os mesmos dados
  depois de recarregar a página e depois de reiniciar o sistema.
- **SC-005**: Com até 1.000 produtos no catálogo, o resultado da busca aparece em até 1 segundo
  depois que o lojista para de digitar.
- **SC-006**: Todas as telas são utilizáveis de 360 px de largura até desktop, sem rolagem
  horizontal da página, e o fluxo inteiro pode ser feito só com o teclado.
- **SC-007**: Depois da entrega, não resta nenhuma tela, operação da API ou dado do laboratório de
  itens.
- **SC-008**: O fluxo completo (cadastrar, encontrar, editar e remover) é verificado
  automaticamente de ponta a ponta, contra o sistema real, a cada entrega.

## Assumptions

- **Sem login**: até a spec 001, qualquer pessoa com acesso ao endereço do painel opera o
  catálogo; a restrição "só Admin altera preço" entra com a 001.
- **Quem usa**: o dono ou o gerente da loja, em computador ou tablet na retaguarda; o celular é
  suportado, mas não é o foco.
- **Idioma e moeda**: interface em português do Brasil; preços em reais, no formato brasileiro.
- **Regras do catálogo**: validação, unicidade do código de barras e remoção por inativação são as
  da spec 002. A validação no navegador é uma conveniência; a API continua sendo a autoridade.
- **Tamanho da página**: 10 produtos por página na interface (a API aceita até 100).
- **Ordem da listagem** (decidido com o usuário em 2026-11-19): mais recentes primeiro. É a única
  mudança de comportamento na API de produtos; as demais regras da spec 002 ficam como estão.
- **Conexão**: o painel precisa de conexão com a API; operar sem internet é papel do caixa
  (specs 008 e 009).
- **Concorrência**: vale a última gravação; não há bloqueio de edição simultânea.
- **Dados do laboratório**: os itens cadastrados nas Práticas 6 e 7 são dados de teste, sem valor
  de negócio, e podem ser descartados.
- **Navegadores**: versões atuais de Chrome, Edge, Firefox e Safari.
