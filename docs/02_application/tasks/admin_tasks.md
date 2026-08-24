# Admin Tasks — Ajuste Administrativo de Tarefas

> **Última atualização:** 2026-08-24
> **Rota:** `/admin/tasks`
> **resource_key:** `admin.admin_task` (acesso exclusivo ADMIN)
> **Audiência:** Sustentação e administração de sistema

---

## 1. Visão Geral

O módulo **Admin → Tasks** permite ao administrador do sistema pesquisar, editar e remover dados de tarefas, atividades e registros históricos diretamente no banco de dados, sem passar pelo fluxo normal de negócio.

Equivale à página Streamlit `webapp/pages/admin/admin_task.py`, migrada para React como `frontend/src/pages/admin/AdminTasksPage.tsx`.

**Casos de uso típicos (sustentação):**
- Corrigir dados incorretos importados (WS, deal, track, subtrack errados)
- Remover tarefas criadas por engano ou em ambiente de testes
- Zerar/resetar atividades e registros vinculados a uma task "suja"
- Auditar dados de tasks antes de operações em massa

---

## 2. Componentes (frontend)

**Arquivo:** `frontend/src/pages/admin/AdminTasksPage.tsx`

O componente é um **hub com 3 abas** e um painel de filtros dinâmicos:

```
AdminTasksPage
├── Painel de filtros
│   ├── task_id       (campo de texto)
│   ├── task_ws       (multiselect)
│   ├── task_deal_id  (multiselect)
│   ├── task_track    (multiselect)
│   └── task_subtrack (multiselect)
├── Tab: Tarefas — tbTask
│   ├── DataTable (multi-seleção)
│   ├── Botão Editar → FieldSelector + EditForm dinâmico
│   └── Botão Remover → Confirmação → remoção em massa
├── Tab: Atividades — tbTaskActivity
│   ├── DataTable (single-seleção)
│   ├── Botão Editar → FieldSelector + EditForm dinâmico
│   └── Botão Remover → Confirmação → remoção da atividade
└── Tab: Registros — tbTaskRecord
    ├── DataTable (read-only)
    └── Painel de detalhe do registro selecionado
```

### Fluxo de uso

1. **Preencher filtros** → clicar em **Aplicar Filtros**
2. O frontend carrega tasks + activities + records simultaneamente
3. **Tab Tarefas:** selecionar uma ou mais linhas
   - 1 task selecionada → botões **Editar** e **Remover** disponíveis
   - N tasks selecionadas → apenas **Remover** disponível
4. **Editar:** escolher campos no seletor → preencher formulário → Salvar
5. **Remover:** exibe aviso com os IDs afetados → confirmar → executa remoção em massa
6. **Tab Atividades:** selecionar 1 atividade → Editar ou Remover
7. **Tab Registros:** visualização somente leitura dos registros históricos

### Subcomponentes internos

| Componente | Descrição |
|-----------|-----------|
| `MultiSelect` | Dropdown com checkboxes para filtros dinâmicos |
| `FieldSelector` | Dropdown para escolha dos campos a editar |
| `DataTable` | Tabela genérica com seleção (multi ou single-row) |
| `EditForm` | Formulário dinâmico gerado pelos campos selecionados |
| `MiniMetric` | Mini indicadores (Tarefas / Atividades / Registros) |

---

## 3. Campos Editáveis

### Task (`tbTask`) — 39 campos

| Campo | Tipo | Observação |
|-------|------|------------|
| `task_tasktype_id` | int | ID do tipo de task |
| `task_reference` | str | Referência externa |
| `task_owner_id` | int | CSM responsável |
| `task_temp_owner_id` | int | CSM temporário |
| `task_customer_id` | int | Empresa cliente |
| `task_priority` | choice | `LOW` / `MEDIUM` / `HIGH` |
| `task_status` | int | ID do status |
| `task_status_justification` | str | Justificativa de status |
| `task_start` / `task_end` | date | Datas planejadas |
| `task_start_performed` / `task_end_performed` | date | Datas realizadas |
| `task_value` / `task_forecast` / `task_backlog` | float | Valores financeiros |
| `task_currency` | str | Moeda (USD, BRL...) |
| `task_ws` | str | Workstream |
| `task_deal_id` | str | Deal ID |
| `task_track` / `task_subtrack` | text | Track e Sub-Track |
| `task_eligible` | choice | `Y` / `N` |
| `task_ea_flag` / `task_telemetry_flag` / `task_opt_in_flag` | bool | Flags booleanas |
| `task_highlight` | bool | Destaque |
| `task_completed` | float | % de conclusão (0.0–1.0) |
| `task_architecture` / `task_solution_domain` | str | Classificações |
| `task_remark` / `task_description` | text | Observações |
| `task_end_fy` | int | Fiscal Year de conclusão |
| `task_booking_date` | date | Data de booking |
| `task_booking_amount` | float | Valor de booking |

