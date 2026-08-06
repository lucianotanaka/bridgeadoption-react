# Bridge Adoption — Plano de Migração: Streamlit para React

**Versão:** 1.0 | **Data:** 2026-07-24 | **Status:** Planejamento

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Análise da Aplicação Streamlit Atual](#2-análise-da-aplicação-streamlit-atual)
3. [Decisões Arquiteturais](#3-decisões-arquiteturais)
4. [Stack Tecnológica](#4-stack-tecnológica)
5. [Estrutura do Projeto React](#5-estrutura-do-projeto-react)
6. [Mapeamento Streamlit para React](#6-mapeamento-streamlit-para-react)
7. [Plano de Fases e Sprints](#7-plano-de-fases-e-sprints)
8. [Camada de API FastAPI](#8-camada-de-api-fastapi)
9. [Autenticação e RBAC](#9-autenticação-e-rbac)
10. [Internacionalização i18n](#10-internacionalização-i18n)
11. [Gráficos e Visualizações](#11-gráficos-e-visualizações)
12. [Tabelas de Dados](#12-tabelas-de-dados)
13. [Export para Excel](#13-export-para-excel)
14. [Riscos e Mitigações](#14-riscos-e-mitigações)
15. [Checklist de Migração por Página](#15-checklist-de-migração-por-página)
16. [Referências](#16-referências)

---

## 1. Visão Geral

Este documento descreve o plano completo de migração da aplicação **Bridge Adoption** do framework **Streamlit (Python)** para **React (TypeScript)**.

### Objetivo

Substituir a camada de apresentação Streamlit por um frontend React moderno, mantendo toda a lógica de negócio, repositórios e serviços Python existentes.

### Localização dos projetos

| Projeto | Caminho |
|---|---|
| Bridge Adoption Streamlit (origem) | `Z:\bridgeadoption` |
| Bridge Adoption React (destino) | `X:\bridge-adoption-react` |
| API FastAPI | `Z:\bridgeadoption\api\` |

---

## 2. Análise da Aplicação Streamlit Atual

### 2.1 Módulos Funcionais (10 domínios, ~45 páginas)

| Domínio | Páginas principais |
|---|---|
| **admin** | admin_user, admin_auth_role, admin_task, admin_company, admin_team_goal, admin_requirements |
| **adoption** | kpi, report_cisco_lci, report_csm_account, report_forecast, report_lci_eligible_status, report_lci_solution_vs_project, report_rebate_and_opportunities, report_team_target, use_case |
| **operational** | contract, measurement (billing/inventory/product/request), notafiscal, purchase, iteminfo |
| **portfolio** | farol, client_overview, asset, account_team, adoption_tasks, cisco_ea/sa_license_usage, report_cisco_true_forward |
| **presales** | heatmap |
| **project** | project |
| **public** | csm_account, importer, report |
| **renewals** | renovations_plan |
| **task** | task (hub), task_overview, task_new, task_detail, task_activity, task_filter_*, task_lci_viability, task_report_* |
| **technical** | technical |

### 2.2 Funcionalidades Transversais

| Funcionalidade | Implementação Streamlit |
|---|---|
| Autenticação | `app.py` — `verify_credential()`, `st.session_state.autenticado` |
| Autorização RBAC | `authorization.py` — `can()`, `require_admin()` |
| Navegação dinâmica | `build_flat_navigation()`, `build_admin_mixed_navigation()` |
| Estado global | `st.session_state` |
| i18n | `translator.py` + JSON (pt-BR, en-US, es-ES) |
| Timeout inatividade | `check_inactivity()` — 15 minutos |
| Gráficos | Plotly Express / Graph Objects |
| Tabelas | `st.dataframe()` com Pandas DataFrame |
| Export Excel | `xlsxwriter` + `st.download_button()` |
| Debug | Query param `?debug=1&token=TOKEN` |

> ⚠️ **Importante:** Todas as pastas `old/` presentes no projeto (`webapp/pages/*/old/`, `webapp/core/old/`, `src/*/old/`, etc.) contêm arquivos obsoletos e **devem ser completamente ignoradas** durante a migração. Apenas os arquivos ativos fora das pastas `old/` devem ser analisados e migrados.

### 2.3 Pontos Críticos para a Migração

- **Sem REST API:** O Streamlit acessa repositories Python diretamente. O React precisa de uma API intermediária.
- **Dependência de `st.session_state`:** Estado global sem ciclo de vida definido — precisa ser substituído por Zustand.
- **Regras de negócio na UI:** Cálculos de FY e normalizações de DataFrame dentro das páginas devem migrar para a API.
- **`st.rerun()` frequente:** Modelo reativo diferente do React — cada página precisa ser reformulada.
- **CSS inline:** `st.markdown(..., unsafe_allow_html=True)` será substituído por Tailwind CSS.

---

## 3. Decisões Arquiteturais

### 3.1 Estratégia: Backend-First

1. Criar a **API FastAPI** expondo os repositories Python como endpoints REST
2. Construir o **frontend React** consumindo essa API

**Justificativa:** reutiliza 100% do código Python existente, separa responsabilidades e permite coexistência com o Streamlit durante a transição.

### 3.2 Nova Arquitetura

```
[Browser — React + TypeScript]
  Router v6 | Zustand | TanStack Query | i18n | Plotly.js
         |
         | HTTP/JSON + JWT Bearer
         v
[API FastAPI — Python]
  /api/auth/* | /api/task/* | /api/adoption/*
  /api/portfolio/* | /api/admin/* | /api/operational/*
         |
         | (reutiliza código existente)
         v
[src/infrastructure/repositories/]
[src/domain/] [src/services/]
         |
         v
[Database — MySQL/SQL]
```

### 3.3 Coexistência durante a migração (nginx)

```nginx
location /         { proxy_pass http://127.0.0.1:3000; }  # React (novo)
location /api/     { proxy_pass http://127.0.0.1:8000; }  # FastAPI
location /legacy/  { proxy_pass http://127.0.0.1:8501/; } # Streamlit (legado)
```

### 3.4 Mapeamento de rotas

| resource_key (Streamlit) | URL React |
|---|---|
| `task.task` | `/task` |
| `adoption.report_cisco_lci` | `/adoption/cisco-lci` |
| `adoption.report_forecast` | `/adoption/forecast` |
| `adoption.kpi` | `/adoption/kpi` |
| `adoption.report_team_target` | `/adoption/team-target` |
| `adoption.report_csm_account` | `/adoption/csm-account` |
| `adoption.report_lci_eligible_status` | `/adoption/lci-eligible-status` |
| `adoption.report_lci_solution_vs_project` | `/adoption/lci-solution-vs-project` |
| `adoption.report_rebate_and_opportunities` | `/adoption/rebate-opportunities` |
| `portfolio.farol` | `/portfolio/farol` |
| `portfolio.client_overview` | `/portfolio/client-overview` |
| `portfolio.asset` | `/portfolio/asset` |
| `portfolio.account_team` | `/portfolio/account-team` |
| `portfolio.adoption_tasks` | `/portfolio/adoption-tasks` |
| `presales.heatmap` | `/presales/heatmap` |
| `admin.admin_user` | `/admin/users` |
| `admin.admin_auth_role` | `/admin/roles` |
| `admin.admin_task` | `/admin/tasks` |
| `public.report` | `/reports` |

---

## 4. Stack Tecnológica

### 4.1 Frontend React

| Categoria | Tecnologia | Versão | Equivalente Streamlit |
|---|---|---|---|
| Framework | React | 18.x | — |
| Linguagem | TypeScript | 5.x | Python |
| Build | Vite | 5.x | — |
| Roteamento | React Router | v6 | `st.navigation()` |
| Estado global | Zustand | 4.x | `st.session_state` |
| Fetch/Cache | TanStack Query | v5 | `@st.cache_data` |
| HTTP | Axios | 1.x | — |
| UI | shadcn/ui + Tailwind CSS | latest | Streamlit widgets |
| Gráficos | Recharts + Plotly.js | — | Plotly Python |
| Tabelas | TanStack Table | v8 | `st.dataframe()` |
| i18n | react-i18next | 14.x | `translator.py` |
| Excel | SheetJS (xlsx) | 0.18.x | `xlsxwriter` |
| Formulários | React Hook Form + Zod | — | `st.form()` |
| Datas | date-fns | 3.x | Pandas dates |
| Ícones | Lucide React | latest | `:material/` icons |
| Testes | Vitest + Testing Library | — | — |
| E2E | Playwright | latest | — |

### 4.2 Backend API (FastAPI)

| Item | Tecnologia |
|---|---|
| Framework | FastAPI |
| Auth | python-jose + passlib (JWT HS256) |
| Validação | Pydantic v2 |
| CORS | CORSMiddleware |
| Servidor | Uvicorn |
| Repositórios | Reutilizados de `src/infrastructure/` sem alteração |

---

## 5. Estrutura do Projeto React

```
X:\bridge-adoption-react\
├── public/
│   └── assets/ (logos NTT, Bridge Adoption)
├── src/
│   ├── api/
│   │   ├── client.ts             # Axios instance + interceptors JWT
│   │   ├── auth.ts               # endpoints /api/auth/*
│   │   ├── tasks.ts              # endpoints /api/task/*
│   │   ├── adoption.ts           # endpoints /api/adoption/*
│   │   ├── portfolio.ts          # endpoints /api/portfolio/*
│   │   ├── admin.ts              # endpoints /api/admin/*
│   │   ├── operational.ts        # endpoints /api/operational/*
│   │   └── presales.ts           # endpoints /api/presales/*
│   ├── components/
│   │   ├── ui/
│   │   │   ├── PageTitle.tsx     # render_page_title()
│   │   │   ├── PageCaption.tsx   # render_page_caption()
│   │   │   ├── MetricCard.tsx    # st.metric()
│   │   │   ├── DataTable.tsx     # st.dataframe()
│   │   │   ├── ExportExcel.tsx   # st.download_button() Excel
│   │   │   ├── LoadingSpinner.tsx # st.spinner()
│   │   │   ├── AccessDenied.tsx  # st.error() + st.stop()
│   │   │   └── DebugPanel.tsx    # render_debug_panel()
│   │   ├── charts/
│   │   │   ├── DualAxisChart.tsx  # Plotly dual-axis barra+linha
│   │   │   ├── BurnUpChart.tsx    # Burn-up LCI
│   │   │   ├── PieChart.tsx       # Pie charts
│   │   │   └── LineChart.tsx      # Line charts
│   │   └── layout/
│   │       ├── AppLayout.tsx      # Sidebar + Header + Content
│   │       ├── Sidebar.tsx        # Menu dinâmico por permissões
│   │       └── Header.tsx         # Logo, idioma, logout
│   ├── hooks/
│   │   ├── useAuth.ts            # login, logout, inatividade
│   │   ├── usePermission.ts      # can() — verifica resource_key
│   │   └── useTranslation.ts     # wrapper react-i18next
│   ├── i18n/
│   │   ├── pt-BR.json            # copiado de src/domain/i18n/
│   │   ├── en-US.json
│   │   ├── es-ES.json
│   │   └── i18n.ts               # configuração react-i18next
│   ├── layouts/
│   │   ├── AppLayout.tsx         # Layout autenticado
│   │   └── AuthLayout.tsx        # Layout tela de login
│   ├── pages/
│   │   ├── auth/
│   │   │   └── Login.tsx
│   │   ├── admin/
│   │   │   ├── Users.tsx
│   │   │   ├── Roles.tsx
│   │   │   ├── Tasks.tsx
│   │   │   └── Company.tsx
│   │   ├── adoption/
│   │   │   ├── Kpi.tsx
│   │   │   ├── CiscoLci.tsx
│   │   │   ├── Forecast.tsx
│   │   │   ├── CsmAccount.tsx
│   │   │   ├── TeamTarget.tsx
│   │   │   └── LciEligibleStatus.tsx
│   │   ├── portfolio/
│   │   │   ├── Farol.tsx
│   │   │   ├── ClientOverview.tsx
│   │   │   ├── Asset.tsx
│   │   │   └── AccountTeam.tsx
│   │   ├── presales/
│   │   │   └── Heatmap.tsx
│   │   ├── task/
│   │   │   ├── Task.tsx            # hub principal
│   │   │   ├── TaskOverview.tsx
│   │   │   ├── TaskNew.tsx
│   │   │   ├── TaskDetail.tsx
│   │   │   ├── TaskActivity.tsx
│   │   │   └── TaskReports.tsx
│   │   └── public/
│   │       └── Report.tsx
│   ├── router/
│   │   ├── index.tsx               # rotas com lazy loading
│   │   └── PrivateRoute.tsx        # guard de rota (substitui not_authenticated)
│   ├── store/
│   │   └── authStore.ts            # Zustand store
│   ├── types/
│   │   ├── auth.ts                 # User, Role, Permission types
│   │   ├── task.ts                 # Task, Activity types
│   │   └── adoption.ts             # LCI, Forecast types
│   └── main.tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

---

## 6. Mapeamento Streamlit para React

### 6.1 Widgets e Componentes

| Streamlit | React / shadcn |
|---|---|
| `st.button()` | `<Button>` |
| `st.selectbox()` | `<Select>` |
| `st.multiselect()` | `<MultiSelect>` (Combobox) |
| `st.text_input()` | `<Input>` |
| `st.text_area()` | `<Textarea>` |
| `st.date_input()` | `<DatePicker>` |
| `st.checkbox()` | `<Checkbox>` |
| `st.radio()` | `<RadioGroup>` |
| `st.columns()` | CSS Grid / Flex |
| `st.tabs()` | `<Tabs>` |
| `st.expander()` | `<Accordion>` |
| `st.metric()` | `<MetricCard>` customizado |
| `st.dataframe()` | `<DataTable>` (TanStack Table) |
| `st.plotly_chart()` | `<Plot>` (Plotly.js) ou Recharts |
| `st.spinner()` | `<Skeleton>` / `<Spinner>` |
| `st.success()` | `<Alert variant="success">` |
| `st.error()` | `<Alert variant="destructive">` |
| `st.warning()` | `<Alert variant="warning">` |
| `st.info()` | `<Alert>` |
| `st.download_button()` | `<Button onClick={exportExcel}>` |
| `st.sidebar` | `<Sidebar>` component |
| `st.popover()` | `<Popover>` |
| `st.container()` | `<div>` / `<Card>` |
| `st.divider()` | `<Separator>` |

### 6.2 Gerenciamento de Estado

| st.session_state (Streamlit) | React / Zustand |
|---|---|
| `st.session_state.autenticado` | `authStore.isAuthenticated` |
| `st.session_state.user_id` | `authStore.user.id` |
| `st.session_state.user_name` | `authStore.user.name` |
| `st.session_state.roles` | `authStore.roles` |
| `st.session_state.permissions` | `authStore.permissions` |
| `st.session_state.user_language` | `authStore.language` |
| `st.session_state.last_activity` | Ref + `setInterval` no `useAuth` |
| `st.session_state.filtered_task_df` | `useState` local na página Task |
| `st.session_state.active_section` | `useState` local no hub Task |

### 6.3 Fluxo de Autenticação

| Streamlit | React |
|---|---|
| `verify_credential()` | `useAuth().login()` → `POST /api/auth/login` |
| `st.session_state.autenticado = True` | `authStore.setAuth(token, user, roles)` |
| `logout()` + `st.rerun()` | `useAuth().logout()` → `navigate('/login')` |
| `check_inactivity()` | `useEffect` com `setInterval` a cada 60s |
| `st.query_params.get("debug")` | `useSearchParams()` |
| RBAC `can("resource.key")` | `usePermission("resource.key")` hook |

---

## 7. Plano de Fases e Sprints

### Fase 1 — Infraestrutura e Setup (Semana 1-2)

- [ ] Criar projeto React com Vite + TypeScript + Tailwind + shadcn/ui em `X:\bridge-adoption-react`
- [ ] Configurar React Router v6, Zustand, TanStack Query, Axios, react-i18next
- [ ] Copiar arquivos JSON de i18n para `src/i18n/`
- [ ] Criar estrutura de pastas conforme seção 5
- [ ] Criar API FastAPI em `Z:\bridgeadoption\api\` com estrutura base
- [ ] Configurar JWT + CORS na API
- [ ] Criar endpoint `POST /api/auth/login`
- [ ] Criar endpoint `GET /api/auth/me`
- [ ] Criar endpoint `GET /api/auth/permissions`
- [ ] Configurar nginx com coexistência Streamlit + React + FastAPI

### Fase 2 — Autenticação e RBAC (Semana 2-3)

- [ ] Implementar `authStore` (Zustand)
- [ ] Implementar `useAuth` hook (login, logout, inatividade 15 min)
- [ ] Implementar `usePermission` hook — equivalente ao `can()`
- [ ] Criar tela de Login (`/login`) com formulário email + senha
- [ ] Criar `PrivateRoute` (guard de rotas)
- [ ] Criar `AppLayout` com `Sidebar` dinâmica gerada pelas permissões
- [ ] Implementar seletor de idioma no header
- [ ] Implementar `DebugPanel` (ativável via `?debug=1&token=`)

### Fase 3 — Componentes Base (Semana 3)

- [ ] `PageTitle` e `PageCaption`
- [ ] `MetricCard` (equivalente `st.metric`)
- [ ] `DataTable` com TanStack Table (sorting, filtering, pagination, column visibility)
- [ ] `ExportExcelButton` com SheetJS
- [ ] `LoadingSpinner` / `Skeleton`
- [ ] `AccessDenied` component
- [ ] Wrappers de gráficos: `DualAxisChart`, `BurnUpChart`, `PieChart`, `LineChart`
- [ ] Filtros de FY em botões (equivalente ao filtro FY do Cisco LCI)

### Fase 4 — Módulo Task (Semana 4-5)

- [ ] API: endpoints CRUD `/api/task/*`
- [ ] `TaskOverview` — visão geral das tarefas
- [ ] `TaskNew` — formulário de nova tarefa
- [ ] `TaskDetail` — formulário de detalhe/edição
- [ ] `TaskFilterTasks` — filtro de tarefas
- [ ] `TaskFilterNextFollowUp` — filtro próximo acompanhamento
- [ ] `TaskActivity` — atividades da tarefa
- [ ] `TaskReports` — relatórios de tarefas
- [ ] `TaskLciViability` — análise de viabilidade LCI
- [ ] Toolbar de navegação do hub Task (Overview / Tasks / New / Reports)

### Fase 5 — Módulo Adoption (Semana 5-6)

- [ ] API: endpoints `/api/adoption/*`
- [ ] `CiscoLci` — filtro FY, cards financeiros/operacionais, 4 gráficos, 4 tabelas, export Excel
- [ ] `Forecast` — relatório de forecast
- [ ] `CsmAccount` — relatório de contas CSM
- [ ] `TeamTarget` — metas da equipe
- [ ] `Kpi` — KPIs de adoption
- [ ] `LciEligibleStatus` — estados dos estágios LCI
- [ ] `LciSolutionVsProject` — solução vs projeto
- [ ] `RebateAndOpportunities` — rebates e oportunidades
- [ ] `UseCase`, `UseCaseApplicability`, `UseCaseExitCriteria`

### Fase 6 — Módulo Portfolio (Semana 6-7)

- [ ] API: endpoints `/api/portfolio/*`
- [ ] `Farol` — grid de cards por Architecture/Solution com emojis de status
- [ ] `ClientOverview` — visão geral do cliente
- [ ] `Asset` — ativos do cliente
- [ ] `AccountTeam` — equipe de contas
- [ ] `AdoptionTasks` — tarefas de adoção
- [ ] `CiscoEaLicenseUsage` — uso de licenças EA
- [ ] `CiscoSaLicenseUsage` — uso de licenças SA
- [ ] `CiscoTrueForward` — relatório True Forward

### Fase 7 — Demais Módulos (Semana 7-9)

- [ ] **Presales:** `Heatmap`
- [ ] **Operational:** `Contract`, `Measurement` (billing/inventory/product/request), `NotaFiscal`, `Purchase`
- [ ] **Project:** `Project`
- [ ] **Public:** `Report` (portal de relatórios), `CsmAccount`, `Importer`
- [ ] **Renewals:** `RenovationsPlan`
- [ ] **Technical:** `Technical`

### Fase 8 — Módulo Admin (Semana 8-9)

- [ ] API: endpoints `/api/admin/*`
- [ ] `AdminUsers` — CRUD de usuários + aba Roles + aba Permissions
- [ ] `AdminRoles` — gestão de roles
- [ ] `AdminTasks` — administração de tarefas
- [ ] `AdminCompany` — administração de empresas
- [ ] `AdminTeamGoal` — metas da equipe
- [ ] `AdminRequirements` — requisitos
- [ ] `AdminDebug` — debug panel

### Fase 9 — Testes e Refinamento (Semana 10-11)

- [ ] Testes unitários: hooks `useAuth`, `usePermission`
- [ ] Testes de componentes: `DataTable`, `MetricCard`, `ExportExcelButton`
- [ ] Testes E2E: fluxo de login, navegação, Task CRUD
- [ ] Revisão de acessibilidade (a11y)
- [ ] Revisão de performance (lazy loading, memoização)
- [ ] Revisão de responsividade

### Fase 10 — Deploy (Semana 12)

- [ ] Build de produção com Vite
- [ ] Configurar Uvicorn para produção da API
- [ ] Atualizar nginx para servir o React em produção
- [ ] Smoke tests em produção
- [ ] Documentação de deployment

---

## 8. Camada de API FastAPI

### 8.1 Estrutura da API

```
Z:\bridgeadoption\api\
├── main.py                    # Criação do app FastAPI + routers
├── dependencies.py            # Dependências injetáveis (DB, auth)
├── auth/
│   ├── router.py              # POST /login, GET /me, GET /permissions
│   ├── jwt_handler.py         # Criação e validação de JWT
│   └── schemas.py             # LoginRequest, TokenResponse, UserResponse
├── routers/
│   ├── task.py                # GET/POST/PUT /api/task/*
│   ├── adoption.py            # GET /api/adoption/*
│   ├── portfolio.py           # GET /api/portfolio/*
│   ├── admin.py               # GET/POST/PUT /api/admin/*
│   ├── operational.py         # GET /api/operational/*
│   └── presales.py            # GET/POST/PUT /api/presales/*
└── schemas/
    ├── task.py                # Pydantic models para Task
    ├── adoption.py            # Pydantic models para Adoption
    └── portfolio.py           # Pydantic models para Portfolio
```

### 8.2 Endpoints de Autenticação

```
POST /api/auth/login
  Body: { email, password }
  Response: { access_token, token_type, user_id, user_name, roles, permissions, language }

GET /api/auth/me
  Header: Authorization: Bearer <token>
  Response: { user_id, user_name, roles, permissions, language }

POST /api/auth/logout
  Header: Authorization: Bearer <token>
  Response: { message: "logged out" }

PUT /api/auth/language
  Header: Authorization: Bearer <token>
  Body: { language: "pt-BR" | "en-US" | "es-ES" }
```

### 8.3 Exemplos de Endpoints por Domínio

```
# Task
GET    /api/task/overview                # task_overview
GET    /api/task/list                    # filtros de tarefas
POST   /api/task/                        # criar nova tarefa
GET    /api/task/{task_id}               # detalhe da tarefa
PUT    /api/task/{task_id}               # atualizar tarefa
GET    /api/task/{task_id}/activities    # atividades da tarefa
POST   /api/task/{task_id}/activities    # nova atividade
GET    /api/task/filter/next-follow-up   # próximo acompanhamento
GET    /api/task/lci-viability           # viabilidade LCI
GET    /api/task/reports

# Adoption
GET    /api/adoption/cisco-lci           # report_cisco_lci (com filtros de FY)
GET    /api/adoption/forecast            # report_forecast
GET    /api/adoption/csm-account         # report_csm_account
GET    /api/adoption/team-target         # report_team_target
GET    /api/adoption/lci-eligible-status # report_lci_eligible_status
GET    /api/adoption/lci-solution-vs-project

# Portfolio
GET    /api/portfolio/farol              # farol (com vendor_id + client_id)
GET    /api/portfolio/clients            # lista de clientes para filtros
GET    /api/portfolio/client/{id}/overview
GET    /api/portfolio/asset              # ativos do cliente
GET    /api/portfolio/account-team

# Admin
GET    /api/admin/users
POST   /api/admin/users
PUT    /api/admin/users/{id}
GET    /api/admin/roles
GET    /api/admin/resources
GET    /api/admin/permissions/{user_role_id}
POST   /api/admin/permissions
PUT    /api/admin/permissions/{id}
DELETE /api/admin/permissions/{id}
```

---

## 9. Autenticação e RBAC

### 9.1 Fluxo de Login React

```
1. Usuário preenche email + senha em /login
2. useAuth().login() chama POST /api/auth/login
3. API valida credenciais via UserRepository.login()
4. API carrega roles via AuthRepository.get_user_roles()
5. API carrega permissions via AuthRepository.load_user_permissions()
6. API retorna JWT + user_info + roles + permissions + language
7. authStore.setAuth() persiste dados no Zustand
8. Token JWT salvo no localStorage (ou httpOnly cookie)
9. navigate('/') redireciona para home
```

### 9.2 Zustand Auth Store

```typescript
// src/store/authStore.ts
interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: { id: number; name: string } | null;
  roles: string[];                    // ["TASK", "ADOPTION"] ou ["ADMIN"]
  permissions: PermissionsMap;        // mesma estrutura do Streamlit
  language: "pt-BR" | "en-US" | "es-ES";
  lastActivity: number;               // timestamp
  supportDebug: boolean;

  setAuth: (token, user, roles, permissions, language) => void;
  logout: () => void;
  updateLastActivity: () => void;
  setLanguage: (lang) => void;
}
```

### 9.3 Hook usePermission (equivalente ao can())

```typescript
// src/hooks/usePermission.ts
export function usePermission(resourceKey: string): string | null {
  const permissions = useAuthStore((s) => s.permissions);
  const roles = useAuthStore((s) => s.roles);

  // ADMIN tem acesso total a tudo
  if (roles.includes("ADMIN")) return "full";

  // Percorre permissions (mesma estrutura do Streamlit)
  for (const resources of Object.values(permissions)) {
    for (const resource of Object.values(resources as any)) {
      if ((resource as any).resource_key === resourceKey) {
        const action = (resource as any).action;
        if (!action || action === "deny") return null;
        return action; // "view" | "edit" | "full"
      }
    }
  }
  return null;
}
```

### 9.4 Sidebar Dinâmica (equivalente ao build_flat_navigation)

```typescript
// src/components/layout/Sidebar.tsx
// Itera sobre permissions, filtra is_active=1 e show_in_menu=1
// Para ADMIN: agrupa páginas do domínio "admin" separadamente
// Para não-ADMIN: lista flat sem grupos
// Cada item usa resource_key para determinar a rota React
```

### 9.5 Timeout de Inatividade

```typescript
// src/hooks/useAuth.ts — equivalente ao check_inactivity()
useEffect(() => {
  const interval = setInterval(() => {
    const inactive = Date.now() - authStore.lastActivity;
    if (inactive > 15 * 60 * 1000) { // 15 minutos
      authStore.logout();
      navigate("/login");
    }
  }, 60_000); // verifica a cada 1 minuto

  const resetActivity = () => authStore.updateLastActivity();
  window.addEventListener("mousemove", resetActivity);
  window.addEventListener("keydown", resetActivity);

  return () => {
    clearInterval(interval);
    window.removeEventListener("mousemove", resetActivity);
    window.removeEventListener("keydown", resetActivity);
  };
}, []);
```

---

## 10. Internacionalização i18n

### 10.1 Configuração

Os arquivos JSON existentes em `src/domain/i18n/` são **copiados diretamente** para `src/i18n/` no projeto React. A estrutura de chaves é mantida idêntica.

```typescript
// src/i18n/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ptBR from "./pt-BR.json";
import enUS from "./en-US.json";
import esES from "./es-ES.json";

i18n.use(initReactI18next).init({
  resources: {
    "pt-BR": { translation: ptBR },
    "en-US": { translation: enUS },
    "es-ES": { translation: esES },
  },
  lng: "en-US",
  fallbackLng: "en-US",
  interpolation: { escapeValue: false },
});
```

### 10.2 Uso nos Componentes

```typescript
// Equivalente a: translate(lang, "pages.adoption.report_cisco_lci.title")
import { useTranslation } from "react-i18next";

const { t } = useTranslation();
const title = t("pages.adoption.report_cisco_lci.title");
```

### 10.3 Troca de Idioma

```typescript
// Equivalente ao change_language() do Streamlit
const changeLanguage = async (lang: string) => {
  await api.put("/api/auth/language", { language: lang });
  i18n.changeLanguage(lang);
  authStore.setLanguage(lang);
};
```

---

## 11. Gráficos e Visualizações

### 11.1 Decisão por tipo de gráfico

| Tipo de Gráfico | Streamlit | React |
|---|---|---|
| Barra simples | `px.bar()` | Recharts `<BarChart>` |
| Linha simples | `px.line()` | Recharts `<LineChart>` |
| Pizza | `px.pie()` | Recharts `<PieChart>` |
| Barra + Linha (dual-axis) | `go.Figure()` com `yaxis2` | Plotly.js `<Plot>` |
| Burn-up (acumulado) | `go.Scatter()` + `go.Figure()` | Plotly.js `<Plot>` |
| Scatter com anotações | `go.Figure()` + `add_annotation` | Plotly.js `<Plot>` |
| Year-over-Year | `go.Scatter()` | Recharts ou Plotly.js |

### 11.2 Componente DualAxisChart (Cisco LCI)

O gráfico mais complexo da aplicação é o dual-axis do `report_cisco_lci.py` (barras = valor USD, linha = quantidade). Este será implementado com **Plotly.js** para manter fidelidade:

```typescript
// src/components/charts/DualAxisChart.tsx
import Plot from "react-plotly.js";

interface Props {
  data: { name: string; value: number; count: number }[];
  title: string;
}

export function DualAxisChart({ data, title }: Props) {
  return (
    <Plot
      data={[
        { type: "bar", x: data.map(d => d.name), y: data.map(d => d.value), yaxis: "y1" },
        { type: "scatter", x: data.map(d => d.name), y: data.map(d => d.count), yaxis: "y2", mode: "lines+markers" },
      ]}
      layout={{
        title,
        yaxis: { title: "Total Value" },
        yaxis2: { title: "Count", overlaying: "y", side: "right" },
      }}
      useResizeHandler
      style={{ width: "100%" }}
    />
  );
}
```

---

## 12. Tabelas de Dados

### 12.1 DataTable com TanStack Table

O componente `<DataTable>` substitui `st.dataframe()` e implementa:

- **Sorting** por coluna (clique no header)
- **Filtering** por texto global
- **Paginação** configurável (10/25/50/100 linhas)
- **Visibilidade de colunas** (equivalente ao `configure_columns` do Streamlit)
- **Sticky header** para tabelas longas

```typescript
// src/components/ui/DataTable.tsx
import { useReactTable, getCoreRowModel, getSortedRowModel,
         getFilteredRowModel, getPaginationRowModel } from "@tanstack/react-table";
```

### 12.2 Colunas configuráveis

O Streamlit usa `st.dataframe()` com `column_config`. O React usa `ColumnDef[]` do TanStack Table, definido por página com tipagem TypeScript.

---

## 13. Export para Excel

### 13.1 Implementação com SheetJS

```typescript
// src/components/ui/ExportExcelButton.tsx
import * as XLSX from "xlsx";

interface Props {
  sheets: { name: string; data: Record<string, unknown>[] }[];
  filename: string;
  label?: string;
}

export function ExportExcelButton({ sheets, filename, label }: Props) {
  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    sheets.forEach(({ name, data }) => {
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, name);
    });
    XLSX.writeFile(wb, filename);
  };

  return <Button onClick={handleExport}>{label ?? "Exportar Excel"}</Button>;
}
```

### 13.2 Uso na página CiscoLci (equivalente ao generate_excel do Streamlit)

```typescript
<ExportExcelButton
  filename={`cisco_lci_report_FY${selectedFy}.xlsx`}
  sheets={[
    { name: "LCI Approved",           data: dfApproved },
    { name: "LCI Awaiting Opt-in",    data: dfAwaiting },
    { name: "LCI Ongoing",            data: dfOngoing },
    { name: "LCI Lost",               data: dfLost },
  ]}
/>
```

---

## 14. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Volume de páginas (45+) subestimado | Alta | Alto | Priorizar por módulos mais usados; manter Streamlit como fallback |
| Lógica de negócio embedded na UI | Alta | Médio | Extrair transformações de dados para a API FastAPI durante a criação dos endpoints |
| Performance de gráficos complexos (Plotly.js) | Média | Médio | Usar lazy loading; renderizar gráficos somente quando visíveis |
| Diferença de comportamento RBAC | Média | Alto | Testes comparativos Streamlit vs React para cada fluxo de permissão |
| Estrutura de permissões complexa (user_role_id) | Baixa | Alto | Manter a mesma estrutura JSON retornada pela API; não simplificar prematuramente |
| Timeout de sessão inconsistente | Baixa | Médio | Implementar refresh token ou renovar JWT automaticamente antes do vencimento |
| Divergência de dados entre Streamlit e React durante coexistência | Média | Baixo | Ambos apontam para o mesmo banco; sem risco de divergência de dados |
| Experiência do usuário degradada durante transição | Média | Médio | Comunicar usuários; disponibilizar `/legacy/` como fallback |

---

## 15. Checklist de Migração por Página

### Domínio: task

| Página Streamlit | Componente React | API Endpoint | Status |
|---|---|---|---|
| `task/task.py` | `TaskPage.tsx` (hub) | `/api/tasks/*` | ✅ Concluído |
| `task/task_overview.py` | `TaskOverview.tsx` | `GET /api/tasks/overview`, `/kpi`, `/action-queue` | ✅ Concluído |
| `task/task_new.py` | `NewTaskForm.tsx` | `POST /api/tasks/new` | ✅ Concluído |
| `task/task_detail.py` | `TaskDetailPanel.tsx` | `GET/PUT /api/tasks/detail/{id}` | ✅ Concluído |
| `task/task_activity.py` + `task_activity_detail.py` | `TaskDetailPanel.tsx` (ActivityRow) | `GET/PUT /api/tasks/detail/{id}/activities`, `/activities/{activity_id}` | ✅ Concluído |
| `task/task_activity_new.py` | `TaskDetailPanel.tsx` (AddActivityForm) | `POST /api/tasks/detail/{id}/activities` | ✅ Concluído |
| `task/task_filter_tasks.py` | `TaskFilterTab.tsx` | `GET /api/tasks/filter-options`, `POST /api/tasks/filter` | ✅ Concluído |
| `task/task_filter_next_follow_up.py` | `NextFollowUpPanel.tsx` | `GET /api/tasks/follow-up` | ✅ Concluído |
| `task/task_filter_report.py` | `TaskReportsTab.tsx` | `GET /api/tasks/reports/owners`, `POST /api/tasks/reports/filter-options` | ✅ Concluído |
| `task/task_lci_viability.py` | `LCIViabilityPage.tsx` | `/api/tasks/lci-viability/*` | ✅ Concluído (com `resource_key` de sub-permissão `task.task_lci_viability`) |
| `task/task_report_task_list.py` | `TaskReportsTab.tsx` (TaskListReport) | `POST /api/tasks/reports/tasks` | ✅ Concluído |
| `task/task_report_task_detail.py` | `TaskReportsTab.tsx` (TaskDetailReport) | `GET /api/tasks/reports/task-detail/{task_id}` | ✅ Concluído |


### Domínio: adoption

| Página Streamlit | Componente React | API Endpoint | Status |
|---|---|---|---|
| `adoption/kpi.py` | `Kpi.tsx` | `GET /api/adoption/kpi` | Pendente |
| `adoption/report_cisco_lci.py` | `CiscoLci.tsx` | `GET /api/adoption/cisco-lci` | Pendente |
| `adoption/report_csm_account.py` | `CsmAccount.tsx` | `GET /api/adoption/csm-account` | Pendente |
| `adoption/report_forecast.py` | `Forecast.tsx` | `GET /api/adoption/forecast` | Pendente |
| `adoption/report_lci_eligible_status.py` | `LciEligibleStatus.tsx` | `GET /api/adoption/lci-eligible-status` | Pendente |
| `adoption/report_lci_solution_vs_project.py` | `LciSolutionVsProject.tsx` | `GET /api/adoption/lci-solution-vs-project` | Pendente |
| `adoption/report_rebate_and_opportunities.py` | `RebateAndOpportunities.tsx` | `GET /api/adoption/rebate-opportunities` | Pendente |
| `adoption/report_team_target.py` | `TeamTarget.tsx` | `GET /api/adoption/team-target` | Pendente |
| `adoption/use_case.py` | `UseCase.tsx` | `GET /api/adoption/use-case` | Pendente |
| `adoption/use_case_applicability.py` | `UseCaseApplicability.tsx` | `GET /api/adoption/use-case-applicability` | Pendente |
| `adoption/use_case_exit_criteria.py` | `UseCaseExitCriteria.tsx` | `GET /api/adoption/use-case-exit-criteria` | Pendente |

### Domínio: portfolio

| Página Streamlit | Componente React | API Endpoint | Status |
|---|---|---|---|
| `portfolio/farol.py` | `Farol.tsx` | `GET /api/portfolio/farol` | Pendente |
| `portfolio/client_overview.py` | `ClientOverview.tsx` | `GET /api/portfolio/client-overview` | Pendente |
| `portfolio/asset.py` | `Asset.tsx` | `GET /api/portfolio/asset` | Pendente |
| `portfolio/account_team.py` | `AccountTeam.tsx` | `GET/POST/PUT /api/portfolio/account-team` | Pendente |
| `portfolio/adoption_tasks.py` | `AdoptionTasks.tsx` | `GET /api/portfolio/adoption-tasks` | Pendente |
| `portfolio/cisco_enterprise_agreement_license_usage.py` | `CiscoEaLicenseUsage.tsx` | `GET /api/portfolio/cisco-ea-usage` | Pendente |
| `portfolio/cisco_smart_account_license_usage.py` | `CiscoSaLicenseUsage.tsx` | `GET /api/portfolio/cisco-sa-usage` | Pendente |
| `portfolio/report_cisco_true_forward.py` | `CiscoTrueForward.tsx` | `GET /api/portfolio/cisco-true-forward` | Pendente |

### Domínio: admin

| Página Streamlit | Componente React | API Endpoint | Status |
|---|---|---|---|
| `admin/admin_user.py` | `AdminUsers.tsx` | `GET/POST/PUT /api/admin/users` | Pendente |
| `admin/admin_auth_role.py` | `AdminRoles.tsx` | `GET/POST /api/admin/roles` | Pendente |
| `admin/admin_task.py` | `AdminTasks.tsx` | `GET/PUT /api/admin/tasks` | Pendente |
| `admin/admin_task_edit.py` | integrado em `AdminTasks.tsx` | `PUT /api/admin/tasks/{id}` | Pendente |
| `admin/admin_company.py` | `AdminCompany.tsx` | `GET/POST/PUT /api/admin/company` | Pendente |
| `admin/admin_team_goal.py` | `AdminTeamGoal.tsx` | `GET/POST/PUT /api/admin/team-goal` | Pendente |
| `admin/admin_requirements.py` | `AdminRequirements.tsx` | `GET /api/admin/requirements` | Pendente |
| `admin/admin_debug.py` | `DebugPanel.tsx` | `GET /api/admin/debug` | Pendente |

### Domínio: operational

| Página Streamlit | Componente React | API Endpoint | Status |
|---|---|---|---|
| `operational/contract.py` | `Contract.tsx` | `GET /api/operational/contracts` | Pendente |
| `operational/measurement.py` | `Measurement.tsx` | `GET /api/operational/measurements` | Pendente |
| `operational/measurement_billing.py` | `MeasurementBilling.tsx` | `GET /api/operational/measurement-billing` | Pendente |
| `operational/measurement_inventory.py` | `MeasurementInventory.tsx` | `GET /api/operational/measurement-inventory` | Pendente |
| `operational/measurement_product.py` | `MeasurementProduct.tsx` | `GET /api/operational/measurement-product` | Pendente |
| `operational/measurement_request.py` | `MeasurementRequest.tsx` | `GET /api/operational/measurement-request` | Pendente |
| `operational/notafiscal.py` | `NotaFiscal.tsx` | `GET /api/operational/notas-fiscais` | Pendente |
| `operational/purchase.py` | `Purchase.tsx` | `GET /api/operational/purchases` | Pendente |
| `operational/iteminfo.py` | `ItemInfo.tsx` | `GET /api/operational/items` | Pendente |

### Domínio: presales, project, public, renewals, technical

| Página Streamlit | Componente React | API Endpoint | Status |
|---|---|---|---|
| `presales/heatmap.py` | `Heatmap.tsx` | `GET/POST/PUT /api/presales/heatmap` | Pendente |
| `project/project.py` | `Project.tsx` | `GET /api/project/` | Pendente |
| `public/report.py` | `Report.tsx` | `GET /api/public/reports` | Pendente |
| `public/csm_account.py` | `PublicCsmAccount.tsx` | `GET /api/public/csm-account` | Pendente |
| `public/importer.py` | `Importer.tsx` | `POST /api/public/import` | Pendente |
| `renewals/renovations_plan.py` | `RenovationsPlan.tsx` | `GET /api/renewals/plan` | Pendente |
| `technical/technical.py` | `Technical.tsx` | `GET /api/technical/` | Pendente |

---

## 16. Referências

### Documentação do projeto atual

- `docs/01_architecture/bridgeadoption_webapp_architecture.md` — Arquitetura da webapp Streamlit
- `docs/01_architecture/bridgeadoption_backend_architecture.md` — Arquitetura do backend Python
- `docs/01_architecture/bridgeadoption_navigation_architecture.md` — Arquitetura de navegação
- `docs/06_security/authorization_rbac.md` — Autorização e RBAC detalhado

### Arquivos-chave do Streamlit (referência para migração)

- `webapp/app.py` — Autenticação, RBAC, navegação dinâmica
- `webapp/utils/authorization.py` — `can()`, `require_admin()`
- `webapp/pages/task/task.py` — Hub de tarefas, padrão de toolbar + seções
- `webapp/pages/adoption/report_cisco_lci.py` — Gráficos mais complexos da aplicação
- `webapp/pages/portfolio/farol.py` — Grid de cards customizados
- `src/domain/i18n/pt-BR.json` — Estrutura de traduções (reutilizar no React)

### Tecnologias React

| Tecnologia | Documentação |
|---|---|
| React 18 | https://react.dev |
| TypeScript | https://www.typescriptlang.org/docs |
| Vite | https://vitejs.dev |
| React Router v6 | https://reactrouter.com |
| Zustand | https://zustand-demo.pmnd.rs |
| TanStack Query | https://tanstack.com/query |
| TanStack Table | https://tanstack.com/table |
| shadcn/ui | https://ui.shadcn.com |
| Tailwind CSS | https://tailwindcss.com |
| Plotly.js (react-plotly.js) | https://plotly.com/javascript/react |
| Recharts | https://recharts.org |
| react-i18next | https://react.i18next.com |
| SheetJS | https://sheetjs.com |
| React Hook Form | https://react-hook-form.com |
| Zod | https://zod.dev |
| Vitest | https://vitest.dev |
| Playwright | https://playwright.dev |

### Tecnologias API FastAPI

| Tecnologia | Documentação |
|---|---|
| FastAPI | https://fastapi.tiangolo.com |
| Pydantic v2 | https://docs.pydantic.dev |
| python-jose | https://python-jose.readthedocs.io |
| Uvicorn | https://www.uvicorn.org |

---

*Documento gerado em 2026-07-24. Atualizar conforme o progresso da migração.*
