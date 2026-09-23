# PXP Import Task — Referência Técnica (19849)

> **Para:** Time de Implantação / Sustentação  
> **Arquivo:** `backend/app/services/importers/pxp_import_task_19849.py`  
> **Fonte de importação (`importctrl_source`):** `PxpImportTask19849`  
> **Última atualização:** 2026-09-16

---

## 1. Objetivo

Importa tasks pai do programa Cisco LCI a partir de um arquivo Excel (`.xlsx`) extraído do portal Cisco PXP.

Este importador é responsável por:

- criar novas tasks Cisco LCI;
- atualizar tasks Cisco LCI já existentes;
- aplicar regras de elegibilidade e opt-in;
- tratar a regra especial de **Opted Out**;
- atualizar activities filhas já existentes com base nos estágios do Excel;
- criar a activity **Implement** quando ela estiver ausente mas os detalhes do estágio existirem no arquivo;
- recalcular `task_completed` a partir das activities;
- atualizar `tbUseCase`;
- atualizar `tbUseCaseExitCriteria`;
- registrar histórico em `tbTaskRecord`;
- registrar logs funcionais em `tbImportLog` quando disponível;
- gerar arquivo `.xlsx` com linhas com erro;
- remover do arquivo original todas as linhas já processadas.

> Este documento reflete o comportamento atual do código e deve ser utilizado como referência operacional pelo time de implantação e sustentação.

---

## 2. Localização e dependências

### 2.1 Arquivo principal

```text
backend/app/services/importers/pxp_import_task_19849.py
```

### 2.2 Repositórios utilizados no código de produção

| Repositório | Obrigatório | Finalidade |
|---|---|---|
| `src.infrastructure.database.repositories.task_repository.TaskRepository` | Sim | Criar, buscar e atualizar tasks em `tbTask` |
| `src.infrastructure.database.repositories.task_activity_repository.TaskActivityRepository` | Sim | Buscar, criar e atualizar activities em `tbTaskActivity` |
| `src.infrastructure.database.repositories.task_history_repository.TaskHistoryRepository` | Sim | Registrar histórico em `tbTaskRecord` |
| `src.infrastructure.database.repositories.company_list_name_repository.CompanyListNameRepository` | Sim | Resolver `task_customer_id` a partir de `CR Party Name` |
| `src.infrastructure.database.repositories.import_log_repository.ImportLogRepository` | Não | Registrar erros funcionais em `tbImportLog` |
| `src.infrastructure.database.repositories.use_case_repository.UseCaseRepository` | Não | Buscar/criar use case e exit criteria |
| `src.infrastructure.database.repositories.import_control_repository.ImportControlRepository` | Não | Atualizar progresso da importação |

---

## 3. Storage utilizado em produção

O importador usa os seguintes caminhos fixos no servidor:

```python
BASE_STORAGE_PATH = Path("/home/bridgeadoption/storage")
BASE_INPUT_PATH = BASE_STORAGE_PATH / "input"
BASE_OUTPUT_PATH = BASE_STORAGE_PATH / "output"
BASE_LOGS_PATH = BASE_STORAGE_PATH / "logs"
```

### Saídas geradas

| Tipo | Caminho |
|---|---|
| Arquivo de entrada | `/home/bridgeadoption/storage/input/<arquivo>.xlsx` |
| Arquivo de erro | `/home/bridgeadoption/storage/output/<arquivo>_failed_rows.xlsx` |
| Log de execução | `/home/bridgeadoption/storage/logs/<arquivo>.log` |

---

## 4. Arquivo de entrada

### 4.1 Formato esperado

- Formato: `.xlsx`
- Primeira linha: cabeçalho obrigatório
- Processamento: `openpyxl`
- Estratégia operacional:
  - leitura em chunks;
  - remoção da linha processada do arquivo original;
  - salvamento do workbook ao final de cada chunk.

### 4.2 Colunas obrigatórias

