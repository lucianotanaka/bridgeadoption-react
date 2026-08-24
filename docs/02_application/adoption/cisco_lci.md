# Módulo Cisco LCI — Documentação Completa

> **Rota frontend:** `/adoption/cisco-lci`
> **resource_key:** `adoption.report_cisco_lci`
> **Última atualização:** 2026-08-24

---

## 1. Visão Geral

O módulo **Cisco LCI (Life Cycle Incentive)** é o painel central de acompanhamento do programa de incentivos do ciclo de vida da Cisco. Ele exibe o desempenho por estágio LCI, valores de incentivo potenciais e capturados, além de análises de burndown e evolução temporal do pipeline — tudo filtrado pelo **Ano Fiscal NTT (FY)**.

O **Ano Fiscal NTT começa em Abril e termina em Março** do ano seguinte. Exemplo: FY 2026 = Abril/2026 a Março/2027.

---

## 2. Estrutura de Abas (Tabs)

O módulo é composto por **4 abas**, compartilhando o seletor de FY no topo:

| Aba | Componente | Objetivo |
|-----|-----------|----------|
| **Cisco LCI Report** | `CiscoLCIReportPage.tsx` | Visão financeira e operacional consolidada do FY |
| **Portfolio Burndown** | `CiscoLCIPortfolioBurndownPage.tsx` | Evolução temporal acumulada do pipeline LCI |
| **Eligible Status** | `CiscoLCIEligibleStatusPage.tsx` | Lista de tarefas elegíveis ao LCI por status |
| **Solution vs Project** | `CiscoLCISolutionVsProjectPage.tsx` | Cruzamento entre solução Cisco e projeto NTT |

**Arquivo de composição:** `frontend/src/pages/ciscoLci/CiscoLCIPage.tsx`

---

## 3. Conceitos de Negócio

### 3.1 Ano Fiscal NTT (FY)
- Inicia em **1º de Abril** e termina em **31 de Março** do ano seguinte
- FY 2026 = Abr/2026 → Mar/2027
- O campo `lci_effective_fy` é calculado com base na data de fim do estágio ou data de aprovação:
  - Prioridade: `lci_stage_approval_fy` → `lci_stage_end_fy` → `lci_task_end_fy`

### 3.2 Hierarquia de Dados
```
Task (Tarefa LCI)
  └── Stage (Estágio LCI)
        ├── Stage Status (status do estágio)
        ├── Stage Value (valor estimado)
        └── Stage Approval Value (valor aprovado pela Cisco)
```

### 3.3 Estágios LCI (Cisco)
Os estágios representam fases do ciclo de vida da solução Cisco adotada pelo cliente:

| Estágio | Descrição |
|---------|-----------|
| **Onboard** | Embarque inicial do cliente na solução |
| **Implement** | Implementação técnica |
| **Use** | Uso ativo da solução |
| **Engage** | Engajamento aprofundado |
| **Adopt** | Adoção plena |
| **Expand** | Expansão de escopo |
| **Renew** | Renovação do contrato |

### 3.4 Status de Estágio (IDs)
| ID(s) | Categoria | Descrição |
|-------|-----------|-----------|
| 9, 10 | **Approved** | Estágio aprovado pela Cisco. Status 10 usa `lci_stage_approval_value` |
| 1 | **Awaiting** | Aguardando aprovação Cisco |
| 2, 3, 7, 8 | **Ongoing** | Em andamento (em execução) |
| 6 | **Lost** | Perdido/reprovado |

### 3.5 Status de Tarefa (Task)
| ID(s) | Categoria |
|-------|-----------|
| 1, 3 | Open / On Hold |
| 4, 5 | Cancelled / Closed (excluídos de cálculos financeiros) |
| 6 | Lost |

### 3.6 Regra do `stage_amount_usd`
Campo calculado no backend que representa o **valor efetivo do estágio**:
```python
stage_amount_usd = lci_stage_approval_value  # se status_id == 10
stage_amount_usd = lci_stage_value           # para todos os outros status
```

---

## 4. Métricas e Definições

### 4.1 Total Eligíveis
Soma de `task_value` de **todas** as tarefas elegíveis ao LCI para o FY selecionado (sem filtros de status).

