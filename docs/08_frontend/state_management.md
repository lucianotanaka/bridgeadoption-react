# Gerenciamento de Estado — Bridge Adoption React

> **Última atualização:** 2026-07  
> **Audiência:** Equipe de desenvolvimento frontend

---

## 1. Estratégia de estado

O Bridge Adoption usa três camadas de estado:

| Tipo | Tecnologia | Uso |
|---|---|---|
| **Estado global** | Zustand | Usuário autenticado, tema, permissões |
| **Estado de servidor** | TanStack Query | Dados da API (cache, loading, revalidação) |
| **Estado local** | React `useState` / `useMemo` | Filtros, paginação, UI temporária |

---

## 2. `authStore` — Estado de autenticação

Arquivo: `frontend/src/store/authStore.ts`

### Estrutura

```typescript
interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  roles: string[];
  permissions: string[];  // resource_keys com show_in_menu=1
  language: string;       // "pt" | "en" | "es"
  is_active: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  hasPermission: (resourceKey: string) => boolean;
  hasRole: (role: string) => boolean;
}
```

### Métodos principais

```typescript
// Verificar permissão (usado em PermissionRoute e Sidebar)
hasPermission("task.task")          // → true/false
hasPermission("admin.admin_user")   // → true para ADMIN

// Verificar role
hasRole("ADMIN")   // → true/false
hasRole("TASK")    // → true/false

// Login: chama o hook useAuth
const { login } = useAuth();
await login({ email, password });

// Logout
const { logout } = useAuth();
await logout();
```

### Persistência

O `authStore` usa o middleware `persist` do Zustand com `localStorage`. O token e o usuário sobrevivem a reloads de página.

```typescript
// O que é persistido em localStorage
{
  "bridge-adoption-auth": {
    "state": {
      "user": { ... },
      "token": "eyJhbGci..."
    }
  }
}
```

### Fluxo de inicialização

```
Usuário abre o portal
        ↓
App.tsx carrega
        ↓
Zustand rehidrata authStore do localStorage
        ↓
PrivateRoute verifica isAuthenticated
        ↓
Se token existe → renderiza a aplicação
Se não → redirect /login
```

---

## 3. `themeStore` — Estado de tema

Arquivo: `frontend/src/store/themeStore.ts`

```typescript
interface ThemeState {
  mode: "dark" | "light";
  setMode: (mode: "dark" | "light") => void;
}
```

### Comportamento

- **Padrão:** `dark` (aplicado imediatamente no carregamento da página antes do React renderizar, via script inline)
- **Persistência local:** localStorage (`bridge-adoption-theme`)
- **Persistência remota:** `tbUser.user_theme` no banco — sincronizado via `PUT /api/auth/theme` ao trocar

### Integração com Tailwind

O tema usa estratégia `class` do Tailwind. Quando `mode = "dark"`:
```html
<html class="dark">  ← adicionado/removido pelo themeStore
```

Todos os componentes usam `dark:` classes para adaptar cores.

---

## 4. TanStack Query — Dados da API

### Configuração global

```typescript
// App.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,  // 5 minutos de cache padrão
    },
  },
});
```

### Padrão de uso

```typescript
// Buscar dados
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ["tasks", filtros],   // chave única — muda quando filtros mudam
  queryFn: () => apiClient.get("/tasks").then(r => r.data),
  staleTime: 5 * 60 * 1000,
});

// Mutação (criar/atualizar/deletar)
const mutation = useMutation({
  mutationFn: (dados) => apiClient.post("/tasks", dados),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });  // revalida cache
  },
});
```

### Chaves de query recomendadas

| Módulo | queryKey |
|---|---|
| Tasks | `["tasks"]`, `["tasks", filtros]` |
| Forecast | `["adoption-forecast", anoFiscal]` |
| Cisco LCI | `["cisco-lci", anoFiscal]` |
| CSM Account | `["csm-account"]` |
| Public CSM | `["public-csm"]` |
| Portfolio Farol | `["portfolio-farol", clienteId]` |
| Admin Users | `["admin-users", busca]` |

### Cache e revalidação

- **`staleTime: 5 * 60 * 1000`** — dados considerados frescos por 5 min (sem refetch ao re-renderizar)
- **`refetch`** — botão manual de atualização em algumas telas
- **`invalidateQueries`** — após mutations, força revalidação imediata

---

## 5. Estado local — Filtros e paginação

Para filtros e paginação que existem apenas dentro de uma página:

```typescript
// Filtros
const [fCSM, setFCSM] = useState("");
const [fCliente, setFCliente] = useState("");
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(15);

// Ordenação
const [sortCol, setSortCol] = useState<string | null>(null);
const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

// Dados filtrados e ordenados (memoizados)
const filtrados = useMemo(() => {
  let dados = rows.filter(r => (!fCSM || r.CSM === fCSM));
  if (sortCol && sortDir) {
    dados = [...dados].sort((a, b) => {
      const va = String(a[sortCol] ?? "").toLowerCase();
      const vb = String(b[sortCol] ?? "").toLowerCase();
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }
  return dados;
}, [rows, fCSM, sortCol, sortDir]);

// Paginação
const totalPages = Math.max(1, Math.ceil(filtrados.length / pageSize));
const paginated = filtrados.slice((page - 1) * pageSize, page * pageSize);
```

---

## 6. Preferências do usuário

O Bridge Adoption persiste duas preferências no banco de dados:

| Preferência | Local (client) | Remoto (DB) | Sincronia |
|---|---|---|---|
| Idioma | `localStorage` (i18next) | `tbUser.user_language` | No login + `PUT /api/auth/language` |
| Tema | `localStorage` (Zustand) | `tbUser.user_theme` | No login + `PUT /api/auth/theme` |

**Fluxo de sincronização:**
1. Usuário faz login → tema e idioma do banco são aplicados imediatamente
2. Usuário troca tema → aplica localmente (instantâneo) + salva no banco (background)
3. Usuário troca idioma → aplica localmente + salva no banco
4. No próximo login de qualquer dispositivo → preferências do banco prevalecem
