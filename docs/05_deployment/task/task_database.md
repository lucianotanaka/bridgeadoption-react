# Tasks — Banco de Dados

> **Última atualização:** 2026-08-24
> **Versão:** Bridge Adoption React
> **Audiência:** Desenvolvimento e sustentação

As tabelas e repositórios Python descritos aqui são reutilizados pelo backend React (`backend/app/tasks/*_service.py`) sem modificações em relação ao Streamlit legado.

---

## 1. Modelo Entidade-Relacionamento

```
tbTaskType (N)──────< tbTask (1) >──────── tbStatusType
                          │
                          ├── tbTaskActivity (N)
                          │         │
                          │         └── tbStatusType
                          │
                          ├── tbTaskRecord (N)
                          │         (notas, follow-ups, histórico)
                          │
                          ├── tbTaskRACI (N)
                          │         └── tbPerson
                          │
                          └── tbProject (FK)
```

---

## 2. Tabelas Principais

### `tbTask`

Entidade principal. Cada linha representa uma tarefa de adoção.

**Campos críticos:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `task_id` | INT PK | Identificador único |
| `task_tasktype_id` | INT FK | Tipo da task → `tbTaskType` |
| `task_customer_id` | INT FK | Empresa cliente → `tbCompany` |
| `task_owner_id` | INT FK | CSM responsável → `tbUser` |
| `task_temp_owner_id` | INT FK | CSM temporário (nullable) |
| `task_status` | INT FK | Status atual → `tbStatusType.statustype_id` |
| `task_priority` | VARCHAR | `LOW` / `MEDIUM` / `HIGH` |
| `task_start` / `task_end` | DATE | Datas planejadas |
| `task_start_performed` / `task_end_performed` | DATE | Datas realizadas |
| `task_value` | DECIMAL | Valor planejado (USD/BRL) |
| `task_forecast` | DECIMAL | Forecast de receita |
| `task_backlog` | DECIMAL | Valor em backlog |
| `task_currency` | VARCHAR | Moeda (`USD`, `BRL`) |
| `task_ws` | VARCHAR | Workstream |
| `task_deal_id` | VARCHAR | Deal ID (EA/CCW) |
| `task_track` / `task_subtrack` | VARCHAR | Classificação de track |
| `task_completed` | DECIMAL | Percentual de conclusão (0.0–1.0) |
| `task_ea_flag` | TINYINT | Flag EA Cisco |
| `task_eligible` | VARCHAR | Elegível LCI (`Y`/`N`) |
| `task_end_fy` | INT | Fiscal Year de término |
| `task_project_id` | INT FK | Projeto vinculado → `tbProject` |
| `task_created_in` | DATETIME | Data/hora de criação |
| `task_created_by` | INT FK | user_id do criador |

**Repositório Python:** `src/infrastructure/database/repositories/task_repository.py`

**Métodos principais:**
- `insert(data)` — cria task + atividades padrão na mesma transação
- `update(data, where)` — atualiza campos com validação de colunas
- `get_task(task_id)` — retorna de `vwTask`
- `load_for_filtering()` — retorna de `vwFilterTask` (view leve)
- `get_task_by_query(columns, where_raw)` — query dinâmica em `vwTask`

> **Importante:** `TaskRepository.insert()` reutiliza slots "vagos" (task_customer_id=0, task_owner_id=0) antes de criar novos registros — evita fragmentação do banco.

---

### `tbTaskActivity`

Atividades vinculadas à task. Uma task pode ter N atividades.

**Relacionamento:** `tbTaskActivity.activity_task_id = tbTask.task_id`

**Campos críticos:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `activity_id` | INT PK | Identificador único |
| `activity_task_id` | INT FK | Task pai |
| `activity_seq` | INT | Sequência dentro da task |
| `activity_name` | VARCHAR | Nome da atividade |
| `activity_status` | INT FK | Status → `tbStatusType.statustype_id` |
| `activity_completed` | DECIMAL | % concluída (0.0–1.0) |
| `activity_effort` | DECIMAL | Esforço planejado (horas) |
| `activity_effort_performed` | DECIMAL | Esforço realizado |
| `activity_start` / `activity_end` | DATE | Datas planejadas |
| `activity_start_performed` / `activity_end_performed` | DATE | Datas realizadas |
| `activity_value` / `activity_currency` | DECIMAL/VARCHAR | Valor |
| `activity_approved` | TINYINT | Aprovação de valor |
| `activity_approved_value` | DECIMAL | Valor aprovado |
| `activity_approval_date` | DATE | Data de aprovação |
| `activity_approval_fy` | INT | FY de aprovação |
| `activity_track` / `activity_sub_track` | VARCHAR | Track |
| `activity_ws` / `activity_deal_id` | VARCHAR | Workstream / Deal |
| `activity_objective` | TEXT | Objetivo |
| `activity_scope` | TEXT | Escopo |
| `activity_expected_results` | TEXT | Resultados esperados |

