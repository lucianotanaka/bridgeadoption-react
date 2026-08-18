# API — Farol Endpoints

> **Base URL:** `/api/portfolio/farol`  
> **Autenticação:** Bearer Token JWT (header `Authorization: Bearer <token>`)  
> **Tag FastAPI:** `portfolio`  
> **Router:** `backend/app/modules/sections_router.py` → `portfolio_router`  
> **Última atualização:** 2026-08-18  
> **Módulo frontend:** `FarolPage.tsx`

---

## Autenticação

Todos os endpoints requerem token JWT válido. O token é obtido via `POST /api/auth/login`.

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## GET `/clients`

**URL completa:** `GET /api/portfolio/farol/clients`

Retorna a lista de clientes disponíveis no Farol para um vendor específico.

Usado pelo frontend para popular o dropdown de seleção de cliente após o usuário escolher o vendor.

**Query Parameters:**

| Param | Tipo | Obrigatório | Default | Descrição |
|-------|------|-------------|---------|-----------|
| `vendor_id` | int | Não | `1` | ID do vendor (1=CISCO, 5=FORTINET, 35=PALO ALTO) |

**Exemplo de requisição:**

```http
GET /api/portfolio/farol/clients?vendor_id=1
Authorization: Bearer <token>
```

**Response:** `List[FarolClient]`

```json
[
  { "client_id": 42, "client_name": "Acme Corporation" },
  { "client_id": 87, "client_name": "Globo Comunicações" },
  { "client_id": 103, "client_name": "Itaú Unibanco" }
]
```

**Campos de retorno:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `client_id` | int | ID do cliente (`tbClientFarol.customer_id`) |
| `client_name` | string | Nome do cliente (`tbClientFarol.customer_name`) |

**Fonte no banco:**

```sql
SELECT customer_id AS client_id, customer_name AS client_name
FROM tbClientFarol
WHERE vendor_id = %s
GROUP BY customer_id
ORDER BY customer_name
```

**Comportamento quando vazio:**

- `vendor_id` inválido ou sem registros → retorna `[]` (sem erro)
- `FarolRepository` não disponível (ImportError) → retorna `[]`

---

## GET `/`

**URL completa:** `GET /api/portfolio/farol`

Retorna os dados completos do Farol para um vendor e cliente específicos.

Cada item representa uma combinação de `architecture + solution + status`, usada pelo frontend para renderizar o grid Traffic Light.

**Query Parameters:**

| Param | Tipo | Obrigatório | Default | Descrição |
|-------|------|-------------|---------|-----------|
| `vendor_id` | int | Não | `1` | ID do vendor (1=CISCO, 5=FORTINET, 35=PALO ALTO) |
| `customer_id` | int | Não | `null` | ID do cliente (obtido de `GET /clients`) |

> **Nota:** `customer_id` é obrigatório na prática — sem ele, o repositório retorna `[]`.

**Exemplo de requisição:**

```http
GET /api/portfolio/farol?vendor_id=1&customer_id=42
Authorization: Bearer <token>
```

**Response:** `List[FarolRow]`

```json
[
  {
    "vendor_id": 1,
    "customer_id": 42,
    "architecture": "Networking",
    "solution": "Catalyst 9000",
    "status": "green",
    "farol": "Active"
  },
  {
    "vendor_id": 1,
    "customer_id": 42,
    "architecture": "Networking",
    "solution": "SD-WAN",
    "status": "yellow",
    "farol": "Signed – Pending Activation"
  },
  {
    "vendor_id": 1,
    "customer_id": 42,
    "architecture": "Security",
    "solution": "Firepower",
    "status": "red",
    "farol": "Expired or Never Covered"
  },
  {
    "vendor_id": 1,
    "customer_id": 42,
    "architecture": "Security",
    "solution": "Umbrella",
    "status": "gray",
    "farol": "Non-Existent or Other Partner"
  }
]
```

**Campos de retorno:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `vendor_id` | int | ID do vendor |
| `customer_id` | int | ID do cliente |
| `architecture` | string | Grupo de arquitetura (ex: "Networking", "Security", "Collaboration") |
| `solution` | string | Nome da solução específica (ex: "Catalyst 9000", "Firepower") |
| `status` | string\|null | Status semáforo: `green`, `yellow`, `red`, `gray` ou `null` |
| `farol` | string\|null | Descrição textual do status |

**Mapeamento status → emoji (frontend):**

| `status` | Emoji | Label |
|----------|-------|-------|
| `green` | 🟢 | Active |
| `yellow` | 🟡 | Signed – Pending Activation |
| `red` | 🔴 | Expired or Never Covered |
| `gray` / `null` | ⚪ | Non-Existent or Other Partner |

