# Módulo CSM Account — Adoption

> **Rota:** `/adoption/csm-account`
> **resource_key:** `adoption.report_csm_account`
> **Arquivo frontend:** `frontend/src/pages/adoption/CsmAccountPage.tsx`
> **Backend service:** `backend/app/adoption/csm_account_service.py`
> **Backend router:** `backend/app/adoption/extras_router.py`
> **Última atualização:** 2026-08-16 (v2 — paginação, limpar filtros, sem botão Refresh)
> **i18n namespace:** `adoption.csmAccount` (todos os 6 arquivos de locale)

---

## 1. Propósito

Exibe o portfólio de contas de cada CSM (Customer Success Manager) da equipe de Adoption. Permite visualizar:

- Quantas e quais contas cada CSM gerencia
- A distribuição dos clientes por tipo de atendimento (HIGH TOUCH, SCALE TOUCH, DIGITAL TOUCH)
- Filtros em cascata para análise individual por CSM, cliente ou tipo
- Gráficos de distribuição gerados automaticamente conforme os filtros ativos
- Exportação da lista filtrada para Excel

> **Nota:** Existe também uma versão pública em `/public/csm-account` com escopo reduzido e sem dados sensíveis.

---

## 2. Funcionalidades

### 2.1 KPI Cards (Sumário)

Exibidos no topo da página a partir do endpoint `/summary`:

| Card | Fonte | Descrição |
|------|-------|-----------|
| **Total Accounts** | `len(rows)` | Total de registros em `vwAccountTeamCSM` |
| **CSMs** | `unique(csm_name)` | Número de CSMs distintos |
| **Unique Clients** | `unique(client_name)` | Número de clientes distintos |
| **Top Type: [type]** | `max count(client_type)` | Tipo com maior número de contas e sua contagem |

### 2.2 Filtros em Cascata

| Filtro | Tipo | Comportamento |
|--------|------|---------------|
| **CSM** | `<select>` | Lista de CSMs únicos. Ao alterar, reinicia o filtro de Cliente. |
| **Client** | `<select>` | Lista de clientes filtrada pelo CSM selecionado (ou todos os clientes). |
| **Type** | `<select>` | Lista de tipos de atendimento (todos os registros, independente de outros filtros). |
| **Clear Filters** | Botão `×` | Aparece apenas quando algum filtro está ativo. Reseta os 3 filtros simultaneamente. |

> O botão "Clear Filters" usa `t("common.clearFilters")` e o ícone `X` de `lucide-react`. Segue o mesmo padrão do `AccountTeamPage`.

### 2.3 Gráficos Condicionais (espelham Streamlit)

Os gráficos são exibidos **acima** da tabela, com base nos filtros ativos:

#### Cenário 1: Sem filtro de Cliente E sem filtro de Type

Exibe **um gráfico por CSM**, mostrando a distribuição de clientes por tipo de atendimento:
- Eixo X: tipos de atendimento
- Eixo Y: quantidade de clientes
- Cada barra tem cor própria por tipo
- Título: `{nome_do_CSM} (Total: {n})`
- Componente: `CsmTypeChart`

#### Cenário 2: Sem filtro de Cliente, COM filtro de Type

Exibe **um único gráfico** com a contagem de clientes por CSM para o tipo selecionado:
- Eixo X: nomes dos CSMs (ordenado decrescente)
- Eixo Y: quantidade de clientes
- Cor única: `#005B96`
- Título: `Clients by CSM (Type: {tipo_selecionado})`
- Componente: `CsmCountChart`

#### Cenário 3: COM filtro de Cliente (independente do Type)

Nenhum gráfico é exibido. Apenas a tabela filtrada.

### 2.4 Paginação da Tabela

A tabela exibe os registros paginados pelo componente `PaginationBar`:

| Propriedade | Valor padrão |
|-------------|-------------|
| Registros por página (default) | `25` |
| Opções de registros por página | `10`, `25`, `50`, `100` |
| Navegação | Botões «‹ 1 2 3 ›» com janela de 5 páginas |
| Indicador | "Showing X–Y of Z" (traduzido via `common.showing`, `common.of`) |
| Reset automático | Sempre que algum filtro muda, a página volta para 1 |

O índice `#` mostrado na tabela é o número global (relativo à posição no dataset completo deduplicado), calculado como `(page - 1) * pageSize + i + 1`.

### 2.5 Tabela de Registros

Sempre exibida, reflete os filtros ativos:

| Coluna | Fonte | Exibição |
|--------|-------|----------|
| `#` | índice | Número sequencial a partir de 1 |
| `CSM` | `csm_name` | Nome do CSM em negrito |
| `Client` | `client_name` | Nome do cliente |
| `Type` | `client_type` | Badge colorido por tipo |

