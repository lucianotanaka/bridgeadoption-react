# cisco_subscription_ccw

## Visão Geral

O módulo `backend/app/services/importers/cisco_subscription_ccw.py` é o importador de subscrições **Cisco CCW (Commerce Workspace)**.

Ele é responsável por:

- Ler arquivos XLSX do diretório de input
- Resolver cliente (`End Customer`) e produto (`Offer Name`) por linha
- Criar registro na tabela `tbCiscoWebOrder` quando necessário
- Fazer upsert na tabela `tbCiscoEA`
- Criar tasks automaticamente para assinaturas elegíveis
- Tratar casos de **Over Consumed** com criação de task tipo 35 e activity
- Gerar arquivo XLSX com linhas com erro
- Remover do arquivo original todas as linhas lidas
- Gerar log de execução por arquivo

Este documento reflete **exatamente o comportamento atual do código** e deve ser considerado a fonte confiável para o time de sustentação e implantação.

---

## Arquitetura Técnica

### Localização

```
backend/app/services/importers/cisco_subscription_ccw.py
```

### Repositórios utilizados

| Repositório | Obrigatório | Finalidade |
|---|---|---|
| `CiscoEARepository` | Sim | Upsert em `tbCiscoEA` |
| `ProductRepository` | Sim | Busca e criação de produto por Offer Name |
| `CompanyListNameRepository` | Sim | Resolução de `end_customer_id` por nome |
| `ImportLogRepository` | Sim | Log funcional em `tbImportLog` |
| `TaskRepository` | Sim | Criação de tasks tipo 1 e 35 em `tbTask` |
| `TaskActivityRepository` | Sim | Criação de activities para tasks tipo 35 |
| `TaskHistoryRepository` | Sim | Registro de histórico em `tbTaskRecord` |
| `CiscoWebOrderRepository` | Sim | Busca e criação em `tbCiscoWebOrder` |
| `SubscriptionIgnoredRepository` | Sim | Verificação de subscriptions ignoradas |
| `ImportControlRepository` | Não | Atualização de progresso em `tbImportControl` |

---

## Arquivo de Entrada

### Formato

- XLSX
- Primeira linha obrigatoriamente contém o header

### Colunas obrigatórias

```
End Customer, Offer Name, Consumption Status, Over Consumed TF Groups,
TF Groups, True Forward Effective Date, Next True Forward,
Subscription ID, Status, Start Date, End Date, Initial Term,
Renewal Date, Currency, Monthly Charge, TF Overage,
Purchase Order Number, WebOrderID, Buying Program ID, Site URL,
Customer Success Manager, Customer Success Manager Email,
Primary Billing Contact Name, Primary Billing Contact Email,
Service To Contact Name, Service To Contact Email,
End Customer Contact Name, End Customer Contact Email,
End Customer Contact Phone, Order Submitted Date,
Smart Account Name, Renewal Manager, Renewal Manager Email,
Provisioning Status
```

### Colunas opcionais

```
Sales Specialist, Sales Specialist Email,
Pending True Forward Effective Date, Consumed Suite Value (%),
Exceptional Growth Anniversary, Exceptional Growth TF Eligible
```

> ℹ️ Colunas opcionais são incluídas no payload apenas quando presentes no arquivo de origem.

---

## Fluxo de Processamento por Linha

### 1. Validação do WebOrderID

- Coluna `WebOrderID` é normalizada e validada
- Valores inválidos: `n/a`, `na`, `none`, `null`, `-`, `--`, `0`, strings com menos de 3 caracteres
- Se inválido → linha falha

### 2. Resolução do Cliente

- Coluna `End Customer` é normalizada (espaços colapsados)
- Busca via `CompanyListNameRepository.get_company_id_by_name()`
- Se não encontrado:
  - Gera sugestão via `generate_and_store_suggestions()`
  - Linha falha

### 3. Resolução / Criação de WebOrder

- Busca `tbCiscoWebOrder` por `weborder_number + customer_id`
- Se não existir → cria novo registro em `tbCiscoWebOrder`
- Se falhar ao criar → linha falha

### 4. Resolução / Criação de Produto

- Coluna `Offer Name` é usada como nome de produto
- Busca via `find_ids_by_name_or_partnumber()` com `product_vendor_id = 1`
- Se não existir → cria produto automaticamente com:
  - `product_vendor_id = 1`
  - `product_name = Offer Name`
  - `product_part_number = Offer Name`
