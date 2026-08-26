# API — Projects Endpoints

> **Última atualização:** 2026-08-26 (v4: CRUD completo + team member management)  
> **Router:** `backend/app/modules/sections_router.py` → `projects_router`  
> **Prefix:** `/api/projects`  
> **Service:** `backend/app/modules/sections_service.py`  
> **Repositório:** `z:/bridgeadoption/src/infrastructure/database/repositories/project_repository.py`  
> **Autenticação:** JWT Bearer (todos os endpoints exigem token válido)  
> **Audiência:** Desenvolvimento e sustentação

---

## Índice de endpoints

| Método | Path | Permissão | Descrição |
|---|---|---|---|
| `GET` | `/api/projects/customers` | Qualquer | Clientes com projetos (legado) |
| `GET` | `/api/projects/account-team` | Qualquer | Account Team alocado do cliente |
| `GET` | `/api/projects/departments` | Qualquer | Departamentos para select Owner |
| `GET` | `/api/projects/levels` | Qualquer | Níveis de recurso para select Level |
| `GET` | `/api/projects/persons` | Qualquer | Busca de pessoas para equipe |
| `GET` | `/api/projects` | Qualquer | Listagem de projetos |
| `POST` | `/api/projects` | Qualquer | Criar projeto |
| `GET` | `/api/projects/{id}/detail` | Qualquer | Detalhe de um projeto (tbProject) |
| `PUT` | `/api/projects/{id}` | Qualquer | Atualizar projeto |
| `GET` | `/api/projects/{id}/team` | Qualquer | Equipe do projeto |
| `POST` | `/api/projects/{pid}/team-member` | **ADMIN** | Adicionar membro à equipe |
| `PUT` | `/api/projects/team-member/{id}` | **ADMIN** | Atualizar membro da equipe |
| `DELETE` | `/api/projects/team-member/{id}` | **ADMIN** | Remover membro da equipe |

> **Nota CUSTOMER:** O frontend v4 usa `GET /api/portfolio/account-team/companies` (não este router) para popular o CUSTOMER dropdown. O endpoint `/api/projects/customers` continua disponível por compatibilidade mas não é mais o primário.

---

## GET /api/projects/customers

Retorna clientes únicos que possuem projetos. **Legado** — o frontend v4 usa `GET /api/portfolio/account-team/companies`.

```json
[
  { "project_customer_id": 213, "project_customer_name": "ACCENTURE" }
]
```

---

## GET /api/projects/account-team

Retorna membros **alocados** (`accountteam_allocated != 0`) para um cliente.

**Query params:** `customer_id` (int, obrigatório)

```json
[
  {
    "accountteam_person_type": "CSM",
    "accountteam_person_name": "VITÓRIA OLIVEIRA",
    "accountteam_allocated": 1
  }
]
```

> Usa `find_all_df()` + filtro `accountteam_allocated != 0`.  
> Colunas legadas normalizadas: `accountteam_user_type` → `accountteam_person_type`

---

## GET /api/projects/departments

Retorna departamentos para o select **Owner (Department)** no formulário de projeto.

**Implementação:** Direct SQL em `sections_service.get_departments()` — não depende de `_PROJ_OK`. Funciona após Gunicorn restart independente do estado do `project_repository.py`.

```json
[
  { "department_id": 1, "department_name": "Architecture" },
  { "department_id": 15, "department_name": "Pre Sales" },
  { "department_id": 3, "department_name": "PMO" }
]
```

**Query executada:**
```sql
SELECT department_id, department_name
FROM tbDepartment
WHERE department_name IS NOT NULL AND department_name <> ''
ORDER BY department_name
```

| Código | Descrição |
|---|---|
| `200` | Lista de departamentos (pode ser `[]` se tabela vazia) |
| `401` | Token ausente ou expirado |
| `500` | Erro de banco de dados |

---

## GET /api/projects/levels

