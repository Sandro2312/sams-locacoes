// Sistema de Navegação SAMS Locações CRM/ERP
const NavigationSystem = {
    // Estado atual
    currentModule: 'dashboard',
    currentPage: null,
    breadcrumbHistory: [],
    eventsInitialized: false,
    lastBindAttempt: 0,

    // Configuração dos módulos
    moduleConfig: {
        dashboard: {
            name: 'Dashboard',
            icon: 'fas fa-home',
            pages: {
                main: { name: 'Visão Geral', icon: 'fas fa-chart-pie' }
            }
        },
        marketing: {
            name: 'Marketing',
            icon: 'fas fa-bullhorn',
            pages: {
                leads: { name: 'Leads', icon: 'fas fa-users' },
                campanhas: { name: 'Campanhas', icon: 'fas fa-megaphone' },
                contatos: { name: 'Contatos', icon: 'fas fa-address-book' },
                relatorios: { name: 'Relatórios', icon: 'fas fa-chart-bar' }
            }
        },
        comercial: {
            name: 'Comercial',
            icon: 'fas fa-handshake',
            pages: {
                dashboard: { name: 'Dashboard', icon: 'fas fa-chart-pie' },
                clientes: { name: 'Clientes', icon: 'fas fa-building' },
                eventos: { name: 'Eventos', icon: 'fas fa-calendar' },
                briefings: { name: 'Briefings', icon: 'fas fa-clipboard-list' },
                pipeline: { name: 'Pipeline Comercial', icon: 'fas fa-layer-group' },
                contratos: { name: 'Contratos', icon: 'fas fa-handshake' },
                adicionais: { name: 'Adicionais', icon: 'fas fa-plus-circle' }
            }
        },
        projetos: {
            name: 'Projetos',
            icon: 'fas fa-drafting-compass',
            pages: {
                projetos: { name: 'Projetos', icon: 'fas fa-project-diagram' },
                memoriais: { name: 'Memoriais', icon: 'fas fa-file-alt' },
                aprovacoes: { name: 'Aprovações', icon: 'fas fa-check-circle' }
            }
        },
        montagem: {
            name: 'Montagem',
            icon: 'fas fa-tools',
            pages: {
                checklists: { name: 'Checklists', icon: 'fas fa-tasks' },
                ordens_servico: { name: 'Ordens de Serviço', icon: 'fas fa-clipboard-check' },
                conformidade: { name: 'Conformidade', icon: 'fas fa-certificate' },
                custos: { name: 'Custos', icon: 'fas fa-calculator' }
            }
        },
        financeiro: {
            name: 'Financeiro',
            icon: 'fas fa-chart-line',
            pages: {
                custos: { name: 'Despesas', icon: 'fas fa-money-bill-wave' },
                receitas: { name: 'Receitas', icon: 'fas fa-coins' },
                comissoes: { name: 'Comissões', icon: 'fas fa-percentage' },
                boletos: { name: 'Boletos', icon: 'fas fa-receipt' },
                relatorios: { name: 'Relatórios', icon: 'fas fa-chart-bar' }
            }
        },
        administrativo: {
            name: 'Administrativo',
            icon: 'fas fa-clipboard-list',
            pages: {
                tarefas: { name: 'Tarefas', icon: 'fas fa-list-check' },
                boletos: { name: 'Emissão Boletos', icon: 'fas fa-file-invoice' },
                taxas: { name: 'Taxas', icon: 'fas fa-tags' }
            }
        },
        juridico: {
            name: 'Jurídico',
            icon: 'fas fa-gavel',
            pages: {
                demandas: { name: 'Demandas', icon: 'fas fa-balance-scale' },
                documentos: { name: 'Documentos', icon: 'fas fa-folder-open' },
                prazos: { name: 'Prazos', icon: 'fas fa-clock' }
            }
        },
        kanban: {
            name: 'Kanban',
            icon: 'fas fa-tasks',
            pages: {
                board: { name: 'Quadro', icon: 'fas fa-columns' },
                tarefas: { name: 'Minhas Tarefas', icon: 'fas fa-user-check' }
            }
        },
        administracao: {
            name: 'Administração',
            icon: 'fas fa-cog',
            pages: {
                usuarios: { name: 'Usuários', icon: 'fas fa-users-cog' },
                permissoes: { name: 'Permissões', icon: 'fas fa-key' },
                configuracoes: { name: 'Configurações', icon: 'fas fa-sliders-h' },
                comissoes: { name: 'Comissões', icon: 'fas fa-percentage' },
                logs: { name: 'Logs', icon: 'fas fa-history' },
                ia: { name: 'Métricas IA', icon: 'fas fa-robot' }
            }
        },
        acervo: {
            name: 'Acervo',
            icon: 'fas fa-archive',
            pages: {
                documentos: { name: 'Documentos', icon: 'fas fa-folder-open' }
            }
        }
    },

    // Inicialização
    init() {
        this.bindEvents();
        this.updateBreadcrumb();
        this.bindNavigationLinks();
        this.bindIframeBridge();

        const isAuthenticated = (() => {
            try {
                const u =
                    (window.AuthSystem && typeof window.AuthSystem.getCurrentUser === 'function')
                        ? (window.AuthSystem.getCurrentUser() || null)
                        : ((window.AuthSystem && window.AuthSystem.currentUser) ? window.AuthSystem.currentUser : null);
                return !!(u && (u.id != null || u.email || u.name));
            } catch {
                return false;
            }
        })();

        if (!isAuthenticated) return;
        try {
            const url = new URL(window.location.href);
            const mod = (url.searchParams.get('module') || '').trim().toLowerCase();
            const page = (url.searchParams.get('page') || '').trim().toLowerCase();
            if (mod) {
                this.navigateToModule(mod);
                if (page) this.navigateToPage(mod, page);
            } else if (location.hash && location.hash.length > 1) {
                const h = new URLSearchParams(location.hash.slice(1));
                const hm = (h.get('module') || '').trim().toLowerCase();
                const hp = (h.get('page') || '').trim().toLowerCase();
                if (hm) {
                    this.navigateToModule(hm);
                    if (hp) this.navigateToPage(hm, hp);
                }
            }
        } catch {}
        try {
            if (window.ModuleSystem && ModuleSystem.dashboard && typeof ModuleSystem.dashboard.renderAgendaKanban === 'function') {
                ModuleSystem.dashboard.renderAgendaKanban();
            }
        } catch (e) {
            console.warn('Falha ao renderizar agenda no dashboard:', e);
        }
        try {
            const raw = sessionStorage.getItem('samsNavTarget');
            if (raw) {
                sessionStorage.removeItem('samsNavTarget');
                const t = JSON.parse(raw);
                const module = t && t.module ? String(t.module) : '';
                const page = t && t.page ? String(t.page) : '';
                if (module === 'dashboard') {
                    this.navigateToModule('dashboard');
                } else if (module) {
                    this.navigateToModule(module);
                    if (page) this.navigateToPage(module, page);
                }
            }
        } catch {}
    },

    bindIframeBridge() {
        if (this.__iframeBridgeBound) return;
        this.__iframeBridgeBound = true;
        window.addEventListener('message', (event) => {
            try {
                if (!event || event.origin !== window.location.origin) return;
                const data = event.data || {};
                const type = data && data.type ? String(data.type) : '';
                if (!type) return;

                const waitFor = (checkFn, maxTries = 12, delayMs = 120) => new Promise((resolve) => {
                    let tries = 0;
                    const tick = () => {
                        tries += 1;
                        let ok = false;
                        try { ok = !!checkFn(); } catch {}
                        if (ok) return resolve(true);
                        if (tries >= maxTries) return resolve(false);
                        setTimeout(tick, delayMs);
                    };
                    tick();
                });

                const openOrFallback = (openFn, fallbackUrl) => {
                    try {
                        const ok = !!openFn();
                        if (ok) return;
                    } catch {}
                    try { window.open(fallbackUrl, '_blank'); } catch {}
                };

                const upsertModuleRecord = (moduleKey, record) => {
                    try {
                        if (!window.ModuleSystem || !ModuleSystem.data) return false;
                        const id = record && record.id != null ? String(record.id) : '';
                        if (!id) return false;
                        if (!Array.isArray(ModuleSystem.data[moduleKey])) ModuleSystem.data[moduleKey] = [];
                        const list = ModuleSystem.data[moduleKey];
                        const idx = list.findIndex(x => x && x.id != null && String(x.id) === id);
                        if (idx >= 0) list[idx] = { ...list[idx], ...record };
                        else list.push(record);
                        try { ModuleSystem.saveData && ModuleSystem.saveData(); } catch {}
                        return true;
                    } catch {
                        return false;
                    }
                };

                const fetchJson = async (url) => {
                    const r = await fetch(url, { credentials: 'include' });
                    const j = await r.json().catch(() => null);
                    if (!r.ok) throw new Error((j && j.error) ? j.error : 'Falha ao carregar');
                    return j;
                };

                if (type === 'SAMS_OPEN_CREATE_CLIENTE') {
                    window.__samsClienteCreateDefaults = data.defaults || null;
                    setTimeout(() => {
                        if (window.FormSystem && typeof window.FormSystem.showCreateForm === 'function') {
                            window.FormSystem.showCreateForm('clientes');
                            return;
                        }
                        if (typeof window.showCreateForm === 'function') {
                            window.showCreateForm('clientes');
                            return;
                        }
                        try { window.open('/?module=comercial&page=clientes', '_blank'); } catch {}
                    }, 20);
                    return;
                }

                if (type === 'SAMS_OPEN_CREATE_BRIEFING') {
                    window.__samsBriefingCreateDefaults = data.defaults || null;
                    setTimeout(() => {
                        if (window.FormSystem && typeof window.FormSystem.showCreateForm === 'function') {
                            window.FormSystem.showCreateForm('briefings');
                            return;
                        }
                        try { window.open('/?module=comercial&page=briefings', '_blank'); } catch {}
                    }, 20);
                    return;
                }

                if (type === 'SAMS_OPEN_EDIT_LEAD') {
                    const leadId = data.leadId != null ? String(data.leadId).trim() : '';
                    if (!leadId) return;
                    const fallback = `/?module=marketing&page=leads`;
                    setTimeout(() => {
                        waitFor(() => !!(window.FormSystem && typeof window.FormSystem.showUpdateForm === 'function'))
                            .then(() => fetchJson(`/api/leads/${encodeURIComponent(leadId)}`))
                            .then((lead) => {
                                upsertModuleRecord('leads', lead);
                                openOrFallback(() => {
                                    window.FormSystem.showUpdateForm('leads', leadId);
                                    return true;
                                }, fallback);
                            })
                            .catch(() => openOrFallback(() => false, fallback));
                    }, 20);
                    return;
                }

                if (type === 'SAMS_OPEN_EDIT_BRIEFING') {
                    const briefingId = data.briefingId != null ? String(data.briefingId).trim() : '';
                    const leadId = data.leadId != null ? String(data.leadId).trim() : '';
                    if (!briefingId) return;
                    const qs = new URLSearchParams();
                    if (leadId) qs.set('lead_id', leadId);
                    qs.set('briefing_id', briefingId);
                    const fallback = `/?module=comercial&page=briefings`;
                    setTimeout(() => {
                        waitFor(() => !!(window.FormSystem && typeof window.FormSystem.showUpdateForm === 'function'))
                            .then(() => fetchJson(`/api/briefings/${encodeURIComponent(briefingId)}`))
                            .then((briefing) => {
                                upsertModuleRecord('briefings', briefing);
                                openOrFallback(() => {
                                    window.FormSystem.showUpdateForm('briefings', briefingId);
                                    return true;
                                }, fallback);
                            })
                            .catch(() => openOrFallback(() => false, fallback));
                    }, 20);
                    return;
                }

                if (type === 'SAMS_OPEN_EDIT_PROJETO') {
                    const projetoId = data.projetoId != null ? String(data.projetoId).trim() : '';
                    if (!projetoId) return;
                    const fallback = `/?module=projetos&page=projetos`;
                    setTimeout(() => {
                        waitFor(() => !!(window.FormSystem && typeof window.FormSystem.showUpdateForm === 'function'))
                            .then(() => fetchJson(`/api/projetos/${encodeURIComponent(projetoId)}`))
                            .then((projeto) => {
                                upsertModuleRecord('projetos', projeto);
                                openOrFallback(() => {
                                    window.FormSystem.showUpdateForm('projetos', projetoId);
                                    return true;
                                }, fallback);
                            })
                            .catch(() => openOrFallback(() => false, fallback));
                    }, 20);
                    return;
                }
            } catch {}
        });
    },

    // Vincular eventos
    bindEvents() {
        // Verificar se já foi inicializado recentemente (menos de 1 segundo)
        const now = Date.now();
        if (this.eventsInitialized && (now - this.lastBindAttempt) < 1000) {
            console.log('⚠️ NavigationSystem: Tentativa de re-vinculação muito recente, ignorando...');
            return;
        }

        console.log('🔗 NavigationSystem: Vinculando eventos...');
        this.lastBindAttempt = now;
        
        // Aguardar DOM estar completamente carregado
        const bindModuleCards = () => {
            const moduleCards = document.querySelectorAll('.module-card');
            console.log(`📋 NavigationSystem: Encontrados ${moduleCards.length} module-cards`);
            
            let newBindings = 0;
            moduleCards.forEach((card, index) => {
                const module = card.getAttribute('data-module');
                
                // Verificar se já tem event listener
                if (card.hasAttribute('data-navigation-bound')) {
                    return; // Silenciosamente pular cards já vinculados
                }
                
                console.log(`🎯 NavigationSystem: Vinculando evento para card ${index + 1}: ${module}`);
                newBindings++;
                
                // Marcar como vinculado
                card.setAttribute('data-navigation-bound', 'true');
                
                card.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`🖱️ NavigationSystem: Clique detectado no módulo ${module}`);
                    console.log(`🔍 NavigationSystem: Elemento clicado:`, e.target);
                    console.log(`🔍 NavigationSystem: Card atual:`, card);
                    this.navigateToModule(module);
                });
                
                // Adicionar indicador visual de que o evento está ativo
                card.style.cursor = 'pointer';
                card.setAttribute('title', `Clique para acessar o módulo ${module}`);
                console.log(`✅ NavigationSystem: Evento vinculado com sucesso para ${module}`);
            });

            if (newBindings === 0 && moduleCards.length > 0) {
                console.log('ℹ️ NavigationSystem: Todos os cards já estão vinculados');
            } else if (newBindings > 0) {
                console.log(`✅ NavigationSystem: ${newBindings} novos eventos vinculados`);
            }
        };

        // Tentar vincular imediatamente
        bindModuleCards();
        
        // Marcar como inicializado após primeira tentativa
        if (!this.eventsInitialized) {
            this.eventsInitialized = true;
            
            // Também vincular após um pequeno delay apenas na primeira inicialização
            setTimeout(() => {
                console.log('🔄 NavigationSystem: Verificação final após delay inicial...');
                bindModuleCards();
            }, 500);
        }
        
        // Observar mudanças no DOM para re-vincular eventos se necessário (apenas se não inicializado)
        if (!this.eventsInitialized && typeof MutationObserver !== 'undefined') {
            const observer = new MutationObserver((mutations) => {
                let shouldRebind = false;
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === 1 && (node.classList?.contains('module-card') || node.querySelector?.('.module-card'))) {
                                shouldRebind = true;
                            }
                        });
                    }
                });
                if (shouldRebind) {
                    console.log('🔄 NavigationSystem: Re-vinculando eventos após mudança no DOM');
                    setTimeout(() => bindModuleCards(), 50);
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        // Navegação por teclado
        document.addEventListener('keydown', (e) => {
            // Só processar atalhos se não estivermos em um campo de input
            if (e.ctrlKey && e.key === 'h' && !e.target.matches('input, textarea, select')) {
                e.preventDefault();
                this.navigateToModule('dashboard');
            }
        });
        
        console.log('✅ NavigationSystem: Eventos vinculados com sucesso');
    },

    // Navegar para módulo
    navigateToModule(module) {
        console.log(`🧭 NavigationSystem: Navegando para módulo ${module}`);
        
        // Verificar permissão
        if (!AuthSystem.hasModuleAccess(module) && module !== 'dashboard') {
            console.warn(`⚠️ NavigationSystem: Acesso negado ao módulo ${module}`);
            this.showAccessDenied();
            return;
        }

        console.log(`✅ NavigationSystem: Acesso autorizado ao módulo ${module}`);
        this.currentModule = module;
        this.currentPage = null;

        if (module === 'dashboard') {
            console.log('🏠 NavigationSystem: Mostrando dashboard');
            this.showDashboard();
        } else {
            console.log(`📦 NavigationSystem: Carregando conteúdo do módulo ${module}`);
            this.loadModuleContent(module);
        }

        this.updateBreadcrumb();
        this.bindNavigationLinks();
        console.log(`🎯 NavigationSystem: Navegação para ${module} concluída`);

        if (module === 'kanban') {
            setTimeout(() => {
                this.navigateToPage('kanban', 'board');
            }, 0);
        }

        if (module === 'acervo') {
            setTimeout(() => {
                this.navigateToPage('acervo', 'documentos');
            }, 0);
        }
    },

    // Navegar para página específica
    navigateToPage(module, page) {
        // Verificar permissão
        if (!AuthSystem.hasModuleAccess(module)) {
            this.showAccessDenied();
            return;
        }

        if (String(module || '').trim().toLowerCase() === 'financeiro') {
            const allowed = this.getAllowedFinancePages();
            const p = String(page || '').trim().toLowerCase();
            if (allowed && !allowed.has(p)) {
                this.showAccessDenied();
                return;
            }
        }

        this.currentModule = module;
        this.currentPage = page;
        this.loadPageContent(module, page);
        this.updateBreadcrumb();
        this.bindNavigationLinks();
    },

    // Mostrar dashboard
    showDashboard() {
        const dashboardContent = document.getElementById('dashboardContent');
        const moduleContent = document.getElementById('moduleContent');
        dashboardContent?.classList.remove('hidden');
        moduleContent?.classList.add('hidden');
        try {
            if (window.ModuleSystem && ModuleSystem.dashboard && typeof ModuleSystem.dashboard.renderAgendaKanban === 'function') {
                ModuleSystem.dashboard.renderAgendaKanban();
            }
        } catch (e) {
            console.warn('Falha ao renderizar agenda no dashboard:', e);
        }
    },

    // Função para mostrar um módulo específico (compatibilidade com testes)
    showModule(module) {
        console.log('NavigationSystem.showModule chamado para:', module);
        this.navigateToModule(module);
    },

    // Carregar conteúdo do módulo
    loadModuleContent(module) {
        console.log(`📂 NavigationSystem: Carregando conteúdo do módulo ${module}`);
        
        const dashboardContent = document.getElementById('dashboardContent');
        const moduleContent = document.getElementById('moduleContent');
        dashboardContent?.classList.add('hidden');
        moduleContent?.classList.remove('hidden');

        const moduleInfo = this.moduleConfig[module];
        if (!moduleInfo) {
            console.error(`❌ NavigationSystem: Configuração não encontrada para o módulo ${module}`);
            this.showModuleNotFound(module);
            return;
        }

        console.log(`📋 NavigationSystem: Configuração encontrada para ${module}:`, moduleInfo);
        const content = this.generateModuleHTML(module, moduleInfo);
        if (moduleContent) {
            moduleContent.innerHTML = content;
        }

        // Vincular eventos específicos do módulo
        console.log(`🔗 NavigationSystem: Vinculando eventos específicos do módulo ${module}`);
        this.bindModuleEvents(module);
        this.bindNavigationLinks();

        if (module === 'financeiro') {
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
                if (isManagerOrAdmin && window.ModuleSystem && ModuleSystem.financeiro && typeof ModuleSystem.financeiro.initDashboardHome === 'function') {
                    ModuleSystem.financeiro.initDashboardHome();
                }
            } catch {}

            // Sincronizar transações da API ao abrir o módulo financeiro (garante dados atualizados no mobile)
            setTimeout(async () => {
                try {
                    if (window.ModuleSystem && typeof window.ModuleSystem.loadTransacoes === 'function') {
                        await window.ModuleSystem.loadTransacoes();
                        console.log('✅ [NavigationSystem] Transações sincronizadas ao abrir módulo financeiro');
                    }
                } catch (e) {
                    console.warn('[NavigationSystem] Falha ao sincronizar transações:', e);
                }
            }, 200);
        }
        if (module === 'comercial') {
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
                if (isManagerOrAdmin && window.ModuleSystem && ModuleSystem.comercial && typeof ModuleSystem.comercial.initDashboardHome === 'function') {
                    ModuleSystem.comercial.initDashboardHome();
                }
            } catch {}
        }
        
        console.log(`✅ NavigationSystem: Conteúdo do módulo ${module} carregado com sucesso`);
    },

    // Carregar conteúdo da página
    async loadPageContent(module, page) {
        const dashboardContent = document.getElementById('dashboardContent');
        const moduleContent = document.getElementById('moduleContent');
        dashboardContent?.classList.add('hidden');
        moduleContent?.classList.remove('hidden');

        const moduleInfo = this.moduleConfig[module];
        const pageInfo = moduleInfo?.pages?.[page];

        if (!pageInfo) {
            this.showPageNotFound(module, page);
            return;
        }

        const content = await this.generatePageHTML(module, page, pageInfo);
        if (moduleContent) {
            moduleContent.innerHTML = content;
        }

    // Vincular eventos específicos da página
    this.bindPageEvents(module, page);
    this.bindNavigationLinks();

    // Auto-load de dados da página, com guardas anti-duplicidade
    if (!this._lastAutoLoad) this._lastAutoLoad = { signature: '', time: 0 };
    const signature = `${module}:${page}`;
    const now = Date.now();
    if (this._lastAutoLoad.signature !== signature || (now - this._lastAutoLoad.time) > 1000) {
        this._lastAutoLoad = { signature, time: now };
        if (module === 'marketing' && page === 'leads') {
            this.reloadLeadsList();
        } else if (module === 'marketing' && page === 'contatos') {
            this.reloadContatosList();
        } else if (module === 'marketing' && page === 'campanhas') {
            this.reloadCampanhasList();
            } else if (module === 'comercial' && page === 'clientes') {
                this.reloadClientesList();
        } else if (module === 'comercial' && page === 'eventos') {
            this.reloadEventosList();
        } else if (module === 'comercial' && page === 'briefings') {
            this.reloadBriefingsList();
        } else if (module === 'financeiro' && page === 'receitas') {
            try {
                if (window.FinanceiroModule && typeof window.FinanceiroModule.loadContasReceber === 'function') {
                    window.FinanceiroModule.loadContasReceber();
                }
            } catch (e) {
                console.warn('Falha ao auto-carregar contas a receber:', e);
            }
        }
    } else {
        console.log(`⏳ [NavigationSystem] Ignorando auto-load duplicado para ${signature}`);
    }
    },

    // Gerar HTML do módulo
    generateModuleHTML(module, moduleInfo) {
        const financeAllowed = module === 'financeiro' ? this.getAllowedFinancePages() : null;
        const pages = Object.entries(moduleInfo.pages).filter(([key]) => {
            if (module === 'financeiro' && key === 'relatorios') return false;
            if (module === 'financeiro' && financeAllowed && !financeAllowed.has(String(key).trim().toLowerCase())) return false;
            return true;
        });
        const extraDashboard = (() => {
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
                if (isManagerOrAdmin && module === 'financeiro' && window.ModuleSystem && ModuleSystem.financeiro && typeof ModuleSystem.financeiro.renderDashboardHome === 'function') {
                    return ModuleSystem.financeiro.renderDashboardHome() || '';
                }
                if (isManagerOrAdmin && module === 'comercial' && window.ModuleSystem && ModuleSystem.comercial && typeof ModuleSystem.comercial.renderDashboardHome === 'function') {
                    return ModuleSystem.comercial.renderDashboardHome() || '';
                }
            } catch {}
            return '';
        })();
        
        return `
            <div class="module-container">
                <div class="mb-8">
                    <div class="flex items-center mb-4">
                        <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                            <i class="${moduleInfo.icon} text-blue-600 text-xl"></i>
                        </div>
                        <div>
                            <h2 class="text-3xl font-bold text-gray-800">${moduleInfo.name}</h2>
                            <p class="text-gray-600">Visão geral e atalhos</p>
                        </div>
                    </div>
                </div>

                ${extraDashboard}

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${pages.map(([pageKey, pageInfo]) => `
                        <div class="page-card bg-white rounded-lg shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-300" 
                             data-nav-module="${module}" data-nav-page="${pageKey}" data-module="${module}" data-page="${pageKey}">
                            <div class="flex items-center mb-4">
                                <div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                                    <i class="${pageInfo.icon} text-gray-600"></i>
                                </div>
                                <h3 class="text-lg font-semibold text-gray-800">${pageInfo.name}</h3>
                            </div>
                            <p class="text-gray-600 text-sm">Gerenciar ${pageInfo.name.toLowerCase()}</p>
                        </div>
                    `).join('')}
                </div>

                <div class="mt-8">
                    <button type="button" data-nav-module="dashboard"
                            class="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition duration-300">
                        <i class="fas fa-arrow-left mr-2"></i>
                        Voltar ao Dashboard
                    </button>
                </div>
            </div>
        `;
    },

    // Gerar HTML da página
    async generatePageHTML(module, page, pageInfo) {
        // Verificar se existe conteúdo específico no ModuleSystem
        let pageContent = '';
        
        // Mapear páginas para funções do ModuleSystem
        if (module === 'projetos' && page === 'projetos') {
            pageContent = ModuleSystem?.projetos?.listProjetos?.() || '';
        } else if (module === 'projetos' && page === 'memoriais') {
            pageContent = ModuleSystem?.listMemoriais?.() || '';
        } else if (module === 'projetos' && page === 'aprovacoes') {
            pageContent = ModuleSystem?.projetos?.listAprovacoes?.() || '';
        } else
        if (module === 'marketing' && page === 'leads') {
            pageContent = ModuleSystem?.marketing?.listLeads?.() || '';
        } else if (module === 'marketing' && page === 'campanhas') {
            pageContent = ModuleSystem?.marketing?.listCampanhas?.() || '';
        } else if (module === 'marketing' && page === 'contatos') {
            pageContent = ModuleSystem?.marketing?.listContatos?.() || '';
        } else if (module === 'comercial' && page === 'clientes') {
            pageContent = ModuleSystem?.comercial?.listClientes?.() || '';
        } else if (module === 'comercial' && page === 'eventos') {
            pageContent = ModuleSystem?.comercial?.listEventos?.() || '';
        } else if (module === 'comercial' && page === 'briefings') {
            pageContent = ModuleSystem?.comercial?.listBriefings?.() || '';
        } else if (module === 'comercial' && page === 'dashboard') {
            pageContent = ModuleSystem?.comercial?.listDashboard?.() || '';
        } else if (module === 'comercial' && page === 'pipeline') {
            pageContent = ModuleSystem?.comercial?.listPipeline?.() || '';
        } else if (module === 'comercial' && page === 'contratos') {
            pageContent = ModuleSystem?.comercial?.listContratos?.() || '';
        } else if (module === 'projetos' && page === 'projetos') {
            pageContent = ModuleSystem?.projetos?.listProjetos?.() || '';
        } else if (module === 'montagem' && page === 'checklists') {
            pageContent = ModuleSystem?.montagem?.listMontagens?.() || '';
        } else if (module === 'montagem' && page === 'ordens_servico') {
            pageContent = ModuleSystem?.montagem?.listOrdensServico?.() || '';
        } else if (module === 'financeiro' && page === 'custos') {
            pageContent = ModuleSystem?.financeiro?.listTransacoes?.() || '';
        } else if (module === 'financeiro' && page === 'receitas') {
            pageContent = ModuleSystem?.financeiro?.listReceitas?.() || '';
        } else if (module === 'financeiro' && page === 'comissoes') {
            pageContent = ModuleSystem?.financeiro?.listComissoes?.() || '';
        } else if (module === 'financeiro' && page === 'relatorios') {
            pageContent = ModuleSystem?.financeiro?.listRelatorios?.() || '';
        } else if (module === 'administrativo' && page === 'tarefas') {
            pageContent = ModuleSystem?.administrativo?.listTarefas?.() || '';
        } else if (module === 'juridico' && page === 'demandas') {
            pageContent = ModuleSystem?.juridico?.listDemandas?.() || '';
        } else if (module === 'administracao' && page === 'usuarios') {
            pageContent = ModuleSystem?.administracao?.listUsuarios?.() || '';
        } else if (module === 'administracao' && page === 'permissoes') {
            pageContent = (await ModuleSystem?.administracao?.listPermissoes?.()) || '';
        } else if (module === 'administracao' && page === 'configuracoes') {
            pageContent = ModuleSystem?.administracao?.listConfiguracoes?.() || '';
        } else if (module === 'administracao' && page === 'comissoes') {
            pageContent = ModuleSystem?.administracao?.listComissoes?.() || '';
        } else if (module === 'administracao' && page === 'logs') {
            pageContent = ModuleSystem?.administracao?.listLogs?.() || '';
        } else if (module === 'administracao' && page === 'ia') {
            pageContent = `
                <div class="bg-white rounded-lg shadow">
                    <div class="p-6 border-b border-gray-200">
                        <div class="flex items-center justify-between gap-3">
                            <div>
                                <h3 class="text-xl font-semibold text-gray-800">Métricas IA</h3>
                                <p class="text-sm text-gray-600">Adoção, estabilidade e A/B (sem dados pessoais).</p>
                            </div>
                            <div class="flex items-center gap-2">
                                <select id="ai-metrics-days" class="border rounded-lg px-3 py-2 text-sm">
                                    <option value="7">Últimos 7 dias</option>
                                    <option value="14">Últimos 14 dias</option>
                                    <option value="30">Últimos 30 dias</option>
                                </select>
                                <button type="button" id="ai-metrics-refresh"
                                        class="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm">
                                    <i class="fas fa-sync-alt mr-2"></i>Atualizar
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="p-6">
                        <div id="ai-metrics-status" class="text-sm text-gray-600">Carregando...</div>
                        <div id="ai-metrics-cards" class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4"></div>
                        <div class="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div class="border border-gray-200 rounded-lg p-4">
                                <div class="text-sm font-semibold text-gray-800 mb-3">Eventos de UI (Top)</div>
                                <div id="ai-metrics-ui-events" class="text-sm text-gray-600">—</div>
                            </div>
                            <div class="border border-gray-200 rounded-lg p-4">
                                <div class="text-sm font-semibold text-gray-800 mb-3">Chamadas de IA (Top)</div>
                                <div id="ai-metrics-ai-actions" class="text-sm text-gray-600">—</div>
                            </div>
                        </div>
                        <div class="mt-6 border border-gray-200 rounded-lg p-4">
                            <div class="text-sm font-semibold text-gray-800 mb-3">A/B: aiPanels (eventos por variante)</div>
                            <div id="ai-metrics-ab" class="text-sm text-gray-600">—</div>
                        </div>
                    </div>
                </div>
            `;
        } else if (module === 'acervo' && page === 'documentos') {
            pageContent = '<div id="acervo-container" class="acervo-wrapper"></div>';
        } else if (module === 'kanban' && page === 'board') {
            pageContent = ModuleSystem?.kanban?.renderBoard?.() || '';
        }
        
        // Se não há conteúdo específico, mostrar página de desenvolvimento
        if (!pageContent) {
            pageContent = `
                <div class="bg-white rounded-lg shadow">
                    <div class="p-6">
                        <div class="text-center py-12">
                            <i class="${pageInfo.icon} text-gray-400 text-6xl mb-4"></i>
                            <h3 class="text-xl font-semibold text-gray-600 mb-2">Funcionalidade em Desenvolvimento</h3>
                            <p class="text-gray-500">A página ${pageInfo.name} está sendo desenvolvida.</p>
                            <p class="text-gray-500">Em breve estará disponível com todas as funcionalidades CRUD.</p>
                        </div>
                    </div>
                </div>

                <div class="mt-8 flex space-x-4">
                    <button type="button" data-nav-module="${module}"
                            class="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition duration-300">
                        <i class="fas fa-arrow-left mr-2"></i>
                        Voltar ao Módulo
                    </button>
                    <button type="button" data-nav-module="dashboard"
                            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition duration-300">
                        <i class="fas fa-home mr-2"></i>
                        Dashboard
                    </button>
                </div>
            `;
        }

        const moduleInfo = this.moduleConfig[module];
        const financeAllowed = module === 'financeiro' ? this.getAllowedFinancePages() : null;
        const pages = moduleInfo && moduleInfo.pages
            ? Object.entries(moduleInfo.pages).filter(([key]) => {
                if (module === 'financeiro' && key === 'relatorios') return false;
                if (module === 'financeiro' && financeAllowed && !financeAllowed.has(String(key).trim().toLowerCase())) return false;
                return true;
            })
            : [];

        const renderPageNav = () => {
            if (!pages.length) return '';
            return `
                <div class="mt-4 flex flex-wrap gap-2" data-nav-scope="page-tabs">
                    ${pages.map(([key, info]) => {
                        const isActive = key === page;
                        const cls = isActive
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50';
                        return `
                            <button type="button"
                                    class="px-3 py-1.5 rounded-full border text-sm transition ${cls}"
                                    data-nav-module="${module}"
                                    data-nav-page="${key}">
                                <i class="${info.icon} mr-2"></i>${info.name}
                            </button>
                        `;
                    }).join('')}
                </div>
            `;
        };

        return `
            <div class="page-container">
                <div class="mb-6">
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div class="flex items-center">
                            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                                <i class="${pageInfo.icon} text-blue-600 text-xl"></i>
                            </div>
                            <div>
                                <h2 class="text-3xl font-bold text-gray-800">${pageInfo.name}</h2>
                                <p class="text-gray-600">Módulo ${moduleInfo ? moduleInfo.name : module}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button"
                                    class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-300"
                                    data-nav-module="${module}">
                                <i class="fas fa-arrow-left mr-2"></i>Módulo
                            </button>
                            <button type="button"
                                    class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-300"
                                    data-nav-module="dashboard">
                                <i class="fas fa-home mr-2"></i>Dashboard
                            </button>
                        </div>
                    </div>
                    ${renderPageNav()}
                </div>

                ${pageContent}
            </div>
        `;
    },

    // Vincular eventos do módulo
    bindModuleEvents(module) {
        // Clique nos cards das páginas
        document.querySelectorAll('.page-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const moduleAttr = card.getAttribute('data-module');
                const page = card.getAttribute('data-page');
                this.navigateToPage(moduleAttr, page);
            });
        });
    },

    getAllowedFinancePages() {
        try {
            const current =
                (window.AuthSystem && typeof window.AuthSystem.getCurrentUser === 'function')
                    ? (window.AuthSystem.getCurrentUser() || null)
                    : ((window.AuthSystem && window.AuthSystem.currentUser) ? window.AuthSystem.currentUser : null);
            if (!current) return null;

            const role = current.role != null ? String(current.role).trim().toLowerCase() : '';
            if (role === 'administrador' || role === 'admin') return null;

            const perms = Array.isArray(current.permissions) ? current.permissions.map(p => String(p)) : [];
            const hasFinancePerms = perms.some(p => String(p).trim().toLowerCase().startsWith('financeiro.'));
            if (!hasFinancePerms) return null;

            const hasAny = (candidates) => candidates.some(k => perms.includes(k));
            const allowed = new Set();

            if (hasAny(['financeiro.comissoes.view', 'financeiro.comissoes.calculate'])) allowed.add('comissoes');
            if (hasAny(['financeiro.relatorios.view', 'financeiro.relatorios.export'])) allowed.add('relatorios');
            if (hasAny([
                'financeiro.custos.view',
                'financeiro.custos.create', 'financeiro.custos.edit', 'financeiro.custos.delete',
                'financeiro.orcamentos.view', 'financeiro.orcamentos.create', 'financeiro.orcamentos.edit', 'financeiro.orcamentos.delete'
            ])) allowed.add('custos');
            if (hasAny([
                'financeiro.receitas.view',
                'financeiro.receitas.create', 'financeiro.receitas.edit', 'financeiro.receitas.delete',
                'financeiro.contratos.view', 'financeiro.contratos.create', 'financeiro.contratos.edit', 'financeiro.contratos.delete'
            ])) allowed.add('receitas');
            if (hasAny(['financeiro.boletos.view', 'financeiro.boletos.create', 'financeiro.contratos.view'])) allowed.add('boletos');

            return allowed;
        } catch {
            return null;
        }
    },

    // Vincular eventos específicos da página
    bindPageEvents(module, page) {
        // Eventos específicos podem ser adicionados aqui
        console.log(`[NavigationSystem] bindPageEvents chamado para ${module}/${page}`);
        
        // Proteção Global Anti-Clear para Formulários - v4.9.4
        this.setupGlobalMouseProtection();
        
        // Auto carregar leads via API ao entrar na página de Marketing > Leads
        if (module === 'marketing' && page === 'leads') {
            // Zerar contador de retry para garantir que nova navegação sempre tente novamente
            if (window.MarketingModule) {
                window.MarketingModule['_leadsLoadDomRetries'] = 0;
            }
            setTimeout(() => {
                try {
                    if (window.MarketingModule && typeof window.MarketingModule.loadLeads === 'function') {
                        window.MarketingModule.loadLeads();
                    }
                } catch (error) {
                    console.warn('[NavigationSystem] Falha ao auto-carregar leads:', error);
                }
            }, 150);
        }
        
        // Integração específica para o módulo Kanban
        if (module === 'kanban' && page === 'board') {
            // Aguardar um momento para o DOM ser atualizado
            setTimeout(() => {
                this.ensureKanbanSystemReady(() => {
                    try {
                        if (typeof KanbanSystem.init === 'function') KanbanSystem.init();
                    } catch (e) {
                        console.warn('Falha ao inicializar KanbanSystem:', e);
                    }
                    try {
                        KanbanSystem.renderBoard();
                    } catch (e) {
                        console.warn('Falha ao renderizar KanbanSystem:', e);
                    }
                });
            }, 100);
        }
        if (module === 'comercial' && page === 'pipeline') {
            setTimeout(() => {
                try { ModuleSystem?.comercial?.initPipeline?.(document.getElementById('moduleContent')); } catch {}
            }, 50);
        }
        if (module === 'comercial' && page === 'dashboard') {
            setTimeout(() => {
                try { ModuleSystem?.comercial?.initDashboard?.(); } catch {}
            }, 50);
        }
        if (module === 'montagem' && page === 'ordens_servico') {
            setTimeout(() => {
                try { ModuleSystem?.montagem?.initOrdensServico?.(); } catch {}
            }, 50);
        }
        if (module === 'administrativo' && page === 'tarefas') {
            setTimeout(() => {
                try { ModuleSystem?.administrativo?.initTarefas?.(); } catch {}
            }, 50);
        }
        if (module === 'financeiro' && page === 'comissoes') {
            setTimeout(() => {
                try { ModuleSystem?.financeiro?.initComissoes?.(); } catch {}
            }, 50);
        }
        // Sincronização: ao abrir qualquer página do módulo financeiro, buscar transações da API
        if (module === 'financeiro') {
            setTimeout(async () => {
                try {
                    const resp = await fetch('/api/crm/transacoes', { credentials: 'include' });
                    if (resp.ok) {
                        const rawRows = await resp.json().catch(() => []);
                        if (Array.isArray(rawRows) && window.ModuleSystem && ModuleSystem.data) {
                            // Mapear snake_case da API para camelCase usado pelo frontend
                            const rows = rawRows.map(r => ({
                                ...r,
                                centroCusto: r.centro_custo || r.centroCusto || null,
                                eventoId: r.evento_id || r.eventoId || null,
                                clienteId: r.cliente_id || r.clienteId || null,
                                clienteNome: r.cliente_nome || r.clienteNome || null,
                                eventoNome: r.evento_nome || r.eventoNome || null,
                                recorrenciaGrupoId: r.recorrencia_grupo_id || r.recorrenciaGrupoId || null,
                                recorrenciaIndice: r.recorrencia_indice || r.recorrenciaIndice || null
                            }));
                            ModuleSystem.data.transacoes = rows;
                            if (typeof ModuleSystem.saveData === 'function') ModuleSystem.saveData();
                            console.log(`✅ [NavigationSystem] Transações sincronizadas da API: ${rows.length} registros`);
                            // Re-renderizar a página atual para mostrar dados atualizados
                            if (this.currentModule === 'financeiro' && this.currentPage === page) {
                                this.navigateToPage(this.currentModule, this.currentPage);
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[NavigationSystem] Falha ao sincronizar transações da API:', e);
                }
            }, 100);
        }
        if (module === 'comercial' && page === 'contratos') {
            setTimeout(() => {
                try { ModuleSystem?.comercial?.initContratos?.(); } catch {}
            }, 50);
        }
        if (module === 'administracao' && page === 'configuracoes') {
            setTimeout(() => {
                try { ModuleSystem?.administracao?.initConfiguracoes?.(); } catch {}
            }, 50);
        }
        if (module === 'administracao' && page === 'usuarios') {
            setTimeout(() => {
                try { ModuleSystem?.administracao?.initUsuarios?.(); } catch {}
            }, 50);
        }
        if (module === 'administracao' && page === 'comissoes') {
            setTimeout(() => {
                try { ModuleSystem?.administracao?.initComissoes?.(); } catch {}
            }, 50);
        }
        if (module === 'administracao' && page === 'logs') {
            setTimeout(() => {
                try { ModuleSystem?.administracao?.initLogs?.(); } catch {}
            }, 50);
        }
        if (module === 'administracao' && page === 'ia') {
            setTimeout(() => {
                const daysEl = document.getElementById('ai-metrics-days');
                const btn = document.getElementById('ai-metrics-refresh');
                const statusEl = document.getElementById('ai-metrics-status');
                const cardsEl = document.getElementById('ai-metrics-cards');
                const uiEl = document.getElementById('ai-metrics-ui-events');
                const aiEl = document.getElementById('ai-metrics-ai-actions');
                const abEl = document.getElementById('ai-metrics-ab');

                const escapeHtml = (value) => String(value ?? '')
                    .replaceAll('&', '&amp;')
                    .replaceAll('<', '&lt;')
                    .replaceAll('>', '&gt;')
                    .replaceAll('"', '&quot;')
                    .replaceAll("'", '&#39;');

                const sortEntries = (obj) => Object.entries(obj || {}).sort((a, b) => (b[1] || 0) - (a[1] || 0));
                const topList = (obj, limit = 10) => {
                    const rows = sortEntries(obj).slice(0, limit);
                    if (!rows.length) return '<div class="text-gray-500">Sem dados.</div>';
                    return `
                        <div class="space-y-2">
                            ${rows.map(([k, v]) => `
                                <div class="flex items-center justify-between gap-3">
                                    <div class="min-w-0 truncate">${escapeHtml(k)}</div>
                                    <div class="shrink-0 font-semibold text-gray-800">${escapeHtml(v)}</div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                };

                const renderAb = (byVariant) => {
                    const variants = Object.keys(byVariant || {});
                    if (!variants.length) return '<div class="text-gray-500">Sem dados.</div>';
                    return `
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            ${variants.map(v => {
                                const events = byVariant[v] || {};
                                const total = Object.values(events).reduce((a, n) => a + (Number(n) || 0), 0);
                                return `
                                    <div class="border border-gray-200 rounded-lg p-3">
                                        <div class="flex items-center justify-between">
                                            <div class="text-sm font-semibold text-gray-800">Variante: ${escapeHtml(v)}</div>
                                            <div class="text-sm text-gray-700">Total: <span class="font-semibold">${escapeHtml(total)}</span></div>
                                        </div>
                                        <div class="mt-3">${topList(events, 6)}</div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `;
                };

                const renderCards = (payload) => {
                    const uiTotal = Object.values(payload?.ui?.daily || {}).reduce((a, n) => a + (Number(n) || 0), 0);
                    const aiTotal = Object.values(payload?.ai?.daily || {}).reduce((a, n) => a + (Number(n) || 0), 0);
                    const aiForms = Number(payload?.ai?.byAction?.ai_form_assist || 0);
                    const aiTranscribe = Number(payload?.ai?.byAction?.ai_transcribe || 0);
                    cardsEl.innerHTML = `
                        <div class="border border-gray-200 rounded-lg p-4">
                            <div class="text-xs text-gray-500">Eventos UI</div>
                            <div class="text-2xl font-bold text-gray-900 mt-1">${escapeHtml(uiTotal)}</div>
                        </div>
                        <div class="border border-gray-200 rounded-lg p-4">
                            <div class="text-xs text-gray-500">Chamadas IA</div>
                            <div class="text-2xl font-bold text-gray-900 mt-1">${escapeHtml(aiTotal)}</div>
                            <div class="text-xs text-gray-500 mt-2">Form Assist: ${escapeHtml(aiForms)} • Voz: ${escapeHtml(aiTranscribe)}</div>
                        </div>
                        <div class="border border-gray-200 rounded-lg p-4">
                            <div class="text-xs text-gray-500">Janela</div>
                            <div class="text-2xl font-bold text-gray-900 mt-1">${escapeHtml(payload?.range?.days || '')} dias</div>
                            <div class="text-xs text-gray-500 mt-2">Limite de amostra: ${escapeHtml(payload?.limits?.maxRows || '')}</div>
                        </div>
                    `;
                };

                const load = async () => {
                    const days = daysEl && daysEl.value ? String(daysEl.value) : '7';
                    if (statusEl) statusEl.textContent = 'Carregando...';
                    try {
                        const resp = await fetch(`/api/crm/metrics/overview?days=${encodeURIComponent(days)}`, { credentials: 'include' });
                        const payload = await resp.json().catch(() => null);
                        if (!resp.ok) throw new Error((payload && payload.error) ? payload.error : `Falha (${resp.status})`);
                        renderCards(payload);
                        if (uiEl) uiEl.innerHTML = topList(payload?.ui?.byEvent || {});
                        if (aiEl) aiEl.innerHTML = topList(payload?.ai?.byAction || {});
                        if (abEl) abEl.innerHTML = renderAb(payload?.ui?.byVariant || {});
                        if (statusEl) statusEl.textContent = 'Atualizado.';
                    } catch (e) {
                        if (statusEl) statusEl.textContent = e && e.message ? e.message : 'Falha ao carregar métricas.';
                        if (cardsEl) cardsEl.innerHTML = '';
                        if (uiEl) uiEl.textContent = '—';
                        if (aiEl) aiEl.textContent = '—';
                        if (abEl) abEl.textContent = '—';
                    }
                };

                if (btn && !btn.getAttribute('data-bound')) {
                    btn.setAttribute('data-bound', '1');
                    btn.addEventListener('click', () => load().catch(() => {}));
                }
                if (daysEl && !daysEl.getAttribute('data-bound')) {
                    daysEl.setAttribute('data-bound', '1');
                    daysEl.addEventListener('change', () => load().catch(() => {}));
                }
                load().catch(() => {});
            }, 80);
        }
        // Módulo Acervo Documental
        if (module === 'acervo' && page === 'documentos') {
            const tryInitAcervo = (attempts) => {
                if (window.AcervoModule && typeof window.AcervoModule.init === 'function') {
                    try {
                        window.AcervoModule.init();
                        console.log('✅ [NavigationSystem] AcervoModule inicializado');
                    } catch (e) {
                        console.warn('Falha ao inicializar AcervoModule:', e);
                    }
                } else if (attempts < 20) {
                    console.warn(`⚠️ [NavigationSystem] AcervoModule não encontrado, tentativa ${attempts}/20...`);
                    setTimeout(() => tryInitAcervo(attempts + 1), 200);
                } else {
                    console.error('❌ [NavigationSystem] AcervoModule não disponível após 20 tentativas');
                }
            };
            setTimeout(() => tryInitAcervo(1), 100);
        }
    },

    ensureKanbanSystemReady(onReady) {
        const ok =
            typeof window.KanbanSystem !== 'undefined' &&
            typeof window.KanbanSystem.renderBoard === 'function' &&
            typeof window.KanbanSystem.showTaskForm === 'function' &&
            typeof window.KanbanSystem.showBoardForm === 'function' &&
            typeof window.KanbanSystem.showBoardSettings === 'function';

        if (ok) {
            onReady?.();
            return;
        }

        try {
            document.querySelectorAll('script[src*="js/kanban.js"]').forEach(s => s.parentNode?.removeChild(s));
        } catch {}

        const script = document.createElement('script');
        script.src = `js/kanban.js?v=5.6.9&ts=${Date.now()}`;
        script.async = false;
        script.onload = () => onReady?.();
        script.onerror = () => {
            try {
                if (window.Utils?.notifications?.error) {
                    window.Utils.notifications.error('Falha ao carregar o Kanban. Atualize a página (Ctrl+F5).');
                } else {
                    alert('Falha ao carregar o Kanban. Atualize a página (Ctrl+F5).');
                }
            } catch {}
        };
        document.head.appendChild(script);
    },

    // NavigationSystem v4.9.4 - Guards Globais Anti-Clear Definitivos
    setupGlobalMouseProtection() {
        console.log('🔧 NavigationSystem v4.9.4: Configurando guards globais definitivos...');
        
        // Remover listeners anteriores se existirem
        if (this.globalClickGuard) {
            document.removeEventListener('click', this.globalClickGuard, true);
        }
        if (this.modalOpenGuard) {
            document.removeEventListener('click', this.modalOpenGuard, true);
        }

        // GUARD 1: Remoção de handlers inline legados ao abrir modal
        this.modalOpenGuard = (e) => {
            const target = e.target;
            
            // Detectar abertura de modal de formulário
            if (target.matches('button[data-action="create"], button[onclick*="Lead"], button[onclick*="Campanha"], button[onclick*="Contato"]') || 
                target.closest('button[data-action="create"]')) {
                
                console.log('🎯 [NavigationSystem] Modal detectado - Aplicando guards globais...');
                
                // Aguardar modal ser criado e aplicar limpeza
                setTimeout(() => {
                    this.removeInlineHandlersFromModal();
                    this.applyGlobalGuards();
                    this.protectModalInputs();
                }, 300);
            }
        };

        // GUARD 2: Proteção global contra clears (backup do FormValidator)
        this.globalClickGuard = (e) => {
            const target = e.target;
            
            // Verificar se é campo com proteção
            if (target.matches('input[data-preserve="true"], input[data-preserve-value="true"], input[data-no-clear="true"], select[data-preserve="true"], select[data-preserve-value="true"], select[data-no-clear="true"], textarea[data-preserve="true"], textarea[data-preserve-value="true"], textarea[data-no-clear="true"]')) {
                const currentValue = target.value || '';
                
                if (currentValue.trim()) {
                    console.log(`🛡️ [NavigationSystem] Guard backup: Campo "${target.name || target.id}" = "${currentValue}"`);
                    
                    // Backup guard - prevenir propagação
                    e.stopPropagation();
                    
                    // Preservar valor explicitamente
                    setTimeout(() => {
                        if (target.value !== currentValue) {
                            console.log(`🔄 [NavigationSystem] Restaurando valor: "${currentValue}"`);
                            target.value = currentValue;
                        }
                    }, 0);
                }
            }
        };

        // Adicionar listeners globais
        document.addEventListener('click', this.modalOpenGuard, true);
        // Ajuste: não capturar cliques dentro do overlay do FormSystem e não usar captura para globalClickGuard
        document.addEventListener('click', (e) => {
            // Se clique ocorreu dentro do overlay/modal, não interceptar
            const target = e.target;
            if (target && target.closest('#modal-overlay')) {
                return;
            }
            this.globalClickGuard(e);
        }, false);
        
        console.log('✅ NavigationSystem: Guards globais v4.9.4 configurados');
    },

    // NOVO: Remover handlers inline legados de modais
    removeInlineHandlersFromModal() {
        console.log('🧹 [NavigationSystem] Removendo handlers inline legados do modal...');
        
        // Buscar modal ativo
        const activeModal = document.querySelector('.modal:not(.hidden), [id*="Modal"]:not(.hidden), [id*="modal"]:not(.hidden)');
        
        if (!activeModal) {
            console.log('⚠️ [NavigationSystem] Nenhum modal ativo encontrado');
            return;
        }
        
        // Remover handlers inline de todos os campos do modal
        const fields = activeModal.querySelectorAll('input, select, textarea');
        let removedCount = 0;
        
        fields.forEach(field => {
            // Remover handlers problemáticos
            if (field.onfocus) {
                console.log(`🗑️ [NavigationSystem] Removendo onfocus: ${field.id || field.name}`);
                field.onfocus = null;
                removedCount++;
            }
            
            if (field.onclick) {
                console.log(`🗑️ [NavigationSystem] Removendo onclick: ${field.id || field.name}`);
                field.onclick = null;
                removedCount++;
            }
            
            // Remover atributos inline via DOM
            field.removeAttribute('onfocus');
            field.removeAttribute('onclick');
            
            // Adicionar proteção se não tiver
            if (!field.hasAttribute('data-preserve')) {
                field.setAttribute('data-preserve', 'true');
                console.log(`🛡️ [NavigationSystem] Proteção adicionada: ${field.id || field.name}`);
            }
            if (!field.hasAttribute('data-preserve-value')) {
                field.setAttribute('data-preserve-value', 'true');
            }
            if (!field.hasAttribute('data-no-clear')) {
                field.setAttribute('data-no-clear', 'true');
            }
        });
        
        console.log(`✅ NavigationSystem: ${removedCount} handlers inline removidos do modal`);
    },

    // NOVO: Aplicar guards globais específicos
    applyGlobalGuards() {
        console.log('🛡️ [NavigationSystem] Aplicando guards globais específicos...');
        
        // Guard global para campos com data-preserve e afins
        if (!this.preserveGuardApplied) {
            document.addEventListener('click', (e) => {
                if (
                    e.target.matches('input[data-preserve], select[data-preserve], textarea[data-preserve], input[data-preserve-value="true"], select[data-preserve-value="true"], textarea[data-preserve-value="true"], input[data-no-clear="true"], select[data-no-clear="true"], textarea[data-no-clear="true"]') &&
                    e.target.value && e.target.value.trim()
                ) {
                    console.log(`🛡️ [Global Guard] Protegendo: ${e.target.name || e.target.id}`);
                    e.stopPropagation();
                }
            }, true);
            
            this.preserveGuardApplied = true;
            console.log('✅ NavigationSystem: Guard global data-preserve aplicado');
        }
        
        // Integração com FormValidator se disponível
        if (window.validatorInstance) {
            console.log('🔗 [NavigationSystem] Integração com FormValidator v4.9.4 detectada');
            
            // Hook para monitorar ordem de eventos
            if (window.validatorInstance.eventOrder) {
                window.validatorInstance.eventOrder.push('[NavigationSystem] Guards aplicados');
            }
        }
    },

    // Proteger inputs em modais
    protectModalInputs() {
        const modalInputs = document.querySelectorAll('#leadModal input, #campanhaModal input, #contatoModal input, .modal input');
        
        modalInputs.forEach(input => {
            if (!input.hasAttribute('data-no-clear')) {
                input.setAttribute('data-no-clear', 'true');
            }
            if (!input.hasAttribute('data-preserve')) {
                input.setAttribute('data-preserve', 'true');
            }
            if (!input.hasAttribute('data-preserve-value')) {
                input.setAttribute('data-preserve-value', 'true');
            }
            
            if (!input.hasAttribute('tabindex')) {
                input.setAttribute('tabindex', '0');
            }
            
            console.log(`[NavigationSystem] 🔒 Input protegido: ${input.name || input.id}`);
        });
    },

    // Atualizar breadcrumb
    updateBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb');
        if (!breadcrumb) return;

        const sep = `<span class="mx-2 text-gray-400">/</span>`;
        const linkClass = 'text-gray-600 hover:text-blue-700 hover:underline transition';

        let html = `<i class="fas fa-home text-gray-500"></i>`;
        html += sep;
        html += `<button type="button" class="${linkClass}" data-nav-module="dashboard">Dashboard</button>`;

        if (this.currentModule && this.currentModule !== 'dashboard') {
            const moduleInfo = this.moduleConfig[this.currentModule];
            if (moduleInfo) {
                html += sep;
                html += `<button type="button" class="${linkClass}" data-nav-module="${this.currentModule}">${moduleInfo.name}</button>`;

                if (this.currentPage) {
                    const pageInfo = moduleInfo.pages[this.currentPage];
                    if (pageInfo) {
                        html += sep;
                        html += `<span class="text-blue-600 font-medium">${pageInfo.name}</span>`;
                    }
                }
            }
        }

        breadcrumb.innerHTML = html;
    },

    bindNavigationLinks(root) {
        const scope = root || document;
        scope.querySelectorAll('[data-nav-module], [data-nav-page]').forEach(el => {
            if (el.hasAttribute('data-navigation-bound')) return;
            el.setAttribute('data-navigation-bound', 'true');
            el.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const page = el.getAttribute('data-nav-page');
                const module = el.getAttribute('data-nav-module') || this.currentModule;

                if (page && module) {
                    this.navigateToPage(module, page);
                    return;
                }

                if (module) {
                    this.navigateToModule(module);
                }
            });
        });
    },

    // Mostrar acesso negado
    showAccessDenied() {
        const content = `
            <div class="text-center py-12">
                <i class="fas fa-lock text-red-400 text-6xl mb-4"></i>
                <h3 class="text-xl font-semibold text-red-600 mb-2">Acesso Negado</h3>
                <p class="text-gray-500 mb-4">Você não tem permissão para acessar este módulo.</p>
                <button type="button" data-nav-module="dashboard"
                        class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition duration-300">
                    <i class="fas fa-home mr-2"></i>
                    Voltar ao Dashboard
                </button>
            </div>
        `;

        const dashboardContent = document.getElementById('dashboardContent');
        const moduleContent = document.getElementById('moduleContent');
        dashboardContent?.classList.add('hidden');
        moduleContent?.classList.remove('hidden');
        if (moduleContent) {
            moduleContent.innerHTML = content;
        }
        this.bindNavigationLinks();
    },

    // Mostrar módulo não encontrado
    showModuleNotFound(module) {
        const content = `
            <div class="text-center py-12">
                <i class="fas fa-exclamation-triangle text-yellow-400 text-6xl mb-4"></i>
                <h3 class="text-xl font-semibold text-yellow-600 mb-2">Módulo Não Encontrado</h3>
                <p class="text-gray-500 mb-4">O módulo "${module}" não foi encontrado.</p>
                <button type="button" data-nav-module="dashboard"
                        class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition duration-300">
                    <i class="fas fa-home mr-2"></i>
                    Voltar ao Dashboard
                </button>
            </div>
        `;

        const moduleContent = document.getElementById('moduleContent');
        if (moduleContent) {
            moduleContent.innerHTML = content;
        }
        this.bindNavigationLinks();
    },

    // Mostrar página não encontrada
    showPageNotFound(module, page) {
        const content = `
            <div class="text-center py-12">
                <i class="fas fa-exclamation-triangle text-yellow-400 text-6xl mb-4"></i>
                <h3 class="text-xl font-semibold text-yellow-600 mb-2">Página Não Encontrada</h3>
                <p class="text-gray-500 mb-4">A página "${page}" do módulo "${module}" não foi encontrada.</p>
                <div class="space-x-4">
                    <button type="button" data-nav-module="${module}"
                            class="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition duration-300">
                        <i class="fas fa-arrow-left mr-2"></i>
                        Voltar ao Módulo
                    </button>
                    <button type="button" data-nav-module="dashboard"
                            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition duration-300">
                        <i class="fas fa-home mr-2"></i>
                        Dashboard
                    </button>
                </div>
            </div>
        `;

        document.getElementById('moduleContent').innerHTML = content;
        this.bindNavigationLinks();
    },

    // Obter módulo atual
    getCurrentModule() {
        return this.currentModule;
    },

    // Obter página atual
    getCurrentPage() {
        return this.currentPage;
    },

    // Obter configuração do módulo
    getModuleConfig(module) {
        return this.moduleConfig[module];
    },

    // Recarregar página atual
    reloadCurrentPage() {
        if (this.currentModule && this.currentPage) {
            this.navigateToPage(this.currentModule, this.currentPage);
        }
    },

    /**
     * Hook pós-submit v4.9.5 - Integração com FormValidator
     * Chamado após tentativa de submit para recarregar dados se sucesso
     */
    handlePostSubmit(result) {
        console.log('🔄 [NavigationSystem] Hook pós-submit:', result);
        
        if (result.success) {
            console.log('✅ [NavigationSystem] Submit bem-sucedido, recarregando lista...');
            
            // Recarregar lista baseada no módulo atual
            if (this.currentModule === 'marketing' && this.currentPage === 'leads') {
                this.reloadLeadsList();
            } else if (this.currentModule === 'marketing' && this.currentPage === 'contatos') {
                this.reloadContatosList();
            } else if (this.currentModule === 'marketing' && this.currentPage === 'campanhas') {
                this.reloadCampanhasList();
            } else {
                // Fallback: recarregar página atual
                this.reloadCurrentPage();
            }
            
            // Fechar modal se existir
            if (typeof closeLeadModal === 'function') {
                closeLeadModal();
            }
            
        } else {
            console.log('❌ [NavigationSystem] Submit falhou:', result.error);
            // Em caso de erro, não recarregar - manter dados no formulário
        }
    },

    /**
     * Recarregar lista de leads
     */
    reloadLeadsList() {
        // Zerar contador de retry e chamar loadLeads com delay seguro
        if (window.MarketingModule) {
            window.MarketingModule['_leadsLoadDomRetries'] = 0;
        }
        if (window.MarketingModule && typeof window.MarketingModule.loadLeads === 'function') {
            window.MarketingModule.loadLeads();
            return;
        }
        // Fallback: aguardar MarketingModule estar disponível
        this._leadsReloadRetries = (this._leadsReloadRetries || 0) + 1;
        if (this._leadsReloadRetries <= 8) {
            const delay = 150 * this._leadsReloadRetries;
            setTimeout(() => this.reloadLeadsList(), delay);
            return;
        }
        this._leadsReloadRetries = 0;
        console.warn('[NavigationSystem] MarketingModule.loadLeads não disponível após múltiplas tentativas.');
    }

    /**
     * Recarregar lista de contatos
     */
    reloadContatosList() {
        console.log('🔄 [NavigationSystem] Recarregando lista de contatos...');
        if (window.MarketingModule && window.MarketingModule.loadContatos) {
            window.MarketingModule.loadContatos();
        }
    },

    /**
     * Recarregar lista de campanhas
     */
    reloadCampanhasList() {
        console.log('🔄 [NavigationSystem] Recarregando lista de campanhas...');
        if (window.MarketingModule && window.MarketingModule.loadCampanhas) {
            window.MarketingModule.loadCampanhas();
        }
    },

    reloadClientesList() {
        console.log('🔄 [NavigationSystem] Recarregando lista de clientes...');
        if (!(window.ComercialModule && typeof window.ComercialModule.loadClientes === 'function')) {
            this._clientesReloadRetries = (this._clientesReloadRetries || 0) + 1;
            if (this._clientesReloadRetries <= 5) {
                const delay = 150 * this._clientesReloadRetries;
                setTimeout(() => this.reloadClientesList(), delay);
                return;
            }
        } else {
            this._clientesReloadRetries = 0;
            window.ComercialModule.loadClientes();
            return;
        }
        this.reloadCurrentPage();
    },

    reloadEventosList() {
        console.log('🔄 [NavigationSystem] Recarregando lista de eventos...');
        if (!(window.ComercialModule && typeof window.ComercialModule.loadEventos === 'function')) {
            this._eventosReloadRetries = (this._eventosReloadRetries || 0) + 1;
            if (this._eventosReloadRetries <= 5) {
                const delay = 150 * this._eventosReloadRetries;
                setTimeout(() => this.reloadEventosList(), delay);
                return;
            }
        } else {
            this._eventosReloadRetries = 0;
            window.ComercialModule.loadEventos();
            return;
        }
        this.reloadCurrentPage();
    },

    reloadBriefingsList() {
        console.log('🔄 [NavigationSystem] Recarregando lista de briefings...');
        if (!(window.ComercialModule && typeof window.ComercialModule.loadBriefings === 'function')) {
            this._briefingsReloadRetries = (this._briefingsReloadRetries || 0) + 1;
            if (this._briefingsReloadRetries <= 5) {
                const delay = 150 * this._briefingsReloadRetries;
                setTimeout(() => this.reloadBriefingsList(), delay);
                return;
            }
        } else {
            this._briefingsReloadRetries = 0;
            window.ComercialModule.loadBriefings();
            return;
        }
        this.reloadCurrentPage();
    }
};

// Exportar para uso global
window.NavigationSystem = NavigationSystem;