### Activity (`tbTaskActivity`) — 28 campos

Inclui: `activity_task_id`, `activity_seq`, `activity_name`, `activity_status`, datas, esforços, valores, aprovação, `activity_track`, `activity_sub_track`, `activity_ws`, `activity_deal_id`, textos de objetivo/escopo/resultados esperados.

---

## 4. Comportamento da Remoção

A operação "Remover" **não deleta** registros do banco — ela **zera/nulifica** todos os campos, tornando os registros "vagos" (reutilizáveis pelo `TaskRepository.insert()`).

### Para cada `task_id` selecionado:

```
1. tbTask        → todos os campos zerados/nulos (task_tasktype_id=0, task_customer_id=0, etc.)
2. tbTaskActivity → WHERE activity_task_id = task_id → zerado (activity_task_id=0, activity_seq=0, etc.)
3. tbTaskRecord  → WHERE taskrecord_task_id = task_id → zerado
```

### Para uma `activity_id`:

```
1. tbTaskActivity → WHERE activity_id = activity_id → zerado
2. tbTaskRecord  → WHERE taskrecord_activity_id = activity_id → zerado
```

> ⚠️ **Esta ação não pode ser desfeita.** O frontend exibe um aviso explícito com os IDs afetados antes de confirmar.

---

## 5. API Endpoints (resumo)

Ver referência completa em `docs/07_api/tasks_endpoints.md` — seção **Admin Tasks**.

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/admin/tasks/filter-options` | Opções de filtro |
| POST | `/api/admin/tasks/filter` | Filtra tasks |
| PUT | `/api/admin/tasks/{task_id}` | Edita task |
| POST | `/api/admin/tasks/remove` | Remove tasks (bulk) |
| GET | `/api/admin/tasks/{task_id}/activities` | Atividades de uma task |
| GET | `/api/admin/tasks/{task_id}/records` | Registros de uma task |
| POST | `/api/admin/tasks/activities-many` | Atividades de múltiplas tasks |
| POST | `/api/admin/tasks/records-many` | Registros de múltiplas tasks |
| PUT | `/api/admin/tasks/activities/{activity_id}` | Edita atividade |
| POST | `/api/admin/tasks/activities/{activity_id}/remove` | Remove atividade |

---

## 6. Permissões

- Rota `/admin/tasks` protegida por `<AdminRoute>` em `App.tsx` — exige Role `ADMIN`
- Cada endpoint `/api/admin/tasks/*` verifica `_is_admin(current_user)` → `403` se não ADMIN
- `resource_key` da permissão de menu: `admin.admin_task`

---

## 7. Troubleshooting

| Problema | Causa provável | Solução |
|----------|---------------|---------|
| Filtros (ws/deal/track/subtrack) sem opções | `admin_get_task_filter_options()` retornando vazio | Verificar se `vwFilterTask` retorna dados. Se `_REPOS_OK = False`, verificar imports em `admin_task_service.py` |
| "Nenhum registro encontrado" após aplicar filtros | Filtros combinados sem match | Relaxar os filtros — testar apenas com `task_id` |
| Edição não persiste | `TaskRepository.update()` falhou | Verificar logs do backend; confirmar que os campos enviados existem em `tbTask` |
| Remoção com erros parciais | Exception em um dos 3 `update()` | O campo `errors` no response indica qual tabela falhou |
| Atividades/Registros não carregam nas abas | Falha no `POST /admin/tasks/activities-many` | Verificar `admin_get_activities_many()` nos logs |
| `_REPOS_OK = False` | Import falhou no início do módulo | Verificar `admin task repos nao disponiveis:` nos logs do gunicorn |

---

## 8. Referências

- **Frontend:** `frontend/src/pages/admin/AdminTasksPage.tsx`
- **Backend service:** `backend/app/modules/admin_task_service.py`
- **Backend router:** `backend/app/modules/sections_router.py` → `admin_router`
- **Streamlit original:** `Z:/bridgeadoption/webapp/pages/admin/admin_task.py`
- **API endpoints completos:** `docs/07_api/tasks_endpoints.md`
- **Database:** `docs/05_deployment/task/task_database.md`
