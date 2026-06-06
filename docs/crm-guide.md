# Guia do CRM — SAMS Locações

> Manual de uso do sistema CRM/ERP interno da SAMS Locações.
> Acesso: [samslocacoes.com.br/crm](https://samslocacoes.com.br/crm)

---

## Sumário

1. [Acesso e Autenticação](#1-acesso-e-autenticação)
2. [Dashboard Principal](#2-dashboard-principal)
3. [Módulo Marketing](#3-módulo-marketing)
4. [Módulo Comercial](#4-módulo-comercial)
5. [Módulo Projetos](#5-módulo-projetos)
6. [Módulo Montagem](#6-módulo-montagem)
7. [Módulo Financeiro](#7-módulo-financeiro)
8. [Módulo Administrativo](#8-módulo-administrativo)
9. [Módulo Jurídico](#9-módulo-jurídico)
10. [Kanban](#10-kanban)
11. [Acervo Documental](#11-acervo-documental)
12. [Administração do Sistema](#12-administração-do-sistema)
13. [Perfis e Permissões](#13-perfis-e-permissões)
14. [Perguntas Frequentes](#14-perguntas-frequentes)

---

## 1. Acesso e Autenticação

### Login

Acesse [samslocacoes.com.br/crm](https://samslocacoes.com.br/crm) e insira seu e-mail e senha cadastrados. O CRM utiliza autenticação própria, independente do login do site público.

**Recuperação de senha:** Clique em "Esqueci minha senha" na tela de login. Um link de redefinição será enviado para o e-mail cadastrado.

### Sessão

A sessão permanece ativa por 8 horas. Em dispositivos que bloqueiam cookies (Safari com ITP, Brave, Firefox com ETP estrito), o sistema utiliza automaticamente um token de fallback armazenado no `sessionStorage`.

---

## 2. Dashboard Principal

O dashboard exibe cards de acesso rápido para todos os módulos disponíveis conforme o perfil do usuário. Clique em qualquer card para entrar no módulo correspondente.

A barra lateral esquerda (em desktop) e o menu hambúrguer (em mobile) permitem navegar entre módulos e sub-páginas sem retornar ao dashboard.

---

## 3. Módulo Marketing

### 3.1 Leads

O sub-módulo de Leads é o ponto de entrada do funil de vendas. Ele suporta dois modos de visualização:

- **Lista:** Tabela com filtros por status, temperatura e responsável.
- **Pipeline (Kanban):** Colunas organizadas por etapa do funil. Pode ser agrupado por Status, Temperatura ou Funil.

**Criar novo lead:** Clique em **Novo Lead** no topo da tela. Preencha nome, contato, evento de interesse, metragem estimada e temperatura (frio/morno/quente).

**Campos disponíveis:**

| Campo | Descrição |
|---|---|
| Nome | Nome do contato ou empresa |
| E-mail / WhatsApp | Dados de contato |
| Status | Novo, Em contato, Proposta enviada, Negociação, Ganho, Perdido |
| Temperatura | Frio, Morno, Quente |
| Evento de interesse | Nome da feira ou evento |
| Metragem estimada | Área do stand em m² |
| Responsável | Usuário do CRM responsável pelo lead |
| Próximo contato | Data agendada para follow-up |
| Score | Pontuação de qualificação (0–100) |

### 3.2 Campanhas

Registro e acompanhamento de campanhas de marketing (Google Ads, Meta Ads, e-mail marketing, etc.).

### 3.3 Contatos

Base de contatos independente dos leads e clientes. Útil para manter relacionamentos com parceiros, fornecedores e contatos de feiras.

---

## 4. Módulo Comercial

### 4.1 Clientes

Cadastro completo de clientes com dados de contato, endereço, segmento e histórico. Cada cliente pode ter arquivos anexados (contratos, logos, briefings).

### 4.2 Eventos

Registro das feiras e eventos em que a SAMS participa ou participou. Vincula clientes, stands e ordens de serviço.

### 4.3 Briefings

Documentos de briefing por evento/cliente. Contém especificações técnicas do stand, requisitos do cliente e checklist de aprovação.

### 4.4 Pipeline Comercial

Visão consolidada de todas as oportunidades em andamento, com valor estimado e probabilidade de fechamento.

### 4.5 Contratos

Gestão de contratos com clientes. Cada contrato pode ter parcelas de pagamento vinculadas ao módulo Financeiro.

---

## 5. Módulo Projetos

### 5.1 Projetos

Acompanhamento do desenvolvimento de cada stand desde a concepção até a aprovação final. Status: Briefing → Design → Revisão → Aprovado → Em Produção → Entregue.

### 5.2 Memoriais Descritivos

Documentos técnicos com especificações de materiais, acabamentos e dimensões de cada projeto.

### 5.3 Aprovações

Fluxo de aprovação de projetos pelo cliente. Registra histórico de revisões e comentários.

---

## 6. Módulo Montagem

### 6.1 Checklists

Checklists de montagem por evento. Itens marcados em tempo real pela equipe em campo (compatível com mobile).

### 6.2 Ordens de Serviço

Geração e acompanhamento de OS para cada montagem. Inclui equipe designada, materiais necessários e registro fotográfico.

### 6.3 Conformidade

Registro de não-conformidades identificadas durante a montagem com plano de ação corretiva.

### 6.4 Custos de Montagem

Registro de custos operacionais por evento (diárias, transporte, hospedagem, materiais extras).

---

## 7. Módulo Financeiro

> **Acesso restrito:** Apenas usuários com perfil `admin`, `manager` ou `financeiro` têm acesso completo a este módulo.

### 7.1 Despesas (Contas a Pagar)

Registro de todas as saídas financeiras da empresa.

**Criar nova despesa:** Clique em **Nova Despesa** no topo da seção. Preencha:

| Campo | Obrigatório | Descrição |
|---|---|---|
| Descrição | Sim | Identificação da despesa |
| Valor | Sim | Valor em R$ |
| Vencimento | Sim | Data de vencimento |
| Status | Sim | Pendente, Pago, Vencido, Cancelado |
| Centro de Custo | Não | Categoria da despesa |
| Comprovante | Não | Arquivo PDF ou imagem (upload para S3) |

**Filtrar por Centro de Custo:** Use o seletor no topo da tabela para filtrar despesas por categoria.

### 7.2 Receitas (Contas a Receber)

Registro de todas as entradas financeiras.

**Criar nova conta a receber:** Clique em **Nova Conta a Receber**. Preencha:

| Campo | Obrigatório | Descrição |
|---|---|---|
| Descrição | Sim | Identificação da receita |
| Valor | Sim | Valor em R$ |
| Vencimento | Sim | Data de vencimento |
| Status | Sim | Pendente, Pago, Vencido, Cancelado |
| Cliente | Não | Vínculo com cliente cadastrado |
| Comprovante | Não | Arquivo de comprovante de pagamento |

> **Nota:** O campo Comprovante é **opcional** mesmo quando o status é "Pago". Você pode salvar o registro sem anexar um arquivo.

### 7.3 Comissões

Cálculo e acompanhamento de comissões da equipe de vendas por evento/contrato.

### 7.4 Boletos

Registro e controle de boletos emitidos e recebidos.

---

## 8. Módulo Administrativo

### 8.1 Tarefas

Gestão de tarefas internas com prazo, responsável e status.

### 8.2 Emissão de Boletos

Integração para emissão de boletos bancários (em desenvolvimento).

### 8.3 Taxas

Registro de taxas e encargos financeiros.

---

## 9. Módulo Jurídico

### 9.1 Demandas

Registro e acompanhamento de demandas jurídicas (contratos em disputa, cobranças, etc.).

### 9.2 Documentos

Repositório de documentos jurídicos (contratos, procurações, certidões).

### 9.3 Prazos

Controle de prazos processuais e contratuais com alertas.

---

## 10. Kanban

Quadro Kanban visual para gestão de tarefas e projetos. Suporta arrastar e soltar entre colunas. A aba "Minhas Tarefas" exibe apenas as tarefas atribuídas ao usuário logado.

---

## 11. Acervo Documental

O Acervo organiza todos os documentos da empresa por **Feira → Cliente → Tipo de Documento**.

### Tipos de Documento Suportados

| Tipo | Extensões |
|---|---|
| Projeto/Desenho | DWG, PDF, PNG, JPG |
| Contrato | PDF |
| Foto | JPG, PNG, WEBP |
| Orçamento | PDF, XLSX |
| Nota Fiscal | PDF |
| Outros | Qualquer formato (até 50 MB) |

### Origens de Arquivo

- **S3 (🔵):** Arquivo enviado diretamente pelo CRM. Download disponível via botão dedicado.
- **Google Drive (🟢):** Link externo para pasta ou arquivo no Drive. Abre em nova aba.

### Busca

Use o campo de busca para filtrar por nome, tipo, evento ou ano. A busca é instantânea e não requer recarregar a página.

---

## 12. Administração do Sistema

> **Acesso exclusivo:** Apenas usuários com perfil `admin` ou `administrador`.

### Gerenciar Usuários

- Criar novos usuários com e-mail, senha e perfil
- Editar dados e alterar perfil de usuários existentes
- Desativar usuários sem excluir o histórico

### Gerenciar Permissões

Cada perfil tem um conjunto padrão de permissões. O administrador pode personalizar permissões por usuário individualmente.

### Configurações do Sistema

Parâmetros gerais do CRM como nome da empresa, logo e configurações de notificação.

---

## 13. Perfis e Permissões

| Perfil | Acesso |
|---|---|
| `admin` / `administrador` | Acesso total a todos os módulos |
| `manager` / `gerente` | Acesso a Marketing, Comercial, Projetos, Montagem, Financeiro (leitura) |
| `vendedor` | Marketing (Leads, Contatos), Comercial (Clientes, Eventos, Briefings) |
| `projetista` | Projetos, Montagem (leitura) |
| `montador` | Montagem (Checklists, OS), Projetos (leitura) |
| `financeiro` | Financeiro (completo), Comercial (leitura) |
| `juridico` | Jurídico (completo), Comercial (leitura) |

---

## 14. Perguntas Frequentes

**Os dados do CRM aparecem no celular?**
Sim. O CRM é totalmente responsivo. Dados cadastrados no desktop são sincronizados automaticamente ao abrir o módulo no celular.

**Posso usar o CRM no Safari?**
Sim. O sistema utiliza um token de fallback no `sessionStorage` para contornar as restrições de cookies do Safari ITP e do Brave.

**O comprovante é obrigatório ao marcar uma despesa como "Pago"?**
Não. O campo comprovante é opcional em todos os casos. Você pode salvar o registro sem anexar um arquivo.

**Como exportar dados do CRM?**
A exportação de relatórios está disponível na sub-página "Relatórios" dos módulos Marketing e Financeiro.

**Como adicionar um novo usuário ao CRM?**
Acesse o módulo **Administração → Usuários** e clique em "Novo Usuário". Apenas administradores podem criar usuários.
