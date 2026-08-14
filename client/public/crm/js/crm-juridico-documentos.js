/* Fluxo contextual de documentos em processos jurídicos. */
(function () {
  'use strict';

  const MAX_FILE_BYTES = 25 * 1024 * 1024;
  const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip'];
  let activeProcessId = null;
  let observer = null;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const notice = (message, type = 'success') => window.Toast?.show ? window.Toast.show(message, type) : window.alert(message);
  const roleCanManage = () => ['admin', 'administrador', 'manager', 'gerente', 'gerencia', 'desenvolvedor', 'developer', 'juridico'].includes(String((window.AuthSystem?.getCurrentUser?.() || window.AuthSystem?.currentUser || {}).role || '').toLowerCase());
  const authHeaders = () => { try { return window.AuthSystem?._getAuthHeaders?.() || {}; } catch { return {}; } };
  const formatBytes = (bytes) => {
    const value = Number(bytes || 0);
    if (!value) return '';
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  };
  const api = async (path, options = {}) => {
    const response = await fetch(`/api/crm/juridico${path}`, {
      credentials: 'include',
      ...options,
      headers: { ...authHeaders(), ...(options.headers || {}) },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Não foi possível concluir a operação.');
    return payload;
  };
  function ensureVisualStyles() {
    if (document.getElementById('juridico-documentos-visual-styles')) return;
    const style = document.createElement('style');
    style.id = 'juridico-documentos-visual-styles';
    style.textContent = '@keyframes juridicoUploadSuccess{0%{opacity:0;transform:translateY(8px) scale(.98)}100%{opacity:1;transform:translateY(0) scale(1)}}@keyframes juridicoProgressGlow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.18)}}.juridico-upload-success{animation:juridicoUploadSuccess .28s cubic-bezier(.23,1,.32,1) both}.juridico-upload-progress-active{animation:juridicoProgressGlow 1s ease-in-out infinite}@media (prefers-reduced-motion:reduce){.juridico-upload-success,.juridico-upload-progress-active{animation:none!important}}';
    document.head.appendChild(style);
  }
  function previewable(doc) {
    const mime = String(doc?.mime_type || '').toLowerCase();
    return Boolean(doc?.url_arquivo && (mime === 'application/pdf' || mime.indexOf('image/') === 0));
  }
  function previewMarkup(doc) {
    const image = String(doc.mime_type || '').toLowerCase().indexOf('image/') === 0;
    const content = image
      ? `<img src="${escapeHtml(doc.url_arquivo)}" alt="${escapeHtml(doc.nome || 'Pré-visualização do documento')}" class="max-w-full object-contain" style="max-height:72vh;object-fit:contain">`
      : `<iframe src="${escapeHtml(doc.url_arquivo)}" title="Pré-visualização de ${escapeHtml(doc.nome || 'documento')}" class="w-full rounded-lg border border-gray-200" style="height:72vh"></iframe>`;
    return `<div id="juridico-preview-documento-modal" class="fixed inset-0 z-[1300] flex items-center justify-center bg-black/70 p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="juridico-preview-documento-title"><div class="flex max-h-full w-full max-w-6xl flex-col rounded-xl bg-white shadow-2xl"><div class="flex items-start justify-between gap-4 border-b p-4"><div class="min-w-0"><h3 id="juridico-preview-documento-title" class="truncate text-lg font-semibold text-gray-900">${escapeHtml(doc.nome || 'Documento')}</h3><p class="mt-1 text-xs text-gray-500">Pré-visualização protegida do documento vinculado ao processo</p></div><div class="flex items-center gap-2"><a href="${escapeHtml(doc.url_arquivo)}" target="_blank" rel="noopener noreferrer" class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"><i class="fas fa-external-link-alt mr-1"></i>Abrir</a><button type="button" data-juridico-preview-close class="text-2xl leading-none text-gray-400 hover:text-gray-700" aria-label="Fechar pré-visualização">&times;</button></div></div><div class="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-50 p-3 sm:p-5">${content}</div></div></div>`;
  }
  function filterControlsMarkup(documents) {
    const classifications = Array.from(new Set(documents.map((doc) => String(doc.classificacao || 'outro')))).sort();
    const options = classifications.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value.split('_').join(' '))}</option>`).join('');
    return `<div class="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-4"><label class="text-xs font-semibold text-gray-700 sm:col-span-2">Buscar<input data-juridico-documento-busca type="search" placeholder="Nome, arquivo, observação..." class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"></label><label class="text-xs font-semibold text-gray-700">Tipo<select data-juridico-documento-tipo class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"><option value="">Todos</option>${options}</select></label><div class="flex items-end"><button type="button" data-juridico-documento-limpar-filtros class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"><i class="fas fa-times-circle mr-1"></i>Limpar filtros</button></div><label class="text-xs font-semibold text-gray-700">De<input data-juridico-documento-data-inicial type="date" class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"></label><label class="text-xs font-semibold text-gray-700">Até<input data-juridico-documento-data-final type="date" class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"></label><p data-juridico-documento-resumo class="self-end pb-2 text-sm text-gray-600 sm:col-span-2"></p></div>`;
  }
  function renderFilteredDocuments(modal) {
    const documents = Array.isArray(modal?._juridicoDocuments) ? modal._juridicoDocuments : [];
    const term = String(modal?.querySelector('[data-juridico-documento-busca]')?.value || '').trim().toLocaleLowerCase('pt-BR');
    const classification = String(modal?.querySelector('[data-juridico-documento-tipo]')?.value || '');
    const start = String(modal?.querySelector('[data-juridico-documento-data-inicial]')?.value || '');
    const end = String(modal?.querySelector('[data-juridico-documento-data-final]')?.value || '');
    const filtered = documents.filter((doc) => {
      const haystack = [doc.nome, doc.nome_arquivo_original, doc.classificacao, doc.observacao, doc.tags].join(' ').toLocaleLowerCase('pt-BR');
      const date = String(doc.anexado_em || doc.created_at || '').slice(0, 10);
      return (!term || haystack.indexOf(term) !== -1) && (!classification || String(doc.classificacao) === classification) && (!start || date >= start) && (!end || date <= end);
    });
    const list = modal?.querySelector('[data-juridico-documentos-lista]');
    const summary = modal?.querySelector('[data-juridico-documento-resumo]');
    if (summary) summary.textContent = `Exibindo ${filtered.length} de ${documents.length} documento(s)`;
    if (list) list.innerHTML = filtered.length ? filtered.map((doc) => documentCard(doc, roleCanManage())).join('') : '<li class="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">Nenhum documento corresponde aos filtros informados.</li>';
  }
  function enhanceManager(modal, detail) {
    const documents = Array.isArray(detail?.documentos) ? detail.documentos : [];
    if (!modal || detail?.documentosRestritos || !documents.length) return;
    const list = modal.querySelector('ul');
    if (!list || modal.dataset.juridicoDocumentosEnhanced === 'true') return;
    modal.dataset.juridicoDocumentosEnhanced = 'true';
    modal._juridicoDocuments = documents;
    list.setAttribute('data-juridico-documentos-lista', 'true');
    list.previousElementSibling?.insertAdjacentHTML('afterend', filterControlsMarkup(documents));
    renderFilteredDocuments(modal);
  }
  function progressMarkup() {
    return '<div id="juridico-upload-progress-wrap" class="hidden rounded-lg border border-indigo-100 bg-indigo-50 p-3" role="status" aria-live="polite"><div class="flex items-center justify-between gap-3 text-sm font-semibold text-indigo-900"><span data-juridico-upload-progress-label>Preparando envio…</span><span data-juridico-upload-progress-value>0%</span></div><div class="mt-2 h-2 overflow-hidden rounded-full bg-indigo-100"><div data-juridico-upload-progress-bar class="h-full w-0 rounded-full bg-indigo-600 transition-[width] duration-200 ease-out"></div></div></div>';
  }
  function setUploadProgress(modal, percent, label, tone = 'active') {
    const wrap = modal?.querySelector('#juridico-upload-progress-wrap');
    const bar = modal?.querySelector('[data-juridico-upload-progress-bar]');
    const value = modal?.querySelector('[data-juridico-upload-progress-value]');
    const description = modal?.querySelector('[data-juridico-upload-progress-label]');
    if (!wrap || !bar || !value || !description) return;
    const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
    wrap.classList.remove('hidden');
    bar.style.width = `${safePercent}%`;
    value.textContent = `${safePercent}%`;
    description.textContent = label;
    bar.classList.toggle('juridico-upload-progress-active', tone === 'active');
    if (tone === 'error') { wrap.className = 'rounded-lg border border-red-200 bg-red-50 p-3'; bar.className = 'h-full rounded-full bg-red-600 transition-[width] duration-200 ease-out'; }
    if (tone === 'success') { wrap.className = 'rounded-lg border border-emerald-200 bg-emerald-50 p-3'; bar.className = 'h-full rounded-full bg-emerald-600 transition-[width] duration-200 ease-out'; }
  }
  function uploadWithProgress(processoId, formData, modal) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/crm/juridico/processos/${encodeURIComponent(processoId)}/documentos`, true);
      xhr.withCredentials = true;
      Object.entries(authHeaders()).forEach(([name, value]) => xhr.setRequestHeader(name, String(value)));
      xhr.upload.addEventListener('loadstart', () => setUploadProgress(modal, 0, 'Enviando documento…'));
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) setUploadProgress(modal, (event.loaded / event.total) * 100, 'Enviando documento…');
      });
      xhr.upload.addEventListener('load', () => setUploadProgress(modal, 100, 'Processando e vinculando ao processo…'));
      xhr.addEventListener('load', () => {
        let payload = {};
        try { payload = xhr.responseText ? JSON.parse(xhr.responseText) : {}; } catch {}
        if (xhr.status >= 200 && xhr.status < 300) return resolve(payload);
        reject(new Error(payload.error || 'Não foi possível anexar o documento.'));
      });
      xhr.addEventListener('error', () => reject(new Error('Falha de rede durante o envio do documento.')));
      xhr.addEventListener('abort', () => reject(new Error('O envio do documento foi cancelado.')));
      xhr.send(formData);
    });
  }
  function showUploadSuccess(modal, fileName) {
    const form = modal?.querySelector('form');
    if (!form || form.querySelector('#juridico-upload-success')) return;
    form.insertAdjacentHTML('afterbegin', `<div id="juridico-upload-success" class="juridico-upload-success mt-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status" aria-live="polite"><i class="fas fa-check-circle mt-0.5 text-lg text-emerald-600"></i><span><strong>Documento anexado com sucesso.</strong><br>${escapeHtml(fileName)} foi vinculado ao processo.</span></div>`);
  }
  const processIdFor = (element) => {
    const modal = element?.closest?.('#juridico-detalhe-modal');
    return Number(modal?.dataset?.processoId || activeProcessId || 0);
  };

  function documentCard(doc, canManage) {
    const fileName = escapeHtml(doc.nome_arquivo_original || doc.nome || 'Documento');
    const source = doc.url_arquivo || doc.url_drive || '';
    const canPreview = previewable(doc);
    return `<li class="rounded-lg border border-gray-200 bg-white p-3">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0"><div class="font-medium text-gray-900 break-words"><i class="fas fa-file-alt mr-2 text-indigo-600"></i>${escapeHtml(doc.nome)}</div>
          <div class="mt-1 flex flex-wrap gap-2 text-xs text-gray-500"><span>${fileName}</span>${doc.classificacao ? `<span class="rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">${escapeHtml(String(doc.classificacao).split('_').join(' '))}</span>` : ''}${doc.tamanho_bytes ? `<span>${formatBytes(doc.tamanho_bytes)}</span>` : ''}${doc.anexado_em ? `<span>Anexado em ${new Date(doc.anexado_em).toLocaleDateString('pt-BR')}</span>` : ''}</div>
          ${doc.observacao ? `<p class="mt-1 text-sm text-gray-600 break-words">${escapeHtml(doc.observacao)}</p>` : ''}</div>
        <div class="flex shrink-0 flex-wrap items-center gap-2">${canPreview ? `<button type="button" data-juridico-previsualizar-documento="${doc.vinculo_id}" class="rounded-lg border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"><i class="fas fa-eye mr-1"></i>Pré-visualizar</button>` : ''}${source ? `<a href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer" class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50" title="Abrir ou baixar documento"><i class="fas fa-download mr-1"></i>Abrir</a>` : ''}${canManage ? `<button type="button" data-juridico-desvincular-documento="${doc.vinculo_id}" class="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"><i class="fas fa-unlink mr-1"></i>Desvincular</button>` : ''}</div>
      </div>
    </li>`;
  }

  function managerMarkup(detail) {
    const processo = detail.processo || {};
    const documents = Array.isArray(detail.documentos) ? detail.documentos : [];
    const canManage = roleCanManage();
    return `<div id="juridico-documentos-modal" class="fixed inset-0 z-[1100] flex items-start justify-center overflow-y-auto bg-black/60 p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="juridico-documentos-title"><div class="my-3 w-full max-w-3xl rounded-xl bg-white shadow-2xl sm:my-6"><div class="flex items-start justify-between gap-4 border-b p-4 sm:p-6"><div><h3 id="juridico-documentos-title" class="text-lg font-semibold text-gray-900">Documentos do processo</h3><p class="mt-1 text-sm text-gray-600">${escapeHtml(processo.titulo || processo.codigo || 'Processo jurídico')}</p></div><button type="button" data-juridico-documento-close class="text-2xl leading-none text-gray-400 hover:text-gray-700" aria-label="Fechar">&times;</button></div><div class="space-y-5 p-4 sm:p-6">${detail.documentosRestritos ? '<div class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><i class="fas fa-lock mr-2"></i>Os documentos deste processo sigiloso estão restritos ao perfil autorizado.</div>' : `<div><div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h4 class="font-semibold text-gray-900">Anexos vinculados</h4><p class="mt-1 text-sm text-gray-500">${documents.length} documento(s) neste processo. Desvincular não exclui o arquivo original do Acervo.</p></div>${canManage ? '<button type="button" data-juridico-novo-documento class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"><i class="fas fa-paperclip mr-2"></i>Anexar documento</button>' : ''}</div>${documents.length ? `<ul class="mt-3 space-y-3">${documents.map((doc) => documentCard(doc, canManage)).join('')}</ul>` : '<div class="mt-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500"><i class="fas fa-folder-open mb-2 block text-2xl text-gray-400"></i>Nenhum documento vinculado a este processo.</div>'}`}</div></div></div></div>`;
  }

  function uploadMarkup(processo) {
    return `<div id="juridico-upload-documento-modal" class="fixed inset-0 z-[1200] flex items-start justify-center overflow-y-auto bg-black/60 p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="juridico-upload-documento-title"><div class="my-3 w-full max-w-xl rounded-xl bg-white shadow-2xl sm:my-6"><form id="juridico-upload-documento-form" class="p-4 sm:p-6"><div class="flex items-start justify-between gap-4"><div><h3 id="juridico-upload-documento-title" class="text-lg font-semibold text-gray-900">Anexar documento ao processo</h3><p class="mt-1 text-sm text-gray-600">${escapeHtml(processo?.titulo || 'Processo jurídico')}</p></div><button type="button" data-juridico-upload-close class="text-2xl leading-none text-gray-400 hover:text-gray-700" aria-label="Fechar">&times;</button></div><div class="mt-5 space-y-4"><label class="block text-sm font-medium text-gray-700">Arquivo *<input name="arquivo" type="file" required accept="${ACCEPTED_EXTENSIONS.join(',')}" class="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:font-semibold file:text-indigo-700"></label><p class="-mt-2 text-xs text-gray-500">PDF, imagem, Word, Excel, PowerPoint ou ZIP, com até 25 MB.</p><label class="block text-sm font-medium text-gray-700">Nome do documento<input name="nome" maxlength="500" placeholder="Use o nome do arquivo se este campo ficar vazio" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"></label><label class="block text-sm font-medium text-gray-700">Classificação<select name="classificacao" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"><option value="peticao">Petição</option><option value="citacao">Citação</option><option value="intimacao">Intimação</option><option value="ata_audiencia">Ata de audiência</option><option value="decisao">Decisão</option><option value="sentenca">Sentença</option><option value="acordo">Acordo</option><option value="procuracao">Procuração</option><option value="comprovante">Comprovante</option><option value="outro" selected>Outro</option></select></label><label class="block text-sm font-medium text-gray-700">Observação<textarea name="observacao" rows="3" maxlength="4000" placeholder="Informação opcional sobre o documento" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"></textarea></label></div><div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" data-juridico-upload-close class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancelar</button><button type="submit" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"><i class="fas fa-paperclip mr-2"></i>Anexar documento</button></div></form></div></div>`;
  }

  async function openManager(processoId) {
    if (!processoId) return notice('Não foi possível identificar o processo para carregar documentos.', 'error');
    activeProcessId = processoId;
    document.getElementById('juridico-documentos-modal')?.remove();
    try {
      const detail = await api(`/processos/${encodeURIComponent(processoId)}`);
      document.body.insertAdjacentHTML('beforeend', managerMarkup(detail));
      const modal = document.getElementById('juridico-documentos-modal');
      modal.dataset.processoId = String(processoId);
      enhanceManager(modal, detail);
    } catch (error) {
      notice(error.message || 'Não foi possível carregar os documentos.', 'error');
    }
  }

  async function detachDocument(button) {
    const processoId = processIdFor(button);
    const vinculoId = Number(button.dataset.juridicoDesvincularDocumento || 0);
    if (!processoId || !vinculoId || !window.confirm('Desvincular este documento do processo? O arquivo continuará preservado no Acervo.')) return;
    button.disabled = true;
    try {
      await api(`/processos/${processoId}/documentos/${vinculoId}`, { method: 'DELETE' });
      notice('Documento desvinculado. O arquivo permanece no Acervo.');
      await openManager(processoId);
    } catch (error) {
      notice(error.message || 'Não foi possível desvincular o documento.', 'error');
      button.disabled = false;
    }
  }

  function openUpload(processoId, processo) {
    if (!processoId || !roleCanManage()) return;
    document.getElementById('juridico-upload-documento-modal')?.remove();
    document.body.insertAdjacentHTML('beforeend', uploadMarkup(processo));
    const modal = document.getElementById('juridico-upload-documento-modal');
    modal.dataset.processoId = String(processoId);
    ensureVisualStyles();
    modal.querySelector('.mt-6')?.insertAdjacentHTML('beforebegin', progressMarkup());
    modal.querySelector('[name="arquivo"]')?.focus();
  }

  async function submitUpload(form) {
    const modal = form.closest('#juridico-upload-documento-modal');
    const processoId = Number(modal?.dataset?.processoId || activeProcessId || 0);
    const file = form.elements.arquivo?.files?.[0];
    if (!processoId || !file) return notice('Selecione um documento para anexar.', 'error');
    const extension = `.${String(file.name || '').split('.').pop() || ''}`.toLowerCase();
    if (file.size > MAX_FILE_BYTES) return notice('O documento excede o limite de 25 MB.', 'error');
    if (!ACCEPTED_EXTENSIONS.includes(extension)) return notice('Tipo de arquivo não permitido.', 'error');
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Anexando…';
    try {
      await uploadWithProgress(processoId, new FormData(form), modal);
      setUploadProgress(modal, 100, 'Documento vinculado com sucesso.', 'success');
      showUploadSuccess(modal, file.name);
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      modal.remove();
      notice('Documento anexado e vinculado ao processo.');
      await openManager(processoId);
    } catch (error) {
      setUploadProgress(modal, 100, error.message || 'Não foi possível anexar o documento.', 'error');
      notice(error.message || 'Não foi possível anexar o documento.', 'error');
      submit.disabled = false;
      submit.innerHTML = '<i class="fas fa-paperclip mr-2"></i>Anexar documento';
    }
  }

  function decorateDetail(modal) {
    if (!modal || modal.dataset.juridicoDocumentosReady === 'true') return;
    modal.dataset.juridicoDocumentosReady = 'true';
    if (activeProcessId) modal.dataset.processoId = String(activeProcessId);
    const acervoButton = modal.querySelector('[data-juridico-acervo]');
    if (acervoButton) {
      acervoButton.innerHTML = '<i class="fas fa-folder-open mr-2"></i>Documentos do processo';
      acervoButton.setAttribute('title', 'Ver documentos vinculados ao processo');
      if (roleCanManage() && !modal.querySelector('[data-juridico-anexar-documento]')) {
        acervoButton.insertAdjacentHTML('afterend', '<button data-juridico-anexar-documento type="button" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"><i class="fas fa-paperclip mr-2"></i>Anexar documento</button>');
      }
    }
  }

  function observeDetails() {
    observer?.disconnect();
    observer = new MutationObserver(() => document.querySelectorAll('#juridico-detalhe-modal').forEach(decorateDetail));
    observer.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll('#juridico-detalhe-modal').forEach(decorateDetail);
  }

  document.addEventListener('click', (event) => {
    const open = event.target.closest('[data-juridico-open]');
    if (open) activeProcessId = Number(open.dataset.juridicoOpen || 0) || null;
    const acervo = event.target.closest('[data-juridico-acervo]');
    if (acervo && acervo.closest('#juridico-detalhe-modal')) {
      event.preventDefault();
      event.stopPropagation();
      openManager(processIdFor(acervo));
      return;
    }
    const attach = event.target.closest('[data-juridico-anexar-documento]');
    if (attach) {
      const detail = attach.closest('#juridico-detalhe-modal');
      const title = detail?.querySelector('h3')?.textContent || 'Processo jurídico';
      openUpload(processIdFor(attach), { titulo: title });
      return;
    }
    if (event.target.closest('[data-juridico-documento-close]')) document.getElementById('juridico-documentos-modal')?.remove();
    if (event.target.closest('[data-juridico-upload-close]')) document.getElementById('juridico-upload-documento-modal')?.remove();
    if (event.target.closest('[data-juridico-preview-close]')) document.getElementById('juridico-preview-documento-modal')?.remove();
    const preview = event.target.closest('[data-juridico-previsualizar-documento]');
    if (preview) {
      const manager = preview.closest('#juridico-documentos-modal');
      const doc = (manager?._juridicoDocuments || []).find((item) => String(item.vinculo_id) === String(preview.dataset.juridicoPrevisualizarDocumento));
      if (doc && previewable(doc)) {
        document.getElementById('juridico-preview-documento-modal')?.remove();
        document.body.insertAdjacentHTML('beforeend', previewMarkup(doc));
      }
      return;
    }
    const resetFilters = event.target.closest('[data-juridico-documento-limpar-filtros]');
    if (resetFilters) {
      const manager = resetFilters.closest('#juridico-documentos-modal');
      manager?.querySelectorAll('[data-juridico-documento-busca], [data-juridico-documento-tipo], [data-juridico-documento-data-inicial], [data-juridico-documento-data-final]').forEach((input) => { input.value = ''; });
      renderFilteredDocuments(manager);
      return;
    }
    const unlink = event.target.closest('[data-juridico-desvincular-documento]');
    if (unlink) detachDocument(unlink);
  }, true);

  document.addEventListener('submit', (event) => {
    const form = event.target.closest('#juridico-upload-documento-form');
    if (!form) return;
    event.preventDefault();
    submitUpload(form);
  }, true);

  document.addEventListener('input', (event) => {
    if (!event.target.matches?.('[data-juridico-documento-busca], [data-juridico-documento-data-inicial], [data-juridico-documento-data-final]')) return;
    renderFilteredDocuments(event.target.closest('#juridico-documentos-modal'));
  }, true);
  document.addEventListener('change', (event) => {
    if (!event.target.matches?.('[data-juridico-documento-tipo], [data-juridico-documento-data-inicial], [data-juridico-documento-data-final]')) return;
    renderFilteredDocuments(event.target.closest('#juridico-documentos-modal'));
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observeDetails, { once: true });
  else observeDetails();
})();
