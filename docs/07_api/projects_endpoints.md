# API — Projects Endpoints

> **Última atualização:** 2026-08-22 (v3: adicionado `/account-team`, correção Account Team)  
> **Router:** `backend/app/modules/sections_router.py` → `projects_router`  
> **Prefix:** `/api/projects`  
> **Service:** `backend/app/modules/sections_service.py` → `get_projects()`, `get_project_team()`  
> **Repositório:** `z:/bridgeadoption/src/infrastructure/database/repositories/project_repository.py`  
> **Autenticação:** JWT Bearer (todos os endpoints exigem token válido)  
> **Audiência:** Desenvolvimento e sustentação

---

## Endpoints

### `GET /api/projects/customers`

Retorna a lista de clientes únicos que possuem projetos (todos os status, sem filtro).  
Usado para popular o dropdown CUSTOMER na `ProjectsPage`.

#### Parâmetros de query

Nenhum.

#### Resposta — `200 OK`

```json
[
  { "project_customer_id": 213, "project_customer_name": "ACCENTURE" },
  { "project_customer_id": 38,  "project_customer_name": "ALELO S.A" }
]
```

#### Campos retornados

| Campo | Tipo | Descrição |
|---|---|---|
| `project_customer_id` | integer | ID do cliente em `tbCompany` |
| `project_customer_name` | string | Nome do cliente |

#### Respostas de erro

| Código | Descrição |
|---|---|
| `401` | Token JWT ausente ou expirado |
| `500` | Erro interno — view indisponível |

---

### `GET /api/projects/account-team`

Retorna os membros **alocados** (`accountteam_allocated != 0`) da equipe de conta para um cliente específico. Usado pelo painel **Account Team** na `ProjectsPage`.

> **Por que este endpoint e não `GET /api/portfolio/account-team`?**  
> O endpoint `/portfolio/account-team` usa `AccountTeamRepository.load_account_team()` que **não filtra por `accountteam_allocated`**, retornando todos os registros inclusive os não-alocados.  
> Este endpoint usa `find_all_df()` + filtro `accountteam_allocated != 0`, mesmo lógica do `AccountTeamPage` (matriz).

#### Parâmetros de query

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `customer_id` | `integer` | ✅ | ID do cliente (obrigatório) |

#### Resposta — `200 OK`

```json
[
  {
    "accountteam_id": 123,
    "accountteam_company_id": 213,
    "accountteam_person_type": "CSM",
    "accountteam_person_name": "VITÓRIA OLIVEIRA",
    "accountteam_allocated": 1
  },
  {
    "accountteam_id": 124,
    "accountteam_company_id": 213,
    "accountteam_person_type": "AM",
    "accountteam_person_name": "JOÃO SILVA",
    "accountteam_allocated": 1
  }
]
```

#### Campos relevantes

| Campo | Tipo | Descrição |
|---|---|---|
| `accountteam_person_type` | string | Tipo do membro: CSM, AM, CDM, DIR, etc. |
| `accountteam_person_name` | string | Nome do membro (`tbPerson.person_name`) |
| `accountteam_allocated` | integer | Valor diferente de 0 = alocado (filtro aplicado) |

> Colunas legadas normalizadas: `accountteam_user_type` → `accountteam_person_type`

#### Respostas de erro

| Código | Descrição |
|---|---|
| `401` | Token JWT ausente ou expirado |
| `422` | `customer_id` não fornecido |
| `500` | Erro interno |

---

### `GET /api/projects`

Retorna todos os projetos ativos da view `vwProject`.

#### Parâmetros de query

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `customer_id` | `integer` | ❌ | `null` | Filtrar por cliente específico. Se omitido, retorna todos os clientes. |

> **Nota sobre status:** o backend aplica automaticamente um filtro de status: `["Business Model", "In progress", "Not started", "Unidentified"]`. Projetos `Closed` e `Canceled` **não são retornados** por este endpoint.

#### Resposta — `200 OK`

```json
[
  {
    "project_id": 2511,
    "project_ov": "#68924_#69056",
    "project_owner": "PMO",
    "project_customer_id": 213,
    "project_customer_name": "ACCENTURE",
    "project_name": "PR3545970-05A265119 Aroei...",
    "project_ov_name": "(OV #68924_#69056) PR3545970-05A265119 Aroei...",
    "project_internalization_date": "2026-03-05",
    "project_status": "In progress"
  },
  {
    "project_id": 804,
    "project_ov": "81584_81901_86236_86662",
    "project_owner": "PMO",
    "project_customer_id": 74,
    "project_customer_name": "ACCIONA CONSTRUCCION SA",
    "project_name": "RTD EQUIPAMENTOS ATIVOS...",
    "project_ov_name": "(OV 81584_81901_86236_86662) RTD...",
    "project_internalization_date": "2023-10-16",
    "project_status": "In progress"
  }
]
```

