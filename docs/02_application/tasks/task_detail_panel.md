# TaskDetailPanel — Documentação Detalhada

> **Última atualização:** 2026-08-27  
> **Arquivo:** `frontend/src/pages/tasks/TaskDetailPanel.tsx`  
> **Audiência:** Desenvolvimento e sustentação

---

## 1. Visão geral

O `TaskDetailPanel` é o componente central de visualização e edição de tarefas do Bridge Adoption. Exibido como um bloco expansível abaixo de qualquer aba do módulo Tasks, permite ao usuário gerenciar em detalhes a task selecionada sem sair da página.

### Subcomponentes internos

```
TaskDetailPanel
├── TaskEditForm       → Formulário de edição da task (Regras 1-5)
├── ActivityRow        → Linha de activity expansível com edição inline
├── AddActivityForm    → Formulário de criação de nova activity
├── RACIMatrix         → Gestão da matriz RACI
└── HistorySection     → Histórico de notas/follow-ups
```

---

## 2. Fontes de dados (React Query)

| Query Key | Endpoint | Tabela/View | Uso |
|-----------|----------|-------------|-----|
| `["task-activities", taskId]` | `GET /api/tasks/detail/{id}/activities` | `tbTaskActivity` | Lista de activities |
| `["csm-list"]` | `GET /api/tasks/csm-list` | `vwSquadCSMActive` | Dropdown de owner/temp owner |
| `["status-types"]` | `GET /api/tasks/status-types` | `tbStatusType` | Opções de status |
| `["status-justifications-all"]` | `GET /api/tasks/status-justifications` | `tbStatusTypeJustification` | Justificativas ON HOLD/CANCEL |
| `["task-projects", customerId]` | `GET /api/tasks/projects?customer_id=X` | `tbProject` via `vwProject` | Dropdown de projeto vinculado |
| `["task-project-team", customerId]` | `GET /api/tasks/project-team?customer_id=X` | `tbProjectTeam` via `vwProjectTeam` | Equipe do projeto |
| `["task-raci", taskId, activityId]` | `GET /api/tasks/detail/{id}/raci` | `tbTaskRACI` JOIN `tbPerson` JOIN `tbCompany` | Matriz RACI |
| `["company-list"]` | `GET /api/tasks/company-list` | `tbCompany` | Filtro de empresa no RACI |
| `["person-list", companyId]` | `GET /api/tasks/person-list` | `tbPerson` | Pessoas para RACI |
| `["task-history", taskId]` | `GET /api/tasks/detail/{id}/history` | `tbTaskRecord` | Histórico da task |
| `["act-hist", activityId]` | `GET /api/tasks/detail/{id}/history?activity_id=X` | `tbTaskRecord` | Histórico da activity |
| `props.tasks` | (recebido via prop) | `vwTask` ou `vwTaskDashboard` | Lista de tasks paginada |

---

## 3. Regras de negócio implementadas

### Regra 1 — Controle de edição por propriedade da task

**Implementação:** `TaskEditForm`

Somente pode editar qualquer campo da task:
- O **dono** (`task_owner_id === currentUser.id`)
- O **dono temporário** (`task_temp_owner_id === currentUser.id`)
- Usuários com role `ADMIN`
- Usuários com permissão `task.edit`

```typescript
const currentUser = useAuthStore.getState().user;
const isAdmin = useAuthStore.getState().hasRole("ADMIN");
const hasTaskEdit = useAuthStore.getState().hasPermission("task.edit");
const canEdit = isOwner || isTempOwner || isAdmin || hasTaskEdit;
const isReadOnly = isClosed || !canEdit;
```

**Comportamento:**
- Todos os campos ficam com `disabled={isReadOnly}` quando o usuário não tem permissão.
- Um banner âmbar `⚠️ Somente o responsável ou administrador pode editar esta tarefa.` é exibido acima do formulário.
- O botão Salvar fica `disabled={isReadOnly || saveMut.isPending}`.

---

### Regra 2 — Controle de encerramento por propriedade

**Implementação:** `TaskEditForm.statusOptions`

Somente pode alterar o status para valores de encerramento:
- O **dono** (não o dono temporário)
- `ADMIN`
- Permissão `task.edit`

```typescript
const canClose = isOwner || isAdmin || hasTaskEdit;
const CLOSING_STATUS_IDS = new Set([4, 6, 10]); // CANCELLED, CLOSED, COMPLETED/CLOSED

const statusOptions = statusTypes
  .filter((st) => st.statustype_id !== 5)
  .filter((st) => CLOSING_STATUS_IDS.has(st.statustype_id) ? (canClose && !hasOpenActivities) : true)
  .map((st) => st.statustype_name);
```

