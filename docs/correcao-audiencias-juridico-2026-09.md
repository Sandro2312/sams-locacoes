# Correção de Registro de Audiências Jurídicas

## Situação identificada

Em 19 de agosto de 2026, a ficha do processo **Reclamatória Trabalhista — Ivan Cleber Araujo** apresentava o formulário de prazo preenchido com a audiência de 24/09/2026, mas nenhum prazo havia sido persistido. A consulta ao banco confirmou que o processo não possuía registros na tabela de prazos.

## Correção aplicada

O formulário passou a tratar **Audiência** como uma opção explícita, com seleção clara entre Audiência, Prazo processual, Intimação, Reunião e Outro. Também foi incluído campo de observação para horário, sala, link ou providências e uma ação de registro visível tanto dentro do formulário quanto na barra de ações do processo.

| Controle | Regra aplicada |
|---|---|
| Registro | Audiência exige título e data; responsável é recomendado para acompanhamento. |
| Confirmação | A interface informa que o item foi registrado no processo e na Agenda Jurídica. |
| Duplicidade | O sistema bloqueia audiência pendente com mesmo processo, título, tipo e data. |
| Auditoria | Audiências são registradas com `CREATE_HEARING`, distinta de prazo genérico. |
| Exibição | A lista mostra o rótulo “Audiência”, a data e o responsável quando definido. |

## Registro corrigido

A audiência de **24/09/2026** foi registrada no processo de Ivan Cleber Araujo como pendente, do tipo `audiencia`, e atribuída a **Sandro Alex**. O próximo prazo do processo foi atualizado para a mesma data. Não foram alterados documentos, peças, consultas, processo ou prazos anteriores.

> A audiência registrada no CRM é um controle interno. A data, o local, o horário e qualquer alteração devem continuar sendo confirmados pelo responsável jurídico no tribunal ou canal oficial aplicável.

## Validação

O registro persistido foi conferido diretamente no banco, com tipo `audiencia`, status pendente, data 24/09/2026, responsável definido e atualização do próximo prazo do processo. O teste específico do módulo Jurídico passou em **6 de 6 casos**, incluindo a cobertura de ação visível, classificação e bloqueio de duplicidade. A suíte geral ficou em **115 de 117 testes aprovados**; as duas falhas remanescentes são preexistentes nos testes administrativos de Contato e Orçamento e não se relacionam à correção jurídica.

## Evolução complementar — gestão de audiências

Em 19 de agosto de 2026, o controle de audiências foi ampliado sem alterar registros já existentes. O formulário passou a aceitar **local/endereço** e **link de audiência virtual**. O servidor aceita somente links `http` ou `https`, rejeitando protocolos inválidos antes da persistência.

| Recurso | Comportamento |
|---|---|
| Alerta de proximidade | A Agenda Jurídica marca em vermelho audiências pendentes cuja data esteja entre hoje e os próximos sete dias. |
| Local e link | Os detalhes são persistidos no prazo da audiência e reaparecem na ficha do processo, com abertura segura do link em nova aba. |
| PDF contextual | O upload aceita exclusivamente PDF de até 25 MB. O arquivo é preservado no Acervo e recebe vínculo adicional, não destrutivo, com a audiência específica. |
| Privacidade e auditoria | O fluxo mantém as mesmas permissões de documentos do processo e registra a ação `ATTACH_HEARING_DOCUMENT` na auditoria. |

> O CRM organiza a informação operacional. A confirmação de local, link, data, horário e eventual alteração continua sob responsabilidade do profissional jurídico no canal oficial competente.
