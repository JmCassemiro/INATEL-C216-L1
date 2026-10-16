# Feature Specification: Cadastro de Produtos

**Feature Branch**: `002-produtos`

**Created**: 2026-10-03

**Status**: Draft

**Input**: Parent roadmap: `.specify/memory/roadmap.md` → entry **002 — Produtos e estoque**. Recorte
da Prática 4: cadastro de produtos (cadastrar, listar, consultar, substituir, alterar parcialmente e
remover) exposto pela API do NexoPDV, com os dados mantidos em memória nesta etapa. Controle de
estoque, restrição de preço por papel e persistência em banco ficam para depois.

## Contexto

O NexoPDV atende lojas de varejo físico. Antes de vender qualquer coisa, a loja precisa ter seu
catálogo de produtos cadastrado: é a partir do código de barras de um produto que o operador de
caixa registra a venda no balcão. Esta feature entrega esse catálogo — a base sobre a qual as
specs de vendas, estoque e dashboard (roadmap 003–006) vão ser construídas.

**Fora desta spec** (registrado no roadmap): quantidade em estoque, estoque mínimo e alertas de
reposição; restrição de alteração de preço ao Admin (depende da spec 001, autenticação);
armazenamento permanente em banco de dados (próxima Prática).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar um produto e encontrá-lo pelo código de barras (Priority: P1)

O lojista cadastra um produto informando nome, descrição (opcional), código de barras e preço de
venda. Depois, qualquer pessoa da loja consegue encontrar esse produto pelo código de barras — que
é exatamente o que o leitor do caixa vai fazer — ou pelo identificador que o sistema atribuiu a
ele.

**Why this priority**: sem produto cadastrado não existe venda. Cadastrar e localizar pelo código
de barras é o mínimo que já entrega valor e destrava as specs seguintes.

**Independent Test**: cadastrar um produto e, em seguida, consultá-lo pelo identificador e pelo
código de barras, obtendo os mesmos dados informados.

**Acceptance Scenarios**:

1. **Given** um catálogo sem o código de barras 7891000315507, **When** o lojista cadastra
   "Camiseta Básica Branca M" com esse código e preço R$ 49,90, **Then** o produto é criado com um
   identificador próprio e os dados informados são devolvidos.
2. **Given** um produto cadastrado, **When** alguém o consulta pelo identificador, **Then** recebe
   nome, descrição, código de barras e preço do produto.
3. **Given** um produto cadastrado, **When** alguém o consulta pelo código de barras, **Then**
   recebe o mesmo produto.
4. **Given** um produto já cadastrado com o código 7891000315507, **When** o lojista tenta
   cadastrar outro produto com o mesmo código, **Then** o cadastro é recusado por conflito e o
   catálogo não muda.
5. **Given** qualquer catálogo, **When** o lojista tenta cadastrar um produto sem nome, com preço
   zero ou negativo, ou com código de barras inválido (ex.: 7891000315508, cujo dígito
   verificador não confere), **Then** o cadastro é recusado indicando qual informação está
   incorreta.
6. **Given** um identificador ou código de barras que não existe, **When** alguém faz a consulta,
   **Then** é informado de que o produto não foi encontrado.

---

### User Story 2 - Listar e buscar produtos (Priority: P2)

O lojista vê o catálogo em páginas e consegue filtrar pelo nome, para conferir o que já está
cadastrado sem precisar saber o código de barras.

**Why this priority**: com o catálogo crescendo, encontrar produtos pelo nome é a forma natural de
o lojista revisar e manter o cadastro; mas o caixa funciona sem isso (usa o código de barras).

**Independent Test**: cadastrar alguns produtos e verificar que a listagem respeita o tamanho de
página, percorre todo o catálogo sem repetir nem pular produtos e que o filtro por nome retorna
apenas os produtos correspondentes.

**Acceptance Scenarios**:

1. **Given** 25 produtos cadastrados, **When** o lojista pede a primeira página com 10 itens,
   **Then** recebe 10 produtos e a informação do total (25).
