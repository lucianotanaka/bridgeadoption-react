# API — Cisco LCI Endpoints

> **Base URL:** `/api/adoption/cisco-lci`
> **Autenticação:** Bearer Token JWT (header `Authorization: Bearer <token>`)
> **Última atualização:** 2026-08-24 (v2.8)

---

## Autenticação

Todos os endpoints requerem token JWT válido. O token é obtido via `POST /api/auth/login`.

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## GET `/report-data`

Endpoint unificado usado pela `CiscoLCIReportPage` para reduzir latência do frontend e substituir múltiplas chamadas paralelas.

**Query Params:**
| Param | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `fy` | int | Não | Ano fiscal NTT (ex: 2026). Sem filtro retorna consolidado global |

**Response:**
```json
{
  "summary": {
    "fy": 2026,
    "total_tasks": 93,
    "total_stages": 350,
    "total_approved_stages": 16,
    "total_awaiting_stages": 134,
    "total_ongoing_stages": 95,
    "total_lost_stages": 6,
    "tasks_awaiting_opt_in": 0,
    "tasks_lost_opt_in_pending": 0,
    "fin_potential": 1630000.00,
    "fin_approved": 54380.00,
    "fin_lost": 12600.00,
    "fin_conversion_rate": 0.0334
  },
  "total_eligibles": {
    "fy": 2026,
    "total_eligibles": 13810000.00,
    "n_eligibles": 245,
    "total_potential": 2390000.00,
    "n_potential": 180,
    "total_opt_in": 1630000.00,
    "n_opt_in": 93,
    "by_solution": [
      {
        "solution": "Catalyst Center",
        "eligible_count": 80,
        "eligible_value": 4500000.00,
        "potential_count": 60,
        "potential_value": 900000.00,
        "opt_in_count": 32,
        "opt_in_value": 650000.00
      }
    ]
  },
  "by_stage_status": [
    { "status": "AWAITING_CLAIM", "total_value": 402300.00, "count": 134 }
  ],
  "termination_status": [
    { "termination_status": "ON-TIME", "count": 12 }
  ],
  "burnup": {
    "fy": 2026,
    "months": [
      {
        "month": "2026-04",
        "cum_approved": 5000.00,
        "cum_lost": 0.00,
        "cum_potential": 120000.00,
        "conversion_rate": 0.0417
      }
    ]
  },
  "yoy": [
    {
      "fy": 2024,
      "fy_label": "FY 2024",
      "approved": 98000.00,
      "lost": 15000.00,
      "potential": 450000.00,
      "conversion_rate": 0.218,
      "lost_rate": 0.033
    }
  ],
  "lost_justification": [
    { "justification": "Customer Declined", "count": 12, "value": 85000.00 }
  ]
}
```

**Notas:**
- requer autenticação JWT igual aos demais endpoints do módulo
- agrega `summary`, `total_eligibles`, `by_stage_status`, `termination_status`, `burnup`, `yoy` e `lost_justification`
- substitui 8 requests paralelos no frontend
- no backend, o endpoint usa cache TTL de 5 minutos

---

## GET `/fiscal-years`

Retorna lista de anos fiscais NTT disponíveis nos dados (FY atual e anterior).

**Response:** `[2025, 2026]`

---

## GET `/summary`

KPIs financeiros e operacionais consolidados para o FY.

**Query Params:**
| Param | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `fy` | int | Não | Ano fiscal NTT (ex: 2026). Sem filtro retorna todos |

**Response:**
```json
{
  "fy": 2026,
  "total_tasks": 93,
  "total_stages": 350,
  "total_approved_stages": 16,
  "total_awaiting_stages": 134,
  "total_ongoing_stages": 95,
  "total_lost_stages": 6,
  "tasks_awaiting_opt_in": 0,
  "tasks_lost_opt_in_pending": 0,
  "fin_potential": 1630000.00,
  "fin_approved": 54380.00,
  "fin_lost": 12600.00,
  "fin_conversion_rate": 0.0334
}
```

---

## GET `/total-eligibles`

Funil Elegíveis → Potencial → Opt In com breakdown por solução.

**Query Params:**
| Param | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `fy` | int | Não | Ano fiscal NTT |

