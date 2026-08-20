# Guia de Fechamento por Stand — V1

## Objetivo

O guia foi incorporado ao módulo **Projetos de Stand** para orientar a equipe no lançamento e na revisão de receitas, parcelas e custos de cada stand. Ele conecta o contexto já existente de **Cliente/Lead, Evento e Projeto de Stand** aos formulários financeiros, mas não cria, baixa, altera ou exclui lançamentos por conta própria.

> O guia é uma camada de organização e revisão humana. A confirmação e a persistência de qualquer conta a receber, despesa, rateio ou comprovante continuam ocorrendo exclusivamente nos formulários financeiros existentes.

## Acesso e fluxo

O botão **Guia** aparece em cada Projeto de Stand para perfis de Comercial, Projetos, Montagem, Financeiro, Gerência, Administração e Desenvolvimento. A leitura e a atualização das informações usam rotas autenticadas; o fechamento final é exclusivo da gestão financeira.

| Etapa | O que o usuário faz | Proteção aplicada |
|---|---|---|
| Receita e parcelas | Confere a versão comercial aprovada e abre “Criar parcela”. | O formulário de Conta a Receber recebe Cliente, Evento, Projeto e centro de custos pré-preenchidos; o usuário ainda revisa e salva cada parcela. |
| Custos do stand | Classifica Projeto, Montagem, Taxas, Comissões, Logística e Desmontagem. | “Lançar despesa” abre o formulário existente com o mesmo contexto e não persiste nada sem submissão humana. |
| Rateios | Verifica custos compartilhados aprovados. | O guia apenas lê os rateios já alocados ao Projeto de Stand. |
| Pendências | Marca cada categoria como pendente, estimada, lançada ou não aplicável. | Itens estimados continuam visíveis como pendência; itens pendentes impedem o fechamento final. |
| Revisão | Registra observações e, se houver, justificativa de divergência. | O fechamento exige perfil financeiro, confirmação explícita e justificativa para divergências críticas. |

## Indicadores consolidados

O painel mostra a referência comercial aprovada, total de parcelas programadas e recebidas, custo direto, rateios aprovados, custo estimado no checklist e margens de dois estágios. As fontes permanecem as tabelas originais de Orçamento Técnico, Contas a Receber, Transações e Rateios.

| Indicador | Fonte | Regra |
|---|---|---|
| Venda aprovada | Orçamento Técnico aprovado | Exibe a versão aprovada mais recente; composição interna pendente gera divergência crítica. |
| Parcelas | Contas a Receber vinculadas ao Projeto | Soma parcelas não canceladas e recebimentos reconhecidos. |
| Custos lançados | Despesas vinculadas ao Projeto | Soma despesas não canceladas e rateios aprovados. |
| Margem lançada | Parcelas menos custos lançados | Indicador gerencial; não substitui conciliação contábil ou fiscal. |
| Margem estimada | Venda aprovada menos estimativas do checklist | Exibida somente como referência de planejamento. |

## Regras de fechamento

O status pode permanecer em **Planejamento**, **Em preenchimento** ou **Pronto para revisão** durante a execução. Para mudar para **Fechado**, a gestão financeira deve confirmar a revisão humana, classificar todas as categorias e justificar qualquer divergência crítica. O CRM audita atualizações e fechamentos em `crm_auditoria`.

As divergências críticas atualmente cobertas são a composição interna pendente no Orçamento Técnico aprovado e a diferença entre o valor comercial aprovado e a soma das parcelas cadastradas. A diferença entre custo estimado e custo lançado é apresentada como alerta gerencial, sem bloquear automaticamente a revisão.

## Estrutura e integridade

Foram criadas duas tabelas complementares: `crm_projetos_stand_fechamentos` e `crm_projetos_stand_fechamento_itens`. Elas registram somente o estado do guia, as estimativas, observações, revisões e autores. Não houve migração destrutiva nem alteração de dados anteriores.

## Validação

| Verificação | Resultado |
|---|---|
| Schema e banco | Migração `0017_tiny_rawhide_kid.sql` aplicada; as duas tabelas complementares foram confirmadas. |
| Segurança | A rota sem sessão retornou `401 Unauthorized`; leitura e atualização exigem perfil autorizado. |
| Sintaxe e tipos | `node --check` em todos os scripts alterados e `pnpm check` aprovados. |
| Regressão específica | 4/4 testes do guia aprovados. |
| Suíte geral | 138/140 testes aprovados; as duas falhas restantes são preexistentes nos testes administrativos de Contato e Orçamento. |
| Navegador | A tela de login do CRM carregou sem erros de console; o modal autenticado deve ser verificado no próximo acesso autorizado ao módulo Projetos de Stand. |
