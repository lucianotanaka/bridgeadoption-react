Documentação da view `vwCustomerCiscoLCIDealTrackProjectStatus`

Objetivo

A view `vwCustomerCiscoLCIDealTrackProjectStatus` tem como objetivo exibir, para tarefas do tipo Cisco LCI não encerradas, uma visão consolidada por:

- cliente
- deal
- solução (`track`)

Além disso, a view informa:

- se existe ou não projeto associado àquela solução
- qual é a tarefa potencial selecionada para representar aquele conjunto
- os principais dados dessa tarefa potencial

Essa visão é útil para identificar, por cliente e por solução, se já existe projeto vinculado e qual tarefa permanece como referência para acompanhamento.

---

Grão da view

A granularidade da view é:

- 1 linha por `customer_name` + `task_deal_id` + `solution_track`

Ou seja:

- o mesmo cliente pode aparecer em várias linhas
- o mesmo cliente pode ter mais de um `deal`
- o mesmo `deal` pode ter mais de um `track`
- tarefas com `task_deal_id` diferentes nunca devem ser consolidadas na mesma linha, mesmo que pertençam ao mesmo cliente e ao mesmo `track`

---

Fontes de dados utilizadas

A view utiliza as seguintes tabelas:

- `tbTask`
- `tbCompany`
- `tbStatusType`

Relacionamentos principais:

- `tbTask.task_customer_id = tbCompany.company_id`
- `tbTask.task_status = tbStatusType.statustype_id`

---

Critérios de elegibilidade das tarefas

A view considera apenas tarefas que atendam simultaneamente aos seguintes critérios:

- `task_tasktype_id IN (21, 22)`
- `task_customer_id <> 0`
- `task_status NOT IN (4, 5, 6, 10)`

Interpretação:

- somente tarefas do tipo Cisco LCI entram na análise
- tarefas sem cliente válido são desconsideradas
- tarefas encerradas ou fora do escopo definido pelos status acima não são consideradas

---

Chave lógica da análise

A lógica da view é construída considerando o agrupamento por:

- `task_customer_id`
- `task_deal_id`
- `task_track`

Isso significa que toda análise de projeto e de tarefa potencial ocorre dentro desse conjunto.

Na prática:
- mesmo cliente + mesmo track + deal diferente = linhas diferentes
- mesmo cliente + mesmo deal + tracks diferentes = linhas diferentes

---

Regra da coluna `has_project`

A coluna `has_project` indica a situação de projeto para o conjunto:

- cliente
- deal
- track

A regra é a seguinte:

1. Retorna `YES`
   quando existir ao menos uma tarefa do grupo com:
   - `task_project_id > 0`
   - `task_status <> 1`

2. Retorna `PENDING REVIEW`
   quando todas as tarefas do grupo estiverem com:
   - `task_status = 1`

3. Retorna `NO`
   em qualquer outro caso

Resumo da interpretação:

- `YES`: existe projeto vinculado em uma tarefa efetivamente evoluída
- `PENDING REVIEW`: ainda não há avanço além do status inicial
- `NO`: não se enquadra nas condições acima e não há evidência suficiente de projeto ativo para o grupo

---

Regra de escolha da tarefa potencial

A view não exibe necessariamente todas as tarefas do grupo como tarefa potencial principal. Ela aplica uma regra para selecionar a melhor tarefa representativa dentro de cada combinação de:

- cliente
- deal
- track

A seleção ocorre em duas etapas:

1. Escolha da melhor prioridade de status
2. Dentro da melhor prioridade, escolha do menor valor (`task_value`)

---

Prioridade de status

Cada tarefa recebe uma prioridade conforme o `task_status`:

1. prioridade 1:
   - `task_status NOT IN (1, 3)`

2. prioridade 2:
   - `task_status = 3`

3. prioridade 3:
   - `task_status = 1`

Quanto menor o número da prioridade, maior a precedência.

Na prática:
- primeiro são preferidas tarefas com status diferentes de 1 e 3
- se não existir nenhuma, são escolhidas tarefas com status 3
- se também não existir nenhuma, são escolhidas tarefas com status 1

---

Critério de desempate por valor

Depois de definida a melhor prioridade dentro do grupo, a view escolhe as tarefas com menor:

- `COALESCE(task_value, 0)`

Ou seja:
- valores nulos são tratados como zero
- dentro da melhor prioridade, a menor oportunidade em valor é a selecionada

---

Tratamento de empate

