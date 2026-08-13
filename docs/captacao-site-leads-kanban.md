# Captação do Site para Leads e Kanban

## Finalidade

Os formulários públicos de **Contato** e **Solicitação de Orçamento** agora preservam seus registros originais e, em paralelo, encaminham o contato para o CRM como um lead comercial. A automação cria uma tarefa vinculada no Kanban para que a equipe responsável faça o primeiro atendimento.

> O envio do visitante não é bloqueado se o CRM estiver temporariamente indisponível. O registro público e a notificação do proprietário continuam sendo tratados pelo fluxo já existente.

## Regra operacional

| Etapa | Comportamento |
|---|---|
| Origem | O contato recebe `site_contato` ou `site_orcamento`, conforme o formulário utilizado. |
| Dados de campanha | Parâmetros `utm_source`, `utm_medium` e `utm_campaign` da URL são associados ao lead quando presentes. |
| Deduplicação | O CRM compara e-mail normalizado e telefone/WhatsApp normalizado. Novo envio de um lead já cadastrado registra uma interação, sem duplicar o lead. |
| Tarefa | Há no máximo uma tarefa aberta de `captacao_site` por lead. Ao concluir ou cancelar a anterior, um novo envio poderá criar uma nova tarefa. |
| Atribuição | O sistema usa `crm_settings.captacao_site_responsavel_id` quando configurado para um perfil de gestão ativo. Sem configuração, usa o primeiro usuário ativo por prioridade: Desenvolvedor, Administrador e Gerente. |
| Kanban | A tarefa é armazenada em `crm_tarefas` com `modulo='captacao_site'` e `referencia_id` do lead. O Kanban a importa como card com a etiqueta **captação**. |

## Administração e auditoria

Cada conversão grava um evento em `crm_auditoria`, indicando origem, se houve deduplicação, tarefa associada e responsável escolhido. O lançamento público, o lead e a tarefa não são misturados: assim, a equipe pode acompanhar a operação comercial sem perder a mensagem original enviada pelo visitante.

Para definir outro responsável padrão, um perfil com permissão administrativa poderá gravar em `crm_settings` a chave `captacao_site_responsavel_id` com o ID de um usuário ativo de gestão. Essa configuração é opcional; a regra de fallback mantém a captação operante desde o primeiro uso.

## Limites desta etapa

Esta primeira etapa trata os formulários hospedados no próprio site. Leads de Instagram, Facebook e formulários de anúncios Meta permanecem fora do escopo até a conexão autorizada da conta empresarial e a configuração de webhooks da plataforma.
