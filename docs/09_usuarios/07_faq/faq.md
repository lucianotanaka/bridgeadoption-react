# Perguntas Frequentes (FAQ)

> **Público:** Todos os usuários  
> **Última atualização:** 2026-08

---

## Acesso e Login

### Não consigo fazer login. O que fazer?

1. Verifique se está usando o **e-mail corporativo NTT Data** como usuário
2. Confirme que a senha está correta (atenção ao Caps Lock)
3. Tente usar o **Chrome** ou **Edge** — são os navegadores mais compatíveis
4. Se o problema persistir, entre em contato com o **administrador do portal** para verificar se sua conta está ativa

---

### Um módulo não aparece no meu menu. Por quê?

Os módulos visíveis dependem das **permissões do seu perfil**. Se você precisa de acesso a um módulo que não está no seu menu, solicite ao **administrador do portal** que verifique e ajuste suas permissões.

---

### Posso usar o portal em inglês ou espanhol?

Sim! O portal está disponível em **Português**, **Inglês** e **Espanhol**. Para trocar o idioma, clique no seletor de idioma na **barra superior** e escolha o idioma desejado. A preferência é salva automaticamente.

---

## Tarefas

### Não consigo editar uma tarefa. Por quê?

Somente o **Owner** (responsável) ou o **Temp Owner** (responsável temporário) da tarefa pode editá-la. Usuários com perfil **ADMIN** também podem editar qualquer tarefa.

Se você precisa editar uma tarefa mas não é o owner, solicite ao owner atual ou ao administrador que altere o responsável ou que inclua você como Temp Owner.

---

### As opções "Cancelled", "Closed" e "Completed" não aparecem no campo de Status. Por quê?

Essas opções de encerramento ficam **ocultas enquanto houver atividades em aberto** dentro da tarefa. Para poder encerrar a tarefa, primeiro encerre todas as suas atividades (mude o status de cada atividade para um status de encerramento).

---

### Os campos de data de início e fim aparecem bloqueados para edição. Por quê?

Quando uma tarefa possui **atividades vinculadas**, as datas de início e fim realizadas são calculadas automaticamente:
- **Data início realizada** = menor data de início entre as atividades
- **Data fim realizada** = maior data de fim entre as atividades

Nesse caso, os campos ficam bloqueados. Para alterar as datas, atualize as atividades correspondentes.

---

### Por que o campo "% Concluído" não deixa eu editar?

Quando a tarefa tem atividades, o percentual de conclusão é calculado automaticamente como a **média do % de conclusão das atividades**. Atualize o % das atividades para refletir o progresso real da tarefa.

---

### Criei uma tarefa mas não a encontro no Overview. Por quê?

O **Overview** exibe apenas tarefas **ativas** (status aberto ou em andamento). Se a tarefa foi criada com um status de encerramento (ex: Done, Cancelled), ela não aparecerá no Overview. Use a aba **Filter** para localizá-la pesquisando por qualquer status.

---

### A aba "LCI Viability" não aparece para mim. Como acessá-la?

A aba **LCI Viability** exige uma **permissão especial** (`task.task_lci_viability`). Solicite ao administrador do portal que verifique e conceda essa permissão ao seu usuário se você precisar acessar essa funcionalidade.

---

## Portfolio

### O Farol mostra todas as células em branco (⚪) para um cliente. O que aconteceu?

Isso indica que não há dados de cobertura registrados para esse cliente, ou os dados podem estar desatualizados. Os dados do Farol são importados automaticamente. Se o problema persistir, entre em contato com a equipe de sustentação para verificar a importação.

---

### Não encontro o cliente que preciso no módulo Assets. Por quê?

O módulo Assets exibe apenas clientes que têm **ativos cadastrados**. Se um cliente não aparece na lista, é porque não há ativos importados para ele. Entre em contato com a equipe de sustentação para verificar a importação de contratos.

---

### Os dados do Cisco EA / True Forward parecem desatualizados. O que fazer?

