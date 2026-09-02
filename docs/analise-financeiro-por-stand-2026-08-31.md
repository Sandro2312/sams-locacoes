# Análise técnica — Financeiro por Stand

## Parecer executivo

A proposta é **aderente à rotina operacional da SAMS** e resolve uma limitação real: o fechamento financeiro nasce naturalmente da combinação de **cliente, evento, identificação do stand e centro de custo**, não da abertura prévia de um Projeto de Stand. Recomendo implementá-la em duas entregas independentes e na ordem apresentada no anexo: primeiro o **checklist de lançamentos do lote**; depois o **Resultado por Stand baseado em lotes confirmados**.

A implementação é viável sem alterar os lançamentos financeiros já existentes. Contudo, há dois cuidados obrigatórios: o envio de vários itens precisa ser protegido contra criação parcial em falhas de rede, e a consulta de resultado deve usar uma chave de agrupamento mais segura do que somente centro de custo.

| Tema | Parecer | Ação recomendada |
|---|---|---|
| Checklist de lote | Viável e de alto impacto operacional | Implementar como primeira entrega |
| Uso das categorias atuais | Compatível | Reutilizar as categorias já aceitas pelo servidor |
| Parcelamento da venda | Compatível | Reaproveitar a validação existente de soma de parcelas |
| Formulário personalizado | Necessário | Manter recolhido como alternativa avançada |
| Resultado por Stand | Viável, mas requer nova consulta de leitura | Criar uma fonte específica para a tela financeira |
| Projeto de Stand | Deve continuar opcional | Exibir somente como detalhe avançado quando houver vínculo |
| Rateios | Deve permanecer fora da alteração funcional | Corrigir antes a disponibilidade das tabelas restauradas |

## Evidências verificadas no CRM atual

O endpoint atual de itens do lote aceita todos os campos necessários para o checklist: natureza, categoria, descrição, valor, parcelas, vencimentos, valores parcelados, forma de pagamento e observações. Ele já valida valor, data, categoria, descrição e a igualdade entre o total e a soma das parcelas. A confirmação do lote é transacional e cria as Contas a Receber e Despesas com o `centro_custo`, `evento_id` e `cliente_id` do lote.

> A confirmação atual grava `projeto_stand_id` como `NULL` nos lançamentos derivados do lote. Isto confirma a premissa do anexo: a tela de resultado não pode depender desse vínculo para encontrar lançamentos do fluxo financeiro usual.

A base atual contém cinco lotes, dos quais três estão confirmados e dois permanecem em rascunho. Nos lotes confirmados, foram identificadas 12 parcelas de Contas a Receber e 10 lançamentos de despesas sem vínculo de Projeto de Stand. Portanto, já existem dados reais suficientes para validar a nova visão por lote.

| Evidência | Estado atual | Consequência |
|---|---|---|
| Itens do lote | Endpoint individual `POST /api/crm/lotes-financeiros/:id/itens` | Pode receber os itens selecionados pelo checklist |
| Confirmação do lote | Transação única no servidor | Mantém a proteção contra duplicidade na geração financeira |
| Resultado por Stand | Consulta parte de `crm_projetos_stand` | Não enxerga os lançamentos criados somente por lote |
| Lançamentos de lote | `centro_custo`, cliente e evento preenchidos; projeto nulo | Permitem uma nova apuração financeira direta |
| Projetos de Stand | Cadastro, orçamento técnico e guia avançado já existem | Devem ser preservados como recurso complementar |

## 1. Checklist pré-determinado do lote

### Aderência técnica

O catálogo proposto usa somente categorias já reconhecidas pelo servidor: `venda_stand`, `adicional`, `montagem`, `desmontagem`, `comissao_vendedor`, `comissao_projetista`, `fornecedor`, `logistica`, `taxas` e `outros`. Não há necessidade de migração de banco nem de alteração do enum de categorias.

A interface pode apresentar as linhas como checkboxes expansíveis. Ao marcar uma linha, serão exibidos valor, vencimento e forma de pagamento opcional. A linha **Venda do stand** usará a mesma grade já existente para quantidade de parcelas, data e valor de cada parcela. As linhas de outras receitas e outras despesas podem ser repetidas com descrição livre.

O formulário personalizado existente deve permanecer, recolhido por padrão, para preservar cenários excepcionais, categorias menos comuns e despesas parceladas. O checklist não substitui esse formulário: apenas torna o fluxo mais rápido para o fechamento padrão.

### Risco de envio parcial

O requisito de validar tudo antes de enviar é atendível no navegador: nenhuma requisição será iniciada enquanto qualquer linha marcada estiver sem valor, data ou, no caso da venda, com parcelas cuja soma não corresponda ao total. Porém, o endpoint atual aceita **um item por requisição**. Assim, uma queda de conexão entre o terceiro e o quarto item poderia deixar parte do checklist criada no rascunho.

Para uma operação financeira segura, recomendo uma pequena exceção ao pedido de não criar endpoint: um endpoint interno de lote de itens, por exemplo `POST /api/crm/lotes-financeiros/:id/itens-em-lote`, que receba o conjunto validado e faça todos os `INSERTs` em uma única transação. Ele reutilizaria a validação já existente de cada item, não altera schema e preserva o endpoint individual para o formulário personalizado.

Caso se opte estritamente por não criar essa rota, a interface poderá enviar os itens um a um somente após validar todos os campos. Nesse cenário, será necessário informar claramente uma falha parcial e manter visíveis os itens já criados para revisão ou remoção. É funcional, mas oferece menor proteção operacional.

## 2. Resultado por Stand baseado em lançamentos existentes

