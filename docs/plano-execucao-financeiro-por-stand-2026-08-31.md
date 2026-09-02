# Plano de execução seguro — Financeiro por Stand

## Objetivo e regra de proteção

Este plano implementa, em entregas separadas e reversíveis, duas melhorias: o **checklist pré-determinado de lançamentos** no lote financeiro e o **Resultado por Stand baseado em lotes confirmados**, sem exigir Projeto de Stand. A regra principal é preservar integralmente os dados já existentes e não modificar os formulários manuais de Contas a Receber, Despesas, Projetos de Stand ou Rateios.

> Nenhum lote já confirmado, lançamento financeiro existente, projeto, rateio ou cadastro de cliente/evento será regravado para implantar esta evolução. A nova apuração será somente de leitura sobre os dados já persistidos.

| Elemento preservado | Garantia de execução |
|---|---|
| Lotes financeiros atuais | Nenhuma migração de conversão ou atualização em massa |
| Contas a Receber e Despesas manuais | Rotas, campos e comportamento atuais permanecem inalterados |
| Confirmação final do lote | Mantida com confirmação humana e transação única |
| Projeto de Stand | Mantido como recurso avançado de orçamento, projeto e acompanhamento |
| Rateios | Sem alteração de regra, cálculo ou alocação existente |
| Perfis e permissões | Nomes atuais das permissões preservados |

## Visão das entregas

| Entrega | Escopo | Dependência | Critério de conclusão |
|---|---|---|---|
| 0. Preparação | Auditoria de schema, cópia de segurança lógica e base de regressão | Nenhuma | Ambiente apto e rollback identificado |
| 1. Checklist de lote | Interface e inclusão transacional de itens padrão | Entrega 0 | Itens marcados entram somente em rascunho |
| 2. Resultado por lote | Nova rota de leitura e tela financeira | Entrega 1 e schema de rateio verificado | Lote confirmado sem projeto aparece com totais corretos |
| 3. Homologação | Conciliação, testes de perfis e publicação gradual | Entregas 1 e 2 | Aceite do fluxo real sem regressão |

## Etapa 0 — Preparação, auditoria e ponto de reversão

### Passo 0.1 — Registrar o estado atual

Antes de alterar código, será criado um checkpoint do projeto e serão registrados: quantidade de lotes por status, totais de Contas a Receber e Despesas por lote confirmado, quantidade de Projetos de Stand e quantidade de alocações de rateio aprovadas. Esse retrato serve de comparação pós-implantação; não haverá alteração de linhas nessa etapa.

### Passo 0.2 — Verificar schema restaurado

Será verificada a presença e estrutura de `crm_lotes_financeiros_stand`, `crm_lotes_financeiros_stand_itens`, `crm_contas_receber`, `crm_transacoes`, `crm_projetos_stand`, `crm_rateio_regras` e `crm_rateio_alocacoes`. A análise atual identificou que as tabelas de rateio não estavam disponíveis na base restaurada, embora o código já possua consultas a elas.

Se alguma tabela de rateio estiver ausente, a implementação do Resultado por Stand ficará bloqueada apenas no componente de rateio até que seja aplicada a migração versionada correta. Não será criado esquema paralelo e não será desativado o mecanismo atual.

### Passo 0.3 — Definir casos reais de aceitação

Serão escolhidos apenas lotes existentes e confirmados para conciliação de leitura, incluindo um lote sem Projeto de Stand. Para testes de escrita, será usado exclusivamente um lote temporário em rascunho, removido ao término, sem confirmação e sem geração de lançamentos reais.

| Verificação inicial | Resultado esperado |
|---|---|
| Lote confirmado sem Projeto de Stand | Identificado para validação da nova apuração |
| Lote em rascunho | Disponível para teste seguro sem impacto financeiro |
| Centro de custo semelhante em eventos distintos | Separado pelos filtros de evento e cliente |
| Item ou lançamento cancelado | Não entra em receita, despesa ou margem |

## Entrega 1 — Checklist pré-determinado de lançamentos

### Passo 1.1 — Criar o catálogo centralizado no frontend

Será criado um catálogo imutável no módulo do lote financeiro, contendo as receitas e despesas do anexo. Cada item terá natureza, categoria, título, descrição padrão, regra de parcela e possibilidade de repetição. O catálogo usará somente categorias já aceitas pelo servidor.