**Fonte no banco:**

```sql
SELECT *
FROM tbFarol
WHERE vendor_id = %s
  AND customer_id = %s
```

**Comportamento quando vazio:**

- `vendor_id` ou `customer_id` inválidos → retorna `[]`
- Cliente sem registros em `tbFarol` → retorna `[]`
- `FarolRepository` não disponível → retorna `[]`

---

## Códigos de Resposta

| Código | Significado |
|--------|-------------|
| `200` | Sucesso — retorna array (pode ser `[]` se sem dados) |
| `401` | Token inválido ou expirado |
| `422` | Tipo de parâmetro inválido (ex: `vendor_id=abc`) |
| `500` | Erro interno do servidor (verificar logs do backend) |

---

## Exemplos de Uso (frontend)

```typescript
// 1. Carregar clientes para o dropdown (ao selecionar vendor)
const clients = await apiClient
  .get<FarolClient[]>('/portfolio/farol/clients', {
    params: { vendor_id: 1 }  // CISCO
  })
  .then(r => r.data);

// 2. Carregar dados do Farol (ao clicar em "Generate Farol")
const farolRows = await apiClient
  .get<FarolRow[]>('/portfolio/farol', {
    params: { vendor_id: 1, customer_id: 42 }
  })
  .then(r => r.data);
```

**Com React Query (TanStack Query):**

```typescript
// Clientes — carregado automaticamente quando vendor muda
const clientsQ = useQuery({
  queryKey: ['farol-clients', vendor],
  queryFn: () =>
    apiClient
      .get<FarolClient[]>('/portfolio/farol/clients', {
        params: { vendor_id: VENDOR_MAP[vendor] }
      })
      .then(r => r.data),
  enabled: !!vendor,
  staleTime: 5 * 60 * 1000,  // 5 minutos
});

// Dados do Farol — somente após clicar "Generate Farol"
const farolQ = useQuery({
  queryKey: ['farol-data', activeVendor, activeClient?.client_id],
  queryFn: () =>
    apiClient
      .get<FarolRow[]>('/portfolio/farol', {
        params: { vendor_id: VENDOR_MAP[activeVendor], customer_id: activeClient?.client_id }
      })
      .then(r => r.data),
  enabled: generated && !!activeVendor && !!activeClient,
  staleTime: 2 * 60 * 1000,  // 2 minutos
});
```

---

## Notas de Implementação

### Ordem dos endpoints no router

O endpoint `/farol/clients` é registrado **antes** de `/farol` no router para que o FastAPI não interprete `clients` como o valor do parâmetro de path (não existe path param, mas boa prática de ordenação):

```python
# sections_router.py
@portfolio_router.get("/farol/clients", ...)   # ← registrado primeiro
def portfolio_farol_clients(...): ...

@portfolio_router.get("/farol", ...)           # ← registrado depois
def portfolio_farol(...): ...
```

### Bug corrigido: `client_id` vs `customer_id`

O `FarolRepository.load_farol()` aceita `client_id` como parâmetro, mas a versão anterior do service passava `customer_id`. Isso causava um `TypeError: unexpected keyword argument`.

**Código correto em `sections_service.py`:**

```python
def get_farol(vendor_id: int = 1, customer_id: Optional[int] = None) -> List[Dict]:
    repo = FarolRepository()
    # CORRETO: client_id=customer_id (não customer_id=customer_id)
    df = repo.load_farol(vendor_id=vendor_id, client_id=customer_id, as_df=True)
    return _df(df)
```

### Service functions

```python
# sections_service.py

def get_farol_clients(vendor_id: int = 1) -> List[Dict]:
    """Retorna [{client_id, client_name}] de tbClientFarol"""
    repo = FarolRepository()
    rows = repo.get_farol(vendor_id=vendor_id, as_df=False)
    return [_ser(dict(r)) for r in rows]

def get_farol(vendor_id: int = 1, customer_id: Optional[int] = None) -> List[Dict]:
    """Retorna dados completos de tbFarol"""
    repo = FarolRepository()
    df = repo.load_farol(vendor_id=vendor_id, client_id=customer_id, as_df=True)
    return _df(df)
```

---

## Referências

- **Documentação do módulo:** `docs/02_application/portfolio/farol.md`
- **Router:** `backend/app/modules/sections_router.py` → `portfolio_router`
- **Service:** `backend/app/modules/sections_service.py`
- **Repository:** `src/infrastructure/database/repositories/farol_repository.py`
- **Frontend:** `frontend/src/pages/portfolio/FarolPage.tsx`
