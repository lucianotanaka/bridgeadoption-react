# Módulo Tasks — Bridge Adoption React

> **Última atualização:** 2026-08-27  
> **Rota:** `/tasks`  
> **resource_key principal:** `task.task`  
> **resource_key (sub-permissão):** `task.task_lci_viability`  
> **Audiência:** Desenvolvimento e sustentação

---

## 1. Visão geral

O módulo Tasks é o coração operacional do Bridge Adoption. Permite que os CSMs gerenciem as tarefas de adoção tecnológica de seus clientes Cisco: acompanhamento de status/atividades, follow-ups, filtros avançados, análise de viabilidade de incentivo Cisco LCI, criação de novas tarefas e relatórios operacionais.

A página principal (`TaskPage.tsx`) funciona como um **hub com abas**, equivalente ao antigo `webapp/pages/task/task.py` do Streamlit (toolbar com Overview / Filter / New Task / Reports / LCI Viability).

---

## 2. Componentes (frontend)

```
frontend/src/pages/tasks/
├── TaskPage.tsx            → Hub principal — abas, permissões, painel de detalhe
├── TaskOverview.tsx        → Componentes do painel "Overview" (Monitoring/Finance/Service/ActionQueue)
├── TaskFilterTab.tsx       → Aba "Filter" — filtros avançados + tabela de resultados
├── NextFollowUpPanel.tsx   → Aba "Next Follow-Up" — quadro de follow-ups por período
├── TaskDetailPanel.tsx     → Painel de detalhe da tarefa (edição, atividades, RACI, histórico)
├── LCIViabilityPage.tsx    → Aba "LCI Viability" — grupos de tarefas por Track/Party, ação em lote
├── NewTaskForm.tsx         → Aba "New Task" — formulário de criação
└── TaskReportsTab.tsx      → Aba "Reports" — relatórios "Task List" e "Task Details"
```

### `TaskPage.tsx`
- Componente raiz do módulo Tasks.
- Gerencia a navegação entre abas via `useState<TabType>`: `overview | next-follow-up | filter | lci-viability | new | reports`.
- **Controle de permissão da aba "LCI Viability":** a aba só é exibida se `hasPermission("task.task_lci_viability")` retornar `true` (ADMIN sempre tem acesso; demais usuários dependem da permissão granular). Um `useEffect` de segurança redireciona para "Overview" caso o usuário perca a permissão enquanto estiver na aba.
- Renderiza `TaskDetailPanel` como bloco expansível abaixo do conteúdo da aba ativa ao selecionar uma tarefa (na Overview, Follow-Up, Filter ou New Task).
- Botão flutuante "voltar ao topo".

### `TaskOverview.tsx`
- Exporta os blocos usados na aba Overview:
  - `MonitoringPanel` — KPIs gerais (tarefas ativas, radar crítico N1/N2, follow-ups, planejadas atrasadas, atividades atrasadas), distribuição por status e prioridade.
  - `ActionQueueCard` — card de tarefa na fila de ações críticas.
  - `FinancePanel` — impacto financeiro (potencial de receita vs. risco de despesa), Top 5 riscos de despesa.
  - `ServicePanel` — tarefas com impacto em serviço ao cliente, Top 5 riscos.
- Dados vêm de `tasksApi.getKPI()`, `tasksApi.getOverview()` e `tasksApi.getActionQueue()`.

### `TaskFilterTab.tsx`
- Filtros em cascata: Owner, Task Type, Client, WS/Subscription, Track, Deal ID, Status (multi-select com busca).
- Opções dinâmicas carregadas via `tasksApi.getFilterOptions()` (view `vwFilterTask`).
- Ao aplicar (`tasksApi.filterTasks()`), retorna as tasks completas de `vwTask` e alimenta o `TaskDetailPanel`.

### `NextFollowUpPanel.tsx`
- Quadro de próximos follow-ups agrupado em: Delayed, Today, This Week, Next Week (`tasksApi.getFollowUp()`).
- Indicadores de urgência (`OVERDUE`, `TODAY`, `THIS WEEK`, `NEXT WEEK`) e contagem de atividades pendentes de contato.

