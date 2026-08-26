# Módulo Projects — Bridge Adoption React

> **Última atualização:** 2026-08-26  
> **Rota:** `/projects`  
> **resource_key:** `project.project`  
> **Arquivo frontend:** `frontend/src/pages/projects/ProjectsPage.tsx`  
> **Status:** ✅ v4 — CRUD completo (edit/add project + team member management)  
> **Audiência:** Desenvolvimento e sustentação

---

## 1. Propósito

Portfólio de projetos de clientes (**Customer Projects Portfolio**). Permite que o time de PMO e gestores visualizem, criem e editem projetos e membros da equipe do projeto.

### Fluxo de uso

```
1. Usuário seleciona CUSTOMER no dropdown pesquisável (todos os clientes válidos)
2. Sistema carrega ACCOUNT TEAM do cliente (badges de membros alocados)
3. PROJECT DETAIL exibe projetos do cliente com filtro STATUS no cabeçalho
4. Ao clicar em uma linha: PROJECT TEAM exibe equipe do projeto
5. ADMIN: botão ✏️ edita projeto | botão ➕ adiciona projeto
6. ADMIN: botões ✏️/🗑️ na equipe | botão ➕ adiciona membro
```

---

## 2. Permissões (RBAC)

| Role | Ver projetos | Editar/Criar projeto | Gerenciar equipe |
|---|---|---|---|
| Qualquer role com `project.project` READ | ✅ | ❌ | ❌ |
| **ADMIN** | ✅ | ✅ | ✅ |

A verificação no frontend usa:
```tsx
const canEdit = user?.roles?.includes("ADMIN") ?? false;
```

Os endpoints `PUT`, `POST` e `DELETE` de equipe verificam role no backend:
```python
if "ADMIN" not in (current_user.get("roles") or []):
    raise HTTPException(status_code=403, detail="ADMIN role required")
```

---

## 3. Fonte de Dados

| Fonte | Descrição |
|---|---|
| `GET /portfolio/account-team/companies` | CUSTOMER dropdown — **todos** os clientes válidos (`CompanyRepository.list_available_companies()`) |
| `GET /projects?customer_id=X` | Projetos do cliente selecionado → `vwProject SELECT *` |
| `GET /projects/account-team?customer_id=X` | Membros alocados do Account Team |
| `GET /projects/{id}/team` | Equipe do projeto → `vwProjectTeam` |
| `GET /projects/departments` | Departamentos para o select Owner → `tbDepartment` |
| `GET /projects/levels` | Níveis de recurso para o select Level → `tbResourceLevel` |
| `GET /projects/persons?search=X` | Pesquisa de pessoas para adicionar membro |

> **Mudança v4:** O CUSTOMER dropdown agora usa `GET /portfolio/account-team/companies` (baseado em `CompanyRepository.list_available_companies()`) em vez do antigo `GET /projects/customers`. Isso permite criar o **primeiro projeto de clientes sem projetos**.

---

## 4. Componentes da Interface

### 4.1 Painel de filtros (superior)

#### CUSTOMER — searchable single-select
- Dropdown pesquisável com **todos os clientes válidos** (exclui VAGO, PF, nulos, UNIDENTIFIED)
- Fonte: `GET /api/portfolio/account-team/companies` → `CompanyRepository.list_available_companies()`
- Ao limpar (✕): reseta tudo (STATUS, PROJECT DETAIL, PROJECT TEAM, formulários)

#### CLEAR FILTERS
- Aparece quando `selectedCustomer !== null` OU `selectedStatus !== ""`
- Reseta todos os estados de seleção e formulários

### 4.2 Account Team panel

Exibido após seleção do cliente.

- Fonte: `GET /api/projects/account-team?customer_id=X`
- Filtra `accountteam_allocated != 0` — apenas membros alocados
- Exibe badges: **[TIPO]** Nome

### 4.3 PROJECT DETAIL table (esquerda, 3fr)

