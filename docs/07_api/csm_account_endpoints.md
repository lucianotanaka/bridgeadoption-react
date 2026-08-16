# API — CSM Account Endpoints

> **Base URL:** `/api/adoption/csm-account`
> **Autenticação:** Bearer Token JWT (header `Authorization: Bearer <token>`)
> **Tag FastAPI:** `adoption-csm-account`
> **Router:** `backend/app/adoption/extras_router.py` (`csm_router`)
> **Service:** `backend/app/adoption/csm_account_service.py`
> **Última atualização:** 2026-08-16
> **Módulo frontend:** `CsmAccountPage.tsx` — i18n via `adoption.csmAccount.*`

---

## Autenticação

Todos os endpoints requerem token JWT válido. O token é obtido via `POST /api/auth/login`.

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## GET `/accounts`

Retorna todos os registros da view `vwAccountTeamCSM`. Cada registro representa o vínculo entre um CSM e um cliente, com o tipo de atendimento.

**Sem parâmetros.**

**Response:** `List[AccountRow]`

```json
[
  {
    "csm_name": "Thomaz Silva",
    "client_name": "Banco Bradesco",
    "client_type": "HIGH TOUCH"
  },
  {
    "csm_name": "Vitória Oliveira",
    "client_name": "Alelo S.A",
    "client_type": "SCALE TOUCH"
  },
  {
    "csm_name": "Mariana Ribeiro",
    "client_name": "Atacadao S.A.",
    "client_type": "HIGH TOUCH"
  }
]
```

**Campos de retorno:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `csm_name` | string | Nome completo do CSM responsável |
| `client_name` | string | Nome da empresa cliente |
| `client_type` | string | Tipo de atendimento: `HIGH TOUCH`, `SCALE TOUCH`, `DIGITAL TOUCH` |

> A view `vwAccountTeamCSM` pode retornar colunas adicionais dependendo de sua definição no banco. O frontend e o service consomem apenas as três colunas acima.

**Fonte de dados:** `UserRepository.load_csm_account()` → `SELECT * FROM vwAccountTeamCSM`

---

## GET `/summary`

Retorna os KPIs calculados a partir de todos os registros de `vwAccountTeamCSM`. Usado pelos cards do topo da página.

**Sem parâmetros.**

**Response:** `SummaryDict`

```json
{
  "total_accounts": 48,
  "total_csms": 5,
  "total_clients": 48,
  "types": [
    { "type": "HIGH TOUCH",    "count": 30 },
    { "type": "SCALE TOUCH",   "count": 12 },
    { "type": "DIGITAL TOUCH", "count": 6  }
  ]
}
```

**Campos de retorno:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `total_accounts` | int | Total de registros em `vwAccountTeamCSM` |
| `total_csms` | int | Número de CSMs distintos (`unique csm_name`) |
| `total_clients` | int | Número de clientes distintos (`unique client_name`) |
| `types` | array | Lista de objetos `{type, count}` ordenados por `count` decrescente |
| `types[].type` | string | Valor do tipo de atendimento |
| `types[].count` | int | Número de registros com este tipo |

**Lógica de cálculo (`get_csm_account_summary`):**

```python
csms    = {r["csm_name"] for r in rows}            # set de CSMs únicos
clients = {r["client_name"] for r in rows}          # set de clientes únicos
types   = Counter(r["client_type"] for r in rows)   # contagem por tipo
# ordenado por count decrescente
```

---

## Códigos de Resposta

| Código | Significado |
|--------|-------------|
| `200` | Sucesso — retorna array ou dict (pode ser `[]` ou `{}` se sem dados) |
| `401` | Token inválido ou expirado |
| `500` | Erro interno do servidor (verificar logs do backend) |

> Estes endpoints não possuem parâmetros obrigatórios, portanto o erro `422` não é esperado.

---

## Exemplos de Uso (frontend)

```typescript
// 1. Carregar todos os registros de conta
const accounts = await apiClient.get<AccountRow[]>(
  '/adoption/csm-account/accounts'
);

// 2. Carregar resumo / KPIs
const summary = await apiClient.get<Summary>(
  '/adoption/csm-account/summary'
);
```

**Tipos TypeScript usados no frontend:**

```typescript
interface AccountRow {
  csm_name: string;
  client_name: string;
  client_type: string;
  [key: string]: unknown;
}

interface Summary {
  total_accounts: number;
  total_csms: number;
  total_clients: number;
  types: { type: string; count: number }[];
}
```

---

## React Query Keys

| Query Key | Endpoint | staleTime |
|-----------|----------|-----------|
| `["csm-accounts"]` | `GET /accounts` | 5 minutos |
| `["csm-summary"]` | `GET /summary` | 5 minutos |

Ambas as queries são disparadas automaticamente quando a página carrega (`CsmAccountPage`). O botão **Refresh** chama `refetch()` em ambas.

---

## Permissão

O acesso à rota `/adoption/csm-account` é controlado por:

| Camada | Mecanismo | Valor |
|--------|-----------|-------|
| Frontend (rota) | `PermissionRoute` em `App.tsx` | `resourceKey: "adoption.report_csm_account"` |
| Backend (endpoint) | `Depends(get_current_user)` | Token JWT válido obrigatório |

Usuários com papel `ADMIN` têm acesso garantido pelo `PermissionRoute`.

---

## Notas de Implementação

- **Deduplicação:** os dados retornados pelo endpoint `/accounts` podem conter registros duplicados (mesma combinação `csm_name + client_name + client_type`). A deduplicação é realizada **no frontend** antes de exibição e exportação, espelhando o comportamento do Streamlit (`drop_duplicates`).
- **Sem filtros no backend:** a filtragem por CSM, cliente e tipo é feita inteiramente no frontend a partir dos dados carregados uma única vez. Isso minimiza chamadas à API.
- **Coluna rename em `tbAccountTeam`:** as colunas `accountteam_user_id` e `accountteam_user_type` foram renomeadas para `accountteam_person_id` e `accountteam_person_type`. Este change **não afeta** estes endpoints, pois o acesso é feito via `vwAccountTeamCSM` (view SQL que abstrai as colunas da tabela base).
- **Versão pública:** existe um módulo separado em `/public/csm-account` com endpoints distintos e escopo reduzido. Ver `docs/02_application/public/csm_account_public.md`.
