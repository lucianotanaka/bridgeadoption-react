# Módulo Team Target — Adoption

> **Rota:** `/adoption/team-target`
> **resource_key:** `adoption.report_team_target`
> **Arquivo frontend:** `frontend/src/pages/adoption/TeamTargetPage.tsx`
> **Backend service:** `backend/app/adoption/extras_service.py`
> **Backend router:** `backend/app/adoption/extras_router.py`
> **Última atualização:** 2026-08-16
> **i18n namespace:** `adoption.teamTarget` (todos os 6 arquivos de locale)

---

## 1. Propósito

Painel de acompanhamento das metas de adoção da equipe (Team Target). Permite ao gestor e aos membros do time monitorar:

- **Metas cadastradas** por ano fiscal (FY), filtradas por equipe (team_id = 30)
- **Detalhes da meta**: nome, descrição, tipos de tarefas, método de medição, valor-alvo, tipo (individual/grupo), pontuação e multiplicador
- **Progresso vs. meta**: gráfico horizontal comparando valor-alvo com valor atingido
- **Breakdown individual**: gráfico por membro do time com % atingida
- **Avaliação individual** (metas individuais): pontuação calculada por membro com base no método de medição

---

## 2. Funcionalidades

### 2.1 Filtros

| Filtro | Tipo | Comportamento |
|--------|------|---------------|
| **Fiscal Year (FY)** | `<select>` | Carrega anos disponíveis de `tbTeamTarget`. Ao alterar, reseta o filtro de meta. |
| **Target** | `<select>` | Lista metas do FY selecionado. Para perfil `view`, exibe apenas metas que contêm o `user_id` do usuário logado. |

> **Diferença em relação ao Streamlit:** o filtro de FY é um `<select>` (dropdown), não botões.

### 2.2 Painel de Detalhes (coluna esquerda)

Exibe os campos da meta selecionada:

| Campo | Descrição |
|-------|-----------|
| **Target** | Nome da meta |
| **Description** | Descrição da meta |
| **Task Types** | Lista dos tipos de tarefa vinculados à meta |
| **Measurement** | Método de medição: `by Sum` ou `by Counting` |
| **Value** | Valor-alvo da meta (formatado com sufixo `k` para milhares) |
| **Individual** | `Yes` (meta individual por pessoa) / `No` (meta coletiva) |
| **Weight (pts)** | Pontuação da meta (target_point) |
| **Employees** | Lista de membros (**visível apenas para gerentes/ADMIN**) |

### 2.3 Gráficos de Progresso (coluna direita)

#### Meta Coletiva (`individual = 0`)

1. **Target Progress** — barra horizontal comparando:
   - `Target ($)` → valor-alvo (verde claro `#A0D8B4`)
   - `Achieved ($) (XX.XX%)` → valor atingido (verde `#5CB85C`) com % no rótulo

2. **Individual Appraisal** — barra horizontal por membro, ordenada decrescentemente:
   - Texto interno: `valor (% atingida)`
   - Para perfil `view`: exibe apenas o próprio usuário

#### Meta Individual (`individual ≠ 0`)

**Individual Appraisal** — barra única com:
- Linha `TARGET ($)` → valor-alvo em **vermelho**
- Uma linha por membro em **verde claro** com texto: `valor_atingido (pontos pt)`
- Pontos calculados conforme lógica de avaliação (ver seção 3)

---

## 3. Regras de Negócio

### 3.1 Método de Medição

| Campo DB | Método | Cálculo de Achieved |
|----------|--------|---------------------|
| `target_measurement_by_sum ≠ 0` | **Sum** | Soma de `activity_approved_value` de todos os registros |
| `target_measurement_by_counting ≠ 0` | **Counting** | Contagem de registros com `task_owner_id` não nulo |

### 3.2 Cálculo de Porcentagem

```
pct_atingida = (achieved / target_value) × 100
```

### 3.3 Avaliação Individual (metas individuais)

A pontuação por membro é calculada da seguinte forma:

| Método | Condição | Resultado |
|--------|----------|-----------|
| `sum` | `achieved ≥ target_value` | `target_point` |
| `sum` | `achieved < target_value` | `0` |
| `counting` | `achieved ≥ target_value` e `multiplier ≠ 0` | `achieved × target_point` |
| `counting` | `achieved ≥ target_value` e `multiplier = 0` | `target_point` |
| `counting` | `achieved < target_value` | `0` |

### 3.4 Controle de Visibilidade por Permissão

| Perfil | isManager | Targets visíveis | Lista de Membros | Gráfico Individual |
|--------|-----------|-----------------|------------------|--------------------|
| ADMIN | `true` | Todos | ✅ Visível | Todos os membros |
| MANAGER / FULL | `true` | Todos | ✅ Visível | Todos os membros |
| view (CSM) | `false` | Apenas os que contêm o `user_id` | ❌ Oculto | Apenas o próprio usuário |

---

## 4. Arquitetura

