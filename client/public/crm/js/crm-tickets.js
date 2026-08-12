/* Módulo de Suporte/Tickets — usuários abrem e acompanham tickets; Desenvolvedor faz a triagem. */
(function () {
  const state = { tickets: [], developer: false, currentId: null, searchTimer: null };
  const root = () => document.getElementById('tickets-root');
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const formatDate = (value, withTime = false) => {
    if (!value) return '—';
    const date = new Date(String(value).replace(' ', 'T'));
    return Number.isNaN(date.getTime()) ? esc(value) : date.toLocaleString('pt-BR', withTime ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'short' });
  };
  const formatStatus = (value) => ({ aberto: 'Aberto', em_analise: 'Em análise', aguardando_usuario: 'Aguardando você', em_desenvolvimento: 'Em desenvolvimento', resolvido: 'Resolvido', nao_procedente: 'Não procedente', fechado: 'Fechado' }[value] || value || '—');
  const statusClass = (value) => ({ aberto: 'bg-blue-100 text-blue-800', em_analise: 'bg-amber-100 text-amber-800', aguardando_usuario: 'bg-purple-100 text-purple-800', em_desenvolvimento: 'bg-indigo-100 text-indigo-800', resolvido: 'bg-emerald-100 text-emerald-800', nao_procedente: 'bg-gray-100 text-gray-700', fechado: 'bg-gray-200 text-gray-700' }[value] || 'bg-gray-100 text-gray-700');
  const priorityClass = (value) => ({ critica: 'text-red-700 bg-red-50 border-red-200', alta: 'text-orange-700 bg-orange-50 border-orange-200', normal: 'text-blue-700 bg-blue-50 border-blue-200', baixa: 'text-gray-700 bg-gray-50 border-gray-200' }[value] || 'text-gray-700 bg-gray-50 border-gray-200');
  const notify = (message, type = 'info') => {
    if (window.NotificationSystem?.show) window.NotificationSystem.show(message, type);
    else window.alert(message);
  };
  async function api(path, options = {}) {
    const response = await fetch(`/api/crm/tickets${path}`, { credentials: 'include', ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Falha na operação (${response.status})`);
    return data;
  }
  function setLoading(message = 'Carregando tickets...') {
    const el = root();
    if (el) el.innerHTML = `<div class="py-12 text-center text-gray-500"><i class="fas fa-circle-notch fa-spin text-blue-600 text-2xl mb-3"></i><div>${esc(message)}</div></div>`;
  }
  function listMarkup() {
    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-4 md:p-6 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div><h3 class="text-xl font-semibold text-gray-800">Meus Tickets</h3><p class="text-sm text-gray-500">Registre problemas ou sugestões e acompanhe o atendimento.</p></div>
          <button type="button" data-ticket-action="new" class="w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition"><i class="fas fa-plus mr-2"></i>Novo Ticket</button>
        </div>
        <div id="tickets-summary" class="hidden px-4 md:px-6 pt-4"></div>
        <div class="p-4 md:p-6 border-b border-gray-100 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_190px] gap-3">
          <label class="sr-only" for="tickets-search">Buscar tickets</label><input id="tickets-search" type="search" placeholder="Buscar por código, título ou solicitante" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
          <select id="tickets-status" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"><option value="">Todos os status</option><option value="aberto">Abertos</option><option value="em_analise">Em análise</option><option value="aguardando_usuario">Aguardando usuário</option><option value="em_desenvolvimento">Em desenvolvimento</option><option value="resolvido">Resolvidos</option><option value="fechado">Fechados</option></select>
        </div>
        <div id="tickets-list" class="divide-y divide-gray-100"><div class="p-8 text-center text-gray-500">Carregando...</div></div>
      </div>`;
  }
  function renderTickets() {
    const list = document.getElementById('tickets-list');
    if (!list) return;
    if (!state.tickets.length) {
      list.innerHTML = `<div class="p-10 text-center text-gray-500"><i class="fas fa-life-ring text-3xl text-gray-300 mb-3"></i><p class="font-medium">Nenhum ticket encontrado.</p><p class="text-sm mt-1">Use “Novo Ticket” para registrar uma melhoria ou problema.</p></div>`;
      return;
    }
    list.innerHTML = state.tickets.map((ticket) => `
      <button type="button" data-ticket-action="open" data-ticket-id="${Number(ticket.id)}" class="w-full text-left p-4 md:px-6 hover:bg-blue-50/50 transition focus:outline-none focus:bg-blue-50">
        <div class="flex flex-col md:flex-row md:items-center gap-3">
          <div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><span class="font-mono text-xs text-blue-700 font-semibold">${esc(ticket.codigo)}</span><span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(ticket.status)}">${esc(formatStatus(ticket.status))}</span><span class="inline-flex px-2 py-0.5 rounded-full border text-xs font-medium ${priorityClass(ticket.prioridade)}">${esc(ticket.prioridade)}</span></div><div class="mt-1 font-semibold text-gray-800 truncate">${esc(ticket.titulo)}</div><div class="mt-1 text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1"><span><i class="fas fa-user mr-1"></i>${esc(ticket.solicitante_nome)}</span><span><i class="far fa-clock mr-1"></i>Prazo: ${formatDate(ticket.prazo_at)}</span><span><i class="far fa-comment mr-1"></i>${Number(ticket.mensagens_total || 0)} mensagem(ns)</span>${Number(ticket.anexos_total || 0) ? `<span><i class="fas fa-paperclip mr-1"></i>${Number(ticket.anexos_total)}</span>` : ''}</div></div>
          <div class="text-blue-600 text-sm font-medium shrink-0">Abrir <i class="fas fa-chevron-right ml-1"></i></div>
        </div>
      </button>`).join('');
  }
  function renderSummary(stats) {
    const summary = document.getElementById('tickets-summary');
    if (!summary || !state.developer) return;
    const map = Object.fromEntries((stats.porStatus || []).map((item) => [item.status, Number(item.total)]));
    summary.classList.remove('hidden');
    summary.innerHTML = `<div class="grid grid-cols-2 lg:grid-cols-4 gap-3"><div class="bg-blue-50 border border-blue-100 rounded-lg p-3"><div class="text-xs text-blue-700">Abertos</div><div class="text-xl font-bold text-blue-900">${map.aberto || 0}</div></div><div class="bg-amber-50 border border-amber-100 rounded-lg p-3"><div class="text-xs text-amber-700">Em atendimento</div><div class="text-xl font-bold text-amber-900">${(map.em_analise || 0) + (map.em_desenvolvimento || 0)}</div></div><div class="bg-red-50 border border-red-100 rounded-lg p-3"><div class="text-xs text-red-700">Prazo vencido</div><div class="text-xl font-bold text-red-900">${Number(stats.vencidos || 0)}</div></div><div class="bg-emerald-50 border border-emerald-100 rounded-lg p-3"><div class="text-xs text-emerald-700">Resolvidos</div><div class="text-xl font-bold text-emerald-900">${map.resolvido || 0}</div></div></div>`;
  }
  async function loadTickets() {
    const search = document.getElementById('tickets-search')?.value || '';
    const status = document.getElementById('tickets-status')?.value || '';
    const params = new URLSearchParams({ limit: '100' });
    if (search) params.set('busca', search);
    if (status) params.set('status', status);
    const data = await api(`/?${params.toString()}`);
    state.tickets = Array.isArray(data.data) ? data.data : [];
    state.developer = !!data.developer;
    renderTickets();
    if (state.developer) api('/stats').then(renderSummary).catch(() => {});
  }
  function bindList() {
    const el = root();
    if (!el || el.dataset.bound === '1') return;
    el.dataset.bound = '1';
    el.addEventListener('click', (event) => {
      const action = event.target.closest('[data-ticket-action]')?.dataset.ticketAction;
      const id = event.target.closest('[data-ticket-id]')?.dataset.ticketId;
      if (action === 'new') renderForm();
      if (action === 'open' && id) openTicket(id);
      if (action === 'back') renderList();
      if (action === 'save-ticket') saveTicket(event);
      if (action === 'save-reply') saveReply(event);
      if (action === 'save-management') saveManagement(event);
    });
    el.addEventListener('input', (event) => {
      if (event.target.id !== 'tickets-search') return;
      clearTimeout(state.searchTimer);
      state.searchTimer = setTimeout(() => loadTickets().catch((error) => notify(error.message, 'error')), 300);
    });
    el.addEventListener('change', (event) => {
      if (event.target.id === 'tickets-status') loadTickets().catch((error) => notify(error.message, 'error'));
    });
  }
  function renderList() { const el = root(); if (!el) return; el.innerHTML = listMarkup(); bindList(); loadTickets().catch((error) => { const list = document.getElementById('tickets-list'); if (list) list.innerHTML = `<div class="p-8 text-center text-red-600">${esc(error.message)}</div>`; }); }
  function renderForm() {
    const el = root(); if (!el) return;
    el.innerHTML = `<div class="bg-white rounded-lg shadow-sm border border-gray-200"><div class="p-4 md:p-6 border-b border-gray-200 flex items-center gap-3"><button type="button" data-ticket-action="back" class="text-gray-600 hover:text-gray-900 p-2" aria-label="Voltar aos tickets"><i class="fas fa-arrow-left"></i></button><div><h3 class="text-xl font-semibold text-gray-800">Novo Ticket</h3><p class="text-sm text-gray-500">Descreva o problema ou a melhoria com o máximo de detalhes.</p></div></div><form id="ticket-create-form" class="p-4 md:p-6 space-y-5" enctype="multipart/form-data"><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div class="md:col-span-2"><label class="block text-sm font-medium text-gray-700 mb-1" for="ticket-title">Título *</label><input id="ticket-title" name="titulo" required maxlength="180" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500" placeholder="Ex.: Campo de busca não filtra eventos"></div><div><label class="block text-sm font-medium text-gray-700 mb-1" for="ticket-category">Tipo</label><select id="ticket-category" name="categoria" class="w-full border border-gray-300 rounded-lg px-3 py-2.5"><option value="problema">Problema</option><option value="melhoria">Sugestão de melhoria</option><option value="duvida">Dúvida</option><option value="acesso">Acesso/permissão</option></select></div><div><label class="block text-sm font-medium text-gray-700 mb-1" for="ticket-priority">Prioridade</label><select id="ticket-priority" name="prioridade" class="w-full border border-gray-300 rounded-lg px-3 py-2.5"><option value="baixa">Baixa</option><option value="normal" selected>Normal</option><option value="alta">Alta</option><option value="critica">Crítica</option></select></div></div><div><label class="block text-sm font-medium text-gray-700 mb-1" for="ticket-description">Descrição *</label><textarea id="ticket-description" name="descricao" required minlength="10" rows="7" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500" placeholder="O que aconteceu? Em qual tela? Quais passos levam ao problema? Qual resultado era esperado?"></textarea></div><div><label class="block text-sm font-medium text-gray-700 mb-1" for="ticket-files">Anexos (opcional)</label><input id="ticket-files" name="anexos" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,text/csv,.xls,.xlsx" class="w-full text-sm border border-gray-300 rounded-lg p-2"><p class="text-xs text-gray-500 mt-1">Até 5 arquivos, 12 MB cada. Imagens, PDF, TXT, CSV e planilhas.</p></div><div class="flex flex-col-reverse sm:flex-row justify-end gap-3"><button type="button" data-ticket-action="back" class="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700">Cancelar</button><button type="button" data-ticket-action="save-ticket" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"><i class="fas fa-paper-plane mr-2"></i>Abrir Ticket</button></div></form></div>`;
  }
  async function saveTicket(event) {
    const form = document.getElementById('ticket-create-form'); if (!form || !form.reportValidity()) return;
    const button = event.target.closest('button'); const original = button.innerHTML; button.disabled = true; button.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>Enviando...';
    try { const data = await api('/', { method: 'POST', body: new FormData(form) }); notify(`Ticket ${data.codigo} aberto com sucesso.`, 'success'); renderList(); } catch (error) { notify(error.message, 'error'); } finally { if (button.isConnected) { button.disabled = false; button.innerHTML = original; } }
  }
  async function openTicket(id) {
    setLoading('Carregando ticket...');
    try {
      const data = await api(`/${encodeURIComponent(id)}`); state.currentId = Number(id); renderDetail(data);
    } catch (error) { notify(error.message, 'error'); renderList(); }
  }
  function renderDetail(data) {
    const el = root(); if (!el) return; const ticket = data.ticket; const developer = !!data.developer;
    const messageFiles = (messageId) => (data.anexos || []).filter((item) => String(item.mensagem_id || '') === String(messageId || '')).map((file) => `<a href="${esc(file.arquivo_url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"><i class="fas fa-paperclip"></i>${esc(file.nome_original)}</a>`).join(' ');
    const ticketFiles = (data.anexos || []).filter((item) => !item.mensagem_id).map((file) => `<a href="${esc(file.arquivo_url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-xs text-blue-700 hover:underline"><i class="fas fa-paperclip"></i>${esc(file.nome_original)}</a>`).join(' ');
    el.innerHTML = `<div class="space-y-4"><div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6"><div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4"><div class="min-w-0"><button type="button" data-ticket-action="back" class="text-sm text-gray-600 hover:text-gray-900 mb-3"><i class="fas fa-arrow-left mr-1"></i>Voltar aos tickets</button><div class="flex flex-wrap gap-2 items-center"><span class="font-mono text-sm font-semibold text-blue-700">${esc(ticket.codigo)}</span><span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(ticket.status)}">${esc(formatStatus(ticket.status))}</span><span class="inline-flex px-2 py-0.5 rounded-full border text-xs font-medium ${priorityClass(ticket.prioridade)}">${esc(ticket.prioridade)}</span></div><h3 class="mt-2 text-xl md:text-2xl font-bold text-gray-800 break-words">${esc(ticket.titulo)}</h3><p class="mt-2 text-gray-700 whitespace-pre-wrap">${esc(ticket.descricao)}</p>${ticketFiles ? `<div class="mt-3 flex flex-wrap gap-2">${ticketFiles}</div>` : ''}</div><div class="text-sm text-gray-500 md:text-right shrink-0"><div>Aberto por <strong>${esc(ticket.solicitante_nome)}</strong></div><div class="mt-1">Prazo: <strong class="${new Date(ticket.prazo_at) < new Date() && !['resolvido','fechado','nao_procedente'].includes(ticket.status) ? 'text-red-600' : 'text-gray-700'}">${formatDate(ticket.prazo_at, true)}</strong></div>${ticket.responsavel_nome ? `<div class="mt-1">Responsável: ${esc(ticket.responsavel_nome)}</div>` : ''}</div></div></div>${developer ? `<div class="bg-indigo-50 border border-indigo-100 rounded-lg p-4"><div class="font-semibold text-indigo-900 mb-3"><i class="fas fa-code mr-2"></i>Painel do Desenvolvedor</div><div class="grid grid-cols-1 md:grid-cols-3 gap-3"><select id="ticket-manage-status" class="border rounded-lg px-3 py-2"><option value="aberto" ${ticket.status === 'aberto' ? 'selected' : ''}>Aberto</option><option value="em_analise" ${ticket.status === 'em_analise' ? 'selected' : ''}>Em análise</option><option value="aguardando_usuario" ${ticket.status === 'aguardando_usuario' ? 'selected' : ''}>Aguardando usuário</option><option value="em_desenvolvimento" ${ticket.status === 'em_desenvolvimento' ? 'selected' : ''}>Em desenvolvimento</option><option value="resolvido" ${ticket.status === 'resolvido' ? 'selected' : ''}>Resolvido</option><option value="nao_procedente" ${ticket.status === 'nao_procedente' ? 'selected' : ''}>Não procedente</option><option value="fechado" ${ticket.status === 'fechado' ? 'selected' : ''}>Fechado</option></select><select id="ticket-manage-priority" class="border rounded-lg px-3 py-2"><option value="baixa" ${ticket.prioridade === 'baixa' ? 'selected' : ''}>Prioridade baixa</option><option value="normal" ${ticket.prioridade === 'normal' ? 'selected' : ''}>Prioridade normal</option><option value="alta" ${ticket.prioridade === 'alta' ? 'selected' : ''}>Prioridade alta</option><option value="critica" ${ticket.prioridade === 'critica' ? 'selected' : ''}>Prioridade crítica</option></select><button type="button" data-ticket-action="save-management" class="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 font-medium">Salvar triagem</button></div></div>` : ''}<div class="bg-white rounded-lg shadow-sm border border-gray-200"><div class="p-4 md:p-6 border-b border-gray-200"><h4 class="font-semibold text-gray-800">Histórico de atendimento</h4></div><div class="p-4 md:p-6 space-y-4">${(data.mensagens || []).length ? data.mensagens.map((message) => `<div class="border rounded-lg p-3 ${message.tipo_autor === 'desenvolvedor' ? 'border-indigo-100 bg-indigo-50/40' : 'border-gray-200'}"><div class="flex flex-wrap justify-between gap-2 text-xs text-gray-500"><strong class="text-gray-700">${esc(message.autor_nome)}${message.tipo_autor === 'desenvolvedor' ? ' · Desenvolvedor' : ''}</strong><span>${formatDate(message.created_at, true)}</span></div>${message.mensagem ? `<p class="mt-2 text-sm text-gray-700 whitespace-pre-wrap">${esc(message.mensagem)}</p>` : ''}${messageFiles(message.id) ? `<div class="mt-2 flex flex-wrap gap-2">${messageFiles(message.id)}</div>` : ''}</div>`).join('') : '<p class="text-sm text-gray-500">Ainda não há mensagens neste ticket.</p>'}</div><form id="ticket-reply-form" class="p-4 md:p-6 border-t border-gray-200" enctype="multipart/form-data"><label class="block text-sm font-medium text-gray-700 mb-1" for="ticket-reply-message">Adicionar mensagem</label><textarea id="ticket-reply-message" name="mensagem" rows="4" class="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Escreva uma atualização ou resposta..."></textarea><div class="mt-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"><input name="anexos" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,text/csv,.xls,.xlsx" class="text-sm max-w-full"><button type="button" data-ticket-action="save-reply" class="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 font-medium"><i class="fas fa-reply mr-2"></i>Enviar mensagem</button></div></form></div></div>`;
  }
  async function saveReply(event) { const form = document.getElementById('ticket-reply-form'); if (!form) return; const button = event.target.closest('button'); const original = button.innerHTML; button.disabled = true; button.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>Enviando...'; try { await api(`/${state.currentId}/mensagens`, { method: 'POST', body: new FormData(form) }); await openTicket(state.currentId); } catch (error) { notify(error.message, 'error'); } finally { if (button.isConnected) { button.disabled = false; button.innerHTML = original; } } }
  async function saveManagement(event) { const button = event.target.closest('button'); const original = button.innerHTML; button.disabled = true; button.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>Salvando...'; try { await api(`/${state.currentId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: document.getElementById('ticket-manage-status').value, prioridade: document.getElementById('ticket-manage-priority').value }) }); notify('Triagem atualizada.', 'success'); await openTicket(state.currentId); } catch (error) { notify(error.message, 'error'); } finally { if (button.isConnected) { button.disabled = false; button.innerHTML = original; } } }
  window.SuporteModule = {
    listTickets() { return '<div id="tickets-root"></div>'; },
    initTickets() { renderList(); },
  };
})();
