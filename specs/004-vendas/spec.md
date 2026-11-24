# Feature Specification: Venda Mínima

**Feature Branch**: `004-vendas`

**Created**: 2026-11-24

**Status**: Draft

**Input**: Parent roadmap: `.specify/memory/roadmap.md` → entry **004 — Vendas** (recorte de venda
mínima) e decisão **C-12** (terceira etapa do Projeto Final). Carrinho por código de barras, um ou
mais meios de pagamento, troco, baixa de estoque na mesma transação e histórico de vendas, na API e
no painel (seção Vendas, hoje marcada como "em breve"). Fora do recorte: vínculo com operador e
turno (specs 001 e 003), desconto com aprovação e cancelamento.

## Contexto

O painel já cuida do catálogo (spec 007) e do estoque (spec 011), mas a loja ainda não registra o
que vende. A venda é a jornada principal da visão do NexoPDV: o operador passa os itens no leitor,
escolhe como o cliente paga e finaliza; o estoque é baixado e a venda fica guardada para consulta.

Esta feature entrega a venda completa no painel, sem login: montar o carrinho pelo código de
barras, receber em um ou mais meios de pagamento (por exemplo, parte em Pix e parte no cartão),
calcular o troco, baixar o estoque de todos os itens junto com o registro da venda e consultar as
vendas feitas. É a primeira operação financeira do sistema, então segue a regra de auditoria do
roadmap: uma venda registrada nunca é editada nem apagada.

Ela também prepara o terreno do sistema distribuído (spec 009): cada venda nasce com um
identificador próprio, e reenviar a mesma venda, por exemplo depois de uma falha de conexão, não a
registra duas vezes.

**Fora desta spec** (registrado no roadmap): vínculo da venda com o operador e com o turno de caixa
(dependem das specs 001 e 003); desconto, com ou sem aprovação do Gerente (pergunta Q4);
cancelamento, estorno, devolução e troca; venda no fiado (spec 005); nota fiscal e impressão de
cupom (spec 010); venda sem internet e estoque negativo por vendas offline (spec 009, pergunta Q3);
integração com maquininha de cartão (C-06); filtros e relatórios de vendas por período, por meio de
pagamento ou por produto (spec 006); quantidades fracionadas (produtos a granel ou por peso).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar uma venda pelo código de barras (Priority: P1)

O cliente chega ao balcão com os produtos. O lojista abre a nova venda, passa cada produto no
leitor (ou digita o código), confere o carrinho e o total, informa como o cliente paga e finaliza.
Se o cliente paga em dinheiro, o painel mostra o troco. A venda é registrada, o estoque de cada
produto diminui, e o lojista vê o comprovante na tela.

**Why this priority**: é a jornada "Realizar uma Venda Rápida" da visão e o motivo de existir de
uma frente de caixa; sem ela não há o que consultar nem o que baixar do estoque.

**Independent Test**: com produtos com saldo, abrir a nova venda, ler dois códigos (um deles duas
vezes), pagar em dinheiro com valor acima do total, finalizar, ver o troco no comprovante e
conferir na seção Estoque que os saldos diminuíram as quantidades vendidas.

**Acceptance Scenarios**:

1. **Given** a nova venda aberta, **When** o lojista lê o código de barras de um produto ativo com
   saldo, **Then** o produto entra no carrinho com quantidade 1, preço unitário e subtotal, o total
   é atualizado e o campo do código fica limpo e pronto para a próxima leitura.
2. **Given** um produto já no carrinho, **When** o lojista lê o código dele de novo, **Then** a
   quantidade daquela linha aumenta em 1, sem criar outra linha.
3. **Given** a nova venda, **When** o lojista lê um código que não existe ou de um produto
   removido, **Then** vê "Produto não encontrado" e o carrinho não muda.
4. **Given** um produto que não tem o código legível, **When** o lojista busca parte do nome dele,
   **Then** vê os produtos correspondentes e adiciona o escolhido ao carrinho.
5. **Given** um item no carrinho, **When** o lojista muda a quantidade dele ou o remove, **Then** o
   subtotal e o total são recalculados na hora.
