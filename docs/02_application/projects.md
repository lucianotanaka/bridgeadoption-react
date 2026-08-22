# Módulo Projects — Bridge Adoption React

> **Última atualização:** 2026-08-22  
> **Rota:** `/projects`  
> **resource_key:** `project.project`  
> **Arquivo frontend:** `frontend/src/pages/projects/ProjectsPage.tsx`  
> **Status:** ✅ Migrado para React — 2026-08-22 (v3: paginação, clear filters, i18n)  
> **Audiência:** Desenvolvimento e sustentação

---

## 1. Propósito

Portfólio de projetos de clientes (**Customer Projects Portfolio**). Permite que o time de PMO e gestores visualizem os projetos de um cliente específico com a equipe do projeto.

> **Histórico:** Streamlit era placeholder. A implementação React replica o comportamento do formulário **MS Access PROJECT**, que é o padrão de referência do sistema legado. A v2 (2026-08-22) redesenhou completamente a página seguindo o MS Access.

### Fluxo de uso (padrão MS Access)

```
1. Usuário seleciona CUSTOMER no dropdown pesquisável
2. Sistema carrega ACCOUNT TEAM do cliente (todos os membros)
3. STATUS dropdown é populado com os status disponíveis para esse cliente
4. Tabela PROJECT DETAIL exibe os projetos filtrados
5. Ao clicar em uma linha, a tabela PROJECT TEAM exibe a equipe do projeto
```

---

## 2. Fonte de Dados

| Fonte | Descrição |
|---|---|
| `vwProject` | View principal — une `tbProject`, `tbProjectOV` e `tbCompany` |
| `vwProjectTeam` | View complementar — equipe do projeto (endpoint separado) |
| `ProjectRepository.get_project()` | Executa `SELECT * FROM vwProject` com filtros opcionais |

### Filtro padrão de status (backend)

O serviço aplica automaticamente um filtro de status se nenhum for informado:

```python
status_list = status or ["Business Model", "In progress", "Not started", "Unidentified"]
```

Portanto, projetos com status `Closed` e `Canceled` **não aparecem** na listagem padrão.

### Colunas retornadas por `vwProject`

| Campo | Tipo | Descrição |
|---|---|---|
| `project_id` | integer | ID único do projeto |
| `project_ov` | string | OV(s) do projeto (pode conter múltiplas, separadas por `_`) |
| `project_owner` | string | Responsável pelo projeto (default: `PMO`) |
| `project_customer_id` | integer | ID do cliente em `tbCompany` |
| `project_customer_name` | string | Nome do cliente |
| `project_name` | string | Nome descritivo do projeto |
| `project_ov_name` | string | Nome completo formatado `(OV #XXXXX) Nome...` |
| `project_internalization_date` | date | Data de internalização do projeto |
| `project_status` | string | Status atual do projeto |

> **Nota:** A view retorna `SELECT *` — outros campos podem existir dependendo da versão do banco. Colunas adicionais não documentadas aqui são exibidas como texto simples na tabela.

---

## 3. Componentes da Interface

### 3.1 Cabeçalho

- **Título:** "Projects" / "Projetos" / "Proyectos" (i18n)
- **Subtítulo:** "Customer Projects Portfolio"
- ~~Botão Refresh~~ — **removido na v3**

### 3.2 Filtros (painel superior)

#### CUSTOMER — searchable single-select
- Dropdown pesquisável com todos os clientes que têm projetos (qualquer status)
- Fonte: `GET /api/projects/customers` → `vwProject DISTINCT customer`
- Ao limpar (✕), reseta STATUS, PROJECT DETAIL e PROJECT TEAM
- Ao mudar cliente: reseta STATUS e PROJECT TEAM automaticamente

#### STATUS — single-select nativo
- Desabilitado até um CUSTOMER ser selecionado
- Opções derivadas dinamicamente dos projetos do cliente selecionado
- Inclui **todos os status** (Closed, Canceled, etc.) — sem filtro padrão
- Opção padrão `t("projects.allStatuses")` → "— All statuses —" para exibir todos
- Ao mudar STATUS: reseta PROJECT TEAM