### `TaskDetailPanel.tsx`
- Tabela paginada com as tasks carregadas (do Overview/Filter/Follow-Up/New Task), permitindo navegar entre elas sem fechar o painel.
- **Edição da task** (`TaskEditForm`): owner, status, temp owner, prioridade, referência, WS, deal ID, valor/moeda, datas performed (auto-calculadas das atividades quando existem), % concluído, projeto vinculado, descrição.
- **Controle de acesso por regras de negócio** — ver seção 4.3 abaixo.
- **Atividades** (`ActivityRow` + `AddActivityForm`): lista expansível com edição inline completa e criação de novas atividades.
- **Matriz RACI** (`RACIMatrix`): gestão de responsáveis por task/atividade (R/A/C/I).
- **Histórico** (`HistorySection`): notas/eventos por task ou atividade, com filtro por tipo e paginação incremental.
- **Ver:** `docs/02_application/tasks/task_detail_panel.md` para documentação detalhada.

### `LCIViabilityPage.tsx`
- Lista de registros elegíveis a partir de `vwCustomerCiscoLCITrackProjectPM` (`tasksApi`/`lciApi.getList()`), navegável e filtrável por Client/Solution-Track/PM.
- Para cada registro, agrupa as tasks relacionadas por `Track|PartyID` (`getTasks()`), permitindo alterar o status em lote (OPEN/ON HOLD/IN PROGRESS/CANCELLED), vincular projeto (existente ou novo) quando uma task migra para IN PROGRESS, e exigir justificativa de cancelamento quando aplicável (`saveGroup()`).
- **Acesso protegido pela permissão `task.task_lci_viability`** — ver seção 5.

### `NewTaskForm.tsx`
- Formulário de criação de nova task (`tasksApi.createTask()`), com seleção de tipo, cliente, owner, datas, prioridade, valor/moeda e campos opcionais (referência, track, WS, deal ID).
- Ao criar com sucesso, abre automaticamente o `TaskDetailPanel` para a task recém-criada.

### `TaskReportsTab.tsx`
- **Aba "Reports"**, espelhando `task_filter_report.py` + `task_report_task_list.py` + `task_report_task_detail.py` do Streamlit.
- Filtros em cascata **obrigando a seleção de ao menos um Owner** antes de habilitar Task Type/Client/Status (via `tasksApi.getReportOwners()` e `tasksApi.getReportFilterOptions()`).
- Dois relatórios disponíveis após aplicar os filtros:
  - **Task List** — tabela completa de todas as colunas relevantes da task (`tasksApi.getReportTasks()`), com exportação para CSV/Excel.
  - **Task Details** — seletor de Task ID (alimentado pelas tasks filtradas), exibindo gráfico de pizza (SVG) do status das atividades, dados-resumo da task, cronograma (schedule: linha da task + atividades) exportável, e detalhamento de cada atividade (incluindo escopo) — via `tasksApi.getReportTaskDetail()`.

---

## 3. Endpoints da API

**Prefixo:** `/api/tasks` — arquivo `backend/app/tasks/router.py`

### Overview & KPI

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/tasks/overview` | Tasks + valores agregados para o Overview |
| GET | `/api/tasks/kpi` | KPIs consolidados (ativas, críticas, follow-ups, financeiro) |
| GET | `/api/tasks/action-queue` | Fila de ações críticas ordenada por score |

### Filtro (aba "Filter")

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/tasks/filter-options` | Opções dinâmicas de filtro (`vwFilterTask`) |
| POST | `/api/tasks/filter` | Aplica filtros em cascata e retorna tasks completas |

