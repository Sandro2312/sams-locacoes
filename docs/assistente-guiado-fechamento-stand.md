# Assistente Guiado de Fechamento Financeiro por Stand

## Decisão recomendada

O CRM deve incorporar um **Assistente de Fechamento por Stand** dentro de **Projetos de Stand**, e não como um novo formulário financeiro isolado. O Projeto de Stand já é o ponto que conecta cliente e evento; por isso, ele deve ser a referência de centro de custo operacional. O assistente organiza o que precisa ser registrado, aponta lacunas e abre os formulários existentes já pré-preenchidos. Ele **não cria lançamentos em segundo plano, não baixa parcelas e não confirma valores sem revisão humana**.

> A função do assistente é fazer a operação chegar ao lançamento correto e mostrar o que ainda falta. A decisão financeira e a confirmação de cada lançamento continuam sendo do usuário autorizado.

## Resultado esperado

Ao abrir o projeto de um stand, o usuário vê um painel único com três leituras: **comercial**, **custos** e **completude do centro de custo**. Assim, em vez de procurar telas separadas para receita, despesas e rateios, ele recebe uma sequência orientada até que o conjunto esteja completo, pendente de informação ou em divergência.

| Leitura | Pergunta respondida | Fonte de verdade |
|---|---|---|
| Comercial | Qual é o valor vendido, como será recebido e o que já foi registrado? | Orçamento Técnico aprovado e Contas a Receber vinculadas ao Projeto de Stand. |
| Custos | Quais custos foram previstos, lançados, pagos ou ainda não informados? | Itens do orçamento, Despesas, rateios e custos de projeto. |
| Resultado | A margem é estimada, comprometida ou conciliada? | Receitas e despesas efetivamente vinculadas; nunca valor inferido pela IA. |
| Completude | O centro de custo do stand está completo? | Checklist determinístico com estados verificáveis e pendências explícitas. |

## Roteiro guiado de lançamento

O guia deve apresentar uma etapa por vez, salvar o progresso do checklist e permitir que o usuário retome de onde parou. O lançamento deve sempre manter os vínculos de **Evento + Cliente + Projeto de Stand**; o centro de custo exibido deve ser a composição legível desses três elementos, e não um texto livre sujeito a divergência.

| Etapa | Perguntas do guia | Ação oferecida | Conclusão verificável |
|---|---|---|---|
| 1. Contexto | Qual evento, cliente e projeto de stand estão sendo fechados? | Selecionar ou confirmar o Projeto de Stand. | Os três vínculos estão presentes. |
| 2. Venda | Qual versão comercial aprovada será usada como referência? Qual o valor contratado? | Abrir versão aprovada do Orçamento Técnico. | Valor comercial identificado como referência, sem alterar a versão. |
| 3. Créditos | Haverá sinal, parcelas intermediárias, saldo ou cobrança única? | Criar **Conta a Receber** pré-preenchida por parcela. | Soma das parcelas cadastradas comparada ao valor comercial. |
| 4. Projeto | Existe custo de criação, projeto executivo ou projetista? Ele será pago em uma ou mais parcelas? | Criar **Despesa** pré-preenchida na categoria Projeto. | Custo marcado como lançado, estimado, não aplicável ou pendente. |
| 5. Produção e montagem | Há custo de montagem, materiais, locações, frete, desmontagem e terceiros? | Criar uma despesa por categoria, sempre com opção de parcelamento. | Cada categoria tem estado explícito; o guia não presume custo zero. |
| 6. Taxas e comissões | Existem taxas do evento, credenciais, energia, seguro, comissão comercial ou comissão de projetista? | Criar despesas vinculadas e indicar a regra de rateio, quando aplicável. | Comissão e taxa classificadas como registradas, estimadas, não aplicáveis ou pendentes. |
| 7. Conferência | O valor contratado, o recebível previsto, o custo estimado e o custo lançado são coerentes? | Abrir divergências e fontes de cada valor. | Não há divergência crítica sem justificativa. |
| 8. Fechamento | O que permanece pendente e quem fará o follow-up? | Criar tarefas e registrar observação pós-evento. | Situação final: em andamento, revisão requerida ou fechado. |

## Parcelamento e despesas

Cada lançamento sugerido deve abrir o formulário que já existe, com descrição, cliente, evento e Projeto de Stand preenchidos. O usuário escolhe valor, vencimento, fornecedor, status e quantidade de parcelas. Para despesas, o guia deve tornar visível a recorrência e a quantidade de repetições já suportadas pelo formulário, mas não deve espalhar parcelas sem que o usuário revise a data, o valor e o fornecedor.

O custo de projeto exige tratamento especial: mesmo quando uma venda não evolui, o projeto pode gerar despesa. Por isso, o checklist deve aceitar os estados **“projeto perdido com custo registrado”**, **“projeto perdido sem custo informado”** e **“não aplicável”**, em vez de assumir que toda despesa decorre de uma venda aprovada.

## Regra de completude do centro de custo

O painel deve usar estados claros, calculados apenas com dados persistidos e marcações revisadas pelo usuário.

