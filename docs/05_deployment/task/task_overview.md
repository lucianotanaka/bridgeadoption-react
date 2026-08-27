# Tasks — Visão Geral do Módulo (React)

> **Última atualização:** 2026-08-27
> **Versão:** Bridge Adoption React
> **Rota:** `/tasks`
> **Audiência:** Implantação e sustentação

---

## 1. Objetivo do Módulo

O módulo **Tasks** é o coração operacional do Bridge Adoption. Permite que os CSMs gerenciem tarefas de adoção tecnológica Cisco:

- Monitoramento de status e criticidade (Overview / KPIs)
- Acompanhamento de próximos follow-ups agrupados por urgência
- Filtros avançados em cascata para localizar tasks
- Edição de dados da task: status, owner, datas, valores, projeto vinculado
- Gestão de atividades (activities) vinculadas à task
- Matriz RACI por task / atividade
- Histórico de notas e eventos
- Análise de viabilidade LCI (Cisco incentive)
- Criação de novas tasks
- Relatórios exportáveis (Task List / Task Details)

---

## 2. Estrutura do Módulo

```
Módulo Tasks
├── Aba Overview          → KPIs, radar crítico, financeiro, serviço
├── Aba Next Follow-Up    → Follow-ups por período (Delayed/Today/Week)
├── Aba Filter            → Filtros em cascata + tabela de resultados
├── Aba LCI Viability *   → Análise de elegibilidade para incentivo LCI
├── Aba New Task          → Formulário de criação
├── Aba Reports           → Task List + Task Details exportáveis
└── TaskDetailPanel       → Painel de detalhe (abre abaixo da aba ativa)
    ├── TaskEditForm      → Edição de campos (Regras 1-5 de controle)
    ├── ActivityRow       → Atividades (edição inline + nova atividade)
    ├── RACIMatrix        → Gestão de responsabilidades
    └── HistorySection    → Notas / histórico de eventos
```

> `*` A aba **LCI Viability** só aparece para usuários com permissão `task.task_lci_viability`.

---

## 3. Arquivos-Chave

### Frontend

| Arquivo | Função |
|---------|--------|
| `frontend/src/pages/tasks/TaskPage.tsx` | Hub principal — abas, TaskDetailPanel |
| `frontend/src/pages/tasks/TaskOverview.tsx` | Painéis Overview (Monitoring/Finance/Service) |
| `frontend/src/pages/tasks/TaskFilterTab.tsx` | Aba Filter — filtros + tabela |
| `frontend/src/pages/tasks/NextFollowUpPanel.tsx` | Aba Follow-Up |
| `frontend/src/pages/tasks/TaskDetailPanel.tsx` | Painel de detalhe + edição + RACI + histórico |
| `frontend/src/pages/tasks/LCIViabilityPage.tsx` | Aba LCI Viability |
| `frontend/src/pages/tasks/NewTaskForm.tsx` | Aba New Task |
| `frontend/src/pages/tasks/TaskReportsTab.tsx` | Aba Reports |
| `frontend/src/api/tasks.ts` | Funções de chamada à API |

### Backend

| Arquivo | Função |
|---------|--------|
| `backend/app/tasks/router.py` | Endpoints REST `/api/tasks/*` |
| `backend/app/tasks/service.py` | Overview, KPIs, Action Queue |
| `backend/app/tasks/filter_service.py` | Filtros, detalhe, update, atividades, RACI |
| `backend/app/tasks/lci_viability_service.py` | Viabilidade LCI, grupos de status |
| `backend/app/tasks/report_service.py` | Relatórios Task List / Task Details |
| `backend/app/tasks/schemas.py` | Modelos Pydantic (TaskOverviewResponse, etc.) |

### Admin (somente ADMIN)

| Arquivo | Função |
|---------|--------|
| `frontend/src/pages/admin/AdminTasksPage.tsx` | Página Admin → Tasks |
| `backend/app/modules/admin_task_service.py` | Service admin: filtro, edit, remove |
| `backend/app/modules/sections_router.py` | Endpoints `/api/admin/tasks/*` |

---

