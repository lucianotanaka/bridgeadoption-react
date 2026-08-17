-- Migration: Add tbAuthResource record for Portfolio Cisco EA module
-- resource_key : portfolio.cisco_enterprise_agreement
-- resource_name: Cisco EA
-- Created     : 2026-08-16

INSERT INTO tbAuthResource (resource_key, resource_name, resource_icon, resource_is_active)
VALUES ('portfolio.cisco_enterprise_agreement', 'Cisco EA', 'FileText', 1);
