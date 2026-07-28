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

| Arquivo | Conteúdo |
|---|---|
| `auth_endpoints.md` | Login, logout, language, theme |
| `adoption_endpoints.md` | Todos os endpoints do módulo Adoption |
| `admin_endpoints.md` | CRUD de usuários, roles, permissões |
| `tasks_endpoints.md` | Endpoints do módulo Tasks |

> **Nota:** Use `/api/docs` (Swagger UI) ou `/api/redoc` para explorar os endpoints interativamente em ambiente de desenvolvimento.
