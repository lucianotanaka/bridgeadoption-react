# Database — Módulo Projects

> **Última atualização:** 2026-08-26  
> **Audiência:** Time de implementação e sustentação

---

## Tabelas e Views envolvidas

| Objeto | Tipo | Descrição |
|---|---|---|
| `tbProject` | Tabela | Dados principais do projeto |
| `tbProjectOV` | Tabela | OVs individualizadas (N:1 com tbProject) |
| `tbProjectTeam` | Tabela | Membros da equipe por projeto |
| `tbDepartment` | Tabela | Departamentos (select Owner no formulário) |
| `tbResourceLevel` | Tabela | Níveis de recurso (select Level no formulário de equipe) |
| `tbPerson` | Tabela | Pessoas disponíveis para equipe |
| `vwProject` | View | Join tbProject + tbCompany para leitura |
| `vwProjectTeam` | View | Join tbProjectTeam + tbPerson + tbDepartment + tbResourceLevel |

---

## DDL — tbProject (campos relevantes)

```sql
-- Campos editáveis pelo formulário React (whitelist do update_project)
-- Campos principais
project_id                          int AUTO_INCREMENT PRIMARY KEY
project_ov                          varchar(80)    -- ex: "#68924_#69056" ou "81584_81901"
project_name                        varchar(255)
project_owner                       varchar(80)    -- geralmente "PMO" ou nome do departamento
project_customer_id                 int            -- FK → tbCompany.company_id
project_customer_name               varchar(255)
project_status                      varchar(50)    -- ex: "In progress", "Not started"
project_methodology                 varchar(100)   -- ex: "Agile", "PMBOK (PMI)"
project_action                      varchar(255)

-- Datas
project_internalization_date        date
project_start_date                  date
project_end_date                    date

-- Campos de descrição (TEXT)
project_description                 text
project_scope                       text
project_objectives                  text
project_current_scenario            text
project_key_feature_products        text
project_justification               text
project_remark                      text

-- Campos financeiros
project_currency                    varchar(10)    -- "BRL", "USD", "EUR"
project_sprint_timebox              int
project_total_amount                decimal(15,2)
project_total_amount_brl            decimal(15,2)
project_planned_cost_subcontract_brl    decimal(15,2)
project_planned_cost_subcontract_po_brl decimal(15,2)
project_planned_cost_pct_brl        decimal(15,2)
project_planned_cost_brl            decimal(15,2)
project_cost_final_value_brl        decimal(15,2)
```

**Verificar estrutura real:**
```sql
SHOW COLUMNS FROM tbProject;
```

---

## DDL — tbProjectOV

```sql
CREATE TABLE `tbProjectOV` (
  `ov_id`         int(11) NOT NULL AUTO_INCREMENT,
  `ov_project_id` int(11) NOT NULL DEFAULT 0,
  `ov_project_ov` varchar(20) NOT NULL,
  PRIMARY KEY (`ov_id`),
  UNIQUE KEY `tbProjectOV_ov_project_id_IDX` (`ov_project_id`,`ov_project_ov`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=3620 DEFAULT CHARSET=utf8;
```

**Relacionamento:**
- `ov_project_id = 0` → slot vago (reaproveitado pelo `_sync_tbprojectov`)
- `ov_project_id > 0` → FK para `tbProject.project_id`
- `ov_project_ov` → OV individual normalizada (sem `#`, sem espaços)

**Exemplos:**
```sql
-- OV composta "#68924_#69056" gera 2 registros:
INSERT INTO tbProjectOV (ov_project_id, ov_project_ov) VALUES (2511, '68924');
INSERT INTO tbProjectOV (ov_project_id, ov_project_ov) VALUES (2511, '69056');
```