**Response:**
```json
{
  "fy": 2026,
  "total_eligibles": 13810000.00,
  "n_eligibles": 245,
  "total_potential": 2390000.00,
  "n_potential": 180,
  "total_opt_in": 1630000.00,
  "n_opt_in": 93,
  "by_solution": [
    {
      "solution": "Catalyst Center",
      "eligible_count": 80,
      "eligible_value": 4500000.00,
      "potential_count": 60,
      "potential_value": 900000.00,
      "opt_in_count": 32,
      "opt_in_value": 650000.00
    }
  ]
}
```

---

## GET `/by-stage-status`

Valor total e contagem de estágios agrupados por nome de status.

**Query Params:**
| Param | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `fy` | int | Não | Ano fiscal NTT |

**Response:**
```json
[
  { "status": "AWAITING_CLAIM", "total_value": 402300.00, "count": 134 },
  { "status": "ONGOING", "total_value": 525200.00, "count": 95 },
  { "status": "COMPLETED/CLOSED", "total_value": 54380.00, "count": 16 }
]
```

---

## GET `/termination-status`

Distribuição do `termination_status` para estágios aprovados (status_id 9 ou 10).

**Query Params:**
| Param | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `fy` | int | Não | Ano fiscal NTT |

**Response:**
```json
[
  { "termination_status": "ON-TIME", "count": 12 },
  { "termination_status": "EARLY", "count": 3 },
  { "termination_status": "LATE", "count": 1 }
]
```

---

## GET `/burnup`

Burn-up mensal acumulado para o FY (Aprovado, Perdido, Potencial, Taxa de Conversão).

**Query Params:**
| Param | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `fy` | int | **Sim** | Ano fiscal NTT |

**Lógica:** Gera os 12 meses do FY (Abr→Mar). Estágios são alocados ao mês conforme `stage_end_date`. Estágios sem data válida são alocados no último mês do FY.

**Response:**
```json
{
  "fy": 2026,
  "months": [
    {
      "month": "2026-04",
      "cum_approved": 5000.00,
      "cum_lost": 0.00,
      "cum_potential": 120000.00,
      "conversion_rate": 0.0417
    }
  ]
}
```

---

## GET `/yoy`

Comparativo Year-over-Year de conversão para os últimos 3 FYs.

**Sem parâmetros.**

**Response:**
```json
[
  {
    "fy": 2024,
    "fy_label": "FY 2024",
    "approved": 98000.00,
    "lost": 15000.00,
    "potential": 450000.00,
    "conversion_rate": 0.218,
    "lost_rate": 0.033
  }
]
```

---

## GET `/lost-justification`

Motivos de cancelamento/fechamento de tarefas (task_status_id 4 ou 5).

**Query Params:**
| Param | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `fy` | int | Não | Ano fiscal NTT |

**Response:**
```json
[
  { "justification": "Customer Declined", "count": 12, "value": 85000.00 },
  { "justification": "Not Specified", "count": 5, "value": 32000.00 }
]
```

---

## GET `/client-report/{company_id}`

Retorna o report consolidado de Cisco LCI para um cliente específico, usado em visões client-centric do módulo Portfolio.

**Path Params:**
| Param | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `company_id` | int | Sim | Identificador da companhia/cliente |

**Query Params:**
| Param | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `client_name` | string | Não | Nome do cliente para enriquecer o payload/resposta |

**Response:**
```json
{
  "company_id": 123,
  "client_name": "Example Client",
  "summary": {},
  "stages": [],
  "totals": {}
}
```

> O formato exato pode variar conforme os dados disponíveis no cliente e a implementação de `get_client_lci_report()`.

---

## GET `/stages`

Tabela detalhada de estágios filtrada por categoria de status.

**Query Params:**
| Param | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `fy` | int | Não | Ano fiscal NTT |
| `stage_status` | string | Não | `all` \| `approved` \| `awaiting` \| `ongoing` \| `lost` (default: `approved`) |

**Mapeamento de status:**
| `stage_status` | `lci_stage_status_id` | Lógica de FY |
|---|---|---|
| `all` | todos (sem filtro de status) | `lci_effective_fy == fy OR lci_stage_approval_fy == fy` |
| `approved` | 9, 10 | `lci_stage_approval_fy == fy` (fallback: `lci_effective_fy`) |
| `awaiting` | 1 | `lci_effective_fy == fy` |
| `ongoing` | 2, 3, 7, 8 | `lci_effective_fy == fy` |
| `lost` | 6 | `lci_effective_fy == fy` |

