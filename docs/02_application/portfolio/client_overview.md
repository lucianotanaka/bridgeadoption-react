# Módulo Client Overview — Portfolio

> **Última atualização:** 2026-08-24  
> **Rota:** `/portfolio/client-overview`  
> **resource_key:** `portfolio.client_overview`  
> **Arquivo frontend:** `frontend/src/pages/portfolio/ClientOverviewPage.tsx`  
> **Status:** ✅ Migrado para React  
> **Audiência:** Implantação, sustentação e desenvolvimento

---

## 1. Propósito

O **Client Overview** é a visão consolidada 360° de um cliente dentro do módulo **Portfolio**.

Ele centraliza, em uma única tela, informações operacionais, comerciais e de adoção, permitindo que times de implantação e sustentação consultem rapidamente:

- dados cadastrais básicos do cliente
- NPS mais recente
- indicadores e detalhes de **Rebates / Cisco LCI**
- **Critical Alerts**
- **Adoption Initiatives**
- **Projects**
- **Account Team**
- **Stakeholder Management**
- **Cisco EA License Usage**
- **Cisco Smart Account License Usage**
- seção **Assets** atualmente em construção

O módulo funciona como um painel consolidado por cliente, reduzindo a necessidade de navegar entre vários relatórios independentes.

---

## 2. Visão funcional da tela

A tela é composta por três blocos principais:

1. **Cabeçalho e seleção do cliente**
2. **Faixa de KPIs/cards clicáveis**
3. **Painel de detalhe da seção selecionada**

### 2.1 Seleção do cliente

No topo da tela há:

- campo de busca por cliente
- dropdown com empresas disponíveis
- botão **Load**

Fluxo:

1. o usuário pesquisa e seleciona um cliente
2. clica em **Load**
3. a página carrega os datasets relacionados ao cliente
4. os cards passam a refletir os indicadores consolidados

Ao trocar o cliente:
- a seção ativa é resetada
- o `TaskDetailPanel` é fechado
- o formulário de stakeholder é ocultado
- os detalhes anteriores são descartados

---

## 3. Componentes da interface

## 3.1 Cabeçalho do cliente

Após o carregamento, o topo exibe:

| Campo | Origem | Observação |
|---|---|---|
| Nome do cliente | companies + company overview | Nome exibido da empresa selecionada |
| Type | `tbCompany.company_type` | Editável inline |
| Vertical | `tbCompany.company_vertical` | Editável inline |
| Latest NPS | NPS mais recente | Exibe score e data da última resposta |

### Edição inline

Os campos **Type** e **Vertical** podem ser alterados diretamente na tela por meio do ícone de edição.

Comportamento:
- o usuário entra em modo edição
- altera o valor
- confirma no botão de salvar
- a atualização é persistida via API
- o cache React Query da empresa é invalidado

---

## 3.2 Cards / KPIs clicáveis

A segunda faixa da tela exibe os cards consolidados:

| Card | Significado |
|---|---|
| **Rebates** | Quantidade de tasks LCI ativas do cliente |
| **Critical Alerts** | Alertas críticos derivados das tasks ativas |
| **Initiatives** | Iniciativas de adoção do cliente |
| **Projects** | Projetos do cliente |
| **Account Team** | Quantidade de membros alocados |
| **Stakeholders** | Quantidade de stakeholders cadastrados |
| **Assets** | Placeholder para contratos/ativos |
| **Cisco EA** | Percentual agregado de consumo EA e indicação de True Forward |
| **Cisco SA** | Quantidade de registros de Smart Account retornados |

Cada card abre ou fecha uma seção detalhada abaixo.

### Regra de alternância

- clicar em um card abre a seção correspondente
- clicar novamente no mesmo card fecha a seção
- ao alternar entre cards:
  - o `TaskDetailPanel` é fechado
  - o índice do detalhe é resetado
  - apenas uma seção permanece ativa por vez

---

## 4. Seções detalhadas

## 4.1 Rebates / Adoption Cisco LCI

Exibe a visão detalhada do relatório LCI do cliente.

### Conteúdo exibido

- **Current FY**
- **Approved stages**
- **Approved value (USD)**
- gráfico **Approved stages by fiscal year**
- tabela **LCI tasks in FY XXXX**

### Filtros da tabela

A tabela permite filtrar por status lógico:

- All
- Active
- Closed
- Lost
- Ineligible

### Regras de classificação

A classificação é feita por `task_status_id`:

| Grupo | Regra |
|---|---|
| Active | status **não** em `{4, 5, 6, 10}` |
| Closed | status `10` |
| Lost | status `6` |
| Ineligible | status em `{4, 5}` |

