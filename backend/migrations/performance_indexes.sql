-- =============================================================
-- Bridge Adoption — Performance Indexes
-- Executar no MariaDB para otimizar queries das views principais
--
-- ANTES de executar:
-- 1. Fazer backup do banco
-- 2. Executar em horário de baixo uso (janela de manutenção)
-- 3. EXPLAIN nas views vwTaskDashboard e vwCiscoLCI para validar
--
-- Cada ALTER TABLE verifica se o índice já existe antes de criar.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- tbTask — base das views vwTaskDashboard, vwTask, vwFilterTask
-- ─────────────────────────────────────────────────────────────

-- Filtro por status + owner (query mais comum: dashboard por usuário)
ALTER TABLE tbTask
    ADD INDEX IF NOT EXISTS idx_task_status_owner (task_status_id, task_owner_id);

-- Follow-up date (cálculo de overdue e KPI de follow-up)
ALTER TABLE tbTask
    ADD INDEX IF NOT EXISTS idx_task_followup (next_followup_any_effective);

-- Task end date (cálculo de planned overdue)
ALTER TABLE tbTask
    ADD INDEX IF NOT EXISTS idx_task_end (task_end);

-- Finance type + status (agregações de revenue/expense)
ALTER TABLE tbTask
    ADD INDEX IF NOT EXISTS idx_task_finance_status (task_finance_type, task_status_id);

-- Customer filter (vwFilterTask)
ALTER TABLE tbTask
    ADD INDEX IF NOT EXISTS idx_task_customer (task_customer_id);

-- Owner + status + end (composite para dashboard por owner)
ALTER TABLE tbTask
    ADD INDEX IF NOT EXISTS idx_task_owner_status_end (task_owner_id, task_status_id, task_end);

-- ─────────────────────────────────────────────────────────────
-- tbTaskActivity — base de vwTaskActivityDashboard
-- ─────────────────────────────────────────────────────────────

-- Activity overdue (activity_end por task)
ALTER TABLE tbTaskActivity
    ADD INDEX IF NOT EXISTS idx_activity_task_end (activity_task_id, activity_end);

-- Activity end performed (overdue calculation)
ALTER TABLE tbTaskActivity
    ADD INDEX IF NOT EXISTS idx_activity_task_end_performed (activity_task_id, activity_end_performed);

-- ─────────────────────────────────────────────────────────────
-- Verificar índices criados
-- ─────────────────────────────────────────────────────────────
SHOW INDEX FROM tbTask WHERE Key_name LIKE 'idx_task_%';
SHOW INDEX FROM tbTaskActivity WHERE Key_name LIKE 'idx_activity_%';

-- ─────────────────────────────────────────────────────────────
-- EXPLAIN das queries críticas para validação
-- Substitua vwTaskDashboard pelo nome real da view no seu schema
-- ─────────────────────────────────────────────────────────────

-- Validar dashboard por owner:
-- EXPLAIN SELECT * FROM vwTaskDashboard WHERE task_owner_id = 10;

-- Validar dashboard manager (sem filtro de owner):
-- EXPLAIN SELECT * FROM vwTaskDashboard;

-- Habilitar slow query log para monitorar queries lentas (>1s):
-- SET GLOBAL slow_query_log = 'ON';
-- SET GLOBAL long_query_time = 1;
-- SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