**Comportamento:** Quem não pode encerrar vê o select de status sem as opções `CANCELLED`, `CLOSED`, `COMPLETED/CLOSED`.

---

### Regra 3 — Opções de encerramento bloqueadas com activities abertas

**Implementação:** `TaskEditForm.hasOpenActivities`

Enquanto houver ao menos uma activity com `activity_status` **fora de** `{4, 5, 6, 10}`:

```typescript
const hasOpenActivities = activities.some((a) => {
  const sid = Number(a.activity_status ?? 0);
  return !CLOSED_STATUS.has(sid);
});
```

As opções `CANCELLED (4)`, `CLOSED (6)`, `COMPLETED/CLOSED (10)` são **removidas** do select de status da task, independente das permissões do usuário.

**Lógica combinada:** A opção de encerramento aparece somente quando `canClose && !hasOpenActivities`.

---

### Regra 4 — `task_start_performed` calculado das activities

**Implementação:** `TaskEditForm.saveMut.mutationFn`

Quando existem activities, `task_start_performed` é **sempre calculado automaticamente** como a menor data entre:
- `activity_start_performed` de cada activity (quando não nulo)
- `activity_start` de cada activity (fallback quando `activity_start_performed` é nulo)

```typescript
if (activities.length > 0) {
  const startCandidates = activities
    .map((a) => a.activity_start_performed || a.activity_start)
    .filter(Boolean)
    .map((d) => String(d).slice(0, 10))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  if (startCandidates.length > 0)
    data.task_start_performed = startCandidates[0]; // menor data
}
```

**Comportamento visual:** Campo exibido como somente-leitura com legenda `"Auto: menor data das atividades"`.

---

### Regra 5 — `task_end_performed` calculado das activities

**Implementação:** `TaskEditForm.saveMut.mutationFn`

Quando existem activities, `task_end_performed` é **sempre calculado automaticamente** como a maior data entre:
- `activity_end_performed` de cada activity (quando não nulo)
- `activity_end` de cada activity (fallback quando `activity_end_performed` é nulo)

```typescript
const endCandidates = activities
  .map((a) => a.activity_end_performed || a.activity_end)
  .filter(Boolean)
  .map((d) => String(d).slice(0, 10))
  .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
  .sort();
if (endCandidates.length > 0)
  data.task_end_performed = endCandidates[endCandidates.length - 1]; // maior data
```

**Comportamento visual:** Campo exibido como somente-leitura com legenda `"Auto: maior data das atividades"`.

> Quando a task **não possui activities**, os campos de data retornam ao modo editável manual.

---

## 4. Correções aplicadas em 2026-08-27

### Correção 1 — Activity com status CLOSED mas nome mostrando "OPEN"

**Problema:** Campos de uma activity ficavam bloqueados mesmo com status exibido como "OPEN".

**Causa raiz:** A tabela `tbTaskActivity` **não possui coluna `activity_status_name`**. O campo `activity_status` (INT FK) e o nome exibido eram calculados de fontes diferentes:
- `activity_status` (INT): vinha corretamente da tabela via `SELECT * FROM tbTaskActivity`
- `activity_status_name` (string): era retornado de outro contexto ou ficava `undefined`

A verificação `isClosed = CLOSED_STATUS.has(act.activity_status)` estava correta, mas quando `activity_status = 10` (COMPLETED) e o nome exibido mostrava "OPEN" (valor desatualizado), o usuário ficava confuso.

**Confirmação via banco:**
```sql
SELECT activity_id, activity_status FROM tbTaskActivity WHERE activity_task_id = 1885;
-- activity_id=3683 → activity_status=10 (COMPLETED → isClosed=true, correto)
```

**Fixes aplicados:**

**Fix 1 — Frontend: `isClosed` robusto** (suporta ambas as colunas e tipos):
```typescript
const statusId = Number(
  (act.activity_status ?? (act as Record<string,unknown>).activity_status_id) ?? 0
);
const isClosed = CLOSED_STATUS.has(statusId);
```

**Fix 2 — Frontend: `resolvedStatusName` a partir de `statusTypes`** (quando a coluna não existe na API):
```typescript
const resolvedStatusName = act.activity_status_name
  ?? statusTypes.find((sx) => sx.statustype_id === statusId)?.statustype_name
  ?? null;
```

