# Módulo Portfolio — Bridge Adoption React

> **Última atualização:** 2026-07  
> **Grupo:** Portfolio (menu lateral)  
> **Audiência:** Desenvolvimento e sustentação

---

## 1. Visão geral

O grupo Portfolio reúne as visões centradas no cliente — saúde do portfólio, ativos, equipes e overview completo por cliente. São módulos de análise que permitem ao time entender a situação atual de cada conta.

---

## 2. Sub-módulos

| Módulo | Rota | resource_key | Arquivo |
|---|---|---|---|
| Farol | `/portfolio/farol` | `portfolio.farol` | `FarolPage.tsx` |
| Assets | `/portfolio/asset` | `portfolio.asset` | `AssetPage.tsx` |
| Account Team | `/portfolio/account-team` | `portfolio.account_team` | `AccountTeamPage.tsx` |
| Adoption Tasks | `/portfolio/adoption-tasks` | `portfolio.adoption_tasks` | `AdoptionTasksPage.tsx` |
| Client Overview | `/portfolio/client-overview` | `portfolio.client_overview` | `ClientOverviewPage.tsx` |

---

## 3. Farol (`portfolio.farol`)

> **Status:** ✅ Migrado para React — 2026-08-18  
> **Documentação detalhada:** `docs/02_application/portfolio/farol.md`  
> **API:** `docs/07_api/farol_endpoints.md`

### Propósito
Painel de status de cobertura contratual de soluções por cliente (*Traffic Light — Client Health Status*).

Exibe um grid visual por **Architecture × Solution** com emoji de semáforo em cada célula, indicando o estado de cobertura de cada solução. Suporta Vendor CISCO (vendor_id=1); FORTINET e PALO ALTO preparados para ativação.

### Componentes
- Filtro de **Vendor** (`<select>`, padrão CISCO)
- Filtro de **Cliente** (searchable dropdown, carregado via API)
- Botão **Generate Farol** (dispara query de dados)
- **Grid Architecture × Solution** — até 5 solutions por linha, rowSpan por architecture
- **Legenda** de status acima do grid
- **Export CSV** e botão de **Refresh**

### Status do Semáforo

| Emoji | Status (DB) | Significado |
|---|---|---|
| 🟢 | `green` | Active — cobertura ativa |
| 🟡 | `yellow` | Signed – Pending Activation |
| 🔴 | `red` | Expired or Never Covered |
| ⚪ | `gray` / `null` | Non-Existent or Other Partner |

### Endpoints
- `GET /api/portfolio/farol/clients?vendor_id={id}` — lista de clientes por vendor
- `GET /api/portfolio/farol?vendor_id={id}&customer_id={id}` — dados do Farol

---

## 4. Assets (`portfolio.asset`)

### Propósito
Portfólio de ativos (produtos/licenças) de cada cliente. Permite visualizar quais produtos o cliente possui e seu status de adoção.

### Componentes
- Seletor de cliente
- Tabela de ativos com: produto, quantidade, tipo, validade, status de uso
- Filtros por categoria de produto, status

### Endpoints
- `GET /api/portfolio/assets?client_id=XXX`

---

## 5. Account Team (`portfolio.account_team`)

### Propósito
Membros da equipe de conta de cada cliente — mostra todos os profissionais envolvidos (CSM, AM, SE, etc.).

### Componentes
- Seletor de cliente
- Cards de membros da equipe com nome, cargo e contato
- Filtro por empresa/cliente

### Endpoints
- `GET /api/portfolio/account-team?client_id=XXX`

---

## 6. Adoption Tasks (`portfolio.adoption_tasks`)

### Propósito
Visão das tarefas de adoção tecnológica filtradas por cliente — permite ao time ver o estado das tarefas de um cliente específico.

### Componentes
- Filtros: cliente, CSM, status, prioridade
- Tabela de tarefas com paginação
- Acesso rápido ao detalhe da tarefa

### Endpoints
- `GET /api/portfolio/adoption-tasks?client_id=XXX`

---

## 7. Client Overview (`portfolio.client_overview`)

### Propósito
Visão consolidada 360° de um cliente específico, integrando dados de:
- **Cisco EA** (Enterprise Agreement) — uso de licenças
- **Cisco SA** (Smart Account) — inventário de ativos
- **True Forward** — consumo além do contrato

### Componentes
- Seletor de cliente (dropdown com busca)
- Três abas/seções principais:
  1. **Cisco EA License Usage** — gráficos e tabelas de consumo por produto
  2. **Cisco Smart Account** — inventário de licenças ativas
  3. **Cisco True Forward** — análise de overage
- Gráficos interativos (Plotly)

### Endpoints
- `GET /api/portfolio/client-overview?client_id=XXX`
- `GET /api/portfolio/cisco-ea?client_id=XXX`
- `GET /api/portfolio/cisco-sa?client_id=XXX`

### Regras de negócio
- **True Forward:** quando o consumo excede o contrato, a Cisco cobra a diferença (overage). O módulo sinaliza esses casos.
- Os dados são importados via jobs automáticos (importadores Cisco EA/SA)

---

## 8. Backend (`backend/app/modules/`)

```
backend/app/modules/
├── public_router.py     → Endpoints /api/public/*
├── public_service.py    → Queries para módulos públicos
├── sections_router.py   → Endpoints de seções (portfolio, etc.)
└── sections_service.py  → Queries para portfolio e visões de cliente
```

---

## 9. Troubleshooting

| Problema | Causa | Solução |
|---|---|---|
| Farol — lista de clientes vazia | Sem registros em `tbClientFarol` para o vendor | Verificar tabela `tbClientFarol` no banco |
| Farol — grid vazio após Generate | Sem registros em `tbFarol` para o cliente | Executar job de importação do Farol |
| Farol — status ⚪ em todas as células | Coluna `status` com valores inesperados | Verificar valores em `tbFarol.status` (esperado: `green`, `yellow`, `red`, `gray`) |
| Client Overview vazio | Cliente selecionado sem dados EA/SA | Verificar importação Cisco EA/SA para o cliente |
| Equipe de conta incompleta | Dados desatualizados | Verificar tabela de account team no banco |
| True Forward não aparece | Sem dados de overage | Normal se o cliente está dentro do contrato |