### 4.2 Potencial Total
Soma de `task_value` das tarefas elegíveis **não canceladas**, aplicando regra de deduplicação:
- Agrupa por `(task_cr_party_id, task_deal_id, task_track)`
- Grupos onde **todos** os status são OPEN(1)/ON_HOLD(3): mantém apenas a tarefa de **menor valor**
- Grupos com qualquer outro status ativo: mantém todas as tarefas

### 4.3 Total Opt In
Soma de `task_value` das tarefas elegíveis ativas (não canceladas) que possuem **ao menos um estágio LCI registrado** para o FY. Representa o valor da carteira que entrou no processo de aprovação Cisco.

### 4.4 Total Capturado (Claim Approved)
Soma de `stage_amount_usd` dos estágios com `status_id` em {9, 10} para o FY selecionado.

### 4.5 Perdidos
Soma de `stage_amount_usd` dos estágios com `status_id = 6` para o FY selecionado.

### 4.6 Taxa de Conversão
```
Taxa de Conversão = Total Capturado / Total Opt In
```

---

## 5. Arquitetura Backend

### 5.1 Arquivos
| Arquivo | Função |
|---------|--------|
| `backend/app/adoption/cisco_lci_service.py` | Toda a lógica de negócio |
| `backend/app/adoption/cisco_lci_router.py` | Endpoints FastAPI |
| `src/infrastructure/database/repositories/cisco_lci_repository.py` | Acesso ao banco (legado) |

### 5.2 Repositório
O `CiscoLCIRepository` fornece dois métodos principais:
- `find_all(task_eligible="Y")` — retorna todos os registros de estágios LCI com tarefas elegíveis (join task ↔ stage)
- `load_cisco_lci_all(fy=None)` — retorna tarefas LCI elegíveis (nível de tarefa, com `task_value`)

### 5.3 Funções de Serviço

| Função | Endpoint | Descrição |
|--------|----------|-----------|
| `get_lci_fiscal_years()` | `GET /fiscal-years` | Lista FYs disponíveis (FY atual e anterior) |
| `get_lci_summary(fy)` | `GET /summary?fy=` | KPIs financeiros e operacionais |
| `get_lci_total_eligibles(fy)` | `GET /total-eligibles?fy=` | Funil Elegíveis→Potencial→Opt In |
| `get_lci_by_stage_status(fy)` | `GET /by-stage-status?fy=` | Valor e contagem por status de estágio |
| `get_lci_termination_status(fy)` | `GET /termination-status?fy=` | Distribuição do termination_status (aprovados) |
| `get_lci_burnup(fy)` | `GET /burnup?fy=` | Burn-up mensal acumulado no FY |
| `get_lci_yoy()` | `GET /yoy` | Comparativo YoY de conversão (últimos 3 FYs) |
| `get_lci_lost_justification(fy)` | `GET /lost-justification?fy=` | Motivos de cancelamento de tarefas |
| `get_lci_stage_rows(fy, status)` | `GET /stages?fy=&stage_status=` | Tabela detalhada por estágio |
| `get_lci_wallet_burndown(from, to, fy)` | `GET /wallet-burndown` | Portfolio Burndown temporal |

---

## 6. Aba: Cisco LCI Report

**Arquivo:** `frontend/src/pages/ciscoLci/CiscoLCIReportPage.tsx`

### 6.1 Visão Financeira (Financial Overview)
Cards KPI com valores do FY selecionado:

| Card | Fonte | Descrição |
|------|-------|-----------|
| Total Elegíveis | `total_eligibles` | Universo completo de tarefas LCI elegíveis |
| Potencial Total | `total_potential` | Valor após regra de deduplicação |
| Total Opt In | `total_opt_in` | Tarefas com pelo menos 1 estágio registrado |
| Total Capturado | `fin_approved` | Claim Approved pela Cisco |
| Perdidos | `fin_lost` | Valor de estágios reprovados |
| Taxa de Conversão | `fin_conversion_rate` | Capturado / Opt In × 100 |

**Gráficos:**
- **Funil Elegíveis → Potencial → Opt In** (Funnel chart)
- **Por Solução** (barras agrupadas): Eligible vs Potential vs Opt In por `task_track`
- **Burn-Up FY** (linhas): Potencial, Aprovado, Perdido acumulados mês a mês
- **Taxa de Conversão** (linha): evolução mensal da taxa vs target 70%
- **YoY** (linhas): Conversion Rate e Lost Rate dos últimos 3 FYs
- **Clientes Top** (barras): maiores valores capturados
- **Motivos de Cancelamento** (barras): `task_status_justification` das tarefas canceladas