### Alteração necessária

A tela atual não pode ser apenas ajustada no navegador. Ela consome `GET /api/crm/projetos-stand`, cuja consulta começa em `crm_projetos_stand` e soma receitas, despesas e rateios por `projeto_stand_id`. Alterar essa rota diretamente misturaria dois propósitos distintos: a lista administrativa de Projetos de Stand e o relatório financeiro por lote.

Recomendo criar uma rota de leitura dedicada ao Financeiro, com filtros e paginação próprios. Ela partirá de lotes **confirmados**, associará cliente e evento e calculará os lançamentos por chave de resultado. A tela `resultados_stand` passa a consumir essa rota, sem modificar o CRUD, o orçamento técnico ou o guia de fechamento de Projetos de Stand.

### Chave de agrupamento recomendada

O anexo propõe cliente, evento e centro de custo. Na prática, a consulta deve incluir também a identificação do stand na lista e tratar o centro de custo como identificador operacional do agrupamento. A chave recomendada é:

```text
cliente_id + evento_id + centro_custo + identificacao_stand
```

Os valores financeiros devem ser filtrados por `cliente_id`, `evento_id` e `centro_custo`, além de excluir status cancelado. Incluir cliente e evento evita que um centro de custo reutilizado por engano em outra operação some valores de stands distintos. A identificação do stand é preservada como informação exibida e como salvaguarda de diagnóstico.

Na base atual foram encontrados dois rascunhos vazios com o mesmo cliente, evento e centro de custo de um lote confirmado. Por isso, a consulta precisa considerar **somente lotes confirmados** e deduplicar a chave lógica de resultado. Rascunhos jamais devem aparecer no Resultado por Stand.

### Rateios e Projeto de Stand opcional

O comportamento proposto para rateios é correto: eles somente entram no resultado quando houver um Projeto de Stand efetivamente vinculado e uma alocação aprovada para esse projeto. O Projeto de Stand deve ser encontrado opcionalmente pela combinação de cliente, evento e centro de custo. Se o vínculo for único, a linha exibirá **Detalhes avançados**; se não houver projeto, o relatório continua íntegro e não mostra esse atalho.

Foi identificada uma pendência de restauração: na inspeção da base atual, as tabelas `crm_rateio_alocacoes` e `crm_rateio_regras` não estavam disponíveis, embora a tela atual já contenha consultas a elas. Isto é um risco pré-existente que deve ser tratado antes da nova tela consultar rateios. A correção deve consistir em alinhar as migrações restauradas ou em uma verificação defensiva de disponibilidade; o mecanismo de rateio e seus dados não devem ser alterados nesta entrega.

## Sequência segura de implementação

| Ordem | Entrega | Mudanças previstas | Critério de aceite |
|---|---|---|---|
| 0 | Preparação técnica | Conferir e alinhar a disponibilidade das tabelas de rateio sem mexer nas regras | Tela atual não falha quando há ou não há rateio aplicável |
| 1 | Checklist de lote | Interface expansível, validação total, receitas/despesas repetíveis e formulário personalizado recolhido | Itens marcados entram no rascunho sem criar lançamentos financeiros reais |
| 2 | Proteção de inclusão | Rota transacional de itens em lote, recomendada | Falha em uma linha não deixa itens parcialmente criados |
| 3 | Nova apuração | Rota de leitura por lote confirmado, evento, cliente e centro de custo | Lote confirmado sem Projeto de Stand aparece com valores corretos |
| 4 | Interface de resultados | Cards, tabela, filtros e atalho de detalhes avançados opcional | Totais conciliam com Contas a Receber e Despesas não canceladas |
| 5 | Regressão | Testes de lote, cancelamento, colisão de centro de custo, rateio opcional e responsividade | Nenhuma regressão em Projeto de Stand, rateio ou formulários manuais |

## Cenários obrigatórios de validação

O aceite deve cobrir um lote novo sem Projeto de Stand, contendo venda parcelada, ao menos uma despesa padrão e uma outra receita ou despesa personalizada. Antes da confirmação, os itens devem estar apenas em rascunho; depois dela, a nova tela deve apresentar o stand, receitas, despesas e margem com os mesmos totais dos cadastros financeiros de origem.

Também devem ser testados lotes de eventos diferentes com centros de custo semelhantes, itens cancelados, rascunhos vazios, projeto opcional vinculado, ausência de rateio e rateio aprovado. A interface deve manter o formulário personalizado funcional em desktop e mobile, e a criação de itens não deve alterar contas ou despesas já existentes.

## Decisão recomendada

Recomendo autorizar a implementação com dois ajustes de segurança: **rota transacional para inserir o checklist completo** e **preparação da disponibilidade das tabelas de rateio antes da nova apuração**. A proposta preserva a rotina atual de lançamentos manuais e transforma o Projeto de Stand em ferramenta avançada, sem torná-lo pré-requisito para o fechamento financeiro.

## Fontes internas analisadas

| Fonte | Papel na análise |
|---|---|
| `prompt-manus-financeiro-stand.md` | Requisitos de negócio e critérios de aceite |
| `server/crm-lotes-financeiros.ts` | Validação, inserção e confirmação transacional do lote |
| `server/crm-projetos-stand.ts` | Consulta atual baseada em Projeto de Stand |
| `client/public/crm/js/crm-lotes-financeiros.js` | Interface atual de itens e confirmação do lote |
| `client/public/crm/js/crm-projetos-stand.js` | Interface atual de Resultado por Stand |
| Base de dados restaurada | Evidências de lotes, vínculos financeiros e disponibilidade de tabelas |
