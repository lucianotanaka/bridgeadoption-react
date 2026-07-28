# Arquitetura Geral — Bridge Adoption React

> **Última atualização:** 2026-07  
> **Audiência:** Equipe de desenvolvimento e sustentação

---

## 1. Visão geral do sistema

O **Bridge Adoption** é um portal web interno da NTT Data para gestão de adoção tecnológica de clientes Cisco. Suporta múltiplos CSMs, rastreamento de tarefas, relatórios de incentivos LCI/Rebate e gestão de portfólio de clientes.

### Diagrama de componentes

```
┌─────────────────────────────────────────────────────────┐
│                      USUÁRIO (Browser)                   │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP/HTTPS
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    Apache HTTP Server                    │
│  Serve arquivos estáticos (dist/) + Proxy /api → FastAPI│
└──────────────┬──────────────────────────┬───────────────┘
               │ Static files             │ /api/* (proxy)
               ▼                          ▼
┌──────────────────────┐    ┌─────────────────────────────┐
│   React SPA (Vite)   │    │     FastAPI (Python)         │
│   TypeScript         │    │     Port 8000                │
│   Tailwind CSS       │    │     JWT Auth                 │
│   React Router v6    │◄──►│     MySQL connector          │
│   Zustand            │    │     Uvicorn/Gunicorn         │
│   TanStack Query     │    └──────────────┬──────────────┘
└──────────────────────┘                   │
                                           ▼
                              ┌────────────────────────────┐
                              │   MySQL / MariaDB           │
                              │   Banco: pegasus           │
                              │   (compartilhado com       │
                              │    versão Streamlit)       │
                              └────────────────────────────┘
```

---

## 2. Stack tecnológica

### Frontend
| Tecnologia | Versão | Finalidade |
|---|---|---|
| React | 18 | Framework UI |
| TypeScript | 5 | Tipagem estática |
| Vite | 5 | Build tool e dev server |
| React Router v6 | 6 | Roteamento SPA |
| TanStack Query | 5 | Cache e fetching de dados da API |
| Zustand | 4 | Estado global (autenticação, tema) |
| Tailwind CSS | 3 | Estilização utilitária |
| react-i18next | — | Internacionalização (pt/en/es) |
| Lucide React | — | Biblioteca de ícones SVG |
| Axios | — | Cliente HTTP |

### Backend
| Tecnologia | Versão | Finalidade |
|---|---|---|
| Python | 3.11+ | Linguagem do backend |
| FastAPI | — | Framework REST API |
| Uvicorn | — | Servidor ASGI |
| PyJWT / python-jose | — | Geração e validação de tokens JWT |
| bcrypt | — | Hash de senhas |
| mysql-connector-python | — | Conexão com MySQL |
| python-dotenv | — | Variáveis de ambiente |

### Infraestrutura
| Componente | Tecnologia |
|---|---|
| Servidor web (frontend) | Apache HTTP Server |
| Processo backend | systemd (bridgeadoption-backend) |
| Banco de dados | MySQL / MariaDB (banco: pegasus) |
| Sistema operacional | CentOS / RHEL |

---

## 3. Estrutura de diretórios

```
/opt/bridgeadoption/
├── backend/                    → API FastAPI
│   ├── app/
│   │   ├── auth/               → Autenticação, JWT, permissões
│   │   ├── adoption/           → Módulos de adoção
│   │   ├── modules/            → Portfolio, public, sections
│   │   ├── admin/              → Administração de usuários/permissões
│   │   └── core/               → Config, segurança, banco
│   ├── requirements.txt
│   └── main.py
├── frontend/                   → SPA React
│   ├── src/
│   │   ├── api/                → Clientes HTTP por módulo
│   │   ├── components/         → Componentes compartilhados
│   │   ├── hooks/              → Hooks customizados
│   │   ├── i18n/               → Internacionalização
│   │   ├── pages/              → Páginas por módulo
│   │   ├── router/             → Guards de rota
│   │   └── store/              → Estado global (Zustand)
│   ├── public/images/          → Logos e imagens estáticas
│   ├── vite.config.ts
│   └── deploy.sh
└── docs/                       → Documentação
```

---

## 4. Fluxo de autenticação

```
1. Usuário acessa o portal → React verifica authStore (Zustand + localStorage)
2. Sem token válido → Redireciona para /login
3. Login: POST /api/auth/login (email + senha)
4. Backend valida credenciais (bcrypt) no MySQL
5. Backend gera JWT com: user_id, user_name, roles, language
6. Backend carrega permissões (tbAuthPermission) e tema (tbUser.user_theme)
7. Frontend armazena token + permissões no authStore
8. Frontend aplica tema e idioma do usuário
9. React Router + PermissionRoute controla acesso às rotas
10. Cada chamada API inclui: Authorization: Bearer <token>
```

