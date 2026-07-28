# Módulo Adoption — Bridge Adoption React

> **Última atualização:** 2026-07  
> **Grupo:** Adoption (menu lateral)  
> **Audiência:** Desenvolvimento e sustentação

---

## 1. Visão geral

O grupo Adoption reúne os relatórios e ferramentas de rastreamento de adoção tecnológica. São módulos de consulta (read-only) que exibem dados agregados do banco para análise pelo time de CSMs.

---

## 2. Sub-módulos

| Módulo | Rota | resource_key | Arquivo |
|---|---|---|---|
| Forecast | `/adoption/forecast` | `adoption.report_forecast` | `ForecastPage.tsx` |
| Cisco LCI | `/adoption/cisco-lci` | `adoption.report_cisco_lci` | `CiscoLCIPage.tsx` |
| CSM Account | `/adoption/csm-account` | `adoption.report_csm_account` | `CsmAccountPage.tsx` |
| Team Target | `/adoption/team-target` | `adoption.report_team_target` | `TeamTargetPage.tsx` |
| LCI Status | `/adoption/lci-status` | `adoption.report_lci_eligible_status` | `LCIStatusPage.tsx` |
| LCI Solution vs Project | `/adoption/lci-solution-vs-project` | `adoption.report_lci_eligible_status` | `LCISolutionVsProjectPage.tsx` |
| Rebate | `/adoption/rebate` | `adoption.report_rebate_and_opportunities` | `RebatePage.tsx` |
| Use Cases | `/adoption/use-cases` | `adoption.use_case` | `UseCasesPage.tsx` |

---

## 3. Forecast (`adoption.report_forecast`)

### Propósito
Previsão de atividades de adoção por CSM e cliente, comparando backlog vs realizado no ano fiscal NTT.

### Componentes
- Seletor de ano fiscal NTT
- Gráficos de barras: backlog × realizado × meta
- Tabela detalhada por cliente com taxa de conversão
- Filtros: CSM, período

### Endpoints
- `GET /api/adoption/forecast?fiscal_year=XXXX`

### Regras de negócio
- Ano fiscal NTT começa em abril (APR)
- Taxa de conversão = (realizadas / backlog) × 100
- Metas definidas em `tbAdoptionTeamGoal`

---

## 4. Cisco LCI (`adoption.report_cisco_lci`)

### Propósito
Relatório do programa Life Cycle Incentive da Cisco. Mostra desempenho por estágio LCI com valores potenciais e capturados.

### Componentes
- Seletor de ano fiscal
- KPIs: Total de tarefas, Total de estágios, Aprovados, Aguardando, Em andamento, Perdidos
- KPIs financeiros: Potencial total, Total capturado, Taxa de conversão
- Tabela por estágio LCI com status e valores
- Gráficos de funil/pizza

### Endpoints
- `GET /api/adoption/cisco-lci?fiscal_year=XXXX`

### Regras de negócio
- Estágios LCI: definidos pela Cisco (ex: Onboard, Implement, Use, Engage, Adopt, Expand, Renew)
- Cada estágio tem um valor de incentivo potencial
- Status por estágio: Aprovado, Aguardando aprovação, Em andamento, Perdido

---

## 5. CSM Account (`adoption.report_csm_account`)

### Propósito
Visão do portfólio de contas por CSM — mostra quais clientes cada CSM é responsável, com dados de AM, EA e tipo de atendimento.

### Componentes
- Filtros multiselect: CSM, Cliente, AM, EA (Yes/No), Type
- Botão "Limpar filtros" (aparece apenas quando há filtros ativos)
- Tabela com ordenação por coluna (click no cabeçalho)
- Paginação com seletor de linhas por página

### Endpoints
- `GET /api/adoption/csm-account`

### Regras de negócio — Tipos de atendimento (TYPE)

| Tipo | Cor | Significado |
|---|---|---|
| HIGH TOUCH | 🔴 Vermelho + negrito | Máxima atenção — conta estratégica |
| SCALE TOUCH | 🟡 Amarelo | Atenção moderada |
| DIGITAL TOUCH | 🔵 Azul | Atendimento digital |
| CUSTOMER | 🟢 Verde | Cliente padrão |

### Regras de negócio — Campo EA

O campo EA armazena `Y` (sim) ou `N` (não) no banco. Na interface:
- `Y` → exibido como **"Yes"**
- `N` → exibido como **"No"**
- O filtro usa os valores do banco (`Y`/`N`) internamente

---

## 6. Team Target (`adoption.report_team_target`)

### Propósito
Metas de adoção da equipe vs realizado — painel de acompanhamento de objetivos por período.

### Endpoints
- `GET /api/adoption/team-target`

---

## 7. LCI Status (`adoption.report_lci_eligible_status`)

### Propósito
Status de elegibilidade LCI por cliente e solução. Inclui duas visões:
1. **Eligible Status** — quais clientes/soluções são elegíveis para LCI
2. **Solution vs Project** — análise de soluções associadas a projetos LCI

### Componentes
- Abas: "Eligible Status" e "Solution vs Project"
- Tabelas com filtros e paginação

### Endpoints
- `GET /api/adoption/lci-status`
- `GET /api/adoption/lci-solution-vs-project`

---

## 8. Rebate (`adoption.report_rebate_and_opportunities`)

### Propósito
Rastreamento de incentivos Cisco SIP/LCI — mostra oportunidades de rebate, aprovações e pipeline.

### Componentes
- KPIs: LCI Aprovados, LCI Jornada, Tarefas de Incentivo, Oportunidades SIP, Cisco EA
- Gráficos de status
- Tabelas detalhadas por oportunidade

### Endpoints
- `GET /api/adoption/rebate`

---

## 9. Use Cases (`adoption.use_case`)

### Propósito
Gerenciamento dos casos de uso aplicáveis por cliente — mostra aplicabilidade e critérios de saída.

### Componentes
- Lista de casos de uso por cliente
- Indicadores de aplicabilidade e status de critérios de saída
- Filtros por cliente, solução, status

### Endpoints
- `GET /api/adoption/use-cases`

---

## 10. Padrão de filtros multiselect

Os módulos de Adoption usam um componente `MultiSelect` reutilizável com as seguintes características:
- Dropdown com busca interna
- Múltiplas seleções com tags coloridas
- Botão "Clear all filters" aparece apenas quando há filtros ativos
- Filtros em cascata (ex: selecionar CSM restringe opções de Cliente)

---

## 11. Endpoints backend (`backend/app/adoption/`)

```
backend/app/adoption/
├── extras_router.py       → Roteamento dos endpoints de adoption
├── extras_service.py      → Lógica de negócio e queries MySQL
├── csm_account_service.py → Service específico para CSM Account
└── ...
```

---

## 12. Troubleshooting

| Problema | Causa | Solução |
|---|---|---|
| Gráficos vazios | Sem dados para o período selecionado | Verificar dados no banco para o ano fiscal |
| Filtros não funcionam | Estado desincronizado | Recarregar a página |
| Valores LCI incorretos | Dados desatualizados no banco | Verificar job de importação LCI |
| Tipo de atendimento sem cor | TYPE não reconhecido | Verificar valores em tbCSMAccount |