2. **Given** 25 produtos cadastrados, **When** o lojista percorre as páginas de 10 em 10, **Then**
   vê todos os 25 produtos exatamente uma vez, na ordem de cadastro.
3. **Given** produtos "Calça Jeans 40", "Camiseta Básica" e "calça moletom", **When** o lojista
   busca por "calca", **Then** recebe os dois produtos de calça (busca sem diferenciar maiúsculas,
   minúsculas e acentos).
4. **Given** um catálogo vazio ou uma busca sem resultados, **When** o lojista lista, **Then**
   recebe uma lista vazia (não um erro).
5. **Given** qualquer catálogo, **When** o lojista pede um tamanho de página inválido (zero,
   negativo ou acima do máximo), **Then** o pedido é recusado indicando o problema.

---

### User Story 3 - Atualizar o cadastro de um produto (Priority: P3)

O lojista corrige ou atualiza um produto: substitui o cadastro inteiro (por exemplo, ao recadastrar
um item) ou altera apenas uma informação, como o preço, sem precisar reenviar o resto.

**Why this priority**: preços e descrições mudam com frequência no varejo, mas a loja já consegue
operar com o cadastro inicial.

**Independent Test**: cadastrar um produto, alterá-lo de forma completa e de forma parcial, e
confirmar pela consulta que apenas os dados esperados mudaram.

**Acceptance Scenarios**:

1. **Given** um produto cadastrado, **When** o lojista substitui o cadastro informando todos os
   dados novos, **Then** o produto passa a ter exatamente esses dados e mantém o mesmo
   identificador.
2. **Given** um produto com preço R$ 49,90, **When** o lojista altera apenas o preço para
   R$ 44,90, **Then** o preço muda e nome, descrição e código de barras permanecem iguais.
3. **Given** um produto com descrição, **When** o lojista altera a descrição para vazia (sem
   descrição), **Then** o produto fica sem descrição.
4. **Given** dois produtos A e B, **When** o lojista tenta alterar o código de barras de A para o
   código de B, **Then** a alteração é recusada por conflito e A não muda.
5. **Given** um produto cadastrado, **When** o lojista envia uma substituição incompleta, uma
   alteração parcial sem nenhuma informação ou com valores inválidos, **Then** a alteração é
   recusada e o produto não muda.
6. **Given** um identificador inexistente, **When** o lojista tenta substituir ou alterar,
   **Then** é informado de que o produto não foi encontrado.

---

### User Story 4 - Remover um produto do catálogo (Priority: P4)

O lojista tira do catálogo um produto que não vende mais, para que ele não apareça nas listagens
nem possa ser encontrado no caixa. A remoção é uma **inativação**: o registro do produto é
mantido (com o momento da remoção) para preservar o histórico — vendas futuras vão referenciar
produtos, e registros não são apagados (roadmap, nota de auditoria).

**Why this priority**: manter o catálogo limpo é útil, mas é a operação menos frequente.

**Independent Test**: cadastrar um produto, removê-lo e confirmar que ele não é mais encontrado
por identificador, por código de barras nem na listagem, e que o código de barras dele continua
reservado.

**Acceptance Scenarios**:

1. **Given** um produto cadastrado, **When** o lojista o remove, **Then** a remoção é confirmada e
   o produto deixa de aparecer em consultas e listagens.
2. **Given** um identificador inexistente (ou de um produto já removido), **When** o lojista
   tenta removê-lo, **Then** é informado de que o produto não foi encontrado.
3. **Given** um produto removido, **When** o lojista tenta cadastrar um novo produto com o mesmo
   código de barras, **Then** o cadastro é recusado por conflito, pois o código continua
   reservado ao produto removido.
4. **Given** um produto removido, **When** o lojista tenta substituí-lo ou alterá-lo, **Then** é
   informado de que o produto não foi encontrado.

---

### Edge Cases

- Dois cadastros simultâneos com o mesmo código de barras: apenas um pode ser aceito; o outro é
  recusado por conflito.