- Se produto não puder ser resolvido → linha falha

### 5. Construção do Payload

Campos mapeados da linha para `tbCiscoEA`:

| Coluna Excel | Campo banco |
|---|---|
| `End Customer` | `ea_end_customer_id` |
| `Offer Name` | `ea_product_id` |
| `WebOrderID` | `ea_web_order_id` |
| `Consumption Status` | `ea_consumption_status` |
| `Subscription ID` | `ea_subscription_id` |
| `Status` | `ea_ccw_line_status` |
| `Start Date` | `ea_start_date` |
| `End Date` | `ea_end_date` |
| `Renewal Date` | `ea_renewal_date` |
| `Monthly Charge` | `ea_mrc` |
| `TF Overage` | `ea_tf_overage` |
| `Currency` | `ea_currency` |
| `True Forward Effective Date` | `ea_tf_effective_date` |
| `Next True Forward` | `ea_next_tf` |
| `Purchase Order Number` | `ea_po` |
| `Smart Account Name` | `ea_smart_account_name` |
| `Provisioning Status` | `ea_provisioning_status` |
| ... | ... (demais campos mapeados) |

### 6. Upsert na tbCiscoEA

Chave de busca:
```
ea_web_order_id, ea_end_customer_id, ea_product_id,
ea_start_date, ea_end_date, ea_renewal_date, ea_subscription_id
```

- Se existir → UPDATE de todos os campos do payload
- Se não existir → INSERT

---

## Regras de Criação de Task

### Task tipo 1 — New CISCO EA

Criada quando:
- EA é **novo** (INSERT, não UPDATE)
- Subscription **não está na lista de ignoradas**
- `Offer Name` for um dos valores: `EA3-M`, `ELA2-M`, `A-FLEX`, `A-FLEX-3`

Campos da task:

| Campo | Valor |
|---|---|
| `task_tasktype_id` | `1` |
| `task_status` | `1` (OPEN) |
| `task_priority` | `LOW` |
| `task_customer_id` | `end_customer_id` |
| `task_owner_id` | último CSM alocado para o cliente (ou `0`) |
| `task_ws` | `Subscription ID` |
| `task_track` | `Offer Name` (UPPER) |
| `task_subtrack` | `Offer Name` (UPPER) |
| `task_reference` | `Subscription ID + PO + WebOrderID` |
| `task_start` | data atual |
| `task_end` | data atual + 45 dias |
| `task_eligible` | `"Y"` |

Após criação:
- Atualiza `ea_new_task_id` no registro EA
- Registra histórico: `"Task created at <data>"` com followup em +45 dias

---

### Task tipo 35 — Over Consumed

Criada quando:
- `Consumption Status = OVER CONSUMED`
- Subscription **não está na lista de ignoradas**
- Nenhuma task existente for encontrada para o contexto

**Busca de task existente:**

O código tenta encontrar task existente pela combinação de:
- `task_customer_id`
- `task_ws = Subscription ID`
- referências candidatas: `Next True Forward`, `Subscription ID`, `PO`, `WebOrderID`
- track: `Offer Name` + `Over Consumed TF Groups`
- subtrack: `TF Groups`

Se task existente encontrada:
- Atualiza `task_track` e `task_subtrack` via union (sem duplicatas)
- Se houve mudança → `task_status = 2` (In Progress)
- Verifica necessidade de nova activity

Se task **não** encontrada:

Campos da nova task:

| Campo | Valor |
|---|---|
| `task_tasktype_id` | `35` |
| `task_status` | `1` (OPEN) |
| `task_priority` | `HIGH` |
| `task_highlight` | `1` |
| `task_ws` | `Subscription ID` |
| `task_track` | `Offer Name + Over Consumed TF Groups` |
| `task_subtrack` | `TF Groups` |
| `task_value` | `Monthly Charge` |
| `task_end` | calculado por regra de TF (ver abaixo) |

**Cálculo da data de fim:**
- Se `True Forward Effective Date` existir e for futuro → `data_tf - 7 dias`
- Senão, se `Next True Forward` existir → `data_next_tf - 14 dias`
- Senão → `data atual + 30 dias`

Activity criada junto com a task:
- `activity_name = "Over Consumed: <Offer Name>"`
- `activity_status = 1` (OPEN)
- mesmos track/subtrack/datas da task

Histórico registrado:
- Na task: `"Task created at <data>"` + followup em +30 dias
- Na activity: `"Activity created at <data>"` + followup em +7 dias

