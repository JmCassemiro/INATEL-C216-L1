<!--
Sync Impact Report
- Versão: 2.0.0 → 2.1.0 (MINOR: definição da stack de front-end e ampliação relevante de
  princípios existentes; nenhum princípio removido ou redefinido de forma incompatível)
- Princípios modificados:
  - I. TDD Obrigatório: o ciclo passa a valer também no front-end (Vitest + Testing Library);
    estilo puramente visual é verificado por capturas de tela
  - II. Requisitos da Prática São Obrigatórios → II. Requisitos do PDF São Obrigatórios
    (o PDF do Projeto Final vale como o de uma Prática)
  - III. Stack Definida: front-end definido (React + TypeScript + Vite, Tailwind CSS +
    shadcn/ui, Biome, Vitest + Testing Library, Playwright); SQLAlchemy e Alembic explicitados
    no back-end; Docker Compose com os três serviços; tecnologias exigidas pelo PDF não podem ser
    substituídas sem autorização
  - V. Clean Architecture: sem mudança (continua valendo só para o back-end)
- Seções modificadas:
  - Qualidade e Verificação: comandos do front-end (make frontend-check, make frontend-test,
    make frontend-build), E2E (make e2e) e localização dos arquivos de front-end no plan.md
- Seções adicionadas: nenhuma
- Seções removidas: nenhuma
- TODOs: nenhum (o TODO da 2.0.0, stack de front-end a definir, foi resolvido)
-->

# INATEL C216 L1 Constitution

Projeto acadêmico full-stack da disciplina C216 (Sistemas Distribuídos), desenvolvido de forma
incremental: cada Prática acrescenta funcionalidades a um mesmo sistema (o NexoPDV), que é
concluído no Projeto Final. O projeto também é uma referência profissional, então cada decisão de
design deve ser explicável.

## Core Principles

### I. TDD Obrigatório (NÃO NEGOCIÁVEL)

- Toda mudança de comportamento em código de produção MUST seguir o ciclo Red-Green-Refactor.
  No back-end, conforme a skill `python-tdd` (pytest); no front-end, com Vitest e Testing Library.
- Nenhum código de produção é escrito sem antes existir um teste que falhe pelo motivo esperado
  (falha de asserção, não erro de importação, de digitação ou de tipo).
- No front-end, os testes MUST descrever o comportamento visível ao usuário (o que aparece na
  tela e o que acontece ao clicar ou digitar), e não detalhes internos dos componentes.
- Estilo puramente visual (cores, espaçamentos, tipografia) não exige teste automatizado: MUST
  ser verificado por capturas de tela revisadas antes do commit.
- Todo `tasks.md` MUST conter tarefas de teste, posicionadas antes das tarefas de implementação
  que elas cobrem.
- Uma tarefa só é considerada concluída quando seus testes passam e a suíte da parte afetada está
  verde (`make test` no back-end, `make frontend-test` no front-end).
- Correção de bug MUST começar por um teste que reproduza o bug.

**Justificativa:** um teste que nunca foi visto falhando não prova nada. Testes escritos primeiro
garantem que cada requisito tem evidência automatizada, verificada também pelo CI. Testar o
front-end pelo que o usuário vê mantém os testes válidos quando a implementação muda.

### II. Requisitos do PDF São Obrigatórios

- Tudo o que o PDF da Prática ou do Projeto Final pede MUST estar implementado e coberto por
  testes. O PDF do Projeto Final vale da mesma forma que o PDF de uma Prática.
- Os requisitos do PDF que uma feature cobre MUST ser transcritos na `spec.md` como requisitos de
  entrega (RP-xxx). Os PDFs não são versionados no repositório.
- Funcionalidades além do PDF são permitidas quando fizerem sentido para o projeto completo,
  mas nunca no lugar de um requisito pedido nem às custas dele.
- Toda funcionalidade extra MUST ser identificada como extra na `spec.md` (por exemplo, numa
  seção ou marcação "Extra (fora do PDF)"), para que fique clara a separação entre o que foi
  exigido e o que foi acrescentado.

**Justificativa:** a avaliação é feita sobre o que o PDF exige; os extras servem à evolução do
sistema, mas não podem comprometer a entrega obrigatória.

### III. Stack Definida

- **Back-end:** Python 3.14, FastAPI, Poetry (gerência de dependências), pytest (testes), Ruff
  (lint e formatação), SQLAlchemy (acesso a dados) e Alembic (migrações versionadas), com
  PostgreSQL.
- O código Python MUST seguir a skill `python-patterns` (tipagem, tratamento de erros,
  organização de módulos).
- **Front-end:** React 19 com TypeScript, Vite (servidor de desenvolvimento e build), Tailwind CSS
  e shadcn/ui (componentes), Biome (lint e formatação), Vitest e Testing Library (testes de
  unidade e de integração) e Playwright (testes de ponta a ponta).
- O código TypeScript MUST compilar em modo estrito; `any` MUST NOT ser usado sem justificativa
  escrita no próprio código.
- Os estilos MUST usar os tokens do tema (cores e raios semânticos) em vez de valores soltos, para
  que a identidade visual e os temas claro e escuro fiquem definidos num lugar só.
- O front-end MUST seguir as skills `frontend-design` (identidade visual), `shadcn` (componentes e
  tema) e `react-best-practices`, desta só as regras de cliente, já que a aplicação é uma SPA
  com Vite, sem Next.js.
- **Execução:** o Docker Compose MUST subir front-end, API e PostgreSQL, com as migrações aplicadas
  na subida da API; o CI roda no GitHub Actions.
- Introduzir uma nova tecnologia (biblioteca de peso, banco, framework) MUST ser justificado no
  `plan.md`.
- As tecnologias exigidas pelo PDF do Projeto Final (FastAPI, Poetry, Ruff, React, Vite, Biome,
  PostgreSQL, SQLAlchemy, Alembic e Docker Compose) MUST NOT ser substituídas sem autorização do
  professor.

**Justificativa:** uma stack fixa mantém o projeto coerente entre as Práticas e o Projeto Final e
evita trocas de ferramenta sem motivo. TypeScript estrito e tokens de tema pegam erros cedo e
evitam que a interface vire uma coleção de exceções.

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

- **Back-end:** `make test` e `make lint` MUST passar, e o código MUST estar formatado
  (`make format`), antes de uma feature ser considerada pronta.
- **Front-end:** `make frontend-check` (lint e formatação), `make frontend-test` (Vitest) e
  `make frontend-build` (verificação de tipos e build) MUST passar antes de uma feature ser
  considerada pronta.
- **Ponta a ponta:** uma feature que altera o fluxo interface → API → banco MUST ter seu fluxo
  principal coberto por teste Playwright, e `make e2e` MUST passar contra a stack real do Compose.
- Os workflows de CI do GitHub Actions (back-end e front-end) MUST ficar verdes para a branch da
  entrega.
- O `plan.md` de cada feature MUST verificar conformidade com os Princípios I–V antes da fase de
  implementação e MUST indicar onde fica cada arquivo criado ou alterado: no back-end, a camada
  da Clean Architecture; no front-end, o papel do arquivo (página, componente, acesso à API,
  regra de validação, utilitário) na estrutura definida pelo próprio plano.

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

**Version**: 2.1.0 | **Ratified**: 2026-10-02 | **Last Amended**: 2026-11-19
