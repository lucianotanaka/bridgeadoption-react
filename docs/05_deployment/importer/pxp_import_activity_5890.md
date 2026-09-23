# PXP Import Activity — Referência Técnica (5890)

> **Para:** Time de Implantação / Sustentação  
> **Arquivo:** `backend/app/services/importers/pxp_import_activity_5890.py`  
> **Fonte de importação (`importctrl_source`):** `PxpImportActivity5890`  
> **Última atualização:** 2026-09-04

---

## 1. Objetivo

Importa activities (atividades filhas) do programa Cisco LCI a partir de um arquivo Excel (.xlsx) gerado pela plataforma PXP da Cisco. Cada linha do arquivo representa uma atividade vinculada a um deal (negócio) e um cliente.

---

## 2. Repositórios utilizados

| Repositório | Uso |
|---|---|
| `TaskRepository` | Localizar e atualizar task pai |
| `TaskActivityRepository` | Criar, atualizar e buscar activities |
| `TaskHistoryRepository` | Registrar histórico de alterações |
| `CompanyListNameRepository` | Resolver `customer_id` a partir do nome da empresa |
| `ImportLogRepository` | Registrar erros funcionais na tabela `tbImportLog` (opcional) |
| `ImportControlRepository` | Atualizar progresso na tabela `tbImportControl` (opcional) |

---

## 3. Arquivo de entrada esperado

- **Formato:** `.xlsx`
- **Codificação:** UTF-8 implícita (openpyxl)
- **Primeira linha:** Cabeçalho com nomes de coluna

O arquivo é processado em **chunks de 1.000 linhas**. Cada linha processada é **removida do arquivo original** ao longo da execução — isso permite retomada parcial em caso de interrupção.

> Se alguma coluna obrigatória estiver **ausente no cabeçalho**, a execução falha imediatamente antes de processar qualquer linha.

### 3.1 Colunas obrigatórias

| Coluna | Descrição |
|---|---|
| `Track` | Área de tecnologia (ex: Identity Services Engine, Catalyst Center, Webex Suite) |
| `Sub-Track` | Sub-área (ex: Network Access Control) |
| `Activity Id` | Identificador único da activity na Cisco (WS-XXXXXXXX) |
| `CR Party ID` | ID do cliente no sistema Cisco |
| `Deal CR Party Name` | Nome do cliente |
| `Activity Type` | Tipo de fase (Onboard, Use, Engage, Adopt, Customer Success Plan, etc.) |
| `Activity Group` | Grupo da activity (LCI2.0 ou outro) |
| `Stage` | Status atual na Cisco (ex: Activity - Approved, Claim - Approved) |
| `Activity Start Date` | Data de início da atividade |
| `Activity Expiration Date` | Data de expiração |
| `Claim Approval Status` | Status do claim |
| `Claim Approved Amount` | Valor aprovado pela Cisco |
| `Claim Approved Amount (Currency)` | Moeda do valor aprovado |
| `Claim Submitted By` | Responsável pelo envio do claim |
| `Claim Submitted Date` | Data de envio do claim |
| `Deal ID` | ID do deal Cisco |
| `Activity Requested Amount` | Valor solicitado |
| `Activity Requested Amount (Currency)` | Moeda do valor solicitado |
| `Onboard Stage Completion Date` | Data de conclusão da fase Onboard |
| `Adopt Stage Completion Date` | Data de conclusão da fase Adopt |
| `Engage Stage Completion Date` | Data de conclusão da fase Engage |
| `Use Stage Completion Date` | Data de conclusão da fase Use |
| `Claim Approval Date` | Data de aprovação do claim pela Cisco |
| `L1 Claim Decision Date` | Data da decisão L1 do claim |

---

## 4. Regras de negócio

### 4.1 Cutoff de Fiscal Year (FY)

Activities com data de expiração (`Activity Expiration Date`) em FY menor ou igual a `FY_atual - 2` são **descartadas silenciosamente** (sem erro, sem entrada no arquivo de falhas).

**Exemplo com FY atual = FY2027 (Set/2026 a Jul/2027):**

| Expiração | FY calculado | Resultado |
|---|---|---|
| Qualquer data até Jul/2025 | FY2025 | ✅ Descartada silenciosamente |
| Ago/2025 a Jul/2026 | FY2026 | ⚠️ Gera erro no arquivo de falhas |
| Ago/2026 em diante | FY2027+ | ✅ Processada normalmente |

> O FY é calculado com base em Agosto como início do FY Cisco (ex: Ago/2026 = FY2027).

---

### 4.2 Determinação do tipo da task pai (LCI 1.0 vs LCI 2.0)

A busca pela task pai usa `task_tasktype_id`. A prioridade é determinada por:

