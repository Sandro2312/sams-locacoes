// SAMS Locações — Lote Financeiro por Stand
// Organiza receitas e despesas em rascunho; a confirmação humana cria os lançamentos de origem.
(function () {
  'use strict';

  const state = { clientes: [], eventos: [], lote: null, loading: false, bound: false, clientSearchTimer: null, clientSearchRequest: 0, checklistExtraIndex: 0, pendingChecklistItems: [] };
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const currency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
  const formatDate = (value) => {
    if (!value) return '—';
    const date = typeof value === 'object' ? (value.value || value.date || '') : String(value);
    if (!/^\d{4}-\d{2}-\d{2}/.test(date)) return String(date || '—');
    const [year, month, day] = date.slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
  };
  const message = (text, type = 'success') => window.ModuleSystem?.showNotification?.(text, type) || alert(text);
  const categories = {
    receita: [['venda_stand', 'Venda do stand'], ['adicional', 'Adicional / serviço'], ['outros', 'Outra receita']],
    despesa: [['projeto', 'Projeto'], ['montagem', 'Montagem'], ['taxas', 'Taxas / feira'], ['comissao_vendedor', 'Comissão de vendedor'], ['comissao_projetista', 'Comissão de projetista'], ['logistica', 'Logística'], ['desmontagem', 'Desmontagem'], ['fornecedor', 'Fornecedor'], ['outros', 'Outra despesa']],
  };
  const checklistCatalog = [
    { id: 'venda-stand', natureza: 'receita', categoria: 'venda_stand', titulo: 'Venda do stand', descricao: 'Venda do stand', parcelavel: true },
    { id: 'outra-receita', natureza: 'receita', categoria: 'adicional', titulo: 'Outra receita', descricaoLivre: true, repetivel: true },
    { id: 'montagem', natureza: 'despesa', categoria: 'montagem', titulo: 'Montagem', descricao: 'Montagem do stand' },
    { id: 'desmontagem', natureza: 'despesa', categoria: 'desmontagem', titulo: 'Desmontagem', descricao: 'Desmontagem do stand' },
    { id: 'comissao-venda', natureza: 'despesa', categoria: 'comissao_vendedor', titulo: 'Comissão de venda', descricao: 'Comissão de venda' },
    { id: 'comissao-projeto', natureza: 'despesa', categoria: 'comissao_projetista', titulo: 'Comissão de projeto', descricao: 'Comissão de projeto' },
    { id: 'led', natureza: 'despesa', categoria: 'fornecedor', titulo: 'Locação de painéis de LED', descricao: 'Locação de painéis de LED' },
    { id: 'logistica', natureza: 'despesa', categoria: 'logistica', titulo: 'Logística / frete', descricao: 'Logística e frete' },
    { id: 'taxas', natureza: 'despesa', categoria: 'taxas', titulo: 'Taxas do evento', descricao: 'Taxas do evento' },
    { id: 'fornecedor', natureza: 'despesa', categoria: 'fornecedor', titulo: 'Fornecedores', descricao: 'Fornecedor' },
    { id: 'outra-despesa', natureza: 'despesa', categoria: 'outros', titulo: 'Outra despesa', descricaoLivre: true, repetivel: true },
  ];

  function api(path, options = {}) {
    return fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || `Falha na operação (${response.status})`);
        return body;
      });
  }
  async function fetchAll(baseUrl) {
    const rows = []; let offset = 0; let total = Infinity;
    while (offset < total) {
      const join = baseUrl.includes('?') ? '&' : '?';
      const payload = await api(`${baseUrl}${join}limit=500&offset=${offset}`, { method: 'GET' });
      const page = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : []);
      total = Number(Array.isArray(payload) ? page.length : (payload.total ?? page.length));
      rows.push(...page);
      if (!page.length || page.length < 500) break;
      offset += page.length;
    }
    return rows;
  }
  const clientName = (client) => client?.nome || client?.razao_social || client?.empresa || `Cliente #${client?.id || ''}`;
  const eventName = (evento) => evento?.nome || evento?.titulo || `Evento #${evento?.id || ''}`;
  function searchClient(term) {
    const normalized = String(term || '').trim().toLocaleLowerCase('pt-BR');
    if (!normalized) return state.clientes.slice(0, 80);
    return state.clientes.filter((client) => [clientName(client), client.email, client.documento, client.cnpj, client.cpf_cnpj].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(normalized)).slice(0, 80);
  }
  function mergeClientes(clientes) {
    const byId = new Map(state.clientes.map((cliente) => [String(cliente.id), cliente]));
    clientes.forEach((cliente) => byId.set(String(cliente.id), cliente));
    state.clientes = Array.from(byId.values()).sort((a, b) => clientName(a).localeCompare(clientName(b), 'pt-BR'));
  }
  function buscarClientesAtualizados() {
    const search = document.querySelector('[data-finance-batch-client-search]');
    const term = String(search?.value || '').trim();
    const count = document.querySelector('[data-finance-batch-client-count]');
    if (state.clientSearchTimer) window.clearTimeout(state.clientSearchTimer);
    const request = ++state.clientSearchRequest;
    if (term.length < 2) return;
    if (count) count.textContent = 'Buscando clientes atualizados...';
    state.clientSearchTimer = window.setTimeout(async () => {
      try {
        const payload = await api(`/api/crm/clientes?q=${encodeURIComponent(term)}&limit=80`, { method: 'GET' });
        if (request !== state.clientSearchRequest) return;
        const clientes = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : []);
        mergeClientes(clientes);
        refreshClientSelect();
      } catch (_error) {
        if (request !== state.clientSearchRequest) return;
        refreshClientSelect();
      }
    }, 180);
  }
  function searchEvent(term) {
    const normalized = String(term || '').trim().toLocaleLowerCase('pt-BR');
    if (!normalized) return state.eventos.slice(0, 80);
    return state.eventos.filter((evento) => [eventName(evento), evento.organizadora, evento.local, evento.endereco, evento.status].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(normalized)).slice(0, 80);
  }
  function clientOptions(selected, term) {
    const results = searchClient(term);
    const selectedClient = state.clientes.find((client) => String(client.id) === String(selected));
    const unique = selectedClient && !results.some((client) => String(client.id) === String(selectedClient.id)) ? [selectedClient, ...results] : results;
    return `<option value="">Selecione o cliente</option>${unique.map((client) => `<option value="${esc(client.id)}" ${String(client.id) === String(selected) ? 'selected' : ''}>${esc(clientName(client))}${client.documento ? ` · ${esc(client.documento)}` : ''}</option>`).join('')}`;
  }
  function clientSearchResultsMarkup(term) {
    const normalized = String(term || '').trim();
    const results = searchClient(normalized);
    if (!normalized) return '';
    if (!results.length) return '<div class="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">Nenhum cliente encontrado. Tente outro nome, e-mail ou documento.</div>';
    return `<div data-finance-batch-client-results class="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-2" role="listbox" aria-label="Clientes encontrados"><p class="px-1 pb-1 text-xs font-semibold text-blue-900">Resultados encontrados — clique para selecionar:</p><div class="grid grid-cols-1 gap-1 sm:grid-cols-2">${results.map((client) => `<button type="button" data-finance-batch-client-result="${esc(client.id)}" role="option" aria-label="Selecionar ${esc(clientName(client))}" class="rounded-md border border-blue-100 bg-white px-3 py-2 text-left text-sm text-slate-800 hover:border-blue-400 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-600"><span class="block font-semibold">${esc(clientName(client))}</span>${client.documento ? `<span class="block text-xs text-slate-500">${esc(client.documento)}</span>` : ''}</button>`).join('')}</div></div>`;
  }
  function eventOptions(selected, term) {
    const results = searchEvent(term);
    const selectedEvent = state.eventos.find((evento) => String(evento.id) === String(selected));
    const unique = selectedEvent && !results.some((evento) => String(evento.id) === String(selectedEvent.id)) ? [selectedEvent, ...results] : results;
    return `<option value="">Selecione o evento</option>${unique.map((evento) => `<option value="${esc(evento.id)}" ${String(evento.id) === String(selected) ? 'selected' : ''}>${esc(eventName(evento))}</option>`).join('')}`;
  }
  function eventSearchResultsMarkup(term) {
    const normalized = String(term || '').trim();
    const results = searchEvent(normalized);
    if (!normalized) return '';
    if (!results.length) return '<div class="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">Nenhum evento cadastrado foi encontrado. Cadastre o evento em Comercial → Eventos antes de criar o lote.</div>';
    return `<div data-finance-batch-event-results class="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-2" role="listbox" aria-label="Eventos encontrados"><p class="px-1 pb-1 text-xs font-semibold text-blue-900">Resultados encontrados — clique para selecionar:</p><div class="grid grid-cols-1 gap-1 sm:grid-cols-2">${results.map((evento) => `<button type="button" data-finance-batch-event-result="${esc(evento.id)}" role="option" aria-label="Selecionar ${esc(eventName(evento))}" class="rounded-md border border-blue-100 bg-white px-3 py-2 text-left text-sm text-slate-800 hover:border-blue-400 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-600"><span class="block font-semibold">${esc(eventName(evento))}</span>${evento.local ? `<span class="block text-xs text-slate-500">${esc(evento.local)}</span>` : ''}</button>`).join('')}</div></div>`;
  }
  function categoryOptions(natureza, selected) {
    return (categories[natureza] || categories.despesa).map(([value, label]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`).join('');
  }
  function statusBadge(status) {
    return status === 'confirmado' ? '<span class="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">Confirmado</span>' : '<span class="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">Rascunho</span>';
  }
  function render() {
    const lote = state.lote?.lote;
    return `<section class="space-y-5" data-finance-batch-page>
      <div class="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-white p-5 sm:p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="max-w-3xl"><p class="text-xs font-semibold uppercase tracking-wide text-blue-700">Financeiro · lote por stand</p><h2 class="mt-1 text-2xl font-bold text-slate-900">Lançamentos em lote por Stand</h2><p class="mt-2 text-sm leading-6 text-slate-600">Selecione Cliente, Evento e a identificação do stand. Adicione várias receitas e despesas, com parcelas, e confirme somente após revisar o resumo. Não cria venda nem Projeto de Stand.</p></div>
          ${lote ? `<button type="button" data-finance-batch-action="novo" class="shrink-0 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"><i class="fas fa-plus mr-2"></i>Novo lote</button>` : ''}
        </div>
      </div>
      <div id="finance-batch-workspace">${lote ? renderLoteWorkspace() : renderContextForm()}</div>
    </section>`;
  }
  function renderContextForm() {
    return `<div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div class="mb-5"><h3 class="text-lg font-bold text-slate-900">1. Identifique o lote financeiro</h3><p class="mt-1 text-sm text-slate-600">Este contexto será aplicado às receitas e despesas confirmadas neste lote.</p></div>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div><label class="text-sm font-semibold text-slate-700" for="finance-batch-client-search">Buscar cliente</label><input id="finance-batch-client-search" data-finance-batch-client-search type="search" autocomplete="off" placeholder="Nome, e-mail ou documento" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"><p data-finance-batch-client-count aria-live="polite" class="mt-1 text-xs text-slate-500">${state.clientes.length ? `${state.clientes.length} clientes disponíveis para busca.` : 'Carregando clientes...'}</p><div data-finance-batch-client-results-host></div></div>
        <div><label class="text-sm font-semibold text-slate-700" for="finance-batch-event-search">Buscar evento</label><input id="finance-batch-event-search" data-finance-batch-event-search type="search" autocomplete="off" placeholder="Nome, organizadora ou local" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"><p data-finance-batch-event-count aria-live="polite" class="mt-1 text-xs text-slate-500">${state.eventos.length ? `${state.eventos.length} eventos disponíveis para busca.` : 'Carregando eventos...'}</p><div data-finance-batch-event-results-host></div></div>
        <div><label class="text-sm font-semibold text-slate-700" for="finance-batch-client">Cliente <span class="text-rose-600">*</span></label><select id="finance-batch-client" data-finance-batch-client class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">${clientOptions('', '')}</select></div>
        <div><label class="text-sm font-semibold text-slate-700" for="finance-batch-event">Evento <span class="text-rose-600">*</span></label><select id="finance-batch-event" data-finance-batch-event class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">${eventOptions('', '')}</select></div>
        <div><label class="text-sm font-semibold text-slate-700" for="finance-batch-stand">Identificação do stand <span class="text-rose-600">*</span></label><input id="finance-batch-stand" data-finance-batch-stand maxlength="180" placeholder="Ex.: Stand Urano · Pavilhão 2 · 48 m²" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></div>
        <div><label class="text-sm font-semibold text-slate-700" for="finance-batch-centro">Centro de custo <span class="text-rose-600">*</span></label><input id="finance-batch-centro" data-finance-batch-centro maxlength="220" placeholder="Preenchido ao selecionar cliente, evento e stand" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></div>
        <div class="md:col-span-2"><label class="text-sm font-semibold text-slate-700" for="finance-batch-observacoes">Observações do lote</label><textarea id="finance-batch-observacoes" data-finance-batch-observacoes rows="3" maxlength="4000" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" placeholder="Referência interna, contrato, orientação de conferência..."></textarea></div>
      </div>
      <div class="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between"><p class="text-xs leading-5 text-slate-500">Criar o lote não gera lançamento financeiro. Os registros só serão criados após a confirmação humana final.</p><button type="button" data-finance-batch-action="criar" class="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"><i class="fas fa-layer-group mr-2"></i>Criar lote e adicionar itens</button></div>
    </div>`;
  }
  function createdRecords(item) {
    const raw = item?.lancamentos_criados;
    if (Array.isArray(raw)) return raw;
    try { const parsed = JSON.parse(raw || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  function createdRecordsMarkup(itens) {
    const records = itens.flatMap((item) => createdRecords(item).map((record) => ({ ...record, item })));
    if (!records.length) return '';
    const receitas = records.filter((record) => record.tipo === 'conta_receber');
    const despesas = records.filter((record) => record.tipo === 'transacao');
    const row = (record) => {
      const isReceita = record.tipo === 'conta_receber';
      const label = isReceita ? 'Conta a Receber' : 'Despesa';
      const color = isReceita ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900';
      return `<li class="rounded-lg border ${color} px-3 py-2 text-sm"><span class="font-bold">${label} #${esc(record.id)}</span><span class="ml-2 text-xs font-medium">${esc(record.numero)}ª parcela · ${currency(record.valor)} · ${esc(formatDate(record.vencimento))}</span></li>`;
    };
    return `<section class="mt-4 border-t border-emerald-200 pt-4" aria-label="Lançamentos criados no Financeiro"><div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h5 class="font-bold text-emerald-950">Lançamentos criados nos cadastros financeiros de origem</h5><p class="mt-1 text-sm text-emerald-800">Cada registro abaixo é o lançamento real do Financeiro, mantido nos fluxos usuais de baixa, pagamento e comprovantes.</p></div><div class="flex flex-wrap gap-2">${receitas.length ? '<button type="button" data-finance-batch-action="ver-receitas" class="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100">Ver Receitas</button>' : ''}${despesas.length ? '<button type="button" data-finance-batch-action="ver-despesas" class="rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100">Ver Despesas</button>' : ''}</div></div><ul class="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">${records.map(row).join('')}</ul></section>`;
  }
  function renderLoteWorkspace() {
    const { lote, itens, resumo } = state.lote;
    const confirmed = lote.status === 'confirmado';
    const confirmationPanel = !confirmed && itens.length ? `<section data-finance-batch-confirmation-panel class="rounded-2xl border-4 border-emerald-500 bg-slate-950 p-5 shadow-xl ring-4 ring-emerald-100 sm:p-6" aria-label="Confirmação final dos lançamentos"><div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div class="max-w-3xl"><p class="inline-flex items-center gap-2 rounded-full bg-amber-300 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-slate-950"><i class="fas fa-exclamation-circle"></i> Ação necessária</p><h4 class="mt-3 text-xl font-extrabold text-white">Confirmar ${itens.length} lançamento(s) do lote</h4><p class="mt-2 text-sm leading-6 text-slate-200">Revise os itens abaixo. Quando estiver pronto, use este botão para criar as Contas a Receber e Despesas pendentes no Financeiro.</p><p class="mt-2 text-xs font-semibold text-amber-200">A confirmação solicita uma última aprovação e não cria duplicatas automaticamente.</p></div><button type="button" data-finance-batch-action="confirmar" class="w-full shrink-0 rounded-xl bg-amber-300 px-6 py-4 text-base font-extrabold text-slate-950 shadow-lg hover:bg-amber-200 focus:outline-none focus:ring-4 focus:ring-amber-200 focus:ring-offset-4 focus:ring-offset-slate-950 lg:w-auto"><i class="fas fa-check-double mr-2"></i>Confirmar lançamentos</button></div></section>` : '';
    return `<div class="space-y-5">
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div class="flex items-center gap-3"><h3 class="text-lg font-bold text-slate-900">${esc(lote.codigo)} · ${esc(lote.identificacao_stand)}</h3>${statusBadge(lote.status)}</div><p class="mt-1 text-sm text-slate-600">${esc(lote.cliente_nome)} · ${esc(lote.evento_nome)}</p><p class="mt-1 text-xs text-slate-500">Centro de custo: ${esc(lote.centro_custo)}</p></div><div class="grid grid-cols-3 gap-2 text-center"><div class="rounded-lg bg-emerald-50 px-3 py-2"><p class="text-xs text-emerald-700">Receitas</p><p class="text-sm font-bold text-emerald-800">${currency(resumo.receitas)}</p></div><div class="rounded-lg bg-rose-50 px-3 py-2"><p class="text-xs text-rose-700">Despesas</p><p class="text-sm font-bold text-rose-800">${currency(resumo.despesas)}</p></div><div class="rounded-lg bg-slate-100 px-3 py-2"><p class="text-xs text-slate-600">Resultado</p><p class="text-sm font-bold text-slate-800">${currency(resumo.resultado_estimado)}</p></div></div></div></div>
      ${confirmed ? `<div class="rounded-xl border border-emerald-200 bg-emerald-50 p-5"><h4 class="font-bold text-emerald-900"><i class="fas fa-check-circle mr-2"></i>Lote confirmado</h4><p class="mt-1 text-sm text-emerald-800">As Contas a Receber e Despesas foram criadas como pendentes no módulo Financeiro. Os registros abaixo são os mesmos lançamentos usados nos formulários financeiros habituais.</p>${createdRecordsMarkup(itens)}</div>` : `${confirmationPanel}${renderItemForm()}`}
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div class="flex items-center justify-between gap-3"><div><h4 class="font-bold text-slate-900">Itens do lote</h4><p class="mt-1 text-sm text-slate-600">${itens.length ? `${itens.length} item(ns) em ${resumo.pendentes} pendência(s) de confirmação.` : 'Adicione receitas e despesas para compor este lote.'}</p></div>${!confirmed && itens.length ? `<button type="button" data-finance-batch-action="confirmar" class="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"><i class="fas fa-check-double mr-2"></i>Revisar e confirmar lançamentos</button>` : ''}</div>
        <div class="mt-5 overflow-x-auto"><table class="min-w-full text-left text-sm"><thead class="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-2 py-3">Natureza</th><th class="px-2 py-3">Descrição</th><th class="px-2 py-3">Categoria</th><th class="px-2 py-3">Valor / parcelas</th><th class="px-2 py-3">Vencimentos</th><th class="px-2 py-3">Status</th><th class="px-2 py-3">Ações</th></tr></thead><tbody>${itens.length ? itens.map((item) => { const dates = Array.isArray(item.datas_vencimento) ? item.datas_vencimento : [item.primeiro_vencimento]; const values = Array.isArray(item.valores_parcelas) ? item.valores_parcelas : [item.valor_total]; return `<tr class="border-b border-slate-100"><td class="px-2 py-3 font-semibold ${item.natureza === 'receita' ? 'text-emerald-700' : 'text-rose-700'}">${item.natureza === 'receita' ? 'Receita' : 'Despesa'}</td><td class="px-2 py-3 text-slate-800">${esc(item.descricao)}</td><td class="px-2 py-3 text-slate-600">${esc(item.categoria)}</td><td class="px-2 py-3 text-slate-700">${currency(item.valor_total)}<span class="block text-xs text-slate-500">${item.parcelas}x</span></td><td class="px-2 py-3 text-slate-700">${dates.map((date, index) => `<span class="block text-xs">${index + 1}ª: ${esc(formatDate(date))} · ${currency(values[index])}</span>`).join('')}</td><td class="px-2 py-3">${statusBadge(item.status)}</td><td class="px-2 py-3 text-right">${!confirmed && item.status === 'rascunho' ? `<button type="button" data-finance-batch-action="remover-item" data-item-id="${esc(item.id)}" class="rounded px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50">Remover</button>` : ''}</td></tr>`; }).join('') : '<tr><td colspan="7" class="px-2 py-8 text-center text-slate-500">Nenhum item adicionado.</td></tr>'}</tbody></table></div>
      </div>
    </div>`;
  }
  function amountCents(value) {
    let raw = String(value ?? '').trim().replace(/\s/g, '');
    if (!raw) return null;
    if (raw.includes(',')) raw = raw.replace(/\./g, '').replace(',', '.');
    if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) return null;
    const cents = Math.round(Number(raw) * 100);
    return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
  }
  const centsValue = (cents) => (Number(cents || 0) / 100).toFixed(2).replace('.', ',');
  const equalValues = (totalCents, count) => {
    const base = Math.floor(totalCents / count); const remainder = totalCents - (base * count);
    return Array.from({ length: count }, (_, index) => centsValue(base + (index === count - 1 ? remainder : 0)));
  };
  function installmentInputs(count, dates = [], values = []) {
    return Array.from({ length: count }, (_, index) => `<div class="rounded-lg border border-slate-200 bg-slate-50 p-3"><p class="text-xs font-bold text-slate-700">${index + 1}ª parcela</p><div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"><label class="text-xs font-semibold text-slate-700">Vencimento <span class="text-rose-600">*</span><input type="date" data-finance-batch-item-data-parcela value="${esc(dates[index] || '')}" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"></label><label class="text-xs font-semibold text-slate-700">Valor <span class="text-rose-600">*</span><input data-finance-batch-item-valor-parcela inputmode="decimal" value="${esc(values[index] || '')}" placeholder="0,00" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"></label></div></div>`).join('');
  }
  function renderCustomItemForm() {
    return `<div class="rounded-xl border border-blue-200 bg-blue-50/40 p-5 sm:p-6"><div class="mb-4"><h4 class="font-bold text-slate-900">2. Adicione receitas e despesas</h4><p class="mt-1 text-sm text-slate-600">Cada item pode ser parcelado. Informe a data e o valor de cada parcela; os valores podem ser diferentes, desde que a soma seja igual ao valor total.</p></div><div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"><div><label class="text-sm font-semibold text-slate-700">Natureza <span class="text-rose-600">*</span></label><select data-finance-batch-item-natureza class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="receita">Receita / crédito</option><option value="despesa">Despesa / débito</option></select></div><div><label class="text-sm font-semibold text-slate-700">Categoria <span class="text-rose-600">*</span></label><select data-finance-batch-item-categoria class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">${categoryOptions('receita', 'venda_stand')}</select></div><div><label class="text-sm font-semibold text-slate-700">Valor total <span class="text-rose-600">*</span></label><input data-finance-batch-item-valor inputmode="decimal" placeholder="0,00" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></div><div class="md:col-span-2"><label class="text-sm font-semibold text-slate-700">Descrição <span class="text-rose-600">*</span></label><input data-finance-batch-item-descricao maxlength="500" placeholder="Ex.: Montagem do stand, 1ª parcela, taxa de energia" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></div><div><label class="text-sm font-semibold text-slate-700">Parcelas</label><input data-finance-batch-item-parcelas type="number" min="1" max="60" value="1" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></div><div class="md:col-span-2 lg:col-span-3 rounded-lg border border-slate-200 bg-white p-4"><div class="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-sm font-bold text-slate-800">Vencimentos e valores por parcela</p><p class="text-xs text-slate-500">Preencha cada vencimento e cada valor. A soma precisa coincidir com o valor total do item.</p></div><span data-finance-batch-item-parcel-summary class="text-xs font-semibold text-blue-700">1 parcela</span></div><div data-finance-batch-item-datas class="grid grid-cols-1 gap-3 lg:grid-cols-2">${installmentInputs(1)}</div><p data-finance-batch-item-totalizador aria-live="polite" class="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">Informe o valor total e os valores das parcelas.</p></div><div><label class="text-sm font-semibold text-slate-700">Forma de pagamento</label><input data-finance-batch-item-forma maxlength="120" placeholder="Pix, boleto, transferência..." class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></div><div class="md:col-span-2"><label class="text-sm font-semibold text-slate-700">Observações</label><input data-finance-batch-item-observacoes maxlength="4000" placeholder="Opcional" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></div></div><div class="mt-5 flex justify-end"><button type="button" data-finance-batch-action="adicionar-item" class="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"><i class="fas fa-plus mr-2"></i>Adicionar ao lote</button></div></div>`;
  }
  function checklistInstallments(count, dates = [], values = []) {
    return Array.from({ length: count }, (_, index) => `<div class="rounded-lg border border-slate-200 bg-white p-3"><p class="text-xs font-bold text-slate-700">${index + 1}ª parcela</p><div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"><label class="text-xs font-semibold text-slate-700">Vencimento <span class="text-rose-600">*</span><input type="date" data-finance-batch-check-date value="${esc(dates[index] || '')}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"></label><label class="text-xs font-semibold text-slate-700">Valor <span class="text-rose-600">*</span><input inputmode="decimal" data-finance-batch-check-installment-value value="${esc(values[index] || '')}" placeholder="0,00" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"></label></div></div>`).join('');
  }
  function checklistRow(definition) {
    const id = `finance-batch-check-${definition.id}`;
    const description = definition.descricaoLivre
      ? `<label class="block text-sm font-semibold text-slate-700">Descrição <span class="text-rose-600">*</span><input data-finance-batch-check-description maxlength="500" placeholder="Descreva este lançamento" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></label>`
      : `<div class="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"><span class="font-semibold">Descrição:</span> ${esc(definition.descricao)}</div>`;
    const dueDates = definition.parcelavel
      ? `<div class="md:col-span-2 rounded-xl border border-blue-200 bg-blue-50/70 p-4"><div class="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end"><label class="block text-sm font-semibold text-slate-700">Parcelas<input type="number" min="1" max="60" value="1" data-finance-batch-check-installments class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"></label><p class="sm:col-span-2 text-xs leading-5 text-slate-600">Informe data e valor de cada parcela. A soma deve ser igual ao valor total.</p></div><div data-finance-batch-check-installments-grid class="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">${checklistInstallments(1)}</div><p data-finance-batch-check-installments-status aria-live="polite" class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Informe o valor total e a parcela.</p></div>`
      : `<label class="block text-sm font-semibold text-slate-700">Vencimento <span class="text-rose-600">*</span><input type="date" data-finance-batch-check-date class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></label>`;
    return `<article data-finance-batch-check-row="${esc(definition.id)}" data-finance-batch-check-natureza="${esc(definition.natureza)}" data-finance-batch-check-categoria="${esc(definition.categoria)}" data-finance-batch-check-titulo="${esc(definition.titulo)}" data-finance-batch-check-descricao="${esc(definition.descricao || '')}" data-finance-batch-check-livre="${definition.descricaoLivre ? 'true' : 'false'}" data-finance-batch-check-parcelavel="${definition.parcelavel ? 'true' : 'false'}" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div class="flex items-start gap-3"><input id="${id}" type="checkbox" data-finance-batch-check-toggle="${esc(definition.id)}" aria-controls="${id}-content" class="mt-1 h-5 w-5 rounded border-slate-400 text-blue-700 focus:ring-2 focus:ring-blue-600"><label for="${id}" class="cursor-pointer"><span class="block text-base font-bold text-slate-900">${esc(definition.titulo)}</span><span class="mt-1 block text-xs text-slate-500">${definition.natureza === 'receita' ? 'Receita' : 'Despesa'} · ${esc(definition.categoria)}</span></label></div><div id="${id}-content" data-finance-batch-check-content class="mt-4 hidden border-t border-slate-100 pt-4" aria-hidden="true"><div class="grid grid-cols-1 gap-4 md:grid-cols-2">${description}<label class="block text-sm font-semibold text-slate-700">Valor total <span class="text-rose-600">*</span><input data-finance-batch-check-total inputmode="decimal" placeholder="0,00" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></label>${dueDates}<label class="block text-sm font-semibold text-slate-700">Forma de pagamento <span class="font-normal text-slate-500">(opcional)</span><input data-finance-batch-check-payment maxlength="120" placeholder="Pix, boleto, transferência..." class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></label></div></div></article>`;
  }
  function checklistSection(title, natureza) {
    const action = natureza === 'receita' ? 'adicionar-outra-receita' : 'adicionar-outra-despesa';
    const button = natureza === 'receita' ? 'Adicionar outra receita' : 'Adicionar outra despesa';
    return `<div class="space-y-3"><div class="flex items-center justify-between gap-3"><h5 class="text-sm font-extrabold uppercase tracking-wide ${natureza === 'receita' ? 'text-emerald-800' : 'text-rose-800'}">${title}</h5><button type="button" data-finance-batch-action="${action}" class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">+ ${button}</button></div><div class="space-y-3">${checklistCatalog.filter((item) => item.natureza === natureza).map(checklistRow).join('')}<div data-finance-batch-check-extra="${natureza}" class="space-y-3"></div></div></div>`;
  }
  function renderChecklist() {
    return `<section class="rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-5 shadow-sm sm:p-6" aria-label="Checklist de lançamentos típicos"><div class="flex flex-col gap-3 border-b border-blue-200 pb-4 sm:flex-row sm:items-start sm:justify-between"><div><p class="text-xs font-extrabold uppercase tracking-wide text-blue-800">Etapa 2 · checklist guiado</p><h4 class="mt-1 text-xl font-extrabold text-slate-950">Selecione os lançamentos deste stand</h4><p class="mt-2 max-w-3xl text-sm leading-6 text-slate-700">Marque somente o que faz parte deste fechamento. Nada é gravado antes da revisão no modal.</p></div><span class="shrink-0 rounded-full bg-blue-700 px-3 py-1 text-xs font-bold text-white">Rascunho protegido</span></div><div class="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-2">${checklistSection('Receitas', 'receita')}${checklistSection('Despesas', 'despesa')}</div><div class="mt-6 flex flex-col gap-3 border-t border-blue-200 pt-5 sm:flex-row sm:items-center sm:justify-between"><p class="text-xs leading-5 text-slate-600">A revisão adiciona apenas itens ao rascunho. A geração das receitas e despesas reais continua na confirmação final do lote.</p><button type="button" data-finance-batch-action="revisar-itens-checklist" class="w-full shrink-0 rounded-xl bg-blue-700 px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 sm:w-auto"><i class="fas fa-clipboard-check mr-2"></i>Revisar itens selecionados</button></div></section>`;
  }
  function renderItemForm() {
    return `<div class="space-y-5">${renderChecklist()}<details class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><summary class="cursor-pointer text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600">Lançamento personalizado <span class="ml-2 text-sm font-normal text-slate-500">Para categorias ou parcelamentos fora do checklist</span></summary><div class="mt-5 border-t border-slate-100 pt-5">${renderCustomItemForm()}</div></details></div>`;
  }
  function appendChecklistExtra(natureza) {
    const host = document.querySelector(`[data-finance-batch-check-extra="${natureza}"]`);
    if (!host) return;
    const count = ++state.checklistExtraIndex;
    const item = natureza === 'receita'
      ? { id: `outra-receita-${count}`, natureza: 'receita', categoria: 'adicional', titulo: 'Outra receita', descricaoLivre: true }
      : { id: `outra-despesa-${count}`, natureza: 'despesa', categoria: 'outros', titulo: 'Outra despesa', descricaoLivre: true };
    host.insertAdjacentHTML('beforeend', checklistRow(item));
  }
  function refreshChecklistInstallments(row) {
    const count = Math.max(1, Math.min(60, Number.parseInt(row?.querySelector('[data-finance-batch-check-installments]')?.value || '1', 10) || 1));
    const grid = row?.querySelector('[data-finance-batch-check-installments-grid]');
    if (!grid) return;
    const dates = [...grid.querySelectorAll('[data-finance-batch-check-date]')].map((input) => input.value);
    const values = [...grid.querySelectorAll('[data-finance-batch-check-installment-value]')].map((input) => input.value);
    grid.innerHTML = checklistInstallments(count, dates, values);
    refreshChecklistInstallmentsTotal(row);
  }
  function refreshChecklistInstallmentsTotal(row) {
    if (!row) return;
    const total = amountCents(row.querySelector('[data-finance-batch-check-total]')?.value);
    const valuesInputs = [...row.querySelectorAll('[data-finance-batch-check-installment-value]')];
    const status = row.querySelector('[data-finance-batch-check-installments-status]');
    if (!status) return;
    const values = valuesInputs.map((input) => amountCents(input.value));
    if (total && values.length && values.every((value) => value == null)) valuesInputs.forEach((input, index) => { input.value = equalValues(total, valuesInputs.length)[index]; });
    const resolved = valuesInputs.map((input) => amountCents(input.value));
    if (!total || resolved.some((value) => value == null)) { status.className = 'mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800'; status.textContent = 'Informe o valor total e o valor de cada parcela.'; return; }
    const sum = resolved.reduce((acc, value) => acc + value, 0);
    if (sum !== total) { status.className = 'mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800'; status.textContent = `Soma das parcelas: ${currency(sum / 100)}. Ajuste para atingir ${currency(total / 100)}.`; return; }
    status.className = 'mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800'; status.textContent = `Soma das parcelas conferida: ${currency(total / 100)}.`;
  }
  function collectChecklistItems() {
    const rows = [...document.querySelectorAll('[data-finance-batch-check-row]')].filter((row) => row.querySelector('[data-finance-batch-check-toggle]')?.checked);
    if (!rows.length) throw new Error('Selecione ao menos uma receita ou despesa do checklist.');
    return rows.map((row) => {
      const title = row.dataset.financeBatchCheckTitulo || 'Lançamento';
      const valorTotal = row.querySelector('[data-finance-batch-check-total]')?.value || '';
      const total = amountCents(valorTotal);
      if (!total) throw new Error(`${title}: informe um valor válido.`);
      const descricao = row.dataset.financeBatchCheckLivre === 'true' ? String(row.querySelector('[data-finance-batch-check-description]')?.value || '').trim() : String(row.dataset.financeBatchCheckDescricao || '').trim();
      if (!descricao) throw new Error(`${title}: informe a descrição.`);
      const parcelavel = row.dataset.financeBatchCheckParcelavel === 'true';
      const parcelas = parcelavel ? Math.max(1, Math.min(60, Number.parseInt(row.querySelector('[data-finance-batch-check-installments]')?.value || '1', 10) || 1)) : 1;
      const datasVencimento = [...row.querySelectorAll('[data-finance-batch-check-date]')].map((input) => input.value);
      const valoresParcelas = parcelavel ? [...row.querySelectorAll('[data-finance-batch-check-installment-value]')].map((input) => input.value) : [valorTotal];
      const values = valoresParcelas.map(amountCents);
      if (datasVencimento.length !== parcelas || datasVencimento.some((date) => !date)) throw new Error(`${title}: informe o vencimento de cada parcela.`);
      if (values.length !== parcelas || values.some((value) => value == null) || values.reduce((sum, value) => sum + value, 0) !== total) throw new Error(`${title}: a soma das parcelas deve ser igual ao valor total.`);
      return { natureza: row.dataset.financeBatchCheckNatureza, categoria: row.dataset.financeBatchCheckCategoria, descricao, valorTotal, parcelas, primeiroVencimento: datasVencimento[0], datasVencimento, valoresParcelas, formaPagamento: row.querySelector('[data-finance-batch-check-payment]')?.value || '' };
    });
  }
  function closeChecklistReview() { document.getElementById('finance-batch-checklist-review')?.remove(); state.pendingChecklistItems = []; }
  function openChecklistReview() {
    const items = collectChecklistItems();
    closeChecklistReview(); state.pendingChecklistItems = items;
    const modal = document.createElement('div');
    modal.id = 'finance-batch-checklist-review'; modal.className = 'fixed inset-0 z-[120] flex items-end bg-slate-950/60 p-0 sm:items-center sm:justify-center sm:p-5';
    modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'finance-batch-checklist-review-title');
    const total = items.reduce((sum, item) => sum + (amountCents(item.valorTotal) || 0), 0);
    modal.innerHTML = `<div class="w-full max-w-3xl rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-7"><div class="flex items-start gap-4"><span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-800"><i class="fas fa-clipboard-check text-lg"></i></span><div><p class="text-xs font-extrabold uppercase tracking-wide text-blue-800">Revisão antes de salvar</p><h3 id="finance-batch-checklist-review-title" class="mt-1 text-xl font-extrabold text-slate-950">Adicionar ${items.length} item(ns) ao rascunho?</h3><p class="mt-2 text-sm leading-6 text-slate-600">Esta ação cria somente os itens do lote. As receitas e despesas reais permanecerão pendentes até a confirmação final do lote.</p></div></div><ul class="mt-5 max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">${items.map((item) => `<li class="flex items-center justify-between gap-3 px-4 py-3"><div><p class="font-bold text-slate-900">${esc(item.descricao)}</p><p class="text-xs text-slate-500">${item.natureza === 'receita' ? 'Receita' : 'Despesa'} · ${esc(item.categoria)} · ${item.parcelas}x</p></div><strong class="shrink-0 ${item.natureza === 'receita' ? 'text-emerald-700' : 'text-rose-700'}">${currency((amountCents(item.valorTotal) || 0) / 100)}</strong></li>`).join('')}</ul><div class="mt-4 flex items-center justify-between rounded-lg bg-slate-100 px-4 py-3"><span class="text-sm font-bold text-slate-700">Valor total selecionado</span><strong class="text-lg text-slate-950">${currency(total / 100)}</strong></div><div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" data-finance-batch-action="cancelar-itens-checklist" class="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Voltar e revisar</button><button type="button" data-finance-batch-action="confirmar-itens-checklist" class="rounded-xl bg-blue-700 px-5 py-3 text-sm font-extrabold text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200"><i class="fas fa-save mr-2"></i>Salvar itens no rascunho</button></div></div>`;
    document.body.appendChild(modal); modal.querySelector('[data-finance-batch-action="confirmar-itens-checklist"]')?.focus?.();
  }
  async function submitChecklistItems() {
    const lote = state.lote?.lote;
    if (!lote || !state.pendingChecklistItems.length) return;
    const button = document.querySelector('[data-finance-batch-action="confirmar-itens-checklist"]');
    if (button) { button.disabled = true; button.textContent = 'Salvando itens...'; }
    const response = await api(`/api/crm/lotes-financeiros/${encodeURIComponent(lote.id)}/itens-em-lote`, { method: 'POST', body: JSON.stringify({ itens: state.pendingChecklistItems }) });
    closeChecklistReview(); state.lote = response.lote; renderWorkspace();
    message(`${response.itemIds?.length || 0} item(ns) adicionados ao rascunho. Revise e faça a confirmação final quando estiver pronto.`, 'success');
  }
  function refreshDueDates() {
    const parcelas = Math.max(1, Math.min(60, Number.parseInt(document.querySelector('[data-finance-batch-item-parcelas]')?.value || '1', 10) || 1));
    const container = document.querySelector('[data-finance-batch-item-datas]');
    const summary = document.querySelector('[data-finance-batch-item-parcel-summary]');
    if (!container) return;
    const dates = [...container.querySelectorAll('[data-finance-batch-item-data-parcela]')].map((input) => input.value);
    const values = [...container.querySelectorAll('[data-finance-batch-item-valor-parcela]')].map((input) => input.value);
    container.innerHTML = installmentInputs(parcelas, dates, values);
    if (summary) summary.textContent = `${parcelas} ${parcelas === 1 ? 'parcela' : 'parcelas'}`;
    refreshParcelTotal();
  }
  function refreshParcelTotal() {
    const totalInput = document.querySelector('[data-finance-batch-item-valor]');
    const valueInputs = [...document.querySelectorAll('[data-finance-batch-item-valor-parcela]')];
    const status = document.querySelector('[data-finance-batch-item-totalizador]');
    if (!status) return;
    const totalCents = amountCents(totalInput?.value);
    const values = valueInputs.map((input) => amountCents(input.value));
    if (totalCents && values.length && values.every((value) => value == null)) {
      const suggestions = equalValues(totalCents, values.length);
      valueInputs.forEach((input, index) => { input.value = suggestions[index]; });
    }
    const finalValues = valueInputs.map((input) => amountCents(input.value));
    if (!totalCents || finalValues.some((value) => value == null)) {
      status.className = 'mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800';
      status.textContent = 'Informe o valor total e o valor de cada parcela.';
      return;
    }
    const sum = finalValues.reduce((acc, value) => acc + value, 0);
    if (sum === totalCents) {
      status.className = 'mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800';
      status.textContent = `Soma das parcelas: ${currency(sum / 100)}. Valor total conferido.`;
      return;
    }
    const difference = totalCents - sum;
    status.className = 'mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800';
    status.textContent = `Soma das parcelas: ${currency(sum / 100)}. Ajuste ${difference > 0 ? 'mais' : 'menos'} ${currency(Math.abs(difference) / 100)} para atingir ${currency(totalCents / 100)}.`;
  }
  function refreshClientSelect() {
    const search = document.querySelector('[data-finance-batch-client-search]');
    const select = document.querySelector('[data-finance-batch-client]');
    const count = document.querySelector('[data-finance-batch-client-count]');
    if (!select) return;
    const previous = select.value;
    const term = String(search?.value || '');
    const results = searchClient(term);
    const resultsHost = document.querySelector('[data-finance-batch-client-results-host]');
    select.innerHTML = clientOptions(previous, term);
    if (resultsHost) resultsHost.innerHTML = clientSearchResultsMarkup(term);
    if (term.trim() && results.length === 1) {
      select.value = String(results[0].id);
      if (count) count.textContent = `1 cliente encontrado e selecionado automaticamente.`;
    } else {
      if (previous) select.value = previous;
      if (count) count.textContent = term.trim()
        ? `${results.length} cliente(s) encontrado(s). Selecione um resultado abaixo.`
        : `${state.clientes.length} clientes disponíveis para busca.`;
    }
    updateCentroCusto();
  }
  function refreshEventSelect() {
    const search = document.querySelector('[data-finance-batch-event-search]');
    const select = document.querySelector('[data-finance-batch-event]');
    const count = document.querySelector('[data-finance-batch-event-count]');
    if (!select) return;
    const previous = select.value;
    const term = String(search?.value || '');
    const results = searchEvent(term);
    const resultsHost = document.querySelector('[data-finance-batch-event-results-host]');
    select.innerHTML = eventOptions(previous, term);
    if (resultsHost) resultsHost.innerHTML = eventSearchResultsMarkup(term);
    if (term.trim() && results.length === 1) {
      select.value = String(results[0].id);
      if (count) count.textContent = '1 evento encontrado e selecionado automaticamente.';
    } else {
      if (previous) select.value = previous;
      if (count) count.textContent = term.trim()
        ? `${results.length} evento(s) encontrado(s). Selecione um resultado abaixo.`
        : `${state.eventos.length} eventos disponíveis para busca.`;
    }
    updateCentroCusto();
  }
  function updateCentroCusto() {
    const client = state.clientes.find((item) => String(item.id) === String(document.querySelector('[data-finance-batch-client]')?.value || ''));
    const evento = state.eventos.find((item) => String(item.id) === String(document.querySelector('[data-finance-batch-event]')?.value || ''));
    const stand = String(document.querySelector('[data-finance-batch-stand]')?.value || '').trim();
    const centro = document.querySelector('[data-finance-batch-centro]');
    if (!centro || centro.dataset.manual === 'true') return;
    centro.value = [client ? clientName(client) : '', evento ? eventName(evento) : '', stand].filter(Boolean).join(' · ');
  }
  function renderWorkspace() {
    const workspace = document.getElementById('finance-batch-workspace');
    if (workspace) workspace.innerHTML = state.lote?.lote ? renderLoteWorkspace() : renderContextForm();
  }
  async function createLote() {
    const clienteId = document.querySelector('[data-finance-batch-client]')?.value;
    const eventoId = document.querySelector('[data-finance-batch-event]')?.value;
    const identificacaoStand = document.querySelector('[data-finance-batch-stand]')?.value;
    const centroCusto = document.querySelector('[data-finance-batch-centro]')?.value;
    const observacoes = document.querySelector('[data-finance-batch-observacoes]')?.value;
    if (!clienteId || !eventoId || !identificacaoStand?.trim() || !centroCusto?.trim()) return message('Informe Cliente, Evento, identificação do stand e centro de custo.', 'error');
    const payload = await api('/api/crm/lotes-financeiros', { method: 'POST', body: JSON.stringify({ clienteId, eventoId, identificacaoStand, centroCusto, observacoes }) });
    state.lote = payload.lote;
    renderWorkspace();
    message('Lote criado em rascunho. Adicione as receitas e despesas para revisão.', 'success');
  }
  async function addItem() {
    const lote = state.lote?.lote;
    if (!lote) return;
    const valorTotal = document.querySelector('[data-finance-batch-item-valor]')?.value;
    const valoresParcelas = [...document.querySelectorAll('[data-finance-batch-item-valor-parcela]')].map((input) => input.value);
    const totalCents = amountCents(valorTotal);
    const valoresCents = valoresParcelas.map(amountCents);
    if (!totalCents || valoresCents.some((value) => value == null) || valoresCents.reduce((sum, value) => sum + value, 0) !== totalCents) return message('Confira os valores das parcelas: a soma precisa ser exatamente igual ao valor total.', 'error');
    const payload = {
      natureza: document.querySelector('[data-finance-batch-item-natureza]')?.value,
      categoria: document.querySelector('[data-finance-batch-item-categoria]')?.value,
      descricao: document.querySelector('[data-finance-batch-item-descricao]')?.value,
      valorTotal,
      parcelas: document.querySelector('[data-finance-batch-item-parcelas]')?.value,
      primeiroVencimento: document.querySelector('[data-finance-batch-item-data-parcela]')?.value,
      datasVencimento: [...document.querySelectorAll('[data-finance-batch-item-data-parcela]')].map((input) => input.value),
      valoresParcelas,
      formaPagamento: document.querySelector('[data-finance-batch-item-forma]')?.value,
      observacoes: document.querySelector('[data-finance-batch-item-observacoes]')?.value,
    };
    const response = await api(`/api/crm/lotes-financeiros/${encodeURIComponent(lote.id)}/itens`, { method: 'POST', body: JSON.stringify(payload) });
    state.lote = response.lote;
    renderWorkspace();
    message('Item adicionado ao rascunho do lote.', 'success');
  }
  async function removeItem(itemId) {
    const lote = state.lote?.lote;
    if (!lote || !itemId) return;
    const response = await api(`/api/crm/lotes-financeiros/${encodeURIComponent(lote.id)}/itens/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
    state.lote = response.lote;
    renderWorkspace();
  }
  async function confirmLote() {
    const lote = state.lote?.lote;
    if (!lote) return;
    const itemCount = state.lote.itens?.length || 0;
    if (!itemCount) return message('Adicione ao menos uma receita ou despesa antes de confirmar.', 'error');
    if (!window.confirm(`Confirmar ${itemCount} item(ns) do lote? Esta ação criará as contas a receber e despesas correspondentes e não poderá ser desfeita por este guia.`)) return;
    const response = await api(`/api/crm/lotes-financeiros/${encodeURIComponent(lote.id)}/confirmar`, { method: 'POST', body: JSON.stringify({ confirmacaoHumana: true }) });
    state.lote = response.lote;
    renderWorkspace();
    showConfirmationSuccess(response.lancamentos || []);
    const total = response.lancamentos?.reduce((sum, entry) => sum + (entry.lancamentos?.length || 0), 0) || 0;
    message(`Lote confirmado com sucesso: ${total} lançamento(s) financeiro(s) criado(s).`, 'success');
  }
  function showConfirmationSuccess(entries) {
    const records = entries.flatMap((entry) => Array.isArray(entry?.lancamentos) ? entry.lancamentos : []);
    const receitas = records.filter((record) => record?.tipo === 'conta_receber').length;
    const despesas = records.filter((record) => record?.tipo === 'transacao').length;
    const previous = document.getElementById('finance-batch-confirmation-success');
    if (previous) previous.remove();
    const toast = document.createElement('aside');
    toast.id = 'finance-batch-confirmation-success';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.className = 'fixed right-4 top-4 z-[60] w-[calc(100vw-2rem)] max-w-md rounded-xl border-2 border-emerald-400 bg-white p-5 shadow-2xl';
    toast.innerHTML = `<div class="flex items-start gap-3"><span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><i class="fas fa-check" aria-hidden="true"></i></span><div class="min-w-0 flex-1"><p class="text-xs font-bold uppercase tracking-wide text-emerald-700">Lançamentos confirmados</p><h4 class="mt-1 text-base font-bold text-slate-900">Sucesso: ${records.length} lançamento(s) criado(s)</h4><p class="mt-1 text-sm leading-5 text-slate-600">${receitas ? `${receitas} Conta(s) a Receber` : ''}${receitas && despesas ? ' e ' : ''}${despesas ? `${despesas} Despesa(s)` : ''} foram incluídas como pendentes no Financeiro.</p><div class="mt-4 flex flex-wrap gap-2">${receitas ? '<button type="button" data-finance-batch-action="ver-receitas" class="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800">Ver Receitas</button>' : ''}${despesas ? '<button type="button" data-finance-batch-action="ver-despesas" class="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100">Ver Despesas</button>' : ''}<button type="button" data-finance-batch-action="fechar-sucesso" class="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">Fechar</button></div></div></div>`;
    document.body.appendChild(toast);
    toast.querySelector('[data-finance-batch-action="ver-receitas"], [data-finance-batch-action="ver-despesas"], [data-finance-batch-action="fechar-sucesso"]')?.focus?.();
  }
  function openFinancePage(page) {
    const navigation = window.NavigationSystem;
    if (typeof navigation?.navigateToModule !== 'function' || typeof navigation?.navigateToPage !== 'function') return message('Não foi possível abrir a lista financeira agora. Use o menu Financeiro.', 'error');
    navigation.navigateToModule('financeiro');
    navigation.navigateToPage('financeiro', page);
  }
  function bind() {
    if (state.bound) return;
    state.bound = true;
    document.addEventListener('input', (event) => {
      const target = event.target;
      if (target?.matches?.('[data-finance-batch-client-search]')) {
        refreshClientSelect();
        buscarClientesAtualizados();
      }
      if (target?.matches?.('[data-finance-batch-event-search]')) refreshEventSelect();
      if (target?.matches?.('[data-finance-batch-stand]')) updateCentroCusto();
      if (target?.matches?.('[data-finance-batch-centro]')) target.dataset.manual = 'true';
      if (target?.matches?.('[data-finance-batch-item-parcelas]')) refreshDueDates();
      if (target?.matches?.('[data-finance-batch-item-valor], [data-finance-batch-item-valor-parcela]')) refreshParcelTotal();
      if (target?.matches?.('[data-finance-batch-check-total], [data-finance-batch-check-installment-value]')) refreshChecklistInstallmentsTotal(target.closest('[data-finance-batch-check-row]'));
    });
    document.addEventListener('change', (event) => {
      const target = event.target;
      if (target?.matches?.('[data-finance-batch-client], [data-finance-batch-event]')) updateCentroCusto();
      if (target?.matches?.('[data-finance-batch-item-parcelas]')) refreshDueDates();
      if (target?.matches?.('[data-finance-batch-item-valor], [data-finance-batch-item-valor-parcela]')) refreshParcelTotal();
      if (target?.matches?.('[data-finance-batch-check-toggle]')) {
        const row = target.closest('[data-finance-batch-check-row]');
        const content = row?.querySelector('[data-finance-batch-check-content]');
        if (content) { content.classList.toggle('hidden', !target.checked); content.setAttribute('aria-hidden', target.checked ? 'false' : 'true'); }
      }
      if (target?.matches?.('[data-finance-batch-check-installments]')) refreshChecklistInstallments(target.closest('[data-finance-batch-check-row]'));
      if (target?.matches?.('[data-finance-batch-item-natureza]')) {
        const category = document.querySelector('[data-finance-batch-item-categoria]');
        if (category) category.innerHTML = categoryOptions(target.value, target.value === 'receita' ? 'venda_stand' : 'projeto');
      }
    });
    document.addEventListener('click', async (event) => {
      const clientResult = event.target?.closest?.('[data-finance-batch-client-result]');
      if (clientResult) {
        event.preventDefault();
        const search = document.querySelector('[data-finance-batch-client-search]');
        const select = document.querySelector('[data-finance-batch-client]');
        const count = document.querySelector('[data-finance-batch-client-count]');
        const client = state.clientes.find((item) => String(item.id) === String(clientResult.dataset.financeBatchClientResult));
        if (!client || !select) return;
        if (search) search.value = clientName(client);
        refreshClientSelect();
        select.value = String(client.id);
        if (count) count.textContent = `${clientName(client)} selecionado para o lote.`;
        updateCentroCusto();
        return;
      }
      const eventResult = event.target?.closest?.('[data-finance-batch-event-result]');
      if (eventResult) {
        event.preventDefault();
        const search = document.querySelector('[data-finance-batch-event-search]');
        const select = document.querySelector('[data-finance-batch-event]');
        const count = document.querySelector('[data-finance-batch-event-count]');
        const evento = state.eventos.find((item) => String(item.id) === String(eventResult.dataset.financeBatchEventResult));
        if (!evento || !select) return;
        if (search) search.value = eventName(evento);
        refreshEventSelect();
        select.value = String(evento.id);
        if (count) count.textContent = `${eventName(evento)} selecionado para o lote.`;
        updateCentroCusto();
        return;
      }
      const action = event.target?.closest?.('[data-finance-batch-action]');
      if (!action) return;
      event.preventDefault();
      try {
        if (action.dataset.financeBatchAction === 'criar') await createLote();
        if (action.dataset.financeBatchAction === 'novo') { state.lote = null; renderWorkspace(); }
        if (action.dataset.financeBatchAction === 'adicionar-item') await addItem();
        if (action.dataset.financeBatchAction === 'revisar-itens-checklist') openChecklistReview();
        if (action.dataset.financeBatchAction === 'confirmar-itens-checklist') await submitChecklistItems();
        if (action.dataset.financeBatchAction === 'cancelar-itens-checklist') closeChecklistReview();
        if (action.dataset.financeBatchAction === 'adicionar-outra-receita') appendChecklistExtra('receita');
        if (action.dataset.financeBatchAction === 'adicionar-outra-despesa') appendChecklistExtra('despesa');
        if (action.dataset.financeBatchAction === 'remover-item') await removeItem(action.dataset.itemId);
        if (action.dataset.financeBatchAction === 'ver-receitas') openFinancePage('receitas');
        if (action.dataset.financeBatchAction === 'ver-despesas') openFinancePage('custos');
        if (action.dataset.financeBatchAction === 'confirmar') await confirmLote();
        if (action.dataset.financeBatchAction === 'fechar-sucesso') document.getElementById('finance-batch-confirmation-success')?.remove();
      } catch (error) { message(error?.message || 'Não foi possível concluir a ação.', 'error'); }
    });
  }
  async function load() {
    if (!document.querySelector('[data-finance-batch-page]') || state.loading) return;
    state.loading = true;
    try {
      [state.clientes, state.eventos] = await Promise.all([fetchAll('/api/crm/clientes'), fetchAll('/api/crm/eventos')]);
      if (!state.lote?.lote) renderWorkspace();
    } catch (error) { message(error?.message || 'Não foi possível carregar clientes e eventos.', 'error'); }
    finally { state.loading = false; }
  }
  window.LoteFinanceiroModule = { render, load, bind };
  bind();
})();