| Estado | Significado | Ação esperada |
|---|---|---|
| **Em planejamento** | O projeto existe, mas venda, despesas ou parcelas ainda não foram integralmente definidos. | Continuar o roteiro guiado. |
| **Pendente de informação** | Uma categoria obrigatória do checklist ainda não está marcada como registrada, estimada ou não aplicável. | Informar, justificar ou atribuir responsável. |
| **Pendente de lançamento** | O custo ou parcela foi confirmado como necessário, porém não há lançamento vinculado. | Abrir o formulário correspondente. |
| **Em divergência** | A soma de parcelas, custos ou rateios diverge da referência aprovada. | Revisar os itens destacados; não fechar sem justificativa. |
| **Pronto para revisão** | Todos os itens têm situação definida e não há divergência crítica. | Revisão de Financeiro/Gerência. |
| **Fechado** | A revisão foi confirmada e os follow-ups restantes estão registrados como tarefas. | Manter histórico imutável de revisão. |

O painel deve apresentar simultaneamente **receita contratada**, **parcelas programadas**, **receita recebida**, **custo estimado**, **custo lançado**, **custo pago** e **margem por estágio**. “Margem estimada” e “margem conciliada” devem ser rótulos distintos para evitar uma aparência enganosa de resultado final.

## Papel da Veruska

A Veruska atual tem modelo seguro de consulta: usa ferramentas de leitura, respeita permissões, registra auditoria, possui limite diário e recusa operações de escrita. Essa é a base correta para a próxima etapa.

| Ação da Veruska | Permitida na primeira versão | Não permitida |
|---|---|---|
| Explicar a próxima pendência do projeto | Sim, com base no checklist e nos lançamentos vinculados. | — |
| Resumir parcelas, custos e divergências | Sim, citando a fonte de cada número. | — |
| Sugerir a categoria de uma despesa | Sim, como sugestão revisável. | Classificar ou gravar automaticamente. |
| Abrir a tela de Conta a Receber ou Despesa com contexto | Sim, por botão explícito do usuário. | Criar ou salvar lançamento diretamente por conversa. |
| Fechar o centro de custo | Não. | Confirmar fechamento, baixar títulos, alterar contrato ou apagar dados. |

Na segunda versão, a Veruska pode receber uma ferramenta de consulta específica, como `consultar_fechamento_projeto_stand`, limitada ao projeto selecionado e aos dados que o perfil do usuário já pode ver. A resposta deve conter: itens concluídos, pendências, divergências, fontes consultadas e próximo passo recomendado. Nenhum comando de escrita deve ser exposto à IA.

## Permissões e auditoria

O checklist pode ser preenchido por Comercial, Projetos e Montagem quando o usuário tiver acesso ao projeto, mas o estado **Fechado** deve exigir Financeiro, Gerência, Administração ou Desenvolvimento. Cada alteração de estado, justificativa de divergência, criação contextual de lançamento e confirmação de revisão deve gerar registro na auditoria com usuário, data, projeto e resumo da mudança.

## Implementação recomendada

| Entrega | Escopo | Prioridade |
|---|---|---|
| **V1 — Checklist determinístico** | Aba “Fechamento” no Projeto de Stand, vínculo obrigatório de contexto, status de cada categoria, cartões de parcelas/custos e botões para abrir formulários existentes. | Alta |
| **V1.1 — Resultado por estágio** | Comparação entre referência comercial, parcelas, custos estimados, custos lançados e margem por estágio. | Alta |
| **V1.2 — Revisão e auditoria** | Estados de revisão, justificativas, tarefas de follow-up e bloqueio de fechamento com pendências críticas. | Alta |
| **V2 — Veruska supervisora** | Consulta do checklist, explicação de pendências e sugestões com fonte, sem permissão de escrita. | Média |
| **V3 — Importação assistida** | Leitura estruturada de contratos, propostas e notas para pré-preencher sugestões, sempre com confirmação humana. | Média |

## Critérios de aceite da V1

1. O usuário consegue iniciar o guia por um Projeto de Stand e o sistema exibe corretamente Evento, Cliente e versão comercial de referência.
2. Cada parcela e despesa criada pelo guia chega ao formulário existente já vinculada ao projeto, evento e cliente, mas só é persistida após o clique de salvar do usuário.
3. O guia permite registrar categorias como projeto, montagem, taxas, comissão comercial, comissão de projetista, logística e outros, com parcelas quando necessárias.
4. O sistema distingue ausência de lançamento, estimativa, item não aplicável e divergência; não assume custo zero.
5. O fechamento não é automático e não altera registros financeiros, contratos, orçamento técnico ou rateios existentes.
6. A tela funciona em desktop e mobile, possui navegação por teclado e registra ações de revisão na auditoria.

## Próximo passo sugerido

Recomendo implementar primeiro a **V1 — Checklist determinístico dentro do Projeto de Stand**, sem IA de escrita. Depois de a equipe usar o fluxo em dois ou três eventos reais, incorporamos a Veruska como leitora e orientadora. Esse caminho entrega benefício operacional rápido, reduz riscos de lançamento indevido e cria uma base confiável para automação supervisionada.
