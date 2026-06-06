# Referência de API — SAMS Locações

> Documentação de todos os endpoints REST (CRM) e procedures tRPC (site público).

---

## Sumário

1. [Autenticação](#1-autenticação)
2. [API REST — CRM](#2-api-rest--crm)
3. [Procedures tRPC — Site Público](#3-procedures-trpc--site-público)
4. [Códigos de Erro](#4-códigos-de-erro)

---

## 1. Autenticação

### CRM (JWT)

Todos os endpoints REST do CRM exigem autenticação via cookie de sessão JWT ou header `Authorization: Bearer <token>`.

**Login:**
```
POST /api/crm/auth/login
Content-Type: application/json

{ "email": "usuario@samslocacoes.com.br", "password": "senha" }
```

**Resposta de sucesso:**
```json
{ "success": true, "user": { "id": 1, "name": "...", "role": "admin" }, "_sessionToken": "..." }
```

O token retornado em `_sessionToken` deve ser armazenado no `sessionStorage` como `crm_fallback_token` em browsers que bloqueiam cookies.

### Site Público (Manus OAuth)

O site público utiliza Manus OAuth 2.0. O fluxo é gerenciado automaticamente pelo template. Consulte `server/_core/oauth.ts` para detalhes.

---

## 2. API REST — CRM

Base URL: `/api/crm`

### 2.1 Autenticação

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/auth/login` | Login com e-mail e senha |
| `POST` | `/auth/logout` | Encerrar sessão |
| `GET` | `/auth/me` | Retorna dados do usuário logado |
| `POST` | `/auth/forgot-password` | Solicitar redefinição de senha |
| `POST` | `/auth/reset-password` | Redefinir senha com token |

### 2.2 Usuários (admin)

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/users` | Listar todos os usuários |
| `POST` | `/users` | Criar novo usuário |
| `PUT` | `/users/:id` | Atualizar usuário |
| `DELETE` | `/users/:id` | Desativar usuário |

### 2.3 Leads

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/leads` | Listar leads (com filtros: status, temperatura, responsavel_id) |
| `POST` | `/leads` | Criar novo lead |
| `GET` | `/leads/:id` | Buscar lead por ID |
| `PUT` | `/leads/:id` | Atualizar lead |
| `DELETE` | `/leads/:id` | Excluir lead |
| `POST` | `/leads/:id/interactions` | Registrar interação com lead |

**Parâmetros de filtro (GET /leads):**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `status` | string | Filtrar por status |
| `temperatura` | string | `frio`, `morno`, `quente` |
| `responsavel_id` | number | ID do usuário responsável |
| `search` | string | Busca por nome, e-mail ou empresa |

### 2.4 Clientes

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/clientes` | Listar clientes |
| `POST` | `/clientes` | Criar cliente |
| `GET` | `/clientes/:id` | Buscar cliente por ID |
| `PUT` | `/clientes/:id` | Atualizar cliente |
| `DELETE` | `/clientes/:id` | Excluir cliente |
| `POST` | `/clientes/:id/arquivos` | Upload de arquivo para cliente |

### 2.5 Eventos

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/eventos` | Listar eventos |
| `POST` | `/eventos` | Criar evento |
| `PUT` | `/eventos/:id` | Atualizar evento |
| `DELETE` | `/eventos/:id` | Excluir evento |

### 2.6 Briefings

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/briefings` | Listar briefings |
| `POST` | `/briefings` | Criar briefing |
| `PUT` | `/briefings/:id` | Atualizar briefing |
| `DELETE` | `/briefings/:id` | Excluir briefing |

### 2.7 Projetos

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/projetos` | Listar projetos |
| `POST` | `/projetos` | Criar projeto |
| `PUT` | `/projetos/:id` | Atualizar projeto |
| `DELETE` | `/projetos/:id` | Excluir projeto |
| `POST` | `/projetos/:id/arquivos` | Upload de arquivo para projeto |

### 2.8 Ordens de Serviço

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/ordens-servico` | Listar OS |
| `POST` | `/ordens-servico` | Criar OS |
| `PUT` | `/ordens-servico/:id` | Atualizar OS |
| `DELETE` | `/ordens-servico/:id` | Excluir OS |
| `POST` | `/ordens-servico/:id/fotos` | Upload de foto da OS |

### 2.9 Financeiro — Despesas (Transações)

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/transacoes` | Listar despesas/transações |
| `POST` | `/transacoes` | Criar nova despesa |
| `PUT` | `/transacoes/:id` | Atualizar despesa |
| `DELETE` | `/transacoes/:id` | Excluir despesa |

**Corpo da requisição (POST/PUT):**
```json
{
  "descricao": "Aluguel de equipamentos",
  "valor": 1500.00,
  "vencimento": "2026-06-15",
  "status": "Pendente",
  "centroCusto": "Montagem",
  "comprovante_url": null
}
```

> O campo `comprovante_url` é **opcional**. Pode ser `null` mesmo quando `status = "Pago"`.

### 2.10 Financeiro — Contas a Receber

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/contas-receber` | Listar contas a receber |
| `POST` | `/contas-receber` | Criar nova conta a receber |
| `PUT` | `/contas-receber/:id` | Atualizar conta a receber |
| `DELETE` | `/contas-receber/:id` | Excluir conta a receber |

**Corpo da requisição (POST):**
```json
{
  "descricao": "Montagem Stand FIMEC 2026",
  "valor": 12000.00,
  "vencimento": "2026-07-01",
  "status": "Pendente",
  "clienteId": 42,
  "comprovante_url": null
}
```

### 2.11 Acervo Documental

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/acervo` | Listar documentos (filtros: evento, cliente, tipo, ano) |
| `POST` | `/acervo` | Cadastrar documento (upload S3 ou link Drive) |
| `PUT` | `/acervo/:id` | Atualizar metadados do documento |
| `DELETE` | `/acervo/:id` | Excluir documento |

**Upload de arquivo:**
```
POST /api/crm/acervo
Content-Type: multipart/form-data

Fields: nome, tipo_doc, ano, evento_nome, cliente_nome, observacoes
File: arquivo (máx. 50 MB)
```

**Link Google Drive:**
```json
{
  "nome": "Pasta FIMEC 2026 - COIM Brasil",
  "tipo_doc": "projeto",
  "ano": 2026,
  "evento_nome": "FIMEC 2026",
  "cliente_nome": "COIM Brasil",
  "url_drive": "https://drive.google.com/drive/folders/..."
}
```

### 2.12 Administração

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/admin/settings` | Ler configurações do sistema |
| `PUT` | `/admin/settings` | Atualizar configurações |
| `GET` | `/admin/audit` | Log de auditoria |

---

## 3. Procedures tRPC — Site Público

Base URL: `/api/trpc`

As procedures são consumidas pelo frontend React via `trpc.*.useQuery()` e `trpc.*.useMutation()`.

### 3.1 Autenticação

| Procedure | Tipo | Descrição |
|---|---|---|
| `auth.me` | Query | Retorna usuário logado (ou null) |
| `auth.logout` | Mutation | Encerra sessão OAuth |

### 3.2 Contatos (Formulário do Site)

| Procedure | Tipo | Descrição |
|---|---|---|
| `contato.enviar` | Mutation | Salva contato no banco e notifica proprietário |

**Input:**
```typescript
{
  nome: string,
  empresa?: string,
  whatsapp: string,
  email: string,
  tipoEvento?: string,
  metragem?: string,
  mensagem?: string
}
```

### 3.3 Orçamentos

| Procedure | Tipo | Descrição |
|---|---|---|
| `orcamento.solicitar` | Mutation | Salva orçamento completo e notifica proprietário |

**Input:**
```typescript
{
  // Dados pessoais
  nome: string,
  empresa: string,
  cargo?: string,
  whatsapp: string,
  email: string,
  // Evento
  tipoEvento: string,
  nomeEvento?: string,
  dataEvento?: string,
  localEvento?: string,
  cidadeEvento: string,
  estadoEvento: string,
  // Stand
  tipoStand: string,
  metragem: string,
  altura?: string,
  formato?: string,
  // Detalhes
  servicosAdicionais?: string,
  descricaoMarca?: string,
  referenciasVisuais?: string,
  orcamentoPrevisto?: string,
  observacoes?: string
}
```

### 3.4 Sistema

| Procedure | Tipo | Descrição |
|---|---|---|
| `system.notifyOwner` | Mutation (protegida) | Envia notificação ao proprietário |

---

## 4. Códigos de Erro

### REST (CRM)

| Código HTTP | Significado |
|---|---|
| `200` | Sucesso |
| `201` | Recurso criado com sucesso |
| `400` | Dados inválidos ou ausentes |
| `401` | Não autenticado (sessão expirada) |
| `403` | Sem permissão para esta operação |
| `404` | Recurso não encontrado |
| `409` | Conflito (ex: e-mail já cadastrado) |
| `500` | Erro interno do servidor |

### tRPC

| Código tRPC | Equivalente HTTP | Descrição |
|---|---|---|
| `BAD_REQUEST` | 400 | Input inválido |
| `UNAUTHORIZED` | 401 | Não autenticado |
| `FORBIDDEN` | 403 | Sem permissão |
| `NOT_FOUND` | 404 | Recurso não encontrado |
| `INTERNAL_SERVER_ERROR` | 500 | Erro interno |

### Tratamento de Erros no Frontend (CRM)

Quando o servidor retorna `401` ou `403`, o sistema CRM executa automaticamente `_clearAllSessionData()`, que limpa todos os tokens e cookies e redireciona para a tela de login.
