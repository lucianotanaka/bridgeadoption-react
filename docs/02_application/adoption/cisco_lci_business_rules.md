# Cisco LCI — Regras de Negócio e Dicionário de Dados

> **Módulo:** Cisco LCI (Life Cycle Incentive)
> **Última atualização:** 2026-08-16

---

## 1. Ano Fiscal NTT (NTT Fiscal Year — FY)

| Regra | Detalhe |
|-------|---------|
| **Início do FY** | 1º de Abril de cada ano |
| **Fim do FY** | 31 de Março do ano seguinte |
| **FY 2026** | Abril/2026 → Março/2027 |
| **Cálculo** | `fy = year if month >= 4 else year - 1` |
| **Campo calculado** | `lci_effective_fy` (prioridade: approval_fy → stage_end_fy → task_end_fy) |

---

## 2. Fluxo de Uma Tarefa LCI

```
1. Tarefa (Task) criada com task_eligible = "Y"
         │
2. CSM executa atividade com o cliente
         │
3. Stage (Estágio) é registrado no sistema Cisco
         │
4. Stage Status = AWAITING (status_id=1) — submetido para aprovação
         │
5. Cisco analisa e aprova ou rejeita
         │
   ┌─────┴─────┐
Aprovado     Reprovado
(9 ou 10)       (6)
   │
   └─ Termination Status: EARLY | ON-TIME | LATE
```

---

## 3. Regras de Cálculo dos KPIs

### 3.1 Total Elegíveis
```
Total Elegíveis = Σ task_value
                  para todas as tarefas com task_eligible = "Y"
                  e lci_effective_fy = FY selecionado
```

### 3.2 Potencial Total — Regra de Deduplicação
O potencial elimina duplicatas de oportunidades múltiplas para o mesmo cliente/deal/track:

```python
# Agrupa por chave (task_cr_party_id, task_deal_id, task_track)
# Para cada grupo:
  if todos os status são OPEN(1) ou ON_HOLD(3):
    mantém apenas a tarefa com MENOR task_value
  else:
    mantém TODAS as tarefas com status ativo (não cancelado)

Total Potencial = Σ task_value das tarefas selecionadas
```

**Objetivo:** Evitar contagem dupla quando um cliente tem múltiplas versões de uma mesma oportunidade pendente.

### 3.3 Total Opt In
```
Total Opt In = Σ task_value
               para tarefas com task_eligible="Y"
               E task_status NOT IN (4=Cancelled, 5=Closed)
               E que possuem ao menos 1 estágio registrado com lci_effective_fy = FY
```

**O Opt In representa o valor da carteira que entrou no processo de aprovação Cisco.**

### 3.4 Total Capturado (Claim Approved)
```
Total Capturado = Σ stage_amount_usd
                  para estágios com lci_stage_status_id IN (9, 10)
                  e lci_effective_fy = FY selecionado
```

### 3.5 Perdidos
```
Perdidos = Σ stage_amount_usd
            para estágios com lci_stage_status_id = 6
            e lci_effective_fy = FY selecionado
```

### 3.6 Taxa de Conversão
```
Taxa de Conversão = Total Capturado / Total Opt In
```

---

## 4. Regra do `stage_amount_usd`

Este campo representa o **valor financeiro efetivo** de cada estágio:

```python
if lci_stage_status_id == 10:
    stage_amount_usd = lci_stage_approval_value  # Cisco aprovou com valor específico
else:
    stage_amount_usd = lci_stage_value           # Valor estimado original
```

**Por quê?** O status 10 indica aprovação com valor real confirmado pela Cisco, que pode diferir do valor estimado originalmente.

---

## 5. Dicionário de Dados — Campos Principais

### 5.1 Task (Tarefa LCI)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `task_id` | int | ID único da tarefa |
| `task_value` | decimal | Valor de incentivo estimado da tarefa (USD) |
| `task_ws` | string | Work Share (WS) associado à tarefa |
| `task_track` | string | Trilha/Solução Cisco (ex: "Catalyst Center", "Duo") |
| `task_deal_id` | string | ID do deal Cisco |
| `task_cr_party_id` | string | ID da parte contratante Cisco |
| `task_eligible` | string | "Y" se a tarefa é elegível ao LCI |
| `task_status_id` | int | Status da tarefa (ver tabela 5.3) |
| `task_end_fy` | int | FY NTT de encerramento da tarefa |
| `task_status_justification` | string | Motivo de cancelamento/fechamento |

### 5.2 Stage (Estágio LCI)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `lci_stage_id` | int | ID único do estágio |
| `lci_stage_name` | string | Nome do estágio (Onboard, Use, Adopt, etc.) |
| `lci_stage_status_id` | int | Status do estágio (ver tabela 5.4) |
| `lci_stage_status_name` | string | Nome textual do status |
| `lci_stage_value` | decimal | Valor estimado do estágio (USD) |
| `lci_stage_approval_value` | decimal | Valor aprovado pela Cisco (USD) |
| `lci_stage_ws` | string | Work Share (WS) do estágio/atividade |
| `lci_stage_performed_start` | date | Data início real (performed) |
| `lci_stage_estimated_start` | date | Data início estimada |
| `lci_stage_performed_end` | date | Data fim real (performed) |
| `lci_stage_estimated_end` | date | Data fim estimada |
| `lci_stage_approval_date` | date | Data da aprovação Cisco |
| `lci_stage_approval_fy` | int | FY NTT da aprovação |
| `termination_status` | string | EARLY / ON-TIME / LATE |

