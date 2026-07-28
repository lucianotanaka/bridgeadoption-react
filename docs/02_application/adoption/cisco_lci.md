# Módulo Cisco LCI — Adoption

> **Rota:** `/adoption/cisco-lci`  
> **resource_key:** `adoption.report_cisco_lci`  
> **Arquivo frontend:** `frontend/src/pages/adoption/CiscoLCIPage.tsx`

---

## 1. Propósito

Relatório do programa **Life Cycle Incentive (LCI)** da Cisco. Mostra o desempenho por estágio LCI com valores potenciais de incentivo e valores capturados, por ano fiscal NTT.

---

## 2. Componentes (frontend)

| Componente | Descrição |
|---|---|
| Seletor de ano fiscal | Filtro principal (FY2024, FY2025, FY2026…) |
| KPIs — Tarefas | Total de tarefas, Total de estágios |
| KPIs — Status | Aprovados, Aguardando, Em andamento, Perdidos |
| KPIs — Financeiros | Potencial total, Total capturado, Taxa de conversão |
| Tabela por estágio | Estágio LCI, status, cliente, valor potencial, valor capturado |
| Gráfico de status | Pizza ou barras de distribuição de status |

---

## 3. Endpoints da API

```
GET /api/adoption/cisco-lci?fiscal_year=FY2026
```

**Response:**
```json
{
  "fiscal_year": "FY2026",
  "summary": {
    "total_tasks": 45,
    "total_stages": 120,
    "approved": 38,
    "awaiting": 22,
    "ongoing": 41,
    "lost": 19,
    "potential_value": 580000.0,
    "captured_value": 320000.0,
    "conversion_rate": 55.2
  },
  "by_stage": [
    {
      "stage": "Onboard",
      "client": "Empresa XYZ",
      "csm": "João Silva",
      "status": "Aprovado",
      "potential": 15000.0,
      "captured": 15000.0
    }
  ]
}
```

---

## 4. Regras de negócio

### Estágios LCI (Cisco)
Os estágios são definidos pela Cisco e representam etapas do ciclo de vida do produto:
`Onboard → Implement → Use → Engage → Adopt → Expand → Renew`

### Status por estágio
| Status | Significado |
|---|---|
| Aprovado | Estágio concluído e aprovado pela Cisco |
| Aguardando | Submetido, aguardando aprovação |
| Em andamento | Tarefa em execução |
| Perdido | Não atingiu os critérios de saída do estágio |

### Taxa de conversão
```
taxa = (capturado / potencial) × 100
```

### Valor LCI
O valor de incentivo é definido por produto/estágio/trimestre pela Cisco. Esses valores são importados via job de importação e armazenados no banco.

---

## 5. Backend

**Arquivo:** `backend/app/adoption/extras_service.py`

Tabelas consultadas:
- `tbCiscoLCI` / views relacionadas — dados do LCI
- `tbTask` — tarefas vinculadas aos estágios LCI

---

## 6. Troubleshooting

| Problema | Causa | Solução |
|---|---|---|
| Valores zerados | Dados LCI não importados | Verificar job de importação Cisco LCI |
| Estágio não encontrado | Produto sem configuração LCI | Verificar configuração do produto no banco |
| Taxa de conversão incorreta | Potencial zerado | Verificar valores de incentivo cadastrados |