### Detalhe da Task / Atividades / Histórico

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/tasks/detail/{task_id}` | Detalhe completo (`vwTask`) |
| PUT | `/api/tasks/detail/{task_id}` | Atualiza campos + histórico opcional |
| GET | `/api/tasks/detail/{task_id}/activities` | Atividades da task |
| POST | `/api/tasks/detail/{task_id}/activities` | Cria nova atividade |
| GET | `/api/tasks/detail/{task_id}/history` | Histórico (opcional filtro por atividade) |
| POST | `/api/tasks/detail/{task_id}/history` | Adiciona nota/evento |
| GET | `/api/tasks/activities/{activity_id}` | Detalhe de uma atividade específica |
| PUT | `/api/tasks/activities/{activity_id}` | Atualiza campos da atividade |

### RACI

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/tasks/detail/{task_id}/raci` | RACI ativo (task ou atividade) |
| POST | `/api/tasks/detail/{task_id}/raci` | Adiciona pessoa ao RACI |
| PATCH | `/api/tasks/detail/{task_id}/raci/{raci_id}` | Atualiza responsabilidade (R/A/C/I) |
| DELETE | `/api/tasks/detail/{task_id}/raci/{raci_id}` | Remove (soft-delete) do RACI |
| GET | `/api/tasks/company-list` | Empresas para filtro de pessoa no RACI |
| GET | `/api/tasks/person-list` | Pessoas (opcional por empresa / apenas internos) |
| POST | `/api/tasks/person-list` | Cria nova pessoa |

### Suporte / listas auxiliares

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/tasks/csm-list` | CSMs ativos (owner/temp owner) |
| GET | `/api/tasks/status-types` | Tipos de status disponíveis |
| GET | `/api/tasks/task-types` | Tipos de task (para New Task) |
| GET | `/api/tasks/status-justifications` | Justificativas por status_id |
| GET | `/api/tasks/projects` | Projetos ativos de um cliente |
| GET | `/api/tasks/project-team` | Equipe de projeto de um cliente |

### Follow-Up

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/tasks/follow-up` | Follow-ups agrupados: delayed / today / current_week / next_week |

### New Task

| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/api/tasks/new` | Cria nova task + histórico inicial |

### LCI Viability *(protegido por `task.task_lci_viability`)*

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/tasks/lci-viability/list` | Registros elegíveis (`vwCustomerCiscoLCITrackProjectPM`) |
| GET | `/api/tasks/lci-viability/tasks` | Tasks agrupadas por `Track\|PartyID` para um registro |
| GET | `/api/tasks/lci-viability/justifications` | Justificativas válidas de cancelamento |
| GET | `/api/tasks/lci-viability/projects-in-progress` | Projetos ativos do cliente (para vincular IN PROGRESS) |
| POST | `/api/tasks/lci-viability/normalize` | Normaliza mapa de status conforme regras de negócio |
| POST | `/api/tasks/lci-viability/save-group` | Salva alteração de status em lote (+ histórico) |

> **Nota de segurança:** estes endpoints, assim como a aba "LCI Viability" no frontend, dependem da permissão `task.task_lci_viability` — ver seção 5 (Permissões).

