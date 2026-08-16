# API — Account Team Endpoints

> **Base URL:** `/api/portfolio/account-team`
> **Autenticação:** Bearer Token JWT (header `Authorization: Bearer <token>`)
> **Tag FastAPI:** `portfolio`
> **Router:** `backend/app/modules/sections_router.py` → `portfolio_router`
> **Última atualização:** 2026-08-16
> **Módulo frontend:** `AccountTeamPage.tsx` — i18n via `portfolio.accountTeam.*`

---

## Autenticação

Todos os endpoints requerem token JWT válido. O token é obtido via `POST /api/auth/login`.

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## GET `/matrix`

Retorna todas as linhas **alocadas** do Account Team enriquecidas com o Cisco Domain por empresa.

O frontend usa esses dados para construir client-side a matriz pivô: empresa × tipo-de-usuário → nomes dos membros.

**Sem parâmetros.**

**Response:** `List[AccountTeamRow]`

```json
[
  {
    "accountteam_id": 101,
    "accountteam_company_id": 5,
    "accountteam_company_name": "Acme Corp",
    "accountteam_user_name": "João Silva",
    "accountteam_person_id": 42,
    "accountteam_person_type": "CSM",
    "accountteam_allocated": 1,
    "accountteam_allocation_start_date": "2024-01-15",
    "accountteam_allocation_end_date": null,
    "accountteam_changed_in": "2024-01-15",
    "accountteam_changed_by": 1,
    "cisco_domain": "acme.com"
  }
]
```

**Campos de retorno:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `accountteam_id` | int | PK do registro em `tbAccountTeam` |
| `accountteam_company_id` | int | FK `tbCompany.company_id` |
| `accountteam_company_name` | string | Nome da empresa (da view `vwAccountTeam`) |
| `accountteam_user_name` | string | Nome da pessoa (`tbPerson.person_name` via join) |
| `accountteam_person_id` | int\|null | FK `tbPerson.person_id` |
| `accountteam_person_type` | string | Tipo: `AM`, `CDM`, `CSM`, `DIR`, etc. |
| `accountteam_allocated` | int\|null | `1` = alocado |
| `accountteam_allocation_start_date` | string\|null | Data de início (ISO 8601) |
| `accountteam_allocation_end_date` | string\|null | Data de fim (ISO 8601) |
| `accountteam_changed_in` | string\|null | Data da última alteração |
| `accountteam_changed_by` | int\|null | user_id do responsável pela alteração |
| `cisco_domain` | string\|null | Domínio(s) Cisco da empresa (separados por `, `) |

> **Filtro de backend:** apenas registros com `accountteam_allocated != 0 AND NOT NULL`.

---

## GET `/rows`

Retorna **todas** as linhas do Account Team (alocados + não alocados), sem o join de Cisco Domain.

Usado pelo **Edit Panel** para exibir todos os membros de uma empresa — incluindo os não alocados — para ativar/desativar alocação.

**Sem parâmetros.**

**Response:** `List[AccountTeamRow]` (mesmo schema de `/matrix`, sem campo `cisco_domain`)

> Este endpoint só é chamado pelo frontend quando `canEdit = true`.

---

## GET `/users`

Retorna a lista de **pessoas NTT internas** disponíveis para o formulário "Add Member".

Fonte: `tbPerson WHERE person_company_id IS NULL AND person_enabled = 1`

**Sem parâmetros.**

**Response:** `List[NttPerson]`

```json
[
  {
    "person_id": 42,
    "person_name": "João Silva",
    "person_email": "joao.silva@nttdata.com",
    "person_job_title": "Customer Success Manager",
    "person_type": "CSM",
    "person_enabled": 1
  }
]
```

**Campos de retorno:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `person_id` | int | PK de `tbPerson` |
| `person_name` | string | Nome completo da pessoa |
| `person_email` | string\|null | E-mail corporativo |
| `person_job_title` | string\|null | Cargo |
| `person_type` | string\|null | Tipo da pessoa |
| `person_enabled` | int | `1` = ativo |

> O frontend filtra adicionalmente excluindo `person_id` já presentes em `accountteam_person_id` para a empresa selecionada.

---

## PUT `/{accountteam_id}`

Atualiza um registro do Account Team — tipicamente o campo `accountteam_allocated` e os campos de auditoria.

**Path Params:**

| Param | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `accountteam_id` | int | **Sim** | PK do registro em `tbAccountTeam` |

**Request Body:** JSON com os campos a atualizar

```json
{
  "accountteam_allocated": 0,
  "accountteam_changed_in": "2026-08-16",
  "accountteam_changed_by": 1,
  "accountteam_allocation_end_date": "2026-08-16"
}
```

> `accountteam_allocation_end_date` é enviado apenas ao **desalocar** (`allocated → 0`).

**Response:**

```json
{ "success": true }
```

| Cenário | `success` |
|---------|-----------|
| Atualização bem-sucedida | `true` |
| Erro no repositório | `false` (com log de erro no backend) |

---

## POST `/`

Insere um novo membro no Account Team de uma empresa.

**Request Body:**

```json
{
  "accountteam_company_id": 5,
  "accountteam_person_id": 42,
  "accountteam_person_type": "CSM",
  "accountteam_allocation_start_date": "2026-08-16",
  "accountteam_allocated": 1,
  "accountteam_changed_in": "2026-08-16",
  "accountteam_changed_by": 1
}
```

