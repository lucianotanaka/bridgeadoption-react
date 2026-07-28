# Módulo Account Team — Portfolio

> **Rota:** `/portfolio/account-team`  
> **resource_key:** `portfolio.account_team`  
> **Arquivo frontend:** `frontend/src/pages/portfolio/AccountTeamPage.tsx`

---

## 1. Propósito

Exibe os membros da equipe de conta de cada cliente — todos os profissionais NTT Data envolvidos na relação com o cliente (CSM, AM, SE, gerentes, etc.).

---

## 2. Componentes

- Seletor de cliente
- Cards dos membros: nome, cargo, e-mail, telefone
- Filtro por função/cargo

---

## 3. Endpoints

```
GET /api/portfolio/account-team?client_id=XXX