6. **Given** um produto com 2 unidades em estoque, **When** o lojista tenta deixar 3 no carrinho,
   **Then** a quantidade não passa de 2 e o painel avisa quantas unidades há; um produto sem
   estoque não entra no carrinho.
7. **Given** um carrinho de R$ 87,50, **When** o lojista escolhe dinheiro e informa R$ 100,00,
   **Then** vê o troco de R$ 12,50 antes de finalizar.
8. **Given** um carrinho com itens e o pagamento que cobre o total, **When** o lojista finaliza,
   **Then** vê a confirmação com o número da venda, os itens, o pagamento, o total e o troco, e a
   opção de iniciar uma nova venda.
9. **Given** uma venda finalizada com 2 unidades de um produto que tinha 10, **When** o lojista
   consulta a seção Estoque, **Then** o saldo é 8, e o histórico de movimentações do produto mostra
   a baixa de −2 como "Venda" com o número da venda.
10. **Given** um pagamento que não cobre o total, **When** o lojista tenta finalizar, **Then** a
    finalização não está disponível e o painel mostra quanto falta pagar.
11. **Given** que o servidor está indisponível, **When** o lojista finaliza, **Then** vê uma
    mensagem de erro, o carrinho e os pagamentos continuam como estavam, e nenhum saldo muda.
12. **Given** uma venda em andamento, **When** o lojista descarta a venda e confirma, **Then** o
    carrinho fica vazio e nada é registrado.

---

### User Story 2 - Dividir o pagamento em vários meios (Priority: P2)

O cliente quer pagar parte em Pix e o resto no cartão, ou parte no cartão e o resto em dinheiro.
O lojista registra cada parte com o seu meio e o seu valor; o painel mostra quanto ainda falta e,
quando há dinheiro, o troco.

**Why this priority**: os múltiplos meios de pagamento são uma funcionalidade da visão e fazem
parte do recorte da venda mínima; a venda com um meio só (P1) já funciona sem ela.

**Independent Test**: num carrinho de R$ 150,00, registrar R$ 50,00 em Pix e R$ 100,00 no cartão
de crédito, finalizar e conferir no detalhe da venda os dois pagamentos.

**Acceptance Scenarios**:

1. **Given** um carrinho de R$ 150,00, **When** o lojista registra R$ 50,00 em Pix, **Then** o
   painel mostra que faltam R$ 100,00, e o próximo pagamento já sugere esse valor.
2. **Given** um carrinho de R$ 150,00 com R$ 50,00 em Pix, **When** o lojista registra R$ 100,00 no
   cartão de crédito e finaliza, **Then** a venda é registrada com os dois pagamentos e sem troco.
3. **Given** um carrinho de R$ 150,00 com R$ 100,00 no cartão de débito, **When** o lojista
   registra R$ 60,00 em dinheiro, **Then** o painel mostra o troco de R$ 10,00.
4. **Given** um carrinho de R$ 150,00, **When** o lojista tenta registrar R$ 200,00 em Pix ou no
   cartão, **Then** o valor é recusado com a mensagem de que só o pagamento em dinheiro pode
   passar do total e gerar troco.
5. **Given** pagamentos registrados, **When** o lojista remove um deles, **Then** o valor que falta
   pagar e o troco são recalculados na hora.
6. **Given** pagamentos registrados, **When** o lojista muda os itens do carrinho, **Then** o
   valor que falta pagar e o troco acompanham o novo total.

---

### User Story 3 - Consultar as vendas realizadas (Priority: P3)

O lojista quer saber o que foi vendido. Ele abre o histórico de vendas, vê as vendas da mais
recente para a mais antiga e abre uma delas para ver os itens, os pagamentos e o troco. No topo,
vê quanto a loja vendeu no dia.

**Why this priority**: o histórico é a trilha de auditoria das vendas e o que o lojista consulta
para conferir o caixa; a venda já funciona sem ele, mas sem ele ninguém confere o que aconteceu.

**Independent Test**: depois de registrar duas vendas, abrir o histórico, conferir as duas no topo
da lista com número, data, total e meios de pagamento, abrir o detalhe de uma delas e conferir que
os indicadores do dia somam as duas.

**Acceptance Scenarios**:

1. **Given** vendas registradas, **When** o lojista abre o histórico, **Then** vê as vendas da mais
   recente para a mais antiga, em páginas de 10, cada uma com número, data e hora, quantidade de
   itens, total e meios de pagamento usados.