## 4. Hierarquia de Dados

```
Task (tbTask)
  │
  ├── Activity (tbTaskActivity)  ← n atividades por task
  │     │
  │     └── Record (tbTaskRecord, via activity_id)
  │
  ├── Record (tbTaskRecord, via task_id)   ← notas / follow-ups
  │
  └── RACI (tbTaskRACI)   ← responsáveis por task / atividade
```

---

## 5. Permissões

| resource_key | Acesso concedido |
|---|---|
| `task.task` | Módulo Tasks completo (todas as abas exceto LCI Viability) |
| `task.task_lci_viability` | Aba LCI Viability |
| `task.edit` | Edição de tasks sem ser dono/dono-temp (Regra 1 do TaskDetailPanel) |
| `admin.admin_task` | Admin → Tasks (apenas Role ADMIN) |

Ver `docs/06_security/authorization_rbac.md` para detalhes do modelo RBAC.

### Regras de edição do TaskDetailPanel (2026-08-27)

| # | Regra | Controla |
|---|-------|----------|
| 1 | Edição por propriedade | Somente dono/dono-temp/ADMIN/`task.edit` podem editar campos da task |
| 2 | Encerramento por propriedade | Somente dono/ADMIN/`task.edit` veem CANCELLED/CLOSED/COMPLETED no select |
| 3 | Encerramento bloqueado com activities abertas | Opções de encerramento ocultas enquanto houver activity não finalizada |
| 4 | `task_start_performed` auto-calculado | MIN(activity_start_performed \|\| activity_start) quando há activities |
| 5 | `task_end_performed` auto-calculado | MAX(activity_end_performed \|\| activity_end) quando há activities |

Ver `docs/02_application/tasks/task_detail_panel.md` para documentação detalhada.

---

## 6. Status Finais (bloqueiam edição)

Tasks com `task_status_id` em `{4, 5, 6, 10}` são consideradas **finalizadas**:

| ID | Status |
|----|--------|
| 4 | CANCELLED |
| 5 | CLOSED |
| 6 | DONE |
| 10 | COMPLETED |

---

## 7. Dependências de Banco de Dados

| Objeto | Tipo | Uso |
|--------|------|-----|
| `tbTask` | Tabela | Entidade principal |
| `tbTaskActivity` | Tabela | Atividades filhas |
| `tbTaskRecord` | Tabela | Histórico / follow-ups |
| `tbTaskRACI` | Tabela | Matriz RACI |
| `tbTaskType` | Tabela | Tipos de task |
| `tbTaskActivityTemplate` | Tabela | Templates para criação automática de atividades |
| `tbStatusType` | Tabela | Catálogo de status |
| `tbStatusTypeJustification` | Tabela | Justificativas por status |
| `vwTask` | View | Task completa (joins com company, user, status) |
| `vwFilterTask` | View | Filtros leves (sem todos os campos de vwTask) |
| `vwFilterTaskOwner` | View | Owners para filtro de Reports |
| `vwCustomerCiscoLCITrackProjectPM` | View | Dados para LCI Viability |

---

## 8. Verificação rápida pós-deploy

```bash
# 1. Health check da API
curl -s http://localhost:8001/api/health | python3 -m json.tool

# 2. Testar endpoint de overview (requer token)
curl -s -H "Authorization: Bearer <TOKEN>" http://localhost:8001/api/tasks/kpi

# 3. Testar filtro de opções
curl -s -H "Authorization: Bearer <TOKEN>" http://localhost:8001/api/tasks/filter-options
```

---

## 9. Referências

- **Módulo completo:** `docs/02_application/module_tasks.md`
- **TaskDetailPanel:** `docs/02_application/tasks/task_detail_panel.md` ← **NOVO**
- **API endpoints:** `docs/07_api/tasks_endpoints.md`
- **Database:** `docs/05_deployment/task/task_database.md`
- **Flows:** `docs/05_deployment/task/task_flows.md`
- **Troubleshooting:** `docs/05_deployment/task/task_troubleshooting.md`
- **Admin Tasks:** `docs/02_application/tasks/admin_tasks.md`
