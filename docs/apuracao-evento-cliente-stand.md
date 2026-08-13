# Apuração Financeira por Evento e Cliente/Stand

**Data de referência:** 13 de agosto de 2026.  
**Entidade analisada:** SAMS Locações, operação privada brasileira de montagem de stands e cenografia para eventos.  
**Moeda operacional:** real brasileiro (R$).  
**Escopo:** diagnóstico do CRM atual e recomendação de evolução; esta análise não altera registros, regras ou permissões existentes.

> **Objetivo operacional:** permitir responder, com rastreabilidade, a perguntas como: “Quanto custou o stand do cliente X na feira Y?”, “Quanto foi faturado, recebido e ainda falta receber?” e “Qual foi a margem direta e a margem após rateios?”.

## Diagnóstico executivo

O CRM já possui os campos estruturais necessários em `crm_transacoes` (`evento_id`, `cliente_id` e `centro_custo`), mas os lançamentos atuais não os utilizam. No recorte consultado, existem **106 lançamentos**, todos sem vínculo a evento ou cliente, embora **106** tenham texto de centro de custo e existam **18 centros distintos**. Assim, o centro de custo atual possibilita observar parte dos gastos por feira, mas não permite separar, de forma confiável, os vários stands de clientes dentro da mesma feira.[1]

Há também **79 eventos** e **1.459 clientes** cadastrados. As **28 contas a receber** estão vinculadas a clientes, mas não a eventos. O fluxo comercial que poderia encadear cliente, oportunidade, contrato e ordem de serviço ainda não contém registros: oportunidades, contratos e ordens de serviço estão vazios no banco no momento da análise. Por isso, o sistema ainda não tem uma chave operacional única para representar cada stand vendido e executado.

| Elemento atual | Situação observada | Impacto na apuração por stand |
|---|---:|---|
| Eventos cadastrados | 79 | Base disponível para filtro e associação futura. |
| Clientes cadastrados | 1.459 | Base disponível para associação futura. |
| Lançamentos financeiros | 106 | Base histórica a preservar. |
| Lançamentos com `evento_id` | 0 | Não há custo diretamente atribuível à feira pela chave relacional. |
| Lançamentos com `cliente_id` | 0 | Não há custo diretamente atribuível ao cliente/stand. |
| Lançamentos com centro de custo textual | 106 | Há indício útil para migração assistida, mas não é chave confiável. |
| Contas a receber com cliente | 28 de 28 | Receita pode ser analisada por cliente, porém não por feira/stand. |

Os centros atuais misturam naturezas diferentes, como despesas administrativas, ativos próprios e feiras. Por exemplo, há centros que identificam eventos, como `FEBRATEX 2026`, e outros de estrutura, como escritório, imóvel ou veículo. Essa flexibilidade foi útil para o registro inicial, mas a mesma coluna textual não distingue se um lançamento pertence ao custo geral da feira ou ao stand de um cliente específico.

## O que já existe e o que falta

O desenho do banco já prevê o vínculo opcional de uma transação a `crm_eventos` e `crm_clientes`; a tabela de transações também tem o campo livre de centro de custo.[1] Entretanto, o formulário de despesa expõe apenas o centro de custo como texto livre: não há seletores de evento, cliente ou stand/projeto. Consequentemente, os campos relacionais não são preenchidos no uso cotidiano.[2]

| Necessidade de negócio | Cobertura atual | Lacuna a fechar |
|---|---|---|
| Ver custo total de uma feira | Parcial, por texto do centro de custo | Padronizar vínculo da despesa ao evento. |
| Ver custo de um cliente em uma feira | Não confiável | Registrar o cliente e uma unidade de trabalho/stand. |
| Comparar receita e custo do mesmo stand | Não disponível | Ligar contas a receber e despesas à mesma unidade de apuração. |
| Ratear custo compartilhado da feira | Não disponível | Registrar regra, critério e valor de rateio auditável. |
| Preservar histórico existente | Possível | Manter texto atual e adicionar relações opcionais, sem sobrescrever dados. |

