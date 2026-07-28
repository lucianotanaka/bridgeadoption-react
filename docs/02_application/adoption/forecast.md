# Módulo Forecast — Adoption

> **Última atualização:** 2026-07  
> **Rota:** `/adoption/forecast`  
> **resource_key:** `adoption.report_forecast`  
> **Arquivo frontend:** `frontend/src/pages/adoption/ForecastPage.tsx`  
> **Audiência:** Desenvolvimento e sustentação

---

## 1. Propósito

Previsão de atividades de adoção por CSM e cliente, comparando backlog planejado vs atividades realizadas no ano fiscal NTT. Permite ao gestor identificar gaps de desempenho e projetar o atingimento das metas.

---

## 2. Componentes (frontend)

| Componente | Descrição |
|---|---|
| Seletor de ano fiscal NTT | Filtro principal — define o período exibido |
| Filtro por CSM | Restringe a visão a um CSM específico |
| KPIs (cards) | Backlog total, Realizadas, Taxa de conversão |
| Gráfico de barras | Backlog × Realizadas × Meta por mês/trimestre |
| Tabela detalhada | Por cliente: backlog, realizadas, meta, % atingimento |

---

## 3. Endpoints da API

```
GET /api/adoption/forecast?fiscal_year=FY2026
GET /api/adoption/forecast?fiscal_year=FY2026&csm=joao.silva
```

**Response:**
```json
{
  "fiscal_year": "FY2026",
  "summary": {
    "backlog": 150,
    "achieved": 98,
    "target": 120,
    "conversion_rate": 65.3
  },
  "by_month": [
    { "month": "APR", "backlog": 20, "achieved": 15, "target": 18 }
  ],
  "by_client": [
    {
      "client": "Empresa XYZ",
      "csm": "João Silva",
      "backlog": 12,
      "achieved": 8,
      "target": 10,
      "pct": 80.0
    }
  ]
}
```

---

## 4. Regras de negócio

### Ano fiscal NTT
- Começa em **abril** (APR) e termina em **março** do ano seguinte
- Exemplo: FY2026 = APR/2025 → MAR/2026
- Seletor exibe opções: FY2024, FY2025, FY2026, etc.

### Taxa de conversão
```
taxa_conversao = (realizadas / backlog) × 100
```

### Metas
- Definidas em `tbAdoptionTeamGoal` por período e CSM
- Usadas para calcular % de atingimento na tabela e gráfico

### Filtros
- Sem filtro de CSM: exibe todos os CSMs agregados
- Com filtro de CSM: exibe apenas as contas do CSM selecionado

---

## 5. Backend

**Arquivo:** `backend/app/adoption/extras_service.py`  
**Roteador:** `backend/app/adoption/extras_router.py`

A query consulta as tabelas:
- `tbTask` / `tbTaskActivity` — atividades realizadas
- `tbAdoptionTeamGoal` — metas definidas
- `tbUser` — dados dos CSMs

---

## 6. Permissão

```sql
-- Verificar se resource existe
SELECT * FROM tbAuthResource WHERE resource_key = 'adoption.report_forecast';

-- Conceder acesso (substituir user_id)
INSERT INTO tbAuthPermission (user_role_id, resource_id, action_id)
SELECT ur.user_role_id, r.resource_id, 2  -- action_id=2 = view
FROM tbAuthUserRole ur
JOIN tbAuthResource r ON r.resource_key = 'adoption.report_forecast'
WHERE ur.user_id = <user_id>;
```

---

## 7. Troubleshooting

| Problema | Causa | Solução |
|---|---|---|
| Gráfico vazio | Sem dados para o ano fiscal selecionado | Verificar dados em tbTaskActivity |
| Taxa de conversão 0% | Backlog zerado no período | Verificar importação de backlog |
| Metas não aparecem | tbAdoptionTeamGoal sem dados | Cadastrar metas no Admin → Team Goals |
| CSM não listado no filtro | Sem tarefas no período | Normal — verifique se o período está correto |
