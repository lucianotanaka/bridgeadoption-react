# Autorização e RBAC (Role-Based Access Control)

> **Versão:** 3.1 — Bridge Adoption React  

Este documento descreve como funciona a **autorização** no Bridge Adoption (versão React), com foco em:

- Estrutura de tabelas de segurança no banco de dados
- Como as permissões são carregadas no login
- Como o menu lateral é controlado por permissão
- Como as rotas são protegidas (`PermissionRoute` / `AdminRoute`)
- Como os endpoints da API são protegidos
- Boas práticas para configurar novos recursos e permissões

---

## 1. Conceitos principais (RBAC)

A autorização é baseada em **RBAC** (Role-Based Access Control):

| Conceito | Tabela | Descrição |
|---|---|---|
| **Usuário** | `tbUser` | Conta que faz login |
| **Role** | `tbAuthRole` | Conjunto lógico de permissões (ex: `ADMIN`, `TASK`, `ADOPTION`) |
| **Vínculo Usuário–Role** | `tbAuthUserRole` | Liga usuário a role; gera `user_role_id` único |
| **Recurso** | `tbAuthResource` | Página/funcionalidade; chave no formato `dominio.recurso` |
| **Ação** | `tbAuthAction` | Tipo de acesso: `view`, `edit`, `delete`, `full`, `deny` |
| **Permissão** | `tbAuthPermission` | Associa `user_role_id` + `resource_id` + `action_id` |

### Formato do `resource_key`

```
dominio.nome_recurso
```

Exemplos:
- `task.task` → página principal de tarefas
- `adoption.report_forecast` → Forecast de Adoção
- `admin.admin_user` → administração de usuários
- `portfolio.farol` → Farol do Portfólio
- `public.csm_account` → CSM Account público

### Modelo de permissão por vínculo

As permissões são definidas por **vínculo usuário+role** (`user_role_id`), não apenas por role global.  
Dois usuários com a mesma role podem ter conjuntos de permissões diferentes.

---

## 2. Estrutura de tabelas de autorização

### `tbAuthRole`
- `role_id` (PK)
- `role_name` (ex.: `ADMIN`, `TASK`, `ADOPTION`)
- `role_description`
- `is_active` (1/0)

### `tbAuthUserRole`
- `user_role_id` (PK) — **chave usada nas permissões**
- `user_id` (FK → `tbUser.user_id`)
- `role_id` (FK → `tbAuthRole.role_id`)

### `tbAuthResource`
- `resource_id` (PK)
- `resource_key` (ex.: `task.task`) — **identificador único usado no código**
- `resource_name` (nome amigável)
- `resource_icon` (ícone)
- `is_active` (1/0)
- `show_in_menu` (1/0) — se deve aparecer no menu quando o usuário tem permissão

### `tbAuthAction`
- `action_id` (PK)
- `action_key` (ex.: `view`, `edit`, `delete`, `full`, `deny`)
- `action_name`
- `is_active` (1/0)

> **Convenção:** `action_id = 1` é reservado para `deny`. Permissões com `action_id <= 1` são tratadas como acesso negado.

### `tbAuthPermission`
- `permission_id` (PK)
- `user_role_id` (FK → `tbAuthUserRole.user_role_id`)
- `resource_id` (FK → `tbAuthResource.resource_id`)
- `action_id` (FK → `tbAuthAction.action_id`)

---

## 3. Fluxo de autenticação e carregamento de permissões

### 3.1. Login — `POST /api/auth/login`

Arquivo: `backend/app/auth/router.py`

```python
@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest):
    user_id, user_name, language, require_change = login_user(body.email, body.password)
    roles = get_user_roles(user_id)

    # ADMIN: carrega todos os recursos ativos (ignora tbAuthPermission)
    # Demais: carrega apenas recursos com permissão explícita
    if "ADMIN" in roles:
        permissions = load_admin_permissions()
    else:
        permissions = load_user_permissions(user_id)

    access_token = create_access_token(
        data={"sub": str(user_id), "user_name": user_name, "roles": roles, "language": language}
    )
    theme = get_user_theme(user_id)

    return LoginResponse(
        access_token=access_token,
        permissions=permissions,
        theme=theme,
        language=language,
        ...
    )
```