**Header do card:**
- Título + contador de projetos filtrados
- **Select STATUS** (direita) — populado com os status dos projetos do cliente
- **Botão "+ Add Project"** (ADMIN only) — abre o formulário de criação

| Coluna | Campo | Especial |
|---|---|---|
| (✏️) | — | Botão editar — ADMIN only |
| OV | `project_ov` | Monospace |
| Project Name | `project_name` | Truncado + tooltip |
| Status | `project_status` | `StatusBadge` colorido |
| Start | `project_start_date` | ISO slice(0,10) |
| End | `project_end_date` | ISO slice(0,10) |

**Paginação:** 5/10/25/50 linhas, default 5.

### 4.4 PROJECT TEAM table (direita, 2fr)

**Header do card:**
- Título
- **Botão "+ Add Member"** (ADMIN only, quando projeto selecionado e form fechado)

| Coluna | Campo | Especial |
|---|---|---|
| (✏️🗑️) | — | Botões edit/delete — ADMIN only |
| Name | `projteam_member_name` | Badge **Lead** amarelo se `projteam_technical_lead = 1` |
| Type | `projteam_level_name` | Nível |
| Dept | `projteam_department_name` | Departamento |
| Start | `projteam_allocation_start` | Data |
| End | `projteam_allocation_end` | Data |

### 4.5 PROJECT FORM (abaixo da grid — ADMIN only)

Abre ao clicar ✏️ em uma linha do PROJECT DETAIL ou no botão "+ Add Project".

**Layout em 3 linhas fixas + 3 seções colapsáveis:**

| Linha | Campos | Proporção |
|---|---|---|
| 1 | OV * | Project Name | 1fr / 2fr |
| 2 | Owner (Dept) | Customer (read-only) | 1fr / 2fr |
| 3 | Status | Methodology | Action | 3 colunas iguais |

**Seções colapsáveis:**
- **Dates** (padrão: aberta) — Internalization Date, Start Date, End Date
- **Project Details** (padrão: fechada) — Description, Scope, Objectives, Current Scenario, Key Feature/Products, Justification, Remarks
- **Financial** (padrão: fechada) — Currency, Sprint Timebox, 7 campos de custo BRL

**Metodologias disponíveis no select:**
Agile, Scrum, Kanban, SAFe, LeSS, DAD, XP, Crystal, FDD, ASD, Waterfall, PMBOK (PMI), PRINCE2, PRINCE2 Agile, CPM, CCPM, PERT, Hybrid Agile-Waterfall, ScrumBan, Lean, Lean Six Sigma, Six Sigma, DSDM, Spiral, RAD, Prototyping, Design Thinking, DevOps

**Validação:** OV é obrigatório — botão Save desabilitado se vazio.

### 4.6 TEAM MEMBER FORM (dentro do card PROJECT TEAM — ADMIN only)

Abre ao clicar ✏️ em uma linha da equipe ou no botão "+ Add Member".

| Campo | Modo Add | Modo Edit |
|---|---|---|
| Person | Input de busca (mín. 2 chars) + dropdown de resultados | Read-only (nome do membro) |
| Department | Select → `tbDepartment` | Select → `tbDepartment` |
| Level | Select → `tbResourceLevel` | Select → `tbResourceLevel` |
| Working Time (%) | Número 0-100 | Número 0-100 |
| Technical Lead | Checkbox | Checkbox |
| Allocation Start | Date | Date |
| Allocation End | Date | Date |

**Em modo edit:** o campo Person mostra o nome atual como read-only (não editável).

---

## 5. Regras de Negócio

### 5.1 Normalização de OV

Campo crítico. Regras aplicadas em `ProjectRepository._normalize_project_ov()` e `_extract_individual_ovs()`:

| Regra | Exemplo entrada | Resultado |
|---|---|---|
| Remove espaços | `12345 _67890` | `12345_67890` |
| POC/PSR → uppercase | `poc` | `POC` |
| Split por `_` para tbProjectOV | `12345_67890_#54321` | `["12345", "67890", "54321"]` |
| Remove `#` nas OVs individuais | `#68924_#69056` | `["68924", "69056"]` |
| Ignora itens vazios | `__` | `[]` |
| Remove duplicados | `12345_12345` | `["12345"]` |

