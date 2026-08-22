# Portfolio — Farol (Traffic Light)

> **Rota:** `/portfolio/farol`  
> **resource_key:** `portfolio.farol`  
> **Arquivo frontend:** `frontend/src/pages/portfolio/FarolPage.tsx`  
> **Fonte Streamlit:** `webapp/pages/portfolio/farol.py`  
> **Status:** ✅ Migrado para React — migração completa em 2026-08-18

---

## 1. Propósito

O **Farol** é um painel de status de cobertura contratual de soluções por cliente (*Traffic Light — Client Health Status*).

Exibe um grid visual organizado por **Architecture × Solution**, onde cada célula mostra o estado de cobertura de uma solução para um cliente específico através de emojis de semáforo. Permite que o time de Account Management identifique rapidamente quais soluções de um cliente estão ativas, pendentes, expiradas ou inexistentes.

---

## 2. Status e Indicadores

| Emoji | Status (DB) | Significado |
|---|---|---|
| 🟢 | `green` | **Active** — cobertura ativa e vigente |
| 🟡 | `yellow` | **Signed – Pending Activation** — contrato assinado, aguardando ativação |
| 🔴 | `red` | **Expired or Never Covered** — expirado ou nunca foi coberto |
| ⚪ | `gray` / `null` | **Non-Existent or Other Partner** — inexistente ou coberto por outro parceiro |

---

## 3. Fluxo de Uso

```
1. Usuário seleciona Vendor        → atualmente apenas CISCO (vendor_id = 1)
2. Lista de Clientes carrega       → GET /api/portfolio/farol/clients?vendor_id=1
3. Usuário seleciona um Cliente    → searchable dropdown com filtro por nome
4. Clica em "Generate Farol"       → GET /api/portfolio/farol?vendor_id=1&customer_id={id}
5. Grid é renderizado              → Architecture rows × Solution columns (máx. 5 por linha)
6. Exportar (opcional)             → botão "Export CSV" gera arquivo CSV local
```

---

## 4. Interface (React)

### 4.1 Filtros

| Filtro | Tipo | Comportamento |
|---|---|---|
| **Vendor** | `<select>` nativo | Reseta cliente e grid ao mudar; atualmente apenas CISCO |
| **Client** | Searchable dropdown | Carregado automaticamente ao selecionar vendor; busca por nome |
| **Generate Farol** | Botão | Dispara a query do Farol; desabilitado se vendor ou cliente não selecionados |

### 4.2 Grid do Farol

O grid é uma tabela `<table>` com:

- **Coluna 0 (Architecture):** célula com `rowSpan` cobrindo todas as linhas do grupo; fundo `bg-gray-50`
- **Colunas 1–5 (Solutions):** até 5 soluções por linha-de-grupo; cada célula mostra:
  - Nome da solução (negrito)
  - Emoji do status (centralizado, `text-xl`)
  - Texto descritivo do `farol` (quando disponível, `text-[9px]`)
  - Tooltip com label textual do status ao passar o mouse
- **Linhas extras:** quando uma architecture tem > 5 solutions, são criadas linhas adicionais (coluna Architecture fica em `rowSpan`)
- **Células vazias:** linhas com < 5 solutions têm células `<td>` transparentes para manter alinhamento do grid

### 4.3 Legenda

Exibida acima do grid:
```
🟢 Active  🟡 Signed – Pending Activation  🔴 Expired or Never Covered  ⚪ Non-Existent or Other Partner
```

### 4.4 Ações Pós-geração

| Ação | Descrição |
|---|---|
| **Export CSV** | Gera arquivo `YYYYMMDD_Farol_CISCO_ClienteXXX.csv` com UTF-8 BOM |
| **Refresh** (🔄) | Força `refetch` da query sem alterar filtros selecionados |

---

## 5. Arquitetura Técnica

### 5.1 Frontend

**Arquivo:** `frontend/src/pages/portfolio/FarolPage.tsx`

```
FarolPage
├── Estado de filtros
│   ├── vendor         (string, default "CISCO")
│   ├── client         (FarolClient | null)
│   ├── generated      (boolean — controla quando buscar dados)
│   ├── activeVendor   (string — vendor do último Generate)
│   └── activeClient   (FarolClient | null — cliente do último Generate)
│
├── Queries (React Query / TanStack Query)
│   ├── clientsQ       GET /api/portfolio/farol/clients?vendor_id={id}
│   │                  enabled: !!vendor  |  staleTime: 5 min
│   └── farolQ         GET /api/portfolio/farol?vendor_id={id}&customer_id={id}
│                      enabled: generated && !!activeVendor && !!activeClient
│                      staleTime: 2 min
│
├── Componentes internos
│   ├── Sel<T>         Searchable single-select genérico (reutilizável)
│   └── Grid           Renderiza a tabela Architecture × Solution
│
└── Helpers
    ├── buildGroups()  Agrupa FarolRow[] por architecture, deduplica solutions
    └── exportCSV()    Gera e dispara download de arquivo .csv
```

