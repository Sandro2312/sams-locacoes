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
  const processIdFor = (element) => {
    const modal = element?.closest?.('#juridico-detalhe-modal');
    return Number(modal?.dataset?.processoId || activeProcessId || 0);
  };

  function documentCard(doc, canManage) {
    const fileName = escapeHtml(doc.nome_arquivo_original || doc.nome || 'Documento');
    const source = doc.url_arquivo || doc.url_drive || '';
    return `<li class="rounded-lg border border-gray-200 bg-white p-3">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0"><div class="font-medium text-gray-900 break-words"><i class="fas fa-file-alt mr-2 text-indigo-600"></i>${escapeHtml(doc.nome)}</div>
          <div class="mt-1 flex flex-wrap gap-2 text-xs text-gray-500"><span>${fileName}</span>${doc.classificacao ? `<span class="rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">${escapeHtml(String(doc.classificacao).split('_').join(' '))}</span>` : ''}${doc.tamanho_bytes ? `<span>${formatBytes(doc.tamanho_bytes)}</span>` : ''}${doc.anexado_em ? `<span>Anexado em ${new Date(doc.anexado_em).toLocaleDateString('pt-BR')}</span>` : ''}</div>
          ${doc.observacao ? `<p class="mt-1 text-sm text-gray-600 break-words">${escapeHtml(doc.observacao)}</p>` : ''}</div>
        <div class="flex shrink-0 items-center gap-2">${source ? `<a href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer" class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50" title="Abrir ou baixar documento"><i class="fas fa-download mr-1"></i>Abrir</a>` : ''}${canManage ? `<button type="button" data-juridico-desvincular-documento="${doc.vinculo_id}" class="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"><i class="fas fa-unlink mr-1"></i>Desvincular</button>` : ''}</div>
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
      await api(`/processos/${processoId}/documentos`, { method: 'POST', body: new FormData(form) });
      modal.remove();
      notice('Documento anexado e vinculado ao processo.');
      await openManager(processoId);
    } catch (error) {
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
    const unlink = event.target.closest('[data-juridico-desvincular-documento]');
    if (unlink) detachDocument(unlink);
  }, true);

  document.addEventListener('submit', (event) => {
    const form = event.target.closest('#juridico-upload-documento-form');
    if (!form) return;
    event.preventDefault();
    submitUpload(form);
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observeDetails, { once: true });
  else observeDetails();
})();
