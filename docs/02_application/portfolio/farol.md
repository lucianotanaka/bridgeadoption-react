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

Registra quais clientes têm Farol configurado para cada vendor.

| Coluna | Tipo | Descrição |
|---|---|---|
| `customer_id` | int | FK para a empresa do cliente |
| `customer_name` | string | Nome do cliente |
| `vendor_id` | int | ID do vendor (1=CISCO, 5=FORTINET, 35=PALO ALTO) |

### 6.2 Tabela `tbFarol`

Contém os dados do Farol por vendor, cliente, architecture e solution.

| Coluna | Tipo | Descrição |
|---|---|---|
| `vendor_id` | int | ID do vendor |
| `customer_id` | int | FK para a empresa |
| `architecture` | string | Grupo de arquitetura (ex: "Networking", "Security") |
| `solution` | string | Nome da solução (ex: "Catalyst 9000", "Firepower") |
| `status` | string | `green`, `yellow`, `red`, `gray` ou `null` |
| `farol` | string | Descrição textual (ex: "Active", "Signed – Pending Activation") |

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

## 10. Troubleshooting

| Problema | Causa Provável | Solução |
|---|---|---|
| Lista de clientes vazia | Nenhum registro em `tbClientFarol` para o vendor selecionado | Verificar tabela `tbClientFarol` no banco |
| Grid vazio após Generate | Nenhum registro em `tbFarol` para o cliente selecionado | Verificar tabela `tbFarol`; executar job de importação |
| Erro "Failed to load clients" | Backend indisponível ou falha na query | Verificar logs do backend |
| Status ⚪ em todas as células | Coluna `status` com valores não mapeados | Verificar valores em `tbFarol.status` (esperado: `green`, `yellow`, `red`, `gray`) |
| `FarolRepository` não encontrado | `ImportError` na inicialização do service | Verificar `sys.path` e localização de `farol_repository.py` |
| Bug `load_farol` sem dados | Argumento `client_id` sendo passado como `customer_id` | Verificar `sections_service.py` — deve usar `client_id=customer_id` |

---

## 11. Referências

- **API endpoints:** `docs/07_api/farol_endpoints.md`
- **Módulo Portfolio (visão geral):** `docs/02_application/module_portfolio.md`
- **Router:** `backend/app/modules/sections_router.py`
- **Service:** `backend/app/modules/sections_service.py`
- **Repository:** `src/infrastructure/database/repositories/farol_repository.py`
- **Frontend:** `frontend/src/pages/portfolio/FarolPage.tsx`
- **Fonte Streamlit:** `webapp/pages/portfolio/farol.py`
