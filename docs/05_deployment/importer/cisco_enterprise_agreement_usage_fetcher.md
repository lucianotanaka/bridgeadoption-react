# cisco_enterprise_agreement_usage_fetcher

## Visão Geral

O módulo `backend/app/services/importers/cisco_enterprise_agreement_usage_fetcher.py` é o importador de uso/licenciamento **Cisco Enterprise Agreement (EA)**.

Ele é responsável por:

- Ler arquivos XLSX do diretório de input
- Processar linha a linha resolvendo cliente e produto
- Inserir registros de uso EA na tabela `tbCiscoEA` (via `CiscoEARepository`)
- Criar produtos automaticamente quando não existirem
- Gerar arquivo XLSX com linhas com erro
- Remover do arquivo original todas as linhas processadas
- Gerar log de execução por arquivo
- Controlar execução concorrente via lock de arquivo

Este documento reflete **exatamente o comportamento atual do código** e deve ser considerado a fonte confiável para o time de sustentação e implantação.

---

## Arquitetura Técnica

### Localização

```
backend/app/services/importers/cisco_enterprise_agreement_usage_fetcher.py
```

### Repositórios utilizados

| Repositório | Obrigatório | Finalidade |
|---|---|---|
| `CiscoEARepository` | Sim | INSERT em `tbCiscoEAMetering` (via `insert_metering`) |
| `ProductRepository` | Sim | Busca e criação de produto por SKU |
| `CompanyListNameRepository` | Sim | Resolução de `client_id` a partir do nome do cliente |
| `ImportLogRepository` | Sim | Log funcional em `tbImportLog` |
| `TaskRepository` | Sim | Importado mas não utilizado diretamente neste fluxo |
| `ImportControlRepository` | Não | Atualização de progresso em `tbImportControl` |

---

## Arquivo de Entrada

### Formato

- XLSX
- Primeira linha obrigatoriamente contém o header

### Colunas obrigatórias

| Coluna | Campo destino |
|---|---|
| `Client` | `mcea_client_id` / `mcea_client` |
| `SKU` | `mcea_product_id` / `mcea_sku` |
| `Balance` | `mcea_balance` |

### Colunas opcionais mapeadas

| Coluna | Campo destino |
|---|---|
| `Domain` | `mcea_domain` |
| `Virtual Account` | `mcea_virtual_account` |
| `Subscription` | `mcea_subscription` |
| `Status` | `mcea_status` |
| `Suite Name` | `mcea_suite_name` |
| `Calculation Method` | `mcea_calculation_method` |
| `Purchased` | `mcea_purchased` |
| `Growth Allowance` | `mcea_growth_allowance` |
| `Total Purchased` | `mcea_total_purchased` |
| `Generated` | `mcea_generated` |
| `Pre EA` | `mcea_pre_ea` |
| `License Migrated` | `mcea_license_migrated` |
| `NTF Date` | `mcea_ntf_date` |
| `Start Date` | `mcea_start_date` |
| `End Date` | `mcea_end_date` |

---

## Regras de Negócio

### 1. Resolução de Cliente

- Coluna `Client` é normalizada: acentos removidos, convertida para UPPER
- Busca via `CompanyListNameRepository.get_company_id_by_name()`
- Se não encontrado → linha falha e vai para arquivo de erros

### 2. Resolução de Produto

- Coluna `SKU` é usada para busca em `ProductRepository`
- Filtro: `product_vendor_id = 1` (Cisco) + `product_name = SKU`
- Se não existir → produto é criado automaticamente com:
  - `product_vendor_id = 1`
  - `product_name = SKU`
  - `product_part_number = SKU`
- Se produto não puder ser criado → linha falha

### 3. Regra de Insert

- Antes do INSERT, verifica se já existe registro idêntico via `find_metering_first_by(identity)`
- `identity` = todos os campos do payload exceto `mcea_update`
- Se já existir → **ignora o registro** (não faz update)
- Se não existir → INSERT com `insert_metering(payload)`

> ℹ️ O comportamento atual **não atualiza** registros existentes — apenas insere novos. Se a regra real exigir update, ajustar conforme necessidade.

### 4. Campo `mcea_track`

- Sempre gravado como `0` (zero)

### 5. Campo `mcea_update`

- Sempre gravado com a data e hora atual da execução

---

## Processamento Operacional

### Estratégia

- Lê o arquivo Excel **uma única vez** em memória (`read_only=True`)
- Processa linha a linha sem chunks
- Registra sucesso ou falha individualmente
- Ao final: regrava o arquivo original com linhas remanescentes
- Utiliza `shutil.move` para evitar problemas de cross-device link

### Lock de Arquivo

- Um arquivo `.lock` é criado em `storage/locks/` por arquivo processado
- Impede execuções simultâneas do mesmo arquivo
- Lock é liberado no bloco `finally`

### Arquivos gerados

| Arquivo | Local |
|---|---|
| Log de execução | `storage/logs/<nome-arquivo>.log` |
| Linhas com erro | `storage/output/<nome-arquivo>_failed_rows.xlsx` |

### Arquivo de falhas

Contém:
- Todas as colunas originais da linha
- `import_error` — mensagem do erro
- `import_original_row` — número da linha no Excel original

---

## Logs

### Log de execução (arquivo texto)

Eventos registrados:
- Início do processamento
- Total de linhas lidas
- Summary final com: total, lidas, sucesso, falhas, restantes

### tbImportLog

Registra o summary final via `repo_import_log.create()`.

---

## Métricas de Retorno

`run_import()` retorna:

| Campo | Descrição |
|---|---|
| `status` | `FINISHED` ou `ERROR` (em caso de falha fatal) |
| `message` | Summary consolidado ou mensagem de erro |

---

## Pontos Críticos para Sustentação

| # | Regra |
|---|---|
| 1 | Colunas `Client`, `SKU` e `Balance` são obrigatórias |
| 2 | Cliente é normalizado (sem acento, UPPER) antes da busca |
| 3 | Produto é criado automaticamente se não existir |
| 4 | Registros já existentes são ignorados — não são atualizados |
| 5 | Lock de arquivo impede execuções simultâneas |
| 6 | Arquivo de entrada é **modificado** — guarde cópia antes de rodar |
| 7 | Arquivo de falhas só é criado se houver linhas com erro |
| 8 | `mcea_track = 0` sempre |

---

## Resumo Executivo

O importador EA é um processo de insert simples e conservador.

Principais comportamentos:

- Resolve cliente por nome (normalizado sem acento/UPPER)
- Cria produto automaticamente se não encontrar
- Nunca atualiza registros já existentes — apenas insere novos
- Remove linhas processadas do arquivo de entrada
- Gera arquivo de falhas com contexto por linha
- Protegido por lock de arquivo contra execução simultânea
