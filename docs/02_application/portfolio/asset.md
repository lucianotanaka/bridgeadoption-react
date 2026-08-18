# Módulo Assets — Portfolio

> **Rota:** `/portfolio/asset`
> **resource_key:** `portfolio.asset`
> **Arquivo frontend:** `frontend/src/pages/portfolio/AssetPage.tsx`
> **Migrado de:** `webapp/pages/portfolio/asset.py` (Streamlit)
> **Última atualização:** 2026-08-18

---

## 1. Propósito

Exibe o **portfólio de ativos (hardware/software/licenças)** de um cliente, com informações de contratos do Vendor (Cisco/fabricante) e da NTT, consolidadas na view `tbAssetContractEndMismatch`.

Permite ao time:
- Verificar quais assets o cliente possui e seu status contratual
- Identificar ativos cobertos apenas pelo Vendor, apenas pela NTT ou por ambos
- Detectar discrepâncias de datas e status (`status_consolidated`, `alert_reason`, `eos_status`, `ldos_status`)
- Exportar a visão filtrada para CSV

---

## 2. Visão Geral da Tela

```
┌──────────────────────────────────────────────────────────────────┐
│  Portfolio — Assets                         [Export CSV] [↺]     │
│  Customer Asset Portfolio                                         │
├──────────────────────────────────────────────────────────────────┤
│  SELECT CLIENT                                                    │
│  [Select a customer…  ▾]          [🔍 Load Assets]               │
├──────────────────────────────────────────────────────────────────┤
│  ┌────────────┐ ┌──────────────┐ ┌────────────┐ ┌────────────┐  │
│  │Total Assets│ │ Vendor Only  │ │  NTT Only  │ │Vendor + NTT│  │
│  │   1.234    │ │  321 (26.0%)│ │  189 (15.3%)│ │ 724 (58.7%)│  │
│  └────────────┘ └──────────────┘ └────────────┘ └────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│  Filters                                                          │
│  [Vendor▾] [Product Name▾] [NTT Contract▾] [Subscription ID▾]   │
│  [Serial▾] [Instance▾] [Major/Minor▾] [Status▾] [Alert Reason▾]  │
│  [EOS Status▾] [LDOS Status▾]                    [✕ Clear]       │
├──────────────────────────────────────────────────────────────────┤
│  1.234 assets — ACME CORP                                        │
│  ┌──────────┬────────┬──────────────┬─────────────┬──────────┐  │
│  │ Asset ID │ Vendor │ Product Name │ Serial Num. │ Status   │  │
│  ├──────────┼────────┼──────────────┼─────────────┼──────────┤  │
│  │   10042  │ CISCO  │ C9300-48UXM  │ FDO2451G0YP │ Active   │  │
│  └──────────┴────────┴──────────────┴─────────────┴──────────┘  │
│  Showing 1–50 of 1.234  Per page [50▾]   [« ‹ 1 2 3 … › »]     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Funcionalidades

### 3.1 Seletor de Cliente

- Dropdown **searchable** populado de `GET /portfolio/asset-clients`
- Fonte: `tbAssetContractSummaryByCustomer` — retorna apenas clientes que **têm assets** cadastrados
- Botão **"Load Assets"** dispara a query; enquanto carrega exibe spinner no botão
- O seletor tem campo de busca por digitação para facilitar encontrar o cliente em listas grandes

### 3.2 Summary Cards

Quatro cards calculados **client-side** sobre o total de rows carregados:

| Card | Lógica |
|------|--------|
| **Total Assets** | `allRows.length` |
| **Vendor Only** | `vendorasset_contract_num NOT NULL AND nttasset_contract_number IS NULL` |
| **NTT Only** | `nttasset_contract_number NOT NULL AND vendorasset_contract_num IS NULL` |
| **Vendor + NTT** | Ambos os contratos presentes |

Cada card mostra valor absoluto + percentual do total.

### 3.3 Filtros (11 MultiSelects)

Todos os filtros são **multi-select** com dropdown e campo de busca. Aplicados sobre o dataset completo:

| Filtro | Coluna | Label na UI |
|--------|--------|-------------|
| Vendor | `vendorasset_vendor_name` | Vendor |
| Product Name | `product_name` | Product Name |
| NTT Contract | `nttasset_contract_number` | NTT Contract |
| Subscription ID | `asset_subscription_id` | Subscription ID |
| Serial Number | `asset_serial_number` | Serial Number |
| Instance Number | `asset_instance_number` | Instance Number |
| Major/Minor | `asset_parent_level` | Major/Minor |
| Status | `status_consolidated` | Status |
| Alert Reason | `alert_reason` | Alert Reason |
| EOS Status | `eos_status` | EOS Status |
| LDOS Status | `ldos_status` | LDOS Status |

Botão **"✕ Clear filters"** aparece quando qualquer filtro estiver ativo. O contador de resultados e a paginação refletem os filtros em tempo real.

### 3.4 Tabela de Assets

- **29 colunas** com nomes mapeados (ver [Seção 5](#5-mapeamento-de-colunas))
- Scroll horizontal para acomodar todas as colunas
- Células com valor nulo exibem `—` cinza
- Paginação padrão: **50 registros por página**

### 3.5 Paginação

- **Opções**: 10 / 25 / 50 / 100 por página
- Página reinicia ao `1` quando os dados são recarregados
- O **Export CSV** exporta **todos os registros filtrados** (não apenas a página visível)

### 3.6 Export CSV

- Formato: CSV com BOM UTF-8 (abre corretamente no Excel)
- Nome do arquivo: `YYYYMMDD_asset_{nomeCliente}.csv`
- Headers renomeados (mesma tabela de mapeamento de colunas)
- Inclui todos os registros filtrados

### 3.7 Refresh

- Botão `↺` recarrega os dados do cliente ativo sem precisar clicar "Load Assets" novamente
- Spinner animado durante o carregamento

---

## 4. Fontes de Dados

| Fonte | Uso |
|-------|-----|
| `tbAssetContractSummaryByCustomer` | Lista de clientes com assets (para o selector) |
| `tbAssetContractEndMismatch` | Dados completos de assets + contratos por cliente |

### Tabelas/Views envolvidas

**`tbAssetContractSummaryByCustomer`** (view)
```sql
-- Usada apenas para o seletor de clientes
customer_id   INT
customer_name VARCHAR
```

**`tbAssetContractEndMismatch`** (view)
```sql
-- Dados completos de assets com contratos Vendor e NTT
asset_id                    INT
asset_serial_number         VARCHAR
asset_instance_number       VARCHAR
asset_subscription_id       VARCHAR
asset_parent_level          VARCHAR   -- 'MAJOR' | 'MINOR'
asset_parent_serial_number  VARCHAR
asset_parent_instance_number VARCHAR
product_id                  INT
product_name                VARCHAR
product_manufacturer_id     INT
product_manufacturer_name   VARCHAR
product_family              VARCHAR
product_group               VARCHAR
product_subtype             VARCHAR
-- Contrato Vendor (ex: Cisco SmartNet)
vendorasset_contract_num    VARCHAR
vendorasset_customer_id     INT
vendorasset_customer_name   VARCHAR
vendorasset_vendor_id       INT
vendorasset_vendor_name     VARCHAR
vendorasset_start           DATE
vendorasset_end             DATE
-- Contrato NTT
nttasset_contract_number    VARCHAR
nttasset_entitlement_id     INT
nttasset_entitlement_contract VARCHAR
nttasset_customer_id        INT
nttasset_customer_name      VARCHAR
nttasset_contract_start     DATE
nttasset_contract_end       DATE
-- Status e alertas
end_date_diff_days          INT
start_date_diff_days        INT
customer_mismatch_flag      VARCHAR
status_consolidated         VARCHAR
alert_reason                VARCHAR
product_eos                 DATE
product_ldos                DATE
eos_status                  VARCHAR   -- 'Active' | 'EoS Reached' | etc.
ldos_status                 VARCHAR   -- 'Active' | 'LDOS Reached' | etc.
```

**`tbAsset`** (tabela base)
```sql
asset_id                    INT  PK AUTO_INCREMENT
asset_product_id            INT  FK tbProduct.product_id
asset_serial_number         VARCHAR(100)
asset_instance_number       VARCHAR(100)
asset_subscription_id       VARCHAR(100)
asset_parent_level          VARCHAR(10)   -- MAJOR | MINOR
asset_parent_serial_number  VARCHAR(100)
asset_parent_instance_number VARCHAR(100)
```

---

## 5. Mapeamento de Colunas

| Coluna DB | Label na UI |
|-----------|-------------|
| `asset_id` | Asset ID |
| `vendorasset_vendor_name` | Vendor |
| `product_name` | Product Name |
| `asset_serial_number` | Serial Number |
| `asset_instance_number` | Instance Number |
| `asset_subscription_id` | Subscription ID |
| `asset_parent_level` | Major/Minor |
| `asset_parent_serial_number` | Parent Serial Number |
| `asset_parent_instance_number` | Parent Instance Number |
| `product_manufacturer_name` | Manufacturer |
| `product_family` | Product Family |
| `product_group` | Product Group |
| `product_subtype` | Asset Type |
| `vendorasset_contract_num` | Vendor Contract Number |
| `vendorasset_customer_name` | Client Name (Vendor Contract) |
| `nttasset_contract_number` | NTT Contract Number |
| `nttasset_entitlement_contract` | Entitlement Contract |
| `nttasset_customer_name` | Client Name (NTT Contract) |
| `vendorasset_start` | Start Date (Vendor Contract) |
| `vendorasset_end` | End Date (Vendor Contract) |
| `nttasset_contract_start` | Start Date (NTT Contract) |
| `nttasset_contract_end` | End Date (NTT Contract) |
| `customer_mismatch_flag` | Customer Mismatch Flag |
| `status_consolidated` | Status Consolidated |
| `alert_reason` | Alert Reason |
| `product_eos` | EOS |
| `product_ldos` | LDOS |
| `eos_status` | EOS Status |
| `ldos_status` | LDOS Status |

---

## 6. Regras de Negócio

| # | Regra |
|---|-------|
| RN-01 | O seletor de clientes lista **apenas** clientes que possuem assets em `tbAssetContractSummaryByCustomer` |
| RN-02 | A query de assets filtra por `vendorasset_customer_id = {id} OR nttasset_customer_id = {id}` — captura assets cobertura unilateral |
| RN-03 | Assets sem `vendorasset_contract_num` E sem `nttasset_contract_number` não aparecem (excluídos pela view) |
| RN-04 | **Vendor Only**: tem `vendorasset_contract_num` mas não tem `nttasset_contract_number` |
| RN-05 | **NTT Only**: tem `nttasset_contract_number` mas não tem `vendorasset_contract_num` |
| RN-06 | **Vendor + NTT**: tem ambos os contratos |
| RN-07 | Os filtros são aplicados client-side sobre todos os dados carregados (não são parâmetros de API) |
| RN-08 | O Export CSV exporta o dataset **filtrado** (não o total), com todos os registros (sem paginação) |
| RN-09 | `asset_parent_level` indica hierarquia: `MAJOR` = ativo pai, `MINOR` = componente filho |
| RN-10 | `customer_mismatch_flag` indica divergência entre o cliente no contrato Vendor e no contrato NTT |
| RN-11 | `eos_status` / `ldos_status`: indicam se o produto já atingiu End-of-Support / Last Date of Support |

---

## 7. Arquitetura Backend

```
sections_router.py (portfolio_router)
    GET /api/portfolio/asset-clients → get_asset_clients()
    GET /api/portfolio/assets?customer_id={id} → get_assets(customer_id)