### 6.2 Visão Operacional (Operational Overview)
Cards KPI com contagens operacionais + gráficos de distribuição por status e eficiência de execução.

Além dos cards operacionais, a aba exibe:
- **Incentive Task History by Fiscal Year**: histórico de quantidade de incentive tasks por FY
- **Value & Count by Stage Status**: gráfico combinado de valor total e quantidade por status de estágio
- **LCI Approved — Termination**: distribuição de `termination_status` para estágios aprovados
- **Effort by Client**: tabela com média, melhor e pior duração por cliente
- **Effort by Use Case**: tabela com média, melhor e pior duração por caso de uso
- **LCI Journey — FY**: tabela analítica carregada sob demanda na aba operacional, filtrada por `task_end_date` dentro do FY NTT

#### LCI Journey
A tabela **LCI Journey** utiliza o endpoint `/api/adoption/rebate/lci-journey?fy=<FY>` e apresenta visão detalhada por tarefa, incluindo:
- dados básicos da task (`task_id`, cliente, owner/CSM, track, use case, WS, deal id)
- datas e status da tarefa
- valor total e backlog
- status por estágio lógico (`onboard`, `use`, `engage`, `adopt`, `implement`, `optimize`)
- valores aprovados por estágio

A tabela possui:
- paginação client-side
- exportação para Excel em aba única
- carregamento lazy, habilitado somente quando a aba operacional está ativa

### 6.3 Visão Task Detail integrada à Tabela de Estágios
A tabela detalhada de estágios no **Cisco LCI Report** agora pode abrir o componente compartilhado `TaskDetailPanel` do módulo **Tasks**, sem duplicação de lógica.

**Comportamento:**
- cada linha da tabela de stages pode representar uma task LCI relacionada
- ao clicar em uma linha, o frontend mapeia a linha para um `TaskItem` mínimo e abre o `TaskDetailPanel`
- o painel carrega os detalhes reais da task via APIs já existentes do módulo Tasks

**Regra de autorização:**
- o clique só abre o painel se o usuário possuir `hasPermission("TASK")`
- usuários sem essa permissão continuam visualizando a tabela normalmente, porém sem drill-down

**Escopo da integração:**
- implementação localizada apenas em `frontend/src/pages/ciscoLci/CiscoLCIReportPage.tsx`
- nenhum comportamento compartilhado do `TaskDetailPanel` foi alterado
- nenhum endpoint novo de tasks foi criado para essa integração

### 6.4 Tabela de Estágios
Filtrável por Client, Solution, Use Case. Abas: **Approved (16) / Awaiting / In Progress / Lost**.

Colunas da tabela:
`Task | Client | Solution | Use Case | Task WS | Activity WS | CSM | Stage | Value USD | Status | Start Date | End Date | Completion`

- **Task WS** = `lci_ws` = WS da tarefa (`task_ws`)
- **Activity WS** = `lci_stage_ws` = WS do estágio/atividade
- **Start Date** = `stage_start_date` (performed_start ou estimated_start)
- **End Date** = `stage_end_date` (performed_end ou estimated_end)
- **Completion** = `termination_status` (ex: EARLY, ON-TIME, LATE)
- **Value USD** = `stage_amount_usd` (approval_value para status 10, stage_value demais)

**Export Excel:** botão exporta todos os 4 tabs em planilha multi-aba.

---

## 7. Aba: Portfolio Burndown

**Arquivo:** `frontend/src/pages/ciscoLci/CiscoLCIPortfolioBurndownPage.tsx`

### 7.1 Objetivo
Mostrar a evolução temporal acumulada (mês a mês) de:
- **Stage Opt In** acumulado no período
- **Claim Approved** acumulado no período
- **Pipeline Restante** = Opt In − Aprovado

### 7.2 Filtros
- **FROM / TO** (type=month): período de análise
- Default: `FROM = Abril do FY NTT vigente`, `TO = Março do ano seguinte`
- Seletor de FY no topo da página compartilhado entre abas

### 7.3 Cards KPI (alinhados ao Cisco LCI Report)
Os KPIs do Portfolio Burndown usam **os mesmos valores do Cisco LCI Report** (baseados em `lci_effective_fy`), garantindo consistência para o executivo:

| Card | Fonte | Valor |
|------|-------|-------|
| Stage Opt In (Período) | `fy_summary.opt_in` | = Total Opt In do Report |
| Claim Aprovado (Período) | `fy_summary.approved` | = Total Capturado do Report |
| Pipeline Restante | `fy_summary.pipeline` | Opt In − Aprovado |
| Taxa de Conversão | `fy_summary.conversion_rate` | Aprovado / Opt In |

> **Nota:** Os gráficos (cumulativo e mensal) mantêm a visão temporal real (baseada em `stage_start_date` e `approval_date`), enquanto os KPIs cards refletem os totais do FY.

### 7.4 Gráficos
1. **Portfolio Burndown — Cumulativo** (área + linhas):
   - Área azul: Stage Opt In acumulado
   - Área laranja tracejada: Pipeline Restante
   - Linha verde: Claim Approved acumulado

2. **Atividade Mensal** (barras agrupadas):
   - Azul: Stage Opt In mensal (não acumulado)
   - Verde: Claim Approved mensal (não acumulado)

### 7.5 Tabela de Dados + Export Excel
Tabela com todas as colunas mensais:
- Month, Stage Opt In (Monthly), Claim Approved (Monthly)
- Stage Opt In (Cumulative), Claim Approved (Cumulative)
- Pipeline Restante, Taxa de Conversão

Botão **Export Excel** gera arquivo `portfolio_burndown_YYYY-MM_to_YYYY-MM.xlsx`.

### 7.6 Lógica do Backend (`get_lci_wallet_burndown`)
```
Para cada mês no range [date_from, date_to]:
  Opt In mensal = sum(task_value) das tarefas cujo PRIMEIRO stage_start_date cai neste mês
  Approved mensal = sum(stage_amount_usd) dos estágios aprovados com approval_date neste mês

Opt In cumulativo = soma progressiva do Opt In mensal
Approved cumulativo = soma progressiva do Approved mensal
Pipeline = max(0, Opt In cumulativo - Approved cumulativo)

fy_summary (quando fy fornecido):
  Calculado com mesma lógica de get_lci_summary(fy) para alinhar KPIs com o Report
```

---

## 8. API Endpoints

### Base URL: `/api/adoption/cisco-lci`

| Endpoint | Método | Parâmetros | Descrição |
|----------|--------|------------|-----------|
| `/report-data` | GET | `?fy=2026` | Endpoint unificado do Cisco LCI Report |
| `/fiscal-years` | GET | — | Lista FYs disponíveis |
| `/summary` | GET | `?fy=2026` | KPIs financeiros e operacionais |
| `/total-eligibles` | GET | `?fy=2026` | Funil Elegíveis → Potencial → Opt In |
| `/by-stage-status` | GET | `?fy=2026` | Valor e contagem por status de estágio |
| `/termination-status` | GET | `?fy=2026` | Distribuição Termination Status |
| `/burnup` | GET | `?fy=2026` | Burn-up mensal acumulado |
| `/yoy` | GET | — | Year-over-Year (últimos 3 FYs) |
| `/lost-justification` | GET | `?fy=2026` | Motivos de cancelamento de tarefas |
| `/stages` | GET | `?fy=2026&stage_status=approved` | Tabela detalhada de estágios |
| `/wallet-burndown` | GET | `?date_from=2026-04&date_to=2027-03&fy=2026` | Portfolio Burndown |
| `/client-report/{company_id}` | GET | `?client_name=` | Report consolidado por cliente |

Além dos endpoints com prefixo `/api/adoption/cisco-lci`, a aba operacional do report também consome:
- `/api/adoption/rebate/lci-journey?fy=<FY>` para a tabela **LCI Journey**

Todos os endpoints requerem autenticação via **Bearer Token JWT** (`Authorization: Bearer <token>`).

---

## 9. Autorização (RBAC)

| resource_key | Quem pode acessar |
|---|---|
| `adoption.report_cisco_lci` | Abas Cisco LCI Report + Portfolio Burndown |
| `adoption.report_lci_eligible_status` | Aba Eligible Status |
| `adoption.report_lci_solution_vs_project` | Aba Solution vs Project |
| ADMIN | Todas as abas sem restrição |

---

## 10. Internacionalização (i18n)

Todas as labels do módulo são traduzidas em 3 idiomas (EN/PT/ES) via `react-i18next`.

**Namespace:** `adoption.ciscoLci.*`

