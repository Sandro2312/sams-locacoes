/* Rateios auditáveis — distribui custos compartilhados sem modificar a despesa de origem. */
(function () {
  'use strict';

  const state = { items: [], eligible: [], projects: [], loading: false, eventoId: '' };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const authHeaders = () => { try { return window.AuthSystem?._getAuthHeaders?.() || {}; } catch { return {}; } };
  const currentUser = () => window.AuthSystem?.getCurrentUser?.() || window.AuthSystem?.currentUser || null;
  const canManage = () => ['admin', 'administrador', 'manager', 'gerente', 'gerencia', 'desenvolvedor', 'developer', 'financeiro'].includes(String(currentUser()?.role || '').toLowerCase());
  const events = () => Array.isArray(window.ModuleSystem?.data?.eventos) ? window.ModuleSystem.data.eventos : [];
  const criteriaLabel = (value) => ({ igualitario: 'Igualitário', area_m2: 'Por área (m²)', receita_prevista: 'Por receita prevista', manual: 'Manual' }[value] || value || '-');

  async function api(path, options = {}) {
    const response = await fetch(`/api/crm/rateios${path}`, { credentials: 'include', ...options, headers: { ...authHeaders(), ...(options.headers || {}) } });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('Sua sessão expirou. Faça login novamente.');
    if (!response.ok) throw new Error(payload.error || 'Não foi possível concluir a operação.');
    return payload;
  }
  function showMessage(message, type = 'success') {
    if (window.Toast?.show) window.Toast.show(message, type);
    else window.alert(message);
  }
  function eventOptions(selected = '', allLabel = 'Todos os eventos') {
    return `<option value="">${allLabel}</option>${events().map((event) => `<option value="${event.id}" ${String(event.id) === String(selected) ? 'selected' : ''}>${escapeHtml(event.nome || `Evento #${event.id}`)}</option>`).join('')}`;
  }
  function render() {
    const manage = canManage();
    const total = state.items.reduce((sum, item) => sum + Number(item.valor_origem || 0), 0);
    return `<section class="space-y-5" aria-label="Rateio de custos compartilhados">
      <div class="rounded-lg bg-white p-4 shadow md:p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><h3 class="text-xl font-semibold text-gray-800"><i class="fas fa-share-alt mr-2 text-indigo-600"></i>Rateio de Custos Compartilhados</h3><p class="mt-1 text-sm text-gray-600">Distribua uma despesa geral da feira entre stands sem modificar o lançamento de origem.</p></div>
          ${manage ? '<button id="rateio-new" type="button" class="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"><i class="fas fa-plus mr-2"></i>Novo Rateio</button>' : ''}
        </div>
        <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label class="block text-sm font-medium text-gray-700">Evento<select id="rateio-evento-filter" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">${eventOptions(state.eventoId)}</select></label>
          <div class="flex items-end"><button id="rateio-refresh" type="button" class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"><i class="fas fa-sync-alt mr-2"></i>Atualizar</button></div>
        </div>
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2"><div class="rounded-lg bg-indigo-50 p-4"><p class="text-xs font-semibold uppercase tracking-wide text-indigo-700">Rateios aprovados</p><p class="mt-1 text-2xl font-bold text-indigo-900">${state.items.length}</p></div><div class="rounded-lg bg-amber-50 p-4"><p class="text-xs font-semibold uppercase tracking-wide text-amber-700">Custos distribuídos</p><p class="mt-1 text-2xl font-bold text-amber-900">${money(total)}</p></div></div>
      <div class="overflow-x-auto rounded-lg bg-white shadow"><table class="min-w-full divide-y divide-gray-200"><thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Evento / Despesa</th><th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Critério</th><th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Origem</th><th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Destinos</th><th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Alocado</th>${manage ? '<th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Ações</th>' : ''}</tr></thead><tbody class="divide-y divide-gray-100">${state.loading ? `<tr><td colspan="${manage ? 6 : 5}" class="px-4 py-8 text-center text-sm text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i>Carregando rateios...</td></tr>` : state.items.length ? state.items.map((item) => `<tr class="hover:bg-gray-50"><td class="px-4 py-3"><div class="font-medium text-gray-900">${escapeHtml(item.evento_nome || '-')}</div><div class="text-sm text-gray-500">${escapeHtml(item.transacao_descricao || '-')}</div><div class="text-xs text-gray-400">${item.transacao_data ? escapeHtml(String(item.transacao_data).slice(0, 10)) : '-'}</div></td><td class="px-4 py-3 text-sm text-gray-700">${escapeHtml(criteriaLabel(item.criterio))}</td><td class="px-4 py-3 text-right text-sm font-medium text-gray-900">${money(item.valor_origem)}</td><td class="px-4 py-3 text-right text-sm text-gray-700">${Number(item.destinos || 0)}</td><td class="px-4 py-3 text-right text-sm font-medium text-emerald-700">${money(item.valor_alocado)}</td>${manage ? `<td class="px-4 py-3 text-right"><button type="button" data-id="${item.id}" class="rateio-detail text-sm font-medium text-indigo-700 hover:text-indigo-900">Detalhes</button><button type="button" data-id="${item.id}" class="rateio-delete ml-3 text-sm font-medium text-rose-700 hover:text-rose-900">Desfazer</button></td>` : ''}</tr>`).join('') : `<tr><td colspan="${manage ? 6 : 5}" class="px-4 py-8 text-center text-sm text-gray-500">Nenhum rateio encontrado. ${manage ? 'Cadastre despesas de evento e Projetos de Stand para iniciar.' : ''}</td></tr>`}</tbody></table></div>
      <p class="text-xs text-gray-500">Cada despesa pode receber apenas uma regra aprovada. Desfazer o rateio remove somente suas alocações, preservando integralmente a despesa financeira original.</p>
    </section>`;
  }
  function modalMarkup() {
    return `<div id="rateio-modal" class="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="rateio-modal-title"><div class="my-4 w-full max-w-4xl rounded-xl bg-white shadow-2xl"><form id="rateio-form" class="p-5 md:p-6"><div class="flex items-start justify-between gap-4"><div><h3 id="rateio-modal-title" class="text-lg font-semibold text-gray-900">Novo Rateio de Custo</h3><p class="mt-1 text-sm text-gray-600">A despesa de origem não será alterada. Revise os destinatários antes de confirmar.</p></div><button id="rateio-cancel" type="button" class="text-xl text-gray-400 hover:text-gray-700" aria-label="Fechar">&times;</button></div><div class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2"><label class="block text-sm font-medium text-gray-700">Evento *<select id="rateio-form-evento" required class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">${eventOptions('', 'Selecione o evento...')}</select></label><label class="block text-sm font-medium text-gray-700">Critério *<select id="rateio-criterio" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"><option value="igualitario">Igualitário</option><option value="area_m2">Por área (m²)</option><option value="receita_prevista">Por receita prevista</option><option value="manual">Manual</option></select></label><label class="block text-sm font-medium text-gray-700 md:col-span-2">Despesa compartilhada *<select id="rateio-transacao" required class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"><option value="">Selecione primeiro o evento...</option></select></label></div><div class="mt-5"><div class="flex items-center justify-between gap-3"><h4 class="font-semibold text-gray-800">Projetos de Stand destinatários</h4><span id="rateio-project-count" class="text-xs text-gray-500">Selecione ao menos dois projetos.</span></div><div id="rateio-projects" class="mt-3 space-y-2 rounded-lg border border-gray-200 p-3 text-sm text-gray-500">Selecione primeiro o evento.</div></div><label class="mt-5 block text-sm font-medium text-gray-700">Observações do rateio<textarea id="rateio-observacoes" maxlength="4000" rows="3" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Ex.: Frete conjunto do pavilhão, distribuído por área dos stands."></textarea></label><div id="rateio-preview" class="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-gray-600">A prévia será exibida após a seleção da despesa e dos projetos.</div><div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button id="rateio-cancel-bottom" type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancelar</button><button type="submit" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Confirmar Rateio</button></div></form></div></div>`;
  }
  function parseMoney(value) { const parsed = Number(String(value || '').replace(',', '.')); return Number.isFinite(parsed) ? parsed : 0; }
  function preview(modal) {
    const source = state.eligible.find((item) => String(item.id) === String(modal.querySelector('#rateio-transacao')?.value));
    const criterion = modal.querySelector('#rateio-criterio')?.value || 'igualitario';
    const selected = Array.from(modal.querySelectorAll('input[name="rateio-project"]:checked')).map((input) => state.projects.find((project) => String(project.id) === String(input.value))).filter(Boolean);
    const count = modal.querySelector('#rateio-project-count');
    if (count) count.textContent = `${selected.length} projeto(s) selecionado(s).`;
    const box = modal.querySelector('#rateio-preview');
    if (!source || selected.length < 2) { box.textContent = 'Selecione uma despesa e ao menos dois Projetos de Stand para revisar a distribuição.'; return; }
    const total = parseMoney(source.valor);
    const weights = selected.map((project) => criterion === 'area_m2' ? parseMoney(project.area_m2) : criterion === 'receita_prevista' ? parseMoney(project.receitas_previstas) : 1);
    const sumWeights = weights.reduce((sum, value) => sum + value, 0);
    if (criterion !== 'manual' && sumWeights <= 0) { box.textContent = 'Este critério exige área ou receita prevista positiva em todos os projetos selecionados.'; return; }
    let allocated = 0;
    const lines = selected.map((project, index) => {
      const input = modal.querySelector(`input[name="valor-${project.id}"]`);
      const value = criterion === 'manual' ? parseMoney(input?.value) : total * weights[index] / sumWeights;
      allocated += value;
      return `<li>${escapeHtml(project.nome || project.codigo || `Projeto #${project.id}`)}: <strong>${money(value)}</strong></li>`;
    }).join('');
    box.innerHTML = `<p class="font-medium text-gray-800">Prévia do rateio de ${money(total)}:</p><ul class="mt-2 list-disc space-y-1 pl-5">${lines}</ul><p class="mt-2 ${Math.abs(allocated - total) < 0.01 ? 'text-emerald-700' : 'text-rose-700'}">Total informado: ${money(allocated)}${criterion === 'manual' ? ` · Diferença: ${money(total - allocated)}` : ''}</p>`;
  }
  function renderProjects(modal) {
    const box = modal.querySelector('#rateio-projects');
    if (!state.projects.length) { box.textContent = 'Não há Projetos de Stand disponíveis para este evento.'; return; }
    box.innerHTML = state.projects.map((project) => `<label class="flex flex-wrap items-center gap-2 rounded-md px-2 py-2 hover:bg-gray-50"><input type="checkbox" name="rateio-project" value="${project.id}" class="h-4 w-4 rounded border-gray-300 text-indigo-600"><span class="min-w-0 flex-1"><span class="font-medium text-gray-800">${escapeHtml(project.nome || project.codigo || `Projeto #${project.id}`)}</span><span class="ml-1 text-xs text-gray-500">${escapeHtml(project.cliente_nome || project.lead_nome || '')}${project.area_m2 ? ` · ${escapeHtml(project.area_m2)} m²` : ''}</span></span><span class="text-xs text-gray-500">Receita: ${money(project.receitas_previstas)}</span><input name="valor-${project.id}" inputmode="decimal" type="number" min="0.01" step="0.01" class="rateio-manual-value hidden w-28 rounded border border-gray-300 px-2 py-1 text-right text-sm" aria-label="Valor manual para ${escapeHtml(project.nome || `Projeto #${project.id}`)}"></label>`).join('');
  }
  async function loadFormData(modal) {
    const eventId = modal.querySelector('#rateio-form-evento')?.value;
    const transactionSelect = modal.querySelector('#rateio-transacao');
    if (!eventId) { transactionSelect.innerHTML = '<option value="">Selecione primeiro o evento...</option>'; state.projects = []; renderProjects(modal); preview(modal); return; }
    transactionSelect.innerHTML = '<option value="">Carregando despesas...</option>';
    try {
      const [eligible, projects] = await Promise.all([
        api(`/transacoes-elegiveis?evento_id=${encodeURIComponent(eventId)}`),
        fetch(`/api/crm/projetos-stand?evento_id=${encodeURIComponent(eventId)}&limit=100`, { credentials: 'include', headers: authHeaders() }).then(async (response) => ({ ok: response.ok, body: await response.json().catch(() => ({})) })),
      ]);
      state.eligible = Array.isArray(eligible.data) ? eligible.data : [];
      state.projects = projects.ok && Array.isArray(projects.body?.data) ? projects.body.data : [];
      transactionSelect.innerHTML = `<option value="">Selecione a despesa compartilhada...</option>${state.eligible.map((item) => `<option value="${item.id}">${escapeHtml(item.descricao || `Despesa #${item.id}`)} — ${money(item.valor)}</option>`).join('')}`;
      renderProjects(modal);
    } catch (error) {
      state.eligible = []; state.projects = [];
      transactionSelect.innerHTML = '<option value="">Não foi possível carregar despesas</option>';
      renderProjects(modal);
      showMessage(error.message || 'Não foi possível carregar os dados do rateio.', 'error');
    }
    preview(modal);
  }
  function openForm() {
    document.getElementById('rateio-modal')?.remove();
    document.body.insertAdjacentHTML('beforeend', modalMarkup());
    const modal = document.getElementById('rateio-modal');
    const close = () => modal?.remove();
    modal?.querySelector('#rateio-cancel')?.addEventListener('click', close);
    modal?.querySelector('#rateio-cancel-bottom')?.addEventListener('click', close);
    modal?.addEventListener('click', (event) => { if (event.target === modal) close(); });
    modal?.querySelector('#rateio-form-evento')?.addEventListener('change', () => loadFormData(modal));
    modal?.querySelector('#rateio-criterio')?.addEventListener('change', (event) => {
      const isManual = event.target.value === 'manual';
      modal.querySelectorAll('.rateio-manual-value').forEach((input) => input.classList.toggle('hidden', !isManual));
      preview(modal);
    });
    modal?.addEventListener('input', (event) => { if (event.target.matches('input[name="rateio-project"], .rateio-manual-value')) preview(modal); });
    modal?.addEventListener('change', (event) => { if (event.target.matches('input[name="rateio-project"], #rateio-transacao')) preview(modal); });
    modal?.querySelector('#rateio-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const criterion = modal.querySelector('#rateio-criterio')?.value;
      const transactionId = modal.querySelector('#rateio-transacao')?.value;
      const selected = Array.from(modal.querySelectorAll('input[name="rateio-project"]:checked'));
      if (!transactionId || selected.length < 2) { showMessage('Selecione a despesa e pelo menos dois Projetos de Stand.', 'error'); return; }
      const alocacoes = selected.map((input) => ({ projetoStandId: input.value, valor: modal.querySelector(`input[name="valor-${input.value}"]`)?.value || '' }));
      const submit = modal.querySelector('button[type="submit"]');
      submit.disabled = true; submit.textContent = 'Confirmando...';
      try {
        await api('/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transacaoId, criterio: criterion, alocacoes, observacoes: modal.querySelector('#rateio-observacoes')?.value || '' }) });
        showMessage('Rateio aprovado e registrado com auditoria.'); close(); await load();
      } catch (error) { showMessage(error.message || 'Não foi possível criar o rateio.', 'error'); submit.disabled = false; submit.textContent = 'Confirmar Rateio'; }
    });
  }
  async function openDetail(id) {
    try {
      const data = await api(`/${encodeURIComponent(id)}`);
      const rows = (data.alocacoes || []).map((item) => `<tr><td class="px-3 py-2">${escapeHtml(item.projeto_nome || item.projeto_codigo || '-')}</td><td class="px-3 py-2">${escapeHtml(item.cliente_nome || '-')}</td><td class="px-3 py-2 text-right">${Number(item.percentual || 0).toFixed(2)}%</td><td class="px-3 py-2 text-right font-medium">${money(item.valor)}</td></tr>`).join('');
      document.getElementById('rateio-detail-modal')?.remove();
      document.body.insertAdjacentHTML('beforeend', `<div id="rateio-detail-modal" class="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/50 p-4" role="dialog" aria-modal="true"><div class="my-4 w-full max-w-3xl rounded-xl bg-white p-5 shadow-2xl md:p-6"><div class="flex items-start justify-between gap-4"><div><h3 class="text-lg font-semibold text-gray-900">Detalhes do Rateio</h3><p class="mt-1 text-sm text-gray-600">${escapeHtml(data.regra.evento_nome || '-')} · ${escapeHtml(data.regra.transacao_descricao || '-')}</p></div><button id="rateio-detail-close" type="button" class="text-xl text-gray-400 hover:text-gray-700" aria-label="Fechar">&times;</button></div><div class="mt-4 grid grid-cols-2 gap-3 text-sm"><div><span class="text-gray-500">Critério</span><p class="font-medium">${escapeHtml(criteriaLabel(data.regra.criterio))}</p></div><div><span class="text-gray-500">Valor de origem</span><p class="font-medium">${money(data.regra.valor_origem)}</p></div></div><div class="mt-5 overflow-x-auto"><table class="min-w-full text-sm"><thead class="border-b text-left text-xs uppercase text-gray-500"><tr><th class="px-3 py-2">Projeto</th><th class="px-3 py-2">Cliente / Lead</th><th class="px-3 py-2 text-right">Percentual</th><th class="px-3 py-2 text-right">Valor</th></tr></thead><tbody>${rows}</tbody></table></div><p class="mt-4 text-xs text-gray-500">Registrado por ${escapeHtml(data.regra.criado_por_nome || '-')} em ${escapeHtml(String(data.regra.created_at || '').slice(0, 19))}.</p></div></div>`);
      document.getElementById('rateio-detail-close')?.addEventListener('click', () => document.getElementById('rateio-detail-modal')?.remove());
    } catch (error) { showMessage(error.message || 'Não foi possível carregar os detalhes.', 'error'); }
  }
  function bind() {
    document.getElementById('rateio-new')?.addEventListener('click', openForm);
    document.getElementById('rateio-refresh')?.addEventListener('click', load);
    document.getElementById('rateio-evento-filter')?.addEventListener('change', (event) => { state.eventoId = event.target.value; load(); });
    document.querySelectorAll('.rateio-detail').forEach((button) => button.addEventListener('click', () => openDetail(button.dataset.id)));
    document.querySelectorAll('.rateio-delete').forEach((button) => button.addEventListener('click', async () => {
      if (!window.confirm('Desfazer este rateio? A despesa de origem será preservada e voltará a ficar disponível para novo rateio.')) return;
      try { await api(`/${encodeURIComponent(button.dataset.id)}`, { method: 'DELETE' }); showMessage('Rateio desfeito. A despesa original não foi alterada.'); await load(); } catch (error) { showMessage(error.message || 'Não foi possível desfazer o rateio.', 'error'); }
    }));
  }
  async function load() {
    state.loading = true;
    const container = document.getElementById('module-content');
    if (container) { container.innerHTML = render(); bind(); }
    try {
      const query = state.eventoId ? `?evento_id=${encodeURIComponent(state.eventoId)}` : '';
      const payload = await api(`/${query}`);
      state.items = Array.isArray(payload.data) ? payload.data : [];
    } catch (error) { state.items = []; showMessage(error.message || 'Não foi possível carregar os rateios.', 'error'); }
    finally { state.loading = false; const live = document.getElementById('module-content'); if (live) { live.innerHTML = render(); bind(); } }
  }
  window.RateiosModule = { render, load, openForm };
})();
