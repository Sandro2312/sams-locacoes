# Proposta de Evolução — Apoio ao Advogado no CRM Jurídico

> **Aviso profissional:** este documento é uma análise técnica e operacional, não uma orientação jurídica formal. Qualquer peça, fundamento, prazo ou protocolo deve ser revisado e aprovado por advogado habilitado antes do uso ou apresentação.

## Recomendação executiva

O CRM Jurídico pode evoluir de um cadastro de processos para uma **estação de trabalho do advogado**, com preparação de peças, organização de evidências, revisão de prazos e assistência por IA. A recomendação é implementar uma área de **Peticionamento Assistido**, e não um robô que protocole automaticamente. O protocolo final, a assinatura digital e o acesso ao processo devem permanecer no sistema oficial de cada tribunal, sob controle do advogado e com o certificado ICP-Brasil dele.

Essa separação protege o sigilo profissional e evita que o CRM armazene credenciais, tokens ou certificados de assinatura. A documentação do PJe informa que usuários sem certificado não assinam nem protocolam, e a Resolução CNJ n. 185/2013 atribui ao usuário a guarda e o sigilo de credenciais e dispositivos. [1] [2] O modelo também acompanha a recomendação da OAB de que a IA não substitua o julgamento profissional, que toda saída seja revisada e que o uso seja transparente para o cliente. [3]

## Área proposta: Peticionamento Assistido

A nova área deve ficar dentro de cada processo jurídico, ao lado de **Documentos**, **Prazos** e **Andamentos**. Ela organiza a preparação da peça e registra a responsabilidade profissional, sem acessar o portal judicial em nome do usuário.

| Elemento | Comportamento proposto | Controle indispensável |
|---|---|---|
| Tipo de peça | Petição inicial, contestação, manifestação, réplica, recurso, substabelecimento, pedido de prazo ou modelo livre. | O tipo é apenas organizacional; não presume cabimento jurídico. |
| Editor versionado | Rascunho com versões, autor, data, comentários internos e comparação entre revisões. | Nunca substituir uma versão aprovada; criar nova revisão. |
| Dossiê da peça | Fatos relevantes, pedidos, documentos do Acervo, prazos, partes, tribunal e dados do processo. | Exibir a origem de cada item e não preencher lacunas como se fossem fatos. |
| Checklist de protocolo | Tribunal, sistema oficial, classe, PDF/A ou formato exigido, tamanho, assinaturas, anexos, custas e prazo. | Checklist configurável por tribunal e sempre confirmável pelo advogado. |
| Aprovação | Estados: **Rascunho → Em revisão → Aprovada para protocolo → Protocolada**. | Somente advogado habilitado pode aprovar; a aplicação registra quem aprovou e quando. |
| Recibo | Após o protocolo manual, permitir anexar o comprovante e registrar número, data, hora e responsável. | O recibo é a evidência do protocolo; o CRM não declara que protocolou. |

### Fluxo recomendado

O advogado ou a equipe inicia a peça pelo processo, seleciona um tipo e monta o dossiê com documentos já vinculados. Depois da revisão, o advogado responsável marca a versão como **Aprovada para protocolo** e baixa o PDF. Em seguida, abre o portal oficial do tribunal por um link contextual, assina e protocola manualmente. Por fim, anexa o recibo ao processo e muda o status para **Protocolada**.

O PJe possui regras de acesso, certificado e formatos que podem variar por tribunal; a própria norma determina que o usuário acompanhe o recebimento de petições e documentos transmitidos. [1] [2] Por isso, a primeira etapa deve ser assistiva e orientada por checklist, e não automação de navegador, compartilhamento de senha ou execução autônoma do protocolo.

## IA jurídica: onde ela agrega valor com segurança

A IA deve operar como **assistente supervisionada**, sem emitir decisão, sem afirmar que pesquisou fonte inexistente e sem enviar material ao tribunal. A recomendação é uma aba “Assistência de Análise” no processo, com resultados sempre marcados como rascunho e acompanhados de fontes internas.

| Função de IA | Resultado útil | Salvaguarda obrigatória |
|---|---|---|
| Linha do tempo | Cronologia de fatos, documentos, movimentações e prazos com links para cada fonte. | Cada afirmação deve apontar para documento, campo ou evento de origem. |
| Resumo de documentos | Síntese de petição, decisão, intimação ou ata anexada. | Indicar que é resumo; não substituir leitura do original. |
| Preparação de peça | Estrutura de tópicos, questões a confirmar, lista de anexos e primeiro rascunho com base no dossiê selecionado. | Bloquear invenção de fatos, valores, jurisprudência ou citações; campos sem prova devem ficar como “a confirmar”. |
| Revisão de consistência | Checklist de nomes, datas, pedidos, anexos, prazos e contradições entre a minuta e o dossiê. | O resultado é alerta de revisão, nunca validação jurídica definitiva. |
| Triagem de andamento | Resumo de movimentação e sugestão de tarefa ou prazo para confirmação. | Nenhum prazo é criado ou alterado sem confirmação humana. |
| Comunicação ao cliente | Minuta de atualização em linguagem clara. | Advogado revisa antes de enviar; a IA não conversa com o cliente nem presta atividade privativa. |