| Grupo | Linhas padronizadas |
|---|---|
| Receitas | Venda do stand e outras receitas repetíveis |
| Despesas | Montagem, desmontagem, comissões, LED, logística, taxas, fornecedores e outras despesas repetíveis |
| Exceções | Formulário personalizado já existente, recolhido por padrão |

### Passo 1.2 — Montar a interface de checklist

Após criar ou abrir um lote em rascunho, a tela mostrará checkboxes por categoria. Uma linha marcada exibirá valor, vencimento e forma de pagamento opcional; linha desmarcada não será enviada. A venda do stand abrirá a grade de parcelas já usada no formulário atual, incluindo data e valor de cada parcela.

O botão de criação permanecerá separado da confirmação final. Seu texto será **“Adicionar itens selecionados ao rascunho”**, evitando interpretação de que os lançamentos reais já serão gerados.

### Passo 1.3 — Revisar em modal e validar tudo antes de gravar

No cliente, todas as linhas marcadas serão validadas antes de qualquer chamada ao servidor. Em seguida, um **modal de revisão** exibirá a quantidade, natureza, descrição, parcelas e valor total dos itens selecionados. Somente o botão explícito **“Salvar itens no rascunho”** dentro desse modal poderá iniciar a gravação. A validação indicará a linha específica com problema: valor ausente ou inválido, vencimento ausente, descrição obrigatória em itens livres, ou diferença entre total e parcelas da venda.

Nenhuma linha será enviada quando existir erro em outra linha marcada. Essa validação reduz falhas operacionais, mas não elimina por si só risco de queda de conexão entre várias chamadas.

### Passo 1.4 — Adicionar inserção transacional em lote

Será criada uma rota interna dedicada para a inclusão conjunta dos itens marcados, por exemplo `POST /api/crm/lotes-financeiros/:id/itens-em-lote`. Ela reutilizará a mesma normalização e as mesmas regras do endpoint individual, mas abrirá uma transação: ou todos os itens válidos entram no rascunho, ou nenhum entra.

O endpoint individual `POST /:id/itens` continuará existente para o formulário personalizado. Não haverá alteração no schema nem na rota de confirmação final.

| Falha simulada | Comportamento obrigatório |
|---|---|
| Uma linha incompleta | Nenhuma requisição; mensagem por linha |
| Categoria inválida | Transação revertida; nenhum item criado |
| Lote já confirmado | HTTP 409; nenhuma alteração |
| Falha durante inclusão do conjunto | Rollback integral; rascunho permanece inalterado |
| Reenvio acidental | Botão bloqueado durante processamento; resposta clara ao usuário |

### Passo 1.5 — Preservar o lançamento personalizado

O formulário manual existente ficará recolhido em um bloco “Lançamento personalizado”. Ele será aberto sob demanda e manterá todos os recursos atuais, inclusive categorias menos frequentes e parcelamento de despesas. Nenhuma opção existente será removida.

### Passo 1.6 — Testar e salvar a primeira entrega

Serão incluídos testes para o catálogo, a validação de parcelas, a inclusão atômica e a preservação da confirmação final. Também serão feitos testes manuais em desktop e celular: marcar/desmarcar, adicionar linha repetível, voltar ao formulário manual, criar rascunho e remover item. Ao término, será salvo um checkpoint exclusivo da Entrega 1.

## Entrega 2 — Resultado por Stand baseado em lotes confirmados

### Passo 2.1 — Criar uma rota de leitura específica

Não será alterada a rota administrativa de Projetos de Stand. Será criada uma rota exclusiva do Financeiro, por exemplo `GET /api/crm/financeiro/resultados-stand`, com filtros de evento, cliente, centro de custo e paginação.

A fonte inicial será `crm_lotes_financeiros_stand` com `status = 'confirmado'`. Cada chave lógica será deduplicada para evitar que rascunhos vazios ou lotes repetidos provoquem linhas duplicadas.

### Passo 2.2 — Aplicar a chave de apuração protegida

A apuração usará, no mínimo, `cliente_id`, `evento_id` e `centro_custo` para filtrar os lançamentos financeiros. A `identificacao_stand` será exibida e usada como conferência da linha de resultado.

```text
Chave de resultado: cliente_id + evento_id + centro_custo
Informação exibida e de auditoria: identificacao_stand
```

As receitas serão somadas em `crm_contas_receber` e as despesas diretas em `crm_transacoes`, sempre excluindo registros com status cancelado. Para despesas, a consulta manterá os tipos financeiros aceitos no sistema, como `pagar` e `despesa`.

### Passo 2.3 — Tratar rateio apenas quando aplicável