**Response:**
```json
[
  {
    "lci_task_id": 2198,
    "lci_client_name": "COMPANHIA ENERGETICA...",
    "lci_solution": "Catalyst Center",
    "lci_use_case": "Campus Network Services",
    "lci_ws": "WS-15855927",
    "lci_deal_id": "58537842",
    "lci_csm_name": "ALAN PIMENTEL",
    "lci_stage_id": 10045,
    "lci_stage_name": "Use",
    "lci_stage_ws": "WS-15855927-01",
    "lci_stage_value": 0.00,
    "lci_stage_approval_value": 0.00,
    "lci_stage_status_name": "COMPLETED/CLOSED",
    "lci_stage_end_fy": 2026,
    "stage_start_date": "2025-09-15",
    "stage_end_date": "2027-01-26",
    "termination_status": "ON-TIME",
    "lci_stage_approval_date": "2026-01-26",
    "lci_stage_approval_fy": 2025,
    "stage_amount_usd": 0.00
  }
]
```

---

## GET `/wallet-burndown`

Portfolio Burndown: evolução temporal acumulada de Opt In, Claim Approved e Pipeline.

**Query Params:**
| Param | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `date_from` | string (YYYY-MM) | Não | Mês inicial do período |
| `date_to` | string (YYYY-MM) | Não | Mês final do período |
| `fy` | int | Não | Quando fornecido, inclui `fy_summary` com valores alinhados ao Report |

**Lógica:**
- `monthly_opt_in`: `task_value` das tarefas cujo **primeiro** `stage_start_date` cai no mês
- `monthly_converted`: `stage_amount_usd` dos estágios aprovados com `approval_date` no mês
- Cumulativo: soma progressiva mês a mês
- `pipeline = max(0, cum_opt_in - cum_converted)`
- `fy_summary`: quando `fy` fornecido, retorna totais baseados em `lci_effective_fy` (mesma base do `/summary`)

**Response:**
```json
{
  "date_from": "2026-04",
  "date_to": "2027-03",
  "data_min": "2020-12",
  "data_max": "2026-08",
  "fy_summary": {
    "fy": 2026,
    "opt_in": 1630000.00,
    "approved": 54380.00,
    "lost": 12600.00,
    "conversion_rate": 0.0334,
    "pipeline": 1575620.00
  },
  "months": [
    {
      "month": "2026-04",
      "opt_in": 650000.00,
      "converted": 0.00,
      "pipeline": 650000.00,
      "monthly_opt_in": 650000.00,
      "monthly_converted": 0.00
    },
    {
      "month": "2026-05",
      "opt_in": 1300000.00,
      "converted": 54380.00,
      "pipeline": 1245620.00,
      "monthly_opt_in": 650000.00,
      "monthly_converted": 54380.00
    }
  ]
}
```

---

## Códigos de Resposta

| Código | Significado |
|--------|-------------|
| `200` | Sucesso |
| `401` | Token inválido ou expirado |
| `422` | Parâmetros de query inválidos |
| `500` | Erro interno (ver logs do backend) |

---

## Observações de Consumo no Frontend

- `frontend/src/api/ciscoLci.ts` centraliza os tipos e chamadas deste módulo
- a tela principal `CiscoLCIReportPage` prioriza `GET /report-data`
- o endpoint `/stages` aceita agora `stage_status=all` para exibir todos os stages do FY sem filtro de status
- o drill-down de task na tabela de estágios reutiliza o `TaskDetailPanel` via `GET /api/tasks/detail/{task_id}`; não existe endpoint específico novo no namespace Cisco LCI para essa interação
- apenas usuários com permissão `task.task` veem linhas clicáveis e o modal de detalhe da task
- a aba operacional também consome `GET /api/adoption/rebate/lci-journey?fy=<FY>` para a tabela analítica LCI Journey
- os 4 filtros da tabela de stages (Client, Solution, Use Case, **Task WS**) são multiselect com cascata client-side — nenhuma chamada adicional ao backend é necessária para atualizar as opções de filtro
