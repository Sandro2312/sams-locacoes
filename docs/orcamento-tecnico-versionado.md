# Orçamento Técnico Versionado por Projeto de Stand

## Finalidade

O **Orçamento Técnico Versionado** organiza a composição de custos e preço de cada Projeto de Stand antes do contrato, da produção ou da montagem. Ele preserva cada revisão comercial para que a equipe acompanhe alterações de escopo, desconto e margem sem apagar a proposta anterior.

O módulo é ligado exclusivamente ao **Projeto de Stand**. Ele não cria contas a receber, não lança despesas, não modifica contratos e não altera a apuração financeira existente. Sua função é registrar o cenário previsto; a apuração por stand continua exibindo o resultado realizado a partir de receitas, despesas e rateios efetivamente vinculados.

## Acesso e permissões

O acesso ocorre em **Financeiro → Projetos de Stand / Resultado por Stand**. Na linha do projeto, o botão **Orçamento** abre a lista de versões. Perfis de gestão financeira, administração e desenvolvimento podem criar, revisar, enviar e aprovar. Perfis Comercial/Vendedor podem elaborar versões quando possuírem sessão CRM válida; a aprovação permanece exclusiva da gestão financeira.

| Ação | Permissão | Regra de segurança |
|---|---|---|
| Consultar versões | Sessão CRM autenticada | A leitura fica restrita ao contexto do Projeto de Stand. |
| Criar ou editar rascunho | Gestão financeira, Administração, Desenvolvimento, Comercial ou Vendedor | A composição é recalculada no servidor; valores enviados pelo navegador não são confiados isoladamente. |
| Marcar como enviada | Mesmos perfis de edição | Exige item e valor de venda. A versão passa a ser preservada. |
| Aprovar | Gestão financeira, Administração ou Desenvolvimento | Exige confirmação explícita da revisão de custo, preço, desconto e margem. |

## Composição do orçamento

Cada versão recebe itens com categoria, descrição, quantidade, custo unitário e preço unitário. As categorias iniciais cobrem marcenaria, metalurgia, comunicação visual, mobiliário, elétrica, iluminação, audiovisual, logística, montagem, desmontagem, hospedagem, terceiros, taxas e outros.

| Cálculo | Regra aplicada |
|---|---|
| Custo total do item | Quantidade × custo unitário. |
| Venda total do item | Quantidade × preço unitário. |
| Custo previsto | Soma dos custos totais dos itens. |
| Venda final | Soma das vendas totais menos desconto comercial. |
| Margem prevista | Venda final menos custo previsto. |
| Margem percentual | Margem prevista ÷ venda final, quando a venda final for maior que zero. |

Os cálculos são normalizados em centavos no servidor e as quantidades em milésimos. Isso reduz diferenças entre navegadores, evita erros de ponto flutuante em moeda e assegura que os totais gravados sejam auditáveis.

## Estados e histórico

| Estado | Significado | Pode editar? |
|---|---|---|
| Rascunho | Versão em elaboração interna. | Sim. |
| Em revisão | Versão preparada para conferência interna. | Sim. |
| Enviada | Versão declarada como enviada ao cliente. | Não; deve ser duplicada para nova revisão. |
| Aprovada | Referência comercial aprovada para o projeto. | Não; deve ser duplicada para nova revisão. |
| Substituída | Versão aprovada anterior, preservada após a aprovação de uma nova referência. | Não. |
| Recusada | Versão encerrada sem aprovação. | Não. |

> **Regra principal:** duplicar uma versão aprovada cria um novo rascunho, mas mantém a versão aprovada como referência até que a nova revisão seja efetivamente aprovada. Somente nesse momento a referência anterior muda para “Substituída”.

## Fluxo recomendado para a equipe

O Comercial ou Projetos cria a primeira versão com os itens técnicos e preços estimados. Em cada alteração solicitada pelo cliente, a equipe duplica a versão anterior e ajusta apenas a nova revisão. Depois da conferência de custo, desconto e margem, a versão é marcada como enviada. A gestão aprova a versão após confirmar os valores; em seguida, ela serve de referência para Projeto, Montagem e acompanhamento do previsto versus realizado.

Depois que o evento for concluído, a comparação deve ser feita entre a **versão aprovada** e o resultado real já disponível no Projeto de Stand. Diferenças relevantes devem ser registradas como aprendizado de custo, mudança de escopo, aquisição de terceiro, retrabalho, logística ou desconto comercial.

## Auditoria e integridade

As ações de criação, atualização, duplicação, envio e aprovação são registradas na auditoria do CRM. Cada versão mantém autor, data, totais, itens e, quando aplicável, responsável e momento da aprovação. O sistema não permite desconto superior ao valor de venda, itens sem descrição/categoria válida ou alteração de uma versão bloqueada.

## Limites desta primeira versão

Esta entrega registra previsão técnico-comercial. Ainda não transforma automaticamente a versão aprovada em contrato, contas a receber, ordem de compra ou reserva de estoque. Essas integrações devem ser desenvolvidas em etapa posterior, com confirmação explícita da regra de negócio e sem duplicar lançamentos financeiros.