| Coluna Excel | Observação |
|---|---|
| `Deal WS-ID` | WS da task, obrigatório e deve seguir padrão `WS-<número>` |
| `CR Party Name` | Nome do cliente |
| `CR Party ID` | Identificador Cisco do cliente |
| `Track` | Track Cisco |
| `Sub-Track` | Sub-track Cisco |
| `Deal Incentive Expiry Date` | Data fim da task |
| `Booking Date` | Data início e booking date |
| `Booking Amount - Net to Cisco` | Valor monetário |
| `Stage` | Elegibilidade da task |
| `Adopt Rebate Opt-In Status` | Estado de opt-in |
| `Adopt Rebate Start Date` | Início executado do rebate |
| `Stage Completion Date(onboard)` | Data do estágio Onboard |
| `Stage Completion Date (Implement)` | Data do estágio Implement |
| `Stage Completion Date(Use)` | Data do estágio Use |
| `Stage Completion Date(Engage)` | Data do estágio Engage |
| `Stage Completion Date(Adopt)` | Data do estágio Adopt |
| `Task Details (Onboard)` | Critérios do estágio Onboard |
| `Task Details (Implement)` | Critérios do estágio Implement |
| `Task Details (Use)` | Critérios do estágio Use |
| `Task Details (Engage)` | Critérios do estágio Engage |
| `Task Details (Adopt)` | Critérios do estágio Adopt |
| `Deal ID` | Deal Cisco |
| `Deal CPI Portfolio` | Arquitetura / portfolio |

### 4.3 Colunas opcionais

| Coluna Excel |
|---|
| `Incentive Level` |
| `Stage Completion Flag(onboard)` |
| `Stage Completion Flag (Implement)` |
| `Stage Completion Flag(Use)` |
| `Stage Completion Flag(Engage)` |
| `Stage Completion Flag(Adopt)` |
| `EA Flag` |
| `Subscription ID` |
| `Booking PO Number` |

### 4.4 Aliases de cabeçalho suportados

O importador aceita cabeçalhos equivalentes para alguns campos. Exemplos:

| Cabeçalho lógico | Aliases aceitos |
|---|---|
| `Stage Completion Flag(onboard)` | `Stage Completion Flag(onboard)` / `Stage Completion Flag (onboard)` |
| `Stage Completion Date(onboard)` | `Stage Completion Date(onboard)` / `Stage Completion Date (onboard)` |
| `Task Details (Onboard)` | `Task Details (Onboard)` / `Task Details(Onboard)` |
| `Stage Completion Flag (Implement)` | `Stage Completion Flag (Implement)` / `Stage Completion Flag(Implement)` |
| `Stage Completion Date (Implement)` | `Stage Completion Date (Implement)` / `Stage Completion Date(Implement)` |
| `Task Details (Implement)` | `Task Details (Implement)` / `Task Details(Implement)` |
| `Stage Completion Flag(Use)` | `Stage Completion Flag(Use)` / `Stage Completion Flag (Use)` |
| `Stage Completion Date(Use)` | `Stage Completion Date(Use)` / `Stage Completion Date (Use)` |
| `Task Details (Use)` | `Task Details (Use)` / `Task Details(Use)` |
| `Stage Completion Flag(Engage)` | `Stage Completion Flag(Engage)` / `Stage Completion Flag (Engage)` |
| `Stage Completion Date(Engage)` | `Stage Completion Date(Engage)` / `Stage Completion Date (Engage)` |
| `Task Details (Engage)` | `Task Details (Engage)` / `Task Details(Engage)` |
| `Stage Completion Flag(Adopt)` | `Stage Completion Flag(Adopt)` / `Stage Completion Flag (Adopt)` |
| `Stage Completion Date(Adopt)` | `Stage Completion Date(Adopt)` / `Stage Completion Date (Adopt)` |
| `Task Details (Adopt)` | `Task Details (Adopt)` / `Task Details(Adopt)` |

> Se qualquer coluna obrigatória estiver ausente no cabeçalho, a importação falha antes de processar as linhas.

---

## 5. Mapeamento principal para o banco

### 5.1 `tbTask`

| Coluna Excel | Campo destino |
|---|---|
| `Deal WS-ID` | `task_ws` |
| `CR Party Name` | `task_cr_party_name` |
| `CR Party ID` | `task_cr_party_id` |
| `Track` | `task_track` |
| `Sub-Track` | `task_subtrack` |
| `Incentive Level` | `task_reference` |
| `Deal Incentive Expiry Date` | `task_end` |
| `Booking Date` | `task_start`, `task_booking_date` |
| `Booking Amount - Net to Cisco` | `task_booking_amount` |
| `Stage` | `task_eligible` |
| `Adopt Rebate Opt-In Status` | `task_opt_in_flag` |
| `Adopt Rebate Start Date` | `task_start_performed` |
| `EA Flag` | `task_ea_flag` |
| `Deal ID` | `task_deal_id` |
| `Deal CPI Portfolio` | `task_architecture` |