**Consultas de diagnóstico:**
```sql
-- OVs de um projeto
SELECT * FROM tbProjectOV WHERE ov_project_id = 2511;

-- Encontrar projeto por OV
SELECT ov_project_id FROM tbProjectOV WHERE ov_project_ov = '68924' LIMIT 1;

-- Slots vagos disponíveis
SELECT COUNT(*) FROM tbProjectOV WHERE ov_project_id = 0;
```

---

## DDL — tbProjectTeam

```sql
CREATE TABLE `tbProjectTeam` (
  `projteam_id`               int(11) NOT NULL AUTO_INCREMENT,
  `projteam_project_id`       int(11) DEFAULT NULL,
  `projteam_person_id`        int(11) DEFAULT NULL,
  `projteam_department_id`    int(11) DEFAULT NULL,
  `projteam_level_id`         int(11) DEFAULT NULL,
  `projteam_technical_lead`   tinyint(1) DEFAULT 0,
  `projteam_working_time`     int(11) DEFAULT NULL,
  `projteam_allocation_start` date DEFAULT NULL,
  `projteam_allocation_end`   date DEFAULT NULL,
  PRIMARY KEY (`projteam_id`),
  KEY `idx_projteam_project_person` (`projteam_project_id`,`projteam_person_id`),
  KEY `fk_projteam_person` (`projteam_person_id`),
  CONSTRAINT `fk_projteam_person` FOREIGN KEY (`projteam_person_id`) 
    REFERENCES `tbPerson` (`person_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12484 DEFAULT CHARSET=utf8;
```

**FKs:**
| Campo | Referência |
|---|---|
| `projteam_project_id` | `tbProject.project_id` |
| `projteam_person_id` | `tbPerson.person_id` (CONSTRAINT FK) |
| `projteam_department_id` | `tbDepartment.department_id` |
| `projteam_level_id` | `tbResourceLevel.level_id` |

**Consultas de diagnóstico:**
```sql
-- Equipe completa de um projeto com joins
SELECT
    pt.projteam_id,
    p.person_name,
    p.person_email,
    d.department_name,
    l.level_name,
    l.level_type,
    pt.projteam_technical_lead,
    pt.projteam_working_time,
    pt.projteam_allocation_start,
    pt.projteam_allocation_end
FROM tbProjectTeam pt
LEFT JOIN tbPerson p ON p.person_id = pt.projteam_person_id
LEFT JOIN tbDepartment d ON d.department_id = pt.projteam_department_id
LEFT JOIN tbResourceLevel l ON l.level_id = pt.projteam_level_id
WHERE pt.projteam_project_id = 2511
ORDER BY p.person_name;

