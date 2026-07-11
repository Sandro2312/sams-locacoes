/**
 * crm-contas-receber.js — Módulo dedicado para Contas a Receber
 * Extraído de modules.js e forms.js para facilitar manutenção.
 * Versão: 1.0.0 | Criado em: 2026-07-03
 *
 * Expõe:
 *   window.ContasReceberModule.syncFromBackend()  — sincroniza dados do backend
 *   window.ContasReceberModule.load()             — carrega e renderiza a lista
 *   window.ContasReceberModule.rerender()         — re-renderiza a lista com dados locais
 *   window.ContasReceberModule.getForm(id)        — retorna HTML do formulário
 *   window.ContasReceberModule.handleCreate(data) — POST para criar nova conta
 *   window.ContasReceberModule.handleUpdate(id, data) — PUT para atualizar conta
 *   window.ContasReceberModule.populateClienteSelect(form) — popula o select de clientes
 *
 * Compatibilidade retroativa:
 *   window.FinanceiroModule.loadContasReceber     → aponta para ContasReceberModule.load
 *   window.FinanceiroModule.rerenderContasReceberList → aponta para ContasReceberModule.rerender
 *   ModuleSystem.syncContasReceberFromBackend     → aponta para ContasReceberModule.syncFromBackend
 */

(function () {
  'use strict';

  // ─── Flag global de sessão expirada ────────────────────────────────────────
  // Inicializar a flag apenas se ainda não existir (evitar reset por reload)
  if (typeof window._crmSessionExpired === 'undefined') window._crmSessionExpired = false;

  /** Trata um 401/403: seta flag, para polling e exibe login — UMA única vez */
  function handleAuthError() {
    if (window._crmSessionExpired) return; // já tratado, não repetir
    window._crmSessionExpired = true;
    // Parar setInterval do módulo, se existir
    try {
      if (window._crmContasReceberInterval) {
        clearInterval(window._crmContasReceberInterval);
        window._crmContasReceberInterval = null;
      }
    } catch {}
    // Exibir notificação única (deduplicação já está no utils.js)
    try {
      if (window.NotificationSystem && typeof window.NotificationSystem.warning === 'function') {
        window.NotificationSystem.warning('Sessão expirada. Redirecionando para o login...');
      }
    } catch {}
    // Redirecionar para login após breve delay
    setTimeout(() => {
      try {
        if (window.AuthSystem && typeof window.AuthSystem.logout === 'function') {
          window.AuthSystem.logout();
        } else if (window.AuthSystem && typeof window.AuthSystem.showLogin === 'function') {
          window.AuthSystem.showLogin();
        }
      } catch {}
    }, 800);
  }


  // ─── Utilitários internos ────────────────────────────────────────────────────

  function formatMoney(value) {
    try {
      const n = typeof value === 'string' ? Number(String(value).replace(',', '.')) : Number(value);
      const safe = Number.isFinite(n) ? n : 0;
      return safe.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch {
      return '0,00';
    }
  }

  function formatDate(ymd) {
    if (!ymd) return '-';
    try {
      const s = String(ymd).trim();
      // Bug 3 Fix: extrair componentes diretamente da string para evitar conversão de fuso horário
      // new Date('AAAA-MM-DD') interpreta como UTC meia-noite, que em UTC-3 vira o dia anterior
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const [y, m, d] = s.slice(0, 10).split('-');
        return `${d}/${m}/${y}`;
      }
      // Para timestamps ISO (ex: 2026-07-01T00:00:00.000Z), extrair a parte de data
      if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
        const [y, m, d] = s.slice(0, 10).split('-');
        return `${d}/${m}/${y}`;
      }
      // Fallback para outros formatos
      return s;
    } catch {
      return String(ymd);
    }
  }

  function statusBadge(status) {
    const s = (status || 'Pendente').toLowerCase();
    const map = {
      pago:      'bg-green-100 text-green-800',
      pendente:  'bg-yellow-100 text-yellow-800',
      vencido:   'bg-red-100 text-red-800',
      cancelado: 'bg-gray-100 text-gray-800',
    };
    const cls = map[s] || 'bg-gray-100 text-gray-800';
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}">${status || 'Pendente'}</span>`;
  }

  function resolveCliente(clienteId) {
    const id = clienteId != null && String(clienteId).trim() !== '' ? String(clienteId) : null;
    if (!id) return { nome: null, email: null };
    const all = [
      ...((window.ModuleSystem?.data?.clientes) || []),
      ...((window.ModuleSystem?.data?.leads) || []),
    ];
    const found = all.find(c => c && c.id != null && String(c.id) === id);
    if (!found) return { nome: null, email: null };
    return {
      nome: found.nome || found.razao_social || found.empresa || null,
      email: found.email || null,
    };
  }

  function normalize(r) {
    const clienteId = r.clienteId ?? r.cliente_id ?? null;
    const resolved = resolveCliente(clienteId);
    return {
      id: r.id,
      vendaId: r.vendaId ?? r.venda_id ?? null,
      clienteId,
      centroCusto: r.centroCusto ?? r.centro_custo ?? null,
      tipoReceita: r.tipoReceita ?? r.tipo_receita ?? null,
      descricao: r.descricao ?? '',
      valor: r.valor ?? 0,
      vencimento: r.vencimento ?? null,
      status: r.status ?? 'Pendente',
      dataPagamento: r.dataPagamento ?? r.data_pagamento ?? null,
      formaPagamento: r.formaPagamento ?? r.forma_pagamento ?? null,
      observacoes: r.observacoes ?? null,
      clienteNome: r.clienteNome ?? r.cliente_nome ?? resolved.nome ?? null,
      clienteEmail: r.clienteEmail ?? r.cliente_email ?? resolved.email ?? null,
      created_at: r.created_at ?? r.createdAt ?? null,
      updated_at: r.updated_at ?? r.updatedAt ?? null,
    };
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ─── Renderização da tabela ──────────────────────────────────────────────────

  function renderRows(list, tbody) {
    if (!tbody) return;
    tbody.innerHTML = list.map(cr => `
      <tr class="hover:bg-gray-50">
        <td class="px-4 py-3 text-sm font-medium text-gray-900">${escapeHtml(cr.clienteNome) || '-'}</td>
        <td class="px-4 py-3 text-sm text-gray-700">${escapeHtml(cr.descricao) || '-'}</td>
        <td class="px-4 py-3 text-sm text-gray-500">${escapeHtml(cr.centroCusto) || '-'}</td>
        <td class="px-4 py-3 text-sm text-gray-500">${escapeHtml(cr.tipoReceita) || '-'}</td>
        <td class="px-4 py-3 text-sm font-semibold text-gray-900">R$ ${formatMoney(cr.valor)}</td>
        <td class="px-4 py-3 text-sm text-gray-500">${formatDate(cr.vencimento)}</td>
        <td class="px-4 py-3">${statusBadge(cr.status)}</td>
        <td class="px-4 py-3 text-sm">
          <div class="flex items-center space-x-2">
            <button data-action="view" data-module="contasReceber" data-id="${cr.id}"
                    class="text-blue-600 hover:text-blue-900" title="Ver detalhes" aria-label="Ver detalhes">
              <i class="fas fa-eye"></i>
            </button>
            <button data-action="edit" data-module="contasReceber" data-id="${cr.id}"
                    class="text-indigo-600 hover:text-indigo-900" title="Editar" aria-label="Editar conta a receber">
              <i class="fas fa-edit"></i>
            </button>
            <button data-action="delete" data-module="contasReceber" data-id="${cr.id}"
                    class="text-red-600 hover:text-red-900" title="Excluir" aria-label="Excluir conta a receber ${escapeHtml(cr.descricao) || ''}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('') || `<tr><td colspan="8" class="px-6 py-4 text-sm text-gray-500">Nenhuma conta a receber encontrada.</td></tr>`;
  }

  // ─── API pública ─────────────────────────────────────────────────────────────

  const ContasReceberModule = {

    /** Sincroniza dados do backend para o ModuleSystem local */
    async syncFromBackend() {
      try {
        if (window._crmSessionExpired) return; // sessão já expirada, não tentar
        const response = await fetch('/api/crm/contas-receber', { credentials: 'include' });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) handleAuthError();
          return;
        }
        const json = await response.json().catch(() => ({}));
        const rows = Array.isArray(json) ? json : (Array.isArray(json.data) ? json.data : []);
        if (!rows.length) return;
        const byId = new Map();
        for (const c of (Array.isArray(window.ModuleSystem?.data?.contasReceber) ? window.ModuleSystem.data.contasReceber : [])) {
          if (c && c.id != null) byId.set(String(c.id), c);
        }
        for (const c of rows) {
          if (c && c.id != null) byId.set(String(c.id), normalize(c));
        }
        if (window.ModuleSystem?.data) {
          window.ModuleSystem.data.contasReceber = Array.from(byId.values());
          if (typeof window.ModuleSystem.saveData === 'function') window.ModuleSystem.saveData();
        }
        console.log(`✅ [ContasReceberModule] Sincronizados ${rows.length} registros do backend`);
      } catch (e) {
        console.warn('[ContasReceberModule] Falha ao sincronizar:', e);
      }
    },

    /** Re-renderiza a lista com dados já carregados no ModuleSystem */
    rerender() {
      try {
        const tbody = document.getElementById('contas-receber-list-body');
        if (!tbody) return;
        const list = (window.ModuleSystem?.data && Array.isArray(window.ModuleSystem.data.contasReceber))
          ? window.ModuleSystem.data.contasReceber
          : [];
        renderRows(list, tbody);
      } catch (e) {
        console.warn('[ContasReceberModule] Falha ao re-renderizar:', e);
      }
    },

    /** Carrega dados do backend e renderiza a lista completa */
    async load() {
      const container = document.getElementById('contas-receber-list-container');
      const tbody = document.getElementById('contas-receber-list-body');
      if (!container || !tbody) return;

      container.setAttribute('aria-busy', 'true');
      tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-4 text-sm text-gray-500">Carregando contas a receber...</td></tr>`;

      const local = (window.ModuleSystem?.data && Array.isArray(window.ModuleSystem.data.contasReceber))
        ? [...window.ModuleSystem.data.contasReceber]
        : [];
      let api = [];

      try {
        if (window._crmSessionExpired) { api = []; } else {
          const response = await fetch('/api/crm/contas-receber', { credentials: 'include' });
          const data = await response.json().catch(() => ({}));
          if (response.ok) {
            api = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
          } else if (response.status === 401 || response.status === 403) {
            handleAuthError();
          }
        }
      } catch {}

      const byId = new Map();
      const withoutId = [];

      for (const item of local) {
        if (item && item.id != null) byId.set(String(item.id), normalize(item));
        else withoutId.push(item);
      }

      for (const item of api) {
        if (item && item.id != null) {
          const key = String(item.id);
          const prev = byId.get(key) || {};
          const mergedRaw = { ...prev, ...item };
          // Preservar centroCusto local se o backend retornar nulo
          const prevCentro = prev?.centroCusto ?? prev?.centro_custo ?? null;
          const nextCentro = mergedRaw?.centroCusto ?? mergedRaw?.centro_custo ?? null;
          if ((nextCentro === null || nextCentro === undefined || String(nextCentro).trim() === '') &&
              prevCentro != null && String(prevCentro).trim() !== '') {
            mergedRaw.centroCusto = prevCentro;
            mergedRaw.centro_custo = prevCentro;
          }
          byId.set(key, normalize(mergedRaw));
        } else {
          withoutId.push(item);
        }
      }

      const merged = [...withoutId, ...byId.values()].sort((a, b) => {
        const av = (a && (a.vencimento || a.created_at || '')) || '';
        const bv = (b && (b.vencimento || b.created_at || '')) || '';
        if (av < bv) return -1;
        if (av > bv) return 1;
        return String(a?.id ?? '').localeCompare(String(b?.id ?? ''), 'pt-BR', { numeric: true });
      });

      if (window.ModuleSystem?.data) {
        window.ModuleSystem.data.contasReceber = merged;
        if (typeof window.ModuleSystem.saveData === 'function') window.ModuleSystem.saveData();
      }

      renderRows(merged, tbody);
      container.removeAttribute('aria-busy');
    },

    /** Popula o select de clientes dentro de um formulário */
    async populateClienteSelect(form, selectedId = null) {
      if (!form) return;
      const sel = form.querySelector('select[name="clienteId"]');
      if (!sel) return;

      try {
        if (window.ModuleSystem && typeof window.ModuleSystem.syncClientesFromBackend === 'function') {
          await window.ModuleSystem.syncClientesFromBackend();
        }
      } catch {}

      const allClientes = (() => {
        const merged = [];
        const seen = new Set();
        const push = (c) => {
          if (!c || c.id == null) return;
          const key = String(c.id);
          if (seen.has(key)) return;
          seen.add(key);
          merged.push(c);
        };
        (Array.isArray(window.ModuleSystem?.data?.clientes) ? window.ModuleSystem.data.clientes : []).forEach(push);
        (Array.isArray(window.ModuleSystem?.data?.leads) ? window.ModuleSystem.data.leads : []).forEach(push);
        return merged;
      })();

      if (allClientes.length === 0) return;

      const currentVal = selectedId ?? sel.value;
      while (sel.options.length > 1) sel.remove(1);
      allClientes.forEach(c => {
        const nome = c.nome || c.razao_social || c.empresa || `ID ${c.id}`;
        const email = c.email ? ` • ${c.email}` : '';
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${nome}${email}`;
        sel.appendChild(opt);
      });
      if (currentVal) sel.value = currentVal;
    },

    /** Retorna o HTML do formulário de Conta a Receber */
    getForm(id = null) {
      const conta = id
        ? (window.ModuleSystem?.data?.contasReceber?.find(c => String(c.id) === String(id)) || {})
        : {};
      const formId = `cr-${id || 'new'}`;
      const vencimento = id ? ((conta?.vencimento || '').slice(0, 10)) : '';
      const dataPagamento = (conta?.dataPagamento ?? conta?.data_pagamento ?? '').slice(0, 10);
      const selectedClienteId = conta?.clienteId ?? conta?.cliente_id ?? '';

      // Recuperar último Centro de Custos usado
      let lastCentro = '';
      if (!id) {
        try { lastCentro = localStorage.getItem('sams_crm_last_centro_custo') || ''; } catch {}
      }
      const centroCusto = id ? (conta?.centroCusto ?? conta?.centro_custo ?? '') : lastCentro;

      const comprovanteNome = conta?.comprovante?.nome || conta?.comprovante_nome || null;
      const comprovanteUrl = conta?.comprovante?.download_url || null;

      return `
        <form id="crud-form" data-action="${id ? 'update' : 'create'}" data-module="contasReceber" data-id="${id || ''}" autocomplete="${id ? 'on' : 'off'}">
          <div class="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg mb-6 border border-green-200">
            <h3 class="text-xl font-bold text-gray-800 mb-2">
              <i class="fas fa-dollar-sign mr-3 text-green-600"></i>${id ? 'Editar' : 'Nova'} Conta a Receber
            </h3>
            <p class="text-sm text-gray-600">Registre receitas e acompanhe o status de pagamento.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="md:col-span-2">
              <label for="desc_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Descrição *</label>
              <input type="text" id="desc_${formId}" name="descricao" value="${escapeHtml(conta?.descricao || '')}" required
                     placeholder="Ex: Locação stand, sinal de contrato, adicional"
                     class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
            </div>

            <div>
              <label for="cliente_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
              <select id="cliente_${formId}" name="clienteId" autocomplete="off"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                <option value="">Selecione um cliente...</option>
                ${(window.ModuleSystem?.data?.clientes || []).map(c => {
                  const nome = c.nome || c.razao_social || c.empresa || `ID ${c.id}`;
                  const email = c.email ? ` • ${c.email}` : '';
                  const sel2 = String(c.id) === String(selectedClienteId) ? ' selected' : '';
                  return `<option value="${c.id}"${sel2}>${escapeHtml(nome + email)}</option>`;
                }).join('')}
              </select>
            </div>

            <div>
              <label for="venda_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Venda (ID)</label>
              <input type="text" id="venda_${formId}" name="vendaId" value="${escapeHtml(String(conta?.vendaId ?? conta?.venda_id ?? ''))}"
                     placeholder="Opcional"
                     class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
            </div>

            <div>
              <label for="centro_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Centro de Custos</label>
              <input type="text" id="centro_${formId}" name="centroCusto" value="${escapeHtml(centroCusto)}"
                     placeholder="Ex: Evento XPTO - Locação / Montagem"
                     class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
            </div>

            <div>
              <label for="tipo_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Tipo *</label>
              <select id="tipo_${formId}" name="tipoReceita"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                ${['stand','locacao','servico','adicional','outro'].map(t =>
                  `<option value="${t}" ${(conta?.tipoReceita ?? conta?.tipo_receita ?? 'stand') === t ? 'selected' : ''}>${t}</option>`
                ).join('')}
              </select>
            </div>

            <div>
              <label for="valor_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Valor (R$) *</label>
              <input type="number" id="valor_${formId}" name="valor" value="${conta?.valor ?? ''}" required min="0" step="0.01"
                     placeholder="0,00"
                     class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
            </div>

            <div>
              <label for="venc_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Vencimento *</label>
              <input type="date" id="venc_${formId}" name="vencimento" value="${vencimento}" required
                     class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
            </div>

            <div>
              <label for="status_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select id="status_${formId}" name="status"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                ${!id ? '<option value="Pendente">Pendente</option>' : ''}
                ${['Pendente','Pago','Vencido','Cancelado'].map(s =>
                  `<option value="${s}" ${id && conta?.status === s ? 'selected' : ''}>${s}</option>`
                ).join('')}
              </select>
            </div>

            <div>
              <label for="dpag_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Data de Pagamento</label>
              <input type="date" id="dpag_${formId}" name="dataPagamento" value="${dataPagamento}"
                     class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
            </div>

            <div>
              <label for="forma_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Forma de Pagamento</label>
              <input type="text" id="forma_${formId}" name="formaPagamento" value="${escapeHtml(conta?.formaPagamento ?? conta?.forma_pagamento ?? '')}"
                     placeholder="Ex: Pix, Boleto, Transferência"
                     class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
            </div>

            <div class="md:col-span-2">
              <label for="comprovante_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Comprovante (arquivo)</label>
              <input id="comprovante_${formId}" type="file" name="comprovante" accept="application/pdf,image/*"
                     class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white">
              <div class="text-xs text-gray-600 mt-1">Obrigatório apenas quando o status for Pago.</div>
              ${comprovanteNome ? `
                <div class="flex items-center gap-2 mt-2">
                  <div class="text-xs text-gray-700">Atual: ${escapeHtml(String(comprovanteNome))}</div>
                  ${comprovanteUrl ? `<a class="text-xs text-indigo-600 hover:text-indigo-900" href="${escapeHtml(String(comprovanteUrl))}" target="_blank" rel="noopener">Baixar</a>` : ''}
                  ${id ? `<button type="button" class="text-xs text-red-600 hover:text-red-900"
                    onclick="(async()=>{try{const r=await fetch('/api/crm/contas-receber/${id}/comprovante',{method:'DELETE',credentials:'include'});const j=await r.json().catch(()=>null);if(!r.ok)throw new Error((j&&j.error)?j.error:'Falha ao remover');if(window.NotificationSystem&&typeof window.NotificationSystem.success==='function')window.NotificationSystem.success('Comprovante removido.');if(window.FormSystem){FormSystem.closeModal();FormSystem.showEditForm('contasReceber','${id}');}}catch(e){if(window.NotificationSystem&&typeof window.NotificationSystem.error==='function')window.NotificationSystem.error(e&&e.message?e.message:'Falha ao remover comprovante');else alert(e&&e.message?e.message:'Falha ao remover comprovante');}})()">Remover</button>` : ''}
                </div>
              ` : ''}
            </div>

            <div class="md:col-span-2">
              <label for="obs_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Observações</label>
              <textarea id="obs_${formId}" name="observacoes" rows="3" placeholder="Observações adicionais (opcional)"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">${escapeHtml(conta?.observacoes || '')}</textarea>
            </div>
          </div>

          <div class="flex justify-end space-x-4 pt-6 border-t">
            <button type="button" onclick="FormSystem.closeModal()"
                    class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-300">
              <i class="fas fa-times mr-2"></i>Cancelar
            </button>
            <button type="submit"
                    class="btn-submit px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-300">
              <i class="fas fa-save mr-2"></i>${id ? 'Atualizar' : 'Salvar'} Conta
            </button>
          </div>
        </form>
      `;
    },

    /** POST — cria nova conta a receber */
    async handleCreate(data) {
      const resp = await fetch('/api/crm/contas-receber', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          vendaId:               data.vendaId ?? null,
          clienteId:             data.clienteId ?? null,
          centroCusto:           data.centroCusto ?? null,
          centro_custo:          data.centroCusto ?? null,
          tipoReceita:           data.tipoReceita ?? null,
          descricao:             data.descricao || '',
          valor:                 parseFloat(String(data.valor || 0).replace(',', '.')) || 0,
          vencimento:            data.vencimento ?? null,
          status:                (data.status || 'Pendente').toLowerCase(),
          dataPagamento:         data.dataPagamento ?? null,
          formaPagamento:        data.formaPagamento ?? null,
          observacoes:           data.observacoes ?? null,
          comprovanteName:       data.comprovanteName ?? null,
          comprovanteMime:       data.comprovanteMime ?? null,
          comprovanteDataBase64: data.comprovanteDataBase64 ?? null,
        }),
      });
      const payload = await resp.json().catch(() => ({}));
      if (resp.ok && payload && payload.id != null) {
        const newItem = { ...data, id: payload.id };
        // Persistir Centro de Custos para futuros lançamentos
        if (data.centroCusto && String(data.centroCusto).trim() !== '') {
          try { localStorage.setItem('sams_crm_last_centro_custo', String(data.centroCusto).trim()); } catch {}
        }
        if (data.comprovanteDataBase64) {
          newItem.comprovante = {
            nome: data.comprovanteName || 'comprovante',
            mime: data.comprovanteMime || null,
            download_url: `/api/crm/contas-receber/${payload.id}/comprovante/download`,
          };
          delete newItem.comprovanteDataBase64;
          delete newItem.comprovanteName;
          delete newItem.comprovanteMime;
        }
        if (window.ModuleSystem && typeof window.ModuleSystem.addItem === 'function') {
          window.ModuleSystem.addItem('contasReceber', newItem);
        }
        return { ok: true, id: payload.id, item: newItem };
      }
      const msg = payload?.error ? String(payload.error) : '';
      if (resp.status >= 400) throw new Error(msg || 'Falha ao salvar conta a receber.');
      // Fallback local
      let createdId = null;
      if (window.ModuleSystem && typeof window.ModuleSystem.addItem === 'function') {
        createdId = window.ModuleSystem.addItem('contasReceber', { ...data });
      }
      return { ok: false, id: createdId };
    },

    /** PUT — atualiza conta a receber existente */
    async handleUpdate(id, data) {
      let ok = false;
      try {
        const resp = await fetch(`/api/crm/contas-receber/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            vendaId:        data.vendaId ?? null,
            clienteId:      data.clienteId ?? null,
            centroCusto:    data.centroCusto ?? null,
            centro_custo:   data.centroCusto ?? null,
            tipoReceita:    data.tipoReceita ?? null,
            descricao:      data.descricao || '',
            valor:          parseFloat(String(data.valor || 0).replace(',', '.')) || 0,
            vencimento:     data.vencimento ?? null,
            status:         (data.status || 'Pendente').toLowerCase(),
            dataPagamento:  data.dataPagamento ?? null,
            formaPagamento: data.formaPagamento ?? null,
            observacoes:    data.observacoes ?? null,
          }),
        });
        ok = resp.ok;
        if (!resp.ok) console.warn('[ContasReceberModule] PUT não OK:', resp.status);
      } catch (err) {
        console.warn('[ContasReceberModule] Falha no PUT:', err);
      }

      // Persistir Centro de Custos
      if (data.centroCusto && String(data.centroCusto).trim() !== '') {
        try { localStorage.setItem('sams_crm_last_centro_custo', String(data.centroCusto).trim()); } catch {}
      }

      // Atualizar localmente com clienteNome resolvido
      const nextData = { ...data };
      if (nextData.clienteId != null && String(nextData.clienteId).trim() !== '') {
        const allC = [
          ...((window.ModuleSystem?.data?.clientes) || []),
          ...((window.ModuleSystem?.data?.leads) || []),
        ];
        const found = allC.find(c => c && c.id != null && String(c.id) === String(nextData.clienteId));
        if (found) {
          nextData.clienteNome = found.nome || found.razao_social || found.empresa || null;
          nextData.clienteEmail = found.email || null;
        }
      } else if (nextData.clienteId == null || String(nextData.clienteId).trim() === '') {
        nextData.clienteNome = null;
        nextData.clienteEmail = null;
      }

      if (window.ModuleSystem && typeof window.ModuleSystem.updateItem === 'function') {
        window.ModuleSystem.updateItem('contasReceber', id, nextData);
      }

      // Recarregar lista para sincronismo com o backend
      if (ok) {
        setTimeout(() => {
          ContasReceberModule.load().catch(() => {});
        }, 300);
      }

      return { ok };
    },
  };

  // ─── Expor globalmente ───────────────────────────────────────────────────────

  window.ContasReceberModule = ContasReceberModule;

  // Compatibilidade retroativa: FinanceiroModule
  if (!window.FinanceiroModule) window.FinanceiroModule = {};
  window.FinanceiroModule.loadContasReceber = () => ContasReceberModule.load();
  window.FinanceiroModule.rerenderContasReceberList = () => ContasReceberModule.rerender();

  console.log('✅ [crm-contas-receber.js] Módulo carregado');
})();
