# Módulo Portfolio — Bridge Adoption React

> **Última atualização:** 2026-07  
> **Grupo:** Portfolio (menu lateral)  
> **Audiência:** Desenvolvimento e sustentação

---

## 1. Visão geral

O grupo Portfolio reúne as visões centradas no cliente — saúde do portfólio, ativos, equipes e overview completo por cliente. São módulos de análise que permitem ao time entender a situação atual de cada conta.

---

## 2. Sub-módulos

| Módulo | Rota | resource_key | Arquivo |
|---|---|---|---|
| Farol | `/portfolio/farol` | `portfolio.farol` | `FarolPage.tsx` |
| Assets | `/portfolio/asset` | `portfolio.asset` | `AssetPage.tsx` |
| Account Team | `/portfolio/account-team` | `portfolio.account_team` | `AccountTeamPage.tsx` |
| Adoption Tasks | `/portfolio/adoption-tasks` | `portfolio.adoption_tasks` | `AdoptionTasksPage.tsx` |
| Client Overview | `/portfolio/client-overview` | `portfolio.client_overview` | `ClientOverviewPage.tsx` |
| **Cisco EA** | `/portfolio/cisco-ea` | `portfolio.cisco_enterprise_agreement` | `CiscoEAPage.tsx` |

---

## 3. Farol (`portfolio.farol`)

> **Status:** ✅ Migrado para React — 2026-08-18  
> **Documentação detalhada:** `docs/02_application/portfolio/farol.md`  
> **API:** `docs/07_api/farol_endpoints.md`

### Propósito
Painel de status de cobertura contratual de soluções por cliente (*Traffic Light — Client Health Status*).

Exibe um grid visual por **Architecture × Solution** com emoji de semáforo em cada célula, indicando o estado de cobertura de cada solução. Suporta Vendor CISCO (vendor_id=1); FORTINET e PALO ALTO preparados para ativação.

### Componentes
- Filtro de **Vendor** (`<select>`, padrão CISCO)
- Filtro de **Cliente** (searchable dropdown, carregado via API)
- Botão **Generate Farol** (dispara query de dados)
- **Grid Architecture × Solution** — até 5 solutions por linha, rowSpan por architecture
- **Legenda** de status acima do grid
- **Export CSV** e botão de **Refresh**

### Status do Semáforo

| Emoji | Status (DB) | Significado |
|---|---|---|
| 🟢 | `green` | Active — cobertura ativa |
| 🟡 | `yellow` | Signed – Pending Activation |
| 🔴 | `red` | Expired or Never Covered |
| ⚪ | `gray` / `null` | Non-Existent or Other Partner |

### Endpoints
- `GET /api/portfolio/farol/clients?vendor_id={id}` — lista de clientes por vendor
- `GET /api/portfolio/farol?vendor_id={id}&customer_id={id}` — dados do Farol

---

## 4. Assets (`portfolio.asset`)

> **Status:** ✅ Migrado para React — 2026-08-18
> **Documentação detalhada:** `docs/02_application/portfolio/asset.md`
> **API:** `docs/07_api/asset_endpoints.md`

### Propósito
Portfólio de ativos (hardware/software/licenças) de cada cliente. Exibe contratos do Vendor (SmartNet/fabricante) e da NTT por asset, com status consolidado e alertas de EoS/LDOS.

### Componentes
- **Seletor de cliente** searchable (populado de clientes que têm assets)
- **4 Summary Cards**: Total Assets, Vendor Only, NTT Only, Vendor+NTT
- **11 filtros MultiSelect**: Vendor, Product Name, NTT Contract, Subscription ID, Serial Number, Instance Number, Major/Minor, Status Consolidated, Alert Reason, EOS Status, LDOS Status
- **Tabela paginada** com 29 colunas (scroll horizontal)
- **Export CSV** (dataset filtrado, BOM UTF-8)
- **Refresh** do cliente ativo

### Endpoints
- `GET /api/portfolio/asset-clients` — lista de clientes com assets
- `GET /api/portfolio/assets?customer_id={id}` — assets completos por cliente

---

## 5. Account Team (`portfolio.account_team`)

> **Status:** ✅ Migrado para React — 2026-08-18
> **Documentação detalhada:** `docs/02_application/portfolio/account_team.md`
> **API:** `docs/07_api/account_team_endpoints.md`

### Propósito
Matriz de Account Team por empresa cliente — todos os profissionais NTT Data alocados (AM, CDM, CSM, DIR, etc.) com Cisco Domain associado. Inclui painel de edição para ativar/desativar alocações e adicionar membros.

### Componentes
- **Matriz pivot** empresa × tipo de profissional (construída client-side)
- **5 filtros MultiSelect**: Client, DIR, AM, CDM, CSM
- **Toggle de colunas** (Cisco Domain + tipos dinâmicos)
- **Export TSV**
- **Edit Mode** (ADMIN/MANAGER): toggle de alocação com auto-save + formulário Add Member

### Endpoints
- `GET /api/portfolio/account-team/matrix` — linhas alocadas com Cisco Domain
- `GET /api/portfolio/account-team/rows` — todas as linhas (edit panel)
- `GET /api/portfolio/account-team/users` — pessoas NTT para Add Member
- `GET /api/portfolio/account-team/companies` — empresas para filtro + navegação
- `PUT /api/portfolio/account-team/{id}` — atualizar alocação
- `POST /api/portfolio/account-team` — inserir novo membro

---

## 6. Adoption Tasks (`portfolio.adoption_tasks`)

