# API — Endpoints de Autenticação

> **Última atualização:** 2026-07  
> **Arquivo:** `backend/app/auth/router.py`  
> **Prefixo:** `/api/auth`

---

## Autenticação

Todos os endpoints (exceto `/login`) exigem **Bearer Token JWT** no header:

```
Authorization: Bearer <access_token>
```

O token é obtido via `POST /api/auth/login` e expira em **8 horas**.

---

## POST /api/auth/login

Autentica o usuário e retorna token JWT + permissões + preferências.

### Request

```json
{
  "email": "usuario@nttdata.com",
  "password": "senha123"
}
```

### Response 200

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user_id": 42,
  "user_name": "João Silva",
  "roles": ["TASK", "ADOPTION"],
  "permissions": {
    "TASK": {
      "Tarefas": {
        "resource_key": "task.task",
        "resource_icon": "check_square",
        "action": "full",
        "is_active": 1,
        "show_in_menu": 1
      }
    }
  },
  "language": "pt-BR",
  "theme": "dark",
  "require_password_change": false
}
```

### Response 401

```json
{ "detail": "Invalid credentials" }
```

### Notas
- Suporta senhas com hash **bcrypt** e legado **SHA256** (migração automática para bcrypt)
- Usuários com role `ADMIN` recebem **todos os recursos ativos** em `permissions`
- O campo `language` retorna no formato `pt-BR`, `en-US` ou `es-ES` (frontend converte para `pt`, `en`, `es`)

---

## GET /api/auth/me

Retorna dados do usuário atual com permissões atualizadas do banco.

### Response 200

```json
{
  "user_id": 42,
  "user_name": "João Silva",
  "roles": ["TASK", "ADOPTION"],
  "permissions": { ... },
  "language": "pt-BR"
}
```

### Response 401

```json
{ "detail": "Invalid or expired token" }
```

---

## POST /api/auth/logout

Logout stateless — o cliente deve descartar o token.

### Response 200

```json
{ "message": "Logged out successfully" }
```

### Notas
- Como o JWT é stateless, o logout é apenas uma confirmação
- O cliente (frontend) apaga o token do `authStore` e redireciona para `/login`

---

## PUT /api/auth/language

Salva o idioma preferido do usuário em `tbUser.user_language`.

### Request

```json
{ "language": "pt" }
```

Aceita tanto códigos curtos (`pt`, `en`, `es`) quanto completos (`pt-BR`, `en-US`, `es-ES`).

### Response 200

```json
{ "message": "Language updated to pt" }
```

### Response 400

```json
{ "detail": "Invalid language: xx. Allowed: pt, en, es (or pt-BR, en-US, es-ES)" }
```

---

## PUT /api/auth/theme

Salva o tema preferido do usuário em `tbUser.user_theme`.

### Request

```json
{ "theme": "dark" }
```

Valores aceitos: `"dark"` ou `"light"`.

### Response 200

```json
{ "message": "Theme updated to dark" }
```

### Response 400

```json
{ "detail": "Invalid theme: xxx. Allowed: dark, light" }
```

---

## JWT — Estrutura do token

```json
{
  "sub": "42",               // user_id como string
  "user_name": "João Silva",
  "roles": ["TASK", "ADOPTION"],
  "language": "pt-BR",
  "exp": 1753286400          // timestamp de expiração (8h)
}
```

---

## Códigos de erro

| Código | Significado |
|---|---|
| `400` | Request inválida (language/theme inválidos) |
| `401` | Não autenticado (sem token ou token expirado/inválido) |
| `403` | Sem permissão (recurso requer role ADMIN) |
| `500` | Erro interno do servidor |