### Colunas da tabela

- Task
- Task WS
- Type
- Value (USD)
- Owner
- Start
- End
- FY
- Status

### Comportamento de clique na linha

Para usuários com permissão `task.task`:

- cada linha da tabela é clicável
- ao clicar, é exibido o `TaskDetailPanel`
- o painel é filtrado para mostrar **somente a task da linha selecionada**
- a filtragem é feita por `task_id`

---

## 4.2 Critical Alerts

Exibe alertas críticos derivados das tasks ativas do cliente.

### Critérios de criticidade

A lista é formada a partir de tasks ativas que atendem à regra:

- `critical_level = "N1"` **e**
- (`task_finance_type = "EXPENSE"` **ou** `is_service_impacting = 1`)

### Subgrupos lógicos

O frontend também separa internamente:

- **Finance critical alerts**
- **Service critical alerts**

### Ordenação

A ordenação prioriza:

1. itens financeiros
2. menor data de follow-up / end date
3. maior valor de exposição financeira

### Colunas

- Type
- Category
- Owner
- Status
- Follow-up
- Value / Exposure

### Comportamento de clique na linha

Para usuários com permissão `task.task`:

- cada linha é clicável
- ao clicar, o `TaskDetailPanel` abre
- o painel é filtrado por `task_id`
- apenas a task da linha é exibida

---

## 4.3 Adoption Initiatives

Exibe as iniciativas de adoção do cliente, derivadas do relatório de adoption tasks.

### Filtros rápidos

- All
- Active
- Closed

### Regras

| Grupo | Regra |
|---|---|
| Active | `task_status_id` **não** em `{4, 5, 6, 10}` |
| Closed | `task_status_id` em `{4, 5, 6, 10}` |

### Colunas

- Type
- Owner
- Start
- End
- Status

### Comportamento de clique na linha

Para usuários com permissão `task.task`:

- cada linha é clicável
- ao clicar, o `TaskDetailPanel` abre
- o painel é filtrado para a `task_id` da linha selecionada
- o comportamento é restrito ao **Client Overview** e não altera o módulo **Tasks**

---

## 4.4 Projects

Exibe os projetos vinculados ao cliente.

### Filtros rápidos

- All
- Active
- Closed

### Regra de projeto ativo

O projeto é considerado ativo quando `project_status` **não contém**:

- `cancel`
- `closed`
- `complet`

### Colunas

- Project
- Status
- Start
- End
- OV

---

## 4.5 Account Team

Exibe a equipe alocada para o cliente.

### Modo visualização

Mostra cards com:
- nome do membro
- tipo/papel (`AM`, `CSM`, `CDM`, etc.)

### Modo edição

Disponível quando `canEditTeam = true`.

Condições atuais:
- usuário `ADMIN`, ou
- role contendo `ADMIN`, `MANAGER`, `FULL` ou `EDIT`

### Funcionalidades de edição

- ativar/desativar **Edit Mode**
- alocar/desalocar membros já existentes
- adicionar novo membro interno NTT
- atualização otimista do checkbox de alocação
- invalidação de cache após mutações

---

## 4.6 Stakeholder Management

Exibe a gestão de stakeholders do cliente.

### Funcionalidades

- listar stakeholders do cliente
- visualizar detalhes completos
- criar novo stakeholder
- editar stakeholder existente
- cadastrar nova pessoa (`tbPerson`) antes de salvar o stakeholder, quando necessário

### Dados exibidos

- dados de contato
- power
- interest
- attitude
- essential requirements
- key expectations
- impact potential
- potential reactions
- strategy to gain
- remarks

### Observação operacional

A seção exibe inclusive stakeholders inativos.

---

## 4.7 Assets

A seção **Assets** está em modo **Under construction**.

Hoje o painel mostra placeholders para:

- NTT Contract
- Vendor Contract
- Product / Services LDoS

---

## 4.8 Cisco EA License Usage

Exibe o relatório de consumo Cisco EA do cliente.

### Indicadores

O card calcula:

- percentual agregado de uso
- existência de **True Forward**
- quantidade de ocorrências de True Forward

### Regras

- soma `mcea_purchased`
- soma `mcea_generated`
- se `generated > purchased` em uma linha, conta como True Forward
- `% de uso = min(generated, purchased) / purchased`

### Exibição

No detalhe, a página delega a renderização para:

- `frontend/src/pages/portfolio/CiscoEAClientReport.tsx`

---

## 4.9 Cisco Smart Account License Usage

Exibe os registros Cisco SA do cliente.

### Comportamento

- consulta dados por `customer_id`
- possui retry manual em caso de erro
- usa timeout maior por ser uma consulta potencialmente pesada

