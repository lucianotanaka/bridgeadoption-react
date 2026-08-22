# Cisco EA — API Endpoints

> **Base path:** `/api/adoption`
> **Autenticação:** Bearer JWT (header `Authorization: Bearer <token>`)
> **Tags:** `adoption-cisco-ea-true-forward`, `adoption`

---

## 1. Endpoints True Forward

### GET `/api/adoption/cisco-ea-true-forward/report-data`

Retorna os dados unificados para a tab **True Forward** do módulo Cisco EA.
O frontend usa esses dados para todos os filtros, KPIs, gráficos e sub-tabs (Exec, Over, All, Tasks, CCW).

#### Autenticação
Bearer JWT obrigatório.

#### Resposta `200 OK`

```json
{
  "rows": [
    {
      "mcea_client_id": 1234,
      "mcea_subscription": "SUB-001",
      "mcea_suite_name": "Cisco Secure Suite",
      "mcea_sku": "SEC-SKU-001",
      "mcea_domain": "Security",
      "mcea_virtual_account": "VA-001",
      "mcea_status": "ACTIVE",
      "mcea_start_date": "2024-01-01",
      "mcea_end_date": "2026-12-31",
      "mcea_total_purchased": 500,
      "mcea_generated": 620,
      "mcea_balance": -120,
      "mcea_update": "2026-08-15",
      "customer_name": "Empresa XYZ",
      "days_to_contract_end": 132,
      "total_purchased": 500,
      "total_consumed": 620,
      "balance": -120,
      "overconsumption": 120,
      "consumption_pct": 124.0,
      "is_overconsumption": true,
      "has_task": true,
      "task_is_open": true,
      "t_task_id": 9871,
      "t_status": 2,
      "t_status_label": "Em Progresso",
      "t_track": "Cisco EA",
      "t_subtrack": "License Management",
      "t_reference": "SUB-001",
      "t_start": "2026-07-01",
      "t_end": "2026-10-31",
      "t_created_date": "2026-07-01"
    }
  ],
  "ccw": [
    {
      "end_customer": "Empresa XYZ",
      "offer_name": "EA3-M",
      "consumption_status": "Over Consumed",
      "pending_tf_effective_date": "2026-09-01",
      "ea_pending_tf_effective_date": "2026-09-01",
      "next_true_forward": "2026-09-01",
      "subscription_id": "SUB-001",
      "status": "ACTIVE",
      "start_date": "2024-01-01",
      "end_date": "2026-12-31",
      "currency": "USD",
      "tf_overage": 15000.00,
      "buying_program_id": "EA3",
      "provisioning_status": "COMPLETE",
      "ea_consumed_suite_value_percent": 124.0,
      "ea_exceptional_growth_anniversary": null,
      "ea_exceptional_growth_tf_eligible": null,
      "_days_to_end": 132
    }
  ]
}
```

#### Campos da lista `rows`

| Campo | Tipo | Descrição |
|---|---|---|
| `mcea_client_id` | int | ID do cliente no sistema |
| `mcea_subscription` | string | ID da subscription EA |
| `mcea_suite_name` | string | Nome da suite EA |
| `mcea_sku` | string | SKU do produto |
| `mcea_domain` | string | Domínio da solução |
| `mcea_virtual_account` | string | Virtual Account Cisco |
| `mcea_status` | string | Status da subscription |
| `mcea_start_date` | date | Início do contrato |
| `mcea_end_date` | date | Fim do contrato |
| `mcea_total_purchased` | int | Licenças contratadas (com growth allowance) |
| `mcea_generated` | int | Licenças geradas/consumidas |
| `mcea_balance` | int | Saldo (negativo = excesso) |
| `mcea_update` | date | Data da última medição |
| `customer_name` | string | Nome do cliente (via `mcea_client` ou `tbCompany`) |
| `days_to_contract_end` | int\|null | Dias até vencimento (negativo = expirado) |
| `total_purchased` | int | Alias de `mcea_total_purchased` |
| `total_consumed` | int | Alias de `mcea_generated` |
| `balance` | int | Alias de `mcea_balance` |
| `overconsumption` | int | `abs(balance)` quando `balance < 0`, else 0 |
| `consumption_pct` | float | `(total_consumed / total_purchased) × 100` |
| `is_overconsumption` | bool | `true` quando `balance < 0` |
| `has_task` | bool | `true` quando existe tarefa tipo 35 para este par |
| `task_is_open` | bool | `true` quando tarefa está em status 1, 2 ou 3 |
| `t_task_id` | int\|null | ID da tarefa associada |
| `t_status` | int\|null | Status ID da tarefa |
| `t_status_label` | string | Descrição do status da tarefa |
| `t_track` | string\|null | Track da tarefa |
| `t_subtrack` | string\|null | Subtrack da tarefa |
| `t_reference` | string\|null | Referência (ws/subscription) da tarefa |
| `t_start` | date\|null | Data de início da tarefa |
| `t_end` | date\|null | Data de fim da tarefa |
| `t_created_date` | date\|null | Data de criação da tarefa |

#### Campos da lista `ccw`