| Condição | Prioridade de busca |
|---|---|
| `Track` = `Use Incentive` ou `Adopt Incentive` | `[21, 22]` — LCI 1.0 primeiro (legado) |
| `Activity Group` = `LCI2.0` | `[22]` — apenas LCI 2.0 |
| Demais casos (Activity Group vazio ou outro) | `[22, 21]` — LCI 2.0 primeiro |

> **Nota:** Track `Use Incentive` e `Adopt Incentive` identificam atividades do programa LCI 1.0 (legado). A Cisco substituiu este modelo pelo LCI 2.0 a partir de 2025, mas registros históricos ainda existem.

---

### 4.3 Busca da task pai

A task pai é localizada pelos seguintes campos (vindos da Cisco):

1. **Busca primária com tipo:** `task_cr_party_id` + `task_deal_id` + `task_track` + `task_subtrack` + `task_tasktype_id`
2. **Fallback sem tipo:** mesmos campos sem `task_tasktype_id` (aceita apenas 1 resultado único)

> `customer_id` interno **não é usado** como critério. O identificador confiável do cliente é o `cr_party_id` (vindo diretamente da Cisco).

---

### 4.4 Estratégia de identificação de activity existente

Antes de criar uma nova activity, o importador verifica se já existe uma correspondente:

1. **Busca por `activity_ws`** (coluna `Activity Id` do Excel) — chave primária lógica
2. **Fallback por combinação funcional** (quando não encontra por WS):
   - `activity_track` + `activity_sub_track` + `activity_deal_id` + `activity_name` + `activity_task_id`
   - Se encontrar via fallback e o `activity_ws` estiver vazio no banco, atualiza o WS automaticamente
   - Se encontrar um candidato com `activity_ws` igual ao `task_ws` da task pai, o candidato é **rejeitado** (registro inválido de importação anterior com bug)

---

### 4.5 Status da activity (mapeamento do Stage)

| Stage (Excel) | `activity_status` gravado | Observação |
|---|---|---|
| `Activity - Approved` | `2` (In Progress) | Se activity já existe com status > 1, não altera; se status = 1 (Open), atualiza para 2 |
| `Activity - Declined` | `5` (Declined) | |
| `Activity - Expired` | `6` (Expired) | |
| `Activity - Cancelled` | `4` (Cancelled) | |
| `Claim - Submitted` | `7` (Submitted) | |
| `Claim - Resubmitted` | `8` (Resubmitted) | |
| `Claim - Declined` | `5` (Declined) | |
| `Claim - Expired` | `6` (Expired) | |
| `Claim - Approved` | `10` (Closed) | Só fecha se status atual não for {4,5,6,10} |
| `Claim - Paid` | `10` (Closed) | Só fecha se status atual não for {4,5,6,10} |
| `Payment - Type*` | `10` (Closed) | Só fecha se status atual não for {4,5,6,10} |

---

### 4.6 Claim Approval Date

Quando `Claim Approval Date` está preenchida, aplica **independentemente do status atual** da activity:

| Campo | Regra |
|---|---|
| `activity_end_performed` | Substituído por `Claim Approval Date` se diferente |
| `activity_end_fy` | FY calculado (Apr-Mar) da `Claim Approval Date` |
| `activity_approval_fy` | FY calculado (Apr-Mar) da `Claim Approval Date` |
| `activity_approval_date` | Substituído por `Claim Approval Date` se vazio ou diferente |
| `activity_approved` | Definido como `1` se não estiver como `1` |
| `activity_completed` | Definido como `1` se diferente de `1` |

> Esta regra é aplicada **mesmo que a activity esteja com status 10 (Closed)**, pois reflete a data real de aprovação/pagamento pela Cisco.

---

### 4.7 Atualização de datas da task pai

Após processar cada activity, o importador atualiza as datas da task pai com base nas datas finais da activity:

| Condição | Ação na task |
|---|---|
| `task_start_performed` > `activity_start_performed` (ou task = None) | `task_start_performed = activity_start_performed` |
| `task_end_performed` < `activity_end_performed` (ou task = None) | `task_end_performed = activity_end_performed` |

> Objetivo: a task pai deve sempre refletir o intervalo mais amplo de suas activities filhas (início mais cedo e fim mais recente).

---

### 4.8 Deduplicação na origem

O importador evita criar activities duplicadas na mesma execução. Quando a mesma combinação de `(Activity Id, Track, Sub-Track, Deal ID, Activity Type)` aparece mais de uma vez no Excel, apenas a **primeira ocorrência** é processada.

---

## 5. Campos da tabela `tbTaskActivity` atualizados

