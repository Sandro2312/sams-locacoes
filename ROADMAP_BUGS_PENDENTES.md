# Roadmap de Correção — 3 Bugs Pendentes
**Data de Criação:** 21/05/2026  
**Versão Atual:** 5.9.0  
**Status:** Planejamento

---

## 📊 Resumo Executivo

| Bug | Severidade | Complexidade | Estimativa | Impacto |
|-----|-----------|-------------|-----------|---------|
| #1: Despesas não sincronizam mobile ↔ desktop | 🔴 Alta | Média | 2-3h | Dados financeiros inconsistentes |
| #2: Cadastro de usuário não aparece na lista | 🔴 Alta | Baixa | 1-2h | UX confusa, usuários pensam que falhou |
| #3: Botão Salvar escondido no mobile | 🟡 Média | Baixa | 30-45min | Impossível salvar em mobile |

**Tempo Total Estimado:** 4-5.5 horas  
**Prazo Recomendado:** 1 dia (se dedicado) ou 2-3 dias (com outros trabalhos)

---

## 🐛 Bug #1: Despesas Não Sincronizam Mobile ↔ Desktop

### Descrição
Quando um usuário cadastra uma despesa no desktop, ela não aparece quando acessa via mobile. O inverso também ocorre.

### Causa Raiz Identificada
- **Arquivo:** `/home/ubuntu/sams-locacoes/client/public/crm/js/financial.js` (649 linhas)
- **Problema:** Dados de despesas armazenados em `ModuleSystem.data.financeiro.despesas` (memória local)
- **Raiz:** Não há sincronização com backend — dados ficam apenas em memória do navegador
- **Agravante:** Cada navegador/dispositivo tem sua própria cópia de dados em memória

### Solução Proposta
1. **Backend:** Criar endpoint `GET/POST /api/crm/despesas` no `server/crm.ts`
2. **Banco:** Usar tabela `crm_transacoes` existente (já tem campo `tipo = 'despesa'`)
3. **Frontend:** Modificar `financial.js` para:
   - Carregar despesas do backend ao abrir módulo
   - Salvar despesas no backend (não só em memória)
   - Sincronizar em tempo real com WebSocket (opcional, para v5.10)

### Checklist de Implementação
- [ ] Criar endpoint `GET /api/crm/despesas` (listar com filtros)
- [ ] Criar endpoint `POST /api/crm/despesas` (criar nova)
- [ ] Criar endpoint `PUT /api/crm/despesas/:id` (editar)
- [ ] Criar endpoint `DELETE /api/crm/despesas/:id` (deletar)
- [ ] Modificar `financial.js` para usar endpoints
- [ ] Testar sincronização desktop → mobile
- [ ] Testar sincronização mobile → desktop
- [ ] Limpar dados antigos de memória
- [ ] Adicionar loading states
- [ ] Testar em múltiplos navegadores

### Estimativa: **2-3 horas**
- Backend (endpoints): 45-60 min
- Frontend (integração): 60-90 min
- Testes: 30-45 min

### Dependências
- Nenhuma (endpoints podem reutilizar `crm_transacoes` existente)

### Risco
- **Baixo:** Tabela `crm_transacoes` já existe e tem dados
- Possível: Migração de dados antigos de memória para banco

---

## 🐛 Bug #2: Cadastro de Usuário Não Aparece na Lista

### Descrição
Após cadastrar um novo usuário no módulo Administração, o formulário fecha mas o usuário não aparece na lista. Ao recarregar a página, o usuário aparece.

### Causa Raiz Identificada
- **Arquivo:** Módulo de Administração (localização: `index.html` ou `modules.js`)
- **Problema:** Lista de usuários não é atualizada após POST bem-sucedido
- **Raiz:** Falta de callback `onSuccess` que recarrega a lista ou adiciona o novo usuário

### Solução Proposta
1. **Frontend:** Após `POST /api/crm/users` retornar sucesso:
   - Adicionar novo usuário à lista em memória
   - OU fazer `GET /api/crm/users` novamente para recarregar
   - Fechar modal
   - Mostrar toast de sucesso

### Checklist de Implementação
- [ ] Localizar código que faz POST de novo usuário
- [ ] Adicionar callback `onSuccess` que recarrega lista
- [ ] Testar criação de usuário
- [ ] Validar que novo usuário aparece imediatamente
- [ ] Testar em mobile e desktop

### Estimativa: **1-2 horas**
- Localizar código: 15-20 min
- Implementar callback: 30-45 min
- Testes: 15-30 min

### Dependências
- Nenhuma (apenas ajuste frontend)

### Risco
- **Muito Baixo:** Simples ajuste de UX

---

## 🐛 Bug #3: Botão Salvar Escondido no Mobile

