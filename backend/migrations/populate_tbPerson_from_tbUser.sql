-- ──────────────────────────────────────────────────────────────────────────
-- Migration: populate_tbPerson_from_tbUser.sql
-- Purpose:   Migra os usuários internos NTT de tbUser para tbPerson,
--            para que o formulário "Add Member" do Account Team possa
--            listar os membros disponíveis (source: tbPerson WHERE person_company_id IS NULL).
--
-- Regra:     user_company_id = 0  →  NTT interno  →  person_company_id IS NULL
--
-- Execução:  Idempotente — não insere duplicatas (verifica por e-mail).
-- ──────────────────────────────────────────────────────────────────────────

INSERT INTO tbPerson (
    person_name,
    person_email,
    person_company_id,
    person_enabled
)
SELECT
    COALESCE(NULLIF(TRIM(u.user_full_name), ''), u.user_name) AS person_name,
    u.user_email,
    NULL          AS person_company_id,   -- NULL = colaborador interno NTT
    1             AS person_enabled
FROM tbUser u
WHERE u.user_company_id = 0
  AND u.user_email   IS NOT NULL
  AND TRIM(u.user_email) != ''
  AND NOT EXISTS (
      SELECT 1
      FROM tbPerson p
      WHERE p.person_email         = u.user_email
        AND p.person_company_id IS NULL
  );

-- Resultado esperado:
--   Rows affected = número de usuários NTT ainda não presentes em tbPerson.
--   Execuções subsequentes: 0 rows affected (sem duplicatas).