### 5.2 Sync tbProjectOV (upsert)

Ao criar (`create_project()` → `insert()`) ou editar (`update_project()`):

1. **Normaliza** `project_ov` via `_normalize_project_ov()`
2. **Busca** projeto existente pelas OVs em `tbProjectOV` via `_find_project_by_ovs()`
   - Se encontrado → **atualiza** os campos alterados em `tbProject`
   - Se não encontrado → **insere** em slot vago ou cria novo
3. **Sincroniza** `tbProjectOV` via `_sync_tbprojectov()`:
   - Adiciona OVs individuais que ainda não existem
   - Reaproveita linhas com `ov_project_id = 0`
   - Nunca remove OVs existentes

### 5.3 CUSTOMER dropdown — todos os clientes

O dropdown usa `CompanyRepository.list_available_companies()` que filtra:
- `company_name IS NOT NULL AND <> '' AND <> '-' AND <> 'UNIDENTIFIED'`
- `company_name NOT LIKE 'VAGO %'`
- `company_type <> 'PF'`

Isso permite criar o **primeiro projeto** de um cliente que ainda não tem nenhum na base.

### 5.4 Filtro de status (backend)

| Cenário | Filtro |
|---|---|
| `GET /api/projects` (sem customer_id) | `["Business Model", "In progress", "Not started", "Unidentified"]` |
| `GET /api/projects?customer_id=X` | **Sem filtro** — todos os status retornados |

### 5.5 Cache de dados para edição

`handleEditClick()` usa primariamente os dados já carregados em `allProjects` (de `vwProject SELECT *` que inclui todos os campos de `tbProject`). O endpoint `/api/projects/{id}/detail` é usado apenas como fallback.

---

## 6. Arquitetura Frontend

```
frontend/src/pages/projects/
└── ProjectsPage.tsx        ← componente único (self-contained)

Componentes internos:
  - CustomerSelect      → dropdown pesquisável
  - SectionHeader       → cabeçalho colapsável
  - ProjectForm         → formulário de projeto (ADMIN)
  - TeamMemberForm      → formulário de membro da equipe (ADMIN)
  - PaginationBar       → paginação da tabela PROJECT DETAIL
  - StatusBadge         → badge colorido por status
  - Spin                → spinner de loading
```

### Estados React

| Estado | Tipo | Descrição |
|---|---|---|
| `selectedCustomer` | `ProjectCustomer \| null` | Cliente selecionado |
| `selectedStatus` | `string` | Status filtrado (`""` = todos) |
| `selectedProjectId` | `number \| null` | Projeto selecionado (para carregar equipe) |
| `page` | `number` | Página atual (PROJECT DETAIL) |
| `pageSize` | `number` | Linhas por página (default 5) |
| `formMode` | `"none"\|"edit"\|"add"` | Estado do formulário de projeto |
| `formInitial` | `Partial<ProjectDetail> \| null` | Dados do projeto para edição |
| `teamFormMode` | `"none"\|"edit"\|"add"` | Estado do formulário de membro |
| `teamFormInitial` | `Partial<TeamMember> \| null` | Dados do membro para edição |
| `personSearch` | `string` | Texto de busca de pessoas |

### Queries React Query

| Query Key | Endpoint | Stale Time | Enabled |
|---|---|---|---|
| `["project-all-companies"]` | `GET /api/portfolio/account-team/companies` | 10 min | Sempre |
| `["project-departments"]` | `GET /api/projects/departments` | 30 min | ADMIN only |
| `["project-levels"]` | `GET /api/projects/levels` | 60 min | ADMIN only |
| `["project-persons", search]` | `GET /api/projects/persons?search=X` | 2 min | ADMIN + search.length ≥ 2 |
| `["projects-by-customer", id]` | `GET /api/projects?customer_id=X` | 5 min | Quando customer selecionado |
| `["account-team-for-projects", id]` | `GET /api/projects/account-team?customer_id=X` | 5 min | Quando customer selecionado |
| `["project-team", id]` | `GET /api/projects/{id}/team` | 5 min | Quando projeto selecionado |

