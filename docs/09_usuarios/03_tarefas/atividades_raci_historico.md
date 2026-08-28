# Atividades, RACI e Histórico

> **Público:** CSMs, GMs e gestores  
> **Onde encontrar:** Menu lateral → **Tasks** → clique em qualquer tarefa → **Painel de Detalhes**  
> **Última atualização:** 2026-08

---

## O que é o Painel de Detalhes?

O **Painel de Detalhes** é aberto ao clicar em qualquer tarefa dentro do módulo Tasks (nas abas Overview, Filter, Follow-Up ou New Task). Ele expande abaixo do conteúdo da aba ativa e apresenta quatro seções:

1. **Dados da tarefa** — informações e edição
2. **Atividades** — sub-tarefas da tarefa principal
3. **RACI** — matriz de responsabilidades
4. **Histórico** — registro de notas e eventos

---

## 1. Atividades

As **atividades** são as etapas ou sub-tarefas que compõem uma tarefa. Elas permitem dividir o trabalho em partes menores e acompanhar cada etapa individualmente.

### Visualizando as atividades

As atividades aparecem em uma lista expansível dentro do Painel de Detalhes. Cada atividade exibe:

- Nome / descrição
- Status atual
- Responsável
- Datas de início e fim (planejadas e realizadas)
- % de conclusão
- Data do próximo follow-up

### Adicionando uma nova atividade

1. No Painel de Detalhes, acesse a seção **Atividades**
2. Clique em **+ Add Activity** (Adicionar Atividade)
3. Preencha os campos:

| Campo | Descrição |
|---|---|
| **Description** | Descrição da atividade |
| **Owner** | Responsável pela atividade |
| **Status** | Status inicial |
| **Start Date** | Data de início planejada |
| **End Date** | Data de encerramento planejada |
| **Priority** | Prioridade da atividade |
| **Next Follow-Up** | Data do próximo contato |
| **% Completed** | Percentual de conclusão |
| **Scope** | Escopo detalhado (opcional) |

4. Clique em **Save** para salvar

### Editando uma atividade existente

1. Localize a atividade na lista
2. Clique no ícone de **editar** (lápis) ao lado da atividade
3. Os campos ficam habilitados para edição inline
4. Faça as alterações e clique em **Save**

### Impacto das atividades na tarefa principal

> As atividades influenciam diretamente os campos da tarefa-mãe:
> - **Data de início realizada da tarefa** = menor data de início entre todas as atividades
> - **Data de fim realizada da tarefa** = maior data de fim entre todas as atividades
> - **% Concluído da tarefa** = média do percentual de conclusão das atividades

Portanto, para que o progresso da tarefa seja calculado corretamente, mantenha as atividades sempre atualizadas.

---

## 2. Matriz RACI

A **Matriz RACI** define quem é responsável por cada elemento da tarefa ou atividade. RACI é uma sigla para:

| Letra | Papel | Descrição |
|---|---|---|
| **R** | **Responsible** (Responsável) | Quem executa o trabalho |
| **A** | **Accountable** (Aprovador) | Quem aprova e responde pelo resultado |
| **C** | **Consulted** (Consultado) | Quem deve ser consultado |
| **I** | **Informed** (Informado) | Quem deve ser mantido informado |

### Como gerenciar o RACI

#### Adicionando uma pessoa ao RACI

1. No Painel de Detalhes, acesse a seção **RACI**
2. Clique em **+ Add**
3. Selecione a **empresa** (cliente ou NTT) para filtrar as pessoas
4. Escolha a **pessoa** na lista
5. Selecione o **papel** (R, A, C ou I)
6. Clique em **Save**

#### Alterando o papel de uma pessoa

1. Localize a pessoa na matriz RACI
2. Clique no papel atual (R/A/C/I)
3. Selecione o novo papel
4. A alteração é salva automaticamente

#### Removendo uma pessoa do RACI

1. Localize a pessoa na matriz
2. Clique no ícone de **remover** (lixeira)
3. Confirme a remoção

> O RACI pode ser definido tanto no nível da **tarefa** quanto no nível de cada **atividade** individualmente.

---

## 3. Histórico

O **Histórico** registra todas as notas, eventos e alterações relevantes de uma tarefa ou atividade. É o diário de bordo da tarefa.

### O que aparece no histórico?

- Notas adicionadas manualmente pelos usuários
- Eventos automáticos (criação da tarefa, mudanças de status)
- Registros de follow-up realizados
- Comentários e observações importantes

### Adicionando uma nota ao histórico

1. No Painel de Detalhes, acesse a seção **Histórico**
2. Clique em **+ Add Note** (Adicionar Nota)
3. Digite sua mensagem ou observação
4. Selecione o **tipo** de registro (nota, evento, follow-up, etc.)
5. Clique em **Save**

### Filtrando o histórico

Use o filtro de **tipo** para ver apenas um tipo específico de registro (ex: somente notas, ou somente eventos de mudança de status).

Para históricos extensos, use a **paginação incremental** para carregar registros mais antigos clicando em "carregar mais".

### Histórico por atividade

Você pode filtrar o histórico para ver apenas os registros relacionados a uma atividade específica. Selecione a atividade desejada no filtro do histórico.

---

## Dicas de uso

- **Mantenha as atividades atualizadas** — o progresso da tarefa-mãe depende dos dados das atividades.
- **Use o RACI desde o início** — definir responsabilidades logo na criação da tarefa evita confusões sobre quem deve fazer o quê.
- **Registre notas importantes no Histórico** — isso cria um registro auditável de tudo que aconteceu com a tarefa.
- **Datas de atividades influenciam a tarefa** — ao completar uma atividade, atualize as datas realizadas para que a tarefa reflita o progresso real.
- **Navegação entre tarefas** — no Painel de Detalhes você pode navegar para a próxima ou anterior tarefa da lista sem precisar fechar o painel.

---

## Ver também

- [Criar e Gerenciar Tarefas](./gerenciar_tarefas.md) — criar e editar tarefas
- [Follow-Up](./follow_up.md) — quadro de próximos follow-ups
- [Relatórios de Tarefas](./relatorios_tarefas.md) — exportar dados de tarefas
