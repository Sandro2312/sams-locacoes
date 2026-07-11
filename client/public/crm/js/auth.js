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
    // Obter headers de autenticação (cookie + fallback token para browsers restritivos)
    _getAuthHeaders() {
        const headers = {};
        // Recuperar token de fallback (para Safari ITP, Brave, Firefox Strict)
        const token = window._crmSessionToken
            || (() => { try { return sessionStorage.getItem('crm_fallback_token'); } catch { return null; } })()
            || (() => { try { return localStorage.getItem('crm_fallback_token'); } catch { return null; } })();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            window._crmSessionToken = token; // manter em memória
        }
        return headers;
    },

    // Limpar todos os dados de sessão CRM (tokens, cookies, storage)
    _clearAllSessionData() {
        // Limpar tokens em memória
        window._crmSessionToken = null;
        // Limpar sessionStorage
        try { sessionStorage.removeItem('crm_fallback_token'); } catch {}
        // Limpar localStorage (apenas chaves CRM)
        try {
            localStorage.removeItem('crm_fallback_token');
            localStorage.removeItem('sams_crm_session');
            localStorage.removeItem('sams_crm_user');
        } catch {}
        // Limpar cookie crm_session via document.cookie
        try {
            document.cookie = 'crm_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            document.cookie = 'crm_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/api/crm;';
        } catch {}
    },

    async checkSession() {
        try {
            const headers = this._getAuthHeaders();
            const resp = await fetch('/api/crm/me', { credentials: 'include', headers });
            const payload = await resp.json().catch(() => ({}));
            if (!resp.ok) {
                // Sessão inválida (401/403) — limpar TUDO e mostrar login
                console.warn('[Auth] Sessão inválida (HTTP ' + resp.status + ') — limpando dados e redirecionando para login');
                this._clearAllSessionData();
                this.currentUser = null;
                this.showLogin();
                return;
            }
            const user = payload && payload.user ? payload.user : null;
            if (!user) {
                this._clearAllSessionData();
                this.currentUser = null;
                this.showLogin();
                return;
            }
            // Persistir token retornado pelo servidor (fallback para Edge/Safari que bloqueiam cookies)
            if (payload._sessionToken) {
                window._crmSessionToken = payload._sessionToken;
                try { sessionStorage.setItem('crm_fallback_token', payload._sessionToken); } catch {}
                try { localStorage.setItem('crm_fallback_token', payload._sessionToken); } catch {}
            }
            this.createSession(user);
            this.showMainApp();
        } catch (error) {
            console.error('Erro ao verificar sessão:', error);
            // Erro de rede ou servidor — limpar sessão para evitar loop
            this._clearAllSessionData();
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
        // Nota: o onclick inline no botão #togglePassword já cuida do toggle.
        // Mantemos este handler apenas para data-action="togglePassword" em outros contextos.
        document.body.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action="togglePassword"]');
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

        // Botão de desbloqueio (somente em ambiente de desenvolvimento)
    const isDev = location.hostname.includes('localhost') || location.hostname.includes('127.0.0.1') || location.hostname.includes('manus.computer');
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

    // Botão de teste de login (somente em ambiente de desenvolvimento)
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
        const inputCsrf = document.getElementById('csrfToken');

        const email = emailEl ? emailEl.value.trim() : '';
        const password = passwordEl ? passwordEl.value : '';

        // Garantir token CSRF sincronizado entre meta e input (corrige falha em mobile/Safari)
        const ensureCsrf = () => {
            let meta = document.querySelector('meta[name="csrf-token"]');
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
        // Chamar ensureCsrf() ANTES de ler os valores para garantir sincronia
        ensureCsrf();
        // Não bloquear login por CSRF no client-side - o servidor não valida CSRF nesta rota
        // A validação real é feita pelo cookie httpOnly + bcrypt no servidor

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
                // Armazenar token de fallback para browsers que bloqueiam cookies (Safari ITP, Brave)
                if (payload._sessionToken) {
                    try { sessionStorage.setItem('crm_fallback_token', payload._sessionToken); } catch {}
                    try { localStorage.setItem('crm_fallback_token', payload._sessionToken); } catch {}
                    // Configurar header global para todos os fetches futuros
                    window._crmSessionToken = payload._sessionToken;
                }
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
        // Parar timer de inatividade antes de fazer logout
        if (window.IdleTimer && typeof IdleTimer.stop === 'function') {
            IdleTimer.stop();
        }
        try {
            fetch('/api/crm/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
        } catch (e) {}
        this.currentUser = null;
        // Limpar token de fallback
        try { sessionStorage.removeItem('crm_fallback_token'); } catch {}
        try { localStorage.removeItem('crm_fallback_token'); } catch {}
        window._crmSessionToken = null;
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
        
        // Resetar flag de sessão expirada ao fazer novo login
        window._crmSessionExpired = false;
        
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

        // Iniciar timer de logout por inatividade
        if (window.IdleTimer && typeof IdleTimer.start === 'function') {
            IdleTimer.start();
        }
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

        // ── Banco de lembretes, dicas e salmos ─────────────────────────────────
        const MENSAGENS = [
            // Salmos
            { tipo: 'salmo', icone: '✝️', cor: '#7c3aed', titulo: 'Salmo 23:1', texto: '"O Senhor é meu pastor; nada me faltará."' },
            { tipo: 'salmo', icone: '✝️', cor: '#7c3aed', titulo: 'Salmo 91:11', texto: '"Deus ordenará que os seus anjos cuidem de você em todos os seus caminhos."' },
            { tipo: 'salmo', icone: '✝️', cor: '#7c3aed', titulo: 'Salmo 37:5', texto: '"Entrega o teu caminho ao Senhor; confia nele, e ele agirá."' },
            { tipo: 'salmo', icone: '✝️', cor: '#7c3aed', titulo: 'Salmo 46:1', texto: '"Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia."' },
            { tipo: 'salmo', icone: '✝️', cor: '#7c3aed', titulo: 'Salmo 118:24', texto: '"Este é o dia que o Senhor fez; regozijemo-nos e alegremo-nos nele."' },
            { tipo: 'salmo', icone: '✝️', cor: '#7c3aed', titulo: 'Salmo 121:2', texto: '"O meu socorro vem do Senhor, que fez os céus e a terra."' },
            { tipo: 'salmo', icone: '✝️', cor: '#7c3aed', titulo: 'Provérbios 3:5-6', texto: '"Confia no Senhor de todo o teu coração e não te apoies no teu próprio entendimento."' },
            // Dicas do sistema
            { tipo: 'dica', icone: '💡', cor: '#d97706', titulo: 'Dica do Sistema', texto: 'Use o Kanban para visualizar todas as tarefas em andamento de uma vez. Acesse: Módulo → Kanban.' },
            { tipo: 'dica', icone: '💡', cor: '#d97706', titulo: 'Dica do Sistema', texto: 'Ao criar um Briefing, vincule-o a um Cliente e Evento para que o projeto seja gerado automaticamente.' },
            { tipo: 'dica', icone: '💡', cor: '#d97706', titulo: 'Dica do Sistema', texto: 'No módulo Financeiro, use os filtros de período para gerar relatórios mensais de receitas e despesas.' },
            { tipo: 'dica', icone: '💡', cor: '#d97706', titulo: 'Dica do Sistema', texto: 'Você pode buscar qualquer registro digitando no campo de busca no topo de cada módulo.' },
            { tipo: 'dica', icone: '💡', cor: '#d97706', titulo: 'Dica do Sistema', texto: 'Registre os comprovantes de pagamento diretamente em Contas a Receber para manter o histórico completo.' },
            { tipo: 'dica', icone: '💡', cor: '#d97706', titulo: 'Dica do Sistema', texto: 'No módulo Acervo, organize documentos por feira e evento para facilitar consultas futuras.' },
            { tipo: 'dica', icone: '💡', cor: '#d97706', titulo: 'Dica do Sistema', texto: 'Use o módulo Jurídico para registrar demandas e acompanhar prazos contratuais com clientes.' },
            // Lembretes operacionais
            { tipo: 'lembrete', icone: '📌', cor: '#0891b2', titulo: 'Lembrete Operacional', texto: 'Verifique as Contas a Receber vencidas hoje e atualize o status de pagamento.' },
            { tipo: 'lembrete', icone: '📌', cor: '#0891b2', titulo: 'Lembrete Operacional', texto: 'Confira se há Briefings aguardando aprovação no módulo Comercial.' },
            { tipo: 'lembrete', icone: '📌', cor: '#0891b2', titulo: 'Lembrete Operacional', texto: 'Atualize o checklist de montagem dos projetos em andamento no módulo Montagem.' },
            { tipo: 'lembrete', icone: '📌', cor: '#0891b2', titulo: 'Lembrete Operacional', texto: 'Registre os leads captados na última feira no módulo Marketing antes de esfriar o contato.' },
            { tipo: 'lembrete', icone: '📌', cor: '#0891b2', titulo: 'Lembrete Operacional', texto: 'Revise os projetos com prazo próximo no módulo Projetos e comunique a equipe.' },
            // Inspiração
            { tipo: 'inspiracao', icone: '⭐', cor: '#059669', titulo: 'Inspiração', texto: 'Um cliente satisfeito é a melhor estratégia de negócios de todas. — Michael LeBoeuf' },
            { tipo: 'inspiracao', icone: '⭐', cor: '#059669', titulo: 'Inspiração', texto: 'A qualidade nunca é um acidente; é sempre o resultado de um esforço inteligente. — John Ruskin' },
            { tipo: 'inspiracao', icone: '⭐', cor: '#059669', titulo: 'Inspiração', texto: 'Excelência não é uma habilidade, é uma atitude. — Ralph Marston' },
            { tipo: 'inspiracao', icone: '⭐', cor: '#059669', titulo: 'Inspiração', texto: 'O sucesso é a soma de pequenos esforços repetidos dia após dia. — Robert Collier' },
        ];

        // Escolher uma mensagem aleatória do dia (baseada na data para ser consistente)
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
        const msgIdx = dayOfYear % MENSAGENS.length;
        const msg = MENSAGENS[msgIdx];

        // ── Buscar tarefas pendentes ────────────────────────────────────────────
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
        const formatDateBr = (ymd) => {
            if (!ymd) return '—';
            const [y, mo, d] = String(ymd).slice(0, 10).split('-');
            return `${d}/${mo}/${y}`;
        };
        const prLabel = (p) => {
            const v = String(p || '').toLowerCase();
            if (v === 'critica') return '<span style="color:#dc2626;font-weight:600">Crítica</span>';
            if (v === 'alta') return '<span style="color:#ea580c;font-weight:600">Alta</span>';
            if (v === 'media') return '<span style="color:#ca8a04">Média</span>';
            if (v === 'baixa') return '<span style="color:#16a34a">Baixa</span>';
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
            .slice(0, 5);

        // Verificar tarefas vencidas hoje
        const todayStr = today; // AAAA-MM-DD
        const vencidas = top.filter(t => parseDate(t.data_vencimento) && parseDate(t.data_vencimento) <= todayStr);

        let goAction = '';
        try {
            if (typeof window.AuthSystem !== 'undefined' && window.AuthSystem.hasModuleAccess && window.AuthSystem.hasModuleAccess('administrativo')) {
                goAction = "try{FormSystem.closeModal(); NavigationSystem.navigateToModule('administrativo'); NavigationSystem.navigateToPage('administrativo','tarefas');}catch{}";
            } else if (typeof window.AuthSystem !== 'undefined' && window.AuthSystem.hasModuleAccess && window.AuthSystem.hasModuleAccess('kanban')) {
                goAction = "try{FormSystem.closeModal(); NavigationSystem.navigateToModule('kanban'); NavigationSystem.navigateToPage('kanban','tarefas');}catch{}";
            }
        } catch {}

        const content = `
            <div style="font-family:inherit;max-width:600px">
                <!-- Cabeçalho de saudação -->
                <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);border-radius:12px;padding:20px 24px;margin-bottom:16px;color:white">
                    <div style="display:flex;align-items:center;gap:12px">
                        <div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px">
                            ${hour < 12 ? '🌅' : (hour < 18 ? '☀️' : '🌙')}
                        </div>
                        <div>
                            <div style="font-size:18px;font-weight:700">${escapeHtml(saudacao)}, ${escapeHtml(u.name || '')}!</div>
                            <div style="font-size:13px;opacity:0.85;margin-top:2px">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                        </div>
                    </div>
                </div>

                <!-- Mensagem do dia -->
                <div style="background:#f8fafc;border-left:4px solid ${msg.cor};border-radius:8px;padding:14px 16px;margin-bottom:16px">
                    <div style="display:flex;align-items:flex-start;gap:10px">
                        <span style="font-size:20px;line-height:1.3">${msg.icone}</span>
                        <div>
                            <div style="font-size:11px;font-weight:600;color:${msg.cor};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">${escapeHtml(msg.titulo)}</div>
                            <div style="font-size:14px;color:#374151;line-height:1.5;font-style:${msg.tipo === 'salmo' ? 'italic' : 'normal'}">${escapeHtml(msg.texto)}</div>
                        </div>
                    </div>
                </div>

                <!-- Alertas de tarefas vencidas -->
                ${vencidas.length > 0 ? `
                <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:flex-start;gap:10px">
                    <span style="font-size:18px">⚠️</span>
                    <div>
                        <div style="font-size:13px;font-weight:600;color:#dc2626;margin-bottom:4px">${vencidas.length} tarefa${vencidas.length > 1 ? 's' : ''} vencida${vencidas.length > 1 ? 's' : ''} ou com prazo hoje!</div>
                        <div style="font-size:12px;color:#7f1d1d">${vencidas.map(t => escapeHtml(t.titulo || '')).join(', ')}</div>
                    </div>
                </div>
                ` : ''}

                <!-- Tarefas pendentes -->
                <div style="margin-bottom:16px">
                    <div style="font-size:13px;font-weight:600;color:#374151;margin-bottom:8px;display:flex;align-items:center;gap:6px">
                        <span>📋</span> Minhas prioridades do dia
                        ${top.length > 0 ? `<span style="background:#dbeafe;color:#1d4ed8;font-size:11px;padding:2px 8px;border-radius:12px;font-weight:600">${top.length} tarefa${top.length > 1 ? 's' : ''}</span>` : ''}
                    </div>
                    ${top.length ? `
                        <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
                            <table style="width:100%;border-collapse:collapse;font-size:13px">
                                <thead>
                                    <tr style="background:#f9fafb">
                                        <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase">Tarefa</th>
                                        <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase">Prioridade</th>
                                        <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase">Prazo</th>
                                        <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${top.map((t, i) => `
                                        <tr style="border-top:1px solid #f3f4f6;${i % 2 === 1 ? 'background:#fafafa' : ''}">
                                            <td style="padding:8px 12px;color:#111827;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(t.titulo || '')}">${escapeHtml(t.titulo || '')}</td>
                                            <td style="padding:8px 12px">${prLabel(t.prioridade)}</td>
                                            <td style="padding:8px 12px;color:${parseDate(t.data_vencimento) && parseDate(t.data_vencimento) <= todayStr ? '#dc2626' : '#374151'};font-weight:${parseDate(t.data_vencimento) && parseDate(t.data_vencimento) <= todayStr ? '600' : '400'}">${formatDateBr(parseDate(t.data_vencimento))}</td>
                                            <td style="padding:8px 12px;color:#6b7280">${escapeHtml(stLabel(t.status))}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div style="text-align:center;padding:20px;color:#9ca3af;font-size:13px;background:#f9fafb;border-radius:8px;border:1px dashed #e5e7eb">
                            <div style="font-size:24px;margin-bottom:8px">🎉</div>
                            Nenhuma tarefa pendente atribuída a você. Bom trabalho!
                        </div>
                    `}
                </div>

                <!-- Botões de ação -->
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:4px;border-top:1px solid #f3f4f6">
                    <div style="font-size:11px;color:#9ca3af">💬 Precisa de ajuda? Clique no botão <strong>?</strong> no canto inferior direito.</div>
                    <div style="display:flex;gap:8px">
                        ${goAction ? `<button type="button" style="padding:8px 16px;background:#2563eb;color:white;border:none;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer" onclick="${goAction}">📋 Minhas tarefas</button>` : ''}
                        <button type="button" style="padding:8px 16px;background:#f3f4f6;color:#374151;border:none;border-radius:8px;font-size:13px;cursor:pointer" onclick="try{FormSystem.closeModal();}catch{}">Fechar</button>
                    </div>
                </div>
            </div>
        `;

        try {
            if (window.FormSystem && typeof window.FormSystem.openModal === 'function') {
                window.FormSystem.openModal('', content);
                const saveBtn = document.getElementById('modal-save');
                if (saveBtn) saveBtn.classList.add('hidden');
                const cancelBtn = document.getElementById('modal-cancel');
                if (cancelBtn) cancelBtn.classList.add('hidden');
                // Ocultar o título padrão do modal (usamos nosso próprio cabeçalho)
                const modalTitle = document.getElementById('modal-title');
                if (modalTitle) modalTitle.style.display = 'none';
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
            
            if (userRole === 'administrador' || userRole === 'admin' || this.hasModuleAccess(module)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });

        // Módulo de administração apenas para administrador
        const adminModule = document.getElementById('adminModule');
        if (adminModule) {
            if (userRole === 'administrador' || userRole === 'admin') {
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
        if (userRole === 'administrador' || userRole === 'admin') return true;
        
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
        if (userRole === 'administrador' || userRole === 'admin') return true;
        
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
