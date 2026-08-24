# API — Client Overview Endpoints

> **Base URL:** `/api`
> **Autenticação:** Bearer Token JWT (header `Authorization: Bearer <token>`)
> **Tags FastAPI:** `portfolio`, `projects`, `adoption`
> **Routers principais:**  
> - `backend/app/modules/sections_router.py`  
> - `backend/app/adoption/cisco_lci_router.py`  
> - `backend/app/tasks/router.py`
> **Última atualização:** 2026-08-24
> **Módulo frontend:** `frontend/src/pages/portfolio/ClientOverviewPage.tsx`

---

## 1. Visão geral

O módulo **Client Overview** não possui um endpoint único agregador no backend.

A página React compõe a tela consumindo múltiplos endpoints especializados, agrupados em quatro blocos:

1. **Base do cliente**
2. **Portfolio / relatórios auxiliares**
3. **Projects**
4. **Tasks / detalhe de task**
5. **Adoption Cisco LCI**

Esta documentação foi preparada para times de **implantação** e **sustentação**, com foco em:

- quais endpoints precisam estar disponíveis
- quais dados cada endpoint entrega para a tela
- quais falhas impactam diretamente a operação do módulo

---

## 2. Autenticação

Todos os endpoints usados pelo Client Overview exigem **JWT Bearer Token** válido.

```http
Authorization: Bearer <token>
```

Se o token for inválido ou expirado, o backend retorna:

- `401 Unauthorized`

---

## 3. Endpoints consumidos pelo Client Overview

## 3.1 GET `/portfolio/account-team/companies`

Retorna a lista de empresas disponíveis para o seletor de cliente.

**Router:** `portfolio_router`  
**Função:** `portfolio_account_team_companies()`  
**Service:** `get_account_team_companies()`

### Uso no frontend

- popula o dropdown de seleção do cliente
- também é a origem do nome exibido no cabeçalho

### Response

```json
[
  {
    "company_id": 5,
    "company_name": "ACME CORP"
  },
  {
    "company_id": 12,
    "company_name": "BANCO CSF S/A"
  }
]
```

### Observações operacionais

- exclui empresas inválidas / VAGO / PF conforme regra do backend
- se esse endpoint falhar, o usuário não consegue selecionar cliente

---

## 3.2 GET `/portfolio/client-overview/company/{company_id}`

Retorna os dados cadastrais básicos da empresa selecionada.

**Router:** `portfolio_client_overview_company()`  
**Service:** `get_client_overview_company()`  
**Repository:** `CompanyRepository.find_by_id(company_id)`

### Path Params

| Param | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `company_id` | int | Sim | ID da empresa |

### Uso no frontend

- preencher **Type**
- preencher **Vertical**
- apoiar o cabeçalho do cliente

### Response típica

```json
{
  "company_id": 12,
  "company_name": "BANCO CSF S/A",
  "company_type": "Enterprise",
  "company_vertical": "Financial Services"
}
```

---

## 3.3 PUT `/portfolio/client-overview/company/{company_id}`

Atualiza dados editáveis da empresa no topo do Client Overview.

**Router:** `portfolio_client_overview_company_update()`  
**Service:** `update_client_overview_company()`

### Campos aceitos

O backend considera apenas:

- `company_type`
- `company_vertical`
- `vertical` (normalizado para `company_vertical`)

### Request Body

```json
{
  "company_type": "Enterprise",
  "company_vertical": "Financial Services"
}
```

### Response de sucesso

```json
{
  "success": true
}
```

### Response de erro de regra

```json
{
  "detail": "No updatable fields provided"
}
```

### Códigos relevantes

| Código | Significado |
|---|---|
| `200` | Atualização bem-sucedida |
| `400` | Payload inválido ou sem campos atualizáveis |
| `401` | Token inválido |
| `500` | Falha interna |

### Observações operacionais

- usado ao salvar **Type** e **Vertical**
- falhas aqui não impedem a carga geral da tela, mas bloqueiam a edição inline

---

## 3.4 GET `/portfolio/client-overview/nps/{company_id}`

Retorna o NPS mais recente da empresa.

**Router:** `portfolio_client_overview_nps()`  
**Service:** `get_client_overview_nps()`  
**Repository:** `NPSRepository.get_latest_by_company(company_id)`

### Uso no frontend

- preencher o bloco **Latest NPS**
- exibir score e data da última resposta

### Response típica

```json
{
  "nps_id": 101,
  "nps_survey_score": "9",
  "nps_response_date": "2026-07-30"
}
```

### Observações

