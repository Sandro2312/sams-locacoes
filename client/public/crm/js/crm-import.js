/**
 * crm-import.js
 * Modal de importação em lote via planilha (Excel/CSV).
 * Usado por Clientes, Eventos, Contas a Receber e Transações.
 *
 * API pública:
 *   window.CrmImport.open(tabela, onSuccess)
 *   window.CrmImport.downloadModelo(tabela)
 */
(function () {
  'use strict';

  const TABELAS = {
    clientes: { label: 'Clientes', endpoint: '/api/crm/clientes/importar', colunas: ['nome', 'email', 'telefone', 'documento', 'cidade', 'estado', 'status'] },
    eventos: { label: 'Eventos', endpoint: '/api/crm/eventos/importar', colunas: ['nome', 'organizadora', 'local', 'data_inicio', 'data_fim', 'status'] },
    'contas-receber': { label: 'Contas a Receber', endpoint: '/api/crm/contas-receber/importar', colunas: ['descricao', 'cliente', 'valor', 'vencimento', 'status'] },
    transacoes: { label: 'Transações (Despesas)', endpoint: '/api/crm/transacoes/importar', colunas: ['descricao', 'tipo', 'valor', 'data', 'status', 'centro_custo'] },
  };

  const STATUS_CONFIG = {
    ok: { cor: '#16a34a', bg: '#f0fdf4', icone: '✓', label: 'OK' },
    warning: { cor: '#d97706', bg: '#fffbeb', icone: '⚠', label: 'Aviso' },
    duplicate: { cor: '#7c3aed', bg: '#f5f3ff', icone: '⊙', label: 'Duplicata' },
    error: { cor: '#dc2626', bg: '#fef2f2', icone: '✗', label: 'Erro' },
  };

  // ─── Estado interno ──────────────────────────────────────────────────────
  let _state = { tabela: null, onSuccess: null, previewRows: [], selectedIndexes: new Set(), loading: false };

  // ─── Helpers ─────────────────────────────────────────────────────────────
  function fmt(v) {
    if (v === null || v === undefined || v === '') return '<span style="color:#9ca3af">—</span>';
    return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function fmtVal(v) {
    const n = parseFloat(v);
    if (isNaN(n)) return fmt(v);
    return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function getCookie() {
    const m = document.cookie.match(/crm_session=([^;]+)/);
    return m ? m[1] : '';
  }

  // ─── Injetar CSS ─────────────────────────────────────────────────────────
  function injectCSS() {
    if (document.getElementById('crm-import-css')) return;
    const s = document.createElement('style');
    s.id = 'crm-import-css';
    s.textContent = `
      #crm-import-overlay {
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(0,0,0,0.55);
        display: flex; align-items: center; justify-content: center;
        padding: 16px; box-sizing: border-box;
      }
      #crm-import-modal {
        background: #fff; border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.25);
        width: 100%; max-width: 900px; max-height: 90vh;
        display: flex; flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px; color: #1f2937;
      }
      #crm-import-modal .imp-header {
        padding: 18px 22px 14px; border-bottom: 1px solid #e5e7eb;
        display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
      }
      #crm-import-modal .imp-header h2 { margin: 0; font-size: 17px; font-weight: 700; }
      #crm-import-modal .imp-close {
        background: none; border: none; cursor: pointer; font-size: 22px;
        color: #6b7280; line-height: 1; padding: 2px 6px; border-radius: 4px;
      }
      #crm-import-modal .imp-close:hover { background: #f3f4f6; }
      #crm-import-modal .imp-body { padding: 18px 22px; overflow-y: auto; flex: 1; }
      #crm-import-modal .imp-footer {
        padding: 14px 22px; border-top: 1px solid #e5e7eb;
        display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; gap: 10px;
        flex-wrap: wrap;
      }
      #crm-import-modal .imp-btn {
        padding: 8px 18px; border-radius: 7px; border: none; cursor: pointer;
        font-size: 14px; font-weight: 600; transition: opacity .15s;
      }
      #crm-import-modal .imp-btn:disabled { opacity: .5; cursor: not-allowed; }
      #crm-import-modal .imp-btn-primary { background: #f59e0b; color: #fff; }
      #crm-import-modal .imp-btn-primary:hover:not(:disabled) { background: #d97706; }
      #crm-import-modal .imp-btn-secondary { background: #f3f4f6; color: #374151; }
      #crm-import-modal .imp-btn-secondary:hover:not(:disabled) { background: #e5e7eb; }
      #crm-import-modal .imp-btn-success { background: #16a34a; color: #fff; }
      #crm-import-modal .imp-btn-success:hover:not(:disabled) { background: #15803d; }
      #crm-import-modal .imp-drop-zone {
        border: 2px dashed #d1d5db; border-radius: 10px;
        padding: 36px 20px; text-align: center; cursor: pointer;
        transition: border-color .2s, background .2s;
      }
      #crm-import-modal .imp-drop-zone.drag-over { border-color: #f59e0b; background: #fffbeb; }
      #crm-import-modal .imp-drop-zone .imp-drop-icon { font-size: 36px; margin-bottom: 8px; }
      #crm-import-modal .imp-drop-zone p { margin: 4px 0; color: #6b7280; }
      #crm-import-modal .imp-drop-zone strong { color: #1f2937; }
      #crm-import-modal .imp-file-input { display: none; }
      #crm-import-modal .imp-summary {
        display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px;
      }
      #crm-import-modal .imp-badge {
        padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
      }
      #crm-import-modal .imp-table-wrap { overflow-x: auto; border-radius: 8px; border: 1px solid #e5e7eb; }
      #crm-import-modal table { width: 100%; border-collapse: collapse; min-width: 500px; }
      #crm-import-modal thead th {
        background: #f9fafb; padding: 8px 10px; text-align: left;
        font-size: 12px; font-weight: 600; color: #6b7280;
        border-bottom: 1px solid #e5e7eb; white-space: nowrap;
      }
      #crm-import-modal tbody tr { border-bottom: 1px solid #f3f4f6; }
      #crm-import-modal tbody tr:last-child { border-bottom: none; }
      #crm-import-modal tbody td { padding: 7px 10px; vertical-align: top; }
      #crm-import-modal .imp-row-messages { font-size: 11px; color: #6b7280; margin-top: 2px; }
      #crm-import-modal .imp-row-messages span { display: block; }
      #crm-import-modal .imp-spinner {
        display: inline-block; width: 16px; height: 16px;
        border: 2px solid #e5e7eb; border-top-color: #f59e0b;
        border-radius: 50%; animation: imp-spin .6s linear infinite;
        vertical-align: middle; margin-right: 6px;
      }
      @keyframes imp-spin { to { transform: rotate(360deg); } }
      #crm-import-modal .imp-select-all-row { background: #f9fafb; }
      #crm-import-modal .imp-select-all-row td { padding: 6px 10px; font-size: 12px; color: #6b7280; }
      @media (max-width: 600px) {
        #crm-import-modal .imp-body { padding: 12px 14px; }
        #crm-import-modal .imp-footer { padding: 10px 14px; }
        #crm-import-modal .imp-header { padding: 14px 14px 10px; }
      }
    `;
    document.head.appendChild(s);
  }

  // ─── Renderizar modal ─────────────────────────────────────────────────────
  function renderModal() {
    const cfg = TABELAS[_state.tabela];
    const overlay = document.createElement('div');
    overlay.id = 'crm-import-overlay';
    overlay.innerHTML = `
      <div id="crm-import-modal" role="dialog" aria-modal="true" aria-label="Importar ${cfg.label}">
        <div class="imp-header">
          <h2>📥 Importar ${cfg.label}</h2>
          <button class="imp-close" id="imp-close-btn" title="Fechar">×</button>
        </div>
        <div class="imp-body" id="imp-body">
          ${renderStep1()}
        </div>
        <div class="imp-footer" id="imp-footer">
          <button class="imp-btn imp-btn-secondary" id="imp-modelo-btn">⬇ Baixar modelo .xlsx</button>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="imp-btn imp-btn-secondary" id="imp-cancel-btn">Cancelar</button>
            <button class="imp-btn imp-btn-primary" id="imp-preview-btn" disabled>Analisar planilha</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    bindStep1Events();
  }

  function renderStep1() {
    return `
      <p style="margin:0 0 14px;color:#6b7280">
        Selecione um arquivo <strong>.xlsx</strong>, <strong>.xls</strong> ou <strong>.csv</strong> para importar.
        A planilha deve ter os cabeçalhos na primeira linha. Baixe o modelo para garantir o formato correto.
      </p>
      <div class="imp-drop-zone" id="imp-drop-zone">
        <div class="imp-drop-icon">📂</div>
        <strong>Arraste o arquivo aqui</strong>
        <p>ou clique para selecionar</p>
        <p style="font-size:12px">Formatos aceitos: .xlsx, .xls, .csv — Máx. 10 MB</p>
      </div>
      <input type="file" class="imp-file-input" id="imp-file-input" accept=".xlsx,.xls,.csv">
      <div id="imp-file-name" style="margin-top:10px;font-size:13px;color:#6b7280"></div>
    `;
  }

  function bindStep1Events() {
    const overlay = document.getElementById('crm-import-overlay');
    const dropZone = document.getElementById('imp-drop-zone');
    const fileInput = document.getElementById('imp-file-input');
    const previewBtn = document.getElementById('imp-preview-btn');
    const cancelBtn = document.getElementById('imp-cancel-btn');
    const closeBtn = document.getElementById('imp-close-btn');
    const modeloBtn = document.getElementById('imp-modelo-btn');

    // Fechar
    closeBtn.addEventListener('click', close);
    cancelBtn.addEventListener('click', close);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', escHandler);

    // Modelo
    modeloBtn.addEventListener('click', function() { downloadModelo(_state.tabela); });

    // Drag & drop
    dropZone.addEventListener('click', function() { fileInput.click(); });
    dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('drag-over'); });
    dropZone.addEventListener('drop', function(e) {
      e.preventDefault(); dropZone.classList.remove('drag-over');
      const f = e.dataTransfer.files[0];
      if (f) setFile(f);
    });
    fileInput.addEventListener('change', function() {
      if (fileInput.files[0]) setFile(fileInput.files[0]);
    });

    // Preview
    previewBtn.addEventListener('click', doPreview);
  }

  function setFile(file) {
    _state.file = file;
    const nameEl = document.getElementById('imp-file-name');
    if (nameEl) nameEl.textContent = '📄 ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
    const previewBtn = document.getElementById('imp-preview-btn');
    if (previewBtn) previewBtn.disabled = false;
  }

  // ─── Passo 2: Prévia ──────────────────────────────────────────────────────
  async function doPreview() {
    if (!_state.file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', _state.file);
      fd.append('preview', '1');
      const res = await fetch(TABELAS[_state.tabela].endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-CRM-Token': getCookie() },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao analisar planilha');
      _state.previewRows = data.rows || [];
      _state.selectedIndexes = new Set(
        _state.previewRows.map((r, i) => r.status !== 'error' ? i : -1).filter(i => i >= 0)
      );
      renderPreview();
    } catch (e) {
      showError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function renderPreview() {
    const rows = _state.previewRows;
    const cfg = TABELAS[_state.tabela];
    const counts = { ok: 0, warning: 0, duplicate: 0, error: 0 };
    rows.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });

    const body = document.getElementById('imp-body');
    const footer = document.getElementById('imp-footer');

    body.innerHTML = `
      <div class="imp-summary">
        <span class="imp-badge" style="background:#f0fdf4;color:#16a34a">${counts.ok} OK</span>
        ${counts.warning ? `<span class="imp-badge" style="background:#fffbeb;color:#d97706">${counts.warning} Aviso</span>` : ''}
        ${counts.duplicate ? `<span class="imp-badge" style="background:#f5f3ff;color:#7c3aed">${counts.duplicate} Duplicata</span>` : ''}
        ${counts.error ? `<span class="imp-badge" style="background:#fef2f2;color:#dc2626">${counts.error} Erro</span>` : ''}
        <span class="imp-badge" style="background:#f3f4f6;color:#374151">${rows.length} total</span>
      </div>
      <p style="margin:0 0 10px;font-size:12px;color:#6b7280">
        Linhas com erro não podem ser importadas. Desmarque duplicatas ou avisos se não quiser importá-los.
      </p>
      <div class="imp-table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:36px"><input type="checkbox" id="imp-select-all" title="Selecionar todos válidos"></th>
              <th>Linha</th>
              <th>Status</th>
              ${cfg.colunas.map(c => `<th>${c}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => renderRow(r, i, cfg)).join('')}
          </tbody>
        </table>
      </div>
    `;

    footer.innerHTML = `
      <div style="font-size:13px;color:#6b7280">
        <span id="imp-sel-count">${_state.selectedIndexes.size}</span> de ${rows.length} linhas selecionadas
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="imp-btn imp-btn-secondary" id="imp-back-btn">← Voltar</button>
        <button class="imp-btn imp-btn-success" id="imp-confirm-btn" ${_state.selectedIndexes.size === 0 ? 'disabled' : ''}>
          ✓ Importar ${_state.selectedIndexes.size} registro(s)
        </button>
      </div>
    `;

    // Bind events
    document.getElementById('imp-select-all').checked = _state.selectedIndexes.size === rows.filter(r => r.status !== 'error').length;
    document.getElementById('imp-select-all').addEventListener('change', function() {
      if (this.checked) {
        rows.forEach((r, i) => { if (r.status !== 'error') _state.selectedIndexes.add(i); });
      } else {
        _state.selectedIndexes.clear();
      }
      updateSelectionUI();
    });

    rows.forEach((r, i) => {
      const cb = document.getElementById('imp-cb-' + i);
      if (cb) {
        cb.addEventListener('change', function() {
          if (this.checked) _state.selectedIndexes.add(i);
          else _state.selectedIndexes.delete(i);
          updateSelectionUI();
        });
      }
    });

    document.getElementById('imp-back-btn').addEventListener('click', function() {
      document.getElementById('imp-body').innerHTML = renderStep1();
      document.getElementById('imp-footer').innerHTML = `
        <button class="imp-btn imp-btn-secondary" id="imp-modelo-btn">⬇ Baixar modelo .xlsx</button>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="imp-btn imp-btn-secondary" id="imp-cancel-btn">Cancelar</button>
          <button class="imp-btn imp-btn-primary" id="imp-preview-btn" disabled>Analisar planilha</button>
        </div>
      `;
      bindStep1Events();
      if (_state.file) {
        setFile(_state.file);
      }
    });

    document.getElementById('imp-confirm-btn').addEventListener('click', doConfirm);
    document.getElementById('imp-close-btn').addEventListener('click', close);
  }

  function renderRow(r, i, cfg) {
    const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.ok;
    const isError = r.status === 'error';
    const checked = _state.selectedIndexes.has(i);
    const allData = Object.assign({}, r.data, r.resolved);
    return `
      <tr style="background:${sc.bg}">
        <td style="text-align:center">
          <input type="checkbox" id="imp-cb-${i}" ${checked ? 'checked' : ''} ${isError ? 'disabled' : ''}>
        </td>
        <td style="color:#9ca3af;font-size:12px">${r.row}</td>
        <td>
          <span style="color:${sc.cor};font-weight:700;font-size:13px" title="${r.messages.join(' | ')}">${sc.icone} ${sc.label}</span>
          ${r.messages.length ? `<div class="imp-row-messages">${r.messages.map(m => `<span>• ${m}</span>`).join('')}</div>` : ''}
        </td>
        ${cfg.colunas.map(c => {
          const v = allData[c] ?? allData[c.replace('cliente', 'cliente_nome')] ?? allData[c.replace('evento', 'evento_nome')] ?? '';
          const isVal = c === 'valor' || c === 'valor_pago';
          return `<td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${String(v).replace(/"/g,'&quot;')}">${isVal ? fmtVal(v) : fmt(v)}</td>`;
        }).join('')}
      </tr>
    `;
  }

  function updateSelectionUI() {
    const count = _state.selectedIndexes.size;
    const selCount = document.getElementById('imp-sel-count');
    if (selCount) selCount.textContent = count;
    const confirmBtn = document.getElementById('imp-confirm-btn');
    if (confirmBtn) {
      confirmBtn.disabled = count === 0;
      confirmBtn.textContent = `✓ Importar ${count} registro(s)`;
    }
    const allCb = document.getElementById('imp-select-all');
    if (allCb) {
      const validCount = _state.previewRows.filter(r => r.status !== 'error').length;
      allCb.checked = count === validCount && validCount > 0;
      allCb.indeterminate = count > 0 && count < validCount;
    }
  }

  // ─── Passo 3: Confirmar ───────────────────────────────────────────────────
  async function doConfirm() {
    if (_state.selectedIndexes.size === 0) return;
    const confirmBtn = document.getElementById('imp-confirm-btn');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="imp-spinner"></span>Importando...';
    }
    try {
      const fd = new FormData();
      fd.append('file', _state.file);
      fd.append('selected', JSON.stringify(Array.from(_state.selectedIndexes)));
      const res = await fetch(TABELAS[_state.tabela].endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-CRM-Token': getCookie() },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao importar');
      renderSuccess(data);
    } catch (e) {
      showError(e.message);
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = `✓ Importar ${_state.selectedIndexes.size} registro(s)`;
      }
    }
  }

  function renderSuccess(data) {
    const body = document.getElementById('imp-body');
    const footer = document.getElementById('imp-footer');
    body.innerHTML = `
      <div style="text-align:center;padding:30px 10px">
        <div style="font-size:52px;margin-bottom:12px">✅</div>
        <h3 style="margin:0 0 8px;font-size:20px;color:#16a34a">${data.imported} registro(s) importado(s) com sucesso!</h3>
        ${data.errors && data.errors.length ? `
          <div style="margin-top:14px;text-align:left;background:#fef2f2;border-radius:8px;padding:12px">
            <strong style="color:#dc2626">${data.errors.length} erro(s) durante a gravação:</strong>
            <ul style="margin:6px 0 0;padding-left:18px;font-size:12px;color:#dc2626">
              ${data.errors.map(e => `<li>${e}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
    footer.innerHTML = `
      <div></div>
      <button class="imp-btn imp-btn-primary" id="imp-done-btn">Fechar e atualizar</button>
    `;
    document.getElementById('imp-done-btn').addEventListener('click', function() {
      close();
      if (typeof _state.onSuccess === 'function') _state.onSuccess(data.imported);
    });
  }

  // ─── Utilitários ─────────────────────────────────────────────────────────
  function showError(msg) {
    const body = document.getElementById('imp-body');
    if (body) {
      const err = document.createElement('div');
      err.style.cssText = 'background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;margin-top:12px;color:#dc2626;font-size:13px';
      err.textContent = '⚠ ' + msg;
      body.appendChild(err);
      setTimeout(() => err.remove(), 6000);
    }
  }

  function setLoading(on) {
    _state.loading = on;
    const previewBtn = document.getElementById('imp-preview-btn');
    if (previewBtn) {
      previewBtn.disabled = on;
      previewBtn.innerHTML = on ? '<span class="imp-spinner"></span>Analisando...' : 'Analisar planilha';
    }
  }

  function escHandler(e) {
    if (e.key === 'Escape') close();
  }

  function close() {
    document.removeEventListener('keydown', escHandler);
    const overlay = document.getElementById('crm-import-overlay');
    if (overlay) overlay.remove();
    _state = { tabela: null, onSuccess: null, previewRows: [], selectedIndexes: new Set(), loading: false };
  }

  // ─── API pública ──────────────────────────────────────────────────────────
  window.CrmImport = {
    open: function (tabela, onSuccess) {
      if (!TABELAS[tabela]) { console.error('CrmImport: tabela inválida:', tabela); return; }
      // Fechar modal anterior se existir
      const existing = document.getElementById('crm-import-overlay');
      if (existing) existing.remove();
      _state = { tabela, onSuccess: onSuccess || null, previewRows: [], selectedIndexes: new Set(), loading: false, file: null };
      injectCSS();
      renderModal();
    },
    downloadModelo: function (tabela) {
      downloadModelo(tabela);
    },
  };

  function downloadModelo(tabela) {
    const a = document.createElement('a');
    a.href = '/api/crm/importar/modelo/' + tabela;
    a.download = 'modelo_' + tabela + '.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

})();
