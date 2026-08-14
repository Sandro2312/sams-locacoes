# Sincronização Multiusuário do CRM

## Situação implementada

O CRM passou a adotar **atualização adaptativa de listas críticas**, sem recarregar o navegador inteiro. O gerenciador `CrmSyncManager` é carregado após a navegação do CRM e consulta novamente os dados persistidos quando o usuário retorna à aba, volta a focar a janela, altera dados em outra aba do mesmo navegador, conclui um salvamento local ou permanece na tela por um ciclo de 60 segundos.

O mecanismo é intencionalmente limitado às áreas com maior impacto operacional. Ele funciona somente em sessão autenticada e em tela visível; assim, reduz consultas desnecessárias em dispositivos móveis e não executa atualizações em segundo plano quando a pessoa está em outra aba.

| Área do CRM | Atualização segura aplicada |
|---|---|
| Dashboard e Agenda/Tarefas | Atualiza tarefas administrativas e redesenha a agenda antes de recarregar a visão atual. |
| Marketing | Atualiza as listas de Leads e Contatos. |
| Kanban | Importa tarefas persistidas do Kanban e cartões de captação do site, preservando os cartões locais que não forem retornados pelo recorte da API. |
| Comercial | Atualiza a lista de Eventos. |
| Financeiro | Recarrega transações e a página financeira em uso. |
| Jurídico | Atualiza a lista de Processos nas páginas de processos e prazos. |

## Experiência para a equipe

Em módulos prioritários, uma etiqueta flutuante no canto superior direito informa o estado da atualização. O botão pode ser acionado para uma atualização manual. Ele exibe “Sincronizando dados…”, o horário de sucesso ou uma mensagem de nova tentativa caso a consulta falhe.

> **Proteção de edição:** o CRM não recarrega listas enquanto há modal aberto, formulário ativo ou campo de texto, seleção ou data em foco. Nesse caso, apresenta “Novos dados disponíveis — conclua a edição para atualizar”. Campos de busca foram excluídos dessa proteção para que a pesquisa não bloqueie a atualização por tempo indeterminado.

| Gatilho | Regra operacional |
|---|---|
| Abertura do CRM | Primeira verificação aproximadamente 1,8 segundo após a inicialização. |
| Retorno à aba ou foco da janela | Atualiza após intervalo mínimo de 15 segundos desde a última sincronização, evitando consultas repetidas. |
| Alteração em outra aba | Reavalia as listas quando o cache local compartilhado do navegador muda. |
| Salvamento local | Solicita atualização após 1,2 segundo para absorver a persistência do servidor. |
| Tela ativa por longo período | Verifica os módulos prioritários a cada 60 segundos. |
| Edição em curso | Adia a atualização; não substitui o formulário aberto. |

## Limites e evolução recomendada

Esta etapa mantém o banco de dados e as APIs como fonte de verdade para os módulos conectados, enquanto o `localStorage` permanece apenas como cache de interface e suporte a componentes legados. A solução não é um canal instantâneo por WebSocket ou SSE: uma alteração pode aparecer no próximo gatilho de atualização, no máximo após o ciclo de 60 segundos enquanto a tela estiver visível.

Também não foi introduzido bloqueio pessimista nem controle de versão obrigatório para todos os formulários legados. Portanto, dois usuários ainda devem evitar editar o mesmo registro ao mesmo tempo; a proteção atual impede que a atualização automática apague uma edição em andamento, mas não substitui a futura validação de `updated_at` ou versão no salvamento.

| Próxima evolução | Objetivo |
|---|---|
| Controle de versão em APIs de edição | Rejeitar salvamentos sobre um registro alterado por outra pessoa e orientar a revisão. |
| Aviso de atualização por registro | Mostrar que um item específico foi alterado por outro colaborador. |
| Eventos em tempo real seletivos | Considerar WebSocket ou SSE apenas para novo lead, ticket, prazo jurídico e tarefa repassada, após avaliar operação contínua. |

## Validação executada

As sintaxes de `crm-sync.js` e `kanban.js` foram verificadas. A checagem TypeScript não apresentou erros e os testes específicos da sincronização passaram integralmente. A suíte geral registrou **94 testes aprovados**; as duas falhas restantes pertencem aos testes preexistentes de listagem de Contato e Orçamento, que esperam acesso administrativo incompatível com a regra atual de permissões e não são relacionadas à sincronização.

O preview público e a tela de login do CRM foram carregados com sucesso. A validação visual autenticada de conteúdos internos permanece dependente de uma sessão de usuário, mas a proteção de modais, campos em edição, sessão e visibilidade está coberta por código e testes de regressão.

## Referências internas

| Referência | Responsabilidade |
|---|---|
| `client/public/crm/js/crm-sync.js` | Gatilhos, proteção de edição, indicador e atualização por módulo. |
| `client/public/crm/js/kanban.js` | Importação segura de tarefas persistidas de Kanban e captação. |
| `server/crm-sync.test.ts` | Cobertura de gatilhos, proteção de edição e módulos prioritários. |
| `server/captacao-site.test.ts` | Regressão da compatibilidade da captação com a sincronização do Kanban. |
