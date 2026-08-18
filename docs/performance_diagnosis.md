# Diagnóstico de Performance — Bridge Adoption React

**Data:** 2026-08-18  
**Analista:** Axet Plugin  
**Escopo:** Frontend React + Backend FastAPI + Repositórios Streamlit reutilizados

---

## 1. Contexto do Servidor

A imagem do `top` revela um servidor sob **pressão extrema de memória e I/O**:

| Métrica | Valor | Avaliação |
|---|---|---|
| Load Average (1m / 5m / 15m) | 1.26 / 1.19 / **3.10** | Pico recente de sobrecarga |
| CPU I/O Wait (`wa`) | **23.1%** | ⚠️ Crítico — 1/4 do tempo de CPU aguardando disco |
| Memória Livre | **768 MB** de 15.7 GB | 95% da RAM ocupada |
| Swap Usado | **4.258 GB** de 8 GB | Sistema em trashing (swap intenso) |
| Processo Python (PID 2443088) | **16.2% CPU, 81% Mem (12.4 GB RES)** | ⚠️ Crítico — processo único consumindo quase toda a RAM |

**Conclusão do servidor:** O processo Python (Uvicorn/FastAPI) está segurando grandes volumes de dados em memória, o que forçou o SO a usar swap. O I/O wait elevado é consequência direta: toda vez que o Python acessa dados paginados para disco, o servidor trava esperando leitura. Reduzir o consumo de memória do processo Python é o ganho de maior impacto imediato.

---

## 2. Problemas Identificados

---

### 🔴 P1 — CRÍTICO: Queries duplicadas no carregamento da tela Tasks

**Arquivo:** `backend/app/tasks/service.py`

Quando a tela Tasks abre (aba Overview ativa por padrão), o frontend dispara **3 chamadas simultâneas**:

```
GET /api/tasks/kpi
GET /api/tasks/action-queue
GET /api/tasks/overview
```

Cada endpoint cria um `TaskRepository()` separado e acessa o banco **de forma completamente independente**:

| Endpoint | `get_task_dashboard()` | `get_task_value_rollup()` | `get_task_activity_dashboard()` |
|---|:---:|:---:|:---:|
| `/kpi` | ✅ Executa | — | ✅ Executa |
| `/action-queue` | ✅ Executa | ✅ Executa | — |
| `/overview` | ✅ Executa | ✅ Executa | — |
| **TOTAL** | **3×** | **2×** | **1×** |

**Resultado:** `SELECT * FROM vwTaskDashboard` é executado **3 vezes** para um único carregamento de página — com o mesmo `owner_id`, no mesmo segundo, retornando dados idênticos. São **6 queries ao banco** para abrir a tela Tasks.

```python
# service.py — cada função cria sua própria conexão e re-executa a mesma query:

def get_task_kpi_summary(user_id, is_manager):
    task_repo = TaskRepository()               # nova conexão
    task_rows = task_repo.get_task_dashboard() # SELECT * FROM vwTaskDashboard  ← 1ª vez

def get_task_action_queue(user_id, is_manager, limit):
    task_repo = TaskRepository()               # nova conexão
    task_rows = task_repo.get_task_dashboard() # SELECT * FROM vwTaskDashboard  ← 2ª vez
    value_rows = task_repo.get_task_value_rollup() # SELECT * FROM vwTaskValueRollup ← 1ª vez

def get_task_overview(user_id, is_manager):
    task_repo = TaskRepository()               # nova conexão
    task_rows = task_repo.get_task_dashboard() # SELECT * FROM vwTaskDashboard  ← 3ª vez
    value_rows = task_repo.get_task_value_rollup() # SELECT * FROM vwTaskValueRollup ← 2ª vez
```

---

### 🔴 P2 — CRÍTICO: Queries multiplicadas na tela Cisco LCI

**Arquivo:** `backend/app/adoption/cisco_lci_service.py`  
**Frontend:** `frontend/src/pages/ciscoLci/CiscoLCIReportPage.tsx`

O frontend dispara **13 chamadas simultâneas** ao montar o componente. Cada uma delas, no backend, chama `_load_all_enriched()` que por sua vez chama `repo.find_all()` (= `SELECT * FROM vwCiscoLCI WHERE task_eligible='Y'`):

