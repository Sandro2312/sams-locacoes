# Avaliação do Módulo Jurídico — Processos Trabalhistas e Cíveis

**Data:** 13 de agosto de 2026  
**Escopo:** evolução do CRM para cadastro, acompanhamento e consulta de processos, com atenção especial a processos **Trabalhistas** e **Cíveis**.

## Resumo executivo

> O CRM já apresenta o módulo Jurídico e permite registrar uma demanda local com prazos, prioridade, responsável e vínculo a cliente. Entretanto, essas demandas ainda existem somente na memória/localStorage do navegador: não há tabela jurídica nem API persistente no banco. Assim, o módulo atual não é apropriado para tratar o histórico processual, a consulta por número ou o acompanhamento auditável de comunicações judiciais.

A evolução recomendada começa pela criação de um cadastro persistente de **Processo**, separado de atividades jurídicas genéricas. A classificação principal deve ser obrigatoriamente **Trabalhista** ou **Cível**; os demais tipos atuais — contrato, licença, alvará, tributário e regulatório — permanecem como natureza/assunto da demanda, não como substitutos do ramo processual.

| Aspecto | Situação atual | Evolução recomendada |
|---|---|---|
| Persistência | Demandas no navegador, sem tabela jurídica no banco | Processos, partes, prazos e comunicações em tabelas próprias e auditáveis |
| Classificação | Tipo de demanda mistura assunto e ramo | Campo obrigatório **ramo processual**: Trabalhista ou Cível |
| Número do processo | Ausente | Número CNJ único, validado e pesquisável |
| Partes | Vínculo opcional apenas a cliente | Relações com cliente, lead, fornecedor ou parte externa |
| Consulta externa | Inexistente | Consulta por número CNJ por fonte oficial disponível; resultado sempre identificado com fonte e data |
| Prazos | Campo isolado na demanda local | Agenda jurídica, responsáveis, alertas e trilha de alterações |

## Diagnóstico do CRM

O menu, as permissões e o formulário do Jurídico já existem. Os perfis **Desenvolvedor**, **Administrador**, **Gerente** e **Jurídico** possuem acesso ao módulo segundo a matriz atual. O formulário contempla título, cliente, tipo, data de abertura, prazo legal, responsável, status, prioridade e documentos necessários.

Contudo, a lista usa `ModuleSystem.data.demandasJuridicas`, que é inicializada vazia e restaurada do armazenamento local do navegador. Não há sincronização equivalente à usada por clientes, eventos, finanças ou leads; a verificação do banco também não encontrou tabela de processos ou demandas jurídicas. Isso impede compartilhamento entre navegador, celular e usuários, além de não oferecer trilha de auditoria suficiente para processos.

## Modelo funcional proposto

### 1. Processo

Cada processo deve ter uma ficha principal independente, com os seguintes campos. O número CNJ será opcional apenas enquanto o caso estiver na fase pré-processual; quando preenchido, será único no CRM.

| Grupo | Campos principais |
|---|---|
| Identificação | Número CNJ, título interno, ramo processual, tribunal, unidade/vara, comarca, grau, classe e assunto |
| Situação | Pré-processual, em acompanhamento, suspenso, encerrado, arquivado ou perdido de vista; situação processual externa separada |
| Relações | Cliente, lead/prospecto, fornecedor, parte contrária, contrato, evento e Projeto de Stand quando aplicável |
| Gestão | Responsável jurídico, responsável interno, prioridade, data de distribuição, próximo prazo e observações |
| Governança | Fonte da consulta, data/hora da última atualização, usuário que alterou, log de auditoria e marcador de sigilo |

### 2. Ramo processual obrigatório

| Ramo | Finalidade no CRM | Indicadores e filtros específicos |
|---|---|---|
| **Trabalhista** | Reclamações, acordos, execuções e questões associadas à relação de trabalho | Vara/TRT, fase processual, audiência, risco trabalhista, depósito/acordo e prazo de defesa |
| **Cível** | Contratos, indenizações, cobranças, fornecedores, consumidores, locações e demais controvérsias cíveis | Tribunal/juizado, comarca, valor da causa, polo da empresa, tutela, recurso e prazo processual |