- pode retornar `{}` se não houver NPS
- isso não é tratado como erro funcional

---

## 3.5 GET `/portfolio/client-overview/stakeholders/{company_id}`

Retorna os stakeholders da empresa.

**Router:** `portfolio_client_overview_stakeholders()`  
**Service:** `get_client_overview_stakeholders()`  
**Repository:** `StakeholderManagementRepository.list_by_company(company_id, as_df=False)`

### Uso no frontend

- listar stakeholders
- selecionar stakeholder para leitura
- editar stakeholder existente

### Response resumida

```json
[
  {
    "stakeholder_id": 1,
    "stakeholder_person_id": 88,
    "stakeholder_company_id": 12,
    "stakeholder_internal_external": "EXTERNAL",
    "stakeholder_power_in_the_company": 4,
    "stakeholder_interest_level": 5,
    "stakeholder_attitude_towards": "Supporter",
    "stakeholder_enabled": 1,
    "person_name": "Maria Souza",
    "person_email": "maria.souza@cliente.com",
    "person_job_title": "IT Manager"
  }
]
```

### Observações operacionais

- se retornar `[]`, a seção continua funcional para criação de novos registros
- se o repositório não estiver implantado, a lista ficará vazia

---

## 3.6 POST `/portfolio/client-overview/person`

Cria um registro em `tbPerson` para uso no fluxo de novo stakeholder.

**Router:** `portfolio_client_overview_create_person()`  
**Service:** `create_client_person()`

### Request Body mínimo

```json
{
  "person_name": "Maria Souza",
  "person_email": "maria.souza@cliente.com",
  "person_company_id": 12,
  "person_enabled": 1
}
```

### Response

```json
{
  "person_id": 321
}
```

### Regras importantes

- `person_name` é obrigatório
- campos `null` são descartados antes do insert

### Erro típico

```json
{
  "detail": "person_name is required"
}
```

---

## 3.7 POST `/portfolio/client-overview/stakeholders`

Cria um novo stakeholder.

**Router:** `portfolio_client_overview_create_stakeholder()`  
**Service:** `create_client_stakeholder()`

### Request Body

O payload é aberto e depende dos campos montados no frontend.

Exemplo:

```json
{
  "stakeholder_company_id": 12,
  "stakeholder_person_id": 321,
  "stakeholder_internal_external": "EXTERNAL",
  "stakeholder_power_in_the_company": 3,
  "stakeholder_interest_level": 3,
  "stakeholder_attitude_towards": "Neutral",
  "stakeholder_enabled": 1,
  "stakeholder_remark": ""
}
```

### Response

```json
{
  "stakeholder_id": 77
}
```

---

## 3.8 PUT `/portfolio/client-overview/stakeholders/{stakeholder_id}`

Atualiza um stakeholder existente.

**Router:** `portfolio_client_overview_update_stakeholder()`  
**Service:** `update_client_stakeholder()`

### Response

```json
{
  "success": true
}
```

### Observação

- o frontend envia também campos de auditoria como `stakeholder_updated_on` e `stakeholder_updated_by`

---

## 3.9 GET `/portfolio/adoption-tasks`

Retorna o dataset completo de Adoption Initiatives.

**Router:** `portfolio_adoption_tasks()`  
**Service:** `get_adoption_tasks()`  
**Repository:** `TaskTechnologyAdoptionReportRepository`

### Query Params

| Param | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `customer_id` | int | Não | Filtro legado opcional |

### Uso no frontend

- a UI carrega o dataset completo
- o filtro por cliente é feito no frontend comparando `task_customer_name`
- também é a base da seção **Adoption Initiatives**

### Response resumida

```json
[
  {
    "task_id": 1001,
    "task_customer_name": "BANCO CSF S/A",
    "task_type_name": "Cisco DNA",
    "task_owner_name": "João Silva",
    "task_status_name": "In Progress",
    "task_status_id": 2,
    "task_start": "2026-07-01",
    "task_end": "2026-09-30"
  }
]
```

### Observações operacionais

- se esse endpoint falhar, a seção **Adoption Initiatives** ficará vazia
- o card de Initiatives também ficará inconsistente

---

## 3.10 GET `/portfolio/account-team/matrix`

Retorna os membros alocados do Account Team.

**Router:** `portfolio_account_team_matrix()`  
**Service:** `get_account_team_matrix()`

### Uso no frontend

- base da seção **Account Team**
- o Client Overview filtra client-side pelo nome da empresa

### Response resumida

