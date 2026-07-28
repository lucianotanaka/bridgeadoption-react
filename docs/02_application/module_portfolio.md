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

### Propósito
Semáforo visual de saúde dos clientes — indica de forma rápida quais clientes estão em situação crítica, de atenção ou saudável.

### Componentes
- Grid de cards por cliente com indicador colorido (verde/amarelo/vermelho)
- Filtros por CSM, status, período
- Drill-down ao clicar em um cliente

### Regras de negócio — Cores do semáforo

| Cor | Significado |
|---|---|
| 🟢 Verde | Cliente saudável — adoção em dia |
| 🟡 Amarelo | Atenção — há pontos de melhoria |
| 🔴 Vermelho | Crítico — intervenção necessária |

### Endpoints
- `GET /api/portfolio/farol`

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
| Farol sem dados | Sem registros de saúde no banco | Verificar job de atualização do Farol |
| Client Overview vazio | Cliente selecionado sem dados EA/SA | Verificar importação Cisco EA/SA para o cliente |
| Equipe de conta incompleta | Dados desatualizados | Verificar tabela de account team no banco |
| True Forward não aparece | Sem dados de overage | Normal se o cliente está dentro do contrato |