#### CLEAR FILTERS — botão (padrão das outras páginas)
Aparece quando `selectedCustomer !== null` OU `selectedStatus !== ""`.

- Estilo: vermelho com borda, hover com background, ícone `X` (lucide)
- Ação: reseta `selectedCustomer`, `selectedStatus`, `selectedProjectId`, `page`
- Usa `t("common.clearFilters")` para i18n
- Idêntico ao padrão de `AdoptionInitiativesPage`, `AssetPage`

### 3.3 Account Team panel

Exibido imediatamente abaixo dos filtros quando um cliente está selecionado.

- Carregado via `GET /api/projects/account-team?customer_id=X` ← endpoint dedicado
  - **Não usa** `GET /api/portfolio/account-team` (esse endpoint não filtra `accountteam_allocated != 0`)
  - O endpoint `/projects/account-team` usa `find_all_df()` + filtro `accountteam_allocated != 0`
- Exibe **todos os membros alocados** (AM, CDM, CSM, DIR, etc.) como badges:
  ```
  [AM] João Silva   [CSM] Maria Oliveira   [DIR] Pedro Alves
  ```
- Cada badge: **tipo** (negrito azul) + **nome** (texto)
- Mensagem "No account team members found" quando vazio

### 3.4 PROJECT DETAIL table (esquerda, proporção 3fr)

| Coluna | Campo | Tratamento especial |
|---|---|---|
| OV | `project_ov` | Monospace, sem wrap |
| Project Name | `project_name` | Truncado (max-width 220px) + tooltip title |
| Status | `project_status` | Badge colorido (`StatusBadge`) |
| Start | `project_start_date` | ISO date truncado para 10 chars |
| End | `project_end_date` | ISO date truncado para 10 chars |

- **Clicável:** linha clicável quando `project_id > 0`
- **Seleção:** linha selecionada fica com fundo azul (`bg-blue-50`)
- **Toggle:** clicar na mesma linha desseleciona (fecha PROJECT TEAM)
- Hint `t("projects.clickRowHint")` exibido quando nenhum projeto selecionado

#### Paginação (adicionada na v3)

| Configuração | Valor |
|---|---|
| **Default** | **5 linhas por página** |
| Opções | 5 / 10 / 25 / 50 |
| Controles | «‹ páginas numeradas ›» + seletor per page + contador |
| Stale reset | Automático ao mudar customer ou status (volta para p.1) |
| i18n | `t("common.showing")`, `t("common.of")`, `t("common.perPage")` |

#### Cores dos badges de status

| Status contém | Cor |
|---|---|
| "in progress" / "started" | 🔵 Azul |
| "business model" | 🟣 Roxo |
| "unidentified" | ⚪ Cinza |
| "closed" / "cancel" | 🔴 Vermelho |
| "complete" / "done" | 🟢 Verde |
| Outros | 🟡 Âmbar |

### 3.5 PROJECT TEAM table (direita, proporção 2fr)

Exibida ao lado da PROJECT DETAIL. Carregada ao clicar em uma linha do PROJECT DETAIL.

| Coluna | Campo | Tratamento especial |
|---|---|---|
| Name | `projteam_member_name` | Badge **Lead** amarelo se `projteam_technical_lead = 1` |
| Type | `projteam_level_name` | Nível/função do membro |
| Dept | `projteam_department_name` | Departamento |
| Start | `projteam_allocation_start` | Data de início da alocação |
| End | `projteam_allocation_end` | Data de término da alocação |

- Estado vazio: placeholder com ícone e texto orientativo
- Loading: spinner animado
- Fonte: `GET /api/projects/{project_id}/team` → `vwProjectTeam`

---

## 4. Regras de Negócio

### 4.1 Filtro de status (backend — v2)

**Comportamento por contexto:**

| Cenário | Filtro aplicado |
|---|---|
| `GET /api/projects` (sem customer_id) | Apenas `["Business Model", "In progress", "Not started", "Unidentified"]` |
| `GET /api/projects?customer_id=X` | **Todos os status** — nenhum filtro aplicado |
| `GET /api/projects/customers` | Todos os clientes com qualquer status |

