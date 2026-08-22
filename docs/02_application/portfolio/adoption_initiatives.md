# Módulo Adoption Initiatives — Portfolio

> **Última atualização:** 2026-08-22  
> **Rota:** `/portfolio/adoption-tasks`  
> **resource_key:** `portfolio.adoption_initiatives`  
> **Arquivo frontend:** `frontend/src/pages/portfolio/AdoptionInitiativesPage.tsx`  
> **Status:** ✅ Migrado para React — 2026-08-22 (renomeado de Adoption Tasks)  
> **Audiência:** Desenvolvimento e sustentação

---

## 1. Propósito

Relatório de **iniciativas de adoção tecnológica** realizadas pelos CSMs nas contas dos clientes. Permite gestores e equipes de adoção acompanhar:

- Quais iniciativas estão **em andamento** por solução
- Quais foram **concluídas**
- Quais foram **canceladas, declinadas ou expiradas**
- Tarefas com **prazo vencido** (atrasadas)

Substitui e expande o módulo anterior "Adoption Tasks" com filtros cascateados, gráficos analíticos e acesso direto ao detalhe da tarefa.

---

## 2. Fonte de Dados

| Fonte | Descrição |
|---|---|
| `vwTaskTechnologyAdoptionReport` | View principal — une `tbTask`, `tbTaskType`, `tbCompany`, `tbPerson` e `tbStatus` |
| `TaskTechnologyAdoptionReportRepository.find_all_df()` | Método do repositório Python que executa `SELECT * FROM vwTaskTechnologyAdoptionReport` |

### Colunas mapeadas da view

| Campo na view | Campo na UI | Tipo |
|---|---|---|
| `task_id` | — (interno, usado para abrir detalhe) | number |
| `task_customer_name` | CLIENT | string |
| `task_type_name` | SOLUTION | string |
| `task_owner_name` | CSM | string |
| `task_status_name` | STATUS | string |
| `task_status_id` | — (interno, usado nas regras de negócio) | number |
| `task_start` | START DATE | date |
| `task_end` | END DATE | date |

---

## 3. Componentes da Interface

### 3.1 Filtros cascateados

Disposto em duas linhas com proporção 2:1:

**Linha 1:** `CLIENT` (largura 2x) | `CSM` (largura 1x)  
**Linha 2:** `SOLUTION` (largura 2x) | `STATUS` (largura 1x)

**Lógica de cascata (espelha o comportamento original do Streamlit):**

```
displayData → filtrar por CLIENT
           → filtrar por SOLUTION (opções dependem de CLIENT)
           → filtrar por CSM (opções dependem de CLIENT + SOLUTION)
           → filtrar por STATUS (opções dependem dos três anteriores)
```

- CLIENT e SOLUTION: máximo de **5 seleções simultâneas**
- Cada filtro limpa os filtros downstream quando alterado
- Botão **"Limpar filtros"** aparece apenas quando há filtros ativos

### 3.2 Gráficos de barras (3 colunas)

| Gráfico | Status IDs | Cor |
|---|---|---|
| **Iniciativas em Andamento** | `1, 2, 3, 7, 8, 9` | Azul |
| **Iniciativas Concluídas** | `10` | Verde |
| **Não Concluídas** | `4, 5, 6` (Canceladas, Declinadas, Expiradas) | Vermelho |

Cada gráfico exibe:
- Barras coloridas por solução (paleta de 10 cores)
- Total do grupo no cabeçalho `(n)`
- Eixo Y: quantidade de iniciativas
- Eixo X: nome da solução (inclinado -30°)
- Mensagem "No data available" quando o grupo está vazio

Os gráficos respeitam os filtros ativos da tabela.

### 3.3 Tabela de dados

- **Paginação:** padrão 25 linhas, opções 10/25/50/100
- **Colunas:** CLIENT, SOLUTION, CSM, STATUS, START DATE, END DATE
- **Badge de atraso:** se `task_status_id NOT IN (4,5,6,10)` E `task_end < hoje`, exibe badge `⚠ Atrasada` em vermelho no campo STATUS

### 3.4 Export Excel

Botão **"Export Excel"** (desabilitado quando não há dados filtrados).  
Nome do arquivo: `YYYYMMDD_Adoption_Initiatives_Report.xlsx`

### 3.5 Task Detail Panel (inline)

Disponível apenas para usuários com permissão `task.task`.

- Clicar em uma linha da tabela abre o `TaskDetailPanel` abaixo da tabela
- Carrega o detalhe completo da tarefa via `GET /api/tasks/detail/{task_id}`
- Exibe: formulário de edição, atividades, matriz RACI, histórico
- Botão **✕** fecha o painel
- Linha com `task_id = 0` não é clicável

---

## 4. Regras de Negócio

### 4.1 Badge "Atrasada"

```
IS_DELAYED = (task_status_id NOT IN {4, 5, 6, 10}) AND (task_end < hoje)
```