Os dados de EA e True Forward são importados automaticamente a partir de integrações com sistemas da Cisco. Se os dados parecerem desatualizados, clique em **Refresh** para tentar recarregar. Se o problema persistir, entre em contato com a equipe de sustentação para verificar o status das importações.

---

## Adoption

### O Forecast não mostra dados para o ano fiscal atual. Por quê?

Verifique se o **seletor de ano fiscal** está com o ano correto. Lembre-se que o **ano fiscal NTT começa em abril** — selecione o ano fiscal correspondente ao período que deseja visualizar.

---

### Os valores de LCI aparecem zerados. Por quê?

Os dados de LCI são importados de sistemas da Cisco. Se os valores estiverem zerados, pode ser que:
1. O período selecionado ainda não tem aprovações
2. Os dados de importação estão desatualizados

Use o filtro de **ano fiscal** para verificar outros períodos. Se o problema persistir em todos os períodos, entre em contato com a equipe de sustentação.

---

### As metas do Team Target aparecem como zero. O que fazer?

As metas são definidas pelo administrador no módulo **Admin → Team Goals**. Se aparecerem como zero, as metas do período selecionado podem não ter sido cadastradas ainda. Solicite ao administrador que cadastre as metas para o período.

---

## Projetos

### Não vejo o botão "+ Add Project". Por quê?

O botão de criar projeto está disponível apenas para usuários com perfil **ADMIN**. Se você precisa cadastrar um projeto, solicite que um administrador do portal o faça, ou peça ao gestor para solicitar a inclusão do perfil ADMIN ao seu usuário.

---

### Busquei uma OV mas não encontrei o projeto. O que pode ser?

1. Verifique se digitou a OV corretamente (sem espaços extras)
2. A OV pode não estar cadastrada no portal ainda
3. A OV pode estar no formato diferente — tente sem o `#` (ex: `68924` em vez de `#68924`)

Se a OV ainda não aparecer, peça a um **ADMIN** para cadastrar o projeto e incluir a OV.

---

## Exportação de Dados

### Tentei exportar mas nenhum arquivo foi baixado. O que fazer?

1. Verifique se o **bloqueador de pop-ups** do navegador não está impedindo o download
2. Verifique se há espaço disponível na pasta de downloads
3. Tente usar o **Chrome** ou **Edge** — são os navegadores com melhor suporte para download
4. Se o problema persistir, entre em contato com a equipe de sustentação

---

### O arquivo exportado abre com caracteres incorretos no Excel. Como corrigir?

O arquivo exportado usa codificação **UTF-8**. Para abrir corretamente no Excel:

1. Abra o Excel
2. Vá em **Dados → Obter Dados → De Arquivo → De Texto/CSV**
3. Selecione o arquivo
4. Escolha a codificação **UTF-8** na configuração de importação
5. Conclua o assistente de importação

---

## Geral

### Os dados estão desatualizados em algum módulo. O que fazer?

1. Clique no botão **Refresh** (disponível na maioria dos módulos) para recarregar os dados mais recentes
2. Se o botão Refresh não resolver, pressione **F5** para recarregar a página inteira
3. Se os dados continuarem desatualizados após recarregar, o problema pode ser na importação de dados — entre em contato com a equipe de sustentação

---

### A página está lenta ou travando. O que fazer?

1. Recarregue a página com **F5**
2. Limpe o cache do navegador (**Ctrl + Shift + Delete** no Chrome/Edge)
3. Feche outras abas desnecessárias do navegador
4. Se o problema persistir, verifique sua conexão com a rede corporativa
5. Se o problema for generalizado (todos os usuários afetados), entre em contato com a equipe de sustentação

---

### Como reportar um problema ou bug no portal?

Entre em contato com a **equipe de sustentação** fornecendo:
- **Descrição** detalhada do problema
- **Módulo** onde o problema ocorre
- **Passos** para reproduzir o problema
- **Screenshot** da tela com o erro (se houver mensagem de erro visível)
- **Navegador** e versão que está usando

---

## Ver também

- [Acesso e Navegação](../01_primeiros_passos/acesso_e_navegacao.md) — guia de acesso ao portal
- [Guia do Usuário — Índice](../README.md) — índice completo da documentação