## Modelo recomendado: Evento → Centro da Feira → Stand do Cliente

Minha recomendação é tratar o **stand do cliente em uma feira** como a unidade de apuração. Ela deve existir mesmo quando o mesmo cliente participa de várias feiras ou monta mais de um espaço no mesmo evento.

| Nível | Exemplo | Finalidade |
|---|---|---|
| Empresa / estrutura | `SAMS — Administrativo` | Despesas corporativas que não pertencem a uma feira. |
| Evento | `FEBRATEX 2026` | Custos gerais da participação e operação na feira. |
| Projeto de stand | `FEBRATEX 2026 — Cliente X — Stand 128` | Receita, custos diretos, rentabilidade e documentos do trabalho específico. |

Para isso, a evolução mais segura é criar uma entidade própria, por exemplo **Projeto de Stand** ou **Centro de Resultado do Stand**, contendo `evento_id`, `cliente_id`, referência do stand/pavilhão, contrato opcional, responsável e situação. Cada registro receberia um código único, como `FEB26-CLIENTEX-128`. Esse código é a chave que une orçamento, contrato, contas a receber, despesas e execução.

> O campo textual `centro_custo` deve permanecer como descrição e legado. A apuração não deve depender da interpretação de texto livre.

### Vínculos financeiros propostos

| Registro | Vínculo obrigatório ou opcional | Uso na apuração |
|---|---|---|
| Despesa direta | Projeto de Stand obrigatório quando o gasto for exclusivo | Compõe o custo direto do stand. |
| Despesa geral da feira | Evento obrigatório; projeto de stand vazio | Permanece no centro da feira até rateio aprovado. |
| Despesa administrativa | Nenhum evento/stand; centro corporativo | Fica fora da margem direta do stand. |
| Conta a receber | Projeto de Stand obrigatório para novos trabalhos de feira | Compõe receita prevista, faturada, recebida e em aberto. |
| Rateio | Lançamento de origem + projetos de destino + critério | Distribui custo compartilhado sem perder a origem. |

O vínculo direto pode aproveitar os campos existentes `evento_id` e `cliente_id` em transações. Para eliminar ambiguidade e suportar mais de um stand do mesmo cliente no mesmo evento, a etapa definitiva deve acrescentar um identificador de **Projeto de Stand** aos lançamentos e às contas a receber. As contas a receber também precisam receber vínculo de evento/projeto, pois hoje só possuem cliente, venda e contrato como referências no modelo vigente.[1]

## Filtros e telas sugeridos

No módulo Financeiro, os filtros devem ser dependentes e exibidos antes da tabela, sem remover a busca atual por descrição, status, período e centro de custo.

| Ordem do filtro | Comportamento sugerido |
|---|---|
| Período | Determina a janela de competência ou vencimento do relatório. |
| Evento | Lista eventos cadastrados; ao selecionar, restringe clientes e stands disponíveis. |
| Cliente | Mostra somente clientes que tenham Projeto de Stand no evento selecionado. |
| Stand / Projeto | Seleção final da unidade de apuração; opcional para consulta consolidada da feira. |
| Centro de custo | Exibe hierarquia: corporativo, evento e stand. |
| Natureza | Custos diretos, custos rateados, despesas gerais, receitas, recebimentos e valores em aberto. |

O relatório principal deve ser uma tela “**Resultado do Stand**”, com visão consolidada do evento e detalhamento por cliente. A leitura deve separar claramente valores contratados, faturados, recebidos, custos diretos, custos rateados e margem. “Valor em aberto” não deve ser somado como receita recebida, e um rateio deve sempre exibir a regra utilizada.

| Indicador | Definição recomendada |
|---|---|
| Receita contratada | Valor do contrato/orçamento aprovado do Projeto de Stand. |
| Receita faturada | Contas a receber vinculadas ao Projeto de Stand. |
| Receita recebida | Contas efetivamente baixadas/pagas. |
| Custo direto | Despesas vinculadas diretamente ao Projeto de Stand. |
| Custo rateado | Parcela de despesas gerais do evento distribuída por regra aprovada. |
| Custo total | Custo direto + custo rateado. |
| Margem bruta do stand | Receita contratada ou faturada menos custo total; a base deve ser exibida. |
| Margem percentual | Margem bruta dividida pela receita escolhida como base. |