### 5.2 `tbTaskActivity`

| Coluna Excel | Campo destino |
|---|---|
| `Stage Completion Date(onboard)` | `activity_end_performed` da activity `Onboard` |
| `Stage Completion Date (Implement)` | `activity_end_performed` da activity `Implement` |
| `Stage Completion Date(Use)` | `activity_end_performed` da activity `Use` |
| `Stage Completion Date(Engage)` | `activity_end_performed` da activity `Engage` |
| `Stage Completion Date(Adopt)` | `activity_end_performed` da activity `Adopt` |
| `Task Details (Onboard)` | `activity_scope` da activity `Onboard` |
| `Task Details (Implement)` | `activity_scope` da activity `Implement` |
| `Task Details (Use)` | `activity_scope` da activity `Use` |
| `Task Details (Engage)` | `activity_scope` da activity `Engage` |
| `Task Details (Adopt)` | `activity_scope` da activity `Adopt` |

---

## 6. Normalização dos valores

### 6.1 `Stage`

| Valor origem | Resultado |
|---|---|
| `Eligible` | `task_eligible = "Y"` |
| `Not Eligible` / `Not-Eligible` | `task_eligible = "N"` |
| `Expired` | `task_eligible = "Y"` |

### 6.2 `Adopt Rebate Opt-In Status`

| Valor origem | `task_opt_in_flag` | `opt_in_label` |
|---|---|---|
| `Opted In` | `1` | `OPTED_IN` |
| `Pending` | `0` | `PENDING` |
| `Opted Out` | `1` | `OPTED_OUT` |

### 6.3 `EA Flag`

| Valor origem | Resultado |
|---|---|
| `Y`, `Yes`, `true`, `1` | `task_ea_flag = 1` |
| `N`, `No`, `false`, `0` | `task_ea_flag = 0` |
| vazio / outro valor | `0` |

### 6.4 Datas

Campos de data são convertidos para `date` Python e persistidos no padrão aceito pelo MariaDB.

Formatos aceitos:
- `YYYY-mm-dd`
- `dd/mm/YYYY`
- `mm/dd/YYYY`
- `dd-mm-YYYY`
- `YYYY/mm/dd`
- `dd Mon YYYY`
- `dd Month YYYY`
- `YYYY-mm-dd HH:MM:SS`

### 6.5 Regra entre `Booking Date` e `Adopt Rebate Start Date`

Se ambas existirem e:

```text
Booking Date < Adopt Rebate Start Date
```

então o importador força:

```text
task_start = Adopt Rebate Start Date
```

---

## 7. Resolução da task existente

A task existente é buscada por `task_ws`.

### Regras aplicadas:
- busca por `task_ws = Deal WS-ID`;
- considera apenas tasks com `task_tasktype_id IN (21, 22)`;
- dá prioridade para `task_tasktype_id = 22`;
- se houver múltiplas tasks elegíveis para o mesmo WS, a linha falha com erro.

### Tipo de task para novas tasks

| Campo | Valor |
|---|---|
| `task_tasktype_id` | `22` |

---

## 8. Resolução do customer

Para criar task nova ou atualizar `task_customer_id`, o importador resolve o cliente por nome usando:

```text
CR Party Name -> CompanyListNameRepository -> company_id
```

Se o cliente não for encontrado:
- a linha falha;
- vai para o arquivo de erro;
- registra `tbImportLog` quando disponível.

---

## 9. Regras de negócio da task

### 9.1 Task nova sem regra especial
Se a task não existir e o status não cair em regra especial:

- cria task com `task_tasktype_id = 22`;
- `task_status`:
  - `2` (`IN PROGRESS`) quando `task_opt_in_flag = 1`;
  - `1` (`OPEN`) quando `task_opt_in_flag = 0`;
