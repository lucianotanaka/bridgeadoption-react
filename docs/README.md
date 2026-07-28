# Bridge Adoption — Documentação

> **Versão:** React (FastAPI + React/TypeScript)  
> **Última atualização:** 2026-07

---

## Estrutura de documentação

```
docs/
├── 00_migration/       Histórico da migração Streamlit → React
├── 01_architecture/    Arquitetura do sistema React
├── 02_application/     Documentação dos módulos (um arquivo por módulo)
│   ├── adoption/       Módulos do grupo Adoption
│   ├── portfolio/      Módulos do grupo Portfolio
│   ├── public/         Módulos do grupo Public
│   ├── tasks/          Módulo Tasks (referência para 05_deployment/task/)
│   └── module_*.md     Visões gerais por grupo (legado — use as subpastas)
├── 03_database/        Banco de dados — estrutura e views
├── 04_infrastructure/  Infraestrutura — nginx, Apache, servidor
├── 05_deployment/      Deploy — React build, FastAPI, systemd
├── 06_security/        Autenticação, RBAC, permissões (JWT)
├── 07_api/             Endpoints FastAPI — referência da API REST
└── 08_frontend/        Frontend React — padrões, componentes, estado
```

---

## Visão geral do sistema

O **Bridge Adoption** é um portal web interno NTT Data para gestão de adoção tecnológica de clientes Cisco.

### Stack React (versão atual)

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Roteamento | React Router v6 |
| Estado | Zustand (auth, theme) + TanStack Query (server state) |
| Backend | Python FastAPI |
| Banco | MySQL (MariaDB) |
| Servidor | Apache (frontend estático) + systemd (backend FastAPI) |

### Acesso

| | URL |
|---|---|
| Portal | `http://<servidor>/` |
| API | `http://<servidor>/api` |
| Swagger | `http://<servidor>/api/docs` |

---

## Índice completo de documentos

### `00_migration/`
- `Streamlit_to_React_Migration_Plan.md` — plano e histórico da migração

### `01_architecture/`
- **`architecture_overview.md`** — Arquitetura geral: componentes, stack, fluxos, segurança, módulos

### `02_application/` — Módulos por grupo

#### Grupo Tasks
- **`module_tasks.md`** — Visão geral do módulo Tasks (componentes, regras, endpoints)
- *(detalhes internos em `05_deployment/task/`)*

#### Grupo Adoption (`adoption/`)
- **`adoption/forecast.md`** — Forecast: previsão backlog vs realizado vs meta
- **`adoption/cisco_lci.md`** — Cisco LCI: estágios, valores, taxa de conversão
- **`adoption/csm_account.md`** — CSM Account: portfólio de contas por CSM
- **`adoption/team_target.md`** — Team Target: metas vs atingimento por CSM
- **`adoption/lci_status.md`** — LCI Status: elegibilidade e Solution vs Project
- **`adoption/rebate.md`** — Rebate: incentivos SIP/LCI, oportunidades
- **`adoption/use_cases.md`** — Use Cases: aplicabilidade e exit criteria

#### Grupo Portfolio (`portfolio/`)
- **`portfolio/farol.md`** — Farol: semáforo de saúde dos clientes
- **`portfolio/assets.md`** — Assets: portfólio de ativos e licenças
- **`portfolio/account_team.md`** — Account Team: equipe de conta por cliente
- **`portfolio/adoption_tasks.md`** — Adoption Tasks: tarefas filtradas por cliente
- **`portfolio/client_overview.md`** — Client Overview: Cisco EA + SA + True Forward

#### Grupo Public (`public/`)
- **`public/csm_account_public.md`** — CSM Account (versão pública simplificada)
- **`public/importer.md`** — Importer: agendamento de importações Cisco

### `03_database/`
- `database_pegasus_structure.sql` — estrutura do banco MySQL
- `vwCustomerCiscoLCIDealTrackProjectStatus.md` — view LCI Deal Track
- `vwCustomerCiscoLCITrackProjectPM.md` — view LCI Track PM

### `04_infrastructure/`
- `nginx_reverse_proxy.md` — configuração nginx

### `05_deployment/`
- **`deployment_guide.md`** — Deploy completo: frontend + backend + Apache + systemd + checklist
- `task/` — arquitetura e troubleshooting do módulo Tasks (5 arquivos)

### `06_security/`
- **`authorization_rbac.md`** — RBAC React v3.0: JWT, PermissionRoute, AdminRoute, permissões
- `authorization_rbac_lld.md` — estrutura das tabelas de segurança no banco
- `roles-strategy.md` — estratégia de roles e permissões

### `07_api/`
- `README.md` — visão geral dos grupos de endpoints
- **`auth_endpoints.md`** — Login, logout, language, theme
- **`admin_endpoints.md`** — Usuários, roles, permissões, recursos, empresas

### `08_frontend/`
- `README.md` — visão geral da stack React, estrutura, build e deploy
- **`architecture.md`** — Camadas do SPA, cliente HTTP, padrão de página, Tailwind
- **`state_management.md`** — authStore, themeStore, TanStack Query, estado local
- **`i18n.md`** — Internacionalização: configuração, uso, tradução, troubleshooting

---

## Links rápidos por tarefa

| Preciso... | Documento |
|---|---|
| Fazer deploy | `05_deployment/deployment_guide.md` |
| Criar novo módulo | `08_frontend/architecture.md` + `06_security/authorization_rbac.md` |
| Gerenciar permissões | `06_security/authorization_rbac.md` |
| Entender a API | `07_api/auth_endpoints.md` + `07_api/admin_endpoints.md` |
| Adicionar tradução | `08_frontend/i18n.md` |
| Gerenciar estado | `08_frontend/state_management.md` |
| Entender um módulo específico | `02_application/<grupo>/<modulo>.md` |
| Entender arquitetura geral | `01_architecture/architecture_overview.md` |
| Troubleshooting deploy/backend | `05_deployment/deployment_guide.md` |
