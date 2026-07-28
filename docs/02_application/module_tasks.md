# Módulo Tasks — Bridge Adoption React

> **Última atualização:** 2026-07  
> **Rota:** `/tasks`  
> **resource_key:** `task.task`  
> **Audiência:** Desenvolvimento e sustentação

---

## 1. Visão geral

O módulo Tasks é o coração operacional do Bridge Adoption. Permite que os CSMs gerenciem as tarefas de adoção tecnológica de seus clientes Cisco, com visões de follow-up, rastreamento de viabilidade LCI, filtros avançados e painéis de monitoramento.

---

## 2. Componentes (frontend)

```
frontend/src/pages/tasks/
├── TaskPage.tsx           → Página principal — abas e layout
├── TaskOverview.tsx       → Aba "Visão Geral" — resumo de métricas
├── TaskFilterTab.tsx      → Aba "Filtrar" — filtros avançados
├── NextFollowUpPanel.tsx  → Aba "Próximo Follow-Up"
├── TaskDetailPanel.tsx    → Painel lateral de detalhes da tarefa
└── ...
```

### `TaskPage.tsx`
- Componente raiz do módulo Tasks
- Gerencia navegação entre abas: Overview, Filtrar, Follow-Up, Viabilidade LCI, Relatórios, etc.
- Renderiza `TaskDetailPanel` como drawer lateral ao selecionar uma tarefa

### `TaskOverview.tsx`
- Painel principal com visão geral das tarefas
- Exibe: tarefas ativas, radar crítico, follow-ups pendentes, planejadas atrasadas, atividades atrasadas
- Usa TanStack Query para buscar dados do endpoint `/api/tasks/overview`

### `TaskFilterTab.tsx`
- Filtros por: CSM, cliente, prioridade, status, categoria, data limite
- Tabela de resultados com paginação e ordenação por coluna
- Filtragem client-side com `useMemo`

### `NextFollowUpPanel.tsx`
- Lista tarefas ordenadas por próxima data de follow-up
- Indicadores de urgência (overdue, hoje, próximos dias)

### `TaskDetailPanel.tsx`
- Drawer lateral com detalhes completos de uma tarefa selecionada
- Exibe: histórico de atividades, dados do cliente, responsável, próximo follow-up
- Permite navegar entre tarefas sem fechar o painel

---

## 3. Endpoints da API

**Prefixo:** `/api/tasks`

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/tasks` | Lista tarefas com filtros |
| GET | `/api/tasks/overview` | Métricas do painel principal |
| GET | `/api/tasks/{id}` | Detalhes de uma tarefa |
| GET | `/api/tasks/{id}/activities` | Histórico de atividades |
| GET | `/api/tasks/next-followup` | Tarefas por próximo follow-up |
| GET | `/api/tasks/lci-viability` | Viabilidade LCI por tarefa |
| PUT | `/api/tasks/{id}` | Atualiza tarefa |
| POST | `/api/tasks/{id}/activities` | Registra nova atividade |

**Query params principais (GET /api/tasks):**
- `csm` — filtrar por CSM
- `company` — filtrar por empresa
- `status` — filtrar por status
- `priority` — filtrar por prioridade
- `category` — filtrar por categoria

---

## 4. Regras de negócio

### Tarefas ativas
Tarefas com status diferente de "Fechado" / "Cancelado". São exibidas no Overview como prioridade principal.

### Radar crítico
Tarefas que atendem a pelo menos um critério de criticidade:
- Data limite no passado (overdue)
- Sem follow-up há mais de X dias
- Alta prioridade sem atividade recente

### Follow-Up
Cada tarefa tem uma data de próximo follow-up. O sistema ordena por esta data e destaca tarefas vencidas ou com follow-up para hoje.

### Viabilidade LCI
Análise de elegibilidade de cada tarefa para o incentivo Cisco LCI (Life Cycle Incentive). A análise considera: estágio atual, produto, cliente e critérios de saída.

### Prioridade
As prioridades são traduzíveis via i18n. O sistema de cores usa:
- **Crítica / Alta:** vermelho
- **Média:** amarelo/laranja
- **Baixa:** verde/azul

---

## 5. Permissão

```sql
-- resource_key necessário para acessar o módulo
SELECT resource_key FROM tbAuthResource WHERE resource_key = 'task.task';

-- Conceder acesso a um usuário
INSERT INTO tbAuthPermission (user_role_id, resource_id, action_id)
SELECT ur.user_role_id, r.resource_id, 4  -- action_id=4 = full
FROM tbAuthUserRole ur
JOIN tbAuthResource r ON r.resource_key = 'task.task'
WHERE ur.user_id = <user_id>;
```

---

## 6. Troubleshooting

| Problema | Causa provável | Solução |
|---|---|---|
| Tarefas não carregam | Token expirado ou API offline | Verificar `/api/tasks` retorna 200 |
| Follow-ups desatualizados | Cache do TanStack Query | Refetch manual ou aguardar 5 min |
| Filtros sem resultado | Dados do banco não correspondem | Verificar tabelas tbTask* |
| Detalhes não abrem | Erro no `TaskDetailPanel` | Verificar console do browser |
