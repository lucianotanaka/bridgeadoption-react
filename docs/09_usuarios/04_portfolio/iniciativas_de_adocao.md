# Iniciativas de Adoção

> **Público:** CSMs, GMs e gestores  
> **Onde encontrar:** Menu lateral → **Portfolio** → **Adoption Initiatives**  
> **Última atualização:** 2026-08

---

## O que são as Iniciativas de Adoção?

O módulo **Adoption Initiatives** exibe um relatório de todas as iniciativas de adoção tecnológica realizadas pelos CSMs nas contas dos clientes. Ele permite acompanhar o progresso das iniciativas em andamento, concluídas e não concluídas, com identificação automática de tarefas atrasadas.

---

## O que você vê na tela

### Filtros

No topo da página, você dispõe de 4 filtros para segmentar os resultados:

| Filtro | Descrição |
|---|---|
| **Client** | Nome do cliente |
| **CSM** | CSM responsável pela iniciativa |
| **Solution** | Solução Cisco relacionada |
| **Status** | Status da iniciativa |

Os filtros funcionam em **duas linhas** e são em cascata — selecionar um cliente restringe as opções de solução disponíveis.

Para limpar todos os filtros de uma vez, clique em **Clear all filters** (aparece somente quando há filtros ativos).

### Gráficos de barras

Após filtrar, três gráficos de barras exibem a distribuição das iniciativas:

| Gráfico | O que exibe |
|---|---|
| **Em Andamento** | Iniciativas com status ativo (Open, In Progress, Waiting, On Hold, etc.) |
| **Concluídas** | Iniciativas com status Completed |
| **Não Concluídas** | Iniciativas com status Cancelled, Closed ou Done (sem conclusão positiva) |

### Tabela de iniciativas

A tabela exibe todas as iniciativas que atendem aos filtros aplicados. As colunas mostram:

- Cliente
- CSM responsável
- Tipo da iniciativa / solução
- Status
- Datas (início e fim planejadas)
- % de conclusão
- Indicador de **⚠ Atrasada** — aparece automaticamente quando a data de fim já passou e a iniciativa ainda está aberta

---

## Indicador de Tarefa Atrasada

O badge **⚠ Atrasada** aparece automaticamente na linha de uma iniciativa quando:

- A data de encerramento planejada já passou **E**
- O status ainda é aberto (não foi encerrada, cancelada ou concluída)

Use este indicador para priorizar iniciativas que precisam de atenção imediata.

---

## Ver detalhes de uma iniciativa

Se você tem acesso ao módulo de Tarefas (Tasks), pode clicar em qualquer linha da tabela para abrir o **Painel de Detalhes** inline. Nele você pode:

- Ver todas as informações da tarefa
- Acessar atividades e histórico
- Editar dados (se for o owner ou tiver permissão)

> **Nota:** O Painel de Detalhes só fica disponível se você tiver acesso ao módulo **Tasks**. Caso contrário, a linha é exibida apenas para leitura.

---

## Exportando os dados

Clique em **Export Excel** para baixar as iniciativas filtradas em formato de planilha Excel.

---

## Dicas de uso

- Use o filtro **Status** + badge **⚠ Atrasada** juntos para identificar rapidamente iniciativas problemáticas.
- Os três gráficos oferecem uma visão rápida da distribuição de iniciativas — úteis em reuniões de gestão.
- Use o filtro **CSM** para fazer revisões individuais de desempenho por profissional.
- Combine o filtro **Client** + **Solution** para análises aprofundadas por conta e tecnologia.

---

## Ver também

- [Criar e Gerenciar Tarefas](../03_tarefas/gerenciar_tarefas.md) — gerenciar tarefas diretamente no módulo Tasks
- [Equipe de Conta](./account_team.md) — ver profissionais alocados por cliente
- [CSM Account](../05_adoption/csm_account.md) — portfólio de contas por CSM
