# 📑 Documento de Visão do Sistema: NexoPDV (ERP & Frente de Caixa Híbrido)

## 1. O que é o sistema? (Domínio)

O NexoPDV é um sistema híbrido de automação comercial e gestão de retaguarda (ERP) voltado para
lojas de varejo físico de pequeno e médio porte (como lojas de roupas, calçados, perfumarias e
variedades).

O grande diferencial do sistema é sua arquitetura Offline-First. O caixa da loja funciona
localmente em um aplicativo instalado no computador, operando normalmente mesmo se a internet da
operadora cair. Quando a conexão é reestabelecida, os dados de vendas e estoque são sincronizados
automaticamente com o painel web administrativo na nuvem.

## 2. Quem usa e para quê? (Atores e Permissões)

O sistema possui controle rígido de perfis de usuário para garantir a segurança das operações
financeiras:

- **Administrador / Dono da Loja (Admin):** Possui acesso total ao painel Web e Desktop. Pode
  cadastrar e demitir funcionários, alterar preços de produtos, visualizar margens de lucro,
  relatórios financeiros estratégicos e auditar o histórico de vendas.
- **Operador de Caixa (Vendedor):** Possui acesso restrito ao aplicativo Desktop no balcão da
  loja. Seu foco é a agilidade. Ele pode registrar produtos, abrir/fechar o caixa do seu turno e
  receber pagamentos. Não possui permissão para deletar vendas prontas, aplicar descontos
  agressivos sem autorização ou visualizar o lucro líquido da empresa.

## 3. Principais Funcionalidades (Escopo Completo)

### 🔐 Módulo de Segurança e Autenticação (Novo)

- **Login Seguro com JWT (JSON Web Tokens):** Toda a comunicação entre o Frontend (React) e o
  Backend (FastAPI) será autenticada por tokens criptografados com tempo de expiração.
- **Criptografia de Senhas:** Nenhuma senha será salva em texto limpo no banco de dados.
  Utilizaremos algoritmos de hash seguros (como bcrypt ou argon2) no Python.
- **Restrição de Rotas por Nível (RBAC):** O FastAPI bloqueará requisições de relatórios
  financeiros ou alteração de preços caso o token enviado pertença a um perfil de "Operador".

### Módulo Frente de Caixa (PDV)

- **Abertura e Fechamento de Turno por Operador:** O caixa é vinculado ao funcionário logado. O
  sistema registra exatamente quem abriu o turno, quanto dinheiro tinha e quem fechou o caixa
  para evitar fraudes ou furos no balcão.
- **Venda Ágil por Código de Barras:** Campo de busca rápida otimizado para bips contínuos do
  leitor de código de barras.
- **Múltiplos Meios de Pagamento:** Permite dividir o pagamento de uma única venda (ex: metade em
  Pix e metade no Cartão de Crédito).

### Módulo Gestão e Retaguarda (ERP)

- **Controle de Estoque Inteligente:** Cadastro de mercadorias com suporte a controle simples e
  controle mínimo com alertas de reposição.
- **Gestão de Clientes e Crediário Próprio (O famoso "Fiado"):** Registro de contas correntes de
  clientes da loja, permitindo que eles comprem para pagar de forma consolidada no fim do mês.
- **Dashboard Financeiro (Exclusivo Admin):** Gráficos interativos mostrando faturamento diário,
  produtos mais vendidos da semana e ticket médio da loja.

## 4. Jornadas Principais (As 3 a 5 ações mais importantes)

1. **Autenticação e Abertura de Caixa:** O operador chega de manhã, digita suas credenciais na
   tela de login, insere o valor do "fundo de troco" inicial e o sistema libera a tela de vendas
   registrando o início do turno daquele usuário.
2. **Realizar uma Venda Rápida:** O operador passa os itens no leitor, seleciona a forma de
   pagamento e finaliza a compra. O sistema vincula o ID do operador àquela venda para auditoria
   futura.
3. **Gerenciamento de Acessos pelo Dono:** O administrador acessa o painel web, cadastra um novo
   funcionário e define se ele será um operador de caixa comum ou se terá privilégios de gerente
   (para aprovar descontos no balcão).

## 5. Arquitetura e Elementos Distribuídos

- **Integração com API Externa (Nota Fiscal):** O backend consome de forma assíncrona uma API
  parceira de mensageria fiscal (como Focus NFe ou PlugNotas).
- **Sincronização Assíncrona (Fila Local/Nuvem):** Sincronização segura das vendas locais com a
  nuvem, garantindo que o token de autenticação local seja válido antes de subir os dados para o
  servidor central.
- **Ambiente Isolado (Docker):** Toda a infraestrutura da nuvem (Banco de dados central
  PostgreSQL e a API administrativa em FastAPI) roda encapsulada em containers Docker.

## 6. O Visual e a Interface (O Frontend)

A interface será limpa, intuitiva e moderna, focando na agilidade do operador e na clareza dos
dados do administrador:

- **Tecnologias:** React com TypeScript.
- **Visual Impecável:** Utilização de Tailwind CSS + Shadcn/ui para modais de login elegantes,
  alertas flutuantes de erro de senha, tabelas fluidas de gerenciamento de usuários e gráficos
  financeiros de alto nível (Light/Dark Mode).

## 7. O que fica de FORA (Não escopo)

- **Recuperação de Senha por E-mail complexa:** Para manter o escopo realista, se um funcionário
  esquecer a senha, o Administrador altera manualmente pelo painel dele. Não criaremos
  microsserviços de disparo de e-mail com tokens de reset neste momento.
- **Emissão de Nota Fiscal de Fábrica (Do zero):** Delegado para a API de notas contratada.
- **Maquininha de Cartão Integrada (TEF):** O processamento do cartão continua sendo manual na
  maquininha externa.
- **E-commerce integrado:** O foco inicial permanece 100% na experiência de loja física (POR
  ENQUANTO), vamos ver no futuro se podemos fazer isso.
