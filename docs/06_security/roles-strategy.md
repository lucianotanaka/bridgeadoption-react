# 📘 Estratégia de Roles do Sistema

Este documento define o propósito estratégico de cada role do sistema, seu escopo funcional e os tipos de páginas recomendadas.

A estrutura foi desenhada para refletir o ciclo de vida do cliente e garantir clareza organizacional, escalabilidade e governança.

---

# 1. Vision

## 🎯 Propósito Estratégico

Representa a **visão futura da conta**.  
Foco em crescimento, expansão, oportunidades e planejamento estratégico.

É a camada mais executiva do relacionamento.

## 📌 Escopo

- Planejamento estratégico
- Roadmap da conta
- Oportunidades futuras
- Expansão de serviços
- Visão executiva consolidada

## 📄 Páginas Recomendadas

- Roadmap do Cliente
- Plano Estratégico
- Pipeline de Oportunidades (visão executiva)
- Plano de Crescimento
- Resumo Executivo (QBR)
- Iniciativas de Transformação
- Estratégia de Expansão

## 👤 Usuários Típicos

- Executivos
- Account Managers
- Liderança Comercial
- Consultores Estratégicos

---

# 2. Account

## 🎯 Propósito Estratégico

Representa o **estado atual consolidado do cliente**.

É a fonte oficial de informações sobre contratos ativos, licenças, assets e estrutura da conta.

## 📌 Escopo

- Produtos e serviços contratados
- Contratos vigentes
- Consumo de licenças
- Base instalada
- Estrutura da equipe da conta

## 📄 Páginas Recomendadas

- Dashboard Geral da Conta
- Contratos Ativos
- Consumo de Licenças
- Assets / Base Instalada
- Equipe da Conta
- Perfil do Cliente
- Portfólio contratado (visão específica do cliente)

## 👤 Usuários Típicos

- Account Managers
- Customer Success
- Comercial
- Liderança

---

# 3. Adoption

## 🎯 Propósito Estratégico

Mede e gerencia o **uso e engajamento do cliente** com os produtos/serviços.

Foco em saúde da conta e valor percebido.

## 📌 Escopo

- Utilização de licenças
- Adoção de funcionalidades
- Indicadores de engajamento
- Health score

## 📄 Páginas Recomendadas

- Dashboard de Adoção
- Análise de Uso
- Tendência de Consumo
- Utilização por Feature
- Health Score
- Relatórios de Engajamento

## 👤 Usuários Típicos

- Customer Success
- Account Managers
- Especialistas de Adoção

---

# 4. Project

## 🎯 Propósito Estratégico

Gerencia iniciativas de **implementação e entrega**.

Foco em execução.

## 📌 Escopo

- Projetos ativos
- Status de implementação
- Cronogramas
- Riscos e dependências

## 📄 Páginas Recomendadas

- Portfólio de Projetos
- Status de Implementação
- Cronograma
- Marcos (Milestones)
- Gestão de Riscos
- Dashboard de Entregas
- Alocação de Recursos

## 👤 Usuários Típicos

- Gerentes de Projeto
- Equipes de Entrega
- Account Managers

---

# 5. Technical

## 🎯 Propósito Estratégico

Cobre aspectos **técnicos e operacionais** da conta.

Foco em suporte e arquitetura.

## 📌 Escopo

- Chamados técnicos
- Incidentes
- Arquitetura do ambiente
- SLA

## 📄 Páginas Recomendadas

- Chamados / Tickets
- Histórico de Incidentes
- Visão Arquitetural
- Documentação Técnica
- Monitoramento de SLA
- Detalhes de Ambiente

## 👤 Usuários Típicos

- Engenharia
- Suporte Técnico
- Technical Account Managers

---

# 6. Presales

## 🎯 Propósito Estratégico

Apoia atividades de **pré-venda e desenvolvimento de oportunidades**.

## 📌 Escopo

- Qualificação de oportunidades
- Propostas técnicas
- RFPs
- Demonstrações

## 📄 Páginas Recomendadas

- Pipeline de Oportunidades
- Propostas Técnicas
- Gestão de RFP
- Registro de Demos
- Estimativas de Solução
- Notas Técnicas de Pré-venda

## 👤 Usuários Típicos

- Engenheiros de Pré-venda
- Vendas
- Arquitetos de Solução

---

# 7. Admin

## 🎯 Propósito Estratégico

Governança e controle da plataforma.

## 📌 Escopo

- Gestão de usuários
- Gestão de permissões
- Configuração do sistema
- Auditoria

## 📄 Páginas Recomendadas

- Gestão de Usuários
- Gestão de Roles
- Logs de Auditoria
- Configurações Gerais
- Gestão de Dados
- Parâmetros do Sistema