sections_service.py
    get_asset_clients()
        → AssetRepository.filter_asset_clients(as_df=True)
        → SELECT customer_id AS client_id, customer_name AS client_name
          FROM tbAssetContractSummaryByCustomer
        → Retorna [{ client_id, client_name }]

    get_assets(customer_id)
        → AssetRepository.get_asset_contracts(client_id=customer_id, as_df=True)
        → SELECT ... FROM tbAssetContractEndMismatch
          WHERE vendorasset_customer_id = %s OR nttasset_customer_id = %s
        → Retorna lista completa de assets com todos os campos de contrato

Repositories
    AssetRepository
        filter_asset_clients(as_df)   → tbAssetContractSummaryByCustomer
        get_asset_contracts(client_id, as_df)  → tbAssetContractEndMismatch
```

---

## 8. Arquitetura Frontend

```
AssetPage.tsx
├── COL_ORDER[]          — 29 colunas na ordem de exibição
├── COL_LABELS{}         — mapeamento coluna DB → label UI
├── getUniq(rows, key)   — distinct values para opções dos filtros
├── exportCSV(rows, name)— export client-side com BOM UTF-8
├── ClientSelect         — dropdown searchable com campo de busca por digitação
├── MultiSelect          — dropdown multi-seleção (11 instâncias, 1 por filtro)
├── PaginationBar        — paginação com janela deslizante de 5 páginas
└── AssetPage (default export)
    ├── clientsQ         — GET /portfolio/asset-clients (staleTime: 10 min)
    ├── assetsQ          — GET /portfolio/assets?customer_id= (staleTime: 5 min)
    ├── Summary cards    — calculados client-side sobre allRows
    ├── 11× filter state — fVendor, fProduct, fNttContract, fSubs, fSerial,
    │                      fInstance, fMajorMinor, fStatus, fAlert, fEos, fLdos
    ├── filtered useMemo — aplica todos os filtros em cadeia sobre allRows
    └── paginated slice  — filtered[(page-1)*pageSize : page*pageSize]