- `task_eligible` conforme `Stage`;
- grava histórico:
  - `Task criada via PxpImportTask19849`;
  - `OPT IN STATUS`.

### 9.2 Regra especial — `Opted Out`
Esta regra tem prioridade e é processada antes das demais regras genéricas.

#### Cenário A — task não existe
Cria nova task com:
- `task_status = 4` (`CANCELLED`)
- `task_eligible = 'N'`

Além disso:
- grava histórico LOG:
  - `Task criada via PxpImportTask19849`
  - `Opt-Out was performed for this task`
- grava histórico `OPT IN STATUS`

#### Cenário B — task existe com `task_status IN (4,5,6,10)`
- não altera task;
- não altera activities;
- marca a linha como `ignored`;
- grava histórico `OPT IN STATUS` somente se o valor mudou em relação ao último histórico do mesmo tipo.

#### Cenário C — task existe com `task_status NOT IN (4,5,6,10)`
Atualiza a task para:
- `task_status = 4` (`CANCELLED`)
- `task_forecast = 0`
- `task_eligible = 'N'`

Em seguida:
- grava histórico LOG na task:
  - `Opt-Out was performed for this task`
- cancela todas as activities abertas com:
  - `activity_status = 4`
- grava histórico LOG em cada activity cancelada:
  - `Opt-Out was performed for this task`
- grava histórico `OPT IN STATUS` se o valor mudou

> Observação: task com `OPTED_OUT` não entra no fluxo normal de sincronização de activities.

### 9.3 Regra — task não elegível
Se:
- `task_eligible = 'N'`
- `opt_in_label != "OPTED_IN"`
- task atual está aberta
- task atual na base está marcada como elegível

então:
- atualiza a task para:
  - `task_status = 5` (`DECLINED`)
  - `task_eligible = 'N'`
  - `task_status_justification = "TASK NOT ELIGIBLE BY VENDOR"`
- grava histórico:
  - `Task status changed to Declined; Task marked as not eligible by Cisco`

Se a task já estiver fechada e também não elegível:
- a linha é ignorada.

### 9.4 Regra — reabertura por `OPTED_IN`
Se:
- `task_eligible = 'Y'`
- `opt_in_label = "OPTED_IN"`
- task atual estiver em status fechado `IN (4,5,6,10)`

então a task é reaberta com:
- `task_status = 2` (`IN PROGRESS`)
- `task_status_justification = NULL`
- `task_eligible = 'Y'`

Histórico gravado:
- `Task reopened as In Progress due to eligible Opted In source row`

---

## 10. Estratégia de atualização da `tbTask`

A função `_update_existing_task()`:

- compara campo a campo;
- só atualiza campos com diferença real;
- só grava histórico se houver pelo menos uma mudança;
- atualiza `task_start_performed` apenas se a data nova for maior que a já existente;
- atualiza `task_end_performed` quando houver diferença.

### Campos comparados

- `task_reference`
- `task_customer_id`
- `task_cr_party_id`
- `task_cr_party_name`
- `task_end`
- `task_currency`
- `task_track`
- `task_subtrack`
- `task_booking_date`
- `task_booking_amount`
- `task_architecture`
- `task_deal_id`
- `task_ws`
- `task_eligible`
- `task_opt_in_flag`
- `task_ea_flag`
- `task_start`
- `task_start_performed`
- `task_end_performed`

---

## 11. Regras de activities filhas

### 11.1 Premissas
- activities representam os estágios:
  - `Onboard`
  - `Implement`
  - `Use`
  - `Engage`
  - `Adopt`
- a associação é feita por:
  - `activity_task_id = task_id`
  - `activity_name = nome do estágio`

### 11.2 Se a task não possui activities
Se `repo_activity.get_count_activity(task_id) == 0`:

#### Caso 1 — task elegível e `task_opt_in_flag != 0`
A linha falha com erro:
```text
Task elegível com Opted In, porém sem activities cadastradas
```

#### Caso 2 — demais casos
A linha segue sem erro.

> Na prática, tasks elegíveis com opt-in ativo deveriam já possuir activities.

### 11.3 Atualização do `activity_scope`
O valor de `Task Details (XXX)` é normalizado e salvo com quebra de linha entre os critérios.