**Repositório Python:** `src/infrastructure/database/repositories/task_activity_repository.py`

**Métodos principais:**
- `insert(data)` — cria atividade (reutiliza slots vagos: activity_task_id=0)
- `update(data, where)` — atualiza campos
- `get_activity(task_id, activity_id)` — retorna atividades

---

### `tbTaskRecord`

Histórico de notas, eventos e follow-ups. Cada nota é imutável (somente INSERT).

**Relacionamento:**
- `taskrecord_task_id → tbTask.task_id`
- `taskrecord_activity_id → tbTaskActivity.activity_id` (nullable, 0 = nota da task)

**Campos críticos:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `taskrecord_id` | INT PK | Identificador único |
| `taskrecord_task_id` | INT FK | Task relacionada |
| `taskrecord_activity_id` | INT FK | Atividade relacionada (0 = task) |
| `taskrecord_remark` | TEXT | Texto da nota |
| `taskrecord_type` | VARCHAR | `INFO` / `ISSUE` / `BLOCKER` / `LOG` |
| `taskrecord_status` | VARCHAR | Status no momento da nota |
| `taskrecord_next_followup` | DATE | Data do próximo follow-up |
| `taskrecord_updated_by` | VARCHAR | Nome do responsável |
| `taskrecord_date` | DATETIME | Data/hora do registro |

**Repositório Python:** `src/infrastructure/database/repositories/task_history_repository.py`

**Métodos principais:**
- `insert(record)` — insere nota
- `get_history(task_id, activity_id)` — retorna histórico
- `get_next_follow_up_delayed/today/current_week/next_week()` — follow-ups por período

---

### `tbTaskRACI`

Matriz RACI: responsabilidades por task / atividade.

**Relacionamento:**
- `taskraci_task_id → tbTask.task_id`
- `taskraci_activity_id → tbTaskActivity.activity_id` (0 = RACI da task)
- `taskraci_person_id → tbPerson.person_id`

**Campos críticos:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `taskraci_id` | INT PK | |
| `taskraci_task_id` | INT FK | Task |
| `taskraci_activity_id` | INT FK | Atividade (0 = task) |
| `taskraci_person_id` | INT FK | Pessoa → `tbPerson` |
| `taskraci_person_type` | VARCHAR | Tipo: `user`, `customer`, etc. |
| `taskraci_responsibility` | VARCHAR | `R` / `A` / `C` / `I` |
| `taskraci_enabled` | TINYINT | `1` = ativo, `0` = removido (soft delete) |
| `taskraci_disabled_by` | VARCHAR | Quem removeu |
| `taskraci_disabled_date` | DATE | Quando removeu |

**Repositório Python:** `src/infrastructure/database/repositories/task_raci_repository.py`

---

### `tbTaskType` / `tbTaskActivityTemplate`

| Tabela | Descrição |
|--------|-----------|
| `tbTaskType` | Tipos de task (ex.: Deployment, Assessment) |
| `tbTaskActivityTemplate` | Atividades padrão por tipo — criadas automaticamente ao inserir task |

**Relacionamento:** `tbTaskActivityTemplate.activitytemplate_tasktype_id = tbTaskType.tasktype_id`

---

### `tbStatusType` / `tbStatusTypeJustification`

| Tabela | Descrição |
|--------|-----------|
| `tbStatusType` | Catálogo de status (OPEN, IN PROGRESS, ON HOLD, CANCELLED, DONE, COMPLETED) |
| `tbStatusTypeJustification` | Justificativas obrigatórias para status específicos (3=ON HOLD, 4=CANCELLED) |

---

## 3. Views

### `vwTask`

