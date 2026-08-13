/* Projeto de Stand — unidade de apuração financeira por evento e cliente. */
(function () {
  'use strict';

  const state = { items: [], oportunidades: [], loading: false, filters: { eventoId: '', clienteId: '', leadId: '', situacaoComercial: '' } };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const statusLabel = (status) => ({ planejado: 'Planejado', em_orcamento: 'Em orçamento', contratado: 'Contratado', em_producao: 'Em produção', em_montagem: 'Em montagem', concluido: 'Concluído', cancelado: 'Cancelado' }[String(status || '').toLowerCase()] || status || '-');
  const statusClass = (status) => ({ planejado: 'bg-slate-100 text-slate-700', em_orcamento: 'bg-amber-100 text-amber-800', contratado: 'bg-blue-100 text-blue-800', em_producao: 'bg-purple-100 text-purple-800', em_montagem: 'bg-orange-100 text-orange-800', concluido: 'bg-green-100 text-green-800', cancelado: 'bg-gray-200 text-gray-700' }[String(status || '').toLowerCase()] || 'bg-gray-100 text-gray-700');
  const currentUser = () => window.AuthSystem?.getCurrentUser?.() || window.AuthSystem?.currentUser || null;
  const canManage = () => {
    const role = String(currentUser()?.role || '').toLowerCase();
    return ['admin', 'administrador', 'manager', 'gerente', 'gerencia', 'desenvolvedor', 'developer', 'financeiro'].includes(role);
  };
  const authHeaders = () => {
    try { return window.AuthSystem?._getAuthHeaders?.() || {}; } catch { return {}; }
  };
  const api = async (path, options = {}) => {
    const response = await fetch(`/api/crm/projetos-stand${path}`, {
      credentials: 'include',
      ...options,
      headers: { ...authHeaders(), ...(options.headers || {}) },
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('Sua sessão expirou. Faça login novamente.');
    if (!response.ok) throw new Error(payload.error || 'Não foi possível concluir a operação.');
    return payload;
  };
  const events = () => Array.isArray(window.ModuleSystem?.data?.eventos) ? window.ModuleSystem.data.eventos : [];
  const clients = () => Array.isArray(window.ModuleSystem?.data?.clientes) ? window.ModuleSystem.data.clientes : [];
  const leads = () => Array.isArray(window.ModuleSystem?.data?.leads) ? window.ModuleSystem.data.leads : [];
  const projectFromId = (id) => state.items.find((item) => String(item.id) === String(id)) || null;
  const statusOptions = (selected = 'planejado') => ['planejado', 'em_orcamento', 'contratado', 'em_producao', 'em_montagem', 'concluido', 'cancelado']
    .map((status) => `<option value="${status}" ${String(selected) === status ? 'selected' : ''}>${statusLabel(status)}</option>`).join('');
  const eventOptions = (selected = '', includeAny = true) => `${includeAny ? '<option value="">Todos os eventos</option>' : '<option value="">Selecione o evento...</option>'}${events().map((event) => `<option value="${event.id}" ${String(selected) === String(event.id) ? 'selected' : ''}>${escapeHtml(event.nome || `Evento #${event.id}`)}</option>`).join('')}`;
  const commercialLabel = (status) => ({ prospecto: 'Prospecto', em_negociacao: 'Em negociação', ganho: 'Ganho', perdido: 'Perdido', cancelado: 'Cancelado' }[String(status || '').toLowerCase()] || status || '-');
  const commercialClass = (status) => ({ prospecto: 'bg-slate-100 text-slate-700', em_negociacao: 'bg-amber-100 text-amber-800', ganho: 'bg-emerald-100 text-emerald-800', perdido: 'bg-rose-100 text-rose-800', cancelado: 'bg-gray-200 text-gray-700' }[String(status || '').toLowerCase()] || 'bg-gray-100 text-gray-700');
  const commercialOptions = (selected = 'prospecto', includeAny = false) => `${includeAny ? '<option value="">Todas as situações</option>' : ''}${['prospecto', 'em_negociacao', 'ganho', 'perdido', 'cancelado'].map((status) => `<option value="${status}" ${String(selected) === status ? 'selected' : ''}>${commercialLabel(status)}</option>`).join('')}`;
  const leadOptions = (selected = '', includeAny = true) => `${includeAny ? '<option value="">Todos os leads</option>' : '<option value="">Selecione o lead potencial...</option>'}${leads().map((lead) => `<option value="${lead.id}" ${String(selected) === String(lead.id) ? 'selected' : ''}>${escapeHtml(lead.nome || `Lead #${lead.id}`)}</option>`).join('')}`;
  const opportunityOptions = (selected = '', includeAny = true) => `${includeAny ? '<option value="">Nenhuma oportunidade específica</option>' : '<option value="">Selecione a oportunidade...</option>'}${state.oportunidades.map((opportunity) => `<option value="${opportunity.id}" ${String(selected) === String(opportunity.id) ? 'selected' : ''}>#${opportunity.id} — ${escapeHtml(opportunity.lead_nome || 'Lead')} · ${escapeHtml(opportunity.etapa || 'sem etapa')}</option>`).join('')}`;
  const clientOptions = (selected = '', includeAny = true, onlyForSelectedEvent = false) => {
    const ids = onlyForSelectedEvent && state.filters.eventoId
      ? new Set(state.items.map((item) => String(item.cliente_id ?? item.clienteId)))
      : null;
    const available = ids ? clients().filter((client) => ids.has(String(client.id))) : clients();
    return `${includeAny ? '<option value="">Todos os clientes</option>' : '<option value="">Selecione o cliente...</option>'}${available.map((client) => `<option value="${client.id}" ${String(selected) === String(client.id) ? 'selected' : ''}>${escapeHtml(client.nome || client.razao_social || client.empresa || `Cliente #${client.id}`)}</option>`).join('')}`;
  };

  function render() {
    const manage = canManage();
    const cards = state.items.reduce((acc, item) => {
      acc.receitas += Number(item.receitas_previstas || 0);
      acc.custos += Number(item.custos_diretos || 0);
      return acc;
    }, { receitas: 0, custos: 0 });
    const margem = cards.receitas - cards.custos;
    return `
      <section class="space-y-5" aria-label="Resultado por stand">
        <div class="bg-white rounded-lg shadow p-4 md:p-6">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 class="text-xl font-semibold text-gray-800"><i class="fas fa-store mr-2 text-indigo-600"></i>Resultado por Stand</h3>
              <p class="mt-1 text-sm text-gray-600">Apure custos diretos e receitas por cliente ou lead potencial dentro de cada feira.</p>
            </div>
            ${manage ? '<button id="projeto-stand-new" type="button" class="inline-flex justify-center items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"><i class="fas fa-plus mr-2"></i>Novo Projeto de Stand</button>' : ''}
          </div>
          <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label class="block text-sm font-medium text-gray-700">Evento
              <select id="projeto-stand-evento-filter" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">${eventOptions(state.filters.eventoId)}</select>
            </label>
            <label class="block text-sm font-medium text-gray-700">Cliente
              <select id="projeto-stand-cliente-filter" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">${clientOptions(state.filters.clienteId, true, true)}</select>
            </label>
            <label class="block text-sm font-medium text-gray-700">Lead potencial
              <select id="projeto-stand-lead-filter" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">${leadOptions(state.filters.leadId)}</select>
            </label>
            <label class="block text-sm font-medium text-gray-700">Situação comercial
              <select id="projeto-stand-situacao-filter" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">${commercialOptions(state.filters.situacaoComercial, true)}</select>
            </label>
            <div class="sm:col-span-2 lg:col-span-4 flex justify-end"><button id="projeto-stand-refresh" type="button" class="w-full sm:w-auto rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"><i class="fas fa-sync-alt mr-2"></i>Atualizar</button></div>
          </div>
        </div>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div class="rounded-lg bg-emerald-50 p-4"><p class="text-xs font-semibold uppercase tracking-wide text-emerald-700">Receitas previstas</p><p class="mt-1 text-2xl font-bold text-emerald-900">${money(cards.receitas)}</p></div>
          <div class="rounded-lg bg-rose-50 p-4"><p class="text-xs font-semibold uppercase tracking-wide text-rose-700">Custos diretos</p><p class="mt-1 text-2xl font-bold text-rose-900">${money(cards.custos)}</p></div>
          <div class="rounded-lg ${margem >= 0 ? 'bg-indigo-50' : 'bg-amber-50'} p-4"><p class="text-xs font-semibold uppercase tracking-wide text-indigo-700">Margem direta</p><p class="mt-1 text-2xl font-bold ${margem >= 0 ? 'text-indigo-900' : 'text-amber-900'}">${money(margem)}</p></div>
        </div>
        <div class="overflow-x-auto rounded-lg bg-white shadow">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50"><tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Evento</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Cliente / Stand</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Receita</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Custo direto</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Situação</th>
              ${manage ? '<th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Ações</th>' : ''}
            </tr></thead>
            <tbody id="projeto-stand-list" class="divide-y divide-gray-100">
              ${state.loading ? `<tr><td colspan="${manage ? 6 : 5}" class="px-4 py-8 text-center text-sm text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i>Carregando Projetos de Stand...</td></tr>` : state.items.length ? state.items.map((item) => `
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 text-sm text-gray-700">${escapeHtml(item.evento_nome || '-')}</td>
                  <td class="px-4 py-3"><div class="font-medium text-gray-900">${escapeHtml(item.cliente_nome || item.lead_nome || '-')}</div><div class="text-sm text-gray-500">${escapeHtml(item.nome || '-')} ${item.referencia_stand ? `· ${escapeHtml(item.referencia_stand)}` : ''}</div><div class="text-xs text-gray-400">${item.cliente_convertido_nome ? 'Cliente convertido' : 'Lead / cliente potencial'} · ${escapeHtml(item.codigo || '')}</div></td>
                  <td class="px-4 py-3 text-right text-sm font-medium text-emerald-700">${money(item.receitas_previstas)}</td>
                  <td class="px-4 py-3 text-right text-sm font-medium text-rose-700">${money(item.custos_diretos)}</td>
                  <td class="px-4 py-3"><div><span class="inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClass(item.status)}">${escapeHtml(statusLabel(item.status))}</span></div><div class="mt-1"><span class="inline-flex rounded-full px-2 py-1 text-xs font-semibold ${commercialClass(item.situacao_comercial)}">${escapeHtml(commercialLabel(item.situacao_comercial))}</span></div></td>
                  ${manage ? `<td class="px-4 py-3 text-right"><button type="button" class="projeto-stand-edit text-sm font-medium text-indigo-700 hover:text-indigo-900" data-id="${item.id}">Editar</button><button type="button" class="projeto-stand-delete ml-3 text-sm font-medium text-rose-700 hover:text-rose-900" data-id="${item.id}">Excluir</button></td>` : ''}
                </tr>`).join('') : `<tr><td colspan="${manage ? 6 : 5}" class="px-4 py-8 text-center text-sm text-gray-500">Nenhum Projeto de Stand encontrado. ${manage ? 'Crie o primeiro projeto para começar a vincular novos lançamentos.' : ''}</td></tr>`}
            </tbody>
          </table>
        </div>
        <p class="text-xs text-gray-500">A margem exibida considera receitas vinculadas menos custos diretos vinculados. Projetos perdidos permanecem visíveis para evidenciar o custo comercial da feira. Custos compartilhados e rateios serão incluídos em uma etapa posterior e auditável.</p>
      </section>`;
  }

  function formMarkup(project = null) {
    const item = project || {};
    return `<div id="projeto-stand-modal" class="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="projeto-stand-modal-title">
      <div class="my-4 w-full max-w-3xl rounded-xl bg-white shadow-2xl">
        <form id="projeto-stand-form" class="p-5 md:p-6">
          <div class="flex items-start justify-between gap-4"><div><h3 id="projeto-stand-modal-title" class="text-lg font-semibold text-gray-900">${item.id ? 'Editar' : 'Novo'} Projeto de Stand</h3><p class="mt-1 text-sm text-gray-600">Vincule o evento a um cliente convertido ou a um lead potencial. Custos podem existir mesmo sem venda fechada.</p></div><button type="button" id="projeto-stand-cancel" class="text-xl text-gray-400 hover:text-gray-700" aria-label="Fechar">&times;</button></div>
          <div class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label class="block text-sm font-medium text-gray-700">Evento *<select name="eventoId" required class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">${eventOptions(item.evento_id ?? item.eventoId, false)}</select></label>
            <label class="block text-sm font-medium text-gray-700">Cliente convertido (opcional)<select name="clienteId" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">${clientOptions(item.cliente_id ?? item.clienteId, false)}</select></label>
            <label class="block text-sm font-medium text-gray-700">Lead / cliente potencial (opcional)<select name="leadId" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">${leadOptions(item.lead_id ?? item.leadId, false)}</select><span class="mt-1 block text-xs font-normal text-gray-500">Informe cliente ou lead potencial.</span></label>
            <label class="block text-sm font-medium text-gray-700">Oportunidade (opcional)<select name="oportunidadeId" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">${opportunityOptions(item.oportunidade_id ?? item.oportunidadeId)}</select></label>
            <label class="block text-sm font-medium text-gray-700 md:col-span-2">Nome do Projeto / Stand *<input name="nome" required maxlength="255" value="${escapeHtml(item.nome)}" placeholder="Ex.: Stand 128 — Linha Industrial" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"></label>
            <label class="block text-sm font-medium text-gray-700">Código interno<input name="codigo" maxlength="60" value="${escapeHtml(item.codigo)}" placeholder="Gerado automaticamente se vazio" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"></label>
            <label class="block text-sm font-medium text-gray-700">Status<select name="status" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">${statusOptions(item.status || 'planejado')}</select></label>
            <label class="block text-sm font-medium text-gray-700">Situação comercial<select name="situacaoComercial" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">${commercialOptions(item.situacao_comercial || item.situacaoComercial || 'prospecto')}</select></label>
            <label class="block text-sm font-medium text-gray-700">Referência do stand<input name="referenciaStand" maxlength="120" value="${escapeHtml(item.referencia_stand)}" placeholder="Ex.: Stand 128" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"></label>
            <label class="block text-sm font-medium text-gray-700">Pavilhão<input name="pavilhao" maxlength="120" value="${escapeHtml(item.pavilhao)}" placeholder="Ex.: Pavilhão Azul" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"></label>
            <label class="block text-sm font-medium text-gray-700">Área (m²)<input name="areaM2" maxlength="30" value="${escapeHtml(item.area_m2)}" placeholder="Ex.: 48" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"></label>
            <label class="block text-sm font-medium text-gray-700">Centro de custo descritivo<input name="centroCusto" maxlength="150" value="${escapeHtml(item.centro_custo)}" placeholder="Ex.: FEBRATEX 2026 — Cliente X" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"></label>
            <label class="block text-sm font-medium text-gray-700 md:col-span-2">Observações<textarea name="observacoes" rows="3" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">${escapeHtml(item.observacoes)}</textarea></label>
          </div>
          <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button id="projeto-stand-cancel-bottom" type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancelar</button><button type="submit" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Salvar Projeto de Stand</button></div>
        </form>
      </div>
    </div>`;
  }
  function showMessage(message, type = 'success') {
    if (window.Toast?.show) window.Toast.show(message, type);
    else window.alert(message);
  }
  function openForm(project = null) {
    document.getElementById('projeto-stand-modal')?.remove();
    document.body.insertAdjacentHTML('beforeend', formMarkup(project));
    const modal = document.getElementById('projeto-stand-modal');
    const close = () => modal?.remove();
    modal?.querySelector('#projeto-stand-cancel')?.addEventListener('click', close);
    modal?.querySelector('#projeto-stand-cancel-bottom')?.addEventListener('click', close);
    modal?.addEventListener('click', (event) => { if (event.target === modal) close(); });
    modal?.querySelector('select[name="eventoId"]')?.addEventListener('change', () => {
      // O filtro final permanece no backend; aqui apenas limpa a seleção antiga de cliente quando o evento mudar.
      if (!project) modal.querySelector('select[name="clienteId"]').value = '';
    });
    modal?.querySelector('select[name="oportunidadeId"]')?.addEventListener('change', (event) => {
      const opportunity = state.oportunidades.find((item) => String(item.id) === String(event.target.value));
      if (!opportunity) return;
      const leadSelect = modal.querySelector('select[name="leadId"]');
      const eventSelect = modal.querySelector('select[name="eventoId"]');
      if (leadSelect && opportunity.lead_id) leadSelect.value = String(opportunity.lead_id);
      if (eventSelect && opportunity.evento_id) eventSelect.value = String(opportunity.evento_id);
    });
    modal?.querySelector('#projeto-stand-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const payload = Object.fromEntries(new FormData(form).entries());
      if (!payload.clienteId && !payload.leadId) {
        showMessage('Informe o cliente convertido ou o lead / cliente potencial.', 'error');
        return;
      }
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.textContent = 'Salvando...';
      try {
        await api(project?.id ? `/${encodeURIComponent(project.id)}` : '/', { method: project?.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        showMessage(project?.id ? 'Projeto de Stand atualizado.' : 'Projeto de Stand criado.');
        close();
        await load();
      } catch (error) {
        showMessage(error.message || 'Não foi possível salvar.', 'error');
        submit.disabled = false;
        submit.textContent = 'Salvar Projeto de Stand';
      }
    });
  }
  function bind() {
    document.getElementById('projeto-stand-new')?.addEventListener('click', () => openForm());
    document.getElementById('projeto-stand-refresh')?.addEventListener('click', () => load());
    document.getElementById('projeto-stand-evento-filter')?.addEventListener('change', (event) => { state.filters.eventoId = event.target.value; state.filters.clienteId = ''; load(); });
    document.getElementById('projeto-stand-cliente-filter')?.addEventListener('change', (event) => { state.filters.clienteId = event.target.value; load(); });
    document.getElementById('projeto-stand-lead-filter')?.addEventListener('change', (event) => { state.filters.leadId = event.target.value; load(); });
    document.getElementById('projeto-stand-situacao-filter')?.addEventListener('change', (event) => { state.filters.situacaoComercial = event.target.value; load(); });
    document.querySelectorAll('.projeto-stand-edit').forEach((button) => button.addEventListener('click', () => openForm(projectFromId(button.dataset.id))));
    document.querySelectorAll('.projeto-stand-delete').forEach((button) => button.addEventListener('click', async () => {
      const project = projectFromId(button.dataset.id);
      if (!project || !window.confirm(`Excluir o Projeto de Stand "${project.nome}"? Esta ação só é permitida quando não há lançamentos vinculados.`)) return;
      try { await api(`/${encodeURIComponent(project.id)}`, { method: 'DELETE' }); showMessage('Projeto de Stand excluído.'); await load(); }
      catch (error) { showMessage(error.message || 'Não foi possível excluir.', 'error'); }
    }));
  }
  async function sync() {
    try {
      const opportunitiesResponse = await fetch('/api/crm/oportunidades', { credentials: 'include', headers: authHeaders() });
      state.oportunidades = opportunitiesResponse.ok ? await opportunitiesResponse.json() : [];
    } catch { state.oportunidades = []; }
    const payload = await api('/?limit=100');
    state.items = Array.isArray(payload.data) ? payload.data : [];
    if (window.ModuleSystem?.data) {
      window.ModuleSystem.data.projetosStand = state.items.slice();
      try { window.ModuleSystem.saveData?.(); } catch {}
    }
    return state.items;
  }
  async function load() {
    state.loading = true;
    const container = document.getElementById('module-content');
    if (container) { container.innerHTML = render(); bind(); }
    try {
      const params = new URLSearchParams();
      if (state.filters.eventoId) params.set('evento_id', state.filters.eventoId);
      if (state.filters.clienteId) params.set('cliente_id', state.filters.clienteId);
      if (state.filters.leadId) params.set('lead_id', state.filters.leadId);
      if (state.filters.situacaoComercial) params.set('situacao_comercial', state.filters.situacaoComercial);
      params.set('limit', '100');
      const [payload, opportunitiesResponse] = await Promise.all([
        api(`/?${params.toString()}`),
        fetch('/api/crm/oportunidades', { credentials: 'include', headers: authHeaders() }),
      ]);
      state.oportunidades = opportunitiesResponse.ok ? await opportunitiesResponse.json() : [];
      state.items = Array.isArray(payload.data) ? payload.data : [];
      if (window.ModuleSystem?.data) {
        window.ModuleSystem.data.projetosStand = state.items.slice();
        try { window.ModuleSystem.saveData?.(); } catch {}
      }
    } catch (error) {
      state.items = [];
      showMessage(error.message || 'Não foi possível carregar Projetos de Stand.', 'error');
    } finally {
      state.loading = false;
      const live = document.getElementById('module-content');
      if (live) { live.innerHTML = render(); bind(); }
    }
  }
  window.ProjetosStandModule = { render, load, sync, openForm, getItems: () => state.items.slice() };
})();