| Endpoint chamado | `find_all()` | `load_cisco_lci_all()` | Total DB |
|---|:---:|:---:|:---:|
| `/summary` | 1× | 1× | 2 |
| `/total-eligibles` | 1× | 1× | 2 |
| `/by-stage-status` | 1× | — | 1 |
| `/termination-status` | 1× | — | 1 |
| `/burnup?fy=...` | 2× (via `get_lci_summary` interno) | 2× | 4 |
| `/yoy` | 1× | — | 1 |
| `/lost-justification` | — | 1× | 1 |
| `/stages?status=approved` | 1× | — | 1 |
| **TOTAL** | **8×** | **5×** | **~13** |

**Detalhe do pior caso — `get_lci_wallet_burndown(fy=...)`:**

```python
def get_lci_wallet_burndown(date_from, date_to, fy):
    rows = _load_all_enriched()           # DB query 1: find_all()
    repo.load_cisco_lci_all()             # DB query 2

    fy_summary = get_lci_summary(fy)      # chama internamente:
        # _load_all_enriched()            # DB query 3: find_all() de novo!
        # repo.load_cisco_lci_all()       # DB query 4 de novo!
```

**Um único endpoint `/burnup` gera 4 queries ao banco** — todas retornando os mesmos dados de LCI.

---

### 🔴 P3 — CRÍTICO: Ausência de Connection Pooling

**Arquivos:** `backend/app/core/database.py` e `src/infrastructure/database/connection.py`

Ambos os arquivos usam `mysql.connector.connect()` diretamente — cada query cria **uma nova conexão TCP com o MariaDB**, com todo o overhead de autenticação, handshake SSL e alocação de recursos:

```python
# connection.py — sem pool:
def get_db_connection():
    return mysql.connector.connect(
        host=DB_HOST, port=DB_PORT,
        user=DB_USER, password=DB_PASSWORD,
        database=DB_NAME,
    )
    # Conexão criada → query executada → conexão destruída. A cada vez.
```

O `get_sqlalchemy_engine()` **existe e tem pool configurado** (`pool_pre_ping=True`, `pool_recycle=3600`), mas só é usado quando `as_df=True` (modo pandas). Todos os endpoints de dashboard usam `as_df=False` — portanto o pool **nunca é ativado** nos endpoints críticos.

**Consequência:** Com 6 queries na abertura da tela Tasks e 13 no Cisco LCI, o servidor abre e fecha **19 conexões TCP com o MariaDB** a cada carregamento de página por um único usuário. Com múltiplos usuários simultâneos, isso multiplica rapidamente.

---

### 🔴 P4 — CRÍTICO: Ausência de Cache Server-Side

**Arquivo:** `backend/app/tasks/service.py`, `backend/app/adoption/cisco_lci_service.py`

Não existe nenhuma forma de cache em memória no backend. Cada requisição HTTP — não importa quão recente seja a anterior — vai direto ao banco de dados. Para dados que mudam raramente (como `vwTaskDashboard`, `vwCiscoLCI`), isso é desnecessário e muito custoso.

**Impacto na memória:** Como não há cache, as respostas não são reutilizadas entre requisições. Porém, durante o processamento de cada requisição, os resultados (potencialmente milhares de linhas) são carregados em listas Python (`task_rows`, `value_rows`) e manipulados em memória. Se múltiplos usuários estiverem abrindo a mesma tela simultaneamente, o processo Python mantém múltiplas cópias dos mesmos dados — explicando o uso de 12.4 GB de RAM observado no `top`.

---

### 🟠 P5 — ALTO: `SELECT *` em Views Pesadas

**Arquivo:** `src/infrastructure/database/repositories/task_repository.py`

Todos os métodos críticos usam `SELECT *`:

```python
def get_task_dashboard(self, owner_id=None, ...):
    query = "SELECT * FROM vwTaskDashboard"  # TODAS as colunas

def get_task_value_rollup(self, owner_id=None, ...):
    query = "SELECT * FROM vwTaskValueRollup"  # TODAS as colunas
```

Views como `vwTaskDashboard` provavelmente fazem JOINs entre `tbTask`, `tbTaskActivity`, `tbUser`, `tbCustomer` e retornam dezenas de colunas — muitas das quais não são utilizadas nos cálculos de KPI. Retornar colunas desnecessárias aumenta o volume de dados transferidos da rede MariaDB→Python e o uso de memória para cada row.

