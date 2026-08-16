# API — Team Target Endpoints

> **Base URL:** `/api/adoption/team-target`
> **Autenticação:** Bearer Token JWT (header `Authorization: Bearer <token>`)
> **Tag FastAPI:** `adoption-team-target`
> **Última atualização:** 2026-08-16
> **Módulo frontend:** `TeamTargetPage.tsx` — i18n via `adoption.teamTarget.*`

---

## Autenticação

Todos os endpoints requerem token JWT válido. O token é obtido via `POST /api/auth/login`.

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## GET `/fiscal-years`

Retorna lista de anos fiscais disponíveis em `tbTeamTarget` para o time de Adoption (team_id = 30).

**Sem parâmetros.**

**Response:** `[2024, 2025, 2026]`

```json
[2024, 2025]
```

---

## GET `/targets`

Retorna lista de metas enriquecidas para um dado ano fiscal. Inclui nomes de task types e de usuários resolvidos a partir dos IDs armazenados em `tbTeamTarget`.

**Query Params:**

| Param | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `fy` | int | **Sim** | Ano fiscal (ex: `2025`) |

**Response:** `List[TargetItem]`

```json
[
  {
    "id": 12,
    "fy": 2025,
    "name": "LCI Approved Value",
    "description": "Meta de valor LCI aprovado no FY2025",
    "tasks_list": "5,12,18",
    "task_names": ["LCI Stage", "LCI Renewal", "LCI Expansion"],
    "users_list": "101,102,105",
    "user_ids": [101, 102, 105],
    "user_names": ["Alan Pimentel", "Carla Santos", "João Souza"],
    "measure_by_counting": 0,
    "measure_by_sum": 1,
    "points": 100,
    "multiplier": 0,
    "value": 1000000.0,
    "individual": 0
  }
]
```

**Campos de retorno:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | int | PK da meta (`target_id`) |
| `fy` | int | Ano fiscal |
| `name` | string | Nome da meta (`target_name`) |
| `description` | string | Descrição da meta |
| `tasks_list` | string | IDs dos task types (CSV) |
| `task_names` | string[] | Nomes dos task types resolvidos |
| `users_list` | string | IDs dos usuários (CSV) |
| `user_ids` | int[] | IDs dos usuários parseados |
| `user_names` | string[] | Nomes dos usuários resolvidos |
| `measure_by_counting` | int | `1` = medir por contagem |
| `measure_by_sum` | int | `1` = medir por somatória |
| `points` | int | Pontuação da meta (`target_point`) |
| `multiplier` | int | Multiplicador (`target_multiplier`) |
| `value` | float | Valor-alvo da meta |
| `individual` | int | `1` = meta individual; `0` = coletiva |

---

## GET `/{target_id}/measure`

Retorna as linhas de medição da view `vwMeasureTeamTarget` para uma meta específica.

**Path Params:**

| Param | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `target_id` | int | **Sim** | ID da meta |

**Sem query params.**

**Response:** `List[MeasureRow]`

```json
[
  {
    "target_id": 12,
    "target_value": 1000000.0,
    "target_individual": 0,
    "target_measurement_by_sum": 1,
    "target_measurement_by_counting": 0,
    "task_owner_id": 101,
    "task_owner_name": "Alan Pimentel",
    "activity_approved_value": 125000.0,
    "target_point": 100,
    "target_multiplier": 0
  },
  {
    "target_id": 12,
    "target_value": 1000000.0,
    "target_individual": 0,
    "target_measurement_by_sum": 1,
    "target_measurement_by_counting": 0,
    "task_owner_id": 102,
    "task_owner_name": "Carla Santos",
    "activity_approved_value": 87500.0,
    "target_point": 100,
    "target_multiplier": 0
  }
]
```

**Campos de retorno (principais):**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `target_id` | int | ID da meta |
| `target_value` | float | Valor-alvo da meta |
| `target_individual` | int | `1` = individual; `0` = coletiva |
| `target_measurement_by_sum` | int | `1` = método somatória |
| `target_measurement_by_counting` | int | `1` = método contagem |
| `task_owner_id` | int | ID do responsável pela atividade |
| `task_owner_name` | string | Nome do responsável |
| `activity_approved_value` | float | Valor da atividade aprovada |
| `target_point` | int | Pontuação da meta |
| `target_multiplier` | int | Multiplicador de pontuação |

> Os demais campos retornados dependem da definição da view `vwMeasureTeamTarget` no banco de dados.

---

## GET `` (legado)

Endpoint original mantido para compatibilidade. Retorna dados brutos de `load_fiscal_year` sem enriquecimento.

> **Preferir:** `GET /targets?fy=N` para uso no frontend React.

**Query Params:**

| Param | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `fy` | int | Não | Ano fiscal. Se omitido, retorna todos os registros. |

---

## GET `/fiscal-years` (repetido para contexto)

Usado pelo frontend para popular o `<select>` de FY antes de qualquer seleção de target.

---

## Códigos de Resposta

| Código | Significado |
|--------|-------------|
| `200` | Sucesso — retorna array (pode ser vazio `[]` se sem dados) |
| `401` | Token inválido ou expirado |
| `422` | Parâmetro obrigatório ausente (ex: `fy` não fornecido em `/targets`) |
| `500` | Erro interno do servidor (verificar logs do backend) |

---

## Exemplos de Uso (frontend)

```typescript
// 1. Carregar anos fiscais
const fyList = await apiClient.get<number[]>('/adoption/team-target/fiscal-years');

// 2. Carregar metas do FY selecionado
const targets = await apiClient.get<TargetItem[]>('/adoption/team-target/targets?fy=2025');

// 3. Carregar medição de uma meta
const measure = await apiClient.get<MeasureRow[]>('/adoption/team-target/12/measure');
```

---

## Notas de Implementação

- O endpoint `/targets` resolve nomes de task types e usuários internamente via `TaskRepository` e `UserRepository`. Em caso de erro na resolução, os arrays `task_names` e `user_names` serão retornados vazios (sem falha na requisição).
- O endpoint `/measure` normaliza as colunas numéricas `target_value` e `activity_approved_value` para float antes de retornar.
- Todos os endpoints exigem autenticação JWT. O controle de acesso por permissão (`adoption.report_team_target`) é gerenciado no frontend via `PermissionRoute` e `useAuthStore`.
- **FY Auto-Sync:** o frontend inicializa `selectedFY` com o ano corrente. Se o ano corrente não estiver na lista retornada por `/fiscal-years`, um `useEffect` seleciona automaticamente o FY mais recente disponível.
- **i18n:** todos os labels e mensagens da página são traduzidos via `useTranslation()` usando o namespace `adoption.teamTarget`. Ver detalhes em `docs/02_application/adoption/team_target.md#7-internacionalização-i18n`.