-- Membros sem pessoa vinculada (inconsistência)
SELECT pt.projteam_id, pt.projteam_project_id, pt.projteam_person_id
FROM tbProjectTeam pt
LEFT JOIN tbPerson p ON p.person_id = pt.projteam_person_id
WHERE p.person_id IS NULL AND pt.projteam_person_id IS NOT NULL;
```

---

## DDL — tbDepartment

```sql
CREATE TABLE `tbDepartment` (
  `department_id`           int(11) NOT NULL AUTO_INCREMENT,
  `department_name`         varchar(100) DEFAULT NULL,
  `department_pctadmin`     varchar(50) DEFAULT NULL,
  `department_pctworksheet` varchar(50) DEFAULT NULL,
  `department_area`         varchar(20) DEFAULT NULL,
  PRIMARY KEY (`department_id`)
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8;
```

**Consulta usada pela API:**
```sql
SELECT department_id, department_name
FROM tbDepartment
WHERE department_name IS NOT NULL AND department_name <> ''
ORDER BY department_name;
```

---

## DDL — tbResourceLevel

```sql
CREATE TABLE `tbResourceLevel` (
  `level_id`       int(11) NOT NULL AUTO_INCREMENT,
  `level_name`     varchar(50) DEFAULT NULL,
  `level_ratecard` varchar(3) DEFAULT NULL,
  `level_type`     varchar(20) DEFAULT NULL,
  PRIMARY KEY (`level_id`)
) ENGINE=InnoDB AUTO_INCREMENT=68 DEFAULT CHARSET=latin1;
```

**Consulta usada pela API:**
```sql
SELECT level_id, level_name, level_type
FROM tbResourceLevel
WHERE level_name IS NOT NULL AND level_name <> ''
ORDER BY level_name;
```

**Distribuição por tipo (diagnóstico):**
```sql
SELECT level_type, COUNT(*) AS total
FROM tbResourceLevel
WHERE level_name IS NOT NULL
GROUP BY level_type
ORDER BY total DESC;
```

---

## View vwProject

A view une `tbProject` com `tbCompany` para fornecer `project_customer_name` e calcular `project_ov_name`.

**Verificar definição:**
```sql
SHOW CREATE VIEW vwProject\G
```

**Campos principais:**
| Campo | Fonte | Descrição |
|---|---|---|
| `project_id` | `tbProject` | PK |
| `project_ov` | `tbProject` | OV composta original |
| `project_ov_name` | Calculado | `(OV #XXXXX) Nome do Projeto` |
| `project_customer_name` | `tbCompany.company_name` | Nome do cliente |
| Demais campos | `tbProject` | Todos os campos da tabela |

**Diagnóstico:**
```sql
-- Contagem por status
SELECT project_status, COUNT(*) AS total
FROM vwProject
GROUP BY project_status ORDER BY total DESC;

-- Projetos sem OV individual em tbProjectOV (possível inconsistência)
SELECT p.project_id, p.project_ov
FROM tbProject p
WHERE p.project_ov NOT LIKE 'VAGO%'
  AND NOT EXISTS (
    SELECT 1 FROM tbProjectOV ov
    WHERE ov.ov_project_id = p.project_id
  )
LIMIT 20;
```

---

## View vwProjectTeam

Une `tbProjectTeam` com `tbPerson`, `tbDepartment`, `tbResourceLevel` e `tbProject`.

**Verificar definição:**
```sql
SHOW CREATE VIEW vwProjectTeam\G
```

**Campos relevantes retornados:**
| Campo | Fonte |
|---|---|
| `projteam_id` | `tbProjectTeam` |
| `projteam_project_id` | `tbProjectTeam` |
| `projteam_member_name` | `tbPerson.person_name` |
| `projteam_level_name` | `tbResourceLevel.level_name` |
| `projteam_department_name` | `tbDepartment.department_name` |
| `projteam_technical_lead` | `tbProjectTeam` |
| `projteam_working_time` | `tbProjectTeam` |
| `projteam_allocation_start` | `tbProjectTeam` |
| `projteam_allocation_end` | `tbProjectTeam` |

---

## Consultas de monitoramento

```sql
-- Projetos criados/editados recentemente (se tbProject tiver campo de data de modificação)
SELECT project_id, project_ov, project_name, project_status, project_customer_name
FROM vwProject
ORDER BY project_id DESC
LIMIT 20;

-- Últimos membros adicionados
SELECT pt.projteam_id, pt.projteam_project_id, p.person_name,
       pt.projteam_allocation_start, pt.projteam_allocation_end
FROM tbProjectTeam pt
LEFT JOIN tbPerson p ON p.person_id = pt.projteam_person_id
ORDER BY pt.projteam_id DESC
LIMIT 20;

-- Projetos com mais membros na equipe
SELECT p.project_name, p.project_ov, COUNT(pt.projteam_id) AS team_size
FROM tbProject p
JOIN tbProjectTeam pt ON pt.projteam_project_id = p.project_id
GROUP BY p.project_id
ORDER BY team_size DESC
LIMIT 10;

-- Verificar integridade: OVs sem projeto correspondente
SELECT ov.ov_id, ov.ov_project_id, ov.ov_project_ov
FROM tbProjectOV ov
LEFT JOIN tbProject p ON p.project_id = ov.ov_project_id
WHERE ov.ov_project_id > 0 AND p.project_id IS NULL;
