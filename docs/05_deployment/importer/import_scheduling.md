# import_scheduling

## Visão Geral

O módulo `backend/app/services/import_scheduling.py` é o **scheduler de importação** do sistema.

Ele é responsável por:

- Consultar a tabela `tbImportControl` em busca de jobs com status `PENDING`
- Respeitar o limite de importações simultâneas conforme horário e dia da semana
- Despachar cada job para o importador correto via `IMPORT_DISPATCHER`
- Atualizar o status do job em `tbImportControl` durante todo o ciclo de vida
- Limpar jobs presos em `RUNNING` há mais de 6 horas
- Excluir arquivos Excel esvaziados após o processamento

Este documento reflete **exatamente o comportamento atual do código** e deve ser considerado a fonte confiável para o time de sustentação e implantação.

---

## Arquitetura Técnica

### Localização

```
backend/app/services/import_scheduling.py
```

### Dependências externas

| Módulo | Finalidade |
|---|---|
| `src.infrastructure.database.connection` | Conexão com o banco de dados |
| `openpyxl` | Verificação de arquivos Excel na limpeza pós-importação |

---

## Tabela de Controle: tbImportControl

O scheduler opera exclusivamente sobre a tabela `tbImportControl`.

### Campos utilizados

| Campo | Descrição |
|---|---|
| `importctrl_id` | ID do job |
| `importctrl_source` | Tipo de importação (chave do IMPORT_DISPATCHER) |
| `importctrl_file` | Nome do arquivo em `storage/input/` |
| `importctrl_started_by` | Identificador do usuário que agendou |
| `importctrl_status` | Status atual: `PENDING`, `RUNNING`, `FINISHED`, `FAILED` |
| `importctrl_started` | Data/hora de início (agendamento ou execução) |
| `importctrl_ended` | Data/hora de encerramento |
| `importctrl_message` | Mensagem de status ou resumo da execução |

### Ciclo de vida do status

```
PENDING → RUNNING → FINISHED
                  → FAILED
```

---

## Importadores Registrados (IMPORT_DISPATCHER)

Mapeia o valor de `importctrl_source` para a função Python correspondente:

| `importctrl_source` | Módulo importador |
|---|---|
| `CiscoSubscriptionCCW` | `cisco_subscription_ccw.run_import` |
| `ImportCompany` | `import_company_name.run_import` |
| `CiscoReady` | `cisco_ready.run_import` |
| `CiscoLCITask` | `pxp_import_task_6702.run_import` |
| `CiscoLCIActivity` | `pxp_import_activity_5890.run_import` |
| `CiscoSmartAccountUsageFetcher` | `cisco_smart_account_usage_fetcher.run_import` |
| `CiscoEnterpriseAgreementUsageFetcher` | `cisco_enterprise_agreement_usage_fetcher.run_import` |

> ℹ️ Para adicionar um novo importador:
> 1. Implementar o módulo em `src/services/importers/`
> 2. Importar a função no arquivo
> 3. Registrar no dicionário `IMPORT_DISPATCHER` com a chave correspondente ao `importctrl_source`

### Assinatura esperada de cada importador

```python
run_import(file_name: str, user_id: Optional[str]) -> Dict[str, str]
```

Retorno mínimo esperado:
```python
{"status": "...", "message": "..."}
```

---

## Controle de Paralelismo

O número máximo de importações simultâneas (`RUNNING`) é determinado por `get_max_running_now()`:

| Condição | Máximo simultâneo |
|---|---|
| Fim de semana (sáb/dom) | **4** |
| Segunda a sexta, antes das 06h ou após as 19h | **4** |
| Segunda a sexta, entre 06h e 19h | **1** |

A lógica evita sobrecarregar o banco durante o horário comercial, permitindo importações mais agressivas fora do expediente.

---

## Fluxo da Função Principal: `run()`

```
1. Limpar jobs presos (RUNNING > 6 horas)
2. Verificar máximo de simultâneos
3. Verificar quantidade de jobs RUNNING atualmente
4. Se running >= max → encerra sem processar
5. Buscar jobs PENDING ordenados por importctrl_started (mais antigos primeiro)
6. Para cada job: chamar process_single_job()
7. Após todos os jobs: cleanup_empty_import_files()
8. Retorna a quantidade de jobs processados
```

---

## Limpeza de Jobs Presos

A função `cleanup_stuck_jobs()` é chamada **antes** de buscar novos jobs.

Critério: jobs com `importctrl_status = 'RUNNING'` há mais de **6 horas**.

Ação:
- `importctrl_status = 'FAILED'`
- `importctrl_ended = NOW()`
- `importctrl_message` descreve que o encerramento foi feito pelo scheduler

> ⚠️ Essa limpeza é necessária para desbloquear jobs que travaram por crash do servidor, kill de processo ou travamento silencioso da importação.