A UI exibe todos os status do cliente no dropdown STATUS, incluindo Closed e Canceled.

### 4.2 Ordenação

Os dados chegam ordenados da query:
```sql
ORDER BY project_customer_name, project_id
```

### 4.3 OV composta

Um projeto pode ter múltiplas OVs no campo `project_ov`, separadas por `_` (ex: `81584_81901_86236_86662`).

### 4.4 Toggle de seleção

Clicar na mesma linha do PROJECT DETAIL que já está selecionada **deseleciona** (fecha PROJECT TEAM).

---

## 5. Autorização (RBAC)

| Ação | resource_key | Permissão mínima |
|---|---|---|
| Visualizar o módulo | `project.project` | `READ` |

### Verificar no banco

```sql
SELECT resource_key, resource_name, resource_is_active
FROM tbAuthResource
WHERE resource_key = 'project.project';
```

---

## 6. Arquitetura Frontend

```
frontend/src/pages/projects/
└── ProjectsPage.tsx        ← componente único (self-contained)

Importações-chave:
  - @/api/client (apiClient) → 4 endpoints (customers, projects, account-team, team)
  - react-i18next → t("projects.*"), t("common.*"), t("errors.*")
  - @tanstack/react-query → useQuery (4 queries)
  - lucide-react → Users, FolderOpen, X (Refresh removido na v3)
```

### Estados React

| Estado | Tipo | Descrição |
|---|---|---|
| `selectedCustomer` | `ProjectCustomer \| null` | Cliente selecionado no dropdown |
| `selectedStatus` | `string` | Status selecionado (`""` = todos) |
| `selectedProjectId` | `number \| null` | Projeto selecionado (para carregar team) |
| `page` | `number` | Página atual da tabela PROJECT DETAIL (default 1) |
| `pageSize` | `number` | Linhas por página (default **5**, opções 5/10/25/50) |

### Derivações calculadas

| Memo | Tipo | Descrição |
|---|---|---|
| `statusOptions` | `string[]` | Status únicos dos projetos do cliente |
| `filteredProjects` | `ProjectRow[]` | Projetos filtrados por status |
| `paginated` | `ProjectRow[]` | Fatia paginada de `filteredProjects` |
| `hasFilters` | `boolean` | `selectedCustomer !== null \|\| selectedStatus !== ""` |

### Queries React Query

| Query Key | Endpoint | Stale Time | Enabled |
|---|---|---|---|
| `["project-customers"]` | `GET /api/projects/customers` | 10 min | Sempre |
| `["projects-by-customer", customer_id]` | `GET /api/projects?customer_id=X` | 5 min | Quando customer selecionado |
| `["account-team-for-projects", customer_id]` | `GET /api/projects/account-team?customer_id=X` | 5 min | Quando customer selecionado |
| `["project-team", project_id]` | `GET /api/projects/{id}/team` | 5 min | Quando projeto selecionado |

### Subcomponentes internos

| Componente | Descrição |
|---|---|
| `CustomerSelect` | Searchable single-select com busca interna por nome |
| `StatusBadge` | Badge colorido por status (case-insensitive) |
| `Spin` | Spinner animado de loading |
| Paginação inline | IIFE dentro do JSX — não é um componente separado |

---

## 7. Arquitetura Backend

```
backend/app/modules/sections_router.py
  └── projects_router (prefix="/api/projects")
        │
        ├── GET /api/projects
        │     └── sections_service.get_projects(customer_id=None)
        │           └── ProjectRepository.get_project(
        │                 customer_id=None,
        │                 project_status=["Business Model", "In progress", "Not started", "Unidentified"]
        │               )
        │                 └── SELECT * FROM vwProject
        │                     [WHERE project_status IN (...)]
        │                     ORDER BY project_customer_name, project_id
        │
        └── GET /api/projects/{project_id}/team
              └── sections_service.get_project_team(project_id)
                    └── ProjectRepository.get_project_team()
                          └── SELECT * FROM vwProjectTeam
                              [WHERE project_id = ...]

Repositório:
  z:/bridgeadoption/src/infrastructure/database/repositories/
  └── project_repository.py  →  class ProjectRepository
```

