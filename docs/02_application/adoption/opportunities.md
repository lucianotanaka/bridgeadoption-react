# Módulo Adoption Opportunities

> **Rota:** `/adoption/rebate`
> **resource_key:** `adoption.opportunities`
> **Arquivo frontend:** `frontend/src/pages/adoption/RebatePage.tsx`
> **Backend service:** `backend/app/adoption/extras_service.py`
> **Backend router:** `backend/app/adoption/extras_router.py`
> **Última atualização:** 2026-08-17
> **i18n namespace:** `adoption.rebate` (todos os 6 arquivos de locale)

---

## 1. Propósito

Exibe e rastreia as oportunidades SIP (*Service Improvement Program*) gerenciadas pela equipe de Adoption NTT (squad ID = 30). Permite:

- Visualizar KPIs de oportunidades SIP em andamento e aprovadas
- Filtrar por Ano Fiscal NTT, CSM e Cliente
- Analisar a tabela de oportunidades com paginação e exportação Excel

> **Nota histórica:** Este módulo era anteriormente chamado "Rebate & Opportunities" (resource_key: `adoption.report_rebate_and_opportunities`). Foi renomeado para "Adoption Opportunities" (resource_key: `adoption.opportunities`) em 2026-08-17.

---

## 2. Funcionalidades

### 2.1 Filtro NTT Fiscal Year

- Posicionado no **lado direito do cabeçalho** da página
- Filtro principal — filtra a tabela SIP pela coluna `task_end_fy`
- Auto-seleciona o FY vigente NTT (ciclo Abril → Março) ao carregar a página
- Ao trocar o FY, os filtros CSM e Client são resetados automaticamente
- Opções carregadas via `GET /api/adoption/rebate/fiscal-years`

### 2.2 KPI Cards

Dois cards exibidos logo abaixo do cabeçalho, **reativos a todos os filtros ativos** (FY + CSM + Client):

| Card | Descrição | Lógica |
|------|-----------|--------|
| **SIP In Progress** | Oportunidades ativas/em andamento | `task_status_id IN (1, 2, 3, 7, 8)` |
| **SIP Approved** | Oportunidades aprovadas/concluídas | `task_status_id IN (9, 10)` |

> Os KPIs são calculados **client-side** a partir do dataset filtrado (`filteredSip`) — sem chamada adicional ao backend.

### 2.3 Filtros CSM e Client

Exibidos em um card abaixo dos KPIs:

| Filtro | Tipo | Comportamento |
|--------|------|---------------|
| **CSM** | `<select>` | Lista de CSMs únicos para o FY selecionado. Ao alterar, reinicia o filtro de Client. |
| **Client** | `<select>` | Lista de clientes em cascata — filtrada pelo CSM selecionado (ou todos os clientes). |
| **Clear filters** | Botão `×` | Aparece apenas quando algum filtro (CSM ou Client) está ativo. Reseta ambos. |

### 2.4 Tabela SIP Opportunities

Exibe os registros da view `vwTaskSIPNewOpportunity` filtrados por FY, CSM e Client.

**Colunas exibidas:**

| Coluna | Campo | Notas |
|--------|-------|-------|
| ID | `task_id` | Identificador da tarefa |
| Type | `task_tasktype_name` | Tipo de tarefa |
| CSM | `task_owner_name` | CSM responsável |
| Client | `task_client_name` | Nome do cliente |
| Reference | `task_reference` | Referência da tarefa |
| Start | `task_start` | Data início (formato YYYY-MM-DD) |
| End | `task_end` | Data fim (formato YYYY-MM-DD) |
| Days | `task_days` | Duração em dias |
| FY | `task_end_fy` | Ano Fiscal NTT de término |
| Status | `task_status_name` | Nome do status da tarefa |
| Cur | `task_currency` | Código da moeda |
| Deal Value | `task_deal_value` | Valor do negócio (2 casas decimais) |
| Note | `task_note` | Observações |

**Paginação:**

| Propriedade | Valor |
|-------------|-------|
| Padrão | 25 registros/página |
| Opções | 25 / 50 / 100 / 200 |
| Navegação | Botões «‹ páginas ›» com janela de 5 |
| Indicador | "Showing X–Y of N" |