```json
[
  {
    "accountteam_id": 501,
    "accountteam_company_id": 12,
    "accountteam_company_name": "BANCO CSF S/A",
    "accountteam_user_name": "João Silva",
    "accountteam_person_id": 42,
    "accountteam_person_type": "CSM",
    "accountteam_allocated": 1,
    "cisco_domain": "cliente.com"
  }
]
```

### Regra importante

- o backend retorna somente linhas com `accountteam_allocated != 0`

---

## 3.11 GET `/portfolio/account-team/rows`

Retorna todas as linhas de Account Team, incluindo desalocados.

**Uso no Client Overview:** somente quando o usuário entra em **Edit Mode** da seção Account Team.

---

## 3.12 GET `/portfolio/account-team/users`

Retorna a lista de pessoas NTT internas disponíveis para inclusão no Account Team.

**Uso no Client Overview:** formulário **Add Member**.

---

## 3.13 PUT `/portfolio/account-team/{accountteam_id}`

Atualiza uma linha do Account Team.

**Uso no Client Overview:** alocar / desalocar membro no modo edição.

### Request Body típico

```json
{
  "accountteam_allocated": 0,
  "accountteam_changed_in": "2026-08-24"
}
```

### Response

```json
{
  "success": true
}
```

---

## 3.14 POST `/portfolio/account-team`

Insere novo membro no Account Team.

**Uso no Client Overview:** formulário **Add Member**.

### Request Body típico

```json
{
  "accountteam_company_id": 12,
  "accountteam_person_id": 42,
  "accountteam_person_type": "CSM",
  "accountteam_allocation_start_date": "2026-08-24",
  "accountteam_allocated": 1,
  "accountteam_changed_in": "2026-08-24"
}
```

### Response

```json
{
  "accountteam_id": 900,
  "success": true
}
```

---

## 3.15 GET `/projects`

Retorna os projetos da empresa.

**Router:** `projects_router`  
**Função:** `list_projects()`  
**Service:** `get_projects(customer_id=...)`

### Query Params

| Param | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `customer_id` | int | Não | ID da empresa |

### Uso no frontend

- preencher a seção **Projects**
- quando `customer_id` é enviado, o backend retorna todos os status
- o filtro active/closed é aplicado no frontend

### Response resumida

```json
[
  {
    "project_id": 700,
    "project_name": "Network Refresh",
    "project_status": "In progress",
    "project_start_date": "2026-01-10",
    "project_end_date": "2026-11-30",
    "project_ov": "OV-123"
  }
]
```

---

## 3.16 GET `/portfolio/cisco-ea/metering`

Retorna o dataset de medição Cisco EA.

**Router:** `portfolio_ea_metering()`  
**Service:** `get_cisco_ea_metering(customer_id)`

### Query Params

| Param | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `customer_id` | int | Não | ID da empresa |

### Uso no frontend

- cálculo do card **Cisco EA**
- detalhe da seção **Cisco EA License Usage**

### Observações operacionais

- se esse endpoint retornar vazio, o card pode exibir `0%` ou `—`
- True Forward depende da relação entre `mcea_generated` e `mcea_purchased`

---

## 3.17 GET `/portfolio/cisco-sa/usage`

Retorna os registros Cisco Smart Account do cliente.

**Router:** `portfolio_cisco_sa()`  
**Service:** `get_cisco_sa_usage(customer_id)`

### Query Params

| Param | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `customer_id` | int | Sim na prática | ID da empresa |

### Uso no frontend

- card **Cisco SA**
- detalhe da seção **Cisco Smart Account License Usage**

### Fonte

- SQL direto sobre `vwCiscoSAMeteringLatest`

### Observações operacionais

- se `customer_id` não for enviado, o service retorna `[]`
- há risco de timeout/performance dependendo do volume de dados

---

## 3.18 GET `/adoption/cisco-lci/client-report/{company_id}`

Retorna o relatório consolidado de Rebates / Cisco LCI por cliente.

**Router:** `backend/app/adoption/cisco_lci_router.py`  
**Uso no frontend:** seção **Rebates / Adoption Cisco LCI**

### Path Params

| Param | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `company_id` | int | Sim | ID da empresa |

### Query Params

| Param | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `client_name` | string | Não | Nome do cliente, enviado pelo frontend |

### Response resumida

```json
{
  "company_id": 12,
  "current_fy": 2026,
  "task_count": 8,
  "approved_stage_count": 3,
  "approved_total_usd": 125000.0,
  "chart": [
    {
      "fy": 2026,
      "label": "FY 2026",
      "approved_value_usd": 125000.0
    }
  ],
  "tasks": [
    {
      "task_id": 1001,
      "task_type_name": "Rebate Opportunity",
      "task_ws": "WS-001",
      "task_value": 50000,
      "task_status_id": 2,
      "owner_name": "João Silva",
      "status_name": "In Progress",
      "start_date": "2026-06-01",
      "end_date": "2026-09-30",
      "fy": 2026
    }
  ]
}
```