## 👤 Usuários Típicos

- Administradores do Sistema
- TI
- Governança

---

# 8. Public

## 🎯 Propósito Estratégico

Área de acesso externo controlado.

Foco em visibilidade limitada e leitura.

## 📌 Escopo

- Relatórios compartilhados
- Dashboards públicos
- Informações somente leitura

## 📄 Páginas Recomendadas

- Relatórios Públicos
- Dashboards Compartilhados
- Resumo Executivo (read-only)
- Indicadores principais (KPIs)

## 👤 Usuários Típicos

- Clientes externos
- Parceiros
- Executivos convidados

---

# 🔎 Arquitetura Estratégica do Sistema

A estrutura segue uma lógica de ciclo de vida do cliente:


Suporte estrutural:

- Technical → sustentação operacional
- Admin → governança
- Public → visibilidade controlada

---

# ✅ Resultado Arquitetural

A organização atual:

- Evita sobreposição semântica
- Define responsabilidades claras
- Permite escalabilidade futura
- Separa visão atual (Account) de visão futura (Vision)
- Suporta governança enterprise

---

Documento base para padronização e crescimento da plataforma.


----

📊 Matriz de Responsabilidade (Role × Tipo de Informação)
Legenda:

✅ Acesso total
👁️ Somente leitura
❌ Sem acesso
⚙️ Acesso operacional
Tipo de Informação	Vision	Account	Adoption	Project	Technical	Presales	Admin	Public
Dados Estratégicos	✅	👁️	❌	❌	❌	✅	✅	👁️
Dados Atuais da Conta	👁️	✅	👁️	👁️	👁️	👁️	✅	👁️
Consumo / Adoção	👁️	👁️	✅	❌	👁️	❌	✅	👁️
Projetos	👁️	👁️	❌	✅	👁️	👁️	✅	❌
Suporte / Incidentes	❌	👁️	❌	👁️	✅	❌	✅	❌
Oportunidades Comerciais	✅	👁️	❌	❌	❌	✅	✅	❌
Configuração do Sistema	❌	❌	❌	❌	❌	❌	✅	❌
Auditoria	👁️	❌	❌	❌	❌	❌	✅	❌

🔐 Modelo de Controle de Acesso
1. Princípios
Princípio do menor privilégio
Separação clara entre estratégia, operação e governança
Roles cumulativas (usuário pode ter múltiplas)
Admin sobrepõe permissões
2. Hierarquia Conceitual (não técnica)

Admin
 ├── Vision
 ├── Account
 │     ├── Adoption
 │     ├── Project
 │     └── Technical
 ├── Presales
 └── Public
Observações:
Vision não substitui Account
Account é o núcleo informacional
Adoption, Project e Technical são especializações operacionais
Public é sempre leitura restrita
3. Boas Práticas
✅ Nunca conceder Admin por conveniência
✅ Separar claramente edição e visualização
✅ Evitar que Public tenha acesso a dados sensíveis
✅ Auditar alterações críticas

🎯 KPIs Estratégicos por Role
Vision
Taxa de expansão da conta
Pipeline de crescimento
Receita projetada
Índice de maturidade do cliente
Account
Receita atual
MRR / ARR
Contratos ativos
Valor total contratado
Base instalada
Adoption
% de licenças utilizadas
Adoção por feature
Health score
Engajamento mensal
Tendência de uso
Project
% projetos no prazo
% projetos no orçamento
Riscos abertos
SLA de entrega
Status por fase
Technical
Número de incidentes abertos
SLA médio de resolução
Incidentes críticos
Reincidência de problemas
Disponibilidade do ambiente
Presales
Taxa de conversão
Ciclo médio de venda
Volume de oportunidades abertas
Propostas enviadas
Taxa de ganho por segmento
Admin
Usuários ativos
Alterações de permissão
Logins mensais
Tentativas de acesso negadas
Alterações críticas no sistema
Public
Visualizações de dashboard
Downloads de relatórios
Último acesso
Tempo médio de sessão
⚠️ Possíveis Conflitos Futuros
1. Vision vs Presales
Ambos lidam com oportunidades. → Diferenciar:

Presales = operacional
Vision = estratégico
2. Account vs Adoption
Dados podem se sobrepor. → Definir:

Account = estado contratual
Adoption = comportamento de uso
3. Project vs Technical
Projetos podem gerar incidentes. → Definir:

Project = implementação
Technical = sustentação
🏗️ Modelo Arquitetural Consolidado

                 Vision
                    ↑
                Account
      ┌─────────────┼─────────────┐
   Adoption       Project      Technical
                    ↑
                Presales
                   
Admin → Governança total
Public → Acesso controlado externo