> A Recomendação n. 001/2024 da OAB determina que o julgamento profissional não seja realizado por IA, que resultados usados em litígio sejam revisados integralmente e que o profissional não confie exclusivamente na ferramenta para argumentos ou documentos submetidos ao tribunal. [3]

## Controles de privacidade, sigilo e auditoria

O módulo já trata processos e documentos sigilosos. Antes de habilitar IA sobre conteúdos jurídicos, é necessário acrescentar um controle explícito de **uso de IA autorizado para este processo**, com registro do fundamento operacional e, quando aplicável, do documento de ciência/consentimento do cliente. A OAB recomenda comunicação escrita, clara e prévia ao cliente sobre propósito, benefícios, limitações, riscos e revisão humana no uso de IA generativa. [3]

| Controle | Recomendação para o CRM |
|---|---|
| Minimização | Enviar à IA apenas os trechos e documentos selecionados pelo usuário; evitar anexar dossiês completos por padrão. |
| Sigilo | Processos marcados como sigilosos devem exigir perfil autorizado e confirmação adicional antes de qualquer análise por IA. |
| Redação | Oferecer remoção ou mascaramento de CPF, endereço, telefone e outros identificadores antes do envio à ferramenta. |
| Fornecedor | Usar somente serviço com contrato e configuração que impeçam o uso dos dados para treinamento, ou confirmar expressamente essa política antes da implantação. |
| Auditoria | Registrar usuário, data, processo, finalidade, IDs/hashes dos documentos selecionados, versão do modelo, saída gerada e ação de revisão. Evitar gravar conteúdo sensível redundante em logs. |
| Versionamento | Manter a minuta humana e a saída de IA como versões distintas, com possibilidade de comparação e restauração. |
| Acesso | Separar permissões para criar rascunho, revisar, aprovar para protocolo e administrar configurações de IA. |
| Retenção | Definir prazo e regra de descarte para saídas de IA, especialmente quando forem rascunhos não aproveitados. |

A LGPD exige finalidade, necessidade, transparência, segurança, prevenção e responsabilização no tratamento de dados pessoais. [4] A Resolução CNJ n. 615/2025 reforça supervisão humana, auditabilidade, contestabilidade, privacidade desde a concepção e classificação de riscos como boas referências de governança, ainda que o CRM seja uma ferramenta privada de apoio à advocacia. [5]

## Andamento processual e prazos

Recomendo criar uma **Caixa de Andamentos** no processo. Ela deve receber registros manualmente, por consulta assistida ao Datajud já existente ou, futuramente, por integração oficial contratada. Para cada andamento, o advogado poderá registrar impacto, providência, responsável, prazo sugerido e evidência. O sistema pode destacar alterações novas e criar uma tarefa em modo “sugestão”, mas a data jurídica definitiva deve depender de validação humana e da conferência no canal oficial.

Essa área deve incluir um painel diário de risco: prazos vencendo, intimações aguardando ciência, peças em revisão, petições aprovadas sem recibo e processos sem atualização há período configurado. Não recomendo que o CRM declare ciência, pratique ato processual ou conte prazo de modo automático a partir de uma interpretação de IA. A conferência no PJe, DJe, DJEN, Domicílio Judicial Eletrônico ou tribunal competente continua indispensável.

## Ordem de implantação recomendada

| Fase | Entrega | Risco | Pré-requisito |
|---|---|---|---|
| 1 — Base segura | Peticionamento Assistido, versões, checklist, aprovação, upload de recibo e Caixa de Andamentos manual. | Baixo a moderado. | Matriz de permissões e fluxos de aprovação. |
| 2 — IA documental | Linha do tempo, resumo com fontes internas, checklist de consistência e minuta assistida. | Moderado. | Política de IA, escolha de fornecedor e termo de ciência/consentimento. |
| 3 — Pesquisa controlada | Pesquisa de jurisprudência e legislação a partir de fonte oficialmente licenciada, com citações verificáveis. | Moderado a alto. | Fontes contratadas ou APIs autorizadas; validação de citações. |
| 4 — Integrações oficiais | Consulta de andamentos e alertas por fonte oficialmente autorizada. | Alto. | Contrato, credenciais próprias, avaliação de privacidade e homologação. |
| Fora do escopo inicial | Assinatura, protocolo automático, armazenamento de certificado ou automação por senha. | Alto ou excessivo. | Somente reavaliar com integração oficial, responsabilidade definida e aprovação expressa. |

## Decisão proposta

O melhor próximo passo é implementar a **Fase 1**. Ela cria valor imediato para os advogados, melhora a organização e a rastreabilidade do processo, não exige expor conteúdo a um modelo de IA e não interfere em nenhum fluxo hoje funcional. Após o uso real da equipe e aprovação de uma política de IA, a Fase 2 pode ser liberada em modo piloto por processo e por advogado responsável.

## Referências

[1]: [CNJ — Manual do Advogado do PJe](https://docs.pje.jus.br/manuais-de-uso/Manual%20do%20advogado/)

[2]: [CNJ — Resolução n. 185/2013](https://atos.cnj.jus.br/atos/detalhar/1933)

[3]: [Conselho Federal da OAB — Recomendação n. 001/2024](https://diario.oab.org.br/pages/materia/842347)

[4]: [Planalto — Lei n. 13.709/2018 (LGPD)](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)

[5]: [CNJ — Resolução n. 615/2025](https://atos.cnj.jus.br/files/original1555302025031467d4517244566.pdf)