- Nome com espaços sobrando no início ou no fim: os espaços são descartados; nome composto apenas
  de espaços é considerado vazio e recusado.
- Preço com mais de duas casas decimais (ex.: 10,999): recusado, pois o valor precisa ser exato em
  centavos.
- Identificador em formato inválido na consulta (ex.: texto onde se espera um identificador):
  recusado como dado inválido, não como "não encontrado".
- Busca por nome com acentos ou maiúsculas diferentes do cadastro: encontra o produto mesmo assim.
- Reinício da aplicação: nesta etapa o catálogo é mantido apenas enquanto a aplicação está no ar e
  começa vazio a cada reinício (limitação aceita até a Prática de banco de dados).

## Requirements *(mandatory)*

### Functional Requirements

**Cadastro e consulta**

- **FR-001**: O sistema MUST permitir cadastrar um produto com nome, descrição opcional, código de
  barras e preço de venda, atribuindo a ele um identificador único gerado pelo próprio sistema.
- **FR-002**: O sistema MUST exigir nome com 1 a 120 caracteres (após descartar espaços nas
  pontas) e aceitar descrição opcional de até 500 caracteres.
- **FR-003**: O sistema MUST exigir preço de venda maior que zero, com no máximo duas casas
  decimais e até R$ 999.999,99, tratado como valor monetário exato (sem erro de arredondamento).
- **FR-004**: O sistema MUST aceitar apenas códigos de barras no padrão GTIN: somente dígitos,
  com 8, 12, 13 ou 14 dígitos (GTIN-8, UPC-A, EAN-13, GTIN-14), e com o dígito verificador
  válido. Códigos internos da loja são aceitos desde que sigam esse padrão (ex.: EAN-13 com
  prefixo de uso interno 20–29).
- **FR-005**: O sistema MUST garantir que dois produtos nunca tenham o mesmo código de barras —
  incluindo produtos removidos, cujo código continua reservado —, recusando por conflito qualquer
  cadastro ou alteração que viole isso. *(Extra — fora do PDF.)*
- **FR-006**: O sistema MUST permitir consultar um produto pelo identificador.
- **FR-007**: O sistema MUST permitir consultar um produto pelo código de barras. *(Extra — fora
  do PDF.)*
- **FR-008**: O sistema MUST informar "produto não encontrado" quando o identificador ou o código
  de barras consultado não corresponder a um produto do catálogo.

**Listagem**

- **FR-009**: O sistema MUST listar os produtos em páginas, em ordem de cadastro, com tamanho de
  página padrão de 20 e máximo de 100 itens, informando o total de produtos que atendem ao filtro.
- **FR-010**: O sistema MUST permitir filtrar a listagem por parte do nome, sem diferenciar
  maiúsculas, minúsculas e acentos. *(Extra — fora do PDF.)*
- **FR-011**: O sistema MUST recusar parâmetros de paginação inválidos (página ou tamanho menores
  que o mínimo, tamanho acima do máximo).

**Atualização**

- **FR-012**: O sistema MUST permitir substituir o cadastro completo de um produto, exigindo todos
  os dados obrigatórios e mantendo o identificador.
- **FR-013**: O sistema MUST permitir alterar parcialmente um produto, mudando apenas as
  informações enviadas; uma alteração sem nenhuma informação MUST ser recusada.
- **FR-014**: Na alteração parcial, o sistema MUST permitir remover a descrição (deixá-la vazia) e
  MUST recusar valores vazios para nome, código de barras e preço.
- **FR-015**: Substituição e alteração parcial MUST aplicar as mesmas validações e a mesma regra
  de unicidade do código de barras do cadastro.

**Remoção**

- **FR-016**: O sistema MUST permitir remover um produto do catálogo por **inativação**: o
  registro é mantido com o momento da remoção, e o produto MUST deixar de aparecer em consultas,
  listagens, substituições e alterações (tratado como não encontrado).
- **FR-016a**: Remover um produto já removido MUST ser tratado como produto não encontrado.

**Geral**