| Campo | Fonte |
|---|---|
| `activity_task_id` | task pai localizada |
| `activity_ws` | coluna `Activity Id` |
| `activity_track` | coluna `Track` |
| `activity_sub_track` | coluna `Sub-Track` |
| `activity_deal_id` | coluna `Deal ID` |
| `activity_name` | coluna `Activity Type` |
| `activity_seq` | calculado (Onboard=1, Use=2, Engage=3, Adopt=4) |
| `activity_value` | coluna `Activity Requested Amount` |
| `activity_currency` | coluna `Activity Requested Amount (Currency)` |
| `activity_start` | coluna `Activity Start Date` |
| `activity_start_performed` | coluna `Activity Start Date` |
| `activity_end` | coluna `Activity Expiration Date` |
| `activity_end_performed` | `Claim Approval Date` (quando disponível) |
| `activity_end_fy` | FY calculado de `Claim Approval Date` |
| `activity_status` | mapeado do `Stage` |
| `activity_approved` | `1` quando fechada/aprovada |
| `activity_completed` | `0`, `0.75`, ou `1` conforme stage |
| `activity_approved_value` | coluna `Claim Approved Amount` |
| `activity_approval_date` | `Claim Approval Date` |
| `activity_approval_fy` | FY calculado de `Claim Approval Date` |
| `activity_approval_request_date` | coluna `Claim Submitted Date` |
| `activity_approved_value` | coluna `Claim Approved Amount` |

---

## 6. Campos da tabela `tbTask` atualizados

| Campo | Regra |
|---|---|
| `task_cr_party_id` | Atualizado com valor do Excel se tiver valor |
| `task_cr_party_name` | Atualizado com `Deal CR Party Name` se tiver valor |
| `task_start_performed` | Atualizado se activity tiver data mais cedo |
| `task_end_performed` | Atualizado se activity tiver data mais recente |
| `task_completed` | Recalculado como média de `activity_completed` de todas as activities da task |

---

## 7. Saídas geradas

| Arquivo | Localização | Conteúdo |
|---|---|---|
| Log de execução | `/home/bridgeadoption/storage/logs/{stem}.log` | Log detalhado linha a linha |
| Linhas com falha | `/home/bridgeadoption/storage/output/{stem}_failed_rows.xlsx` | Linhas não processadas com motivo |

### 7.1 Contadores no log final — `run_import()` retorna

```
FINISH status=FINISHED
  success=N              ← total de linhas processadas com sucesso (inclui ignoradas)
  error=N                ← linhas gravadas no arquivo de falhas
  ignored=N              ← linhas deduplicadas internamente na execução
  discarded_old_rows=N   ← linhas descartadas por FY antigo (silencioso)
  activities_created=N
  activities_updated=N
  tasks_updated=N
  remaining_rows_in_input=N  ← deve ser 0 ao final (confirma processamento completo)
  duration_seconds=N
  total_chunks=N
```

### 7.2 `tbImportLog`

Além do arquivo `.log`, erros funcionais são registrados na tabela `tbImportLog` com:

- Arquivo de origem
- Número da linha
- Mensagem de erro
- Coluna problemática
- Valor problemático
- Import source (`PxpImportActivity5890`)

Erros registrados: `No WS`, `TRACK is empty`, `SUBTRACK is empty`, `No Activity Type`, `No Deal Id`, `No CR Party ID`, `No TASK ID`, `No Customer name or Customer Id`, `Unexpected error`.

---

## 8. Pontos críticos para sustentação

| Comportamento | Descrição |
|---|---|
| ✅ FY antigo descartado silenciosamente | Activities com expiração ≤ FY atual - 2 não geram erro |
| ✅ Activity não retrocede status | Status só avança, nunca retrocede |
| ✅ Activity fechada não é alterada pelo Stage | Stages de fechamento ignorados se status já for {4,5,6,10} |
| ✅ `Activity - Approved` não altera se já existir com status > 1 | Só evolui de 1 → 2 |
| ✅ `Claim Approval Date` sempre atualiza datas de aprovação | Mesmo com status 10 (Closed) |
| ✅ `activity_ws` é chave primária lógica | Busca primária sempre por WS |
| ✅ `task_completed` recalculado dinamicamente | Média de todas as activities da task |
| ✅ Datas da task pai sincronizadas | Sempre refletem o intervalo mais amplo das activities |
| ✅ Linhas processadas removidas do arquivo original | Permite retomada parcial em caso de interrupção |
| ✅ Deduplicação na origem | Mesmo WS no mesmo arquivo: só a primeira ocorrência é processada |

---

## 9. Erros comuns no arquivo de falhas