Essa divisão deve aparecer no primeiro filtro da tela, nas listas, nos cartões de resumo e no calendário. O usuário poderá usar “Todos”, “Trabalhistas” ou “Cíveis”, sem perder a possibilidade de filtrar também por status, responsável, cliente, evento e prazo.

### 3. Partes e documentos

O sistema não deve copiar indiscriminadamente CPF/CNPJ para várias tabelas. Quando a parte já existir no CRM, o processo deve apontar para o respectivo registro de cliente, lead ou fornecedor. Para parte externa não cadastrada, o CPF/CNPJ deve ficar protegido, com acesso restrito ao Jurídico/Administrador/Desenvolvedor, mascaramento na lista e registro de acesso.

Documentos devem ser vinculados pelo Acervo, em pasta lógica do processo, com categoria como petição, procuração, intimação, decisão, comprovante de citação ou acordo. O módulo Jurídico manterá metadados e links, sem duplicar o arquivo.

## Consulta por número do processo

O cadastro pelo número é viável e deve ser a primeira automação do módulo. A interface recebe o número CNJ, normaliza a máscara, verifica duplicidade e permite criar a ficha. Em seguida, o sistema pode consultar uma fonte oficial disponível e preencher somente os metadados retornados, exibindo claramente a origem e o instante da consulta.

O Datajud do CNJ é a fonte oficial mais adequada para uma primeira integração nacional: sua API pública disponibiliza metadados de processos e movimentações de todas as instâncias, observando a proteção de processos sigilosos e de dados das partes.[1] [2] A consulta processual do eproc/Justiça Federal da 4ª Região também permite busca por número, nome da parte e CPF na interface oficial.[3] Isso demonstra que o uso desses critérios existe para consulta pública, mas não significa que haja uma API pública uniforme de eproc para automatizar buscas por CPF/CNPJ em todos os tribunais.

| Capacidade | Viabilidade | Implementação segura |
|---|---|---|
| Cadastrar pelo número CNJ | Alta | Validação local, unicidade e criação manual imediata |
| Preencher dados básicos do processo | Alta, quando a fonte responder | Consulta ao Datajud; salvar fonte, data e resposta normalizada |
| Pesquisar por CPF/CNPJ | Variável por tribunal/fonte | Somente sob permissão, finalidade documentada e confirmação humana antes de vincular resultados |
| Acompanhar movimentações | Moderada | Atualização manual inicialmente; posterior rotina por fonte contratada/autorizada |
| Capturar citações/intimações oficiais | Restrita | Não usar scraping de portais autenticados; integrar somente canal autorizado da própria empresa |

## Citações, intimações e eproc

O eproc é uma plataforma processual adotada por tribunais específicos; no Rio Grande do Sul, o TJRS mantém acessos separados para 1º e 2º graus e orienta o uso de autenticação em dois fatores.[4] A consulta por interface não é, por si só, uma autorização para automação: não foi identificada documentação pública oficial que permita prometer uma API única de eproc ou webhook para buscar, em todos os tribunais, citações por CPF/CNPJ.

Para comunicações pessoais dirigidas à empresa, o caminho oficial é o **Domicílio Judicial Eletrônico**, que centraliza citações, intimações e outras notificações emitidas pelos tribunais brasileiros.[5] Já o **DJEN** é destinado às publicações de atos e intimações para advogados/sociedade de advogados, enquanto o Domicílio é reservado a citações e comunicações pessoais dirigidas à parte ou terceiros.[6] O portal público do Comunica/PJe permite visualizar instituições e publicações, mas essa visibilidade não substitui uma integração autorizada ao Domicílio ou ao sistema do advogado.[7]