- **FR-017**: Toda operação recusada MUST deixar o catálogo inalterado e indicar o motivo
  (dado inválido com o campo correspondente, produto não encontrado ou conflito de código de
  barras), com categorias de erro distintas entre si.

### Requisitos de entrega da Prática 4 *(restrições do PDF — Princípio II)*

Estes requisitos vêm do PDF da Prática e são, por natureza, técnicos; o *como* fica no `plan.md`.

- **RP-001**: O cadastro de produtos MUST ser exposto pela API com pelo menos uma operação de cada
  método HTTP: GET, POST, PUT, PATCH e DELETE.
- **RP-002**: A API MUST usar parâmetros de caminho e/ou de consulta (ex.: identificador no caminho,
  paginação e busca na consulta).
- **RP-003**: Os dados de entrada MUST ser validados por pelo menos um modelo Pydantic.
- **RP-004**: O projeto MUST seguir uma estrutura organizada semelhante à apresentada na aula
  (rotas, schemas e services separados), e o `main.py` MUST apenas inicializar a aplicação.
- **RP-005**: Todos os endpoints MUST ter testes automatizados com o `TestClient`.
- **RP-006**: Os testes MUST estar separados entre unitários e de integração.
- **RP-007**: O CI MUST executar todos os testes (unitários e de integração).
- **RP-008**: A rota inicial já existente e os testes das Práticas anteriores MUST continuar
  funcionando (Docker, Makefile e CI incluídos).

### Key Entities

- **Produto**: item vendido pela loja. Atributos: identificador (atribuído pelo sistema), nome,
  descrição (opcional), código de barras (GTIN válido, único entre todos os produtos, inclusive
  os removidos), preço de venda (valor monetário exato, maior que zero) e situação (ativo ou
  removido, com o momento da remoção). Nas próximas specs, será referenciado por itens de venda e
  ganhará informações de estoque.
- **Código de barras**: identificação do produto lida pelo leitor do caixa. Tem regras próprias
  (formato GTIN e dígito verificador), independentes de qualquer produto.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos produtos cadastrados podem ser localizados pelo código de barras
  imediatamente após o cadastro.
- **SC-002**: Em qualquer sequência de cadastros, alterações e remoções, nunca existem dois
  produtos (ativos ou removidos) com o mesmo código de barras.
- **SC-003**: 100% das tentativas com dados inválidos são recusadas sem alterar o catálogo, e a
  resposta identifica o campo com problema.
- **SC-004**: Com 10.000 produtos cadastrados, a consulta por código de barras responde em menos de
  1 segundo — rápida o bastante para o operador não perceber espera ao bipar.
- **SC-005**: Percorrendo a listagem página a página, cada produto do catálogo aparece exatamente
  uma vez.
- **SC-006**: 100% das operações do cadastro (cadastrar, listar, consultar, substituir, alterar e
  remover) e de seus casos de erro têm verificação automatizada executada a cada entrega.

## Assumptions

- **Uso pela API**: nesta etapa, o "lojista" interage pelo cliente da API (documentação interativa
  ou ferramentas HTTP); as telas do painel vêm na spec 007.
- **Sem autenticação**: qualquer cliente da API pode operar o cadastro até a spec 001 entrar; a
  restrição "só Admin altera preço" será aplicada então.
- **Armazenamento temporário**: o catálogo vive em memória e é perdido ao reiniciar a aplicação;
  a Prática de banco de dados troca isso por armazenamento permanente sem mudar o comportamento
  descrito aqui.
- **Uma loja**: o catálogo é único para a loja (roadmap C-09).
- **Moeda**: todos os preços estão em reais (BRL).
- **Nome não é único**: produtos diferentes podem ter o mesmo nome (ex.: tamanhos ou cores
  distintos), pois quem os diferencia é o código de barras.
- **Ordem da listagem**: ordem de cadastro, para que a paginação seja estável.
- **Reativação fora do escopo**: não há como reativar um produto removido nesta spec; se for
  necessário reaproveitar o código de barras, a reativação entra numa spec futura.
