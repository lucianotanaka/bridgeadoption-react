# cisco_smart_account_usage_fetcher

## Visão Geral

O módulo `backend/app/services/importers/cisco_smart_account_usage_fetcher.py` é o importador de uso/licenciamento **Cisco Smart Account**.

Ele é responsável por:

- Ler arquivos XLSX do diretório de input
- Consolidar globalmente linhas do tipo `quantity` por chave lógica
- Processar individualmente linhas do tipo `metering`
- Fazer upsert na tabela `tbCiscoSmartAccountMetering`
- Gerar arquivo XLSX com linhas com erro
- Remover do arquivo original todas as linhas processadas
- Gerar log de execução por arquivo
- Controlar execução concorrente via lock de arquivo

Este documento reflete **exatamente o comportamento atual do código** e deve ser considerado a fonte confiável para o time de sustentação e implantação.

---

## Arquitetura Técnica

### Localização

```
backend/app/services/importers/cisco_smart_account_usage_fetcher.py
```

### Repositórios utilizados

| Repositório | Obrigatório | Finalidade |
|---|---|---|
| `CiscoSARepository` | Sim | Upsert em `tbCiscoSmartAccountMetering` |
| `ProductRepository` | Sim | Busca e criação de produto por License |
| `CompanyListNameRepository` | Sim | Resolução de `client_id` a partir do nome do cliente |
| `ImportLogRepository` | Sim | Log funcional em `tbImportLog` |
| `ImportControlRepository` | Não | Atualização de progresso em `tbImportControl` |

---

## Arquivo de Entrada

### Formato

- XLSX
- Primeira linha obrigatoriamente contém o header

### Colunas mapeadas

| Coluna | Tipo | Campo destino |
|---|---|---|
| `Client` | Obrigatória | `mcsa_client_id` / `mcsa_client` |
| `License` | Obrigatória | `mcsa_product_id` / `mcsa_license` |
| `Domain` | Opcional | `mcsa_domain` |
| `Virtual Account` | Opcional | `mcsa_virtual_account` |
| `Billing` | Opcional | `mcsa_billing` |
| `License Type` | Opcional | `mcsa_license_type` |
| `Subscription Id` | Opcional | `mcsa_subscription` |
| `Start Date` | Chave quantity/metering | `mcsa_start_date` |
| `End Date` | Chave quantity/metering | `mcsa_end_date` |
| `Quantity` | quantity | `mcsa_quantity` |
| `Available To Use` | metering | `mcsa_available_to_use` |
| `In Use` | metering | `mcsa_in_use` |
| `Balance` | metering | `mcsa_balance` |
| `Compliance` | Opcional | `mcsa_compliance` |
| `Active` | Opcional | `mcsa_active` |
| `Days To End` | Opcional | `mcsa_days_to_end` |

---

## Regras de Negócio

### Separação quantity vs. metering

A Cisco não diferencia explicitamente os tipos — essa separação é uma regra da aplicação:

| Tipo | Critério |
|---|---|
| `quantity` | Linha com campo `Quantity` preenchido |
| `metering` | Linha com pelo menos um dos campos `Available To Use`, `In Use` ou `Balance` preenchido |
| Ambos | Uma mesma linha pode gerar `quantity` **e** `metering` |

---

### 1. Quantity — Consolidação Global

- A origem pode trazer várias linhas equivalentes que devem ser consolidadas em **um único registro**
- Consolidação ocorre em memória **antes** de qualquer acesso ao banco
- A consolidação é global (todo o arquivo), não por chunk

**Chave lógica de agrupamento:**

```
(customer_id, Domain, License, Virtual Account, Billing, License Type, Subscription Id, Start Date, End Date)
```

> ⚠️ `Active` e `Compliance` **não entram na chave** — são carregados da linha representativa do grupo.
> ⚠️ Datas fazem parte da chave — registros com datas diferentes são grupos distintos.

**Resultado do agrupamento:**
- A coluna `Quantity` é somada para todas as linhas do grupo
- Resultado gravado em `mcsa_quantity`

**Exemplo:**
4 linhas com a mesma chave e `Quantity = 1` cada → 1 registro com `mcsa_quantity = 4`.

---

### 2. Metering — Processamento Individual

- Uma linha elegível para metering gera 1 registro (sem consolidação)
- Cada linha é processada individualmente

---

### 3. Resolução de Cliente

- Coluna `Client` é normalizada: acentos removidos, convertida para UPPER
- Busca via `CompanyListNameRepository.get_company_id_by_name()`
- Cache por nome para evitar consultas repetidas
- Se não encontrado → grupo/linha falha

### 4. Resolução de Produto

- Coluna `License` é usada para busca em `ProductRepository`
- Filtro: `product_vendor_id = 1` + `product_name = License`
- Se não existir → produto é criado automaticamente com:
  - `product_vendor_id = 1`
  - `product_name = License`
  - `product_part_number = License`
- Cache por nome para evitar consultas repetidas

---

### 5. Regra de Upsert

#### Quantity

Chave de busca no banco:
```
mcsa_row_type = "quantity"
mcsa_client_id, mcsa_domain, mcsa_product_id, mcsa_license,
mcsa_virtual_account, mcsa_billing, mcsa_license_type,
mcsa_subscription, mcsa_start_date, mcsa_end_date
```

