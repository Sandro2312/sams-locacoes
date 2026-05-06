// Sistema de Autenticação SAMS Locações CRM/ERP
const AuthSystem = {
    // Configurações
    config: {
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15 minutos
        sessionDuration: 24 * 60 * 60 * 1000 // 24 horas
    },

    users: {},

    // Níveis de acesso e permissões
    accessLevels: {
        'administrador': {
            name: 'Administrador',
            permissions: ['all'],
            modules: ['marketing', 'comercial', 'projetos', 'montagem', 'financeiro', 'administrativo', 'juridico', 'kanban', 'administracao', 'acervo']
        },
        'marketing': {
            name: 'Marketing',
            permissions: ['marketing', 'kanban', 'acervo'],
            modules: ['marketing', 'kanban', 'acervo']
        },
        'comercial': {
            name: 'Comercial',
            permissions: ['marketing', 'comercial', 'financeiro', 'kanban', 'acervo'],
            modules: ['marketing', 'comercial', 'financeiro', 'kanban', 'acervo']
        },
        'vendedor': {
            name: 'Vendedor',
            permissions: ['marketing', 'comercial', 'financeiro', 'kanban', 'acervo'],
            modules: ['marketing', 'comercial', 'financeiro', 'kanban', 'acervo']
        },
        'projetos': {
            name: 'Projetos',
            permissions: ['projetos', 'kanban', 'acervo'],
            modules: ['projetos', 'kanban', 'acervo']
        },
        'montagem': {
            name: 'Montagem',
            permissions: ['montagem', 'kanban', 'acervo'],
            modules: ['montagem', 'kanban', 'acervo']
        },
        'financeiro': {
            name: 'Financeiro',
            permissions: ['financeiro', 'kanban', 'acervo'],
            modules: ['financeiro', 'kanban', 'acervo']
        },
        'administrativo': {
            name: 'Administrativo',
            permissions: ['administrativo', 'kanban', 'acervo'],
            modules: ['administrativo', 'kanban', 'acervo']
        },
        'juridico': {
            name: 'Jurídico',
            permissions: ['juridico', 'kanban', 'acervo'],
            modules: ['juridico', 'kanban', 'acervo']
        },
        'gerente': {
            name: 'Gerente',
            permissions: ['marketing', 'comercial', 'projetos', 'montagem', 'financeiro', 'administrativo', 'juridico', 'kanban', 'acervo'],
            modules: ['marketing', 'comercial', 'projetos', 'montagem', 'financeiro', 'administrativo', 'juridico', 'kanban', 'acervo']
        },
        'gerencia': {
            name: 'Gerência',
            permissions: ['marketing', 'comercial', 'projetos', 'montagem', 'financeiro', 'administrativo', 'juridico', 'kanban', 'acervo'],
            modules: ['marketing', 'comercial', 'projetos', 'montagem', 'financeiro', 'administrativo', 'juridico', 'kanban', 'acervo']
        }
    },

    // Estado atual
    currentUser: null,
    loginAttempts: {},

    // Inicialização
    init() {
        if (location.protocol !== 'http:' && location.protocol !== 'https:') {
            this.currentUser = null;
            this.showLogin();
            this.showMessage('Abra o sistema pelo endereço do servidor (ex.: http://localhost:49387/).', 'error');
            return;
        }
        // Ambiente de desenvolvimento: reduzir tempo de bloqueio para facilitar testes
        const isDev = ['localhost', '127.0.0.1'].includes(location.hostname);
        if (isDev && this.config.lockoutDuration > 60 * 1000) {
            this.config.lockoutDuration = 60 * 1000; // 1 minuto
        }
        this.checkSession();
        this.bindEvents();
        this.loadLoginAttempts();
    },

    // Verificar sessão existente
    async checkSession() {
        try {
            const resp = await fetch('/api/crm/me', { credentials: 'include' });
            const payload = await resp.json().catch(() => ({}));
            if (!resp.ok) {
                this.currentUser = null;
                this.showLogin();
                return;
            }
            const user = payload && payload.user ? payload.user : null;
            if (!user) {
                this.currentUser = null;
                this.showLogin();
                return;
            }
            this.createSession(user);
            this.showMainApp();
        } catch (error) {
            console.error('Erro ao verificar sessão:', error);
            this.currentUser = null;
            this.showLogin();
        }
    },

    // Criar sessão de teste (somente em desenvolvimento)
    async createTestSession() {
        try {
            const resp = await fetch('/api/crm/test/create-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({})
            });
            const payload = await resp.json().catch(() => ({}));
            if (!resp.ok) {
                this.showMessage('Falha ao criar sessão de teste.', 'error');
                return;
            }
            const user = payload.user;
            this.clearFailedAttempts(user.email);
            this.createSession(user);
            this.showMessage('Sessão de teste criada com sucesso!', 'success');
            setTimeout(() => {
                this.showMainApp();
            }, 1000);
        } catch (err) {
            console.error('Erro ao criar sessão de teste:', err);
            this.showMessage('Erro ao criar sessão de teste.', 'error');
        }
    },

    // Vincular eventos
    bindEvents() {
        const ensureCsrf = () => {
            let metaCsrf = document.querySelector('meta[name="csrf-token"]');
            const inputCsrf = document.getElementById('csrfToken');
            if (!metaCsrf) {
                metaCsrf = document.createElement('meta');
                metaCsrf.setAttribute('name', 'csrf-token');
                document.head.appendChild(metaCsrf);
            }
            const currentMeta = metaCsrf.getAttribute('content') || '';
            const token = currentMeta || (Math.random().toString(36).slice(2) + Date.now().toString(36));
            metaCsrf.setAttribute('content', token);
            if (inputCsrf) inputCsrf.value = token;
        };
        ensureCsrf();

        // Delegação de submit para o formulário de login
        document.addEventListener('submit', (e) => {
            const form = e.target;
            if (form && form.id === 'loginForm') {
                e.preventDefault();
                this.handleLogin();
            }
        }, true);

        // Delegação de clique para toggle de senha
        document.body.addEventListener('click', (e) => {
            const btn = e.target.closest('#togglePassword,[data-action="togglePassword"]');
            if (btn) {
                e.preventDefault();
                this.togglePasswordVisibility();
            }
        });

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.logout.bind(this));
        }

        // Botão de desbloqueio (somente em ambiente localhost)
    const isDev = ['localhost', '127.0.0.1'].includes(location.hostname);
    const devUnlockBtn = document.getElementById('devUnlockBtn');
    if (isDev && devUnlockBtn) {
        devUnlockBtn.classList.remove('hidden');
        devUnlockBtn.addEventListener('click', () => {
            const emailEl = document.getElementById('loginEmail');
            const email = emailEl ? emailEl.value.trim() : '';
            if (!email) {
                this.showMessage('Informe o e-mail para desbloquear.', 'warning');
                return;
            }
            this.clearFailedAttempts(email);
            this.showMessage('Conta desbloqueada para testes (dev).', 'success');
        });
    }

    // Botão de teste de login (somente em ambiente localhost)
    const devTestLoginBtn = document.getElementById('devTestLoginBtn');
    if (isDev && devTestLoginBtn) {
        devTestLoginBtn.classList.remove('hidden');
        devTestLoginBtn.addEventListener('click', () => {
            this.createTestSession();
        });
    }
},

    // Processar login
    async handleLogin() {
        const formEl = document.getElementById('loginForm');
        const emailEl = document.getElementById('loginEmail');
        const passwordEl = document.getElementById('loginPassword');
        const spinnerEl = document.getElementById('loginSpinner');
        const messageDiv = document.getElementById('loginMessage');
        const metaCsrf = document.querySelector('meta[name="csrf-token"]');
        const inputCsrf = document.getElementById('csrfToken');

        const email = emailEl ? emailEl.value.trim() : '';
        const password = passwordEl ? passwordEl.value : '';

        const ensureCsrf = () => {
            let meta = metaCsrf;
            if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute('name', 'csrf-token');
                document.head.appendChild(meta);
            }
            const currentMeta = meta.getAttribute('content') || '';
            const token = currentMeta || (Math.random().toString(36).slice(2) + Date.now().toString(36));
            meta.setAttribute('content', token);
            if (inputCsrf) inputCsrf.value = token;
            return token;
        };
        const csrfToken = ensureCsrf();
        const csrfMetaValue = (metaCsrf ? metaCsrf.getAttribute('content') : csrfToken) || '';
        const csrfInputValue = inputCsrf ? inputCsrf.value : csrfToken;
        if (!csrfMetaValue || !csrfInputValue || csrfMetaValue !== csrfInputValue) {
            this.showMessage('Falha de validação de segurança. Atualize a página e tente novamente.', 'error');
            return;
        }

        // Validações básicas
        if (!email || !password) {
            this.showMessage('Por favor, preencha todos os campos.', 'error');
            return;
        }

        // Ativar feedback visual
        if (formEl) formEl.setAttribute('aria-busy', 'true');
        if (spinnerEl) spinnerEl.classList.remove('hidden');
        if (messageDiv) {
            messageDiv.classList.add('hidden');
            messageDiv.textContent = '';
        }

        try {
            // Verificar bloqueio por tentativas
            if (this.isUserLocked(email)) {
                const lockTime = this.getLockTimeRemaining(email);
                this.showMessage(`Usuário bloqueado. Tente novamente em ${Math.ceil(lockTime / 60000)} minutos.`, 'error');
                return;
            }

            // Verificar credenciais via backend
            try {
                const resp = await fetch('/api/crm/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, password })
                });
                const payload = await resp.json().catch(()=>({}));
                if (!resp.ok) {
                    this.recordFailedAttempt(email);
                    const msg = payload && payload.error ? payload.error : 'Email/login ou senha incorretos.';
                    this.showMessage(msg, 'error');
                    return;
                }
                const user = payload.user;
                // Login bem-sucedido
                this.clearFailedAttempts(email);
                this.createSession(user);
                this.showMessage('Login realizado com sucesso!', 'success');

                setTimeout(() => {
                    this.showMainApp();
                }, 1000);
            } catch(fetchErr){
                console.error('Erro ao chamar /api/login:', fetchErr);
                this.showMessage('Erro de comunicação com o servidor. Tente novamente.', 'error');
                return;
            }
        } catch (err) {
            console.error('Erro no processo de login:', err);
            this.showMessage('Ocorreu um erro no login. Tente novamente.', 'error');
        } finally {
            // Desativar feedback visual
            if (formEl) formEl.setAttribute('aria-busy', 'false');
            if (spinnerEl) spinnerEl.classList.add('hidden');
        }
    },

    showMessage(message, type = 'info') {
        const messageDiv = document.getElementById('loginMessage');
        if (!messageDiv) return;

        // Mapear classes
        const classes = this.getMessageClasses(type);
        messageDiv.className = `mt-4 p-3 rounded-lg text-sm text-center ${classes}`;
        messageDiv.setAttribute('role', 'alert');
        messageDiv.setAttribute('aria-live', 'polite');
        messageDiv.textContent = message;
        messageDiv.classList.remove('hidden');
    },

    // Criar sessão
    createSession(user) {
        const prevUserId = (() => {
            try { return localStorage.getItem('sams_last_user_id') || ''; } catch { return ''; }
        })();
        const role = user && user.role ? String(user.role) : 'comercial';
        const access = this.accessLevels[role] || { permissions: [], modules: [] };
        let modules = Array.isArray(user && user.modules) ? user.modules : null;
        if (!modules && user && user.modules_json) {
            try {
                const parsed = typeof user.modules_json === 'string' ? JSON.parse(user.modules_json) : user.modules_json;
                if (Array.isArray(parsed)) modules = parsed;
            } catch {}
        }
        let permissions = Array.isArray(user && user.permissions) ? user.permissions : null;
        if (!permissions && user && user.permissions_json) {
            try {
                const parsed = typeof user.permissions_json === 'string' ? JSON.parse(user.permissions_json) : user.permissions_json;
                if (Array.isArray(parsed)) permissions = parsed;
            } catch {}
        }
        this.currentUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            role,
            active: user.active,
            permissions: permissions || access.permissions || [],
            modules: modules || access.modules || []
        };

        const nextUserId = this.currentUser && this.currentUser.id != null ? String(this.currentUser.id) : '';
        if (prevUserId && nextUserId && prevUserId !== nextUserId) {
            try {
                const defaults = { q: '', temperatura: '', segmento: '', evento: '' };
                if (window.ModuleSystem && ModuleSystem.data) {
                    ModuleSystem.data.ui = ModuleSystem.data.ui || {};
                    ModuleSystem.data.ui.marketingLeadsFilters = { ...defaults };
                    if (typeof ModuleSystem.saveData === 'function') ModuleSystem.saveData();
                } else {
                    const raw = localStorage.getItem('sams_module_data');
                    if (raw) {
                        const data = JSON.parse(raw);
                        data.ui = data.ui || {};
                        data.ui.marketingLeadsFilters = { ...defaults };
                        localStorage.setItem('sams_module_data', JSON.stringify(data));
                    }
                }
            } catch {}
        }
        try { localStorage.setItem('sams_last_user_id', nextUserId); } catch {}
        try { this.loadUiConfig(); } catch {}
    },

    async loadUiConfig() {
        try {
            const resp = await fetch('/api/crm/ui/config', { credentials: 'include' });
            const payload = await resp.json().catch(() => null);
            if (!resp.ok || !payload) return;
            window.CrmUiConfig = payload;
            try { localStorage.setItem('crm_ui_config', JSON.stringify({ at: Date.now(), payload })); } catch {}
            this.ensureTelemetry();
        } catch {}
    },

    ensureTelemetry() {
        if (window.CrmTelemetry && typeof window.CrmTelemetry.track === 'function') return;
        const queue = [];
        let flushing = false;
        const shouldSend = () => {
            const cfg = window.CrmUiConfig;
            return !(cfg && cfg.features && cfg.features.telemetry === false);
        };
        const send = async (evt) => {
            if (!evt || !evt.name) return;
            if (!shouldSend()) return;
            const body = JSON.stringify(evt);
            if (navigator && typeof navigator.sendBeacon === 'function') {
                try {
                    const blob = new Blob([body], { type: 'application/json' });
                    navigator.sendBeacon('/api/crm/ui/event', blob);
                    return;
                } catch {}
            }
            try {
                fetch('/api/crm/ui/event', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body
                }).catch(() => {});
            } catch {}
        };
        const flush = async () => {
            if (flushing) return;
            flushing = true;
            try {
                while (queue.length) {
                    const evt = queue.shift();
                    await send(evt);
                }
            } finally {
                flushing = false;
            }
        };
        window.CrmTelemetry = {
            track: (name, module, meta) => {
                try {
                    const baseMeta = meta && typeof meta === 'object' ? { ...meta } : {};
                    try {
                        const cfg = window.CrmUiConfig;
                        const v = cfg && cfg.experiments && cfg.experiments.aiPanels && cfg.experiments.aiPanels.variant ? String(cfg.experiments.aiPanels.variant) : '';
                        if (v && !baseMeta.exp_aiPanels) baseMeta.exp_aiPanels = v;
                        const isMobile = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
                        if (baseMeta.isMobile == null) baseMeta.isMobile = !!isMobile;
                    } catch {}
                    queue.push({ name: String(name || ''), module: module != null ? String(module) : undefined, meta: baseMeta });
                    if (queue.length >= 5) flush().catch(() => {});
                    else setTimeout(() => flush().catch(() => {}), 300);
                } catch {}
            }
        };
        try {
            window.addEventListener('beforeunload', () => {
                try { flush(); } catch {}
            });
        } catch {}
    },

    // Logout
    logout() {
        try {
            fetch('/api/crm/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
        } catch (e) {}
        this.currentUser = null;
        try { delete window.CrmUiConfig; } catch {}
        try { delete window.CrmTelemetry; } catch {}
        try {
            const defaults = { q: '', temperatura: '', segmento: '', evento: '' };
            if (window.ModuleSystem && ModuleSystem.data) {
                ModuleSystem.data.ui = ModuleSystem.data.ui || {};
                ModuleSystem.data.ui.marketingLeadsFilters = { ...defaults };
                if (typeof ModuleSystem.saveData === 'function') ModuleSystem.saveData();
            } else {
                const raw = localStorage.getItem('sams_module_data');
                if (raw) {
                    const data = JSON.parse(raw);
                    data.ui = data.ui || {};
                    data.ui.marketingLeadsFilters = { ...defaults };
                    localStorage.setItem('sams_module_data', JSON.stringify(data));
                }
            }
        } catch {}
        this.forceDashboardHome();
        this.showLogin();
        this.showMessage('Logout realizado com sucesso!', 'success');
    },

    // Controle de tentativas de login
    recordFailedAttempt(email) {
        if (!this.loginAttempts[email]) {
            this.loginAttempts[email] = {
                count: 0,
                lastAttempt: null,
                lockedUntil: null
            };
        }

        this.loginAttempts[email].count++;
        this.loginAttempts[email].lastAttempt = new Date().getTime();

        if (this.loginAttempts[email].count >= this.config.maxLoginAttempts) {
            this.loginAttempts[email].lockedUntil = new Date().getTime() + this.config.lockoutDuration;
        }

        this.saveLoginAttempts();
    },

    clearFailedAttempts(email) {
        if (this.loginAttempts[email]) {
            delete this.loginAttempts[email];
            this.saveLoginAttempts();
        }
    },

    isUserLocked(email) {
        const attempts = this.loginAttempts[email];
        if (!attempts || !attempts.lockedUntil) return false;
        
        const now = new Date().getTime();
        if (now > attempts.lockedUntil) {
            this.clearFailedAttempts(email);
            return false;
        }
        
        return true;
    },

    getLockTimeRemaining(email) {
        const attempts = this.loginAttempts[email];
        if (!attempts || !attempts.lockedUntil) return 0;
        
        const now = new Date().getTime();
        return Math.max(0, attempts.lockedUntil - now);
    },

    saveLoginAttempts() {
        localStorage.setItem('sams_login_attempts', JSON.stringify(this.loginAttempts));
    },

    loadLoginAttempts() {
        const attempts = localStorage.getItem('sams_login_attempts');
        if (attempts) {
            try {
                this.loginAttempts = JSON.parse(attempts);
            } catch (error) {
                console.error('Erro ao carregar tentativas de login:', error);
                this.loginAttempts = {};
            }
        }
    },

    // Toggle password visibility
    togglePasswordVisibility() {
        const passwordInput = document.getElementById('loginPassword');
        const toggleIcon = document.querySelector('#togglePassword i');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.className = 'fas fa-eye-slash';
        } else {
            passwordInput.type = 'password';
            toggleIcon.className = 'fas fa-eye';
        }
    },

    // Mostrar/ocultar telas
    showLogin() {
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
        
        // Limpar campos
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginMessage').classList.add('hidden');
    },

    showMainApp() {
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        
        this.updateUserDisplay();
        this.updateModuleAccess();
        this.forceDashboardHome();
        
        // Inicializar NavigationSystem após mostrar a aplicação principal
        setTimeout(() => {
            if (typeof NavigationSystem !== 'undefined' && NavigationSystem.init) {
                try {
                    console.log('🔗 Inicializando NavigationSystem após login...');
                    NavigationSystem.init();
                    try { NavigationSystem.navigateToModule('dashboard'); } catch {}
                    console.log('✅ NavigationSystem inicializado - eventos de navegação vinculados');
                } catch (error) {
                    console.error('❌ Erro ao inicializar NavigationSystem:', error);
                }
            } else {
                console.warn('⚠️ NavigationSystem não disponível para inicialização');
            }
        }, 100);
        // Inicializar ModuleSystem após NavigationSystem
        if (typeof ModuleSystem !== 'undefined' && ModuleSystem.init) {
            try {
                console.log('🔗 Inicializando ModuleSystem...');
                ModuleSystem.init();
                console.log('✅ ModuleSystem inicializado - eventos CRUD vinculados');
            } catch (error) {
                console.error('❌ Erro ao inicializar ModuleSystem:', error);
            }
        } else {
            console.warn('⚠️ ModuleSystem não disponível para inicialização');
        }

        // 🔄 Sincronização inicial: carregar transações do servidor (garante mobile/desktop em sincronia)
        // Usa retry com polling pois no mobile o ModuleSystem pode ainda não estar pronto
        const syncTransacoesWithRetry = (attemptsLeft) => {
            if (attemptsLeft <= 0) {
                console.warn('[AuthSystem] Falha ao sincronizar transações: ModuleSystem não disponível após várias tentativas');
                return;
            }
            if (typeof ModuleSystem !== 'undefined' && typeof ModuleSystem.loadTransacoes === 'function') {
                ModuleSystem.loadTransacoes()
                    .then(() => console.log('✅ [AuthSystem] Transações sincronizadas após login'))
                    .catch(e => console.warn('[AuthSystem] Falha ao sincronizar transações:', e));
            } else {
                // ModuleSystem ainda não está pronto, tentar novamente em 300ms
                setTimeout(() => syncTransacoesWithRetry(attemptsLeft - 1), 300);
            }
        };
        setTimeout(() => syncTransacoesWithRetry(15), 500); // até 15 tentativas = ~5 segundos

        setTimeout(() => {
            this.maybeShowDailyWelcome();
        }, 350);
    },

    getLocalDateKey() {
        const d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    },

    forceDashboardHome() {
        try {
            const url = new URL(window.location.href);
            url.searchParams.delete('module');
            url.searchParams.delete('page');
            url.hash = '';
            window.history.replaceState({}, document.title, url.pathname);
        } catch {
            try { window.history.replaceState({}, document.title, window.location.pathname); } catch {}
        }
        try {
            sessionStorage.setItem('samsNavTarget', JSON.stringify({ module: 'dashboard' }));
        } catch {}
        try {
            const dashboardContent = document.getElementById('dashboardContent');
            const moduleContent = document.getElementById('moduleContent');
            dashboardContent?.classList.remove('hidden');
            moduleContent?.classList.add('hidden');
        } catch {}
        try {
            if (window.NavigationSystem) {
                window.NavigationSystem.currentModule = 'dashboard';
                window.NavigationSystem.currentPage = null;
            }
        } catch {}
    },

    async maybeShowDailyWelcome() {
        const u = this.currentUser;
        if (!u || !u.id) return;

        const today = this.getLocalDateKey();
        const key = `sams_welcome_lastDate_${u.id}`;
        try {
            const last = localStorage.getItem(key);
            if (last === today) return;
            localStorage.setItem(key, today);
        } catch {}

        const escapeHtml = (value) => {
            try {
                if (window.FormSystem && typeof window.FormSystem.escapeHtml === 'function') return window.FormSystem.escapeHtml(value);
            } catch {}
            return String(value ?? '')
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
                .replaceAll("'", '&#39;');
        };

        const hour = new Date().getHours();
        const saudacao = hour < 12 ? 'Bom dia' : (hour < 18 ? 'Boa tarde' : 'Boa noite');

        let tarefas = [];
        try {
            const resp = await fetch(`/api/crm/tarefas-admin?responsavel_id=${encodeURIComponent(u.id)}`, { credentials: 'include' });
            const payload = await resp.json().catch(() => []);
            if (resp.ok && Array.isArray(payload)) tarefas = payload;
        } catch {}

        const prOrder = { critica: 0, alta: 1, media: 2, baixa: 3 };
        const stHidden = new Set(['done', 'cancelled']);
        const parseDate = (s) => {
            if (!s) return null;
            const m = String(s).match(/^(\d{4}-\d{2}-\d{2})/);
            if (!m) return null;
            return m[1];
        };
        const prLabel = (p) => {
            const v = String(p || '').toLowerCase();
            if (v === 'critica') return 'Crítica';
            if (v === 'alta') return 'Alta';
            if (v === 'media') return 'Média';
            if (v === 'baixa') return 'Baixa';
            return '—';
        };
        const stLabel = (s) => {
            const v = String(s || '').toLowerCase();
            if (v === 'backlog') return 'Backlog';
            if (v === 'todo') return 'A Fazer';
            if (v === 'doing') return 'Em andamento';
            if (v === 'review') return 'Revisão';
            if (v === 'done') return 'Concluída';
            if (v === 'cancelled') return 'Cancelada';
            return s || '—';
        };

        const top = (tarefas || [])
            .filter(t => t && !stHidden.has(String(t.status || '').toLowerCase()))
            .sort((a, b) => {
                const ap = prOrder[String(a.prioridade || '').toLowerCase()] ?? 9;
                const bp = prOrder[String(b.prioridade || '').toLowerCase()] ?? 9;
                if (ap !== bp) return ap - bp;
                const ad = parseDate(a.data_vencimento) || '9999-12-31';
                const bd = parseDate(b.data_vencimento) || '9999-12-31';
                if (ad !== bd) return ad.localeCompare(bd);
                return Number(b.id || 0) - Number(a.id || 0);
            })
            .slice(0, 6);

        let goAction = '';
        try {
            if (typeof window.AuthSystem !== 'undefined' && window.AuthSystem.hasModuleAccess && window.AuthSystem.hasModuleAccess('administrativo')) {
                goAction = "try{FormSystem.closeModal(); NavigationSystem.navigateToModule('administrativo'); NavigationSystem.navigateToPage('administrativo','tarefas');}catch{}";
            } else if (typeof window.AuthSystem !== 'undefined' && window.AuthSystem.hasModuleAccess && window.AuthSystem.hasModuleAccess('kanban')) {
                goAction = "try{FormSystem.closeModal(); NavigationSystem.navigateToModule('kanban'); NavigationSystem.navigateToPage('kanban','tarefas');}catch{}";
            }
        } catch {}

        const content = `
            <div class="space-y-4">
                <div class="text-sm text-gray-700">${escapeHtml(saudacao)}, <span class="font-semibold">${escapeHtml(u.name || '')}</span>.</div>
                <div class="text-sm text-gray-600">Prioridades do dia (tarefas em aberto):</div>
                ${top.length ? `
                    <div class="border rounded-lg overflow-hidden">
                        <table class="w-full text-sm">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tarefa</th>
                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Prioridade</th>
                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vencimento</th>
                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y">
                                ${top.map(t => `
                                    <tr>
                                        <td class="px-3 py-2 text-gray-900">${escapeHtml(t.titulo || '')}</td>
                                        <td class="px-3 py-2 text-gray-700">${escapeHtml(prLabel(t.prioridade))}</td>
                                        <td class="px-3 py-2 text-gray-700">${escapeHtml(parseDate(t.data_vencimento) || '—')}</td>
                                        <td class="px-3 py-2 text-gray-700">${escapeHtml(stLabel(t.status))}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="text-sm text-gray-500">Você não tem tarefas pendentes atribuídas no momento.</div>
                `}
                <div class="flex items-center justify-end gap-2 pt-2">
                    ${goAction ? `<button type="button" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm" onclick="${goAction}">Abrir minhas tarefas</button>` : ''}
                    <button type="button" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm" onclick="try{FormSystem.closeModal();}catch{}">Fechar</button>
                </div>
            </div>
        `;

        try {
            if (window.FormSystem && typeof window.FormSystem.openModal === 'function') {
                window.FormSystem.openModal('Bem-vindo!', content);
                const saveBtn = document.getElementById('modal-save');
                if (saveBtn) saveBtn.classList.add('hidden');
                const cancelBtn = document.getElementById('modal-cancel');
                if (cancelBtn) cancelBtn.classList.add('hidden');
                return;
            }
        } catch {}

        try {
            if (window.NotificationSystem && typeof window.NotificationSystem.success === 'function') {
                window.NotificationSystem.success(`${saudacao}, ${u.name || ''}.`);
            }
        } catch {}
    },

    // Atualizar display do usuário
    updateUserDisplay() {
        if (this.currentUser) {
            document.getElementById('userNameDisplay').textContent = this.currentUser.name;
            document.getElementById('userRoleDisplay').textContent = this.accessLevels[this.currentUser.role]?.name || this.currentUser.role;
        }
    },

    // Atualizar acesso aos módulos
    updateModuleAccess() {
        if (!this.currentUser) return;

        const userRole = this.currentUser.role;
        
        // Mostrar/ocultar módulos baseado nas permissões
        const moduleCards = document.querySelectorAll('.module-card');
        moduleCards.forEach(card => {
            const module = card.getAttribute('data-module');
            
            if (userRole === 'administrador' || this.hasModuleAccess(module)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });

        // Módulo de administração apenas para administrador
        const adminModule = document.getElementById('adminModule');
        if (adminModule) {
            if (userRole === 'administrador') {
                adminModule.style.display = 'block';
            } else {
                adminModule.style.display = 'none';
            }
        }

        const dashboardContent = document.getElementById('dashboardContent');
        if (!dashboardContent) return;

        let noAccessEl = document.getElementById('dashboardNoModuleAccess');
        if (!noAccessEl) {
            noAccessEl = document.createElement('div');
            noAccessEl.id = 'dashboardNoModuleAccess';
            noAccessEl.className = 'hidden mt-6 bg-blue-50 border border-blue-200 rounded-lg p-5';
            noAccessEl.innerHTML = `
                <div class="flex items-start gap-3">
                    <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <i class="fas fa-user-lock text-blue-600"></i>
                    </div>
                    <div>
                        <div class="text-sm font-semibold text-blue-900">Aguardando liberação de acessos</div>
                        <p class="text-sm text-blue-800 mt-1">
                            Seu usuário foi criado com acesso inicial restrito. Solicite ao administrador ou gerente a liberação dos módulos necessários.
                        </p>
                    </div>
                </div>
            `;

            const firstCard = document.querySelector('.module-card');
            const modulesGrid = firstCard && firstCard.parentElement ? firstCard.parentElement : null;
            if (modulesGrid && modulesGrid.parentElement) {
                modulesGrid.parentElement.insertBefore(noAccessEl, modulesGrid.nextSibling);
            } else {
                dashboardContent.appendChild(noAccessEl);
            }
        }

        const hasVisibleModules = Array.from(document.querySelectorAll('.module-card')).some(card => card.style.display !== 'none');
        noAccessEl.classList.toggle('hidden', hasVisibleModules);
    },

    // Verificar permissão
    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        const userRole = this.currentUser.role;
        if (userRole === 'administrador') return true;
        
        // Usar o sistema de permissões se disponível
        if (typeof PermissionSystem !== 'undefined') {
            return PermissionSystem.hasPermission(permission);
        }
        
        // Fallback para sistema básico
        const userPermissions = this.accessLevels[userRole]?.permissions || [];
        return userPermissions.includes(permission);
    },

    hasSpecificPermission(permission) {
        try {
            if (!this.currentUser) return false;
            const role = this.currentUser.role != null ? String(this.currentUser.role).trim().toLowerCase() : '';
            if (role === 'administrador' || role === 'admin') return true;

            const p = permission != null ? String(permission).trim() : '';
            if (!p) return false;

            const perms = Array.isArray(this.currentUser.permissions) ? this.currentUser.permissions.map(x => String(x)) : [];
            if (perms.includes('all')) return true;
            if (perms.includes(p)) return true;

            if (!p.includes('.')) {
                const modules = Array.isArray(this.currentUser.modules) ? this.currentUser.modules.map(x => String(x)) : [];
                if (modules.includes(p)) return true;
            }

            return false;
        } catch {
            return false;
        }
    },

    // Verificar acesso ao módulo
    hasModuleAccess(module) {
        if (!this.currentUser) return false;
        
        const userRole = this.currentUser.role;
        if (userRole === 'administrador') return true;
        
        // Usar o sistema de permissões se disponível
        if (typeof PermissionSystem !== 'undefined' && typeof PermissionSystem.hasModuleAccess === 'function') {
            return PermissionSystem.hasModuleAccess(module);
        }
        
        // Fallback para sistema básico
        const userModules = Array.isArray(this.currentUser.modules) ? this.currentUser.modules : (this.accessLevels[userRole]?.modules || []);
        return userModules.includes(module);
    },

    // Mostrar mensagem
    showMessage(message, type = 'info') {
        const messageDiv = document.getElementById('loginMessage');
        if (!messageDiv) return;

        messageDiv.textContent = message;
        messageDiv.className = `mt-4 p-3 rounded-lg text-sm text-center ${this.getMessageClasses(type)}`;
        messageDiv.classList.remove('hidden');

        // Auto-hide após 5 segundos
        setTimeout(() => {
            messageDiv.classList.add('hidden');
        }, 5000);
    },

    getMessageClasses(type) {
        const classes = {
            'success': 'bg-green-100 text-green-800 border border-green-200',
            'error': 'bg-red-100 text-red-800 border border-red-200',
            'warning': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
            'info': 'bg-blue-100 text-blue-800 border border-blue-200'
        };
        return classes[type] || classes.info;
    },

    // Obter usuário atual
    getCurrentUser() {
        return this.currentUser;
    },

    // Obter todos os usuários (apenas para administrador)
    getAllUsers() {
        if (!this.hasPermission('all')) {
            throw new Error('Acesso negado');
        }
        return Object.values(this.users);
    },

    // Criar novo usuário (apenas para administrador)
    createUser(userData) {
        if (!this.hasPermission('all')) {
            throw new Error('Acesso negado');
        }

        const email = userData.email;
        if (this.users[email]) {
            throw new Error('Usuário já existe');
        }

        this.users[email] = {
            id: Object.keys(this.users).length + 1,
            name: userData.name,
            email: userData.email,
            password: userData.password, // Em produção seria hash bcrypt
            role: userData.role,
            permissions: this.accessLevels[userData.role]?.permissions || [],
            active: true,
            createdAt: new Date(),
            lastLogin: null
        };

        return this.users[email];
    },

    // Atualizar usuário (apenas para administrador)
    updateUser(email, userData) {
        if (!this.hasPermission('all')) {
            throw new Error('Acesso negado');
        }

        if (!this.users[email]) {
            throw new Error('Usuário não encontrado');
        }

        Object.assign(this.users[email], userData);
        return this.users[email];
    },

    // Desativar usuário (apenas para administrador)
    deactivateUser(email) {
        if (!this.hasPermission('all')) {
            throw new Error('Acesso negado');
        }

        if (!this.users[email]) {
            throw new Error('Usuário não encontrado');
        }

        this.users[email].active = false;
        return this.users[email];
    }
};

// Exportar para uso global
window.AuthSystem = AuthSystem;
