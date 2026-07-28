# Módulo CSM Account — Adoption

> **Rota:** `/adoption/csm-account`  
> **resource_key:** `adoption.report_csm_account`  
> **Arquivo frontend:** `frontend/src/pages/adoption/CsmAccountPage.tsx`

---

## 1. Propósito

Visão do portfólio de contas por CSM — mostra quais clientes cada CSM é responsável, com tipo de atendimento, AM, EA e dados de contrato.

> **Nota:** Existe também uma versão pública em `/public/csm-account` com menos colunas e sem dados sensíveis.

---

## 2. Componentes (frontend)

- Filtros multiselect em cascata: CSM → Cliente → AM → EA → Type
- Tabela com ordenação por coluna (click no cabeçalho)
- Paginação com seletor de linhas por página (15/25/50/100)
- Ícone `×` discreto "Clear all filters" (aparece apenas quando há filtros ativos)

---

## 3. Regras de negócio — Tipos de atendimento (TYPE)

| Valor no banco | Exibição | Cor | Significado |
|---|---|---|---|
| HIGH TOUCH | HIGH TOUCH | 🔴 Vermelho + negrito | Máxima atenção — conta estratégica |
| SCALE TOUCH | SCALE TOUCH | 🟡 Amarelo | Atenção moderada |
| DIGITAL TOUCH | DIGITAL TOUCH | 🔵 Azul | Atendimento digital |
| CUSTOMER | CUSTOMER | 🟢 Verde | Cliente padrão |

### Campo EA (Enterprise Agreement)
| Valor no banco | Exibido na interface |
|---|---|
| `Y` | **Yes** |
| `N` | **No** |

O filtro EA usa os valores reais do banco (`Y`/`N`) internamente.

---

## 4. Endpoints da API

```
GET /api/adoption/csm-account
```

**Response (array):**
```json
[
  {
    "CSM": "João Silva",
    "CLIENT": "Empresa XYZ",
    "AM": "Maria Santos",
    "EA": "Y",
    "TYPE": "HIGH TOUCH"
  }
]
```

---

## 5. Backend

**Arquivo:** `backend/app/adoption/csm_account_service.py`

---

## 6. Troubleshooting

| Problema | Causa | Solução |
|---|---|---|
| TYPE sem cor | Valor não reconhecido | Verificar valores na tabela de origem |
| Filtro EA não funciona | Valores diferentes de Y/N | Normalizar no banco |
| Cliente sem CSM | Dados de vínculo ausentes | Verificar tabela de account assignment |
