# Módulo Rebate & Oportunidades — Adoption

> **Rota:** `/adoption/rebate`  
> **resource_key:** `adoption.report_rebate_and_opportunities`  
> **Arquivo frontend:** `frontend/src/pages/adoption/RebatePage.tsx`

---

## 1. Propósito

Rastreamento dos incentivos financeiros Cisco — programa SIP (Solution Incentive Program) e LCI. Exibe oportunidades de rebate, aprovações, pipeline e tarefas com incentivo.

---

## 2. Componentes (frontend)

| Seção | KPIs exibidos |
|---|---|
| LCI Aprovados | Valor total aprovado no período |
| LCI Jornada | Valor em jornada (em andamento) |
| Tarefas de Incentivo | Qtd de tarefas com incentivo ativo |
| Oportunidades SIP | Total de oportunidades SIP abertas |
| Cisco EA | Dados de oportunidades no EA |

Tabelas detalhadas:
- EA Gerado, SIP Em Progresso, SIP Aprovados
- LCI Tarefas (Concluídas / Em Andamento / Em Análise)
- LCI Aprovado e LCI Backlog

---

## 3. Endpoint

```
GET /api/adoption/rebate?fiscal_year=FY2026
```

---

## 4. Regras de negócio

### SIP (Solution Incentive Program)
- Programa Cisco de incentivo por solução vendida
- Status: Em Progresso → Aprovado

### LCI (Life Cycle Incentive)
- Incentivo por atividades de adoção completadas
- Aprovação depende de critérios de saída do estágio

### Cisco EA
- Oportunidades geradas a partir de contratos Enterprise Agreement
- Podem ser qualificadas para SIP ou LCI

---

## 5. Troubleshooting

| Problema | Causa | Solução |
|---|---|---|
| KPIs zerados | Dados não importados | Verificar jobs de importação Cisco EA/SIP |
| Oportunidades desatualizadas | Cache antigo | Verificar data da última importação |
