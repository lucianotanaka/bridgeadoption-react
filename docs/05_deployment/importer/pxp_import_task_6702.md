# pxp_import_task_6702

## Visão Geral

O módulo `backend/app/services/importers/pxp_import_task_6702.py` é o importador oficial do processo **6702 (PXP Task)**.

Ele é responsável por:

- Ler arquivos XLSX do diretório de input
- Processar linha a linha em chunks
- Criar, atualizar ou encerrar tasks conforme regras de elegibilidade e opt-in
- Encerrar activities abertas quando aplicável
- Registrar histórico em `tbTaskRecord`
- Registrar logs funcionais em `tbImportLog`
- Gerar arquivo XLSX com linhas com erro
- Remover do arquivo original todas as linhas já processadas
- Confirmar a persistência da task no banco após cada criação

Este documento reflete **exatamente o comportamento atual do código** e deve ser considerado a fonte confiável para o time de sustentação e implantação.

---

## Arquitetura Técnica

### Localização

```
backend/app/services/importers/pxp_import_task_6702.py
```

### Repositórios utilizados

| Repositório | Obrigatório | Finalidade |
|---|---|---|
| `TaskRepository` | Sim | CRUD de tasks em `tbTask` |
| `TaskActivityRepository` | Sim | Leitura e atualização de activities |
| `TaskHistoryRepository` | Sim | Registro de histórico em `tbTaskRecord` |
| `CompanyListNameRepository` | Sim | Resolução de `company_id` a partir do nome |
| `ImportLogRepository` | Não | Log funcional em `tbImportLog` |
| `UseCaseRepository` | Não | Resolução de `task_architecture` e `task_solution_domain` |
| `ImportControlRepository` | Não | Atualização de progresso em `tbImportControl` |

---

## Arquivo de Entrada

### Formato

- XLSX
- Primeira linha obrigatoriamente contém o header

### Colunas obrigatórias

| Coluna | Campo destino |
|---|---|
| `Plan Name` | — |
| `Deal Name` | — |
| `CR Party Name` | `task_cr_party_name` / resolução de `company_id` |
| `Incentive Eligibility Status` | `source_status` (regra de negócio) |
| `Track` | `task_track` |
| `Sub-Track` | `task_subtrack` |
| `Deal Id` | `task_ws` |
| `Deal ID` | `task_deal_id` |

> ⚠️ `Deal Id` e `Deal ID` são **case sensitive** e representam campos diferentes.

### Regra do WS

- Deve seguir o padrão: `WS-<número>`
- Sem WS válido:
  - A linha falha
  - Vai para o arquivo de erro

---

## Domínio de Status

### Status da Origem (coluna `Incentive Eligibility Status`)

| Valor no Excel | Código interno |
|---|---|
| `Eligible` | 1 |
| `Not Eligible` | 0 |
| `Expired` | 6 |

### Status da Task (`tbTask.task_status`)

| Código | Descrição |
|---|---|
| 1 | OPEN |
| 2 | IN PROGRESS |
| 3 | ON HOLD |
| 4 | CANCELLED |
| 5 | DECLINED |
| 6 | EXPIRED |
| 7 | SUBMITTED |
| 8 | RESUBMITTED |
| 9 | APPROVED TO CLOSE |
| 10 | COMPLETED |

Task é considerada **fechada** quando `task_status IN (4, 5, 6, 10)`.

### Status da Activity

Activity é considerada fechada quando `activity_status IN (4, 5, 6, 10)`.

---

## Regras de Negócio

### Lifecycle Opt-In Status = Opted Out

Esta regra tem **prioridade** sobre o `Incentive Eligibility Status` — é processada antes de qualquer outra.

O valor `Opted Out` na coluna `Lifecycle Opt-In Status` produz `opt_in_flag = -1` internamente.

---

#### Cenário A — task NÃO existe

1. Valida `Deal ID` (obrigatório para criação)
2. Constrói payload com:
   - `task_status = 4` (CANCELLED)
   - `task_status_justification = "AN OPT-OUT WAS PERFORMED FOR THE TASK"`
   - `task_eligible = "N"` (forçado explicitamente)
3. Cria task
4. **Confirma persistência** via `_confirm_created_task()` — se falhar, linha vira erro
5. Registra histórico: `"Opt-Out was performed for this task [on <data>]"`

---

#### Cenário B — task JÁ existe com status 4 ou 5

- **Ignora silenciosamente**
- Task já está Cancelled ou Declined — nenhuma ação necessária

---

#### Cenário C — task JÁ existe com status diferente de 4 e 5

Inclui tasks com status 1 (Open), 2 (In Progress), 3 (On Hold), **6 (Expired)** e **10 (Completed)**.

Executa `_close_task_as_opted_out()`:

