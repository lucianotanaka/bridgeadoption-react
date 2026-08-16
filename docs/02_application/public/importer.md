# Módulo Importer — Public

> **Rota:** `/public/importer`
> **resource_key:** `public.importer`
> **Arquivo frontend:** `frontend/src/pages/public/ImporterPage.tsx`
> **Arquivo backend (serviço):** `backend/app/modules/public_service.py`
> **Arquivo backend (rotas):** `backend/app/modules/public_router.py`
> **Última atualização:** 2026-08-16

---

## 1. Propósito

Painel de gerenciamento de importações de arquivos externos (Cisco, NTT Data). Permite ao time de operações e sustentação:

- Fazer **upload** de arquivos `.xlsx` para a área de entrada do servidor
- **Agendar importações** para serem processadas em background pelo cron
- **Monitorar** o status e andamento de todas as importações em tempo real
- **Consultar logs** e **visualizar/baixar linhas com falha** de cada importação

> **Importante:** O processamento dos arquivos é feito por um script Python disparado pelo **cron** no servidor Linux. A interface **não executa a importação diretamente** — ela cria registros com status `PENDING` na tabela `tbImportControl`, que o cron lê periodicamente e processa.

---

## 2. Fluxo de uso padrão

```
1. Usuário faz upload do arquivo .xlsx (Tab 2)
2. Arquivo é salvo em /home/bridgeadoption/storage/input/
3. Usuário agendada a importação: escolhe tipo, arquivo, data e hora (Tab 3)
4. Registro PENDING é inserido em tbImportControl
5. Cron executa o importador na data/hora agendada
6. Status atualiza para RUNNING → FINISHED ou FAILED
7. Usuário consulta o resultado na Tab 1 (Status) ou Tab 4 (Detalhes)
```

---

## 3. Interface — Tabs

### Tab 1 — Status / andamento

Visão geral do histórico de importações:

- **Cockpit de status:** barra horizontal proporcional com contagem por status (Pendente, Em execução, Concluída, Erro, Cancelada)
- **Gráfico de timeline:** distribuição de importações por dia (últimos 14 dias)
- **Tabela de histórico:** últimas 100 importações, ordenadas por data (mais recente primeiro), com colunas: ID, Fonte, Arquivo, Status, Agendado/Iniciado, Finalizado, Responsável
- **Botão Atualizar:** recarrega os dados manualmente (auto-refresh a cada 60s)

### Tab 2 — Upload de arquivo (.xlsx)

- Área de drag-and-drop ou clique para selecionar arquivo
- Aceita apenas extensão `.xlsx`
- Limite de **50 MB** por arquivo
- Arquivo é salvo em `/home/bridgeadoption/storage/input/`
- Anti-duplicação automática: se o nome já existir, um sufixo incremental é adicionado (ex.: `Pais(1).xlsx`)
- Após upload bem-sucedido, redireciona automaticamente para a Tab 3 com o arquivo pré-selecionado

### Tab 3 — Agendamento de importação

- **Tipo de importação:** dropdown com os tipos disponíveis
- **Arquivo:** dropdown com arquivos `.xlsx` disponíveis em `storage/input` que ainda não foram usados em nenhum agendamento
- **Data:** próximos 7 dias com slots disponíveis
- **Hora:** slots de 30 em 30 minutos, apenas horários futuros e não ocupados por outro agendamento (PENDING/RUNNING)
- **Botão Agendar:** insere registro `PENDING` em `tbImportControl`
- Após agendamento bem-sucedido, redireciona para Tab 1

### Tab 4 — Detalhes / arquivos de erro

- **Seletor de importação:** dropdown com todas as importações do histórico
- **Resumo da importação selecionada:** arquivo, fonte, status, responsável, datas de início e fim, mensagem
- **Log (.log):** exibe o conteúdo do arquivo `{stem}.log` em `storage/logs/`
- **Linhas com falha (.xlsx):** exibe em tabela o conteúdo do arquivo `{stem}_failed_rows.xlsx` em `storage/output/`

---

## 4. Status das importações

| Status | Significado |
|--------|-------------|
| `PENDING` | Agendada/na fila — aguardando o cron processar |
| `RUNNING` | Em execução pelo script |
| `FINISHED` | Concluída com sucesso |
| `FAILED` | Concluída com erro — verificar log |
| `CANCELLED` | Cancelada manualmente |

---

## 5. Tipos de importação disponíveis