Retorna níveis de recurso para o select **Level** no formulário de membro da equipe.

**Implementação:** Direct SQL em `sections_service.get_resource_levels()` — não depende de `_PROJ_OK`.

```json
[
  { "level_id": 5, "level_name": "Analyst", "level_type": "Technical" },
  { "level_id": 12, "level_name": "Consultant", "level_type": "Technical" },
  { "level_id": 8, "level_name": "Manager", "level_type": "Management" }
]
```

**Query executada:**
```sql
SELECT level_id, level_name, level_type
FROM tbResourceLevel
WHERE level_name IS NOT NULL AND level_name <> ''
ORDER BY level_name
```

| Código | Descrição |
|---|---|
| `200` | Lista de níveis (≈67 registros esperados) |
| `401` | Token ausente ou expirado |

---

## GET /api/projects/persons

Busca pessoas para o campo **Person** no formulário de membro da equipe.

**Query params:** `search` (string, opcional)

- Mínimo 2 caracteres recomendado (frontend aplica `enabled: search.length >= 2`)
- Busca em `person_name` E `person_email` (LIKE `%search%`)
- Retorna no máximo 50 resultados quando search informado; 100 quando vazio

```json
[
  {
    "person_id": 123,
    "person_name": "RENAN FERNANDES",
    "person_email": "renan.fernandes@nttdata.com",
    "person_job_title": "Senior Consultant"
  }
]
```

**Query executada:**
```sql
SELECT person_id, person_name, person_email, person_job_title
FROM tbPerson
WHERE person_enabled = 1
  AND (person_name LIKE %s OR person_email LIKE %s)
ORDER BY person_name
LIMIT 50
```

---

## GET /api/projects

Retorna projetos da view `vwProject`.

**Query params:** `customer_id` (int, opcional)

**Comportamento por filtro de status:**

| Cenário | Status retornados |
|---|---|
| Sem `customer_id` | `Business Model`, `In progress`, `Not started`, `Unidentified` |
| Com `customer_id` | **Todos** — sem filtro de status |

```json
[
  {
    "project_id": 2511,
    "project_ov": "#68924_#69056",
    "project_owner": "PMO",
    "project_customer_id": 213,
    "project_customer_name": "ACCENTURE",
    "project_name": "PR3545970-05A265119 Aroei...",
    "project_status": "In progress",
    "project_start_date": "2025-01-15",
    "project_end_date": "2026-03-05",
    "project_methodology": "Agile",
    "project_description": "...",
    "project_scope": "..."
  }
]
```

> A view retorna `SELECT *` — inclui todos os campos de `tbProject` além dos campos calculados.

---

## POST /api/projects

Cria um novo projeto. Delega para `ProjectRepository.insert()` que implementa upsert completo com normalização de OV.

**Request body:**
```json
{
  "project_ov": "52757",
  "project_customer_id": 213,
  "project_customer_name": "ACCENTURE",
  "project_name": "Projeto Exemplo",
  "project_owner": "PMO",
  "project_status": "Not started",
  "project_methodology": "Agile",
  "project_start_date": "2026-01-01",
  "project_end_date": "2026-12-31"
}
```

**Campos obrigatórios:** `project_ov`, `project_customer_id`

**Comportamento de OV:**
1. Normaliza `project_ov` (remove espaços, POC/PSR → uppercase)
2. Busca projeto existente pelas OVs individuais em `tbProjectOV`
3. Se existir → atualiza; se não → insere em slot vago ou cria novo
4. Sincroniza `tbProjectOV` com as OVs individualizadas

**Resposta `200`:**
```json
{ "project_id": 2600, "success": true }
```

**Resposta de erro `400`:**
```json
{ "error": "Failed to create project — check required fields (project_ov, project_customer_id)" }
```

| Código | Descrição |
|---|---|
| `200` | Projeto criado com sucesso |
| `400` | Campos obrigatórios ausentes |
| `401` | Token ausente |
| `500` | Erro de banco |

