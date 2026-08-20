// SAMS Locações — Lote Financeiro por Stand
// Organiza receitas e despesas em rascunho; a confirmação humana cria os lançamentos de origem.
(function () {
  'use strict';

  const state = { clientes: [], eventos: [], lote: null, loading: false, bound: false };
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
  function clientOptions(selected, term) {
    const results = searchClient(term);
    const selectedClient = state.clientes.find((client) => String(client.id) === String(selected));
    const unique = selectedClient && !results.some((client) => String(client.id) === String(selectedClient.id)) ? [selectedClient, ...results] : results;
    return `<option value="">Selecione o cliente</option>${unique.map((client) => `<option value="${esc(client.id)}" ${String(client.id) === String(selected) ? 'selected' : ''}>${esc(clientName(client))}${client.documento ? ` · ${esc(client.documento)}` : ''}</option>`).join('')}`;
  }
  function eventOptions(selected) {
    return `<option value="">Selecione o evento</option>${state.eventos.map((evento) => `<option value="${esc(evento.id)}" ${String(evento.id) === String(selected) ? 'selected' : ''}>${esc(eventName(evento))}</option>`).join('')}`;
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
        <div class="md:col-span-2"><label class="text-sm font-semibold text-slate-700" for="finance-batch-client-search">Buscar cliente</label><input id="finance-batch-client-search" data-finance-batch-client-search type="search" autocomplete="off" placeholder="Nome, e-mail ou documento" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"><p data-finance-batch-client-count aria-live="polite" class="mt-1 text-xs text-slate-500">${state.clientes.length ? `${state.clientes.length} clientes disponíveis para busca.` : 'Carregando clientes...'}</p></div>
        <div><label class="text-sm font-semibold text-slate-700" for="finance-batch-client">Cliente <span class="text-rose-600">*</span></label><select id="finance-batch-client" data-finance-batch-client class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">${clientOptions('', '')}</select></div>
        <div><label class="text-sm font-semibold text-slate-700" for="finance-batch-event">Evento <span class="text-rose-600">*</span></label><select id="finance-batch-event" data-finance-batch-event class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">${eventOptions('')}</select></div>
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
    return `<div class="space-y-5">
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div class="flex items-center gap-3"><h3 class="text-lg font-bold text-slate-900">${esc(lote.codigo)} · ${esc(lote.identificacao_stand)}</h3>${statusBadge(lote.status)}</div><p class="mt-1 text-sm text-slate-600">${esc(lote.cliente_nome)} · ${esc(lote.evento_nome)}</p><p class="mt-1 text-xs text-slate-500">Centro de custo: ${esc(lote.centro_custo)}</p></div><div class="grid grid-cols-3 gap-2 text-center"><div class="rounded-lg bg-emerald-50 px-3 py-2"><p class="text-xs text-emerald-700">Receitas</p><p class="text-sm font-bold text-emerald-800">${currency(resumo.receitas)}</p></div><div class="rounded-lg bg-rose-50 px-3 py-2"><p class="text-xs text-rose-700">Despesas</p><p class="text-sm font-bold text-rose-800">${currency(resumo.despesas)}</p></div><div class="rounded-lg bg-slate-100 px-3 py-2"><p class="text-xs text-slate-600">Resultado</p><p class="text-sm font-bold text-slate-800">${currency(resumo.resultado_estimado)}</p></div></div></div></div>
      ${confirmed ? `<div class="rounded-xl border border-emerald-200 bg-emerald-50 p-5"><h4 class="font-bold text-emerald-900"><i class="fas fa-check-circle mr-2"></i>Lote confirmado</h4><p class="mt-1 text-sm text-emerald-800">As Contas a Receber e Despesas foram criadas como pendentes no módulo Financeiro. Os registros abaixo são os mesmos lançamentos usados nos formulários financeiros habituais.</p>${createdRecordsMarkup(itens)}</div>` : `${itens.length ? `<div class="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-5 shadow-sm"><div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-xs font-bold uppercase tracking-wide text-emerald-700">3. Criar lançamentos no Financeiro</p><h4 class="mt-1 font-bold text-emerald-950">${itens.length} item(ns) pronto(s) para confirmação humana</h4><p class="mt-1 text-sm text-emerald-800">Ao confirmar, cada receita vira uma Conta a Receber pendente e cada despesa vira uma Despesa pendente, respeitando as datas definidas por parcela.</p></div><button type="button" data-finance-batch-action="confirmar" class="rounded-lg bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800"><i class="fas fa-check-double mr-2"></i>Confirmar no Financeiro</button></div></div>` : ''}${renderItemForm()}`}
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div class="flex items-center justify-between gap-3"><div><h4 class="font-bold text-slate-900">Itens do lote</h4><p class="mt-1 text-sm text-slate-600">${itens.length ? `${itens.length} item(ns) em ${resumo.pendentes} pendência(s) de confirmação.` : 'Adicione receitas e despesas para compor este lote.'}</p></div>${!confirmed && itens.length ? `<button type="button" data-finance-batch-action="confirmar" class="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"><i class="fas fa-check-double mr-2"></i>Revisar e confirmar lançamentos</button>` : ''}</div>
        <div class="mt-5 overflow-x-auto"><table class="min-w-full text-left text-sm"><thead class="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-2 py-3">Natureza</th><th class="px-2 py-3">Descrição</th><th class="px-2 py-3">Categoria</th><th class="px-2 py-3">Valor / parcelas</th><th class="px-2 py-3">Vencimentos</th><th class="px-2 py-3">Status</th><th class="px-2 py-3"></th></tr></thead><tbody>${itens.length ? itens.map((item) => { const dates = Array.isArray(item.datas_vencimento) ? item.datas_vencimento : [item.primeiro_vencimento]; return `<tr class="border-b border-slate-100"><td class="px-2 py-3 font-semibold ${item.natureza === 'receita' ? 'text-emerald-700' : 'text-rose-700'}">${item.natureza === 'receita' ? 'Receita' : 'Despesa'}</td><td class="px-2 py-3 text-slate-800">${esc(item.descricao)}</td><td class="px-2 py-3 text-slate-600">${esc(item.categoria)}</td><td class="px-2 py-3 text-slate-700">${currency(item.valor_total)}<span class="block text-xs text-slate-500">${item.parcelas}x</span></td><td class="px-2 py-3 text-slate-700">${dates.map((date, index) => `<span class="block text-xs">${index + 1}ª: ${esc(formatDate(date))}</span>`).join('')}</td><td class="px-2 py-3">${statusBadge(item.status)}</td><td class="px-2 py-3 text-right">${!confirmed && item.status === 'rascunho' ? `<button type="button" data-finance-batch-action="remover-item" data-item-id="${esc(item.id)}" class="rounded px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50">Remover</button>` : ''}</td></tr>`; }).join('') : '<tr><td colspan="7" class="px-2 py-8 text-center text-slate-500">Nenhum item adicionado.</td></tr>'}</tbody></table></div>${!confirmed && itens.length ? `<section class="sticky bottom-3 z-10 mt-5 rounded-xl border-2 border-emerald-400 bg-emerald-50 p-4 shadow-lg" aria-label="Confirmação dos lançamentos reais"><div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-xs font-bold uppercase tracking-wide text-emerald-700">Etapa final</p><h5 class="mt-1 text-base font-bold text-emerald-950">Criar ${itens.length} item(ns) como lançamentos reais</h5><p class="mt-1 text-sm text-emerald-900">Este botão gera Contas a Receber e Despesas pendentes nas listas normais do Financeiro. A ação exige sua confirmação e não cria duplicatas automaticamente.</p></div><button type="button" data-finance-batch-action="confirmar" class="w-full shrink-0 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 sm:w-auto"><i class="fas fa-check-double mr-2"></i>Confirmar e criar lançamentos</button></div></section>` : ''}
      </div>
    </div>`;
  }
  function dueDateInputs(count, values = []) {
    return Array.from({ length: count }, (_, index) => `<div><label class="text-xs font-semibold text-slate-700">${index + 1}ª parcela <span class="text-rose-600">*</span></label><input type="date" data-finance-batch-item-data-parcela value="${esc(values[index] || '')}" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"></div>`).join('');
  }
  function renderItemForm() {
    return `<div class="rounded-xl border border-blue-200 bg-blue-50/40 p-5 sm:p-6"><div class="mb-4"><h4 class="font-bold text-slate-900">2. Adicione receitas e despesas</h4><p class="mt-1 text-sm text-slate-600">Cada item pode ser parcelado. Informe uma data para cada parcela; o valor informado é o total do item e a última parcela ajusta centavos residuais.</p></div><div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"><div><label class="text-sm font-semibold text-slate-700">Natureza <span class="text-rose-600">*</span></label><select data-finance-batch-item-natureza class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="receita">Receita / crédito</option><option value="despesa">Despesa / débito</option></select></div><div><label class="text-sm font-semibold text-slate-700">Categoria <span class="text-rose-600">*</span></label><select data-finance-batch-item-categoria class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">${categoryOptions('receita', 'venda_stand')}</select></div><div><label class="text-sm font-semibold text-slate-700">Valor total <span class="text-rose-600">*</span></label><input data-finance-batch-item-valor inputmode="decimal" placeholder="0,00" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></div><div class="md:col-span-2"><label class="text-sm font-semibold text-slate-700">Descrição <span class="text-rose-600">*</span></label><input data-finance-batch-item-descricao maxlength="500" placeholder="Ex.: Montagem do stand, 1ª parcela, taxa de energia" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></div><div><label class="text-sm font-semibold text-slate-700">Parcelas</label><input data-finance-batch-item-parcelas type="number" min="1" max="60" value="1" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></div><div class="md:col-span-2 lg:col-span-3 rounded-lg border border-slate-200 bg-white p-4"><div class="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-sm font-bold text-slate-800">Vencimentos por parcela</p><p class="text-xs text-slate-500">Ajuste individualmente cada data antes de adicionar o item.</p></div><span data-finance-batch-item-parcel-summary class="text-xs font-semibold text-blue-700">1 parcela</span></div><div data-finance-batch-item-datas class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">${dueDateInputs(1)}</div></div><div><label class="text-sm font-semibold text-slate-700">Forma de pagamento</label><input data-finance-batch-item-forma maxlength="120" placeholder="Pix, boleto, transferência..." class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></div><div class="md:col-span-2"><label class="text-sm font-semibold text-slate-700">Observações</label><input data-finance-batch-item-observacoes maxlength="4000" placeholder="Opcional" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></div></div><div class="mt-5 flex justify-end"><button type="button" data-finance-batch-action="adicionar-item" class="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"><i class="fas fa-plus mr-2"></i>Adicionar ao lote</button></div></div>`;
  }
  function refreshDueDates() {
    const parcelas = Math.max(1, Math.min(60, Number.parseInt(document.querySelector('[data-finance-batch-item-parcelas]')?.value || '1', 10) || 1));
    const container = document.querySelector('[data-finance-batch-item-datas]');
    const summary = document.querySelector('[data-finance-batch-item-parcel-summary]');
    if (!container) return;
    const values = [...container.querySelectorAll('[data-finance-batch-item-data-parcela]')].map((input) => input.value);
    container.innerHTML = dueDateInputs(parcelas, values);
    if (summary) summary.textContent = `${parcelas} ${parcelas === 1 ? 'parcela' : 'parcelas'}`;
  }
  function refreshClientSelect() {
    const search = document.querySelector('[data-finance-batch-client-search]');
    const select = document.querySelector('[data-finance-batch-client]');
    const count = document.querySelector('[data-finance-batch-client-count]');
    if (!select) return;
    const previous = select.value;
    const term = String(search?.value || '');
    const results = searchClient(term);
    select.innerHTML = clientOptions(previous, term);
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
    const payload = {
      natureza: document.querySelector('[data-finance-batch-item-natureza]')?.value,
      categoria: document.querySelector('[data-finance-batch-item-categoria]')?.value,
      descricao: document.querySelector('[data-finance-batch-item-descricao]')?.value,
      valorTotal: document.querySelector('[data-finance-batch-item-valor]')?.value,
      parcelas: document.querySelector('[data-finance-batch-item-parcelas]')?.value,
      primeiroVencimento: document.querySelector('[data-finance-batch-item-data-parcela]')?.value,
      datasVencimento: [...document.querySelectorAll('[data-finance-batch-item-data-parcela]')].map((input) => input.value),
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
    message(`${response.lancamentos?.reduce((sum, entry) => sum + (entry.lancamentos?.length || 0), 0) || 0} lançamento(s) criado(s) após confirmação humana.`, 'success');
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
      if (target?.matches?.('[data-finance-batch-client-search]')) refreshClientSelect();
      if (target?.matches?.('[data-finance-batch-stand]')) updateCentroCusto();
      if (target?.matches?.('[data-finance-batch-centro]')) target.dataset.manual = 'true';
      if (target?.matches?.('[data-finance-batch-item-parcelas]')) refreshDueDates();
    });
    document.addEventListener('change', (event) => {
      const target = event.target;
      if (target?.matches?.('[data-finance-batch-client], [data-finance-batch-event]')) updateCentroCusto();
      if (target?.matches?.('[data-finance-batch-item-parcelas]')) refreshDueDates();
      if (target?.matches?.('[data-finance-batch-item-natureza]')) {
        const category = document.querySelector('[data-finance-batch-item-categoria]');
        if (category) category.innerHTML = categoryOptions(target.value, target.value === 'receita' ? 'venda_stand' : 'projeto');
      }
    });
    document.addEventListener('click', async (event) => {
      const action = event.target?.closest?.('[data-finance-batch-action]');
      if (!action) return;
      event.preventDefault();
      try {
        if (action.dataset.financeBatchAction === 'criar') await createLote();
        if (action.dataset.financeBatchAction === 'novo') { state.lote = null; renderWorkspace(); }
        if (action.dataset.financeBatchAction === 'adicionar-item') await addItem();
        if (action.dataset.financeBatchAction === 'remover-item') await removeItem(action.dataset.itemId);
        if (action.dataset.financeBatchAction === 'ver-receitas') openFinancePage('receitas');
        if (action.dataset.financeBatchAction === 'ver-despesas') openFinancePage('custos');
        if (action.dataset.financeBatchAction === 'confirmar') await confirmLote();
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