Atualiza:
```
task_status = 4 (CANCELLED)
task_forecast = 0
task_status_justification = "AN OPT-OUT WAS PERFORMED FOR THE TASK"
task_eligible = "N"
```

Registra histórico na task:
```
"Opt-Out was performed for this task [on <data>]"
```

Fecha todas as activities abertas:
```
activity_status = 4 (CANCELLED)
```

Registra histórico por activity com o mesmo remark.

> ⚠️ Tasks com status 6 (Expired) e 10 (Completed) **são reprocessadas** pelo Opted Out — não são ignoradas.

---

### Incentive Eligibility Status = Eligible

#### Se NÃO existe task

Cria nova task com:
- `task_tasktype_id = 22`
- `task_eligible = "Y"`
- `task_status`:
  - `1` (OPEN) por padrão
  - `2` (IN PROGRESS) se Lifecycle Opt-In = Opted In
- **Confirma persistência** via `_confirm_created_task()` — se falhar, linha vira erro

Histórico: `"Task created at <data>"`

Se opt-in ativo: `"Task started at <data>"` + `task_start_performed`

---

#### Se EXISTE task

- Se task estiver **fechada** → linha ignorada
- Se task estiver **aberta**:
  - Atualiza apenas campos com diferença real
  - Se opt-in ativo e status era Open → promove para `2` (In Progress)
  - Não altera task fechada

**Regra especial: Opted In + task Cancelled (4) + Eligible:**
- Reabre task com `task_status = 2` (In Progress)
- Atualiza `task_opt_in_flag = 1`
- Atualiza `task_start_performed`
- Registra histórico: `"Task reopened as In Progress because Opted In was performed on <data>"`

---

### Incentive Eligibility Status = Not Eligible

#### Se NÃO existe task

Cria task com:
- `task_status = 5` (DECLINED)
- `task_status_justification = "TASK NOT ELIGIBLE BY VENDOR"`
- `task_eligible = "N"`
- **Confirma persistência** via `_confirm_created_task()` — se falhar, linha vira erro

Histórico: `"Task created as not eligible by Cisco"`

> ℹ️ A task é criada mesmo sendo Not Eligible — diferente do que o cabeçalho do arquivo sugere. O comportamento implementado cria a task como Declined.

---

#### Se EXISTE task

- Se task estiver **fechada** → linha ignorada
- Se task estiver **aberta** → executa `_close_task_as_not_eligible()`:

```
task_status = 5 (DECLINED)
task_eligible = "N"
task_forecast = 0
task_status_justification = "TASK NOT ELIGIBLE BY VENDOR"
```

Histórico:
```
"Task status changed to Declined; Task marked as not eligible by Cisco"
```

Fecha activities abertas com `activity_status = 4` (CANCELLED).

---

### Incentive Eligibility Status = Expired

#### Se NÃO existe task

Cria task com:
- `task_status = 6` (EXPIRED)
- **Confirma persistência** via `_confirm_created_task()` — se falhar, linha vira erro

Histórico: `"Task created at <data> with status Expired"`

---

#### Se EXISTE task

- Se task estiver **fechada** → linha ignorada
- Se task estiver **aberta** → executa `_close_task_as_expired()`:

```
task_status = 6 (EXPIRED)
task_forecast = 0
```

Histórico: `"Task status changed to Expired"`

Fecha activities abertas com `activity_status = 6` (EXPIRED).

---

## Validação Pós-Criação

Após toda criação de task (`_create_task_from_payload`), o importador executa `_confirm_created_task()`:

- Busca a task pelo `task_id` retornado
- Confirma que o `task_id` existe na `tbTask`
- Confirma que o `task_ws` gravado corresponde ao WS esperado da linha

Se a confirmação falhar:
- A linha é tratada como **erro**
- Log funcional é gravado em `tbImportLog`
- A linha vai para o arquivo `_failed_rows.xlsx`
- O resultado retornado é `success=False`

> ℹ️ Essa confirmação protege contra cenários onde o repositório retorna um `task_id` mas a task não pode ser reconsultada de forma consistente.

---

## Tipo de Task

| Campo | Valor |
|---|---|
| `task_tasktype_id` para novas tasks | `22` |
| Tipos aceitos na busca de task existente | `21` e `22` |
| Prioridade na busca | tipo `22` sobre tipo `21` |

---

## Estratégia de Atualização

A função `_update_existing_task()`:

- Compara campo a campo
- Só atualiza se houver diferença real de valor
- Não atualiza task fechada
- Só grava histórico se houver pelo menos uma mudança

Campos comparados:

- `task_reference`
- `task_customer_id`, `task_cr_party_id`, `task_cr_party_name`
- `task_end`, `task_value`, `task_currency`
- `task_track`, `task_subtrack`, `task_description`
- `task_booking_date`, `task_booking_amount`
- `task_architecture`, `task_solution_domain`
- `task_deal_id`, `task_ws`
- `task_opt_in_flag`, `task_telemetry_flag`, `task_ea_flag`