### 4.1 Frontend

```
TeamTargetPage.tsx
├── FieldRow           — campo label+valor do painel de detalhes
├── TargetDetailPanel  — painel esquerdo com todos os campos da meta
├── GroupTargetChart   — gráficos para meta coletiva (individual=0)
│   ├── Target Progress chart (barra principal)
│   └── Individual Appraisal chart (breakdown por membro)
└── IndividualTargetChart — gráfico para meta individual (individual≠0)
    └── Barra única: TARGET (vermelho) + membros (verde) com pontuação
```

**Dependências:**
- `@tanstack/react-query` — gerenciamento de estado do servidor
- `react-plotly.js` — gráficos de barra horizontal
- `@/store/authStore` — user info e permissões
- `@/api/client` — cliente HTTP (axios)

**State:**
| State | Tipo | Descrição |
|-------|------|-----------|
| `selectedFY` | `number` | Ano fiscal selecionado (default: ano atual) |
| `selectedTargetId` | `number` | ID da meta selecionada (default: 0 = nenhuma) |

**Queries:**
| Query Key | Endpoint | Ativado quando |
|-----------|----------|----------------|
| `team-target-fy` | `GET /adoption/team-target/fiscal-years` | Sempre |
| `team-target-targets, fy` | `GET /adoption/team-target/targets?fy=N` | FY selecionado |
| `team-target-measure, id` | `GET /adoption/team-target/{id}/measure` | Target selecionado |

### 4.2 Backend

**Funções em `extras_service.py`:**

| Função | Descrição |
|--------|-----------|
| `get_team_target_fiscal_years()` | Lista FYs disponíveis em `tbTeamTarget` para team_id=30 |
| `get_team_target_targets(fy)` | Retorna metas enriquecidas com nomes de tasks e usuários |
| `get_team_target_measure(target_id)` | Retorna linhas de medição de `vwMeasureTeamTarget` |

**Rotas em `extras_router.py` (`target_router`):**

| Método | Endpoint | Função |
|--------|----------|--------|
| `GET` | `/api/adoption/team-target/fiscal-years` | `target_fiscal_years` |
| `GET` | `/api/adoption/team-target/targets?fy=N` | `team_target_targets` |
| `GET` | `/api/adoption/team-target/{target_id}/measure` | `team_target_measure` |

### 4.3 Banco de Dados

| Objeto | Tipo | Uso |
|--------|------|-----|
| `tbTeamTarget` | Tabela | Definição das metas: nome, FY, users_list, tasks_list, medição, valor, pontos |
| `vwMeasureTeamTarget` | View | Dados de medição: vincula meta → tarefas → atividades aprovadas → owners |

**Colunas principais de `tbTeamTarget`:**

| Coluna | Alias | Descrição |
|--------|-------|-----------|
| `target_id` | `ID` | PK da meta |
| `target_fy` | `FY` | Ano fiscal |
| `target_name` | `TARGET` | Nome da meta |
| `target_description` | `DESCRIPTION` | Descrição |
| `target_team_id` | `TEAM` | ID do time (30 = Adoption) |
| `target_users_list` | `USERS` | IDs dos usuários (string CSV) |
| `target_tasks_list` | `TASKS` | IDs dos task types (string CSV) |
| `target_measurement_by_counting` | `MEASURE_BY_COUNTING` | 1 = medir por contagem |
| `target_measurement_by_sum` | `MEASURE_BY_SUM` | 1 = medir por somatória |
| `target_point` | `POINTS` | Pontuação da meta |
| `target_multiplier` | `MULTIPLIER` | Multiplicador de pontuação |
| `target_value` | `VALUE` | Valor-alvo da meta |
| `target_individual` | `INDIVIDUAL` | 1 = meta individual; 0 = coletiva |

---

## 5. Fluxo de Dados

```
Usuário seleciona FY
    └─► GET /api/adoption/team-target/targets?fy=N
            └─► TeamTargetRepository.get_team_target_by_fy(fy, team_id=30)
            └─► TaskRepository.get_task_type_by_ids(tasks_list)      [nomes das tasks]
            └─► UserRepository.get_users_by_squad(30, users_list)    [nomes dos membros]
            └─► Retorna lista de TargetItem enriquecidos

Usuário seleciona Target
    └─► GET /api/adoption/team-target/{id}/measure
            └─► TeamTargetRepository.get_measure_team_target_by_id(target_id)
            └─► SELECT * FROM vwMeasureTeamTarget WHERE target_id = N
            └─► Retorna linhas de MeasureRow

Frontend renderiza:
    ├─► TargetDetailPanel  (coluna esquerda)
    └─► GroupTargetChart | IndividualTargetChart  (coluna direita)
```

---

## 6. Formatação de Números

A função `formatK()` no frontend espelha `format_number_with_k()` do Streamlit:

| Valor | Resultado |
|-------|-----------|
| `1000` | `1k` |
| `2500` | `2.5k` |
| `999` | `999` |
| `1250000` | `1250k` |
| `500.5` | `500.50` |

