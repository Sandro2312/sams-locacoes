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

## Correção da busca de stand

Após a primeira utilização, foi identificado que a lista de projetos era carregada, porém a digitação podia não atualizar o seletor quando a vinculação local do campo não ocorria no momento correto. A busca agora usa delegação de eventos no documento e compara nome, código, referência, cliente convertido, lead e evento. Quando a pesquisa retorna apenas um stand, ele é selecionado automaticamente e o botão **Abrir guia do stand selecionado** é habilitado.

Essa alteração elimina a dependência de clicar novamente no seletor após localizar, por exemplo, **Urano**, e mantém o controle nativo para teclado, leitores de tela, desktop e mobile.

## Fluxo de cliente sem stand vinculado

A busca anterior tinha como fonte apenas Projetos de Stand. Por isso, ao digitar um cliente que existia no cadastro geral — mas que ainda não possuía Projeto de Stand — o resultado podia indicar “0 stands”, embora o cliente estivesse registrado.

O guia agora consulta a base completa de Clientes em blocos, além da lista de Projetos de Stand. Quando encontra o cliente sem vínculo, apresenta o bloco **Cliente encontrado, mas sem Projeto de Stand vinculado** e oferece a ação **Criar Projeto de Stand para este cliente**. O formulário abre com o cliente já selecionado; a equipe informa o evento, o nome/referência do stand e o centro de custo antes de salvar. Após a criação, o usuário retorna ao Guia de Lançamentos no Financeiro e pode abrir o checklist do stand recém-criado.

Esse passo preserva a regra operacional: os lançamentos continuam vinculados a um Projeto de Stand, mas a descoberta inicial parte do cadastro real de Clientes, não apenas de projetos que já existiam.

## Ação obrigatória de continuidade

Após a validação em uso real, o bloco de cliente sem stand recebeu uma ação visual independente e sempre disponível: **“Continuar: criar Projeto de Stand”**. Ela não depende do botão de abertura do checklist nem de um projeto já existente. Ao selecionar o cliente, o botão abre o cadastro contextual; caso nenhuma empresa esteja selecionada, o CRM informa a pendência e direciona o foco para o seletor. O botão foi desenhado dentro de um quadro próprio para permanecer perceptível em telas desktop e mobile.