O Projeto de Stand será procurado como vínculo opcional pela combinação de cliente, evento e centro de custo. Havendo um único projeto correspondente, seus rateios aprovados poderão ser somados e será exibido o atalho **“Detalhes avançados”**. Sem projeto, rateio será zero e a linha continuará válida.

Caso as tabelas de rateio estejam ausentes na base restaurada, a nova rota deverá responder com custo rateado zero e um indicador interno de indisponibilidade controlada, ou a entrega deverá aguardar a migração. Ela nunca deve gerar erro 500 para o usuário.

### Passo 2.4 — Migrar somente a tela de Resultado por Stand

A página `resultados_stand` será ajustada para consumir a nova rota. Os cards continuarão exibindo receitas, despesas diretas, custos rateados e margem. A tabela passará a exibir Evento, Cliente, Identificação do Stand, Receita, Despesa, Margem e, quando existir, o atalho para detalhes avançados.

O botão de criação de Projeto de Stand permanecerá como função avançada para orçamento técnico e acompanhamento operacional, mas não será apresentado como requisito para o resultado financeiro existir.

### Passo 2.5 — Conciliar com dados existentes

Será feita uma conciliação de leitura entre cada linha do novo resultado e as fontes financeiras. A validação comparará receitas, despesas e margem de pelo menos um lote confirmado sem projeto e um lote com projeto, quando disponível.

| Cenário | Resultado esperado |
|---|---|
| Lote confirmado sem projeto | Aparece normalmente com receita, despesa e margem |
| Lote em rascunho | Não aparece |
| Lançamento cancelado | Não compõe total |
| Mesmo centro em eventos diferentes | Linhas e valores separados |
| Projeto compatível | Indicador de detalhes avançados aparece |
| Sem projeto ou rateio | Resultado continua disponível; rateio igual a zero |

## Entrega 3 — Homologação e publicação controlada

### Passo 3.1 — Testes automatizados obrigatórios

Serão executados `node --check` nos scripts alterados, `npx tsc --noEmit` no projeto e os testes específicos de lote, resultados, Projetos de Stand, permissões e rateios. Os testes não poderão inserir leads, tarefas, contatos, orçamentos ou lançamentos no banco operacional.

### Passo 3.2 — Testes funcionais em ambiente publicado

Com um perfil autorizado, será testado o fluxo completo: criar lote, selecionar itens do checklist, conferir o rascunho, confirmar manualmente, abrir Resultado por Stand e validar os valores. A confirmação final será usada somente em um caso real autorizado ou em um lote temporário previamente combinado; nenhuma confirmação de produção será simulada sem autorização explícita.

### Passo 3.3 — Responsividade e navegadores

Será conferida a interação em desktop e em viewport móvel. Checkboxes, campos expandidos, grade de parcelas, botão de inclusão e a tabela de resultado devem permanecer acessíveis por toque e teclado, sem depender de efeitos de passagem do mouse.

### Passo 3.4 — Checkpoints e reversão

Cada entrega terá checkpoint próprio. Se uma divergência for identificada, será restaurado o checkpoint da entrega anterior; dados já existentes permanecem preservados porque a nova apuração é de leitura e os testes de escrita serão restritos a rascunhos temporários removidos ao fim da validação.

## Ordem de autorização recomendada

Recomendo aprovar primeiro a **Entrega 0** e a **Entrega 1**. Após a homologação do checklist em um lote real ou autorizado, iniciamos a **Entrega 2** para a nova apuração. Essa sequência reduz risco: acelera o lançamento sem mexer no relatório existente e só depois troca a fonte da tela de Resultado por Stand.

## Condição de início

O desenvolvimento deve iniciar somente após a confirmação desta sequência, com autorização explícita para criar a pequena rota transacional de inclusão em lote. Essa rota é a medida que garante que o checklist não deixe itens parcialmente criados em caso de falha.

## Referências internas

| Documento ou componente | Uso no plano |
|---|---|
| `docs/analise-financeiro-por-stand-2026-08-31.md` | Riscos e aderência técnica já verificados |
| `server/crm-lotes-financeiros.ts` | Validação e confirmação atual do lote |
| `server/crm-projetos-stand.ts` | Consulta atual por Projeto de Stand |
| `client/public/crm/js/crm-lotes-financeiros.js` | Fluxo e interface atuais de lançamento em lote |
| `client/public/crm/js/crm-projetos-stand.js` | Tela atual de Resultado por Stand |