### `sections_service.get_projects()` — v2

```python
def get_projects(customer_id: Optional[int] = None, status: Optional[List[str]] = None) -> List[Dict]:
    repo = ProjectRepository()
    if customer_id is not None:
        status_list = status  # None = sem filtro = todos os status
    else:
        status_list = status or ["Business Model", "In progress", "Not started", "Unidentified"]
    df = repo.get_project(customer_id=customer_id, project_status=status_list, as_df=True)
    return _df(df)
```

### `sections_service.get_project_customers()` — novo em v2

```python
def get_project_customers() -> List[Dict]:
    """Retorna clientes únicos de vwProject (todos os status)."""
    sql = """
        SELECT DISTINCT project_customer_id, project_customer_name
        FROM vwProject
        WHERE project_customer_id > 0
          AND project_customer_name IS NOT NULL
          AND project_ov NOT LIKE 'VAGO%%'
        ORDER BY project_customer_name
    """
    df = pd.read_sql(sql, engine)
    return _df(df)
```

---

## 8. i18n

Chaves em `frontend/src/i18n/locales/{lang}.json` sob `projects`:

| Chave | EN | PT | ES |
|---|---|---|---|
| `title` | Projects | Projetos | Proyectos |
| `subtitle` | Customer Projects Portfolio | Portfólio de Projetos de Clientes | Portafolio de Proyectos de Clientes |
| `allStatuses` | — All statuses — | — Todos os status — | — Todos los estados — |
| `accountTeamTitle` | Account Team | Equipe de Conta | Equipo de Cuenta |
| `noAccountTeam` | No account team members... | Nenhum membro... | No se encontraron... |
| `selectCustomerHint` | Select a customer... | Selecione um cliente... | Seleccione un cliente... |
| `projectDetail` | Project Detail | Detalhe do Projeto | Detalle del Proyecto |
| `projectTeam` | Project Team | Equipe do Projeto | Equipo del Proyecto |
| `clickRowHint` | Click a row to view... | Clique em uma linha... | Haz clic en una fila... |
| `selectProjectHint` | Select a project from the left... | Selecione um projeto... | Selecciona un proyecto... |
| `noProjects` | No projects found... | Nenhum projeto... | No se encontraron... |
| `noProjectsWithStatus` | No projects with status "{{status}}"... | Nenhum projeto com status... | No hay proyectos con estado... |
| `noTeamMembers` | No team members found... | Nenhum membro... | No se encontraron miembros... |
| `colOv` | OV | OV | OV |
| `colProjectName` | Project Name | Nome do Projeto | Nombre del Proyecto |
| `colStart` | Start | Início | Inicio |
| `colEnd` | End | Fim | Fin |
| `colName` | Name | Nome | Nombre |
| `colType` | Type | Tipo | Tipo |
| `colDept` | Dept | Depto | Depto |

Chaves `common.*` utilizadas no componente:

| Chave | Localização |
|---|---|
| `common.status` | Label do STATUS dropdown |
| `common.clearFilters` | Botão "Clear all filters" |
| `common.loading` | Spinner de carregamento |
| `common.noData` | Linha vazia na tabela paginada |
| `common.showing` | Paginação — "Showing X–Y" |
| `common.of` | Paginação — "of N" |
| `common.perPage` | Paginação — "Per page:" |
| `errors.generic` | Mensagem de erro de API |

---

## 9. Database — Tabelas relevantes

| Tabela/View | Papel |
|---|---|
| `tbProject` | Tabela principal de projetos |
| `tbProjectOV` | OVs individuais do projeto (relação N:1 com `tbProject`) |
| `vwProject` | View de leitura — join entre `tbProject`, `tbProjectOV` e `tbCompany` |
| `vwProjectTeam` | View da equipe do projeto — usada pelo endpoint `/team` |

### Ingestão de dados (importação)

Os projetos são criados/atualizados via `ProjectRepository.insert()` pelos importadores Python:

```
z:/bridgeadoption/src/services/importers/
  └── (importadores que chamam ProjectRepository.insert())
```

