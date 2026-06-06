# Arquitetura do Sistema — SAMS Locações

> Decisões técnicas, diagrama de arquitetura e estrutura de dados do projeto.

---

## Sumário

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Estrutura do Banco de Dados](#3-estrutura-do-banco-de-dados)
4. [Sistema de Autenticação](#4-sistema-de-autenticação)
5. [Sistema de Permissões (CRM)](#5-sistema-de-permissões-crm)
6. [Fluxo de Eventos (CRM)](#6-fluxo-de-eventos-crm)
7. [Armazenamento de Arquivos](#7-armazenamento-de-arquivos)
8. [Decisões Técnicas](#8-decisões-técnicas)

---

## 1. Visão Geral da Arquitetura

O projeto é uma aplicação monolítica Node.js que serve dois produtos distintos a partir do mesmo processo:

```
┌─────────────────────────────────────────────────────┐
│                    Node.js / Express                 │
│                                                      │
│  ┌──────────────────┐    ┌──────────────────────┐   │
│  │  Site Público    │    │    CRM Interno        │   │
│  │  React 19 + tRPC │    │  SPA Vanilla JS       │   │
│  │  /               │    │  /crm                 │   │
│  └──────────────────┘    └──────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │              API Layer                        │   │
│  │  /api/trpc  (tRPC 11 — site público)          │   │
│  │  /api/crm/* (REST Express — CRM interno)      │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │           Infraestrutura                      │   │
│  │  MySQL/TiDB  │  S3 Storage  │  SMTP           │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Dois Frontends, Um Backend

**Site Público** (`/`): Aplicação React 19 com TypeScript, compilada pelo Vite e servida como SPA. Comunica-se com o backend exclusivamente via tRPC. Usa Manus OAuth para autenticação.

**CRM Interno** (`/crm`): SPA construída com HTML/CSS/JavaScript vanilla, servida como arquivos estáticos em `client/public/crm/`. Comunica-se com o backend via API REST Express. Usa autenticação JWT própria.

A separação entre os dois frontends foi uma decisão deliberada: o CRM exige funcionalidades complexas de gestão de estado local (pipeline Kanban, filtros, paginação) que foram implementadas de forma incremental em JS vanilla, enquanto o site público beneficia-se do ecossistema React para animações e formulários multi-etapas.

---

## 2. Stack Tecnológica

### Frontend — Site Público

| Tecnologia | Versão | Uso |
|---|---|---|
| React | 19 | Framework UI |
| TypeScript | 5 | Tipagem estática |
| Tailwind CSS | 4 | Estilização |
| Framer Motion | 11 | Animações |
| tRPC Client | 11 | Comunicação com backend |
| Wouter | 3 | Roteamento client-side |
| Vite | 6 | Bundler e dev server |

### Frontend — CRM

| Tecnologia | Uso |
|---|---|
| HTML5 / CSS3 | Estrutura e estilos |
| JavaScript ES2022 | Lógica de negócio |
| Tailwind CSS (CDN) | Classes utilitárias |
| Font Awesome | Ícones |

### Backend

| Tecnologia | Versão | Uso |
|---|---|---|
| Node.js | 22 | Runtime |
| Express | 4 | Servidor HTTP |
| tRPC | 11 | API type-safe para site público |
| Drizzle ORM | 0.39 | ORM para MySQL |
| mysql2 | 3 | Driver MySQL |
| jsonwebtoken | 9 | Tokens JWT para CRM |
| bcrypt | 5 | Hash de senhas |
| multer | 1.4 | Upload de arquivos |
| nodemailer | 6 | Envio de e-mails |

### Infraestrutura

| Serviço | Uso |
|---|---|
| TiDB Cloud (MySQL) | Banco de dados principal |
| Manus S3 | Armazenamento de arquivos |
| Manus OAuth | Autenticação do site público |
| Manus Notifications | Alertas ao proprietário |
| Manus Cloud | Hospedagem e deploy |

---

## 3. Estrutura do Banco de Dados

O banco de dados é dividido em dois grupos de tabelas:

### Tabelas do Site Público (Drizzle ORM)

| Tabela | Descrição |
|---|---|
| `users` | Usuários autenticados via Manus OAuth |
| `contatos` | Formulários de contato do site |
| `orcamentos` | Solicitações de orçamento |

### Tabelas do CRM (SQL puro — 28 tabelas)

#### Usuários e Controle de Acesso

| Tabela | Descrição |
|---|---|
| `crm_users` | Usuários do CRM com roles e senhas |
| `crm_auditoria` | Log de todas as ações no sistema |
| `crm_settings` | Configurações globais do CRM |

#### Funil Comercial

| Tabela | Descrição |
|---|---|
| `crm_leads` | Leads com score, temperatura e UTM tracking |
| `crm_lead_interactions` | Histórico de interações com leads |
| `crm_oportunidades` | Oportunidades de negócio |
| `crm_clientes` | Clientes ativos |
| `crm_cliente_arquivos` | Arquivos vinculados a clientes |
| `crm_contatos` | Contatos independentes |

#### Eventos e Projetos

| Tabela | Descrição |
|---|---|
| `crm_eventos` | Feiras e eventos |
| `crm_briefings` | Briefings por evento/cliente |
| `crm_briefing_checklist` | Itens do checklist de briefing |
| `crm_projetos` | Projetos de design de stands |
| `crm_projeto_arquivos` | Arquivos de projeto (DWG, renders) |
| `crm_projeto_historico` | Histórico de versões do projeto |
| `crm_memoriais` | Memoriais descritivos |

#### Comercial e Financeiro

| Tabela | Descrição |
|---|---|
| `crm_orcamentos` | Orçamentos formais |
| `crm_orcamento_itens` | Itens de orçamento |
| `crm_contratos` | Contratos assinados |
| `crm_contrato_parcelas` | Parcelas de contratos |
| `crm_vendas` | Vendas fechadas |
| `crm_contas_receber` | Contas a receber (receitas) |
| `crm_metas` | Metas de vendas |
| `crm_comissao_regras` | Regras de comissionamento |

#### Operações

| Tabela | Descrição |
|---|---|
| `crm_ordens_servico` | Ordens de serviço de montagem |
| `crm_os_equipe` | Equipe designada para cada OS |
| `crm_os_materiais` | Materiais da OS |
| `crm_os_fotos` | Registro fotográfico da montagem |
| `crm_tarefas` | Tarefas internas |

---

## 4. Sistema de Autenticação

### Site Público — Manus OAuth 2.0

O fluxo OAuth é gerenciado pelo template Manus:

1. Frontend gera URL de login via `getLoginUrl(returnPath)` com `origin` e `returnPath` codificados no state
2. Usuário autentica no portal Manus
3. Callback em `/api/oauth/callback` troca o código por token e cria sessão via cookie HTTP-only
4. Frontend lê estado de autenticação via `trpc.auth.me.useQuery()`

### CRM — JWT Próprio

O CRM usa autenticação independente:

1. `POST /api/crm/auth/login` valida e-mail/senha contra `crm_users`
2. Servidor gera JWT assinado com `JWT_SECRET` (expiração: 8h)
3. Token enviado como cookie `crm_session` (HTTP-only, SameSite=Lax)
4. **Fallback para browsers restritivos:** Token também retornado no body como `_sessionToken` e armazenado no `sessionStorage` como `crm_fallback_token`
5. Cada requisição subsequente verifica o cookie ou o header `Authorization: Bearer <token>`
6. Em caso de `401`/`403`, `_clearAllSessionData()` limpa todos os tokens e redireciona para login

---

## 5. Sistema de Permissões (CRM)

O sistema de permissões é composto por três camadas:

### Camada 1 — Role-based (AuthSystem)

`AuthSystem.hasPermission(permission)` verifica primeiro se o role do usuário é `administrador` ou `admin`, concedendo acesso total imediatamente.

### Camada 2 — Permission-based (PermissionSystem)

Para outros roles, `PermissionSystem.hasPermission(permission)` delega para `AuthSystem.hasSpecificPermission()`, que verifica o array `permissions` do usuário.

### Camada 3 — Module Access

`PermissionSystem.hasModuleAccess(module)` verifica se o usuário tem acesso ao módulo via role, array `modules` ou permissões com prefixo do módulo.

### Renderização Condicional

Os botões de ação (Novo, Editar, Excluir) são renderizados condicionalmente:

```javascript
const canCreate = can('financeiro.custos.create');
// Botão só aparece no DOM se canCreate === true
${canCreate ? `<button data-action="create">Nova Despesa</button>` : ''}
```

---

## 6. Fluxo de Eventos (CRM)

O CRM usa delegação de eventos com um único listener global (`globalClickHandler`) no `document`. Este padrão evita memory leaks ao navegar entre módulos.

### Ordem de Delegação

```
Clique no documento
    │
    ▼
DELEGAÇÃO 1: É um .module-card E o dashboard está visível?
    → Sim: showModule(moduleName)
    │
    ▼
DELEGAÇÃO 2: É um [data-submodule="leads"]?
    → Sim: showLeads()
    │
    ▼
DELEGAÇÃO 2.5: Tem [data-nav-page]?
    → Sim: NavigationSystem.navigateToPage()
    │
    ▼
DELEGAÇÃO 2.6: Tem [data-nav-module]?
    → Sim: NavigationSystem.navigateToModule()
    │
    ▼
DELEGAÇÃO 3: Tem [data-action]?
    → Sim: handleCRUDAction(action, module, id)
    → Não: ignorar
```

> **Correção crítica (v5.17):** A DELEGAÇÃO 1 foi corrigida para usar `closest('.module-card[data-module]')` em vez de `closest('[data-module]')`, e verifica se `dashboardContent` está visível. Sem essa correção, cliques em botões internos eram interceptados pelos cards do dashboard (ocultos no DOM mas ainda presentes na árvore).

---

## 7. Armazenamento de Arquivos

Todos os arquivos são armazenados no S3 (Manus Storage). O banco de dados armazena apenas a URL e metadados.

### Fluxo de Upload

```
Frontend → POST /api/crm/acervo (multipart/form-data)
    → multer processa o arquivo em memória
    → storagePut(key, buffer, contentType)
    → S3 retorna URL pública
    → URL salva no banco de dados
    → Resposta com URL para o frontend
```

### Convenção de Nomes de Arquivo

```
crm-acervo/{ano}/{evento}/{cliente}/{timestamp}-{filename}
crm-clientes/{clienteId}/{timestamp}-{filename}
crm-projetos/{projetoId}/{timestamp}-{filename}
crm-os/{osId}/fotos/{timestamp}-{filename}
crm-contas-receber/{timestamp}-{filename}
```

---

## 8. Decisões Técnicas

### Por que CRM em JS vanilla?

O CRM foi desenvolvido de forma incremental ao longo de várias sessões. A escolha de JS vanilla permitiu adicionar funcionalidades rapidamente sem recompilar o bundle React, e os arquivos são servidos como estáticos pelo Express sem passar pelo pipeline Vite.

### Por que tRPC para o site e REST para o CRM?

O site público beneficia-se da tipagem end-to-end do tRPC (tipos compartilhados entre frontend e backend). O CRM, por ser vanilla JS, não pode consumir tRPC diretamente e usa REST convencional.

### Por que dois sistemas de autenticação?

O site público usa Manus OAuth para que visitantes possam fazer login com suas contas Manus. O CRM usa autenticação própria porque os operadores (equipe SAMS) têm contas separadas com roles específicos que não existem no sistema OAuth.

### Compatibilidade com Safari/Brave

Browsers com ITP (Intelligent Tracking Prevention) bloqueiam cookies de terceiros e, em alguns casos, cookies first-party em iframes. O sistema usa um token de fallback no `sessionStorage` para garantir que a sessão funcione mesmo nesses browsers.

### Cache-busting de Arquivos Estáticos

Os arquivos JS do CRM usam query strings de versão (`?v=timestamp`) para forçar o browser a baixar a versão mais recente após cada deploy. O timestamp é atualizado manualmente no `index.html` sempre que um arquivo é modificado.
