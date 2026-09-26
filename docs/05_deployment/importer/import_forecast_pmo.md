# import_forecast_pmo

## Visão Geral

O módulo `src/services/importers/import_forecast_pmo.py` é o importador oficial do processo **Forecast PMO**.

Ele é responsável por:

- Ler arquivos XLSX do diretório de input
- Detectar dinamicamente a linha de cabeçalho
- Processar as linhas em chunks
- Criar ou atualizar projetos com base na coluna `OV`
- Sincronizar tipos de projeto em `tbProjectType`
- Sincronizar equipe do projeto em `tbProjectTeam`
- Registrar logs funcionais em `tbImportLog` quando disponível
- Gerar arquivo XLSX com linhas com erro e advertência
- Gerar log texto de execução
- Remover do arquivo original todas as linhas já processadas

Este documento reflete **exatamente o comportamento atual do código** e deve ser considerado a fonte confiável para o time de sustentação e implantação.

---

## Arquitetura Técnica

### Localização

```text
src/services/importers/import_forecast_pmo.py
```

### Repositórios utilizados

| Repositório | Obrigatório | Finalidade |
|---|---|---|
| `ProjectRepository` | Sim | Insert/update de projeto e sincronização de OVs |
| `CompanyListNameRepository` | Sim | Resolução de `company_id` a partir do nome do cliente |
| `PersonListNameRepository` | Sim | Resolução de `person_id` a partir de aliases de pessoas |
| `ProjectTypeRepository` | Sim | Sincronização de `tbProjectType` |
| `ProjectTeamRepository` | Sim | Sincronização de `tbProjectTeam` |
| `SquadRepository` | Sim | Resolução de `department_id` e `level_id` mais recentes da pessoa |
| `ImportLogRepository` | Não | Log funcional em `tbImportLog` |
| `ImportControlRepository` | Não | Atualização de progresso em `tbImportControl` |

---

## Arquivo de Entrada

### Formato

- XLSX
- O cabeçalho **não precisa** estar na primeira linha
- O importador procura o cabeçalho nas primeiras 30 linhas
- Os dados começam logo abaixo da linha de cabeçalho encontrada

### Colunas obrigatórias

| Coluna | Campo / uso principal |
|---|---|
| `OV` | Identificador funcional do projeto |
| `TP` | Tipo do projeto |
| `Client` | Resolução de cliente |
| `Project Name` | Nome do projeto |
| `PM` | Pessoas da função PM |
| `AM` | Pessoas da função AM |
| `Internalization Date` | Base para `project_internalization_date` e `allocation_start` |
| `Project Start Date` | `project_start_date` |
| `Project Closure Date` | `project_end_date` e eventual encerramento da equipe |
| `Status` | Status funcional do projeto |
| `Pre Sales` | Pessoas da função Pre Sales |
| `Technical Lead` | Pessoas da função Technical Lead |

### Âncoras para detectar cabeçalho

O importador considera como candidato a cabeçalho uma linha que contenha pelo menos uma das âncoras:

- `OV`
- `Project Name`

Se a melhor linha candidata não contiver todas as colunas obrigatórias, a importação falha logo na abertura do arquivo.

---

## Regras de Negócio

## Identificação do projeto por OV

A coluna `OV` é o identificador funcional do projeto no PMO.

Exemplos aceitos:

- `84945`
- `68326_74746`
- `#67855_#69133`
- `POC`
- `PSR`
- `PSR-TEF-CS`
- `PSR-CLARO-ASSREDES`

### Normalização da OV

No importador atual:

- espaços são removidos
- o valor completo da `OV` é enviado como `project_ov` para `ProjectRepository.insert()`
- a individualização e sanitização das OVs para `tbProjectOV` fica delegada ao `ProjectRepository`

### Repetição de linhas por OV

Pode haver múltiplas linhas da mesma `OV` por conta da coluna `TP`.

Comportamento implementado:

- a primeira linha da `OV` executa o fluxo principal de projeto
- as demais linhas da mesma `OV` reutilizam o mesmo `project_id`
- cada linha ainda pode acrescentar:
  - novos tipos em `tbProjectType`
  - novas alocações de equipe em `tbProjectTeam`

---

## Domínio de Status

### Mapeamento de status da origem