2. **Given** o histórico, **When** o lojista abre uma venda, **Then** vê os itens (nome, código de
   barras, preço unitário, quantidade e subtotal), os pagamentos (meio e valor), o total, o valor
   pago e o troco.
3. **Given** uma venda registrada, **When** o preço ou o nome de um produto dela muda depois,
   **Then** a venda continua mostrando o nome e o preço do momento em que foi feita.
4. **Given** uma venda registrada, **When** o lojista consulta o histórico, **Then** não existe
   opção de editá-la nem de apagá-la.
5. **Given** que ainda não há vendas, **When** o lojista abre o histórico, **Then** vê que ainda não
   há vendas e o atalho para registrar a primeira.
6. **Given** vendas feitas hoje e em dias anteriores, **When** o lojista abre a seção Vendas,
   **Then** vê o número de vendas de hoje, o faturamento de hoje e o ticket médio de hoje, contando
   só as vendas de hoje.
7. **Given** uma venda recém-finalizada, **When** o lojista abre o histórico, **Then** a venda já
   está no topo da lista e os indicadores do dia já a incluem, sem recarregar a página.

---

### Edge Cases

- **Envio duplicado** (duplo clique, Enter repetido, nova tentativa depois de uma falha de
  conexão): a mesma venda é registrada uma vez só, e o estoque é baixado uma vez só. Se a venda já
  tinha sido registrada e só a resposta se perdeu, a nova tentativa mostra a venda já registrada.
- **Vendas simultâneas disputando a última unidade** (duas abas ou dois computadores): só a que
  chegar primeiro é registrada; a outra é recusada com o item e a quantidade disponível, e o saldo
  nunca fica negativo.
- **Saldo mudou depois que o item entrou no carrinho** (outra venda ou um ajuste): a venda vale
  sobre o saldo real no momento em que é finalizada; se não houver saldo suficiente, ela é
  recusada sem alterar nada, o painel diz qual item e quanto há, e o carrinho continua montado para
  o lojista corrigir.
- **Preço mudou depois que o item entrou no carrinho**: a venda é recusada sem alterar nada, o
  carrinho passa a mostrar os preços atuais e o lojista revisa o total e os pagamentos antes de
  finalizar de novo; o cliente nunca paga um valor diferente do que viu.
- **Produto removido do catálogo com a venda em andamento**: a venda é recusada sem alterar nada,
  o painel diz qual item não está mais à venda, e o lojista o retira do carrinho.
- **Mesmo produto lido muitas vezes seguidas**: uma linha só no carrinho, com a quantidade somada,
  até o saldo disponível.
- **Código lido com espaços ou digitado com erro de dígito verificador**: espaços são ignorados;
  um código inválido é tratado como produto não encontrado.
- **Carrinho vazio**: não é possível registrar pagamentos com valor nem finalizar.
- **Troco exato**: pagar em dinheiro exatamente o que falta resulta em troco zero.
- **Pagamento em dinheiro desnecessário** (por exemplo, cartão já cobre o total e o lojista
  acrescenta dinheiro): recusado, porque o troco não pode ser igual ou maior que o próprio valor
  pago em dinheiro.
- **Valores digitados no formato brasileiro** (ex.: "1.234,56" ou "50"): aceitos como reais e
  centavos.
- **Venda em andamento e troca de seção ou recarga da página**: o carrinho e os pagamentos são
  mantidos neste navegador até a venda ser finalizada ou descartada.
- **Virada do dia**: os indicadores de "hoje" consideram o dia corrente no fuso horário do
  navegador; uma venda das 23:59 conta no dia em que foi feita.
- **Produtos existentes antes desta feature**: continuam com o saldo que tinham; o histórico de
  movimentações deles ganha as baixas por venda a partir de agora.
- **Telas estreitas (360 px)**: a nova venda, o comprovante e o histórico continuam usáveis, sem
  rolagem horizontal da página.

## Requirements *(mandatory)*

### Functional Requirements

**Carrinho**

- **FR-001**: O sistema MUST permitir montar o carrinho de uma venda adicionando produtos ativos
  pelo código de barras (digitado ou lido pelo leitor, que confirma a leitura com Enter) ou pela
  busca por parte do nome.