**Campos obrigatórios:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `accountteam_company_id` | int | FK `tbCompany.company_id` |
| `accountteam_person_id` | int | FK `tbPerson.person_id` |
| `accountteam_person_type` | string | `AM`, `CDM`, `CSM`, `DIR`, etc. |
| `accountteam_allocation_start_date` | string | Data de início (ISO 8601) |
| `accountteam_allocated` | int | `1` (sempre 1 no insert) |
| `accountteam_changed_in` | string | Data do insert (hoje) |
| `accountteam_changed_by` | int | user_id do responsável |

**Response:**

```json
{
  "accountteam_id": 285,
  "success": true
}
```

| Campo | Descrição |
|-------|-----------|
| `accountteam_id` | ID do novo registro (0 se falhou) |
| `success` | `true` se `accountteam_id > 0` |

---

## GET `/` (legado)

Endpoint original mantido para compatibilidade. Retorna dados da view `vwAccountTeam` opcionalmente filtrados por `customer_id`.

> **Preferir:** `GET /matrix` para uso no frontend React.

**Query Params:**

| Param | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `customer_id` | int | Não | Se fornecido, filtra pela empresa. |

---

## Códigos de Resposta

| Código | Significado |
|--------|-------------|
| `200` | Sucesso — retorna array (pode ser `[]` se sem dados) |
| `401` | Token inválido ou expirado |
| `422` | Parâmetro obrigatório ausente ou tipo inválido |
| `500` | Erro interno do servidor (verificar logs do backend) |

---

## Exemplos de Uso (frontend)

```typescript
// 1. Carregar dados para a matriz (filtro aplicado no backend: allocated != 0)
const matrixRows = await apiClient.get<AccountTeamRow[]>('/portfolio/account-team/matrix');

// 2. Carregar todos os rows para o edit panel (sem filtro de alocação)
const allRows = await apiClient.get<AccountTeamRow[]>('/portfolio/account-team/rows');

// 3. Carregar pessoas NTT disponíveis para Add Member
const persons = await apiClient.get<NttPerson[]>('/portfolio/account-team/users');

// 4. Atualizar alocação (desalocar)
await apiClient.put(`/portfolio/account-team/${id}`, {
  accountteam_allocated: 0,
  accountteam_changed_in: '2026-08-16',
  accountteam_changed_by: userId,
  accountteam_allocation_end_date: '2026-08-16',
});

// 5. Inserir novo membro
const result = await apiClient.post('/portfolio/account-team', {
  accountteam_company_id: 5,
  accountteam_person_id: 42,
  accountteam_person_type: 'CSM',
  accountteam_allocation_start_date: '2026-08-16',
  accountteam_allocated: 1,
  accountteam_changed_in: '2026-08-16',
  accountteam_changed_by: userId,
});
```

---

## Notas de Implementação

- **Matriz client-side:** O endpoint `/matrix` retorna as linhas brutas (uma por membro). A construção da tabela pivô (empresa × tipo → nomes) é feita inteiramente no frontend por `buildMatrix()`, agrupando por empresa, acumulando nomes em `Set<string>` por tipo e fazendo join com `, `.

- **Cisco Domain:** O backend faz o join com `CiscoDomainRepository` em `/matrix`. Múltiplos domínios por empresa são concatenados com `, `. Em caso de falha no join, o campo `cisco_domain` retorna `null` (não falha a requisição).

- **Fonte dos membros (Add Member):** A lista vem de `tbPerson WHERE person_company_id IS NULL AND person_enabled = 1` via `PersonRepository.get_ntt_persons()`. Isso garante que apenas colaboradores NTT ativos apareçam, independente de terem acesso ao sistema (`tbUser`).

- **`accountteam_person_id` vs `accountteam_user_id`:** A coluna `accountteam_user_id` foi removida. O campo correto é `accountteam_person_id` (FK → `tbPerson.person_id`).
- **`accountteam_person_type` vs `accountteam_user_type`:** A coluna `accountteam_user_type` foi renomeada para `accountteam_person_type`. O campo `accountteam_user_name` ainda é retornado pela `vwAccountTeam` (alias de `tbPerson.person_name`).

- **Cache (React Query):** `/matrix` e `/rows` têm `staleTime = 5 min`. `/users` tem `staleTime = 10 min`. Após qualquer mutation (PUT/POST), ambas as queries `["account-team-matrix"]` e `["account-team-rows"]` são invalidadas automaticamente.

- **Controle de acesso:** A permissão `portfolio.account_team` é verificada pela `PermissionRoute` no frontend. Os endpoints de escrita (PUT/POST) não têm verificação de permissão adicional no backend além da autenticação JWT — o controle é feito no frontend via `canEdit`.

---

## Referências

- **Documentação do módulo:** `docs/02_application/portfolio/account_team.md`
- **Router:** `backend/app/modules/sections_router.py` → `portfolio_router`
- **Service:** `backend/app/modules/sections_service.py`
- **PersonRepository:** `src/infrastructure/database/repositories/person_repository.py`
- **AccountTeamRepository:** `src/infrastructure/database/repositories/account_team_repository.py`