---

### 🟠 P6 — ALTO: Processamento Python de Agregações que deveriam ser SQL

**Arquivo:** `backend/app/tasks/service.py` — `get_task_kpi_summary()`

O KPI é calculado carregando **todas** as tasks para Python e iterando com loops:

```python
# service.py — carrega TUDO e agrega em Python:
task_rows = task_repo.get_task_dashboard(owner_id=owner_id)  # pode ser centenas de linhas
act_rows = activity_repo.get_task_activity_dashboard(owner_id=owner_id)

for r in active:               # loop Python sobre todas as tasks ativas
    if status_id == 1: open_count += 1
    if nfu <= today: fu_today += 1
    # ... 15+ condicionais por linha
```

Esses cálculos (contagens por status, totais financeiros, contagem de overdue) poderiam ser executados como agregações SQL (`COUNT`, `SUM`, `CASE WHEN`), retornando apenas ~20 valores numéricos ao invés de carregar todas as linhas de tasks em memória.

---

### 🟠 P7 — ALTO: Cisco LCI — `_load_all_enriched()` aplica pandas por linha

**Arquivo:** `backend/app/adoption/cisco_lci_service.py`

A função `_load_all_enriched()` chama `_enrich_row()` para cada linha individualmente:

```python
def _load_all_enriched() -> List[Dict[str, Any]]:
    repo = CiscoLCIRepository()
    rows = repo.find_all(task_eligible="Y", as_df=False) or []
    return [_enrich_row(dict(r)) for r in rows]  # loop Python por linha

def _enrich_row(r):
    # Para cada linha, faz:
    import pandas as pd                    # import dentro do loop (!)
    ts = pd.to_datetime(end)               # conversão pandas por linha
    row["lci_stage_end_fy"] = _calculate_fy(end_ts)  # mais uma chamada por linha
```

- `import pandas as pd` dentro de `_enrich_row()` — embora Python faça cache do módulo importado, o overhead de verificar o cache do `sys.modules` repetidamente por linha é desnecessário
- Uso de `pd.to_datetime()` linha a linha ao invés de vetorizado (via DataFrame)
- Se `find_all()` retorna 1000 linhas, `pd.to_datetime()` é chamado 1000 vezes em loop

---

### 🟡 P8 — MÉDIO: Frontend dispara queries não necessárias no carregamento

**Arquivo:** `frontend/src/pages/tasks/TaskPage.tsx`

```typescript
const kpiQuery = useQuery({
  queryKey: ["tasks", "kpi"],
  queryFn: () => tasksApi.getKPI()...
  staleTime: 2 * 60 * 1000,
  // sem "enabled" — dispara IMEDIATAMENTE ao montar
});

const actionQueueQuery = useQuery({
  queryKey: ["tasks", "action-queue"],
  queryFn: () => tasksApi.getActionQueue(10)...
  staleTime: 2 * 60 * 1000,
  // sem "enabled" — dispara IMEDIATAMENTE ao montar
});

const overviewQuery = useQuery({
  queryKey: ["tasks", "overview"],
  queryFn: () => tasksApi.getOverview()...
  staleTime: 2 * 60 * 1000,
  enabled: activeTab === "overview",  // guardado — mas Overview é o default
});
```

Como `activeTab` começa com `"overview"`, os 3 queries disparam simultaneamente no carregamento. Não há como o usuário "pré-cancelar" queries desnecessárias.

---

### 🟡 P9 — MÉDIO: Cisco LCI — 13 queries paralelas sem coordenação

**Arquivo:** `frontend/src/pages/ciscoLci/CiscoLCIReportPage.tsx`

Todos os `useQuery` são declarados no topo do componente sem `enabled` condicional:

```typescript
// Todos disparam simultaneamente ao montar:
const summaryQuery        = useQuery({ queryKey: ["lci", "summary", selectedFY], ... })
const totalEligiblesQuery = useQuery({ queryKey: ["lci", "total-eligibles", selectedFY], ... })
const stageStatusQuery    = useQuery({ queryKey: ["lci", "stage-status", selectedFY], ... })
const forecastClientQuery = useQuery({ queryKey: ["forecast", "client", selectedFY], ... })
const incentiveFYQuery    = useQuery({ queryKey: ["forecast", "incentive-fy"], ... })
const effortClientQuery   = useQuery({ queryKey: ["forecast", "effort-client"], ... })
const effortUCQuery       = useQuery({ queryKey: ["forecast", "effort-uc"], ... })
const lostJustQuery       = useQuery({ queryKey: ["lci", "lost-justification", selectedFY], ... })
const termQuery           = useQuery({ queryKey: ["lci", "term", selectedFY], ... })
const burnupQuery         = useQuery({ queryKey: ["lci", "burnup", selectedFY], ... })
const yoyQuery            = useQuery({ queryKey: ["lci", "yoy"], ... })
const stagesQuery         = useQuery({ queryKey: ["lci", "stages", selectedFY, activeTab], ... })
// + lciJourneyQuery (habilitado apenas na aba operational)
```

O único guardado é `lciJourneyQuery` (`enabled: overviewTab === "operational"`). Os outros 12 disparam juntos, gerando **thunder herd effect** — todos chegam ao backend e ao banco simultaneamente, competindo por conexões e CPU.

---

### 🟡 P10 — MÉDIO: Uvicorn rodando com workers insuficientes (WSGI síncrono)

**Arquivo:** `backend/app/main.py`, configuração do servidor

O FastAPI está rodando com Uvicorn. Se configurado com um único worker (configuração padrão em muitos deployments), todas as requisições são processadas **serialmente** — uma de cada vez. Quando o endpoint `/kpi` está esperando o MariaDB responder, as chamadas para `/action-queue` e `/overview` ficam na fila aguardando.

Como os endpoints usam `mysql.connector` síncrono (blocking I/O), o Uvicorn não consegue intercalar requisições enquanto aguarda o banco. O resultado é exatamente o que os screenshots mostram: spinner girando por longos segundos.

---

### 🟡 P11 — MÉDIO: Serialização por linha com verificação `pandas.isna()` em todo dict

**Arquivo:** `backend/app/tasks/service.py` — `_serialize_row()`

```python
def _serialize_row(row: Dict[str, Any]) -> Dict[str, Any]:
    result = {}
    for k, v in row.items():
        if v is None:
            result[k] = None
        elif hasattr(v, "isoformat"):
            result[k] = v.isoformat()
        else:
            try:
                import pandas as pd
                if pd.isna(v):       # pd.isna() chamado para CADA valor de CADA linha
                    result[k] = None
                    continue
            except Exception:
                pass
            result[k] = v
    return result
```

`pd.isna()` é chamado para cada valor de cada coluna de cada linha retornada pelo banco — incluindo strings e inteiros que nunca seriam `NaT`. Para centenas de tasks com dezenas de colunas, isso representa dezenas de milhares de chamadas ao pandas por request.

---

## 3. Mapa de Impacto vs Esforço

```
IMPACTO
  Alto │ P1(KPI unificado) ─── P2(LCI consolidado)
       │ P4(Cache TTL)     ─── P3(Connection Pool)
       │                       P6(KPI via SQL)
  Méd  │                       P5(SELECT colunas)
       │ P8(Frontend)          P7(Enrich vetorizado)
  Baixo│ P11(serialize)    ─── P10(Uvicorn workers)
       │                   P9(Frontend)
       └────────────────────────────────────────────
         Baixo            Médio           Alto
                                               ESFORÇO
```

---

## 4. Plano de Melhorias (Priorizado)

### Fase 1 — Quick Wins (1-3 dias, máximo impacto)

#### 4.1 — Implementar Connection Pool no `get_db_connection()`

Substituir `mysql.connector.connect()` por `MySQLConnectionPool` em ambos os arquivos de conexão:

```python
# connection.py — ANTES:
def get_db_connection():
    return mysql.connector.connect(host=DB_HOST, ...)

# connection.py — DEPOIS:
from mysql.connector import pooling

_pool = pooling.MySQLConnectionPool(
    pool_name="bridge_pool",
    pool_size=10,            # ajustar conforme carga
    pool_reset_session=True,
    host=DB_HOST,
    port=DB_PORT,
    user=DB_USER,
    password=DB_PASSWORD,
    database=DB_NAME,
    charset="utf8mb4",
    use_unicode=True,
)

def get_db_connection():
    return _pool.get_connection()
```

