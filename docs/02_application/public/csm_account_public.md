# Módulo CSM Account — Public

> **Rota:** `/public/csm-account`  
> **resource_key:** `public.csm_account`  
> **Arquivo frontend:** `frontend/src/pages/public/PublicCsmAccountPage.tsx`

---

## 1. Propósito

Versão simplificada da visão de contas CSM — exibe o portfólio de clientes por CSM sem dados sensíveis (sem colunas financeiras). Destinada a usuários com acesso mais restrito ou visão de consulta rápida.

---

## 2. Diferenças em relação ao CSM Account do grupo Adoption

| Aspecto | Adoption CSM Account | Public CSM Account |
|---|---|---|
| Colunas | Mais colunas (incluindo dados contratuais) | Simplificado: CSM, Cliente, AM, EA, Type |
| Botão Refresh | Sim | Não — carregamento automático |
| Filtros | Multiselect | Multiselect |
| Dados sensíveis | Pode incluir | Não inclui |

---

## 3. Componentes

- Filtros multiselect em cascata: CSM → Cliente → AM → EA → Type
- Filtro EA: exibe "Yes"/"No" (banco armazena "Y"/"N")
- Ordenação por coluna (click no cabeçalho: ASC → DESC → original)
- Paginação com seletor (15/25/50/100 por página)
- `<span>` "Clear all filters" — aparece apenas quando há filtros ativos

---

## 4. Regras de negócio — Tipos de atendimento

| Valor | Cor |
|---|---|
| HIGH TOUCH | 🔴 Vermelho + negrito |
| SCALE TOUCH | 🟡 Amarelo |
| DIGITAL TOUCH | 🔵 Azul |
| CUSTOMER | 🟢 Verde |

---

## 5. Endpoint

```
GET /api/public/csm-account
```

---

## 6. Backend

**Arquivo:** `backend/app/modules/public_service.py`