---

## Processamento de um Job: `process_single_job()`

```
1. Buscar o importer correspondente ao importctrl_source no IMPORT_DISPATCHER
2. Marcar job como RUNNING (UPDATE com WHERE status = 'PENDING' — evita race condition)
   Se atualização falhar (0 rows afetadas) → encerra sem processar
3. Chamar importer(file_name, user_id)
4. Gravar o resultado em tbImportControl:
   - status = resultado["status"]
   - message = resultado["message"]
   - ended = NOW()
5. Se exceção:
   - status = FAILED
   - message = "Erro na importação: <mensagem>"
   - ended = NOW()
```

> ℹ️ O campo `importctrl_status` final reflete diretamente o que o importador retornar — pode ser `FINISHED`, `FAILED` ou qualquer status definido pelo importador.

---

## Limpeza de Arquivos Pós-Importação

A função `cleanup_empty_import_files()` é chamada **após todos os jobs** do ciclo.

Critério de exclusão:
- Arquivo Excel em `storage/input/`
- Extensões suportadas: `.xlsx`, `.xlsm`, `.xltx`, `.xltm`
- Arquivo contém **apenas o cabeçalho** (`max_row <= 1`)

Ação: arquivo é excluído com `os.remove()`.

> ℹ️ Os importadores removem linhas processadas do arquivo de entrada ao longo da execução. Ao final, se todas as linhas foram processadas, o arquivo fica apenas com o cabeçalho — e este mecanismo o remove automaticamente.

---

## Diretório de Input

```
/home/bridgeadoption/storage/input
```

Configurado pela constante `IMPORT_INPUT_DIR`.

---

## Logs

O scheduler utiliza o módulo padrão `logging` do Python.

Eventos registrados:

| Nível | Evento |
|---|---|
| `INFO` | Início e fim do scheduler |
| `INFO` | Job iniciado / finalizado |
| `INFO` | Nenhum job pendente |
| `INFO` | Limite de simultâneos atingido |
| `INFO` | Arquivo Excel excluído por estar vazio |
| `WARNING` | Jobs presos corrigidos |
| `WARNING` | Job não pôde ser marcado como RUNNING |
| `WARNING` | openpyxl não disponível (limpeza não executada) |
| `DEBUG` | Arquivo não encontrado / ignorado / mantido na limpeza |
| `ERROR` | Erro ao verificar/excluir arquivo Excel |
| `EXCEPTION` | Erro não tratado em job (com traceback) |

---

## Pontos Críticos para Sustentação

| # | Regra |
|---|---|
| 1 | `importctrl_source` deve corresponder exatamente a uma chave do `IMPORT_DISPATCHER` |
| 2 | Jobs RUNNING há mais de 6 horas são encerrados como FAILED automaticamente |
| 3 | Máximo de 1 importação simultânea no horário comercial (seg-sex 06h-19h) |
| 4 | Máximo de 4 importações simultâneas fora do horário comercial e fins de semana |
| 5 | A marcação como RUNNING usa `WHERE status = 'PENDING'` para evitar race condition |
| 6 | O status final em `tbImportControl` reflete o retorno do importador |
| 7 | Arquivos Excel com apenas cabeçalho são excluídos automaticamente após o ciclo |
| 8 | Se `openpyxl` não estiver disponível, a limpeza de arquivos é pulada sem erro fatal |
| 9 | Para adicionar um importador: implementar + importar + registrar no `IMPORT_DISPATCHER` |

---

## Como Adicionar um Novo Importador

1. Criar o módulo em `src/services/importers/<nome>.py` com a função:
   ```python
   def run_import(file_name: str, user_id: Optional[str]) -> Dict[str, str]:
       ...
       return {"status": "FINISHED", "message": "..."}
   ```

2. Importar no `import_scheduling.py`:
   ```python
   from src.services.importers.<nome> import run_import as run_<nome>
   ```

3. Registrar no `IMPORT_DISPATCHER`:
   ```python
   "NomeDoTipo": run_<nome>,
   ```

4. Criar registro em `tbImportControl` com `importctrl_source = "NomeDoTipo"` para disparar o job.

---

## Resumo Executivo

O scheduler é o orquestrador central de todas as importações do sistema.

Principais comportamentos:

- Opera sobre `tbImportControl` — nenhuma importação ocorre fora desse controle
- Respeita limite de paralelismo por horário para proteger o banco durante o expediente
- Limpa automaticamente jobs presos antes de cada ciclo
- Despacha cada job para o importador correto via dicionário extensível
- Atualiza o status do job em todas as etapas (RUNNING → FINISHED/FAILED)
- Remove arquivos Excel esvaziados após o processamento
- Totalmente extensível: adicionar um importador exige apenas 3 passos