**Impacto:** Elimina o custo de criar/destruir conexões TCP. Conexões são reutilizadas. Estimativa de ganho: **30-50% de redução no tempo de resposta** dos endpoints.

---

#### 4.2 — Implementar Cache TTL para dados do Dashboard

Adicionar `cachetools` (ou `functools.lru_cache` com TTL manual) nos service layers:

```python
# Instalar: pip install cachetools

from cachetools import TTLCache
import threading

_task_dashboard_cache: TTLCache = TTLCache(maxsize=128, ttl=120)  # 2 min
_cache_lock = threading.Lock()

def _get_task_dashboard_cached(owner_id, is_manager):
    cache_key = f"dashboard:{owner_id}:{is_manager}"
    with _cache_lock:
        if cache_key in _task_dashboard_cache:
            return _task_dashboard_cache[cache_key]
    
    task_repo = TaskRepository()
    data = task_repo.get_task_dashboard(owner_id=None if is_manager else owner_id)
    
    with _cache_lock:
        _task_dashboard_cache[cache_key] = data
    return data
```

Aplicar o mesmo padrão para `get_task_value_rollup()`, `_load_all_enriched()` e `repo.load_cisco_lci_all()`.

**Impacto:** Com 2 minutos de cache, a 2ª, 3ª e Nª requisição ao dashboard retornam em **< 10ms** (cache hit), contra vários segundos atualmente. Elimina o thundering herd de múltiplos usuários. **Redução de memória**: dados compartilhados via cache ao invés de duplicados por request.

---

#### 4.3 — Unificar endpoint de dashboard Tasks

Criar um único endpoint `/api/tasks/dashboard` que executa as queries **uma única vez**:

```python
# service.py — nova função unificada:
def get_task_dashboard_unified(user_id, is_manager, action_queue_limit=10):
    """Retorna KPI + overview + action_queue em uma única passagem dos dados."""
    task_repo = TaskRepository()
    activity_repo = TaskActivityRepository()
    
    owner_id = None if is_manager else user_id
    
    # Queries executadas UMA única vez:
    task_rows = task_repo.get_task_dashboard(owner_id=owner_id)
    value_rows = task_repo.get_task_value_rollup(owner_id=owner_id)
    act_rows = activity_repo.get_task_activity_dashboard(owner_id=owner_id)
    
    # Calcular KPI, Overview e Action Queue a partir dos mesmos dados
    kpi = _compute_kpi(task_rows, act_rows, value_rows)
    overview = _compute_overview(task_rows, value_rows)
    action_queue = _compute_action_queue(task_rows, value_rows, limit=action_queue_limit)
    
    return {"kpi": kpi, "overview": overview, "action_queue": action_queue}

# router.py — novo endpoint:
@router.get("/dashboard")
def task_dashboard(current_user: ..., limit: int = 10):
    return get_task_dashboard_unified(user_id, is_manager, limit)
```

**No frontend**, substituir os 3 useQuery por 1:

```typescript
// TaskPage.tsx — ANTES: 3 queries separadas
const kpiQuery         = useQuery({ queryKey: ["tasks", "kpi"], ... })
const actionQueueQuery = useQuery({ queryKey: ["tasks", "action-queue"], ... })
const overviewQuery    = useQuery({ queryKey: ["tasks", "overview"], ... })

// TaskPage.tsx — DEPOIS: 1 query unificada
const dashboardQuery = useQuery({
  queryKey: ["tasks", "dashboard"],
  queryFn: () => tasksApi.getDashboard().then(r => r.data),
  staleTime: 2 * 60 * 1000,
})
const kpi = dashboardQuery.data?.kpi
const actionQueue = dashboardQuery.data?.action_queue ?? []
const overviewTasks = dashboardQuery.data?.overview?.tasks ?? []
```

**Impacto:** De 6 queries ao banco para 2 queries. De 3 requests HTTP para 1 request HTTP. **Maior redução de latência da tela Tasks**.

---

### Fase 2 — Consolidação do Cisco LCI (3-5 dias)

#### 4.4 — Criar endpoint único `/api/adoption/cisco-lci/report-data`

Unificar todos os dados do Cisco LCI Report em um único endpoint que carrega os dados **uma única vez** e computa todas as métricas:

```python
# cisco_lci_service.py — nova função:
def get_lci_report_data(fy: Optional[int]) -> Dict[str, Any]:
    """
    Carrega dados uma única vez e retorna tudo que o Report Page precisa.
    Substitui: summary + total-eligibles + by-stage-status + 
               termination-status + burnup + yoy + lost-justification
    """
    # UMA query ao banco:
    all_rows = _load_all_enriched()        # find_all() — 1 vez
    task_rows = _load_cisco_lci_all(fy)    # load_cisco_lci_all() — 1 vez
    
    # Todos os cálculos a partir dos mesmos dados em memória:
    summary   = _compute_summary(all_rows, task_rows, fy)
    eligibles = _compute_total_eligibles(all_rows, task_rows, fy)
    burnup    = _compute_burnup(all_rows, fy)
    yoy       = _compute_yoy(all_rows)
    by_status = _compute_by_stage_status(all_rows, fy)
    term      = _compute_termination_status(all_rows, fy)
    lost_just = _compute_lost_justification(task_rows)
    
    return {
        "summary": summary,
        "total_eligibles": eligibles,
        "by_stage_status": by_status,
        "termination_status": term,
        "burnup": burnup,
        "yoy": yoy,
        "lost_justification": lost_just,
    }
```

**No frontend**, substituir 8 `useQuery` por 1:

```typescript
// ANTES: 8 queries paralelas ao LCI backend
// DEPOIS:
const lciReportQuery = useQuery({
  queryKey: ["lci", "report-data", selectedFY],
  queryFn: () => ciscoLciApi.getReportData(selectedFY).then(r => r.data),
  staleTime: 5 * 60 * 1000,
})
```

**Impacto:** De ~13 queries ao banco para **2 queries** (find_all + load_cisco_lci_all). De 8 requests HTTP para 1. **Maior redução de latência da tela Cisco LCI**.

---

#### 4.5 — Vetorizar `_enrich_row()` via DataFrame

```python
# ANTES: loop linha a linha
def _load_all_enriched() -> List[Dict]:
    rows = repo.find_all(task_eligible="Y", as_df=False)
    return [_enrich_row(dict(r)) for r in rows]  # lento

# DEPOIS: processamento vetorizado
def _load_all_enriched() -> List[Dict]:
    import pandas as pd
    df = repo.find_all(task_eligible="Y", as_df=True)  # retorna DataFrame
    if df.empty:
        return []
    
    # Datas — vetorizado:
    df["stage_start_date"] = pd.to_datetime(
        df["lci_stage_performed_start"].fillna(df["lci_stage_estimated_start"]), errors="coerce"
    ).dt.strftime("%Y-%m-%d")
    
    df["stage_end_date"] = pd.to_datetime(
        df["lci_stage_performed_end"].fillna(df["lci_stage_estimated_end"]), errors="coerce"
    ).dt.strftime("%Y-%m-%d")
    
    # Fiscal year — vetorizado:
    end_ts = pd.to_datetime(df["stage_end_date"], errors="coerce")
    df["lci_stage_end_fy"] = end_ts.apply(_calculate_fy)
    
    # stage_amount_usd — vetorizado:
    df["stage_amount_usd"] = df.apply(
        lambda r: r["lci_stage_approval_value"] if r["lci_stage_status_id"] == 10 
                  else r["lci_stage_value"], axis=1
    ).fillna(0.0)
    
    return df.to_dict("records")
```

**Impacto:** Processamento de 1000 linhas passa de ~1000 chamadas individuais ao pandas para operações vetorizadas — **5-10× mais rápido**.

---

### Fase 3 — Otimizações de Banco e Infraestrutura (5-10 dias)

#### 4.6 — Mover cálculo de KPI para SQL

Criar uma stored procedure ou view materializada para o KPI:

```sql
-- Exemplo: view vwTaskKPI para eliminar processamento Python
CREATE OR REPLACE VIEW vwTaskKPI AS
SELECT
    COUNT(*) FILTER (WHERE task_status_id NOT IN (4,5,6,10)) AS total_active,
    COUNT(*) FILTER (WHERE critical_level = 'N1' AND task_status_id NOT IN (4,5,6,10)) AS n1_critical,
    COUNT(*) FILTER (WHERE critical_level = 'N2' AND task_status_id NOT IN (4,5,6,10)) AS n2_critical,
    COUNT(*) FILTER (WHERE next_followup_any_effective <= CURDATE() 
                     AND task_status_id NOT IN (4,5,6,10)) AS follow_up_today,
    SUM(CASE WHEN task_finance_type = 'REVENUE' THEN task_value_effective_brl ELSE 0 END) AS revenue_brl,
    -- etc.
FROM vwTaskDashboard;
```

