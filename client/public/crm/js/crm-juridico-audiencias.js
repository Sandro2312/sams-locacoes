(function () {
  'use strict';

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const notice = (message, type = 'success') => window.Toast?.show ? window.Toast.show(message, type) : window.alert(message);
  const authHeaders = () => { try { return window.AuthSystem?._getAuthHeaders?.() || {}; } catch { return {}; } };
  const dateLabel = (value) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : '—';

  function isHearingSoon(value) {
    if (!value) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    const days = Math.floor((target.getTime() - today.getTime()) / 86400000);
    return days >= 0 && days <= 7;
  }

  async function request(path, options = {}) {
    const response = await fetch(`/api/crm/juridico${path}`, { credentials: 'include', ...options, headers: { ...authHeaders(), ...(options.headers || {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Não foi possível concluir a operação.');
    return payload;
  }

  function processIdFromModal(modal) {
    return String(modal?.querySelector?.('[data-juridico-datajud]')?.dataset?.juridicoDatajud || '').trim();
  }

  function enhanceForm(form) {
    if (!form || form.dataset.audienciaAprimorada === '1') return;
    const observation = form.querySelector('textarea[name="observacoes"]')?.closest('label');
    if (!observation) return;
    const extra = document.createElement('div');
    extra.className = 'grid grid-cols-1 gap-3 md:col-span-2 md:grid-cols-2';
    extra.innerHTML = `<label class="text-sm font-medium text-gray-700">Local ou endereço da audiência<input name="localAudiencia" maxlength="500" placeholder="Ex.: TRT4, Sala 03 ou endereço físico" class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"></label>
      <label class="text-sm font-medium text-gray-700">Link da audiência virtual<input name="linkAudiencia" inputmode="url" maxlength="2000" placeholder="https://..." class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"></label>
      <label class="text-sm font-medium text-gray-700 md:col-span-2">PDF da audiência <span class="font-normal text-gray-500">(opcional, até 25 MB)</span><input type="file" name="pdfAudiencia" accept="application/pdf,.pdf" class="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-amber-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-amber-800 hover:file:bg-amber-200"><span class="mt-1 block text-xs text-gray-500">A ata, intimação ou pauta será preservada no Acervo e vinculada diretamente a esta audiência.</span></label>`;
    observation.before(extra);
    form.querySelectorAll('[data-juridico-prazo-submit], button[form="juridico-prazo-form"]').forEach((button) => { button.innerHTML = '<i class="fas fa-calendar-check mr-2"></i>Registrar audiência'; });
    form.dataset.audienciaAprimorada = '1';
  }

  async function renderHearingDetails(modal) {
    if (!modal || modal.dataset.audienciaDetalhesCarregados === '1') return;
    const processoId = processIdFromModal(modal);
    if (!processoId) return;
    modal.dataset.audienciaDetalhesCarregados = '1';
    try {
      const detail = await request(`/processos/${encodeURIComponent(processoId)}`);
      const hearings = (detail.prazos || []).filter((item) => item.tipo === 'audiencia');
      if (!hearings.length) return;
      const section = document.createElement('section');
      section.id = 'juridico-audiencia-detalhes';
      section.className = 'mt-4 rounded-lg border border-amber-200 bg-amber-50/50 p-4';
      section.innerHTML = `<h4 class="text-sm font-semibold text-gray-900"><i class="fas fa-gavel mr-2 text-amber-700"></i>Detalhes das audiências</h4><div class="mt-3 space-y-3">${hearings.map((hearing) => {
        const documents = Array.isArray(hearing.documentos) ? hearing.documentos : [];
        const soon = isHearingSoon(hearing.data_prazo);
        return `<article class="rounded-md border ${soon ? 'border-rose-300 bg-rose-50' : 'border-amber-200 bg-white'} p-3"><div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p class="font-semibold text-gray-900">${escapeHtml(hearing.titulo)}</p><p class="text-sm ${soon ? 'font-semibold text-rose-800' : 'text-amber-800'}">${dateLabel(hearing.data_prazo)}${soon ? ' · Em até 7 dias' : ''}</p></div><span class="inline-flex w-fit rounded-full px-2 py-1 text-xs font-semibold ${soon ? 'bg-rose-200 text-rose-900' : 'bg-amber-100 text-amber-800'}">Audiência</span></div>${hearing.local_audiencia ? `<p class="mt-2 text-sm text-gray-700"><i class="fas fa-location-dot mr-1 text-gray-500"></i>${escapeHtml(hearing.local_audiencia)}</p>` : ''}${hearing.link_audiencia ? `<p class="mt-2 text-sm"><a href="${escapeHtml(hearing.link_audiencia)}" target="_blank" rel="noopener noreferrer" class="font-medium text-indigo-700 hover:underline"><i class="fas fa-video mr-1"></i>Abrir audiência virtual</a></p>` : ''}${documents.length ? `<div class="mt-3 flex flex-wrap gap-2">${documents.map((doc) => `<a href="${escapeHtml(doc.url_arquivo)}" target="_blank" rel="noopener noreferrer" class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"><i class="fas fa-file-pdf mr-1 text-rose-600"></i>${escapeHtml(doc.nome || doc.nome_arquivo_original || 'Abrir PDF')}</a>`).join('')}</div>` : '<p class="mt-3 text-xs text-gray-500">Nenhum PDF vinculado a esta audiência.</p>'}</article>`;
      }).join('')}</div>`;
      modal.querySelector('#juridico-prazo-form')?.before(section);
    } catch (error) { console.warn('[Jurídico] detalhes de audiência indisponíveis', error); }
  }

  async function handleFormSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== 'juridico-prazo-form' || form.dataset.audienciaAprimorada !== '1') return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (form.dataset.saving === '1') return;
    const modal = form.closest('#juridico-detalhe-modal'); const processoId = processIdFromModal(modal);
    if (!processoId) return;
    const formData = new FormData(form); const file = formData.get('pdfAudiencia');
    formData.delete('pdfAudiencia');
    const payload = Object.fromEntries(formData.entries());
    if (file instanceof File && file.size && payload.tipo !== 'audiencia') { notice('O anexo PDF direto está disponível somente para audiências.', 'error'); return; }
    if (file instanceof File && file.size > 25 * 1024 * 1024) { notice('O PDF excede o limite de 25 MB.', 'error'); return; }
    const buttons = [...modal.querySelectorAll('[data-juridico-prazo-submit], button[form="juridico-prazo-form"]')];
    form.dataset.saving = '1'; buttons.forEach((button) => { button.disabled = true; });
    try {
      const saved = await request(`/processos/${encodeURIComponent(processoId)}/prazos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (file instanceof File && file.size) {
        const upload = new FormData(); upload.append('arquivo', file); upload.append('nome', `Documento da audiência — ${payload.titulo || 'Audiência'}`); upload.append('observacao', String(payload.observacoes || ''));
        await request(`/processos/${encodeURIComponent(processoId)}/prazos/${encodeURIComponent(saved.id)}/documentos`, { method: 'POST', body: upload });
      }
      notice(file instanceof File && file.size ? 'Audiência registrada e PDF anexado ao processo.' : (saved.message || 'Audiência registrada.'));
      modal?.remove(); window.NavigationSystem?.reloadCurrentPage?.();
    } catch (error) { notice(error.message || 'Não foi possível registrar a audiência.', 'error'); }
    finally { form.dataset.saving = '0'; buttons.forEach((button) => { button.disabled = false; }); }
  }

  function decorateAgendaRows() {
    document.querySelectorAll('#juridico-prazos-root tbody tr').forEach((row) => {
      if (row.dataset.audienciaDecorada === '1') return;
      const cells = row.querySelectorAll('td');
      if (cells.length < 3 || !String(cells[2].textContent || '').toLowerCase().includes('audiência')) return;
      const dateText = String(cells[0].textContent || '').trim(); const match = dateText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (!match || !isHearingSoon(`${match[3]}-${match[2]}-${match[1]}`)) return;
      row.classList.add('bg-rose-50'); cells[0].classList.remove('text-amber-700'); cells[0].classList.add('text-rose-800');
      cells[0].insertAdjacentHTML('beforeend', '<span class="mt-1 block w-fit rounded-full bg-rose-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-900">Audiência em até 7 dias</span>');
      row.dataset.audienciaDecorada = '1';
    });
  }

  function enhance(root = document) {
    root.querySelectorAll?.('#juridico-prazo-form').forEach(enhanceForm);
    root.querySelectorAll?.('#juridico-detalhe-modal').forEach(renderHearingDetails);
    decorateAgendaRows();
  }

  document.addEventListener('submit', handleFormSubmit, true);
  const observer = new MutationObserver((mutations) => mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => { if (node.nodeType === Node.ELEMENT_NODE) enhance(node); })));
  document.addEventListener('DOMContentLoaded', () => { enhance(); observer.observe(document.body, { childList: true, subtree: true }); });
})();