---

## GET /api/projects/{project_id}/detail

Retorna um único registro de `tbProject` para o formulário de edição.

> **Nota:** O frontend v4 usa primariamente os dados já carregados do cache `allProjects` (de `GET /api/projects?customer_id=X`). Este endpoint é usado como **fallback** quando o projeto não está no cache.

**Resposta `200`:**
```json
{
  "project_id": 2511,
  "project_ov": "#68924_#69056",
  "project_name": "PR3545970-05A265119 Aroei...",
  "project_owner": "PMO",
  "project_status": "In progress",
  "project_methodology": "Agile",
  "project_description": "Descrição completa...",
  "project_scope": "Escopo...",
  "project_total_amount": 150000.00,
  "project_currency": "BRL"
}
```

| Código | Descrição |
|---|---|
| `200` | Projeto encontrado |
| `404` | Projeto não encontrado |
| `401` | Token ausente |

---

## PUT /api/projects/{project_id}

Atualiza campos de um projeto existente em `tbProject`.

**Request body** (qualquer subconjunto dos campos editáveis):
```json
{
  "project_name": "Novo nome",
  "project_status": "In progress",
  "project_methodology": "Scrum",
  "project_end_date": "2026-12-31"
}
```

**Campos editáveis (whitelist):** `project_ov`, `project_name`, `project_owner`, `project_customer_name`, `project_status`, `project_methodology`, `project_action`, `project_description`, `project_scope`, `project_objectives`, `project_current_scenario`, `project_key_feature_products`, `project_justification`, `project_remark`, `project_sprint_timebox`, `project_currency`, `project_total_amount`, `project_total_amount_brl`, `project_planned_cost_*`, `project_cost_final_value_brl`, `project_internalization_date`, `project_start_date`, `project_end_date`

**Se `project_ov` incluído:** normaliza e sincroniza `tbProjectOV`.

**Resposta `200`:**
```json
{ "project_id": 2511, "success": true }
```

---

## GET /api/projects/{project_id}/team

Retorna a equipe de um projeto da view `vwProjectTeam`.

```json
[
  {
    "projteam_id": 73,
    "projteam_project_id": 2511,
    "projteam_member_name": "RENAN FERNANDES",
    "projteam_level_name": "Senior Consultant",
    "projteam_department_name": "Pre Sales",
    "projteam_technical_lead": 0,
    "projteam_working_time": 100,
    "projteam_allocation_start": "2025-12-08",
    "projteam_allocation_end": "2025-06-05"
  }
]
```

---

## POST /api/projects/{project_id}/team-member

Adiciona um membro à equipe do projeto. **Requer role ADMIN.**

**Request body:**
```json
{
  "projteam_person_id": 123,
  "projteam_department_id": 15,
  "projteam_level_id": 12,
  "projteam_technical_lead": 0,
  "projteam_working_time": 100,
  "projteam_allocation_start": "2026-01-01",
  "projteam_allocation_end": "2026-12-31"
}
```

**Campo obrigatório:** `projteam_person_id`

**Campos aceitos (whitelist):** `projteam_person_id`, `projteam_department_id`, `projteam_level_id`, `projteam_technical_lead`, `projteam_working_time`, `projteam_allocation_start`, `projteam_allocation_end`

**Resposta `200`:**
```json
{ "projteam_id": 84, "success": true }
```

| Código | Descrição |
|---|---|
| `200` | Membro adicionado |
| `400` | `projteam_person_id` ausente |
| `403` | Role ADMIN necessária |
| `401` | Token ausente |

---

## PUT /api/projects/team-member/{projteam_id}

Atualiza um membro da equipe. **Requer role ADMIN.**

**Request body** (qualquer subconjunto dos campos editáveis):
```json
{
  "projteam_level_id": 15,
  "projteam_technical_lead": 1,
  "projteam_allocation_end": "2026-06-30"
}
```