View completa da task com joins:
- `tbTask` + `tbTaskType` + `tbCompany` + `tbUser` (owner/temp_owner) + `tbStatusType`
- Inclui campos calculados e normalizados
- Usada por: `GET /api/tasks/detail/{task_id}`, `POST /api/tasks/filter`

**Colunas adicionais vs `tbTask`:**
- `task_owner_name` (de `tbUser`)
- `task_customer_name` (de `tbCompany`)
- `task_type_name` (de `tbTaskType`)
- `task_status` (nome do status, de `tbStatusType`)

---

### `vwFilterTask`

View **leve** para filtros em cascata:
- Não contém todos os campos de `vwTask` (sem textos longos)
- Inclui: `task_id`, `task_owner_id/name`, `task_type_name`, `task_customer_name`, `task_ws`, `task_deal_id`, `task_track`, `task_status_id`
- **Nota:** pode não conter `task_subtrack` — nesse caso, o admin service busca de `tbTask` diretamente
- Usada por: `GET /api/tasks/filter-options`, `POST /api/tasks/filter` (step 1)

---

### `vwFilterTaskOwner`

View para o filtro de Owners na aba Reports.
- Retorna owners com tasks ativas
- Usada por: `GET /api/tasks/reports/owners`

---

### `vwCustomerCiscoLCITrackProjectPM`

View de análise de elegibilidade LCI:
- Agrupa tasks por Customer + Track + PartyID
- Inclui informações do project manager e status LCI
- Usada por: `GET /api/tasks/lci-viability/list`

---

## 4. Repositórios Python

| Repositório | Localização | Tabela/View principal |
|-------------|-------------|----------------------|
| `TaskRepository` | `src/infrastructure/database/repositories/task_repository.py` | `tbTask`, `vwTask`, `vwFilterTask` |
| `TaskActivityRepository` | `.../task_activity_repository.py` | `tbTaskActivity` |
| `TaskHistoryRepository` | `.../task_history_repository.py` | `tbTaskRecord` |
| `TaskRACIRepository` | `.../task_raci_repository.py` | `tbTaskRACI` |
| `StatusTypeRepository` | `.../status_type_repository.py` | `tbStatusType`, `tbStatusTypeJustification` |
| `SquadRepository` | `.../squad_repository.py` | Retorna CSMs ativos |

---

## 5. Pontos Críticos para Sustentação

### Atividades não atualizam
```sql
-- Verificar se activity existe
SELECT activity_id, activity_task_id, activity_status
FROM tbTaskActivity WHERE activity_id = <id>;

-- Forçar update direto se necessário
UPDATE tbTaskActivity SET activity_status = 2 WHERE activity_id = <id>;
```

### Histórico não grava
- Verificar `TaskHistoryRepository.insert()` nos logs do gunicorn
- Confirmar que `taskrecord_task_id` é um task_id válido

### Status não traduz corretamente
```sql
-- Verificar catálogo
SELECT * FROM tbStatusType ORDER BY statustype_id;

-- Verificar função de reclassificação
-- src/domain/status_reclassification.py
```

### Task "suja" (dados inválidos importados)
```sql
-- Identificar task pelo WS ou deal
SELECT task_id, task_ws, task_deal_id, task_track, task_customer_id
FROM tbTask
WHERE task_ws = 'WS001' AND task_deal_id = 'EA-2024-XXX';

-- Corrigir via Admin Tasks page (UI) ou diretamente:
UPDATE tbTask SET task_ws = 'WS002' WHERE task_id = <id>;
```

### Integridade FK
```sql
-- Verificar tasks órfãs (sem atividades)
SELECT t.task_id FROM tbTask t
LEFT JOIN tbTaskActivity a ON a.activity_task_id = t.task_id
WHERE a.activity_id IS NULL AND t.task_customer_id > 0;

-- Verificar registros com task inexistente
SELECT r.taskrecord_id, r.taskrecord_task_id
FROM tbTaskRecord r
LEFT JOIN tbTask t ON t.task_id = r.taskrecord_task_id
WHERE t.task_id IS NULL AND r.taskrecord_task_id > 0;
```

---

## 6. Referências

- **Módulo:** `docs/02_application/module_tasks.md`
- **API:** `docs/07_api/tasks_endpoints.md`
- **Flows:** `docs/05_deployment/task/task_flows.md`
- **Troubleshooting:** `docs/05_deployment/task/task_troubleshooting.md`