- **FR-002**: Adicionar um produto que já está no carrinho MUST aumentar a quantidade dele em 1, sem
  criar outra linha.
- **FR-003**: Depois de cada produto adicionado pelo código, o campo do código MUST ficar limpo e
  pronto para a próxima leitura, permitindo leituras seguidas sem usar o mouse.
- **FR-004**: Um código que não corresponde a um produto ativo MUST resultar na mensagem "Produto
  não encontrado", sem alterar o carrinho.
- **FR-005**: O lojista MUST poder alterar a quantidade de cada item (inteiro de 1 a 999), remover
  itens e descartar a venda em andamento, este último com confirmação.
- **FR-006**: O carrinho MUST mostrar, para cada item, o nome, o código de barras, o preço
  unitário, a quantidade e o subtotal (preço × quantidade), e o total da venda (soma dos
  subtotais), recalculados a cada mudança.
- **FR-007**: A quantidade de um item no carrinho MUST NOT passar do saldo em estoque do produto;
  ao tentar, o painel informa quantas unidades há. Um produto sem estoque MUST NOT entrar no
  carrinho.
- **FR-008**: Uma venda MUST ter de 1 a 100 itens distintos e total de até R$ 999.999,99.

**Pagamento e troco**

- **FR-009**: Os meios de pagamento aceitos MUST ser dinheiro, Pix, cartão de crédito e cartão de
  débito. Uma venda MUST ter de 1 a 5 pagamentos, cada um com um meio e um valor em reais maior que
  zero, com até duas casas decimais; o mesmo meio pode aparecer mais de uma vez.
- **FR-010**: A soma dos pagamentos MUST ser igual ou maior que o total da venda; o painel MUST
  mostrar, a cada mudança, quanto falta pagar ou o troco, e sugerir como valor do próximo pagamento
  o que falta pagar.
- **FR-011**: Só o dinheiro MUST gerar troco: a soma dos pagamentos que não são em dinheiro MUST
  NOT passar do total, e o troco MUST ser menor que o valor pago em dinheiro.
- **FR-012**: O troco MUST ser a soma dos pagamentos menos o total, e MUST ficar registrado na
  venda.

**Registro da venda**

- **FR-013**: Finalizar a venda MUST registrar a venda e baixar o estoque de todos os itens numa
  única operação: ou a venda é registrada com todas as baixas, ou nada muda.
- **FR-014**: A finalização MUST ser recusada, sem alterar nada e com uma mensagem que diga o
  motivo, quando: algum item não tem saldo suficiente (informando o item e a quantidade
  disponível); algum produto foi removido do catálogo (informando o item); o preço de algum item
  mudou desde que ele entrou no carrinho (o painel passa a mostrar os preços atuais); ou os
  pagamentos não seguem FR-009 a FR-011.
- **FR-015**: Vendas e movimentações de estoque simultâneas sobre os mesmos produtos MUST ser
  aplicadas uma de cada vez, valendo o saldo real no momento de cada uma: nenhuma venda confirmada
  se perde, e nenhum saldo fica negativo.
- **FR-016**: Cada venda MUST ter um identificador próprio, criado quando a venda começa a ser
  montada. Enviar de novo uma venda com o mesmo identificador MUST NOT registrá-la outra vez nem
  baixar o estoque outra vez, e MUST devolver a venda já registrada.
- **FR-017**: Cada venda registrada MUST guardar um número legível, crescente e sem repetição
  (Venda nº 1, nº 2, …), a data e a hora, os itens com nome, código de barras, preço unitário,
  quantidade e subtotal tal como eram no momento da venda, os pagamentos, o total, o valor pago e o
  troco.
- **FR-018**: Vendas registradas MUST NOT ser editadas nem apagadas.
- **FR-019**: Cada baixa por venda MUST aparecer no histórico de movimentações do produto (spec
  011) como uma movimentação do tipo "Venda", com a quantidade negativa, o saldo resultante e o
  número da venda; a regra da spec 011 de que a soma das movimentações é igual ao saldo MUST
  continuar valendo.