## Rateio de custos compartilhados

Nem toda despesa da feira pertence a um único cliente. Frete conjunto, equipe de montagem compartilhada, credenciamento, energia comum e logística são exemplos típicos. Esses gastos não devem ser distribuídos automaticamente sem critério visível.

Recomendo suportar três critérios de rateio, definidos no cadastro da regra e aprovados antes da confirmação:

| Critério | Quando usar | Exemplo |
|---|---|---|
| Valor direto | Quando o fornecedor informa a parte de cada stand | Transporte discriminado por cliente. |
| Metragem quadrada | Quando o custo acompanha área ocupada | Limpeza, estrutura ou locação compartilhada. |
| Receita contratada | Quando a divisão comercial é proporcional ao valor de cada stand | Despesa comercial geral do evento. |

O rateio deve gerar registros de alocação, não duplicar ou alterar o lançamento original. Dessa forma, o usuário consegue abrir um custo rateado e enxergar sua origem, os destinatários, o critério, o valor distribuído e a data da aprovação.

## Roteiro de implantação recomendado

| Etapa | Entrega | Proteção contra regressão |
|---|---|---|
| 1. Convenção e cadastro | Definir nomenclatura de evento, cliente, stand e categorias; criar Projeto de Stand sem obrigatoriedade nos lançamentos antigos. | Nenhum dado histórico é alterado. |
| 2. Vínculo nos novos lançamentos | Incluir seletores de Evento, Cliente e Projeto de Stand nos formulários de despesas e receitas. | Campos novos opcionais; centro de custo textual continua disponível. |
| 3. Visão por evento | Filtros dependentes e relatório de feira com custo geral, receita e stands vinculados. | Apenas leitura; sem rateio automático. |
| 4. Migração assistida | Sugerir associação de históricos a partir do texto do centro de custo, com revisão humana e trilha de auditoria. | Nunca preencher ou sobrescrever em massa sem confirmação. |
| 5. Rateio e margem | Cadastro de regras, alocações auditáveis e Resultado do Stand. | Regra e base de cálculo visíveis em cada total. |

## Recomendação de prioridade

Sugiro iniciar pelas etapas **1 e 2**. Elas resolvem a causa estrutural: passar a registrar o evento, o cliente e o stand no momento em que a despesa ou receita nasce. A partir daí, a tela de filtro por evento e cliente terá dados confiáveis, e o relatório de margem poderá ser adicionado sem recorrer a inferências pelo texto do centro de custo.

O passo seguinte ideal é aplicar o modelo em uma feira futura ou em andamento como piloto. Após validar o fluxo com a equipe financeira e de projetos, o histórico pode ser classificado de forma assistida. A migração dos centros existentes deve permanecer opcional, reversível e auditável, pois o texto atual combina eventos e custos corporativos.

## Transparência da análise

**Base:** custos e receitas devem ser apurados por vínculo explícito do lançamento com o Projeto de Stand; valores em aberto permanecem separados de valores recebidos.  
**Data:** fotografia dos dados e estrutura consultada em 13 de agosto de 2026.  
**Premissas:** um evento pode conter vários clientes e um cliente pode ter mais de um stand/projeto; custos compartilhados exigem rateio identificado.  
**Fontes e confiança:** alta para estrutura e contagens consultadas diretamente no banco e no código; a classificação do histórico por centro textual exigirá revisão humana.  
**Conformidade:** esta é uma recomendação de organização e controle operacional, não uma recomendação financeira personalizada.

## Referências

[1] [Schema operacional do CRM: tabelas de transações, contas a receber, eventos, contratos e ordens de serviço](../drizzle/crm-schema.sql).  
[2] [Formulário atual de despesas: campo livre de centro de custo](../client/public/crm/js/forms.js).
