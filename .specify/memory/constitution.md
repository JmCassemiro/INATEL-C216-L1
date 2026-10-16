<!--
Sync Impact Report
- Versão: 1.0.0 → 2.0.0 (MAJOR: o Princípio IV foi redefinido de forma incompatível)
- Princípios modificados:
  - IV. Simplicidade → IV. Boas Práticas e Complexidade Justificada (redefinido)
- Princípios adicionados:
  - V. Clean Architecture (NÃO NEGOCIÁVEL)
- Seções modificadas:
  - Qualidade e Verificação: conformidade com I–V, mapa de camadas no plan.md e código formatado
- Seções removidas: nenhuma
- TODOs: stack de front-end ainda a definir (Princípio III)
-->

# INATEL C216 L1 Constitution

Projeto acadêmico full-stack da disciplina C216 (Sistemas Distribuídos), desenvolvido de forma
incremental: cada Prática acrescenta funcionalidades a um mesmo sistema (o NexoPDV). O projeto
também é uma referência profissional, então cada decisão de design deve ser explicável.

## Core Principles

### I. TDD Obrigatório (NÃO NEGOCIÁVEL)

- Toda mudança de comportamento em código de produção MUST seguir o ciclo Red-Green-Refactor,
  conforme a skill `python-tdd`.
- Nenhum código de produção é escrito sem antes existir um teste que falhe pelo motivo esperado
  (falha de asserção, não erro de importação ou de digitação).
- Todo `tasks.md` MUST conter tarefas de teste, posicionadas antes das tarefas de implementação
  que elas cobrem.
- Uma tarefa só é considerada concluída quando seus testes passam e a suíte completa está verde
  (`make test`).
- Correção de bug MUST começar por um teste que reproduza o bug.

**Justificativa:** um teste que nunca foi visto falhando não prova nada. Testes escritos primeiro
garantem que cada requisito da Prática tem evidência automatizada, verificada também pelo CI.

### II. Requisitos da Prática São Obrigatórios

- Tudo o que o PDF da Prática pede MUST estar implementado e coberto por testes.
- Funcionalidades além do PDF são permitidas quando fizerem sentido para o projeto completo,
  mas nunca no lugar de um requisito pedido nem às custas dele.
- Toda funcionalidade extra MUST ser identificada como extra na `spec.md` (por exemplo, numa
  seção ou marcação "Extra (fora do PDF)"), para que fique clara a separação entre o que foi
  exigido e o que foi acrescentado.

**Justificativa:** a avaliação é feita sobre o que a Prática exige; os extras servem à evolução do
sistema, mas não podem comprometer a entrega obrigatória.

### III. Stack Definida

- **Back-end:** Python 3.14, FastAPI, Poetry (gerência de dependências), pytest (testes),
  ruff (lint e formatação) e PostgreSQL executado via Docker Compose.
- O código Python MUST seguir a skill `python-patterns` (tipagem, tratamento de erros,
  organização de módulos).
- **Front-end:** a definir. Será incluído por emenda a este princípio quando a Prática
  correspondente chegar.
- Introduzir uma nova tecnologia (biblioteca de peso, banco, framework) MUST ser justificado no
  `plan.md`.

**Justificativa:** uma stack fixa mantém o projeto coerente entre as Práticas e evita trocas de
ferramenta sem motivo.

### IV. Boas Práticas e Complexidade Justificada

- O código MUST aplicar SOLID, clean code e padrões de projeto sempre que eles tornarem o código
  mais claro, mais testável ou mais fácil de evoluir.
- O código MUST NOT ser mantido artificialmente simples quando uma solução mais estruturada for
  melhor para o sistema; aumentar a complexidade é aceito quando ela se paga.
- O código MUST NOT receber abstrações, camadas extras ou padrões sem propósito concreto (apenas
  para "encher" a estrutura).
- Toda abstração ou padrão relevante MUST ter justificativa registrada no `plan.md` (o que
  resolve e qual alternativa foi descartada).

**Justificativa:** o projeto é referência profissional e de estudo; ele precisa mostrar
engenharia de qualidade, e cada escolha precisa poder ser defendida — inclusive a de não
abstrair algo.

### V. Clean Architecture (NÃO NEGOCIÁVEL)

Vale para todo o código de back-end a partir da Prática 4.

- O código MUST ser organizado nas camadas:
  - **Domínio:** entidades e regras de negócio puras.
  - **Aplicação:** casos de uso que orquestram o domínio.
  - **Adaptadores de interface:** rotas FastAPI e schemas Pydantic (DTOs de entrada e saída).
  - **Infraestrutura:** repositórios concretos, banco de dados e serviços externos.
- **Regra de dependência:** as dependências MUST apontar sempre para dentro. Domínio e aplicação
  MUST NOT importar FastAPI, Pydantic, SQLAlchemy ou qualquer módulo de infraestrutura.
- Acesso a dados e a serviços externos MUST passar por interfaces (portas) definidas nas camadas
  internas e implementadas na infraestrutura.
- As dependências MUST ser injetadas: a composição acontece na borda (FastAPI `Depends`), e o
  `main.py` MUST apenas inicializar a aplicação e montar essa composição.
- Testes unitários MUST cobrir domínio e casos de uso sem infraestrutura real (usando
  implementações em memória das portas); testes de integração MUST exercitar a API pela borda
  (`TestClient`).

**Justificativa:** separar regras de negócio de detalhes técnicos permite trocar o mecanismo de
armazenamento (memória hoje, PostgreSQL nas próximas Práticas) e as integrações (API fiscal,
sincronização offline) sem reescrever o núcleo, e torna as regras testáveis isoladamente.

## Qualidade e Verificação

- `make test` e `make lint` MUST passar, e o código MUST estar formatado (`make format`), antes de
  uma feature ser considerada pronta.
- O workflow de CI do GitHub Actions MUST ficar verde para a branch da entrega.
- O `plan.md` de cada feature MUST verificar conformidade com os Princípios I–V antes da fase de
  implementação e MUST indicar em qual camada da Clean Architecture fica cada arquivo criado ou
  alterado.

## Fora do Escopo desta Constituição

O fluxo de versionamento (criação de branches, commits, push e abertura de Pull Requests) não é
regido por esta constituição nem executado pelos comandos do Spec Kit. Ele é conduzido
separadamente, após a implementação, pelo processo próprio do projeto.

## Governance

- Esta constituição prevalece sobre as demais práticas do projeto. Em caso de conflito entre um
  artefato do Spec Kit (`spec.md`, `plan.md`, `tasks.md`) e a constituição, vale a constituição.
- Emendas são feitas via `/speckit-constitution`, registrando a mudança no relatório de impacto
  e incrementando a versão:
  - **MAJOR:** remoção ou redefinição incompatível de um princípio.
  - **MINOR:** novo princípio ou seção, ou ampliação relevante (por exemplo, a definição da stack
    de front-end).
  - **PATCH:** esclarecimentos e ajustes de redação.
- `/speckit-plan` e `/speckit-analyze` MUST checar a conformidade com esta constituição.

**Version**: 2.0.0 | **Ratified**: 2026-10-02 | **Last Amended**: 2026-10-03
