// Exportar funções globalmente para compatibilidade
window.showCreateForm = function(module) {
    console.log('Função global showCreateForm chamada para:', module);
    if (window.ModuleSystem && typeof ModuleSystem.showCreateForm === 'function') {
        ModuleSystem.showCreateForm(module);
    } else {
        console.error('ModuleSystem não disponível');
    }
};

window.showDetails = function(module, id) {
    console.log('Função global showDetails chamada para:', module, id);
    if (window.ModuleSystem && typeof ModuleSystem.showDetails === 'function') {
        ModuleSystem.showDetails(module, id);
    } else {
        console.error('ModuleSystem não disponível');
    }
};

window.showUpdateForm = function(module, id) {
    console.log('Função global showUpdateForm chamada para:', module, id);
    if (window.ModuleSystem && typeof ModuleSystem.showUpdateForm === 'function') {
        ModuleSystem.showUpdateForm(module, id);
    } else {
        console.error('ModuleSystem não disponível');
    }
};

window.confirmDelete = function(module, id) {
    console.log('Função global confirmDelete chamada para:', module, id);
    if (window.ModuleSystem && typeof ModuleSystem.confirmDelete === 'function') {
        ModuleSystem.confirmDelete(module, id);
    } else {
        console.error('ModuleSystem não disponível');
    }
};

// Sistema de Módulos SAMS Locações CRM/ERP
const ModuleSystem = {
    data: {
        leads: [],
        campanhas: [],
        contatos: [],
        clientes: [],
        eventos: [],
        briefings: [],
        projetos: [],
        montagens: [],
        memoriais: [],
        usuarios: [],
        transacoes: [],
        contasReceber: [],
        tarefasAdmin: [],
        demandasJuridicas: [],
        kanban: { boards: [], tasks: [] },
        financeiro: { orcamentos: [] },
        ui: {}
    },

    // Inicialização
    // Flag para controlar inicialização
    initialized: false,

    init() {
        if (this.initialized) {
            console.log('ModuleSystem já foi inicializado - ignorando chamada duplicada');
            return;
        }
        
        console.log('Inicializando ModuleSystem...');
        this.loadInitialData();
        this.bindGlobalEvents();
        this.initialized = true;
        console.log('ModuleSystem inicializado com sucesso');

        // Sincronizar dados do servidor após inicialização (garante mobile/desktop em sincronia)
        setTimeout(() => {
            if (window._crmSessionExpired) return; // sessão expirada, não sincronizar
            this.loadTransacoes().catch(e => console.warn('[ModuleSystem.init] Falha ao sincronizar transações:', e));
            this.syncClientesFromBackend().catch(e => console.warn('[ModuleSystem.init] Falha ao sincronizar clientes:', e));
            this.syncEventosFromBackend().catch(e => console.warn('[ModuleSystem.init] Falha ao sincronizar eventos:', e));
            this.syncContasReceberFromBackend().catch(e => console.warn('[ModuleSystem.init] Falha ao sincronizar contas a receber:', e));
            this.syncLeadsFromBackend().catch(e => console.warn('[ModuleSystem.init] Falha ao sincronizar leads:', e));
        }, 800);
    },

    // Carregar dados iniciais
    loadInitialData() {
        const base = {
            leads: [],
            campanhas: [],
            contatos: [],
            clientes: [],
            eventos: [],
            briefings: [],
            projetos: [],
            montagens: [],
            memoriais: [],
            usuarios: [],
            transacoes: [],
            contasReceber: [],
            tarefasAdmin: [],
            demandasJuridicas: [],
            kanban: { boards: [], tasks: [] },
            financeiro: { orcamentos: [] },
            ui: {}
        };

        // Carregar dados do localStorage se existirem
        const savedData = localStorage.getItem('sams_module_data');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                // Merge base com dados salvos
                this.data = { ...base, ...parsed };

                // Deduplicação de transações por id (último vence)
                if (Array.isArray(this.data.transacoes)) {
                    const byId = new Map();
                    const withoutId = [];
                    for (const item of this.data.transacoes) {
                        if (item && item.id != null) {
                            byId.set(String(item.id), item);
                        } else {
                            withoutId.push(item);
                        }
                    }
                    this.data.transacoes = [...withoutId, ...byId.values()];
                }

                if (Array.isArray(this.data.contasReceber)) {
                    const byId = new Map();
                    const withoutId = [];
                    for (const item of this.data.contasReceber) {
                        if (item && item.id != null) {
                            byId.set(String(item.id), item);
                        } else {
                            withoutId.push(item);
                        }
                    }
                    this.data.contasReceber = [...withoutId, ...byId.values()];
                }
            } catch (error) {
                console.error('Erro ao carregar dados salvos:', error);
            }
            return;
        }
        this.data = { ...base };
    },

    async loadTransacoes() {
        try {
            const response = await fetch('/api/crm/transacoes', { credentials: 'include' });
            if (!response.ok) return;
            const rawRows = await response.json().catch(() => []);
            if (Array.isArray(rawRows)) {
                // Mapear snake_case da API para camelCase usado pelo frontend
                const rows = rawRows.map(r => ({
                    ...r,
                    centroCusto: r.centro_custo || r.centroCusto || null,
                    eventoId: r.evento_id || r.eventoId || null,
                    clienteId: r.cliente_id || r.clienteId || null,
                    clienteNome: r.cliente_nome || r.clienteNome || null,
                    eventoNome: r.evento_nome || r.eventoNome || null,
                    recorrenciaGrupoId: r.recorrencia_grupo_id || r.recorrenciaGrupoId || null,
                    recorrenciaIndice: r.recorrencia_indice || r.recorrenciaIndice || null,
                    comprovanteUrl: r.comprovante_url || r.comprovanteUrl || null,
                    comprovanteNome: r.comprovante_url ? (r.comprovante_url.split('/').pop() || 'comprovante') : (r.comprovanteNome || r.comprovante_nome || null)
                }));
                this.data.transacoes = rows;
                this.saveData();
                console.log(`✅ [ModuleSystem] Transações carregadas da API: ${rows.length} registros`);

                // Re-renderizar automaticamente se o módulo financeiro estiver aberto
                try {
                    if (window.NavigationSystem) {
                        const curMod = window.NavigationSystem.currentModule;
                        const curPage = window.NavigationSystem.currentPage;
                        if (curMod === 'financeiro') {
                            if (curPage) {
                                // Está em uma página específica (ex: despesas) - re-navegar
                                window.NavigationSystem.navigateToPage(curMod, curPage);
                            } else {
                                // Está no overview do módulo financeiro - re-renderizar dashboard
                                if (this.financeiro && typeof this.financeiro.initDashboardHome === 'function') {
                                    this.financeiro.initDashboardHome();
                                } else {
                                    window.NavigationSystem.navigateToModule('financeiro');
                                }
                            }
                            console.log('🔄 [ModuleSystem] Dashboard financeiro re-renderizado após sync');
                        }
                    }
                } catch (rerenderErr) {
                    console.warn('[ModuleSystem] Falha ao re-renderizar após sync:', rerenderErr);
                }
            }
        } catch (e) {
            console.warn('[ModuleSystem] Falha ao carregar transações da API:', e);
        }
    },

    async loadProjetos() {
        try {
            const response = await fetch('/api/crm/projetos', { credentials: 'include' });
            const json = await response.json().catch(() => []);
            if (Array.isArray(json)) {
                this.data.projetos = json;
                this.saveData();
            }
        } catch (e) {
            console.warn('Falha ao carregar projetos:', e);
        }
    },

    async loadMemoriais(projetoId = null) {
        try {
            const url = projetoId ? `/api/crm/memoriais?projeto_id=${encodeURIComponent(projetoId)}` : '/api/crm/memoriais';
            const response = await fetch(url, { credentials: 'include' });
            const json = await response.json().catch(() => []);
            if (Array.isArray(json)) {
                this.data.memoriais = json;
                this.saveData();
            }
        } catch (e) {
            console.warn('Falha ao carregar memoriais:', e);
        }
    },

    // Sincronizar clientes do backend (garante cross-browser)
    async syncClientesFromBackend() {
        try {
            const response = await fetch('/api/crm/clientes', { credentials: 'include' });
            if (!response.ok) return;
            const json = await response.json().catch(() => ({}));
            const rows = Array.isArray(json) ? json : (Array.isArray(json.data) ? json.data : []);
            if (!rows.length) return;
            const normalize = (r) => ({
                ...r,
                id: r.id,
                nome: r.nome || r.razao_social || '',
                documento: r.documento || r.cnpj || null,
                telefone: r.telefone || null,
                email: r.email || null,
                status: r.status || 'Ativo',
                segmento: r.segmento || r.categoria || r.setor || null
            });
            const byId = new Map();
            for (const c of (Array.isArray(this.data.clientes) ? this.data.clientes : [])) {
                if (c && c.id != null && !/^\d+$/.test(String(c.id)) === false) continue;
                if (c && c.id != null) byId.set(String(c.id), c);
            }
            for (const c of rows) {
                if (c && c.id != null) byId.set(String(c.id), normalize(c));
            }
            this.data.clientes = Array.from(byId.values());
            this.saveData();
            console.log(`✅ [ModuleSystem] Clientes sincronizados da API: ${rows.length} registros`);
        } catch (e) {
            console.warn('[ModuleSystem] Falha ao sincronizar clientes:', e);
        }
    },

    // Sincronizar eventos do backend (garante cross-browser)
    async syncEventosFromBackend() {
        try {
            const response = await fetch('/api/crm/eventos', { credentials: 'include' });
            if (!response.ok) return;
            const json = await response.json().catch(() => ({}));
            const rows = Array.isArray(json) ? json : (Array.isArray(json.data) ? json.data : []);
            if (!rows.length) return;
            const byId = new Map();
            for (const e of (Array.isArray(this.data.eventos) ? this.data.eventos : [])) {
                if (e && e.id != null) byId.set(String(e.id), e);
            }
            for (const e of rows) {
                if (e && e.id != null) byId.set(String(e.id), { ...(byId.get(String(e.id)) || {}), ...e });
            }
            this.data.eventos = Array.from(byId.values());
            this.saveData();
            console.log(`✅ [ModuleSystem] Eventos sincronizados da API: ${rows.length} registros`);
        } catch (e) {
            console.warn('[ModuleSystem] Falha ao sincronizar eventos:', e);
        }
    },

    // Sincronizar contas a receber do backend — delegado ao ContasReceberModule
    async syncContasReceberFromBackend() {
        if (window.ContasReceberModule && typeof window.ContasReceberModule.syncFromBackend === 'function') {
            return window.ContasReceberModule.syncFromBackend();
        }
        // Fallback inline caso crm-contas-receber.js ainda não tenha carregado
        try {
            if (window._crmSessionExpired) return; // sessão expirada, não tentar
            const response = await fetch('/api/crm/contas-receber', { credentials: 'include' });
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    window._crmSessionExpired = true;
                    try { if (window.NotificationSystem) window.NotificationSystem.warning('Sessão expirada. Faça login novamente.'); } catch {}
                }
                return;
            }
            const json = await response.json().catch(() => ({}));
            const rows = Array.isArray(json) ? json : (Array.isArray(json.data) ? json.data : []);
            if (!rows.length) return;
            const byId = new Map();
            for (const c of (Array.isArray(this.data.contasReceber) ? this.data.contasReceber : [])) {
                if (c && c.id != null) byId.set(String(c.id), c);
            }
            for (const c of rows) {
                if (c && c.id != null) byId.set(String(c.id), { ...c });
            }
            this.data.contasReceber = Array.from(byId.values());
            this.saveData();
        } catch (e) {
            console.warn('[ModuleSystem] Falha ao sincronizar contas a receber (fallback):', e);
        }
    },

    // Sincronizar leads do backend (garante cross-browser)
    async syncLeadsFromBackend() {
        try {
            const response = await fetch('/api/crm/leads', { credentials: 'include' });
            if (!response.ok) return;
            const json = await response.json().catch(() => ({}));
            const rows = Array.isArray(json) ? json : (Array.isArray(json.data) ? json.data : []);
            if (!rows.length) return;
            const byId = new Map();
            for (const l of (Array.isArray(this.data.leads) ? this.data.leads : [])) {
                if (l && l.id != null) byId.set(String(l.id), l);
            }
            for (const l of rows) {
                if (l && l.id != null) byId.set(String(l.id), { ...(byId.get(String(l.id)) || {}), ...l });
            }
            this.data.leads = Array.from(byId.values());
            this.saveData();
            console.log(`✅ [ModuleSystem] Leads sincronizados da API: ${rows.length} registros`);
        } catch (e) {
            console.warn('[ModuleSystem] Falha ao sincronizar leads:', e);
        }
    },

    // Helpers globais para composição de UI (classes e badges)
    escapeHtml(v) {
        try {
            return String(v ?? '')
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
                .replaceAll("'", '&#39;');
        } catch {
            const s = v == null ? '' : String(v);
            return s
                .split('&').join('&amp;')
                .split('<').join('&lt;')
                .split('>').join('&gt;')
                .split('"').join('&quot;')
                .split("'").join('&#39;');
        }
    },

    buildMemoriaisRowsHtml(memoriais, projetos) {
        const statusBadge = (s) => {
            const v = (s || '').toLowerCase();
            const map = {
                rascunho: 'bg-yellow-50 text-yellow-800 border-yellow-200',
                aguardando_aprovacao: 'bg-blue-50 text-blue-800 border-blue-200',
                aprovado: 'bg-green-50 text-green-800 border-green-200',
                reprovado: 'bg-red-50 text-red-800 border-red-200'
            };
            const labelMap = {
                rascunho: 'Rascunho',
                aguardando_aprovacao: 'Aguardando Aprovação',
                aprovado: 'Aprovado',
                reprovado: 'Reprovado'
            };
            return `<span class="px-2 py-1 text-xs border rounded-full ${map[v] || 'bg-gray-50 text-gray-700 border-gray-200'}">${labelMap[v] || s || '—'}</span>`;
        };
        const getProjetoNome = (pid) => {
            const p = (projetos || []).find(x => x && String(x.id) === String(pid));
            return p ? (p.nome || p.titulo || `Projeto #${p.id}`) : `Projeto #${pid}`;
        };

        const ms = Array.isArray(memoriais) ? memoriais : [];
        if (ms.length === 0) {
            return `
                <tr>
                    <td colspan="6" class="px-6 py-10 text-center text-sm text-gray-500">
                        Nenhum memorial encontrado.
                    </td>
                </tr>
            `;
        }

        return ms.map(m => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${getProjetoNome(m.projeto_id)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">v${m.versao || 1}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${ModuleSystem.escapeHtml(m.titulo || '')}</td>
                <td class="px-6 py-4 whitespace-nowrap">${statusBadge(m.status)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${(m.created_at || '').slice(0,10)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button data-action="read" data-module="memoriais" data-id="${m.id}" class="text-blue-600 hover:text-blue-900" title="Visualizar"><i class="fas fa-eye"></i></button>
                    <button data-action="update" data-module="memoriais" data-id="${m.id}" class="text-green-600 hover:text-green-900" title="Editar"><i class="fas fa-edit"></i></button>
                    <button type="button" onclick="(async()=>{const r=await fetch('/api/crm/memoriais/${m.id}/generate-html',{method:'POST',credentials:'include'});const t=await r.text(); const w=window.open('about:blank'); if(w){w.document.write(t); w.document.close();}})()" class="text-purple-600 hover:text-purple-900" title="Gerar Documento"><i class="fas fa-file-export"></i></button>
                    <button type="button" onclick="(async()=>{try{window.open('/api/crm/memoriais/${m.id}/download-html','_blank');}catch{}})()" class="text-indigo-600 hover:text-indigo-900" title="Baixar HTML"><i class="fas fa-download"></i></button>
                    <button type="button" onclick="(async()=>{try{if(!confirm('Duplicar este memorial como nova versão (rascunho)?')) return; const r=await fetch('/api/crm/memoriais/${m.id}/duplicar',{method:'POST',credentials:'include'}); const j=await r.json().catch(()=>null); if(!r.ok){alert((j&&j.error)?j.error:'Falha ao duplicar memorial'); return;} await ModuleSystem.refreshMemoriaisUI(ModuleSystem.data && ModuleSystem.data._memoriaisFiltroProjetoId ? String(ModuleSystem.data._memoriaisFiltroProjetoId) : null);}catch{alert('Falha ao duplicar memorial');}})()" class="text-gray-700 hover:text-gray-900" title="Duplicar Versão"><i class="fas fa-copy"></i></button>
                    <button data-action="delete" data-module="memoriais" data-id="${m.id}" class="text-red-600 hover:text-red-900" title="Excluir"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    },

    renderMemoriaisIntoDom() {
        try {
            const tbody = document.getElementById('memoriais-tbody');
            if (!tbody) return;
            const memoriais = ModuleSystem.data.memoriais || [];
            const projetos = ModuleSystem.data.projetos || [];
            tbody.innerHTML = ModuleSystem.buildMemoriaisRowsHtml(memoriais, projetos);
        } catch {}
    },

    async refreshMemoriaisUI(projetoId = null) {
        try {
            if (!Array.isArray(ModuleSystem.data.projetos) || ModuleSystem.data.projetos.length === 0) {
                await ModuleSystem.loadProjetos();
            }
            await ModuleSystem.loadMemoriais(projetoId || null);
            ModuleSystem.renderMemoriaisIntoDom();
        } catch {}
    },

    // Salvar dados
    saveData() {
        localStorage.setItem('sams_module_data', JSON.stringify(this.data));
    },

    // Handler global para cliques (definido como propriedade)
    globalClickHandler: null,
    globalSubmitHandler: null,

    // Flag para controlar se os eventos já foram vinculados
    eventsInitialized: false,

    // Vincular eventos globais
    bindGlobalEvents() {
        // Verificar se os eventos já foram inicializados
        if (this.eventsInitialized) {
            console.log('⚠️ Eventos globais já foram vinculados, ignorando chamada duplicada');
            return;
        }
        
        console.log('Vinculando eventos globais do ModuleSystem...');
        
        // Remover listeners existentes para evitar duplicação
        if (this.globalClickHandler) {
            document.removeEventListener('click', this.globalClickHandler, false);
        }
        if (this.globalSubmitHandler) {
            document.removeEventListener('submit', this.globalSubmitHandler, true);
        }
        
        // Criar handler persistente com contexto correto
        this.globalClickHandler = ((e) => {
            const rawTarget = e && e.target ? e.target : null;
            if (!rawTarget || !rawTarget.closest) return;

            // ✅ DELEGAÇÃO 1: Detectar clique em módulo do DASHBOARD (não em cards de páginas nem botões CRUD)
            // Cards de módulos no dashboard têm data-module mas NÃO têm data-page nem data-action
            // IMPORTANTE: só interceptar se o dashboardContent estiver visível (não hidden)
            const moduleCard = rawTarget.closest('.module-card[data-module]');
            const dashboardVisible = (() => {
                const dc = document.getElementById('dashboardContent');
                return dc && !dc.classList.contains('hidden') && dc.style.display !== 'none';
            })();
            if (moduleCard && dashboardVisible && !moduleCard.hasAttribute('data-page') && !moduleCard.hasAttribute('data-action')) {
                const moduleName = moduleCard.getAttribute('data-module');
                console.log('🎯 Clique detectado no módulo:', moduleName);
                this.showModule(moduleName);
                return;
            }

            // ✅ DELEGAÇÃO 2: Detectar clique em submodule Leads
            const leadsContainer = rawTarget.closest('[data-submodule="leads"]');
            if (leadsContainer) {
                console.log('🎯 Clique detectado no submodule Leads');
                this.showLeads();
                return;
            }

            // ✅ DELEGAÇÃO 2.5: Detectar clique em elementos de navegação com data-nav-page
            const navPageEl = rawTarget.closest('[data-nav-page]');
            if (navPageEl) {
                const page = navPageEl.getAttribute('data-nav-page');
                const module = navPageEl.getAttribute('data-nav-module') || (window.NavigationSystem ? window.NavigationSystem.currentModule : null);
                if (page && module && window.NavigationSystem && typeof window.NavigationSystem.navigateToPage === 'function') {
                    console.log('🎯 Clique detectado em página de navegação:', { module, page });
                    window.NavigationSystem.navigateToPage(module, page);
                    return;
                }
            }

            // ✅ DELEGAÇÃO 2.6: Detectar clique em elementos de navegação com data-nav-module
            const navModuleEl = rawTarget.closest('[data-nav-module]');
            if (navModuleEl && !navPageEl) {
                const module = navModuleEl.getAttribute('data-nav-module');
                if (module && window.NavigationSystem && typeof window.NavigationSystem.navigateToModule === 'function') {
                    console.log('🎯 Clique detectado em módulo de navegação:', { module });
                    window.NavigationSystem.navigateToModule(module);
                    return;
                }
            }

            // ✅ DELEGAÇÃO 3: Detectar clique em botão CRUD com [data-action]
            const actionEl = rawTarget.closest('[data-action]');
            if (!actionEl) return;

            const tag = (actionEl.tagName || '').toLowerCase();
            if (tag === 'form') return;

            e.preventDefault();
            // NÃO usar stopPropagation — bloqueia navegação no Edge/mobile

            const action = actionEl.getAttribute('data-action');
            const module = actionEl.getAttribute('data-module');
            const id = actionEl.getAttribute('data-id');

            console.log('Clique detectado em botão CRUD:', { action, module, id, element: actionEl });
            this.handleCRUDAction(action, module, id);
        }).bind(this);
        
        // capture:false para não bloquear handlers de navegação no Edge
        document.addEventListener('click', this.globalClickHandler, false);

        this.globalSubmitHandler = ((e) => {
            const form = e.target;
            if (!form || !form.id) return;
            if (form.id === 'eventos-import-form') {
                e.preventDefault();
                e.stopPropagation();
                this.handleEventosImportSubmit(form);
            }
            if (form.id === 'eventos-scan-form') {
                e.preventDefault();
                e.stopPropagation();
                this.handleEventosScanSubmit(form);
            }
        }).bind(this);
        document.addEventListener('submit', this.globalSubmitHandler, true);
        
        // Marcar como inicializado
        this.eventsInitialized = true;
        
        console.log('Eventos globais vinculados com sucesso');
        console.log('globalClickHandler definido:', typeof this.globalClickHandler);
    },

    // Manipular ações CRUD
    handleCRUDAction(action, module, id) {
        console.log('Manipulando ação CRUD:', { action, module, id });
        
        switch (action) {
            case 'setLeadsView': {
                try {
                    if (window.ModuleSystem && ModuleSystem.data) {
                        ModuleSystem.data.ui = ModuleSystem.data.ui || {};
                        ModuleSystem.data.ui.marketingLeadsView = String(id || 'list');
                        ModuleSystem.saveData();
                    }
                } catch {}
                if (window.NavigationSystem && typeof NavigationSystem.reloadCurrentPage === 'function') {
                    NavigationSystem.reloadCurrentPage();
                } else if (window.MarketingModule && typeof window.MarketingModule.loadLeads === 'function') {
                    window.MarketingModule.loadLeads();
                }
                break;
            }
            case 'setPipelineMode': {
                try {
                    if (window.ModuleSystem && ModuleSystem.data) {
                        ModuleSystem.data.ui = ModuleSystem.data.ui || {};
                        ModuleSystem.data.ui.marketingLeadsView = 'pipeline';
                        ModuleSystem.data.ui.marketingLeadsPipelineMode = String(id || 'status');
                        ModuleSystem.saveData();
                    }
                } catch {}
                if (window.NavigationSystem && typeof NavigationSystem.reloadCurrentPage === 'function') {
                    NavigationSystem.reloadCurrentPage();
                } else if (window.MarketingModule && typeof window.MarketingModule.loadLeads === 'function') {
                    window.MarketingModule.loadLeads();
                }
                break;
            }
            case 'create':
                console.log('Chamando showCreateForm para:', module);
                this.showCreateForm(module);
                break;
            case 'read':
                this.showDetails(module, id);
                break;
            case 'update':
                this.showUpdateForm(module, id);
                break;
            case 'delete':
                this.confirmDelete(module, id);
                break;
            case 'duplicate':
                this.duplicateItem(module, id);
                break;
            case 'import':
                if (module === 'eventos') {
                    this.showEventosImportModal();
                } else {
                    console.warn('Ação import não suportada para módulo:', module);
                }
                break;
            case 'scan':
                if (module === 'eventos') {
                    this.showEventosScanModal();
                } else {
                    console.warn('Ação scan não suportada para módulo:', module);
                }
                break;
            default:
                console.warn('Ação não reconhecida:', action);
        }
    },

    duplicateItem(module, id) {
        const allowed = (module === 'campanhas' || module === 'marketing_campanhas');
        if (!allowed) {
            if (window.NotificationSystem && typeof window.NotificationSystem.warning === 'function') {
                window.NotificationSystem.warning('Duplicação não disponível para este item.');
            }
            return;
        }

        const moduleData = this.getModuleData(module);
        if (!moduleData) return;

        const source = moduleData.find(item => item && String(item.id) === String(id));
        if (!source) return;

        const clone = { ...source };
        const maxNumericId = moduleData.reduce((acc, item) => {
            const n = item && item.id != null ? parseInt(String(item.id), 10) : NaN;
            return Number.isFinite(n) ? Math.max(acc, n) : acc;
        }, 0);
        const newId = String(maxNumericId + 1);
        clone.id = newId;
        clone.nome = `${source.nome || 'Campanha'} (Cópia)`;
        if ('leads_gerados' in clone) clone.leads_gerados = 0;
        if ('conversoes' in clone) clone.conversoes = 0;
        clone.created_at = clone.created_at || new Date().toISOString();
        clone.updated_at = new Date().toISOString();

        moduleData.push(clone);
        this.saveData();

        if (window.NotificationSystem && typeof window.NotificationSystem.success === 'function') {
            window.NotificationSystem.success('Campanha duplicada com sucesso.');
        }
        if (window.NavigationSystem && typeof window.NavigationSystem.reloadCurrentPage === 'function') {
            window.NavigationSystem.reloadCurrentPage();
        }
    },

    showEventosImportModal() {
        if (!window.FormSystem || typeof FormSystem.openModal !== 'function') {
            alert('FormSystem não disponível para abrir modal.');
            return;
        }

        const content = `
            <form id="eventos-import-form" class="space-y-4">
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                    Cole links (1 por linha) de páginas de eventos/feiras que contenham dados estruturados (JSON-LD).
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">URLs</label>
                    <textarea name="urls" rows="6"
                              placeholder="https://exemplo.com/evento\nhttps://outro.com/feira"
                              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"></textarea>
                    <div class="text-xs text-gray-500 mt-1">Limite: 20 URLs por importação.</div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Status padrão</label>
                        <select name="defaultStatus" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="Planejado" selected>Planejado</option>
                            <option value="Confirmado">Confirmado</option>
                            <option value="Adiado">Adiado</option>
                            <option value="Cancelado">Cancelado</option>
                        </select>
                    </div>
                    <div class="flex items-end">
                        <div id="eventos-import-result" class="text-sm text-gray-600"></div>
                    </div>
                </div>

                <div class="flex justify-end gap-3 pt-2">
                    <button type="button" data-close-modal
                            class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-300">
                        Cancelar
                    </button>
                    <button type="submit"
                            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-300">
                        Importar
                    </button>
                </div>
            </form>
        `;

        FormSystem.openModal('Importar Eventos (varredura por URL)', content);
    },

    showEventosScanModal() {
        if (!window.FormSystem || typeof FormSystem.openModal !== 'function') {
            alert('FormSystem não disponível para abrir modal.');
            return;
        }

        const content = `
            <form id="eventos-scan-form" class="space-y-4">
                <div class="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-purple-900">
                    Varredura automática em fontes do governo (gov.br). Funciona melhor em páginas que expõem dados estruturados.
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Fonte</label>
                        <select name="preset" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="turismo_oficial" selected>Calendário Oficial (turismo.gov.br)</option>
                            <option value="sul_sp">Sul + SP capital (pré-configurado)</option>
                            <option value="sites_govbr">Outros sites *.gov.br (crawler)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Status padrão</label>
                        <select name="defaultStatus" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="Planejado" selected>Planejado</option>
                            <option value="Confirmado">Confirmado</option>
                            <option value="Adiado">Adiado</option>
                            <option value="Cancelado">Cancelado</option>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Limite de eventos</label>
                        <input type="number" name="maxEvents" min="1" max="200" value="80"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div class="flex items-end">
                        <div id="eventos-scan-result" class="text-sm text-gray-600"></div>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Seeds (somente para “Outros sites *.gov.br”)</label>
                    <textarea name="seedUrls" rows="4"
                              placeholder="https://www.turismo.sp.gov.br/eventos"
                              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"></textarea>
                    <div class="text-xs text-gray-500 mt-1">Limite: 10 URLs seed. Apenas domínios *.gov.br.</div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">UFs (filtro)</label>
                        <textarea name="ufs" rows="3"
                                  placeholder="RS, SC, PR, SP"
                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"></textarea>
                        <div class="text-xs text-gray-500 mt-1">Ex.: RS,SC,PR,SP</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Cidades (filtro)</label>
                        <textarea name="cities" rows="3"
                                  placeholder="Porto Alegre\nFlorianópolis\nCuritiba"
                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"></textarea>
                        <div class="text-xs text-gray-500 mt-1">1 por linha (ou separado por vírgula)</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Locais/pavilhões (filtro)</label>
                        <textarea name="venueKeywords" rows="3"
                                  placeholder="Expo Center Norte\nAnhembi\nSão Paulo Expo"
                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"></textarea>
                        <div class="text-xs text-gray-500 mt-1">Palavras-chave</div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Páginas por seed</label>
                        <input type="number" name="maxPagesPerSeed" min="1" max="60" value="20"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div class="flex items-end text-xs text-gray-500">
                        No crawler, só percorre links do mesmo domínio.
                    </div>
                </div>

                <div class="flex justify-end gap-3 pt-2">
                    <button type="button" data-close-modal
                            class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-300">
                        Cancelar
                    </button>
                    <button type="submit"
                            class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition duration-300">
                        Iniciar varredura
                    </button>
                </div>
            </form>
        `;

        FormSystem.openModal('Varredura automática (gov.br)', content);

        setTimeout(() => {
            const form = document.getElementById('eventos-scan-form');
            if (!form) return;
            const presetSelect = form.querySelector('select[name="preset"]');
            if (!presetSelect || presetSelect.dataset.bound === 'true') return;
            presetSelect.dataset.bound = 'true';

            const applyPreset = () => {
                const preset = presetSelect.value || 'turismo_oficial';
                if (preset !== 'sul_sp') return;

                const ufsEl = form.querySelector('textarea[name="ufs"]');
                const citiesEl = form.querySelector('textarea[name="cities"]');
                const venuesEl = form.querySelector('textarea[name="venueKeywords"]');
                const seedEl = form.querySelector('textarea[name="seedUrls"]');

                if (ufsEl) ufsEl.value = 'RS, SC, PR, SP';
                if (citiesEl) citiesEl.value = [
                    'Porto Alegre',
                    'Novo Hamburgo',
                    'Bento Gonçalves',
                    'Caxias do Sul',
                    'Não-Me-Toque',
                    'Florianópolis',
                    'Blumenau',
                    'Joinville',
                    'Balneário Camboriú',
                    'São José dos Pinhais',
                    'Curitiba',
                    'Cascavel',
                    'São Paulo'
                ].join('\n');
                if (venuesEl) venuesEl.value = [
                    'Expo Center Norte',
                    'Pavilhões Expo Center Norte',
                    'Distrito Anhembi',
                    'Anhembi',
                    'São Paulo Expo',
                    'SP Expo'
                ].join('\n');
                if (seedEl) seedEl.value = '';
            };

            presetSelect.addEventListener('change', applyPreset);
        }, 0);
    },

    async handleEventosImportSubmit(form) {
        const notify = (type, msg) => {
            if (window.Utils && Utils.notifications && typeof Utils.notifications[type] === 'function') {
                Utils.notifications[type](msg);
                return;
            }
            if (window.Toast && typeof window.Toast.show === 'function') {
                window.Toast.show(msg, type === 'error' ? 'error' : 'success');
                return;
            }
            alert(msg);
        };

        const urlsText = (form.querySelector('textarea[name="urls"]')?.value || '').trim();
        const defaultStatus = form.querySelector('select[name="defaultStatus"]')?.value || 'Planejado';
        const resultEl = form.querySelector('#eventos-import-result');
        const submitBtn = form.querySelector('button[type="submit"]');

        const urls = urlsText
            .split(/\r?\n/)
            .map(s => s.trim())
            .filter(Boolean);

        if (!urls.length) {
            notify('warning', 'Informe pelo menos 1 URL para importar.');
            return;
        }

        if (submitBtn) submitBtn.disabled = true;
        if (resultEl) resultEl.textContent = 'Importando...';

        try {
            const resp = await fetch('/api/crm/eventos/import-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ urls, defaultStatus })
            });
            const payload = await resp.json().catch(() => ({}));
            if (!resp.ok) {
                const msg = payload && payload.error ? payload.error : 'Erro ao importar eventos';
                throw new Error(msg);
            }

            const imported = payload && typeof payload.imported === 'number' ? payload.imported : 0;
            const duplicates = payload && typeof payload.duplicates === 'number' ? payload.duplicates : 0;
            const found = payload && typeof payload.found === 'number' ? payload.found : 0;

            if (resultEl) resultEl.textContent = `Encontrados: ${found} | Importados: ${imported} | Duplicados: ${duplicates}`;
            notify('success', `Importação concluída: ${imported} evento(s) importado(s).`);

            try {
                if (window.NavigationSystem && typeof NavigationSystem.reloadEventosList === 'function') {
                    NavigationSystem.reloadEventosList();
                } else if (window.ComercialModule && typeof window.ComercialModule.loadEventos === 'function') {
                    window.ComercialModule.loadEventos();
                } else if (window.NavigationSystem && typeof NavigationSystem.reloadCurrentPage === 'function') {
                    NavigationSystem.reloadCurrentPage();
                }
            } catch {}

            if (window.FormSystem && typeof FormSystem.closeModal === 'function') {
                FormSystem.closeModal();
            }
        } catch (err) {
            if (resultEl) resultEl.textContent = '';
            notify('error', err && err.message ? err.message : 'Falha na importação');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    },

    async handleEventosScanSubmit(form) {
        const notify = (type, msg) => {
            if (window.Utils && Utils.notifications && typeof Utils.notifications[type] === 'function') {
                Utils.notifications[type](msg);
                return;
            }
            if (window.Toast && typeof window.Toast.show === 'function') {
                window.Toast.show(msg, type === 'error' ? 'error' : 'success');
                return;
            }
            alert(msg);
        };

        const preset = form.querySelector('select[name="preset"]')?.value || 'turismo_oficial';
        const defaultStatus = form.querySelector('select[name="defaultStatus"]')?.value || 'Planejado';
        const maxEvents = parseInt(form.querySelector('input[name="maxEvents"]')?.value || '80', 10);
        const maxPagesPerSeed = parseInt(form.querySelector('input[name="maxPagesPerSeed"]')?.value || '20', 10);
        const seedUrlsText = (form.querySelector('textarea[name="seedUrls"]')?.value || '').trim();
        const ufsText = (form.querySelector('textarea[name="ufs"]')?.value || '').trim();
        const citiesText = (form.querySelector('textarea[name="cities"]')?.value || '').trim();
        const venueKeywordsText = (form.querySelector('textarea[name="venueKeywords"]')?.value || '').trim();

        const resultEl = form.querySelector('#eventos-scan-result');
        const submitBtn = form.querySelector('button[type="submit"]');

        if (submitBtn) submitBtn.disabled = true;
        if (resultEl) resultEl.textContent = 'Varredura em andamento...';

        try {
            let endpoint = '/api/crm/eventos/scan-turismo-oficial';
            const parseList = (text) => String(text || '')
                .split(/[\r\n,;|]+/g)
                .map(s => s.trim())
                .filter(Boolean);
            const ufs = parseList(ufsText);
            const cities = parseList(citiesText);
            const venueKeywords = parseList(venueKeywordsText);

            let body = {
                maxEvents: Number.isFinite(maxEvents) ? maxEvents : 80,
                defaultStatus,
                ufs,
                cities,
                venueKeywords
            };

            if (preset === 'sites_govbr') {
                endpoint = '/api/crm/eventos/scan-sites';
                const seedUrls = seedUrlsText
                    .split(/\r?\n/)
                    .map(s => s.trim())
                    .filter(Boolean);
                if (!seedUrls.length) {
                    throw new Error('Informe pelo menos 1 URL seed para varredura em sites *.gov.br.');
                }
                body = {
                    seedUrls,
                    maxPagesPerSeed: Number.isFinite(maxPagesPerSeed) ? maxPagesPerSeed : 20,
                    maxEvents: Number.isFinite(maxEvents) ? maxEvents : 80,
                    defaultStatus,
                    ufs,
                    cities,
                    venueKeywords
                };
            }

            const resp = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body)
            });
            const payload = await resp.json().catch(() => ({}));
            if (!resp.ok) {
                const msg = payload && payload.error ? payload.error : 'Erro na varredura';
                throw new Error(msg);
            }

            const imported = payload && typeof payload.imported === 'number' ? payload.imported : 0;
            const duplicates = payload && typeof payload.duplicates === 'number' ? payload.duplicates : 0;
            const found = payload && typeof payload.found === 'number' ? payload.found : 0;
            const visited = payload && typeof payload.visited === 'number' ? payload.visited : null;

            if (resultEl) {
                resultEl.textContent = visited != null
                    ? `Visitadas: ${visited} | Encontrados: ${found} | Importados: ${imported} | Duplicados: ${duplicates}`
                    : `Encontrados: ${found} | Importados: ${imported} | Duplicados: ${duplicates}`;
            }

            notify('success', `Varredura concluída: ${imported} evento(s) importado(s).`);

            try {
                if (window.NavigationSystem && typeof NavigationSystem.reloadEventosList === 'function') {
                    NavigationSystem.reloadEventosList();
                } else if (window.ComercialModule && typeof window.ComercialModule.loadEventos === 'function') {
                    window.ComercialModule.loadEventos();
                } else if (window.NavigationSystem && typeof NavigationSystem.reloadCurrentPage === 'function') {
                    NavigationSystem.reloadCurrentPage();
                }
            } catch {}

            if (window.FormSystem && typeof FormSystem.closeModal === 'function') {
                FormSystem.closeModal();
            }
        } catch (err) {
            if (resultEl) resultEl.textContent = '';
            notify('error', err && err.message ? err.message : 'Falha na varredura');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    },

    // Módulo Marketing
    marketing: {
        // Listar leads
        listLeads() {
            // Se não houver leads carregados, retornar um container vazio com mensagem de carregamento
            if (!ModuleSystem.data.leads || ModuleSystem.data.leads.length === 0) {
                return `
                    <div class="mb-6">
                        <div class="flex justify-between items-center">
                            <div class="flex space-x-3">
                                <button type="button" data-nav-module="dashboard"
                                        class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-300">
                                    <i class="fas fa-home mr-2"></i>Dashboard
                                </button>
                                <button type="button" data-nav-module="marketing"
                                        class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-300">
                                    <i class="fas fa-arrow-left mr-2"></i>Voltar ao Marketing
                                </button>
                            </div>
                            <button type="button"
                                    data-action="create"
                                    data-module="marketing_leads"
                                    class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-300">
                                <i class="fas fa-plus mr-2"></i>Novo Lead
                            </button>
                        </div>
                    </div>
                    <div id="leads-list-container" class="bg-white rounded-lg shadow p-6">
                        <p class="text-gray-600 text-center">Carregando leads...</p>
                    </div>
                `;
            }
            const leads = ModuleSystem.data.leads;
            const ui = (ModuleSystem.data && ModuleSystem.data.ui) ? ModuleSystem.data.ui : {};
            const currentView = (ui && ui.marketingLeadsView) ? ui.marketingLeadsView : 'list';
            const currentMode = (ui && ui.marketingLeadsPipelineMode) ? ui.marketingLeadsPipelineMode : 'status';
            const viewBtnCls = (active) => active
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50';
            const modeBtnCls = (active) => active
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50';
            
            // Função auxiliar para extrair dígitos do WhatsApp
            const getWhatsappDigits = (lead) => {
                const raw = (lead && (lead.whatsapp || lead.telefone)) ? String(lead.whatsapp || lead.telefone) : '';
                const digits = raw.replace(/\D/g, '');
                if (!digits) return '';
                if (digits.startsWith('55')) return digits;
                if (digits.length >= 10) return '55' + digits;
                return digits;
            };

            // Função para renderizar card de lead (mobile)
            const renderLeadCard = (lead) => {
                const tempClass = lead.temperatura === 'quente' ? 'hot' : lead.temperatura === 'morno' ? 'warm' : 'cold';
                const tempLabel = lead.temperatura === 'quente' ? '🔴 Quente' : lead.temperatura === 'morno' ? '🟡 Morno' : '🔵 Frio';
                const whatsappBtn = getWhatsappDigits(lead) ? `<button type="button" data-lead-whatsapp="1" data-id="${lead.id}" class="whatsapp" title="Enviar WhatsApp">💬 WhatsApp</button>` : '';
                const statusCls = window.UIHelpers ? UIHelpers.computeStatusClass(lead.status) : 'bg-blue-100 text-blue-800';
                const dataFmt = lead.dataContato || (lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : '');
                return `
                    <div class="lead-card">
                        <div class="lead-card-header">
                            <div class="lead-card-name">${lead.nome}</div>
                            <span class="lead-card-temperature ${tempClass}">${tempLabel}</span>
                        </div>
                        <div class="lead-card-body">
                            ${lead.status ? `<div class="lead-card-field"><span class="lead-card-label">Status:</span><span class="lead-card-value"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusCls}">${lead.status}</span></span></div>` : ''}
                            <div class="lead-card-field">
                                <span class="lead-card-label">Empresa:</span>
                                <span class="lead-card-value">${lead.empresa || '—'}</span>
                            </div>
                            <div class="lead-card-field">
                                <span class="lead-card-label">Email:</span>
                                <span class="lead-card-value">${lead.email || '—'}</span>
                            </div>
                            <div class="lead-card-field">
                                <span class="lead-card-label">Telefone:</span>
                                <span class="lead-card-value">${lead.telefone || '—'}</span>
                            </div>
                            <div class="lead-card-field">
                                <span class="lead-card-label">Origem:</span>
                                <span class="lead-card-value">${lead.origem || '—'}</span>
                            </div>
                            ${dataFmt ? `<div class="lead-card-field"><span class="lead-card-label">Data:</span><span class="lead-card-value">${dataFmt}</span></div>` : ''}
                        </div>
                        <div class="lead-card-actions">
                            ${whatsappBtn}
                            <button data-action="read" data-module="leads" data-id="${lead.id}" class="view" title="Visualizar lead">👁️ Ver</button>
                            <button data-action="update" data-module="leads" data-id="${lead.id}" class="edit" title="Editar lead">✏️ Editar</button>
                            <button data-action="delete" data-module="leads" data-id="${lead.id}" class="delete" title="Excluir lead">🗑️ Excluir</button>
                        </div>
                    </div>
                `;
            };
            
            return `
                <div class="mb-6">
                    <div class="flex justify-between items-center">
                        <div class="flex space-x-3">
                            <button type="button" data-nav-module="dashboard"
                                    class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-300">
                                <i class="fas fa-home mr-2"></i>Dashboard
                            </button>
                            <button type="button" data-nav-module="marketing"
                                    class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-300">
                                <i class="fas fa-arrow-left mr-2"></i>Voltar ao Marketing
                            </button>
                        </div>
                    </div>
                </div>
                
                <div id="leads-list-container" class="bg-white rounded-lg shadow">
                    <div class="p-6 border-b border-gray-200">
                        <div class="flex justify-between items-center">
                            <div class="flex items-center gap-3 flex-wrap">
                                <h3 id="leads-title" class="text-lg font-semibold text-gray-800">${currentView === 'pipeline' ? 'Pipeline de Leads' : 'Lista de Leads'}</h3>
                                <div class="flex items-center gap-2">
                                    <button type="button"
                                            class="px-3 py-1.5 rounded-full border text-sm transition ${viewBtnCls(currentView !== 'pipeline')}"
                                            data-action="setLeadsView"
                                            data-module="marketing_leads"
                                            data-id="list">
                                        <i class="fas fa-list mr-2"></i>Lista
                                    </button>
                                    <button type="button"
                                            class="px-3 py-1.5 rounded-full border text-sm transition ${viewBtnCls(currentView === 'pipeline')}"
                                            data-action="setLeadsView"
                                            data-module="marketing_leads"
                                            data-id="pipeline">
                                        <i class="fas fa-columns mr-2"></i>Pipeline
                                    </button>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <button data-action="create" data-module="marketing_leads"
                                        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-300">
                                    <i class="fas fa-plus mr-2"></i>Novo Lead
                                </button>
                            </div>
                        </div>
                        <div id="leads-pipeline-modes" class="${currentView === 'pipeline' ? 'mt-4 flex flex-wrap gap-2' : 'hidden'}">
                            <button type="button"
                                    class="px-3 py-1.5 rounded-full border text-sm transition ${modeBtnCls(currentMode === 'status')}"
                                    data-action="setPipelineMode"
                                    data-module="marketing_leads"
                                    data-id="status">
                                Etapas
                            </button>
                            <button type="button"
                                    class="px-3 py-1.5 rounded-full border text-sm transition ${modeBtnCls(currentMode === 'temperatura')}"
                                    data-action="setPipelineMode"
                                    data-module="marketing_leads"
                                    data-id="temperatura">
                                Temperatura
                            </button>
                            <button type="button"
                                    class="px-3 py-1.5 rounded-full border text-sm transition ${modeBtnCls(currentMode === 'funnel')}"
                                    data-action="setPipelineMode"
                                    data-module="marketing_leads"
                                    data-id="funnel">
                                Funil
                            </button>
                        </div>
                        <div class="mt-4 flex flex-col gap-3">
                            <div class="flex flex-col md:flex-row gap-2 md:items-center">
                                <div class="flex-1">
                                    <input id="leads-search-input"
                                           type="search"
                                           placeholder="Buscar por nome, empresa ou e-mail..."
                                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                </div>
                                <button id="leads-filters-toggle" type="button"
                                        class="md:hidden bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg transition duration-300">
                                    <i class="fas fa-filter mr-2"></i>Filtros
                                </button>
                                <button id="leads-filters-clear" type="button"
                                        class="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg transition duration-300">
                                    <i class="fas fa-eraser mr-2"></i>Limpar
                                </button>
                            </div>
                            <div id="leads-filters-panel" class="hidden md:block bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label class="block text-xs font-medium text-gray-600 mb-1">Temperatura</label>
                                        <select id="leads-filter-temperatura" class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                                            <option value="">Todas</option>
                                            <option value="quente">Quente</option>
                                            <option value="morno">Morno</option>
                                            <option value="frio">Frio</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-xs font-medium text-gray-600 mb-1">Segmento</label>
                                        <select id="leads-filter-segmento" class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                                            <option value="">Todos</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-xs font-medium text-gray-600 mb-1">Evento</label>
                                        <select id="leads-filter-evento" class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                                            <option value="">Todos</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div id="leads-view-list" class="${currentView === 'pipeline' ? 'hidden' : ''}">
                        <!-- Tabela para desktop -->
                        <div class="overflow-x-auto hidden md:block">
                        <table class="w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origem</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="leads-list-body" class="bg-white divide-y divide-gray-200">
                                ${leads.map(lead => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="text-sm font-medium text-gray-900">${lead.nome}</div>
                                            <div class="text-sm text-gray-500">${lead.email}</div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${lead.empresa}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${UIHelpers.computeStatusClass(lead.status)}">
                                                ${lead.status || '—'}
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${lead.origem}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${lead.dataContato || (lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : '')}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            <button data-action="read" data-module="leads" data-id="${lead.id}"
                                                    class="text-blue-600 hover:text-blue-900"
                                                    title="Visualizar lead"
                                                    aria-label="Visualizar detalhes do lead ${lead.nome}">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            <button data-action="update" data-module="leads" data-id="${lead.id}"
                                                    class="text-green-600 hover:text-green-900"
                                                    title="Editar lead"
                                                    aria-label="Editar lead ${lead.nome}">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button data-action="delete" data-module="leads" data-id="${lead.id}"
                                                    class="text-red-600 hover:text-red-900"
                                                    title="Excluir lead"
                                                    aria-label="Excluir lead ${lead.nome}">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        </div>
                        <!-- Cards para mobile -->
                        <div id="leads-cards-view" class="block md:hidden p-4">
                            ${leads.map(renderLeadCard).join('')}
                        </div>
                    </div>
                    <div id="leads-view-pipeline" class="${currentView === 'pipeline' ? '' : 'hidden'}">
                        <div class="p-6">
                            <div class="overflow-x-auto">
                                <div id="leads-pipeline-board"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        // Listar campanhas
        listCampanhas() {
            const campanhas = ModuleSystem.data.campanhas;
            return `
                <div class="mb-6">
                    <div class="flex justify-between items-center">
                        <div class="flex space-x-3">
                            <button type="button" data-nav-module="dashboard"
                                    class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-300">
                                <i class="fas fa-home mr-2"></i>Dashboard
                            </button>
                            <button type="button" data-nav-module="marketing"
                                    class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-300">
                                <i class="fas fa-arrow-left mr-2"></i>Voltar ao Marketing
                            </button>
                        </div>
                    </div>
                </div>
                
                <div id="campanhas-list-container" class="bg-white rounded-lg shadow">
                    <div class="p-6 border-b border-gray-200">
                        <div class="flex justify-between items-center">
                            <h3 class="text-lg font-semibold text-gray-800">Campanhas de Marketing</h3>
                            <button data-action="create" data-module="marketing_campanhas" 
                                    class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-300">
                                <i class="fas fa-plus mr-2"></i>Nova Campanha
                            </button>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orçamento</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leads</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="campanhas-list-body" class="bg-white divide-y divide-gray-200">
                                ${campanhas.map(campanha => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="text-sm font-medium text-gray-900">${campanha.nome}</div>
                                            <div class="text-sm text-gray-500">${campanha.descricao ? campanha.descricao.substring(0, 50) + '...' : ''}</div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${campanha.tipo}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${campanha.status === 'Ativa' ? 'bg-green-100 text-green-800' : 
                                                  campanha.status === 'Planejamento' ? 'bg-yellow-100 text-yellow-800' : 
                                                  campanha.status === 'Finalizada' ? 'bg-blue-100 text-blue-800' :
                                                  'bg-gray-100 text-gray-800'}">
                                                ${campanha.status}
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ${new Date(campanha.data_inicio).toLocaleDateString('pt-BR')} - 
                                            ${new Date(campanha.data_fim).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            R$ ${campanha.orcamento ? campanha.orcamento.toLocaleString('pt-BR', {minimumFractionDigits: 2}) : '0,00'}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <div class="flex items-center">
                                                <span class="text-green-600 font-medium">${campanha.leads_gerados || 0}</span>
                                                <span class="text-gray-400 mx-1">/</span>
                                                <span class="text-gray-600">${campanha.meta_leads || 0}</span>
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2 sticky right-0 bg-white z-10">
                                            <button data-action="read" data-module="marketing_campanhas" data-id="${campanha.id}"
                                                    class="text-blue-600 hover:text-blue-900"
                                                    title="Visualizar campanha"
                                                    aria-label="Visualizar detalhes da campanha ${campanha.nome}">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            <button data-action="update" data-module="marketing_campanhas" data-id="${campanha.id}"
                                                    class="text-green-600 hover:text-green-900"
                                                    title="Editar campanha"
                                                    aria-label="Editar campanha ${campanha.nome}">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button data-action="duplicate" data-module="marketing_campanhas" data-id="${campanha.id}"
                                                    class="text-gray-600 hover:text-gray-900"
                                                    title="Duplicar campanha"
                                                    aria-label="Duplicar campanha ${campanha.nome}">
                                                <i class="fas fa-copy"></i>
                                            </button>
                                            <button data-action="delete" data-module="marketing_campanhas" data-id="${campanha.id}"
                                                    class="text-red-600 hover:text-red-900"
                                                    title="Excluir campanha"
                                                    aria-label="Excluir campanha ${campanha.nome}">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        },

        // Listar contatos
        listContatos() {
            const contatos = ModuleSystem.data.contatos || [];
            const current =
                (window.AuthSystem && typeof window.AuthSystem.getCurrentUser === 'function')
                    ? (window.AuthSystem.getCurrentUser() || null)
                    : ((window.AuthSystem && window.AuthSystem.currentUser) ? window.AuthSystem.currentUser : null);
            const role = current && current.role != null ? String(current.role).toLowerCase() : '';
            const canAssign = role === 'administrador' || role === 'admin' || role === 'gerente' || role === 'gerencia' || role === 'gerência' || role === 'gestor' || role === 'gestao' || role === 'gestão';
            return `
                <div class="mb-6">
                    <div class="flex justify-between items-center">
                        <div class="flex space-x-3">
                            <button type="button" data-nav-module="dashboard"
                                    class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-300">
                                <i class="fas fa-home mr-2"></i>Dashboard
                            </button>
                            <button type="button" data-nav-module="marketing"
                                    class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-300">
                                <i class="fas fa-arrow-left mr-2"></i>Voltar ao Marketing
                            </button>
                        </div>
                    </div>
                </div>
                
                <div id="contatos-list-container" class="bg-white rounded-lg shadow">
                    <div class="p-6 border-b border-gray-200">
                        <div class="flex justify-between items-center">
                            <h3 class="text-lg font-semibold text-gray-800">Lista de Contatos</h3>
                            <div class="flex items-center gap-2">
                                ${canAssign ? `
                                    <button type="button" data-contatos-filter="all"
                                            class="px-3 py-2 rounded-lg text-sm border bg-white hover:bg-gray-50 text-gray-800"
                                            aria-pressed="true">
                                        Todos
                                    </button>
                                    <button type="button" data-contatos-filter="unassigned"
                                            class="px-3 py-2 rounded-lg text-sm border bg-white hover:bg-gray-50 text-gray-800"
                                            aria-pressed="false">
                                        Não atribuídos
                                    </button>
                                ` : ''}
                                <button data-action="create" data-module="marketing_contatos" 
                                        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-300">
                                    <i class="fas fa-plus mr-2"></i>Novo Contato
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsável</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="contatos-list-body" class="bg-white divide-y divide-gray-200">
                                ${contatos.map(contato => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="text-sm font-medium text-gray-900">${contato.nome || 'N/A'}</div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${contato.email || 'N/A'}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${contato.telefone || 'N/A'}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${contato.empresa || 'N/A'}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${contato.responsavel_text || contato.responsavelText || 'Não atribuído'}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="flex items-center gap-2">
                                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${UIHelpers.computeStatusClass(contato.status)}">
                                                    ${contato.status || '—'}
                                                </span>
                                                ${UIHelpers.renderSegmentBadge(contato.segmento || contato.categoria || contato.setor)}
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button data-action="read" data-module="marketing_contatos" data-id="${contato.id}" 
                                                    class="text-gray-600 hover:text-gray-900 mr-3"
                                                    title="Visualizar contato"
                                                    aria-label="Visualizar contato ${contato.nome}">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            <button data-action="update" data-module="marketing_contatos" data-id="${contato.id}" 
                                                    class="text-indigo-600 hover:text-indigo-900 mr-3"
                                                    title="Editar contato"
                                                    aria-label="Editar contato ${contato.nome}">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button data-action="delete" data-module="marketing_contatos" data-id="${contato.id}" 
                                                    class="text-red-600 hover:text-red-900"
                                                    title="Excluir contato"
                                                    aria-label="Excluir contato ${contato.nome}">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    },

    // Módulo Comercial
    comercial: {
        renderDashboardHome() {
            return `
                <div class="bg-white rounded-lg shadow overflow-hidden mb-6">
                    <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <div>
                            <div class="text-sm text-gray-500">Comercial</div>
                            <div class="text-lg font-semibold text-gray-800">Resumo e Indicadores</div>
                        </div>
                        <div class="flex items-center gap-2">
                            <button id="comercialDashRefreshHome" class="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg text-sm">
                                <i class="fas fa-sync-alt mr-2"></i>Atualizar
                            </button>
                            <button type="button" data-nav-module="comercial" data-nav-page="dashboard"
                                    class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm">
                                <i class="fas fa-chart-pie mr-2"></i>Ver detalhes
                            </button>
                        </div>
                    </div>
                    <div id="comercialDashBodyHome" class="p-6">
                        <div class="text-sm text-gray-500">Carregando...</div>
                    </div>
                </div>
            `;
        },
        initDashboardHome() {
            const body = document.getElementById('comercialDashBodyHome');
            const btn = document.getElementById('comercialDashRefreshHome');
            if (!body) return;

            const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
            const api = async (url) => {
                const r = await fetch(url, { credentials: 'include' });
                const j = await r.json().catch(() => null);
                if (!r.ok) throw new Error((j && j.error) ? j.error : 'Falha na API');
                return j;
            };
            const sumBy = (arr, key) => (arr || []).reduce((acc, x) => acc + (Number(x && x[key]) || 0), 0);
            const getStatusCount = (arr, label) => {
                const t = String(label || '').trim().toLowerCase();
                const it = (arr || []).find(x => String(x && x.status || '').trim().toLowerCase() === t);
                return it ? Number(it.count || 0) : 0;
            };

            const render = (data) => {
                const k = data && data.kpis ? data.kpis : {};
                const scope = data && data.scope ? String(data.scope) : 'all';
                const scopeLabel = scope === 'mine' ? 'Minha carteira' : 'Visão geral';
                const briefingsEmAnalise = getStatusCount(data && data.briefings_by_status, 'Em Análise');
                const briefingsEmAndamento = getStatusCount(data && data.briefings_by_status, 'Em Andamento');
                const briefingsAprovado = getStatusCount(data && data.briefings_by_status, 'Aprovado');
                const pipeline = data && data.pipeline ? data.pipeline : {};

                const etapas = (data && data.oportunidades_by_etapa ? data.oportunidades_by_etapa : []).slice().sort((a, b) => (b.count || 0) - (a.count || 0));

                body.innerHTML = `
                    <div class="text-xs text-gray-500 mb-4">${scopeLabel}</div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div class="border rounded-lg p-4">
                            <div class="text-xs text-gray-500">Leads</div>
                            <div class="text-2xl font-semibold text-gray-800">${Number(k.leads_total || 0)}</div>
                            <div class="text-xs text-gray-600 mt-1">Ativos: ${Number(k.leads_ativos || 0)}</div>
                        </div>
                        <div class="border rounded-lg p-4">
                            <div class="text-xs text-gray-500">Contatos</div>
                            <div class="text-2xl font-semibold text-gray-800">${Number(k.contatos_total || 0)}</div>
                            <div class="text-xs text-gray-600 mt-1">Ativos: ${Number(k.contatos_ativos || 0)}</div>
                        </div>
                        <div class="border rounded-lg p-4">
                            <div class="text-xs text-gray-500">Clientes</div>
                            <div class="text-2xl font-semibold text-gray-800">${Number(k.clientes_total || 0)}</div>
                            <div class="text-xs text-gray-600 mt-1">Base cadastrada</div>
                        </div>
                        <div class="border rounded-lg p-4">
                            <div class="text-xs text-gray-500">Briefings</div>
                            <div class="text-2xl font-semibold text-gray-800">${Number(k.briefings_total || 0)}</div>
                            <div class="text-xs text-gray-600 mt-1">Análise: ${briefingsEmAnalise} • Andamento: ${briefingsEmAndamento} • Aprovado: ${briefingsAprovado}</div>
                        </div>
                        <div class="border rounded-lg p-4">
                            <div class="text-xs text-gray-500">Pipeline (Estimado)</div>
                            <div class="text-lg font-semibold text-gray-800">${money.format(Number(pipeline.valor_estimado_aberto || 0))}</div>
                            <div class="text-xs text-gray-600 mt-1">Fechamento: ${money.format(Number(pipeline.valor_estimado_fechamento || 0))}</div>
                            <div class="text-xs text-gray-600 mt-1">Ponderado: ${money.format(Number(pipeline.valor_estimado_ponderado || 0))}</div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                        <div class="lg:col-span-2 border rounded-lg overflow-hidden">
                            <div class="px-4 py-3 bg-gray-50 border-b">
                                <div class="text-sm font-semibold text-gray-800">Pipeline por Etapa</div>
                                <div class="text-xs text-gray-600 mt-1">Contratado: ${money.format(Number(pipeline.valor_contratado || 0))} • Fechamento ponderado: ${money.format(Number(pipeline.valor_estimado_ponderado || 0))}</div>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full">
                                    <thead class="bg-gray-50">
                                        <tr>
                                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Etapa</th>
                                            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qtd</th>
                                            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Estimado</th>
                                            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Contratado</th>
                                        </tr>
                                    </thead>
                                    <tbody class="bg-white divide-y divide-gray-200">
                                        ${etapas.map(e => `
                                            <tr>
                                                <td class="px-4 py-2 text-sm text-gray-900">${String(e.etapa || '')}</td>
                                                <td class="px-4 py-2 text-sm text-gray-900 text-right">${Number(e.count || 0)}</td>
                                                <td class="px-4 py-2 text-sm text-gray-900 text-right">${money.format(Number(e.valor_estimado || 0))}</td>
                                                <td class="px-4 py-2 text-sm text-gray-900 text-right">${money.format(Number(e.valor_contratado || 0))}</td>
                                            </tr>
                                        `).join('') || `<tr><td colspan="4" class="px-4 py-3 text-sm text-gray-500">Sem dados de pipeline.</td></tr>`}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div class="border rounded-lg overflow-hidden">
                            <div class="px-4 py-3 bg-gray-50 border-b">
                                <div class="text-sm font-semibold text-gray-800">Próximos Follow-ups</div>
                                <div class="text-xs text-gray-600 mt-1">Próximos 7 dias</div>
                            </div>
                            <div class="p-4 space-y-3">
                                ${(data && data.followups_proximos ? data.followups_proximos : []).map(l => `
                                    <div class="border rounded-lg p-3">
                                        <div class="text-sm font-medium text-gray-900">${l.nome || ('Lead #' + l.id)}</div>
                                        <div class="text-xs text-gray-600">${l.empresa || '—'} • ${l.status || '—'}</div>
                                        <div class="text-xs text-gray-700 mt-1">Contato: ${l.proximo_contato || '—'}</div>
                                    </div>
                                `).join('') || `<div class="text-sm text-gray-500">Nenhum follow-up próximo.</div>`}
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                        <div class="border rounded-lg overflow-hidden">
                            <div class="px-4 py-3 bg-gray-50 border-b">
                                <div class="text-sm font-semibold text-gray-800">Briefings por Status</div>
                            </div>
                            <div class="p-4">
                                <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    ${(data && data.briefings_by_status ? data.briefings_by_status : []).map(s => `
                                        <div class="border rounded-lg p-3">
                                            <div class="text-xs text-gray-500 truncate">${s.status || '—'}</div>
                                            <div class="text-lg font-semibold text-gray-900">${Number(s.count || 0)}</div>
                                        </div>
                                    `).join('') || `<div class="text-sm text-gray-500">Sem dados.</div>`}
                                </div>
                            </div>
                        </div>

                        <div class="border rounded-lg overflow-hidden">
                            <div class="px-4 py-3 bg-gray-50 border-b">
                                <div class="text-sm font-semibold text-gray-800">Briefings Recentes</div>
                            </div>
                            <div class="p-4 space-y-2">
                                ${(data && data.briefings_recentes ? data.briefings_recentes : []).map(b => `
                                    <div class="border rounded-lg p-3">
                                        <div class="text-sm font-medium text-gray-900">${b.empresa || '—'}</div>
                                        <div class="text-xs text-gray-600">${b.nome_evento || '—'} • ${b.status || '—'}</div>
                                    </div>
                                `).join('') || `<div class="text-sm text-gray-500">Sem briefings.</div>`}
                                <div class="text-xs text-gray-600 mt-2">
                                    Aguardando projeto: ${Number(k.briefings_aguardando_projeto || 0)} • Projetos aguardando distribuição: ${Number(k.projetos_aguardando_distribuicao || 0)}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            };

            const refresh = async () => {
                try {
                    body.innerHTML = `<div class="text-sm text-gray-500">Carregando...</div>`;
                    const data = await api('/api/comercial/dashboard');
                    render(data);
                } catch (e) {
                    body.innerHTML = `<div class="text-sm text-red-600">${e && e.message ? e.message : 'Erro ao carregar dashboard'}</div>`;
                }
            };

            if (btn) btn.addEventListener('click', () => refresh());
            refresh();
        },
        listDashboard() {
            return `
                <div class="bg-white rounded-lg shadow overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <div>
                            <div class="text-sm text-gray-500">Comercial</div>
                            <div class="text-lg font-semibold text-gray-800">Dashboard</div>
                        </div>
                        <div class="flex items-center gap-2">
                            <button id="comercialDashRefresh" class="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg text-sm">
                                <i class="fas fa-sync-alt mr-2"></i>Atualizar
                            </button>
                        </div>
                    </div>
                    <div id="comercialDashBody" class="p-6">
                        <div class="text-sm text-gray-500">Carregando...</div>
                    </div>
                </div>
            `;
        },
        initDashboard() {
            const body = document.getElementById('comercialDashBody');
            const btn = document.getElementById('comercialDashRefresh');
            if (!body) return;
            const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
            const api = async (url) => {
                const r = await fetch(url, { credentials: 'include' });
                const j = await r.json().catch(() => null);
                if (!r.ok) throw new Error((j && j.error) ? j.error : 'Falha na API');
                return j;
            };
            const sumBy = (arr, key) => (arr || []).reduce((acc, x) => acc + (Number(x && x[key]) || 0), 0);
            const render = (data) => {
                const k = data && data.kpis ? data.kpis : {};
                const pipeline = data && data.pipeline ? data.pipeline : {};
                const etapas = (data && data.oportunidades_by_etapa ? data.oportunidades_by_etapa : []).slice().sort((a, b) => (b.count || 0) - (a.count || 0));
                body.innerHTML = `
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                        <div class="border rounded-lg p-4">
                            <div class="text-xs text-gray-500">Leads</div>
                            <div class="text-2xl font-semibold text-gray-800">${Number(k.leads_total || 0)}</div>
                            <div class="text-xs text-gray-600 mt-1">Ativos: ${Number(k.leads_ativos || 0)}</div>
                        </div>
                        <div class="border rounded-lg p-4">
                            <div class="text-xs text-gray-500">Contatos</div>
                            <div class="text-2xl font-semibold text-gray-800">${Number(k.contatos_total || 0)}</div>
                            <div class="text-xs text-gray-600 mt-1">Ativos: ${Number(k.contatos_ativos || 0)}</div>
                        </div>
                        <div class="border rounded-lg p-4">
                            <div class="text-xs text-gray-500">Clientes</div>
                            <div class="text-2xl font-semibold text-gray-800">${Number(k.clientes_total || 0)}</div>
                            <div class="text-xs text-gray-600 mt-1">Base cadastrada</div>
                        </div>
                        <div class="border rounded-lg p-4">
                            <div class="text-xs text-gray-500">Briefings</div>
                            <div class="text-2xl font-semibold text-gray-800">${Number(k.briefings_total || 0)}</div>
                            <div class="text-xs text-gray-600 mt-1">Aguardando projeto: ${Number(k.briefings_aguardando_projeto || 0)}</div>
                        </div>
                        <div class="border rounded-lg p-4">
                            <div class="text-xs text-gray-500">Projetos</div>
                            <div class="text-2xl font-semibold text-gray-800">${Number(sumBy(data && data.projetos_by_status, 'count') || 0)}</div>
                            <div class="text-xs text-gray-600 mt-1">Aguardando distribuição: ${Number(k.projetos_aguardando_distribuicao || 0)}</div>
                        </div>
                        <div class="border rounded-lg p-4">
                            <div class="text-xs text-gray-500">Pipeline (Fechamento)</div>
                            <div class="text-lg font-semibold text-gray-800">${money.format(Number(pipeline.valor_estimado_fechamento || 0))}</div>
                            <div class="text-xs text-gray-600 mt-1">Aberto: ${money.format(Number(pipeline.valor_estimado_aberto || 0))}</div>
                            <div class="text-xs text-gray-600 mt-1">Ponderado: ${money.format(Number(pipeline.valor_estimado_ponderado || 0))}</div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                        <div class="lg:col-span-2 border rounded-lg overflow-hidden">
                            <div class="px-4 py-3 bg-gray-50 border-b">
                                <div class="text-sm font-semibold text-gray-800">Pipeline por Etapa</div>
                                <div class="text-xs text-gray-600 mt-1">Contratado: ${money.format(Number(pipeline.valor_contratado || 0))}</div>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full">
                                    <thead class="bg-gray-50">
                                        <tr>
                                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Etapa</th>
                                            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qtd</th>
                                            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Estimado</th>
                                            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Contratado</th>
                                        </tr>
                                    </thead>
                                    <tbody class="bg-white divide-y divide-gray-200">
                                        ${etapas.map(e => `
                                            <tr>
                                                <td class="px-4 py-2 text-sm text-gray-900">${String(e.etapa || '')}</td>
                                                <td class="px-4 py-2 text-sm text-gray-900 text-right">${Number(e.count || 0)}</td>
                                                <td class="px-4 py-2 text-sm text-gray-900 text-right">${money.format(Number(e.valor_estimado || 0))}</td>
                                                <td class="px-4 py-2 text-sm text-gray-900 text-right">${money.format(Number(e.valor_contratado || 0))}</td>
                                            </tr>
                                        `).join('') || `<tr><td colspan="4" class="px-4 py-3 text-sm text-gray-500">Sem dados.</td></tr>`}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="border rounded-lg overflow-hidden">
                            <div class="px-4 py-3 bg-gray-50 border-b">
                                <div class="text-sm font-semibold text-gray-800">Briefings por Status</div>
                            </div>
                            <div class="p-4">
                                <div class="grid grid-cols-2 gap-2">
                                    ${(data && data.briefings_by_status ? data.briefings_by_status : []).map(s => `
                                        <div class="border rounded-lg p-3">
                                            <div class="text-xs text-gray-500 truncate">${s.status || '—'}</div>
                                            <div class="text-lg font-semibold text-gray-900">${Number(s.count || 0)}</div>
                                        </div>
                                    `).join('') || `<div class="text-sm text-gray-500">Sem dados.</div>`}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            };
            const refresh = async () => {
                try {
                    body.innerHTML = `<div class="text-sm text-gray-500">Carregando...</div>`;
                    const data = await api('/api/comercial/dashboard');
                    render(data);
                } catch (e) {
                    body.innerHTML = `<div class="text-sm text-red-600">${e && e.message ? e.message : 'Erro ao carregar'}</div>`;
                }
            };
            if (btn) btn.addEventListener('click', () => refresh());
            refresh();
        },
        listContratos() {
            return `
                <div class="bg-white rounded-lg shadow overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <div>
                            <div class="text-sm text-gray-500">Comercial</div>
                            <div class="text-lg font-semibold text-gray-800">Contratos</div>
                        </div>
                        <div class="flex items-center gap-2">
                            <button id="contratosRefresh" class="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg text-sm">
                                <i class="fas fa-sync-alt mr-2"></i>Atualizar
                            </button>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsável</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assinatura</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="contratosBody" class="bg-white divide-y divide-gray-200">
                                <tr><td colspan="6" class="px-6 py-4 text-sm text-gray-500">Carregando...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        },
        initContratos() {
            const body = document.getElementById('contratosBody');
            const btn = document.getElementById('contratosRefresh');
            const api = async (url) => {
                const r = await fetch(url, { credentials: 'include' });
                const j = await r.json().catch(() => null);
                if (!r.ok) throw new Error((j && j.error) ? j.error : 'Falha na API');
                return j;
            };
            const refresh = async () => {
                try {
                    const rows = await api('/api/crm/contratos');
                    body.innerHTML = (rows || []).map(c => `
                        <tr class="hover:bg-gray-50">
                            <td class="px-6 py-4 text-sm text-gray-900">${c.numero || '-'}</td>
                            <td class="px-6 py-4 text-sm text-gray-900">${c.titulo || '-'}</td>
                            <td class="px-6 py-4 text-sm text-gray-900">${c.status || '-'}</td>
                            <td class="px-6 py-4 text-sm text-gray-900">${c.responsavel_nome || '-'}</td>
                            <td class="px-6 py-4 text-sm text-gray-900">${c.data_assinatura || '-'}</td>
                            <td class="px-6 py-4 text-sm font-medium space-x-2">
                                <button data-action="read" data-module="contratos" data-id="${c.id}" class="text-blue-600 hover:text-blue-900"><i class="fas fa-eye"></i></button>
                                <button data-action="update" data-module="contratos" data-id="${c.id}" class="text-green-600 hover:text-green-900"><i class="fas fa-edit"></i></button>
                                <button data-action="delete" data-module="contratos" data-id="${c.id}" class="text-red-600 hover:text-red-900"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `).join('') || `<tr><td colspan="6" class="px-6 py-4 text-sm text-gray-500">Nenhum contrato encontrado.</td></tr>`;
                } catch (e) {
                    body.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-sm text-red-600">${e && e.message ? e.message : 'Erro ao listar'}</td></tr>`;
                }
            };
            if (btn) btn.addEventListener('click', () => refresh());
            refresh();
        },
        listPipeline() {
            return `
                <div class="bg-white rounded-lg shadow overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <div>
                            <div class="text-sm text-gray-500">Pipeline Comercial</div>
                            <div class="text-lg font-semibold text-gray-800">Visão Kanban</div>
                        </div>
                        <div class="flex items-center gap-2">
                            <select id="pipeline-filter-resp" class="border rounded-lg px-3 py-2 text-sm">
                                <option value="">Todos os responsáveis</option>
                            </select>
                            <select id="pipeline-filter-evento" class="border rounded-lg px-3 py-2 text-sm">
                                <option value="">Todos os eventos</option>
                            </select>
                            <button id="pipeline-refresh" class="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg transition duration-300 text-sm">
                                <i class="fas fa-sync-alt mr-2"></i>Atualizar
                            </button>
                        </div>
                    </div>
                    <div id="pipeline-board" class="p-4 overflow-x-auto">
                        <div class="text-gray-500 text-sm">Carregando pipeline...</div>
                    </div>
                </div>
            `;
        },
        initPipeline(root) {
            const board = document.getElementById('pipeline-board');
            const selResp = document.getElementById('pipeline-filter-resp');
            const selEvento = document.getElementById('pipeline-filter-evento');
            const btnRefresh = document.getElementById('pipeline-refresh');
            const etapas = [
                { key: 'novo_lead', label: 'Novo Cliente' },
                { key: 'em_contato', label: 'Em Contato' },
                { key: 'briefing_recebido', label: 'Briefing Recebido' },
                { key: 'projeto_em_andamento', label: 'Projeto em Andamento' },
                { key: 'negociacao', label: 'Negociação' },
                { key: 'contrato_assinado', label: 'Contrato Assinado' },
                { key: 'em_producao', label: 'Em Produção' },
                { key: 'em_montagem', label: 'Em Montagem' },
                { key: 'concluido', label: 'Concluído' },
                { key: 'perdido', label: 'Perdido' }
            ];
            const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
            const api = async (url, opt = {}) => {
                const r = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opt });
                const j = await r.json().catch(() => null);
                if (!r.ok) throw new Error((j && j.error) ? j.error : 'Falha na API');
                return j;
            };
            const loadUsers = async () => {
                const rows = await api('/api/crm/users');
                selResp.innerHTML = `<option value="">Todos os responsáveis</option>` + rows.map(u => `<option value="${u.id}">${u.name || u.email || u.id}</option>`).join('');
            };
            const loadEventos = async () => {
                const rows = await api('/api/crm/eventos');
                selEvento.innerHTML = `<option value="">Todos os eventos</option>` + rows.map(e => `<option value="${e.id}">${e.nome || e.id}</option>`).join('');
            };
            const render = (ops) => {
                const by = new Map(etapas.map(e => [e.key, []]));
                for (const op of ops || []) {
                    let k = String(op.etapa || 'novo_lead');
                    if (k === 'proposta_enviada') k = 'negociacao';
                    if (!by.has(k)) by.set(k, []);
                    by.get(k).push(op);
                }
                const colHtml = etapas.map(e => {
                    const items = by.get(e.key) || [];
                    const total = items.reduce((acc, x) => acc + (Number(x.valor_estimado) || 0), 0);
                    return `
                        <div class="min-w-[280px] w-80 bg-gray-50 border rounded-lg mr-3" data-drop-col="1" data-etapa="${e.key}">
                            <div class="px-3 py-2 border-b flex items-center justify-between">
                                <div>
                                    <div class="text-sm font-semibold text-gray-800">${e.label}</div>
                                    <div class="text-xs text-gray-500">${e.key}</div>
                                </div>
                                <div class="text-right">
                                    <div class="text-xs text-gray-700">${items.length} cards</div>
                                    <div class="text-xs text-gray-700">${money.format(total)}</div>
                                </div>
                            </div>
                            <div class="p-3 space-y-2" data-drop-list="1">
                                ${items.map(op => `
                                    <div class="border rounded-lg p-2 bg-white cursor-move" draggable="true" data-op-id="${op.id}">
                                        <div class="flex items-start justify-between gap-2">
                                            <div class="min-w-0">
                                                <div class="text-sm font-medium text-gray-900 truncate">${op.lead_nome || ('Lead #' + op.lead_id)}</div>
                                                <div class="text-xs text-gray-600 truncate">${op.lead_segmento || '—'}</div>
                                            </div>
                                            <div class="text-xs px-2 py-1 rounded border bg-gray-50">${op.responsavel_nome || '—'}</div>
                                        </div>
                                        <div class="mt-1 text-xs text-gray-700 flex items-center gap-2">
                                            ${op.valor_estimado ? `<span class="px-2 py-0.5 bg-gray-100 rounded">${money.format(Number(op.valor_estimado) || 0)}</span>` : ''}
                                            ${op.evento_nome ? `<span class="px-2 py-0.5 bg-gray-100 rounded">${op.evento_nome}</span>` : ''}
                                        </div>
                                    </div>
                                `).join('') || `<div class="text-xs text-gray-500">Arraste cards aqui</div>`}
                            </div>
                        </div>
                    `;
                }).join('');
                board.innerHTML = `<div class="flex items-start">${colHtml}</div>`;
                board.querySelectorAll('[draggable="true"]').forEach(card => {
                    card.addEventListener('dragstart', (e) => {
                        e.dataTransfer.setData('text/plain', card.getAttribute('data-op-id') || '');
                    });
                });
                board.querySelectorAll('[data-drop-list="1"]').forEach(list => {
                    list.addEventListener('dragover', (e) => e.preventDefault());
                    list.addEventListener('drop', async (e) => {
                        e.preventDefault();
                        const opId = e.dataTransfer.getData('text/plain');
                        const col = list.closest('[data-etapa]');
                        const etapa = col ? col.getAttribute('data-etapa') : '';
                        if (!opId || !etapa) return;
                        try {
                            await api(`/api/crm/oportunidades/${encodeURIComponent(opId)}/etapa`, { method: 'PATCH', body: JSON.stringify({ etapa }) });
                            await refresh();
                        } catch {}
                    });
                });
            };
            const loadOps = async () => {
                const qs = new URLSearchParams();
                if (selResp.value) qs.set('responsavel_id', selResp.value);
                if (selEvento.value) qs.set('evento_id', selEvento.value);
                return await api('/api/crm/oportunidades' + (qs.toString() ? ('?' + qs.toString()) : ''));
            };
            const refresh = async () => {
                try {
                    const ops = await loadOps();
                    render(ops);
                } catch (e) {
                    board.innerHTML = `<div class="text-red-600 text-sm">${e && e.message ? e.message : 'Falha ao carregar'}</div>`;
                }
            };
            if (btnRefresh) btnRefresh.addEventListener('click', () => refresh());
            Promise.all([loadUsers(), loadEventos()]).then(() => refresh());
        },
        // Listar clientes
        listClientes() {
            const clientes = Array.isArray(ModuleSystem.data.clientes) ? ModuleSystem.data.clientes : [];
            return `
                <div class="mb-6">
                    <div class="flex justify-between items-center">
                        <div class="flex space-x-3">
                            <button type="button" data-nav-module="dashboard"
                                    class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-300">
                                <i class="fas fa-home mr-2"></i>Dashboard
                            </button>
                            <button type="button" data-nav-module="comercial"
                                    class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-300">
                                <i class="fas fa-arrow-left mr-2"></i>Voltar ao Comercial
                            </button>
                        </div>
                    </div>
                </div>
                
                <div id="clientes-list-container" class="bg-white rounded-lg shadow">
                    <div class="p-6 border-b border-gray-200">
                        <div class="flex flex-wrap justify-between items-center gap-3">
                            <h3 class="text-lg font-semibold text-gray-800">Lista de Clientes</h3>
                            <div class="flex flex-wrap items-center gap-2 ml-auto">
                                <div class="relative">
                                    <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                                    <input id="clientes-filter-q" type="text" placeholder="Buscar por nome, e-mail, documento..."
                                           class="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                           style="min-width:240px" />
                                </div>
                                <select id="clientes-filter-status" class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    <option value="">Todos os status</option>
                                    <option value="ativo">Ativo</option>
                                    <option value="inativo">Inativo</option>
                                    <option value="prospect">Prospect</option>
                                </select>
                                <button id="clientes-filter-clear" type="button" class="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                                    <i class="fas fa-times mr-1"></i>Limpar
                                </button>
                                <button data-action="create" data-module="clientes" 
                                        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-300 text-sm">
                                    <i class="fas fa-plus mr-2"></i>Novo Cliente
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="clientes-list-body" class="bg-white divide-y divide-gray-200">
                                ${clientes.map(cliente => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="text-sm font-medium text-gray-900">${cliente.nome}</div>
                                            <div class="text-sm text-gray-500">${cliente.email}</div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${cliente.documento || cliente.cnpj || '—'}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${cliente.telefone || '—'}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="flex items-center gap-2">
                                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${UIHelpers.computeStatusClass(cliente.status)}">${cliente.status || '—'}</span>
                                                ${UIHelpers.renderSegmentBadge(cliente.segmento || cliente.categoria || cliente.setor)}
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            <button data-action="read" data-module="clientes" data-id="${cliente.id}"
                                                    class="text-blue-600 hover:text-blue-900"
                                                    title="Visualizar cliente"
                                                    aria-label="Visualizar detalhes do cliente ${cliente.nome}">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            <button data-action="update" data-module="clientes" data-id="${cliente.id}"
                                                    class="text-green-600 hover:text-green-900"
                                                    title="Editar cliente"
                                                    aria-label="Editar cliente ${cliente.nome}">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button data-action="delete" data-module="clientes" data-id="${cliente.id}"
                                                    class="text-red-600 hover:text-red-900"
                                                    title="Excluir cliente"
                                                    aria-label="Excluir cliente ${cliente.nome}">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        },

        // Listar eventos
        listEventos() {
            const eventos = Array.isArray(ModuleSystem.data.eventos) ? ModuleSystem.data.eventos : [];
            return `
                <div id="eventos-list-container" class="bg-white rounded-lg shadow">
                    <div class="p-6 border-b border-gray-200">
                        <div class="flex justify-between items-center">
                            <h3 class="text-lg font-semibold text-gray-800">Lista de Eventos</h3>
                            <div class="flex items-center gap-3">
                                <button data-action="scan" data-module="eventos"
                                        class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition duration-300">
                                    <i class="fas fa-search mr-2"></i>Varredura gov.br
                                </button>
                                <button data-action="import" data-module="eventos"
                                        class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition duration-300">
                                    <i class="fas fa-globe mr-2"></i>Importar de URL
                                </button>
                                <button data-action="create" data-module="eventos" 
                                        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-300">
                                    <i class="fas fa-plus mr-2"></i>Novo Evento
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="p-4 border-b border-gray-200 bg-white">
                        <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            <div class="md:col-span-3">
                                <label for="eventos-filter-q" class="block text-xs font-medium text-gray-600 mb-1">Busca</label>
                                <input id="eventos-filter-q" type="text" placeholder="Nome, local, organizadora..."
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            </div>
                            <div class="md:col-span-2">
                                <label for="eventos-filter-from" class="block text-xs font-medium text-gray-600 mb-1">Data (de)</label>
                                <input id="eventos-filter-from" type="date"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            </div>
                            <div class="md:col-span-2">
                                <label for="eventos-filter-to" class="block text-xs font-medium text-gray-600 mb-1">Data (até)</label>
                                <input id="eventos-filter-to" type="date"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            </div>
                            <div class="md:col-span-2">
                                <label for="eventos-filter-uf" class="block text-xs font-medium text-gray-600 mb-1">UF</label>
                                <select id="eventos-filter-uf"
                                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    <option value="">Todas</option>
                                </select>
                            </div>
                            <div class="md:col-span-2">
                                <label for="eventos-filter-status" class="block text-xs font-medium text-gray-600 mb-1">Status</label>
                                <select id="eventos-filter-status"
                                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    <option value="">Todos</option>
                                </select>
                            </div>
                            <div class="md:col-span-1 flex gap-2">
                                <button type="button" id="eventos-filter-clear"
                                        class="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition duration-300"
                                        title="Limpar filtros" aria-label="Limpar filtros">
                                    Limpar
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Local</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="eventos-list-body" class="bg-white divide-y divide-gray-200">
                                ${eventos.map(evento => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="text-sm font-medium text-gray-900">${evento.nome}</div>
                                            <div class="text-sm text-gray-500">${evento.organizadora}</div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="text-sm text-gray-900">${evento.local}</div>
                                            <div class="text-sm text-gray-500">${evento.endereco}</div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ${evento.dataInicio} a ${evento.dataFim}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${evento.status === 'Confirmado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                                                ${evento.status}
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button data-action="read" data-module="eventos" data-id="${evento.id}"
                                    class="text-blue-600 hover:text-blue-900"
                                    title="Visualizar evento"
                                    aria-label="Visualizar detalhes do evento ${evento.nome}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button data-action="update" data-module="eventos" data-id="${evento.id}"
                                    class="text-green-600 hover:text-green-900"
                                    title="Editar evento"
                                    aria-label="Editar evento ${evento.nome}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button data-action="delete" data-module="eventos" data-id="${evento.id}"
                                    class="text-red-600 hover:text-red-900"
                                    title="Excluir evento"
                                    aria-label="Excluir evento ${evento.nome}">
                                <i class="fas fa-trash"></i>
                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        },

        // Listar briefings
        listBriefings() {
            const briefings = ModuleSystem.data.briefings || [];
            const eventos = ModuleSystem.data.eventos || [];
            const computeCode = (b) => {
                const idNum = b && b.id != null ? Number(b.id) : null;
                const idStr = Number.isFinite(idNum) ? String(Math.trunc(idNum)).padStart(4, '0') : (b && b.id != null ? String(b.id) : '');
                let year = null;
                try {
                    const d = b && (b.created_at || b.createdAt) ? new Date(b.created_at || b.createdAt) : null;
                    if (d && !isNaN(d.getTime())) year = d.getFullYear();
                } catch {}
                if (!year) year = new Date().getFullYear();
                return idStr ? `BRF ${idStr}/${year}` : `BRF/${year}`;
            };

            const getEventoNome = (briefing) => {
                if (briefing && briefing.nomeEvento) return briefing.nomeEvento;
                if (briefing && briefing.evento) return briefing.evento;
                if (briefing && briefing.eventoId != null) {
                    const evento = eventos.find(e => e.id == briefing.eventoId);
                    if (evento && evento.nome) return evento.nome;
                }
                return 'N/A';
            };

            const formatCurrencyBR = (value) => {
                try {
                    const n = typeof value === 'string' ? parseFloat(value) : Number(value);
                    if (!isFinite(n)) return 'N/A';
                    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                } catch {
                    return 'N/A';
                }
            };

            return `
                <div id="briefings-list-container" class="bg-white rounded-lg shadow">
                    <div class="p-6 border-b border-gray-200">
                        <div class="flex justify-between items-center">
                            <h3 class="text-lg font-semibold text-gray-800">Orçamento Inteligente (Briefings)</h3>
                            <button data-action="create" data-module="briefings" 
                                    class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-300">
                                <i class="fas fa-plus mr-2"></i>Novo Briefing
                            </button>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <div class="p-4 border-b border-gray-200 bg-white">
                            <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                <div class="md:col-span-6">
                                    <label for="briefings-filter-q" class="block text-xs font-medium text-gray-600 mb-1">Busca</label>
                                    <input id="briefings-filter-q" type="text" placeholder="Código (BRF 0001/2026), empresa, evento..."
                                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                </div>
                                <div class="md:col-span-2">
                                    <label for="briefings-filter-status" class="block text-xs font-medium text-gray-600 mb-1">Status</label>
                                    <select id="briefings-filter-status"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                        <option value="">Todos</option>
                                        ${Array.from(new Set(briefings.map(b => b && b.status != null ? String(b.status).trim() : '').filter(Boolean))).sort((a,b)=>a.localeCompare(b,'pt-BR')).map(s=>`<option value="${s}">${s}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="md:col-span-2 flex gap-2">
                                    <button type="button" id="briefings-filter-clear"
                                            class="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition duration-300"
                                            title="Limpar filtros" aria-label="Limpar filtros">
                                        Limpar
                                    </button>
                                </div>
                            </div>
                        </div>
                        <table class="w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Evento</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Solução</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orçamento</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="briefings-list-body" class="bg-white divide-y divide-gray-200">
                                ${briefings.map(briefing => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${computeCode(briefing)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${getEventoNome(briefing)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${briefing.empresa || 'N/A'}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${briefing.tipoSolucao || '—'}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ${briefing.orcamentoEstimado ? formatCurrencyBR(briefing.orcamentoEstimado) : (briefing.orcamentoSugerido ? formatCurrencyBR(briefing.orcamentoSugerido) : (briefing.orcamento ? formatCurrencyBR(briefing.orcamento) : 'N/A'))}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${UIHelpers.computeStatusClass(briefing.status)}">
                                                ${briefing.status}
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            <button data-action="read" data-module="briefings" data-id="${briefing.id}" class="text-blue-600 hover:text-blue-900" title="Visualizar"><i class="fas fa-eye"></i></button>
                                            <button data-action="update" data-module="briefings" data-id="${briefing.id}" class="text-green-600 hover:text-green-900" title="Editar"><i class="fas fa-edit"></i></button>
                                            <button type="button" onclick="(async()=>{try{const r=await fetch('/api/crm/briefings/${briefing.id}/generate-html',{method:'POST',credentials:'include'});const t=await r.text(); if(!r.ok) throw new Error('Falha ao gerar HTML'); const w=window.open('about:blank'); if(w){w.document.open(); w.document.write(t); w.document.close();} else {alert('Pop-up bloqueado');} if(window.ComercialModule && typeof ComercialModule.loadBriefings==='function'){await ComercialModule.loadBriefings();}}catch(e){alert(e&&e.message?e.message:'Falha ao gerar documento');}})()" class="text-purple-600 hover:text-purple-900" title="Gerar Documento"><i class="fas fa-file-export"></i></button>
                                            <button type="button" onclick="(async()=>{try{window.open('/api/crm/briefings/${briefing.id}/download-html','_blank');}catch{}})()" class="text-indigo-600 hover:text-indigo-900" title="Baixar HTML"><i class="fas fa-download"></i></button>
                                            <button type="button" onclick="(async()=>{try{if(!confirm('Duplicar este briefing como nova versão?')) return; const r=await fetch('/api/crm/briefings/${briefing.id}/duplicar',{method:'POST',credentials:'include'}); const j=await r.json().catch(()=>null); if(!r.ok){alert((j&&j.error)?j.error:'Falha ao duplicar briefing'); return;} if(window.ComercialModule && typeof ComercialModule.loadBriefings==='function'){await ComercialModule.loadBriefings();} else {location.reload();}}catch{alert('Falha ao duplicar briefing');}})()" class="text-gray-700 hover:text-gray-900" title="Duplicar Versão"><i class="fas fa-copy"></i></button>
                                            <button data-action="delete" data-module="briefings" data-id="${briefing.id}" class="text-red-600 hover:text-red-900" title="Excluir"><i class="fas fa-trash"></i></button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    },

    // Módulo Kanban
    kanban: {
        // Renderizar board Kanban
        renderBoard() {
            return `
                <div id="kanban-board">
                    <!-- O conteúdo será renderizado pelo KanbanSystem -->
                </div>
            `;
        }
    },

    dashboard: {
        ensureKanbanData() {
            if (!ModuleSystem.data) return;
            if (!ModuleSystem.data.kanban) ModuleSystem.data.kanban = { boards: [], tasks: [] };
            if (!Array.isArray(ModuleSystem.data.kanban.boards)) ModuleSystem.data.kanban.boards = [];
            if (!Array.isArray(ModuleSystem.data.kanban.tasks)) ModuleSystem.data.kanban.tasks = [];
        },

        toLocalYmd(d) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        },

        parseYmdToDate(ymd) {
            const s = String(ymd || '').trim();
            const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (!m) return null;
            const y = parseInt(m[1], 10);
            const mo = parseInt(m[2], 10);
            const da = parseInt(m[3], 10);
            const dt = new Date(y, mo - 1, da);
            if (Number.isNaN(dt.getTime())) return null;
            return dt;
        },

        escapeHtml(v) {
            return String(v ?? '')
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
                .replaceAll("'", '&#39;');
        },

        openTarefaAdminModal(id) {
            const taskId = id != null ? String(id).trim() : '';
            if (!taskId) return;
            if (!window.FormSystem || typeof FormSystem.openModal !== 'function') return;

            const api = async (url, opt = {}) => {
                const r = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opt });
                const j = await r.json().catch(() => null);
                if (!r.ok) throw new Error((j && j.error) ? j.error : 'Falha na API');
                return j;
            };

            const escapeHtml = (s) => this.escapeHtml(s);

            const build = async () => {
                const [t, users] = await Promise.all([
                    api('/api/tarefas-admin/' + encodeURIComponent(taskId)),
                    api('/api/crm/users').catch(() => [])
                ]);

                const roleNorm = (u) => {
                    const r = u && (u.role || u.perfil || u.cargo) != null ? String(u.role || u.perfil || u.cargo).trim().toLowerCase() : '';
                    return r;
                };
                const candidates = Array.isArray(users) ? users.filter(u => {
                    const r = roleNorm(u);
                    return r !== '';
                }) : [];
                const userOptions = ['<option value="">(Sem responsável)</option>'].concat(
                    candidates.map(u => `<option value="${escapeHtml(u.id)}">${escapeHtml(u.name || u.email || ('Usuário #' + u.id))}</option>`)
                ).join('');

                const title = `Tarefa #${escapeHtml(t.id)}`;
                const content = `
                    <form id="agendaTarefaAdminForm" class="space-y-4" data-id="${escapeHtml(t.id)}">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Título *</label>
                                <input name="titulo" required value="${escapeHtml(t.titulo || '')}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                                <input name="tipo" value="${escapeHtml(t.tipo || '')}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                            <textarea name="descricao" rows="4"
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">${escapeHtml(t.descricao || '')}</textarea>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <select name="status" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    <option value="backlog">Backlog</option>
                                    <option value="todo">A Fazer</option>
                                    <option value="doing">Em Andamento</option>
                                    <option value="review">Revisão</option>
                                    <option value="done">Concluída</option>
                                    <option value="cancelled">Cancelada</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Prioridade</label>
                                <select name="prioridade" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    <option value="baixa">Baixa</option>
                                    <option value="media">Média</option>
                                    <option value="alta">Alta</option>
                                    <option value="critica">Crítica</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Responsável</label>
                                <select name="responsavel_id" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    ${userOptions}
                                </select>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Data início</label>
                                <input name="data_inicio" type="date" value="${escapeHtml(String(t.data_inicio || '').slice(0, 10))}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Prazo</label>
                                <input name="data_vencimento" type="date" value="${escapeHtml(String(t.data_vencimento || '').slice(0, 10))}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                        </div>

                        <div class="flex justify-end gap-3 pt-2">
                            <button type="button" id="agendaTarefaAdminDelete" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition duration-300">
                                Excluir
                            </button>
                            <button type="button" data-close-modal class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-300">
                                Fechar
                            </button>
                            <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-300">
                                Salvar
                            </button>
                        </div>
                    </form>
                `;

                FormSystem.openModal(title, content);

                const form = document.getElementById('agendaTarefaAdminForm');
                if (!form) return;
                try { form.querySelector('select[name="status"]').value = String(t.status || 'todo'); } catch {}
                try { form.querySelector('select[name="prioridade"]').value = String(t.prioridade || 'media'); } catch {}
                try { form.querySelector('select[name="responsavel_id"]').value = t.responsavel_id != null ? String(t.responsavel_id) : ''; } catch {}

                const delBtn = document.getElementById('agendaTarefaAdminDelete');
                if (delBtn) {
                    delBtn.addEventListener('click', async () => {
                        if (!confirm('Excluir esta tarefa?')) return;
                        delBtn.disabled = true;
                        try {
                            await api('/api/tarefas-admin/' + encodeURIComponent(taskId), { method: 'DELETE' });
                            try { FormSystem.closeModal(); } catch {}
                            try { this.refreshTarefasAdminApi(true); } catch {}
                            try { this.renderAgendaKanban(); } catch {}
                        } catch (e) {
                            delBtn.disabled = false;
                            if (window.Toast) window.Toast.show(e && e.message ? e.message : 'Falha ao excluir', 'error');
                        }
                    });
                }

                form.addEventListener('submit', async (ev) => {
                    ev.preventDefault();
                    const fd = new FormData(form);
                    const payload = {
                        titulo: String(fd.get('titulo') || '').trim(),
                        tipo: String(fd.get('tipo') || '').trim(),
                        descricao: String(fd.get('descricao') || '').trim(),
                        status: String(fd.get('status') || 'todo'),
                        prioridade: String(fd.get('prioridade') || 'media'),
                        responsavel_id: fd.get('responsavel_id') ? Number(fd.get('responsavel_id')) : null,
                        data_inicio: fd.get('data_inicio') ? String(fd.get('data_inicio')) : null,
                        data_vencimento: fd.get('data_vencimento') ? String(fd.get('data_vencimento')) : null
                    };
                    try {
                        await api('/api/tarefas-admin/' + encodeURIComponent(taskId), { method: 'PUT', body: JSON.stringify(payload) });
                        try { FormSystem.closeModal(); } catch {}
                        try { this.refreshTarefasAdminApi(true); } catch {}
                        try { this.renderAgendaKanban(); } catch {}
                        if (window.Toast) window.Toast.show('Tarefa atualizada.', 'success');
                    } catch (e) {
                        if (window.Toast) window.Toast.show(e && e.message ? e.message : 'Falha ao salvar', 'error');
                    }
                }, { once: true });
            };

            build().catch((e) => {
                if (window.Toast) window.Toast.show(e && e.message ? e.message : 'Falha ao abrir tarefa', 'error');
            });
        },

        collectAgendaItems() {
            const items = [];
            const now = new Date();
            const todayYmd = this.toLocalYmd(now);
            const normalize = (v) => (v != null ? String(v).trim().toLowerCase() : '');
            const current =
                (window.AuthSystem && typeof window.AuthSystem.getCurrentUser === 'function')
                    ? (window.AuthSystem.getCurrentUser() || null)
                    : ((window.AuthSystem && window.AuthSystem.currentUser) ? window.AuthSystem.currentUser : null);
            const currentId = current && current.id != null ? String(current.id) : '';
            const currentName = normalize(current && current.name != null ? current.name : '');
            const currentEmail = normalize(current && current.email != null ? current.email : '');
            const isKanbanTaskForUser = (t) => {
                if (!current) return true;
                if (!t) return false;
                const respId = t.responsavelId != null ? String(t.responsavelId) : '';
                if (currentId && respId && respId === currentId) return true;
                const respName = normalize(t.responsavel != null ? t.responsavel : '');
                if (respName && ((currentName && respName === currentName) || (currentEmail && respName === currentEmail))) return true;

                const envolvIds = Array.isArray(t.envolvidosIds) ? t.envolvidosIds.map(x => String(x)) : [];
                if (currentId && envolvIds.includes(currentId)) return true;

                const envolvNames = []
                    .concat(Array.isArray(t.envolvidos) ? t.envolvidos : [])
                    .concat(Array.isArray(t.envolvidosExtras) ? t.envolvidosExtras : []);
                if (envolvNames.length) {
                    for (const n of envolvNames) {
                        const nn = normalize(n);
                        if (!nn) continue;
                        if ((currentName && nn === currentName) || (currentEmail && nn === currentEmail)) return true;
                    }
                }
                return false;
            };
            const addItem = (it) => {
                if (!it || !it.title) return;
                const key = `${String(it.kind)}:${String(it.id)}`;
                if (!this._agendaDedup) this._agendaDedup = new Set();
                if (this._agendaDedup.has(key)) return;
                this._agendaDedup.add(key);
                items.push({
                    kind: it.kind,
                    module: it.module,
                    id: it.id,
                    title: String(it.title),
                    dueYmd: it.dueYmd ? String(it.dueYmd) : null,
                    status: it.status ? String(it.status) : null,
                    responsavel: it.responsavel ? String(it.responsavel) : null,
                    tarefasAdminId: it.tarefasAdminId != null ? String(it.tarefasAdminId) : null,
                    todayYmd
                });
            };

            try { this._agendaDedup = new Set(); } catch {}

            this.ensureKanbanData();
            const kanbanTasks = ModuleSystem.data.kanban?.tasks || [];
            const kanbanLinkedAdminIds = new Set(
                (kanbanTasks || [])
                    .map(t => (t && t.tarefasAdminId != null ? String(t.tarefasAdminId).trim() : ''))
                    .filter(Boolean)
            );
            for (const t of kanbanTasks) {
                if (!t) continue;
                const st = String(t.status || '').toLowerCase();
                if (st === 'done' || st === 'concluido' || st === 'concluida') continue;
                if (!isKanbanTaskForUser(t)) continue;
                addItem({
                    kind: 'kanban',
                    module: 'kanban',
                    id: t.id,
                    title: t.titulo || 'Tarefa',
                    dueYmd: t.dataVencimento || null,
                    status: t.status || null,
                    responsavel: t.responsavel || null,
                    tarefasAdminId: t.tarefasAdminId != null ? t.tarefasAdminId : null
                });
            }

            const tarefas = ModuleSystem.data.tarefasAdmin || [];
            for (const t of tarefas) {
                if (!t) continue;
                const st = String(t.status || '').toLowerCase();
                if (st.includes('conclu')) continue;
                if (!isKanbanTaskForUser(t)) continue;
                const tid = t.id != null ? String(t.id).trim() : '';
                if (tid && kanbanLinkedAdminIds.has(tid)) continue;
                addItem({
                    kind: 'tarefasAdmin',
                    module: 'tarefasAdmin',
                    id: t.id,
                    title: t.titulo || 'Tarefa administrativa',
                    dueYmd: t.prazo ? String(t.prazo).slice(0, 10) : null,
                    status: t.status || null,
                    responsavel: t.responsavel || null
                });
            }

            const tarefasApi = Array.isArray(this._tarefasAdminApiCache) ? this._tarefasAdminApiCache : [];
            for (const t of tarefasApi) {
                if (!t) continue;
                const st = String(t.status || '').toLowerCase();
                if (st.includes('conclu')) continue;
                if (!isKanbanTaskForUser(t)) continue;
                const tid = t.id != null ? String(t.id).trim() : '';
                if (tid && kanbanLinkedAdminIds.has(tid)) continue;
                addItem({
                    kind: 'tarefasAdmin',
                    module: 'tarefasAdmin',
                    id: t.id,
                    title: t.titulo || 'Tarefa administrativa',
                    dueYmd: t.prazo ? String(t.prazo).slice(0, 10) : null,
                    status: t.status || null,
                    responsavel: t.responsavel || null
                });
            }

            const demandas = ModuleSystem.data.demandasJuridicas || [];
            for (const d of demandas) {
                if (!d) continue;
                const st = String(d.status || '').toLowerCase();
                if (st.includes('resolvid')) continue;
                if (!isKanbanTaskForUser(d)) continue;
                addItem({
                    kind: 'demandasJuridicas',
                    module: 'demandasJuridicas',
                    id: d.id,
                    title: d.titulo || d.numeroProcesso || 'Demanda jurídica',
                    dueYmd: d.prazo ? String(d.prazo).slice(0, 10) : null,
                    status: d.status || null,
                    responsavel: d.responsavel || null
                });
            }

            return items;
        },

        categorizeItem(item) {
            if (!item || !item.dueYmd) return 'sem_data';
            const due = this.parseYmdToDate(item.dueYmd);
            if (!due) return 'sem_data';

            const today = this.parseYmdToDate(item.todayYmd);
            if (!today) return 'sem_data';

            const msPerDay = 24 * 60 * 60 * 1000;
            const diffDays = Math.floor((due.getTime() - today.getTime()) / msPerDay);

            if (diffDays < 0) return 'atrasadas';
            if (diffDays === 0) return 'hoje';
            if (diffDays <= 7) return 'proximos7';
            return 'futuro';
        },

        formatDueLabel(item) {
            if (!item || !item.dueYmd) return 'Sem prazo';
            const due = this.parseYmdToDate(item.dueYmd);
            if (!due) return 'Sem prazo';
            return due.toLocaleDateString('pt-BR');
        },

        getSourceLabel(item) {
            if (!item) return '';
            if (item.kind === 'kanban') return 'Kanban';
            if (item.kind === 'tarefasAdmin') return 'Administrativo';
            if (item.kind === 'demandasJuridicas') return 'Jurídico';
            return 'Atividade';
        },

        renderCard(item) {
            const title = this.escapeHtml(item.title);
            const due = this.escapeHtml(this.formatDueLabel(item));
            const source = this.escapeHtml(this.getSourceLabel(item));
            const resp = item.responsavel ? this.escapeHtml(item.responsavel) : '';
            const status = item.status ? this.escapeHtml(item.status) : '';
            const current =
                (window.AuthSystem && typeof window.AuthSystem.getCurrentUser === 'function')
                    ? (window.AuthSystem.getCurrentUser() || null)
                    : ((window.AuthSystem && window.AuthSystem.currentUser) ? window.AuthSystem.currentUser : null);
            const role = current && current.role != null ? String(current.role).trim().toLowerCase() : '';
            const isManagerOrAdmin =
                role === 'administrador' || role === 'admin' ||
                role === 'gerente' || role === 'gerencia' || role === 'gerência' ||
                role === 'gestor' || role === 'gestao' || role === 'gestão';
            const canDelete = !!(item && ((item.kind === 'tarefasAdmin') || (item.kind === 'kanban' && isManagerOrAdmin)));

            return `
                <div class="bg-white rounded-lg p-3 shadow-sm border">
                    <div class="flex justify-between items-start gap-2">
                        <div class="text-sm font-semibold text-gray-900">${title}</div>
                        <span class="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap">${due}</span>
                    </div>
                    <div class="mt-2 text-xs text-gray-600">
                        <span>${source}</span>
                        ${status ? `<span> • ${status}</span>` : ''}
                        ${resp ? `<span> • ${resp}</span>` : ''}
                    </div>
                    <div class="mt-3 flex justify-end gap-3">
                        ${canDelete ? `
                            <button class="text-red-600 hover:text-red-900 text-xs"
                                    data-agenda-delete="1"
                                    data-kind="${this.escapeHtml(item.kind)}"
                                    data-id="${this.escapeHtml(item.id)}"
                                    ${item && item.tarefasAdminId ? `data-admin-id="${this.escapeHtml(item.tarefasAdminId)}"` : ''}>
                                Excluir
                            </button>
                        ` : ''}
                        <button class="text-blue-600 hover:text-blue-900 text-xs"
                                data-agenda-open="1"
                                data-kind="${this.escapeHtml(item.kind)}"
                                data-id="${this.escapeHtml(item.id)}">
                            Abrir
                        </button>
                    </div>
                </div>
            `;
        },

        renderColumn(col, items) {
            const cards = items.map(it => this.renderCard(it)).join('');
            return `
                <div class="${col.color} rounded-lg p-4 min-w-80 flex-shrink-0">
                    <div class="flex justify-between items-center mb-3">
                        <h4 class="font-semibold text-gray-800">${col.title}</h4>
                        <span class="text-sm text-gray-600">${items.length}</span>
                    </div>
                    <div class="space-y-3 min-h-16">
                        ${cards || `<div class="text-xs text-gray-500">Sem itens</div>`}
                    </div>
                </div>
            `;
        },

        bindAgendaEvents(root) {
            if (!root) return;
            if (root.getAttribute('data-agenda-bound') === 'true') return;
            root.setAttribute('data-agenda-bound', 'true');

            root.addEventListener('click', (e) => {
                const del = e.target && e.target.closest ? e.target.closest('button[data-agenda-delete]') : null;
                if (del) {
                    e.preventDefault();
                    e.stopPropagation();
                    const kind = del.getAttribute('data-kind');
                    const id = del.getAttribute('data-id');
                    if (!kind || !id) return;
                    if (!confirm('Excluir esta tarefa?')) return;
                    const deleteAdminId = (() => {
                        if (kind === 'tarefasAdmin') return String(id);
                        if (kind === 'kanban') {
                            const aid = del.getAttribute('data-admin-id');
                            return aid ? String(aid) : '';
                        }
                        return '';
                    })();
                    const deleteAdmin = deleteAdminId
                        ? fetch('/api/crm/tarefas-admin/' + encodeURIComponent(deleteAdminId), { method: 'DELETE', credentials: 'include' })
                        : Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true }) });

                    const deleteLocalKanban = () => {
                        if (kind !== 'kanban') return;
                        try {
                            const tasks = Array.isArray(ModuleSystem?.data?.kanban?.tasks) ? ModuleSystem.data.kanban.tasks : [];
                            ModuleSystem.data.kanban.tasks = tasks.filter(t => t && String(t.id) !== String(id));
                            if (typeof ModuleSystem.saveData === 'function') ModuleSystem.saveData();
                        } catch {}
                        try {
                            if (window.KanbanSystem && typeof window.KanbanSystem.renderBoard === 'function') {
                                window.KanbanSystem.renderBoard();
                            }
                        } catch {}
                    };

                    deleteAdmin
                        .then(async (r) => {
                            const j = await r.json().catch(() => null);
                            if (!r.ok) throw new Error((j && j.error) ? j.error : ('Erro HTTP ' + r.status));
                            return j;
                        })
                        .then(() => {
                            deleteLocalKanban();
                            try { if (window.Toast) window.Toast.show('Tarefa excluída.', 'success'); } catch {}
                            try { this.refreshTarefasAdminApi(true); } catch {}
                            try { this.renderAgendaKanban(); } catch {}
                        })
                        .catch((err) => {
                            const msg = err && err.message ? String(err.message) : 'Falha ao excluir.';
                            try { if (window.Toast) window.Toast.show(msg, 'error', 12000, true); } catch {}
                        });
                    return;
                }
                const btn = e.target && e.target.closest ? e.target.closest('button[data-agenda-open]') : null;
                if (!btn) return;
                e.preventDefault();
                e.stopPropagation();

                const kind = btn.getAttribute('data-kind');
                const id = btn.getAttribute('data-id');
                if (!kind || !id) return;

                if (kind === 'kanban') {
                    try {
                        const open = () => {
                            try {
                                if (window.KanbanSystem && typeof window.KanbanSystem.init === 'function') window.KanbanSystem.init();
                            } catch {}
                            try {
                                if (window.KanbanSystem && typeof window.KanbanSystem.showTaskForm === 'function') {
                                    window.KanbanSystem.showTaskForm('todo', id);
                                }
                            } catch {}
                        };
                        if (window.NavigationSystem && typeof window.NavigationSystem.ensureKanbanSystemReady === 'function') {
                            window.NavigationSystem.ensureKanbanSystemReady(() => setTimeout(() => open(), 80));
                        } else {
                            open();
                        }
                    } catch {}
                    return;
                }

                if (kind === 'tarefasAdmin' || kind === 'demandasJuridicas') {
                    if (kind === 'tarefasAdmin') {
                        this.openTarefaAdminModal(id);
                        return;
                    }
                    if (window.ModuleSystem && typeof window.ModuleSystem.showDetails === 'function') {
                        window.ModuleSystem.showDetails(kind, id);
                    }
                }
            });
        },

        bindHeaderButtons() {
            const refreshBtn = document.getElementById('dashboardAgendaRefresh');
            if (refreshBtn && refreshBtn.getAttribute('data-bound') !== 'true') {
                refreshBtn.setAttribute('data-bound', 'true');
                refreshBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.renderAgendaKanban();
                });
            }

            const openKanbanBtn = document.getElementById('dashboardAgendaOpenKanban');
            if (openKanbanBtn && openKanbanBtn.getAttribute('data-bound') !== 'true') {
                openKanbanBtn.setAttribute('data-bound', 'true');
                openKanbanBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (window.NavigationSystem && typeof window.NavigationSystem.navigateToModule === 'function') {
                        window.NavigationSystem.navigateToModule('kanban');
                        setTimeout(() => {
                            if (window.KanbanSystem && typeof window.KanbanSystem.init === 'function') {
                                try { window.KanbanSystem.init(); } catch {}
                            }
                        }, 150);
                    }
                });
            }
        },

                refreshTarefasAdminApi(force = false) {
            const now = Date.now();
            const last = this._tarefasAdminApiLastFetch || 0;
            if (!force && now - last < 60000) return;
            if (this._tarefasAdminApiInFlight) return;
            this._tarefasAdminApiInFlight = true;

            const url = (() => {
                try {
                    const current =
                        (window.AuthSystem && typeof window.AuthSystem.getCurrentUser === 'function')
                            ? (window.AuthSystem.getCurrentUser() || null)
                            : ((window.AuthSystem && window.AuthSystem.currentUser) ? window.AuthSystem.currentUser : null);
                    const role = current && current.role != null ? String(current.role).trim().toLowerCase() : '';
                    const isManagerOrAdmin =
                        role === 'administrador' || role === 'admin' ||
                        role === 'gerente' || role === 'gerencia' || role === 'gerência' ||
                        role === 'gestor' || role === 'gestao' || role === 'gestão';
                    const qs = new URLSearchParams();
                    qs.set('limit', '200');
                    if (!isManagerOrAdmin && current && current.id != null) {
                        qs.set('responsavel_id', String(current.id));
                    }
                    return '/api/tarefas-admin?' + qs.toString();
                } catch {
                    return '/api/tarefas-admin?limit=200';
                }
            })();

            fetch(url, { credentials: 'include' })
                .then(async (r) => {
                    const j = await r.json().catch(() => []);
                    if (!r.ok || !Array.isArray(j)) return;
                    this._tarefasAdminApiCache = j.map((t) => {
                        const envolvidosIds = (() => {
                            const raw = t && t.envolvidos_json != null ? t.envolvidos_json : null;
                            if (!raw) return [];
                            try {
                                const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                                return Array.isArray(parsed) ? parsed.map(x => String(x)) : [];
                            } catch {
                                return [];
                            }
                        })();
                        return {
                            id: t.id,
                            titulo: t.titulo,
                            status: t.status,
                            prazo: t.data_vencimento,
                            responsavel: t.responsavel_nome || null,
                            responsavelId: t.responsavel_id,
                            tipo: t.tipo || null,
                            origemModulo: t.origem_modulo || null,
                            origemId: t.origem_id != null ? t.origem_id : null,
                            envolvidosIds
                        };
                    });
                    this._tarefasAdminApiLastFetch = Date.now();
                    try { this.renderAgendaKanban(); } catch {}
                })
                .catch(() => {})
                .finally(() => {
                    this._tarefasAdminApiInFlight = false;
                });
        },

        renderAgendaKanban() {
            const root = document.getElementById('dashboardAgendaKanban');
            if (!root) return;

            this.bindHeaderButtons();
            this.bindAdminTools();
            this.bindAgendaEvents(root);
            this.refreshTarefasAdminApi();

            const items = this.collectAgendaItems();
            const buckets = {
                atrasadas: [],
                hoje: [],
                proximos7: [],
                futuro: [],
                sem_data: []
            };

            for (const it of items) {
                const key = this.categorizeItem(it);
                if (buckets[key]) buckets[key].push(it);
                else buckets.sem_data.push(it);
            }

            const sortByDue = (a, b) => {
                const ad = a && a.dueYmd ? a.dueYmd : '9999-12-31';
                const bd = b && b.dueYmd ? b.dueYmd : '9999-12-31';
                if (ad !== bd) return ad.localeCompare(bd);
                return String(a.title || '').localeCompare(String(b.title || ''));
            };
            Object.values(buckets).forEach(arr => arr.sort(sortByDue));

            const summaryCard = (label, count, bg, text) => `
                <div class="${bg} rounded-lg p-4 border">
                    <div class="text-xs ${text} uppercase tracking-wider">${this.escapeHtml(label)}</div>
                    <div class="mt-1 text-2xl font-bold ${text}">${count}</div>
                </div>
            `;

            const allSorted = [...items].sort(sortByDue);
            const upcoming = allSorted.filter(i => i && i.dueYmd).slice(0, 8);
            const withoutDate = allSorted.filter(i => !i || !i.dueYmd).slice(0, 6);
            const listItems = [...upcoming, ...withoutDate].slice(0, 10);

            const listHtml = listItems.length
                ? `
                    <div class="bg-gray-50 rounded-lg border">
                        <div class="px-4 py-3 border-b flex justify-between items-center">
                            <div class="font-semibold text-gray-800 text-sm">Próximas atividades</div>
                            <div class="text-xs text-gray-500">${listItems.length} itens</div>
                        </div>
                        <div class="divide-y">
                            ${(() => {
                                const current =
                                    (window.AuthSystem && typeof window.AuthSystem.getCurrentUser === 'function')
                                        ? (window.AuthSystem.getCurrentUser() || null)
                                        : ((window.AuthSystem && window.AuthSystem.currentUser) ? window.AuthSystem.currentUser : null);
                                const role = current && current.role != null ? String(current.role).trim().toLowerCase() : '';
                                const isManagerOrAdmin =
                                    role === 'administrador' || role === 'admin' ||
                                    role === 'gerente' || role === 'gerencia' || role === 'gerência' ||
                                    role === 'gestor' || role === 'gestao' || role === 'gestão';
                                return listItems.map(it => {
                                    const canDelete = (it && it.kind === 'tarefasAdmin') || (it && it.kind === 'kanban' && isManagerOrAdmin);
                                    const adminId = (it && it.kind === 'kanban' && it.tarefasAdminId) ? String(it.tarefasAdminId) : '';
                                    return `
                                <div class="px-4 py-3 flex justify-between items-start gap-3">
                                    <div class="min-w-0">
                                        <div class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(it.title)}</div>
                                        <div class="mt-1 text-xs text-gray-600">
                                            ${this.escapeHtml(this.getSourceLabel(it))}
                                            ${it.status ? ` • ${this.escapeHtml(it.status)}` : ''}
                                            ${it.responsavel ? ` • ${this.escapeHtml(it.responsavel)}` : ''}
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-3 flex-shrink-0">
                                        <span class="text-xs px-2 py-1 rounded-full bg-white border text-gray-700 whitespace-nowrap">
                                            ${this.escapeHtml(this.formatDueLabel(it))}
                                        </span>
                                        ${canDelete ? `
                                            <button class="text-red-600 hover:text-red-900 text-xs"
                                                    data-agenda-delete="1"
                                                    data-kind="${this.escapeHtml(it.kind)}"
                                                    data-id="${this.escapeHtml(it.id)}"
                                                    ${adminId ? `data-admin-id="${this.escapeHtml(adminId)}"` : ''}>
                                                Excluir
                                            </button>
                                        ` : ''}
                                        <button class="text-blue-600 hover:text-blue-900 text-xs"
                                                data-agenda-open="1"
                                                data-kind="${this.escapeHtml(it.kind)}"
                                                data-id="${this.escapeHtml(it.id)}">
                                            Abrir
                                        </button>
                                    </div>
                                </div>
                            `;
                                }).join('');
                            })()}
                        </div>
                    </div>
                `
                : `<div class="text-gray-500 text-sm">Nenhuma atividade encontrada.</div>`;

            root.innerHTML = `
                <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                    ${summaryCard('Atrasadas', buckets.atrasadas.length, 'bg-red-50', 'text-red-700')}
                    ${summaryCard('Hoje', buckets.hoje.length, 'bg-blue-50', 'text-blue-700')}
                    ${summaryCard('Próximos 7 dias', buckets.proximos7.length, 'bg-yellow-50', 'text-yellow-800')}
                    ${summaryCard('Futuro', buckets.futuro.length, 'bg-gray-50', 'text-gray-700')}
                    ${summaryCard('Sem prazo', buckets.sem_data.length, 'bg-gray-100', 'text-gray-700')}
                </div>
                ${listHtml}
            `;
        }
    },

    // Módulo Projetos
    projetos: {
        // Listar projetos
        listProjetos() {
            const projetos = ModuleSystem.data.projetos || [];
            const usuarios = ModuleSystem.data.usuarios || [];
            const briefings = ModuleSystem.data.briefings || [];
            const memoriais = Array.isArray(ModuleSystem.data.memoriais) ? ModuleSystem.data.memoriais : [];

            const memorialByProjeto = (() => {
                const map = new Map();
                const score = (m) => {
                    const versao = m && m.versao != null ? Number(m.versao) : 0;
                    const ts = m && m.created_at ? Date.parse(m.created_at) : NaN;
                    const created = Number.isFinite(ts) ? ts : 0;
                    return versao * 1e13 + created;
                };
                for (const m of memoriais) {
                    if (!m || m.projeto_id == null) continue;
                    const k = String(m.projeto_id);
                    const prev = map.get(k);
                    if (!prev || score(m) > score(prev)) map.set(k, m);
                }
                return map;
            })();

            const parseDate = (raw) => {
                if (!raw) return null;
                if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
                const s = String(raw).trim();
                if (!s) return null;
                const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                if (m) {
                    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
                    return isNaN(d.getTime()) ? null : d;
                }
                const d = new Date(s);
                return isNaN(d.getTime()) ? null : d;
            };

            const formatDate = (raw) => {
                // Bug 3 Fix: extrair componentes sem conversão de fuso horário
                if (!raw) return '—';
                const _s = String(raw).trim().slice(0, 10);
                if (/^\d{4}-\d{2}-\d{2}$/.test(_s)) {
                    const [_y, _m, _d] = _s.split('-');
                    return `${_d}/${_m}/${_y}`;
                }
                return _s || '—';
            };

            const getNomeProjeto = (p) => {
                const n = p?.nome || p?.titulo;
                if (n) return n;
                const empresa = p?.briefing_empresa || p?.empresa || '';
                const evento = p?.briefing_evento || p?.nome_evento || p?.evento_nome || '';
                const label = [empresa, evento].filter(Boolean).join(' • ');
                return label || `Projeto #${p?.id ?? ''}`;
            };

            const getResponsavel = (p) => {
                const rid = p?.responsavel_id ?? p?.responsavelId ?? p?.gerente_id ?? p?.gerenteId;
                if (rid != null && String(rid).trim() !== '') {
                    const u = usuarios.find(x => x && x.id != null && String(x.id) === String(rid));
                    if (u && (u.nome || u.name || u.email)) return (u.nome || u.name || u.email);
                    if (p?.responsavel_nome) return p.responsavel_nome;
                }
                if (p?.responsavel_nome) return p.responsavel_nome;
                if (p?.projetista) return p.projetista;
                return '—';
            };

            const getVersao = (p) => {
                const v = p?.versao;
                const n = v != null ? Number(v) : NaN;
                return Number.isFinite(n) && n > 0 ? String(n) : '1';
            };

            const getPrazo = (p) => {
                const direct = p?.prazoEntrega ?? p?.prazo_entrega ?? p?.data_fim ?? p?.dataFim ?? p?.prazoEntrega;
                if (direct) return direct;
                const bid = p?.briefing_id ?? p?.briefingId;
                if (bid != null && String(bid).trim() !== '') {
                    const b = briefings.find(x => x && x.id != null && String(x.id) === String(bid));
                    if (b) return b.data_termino || b.data_fim || b.dataFim || b.data_termino;
                }
                return p?.briefing_data_termino || null;
            };

            const formatStatus = (raw) => {
                const s = raw != null ? String(raw).trim().toLowerCase() : '';
                const map = {
                    recebido: 'Recebido',
                    em_elaboracao: 'Em elaboração',
                    aguardando_revisao: 'Aguardando revisão',
                    revisao_cliente: 'Revisão cliente',
                    aprovado: 'Aprovado',
                    finalizado: 'Finalizado',
                    cancelado: 'Cancelado'
                };
                return map[s] || (raw != null && String(raw).trim() ? String(raw) : '—');
            };

            const statusClass = (raw) => {
                const s = raw != null ? String(raw).trim().toLowerCase() : '';
                if (s === 'finalizado' || s === 'aprovado') return 'bg-green-100 text-green-800';
                if (s === 'cancelado') return 'bg-gray-200 text-gray-700';
                if (s === 'revisao_cliente' || s === 'aguardando_revisao') return 'bg-yellow-100 text-yellow-800';
                return 'bg-blue-100 text-blue-800';
            };

            const memorialBadge = (pid) => {
                const m = memorialByProjeto.get(String(pid));
                if (!m) return '—';
                const s = (m.status || '').toLowerCase();
                const map = {
                    rascunho: 'bg-yellow-50 text-yellow-800 border-yellow-200',
                    aguardando_aprovacao: 'bg-blue-50 text-blue-800 border-blue-200',
                    aprovado: 'bg-green-50 text-green-800 border-green-200',
                    reprovado: 'bg-red-50 text-red-800 border-red-200'
                };
                const labelMap = {
                    rascunho: 'Rascunho',
                    aguardando_aprovacao: 'Aguardando Aprovação',
                    aprovado: 'Aprovado',
                    reprovado: 'Reprovado'
                };
                return `<span class="px-2 py-1 text-xs border rounded-full ${map[s] || 'bg-gray-50 text-gray-700 border-gray-200'}">v${m.versao || 1} • ${labelMap[s] || m.status || '—'}</span>`;
            };

            return `
                <div class="bg-white rounded-lg shadow">
                    <div class="p-6 border-b border-gray-200">
                        <div class="flex flex-wrap justify-between items-center gap-3">
                            <h3 class="text-lg font-semibold text-gray-800">Lista de Projetos</h3>
                            <div class="flex flex-wrap items-center gap-2 ml-auto">
                                <div class="relative">
                                    <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                                    <input id="projetos-filter-q" type="text" placeholder="Buscar por nome, projetista, status..."
                                           class="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                           style="min-width:220px" />
                                </div>
                                <select id="projetos-filter-status" class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    <option value="">Todos os status</option>
                                    <option value="em_andamento">Em Andamento</option>
                                    <option value="aprovado">Aprovado</option>
                                    <option value="concluido">Concluído</option>
                                    <option value="cancelado">Cancelado</option>
                                </select>
                                <button id="projetos-filter-clear" type="button" class="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                                    <i class="fas fa-times mr-1"></i>Limpar
                                </button>
                                <button data-action="create" data-module="projetos" 
                                        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-300 text-sm">
                                    <i class="fas fa-plus mr-2"></i>Novo Projeto
                                </button>
                                <button type="button" onclick="(async()=>{await ModuleSystem.loadProjetos(); await ModuleSystem.loadMemoriais(); if(window.NavigationSystem&&NavigationSystem.reloadCurrentPage) NavigationSystem.reloadCurrentPage();})()"
                                        class="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg transition duration-300 text-sm">
                                    <i class="fas fa-sync mr-2"></i>Atualizar
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projetista</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Memorial</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Versão</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prazo</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="projetos-list-body" class="bg-white divide-y divide-gray-200">
                                ${projetos.map(projeto => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="text-sm font-medium text-gray-900">${getNomeProjeto(projeto)}</div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${getResponsavel(projeto)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${statusClass(projeto.status)}">
                                                ${formatStatus(projeto.status)}
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${memorialBadge(projeto.id)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${getVersao(projeto)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ${formatDate(getPrazo(projeto))}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button data-action="read" data-module="projetos" data-id="${projeto.id}"
                                    class="text-blue-600 hover:text-blue-900"
                                    title="Visualizar projeto"
                                    aria-label="Visualizar detalhes do projeto ${getNomeProjeto(projeto)}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button data-action="update" data-module="projetos" data-id="${projeto.id}"
                                    class="text-green-600 hover:text-green-900"
                                    title="Editar projeto"
                                    aria-label="Editar projeto ${getNomeProjeto(projeto)}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button type="button" onclick="(async()=>{try{const r=await fetch('/api/crm/projetos/${projeto.id}/generate-html',{method:'POST',credentials:'include'});const t=await r.text(); if(!r.ok) throw new Error('Falha ao gerar HTML'); const w=window.open('about:blank'); if(w){w.document.open(); w.document.write(t); w.document.close();} else {alert('Pop-up bloqueado');}}catch(e){alert(e&&e.message?e.message:'Falha ao gerar documento');}})()"
                                    class="text-purple-600 hover:text-purple-900"
                                    title="Gerar Documento"
                                    aria-label="Gerar documento do projeto ${getNomeProjeto(projeto)}">
                                <i class="fas fa-file-export"></i>
                            </button>
                            <button type="button" onclick="(async()=>{try{window.open('/api/crm/projetos/${projeto.id}/download-html','_blank');}catch{}})()"
                                    class="text-indigo-600 hover:text-indigo-900"
                                    title="Baixar HTML"
                                    aria-label="Baixar HTML do projeto ${getNomeProjeto(projeto)}">
                                <i class="fas fa-download"></i>
                            </button>
                            <button type="button" onclick="(async()=>{try{if(!confirm('Duplicar este projeto como nova versão?')) return; const r=await fetch('/api/crm/projetos/${projeto.id}/duplicar',{method:'POST',credentials:'include'}); const j=await r.json().catch(()=>null); if(!r.ok){alert((j&&j.error)?j.error:'Falha ao duplicar projeto'); return;} await ModuleSystem.loadProjetos(); await ModuleSystem.loadMemoriais(); if(window.NavigationSystem&&NavigationSystem.reloadCurrentPage) NavigationSystem.reloadCurrentPage(); else location.reload();}catch{alert('Falha ao duplicar projeto');}})()"
                                    class="text-gray-700 hover:text-gray-900"
                                    title="Duplicar Versão"
                                    aria-label="Duplicar versão do projeto ${getNomeProjeto(projeto)}">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button data-action="delete" data-module="projetos" data-id="${projeto.id}"
                                    class="text-red-600 hover:text-red-900"
                                    title="Excluir projeto"
                                    aria-label="Excluir projeto ${getNomeProjeto(projeto)}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    },

    // Lista de Memoriais (módulo Projetos > sessão Memoriais)
    listMemoriais() {
        const memoriais = ModuleSystem.data.memoriais || [];
        const projetos = ModuleSystem.data.projetos || [];
        const filtroProjetoId = (ModuleSystem.data && ModuleSystem.data._memoriaisFiltroProjetoId != null) ? String(ModuleSystem.data._memoriaisFiltroProjetoId) : '';
        const rowsHtml = ModuleSystem.buildMemoriaisRowsHtml(memoriais, projetos);
        const header = `
            <div class="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                    <h3 class="text-lg font-semibold text-gray-800">Memoriais por Projeto</h3>
                    <div class="text-sm text-gray-500">Gerencie e gere memoriais descritivos</div>
                </div>
                <div class="flex items-center gap-2">
                    <select onchange="(async()=>{try{const v=this.value||''; ModuleSystem.data._memoriaisFiltroProjetoId=v; if(ModuleSystem.saveData) ModuleSystem.saveData(); await ModuleSystem.refreshMemoriaisUI(v||null);}catch{}})()"
                            class="bg-white border border-gray-300 text-gray-800 px-3 py-2 rounded-lg transition duration-300">
                        <option value="" ${!filtroProjetoId?'selected':''}>Todos os projetos</option>
                        ${projetos.map(p => `<option value="${p.id}" ${String(p.id)===String(filtroProjetoId)?'selected':''}>${p.nome || p.titulo || ('Projeto #'+p.id)}</option>`).join('')}
                    </select>
                    <button data-action="create" data-module="memoriais"
                            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-300">
                        <i class="fas fa-plus mr-2"></i>Novo Memorial
                    </button>
                    <button type="button" onclick="(async()=>{try{await ModuleSystem.loadProjetos(); const v=(ModuleSystem.data&&ModuleSystem.data._memoriaisFiltroProjetoId!=null)?String(ModuleSystem.data._memoriaisFiltroProjetoId):''; await ModuleSystem.refreshMemoriaisUI(v||null);}catch{}})()"
                            class="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg transition duration-300">
                        <i class="fas fa-sync mr-2"></i>Atualizar
                    </button>
                </div>
            </div>
        `;
        const table = `
            <div class="bg-white rounded-lg shadow">
                ${header}
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projeto</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Versão</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criado em</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody id="memoriais-tbody" class="bg-white divide-y divide-gray-200">
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        setTimeout(async () => {
            try {
                await ModuleSystem.refreshMemoriaisUI(filtroProjetoId || null);
            } catch {}
        }, 0);
        return table;
    },

    // Módulo Montagem
    montagem: {
        listOrdensServico() {
            const idTable = 'os-list-table';
            return `
                <div class="bg-white rounded-lg shadow overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <div>
                            <div class="text-sm text-gray-500">Montagem</div>
                            <div class="text-lg font-semibold text-gray-800">Ordens de Serviço</div>
                        </div>
                        <div class="flex items-center gap-2">
                            <button id="os-refresh" class="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg transition duration-300 text-sm">
                                <i class="fas fa-sync-alt mr-2"></i>Atualizar
                            </button>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full" id="${idTable}">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Início</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="os-list-body" class="bg-white divide-y divide-gray-200">
                                <tr><td colspan="6" class="px-6 py-4 text-sm text-gray-500">Carregando...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        },
        initOrdensServico() {
            const body = document.getElementById('os-list-body');
            const btn = document.getElementById('os-refresh');
            const api = async (url, opt = {}) => {
                const r = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opt });
                const j = await r.json().catch(() => null);
                if (!r.ok) throw new Error((j && j.error) ? j.error : 'Falha na API');
                return j;
            };
            const refresh = async () => {
                try {
                    const rows = await api('/api/crm/ordens-servico');
                    body.innerHTML = (rows || []).map(os => `
                        <tr class="hover:bg-gray-50">
                            <td class="px-6 py-3 text-sm text-gray-900">${os.numero || '-'}</td>
                            <td class="px-6 py-3 text-sm text-gray-900">${os.titulo || '-'}</td>
                            <td class="px-6 py-3 text-sm text-gray-900">${os.tipo || '-'}</td>
                            <td class="px-6 py-3 text-sm text-gray-900">${os.status || '-'}</td>
                            <td class="px-6 py-3 text-sm text-gray-900">${os.data_inicio || '-'}</td>
                            <td class="px-6 py-3 text-sm font-medium space-x-2">
                                <button data-action="read" data-module="ordens_servico" data-id="${os.id}" class="text-blue-600 hover:text-blue-900"><i class="fas fa-eye"></i></button>
                                <button data-action="update" data-module="ordens_servico" data-id="${os.id}" class="text-green-600 hover:text-green-900"><i class="fas fa-edit"></i></button>
                                <button data-action="delete" data-module="ordens_servico" data-id="${os.id}" class="text-red-600 hover:text-red-900"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `).join('') || `<tr><td colspan="6" class="px-6 py-4 text-sm text-gray-500">Nenhuma OS encontrada.</td></tr>`;
                } catch (e) {
                    body.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-sm text-red-600">${e && e.message ? e.message : 'Erro ao listar'}</td></tr>`;
                }
            };
            if (btn) btn.addEventListener('click', () => refresh());
            refresh();
        },
        // Listar montagens
        listMontagens() {
            const montagens = ModuleSystem.data.montagens || [];
            return `
                <div class="bg-white rounded-lg shadow">
                    <div class="p-6 border-b border-gray-200">
                        <div class="flex justify-between items-center">
                            <h3 class="text-lg font-semibold text-gray-800">Lista de Montagens</h3>
                            <div class="flex space-x-3">
                                <button onclick="ModuleSystem.montagem.showChecklistDashboard()" 
                                        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition duration-300">
                                    <i class="fas fa-clipboard-check mr-2"></i>Dashboard Checklist
                                </button>
                                <button data-action="create" data-module="montagens" 
                                        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-300">
                                    <i class="fas fa-plus mr-2"></i>Nova Montagem
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projeto</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montadora</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Checklist</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qualidade</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Início</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prazo</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${montagens.map(montagem => {
                                    const checklist = checklistMontagem.getChecklistByProject(montagem.id);
                                    const inspection = qualityControl.inspections.find(i => i.projetoId === montagem.id);
                                    
                                    return `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="text-sm font-medium text-gray-900">${montagem.nomeProjeto}</div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${montagem.montadora}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${montagem.status === 'Concluída' ? 'bg-green-100 text-green-800' : 
                                                  montagem.status === 'Em Andamento' ? 'bg-yellow-100 text-yellow-800' : 
                                                  'bg-blue-100 text-blue-800'}">
                                                ${montagem.status}
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            ${checklist ? `
                                                <div class="flex items-center">
                                                    <div class="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                        <div class="bg-blue-600 h-2 rounded-full" style="width: ${checklist.progresso}%"></div>
                                                    </div>
                                                    <span class="text-xs text-gray-600">${checklist.progresso}%</span>
                                                </div>
                                            ` : `
                                                <button onclick="ModuleSystem.montagem.createChecklist('${montagem.id}')" 
                                                        class="text-blue-600 hover:text-blue-900 text-xs">
                                                    Criar Checklist
                                                </button>
                                            `}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            ${inspection ? `
                                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                    ${inspection.aprovado ? 'bg-green-100 text-green-800' : 
                                                      inspection.pontuacaoGeral >= 80 ? 'bg-yellow-100 text-yellow-800' : 
                                                      'bg-red-100 text-red-800'}">
                                                    ${inspection.pontuacaoGeral}%
                                                </span>
                                            ` : `
                                                <button onclick="ModuleSystem.montagem.createInspection('${montagem.id}')" 
                                                        class="text-green-600 hover:text-green-900 text-xs">
                                                    Iniciar Inspeção
                                                </button>
                                            `}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ${new Date(montagem.dataInicio).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ${new Date(montagem.prazoEntrega).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div class="flex space-x-1">
                                                <button data-action="read" data-module="montagens" data-id="${montagem.id}"
                                                        class="text-blue-600 hover:text-blue-900"
                                                        title="Visualizar montagem">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                                <button onclick="ModuleSystem.montagem.openChecklist('${montagem.id}')"
                                                        class="text-green-600 hover:text-green-900"
                                                        title="Abrir checklist">
                                                    <i class="fas fa-clipboard-check"></i>
                                                </button>
                                                <button onclick="ModuleSystem.montagem.openPhotos('${montagem.id}')"
                                                        class="text-purple-600 hover:text-purple-900"
                                                        title="Gerenciar fotos">
                                                    <i class="fas fa-camera"></i>
                                                </button>
                                                <button data-action="update" data-module="montagens" data-id="${montagem.id}"
                                                        class="text-yellow-600 hover:text-yellow-900"
                                                        title="Editar montagem">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button data-action="delete" data-module="montagens" data-id="${montagem.id}"
                                                        class="text-red-600 hover:text-red-900"
                                                        title="Excluir montagem">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `;}).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        },

        // Dashboard de checklists
        showChecklistDashboard() {
            const content = document.getElementById('content');
            if (!content) return;

            content.innerHTML = `
                <div class="space-y-6">
                    <div class="bg-white rounded-lg shadow p-6">
                        <h2 class="text-2xl font-bold text-gray-800 mb-6">Dashboard de Checklists</h2>
                        
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div class="bg-blue-50 p-4 rounded-lg">
                                <h3 class="text-lg font-semibold text-blue-800">Checklists Ativos</h3>
                                <p class="text-3xl font-bold text-blue-600">${checklistMontagem.checklists.filter(c => c.status === 'Em Andamento').length}</p>
                            </div>
                            <div class="bg-green-50 p-4 rounded-lg">
                                <h3 class="text-lg font-semibold text-green-800">Concluídos</h3>
                                <p class="text-3xl font-bold text-green-600">${checklistMontagem.checklists.filter(c => c.status === 'Concluído').length}</p>
                            </div>
                            <div class="bg-yellow-50 p-4 rounded-lg">
                                <h3 class="text-lg font-semibold text-yellow-800">Inspeções Pendentes</h3>
                                <p class="text-3xl font-bold text-yellow-600">${qualityControl.inspections.filter(i => i.status === 'Em Andamento').length}</p>
                            </div>
                        </div>

                        <div id="checklist-dashboard-content">
                            ${checklistMontagem.renderDashboard()}
                        </div>
                    </div>
                </div>
            `;
        },

        // Criar checklist para montagem
        createChecklist(montagemId) {
            const montagem = ModuleSystem.data.montagens?.find(m => m.id == montagemId);
            if (!montagem) {
                alert('Montagem não encontrada');
                return;
            }

            const tipo = prompt('Selecione o tipo de stand:\n1 - Stand Personalizado\n2 - Stand Modular', '1');
            const tipoStand = tipo === '2' ? 'Stand Modular' : 'Stand Personalizado';

            const checklist = checklistMontagem.createChecklist(montagemId, {
                nomeProjeto: montagem.nomeProjeto,
                tipo: tipoStand,
                responsavel: montagem.montadora,
                observacoes: `Checklist criado para montagem ${montagem.nomeProjeto}`
            });

            if (checklist) {
                alert('Checklist criado com sucesso!');
                this.openChecklist(montagemId);
            }
        },

        // Abrir checklist
        openChecklist(montagemId) {
            const checklist = checklistMontagem.getChecklistByProject(montagemId);
            if (!checklist) {
                this.createChecklist(montagemId);
                return;
            }

            const content = document.getElementById('content');
            if (!content) return;

            content.innerHTML = `
                <div class="space-y-6">
                    <div class="flex items-center justify-between">
                        <h2 class="text-2xl font-bold text-gray-800">Checklist de Montagem</h2>
                        <button onclick="ModuleSystem.montagem.listMontagens(); document.getElementById('content').innerHTML = ModuleSystem.montagem.listMontagens();" 
                                class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg">
                            <i class="fas fa-arrow-left mr-2"></i>Voltar
                        </button>
                    </div>
                    ${checklistMontagem.renderChecklistInterface(checklist.id)}
                </div>
            `;
        },

        // Criar inspeção de qualidade
        createInspection(montagemId) {
            const montagem = ModuleSystem.data.montagens?.find(m => m.id == montagemId);
            const checklist = checklistMontagem.getChecklistByProject(montagemId);
            
            if (!montagem) {
                alert('Montagem não encontrada');
                return;
            }

            if (!checklist) {
                alert('É necessário ter um checklist antes de criar uma inspeção');
                return;
            }

            const inspetor = prompt('Nome do inspetor:', '');
            if (!inspetor) return;

            const inspection = qualityControl.createInspection(checklist.id, montagemId, {
                tipo: 'completa',
                inspetor: inspetor,
                observacoes: `Inspeção de qualidade para ${montagem.nomeProjeto}`
            });

            if (inspection) {
                alert('Inspeção criada com sucesso!');
                this.openInspection(inspection.id);
            }
        },

        // Abrir inspeção
        openInspection(inspectionId) {
            const content = document.getElementById('content');
            if (!content) return;

            content.innerHTML = `
                <div class="space-y-6">
                    <div class="flex items-center justify-between">
                        <h2 class="text-2xl font-bold text-gray-800">Inspeção de Qualidade</h2>
                        <button onclick="ModuleSystem.montagem.listMontagens(); document.getElementById('content').innerHTML = ModuleSystem.montagem.listMontagens();" 
                                class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg">
                            <i class="fas fa-arrow-left mr-2"></i>Voltar
                        </button>
                    </div>
                    ${qualityControl.renderInspectionInterface(inspectionId)}
                </div>
            `;
        },

        // Abrir gerenciador de fotos
        openPhotos(montagemId) {
            const montagem = ModuleSystem.data.montagens?.find(m => m.id == montagemId);
            if (!montagem) {
                alert('Montagem não encontrada');
                return;
            }

            const content = document.getElementById('content');
            if (!content) return;

            content.innerHTML = `
                <div class="space-y-6">
                    <div class="flex items-center justify-between">
                        <h2 class="text-2xl font-bold text-gray-800">Documentação Fotográfica - ${montagem.nomeProjeto}</h2>
                        <button onclick="ModuleSystem.montagem.listMontagens(); document.getElementById('content').innerHTML = ModuleSystem.montagem.listMontagens();" 
                                class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg">
                            <i class="fas fa-arrow-left mr-2"></i>Voltar
                        </button>
                    </div>
                    
                    <div class="bg-white rounded-lg shadow p-6">
                        <div id="photo-upload-container-${montagemId}"></div>
                    </div>
                </div>
            `;

            // Renderizar interface de upload
            setTimeout(() => {
                photoUpload.renderUploadInterface(`photo-upload-container-${montagemId}`, {
                    multiple: true,
                    categoria: 'montagem',
                    checklistId: checklistMontagem.getChecklistByProject(montagemId)?.id,
                    showPreview: true,
                    etapa: 'documentacao',
                    descricao: `Fotos da montagem ${montagem.nomeProjeto}`
                });
            }, 100);
        }
    },

    // Módulo Financeiro
    financeiro: {
        setDespesasCentroCustoFilter(value) {
            const raw = value != null ? String(value) : '';
            this._despesasCentroCustoFilter = raw;
            try {
                if (window.NavigationSystem && typeof NavigationSystem.reloadCurrentPage === 'function') {
                    NavigationSystem.reloadCurrentPage();
                }
            } catch {}
        },

        setReceitasCentroCustoFilter(value) {
            const raw = value != null ? String(value) : '';
            this._receitasCentroCustoFilter = raw;
            try {
                if (window.FinanceiroModule && typeof window.FinanceiroModule.rerenderContasReceberList === 'function') {
                    window.FinanceiroModule.rerenderContasReceberList();
                    return;
                }
            } catch {}
            try {
                if (window.NavigationSystem && typeof NavigationSystem.reloadCurrentPage === 'function') {
                    NavigationSystem.reloadCurrentPage();
                }
            } catch {}
        },

        // Listar transações financeiras
        listTransacoes() {
            const transacoes = ModuleSystem.data.transacoes || [];
            const can = (permission) => {
                try {
                    if (window.AuthSystem && typeof window.AuthSystem.hasPermission === 'function') return window.AuthSystem.hasPermission(permission);
                    return true;
                } catch {
                    return true;
                }
            };
            const canCreate = can('financeiro.custos.create');
            const canEdit = can('financeiro.custos.edit');
            const canDelete = can('financeiro.custos.delete');
            const normalize = (v) => (v != null ? String(v).trim().toLowerCase() : '');
            const isIncomeType = (tipo) => {
                const t = normalize(tipo);
                return t.includes('receita') || t.includes('receber') || t === 'r';
            };
            const tipoLabel = (tipo) => {
                const t = normalize(tipo);
                if (!t) return '-';
                if (t === 'pagar' || t.includes('despesa') || t.includes('custo') || t.includes('saída') || t.includes('saida') || t.includes('contas a pagar')) return 'Despesa';
                if (t === 'receber' || t.includes('receita') || t.includes('contas a receber')) return 'Receita';
                return String(tipo);
            };
            const formatMoney = (value) => {
                const n = typeof value === 'string' ? Number(String(value).replace(',', '.')) : Number(value);
                const safe = Number.isFinite(n) ? n : 0;
                return safe.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            };
            const statusBadge = (status) => {
                const s = normalize(status);
                if (s.includes('pago') || s.includes('baix')) return 'bg-green-100 text-green-800';
                if (s.includes('pend')) return 'bg-yellow-100 text-yellow-800';
                if (s.includes('venc')) return 'bg-red-100 text-red-800';
                if (s.includes('cancel')) return 'bg-gray-200 text-gray-700';
                return 'bg-gray-100 text-gray-800';
            };
            const dateBR = (ymd) => {
                if (!ymd) return '-';
                try {
                    // Bug 3 Fix: sem conversão de fuso horário
                    const _s3869 = String(ymd).slice(0, 10);
                    if (/^\d{4}-\d{2}-\d{2}$/.test(_s3869)) { const [_y,_m,_d] = _s3869.split('-'); return `${_d}/${_m}/${_y}`; }
                    return _s3869;
                } catch {
                    return String(ymd);
                }
            };
            const ccOptions = (() => {
                try { return (this.getCentroCustosList && typeof this.getCentroCustosList === 'function') ? this.getCentroCustosList() : []; } catch { return []; }
            })();
            const selectedRaw = this._despesasCentroCustoFilter != null ? String(this._despesasCentroCustoFilter) : '';
            const selectedKey = selectedRaw && selectedRaw.trim() !== '' ? this.normalizeCentroCusto(selectedRaw) : '';
            const filtered = selectedKey
                ? transacoes.filter(t => this.normalizeCentroCusto(t?.centroCusto) === selectedKey)
                : transacoes;
            return `
                <div class="bg-white rounded-lg shadow">
                    <div class="p-6 border-b border-gray-200">
                        <div class="flex justify-between items-center">
                            <h3 class="text-lg font-semibold text-gray-800">Despesas - Contas a Pagar</h3>
                            <div class="flex items-center gap-2">
                                <input id="despesas-filter-q" type="text"
                                       placeholder="Buscar descrição, tipo, status..."
                                       class="px-3 py-2 border border-gray-300 rounded-lg text-sm w-48"
                                       autocomplete="off" />
                                <label class="text-sm text-gray-600">Centro:</label>
                                <select class="px-3 py-2 border border-gray-300 rounded-lg"
                                        onchange="ModuleSystem.financeiro.setDespesasCentroCustoFilter(this.value)">
                                    <option value="" ${!selectedKey ? 'selected' : ''}>Todos</option>
                                    ${ccOptions.map(cc => {
                                        const ccKey = this.normalizeCentroCusto(cc);
                                        const sel = selectedKey && ccKey === selectedKey ? 'selected' : '';
                                        return `<option value="${ModuleSystem.escapeHtml(cc)}" ${sel}>${ModuleSystem.escapeHtml(cc)}</option>`;
                                    }).join('')}
                                </select>
                                ${canCreate ? `
                                    <button data-action="create" data-module="transacoes" 
                                            class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition duration-300">
                                        <i class="fas fa-plus mr-2"></i>Nova Despesa
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Centro de Custos</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="despesas-list-tbody" class="bg-white divide-y divide-gray-200">
                                ${filtered.map(transacao => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="text-sm font-medium text-gray-900">${transacao.descricao || '-'}</div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="text-sm text-gray-900">${transacao.centroCusto || '-'}</div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${isIncomeType(transacao.tipo) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                                ${tipoLabel(transacao.tipo)}
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            R$ ${formatMoney(transacao.valor)}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadge(transacao.status)}">
                                                ${transacao.status || '-'}
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ${dateBR(transacao.data)}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button data-action="read" data-module="transacoes" data-id="${transacao.id}"
                                    class="text-blue-600 hover:text-blue-900"
                                    title="Visualizar transação"
                                    aria-label="Visualizar detalhes da transação ${transacao.descricao}">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${canEdit ? `
                                <button data-action="update" data-module="transacoes" data-id="${transacao.id}"
                                        class="text-green-600 hover:text-green-900"
                                        title="Editar transação"
                                        aria-label="Editar transação ${transacao.descricao}">
                                    <i class="fas fa-edit"></i>
                                </button>
                            ` : ''}
                            ${canDelete ? `
                                <button data-action="delete" data-module="transacoes" data-id="${transacao.id}"
                                        class="text-red-600 hover:text-red-900"
                                        title="Excluir transação"
                                        aria-label="Excluir transação ${transacao.descricao}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        },

        listReceitas() {
            const contas = Array.isArray(ModuleSystem.data.contasReceber) ? ModuleSystem.data.contasReceber : [];
            const can = (permission) => {
                try {
                    if (window.AuthSystem && typeof window.AuthSystem.hasPermission === 'function') return window.AuthSystem.hasPermission(permission);
                    return true;
                } catch {
                    return true;
                }
            };
            const canCreate = can('financeiro.receitas.create');
            const canEdit = can('financeiro.receitas.edit');
            const canDelete = can('financeiro.receitas.delete');
            const sorted = [...contas].sort((a, b) => {
                const av = (a && (a.vencimento || a.created_at || a.createdAt || '')) || '';
                const bv = (b && (b.vencimento || b.created_at || b.createdAt || '')) || '';
                if (av < bv) return -1;
                if (av > bv) return 1;
                const ai = String(a?.id ?? '');
                const bi = String(b?.id ?? '');
                return ai.localeCompare(bi, 'pt-BR', { numeric: true });
            });

            const resolveCliente = (cr) => {
                const rawId = cr?.clienteId ?? cr?.cliente_id ?? null;
                const id = rawId != null && String(rawId).trim() !== '' ? String(rawId) : null;
                if (!id) return { nome: (cr?.clienteNome || cr?.cliente_nome || '-'), email: (cr?.clienteEmail || cr?.cliente_email || '') };
                const all = [
                    ...(Array.isArray(ModuleSystem.data?.clientes) ? ModuleSystem.data.clientes : []),
                    ...(Array.isArray(ModuleSystem.data?.leads) ? ModuleSystem.data.leads : [])
                ];
                const found = all.find(c => c && c.id != null && String(c.id) === id);
                const nome = (cr?.clienteNome || cr?.cliente_nome || (found ? (found.nome || found.razao_social || found.empresa) : null) || '-');
                const email = (cr?.clienteEmail || cr?.cliente_email || (found ? found.email : null) || '');
                return { nome, email };
            };

            const formatMoney = (value) => {
                const n = typeof value === 'string' ? Number(String(value).replace(',', '.')) : Number(value);
                const safe = Number.isFinite(n) ? n : 0;
                return safe.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            };

            const formatDate = (ymd) => {
                if (!ymd) return '-';
                try {
                    // Bug 3 Fix: sem conversão de fuso horário
                    const _s = String(ymd).slice(0, 10);
                    if (/^\d{4}-\d{2}-\d{2}$/.test(_s)) {
                        const [_y, _m, _d] = _s.split('-');
                        return `${_d}/${_m}/${_y}`;
                    }
                    return _s;
                } catch {
                    return String(ymd);
                }
            };

            const badgeClass = (status) => {
                const s = String(status || '').toLowerCase();
                if (s.includes('pago') || s.includes('baix')) return 'bg-green-100 text-green-800';
                if (s.includes('pend')) return 'bg-yellow-100 text-yellow-800';
                if (s.includes('venc')) return 'bg-red-100 text-red-800';
                return 'bg-gray-100 text-gray-800';
            };
            const ccOptions = (() => {
                try { return (this.getCentroCustosList && typeof this.getCentroCustosList === 'function') ? this.getCentroCustosList() : []; } catch { return []; }
            })();
            const selectedRaw = this._receitasCentroCustoFilter != null ? String(this._receitasCentroCustoFilter) : '';
            const selectedKey = selectedRaw && selectedRaw.trim() !== '' ? this.normalizeCentroCusto(selectedRaw) : '';

            return `
                <div class="bg-white rounded-lg shadow">
                    <div class="p-6 border-b border-gray-200">
                        <div class="flex justify-between items-center">
                            <h3 class="text-lg font-semibold text-gray-800">Receitas - Contas a Receber</h3>
                            <div class="flex items-center gap-2">
                                <input id="receitas-filter-q" type="text"
                                       placeholder="Buscar cliente, descrição, status..."
                                       class="px-3 py-2 border border-gray-300 rounded-lg text-sm w-48"
                                       autocomplete="off" />
                                <label class="text-sm text-gray-600">Centro:</label>
                                <select class="px-3 py-2 border border-gray-300 rounded-lg"
                                        onchange="ModuleSystem.financeiro.setReceitasCentroCustoFilter(this.value)">
                                    <option value="" ${!selectedKey ? 'selected' : ''}>Todos</option>
                                    ${ccOptions.map(cc => {
                                        const ccKey = this.normalizeCentroCusto(cc);
                                        const sel = selectedKey && ccKey === selectedKey ? 'selected' : '';
                                        return `<option value="${ModuleSystem.escapeHtml(cc)}" ${sel}>${ModuleSystem.escapeHtml(cc)}</option>`;
                                    }).join('')}
                                </select>
                                ${canCreate ? `
                                    <button data-action="create" data-module="contasReceber" 
                                            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition duration-300">
                                        <i class="fas fa-plus mr-2"></i>Nova Conta a Receber
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>

                    <div id="contas-receber-list-container" class="overflow-x-auto">
                        <table class="w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Centro de Custos</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimento</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="contas-receber-list-body" class="bg-white divide-y divide-gray-200">
                                ${sorted
                                    .filter(cr => !selectedKey || this.normalizeCentroCusto(cr?.centroCusto ?? cr?.centro_custo) === selectedKey)
                                    .map(cr => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="text-sm font-medium text-gray-900">${(() => {
                                                const c = resolveCliente(cr);
                                                return c.nome || '-';
                                            })()}</div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="text-sm text-gray-900">${cr.descricao || '-'}</div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="text-sm text-gray-900">${cr.centroCusto || cr.centro_custo || '-'}</div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ${cr.tipoReceita || cr.tipo_receita || '-'}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            R$ ${formatMoney(cr.valor)}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ${formatDate(cr.vencimento)}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeClass(cr.status)}">
                                                ${cr.status || 'Pendente'}
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            <button data-action="read" data-module="contasReceber" data-id="${cr.id}"
                                                    class="text-blue-600 hover:text-blue-900"
                                                    title="Visualizar conta a receber"
                                                    aria-label="Visualizar conta a receber ${cr.descricao || ''}">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            ${canEdit ? `
                                                <button data-action="update" data-module="contasReceber" data-id="${cr.id}"
                                                        class="text-green-600 hover:text-green-900"
                                                        title="Editar conta a receber"
                                                        aria-label="Editar conta a receber ${cr.descricao || ''}">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                            ` : ''}
                                            ${canDelete ? `
                                                <button data-action="delete" data-module="contasReceber" data-id="${cr.id}"
                                                        class="text-red-600 hover:text-red-900"
                                                        title="Excluir conta a receber"
                                                        aria-label="Excluir conta a receber ${cr.descricao || ''}">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            ` : ''}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        },

        listComissoes() {
            const now = new Date();
            const y = now.getFullYear();
            const m = now.getMonth() + 1;
            const monthOptions = Array.from({ length: 12 }).map((_, i) => {
                const mm = i + 1;
                const label = String(mm).padStart(2, '0');
                return `<option value="${mm}" ${mm === m ? 'selected' : ''}>${label}</option>`;
            }).join('');
            const yearOptions = [y - 1, y, y + 1].map((yy) => `<option value="${yy}" ${yy === y ? 'selected' : ''}>${yy}</option>`).join('');

            return `
                <div class="space-y-6">
                    <div class="bg-white rounded-lg shadow p-6">
                        <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                            <div>
                                <h3 class="text-lg font-semibold text-gray-800">Gestão de Metas e Comissões</h3>
                                <p class="text-sm text-gray-600">Acompanhamento mensal e extrato por venda (receitas)</p>
                            </div>
                            <div class="flex flex-wrap items-center gap-2">
                                <label class="text-sm text-gray-600">Mês:</label>
                                <select id="comissoesMes" class="px-3 py-2 border border-gray-300 rounded-lg">${monthOptions}</select>
                                <label class="text-sm text-gray-600">Ano:</label>
                                <select id="comissoesAno" class="px-3 py-2 border border-gray-300 rounded-lg">${yearOptions}</select>
                                <label class="text-sm text-gray-600">Base:</label>
                                <select id="comissoesBaseStatus" class="px-3 py-2 border border-gray-300 rounded-lg">
                                    <option value="pagas" selected>Pagas</option>
                                    <option value="faturadas">Faturadas</option>
                                </select>
                                <button type="button" id="comissoesRefresh"
                                        class="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg transition duration-300">
                                    <i class="fas fa-rotate mr-2"></i>Atualizar
                                </button>
                            </div>
                        </div>
                    </div>

                    <div id="comissoesMyPanel" class="bg-white rounded-lg shadow p-6">
                        <div class="text-sm text-gray-500">Carregando...</div>
                    </div>

                    <div id="comissoesTeamPanel" class="bg-white rounded-lg shadow p-6 hidden">
                        <div class="text-sm text-gray-500">Carregando...</div>
                    </div>
                </div>
            `;
        },

        initComissoes() {
            const me = (() => {
                try {
                    if (window.AuthSystem && typeof window.AuthSystem.getCurrentUser === 'function') return window.AuthSystem.getCurrentUser() || null;
                    if (window.AuthSystem && window.AuthSystem.currentUser) return window.AuthSystem.currentUser;
                } catch {}
                return null;
            })();
            const role = me && me.role != null ? String(me.role).trim().toLowerCase() : '';
            const isManagerOrAdmin =
                role === 'administrador' || role === 'admin' ||
                role === 'gerente' || role === 'gerencia' || role === 'gerência' ||
                role === 'gestor' || role === 'gestao' || role === 'gestão';
            const can = (permission) => {
                try {
                    if (window.AuthSystem && typeof window.AuthSystem.hasPermission === 'function') return window.AuthSystem.hasPermission(permission);
                    return true;
                } catch {
                    return true;
                }
            };
            const canManageTeam = can('financeiro.comissoes.calculate');

            const elMes = document.getElementById('comissoesMes');
            const elAno = document.getElementById('comissoesAno');
            const elBase = document.getElementById('comissoesBaseStatus');
            const btn = document.getElementById('comissoesRefresh');
            const myPanel = document.getElementById('comissoesMyPanel');
            const teamPanel = document.getElementById('comissoesTeamPanel');
            if (!elMes || !elAno || !elBase || !btn || !myPanel || !teamPanel) return;

            if (isManagerOrAdmin && canManageTeam) teamPanel.classList.remove('hidden');
            else teamPanel.classList.add('hidden');

            const toBR = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const esc = (s) => String(s == null ? '' : s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');

            const api = async (url, opt = {}) => {
                const r = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opt });
                const raw = await r.text().catch(() => '');
                let j = null;
                try { j = raw ? JSON.parse(raw) : null; } catch {}
                if (!r.ok) {
                    const msg = (j && j.error) ? String(j.error) : (raw ? String(raw).slice(0, 250) : 'Falha na API');
                    throw new Error(`${msg} (HTTP ${r.status})`);
                }
                return j;
            };

            const readFilters = () => {
                const mes = parseInt(String(elMes.value || ''), 10) || (new Date().getMonth() + 1);
                const ano = parseInt(String(elAno.value || ''), 10) || (new Date().getFullYear());
                const base = String(elBase.value || 'pagas');
                return { mes, ano, base };
            };

            const renderMy = async () => {
                const { mes, ano, base } = readFilters();
                myPanel.innerHTML = `<div class="text-sm text-gray-500">Carregando...</div>`;
                const perf = await api(`/api/crm/vendedor/performance?mes=${encodeURIComponent(mes)}&ano=${encodeURIComponent(ano)}&base_status=${encodeURIComponent(base)}`);
                const extrato = await api(`/api/crm/vendedor/comissoes?mes=${encodeURIComponent(mes)}&ano=${encodeURIComponent(ano)}&base_status=${encodeURIComponent(base)}`);

                const meta = Number(perf.meta_mensal || 0);
                const vendas = Number(perf.vendas_realizadas || 0);
                const pct = perf.atingimento_percent != null ? Number(perf.atingimento_percent) : null;
                const pctBar = pct != null ? Math.min(100, Math.max(0, pct)) : 0;
                const barCls = (pct != null && pct >= 100) ? 'bg-green-500' : 'bg-blue-500';
                const rate = Number(extrato.taxa_aplicada || 0);

                const rows = (extrato.items || []).map(it => `
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-3 text-sm text-gray-900">${esc(it.cliente_nome || '-')}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${esc(it.descricao || '-')}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${esc(it.centro_custo || '-')}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${esc(it.status || '-')}</td>
                        <td class="px-4 py-3 text-sm text-gray-900 text-right">${toBR(it.valor)}</td>
                        <td class="px-4 py-3 text-sm text-gray-900 text-right">${Math.round(rate * 10000) / 100}%</td>
                        <td class="px-4 py-3 text-sm font-semibold text-gray-900 text-right">${toBR(it.comissao)}</td>
                    </tr>
                `).join('');

                myPanel.innerHTML = `
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <div class="text-sm text-gray-500">Minha performance (${String(ano)}-${String(mes).padStart(2,'0')})</div>
                            <div class="text-lg font-semibold text-gray-800">Meta x Realizado</div>
                        </div>
                        <div class="text-right">
                            <div class="text-sm text-gray-500">Taxa aplicada</div>
                            <div class="text-lg font-semibold text-gray-800">${Math.round(rate * 10000) / 100}%</div>
                        </div>
                    </div>

                    <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div class="text-sm text-gray-600">Meta Prevista</div>
                            <div class="text-xl font-bold text-gray-900">${toBR(meta)}</div>
                        </div>
                        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div class="text-sm text-gray-600">Vendas Realizadas</div>
                            <div class="text-xl font-bold text-gray-900">${toBR(vendas)}</div>
                        </div>
                        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div class="text-sm text-gray-600">Atingimento</div>
                            <div class="text-xl font-bold text-gray-900">${pct != null ? (String(pct) + '%') : '-'}</div>
                        </div>
                    </div>

                    <div class="mt-4">
                        <div class="flex items-center justify-between text-sm text-gray-600 mb-1">
                            <span>Progresso</span>
                            <span>${pct != null ? (String(pct) + '%') : '-'}</span>
                        </div>
                        <div class="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                            <div class="${barCls} h-3" style="width:${pctBar}%"></div>
                        </div>
                    </div>

                    <div class="mt-6">
                        <div class="flex items-center justify-between">
                            <div class="text-lg font-semibold text-gray-800">Extrato de Comissões</div>
                            <div class="text-sm text-gray-600">Total: <span class="font-semibold text-gray-900">${toBR(extrato.total_comissao || 0)}</span></div>
                        </div>
                        <div class="mt-3 mb-2">
                            <input id="comissoes-filter-q" type="text"
                                   placeholder="Buscar cliente, descrição, centro, status..."
                                   class="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full md:w-72"
                                   autocomplete="off" />
                        </div>
                        <div class="overflow-x-auto border rounded-lg">
                            <table class="w-full">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Venda/Descrição</th>
                                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Centro</th>
                                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">%</th>
                                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Comissão</th>
                                    </tr>
                                </thead>
                                <tbody id="comissoes-extrato-tbody" class="bg-white divide-y divide-gray-200">
                                    ${rows || `<tr><td colspan="7" class="px-4 py-6 text-sm text-gray-500">Nenhuma venda encontrada para o período.</td></tr>`}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            };

            const renderTeam = async () => {
                if (!isManagerOrAdmin || !canManageTeam) return;
                const { mes, ano, base } = readFilters();
                teamPanel.innerHTML = `<div class="text-sm text-gray-500">Carregando...</div>`;
                const users = await api('/api/crm/users');
                const sellers = (users || []).filter(u => u && u.active === 1 && ['vendedor','comercial','vendas'].includes(String(u.role || '').toLowerCase()));
                const dash = await api(`/api/crm/metas/dashboard?mes=${encodeURIComponent(mes)}&ano=${encodeURIComponent(ano)}&base_status=${encodeURIComponent(base)}`);

                const options = sellers.map(u => `<option value="${u.id}">${esc(u.name)} (${esc(u.email || '')})</option>`).join('');
                const rows = ((dash && Array.isArray(dash.team) ? dash.team : (Array.isArray(dash) ? dash : [])) || []).map(r => {
                    const meta = Number(r.meta_mensal || 0);
                    const vendas = Number(r.vendas_realizadas || 0);
                    const pct = r.atingimento_percent != null ? Number(r.atingimento_percent) : null;
                    const pctBar = pct != null ? Math.min(100, Math.max(0, pct)) : 0;
                    const barCls = (pct != null && pct >= 100) ? 'bg-green-500' : 'bg-blue-500';
                    return `
                        <tr class="hover:bg-gray-50">
                            <td class="px-4 py-3 text-sm text-gray-900">${esc(r.vendedor_nome || r.nome || '-')}</td>
                            <td class="px-4 py-3 text-sm text-gray-900 text-right">${toBR(meta)}</td>
                            <td class="px-4 py-3 text-sm text-gray-900 text-right">${toBR(vendas)}</td>
                            <td class="px-4 py-3 text-sm text-gray-900">
                                <div class="flex items-center gap-3">
                                    <div class="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                        <div class="${barCls} h-2" style="width:${pctBar}%"></div>
                                    </div>
                                    <div class="w-14 text-right text-xs text-gray-700">${pct != null ? (String(pct) + '%') : '-'}</div>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');

                teamPanel.innerHTML = `
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <div class="text-sm text-gray-500">Equipe (${String(ano)}-${String(mes).padStart(2,'0')})</div>
                            <div class="text-lg font-semibold text-gray-800">Meta Prevista vs Vendas Realizadas</div>
                        </div>
                    </div>

                    ${canManageTeam ? `
                        <div class="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div class="text-sm font-semibold text-gray-800 mb-3">Definir/Atualizar Meta</div>
                            <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
                                <select id="metaVendedorId" class="px-3 py-2 border border-gray-300 rounded-lg md:col-span-2">
                                    <option value="">Selecione o vendedor</option>
                                    ${options}
                                </select>
                                <select id="metaTipo" class="px-3 py-2 border border-gray-300 rounded-lg">
                                    <option value="mensal" selected>Mensal</option>
                                    <option value="anual">Anual</option>
                                </select>
                                <input id="metaValor" type="number" min="0" step="0.01" class="px-3 py-2 border border-gray-300 rounded-lg" placeholder="Valor da meta">
                                <button type="button" id="metaSalvar"
                                        class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition duration-300">
                                    Salvar
                                </button>
                            </div>
                            <div id="metaHint" class="text-xs text-gray-600 mt-2"></div>
                        </div>
                    ` : ''}

                    <div class="mt-4 overflow-x-auto border rounded-lg">
                        <table class="w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedor</th>
                                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Meta</th>
                                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vendas</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Atingimento</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${rows || `<tr><td colspan="4" class="px-4 py-6 text-sm text-gray-500">Nenhum vendedor encontrado.</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                `;

                const elVend = document.getElementById('metaVendedorId');
                const elTipo = document.getElementById('metaTipo');
                const elValor = document.getElementById('metaValor');
                const elSalvar = document.getElementById('metaSalvar');
                const elHint = document.getElementById('metaHint');
                if (!canManageTeam) return;
                if (!elVend || !elTipo || !elValor || !elSalvar || !elHint) return;

                const updateHint = () => {
                    const tipo = String(elTipo.value || 'mensal');
                    elHint.textContent = tipo === 'anual'
                        ? 'Meta anual: mês referência será 0 e vale para o ano inteiro.'
                        : 'Meta mensal: aplica para o mês/ano selecionados no topo.';
                };
                updateHint();
                elTipo.addEventListener('change', () => updateHint());

                elSalvar.addEventListener('click', async () => {
                    const vendedor_id = parseInt(String(elVend.value || ''), 10);
                    const tipo = String(elTipo.value || '').trim();
                    const valor_meta = Number(elValor.value || 0);
                    const payload = {
                        vendedor_id,
                        tipo,
                        ano_ref: ano,
                        mes_ref: tipo === 'anual' ? 0 : mes,
                        valor_meta
                    };
                    try {
                        if (!vendedor_id) throw new Error('Selecione o vendedor.');
                        if (!Number.isFinite(valor_meta) || valor_meta < 0) throw new Error('Informe um valor de meta válido.');
                        await api('/api/metas', { method: 'POST', body: JSON.stringify(payload) });
                        if (window.Toast) window.Toast.show('Meta salva.', 'success');
                        await renderMy().catch(() => {});
                        await renderTeam();
                    } catch (e) {
                        const msg = e && e.message ? e.message : 'Falha ao salvar meta.';
                        if (window.Toast) window.Toast.show(msg, 'error', 12000, true);
                    }
                });
            };

            const run = async () => {
                try {
                    await renderMy();
                } catch (e) {
                    const msg = e && e.message ? e.message : 'Falha ao carregar comissões.';
                    myPanel.innerHTML = `<div class="text-sm text-red-700">${esc(msg)}</div>`;
                }
                try {
                    await renderTeam();
                } catch (e) {
                    if (!isManagerOrAdmin) return;
                    const msg = e && e.message ? e.message : 'Falha ao carregar painel da equipe.';
                    teamPanel.innerHTML = `<div class="text-sm text-red-700">${esc(msg)}</div>`;
                }
            };

            if (btn.getAttribute('data-bound') !== 'true') {
                btn.setAttribute('data-bound', 'true');
                btn.addEventListener('click', () => run());
            }
            run();
        },

        normalizeCentroCusto(value) {
            const raw = value != null ? String(value).trim() : '';
            return raw ? raw : '(Sem centro de custos)';
        },

        normalizeMoney(value) {
            const n = typeof value === 'string' ? Number(String(value).replace(',', '.')) : Number(value);
            return Number.isFinite(n) ? n : 0;
        },

        getCentroCustosList() {
            const set = new Set();
            const push = (v) => {
                const key = this.normalizeCentroCusto(v);
                if (!key) return;
                set.add(key);
            };
            (Array.isArray(ModuleSystem.data.transacoes) ? ModuleSystem.data.transacoes : []).forEach(t => push(t?.centroCusto));
            (Array.isArray(ModuleSystem.data.contasReceber) ? ModuleSystem.data.contasReceber : []).forEach(cr => push(cr?.centroCusto ?? cr?.centro_custo));
            (Array.isArray(ModuleSystem.data.eventos) ? ModuleSystem.data.eventos : []).forEach(e => push(e?.nome));
            set.add(this.normalizeCentroCusto(''));
            return Array.from(set.values()).sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
        },

        getRelatorioCentroCustosData(filterCentroCusto = '') {
            const transacoes = Array.isArray(ModuleSystem.data.transacoes) ? ModuleSystem.data.transacoes : [];
            const contas = Array.isArray(ModuleSystem.data.contasReceber) ? ModuleSystem.data.contasReceber : [];

            const map = new Map();

            const ensure = (cc) => {
                const key = this.normalizeCentroCusto(cc);
                if (!map.has(key)) {
                    map.set(key, {
                        centroCusto: key,
                        receitasContas: 0,
                        receitasTransacoes: 0,
                        custosTransacoes: 0,
                        itensReceitas: [],
                        itensTransacoes: []
                    });
                }
                return map.get(key);
            };

            contas.forEach(cr => {
                const bucket = ensure(cr?.centroCusto ?? cr?.centro_custo);
                const valor = this.normalizeMoney(cr?.valor);
                bucket.receitasContas += valor;
                bucket.itensReceitas.push({
                    id: cr?.id,
                    descricao: cr?.descricao || '',
                    valor,
                    status: cr?.status || '',
                    vencimento: cr?.vencimento || '',
                    dataPagamento: cr?.dataPagamento ?? cr?.data_pagamento ?? ''
                });
            });

            transacoes.forEach(t => {
                const bucket = ensure(t?.centroCusto);
                const valor = this.normalizeMoney(t?.valor);
                const tipo = String(t?.tipo || '').toLowerCase();
                if (tipo.includes('pagar') || tipo.includes('desp')) {
                    bucket.custosTransacoes += valor;
                } else if (tipo.includes('receb') || tipo.includes('rec')) {
                    bucket.receitasTransacoes += valor;
                } else {
                    bucket.custosTransacoes += valor;
                }
                bucket.itensTransacoes.push({
                    id: t?.id,
                    descricao: t?.descricao || '',
                    valor,
                    tipo: t?.tipo || '',
                    status: t?.status || '',
                    data: t?.data || ''
                });
            });

            const rows = Array.from(map.values()).map(r => {
                const receitas = r.receitasContas + r.receitasTransacoes;
                const custos = r.custosTransacoes;
                const saldo = receitas - custos;
                return { ...r, receitas, custos, saldo };
            }).sort((a, b) => b.saldo - a.saldo || a.centroCusto.localeCompare(b.centroCusto, 'pt-BR'));

            const filterKey = (filterCentroCusto != null && String(filterCentroCusto).trim() !== '')
                ? this.normalizeCentroCusto(filterCentroCusto)
                : '';
            const filteredRows = filterKey ? rows.filter(r => r && String(r.centroCusto) === String(filterKey)) : rows;

            const totals = filteredRows.reduce((acc, r) => {
                acc.receitasContas += r.receitasContas;
                acc.receitasTransacoes += r.receitasTransacoes;
                acc.custosTransacoes += r.custosTransacoes;
                acc.receitas += r.receitas;
                acc.custos += r.custos;
                acc.saldo += r.saldo;
                return acc;
            }, { receitasContas: 0, receitasTransacoes: 0, custosTransacoes: 0, receitas: 0, custos: 0, saldo: 0 });

            return { rows: filteredRows, totals, filterKey };
        },

        exportRelatorioCentroCustosCsv() {
            const currentFilter = this._relatorioCentroCustoFilter != null ? String(this._relatorioCentroCustoFilter) : '';
            const { rows, totals } = this.getRelatorioCentroCustosData(currentFilter);
            const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
            const toBR = (n) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            const header = ['Centro de Custos','Receitas (Contas a Receber)','Receitas (Transações)','Despesas (Transações)','Receitas (Total)','Despesas (Total)','Saldo'].map(esc).join(',');
            const lines = rows.map(r => [
                esc(r.centroCusto),
                esc(toBR(r.receitasContas)),
                esc(toBR(r.receitasTransacoes)),
                esc(toBR(r.custosTransacoes)),
                esc(toBR(r.receitas)),
                esc(toBR(r.custos)),
                esc(toBR(r.saldo))
            ].join(','));
            lines.push([
                esc('TOTAL'),
                esc(toBR(totals.receitasContas)),
                esc(toBR(totals.receitasTransacoes)),
                esc(toBR(totals.custosTransacoes)),
                esc(toBR(totals.receitas)),
                esc(toBR(totals.custos)),
                esc(toBR(totals.saldo))
            ].join(','));

            // Detalhe: quando um CC específico está filtrado, adicionar linhas individuais
            if (currentFilter && rows.length > 0) {
                const row = rows[0];
                if (Array.isArray(row.itensReceitas) && row.itensReceitas.length > 0) {
                    lines.push('');
                    lines.push([esc('--- RECEITAS (Contas a Receber) ---'),'','','','','',''].join(','));
                    lines.push(['Descrição','Valor','Status','Vencimento','','',''].map(esc).join(','));
                    for (const it of row.itensReceitas) {
                        lines.push([esc(it.descricao||''),esc(toBR(it.valor)),esc(it.status||''),esc(it.vencimento||''),'','',''].join(','));
                    }
                }
                if (Array.isArray(row.itensTransacoes) && row.itensTransacoes.length > 0) {
                    lines.push('');
                    lines.push([esc('--- DESPESAS/RECEITAS (Transações) ---'),'','','','','',''].join(','));
                    lines.push(['Descrição','Tipo','Valor','Status','Data','',''].map(esc).join(','));
                    for (const it of row.itensTransacoes) {
                        lines.push([esc(it.descricao||''),esc(it.tipo||''),esc(toBR(it.valor)),esc(it.status||''),esc(it.data||''),'',''].join(','));
                    }
                }
            }
            const csv = [header, ...lines].join('\n');
            const filename = `relatorio-centro-custos-${new Date().toISOString().slice(0,10)}.csv`;
            // Usar AuditSystem (que já adiciona BOM) ou fallback com BOM manual
            if (window.AuditSystem && typeof window.AuditSystem.downloadFile === 'function') {
                window.AuditSystem.downloadFile(filename, csv, 'text/csv');
                return;
            }
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },
        exportRelatorioExcel() {
            // Exportação Excel via SheetJS (CDN carregado dinamicamente)
            const currentFilter = this._relatorioCentroCustoFilter != null ? String(this._relatorioCentroCustoFilter) : '';
            const { rows, totals } = this.getRelatorioCentroCustosData(currentFilter);
            const toBR = (n) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const doExport = () => {
                const XLSX = window.XLSX;
                const wsData = [
                    ['Centro de Custos','Receitas (C. Receber)','Receitas (Transações)','Despesas (Transações)','Receitas (Total)','Despesas (Total)','Saldo'],
                    ...rows.map(r => [r.centroCusto, toBR(r.receitasContas), toBR(r.receitasTransacoes), toBR(r.custosTransacoes), toBR(r.receitas), toBR(r.custos), toBR(r.saldo)]),
                    ['TOTAL', toBR(totals.receitasContas), toBR(totals.receitasTransacoes), toBR(totals.custosTransacoes), toBR(totals.receitas), toBR(totals.custos), toBR(totals.saldo)]
                ];
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                XLSX.utils.book_append_sheet(wb, ws, 'Resumo');
                // Aba de detalhe: quando um CC específico está filtrado
                if (currentFilter && rows.length > 0) {
                    const row = rows[0];
                    const detData = [['Tipo','Descrição','Valor','Status','Data/Vencimento']];
                    if (Array.isArray(row.itensReceitas)) {
                        for (const it of row.itensReceitas) {
                            detData.push(['Receita (C.Receber)', it.descricao||'', toBR(it.valor), it.status||'', it.vencimento||'']);
                        }
                    }
                    if (Array.isArray(row.itensTransacoes)) {
                        for (const it of row.itensTransacoes) {
                            detData.push([it.tipo==='receber'?'Receita (Transação)':'Despesa', it.descricao||'', toBR(it.valor), it.status||'', it.data||'']);
                        }
                    }
                    if (detData.length > 1) {
                        const wsDet = XLSX.utils.aoa_to_sheet(detData);
                        XLSX.utils.book_append_sheet(wb, wsDet, 'Detalhe');
                    }
                }
                XLSX.writeFile(wb, `relatorio-centro-custos-${new Date().toISOString().slice(0,10)}.xlsx`);
            };
            if (window.XLSX) { doExport(); return; }
            const script = document.createElement('script');
            script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
            script.onload = doExport;
            script.onerror = () => { if (window.NotificationSystem) window.NotificationSystem.error('Falha ao carregar biblioteca Excel. Verifique sua conexão.'); };
            document.head.appendChild(script);
        },
        exportRelatorioPDF() {
            // Exportação PDF via janela de impressão com tabela formatada
            const currentFilter = this._relatorioCentroCustoFilter != null ? String(this._relatorioCentroCustoFilter) : '';
            const { rows, totals } = this.getRelatorioCentroCustosData(currentFilter);
            const toBR = (n) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const esc = (v) => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            const today = new Date().toLocaleDateString('pt-BR');
            const rowsHtml = rows.map(r => {
                let detailHtml = '';
                if (currentFilter && r.centroCusto === currentFilter) {
                    const recItems = Array.isArray(r.itensReceitas) ? r.itensReceitas : [];
                    const trxItems = Array.isArray(r.itensTransacoes) ? r.itensTransacoes : [];
                    if (recItems.length > 0) {
                        detailHtml += `<tr class="det-header"><td colspan="7" style="background:#e0f2fe;font-weight:bold;padding:4px 8px;font-size:9px">Receitas — Contas a Receber (${recItems.length} item(s))</td></tr>`;
                        detailHtml += `<tr class="det-header"><td style="padding-left:16px;font-size:9px;color:#555">Descrição</td><td colspan="2" style="font-size:9px;color:#555">Valor</td><td colspan="2" style="font-size:9px;color:#555">Status</td><td colspan="2" style="font-size:9px;color:#555">Vencimento</td></tr>`;
                        for (const it of recItems) {
                            detailHtml += `<tr class="det-row"><td style="padding-left:16px;font-size:9px">${esc(it.descricao||'')}</td><td colspan="2" style="font-size:9px">${esc(toBR(it.valor))}</td><td colspan="2" style="font-size:9px">${esc(it.status||'')}</td><td colspan="2" style="font-size:9px">${esc(it.vencimento||'')}</td></tr>`;
                        }
                    }
                    if (trxItems.length > 0) {
                        detailHtml += `<tr class="det-header"><td colspan="7" style="background:#fef3c7;font-weight:bold;padding:4px 8px;font-size:9px">Transações (${trxItems.length} item(s))</td></tr>`;
                        detailHtml += `<tr class="det-header"><td style="padding-left:16px;font-size:9px;color:#555">Descrição</td><td style="font-size:9px;color:#555">Tipo</td><td colspan="2" style="font-size:9px;color:#555">Valor</td><td style="font-size:9px;color:#555">Status</td><td colspan="2" style="font-size:9px;color:#555">Data</td></tr>`;
                        for (const it of trxItems) {
                            detailHtml += `<tr class="det-row"><td style="padding-left:16px;font-size:9px">${esc(it.descricao||'')}</td><td style="font-size:9px">${esc(it.tipo||'')}</td><td colspan="2" style="font-size:9px">${esc(toBR(it.valor))}</td><td style="font-size:9px">${esc(it.status||'')}</td><td colspan="2" style="font-size:9px">${esc(it.data||'')}</td></tr>`;
                        }
                    }
                }
                return `<tr><td>${esc(r.centroCusto)}</td><td>${esc(toBR(r.receitasContas))}</td><td>${esc(toBR(r.receitasTransacoes))}</td><td>${esc(toBR(r.custosTransacoes))}</td><td>${esc(toBR(r.receitas))}</td><td>${esc(toBR(r.custos))}</td><td class="${r.saldo >= 0 ? 'pos' : 'neg'}">${esc(toBR(r.saldo))}</td></tr>${detailHtml}`;
            }).join('');
            const win = window.open('', '_blank');
            if (!win) { if (window.NotificationSystem) window.NotificationSystem.error('Pop-up bloqueado. Permita pop-ups para exportar PDF.'); return; }
            win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório Centro de Custos - SAMS Locações</title><style>body{font-family:Arial,sans-serif;font-size:11px;margin:20px}h1{font-size:16px;color:#1e3a5f;margin-bottom:4px}p{color:#666;margin:0 0 12px}table{width:100%;border-collapse:collapse}th{background:#1e3a5f;color:#fff;padding:6px 8px;text-align:left;font-size:10px}td{padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:10px}tr:last-child td{font-weight:bold;background:#f3f4f6}td.pos{color:#059669}td.neg{color:#dc2626}@media print{button{display:none}}</style></head><body><h1>Relatório por Centro de Custos</h1><p>SAMS Locações &mdash; Gerado em ${today}</p><table><thead><tr><th>Centro de Custos</th><th>Rec. C.Receber</th><th>Rec. Transações</th><th>Desp. Transações</th><th>Receitas Total</th><th>Despesas Total</th><th>Saldo</th></tr></thead><tbody>${rowsHtml}<tr><td>TOTAL</td><td>${esc(toBR(totals.receitasContas))}</td><td>${esc(toBR(totals.receitasTransacoes))}</td><td>${esc(toBR(totals.custosTransacoes))}</td><td>${esc(toBR(totals.receitas))}</td><td>${esc(toBR(totals.custos))}</td><td class="${totals.saldo >= 0 ? 'pos' : 'neg'}">${esc(toBR(totals.saldo))}</td></tr></tbody></table><br><button onclick="window.print()">🖨️ Imprimir / Salvar PDF</button></body></html>`);
            win.document.close();
            setTimeout(() => { try { win.print(); } catch {} }, 400);
        },

        setRelatorioCentroCustoFilter(value) {
            const raw = value != null ? String(value) : '';
            this._relatorioCentroCustoFilter = raw;
            try {
                const wrappers = Array.from(document.querySelectorAll('[data-fin-relatorio-wrapper="1"]'));
                for (const w of wrappers) {
                    try { w.outerHTML = this.listRelatorios(); } catch {}
                }
            } catch {}
        },

        listRelatorios() {
            const toBR = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const esc = (s) => String(s == null ? '' : s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
            const currentFilter = this._relatorioCentroCustoFilter != null ? String(this._relatorioCentroCustoFilter) : '';
            const { rows, totals, filterKey } = this.getRelatorioCentroCustosData(currentFilter);
            const centros = this.getCentroCustosList();
            const lucro = Number(totals.receitas || 0) - Number(totals.custos || 0);
            const lucratividade = totals.receitas ? (lucro / totals.receitas) : 0;
            const fmtPct = (p) => {
                const v = Math.max(-1, Math.min(1, Number(p || 0)));
                return String(Math.round(v * 100)) + '%';
            };

            const saldoClass = (saldo) => {
                if (saldo > 0) return 'text-green-700';
                if (saldo < 0) return 'text-red-700';
                return 'text-gray-700';
            };

            return `
                <div class="bg-white rounded-lg shadow" data-fin-relatorio-wrapper="1">
                    <div class="p-6 border-b border-gray-200">
                        <div class="flex flex-wrap justify-between items-start gap-3">
                            <h3 class="text-lg font-semibold text-gray-800">Relatórios - Centro de Custos</h3>
                            <div class="flex flex-wrap items-center gap-2">
                                <label class="text-sm text-gray-600">Centro:</label>
                                <select class="px-3 py-2 border border-gray-300 rounded-lg"
                                        onchange="ModuleSystem.financeiro.setRelatorioCentroCustoFilter(this.value)">
                                    <option value="" ${!filterKey ? 'selected' : ''}>Todos</option>
                                    ${centros.map(cc => `<option value="${esc(cc)}" ${filterKey && String(cc) === String(filterKey) ? 'selected' : ''}>${esc(cc)}</option>`).join('')}
                                </select>
                                <button type="button" onclick="ModuleSystem.financeiro.exportRelatorioCentroCustosCsv()"
                                        class="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg transition duration-300"
                                        title="Exportar como CSV (compatível com Excel)">
                                    <i class="fas fa-file-csv mr-2"></i>CSV
                                </button>
                                <button type="button" onclick="ModuleSystem.financeiro.exportRelatorioExcel()"
                                        class="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg transition duration-300"
                                        title="Exportar como planilha Excel (.xlsx)">
                                    <i class="fas fa-file-excel mr-2"></i>Excel
                                </button>
                                <button type="button" onclick="ModuleSystem.financeiro.exportRelatorioPDF()"
                                        class="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg transition duration-300"
                                        title="Exportar como PDF / Imprimir">
                                    <i class="fas fa-file-pdf mr-2"></i>PDF
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div class="text-sm text-green-700">Receitas (Total)</div>
                            <div class="text-xl font-bold text-green-800">${toBR(totals.receitas)}</div>
                        </div>
                        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div class="text-sm text-red-700">Despesas (Total)</div>
                            <div class="text-xl font-bold text-red-800">${toBR(totals.custos)}</div>
                        </div>
                        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div class="text-sm text-gray-700">Saldo (Total)</div>
                            <div class="text-xl font-bold ${saldoClass(totals.saldo)}">${toBR(totals.saldo)}</div>
                        </div>
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div class="text-sm text-blue-700">Lucratividade</div>
                            <div class="text-xl font-bold text-blue-800">${fmtPct(lucratividade)}</div>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Centro de Custos</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receitas</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Despesas</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalhes</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${(rows && rows.length) ? rows.map(r => {
                                    const detalhesId = `cc_${String(r.centroCusto).replace(/[^a-zA-Z0-9]/g,'_')}`;
                                    return `
                                        <tr class="hover:bg-gray-50">
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="text-sm font-medium text-gray-900">${r.centroCusto}</div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${toBR(r.receitas)}</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${toBR(r.custos)}</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold ${saldoClass(r.saldo)}">${toBR(r.saldo)}</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm">
                                                <details id="${detalhesId}">
                                                    <summary class="cursor-pointer text-blue-600 hover:text-blue-900">Ver</summary>
                                                    <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                                                            <div class="font-semibold text-green-800 mb-2">Receitas</div>
                                                            <div class="text-xs text-green-700 mb-2">Contas a receber: ${toBR(r.receitasContas)} • Transações: ${toBR(r.receitasTransacoes)}</div>
                                                            <div class="max-h-56 overflow-auto">
                                                                <table class="w-full text-xs">
                                                                    <thead>
                                                                        <tr class="text-left text-green-900">
                                                                            <th class="py-1 pr-2">Descrição</th>
                                                                            <th class="py-1 pr-2">Status</th>
                                                                            <th class="py-1 pr-2">Venc.</th>
                                                                            <th class="py-1 text-right">Valor</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        ${r.itensReceitas.slice(0, 50).map(it => `
                                                                            <tr class="border-t border-green-200">
                                                                                <td class="py-1 pr-2">${it.descricao || '-'}</td>
                                                                                <td class="py-1 pr-2">${it.status || '-'}</td>
                                                                                <td class="py-1 pr-2">${it.vencimento ? (()=>{ const _s=String(it.vencimento).slice(0,10); const [_y,_m,_d]=_s.split('-'); return `${_d}/${_m}/${_y}`; })() : '-'}</td>
                                                                                <td class="py-1 text-right">${toBR(it.valor)}</td>
                                                                            </tr>
                                                                        `).join('')}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                        <div class="bg-red-50 border border-red-200 rounded-lg p-3">
                                                            <div class="font-semibold text-red-800 mb-2">Despesas</div>
                                                            <div class="text-xs text-red-700 mb-2">Transações (despesas): ${toBR(r.custosTransacoes)}</div>
                                                            <div class="max-h-56 overflow-auto">
                                                                <table class="w-full text-xs">
                                                                    <thead>
                                                                        <tr class="text-left text-red-900">
                                                                            <th class="py-1 pr-2">Descrição</th>
                                                                            <th class="py-1 pr-2">Tipo</th>
                                                                            <th class="py-1 pr-2">Data</th>
                                                                            <th class="py-1 text-right">Valor</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        ${r.itensTransacoes.slice(0, 50).map(it => `
                                                                            <tr class="border-t border-red-200">
                                                                                <td class="py-1 pr-2">${it.descricao || '-'}</td>
                                                                                <td class="py-1 pr-2">${it.tipo || '-'}</td>
                                                                                <td class="py-1 pr-2">${it.data ? (()=>{ const _s=String(it.data).slice(0,10); const [_y,_m,_d]=_s.split('-'); return `${_d}/${_m}/${_y}`; })() : '-'}</td>
                                                                                <td class="py-1 text-right">${toBR(it.valor)}</td>
                                                                            </tr>
                                                                        `).join('')}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </details>
                                            </td>
                                        </tr>
                                    `;
                                }).join('') : `<tr><td colspan="5" class="px-6 py-6 text-sm text-gray-500">Nenhum dado para o filtro selecionado.</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
        ,
        renderDashboardHome() {
            return `
                <div class="bg-white rounded-lg shadow mb-6 overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <div>
                            <div class="text-sm text-gray-500">Financeiro</div>
                            <div class="text-lg font-semibold text-gray-800">Resumo (Dashboard)</div>
                        </div>
                        <div class="flex items-center gap-2">
                            <label for="financeiroDashDate" class="text-sm text-gray-600">Dia:</label>
                            <input id="financeiroDashDate" type="date"
                                   class="px-3 py-2 border border-gray-300 rounded-lg">
                            <button type="button" id="financeiroDashRefresh"
                                    class="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg transition duration-300"
                                    title="Atualizar">
                                <i class="fas fa-rotate"></i>
                            </button>
                        </div>
                    </div>
                    <div id="financeiroDashBody" class="p-6">
                        <div class="text-sm text-gray-500">Carregando...</div>
                    </div>
                </div>
                <div id="financeiroRelatoriosHome" class="mb-6"></div>
            `;
        }
        ,
        initDashboardHome() {
            const root = document.getElementById('financeiroDashBody');
            const btnRefresh = document.getElementById('financeiroDashRefresh');
            const dateInput = document.getElementById('financeiroDashDate');
            const relRoot = document.getElementById('financeiroRelatoriosHome');
            if (!root) return;
            if (root.getAttribute('data-init') === 'true') return;
            root.setAttribute('data-init', 'true');

            const escapeHtml = (s) => String(s == null ? '' : s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');

            const toBR = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const toMoney = (v) => {
                const n = typeof v === 'string' ? Number(String(v).replace(',', '.')) : Number(v);
                return Number.isFinite(n) ? n : 0;
            };
            const ymd = (d) => {
                try { return new Date(d).toISOString().slice(0, 10); } catch { return ''; }
            };
            const today = ymd(new Date());
            const getStoredFocusDate = () => {
                try {
                    const v = window.ModuleSystem && ModuleSystem.data && ModuleSystem.data.ui ? ModuleSystem.data.ui.financeiroFocusDate : '';
                    return v ? String(v).slice(0, 10) : '';
                } catch { return ''; }
            };
            const setStoredFocusDate = (value) => {
                try {
                    if (!(window.ModuleSystem && ModuleSystem.data)) return;
                    ModuleSystem.data.ui = ModuleSystem.data.ui || {};
                    ModuleSystem.data.ui.financeiroFocusDate = value ? String(value).slice(0, 10) : '';
                    if (typeof ModuleSystem.saveData === 'function') ModuleSystem.saveData();
                } catch {}
            };
            const getFocusDate = () => {
                try {
                    const v = dateInput && dateInput.value ? String(dateInput.value).slice(0, 10) : '';
                    if (v) return v;
                } catch {}
                return getStoredFocusDate() || today;
            };
            const isPaid = (status) => {
                const s = String(status || '').toLowerCase();
                return s.includes('pago') || s.includes('baix');
            };
            const sortByVenc = (a, b) => {
                const av = String(a && a.vencimento != null ? a.vencimento : '').slice(0, 10) || '9999-12-31';
                const bv = String(b && b.vencimento != null ? b.vencimento : '').slice(0, 10) || '9999-12-31';
                if (av !== bv) return av.localeCompare(bv);
                return String(a && a.descricao != null ? a.descricao : '').localeCompare(String(b && b.descricao != null ? b.descricao : ''), 'pt-BR');
            };

            const api = async (url) => {
                const r = await fetch(url, { credentials: 'include' });
                const j = await r.json().catch(() => null);
                if (!r.ok) throw new Error((j && j.error) ? j.error : ('Erro HTTP ' + r.status));
                return j;
            };

            const compute = (contasReceber, focusDate) => {
                const contas = Array.isArray(contasReceber) ? contasReceber : [];
                const focus = focusDate ? String(focusDate).slice(0, 10) : today;
                const transacoes = (() => {
                    try {
                        return (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.transacoes)) ? ModuleSystem.data.transacoes : [];
                    } catch {
                        return [];
                    }
                })();

                const receitasAbertas = contas
                    .filter(cr => cr && !isPaid(cr.status))
                    .reduce((acc, cr) => acc + toMoney(cr.valor), 0);
                const receitasVencidas = contas
                    .filter(cr => cr && !isPaid(cr.status) && String(cr.vencimento || '').slice(0, 10) && String(cr.vencimento || '').slice(0, 10) < today)
                    .reduce((acc, cr) => acc + toMoney(cr.valor), 0);
                const receitasPagas = contas
                    .filter(cr => cr && isPaid(cr.status))
                    .reduce((acc, cr) => acc + toMoney(cr.valor), 0);

                const despesas = transacoes.reduce((acc, t) => {
                    const tipo = String(t && t.tipo != null ? t.tipo : '').toLowerCase();
                    const isDesp = tipo.includes('pagar') || tipo.includes('desp') || tipo.includes('custo') || tipo.includes('saída') || tipo.includes('saida');
                    return acc + (isDesp ? toMoney(t && t.valor != null ? t.valor : 0) : 0);
                }, 0);

                const resolveClienteNome = (cr) => {
                    try {
                        const rawId = cr?.clienteId ?? cr?.cliente_id ?? null;
                        const id = rawId != null && String(rawId).trim() !== '' ? String(rawId) : null;
                        if (!id) return (cr?.clienteNome || cr?.cliente_nome || '-');
                        const all = [
                            ...(Array.isArray(ModuleSystem.data?.clientes) ? ModuleSystem.data.clientes : []),
                            ...(Array.isArray(ModuleSystem.data?.leads) ? ModuleSystem.data.leads : [])
                        ];
                        const found = all.find(c => c && c.id != null && String(c.id) === id);
                        return (cr?.clienteNome || cr?.cliente_nome || (found ? (found.nome || found.razao_social || found.empresa) : null) || '-');
                    } catch {
                        return (cr?.clienteNome || cr?.cliente_nome || '-');
                    }
                };

                const ymdOf = (value) => {
                    const v = value == null ? '' : String(value);
                    return v ? v.slice(0, 10) : '';
                };

                const isDespesaTx = (t) => {
                    const tipo = String(t && t.tipo != null ? t.tipo : '').toLowerCase();
                    return tipo.includes('pagar') || tipo.includes('desp') || tipo.includes('custo') || tipo.includes('saída') || tipo.includes('saida');
                };
                const isReceitaTx = (t) => {
                    const tipo = String(t && t.tipo != null ? t.tipo : '').toLowerCase();
                    return tipo.includes('receb') || tipo.includes('receita') || tipo.includes('contas a receber') || tipo === 'r';
                };

                const debitosDia = transacoes
                    .filter(t => t && isDespesaTx(t) && ymdOf(t.data || t.data_vencimento || t.created_at || t.createdAt) === focus)
                    .map(t => ({
                        id: t.id,
                        descricao: t.descricao || '-',
                        valor: toMoney(t.valor),
                        status: t.status || '-',
                        data: ymdOf(t.data || t.data_vencimento || t.created_at || t.createdAt)
                    }));

                const creditosDiaContasPagas = contas
                    .filter(cr => cr && isPaid(cr.status) && ymdOf(cr.dataPagamento ?? cr.data_pagamento ?? cr.data_pagamento_em ?? '') === focus)
                    .map(cr => ({
                        id: cr.id,
                        cliente: resolveClienteNome(cr),
                        descricao: cr.descricao || '-',
                        valor: toMoney(cr.valor),
                        status: cr.status || 'Pago',
                        dataRef: ymdOf(cr.dataPagamento ?? cr.data_pagamento ?? cr.data_pagamento_em ?? '')
                    }));

                const creditosDiaContasVencem = contas
                    .filter(cr => cr && !isPaid(cr.status) && ymdOf(cr.vencimento) === focus)
                    .map(cr => ({
                        id: cr.id,
                        cliente: resolveClienteNome(cr),
                        descricao: cr.descricao || '-',
                        valor: toMoney(cr.valor),
                        status: cr.status || 'Pendente',
                        dataRef: ymdOf(cr.vencimento)
                    }));

                const creditosDiaTransacoes = transacoes
                    .filter(t => t && isReceitaTx(t) && ymdOf(t.data || t.data_vencimento || t.created_at || t.createdAt) === focus)
                    .map(t => ({
                        id: t.id,
                        descricao: t.descricao || '-',
                        valor: toMoney(t.valor),
                        status: t.status || '-',
                        data: ymdOf(t.data || t.data_vencimento || t.created_at || t.createdAt)
                    }));

                const totalsDia = {
                    debitos: debitosDia.reduce((a, x) => a + toMoney(x.valor), 0),
                    creditosPagos: creditosDiaContasPagas.reduce((a, x) => a + toMoney(x.valor), 0),
                    creditosVencem: creditosDiaContasVencem.reduce((a, x) => a + toMoney(x.valor), 0),
                    creditosTransacoes: creditosDiaTransacoes.reduce((a, x) => a + toMoney(x.valor), 0)
                };

                let ccRows = [];
                let ccTotals = { receitas: 0, custos: 0, saldo: 0 };
                try {
                    const out = (window.ModuleSystem && ModuleSystem.financeiro && typeof ModuleSystem.financeiro.getRelatorioCentroCustosData === 'function')
                        ? ModuleSystem.financeiro.getRelatorioCentroCustosData()
                        : null;
                    ccRows = out && Array.isArray(out.rows) ? out.rows : [];
                    ccTotals = out && out.totals ? out.totals : ccTotals;
                } catch {}

                const proximas = contas
                    .filter(cr => cr && !isPaid(cr.status))
                    .filter(cr => String(cr.vencimento || '').slice(0, 10))
                    .sort(sortByVenc)
                    .slice(0, 6);

                return { receitasAbertas, receitasVencidas, receitasPagas, despesas, ccRows, ccTotals, proximas, focusDate: focus, debitosDia, creditosDiaContasPagas, creditosDiaContasVencem, creditosDiaTransacoes, totalsDia };
            };

            const render = (data) => {
                const focus = data && data.focusDate ? String(data.focusDate).slice(0, 10) : getFocusDate();
                const totalReceitas = Number(data.receitasAbertas || 0) + Number(data.receitasPagas || 0);
                const lucro = totalReceitas - Number(data.despesas || 0);
                const lucratividade = totalReceitas ? (lucro / totalReceitas) : 0;
                const lucroClass = lucro > 0 ? 'text-green-700' : (lucro < 0 ? 'text-red-700' : 'text-gray-700');
                const fmtPct = (p) => {
                    const v = Math.max(-1, Math.min(1, Number(p || 0)));
                    return String(Math.round(v * 100)) + '%';
                };

                const topCc = (data.ccRows || []).slice(0, 6);
                const maxAbs = topCc.reduce((m, r) => Math.max(m, Math.abs(Number(r && r.saldo != null ? r.saldo : 0))), 0) || 1;
                const ccBars = (() => {
                    if (!topCc.length) return '<div class="text-sm text-gray-500">Sem dados para centro de custos.</div>';
                    const rowsHtml = topCc.map(r => {
                        const v = Number(r && r.saldo != null ? r.saldo : 0);
                        const w = Math.min(100, Math.round((Math.abs(v) / maxAbs) * 100));
                        const barCls = v >= 0 ? 'bg-green-500' : 'bg-red-500';
                        const textCls = v >= 0 ? 'text-green-700' : 'text-red-700';
                        const cc = escapeHtml(r && r.centroCusto != null ? r.centroCusto : '');
                        return (
                            '<div class="flex items-center gap-3">' +
                                '<div class="w-44 text-xs text-gray-700 truncate" title="' + cc + '">' + cc + '</div>' +
                                '<div class="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">' +
                                    '<div class="' + barCls + ' h-2" style="width:' + String(w) + '%"></div>' +
                                '</div>' +
                                '<div class="w-28 text-xs font-semibold ' + textCls + ' text-right">' + toBR(v) + '</div>' +
                            '</div>'
                        );
                    }).join('');
                    return '<div class="space-y-2">' + rowsHtml + '</div>';
                })();

                const proxHtml = (() => {
                    if (!(data.proximas && data.proximas.length)) return '<div class="text-sm text-gray-500">Sem contas a receber em aberto.</div>';
                    const rowsHtml = data.proximas.map(cr => {
                        const desc = escapeHtml(cr && cr.descricao != null ? cr.descricao : '-');
                        const venc = String(cr && cr.vencimento != null ? cr.vencimento : '').slice(0, 10);
                        const vencBr = venc ? (()=>{ const _s=String(venc).slice(0,10); if(/^\d{4}-\d{2}-\d{2}$/.test(_s)){const [_y,_m,_d]=_s.split('-');return `${_d}/${_m}/${_y}`;}return _s; })() : '-';
                        const valor = toBR(toMoney(cr && cr.valor != null ? cr.valor : 0));
                        return (
                            '<tr>' +
                                '<td class="px-3 py-2 text-sm text-gray-900">' + desc + '</td>' +
                                '<td class="px-3 py-2 text-sm text-gray-700">' + escapeHtml(vencBr) + '</td>' +
                                '<td class="px-3 py-2 text-sm text-gray-900 text-right">' + valor + '</td>' +
                            '</tr>'
                        );
                    }).join('');
                    return (
                        '<div class="overflow-x-auto border rounded-lg">' +
                            '<table class="w-full">' +
                                '<thead class="bg-gray-50">' +
                                    '<tr>' +
                                        '<th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>' +
                                        '<th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vencimento</th>' +
                                        '<th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>' +
                                    '</tr>' +
                                '</thead>' +
                                '<tbody class="bg-white divide-y divide-gray-200">' + rowsHtml + '</tbody>' +
                            '</table>' +
                        '</div>'
                    );
                })();

                const compareChartHtml = (() => {
                    const a = Math.max(0, totalReceitas);
                    const b = Math.max(0, Number(data.despesas || 0));
                    const c = lucro;
                    const maxV = Math.max(a, b, Math.abs(c), 1);
                    // Limitar altura máxima a 85% para sempre mostrar o fundo cinza
                    const h = (v) => Math.min(85, Math.round((Math.min(Math.abs(v), maxV) / maxV) * 85));
                    const lucroBarCls = c >= 0 ? 'bg-green-500' : 'bg-red-500';
                    const lucroTextCls = c >= 0 ? 'text-green-700' : 'text-red-700';
                    const barItem = (heightPct, barCls, label, valueHtml, textCls) => (
                        '<div class="flex-1 flex flex-col items-center" style="min-width:80px">' +
                            '<div class="w-full flex flex-col justify-end" style="height:100px;background:#f3f4f6;border-radius:8px;overflow:hidden;">' +
                                '<div class="w-full ' + barCls + ' transition-all" style="height:' + String(heightPct) + '%;min-height:' + (heightPct > 0 ? '4' : '0') + 'px"></div>' +
                            '</div>' +
                            '<div class="mt-2 text-xs text-gray-600 text-center">' + label + '</div>' +
                            '<div class="text-xs font-semibold ' + textCls + ' text-center">' + valueHtml + '</div>' +
                        '</div>'
                    );
                    return (
                        '<div class="bg-white border border-gray-200 rounded-lg p-4">' +
                            '<div class="flex items-center justify-between mb-3">' +
                                '<div class="font-semibold text-gray-800">Comparação do Fluxo de Caixa</div>' +
                                '<div class="text-xs text-gray-500">Total</div>' +
                            '</div>' +
                            '<div class="flex items-end gap-4" style="padding-bottom:4px">' +
                                barItem(h(a), 'bg-green-500', 'Receitas', toBR(totalReceitas), 'text-green-700') +
                                barItem(h(b), 'bg-red-500', 'Despesas', toBR(data.despesas), 'text-red-700') +
                                barItem(h(c), lucroBarCls, 'Lucro', toBR(lucro), lucroTextCls) +
                            '</div>' +
                        '</div>'
                    );
                })();

                const monthChartHtml = (() => {
                    const contas = (() => {
                        try { return (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.contasReceber)) ? ModuleSystem.data.contasReceber : []; } catch { return []; }
                    })();
                    const transacoes = (() => {
                        try { return (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.transacoes)) ? ModuleSystem.data.transacoes : []; } catch { return []; }
                    })();

                    const monthKey = (d) => {
                        const v = String(d || '').slice(0, 10);
                        if (!v || v.length < 7) return '';
                        return v.slice(0, 7);
                    };
                    const monthLabel = (ym) => {
                        try {
                            const dt = new Date(ym + '-01T00:00:00');
                            const m = dt.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
                            const y = String(dt.getFullYear()).slice(-2);
                            return m + '/' + y;
                        } catch {
                            return ym;
                        }
                    };
                    const lastMonths = (() => {
                        const out = [];
                        const base = new Date();
                        base.setDate(1);
                        for (let i = 5; i >= 0; i--) {
                            const dt = new Date(base.getFullYear(), base.getMonth() - i, 1);
                            const ym = dt.toISOString().slice(0, 7);
                            out.push(ym);
                        }
                        return out;
                    })();

                    const receitasPorMes = {};
                    for (const cr of contas) {
                        if (!cr) continue;
                        const k = monthKey(cr.vencimento);
                        if (!k) continue;
                        receitasPorMes[k] = (receitasPorMes[k] || 0) + toMoney(cr.valor);
                    }
                    const despesasPorMes = {};
                    for (const t of transacoes) {
                        if (!t) continue;
                        const tipo = String(t && t.tipo != null ? t.tipo : '').toLowerCase();
                        const isDesp = tipo.includes('pagar') || tipo.includes('desp') || tipo.includes('custo') || tipo.includes('saída') || tipo.includes('saida');
                        if (!isDesp) continue;
                        const k = monthKey(t.data);
                        if (!k) continue;
                        despesasPorMes[k] = (despesasPorMes[k] || 0) + toMoney(t.valor);
                    }

                    const points = lastMonths.map(ym => {
                        const r = Number(receitasPorMes[ym] || 0);
                        const d = Number(despesasPorMes[ym] || 0);
                        return { ym, receitas: r, despesas: d, saldo: r - d };
                    });
                    const maxV = Math.max(...points.map(p => Math.max(p.receitas, p.despesas)), 1);
                    // Limitar a 85% para sempre mostrar fundo cinza (evitar blocos sólidos)
                    const h = (v) => Math.min(85, Math.round((Math.min(Math.max(v, 0), maxV) / maxV) * 85));
                    // Formatar valor abreviado para caber no label (K/M) com tooltip completo
                    const toShort = (n) => {
                        const abs = Math.abs(n);
                        const sign = n < 0 ? '-' : '';
                        if (abs >= 1000000) return sign + 'R$' + (abs / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'M';
                        if (abs >= 1000) return sign + 'R$' + (abs / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'K';
                        return sign + 'R$' + abs.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
                    };
                    const bars = points.map(p => {
                        const saldoFull = toBR(p.saldo);
                        const saldoShort = toShort(p.saldo);
                        return (
                            '<div class="flex flex-col items-center" style="min-width:72px;max-width:88px">' +
                                '<div class="flex items-end gap-1 w-full" style="height:112px">' +
                                    '<div class="flex-1 rounded overflow-hidden flex items-end" style="height:100%;background:#f3f4f6" title="Receitas: ' + toBR(p.receitas) + '">' +
                                        '<div class="w-full bg-green-500" style="height:' + String(h(p.receitas)) + '%;min-height:' + (h(p.receitas) > 0 ? '3' : '0') + 'px"></div>' +
                                    '</div>' +
                                    '<div class="flex-1 rounded overflow-hidden flex items-end" style="height:100%;background:#f3f4f6" title="Despesas: ' + toBR(p.despesas) + '">' +
                                        '<div class="w-full bg-red-500" style="height:' + String(h(p.despesas)) + '%;min-height:' + (h(p.despesas) > 0 ? '3' : '0') + 'px"></div>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="mt-2 text-xs text-gray-600 text-center">' + escapeHtml(monthLabel(p.ym)) + '</div>' +
                                '<div class="text-[10px] font-semibold text-center ' + (p.saldo >= 0 ? 'text-green-700' : 'text-red-700') + '" title="Saldo: ' + saldoFull + '" style="white-space:nowrap">' + saldoShort + '</div>' +
                            '</div>'
                        );
                    }).join('');

                    return (
                        '<div class="bg-white border border-gray-200 rounded-lg p-4">' +
                            '<div class="flex items-center justify-between mb-3">' +
                                '<div class="font-semibold text-gray-800">Saldo do Mês (últimos 6 meses)</div>' +
                                '<div class="text-xs text-gray-500"><span class="inline-block w-2 h-2 bg-green-500 rounded mr-1"></span>Receitas <span class="inline-block w-2 h-2 bg-red-500 rounded mx-1"></span>Despesas</div>' +
                            '</div>' +
                            '<div class="overflow-x-auto">' +
                                '<div class="flex items-end gap-4 min-w-max">' + bars + '</div>' +
                            '</div>' +
                        '</div>'
                    );
                })();

                const donutHtml = (title, items, valueKey) => {
                    const palette = ['#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#64748b'];
                    const cleaned = (items || [])
                        .map((r) => ({ label: String(r && r.centroCusto != null ? r.centroCusto : 'Sem centro'), value: Number(r && r[valueKey] != null ? r[valueKey] : 0) }))
                        .filter(x => Number.isFinite(x.value) && x.value > 0)
                        .sort((a, b) => b.value - a.value);

                    if (!cleaned.length) {
                        const conic = '#e5e7eb 0% 100%';
                        return (
                            '<div class="bg-white border border-gray-200 rounded-lg p-4">' +
                                '<div class="font-semibold text-gray-800 mb-3">' + escapeHtml(title) + '</div>' +
                                '<div class="flex flex-col md:flex-row gap-4 items-center">' +
                                    '<div class="relative w-40 h-40 rounded-full" style="background:conic-gradient(' + conic + ')">' +
                                        '<div class="absolute inset-6 bg-white rounded-full"></div>' +
                                        '<div class="absolute inset-0 flex items-center justify-center">' +
                                            '<div class="text-center">' +
                                                '<div class="text-xs text-gray-500">Total</div>' +
                                                '<div class="text-sm font-bold text-gray-900">' + toBR(0) + '</div>' +
                                            '</div>' +
                                        '</div>' +
                                    '</div>' +
                                    '<div class="flex-1 w-full space-y-2">' +
                                        '<div class="flex items-center justify-between gap-3">' +
                                            '<div class="flex items-center gap-2 min-w-0">' +
                                                '<span class="inline-block w-2.5 h-2.5 rounded" style="background:#e5e7eb"></span>' +
                                                '<span class="text-xs text-gray-700 truncate">Sem dados</span>' +
                                            '</div>' +
                                            '<div class="text-xs font-semibold text-gray-900">' + toBR(0) + '</div>' +
                                        '</div>' +
                                    '</div>' +
                                '</div>' +
                            '</div>'
                        );
                    }

                    const top = cleaned.slice(0, 5);
                    const rest = cleaned.slice(5);
                    const restSum = rest.reduce((a, x) => a + x.value, 0);
                    if (restSum > 0) top.push({ label: 'Outros', value: restSum });

                    const total = top.reduce((a, x) => a + x.value, 0) || 1;
                    let acc = 0;
                    const parts = top.map((x, idx) => {
                        const pct = (x.value / total) * 100;
                        const start = acc;
                        acc += pct;
                        return { label: x.label, value: x.value, pct, start, end: acc, color: palette[idx % palette.length] };
                    });
                    const conic = parts.map(p => p.color + ' ' + p.start.toFixed(2) + '% ' + p.end.toFixed(2) + '%').join(', ');
                    const legend = parts.map(p => {
                        return (
                            '<div class="flex items-center justify-between gap-3">' +
                                '<div class="flex items-center gap-2 min-w-0">' +
                                    '<span class="inline-block w-2.5 h-2.5 rounded" style="background:' + p.color + '"></span>' +
                                    '<span class="text-xs text-gray-700 truncate" title="' + escapeHtml(p.label) + '">' + escapeHtml(p.label) + '</span>' +
                                '</div>' +
                                '<div class="text-xs font-semibold text-gray-900">' + toBR(p.value) + '</div>' +
                            '</div>'
                        );
                    }).join('');

                    return (
                        '<div class="bg-white border border-gray-200 rounded-lg p-4">' +
                            '<div class="font-semibold text-gray-800 mb-3">' + escapeHtml(title) + '</div>' +
                            '<div class="flex flex-col md:flex-row gap-4 items-center">' +
                                '<div class="relative w-40 h-40 rounded-full" style="background:conic-gradient(' + conic + ')">' +
                                    '<div class="absolute inset-6 bg-white rounded-full"></div>' +
                                    '<div class="absolute inset-0 flex items-center justify-center">' +
                                        '<div class="text-center">' +
                                            '<div class="text-xs text-gray-500">Total</div>' +
                                            '<div class="text-sm font-bold text-gray-900">' + toBR(total) + '</div>' +
                                        '</div>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="flex-1 w-full space-y-2">' + legend + '</div>' +
                            '</div>' +
                        '</div>'
                    );
                };

                const donutsRowHtml = (() => {
                    const src = Array.isArray(data.ccRows) ? data.ccRows : [];
                    return (
                        '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">' +
                            donutHtml('Divisão de Receitas (Centro de Custos)', src, 'receitas') +
                            donutHtml('Divisão de Despesas (Centro de Custos)', src, 'custos') +
                        '</div>'
                    );
                })();

                const dayHtml = (() => {
                    const br = (d) => {
                        try { const _s5301=String(d).slice(0,10); if(/^\d{4}-\d{2}-\d{2}$/.test(_s5301)){const [_y,_m,_dd]=_s5301.split('-');return `${_dd}/${_m}/${_y}`;}return _s5301; } catch { return String(d || ''); }
                    };
                    const debitos = Array.isArray(data.debitosDia) ? data.debitosDia : [];
                    const credPagos = Array.isArray(data.creditosDiaContasPagas) ? data.creditosDiaContasPagas : [];
                    const credVencem = Array.isArray(data.creditosDiaContasVencem) ? data.creditosDiaContasVencem : [];
                    const credTx = Array.isArray(data.creditosDiaTransacoes) ? data.creditosDiaTransacoes : [];
                    const totals = data.totalsDia || {};
                    const totalCreditos = Number(totals.creditosPagos || 0) + Number(totals.creditosVencem || 0) + Number(totals.creditosTransacoes || 0);
                    const totalDebitos = Number(totals.debitos || 0);

                    const debitosRows = debitos.slice(0, 12).map(it => (
                        '<tr class="border-t border-red-200 bg-red-50/60">' +
                            '<td class="px-3 py-2 text-xs text-gray-900">' + escapeHtml(it.descricao || '-') + '</td>' +
                            '<td class="px-3 py-2 text-xs text-gray-700">' + escapeHtml(it.status || '-') + '</td>' +
                            '<td class="px-3 py-2 text-xs text-gray-700">' + escapeHtml(br(it.data || focus)) + '</td>' +
                            '<td class="px-3 py-2 text-xs font-semibold text-right text-red-800">' + toBR(it.valor) + '</td>' +
                        '</tr>'
                    )).join('');

                    const creditRow = (label, it, tone) => (
                        '<tr class="border-t border-green-200 ' + (tone || 'bg-green-50/60') + '">' +
                            '<td class="px-3 py-2 text-xs text-gray-900">' + escapeHtml(label) + '</td>' +
                            '<td class="px-3 py-2 text-xs text-gray-900">' + escapeHtml(it.descricao || '-') + '</td>' +
                            '<td class="px-3 py-2 text-xs text-gray-700">' + escapeHtml(it.status || '-') + '</td>' +
                            '<td class="px-3 py-2 text-xs text-gray-700">' + escapeHtml(br(it.dataRef || it.data || focus)) + '</td>' +
                            '<td class="px-3 py-2 text-xs font-semibold text-right text-green-800">' + toBR(it.valor) + '</td>' +
                        '</tr>'
                    );
                    const creditosRows = []
                        .concat(credPagos.slice(0, 8).map(it => creditRow('Recebido', it, 'bg-green-50/70')))
                        .concat(credVencem.slice(0, 8).map(it => creditRow('Vence hoje', it, 'bg-emerald-50/70')))
                        .concat(credTx.slice(0, 8).map(it => (
                            '<tr class="border-t border-green-200 bg-green-50/60">' +
                                '<td class="px-3 py-2 text-xs text-gray-900">Receita (tx)</td>' +
                                '<td class="px-3 py-2 text-xs text-gray-900">' + escapeHtml(it.descricao || '-') + '</td>' +
                                '<td class="px-3 py-2 text-xs text-gray-700">' + escapeHtml(it.status || '-') + '</td>' +
                                '<td class="px-3 py-2 text-xs text-gray-700">' + escapeHtml(br(it.data || focus)) + '</td>' +
                                '<td class="px-3 py-2 text-xs font-semibold text-right text-green-800">' + toBR(it.valor) + '</td>' +
                            '</tr>'
                        )))
                        .slice(0, 12)
                        .join('');

                    const emptyDeb = '<tr><td colspan="4" class="px-3 py-3 text-xs text-gray-500">Nenhum débito neste dia.</td></tr>';
                    const emptyCred = '<tr><td colspan="5" class="px-3 py-3 text-xs text-gray-500">Nenhum crédito neste dia.</td></tr>';

                    return (
                        '<div class="mb-6 bg-white border border-gray-200 rounded-lg p-4">' +
                            '<div class="flex items-center justify-between gap-3 mb-3">' +
                                '<div class="font-semibold text-gray-800">Movimento do dia</div>' +
                                '<div class="text-xs text-gray-600">Dia: ' + escapeHtml(br(focus)) + '</div>' +
                            '</div>' +
                            '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">' +
                                '<div class="border border-green-200 rounded-lg overflow-hidden">' +
                                    '<div class="bg-green-50 px-3 py-2 flex items-center justify-between">' +
                                        '<div class="text-sm font-semibold text-green-900">Créditos</div>' +
                                        '<div class="text-sm font-bold text-green-900">' + toBR(totalCreditos) + '</div>' +
                                    '</div>' +
                                    '<div class="overflow-x-auto">' +
                                        '<table class="w-full">' +
                                            '<thead class="bg-gray-50">' +
                                                '<tr>' +
                                                    '<th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>' +
                                                    '<th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>' +
                                                    '<th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>' +
                                                    '<th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data</th>' +
                                                    '<th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>' +
                                                '</tr>' +
                                            '</thead>' +
                                            '<tbody class="bg-white divide-y divide-gray-200">' + (creditosRows || emptyCred) + '</tbody>' +
                                        '</table>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="border border-red-200 rounded-lg overflow-hidden">' +
                                    '<div class="bg-red-50 px-3 py-2 flex items-center justify-between">' +
                                        '<div class="text-sm font-semibold text-red-900">Débitos</div>' +
                                        '<div class="text-sm font-bold text-red-900">' + toBR(totalDebitos) + '</div>' +
                                    '</div>' +
                                    '<div class="overflow-x-auto">' +
                                        '<table class="w-full">' +
                                            '<thead class="bg-gray-50">' +
                                                '<tr>' +
                                                    '<th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>' +
                                                    '<th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>' +
                                                    '<th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data</th>' +
                                                    '<th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>' +
                                                '</tr>' +
                                            '</thead>' +
                                            '<tbody class="bg-white divide-y divide-gray-200">' + (debitosRows || emptyDeb) + '</tbody>' +
                                        '</table>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>'
                    );
                })();

                root.innerHTML = (
                    dayHtml +
                    '<div class="grid grid-cols-1 md:grid-cols-4 gap-4">' +
                        '<div class="bg-green-50 border border-green-200 rounded-lg p-4">' +
                            '<div class="text-sm text-green-700">Receitas</div>' +
                            '<div class="text-xl font-bold text-green-800">' + toBR(totalReceitas) + '</div>' +
                            '<div class="text-xs text-green-700 mt-1">Em aberto: ' + toBR(data.receitasAbertas) + ' • Pagas: ' + toBR(data.receitasPagas) + '</div>' +
                        '</div>' +
                        '<div class="bg-red-50 border border-red-200 rounded-lg p-4">' +
                            '<div class="text-sm text-red-700">Despesas</div>' +
                            '<div class="text-xl font-bold text-red-800">' + toBR(data.despesas) + '</div>' +
                            '<div class="text-xs text-red-700 mt-1">Vencidas (receitas): ' + toBR(data.receitasVencidas) + '</div>' +
                        '</div>' +
                        '<div class="bg-gray-50 border border-gray-200 rounded-lg p-4">' +
                            '<div class="text-sm text-gray-700">Lucro / Prejuízo</div>' +
                            '<div class="text-xl font-bold ' + lucroClass + '">' + toBR(lucro) + '</div>' +
                            '<div class="text-xs text-gray-600 mt-1">Receitas - Despesas</div>' +
                        '</div>' +
                        '<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">' +
                            '<div class="text-sm text-blue-700">Lucratividade</div>' +
                            '<div class="text-xl font-bold text-blue-800">' + fmtPct(lucratividade) + '</div>' +
                            '<div class="text-xs text-blue-700 mt-1">Sobre receitas</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">' +
                        compareChartHtml +
                        monthChartHtml +
                    '</div>' +
                    '<div class="mt-6">' +
                        donutsRowHtml +
                    '</div>' +
                    '<div class="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">' +
                        '<div class="bg-white border border-gray-200 rounded-lg p-4">' +
                            '<div class="flex items-center justify-between mb-3">' +
                                '<div class="font-semibold text-gray-800">Top Centros de Custos (Saldo)</div>' +
                                '<div class="text-xs text-gray-500">' + String((data.ccRows || []).length) + ' centros</div>' +
                            '</div>' +
                            ccBars +
                        '</div>' +
                        '<div class="bg-white border border-gray-200 rounded-lg p-4">' +
                            '<div class="flex items-center justify-between mb-3">' +
                                '<div class="font-semibold text-gray-800">Próximos vencimentos</div>' +
                                '<div class="text-xs text-gray-500">' + String((data.proximas || []).length) + ' itens</div>' +
                            '</div>' +
                            proxHtml +
                        '</div>' +
                    '</div>'
                );
            };

            const load = async () => {
                root.innerHTML = '<div class="text-sm text-gray-500">Carregando dados...</div>';
                let contas = [];
                let fetchError = null;
                try {
                    const res = await api('/api/crm/contas-receber');
                    contas = Array.isArray(res) ? res : (Array.isArray(res.data) ? res.data : []);
                    try { if (window.ModuleSystem && ModuleSystem.data) { ModuleSystem.data.contasReceber = contas; if (typeof ModuleSystem.saveData === 'function') ModuleSystem.saveData(); } } catch {}
                } catch (e) {
                    fetchError = e;
                    contas = [];
                }

                try {
                    const focus = getFocusDate();
                    try {
                        if (dateInput && (!dateInput.value || String(dateInput.value).slice(0, 10) !== String(focus).slice(0, 10))) {
                            dateInput.value = String(focus).slice(0, 10);
                        }
                    } catch {}
                    setStoredFocusDate(focus);
                    const d = compute(contas, focus);
                    render(d);
                    try {
                        if (relRoot && window.ModuleSystem && ModuleSystem.financeiro && typeof ModuleSystem.financeiro.listRelatorios === 'function') {
                            relRoot.innerHTML = ModuleSystem.financeiro.listRelatorios();
                        }
                    } catch {}
                    if (fetchError) {
                        try { if (window.Toast) window.Toast.show(fetchError && fetchError.message ? fetchError.message : 'Falha ao carregar contas a receber.', 'error', 12000, true); } catch {}
                    }
                } catch (e) {
                    root.innerHTML = '<div class="text-sm text-red-700">Falha ao carregar dashboard do financeiro.</div>';
                    try { if (window.Toast) window.Toast.show(e && e.message ? e.message : 'Falha ao renderizar dashboard.', 'error', 12000, true); } catch {}
                }
            };

            if (btnRefresh && btnRefresh.getAttribute('data-bound') !== 'true') {
                btnRefresh.setAttribute('data-bound', 'true');
                btnRefresh.addEventListener('click', () => load());
            }

            if (dateInput && dateInput.getAttribute('data-bound') !== 'true') {
                dateInput.setAttribute('data-bound', 'true');
                try {
                    const initValue = getStoredFocusDate() || today;
                    dateInput.value = initValue;
                } catch {}
                dateInput.addEventListener('change', () => load());
            }

            load();
            try {
                setInterval(() => {
                    if (!document.getElementById('financeiroDashBody')) return;
                    if (window._crmSessionExpired) return; // sessão expirada, parar polling
                    load();
                }, 60000);
            } catch {}
        }
    },

    // Módulo Administrativo
    administrativo: {
        initTarefas() {
            try {
                const content = document.getElementById('tarefasAdminContent');
                if (!content) return;
                if (content.getAttribute('data-init') === 'true') return;
                content.setAttribute('data-init', 'true');

                const scripts = Array.from(document.querySelectorAll('#moduleContent script'));
                const target = scripts.find(s => {
                    const t = String(s && s.textContent ? s.textContent : '');
                    return t.includes('tarefasAdminContent') && t.includes('tarefasAdminForm') && t.includes('api/tarefas-admin');
                });
                if (!target) return;
                const code = String(target.textContent || '');
                if (!code.trim()) return;
                (new Function(code))();
            } catch {}
        },
        // Listar tarefas administrativas
        listTarefas() {
            return `
                <div class="bg-white rounded-lg shadow overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <div>
                            <div class="text-sm text-gray-500">Administrativo</div>
                            <div class="text-lg font-semibold text-gray-800">Tarefas Operacionais</div>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" id="tarefasAdminRefresh"
                                    class="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg transition duration-300"
                                    title="Atualizar">
                                <i class="fas fa-rotate"></i>
                            </button>
                            <button type="button" id="tarefasAdminCreate"
                                    class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-300">
                                <i class="fas fa-plus mr-2"></i>Nova Tarefa
                            </button>
                        </div>
                    </div>

                    <div class="px-6 py-3 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-2 items-center">
                        <button type="button" class="tarefasAdminTab bg-blue-600 text-white px-3 py-2 rounded-lg transition duration-300" data-view="kanban">
                            <i class="fas fa-columns mr-2"></i>Kanban
                        </button>
                        <button type="button" class="tarefasAdminTab bg-white hover:bg-gray-100 text-gray-800 px-3 py-2 rounded-lg border border-gray-200 transition duration-300" data-view="calendar">
                            <i class="fas fa-calendar-alt mr-2"></i>Calendário
                        </button>
                        <button type="button" class="tarefasAdminTab bg-white hover:bg-gray-100 text-gray-800 px-3 py-2 rounded-lg border border-gray-200 transition duration-300" data-view="list">
                            <i class="fas fa-list mr-2"></i>Lista
                        </button>
                        <button type="button" class="tarefasAdminTab bg-white hover:bg-gray-100 text-gray-800 px-3 py-2 rounded-lg border border-gray-200 transition duration-300" data-view="reports">
                            <i class="fas fa-chart-column mr-2"></i>Relatórios
                        </button>

                        <div class="ml-auto flex flex-wrap gap-2 items-center">
                            <input id="tarefasAdminSearch" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                   placeholder="Buscar..." style="min-width: 220px;" />
                            <select id="tarefasAdminFilterStatus" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">Todos os status</option>
                                <option value="backlog">Backlog</option>
                                <option value="todo">A Fazer</option>
                                <option value="doing">Em Andamento</option>
                                <option value="review">Revisão</option>
                                <option value="done">Concluídas</option>
                                <option value="cancelled">Canceladas</option>
                            </select>
                            <select id="tarefasAdminFilterUser" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">Todos os responsáveis</option>
                            </select>
                            <label class="flex items-center gap-2 text-sm text-gray-700 px-2 py-1 border border-gray-200 rounded-lg bg-white">
                                <input id="tarefasAdminIncludeAuto" type="checkbox" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                                <span>Mostrar automáticas</span>
                            </label>
                        </div>
                    </div>

                    <div id="tarefasAdminContent" class="p-6">
                        <div class="text-sm text-gray-500">Carregando...</div>
                    </div>
                </div>

                <script>
                    (function () {
                        const api = async (url, opts) => {
                            const res = await fetch(url, Object.assign({ credentials: 'include' }, (opts || {})));
                            let data = null;
                            try { data = await res.json(); } catch {}
                            if (!res.ok) throw new Error((data && data.error) ? data.error : ('Erro HTTP ' + res.status));
                            return data;
                        };

                        const escapeHtml = (s) => String(s == null ? '' : s)
                            .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
                            .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
                            .replaceAll("'", '&#39;');

                        const toYmd = (d) => {
                            try {
                                const dt = (d instanceof Date) ? d : new Date(d);
                                if (Number.isNaN(dt.getTime())) return '';
                                const y = dt.getFullYear();
                                const m = String(dt.getMonth() + 1).padStart(2, '0');
                                const day = String(dt.getDate()).padStart(2, '0');
                                return \`\${y}-\${m}-\${day}\`;
                            } catch {
                                return '';
                            }
                        };

                        const fmtBr = (ymd) => {
                            const s = String(ymd || '').slice(0, 10);
                            if (!s) return '-';
                            try { if(/^\d{4}-\d{2}-\d{2}$/.test(s)){const [_y,_m,_d]=s.split('-');return _d+'/'+_m+'/'+_y;}return s; } catch { return s; }
                        };

                        const prioMeta = (p) => {
                            const v = String(p || 'media').toLowerCase();
                            if (v === 'critica') return { label: 'Crítica', cls: 'bg-red-100 text-red-800' };
                            if (v === 'alta') return { label: 'Alta', cls: 'bg-orange-100 text-orange-800' };
                            if (v === 'baixa') return { label: 'Baixa', cls: 'bg-gray-100 text-gray-800' };
                            return { label: 'Média', cls: 'bg-blue-100 text-blue-800' };
                        };

                        const statusMeta = (s) => {
                            const v = String(s || 'todo').toLowerCase();
                            if (v === 'backlog') return { label: 'Backlog', cls: 'bg-gray-100 text-gray-800' };
                            if (v === 'doing') return { label: 'Em Andamento', cls: 'bg-yellow-100 text-yellow-800' };
                            if (v === 'review') return { label: 'Revisão', cls: 'bg-purple-100 text-purple-800' };
                            if (v === 'done') return { label: 'Concluída', cls: 'bg-green-100 text-green-800' };
                            if (v === 'cancelled') return { label: 'Cancelada', cls: 'bg-red-50 text-red-800' };
                            return { label: 'A Fazer', cls: 'bg-blue-50 text-blue-800' };
                        };

                        const notify = (kind, msg) => {
                            try {
                                if (window.Utils && Utils.notifications && typeof Utils.notifications[kind] === 'function') {
                                    Utils.notifications[kind](msg);
                                    return;
                                }
                            } catch {}
                            alert(msg);
                        };

                        const state = {
                            view: 'kanban',
                            tasks: [],
                            users: [],
                            search: '',
                            status: '',
                            responsavelId: '',
                            includeAuto: false,
                            me: null,
                            calendarRef: new Date()
                        };

                        const normalizeRole = (r) => String(r || '').trim().toLowerCase();
                        const isManagerOrAdmin = (r) => {
                            const role = normalizeRole(r);
                            return role === 'administrador' || role === 'admin' ||
                                role === 'gerente' || role === 'gerencia' || role === 'gerência' ||
                                role === 'gestor' || role === 'gestao' || role === 'gestão';
                        };
                        const canDeleteTask = (t) => {
                            if (!t) return false;
                            const me = state.me;
                            if (!me || me.id == null) return false;
                            if (isManagerOrAdmin(me.role)) return true;
                            const uid = String(me.id);
                            if (String(t.criado_por || '') === uid) return true;
                            if (String(t.responsavel_id || '') === uid) return true;
                            const raw = t.envolvidos_json != null ? t.envolvidos_json : null;
                            if (raw) {
                                try {
                                    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                                    if (Array.isArray(parsed) && parsed.map(x => String(x)).includes(uid)) return true;
                                } catch {}
                            }
                            return false;
                        };
                        const deleteTaskById = async (id) => {
                            const taskId = String(id || '').trim();
                            if (!taskId) return;
                            if (!confirm('Excluir esta tarefa?')) return;
                            await api('/api/tarefas-admin/' + encodeURIComponent(taskId), { method: 'DELETE' });
                            notify('success', 'Tarefa excluída.');
                            await refresh(false);
                        };

                        const els = {
                            content: () => document.getElementById('tarefasAdminContent'),
                            tabs: () => Array.from(document.querySelectorAll('.tarefasAdminTab')),
                            btnCreate: () => document.getElementById('tarefasAdminCreate'),
                            btnRefresh: () => document.getElementById('tarefasAdminRefresh'),
                            search: () => document.getElementById('tarefasAdminSearch'),
                            fStatus: () => document.getElementById('tarefasAdminFilterStatus'),
                            fUser: () => document.getElementById('tarefasAdminFilterUser'),
                            includeAuto: () => document.getElementById('tarefasAdminIncludeAuto')
                        };

                        const fetchAll = async () => {
                            const qs = new URLSearchParams();
                            if (state.search) qs.set('q', state.search);
                            if (state.status) qs.set('status', state.status);
                            if (state.responsavelId) qs.set('responsavel_id', state.responsavelId);
                            if (state.includeAuto) qs.set('include_auto', '1');
                            const [tasks, users] = await Promise.all([
                                api('/api/tarefas-admin?' + qs.toString()),
                                api('/api/crm/users')
                            ]);
                            state.tasks = Array.isArray(tasks) ? tasks : [];
                            state.users = Array.isArray(users) ? users : [];
                        };

                        const hydrateUserFilter = () => {
                            const sel = els.fUser();
                            if (!sel) return;
                            const cur = String(state.responsavelId || '');
                            const opts = ['<option value="">Todos os responsáveis</option>'].concat(
                                state.users.map(u => \`<option value="\${u.id}">\${escapeHtml(u.name || u.email || ('Usuário #' + u.id))}</option>\`)
                            );
                            sel.innerHTML = opts.join('');
                            sel.value = cur;
                        };

                        const filteredTasks = () => {
                            const q = String(state.search || '').trim().toLowerCase();
                            const st = String(state.status || '').trim().toLowerCase();
                            const uid = String(state.responsavelId || '');
                            return state.tasks.filter(t => {
                                if (!t) return false;
                                if (st && String(t.status || '').toLowerCase() !== st) return false;
                                if (uid && String(t.responsavel_id || '') !== uid) return false;
                                if (!q) return true;
                                const blob = \`\${t.titulo || ''} \${t.descricao || ''} \${t.tipo || ''} \${t.responsavel_nome || ''} \${t.responsavel_email || ''}\`.toLowerCase();
                                return blob.includes(q);
                            });
                        };

                        const openTaskModal = (mode, task) => {
                            if (!window.FormSystem || typeof FormSystem.openModal !== 'function') {
                                notify('error', 'FormSystem não disponível para abrir modal.');
                                return;
                            }
                            const t = task || {};
                            const title = mode === 'edit' ? 'Editar Tarefa' : 'Nova Tarefa';
                            const userOptions = ['<option value="">(Sem responsável)</option>'].concat(
                                state.users.map(u => \`<option value="\${u.id}">\${escapeHtml(u.name || u.email || ('Usuário #' + u.id))}</option>\`)
                            ).join('');
                            const content = \`
                                <form id="tarefasAdminForm" class="space-y-4" data-mode="\${mode}" data-id="\${t.id || ''}">
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">Título *</label>
                                            <input name="titulo" required value="\${escapeHtml(t.titulo || '')}"
                                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                                            <input name="tipo" value="\${escapeHtml(t.tipo || '')}"
                                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                   placeholder="Ex: Financeiro, Compras, Operação..." />
                                        </div>
                                    </div>

                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                                        <textarea name="descricao" rows="4"
                                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">\${escapeHtml(t.descricao || '')}</textarea>
                                    </div>

                                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                            <select name="status" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                                <option value="backlog">Backlog</option>
                                                <option value="todo" selected>A Fazer</option>
                                                <option value="doing">Em Andamento</option>
                                                <option value="review">Revisão</option>
                                                <option value="done">Concluída</option>
                                                <option value="cancelled">Cancelada</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">Prioridade</label>
                                            <select name="prioridade" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                                <option value="baixa">Baixa</option>
                                                <option value="media" selected>Média</option>
                                                <option value="alta">Alta</option>
                                                <option value="critica">Crítica</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">Responsável</label>
                                            <select name="responsavel_id" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                                \${userOptions}
                                            </select>
                                        </div>
                                    </div>

                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">Data início</label>
                                            <input name="data_inicio" type="date" value="\${escapeHtml(String(t.data_inicio || '').slice(0,10))}"
                                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">Prazo</label>
                                            <input name="data_vencimento" type="date" value="\${escapeHtml(String(t.data_vencimento || '').slice(0,10))}"
                                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                        </div>
                                    </div>

                                    <div class="flex justify-end gap-3 pt-2">
                                        \${t.id ? \`<button type="button" id="tarefasAdminDelete" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition duration-300"><i class="fas fa-trash mr-2"></i>Excluir</button>\` : ''}
                                        <button type="button" data-close-modal class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-300">Cancelar</button>
                                        <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-300">Salvar</button>
                                    </div>
                                </form>
                            \`;
                            FormSystem.openModal(title, content);

                            const form = document.getElementById('tarefasAdminForm');
                            if (!form) return;
                            form.querySelector('select[name="status"]').value = String(t.status || 'todo');
                            form.querySelector('select[name="prioridade"]').value = String(t.prioridade || 'media');
                            form.querySelector('select[name="responsavel_id"]').value = t.responsavel_id != null ? String(t.responsavel_id) : '';

                            const delBtn = document.getElementById('tarefasAdminDelete');
                            if (delBtn) {
                                delBtn.addEventListener('click', async () => {
                                    if (!confirm('Excluir esta tarefa?')) return;
                                    try {
                                        await api('/api/tarefas-admin/' + t.id, { method: 'DELETE' });
                                        notify('success', 'Tarefa excluída.');
                                        await refresh();
                                        try { FormSystem.closeModal(); } catch {}
                                    } catch (e) {
                                        notify('error', e && e.message ? e.message : 'Erro ao excluir.');
                                    }
                                });
                            }

                            form.addEventListener('submit', async (ev) => {
                                ev.preventDefault();
                                const fd = new FormData(form);
                                const payload = {
                                    titulo: String(fd.get('titulo') || '').trim(),
                                    tipo: String(fd.get('tipo') || '').trim(),
                                    descricao: String(fd.get('descricao') || '').trim(),
                                    status: String(fd.get('status') || 'todo'),
                                    prioridade: String(fd.get('prioridade') || 'media'),
                                    responsavel_id: fd.get('responsavel_id') ? Number(fd.get('responsavel_id')) : null,
                                    data_inicio: fd.get('data_inicio') ? String(fd.get('data_inicio')) : null,
                                    data_vencimento: fd.get('data_vencimento') ? String(fd.get('data_vencimento')) : null
                                };
                                try {
                                    if (mode === 'edit' && t.id) {
                                        await api('/api/tarefas-admin/' + t.id, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(payload)
                                        });
                                        notify('success', 'Tarefa atualizada.');
                                    } else {
                                        await api('/api/tarefas-admin', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(payload)
                                        });
                                        notify('success', 'Tarefa criada.');
                                    }
                                    await refresh();
                                    try { FormSystem.closeModal(); } catch {}
                                } catch (e) {
                                    notify('error', e && e.message ? e.message : 'Erro ao salvar.');
                                }
                            });
                        };

                        const renderKanban = () => {
                            const cols = [
                                { key: 'backlog', title: 'Backlog', cls: 'bg-gray-50 border-gray-200' },
                                { key: 'todo', title: 'A Fazer', cls: 'bg-blue-50 border-blue-200' },
                                { key: 'doing', title: 'Em Andamento', cls: 'bg-yellow-50 border-yellow-200' },
                                { key: 'review', title: 'Revisão', cls: 'bg-purple-50 border-purple-200' },
                                { key: 'done', title: 'Concluídas', cls: 'bg-green-50 border-green-200' }
                            ];
                            const tasks = filteredTasks();
                            const today = toYmd(new Date());

                            const by = {};
                            for (const c of cols) by[c.key] = [];
                            for (const t of tasks) {
                                const st = String(t.status || 'todo').toLowerCase();
                                const bucket = by[st] ? st : 'todo';
                                by[bucket].push(t);
                            }

                            const card = (t) => {
                                const pr = prioMeta(t.prioridade);
                                const st = statusMeta(t.status);
                                const due = String(t.data_vencimento || '').slice(0, 10);
                                const overdue = due && due < today && String(t.status || '') !== 'done';
                                return \`
                                    <div class="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition duration-300 cursor-pointer"
                                         draggable="true" data-id="\${t.id}">
                                        <div class="flex items-start justify-between gap-2">
                                            <div class="min-w-0">
                                                <div class="text-sm font-semibold text-gray-900 truncate">\${escapeHtml(t.titulo || 'Tarefa')}</div>
                                                <div class="text-xs text-gray-500 mt-0.5">\${escapeHtml(t.tipo || '')}</div>
                                            </div>
                                            <div class="flex items-center gap-2">
                                                <span class="px-2 py-1 text-xs rounded-full \${pr.cls}">\${pr.label}</span>
                                                \${canDeleteTask(t) ? \`<button type="button" class="text-red-600 hover:text-red-800" title="Excluir" data-task-del="\${t.id}"><i class="fas fa-trash"></i></button>\` : ''}
                                            </div>
                                        </div>
                                        <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                            <span class="px-2 py-1 rounded-full \${st.cls}">\${st.label}</span>
                                            \${overdue ? '<span class="px-2 py-1 rounded-full bg-red-100 text-red-800">Atrasada</span>' : ''}
                                            <span class="text-gray-600">\${due ? ('Prazo: ' + fmtBr(due)) : 'Sem prazo'}</span>
                                        </div>
                                        <div class="mt-2 text-xs text-gray-600 truncate">
                                            <i class="fas fa-user mr-1"></i>\${escapeHtml(t.responsavel_nome || t.responsavel_email || 'Sem responsável')}
                                        </div>
                                    </div>
                                \`;
                            };

                            const html = \`
                                <div class="flex gap-3 overflow-x-auto pb-2">
                                    \${cols.map(c => \`
                                        <div class="border rounded-lg \${c.cls}" style="min-width: 280px; width: 320px;">
                                            <div class="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
                                                <div class="font-semibold text-gray-800">\${c.title}</div>
                                                <div class="text-xs text-gray-500">\${(by[c.key] || []).length}</div>
                                            </div>
                                            <div class="p-3 space-y-2 tarefasAdminDropzone" data-status="\${c.key}">
                                                \${(by[c.key] || []).map(card).join('') || '<div class="text-xs text-gray-500">Sem itens</div>'}
                                            </div>
                                        </div>
                                    \`).join('')}
                                </div>
                            \`;
                            els.content().innerHTML = html;

                            const attachDnD = () => {
                                const cards = Array.from(document.querySelectorAll('[draggable="true"][data-id]'));
                                for (const c of cards) {
                                    c.addEventListener('dragstart', (ev) => {
                                        ev.dataTransfer.setData('text/plain', String(c.getAttribute('data-id') || ''));
                                        ev.dataTransfer.effectAllowed = 'move';
                                    });
                                    c.addEventListener('click', () => {
                                        const id = Number(c.getAttribute('data-id'));
                                        const t = state.tasks.find(x => Number(x.id) === id);
                                        if (t) openTaskModal('edit', t);
                                    });
                                }
                                try {
                                    const root = els.content();
                                    const delButtons = Array.from(root.querySelectorAll('button[data-task-del]'));
                                    for (const b of delButtons) {
                                        b.addEventListener('click', async (ev) => {
                                            ev.preventDefault();
                                            ev.stopPropagation();
                                            try { await deleteTaskById(b.getAttribute('data-task-del')); } catch (e) { notify('error', e && e.message ? e.message : 'Erro ao excluir.'); }
                                        });
                                    }
                                } catch {}
                                const zones = Array.from(document.querySelectorAll('.tarefasAdminDropzone'));
                                for (const z of zones) {
                                    z.addEventListener('dragover', (ev) => { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; });
                                    z.addEventListener('drop', async (ev) => {
                                        ev.preventDefault();
                                        const id = Number(ev.dataTransfer.getData('text/plain'));
                                        const st = String(z.getAttribute('data-status') || 'todo');
                                        if (!id) return;
                                        try {
                                            await api('/api/tarefas-admin/' + id, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ status: st })
                                            });
                                            await refresh(false);
                                        } catch (e) {
                                            notify('error', e && e.message ? e.message : 'Erro ao mover tarefa.');
                                        }
                                    });
                                }
                            };
                            attachDnD();
                        };

                        const renderList = () => {
                            const tasks = filteredTasks();
                            const today = toYmd(new Date());
                            const rows = tasks.map(t => {
                                const pr = prioMeta(t.prioridade);
                                const st = statusMeta(t.status);
                                const due = String(t.data_vencimento || '').slice(0, 10);
                                const overdue = due && due < today && String(t.status || '') !== 'done';
                                return \`
                                    <tr class="hover:bg-gray-50 cursor-pointer" data-id="\${t.id}">
                                        <td class="px-4 py-3">
                                            <div class="text-sm font-semibold text-gray-900">\${escapeHtml(t.titulo || '')}</div>
                                            <div class="text-xs text-gray-500">\${escapeHtml(t.tipo || '')}</div>
                                        </td>
                                        <td class="px-4 py-3 text-sm">
                                            <span class="px-2 py-1 rounded-full \${st.cls} text-xs font-semibold">\${st.label}</span>
                                        </td>
                                        <td class="px-4 py-3 text-sm">
                                            <span class="px-2 py-1 rounded-full \${pr.cls} text-xs font-semibold">\${pr.label}</span>
                                        </td>
                                        <td class="px-4 py-3 text-sm text-gray-700">\${escapeHtml(t.responsavel_nome || t.responsavel_email || '-')}</td>
                                        <td class="px-4 py-3 text-sm">
                                            <span class="\${overdue ? 'text-red-700 font-semibold' : 'text-gray-700'}">\${due ? fmtBr(due) : '-'}</span>
                                        </td>
                                        <td class="px-4 py-3 text-sm text-right whitespace-nowrap">
                                            <button type="button" class="text-blue-600 hover:text-blue-900 mr-3" title="Editar" data-task-edit="\${t.id}"><i class="fas fa-pen"></i></button>
                                            \${canDeleteTask(t) ? \`<button type="button" class="text-red-600 hover:text-red-900" title="Excluir" data-task-del="\${t.id}"><i class="fas fa-trash"></i></button>\` : ''}
                                        </td>
                                    </tr>
                                \`;
                            }).join('');

                            els.content().innerHTML = \`
                                <div class="overflow-x-auto">
                                    <table class="w-full">
                                        <thead class="bg-gray-50">
                                            <tr>
                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarefa</th>
                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridade</th>
                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsável</th>
                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prazo</th>
                                                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody class="bg-white divide-y divide-gray-200">
                                            \${rows || '<tr><td colspan="6" class="px-4 py-6 text-sm text-gray-500">Nenhuma tarefa encontrada.</td></tr>'}
                                        </tbody>
                                    </table>
                                </div>
                            \`;
                            try {
                                const root = els.content();
                                const editBtns = Array.from(root.querySelectorAll('button[data-task-edit]'));
                                for (const b of editBtns) {
                                    b.addEventListener('click', (ev) => {
                                        ev.preventDefault();
                                        ev.stopPropagation();
                                        const id = Number(b.getAttribute('data-task-edit'));
                                        const t = state.tasks.find(x => Number(x.id) === id);
                                        if (t) openTaskModal('edit', t);
                                    });
                                }
                                const delBtns = Array.from(root.querySelectorAll('button[data-task-del]'));
                                for (const b of delBtns) {
                                    b.addEventListener('click', async (ev) => {
                                        ev.preventDefault();
                                        ev.stopPropagation();
                                        try { await deleteTaskById(b.getAttribute('data-task-del')); } catch (e) { notify('error', e && e.message ? e.message : 'Erro ao excluir.'); }
                                    });
                                }
                            } catch {}
                            const trs = Array.from(els.content().querySelectorAll('tr[data-id]'));
                            for (const tr of trs) {
                                tr.addEventListener('click', () => {
                                    const id = Number(tr.getAttribute('data-id'));
                                    const t = state.tasks.find(x => Number(x.id) === id);
                                    if (t) openTaskModal('edit', t);
                                });
                            }
                        };

                        const renderCalendar = () => {
                            const ref = state.calendarRef instanceof Date ? state.calendarRef : new Date();
                            const y = ref.getFullYear();
                            const m = ref.getMonth();
                            const first = new Date(y, m, 1);
                            const start = new Date(first);
                            start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
                            const days = [];
                            for (let i = 0; i < 42; i++) {
                                const d = new Date(start);
                                d.setDate(start.getDate() + i);
                                days.push(d);
                            }

                            const tasks = filteredTasks().filter(t => String(t.data_vencimento || '').slice(0, 10));
                            const byDay = new Map();
                            for (const t of tasks) {
                                const k = String(t.data_vencimento || '').slice(0, 10);
                                if (!k) continue;
                                if (!byDay.has(k)) byDay.set(k, []);
                                byDay.get(k).push(t);
                            }

                            const monthLabel = new Date(y, m, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                            const weekday = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

                            const cell = (d) => {
                                const ymd = toYmd(d);
                                const inMonth = d.getMonth() === m;
                                const list = byDay.get(ymd) || [];
                                const count = list.length;
                                const top = list.slice(0, 3).map(t => \`<div class="truncate">\${escapeHtml(t.titulo || '')}</div>\`).join('');
                                return \`
                                    <div class="border border-gray-200 rounded-lg p-2 \${inMonth ? 'bg-white' : 'bg-gray-50'} tarefasAdminCalCell" data-ymd="\${ymd}">
                                        <div class="flex items-center justify-between">
                                            <div class="text-xs font-semibold \${inMonth ? 'text-gray-900' : 'text-gray-400'}">\${d.getDate()}</div>
                                            \${count ? \`<div class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">\${count}</div>\` : ''}
                                        </div>
                                        <div class="mt-1 text-[11px] text-gray-600 space-y-0.5">\${top}</div>
                                    </div>
                                \`;
                            };

                            els.content().innerHTML = \`
                                <div class="flex items-center justify-between mb-3">
                                    <button type="button" id="tarefasAdminCalPrev" class="bg-white hover:bg-gray-100 text-gray-800 px-3 py-2 rounded-lg border border-gray-200 transition duration-300">
                                        <i class="fas fa-chevron-left"></i>
                                    </button>
                                    <div class="font-semibold text-gray-800 capitalize">\${escapeHtml(monthLabel)}</div>
                                    <button type="button" id="tarefasAdminCalNext" class="bg-white hover:bg-gray-100 text-gray-800 px-3 py-2 rounded-lg border border-gray-200 transition duration-300">
                                        <i class="fas fa-chevron-right"></i>
                                    </button>
                                </div>
                                <div class="grid grid-cols-7 gap-2 mb-2">
                                    \${weekday.map(w => \`<div class="text-xs font-semibold text-gray-500 text-center">\${w}</div>\`).join('')}
                                </div>
                                <div class="grid grid-cols-7 gap-2">
                                    \${days.map(cell).join('')}
                                </div>
                                <div class="mt-4 text-xs text-gray-500">Clique em um dia para filtrar pelo prazo.</div>
                            \`;

                            const prev = document.getElementById('tarefasAdminCalPrev');
                            const next = document.getElementById('tarefasAdminCalNext');
                            if (prev) prev.addEventListener('click', async () => { state.calendarRef = new Date(y, m - 1, 1); renderCalendar(); });
                            if (next) next.addEventListener('click', async () => { state.calendarRef = new Date(y, m + 1, 1); renderCalendar(); });
                            const cells = Array.from(document.querySelectorAll('.tarefasAdminCalCell[data-ymd]'));
                            for (const c of cells) {
                                c.addEventListener('click', async () => {
                                    const ymd = c.getAttribute('data-ymd') || '';
                                    if (!ymd) return;
                                    state.search = '';
                                    const s = els.search();
                                    if (s) s.value = '';
                                    try {
                                        const qs = new URLSearchParams();
                                        if (state.status) qs.set('status', state.status);
                                        if (state.responsavelId) qs.set('responsavel_id', state.responsavelId);
                                        qs.set('from', ymd);
                                        qs.set('to', ymd);
                                        const tasks = await api('/api/tarefas-admin?' + qs.toString());
                                        state.tasks = Array.isArray(tasks) ? tasks : [];
                                        setView('list');
                                    } catch (e) {
                                        notify('error', e && e.message ? e.message : 'Erro ao filtrar.');
                                    }
                                });
                            }
                        };

                        const renderReports = () => {
                            const tasks = filteredTasks();
                            const byUser = new Map();
                            for (const t of tasks) {
                                const key = t.responsavel_id != null ? String(t.responsavel_id) : '';
                                if (!byUser.has(key)) byUser.set(key, { total: 0, done: 0, overdue: 0, label: t.responsavel_nome || t.responsavel_email || 'Sem responsável' });
                                const row = byUser.get(key);
                                row.total++;
                                if (String(t.status || '') === 'done') row.done++;
                                const due = String(t.data_vencimento || '').slice(0, 10);
                                if (due) {
                                    const today = toYmd(new Date());
                                    if (due < today && String(t.status || '') !== 'done') row.overdue++;
                                }
                            }

                            const lines = Array.from(byUser.entries()).map(([k, v]) => {
                                return \`
                                    <tr class="border-t border-gray-200">
                                        <td class="px-4 py-3 text-sm font-semibold text-gray-900">\${escapeHtml(v.label)}</td>
                                        <td class="px-4 py-3 text-sm text-gray-700">\${v.total}</td>
                                        <td class="px-4 py-3 text-sm text-gray-700">\${v.done}</td>
                                        <td class="px-4 py-3 text-sm text-gray-700">\${v.overdue}</td>
                                    </tr>
                                \`;
                            }).join('');

                            const totals = tasks.reduce((acc, t) => {
                                acc.total++;
                                if (String(t.status || '') === 'done') acc.done++;
                                return acc;
                            }, { total: 0, done: 0 });

                            els.content().innerHTML = \`
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <div class="text-xs text-blue-700 font-semibold">Total de tarefas</div>
                                        <div class="text-2xl font-bold text-blue-900">\${totals.total}</div>
                                    </div>
                                    <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div class="text-xs text-green-700 font-semibold">Concluídas</div>
                                        <div class="text-2xl font-bold text-green-900">\${totals.done}</div>
                                    </div>
                                    <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                        <div class="text-xs text-gray-700 font-semibold">Pendentes</div>
                                        <div class="text-2xl font-bold text-gray-900">\${Math.max(0, totals.total - totals.done)}</div>
                                    </div>
                                </div>
                                <div class="overflow-x-auto">
                                    <table class="w-full">
                                        <thead class="bg-gray-50">
                                            <tr>
                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsável</th>
                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Concluídas</th>
                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Atrasadas</th>
                                            </tr>
                                        </thead>
                                        <tbody class="bg-white">
                                            \${lines || '<tr><td colspan="4" class="px-4 py-6 text-sm text-gray-500">Sem dados.</td></tr>'}
                                        </tbody>
                                    </table>
                                </div>
                            \`;
                        };

                        const setView = (view) => {
                            state.view = view || 'kanban';
                            const tabs = els.tabs();
                            for (const t of tabs) {
                                const v = t.getAttribute('data-view') || '';
                                if (v === state.view) {
                                    t.className = 'tarefasAdminTab bg-blue-600 text-white px-3 py-2 rounded-lg transition duration-300';
                                } else {
                                    t.className = 'tarefasAdminTab bg-white hover:bg-gray-100 text-gray-800 px-3 py-2 rounded-lg border border-gray-200 transition duration-300';
                                }
                            }
                            if (state.view === 'list') renderList();
                            else if (state.view === 'calendar') renderCalendar();
                            else if (state.view === 'reports') renderReports();
                            else renderKanban();
                        };

                        const refresh = async (showToast = true) => {
                            try {
                                els.content().innerHTML = '<div class="text-sm text-gray-500">Atualizando...</div>';
                                await fetchAll();
                                hydrateUserFilter();
                                try {
                                    const openId = window.__tarefasAdminOpenId != null ? String(window.__tarefasAdminOpenId).trim() : '';
                                    if (openId) {
                                        let t = state.tasks.find(x => x && x.id != null && String(x.id) === openId);
                                        if (!t) {
                                            try { t = await api('/api/tarefas-admin/' + encodeURIComponent(openId)); } catch {}
                                        }
                                        if (t) {
                                            window.__tarefasAdminOpenId = '';
                                            openTaskModal('edit', t);
                                        }
                                    }
                                } catch {}
                                setView(state.view);
                                if (showToast) notify('success', 'Atualizado.');
                            } catch (e) {
                                els.content().innerHTML = '<div class="text-sm text-red-700">Falha ao carregar tarefas.</div>';
                                notify('error', e && e.message ? e.message : 'Falha ao carregar.');
                            }
                        };

                        const bind = () => {
                            const create = els.btnCreate();
                            const refreshBtn = els.btnRefresh();
                            const search = els.search();
                            const fStatus = els.fStatus();
                            const fUser = els.fUser();
                            const includeAuto = els.includeAuto();

                            if (create) create.addEventListener('click', () => openTaskModal('create', null));
                            if (refreshBtn) refreshBtn.addEventListener('click', () => refresh(false));

                            for (const t of els.tabs()) {
                                t.addEventListener('click', () => setView(t.getAttribute('data-view') || 'kanban'));
                            }

                            const applyFilters = () => {
                                state.search = search ? String(search.value || '').trim() : '';
                                state.status = fStatus ? String(fStatus.value || '').trim() : '';
                                state.responsavelId = fUser ? String(fUser.value || '').trim() : '';
                                setView(state.view);
                            };

                            if (search) search.addEventListener('input', () => applyFilters());
                            if (fStatus) fStatus.addEventListener('change', () => applyFilters());
                            if (fUser) fUser.addEventListener('change', () => applyFilters());
                            if (includeAuto) {
                                includeAuto.checked = !!state.includeAuto;
                                includeAuto.addEventListener('change', async () => {
                                    state.includeAuto = !!includeAuto.checked;
                                    await refresh(false);
                                });
                            }
                        };

                        setTimeout(async () => {
                            bind();
                            try {
                                const me = await api('/api/crm/me');
                                const u = me && me.user ? me.user : null;
                                state.me = u;
                                if (u && u.id != null && !isManagerOrAdmin(u.role)) {
                                    state.responsavelId = String(u.id);
                                }
                            } catch {}
                            await refresh(false);
                        }, 0);
                    })();
                </script>
            `;
        }
    },

    // Módulo Jurídico
    juridico: {
        // Listar demandas jurídicas
        listDemandas() {
            const demandas = ModuleSystem.data.demandasJuridicas || [];
            return `
                <div class="bg-white rounded-lg shadow">
                    <div class="p-6 border-b border-gray-200">
                        <div class="flex justify-between items-center">
                            <h3 class="text-lg font-semibold text-gray-800">Demandas Jurídicas</h3>
                            <button data-action="create" data-module="demandasJuridicas" 
                                    class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-300">
                                <i class="fas fa-plus mr-2"></i>Nova Demanda
                            </button>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processo</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prazo</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${demandas.map(demanda => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="text-sm font-medium text-gray-900">${demanda.numeroProcesso}</div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${demanda.tipo}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${demanda.cliente}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${demanda.status === 'Resolvido' ? 'bg-green-100 text-green-800' : 
                                                  demanda.status === 'Em Andamento' ? 'bg-yellow-100 text-yellow-800' : 
                                                  'bg-red-100 text-red-800'}">
                                                ${demanda.status}
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ${new Date(demanda.prazo).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button data-action="read" data-module="demandasJuridicas" data-id="${demanda.id}"
                                    class="text-blue-600 hover:text-blue-900"
                                    title="Visualizar demanda jurídica"
                                    aria-label="Visualizar detalhes da demanda jurídica ${demanda.titulo}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button data-action="update" data-module="demandasJuridicas" data-id="${demanda.id}"
                                    class="text-green-600 hover:text-green-900"
                                    title="Editar demanda jurídica"
                                    aria-label="Editar demanda jurídica ${demanda.titulo}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button data-action="delete" data-module="demandasJuridicas" data-id="${demanda.id}"
                                    class="text-red-600 hover:text-red-900"
                                    title="Excluir demanda jurídica"
                                    aria-label="Excluir demanda jurídica ${demanda.titulo}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    },

    // Módulo Administração
    administracao: {
        // Listar usuários do sistema
        listUsuarios() {
            return `
                <div class="bg-white rounded-lg shadow overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <div>
                            <div class="text-sm text-gray-500">Administração</div>
                            <div class="text-lg font-semibold text-gray-800">Usuários</div>
                        </div>
                        <div class="flex items-center gap-2">
                            <select id="adminUsersRoleFilter" class="border rounded-lg px-3 py-2 text-sm">
                                <option value="">Todos os perfis</option>
                                <option value="vendedor">Vendedor</option>
                                <option value="comercial">Comercial</option>
                                <option value="marketing">Marketing</option>
                                <option value="gerente">Gerente</option>
                                <option value="administrador">Administrador</option>
                            </select>
                            <select id="adminUsersStatusFilter" class="border rounded-lg px-3 py-2 text-sm">
                                <option value="ativos">Ativos</option>
                                <option value="todos" selected>Todos</option>
                                <option value="inativos">Inativos</option>
                            </select>
                            <button id="adminUsersReload" class="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg text-sm">
                                <i class="fas fa-sync-alt mr-2"></i>Atualizar
                            </button>
                            <button id="adminUsersNew" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm">
                                <i class="fas fa-plus mr-2"></i>Novo Usuário
                            </button>
                        </div>
                    </div>
                    <div class="p-4">
                        <div class="text-xs text-gray-600 mb-3">
                            Cadastre colaboradores e conceda acessos conforme a necessidade. Por padrão, o novo usuário inicia sem módulos liberados.
                        </div>
                        <div class="overflow-x-auto border rounded-lg">
                            <table class="w-full">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Perfil</th>
                                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Último login</th>
                                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="adminUsersBody" class="bg-white divide-y divide-gray-200">
                                    <tr><td colspan="6" class="px-3 py-3 text-sm text-gray-500">Carregando...</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <div id="adminUsersStatus" class="mt-3 text-sm text-gray-600"></div>
                    </div>
                </div>
            `;
        }
        ,
        listComissoes() {
            return `
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="bg-white rounded-lg shadow overflow-hidden">
                        <div class="px-6 py-4 border-b border-gray-200">
                            <div class="text-sm text-gray-500">Administração</div>
                            <div class="text-lg font-semibold text-gray-800">Regra Padrão de Comissão</div>
                        </div>
                        <div class="p-6 space-y-4">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Percentual Base (%)</label>
                                    <input id="commDefaultBase" type="number" min="0" max="100" step="0.01" class="w-full px-3 py-2 border rounded-lg">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Percentual Bônus (%)</label>
                                    <input id="commDefaultBonus" type="number" min="0" max="100" step="0.01" class="w-full px-3 py-2 border rounded-lg">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Limiar de Bônus (ex.: 1.0)</label>
                                    <input id="commDefaultThreshold" type="number" min="0.01" step="0.01" class="w-full px-3 py-2 border rounded-lg">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Base de Cálculo</label>
                                    <select id="commDefaultBaseStatus" class="w-full px-3 py-2 border rounded-lg">
                                        <option value="pagas">Pagas</option>
                                        <option value="faturadas">Faturadas</option>
                                    </select>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <button id="commDefaultSave" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">Salvar</button>
                                <div id="commDefaultStatus" class="text-sm text-gray-600"></div>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-lg shadow overflow-hidden">
                        <div class="px-6 py-4 border-b border-gray-200">
                            <div class="text-sm text-gray-500">Administração</div>
                            <div class="text-lg font-semibold text-gray-800">Regras por Usuário</div>
                        </div>
                        <div class="p-6 space-y-4">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="md:col-span-2">
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
                                    <select id="commUserSelect" class="w-full px-3 py-2 border rounded-lg"></select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Percentual Base (%)</label>
                                    <input id="commUserBase" type="number" min="0" max="100" step="0.01" class="w-full px-3 py-2 border rounded-lg">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Percentual Bônus (%)</label>
                                    <input id="commUserBonus" type="number" min="0" max="100" step="0.01" class="w-full px-3 py-2 border rounded-lg">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Limiar de Bônus</label>
                                    <input id="commUserThreshold" type="number" min="0.01" step="0.01" class="w-full px-3 py-2 border rounded-lg">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Base de Cálculo</label>
                                    <select id="commUserBaseStatus" class="w-full px-3 py-2 border rounded-lg">
                                        <option value="pagas">Pagas</option>
                                        <option value="faturadas">Faturadas</option>
                                    </select>
                                </div>
                            </div>

                            <div class="flex items-center gap-2">
                                <button id="commUserSave" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg">Salvar</button>
                                <button id="commUserDelete" class="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">Remover Regra</button>
                                <div id="commUserStatus" class="text-sm text-gray-600"></div>
                            </div>

                            <div class="border rounded-lg overflow-hidden">
                                <div class="px-4 py-3 bg-gray-50 text-sm font-medium text-gray-800">Overrides cadastrados</div>
                                <div class="overflow-x-auto">
                                    <table class="w-full">
                                        <thead class="bg-gray-50">
                                            <tr>
                                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
                                                <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Base</th>
                                                <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Bônus</th>
                                                <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Limiar</th>
                                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Base Status</th>
                                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody id="commRulesBody" class="bg-white divide-y divide-gray-200">
                                            <tr><td colspan="6" class="px-4 py-3 text-sm text-gray-500">Carregando...</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },
        initUsuarios() {
            const body = document.getElementById('adminUsersBody');
            const btnReload = document.getElementById('adminUsersReload');
            const btnNew = document.getElementById('adminUsersNew');
            const roleFilter = document.getElementById('adminUsersRoleFilter');
            const statusFilter = document.getElementById('adminUsersStatusFilter');
            const statusEl = document.getElementById('adminUsersStatus');
            if (!body || !btnReload || !btnNew || !roleFilter || !statusFilter) return;

            let usersCache = [];

            const toast = (msg, type = 'info') => {
                if (window.Toast && typeof window.Toast.show === 'function') {
                    const t = type === 'error' ? 12000 : (type === 'success' ? 4500 : 5000);
                    return window.Toast.show(msg, type, t, type === 'error');
                }
                if (window.NotificationSystem && typeof window.NotificationSystem[type] === 'function') return window.NotificationSystem[type](msg);
                alert(msg);
            };

            const api = async (url, opt = {}) => {
                let r;
                try {
                    r = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opt });
                } catch (e) {
                    const msg = e && e.message ? String(e.message) : 'Falha de conexão';
                    throw new Error(`Falha de conexão com o servidor (${msg})`);
                }
                const raw = await r.text().catch(() => '');
                let j = null;
                try { j = raw ? JSON.parse(raw) : null; } catch {}
                if (!r.ok) {
                    const serverMsg = (j && j.error) ? String(j.error) : (raw ? String(raw).slice(0, 300) : '');
                    const suffix = ` (HTTP ${r.status})`;
                    throw new Error(serverMsg ? `${serverMsg}${suffix}` : `Falha na API${suffix}`);
                }
                return j;
            };

            const setInlineError = (elementId, msg) => {
                try {
                    const el = document.getElementById(elementId);
                    if (!el) return;
                    const text = String(msg || '').trim();
                    if (!text) {
                        el.textContent = '';
                        el.classList.add('hidden');
                        return;
                    }
                    el.textContent = text;
                    el.classList.remove('hidden');
                } catch {}
            };

            let passwordPolicyCache = null;
            let passwordPolicyLoading = null;
            const formatPasswordPolicyText = (policy) => {
                try {
                    const p = policy && typeof policy === 'object' ? policy : null;
                    if (!p) return 'Regras de senha: padrão do sistema.';
                    const items = [];
                    const minLength = Number(p.minLength);
                    if (Number.isFinite(minLength) && minLength > 0) items.push(`mínimo ${minLength} caracteres`);
                    if (p.requireUpper) items.push('1 letra maiúscula');
                    if (p.requireLower) items.push('1 letra minúscula');
                    if (p.requireNumber) items.push('1 número');
                    if (p.requireSpecial) items.push('1 caractere especial');
                    if (!items.length) return 'Regras de senha: padrão do sistema.';
                    return `Regras de senha: ${items.join(' • ')}.`;
                } catch {
                    return 'Regras de senha: padrão do sistema.';
                }
            };
            const ensurePasswordPolicy = async () => {
                if (passwordPolicyCache != null) return passwordPolicyCache;
                if (passwordPolicyLoading) return passwordPolicyLoading;
                passwordPolicyLoading = (async () => {
                    try {
                        const settings = await api('/api/admin/settings');
                        const sec = settings && typeof settings === 'object' ? settings.seguranca : null;
                        const policy = sec && typeof sec === 'object' ? sec.passwordPolicy : null;
                        passwordPolicyCache = policy && typeof policy === 'object' ? policy : null;
                    } catch {
                        passwordPolicyCache = null;
                    } finally {
                        passwordPolicyLoading = null;
                    }
                    return passwordPolicyCache;
                })();
                return passwordPolicyLoading;
            };
            const hydratePasswordPolicy = async (elementId) => {
                const el = document.getElementById(elementId);
                if (!el) return;
                try {
                    el.textContent = 'Regras de senha: carregando...';
                } catch {}
                const policy = await ensurePasswordPolicy().catch(() => null);
                try {
                    el.textContent = formatPasswordPolicyText(policy);
                } catch {}
            };

            const roleLabel = (r) => {
                const s = String(r || '').toLowerCase();
                if (s === 'administrador' || s === 'admin') return 'Administrador';
                if (s === 'gerente' || s === 'gerencia' || s === 'gerência' || s === 'gestor' || s === 'gestao' || s === 'gestão') return 'Gerente';
                if (s === 'vendedor' || s === 'vendas') return 'Vendedor';
                if (s === 'comercial') return 'Comercial';
                if (s === 'marketing') return 'Marketing';
                return r || '—';
            };

            const normalizeRole = (r) => {
                const s = String(r || '').trim().toLowerCase();
                if (s === 'admin') return 'administrador';
                if (s === 'gerencia' || s === 'gerência' || s === 'gestor' || s === 'gestao' || s === 'gestão') return 'gerente';
                return s;
            };

            const allModules = [
                { key: 'marketing', label: 'Marketing' },
                { key: 'comercial', label: 'Comercial' },
                { key: 'projetos', label: 'Projetos' },
                { key: 'montagem', label: 'Montagem' },
                { key: 'financeiro', label: 'Financeiro' },
                { key: 'administrativo', label: 'Administrativo' },
                { key: 'juridico', label: 'Jurídico' },
                { key: 'kanban', label: 'Kanban' },
                { key: 'administracao', label: 'Administração' }
            ];

            const defaultModulesByRole = (role) => {
                const r = normalizeRole(role);
                const all = allModules.map(m => m.key);
                if (r === 'administrador') return all;
                if (r === 'gerente') return ['marketing', 'comercial', 'projetos', 'montagem', 'financeiro', 'administrativo', 'juridico', 'kanban'];
                if (r === 'marketing') return ['marketing', 'kanban'];
                if (r === 'projetos') return ['projetos', 'kanban'];
                if (r === 'montagem') return ['montagem', 'kanban'];
                if (r === 'financeiro') return ['financeiro', 'kanban'];
                if (r === 'administrativo') return ['administrativo', 'kanban'];
                if (r === 'juridico') return ['juridico', 'kanban'];
                if (r === 'vendedor' || r === 'vendas' || r === 'comercial') return ['marketing', 'comercial', 'financeiro', 'kanban'];
                return ['kanban'];
            };

            const getCreatorAllowedModules = () => {
                try {
                    const current =
                        (window.AuthSystem && typeof window.AuthSystem.getCurrentUser === 'function')
                            ? (window.AuthSystem.getCurrentUser() || null)
                            : ((window.AuthSystem && window.AuthSystem.currentUser) ? window.AuthSystem.currentUser : null);
                    const role = normalizeRole(current && current.role != null ? current.role : '');
                    if (role === 'administrador') return new Set(allModules.map(m => m.key));
                    const mods = Array.isArray(current && current.modules) ? current.modules : [];
                    return new Set(mods.map(x => String(x).trim().toLowerCase()).filter(Boolean));
                } catch {
                    return new Set();
                }
            };

            const parseUserModules = (u) => {
                const raw = u && (u.modules_json != null ? u.modules_json : (u.modulesJson != null ? u.modulesJson : null));
                if (raw != null) {
                    try {
                        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                        if (Array.isArray(parsed)) return parsed.map(x => String(x));
                    } catch {}
                }
                if (Array.isArray(u && u.modules)) return u.modules.map(x => String(x));
                return null;
            };

            const parseUserPermissions = (u) => {
                const raw = u && (u.permissions_json != null ? u.permissions_json : (u.permissionsJson != null ? u.permissionsJson : null));
                if (raw != null) {
                    try {
                        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                        if (Array.isArray(parsed)) return parsed.map(x => String(x));
                    } catch {}
                }
                if (Array.isArray(u && u.permissions)) return u.permissions.map(x => String(x));
                return [];
            };

            const openPasswordModal = (user) => {
                const u = user || {};
                const id = u.id != null ? String(u.id) : '';
                if (!id) {
                    toast('ID do usuário inválido', 'error');
                    return;
                }
                const label = u.name || u.email ? ` • ${String(u.name || u.email)}` : '';
                const title = `Redefinir senha${label}`;
                const content = `
                    <form id="admin-user-password-form" class="space-y-4" autocomplete="off">
                        <input type="hidden" name="id" value="${id}">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
                            <input name="password" type="password" required autocomplete="new-password"
                                   class="w-full px-3 py-2 border rounded-lg">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
                            <input name="password_confirm" type="password" required autocomplete="new-password"
                                   class="w-full px-3 py-2 border rounded-lg">
                        </div>
                        <div id="adminPwdPolicyInfoReset" class="text-xs text-gray-500">Regras de senha: carregando...</div>
                        <div id="adminUserPwdError" class="text-sm text-red-600 hidden"></div>
                    </form>
                `;

                if (window.FormSystem && typeof window.FormSystem.openModal === 'function') {
                    window.FormSystem.openModal(title, content);
                    try {
                        const saveBtn = document.getElementById('modal-save');
                        if (saveBtn) {
                            saveBtn.type = 'button';
                            saveBtn.removeAttribute('form');
                            saveBtn.classList.remove('hidden');
                            saveBtn.disabled = false;
                            saveBtn.textContent = 'Salvar';
                            saveBtn.onclick = null;
                        }
                        const dashboardBtn = document.getElementById('modal-dashboard');
                        if (dashboardBtn) dashboardBtn.classList.add('hidden');
                    } catch {}
                } else {
                    toast('FormSystem não disponível para abrir modal', 'error');
                    return;
                }

                hydratePasswordPolicy('adminPwdPolicyInfoReset');

                const form = document.getElementById('admin-user-password-form');
                if (!form) return;
                let saving = false;
                const tryRecoverCreateByReactivatingInactive = async (payload, errorMessage) => {
                    const msg = String(errorMessage || '');
                    const looksLikeEmailConflict = /email\s+j[aá]\s+cadastrado/i.test(msg) || /http\s*409/i.test(msg);
                    if (!looksLikeEmailConflict) return false;

                    const emailTarget = String(payload && payload.email ? payload.email : '').trim().toLowerCase();
                    if (!emailTarget) return false;

                    let users = [];
                    try {
                        users = await api('/api/admin/users');
                    } catch {
                        return false;
                    }

                    const existing = (Array.isArray(users) ? users : []).find(u => {
                        const e = String(u && u.email != null ? u.email : '').trim().toLowerCase();
                        return e === emailTarget;
                    });
                    if (!existing) return false;
                    if (Number(existing.active) === 1) return false;

                    const label = String(existing.name || existing.email || existing.id || '').trim();
                    const ok = confirm(`Já existe um usuário desativado com este e-mail (${label}). Deseja reativar e atualizar este usuário com os dados informados?`);
                    if (!ok) return false;

                    const reactivatePayload = { ...payload, active: 1 };
                    await api(`/api/admin/users/${encodeURIComponent(existing.id)}`, { method: 'PUT', body: JSON.stringify(reactivatePayload) });
                    toast('Usuário desativado reativado e atualizado com sucesso.', 'success');
                    try { window.FormSystem.closeModal(); } catch {}
                    await refresh();
                    return true;
                };
                const runSave = async () => {
                    if (saving) return;
                    saving = true;
                    try {
                        setInlineError('adminUserPwdError', '');
                        const fd = new FormData(form);
                        const password = String(fd.get('password') || '').trim();
                        const confirm = String(fd.get('password_confirm') || '').trim();
                        if (!password) {
                            setInlineError('adminUserPwdError', 'Informe a nova senha.');
                            toast('Informe a nova senha.', 'error');
                            return;
                        }
                        if (password !== confirm) {
                            setInlineError('adminUserPwdError', 'As senhas não conferem.');
                            toast('As senhas não conferem.', 'error');
                            return;
                        }
                        await api(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ password }) });
                        toast('Senha atualizada.', 'success');
                        try { window.FormSystem.closeModal(); } catch {}
                        await refresh();
                    } catch (err) {
                        const msg = err && err.message ? err.message : 'Falha ao atualizar senha';
                        setInlineError('adminUserPwdError', msg);
                        toast(msg, 'error');
                    } finally {
                        saving = false;
                    }
                };
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await runSave();
                });
                try {
                    const saveBtn = document.getElementById('modal-save');
                    if (saveBtn) {
                        saveBtn.onclick = async (ev) => {
                            try { ev && ev.preventDefault && ev.preventDefault(); } catch {}
                            await runSave();
                        };
                    }
                } catch {}
            };

            const openUserModal = (mode, user = null, defaultRole = '') => {
                const isEdit = mode === 'edit';
                const u = user || {};
                const id = u.id != null ? String(u.id) : '';
                const displayName = String(u.name || '').trim();
                const displayEmail = String(u.email || '').trim();
                const displayLabel = [displayName, displayEmail].filter(Boolean).join(' • ');
                const title = isEdit ? (displayLabel ? `Editar Usuário • ${displayLabel}` : `Editar Usuário #${id}`) : 'Novo Usuário';
                const roleValue = (u.role != null ? String(u.role) : '') || defaultRole || 'comercial';
                const activeChecked = isEdit ? (Number(u.active) === 1) : true;
                const creatorAllowed = getCreatorAllowedModules();
                const userModulesInitial = parseUserModules(u);
                const initialModulesRaw = (userModulesInitial && userModulesInitial.length) ? userModulesInitial : [];
                const initialModules = Array.isArray(initialModulesRaw)
                    ? initialModulesRaw.map(x => String(x).trim().toLowerCase()).filter(Boolean)
                    : [];
                const userPermissionsInitial = parseUserPermissions(u);
                const roleNormalized = normalizeRole(roleValue);

                const permissionEditorHtml = (window.PermissionSystem && typeof window.PermissionSystem.generatePermissionCheckboxes === 'function') 
                    ? window.PermissionSystem.generatePermissionCheckboxes(userPermissionsInitial, normalizeRole(roleValue) === 'administrador')
                    : '<div class="text-sm text-gray-500">Sistema de permissões não disponível.</div>';

                const content = `
                    <form id="admin-user-form" class="space-y-4" autocomplete="off">
                        ${isEdit ? `<input type="hidden" name="id" value="${id}">` : ''}
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                                <input name="name" type="text" required value="${(u.name || '').replace(/"/g, '&quot;')}"
                                       class="w-full px-3 py-2 border rounded-lg">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input name="email" type="email" required value="${(u.email || '').replace(/"/g, '&quot;')}"
                                       class="w-full px-3 py-2 border rounded-lg">
                            </div>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
                                <select name="role" class="w-full px-3 py-2 border rounded-lg">
                                    <option value="vendedor" ${String(roleValue).toLowerCase() === 'vendedor' ? 'selected' : ''}>Vendedor</option>
                                    <option value="comercial" ${String(roleValue).toLowerCase() === 'comercial' ? 'selected' : ''}>Comercial</option>
                                    <option value="marketing" ${String(roleValue).toLowerCase() === 'marketing' ? 'selected' : ''}>Marketing</option>
                                    <option value="gerente" ${String(roleValue).toLowerCase() === 'gerente' ? 'selected' : ''}>Gerente</option>
                                    <option value="administrador" ${String(roleValue).toLowerCase() === 'administrador' ? 'selected' : ''}>Administrador</option>
                                </select>
                            </div>
                            <div class="flex items-center gap-2 mt-6">
                                <input id="adminUserActive" name="active" type="checkbox" ${activeChecked ? 'checked' : ''}>
                                <label for="adminUserActive" class="text-sm text-gray-700">Ativo</label>
                            </div>
                        </div>
                        <div class="border rounded-lg p-4">
                            <div class="text-sm font-medium text-gray-800 mb-2">Acesso a módulos</div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                                ${allModules.map((m, idx) => {
                                    const checkboxId = `adminUserMod_${m.key}_${id || 'new'}_${idx}`;
                                    const creatorDisabled = !creatorAllowed.has(m.key);
                                    const roleDisabled = m.key === 'administracao' && roleNormalized !== 'administrador';
                                    const disabled = creatorDisabled || roleDisabled;
                                    const checked = roleDisabled ? false : initialModules.includes(m.key);
                                    const lockReason = creatorDisabled && checked ? 'creator' : '';
                                    return `
                                        <label for="${checkboxId}" class="flex items-center gap-2 text-sm text-gray-700">
                                            <input id="${checkboxId}" type="checkbox" name="modules" value="${m.key}"
                                                   ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} ${lockReason ? `data-lock-reason="${lockReason}"` : ''}
                                                   class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                                            <span>${m.label}</span>
                                        </label>
                                    `;
                                }).join('')}
                            </div>
                            <div class="mt-2 text-xs text-gray-500">O novo usuário inicia sem módulos. Libere os módulos e, em seguida, as permissões granulares desejadas.</div>
                        </div>

                        <div class="border rounded-lg p-4 max-h-96 overflow-y-auto">
                            <div class="text-sm font-medium text-gray-800 mb-2">Permissões Granulares</div>
                            ${permissionEditorHtml}
                        </div>

                        ${isEdit ? `
                            <div class="flex items-center justify-between gap-3 border rounded-lg p-3 bg-gray-50">
                                <div class="text-sm text-gray-700">Senha é gerenciada separadamente.</div>
                                <button type="button" id="adminUserResetPwd" class="px-3 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white">Redefinir senha</button>
                            </div>
                        ` : `
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                                    <input name="password" type="password" required autocomplete="new-password"
                                           class="w-full px-3 py-2 border rounded-lg">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
                                    <input name="password_confirm" type="password" required autocomplete="new-password"
                                           class="w-full px-3 py-2 border rounded-lg">
                                </div>
                            </div>
                            <div id="adminPwdPolicyInfoCreate" class="text-xs text-gray-500">Regras de senha: carregando...</div>
                        `}
                        <div id="adminUserFormError" class="text-sm text-red-600 hidden"></div>
                    </form>
                `;

                if (window.FormSystem && typeof window.FormSystem.openModal === 'function') {
                    window.FormSystem.openModal(title, content);
                    try {
                        const saveBtn = document.getElementById('modal-save');
                        if (saveBtn) {
                            saveBtn.type = 'button';
                            saveBtn.removeAttribute('form');
                            saveBtn.classList.remove('hidden');
                            saveBtn.disabled = false;
                            saveBtn.textContent = 'Salvar';
                            saveBtn.onclick = null;
                        }
                        const dashboardBtn = document.getElementById('modal-dashboard');
                        if (dashboardBtn) dashboardBtn.classList.add('hidden');
                    } catch {}
                } else {
                    toast('FormSystem não disponível para abrir modal', 'error');
                    return;
                }

                if (!isEdit) hydratePasswordPolicy('adminPwdPolicyInfoCreate');

                const form = document.getElementById('admin-user-form');
                if (!form) return;
                if (isEdit) {
                    const btnPwd = document.getElementById('adminUserResetPwd');
                    if (btnPwd) btnPwd.addEventListener('click', () => openPasswordModal({ id, name: u.name, email: u.email }));
                }
                try {
                    const roleSel = form.querySelector('select[name="role"]');
                    if (roleSel) {
                        roleSel.addEventListener('change', () => {
                            const nextRole = String(roleSel.value || '').trim();
                            const checkboxes = Array.from(form.querySelectorAll('input[name="modules"]'));
                            checkboxes.forEach(cb => {
                                if (!cb) return;
                                const val = String(cb.value || '').trim().toLowerCase();
                                const creatorDisabled = !creatorAllowed.has(val);
                                const roleDisabled = val === 'administracao' && normalizeRole(nextRole) !== 'administrador';
                                cb.disabled = creatorDisabled || roleDisabled;
                                if (roleDisabled && cb.checked) cb.checked = false;
                                if (creatorDisabled) {
                                    if (cb.checked) cb.dataset.lockReason = 'creator';
                                    else cb.dataset.lockReason = '';
                                    return;
                                }
                                cb.dataset.lockReason = '';
                            });
                            
                            syncPermissionLocks();

                            const adminWarning = document.getElementById('admin-permission-warning');
                            if (adminWarning) {
                                if (nextRole === 'administrador' || nextRole === 'admin') {
                                    adminWarning.classList.remove('hidden');
                                    adminWarning.innerHTML = `
                                        <div class="flex items-center">
                                            <i class="fas fa-crown text-purple-600 mr-2"></i>
                                            <span class="text-purple-800 font-medium">Este usuário é administrador e possui todas as permissões automaticamente. As seleções abaixo serão salvas, mas o administrador ignora essas restrições.</span>
                                        </div>
                                    `;
                                    adminWarning.className = 'bg-purple-50 border border-purple-200 p-4 rounded-lg mb-4';
                                } else {
                                    adminWarning.classList.add('hidden');
                                    adminWarning.innerHTML = '';
                                    adminWarning.className = 'hidden';
                                }
                            }
                        });
                    }
                } catch {}

                const permissionToAccessModule = (permKey) => {
                    const raw = permKey != null ? String(permKey) : '';
                    const seg = raw.split('.')[0] ? String(raw.split('.')[0]).trim().toLowerCase() : '';
                    if (seg === 'admin') return 'administracao';
                    return seg;
                };

                const syncPermissionLocks = () => {
                    try {
                        const roleSel = form.querySelector('select[name="role"]');
                        const roleNow = normalizeRole(roleSel ? roleSel.value : roleValue);
                        const moduleInputs = Array.from(form.querySelectorAll('input[name="modules"]'));
                        const modulesFromEnabled = moduleInputs
                            .filter(cb => cb && cb.checked && !cb.disabled)
                            .map(cb => String(cb.value || '').trim().toLowerCase())
                            .filter(Boolean);
                        const modulesFromLocked = moduleInputs
                            .filter(cb => cb && cb.checked && cb.disabled && cb.dataset && cb.dataset.lockReason === 'creator')
                            .map(cb => String(cb.value || '').trim().toLowerCase())
                            .filter(Boolean);
                        const moduleSet = new Set([...modulesFromEnabled, ...modulesFromLocked]);

                        const blocks = Array.from(form.querySelectorAll('[data-perm-module]'));
                        blocks.forEach(block => {
                            const permModule = String(block.getAttribute('data-perm-module') || '').trim().toLowerCase();
                            const accessModule = permModule === 'admin' ? 'administracao' : permModule;
                            const allowAdminPerms = permModule !== 'admin' || roleNow === 'administrador';
                            const enabled = allowAdminPerms && moduleSet.has(accessModule);
                            if (enabled) block.classList.remove('opacity-60');
                            else block.classList.add('opacity-60');

                            const permInputs = Array.from(block.querySelectorAll('input[name="permissions"]'));
                            permInputs.forEach(cb => {
                                if (!cb) return;
                                cb.disabled = !enabled;
                                if (!enabled && cb.checked) cb.checked = false;
                            });
                            const btns = Array.from(block.querySelectorAll('button'));
                            btns.forEach(b => {
                                if (!b) return;
                                b.disabled = !enabled;
                            });
                        });
                    } catch {}
                };

                try {
                    const moduleInputs = Array.from(form.querySelectorAll('input[name="modules"]'));
                    moduleInputs.forEach(cb => {
                        cb.addEventListener('change', () => {
                            syncPermissionLocks();
                        });
                    });
                } catch {}

                try {
                    form.addEventListener('click', (e) => {
                        const t = e && e.target ? e.target.closest('button') : null;
                        if (!t) return;
                        const onclick = t.getAttribute('onclick') || '';
                        if (onclick.includes('PermissionSystem.applyProfile')) {
                            setTimeout(() => syncPermissionLocks(), 0);
                        }
                    });
                } catch {}

                syncPermissionLocks();

                let saving = false;

                // Função de recuperação: reativar usuário inativo com mesmo e-mail
                const tryRecoverCreateByReactivatingInactive = async (payload, errorMessage) => {
                    const msg = String(errorMessage || '');
                    const looksLikeEmailConflict = /email\s+j[aá]\s+cadastrado/i.test(msg) || /http\s*409/i.test(msg) || /409/i.test(msg) || /duplicate/i.test(msg) || /já existe/i.test(msg);
                    if (!looksLikeEmailConflict) return false;

                    const emailTarget = String(payload && payload.email ? payload.email : '').trim().toLowerCase();
                    if (!emailTarget) return false;

                    let users = [];
                    try {
                        users = await api('/api/admin/users');
                    } catch {
                        return false;
                    }

                    const existing = (Array.isArray(users) ? users : []).find(u => {
                        const e = String(u && u.email != null ? u.email : '').trim().toLowerCase();
                        return e === emailTarget;
                    });
                    if (!existing) return false;
                    if (Number(existing.active) === 1) return false;

                    const label = String(existing.name || existing.email || existing.id || '').trim();
                    const ok = confirm(`Já existe um usuário desativado com este e-mail (${label}). Deseja reativar e atualizar este usuário com os dados informados?`);
                    if (!ok) return false;

                    const reactivatePayload = { ...payload, active: 1 };
                    await api(`/api/admin/users/${encodeURIComponent(existing.id)}`, { method: 'PUT', body: JSON.stringify(reactivatePayload) });
                    toast('Usuário desativado reativado e atualizado com sucesso.', 'success');
                    try { window.FormSystem.closeModal(); } catch {}
                    await refresh();
                    return true;
                };

                const runSave = async () => {
                    if (saving) return;
                    saving = true;
                    try {
                        setInlineError('adminUserFormError', '');
                        const fd = new FormData(form);
                        const moduleInputs = Array.from(form.querySelectorAll('input[name="modules"]'));
                        const modulesFromEnabled = moduleInputs
                            .filter(cb => cb && cb.checked && !cb.disabled)
                            .map(cb => String(cb.value || '').trim().toLowerCase())
                            .filter(Boolean);
                        const modulesFromLocked = moduleInputs
                            .filter(cb => cb && cb.checked && cb.disabled && cb.dataset && cb.dataset.lockReason === 'creator')
                            .map(cb => String(cb.value || '').trim().toLowerCase())
                            .filter(Boolean);
                        const modules = Array.from(new Set([...modulesFromEnabled, ...modulesFromLocked]));
                        const moduleSet = new Set(modules);
                        const permissions = fd.getAll('permissions')
                            .map(v => String(v))
                            .filter(Boolean)
                            .filter(p => {
                                const accessModule = permissionToAccessModule(p);
                                if (!accessModule) return false;
                                if (accessModule === 'administracao') {
                                    const roleSel = form.querySelector('select[name="role"]');
                                    const roleNow = normalizeRole(roleSel ? roleSel.value : roleValue);
                                    if (roleNow !== 'administrador') return false;
                                }
                                return moduleSet.has(accessModule);
                            });
                        
                        const payload = {
                            name: String(fd.get('name') || '').trim(),
                            email: String(fd.get('email') || '').trim(),
                            role: String(fd.get('role') || '').trim(),
                            active: fd.get('active') ? 1 : 0,
                            modules,
                            permissions
                        };
                        if (!isEdit) {
                            const password = String(fd.get('password') || '').trim();
                            const confirm = String(fd.get('password_confirm') || '').trim();
                            if (!password) {
                                setInlineError('adminUserFormError', 'Informe a senha.');
                                toast('Informe a senha.', 'error');
                                return;
                            }
                            if (password !== confirm) {
                                setInlineError('adminUserFormError', 'As senhas não conferem.');
                                toast('As senhas não conferem.', 'error');
                                return;
                            }
                            payload.password = password;
                        }

                        if (isEdit) {
                            await api(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) });
                            toast('Usuário atualizado.', 'success');
                        } else {
                            try {
                                await api('/api/admin/users', { method: 'POST', body: JSON.stringify(payload) });
                                toast('Usuário criado com sucesso!', 'success');
                            } catch (createErr) {
                                const createMsg = createErr && createErr.message ? createErr.message : 'Falha ao criar usuário';
                                const recovered = await tryRecoverCreateByReactivatingInactive(payload, createMsg);
                                if (recovered) return;
                                throw createErr;
                            }
                        }
                        try { window.FormSystem.closeModal(); } catch {}
                        setTimeout(() => refresh(), 100);
                    } catch (err) {
                        const msg = err && err.message ? err.message : 'Falha ao salvar usuário';
                        setInlineError('adminUserFormError', msg);
                        toast(msg, 'error');
                    } finally {
                        saving = false;
                    }
                };
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await runSave();
                });
                try {
                    const saveBtn = document.getElementById('modal-save');
                    if (saveBtn) {
                        saveBtn.onclick = async (ev) => {
                            try { ev && ev.preventDefault && ev.preventDefault(); } catch {}
                            await runSave();
                        };
                    }
                } catch {}
            };

            const refresh = async () => {
                // Sempre buscar referência atual do DOM (evita referência órfã após reload)
                const liveBody = document.getElementById('adminUsersBody') || body;
                const liveStatusEl = document.getElementById('adminUsersStatus') || statusEl;
                const liveRoleFilter = document.getElementById('adminUsersRoleFilter') || roleFilter;
                const liveStatusFilter = document.getElementById('adminUsersStatusFilter') || statusFilter;
                liveStatusEl && (liveStatusEl.textContent = 'Carregando...');
                try {
                    const users = await api('/api/admin/users');
                    const roleSel = String(liveRoleFilter && liveRoleFilter.value || '').toLowerCase();
                    const statusSel = String(liveStatusFilter && liveStatusFilter.value || 'todos').toLowerCase();

                    const filtered = (Array.isArray(users) ? users : []).filter(u => {
                        const r = String(u && u.role != null ? u.role : '').toLowerCase();
                        const active = Number(u && u.active != null ? u.active : 0) === 1;
                        if (roleSel && r !== roleSel) return false;
                        if (statusSel === 'ativos' && !active) return false;
                        if (statusSel === 'inativos' && active) return false;
                        return true;
                    });

                    liveBody.innerHTML = filtered.map(u => {
                        const active = Number(u.active) === 1;
                        const badge = active
                            ? `<span class="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">Ativo</span>`
                            : `<span class="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">Inativo</span>`;
                        const lastLogin = u.last_login ? String(u.last_login) : '—';
                        return `
                            <tr>
                                <td class="px-3 py-2 text-sm text-gray-900">${u.name || '—'}</td>
                                <td class="px-3 py-2 text-sm text-gray-900">${u.email || '—'}</td>
                                <td class="px-3 py-2 text-sm text-gray-900">${roleLabel(u.role)}</td>
                                <td class="px-3 py-2 text-sm">${badge}</td>
                                <td class="px-3 py-2 text-sm text-gray-900">${lastLogin}</td>
                                <td class="px-3 py-2 text-sm">
                                    <button class="text-indigo-600 hover:text-indigo-900 mr-3" data-admin-user="edit" data-id="${u.id}">Editar</button>
                                    <button class="text-blue-600 hover:text-blue-900 mr-3" data-admin-user="pwd" data-id="${u.id}">Redefinir senha</button>
                                    ${active
                                        ? `<button class="text-red-600 hover:text-red-900" data-admin-user="deactivate" data-id="${u.id}">Desativar</button>`
                                        : `<button class="text-green-600 hover:text-green-900 mr-3" data-admin-user="activate" data-id="${u.id}">Ativar</button>`}
                                    <button class="text-gray-600 hover:text-gray-900 ml-3" data-admin-user="delete" data-id="${u.id}">Excluir</button>
                                </td>
                            </tr>
                        `;
                    }).join('') || `<tr><td colspan="6" class="px-3 py-3 text-sm text-gray-500">Nenhum usuário encontrado.</td></tr>`;

                    liveStatusEl && (liveStatusEl.textContent = `${filtered.length} usuário(s)`);
                    usersCache = Array.isArray(users) ? users : [];
                } catch (err) {
                    liveBody.innerHTML = `<tr><td colspan="6" class="px-3 py-3 text-sm text-red-600">${err && err.message ? err.message : 'Erro ao listar usuários'}</td></tr>`;
                    liveStatusEl && (liveStatusEl.textContent = '');
                }
            };

            body.addEventListener('click', async (e) => {
                const el = e.target && e.target.closest ? e.target.closest('[data-admin-user]') : null;
                if (!el) return;
                const action = el.getAttribute('data-admin-user');
                const id = el.getAttribute('data-id');
                if (!id) return;
                if (action === 'edit') {
                    try {
                        const users = await api('/api/admin/users');
                        const u = (Array.isArray(users) ? users : []).find(x => x && String(x.id) === String(id));
                        openUserModal('edit', u || { id });
                    } catch (err) {
                        toast(err && err.message ? err.message : 'Falha ao carregar usuário', 'error');
                    }
                    return;
                }
                if (action === 'pwd') {
                    const u = (Array.isArray(usersCache) ? usersCache : []).find(x => x && String(x.id) === String(id)) || { id };
                    openPasswordModal(u);
                    return;
                }
                if (action === 'deactivate') {
                    const ok = confirm('Desativar este usuário?');
                    if (!ok) return;
                    try {
                        await api(`/api/admin/users/${encodeURIComponent(id)}/deactivate`, { method: 'PATCH' });
                        toast('Usuário desativado.', 'success');
                        await refresh();
                    } catch (err) {
                        toast(err && err.message ? err.message : 'Falha ao desativar', 'error');
                    }
                    return;
                }
                if (action === 'activate') {
                    try {
                        await api(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ active: 1 }) });
                        toast('Usuário ativado.', 'success');
                        await refresh();
                    } catch (err) {
                        toast(err && err.message ? err.message : 'Falha ao ativar', 'error');
                    }
                    return;
                }
                if (action === 'delete') {
                    const ok = confirm('Excluir este usuário permanentemente?\n\nEsta ação remove o cadastro do sistema e não pode ser desfeita.');
                    if (!ok) return;
                    try {
                        await api(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
                        toast('Usuário excluído.', 'success');
                        await refresh();
                    } catch (err) {
                        toast(err && err.message ? err.message : 'Falha ao excluir usuário', 'error');
                    }
                }
            });

            btnReload.addEventListener('click', () => refresh());
            roleFilter.addEventListener('change', () => refresh());
            statusFilter.addEventListener('change', () => refresh());
            btnNew.addEventListener('click', () => openUserModal('create'));

            refresh();
        },
        initComissoes() {
            const elDefBase = document.getElementById('commDefaultBase');
            const elDefBonus = document.getElementById('commDefaultBonus');
            const elDefThr = document.getElementById('commDefaultThreshold');
            const elDefBaseStatus = document.getElementById('commDefaultBaseStatus');
            const elDefSave = document.getElementById('commDefaultSave');
            const elDefStatus = document.getElementById('commDefaultStatus');

            const elUserSel = document.getElementById('commUserSelect');
            const elUserBase = document.getElementById('commUserBase');
            const elUserBonus = document.getElementById('commUserBonus');
            const elUserThr = document.getElementById('commUserThreshold');
            const elUserBaseStatus = document.getElementById('commUserBaseStatus');
            const elUserSave = document.getElementById('commUserSave');
            const elUserDelete = document.getElementById('commUserDelete');
            const elUserStatus = document.getElementById('commUserStatus');
            const body = document.getElementById('commRulesBody');
            if (!elDefBase || !elDefBonus || !elDefThr || !elDefBaseStatus || !elDefSave || !elDefStatus) return;
            if (!elUserSel || !elUserBase || !elUserBonus || !elUserThr || !elUserBaseStatus || !elUserSave || !elUserDelete || !elUserStatus || !body) return;

            const toast = (msg, type = 'info') => {
                if (window.Toast && typeof window.Toast.show === 'function') {
                    const t = type === 'error' ? 12000 : (type === 'success' ? 4500 : 5000);
                    return window.Toast.show(msg, type, t, type === 'error');
                }
                if (window.NotificationSystem && typeof window.NotificationSystem[type] === 'function') return window.NotificationSystem[type](msg);
                alert(msg);
            };

            const api = async (url, opt = {}) => {
                const r = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opt });
                const raw = await r.text().catch(() => '');
                let j = null;
                try { j = raw ? JSON.parse(raw) : null; } catch {}
                if (!r.ok) {
                    const rawText = raw ? String(raw) : '';
                    const isHtml = /<!doctype html|<html[\s>]/i.test(rawText);
                    const cannotGet = /cannot\s+(get|post|put|patch|delete)\s+/i.test(rawText);
                    const serverMsg = (j && j.error)
                        ? String(j.error)
                        : ((isHtml || cannotGet)
                            ? 'Endpoint não encontrado. Reinicie o servidor para aplicar as últimas mudanças.'
                            : (rawText ? rawText.slice(0, 300) : ''));
                    throw new Error(serverMsg ? `${serverMsg} (HTTP ${r.status})` : `Falha na API (HTTP ${r.status})`);
                }
                return j;
            };

            const pctToInput = (v) => {
                const n = Number(v || 0);
                return Number.isFinite(n) ? (Math.round(n * 10000) / 100) : 0;
            };
            const inputToPct = (v) => {
                const n = Number(v);
                if (!Number.isFinite(n) || n < 0) return 0;
                return n / 100;
            };
            const setText = (el, txt) => { try { el.textContent = String(txt || ''); } catch {} };

            let usersCache = [];
            let rulesCache = [];
            let selectedOverrideId = null;

            const findOverrideByUserId = (uid) => {
                const id = uid != null ? String(uid) : '';
                return (rulesCache || []).find(r => r && r.vendedor_id != null && String(r.vendedor_id) === id) || null;
            };

            const applyDefaultToForm = (rule) => {
                const r = rule || {};
                elDefBase.value = String(pctToInput(r.base_percent));
                elDefBonus.value = String(pctToInput(r.bonus_percent));
                elDefThr.value = String(r.bonus_threshold != null ? r.bonus_threshold : 1.0);
                elDefBaseStatus.value = String(r.base_status || 'pagas');
            };

            const applyOverrideToForm = (rule, fallback) => {
                const r = rule || {};
                const fb = fallback || {};
                elUserBase.value = String(pctToInput(rule ? r.base_percent : fb.base_percent));
                elUserBonus.value = String(pctToInput(rule ? r.bonus_percent : fb.bonus_percent));
                elUserThr.value = String(rule ? (r.bonus_threshold != null ? r.bonus_threshold : 1.0) : (fb.bonus_threshold != null ? fb.bonus_threshold : 1.0));
                elUserBaseStatus.value = String(rule ? (r.base_status || 'pagas') : (fb.base_status || 'pagas'));
                selectedOverrideId = rule ? r.id : null;
                elUserDelete.disabled = !selectedOverrideId;
            };

            const renderOverridesTable = () => {
                const rows = (rulesCache || []).filter(r => r && r.vendedor_id != null);
                body.innerHTML = rows.map(r => {
                    const name = r.vendedor_nome || r.vendedor_email || `#${r.vendedor_id}`;
                    const base = pctToInput(r.base_percent);
                    const bonus = pctToInput(r.bonus_percent);
                    const thr = Number(r.bonus_threshold || 0);
                    const st = String(r.base_status || 'pagas');
                    return `
                        <tr>
                            <td class="px-4 py-2 text-sm text-gray-900">${name}</td>
                            <td class="px-4 py-2 text-sm text-gray-900 text-right">${base}%</td>
                            <td class="px-4 py-2 text-sm text-gray-900 text-right">${bonus}%</td>
                            <td class="px-4 py-2 text-sm text-gray-900 text-right">${thr}</td>
                            <td class="px-4 py-2 text-sm text-gray-900">${st}</td>
                            <td class="px-4 py-2 text-sm">
                                <button class="text-indigo-600 hover:text-indigo-900 mr-3" data-comm-action="edit" data-id="${r.id}" data-vendedor-id="${r.vendedor_id}">Editar</button>
                                <button class="text-red-600 hover:text-red-900" data-comm-action="delete" data-id="${r.id}">Excluir</button>
                            </td>
                        </tr>
                    `;
                }).join('') || `<tr><td colspan="6" class="px-4 py-3 text-sm text-gray-500">Nenhuma regra por usuário cadastrada.</td></tr>`;
            };

            const refresh = async () => {
                setText(elDefStatus, 'Carregando...');
                setText(elUserStatus, '');
                try {
                    const [users, rules] = await Promise.all([
                        api('/api/admin/users'),
                        api('/api/admin/comissao-regras')
                    ]);
                    usersCache = Array.isArray(users) ? users : [];
                    rulesCache = Array.isArray(rules) ? rules : [];

                    const sortedUsers = usersCache
                        .filter(u => u && Number(u.active) === 1)
                        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
                    elUserSel.innerHTML = `<option value="">Selecione...</option>` + sortedUsers.map(u => {
                        const label = `${u.name || ''} • ${u.email || ''}`.trim();
                        return `<option value="${u.id}">${label}</option>`;
                    }).join('');

                    const def = (rulesCache || []).find(r => r && r.vendedor_id == null) || { base_percent: 0.03, bonus_percent: 0.05, bonus_threshold: 1.0, base_status: 'pagas' };
                    applyDefaultToForm(def);

                    renderOverridesTable();
                    applyOverrideToForm(null, def);
                    setText(elDefStatus, '');
                } catch (e) {
                    const msg = e && e.message ? e.message : 'Erro ao carregar';
                    setText(elDefStatus, msg);
                    toast(msg, 'error');
                }
            };

            elUserSel.addEventListener('change', () => {
                const uid = elUserSel.value ? String(elUserSel.value) : '';
                const def = (rulesCache || []).find(r => r && r.vendedor_id == null) || { base_percent: 0.03, bonus_percent: 0.05, bonus_threshold: 1.0, base_status: 'pagas' };
                const ov = uid ? findOverrideByUserId(uid) : null;
                applyOverrideToForm(ov, def);
                setText(elUserStatus, '');
            });

            body.addEventListener('click', async (e) => {
                const btn = e && e.target && e.target.closest ? e.target.closest('[data-comm-action]') : null;
                if (!btn) return;
                const action = btn.getAttribute('data-comm-action');
                const id = btn.getAttribute('data-id');
                if (!id) return;
                if (action === 'edit') {
                    const vid = btn.getAttribute('data-vendedor-id');
                    if (vid) elUserSel.value = String(vid);
                    const def = (rulesCache || []).find(r => r && r.vendedor_id == null) || { base_percent: 0.03, bonus_percent: 0.05, bonus_threshold: 1.0, base_status: 'pagas' };
                    const ov = vid ? findOverrideByUserId(vid) : null;
                    applyOverrideToForm(ov, def);
                    return;
                }
                if (action === 'delete') {
                    const ok = confirm('Excluir esta regra por usuário?');
                    if (!ok) return;
                    try {
                        await api(`/api/admin/comissao-regras/${encodeURIComponent(id)}`, { method: 'DELETE' });
                        toast('Regra excluída.', 'success');
                        await refresh();
                    } catch (err) {
                        toast(err && err.message ? err.message : 'Falha ao excluir regra', 'error');
                    }
                }
            });

            elDefSave.addEventListener('click', async () => {
                try {
                    setText(elDefStatus, 'Salvando...');
                    const payload = {
                        vendedor_id: null,
                        base_percent: inputToPct(elDefBase.value),
                        bonus_percent: inputToPct(elDefBonus.value),
                        bonus_threshold: Number(elDefThr.value || 1.0),
                        base_status: String(elDefBaseStatus.value || 'pagas')
                    };
                    await api('/api/admin/comissao-regras', { method: 'POST', body: JSON.stringify(payload) });
                    toast('Regra padrão atualizada.', 'success');
                    await refresh();
                } catch (e) {
                    const msg = e && e.message ? e.message : 'Falha ao salvar';
                    setText(elDefStatus, msg);
                    toast(msg, 'error');
                } finally {
                    setText(elDefStatus, '');
                }
            });

            elUserSave.addEventListener('click', async () => {
                const uid = elUserSel.value ? parseInt(String(elUserSel.value), 10) : 0;
                if (!uid) {
                    toast('Selecione um usuário.', 'error');
                    return;
                }
                try {
                    setText(elUserStatus, 'Salvando...');
                    const payload = {
                        vendedor_id: uid,
                        base_percent: inputToPct(elUserBase.value),
                        bonus_percent: inputToPct(elUserBonus.value),
                        bonus_threshold: Number(elUserThr.value || 1.0),
                        base_status: String(elUserBaseStatus.value || 'pagas')
                    };
                    await api('/api/admin/comissao-regras', { method: 'POST', body: JSON.stringify(payload) });
                    toast('Regra do usuário salva.', 'success');
                    await refresh();
                    elUserSel.value = String(uid);
                    const def = (rulesCache || []).find(r => r && r.vendedor_id == null) || { base_percent: 0.03, bonus_percent: 0.05, bonus_threshold: 1.0, base_status: 'pagas' };
                    const ov = findOverrideByUserId(uid);
                    applyOverrideToForm(ov, def);
                } catch (e) {
                    const msg = e && e.message ? e.message : 'Falha ao salvar';
                    setText(elUserStatus, msg);
                    toast(msg, 'error');
                } finally {
                    setText(elUserStatus, '');
                }
            });

            elUserDelete.addEventListener('click', async () => {
                if (!selectedOverrideId) return;
                const ok = confirm('Remover a regra deste usuário e voltar a usar a regra padrão?');
                if (!ok) return;
                try {
                    await api(`/api/admin/comissao-regras/${encodeURIComponent(selectedOverrideId)}`, { method: 'DELETE' });
                    toast('Regra removida.', 'success');
                    const uid = elUserSel.value ? String(elUserSel.value) : '';
                    await refresh();
                    if (uid) elUserSel.value = uid;
                    const def = (rulesCache || []).find(r => r && r.vendedor_id == null) || { base_percent: 0.03, bonus_percent: 0.05, bonus_threshold: 1.0, base_status: 'pagas' };
                    const ov = uid ? findOverrideByUserId(uid) : null;
                    applyOverrideToForm(ov, def);
                } catch (e) {
                    toast(e && e.message ? e.message : 'Falha ao remover regra', 'error');
                }
            });

            refresh();
        },
        listConfiguracoes() {
            return `
                <div class="bg-white rounded-lg shadow overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <div>
                            <div class="text-sm text-gray-500">Administração</div>
                            <div class="text-lg font-semibold text-gray-800">Configurações</div>
                        </div>
                        <div class="flex items-center gap-2">
                            <select id="adminSettingsSection" class="border rounded-lg px-3 py-2 text-sm"></select>
                            <button id="adminSettingsReload" class="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg text-sm">Recarregar</button>
                            <button id="adminSettingsSave" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm">Salvar</button>
                        </div>
                    </div>
                    <div class="p-4 grid grid-cols-1 gap-4">
                        <div class="text-xs text-gray-600">Edite o JSON da seção selecionada e clique em Salvar.</div>
                        <textarea id="adminSettingsEditor" class="w-full h-96 border rounded-lg p-3 font-mono text-sm"></textarea>
                        <div id="adminSettingsStatus" class="text-sm text-gray-600"></div>
                    </div>
                </div>
            `;
        }
        ,
        listLogs() {
            return `
                <div class="bg-white rounded-lg shadow overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <div>
                            <div class="text-sm text-gray-500">Administração</div>
                            <div class="text-lg font-semibold text-gray-800">Logs</div>
                        </div>
                        <div class="flex items-center gap-2">
                            <input id="adminAuditTable" class="border rounded-lg px-3 py-2 text-sm" placeholder="Tabela (ex.: oportunidades)">
                            <select id="adminAuditAction" class="border rounded-lg px-3 py-2 text-sm">
                                <option value="">Todas</option>
                                <option value="login">login</option>
                                <option value="create">create</option>
                                <option value="update">update</option>
                                <option value="delete">delete</option>
                                <option value="move">move</option>
                            </select>
                            <select id="adminAuditLimit" class="border rounded-lg px-3 py-2 text-sm">
                                <option value="50">50</option>
                                <option value="200" selected>200</option>
                                <option value="500">500</option>
                            </select>
                            <button id="adminAuditReload" class="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg text-sm">Carregar</button>
                            <button id="adminAuditCsv" class="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg text-sm">CSV</button>
                        </div>
                    </div>
                    <div class="p-4 overflow-x-auto">
                        <table class="w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ação</th>
                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tabela</th>
                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Registro</th>
                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Detalhes</th>
                                </tr>
                            </thead>
                            <tbody id="adminAuditBody" class="bg-white divide-y divide-gray-200">
                                <tr><td colspan="6" class="px-3 py-2 text-sm text-gray-500">Carregando...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
        ,
        initConfiguracoes() {
            const sel = document.getElementById('adminSettingsSection');
            const edt = document.getElementById('adminSettingsEditor');
            const btnReload = document.getElementById('adminSettingsReload');
            const btnSave = document.getElementById('adminSettingsSave');
            const status = document.getElementById('adminSettingsStatus');
            let cache = {};
            const api = async (url, opt = {}) => {
                const r = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opt });
                const j = await r.json().catch(() => null);
                if (!r.ok) throw new Error((j && j.error) ? j.error : 'Falha na API');
                return j;
            };
            const load = async () => {
                status.textContent = 'Carregando...';
                try {
                    cache = await api('/api/admin/settings');
                    const keys = Object.keys(cache || {});
                    sel.innerHTML = keys.map(k => `<option value="${k}">${k}</option>`).join('');
                    if (keys.length) {
                        sel.value = keys[0];
                        edt.value = JSON.stringify(cache[keys[0]] ?? {}, null, 2);
                    }
                    status.textContent = '';
                } catch (e) {
                    status.textContent = e && e.message ? e.message : 'Erro ao carregar';
                }
            };
            sel.addEventListener('change', () => {
                const k = sel.value;
                edt.value = JSON.stringify(cache[k] ?? {}, null, 2);
            });
            btnReload.addEventListener('click', () => load());
            btnSave.addEventListener('click', async () => {
                const k = sel.value;
                try {
                    const v = JSON.parse(edt.value || '{}');
                    const body = {};
                    body[k] = v;
                    await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify(body) });
                    status.textContent = 'Salvo';
                    setTimeout(() => status.textContent = '', 1200);
                } catch (e) {
                    status.textContent = e && e.message ? e.message : 'Erro ao salvar';
                }
            });
            load();
        },
        initLogs() {
            const tb = document.getElementById('adminAuditTable');
            const ac = document.getElementById('adminAuditAction');
            const lm = document.getElementById('adminAuditLimit');
            const body = document.getElementById('adminAuditBody');
            const btn = document.getElementById('adminAuditReload');
            const btnCsv = document.getElementById('adminAuditCsv');
            const api = async (url) => {
                const r = await fetch(url, { credentials: 'include' });
                const j = await r.json().catch(() => null);
                if (!r.ok) throw new Error((j && j.error) ? j.error : 'Falha na API');
                return j;
            };
            const refresh = async () => {
                const qs = new URLSearchParams();
                if (tb.value) qs.set('table', tb.value.trim());
                if (ac.value) qs.set('action', ac.value);
                qs.set('limit', lm.value || '200');
                try {
                    const rows = await api('/api/admin/auditoria?' + qs.toString());
                    body.innerHTML = (rows || []).map(x => `
                        <tr>
                            <td class="px-3 py-2 text-sm text-gray-900">${x.created_at || '-'}</td>
                            <td class="px-3 py-2 text-sm text-gray-900">${x.user_id || '-'}</td>
                            <td class="px-3 py-2 text-sm text-gray-900">${x.action || '-'}</td>
                            <td class="px-3 py-2 text-sm text-gray-900">${x.table_name || '-'}</td>
                            <td class="px-3 py-2 text-sm text-gray-900">${x.record_id || '-'}</td>
                            <td class="px-3 py-2 text-sm text-gray-900">${x.details || '-'}</td>
                        </tr>
                    `).join('') || `<tr><td colspan="6" class="px-3 py-2 text-sm text-gray-500">Sem dados</td></tr>`;
                } catch (e) {
                    body.innerHTML = `<tr><td colspan="6" class="px-3 py-2 text-sm text-red-600">${e && e.message ? e.message : 'Erro ao listar'}</td></tr>`;
                }
            };
            btn.addEventListener('click', () => refresh());
            btnCsv.addEventListener('click', () => {
                const qs = new URLSearchParams();
                if (tb.value) qs.set('table', tb.value.trim());
                if (ac.value) qs.set('action', ac.value);
                qs.set('limit', lm.value || '200');
                qs.set('format', 'csv');
                try { window.open('/api/admin/auditoria?' + qs.toString(), '_blank'); } catch {}
            });
            refresh();
        }
        ,
        initPermissoes() {},
        async listPermissoes() {
            // Buscar usuários da API (inclui modules_json e permissions_json do banco)
            let rows = [];
            try {
                const resp = await fetch('/api/crm/users', { credentials: 'include' });
                if (resp.ok) {
                    const data = await resp.json().catch(() => []);
                    rows = Array.isArray(data) ? data : [];
                    // Popular AuthSystem.users para que showUserPermissions funcione
                    if (typeof AuthSystem !== 'undefined') {
                        rows.forEach(u => {
                            const key = u.email || String(u.id);
                            AuthSystem.users[key] = {
                                id: u.id,
                                name: u.name,
                                email: u.email,
                                role: u.role,
                                active: u.active,
                                modules_json: u.modules_json,
                                permissions_json: u.permissions_json,
                                modules: u.modules_json ? (() => { try { return JSON.parse(u.modules_json); } catch { return []; } })() : [],
                                permissions: u.permissions_json ? (() => { try { return JSON.parse(u.permissions_json); } catch { return []; } })() : []
                            };
                        });
                    }
                }
            } catch (e) {
                console.warn('Erro ao carregar usuários para permissões:', e);
            }
            return `
                <div class="bg-white rounded-lg shadow">
                    <div class="p-6 border-b border-gray-200 flex items-center justify-between">
                        <div>
                            <div class="text-sm text-gray-500">Administração</div>
                            <div class="text-lg font-semibold text-gray-800">Permissões</div>
                        </div>
                        <div class="flex gap-2">
                            <button type="button" onclick="(async()=>{try{if(window.PermissionSystem&&PermissionSystem.init){if(!PermissionSystem.__inited){PermissionSystem.init(); PermissionSystem.__inited=true;}}}catch{}})()" class="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg transition duration-300"><i class="fas fa-shield-alt mr-2"></i>Inicializar</button>
                        </div>
                    </div>
                    <div class="p-6">
                        ${(!rows.length) ? `<div class="text-gray-500">Nenhum usuário encontrado no sistema de permissões local.</div>` : `
                            <div class="overflow-x-auto">
                                <table class="w-full">
                                    <thead class="bg-gray-50">
                                        <tr>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Perfil</th>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody class="bg-white divide-y divide-gray-200">
                                        ${rows.map(u => `
                                            <tr class="hover:bg-gray-50">
                                                <td class="px-6 py-4 whitespace-nowrap">
                                                    <div class="text-sm font-medium text-gray-900">${ModuleSystem.escapeHtml(u.name || '')}</div>
                                                </td>
                                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${ModuleSystem.escapeHtml(u.email || '')}</td>
                                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${ModuleSystem.escapeHtml(u.role || '')}</td>
                                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <button type="button" onclick="(async()=>{try{if(window.PermissionSystem&&PermissionSystem.init){if(!PermissionSystem.__inited){PermissionSystem.init(); PermissionSystem.__inited=true;}} if(window.PermissionSystem&&PermissionSystem.showUserPermissions){PermissionSystem.showUserPermissions(${Number(u.id)});} }catch{}})()" class="text-blue-600 hover:text-blue-900" title="Gerenciar permissões"><i class="fas fa-user-shield"></i></button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        `}
                    </div>
                </div>
            `;
        }
    },

    // Funções CRUD genéricas
    showCreateForm(module) {
        console.log('Chamando FormSystem.showCreateForm para:', module);
        if (window.FormSystem) {
            FormSystem.showCreateForm(module);
        } else {
            console.error('FormSystem não está disponível');
        }
    },

    showDetails(module, id) {
        console.log('Chamando FormSystem.showDetails para:', module, id);
        if (window.FormSystem) {
            FormSystem.showDetails(module, id);
        } else {
            console.error('FormSystem não está disponível');
        }
    },

    showUpdateForm(module, id) {
        console.log('Chamando FormSystem.showUpdateForm para:', module, id);
        if (window.FormSystem) {
            FormSystem.showUpdateForm(module, id);
        } else {
            console.error('FormSystem não está disponível');
        }
    },

    showModule(module) {
        console.log('Navegando para módulo:', module);
        if (window.NavigationSystem && typeof NavigationSystem.navigateToModule === 'function') {
            NavigationSystem.navigateToModule(module);
        } else {
            console.error('NavigationSystem não está disponível');
        }
    },

    showLeads() {
        console.log('Navegando para página de leads');
        if (window.NavigationSystem && typeof NavigationSystem.navigateToPage === 'function') {
            NavigationSystem.navigateToPage('marketing', 'leads');
        } else {
            console.error('NavigationSystem não está disponível');
        }
    },

    confirmDelete(module, id) {
        console.log('Confirmando exclusão para:', module, id);
        if (confirm('Tem certeza que deseja excluir este item?')) {
            this.deleteItem(module, id);
        }
    },

    async deleteItem(module, id) {
        console.log('Excluindo item:', module, id);
        const isLead = (module === 'leads' || module === 'marketing_leads');
        const isContato = (module === 'contatos' || module === 'marketing_contatos');
        const isEvento = (module === 'eventos');
        const isBriefing = (module === 'briefings');
        const isContaReceber = (module === 'contasReceber');
        const isCliente = (module === 'clientes');
        const isMemorial = (module === 'memoriais');
        const isTransacao = (module === 'transacoes');

        const idStr = id != null ? String(id).trim() : '';
        if (!idStr || idStr === 'undefined' || idStr === 'null') {
            if (window.NotificationSystem && typeof window.NotificationSystem.error === 'function') {
                window.NotificationSystem.error('ID inválido para exclusão.');
            }
            return;
        }

        if (isTransacao) {
            const moduleData = this.getModuleData('transacoes');
            if (!Array.isArray(moduleData)) {
                if (window.NotificationSystem && typeof window.NotificationSystem.error === 'function') {
                    window.NotificationSystem.error('Nenhuma despesa encontrada para exclusão.');
                }
                return;
            }
            const idx = moduleData.findIndex(item => item && String(item.id) === idStr);
            if (idx === -1) {
                if (window.NotificationSystem && typeof window.NotificationSystem.error === 'function') {
                    window.NotificationSystem.error('Despesa não encontrada para exclusão.');
                }
                return;
            }

            const item = moduleData[idx] || {};
            const groupRaw = item.recorrenciaGrupoId != null ? String(item.recorrenciaGrupoId).trim() : '';
            let idsToRemove = [idStr];
            if (groupRaw) {
                const delAll = confirm('Esta despesa é recorrente.\n\nOK = excluir TODA a recorrência (todas as parcelas)\nCancelar = excluir apenas esta despesa');
                if (delAll) {
                    idsToRemove = moduleData
                        .filter(t => t && String(t.recorrenciaGrupoId || '') === groupRaw)
                        .map(t => String(t.id));
                }
            }

            const toRemove = new Set(idsToRemove.filter(Boolean));

            // Excluir via API REST (backend MySQL)
            const numericIds = idsToRemove.filter(rid => /^[0-9]+$/.test(rid));
            if (numericIds.length > 0) {
                try {
                    await Promise.all(numericIds.map(rid =>
                        fetch(`/api/crm/transacoes/${encodeURIComponent(rid)}`, {
                            method: 'DELETE',
                            credentials: 'include'
                        }).catch(e => console.warn('[ModuleSystem] Falha ao excluir transação no backend:', e))
                    ));
                } catch (e) {
                    console.warn('[ModuleSystem] Erro ao excluir transações no backend:', e);
                }
            }

            const next = moduleData.filter(t => !(t && t.id != null && toRemove.has(String(t.id))));
            moduleData.splice(0, moduleData.length, ...next);
            this.saveData();

            try {
                if (window.NotificationSystem) {
                    if (typeof window.NotificationSystem.showCRUDSuccess === 'function') {
                        window.NotificationSystem.showCRUDSuccess('delete', 'Despesa');
                    } else if (typeof window.NotificationSystem.success === 'function') {
                        window.NotificationSystem.success(groupRaw ? 'Recorrência excluída.' : 'Despesa excluída.');
                    }
                }
            } catch {}

            try {
                if (window.formIntegration && typeof window.formIntegration.refreshModuleData === 'function') {
                    window.formIntegration.refreshModuleData('financeiro');
                } else if (window.NavigationSystem && typeof window.NavigationSystem.reloadCurrentPage === 'function') {
                    window.NavigationSystem.reloadCurrentPage();
                }
            } catch {}
            return;
        }
        
        let backendSuccess = false;
        let backendStatus = null;
        let backendError = null;
        const idIsNumeric = /^[0-9]+$/.test(idStr);
        const shouldCallBackend =
            ((isLead || isContato) ? idIsNumeric : (isEvento || isBriefing || isContaReceber || isCliente || isMemorial));
        if (shouldCallBackend) {
            try {
                const endpoint = isLead
                    ? `/api/crm/leads/${encodeURIComponent(idStr)}`
                    : (isContato ? `/api/crm/contatos/${encodeURIComponent(idStr)}`
                    : (isEvento
                        ? `/api/crm/eventos/${encodeURIComponent(idStr)}`
                        : (isBriefing ? `/api/crm/briefings/${encodeURIComponent(idStr)}` : (isContaReceber ? `/api/crm/contas-receber/${encodeURIComponent(idStr)}` : (isCliente ? `/api/crm/clientes/${encodeURIComponent(idStr)}` : `/api/crm/memoriais/${encodeURIComponent(idStr)}`)))));
                const resp = await fetch(endpoint, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                backendStatus = resp ? resp.status : null;
                backendSuccess = resp && (resp.ok || resp.status === 404);
                if (!backendSuccess && resp) {
                    const payload = await resp.json().catch(() => null);
                    backendError = payload && payload.error ? String(payload.error) : null;
                }
                if (!backendSuccess) {
                    console.warn('[ModuleSystem] DELETE API não OK, prosseguindo com remoção local');
                }
            } catch (err) {
                console.warn('[ModuleSystem] Falha ao excluir item no backend, prosseguindo com remoção local:', err);
                backendSuccess = false;
            }
        }

        if (!backendSuccess && backendStatus === 409) {
            const msg = backendError || 'Não foi possível excluir este item porque ele possui vínculos.';
            if (window.NotificationSystem && typeof window.NotificationSystem.error === 'function') {
                window.NotificationSystem.error(msg);
            }
            return;
        }
        const allowLocalLeadDelete = isLead && (!shouldCallBackend || backendStatus === 400 || backendStatus === 404);
        if ((isLead || isContato || isEvento || isBriefing || isContaReceber || isCliente) && !backendSuccess && !allowLocalLeadDelete) {
            // Detectar 401 especificamente para dar mensagem útil
            if (backendStatus === 401) {
                const msg = 'Sua sessão expirou. Faça login novamente para excluir itens.';
                if (window.NotificationSystem && typeof window.NotificationSystem.error === 'function') {
                    window.NotificationSystem.error(msg);
                } else {
                    alert(msg);
                }
                return;
            }
            const msg = backendError || 'Falha ao excluir no servidor. Faça login e tente novamente.';
            if (window.NotificationSystem && typeof window.NotificationSystem.error === 'function') {
                window.NotificationSystem.error(msg);
            }
            return;
        }
        
        // Remoção local
        const moduleData = this.getModuleData(isLead ? 'leads' : module);
        let removedLocally = false;
        if (moduleData) {
            const index = moduleData.findIndex(item => item && item.id == idStr);
            if (index !== -1) {
                moduleData.splice(index, 1);
                this.saveData();
                removedLocally = true;

                if (isEvento && window.ComercialModule && Array.isArray(window.ComercialModule._eventosCache)) {
                    window.ComercialModule._eventosCache = window.ComercialModule._eventosCache.filter(ev => ev && String(ev.id) !== idStr);
                }

                // Notificações
                if (window.NotificationSystem) {
                    const entityName = isLead ? 'Lead' : (isBriefing ? 'Briefing' : (isEvento ? 'Evento' : (isCliente ? 'Cliente' : (isContaReceber ? 'Conta a Receber' : (isMemorial ? 'Memorial' : 'Item')))));
                    if (isLead) {
                        if (backendSuccess && typeof window.NotificationSystem.showCRUDSuccess === 'function') {
                            window.NotificationSystem.showCRUDSuccess('delete', 'Lead');
                        } else if (typeof window.NotificationSystem.success === 'function') {
                            window.NotificationSystem.success('Lead excluído localmente (offline)');
                        }
                    } else if (backendSuccess && typeof window.NotificationSystem.showCRUDSuccess === 'function') {
                        window.NotificationSystem.showCRUDSuccess('delete', entityName);
                    } else if (!backendSuccess && typeof window.NotificationSystem.warning === 'function') {
                        const msg = backendError
                            ? `Excluído localmente, mas o servidor retornou: ${backendError}`
                            : 'Excluído localmente, mas não foi possível confirmar a exclusão no servidor. Pode reaparecer ao recarregar.';
                        window.NotificationSystem.warning(msg);
                    }
                }
                
                // Atualizar interface
                const escapeCss = (v) => (window.CSS && typeof window.CSS.escape === 'function') ? window.CSS.escape(v) : v;
                try {
                    document.querySelectorAll(`[data-action="delete"][data-module="${escapeCss(module)}"][data-id="${escapeCss(idStr)}"]`).forEach((btn) => {
                        const row = btn && btn.closest ? btn.closest('tr') : null;
                        if (row && row.parentNode) row.parentNode.removeChild(row);
                    });
                } catch {}

                if (backendSuccess) {
                    if (window.NavigationSystem) {
                        if (module === 'briefings' && typeof window.NavigationSystem.reloadBriefingsList === 'function') {
                            window.NavigationSystem.reloadBriefingsList();
                            return;
                        }
                        if (module === 'eventos' && typeof window.NavigationSystem.reloadEventosList === 'function') {
                            window.NavigationSystem.reloadEventosList();
                            return;
                        }
                        if (module === 'clientes' && typeof window.NavigationSystem.reloadClientesList === 'function') {
                            window.NavigationSystem.reloadClientesList();
                            return;
                        }
                        if (module === 'marketing_contatos' && typeof window.NavigationSystem.reloadContatosList === 'function') {
                            window.NavigationSystem.reloadContatosList();
                            return;
                        }
                        // Bug 3c Fix: contasReceber sempre recarrega via FinanceiroModule
                        if (module === 'contasReceber') {
                            try {
                                if (window.FinanceiroModule && typeof window.FinanceiroModule.loadContasReceber === 'function') {
                                    window.FinanceiroModule.loadContasReceber();
                                } else {
                                    window.NavigationSystem.reloadCurrentPage();
                                }
                            } catch {}
                            return;
                        }
                    }
                    if (window.formIntegration && typeof window.formIntegration.refreshModuleData === 'function') {
                        const refreshTarget = (module === 'transacoes' || module === 'contasReceber') ? 'financeiro' : (module === 'marketing_leads' ? 'leads' : module);
                        window.formIntegration.refreshModuleData(refreshTarget);
                    } else if (window.NavigationSystem && typeof window.NavigationSystem.reloadCurrentPage === 'function') {
                        window.NavigationSystem.reloadCurrentPage();
                    } else if (window.NavigationSystem && typeof window.NavigationSystem.navigateToModule === 'function') {
                        const refreshTarget = (module === 'transacoes' || module === 'contasReceber') ? 'financeiro' : (module === 'marketing_leads' ? 'leads' : module);
                        window.NavigationSystem.navigateToModule(refreshTarget);
                    } else if (typeof window !== 'undefined' && window.location) {
                        window.location.reload();
                    }
                }
            }
        }

        // --- Bug 3 Fix: Para contasReceber, garantir reload da lista via API após delete ---
        // O item pode estar só no backend (não em ModuleSystem.data.contasReceber),
        // então removedLocally pode ser false mesmo com backendSuccess=true.
        if (isContaReceber && backendSuccess) {
            // Remover da memória local pelo ID caso não tenha sido removido ainda
            if (!removedLocally && window.ModuleSystem && Array.isArray(ModuleSystem.data.contasReceber)) {
                const idx = ModuleSystem.data.contasReceber.findIndex(item => item && String(item.id) === idStr);
                if (idx !== -1) {
                    ModuleSystem.data.contasReceber.splice(idx, 1);
                    ModuleSystem.saveData();
                }
            }
            // Remover a linha da tabela diretamente do DOM (feedback imediato)
            try {
                const escapeCss = (v) => (window.CSS && typeof window.CSS.escape === 'function') ? window.CSS.escape(v) : v;
                document.querySelectorAll(`[data-action="delete"][data-module="contasReceber"][data-id="${escapeCss(idStr)}"]`).forEach((btn) => {
                    const row = btn && btn.closest ? btn.closest('tr') : null;
                    if (row && row.parentNode) row.parentNode.removeChild(row);
                });
            } catch {}
            // Notificar sucesso
            try {
                if (window.NotificationSystem && typeof window.NotificationSystem.showCRUDSuccess === 'function') {
                    window.NotificationSystem.showCRUDSuccess('delete', 'Conta a Receber');
                } else if (window.NotificationSystem && typeof window.NotificationSystem.success === 'function') {
                    window.NotificationSystem.success('Conta a Receber excluída com sucesso.');
                }
            } catch {}
            // Recarregar a lista via API para garantir dados frescos
            try {
                if (window.FinanceiroModule && typeof window.FinanceiroModule.loadContasReceber === 'function') {
                    window.FinanceiroModule.loadContasReceber();
                } else if (window.NavigationSystem && typeof window.NavigationSystem.reloadCurrentPage === 'function') {
                    window.NavigationSystem.reloadCurrentPage();
                }
            } catch {}
            return;
        }

        if (!removedLocally && backendSuccess) {
            if (window.NotificationSystem && typeof window.NotificationSystem.showCRUDSuccess === 'function') {
                const entityName = isBriefing ? 'Briefing' : (isEvento ? 'Evento' : (isCliente ? 'Cliente' : (isContaReceber ? 'Conta a Receber' : (isLead ? 'Lead' : (isMemorial ? 'Memorial' : 'Item')))));
                window.NotificationSystem.showCRUDSuccess('delete', entityName);
            }
            if (window.NavigationSystem) {
                if (module === 'briefings' && typeof window.NavigationSystem.reloadBriefingsList === 'function') {
                    window.NavigationSystem.reloadBriefingsList();
                    return;
                }
                if (module === 'eventos' && typeof window.NavigationSystem.reloadEventosList === 'function') {
                    window.NavigationSystem.reloadEventosList();
                    return;
                }
                if (module === 'clientes' && typeof window.NavigationSystem.reloadClientesList === 'function') {
                    window.NavigationSystem.reloadClientesList();
                    return;
                }
                if (module === 'memoriais' && typeof window.NavigationSystem.reloadCurrentPage === 'function') {
                    window.NavigationSystem.reloadCurrentPage();
                    return;
                }
                if (typeof window.NavigationSystem.reloadCurrentPage === 'function') {
                    window.NavigationSystem.reloadCurrentPage();
                    return;
                }
            }
        } else if (!removedLocally && !backendSuccess && window.NotificationSystem && typeof window.NotificationSystem.error === 'function') {
            const msg = backendError || 'Não foi possível excluir o item.';
            window.NotificationSystem.error(msg);
        }
    },

    getModuleData(module) {
        const dataMap = {
            'leads': this.data.leads,
            'marketing_leads': this.data.leads, // Mapeamento para marketing_leads
            'campanhas': this.data.campanhas,
            'marketing_campanhas': this.data.campanhas,
            'marketing_contatos': this.data.contatos, // Mapeamento para marketing_contatos
            'contatos': this.data.contatos,
            'clientes': this.data.clientes,
            'eventos': this.data.eventos,
            'briefings': this.data.briefings,
            'projetos': this.data.projetos,
            'memoriais': this.data.memoriais,
            'montagens': this.data.montagens,
            'transacoes': this.data.transacoes,
            'contasReceber': this.data.contasReceber,
            'tarefasAdmin': this.data.tarefasAdmin,
            'demandasJuridicas': this.data.demandasJuridicas,
            'usuarios': this.data.usuarios
        };
        return dataMap[module];
    },

    addItem(module, data) {
        console.log('🔍 DEBUG addItem - Início:', { module, data, dataType: typeof data });
        
        try {
            const moduleData = this.getModuleData(module);
            console.log('🔍 DEBUG addItem - moduleData:', moduleData ? 'encontrado' : 'não encontrado');
            
            if (moduleData) {
                console.log('🔍 DEBUG addItem - Antes de gerar ID, data:', data);
                console.log('🔍 DEBUG addItem - this.generateId existe?', typeof this.generateId);
                
                const newId = this.generateId();
                console.log('🔍 DEBUG addItem - ID gerado:', newId);
                
                console.log('🔍 DEBUG addItem - Tentando atribuir ID ao data...');
                const assignedId = (data && data.id != null && data.id !== '') ? data.id : newId;
                data.id = assignedId;
                console.log('🔍 DEBUG addItem - ID atribuído com sucesso, data:', data);
                
                moduleData.push(data);
                console.log('🔍 DEBUG addItem - Item adicionado ao moduleData');
                
                this.saveData();
                console.log('🔍 DEBUG addItem - Dados salvos');
                
                return data.id;
            }
        } catch (error) {
            console.error('❌ ERRO no addItem:', error);
            console.error('❌ Stack trace:', error.stack);
            throw error;
        }
        return null;
    },

    updateItem(module, id, data) {
        console.log('Atualizando item:', module, id, data);
        const moduleData = this.getModuleData(module);
        if (moduleData) {
            const index = moduleData.findIndex(item => item.id == id);
            if (index !== -1) {
                moduleData[index] = { ...moduleData[index], ...data, id };
                this.saveData();
                return true;
            }
        }
        return false;
    },

    removeItem(module, id) {
        return this.deleteItem(module, id);
    },

    generateId() {
        if (!this._idCounter) this._idCounter = 0;
        return (++this._idCounter).toString() + Math.random().toString(36).substr(2, 9);
    }
};

// Exportar ModuleSystem globalmente
window.ModuleSystem = ModuleSystem;

// Adiciona módulo de Marketing para auto-carregar lista de leads via API sem duplicidade
if (!window.MarketingModule) {
  window.MarketingModule = {};
}

window.MarketingModule.loadLeads = async function(options) {
  const opts = (options && typeof options === 'object') ? options : {};
  const skipFetch = !!opts.skipFetch;
  try {
    const retryKey = '_leadsLoadDomRetries';
    window.MarketingModule[retryKey] = window.MarketingModule[retryKey] || 0;

    const container = document.getElementById('leads-list-container');
    const leadsViewListEl = document.getElementById('leads-view-list');
    const cardsView = document.getElementById('leads-cards-view');
    let tbody = document.getElementById('leads-list-body');

    if (!container) {
      const attempt = (window.MarketingModule[retryKey] || 0) + 1;
      window.MarketingModule[retryKey] = attempt;
      if (attempt <= 12) setTimeout(() => window.MarketingModule.loadLeads(opts), 150 * attempt);
      return;
    }

    if (!tbody) tbody = document.querySelector('#leads-view-list tbody');

    if (!tbody && leadsViewListEl) {
      const tableHost = document.querySelector('#leads-view-list table') || leadsViewListEl;
      tableHost.innerHTML = `
        <div class="overflow-x-auto hidden md:block">
          <table class="min-w-full divide-y divide-gray-200" aria-label="Tabela de leads">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origem</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody id="leads-list-body" class="bg-white divide-y divide-gray-200"></tbody>
          </table>
        </div>
      `;
      tbody = document.getElementById('leads-list-body') || document.querySelector('#leads-view-list tbody');
    }

    container.setAttribute('aria-busy', 'true');
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-sm text-gray-500">${skipFetch ? 'Atualizando visão...' : 'Carregando leads...'}</td></tr>`;
    if (cardsView) cardsView.innerHTML = `<div class="text-sm text-gray-500">Carregando...</div>`;

    const localLeads = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.leads)) ? [...ModuleSystem.data.leads] : [];
    let apiLeads = [];
    let apiOk = false;

    if (skipFetch) {
      apiOk = !!window.MarketingModule._leadsLastApiOk;
    } else {
      try {
        const _tkn = window._crmSessionToken || (function(){ try { return localStorage.getItem('crm_fallback_token'); } catch(e){ return null; } })() || (function(){ try { return sessionStorage.getItem('crm_fallback_token'); } catch(e){ return null; } })();
        const _hdrs = { 'Cache-Control': 'no-cache' };
        if (_tkn) _hdrs['Authorization'] = 'Bearer ' + _tkn;
        const response = await fetch('/api/crm/leads?limit=500', {
          credentials: 'include',
          cache: 'no-store',
          headers: _hdrs
        });
        const data = await response.json().catch(() => null);
        const dataArray = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : null);
        if (response.ok && dataArray) {
          apiLeads = dataArray;
          apiOk = true;
          try { window.MarketingModule._leadsLastApiOk = true; } catch {}
        } else {
          try { window.MarketingModule._leadsLastApiOk = false; } catch {}
          if (response.status === 401 || response.status === 403) {
            try {
              if (window.Toast && typeof Toast.show === 'function') Toast.show('Sessão expirada. Faça login novamente.', 'warning');
              if (window.AuthSystem && typeof AuthSystem.showLogin === 'function') AuthSystem.showLogin();
            } catch {}
          }
        }
      } catch {
        try { window.MarketingModule._leadsLastApiOk = false; } catch {}
      }
    }

    const mergedLeads = (() => {
      if (skipFetch || !apiOk) return localLeads;
      const out = Array.isArray(apiLeads) ? [...apiLeads] : [];
      const ids = new Set(out.map(x => (x && x.id != null) ? String(x.id) : ''));
      const isNumericId = (id) => {
        const n = parseInt(String(id), 10);
        return Number.isFinite(n) && String(n) === String(id);
      };
      for (const l of Array.isArray(localLeads) ? localLeads : []) {
        if (!l) continue;
        const id = l.id != null ? String(l.id) : '';
        const keepLocal = !id || !isNumericId(id) || l._localOnly === true;
        if (keepLocal && (!id || !ids.has(id))) out.push(l);
      }
      return out;
    })();

    try {
      if (window.ModuleSystem && ModuleSystem.data) {
        ModuleSystem.data.leads = mergedLeads;
        if (typeof ModuleSystem.saveData === 'function') ModuleSystem.saveData();
      }
    } catch {}

    const ensureUi = () => {
      try {
        if (window.ModuleSystem && ModuleSystem.data) {
          ModuleSystem.data.ui = ModuleSystem.data.ui || {};
          if (!ModuleSystem.data.ui.marketingLeadsView) ModuleSystem.data.ui.marketingLeadsView = 'list';
          if (!ModuleSystem.data.ui.marketingLeadsPipelineMode) ModuleSystem.data.ui.marketingLeadsPipelineMode = 'status';
          ModuleSystem.data.ui.marketingLeadsFilters = ModuleSystem.data.ui.marketingLeadsFilters && typeof ModuleSystem.data.ui.marketingLeadsFilters === 'object'
            ? ModuleSystem.data.ui.marketingLeadsFilters
            : { q: '', temperatura: '', segmento: '', evento: '' };
          const f = ModuleSystem.data.ui.marketingLeadsFilters;
          if (f.q == null) f.q = '';
          if (f.temperatura == null) f.temperatura = '';
          if (f.segmento == null) f.segmento = '';
          if (f.evento == null) f.evento = '';
          return ModuleSystem.data.ui;
        }
      } catch {}
      return { marketingLeadsView: 'list', marketingLeadsPipelineMode: 'status', marketingLeadsFilters: { q: '', temperatura: '', segmento: '', evento: '' } };
    };

    const normalizeKey = (value) => (value || '').toString().trim().toLowerCase();
    const normalizeStatus = (value) => {
      const s = normalizeKey(value);
      if (s === 'novo' || s === 'contato' || s === 'qualificado') return s;
      if (s === 'convertido' || s === 'perdido') return s;
      return s || 'novo';
    };
    const normalizeTemperatura = (value) => {
      const t = normalizeKey(value);
      if (t === 'frio' || t === 'morno' || t === 'quente') return t;
      return t || 'frio';
    };
    const getSegmento = (lead) => (lead && (lead.segmento ?? lead.segmento_principal ?? lead.segmentoPrincipal)) ? String(lead.segmento ?? lead.segmento_principal ?? lead.segmentoPrincipal).trim() : '';
    const getEventoInteresse = (lead) => (lead && (lead.evento_interesse ?? lead.eventoInteresse)) ? String(lead.evento_interesse ?? lead.eventoInteresse).trim() : '';
    const funnelStageFromStatus = (statusValue) => {
      const s = normalizeStatus(statusValue);
      if (s === 'qualificado') return 'qualificado';
      if (s === 'convertido') return 'convertido';
      if (s === 'perdido') return 'perdido';
      return 'backlog';
    };
    const temperaturaBadge = (lead) => {
      const t = normalizeTemperatura(lead && lead.temperatura);
      const cls = t === 'quente' ? 'bg-red-100 text-red-800 border-red-200'
        : t === 'morno' ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
        : 'bg-blue-100 text-blue-800 border-blue-200';
      const label = t === 'quente' ? 'Quente' : t === 'morno' ? 'Morno' : 'Frio';
      return `<span class="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border ${cls}">${label}</span>`;
    };

    const ui = ensureUi();
    const filters = ui.marketingLeadsFilters || { q: '', temperatura: '', segmento: '', evento: '' };
    const currentView = ui.marketingLeadsView === 'pipeline' ? 'pipeline' : 'list';
    const currentMode = (ui.marketingLeadsPipelineMode || 'status').toString();

    const searchInput = document.getElementById('leads-search-input');
    const toggleBtn = document.getElementById('leads-filters-toggle');
    const clearBtn = document.getElementById('leads-filters-clear');
    const panel = document.getElementById('leads-filters-panel');
    const selTemp = document.getElementById('leads-filter-temperatura');
    const selSeg = document.getElementById('leads-filter-segmento');
    const selEvt = document.getElementById('leads-filter-evento');

    const updateFilterState = (patch) => {
      try {
        ui.marketingLeadsFilters = { ...(ui.marketingLeadsFilters || {}), ...(patch || {}) };
        if (typeof ModuleSystem.saveData === 'function') ModuleSystem.saveData();
      } catch {}
    };

    const setOptions = (selectEl, values) => {
      if (!selectEl) return;
      const prev = selectEl.value;
      const base = selectEl.querySelector('option[value=""]');
      const keepFirst = base ? base.outerHTML : '<option value="">Todos</option>';
      const uniq = Array.from(new Set((values || []).map(v => String(v || '').trim()).filter(v => v))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      selectEl.innerHTML = keepFirst + uniq.map(v => `<option value="${v.replace(/"/g, '&quot;')}">${v}</option>`).join('');
      if (prev) {
        const has = Array.from(selectEl.options || []).some(o => o && String(o.value) === String(prev));
        if (has) selectEl.value = prev;
      }
    };

    setOptions(selSeg, mergedLeads.map(getSegmento).filter(Boolean));
    setOptions(selEvt, mergedLeads.map(getEventoInteresse).filter(Boolean));

    try { if (searchInput && searchInput.value !== String(filters.q || '')) searchInput.value = String(filters.q || ''); } catch {}
    try { if (selTemp && selTemp.value !== String(filters.temperatura || '')) selTemp.value = String(filters.temperatura || ''); } catch {}
    try { if (selSeg && selSeg.value !== String(filters.segmento || '')) selSeg.value = String(filters.segmento || ''); } catch {}
    try { if (selEvt && selEvt.value !== String(filters.evento || '')) selEvt.value = String(filters.evento || ''); } catch {}

    if (toggleBtn && !toggleBtn.getAttribute('data-bound')) {
      toggleBtn.setAttribute('data-bound', '1');
      toggleBtn.addEventListener('click', () => {
        try { if (panel) panel.classList.toggle('hidden'); } catch {}
      });
    }

    if (clearBtn && !clearBtn.getAttribute('data-bound')) {
      clearBtn.setAttribute('data-bound', '1');
      clearBtn.addEventListener('click', () => {
        updateFilterState({ q: '', temperatura: '', segmento: '', evento: '' });
        try {
          if (searchInput) searchInput.value = '';
          if (selTemp) selTemp.value = '';
          if (selSeg) selSeg.value = '';
          if (selEvt) selEvt.value = '';
        } catch {}
        window.MarketingModule.loadLeads({ skipFetch: true });
      });
    }

    if (searchInput && !searchInput.getAttribute('data-bound')) {
      searchInput.setAttribute('data-bound', '1');
      searchInput.addEventListener('input', () => {
        try { window.clearTimeout(window.MarketingModule._leadsSearchDebounce); } catch {}
        window.MarketingModule._leadsSearchDebounce = window.setTimeout(() => {
          const q = String(searchInput.value || '');
          updateFilterState({ q });
          window.MarketingModule.loadLeads({ skipFetch: true });
        }, 120);
      });
    }

    const bindSelect = (selectEl, key) => {
      if (!selectEl || selectEl.getAttribute('data-bound')) return;
      selectEl.setAttribute('data-bound', '1');
      selectEl.addEventListener('change', () => {
        updateFilterState({ [key]: String(selectEl.value || '') });
        window.MarketingModule.loadLeads({ skipFetch: true });
      });
    };
    bindSelect(selTemp, 'temperatura');
    bindSelect(selSeg, 'segmento');
    bindSelect(selEvt, 'evento');

    const matchesFilters = (lead) => {
      const wantT = String((ui.marketingLeadsFilters && ui.marketingLeadsFilters.temperatura) || '');
      const wantS = String((ui.marketingLeadsFilters && ui.marketingLeadsFilters.segmento) || '');
      const wantE = String((ui.marketingLeadsFilters && ui.marketingLeadsFilters.evento) || '');
      const t = normalizeTemperatura(lead && lead.temperatura);
      const seg = getSegmento(lead);
      const evt = getEventoInteresse(lead);
      if (wantT && t !== wantT) return false;
      if (wantS && seg !== wantS) return false;
      if (wantE && evt !== wantE) return false;
      const q = normalizeKey((ui.marketingLeadsFilters && ui.marketingLeadsFilters.q) || '');
      if (!q) return true;
      const hay = normalizeKey([lead && lead.nome, lead && lead.empresa, lead && lead.email].filter(Boolean).join(' '));
      return hay.includes(q);
    };

    const filteredLeads = mergedLeads.filter(matchesFilters);

    const getWhatsappDigits = (lead) => {
      const raw = (lead && (lead.whatsapp || lead.telefone)) ? String(lead.whatsapp || lead.telefone) : '';
      const digits = raw.replace(/\D/g, '');
      if (!digits) return '';
      if (digits.startsWith('55')) return digits;
      if (digits.length >= 10) return '55' + digits;
      return digits;
    };
    const whatsappText = (lead) => {
      const nome = (lead && lead.nome) ? String(lead.nome).trim() : '';
      const empresa = (lead && lead.empresa) ? String(lead.empresa).trim() : '';
      const evento = getEventoInteresse(lead);
      const temp = normalizeTemperatura(lead && lead.temperatura);
      const base = nome ? `Olá ${nome}, tudo bem?` : 'Olá, tudo bem?';
      const ctx = [empresa ? `Sou da SAMS Locações e estou falando com a ${empresa}.` : 'Sou da SAMS Locações.', evento ? `Vi seu interesse no evento ${evento}.` : ''].filter(Boolean).join(' ');
      const ask = temp === 'quente'
        ? 'Podemos avançar para fechar os detalhes do stand e do orçamento?'
        : (temp === 'morno'
          ? 'Posso te ajudar com opções e valores para o seu stand?'
          : 'Quando puder, me diga o melhor horário para conversarmos sobre o seu stand.');
      return [base, ctx, ask].filter(Boolean).join(' ');
    };
    const whatsappUrl = (lead) => {
      const phone = getWhatsappDigits(lead);
      if (!phone) return '';
      return `https://wa.me/${phone}?text=${encodeURIComponent(whatsappText(lead))}`;
    };

    if (container && !container.getAttribute('data-wa-bound')) {
      container.setAttribute('data-wa-bound', 'true');
      container.addEventListener('click', (e) => {
        const btn = e.target && e.target.closest ? e.target.closest('[data-lead-whatsapp="1"]') : null;
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const lead = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.leads))
          ? (ModuleSystem.data.leads.find(x => x && x.id != null && String(x.id) === String(id)) || null)
          : null;
        const url = whatsappUrl(lead);
        if (!url) return;
        try { window.open(url, '_blank', 'noopener'); } catch { try { location.href = url; } catch {} }
      }, true);
    }

    const titleEl = document.getElementById('leads-title');
    if (titleEl) titleEl.textContent = currentView === 'pipeline' ? 'Pipeline de Leads' : 'Lista de Leads';

    const listEl = document.getElementById('leads-view-list');
    const pipelineEl = document.getElementById('leads-view-pipeline');
    const modesEl = document.getElementById('leads-pipeline-modes');
    if (listEl) listEl.classList.toggle('hidden', currentView === 'pipeline');
    if (pipelineEl) pipelineEl.classList.toggle('hidden', currentView !== 'pipeline');
    if (modesEl) modesEl.classList.toggle('hidden', currentView !== 'pipeline');

    if (currentView !== 'pipeline') {
      if (!tbody) return;

      const syncWarning = !apiOk && !skipFetch
        ? `<tr><td colspan="6" class="px-6 py-3 text-xs text-amber-700 bg-amber-50">Aviso: sem sincronização com o servidor no momento. Verifique login/conexão e atualize a página.</td></tr>`
        : '';

      const rows = filteredLeads.map(lead => `
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm font-medium text-gray-900">${lead.nome || ''}</div>
            <div class="text-sm text-gray-500">${lead.email || ''}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${lead.empresa || ''}</td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center gap-2">
              <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${window.UIHelpers ? UIHelpers.computeStatusClass(lead.status) : 'bg-blue-100 text-blue-800'}">${lead.status || '—'}</span>
              ${temperaturaBadge(lead)}
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${lead.origem || ''}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${lead.dataContato || (lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : '')}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
            ${getWhatsappDigits(lead) ? `<button type="button" data-lead-whatsapp="1" data-id="${lead.id}" class="text-emerald-600 hover:text-emerald-900" title="WhatsApp" aria-label="Abrir WhatsApp para ${lead.nome || lead.id}"><i class="fab fa-whatsapp"></i></button>` : ''}
            <button data-action="read" data-module="leads" data-id="${lead.id}" class="text-blue-600 hover:text-blue-900" title="Visualizar"><i class="fas fa-eye"></i></button>
            <button data-action="update" data-module="leads" data-id="${lead.id}" class="text-green-600 hover:text-green-900" title="Editar"><i class="fas fa-edit"></i></button>
            <button data-action="delete" data-module="leads" data-id="${lead.id}" class="text-red-600 hover:text-red-900" title="Excluir"><i class="fas fa-trash"></i></button>
          </td>
        </tr>
      `).join('');

      tbody.innerHTML = rows ? `${syncWarning}${rows}` : (syncWarning || `<tr><td colspan="6" class="px-6 py-4 text-sm text-gray-500">Nenhum lead encontrado.</td></tr>`);

      if (cardsView) {
        const cardWarning = (!apiOk && !skipFetch)
          ? `<div class="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">Aviso: sem sincronização com o servidor no momento.</div>`
          : '';
        const renderMobileCard = (lead) => {
          const tempClass = lead.temperatura === 'quente' ? 'hot' : lead.temperatura === 'morno' ? 'warm' : 'cold';
          const tempLabel = lead.temperatura === 'quente' ? '🔴 Quente' : lead.temperatura === 'morno' ? '🟡 Morno' : '🔵 Frio';
          const whatsappBtn = getWhatsappDigits(lead) ? `<button type="button" data-lead-whatsapp="1" data-id="${lead.id}" class="whatsapp" title="Enviar WhatsApp">💬 WhatsApp</button>` : '';
          const statusClass = window.UIHelpers ? UIHelpers.computeStatusClass(lead.status) : 'bg-blue-100 text-blue-800';
          const dataFormatada = lead.dataContato || (lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : '');
          return `
            <div class="lead-card">
              <div class="lead-card-header">
                <div class="lead-card-name">${lead.nome || ''}</div>
                <span class="lead-card-temperature ${tempClass}">${tempLabel}</span>
              </div>
              <div class="lead-card-body">
                ${lead.status ? `<div class="lead-card-field"><span class="lead-card-label">Status:</span><span class="lead-card-value"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${lead.status}</span></span></div>` : ''}
                <div class="lead-card-field"><span class="lead-card-label">Empresa:</span><span class="lead-card-value">${lead.empresa || '—'}</span></div>
                <div class="lead-card-field"><span class="lead-card-label">Email:</span><span class="lead-card-value">${lead.email || '—'}</span></div>
                <div class="lead-card-field"><span class="lead-card-label">Telefone:</span><span class="lead-card-value">${lead.telefone || '—'}</span></div>
                <div class="lead-card-field"><span class="lead-card-label">Origem:</span><span class="lead-card-value">${lead.origem || '—'}</span></div>
                ${dataFormatada ? `<div class="lead-card-field"><span class="lead-card-label">Data:</span><span class="lead-card-value">${dataFormatada}</span></div>` : ''}
              </div>
              <div class="lead-card-actions">
                ${whatsappBtn}
                <button data-action="read" data-module="leads" data-id="${lead.id}" class="view" title="Visualizar lead">👁️ Ver</button>
                <button data-action="update" data-module="leads" data-id="${lead.id}" class="edit" title="Editar lead">✏️ Editar</button>
                <button data-action="delete" data-module="leads" data-id="${lead.id}" class="delete" title="Excluir lead">🗑️ Excluir</button>
              </div>
            </div>
          `;
        };
        cardsView.innerHTML = cardWarning + (filteredLeads.map(renderMobileCard).join('') || `<div class="text-sm text-gray-500">Nenhum lead encontrado.</div>`);
      }
      try { window.MarketingModule[retryKey] = 0; } catch {}
      return;
    }

    const board = document.getElementById('leads-pipeline-board');
    if (!board) {
      const attempt = (window.MarketingModule[retryKey] || 0) + 1;
      window.MarketingModule[retryKey] = attempt;
      if (attempt <= 12) setTimeout(() => window.MarketingModule.loadLeads(opts), 150 * attempt);
      return;
    }

    const mode = currentMode === 'temperatura' ? 'temperatura' : (currentMode === 'funnel' ? 'funnel' : 'status');
    const columns = mode === 'temperatura'
      ? [
          { key: 'frio', label: 'Frio', color: 'bg-blue-50 border-blue-200' },
          { key: 'morno', label: 'Morno', color: 'bg-yellow-50 border-yellow-200' },
          { key: 'quente', label: 'Quente', color: 'bg-red-50 border-red-200' }
        ]
      : (mode === 'funnel'
        ? [
            { key: 'backlog', label: 'Backlog', color: 'bg-gray-50 border-gray-200' },
            { key: 'qualificado', label: 'Qualificado', color: 'bg-blue-50 border-blue-200' },
            { key: 'convertido', label: 'Convertido', color: 'bg-green-50 border-green-200' },
            { key: 'perdido', label: 'Perdido', color: 'bg-red-50 border-red-200' }
          ]
        : [
            { key: 'novo', label: 'Novo', color: 'bg-gray-50 border-gray-200' },
            { key: 'contato', label: 'Contato', color: 'bg-blue-50 border-blue-200' },
            { key: 'qualificado', label: 'Qualificado', color: 'bg-green-50 border-green-200' }
          ]);

    const keyForLead = (lead) => {
      if (mode === 'temperatura') return normalizeTemperatura(lead && lead.temperatura);
      if (mode === 'funnel') return funnelStageFromStatus(lead && lead.status);
      return normalizeStatus(lead && lead.status);
    };

    const renderCard = (lead) => {
      const id = lead && lead.id != null ? lead.id : '';
      const nome = lead && lead.nome ? lead.nome : '';
      const empresa = lead && lead.empresa ? lead.empresa : '';
      const origem = lead && lead.origem ? lead.origem : '';
      const status = lead && lead.status ? lead.status : '';
      return `
        <div class="bg-white rounded-md border border-gray-200 p-3 shadow-sm hover:shadow transition cursor-move select-none"
             draggable="true"
             data-drag-id="${id}">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0" data-drag-handle="true">
              <div class="text-sm font-semibold text-gray-900 truncate">${nome}</div>
              <div class="text-xs text-gray-500 truncate">${empresa}</div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              ${getWhatsappDigits(lead) ? `<button type="button" data-lead-whatsapp="1" data-id="${id}" class="text-emerald-600 hover:text-emerald-900" title="WhatsApp"><i class="fab fa-whatsapp"></i></button>` : ''}
              <button data-action="read" data-module="leads" data-id="${id}" class="text-blue-600 hover:text-blue-900" title="Visualizar"><i class="fas fa-eye"></i></button>
              <button data-action="update" data-module="leads" data-id="${id}" class="text-green-600 hover:text-green-900" title="Editar"><i class="fas fa-edit"></i></button>
              <button data-action="delete" data-module="leads" data-id="${id}" class="text-red-600 hover:text-red-900" title="Excluir"><i class="fas fa-trash"></i></button>
            </div>
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            ${temperaturaBadge(lead)}
            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${window.UIHelpers ? UIHelpers.computeStatusClass(status) : 'bg-blue-100 text-blue-800'}">${status || '—'}</span>
          </div>
          ${origem ? `<div class="mt-2 text-xs text-gray-500 truncate">Origem: ${origem}</div>` : ''}
        </div>
      `;
    };

    const htmlCols = columns.map(col => {
      const items = filteredLeads.filter(l => keyForLead(l) === col.key);
      return `
        <div class="rounded-lg border ${col.color} p-3" style="min-width: 280px;" data-drop="col" data-key="${col.key}">
          <div class="flex items-center justify-between mb-3">
            <div class="text-sm font-semibold text-gray-800">${col.label}</div>
            <div class="text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-full px-2 py-0.5">${items.length}</div>
          </div>
          <div class="space-y-2" data-drop="list">
            ${items.map(renderCard).join('') || `<div class="text-xs text-gray-500">Arraste cards aqui</div>`}
          </div>
        </div>
      `;
    }).join('');

    board.style.display = 'grid';
    board.style.gridTemplateColumns = `repeat(${columns.length}, minmax(280px, 1fr))`;
    board.style.gap = '16px';
    board.innerHTML = htmlCols;
    try { window.MarketingModule[retryKey] = 0; } catch {}

    const updateLocalLead = (id, patch) => {
      try {
        if (!(window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.leads))) return;
        const idx = ModuleSystem.data.leads.findIndex(x => x && x.id != null && String(x.id) === String(id));
        if (idx === -1) return;
        ModuleSystem.data.leads[idx] = { ...ModuleSystem.data.leads[idx], ...patch };
        if (typeof ModuleSystem.saveData === 'function') ModuleSystem.saveData();
      } catch {}
    };

    const removeDraggingClass = () => {
      document.querySelectorAll('[data-drag-id].dragging').forEach(el => el.classList.remove('dragging', 'opacity-60'));
      document.querySelectorAll('[data-drop=\"col\"].ring-2').forEach(el => el.classList.remove('ring-2', 'ring-blue-400'));
    };

    if (!board.hasAttribute('data-dnd-bound')) {
      board.setAttribute('data-dnd-bound', 'true');

      board.addEventListener('dragstart', (e) => {
        const card = e.target && e.target.closest ? e.target.closest('[data-drag-id]') : null;
        if (!card) return;
        if (e.target && e.target.closest && e.target.closest('button,[data-action],[data-lead-whatsapp]')) {
          e.preventDefault();
          return;
        }
        card.classList.add('dragging', 'opacity-60');
        const id = card.getAttribute('data-drag-id');
        try {
          e.dataTransfer.setData('text/plain', String(id));
          e.dataTransfer.effectAllowed = 'move';
        } catch {}
      });

      board.addEventListener('dragend', () => {
        removeDraggingClass();
      });

      board.addEventListener('dragover', (e) => {
        const col = e.target && e.target.closest ? e.target.closest('[data-drop="col"]') : null;
        if (!col) return;
        e.preventDefault();
        try { if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; } catch {}
        col.classList.add('ring-2', 'ring-blue-400');
      });

      board.addEventListener('dragenter', (e) => {
        const col = e.target && e.target.closest ? e.target.closest('[data-drop="col"]') : null;
        if (!col) return;
        e.preventDefault();
        col.classList.add('ring-2', 'ring-blue-400');
      });

      board.addEventListener('dragleave', (e) => {
        const col = e.target && e.target.closest ? e.target.closest('[data-drop="col"]') : null;
        if (!col) return;
        col.classList.remove('ring-2', 'ring-blue-400');
      });

      board.addEventListener('drop', async (e) => {
        const col = e.target && e.target.closest ? e.target.closest('[data-drop="col"]') : null;
        if (!col) return;
        e.preventDefault();
        col.classList.remove('ring-2', 'ring-blue-400');

        let id = null;
        try { id = e.dataTransfer.getData('text/plain'); } catch {}
        if (!id) return;

        const newKey = col.getAttribute('data-key');
        if (!newKey) return;

        let body = null;
        let localPatch = null;
        if (mode === 'temperatura') {
          body = { temperatura: newKey };
          localPatch = { temperatura: newKey };
        } else if (mode === 'funnel') {
          const finalStatus = newKey === 'backlog' ? 'contato' : newKey;
          body = { status: finalStatus };
          localPatch = { status: finalStatus };
        } else {
          body = { status: newKey };
          localPatch = { status: newKey };
        }

        try {
          const resp = await fetch(`/api/crm/leads/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body)
          });
          const payload = await resp.json().catch(() => ({}));
          if (!resp.ok) {
            const msg = payload && payload.error ? payload.error : 'Falha ao mover lead';
            throw new Error(msg);
          }
          updateLocalLead(id, localPatch);
          removeDraggingClass();
          setTimeout(() => window.MarketingModule.loadLeads({ skipFetch: true }), 50);
        } catch (err) {
          if (window.Toast && typeof window.Toast.show === 'function') {
            window.Toast.show(err && err.message ? err.message : 'Falha ao mover lead', 'error');
          } else {
            alert(err && err.message ? err.message : 'Falha ao mover lead');
          }
          setTimeout(() => window.MarketingModule.loadLeads({ skipFetch: true }), 50);
        }
      });
    }
  } catch (err) {
    const tbody = document.getElementById('leads-list-body');
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-sm text-red-600">Erro ao carregar lista de leads</td></tr>`;
    try {
      const cardsView = document.getElementById('leads-cards-view');
      if (cardsView) cardsView.innerHTML = `<div class="text-sm text-red-600">Erro ao carregar lista de leads</div>`;
    } catch {}
    if (window.Toast && typeof window.Toast.show === 'function') {
      window.Toast.show((err && err.message) || 'Erro ao listar leads', 'error');
    }
  } finally {
    const container = document.getElementById('leads-list-container');
    if (container) container.setAttribute('aria-busy', 'false');
  }
};

window.MarketingModule.loadCampanhas = async function() {
  try {
    const container = document.getElementById('campanhas-list-container');
    const tbody = document.getElementById('campanhas-list-body');
    if (!container || !tbody) return;

    container.setAttribute('aria-busy', 'true');
    const campanhas = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.campanhas)) ? ModuleSystem.data.campanhas : [];

    tbody.innerHTML = (campanhas || []).map(campanha => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-medium text-gray-900">${campanha.nome || ''}</div>
          <div class="text-sm text-gray-500">${campanha.descricao ? String(campanha.descricao).substring(0, 50) + '...' : ''}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${campanha.tipo || '—'}</td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${window.UIHelpers ? UIHelpers.computeStatusClass(campanha.status) : 'bg-gray-100 text-gray-800'}">
            ${campanha.status || '—'}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${(campanha.data_inicio || '')} - ${(campanha.data_fim || '')}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
          <button data-action="read" data-module="marketing_campanhas" data-id="${campanha.id}" class="text-blue-600 hover:text-blue-900" title="Visualizar"><i class="fas fa-eye"></i></button>
          <button data-action="update" data-module="marketing_campanhas" data-id="${campanha.id}" class="text-green-600 hover:text-green-900" title="Editar"><i class="fas fa-edit"></i></button>
          <button data-action="delete" data-module="marketing_campanhas" data-id="${campanha.id}" class="text-red-600 hover:text-red-900" title="Excluir"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `).join('') || `<tr><td colspan="5" class="px-6 py-4 text-sm text-gray-500">Nenhuma campanha encontrada.</td></tr>`;
  } finally {
    const container = document.getElementById('campanhas-list-container');
    if (container) container.setAttribute('aria-busy', 'false');
  }
};

window.MarketingModule.loadContatos = async function() {
  try {
    const container = document.getElementById('contatos-list-container');
    const tbody = document.getElementById('contatos-list-body');
    if (!container || !tbody) return;

    container.setAttribute('aria-busy', 'true');
    tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-4 text-sm text-gray-500">Carregando contatos...</td></tr>`;

    const current =
      (window.AuthSystem && typeof window.AuthSystem.getCurrentUser === 'function')
        ? (window.AuthSystem.getCurrentUser() || null)
        : ((window.AuthSystem && window.AuthSystem.currentUser) ? window.AuthSystem.currentUser : null);
    const role = current && current.role != null ? String(current.role).toLowerCase() : '';
    const canAssign = role === 'administrador' || role === 'admin' || role === 'gerente' || role === 'gerencia' || role === 'gerência' || role === 'gestor' || role === 'gestao' || role === 'gestão';

    const filter = (window.MarketingModule && window.MarketingModule._contatosFilter) ? String(window.MarketingModule._contatosFilter) : 'all';
    if (window.MarketingModule) window.MarketingModule._contatosFilter = (filter === 'unassigned') ? 'unassigned' : 'all';

    if (canAssign) {
      try {
        const ur = await fetch('/api/crm/users', { credentials: 'include' });
        const uj = await ur.json().catch(() => []);
        if (ur.ok && Array.isArray(uj) && window.ModuleSystem && ModuleSystem.data) {
          ModuleSystem.data.usuarios = uj.map(u => ({
            id: u.id,
            nome: u.name,
            name: u.name,
            email: u.email,
            role: u.role
          }));
          ModuleSystem.saveData();
        }
      } catch (err) {
        console.warn('Failed to fetch users for assign dropdown:', err);
      }
    }

    const bindFilters = () => {
      if (container.getAttribute('data-contatos-filters-bound') === 'true') return;
      container.setAttribute('data-contatos-filters-bound', 'true');
      container.addEventListener('click', (e) => {
        const btn = e.target && e.target.closest ? e.target.closest('[data-contatos-filter]') : null;
        if (!btn) return;
        const value = btn.getAttribute('data-contatos-filter');
        if (!value) return;
        if (!window.MarketingModule) return;
        window.MarketingModule._contatosFilter = value === 'unassigned' ? 'unassigned' : 'all';
        try {
          const all = container.querySelectorAll('[data-contatos-filter]');
          all.forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
        } catch {}
        window.MarketingModule.loadContatos();
      });
    };
    bindFilters();

    const local = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.contatos)) ? [...ModuleSystem.data.contatos] : [];
    let apiRows = [];
    let apiOk = false;
    try {
      const url = filter === 'unassigned' ? '/api/crm/contatos?unassigned=1' : '/api/crm/contatos';
      const r = await fetch(url, { credentials: 'include' });
      const j = await r.json().catch(() => []);
      if (r.ok && Array.isArray(j)) {
        apiRows = j;
        apiOk = true;
      }
    } catch {}

    const merged = (() => {
      if (!apiOk) return local;
      const out = Array.isArray(apiRows) ? [...apiRows] : [];
      const ids = new Set(out.map(x => (x && x.id != null) ? String(x.id) : ''));
      const isNumericId = (id) => /^\d+$/.test(String(id));
      for (const c of Array.isArray(local) ? local : []) {
        if (!c) continue;
        const id = c.id != null ? String(c.id) : '';
        const keepLocal = !id || !isNumericId(id) || c._localOnly === true;
        if (keepLocal && (!id || !ids.has(id))) out.push(c);
      }
      return out;
    })();

    const mergedFiltered = (() => {
      if (filter !== 'unassigned') return merged;
      return (merged || []).filter(c => {
        const rid = c && (c.responsavel_id ?? c.responsavelId) != null ? String(c.responsavel_id ?? c.responsavelId).trim() : '';
        return !rid || rid === '0';
      });
    })();

    try {
      if (window.ModuleSystem && ModuleSystem.data) {
        ModuleSystem.data.contatos = merged;
        ModuleSystem.saveData();
      }
    } catch {}

    const usuarios = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.usuarios)) ? ModuleSystem.data.usuarios : [];
    const normalize = (v) => (v != null ? String(v).trim().toLowerCase() : '');
    const vendedores = usuarios.filter(u => {
      const r = normalize(u?.role || u?.perfil || u?.cargo);
      // Permitir atribuir a vendedores, comerciais, gerentes e administradores
      return r === 'vendedor' || r === 'comercial' || r === 'vendas' || 
             r === 'administrador' || r === 'admin' || 
             r === 'gerente' || r === 'gerencia' || r === 'marketing';
    });
    const byId = new Map(usuarios.filter(u => u && u.id != null).map(u => [String(u.id), u]));
    const getRespLabel = (contato) => {
      const rid = contato && (contato.responsavel_id ?? contato.responsavelId) != null ? String(contato.responsavel_id ?? contato.responsavelId) : '';
      if (rid && byId.has(rid)) {
        const u = byId.get(rid);
        return u?.nome || u?.name || u?.email || rid;
      }
      return contato?.responsavel_text || contato?.responsavelText || '';
    };

    const bindAssign = () => {
      if (!canAssign) return;
      if (tbody.getAttribute('data-contatos-assign-bound') === 'true') return;
      tbody.setAttribute('data-contatos-assign-bound', 'true');
      tbody.addEventListener('click', async (e) => {
        const btn = e.target && e.target.closest ? e.target.closest('[data-assign-contato]') : null;
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        if (!id) return;
        const row = btn.closest('tr');
        const sel = row ? row.querySelector('select[data-assign-select="1"]') : null;
        const val = sel ? String(sel.value || '').trim() : '';
        const rid = val ? Number(val) : NaN;
        if (!Number.isFinite(rid) || rid <= 0) {
          if (window.Toast) window.Toast.show('Selecione um vendedor', 'error');
          return;
        }
        const prev = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        try {
          const r = await fetch(`/api/crm/contatos/${encodeURIComponent(String(id))}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ responsavel_id: rid })
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) {
            throw new Error(j && j.error ? j.error : 'Falha ao atribuir contato');
          }
          try {
            if (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.contatos)) {
              const idx = ModuleSystem.data.contatos.findIndex(c => c && c.id != null && String(c.id) === String(id));
              if (idx >= 0) {
                const u = byId.get(String(rid));
                ModuleSystem.data.contatos[idx] = {
                  ...ModuleSystem.data.contatos[idx],
                  responsavel_id: rid,
                  responsavel_text: u ? (u.nome || u.name || u.email || null) : null
                };
                ModuleSystem.saveData();
              }
            }
          } catch {}
          if (window.Toast) window.Toast.show('Contato atribuído.', 'success');
          window.MarketingModule.loadContatos();
        } catch (err) {
          if (window.Toast) window.Toast.show(err && err.message ? err.message : 'Falha ao atribuir contato', 'error');
        } finally {
          btn.disabled = false;
          btn.innerHTML = prev;
        }
      });
    };
    bindAssign();

    tbody.innerHTML = (mergedFiltered || []).map(contato => {
      const ridRaw = contato && (contato.responsavel_id ?? contato.responsavelId) != null ? String(contato.responsavel_id ?? contato.responsavelId).trim() : '';
      const assigned = !!(ridRaw && ridRaw !== '0');
      const respLabel = getRespLabel(contato) || (assigned ? ridRaw : 'Não atribuído');
      const respCell = canAssign
        ? `
            <div class="flex items-center gap-2">
              <select data-assign-select="1" class="px-2 py-1 border rounded text-sm">
                <option value="">${assigned ? 'Alterar...' : 'Selecionar...'}</option>
                ${vendedores.map(u => `<option value="${u.id}">${u.nome || u.name || u.email || u.id}</option>`).join('')}
              </select>
              <button type="button" data-assign-contato="1" data-id="${contato.id}"
                      class="px-2 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-700 text-white">
                Atribuir
              </button>
              <span class="text-xs text-gray-500">${assigned ? `Atual: ${respLabel}` : 'Não atribuído'}</span>
            </div>
          `
        : `<span class="text-sm text-gray-900">${respLabel || 'Não atribuído'}</span>`;

      return `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-medium text-gray-900">${contato.nome || 'N/A'}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${contato.email || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${contato.telefone || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${contato.empresa || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap">${respCell}</td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${window.UIHelpers ? UIHelpers.computeStatusClass(contato.status) : 'bg-gray-100 text-gray-800'}">
              ${contato.status || '—'}
            </span>
            ${window.UIHelpers ? UIHelpers.renderSegmentBadge(contato.segmento || contato.categoria || contato.setor) : ''}
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <button data-action="read" data-module="marketing_contatos" data-id="${contato.id}" class="text-gray-600 hover:text-gray-900 mr-3" title="Visualizar"><i class="fas fa-eye"></i></button>
          <button data-action="update" data-module="marketing_contatos" data-id="${contato.id}" class="text-indigo-600 hover:text-indigo-900 mr-3" title="Editar"><i class="fas fa-edit"></i></button>
          <button data-action="delete" data-module="marketing_contatos" data-id="${contato.id}" class="text-red-600 hover:text-red-900" title="Excluir"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `;
    }).join('') || `<tr><td colspan="7" class="px-6 py-4 text-sm text-gray-500">Nenhum contato encontrado.</td></tr>`;
  } finally {
    const container = document.getElementById('contatos-list-container');
    if (container) container.setAttribute('aria-busy', 'false');
  }
};

if (!window.ComercialModule) {
  window.ComercialModule = {};
}

window.ComercialModule.loadClientes = async function() {
  try {
    const container = document.getElementById('clientes-list-container');
    const tbody = document.getElementById('clientes-list-body');
    if (!container || !tbody) return;

    container.setAttribute('aria-busy', 'true');
    tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-sm text-gray-500">Carregando clientes...</td></tr>`;

    const localClientes = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.clientes)) ? [...ModuleSystem.data.clientes] : [];
    let apiClientes = [];
    try {
      const response = await fetch('/api/crm/clientes', { credentials: 'include' });
      const data = await response.json().catch(() => []);
      if (response.ok && Array.isArray(data)) apiClientes = data;
    } catch {}

    const normalize = (c) => ({
      ...c,
      documento: c?.documento || c?.cnpj || null
    });

    const byId = new Map();
    for (const c of localClientes) if (c && c.id != null) byId.set(String(c.id), normalize(c));
    for (const c of apiClientes) if (c && c.id != null) byId.set(String(c.id), normalize(c));
    const merged = Array.from(byId.values());
    ModuleSystem.data.clientes = merged;
    ModuleSystem.saveData();

    // Cache para filtragem sem novo fetch
    window.ComercialModule._clientesCache = merged;

    const qEl = document.getElementById('clientes-filter-q');
    const statusEl = document.getElementById('clientes-filter-status');
    const clearEl = document.getElementById('clientes-filter-clear');

    const normalizeText = (v) => (v == null ? '' : String(v)).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    const renderRows = (list) => {
      tbody.innerHTML = (list || []).map(cliente => `
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm font-medium text-gray-900">${cliente.nome || ''}</div>
            <div class="text-sm text-gray-500">${cliente.email || ''}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${cliente.documento || '—'}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${cliente.telefone || '—'}</td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center gap-2">
              <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${UIHelpers.computeStatusClass(cliente.status)}">${cliente.status || '—'}</span>
              ${UIHelpers.renderSegmentBadge(cliente.segmento || cliente.categoria || cliente.setor)}
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
            <button data-action="read" data-module="clientes" data-id="${cliente.id}" class="text-blue-600 hover:text-blue-900" title="Visualizar" aria-label="Visualizar detalhes do cliente ${cliente.nome || ''}">
              <i class="fas fa-eye"></i>
            </button>
            <button data-action="update" data-module="clientes" data-id="${cliente.id}" class="text-green-600 hover:text-green-900" title="Editar" aria-label="Editar cliente ${cliente.nome || ''}">
              <i class="fas fa-edit"></i>
            </button>
            <button data-action="delete" data-module="clientes" data-id="${cliente.id}" class="text-red-600 hover:text-red-900" title="Excluir" aria-label="Excluir cliente ${cliente.nome || ''}">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `).join('') || `<tr><td colspan="5" class="px-6 py-4 text-sm text-gray-500">Nenhum cliente encontrado.</td></tr>`;
    };

    const applyFilters = () => {
      const q = qEl ? normalizeText(qEl.value) : '';
      const st = statusEl ? String(statusEl.value || '').trim().toLowerCase() : '';
      const list = Array.isArray(window.ComercialModule._clientesCache) ? window.ComercialModule._clientesCache : [];
      const filtered = list.filter(c => {
        if (st && String(c.status || '').toLowerCase() !== st) return false;
        if (q) {
          const hay = normalizeText([c.nome, c.email, c.documento, c.cnpj, c.telefone, c.segmento].filter(Boolean).join(' '));
          if (!hay.includes(q)) return false;
        }
        return true;
      });
      renderRows(filtered);
    };

    renderRows(merged);

    if (!container.getAttribute('data-filters-bound')) {
      container.setAttribute('data-filters-bound', '1');
      if (qEl) qEl.addEventListener('input', applyFilters);
      if (statusEl) statusEl.addEventListener('change', applyFilters);
      if (clearEl) clearEl.addEventListener('click', () => {
        if (qEl) qEl.value = '';
        if (statusEl) statusEl.value = '';
        applyFilters();
      });
    }
  } finally {
    const container = document.getElementById('clientes-list-container');
    if (container) container.removeAttribute('aria-busy');
  }
};

window.ComercialModule.loadEventos = async function() {
  try {
    const container = document.getElementById('eventos-list-container');
    const tbody = document.getElementById('eventos-list-body');
    if (!container || !tbody) return;

    container.setAttribute('aria-busy', 'true');
    tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-sm text-gray-500">Carregando eventos...</td></tr>`;

    const localEventos = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.eventos)) ? [...ModuleSystem.data.eventos] : [];
    let apiEventos = [];
    let apiOk = false;
    try {
      const response = await fetch('/api/crm/eventos', { credentials: 'include' });
      const data = await response.json().catch(() => []);
      if (response.ok && Array.isArray(data)) {
        apiEventos = data;
        apiOk = true;
      }
    } catch {}

    const localWithoutId = [];
    const localById = new Map();
    for (const e of localEventos) {
      if (!e || e.id == null) {
        localWithoutId.push(e);
        continue;
      }
      localById.set(String(e.id), e);
    }

    let merged = [];
    if (apiOk) {
      const apiIds = new Set(apiEventos.filter(e => e && e.id != null).map(e => String(e.id)));
      const localOnly = Array.from(localById.values()).filter(e => {
        const id = e && e.id != null ? String(e.id) : '';
        if (!id) return false;
        if (apiIds.has(id)) return false;
        return !/^\d+$/.test(id);
      });
      const apiMerged = apiEventos
        .filter(e => e && e.id != null)
        .map(e => {
          const id = String(e.id);
          const prev = localById.get(id);
          return prev ? { ...prev, ...e } : e;
        });
      merged = [...localWithoutId, ...localOnly, ...apiMerged];
    } else {
      const byId = new Map();
      for (const e of localEventos) if (e && e.id != null) byId.set(String(e.id), e);
      for (const e of apiEventos) if (e && e.id != null) byId.set(String(e.id), { ...(byId.get(String(e.id)) || {}), ...e });
      merged = [...localWithoutId, ...Array.from(byId.values())];
    }
    ModuleSystem.data.eventos = merged;
    ModuleSystem.saveData();

    const normalizeText = (v) => (v == null ? '' : String(v)).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const toIso = (v) => (v != null ? String(v).slice(0, 10) : '');
    const parseDateFlex = (v) => {
      const raw = v == null ? '' : String(v).trim();
      if (!raw) return null;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
        const [dd, mm, yyyy] = raw.split('/');
        const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        return isNaN(d.getTime()) ? null : d;
      }
      const s = toIso(raw);
      if (!s) return null;
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };
    const getStart = (ev) => ev?.dataInicio ?? ev?.data_inicio ?? ev?.dataInicioEvento ?? ev?.data_inicio_evento ?? null;
    const getEnd = (ev) => ev?.dataFim ?? ev?.data_fim ?? ev?.dataTermino ?? ev?.data_termino ?? null;
    const formatRange = (ev) => {
      const a = toIso(getStart(ev));
      const b = toIso(getEnd(ev));
      if (a && b) return `${a} a ${b}`;
      if (a) return a;
      if (b) return b;
      return '—';
    };
    const extractUf = (ev) => {
      const direct = ev?.uf || ev?.UF || ev?.estado || ev?.Estado || ev?.estado_uf || ev?.estadoUf || '';
      const d = String(direct || '').trim();
      if (d && /^[A-Za-z]{2}$/.test(d)) return d.toUpperCase();
      const pool = [ev?.endereco, ev?.local, ev?.cidade, ev?.municipio].filter(Boolean).map(String).join(' ');
      const m = pool.toUpperCase().match(/\/([A-Z]{2})\b/);
      if (m) return m[1];
      const m2 = pool.toUpperCase().match(/\b([A-Z]{2})\b/);
      return m2 ? m2[1] : '';
    };
    const statusClass = (raw) => {
      const s = raw != null ? String(raw).trim().toLowerCase() : '';
      if (!s) return 'bg-gray-100 text-gray-800';
      if (s.includes('confirm')) return 'bg-green-100 text-green-800';
      if (s.includes('cancel')) return 'bg-gray-200 text-gray-700';
      if (s.includes('concl')) return 'bg-emerald-100 text-emerald-800';
      return 'bg-yellow-100 text-yellow-800';
    };
    const renderRows = (list) => {
      tbody.innerHTML = (list || []).map(evento => `
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm font-medium text-gray-900">${evento.nome || ''}</div>
            <div class="text-sm text-gray-500">${evento.organizadora || ''}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-gray-900">${evento.local || ''}</div>
            <div class="text-sm text-gray-500">${evento.endereco || ''}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatRange(evento)}</td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass(evento.status)}">
              ${evento.status || '—'}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
            <button data-action="read" data-module="eventos" data-id="${evento.id}" class="text-blue-600 hover:text-blue-900" title="Visualizar evento" aria-label="Visualizar detalhes do evento ${evento.nome || ''}">
              <i class="fas fa-eye"></i>
            </button>
            <button data-action="update" data-module="eventos" data-id="${evento.id}" class="text-green-600 hover:text-green-900" title="Editar evento" aria-label="Editar evento ${evento.nome || ''}">
              <i class="fas fa-edit"></i>
            </button>
            <button data-action="delete" data-module="eventos" data-id="${evento.id}" class="text-red-600 hover:text-red-900" title="Excluir evento" aria-label="Excluir evento ${evento.nome || ''}">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `).join('') || `<tr><td colspan="5" class="px-6 py-4 text-sm text-gray-500">Nenhum evento encontrado.</td></tr>`;
    };

    const qEl = document.getElementById('eventos-filter-q');
    const fromEl = document.getElementById('eventos-filter-from');
    const toEl = document.getElementById('eventos-filter-to');
    const ufEl = document.getElementById('eventos-filter-uf');
    const statusEl = document.getElementById('eventos-filter-status');
    const clearEl = document.getElementById('eventos-filter-clear');

    window.ComercialModule._eventosCache = merged;

    const ensureSelectOptions = () => {
      if (ufEl) {
        const before = ufEl.value;
        const ufs = Array.from(new Set(merged.map(extractUf).filter(Boolean))).sort();
        ufEl.innerHTML = [`<option value="">Todas</option>`].concat(ufs.map(uf => `<option value="${uf}">${uf}</option>`)).join('');
        ufEl.value = before;
      }
      if (statusEl) {
        const before = statusEl.value;
        const statuses = Array.from(new Set(merged.map(e => (e && e.status != null ? String(e.status).trim() : '')).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        statusEl.innerHTML = [`<option value="">Todos</option>`].concat(statuses.map(s => `<option value="${s}">${s}</option>`)).join('');
        statusEl.value = before;
      }
    };

    const getFilters = () => ({
      q: qEl ? normalizeText(qEl.value) : '',
      from: fromEl && fromEl.value ? parseDateFlex(fromEl.value) : null,
      to: toEl && toEl.value ? parseDateFlex(toEl.value) : null,
      uf: ufEl ? String(ufEl.value || '').trim().toUpperCase() : '',
      status: statusEl ? String(statusEl.value || '').trim() : ''
    });

    const applyFilters = (list, f) => {
      const q = f.q;
      const from = f.from;
      const to = f.to;
      const uf = f.uf;
      const status = f.status;
      return (list || []).filter(ev => {
        if (uf) {
          const evUf = extractUf(ev);
          if (!evUf || evUf !== uf) return false;
        }
        if (status) {
          const s = ev?.status != null ? String(ev.status).trim() : '';
          if (s !== status) return false;
        }
        if (from || to) {
          const evStart = parseDateFlex(getStart(ev)) || parseDateFlex(getEnd(ev));
          const evEnd = parseDateFlex(getEnd(ev)) || evStart;
          if (from && to) {
            if (!evStart || !evEnd) return false;
            if (evEnd < from) return false;
            if (evStart > to) return false;
          } else if (from) {
            if (!evEnd) return false;
            if (evEnd < from) return false;
          } else if (to) {
            if (!evStart) return false;
            if (evStart > to) return false;
          }
        }
        if (q) {
          const hay = normalizeText([ev?.nome, ev?.local, ev?.endereco, ev?.organizadora, extractUf(ev)].filter(Boolean).join(' '));
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    };

    const rerenderFromCache = () => {
      const list = Array.isArray(window.ComercialModule._eventosCache) ? window.ComercialModule._eventosCache : [];
      const filtered = applyFilters(list, getFilters());
      renderRows(filtered);
    };

    ensureSelectOptions();
    rerenderFromCache();

    if (!container.getAttribute('data-filters-bound')) {
      container.setAttribute('data-filters-bound', '1');
      const onChange = () => rerenderFromCache();
      if (qEl) qEl.addEventListener('input', onChange);
      if (fromEl) fromEl.addEventListener('change', onChange);
      if (toEl) toEl.addEventListener('change', onChange);
      if (ufEl) ufEl.addEventListener('change', onChange);
      if (statusEl) statusEl.addEventListener('change', onChange);
      if (clearEl) {
        clearEl.addEventListener('click', () => {
          if (qEl) qEl.value = '';
          if (fromEl) fromEl.value = '';
          if (toEl) toEl.value = '';
          if (ufEl) ufEl.value = '';
          if (statusEl) statusEl.value = '';
          rerenderFromCache();
        });
      }
    }
  } finally {
    const container = document.getElementById('eventos-list-container');
    if (container) container.removeAttribute('aria-busy');
  }
};

window.ComercialModule.loadBriefings = async function() {
  const formatCurrencyBR = (value) => {
    try {
      const n = typeof value === 'string' ? parseFloat(value) : Number(value);
      if (!isFinite(n)) return 'N/A';
      return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } catch {
      return 'N/A';
    }
  };

  const getEventoNome = (briefing) => {
    if (briefing && briefing.nomeEvento) return briefing.nomeEvento;
    if (briefing && briefing.evento) return briefing.evento;
    const eventos = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.eventos)) ? ModuleSystem.data.eventos : [];
    if (briefing && briefing.eventoId != null) {
      const e = eventos.find(ev => ev.id == briefing.eventoId);
      if (e && e.nome) return e.nome;
    }
    return 'N/A';
  };

  const computeCode = (b) => {
    const idNum = b && b.id != null ? Number(b.id) : null;
    const idStr = Number.isFinite(idNum) ? String(Math.trunc(idNum)).padStart(4, '0') : (b && b.id != null ? String(b.id) : '');
    let year = null;
    try {
      const d = b && (b.created_at || b.createdAt) ? new Date(b.created_at || b.createdAt) : null;
      if (d && !isNaN(d.getTime())) year = d.getFullYear();
    } catch {}
    if (!year) year = new Date().getFullYear();
    return idStr ? `BRF ${idStr}/${year}` : `BRF/${year}`;
  };

  try {
    const container = document.getElementById('briefings-list-container');
    const tbody = document.getElementById('briefings-list-body');
    if (!container || !tbody) return;

    container.setAttribute('aria-busy', 'true');
    tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-sm text-gray-500">Carregando briefings...</td></tr>`;

    const local = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.briefings)) ? [...ModuleSystem.data.briefings] : [];
    let api = [];
    try {
      const response = await fetch('/api/crm/briefings', { credentials: 'include' });
      const data = await response.json().catch(() => []);
      if (response.ok && Array.isArray(data)) api = data;
    } catch {}

    const enrichFromPayload = (briefing) => {
      const p = briefing && briefing.payload && typeof briefing.payload === 'object' ? briefing.payload : {};
      const mergedBriefing = {
        ...briefing,
        tipoSolucao: briefing.tipoSolucao || p.tipoSolucao || p.tipo_solucao || null,
        orcamentoSugerido: briefing.orcamentoSugerido || p.orcamentoSugerido || p.orcamento_sugerido || null
      };
      return mergedBriefing;
    };

    const byId = new Map();
    for (const b of local) {
      if (b && b.id != null) byId.set(String(b.id), enrichFromPayload(b));
    }
    for (const b of api) {
      if (b && b.id != null) {
        const key = String(b.id);
        const prev = byId.get(key) || {};
        byId.set(key, enrichFromPayload({ ...prev, ...b }));
      }
    }
    const merged = Array.from(byId.values()).map(enrichFromPayload);
    ModuleSystem.data.briefings = merged;
    ModuleSystem.saveData();

    const qEl = document.getElementById('briefings-filter-q');
    const statusEl = document.getElementById('briefings-filter-status');
    const clearEl = document.getElementById('briefings-filter-clear');

    const normalizeText = (v) => (v == null ? '' : String(v)).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const applyFilters = (list) => {
      const q = qEl ? normalizeText(qEl.value) : '';
      const st = statusEl ? String(statusEl.value || '').trim() : '';
      return (list || []).filter(b => {
        if (st) {
          const bs = b && b.status != null ? String(b.status).trim() : '';
          if (bs !== st) return false;
        }
        if (q) {
          const hay = normalizeText([computeCode(b), b?.empresa, getEventoNome(b), b?.tipoSolucao, b?.status].filter(Boolean).join(' '));
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    };

    window.ComercialModule._briefingsCache = merged.map(b => ({ ...b, _codigo: computeCode(b) }));

    const renderRows = (list) => {
      tbody.innerHTML = (list || []).map(briefing => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${computeCode(briefing)}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${getEventoNome(briefing)}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${briefing.empresa || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${briefing.tipoSolucao || '—'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          ${briefing.orcamentoEstimado ? formatCurrencyBR(briefing.orcamentoEstimado) : (briefing.orcamentoSugerido ? formatCurrencyBR(briefing.orcamentoSugerido) : (briefing.orcamento ? formatCurrencyBR(briefing.orcamento) : 'N/A'))}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${UIHelpers.computeStatusClass(briefing.status)}">
            ${briefing.status || '—'}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
          <button data-action="read" data-module="briefings" data-id="${briefing.id}" class="text-blue-600 hover:text-blue-900" title="Visualizar"><i class="fas fa-eye"></i></button>
          <button data-action="update" data-module="briefings" data-id="${briefing.id}" class="text-green-600 hover:text-green-900" title="Editar"><i class="fas fa-edit"></i></button>
          <button type="button" onclick="(async()=>{try{const r=await fetch('/api/crm/briefings/${briefing.id}/generate-html',{method:'POST',credentials:'include'});const t=await r.text(); if(!r.ok) throw new Error('Falha ao gerar HTML'); const w=window.open('about:blank'); if(w){w.document.open(); w.document.write(t); w.document.close();} else {alert('Pop-up bloqueado');} if(window.ComercialModule && typeof ComercialModule.loadBriefings==='function'){await ComercialModule.loadBriefings();}}catch(e){alert(e&&e.message?e.message:'Falha ao gerar documento');}})()" class="text-purple-600 hover:text-purple-900" title="Gerar Documento"><i class="fas fa-file-export"></i></button>
          <button type="button" onclick="(async()=>{try{window.open('/api/crm/briefings/${briefing.id}/download-html','_blank');}catch{}})()" class="text-indigo-600 hover:text-indigo-900" title="Baixar HTML"><i class="fas fa-download"></i></button>
          <button type="button" onclick="(async()=>{try{if(!confirm('Duplicar este briefing como nova versão?')) return; const r=await fetch('/api/crm/briefings/${briefing.id}/duplicar',{method:'POST',credentials:'include'}); const j=await r.json().catch(()=>null); if(!r.ok){alert((j&&j.error)?j.error:'Falha ao duplicar briefing'); return;} if(window.ComercialModule && typeof ComercialModule.loadBriefings==='function'){await ComercialModule.loadBriefings();} else {location.reload();}}catch{alert('Falha ao duplicar briefing');}})()" class="text-gray-700 hover:text-gray-900" title="Duplicar Versão"><i class="fas fa-copy"></i></button>
          <button data-action="delete" data-module="briefings" data-id="${briefing.id}" class="text-red-600 hover:text-red-900" title="Excluir"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `).join('');
    };

    const rerender = () => {
      const list = Array.isArray(window.ComercialModule._briefingsCache) ? window.ComercialModule._briefingsCache : [];
      renderRows(applyFilters(list));
    };

    rerender();

    if (!container.getAttribute('data-filters-bound')) {
      container.setAttribute('data-filters-bound', '1');
      const onChange = () => rerender();
      if (qEl) qEl.addEventListener('input', onChange);
      if (statusEl) statusEl.addEventListener('change', onChange);
      if (clearEl) {
        clearEl.addEventListener('click', () => {
          if (qEl) qEl.value = '';
          if (statusEl) statusEl.value = '';
          rerender();
        });
      }
    }
  } finally {
    const container = document.getElementById('briefings-list-container');
    if (container) container.removeAttribute('aria-busy');
  }
};

if (!window.FinanceiroModule) {
  window.FinanceiroModule = {};
}

window.FinanceiroModule.loadContasReceber = async function() {
  const formatMoney = (value) => {
    try {
      const n = typeof value === 'string' ? Number(String(value).replace(',', '.')) : Number(value);
      const safe = Number.isFinite(n) ? n : 0;
      return safe.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch {
      return '0,00';
    }
  };

  const formatDate = (ymd) => {
    if (!ymd) return '-';
    try {
      // Bug 3 Fix: sem conversão de fuso horário
      const _s = String(ymd).slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(_s)) {
        const [_y, _m, _d] = _s.split('-');
        return `${_d}/${_m}/${_y}`;
      }
      return _s;
    } catch {
      return String(ymd);
    }
  };

  const badgeClass = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('pago') || s.includes('baix')) return 'bg-green-100 text-green-800';
    if (s.includes('pend')) return 'bg-yellow-100 text-yellow-800';
    if (s.includes('venc')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const applyCentroFilter = (list) => {
    try {
      const raw = window.ModuleSystem && ModuleSystem.financeiro ? (ModuleSystem.financeiro._receitasCentroCustoFilter || '') : '';
      const has = raw != null && String(raw).trim() !== '';
      if (!has) return list;
      const key = (window.ModuleSystem && ModuleSystem.financeiro && typeof ModuleSystem.financeiro.normalizeCentroCusto === 'function')
        ? ModuleSystem.financeiro.normalizeCentroCusto(raw)
        : String(raw).trim();
      return (list || []).filter(cr => {
        const v = cr && (cr.centroCusto ?? cr.centro_custo) != null ? String(cr.centroCusto ?? cr.centro_custo) : '';
        const k2 = (window.ModuleSystem && ModuleSystem.financeiro && typeof ModuleSystem.financeiro.normalizeCentroCusto === 'function')
          ? ModuleSystem.financeiro.normalizeCentroCusto(v)
          : String(v).trim();
        return k2 === key;
      });
    } catch {
      return list;
    }
  };

  const renderRows = (rows, tbody) => {
    const filtered = applyCentroFilter(Array.isArray(rows) ? rows : []);
    tbody.innerHTML = filtered.map(cr => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-medium text-gray-900">${cr.clienteNome || '-'}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-gray-900">${cr.descricao || '-'}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${cr.centroCusto || '-'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${cr.tipoReceita || '-'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R$ ${formatMoney(cr.valor)}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatDate(cr.vencimento)}</td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeClass(cr.status)}">
            ${cr.status || 'Pendente'}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
          <button data-action="read" data-module="contasReceber" data-id="${cr.id}" class="text-blue-600 hover:text-blue-900" title="Visualizar" aria-label="Visualizar conta a receber ${cr.descricao || ''}">
            <i class="fas fa-eye"></i>
          </button>
          <button data-action="update" data-module="contasReceber" data-id="${cr.id}" class="text-green-600 hover:text-green-900" title="Editar" aria-label="Editar conta a receber ${cr.descricao || ''}">
            <i class="fas fa-edit"></i>
          </button>
          <button data-action="delete" data-module="contasReceber" data-id="${cr.id}" class="text-red-600 hover:text-red-900" title="Excluir" aria-label="Excluir conta a receber ${cr.descricao || ''}">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('') || `<tr><td colspan="8" class="px-6 py-4 text-sm text-gray-500">Nenhuma conta a receber encontrada.</td></tr>`;
  };

  window.FinanceiroModule.rerenderContasReceberList = function() {
    try {
      const tbody = document.getElementById('contas-receber-list-body');
      if (!tbody) return;
      const list = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.contasReceber)) ? ModuleSystem.data.contasReceber : [];
      renderRows(list, tbody);
    } catch {}
  };

  try {
    const container = document.getElementById('contas-receber-list-container');
    const tbody = document.getElementById('contas-receber-list-body');
    if (!container || !tbody) return;

    container.setAttribute('aria-busy', 'true');
    tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-4 text-sm text-gray-500">Carregando contas a receber...</td></tr>`;

    const local = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.contasReceber)) ? [...ModuleSystem.data.contasReceber] : [];
    let api = [];
    try {
      if (window._crmSessionExpired) { return; }
      const response = await fetch('/api/crm/contas-receber', { credentials: 'include' });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        api = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
      }
    } catch {}

    const resolveCliente = (clienteId) => {
      const id = clienteId != null && String(clienteId).trim() !== '' ? String(clienteId) : null;
      if (!id) return { nome: null, email: null };
      const all = [
        ...((window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.clientes)) ? ModuleSystem.data.clientes : []),
        ...((window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.leads)) ? ModuleSystem.data.leads : [])
      ];
      const found = all.find(c => c && c.id != null && String(c.id) === id);
      if (!found) return { nome: null, email: null };
      return {
        nome: found.nome || found.razao_social || found.empresa || null,
        email: found.email || null
      };
    };

    const normalize = (r) => {
      const clienteId = r.clienteId ?? r.cliente_id ?? null;
      const resolved = resolveCliente(clienteId);
      return ({
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
        updated_at: r.updated_at ?? r.updatedAt ?? null
      });
    };

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
        const prevCentro = prev?.centroCusto ?? prev?.centro_custo ?? null;
        const nextCentro = mergedRaw?.centroCusto ?? mergedRaw?.centro_custo ?? null;
        if ((nextCentro === null || nextCentro === undefined || String(nextCentro).trim() === '') && prevCentro != null && String(prevCentro).trim() !== '') {
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

    if (window.ModuleSystem && ModuleSystem.data) {
      ModuleSystem.data.contasReceber = merged;
      ModuleSystem.saveData();
    }

    renderRows(merged, tbody);
  } finally {
    const container = document.getElementById('contas-receber-list-container');
    if (container) container.removeAttribute('aria-busy');
  }
};
