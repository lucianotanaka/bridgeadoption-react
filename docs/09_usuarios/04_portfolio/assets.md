# Ativos e Contratos

> **Público:** CSMs, GMs e gestores  
> **Onde encontrar:** Menu lateral → **Portfolio** → **Assets**  
> **Última atualização:** 2026-08

---

## O que é o módulo Assets?

O módulo **Assets** exibe o portfólio completo de ativos de um cliente — hardware, software e licenças — com informações de contratos do fabricante (Vendor/Cisco) e da NTT, status consolidado e alertas de fim de suporte.

É a ferramenta ideal para auditar o inventário de um cliente, verificar quais ativos estão com suporte ativo e identificar riscos de expiração.

---

## Como usar o módulo Assets

### Passo 1 — Selecionar o cliente

No campo de seleção no topo da página, pesquise e escolha o cliente desejado. Apenas clientes que possuem ativos cadastrados aparecem na lista.

### Passo 2 — Carregar os ativos

Após selecionar o cliente, os dados carregam automaticamente.

### Passo 3 — Usar os filtros (opcional)

Use os filtros para refinar a visualização conforme necessário.

---

## Cards de resumo

No topo da página, após selecionar um cliente, você vê **4 cards de resumo**:

| Card | O que exibe |
|---|---|
| **Total Assets** | Quantidade total de ativos do cliente |
| **Vendor Only** | Ativos com cobertura apenas do fabricante (Cisco) |
| **NTT Only** | Ativos com cobertura apenas da NTT |
| **Vendor + NTT** | Ativos com cobertura dupla (Cisco + NTT) |

---

## Filtros disponíveis

O módulo oferece 11 filtros para refinar a tabela de ativos. Todos são de **seleção múltipla**:

| Filtro | O que filtra |
|---|---|
| **Vendor** | Fabricante do ativo |
| **Product Name** | Nome do produto |
| **NTT Contract** | Número do contrato NTT |
| **Subscription ID** | ID da assinatura |
| **Serial Number** | Número de série do equipamento |
| **Instance Number** | Número da instância |
| **Major/Minor** | Versão maior/menor |
| **Status Consolidated** | Status consolidado do contrato |
| **Alert Reason** | Motivo do alerta (ex: próximo do vencimento) |
| **EOS Status** | Status de End of Support (fim de suporte) |
| **LDOS Status** | Status de Last Day of Support |

---

## A tabela de ativos

A tabela exibe até **29 colunas** com informações detalhadas de cada ativo. Use a **barra de rolagem horizontal** para ver todas as colunas.

As principais informações exibidas são:

- Fabricante e nome do produto
- Número de série e número de instância
- Tipo de cobertura (Vendor / NTT / ambos)
- Número dos contratos (NTT e Vendor)
- Datas de início e fim dos contratos
- Status consolidado
- Alertas de EoS (End of Support) e LDOS (Last Day of Support)
- Subscription ID

A tabela é **paginada** — use os controles de paginação no rodapé para navegar entre as páginas de resultados.

---

## Alertas de fim de suporte

Fique atento aos alertas de **EoS** (End of Support) e **LDOS** (Last Day of Support):

| Alerta | Significado |
|---|---|
| **EoS** | O fabricante encerrou o suporte técnico para este produto |
| **LDOS** | Último dia em que o suporte estava disponível |

Ativos com esses alertas ativos devem ser priorizados para renovação ou substituição.

---

## Exportando os dados

Clique em **Export CSV** para baixar todos os ativos filtrados em formato de planilha. O arquivo inclui todos os dados visíveis na tabela, com codificação UTF-8 para garantir caracteres especiais.

---

## Atualizando os dados

Clique em **Refresh** para recarregar os ativos do cliente ativo com os dados mais recentes.

---

## Dicas de uso

- Use os filtros **EOS Status** e **LDOS Status** para identificar rapidamente ativos com suporte expirado ou próximo do vencimento.
- O filtro **Alert Reason** agrupa ativos que requerem atenção por motivos específicos.
- Para clientes com muitos ativos, combine múltiplos filtros para focar no que é mais relevante.
- Exporte para CSV e use a planilha para criar análises customizadas ou relatórios para o cliente.

---

## Ver também

- [Farol — Saúde dos Clientes](./farol.md) — visão de cobertura contratual por solução
- [Visão Geral do Cliente](./visao_geral_cliente.md) — visão 360° integrada do cliente
- [Cisco Enterprise Agreement](./cisco_ea.md) — monitoramento de licenças EA