**Resposta `200`:**
```json
{ "projteam_id": 84, "success": true }
```

| Código | Descrição |
|---|---|
| `200` | Membro atualizado |
| `403` | Role ADMIN necessária |
| `401` | Token ausente |

---

## DELETE /api/projects/team-member/{projteam_id}

Remove um membro da equipe (`DELETE FROM tbProjectTeam`). **Requer role ADMIN.**

**Resposta `200`:**
```json
{ "success": true }
```

| Código | Descrição |
|---|---|
| `200` | Membro removido |
| `403` | Role ADMIN necessária |
| `401` | Token ausente |

---

## Fluxo de dados — Criar/Editar Projeto

```
Frontend (ProjectsPage.tsx)
  │
  ├── saveMut.mutate({ id: null, data })    → POST /api/projects
  │     └── save_project(None, data)
  │           └── ProjectRepository.create_project(data)
  │                 └── insert(data)
  │                       ├── _normalize_project_ov()
  │                       ├── _find_project_by_ovs() → tbProjectOV
  │                       ├── _update_tbproject_if_needed() ou _insert_new_tbproject()
  │                       └── _sync_tbprojectov() → tbProjectOV
  │
  └── saveMut.mutate({ id: 2511, data })   → PUT /api/projects/2511
        └── save_project(2511, data)
              └── ProjectRepository.update_project(2511, data)
                    ├── _normalize_project_ov()  [se project_ov no payload]
                    ├── UPDATE tbProject SET ... WHERE project_id = 2511
                    └── _sync_tbprojectov()      [se project_ov alterada]
```

## Fluxo de dados — Team Member

```
Frontend (TeamMemberForm)
  │
  ├── saveTeamMut({ projteamId: null, projectId: 2511, data })
  │     → POST /api/projects/2511/team-member
  │           └── save_project_team_member(2511, None, data)
  │                 └── ProjectRepository.add_project_team_member(2511, data)
  │                       └── INSERT INTO tbProjectTeam (projteam_project_id, ...) VALUES (...)
  │
  ├── saveTeamMut({ projteamId: 73, projectId: 2511, data })
  │     → PUT /api/projects/team-member/73
  │           └── save_project_team_member(0, 73, data)
  │                 └── ProjectRepository.update_project_team_member(73, data)
  │                       └── UPDATE tbProjectTeam SET ... WHERE projteam_id = 73
  │
  └── deleteTeamMut(73)
        → DELETE /api/projects/team-member/73
              └── delete_project_team_member(73)
                    └── ProjectRepository.remove_project_team_member(73)
                          └── DELETE FROM tbProjectTeam WHERE projteam_id = 73
```

---

## Deploy — Checklist após alterações

### Arquivos que requerem deploy no servidor

| Arquivo | Servidor | Precisa Gunicorn restart? |
|---|---|---|
| `backend/app/modules/sections_service.py` | `/opt/bridge-adoption-react/backend/` | ✅ Sim |
| `backend/app/modules/sections_router.py` | `/opt/bridge-adoption-react/backend/` | ✅ Sim |
| `z:\bridgeadoption\src\...\project_repository.py` | `/opt/bridgeadoption/src/.../` | ✅ Sim |
| `frontend/src/pages/projects/ProjectsPage.tsx` | Build estático (`npm run build`) | ❌ Build só |

### Ordem de deploy

```bash
# 1. Copiar arquivos do backend React
cp backend/app/modules/sections_service.py /opt/bridge-adoption-react/backend/app/modules/
cp backend/app/modules/sections_router.py  /opt/bridge-adoption-react/backend/app/modules/

# 2. Copiar project_repository.py (Streamlit/legacy path)
cp src/infrastructure/.../project_repository.py /opt/bridgeadoption/src/infrastructure/.../

# 3. Reiniciar Gunicorn
sudo systemctl restart bridgeadoption-api

# 4. Verificar startup sem erros
sudo journalctl -u bridgeadoption-api -n 50

# 5. Testar endpoints críticos
curl -H "Authorization: Bearer {TOKEN}" http://172.30.100.3/bridgeadoption/api/projects/departments
curl -H "Authorization: Bearer {TOKEN}" http://172.30.100.3/bridgeadoption/api/projects/levels

# 6. Build do frontend
cd frontend && npm run build
```