### Propósito
Visão das tarefas de adoção tecnológica filtradas por cliente — permite ao time ver o estado das tarefas de um cliente específico.

### Componentes
- Filtros: cliente, CSM, status, prioridade
- Tabela de tarefas com paginação
- Acesso rápido ao detalhe da tarefa

### Endpoints
- `GET /api/portfolio/adoption-tasks?client_id=XXX`

---

## 7. Client Overview (`portfolio.client_overview`)

### Propósito
Visão consolidada 360° de um cliente específico, integrando dados de:
- **Cisco EA** (Enterprise Agreement) — uso de licenças
- **Cisco SA** (Smart Account) — inventário de ativos
- **True Forward** — consumo além do contrato

### Componentes
- Seletor de cliente (dropdown com busca)
- Três abas/seções principais:
  1. **Cisco EA License Usage** — gráficos e tabelas de consumo por produto
  2. **Cisco Smart Account** — inventário de licenças ativas
  3. **Cisco True Forward** — análise de overage
- Gráficos interativos (Plotly)

### Endpoints
- `GET /api/portfolio/client-overview?client_id=XXX`
- `GET /api/portfolio/cisco-ea?client_id=XXX`
- `GET /api/portfolio/cisco-sa?client_id=XXX`

### Regras de negócio
- **True Forward:** quando o consumo excede o contrato, a Cisco cobra a diferença (overage). O módulo sinaliza esses casos.
- Os dados são importados via jobs automáticos (importadores Cisco EA/SA)

---

## 8. Backend (`backend/app/modules/`)

```
backend/app/modules/
├── public_router.py     → Endpoints /api/public/*
├── public_service.py    → Queries para módulos públicos
├── sections_router.py   → Endpoints de seções (portfolio, etc.)
└── sections_service.py  → Queries para portfolio e visões de cliente
```

---

## 8b. Cisco EA (`portfolio.cisco_enterprise_agreement`)

> **Status:** ✅ Migrado para React — 2026-08-21
> **Documentação detalhada:** `docs/02_application/portfolio/cisco_ea.md`
> **API:** `docs/07_api/cisco_ea_endpoints.md`

### Propósito
Painel de gestão de licenças **Cisco Enterprise Agreement (EA)**. Fornece visibilidade completa do consumo de licenças EA por cliente, com monitoramento preventivo do **True Forward** — mecanismo Cisco onde o cliente é cobrado pelo pico de consumo atingido durante o contrato.

### Abas

| Aba | Descrição |
|---|---|
| **Metering** | Consumo de licenças por suite. Filtro cliente (multiselect), KPIs (EA Gerado, Total Contratado, Total Gerado), gráfico % por suite e tabela (visível apenas com cliente selecionado) |
| **True Forward** | Relatório completo de consumo excedente: filtros, 6 KPIs, 4 gráficos, 5 sub-tabs incluindo CCW Subscriptions com 7 filtros multiselect |

### Fontes de Dados

| Fonte | Descrição |
|---|---|
| `vwCiscoEAMeteringLatest` | Último snapshot de consumo por SKU/subscription |
| `vwCustomerCiscoEAConsolidated` | Dados consolidados com `customer_name` via `tbCompany` |
| `tbTask` (type 35) | Tarefas "Consumo Excedente: CISCO EA" |
| CCW subscription report | Subscriptions importadas via CCW |

### Endpoints
- `GET /api/adoption/rebate/cisco-ea` — dados de medição com `customer_name`
- `GET /api/adoption/rebate/summary?fy={fy}` — KPI EA Gerado %
- `GET /api/adoption/cisco-ea-true-forward/report-data` — dados unificados True Forward

### Backend Services
- `backend/app/adoption/extras_service.py` → `get_rebate_cisco_ea()` (Metering)
- `backend/app/adoption/cisco_ea_true_forward_service.py` → `get_true_forward_report_data()` (True Forward)

---

## 9. Troubleshooting

| Problema | Causa | Solução |
|---|---|---|
| Farol — lista de clientes vazia | Sem registros em `tbClientFarol` para o vendor | Verificar tabela `tbClientFarol` no banco |
| Farol — grid vazio após Generate | Sem registros em `tbFarol` para o cliente | Executar job de importação do Farol |
| Farol — status ⚪ em todas as células | Coluna `status` com valores inesperados | Verificar valores em `tbFarol.status` (esperado: `green`, `yellow`, `red`, `gray`) |
| Client Overview vazio | Cliente selecionado sem dados EA/SA | Verificar importação Cisco EA/SA para o cliente |
| Assets — seletor de clientes vazio | Sem registros em `tbAssetContractSummaryByCustomer` | Verificar importação de contratos de assets |
| Assets — tabela vazia após Load | Cliente sem assets na view `tbAssetContractEndMismatch` | Verificar `tbContractVendorAsset` e `tbContractNTTAsset` para o cliente |
| Assets — erro 422 ao carregar | `customer_id` inválido ou ausente | Bug no frontend — verificar `activeClient.client_id` |
| Account Team — colunas AM/CDM/CSM todas "OTHER" | View `vwAccountTeam` retorna `accountteam_user_type` (coluna legada) | `_normalize_account_team_cols()` no service trata isso automaticamente |
| Account Team — checkbox não salva | `AccountTeamRepository.update()` definido sem `self` | Service chama como método de classe: `AccountTeamRepository.update(data)` |
| Equipe de conta incompleta | Dados desatualizados | Verificar tabela de account team no banco |
| True Forward não aparece | Sem dados de overage | Normal se o cliente está dentro do contrato |
