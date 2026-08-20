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
  window.ProjetosStandFechamentoModule = { openGuide };
})();