- Se não existir → INSERT
- Se existir → UPDATE dos campos:
  - `mcsa_compliance`, `mcsa_quantity`, `mcsa_active`, `mcsa_days_to_end`, `mcsa_update`
  - Se `mcsa_quantity` mudou → `mcsa_track = 0`

#### Metering

Chave de busca no banco:
```
mcsa_row_type = "metering"
mcsa_client_id, mcsa_domain, mcsa_product_id, mcsa_license,
mcsa_virtual_account, mcsa_subscription, mcsa_start_date, mcsa_end_date
```

- Se não existir → INSERT
- Se existir → UPDATE dos campos:
  - `mcsa_available_to_use`, `mcsa_in_use`, `mcsa_balance`
  - `mcsa_compliance`, `mcsa_active`, `mcsa_days_to_end`, `mcsa_update`

---

## Processamento Operacional

### Estratégia

1. Lê o arquivo Excel **uma única vez** em memória (`read_only=True`)
2. Consolida quantity globalmente em memória
3. Persiste quantity (INSERT/UPDATE por grupo)
4. Persiste metering individualmente (INSERT/UPDATE por linha)
5. Determina linhas lidas (sucesso + falha)
6. Persiste arquivo de falhas
7. Regrava arquivo original com linhas remanescentes

### Lock de Arquivo

- Um arquivo `.lock` é criado em `storage/locks/` por arquivo processado
- Impede execuções simultâneas do mesmo arquivo
- Lock é liberado no bloco `finally`
- Conteúdo do lock: `pid=<pid> created_at=<timestamp>`

### Proteções de Performance

Projetado para arquivos grandes (50k+ linhas):

| Proteção | Descrição |
|---|---|
| Leitura única | Excel é lido uma única vez |
| Consolidação em memória | Quantity consolidado antes do banco |
| Cache de cliente | Evita consultas repetidas ao banco |
| Cache de produto | Evita consultas repetidas ao banco |
| Sem `delete_rows()` | Não apaga linha a linha — regrava arquivo inteiro ao fim |
| Regravação única | Arquivo original reescrito apenas uma vez ao fim |
| `shutil.move` | Evita erros de cross-device link |

### Aviso de performance

Se o arquivo tiver mais de `150.000` linhas, é gerado aviso no log:
```
Aviso: arquivo com N linhas de dados. Processamento seguirá com proteção operacional.
```

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

---

## Logs

### Log de execução (arquivo texto)

Eventos registrados:
- Início do processamento
- Resultado da consolidação quantity (grupos válidos + falhas preliminares)
- Resultado do processamento quantity (linhas marcadas como sucesso)
- Resultado do processamento metering (sucessos e falhas)
- Summary final com: total, lidas, sucesso, falhas, remanescente

### tbImportLog

Tenta registrar log de importação via métodos candidatos:
- `insert`, `create`, `save`, `log_import` (tolerante a diferentes assinaturas)

Status possíveis: `success`, `warning`, `error`

---

## Métricas de Retorno

`run_import()` retorna:

| Campo | Descrição |
|---|---|
| `status` | `FINISHED` ou `WARNING` (sem arquivo) |
| `message` | Summary da última execução ou mensagem padrão |

---

## Entrypoint

`run_import()` aceita:

| Parâmetro | Descrição |
|---|---|
| `file_name` | Nome do arquivo em `storage/input`. Se `None`, processa todos os `.xlsx` do diretório |
| `user_id` | Identificador opcional do usuário (compatibilidade de interface) |
| `import_control_id` | ID opcional do registro em `tbImportControl` |

---

## Pontos Críticos para Sustentação

| # | Regra |
|---|---|
| 1 | Colunas `Client` e `License` são obrigatórias |
| 2 | Cliente é normalizado (sem acento, UPPER) antes da busca |
| 3 | Produto é criado automaticamente se não existir |
| 4 | Quantity é consolidada globalmente antes de acessar o banco |
| 5 | Datas fazem parte da chave de agrupamento quantity |
| 6 | `Active` e `Compliance` **não** entram na chave — vêm da linha representativa |
| 7 | Alteração em `mcsa_quantity` resetar `mcsa_track = 0` |
| 8 | Lock de arquivo impede execuções simultâneas |
| 9 | Arquivo de entrada é **modificado** — guarde cópia antes de rodar |
| 10 | Arquivo de falhas só é criado se houver linhas com erro |

---

## Resumo Executivo

O importador Smart Account é um processo de upsert com consolidação em memória.

Principais comportamentos:

- Separa linhas em `quantity` e `metering` por regra da aplicação
- Consolida globalmente linhas quantity com a mesma chave lógica
- Faz upsert tanto para quantity quanto para metering
- Resolve cliente e produto com cache para performance
- Cria produto automaticamente se não existir
- Projetado para arquivos grandes com proteções de performance
- Remove linhas processadas do arquivo de entrada (regravação única ao fim)
- Gera arquivo de falhas com contexto por linha
- Protegido por lock de arquivo contra execução simultânea