### Observações operacionais

- esse endpoint só é chamado quando a seção **LCI** está ativa
- falhas aqui afetam apenas a seção Rebates, não a carga básica da tela

---

## 3.19 Endpoints de Tasks usados indiretamente

O Client Overview integra-se com o módulo **Tasks** para abrir o `TaskDetailPanel`, mas sem alterar a lógica do módulo Tasks.

### Uso atual no frontend

1. carregar lista de tasks do cliente:
   - `tasksApi.filterTasks({ client_names: [clientName] })`

2. abrir detalhe a partir das tabelas:
   - **Critical Alerts**
   - **Adoption Initiatives**
   - **LCI tasks in FY XXXX**

### Regra funcional importante

Ao clicar em uma linha:
- o frontend obtém o `task_id`
- filtra a lista de tasks do cliente
- envia ao `TaskDetailPanel` apenas a task correspondente

Resultado:
- o painel abre filtrado por `task_id`
- não exibe todas as tasks do cliente

> A rota exata do filtro de tasks depende do módulo `backend/app/tasks/router.py` e da implementação em `frontend/src/api/tasks.ts`.

---

## 4. Sequência típica de carregamento da página

Após selecionar um cliente e clicar em **Load**, o frontend normalmente consome:

1. `/api/portfolio/client-overview/company/{id}`
2. `/api/portfolio/client-overview/nps/{id}`
3. `/api/portfolio/client-overview/stakeholders/{id}`
4. endpoint de filtro de tasks do módulo `/api/tasks`
5. `/api/portfolio/adoption-tasks`
6. `/api/portfolio/account-team/matrix`
7. `/api/projects?customer_id={id}`
8. `/api/portfolio/cisco-ea/metering?customer_id={id}`
9. `/api/portfolio/cisco-sa/usage?customer_id={id}`

Somente ao abrir Rebates:
10. `/api/adoption/cisco-lci/client-report/{id}`

Somente ao entrar em edição de Account Team:
11. `/api/portfolio/account-team/rows`
12. `/api/portfolio/account-team/users`

---

## 5. Códigos de resposta esperados

| Código | Significado |
|---|---|
| `200` | Sucesso |
| `400` | Payload inválido / regra de negócio rejeitada |
| `401` | Token inválido ou expirado |
| `403` | Acesso negado em endpoints protegidos por regra adicional |
| `422` | Parâmetro inválido |
| `500` | Erro interno |

---

## 6. Troubleshooting para implantação e sustentação

| Sintoma | Endpoint a validar | Possível causa |
|---|---|---|
| Dropdown de cliente vazio | `/portfolio/account-team/companies` | empresa filtrada no backend / falha de auth |
| Type e Vertical não aparecem | `/portfolio/client-overview/company/{id}` | `CompanyRepository.find_by_id()` sem dados |
| Latest NPS vazio | `/portfolio/client-overview/nps/{id}` | cliente sem NPS |
| Stakeholders não carregam | `/portfolio/client-overview/stakeholders/{id}` | repositório indisponível / dados ausentes |
| Initiatives zeradas | `/portfolio/adoption-tasks` | falha no repositório de adoption tasks |
| Projects zerados | `/projects?customer_id={id}` | cliente sem projetos / view sem dados |
| Cisco EA vazio | `/portfolio/cisco-ea/metering` | importação EA não disponível |
| Cisco SA vazio ou erro | `/portfolio/cisco-sa/usage` | view `vwCiscoSAMeteringLatest` indisponível |
| Rebates não abre | `/adoption/cisco-lci/client-report/{id}` | falha no serviço Cisco LCI |
| Task detail não abre na linha | endpoint de tasks + permissão `task.task` | task não encontrada na lista filtrada ou usuário sem permissão |

---

## 7. Referências

- `docs/02_application/portfolio/client_overview.md`
- `docs/02_application/portfolio/adoption_initiatives.md`
- `docs/07_api/account_team_endpoints.md`
- `backend/app/modules/sections_router.py`
- `backend/app/modules/sections_service.py`
- `backend/app/adoption/cisco_lci_router.py`
- `backend/app/tasks/router.py`
- `frontend/src/pages/portfolio/ClientOverviewPage.tsx`
- `frontend/src/api/tasks.ts`