**Armazenamento:** JWT Bearer Token (stateless) + Zustand store no frontend (`authStore`).

A resposta retorna:
- `access_token` — JWT usado em todas as chamadas à API
- `permissions` — dicionário de permissões do usuário
- `theme` — preferência de tema (`dark`/`light`) de `tbUser.user_theme`
- `language` — idioma preferido (`pt-BR`, `en-US`, `es-ES`) de `tbUser.user_language`

### 3.2. Estrutura de permissões retornada

Arquivo: `backend/app/auth/service.py` → `load_user_permissions()`

```python
{
    "ROLE_NAME": {
        "Resource Name": {
            "resource_key": "dominio.recurso",
            "resource_icon": "icon_name",
            "action": "view|edit|full",
            "is_active": 1,
            "show_in_menu": 1
        }
    }
}
```

- **ADMIN**: `load_admin_permissions()` retorna todos os recursos com `is_active = 1`, com `action = "full"`.
- **Demais usuários**: apenas recursos com permissão em `tbAuthPermission` e `action_id > 1`.

### 3.3. Extração de permissões no frontend

Arquivo: `frontend/src/hooks/useAuth.ts`

> ⚠️ **Correção importante (2026-08):** a implementação original filtrava por `show_in_menu === 1`, o que **excluía indevidamente sub-permissões que não são itens de menu** (ex.: `task.task_lci_viability`, usada para controlar a exibição da aba "LCI Viability" dentro do módulo Tasks, e não uma entrada própria no menu lateral). Isso fazia com que `hasPermission("task.task_lci_viability")` retornasse `false` mesmo para usuários com a permissão concedida no banco. A extração correta segue o mesmo critério do `can()` do Streamlit: considera **qualquer** resource_key cuja `action` não seja `"deny"`, **independente de `show_in_menu`** (que serve apenas para controlar a visibilidade no menu lateral, não o acesso à funcionalidade).

```typescript
function extractResourceKeys(permissions: Record<string, unknown>): string[] {
  const keys: string[] = [];
  for (const rolePerms of Object.values(permissions)) {
    for (const perm of Object.values(rolePerms as Record<string, unknown>)) {
      const p = perm as { resource_key?: string; action?: string };
      if (p.resource_key && p.action && p.action !== "deny") {
        keys.push(p.resource_key);
      }
    }
  }
  return keys;
}
```

O resultado é armazenado no `authStore` como `user.permissions: string[]`:

```typescript
// Exemplos: ["task.task", "adoption.report_forecast", "portfolio.farol", ...]

hasPermission: (resourceKey) => {
  if (user.roles.includes("ADMIN")) return true;  // ADMIN sempre permitido
  return user.permissions?.includes(resourceKey) ?? false;
}
```

---

## 4. Controle de menu (Sidebar)

Arquivo: `frontend/src/components/layout/Sidebar.tsx`

O menu é definido estaticamente com `resourceKey` em cada item:

```typescript
const NAV_ITEMS: NavItem[] = [
  { key: "tasks", label: "Tasks", path: "/tasks", resourceKey: "task.task" },
  {
    key: "adoption", label: "Adoption",
    children: [
      { key: "forecast", label: "Forecast", path: "/adoption/forecast", resourceKey: "adoption.report_forecast" },
      { key: "ciscoLCI", label: "Cisco LCI", path: "/adoption/cisco-lci", resourceKey: "adoption.report_cisco_lci" },
      // ...
    ],
  },
  // ...
];
```

Regras de visibilidade:

```typescript
const canSee = (item: NavItem): boolean => {
  if (isAdmin) return true;            // ADMIN vê todos os itens
  if (!item.resourceKey) return true;  // itens sem resourceKey (ex: "Today") sempre visíveis
  return hasPermission(item.resourceKey);
};

const canSeeGroup = (item: NavItem): boolean => {
  if (!item.children) return canSee(item);
  return item.children.some(c => canSee(c)); // grupo visível se ao menos 1 filho for visível
};
```

---

## 5. Proteção de rotas (frontend)

### 5.1. Três camadas