O método `insert()` implementa lógica de **upsert**:
1. Busca projeto existente pelas OVs individuais em `tbProjectOV`
2. Se encontrado: atualiza campos alterados em `tbProject`
3. Se não encontrado: insere em slot vago ou cria novo registro
4. Sincroniza `tbProjectOV` com as OVs individualizadas

---

## 10. Troubleshooting

| Problema | Causa provável | Solução |
|---|---|---|
| Módulo sem dados (tabela vazia) | View `vwProject` vazia ou importação não executada | Verificar: `SELECT COUNT(*) FROM vwProject;` |
| Projeto não aparece na listagem | Status fora dos padrões `["Business Model", "In progress", "Not started", "Unidentified"]` | Verificar `project_status` do projeto no banco; ou ajustar `status_list` em `get_projects()` |
| Campo `project_owner` vazio | Importador não preencheu o campo | Default `PMO` deveria ser aplicado — verificar `ProjectRepository._prepare_project_payload()` |
| `project_ov_name` vazio/nulo | Campo calculado na view pode não estar populado | Verificar definição de `vwProject` no banco |
| Filtros sem opções | API retornou lista vazia | Verificar logs do backend: `sudo journalctl -u bridgeadoption-api -n 50` |
| Erro 401 ao carregar | Token JWT expirado | Fazer login novamente; verificar `staleTime` do React Query |
| Erro 500 da API | Banco sem conexão ou view com erro | Verificar `GET /api/health`; reiniciar `sudo systemctl restart bridgeadoption-api` |
| Módulo não aparece no menu | `resource_key` ausente ou sem permissão no role | Verificar `tbAuthResource` onde `resource_key = 'project.project'` e o role do usuário |
| Dados desatualizados após importação | React Query com cache de 5 minutos | Clicar em **Refresh** ou aguardar expiração do cache |
| Export CSV com caracteres corrompidos | Encoding sem BOM | Abrir via Excel → Dados → De Texto/CSV com encoding UTF-8 |

### Comandos úteis de diagnóstico

```bash
# Verificar views no banco
mysql -u user -p bridgeadoption -e "SHOW TABLES LIKE 'vwProject%';"

# Contar projetos por status
mysql -u user -p bridgeadoption -e "
  SELECT project_status, COUNT(*) as total
  FROM vwProject
  GROUP BY project_status
  ORDER BY total DESC;
"

# Verificar resource_key no banco
mysql -u user -p bridgeadoption -e "
  SELECT resource_key, resource_name, resource_is_active
  FROM tbAuthResource
  WHERE resource_key = 'project.project';
"

# Reiniciar API após alterações
sudo systemctl restart bridgeadoption-api

# Ver logs da API
sudo journalctl -u bridgeadoption-api -f
```

---

## 11. Histórico de mudanças

| Data | Versão | Descrição |
|---|---|---|
| 2026-08-22 | 3.0 | **Melhorias UX v3.** Botão Refresh removido. Botão "Clear all filters" adicionado (padrão das demais páginas). Paginação na tabela PROJECT DETAIL (default **5** linhas, opções 5/10/25/50). i18n completo: 20 novas chaves em `projects.*` + uso de `common.status`, `common.clearFilters`, `common.showing`, etc. Correção do Account Team: endpoint `/projects/account-team` agora usa `find_all_df()` + filtro `accountteam_allocated != 0`. |
| 2026-08-22 | 2.0 | **Redesign v2 — padrão MS Access.** CustomerSelect searchable, StatusSelect por cliente, Account Team panel com badges, PROJECT DETAIL clicável, PROJECT TEAM lateral. Novo endpoint `GET /api/projects/customers`. `get_projects()` retorna todos os status quando `customer_id` informado. Colunas `project_start_date`/`project_end_date` adicionadas (campo real na `vwProject`). |
| 2026-08-22 | 1.0 | Primeira implementação React. Pesquisa global, filtros MultiSelect (Owner/Customer/Status), paginação, StatusBadge, Export CSV. |
| — | — | `project.py` (Streamlit): placeholder "🚧 Page under construction 🚧" |
