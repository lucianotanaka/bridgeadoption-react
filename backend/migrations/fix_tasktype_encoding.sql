-- =============================================================================
-- Fix encoding corrompido em tbTaskType (double-encoding UTF-8 → Latin-1)
-- Problema: nomes inseridos com conexão Latin-1 mas dados já eram UTF-8,
--           resultando em "AdoÃ§Ã£o" ao invés de "Adoção", etc.
-- Solução: re-interpreta os bytes Latin-1 armazenados como UTF-8 (CONVERT trick)
-- =============================================================================

-- Verificar quais registros estão com encoding corrompido (possui padrão "Ã" seguido de char especial)
SELECT tasktype_id, tasktype_name,
       CONVERT(CAST(CONVERT(tasktype_name USING latin1) AS BINARY) USING utf8mb4) AS tasktype_name_fixed
FROM tbTaskType
WHERE tasktype_name REGEXP 'Ã[§£³²µ¡¢¤¥¦¨©ª«¬®¯°±¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]';

-- Corrigir os nomes com encoding corrompido
UPDATE tbTaskType
SET tasktype_name = CONVERT(CAST(CONVERT(tasktype_name USING latin1) AS BINARY) USING utf8mb4)
WHERE tasktype_name REGEXP 'Ã[§£³²µ¡¢¤¥¦¨©ª«¬®¯°±¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]';

-- Verificar resultado após a correção
SELECT tasktype_id, tasktype_name FROM tbTaskType ORDER BY tasktype_name;