**Impacto:** O endpoint `/kpi` passa a retornar uma linha de 20 colunas ao invés de carregar centenas de linhas em Python.

#### 4.7 — Adicionar índices nas tabelas base das views

```sql
-- Verificar e adicionar índices ausentes:
ALTER TABLE tbTask ADD INDEX idx_task_status_owner (task_status_id, task_owner_id);
ALTER TABLE tbTask ADD INDEX idx_task_followup (next_followup_any_effective);
ALTER TABLE tbTaskActivity ADD INDEX idx_activity_task (activity_task_id, activity_end);
```

#### 4.8 — Configurar múltiplos workers no Uvicorn

Usar gunicorn com workers Uvicorn para processar requisições em paralelo:

    # systemd / script de start — trocar de:
    uvicorn app.main:app --host 0.0.0.0 --port 8000

    # Para (CPUs * 2 + 1 workers, ex: servidor com 2 CPUs = 5 workers):
    gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

**Impacto:** Múltiplas requisições processadas em paralelo. Os 13 requests simultâneos do Cisco LCI não ficam mais em fila esperando uns aos outros.

---

#### 4.9 — Corrigir `_serialize_row()` para não chamar pandas desnecessariamente

    # ANTES:
    try:
        import pandas as pd
        if pd.isna(v):   # chamado para strings, ints, etc.
            result[k] = None

    # DEPOIS: verificar tipo antes de chamar pd.isna
    import math
    # Só chama isna/isnan para tipos que podem ser NaN/NaT:
    if isinstance(v, float) and math.isnan(v):
        result[k] = None
    # Tipos pandas (Timestamp, NaT) já são cobertos pelo hasattr(v, "isoformat") acima

---

## 5. Resumo do Diagnóstico

### Causa-Raiz da Lentidão

A lentidão observada nas telas Tasks e Cisco LCI tem **três causas principais encadeadas**:

1. **Thundering herd de queries duplicadas**: Uma única abertura de página dispara 6-13 queries idênticas ao MariaDB simultaneamente.

2. **Ausência de connection pool**: Cada query cria uma nova conexão TCP — com múltiplos usuários, o MariaDB fica sobrecarregado com conexões de autenticação.

3. **Memória esgotada → Swap → I/O Wait**: Sem cache server-side, cada request carrega grandes datasets Python em memória. Múltiplos usuários simultâneos multiplicam o consumo. O SO começa a usar swap. Com swap em uso, qualquer acesso a dados paginados para disco causa I/O wait elevado (23.1% observado), tornando tudo mais lento — um ciclo vicioso.

### Ganho Estimado por Fase

| Fase | Mudanças | Redução de Tempo de Carga (Estimativa) |
|---|---|---|
| Fase 1 — Pool + Cache + Unificação Tasks | P1 + P3 + P4 | **60-75%** |
| Fase 2 — Consolidação LCI + Vetorização | P2 + P7 | **adicional 50-65%** |
| Fase 3 — SQL KPI + Índices + Workers | P5 + P6 + P10 | **adicional 20-30%** |

### Próximos Passos

Antes de qualquer alteração de código, recomendamos confirmar as hipóteses com medições:

1. **Habilitar slow query log no MariaDB** para confirmar quais queries demoram mais:
   `SET GLOBAL slow_query_log = 'ON'; SET GLOBAL long_query_time = 1;`

2. **Medir tempo de resposta atual** de cada endpoint com `curl -w "%{time_total}"` ou pelo DevTools do browser (Network tab).

3. **Verificar número de workers Uvicorn ativos** com `ps aux | grep uvicorn`.

4. **Analisar definição das views** `vwTaskDashboard` e `vwCiscoLCI` para identificar JOINs pesados e colunas retornadas.

Após as medições baselines, as mudanças da Fase 1 (P3 + P4 + P1) podem ser implementadas e testadas independentemente, sem risco de regressão nas demais funcionalidades.
