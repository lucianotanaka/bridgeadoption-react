-- Migration: Register cisco.cpi_adopt resource in tbAuthResource
-- Run once on the production database so that:
--   1. ADMIN users see it in load_admin_permissions() (all active resources)
--   2. The Admin UI (Admin → Roles → Permissions) can grant it to non-ADMIN users
--
-- After running, go to Admin → Roles → pick the role → add permission
-- for resource_key = 'cisco.cpi_adopt' with action = 'view' (or 'full').
--
-- MySQL-compatible (idempotent via INSERT IGNORE).

-- 1. Insert resource (idempotent — skips if resource_key already exists)
INSERT IGNORE INTO tbAuthResource (resource_key, resource_name, resource_icon, is_active, show_in_menu)
VALUES (
    'cisco.cpi_adopt',
    'CPI Adopt',
    'chart-bar',
    1,
    1
);

-- 2. Verify
SELECT resource_id, resource_key, resource_name, resource_icon, is_active, show_in_menu
FROM tbAuthResource
WHERE resource_key = 'cisco.cpi_adopt';