- **FR-020**: Depois de finalizar, o painel MUST mostrar o comprovante da venda (número, data e
  hora, itens, pagamentos, total e troco) e a opção de iniciar uma nova venda; a seção Estoque, a
  lista de produtos, os indicadores e o histórico de vendas MUST refletir a venda sem que o lojista
  recarregue a página.

**Histórico de vendas**

- **FR-021**: O sistema MUST permitir consultar as vendas registradas, da mais recente para a mais
  antiga, em páginas de 10, com número, data e hora, quantidade de itens (soma das unidades), total
  e meios de pagamento usados; a página consultada MUST ficar registrada no endereço da página.
- **FR-022**: O sistema MUST permitir abrir o detalhe de uma venda, com todos os dados de FR-017.
- **FR-023**: A seção Vendas MUST mostrar indicadores do dia corrente: número de vendas, faturamento
  (soma dos totais) e ticket médio (faturamento dividido pelo número de vendas, zero quando não há
  vendas). *(Extra — fora do PDF.)*

**Seção Vendas do painel**

- **FR-024**: O painel MUST ter a seção Vendas, acessível pelo menu lateral (deixa de ser "em
  breve"), com a nova venda e o histórico de vendas.
- **FR-025**: Os campos de quantidade e de valor MUST ser validados antes do envio, com o motivo
  junto ao campo; erros devolvidos pelo servidor MUST aparecer junto ao item ou ao campo quando o
  servidor os indicar, e como mensagem geral nos demais casos, preservando o carrinho e os
  pagamentos.
- **FR-026**: Durante a finalização, o painel MUST indicar que está processando e MUST impedir o
  envio duplicado.
- **FR-027**: Toda falha MUST gerar uma mensagem em português, sem detalhes técnicos; a seção
  Vendas e o histórico MUST distinguir, com mensagens próprias, os estados de carregando, nenhuma
  venda e erro ao carregar (com a opção de tentar de novo).
- **FR-028**: O carrinho e os pagamentos da venda em andamento MUST ser mantidos neste navegador ao
  trocar de seção ou recarregar a página, até a venda ser finalizada ou descartada. *(Extra — fora
  do PDF.)*
- **FR-029**: A página de entrada do site MUST passar a apresentar a frente de caixa como
  disponível.
- **FR-030**: As telas novas MUST seguir as mesmas regras de acessibilidade, responsividade e tema
  do painel (spec 007, FR-019 a FR-021) e a identidade visual do NexoPDV, em que o amarelo da
  etiqueta de gôndola marca só valores em dinheiro.

### Requisitos de entrega do Projeto Final *(restrições do PDF — Princípio II)*

Estes requisitos vêm do PDF do Projeto Final e são, por natureza, técnicos; o *como* fica no
`plan.md`.

- **RP-001**: A venda MUST funcionar no fluxo completo interface → API → banco: tudo o que esta spec
  descreve é operado pelo painel e persistido no PostgreSQL.
- **RP-002**: A API MUST ser REST em FastAPI, com validação dos dados e respostas HTTP adequadas a
  cada erro (dado inválido, produto inexistente, saldo insuficiente, preço desatualizado, venda
  inexistente), mantendo a separação entre rotas, casos de uso, repositórios, schemas e modelos.
- **RP-003**: As mudanças no banco MUST ser feitas por uma migração versionada nova (Alembic),
  aplicada na subida do Compose, de modo que uma instalação existente e uma nova cheguem ao mesmo
  estado.
- **RP-004**: O frontend MUST usar formulários, listagens, chamadas HTTP e estados de carregamento,
  sucesso e erro também nas telas de venda.
- **RP-005**: O CORS MUST continuar liberando exatamente os métodos HTTP que o frontend usa,
  incluindo os que esta feature introduzir.
- **RP-006**: As regras de negócio e os endpoints de venda MUST ter testes com pytest; as telas,
  testes com Vitest e Testing Library; e o teste de ponta a ponta com Playwright MUST passar a
  cobrir uma venda com baixa de estoque, com persistência real.
- **RP-007**: O Docker Compose, os comandos do Makefile e os workflows do GitHub Actions MUST
  continuar funcionando e verdes com a feature.
- **RP-008**: O README MUST refletir a feature (funcionalidades e uso), sem descrever o que não
  existe.

### Key Entities

- **Venda**: o registro imutável de uma compra feita no balcão: identificador próprio, número
  legível, data e hora, itens, pagamentos, total, valor pago e troco.
- **Item da venda**: um produto vendido, com a cópia do nome, do código de barras e do preço
  unitário do momento da venda, a quantidade e o subtotal; aponta para o produto do catálogo.
- **Pagamento**: uma parte do pagamento da venda, com o meio (dinheiro, Pix, cartão de crédito ou
  cartão de débito) e o valor.
- **Movimentação de estoque**: a mesma da spec 011, com um tipo novo, "Venda", que traz o número
  da venda que a gerou.
- **Resumo do dia**: os indicadores da seção Vendas: número de vendas, faturamento e ticket médio
  do dia corrente.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um lojista registra uma venda de 3 produtos pelo leitor, com um único pagamento, do
  primeiro código lido até o comprovante, em menos de 30 segundos.
- **SC-002**: 100% das operações de venda (montar o carrinho, pagar em um ou mais meios, finalizar,
  ver o comprovante, consultar o histórico e o detalhe) podem ser feitas só pela interface.
- **SC-003**: Em 100% das vendas, o total é a soma dos subtotais, o valor pago menos o troco é o
  total, e o saldo de cada produto vendido diminui exatamente a quantidade vendida.
- **SC-004**: Com 20 unidades de um produto e 25 vendas de 1 unidade dele finalizadas ao mesmo
  tempo, exatamente 20 vendas são registradas, 5 são recusadas, o saldo termina em 0 e a soma das
  movimentações do produto continua igual ao saldo.
- **SC-005**: A mesma venda enviada 5 vezes resulta em exatamente 1 venda registrada e 1 baixa de
  estoque por item.
- **SC-006**: 100% das vendas registradas pelo painel continuam iguais depois de recarregar a
  página e depois de reiniciar o sistema.
- **SC-007**: Em 100% das ações que dependem do servidor, o lojista vê o andamento e o resultado;
  nenhuma falha é silenciosa, e cada estado tem verificação automatizada.
- **SC-008**: O fluxo principal (montar o carrinho, pagar, finalizar e ver o saldo baixado) é
  verificado automaticamente de ponta a ponta, contra o sistema real, a cada entrega.

## Assumptions

- **Sem login e sem turno**: até as specs 001 e 003, qualquer pessoa com acesso ao painel registra
  vendas, e a venda não diz quem a fez nem em qual turno; esses vínculos entram com elas. Os
  indicadores do dia também ficam visíveis a todos até lá (na spec 006 eles passam a ser só do
  Admin).
- **Painel como frente de caixa**: a venda é feita no próprio painel web; o app de caixa instalado
  no balcão e a venda sem internet ficam para as specs 008 e 009. O leitor de código de barras é
  usado como teclado, como é comum nos leitores USB.
- **Saldo nunca negativo**: como na spec 011, a venda sem saldo suficiente é recusada. Aceitar
  estoque negativo é a proposta da pergunta Q3 para vendas offline concorrentes, a ser decidida na
  spec 009.
- **Preço do momento**: o item da venda guarda o nome e o preço vigentes quando a venda é
  finalizada; mudanças posteriores no catálogo não alteram vendas já feitas.
- **Meios de pagamento sem integração**: o painel só registra o meio e o valor; a cobrança no
  cartão ou no Pix acontece fora do sistema (C-06).
- **Valores**: em reais, com centavos exatos, sem arredondamento.
- **Limites**: até 100 itens distintos por venda, 999 unidades por item, 5 pagamentos e
  R$ 999.999,99 de total, suficientes para uma loja física pequena ou média (C-09).
- **Numeração**: o número da venda é crescente e nunca se repete; pode haver saltos quando uma
  finalização é recusada.
- **Data e hora**: registradas pelo servidor e exibidas no fuso horário do navegador, no formato
  brasileiro (ex.: 25/11/2026 14:35); "hoje" é o dia corrente nesse fuso.
- **Página**: 10 vendas por página no histórico, como nas demais listagens do painel.
- **Conexão**: o painel precisa de conexão com a API para finalizar a venda.
- **Navegadores**: versões atuais de Chrome, Edge, Firefox e Safari.