---

## 7. Internacionalização (i18n)

O módulo suporta 3 idiomas: **Português (pt / pt-BR)**, **Inglês (en / en-US)** e **Espanhol (es / es-ES)**.

Todas as strings visíveis são traduzidas via `useTranslation()` de `react-i18next`.

### Namespace: `adoption.teamTarget`

| Chave | PT | EN | ES |
|-------|----|----|-----|
| `title` | Meta da Equipe | Team Target | Meta del Equipo |
| `subtitle` | Metas e Realizações da Equipe de Adoção | Adoption Team Goals & Achievement | Metas y Logros del Equipo de Adopción |
| `fiscalYear` | Ano Fiscal | Fiscal Year | Año Fiscal |
| `target` | Meta | Target | Meta |
| `selectTargetPlaceholder` | — Selecione uma meta — | — Select a target — | — Seleccione una meta — |
| `detailsTitle` | Detalhes da Meta | Target Details | Detalles de la Meta |
| `taskTypes` | Tipos de Tarefa | Task Types | Tipos de Tarea |
| `measurement` | Método de Medição | Measurement | Método de Medición |
| `value` | Valor | Value | Valor |
| `individual` | Individual | Individual | Individual |
| `weightPts` | Peso (pts) | Weight (pts) | Peso (pts) |
| `employees` | Funcionários | Employees | Empleados |
| `targetProgress` | Progresso da Meta | Target Progress | Progreso de la Meta |
| `individualAppraisal` | Avaliação Individual | Individual Appraisal | Evaluación Individual |
| `bySum` | por Somatória | by Sum | por Suma |
| `byCounting` | por Contagem | by Counting | por Conteo |
| `targetDollar` | Meta ($) | Target ($) | Meta ($) |
| `achievedDollar` | Atingido ($) | Achieved ($) | Alcanzado ($) |
| `noTargetsFound` | Nenhuma meta encontrada para o FY `{{fy}}`. | No targets found for FY `{{fy}}`. | No se encontraron metas para el FY `{{fy}}`. |
| `noIndividualProgress` | Nenhum progresso individual encontrado para esta meta. | No individual progress data found for this target. | No se encontraron datos de progreso individual. |
| `noMeasureData` | Sem dados de medição para esta meta. | No measurement data available for this target. | Sin datos de medición para esta meta. |
| `methodNotDetermined` | Método de medição não determinado. | Measurement method not determined. | Método de medición no determinado. |
| `selectTargetHint` | Selecione uma Meta acima para ver... | Select a Target above to view... | Seleccione una Meta arriba para ver... |

### Chaves comuns reutilizadas

| Chave | Uso |
|-------|-----|
| `common.yes` / `common.no` | Campo "Individual" (Sim/Não) |
| `common.refresh` | Botão Atualizar |
| `common.description` | Label do campo Descrição |

### Arquivos de locale atualizados

| Arquivo | Tipo | Status |
|---------|------|--------|
| `frontend/src/i18n/locales/en.json` | Principal EN | ✅ |
| `frontend/src/i18n/locales/pt.json` | Principal PT | ✅ |
| `frontend/src/i18n/locales/es.json` | Principal ES | ✅ |
| `frontend/src/i18n/locales/en-US.json` | Regional EN-US | ✅ |
| `frontend/src/i18n/locales/pt-BR.json` | Regional PT-BR | ✅ |
| `frontend/src/i18n/locales/es-ES.json` | Regional ES-ES | ✅ |

---

## 8. Troubleshooting

| Problema | Causa Provável | Solução |
|----------|---------------|---------|
| Dropdown de FY vazio | Sem metas cadastradas em `tbTeamTarget` | Cadastrar metas via Admin → Team Goals |
| Select de FY mostra ano errado | FY atual não existe no banco (ex: 2026 mas DB só tem 2025) | Comportamento esperado: `useEffect` sincroniza automaticamente para o FY mais recente disponível |
| Dropdown de Target vazio | Sem metas para o FY ou usuário não está em nenhuma meta | Verificar `tbTeamTarget.target_users_list` |
| Gráfico sem dados | `vwMeasureTeamTarget` sem registros para o target_id | Verificar se há atividades aprovadas vinculadas às tasks da meta |
| "Measurement method not determined" | `target_measurement_by_sum` e `target_measurement_by_counting` ambos = 0 | Verificar configuração da meta no banco |
| Usuário vê targets de outros (perfil view) | `user_ids` do target não inclui o user_id | Verificar `target_users_list` na `tbTeamTarget` |
| Erro 500 no endpoint `/targets` | Falha ao resolver task names ou user names | Verificar logs do backend; as funções têm fallback seguro (lista vazia) |
| Strings não traduzidas | Chave ausente no arquivo de locale | Verificar `frontend/src/i18n/locales/*.json` — namespace `adoption.teamTarget` |
