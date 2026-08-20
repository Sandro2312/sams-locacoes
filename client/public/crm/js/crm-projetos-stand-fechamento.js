/* Guia de fechamento por stand — extensão não destrutiva do módulo Projetos de Stand. */
(function () {
  'use strict';

  const categories = [
    ['receita_parcelas', 'Receita e parcelas', 'Defina a referência comercial e cadastre cada parcela de recebimento.', 'contasReceber'],
    ['projeto', 'Projeto e projetista', 'Custo de criação, projeto executivo ou projetista.', 'transacoes'],
    ['montagem', 'Produção e montagem', 'Materiais, fornecedores e mão de obra de montagem.', 'transacoes'],
    ['taxas', 'Taxas do evento', 'Taxas, credenciais, energia, seguro e obrigações do evento.', 'transacoes'],
    ['comissao_comercial', 'Comissão comercial', 'Comissão de venda ou representação comercial.', 'transacoes'],
    ['comissao_projetista', 'Comissão de projetista', 'Comissão ou remuneração vinculada ao projeto.', 'transacoes'],
    ['logistica', 'Logística e frete', 'Frete, transporte, armazenagem e deslocamentos.', 'transacoes'],
    ['desmontagem', 'Desmontagem', 'Desmontagem, retorno e descarte quando aplicável.', 'transacoes'],
    ['rateios', 'Rateios compartilhados', 'Custos compartilhados aprovados e alocados ao stand.', null],
  ];
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const currentUser = () => window.AuthSystem?.getCurrentUser?.() || window.AuthSystem?.currentUser || null;
  const canClose = () => ['admin', 'administrador', 'manager', 'gerente', 'gerencia', 'desenvolvedor', 'developer', 'financeiro'].includes(String(currentUser()?.role || '').toLowerCase());
  const headers = () => { try { return window.AuthSystem?._getAuthHeaders?.() || {}; } catch { return {}; } };
  const message = (text, type = 'success') => { if (window.Toast?.show) window.Toast.show(text, type); else window.alert(text); };
  const stateLabel = (value) => ({ pendente: 'Pendente de informação', estimado: 'Estimado / pendente de lançamento', lancado: 'Lançado e vinculado', nao_aplicavel: 'Não aplicável' }[String(value || '').toLowerCase()] || 'Pendente de informação');
  const closingLabel = (value) => ({ planejamento: 'Em planejamento', em_preenchimento: 'Em preenchimento', pendente_revisao: 'Pronto para revisão', fechado: 'Fechado' }[String(value || '').toLowerCase()] || 'Em planejamento');

  async function api(projectId, options = {}) {
    const response = await fetch(`/api/crm/projetos-stand/${encodeURIComponent(projectId)}/fechamento`, { credentials: 'include', ...options, headers: { ...headers(), ...(options.headers || {}) } });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('Sua sessão expirou. Faça login novamente.');
    if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar o guia de fechamento.');
    return payload;
  }

  function markup(data) {
    const project = data.projeto || {};
    const closing = data.fechamento || {};
    const finance = data.financeiro || {};
    const reference = data.referencia_comercial || null;
    const checklist = new Map((Array.isArray(data.checklist) ? data.checklist : []).map((item) => [String(item.categoria), item]));
    const divergences = Array.isArray(data.pendencias?.divergencias) ? data.pendencias.divergencias : [];
    const status = String(closing.status || 'planejamento');
    return `<div id="projeto-stand-guide-modal" class="fixed inset-0 z-[1100] flex items-start justify-center overflow-y-auto bg-black/60 p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="projeto-stand-guide-title">
      <div class="my-2 w-full max-w-6xl rounded-xl bg-slate-50 shadow-2xl">
        <form id="projeto-stand-guide-form" class="p-4 sm:p-6">
          <div class="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div><p class="text-xs font-semibold uppercase tracking-wide text-emerald-700">Guia de fechamento por stand</p><h3 id="projeto-stand-guide-title" class="mt-1 text-xl font-bold text-slate-900">${esc(project.nome || 'Projeto de Stand')}</h3><p class="mt-1 text-sm text-slate-600">${esc(project.evento_nome || 'Evento')} · ${esc(project.cliente_nome || 'Cliente / lead')} · ${esc(project.codigo || '')}</p></div>
            <button type="button" data-guide-action="close" class="self-end text-2xl text-slate-400 hover:text-slate-700" aria-label="Fechar guia">&times;</button>
          </div>
          <div class="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><strong>Como usar:</strong> marque cada categoria, informe estimativas quando houver e use os atalhos para abrir os formulários existentes já vinculados ao stand. Nenhum lançamento é criado até você revisar e salvar o formulário financeiro.</div>
          <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div class="rounded-lg bg-white p-4 shadow-sm"><p class="text-xs font-semibold uppercase text-slate-500">Venda aprovada</p><p class="mt-1 text-lg font-bold text-emerald-700">${reference ? money(reference.valor_venda_final) : 'Sem versão aprovada'}</p><p class="mt-1 text-xs text-slate-500">${reference ? `V${esc(reference.numero_versao)} · ${esc(reference.titulo || '')}` : 'Use o Orçamento Técnico como referência.'}</p></div>
            <div class="rounded-lg bg-white p-4 shadow-sm"><p class="text-xs font-semibold uppercase text-slate-500">Parcelas programadas</p><p class="mt-1 text-lg font-bold text-slate-900">${money(finance.valor_programado)}</p><p class="mt-1 text-xs text-slate-500">${Number(finance.parcelas || 0)} parcela(s) · recebidas: ${money(finance.valor_recebido)}</p></div>
            <div class="rounded-lg bg-white p-4 shadow-sm"><p class="text-xs font-semibold uppercase text-slate-500">Custos</p><p class="mt-1 text-lg font-bold text-rose-700">${money(finance.custo_total_lancado)}</p><p class="mt-1 text-xs text-slate-500">Checklist: ${money(finance.custo_estimado_checklist)} · pagos: ${money(finance.custo_pago)}</p></div>
            <div class="rounded-lg bg-white p-4 shadow-sm"><p class="text-xs font-semibold uppercase text-slate-500">Margem por estágio</p><p class="mt-1 text-lg font-bold ${Number(finance.margem_lancada || 0) >= 0 ? 'text-indigo-700' : 'text-rose-700'}">${money(finance.margem_lancada)}</p><p class="mt-1 text-xs text-slate-500">Estimativa: ${finance.margem_estimada == null ? '-' : money(finance.margem_estimada)}</p></div>
          </div>
          <div class="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
            <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div class="border-b border-slate-200 px-4 py-3"><h4 class="font-semibold text-slate-900">Checklist de receitas e custos</h4><p class="mt-1 text-xs text-slate-500">“Estimado” mantém a pendência visível; “Lançado” indica que a categoria já foi revisada no Financeiro.</p></div>
              <div class="divide-y divide-slate-100">${categories.map(([category, label, helper, module]) => {
                const item = checklist.get(category) || { estado: 'pendente', valor_estimado: '', observacao: '' };
                return `<div class="p-4" data-guide-category="${category}"><div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div class="min-w-0"><h5 class="font-semibold text-slate-800">${esc(label)}</h5><p class="mt-1 text-xs text-slate-500">${esc(helper)}</p></div>${module ? `<button type="button" data-guide-action="launch" data-module="${module}" data-category="${category}" class="shrink-0 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">${module === 'contasReceber' ? 'Criar parcela' : 'Lançar despesa'}</button>` : '<span class="shrink-0 text-xs font-medium text-slate-500">Conferido por rateios aprovados</span>'}</div><div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_150px]"><label class="text-xs font-medium text-slate-600">Situação<select name="estado_${category}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="pendente" ${item.estado === 'pendente' ? 'selected' : ''}>${stateLabel('pendente')}</option><option value="estimado" ${item.estado === 'estimado' ? 'selected' : ''}>${stateLabel('estimado')}</option><option value="lancado" ${item.estado === 'lancado' ? 'selected' : ''}>${stateLabel('lancado')}</option><option value="nao_aplicavel" ${item.estado === 'nao_aplicavel' ? 'selected' : ''}>${stateLabel('nao_aplicavel')}</option></select></label><label class="text-xs font-medium text-slate-600">Valor estimado<input name="valor_${category}" value="${item.valor_estimado == null ? '' : esc(String(item.valor_estimado))}" inputmode="decimal" placeholder="Opcional" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"></label></div><label class="mt-3 block text-xs font-medium text-slate-600">Observação / justificativa<textarea name="observacao_${category}" rows="2" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Ex.: fornecedor definido; cobrança pendente de nota">${esc(item.observacao || '')}</textarea></label></div>`;
              }).join('')}</div>
            </div>
            <aside class="space-y-4"><div class="rounded-xl border border-slate-200 bg-white p-4"><label class="block text-sm font-semibold text-slate-700">Estado do guia<select name="status" class="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="planejamento" ${status === 'planejamento' ? 'selected' : ''}>${closingLabel('planejamento')}</option><option value="em_preenchimento" ${status === 'em_preenchimento' ? 'selected' : ''}>${closingLabel('em_preenchimento')}</option><option value="pendente_revisao" ${status === 'pendente_revisao' ? 'selected' : ''}>${closingLabel('pendente_revisao')}</option>${canClose() ? `<option value="fechado" ${status === 'fechado' ? 'selected' : ''}>${closingLabel('fechado')}</option>` : ''}</select></label><label class="mt-4 block text-sm font-semibold text-slate-700">Justificativa de divergência<textarea name="justificativaDivergencia" rows="3" class="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Obrigatória ao fechar com divergência crítica">${esc(closing.justificativa_divergencia || '')}</textarea></label><label class="mt-4 block text-sm font-semibold text-slate-700">Notas de revisão<textarea name="observacoesRevisao" rows="3" class="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Aprendizados, responsável pelo follow-up ou decisão">${esc(closing.observacoes_revisao || '')}</textarea></label>${canClose() ? '<label class="mt-4 flex gap-2 text-xs text-slate-600"><input type="checkbox" name="confirmacaoRevisao" value="true" class="mt-0.5"> Confirmo que revisei valores, pendências e divergências antes de fechar.</label>' : ''}</div><div class="rounded-xl border border-amber-200 bg-amber-50 p-4"><h4 class="font-semibold text-amber-900">Pendências</h4>${divergences.length ? `<ul class="mt-2 space-y-2 text-xs text-amber-900">${divergences.map((item) => `<li>• ${esc(item.mensagem)}</li>`).join('')}</ul>` : '<p class="mt-2 text-xs text-emerald-800">Nenhuma divergência crítica calculada neste momento.</p>'}<p class="mt-3 text-xs text-amber-800">Informações pendentes: ${Number(data.pendencias?.informacao?.length || 0)} · Itens estimados: ${Number(data.pendencias?.lancamento_estimado?.length || 0)}</p></div></aside>
          </div>
          <div class="mt-5 flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end"><button type="button" data-guide-action="close" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Fechar</button><button type="submit" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"><i class="fas fa-save mr-2"></i>Salvar guia</button></div>
        </form>
      </div>
    </div>`;
  }

  function payloadFrom(form) {
    return {
      status: form.querySelector('[name="status"]')?.value || 'em_preenchimento',
      justificativaDivergencia: form.querySelector('[name="justificativaDivergencia"]')?.value || '',
      observacoesRevisao: form.querySelector('[name="observacoesRevisao"]')?.value || '',
      confirmacaoRevisao: Boolean(form.querySelector('[name="confirmacaoRevisao"]')?.checked),
      itens: categories.map(([category]) => ({ categoria: category, estado: form.querySelector(`[name="estado_${category}"]`)?.value || 'pendente', valorEstimado: form.querySelector(`[name="valor_${category}"]`)?.value || null, observacao: form.querySelector(`[name="observacao_${category}"]`)?.value || '' })),
    };
  }

  function financialContext(data, category, module) {
    const project = data.projeto || {};
    const item = categories.find((entry) => entry[0] === category) || ['outros', 'Outro custo', '', module];
    return {
      eventoId: project.evento_id || project.eventoId || '', clienteId: project.cliente_id || project.clienteId || '', projetoStandId: project.id || '',
      centroCusto: project.centro_custo || `${project.evento_nome || 'Evento'} — ${project.cliente_nome || 'Cliente'} — ${project.nome || project.codigo || 'Stand'}`,
      descricao: `${item[1]} — ${project.nome || project.codigo || 'Projeto de Stand'}`, categoria: item[1], tipoReceita: category === 'receita_parcelas' ? 'stand' : undefined,
      status: 'Pendente', tipo: 'pagar', recorrencia: 'nenhuma', recorrenciaQtd: 1,
    };
  }

  function renderFinanceiro() {
    return `<section class="finance-guide-page space-y-5">
      <div class="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-5 sm:p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="max-w-3xl"><p class="text-xs font-semibold uppercase tracking-wide text-emerald-700">Financeiro · lançamento guiado</p><h2 class="mt-1 text-2xl font-bold text-slate-900">Guia de Lançamentos por Stand</h2><p class="mt-2 text-sm leading-6 text-slate-600">Escolha o stand para revisar venda, parcelas, custos e pendências. Os atalhos preenchem o contexto do lançamento; a conferência e o salvamento continuam sob sua responsabilidade.</p></div>
          <button type="button" data-finance-guide-action="resultados" class="shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><i class="fas fa-store mr-2"></i>Ver Resultado por Stand</button>
        </div>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div><label for="finance-guide-project-search" class="text-sm font-semibold text-slate-700">Localize o Cliente, Evento ou Stand</label><input id="finance-guide-project-search" type="search" autocomplete="off" placeholder="Digite nome do cliente, evento, código ou stand" class="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" data-finance-guide-search><p id="finance-guide-project-count" class="mt-2 text-xs text-slate-500">Carregando Clientes e Projetos de Stand...</p></div>
        <label for="finance-guide-project-select" class="mt-5 block text-sm font-semibold text-slate-700">Projeto de Stand encontrado</label><select id="finance-guide-project-select" class="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm" data-finance-guide-select disabled><option value="">Carregando projetos...</option></select>
        <button type="button" data-finance-guide-action="open" disabled class="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"><i class="fas fa-list-check mr-2"></i>Abrir guia do stand selecionado</button>
        <div id="finance-guide-client-without-project" class="mt-4 hidden rounded-lg border border-amber-200 bg-amber-50 p-4"><p class="text-sm font-semibold text-amber-950">Cliente encontrado, mas sem Projeto de Stand vinculado.</p><p class="mt-1 text-xs leading-5 text-amber-900">Para continuar os lançamentos, crie primeiro o Projeto de Stand com Evento, nome do stand e centro de custo.</p><label for="finance-guide-client-select" class="mt-3 block text-xs font-semibold text-amber-950">Cliente encontrado</label><select id="finance-guide-client-select" class="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2.5 text-sm" data-finance-guide-client-select></select><div class="mt-3 rounded-lg border border-amber-300 bg-white p-3"><p class="text-xs leading-5 text-amber-950">Próximo passo obrigatório: criar o Projeto de Stand vinculado à empresa selecionada.</p><button id="finance-guide-create-project" type="button" data-finance-guide-action="create-project" class="mt-3 w-full rounded-lg bg-amber-700 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"><i class="fas fa-plus mr-2"></i>Continuar: criar Projeto de Stand</button></div></div>
        <div class="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3"><div class="rounded-lg bg-slate-50 p-3"><p class="text-sm font-semibold text-slate-800">1. Venda e parcelas</p><p class="mt-1 text-xs text-slate-600">Conferir orçamento aprovado e cadastrar recebimentos parcelados.</p></div><div class="rounded-lg bg-slate-50 p-3"><p class="text-sm font-semibold text-slate-800">2. Custos e rateios</p><p class="mt-1 text-xs text-slate-600">Registrar custos por categoria e revisar alocações compartilhadas.</p></div><div class="rounded-lg bg-slate-50 p-3"><p class="text-sm font-semibold text-slate-800">3. Revisão humana</p><p class="mt-1 text-xs text-slate-600">Classificar pendências e documentar divergências antes de fechar.</p></div></div>
      </div>
    </section>`;
  }

  let financeProjects = [];
  let financeClients = [];
  const projectLabel = (project) => [project.codigo || project.nome || project.referencia_stand || 'Projeto de Stand', project.cliente_nome || project.clienteNome || project.cliente_convertido_nome || project.lead_nome || project.leadNome || 'Cliente / lead', project.evento_nome || project.eventoNome || 'Sem evento'].filter(Boolean).join(' · ');
  const projectSearchText = (project) => [projectLabel(project), project.codigo, project.nome, project.referencia_stand, project.cliente_nome, project.clienteNome, project.cliente_convertido_nome, project.lead_nome, project.leadNome, project.evento_nome, project.eventoNome].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR');
  const clientLabel = (client) => client?.nome || client?.razao_social || client?.empresa || `Cliente #${client?.id || ''}`;
  const clientSearchText = (client) => [clientLabel(client), client?.email, client?.documento, client?.cpf_cnpj, client?.cnpj, client?.telefone, client?.whatsapp].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR');
  const matchedClients = (term) => term ? financeClients.filter((client) => clientSearchText(client).includes(term)) : [];
  const linkedProjects = (clientId) => financeProjects.filter((project) => String(project.cliente_id ?? project.clienteId) === String(clientId));
  function paintClientWithoutProject(clients, term) {
    const box = document.getElementById('finance-guide-client-without-project');
    const select = document.querySelector('[data-finance-guide-client-select]');
    const create = document.querySelector('[data-finance-guide-action="create-project"]');
    if (!box || !select || !create) return;
    const withoutProject = clients.filter((client) => !linkedProjects(client.id).length);
    if (!term || !withoutProject.length) {
      box.classList.add('hidden');
      select.innerHTML = '<option value="">Nenhum cliente selecionado</option>';
      create.dataset.clientId = '';
      create.setAttribute('aria-disabled', 'true');
      return;
    }
    const selected = withoutProject.length === 1 ? String(withoutProject[0].id) : String(select.value || '');
    select.innerHTML = `<option value="">Selecione o cliente para criar o stand</option>${withoutProject.map((client) => `<option value="${esc(client.id)}">${esc(clientLabel(client))}</option>`).join('')}`;
    select.value = withoutProject.some((client) => String(client.id) === selected) ? selected : '';
    create.dataset.clientId = select.value || '';
    create.setAttribute('aria-disabled', select.value ? 'false' : 'true');
    create.classList.toggle('opacity-60', !select.value);
    box.classList.remove('hidden');
  }
  function paintFinanceProjects(query = '') {
    const select = document.querySelector('[data-finance-guide-select]');
    const count = document.getElementById('finance-guide-project-count');
    const open = document.querySelector('[data-finance-guide-action="open"]');
    if (!select) return;
    const term = String(query || '').trim().toLocaleLowerCase('pt-BR');
    const currentValue = String(select.value || '');
    const clientMatches = matchedClients(term);
    const visible = financeProjects.filter((project) => projectSearchText(project).includes(term));
    select.innerHTML = `<option value="">${visible.length ? 'Selecione o stand para iniciar' : 'Nenhum stand encontrado'}</option>${visible.map((project) => `<option value="${esc(project.id)}">${esc(projectLabel(project))}</option>`).join('')}`;
    select.disabled = !visible.length;
    const persisted = visible.some((project) => String(project.id) === currentValue) ? currentValue : '';
    const automatic = term && visible.length === 1 ? String(visible[0].id) : '';
    select.value = automatic || persisted;
    if (open) open.disabled = !select.value;
    paintClientWithoutProject(clientMatches, term);
    if (count) {
      if (!term) count.textContent = `${financeProjects.length} Projeto(s) de Stand e ${financeClients.length} cliente(s) disponíveis.`;
      else if (visible.length) count.textContent = `${visible.length} stand(s) encontrado(s).${automatic ? ' Stand selecionado automaticamente.' : ''}`;
      else if (clientMatches.length) count.textContent = `${clientMatches.length} cliente(s) encontrado(s), mas sem stand vinculado.`;
      else count.textContent = `Nenhum cliente ou stand encontrado para “${String(query || '').trim()}”.`;
    }
  }

  let financeControlsBound = false;
  function bindFinanceiro() {
    if (financeControlsBound) return;
    financeControlsBound = true;
    document.addEventListener('input', (event) => {
      const search = event.target?.closest?.('[data-finance-guide-search]');
      if (search) paintFinanceProjects(search.value);
    });
    document.addEventListener('change', (event) => {
      const select = event.target?.closest?.('[data-finance-guide-select]');
      const clientSelect = event.target?.closest?.('[data-finance-guide-client-select]');
      if (select) {
        const open = document.querySelector('[data-finance-guide-action="open"]');
        if (open) open.disabled = !select.value;
      }
      if (clientSelect) {
        const create = document.querySelector('[data-finance-guide-action="create-project"]');
        if (create) {
          create.dataset.clientId = clientSelect.value || '';
          create.setAttribute('aria-disabled', clientSelect.value ? 'false' : 'true');
          create.classList.toggle('opacity-60', !clientSelect.value);
        }
      }
    });
    document.addEventListener('click', (event) => {
      const action = event.target?.closest?.('[data-finance-guide-action]');
      if (!action) return;
      if (action.dataset.financeGuideAction === 'open') {
        const select = document.querySelector('[data-finance-guide-select]');
        if (select?.value) openGuide(select.value);
      }
      if (action.dataset.financeGuideAction === 'create-project') {
        const clientSelect = document.querySelector('[data-finance-guide-client-select]');
        const selectedClientId = action.dataset.clientId || clientSelect?.value || '';
        const client = financeClients.find((item) => String(item.id) === String(selectedClientId));
        if (!client) {
          message('Selecione o cliente antes de criar o Projeto de Stand.', 'error');
          clientSelect?.focus();
          return;
        }
        window.__samsFinanceGuidePendingClientId = String(client.id);
        if (!window.ProjetosStandModule?.openForm) {
          message('O cadastro de Projeto de Stand ainda está carregando. Aguarde um instante e tente novamente.', 'error');
          return;
        }
        window.ProjetosStandModule.openForm({
          cliente_id: client.id,
          clienteId: client.id,
          cliente_nome: clientLabel(client),
          nome: `Stand — ${clientLabel(client)}`,
          centro_custo: clientLabel(client),
        });
      }
      if (action.dataset.financeGuideAction === 'resultados') window.NavigationSystem?.navigateToPage?.('financeiro', 'resultados_stand');
    });
  }

  async function loadFinanceiro() {
    const select = document.querySelector('[data-finance-guide-select]');
    if (!select) return;
    try {
      const fetchAll = async (baseUrl, messageText) => {
        const items = []; let offset = 0; let total = Infinity;
        while (offset < total) {
          const joiner = baseUrl.includes('?') ? '&' : '?';
          const response = await fetch(`${baseUrl}${joiner}limit=500&offset=${offset}`, { credentials: 'include', headers: headers() });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload.error || messageText);
          const rows = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : []);
          items.push(...rows); total = Number(payload.total ?? rows.length);
          if (!rows.length || rows.length < 500) break;
          offset += rows.length;
        }
        return items;
      };
      [financeProjects, financeClients] = await Promise.all([
        fetchAll('/api/crm/projetos-stand', 'Não foi possível carregar os stands.'),
        fetchAll('/api/crm/clientes', 'Não foi possível carregar os clientes.'),
      ]);
      paintFinanceProjects(document.querySelector('[data-finance-guide-search]')?.value || '');
    } catch (error) {
      select.disabled = true;
      select.innerHTML = '<option value="">Não foi possível carregar os stands</option>';
      const count = document.getElementById('finance-guide-project-count');
      if (count) count.textContent = error.message || 'Tente atualizar a página.';
    }
  }

  async function openGuide(projectId) {
    try {
      const data = await api(projectId);
      document.getElementById('projeto-stand-guide-modal')?.remove();
      document.body.insertAdjacentHTML('beforeend', markup(data));
      const modal = document.getElementById('projeto-stand-guide-modal');
      const close = () => modal?.remove();
      modal?.querySelectorAll('[data-guide-action="close"]').forEach((button) => button.addEventListener('click', close));
      modal?.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-guide-action="launch"]');
        if (!button) return;
        const form = modal.querySelector('#projeto-stand-guide-form');
        const category = button.dataset.category;
        const module = button.dataset.module;
        if (!form || !category || !module) return;
        try {
          await api(projectId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadFrom(form)) });
          window.__samsGuiaStandDefaults = window.__samsGuiaStandDefaults || {};
          window.__samsGuiaStandDefaults[module] = financialContext(data, category, module);
          close();
          window.FormSystem?.showCreateForm?.(module === 'contasReceber' ? 'contasReceber' : 'transacoes');
        } catch (error) { message(error.message || 'Não foi possível preservar o checklist.', 'error'); }
      });
      modal?.querySelector('#projeto-stand-guide-form')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const submit = form.querySelector('button[type="submit"]');
        submit.disabled = true;
        submit.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Salvando...';
        try {
          const result = await api(projectId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadFrom(form)) });
          message(result.fechamento?.status === 'fechado' ? 'Checklist fechado com revisão registrada.' : 'Guia atualizado.');
          close();
          window.ProjetosStandModule?.load?.();
        } catch (error) {
          message(error.message || 'Não foi possível salvar o guia.', 'error');
          submit.disabled = false;
          submit.innerHTML = '<i class="fas fa-save mr-2"></i>Salvar guia';
        }
      });
    } catch (error) { message(error.message || 'Não foi possível abrir o guia.', 'error'); }
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('.projeto-stand-guide');
    if (!button) return;
    event.preventDefault();
    openGuide(button.dataset.id);
  });
  window.addEventListener('sams:projeto-stand-salvo', (event) => {
    if (!document.querySelector('[data-finance-guide-select]')) return;
    const pendingClientId = String(window.__samsFinanceGuidePendingClientId || '');
    if (pendingClientId && String(event.detail?.clienteId || '') === pendingClientId) {
      delete window.__samsFinanceGuidePendingClientId;
      loadFinanceiro();
    }
  });
  bindFinanceiro();
  window.ProjetosStandFechamentoModule = { openGuide, renderFinanceiro, loadFinanceiro, bindFinanceiro };
})();
