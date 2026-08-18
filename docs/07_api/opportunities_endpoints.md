# Adoption Opportunities — API Endpoints

> **Base path:** `/api/adoption/rebate`
> **Router:** `backend/app/adoption/extras_router.py` (`rebate_router`)
> **Service:** `backend/app/adoption/extras_service.py`
> **Autenticação:** Bearer JWT (obrigatório em todos os endpoints)
> **Última atualização:** 2026-08-17

---

## Endpoints

### GET `/api/adoption/rebate/fiscal-years`

Retorna a lista de Fiscal Years NTT disponíveis, derivada dos forecasts de adoção.

**Response:** `List[int]`

```json
[2024, 2025, 2026]
```

**Service:** `get_rebate_fiscal_years()`
**Repositório:** `AdoptionForecastRepository.load_fy_forecast()`

---

### GET `/api/adoption/rebate/sip-opportunities`

Retorna todas as oportunidades SIP do squad de Adoption (squad_id = 30), sem filtro de FY (o filtro é aplicado client-side no frontend).

**Query Parameters:** nenhum

**Response:** `List[Dict]`

```json
[
  {
    "task_id": 1234,
    "task_tasktype_name": "New Opportunity",
    "task_owner_name": "John CSM",
    "task_owner_squad_id": 30,
    "task_client_name": "Acme Corp",
    "task_reference": "REF-001",
    "task_start": "2025-04-01",
    "task_end": "2026-01-15",
    "task_days": 289,
    "task_end_fy": 2025,
    "task_status_id": 2,
    "task_status_name": "In Progress",
    "task_currency": "USD",
    "task_deal_value": 150000.00,
    "task_note": "Ongoing negotiation"
  }
]
```

**Service:** `get_rebate_sip_opportunities(squad_ids=30)`
**Repositório:** `TaskRepository.get_task_sip_new_opportunity(squad_ids=30)`
**SQL:** `SELECT * FROM vwTaskSIPNewOpportunity WHERE task_owner_squad_id IN (30) ORDER BY task_start`

---

## Endpoints herdados (não usados pelo módulo Opportunities atual)

Os endpoints abaixo ainda existem no router `rebate_router` mas não são consumidos pela página `RebatePage.tsx` na versão atual do módulo. Foram usados em versões anteriores quando o módulo incluía abas LCI e Cisco EA.

| Endpoint | Descrição | Status |
|----------|-----------|--------|
| `GET /api/adoption/rebate/summary?fy=N` | KPI summary (LCI + SIP + EA) | Não usado — KPIs calculados client-side |
| `GET /api/adoption/rebate/task-incentive?fy=N` | Tarefas de incentivo LCI | Não usado |
| `GET /api/adoption/rebate/cisco-ea` | Dados de medição Cisco EA | Não usado |
| `GET /api/adoption/rebate/lci-approved?fy=N` | LCI Aprovados | Não usado — movido para Cisco LCI |
| `GET /api/adoption/rebate/lci-journey?fy=N` | LCI Journey | Não usado — movido para Cisco LCI > Operational Overview |

> **Nota:** Os endpoints acima ainda estão registrados no router e podem ser usados por integrações futuras ou por outras páginas. Não foram removidos do backend.

---

## Autenticação

Todos os endpoints requerem token JWT válido no header:

```
Authorization: Bearer <token>
```

Retorna `401 Unauthorized` se o token for inválido ou expirado.

---

## Status Codes

| Código | Situação |
|--------|----------|
| `200 OK` | Dados retornados com sucesso |
| `401 Unauthorized` | Token ausente, inválido ou expirado |
| `500 Internal Server Error` | Erro no repositório / banco de dados |

---

## Referência de Status IDs (task_status_id)

Usados para calcular os KPIs client-side:

| IDs | Classificação |
|-----|---------------|
| 1, 2, 3, 7, 8 | **SIP In Progress** (Open, In Progress, On Hold, Awaiting, Pending) |
| 9, 10 | **SIP Approved** (Approved / Completed) |
| 4, 5, 6 | Cancelled / Declined / Lost (não contabilizados nos KPIs) |