**Exportação Excel:**
- Botão "Excel" na área do título da tabela
- Exporta apenas os dados **filtrados** (FY + CSM + Client)
- Nome do arquivo: `{YYYY-MM-DD}_task_sip.xlsx`

---

## 3. Arquitetura

### 3.1 Frontend

```
RebatePage.tsx
├── KPI                — card de métrica (label + valor)
├── Tbl                — tabela paginada com export Excel
└── doExport()         — exportação Excel client-side via xlsx
```

**Dependências:**
- `@tanstack/react-query` — gerenciamento de queries e cache
- `xlsx` — exportação Excel client-side
- `@/api/client` — cliente HTTP (axios)
- `react-i18next` — internacionalização
- `lucide-react` (ícones: `Download`, `X`)

**State:**

| State | Tipo | Descrição |
|-------|------|-----------|
| `selectedFy` | `number \| null` | FY selecionado manualmente (null = auto) |
| `filterCsm` | `string` | CSM selecionado (vazio = todos) |
| `filterClient` | `string` | Cliente selecionado (vazio = todos) |

**Queries:**

| Query Key | Endpoint | Descrição |
|-----------|----------|-----------|
| `rebate-fiscal-years` | `GET /api/adoption/rebate/fiscal-years` | Lista de FYs disponíveis |
| `rebate-sip` | `GET /api/adoption/rebate/sip-opportunities` | Todos os dados SIP (filtro client-side) |

**Computed (useMemo):**

```
fy              = selectedFy ?? auto(currentFY from fyOptions)
filteredSip     = sipData.filter(task_end_fy == fy AND csm AND client)
fyFilteredSip   = sipData.filter(task_end_fy == fy)     # base para opções de filtros
csmOptions      = unique(fyFilteredSip.task_owner_name)
clientOptions   = unique(fyFilteredSip[csm==filterCsm].task_client_name)
kpiInProgress   = filteredSip.filter(status_id IN [1,2,3,7,8]).length
kpiApproved     = filteredSip.filter(status_id IN [9,10]).length
```

### 3.2 Backend

**`backend/app/adoption/extras_service.py`:**

| Função | Descrição |
|--------|-----------|
| `get_rebate_fiscal_years()` | Retorna lista de FYs disponíveis via `AdoptionForecastRepository.load_fy_forecast()` |
| `get_rebate_sip_opportunities(squad_ids=30)` | Retorna registros de `vwTaskSIPNewOpportunity` filtrados por `squad_id=30` |

**`backend/app/adoption/extras_router.py` (rebate_router):**

| Método | Endpoint | Função |
|--------|----------|--------|
| `GET` | `/api/adoption/rebate/fiscal-years` | `rebate_fiscal_years` |
| `GET` | `/api/adoption/rebate/sip-opportunities` | `rebate_sip_opportunities` |

### 3.3 Banco de Dados

| Objeto | Tipo | Uso |
|--------|------|-----|
| `vwTaskSIPNewOpportunity` | View MariaDB | Fonte principal — oportunidades SIP filtradas por squad |
| `tbTask` | Tabela base | Dados de tarefas |
| `TaskRepository.get_task_sip_new_opportunity()` | Método Python | `SELECT * FROM vwTaskSIPNewOpportunity WHERE task_owner_squad_id IN (30)` |

**Principais colunas de `vwTaskSIPNewOpportunity`:**

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `task_id` | int | ID da tarefa |
| `task_tasktype_name` | string | Nome do tipo |
| `task_owner_name` | string | CSM responsável |
| `task_owner_squad_id` | int | ID do squad do CSM |
| `task_client_name` | string | Nome do cliente |
| `task_reference` | string | Referência |
| `task_start` | date | Data início |
| `task_end` | date | Data fim |
| `task_days` | int | Duração em dias |
| `task_end_fy` | int | FY NTT de término |
| `task_status_id` | int | ID do status |
| `task_status_name` | string | Nome do status |
| `task_currency` | string | Moeda |
| `task_deal_value` | decimal | Valor do negócio |
| `task_note` | string | Observações |

---

## 4. Autorização

| Campo | Valor |
|-------|-------|
| `resource_key` (banco) | `adoption.opportunities` |
| `resource_module` | `adoption` |
| `resource_description` | Adoption Opportunities — SIP New Opportunities & Cisco EA tracking |
| Migração SQL | `backend/migrations/add_adoption_opportunities_resource.sql` |

