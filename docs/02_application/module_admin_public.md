# Módulos Admin e Public — Bridge Adoption React

> **Última atualização:** 2026-07  
> **Audiência:** Desenvolvimento e sustentação

---

## PARTE 1 — Módulo Admin

### 1.1 Visão geral

O grupo Admin contém ferramentas de administração da plataforma. Todos os módulos deste grupo exigem role `ADMIN`. A proteção é dupla: `AdminRoute` no frontend + `_is_admin()` nos endpoints da API.

### 1.2 Sub-módulos Admin

| Módulo | Rota | resource_key | Arquivo |
|---|---|---|---|
| Admin (hub) | `/admin` | `admin.*` | `AdminPage.tsx` |
| Users | `/admin/users` | `admin.admin_user` | `AdminUsersPage.tsx` |
| Companies | `/admin/companies` | `admin.admin_company` | `AdminCompaniesPage.tsx` |
| Roles & Auth | `/admin/roles` | `admin.admin_auth_role` | `AdminRolesPage.tsx` |
| Team Goals | `/admin/team-goals` | `admin.admin_team_goal` | `AdminTeamGoalsPage.tsx` |
| Tasks (Admin) | `/admin/tasks` | `admin.admin_task` | `AdminTasksPage.tsx` |

---

### 1.3 Admin → Users (`admin.admin_user`)

#### Propósito
Gerenciamento de usuários: busca, edição de dados pessoais, gestão de roles e permissões.

#### Funcionalidades
- **Buscar usuário:** por nome ou email (busca no banco)
- **Editar dados:** nome, email, senha (nova senha opcional)
- **Roles:** ver roles atuais, adicionar/remover roles do usuário
- **Permissões:** via API (gestão granular por `user_role_id`)

#### Fluxo de gestão de usuário
```
1. Buscar usuário (GET /api/admin/users?name=X)
2. Selecionar usuário da lista
3. Editar dados (PUT /api/admin/users/{id})
4. Gerenciar roles (GET/POST/DELETE /api/admin/users/{id}/roles/{role_id})
5. Gerenciar permissões por user_role_id (via API)
```

---

### 1.4 Admin → Companies (`admin.admin_company`)

#### Propósito
Cadastro e manutenção de empresas/clientes cadastrados na plataforma.

#### Funcionalidades
- Listar empresas com busca por nome
- Cadastrar nova empresa
- Editar dados de empresa existente
- Associar empresa a clientes Cisco

---

### 1.5 Admin → Roles & Auth (`admin.admin_auth_role`)

#### Propósito
Visão geral das roles existentes e seus recursos associados. Permite entender quais permissões cada role concede.

#### Componentes
- Tabela de roles com descrição
- Para cada role: lista de recursos (resource_keys) associados

---

### 1.6 Admin → Team Goals (`admin.admin_team_goal`)

#### Propósito
Definição e edição das metas de adoção da equipe por período (ano fiscal NTT). As metas são usadas no módulo Adoption Forecast para calcular taxa de atingimento.

#### Funcionalidades
- Visualizar metas por ano fiscal
- Criar/editar metas (quantidade de atividades, valor LCI, etc.)
- Atribuir metas por CSM ou equipe

---

### 1.7 Admin → Tasks (`admin.admin_task`)

#### Propósito
Administração em massa de tarefas — operações que normalmente só um admin pode fazer.

#### Funcionalidades
- Reatribuir tarefas (trocar CSM responsável)
- Encerrar tarefas em lote
- Exportar dados de tarefas

---

## PARTE 2 — Módulo Public

### 2.1 Visão geral

O grupo Public contém módulos com menor nível de restrição — são visíveis para usuários com as permissões específicas mas não exigem role ADMIN.

### 2.2 Sub-módulos Public

| Módulo | Rota | resource_key | Arquivo |
|---|---|---|---|
| CSM Account | `/public/csm-account` | `public.csm_account` | `PublicCsmAccountPage.tsx` |
| Importer | `/public/importer` | `public.importer` | `ImporterPage.tsx` |

---

### 2.3 Public — CSM Account (`public.csm_account`)

#### Propósito
Versão pública/simplificada da visão de contas CSM — exibe o portfólio de clientes por CSM sem dados sensíveis.

#### Diferença em relação ao CSM Account do grupo Adoption
- Menos colunas (sem dados financeiros)
- Sem botão Refresh (dados carregam automaticamente)
- Filtros multiselect com busca interna
- Filtro EA: exibe "Yes"/"No" em vez de "Y"/"N"

#### Componentes
- Filtros multiselect: CSM, Cliente, AM, EA, Type
- Ordenação por coluna (click no cabeçalho)
- Paginação com seletor de linhas por página
- Botão "Clear all filters" (aparece somente quando há filtros ativos — componente `<span>`, não `<button>`)

---

### 2.4 Public — Importer (`public.importer`)

#### Propósito
Painel de agendamento de importações de dados externos — permite agendar manualmente a execução dos importadores Cisco.

#### Funcionalidades
- **Tipos de importação disponíveis:**
  - Cisco Ready
  - Cisco Subscription (CCW)
  - Cisco Enterprise Agreement
  - Cisco LCI
  - Outros (conforme configuração)
- **Agendamento:** imediato (default) ou para data/hora específica
- **Histórico:** log das últimas importações com status (sucesso/erro)

#### Endpoints
- `GET /api/public/import-types` — lista tipos disponíveis
- `POST /api/public/import` — agenda importação
- `GET /api/public/import-history` — histórico de importações

#### Notas de segurança
- Apesar de estar no grupo "Public", o módulo requer `public.importer` em `tbAuthPermission`
- Em produção, restringir ao grupo de operação/sustentação

---

## PARTE 3 — Módulo Dashboard (Today)

### 3.1 Visão geral

O Dashboard (`/`) é a página inicial após o login. Exibe um resumo do estado atual da adoção e tarefas do dia.

**Não tem resource_key** — acessível por qualquer usuário autenticado.

### 3.2 Componentes

```
frontend/src/pages/dashboard/
├── DashboardPage.tsx       → Página principal do dashboard
└── TodayRightPanel.tsx     → Painel direito com informações do dia
```

### 3.3 Conteúdo

- Resumo de tarefas do dia (follow-ups, vencimentos)
- Indicadores de saúde do portfólio
- Acesso rápido a módulos mais usados
- Notificações/alertas importantes

---

## PARTE 4 — Módulo Projects

### 4.1 Visão geral

Módulo de projetos de clientes (`/projects`, resource_key: `project.project`).

**Arquivo:** `frontend/src/pages/projects/ProjectsPage.tsx`

### 4.2 Funcionalidades
- Lista de projetos por cliente
- Status do projeto
- Timeline e marcos
- Associação com tarefas de adoção
