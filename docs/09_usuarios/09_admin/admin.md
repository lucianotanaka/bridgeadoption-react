# Administração do Portal (Admin)

> **Público:** Usuários com perfil **ADMIN**  
> **Onde encontrar:** Menu lateral → **Admin**  
> **Última atualização:** 2026-09

---

## O que é o módulo Admin?

O módulo **Admin** concentra todas as ferramentas de administração do portal Bridge Adoption. Ele é exclusivo para usuários com perfil ADMIN e permite gerenciar usuários, empresas, permissões, metas de equipe e tarefas administrativas.

---

## Submódulos disponíveis

| Submódulo | Permissão | Para que serve |
|---|---|---|
| **Users** | `admin.admin_user` | Criar e gerenciar usuários do portal |
| **Companies** | `admin.admin_company` | Gerenciar empresas/clientes cadastrados |
| **Roles & Auth** | `admin.admin_auth_role` | Configurar perfis, recursos e permissões |
| **Team Goals** | `admin.admin_team_goal` | Definir metas de adoção por CSM e período |
| **Tasks (Admin)** | `admin.admin_task` | Gerenciar tarefas com visão administrativa |

---

## Users — Gerenciamento de Usuários

### O que você pode fazer

- **Buscar usuários** por nome ou e-mail
- **Criar novos usuários** vinculados a uma pessoa cadastrada
- **Editar** dados de usuários existentes (nome, idioma, tema, perfil de acesso)
- **Redefinir senha** de usuários

### Criando um novo usuário

1. Acesse **Admin → Users**
2. Use a barra de busca para localizar a pessoa (busca por nome, mínimo 2 caracteres)
3. Clique em **+ Add User** ou no botão de criação
4. Preencha os campos necessários:

| Campo | Descrição |
|---|---|
| **Person** | Pessoa NTT interna a ser vinculada ao usuário |
| **E-mail** | E-mail corporativo (usado para login) |
| **Language** | Idioma padrão (pt-BR, en-US, es-ES) |
| **Password** | Senha inicial (o usuário poderá alterar no primeiro acesso) |
| **Force password change** | Se marcado, o usuário será obrigado a trocar a senha no próximo login |

5. Clique em **Save**

### Campos do formulário de edição

| Campo | Descrição |
|---|---|
| **user_name** | Nome de exibição do usuário |
| **user_email** | E-mail de login |
| **user_language** | Idioma preferido |
| **user_theme** | Tema preferido (dark/light) |
| **user_change_passwd** | Flag para forçar troca de senha (1 = obrigatório) |

---

## Companies — Gerenciamento de Empresas

### O que você pode fazer

- **Buscar empresas** por nome
- **Visualizar** dados de uma empresa específica
- **Criar** novas empresas (o sistema reutiliza slots "VAGO" disponíveis)
- **Editar** dados de empresas existentes
- **Desativar** empresas (marca como "VAGO") sem excluir permanentemente

### Boas práticas

- Antes de criar uma nova empresa, sempre busque pelo nome para evitar duplicidades.
- Ao desativar uma empresa, os dados históricos vinculados a ela são preservados.

---

## Roles & Auth — Perfis e Permissões

### O que você pode configurar

O módulo de autorizações é composto por três camadas:

| Camada | Descrição |
|---|---|
| **Roles** | Perfis de acesso (ex: ADMIN, CSM, MANAGER) |
| **Resources** | Módulos e funcionalidades do portal (ex: task.task, portfolio.farol) |
| **Actions** | Nível de acesso por recurso (read, write, full, deny) |

### Estrutura de permissões

Cada usuário possui um ou mais **Roles**. Cada Role tem **Permissions** que associam um **Resource** a uma **Action**. O portal verifica essa estrutura para exibir ou ocultar módulos e funcionalidades.

### Como gerenciar

1. Acesse **Admin → Roles & Auth**
2. Use as abas disponíveis para navegar entre Roles, Resources e Actions
3. Para conceder acesso a um usuário a um módulo:
   - Verifique se o Role do usuário tem permissão para o Resource correspondente
   - Se não tiver, adicione a permissão no Role ou crie uma permissão específica

> A lista de resource_keys disponíveis segue o padrão `domínio.recurso` (ex: `task.task`, `adoption.report_cisco_lci`, `portfolio.farol`).

---

## Team Goals — Metas da Equipe

### O que você pode configurar

- Definir **metas individuais** por CSM e período (mês, trimestre, ano fiscal)
- Definir **metas coletivas** da equipe
- As metas definidas aqui aparecem no módulo **Team Target** para todos os usuários

### Como definir metas

1. Acesse **Admin → Team Goals**
2. Selecione o período e o CSM (ou "equipe" para meta coletiva)
3. Informe o valor da meta
4. Clique em **Save**

> Se as metas do Team Target aparecerem como zero para os usuários, é porque ainda não foram cadastradas neste módulo para o período selecionado.

---

## Tasks (Admin) — Visão Administrativa de Tarefas

### O que é diferente da visão normal

O submódulo **Tasks (Admin)** oferece uma visão administrativa das tarefas, permitindo que o administrador:

- Visualize tarefas de **qualquer CSM**, sem restrição de Owner
- Edite tarefas independentemente de ser Owner ou Temp Owner
- Acesse relatórios e dados administrativos que não estão disponíveis na visão padrão

---

## Perfis de acesso disponíveis

| Perfil | O que pode fazer |
|---|---|
| **ADMIN** | Acesso total a todos os módulos, incluindo o Admin |
| **MANAGER** | Acesso à maioria dos módulos, modo de edição no Account Team |
| **CSM** | Acesso aos módulos de trabalho do dia a dia (Tasks, Adoption, Portfolio) |

> Os perfis exatos e suas permissões podem variar conforme a configuração definida no módulo **Roles & Auth**.

---

## Dicas de uso

- Mantenha os usuários com **Force password change** ativo quando criar uma conta nova — isso garante que o usuário defina uma senha pessoal no primeiro acesso.
- Revise as permissões dos Roles periodicamente para garantir que cada perfil tem acesso apenas ao que precisa.
- As metas do **Team Goals** devem ser definidas no início de cada ano fiscal ou trimestre para que o **Team Target** exiba dados corretos para toda a equipe.
- Use **Tasks (Admin)** para situações de urgência onde o Owner da tarefa está indisponível.

---

## Ver também

- [Acesso e Navegação](../01_primeiros_passos/acesso_e_navegacao.md) — como fazer login e navegar no portal
- [Team Target](../05_adoption/team_target.md) — onde as metas definidas aqui são exibidas
- [FAQ](../07_faq/faq.md) — perguntas frequentes sobre permissões e acesso