**Arquivos de locale:**
- `frontend/src/i18n/locales/en.json`
- `frontend/src/i18n/locales/pt.json`
- `frontend/src/i18n/locales/es.json`

Exemplo de chaves:
```json
{
  "adoption": {
    "ciscoLci": {
      "portfolioBurndown": "Portfolio Burndown",
      "pbOptIn": "Stage Opt In (Period)",
      "pbApproved": "Claim Approved (Period)",
      "pbPipeline": "Pipeline Remaining",
      "pbConversionRate": "Conversion Rate"
    }
  }
}
```

---

## 11. Troubleshooting

| Problema | Causa Provável | Solução |
|----------|---------------|---------|
| Cards KPI zerados | `CiscoLCIRepository` não disponível ou dados não importados | Verificar `systemctl status bridgeadoption-backend` e job de importação Cisco LCI |
| "No data available" no Burndown | Período selecionado sem dados | Verificar `data_min`/`data_max` exibidos no filtro |
| Valores de Opt In diferentes entre Report e Burndown | Filtros de período diferentes | Alinhar FY no seletor; KPI cards usam `fy_summary` (mesma base do Report) |
| Tabela de estágios vazia | FY sem estágios para o status | Normal se não houver dados; verificar filtros Client/Solution |
| Labels exibindo chave bruta (`adoption.ciscoLci.xxx`) | Chaves i18n não adicionadas ao locale file | Rodar `python3 add_i18n_keys.py` ou adicionar manualmente nos locales |
| Build frontend falha com OOM | Heap Node insuficiente | Deploy via servidor (script `./deploy.sh` gerencia heap automaticamente) |

---

## 12. Diagrama de Fluxo de Dados

```
Banco de Dados (SQL Server)
  │
  ├── vwCustomerCiscoLCIDealTrackProjectStatus (stages)
  │     └── CiscoLCIRepository.find_all()
  │           └── _load_all_enriched() → _enrich_row()
  │                 └── [todos os endpoints de análise]
  │
  └── vwCustomerCiscoLCITrackProjectPM (tasks)
        └── CiscoLCIRepository.load_cisco_lci_all()
              └── [cálculo de task_value: Opt In, Potencial, Elegíveis]

Backend FastAPI (cisco_lci_service.py + cisco_lci_router.py)
  │
  └── React Frontend (CiscoLCIPage.tsx)
        ├── CiscoLCIReportPage.tsx
        ├── CiscoLCIPortfolioBurndownPage.tsx
        ├── CiscoLCIEligibleStatusPage.tsx
        └── CiscoLCISolutionVsProjectPage.tsx
```

---

## 13. Arquivos Relacionados

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `backend/app/adoption/cisco_lci_service.py` | Python | Lógica de negócio |
| `backend/app/adoption/cisco_lci_router.py` | Python | Endpoints FastAPI |
| `src/infrastructure/database/repositories/cisco_lci_repository.py` | Python | Repositório DB |
| `frontend/src/pages/ciscoLci/CiscoLCIPage.tsx` | TypeScript | Composição das abas |
| `frontend/src/pages/ciscoLci/CiscoLCIReportPage.tsx` | TypeScript | Aba Report, incluindo integração com TaskDetailPanel |
| `frontend/src/pages/ciscoLci/CiscoLCIPortfolioBurndownPage.tsx` | TypeScript | Aba Burndown |
| `frontend/src/pages/ciscoLci/CiscoLCIEligibleStatusPage.tsx` | TypeScript | Aba Eligible Status |
| `frontend/src/pages/ciscoLci/CiscoLCISolutionVsProjectPage.tsx` | TypeScript | Aba Solution vs Project |
| `frontend/src/api/ciscoLci.ts` | TypeScript | Chamadas API + tipos do módulo Cisco LCI |
| `frontend/src/pages/tasks/TaskDetailPanel.tsx` | TypeScript | Painel reutilizado para drill-down de task a partir da tabela de stages |
| `frontend/src/i18n/locales/en.json` | JSON | Textos em inglês |
| `frontend/src/i18n/locales/pt.json` | JSON | Textos em português |
| `frontend/src/i18n/locales/es.json` | JSON | Textos em espanhol |
| `docs/03_database/vwCustomerCiscoLCIDealTrackProjectStatus.md` | Markdown | Documentação da view de estágios |
| `docs/03_database/vwCustomerCiscoLCITrackProjectPM.md` | Markdown | Documentação da view de tarefas |
