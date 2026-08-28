# Reconexão de domínio — 28 de agosto de 2026

- `www.samslocacoes.com.br` entrega uma página genérica de manutenção, enquanto `https://samslocacoes.manus.space` entrega o site SAMS ativo.
- A conta do Registro.br mostra `samslocacoes.com.br` como publicado e usa os servidores DNS do próprio Registro.br.
- O contato autenticado possui as permissões administrativa e técnica necessárias para configurar a zona DNS.
- A reconexão requer revisar a zona DNS no Registro.br e restaurar o vínculo do domínio personalizado no painel do projeto.
- A administração de domínio confirma que a zona DNS é configurável pelo Registro.br para o domínio publicado.

## Reconexão concluída

- No painel do projeto restaurado, os dois domínios personalizados foram associados simultaneamente: `samslocacoes.com.br` e `www.samslocacoes.com.br`.
- A validação do provedor foi concluída com sucesso para o domínio principal, reconhecendo os registros públicos já existentes; não foi necessário alterar a zona DNS nem registros de e-mail.
- O painel passou a indicar os dois domínios com estado ativo.
- Validação externa em 28 de agosto de 2026: HTTP redireciona para HTTPS, `https://samslocacoes.com.br` responde `200` com o título do site SAMS e certificado válido emitido por Google Trust Services.
- `https://www.samslocacoes.com.br` possui certificado válido e redireciona com `301` para `https://samslocacoes.com.br/`, preservando o endereço sem `www` como canônico.