| Label (UI) | Source (interno) | Descrição |
|---|---|---|
| Subscription CCW | `CiscoSubscriptionCCW` | Dados de assinaturas Cisco CCW |
| Cisco LCI - Task (6702) | `CiscoLCITask` | Tarefas do programa LCI Cisco |
| Cisco LCI - Activity (5890) | `CiscoLCIActivity` | Atividades do programa LCI Cisco |
| Cisco SmartAccount Usage Fetcher (Apollo) | `CiscoSmartAccountUsageFetcher` | Consumo SmartAccount via Apollo |
| Cisco Enterprise Agreement Usage Fetcher (Apollo) | `CiscoEnterpriseAgreementUsageFetcher` | Consumo EA via Apollo |

---

## 6. Estrutura de arquivos no servidor

| Diretório | Propósito |
|-----------|-----------|
| `/home/bridgeadoption/storage/input/` | Arquivos `.xlsx` enviados via upload — aguardam agendamento |
| `/home/bridgeadoption/storage/logs/` | Arquivos de log gerados pelo cron (`{stem}.log`) |
| `/home/bridgeadoption/storage/output/` | Arquivos de falhas gerados pelo cron (`{stem}_failed_rows.xlsx`) |

> **Permissões:** os arquivos de upload são salvos com permissão `0600` (leitura apenas pelo owner do processo).

---

## 7. Banco de dados

### Tabela `tbImportControl`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `importctrl_id` | INT AUTO_INCREMENT | ID da importação |
| `importctrl_source` | VARCHAR | Tipo de importação (ex: `CiscoLCITask`) |
| `importctrl_file` | VARCHAR | Nome do arquivo em `storage/input/` |
| `importctrl_status` | ENUM | `PENDING`, `RUNNING`, `FINISHED`, `FAILED`, `CANCELLED` |
| `importctrl_message` | TEXT | Mensagem de log/erro |
| `importctrl_started` | DATETIME | Data/hora de agendamento (quando PENDING) ou início (quando RUNNING) |
| `importctrl_ended` | DATETIME | Data/hora de finalização |
| `importctrl_started_by` | VARCHAR | `user_name` do usuário que agendou |

---

## 8. Endpoints da API

> Documentação completa: [`docs/07_api/public_endpoints.md`](../../07_api/public_endpoints.md)

| Método | Path | Descrição |
|--------|------|-----------|
| `GET` | `/api/public/importer/history` | Histórico de importações |
| `GET` | `/api/public/importer/import-types` | Tipos de importação disponíveis |
| `GET` | `/api/public/importer/files` | Arquivos disponíveis para agendamento |
| `GET` | `/api/public/importer/occupied-slots` | Slots de horário já ocupados |
| `POST` | `/api/public/importer/upload` | Upload de arquivo .xlsx |
| `POST` | `/api/public/importer/schedule` | Agendar importação |
| `GET` | `/api/public/importer/{id}/log` | Conteúdo do log |
| `GET` | `/api/public/importer/{id}/failed-rows` | Linhas com falha |

---

## 9. Segurança / Permissões

- Requer token JWT válido (header `Authorization: Bearer <token>`)
- Requer permissão `public.importer` cadastrada em `tbAuthPermission`
- **Não requer role ADMIN** — deve ser atribuída a usuários do grupo de operação/sustentação
- Recomendação: criar uma role `OPERATION` ou similar e atribuir a permissão `public.importer`

---

## 10. Troubleshooting

| Problema | Causa provável | Solução |
|----------|---------------|---------|
| "Não foi possível carregar o histórico" | API indisponível ou token expirado | Verificar backend, reconectar ao sistema |
| Importação fica em `PENDING` por muito tempo | Cron não está rodando ou está com erro | Ver [`importer_troubleshooting.md`](../../05_deployment/importer/importer_troubleshooting.md) |
| Importação marcada como `FAILED` | Dados inválidos ou API externa indisponível | Consultar log na Tab 4 → Detalhes |
| Arquivo não aparece no seletor da Tab 3 | Arquivo já foi usado em agendamento anterior | Fazer upload de um novo arquivo |
| Nenhum horário disponível na Tab 3 | Todos os slots PENDING/RUNNING nos próximos 7 dias | Aguardar conclusão dos agendamentos pendentes |
| Upload retorna erro de tamanho | Arquivo maior que 50 MB | Dividir o arquivo em partes menores |
| Log não encontrado na Tab 4 | Script ainda não gerou o log | Aguardar execução do cron ou verificar se RUNNING |