| `import_error_message` | Causa | Solução |
|---|---|---|
| `No WS` | Coluna `Activity Id` vazia | Verificar arquivo — coluna obrigatória |
| `No TASK ID` | Task pai não encontrada para o deal+track+subtrack+cr_party_id | Importar task pai antes (pxp_import_task_6702.py) ou verificar se deal existe |
| `No Customer name or Customer Id` | `Deal CR Party Name` não cadastrado na `CompanyListName` e deal sem task associada | Cadastrar empresa ou importar tasks pai |
| `TRACK is empty` | Coluna `Track` vazia | Verificar arquivo |
| `SUBTRACK is empty` | Coluna `Sub-Track` vazia | Verificar arquivo |
| `No Activity Type` | Coluna `Activity Type` vazia ou não reconhecida | Verificar arquivo |
| `No Deal Id` | Coluna `Deal ID` vazia | Verificar arquivo |
| `No CR Party ID` | Coluna `CR Party ID` vazia | Verificar arquivo |
| `Mais de uma task encontrada` | Múltiplas tasks com mesmos parâmetros | Verificar duplicidade na tbTask — possível problema de import anterior |
| `Unexpected error: ...` | Erro inesperado em runtime | Verificar stack trace no log (.log) |

---

## 10. Diagnóstico rápido

### 10.1 Activities criadas mas sem task pai (No TASK ID)

```sql
-- Verificar se a task pai existe no banco
SELECT task_id, task_tasktype_id, task_cr_party_id, task_ws, task_deal_id, task_track, task_subtrack
FROM tbTask
WHERE task_cr_party_id = <CR_PARTY_ID>
  AND task_deal_id     = '<DEAL_ID>'
  AND task_track       = '<TRACK>'
  AND task_subtrack    = '<SUB_TRACK>';
```

Se não encontrar → a task pai ainda não foi importada. Execute o importador de tasks (`PxpImportTask6702`) primeiro.

### 10.2 Verificar activities existentes de um deal

```sql
SELECT
    ta.activity_id,
    ta.activity_ws,
    ta.activity_name,
    ta.activity_status,
    ta.activity_start_performed,
    ta.activity_end_performed,
    ta.activity_approval_date,
    ta.activity_completed
FROM tbTaskActivity ta
JOIN tbTask t ON t.task_id = ta.activity_task_id
WHERE t.task_deal_id = '<DEAL_ID>'
ORDER BY ta.activity_name, ta.activity_id;
```

### 10.3 Verificar activities duplicadas existentes no banco

```sql
SELECT
    activity_task_id,
    activity_ws,
    activity_deal_id,
    activity_name,
    activity_track,
    activity_sub_track,
    COUNT(*) AS CountActivity
FROM tbTaskActivity
WHERE activity_task_id > 0
  AND activity_status NOT IN (4, 5, 6, 10)
GROUP BY
    activity_task_id,
    activity_ws,
    activity_deal_id,
    activity_name,
    activity_track,
    activity_sub_track
HAVING COUNT(*) > 1;
```

### 10.4 Verificar datas da task pai após importação

```sql
SELECT
    task_id,
    task_ws,
    task_deal_id,
    task_start_performed,
    task_end_performed,
    task_completed
FROM tbTask
WHERE task_id = <TASK_ID>;
```

---

## 11. Pré-requisitos de execução

O importador de activities **depende** das tasks pai já estarem no banco. A sequência correta é:

1. **Primeiro:** importar `PxpImportTask6702` (tasks pai)
2. **Depois:** importar `PxpImportActivity5890` (activities filhas)

Se as tasks pai não existirem, as linhas de activities serão gravadas no arquivo de falhas com o erro `No TASK ID`.

---

## 12. Histórico de alterações relevantes

| Data | Alteração |
|---|---|
| 2026-09-04 | Cutoff alterado de `FY_atual - 1` para `FY_atual - 2` (activities do FY anterior agora geram erro em vez de serem descartadas silenciosamente) |
| 2026-09-04 | Busca da task pai simplificada: removida dependência de `customer_id` interno; uso direto de `cr_party_id` |
| 2026-09-04 | Nova lógica de prioridade de tipo (LCI 1.0 vs 2.0) baseada em `Track` e `Activity Group` |
| 2026-09-04 | `Activity - Approved` agora mapeia para `activity_status = 2` (In Progress) em vez de 1 (Open) |
| 2026-09-04 | Regra 1 ajustada: activities existentes com `status = 1` podem evoluir para `status = 2` via `Activity - Approved` |
| 2026-09-04 | Nova regra `Claim Approval Date`: atualiza datas da activity independentemente do status atual |
| 2026-09-04 | Nova regra: atualização de `task_start_performed` e `task_end_performed` da task pai baseada nas datas da activity filha |
| 2026-09-04 | Deduplicação de linhas na origem: evita criar activities duplicadas na mesma execução do Excel |

---

## 13. Referências

- Importador de tasks pai: [`pxp_import_task_6702.py`](../../../backend/app/services/importers/pxp_import_task_6702.py)
- Visão geral de implantação: [`importer_overview.md`](./importer_overview.md)
- Troubleshooting: [`importer_troubleshooting.md`](./importer_troubleshooting.md)
- Documentação de usuário do Importer: [`docs/09_usuarios/08_public/importer.md`](../../09_usuarios/08_public/importer.md)