### Descrição
Em formulários de cadastro/edição no mobile, o botão "Salvar" fica fora da viewport e não é acessível sem scroll. Usuários pensam que o formulário não tem botão de ação.

### Causa Raiz Identificada
- **Arquivo:** Formulários em `index.html` ou `forms.js`
- **Problema:** Modal/formulário com `max-h-[95vh]` mas botões em `position: absolute` ou `position: fixed` fora da área visível
- **Raiz:** Falta de `sticky` positioning ou `flex` layout adequado para mobile

### Solução Proposta
1. **CSS:** Usar `position: sticky` ou `flex` layout para botões
2. **Layout:** Garantir que botões fiquem sempre visíveis:
   - Usar `flex flex-col` no container
   - Botões em `flex-shrink-0` (não encolhem)
   - Conteúdo em `flex-1 overflow-y-auto` (encolhe se necessário)

### Checklist de Implementação
- [ ] Localizar todos os formulários/modais
- [ ] Verificar layout dos botões de ação
- [ ] Aplicar `sticky` ou `flex` layout
- [ ] Testar em telas < 480px (mobile pequeno)
- [ ] Testar em telas 480-768px (tablet)
- [ ] Testar em telas > 768px (desktop)
- [ ] Validar que botões são sempre acessíveis

### Estimativa: **30-45 minutos**
- Localizar formulários: 10-15 min
- Ajustar CSS: 15-20 min
- Testes: 10-15 min

### Dependências
- Nenhuma (apenas CSS)

### Risco
- **Muito Baixo:** Simples ajuste de CSS

---

## 📅 Cronograma Recomendado

### **Semana 1 (21-25 de maio)**
| Data | Atividade | Responsável | Status |
|------|-----------|-------------|--------|
| 21/05 | Análise e planejamento | IA | ✅ Concluído |
| 22/05 | Bug #3 (botão mobile) | IA | ⏳ Pendente |
| 22/05 | Bug #2 (usuário não aparece) | IA | ⏳ Pendente |
| 23-24/05 | Bug #1 (despesas sync) | IA | ⏳ Pendente |
| 24/05 | Testes integrados | Equipe SAMS | ⏳ Pendente |
| 25/05 | Deploy v5.10 | IA | ⏳ Pendente |

### **Paralelo: Próximas Features**
- Importação em lote do Google Drive (Acervo)
- WebSocket para sincronização em tempo real (v5.11)
- Notificações push mobile (v5.12)

---

## 🔧 Ordem de Implementação Recomendada

### **Fase 1: Rápidas (hoje - 1h)**
1. ✅ Bug #3: Botão Salvar mobile (30-45 min)
2. ✅ Bug #2: Usuário não aparece (15-30 min)

### **Fase 2: Complexa (amanhã - 2-3h)**
3. ⏳ Bug #1: Despesas sync (2-3h)

### **Fase 3: Validação (24/05)**
4. ⏳ Testes em múltiplos dispositivos
5. ⏳ Testes em múltiplos navegadores (Chrome, Edge, Safari, Firefox)
6. ⏳ Testes com dados reais da Martina e equipe

---

## 📋 Critérios de Aceite

### Bug #1: Despesas Sincronizam
- ✅ Despesa criada no desktop aparece no mobile
- ✅ Despesa criada no mobile aparece no desktop
- ✅ Edição sincroniza entre dispositivos
- ✅ Deleção sincroniza entre dispositivos
- ✅ Sem perda de dados ao trocar dispositivo

### Bug #2: Usuário Aparece na Lista
- ✅ Novo usuário aparece imediatamente após criação
- ✅ Sem necessidade de recarregar página
- ✅ Toast de sucesso é mostrado
- ✅ Modal fecha automaticamente

### Bug #3: Botão Sempre Visível
- ✅ Botão Salvar visível em telas < 480px
- ✅ Botão Salvar visível em telas 480-768px
- ✅ Botão Salvar visível em telas > 768px
- ✅ Sem necessidade de scroll horizontal
- ✅ Sem sobreposição de elementos

---

## 🚀 Próximas Etapas Após Bugs

1. **v5.10 (26-27/05):** Importação em lote Google Drive
2. **v5.11 (28-29/05):** WebSocket para sync em tempo real
3. **v5.12 (30-31/05):** Notificações push mobile
4. **v6.0 (01-05/06):** Refactor de performance + testes E2E

---

## 📞 Contato e Suporte

- **Desenvolvedor:** IA Manus
- **Projeto:** SAMS Locações CRM/ERP
- **Versão:** 5.9.0 → 5.10.0
- **Ambiente:** Produção (samslocacoes.com.br)

---

**Última Atualização:** 21/05/2026 18:45 GMT-3  
**Próxima Revisão:** 22/05/2026 09:00 GMT-3