Exemplo de origem:
```text
1. Critério A - N 2. Critério B - Y 3. Critério C - N
```

Resultado salvo:
```text
1. Critério A - N
2. Critério B - Y
3. Critério C - N
```

### 11.4 Cálculo de progresso `activity_completed`

#### Regra geral
Para `Onboard`, `Use`, `Engage` e `Adopt`:

```text
activity_completed = quantidade_de_Y / (quantidade_total_de_criterios + 1)
```

#### Exceção — `Implement`
Para `Implement`:

```text
activity_completed = quantidade_de_Y / quantidade_total_de_criterios
```

> Esta exceção existe no código atual e deve ser considerada pelo time de sustentação.

### 11.5 Atualização da activity existente
Para cada estágio:
- localiza a activity correspondente pelo nome;
- atualiza `activity_scope` se mudou;
- atualiza `activity_completed` se mudou;
- grava histórico da activity quando houver alteração.

### 11.6 Activity `Implement` ausente
Se a task já possui activities, mas não existe a activity `Implement`, e a coluna `Task Details (Implement)` tem conteúdo:

- o importador cria a activity `Implement` automaticamente;
- grava histórico específico da criação;
- registra log funcional informando a autocorreção.

A activity criada usa:
- `activity_status = 10` (`COMPLETED`) se:
  - `Stage Completion Flag (Implement) = 1`
  - e `Stage Completion Date (Implement)` não é nula
- caso contrário:
  - `activity_status = 2` (`IN PROGRESS`)

Campos principais da nova `Implement`:
- `activity_task_id = task_id`
- `activity_name = "Implement"`
- `activity_seq = 2`
- `activity_scope = raw_scope`
- `activity_completed` calculado pela regra especial
- `activity_currency = "USD"`
- `activity_start = task_start_performed`
- `activity_end = task_end`
- `activity_end_performed = Stage Completion Date (Implement)` ou `task_end`

---

## 12. Recalculo de `task_completed`

Após sincronizar activities, o importador pode recalcular `task_completed` quando:

- a task não está fechada;
- existe ao menos uma activity;
- a média retornada por `repo_task.get_task_completion_summary(task_id)` for diferente do valor atual.

Nesse caso:
- atualiza `task_completed`;
- grava histórico:
  - `Change task_completed to <valor>`

---

## 13. Regras de `tbUseCase`

### 13.1 Busca
O importador usa:

```text
use_case_repository.get_use_case_ids(
    vendor_id=1,
    track=<Track>,
    subtrack=<Sub-Track>
)
```

### 13.2 Se não existir
Cria use case com:

- `uc_vendor_id = 1`
- `uc_architecture = Deal CPI Portfolio`
- `uc_track = Track`
- `uc_use_case = Sub-Track`
- `uc_update_date = datetime.now()`

---

## 14. Regras de `tbUseCaseExitCriteria`

Para cada estágio (`Onboard`, `Implement`, `Use`, `Engage`, `Adopt`):

1. lê `Task Details (XXX)`;
2. remove sufixos `- Y` / `- N`;
3. mantém quebra de linha entre critérios;
4. sincroniza na `tbUseCaseExitCriteria`.

### Busca
O importador usa:

```text
use_case_repository.get_use_case_exit_criteria_ids(
    vendor_id=1,
    track=<Track>,
    subtrack=<Sub-Track>,
    name=<StageName>
)
```

### Atualização
Se existir `ucec_id`, atualiza apenas quando `ucec_update_date < hoje`.

Campos atualizados:
- `ucec_scope`
- `ucec_update_date`
- `ucec_updated_by = "System BA"`

### Inserção
Se não existir:
- `ucec_tasktype_id = 22`
- `ucec_uc_id = uc_id`
- `ucec_seq = 1..5`
- `ucec_name = nome do estágio`
- `ucec_scope = escopo limpo`
- `ucec_update_date = hoje`
- `ucec_updated_by = "System BA"`

---

## 15. Histórico gravado em `tbTaskRecord`

### 15.1 Tipo `LOG`
Exemplos de registros:
- `Task criada via PxpImportTask19849`
- `Opt-Out was performed for this task`
- `Task status changed to Declined; Task marked as not eligible by Cisco`
- `Task reopened as In Progress due to eligible Opted In source row`
- `Change task_completed to ...`
- `Change task_start_performed to ...`
- `Change activity_scope for Onboard`
- `Change activity_completed for Implement to ...`

