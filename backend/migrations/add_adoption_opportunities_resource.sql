-- Migration: Rename adoption.report_rebate_and_opportunities → adoption.opportunities
-- Module: Adoption Opportunities (formerly "Rebate & Opportunities")
-- Date: 2026-08-17

-- 1. Insert the new resource_key (if it does not already exist)
INSERT IGNORE INTO tbAuthResource (resource_key, resource_description, resource_module, resource_active)
VALUES (
    'adoption.opportunities',
    'Adoption Opportunities — SIP New Opportunities & Cisco EA tracking',
    'adoption',
    1
);

-- 2. Copy existing role grants from the old key to the new key
--    (grants roles that already had access to report_rebate_and_opportunities)
INSERT IGNORE INTO tbAuthRoleResource (role_id, resource_id)
SELECT arr.role_id, (SELECT resource_id FROM tbAuthResource WHERE resource_key = 'adoption.opportunities')
FROM tbAuthRoleResource arr
INNER JOIN tbAuthResource ar ON arr.resource_id = ar.resource_id
WHERE ar.resource_key = 'adoption.report_rebate_and_opportunities';

-- 3. Copy existing user-level grants (if the schema has tbAuthUserResource)
INSERT IGNORE INTO tbAuthUserResource (user_id, resource_id)
SELECT aur.user_id, (SELECT resource_id FROM tbAuthResource WHERE resource_key = 'adoption.opportunities')
FROM tbAuthUserResource aur
INNER JOIN tbAuthResource ar ON aur.resource_id = ar.resource_id
WHERE ar.resource_key = 'adoption.report_rebate_and_opportunities';

-- NOTE: The old resource_key 'adoption.report_rebate_and_opportunities' is kept
-- for backward compatibility. Remove it only after confirming all roles/users
-- have been migrated to the new key.
