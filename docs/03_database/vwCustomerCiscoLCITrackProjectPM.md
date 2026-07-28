Lógica da view `vwCustomerCiscoLCITrackProjectPM`

--------------------------------------------------
# Objetivo
--------------------------------------------------
A view tem como objetivo listar, em uma única linha por cliente, os clientes que possuem tarefas Cisco LCI elegíveis, exibindo:

- `customer_id` = Id da empresa em tbCompany
- `customer_name` = Nome da empresa em tbCompany
- `Track`= Listagem de track contidos na tbTask
- `qty_project` = contagem da quantidade de projetos do cliente não encerrados ou cancelados
- `pm_name` = listagem dos PM que atuam nos projetos do cliente

A view consolida informações de tarefas, empresa, projetos e equipe de projeto para facilitar a identificação de clientes com projetos em andamento e seus respectivos PMs.

--------------------------------------------------
1. Critério de elegibilidade do cliente
--------------------------------------------------

A base inicial da view é a tabela `tbTask`.

Um cliente será considerado elegível quando possuir ao menos uma tarefa que atenda simultaneamente aos seguintes critérios:

- `tbTask.task_tasktype_id IN (21, 22)`
- `tbTask.task_status IN (1, 2, 3)`
- `tbTask.task_customer_id <> 0`

Esses filtros garantem que a view considere apenas tarefas do tipo Cisco LCI e com status válidos.

--------------------------------------------------
2. Identificação do cliente
--------------------------------------------------

Após identificar os clientes elegíveis em `tbTask`, a view relaciona o cliente com `tbCompany` por meio da condição:

- `tbTask.task_customer_id = tbCompany.company_id`

Dessa relação, é exibido:

- `tbCompany.company_name AS customer_name`

--------------------------------------------------
3. Consolidação da coluna Track
--------------------------------------------------

A coluna `Track` é formada a partir dos valores de `tbTask.task_track`.

Como um mesmo cliente pode possuir várias tarefas elegíveis com tracks diferentes, a view:

- agrupa os registros por cliente
- concatena os valores distintos de `task_track`
- utiliza vírgula e espaço como separador

Exemplo:
- `Network, Catalyst`
- `Wifi, Security`

A concatenação é feita com `GROUP_CONCAT(DISTINCT ...)`, evitando repetição de tracks iguais para o mesmo cliente.

--------------------------------------------------
4. Identificação de projetos em andamento
--------------------------------------------------

A view busca projetos do cliente na tabela `tbProject`, relacionando:

- `tbTask.task_customer_id = tbProject.project_customer_id`

São considerados apenas projetos em andamento, ou seja, projetos cujo status seja diferente de:

- `Canceled`
- `Closed`

Filtro aplicado:
- `tbProject.project_status NOT IN ('Canceled', 'Closed')`

--------------------------------------------------
5. Cálculo da quantidade de projetos
--------------------------------------------------

A coluna `qty_project` representa a quantidade de projetos em andamento do cliente.

Essa quantidade é calculada contando os registros de `tbProject` válidos por cliente.

Regras:
- se o cliente não tiver projeto em andamento, `qty_project = 0`
- se tiver 1 ou mais projetos em andamento, a coluna exibirá a contagem correspondente

--------------------------------------------------
6. Regra de determinação do PM
--------------------------------------------------

A coluna `pm_name` é calculada a partir das tabelas `tbProjectTeam` e `tbUser`.

O relacionamento ocorre da seguinte forma:

- `tbProject.project_id = tbProjectTeam.projteam_project_id`
- `tbProjectTeam.projteam_user_id = tbUser.user_id`

Somente são considerados registros da equipe de projeto onde:

- `tbProjectTeam.projteam_department_id = 11`

Esse departamento representa o PM do projeto.

--------------------------------------------------
7. Prioridade para definição do PM
--------------------------------------------------

A lógica do PM é definida em nível de cliente, considerando os projetos em andamento.

A regra é aplicada nesta ordem:

7.1. Primeira prioridade: PMs ativos

Se o cliente possuir um ou mais PMs ativos em projetos em andamento, serão exibidos todos os PMs ativos distintos concatenados por vírgula.

Um PM ativo é definido por:

- `tbProjectTeam.projteam_allocation_end IS NULL`

Nesse cenário:
- apenas PMs ativos são considerados
- PMs históricos não são exibidos
- nomes duplicados são removidos com `DISTINCT`

Exemplo:
- `João, Maria`

7.2. Segunda prioridade: último PM histórico

Se o cliente não possuir nenhum PM ativo, a view busca o último PM histórico do cliente.

Nesse caso, são considerados registros onde:

- `tbProjectTeam.projteam_allocation_end IS NOT NULL`

Entre esses registros, a view escolhe apenas um, obedecendo a seguinte ordem:

1. maior `tbProjectTeam.projteam_allocation_end`
2. em caso de empate, maior `tbProjectTeam.projteam_allocation_start`
3. em caso de novo empate, maior `tbProjectTeam.projteam_user_id`

Essa regra identifica o PM mais recente que atuou em algum projeto em andamento do cliente.

--------------------------------------------------
8. Comportamento em cenários possíveis
--------------------------------------------------