### Reports (aba "Reports")

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/tasks/reports/owners` | Owners disponíveis (`vwFilterTaskOwner`) |
| POST | `/api/tasks/reports/filter-options` | Opções de Task Type/Client/Status, cascateadas pelos owners |
| POST | `/api/tasks/reports/tasks` | Tasks completas filtradas (usado em Task List e no seletor do Task Details) |
| GET | `/api/tasks/reports/task-detail/{task_id}` | Task + atividades + cronograma + resumo de status (para Task Details) |

---

## 4. Regras de negócio

### Tarefas ativas
Tarefas com `task_status_id` fora do conjunto de status finais `{4, 5, 6, 10}` (Cancelled, Closed, Done, Completed). São a base do painel Overview.

### Radar crítico (N1 / N2)
Critérios de criticidade calculados no backend (`service.py`), como: data limite vencida (overdue), ausência de follow-up recente, alta prioridade sem atividade recente.

### Follow-Up
Cada task/atividade possui uma data de próximo follow-up. O quadro "Next Follow-Up" agrupa por: Delayed, Today, This Week, Next Week, destacando urgência visualmente.

### Viabilidade LCI
Análise de elegibilidade de tasks para o incentivo Cisco LCI (Life Cycle Incentive), agrupadas por `Track|PartyID`. Regras de transição de status em lote:
- Mover uma task para **IN PROGRESS** cancela as demais do grupo e exige vínculo com um projeto (existente ou novo).
- Mover todo o grupo para **ON HOLD** aplica justificativa automática "IN REVIEW".
- Mover todo o grupo para **CANCELLED** exige justificativa de cancelamento selecionada de uma lista pré-definida.

### Prioridade
Prioridades (`HIGH` / `MEDIUM` / `LOW`) são traduzíveis via i18n e coloridas por convenção: vermelho (alta/crítica), amarelo/laranja (média), verde/azul (baixa).

### Auto-cálculo de `task_completed`
Ao alterar `task_status` sem informar `task_completed` explicitamente, o backend calcula automaticamente:
- Sem atividades: status `2`/`3` → 25%; status `10` → 100%.
- Com atividades: status `10` → 100%; caso contrário → média de `activity_completed`.

### 4.3 Regras de edição do `TaskDetailPanel` (implementadas em 2026-08-27)

As seguintes regras de negócio foram implementadas no componente `TaskEditForm` dentro de `TaskDetailPanel.tsx`:

#### Regra 1 — Controle de edição por propriedade
Somente o **dono** (`task_owner_id`) **ou dono temporário** (`task_temp_owner_id`) da task, ou usuários com role `ADMIN` ou permissão `task.edit`, podem editar qualquer campo da task. Demais usuários veem os campos como somente-leitura, com banner de aviso.

```typescript
const canEdit = isOwner || isTempOwner || isAdmin || hasPermission("task.edit");
const isReadOnly = isClosed || !canEdit;
```

#### Regra 2 — Controle de encerramento por propriedade
Somente o **dono** (não o dono temporário), `ADMIN` ou `task.edit` podem alterar o status para valores de encerramento (`CANCELLED=4`, `CLOSED=6`, `COMPLETED/CLOSED=10`). Opções de encerramento são removidas do select de status para quem não tem esse acesso.

#### Regra 3 — Encerramento bloqueado com activities abertas
Enquanto houver ao menos uma activity com status fora de `{4, 5, 6, 10}` (aberta/em andamento), as opções de encerramento (`CLOSING_STATUS_IDS = {4, 6, 10}`) ficam ocultas no select de status da task.

#### Regra 4 — `task_start_performed` auto-calculado
Quando a task possui activities, o campo `task_start_performed` é calculado automaticamente como a **menor data** entre todos os `activity_start_performed` (ou `activity_start` quando `activity_start_performed` é nulo) das atividades filhas. O campo fica bloqueado para edição manual.

#### Regra 5 — `task_end_performed` auto-calculado
Quando a task possui activities, o campo `task_end_performed` é calculado automaticamente como a **maior data** entre todos os `activity_end_performed` (ou `activity_end` quando `activity_end_performed` é nulo) das atividades filhas. O campo fica bloqueado para edição manual.

> Quando não há activities, os campos de data voltam a ser editáveis manualmente.

---

## 5. Permissões

O módulo usa **dois níveis de permissão** (`resource_key`), replicando exatamente o comportamento do Streamlit (`webapp/pages/task/task.py`):

| resource_key | Controla |
|---|---|
| `task.task` | Acesso ao módulo Tasks como um todo (rota `/tasks`) |
| `task.task_lci_viability` | Exibição/acesso à aba e aos endpoints de **LCI Viability** |

### Lógica original (Streamlit)

```python
# webapp/pages/task/task.py
if "ADMIN" in st.session_state.roles:
    permission = "full"
else:
    permission = can("task.task", st.session_state.permissions)

if permission is None:
    st.error(...); st.stop()

permission_lci_viability = True
if permission != "full":
    permission_lci_viability = can("task.task_lci_viability", st.session_state.permissions)
