// SAMS Locações CRM — Módulo Acervo Documental
// Gestão de documentos históricos por Feira/Evento e Cliente
// v1.0.0

const AcervoModule = {
  // Estado
  docs: [],
  total: 0,
  page: 0,
  limit: 20,
  filtros: { busca: '', tipo_doc: '', evento_id: '', cliente_id: '', ano: '' },
  eventos: [],
  clientes: [],
  anos: [],
  uploading: false,

  // ─── Inicialização ──────────────────────────────────────────────────────────────────────
  async init() {
    // 1. Aguardar o container estar no DOM (MutationObserver, máx 5s)
    const container = await new Promise(resolve => {
      const el = document.getElementById('acervo-container');
      if (el) return resolve(el);
      const obs = new MutationObserver(() => {
        const found = document.getElementById('acervo-container');
        if (found) { obs.disconnect(); resolve(found); }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { obs.disconnect(); resolve(null); }, 5000);
    });
    if (!container) {
      console.error('[AcervoModule] #acervo-container não encontrado no DOM após 5s');
      return;
    }
    // 2. Renderizar interface vazia imediatamente (mostra skeleton)
    this.renderInterface();
    // 3. Carregar metadados e documentos com tratamento de erro
    try {
      await Promise.all([
        this.loadEventos(),
        this.loadClientes(),
        this.loadAnos(),
      ]);
    } catch (e) {
      console.warn('[AcervoModule] Erro ao carregar metadados:', e.message);
    }
    try {
      await this.loadDocs();
    } catch (e) {
      console.warn('[AcervoModule] Erro ao carregar documentos:', e.message);
    }
    // 4. Re-renderizar com dados carregados
    this.renderInterface();
  },

  // ─── Chamadas à API ──────────────────────────────────────────────────────────────────────
  async api(method, path, body, isFormData = false) {
    const opts = { method, credentials: 'include' };
    if (body) {
      if (isFormData) {
        opts.body = body;
      } else {
        opts.headers = { 'Content-Type': 'application/json' };
        opts.body = JSON.stringify(body);
      }
    }
    const res = await fetch('/api/crm/acervo' + path, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Erro na requisição');
    }
    return res.json();
  },

  async loadDocs() {
    const params = new URLSearchParams({
      limit: this.limit,
      offset: this.page * this.limit,
    });
    if (this.filtros.busca) params.set('busca', this.filtros.busca);
    if (this.filtros.tipo_doc) params.set('tipo_doc', this.filtros.tipo_doc);
    if (this.filtros.evento_id) params.set('evento_id', this.filtros.evento_id);
    if (this.filtros.cliente_id) params.set('cliente_id', this.filtros.cliente_id);
    if (this.filtros.ano) params.set('ano', this.filtros.ano);
    const data = await this.api('GET', `?${params}`);
    this.docs = data.docs || [];
    this.total = data.total || 0;
  },

  async loadEventos() {
    try {
      this.eventos = await this.api('GET', '/meta/eventos');
    } catch { this.eventos = []; }
  },

  async loadClientes() {
    try {
      this.clientes = await this.api('GET', '/meta/clientes');
    } catch { this.clientes = []; }
  },

  async loadAnos() {
    try {
      this.anos = await this.api('GET', '/meta/anos');
    } catch { this.anos = []; }
  },

  // ─── Renderização ──────────────────────────────────────────────────────────
  renderInterface() {
    const container = document.getElementById('acervo-container');
    if (!container) return;
    container.innerHTML = this.renderHTML();
    this.renderDocList();
    this.bindEvents();
  },

  renderHTML() {
    const eventosOpts = this.eventos.map(e => `<option value="${e.id}">${e.nome}</option>`).join('');
    const clientesOpts = this.clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
    const anosOpts = this.anos.map(a => `<option value="${a}">${a}</option>`).join('');
    const tiposOpts = [
      ['contrato','📄 Contrato'],['briefing','📋 Briefing'],['projeto','📐 Projeto'],
      ['foto','🖼️ Foto'],['video','🎬 Vídeo'],['planilha','📊 Planilha'],
      ['apresentacao','📊 Apresentação'],['logotipo','🎨 Logotipo'],
      ['nota_fiscal','🧾 Nota Fiscal'],['outro','📁 Outro'],
    ].map(([v,l]) => `<option value="${v}">${l}</option>`).join('');

    return `
      <!-- Botão principal de ação - sempre visível no topo -->
      <div class="mb-4">
        <button id="acervo-btn-novo" class="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition shadow-md">
          <i class="fas fa-plus-circle text-lg"></i> + Novo Documento
        </button>
      </div>

      <!-- Filtros -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div class="lg:col-span-2">
            <input id="acervo-busca" type="text" placeholder="🔍 Buscar por nome, cliente, evento..." 
                   value="${this.filtros.busca}"
                   class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent">
          </div>
          <select id="acervo-filtro-tipo" class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400">
            <option value="">Todos os tipos</option>
            ${tiposOpts}
          </select>
          <select id="acervo-filtro-evento" class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400">
            <option value="">Todos os eventos</option>
            ${eventosOpts}
          </select>
          <select id="acervo-filtro-ano" class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400">
            <option value="">Todos os anos</option>
            ${anosOpts}
          </select>
        </div>
        <div class="flex items-center justify-between mt-3">
          <span id="acervo-total-label" class="text-sm text-gray-500">Carregando...</span>
          <button id="acervo-btn-limpar" class="text-sm text-amber-600 hover:text-amber-800 flex items-center gap-1">
            <i class="fas fa-times-circle"></i> Limpar filtros
          </button>
        </div>
      </div>

      <!-- Lista de documentos -->
      <div id="acervo-lista" class="space-y-3 mb-6">
        <div class="text-center py-12 text-gray-400">
          <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
          <p>Carregando documentos...</p>
        </div>
      </div>

      <!-- Paginação -->
      <div id="acervo-paginacao" class="flex items-center justify-center gap-2"></div>

      <!-- Modal Novo/Editar Documento -->
      <div id="acervo-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-screen overflow-y-auto">
          <div class="flex items-center justify-between p-6 border-b">
            <h3 id="acervo-modal-titulo" class="text-xl font-bold text-gray-800">Novo Documento</h3>
            <button id="acervo-modal-fechar" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>
          <form id="acervo-form" class="p-6 space-y-4">
            <input type="hidden" id="acervo-form-id">
            
            <!-- Nome -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nome do documento *</label>
              <input id="acervo-form-nome" type="text" required placeholder="Ex: Contrato Neugebauer ExpoApras 2026"
                     class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-400">
            </div>

            <!-- Tipo e Ano -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de documento</label>
                <select id="acervo-form-tipo" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-400">
                  ${tiposOpts}
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Ano</label>
                <input id="acervo-form-ano" type="number" placeholder="${new Date().getFullYear()}" 
                       min="2000" max="2099" value="${new Date().getFullYear()}"
                       class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-400">
              </div>
            </div>

            <!-- Evento e Cliente -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Feira / Evento</label>
                <select id="acervo-form-evento" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-400">
                  <option value="">Selecionar evento...</option>
                  ${eventosOpts}
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <select id="acervo-form-cliente" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-400">
                  <option value="">Selecionar cliente...</option>
                  ${clientesOpts}
                </select>
              </div>
            </div>

            <!-- Link Google Drive -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                <i class="fab fa-google-drive text-green-600 mr-1"></i> Link do Google Drive
              </label>
              <input id="acervo-form-drive" type="url" placeholder="https://drive.google.com/..."
                     class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-400">
              <p class="text-xs text-gray-500 mt-1">Cole o link de compartilhamento da pasta ou arquivo no Google Drive</p>
            </div>

            <!-- Upload de arquivo -->
            <div id="acervo-upload-area">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                <i class="fas fa-upload text-blue-600 mr-1"></i> Upload de arquivo (máx. 50 MB)
              </label>
              <div id="acervo-dropzone" class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition">
                <i class="fas fa-cloud-upload-alt text-gray-400 text-3xl mb-2"></i>
                <p class="text-gray-600 text-sm">Arraste um arquivo ou clique para selecionar</p>
                <p class="text-gray-400 text-xs mt-1">PDF, imagens, ZIP, DWG, Word, Excel, PowerPoint</p>
                <input id="acervo-form-arquivo" type="file" class="hidden"
                       accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.dwg,.dxf,.mp4">
              </div>
              <div id="acervo-arquivo-preview" class="hidden mt-2 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <i class="fas fa-file text-blue-600"></i>
                <span id="acervo-arquivo-nome" class="text-sm text-blue-800 flex-1 truncate"></span>
                <button type="button" id="acervo-arquivo-remover" class="text-red-500 hover:text-red-700">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>

            <!-- Descrição e Tags -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea id="acervo-form-descricao" rows="2" placeholder="Descrição opcional do documento..."
                        class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-400"></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tags (separadas por vírgula)</label>
              <input id="acervo-form-tags" type="text" placeholder="Ex: contrato, 2026, aprovado"
                     class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-400">
            </div>

            <!-- Botões -->
            <div class="flex gap-3 pt-2">
              <button type="submit" id="acervo-form-submit"
                      class="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2">
                <i class="fas fa-save"></i> Salvar Documento
              </button>
              <button type="button" id="acervo-form-cancelar"
                      class="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold transition">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Visualização -->
      <div id="acervo-viewer" class="fixed inset-0 bg-black bg-opacity-80 z-50 hidden flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-screen overflow-hidden flex flex-col">
          <div class="flex items-center justify-between p-4 border-b">
            <h3 id="acervo-viewer-titulo" class="text-lg font-bold text-gray-800 truncate"></h3>
            <button id="acervo-viewer-fechar" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>
          <div id="acervo-viewer-content" class="flex-1 overflow-auto p-4"></div>
        </div>
      </div>
    `;
  },

  renderDocList() {
    const lista = document.getElementById('acervo-lista');
    const totalLabel = document.getElementById('acervo-total-label');
    if (!lista) return;

    if (totalLabel) {
      totalLabel.textContent = `${this.total} documento${this.total !== 1 ? 's' : ''} encontrado${this.total !== 1 ? 's' : ''}`;
    }

    if (!this.docs.length) {
      lista.innerHTML = `
        <div class="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
          <i class="fas fa-archive text-gray-300 text-5xl mb-4"></i>
          <h3 class="text-lg font-semibold text-gray-500 mb-2">Nenhum documento encontrado</h3>
          <p class="text-gray-400 text-sm">Adicione documentos clicando em "Novo Documento" ou ajuste os filtros.</p>
        </div>
      `;
      this.renderPaginacao();
      return;
    }

    lista.innerHTML = this.docs.map(doc => this.renderDocCard(doc)).join('');
    this.renderPaginacao();
  },

  renderDocCard(doc) {
    const icone = this.getTipoIcone(doc.tipo_doc);
    const cor = this.getTipoCor(doc.tipo_doc);
    const tamanho = doc.tamanho_bytes ? this.formatBytes(doc.tamanho_bytes) : '';
    const data = new Date(doc.created_at).toLocaleDateString('pt-BR');
    const temArquivo = !!doc.url_arquivo;
    const temDrive = !!doc.url_drive;
    const isImagem = doc.mime_type && doc.mime_type.startsWith('image/');
    const isPdf = doc.mime_type === 'application/pdf';

    return `
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition group" data-doc-id="${doc.id}">
        <div class="flex items-start gap-4">
          <!-- Ícone tipo -->
          <div class="w-12 h-12 ${cor} rounded-xl flex items-center justify-center flex-shrink-0 text-xl">
            ${icone}
          </div>
          
          <!-- Info principal -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <h4 class="font-semibold text-gray-800 truncate">${doc.nome}</h4>
                <div class="flex flex-wrap gap-2 mt-1">
                  ${doc.evento_nome ? `<span class="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"><i class="fas fa-calendar-alt"></i> ${doc.evento_nome}</span>` : ''}
                  ${doc.cliente_nome ? `<span class="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full"><i class="fas fa-building"></i> ${doc.cliente_nome}</span>` : ''}
                  ${doc.ano ? `<span class="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"><i class="fas fa-calendar"></i> ${doc.ano}</span>` : ''}
                  <span class="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">${this.getTipoLabel(doc.tipo_doc)}</span>
                </div>
                ${doc.descricao ? `<p class="text-sm text-gray-500 mt-1 line-clamp-2">${doc.descricao}</p>` : ''}
                ${doc.tags ? `<p class="text-xs text-gray-400 mt-1"><i class="fas fa-tags mr-1"></i>${doc.tags}</p>` : ''}
              </div>
              
              <!-- Ações -->
              <div class="flex items-center gap-1 flex-shrink-0">
                ${temArquivo && (isImagem || isPdf) ? `
                  <button class="acervo-btn-ver text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition" 
                          data-id="${doc.id}" title="Visualizar">
                    <i class="fas fa-eye"></i>
                  </button>
                ` : ''}
                ${temArquivo ? `
                  <a href="${doc.url_arquivo}" target="_blank" 
                     class="text-green-600 hover:text-green-800 p-2 rounded-lg hover:bg-green-50 transition" title="Baixar arquivo">
                    <i class="fas fa-download"></i>
                  </a>
                ` : ''}
                ${temDrive ? `
                  <a href="${doc.url_drive}" target="_blank" 
                     class="text-green-600 hover:text-green-800 p-2 rounded-lg hover:bg-green-50 transition" title="Abrir no Google Drive">
                    <i class="fab fa-google-drive"></i>
                  </a>
                ` : ''}
                <button class="acervo-btn-editar text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition"
                        data-id="${doc.id}" title="Editar">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="acervo-btn-excluir text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition"
                        data-id="${doc.id}" title="Excluir">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
            
            <!-- Metadados rodapé -->
            <div class="flex items-center gap-3 mt-2 text-xs text-gray-400">
              ${doc.nome_arquivo_original ? `<span><i class="fas fa-file mr-1"></i>${doc.nome_arquivo_original}</span>` : ''}
              ${tamanho ? `<span>${tamanho}</span>` : ''}
              <span><i class="fas fa-clock mr-1"></i>${data}</span>
              ${doc.criado_por_nome ? `<span><i class="fas fa-user mr-1"></i>${doc.criado_por_nome}</span>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderPaginacao() {
    const pag = document.getElementById('acervo-paginacao');
    if (!pag) return;
    const totalPages = Math.ceil(this.total / this.limit);
    if (totalPages <= 1) { pag.innerHTML = ''; return; }

    let html = '';
    if (this.page > 0) {
      html += `<button class="acervo-pag-btn px-3 py-1 rounded border text-sm hover:bg-gray-100" data-page="${this.page - 1}">
        <i class="fas fa-chevron-left"></i>
      </button>`;
    }
    for (let i = Math.max(0, this.page - 2); i <= Math.min(totalPages - 1, this.page + 2); i++) {
      const active = i === this.page ? 'bg-amber-600 text-white border-amber-600' : 'hover:bg-gray-100';
      html += `<button class="acervo-pag-btn px-3 py-1 rounded border text-sm ${active}" data-page="${i}">${i + 1}</button>`;
    }
    if (this.page < totalPages - 1) {
      html += `<button class="acervo-pag-btn px-3 py-1 rounded border text-sm hover:bg-gray-100" data-page="${this.page + 1}">
        <i class="fas fa-chevron-right"></i>
      </button>`;
    }
    pag.innerHTML = html;
  },

  // ─── Eventos ───────────────────────────────────────────────────────────────
  bindEvents() {
    // Busca com debounce
    const buscaInput = document.getElementById('acervo-busca');
    if (buscaInput) {
      let timer;
      buscaInput.addEventListener('input', (e) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          this.filtros.busca = e.target.value;
          this.page = 0;
          this.reloadDocs();
        }, 400);
      });
    }

    // Filtros
    ['acervo-filtro-tipo', 'acervo-filtro-evento', 'acervo-filtro-ano'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', (e) => {
        const key = id.replace('acervo-filtro-', '');
        this.filtros[key === 'tipo' ? 'tipo_doc' : key === 'evento' ? 'evento_id' : 'ano'] = e.target.value;
        this.page = 0;
        this.reloadDocs();
      });
    });

    // Limpar filtros
    document.getElementById('acervo-btn-limpar')?.addEventListener('click', () => {
      this.filtros = { busca: '', tipo_doc: '', evento_id: '', cliente_id: '', ano: '' };
      this.page = 0;
      document.getElementById('acervo-busca').value = '';
      document.getElementById('acervo-filtro-tipo').value = '';
      document.getElementById('acervo-filtro-evento').value = '';
      document.getElementById('acervo-filtro-ano').value = '';
      this.reloadDocs();
    });

    // Botão novo
    document.getElementById('acervo-btn-novo')?.addEventListener('click', () => this.abrirModal());

    // Modal fechar
    document.getElementById('acervo-modal-fechar')?.addEventListener('click', () => this.fecharModal());
    document.getElementById('acervo-form-cancelar')?.addEventListener('click', () => this.fecharModal());
    document.getElementById('acervo-modal')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('acervo-modal')) this.fecharModal();
    });

    // Viewer fechar
    document.getElementById('acervo-viewer-fechar')?.addEventListener('click', () => this.fecharViewer());
    document.getElementById('acervo-viewer')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('acervo-viewer')) this.fecharViewer();
    });

    // Dropzone
    const dropzone = document.getElementById('acervo-dropzone');
    const fileInput = document.getElementById('acervo-form-arquivo');
    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('border-amber-400', 'bg-amber-50'); });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('border-amber-400', 'bg-amber-50'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-amber-400', 'bg-amber-50');
        if (e.dataTransfer.files.length) this.previewArquivo(e.dataTransfer.files[0]);
      });
      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) this.previewArquivo(e.target.files[0]);
      });
    }
    document.getElementById('acervo-arquivo-remover')?.addEventListener('click', () => this.removerArquivo());

    // Form submit
    document.getElementById('acervo-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.salvarDocumento();
    });

    // Evento selecionado → preencher nome
    document.getElementById('acervo-form-evento')?.addEventListener('change', (e) => {
      const eventoId = e.target.value;
      const evento = this.eventos.find(ev => String(ev.id) === String(eventoId));
      if (evento) {
        const nomeInput = document.getElementById('acervo-form-nome');
        if (nomeInput && !nomeInput.value) {
          nomeInput.value = evento.nome + ' — ';
          nomeInput.focus();
        }
      }
    });

    // Paginação (delegação)
    document.getElementById('acervo-paginacao')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.acervo-pag-btn');
      if (btn) {
        this.page = parseInt(btn.dataset.page);
        this.reloadDocs();
      }
    });

    // Ações nos cards (delegação)
    document.getElementById('acervo-lista')?.addEventListener('click', (e) => {
      const btnVer = e.target.closest('.acervo-btn-ver');
      const btnEditar = e.target.closest('.acervo-btn-editar');
      const btnExcluir = e.target.closest('.acervo-btn-excluir');
      if (btnVer) this.visualizarDoc(parseInt(btnVer.dataset.id));
      if (btnEditar) this.editarDoc(parseInt(btnEditar.dataset.id));
      if (btnExcluir) this.excluirDoc(parseInt(btnExcluir.dataset.id));
    });
  },

  // ─── Ações ─────────────────────────────────────────────────────────────────
  async reloadDocs() {
    const lista = document.getElementById('acervo-lista');
    if (lista) lista.innerHTML = '<div class="text-center py-8 text-gray-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>';
    await this.loadDocs();
    this.renderDocList();
  },

  abrirModal(doc = null) {
    const modal = document.getElementById('acervo-modal');
    const titulo = document.getElementById('acervo-modal-titulo');
    if (!modal) return;

    // Resetar form
    document.getElementById('acervo-form').reset();
    document.getElementById('acervo-form-id').value = '';
    this.removerArquivo();

    if (doc) {
      titulo.textContent = 'Editar Documento';
      document.getElementById('acervo-form-id').value = doc.id;
      document.getElementById('acervo-form-nome').value = doc.nome || '';
      document.getElementById('acervo-form-tipo').value = doc.tipo_doc || 'outro';
      document.getElementById('acervo-form-ano').value = doc.ano || new Date().getFullYear();
      document.getElementById('acervo-form-evento').value = doc.evento_id || '';
      document.getElementById('acervo-form-cliente').value = doc.cliente_id || '';
      document.getElementById('acervo-form-drive').value = doc.url_drive || '';
      document.getElementById('acervo-form-descricao').value = doc.descricao || '';
      document.getElementById('acervo-form-tags').value = doc.tags || '';
      // Esconder upload se já tem arquivo
      if (doc.url_arquivo) {
        document.getElementById('acervo-upload-area').innerHTML = `
          <div class="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <i class="fas fa-check-circle text-green-600"></i>
            <span class="text-sm text-green-800 flex-1">Arquivo já enviado: ${doc.nome_arquivo_original || 'arquivo'}</span>
            <a href="${doc.url_arquivo}" target="_blank" class="text-blue-600 text-sm hover:underline">Ver</a>
          </div>
        `;
      }
    } else {
      titulo.textContent = 'Novo Documento';
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('acervo-form-nome').focus();
  },

  fecharModal() {
    const modal = document.getElementById('acervo-modal');
    modal?.classList.add('hidden');
    modal?.classList.remove('flex');
  },

  previewArquivo(file) {
    const dropzone = document.getElementById('acervo-dropzone');
    const preview = document.getElementById('acervo-arquivo-preview');
    const nome = document.getElementById('acervo-arquivo-nome');
    const fileInput = document.getElementById('acervo-form-arquivo');

    // Transferir arquivo para o input se veio do drag
    if (file && fileInput) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
    }

    if (nome) nome.textContent = `${file.name} (${this.formatBytes(file.size)})`;
    dropzone?.classList.add('hidden');
    preview?.classList.remove('hidden');
  },

  removerArquivo() {
    const fileInput = document.getElementById('acervo-form-arquivo');
    const dropzone = document.getElementById('acervo-dropzone');
    const preview = document.getElementById('acervo-arquivo-preview');
    if (fileInput) fileInput.value = '';
    dropzone?.classList.remove('hidden');
    preview?.classList.add('hidden');
  },

  async salvarDocumento() {
    const id = document.getElementById('acervo-form-id').value;
    const nome = document.getElementById('acervo-form-nome').value.trim();
    if (!nome) { alert('Nome é obrigatório'); return; }

    const eventoId = document.getElementById('acervo-form-evento').value;
    const clienteId = document.getElementById('acervo-form-cliente').value;
    const eventoNome = eventoId ? this.eventos.find(e => String(e.id) === String(eventoId))?.nome || '' : '';
    const clienteNome = clienteId ? this.clientes.find(c => String(c.id) === String(clienteId))?.nome || '' : '';

    const submitBtn = document.getElementById('acervo-form-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Salvando...';

    try {
      if (id) {
        // Editar (sem arquivo)
        await this.api('PUT', `/${id}`, {
          nome,
          tipo_doc: document.getElementById('acervo-form-tipo').value,
          ano: document.getElementById('acervo-form-ano').value,
          evento_id: eventoId || null,
          evento_nome: eventoNome,
          cliente_id: clienteId || null,
          cliente_nome: clienteNome,
          url_drive: document.getElementById('acervo-form-drive').value.trim() || null,
          descricao: document.getElementById('acervo-form-descricao').value.trim() || null,
          tags: document.getElementById('acervo-form-tags').value.trim() || null,
        });
      } else {
        // Criar (com possível arquivo)
        const fileInput = document.getElementById('acervo-form-arquivo');
        const formData = new FormData();
        formData.append('nome', nome);
        formData.append('tipo_doc', document.getElementById('acervo-form-tipo').value);
        formData.append('ano', document.getElementById('acervo-form-ano').value);
        if (eventoId) { formData.append('evento_id', eventoId); formData.append('evento_nome', eventoNome); }
        if (clienteId) { formData.append('cliente_id', clienteId); formData.append('cliente_nome', clienteNome); }
        const drive = document.getElementById('acervo-form-drive').value.trim();
        if (drive) formData.append('url_drive', drive);
        const descricao = document.getElementById('acervo-form-descricao').value.trim();
        if (descricao) formData.append('descricao', descricao);
        const tags = document.getElementById('acervo-form-tags').value.trim();
        if (tags) formData.append('tags', tags);
        if (fileInput?.files?.length) formData.append('arquivo', fileInput.files[0]);
        await this.api('POST', '/', formData, true);
      }

      this.fecharModal();
      this.page = 0;
      await this.loadAnos(); // atualizar anos disponíveis
      await this.reloadDocs();
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Salvar Documento';
    }
  },

  async editarDoc(id) {
    const doc = this.docs.find(d => d.id === id);
    if (doc) this.abrirModal(doc);
  },

  async excluirDoc(id) {
    const doc = this.docs.find(d => d.id === id);
    if (!doc) return;
    if (!confirm(`Excluir "${doc.nome}"?\n\nEsta ação não pode ser desfeita.`)) return;
    try {
      await this.api('DELETE', `/${id}`);
      await this.reloadDocs();
    } catch (e) {
      alert('Erro ao excluir: ' + e.message);
    }
  },

  visualizarDoc(id) {
    const doc = this.docs.find(d => d.id === id);
    if (!doc || !doc.url_arquivo) return;

    const viewer = document.getElementById('acervo-viewer');
    const titulo = document.getElementById('acervo-viewer-titulo');
    const content = document.getElementById('acervo-viewer-content');
    if (!viewer) return;

    titulo.textContent = doc.nome;
    const isImagem = doc.mime_type && doc.mime_type.startsWith('image/');
    const isPdf = doc.mime_type === 'application/pdf';

    if (isImagem) {
      content.innerHTML = `<img src="${doc.url_arquivo}" alt="${doc.nome}" class="max-w-full mx-auto rounded-lg shadow">`;
    } else if (isPdf) {
      content.innerHTML = `<iframe src="${doc.url_arquivo}" class="w-full h-full min-h-96" style="height:70vh" frameborder="0"></iframe>`;
    }

    viewer.classList.remove('hidden');
    viewer.classList.add('flex');
  },

  fecharViewer() {
    const viewer = document.getElementById('acervo-viewer');
    viewer?.classList.add('hidden');
    viewer?.classList.remove('flex');
    document.getElementById('acervo-viewer-content').innerHTML = '';
  },

  // ─── Helpers ───────────────────────────────────────────────────────────────
  getTipoIcone(tipo) {
    const map = {
      contrato: '📄', briefing: '📋', projeto: '📐', foto: '🖼️',
      video: '🎬', planilha: '📊', apresentacao: '📊', logotipo: '🎨',
      nota_fiscal: '🧾', outro: '📁',
    };
    return map[tipo] || '📁';
  },

  getTipoCor(tipo) {
    const map = {
      contrato: 'bg-blue-100', briefing: 'bg-purple-100', projeto: 'bg-indigo-100',
      foto: 'bg-pink-100', video: 'bg-red-100', planilha: 'bg-green-100',
      apresentacao: 'bg-orange-100', logotipo: 'bg-yellow-100',
      nota_fiscal: 'bg-teal-100', outro: 'bg-gray-100',
    };
    return map[tipo] || 'bg-gray-100';
  },

  getTipoLabel(tipo) {
    const map = {
      contrato: 'Contrato', briefing: 'Briefing', projeto: 'Projeto',
      foto: 'Foto', video: 'Vídeo', planilha: 'Planilha',
      apresentacao: 'Apresentação', logotipo: 'Logotipo',
      nota_fiscal: 'Nota Fiscal', outro: 'Outro',
    };
    return map[tipo] || tipo;
  },

  formatBytes(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  },
};

// Exportar globalmente
window.AcervoModule = AcervoModule;