---

## Sanitização Numérica

Campos: `task_value` e `task_booking_amount`

Validados contra `DECIMAL(30,6)`.

Se o valor for inválido ou fora do range:
- O campo é gravado como `NULL`
- A linha **não falha**
- Log funcional é gravado em `tbImportLog`

---

## Processamento Operacional

### Estratégia de chunks

- `CHUNK_SIZE = 1000`
- Processa de baixo para cima dentro do chunk
- Remove cada linha processada do arquivo de entrada com `ws.delete_rows()`
- Salva o workbook após cada chunk

### Arquivos gerados

| Arquivo | Local |
|---|---|
| Log de execução | `storage/logs/<nome-arquivo>.log` |
| Linhas com erro | `storage/output/<nome-arquivo>_failed_rows.xlsx` |

O arquivo de falhas **só é criado** se houver ao menos uma linha com erro.

### Arquivo de falhas

Contém:
- Todas as colunas originais da linha
- `import_error_message`
- `import_error_column`
- `import_error_value`
- `import_original_row`
- `import_processed_at`
- `import_source`
- `import_original_file`

---

## Logs

### Log de execução (arquivo texto)

Eventos registrados:
- `START` / `FINISH`
- `INFO` por chunk (início, fim, métricas)
- `INFO` por linha processada com resultado
- `ERROR` para erros inesperados com traceback
- `WARN` para avisos não críticos

### tbImportLog

Registros funcionais por linha:
- Campo obrigatório ausente ou inválido
- Customer não encontrado via `CR Party Name`
- Valor numérico inválido ou fora do range
- Falha na confirmação pós-criação da task

### tbTaskRecord

Sempre gravado quando:
- Task criada (qualquer status)
- Task declinada, expirada ou cancelada
- Activity fechada individualmente
- Campo relevante alterado

---

## Métricas de Retorno

`run_import()` retorna dicionário com:

| Campo | Descrição |
|---|---|
| `status` | `FINISHED` ou `FAILED` |
| `message` | Mensagem consolidada |
| `total_rows` | Total de linhas no arquivo |
| `processed_success` | Linhas processadas com sucesso |
| `failed_rows` | Linhas com erro |
| `ignored_rows` | Linhas ignoradas (sem ação necessária) |
| `tasks_created` | Tasks criadas |
| `tasks_updated` | Tasks atualizadas |
| `tasks_cancelled` | Tasks canceladas/declinadas/expiradas |
| `activities_cancelled` | Activities encerradas |
| `remaining_rows_in_input` | Linhas restantes no arquivo de entrada |
| `failed_file_path` | Caminho do arquivo de falhas |
| `execution_log_path` | Caminho do log de execução |
| `duration_seconds` | Tempo total de execução |
| `total_chunks` | Total de chunks processados |

---

## Pontos Críticos para Sustentação

| # | Regra |
|---|---|
| 1 | WS é obrigatório e deve seguir o padrão `WS-<número>` |
| 2 | `task_tasktype_id = 22` para todas as novas tasks |
| 3 | Busca de task existente considera tipos 21 e 22; prioridade para 22 |
| 4 | Após criação, a task é **confirmada no banco** — falha na confirmação gera linha de erro |
| 5 | `Opted Out` tem prioridade sobre qualquer status de elegibilidade |
| 6 | `Opted Out` cancela tasks com status 6 e 10 — não apenas abertas |
| 7 | `Opted Out` sempre grava `task_eligible = "N"` |
| 8 | `Not Eligible` cria task como Declined mesmo que não exista |
| 9 | Task fechada nunca é alterada (exceto pelo `Opted Out` em status 6 e 10) |
| 10 | Update só ocorre se houver diferença real de valor |
| 11 | Valores monetários inválidos não derrubam a linha — são gravados como NULL |
| 12 | Arquivo de entrada é **modificado** durante a importação — guarde sempre uma cópia antes de rodar |
| 13 | Arquivo de falhas só é criado se houver ao menos uma linha com erro |

---

## Resumo Executivo

O importador 6702 é um processo determinístico e conservador.

Principais comportamentos:

- `Opted Out` tem prioridade máxima e cancela qualquer task não finalizada, incluindo Expired e Completed
- `Opted Out` sempre marca `task_eligible = "N"`
- `Not Eligible` cria task como Declined — não ignora a linha
- Task fechada nunca é reaberta (exceto pelo `Opted In + Cancelled + Eligible`)
- Toda criação é confirmada no banco — falha na confirmação gera registro de erro
- Nunca executa updates redundantes
- Remove linhas processadas do arquivo de entrada
- Gera arquivo estruturado de falhas com contexto completo por linha

Este documento está alinhado com a implementação atual do código e deve ser utilizado como referência oficial para suporte e troubleshooting.
