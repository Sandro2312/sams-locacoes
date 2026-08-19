# Validação Técnica — IA, Calendário e Leitura Rápida de Audiências

## Carregamento do CRM

Em 19 de agosto de 2026, a tela de autenticação do CRM foi recarregada no ambiente de desenvolvimento após o registro das extensões jurídicas atualizadas. O navegador não apresentou erro JavaScript no console durante o carregamento.

> A validação de fluxos protegidos por perfil será complementada pelos testes de regressão e por uma sessão autenticada autorizada, sem expor credenciais ou documentos jurídicos em logs técnicos.

## Correção de senha em minúsculas

O login foi recarregado após desativar autocapitalização, autocorreção e transformação visual no campo de senha. A tela foi entregue normalmente e o console do navegador permaneceu sem erros. A senha continua a ser enviada literalmente ao servidor, onde a comparação bcrypt preserva a distinção entre maiúsculas e minúsculas; nenhuma credencial, hash ou política de bloqueio foi alterada.