> **Regra de segurança proposta:** o CRM pode registrar e alertar sobre uma comunicação já recebida pelos canais oficiais, mas não deve se apresentar como canal oficial de citação/intimação. A contagem e a gestão de prazo jurídico permanecem sujeitas à conferência do responsável jurídico no sistema oficial aplicável.

## Alternativas de evolução

| Alternativa | Funcionamento | Trade-offs | Custo | Complexidade |
|---|---|---|---|---|
| **A. Cadastro interno estruturado** | Cadastro por número CNJ, ramos Trabalhista/Cível, partes, prazos, documentos e Agenda Jurídica. Consulta externa fica manual por link oficial. | Entrega controle interno rapidamente, sem prometer atualização automática. | Sem fornecedor externo adicional. | Baixa a média |
| **B. Cadastro + Datajud oficial** | Além do cadastro, consulta metadados e movimentações pela fonte nacional quando disponíveis. | Boa cobertura de metadados; processos sigilosos e lacunas de atualização continuam limitados. | Sem fornecedor de dados, sujeito às regras de uso da fonte. | Média |
| **C. Monitoramento especializado contratado** | Integra provedor jurídico com cobertura, normalização e alertas conforme contrato e permissões. | Pode ampliar abrangência, mas exige avaliação de cobertura, LGPD, credenciais e custo. | Recorrente, definido pelo fornecedor. | Média a alta |

## Privacidade, acesso e auditoria

Processos podem conter dados pessoais e, em alguns casos, informação sigilosa. A implementação deve observar minimização de dados, finalidade definida, controle por perfil, log de leitura/exportação e retenção. CPF/CNPJ devem ser tratados como dados restritos e nunca usados para pesquisa massiva ou enriquecimento sem base operacional documentada.

O usuário **Jurídico** deve operar os processos; **Administrador** e **Desenvolvedor** devem ter acesso administrativo auditado; demais perfis devem receber apenas visibilidade explícita e limitada quando forem responsáveis internos ou partes relacionadas. A exportação precisa conter marca d’água, registro de auditoria e filtro de sigilo.

## Sequência recomendada

1. Implementar a alternativa A, substituindo demandas locais por Processos persistentes e separando Trabalhistas de Cíveis.
2. Adicionar cadastro por número CNJ, vínculo a cliente/lead/fornecedor, documentos no Acervo, Agenda Jurídica e trilha de auditoria.
3. Validar com um conjunto pequeno de processos reais, sem importar CPF/CNPJ em massa.
4. Habilitar a alternativa B para consulta assistida ao Datajud, exibindo fonte e data da atualização.
5. Avaliar a alternativa C somente se houver necessidade recorrente de monitoramento externo e credenciais/contrato adequados.

## Implantação realizada — alternativa B assistida

Em 13 de agosto de 2026, a primeira etapa da alternativa B foi implantada no CRM. O módulo Jurídico agora mantém **Processos** e **Prazos** em estrutura persistente, com classificação obrigatória entre **Trabalhista** e **Cível**, status, tribunal, comarca, vara, parte externa, responsável, datas relevantes e marcador de sigilo. O cadastro aceita número CNJ, normaliza a numeração e impede duplicidade quando o número é informado.

| Recurso implantado | Comportamento operacional |
|---|---|
| Processos e prazos persistentes | Os registros deixam de depender do navegador/localStorage e passam a ser compartilhados entre sessões autorizadas. |
| Agenda Jurídica | Exibe prazos pendentes vinculados ao processo e permite registrar novos prazos no detalhe do processo. |
| Sigilo e perfis | Dados de processos marcados como sigilosos são reduzidos para perfis não privilegiados; operações são protegidas e auditáveis. |
| Documentos | O detalhe do processo permite abrir a lista de documentos vinculados e anexar diretamente um novo arquivo, mantendo o Acervo como repositório documental único. |
| Consulta Datajud | A busca é acionada manualmente por processo, registra fonte/data e apresenta somente uma sugestão para revisão humana. Nenhum dado consultado sobrescreve o cadastro automaticamente. |

