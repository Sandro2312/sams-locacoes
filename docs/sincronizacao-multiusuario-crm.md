# Sincronização Multiusuário do CRM

## Diagnóstico atual

> **Conclusão principal:** os dados dos módulos críticos são gravados no servidor, porém a tela de cada colaborador não recebe uma notificação automática quando outro colaborador cria ou altera um registro. Portanto, a persistência é compartilhada; a visualização, em regra, ainda depende de recarga do módulo, retorno à tela ou abertura de uma nova sessão.

O CRM inicia com um cache local por navegador em `localStorage` e, aproximadamente 800 milissegundos depois, sincroniza clientes, eventos, contas a receber, transações, leads e Projetos de Stand a partir do servidor. Esse desenho reduz o tempo de abertura, mas permite que uma tela já aberta permaneça temporariamente desatualizada. A persistência local também continua presente em partes legadas do CRM, o que não é adequado como fonte de verdade para colaboração entre dispositivos. [1] [2]

| Situação | Comportamento atual | Impacto para 7 colaboradores |
|---|---|---|
| Cadastro em módulo conectado ao servidor | O registro é salvo no banco e o autor normalmente recarrega a própria página/módulo. | Os demais usuários não veem a alteração até atualizar ou reabrir a tela. |
| Tela aberta por longo período | Não há canal global de atualização em tempo real, nem atualização automática ao retornar ao foco. | Listas, dashboards e agendas podem ficar defasados. |
| Cache local do navegador | A aplicação lê `sams_module_data` primeiro e depois sincroniza parte dos dados no bootstrap. | O cache pode exibir informação antiga até a sincronização; não deve ser tratado como fonte compartilhada. |
| Edição simultânea do mesmo registro | Não há controle de versão obrigatório nas edições legadas. | A última gravação pode substituir uma alteração anterior sem aviso explícito. |
| Dados locais legados | O `CrudManager` mantém alguns registros no armazenamento do navegador. | Esses registros não acompanham outro navegador, aparelho ou colaborador. |

## Resposta objetiva à operação diária

Hoje, **não é necessário recarregar o navegador inteiro a cada inclusão**, mas o colaborador que está em outra sessão geralmente precisa usar o botão **Atualizar** do módulo, mudar e retornar à tela, ou recarregar a página para ver dados criados por outra pessoa. O autor da alteração já costuma receber a lista atualizada após salvar. Isso explica por que duas pessoas podem observar conteúdos diferentes por alguns instantes mesmo com o mesmo CRM aberto.

## Riscos a tratar antes de acelerar a atualização

O principal risco não é apenas a demora visual; é o conflito. Se Vera estiver alterando uma tarefa enquanto Martina editar a mesma tarefa em outro navegador, a atualização silenciosa não deve apagar o formulário que está sendo preenchido. A solução precisa separar **atualização de listas** de **atualização de formulários em edição**.

| Risco | Regra recomendada |
|---|---|
| Registro criado por outro usuário | Inserir ou sinalizar o novo item na lista sem interromper a tela atual. |
| Registro alterado por outro usuário | Exibir aviso discreto: “este registro foi atualizado por outro colaborador”. |
| Formulário em edição local | Não sobrescrever campos preenchidos. Oferecer “Recarregar dados”, “Comparar” ou “Salvar minha versão”. |
| Dois salvamentos do mesmo registro | Usar coluna de versão/`updated_at` enviada pelo cliente; o servidor rejeita uma versão desatualizada com instrução de revisão. |
| Dados meramente locais | Migrar gradualmente os módulos colaborativos para APIs e banco; `localStorage` permanece somente como cache/rascunho de interface. |

## Alternativas de evolução

| Abordagem | Resultado para a equipe | Pontos de atenção | Custo e complexidade |
|---|---|---|---|
| **A. Atualização assistida** | Botão Atualizar padronizado, indicador de “última sincronização”, atualização ao voltar para a aba e a cada 60 segundos em listas críticas. | Não é instantânea; alterações podem levar até o próximo ciclo para aparecer. | Baixa; sem serviço contínuo adicional. |
| **B. Atualização adaptativa de listas** | Enquanto a aba estiver visível, as listas críticas consultam alterações recentes em intervalos curtos; avisos surgem sem recarregar o navegador inteiro. | Exige controle de edição e versionamento para não interromper formulários. | Média; adequada ao CRM atual e aos sete colaboradores. |
| **C. Atualização por eventos em tempo real** | Novos leads, tarefas, agendas e alterações chegam imediatamente em todas as sessões conectadas. | Requer serviço contínuo de comunicação, observabilidade e proteção adicional contra reconexões/conflitos. | Maior; envolve infraestrutura persistente e operação contínua. |

## Escopo gradual sugerido

O primeiro recorte deve cobrir os módulos nos quais o atraso traz efeito operacional imediato: **Leads e Kanban**, **Agenda/Tarefas**, **Eventos**, **Financeiro** e **Processos Jurídicos**. Cada página deve mostrar a hora da última sincronização, ter atualização manual explícita e realizar atualização segura quando o usuário voltar à aba. Em seguida, a segunda etapa pode habilitar atualização adaptativa das listas e o controle de versão nas edições.

Uma terceira etapa somente deve adotar comunicação instantânea para eventos que realmente justificam isso, como novo lead do site, prazo jurídico próximo, novo ticket ou tarefa repassada. Essa separação mantém o CRM rápido no mobile e evita transformar todo salvamento em uma atualização invasiva para os sete colaboradores.

## Decisão necessária

Antes de implementar, a direção deve escolher entre as abordagens A, B ou C. A alternativa A é a mais leve; B melhora muito a colaboração sem exigir serviço contínuo; C oferece experiência imediata, mas requer uma operação de infraestrutura mais robusta. Independentemente da escolha, o controle de versão e os avisos de conflito devem ser tratados como requisito de segurança, não como detalhe visual.

## Referências internas

[1] `client/public/crm/js/modules.js`, inicialização, sincronização de dados de servidor e cache `sams_module_data`.

[2] `client/public/crm/js/crud-manager.js`, persistência local de módulos legados e emissão de eventos locais.
