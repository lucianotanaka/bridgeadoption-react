# Portfólio — Cisco EA

> **Rota:** `/portfolio/cisco-ea`
> **resource_key:** `portfolio.cisco_enterprise_agreement`
> **Arquivo frontend:** `frontend/src/pages/portfolio/CiscoEAPage.tsx`
> **Fonte Streamlit:** `webapp/pages/portfolio/report_cisco_true_forward.py`
> **Status:** ✅ Migrado para React — migração completa em 2026-08-21

---

## 1. Propósito

O módulo **Cisco EA** é o painel de gestão de licenças Cisco Enterprise Agreement. Fornece visibilidade completa do consumo de licenças EA por cliente, permitindo monitoramento preventivo do **True Forward** — mecanismo da Cisco onde o cliente é cobrado pelo pico de consumo atingido durante o período do contrato (efeito de catraca).

O módulo está organizado em duas abas:

| Aba | Descrição |
|---|---|
| **Metering** | Visão de consumo de licenças por suite, com filtro por cliente, KPIs e gráfico |
| **True Forward** | Relatório completo de consumo excedente, tarefas e subscriptions CCW |

---

## 2. Aba Metering

### 2.1 Funcionalidades

- **Filtro Cliente** (multiselect dropdown com busca): filtra todas as métricas e gráficos pelo(s) cliente(s) selecionado(s)
- **KPIs** (3 cartões na mesma linha, filtrados por cliente quando selecionado):
  - **EA Gerado** — percentual gerado/contratado das licenças ativas
  - **Total Contratado** — soma de `mcea_purchased` dos contratos ativos
  - **Total Gerado** — soma de `min(mcea_generated, mcea_purchased)` dos contratos ativos
- **Gráfico de barras horizontais** — "EA LICENSES GENERATED % BY SUITE": exibe o percentual de geração por suite, filtrado pelo cliente selecionado
- **Tabela Cisco EA** — exibida somente quando ao menos um cliente está selecionado; mostra: Cliente, Suite, Purchased, Generated, Start, End

### 2.2 Fontes de Dados

| View/Tabela | Endpoint | Descrição |
|---|---|---|
| `vwCiscoEAMeteringLatest` | `GET /api/adoption/rebate/cisco-ea` | Último snapshot de consumo por SKU/subscription |
| `vwCustomerCiscoEAConsolidated` | (via join interno) | Nomes dos clientes enriquecidos via `mcea_client` ou join com `tbCompany` |
| `GET /api/adoption/rebate/summary` | KPI EA Gerado % | Percentual calculado no backend para o ano fiscal corrente |

### 2.3 Regras de Negócio

- Apenas contratos com `mcea_end_date >= hoje` são considerados para KPIs e gráfico (contratos ativos)
- **EA Gerado %** sem filtro = valor do backend (`get_rebate_summary`); com filtro de cliente = calculado local `(tg / tp × 100)%`
- A tabela só é exibida quando o usuário seleciona ao menos um cliente no filtro

---

## 3. Aba True Forward

### 3.1 Conceito de Negócio

O **True Forward** da Cisco é o mecanismo onde o cliente é cobrado pelo pico de consumo atingido durante o contrato. Uma vez que o consumo supera a quantidade contratada, o cliente passa a pagar pelo nível mais alto pelo restante da vigência.

### 3.2 Filtros Principais

| Filtro | Tipo | Opções |
|---|---|---|
| **Visão** | Select | Somente Consumo Excedente (padrão) / Alto Consumo (≥85%) / Todos os Registros |
| **Cliente** | Dropdown multiselect com busca | Todos os clientes da base de medição |
| **Status Tarefa** | Select | Todos / Com tarefa aberta / Sem tarefa / Com tarefa encerrada |
| **Urgência** | Select | Todos / Crítico (≤30d) / Atenção (≤90d) / Expirado |

### 3.3 KPIs

| KPI | Cálculo |
|---|---|
| Total de Casos | Total de linhas após filtros |
| Clientes Afetados | Clientes únicos com consumo excedente |
| Total Excedente | Soma de `overconsumption` (quando `balance < 0`) |
| Sem Tarefa Aberta | Casos com excesso sem tarefa tipo 35 aberta |
| Com Tarefa Aberta | Casos com excesso com tarefa tipo 35 em aberto |
| Críticos (vence ≤30d) | Casos com excesso e `days_to_contract_end` ≤ 30 |

### 3.4 Gráficos

| Gráfico | Tipo | Descrição |
|---|---|---|
| Top Clientes por Suite | Barras empilhadas | Top 30 clientes com mais excesso, segmentado por suite |
| Urgência de Vencimento | Pizza | Distribuição dos casos por bucket de urgência |
| Status de Tarefa | Pizza | Distribuição: Tarefa Aberta / Tarefa Encerrada / Sem Tarefa |
| Evolução Temporal | Linha dupla | Total excedente e Qtd. Casos por data de medição |

### 3.5 Sub-tabs de Detalhamento

| Sub-tab | Conteúdo |
|---|---|
| **Visão Executiva** | Consolidado por cliente: excesso total, suites afetadas, nível de risco, cobertura de tarefas. Inclui ranking horizontal colorizado por risco |
| **Consumo Excedente** | Tabela detalhada dos casos com `balance < 0` |
| **Todos os Casos** | Dataset completo pós-filtros |
| **Tarefas Abertas** | Casos com tarefa tipo 35 em status aberto/progresso/aguardando |
| **CCW Subscriptions** | Subscriptions importadas via CCW com 7 filtros multiselect e 5 KPIs de alerta |

### 3.6 Sub-tab CCW — Filtros