### 5.2 Backend — Service

**Arquivo:** `backend/app/modules/sections_service.py`

| Função | Descrição |
|---|---|
| `get_farol_clients(vendor_id)` | Retorna clientes de `tbClientFarol` para o vendor. Chama `FarolRepository.get_farol()` |
| `get_farol(vendor_id, customer_id)` | Retorna dados completos de `tbFarol`. Chama `FarolRepository.load_farol(client_id=customer_id)` |

> **Bug corrigido (2026-08-18):** o service chamava `repo.load_farol(customer_id=...)` mas o repositório espera `client_id=...`. Corrigido para `client_id=customer_id`.

### 5.3 Backend — Repository

**Arquivo:** `src/infrastructure/database/repositories/farol_repository.py`

| Método | Query | Retorno |
|---|---|---|
| `get_farol(vendor_id)` | `SELECT customer_id, customer_name FROM tbClientFarol WHERE vendor_id = %s GROUP BY customer_id ORDER BY customer_name` | `[{client_id, client_name}]` |
| `load_farol(vendor_id, client_id)` | `SELECT * FROM tbFarol WHERE vendor_id = %s AND customer_id = %s` | `[{architecture, solution, status, farol, ...}]` |

### 5.4 Backend — Router

**Arquivo:** `backend/app/modules/sections_router.py` → `portfolio_router`

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/portfolio/farol/clients` | Lista de clientes por vendor |
| GET | `/api/portfolio/farol` | Dados completos do Farol por vendor + cliente |

---

## 6. Estrutura de Dados

### 6.1 Tabela `tbClientFarol`

Registra quais clientes possuem dados no Farol (populada automaticamente a partir de `tbFarol`).

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | int AUTO_INCREMENT | PK |
| `vendor_id` | int | ID do vendor (1=CISCO, 5=FORTINET, 35=PALO ALTO) |
| `customer_id` | int | FK para a empresa do cliente |
| `customer_name` | varchar(255) | Nome do cliente (copiado de `tbFarol`) |
| `refreshed_at` | datetime | Data/hora da última atualização |

> Índices: `idx_vendor_customer (vendor_id, customer_id)`, `idx_customer_name (customer_name)`

### 6.2 Tabela `tbFarol`

Contém os dados completos do Farol por vendor, cliente, architecture e solution.  
**Recriada diariamente** via stored procedure (TRUNCATE + INSERT).

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | int AUTO_INCREMENT | PK |
| `vendor_id` | int | ID do vendor |
| `architecture` | varchar(100) | Grupo de arquitetura — derivado de `tbProduct.product_business_entity` (UPPER) |
| `solution` | varchar(100) | Sub-grupo — derivado de `tbProduct.product_subbusiness_entity` (UPPER) |
| `product_name` | varchar(200) | Nome completo do produto (`tbProduct.product_name`) |
| `customer_id` | int | FK para a empresa |
| `customer_name` | varchar(255) | Nome do cliente (`tbCompany.company_name`) |
| `status` | varchar(20) | `green`, `yellow`, `red`, `gray` — veja lógica abaixo |
| `farol` | varchar(255) | Descrição textual do status |
| `refreshed_at` | datetime | Data/hora da última atualização (NOW() do momento do INSERT) |

> Índices: `idx_customer_name (customer_name)`, `idx_status (status)`

**Lógica de status (CISCO):**

| Condição | `status` | `farol` |
|---|---|---|
| `MAX(vendorasset_end) >= CURRENT_DATE` | `green` | Active |
| `MAX(vendorasset_end) < CURRENT_DATE` | `red` | Expired or Never Covered |
| `MAX(vendorasset_end) IS NULL` | `yellow` | Signed – Pending Activation |
| Cliente não possui o produto | `gray` | Non-Existent or Other Partner |

### 6.3 FarolRow (frontend)

```typescript
interface FarolRow {
  architecture: string;
  solution: string;
  status: "green" | "yellow" | "red" | "gray" | null;
  farol: string | null;
}
```

### 6.4 FarolClient (frontend)

```typescript
interface FarolClient {
  client_id: number;
  client_name: string;
}
```

---

## 7. Vendors Suportados

| Vendor | vendor_id | Status |
|---|---|---|
| CISCO | 1 | ✅ Ativo |
| FORTINET | 5 | 🔜 Preparado no código (comentado) |
| PALO ALTO | 35 | 🔜 Preparado no código (comentado) |

Para habilitar um novo vendor, descomente a entrada em `VENDOR_MAP` no `FarolPage.tsx`:

```typescript
const VENDOR_MAP: Record<string, number> = {
  CISCO: 1,
  // FORTINET: 5,      ← descomentar para habilitar
  // "PALO ALTO": 35,  ← descomentar para habilitar
};
```

---

## 8. Export CSV

O arquivo exportado segue o padrão:

```
"Farol CISCO: Nome do Cliente"
""
"ARCHITECTURE_1","Solução A = Active","Solução B = Expired or Never Covered","",...
"","Solução F = Active","Solução G = Signed – Pending Activation",...
"ARCHITECTURE_2","Solução X = Active",...
```

- **Nome do arquivo:** `YYYYMMDD_Farol_CISCO_ClienteXXX.csv`
- **Encoding:** UTF-8 com BOM (compatível com Excel)
- **Separador:** vírgula
- **Máximo por linha:** 5 solutions por architecture-row (igual ao grid visual)

---

## 9. Permissões

O acesso ao Farol é controlado pelo RBAC da aplicação:

- **resource_key:** `portfolio.farol`
- **action:** `read` (visualização do grid)
- **ADMIN:** acesso total automático

---

## 10. Atualização de Dados — Stored Procedures e Agendamento

### 10.1 Visão Geral do Processo

`tbFarol` **não é atualizada em tempo real** — é **recriada integralmente uma vez por dia** pelo Event Scheduler do MariaDB. O processo envolve 3 stored procedures chamadas em sequência:

```
02:00 AM (diário)
    │
    ├─ sp_refresh_tbFarol()              → TRUNCATE tbFarol  (limpa tudo)
    │
    ├─ sp_refresh_tbFarol_forCisco()     → INSERT dados CISCO em tbFarol
    │   ├─ Fonte: tbProduct (vendor_id=1, com business_entity e subbusiness_entity)
    │   ├─ × tbContractVendorAsset (clientes com contratos vendor)
    │   ├─ LEFT JOIN tbAsset            (asset → product_id)
    │   └─ LEFT JOIN tbCompany          (company_name)
    │
    └─ sp_refresh_tbClientFarol()        → TRUNCATE + INSERT em tbClientFarol
        └─ Fonte: SELECT DISTINCT de tbFarol (gerada no passo anterior)
