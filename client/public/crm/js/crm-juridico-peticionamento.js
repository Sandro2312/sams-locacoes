/* Peticionamento Assistido: rascunhos, dossiê e IA sob revisão humana. */
(function () {
  'use strict';

  const state = { processoId: null, observer: null };
  const CATEGORIES = {
    dossie_geral: 'Dossiê geral', prova: 'Prova', peca: 'Peça', jurisprudencia: 'Jurisprudência',
    comunicacao: 'Comunicação', recibo_protocolo: 'Recibo de protocolo', contrato: 'Contrato', financeiro: 'Financeiro'
  };
  const PIECE_TYPES = { peticao_inicial: 'Petição inicial', contestacao: 'Contestação', manifestacao: 'Manifestação', replica: 'Réplica', recurso: 'Recurso', substabelecimento: 'Substabelecimento', pedido_prazo: 'Pedido de prazo', peticao_intermediaria: 'Petição intermediária', modelo_livre: 'Modelo livre' };
  const PIECE_STATUSES = { rascunho: 'Rascunho', em_revisao: 'Em revisão', aprovada_para_protocolo: 'Aprovada para protocolo', protocolada: 'Protocolada' };
  const DEFAULT_CHECKLIST = [
    { id: 'competencia', titulo: 'Competência, tribunal e órgão julgador conferidos', concluido: false },
    { id: 'prazo', titulo: 'Prazo conferido no canal oficial', concluido: false },
    { id: 'partes', titulo: 'Partes, número CNJ e representação conferidos', concluido: false },
    { id: 'anexos', titulo: 'Anexos e documentos do dossiê conferidos', concluido: false },
    { id: 'revisao', titulo: 'Revisão profissional e assinatura digital a realizar no portal oficial', concluido: false }
  ];

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const notice = (message, type = 'success') => window.Toast?.show ? window.Toast.show(message, type) : window.alert(message);
  const authHeaders = () => { try { return window.AuthSystem?._getAuthHeaders?.() || {}; } catch { return {}; } };
  const dateLabel = (value) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : 'Sem data';
  const roleCanManage = () => ['admin', 'administrador', 'manager', 'gerente', 'gerencia', 'desenvolvedor', 'developer', 'juridico'].includes(String((window.AuthSystem?.getCurrentUser?.() || window.AuthSystem?.currentUser || {}).role || '').toLowerCase());
  const api = async (path, options = {}) => {
    const response = await fetch(`/api/crm/juridico${path}`, { credentials: 'include', ...options, headers: { ...authHeaders(), ...(options.headers || {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Não foi possível concluir a operação.');
    return payload;
  };
  const jsonHeaders = { 'Content-Type': 'application/json' };
  const previewable = (doc) => /^application\/pdf$/i.test(String(doc?.mime_type || '')) || /^image\//i.test(String(doc?.mime_type || ''));
  const aiAllowed = (detail) => Number(detail?.processo?.ia_autorizada) === 1;

  function ensureStyles() {
    if (document.getElementById('juridico-peticionamento-styles')) return;
    const style = document.createElement('style');
    style.id = 'juridico-peticionamento-styles';
    style.textContent = '.jur-pet-tab{transition:background-color .16s ease-out,color .16s ease-out}.jur-pet-card{transition:transform .16s ease-out,box-shadow .16s ease-out}.jur-pet-card:focus-within{box-shadow:0 0 0 3px rgba(79,70,229,.16)}@media (prefers-reduced-motion:reduce){.jur-pet-tab,.jur-pet-card{transition:none!important}}';
    document.head.appendChild(style);
  }

  function statusBadge(status) {
    const color = ({ rascunho: 'bg-slate-100 text-slate-700', em_revisao: 'bg-amber-100 text-amber-800', aprovada_para_protocolo: 'bg-indigo-100 text-indigo-800', protocolada: 'bg-emerald-100 text-emerald-800' })[status] || 'bg-gray-100 text-gray-700';
    return `<span class="rounded-full px-2 py-1 text-xs font-semibold ${color}">${escapeHtml(PIECE_STATUSES[status] || status || 'Rascunho')}</span>`;
  }

  function pieceRow(piece) {
    return `<li class="jur-pet-card rounded-lg border border-gray-200 bg-white p-3"><div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div class="min-w-0"><p class="font-semibold text-gray-900 break-words">${escapeHtml(piece.titulo)}</p><div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">${statusBadge(piece.status)}<span>${escapeHtml(PIECE_TYPES[piece.tipo] || piece.tipo || 'Peça')}</span><span>v${Number(piece.versao_atual || 1)}</span><span>Atualizada ${dateLabel(piece.updated_at)}</span></div></div><button type="button" data-jur-pet-open-piece="${Number(piece.id)}" class="rounded-lg border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">Abrir rascunho</button></div></li>`;
  }

  function documentRow(doc, allowed) {
    const tags = String(doc.tags_dossie || '').split(',').filter(Boolean);
    const options = Object.entries(CATEGORIES).map(([key, label]) => `<option value="${key}" ${String(doc.categoria_dossie || 'dossie_geral') === key ? 'selected' : ''}>${label}</option>`).join('');
    return `<li class="jur-pet-card rounded-lg border border-gray-200 bg-white p-3" data-jur-pet-document="${Number(doc.vinculo_id)}"><div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div class="min-w-0"><p class="font-semibold text-gray-900 break-words"><i class="fas fa-file-alt mr-2 text-indigo-600"></i>${escapeHtml(doc.nome || doc.nome_arquivo_original || 'Documento')}</p><p class="mt-1 text-xs text-gray-500">${escapeHtml(String(doc.classificacao || 'outro').replace(/_/g, ' '))} · Anexado em ${dateLabel(doc.anexado_em)}</p>${tags.length ? `<div class="mt-2 flex flex-wrap gap-1">${tags.map((tag) => `<span class="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">#${escapeHtml(tag)}</span>`).join('')}</div>` : ''}</div><div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-[350px]"><label class="text-xs font-semibold text-gray-600">Categoria<select data-jur-pet-category class="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm">${options}</select></label><label class="text-xs font-semibold text-gray-600">Tags<select aria-hidden="true" tabindex="-1" class="sr-only"><option></option></select><input data-jur-pet-tags value="${escapeHtml(doc.tags_dossie || '')}" placeholder="ex.: prova, audiência" class="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"></label><div class="flex flex-wrap gap-2 sm:col-span-2"><button type="button" data-jur-pet-save-document="${Number(doc.vinculo_id)}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Salvar organização</button>${allowed && previewable(doc) ? `<button type="button" data-jur-pet-summary="${Number(doc.vinculo_id)}" class="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"><i class="fas fa-wand-magic-sparkles mr-1"></i>Resumir com IA</button>` : ''}</div></div></div></li>`;
  }

  function analysisRow(analysis) {
    const result = analysis.resultado || {};
    const title = analysis.tipo === 'cronologia' ? 'Cronologia assistida' : analysis.tipo === 'extracao_audiencia' ? 'Dados de audiência assistidos' : 'Resumo documental assistido';
    const summary = analysis.tipo === 'extracao_audiencia'
      ? [result.dataAudiencia ? `Data sugerida: ${result.dataAudiencia}` : '', result.horaAudiencia ? `horário ${result.horaAudiencia}` : '', result.localAudiencia ? `local: ${result.localAudiencia}` : ''].filter(Boolean).join(' · ') || 'Sugestões de audiência disponíveis para revisão.'
      : (result.resumo || result.summary || 'Análise disponível para revisão.');
    return `<li class="rounded-lg border border-violet-100 bg-violet-50 p-3"><div class="flex flex-wrap items-center gap-2"><strong class="text-sm text-violet-950">${title}</strong><span class="text-xs text-violet-700">${dateLabel(analysis.created_at)} · ${escapeHtml(analysis.gerado_por_nome || 'Usuário')}</span></div><p class="mt-2 text-sm text-violet-900 break-words">${escapeHtml(summary)}</p><p class="mt-2 text-xs font-medium text-violet-700">Resultado assistivo: revise as fontes originais antes de usar.</p></li>`;
  }

  function workspaceMarkup(detail) {
    const process = detail.processo || {}; const pieces = Array.isArray(detail.pecas) ? detail.pecas : []; const docs = Array.isArray(detail.documentos) ? detail.documentos : []; const analyses = Array.isArray(detail.iaAnalises) ? detail.iaAnalises : []; const allowed = aiAllowed(detail);
    const authorization = allowed
      ? '<div class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><i class="fas fa-shield-alt mr-2"></i><strong>IA autorizada para este processo.</strong> As saídas são rascunhos com revisão profissional obrigatória.</div>'
      : '<div class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><i class="fas fa-lock mr-2"></i><strong>IA desativada para este processo.</strong> Edite o cadastro do processo e registre a autorização antes de analisar documentos ou gerar cronologia.</div>';
    return `<div id="juridico-peticionamento-modal" class="fixed inset-0 z-[1250] flex items-start justify-center overflow-y-auto bg-black/60 p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="juridico-peticionamento-title"><div class="my-3 w-full max-w-6xl rounded-xl bg-white shadow-2xl sm:my-6"><div class="flex items-start justify-between gap-4 border-b p-4 sm:p-6"><div class="min-w-0"><h3 id="juridico-peticionamento-title" class="text-lg font-semibold text-gray-900"><i class="fas fa-file-signature mr-2 text-indigo-600"></i>Peticionamento Assistido</h3><p class="mt-1 truncate text-sm text-gray-600">${escapeHtml(process.titulo || process.codigo || 'Processo jurídico')}</p></div><button type="button" data-jur-pet-close class="text-2xl leading-none text-gray-400 hover:text-gray-700" aria-label="Fechar">&times;</button></div><div class="space-y-5 p-4 sm:p-6">${authorization}<div class="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-950"><strong>Fluxo seguro:</strong> prepare e revise no CRM; assine e protocole somente no portal oficial. O sistema não armazena certificado, senha ou token e não realiza protocolo automático.</div><div class="grid grid-cols-1 gap-5 xl:grid-cols-2"><section class="rounded-xl border border-gray-200 p-4"><div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h4 class="font-semibold text-gray-900">Rascunhos e aprovação</h4><p class="mt-1 text-sm text-gray-500">Versões preservadas e checklist antes da aprovação.</p></div>${roleCanManage() ? '<button type="button" data-jur-pet-new-piece class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"><i class="fas fa-plus mr-1"></i>Novo rascunho</button>' : ''}</div>${pieces.length ? `<ul class="mt-3 space-y-3">${pieces.map(pieceRow).join('')}</ul>` : '<div class="mt-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">Nenhum rascunho criado neste processo.</div>'}</section><section class="rounded-xl border border-gray-200 p-4"><div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h4 class="font-semibold text-gray-900">Assistência por IA</h4><p class="mt-1 text-sm text-gray-500">Resumo e cronologia com fontes internas.</p></div><button type="button" data-jur-pet-timeline ${allowed ? '' : 'disabled aria-disabled="true"'} class="rounded-lg ${allowed ? 'bg-violet-600 text-white hover:bg-violet-700' : 'cursor-not-allowed bg-gray-100 text-gray-400'} px-4 py-2 text-sm font-semibold"><i class="fas fa-stream mr-1"></i>Gerar cronologia</button></div>${analyses.length ? `<ul class="mt-3 space-y-3">${analyses.map(analysisRow).join('')}</ul>` : '<div class="mt-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">Nenhuma análise assistida gerada. Os resultados não substituem a revisão profissional.</div>'}</section></div><section class="rounded-xl border border-gray-200 p-4"><div><h4 class="font-semibold text-gray-900">Dossiê do processo</h4><p class="mt-1 text-sm text-gray-500">Classifique evidências e use tags para encontrar anexos na preparação da peça.</p></div>${detail.documentosRestritos ? '<div class="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Os documentos deste processo sigiloso estão restritos ao perfil autorizado.</div>' : docs.length ? `<ul class="mt-3 space-y-3">${docs.map((doc) => documentRow(doc, allowed)).join('')}</ul>` : '<div class="mt-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">Nenhum documento no dossiê. Anexe documentos pela área “Documentos do processo”.</div>'}</section></div></div></div>`;
  }

  function createPieceMarkup(processo) {
    const typeOptions = Object.entries(PIECE_TYPES).map(([key, label]) => `<option value="${key}">${label}</option>`).join('');
    return `<div id="juridico-pet-nova-peca-modal" class="fixed inset-0 z-[1300] flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:p-5" role="dialog" aria-modal="true"><div class="my-3 w-full max-w-2xl rounded-xl bg-white p-4 shadow-2xl sm:my-6 sm:p-6"><form data-jur-pet-create-form><div class="flex items-start justify-between gap-4"><div><h3 class="text-lg font-semibold text-gray-900">Novo rascunho</h3><p class="mt-1 text-sm text-gray-600">${escapeHtml(processo.titulo || 'Processo jurídico')}</p></div><button type="button" data-jur-pet-close-create class="text-2xl text-gray-400" aria-label="Fechar">&times;</button></div><div class="mt-5 grid grid-cols-1 gap-4"><label class="text-sm font-semibold text-gray-700">Título da peça *<input required name="titulo" maxlength="255" placeholder="Ex.: Manifestação sobre documentos" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"></label><label class="text-sm font-semibold text-gray-700">Tipo<select name="tipo" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">${typeOptions}</select></label><label class="text-sm font-semibold text-gray-700">Rascunho<textarea name="conteudo" rows="10" maxlength="60000" placeholder="Prepare a minuta. Revise todos os fatos, fundamentos, prazos e anexos antes de aprovar." class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"></textarea></label></div><div class="mt-6 flex justify-end gap-3"><button type="button" data-jur-pet-close-create class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Cancelar</button><button type="submit" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Criar rascunho</button></div></form></div></div>`;
  }

  function pieceEditorMarkup(data, processo) {
    const piece = data.peca || {}; const checklist = Array.isArray(piece.checklist) && piece.checklist.length ? piece.checklist : DEFAULT_CHECKLIST; const canApprove = roleCanManage() && piece.status !== 'protocolada';
    const typeOptions = Object.entries(PIECE_TYPES).map(([key, label]) => `<option value="${key}" ${piece.tipo === key ? 'selected' : ''}>${label}</option>`).join('');
    const versionList = (data.versoes || []).map((version) => `<li class="text-xs text-gray-600">v${Number(version.versao)} · ${dateLabel(version.created_at)} · ${escapeHtml(version.created_by_nome || 'Usuário')} ${version.resumo_alteracoes ? `· ${escapeHtml(version.resumo_alteracoes)}` : ''}</li>`).join('');
    return `<div id="juridico-pet-editar-peca-modal" class="fixed inset-0 z-[1300] flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:p-5" role="dialog" aria-modal="true"><div class="my-3 w-full max-w-5xl rounded-xl bg-white shadow-2xl sm:my-6"><form data-jur-pet-edit-form class="p-4 sm:p-6"><input type="hidden" name="pecaId" value="${Number(piece.id)}"><input type="hidden" name="versaoAtual" value="${Number(piece.versao_atual)}"><div class="flex items-start justify-between gap-4"><div><h3 class="text-lg font-semibold text-gray-900">${escapeHtml(piece.titulo)}</h3><p class="mt-1 text-sm text-gray-600">${escapeHtml(processo.titulo || 'Processo jurídico')} · v${Number(piece.versao_atual)} · ${statusBadge(piece.status)}</p></div><button type="button" data-jur-pet-close-piece class="text-2xl text-gray-400" aria-label="Fechar">&times;</button></div><div class="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]"><div class="space-y-4"><label class="block text-sm font-semibold text-gray-700">Título<input name="titulo" maxlength="255" value="${escapeHtml(piece.titulo)}" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"></label><label class="block text-sm font-semibold text-gray-700">Tipo<select name="tipo" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">${typeOptions}</select></label><label class="block text-sm font-semibold text-gray-700">Conteúdo do rascunho<textarea name="conteudo" rows="18" maxlength="60000" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm">${escapeHtml(piece.conteudo || '')}</textarea></label><label class="block text-sm font-semibold text-gray-700">Resumo da alteração<input name="resumoAlteracoes" maxlength="500" placeholder="Ex.: Ajuste de pedidos e anexos" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"></label></div><aside class="space-y-4"><div class="rounded-lg border border-gray-200 bg-slate-50 p-3"><h4 class="font-semibold text-gray-900">Checklist de protocolo</h4><p class="mt-1 text-xs text-gray-600">A aprovação só é liberada quando todos os itens forem confirmados.</p><div class="mt-3 space-y-2">${checklist.map((item) => `<label class="flex gap-2 text-sm text-gray-700"><input type="checkbox" data-jur-pet-check="${escapeHtml(item.id)}" ${item.concluido ? 'checked' : ''}><span>${escapeHtml(item.titulo)}</span></label>`).join('')}</div></div><div class="rounded-lg border border-gray-200 p-3"><h4 class="font-semibold text-gray-900">Histórico de versões</h4><ul class="mt-2 space-y-2">${versionList || '<li class="text-xs text-gray-500">Sem versões anteriores.</li>'}</ul></div>${piece.protocolo_numero ? `<div class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><strong>Protocolo registrado:</strong><br>${escapeHtml(piece.protocolo_numero)}<br>${dateLabel(piece.protocolado_em)}</div>` : ''}</aside></div><div class="mt-6 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between"><button type="button" data-jur-pet-close-piece class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Fechar</button><div class="flex flex-wrap gap-2">${canApprove ? `<button type="button" data-jur-pet-approve="${Number(piece.id)}" class="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-800">Aprovar para protocolo</button>` : ''}${piece.status === 'aprovada_para_protocolo' ? `<button type="button" data-jur-pet-record-filing="${Number(piece.id)}" class="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">Registrar protocolo manual</button>` : ''}${piece.status !== 'protocolada' ? '<button type="submit" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Salvar nova versão</button>' : ''}</div></div></form></div></div>`;
  }

  async function openWorkspace(processoId) {
    if (!processoId) return notice('Não foi possível identificar o processo.', 'error');
    state.processoId = Number(processoId); ensureStyles(); document.getElementById('juridico-peticionamento-modal')?.remove();
    try { const detail = await api(`/processos/${encodeURIComponent(processoId)}`); document.body.insertAdjacentHTML('beforeend', workspaceMarkup(detail)); const modal = document.getElementById('juridico-peticionamento-modal'); modal._jurPetDetail = detail; modal.dataset.processoId = String(processoId); }
    catch (error) { notice(error.message || 'Não foi possível abrir o Peticionamento Assistido.', 'error'); }
  }

  async function openPiece(processoId, pecaId) {
    try { const detail = await api(`/processos/${encodeURIComponent(processoId)}`); const data = await api(`/processos/${encodeURIComponent(processoId)}/pecas/${encodeURIComponent(pecaId)}`); document.getElementById('juridico-pet-editar-peca-modal')?.remove(); document.body.insertAdjacentHTML('beforeend', pieceEditorMarkup(data, detail.processo || {})); }
    catch (error) { notice(error.message || 'Não foi possível abrir o rascunho.', 'error'); }
  }

  function addActionButton(modal) {
    if (!modal || modal.querySelector('[data-jur-pet-open-workspace]')) return;
    const actions = modal.querySelector('[data-juridico-acervo]')?.parentElement;
    if (!actions) return;
    actions.insertAdjacentHTML('beforeend', '<button type="button" data-jur-pet-open-workspace class="rounded-lg border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-100"><i class="fas fa-file-signature mr-2"></i>Peticionamento Assistido</button>');
  }

  function decorateProcessForm(form) {
    if (!form || form.dataset.jurPetIaAuthorizationReady === 'true') return;
    const privacy = form.querySelector('input[name="sigiloso"]')?.closest('label');
    if (!privacy) return;
    form.dataset.jurPetIaAuthorizationReady = 'true';
    privacy.insertAdjacentHTML('afterend', '<label class="flex items-start gap-2 text-sm font-medium text-gray-700 md:col-span-2"><input type="checkbox" name="iaAutorizada" value="1" class="mt-1"><span>Autorizar IA assistiva neste processo <span class="block text-xs font-normal text-gray-500">Confirmo que o uso será supervisionado por profissional, que a saída será revisada e que não haverá protocolo automático.</span></span></label>');
  }

  function observeDetail() {
    state.observer?.disconnect();
    state.observer = new MutationObserver(() => window.setTimeout(() => { document.querySelectorAll('#juridico-detalhe-modal').forEach(addActionButton); document.querySelectorAll('#juridico-processo-form').forEach(decorateProcessForm); }, 0));
    state.observer.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll('#juridico-detalhe-modal').forEach(addActionButton);
    document.querySelectorAll('#juridico-processo-form').forEach(decorateProcessForm);
  }

  document.addEventListener('click', async (event) => {
    const open = event.target.closest('[data-juridico-open]'); if (open) state.processoId = Number(open.dataset.juridicoOpen || 0) || state.processoId;
    const workspace = event.target.closest('[data-jur-pet-open-workspace]');
    if (workspace) { event.preventDefault(); openWorkspace(workspace.closest('#juridico-detalhe-modal')?.dataset?.processoId || state.processoId); return; }
    if (event.target.closest('[data-jur-pet-close]')) { document.getElementById('juridico-peticionamento-modal')?.remove(); return; }
    if (event.target.closest('[data-jur-pet-new-piece]')) { const modal = document.getElementById('juridico-peticionamento-modal'); const detail = modal?._jurPetDetail; if (detail) { document.getElementById('juridico-pet-nova-peca-modal')?.remove(); document.body.insertAdjacentHTML('beforeend', createPieceMarkup(detail.processo || {})); } return; }
    if (event.target.closest('[data-jur-pet-close-create]')) { document.getElementById('juridico-pet-nova-peca-modal')?.remove(); return; }
    if (event.target.closest('[data-jur-pet-close-piece]')) { document.getElementById('juridico-pet-editar-peca-modal')?.remove(); return; }
    const piece = event.target.closest('[data-jur-pet-open-piece]'); if (piece) { openPiece(state.processoId, Number(piece.dataset.jurPetOpenPiece)); return; }
    const saveDoc = event.target.closest('[data-jur-pet-save-document]');
    if (saveDoc) { const row = saveDoc.closest('[data-jur-pet-document]'); saveDoc.disabled = true; try { await api(`/processos/${state.processoId}/documentos/${saveDoc.dataset.jurPetSaveDocument}/organizacao`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ categoriaDossie: row.querySelector('[data-jur-pet-category]')?.value, tagsDossie: row.querySelector('[data-jur-pet-tags]')?.value }) }); notice('Documento organizado no dossiê.'); await openWorkspace(state.processoId); } catch (error) { notice(error.message || 'Não foi possível organizar o documento.', 'error'); saveDoc.disabled = false; } return; }
    const summary = event.target.closest('[data-jur-pet-summary]');
    if (summary) { if (!window.confirm('Gerar resumo assistido? Ele deve ser revisado por profissional antes de qualquer uso.')) return; summary.disabled = true; summary.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Analisando…'; try { await api(`/processos/${state.processoId}/ia/resumir-documento`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ vinculoId: Number(summary.dataset.jurPetSummary), confirmacaoRevisao: true }) }); notice('Resumo assistido gerado e salvo para revisão.'); await openWorkspace(state.processoId); } catch (error) { notice(error.message || 'Não foi possível gerar o resumo.', 'error'); summary.disabled = false; summary.innerHTML = '<i class="fas fa-wand-magic-sparkles mr-1"></i>Resumir com IA'; } return; }
    const timeline = event.target.closest('[data-jur-pet-timeline]');
    if (timeline) { if (!window.confirm('Gerar cronologia assistida com fontes internas? Revise todas as datas e atos antes de usar.')) return; timeline.disabled = true; timeline.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Gerando…'; try { await api(`/processos/${state.processoId}/ia/cronologia`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ confirmacaoRevisao: true }) }); notice('Cronologia assistida gerada para revisão.'); await openWorkspace(state.processoId); } catch (error) { notice(error.message || 'Não foi possível gerar a cronologia.', 'error'); timeline.disabled = false; timeline.innerHTML = '<i class="fas fa-stream mr-1"></i>Gerar cronologia'; } return; }
    const approve = event.target.closest('[data-jur-pet-approve]');
    if (approve) { if (!window.confirm('Confirma que a revisão profissional foi concluída e que todos os itens do checklist foram conferidos?')) return; try { await api(`/processos/${state.processoId}/pecas/${approve.dataset.jurPetApprove}/aprovar`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ confirmacaoRevisao: true }) }); notice('Peça aprovada para protocolo manual no portal oficial.'); document.getElementById('juridico-pet-editar-peca-modal')?.remove(); await openWorkspace(state.processoId); } catch (error) { notice(error.message || 'Não foi possível aprovar a peça.', 'error'); } return; }
    const filing = event.target.closest('[data-jur-pet-record-filing]');
    if (filing) { const protocol = window.prompt('Informe o número ou identificador do recibo de protocolo manual:'); if (!protocol) return; try { await api(`/processos/${state.processoId}/pecas/${filing.dataset.jurPetRecordFiling}/protocolar`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ protocoloNumero: protocol }) }); notice('Protocolo manual registrado. Anexe o recibo ao dossiê.'); document.getElementById('juridico-pet-editar-peca-modal')?.remove(); await openWorkspace(state.processoId); } catch (error) { notice(error.message || 'Não foi possível registrar o protocolo.', 'error'); } }
  }, true);

  document.addEventListener('submit', async (event) => {
    const create = event.target.closest('[data-jur-pet-create-form]');
    if (create) { event.preventDefault(); const button = create.querySelector('[type="submit"]'); button.disabled = true; try { const data = Object.fromEntries(new FormData(create).entries()); await api(`/processos/${state.processoId}/pecas`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ ...data, checklist: DEFAULT_CHECKLIST }) }); notice('Rascunho criado.'); document.getElementById('juridico-pet-nova-peca-modal')?.remove(); await openWorkspace(state.processoId); } catch (error) { notice(error.message || 'Não foi possível criar o rascunho.', 'error'); button.disabled = false; } return; }
    const edit = event.target.closest('[data-jur-pet-edit-form]');
    if (edit) { event.preventDefault(); const button = edit.querySelector('[type="submit"]'); button.disabled = true; const checklist = Array.from(edit.querySelectorAll('[data-jur-pet-check]')).map((input) => ({ id: input.dataset.jurPetCheck, titulo: input.parentElement?.querySelector('span')?.textContent || 'Item de checklist', concluido: input.checked })); try { const data = Object.fromEntries(new FormData(edit).entries()); await api(`/processos/${state.processoId}/pecas/${data.pecaId}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify({ ...data, checklist, status: 'em_revisao' }) }); notice('Nova versão do rascunho salva.'); await openPiece(state.processoId, Number(data.pecaId)); } catch (error) { notice(error.message || 'Não foi possível salvar a versão.', 'error'); button.disabled = false; } }
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observeDetail, { once: true }); else observeDetail();
})();
