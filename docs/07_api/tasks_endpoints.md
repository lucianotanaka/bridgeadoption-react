# API — Tasks Endpoints

> **Base URL:** `/api/tasks`
> **Autenticação:** Bearer Token JWT (header `Authorization: Bearer <token>`)
> **Tag FastAPI:** `tasks`
> **Router:** `backend/app/tasks/router.py`
> **Services:** `backend/app/tasks/service.py` · `filter_service.py` · `lci_viability_service.py` · `report_service.py`
> **Última atualização:** 2026-08-24
> **Módulo frontend:** `frontend/src/pages/tasks/TaskPage.tsx` e subcomponentes

---

## Autenticação

Todos os endpoints requerem token JWT válido obtido via `POST /api/auth/login`.

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Grupos de Endpoints

| Grupo | Endpoints |
|-------|-----------|
| [Overview & KPI](#overview--kpi) | `GET /overview`, `GET /kpi`, `GET /action-queue` |
| [Filtro de Tasks](#filtro-de-tasks) | `GET /filter-options`, `POST /filter` |
| [Detalhe da Task](#detalhe-da-task) | `GET/PUT /detail/{task_id}` |
| [Atividades](#atividades) | `GET/POST /detail/{task_id}/activities`, `GET/PUT /activities/{activity_id}` |
| [Histórico](#histórico) | `GET/POST /detail/{task_id}/history` |
| [RACI](#raci) | `GET/POST /detail/{task_id}/raci`, `PATCH/DELETE /detail/{task_id}/raci/{raci_id}` |
| [Pessoas & Empresas](#pessoas--empresas) | `GET/POST /person-list`, `GET /company-list` |
| [Follow-Up](#follow-up) | `GET /follow-up` |
| [Nova Task](#nova-task) | `POST /new` |
| [Listas auxiliares](#listas-auxiliares) | CSMs, status, tipos, justificativas, projetos |
| [LCI Viability](#lci-viability) | `GET/POST /lci-viability/*` |
| [Reports](#reports) | `GET/POST /reports/*` |

---

## Overview & KPI

### GET `/api/tasks/overview`

Retorna os dados agregados para o painel **Overview** do módulo Tasks.

**Usado por:** `TaskOverview.tsx` (MonitoringPanel, FinancePanel, ServicePanel)

**Query Params:**

| Param | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| *(nenhum)* | — | — | Filtragem por owner é feita no backend conforme `user_id` do token JWT |

**Response:** `TaskOverviewResponse`

```json
{
  "active_tasks": 45,
  "critical_n1": 3,
  "critical_n2": 7,
  "follow_ups_today": 5,
  "overdue_planned": 2,
  "overdue_activities": 8,
  "status_distribution": [
    { "status": "IN PROGRESS", "count": 22 },
    { "status": "OPEN", "count": 15 }
  ],
  "priority_distribution": [
    { "priority": "HIGH", "count": 12 }
  ],
  "finance": {
    "potential_revenue": 1200000.00,
    "expense_risk": 45000.00,
    "top5_expense_risk": []
  },
  "service": {
    "impacted_tasks": 5,
    "top5_service_risk": []
  }
}
```

---

### GET `/api/tasks/kpi`

Retorna os KPIs consolidados da tela Overview.

**Response:** `TaskKPISummary`

```json
{
  "active": 45,
  "critical": 10,
  "follow_ups": 5,
  "potential_value": 1200000.00,
  "risk_value": 45000.00,
  "completion_avg": 0.62
}
```

---

### GET `/api/tasks/action-queue`

Retorna a fila de tasks críticas para o card **Action Queue**.

**Query Params:**

| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `limit` | int | `10` | Número máximo de tasks retornadas |

**Response:** `List[ActionQueueItem]`

```json
[
  {
    "task_id": 1234,
    "task_customer_name": "Empresa XYZ",
    "task_type_name": "Deployment",
    "task_status": "IN PROGRESS",
    "task_owner_name": "João Silva",
    "criticality_score": 95,
    "criticality_reason": "Overdue + sem follow-up há 15 dias"
  }
]
```

---

## Filtro de Tasks

### GET `/api/tasks/filter-options`

Retorna as **opções dinâmicas** para os 7 filtros da aba "Filter" (view `vwFilterTask`).

**Usado por:** `TaskFilterTab.tsx`

**Sem parâmetros.**

**Response:**

```json
{
  "owners": ["Alice Santos", "João Silva", "UNASSIGNED"],
  "task_types": ["Deployment", "Assessment", "Migration"],
  "clients": ["Empresa ABC", "Banco XYZ"],
  "ws_list": ["WS001", "WS002"],
  "tracks": ["Security", "Collaboration"],
  "deal_ids": ["EA-2024-001", "CCW-4567"],
  "statuses": ["OPEN", "IN PROGRESS", "ON HOLD", "CANCELLED", "COMPLETED"]
}
```

> **Cache React Query:** `staleTime = 5 min` — query key `["task-filter-options"]`

---

### POST `/api/tasks/filter`

Aplica filtros em cascata e retorna as tasks completas (view `vwTask`).

**Usado por:** `TaskFilterTab.tsx` — botão "Apply Filters"

**Request Body:**

```json
{
  "owner_names": ["João Silva"],
  "task_type_names": ["Deployment"],
  "client_names": null,
  "ws_list": null,
  "tracks": ["Security"],
  "deal_ids": null,
  "status_names": ["IN PROGRESS", "OPEN"],
  "task_ids": null
}
```

> Todos os campos são opcionais (null = sem filtro para esse campo).

**Response:** `List[TaskRow]`

```json
[
  {
    "task_id": 1234,
    "task_customer_name": "Empresa XYZ",
    "task_owner_name": "João Silva",
    "task_type_name": "Deployment",
    "task_status": "IN PROGRESS",
    "task_priority": "HIGH",
    "task_ws": "WS001",
    "task_deal_id": "EA-2024-001",
    "task_track": "Security",
    "task_subtrack": "Firewall",
    "task_start": "2024-01-15",
    "task_end": "2024-06-30",
    "task_value": 150000.00,
    "task_currency": "USD",
    "task_completed": 0.45
  }
]
```

**Lógica de backend:**
1. Carrega `vwFilterTask` (view leve)
2. Aplica filtros em pandas (cascata)
3. Coleta `task_id`s resultantes
4. Busca dados completos de `vwTask` com `get_task(task_id=selected_ids)`
5. Reclassifica status via `reclassify_status()`

---

## Detalhe da Task

### GET `/api/tasks/detail/{task_id}`

Retorna os dados completos de uma task (view `vwTask`).

**Usado por:** `TaskDetailPanel.tsx`

**Path Params:**

| Param | Tipo | Obrigatório |
|-------|------|-------------|
| `task_id` | int | Sim |

**Response:** `TaskDetailRow` (todos os campos de `vwTask`)

```json
{
  "task_id": 1234,
  "task_customer_name": "Empresa XYZ",
  "task_customer_id": 5,
  "task_owner_id": 12,
  "task_owner_name": "João Silva",
  "task_temp_owner_id": null,
  "task_type_name": "Deployment",
  "task_tasktype_id": 3,
  "task_status": "IN PROGRESS",
  "task_status_id": 2,
  "task_priority": "HIGH",
  "task_reference": "REF-2024-001",
  "task_ws": "WS001",
  "task_deal_id": "EA-2024-001",
  "task_track": "Security",
  "task_subtrack": "Firewall",
  "task_start": "2024-01-15",
  "task_end": "2024-06-30",
  "task_start_performed": "2024-01-20",
  "task_end_performed": "2024-06-30",
  "task_value": 150000.00,
  "task_forecast": 140000.00,
  "task_currency": "USD",
  "task_completed": 0.45,
  "task_project_id": 7,
  "task_description": "Deploy Cisco Firepower...",
  "task_remark": null,
  "task_ea_flag": 1,
  "task_eligible": "Y",
  "task_end_fy": 2025
}
```

**Códigos de erro:**

| Código | Motivo |
|--------|--------|
| `404` | Task não encontrada |

---

### PUT `/api/tasks/detail/{task_id}`

Atualiza campos da task e opcionalmente insere um registro de histórico.

**Usado por:** `TaskDetailPanel.tsx` → `TaskEditForm`

**Path Params:**

| Param | Tipo | Obrigatório |
|-------|------|-------------|
| `task_id` | int | Sim |

**Request Body:**

```json
{
  "data": {
    "task_status": 2,
    "task_priority": "HIGH",
    "task_completed": 0.50,
    "task_owner_id": 15
  },
  "history": {
    "taskrecord_remark": "Status atualizado para IN PROGRESS",
    "taskrecord_type": "INFO",
    "taskrecord_next_followup": "2024-02-15",
    "taskrecord_updated_by": "João Silva"
  }
}
```

> `history` é opcional. Se fornecido, insere automaticamente em `tbTaskRecord`.

**Auto-cálculo de `task_completed`:** se `task_status` for alterado sem enviar `task_completed`:
- Sem atividades: status `2`/`3` → `0.25`; status `10` → `1.0`
- Com atividades: status `10` → `1.0`; caso contrário → `AVG(activity_completed)`

**Response:**

```json
{
  "success": true,
  "history_id": 890
}
```

---

## Atividades

### GET `/api/tasks/detail/{task_id}/activities`

Retorna todas as atividades de uma task (`tbTaskActivity`).

**Usado por:** `TaskDetailPanel.tsx` → `ActivityRow`

**Response:** `List[ActivityRow]`

```json
[
  {
    "activity_id": 456,
    "activity_task_id": 1234,
    "activity_seq": 1,
    "activity_name": "Fase 1 — Discovery",
    "activity_status": "IN PROGRESS",
    "activity_status_id": 2,
    "activity_completed": 0.80,
    "activity_effort": 40.0,
    "activity_effort_performed": 35.0,
    "activity_start": "2024-01-15",
    "activity_end": "2024-03-15",
    "activity_start_performed": "2024-01-20",
    "activity_end_performed": "2024-03-15",
    "activity_value": 45000.00,
    "activity_currency": "USD",
    "activity_approved": 1,
    "activity_approved_value": 45000.00,
    "activity_track": "Security",
    "activity_sub_track": "Firewall",
    "activity_objective": "Levantar o ambiente atual...",
    "activity_scope": "Somente redes segmentadas...",
    "activity_expected_results": "Relatório de discovery..."
  }
]
```

---

### POST `/api/tasks/detail/{task_id}/activities`

Cria uma nova atividade para a task.

**Usado por:** `TaskDetailPanel.tsx` → `AddActivityForm`

**Request Body:** campos da nova atividade (sem `activity_id`, `activity_task_id` e `activity_seq` — preenchidos automaticamente)

```json
{
  "data": {
    "activity_name": "Fase 2 — Implementação",
    "activity_effort": 80.0,
    "activity_start": "2024-03-16",
    "activity_end": "2024-06-30",
    "activity_currency": "USD"
  }
}
```

> `activity_seq` é calculado automaticamente como `MAX(activity_seq) + 1`.
> `activity_status` default: `1` (OPEN). `activity_completed` default: `0`.

**Response:**

```json
{ "success": true, "activity_id": 457 }
```

---

### GET `/api/tasks/activities/{activity_id}`

Retorna os dados de uma atividade específica.

**Path Params:**

| Param | Tipo | Obrigatório |
|-------|------|-------------|
| `activity_id` | int | Sim |

**Response:** `ActivityRow` (mesmo schema de GET activities)

**Códigos de erro:** `404` se não encontrada.

---

### PUT `/api/tasks/activities/{activity_id}`

Atualiza campos de uma atividade em `tbTaskActivity`.

**Usado por:** `TaskDetailPanel.tsx` → edição inline de atividade

**Request Body:**

```json
{
  "data": {
    "activity_status": 2,
    "activity_completed": 0.75,
    "activity_effort_performed": 60.0,
    "activity_end_performed": "2024-05-30"
  }
}
```

**Response:**

```json
{ "success": true }
```

---

## Histórico

### GET `/api/tasks/detail/{task_id}/history`

Retorna registros de histórico de uma task, opcionalmente filtrados por atividade.

**Query Params:**

| Param | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `activity_id` | int | Não | Se fornecido, retorna apenas os registros da atividade |

**Response:** `List[HistoryRecord]`

```json
[
  {
    "taskrecord_id": 890,
    "taskrecord_task_id": 1234,
    "taskrecord_activity_id": 456,
    "taskrecord_remark": "Discovery concluído",
    "taskrecord_type": "INFO",
    "taskrecord_status": "IN PROGRESS",
    "taskrecord_next_followup": "2024-02-15",
    "taskrecord_updated_by": "João Silva",
    "taskrecord_date": "2024-01-25T14:30:00"
  }
]
```

---

### POST `/api/tasks/detail/{task_id}/history`

Adiciona uma nota/evento ao histórico da task.

**Usado por:** `TaskDetailPanel.tsx` → `HistorySection` (adicionar nota)

**Request Body:**

```json
{
  "taskrecord_task_id": 1234,
  "taskrecord_activity_id": 0,
  "taskrecord_remark": "Reunião realizada com o cliente",
  "taskrecord_type": "INFO",
  "taskrecord_status": null,
  "taskrecord_next_followup": "2024-02-20",
  "taskrecord_updated_by": "João Silva"
}
```

**Tipos válidos para `taskrecord_type`:** `INFO` · `ISSUE` · `BLOCKER` · `LOG`

**Response:**

```json
{ "success": true, "record_id": 891 }
```

---

## RACI

### GET `/api/tasks/detail/{task_id}/raci`

Retorna os registros ativos da matriz RACI para a task (ou atividade específica).

**Query Params:**

| Param | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `activity_id` | int | Não | Se fornecido, filtra pelo RACI da atividade; senão, retorna o RACI da task |

**Response:** `List[RACIRow]`

```json
[
  {
    "taskraci_id": 10,
    "taskraci_task_id": 1234,
    "taskraci_activity_id": 0,
    "taskraci_person_id": 42,
    "taskraci_person_type": "user",
    "taskraci_responsibility": "R",
    "taskraci_enabled": 1,
    "person_name": "João Silva",
    "person_email": "joao.silva@nttdata.com",
    "person_job_title": "Customer Success Manager",
    "person_company_name": null
  }
]
```

**Responsabilidades válidas:** `R` (Responsible) · `A` (Accountable) · `C` (Consulted) · `I` (Informed)

---

### POST `/api/tasks/detail/{task_id}/raci`

Adiciona uma pessoa à matriz RACI da task.

**Request Body:**

```json
{
  "person_id": 42,
  "responsibility": "R",
  "activity_id": null,
  "person_type": "user",
  "subtask_id": 0
}
```

**Response:** `{ "success": true, "raci_id": 11 }`

---

### PATCH `/api/tasks/detail/{task_id}/raci/{raci_id}`

Atualiza a responsabilidade (R/A/C/I) de um registro RACI.

**Path Params:** `task_id` (int), `raci_id` (int)

**Request Body:** `{ "responsibility": "A" }`

**Response:** `{ "success": true }`

---

### DELETE `/api/tasks/detail/{task_id}/raci/{raci_id}`

Remove (soft-delete) um registro RACI: seta `taskraci_enabled = 0`.

**Path Params:** `task_id` (int), `raci_id` (int)

**Response:** `{ "success": true }`

---

## Pessoas & Empresas

### GET `/api/tasks/person-list`

Retorna pessoas para o seletor do formulário RACI — Add Member.

**Query Params:**

| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `company_id` | int | null | Filtra por empresa (FK `tbPerson.person_company_id`) |
| `internal_only` | bool | `false` | Se `true`, retorna apenas pessoas NTT (sem company) |

**Response:** `List[PersonItem]`

```json
[
  {
    "person_id": 42,
    "person_name": "João Silva",
    "person_type": "CSM",
    "person_company_id": null,
    "person_job_title": "Customer Success Manager"
  }
]
```

---

### POST `/api/tasks/person-list`

Cria uma nova pessoa em `tbPerson` (usada quando o responsável não está cadastrado).

**Request Body:**

```json
{
  "person_name": "Maria Souza",
  "person_company_id": 5,
  "person_job_title": "IT Manager",
  "person_email": "maria.souza@empresa.com",
  "person_type": "CUSTOMER"
}
```

**Response:** `{ "success": true, "person_id": 99 }`

---

### GET `/api/tasks/company-list`

Retorna empresas disponíveis para filtro de pessoa no RACI (via `CompanyRepository.list_available_companies()`).

**Sem parâmetros.**

**Response:** `List[CompanyItem]` — `[{ "company_id": 5, "company_name": "Empresa XYZ" }]`

---

## Follow-Up

### GET `/api/tasks/follow-up`

Retorna os próximos follow-ups agrupados por período.

**Usado por:** `NextFollowUpPanel.tsx`

**Sem parâmetros.** Filtragem por owner aplicada conforme `user_id` do token (`is_manager` pelo papel ADMIN/MANAGER).

**Response:**

```json
{
  "delayed": [
    {
      "task_id": 1234,
      "task_customer_name": "Empresa XYZ",
      "task_owner_name": "João Silva",
      "taskrecord_next_followup": "2024-01-10",
      "taskrecord_remark": "Aguardando resposta..."
    }
  ],
  "today": [],
  "current_week": [],
  "next_week": []
}
```

---

## Nova Task

### POST `/api/tasks/new`

Cria uma nova task em `tbTask` e insere o histórico inicial.

**Usado por:** `NewTaskForm.tsx`

**Request Body:**

```json
{
  "task_tasktype_id": 3,
  "task_customer_id": 5,
  "task_owner_id": 12,
  "task_start": "2024-03-01",
  "task_end": "2024-12-31",
  "task_priority": "HIGH",
  "task_currency": "USD",
  "task_reference": "REF-2024-010",
  "task_track": "Security",
  "task_subtrack": "Firewall",
  "task_ws": "WS001",
  "task_deal_id": "EA-2024-005",
  "task_value": 200000.00
}
```

**Campos obrigatórios:** `task_tasktype_id`, `task_customer_id`, `task_owner_id`, `task_start`, `task_end`, `task_priority`

**Comportamento de backend:**
- Define `task_created_by` = `user_id` do token
- Define `task_created_in` = data/hora atual
- Define `task_start_performed` = `task_start`; `task_end_performed` = `task_end`
- Cria atividades padrão conforme template do `task_tasktype_id` (via `TaskRepository.insert()`)
- Insere histórico inicial: `"Task created at YYYY-Mon-DD"`

**Response:**

```json
{ "success": true, "task_id": 1235 }
```

---

## Listas Auxiliares

### GET `/api/tasks/csm-list`

Retorna CSMs ativos para os selects de Owner / Temp Owner.

**Fonte:** `SquadRepository.get_csm_active()`

**Response:** `[{ "csm_id": 12, "csm_name": "João Silva", "csm_email": "joao@nttdata.com" }]`

---

### GET `/api/tasks/status-types`

Retorna os tipos de status disponíveis para edição (exclui status `5`).

**Fonte:** `StatusTypeRepository.load_status()`

**Response:**

```json
[
  { "statustype_id": 1, "statustype_name": "OPEN" },
  { "statustype_id": 2, "statustype_name": "IN PROGRESS" },
  { "statustype_id": 3, "statustype_name": "ON HOLD" },
  { "statustype_id": 4, "statustype_name": "CANCELLED" },
  { "statustype_id": 6, "statustype_name": "DONE" },
  { "statustype_id": 10, "statustype_name": "COMPLETED" }
]
```

---

### GET `/api/tasks/task-types`

Retorna os tipos de task para o formulário de criação.

**Fonte:** `TaskRepository.get_task_type_by_ids()`

**Response:** `[{ "tasktype_id": 3, "tasktype_name": "Deployment" }]`

---

### GET `/api/tasks/status-justifications`

Retorna justificativas válidas para um status específico (`tbStatusTypeJustification`).

**Query Params:**

| Param | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `status_id` | int | Não | ID do status (ex.: `3` = ON HOLD, `4` = CANCELLED) |

**Response:** `[{ "justification_id": 1, "justification_text": "Aguardando cliente" }]`

---

### GET `/api/tasks/projects`

Retorna projetos ativos de um cliente para vincular à task.

**Query Params:**

| Param | Tipo | Obrigatório |
|-------|------|-------------|
| `customer_id` | int | Sim |

**Response:** `[{ "project_id": 7, "project_name": "Projeto Cisco Security", "project_status": "In progress" }]`

---

### GET `/api/tasks/project-team`

Retorna membros da equipe dos projetos ativos de um cliente.

**Query Params:** `customer_id` (int, obrigatório)

**Response:** `[{ "person_id": 42, "person_name": "João Silva", "project_id": 7 }]`

---

## LCI Viability

> **Permissão necessária:** `task.task_lci_viability`
> Estes endpoints verificam a permissão via RBAC. ADMIN tem acesso automático.

### GET `/api/tasks/lci-viability/list`

Retorna a lista de registros elegíveis (view `vwCustomerCiscoLCITrackProjectPM`).

**Usado por:** `LCIViabilityPage.tsx`

**Sem parâmetros.**

**Response:** `List[LCIRecord]`

```json
[
  {
    "customer_id": 5,
    "customer_name": "Empresa XYZ",
    "track": "Security",
    "cr_party_id": "PART123",
    "project_manager": "Alice Santos",
    "lci_status": "Potential"
  }
]
```

---

### GET `/api/tasks/lci-viability/tasks`

Retorna as tasks agrupadas por `Track|PartyID` para um registro LCI específico.

**Query Params:**

| Param | Tipo | Obrigatório |
|-------|------|-------------|
| `customer_id` | int | Sim |
| `track` | str | Sim |

**Response:** `List[TaskRow]` das tasks do grupo

---

### GET `/api/tasks/lci-viability/justifications`

Retorna as justificativas válidas para cancelamento em lote.

**Sem parâmetros.**

**Response:** `List[str]` — ex.: `["Produto fora de suporte", "Cliente cancelou projeto"]`

---

### GET `/api/tasks/lci-viability/projects-in-progress`

Retorna projetos ativos de um cliente para vincular à task ao mover para **IN PROGRESS**.

**Query Params:** `customer_id` (int, obrigatório)

**Response:** `List[ProjectItem]`

---

### POST `/api/tasks/lci-viability/normalize`

Normaliza o mapa de status conforme regras de negócio LCI (ex.: uma task IN PROGRESS cancela as demais do grupo).

**Request Body:** `{ "<task_id>": "<status>" }` — dicionário `int → str`

**Response:** `{ "normalized": { "1234": "IN PROGRESS", "1235": "CANCELLED" } }`

---

### POST `/api/tasks/lci-viability/save-group`

Salva a alteração de status em lote para um grupo de tasks + registra histórico.

**Usado por:** `LCIViabilityPage.tsx` — botão "Save"

**Request Body:**

```json
{
  "group_tasks": [
    { "task_id": 1234, "task_status": "OPEN" },
    { "task_id": 1235, "task_status": "OPEN" }
  ],
  "new_statuses": { "1234": "IN PROGRESS", "1235": "CANCELLED" },
  "cancellation_justification": "Cliente cancelou projeto",
  "project_id": 7,
  "new_project_ov": null,
  "new_project_name": null,
  "customer_id": 5,
  "customer_name": "Empresa XYZ"
}
```

**Response:** `{ "success": true, "updated": 2, "errors": [] }`

---

## Reports

### GET `/api/tasks/reports/owners`

Retorna os owners disponíveis para o filtro da aba Reports.

**Fonte:** `vwFilterTaskOwner`

**Sem parâmetros.**

**Response:** `[{ "owner_id": 12, "owner_name": "João Silva" }]`

---

### POST `/api/tasks/reports/filter-options`

Retorna as opções de Task Type / Client / Status em cascata, baseadas nos owners selecionados.

**Request Body:**

```json
{
  "owner_ids": [12, 15],
  "task_type_names": null,
  "client_names": null,
  "status_names": null
}
```

**Response:**

```json
{
  "task_types": ["Deployment", "Assessment"],
  "clients": ["Empresa XYZ"],
  "statuses": ["IN PROGRESS", "COMPLETED"]
}
```

---

### POST `/api/tasks/reports/tasks`

Retorna as tasks completas com os filtros aplicados. Usado pelo relatório "Task List" e para alimentar o seletor do "Task Details".

**Request Body:**

```json
{
  "owner_ids": [12],
  "task_type_names": ["Deployment"],
  "client_names": null,
  "status_names": ["COMPLETED"]
}
```

**Response:** `List[TaskRow]` — todas as colunas relevantes da task

---

### GET `/api/tasks/reports/task-detail/{task_id}`

Retorna dados completos para o relatório "Task Details": task + atividades + cronograma + resumo de status das atividades.

**Usado por:** `TaskReportsTab.tsx` — sub-relatório "Task Details"

**Path Params:**

| Param | Tipo | Obrigatório |
|-------|------|-------------|
| `task_id` | int | Sim |

**Response:**

```json
{
  "task": { "task_id": 1234, "task_customer_name": "Empresa XYZ" },
  "activities": [
    {
      "activity_id": 456,
      "activity_name": "Fase 1",
      "activity_status": "COMPLETED",
      "activity_completed": 1.0,
      "activity_scope": "..."
    }
  ],
  "schedule": [
    { "name": "Task", "start": "2024-01-15", "end": "2024-06-30", "type": "task" },
    { "name": "Fase 1", "start": "2024-01-15", "end": "2024-03-15", "type": "activity" }
  ],
  "status_summary": {
    "COMPLETED": 2,
    "IN PROGRESS": 1,
    "OPEN": 0
  }
}
```

**Códigos de erro:** `404` se task não encontrada ou sem atividades válidas.

> **Nota:** o backend usa `_safe_pct()` / `_safe_int()` para evitar `ValueError` por `NaN`/`None` em `task_completed` ou `activity_seq`.

---

## Admin Tasks (Admin Only)

> **Permissão necessária:** Role `ADMIN`
> **Prefixo:** `/api/admin/tasks`
> **Router:** `backend/app/modules/sections_router.py` → `admin_router`
> **Service:** `backend/app/modules/admin_task_service.py`

Estes endpoints são exclusivos para o módulo **Admin → Tasks** (`/admin/tasks`) e permitem ao administrador pesquisar, editar em massa e remover tarefas diretamente no banco.

### GET `/api/admin/tasks/filter-options`

Retorna opções distintas de `ws`, `deal_id`, `track` e `subtrack` da view `vwFilterTask` (com fallback para `tbTask` no caso de `subtrack`).

**Response:**

```json
{
  "ws_list": ["WS001", "WS002"],
  "deal_ids": ["EA-2024-001"],
  "tracks": ["Security", "Collaboration"],
  "subtracks": ["Firewall", "ISE"]
}
```

---

### POST `/api/admin/tasks/filter`

Filtra tasks por `task_id`, `ws`, `deal`, `track` e `subtrack` — retorna dados completos de `vwTask`.

**Request Body:**

```json
{
  "task_id": null,
  "ws_list": ["WS001"],
  "deal_ids": null,
  "tracks": ["Security"],
  "subtracks": null
}
```

**Response:** `List[TaskRow]` (campos completos de `vwTask`)

---

### PUT `/api/admin/tasks/{task_id}`

Atualiza campos de uma task pelo administrador (inclui auto-cálculo de `task_completed`).

**Request Body:** `{ "data": { "task_ws": "WS002", "task_priority": "LOW" } }`

**Response:** `{ "success": true }`

---

### POST `/api/admin/tasks/remove`

Zera todos os campos de `tbTask` + `tbTaskActivity` + `tbTaskRecord` para os `task_ids` informados (equivale à remoção lógica — dados ficam com valores default/zero).

**Request Body:** `{ "task_ids": [1234, 1235] }`

**Response:** `{ "removed": 2, "errors": [] }`

> ⚠️ **Ação irreversível.** Confirmar sempre antes de executar.

---

### GET `/api/admin/tasks/{task_id}/activities`

Retorna atividades para um único `task_id`.

**Response:** `List[ActivityRow]`

---

### GET `/api/admin/tasks/{task_id}/records`

Retorna registros (`tbTaskRecord`) de uma task, opcionalmente filtrado por atividade.

**Query Params:** `activity_id` (int, opcional)

**Response:** `List[HistoryRecord]`

---

### POST `/api/admin/tasks/activities-many`

Retorna atividades para uma lista de `task_ids`.

**Request Body:** `{ "task_ids": [1234, 1235, 1236] }`

**Response:** `List[ActivityRow]`

---

### POST `/api/admin/tasks/records-many`

Retorna registros para uma lista de `task_ids`.

**Request Body:** `{ "task_ids": [1234, 1235] }`

**Response:** `List[HistoryRecord]`

---

### PUT `/api/admin/tasks/activities/{activity_id}`

Atualiza campos de uma atividade (acesso admin).

**Request Body:** `{ "data": { "activity_status": 0, "activity_task_id": 0 } }`

**Response:** `{ "success": true }`

---

### POST `/api/admin/tasks/activities/{activity_id}/remove`

Zera todos os campos da atividade + registros relacionados em `tbTaskRecord`.

**Response:** `{ "success": true, "errors": [] }`

---

## Códigos de Resposta HTTP

| Código | Significado |
|--------|-------------|
| `200` | Sucesso — retorna dados ou `{ "success": true }` |
| `401` | Token JWT inválido ou expirado |
| `403` | Permissão insuficiente (ex.: acesso a LCI Viability sem `task.task_lci_viability`) |
| `404` | Recurso não encontrado (task, atividade) |
| `422` | Parâmetro obrigatório ausente ou tipo inválido |
| `500` | Erro interno (verificar logs do backend) |

---

## Exemplos de Uso (TypeScript)

```typescript
import apiClient from "@/api/client";

// Carregar KPIs do Overview
const kpi = await apiClient.get('/tasks/kpi');

// Buscar opções de filtro
const opts = await apiClient.get('/tasks/filter-options');

// Filtrar tasks
const tasks = await apiClient.post('/tasks/filter', {
  owner_names: ['João Silva'],
  status_names: ['IN PROGRESS'],
});

// Detalhe de uma task
const detail = await apiClient.get('/tasks/detail/1234');

// Atualizar status de uma task
await apiClient.put('/tasks/detail/1234', {
  data: { task_status: 10 },
  history: {
    taskrecord_remark: 'Task concluída',
    taskrecord_type: 'INFO',
    taskrecord_updated_by: 'João Silva',
  },
});

// Criar nova atividade
await apiClient.post('/tasks/detail/1234/activities', {
  data: { activity_name: 'Fase 3', activity_effort: 40 },
});

// Adicionar registro de histórico
await apiClient.post('/tasks/detail/1234/history', {
  taskrecord_task_id: 1234,
  taskrecord_activity_id: 0,
  taskrecord_remark: 'Follow-up realizado',
  taskrecord_type: 'INFO',
  taskrecord_next_followup: '2024-03-01',
  taskrecord_updated_by: 'João Silva',
});
```

---

## Notas de Implementação

- **View `vwFilterTask`:** view leve usada para filtros (sem todos os campos de `vwTask`). Não contém `task_subtrack` — este campo é obtido de `tbTask` diretamente quando necessário.
- **View `vwTask`:** view completa com todos os campos da task + joins com `tbTaskType`, `tbCompany`, `tbUser` (owner/temp owner), `tbStatusType`.
- **`reclassify_status()`:** função em `src/domain/status_reclassification.py` que normaliza os nomes de status para exibição no frontend (ex.: `statustype_name` → `"IN PROGRESS"`).
- **Auto-cálculo de `task_completed`:** implementado em `filter_service.update_task()`. Executa query direta em `tbTaskActivity` para calcular a média de `activity_completed` antes do `UPDATE tbTask`.
- **Criação automática de atividades:** `TaskRepository.insert()` cria atividades padrão a partir de `tbTaskActivityTemplate` na mesma transação do INSERT da task.
- **Cache React Query:** os endpoints de overview/KPI têm `staleTime = 5 min`; detalhe e histórico têm `staleTime = 0` (sempre fresh ao abrir o painel).
- **Acesso admin:** os endpoints `/api/admin/tasks/*` verificam `_is_admin(current_user)` e retornam `403` se o papel ADMIN não estiver presente no token.

---

## Referências

- **Documentação do módulo:** `docs/02_application/module_tasks.md`
- **Documentação Admin Tasks:** `docs/02_application/tasks/admin_tasks.md`
- **Database:** `docs/05_deployment/task/task_database.md`
- **Flows:** `docs/05_deployment/task/task_flows.md`
- **Router Tasks:** `backend/app/tasks/router.py`
- **Service Tasks:** `backend/app/tasks/service.py` · `filter_service.py`
- **Service LCI Viability:** `backend/app/tasks/lci_viability_service.py`
- **Service Reports:** `backend/app/tasks/report_service.py`
- **Admin Service:** `backend/app/modules/admin_task_service.py`