### Mutations React Query

| Mutation | Endpoint | Ação |
|---|---|---|
| `saveMut` | `PUT /projects/{id}` ou `POST /projects` | Criar/atualizar projeto |
| `saveTeamMut` | `PUT /projects/team-member/{id}` ou `POST /projects/{pid}/team-member` | Criar/atualizar membro |
| `deleteTeamMut` | `DELETE /projects/team-member/{id}` | Remover membro |

Após cada mutação bem-sucedida, o React Query invalida as queries correspondentes para forçar reload.

---

## 7. Arquitetura Backend

```
backend/app/modules/sections_router.py
  └── projects_router (prefix="/api/projects")
        │
        ├── GET    /customers          → get_project_customers()
        ├── GET    /account-team       → get_account_team_allocated(customer_id)
        ├── GET    /departments        → get_departments()            [direto: tbDepartment]
        ├── GET    /levels             → get_resource_levels()        [direto: tbResourceLevel]
        ├── GET    /persons            → search_project_persons(search)
        ├── GET    /{id}/detail        → get_project_by_id(id)
        ├── GET    /{id}/team          → get_project_team(id)
        ├── GET                        → get_projects(customer_id)
        ├── POST                       → save_project(None, data)
        ├── PUT    /{id}               → save_project(id, data)
        ├── POST   /{pid}/team-member  → save_project_team_member(pid, None, data) [ADMIN]
        ├── PUT    /team-member/{id}   → save_project_team_member(0, id, data)     [ADMIN]
        └── DELETE /team-member/{id}   → delete_project_team_member(id)            [ADMIN]

Repositório:
  z:/bridgeadoption/src/infrastructure/database/repositories/
  └── project_repository.py  →  class ProjectRepository
```

### Funções do service (sections_service.py)

| Função | Dependência | Estratégia |
|---|---|---|
| `get_project_customers()` | Direct SQL | `vwProject DISTINCT customer` |
| `get_departments()` | Direct SQL | `tbDepartment` — não depende de `_PROJ_OK` |
| `get_resource_levels()` | Direct SQL | `tbResourceLevel` — não depende de `_PROJ_OK` |
| `search_project_persons()` | Direct SQL | `tbPerson WHERE enabled=1 AND name LIKE %s` |
| `get_projects()` | `ProjectRepository` | `vwProject` com filtros |
| `get_project_team()` | `ProjectRepository` | `vwProjectTeam` filtrado por `project_id` |
| `get_project_by_id()` | `ProjectRepository` | `tbProject WHERE project_id = %s` |
| `save_project()` | `ProjectRepository` | `update_project()` ou `create_project()` → `insert()` |
| `save_project_team_member()` | `ProjectRepository` | `add_project_team_member()` ou `update_project_team_member()` |
| `delete_project_team_member()` | `ProjectRepository` | `remove_project_team_member()` |

> **Importante:** `get_departments()` e `get_resource_levels()` usam `get_db_connection()` direto, sem depender de `ProjectRepository`. Isso garante funcionamento mesmo se o arquivo `project_repository.py` não tiver sido atualizado no servidor.

### ProjectRepository — métodos (project_repository.py)

