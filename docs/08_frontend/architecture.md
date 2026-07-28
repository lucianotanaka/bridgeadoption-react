# Arquitetura Frontend — Bridge Adoption React

> **Última atualização:** 2026-07  
> **Audiência:** Equipe de desenvolvimento frontend

---

## 1. Visão geral do SPA

O frontend é uma **Single Page Application (SPA)** construída com React 18 + TypeScript, compilada com Vite e servida como arquivos estáticos pelo Apache.

A navegação é totalmente client-side (React Router v6). O Apache serve sempre o `index.html` independente da rota acessada (via `FallbackResource`), e o React Router assume o controle.

---

## 2. Estrutura de pastas

```
frontend/src/
├── api/                    → Clientes HTTP organizados por módulo
│   ├── client.ts           → Instância Axios configurada (baseURL, interceptors)
│   ├── tasks.ts            → Chamadas da API de tarefas
│   └── ...
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx   → Layout principal (sidebar + header + outlet)
│   │   └── Sidebar.tsx     → Menu lateral com controle de permissões
│   └── ui/
│       ├── ThemeToggle.tsx → Botão dark/light com persistência no banco
│       └── DataTablePage.tsx → Componente de tabela reutilizável
├── hooks/
│   └── useAuth.ts          → Hook de autenticação (login, logout, fetchMe)
├── i18n/
│   ├── index.ts            → Configuração do i18next
│   └── locales/
│       ├── pt.json         → Traduções português
│       ├── en.json         → Traduções inglês
│       └── es.json         → Traduções espanhol
├── pages/
│   ├── auth/               → LoginPage
│   ├── dashboard/          → DashboardPage, TodayRightPanel
│   ├── tasks/              → TaskPage, TaskOverview, TaskFilterTab, etc.
│   ├── adoption/           → ForecastPage, CiscoLCIPage, CsmAccountPage, etc.
│   ├── portfolio/          → FarolPage, AssetPage, ClientOverviewPage, etc.
│   ├── projects/           → ProjectsPage
│   ├── public/             → PublicCsmAccountPage, ImporterPage
│   └── admin/              → AdminPage, AdminUsersPage, etc.
├── router/
│   ├── PrivateRoute.tsx    → Redireciona para /login se não autenticado
│   └── PermissionRoute.tsx → Redireciona para / se sem permissão
├── store/
│   ├── authStore.ts        → Estado de autenticação (Zustand + persist)
│   └── themeStore.ts       → Estado de tema dark/light (Zustand + persist)
└── types/
    └── lucide-react.d.ts   → Declarações de tipos para ícones
```

---

## 3. Camadas da aplicação

```
┌─────────────────────────────────────────┐
│           Páginas (pages/)              │  ← Lógica específica de cada módulo
└──────────────────┬──────────────────────┘
                   │ usam
┌──────────────────▼──────────────────────┐
│       TanStack Query (useQuery)         │  ← Cache, loading, error handling
└──────────────────┬──────────────────────┘
                   │ chama
┌──────────────────▼──────────────────────┐
│         API Client (api/)               │  ← Axios + endpoints
└──────────────────┬──────────────────────┘
                   │ envia
┌──────────────────▼──────────────────────┐
│      FastAPI Backend (/api/...)         │  ← Servidor
└─────────────────────────────────────────┘

Estado global (Zustand):
┌──────────────┐  ┌──────────────┐
│  authStore   │  │  themeStore  │
│ user, token  │  │  dark/light  │
│ permissions  │  │              │
└──────────────┘  └──────────────┘
```

---

## 4. Cliente HTTP (Axios)

Arquivo: `frontend/src/api/client.ts`

```typescript
const apiClient = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

// Interceptor de request: adiciona Bearer token automaticamente
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de response: logout automático em 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
```

**Regra:** Nunca fazer chamadas diretas com `fetch()`. Sempre usar `apiClient` para garantir autenticação automática.

---

## 5. Padrão de página (componente típico)

```typescript
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/client";

interface Row { ... }

export default function MeuModuloPage() {
  // 1. Buscar dados com TanStack Query (cache automático)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["meu-modulo"],
    queryFn: () => apiClient.get<Row[]>("/meu-endpoint").then(r => r.data),
    staleTime: 5 * 60 * 1000,  // cache de 5 minutos
  });

  const rows = data ?? [];

  // 2. Estados locais para filtros/paginação
  const [filtro, setFiltro] = useState("");
  const [pagina, setPagina] = useState(1);

  // 3. Dados filtrados com useMemo
  const filtrados = useMemo(() => 
    rows.filter(r => r.nome.includes(filtro)), 
    [rows, filtro]
  );

  // 4. Renderização
  if (isLoading) return <Loading />;
  if (error) return <ErrorMsg />;

  return (
    <div className="space-y-4">
      <h1>Meu Módulo</h1>
      <Table data={filtrados} />
    </div>
  );
}
```

---

## 6. Padrão de estilização (Tailwind CSS)

### Classes utilitárias comuns

| Finalidade | Classes |
|---|---|
| Fundo (card) | `bg-white dark:bg-gray-900` |
| Borda de card | `rounded-xl border border-gray-200 dark:border-gray-700` |
| Padding de card | `p-4` |
| Título de página | `text-2xl font-bold text-gray-900 dark:text-gray-100` |
| Subtítulo | `text-sm text-gray-500 dark:text-gray-400` |
| Texto normal | `text-gray-700 dark:text-gray-300` |
| Botão primário | `px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700` |
| Tabela linha hover | `hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors` |
| Separador | `space-y-4` (entre seções) |

### Regra dark mode

Sempre usar a classe `dark:` para variações de dark mode. O Tailwind usa estratégia `class` (não `media`), controlada pelo `themeStore`.

---

## 7. Internacionalização

```typescript
// Em qualquer componente:
import { useTranslation } from "react-i18next";

function MeuComponente() {
  const { t } = useTranslation();
  
  return (
    <button>{t("common.save")}</button>
    <h1>{t("task.title")}</h1>
  );
}
```

**Idiomas suportados:** `pt` (padrão), `en`, `es`  
**Arquivos:** `frontend/src/i18n/locales/`  
**Detecção:** localStorage → browser → fallback `pt`

Ao fazer login, o idioma preferido do usuário (salvo em `tbUser.user_language`) é aplicado automaticamente via `i18n.changeLanguage()`.

---

## 8. Boas práticas de desenvolvimento

### Nomenclatura
- Componentes: `PascalCase` → `TaskPage.tsx`, `AdminUsersPage.tsx`
- Hooks: `camelCase` com prefixo `use` → `useAuth.ts`
- Stores: `camelCase` + sufixo `Store` → `authStore.ts`
- Arquivos de API: domínio do módulo → `tasks.ts`, `adoption.ts`

### Estado
- Estado **global** (usuário logado, tema): Zustand (`store/`)
- Estado **servidor** (dados da API): TanStack Query
- Estado **local** (filtros, paginação, UI): `useState` no componente

### Imports
- Usar alias `@/` para imports absolutos: `import X from "@/components/ui/X"`
- Nunca usar paths relativos longos: ~~`../../../components/X`~~

### Tipagem
- Sempre tipar interfaces de dados da API
- Evitar `any` — usar `unknown` se necessário e narrowing de tipo
- Declarar tipos de novos ícones Lucide em `types/lucide-react.d.ts`

### Performance
- `useMemo` para filtragem/ordenação de arrays grandes
- `staleTime: 5 * 60 * 1000` para dados que não mudam com frequência
- Paginação server-side para grandes volumes de dados
