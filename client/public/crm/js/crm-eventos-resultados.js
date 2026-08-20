(function () {
  'use strict';

  const state = { eventoId: '', data: null, loading: false, saving: false };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const integer = (value) => Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  const currentUser = () => window.AuthSystem?.getCurrentUser?.() || window.AuthSystem?.currentUser || null;
  const canManage = () => ['admin', 'administrador', 'manager', 'gerente', 'gerencia', 'desenvolvedor', 'developer', 'financeiro'].includes(String(currentUser()?.role || '').toLowerCase());
  const authHeaders = () => { try { return window.AuthSystem?._getAuthHeaders?.() || {}; } catch { return {}; } };
  const api = async (path, options = {}) => {
    const response = await fetch(`/api/crm/eventos-resultados${path}`, {
      credentials: 'include',
      ...options,
      headers: { ...authHeaders(), ...(options.headers || {}) },
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('Sua sessão expirou. Faça login novamente.');
    if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar o resultado do Evento.');
    return payload;
  };
  const showMessage = (message, type = 'success') => { if (window.Toast?.show) window.Toast.show(message, type); else window.alert(message); };
  const events = () => Array.isArray(window.ModuleSystem?.data?.eventos) ? window.ModuleSystem.data.eventos : [];
  const eventOptions = () => `<option value="">Selecione um Evento...</option>${events().map((event) => `<option value="${event.id}" ${String(state.eventoId) === String(event.id) ? 'selected' : ''}>${escapeHtml(event.nome || `Evento #${event.id}`)}</option>`).join('')}`;
  const statusOptions = (selected) => [
    ['planejamento', 'Planejamento'], ['em_andamento', 'Em andamento'], ['pos_evento', 'Pós-evento'], ['encerrado', 'Encerrado'],
  ].map(([value, label]) => `<option value="${value}" ${String(selected || 'planejamento') === value ? 'selected' : ''}>${label}</option>`).join('');
  const ratio = (actual, target) => target > 0 ? Math.min(100, (Number(actual || 0) / Number(target || 0)) * 100) : 0;
  const progress = (actual, target, unit = '') => {
    const targetText = target > 0 ? `de ${unit === 'R$' ? money(target) : integer(target)}` : 'sem meta definida';
    const actualText = unit === 'R$' ? money(actual) : integer(actual);
    return `<div class="mt-3"><div class="flex items-baseline justify-between gap-3 text-sm"><span class="font-semibold text-slate-900">${actualText}</span><span class="text-xs text-slate-500">${targetText}</span></div><div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full bg-indigo-600" style="width:${ratio(actual, target)}%"></div></div></div>`;
  };
  const metric = (title, actual, target, icon, color, unit = '') => `<article class="rounded-xl border border-slate-200 bg-white p-4"><div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${color}"><i class="${icon}"></i>${title}</div>${progress(actual, target, unit)}</article>`;
  const sourceNote = () => '<p class="mt-4 text-xs leading-5 text-slate-500">A captação é calculada pelos leads com Evento de interesse correspondente; pipeline por oportunidades do Evento; receitas, custos e rateios pelas vinculações financeiras já existentes. O painel não cria nem altera lançamentos financeiros.</p>';

  function renderForm(data) {
    if (!canManage()) return '';
    const metas = data.metas || {};
    return `<section class="rounded-xl border border-slate-200 bg-white p-4 md:p-6" aria-label="Metas e fechamento pós-evento">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h4 class="text-base font-semibold text-slate-900"><i class="fas fa-bullseye mr-2 text-indigo-600"></i>Metas e fechamento</h4><p class="mt-1 text-sm text-slate-600">Defina metas antes da feira e registre aprendizados após a execução. A revisão não altera fontes financeiras nem comerciais.</p></div><span class="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">${escapeHtml(String(metas.status || 'planejamento').replace('_', ' '))}</span></div>
      <form id="evento-resultado-form" class="mt-5 space-y-5">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label class="block text-sm font-medium text-slate-700">Status<select name="status" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">${statusOptions(metas.status)}</select></label>
          <label class="block text-sm font-medium text-slate-700">Meta de reuniões<input type="number" min="0" max="100000000" name="metaReunioes" value="${integer(metas.meta_reunioes)}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"></label>
          <label class="block text-sm font-medium text-slate-700">Reuniões realizadas<input type="number" min="0" max="100000000" name="reunioesRealizadas" value="${integer(metas.reunioes_realizadas)}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"></label>
          <label class="block text-sm font-medium text-slate-700">Meta de leads<input type="number" min="0" max="100000000" name="metaLeads" value="${integer(metas.meta_leads)}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"></label>
          <label class="block text-sm font-medium text-slate-700">Meta de propostas<input type="number" min="0" max="100000000" name="metaPropostas" value="${integer(metas.meta_propostas)}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"></label>
          <label class="block text-sm font-medium text-slate-700">Meta de receita (R$)<input inputmode="decimal" name="metaReceita" value="${Number(metas.meta_receita || 0).toFixed(2).replace('.', ',')}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"></label>
          <label class="block text-sm font-medium text-slate-700 md:col-span-2">Objetivo comercial<input maxlength="255" name="objetivoComercial" value="${escapeHtml(metas.objetivo_comercial)}" placeholder="Ex.: gerar reuniões com decisores de compras" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"></label>
        </div>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label class="block text-sm font-medium text-slate-700">Resumo pós-evento<textarea name="resumoPosEvento" rows="4" maxlength="10000" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">${escapeHtml(metas.resumo_pos_evento)}</textarea></label>
          <label class="block text-sm font-medium text-slate-700">Aprendizados<textarea name="aprendizados" rows="4" maxlength="10000" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">${escapeHtml(metas.aprendizados)}</textarea></label>
          <label class="block text-sm font-medium text-slate-700">Próximas ações e follow-up<textarea name="acoesFollowUp" rows="4" maxlength="10000" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">${escapeHtml(metas.acoes_follow_up)}</textarea></label>
        </div>
        <div class="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between"><p class="text-xs text-slate-500">Ao encerrar, registre um resumo e as ações de continuidade. Todas as mudanças ficam na auditoria.</p><button type="submit" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">Salvar metas e fechamento</button></div>
      </form>
    </section>`;
  }

  function render() {
    const data = state.data;
    if (!state.eventoId || !data) {
      return `<section class="space-y-5" aria-label="Resultado do Evento"><div class="rounded-xl bg-gradient-to-br from-slate-950 to-indigo-950 p-5 text-white md:p-7"><p class="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">Indicadores por feira</p><h3 class="mt-2 text-2xl font-semibold">Resultado do Evento</h3><p class="mt-2 max-w-2xl text-sm leading-6 text-slate-200">Consolide meta, captação, pipeline, receitas, custos e aprendizados de uma feira sem alterar os registros de origem.</p><label class="mt-5 block max-w-2xl text-sm font-medium text-white">Evento<select id="evento-resultado-evento" class="mt-2 w-full rounded-lg border border-white/20 bg-white px-3 py-3 text-sm text-slate-900">${eventOptions()}</select></label></div>${state.loading ? '<div class="rounded-xl bg-white p-8 text-center text-sm text-slate-500"><i class="fas fa-spinner fa-spin mr-2"></i>Consolidando indicadores do Evento...</div>' : '<div class="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">Selecione uma feira para abrir o painel de resultado.</div>'}</section>`;
    }
    const i = data.indicadores || {}; const f = i.financeiro || {}; const p = i.projetos || {}; const o = i.oportunidades || {}; const l = i.leads || {}; const metas = data.metas || {}; const rf = data.resultado_financeiro || {}; const marginClass = Number(rf.margem_evento || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700';
    return `<section class="space-y-5" aria-label="Resultado do Evento">
      <div class="rounded-xl bg-gradient-to-br from-slate-950 to-indigo-950 p-5 text-white md:p-7"><div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p class="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">Indicadores por feira</p><h3 class="mt-2 text-2xl font-semibold">${escapeHtml(data.evento?.nome || 'Resultado do Evento')}</h3><p class="mt-2 max-w-2xl text-sm leading-6 text-slate-200">Metas, captação, pipeline, receitas, custos e revisão pós-evento em uma leitura única.</p></div><label class="block w-full text-sm font-medium text-white lg:max-w-sm">Trocar Evento<select id="evento-resultado-evento" class="mt-2 w-full rounded-lg border border-white/20 bg-white px-3 py-2 text-sm text-slate-900">${eventOptions()}</select></label></div></div>
      ${state.loading ? '<div class="rounded-xl bg-white p-8 text-center text-sm text-slate-500"><i class="fas fa-spinner fa-spin mr-2"></i>Atualizando indicadores...</div>' : `<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">${metric('Reuniões realizadas', metas.reunioes_realizadas, metas.meta_reunioes, 'fas fa-handshake', 'text-indigo-700')}${metric('Leads do Evento', l.total, metas.meta_leads, 'fas fa-user-plus', 'text-sky-700')}${metric('Propostas e pipeline', o.propostas, metas.meta_propostas, 'fas fa-file-signature', 'text-violet-700')}${metric('Receita faturada', f.receita_faturada, metas.meta_receita, 'fas fa-chart-line', 'text-emerald-700', 'R$')}</div>
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3"><article class="rounded-xl border border-slate-200 bg-white p-5"><p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Pipeline aberto</p><p class="mt-2 text-2xl font-bold text-indigo-700">${money(o.valor_em_aberto)}</p><p class="mt-2 text-sm text-slate-600">${integer(o.total)} oportunidade(s) vinculada(s) ao Evento.</p></article><article class="rounded-xl border border-slate-200 bg-white p-5"><p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Custo do Evento</p><p class="mt-2 text-2xl font-bold text-rose-700">${money(f.custo_evento)}</p><p class="mt-2 text-sm text-slate-600">${integer(p.total)} Projeto(s) de Stand; ${integer(p.perdidos)} oportunidade(s) perdida(s).</p></article><article class="rounded-xl border border-slate-200 bg-white p-5"><p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Margem do Evento</p><p class="mt-2 text-2xl font-bold ${marginClass}">${money(rf.margem_evento)}</p><p class="mt-2 text-sm text-slate-600">${rf.margem_evento_percentual == null ? 'Sem receita faturada para percentual.' : `${Number(rf.margem_evento_percentual).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% sobre a receita faturada.`}</p></article></div>
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2"><article class="rounded-xl border border-slate-200 bg-white p-5"><h4 class="font-semibold text-slate-900">Leitura comercial</h4><dl class="mt-4 divide-y divide-slate-100 text-sm"><div class="flex justify-between gap-4 py-3"><dt class="text-slate-600">Leads em proposta / negociação</dt><dd class="font-semibold text-slate-900">${integer(l.em_proposta)}</dd></div><div class="flex justify-between gap-4 py-3"><dt class="text-slate-600">Leads convertidos</dt><dd class="font-semibold text-slate-900">${integer(l.ganhos)}</dd></div><div class="flex justify-between gap-4 py-3"><dt class="text-slate-600">Valor de oportunidades ganhas</dt><dd class="font-semibold text-emerald-700">${money(o.valor_ganho)}</dd></div><div class="flex justify-between gap-4 py-3"><dt class="text-slate-600">Projetos de Stand concluídos</dt><dd class="font-semibold text-slate-900">${integer(p.concluidos)}</dd></div></dl></article><article class="rounded-xl border border-slate-200 bg-white p-5"><h4 class="font-semibold text-slate-900">Leitura financeira</h4><dl class="mt-4 divide-y divide-slate-100 text-sm"><div class="flex justify-between gap-4 py-3"><dt class="text-slate-600">Receita recebida</dt><dd class="font-semibold text-emerald-700">${money(f.receita_recebida)}</dd></div><div class="flex justify-between gap-4 py-3"><dt class="text-slate-600">Valor em aberto</dt><dd class="font-semibold text-amber-700">${money(rf.valor_em_aberto)}</dd></div><div class="flex justify-between gap-4 py-3"><dt class="text-slate-600">Custos rateados entre stands</dt><dd class="font-semibold text-slate-900">${money(f.custos_rateados_em_stands)}</dd></div><div class="flex justify-between gap-4 py-3"><dt class="text-slate-600">Custo de projetos perdidos</dt><dd class="font-semibold text-rose-700">${money(i.custos_perdidos?.custo_projetos_perdidos)}</dd></div></dl></article></div>${renderForm(data)}${sourceNote()}`}</section>`;
  }

  function bind() {
    document.getElementById('evento-resultado-evento')?.addEventListener('change', (event) => { state.eventoId = event.target.value; state.data = null; load(); });
    document.getElementById('evento-resultado-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!state.eventoId || state.saving) return;
      const form = event.currentTarget; const submit = form.querySelector('button[type="submit"]');
      const payload = Object.fromEntries(new FormData(form).entries()); state.saving = true; submit.disabled = true; submit.textContent = 'Salvando...';
      try { await api(`/${encodeURIComponent(state.eventoId)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); showMessage('Metas e fechamento do Evento atualizados.'); await load(); }
      catch (error) { showMessage(error.message || 'Não foi possível salvar o resultado do Evento.', 'error'); submit.disabled = false; submit.textContent = 'Salvar metas e fechamento'; }
      finally { state.saving = false; }
    });
  }
  async function load() {
    state.loading = true; const container = document.getElementById('module-content'); if (container) { container.innerHTML = render(); bind(); }
    try { state.data = state.eventoId ? await api(`/${encodeURIComponent(state.eventoId)}`) : null; }
    catch (error) { state.data = null; showMessage(error.message || 'Não foi possível carregar o Resultado do Evento.', 'error'); }
    finally { state.loading = false; const live = document.getElementById('module-content'); if (live) { live.innerHTML = render(); bind(); } }
  }
  window.EventosResultadosModule = { render, load, getData: () => state.data };
})();