Se houver mais de uma tarefa empatada ao mesmo tempo em:

- mesmo cliente
- mesmo deal
- mesmo track
- mesma prioridade
- mesmo menor valor

então todas essas tarefas permanecem selecionadas.

Nesses casos, a view concatena os dados dessas tarefas nas colunas de saída:

- `potential_use_case`
- `potential_task_ws`
- `potential_task_status`

Importante:
essas concatenações são feitas sempre a partir do mesmo conjunto de tarefas selecionadas, preservando consistência entre as colunas.

Isso garante, por exemplo, que:

- se houver 2 status distintos, também haverá 2 `WS`
- se houver 1 único `WS`, então existe apenas 1 tarefa selecionada
- tarefas de `task_deal_id` diferentes não são misturadas na mesma linha

---

Consistência entre colunas agregadas

Para evitar inconsistências, a view não agrega colunas independentes de conjuntos diferentes.

As colunas:

- `potential_use_case`
- `potential_task_ws`
- `potential_task_status`

são sempre geradas a partir da mesma lista de tarefas selecionadas por `task_id`.

Assim, a linha final mantém coerência entre:
- o use case
- o WS
- o deal
- o status

---

Descrição das colunas de saída

A view retorna as seguintes colunas:

1. `customer_name`
   - nome do cliente

2. `task_deal_id`
   - identificador do deal da tarefa
   - diferencia registros que não podem ser consolidados na mesma linha

3. `solution_track`
   - track da solução associado à tarefa

4. `has_project`
   - indicador da situação de projeto para o conjunto cliente + deal + track
   - valores possíveis:
     - `YES`
     - `NO`
     - `PENDING REVIEW`

5. `potential_use_case`
   - subtrack(s) da(s) tarefa(s) potencial(is) selecionada(s)
   - pode conter múltiplos valores concatenados em caso de empate

6. `potential_value_usd`
   - menor valor da tarefa potencial dentro da melhor prioridade encontrada

7. `potential_task_ws`
   - WS da(s) tarefa(s) selecionada(s)
   - pode conter múltiplos valores concatenados em caso de empate legítimo

8. `potential_task_status`
   - nome do status da(s) tarefa(s) selecionada(s)
   - pode conter múltiplos valores concatenados em caso de empate legítimo

---

Resumo técnico das etapas internas

A view é montada em etapas usando CTEs:

1. `task_base`
   - carrega as tarefas válidas
   - associa cliente e nome do status

2. `customer_track_deal_base`
   - define a base única de cliente + track + deal

3. `has_project_calc`
   - calcula a coluna `has_project`

4. `task_priority`
   - atribui uma prioridade para cada tarefa com base no status

5. `best_priority`
   - identifica a melhor prioridade por cliente + track + deal

6. `min_value_by_priority`
   - encontra o menor `task_value` dentro da melhor prioridade

7. `selected_tasks`
   - seleciona as tarefas que atendem simultaneamente:
     - melhor prioridade
     - menor valor

8. `selected_tasks_dedup`
   - organiza a base final das tarefas selecionadas

9. `selected_tasks_agg`
   - concatena os campos das tarefas selecionadas de forma consistente

10. `SELECT final`
   - monta a saída final da view

---

Código completo da view

