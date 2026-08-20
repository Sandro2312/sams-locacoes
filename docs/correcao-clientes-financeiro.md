# Busca e cadastro de cliente em lançamentos financeiros

## Problema corrigido

Os formulários de **Conta a Receber** e **Despesa** dependiam de uma lista suspensa extensa, sem busca e suscetível a ficar desatualizada no momento de abertura. Isso dificultava localizar clientes recém-cadastrados e não oferecia uma continuidade segura quando o cadastro ainda não existia.

## Comportamento atual

| Situação | Comportamento implementado |
|---|---|
| Abrir Conta a Receber ou Despesa | O formulário sincroniza clientes com o backend em blocos de até 500 registros e preserva o cliente já vinculado. |
| Procurar cliente | O campo de busca filtra por nome, e-mail ou documento, mantendo o `select` nativo para compatibilidade com teclado, leitores de tela, desktop e mobile. |
| Lista extensa | Sem texto de busca, o seletor exibe até 80 opções iniciais e informa o total cadastrado; a digitação mostra os resultados correspondentes. |
| Cliente não cadastrado | O botão **Novo cliente** abre o cadastro comercial no mesmo modal, sem abandonar o lançamento financeiro. |
| Salvar novo cliente | O CRM retorna ao lançamento, restaura os campos preenchidos e seleciona o novo cliente automaticamente. |
| Cancelar cadastro contextual | O botão de voltar, o cancelar ou o fechamento do cadastro retornam ao lançamento previamente preenchido. |
| Comprovante já anexado antes do retorno | O usuário é avisado que o arquivo precisa ser anexado novamente, pois navegadores não permitem restaurar programaticamente o conteúdo de um campo de arquivo. |

> A correção não altera nem recria contas a receber, despesas, clientes, recebimentos ou comprovantes já persistidos. Ela somente melhora a seleção de cliente durante a edição ou criação de um lançamento.

## Validação

| Verificação | Resultado |
|---|---|
| Sintaxe JavaScript | `node --check` aprovado em `forms.js` e `crm-contas-receber.js`. |
| Regressão específica | 12/12 testes aprovados: busca, paginação em blocos, cache-busters, preservação de rascunho e retorno contextual. |
| Tipos | `pnpm check` aprovado. |
| Saúde do ambiente | Servidor em execução, dependências OK e TypeScript sem erros. |
| Suíte geral | 134/136 testes aprovados; as duas falhas remanescentes são preexistentes em permissões administrativas dos testes de Contato e Orçamento. |

## Limite da validação visual

O ambiente de revisão do navegador estava na tela de login sem sessão de CRM. Por isso, a verificação do fluxo autenticado deve ser feita na próxima abertura autorizada do módulo Financeiro, com foco em uma Conta a Receber e uma Despesa antes de uso operacional amplo.