### 15.2 Tipo `OPT IN STATUS`
O importador grava histórico específico com:
- `taskrecord_type = "OPT IN STATUS"`
- `taskrecord_remark = valor original da coluna 'Adopt Rebate Opt-In Status'`
- `taskrecord_date = Adopt Rebate Start Date`  
  ou, se nulo, `Booking Date`

Regras:
- task nova: sempre insere;
- task existente: só insere se o último `OPT IN STATUS` tiver valor diferente.

---

## 16. Sanitização numérica

Campo principal:
- `task_booking_amount`

Validação:
- convertido para `Decimal`;
- quantizado em `0.000001`;
- validado contra faixa permitida de `DECIMAL(30,6)`.

Se o valor for inválido ou fora do range:
- o campo é gravado como `NULL`;
- a linha não falha;
- é registrado log funcional em `tbImportLog`.

---

## 17. Arquivo de falhas

O arquivo de falhas é criado em:

```text
/home/bridgeadoption/storage/output/<stem>_failed_rows.xlsx
```

Ele contém:
- todas as colunas originais do Excel;
- `import_error_message`
- `import_error_column`
- `import_error_value`
- `import_original_row`
- `import_processed_at`
- `import_source`
- `import_original_file`

O arquivo é reescrito quando necessário e só recebe linhas que realmente falharam.

---

## 18. Logs

### 18.1 Log de execução em arquivo texto
Caminho:
```text
/home/bridgeadoption/storage/logs/<stem>.log
```

Eventos típicos:
- `START`
- `INFO` de abertura
- `INFO` por chunk
- `INFO` por linha relevante
- `WARN` de falha não crítica
- `ERROR` com traceback reduzido
- `FINISH`

### 18.2 `tbImportLog`
Quando o repositório estiver disponível, o importador grava erros funcionais por linha.

Exemplos:
- campo obrigatório ausente ou inválido;
- customer não encontrado;
- valor monetário inválido;
- task elegível com opt-in porém sem activities;
- falha ao confirmar persistência após criação;
- falha ao criar a activity `Implement`.

---

## 19. Métricas retornadas por `run_import()`

A função retorna estrutura com:

| Campo | Descrição |
|---|---|
| `status` | `FINISHED` ou `FAILED` |
| `message` | Resumo consolidado |
| `total_rows` | Total inicial de linhas do arquivo |
| `processed_success` | Linhas tratadas com sucesso |
| `failed_rows` | Linhas com erro |
| `ignored_rows` | Linhas ignoradas |
| `tasks_created` | Tasks criadas |
| `tasks_updated` | Tasks atualizadas |
| `tasks_cancelled` | Tasks canceladas / declinadas / encerradas por regra |
| `activities_updated` | Activities atualizadas |
| `activities_cancelled` | Activities canceladas |
| `failed_file_path` | Caminho do arquivo de falhas |
| `remaining_rows_in_input` | Linhas restantes no input |
| `execution_log_path` | Caminho do log de execução |
| `duration_seconds` | Duração total |
| `total_chunks` | Quantidade de chunks processados |

---

## 20. Pontos críticos para implantação e sustentação

| # | Regra crítica |
|---|---|
| 1 | O arquivo de entrada é alterado durante a importação; sempre guardar cópia antes da execução |
| 2 | O importador processa apenas `.xlsx` |
| 3 | `Deal WS-ID` é obrigatório e deve seguir `WS-<número>` |
| 4 | Novas tasks sempre usam `task_tasktype_id = 22` |
| 5 | Busca de task existente considera tipos `21` e `22`, com prioridade para `22` |
| 6 | `Opted Out` tem fluxo próprio e prioritário |
| 7 | `Opted Out` em task nova cria task já cancelada e não elegível |
| 8 | `Opted Out` em task aberta cancela a task e cancela activities abertas |
| 9 | `OPT IN STATUS` é gravado separadamente de `LOG` |
| 10 | Tasks elegíveis com opt-in e sem activities geram erro funcional |
| 11 | O estágio `Implement` pode ser criado automaticamente se estiver ausente |
| 12 | `activity_completed` de `Implement` usa fórmula diferente dos demais estágios |
| 13 | Valores monetários inválidos não derrubam a linha; são gravados como `NULL` |
| 14 | `task_start` pode ser forçado para `Adopt Rebate Start Date` |
| 15 | `UseCaseExitCriteria` só é atualizado quando a data do registro é anterior ao dia atual |