```

### 10.2 Event Scheduler

**Nome do evento:** `ev_refresh_asset_snapshots`

```sql
CREATE EVENT ev_refresh_asset_snapshots
ON SCHEDULE EVERY 1 DAY
STARTS '2026-02-17 02:00:00'
ON COMPLETION NOT PRESERVE
ENABLE
DO BEGIN
    CALL sp_refresh_tbAssetContractSummaryByCustomer();
    CALL sp_refresh_tbAssetContractEndMismatch();
    CALL sp_refresh_tbFarol();              -- 1. TRUNCATE tbFarol
    CALL sp_refresh_tbFarol_forCisco();     -- 2. INSERT Cisco em tbFarol
    CALL sp_refresh_tbClientFarol();        -- 3. TRUNCATE + INSERT tbClientFarol
    CALL sp_SyncCiscoWebOrders;
END
```

| Atributo | Valor |
|---|---|
| **Frequência** | A cada 1 dia |
| **Horário** | 02:00 AM (baseado em `STARTS '2026-02-17 02:00:00'`) |
| **Completion** | `NOT PRESERVE` — o evento permanece ativo continuamente |
| **Status** | `ENABLE` |
| **Database** | `pegasus` |

### 10.3 Stored Procedures

#### `sp_refresh_tbFarol()`
- **Ação:** `TRUNCATE TABLE tbFarol`
- **Efeito:** Apaga todos os registros existentes antes da reinserção
- Também contém `CREATE TABLE IF NOT EXISTS tbFarol` (garante existência da tabela na primeira execução)

#### `sp_refresh_tbFarol_forCisco()`
- **Ação:** `INSERT INTO tbFarol ...`
- **Lógica:** Cross join de todos os produtos CISCO (`tbProduct WHERE vendor_id=1 AND business_entity IS NOT NULL`) com todos os clientes que aparecem em contratos vendor (`tbContractVendorAsset`)
- **Join para status:** Agrega `MAX(vendorasset_end)` por cliente + produto via `tbContractVendorAsset JOIN tbAsset`
- **Derivação dos campos:**
  - `architecture` = `UPPER(product_business_entity)`
  - `solution` = `UPPER(product_subbusiness_entity)`
  - `customer_name` = `tbCompany.company_name`

#### `sp_refresh_tbClientFarol()`
- **Ação:** `TRUNCATE TABLE tbClientFarol` + `INSERT ... SELECT DISTINCT vendor_id, customer_id, customer_name FROM tbFarol`
- **Efeito:** Recria a lista de clientes disponíveis no Farol com base nos dados recém-inseridos em `tbFarol`
- Esta procedure deve ser chamada **sempre após** `sp_refresh_tbFarol_forCisco()`

### 10.4 Fontes de Dados (CISCO)

| Tabela Fonte | Papel |
|---|---|
| `tbProduct` | Lista de produtos Cisco (`vendor_id=1`) com `product_business_entity` e `product_subbusiness_entity` |
| `tbContractVendorAsset` | Contratos vendor por cliente (`vendorasset_customer_id`, `vendorasset_end`) |
| `tbAsset` | Mapeamento asset → produto (`asset_product_id`) |
| `tbCompany` | Nome do cliente (`company_name`) |

### 10.5 Execução Manual

Para recriar `tbFarol` manualmente (fora do agendamento), executar na ordem:

```sql
-- Conectado ao banco pegasus
CALL sp_refresh_tbFarol();              -- Trunca tbFarol
CALL sp_refresh_tbFarol_forCisco();     -- Popula com dados CISCO
CALL sp_refresh_tbClientFarol();        -- Atualiza lista de clientes
```

### 10.6 Verificar última atualização

```sql
-- Quando tbFarol foi atualizada pela última vez?
SELECT MAX(refreshed_at) AS ultima_atualizacao FROM tbFarol;

