# API — Account Team Endpoints

> **Base URL:** `/api/portfolio/account-team`
> **Autenticação:** Bearer Token JWT (header `Authorization: Bearer <token>`)
> **Tag FastAPI:** `portfolio`
> **Router:** `backend/app/modules/sections_router.py` → `portfolio_router`
> **Última atualização:** 2026-08-18
> **Módulo frontend:** `AccountTeamPage.tsx` — i18n via `portfolio.accountTeam.*`

---

## Autenticação

Todos os endpoints requerem token JWT válido. O token é obtido via `POST /api/auth/login`.

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## GET `/companies`

Retorna a lista de **todas as empresas válidas** de `tbCompany` para o filtro CLIENT e para a navegação do Edit Panel.

**Fonte:** `CompanyRepository.list_available_companies()`

**Critérios de exclusão:** `VAGO %`, type `PF`, nome vazio/`-`/`UNIDENTIFIED`

**Sem parâmetros.**

**Response:** `List[Company]`

```json
[
  { "company_id": 5, "company_name": "ACME CORP" },
  { "company_id": 12, "company_name": "BANCO CSF S/A" }
]
```

> **Cache (React Query):** query `["account-team-all-companies"]` compartilhada pela página principal (filtro CLIENT) e pelo `EditPanel` (navegação) — apenas **1 requisição HTTP**.

---

## GET `/matrix`

Retorna todas as linhas **alocadas** do Account Team enriquecidas com o Cisco Domain por empresa.

O frontend usa esses dados para construir client-side a matriz pivô: empresa × tipo-de-pessoa → nomes dos membros.

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
| `accountteam_allocated` | int\|null | `1` = alocado, `0` = desalocado, `-1` = não definido |
| `accountteam_allocation_start_date` | string\|null | Data de início (ISO 8601) |
| `accountteam_allocation_end_date` | string\|null | Data de fim (ISO 8601) |
| `accountteam_changed_in` | string\|null | Data da última alteração |
| `accountteam_changed_by` | int\|null | user_id do responsável pela alteração |
| `cisco_domain` | string\|null | Domínio(s) Cisco da empresa (separados por `, `) |

> **Filtro de backend:** apenas registros com `accountteam_allocated != 0 AND NOT NULL`.
>
> **Normalização:** o backend renomeia automaticamente `accountteam_user_type → accountteam_person_type` e `accountteam_user_id → accountteam_person_id` para garantir compatibilidade com views que não foram atualizadas.

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

**Fonte:** `tbPerson WHERE person_company_id IS NULL AND person_enabled = 1`

> `tbPerson` já está populada com os colaboradores internos NTT (~700 registros).
> O backend tenta `PersonRepository.get_ntt_persons()` primeiro; se indisponível, usa fallback SQL direto.

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
  "accountteam_changed_in": "2026-08-17",
  "accountteam_changed_by": 1,
  "accountteam_allocation_end_date": "2026-08-17"
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

> **Nota de implementação:** `AccountTeamRepository.update()` é definido sem `self` no código. O service chama `AccountTeamRepository.update(data)` como método de classe para evitar o bug onde a instância seria passada como `edit_values`.

---

## POST `/`

Insere um novo membro no Account Team de uma empresa.

**Request Body:**

```json
{
  "accountteam_company_id": 5,
  "accountteam_person_id": 42,
  "accountteam_person_type": "CSM",
  "accountteam_allocation_start_date": "2026-08-17",
  "accountteam_allocated": 1,
  "accountteam_changed_in": "2026-08-17",
  "accountteam_changed_by": 1
}
```

**Campos obrigatórios:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `accountteam_company_id` | int | FK `tbCompany.company_id` |
| `accountteam_person_id` | int | FK `tbPerson.person_id` — obtido do `GET /users` |
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
// 1. Carregar dados para a matriz
const matrixRows = await apiClient.get<AccountTeamRow[]>('/portfolio/account-team/matrix');

// 2. Carregar todos os rows para o edit panel
const allRows = await apiClient.get<AccountTeamRow[]>('/portfolio/account-team/rows');

// 3. Carregar pessoas NTT disponíveis para Add Member
const persons = await apiClient.get<NttPerson[]>('/portfolio/account-team/users');

// 4. Atualizar alocação (desalocar)
await apiClient.put(`/portfolio/account-team/${id}`, {
  accountteam_allocated: 0,
  accountteam_changed_in: '2026-08-17',
  accountteam_changed_by: userId,
  accountteam_allocation_end_date: '2026-08-17',
});

// 5. Inserir novo membro
const result = await apiClient.post('/portfolio/account-team', {
  accountteam_company_id: 5,
  accountteam_person_id: 42,
  accountteam_person_type: 'CSM',
  accountteam_allocation_start_date: '2026-08-17',
  accountteam_allocated: 1,
  accountteam_changed_in: '2026-08-17',
  accountteam_changed_by: userId,
});
```

---

## Notas de Implementação

- **Matriz client-side:** O endpoint `/matrix` retorna as linhas brutas (uma por membro). A construção da tabela pivô (empresa × tipo → nomes) é feita no frontend por `buildMatrix()`.

- **Normalização de colunas:** A função `_normalize_account_team_cols(df)` no backend renomeia automaticamente as colunas legadas da `vwAccountTeam`:
  - `accountteam_user_type` → `accountteam_person_type`
  - `accountteam_user_id` → `accountteam_person_id`
  Isso garante compatibilidade enquanto a view não for atualizada no banco.

- **Cisco Domain:** O backend faz o join com `CiscoDomainRepository` em `/matrix`. Múltiplos domínios por empresa são concatenados com `, `. Em caso de falha no join, o campo `cisco_domain` retorna `null` (não falha a requisição).

- **Fonte dos membros (Add Member):** A lista vem de `tbPerson WHERE person_company_id IS NULL AND person_enabled = 1` (~700 colaboradores NTT). O backend tenta `PersonRepository` primeiro; se `person_repository.py` não estiver implantado no servidor, usa um **fallback SQL direto** sobre `tbPerson` sem dependências externas.

- **`accountteam_person_id` vs `accountteam_user_id`:** As colunas antigas foram renomeadas. O schema atual usa `accountteam_person_id` (FK → `tbPerson.person_id`) e `accountteam_person_type`. O `INSERT` salva diretamente nessas colunas — sem mapeamento intermediário para `accountteam_user_type`.

- **Bug do `update()` sem `self`:** `AccountTeamRepository.update()` foi definido sem parâmetro `self`, tornando-o efetivamente um método estático. O service chama `AccountTeamRepository.update(data)` (como método de classe) para passar os dados corretamente.

- **Atualização otimista:** O frontend implementa `optimisticAlloc` state — o checkbox muda visualmente imediato ao clique, antes do servidor confirmar. Se o PUT falhar, a mudança é revertida.

- **Cache (React Query):** `/matrix` e `/rows` têm `staleTime = 5 min`. `/users` tem `staleTime = 10 min`. Após qualquer mutation (PUT/POST), ambas as queries são invalidadas automaticamente.

---

## Referências

- **Documentação do módulo:** `docs/02_application/portfolio/account_team.md`
- **Router:** `backend/app/modules/sections_router.py` → `portfolio_router`
- **Service:** `backend/app/modules/sections_service.py`
- **PersonRepository:** `src/infrastructure/database/repositories/person_repository.py`
- **AccountTeamRepository:** `src/infrastructure/database/repositories/account_team_repository.py`