**Deduplicação:** registros com mesma combinação `(csm_name, client_name, client_type)` são deduplicados no frontend antes de exibição e exportação (espelha `drop_duplicates` do Streamlit).

### 2.6 Exportação Excel

- Botão "Export Excel" na área de cabeçalho da tabela
- Gera arquivo: `{YYYY-MM-DD}_CSM_Account_Report.xlsx`
- Planilha: `CSM Account`
- Colunas exportadas: `#`, `CSM`, `CLIENT`, `TYPE`
- Implementado via biblioteca `xlsx` (client-side, sem round-trip ao servidor)
- Desabilitado quando não há registros

---

## 3. Tipos de Atendimento (Client Type)

| Valor | Badge (Light) | Badge (Dark) | Cor no Gráfico |
|-------|--------------|--------------|----------------|
| `HIGH TOUCH` | Azul | Azul escuro | `#005B96` |
| `SCALE TOUCH` | Roxo | Roxo escuro | `#6B48A2` |
| `DIGITAL TOUCH` | Verde esmeralda | Verde escuro | `#00897B` |
| Outros | Cinza | Cinza escuro | Paleta fallback |

---

## 4. Arquitetura

### 4.1 Frontend

```
CsmAccountPage.tsx
├── KPICard            — card de métrica (label + valor grande)
├── CsmTypeChart       — gráfico de barras por tipo para um CSM específico
├── CsmCountChart      — gráfico de barras de clientes por CSM (filtro de tipo)
└── Tabela             — # | CSM | Client | Type (badge)
```

**Dependências:**
- `@tanstack/react-query` — cache e gerenciamento de estado das queries
- `react-plotly.js` — gráficos de barras verticais
- `xlsx` — exportação Excel client-side
- `@/api/client` — cliente HTTP (axios)
- `react-i18next` — internacionalização

**State:**

| State | Tipo | Descrição |
|-------|------|-----------|
| `filterCSM` | `string` | CSM selecionado (vazio = todos) |
| `filterClient` | `string` | Cliente selecionado (vazio = todos) |
| `filterType` | `string` | Tipo selecionado (vazio = todos) |

**Queries:**

| Query Key | Endpoint | Frequência |
|-----------|----------|------------|
| `csm-accounts` | `GET /api/adoption/csm-account/accounts` | Uma vez por sessão (staleTime: 5min) |
| `csm-summary` | `GET /api/adoption/csm-account/summary` | Uma vez por sessão (staleTime: 5min) |

**Lógica de filtros (memoizada):**

```
csms           = unique(rows.csm_name)
clientOptions  = unique(rows[csm_name == filterCSM].client_name)
typeOptions    = unique(rows.client_type)
filtered       = rows.filter(csm AND client AND type)
deduped        = deduplicate(filtered, key = csm||client||type)
showPerCsmCharts = !filterClient && !filterType
showTypeChart    = !filterClient && !!filterType
```

### 4.2 Backend

**`backend/app/adoption/csm_account_service.py`:**

| Função | Descrição |
|--------|-----------|
| `get_csm_accounts()` | Retorna todos os registros de `vwAccountTeamCSM` como `List[Dict]` |
| `get_csm_account_summary()` | Calcula KPIs: total_accounts, total_csms, total_clients, types (ordenados por count) |

**`backend/app/adoption/extras_router.py` (csm_router):**

| Método | Endpoint | Função |
|--------|----------|--------|
| `GET` | `/api/adoption/csm-account/accounts` | `csm_accounts` |
| `GET` | `/api/adoption/csm-account/summary` | `csm_summary` |

### 4.3 Banco de Dados

| Objeto | Tipo | Uso |
|--------|------|-----|
| `vwAccountTeamCSM` | View | Dados de CSM × Cliente × Tipo — fonte principal |
| `tbAccountTeam` | Tabela base | Contém as relações de pessoas por conta |
| `UserRepository.load_csm_account()` | Método Python | `SELECT * FROM vwAccountTeamCSM` |

**Colunas retornadas por `vwAccountTeamCSM`:**

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `csm_name` | string | Nome do CSM responsável |
| `client_name` | string | Nome do cliente (empresa) |
| `client_type` | string | Tipo de atendimento (HIGH TOUCH, SCALE TOUCH, DIGITAL TOUCH) |

> A view pode retornar colunas adicionais dependendo da sua definição no banco. O frontend e o serviço consomem apenas as três colunas acima.

#### Tabela `tbAccountTeam` — Mapeamento de Colunas (rename 2026-08)

A tabela `tbAccountTeam` passou por um rename de colunas. O código não referencia diretamente essas colunas — o acesso é abstraído pela view `vwAccountTeamCSM` e pela view `vwAccountTeam`:

| Coluna Antiga | Coluna Nova | Status |
|---------------|-------------|--------|
| `accountteam_user_id` | `accountteam_person_id` | ✅ Renomeada — sem impacto no código |
| `accountteam_user_type` | `accountteam_person_type` | ✅ Renomeada — sem impacto no código |

> **Verificação realizada em 2026-08-16:** nenhuma referência às colunas antigas foi encontrada em `Z:\bridgeadoption` nem em `x:\` (React project). O acesso é feito exclusivamente via views SQL.

---

## 5. Fluxo de Dados

```
Página carrega
    ├─► GET /api/adoption/csm-account/accounts
    │       └─► UserRepository.load_csm_account()
    │               └─► SELECT * FROM vwAccountTeamCSM
    │               └─► Retorna List[Dict] com csm_name, client_name, client_type
    │
    └─► GET /api/adoption/csm-account/summary
            └─► get_csm_account_summary()
                    └─► Calcula total_accounts, total_csms, total_clients, types[]
                    └─► Retorna Dict com KPIs

Frontend renderiza:
    ├─► 4 KPI Cards
    ├─► Filtros (csms, clients, types derivados dos dados)
    ├─► Charts (condicional por filtros ativos)
    └─► Tabela deduplicada + botão Export Excel
```

---

## 6. Internacionalização (i18n)

O módulo suporta 3 idiomas: **Português (pt / pt-BR)**, **Inglês (en / en-US)** e **Espanhol (es / es-ES)**.

### Namespace: `adoption.csmAccount`

| Chave | PT | EN | ES |
|-------|----|----|-----|
| `title` | CSM Account | CSM Account | CSM Account |
| `subtitle` | Customer Success Manager — Portfólio de Contas | Customer Success Manager — Account Portfolio | Customer Success Manager — Portafolio de Cuentas |
| `totalAccounts` | Total de Contas | Total Accounts | Total de Cuentas |
| `csms` | CSMs | CSMs | CSMs |
| `uniqueClients` | Clientes Únicos | Unique Clients | Clientes Únicos |
| `topType` | Tipo Principal | Top Type | Tipo Principal |
| `allCsms` | Todos os CSMs | All CSMs | Todos los CSMs |
| `allClients` | Todos os Clientes | All Clients | Todos los Clientes |
| `allTypes` | Todos os Tipos | All Types | Todos los Tipos |
| `client` | Cliente | Client | Cliente |
| `clients` | clientes | clients | clientes |
| `records` | Registros | Records | Registros |
| `exportExcel` | Exportar Excel | Export Excel | Exportar Excel |
| `chart2Title` | Clientes por CSM | Clients by CSM | Clientes por CSM |

### Chaves comuns reutilizadas

| Chave | Uso |
|-------|-----|
| `common.type` | Label do filtro/coluna Type |
| `common.refresh` | Botão Atualizar |
| `common.noData` | Mensagem quando tabela vazia |

### Arquivos de locale atualizados

| Arquivo | Status |
|---------|--------|
| `frontend/src/i18n/locales/en.json` | ✅ |
| `frontend/src/i18n/locales/pt.json` | ✅ |
| `frontend/src/i18n/locales/es.json` | ✅ |
| `frontend/src/i18n/locales/en-US.json` | ✅ |
| `frontend/src/i18n/locales/pt-BR.json` | ✅ |
| `frontend/src/i18n/locales/es-ES.json` | ✅ |

---

## 7. Troubleshooting

| Problema | Causa Provável | Solução |
|----------|---------------|---------|
| KPI cards não aparecem | Endpoint `/summary` retornou erro | Verificar logs do backend; `UserRepository.load_csm_account()` pode estar falhando |
| Tabela vazia | `vwAccountTeamCSM` sem dados | Verificar se a view tem registros e se os vínculos de conta estão cadastrados |
| Tipo sem badge colorido | Valor não está em `TYPE_BADGE` (ex: tipo personalizado) | O frontend usa `DEFAULT_BADGE` (cinza) automaticamente |
| Gráficos não aparecem | Filtro de Cliente ativo | Comportamento esperado — gráficos só aparecem sem filtro de cliente |
| Exportação Excel vazia | Nenhum registro após deduplicação | Verificar filtros ativos |
| Erro 401 nas queries | Token JWT expirado | Refazer login |
| Erro 500 nas queries | Falha na conexão com banco | Verificar `UserRepository.load_csm_account()` nos logs do backend |
| Cliente sem CSM | Registro sem `csm_name` na view | Verificar vínculo de pessoa na `tbAccountTeam` |
| Sem dados após rename de colunas | View `vwAccountTeamCSM` não atualizada após rename | Recriar/atualizar a view no banco para usar `accountteam_person_id` / `accountteam_person_type` |