-- Quantos registros existem por vendor?
SELECT vendor_id, COUNT(*) AS total FROM tbFarol GROUP BY vendor_id;

-- Quando tbClientFarol foi atualizada?
SELECT vendor_id, COUNT(*) AS clientes, MAX(refreshed_at) AS ultima_atualizacao
FROM tbClientFarol
GROUP BY vendor_id;
```

---

## 11. Troubleshooting

| Problema | Causa Provável | Solução |
|---|---|---|
| Lista de clientes vazia | Event ainda não executou hoje ou falhou | Verificar `MAX(refreshed_at)` em `tbClientFarol`; executar `sp_refresh_tbClientFarol()` manualmente |
| Grid vazio após Generate | `tbFarol` vazia ou sem dados para o cliente | Verificar `MAX(refreshed_at)` em `tbFarol`; executar o ciclo de refresh manualmente |
| Dados desatualizados | Event falhou à noite | Verificar `information_schema.EVENTS` para status do `ev_refresh_asset_snapshots` |
| Erro "Failed to load clients" | Backend indisponível ou falha na query | Verificar logs do backend |
| Status ⚪ em todas as células | Produto sem contratos para o cliente OU status não mapeado | Verificar `tbContractVendorAsset` para o cliente; verificar valores em `tbFarol.status` |
| `tbFarol` crescendo sem parar | `sp_refresh_tbFarol()` não foi chamada antes de `sp_refresh_tbFarol_forCisco()` | Verificar ordem de chamada no event; executar TRUNCATE manual se necessário |
| `FarolRepository` não encontrado | `ImportError` na inicialização do service | Verificar `sys.path` e localização de `farol_repository.py` em `/opt/bridgeadoption/src/` |
| Event não executa | MariaDB Event Scheduler desabilitado | Executar `SET GLOBAL event_scheduler = ON;` e verificar `SHOW VARIABLES LIKE 'event_scheduler'` |

Para verificar o status do event scheduler:

```sql
-- Status do event scheduler
SHOW VARIABLES LIKE 'event_scheduler';

-- Status e próxima execução do evento
SELECT EVENT_NAME, STATUS, LAST_EXECUTED, INTERVAL_VALUE, INTERVAL_FIELD
FROM information_schema.EVENTS
WHERE EVENT_NAME = 'ev_refresh_asset_snapshots';
```

---

## 12. Referências

- **API endpoints:** `docs/07_api/farol_endpoints.md`
- **Módulo Portfolio (visão geral):** `docs/02_application/module_portfolio.md`
- **Router:** `backend/app/modules/sections_router.py`
- **Service:** `backend/app/modules/sections_service.py`
- **Repository:** `src/infrastructure/database/repositories/farol_repository.py`
- **Frontend:** `frontend/src/pages/portfolio/FarolPage.tsx`
- **Fonte Streamlit:** `webapp/pages/portfolio/farol.py`