| Método | Tabela | Descrição |
|---|---|---|
| `get_project()` | `vwProject` | SELECT com filtros de customer e status |
| `get_project_team()` | `vwProjectTeam` | SELECT filtrado por project_id |
| `get_project_by_id()` | `tbProject` | SELECT por project_id |
| `insert()` | `tbProject` + `tbProjectOV` | Upsert completo com normalização de OV |
| `create_project()` | → `insert()` | Delegate para insert() |
| `update_project()` | `tbProject` + `tbProjectOV` | UPDATE + sync OV |
| `get_departments()` | `tbDepartment` | SELECT ordenado por nome |
| `get_resource_levels()` | `tbResourceLevel` | SELECT ordenado por nome |
| `add_project_team_member()` | `tbProjectTeam` | INSERT |
| `update_project_team_member()` | `tbProjectTeam` | UPDATE |
| `remove_project_team_member()` | `tbProjectTeam` | DELETE |
| `_normalize_project_ov()` | — | Remove espaços, normaliza POC/PSR |
| `_extract_individual_ovs()` | — | Split `_`, remove `#`, dedup |
| `_sync_tbprojectov()` | `tbProjectOV` | Insere OVs individuais faltantes |
| `_find_project_by_ovs()` | `tbProjectOV` | Busca project_id pelas OVs |

---

## 8. Database — Tabelas e Views

| Tabela/View | Papel |
|---|---|
| `tbProject` | Tabela principal de projetos (dados completos) |
| `tbProjectOV` | OVs individualizadas — N:1 com `tbProject` |
| `tbProjectTeam` | Membros da equipe por projeto |
| `tbDepartment` | Departamentos — fonte do select Owner |
| `tbResourceLevel` | Níveis de recurso — fonte do select Level |
| `tbPerson` | Pessoas — fonte da busca de membros |
| `vwProject` | View de leitura — join `tbProject` + `tbCompany` |
| `vwProjectTeam` | View da equipe — join `tbProjectTeam` + `tbPerson` + `tbDepartment` + `tbResourceLevel` |

### Campos de tbProjectTeam

| Campo | Tipo | Descrição |
|---|---|---|
| `projteam_id` | int PK AUTO_INCREMENT | ID do registro |
| `projteam_project_id` | int | FK → `tbProject.project_id` |
| `projteam_person_id` | int | FK → `tbPerson.person_id` |
| `projteam_department_id` | int | FK → `tbDepartment.department_id` |
| `projteam_level_id` | int | FK → `tbResourceLevel.level_id` |
| `projteam_technical_lead` | tinyint(1) | 1 = Technical Lead, 0 = não |
| `projteam_working_time` | int | Percentual de alocação (0-100) |
| `projteam_allocation_start` | date | Início da alocação |
| `projteam_allocation_end` | date | Término da alocação |

---

## 9. i18n

Chaves sob `projects.*` nos arquivos `frontend/src/i18n/locales/{lang}.json`:

| Chave | EN | PT | ES |
|---|---|---|---|
| `title` | Projects | Projetos | Proyectos |
| `subtitle` | Customer Projects Portfolio | Portfólio de Projetos... | Portafolio de Proyectos... |
| `allStatuses` | — All statuses — | — Todos os status — | — Todos los estados — |
| `addProject` | Add Project | Adicionar Projeto | Agregar Proyecto |
| `editProject` | Edit Project | Editar Projeto | Editar Proyecto |
| `selectCustomer` | Select a customer... | Selecione um cliente... | Seleccione un cliente... |
| `addTeamMember` | Add Member | Adicionar Membro | Agregar Miembro |
| `editTeamMember` | Edit Member | Editar Membro | Editar Miembro |
| `formLabelOv` | OV * | OV * | OV * |
| `formOvPlaceholder` | Ex: 52757 or #68924_#69056 | Ex: 52757 ou... | Ej: 52757 o... |
| `formLabelProjectName` | Project Name | Nome do Projeto | Nombre del Proyecto |
| `formLabelOwner` | Owner (Department) | Responsável (Departamento) | Responsable (Departamento) |
| `formLabelCustomer` | Customer | Cliente | Cliente |
| `formLabelMethodology` | Methodology | Metodologia | Metodología |
| `formSelectMethodology` | — Select methodology — | — Selecione a metodologia — | — Seleccione la metodología — |
| `formLabelAction` | Action | Ação | Acción |
| `formLabelDates` | Dates | Datas | Fechas |
| `formLabelDetails` | Project Details | Detalhes do Projeto | Detalles del Proyecto |
| `formLabelFinancial` | Financial | Financeiro | Financiero |