> **Limite operacional mantido:** a consulta Datajud não é prova de ciência de intimação/citação e não substitui a conferência do responsável jurídico no Domicílio Judicial Eletrônico, DJEN ou tribunal competente.

Antes de cadastrar dados reais, o responsável deve confirmar o número CNJ, o ramo processual e o indicador de sigilo. A chave da API Datajud permanece exclusivamente na configuração segura do servidor e não é enviada ao navegador.

## Anexos contextuais em processos — agosto de 2026

O fluxo de documentos foi aprimorado para que a pessoa não precise abrir o Acervo genérico e tentar inferir manualmente a qual processo o arquivo pertence. Na ficha de cada processo, o botão **Documentos do processo** exibe apenas os anexos daquele processo e o botão **Anexar documento** abre um formulário contextual. O arquivo enviado passa a ter um vínculo persistente e auditável com o processo, preservando também seu registro no Acervo.

| Aspecto | Regra implantada |
|---|---|
| Arquivos aceitos | PDF, imagens, Word, Excel, PowerPoint e ZIP, com limite de 25 MB por anexo. |
| Classificação | Petição, citação, intimação, ata de audiência, decisão, sentença, acordo, procuração, comprovante ou outro. |
| Persistência | O arquivo é armazenado no repositório de documentos e recebe vínculo único com o processo na tabela `crm_processos_juridicos_documentos`. |
| Segurança | As rotas exigem sessão e permissão jurídica. Em processo sigiloso, os documentos somente são exibidos e alterados por perfis autorizados. |
| Auditoria | Anexar e desvincular geram registros de auditoria associados ao processo. |
| Desvinculação | Remover o vínculo da ficha não apaga o documento original do Acervo, evitando perda acidental de evidência. |

> **Procedimento operacional:** abra o processo, escolha **Documentos do processo** e depois **Anexar documento**. Se o arquivo já estiver no Acervo, ele permanece preservado; o novo fluxo evita duplicação ao anexar arquivos diretamente a partir do processo.

### Experiência de consulta e envio

A lista de documentos vinculados agora conta com **pré-visualização de PDFs e imagens** dentro do próprio processo. A visualização abre em uma camada protegida da interface e mantém a ação “Abrir” para casos em que a pessoa precise acessar o arquivo em outra aba. Documentos de Word, Excel, PowerPoint e ZIP continuam disponíveis para abertura ou download, sem tentativa de renderização inadequada no navegador.

| Recurso | Comportamento |
|---|---|
| Busca | Pesquisa por nome do documento, nome do arquivo, classificação, observação e tags. |
| Filtro por tipo | Restringe a lista às classificações disponíveis no próprio processo. |
| Período | Permite filtrar pela data de anexo inicial e final. |
| Pré-visualização | Exibida somente para PDF e imagem anexados ao processo, respeitando a permissão já validada pela API. |
| Progresso de upload | Barra de progresso acessível mostra o percentual durante o envio e informa o processamento do vínculo. |
| Confirmação | Ao concluir, uma confirmação animada identifica o arquivo vinculado antes de atualizar a lista. |

> **Compatibilidade:** os filtros funcionam localmente sobre os documentos já autorizados e carregados para o processo. Assim, não ampliam o acesso a processos sigilosos nem adicionam novas consultas ao banco enquanto a pessoa pesquisa.

## Peticionamento Assistido, dossiê e IA supervisionada — agosto de 2026

O detalhe do processo passou a disponibilizar a área **Peticionamento Assistido**. Ela funciona como ambiente interno de preparação e rastreabilidade: cria rascunhos versionados, organiza o dossiê, registra o checklist, documenta a aprovação e permite registrar posteriormente o recibo do protocolo. Ela não assina, não acessa certificados, não guarda credenciais e não transmite petições ao tribunal.