**Fix 3 — Frontend: `saveMut` não envia `activity_status_name`** (coluna não existe em `tbTaskActivity` — enviá-la causava falha silenciosa no UPDATE):
```typescript
// ERRADO: causava "Unknown column 'activity_status_name' in 'field list'"
data.activity_status_name = edits.activity_status_name; // ← REMOVIDO

// CORRETO: envia apenas o INT FK que existe na tabela
data.activity_status = found.statustype_id;
```

**Fix 4 — Backend: `reclassify_status` usava coluna errada** (`activity_status_id` não existe em `tbTaskActivity`):
```python
# ANTES (bug) — z:/bridgeadoption/src/domain/status_reclassification.py
col_status_id = "activity_status_id"   # coluna inexistente

# DEPOIS (correto)
col_status_id = "activity_status"      # nome correto da coluna
```

**Correção do banco (executar uma vez):**
```sql
UPDATE tbTaskActivity a
JOIN tbStatusType s ON s.statustype_id = a.activity_status
SET a.activity_status_name = s.statustype_name
WHERE a.activity_status_name IS NULL
   OR a.activity_status_name != s.statustype_name;
```

---

### Correção 2 — Status de activity não atualizava na tela após salvar

**Problema:** Ao mudar o status de uma activity de "IN PROGRESS" para "ON HOLD", o save mostrava "✓ Salvo" mas a tela continuava exibindo "IN PROGRESS". O histórico registrava corretamente "Status → ON HOLD".

**Causa raiz:** O `saveMut` enviava `activity_status_name` no payload (Fix 3 acima). O `UPDATE` falhava silenciosamente (coluna inexistente → MySQL exception → 0 rows affected → `{ "success": false }` com HTTP 200). O `Promise.all` resolvia com sucesso (o histórico era salvo separadamente e não falhava), portanto `onSuccess` era chamado. O refetch retornava o valor antigo pois o DB não foi atualizado.

**Fix:** Remover `activity_status_name` do payload de `updateActivity` — já documentado no Fix 3 acima.

---

## 5. Arquitetura de status das activities

### Por que `activity_status_name` não existe em `tbTaskActivity`

A tabela `tbTaskActivity` armazena apenas `activity_status` (INT FK para `tbStatusType.statustype_id`). O `activity_status_name` é derivado via JOIN na view `vwTaskActivity`:

```sql
-- vwTaskActivity (view)
a.activity_status      AS activity_status_id,   -- INT numérico
st.statustype_name     AS activity_status_name,  -- string via JOIN
```

Porém, `GET /api/tasks/detail/{id}/activities` consulta `tbTaskActivity` diretamente (`SELECT * FROM tbTaskActivity`), retornando apenas o INT numérico. O `activity_status_name` é resolvido **no frontend** via lookup em `statusTypes`:

```typescript
const resolvedStatusName = act.activity_status_name
  ?? statusTypes.find((sx) => sx.statustype_id === statusId)?.statustype_name
  ?? null;
```

### Status IDs de referência

| statustype_id | statustype_name | Encerrado? |
|---|---|---|
| 1 | OPEN | Não |
| 2 | IN PROGRESS | Não |
| 3 | ON HOLD | Não |
| 4 | CANCELLED | ✅ Sim (`CLOSED_STATUS`) |
| 5 | (filtrado da UI) | ✅ Sim (`CLOSED_STATUS`) |
| 6 | COMPLETED/CLOSED | ✅ Sim (`CLOSED_STATUS`) |
| 10 | COMPLETED/CLOSED | ✅ Sim (`CLOSED_STATUS`) |

**Constante compartilhada:**
```typescript
const CLOSED_STATUS = new Set([4, 5, 6, 10]);       // activities e tasks
const CLOSING_STATUS_IDS = new Set([4, 6, 10]);       // apenas para filtro de opções da task
```

---

## 6. Fluxo de salvamento da task (TaskEditForm)

```
Usuário clica "Salvar"
  └─ saveMut.mutationFn()
       ├─ mapField("task_owner_name" → task_owner_id via csms lookup)
       ├─ mapField("task_status_name" → task_status via statusTypes lookup)
       ├─ mapField("task_priority", "task_reference", "task_ws", ...)
       ├─ [Regras 4+5] activities.length > 0?
       │    ├─ SIM → auto-calcula task_start_performed (MIN) e task_end_performed (MAX)
       │    └─ NÃO → mapField("task_start_performed", "task_end_performed") manual
       ├─ Monta history se houver mudanças
       └─ tasksApi.updateTask(task_id, data, history)