---

## Subscription Ignorada

Se `Subscription ID` estiver na tabela `tbSubscriptionIgnored` para o cliente:
- O fluxo de criação de task **é pulado** (tanto tipo 1 quanto tipo 35)
- O registro EA ainda é inserido/atualizado normalmente

---

## Processamento Operacional

### Estratégia

- `CHUNK_SIZE = 2000`
- Processa de baixo para cima dentro do chunk
- Remove cada linha processada com `ws.delete_rows()`
- Salva workbook após cada chunk

### Arquivos gerados

| Arquivo | Local |
|---|---|
| Log de execução | `storage/logs/<nome-arquivo>.log` |
| Linhas com erro | `storage/output/<nome-arquivo>_failed_rows.xlsx` |

O arquivo de falhas **só é criado** se houver ao menos uma linha com erro.

### Arquivo de falhas

Contém:
- Todas as colunas originais da linha
- `import_error_message`
- `import_error_column`
- `import_error_value`
- `import_original_row`
- `import_processed_at`
- `import_source`
- `import_original_file`

---

## Logs

### Log de execução (arquivo texto)

Eventos registrados:
- `START` / `FINISH`
- `INFO` por chunk (início, fim, métricas)
- `INFO` por linha: EA inserido/atualizado, WebOrder criada, task criada, activity criada
- `WARN` para alertas não críticos (cliente não encontrado, sugestão gerada, WebOrder não localizada)
- `ERROR` para falhas por linha com contexto

### tbImportLog

Registra erros funcionais por linha via `repo_log.create()`.

### tbTaskRecord

Registrado quando:
- Task tipo 1 criada
- Task tipo 35 criada ou atualizada
- Activity criada
- Activity ou task reaberta com tracks atualizados

---

## Métricas de Retorno

`run_import()` retorna:

| Campo | Descrição |
|---|---|
| `status` | `FINISHED` ou `FAILED` |
| `message` | Mensagem consolidada |
| `total_rows` | Total de linhas no arquivo |
| `imported_rows` | Linhas processadas com sucesso |
| `error_rows` | Linhas com erro |
| `failed_file_path` | Caminho do arquivo de falhas |
| `remaining_rows_in_input` | Linhas restantes no arquivo de entrada |
| `execution_log_path` | Caminho do log de execução |
| `duration_seconds` | Tempo total de execução |
| `total_chunks` | Total de chunks processados |

---

## Pontos Críticos para Sustentação

| # | Regra |
|---|---|
| 1 | `WebOrderID` é obrigatório e deve ser válido (mín. 3 chars, não pode ser `n/a` etc.) |
| 2 | Cliente é resolvido por `End Customer` — se não encontrar, gera sugestão e falha |
| 3 | Produto é criado automaticamente se não existir |
| 4 | WebOrder é criada automaticamente se não existir |
| 5 | Task tipo 1 só é criada em INSERT de EA (não em UPDATE) |
| 6 | Task tipo 1 só é criada para Offer Names: `EA3-M`, `ELA2-M`, `A-FLEX`, `A-FLEX-3` |
| 7 | Task tipo 35 é criada para `OVER CONSUMED` somente se não houver task existente |
| 8 | Subscriptions em `tbSubscriptionIgnored` não geram tasks (EA é inserido/atualizado normalmente) |
| 9 | Track e subtrack de Over Consumed são atualizados por union (sem duplicatas) |
| 10 | Arquivo de entrada é **modificado** — guarde cópia antes de rodar |
| 11 | Arquivo de falhas só é criado se houver ao menos uma linha com erro |
| 12 | `Consumed Suite Value (%)` é dividido por 100 ao ser gravado no banco |

---

## Resumo Executivo

O importador Cisco Subscription CCW é o mais complexo do sistema — envolve múltiplas tabelas e lógica de criação condicional de tasks.

Principais comportamentos:

- Resolve e cria automaticamente WebOrder, produto e task quando necessário
- Faz upsert em `tbCiscoEA` por chave composta de 6 campos
- Cria task tipo 1 (New CISCO EA) para novas subscrições elegíveis por Offer Name
- Cria task tipo 35 (Over Consumed) com alta prioridade e activity vinculada
- Atualiza tracks existentes por union quando task já existe para Over Consumed
- Subscription ignorada bloqueia criação de tasks mas não o insert/update do EA
- Remove linhas processadas do arquivo de entrada
- Gera arquivo de falhas com contexto completo por linha