| Valor no Excel | Valor gravado |
|---|---|
| `Em andamento` / `Andamento` | `In progress` |
| `Não iniciado` / `Nao iniciado` / `Iniciar` | `Not started` |
| `On-hold` | `On Hold` |
| `Encerrado` / `Concluído` / `Concluido` | `Closed` |
| `Cancelado` | `Canceled` |
| `Modelo de negócio` / `Modelo de negocio` | `Business Model` |
| `Avaliação` / `Avaliacao` / `Em avaliação` / `Em avaliacao` | `Under Analysis` |
| vazio ou não mapeado | `Unidentified` |

### Projetos considerados fechados

O importador trata como fechados:

- `Closed`
- `Canceled`

Se o projeto já estiver fechado/cancelado na base, a linha é considerada **ignorada** e o projeto não é reaberto.

---

## Regras por Campo

### Client

- obrigatório
- é resolvido em `tbCompanyListName`
- se o cliente não existir:
  - a linha falha
  - todas as linhas da mesma `OV` falham em grupo
  - todas vão para o arquivo `_failed_rows.xlsx`

### Project Name

- obrigatório
- se ausente, a linha falha
- a falha também derruba todas as linhas da mesma `OV`

### TP

- opcional no sentido técnico, mas quando informado:
  - é sincronizado em `tbProjectType`
  - a gravação evita duplicidade exata de `project_id + type`
  - se existir linha vaga com `projecttp_project_id = 0`, ela é reaproveitada

### Pessoas (`PM`, `AM`, `Pre Sales`, `Technical Lead`)

- cada coluna pode conter mais de uma pessoa
- separadores aceitos:
  - quebra de linha
  - `/`
  - `|`
  - `,`
  - `+`
  - `&`
  - ` e `
- valores como `N/A`, `NA`, `TBD`, `0` e `-` são ignorados

Se a pessoa existir em `tbPersonListName`:
- é resolvido o `person_id`
- o importador tenta localizar o squad mais recente da pessoa
- se encontrar squad válido, usa `squad_department_id` e `squad_level_id`
- caso contrário, usa valores default por papel

Se a pessoa **não** existir em `tbPersonListName`:
- o projeto continua sendo importado
- a pessoa não é alocada
- a linha vai para o arquivo de falhas como **advertência**, não como erro fatal

---

## Papéis e defaults de equipe

| Papel | Coluna Excel | `technical_lead` | Default `department_id` | Default `level_id` |
|---|---|---:|---:|---:|
| PM | `PM` | 0 | 11 | 2 |
| AM | `AM` | 0 | 35 | 9 |
| Pre Sales | `Pre Sales` | 0 | 23 | 10 |
| Technical Lead | `Technical Lead` | 1 | 0 | 0 |

### Regras de alocação em `tbProjectTeam`

A função `allocate_person()` garante uma alocação ativa única por combinação de:

- `project_id`
- `person_id`
- `department_id`
- `level_id`
- `technical_lead`

Comportamento:

- se a mesma combinação já estiver ativa, não duplica
- se a pessoa já estiver ativa no projeto em outra função/configuração:
  - a alocação anterior é encerrada
  - uma nova linha é criada ou uma linha vaga é reaproveitada
- linhas vagas com `projteam_project_id = 0` podem ser reaproveitadas

### Datas de alocação

- `allocation_start`:
  - usa `Internalization Date`
  - se inválida ou ausente, usa fallback `31/03` do FY corrente
- `allocation_end`:
  - usa `Project Closure Date` quando houver

### Encerramento de equipe

Se o status normalizado for `Closed` ou `Canceled` e existir `Project Closure Date` válida:

- todas as alocações ativas do projeto são encerradas em `tbProjectTeam`
- o encerramento usa `Project Closure Date`

---

## Estratégia de Projeto

### Insert / update do projeto

A função `_build_project_payload_from_row()` monta payload com:

- `project_ov`
- `project_customer_id`
- `project_customer_name`
- `project_name`
- `project_owner = "PMO"`
- `project_status`
- `project_internalization_date`
- `project_start_date` quando houver
- `project_end_date` quando houver

Esse payload é enviado para:

```python
ProjectRepository.insert(payload)
```

O comportamento de insert/update, assim como a sincronização final de OVs normalizadas, fica centralizado no `ProjectRepository`.

### Identificação de projeto criado ou atualizado

No retorno consolidado:

- `projects_created` e `projects_updated` são métricas operacionais do importador
- para `OV` com múltiplas linhas, a primeira linha é a referência principal do grupo
- linhas ignoradas por projeto já fechado contam como `ignored_rows`

---

## Processamento Operacional

### Estratégia de chunks

- `CHUNK_SIZE = 200`
- o importador sempre processa o bloco logo abaixo do header
- após concluir o chunk:
  - remove todas as linhas processadas do arquivo de entrada
  - salva o workbook
  - avança para o próximo bloco até não restarem linhas

### Agrupamento por OV dentro do chunk

Dentro de cada chunk:

- as linhas são agrupadas por `OV`
- se uma linha do grupo falhar com erro crítico de grupo:
  - todas as linhas da mesma `OV` são enviadas ao arquivo de falhas

Erros críticos de grupo hoje:

- `Client` ausente ou inválido
- cliente não encontrado em `tbCompanyListName`
- `Project Name` ausente ou inválido
- falha ao inserir/atualizar projeto

### Arquivos gerados

| Arquivo | Local |
|---|---|
| Log de execução | `/home/bridgeadoption/storage/logs/<nome-arquivo>.log` |
| Linhas com erro/advertência | `/home/bridgeadoption/storage/output/<nome-arquivo>_failed_rows.xlsx` |

### Arquivo de falhas

O arquivo de falhas contém:

- todas as colunas originais
- `import_error_message`
- `import_error_column`
- `import_error_value`
- `import_original_row`
- `import_processed_at`
- `import_source`
- `import_original_file`

Observação importante:
- o arquivo de falhas é criado também para **advertências**, não apenas para erros fatais
- portanto, o arquivo pode existir mesmo quando o projeto foi gravado com sucesso

---

## Logs

### Log de execução (arquivo texto)

Eventos registrados:

- `START import`
- `INFO` com source, arquivo, chunk size, header row e totais
- `INFO` por chunk
- `INFO` para sincronização de tipo
- `INFO` para sincronização de equipe
- `INFO` para fechamento de equipe
- `INFO` / `WARN` / `ERROR` consolidados por linha processada, sempre com:
  - `row`
  - `ov`
  - `result`
  - `project_id` quando houver
  - motivo resumido em caso de `warning`, `error` ou `ignored`
- `WARN` quando falha atualizar progresso ou conferir linhas restantes
- `ERROR` para exceções de processamento

Exemplos esperados:

```text
INFO row=245 ov=68326_74746 result=success project_id=2723 created=0 updated=1 warnings=0
WARN row=246 ov=68326_74746 result=warning project_id=2723 created=0 updated=1 warnings=1 message="Technical Lead: pessoa não encontrada 'Nome X'"
ERROR row=247 ov=68326_74746 result=error column=Client value="Cliente XPTO" message="Cliente não encontrado em tbCompanyListName"
INFO row=248 ov=68326_74746 result=ignored project_id=2723 reason="project already closed"
```

### tbImportLog

Quando o repositório estiver disponível, são gravados logs funcionais para:

- campo obrigatório ausente ou inválido
- cliente não encontrado
- falha ao inserir/atualizar projeto
- advertências de pessoas não encontradas
- erros inesperados por linha

### tbImportControl

Quando o repositório estiver disponível, o importador atualiza o progresso com:

- total de linhas de origem
- lidas
- sucesso
- erros
- ignoradas
- restantes

---

## Datas

### Parsing aceito

O importador tenta interpretar datas nos formatos:

- `YYYY-MM-DD`
- `DD/MM/YYYY`
- `MM/DD/YYYY`
- `DD-MM-YYYY`
- `YYYY/MM/DD`
- `DD/MM/YY`
- `MM/DD/YY`
- `DD.MM.YYYY`
- `YYYY-MM-DD HH:MM:SS`

### Fallback de internalização

Se `Internalization Date` vier vazia ou inválida:

- é usado `31/03` do FY corrente
- regra implementada:
  - se hoje for abril ou depois, usa `31/03` do mesmo ano
  - se hoje for janeiro a março, usa `31/03` do ano anterior

---

## Métricas de Retorno

`run_import()` retorna um dicionário com:

| Campo | Descrição |
|---|---|
| `status` | `FINISHED` ou `FAILED` |
| `message` | Mensagem consolidada |
| `file_path` | Caminho do arquivo de entrada |
| `total_rows` | Total inicial de linhas de dados |
| `processed_success` | Linhas processadas com sucesso |
| `failed_rows` | Linhas com erro fatal |
| `warning_rows` | Linhas com advertência |
| `ignored_rows` | Linhas ignoradas |
| `projects_created` | Projetos criados |
| `projects_updated` | Projetos atualizados |
| `failed_file_path` | Caminho do arquivo de falhas |
| `remaining_rows_in_input` | Linhas ainda remanescentes no XLSX de entrada |
| `execution_log_path` | Caminho do log texto |
| `duration_seconds` | Duração total da execução |
| `total_chunks` | Quantidade de chunks processados |

### Regra de status final

O importador retorna:

- `FINISHED` apenas quando:
  - `failed_rows = 0`
  - `warning_rows = 0`
- `FAILED` quando houver:
  - qualquer erro fatal
  - qualquer advertência

> Atenção: advertência de pessoa não encontrada já é suficiente para status final `FAILED`, mesmo que o projeto tenha sido gravado.

---

## Pontos Críticos para Sustentação

| # | Regra |
|---|---|
| 1 | O cabeçalho do Excel é detectado dinamicamente nas primeiras 30 linhas |
| 2 | A `OV` é a identidade funcional do projeto no processo PMO |
| 3 | O valor integral da `OV` é enviado ao `ProjectRepository`; a normalização final da `tbProjectOV` não acontece no importador |
| 4 | Múltiplas linhas da mesma `OV` compartilham o mesmo `project_id` no mesmo chunk |
| 5 | Se o cliente falhar, todo o grupo da mesma `OV` falha |
| 6 | Pessoa não encontrada não derruba o projeto, mas gera advertência e arquivo de falhas |
| 7 | O arquivo de falhas inclui erros e advertências |
| 8 | Projeto fechado/cancelado na base não é reaberto pelo importador |
| 9 | `tbProjectType` evita duplicidade exata de tipo por projeto |
| 10 | `tbProjectTeam` evita duplicidade da mesma combinação ativa de pessoa/função |
| 11 | O arquivo de entrada é modificado durante a importação; sempre manter cópia antes de executar |
| 12 | O status final pode ser `FAILED` mesmo com projeto salvo, se houver apenas advertências |

---

## Troubleshooting Rápido

### Sintoma: todas as linhas de uma OV foram para o arquivo de falhas

Verificar:
- `Client` vazio
- cliente não cadastrado em `tbCompanyListName`
- `Project Name` vazio
- falha no `ProjectRepository.insert()`

### Sintoma: projeto foi salvo, mas o retorno final veio como `FAILED`

Verificar:
- se houve advertência de pessoa não encontrada
- se existe arquivo `_failed_rows.xlsx` contendo warnings
- se o log texto indica `warning_rows > 0`

### Sintoma: pessoa não entrou na equipe

Verificar:
- se o nome/alias existe em `tbPersonListName`
- se o nome veio com separadores incomuns não contemplados
- se a linha correspondente foi exportada no arquivo de falhas com advertência

### Sintoma: `department_id` / `level_id` inesperados

Verificar:
- se a pessoa possui registros em `tbSquad`
- qual é o registro mais recente segundo `squad_upgrade`
- se houve fallback para os defaults do papel

### Sintoma: projeto veio como ignorado

Verificar:
- status atual do projeto na base
- se o projeto já estava `Closed` ou `Canceled`

---

## Resumo Executivo

O importador Forecast PMO é um processo conservador, orientado por `OV`, com foco em baixo impacto operacional e rastreabilidade.

Principais comportamentos:

- lê XLSX com cabeçalho dinâmico
- usa `OV` como identidade funcional do projeto
- delega a persistência do projeto e das OVs ao `ProjectRepository`
- permite múltiplas linhas da mesma `OV` para suportar múltiplos `TP`
- falha em grupo por `OV` quando o cliente ou o projeto base é inválido
- trata ausência de pessoa como advertência operacional
- sincroniza tipos e equipe sem duplicar registros ativos equivalentes
- modifica o arquivo de entrada removendo as linhas já processadas
- gera log texto e planilha estruturada de falhas/advertências

Este documento está alinhado com a implementação atual do código e deve ser utilizado como referência oficial para suporte, implantação e troubleshooting.