---

## 10. Troubleshooting

| Problema | Causa provável | Solução |
|---|---|---|
| CUSTOMER vazio | `GET /portfolio/account-team/companies` falhou | Ver logs; verificar `tbCompany` |
| OWNER (Dept) select vazio | Gunicorn não reiniciado após deploy | `sudo systemctl restart bridgeadoption-api` |
| LEVEL select vazio | Idem acima | `sudo systemctl restart bridgeadoption-api` |
| Formulário de edição com campos vazios | Dados já no cache `allProjects` de `vwProject` | Verificar `SELECT * FROM vwProject WHERE project_id = {id}` |
| "OV is required" ao salvar | Campo OV vazio | Preencher OV no formulário |
| Salvar projeto retorna erro 500 | `_PROJ_OK = False` — repositório não importado | Verificar `sudo journalctl -u bridgeadoption-api -n 100` |
| Membro não aparece após adicionar | Gunicorn usando código antigo | Reiniciar Gunicorn |
| Botões ✏️/➕ não aparecem | Usuário não tem role ADMIN | Verificar `tbUserRole` + `tbRole` no banco |
| Módulo não aparece no menu | `resource_key` sem permissão | `SELECT * FROM tbAuthResource WHERE resource_key = 'project.project'` |

### Comandos úteis

```bash
# Status do serviço
sudo systemctl status bridgeadoption-api

# Reiniciar
sudo systemctl restart bridgeadoption-api

# Logs em tempo real
sudo journalctl -u bridgeadoption-api -f

# Verificar projetos no banco
mysql -u user -p bridgeadoption -e "SELECT project_status, COUNT(*) FROM vwProject GROUP BY project_status;"

# Verificar tbProjectTeam
mysql -u user -p bridgeadoption -e "SELECT * FROM tbProjectTeam WHERE projteam_project_id = {id} LIMIT 10;"

# Verificar tbDepartment
mysql -u user -p bridgeadoption -e "SELECT COUNT(*) FROM tbDepartment;"

# Verificar tbResourceLevel
mysql -u user -p bridgeadoption -e "SELECT COUNT(*) FROM tbResourceLevel;"
```

---

## 11. Histórico de mudanças

| Data | Versão | Descrição |
|---|---|---|
| 2026-08-26 | 4.0 | **CRUD completo.** CUSTOMER dropdown passa a usar `list_available_companies()` (todos os clientes válidos). STATUS movido para dentro do header do PROJECT DETAIL. Formulário de projeto com ADMIN gate: edit/add com seções colapsáveis (Basic, Dates, Details, Financial), select Methodology, select Owner. `create_project()` delega para `insert()` com normalização OV + sync `tbProjectOV`. `update_project()` normaliza OV e sincroniza `tbProjectOV`. Team member management: add/edit/delete (ADMIN), `TeamMemberForm` com busca de pessoa, selects Department/Level, Technical Lead, Working Time, datas. `get_departments()` e `get_resource_levels()` reescritos com direct SQL sem dependência de `_PROJ_OK`. 4 novos métodos em `ProjectRepository`: `get_resource_levels`, `add/update/remove_project_team_member`. 9 novos endpoints. i18n: 16 novas chaves. |
| 2026-08-22 | 3.0 | Paginação (5/10/25/50). Botão "Clear all filters". Endpoint `/projects/account-team` com filtro `accountteam_allocated != 0`. i18n completo. |
| 2026-08-22 | 2.0 | CustomerSelect pesquisável. StatusSelect por cliente. Account Team panel. PROJECT DETAIL clicável. PROJECT TEAM lateral. Novo endpoint `GET /api/projects/customers`. |
| 2026-08-22 | 1.0 | Primeira implementação React. Pesquisa global, MultiSelect, paginação, StatusBadge, Export CSV. |
| — | — | `project.py` (Streamlit): placeholder "🚧 Page under construction 🚧" |