```
Camada 1 — PrivateRoute    → usuário autenticado? (tem JWT válido)
Camada 2 — PermissionRoute → usuário tem o resource_key?
Camada 3 — AdminRoute      → usuário tem role ADMIN? (para /admin/*)
```

### 5.2. `PrivateRoute`

Arquivo: `frontend/src/router/PrivateRoute.tsx`

Redireciona para `/login` se não houver token JWT válido.

### 5.3. `PermissionRoute` e `AdminRoute`

Arquivo: `frontend/src/router/PermissionRoute.tsx`

```tsx
// PermissionRoute — verifica resource_key no authStore
export default function PermissionRoute({ resourceKey, redirectTo = "/" }) {
  const hasPermission = useAuthStore(s => s.hasPermission(resourceKey));
  if (!hasPermission) return <Navigate to={redirectTo} replace />;
  return <Outlet />;
}

// AdminRoute — verifica role ADMIN
export function AdminRoute({ redirectTo = "/" }) {
  const isAdmin = user?.roles?.includes("ADMIN") ?? false;
  if (!isAdmin) return <Navigate to={redirectTo} replace />;
  return <Outlet />;
}
```

### 5.4. Uso no `App.tsx`

```tsx
<Route element={<PrivateRoute />}>
  <Route element={<AppLayout />}>

    {/* Rota livre — qualquer usuário autenticado */}
    <Route path="/" element={<DashboardPage />} />

    {/* Rota com permissão específica */}
    <Route element={<PermissionRoute resourceKey="task.task" />}>
      <Route path="/tasks" element={<TaskPage />} />
    </Route>

    {/* Admin — dupla proteção: AdminRoute (role) + PermissionRoute (resource) */}
    <Route element={<AdminRoute />}>
      <Route path="/admin" element={<AdminPage />} />
      <Route element={<PermissionRoute resourceKey="admin.admin_user" />}>
        <Route path="/admin/users" element={<AdminUsersPage />} />
      </Route>
    </Route>

  </Route>
</Route>
```

**Comportamento:**

| Cenário | Resultado |
|---|---|
| Não autenticado digita qualquer URL protegida | Redirect → `/login` |
| Autenticado SEM `task.task` digita `/tasks` | Redirect → `/` (Dashboard) |
| Não-ADMIN digita `/admin/users` | Redirect → `/` |
| ADMIN digita qualquer URL | Acessa (bypass em `hasPermission`) |

---

## 6. Proteção de endpoints da API (backend)

Arquivo: `backend/app/auth/router.py` e demais routers

**Todos os endpoints protegidos** exigem Bearer Token:

```python
def get_current_user(credentials: HTTPAuthorizationCredentials) -> dict:
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload
```

**Endpoints administrativos** têm verificação adicional de role:

```python
def _is_admin(payload: dict) -> bool:
    return any(r.upper() == "ADMIN" for r in payload.get("roles", []))

@router.get("/admin/users")
def admin_users(current_user: Annotated[dict, Depends(get_current_user)]):
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin required")
    return get_users()
```

---

## 7. Mapeamento resource_key × Módulos

| Módulo (menu) | resource_key |
|---|---|
| Tasks | `task.task` |
| Forecast | `adoption.report_forecast` |
| Cisco LCI | `adoption.report_cisco_lci` |
| CSM Account (Adoption) | `adoption.report_csm_account` |
| Team Target | `adoption.report_team_target` |
| LCI Status | `adoption.report_lci_eligible_status` |
| Rebate | `adoption.report_rebate_and_opportunities` |
| Use Cases | `adoption.use_case` |
| Farol | `portfolio.farol` |
| Assets | `portfolio.asset` |
| Account Team | `portfolio.account_team` |
| Adoption Tasks | `portfolio.adoption_tasks` |
| Client Overview | `portfolio.client_overview` |
| Projects | `project.project` |
| CSM Account (Public) | `public.csm_account` |
| Importer | `public.importer` |
| Admin → Users | `admin.admin_user` |
| Admin → Companies | `admin.admin_company` |
| Admin → Roles | `admin.admin_auth_role` |
| Admin → Team Goals | `admin.admin_team_goal` |
| Admin → Tasks | `admin.admin_task` |