### Verificação após deploy

```bash
# departments deve retornar lista com registros de tbDepartment
curl -s "http://172.30.100.3/bridgeadoption/api/projects/departments" \
  -H "Authorization: Bearer {TOKEN}" | python3 -m json.tool | head -20

# levels deve retornar ≈67 níveis de tbResourceLevel
curl -s "http://172.30.100.3/bridgeadoption/api/projects/levels" \
  -H "Authorization: Bearer {TOKEN}" | python3 -m json.tool | head -20

# persons com busca
curl -s "http://172.30.100.3/bridgeadoption/api/projects/persons?search=silva" \
  -H "Authorization: Bearer {TOKEN}" | python3 -m json.tool
```

---

## Troubleshooting

| Problema | Causa | Solução |
|---|---|---|
| `GET /departments` retorna `[]` | Gunicorn não reiniciado | `sudo systemctl restart bridgeadoption-api` |
| `GET /levels` retorna `[]` | Idem | Idem |
| `POST /projects` retorna `500` | `_PROJ_OK = False` | Verificar import do `ProjectRepository` nos logs |
| `POST /projects` retorna `400` | `project_ov` ou `project_customer_id` ausente | Verificar request body |
| `POST /team-member` retorna `403` | Usuário sem role ADMIN | Verificar roles no banco: `tbUserRole`, `tbRole` |
| `PUT /team-member/{id}` não atualiza | `projteam_id` errado | Verificar `projteam_id` via `GET /{project_id}/team` |
| OV duplicada na tbProjectOV | Bug no `_sync_tbprojectov` | Verificar `UNIQUE KEY` na `tbProjectOV` |

### Verificar no banco

```sql
-- Departamentos cadastrados
SELECT COUNT(*), department_name FROM tbDepartment GROUP BY department_name LIMIT 5;

-- Níveis cadastrados
SELECT COUNT(*) FROM tbResourceLevel;

-- Equipe de um projeto
SELECT pt.*, p.person_name, d.department_name, l.level_name
FROM tbProjectTeam pt
LEFT JOIN tbPerson p ON p.person_id = pt.projteam_person_id
LEFT JOIN tbDepartment d ON d.department_id = pt.projteam_department_id
LEFT JOIN tbResourceLevel l ON l.level_id = pt.projteam_level_id
WHERE pt.projteam_project_id = 2511;

-- OVs de um projeto
SELECT * FROM tbProjectOV WHERE ov_project_id = 2511;

-- Verificar se _PROJ_OK seria True no servidor
SELECT 1 FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'bridgeadoption' AND TABLE_NAME = 'tbProject';
```

---

## Histórico de mudanças

| Data | Versão | Descrição |
|---|---|---|
| 2026-08-26 | 4.0 | **CRUD completo.** Novos endpoints: `GET /departments`, `GET /levels`, `GET /persons`, `GET /{id}/detail`, `POST /` (create), `PUT /{id}` (update), `POST /{pid}/team-member`, `PUT /team-member/{id}`, `DELETE /team-member/{id}`. `get_departments()` e `get_resource_levels()` reescritos com direct SQL sem `_PROJ_OK`. Checklist de deploy atualizado. |
| 2026-08-22 | 3.0 | Adicionado `GET /account-team` com filtro `accountteam_allocated != 0`. |
| 2026-08-22 | 2.0 | Adicionado `GET /customers`. `GET` com `customer_id` retorna todos os status. |
| 2026-08-22 | 1.0 | Documentação criada. `GET /` e `GET /{id}/team`. |