> A migração copia automaticamente os grants existentes de `adoption.report_rebate_and_opportunities` para o novo `adoption.opportunities`.

---

## 5. Fluxo de Dados

```
Página carrega
    ├─► GET /api/adoption/rebate/fiscal-years
    │       └─► AdoptionForecastRepository.load_fy_forecast()
    │               └─► Retorna lista de FYs disponíveis
    │               └─► Auto-seleciona FY vigente
    │
    └─► GET /api/adoption/rebate/sip-opportunities
            └─► TaskRepository.get_task_sip_new_opportunity(squad_ids=30)
                    └─► SELECT * FROM vwTaskSIPNewOpportunity WHERE task_owner_squad_id IN (30)
                    └─► Retorna List[Dict] (todos os registros do squad)

Frontend filtra client-side:
    ├─► Por task_end_fy == fy (FY selecionado)
    ├─► Por task_owner_name == filterCsm (se ativo)
    └─► Por task_client_name == filterClient (se ativo)

Frontend calcula KPIs de filteredSip:
    ├─► SIP In Progress → count(status_id IN [1,2,3,7,8])
    └─► SIP Approved    → count(status_id IN [9,10])

Frontend renderiza:
    ├─► Cabeçalho + seletor NTT FISCAL YEAR
    ├─► 2 KPI Cards (reativos a filtros)
    ├─► Card de filtros (CSM + Client + Clear)
    └─► Tabela paginada + botão Excel
```

---

## 6. Internacionalização (i18n)

O módulo suporta 3 idiomas: **Português (pt / pt-BR)**, **Inglês (en / en-US)** e **Espanhol (es / es-ES)**.

### Namespace: `adoption.rebate`

| Chave | PT | EN | ES |
|-------|----|----|-----|
| `title` | Adoption Opportunities | Adoption Opportunities | Adoption Opportunities |
| `subtitle` | NTT SIP | NTT SIP | NTT SIP |
| `sipOpportunities` | Oportunidades SIP | SIP Opportunities | Oportunidades SIP |
| `sipInProgress` | SIP Em Andamento | SIP In Progress | SIP En Progreso |
| `sipApproved` | SIP Aprovados | SIP Approved | SIP Aprobados |

### Chave de navegação: `nav.rebate`

| Locale | Valor |
|--------|-------|
| EN / EN-US | Opportunities |
| PT / PT-BR | Oportunidades |
| ES / ES-ES | Oportunidades |

---

## 7. Histórico de Alterações

| Data | Versão | Descrição |
|------|--------|-----------|
| 2026-08-17 | v2 | Renomeado para "Adoption Opportunities"; resource_key alterado para `adoption.opportunities`; ícone Zap; título "Adoption Opportunities"; subtítulo "NTT SIP"; filtro FY movido para o cabeçalho (direita); remoção do botão Refresh; KPIs calculados client-side a partir dos dados filtrados |
| 2026-08-16 | v1 | Migração inicial do Streamlit `report_rebate_and_opportunities.py` para React; módulo tinha mais tabs (LCI Approved, LCI Journey, Task Incentive, SIP, Cisco EA); LCI Journey movida para Cisco LCI > Operational Overview |

---

## 8. Troubleshooting

| Problema | Causa Provável | Solução |
|----------|---------------|---------|
| Módulo não aparece no menu | Usuário sem permissão para `adoption.opportunities` | Rodar migração SQL e atribuir resource ao perfil do usuário |
| Tabela vazia | Sem dados para o FY selecionado na `vwTaskSIPNewOpportunity` | Verificar se existem tarefas SIP com `task_end_fy` correspondente e `task_owner_squad_id = 30` |
| KPIs sempre zerados | `task_status_id` não retornado pela view | Verificar definição de `vwTaskSIPNewOpportunity` — coluna `task_status_id` deve estar presente |
| Filtro CSM sem opções | Nenhuma tarefa com `task_owner_name` não nulo para o FY | Verificar dados na view |
| Erro 401 | Token JWT expirado | Refazer login |
| Erro 500 | Falha na conexão com banco | Verificar logs de `TaskRepository.get_task_sip_new_opportunity()` |
