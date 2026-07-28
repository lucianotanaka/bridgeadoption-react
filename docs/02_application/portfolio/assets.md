# Módulo Assets — Portfolio

> **Rota:** `/portfolio/asset`  
> **resource_key:** `portfolio.asset`  
> **Arquivo frontend:** `frontend/src/pages/portfolio/AssetPage.tsx`

---

## 1. Propósito

Portfólio de ativos (produtos e licenças Cisco) de cada cliente. Permite visualizar quais produtos o cliente possui, quantidades, validade e status de adoção.

---

## 2. Componentes

- Seletor de cliente
- Tabela: produto, quantidade, tipo de licença, data de início/fim, status
- Filtros: categoria, status, produto

---

## 3. Endpoints

```
GET /api/portfolio/assets?client_id=XXX
```

---

## 4. Backend

**Arquivo:** `backend/app/modules/sections_service.py`
