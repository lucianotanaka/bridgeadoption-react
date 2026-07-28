# Módulo Client Overview — Portfolio

> **Rota:** `/portfolio/client-overview`  
> **resource_key:** `portfolio.client_overview`  
> **Arquivo frontend:** `frontend/src/pages/portfolio/ClientOverviewPage.tsx`

---

## 1. Propósito

Visão consolidada 360° de um cliente específico, integrando dados de contratos Cisco EA (Enterprise Agreement), Cisco SA (Smart Account) e True Forward — tudo em um único painel por cliente.

---

## 2. Componentes (frontend)

| Seção | Conteúdo |
|---|---|
| Seletor de cliente | Dropdown com busca — seleciona o cliente a analisar |
| Cisco EA License Usage | Gráficos e tabelas de consumo de licenças por produto |
| Cisco Smart Account | Inventário de licenças ativas no Smart Account |
| Cisco True Forward | Análise de overage (consumo além do contrato) |

---

## 3. Regras de negócio

### Cisco EA (Enterprise Agreement)
- Contrato único que abrange múltiplos produtos Cisco
- Exibe: produto, quantidade contratada, quantidade consumida, % de utilização
- Dados importados via job Cisco EA (importador)

### Cisco SA (Smart Account)
- Repositório central de todas as licenças Cisco do cliente
- Exibe: licenças ativas, expiradas, disponíveis
- Dados importados via Cisco API ou relatório CSSM

### True Forward
- Quando o consumo excede o contrato EA, a Cisco cobra a diferença (**overage**)
- O módulo identifica e sinaliza os produtos em overage
- Crítico para renovação e gestão de contratos

---

## 4. Endpoints

```
GET /api/portfolio/client-overview?client_id=XXX
GET /api/portfolio/cisco-ea?client_id=XXX
GET /api/portfolio/cisco-sa?client_id=XXX
GET /api/portfolio/true-forward?client_id=XXX
```

---

## 5. Backend

**Arquivo:** `backend/app/modules/sections_service.py`

Tabelas: `tbCiscoEA`, `tbCiscoSA`, `tbCiscoTrueForward`

---

## 6. Troubleshooting

| Problema | Causa | Solução |
|---|---|---|
| Overview vazio | Cliente sem dados importados | Verificar importação EA/SA para o cliente |
| True Forward não aparece | Sem overage | Normal — cliente está dentro do contrato |
| Consumo desatualizado | Job de importação não executou | Verificar cron dos importadores Cisco |
