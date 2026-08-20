# Lote Financeiro por Stand

## Finalidade

O **Financeiro → Guia de Lançamentos** foi redesenhado para registrar, em uma única sessão de trabalho, vários créditos e débitos vinculados ao mesmo **Cliente, Evento e identificação de stand**. Ele é voltado ao lançamento operacional de um stand em execução; portanto, não abre uma venda, não exige Proposta Comercial e não cria Projeto de Stand.

O contexto do lote forma o centro de custo descritivo. Por exemplo: `URANO TECNOLOGIA LTDA · Expoagas 2026 · Stand 48 m²`. Esse contexto é aplicado às receitas e despesas confirmadas, permitindo depois filtrar ou apurar os valores por cliente, evento e stand.

## Fluxo de trabalho

| Etapa | Ação da equipe | Proteção aplicada |
|---|---|---|
| 1. Contexto | Pesquisa o cliente, seleciona o evento, informa a identificação do stand e confere o centro de custo. | Criar o lote não produz lançamento financeiro. |
| 2. Itens | Adiciona várias receitas e despesas, cada uma com categoria, valor total, vencimento, forma de pagamento e até 60 parcelas. | Os itens permanecem em rascunho e podem ser removidos antes da confirmação. |
| 3. Revisão | Confere totais de receitas, despesas, resultado estimado e itens pendentes. | A confirmação exige uma escolha humana explícita. |
| 4. Confirmação | Confirma o lote após a revisão. | O CRM cria as parcelas de Contas a Receber e as Despesas correspondentes em uma única transação; falhas revertem todo o lote. |

## Parcelamento e categorias

O valor informado em cada item representa seu **total**. Ao escolher mais de uma parcela, o sistema distribui o valor mensalmente a partir do primeiro vencimento e atribui eventual diferença de centavos à última parcela. Isso evita discrepância entre o total do item e a soma dos lançamentos criados.

As receitas possuem categorias de venda de stand, adicional/serviço e outra receita. As despesas possuem Projeto, Montagem, Taxas/feira, Comissão de vendedor, Comissão de projetista, Logística, Desmontagem, Fornecedor e Outros. As despesas são criadas com o tipo financeiro já utilizado pelo CRM (`pagar`).

## Busca de cliente

O campo **Buscar cliente** filtra o seletor por nome, e-mail ou documento e apresenta uma contagem atualizada dos resultados. Quando existe somente uma correspondência, como ao digitar `urano` para **URANO TECNOLOGIA LTDA**, o seletor é preenchido automaticamente e o centro de custo é atualizado assim que Evento e identificação do stand forem informados. Quando há mais de uma correspondência, o usuário escolhe o registro no seletor filtrado; quando não há resultado, a contagem informa que nenhum cliente foi localizado.

## Origem e auditoria

Os rascunhos são armazenados nas tabelas complementares `crm_lotes_financeiros_stand` e `crm_lotes_financeiros_stand_itens`. Essas tabelas não substituem nem modificam registros anteriores. Após a confirmação, cada item preserva os identificadores de Contas a Receber ou Transações criadas; o lote e todas as ações de item/confirmar são auditados em `crm_auditoria`.

> Não há confirmação automática, baixa, recebimento, pagamento ou exclusão. A confirmação apenas cria lançamentos pendentes, que continuam sujeitos aos fluxos financeiros e de comprovantes já existentes.

## Acesso e validação

O lote exige sessão CRM e perfis de Administração, Gerência, Desenvolvimento ou Financeiro. Sem sessão, a API retornou `401 Unauthorized`. A interface utiliza inputs, selects e tabelas responsivos, com suporte a desktop, teclado e mobile.

| Verificação | Resultado |
|---|---|
| Migração | `0018_wakeful_human_torch.sql` cria somente tabelas e índices complementares. |
| API | Autenticação, validações de valor/data/categoria, transação de confirmação e auditoria implementadas. |
| Sintaxe e tipos | `node --check` e `pnpm check` aprovados. |
| Regressão específica | 4/4 testes do lote financeiro aprovados. |
| Suíte geral | 143/145 testes aprovados; as duas falhas remanescentes são preexistentes nos testes de permissões de Contato e Orçamento. |