8.1. Cliente com tarefa elegível e sem projeto
- o cliente aparece na view
- `qty_project = 0`
- `pm_name = NULL`

8.2. Cliente com projeto em andamento e PM ativo
- o cliente aparece na view
- `qty_project` mostra a quantidade de projetos em andamento
- `pm_name` mostra todos os PMs ativos distintos concatenados por vírgula

8.3. Cliente com projeto em andamento e sem PM ativo, mas com PM histórico
- o cliente aparece na view
- `qty_project` mostra a quantidade de projetos em andamento
- `pm_name` mostra apenas o último PM histórico, definido pela maior `projteam_allocation_end`

8.4. Cliente com projeto em andamento, mas sem qualquer registro de PM
- o cliente aparece na view
- `qty_project` mostra a quantidade de projetos em andamento
- `pm_name = NULL`

--------------------------------------------------
9. Estrutura resumida das etapas da view
--------------------------------------------------

A view é construída em etapas lógicas:

1. `task_base`
   - filtra as tarefas elegíveis

2. `task_track_agg`
   - consolida os tracks por cliente

3. `project_base`
   - identifica os projetos em andamento

4. `project_qty`
   - conta a quantidade de projetos por cliente

5. `pm_active_by_customer`
   - busca e concatena os PMs ativos por cliente

6. `pm_inactive_ranked`
   - ranqueia os PMs históricos por cliente

7. `pm_last_inactive_by_customer`
   - seleciona o último PM histórico por cliente

8. `SELECT final`
   - une todas as informações em uma única linha por cliente

--------------------------------------------------
10. Resultado final
--------------------------------------------------

A view retorna uma única linha por cliente elegível, contendo:

- o identificador do cliente
- o nome do cliente
- os tracks consolidados
- a quantidade de projetos em andamento
- os PMs ativos concatenados, quando existirem
- ou, na ausência de PM ativo, o último PM histórico do cliente

------------------------

Código da view
CREATE OR REPLACE VIEW vwCustomerCiscoLCITrackProjectPM AS
WITH task_base AS (
    SELECT
        t.task_customer_id AS customer_id,
        t.task_track
    FROM tbTask t
    WHERE t.task_tasktype_id IN (21, 22)
      AND t.task_status IN (1, 3)
      AND t.task_customer_id <> 0
),
task_track_agg AS (
    SELECT
        tb.customer_id,
        GROUP_CONCAT(
            DISTINCT tb.task_track
            ORDER BY tb.task_track
            SEPARATOR ', '
        ) AS Track
    FROM task_base tb
    GROUP BY tb.customer_id
),
project_base AS (
    SELECT
        p.project_id,
        p.project_customer_id AS customer_id
    FROM tbProject p
    WHERE p.project_status NOT IN ('Canceled', 'Closed')
),
project_qty AS (
    SELECT
        pb.customer_id,
        COUNT(*) AS qty_project
    FROM project_base pb
    GROUP BY pb.customer_id
),
pm_active_by_customer AS (
    SELECT
        pb.customer_id,
        GROUP_CONCAT(
            DISTINCT u.user_name
            ORDER BY u.user_name
            SEPARATOR ', '
        ) AS pm_name
    FROM project_base pb
    INNER JOIN tbProjectTeam pt
        ON pt.projteam_project_id = pb.project_id
       AND pt.projteam_department_id = 11
       AND pt.projteam_allocation_end IS NULL
    INNER JOIN tbUser u
        ON u.user_id = pt.projteam_user_id
    GROUP BY pb.customer_id
),
pm_inactive_ranked AS (
    SELECT
        pb.customer_id,
        pt.projteam_user_id,
        pt.projteam_allocation_start,
        pt.projteam_allocation_end,
        ROW_NUMBER() OVER (
            PARTITION BY pb.customer_id
            ORDER BY
                pt.projteam_allocation_end DESC,
                COALESCE(pt.projteam_allocation_start, DATE('1000-01-01')) DESC,
                pt.projteam_user_id DESC
        ) AS rn
    FROM project_base pb
    INNER JOIN tbProjectTeam pt
        ON pt.projteam_project_id = pb.project_id
       AND pt.projteam_department_id = 11
       AND pt.projteam_allocation_end IS NOT NULL
),
pm_last_inactive_by_customer AS (
    SELECT
        pir.customer_id,
        u.user_name AS pm_name
    FROM pm_inactive_ranked pir
    INNER JOIN tbUser u
        ON u.user_id = pir.projteam_user_id
    WHERE pir.rn = 1
)
SELECT
    tta.customer_id,
    c.company_name AS customer_name,
    tta.Track,
    COALESCE(pq.qty_project, 0) AS qty_project,
    COALESCE(pac.pm_name, plic.pm_name) AS pm_name
FROM task_track_agg tta
INNER JOIN tbCompany c
    ON c.company_id = tta.customer_id
LEFT JOIN project_qty pq
    ON pq.customer_id = tta.customer_id
LEFT JOIN pm_active_by_customer pac
    ON pac.customer_id = tta.customer_id
LEFT JOIN pm_last_inactive_by_customer plic
    ON plic.customer_id = tta.customer_id;