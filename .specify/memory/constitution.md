# INATEL C216 L1 Constitution

Projeto acadêmico full-stack da disciplina C216 (Sistemas Distribuídos), desenvolvido de forma
incremental: cada Prática acrescenta funcionalidades a um mesmo sistema.

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

### IV. Simplicidade

- A solução adotada MUST ser a mais simples que atende aos requisitos atuais.
- Camadas, abstrações e padrões (repository, service, factory, etc.) só entram quando houver uma
  necessidade concreta no momento, e não por antecipação de Práticas futuras.
- Qualquer complexidade adicional MUST ser justificada no `plan.md` (seção de verificação da
  constituição / complexidade).

**Justificativa:** o sistema cresce a cada Prática; abstrações criadas cedo demais tendem a
servir mal os requisitos que realmente chegam. É mais barato refatorar com testes verdes quando
a necessidade aparecer.

## Qualidade e Verificação

- `make test` e `make lint` MUST passar antes de uma feature ser considerada pronta.
- O workflow de CI do GitHub Actions MUST ficar verde para a branch da entrega.
- O `plan.md` de cada feature MUST verificar conformidade com os Princípios I–IV antes da fase
  de implementação.

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

**Version**: 1.0.0 | **Ratified**: 2026-10-02 | **Last Amended**: 2026-10-02