#### Campos retornados

| Campo | Tipo | Descrição |
|---|---|---|
| `project_id` | integer | ID único do projeto em `tbProject` |
| `project_ov` | string | OV(s) do projeto — pode ser composta com `_` como separador |
| `project_owner` | string | Responsável (geralmente `PMO`) |
| `project_customer_id` | integer | FK para `tbCompany.company_id` |
| `project_customer_name` | string | Nome do cliente (`tbCompany.company_name`) |
| `project_name` | string | Nome descritivo do projeto |
| `project_ov_name` | string | Formato amigável: `(OV #XXXXX) Nome do Projeto` |
| `project_internalization_date` | string (ISO date) ou `null` | Data de internalização |
| `project_status` | string | Status atual do projeto |

> A view pode retornar campos adicionais (resultado de `SELECT *`). Campos não listados aqui são serializa dos normalmente.

#### Respostas de erro

| Código | Descrição |
|---|---|
| `401` | Token JWT ausente, inválido ou expirado |
| `500` | Erro interno — view indisponível, banco sem conexão, importação de repositório falhou |

---

### `GET /api/projects/{project_id}/team`

Retorna a equipe de um projeto específico a partir da view `vwProjectTeam`.

#### Parâmetros de path

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `project_id` | `integer` | ✅ | ID do projeto |

#### Resposta — `200 OK`

```json
[
  {
    "projteam_project_id": 2511,
    "projteam_project_customer_id": 213,
    "projteam_project_customer_name": "ACCENTURE",
    "projteam_project_status": "In progress",
    "projteam_person_name": "JOÃO SILVA",
    "projteam_person_role": "CSM",
    "projteam_person_email": "joao.silva@nttdata.com"
  }
]
```

> **Nota:** Os campos exatos dependem da definição de `vwProjectTeam` no banco. O retorno é `SELECT *` filtrado por `project_id`.

#### Respostas de erro

| Código | Descrição |
|---|---|
| `401` | Token JWT ausente ou inválido |
| `404` | Projeto não encontrado (retorna lista vazia `[]`) |
| `500` | Erro interno |

---

## Fluxo de dados

```
Frontend (ProjectsPage.tsx)
  │
  └── useQuery(["projects-portfolio"])
        └── GET /api/projects
              └── sections_service.get_projects(customer_id=None)
                    └── ProjectRepository.get_project(
                          customer_id=None,
                          project_status=["Business Model", "In progress",
                                          "Not started", "Unidentified"]
                        )
                          └── SELECT * FROM vwProject
                              [WHERE project_customer_id = %s]  ← se customer_id informado
                              AND project_status IN (...)
                              ORDER BY project_customer_name, project_id
```

---

## Implementação do Router

```python
# backend/app/modules/sections_router.py

projects_router = APIRouter(prefix="/api/projects", tags=["projects"])

@projects_router.get("", response_model=List[Dict[str, Any]])
def list_projects(
    current_user: Annotated[dict, Depends(get_current_user)],
    customer_id: Optional[int] = Query(None),
):
    return get_projects(customer_id=customer_id)

@projects_router.get("/{project_id}/team", response_model=List[Dict[str, Any]])
def project_team(
    project_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    return get_project_team(project_id)
```

O router é registrado em `backend/app/main.py`:
```python
from app.modules.sections_router import projects_router
app.include_router(projects_router)
```

---

## Permissões (`tbAuthResource`)

| `resource_key` | Módulo | Permissão mínima |
|---|---|---|
| `project.project` | Módulo Projects — acesso à listagem completa | `READ` |

### Verificar no banco

```sql
SELECT resource_key, resource_name, resource_is_active
FROM tbAuthResource
WHERE resource_key = 'project.project';
```

### Verificar roles de um usuário

```sql
SELECT u.user_name, r.role_name, p.resource_key
FROM tbUser u
JOIN tbUserRole ur ON ur.userrole_user_id = u.user_id
JOIN tbRole r ON r.role_id = ur.userrole_role_id
JOIN tbRolePermission rp ON rp.roleperm_role_id = r.role_id
JOIN tbAuthResource p ON p.resource_id = rp.roleperm_resource_id
WHERE u.user_email = 'usuario@empresa.com'
  AND p.resource_key = 'project.project';
```

---

## Banco de Dados — Fontes