| Campo | Tipo | Descrição |
|---|---|---|
| `end_customer` | string | Nome do cliente final |
| `offer_name` | string | Tipo de oferta (EA3-M, ELA2-M, A-FLEX, etc.) |
| `consumption_status` | string | Status CCW (Over Consumed, Within Entitlements, etc.) |
| `pending_tf_effective_date` | date | Data efetiva pendente do TF |
| `ea_pending_tf_effective_date` | date | Data efetiva pendente do TF EA |
| `next_true_forward` | date | Próxima data de True Forward |
| `subscription_id` | string | ID da subscription |
| `status` | string | Status da subscription |
| `start_date` | date | Início da subscription |
| `end_date` | date | Fim da subscription |
| `currency` | string | Moeda |
| `tf_overage` | float | Valor do True Forward Overage (USD) |
| `buying_program_id` | string | ID do programa de compra |
| `provisioning_status` | string | Status de provisionamento |
| `ea_consumed_suite_value_percent` | float | Percentual consumido da suite (convertido: 0.25 → 25.0) |
| `ea_exceptional_growth_anniversary` | date\|null | Data de aniversário de Exceptional Growth |
| `ea_exceptional_growth_tf_eligible` | string\|null | Elegibilidade para Exceptional Growth TF |
| `_days_to_end` | int\|null | Dias até vencimento (calculado no backend) |

#### Erros

| Código | Descrição |
|---|---|
| `401 Unauthorized` | Token ausente ou inválido |
| `500 Internal Server Error` | Falha no backend (ver logs do serviço) |

---

## 2. Endpoints Metering (Rebate)

### GET `/api/adoption/rebate/cisco-ea`

Retorna os dados de medição Cisco EA com nomes de clientes enriquecidos.
Usado pela aba **Metering** do módulo Cisco EA.

#### Autenticação
Bearer JWT obrigatório.

#### Resposta `200 OK`

```json
[
  {
    "mcea_client_id": 1234,
    "mcea_client": "Empresa XYZ",
    "mcea_subscription": "SUB-001",
    "mcea_suite_name": "Cisco Secure Suite",
    "mcea_sku": "SEC-SKU-001",
    "mcea_domain": "Security",
    "mcea_virtual_account": "VA-001",
    "mcea_status": "ACTIVE",
    "mcea_start_date": "2024-01-01",
    "mcea_end_date": "2026-12-31",
    "mcea_purchased": 500,
    "mcea_total_purchased": 500,
    "mcea_generated": 410,
    "mcea_balance": 90,
    "mcea_update": "2026-08-15",
    "customer_name": "Empresa XYZ"
  }
]
```

**Nota:** `customer_name` é resolvido pelo backend com a seguinte prioridade:
1. `mcea_client` da `vwCiscoEAMeteringLatest` (via `get_sqlalchemy_engine()` + `pd.read_sql`)
2. Join com `vwCustomerCiscoEAConsolidated.customer_name`
3. Fallback: `mcea_client_id` como string

---

### GET `/api/adoption/rebate/summary`

Retorna o resumo de KPIs para Rebate & Oportunidades, incluindo o KPI **EA Gerado %**.

#### Query Parameters

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `fy` | int | ✓ | Ano fiscal NTT (ex: 2026) |

#### Resposta `200 OK` (campos relevantes para Cisco EA)

```json
{
  "fy": 2026,
  "ea_generated_pct": "81.4%",
  ...
}
```

| Campo | Descrição |
|---|---|
| `ea_generated_pct` | Percentual de licenças EA geradas sobre as contratadas, para contratos com `mcea_end_date >= hoje` |

---

## 3. Tabela de Endpoints

| Método | Endpoint | Módulo | Descrição |
|---|---|---|---|
| GET | `/api/adoption/cisco-ea-true-forward/report-data` | True Forward | Dados unificados para a tab True Forward |
| GET | `/api/adoption/rebate/cisco-ea` | Metering | Dados de medição EA com `customer_name` |
| GET | `/api/adoption/rebate/summary?fy={fy}` | Metering | KPIs incluindo EA Gerado % |
| GET | `/api/adoption/rebate/fiscal-years` | Metering | Anos fiscais disponíveis |

---

## 4. Fluxo de Dados

### 4.1 Metering

```
Frontend (CiscoEAPage.tsx)
  └── GET /api/adoption/rebate/cisco-ea
        └── extras_service.get_rebate_cisco_ea()
              ├── pd.read_sql(SELECT mcea_client_id, mcea_client, ... FROM vwCiscoEAMeteringLatest)
              └── Enriquece customer_name via mcea_client / vwCustomerCiscoEAConsolidated / fallback
```

### 4.2 True Forward

```
Frontend (CiscoEATrueForwardTab.tsx)
  └── GET /api/adoption/cisco-ea-true-forward/report-data
        └── cisco_ea_true_forward_service.get_true_forward_report_data()
              ├── _load_and_merge()
              │     ├── pd.read_sql(SELECT ... FROM vwCiscoEAMeteringLatest)
              │     ├── Enriquece customer_name
              │     ├── task_repo.find_ids_by({"task_tasktype_id": 35})
              │     ├── task_repo.get_task(task_id=...) → merge por cliente+subscription
              │     └── Calcula campos derivados (days_to_contract_end, overconsumption, etc.)
              └── _load_ccw()
                    └── ea_repo.load_cisco_ea_subscription_report()
```

---

## 5. Arquivos de Implementação

| Camada | Arquivo |
|---|---|
| Router True Forward | `backend/app/adoption/cisco_ea_true_forward_router.py` |
| Service True Forward | `backend/app/adoption/cisco_ea_true_forward_service.py` |
| Service Metering | `backend/app/adoption/extras_service.py` → `get_rebate_cisco_ea()` |
| Router Metering | `backend/app/adoption/extras_router.py` → `rebate_router` |
| Cliente API Frontend | `frontend/src/api/ciscoEATrueForward.ts` |
| Registro em main.py | `backend/app/main.py` → `app.include_router(cisco_ea_true_forward_router)` |

---

## 6. Referências

- **Documentação da aplicação:** `docs/02_application/portfolio/cisco_ea.md`
- **Fonte Streamlit:** `webapp/pages/portfolio/report_cisco_true_forward.py`
- **Repository Cisco EA:** `src/infrastructure/database/repositories/cisco_ea_repository.py`