```

`can()` (`webapp/utils/authorization.py`) percorre a estrutura de permissões e retorna a `action` do `resource_key` apenas se ela existir e não for `"deny"` — **independente do campo `show_in_menu`**, que serve apenas para controlar a exibição no menu lateral, não o acesso à funcionalidade.

### Implementação no React

- `frontend/src/hooks/useAuth.ts` — `extractResourceKeys()` extrai **todos** os `resource_key` concedidos (qualquer `action !== "deny"`), sem filtrar por `show_in_menu`. Essa correção é essencial: como `task.task_lci_viability` é uma sub-permissão sem entrada própria no menu (`show_in_menu = 0` no banco), filtrar por `show_in_menu === 1` fazia com que a permissão nunca fosse reconhecida — a aba aparecia (incorretamente) para todos os usuários com acesso ao módulo Tasks, pois não havia verificação alguma no componente.
- `frontend/src/pages/tasks/TaskPage.tsx`:
  ```tsx
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canViewLciViability = hasPermission("task.task_lci_viability");

  const tabs = [
    ...,
    ...(canViewLciViability
      ? [{ key: "lci-viability", label: t("task.lciViability"), icon: <Activity size={14} /> }]
      : []),
    ...,
  ];

  useEffect(() => {
    if (activeTab === "lci-viability" && !canViewLciViability) {
      setActiveTab("overview");
    }
  }, [activeTab, canViewLciViability]);
  ```
- `authStore.hasPermission()` trata `ADMIN` como acesso total (bypass), equivalente à permissão `"full"` do Streamlit.
- Rota do módulo protegida em `App.tsx` via `<PermissionRoute resourceKey="task.task" />`. Não há rota React separada para LCI Viability (é uma aba interna), por isso a proteção é feita no nível do componente, e reforçada no backend nos endpoints `/api/tasks/lci-viability/*` (recomenda-se adicionar verificação de `task.task_lci_viability` nesses endpoints, análogo ao que é feito para rotas `admin.*`).

### SQL de referência

```sql
-- Verificar resource_key da sub-permissão
SELECT resource_key FROM tbAuthResource WHERE resource_key = 'task.task_lci_viability';

-- Conceder acesso a LCI Viability para um vínculo usuário+role
INSERT INTO tbAuthPermission (user_role_id, resource_id, action_id)
SELECT ur.user_role_id, r.resource_id, a.action_id
FROM tbAuthUserRole ur
JOIN tbAuthResource r ON r.resource_key = 'task.task_lci_viability'
JOIN tbAuthAction a ON a.action_key = 'full'
WHERE ur.user_id = <user_id>;
```

> Ver também `docs/06_security/authorization_rbac.md` para o modelo completo de RBAC.

---

## 6. Troubleshooting

| Problema | Causa provável | Solução |
|---|---|---|
| Tarefas não carregam | Token expirado ou API offline | Verificar `/api/tasks/overview` retorna 200 |
| Follow-ups desatualizados | Cache do TanStack Query | Refetch manual ou aguardar `staleTime` |
| Filtros sem resultado | Dados do banco não correspondem | Verificar `vwFilterTask` / `vwTask` |
| Detalhes não abrem | Erro no `TaskDetailPanel` | Verificar console do browser |
| "LCI Viability" aparece para quem não deveria ver | `extractResourceKeys()` desatualizado (regressão) | Confirmar que a extração não filtra por `show_in_menu` |
| "LCI Viability" some mesmo com permissão concedida | Permissão não persistida em `tbAuthPermission`, ou token JWT antigo (cache) | Conceder permissão + relogar para renovar `permissions` no `authStore` |
| Relatório "Task Details" retorna "No data." mesmo com Task ID válido | `NaN`/`None` em `task_completed`/`activity_seq` causa `ValueError` silencioso em `get_report_task_detail()`, endpoint retorna 404 | Corrigido usando `_safe_pct()` / `_safe_int()` em `report_service.py` — validar se a versão do backend inclui essas funções |
| Exportação de relatórios não gera arquivo | Bloqueador de pop-up do browser ou erro no `exportToExcel()` (CSV) | Verificar console; o export é feito client-side via Blob/CSV, sem chamada à API |

---

## 7. Ver também

- `docs/06_security/authorization_rbac.md` — modelo completo de RBAC (tabelas, fluxo de login, proteção de rotas/endpoints)
- `docs/00_migration/Streamlit_to_React_Migration_Plan.md` — mapeamento geral Streamlit → React