> Itens sem `resourceKey` (ex: "Today" no Dashboard) são sempre visíveis para qualquer usuário autenticado.

### 7.1. Sub-permissões (sem entrada própria no menu)

Além dos `resource_key` de página/módulo (que aparecem no menu com `show_in_menu = 1`), existem `resource_key` que controlam **funcionalidades internas** de uma página já acessível, e por isso têm `show_in_menu = 0` no banco — eles nunca aparecem no `Sidebar`, mas ainda são verificados via `hasPermission()` dentro do componente.

| Sub-permissão | Controla |
|---|---|
| `task.task_lci_viability` | Exibição da aba "LCI Viability" dentro do módulo Tasks (`/tasks`) |


---

## 8. Administração de roles e permissões

A página **Admin → Users** (`/admin/users`) permite:

- Buscar usuário por nome ou email
- Editar dados do usuário (nome, email, senha)
- Gerenciar roles: atribuir/remover via UI

A gestão granular de permissões em `tbAuthPermission` está disponível via API (todos exigem role `ADMIN`):

```
GET  /api/admin/users/{id}/roles                 → roles do usuário
POST /api/admin/users/{id}/roles/{role_id}        → atribuir role
DEL  /api/admin/users/{id}/roles/{role_id}        → remover role
GET  /api/admin/roles/{user_role_id}/permissions  → permissões do vínculo
POST /api/admin/permissions                        → adicionar permissão
PUT  /api/admin/permissions/{id}                   → atualizar ação
DEL  /api/admin/permissions/{id}                   → remover permissão
GET  /api/admin/actions                            → lista de ações disponíveis
GET  /api/admin/resources                          → lista de recursos disponíveis
```

---

## 9. Boas práticas para novos recursos

### Passo a passo:

**1. Banco de dados — inserir em `tbAuthResource`:**
```sql
INSERT INTO tbAuthResource (resource_key, resource_name, resource_icon, is_active, show_in_menu)
VALUES ('dominio.nome_recurso', 'Nome Amigável', 'icon_name', 1, 1);
```

**2. Conceder permissão ao usuário/role em `tbAuthPermission`:**
```sql
-- Encontrar user_role_id do vínculo usuário+role
SELECT user_role_id FROM tbAuthUserRole WHERE user_id = X AND role_id = Y;

-- Conceder permissão
INSERT INTO tbAuthPermission (user_role_id, resource_id, action_id)
SELECT ur.user_role_id, r.resource_id, a.action_id
FROM tbAuthUserRole ur
JOIN tbAuthResource r ON r.resource_key = 'dominio.nome_recurso'
JOIN tbAuthAction a ON a.action_key = 'view'  -- ou 'edit', 'full'
WHERE ur.user_role_id = <user_role_id>;
```

**3. Adicionar ao menu — `Sidebar.tsx`:**
```typescript
{ key: "meuModulo", label: "Meu Módulo", icon: <IconeAqui size={16} />,
  path: "/meu/modulo", resourceKey: "dominio.nome_recurso" }
```

**4. Registrar a rota — `App.tsx`:**
```tsx
<Route element={<PermissionRoute resourceKey="dominio.nome_recurso" />}>
  <Route path="/meu/modulo" element={<MeuModuloPage />} />
</Route>
```

**5. (Opcional) Proteção client-side adicional na página:**
```tsx
const canEdit = useAuthStore(s => s.hasPermission("dominio.nome_recurso"));
if (!canEdit) return <AccessDenied />;
```

**6. Proteger endpoints de escrita no backend:**
```python
@router.post("/meu/recurso")
def criar_recurso(current_user: Annotated[dict, Depends(get_current_user)]):
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin required")
    ...
```

---

## 10. Preferências do usuário

Além de autorização, o sistema persiste preferências do usuário em `tbUser`:

| Preferência | Coluna | Endpoint |
|---|---|---|
| Idioma | `user_language` (`pt-BR`, `en-US`, `es-ES`) | `PUT /api/auth/language` |
| Tema | `user_theme` (`dark`, `light`) | `PUT /api/auth/theme` |

Ambas são carregadas automaticamente no login e aplicadas no frontend. O tema é salvo sempre que o usuário troca via ícone ☀/🌙 no cabeçalho.
