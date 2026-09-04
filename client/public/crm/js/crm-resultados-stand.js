/* Resultado por Stand — apuração financeira somente de leitura a partir de lotes confirmados. */
(function () {
  'use strict';

  const state = { data: [], summary: { receitas: 0, despesas_diretas: 0, custos_rateados: 0, margem: 0 }, rateios: null, total: 0, loading: false, error: '', filters: { eventoId: '', clienteId: '', centroCusto: '', dataInicio: '', dataFim: '' } };
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const date = (value) => {
    const raw = String(value || '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw.slice(8, 10)}/${raw.slice(5, 7)}/${raw.slice(0, 4)}` : '—';
  };
  const headers = () => { try { return window.AuthSystem?._getAuthHeaders?.() || {}; } catch { return {}; } };
  const events = () => Array.isArray(window.ModuleSystem?.data?.eventos) ? window.ModuleSystem.data.eventos : [];
  const clients = () => Array.isArray(window.ModuleSystem?.data?.clientes) ? window.ModuleSystem.data.clientes : [];
  const clientName = (client) => client?.nome || client?.razao_social || client?.empresa || `Cliente #${client?.id || ''}`;
  const message = (text, type = 'success') => window.ModuleSystem?.showNotification?.(text, type) || window.alert(text);

  async function api(params) {
    const response = await fetch(`/api/crm/financeiro/resultados-stand?${params.toString()}`, { credentials: 'include', headers: headers() });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('Sua sessão expirou. Faça login novamente.');
    if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar o Resultado por Stand.');
    return payload;
  }
  function eventOptions(selected) {
    return `<option value="">Todos os eventos</option>${events().map((item) => `<option value="${esc(item.id)}" ${String(selected) === String(item.id) ? 'selected' : ''}>${esc(item.nome || `Evento #${item.id}`)}</option>`).join('')}`;
  }
  function clientOptions(selected) {
    return `<option value="">Todos os clientes</option>${clients().map((item) => `<option value="${esc(item.id)}" ${String(selected) === String(item.id) ? 'selected' : ''}>${esc(clientName(item))}</option>`).join('')}`;
  }
  function marginClass(value) { return Number(value || 0) >= 0 ? 'text-indigo-900 bg-indigo-50' : 'text-rose-900 bg-rose-50'; }
  function row(item) {
    const advanced = item.projeto_stand_id ? `<button type="button" data-resultados-stand-action="detalhes-avancados" data-projeto-id="${esc(item.projeto_stand_id)}" class="rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-800 hover:bg-violet-100"><i class="fas fa-layer-group mr-1"></i>Detalhes avançados</button>` : '';
    const projectNote = item.projeto_ambiguous ? '<span class="mt-1 block text-xs text-amber-700">Mais de um Projeto de Stand corresponde a esta chave; detalhe avançado indisponível.</span>' : (item.projeto_stand_nome ? `<span class="mt-1 block text-xs text-violet-700">Projeto: ${esc(item.projeto_stand_nome)}</span>` : '<span class="mt-1 block text-xs text-slate-500">Sem Projeto de Stand — apuração pelo lote confirmado.</span>');
    return `<tr class="hover:bg-slate-50"><td class="px-4 py-3 text-sm text-slate-700">${esc(item.evento_nome || '—')}</td><td class="px-4 py-3"><p class="font-semibold text-slate-900">${esc(item.cliente_nome || '—')}</p><p class="mt-1 text-sm text-slate-600">${esc(item.identificacao_stand || 'Stand sem identificação')}</p><p class="mt-1 text-xs text-slate-500">${esc(item.centro_custo || 'Centro de custo não informado')} · confirmado em ${esc(date(item.confirmado_em))}</p>${projectNote}</td><td class="px-4 py-3 text-right text-sm font-bold text-emerald-700">${money(item.receita)}</td><td class="px-4 py-3 text-right text-sm font-bold text-rose-700">${money(item.despesa_direta)}</td><td class="px-4 py-3 text-right text-sm font-bold text-orange-700">${money(item.custo_rateado)}</td><td class="px-4 py-3 text-right text-sm font-extrabold ${Number(item.margem || 0) >= 0 ? 'text-indigo-800' : 'text-rose-800'}">${money(item.margem)}<span class="mt-1 block text-xs font-medium text-slate-500">${item.margem_percentual == null ? 'Sem percentual' : `${Number(item.margem_percentual).toFixed(1)}%`}</span></td><td class="px-4 py-3 text-right">${advanced}</td></tr>`;
  }
  function mobileCard(item) {
    const advanced = item.projeto_stand_id ? `<button type="button" data-resultados-stand-action="detalhes-avancados" data-projeto-id="${esc(item.projeto_stand_id)}" class="mt-4 w-full rounded-lg border border-violet-300 bg-violet-50 px-3 py-2.5 text-sm font-bold text-violet-800 hover:bg-violet-100"><i class="fas fa-layer-group mr-1"></i>Detalhes avançados</button>` : '';
    return `<article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p class="text-xs font-bold uppercase tracking-wide text-slate-500">${esc(item.evento_nome || 'Evento')}</p><h5 class="mt-1 text-base font-extrabold text-slate-900">${esc(item.cliente_nome || 'Cliente')}</h5><p class="mt-1 text-sm text-slate-700">${esc(item.identificacao_stand || 'Stand sem identificação')}</p><p class="mt-1 text-xs text-slate-500">${esc(item.centro_custo || 'Centro de custo não informado')}</p><dl class="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm"><div><dt class="text-xs font-bold text-emerald-700">Receita</dt><dd class="mt-1 font-extrabold text-emerald-800">${money(item.receita)}</dd></div><div><dt class="text-xs font-bold text-rose-700">Despesa direta</dt><dd class="mt-1 font-extrabold text-rose-800">${money(item.despesa_direta)}</dd></div><div><dt class="text-xs font-bold text-orange-700">Rateio</dt><dd class="mt-1 font-extrabold text-orange-800">${money(item.custo_rateado)}</dd></div><div><dt class="text-xs font-bold text-indigo-700">Margem</dt><dd class="mt-1 font-extrabold ${Number(item.margem || 0) >= 0 ? 'text-indigo-800' : 'text-rose-800'}">${money(item.margem)}</dd></div></dl>${advanced}</article>`;
  }
  function render() {
    const summary = state.summary || {};
    const rateioNote = state.rateios && !state.rateios.disponivel ? `<div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"><i class="fas fa-info-circle mr-2"></i><strong>Rateios não incluídos nesta etapa.</strong> ${esc(state.rateios.motivo || '')}</div>` : '';
    const body = state.loading ? '<tr><td colspan="7" class="px-4 py-10 text-center text-sm text-slate-500"><i class="fas fa-spinner fa-spin mr-2"></i>Apurando os lotes confirmados...</td></tr>' : state.data.length ? state.data.map(row).join('') : `<tr><td colspan="7" class="px-4 py-10 text-center text-sm text-slate-500">Nenhum lote confirmado corresponde aos filtros selecionados.</td></tr>`;
    return `<section class="space-y-5" aria-label="Resultado por Stand financeiro">
      <div class="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-white p-5 shadow-sm sm:p-6"><div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div class="max-w-3xl"><p class="text-xs font-extrabold uppercase tracking-wide text-indigo-700">Financeiro · leitura consolidada</p><h3 class="mt-1 text-2xl font-extrabold text-slate-950">Resultado por Stand</h3><p class="mt-2 text-sm leading-6 text-slate-700">Apuração por cliente, evento e centro de custo, iniciada apenas em lotes confirmados. O Projeto de Stand é opcional e permanece como detalhe avançado.</p></div><span class="shrink-0 rounded-full bg-indigo-700 px-3 py-1.5 text-xs font-bold text-white">Somente leitura</span></div><div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"><label class="text-sm font-semibold text-slate-700">Evento<select data-resultados-stand-filter="eventoId" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">${eventOptions(state.filters.eventoId)}</select></label><label class="text-sm font-semibold text-slate-700">Cliente<select data-resultados-stand-filter="clienteId" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">${clientOptions(state.filters.clienteId)}</select></label><label class="text-sm font-semibold text-slate-700">Centro de custo ou stand<input data-resultados-stand-filter="centroCusto" value="${esc(state.filters.centroCusto)}" type="search" placeholder="Buscar na referência" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></label><label class="text-sm font-semibold text-slate-700">Confirmado a partir de<input data-resultados-stand-filter="dataInicio" value="${esc(state.filters.dataInicio)}" type="date" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></label><label class="text-sm font-semibold text-slate-700">Confirmado até<input data-resultados-stand-filter="dataFim" value="${esc(state.filters.dataFim)}" type="date" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></label></div><div class="mt-4 flex justify-end"><button type="button" data-resultados-stand-action="atualizar" class="w-full rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-800 focus:outline-none focus:ring-4 focus:ring-indigo-200 sm:w-auto"><i class="fas fa-sync-alt mr-2"></i>Atualizar resultado</button></div></div>
      ${rateioNote}
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"><div class="rounded-xl bg-emerald-50 p-4"><p class="text-xs font-bold uppercase tracking-wide text-emerald-700">Receitas</p><p class="mt-1 text-2xl font-extrabold text-emerald-900">${money(summary.receitas)}</p></div><div class="rounded-xl bg-rose-50 p-4"><p class="text-xs font-bold uppercase tracking-wide text-rose-700">Despesas diretas</p><p class="mt-1 text-2xl font-extrabold text-rose-900">${money(summary.despesas_diretas)}</p></div><div class="rounded-xl bg-orange-50 p-4"><p class="text-xs font-bold uppercase tracking-wide text-orange-700">Custos rateados</p><p class="mt-1 text-2xl font-extrabold text-orange-900">${money(summary.custos_rateados)}</p></div><div class="rounded-xl p-4 ${marginClass(summary.margem)}"><p class="text-xs font-bold uppercase tracking-wide">Margem</p><p class="mt-1 text-2xl font-extrabold">${money(summary.margem)}</p></div></div>
      <div class="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block"><table class="min-w-full divide-y divide-slate-200"><thead class="bg-slate-50"><tr><th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Evento</th><th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Cliente / Stand</th><th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Receita</th><th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Despesa</th><th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Rateio</th><th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Margem</th><th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Detalhes</th></tr></thead><tbody class="divide-y divide-slate-100">${body}</tbody></table></div>
      <div class="space-y-3 md:hidden">${state.loading ? '<p class="rounded-xl bg-white p-6 text-center text-sm text-slate-500"><i class="fas fa-spinner fa-spin mr-2"></i>Apurando os lotes confirmados...</p>' : state.data.length ? state.data.map(mobileCard).join('') : '<p class="rounded-xl bg-white p-6 text-center text-sm text-slate-500">Nenhum lote confirmado corresponde aos filtros selecionados.</p>'}</div>
      <p class="text-xs leading-5 text-slate-500">${state.total} resultado(s) encontrado(s). Lotes em rascunho e lançamentos cancelados não compõem esta apuração.</p>
    </section>`;
  }
  function bind() {
    document.querySelectorAll('[data-resultados-stand-filter]').forEach((input) => input.addEventListener(input.type === 'search' ? 'input' : 'change', (event) => { state.filters[event.target.dataset.resultadosStandFilter] = event.target.value; if (event.target.type !== 'search') load(); }));
    document.querySelector('[data-resultados-stand-action="atualizar"]')?.addEventListener('click', () => load());
    document.querySelectorAll('[data-resultados-stand-action="detalhes-avancados"]').forEach((button) => button.addEventListener('click', () => {
      const projectId = button.dataset.projetoId;
      if (!projectId || !window.ProjetosStandFechamentoModule?.openGuide) return message('O detalhe avançado não está disponível neste momento.', 'error');
      window.ProjetosStandFechamentoModule.openGuide(projectId);
    }));
  }
  async function load() {
    if (state.loading) return;
    state.loading = true; state.error = '';
    const container = document.getElementById('module-content');
    if (container) { container.innerHTML = render(); bind(); }
    try {
      const params = new URLSearchParams({ limit: '100' });
      Object.entries(state.filters).forEach(([key, value]) => { if (value) params.set(({ eventoId: 'evento_id', clienteId: 'cliente_id', centroCusto: 'centro_custo', dataInicio: 'data_inicio', dataFim: 'data_fim' }[key] || key), value); });
      const payload = await api(params);
      state.data = Array.isArray(payload.data) ? payload.data : [];
      state.summary = payload.resumo || state.summary;
      state.rateios = payload.rateios || null;
      state.total = Number(payload.total || state.data.length);
    } catch (error) {
      state.data = []; state.total = 0; state.error = error?.message || 'Não foi possível carregar o Resultado por Stand.';
      message(state.error, 'error');
    } finally {
      state.loading = false;
      const live = document.getElementById('module-content');
      if (live) { live.innerHTML = render(); bind(); }
    }
  }
  window.ResultadosStandModule = { render, load };
})();