| Etapa | Funcionamento implantado | Controle aplicado |
|---|---|---|
| Rascunho | Criação de peça por tipo, conteúdo, versão inicial e histórico de revisões. | Uma edição cria nova versão; peça marcada como protocolada não pode ser modificada. |
| Checklist | Conferência de competência, prazo, partes, anexos e revisão profissional. | A aprovação é bloqueada enquanto houver item pendente. |
| Aprovação | Ação explícita “Aprovar para protocolo”, com data, usuário e confirmação de revisão. | A aprovação exige perfil jurídico/administrativo autorizado e confirmação humana. |
| Protocolo | Registro declaratório do número ou identificador do recibo após o ato externo. | O status somente muda após aprovação; o CRM informa que o protocolo ocorreu fora do sistema. |
| Dossiê | Categoria e tags por documento, tanto no novo upload quanto em documentos já vinculados. | A organização é auditada e não altera o arquivo original do Acervo. |

### Assistência por IA

A IA só é liberada quando a pessoa registra expressamente a autorização no processo. As funções disponíveis são **resumo assistido de PDF/imagem** e **cronologia assistida** a partir dos documentos, prazos, consultas e resumos internos já autorizados. Cada resultado fica salvo com usuário, momento, modelo e fontes internas para revisão. Há limites de uso por usuário e por intervalo para reduzir risco operacional.

> **Regra obrigatória:** resumos e cronologias são rascunhos informativos. Eles não constituem orientação jurídica, não validam prazo, não substituem leitura do documento ou consulta ao tribunal e não podem ser utilizados sem revisão profissional. A Recomendação OAB n. 001/2024 orienta que o julgamento profissional não seja realizado exclusivamente por IA e que saídas usadas em litígio sejam revisadas integralmente.[8]

| Salvaguarda | Aplicação no módulo |
|---|---|
| Autorização por processo | Sem o marcador de autorização, as rotas de IA recusam a análise. |
| Sigilo | A mesma regra de perfis autorizados aplicada a documentos também protege peças e IA. |
| Minimização | O resumo recebe apenas o documento selecionado e os metadados necessários; a cronologia usa fontes internas estruturadas. |
| Fontes e auditoria | A análise registra documentos, prazos ou dados internos de origem, usuário, modelo e ação de auditoria. |
| Sem automação externa | Não há scraping, assinatura, armazenamento de certificado ou protocolo automatizado. |

**Procedimento operacional:** abra um processo, acesse **Peticionamento Assistido**, crie o rascunho e mantenha o checklist atualizado. Depois de revisão profissional, aprove a peça, realize assinatura e protocolo no portal oficial e registre o identificador do recibo no CRM. Para a IA, autorize previamente o processo, selecione o documento PDF/imagem ou gere a cronologia e revise o resultado junto às fontes originais.

## Referências

[1]: https://www.cnj.jus.br/sistemas/datajud/api-publica/ "CNJ — API Pública do Datajud"
[2]: https://datajud-wiki.cnj.jus.br/api-publica/ "Datajud Wiki — API Pública"
[3]: https://www.trf4.jus.br/trf4/controlador.php?acao=pagina_visualizar&id_pagina=3929 "TRF4 — Consulta Processual"
[4]: https://www.tjrs.jus.br/novo/processos-e-servicos/processo-eletronico/sistema-eproc/ "TJRS — Sistema eproc"
[5]: https://www.cnj.jus.br/tecnologia-da-informacao-e-comunicacao/justica-4-0/domicilio-judicial-eletronico/ "CNJ — Domicílio Judicial Eletrônico"
[6]: https://www.cnj.jus.br/programas-e-acoes/processo-judicial-eletronico-pje/comunicacoes-processuais/ "CNJ — Comunicações Processuais"
[7]: https://comunica.pje.jus.br/ "CNJ — Comunica PJe"
[8]: https://diario.oab.org.br/pages/materia/842347 "Conselho Federal da OAB — Recomendação n. 001/2024"