### View `vwProject`

```sql
-- Verificar existência
SHOW TABLES LIKE 'vwProject';

-- Inspecionar definição
SHOW CREATE VIEW vwProject\G

-- Contar por status
SELECT project_status, COUNT(*) AS total
FROM vwProject
GROUP BY project_status
ORDER BY total DESC;

-- Verificar projetos por cliente
SELECT project_customer_name, COUNT(*) AS total
FROM vwProject
GROUP BY project_customer_name
ORDER BY total DESC
LIMIT 20;
```

### Tabelas base

```sql
-- tbProject — dados principais
SELECT project_id, project_ov, project_owner, project_customer_id,
       project_name, project_status, project_internalization_date
FROM tbProject
WHERE project_ov NOT LIKE 'VAGO%'
LIMIT 10;

-- tbProjectOV — OVs individuais (relação N:1 com tbProject)
SELECT ov_id, ov_project_id, ov_project_ov
FROM tbProjectOV
WHERE ov_project_id > 0
LIMIT 10;
```

---

## Configuração e Deploy

### Registrar o router

O `projects_router` já está registrado em `backend/app/main.py`. Nenhuma configuração adicional é necessária.

### Reiniciar backend após alterações

```bash
# Reiniciar serviço Gunicorn
sudo systemctl restart bridgeadoption-api

# Graceful reload (sem downtime)
sudo kill -HUP $(cat /var/run/bridgeadoption-api.pid)

# Verificar status
sudo systemctl status bridgeadoption-api

# Ver logs em tempo real
sudo journalctl -u bridgeadoption-api -f
```

### Verificar endpoint via curl

```bash
# Listar todos os projetos
curl -X GET "http://172.30.100.3/bridgeadoption/api/projects" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Accept: application/json" | python3 -m json.tool | head -50

# Filtrar por cliente
curl -X GET "http://172.30.100.3/bridgeadoption/api/projects?customer_id=213" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Accept: application/json"

# Equipe de um projeto
curl -X GET "http://172.30.100.3/bridgeadoption/api/projects/2511/team" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Accept: application/json"

# Verificar health da API
curl http://172.30.100.3/bridgeadoption/api/health
```

### Verificar no Swagger UI

Acesse `http://172.30.100.3/bridgeadoption/api/docs` → seção **projects**.

---

## Troubleshooting

| Problema | Verificação | Solução |
|---|---|---|
| `GET /api/projects` retorna `[]` | `ProjectRepository` não importado | Verificar: `_PROJ_OK` em `sections_service.py` — se `False`, `ProjectRepository` falhou no import |
| `GET /api/projects` retorna 500 | View inexistente ou banco sem conexão | Executar `SELECT 1 FROM vwProject LIMIT 1;` no banco |
| Projeto específico não aparece | Status fora do filtro padrão | Verificar `project_status` em `tbProject` — status `Closed`/`Canceled` são filtrados |
| `_PROJ_OK = False` no log | `ProjectRepository` não encontrado no path Python | Verificar `sys.path` em `sections_service.py`: `_ROOT = "/opt/bridgeadoption"` |
| Endpoint `/team` retorna `[]` | Sem registros em `vwProjectTeam` para o `project_id` | Verificar: `SELECT * FROM vwProjectTeam WHERE projteam_project_id = {id}` |
| 401 em todas as chamadas | Token JWT inválido ou expirado | Verificar `Authorization: Bearer {TOKEN}` — refazer login |

### Debug do import do repositório

```python
# Testar diretamente no servidor (Python REPL)
import sys
sys.path.insert(0, "/opt/bridgeadoption")
from src.infrastructure.database.repositories.project_repository import ProjectRepository
repo = ProjectRepository()
df = repo.get_project(project_status=["In progress"], as_df=True)
print(df.shape, df.columns.tolist())
```

---

## Histórico de mudanças

| Data | Versão | Descrição |
|---|---|---|
| 2026-08-22 | 3.0 | Adicionado endpoint `GET /api/projects/account-team` com filtro `accountteam_allocated != 0`. Corrige o problema de Account Team vazio na UI (o endpoint `/portfolio/account-team` não aplicava esse filtro). |
| 2026-08-22 | 2.0 | Adicionado `GET /api/projects/customers`. `GET /api/projects?customer_id=X` agora retorna todos os status (sem filtro padrão). |
| 2026-08-22 | 1.0 | Documentação criada. Endpoints `GET /api/projects` e `GET /api/projects/{id}/team` já existentes no `sections_router.py`. Frontend migrado de `DataTablePage` genérico para `ProjectsPage.tsx` completo. |