---

## 5. Fluxo de dados (módulo típico)

```
Usuário navega para /tasks
        │
        ▼
PermissionRoute verifica hasPermission("task.task")
        │
        ├── Sem permissão → redirect /
        │
        ▼
TaskPage renderiza
        │
        ▼
TanStack Query: GET /api/tasks?filtros...
        │
        ▼
FastAPI recebe request com Bearer token
        │
        ├── Token inválido → 401 Unauthorized
        │
        ▼
Service layer: query MySQL (stored procedures / views)
        │
        ▼
JSON response → React Query cache (5 min)
        │
        ▼
Componente atualiza com dados
```

---

## 6. Segurança em camadas

| Camada | Mecanismo | Localização |
|---|---|---|
| **Autenticação** | JWT Bearer Token (HS256, 8h expiry) | `backend/app/core/security.py` |
| **Autorização frontend (rota)** | `PrivateRoute` + `PermissionRoute` + `AdminRoute` | `frontend/src/router/` |
| **Autorização frontend (menu)** | `hasPermission(resourceKey)` no Sidebar | `frontend/src/components/layout/Sidebar.tsx` |
| **Autorização backend (endpoint)** | `Depends(get_current_user)` | Todos os routers FastAPI |
| **Autorização admin** | `_is_admin(payload)` | Routers de admin |
| **Banco** | RBAC: tbAuthRole + tbAuthPermission | MySQL |

---

## 7. Módulos da aplicação

| Módulo | Rota | resource_key | Descrição |
|---|---|---|---|
| Dashboard | `/` | — | Painel principal (Today) |
| Tasks | `/tasks` | `task.task` | Gestão de tarefas |
| Forecast | `/adoption/forecast` | `adoption.report_forecast` | Previsão de adoção |
| Cisco LCI | `/adoption/cisco-lci` | `adoption.report_cisco_lci` | Relatório LCI |
| CSM Account | `/adoption/csm-account` | `adoption.report_csm_account` | Contas CSM |
| Team Target | `/adoption/team-target` | `adoption.report_team_target` | Metas de equipe |
| LCI Status | `/adoption/lci-status` | `adoption.report_lci_eligible_status` | Status elegíveis |
| Rebate | `/adoption/rebate` | `adoption.report_rebate_and_opportunities` | Incentivos |
| Use Cases | `/adoption/use-cases` | `adoption.use_case` | Casos de uso |
| Farol | `/portfolio/farol` | `portfolio.farol` | Semáforo de saúde |
| Assets | `/portfolio/asset` | `portfolio.asset` | Ativos do cliente |
| Account Team | `/portfolio/account-team` | `portfolio.account_team` | Equipe de conta |
| Adoption Tasks | `/portfolio/adoption-tasks` | `portfolio.adoption_tasks` | Tarefas de adoção |
| Client Overview | `/portfolio/client-overview` | `portfolio.client_overview` | Visão do cliente |
| Projects | `/projects` | `project.project` | Projetos |
| CSM Account (Public) | `/public/csm-account` | `public.csm_account` | CSM público |
| Importer | `/public/importer` | `public.importer` | Importador |
| Admin | `/admin/*` | `admin.*` | Administração |

---

## 8. Configuração de ambiente

### Variáveis de ambiente do backend (`.env`)

```env
# Banco de dados
DB_HOST=localhost
DB_PORT=3306
DB_NAME=pegasus
DB_USER=seu_usuario
DB_PASSWORD=sua_senha

# JWT
JWT_SECRET_KEY=chave-secreta-forte
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=8

# API
API_PREFIX=/api
CORS_ORIGINS=http://<servidor>
```

### Configuração do frontend (`vite.config.ts`)

```typescript
export default defineConfig({
  base: "/bridgeadoption/",  // subpath para ambiente lab (remover em produção)
  server: {
    proxy: {
      "/api": "http://localhost:8000"
    }
  }
})
```

> **Atenção:** Em produção, o `base` deve ser `/` (raiz). O Apache faz o proxy de `/api` para o FastAPI.

---

## 9. Deploy resumido

```bash
# Backend — reiniciar serviço
systemctl restart bridgeadoption-backend

# Frontend — build e deploy
cd /opt/bridgeadoption/frontend
bash deploy.sh
```

Detalhes completos: ver `05_deployment/deployment_guide.md`
