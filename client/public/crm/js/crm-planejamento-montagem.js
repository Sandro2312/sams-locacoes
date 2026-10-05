/* Planejamento e Execução de Montagem — operação auditável, sem lançamentos financeiros. */
(function () {
  'use strict';

  const state = {
    data: [], refs: { eventos: [], projetos: [], usuarios: [] }, loading: false, error: '',
    filters: { status: '', eventoId: '', busca: '' }, request: 0,
  };
  const statuses = {
    planejada: 'Planejada', confirmada: 'Confirmada', em_andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada',
  };
  const types = { montagem: 'Montagem', desmontagem: 'Desmontagem', manutencao: 'Manutenção' };
  const complexities = { baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' };
  const materialStatuses = { pendente: 'Pendente', separado: 'Separado', enviado: 'Enviado', devolvido: 'Devolvido' };
  const occurrenceTypes = { atraso: 'Atraso', material: 'Material', equipe: 'Equipe', logistica: 'Logística', qualidade: 'Qualidade', seguranca: 'Segurança', cliente: 'Cliente', outro: 'Outro' };

  const authHeaders = () => { try { return window.AuthSystem?._getAuthHeaders?.() || {}; } catch { return {}; } };
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const notify = (message, type = 'info') => {
    try {
      if (window.Toast?.show) return window.Toast.show(message, type);
      if (window.NotificationSystem?.[type]) return window.NotificationSystem[type](message);
      if (window.ModuleSystem?.showNotification) return window.ModuleSystem.showNotification(message, type);
    } catch {}
    window.alert(message);
  };
  const api = async (path, options = {}) => {
    const response = await fetch(`/api/crm/montagem-planejamento${path}`, {
      credentials: 'include', ...options,
      headers: { ...authHeaders(), ...(options.headers || {}) },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || `Falha na operação (${response.status})`);
    return payload;
  };
  const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const dateTime = (value) => {
    if (!value) return 'Não informado';
    const raw = String(value).replace('T', ' ').slice(0, 16);
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
    return match ? `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}` : raw;
  };
  const dateInput = (value) => value ? String(value).replace(' ', 'T').slice(0, 16) : '';
  const dateClass = (status) => ({ planejada: 'bg-slate-100 text-slate-700', confirmada: 'bg-blue-100 text-blue-800', em_andamento: 'bg-amber-100 text-amber-900', concluida: 'bg-emerald-100 text-emerald-800', cancelada: 'bg-rose-100 text-rose-800' }[status] || 'bg-slate-100 text-slate-700');
  const severityClass = (severity) => ({ baixa: 'bg-slate-100 text-slate-700', media: 'bg-amber-100 text-amber-900', alta: 'bg-orange-100 text-orange-900', critica: 'bg-rose-100 text-rose-800' }[severity] || 'bg-slate-100 text-slate-700');
  const selectOptions = (values, selected, blank = '') => `${blank ? `<option value="">${esc(blank)}</option>` : ''}${Object.entries(values).map(([value, label]) => `<option value="${value}" ${String(selected || '') === value ? 'selected' : ''}>${esc(label)}</option>`).join('')}`;
  const eventOptions = (selected, blank = 'Todos os eventos') => selectOptions(Object.fromEntries(state.refs.eventos.map((item) => [String(item.id), item.nome || `Evento #${item.id}`])), selected, blank);
  const projectOptions = (selected, eventId, blank = 'Sem Projeto de Stand') => {
    const projects = state.refs.projetos.filter((item) => !eventId || String(item.evento_id) === String(eventId));
    return `${blank ? `<option value="">${esc(blank)}</option>` : ''}${projects.map((item) => `<option value="${item.id}" ${String(selected || '') === String(item.id) ? 'selected' : ''}>${esc(`${item.codigo || ''} · ${item.nome || `Projeto #${item.id}`}`)}</option>`).join('')}`;
  };
  const userOptions = (selected, blank = 'Selecionar usuário') => `${blank ? `<option value="">${esc(blank)}</option>` : ''}${state.refs.usuarios.map((item) => `<option value="${item.id}" ${String(selected || '') === String(item.id) ? 'selected' : ''}>${esc(item.name || `Usuário #${item.id}`)}${item.role ? ` · ${esc(item.role)}` : ''}</option>`).join('')}`;
  const statusBadge = (status) => `<span class="inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${dateClass(status)}">${esc(statuses[status] || status || 'Planejada')}</span>`;

  function cards(summary) {
    return `<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p class="text-xs font-bold uppercase tracking-wide text-slate-500">Planos visíveis</p><p class="mt-1 text-2xl font-extrabold text-slate-900">${summary.total}</p></article>
      <article class="rounded-xl border border-amber-200 bg-amber-50 p-4"><p class="text-xs font-bold uppercase tracking-wide text-amber-800">Em execução</p><p class="mt-1 text-2xl font-extrabold text-amber-950">${summary.running}</p></article>
      <article class="rounded-xl border border-rose-200 bg-rose-50 p-4"><p class="text-xs font-bold uppercase tracking-wide text-rose-800">Ocorrências abertas</p><p class="mt-1 text-2xl font-extrabold text-rose-950">${summary.issues}</p></article>
      <article class="rounded-xl border border-violet-200 bg-violet-50 p-4"><p class="text-xs font-bold uppercase tracking-wide text-violet-800">Conflitos de equipe</p><p class="mt-1 text-2xl font-extrabold text-violet-950">${summary.conflicts}</p></article>
    </div>`;
  }

  function renderRow(item) {
    const readiness = item.materiais_total ? `${item.materiais_prontos}/${item.materiais_total}` : '—';
    return `<tr class="hover:bg-slate-50">
      <td class="px-4 py-3"><p class="font-bold text-slate-900">${esc(item.numero || 'OS')}</p><p class="mt-1 text-xs text-slate-500">${esc(types[item.tipo] || item.tipo || '')} · ${esc(complexities[item.complexidade] || item.complexidade || '')}</p></td>
      <td class="px-4 py-3"><p class="font-semibold text-slate-900">${esc(item.titulo || 'Sem título')}</p><p class="mt-1 text-xs text-slate-500">${esc(item.evento_nome || 'Evento não informado')}</p><p class="mt-1 text-xs text-slate-500">${esc(item.projeto_stand_nome || 'Sem Projeto de Stand')}</p></td>
      <td class="px-4 py-3 text-sm text-slate-700"><p>${esc(dateTime(item.data_inicio))}</p><p class="mt-1 text-xs text-slate-500">até ${esc(dateTime(item.data_fim))}</p></td>
      <td class="px-4 py-3 text-sm"><p class="font-semibold text-slate-800">Equipe: ${item.equipe_confirmada}/${item.equipe_total}</p><p class="mt-1 text-xs text-slate-500">Material: ${readiness}</p></td>
      <td class="px-4 py-3"><div class="flex flex-wrap gap-1">${statusBadge(item.status)}${Number(item.ocorrencias_abertas) ? `<span class="inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800">${item.ocorrencias_abertas} ocorrência(s)</span>` : ''}${Number(item.conflitos_equipe) ? `<span class="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-800">${item.conflitos_equipe} conflito(s)</span>` : ''}</div></td>
      <td class="px-4 py-3 text-right"><button type="button" data-montagem-action="detalhar" data-id="${item.id}" class="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-800 hover:bg-indigo-100 focus:outline-none focus:ring-4 focus:ring-indigo-200">Abrir</button></td>
    </tr>`;
  }
  function renderCard(item) {
    const readiness = item.materiais_total ? `${item.materiais_prontos}/${item.materiais_total}` : 'Sem materiais';
    return `<article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="flex items-start justify-between gap-3"><div><p class="text-xs font-bold uppercase tracking-wide text-slate-500">${esc(item.numero || 'OS')}</p><h4 class="mt-1 text-base font-extrabold text-slate-900">${esc(item.titulo || 'Sem título')}</h4></div>${statusBadge(item.status)}</div>
      <p class="mt-3 text-sm font-medium text-slate-700">${esc(item.evento_nome || 'Evento não informado')}</p><p class="mt-1 text-xs text-slate-500">${esc(item.projeto_stand_nome || 'Sem Projeto de Stand')}</p>
      <dl class="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm"><div><dt class="text-xs font-bold text-slate-500">Início</dt><dd class="mt-1 font-semibold text-slate-800">${esc(dateTime(item.data_inicio))}</dd></div><div><dt class="text-xs font-bold text-slate-500">Material</dt><dd class="mt-1 font-semibold text-slate-800">${esc(readiness)}</dd></div></dl>
      ${Number(item.ocorrencias_abertas) || Number(item.conflitos_equipe) ? `<p class="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">${Number(item.ocorrencias_abertas) ? `${item.ocorrencias_abertas} ocorrência(s) aberta(s)` : ''}${Number(item.ocorrencias_abertas) && Number(item.conflitos_equipe) ? ' · ' : ''}${Number(item.conflitos_equipe) ? `${item.conflitos_equipe} conflito(s) de equipe` : ''}</p>` : ''}
      <button type="button" data-montagem-action="detalhar" data-id="${item.id}" class="mt-4 w-full rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2.5 text-sm font-bold text-indigo-800 hover:bg-indigo-100 focus:outline-none focus:ring-4 focus:ring-indigo-200">Abrir plano</button>
    </article>`;
  }

  function agendaMarkup() {
    const keyFor = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      return { key: keyFor(date), label: date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }), today: index === 0 };
    });
    const scheduled = state.data.filter((item) => item.data_inicio && days.some((day) => day.key === String(item.data_inicio).slice(0, 10)));
    const withoutDate = state.data.filter((item) => !item.data_inicio && item.status !== 'cancelada');
    const slot = (item) => `<button type="button" data-montagem-action="detalhar" data-id="${item.id}" class="w-full rounded-lg border border-indigo-200 bg-indigo-50 p-2 text-left transition hover:border-indigo-400 hover:bg-indigo-100 focus:outline-none focus:ring-4 focus:ring-indigo-200"><p class="truncate text-xs font-extrabold text-indigo-950">${esc(item.numero || 'OS')} · ${esc(item.titulo || 'Plano')}</p><p class="mt-1 truncate text-[11px] text-indigo-800">${esc(item.evento_nome || 'Evento não informado')}</p>${Number(item.conflitos_equipe) ? '<p class="mt-1 text-[11px] font-bold text-violet-800">Conflito de equipe</p>' : ''}${Number(item.ocorrencias_abertas) ? `<p class="mt-1 text-[11px] font-bold text-rose-800">${item.ocorrencias_abertas} ocorrência(s)</p>` : ''}</button>`;
    return `<section data-montagem-agenda class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div class="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between"><div><p class="text-xs font-extrabold uppercase tracking-wide text-indigo-700">Agenda operacional</p><h4 class="mt-1 text-lg font-extrabold text-slate-950">Próximos 14 dias</h4><p class="mt-1 text-sm text-slate-600">Visualização cronológica de planos previstos; os alertas indicam conflitos de equipe e ocorrências abertas.</p></div><span class="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">${scheduled.length} plano(s) com data</span></div><div class="mt-4 overflow-x-auto"><div class="grid min-w-[980px] grid-cols-7 gap-3">${days.map((day) => { const items = scheduled.filter((item) => String(item.data_inicio).slice(0, 10) === day.key); return `<div class="min-h-36 rounded-xl border ${day.today ? 'border-indigo-300 bg-indigo-50/40' : 'border-slate-200 bg-slate-50'} p-3"><p class="text-xs font-extrabold uppercase ${day.today ? 'text-indigo-800' : 'text-slate-600'}">${esc(day.label)}${day.today ? ' · hoje' : ''}</p><div class="mt-3 space-y-2">${items.length ? items.map(slot).join('') : '<p class="text-xs text-slate-400">Sem plano</p>'}</div></div>`; }).join('')}</div></div>${withoutDate.length ? `<div class="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3"><p class="text-sm font-bold text-amber-950">${withoutDate.length} plano(s) ainda sem início planejado</p><div class="mt-2 flex flex-wrap gap-2">${withoutDate.map((item) => `<button type="button" data-montagem-action="detalhar" data-id="${item.id}" class="rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100">${esc(item.numero || 'OS')} · ${esc(item.titulo || 'Plano')}</button>`).join('')}</div></div>` : ''}</section>`;
  }

  function mountAgenda(root) {
    if (!root || root.querySelector('[data-montagem-agenda]')) return;
    root.insertAdjacentHTML('beforeend', agendaMarkup());
  }

  function pageMarkup() {
    const summary = state.data.reduce((acc, item) => ({ total: acc.total + 1, running: acc.running + (item.status === 'em_andamento' ? 1 : 0), issues: acc.issues + Number(item.ocorrencias_abertas || 0), conflicts: acc.conflicts + Number(item.conflitos_equipe || 0) }), { total: 0, running: 0, issues: 0, conflicts: 0 });
    const body = state.loading ? `<tr><td colspan="6" class="px-4 py-10 text-center text-sm text-slate-500"><i class="fas fa-spinner fa-spin mr-2"></i>Carregando planos de montagem...</td></tr>` : state.data.length ? state.data.map(renderRow).join('') : `<tr><td colspan="6" class="px-4 py-12 text-center text-sm text-slate-500">Nenhum Plano de Montagem encontrado. Crie o primeiro plano para organizar prazo, equipe e materiais.</td></tr>`;
    const mobile = state.loading ? '<p class="py-8 text-center text-sm text-slate-500">Carregando...</p>' : state.data.length ? state.data.map(renderCard).join('') : '<div class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center text-sm text-slate-500">Nenhum Plano de Montagem encontrado.</div>';
    return `<section data-montagem-planejamento-page class="space-y-5" aria-label="Planejamento e execução de montagem">
      <div class="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-white p-5 shadow-sm sm:p-6"><div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div class="max-w-3xl"><p class="text-xs font-extrabold uppercase tracking-wide text-indigo-700">Montagem · planejamento operacional</p><h3 class="mt-1 text-2xl font-extrabold text-slate-950">Planos de Montagem</h3><p class="mt-2 text-sm leading-6 text-slate-700">Planeje prazos, equipe, materiais e ocorrências por Ordem de Serviço. Esta área não cria nem altera lançamentos financeiros.</p></div><button type="button" data-montagem-action="novo" class="w-full rounded-lg bg-indigo-700 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-800 focus:outline-none focus:ring-4 focus:ring-indigo-200 sm:w-auto"><i class="fas fa-plus mr-2"></i>Novo plano</button></div>
      <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"><label class="text-sm font-semibold text-slate-700">Status<select data-montagem-filter="status" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">${selectOptions(statuses, state.filters.status, 'Todos os status')}</select></label><label class="text-sm font-semibold text-slate-700">Evento<select data-montagem-filter="eventoId" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">${eventOptions(state.filters.eventoId)}</select></label><label class="text-sm font-semibold text-slate-700">Buscar<input data-montagem-filter="busca" value="${esc(state.filters.busca)}" type="search" placeholder="OS, título, evento ou stand" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></label></div></div>
      ${state.error ? `<div class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">${esc(state.error)}</div>` : ''}
      ${cards(summary)}
      <div class="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block"><table class="min-w-full divide-y divide-slate-200"><thead class="bg-slate-50"><tr><th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">OS</th><th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Plano</th><th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Janela planejada</th><th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Prontidão</th><th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Situação</th><th class="px-4 py-3"></th></tr></thead><tbody class="divide-y divide-slate-100">${body}</tbody></table></div>
      <div class="space-y-3 md:hidden">${mobile}</div>
    </section>`;
  }

  function modalShell(id, title, subtitle, content) {
    document.getElementById(id)?.remove();
    document.body.insertAdjacentHTML('beforeend', `<div id="${id}" class="fixed inset-0 z-[1450] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="${id}-title"><div class="my-3 w-full max-w-5xl rounded-2xl bg-white shadow-2xl sm:my-6"><div class="flex items-start justify-between gap-4 border-b border-slate-200 p-4 sm:p-6"><div><h3 id="${id}-title" class="text-lg font-extrabold text-slate-950">${esc(title)}</h3><p class="mt-1 text-sm text-slate-600">${esc(subtitle || '')}</p></div><button type="button" data-montagem-close="${id}" class="rounded-lg p-2 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Fechar">×</button></div>${content}</div></div>`);
    document.getElementById(id)?.addEventListener('click', (event) => { if (event.target?.id === id) document.getElementById(id)?.remove(); });
    document.querySelector(`#${id} [data-montagem-close="${id}"]`)?.addEventListener('click', () => document.getElementById(id)?.remove());
  }

  function openPlanForm(item = null) {
    const isNew = !item;
    const plan = item || { titulo: '', tipo: 'montagem', complexidade: 'media', evento_id: '', projeto_stand_id: '', data_inicio: '', data_fim: '', local_evento: '', credenciais: '', observacoes: '', status: 'planejada', data_inicio_real: '', data_fim_real: '' };
    modalShell('montagem-plan-form-modal', isNew ? 'Novo Plano de Montagem' : `Editar ${plan.numero || 'Plano'}`, 'A criação e a edição são operacionais; nenhum lançamento financeiro será modificado.', `<form data-montagem-plan-form class="p-4 sm:p-6"><div class="grid grid-cols-1 gap-4 md:grid-cols-2"><label class="text-sm font-semibold text-slate-700 md:col-span-2">Título *<input name="titulo" required maxlength="255" value="${esc(plan.titulo)}" placeholder="Ex.: Montagem do stand — Cliente / Feira" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></label><label class="text-sm font-semibold text-slate-700">Tipo<select name="tipo" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">${selectOptions(types, plan.tipo)}</select></label><label class="text-sm font-semibold text-slate-700">Complexidade<select name="complexidade" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">${selectOptions(complexities, plan.complexidade)}</select></label><label class="text-sm font-semibold text-slate-700">Evento<select name="eventoId" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">${eventOptions(plan.evento_id, 'Selecione se aplicável')}</select></label><label class="text-sm font-semibold text-slate-700">Projeto de Stand<select name="projetoStandId" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">${projectOptions(plan.projeto_stand_id, plan.evento_id)}</select></label><label class="text-sm font-semibold text-slate-700">Início planejado<input name="dataInicio" type="datetime-local" value="${esc(dateInput(plan.data_inicio))}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></label><label class="text-sm font-semibold text-slate-700">Fim planejado<input name="dataFim" type="datetime-local" value="${esc(dateInput(plan.data_fim))}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></label>${isNew ? '' : `<label class="text-sm font-semibold text-slate-700">Status<select name="status" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">${selectOptions(statuses, plan.status)}</select></label><label class="text-sm font-semibold text-slate-700">Início real<input name="dataInicioReal" type="datetime-local" value="${esc(dateInput(plan.data_inicio_real))}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></label><label class="text-sm font-semibold text-slate-700">Fim real<input name="dataFimReal" type="datetime-local" value="${esc(dateInput(plan.data_fim_real))}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></label>`}<label class="text-sm font-semibold text-slate-700 ${isNew ? 'md:col-span-2' : ''}">Local do evento<input name="localEvento" maxlength="255" value="${esc(plan.local_evento || '')}" placeholder="Pavilhão, endereço ou referência" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></label><label class="text-sm font-semibold text-slate-700 md:col-span-2">Credenciais / acessos<textarea name="credenciais" rows="2" maxlength="4000" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" placeholder="Regras de acesso, carga e descarga ou contato no pavilhão">${esc(plan.credenciais || '')}</textarea></label><label class="text-sm font-semibold text-slate-700 md:col-span-2">Observações operacionais<textarea name="observacoes" rows="3" maxlength="5000" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" placeholder="Premissas, pontos de atenção e dependências">${esc(plan.observacoes || '')}</textarea></label></div><div class="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between"><button type="button" data-montagem-close="montagem-plan-form-modal" class="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancelar</button><button type="submit" class="rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-800 focus:outline-none focus:ring-4 focus:ring-indigo-200">${isNew ? 'Criar plano' : 'Salvar alterações'}</button></div></form>`);
    const modal = document.getElementById('montagem-plan-form-modal');
    const form = modal?.querySelector('[data-montagem-plan-form]');
    const eventSelect = form?.querySelector('[name="eventoId"]');
    const projectSelect = form?.querySelector('[name="projetoStandId"]');
    eventSelect?.addEventListener('change', () => { if (projectSelect) projectSelect.innerHTML = projectOptions('', eventSelect.value); });
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submit = form.querySelector('[type="submit"]'); submit.disabled = true;
      const values = Object.fromEntries(new FormData(form).entries());
      try {
        const result = await api(isNew ? '/' : `/${item.id}`, { method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
        notify(isNew ? `Plano ${result.numero || ''} criado.` : 'Plano atualizado.', 'success'); modal?.remove(); await load();
      } catch (error) { notify(error.message || 'Não foi possível salvar o plano.', 'error'); } finally { submit.disabled = false; }
    });
  }

  function detailMarkup(data) {
    const os = data.os; const team = Array.isArray(data.equipe) ? data.equipe : []; const materials = Array.isArray(data.materiais) ? data.materiais : []; const issues = Array.isArray(data.ocorrencias) ? data.ocorrencias : [];
    const planned = os.horas_planejadas == null ? '—' : `${Number(os.horas_planejadas).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`;
    const actual = os.horas_reais == null ? '—' : `${Number(os.horas_reais).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`;
    const deviation = os.desvio_horas == null ? 'Aguardando execução' : `${Number(os.desvio_horas) >= 0 ? '+' : ''}${Number(os.desvio_horas).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`;
    return `<div class="space-y-5 p-4 sm:p-6"><div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"><div class="rounded-xl bg-slate-50 p-4"><p class="text-xs font-bold uppercase text-slate-500">Planejado</p><p class="mt-1 font-extrabold text-slate-900">${esc(planned)}</p></div><div class="rounded-xl bg-indigo-50 p-4"><p class="text-xs font-bold uppercase text-indigo-700">Realizado</p><p class="mt-1 font-extrabold text-indigo-900">${esc(actual)}</p></div><div class="rounded-xl ${os.desvio_horas != null && Number(os.desvio_horas) > 0 ? 'bg-rose-50' : 'bg-emerald-50'} p-4"><p class="text-xs font-bold uppercase ${os.desvio_horas != null && Number(os.desvio_horas) > 0 ? 'text-rose-700' : 'text-emerald-700'}">Desvio</p><p class="mt-1 font-extrabold ${os.desvio_horas != null && Number(os.desvio_horas) > 0 ? 'text-rose-900' : 'text-emerald-900'}">${esc(deviation)}</p></div><div class="rounded-xl bg-violet-50 p-4"><p class="text-xs font-bold uppercase text-violet-700">Conflitos de equipe</p><p class="mt-1 font-extrabold text-violet-900">${Number(os.conflitos_equipe || 0)}</p></div></div><div class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-sm font-bold text-slate-900">${esc(os.evento_nome || 'Evento não informado')}</p><p class="mt-1 text-xs text-slate-600">${esc(os.projeto_stand_nome || 'Sem Projeto de Stand')} · ${esc(os.local_evento || 'Local não informado')}</p></div><button type="button" data-montagem-detail-action="editar" class="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm font-bold text-indigo-800 hover:bg-indigo-50">Editar plano</button></div><div class="grid grid-cols-1 gap-5 xl:grid-cols-2"><section class="rounded-xl border border-slate-200"><div class="border-b border-slate-200 p-4"><h4 class="font-extrabold text-slate-900">Equipe</h4><p class="mt-1 text-xs text-slate-500">Previsão e horas reais registradas pela operação.</p></div><div class="divide-y divide-slate-100">${team.length ? team.map((member) => `<div class="flex items-center justify-between gap-3 p-4"><div><p class="font-semibold text-slate-900">${esc(member.usuario_nome || member.nome_externo || 'Integrante')}</p><p class="mt-1 text-xs text-slate-500">${esc(member.funcao || 'Função não informada')} · ${member.confirmado ? 'Confirmado' : 'Pendente'}</p></div><p class="text-right text-xs text-slate-600">Prev.: ${esc(member.horas_planejadas || '—')}h<br>Real: ${esc(member.horas_reais || '—')}h</p></div>`).join('') : '<p class="p-4 text-sm text-slate-500">Nenhum integrante previsto.</p>'}</div><form data-montagem-team-form class="border-t border-slate-200 p-4"><p class="mb-3 text-sm font-bold text-slate-800">Adicionar integrante</p><div class="grid grid-cols-1 gap-2 sm:grid-cols-2"><select name="userId" class="rounded-lg border border-slate-300 px-3 py-2 text-sm">${userOptions('', 'Usuário cadastrado')}</select><input name="nomeExterno" maxlength="255" placeholder="Ou nome externo" class="rounded-lg border border-slate-300 px-3 py-2 text-sm"><input name="funcao" maxlength="100" placeholder="Função" class="rounded-lg border border-slate-300 px-3 py-2 text-sm"><input name="horasPlanejadas" type="number" min="0" step="0.5" placeholder="Horas previstas" class="rounded-lg border border-slate-300 px-3 py-2 text-sm"></div><button type="submit" class="mt-3 w-full rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-800 hover:bg-indigo-100">Adicionar à equipe</button></form></section><section class="rounded-xl border border-slate-200"><div class="border-b border-slate-200 p-4"><h4 class="font-extrabold text-slate-900">Materiais</h4><p class="mt-1 text-xs text-slate-500">Controle operacional, não substitui estoque financeiro.</p></div><div class="divide-y divide-slate-100">${materials.length ? materials.map((material) => `<div class="flex items-center justify-between gap-3 p-4"><div><p class="font-semibold text-slate-900">${esc(material.descricao)}</p><p class="mt-1 text-xs text-slate-500">${esc(material.quantidade)} ${esc(material.unidade)} planejado${material.quantidade_real != null ? ` · ${esc(material.quantidade_real)} real` : ''}</p></div><span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">${esc(materialStatuses[material.status] || material.status)}</span></div>`).join('') : '<p class="p-4 text-sm text-slate-500">Nenhum material previsto.</p>'}</div><form data-montagem-material-form class="border-t border-slate-200 p-4"><p class="mb-3 text-sm font-bold text-slate-800">Adicionar material</p><div class="grid grid-cols-1 gap-2 sm:grid-cols-2"><input name="descricao" required maxlength="255" placeholder="Descrição do material" class="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"><input name="quantidade" required value="1" type="number" min="0.001" step="0.001" class="rounded-lg border border-slate-300 px-3 py-2 text-sm"><input name="unidade" value="un" maxlength="20" class="rounded-lg border border-slate-300 px-3 py-2 text-sm"><select name="status" class="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2">${selectOptions(materialStatuses, 'pendente')}</select></div><button type="submit" class="mt-3 w-full rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-800 hover:bg-indigo-100">Adicionar material</button></form></section></div><section class="rounded-xl border border-slate-200"><div class="border-b border-slate-200 p-4"><h4 class="font-extrabold text-slate-900">Ocorrências operacionais</h4><p class="mt-1 text-xs text-slate-500">Registre desvios e custos estimados; não cria despesa financeira.</p></div><div class="divide-y divide-slate-100">${issues.length ? issues.map((issue) => `<div class="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between"><div><div class="flex flex-wrap gap-2"><span class="rounded-full px-2.5 py-1 text-xs font-bold ${severityClass(issue.severidade)}">${esc(issue.severidade)}</span><span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">${esc(occurrenceTypes[issue.tipo] || issue.tipo)}</span>${issue.resolvida ? '<span class="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">Resolvida</span>' : ''}</div><p class="mt-2 text-sm text-slate-800">${esc(issue.descricao)}</p><p class="mt-1 text-xs text-slate-500">${esc(issue.created_by_nome || 'Usuário')} · ${esc(dateTime(issue.created_at))}</p></div><p class="shrink-0 text-sm font-extrabold text-slate-900">${issue.custo_estimado == null ? 'Sem custo estimado' : money(issue.custo_estimado)}</p></div>`).join('') : '<p class="p-4 text-sm text-slate-500">Nenhuma ocorrência registrada.</p>'}</div><form data-montagem-issue-form class="border-t border-slate-200 p-4"><div class="grid grid-cols-1 gap-2 sm:grid-cols-3"><select name="tipo" class="rounded-lg border border-slate-300 px-3 py-2 text-sm">${selectOptions(occurrenceTypes, 'outro')}</select><select name="severidade" class="rounded-lg border border-slate-300 px-3 py-2 text-sm">${selectOptions(complexities, 'media')}</select><input name="custoEstimado" type="number" min="0" step="0.01" placeholder="Custo estimado (R$)" class="rounded-lg border border-slate-300 px-3 py-2 text-sm"><textarea name="descricao" required maxlength="4000" rows="2" placeholder="Descreva o que ocorreu e o impacto operacional" class="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-3"></textarea></div><button type="submit" class="mt-3 w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900 hover:bg-amber-100">Registrar ocorrência</button></form></section></div>`;
  }

  async function openDetail(id) {
    try {
      const data = await api(`/${encodeURIComponent(id)}`);
      modalShell('montagem-plan-detail-modal', data.os.numero || 'Plano de Montagem', 'Acompanhe a execução e registre somente informações operacionais.', detailMarkup(data));
      const modal = document.getElementById('montagem-plan-detail-modal');
      modal?.querySelector('[data-montagem-detail-action="editar"]')?.addEventListener('click', () => openPlanForm(data.os));
      modal?.querySelector('[data-montagem-team-form]')?.addEventListener('submit', async (event) => { event.preventDefault(); const form = event.currentTarget; try { await api(`/${id}/equipe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) }); notify('Integrante incluído.', 'success'); await openDetail(id); await load(); } catch (error) { notify(error.message || 'Não foi possível incluir integrante.', 'error'); } });
      modal?.querySelector('[data-montagem-material-form]')?.addEventListener('submit', async (event) => { event.preventDefault(); const form = event.currentTarget; try { await api(`/${id}/materiais`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) }); notify('Material incluído.', 'success'); await openDetail(id); await load(); } catch (error) { notify(error.message || 'Não foi possível incluir material.', 'error'); } });
      modal?.querySelector('[data-montagem-issue-form]')?.addEventListener('submit', async (event) => { event.preventDefault(); const form = event.currentTarget; try { await api(`/${id}/ocorrencias`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) }); notify('Ocorrência registrada.', 'success'); await openDetail(id); await load(); } catch (error) { notify(error.message || 'Não foi possível registrar ocorrência.', 'error'); } });
    } catch (error) { notify(error.message || 'Não foi possível abrir o plano.', 'error'); }
  }

  function bind(root) {
    if (!root || root.dataset.bound === '1') return;
    root.dataset.bound = '1';
    mountAgenda(root);
    root.addEventListener('click', (event) => {
      const action = event.target.closest?.('[data-montagem-action]');
      if (!action) return;
      const kind = action.dataset.montagemAction;
      if (kind === 'novo') openPlanForm();
      if (kind === 'detalhar') openDetail(action.dataset.id);
    });
    root.querySelectorAll('[data-montagem-filter]').forEach((input) => {
      input.addEventListener(input.type === 'search' ? 'input' : 'change', (event) => {
        state.filters[event.target.dataset.montagemFilter] = event.target.value;
        if (event.target.type === 'search') {
          window.clearTimeout(state.filterTimer);
          state.filterTimer = window.setTimeout(() => load(), 250);
        } else load();
      });
    });
  }

  async function references() {
    if (state.refsLoaded) return;
    const data = await api('/referencias');
    state.refs = { eventos: Array.isArray(data.eventos) ? data.eventos : [], projetos: Array.isArray(data.projetos) ? data.projetos : [], usuarios: Array.isArray(data.usuarios) ? data.usuarios : [] };
    state.refsLoaded = true;
  }
  function render() { return pageMarkup(); }
  async function load() {
    const request = ++state.request;
    state.loading = true; state.error = '';
    const initial = document.querySelector('[data-montagem-planejamento-page]');
    if (initial) { initial.outerHTML = pageMarkup(); bind(document.querySelector('[data-montagem-planejamento-page]')); }
    try {
      await references();
      const params = new URLSearchParams();
      if (state.filters.status) params.set('status', state.filters.status);
      if (state.filters.eventoId) params.set('evento_id', state.filters.eventoId);
      if (state.filters.busca) params.set('busca', state.filters.busca);
      const data = await api(`/?${params.toString()}`);
      if (request !== state.request) return;
      state.data = Array.isArray(data.data) ? data.data : [];
    } catch (error) {
      if (request !== state.request) return;
      state.data = []; state.error = error.message || 'Não foi possível carregar os planos de montagem.';
    } finally {
      if (request === state.request) {
        state.loading = false;
        const current = document.querySelector('[data-montagem-planejamento-page]');
        if (current) { current.outerHTML = pageMarkup(); bind(document.querySelector('[data-montagem-planejamento-page]')); }
      }
    }
  }

  window.PlanejamentoMontagemModule = { render, load, openDetail, openPlanForm };
})();
