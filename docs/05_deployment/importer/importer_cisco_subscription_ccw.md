# Importador Cisco Subscription CCW (`cisco_subscription_ccw.py`)

## 1. Objetivo

O módulo `cisco_subscription_ccw.py` é responsável por importar assinaturas Cisco (CCW) para o ecossistema BA.  
Principais objetivos:

- Ler planilhas Excel de assinaturas CCW em modo edição (in place) usando openpyxl.
- Percorrer linhas em blocos (chunks) para reduzir uso de memória e permitir retomada.
- Resolver dependências de domínio (WebOrder, produto, cliente) e inserir/atualizar registros em tabelas Cisco EA.
- Criar e manter tarefas (task type 1 e 35) e atividades correlatas quando determinados cenários são atendidos.
- Registrar logs detalhados de progresso e erros (tbImportControl e tbImportLog).
- Persistir o Excel de origem apenas com linhas que falharam, facilitando reprocessamentos.

## 2. Visão Geral da Arquitetura

```
Arquivo Excel (.xlsx) ──┐
                       │
            cisco_subscription_ccw.py
                       │
                       ├── CiscoEARepository (tbCiscoEA)
                       ├── ProductRepository (tbProduct)
                       ├── CompanyRepository (tbCompany)
                       ├── CiscoWebOrderRepository (tbCiscoWebOrder)
                       ├── Task/Activity/History Repositories
                       ├── ImportLogRepository (tbImportLog)
                       └── ImportControlRepository (tbImportControl)
```

O importador abre o arquivo em modo leitura/escrita, processa lotes de linhas de trás para frente, remove linhas bem-sucedidas do Excel e registra métricas em `tbImportControl`, permitindo monitoramento em tempo real do progresso.

## 3. Fluxo de Processamento

1. **Inicialização**
   - Obtém `importctrl_id` para o arquivo atual via `ImportControlRepository`.
   - Atualiza status para `RUNNING` com mensagem inicial.
   - Abre o workbook e valida cabeçalho usando schema `IMPORT_SCHEMAS["CiscoSubscriptionCCW"]`.

2. **Processamento em Chunks**
   - Define `CHUNK_SIZE = 2000`.
   - Itera de forma decrescente (`ws.max_row` → 2), garantindo que exclusões de linhas não corrompam o índice.
   - Para cada linha:
     - Normaliza dados (strings, números, datas).
     - Resolve `customer_id` via `CompanyRepository`, com fallback para sugestões (`generate_and_store_suggestions`).
     - Resolve/insere `product_id` (vendor Cisco).
     - Cria/obtém WebOrder (`CiscoWebOrderRepository`).
     - Monta payload `tbCiscoEA` e verifica existência para atualizar ou inserir.
     - Aplica regras especiais:
       - **Ofertas estratégicas (EA3-M, ELA2-M, A-FLEX, A-FLEX-3)** → cria tarefa tipo 1 automaticamente.
       - **Linhas “OVER CONSUMED”** → executa PASSO 7 (tarefa tipo 35 e atividades).
   - Se a linha for processada com sucesso, exclui do Excel (`ws.delete_rows`).

3. **Atualizações de Status**
   - A cada `STATUS_EVERY` linhas (500), recalcula ETA e atualiza `tbImportControl` com mensagem descritiva.
   - Em caso de exceção, grava erro em `tbImportLog`, salva workbook com o estado atual e marca `FAIL`.

4. **Finalização**
   - Salva o Excel in place.
   - Fecha o workbook.
   - Atualiza `tbImportControl`:
     - `FINISHED`: quando não há linhas remanescentes.
     - `PENDING`: quando restam linhas (falhas) no arquivo.
     - `FAILED`: se qualquer exceção impedir a conclusão.

## 4. Regras de Negócio Principais

1. **Normalização e Validação**
   - Strings sanitizadas, remoção de valores “n/a”, etc.
   - Datas convertidas para `datetime`.
   - Moedas e valores numéricos convertidos para float Python.

2. **Identificação do Cliente**
   - Busca por nome (End Customer) e exige mínimo de caracteres.
   - Quando não encontrado, registra sugestão de matching e marca erro.

3. **Produtos**
   - Busca por nome/part number com vendor Cisco.
   - Se inexistente, insere novo registro básico.

4. **WebOrder**
   - Normaliza WebOrderID e cria registro se necessário em `tbCiscoWebOrder`.
   - Rejeita WebOrders inválidas (pequenas, “n/a”, etc.).

