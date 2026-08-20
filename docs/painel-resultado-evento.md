# Painel de Resultado do Evento

## Finalidade

O painel **Financeiro → Resultado do Evento** reúne a leitura comercial, financeira e operacional de uma feira em uma única tela. Ele foi desenhado para apoiar a gestão do evento sem substituir os cadastros de origem, sem alterar lançamentos existentes e sem inferir valores que não estejam registrados no CRM.

## Indicadores e fontes

| Indicador | Fonte de dados | Regra de apuração |
|---|---|---|
| Reuniões realizadas | Registro manual no fechamento do evento | O gestor informa o total verificado em campo; o dado é comparado com a meta definida. |
| Leads do evento | `crm_leads.evento_interesse` | Conta leads cujo Evento de interesse corresponde ao nome do evento selecionado. |
| Pipeline e propostas | `crm_oportunidades.evento_id` | Consolida oportunidades vinculadas, preservando a etapa e o valor estimado de origem. |
| Receita faturada e recebida | `crm_contas_receber.evento_id` | Exclui contas canceladas; a receita recebida considera somente baixas compatíveis com os estados financeiros existentes. |
| Custo do evento | `crm_transacoes.evento_id` | Soma despesas não canceladas vinculadas ao evento. |
| Rateios e custo de projetos perdidos | `crm_rateio_alocacoes`, `crm_rateio_regras`, `crm_projetos_stand` | Exibe alocações aprovadas por stand e evidencia custo comercial de projetos perdidos, sem duplicar lançamentos. |
| Margem do evento | Receita faturada menos custo do evento | É um indicador gerencial; não substitui conciliação contábil ou fiscal. |

> O painel é deliberadamente calculado sobre as fontes originais. Ele não cria, altera, baixa ou exclui contas a receber, transações, leads, oportunidades, projetos ou rateios.

## Metas e fechamento

Usuários de gestão financeira podem definir objetivo comercial, metas de reuniões, leads, propostas e receita. Após a feira, podem registrar resumo, aprendizados e ações de follow-up. O estado aceita **Planejamento**, **Em andamento**, **Pós-evento** e **Encerrado**. O fechamento preserva auditoria de criação e alteração em `crm_auditoria`.

## Acesso e compatibilidade

As rotas exigem sessão válida do CRM e perfis de administração, gerência, desenvolvimento ou financeiro. A página usa seletores, cartões e tabelas responsivas, com controles nativos compatíveis com desktop e mobile. O cache-buster da navegação foi atualizado para reduzir o risco de o navegador reutilizar o menu anterior.

## Validação técnica

| Verificação | Resultado |
|---|---|
| Migrações | Tabela complementar criada e coluna de reuniões realizadas confirmada no banco; nenhuma atualização de histórico foi executada. |
| Autorização | A rota sem sessão retornou `401 Unauthorized`. |
| Sintaxe e tipos | `node --check` dos scripts novos/alterados e `pnpm check` aprovados. |
| Regressão específica | 6/6 testes do Painel de Resultado do Evento aprovados. |
| Suíte geral | 130/132 testes aprovados; as duas falhas remanescentes são preexistentes em permissões administrativas de Contato e Orçamento. |
