# Correção de Agenda e busca de cliente no lote — 31 de agosto de 2026

## Evidências de produção

- O Dashboard publicado foi aberto com sessão autenticada de Desenvolvedor.
- Após a limpeza precisa dos quatro registros de teste, a Agenda exibiu zero itens em todos os grupos: atrasadas, hoje, próximos 7 dias, futuro e sem prazo.
- O CRM publicado referencia o script do Guia de Lançamentos com a versão `1788269400`, que contém a atualização da busca de clientes.

## Registros regularizados

- Foram removidas exclusivamente quatro tarefas de captação fictícias, identificadas pelos títulos de contato/orçamento de João Silva e Maria Santos, com origem `captacao_site`.
- Os leads, interações e auditorias técnicas vinculados a esses testes também foram removidos somente quando correspondiam aos quatro registros identificados.
- Os testes de contato e orçamento passaram a simular a captação, evitando escrita no banco operacional durante regressões futuras.

## Cliente do lote

- O cliente `MM Hortifrutigranjeiros`, pesquisado como `MM H` na tela relatada, não existia na tabela de clientes no momento da investigação.
- O cadastro foi restaurado sem dados inventados de contato ou documento e a consulta usada pela busca em lote passou a encontrá-lo pelo termo `MM H`.
