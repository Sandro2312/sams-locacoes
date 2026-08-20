# Guia de Lançamentos no módulo Financeiro

## Correção de visibilidade

O Guia de Fechamento por Stand deixou de depender exclusivamente do botão secundário dentro de **Resultado por Stand**. A entrada principal agora está no módulo **Financeiro**, com a página **Guia de Lançamentos** exibida ao lado de Despesas, Receitas, Resultado por Stand e Resultado do Evento.

## Uso operacional

| Passo | Ação no Financeiro | Resultado |
|---|---|---|
| 1 | Abrir **Guia de Lançamentos** | A página explica as três etapas: venda/parcelas, custos/rateios e revisão humana. |
| 2 | Buscar por Cliente, Evento, código ou nome do stand | O seletor mostra somente os Projetos de Stand correspondentes. |
| 3 | Selecionar o projeto e usar **Abrir guia do stand** | O checklist consolidado é aberto sem sair do Financeiro. |
| 4 | Usar **Criar parcela** ou **Lançar despesa** | Os formulários existentes recebem o contexto do Cliente, Evento, Projeto de Stand e centro de custo. |
| 5 | Revisar pendências | O fechamento continua protegido por classificação das categorias, revisão humana e justificativas críticas. |

O atalho original no Resultado por Stand foi preservado para quem estiver analisando uma lista de projetos, mas não é mais o único acesso ao recurso.

## Compatibilidade e validação

A página usa campo de busca, `select` nativo e botões responsivos, sem dependência de componentes externos. A navegação foi incluída nas mesmas regras de permissão de Resultado por Stand. A sintaxe de `navigation.js` foi validada, o TypeScript permaneceu sem erros e a regressão do guia passou em 5/5 casos. A suíte geral ficou em 139/141, mantendo duas falhas administrativas preexistentes nos testes de Contato e Orçamento.