| Filtro | Descrição |
|---|---|
| End Year | Ano de vencimento da subscription |
| Coverage End | Bucket de cobertura: Expired / < 30 Days / 31-60 Days ... / > 1 Year |
| Consumption Status | Status de consumo CCW (Over Consumed, Within Entitlements, etc.) |
| Consumed Range | Range de consumo: Not Applicable / Up to 50% / ... / Above 115% |
| Ano/Mês Venc. | Mês/ano de vencimento |
| Ano/Mês Next TF | Mês/ano do próximo True Forward |
| EA ou Term | Tipo de produto: EA (EA3-M, ELA2-M, A-FLEX, A-FLEX-3) ou Term |

---

## 4. Fontes de Dados

### 4.1 Fontes do True Forward

| View/Tabela | Descrição |
|---|---|
| `vwCiscoEAMeteringLatest` | Último snapshot de consumo por SKU/subscription. Campo `mcea_client` contém o nome do cliente |
| `vwCustomerCiscoEAConsolidated` | Dados consolidados por cliente com `customer_name` via `tbCompany` |
| `tbTask` / `vwTask` (type 35) | Tarefas "Consumo Excedente: CISCO EA" vinculadas por `task_ws = mcea_subscription` |
| CCW subscription report | Subscriptions importadas via CCW (`load_cisco_ea_subscription_report`) |

### 4.2 Campos Derivados (calculados no backend)

| Campo | Cálculo |
|---|---|
| `days_to_contract_end` | `mcea_end_date - hoje` (dias) |
| `total_purchased` | `mcea_total_purchased` (licenças contratadas) |
| `total_consumed` | `mcea_generated` |
| `balance` | `mcea_balance` (negativo = excesso) |
| `overconsumption` | `abs(balance)` quando `balance < 0`, else 0 |
| `consumption_pct` | `(total_consumed / total_purchased) × 100` |
| `is_overconsumption` | `balance < 0` |
| `task_is_open` | `t_status IN (1, 2, 3)` |

---

## 5. Arquitetura Técnica

### 5.1 Frontend

```
CiscoEAPage (frontend/src/pages/portfolio/CiscoEAPage.tsx)
├── Tab: Metering
│   ├── Filtro Cliente (multiselect dropdown)
│   ├── KPIs: EA Gerado / Total Contratado / Total Gerado
│   ├── Gráfico: EA Licenses Generated % by Suite
│   └── Tabela: Cisco EA (visível apenas com cliente selecionado)
│
└── Tab: True Forward
    ├── (CiscoEATrueForwardTab — frontend/src/pages/ciscoEA/CiscoEATrueForwardTab.tsx)
    ├── Filtros: Visão / Cliente / Status Tarefa / Urgência
    ├── KPIs (6 cartões)
    ├── Gráficos: Barras / 2× Pizza / Linha temporal
    └── Sub-tabs: Exec | Over | All | Tasks | CCW Subscriptions
```

### 5.2 Arquivos Frontend

| Arquivo | Descrição |
|---|---|
| `frontend/src/pages/portfolio/CiscoEAPage.tsx` | Componente principal com as 2 abas |
| `frontend/src/pages/ciscoEA/CiscoEATrueForwardTab.tsx` | Tab True Forward completa |
| `frontend/src/pages/ciscoEA/TFHelpers.tsx` | Constantes, helpers, badges e KPI |
| `frontend/src/pages/ciscoEA/TFTable.tsx` | Tabela paginada com export Excel |
| `frontend/src/api/ciscoEATrueForward.ts` | Cliente da API True Forward |

### 5.3 Backend — Services

| Service | Arquivo | Funções principais |
|---|---|---|
| Metering (Rebate) | `backend/app/adoption/extras_service.py` | `get_rebate_cisco_ea()`, `get_rebate_summary()` |
| True Forward | `backend/app/adoption/cisco_ea_true_forward_service.py` | `get_true_forward_report_data()`, `_load_and_merge()`, `_load_ccw()` |

### 5.4 Backend — Routers

| Router | Arquivo | Prefixo |
|---|---|---|
| Rebate (Metering) | `backend/app/adoption/extras_router.py` | `/api/adoption/rebate` |
| True Forward | `backend/app/adoption/cisco_ea_true_forward_router.py` | `/api/adoption/cisco-ea-true-forward` |

---

## 6. Permissões

- **resource_key:** `portfolio.cisco_enterprise_agreement`
- **action:** `read`
- **ADMIN:** acesso total automático

---

## 7. Internacionalização (i18n)

As traduções estão em `frontend/src/i18n/locales/{lang}.json` sob a chave `portfolio.ciscoEA`:

```json
{
  "portfolio": {
    "ciscoEA": {
      "title": "Portfolio — Cisco EA",
      "subtitle": "Cisco Enterprise Agreement — License Report",
      "eaGenerated": "EA Generated",
      "totalPurchased": "Total Purchased",
      "totalGenerated": "Total Generated",
      "tabMetering": "Metering",
      "tabTrueForward": "True Forward",
      "filterCustomer": "Customer",
      "filterClear": "Clear",
      "trueForward": { ... }
    }
  }
}
```

Idiomas suportados: **PT** (Português), **EN** (English), **ES** (Español).

---

## 8. Referências

- **API endpoints:** `docs/07_api/cisco_ea_endpoints.md`
- **Módulo Portfolio:** `docs/02_application/module_portfolio.md`
- **Fonte Streamlit:** `webapp/pages/portfolio/report_cisco_true_forward.py`
- **Service Metering:** `backend/app/adoption/extras_service.py`
- **Service True Forward:** `backend/app/adoption/cisco_ea_true_forward_service.py`