---

## 21. Erros comuns e diagnóstico

| Mensagem | Causa provável | Ação sugerida |
|---|---|---|
| `Campo obrigatório ausente ou inválido: Deal WS-ID` | WS ausente ou inválido | Validar coluna `Deal WS-ID` |
| `Campo obrigatório ausente ou inválido: CR Party Name` | nome do cliente vazio | Corrigir planilha |
| `Campo obrigatório ausente ou inválido: CR Party ID` | ID Cisco inválido | Corrigir planilha |
| `Customer não encontrado a partir de 'CR Party Name'` | empresa não encontrada em `CompanyListName` | Cadastrar alias/nome do cliente |
| `Task elegível com Opted In, porém sem activities cadastradas` | task já deveria ter estágios mas não possui filhas | Validar carga anterior / estado da base |
| `Falha ao confirmar persistência da task após criação` | insert retornou id, mas task não pôde ser reconsultada | Validar repositório, transação e base |
| `Falha ao criar activity 'Implement' ausente` | erro ao autocriar a stage Implement | Validar estrutura da activity e integridade da task |

### Query sugerida — localizar task por WS

```sql
SELECT
    task_id,
    task_tasktype_id,
    task_status,
    task_eligible,
    task_opt_in_flag,
    task_ws,
    task_deal_id,
    task_track,
    task_subtrack,
    task_start_performed,
    task_end_performed,
    task_completed
FROM tbTask
WHERE task_ws = 'WS-XXXXXXXX';
```

### Query sugerida — listar activities da task

```sql
SELECT
    activity_id,
    activity_task_id,
    activity_name,
    activity_status,
    activity_completed,
    activity_end_performed,
    activity_scope
FROM tbTaskActivity
WHERE activity_task_id = <TASK_ID>
ORDER BY activity_seq, activity_id;
```

### Query sugerida — histórico de opt-in

```sql
SELECT
    taskrecord_id,
    taskrecord_task_id,
    taskrecord_type,
    taskrecord_date,
    taskrecord_remark,
    taskrecord_updated_by
FROM tbTaskRecord
WHERE taskrecord_task_id = <TASK_ID>
  AND taskrecord_type IN ('LOG', 'OPT IN STATUS')
ORDER BY taskrecord_id DESC;
```

---

## 22. Resumo executivo

O `PxpImportTask19849` é o importador de tasks pai Cisco LCI baseado em Excel do portal Cisco PXP.

Principais características operacionais:

- cria e atualiza tasks LCI;
- sincroniza activities por estágio;
- cria automaticamente a activity `Implement` quando necessário;
- recalcula progresso da task;
- sincroniza use cases e exit criteria;
- mantém histórico funcional detalhado;
- produz arquivo estruturado de falhas;
- remove linhas processadas do input para suportar retomada parcial;
- possui regra prioritária e dedicada para `Opted Out`.

A regra mais sensível para sustentação é:

- `OPTED_OUT` não é tratado apenas como “não opted in”;
- ele possui fluxo próprio:
  - task nova nasce cancelada;
  - task fechada é ignorada;
  - task aberta é cancelada e tem suas activities abertas canceladas.

Este documento deve ser usado como referência oficial para implantação, troubleshooting e sustentação do importador 19849.

---

## 23. Referências

- Código-fonte: [`backend/app/services/importers/pxp_import_task_19849.py`](../../../backend/app/services/importers/pxp_import_task_19849.py)
- Referência de tasks PXP: [`pxp_import_task_6702.md`](./pxp_import_task_6702.md)
- Referência de activities PXP: [`pxp_import_activity_5890.md`](./pxp_import_activity_5890.md)
- Troubleshooting geral: [`importer_troubleshooting.md`](./importer_troubleshooting.md)
- Documentação de usuário do importer: [`docs/09_usuarios/08_public/importer.md`](../../09_usuarios/08_public/importer.md)