5. **Inserção/Atualização EA**
   - Identifica EA por combinação de WebOrder + Customer + Produto + datas.
   - Atualiza registros existentes ou insere novos.

6. **Criação de Tarefas Tipo 1**
   - Ofertas específicas geram automaticamente tarefas com prazo de 45 dias e histórico inicial.

7. **PASSO 7 – Over Consumed**
   - Localiza tarefa tipo 35 compatível (referência, track, subtrack, subscription).
   - Atualiza tracks/subtracks ou reabre tarefa/atividade quando necessário.
   - Cria nova tarefa/atividade com prioridade alta caso não exista.
   - Atualiza histórico (`TaskHistoryRepository`) para rastreabilidade.

8. **Persistência do Excel**
   - Linhas com sucesso são excluídas do arquivo.
   - Restam apenas linhas com erro ou ainda não processadas.

## 5. Logs e Monitoramento

- **ImportLogRepository (`tbImportLog`)**
  - Registra erros linha a linha (coluna, valor, mensagem).
  - Evita duplicidade e mantém trilha de auditoria.
- **ImportControlRepository (`tbImportControl`)**
  - Status: `RUNNING`, `PENDING`, `FINISHED`, `FAILED`.
  - Mensagens incluem contagem lidas/sucesso/falha, percentual, ETA e tempo transcorrido.
  - Em caso de falha, registra a mensagem final detalhando progresso.

Mensagens típicas:
```
[CiscoSubscriptionCCW] arquivo.xlsx | lidas=1500/5000 (30.00%) | sucesso=1400 | falha=100 | restante_estimado=3500 | elapsed=00:10:20 | ETA=2026-03-22 21:05:00
```

## 6. Resultados Esperados

- **Base de dados** atualizada com registros de EA, tarefas e atividades consistentes.
- **Excel de entrada** fica apenas com linhas que não passaram pelas regras de negócio, facilitando correções.
- **Import logs** permitem auditoria detalhada de cada falha.
- **Import control** oferece visibilidade em tempo real e histórico do processamento.

## 7. Premissas e Requisitos

- O arquivo deve estar fisicamente disponível em `/home/bridgeadoption/storage/input` (ou caminho informado ao `run_import`).
- Extensão obrigatória: `.xlsx`.
- Cabeçalho precisa conter todas as colunas definidas em `IMPORT_SCHEMAS["CiscoSubscriptionCCW"].required`.
- A conexão com o banco deve estar operacional (todas as chamadas usam repositórios com `get_db_connection`).
- Requer dependências instaladas:
  - `openpyxl`
  - `pandas`
- Tarefas e atividades dependem das tabelas relacionadas (task, task_activity, task_history).
- O processo é pensado para ser executado via scheduler (`src/services/import_scheduling.py`), mas pode ser chamado manualmente:
  ```bash
  python -c "from src.services.importers.cisco_subscription_ccw import run_import; print(run_import('/home/bridgeadoption/storage/input/arquivo.xlsx'))"
  ```

## 8. Operação e Troubleshooting

- **Falhas recorrentes de Customer/Product**: verificar `tbImportLog` para nomes que exigem cadastro prévio ou ajuste de matching.
- **Arquivo permanece com muitas linhas**: indica alto volume de erros; revisar logs e ajustar dados antes de reprocessar.
- **Erro ao salvar Excel**: ocorre quando o arquivo está aberto em outro programa; garantir exclusividade.
- **ImportControl sem registro**: necessário criar entrada na `tbImportControl` com o nome do arquivo antes de rodar.
- **Sigma/Performance**: ajustar `CHUNK_SIZE` e `STATUS_EVERY` se necessário; por padrão, 2000 linhas por chunk e atualização de status a cada 500.

## 9. Próximos Passos e Evoluções Possíveis

- Adicionar cache em memória para produtos e clientes, semelhante ao importador Cisco Ready, reduzindo chamadas repetidas.
- Expandir métricas registradas (ex.: tempo por chunk, número de EA novos vs atualizados).
- Permitir salvar as falhas em arquivo separado (CSV) além de manter no Excel.
- Integrar alertas (email/Teams) quando o importador falhar repetidamente.
- Automatizar resolução de tarefas/atividades antigas quando não há mais linhas “Over Consumed”.

---

**Resumo:**  
`cisco_subscription_ccw.py` é um importador robusto, orientado a chunks e resiliente a falhas, que emprega logging detalhado para auditoria e garante que o arquivo de entrada permaneça sincronizado com o status do processamento.