| Status ID | Nome | Aplica atraso? |
|---|---|---|
| 1, 2, 3, 7, 8, 9 | Open, In Progress, On Hold, etc. | ✅ Sim |
| 4 | Cancelada | ❌ Não |
| 5 | Declinada | ❌ Não |
| 6 | Expirada | ❌ Não |
| 10 | Concluída | ❌ Não |

### 4.2 Agrupamento dos gráficos

```
In Progress:     task_status_id IN {1, 2, 3, 7, 8, 9}
Completed:       task_status_id = 10
Not Completed:   task_status_id IN {4, 5, 6}
```

> **Nota:** tarefas com `task_status_id = 0` ou não mapeados não aparecem em nenhum gráfico.

---

## 5. Autorização (RBAC)

| Ação | resource_key | Permissão mínima |
|---|---|---|
| Visualizar o módulo | `portfolio.adoption_initiatives` | `READ` |
| Clicar na linha e abrir Task Detail | `task.task` | `READ` |

> A abertura do Task Detail é **silenciosa para quem não tem permissão** — sem mensagem, sem cursor diferente, linha estática.

---

## 6. Arquitetura Frontend

```
frontend/src/pages/portfolio/
└── AdoptionInitiativesPage.tsx   ← componente principal

Importações-chave:
  - @/api/tasks → tasksApi.getTask(taskId)
  - @/pages/tasks/TaskDetailPanel → painel inline
  - @/store/authStore → hasPermission("task.task")
  - react-plotly.js → 3 gráficos de barras
  - xlsx → export Excel
```

### Estados React

| Estado | Tipo | Descrição |
|---|---|---|
| `fClient` | `string[]` | Filtro CLIENT |
| `fSolution` | `string[]` | Filtro SOLUTION |
| `fCsm` | `string[]` | Filtro CSM |
| `fStatus` | `string[]` | Filtro STATUS |
| `page` | `number` | Página atual da tabela |
| `pageSize` | `number` | Linhas por página |
| `selectedTaskId` | `number \| null` | Task selecionada para detalhe inline |

### Queries React Query

| Query Key | Endpoint | Stale Time |
|---|---|---|
| `["portfolio-adoption-initiatives"]` | `GET /api/portfolio/adoption-tasks` | 5 min |
| `["initiative-task-detail", taskId]` | `GET /api/tasks/detail/{taskId}` | 2 min |

---

## 7. Arquitetura Backend

```
backend/app/modules/sections_router.py
  └── GET /api/portfolio/adoption-tasks
        └── sections_service.get_adoption_tasks()
              └── TaskTechnologyAdoptionReportRepository.find_all_df()
                    └── SELECT * FROM vwTaskTechnologyAdoptionReport
```

### `sections_service.get_adoption_tasks()`

```python
def get_adoption_tasks(customer_id: Optional[int] = None) -> List[Dict]:
    repo = TaskTechnologyAdoptionReportRepository()
    df = repo.find_all_df()   # retorna DataFrame com todos os campos da view
    # filtro opcional por customer_id (parâmetro legado, não usado na UI)
    return _df(df)
```

---

## 8. i18n

Todas as strings são internacionalizadas. Chaves principais em `frontend/src/i18n/locales/{lang}.json` sob `portfolio.adoptionInitiatives`:

| Chave | EN | PT | ES |
|---|---|---|---|
| `title` | Portfolio — Adoption Initiatives | Portfólio — Iniciativas de Adoção | Portafolio — Iniciativas de Adopción |
| `subtitle` | Report of technology adoption... | Relatório de iniciativas... | Informe de iniciativas... |
| `chartInProgress` | Initiatives In Progress | Iniciativas em Andamento | Iniciativas En Progreso |
| `chartCompleted` | Completed Initiatives | Iniciativas Concluídas | Iniciativas Completadas |
| `chartNotCompleted` | Not Completed | Não Concluídas | No Completadas |
| `statusDelayed` | Delayed | Atrasada | Atrasada |

---

## 9. Troubleshooting

| Problema | Causa | Solução |
|---|---|---|
| Módulo sem dados / filtros sem opções | `get_adoption_tasks()` retornava `[]` porque buscava métodos inexistentes | Verificado e corrigido: serviço agora chama `repo.find_all_df()` diretamente |
| Dados não aparecem após código atualizado | Gunicorn sem `reload = True` — workers carregam módulos no startup | Reiniciar o serviço: `sudo systemctl restart bridgeadoption-api` |
| Badge "Atrasada" em tarefa não atrasada | `task_status_id` retornado como `null` ou string | Verificar view `vwTaskTechnologyAdoptionReport` — campo `task_status_id` deve ser numérico |
| Gráficos não aparecem | Nenhuma tarefa com status nos grupos mapeados | Normal se todas as tarefas têm status não mapeado (ID 0) |
| Task Detail não abre | Usuário sem permissão `task.task` | Verificar roles no Admin → Roles & Auth |
| Task Detail — erro 404 | `task_id` inválido (0) na view | Verificar join na view para garantir que `task_id` seja sempre preenchido |
| Módulo não aparece no menu | `resource_key` não encontrado ou sem permissão | Verificar `tbAuthResource.resource_key = 'portfolio.adoption_initiatives'` no banco |