### Exibição

No detalhe, a renderização é delegada para:

- `frontend/src/pages/portfolio/CiscoSAClientReport.tsx`

---

## 5. Regras de negócio consolidadas

## 5.1 Status considerados fechados

O conjunto de status fechados no frontend é:

```text
{4, 5, 6, 10}
```

Uso desse conjunto:
- exclusão de tasks fechadas em cards de atividade
- cálculo de initiatives ativas
- cálculo de LCI ativo
- comportamento de filtros locais

---

## 5.2 Regra de abertura do TaskDetailPanel

O `TaskDetailPanel` só pode ser aberto quando:

- o usuário possui permissão `task.task`
- a linha clicada possui `task_id` válido
- a task correspondente é encontrada na lista usada pelo painel

### Regra atual

Ao clicar em uma linha das tabelas:
- **LCI tasks in FY XXXX**
- **Critical Alerts**
- **Adoption Initiatives**

o frontend:
1. recebe a `task_id` da linha
2. filtra a lista de tasks disponíveis do cliente
3. envia ao `TaskDetailPanel` apenas o item cujo `task_id` coincide com a linha clicada

Resultado:
- o painel não mostra todas as tasks do cliente
- o painel mostra somente a task selecionada

---

## 5.3 Regra de fechamento do TaskDetailPanel

O painel de detalhe da task é fechado quando:

- o usuário fecha manualmente o painel
- o usuário troca de seção/card
- o usuário fecha a seção atual
- o usuário troca o cliente
- o usuário recarrega outro cliente via **Load**

---

## 6. Autorização (RBAC)

| Ação | resource_key / permissão | Observação |
|---|---|---|
| Visualizar o módulo Client Overview | `portfolio.client_overview` | Recurso do menu/módulo |
| Abrir TaskDetailPanel nas tabelas | `task.task` | Permissão adicional |
| Editar Account Team | role funcional | Regra frontend baseada no usuário autenticado |
| Editar Type / Vertical | depende do acesso ao módulo | Não há bloqueio granular específico no frontend atual |
| Criar/editar Stakeholders | depende do acesso ao módulo | Não há bloqueio granular específico no frontend atual |

> Para implantação/sustentação, recomenda-se validar se os perfis de acesso esperados possuem tanto o recurso do módulo quanto a permissão `task.task` quando a abertura de task detail for requisito.

---

## 7. Arquitetura frontend

```text
frontend/src/pages/portfolio/ClientOverviewPage.tsx
```

### Dependências principais

- `@tanstack/react-query`
- `react-plotly.js`
- `@/api/client`
- `@/api/tasks`
- `@/store/authStore`
- `@/pages/tasks/TaskDetailPanel`
- `@/pages/portfolio/CiscoEAClientReport`
- `@/pages/portfolio/CiscoSAClientReport`

### Estados React relevantes

| Estado | Tipo | Descrição |
|---|---|---|
| `clientId` | `string` | Cliente selecionado |
| `loaded` | `boolean` | Indica se o usuário clicou em Load |
| `activeSection` | `Section \| null` | Seção atualmente aberta |
| `detailTasks` | `TaskItem[] \| null` | Lista enviada ao TaskDetailPanel |
| `detailIndex` | `number` | Índice inicial do detalhe |
| `companyTypeDraft` | `string` | Edição local de Type |
| `companyVerticalDraft` | `string` | Edição local de Vertical |
| `selectedStakeholderId` | `number \| null` | Stakeholder em foco |
| `showStakeholderForm` | `boolean` | Exibe formulário de stakeholder |
| `showTeamEdit` | `boolean` | Ativa modo edição do time |

### Queries React Query principais

| Query Key | Endpoint / origem | Condição |
|---|---|---|
| `["co-overview-companies"]` | `/api/portfolio/account-team/companies` | sempre |
| `["co-company-overview", numericId]` | `/api/portfolio/client-overview/company/{id}` | após Load |
| `["co-nps", numericId]` | `/api/portfolio/client-overview/nps/{id}` | após Load |
| `["co-stakeholders", numericId]` | `/api/portfolio/client-overview/stakeholders/{id}` | após Load |
| `["co-tasks", clientName]` | `tasksApi.filterTasks({ client_names: [clientName] })` | após Load |
| `["co-initiatives"]` | `/api/portfolio/adoption-tasks` | após Load |
| `["co-account-team"]` | `/api/portfolio/account-team/matrix` | após Load |
| `["co-projects", numericId]` | `/api/projects?customer_id={id}` | após Load |
| `["co-ea", numericId]` | `/api/portfolio/cisco-ea/metering?customer_id={id}` | após Load |
| `["co-sa", numericId]` | `/api/portfolio/cisco-sa/usage?customer_id={id}` | após Load |
| `["co-rebate-report", numericId, clientName]` | `/api/adoption/cisco-lci/client-report/{id}` | somente seção LCI ativa |