```sql
CREATE OR REPLACE VIEW vwCustomerCiscoLCIDealTrackProjectStatus AS
WITH task_base AS (
    SELECT
        t.task_id,
        t.task_customer_id,
        c.company_name AS customer_name,
        t.task_track,
        t.task_subtrack,
        COALESCE(t.task_value, 0) AS task_value,
        t.task_ws,
        t.task_deal_id,
        t.task_status,
        s.statustype_name AS task_status_name,
        COALESCE(t.task_project_id, 0) AS task_project_id
    FROM tbTask t
    INNER JOIN tbCompany c
        ON c.company_id = t.task_customer_id
    INNER JOIN tbStatusType s
        ON s.statustype_id = t.task_status
    WHERE t.task_tasktype_id IN (21, 22)
      AND t.task_customer_id <> 0
      AND t.task_status NOT IN (4, 5, 6, 10)
),
customer_track_deal_base AS (
    SELECT DISTINCT
        tb.task_customer_id,
        tb.customer_name,
        tb.task_track,
        tb.task_deal_id
    FROM task_base tb
),
has_project_calc AS (
    SELECT
        tb.task_customer_id,
        tb.task_track,
        tb.task_deal_id,
        CASE
            WHEN SUM(
                CASE
                    WHEN tb.task_project_id > 0
                     AND tb.task_status <> 1
                    THEN 1
                    ELSE 0
                END
            ) > 0 THEN 'YES'
            WHEN COUNT(*) = SUM(
                CASE
                    WHEN tb.task_status = 3 THEN 1
                    ELSE 0
                END
            ) THEN 'IN REVIEW'
            WHEN COUNT(*) = SUM(
                CASE
                    WHEN tb.task_status = 1 THEN 1
                    ELSE 0
                END
            ) THEN 'PENDING REVIEW'
            ELSE 'NO'
        END AS has_project
    FROM task_base tb
    GROUP BY
        tb.task_customer_id,
        tb.task_track,
        tb.task_deal_id
),
task_priority AS (
    SELECT
        tb.*,
        CASE
            WHEN tb.task_status NOT IN (1, 3) THEN 1
            WHEN tb.task_status = 3 THEN 2
            WHEN tb.task_status = 1 THEN 3
            ELSE 9
        END AS priority_group
    FROM task_base tb
),
best_priority AS (
    SELECT
        tp.task_customer_id,
        tp.task_track,
        tp.task_deal_id,
        MIN(tp.priority_group) AS best_priority_group
    FROM task_priority tp
    GROUP BY
        tp.task_customer_id,
        tp.task_track,
        tp.task_deal_id
),
min_value_by_priority AS (
    SELECT
        tp.task_customer_id,
        tp.task_track,
        tp.task_deal_id,
        bp.best_priority_group,
        MIN(tp.task_value) AS min_task_value
    FROM task_priority tp
    INNER JOIN best_priority bp
        ON bp.task_customer_id = tp.task_customer_id
       AND bp.task_track = tp.task_track
       AND bp.task_deal_id = tp.task_deal_id
       AND bp.best_priority_group = tp.priority_group
    GROUP BY
        tp.task_customer_id,
        tp.task_track,
        tp.task_deal_id,
        bp.best_priority_group
),
selected_tasks AS (
    SELECT DISTINCT
        tp.task_id,
        tp.task_customer_id,
        tp.customer_name,
        tp.task_track,
        tp.task_subtrack,
        tp.task_value,
        tp.task_ws,
        tp.task_deal_id,
        tp.task_status,
        tp.task_status_name
    FROM task_priority tp
    INNER JOIN min_value_by_priority mv
        ON mv.task_customer_id = tp.task_customer_id
       AND mv.task_track = tp.task_track
       AND mv.task_deal_id = tp.task_deal_id
       AND mv.best_priority_group = tp.priority_group
       AND mv.min_task_value = tp.task_value
),
selected_tasks_dedup AS (
    SELECT
        st.task_id,
        st.task_customer_id,
        st.task_track,
        st.task_subtrack,
        st.task_value,
        st.task_ws,
        st.task_deal_id,
        st.task_status,
        st.task_status_name
    FROM selected_tasks st
),
selected_tasks_agg AS (
    SELECT
        std.task_customer_id,
        std.task_track,
        std.task_deal_id,
        GROUP_CONCAT(
            std.task_subtrack
            ORDER BY std.task_id
            SEPARATOR ', '
        ) AS potential_use_case,
        MIN(std.task_value) AS potential_value_usd,
        GROUP_CONCAT(
            std.task_ws
            ORDER BY std.task_id
            SEPARATOR ', '
        ) AS potential_task_ws,
        GROUP_CONCAT(
            std.task_status_name
            ORDER BY std.task_id
            SEPARATOR ', '
        ) AS potential_task_status
    FROM selected_tasks_dedup std
    GROUP BY
        std.task_customer_id,
        std.task_track,
        std.task_deal_id
)
SELECT
    ctdb.customer_name,
    sta.task_deal_id,
    ctdb.task_track AS solution_track,
    hpc.has_project,
    sta.potential_use_case,
    sta.potential_value_usd,
    sta.potential_task_ws,
    sta.potential_task_status
FROM customer_track_deal_base ctdb
INNER JOIN has_project_calc hpc
    ON hpc.task_customer_id = ctdb.task_customer_id
   AND hpc.task_track = ctdb.task_track
   AND hpc.task_deal_id = ctdb.task_deal_id
INNER JOIN selected_tasks_agg sta
    ON sta.task_customer_id = ctdb.task_customer_id
   AND sta.task_track = ctdb.task_track
   AND sta.task_deal_id = ctdb.task_deal_id;

```