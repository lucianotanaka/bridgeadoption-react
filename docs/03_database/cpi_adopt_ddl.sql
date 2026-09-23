-- ============================================================
-- CPI Adopt Report — DDL e Query de Referência
-- Módulo: Cisco LCI / Bridge Adoption
-- ============================================================

-- Tabelas envolvidas:
--   tbTask, tbTaskActivity, tbProject, tbProjectTeam, tbPerson,
--   tbCompany, tbStatusType

-- ============================================================
-- tbTask
-- ============================================================
CREATE TABLE `tbTask` (
  `task_id` int(11) NOT NULL AUTO_INCREMENT,
  `task_tasktype_id` int(11) DEFAULT NULL,
  `task_reference` varchar(255) DEFAULT NULL,
  `task_owner_id` int(11) DEFAULT 0,
  `task_temp_owner_id` int(11) DEFAULT NULL,
  `task_customer_id` int(11) DEFAULT 0,
  `task_cr_party_id` varchar(100) DEFAULT '0',
  `task_cr_party_name` varchar(150) DEFAULT NULL,
  `task_customer_name` varchar(255) DEFAULT NULL,
  `task_created_in` datetime DEFAULT NULL,
  `task_created_by` int(11) DEFAULT 0,
  `task_priority` varchar(10) NOT NULL DEFAULT 'LOW',
  `task_project_id` int(11) DEFAULT 0,
  `task_status` int(11) NOT NULL DEFAULT 1,
  `task_status_justification` varchar(255) DEFAULT NULL,
  `task_start` date DEFAULT NULL,
  `task_end` date DEFAULT NULL,
  `task_start_performed` date DEFAULT NULL,
  `task_end_performed` date DEFAULT NULL,
  `task_value` decimal(30,6) DEFAULT 0.000000,
  `task_forecast` decimal(30,6) DEFAULT 0.000000,
  `task_backlog` decimal(30,6) DEFAULT 0.000000,
  `task_rate` decimal(6,4) DEFAULT 1.0000,
  `task_currency` varchar(3) DEFAULT 'USD',
  `task_ws` varchar(25) DEFAULT NULL,
  `task_deal_id` varchar(25) DEFAULT NULL,
  `task_track` text DEFAULT NULL,
  `task_subtrack` text DEFAULT NULL,
  `task_highlight` tinyint(1) DEFAULT 0,
  `task_remark` text DEFAULT NULL,
  `task_description` text DEFAULT NULL,
  `task_ea_flag` tinyint(1) NOT NULL DEFAULT 0,
  `task_telemetry_flag` tinyint(1) NOT NULL DEFAULT 0,
  `task_opt_in_flag` tinyint(1) NOT NULL DEFAULT 0,
  `task_completed` decimal(5,2) DEFAULT 0.00,
  `task_architecture` varchar(80) DEFAULT '-',
  `task_solution_domain` varchar(80) DEFAULT '-',
  `task_eligible` varchar(1) DEFAULT 'Y',
  `task_end_fy` int(4) DEFAULT NULL,
  `task_booking_date` date DEFAULT NULL,
  `task_booking_amount` decimal(30,6) DEFAULT 0.000000,
  PRIMARY KEY (`task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- ============================================================
-- tbTaskActivity
-- ============================================================
CREATE TABLE `tbTaskActivity` (
  `activity_id` int(11) NOT NULL AUTO_INCREMENT,
  `activity_task_id` int(11) DEFAULT NULL,
  `activity_seq` int(11) NOT NULL DEFAULT 1,
  `activity_name` varchar(255) DEFAULT NULL,
  `activity_objective` text DEFAULT NULL,
  `activity_scope` text DEFAULT NULL,
  `activity_expected_results` text DEFAULT NULL,
  `activity_effort` decimal(8,4) DEFAULT 0.0000,
  `activity_status` int(11) DEFAULT NULL,
  `activity_ws` varchar(25) DEFAULT NULL,
  `activity_deal_id` varchar(25) DEFAULT NULL,
  `activity_track` text DEFAULT NULL,
  `activity_sub_track` text DEFAULT NULL,
  `activity_value` decimal(20,6) DEFAULT NULL,
  `activity_currency` varchar(3) DEFAULT 'USD',
  `activity_start` date DEFAULT NULL,
  `activity_end` date DEFAULT NULL,
  `activity_start_performed` date DEFAULT NULL,
  `activity_end_performed` date DEFAULT NULL,
  `activity_effort_performed` decimal(8,4) DEFAULT 0.0000,
  `activity_completed` decimal(5,2) DEFAULT 0.00,
  `activity_approved` tinyint(1) DEFAULT 0,
  `activity_approved_value` decimal(20,6) DEFAULT 0.000000,
  `activity_approved_currency` varchar(3) DEFAULT 'USD',
  `activity_approval_date` date DEFAULT NULL,
  `activity_approval_request_date` date DEFAULT NULL,
  `activity_approval_fy` int(11) DEFAULT NULL,
  `activity_end_fy` int(11) DEFAULT NULL,
  `activity_backlog_value` decimal(10,4) DEFAULT 0.0000,
  `activity_create_at` datetime DEFAULT current_timestamp(),
  `activity_update_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`activity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- ============================================================
-- tbTaskRecord
-- ============================================================
CREATE TABLE `tbTaskRecord` (
  `taskrecord_id` int(11) NOT NULL AUTO_INCREMENT,
  `taskrecord_task_id` int(11) DEFAULT 0,
  `taskrecord_activity_id` int(11) DEFAULT 0,
  `taskrecord_project_id` int(11) DEFAULT 0,
  `taskrecord_measure_request_id` int(11) DEFAULT 0,
  `taskrecord_date` datetime NOT NULL,
  `taskrecord_remark` mediumtext DEFAULT NULL,
  `taskrecord_next_followup` date DEFAULT NULL,
  `taskrecord_updated_by` varchar(25) DEFAULT NULL,
  `taskrecord_status` varchar(10) DEFAULT NULL COMMENT 'DOING, PENDING, DONE',
  `taskrecord_type` varchar(20) DEFAULT 'INFO' COMMENT 'INFO, ISSUE, BLOCKER',
  PRIMARY KEY (`taskrecord_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- ============================================================
-- tbProject
-- ============================================================
CREATE TABLE `tbProject` (
  `project_id` int(11) NOT NULL AUTO_INCREMENT,
  `project_ov` varchar(255) DEFAULT NULL,
  `project_owner` varchar(80) DEFAULT 'PMO',
  `project_customer_id` int(11) NOT NULL DEFAULT 0,
  `project_customer_name` varchar(255) DEFAULT NULL,
  `project_name` text DEFAULT NULL,
  `project_internalization_date` date DEFAULT NULL,
  `project_start_date` date DEFAULT NULL,
  `project_end_date` date DEFAULT NULL,
  `project_status` varchar(30) DEFAULT NULL,
  `project_description` mediumtext DEFAULT NULL,
  `project_scope` text DEFAULT NULL,
  `project_objectives` text DEFAULT NULL,
  `project_current_scenario` text DEFAULT NULL,
  `project_key_feature_products` text DEFAULT NULL,
  `project_justification` text DEFAULT NULL,
  `project_remark` text DEFAULT NULL,
  `project_methodology` varchar(50) DEFAULT NULL,
  `project_action` varchar(50) DEFAULT NULL,
  `project_sprint_timebox` int(11) DEFAULT 0,
  `project_currency` varchar(3) DEFAULT 'BRL',
  `project_total_amount` decimal(18,2) DEFAULT 0.00,
  `project_total_amount_brl` decimal(18,2) DEFAULT 0.00,
  `project_planned_cost_subcontract_brl` decimal(18,2) DEFAULT 0.00,
  `project_planned_cost_subcontract_po_brl` decimal(18,2) DEFAULT 0.00,
  `project_planned_cost_pct_brl` decimal(18,2) DEFAULT 0.00,
  `project_planned_cost_brl` decimal(18,2) DEFAULT 0.00,
  `project_cost_final_value_brl` decimal(18,2) DEFAULT 0.00,
  PRIMARY KEY (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- ============================================================
-- tbProjectTeam
-- ============================================================
CREATE TABLE `tbProjectTeam` (
  `projteam_id` int(11) NOT NULL AUTO_INCREMENT,
  `projteam_project_id` int(11) DEFAULT NULL,
  `projteam_user_id` int(11) DEFAULT NULL,
  `projteam_person_id` int(11) DEFAULT NULL,
  `projteam_department_id` int(11) DEFAULT NULL,
  `projteam_level_id` int(11) DEFAULT NULL,
  `projteam_technical_lead` tinyint(1) DEFAULT 0,
  `projteam_working_time` int(11) DEFAULT NULL,
  `projteam_allocation_start` date DEFAULT NULL,
  `projteam_allocation_end` date DEFAULT NULL,
  PRIMARY KEY (`projteam_id`),
  CONSTRAINT `fk_projteam_person` FOREIGN KEY (`projteam_person_id`) REFERENCES `tbPerson` (`person_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- ============================================================
-- Query de referência para o CPI Adopt Report
-- Colunas: Task WS, Deal ID, CR Party ID, Client, Solution,
--          Use Case, Opt In, Total Amount (USD),
--          Approved Amount (USD), Remaining Balance (USD),
--          Task Start Expected, Task End Expected, Today,
--          Days Remaining, Task ID, Task Status, Project,
--          Project OV, Engineer, PM/CSM
-- Filtros: status NOT IN (4,5,6,10), tasktype IN (21,22),
--          task_ws NOT LIKE 'sub%'
-- ============================================================
SELECT
    t.task_ws                                         AS `Task WS`,
    t.task_deal_id                                    AS `Deal ID`,
    t.task_cr_party_id                                AS `CR Party ID`,
    c.company_name                                    AS `Client`,
    t.task_track                                      AS `Solution`,
    t.task_subtrack                                   AS `Use Case`,
    CASE
        WHEN t.task_opt_in_flag = 0 THEN 'No'
        ELSE 'Yes'
    END                                               AS `Opt In`,
    t.task_value                                      AS `Total Amount (USD)`,
    COALESCE(a.approved_amount, 0)                    AS `Approved Amount (USD)`,
    COALESCE(t.task_value, 0) - COALESCE(a.approved_amount, 0)
                                                      AS `Remaining Balance (USD)`,
    t.task_start                                      AS `Task Start Expected`,
    t.task_end                                        AS `Task End Expected`,
    CURDATE()                                         AS `Today`,
    DATEDIFF(t.task_end, CURDATE())                   AS `Days Remaining`,
    t.task_id                                         AS `Task ID`,
    s.statustype_name                                 AS `Task Status`,
    CASE
        WHEN p.project_ov IS NULL      THEN 'No'
        WHEN p.project_ov = 'ADOPTION' THEN 'Adoption'
        ELSE 'Yes'
    END                                               AS `Project`,
    CASE
        WHEN p.project_ov IS NULL      THEN ''
        WHEN p.project_ov = 'ADOPTION' THEN ''
        ELSE p.project_ov
    END                                               AS `Project OV`,
    pt.engineer                                       AS `Engineer`,
    pt.pm_csm                                         AS `PM/CSM`
FROM tbTask t
INNER JOIN tbCompany c
    ON c.company_id = t.task_customer_id
LEFT JOIN tbProject p
    ON p.project_id = t.task_project_id
INNER JOIN tbStatusType s
    ON s.statustype_id = t.task_status
/* Soma dos valores aprovados das atividades */
LEFT JOIN (
    SELECT
        activity_task_id,
        SUM(COALESCE(activity_approved_value, 0)) AS approved_amount
    FROM tbTaskActivity
    GROUP BY activity_task_id
) a ON a.activity_task_id = t.task_id
/* Integrantes do projeto */
LEFT JOIN (
    SELECT
        pt.projteam_project_id,
        GROUP_CONCAT(
            DISTINCT CASE
                WHEN pt.projteam_department_id NOT IN (31, 23, 11, 30)
                THEN pe.person_name
            END
            ORDER BY pe.person_name
            SEPARATOR ', '
        ) AS engineer,
        GROUP_CONCAT(
            DISTINCT CASE
                WHEN pt.projteam_department_id IN (11, 30)
                THEN pe.person_name
            END
            ORDER BY pe.person_name
            SEPARATOR ', '
        ) AS pm_csm
    FROM tbProjectTeam pt
    INNER JOIN tbPerson pe
        ON pe.person_id = pt.projteam_person_id
    INNER JOIN tbProject p2
        ON p2.project_id = pt.projteam_project_id
    GROUP BY pt.projteam_project_id
) pt ON pt.projteam_project_id = p.project_id
WHERE
    t.task_status NOT IN (4, 5, 6, 10)
    AND t.task_tasktype_id IN (21, 22)
    AND t.task_ws NOT LIKE 'sub%'
ORDER BY t.task_id;