---

## 8. Arquitetura backend

O módulo Client Overview não depende de um único endpoint agregado. Ele compõe a tela chamando múltiplos endpoints especializados.

### Router principal

```text
backend/app/modules/sections_router.py
```

### Service principal

```text
backend/app/modules/sections_service.py
```

### Repositórios / fontes principais

| Área | Fonte principal |
|---|---|
| Company profile | `CompanyRepository` |
| NPS | `NPSRepository` |
| Stakeholders | `StakeholderManagementRepository` |
| Person | `PersonRepository` |
| Adoption initiatives | `TaskTechnologyAdoptionReportRepository` |
| Account team | `AccountTeamRepository` |
| Cisco EA | `CiscoEARepository` |
| Cisco SA | `vwCiscoSAMeteringLatest` via SQL direto |
| Projects | `ProjectRepository` |
| Rebates / LCI | router/service de `adoption/cisco_lci` |
| Task detail | módulo `/api/tasks` |

---

## 9. Dependências operacionais para implantação

Para o módulo funcionar corretamente em ambiente, validar:

1. **JWT / autenticação**
   - endpoints do módulo exigem Bearer Token válido

2. **Permissões / RBAC**
   - recurso `portfolio.client_overview`
   - permissão `task.task` para abertura do detalhe de task

3. **Repositórios Python implantados**
   - `person_repository.py`
   - `nps_repository.py`
   - `stakeholder_management_repository.py`
   - demais repositórios usados em `sections_service.py`

4. **Views/tabelas do banco disponíveis**
   - `tbCompany`
   - `tbPerson`
   - estruturas de stakeholder
   - `vwTaskTechnologyAdoptionReport`
   - `vwCiscoSAMeteringLatest`
   - estruturas Cisco EA / Account Team / Project / Task

5. **Módulos correlatos ativos**
   - `/api/tasks`
   - `/api/projects`
   - `/api/adoption/cisco-lci`

---

## 10. Troubleshooting

| Problema | Causa provável | Ação recomendada |
|---|---|---|
| Tela não carrega dados após selecionar cliente | usuário não clicou em **Load** | Validar fluxo operacional da tela |
| Módulo aparece em branco | erro de runtime no frontend | Abrir console do navegador e logs do build |
| Cliente não aparece na busca | empresa não retornada por `/portfolio/account-team/companies` | Validar filtros de empresas disponíveis no backend |
| Type / Vertical não salvam | erro no `PUT /client-overview/company/{id}` | Verificar payload, logs do backend e permissões |
| NPS vazio | cliente sem resposta de NPS cadastrada | Comportamento esperado |
| Stakeholders não aparecem | repositório indisponível ou sem dados | Verificar `StakeholderManagementRepository` e dados da empresa |
| TaskDetailPanel não abre ao clicar na linha | usuário sem permissão `task.task` | Validar role/permissão no Admin |
| TaskDetailPanel abre com task errada | lista de tasks do cliente sem correspondência com a linha | Validar `task_id` retornado na tabela e em `/api/tasks/filter` |
| LCI / Rebates não carrega | falha no endpoint `/api/adoption/cisco-lci/client-report/{id}` | Verificar serviço de adoption/cisco-lci |
| Cisco SA falha | indisponibilidade de `vwCiscoSAMeteringLatest` ou timeout | Verificar view, performance e conectividade com banco |
| Cisco EA sem True Forward esperado | dataset EA sem `generated > purchased` | Validar dados de origem/importação |
| Projects vazio | cliente sem projetos ou filtro por `customer_id` sem dados | Validar `vwProject` / `ProjectRepository` |
| Assets sem dados | seção ainda não implementada | Comportamento esperado |

---

## 11. Referências

- `frontend/src/pages/portfolio/ClientOverviewPage.tsx`
- `frontend/src/pages/portfolio/CiscoEAClientReport.tsx`
- `frontend/src/pages/portfolio/CiscoSAClientReport.tsx`
- `frontend/src/pages/tasks/TaskDetailPanel.tsx`
- `backend/app/modules/sections_router.py`
- `backend/app/modules/sections_service.py`
- `backend/app/adoption/cisco_lci_router.py`
- `backend/app/adoption/cisco_lci_service.py`
- `docs/02_application/module_portfolio.md`
- `docs/02_application/portfolio/adoption_initiatives.md`
- `docs/07_api/account_team_endpoints.md`
