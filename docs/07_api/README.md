# 07 — API Documentation

Documentação dos endpoints da API REST do Bridge Adoption (FastAPI).

## Estrutura do backend

```
backend/
  app/
    auth/           → Autenticação, JWT, permissões, tema, idioma
    adoption/       → Módulos de adoção (forecast, LCI, CSM, rebate, etc.)
    modules/        → Módulos gerais (public, sections, portfolio)
    admin/          → Administração de usuários, roles, permissões
    core/           → Configuração, segurança (JWT), conexão com banco
```

## Base URL

```
http://<servidor>/api
```

> Substitua `<servidor>` pelo hostname/IP do servidor onde o Bridge Adoption está instalado.  
> Exemplo lab: `172.30.100.3` (com subpath `/bridgeadoption/`)  
> Exemplo produção: `brcghmdb01.br.didata.com` (sem subpath)

## Grupos de endpoints

| Grupo | Prefixo | Descrição |
|---|---|---|
| Auth | `/api/auth` | Login, logout, JWT, preferências do usuário |
| Adoption | `/api/adoption` | Forecast, Cisco LCI, CSM Account, Team Target, etc. |
| Portfolio | `/api/portfolio` | Farol, Assets, Account Team, Client Overview |
| Tasks | `/api/tasks` | Tarefas, atividades, follow-ups |
| Admin | `/api/admin` | Usuários, roles, permissões, recursos |
| Public | `/api/public` | CSM Account público, Importador |

## Arquivos de documentação

| Arquivo | Prefixo base | Conteúdo |
|---|---|---|
| `auth_endpoints.md` | `/api/auth` | Login, logout, language, theme |
| `admin_endpoints.md` | `/api/admin` | CRUD de usuários, roles, permissões, recursos |
| `public_endpoints.md` | `/api/public` | CSM Account público, Importador |
| `cisco_lci_endpoints.md` | `/api/adoption` | Cisco LCI — relatório, forecast, elegível |
| `csm_account_endpoints.md` | `/api/adoption/csm-account` | CSM Account — accounts, summary/KPIs |
| `team_target_endpoints.md` | `/api/adoption/team-target` | Metas de equipe — FY, targets, medições |
| `opportunities_endpoints.md` | `/api/adoption/rebate` | Adoption Opportunities — SIP tasks, fiscal years |
| `use_cases_endpoints.md` | `/api/adoption/use-cases` | Use Cases — vendors, use cases por vendor, exit criteria |
| `account_team_endpoints.md` | `/api/portfolio/account-team` | Account Team — matrix, rows, users, PUT/POST |

> **Nota:** Use `/api/docs` (Swagger UI) ou `/api/redoc` para explorar os endpoints interativamente em ambiente de desenvolvimento.
