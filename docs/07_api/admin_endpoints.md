# API — Endpoints de Administração

> **Última atualização:** 2026-07  
> **Prefixo:** `/api/admin`  
> **Requisito:** Role `ADMIN` obrigatória em todos os endpoints

---

## Controle de acesso

Todos os endpoints de admin verificam se o usuário possui role `ADMIN`:

```python
if not _is_admin(current_user):
    raise HTTPException(status_code=403, detail="Admin required")
```

---

## Usuários

### GET /api/admin/users

Busca usuários por nome ou email.

**Query params:**
- `name` (opcional) — filtrar por nome (LIKE)
- `email` (opcional) — filtrar por email (LIKE)

**Response 200:**
```json
[
  {
    "user_id": 42,
    "user_name": "João Silva",
    "user_email": "joao@nttdata.com",
    "user_language": "pt-BR",
    "user_theme": "dark",
    "user_change_passwd": 0
  }
]
```

---

### PUT /api/admin/users/{user_id}

Atualiza dados do usuário (nome, email, senha, idioma).

**Request:**
```json
{
  "user_name": "João Silva",
  "user_email": "joao@nttdata.com",
  "new_password": "nova_senha",   // opcional — vazio = não altera
  "user_language": "pt-BR"
}
```

---

## Roles

### GET /api/admin/roles

Lista todas as roles ativas.

**Response 200:**
```json
[
  { "role_id": 1, "role_name": "ADMIN", "role_description": "Administrador" },
  { "role_id": 2, "role_name": "TASK", "role_description": "Acesso a tarefas" },
  { "role_id": 3, "role_name": "ADOPTION", "role_description": "Relatórios de adoção" }
]
```

---

### GET /api/admin/users/{user_id}/roles

Lista as roles atribuídas a um usuário.

**Response 200:**
```json
[
  {
    "user_role_id": 15,
    "role_id": 2,
    "role_name": "TASK"
  }
]
```

---

### POST /api/admin/users/{user_id}/roles/{role_id}

Atribui uma role ao usuário (cria vínculo em `tbAuthUserRole`).

**Response 200:**
```json
{ "message": "Role TASK assigned to user 42" }
```

**Response 400:**
```json
{ "detail": "User already has this role" }
```

---

### DELETE /api/admin/users/{user_id}/roles/{role_id}

Remove a role do usuário (remove de `tbAuthUserRole` e permissões associadas).

**Response 200:**
```json
{ "message": "Role removed from user" }
```

---

## Permissões

### GET /api/admin/roles/{user_role_id}/permissions

Lista as permissões de um vínculo usuário+role específico.

**Response 200:**
```json
[
  {
    "permission_id": 100,
    "resource_id": 5,
    "resource_key": "task.task",
    "resource_name": "Tarefas",
    "action_id": 4,
    "action_key": "full"
  }
]
```

---

### POST /api/admin/permissions

Adiciona uma permissão a um vínculo usuário+role.

**Request:**
```json
{
  "user_role_id": 15,
  "resource_id": 5,
  "action_id": 4
}
```

**Response 200:**
```json
{ "message": "Permission added", "permission_id": 101 }
```

---

### PUT /api/admin/permissions/{permission_id}

Atualiza a ação de uma permissão existente.

**Request:**
```json
{ "action_id": 3 }
```

---

### DELETE /api/admin/permissions/{permission_id}

Remove uma permissão (ou define `action_id = 1` para deny).

**Response 200:**
```json
{ "message": "Permission removed" }
```

---

## Recursos e Ações

### GET /api/admin/resources

Lista todos os recursos ativos em `tbAuthResource`.

**Response 200:**
```json
[
  {
    "resource_id": 5,
    "resource_key": "task.task",
    "resource_name": "Tarefas",
    "resource_icon": "check_square",
    "is_active": 1,
    "show_in_menu": 1
  }
]
```

---

### GET /api/admin/actions

Lista todas as ações disponíveis em `tbAuthAction`.

**Response 200:**
```json
[
  { "action_id": 1, "action_key": "deny", "action_name": "Negar" },
  { "action_id": 2, "action_key": "view", "action_name": "Visualizar" },
  { "action_id": 3, "action_key": "edit", "action_name": "Editar" },
  { "action_id": 4, "action_key": "full", "action_name": "Acesso Total" }
]
```

---

## Empresas

### GET /api/admin/companies

Lista empresas/clientes cadastrados.

**Query params:**
- `search` (opcional) — busca por nome

---

### POST /api/admin/companies

Cadastra nova empresa.

---

### PUT /api/admin/companies/{company_id}

Atualiza dados de uma empresa.

---

### DELETE /api/admin/companies/{company_id}

Remove uma empresa.