```

**Queries (React Query):**

| Query key | Endpoint | Quando |
|-----------|----------|--------|
| `["asset-clients"]` | `GET /portfolio/asset-clients` | Na montagem da página |
| `["portfolio-assets", clientId]` | `GET /portfolio/assets?customer_id=` | Após clique em "Load Assets" |

---

## 9. Permissões

| Nível | Comportamento |
|-------|---------------|
| Sem permissão | Redirecionado pela `PermissionRoute` (resource_key: `portfolio.asset`) |
| `view` ou superior | Acesso completo: seleção de cliente, visualização, filtros, export |

Este módulo é somente leitura — não há operações de escrita.

---

## 10. Diferenças em relação ao Streamlit original

| Aspecto | Streamlit | React |
|---------|-----------|-------|
| Filtros aplicados em | Página atual (paginated slice) | Dataset completo carregado |
| Paginação | st.session_state manual com botões ≪‹›≫ | PaginationBar com janela deslizante |
| Export | Excel (via `convert_df_to_excel`) | CSV com BOM UTF-8 |
| Seletor de cliente | `st.selectbox` com lista simples | Dropdown searchable com input de busca |
| Estado entre reloads | st.session_state persistido | React Query cache (staleTime: 5 min) |
| Colunas duplicadas | Deduplicação manual (`~df.columns.duplicated()`) | `COL_ORDER` com colunas únicas (sem duplicatas) |

---

## 11. Referências

- **API:** `docs/07_api/asset_endpoints.md`
- **AssetRepository:** `src/infrastructure/database/repositories/asset_repository.py`
- **Streamlit original:** `webapp/pages/portfolio/asset.py`
- **Módulo Portfolio (visão geral):** `docs/02_application/module_portfolio.md`
