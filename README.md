# SAMS Locações — Site Institucional + CRM/ERP

> **Montadora de Stands Especialista em Feiras e Eventos Corporativos**
> Há mais de 15 anos realizando montagem de stands para feiras e eventos em todo o Brasil.

---

## Visão Geral

Este repositório contém o código-fonte completo do site institucional e do sistema CRM/ERP interno da **SAMS Locações**. O projeto é uma aplicação web full-stack construída com React 19, TypeScript, tRPC e MySQL, hospedada na plataforma Manus.

| Camada | Tecnologia |
|---|---|
| Frontend (site público) | React 19 + TypeScript + Tailwind CSS 4 + Framer Motion |
| Frontend (CRM interno) | HTML/CSS/JS vanilla (SPA sem framework) |
| Backend | Node.js + Express 4 + tRPC 11 |
| Banco de dados | MySQL (TiDB Cloud) via Drizzle ORM |
| Armazenamento de arquivos | S3 (Manus Storage) |
| Autenticação | Manus OAuth 2.0 (site) + JWT próprio (CRM) |
| Hospedagem | Manus Cloud (samslocacoes.com.br) |

---

## Estrutura do Projeto

```
sams-locacoes/
├── client/
│   ├── public/
│   │   └── crm/                  ← CRM interno (SPA vanilla JS)
│   │       ├── index.html        ← Entrada do CRM
│   │       └── js/               ← Módulos JavaScript do CRM
│   └── src/
│       ├── components/           ← Componentes React do site público
│       ├── pages/                ← Páginas React (Home, Orcamento, Blog, etc.)
│       ├── App.tsx               ← Roteamento principal
│       └── index.css             ← Estilos globais e tokens de design
├── server/
│   ├── _core/                    ← Infraestrutura (OAuth, tRPC, LLM, Storage)
│   ├── crm.ts                    ← API REST do CRM (Express)
│   ├── crm-acervo.ts             ← API do módulo Acervo Documental
│   ├── crm-admin.ts              ← API de administração do CRM
│   ├── crm-email.ts              ← Serviço de envio de e-mails
│   ├── db.ts                     ← Helpers de banco de dados
│   ├── routers.ts                ← Procedures tRPC (site público)
│   └── storage.ts                ← Helpers S3
├── drizzle/
│   ├── schema.ts                 ← Schema Drizzle (tabelas do site)
│   ├── crm-schema.sql            ← Schema SQL do CRM (28 tabelas)
│   └── *.sql                     ← Migrações
├── docs/                         ← Documentação completa
│   ├── crm-guide.md              ← Guia de uso do CRM
│   ├── api-reference.md          ← Referência da API REST
│   ├── architecture.md           ← Arquitetura do sistema
│   └── contributing.md           ← Guia de contribuição
└── todo.md                       ← Backlog e histórico de tarefas
```

---

## Início Rápido

### Pré-requisitos

- Node.js 22+
- pnpm 9+
- Acesso ao banco de dados MySQL (variável `DATABASE_URL`)

### Instalação

```bash
# Clonar o repositório
git clone <repo-url>
cd sams-locacoes

# Instalar dependências
pnpm install

# Iniciar servidor de desenvolvimento
pnpm dev
```

O servidor estará disponível em `http://localhost:3000`.

### Variáveis de Ambiente

As variáveis de ambiente são gerenciadas pela plataforma Manus. Consulte `server/_core/env.ts` para a lista completa. As principais são:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | String de conexão MySQL/TiDB |
| `JWT_SECRET` | Chave para assinatura de cookies de sessão |
| `VITE_APP_ID` | ID do aplicativo Manus OAuth |
| `BUILT_IN_FORGE_API_KEY` | Token para APIs internas Manus (servidor) |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Configurações SMTP para envio de e-mail |

---

## Site Público

O site institucional está disponível em [samslocacoes.com.br](https://samslocacoes.com.br) e contém as seguintes seções:

| Seção | Rota | Descrição |
|---|---|---|
| Home | `/` | Hero, Sobre, Serviços, Portfólio, Depoimentos, Contato |
| Orçamento | `/orcamento` | Formulário multi-etapas detalhado |
| Blog | `/blog` | Artigos de marketing e SEO |
| Artigo | `/blog/:slug` | Página individual de artigo |

### Formulário de Orçamento

O formulário de orçamento em `/orcamento` coleta dados em 4 etapas:

1. **Dados de Contato** — Nome, empresa, cargo, WhatsApp, e-mail
2. **Informações do Evento** — Tipo, nome, data, local, cidade/estado
3. **Especificações do Stand** — Tipo, metragem, altura, formato, serviços adicionais
4. **Detalhes Finais** — Descrição da marca, referências visuais, orçamento previsto, observações

Ao submeter, os dados são salvos na tabela `orcamentos` e uma notificação é enviada ao proprietário via Manus Notifications.

---

## CRM Interno

O CRM está acessível em [samslocacoes.com.br/crm](https://samslocacoes.com.br/crm) e é restrito a usuários autenticados com credenciais próprias (independente do login do site público).

Consulte o **[Guia Completo do CRM](docs/crm-guide.md)** para instruções detalhadas de uso.

### Módulos Disponíveis

| Módulo | Descrição |
|---|---|
| **Marketing** | Leads (pipeline/lista), Campanhas, Contatos, Relatórios |
| **Comercial** | Clientes, Eventos, Briefings, Pipeline, Contratos, Adicionais |
| **Projetos** | Projetos, Memoriais Descritivos, Aprovações |
| **Montagem** | Checklists, Ordens de Serviço, Conformidade, Custos |
| **Financeiro** | Despesas (Contas a Pagar), Receitas (Contas a Receber), Comissões, Boletos |
| **Administrativo** | Tarefas, Emissão de Boletos, Taxas |
| **Jurídico** | Demandas, Documentos, Prazos |
| **Kanban** | Quadro visual, Minhas Tarefas |
| **Acervo** | Documentos por Feira/Cliente/Tipo (S3 + Google Drive) |
| **Administração** | Usuários, Permissões, Configurações (apenas admin) |

---

## Testes

```bash
# Executar todos os testes
pnpm test

# Executar teste específico
pnpm test -- crm-contas-receber-fix
```

Os testes estão localizados em `server/*.test.ts`. Consulte a [Referência de API](docs/api-reference.md) para detalhes sobre os endpoints testados.

---

## Deploy

O deploy é gerenciado pela plataforma Manus. Para publicar uma nova versão:

1. Salve um checkpoint via interface Manus
2. Clique em **Publish** no painel de gerenciamento

O site é hospedado nos domínios:
- `samslocacoes.com.br` (principal)
- `www.samslocacoes.com.br`
- `samslocacoes.manus.space` (backup)

---

## Documentação Adicional

| Documento | Descrição |
|---|---|
| [Guia do CRM](docs/crm-guide.md) | Manual completo de uso do CRM para operadores |
| [Referência de API](docs/api-reference.md) | Todos os endpoints REST e procedures tRPC |
| [Arquitetura](docs/architecture.md) | Decisões técnicas e diagrama de arquitetura |
| [Contribuição](docs/contributing.md) | Padrões de código, fluxo de trabalho e boas práticas |

---

## Contato

**SAMS Locações**
- WhatsApp: [(51) 99882-7054](https://wa.me/5551998827054)
- E-mail: vera@samslocacoes.com.br
- Localização: Porto Alegre, RS — Atendimento em todo o Brasil
- Instagram: [@samslocacoes](https://instagram.com/samslocacoes)