### 5.3 Status de Tarefa (task_status_id)
| ID | Nome | Significado |
|----|------|-------------|
| 1 | OPEN | Tarefa aberta/ativa |
| 3 | ON_HOLD | Tarefa em espera |
| 4 | CANCELLED | Cancelada — excluída dos cálculos financeiros |
| 5 | CLOSED | Fechada — excluída dos cálculos financeiros |
| 6 | LOST | Perdida |

### 5.4 Status de Estágio (lci_stage_status_id)
| ID | Categoria | Nome Típico | Significado |
|----|-----------|-------------|-------------|
| 1 | AWAITING | AWAITING_CLAIM | Submetido, aguardando aprovação Cisco |
| 2, 3, 7, 8 | ONGOING | Em andamento | Estágio em execução |
| 6 | LOST | LOST/REJECTED | Reprovado ou não atingiu critério |
| 9 | APPROVED | COMPLETED/CLOSED | Aprovado (usa `lci_stage_value`) |
| 10 | APPROVED | COMPLETED/CLOSED | Aprovado (usa `lci_stage_approval_value`) |

### 5.5 Campos Calculados pelo Backend
| Campo | Calculado como | Descrição |
|-------|---------------|-----------|
| `stage_start_date` | `lci_stage_performed_start` OR `lci_stage_estimated_start` | Data de início efetiva do estágio |
| `stage_end_date` | `lci_stage_performed_end` OR `lci_stage_estimated_end` | Data de fim efetiva do estágio |
| `stage_amount_usd` | `approval_value` if status=10 else `stage_value` | Valor financeiro efetivo do estágio |
| `lci_stage_end_fy` | `_calculate_fy(stage_end_date)` | FY baseado na data de fim do estágio |
| `lci_effective_fy` | `approval_fy OR stage_end_fy OR task_end_fy` | FY efetivo usado para filtros |
| `lci_ws` | `task_ws` | WS da tarefa (coluna "Task WS" na tabela) |
| `lci_stage_ws` | `activity_ws` ou `stage_ws` | WS do estágio (coluna "Activity WS" na tabela) |

---

## 6. Regras de Exibição na Tabela de Estágios

### 6.1 Valor USD (`stage_amount_usd`)
Usar `lci_stage_approval_value` quando `lci_stage_status_id == 10`, caso contrário `lci_stage_value`.

### 6.2 Deduplicação de Estágios
A tabela deduplicada por `lci_stage_id` — cada estágio aparece apenas uma vez, mesmo que a join retorne múltiplas linhas.

### 6.3 Colunas WS
- **Task WS**: WS da tarefa principal (`task_ws`) — identifica o Work Share pai
- **Activity WS**: WS do estágio/atividade (`activity_ws`) — identifica o Work Share específico da atividade LCI

---

## 7. Regras do Portfolio Burndown

### 7.1 Opt In Mensal (Gráfico Temporal)
```
Para cada tarefa ativa (não cancelada):
  Encontrar a data do PRIMEIRO stage registrado (min stage_start_date)
  Agrupar task_value pelo mês dessa data
```
**Objetivo:** Mostrar quando a carteira "entrou" no processo LCI mês a mês.

### 7.2 Aprovado Mensal (Gráfico Temporal)
```
Para cada estágio aprovado (status 9 ou 10):
  Usar a lci_stage_approval_date como referência
  Somar stage_amount_usd no mês correspondente
```
**Objetivo:** Mostrar quando a Cisco efetivamente aprovou as atividades mês a mês.

### 7.3 Consistência KPIs vs. Cisco LCI Report
Os cards KPI do Portfolio Burndown usam `fy_summary` (calculado com `lci_effective_fy = FY`) para garantir que os totais de Opt In e Aprovado sejam **idênticos** ao Cisco LCI Report Financial Overview quando o mesmo FY está selecionado.

| Painel | Opt In | Aprovado |
|--------|--------|----------|
| Cisco LCI Report | `task_value` por `lci_effective_fy` | `stage_amount_usd` por `lci_effective_fy` |
| Portfolio Burndown KPIs | **Idem** (`fy_summary`) | **Idem** (`fy_summary`) |
| Portfolio Burndown Gráficos | `task_value` por `stage_start_date` | `stage_amount_usd` por `approval_date` |

---

## 8. Termination Status

O campo `termination_status` indica se o estágio foi concluído dentro do prazo acordado:

| Valor | Significado |
|-------|-------------|
| `EARLY` | Concluído antes do prazo estimado |
| `ON-TIME` | Concluído dentro do prazo estimado |
| `LATE` | Concluído após o prazo estimado |
| `null` / vazio | Não aplicável ou não informado |

---

## 9. Sources de Dados

| Fonte | Tipo | Dados |
|-------|------|-------|
| `vwCustomerCiscoLCIDealTrackProjectStatus` | SQL View | Estágios LCI (find_all) |
| `vwCustomerCiscoLCITrackProjectPM` | SQL View | Tarefas LCI (load_cisco_lci_all) |

Ver documentação detalhada das views em:
- `docs/03_database/vwCustomerCiscoLCIDealTrackProjectStatus.md`
- `docs/03_database/vwCustomerCiscoLCITrackProjectPM.md`
