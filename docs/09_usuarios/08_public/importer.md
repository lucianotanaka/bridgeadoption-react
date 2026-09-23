# Importer — Painel de Importação de Arquivos

> **Público:** Usuários com permissão `public.importer`  
> **Onde encontrar:** Menu lateral → **Public** → **Importer**  
> **Última atualização:** 2026-09-04

---

## O que é o Importer?

O módulo **Importer** é o painel de controle para importação de dados no Bridge Adoption. Ele permite fazer upload de arquivos Excel (.xlsx), agendar importações para execução em background e acompanhar o histórico e os resultados de cada importação.

O processamento das importações é feito automaticamente pelo servidor em background — você agenda, o sistema executa.

---

## As quatro abas do Importer

| Aba | Para que serve |
|---|---|
| **1. Status / andamento** | Visualizar histórico e acompanhar importações em execução |
| **2. Upload de arquivo (.xlsx)** | Enviar um arquivo Excel para o servidor |
| **3. Agendamento de importação** | Agendar uma importação para data/hora específica |
| **4. Detalhes / arquivos de erro** | Ver log detalhado e linhas com falha de uma importação |

---

## Aba 1 — Status / Andamento

### Cockpit de status

Dois gráficos exibem o panorama geral das importações:

- **Importações por status** — barras mostrando a proporção de cada status (Pendente, Em execução, Concluída, Erro, Cancelada)
- **Importações por dia** — barras diárias dos últimos 14 dias mostrando o volume de importações

### Histórico de importações

Tabela com todas as importações registradas, exibindo:

| Coluna | Descrição |
|---|---|
| **ID** | Identificador único |
| **Fonte** | Tipo de importação (ex: PXP_TASK) |
| **Arquivo** | Nome do arquivo processado |
| **Status** | Status atual da importação |
| **Agendado / Iniciado** | Data/hora de início |
| **Finalizado** | Data/hora de conclusão |
| **Responsável** | Usuário que agendou |

### Status possíveis

| Status | Significado |
|---|---|
| **Pendente** | Na fila, aguardando execução |
| **Em execução** | Sendo processada agora |
| **Concluída com sucesso** | Finalizada sem erros |
| **Concluída com erro** | Finalizada, mas com linhas com falha |
| **Cancelada** | Cancelada antes da execução |

Clique em **Atualizar** no topo para recarregar o histórico.

---

## Aba 2 — Upload de arquivo (.xlsx)

### Como fazer o upload

1. Clique na área tracejada ou arraste um arquivo **.xlsx** para ela
2. O sistema valida o arquivo automaticamente:
   - Apenas arquivos `.xlsx` são aceitos
   - Tamanho máximo: **50 MB**
3. Clique em **Enviar arquivo** para fazer o upload
4. Após o upload com sucesso, o sistema sugere ir automaticamente para a aba de **Agendamento**

> **Nota:** Apenas o upload não executa a importação — você precisa agendar na próxima aba.

---

## Aba 3 — Agendamento de importação

### Como agendar

1. **Tipo de importação** — selecione o tipo de dados a importar:

   | Tipo | Descrição |
   |---|---|
   | **PXP Tasks (6702)** | Importa as tarefas pai (deals) do programa Cisco LCI |
   | **PXP Activities (5890)** | Importa as atividades filhas (Onboard, Use, Engage, Adopt, etc.) vinculadas às tarefas |

   > **Atenção:** O importador de Activities (5890) depende das Tasks (6702) já estarem no banco. Sempre importar Tasks antes de Activities.

2. **Arquivo para importação** — selecione o arquivo que foi enviado via Upload
3. **Data de agendamento** — selecione a data (disponível para os próximos 7 dias)
4. **Hora de agendamento** — selecione o horário (slots de 30 em 30 minutos, apenas horários futuros disponíveis)
5. Clique em **Agendar importação**

> O sistema bloqueia horários já ocupados por outras importações para evitar conflito.

### Como o processamento funciona

O servidor possui um **cron** (tarefa agendada) que verifica periodicamente se há importações com data/hora ≤ o momento atual e as processa automaticamente em background. Não é necessário manter o portal aberto durante a execução.

---

## Aba 4 — Detalhes / Arquivos de erro

### Como usar

1. No seletor do topo, escolha a importação que deseja inspecionar
2. Um resumo aparece com arquivo, fonte, status, responsável, datas e mensagem
3. Navegue entre duas sub-abas:

#### Sub-aba Log (.log)

Exibe o conteúdo completo do arquivo de log da importação — mostra o passo a passo do processamento, erros encontrados e resultado final.

> Útil para diagnosticar por que uma importação falhou.

#### Sub-aba Linhas com falha (.xlsx)

Exibe as linhas do arquivo original que não foram importadas com sucesso, com todas as colunas do arquivo.

- O número de linhas com falha é exibido no topo
- Use o botão **Baixar linhas com falha** para exportar essas linhas e corrigi-las

> Após corrigir as linhas com falha, faça um novo upload com o arquivo corrigido e agende uma nova importação.

---

## Dicas de uso

- Verifique a aba **Status** regularmente para confirmar que importações agendadas foram executadas com sucesso.
- Para importações recorrentes, mantenha os arquivos com nomes padronizados para facilitar a identificação no histórico.
- Sempre confira a sub-aba **Linhas com falha** em importações com status "Concluída com erro" — as linhas com problema precisam ser corrigidas e reimportadas.
- O **log** da importação é a melhor fonte para entender o que aconteceu em caso de erro.
- Ao importar dados Cisco LCI, a **ordem importa**: importe sempre **PXP Tasks** antes de **PXP Activities**.
- Activities com `Claim Approval Date` preenchida terão suas datas de encerramento atualizadas automaticamente, mesmo que já estejam com status "Concluída".
- Linhas com data de expiração muito antiga (mais de 2 Fiscal Years atrás) são descartadas silenciosamente e **não aparecem no arquivo de falhas** — isso é comportamento esperado para registros históricos fora do escopo de importação.

---

## Ver também

- [CSM Account (Public)](./csm_account_public.md) — outro módulo do grupo Public
- [FAQ](../07_faq/faq.md) — problemas comuns e soluções
