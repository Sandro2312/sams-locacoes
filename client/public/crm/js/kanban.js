// Sistema Kanban - SAMS Locações CRM/ERP
const KanbanSystem = {
    version: '5.6.10',

    // Configurações
    config: {
        modalId: 'kanban-modal',
        overlayId: 'kanban-overlay',
        boardId: 'kanban-board',
        columns: [
            { id: 'backlog', title: 'Backlog', color: 'bg-gray-100', limit: null },
            { id: 'todo', title: 'A Fazer', color: 'bg-blue-100', limit: 10 },
            { id: 'doing', title: 'Em Andamento', color: 'bg-yellow-100', limit: 5 },
            { id: 'review', title: 'Em Revisão', color: 'bg-purple-100', limit: 3 },
            { id: 'done', title: 'Concluído', color: 'bg-green-100', limit: null }
        ],
        priorities: {
            'baixa': { color: 'bg-green-500', text: 'Baixa' },
            'media': { color: 'bg-yellow-500', text: 'Média' },
            'alta': { color: 'bg-orange-500', text: 'Alta' },
            'critica': { color: 'bg-red-500', text: 'Crítica' }
        }
    },

    // Estado atual
    currentBoard: null,
    draggedCard: null,
    activeDropColumn: null,
    modalSaveHandler: null,
    initialized: false,
    _serverUsers: [],
    _serverUsersLoadedAt: 0,
    _serverUsersLoading: null,
    _showAutoCache: null,

    // Inicialização
    init() {
        if (this.initialized) return;
        this.createModalStructure();
        this.bindEvents();
        this.initializeData();
        this.initialized = true;
    },

    // Inicializar dados do Kanban
    initializeData() {
        if (typeof ModuleSystem === 'undefined' || !ModuleSystem.data) return;

        const created = !ModuleSystem.data.kanban;
        if (!ModuleSystem.data.kanban || typeof ModuleSystem.data.kanban !== 'object') {
            ModuleSystem.data.kanban = { boards: [], tasks: [] };
        }

        this.normalizeKanbanData(false);
    },

    getCurrentUser() {
        try {
            if (window.AuthSystem && typeof window.AuthSystem.getCurrentUser === 'function') {
                return window.AuthSystem.getCurrentUser() || null;
            }
            return (window.AuthSystem && window.AuthSystem.currentUser) || null;
        } catch {
            return null;
        }
    },

    async ensureServerUsersLoaded(force = false) {
        const ttlMs = 5 * 60 * 1000;
        const now = Date.now();
        if (!force && Array.isArray(this._serverUsers) && this._serverUsers.length && (now - (this._serverUsersLoadedAt || 0) < ttlMs)) {
            return this._serverUsers;
        }
        if (this._serverUsersLoading) return this._serverUsersLoading;

        this._serverUsersLoading = (async () => {
            try {
                const resp = await fetch('/api/crm/users', {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'Accept': 'application/json' }
                });
                if (!resp || !resp.ok) return this._serverUsers;
                const rows = await resp.json().catch(() => null);
                if (!Array.isArray(rows)) return this._serverUsers;
                this._serverUsers = rows
                    .filter(u => u && u.id != null)
                    .map(u => ({
                        id: String(u.id),
                        name: u.name != null ? String(u.name) : '',
                        email: u.email != null ? String(u.email) : '',
                        role: u.role != null ? String(u.role) : ''
                    }));
                this._serverUsersLoadedAt = Date.now();
            } catch {}
            return this._serverUsers;
        })().finally(() => {
            this._serverUsersLoading = null;
        });

        return this._serverUsersLoading;
    },

    openUsersAdminFromTask() {
        try { this.closeModal(); } catch {}
        try {
            if (window.NavigationSystem && typeof window.NavigationSystem.navigateToModule === 'function') {
                window.NavigationSystem.navigateToModule('administracao');
                if (typeof window.NavigationSystem.navigateToPage === 'function') {
                    window.NavigationSystem.navigateToPage('administracao', 'usuarios');
                }
                return;
            }
        } catch {}
        try { window.location.href = '/configuracoes.html?view=users'; } catch {}
    },

    getUserRank(user = null) {
        const normalize = (v) => (v != null ? String(v).trim().toLowerCase() : '');
        const rankFromAuthRole = (role) => {
            const r = normalize(role);
            if (r === 'administrador' || r === 'admin') return 3;
            if (r === 'gerencia' || r === 'gerente' || r === 'gestor') return 2;
            return r ? 1 : 0;
        };
        const rankFromNivelAcesso = (nivel) => {
            const n = normalize(nivel);
            if (n === 'admin' || n === 'administrador') return 3;
            if (n === 'gestor' || n === 'gerente' || n === 'gerência' || n === 'gerencia') return 2;
            if (n === 'usuário' || n === 'usuario') return 1;
            return n ? 1 : 0;
        };

        const u = user || this.getCurrentUser();
        if (!u) return 0;

        const authRank = rankFromAuthRole(u.role);
        let moduleRank = 0;
        try {
            const email = normalize(u.email);
            const modUser = email && ModuleSystem?.data?.usuarios
                ? ModuleSystem.data.usuarios.find(x => normalize(x?.email) === email)
                : null;
            if (modUser) moduleRank = rankFromNivelAcesso(modUser.nivel_acesso);
        } catch {}

        return Math.max(authRank, moduleRank);
    },

    isAdminOrManager(user = null) {
        return this.getUserRank(user) >= 2;
    },

    isAdmin(user = null) {
        return this.getUserRank(user) >= 3;
    },

    getKnownUsers() {
        const normalize = (v) => (v != null ? String(v).trim().toLowerCase() : '');
        const rankOf = (record) => {
            const role = normalize(record?.role);
            const nivel = normalize(record?.nivel_acesso);
            if (role === 'administrador' || role === 'admin' || nivel === 'admin' || nivel === 'administrador') return 3;
            if (role === 'gerencia' || role === 'gerente' || role === 'gestor' || nivel === 'gestor' || nivel === 'gerente' || nivel === 'gerência' || nivel === 'gerencia') return 2;
            return (role || nivel) ? 1 : 0;
        };

        const out = [];
        const serverIdSet = new Set();

        try {
            const serverUsers = Array.isArray(this._serverUsers) ? this._serverUsers : [];
            for (const u of serverUsers) {
                if (!u || u.id == null) continue;
                serverIdSet.add(String(u.id));
                out.push({
                    id: String(u.id),
                    name: u.name != null ? String(u.name) : '',
                    email: u.email != null ? String(u.email) : '',
                    role: u.role != null ? String(u.role) : '',
                    nivel_acesso: u.role != null ? String(u.role) : '',
                    _rank: rankOf(u)
                });
            }
        } catch {}

        try {
            const modUsers = Array.isArray(ModuleSystem?.data?.usuarios) ? ModuleSystem.data.usuarios : [];
            for (const u of modUsers) {
                if (!u || u.id == null) continue;
                const email = u.email != null ? String(u.email) : '';
                const hasEmail = !!normalize(email);
                if (!hasEmail) continue;
                out.push({
                    id: String(u.id),
                    name: u.nome != null ? String(u.nome) : '',
                    email: u.email != null ? String(u.email) : '',
                    role: u.nivel_acesso != null ? String(u.nivel_acesso) : '',
                    nivel_acesso: u.nivel_acesso != null ? String(u.nivel_acesso) : '',
                    _rank: rankOf(u)
                });
            }
        } catch {}

        try {
            if (window.AuthSystem && window.AuthSystem.users && typeof window.AuthSystem.users === 'object') {
                for (const u of Object.values(window.AuthSystem.users)) {
                    if (!u || u.id == null) continue;
                    const email = u.email != null ? String(u.email) : '';
                    const hasEmail = !!normalize(email);
                    if (!hasEmail) continue;
                    out.push({
                        id: String(u.id),
                        name: u.name != null ? String(u.name) : '',
                        email: u.email != null ? String(u.email) : '',
                        role: u.role != null ? String(u.role) : '',
                        nivel_acesso: u.role != null ? String(u.role) : '',
                        _rank: rankOf(u)
                    });
                }
            }
        } catch {}

        const dedup = new Map();
        for (const u of out) {
            const emailKey = normalize(u.email);
            const key = emailKey || `id:${String(u.id)}`;
            const existing = dedup.get(key);
            if (!existing) {
                dedup.set(key, u);
                continue;
            }
            if ((u._rank || 0) > (existing._rank || 0)) {
                dedup.set(key, u);
                continue;
            }
            if ((!existing.name && u.name) || (!existing.email && u.email)) {
                dedup.set(key, { ...existing, ...u });
            }
        }

        const users = Array.from(dedup.values())
            .filter(u => u && (u.name || u.email))
            .map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, nivel_acesso: u.nivel_acesso, _rank: u._rank }));

        const current = this.getCurrentUser();
        if (current && current.id != null) {
            const currentId = String(current.id);
            const existing = users.find(u => String(u.id) === currentId) || users.find(u => normalize(u.email) && normalize(u.email) === normalize(current.email));
            if (!existing) {
                users.push({
                    id: currentId,
                    name: current.name != null ? String(current.name) : '',
                    email: current.email != null ? String(current.email) : '',
                    role: current.role != null ? String(current.role) : '',
                    nivel_acesso: current.role != null ? String(current.role) : '',
                    _rank: this.getUserRank(current)
                });
            }
        }
        users.sort((a, b) => String(a.name || a.email || a.id).localeCompare(String(b.name || b.email || b.id), 'pt-BR'));
        return users;
    },

    getAssignableUsers() {
        const current = this.getCurrentUser();
        const users = this.getKnownUsers();
        if (!current || current.id == null) return users;

        const rank = this.getUserRank(current);
        if (rank >= 3) return users;

        if (rank === 2) {
            return users.filter(u => (u && typeof u._rank === 'number' ? u._rank : 1) <= 2);
        }

        const currentId = String(current.id);
        const normalize = (v) => (v != null ? String(v).trim().toLowerCase() : '');
        const self =
            users.find(u => String(u.id) === currentId) ||
            users.find(u => normalize(u.email) && normalize(current.email) && normalize(u.email) === normalize(current.email));
        return self ? [self] : [{
            id: currentId,
            name: current.name != null ? String(current.name) : '',
            email: current.email != null ? String(current.email) : '',
            role: current.role != null ? String(current.role) : '',
            nivel_acesso: current.role != null ? String(current.role) : '',
            _rank: rank
        }];
    },

    resolveUserById(userId) {
        if (userId == null) return null;
        const id = String(userId);
        return this.getKnownUsers().find(u => u && String(u.id) === id) || null;
    },

    resolveUserByName(name) {
        const n = name != null ? String(name).trim().toLowerCase() : '';
        if (!n) return null;
        return this.getKnownUsers().find(u => {
            const uName = u && u.name != null ? String(u.name).trim().toLowerCase() : '';
            const uEmail = u && u.email != null ? String(u.email).trim().toLowerCase() : '';
            return uName === n || uEmail === n;
        }) || null;
    },

    applyAccessToAssignees(data) {
        const current = this.getCurrentUser();
        if (!current || current.id == null) return data;

        const rank = this.getUserRank(current);
        const isManager = rank >= 2;
        const currentId = String(current.id);
        const currentName = current.name != null ? String(current.name) : '';

        if (!isManager) {
            data.responsavelId = currentId;
            data.responsavel = currentName;
            data.envolvidosIds = [currentId];
            data.envolvidos = currentName ? [currentName] : [];
            return data;
        }

        const assignable = this.getAssignableUsers();
        const allowedIds = new Set(assignable.map(u => String(u.id)));
        const uniqByLower = (items) => {
            const out = [];
            const seen = new Set();
            for (const raw of (Array.isArray(items) ? items : [])) {
                const s = raw != null ? String(raw).trim() : '';
                if (!s) continue;
                const k = s.toLowerCase();
                if (seen.has(k)) continue;
                seen.add(k);
                out.push(s);
            }
            return out;
        };

        const respId = data.responsavelId != null ? String(data.responsavelId) : '';
        if (respId && allowedIds.has(respId)) {
            const u = assignable.find(x => String(x.id) === respId) || null;
            data.responsavel = u && u.name ? u.name : data.responsavel;
        } else if (data.responsavel) {
            const rawName = data.responsavel != null ? String(data.responsavel).trim() : '';
            const u = rawName ? this.resolveUserByName(rawName) : null;
            if (u && allowedIds.has(String(u.id))) {
                data.responsavelId = String(u.id);
                data.responsavel = u.name;
            } else {
                data.responsavelId = null;
                data.responsavel = rawName;
            }
        } else if (currentId) {
            data.responsavelId = currentId;
            data.responsavel = currentName;
        }

        const extrasRaw = [
            ...(Array.isArray(data.envolvidosExtras) ? data.envolvidosExtras : []),
            ...(Array.isArray(data.envolvidos) ? data.envolvidos : [])
        ];
        const extras = uniqByLower(extrasRaw);

        const involvedIdsRaw = Array.isArray(data.envolvidosIds) ? data.envolvidosIds : [];
        const involvedIds = involvedIdsRaw.map(x => String(x)).filter(id => allowedIds.has(id));
        data.envolvidosIds = involvedIds;
        const envolvidosFromIds = involvedIds
            .map(id => assignable.find(u => String(u.id) === id))
            .filter(Boolean)
            .map(u => u.name)
            .filter(Boolean);
        const selectedNames = new Set(envolvidosFromIds.map(s => String(s).trim().toLowerCase()).filter(Boolean));
        const extrasFiltered = extras.filter(s => !selectedNames.has(String(s).trim().toLowerCase()));
        data.envolvidos = [...envolvidosFromIds, ...extrasFiltered];

        return data;
    },

    normalizeKanbanData(allowSeed = false) {
        if (!ModuleSystem?.data) return;

        const kb = ModuleSystem.data.kanban;
        if (!kb || typeof kb !== 'object') return;

        let changed = false;

        if (!Array.isArray(kb.boards)) {
            if (Array.isArray(kb.quadros)) {
                kb.boards = kb.quadros;
            } else {
                kb.boards = [];
            }
            changed = true;
        }

        if (!Array.isArray(kb.tasks)) {
            if (Array.isArray(kb.cards)) {
                kb.tasks = kb.cards;
            } else if (Array.isArray(kb.tarefas)) {
                kb.tasks = kb.tarefas;
            } else {
                kb.tasks = [];
            }
            changed = true;
        }

        if (kb.boards.length === 0) {
            const nowIso = new Date().toISOString();
            kb.boards.push({
                id: Utils.generateId(),
                nome: 'Projetos SAMS',
                descricao: 'Gestão de tarefas dos projetos',
                dataCriacao: nowIso,
                ativo: true
            });
            changed = true;
        }

        const firstBoardId = kb.boards[0] && kb.boards[0].id != null ? String(kb.boards[0].id) : null;
        const hasCurrent = this.currentBoard != null && kb.boards.some(b => b && String(b.id) === String(this.currentBoard));
        if (!hasCurrent) {
            this.currentBoard = firstBoardId;
        }

        const validBoardIds = new Set(kb.boards.filter(b => b && b.id != null).map(b => String(b.id)));
        const fallbackBoardId = this.currentBoard != null ? String(this.currentBoard) : firstBoardId;

        for (const t of kb.tasks) {
            if (!t || typeof t !== 'object') continue;

            if (t.id == null) {
                t.id = Utils.generateId();
                changed = true;
            }

            if (!t.titulo) {
                const v = t.title || t.nome || t.name;
                if (v) {
                    t.titulo = String(v);
                    changed = true;
                }
            }

            if (!t.descricao && t.description) {
                t.descricao = String(t.description);
                changed = true;
            }

            if (!t.status) {
                const v = t.column || t.lista;
                if (v) {
                    t.status = String(v);
                    changed = true;
                }
            }

            if (!t.prioridade && t.priority) {
                t.prioridade = String(t.priority);
                changed = true;
            }

            if (!t.dataCriacao && t.createdAt) {
                t.dataCriacao = String(t.createdAt);
                changed = true;
            }

            if (!t.dataAtualizacao && t.updatedAt) {
                t.dataAtualizacao = String(t.updatedAt);
                changed = true;
            }

            if (t.tags && !Array.isArray(t.tags)) {
                if (typeof t.tags === 'string') {
                    t.tags = String(t.tags).split(',').map(s => s.trim()).filter(Boolean);
                } else if (Array.isArray(t.labels)) {
                    t.tags = t.labels.map(x => String(x)).filter(Boolean);
                } else {
                    t.tags = [];
                }
                changed = true;
            } else if (!t.tags && Array.isArray(t.labels)) {
                t.tags = t.labels.map(x => String(x)).filter(Boolean);
                changed = true;
            }

            const boardId = t.boardId != null ? String(t.boardId) : '';
            if (!boardId || !validBoardIds.has(boardId)) {
                if (fallbackBoardId) {
                    t.boardId = fallbackBoardId;
                    changed = true;
                }
            }

            if (!t.status) {
                t.status = 'todo';
                changed = true;
            }

            if (!t.prioridade) {
                t.prioridade = 'media';
                changed = true;
            }
        }

        if (allowSeed && kb.tasks.length === 0) {
            const boardId = fallbackBoardId || (kb.boards[0] && kb.boards[0].id) || Utils.generateId();
            const exampleTasks = [
                {
                    id: Utils.generateId(),
                    boardId,
                    titulo: 'Desenvolver conceito do stand',
                    descricao: 'Criar o conceito visual e funcional do stand para o cliente ABC',
                    status: 'todo',
                    prioridade: 'alta',
                    responsavel: 'João Silva',
                    dataVencimento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    tags: ['design', 'conceito'],
                    dataCriacao: new Date().toISOString()
                },
                {
                    id: Utils.generateId(),
                    boardId,
                    titulo: 'Aprovação do orçamento',
                    descricao: 'Aguardando aprovação do cliente para o orçamento enviado',
                    status: 'review',
                    prioridade: 'media',
                    responsavel: 'Maria Santos',
                    dataVencimento: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    tags: ['comercial', 'orçamento'],
                    dataCriacao: new Date().toISOString()
                }
            ];
            kb.tasks.push(...exampleTasks);
            changed = true;
        }

        if (changed) {
            try { ModuleSystem.saveData(); } catch {}
        }
    },

    // Criar estrutura do modal
    createModalStructure() {
        const existingModal = document.getElementById(this.config.modalId);
        if (existingModal) {
            existingModal.remove();
        }

        const modalHTML = `
            <div id="${this.config.overlayId}" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden overflow-y-auto">
                <div id="${this.config.modalId}" class="min-h-screen flex items-center justify-center p-4">
                    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full" style="max-height: 90vh; display: flex; flex-direction: column;">
                        <div class="flex justify-between items-center p-6 border-b border-gray-200">
                            <h2 id="kanban-title" class="text-xl font-semibold text-gray-800">Tarefa</h2>
                            <button id="kanban-close" class="text-gray-400 hover:text-gray-600 transition duration-300"
                                    title="Fechar modal"
                                    aria-label="Fechar modal">
                                <i class="fas fa-times text-xl" aria-hidden="true"></i>
                            </button>
                        </div>
                        <div id="kanban-content" class="p-6 overflow-y-auto" style="flex: 1 1 auto;">
                            <!-- Conteúdo será inserido aqui -->
                        </div>
                        <div class="flex justify-end space-x-3 p-6 border-t border-gray-200" style="flex: 0 0 auto;">
                            <button id="kanban-dashboard" class="px-4 py-2 text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition duration-300">
                                <i class="fas fa-home mr-2"></i>
                                Voltar ao Dashboard
                            </button>
                            <button id="kanban-cancel" class="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-300">
                                Cancelar
                            </button>
                            <button id="kanban-save" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300">
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    // Vincular eventos
    bindEvents() {
        const overlay = document.getElementById(this.config.overlayId);
        const closeBtn = document.getElementById('kanban-close');
        const cancelBtn = document.getElementById('kanban-cancel');
        const saveBtn = document.getElementById('kanban-save');
        const dashboardBtn = document.getElementById('kanban-dashboard');

        [overlay, closeBtn, cancelBtn].forEach(element => {
            element?.addEventListener('click', (e) => {
                if (e.target === overlay || e.target === closeBtn || e.target === cancelBtn) {
                    this.closeModal();
                }
            });
        });

        saveBtn?.addEventListener('click', () => {
            if (typeof this.modalSaveHandler === 'function') {
                try {
                    const out = this.modalSaveHandler();
                    if (out && typeof out.then === 'function') {
                        out.catch((e) => {
                            try { Utils.notifications.error(e && e.message ? e.message : 'Erro ao salvar.'); } catch {}
                        });
                    }
                } catch (e) {
                    try { Utils.notifications.error(e && e.message ? e.message : 'Erro ao salvar.'); } catch {}
                }
            } else {
                try {
                    const out = this.saveTask();
                    if (out && typeof out.then === 'function') {
                        out.catch((e) => {
                            try { Utils.notifications.error(e && e.message ? e.message : 'Erro ao salvar.'); } catch {}
                        });
                    }
                } catch (e) {
                    try { Utils.notifications.error(e && e.message ? e.message : 'Erro ao salvar.'); } catch {}
                }
            }
        });

        dashboardBtn?.addEventListener('click', () => {
            this.closeModal();
            if (window.NavigationSystem && typeof window.NavigationSystem.navigateToModule === 'function') {
                window.NavigationSystem.navigateToModule('dashboard');
            } else {
                console.warn('[KanbanSystem] NavigationSystem não disponível.');
            }
        });

        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            // Só processar ESC se não estivermos em um campo de input
            if (e.key === 'Escape' && !e.target.matches('input, textarea, select') && !document.getElementById(this.config.overlayId).classList.contains('hidden')) {
                this.closeModal();
            }
        });
    },

    // Abrir modal
    openModal(title, content) {
        const overlay = document.getElementById(this.config.overlayId);
        const modalTitle = document.getElementById('kanban-title');
        const modalContent = document.getElementById('kanban-content');

        modalTitle.textContent = title;
        modalContent.innerHTML = content;
        overlay.classList.remove('hidden');
        
        // Focar no primeiro input
        setTimeout(() => {
            const firstInput = modalContent.querySelector('input, select, textarea');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    },

    // Fechar modal
    closeModal() {
        const overlay = document.getElementById(this.config.overlayId);
        overlay.classList.add('hidden');
        this.modalSaveHandler = null;
    },

    // Renderizar board Kanban
    renderBoard() {
        const boardContainer = document.getElementById(this.config.boardId);
        if (!boardContainer) return;

        const tasksAll = this.getTasksByBoard(this.currentBoard);
        const boards = this.getBoards();
        const currentBoard = boards.find(b => b && b.id === this.currentBoard) || boards[0] || null;
        const showAuto = this.getShowAutoTasks();
        const tasks = showAuto ? tasksAll : tasksAll.filter(t => !this.isAutoTask(t));
        
        const boardHTML = `
            <div class="rounded-xl bg-sky-600 p-4">
                <div class="kanban-header mb-4">
                    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 class="text-2xl font-bold text-white">Kanban <span class="ml-2 text-xs font-normal text-sky-100 opacity-80">v${this.version}</span></h2>
                            <div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                                <select id="kanban-board-select"
                                        class="w-full sm:w-auto px-3 py-2 rounded-lg bg-white text-gray-800 text-sm focus:ring-2 focus:ring-sky-200"
                                        onchange="KanbanSystem.setCurrentBoard(this.value)">
                                    ${boards.map(b => `
                                        <option value="${this.escapeHtml(b.id)}" ${b.id === this.currentBoard ? 'selected' : ''}>${this.escapeHtml(b.nome)}</option>
                                    `).join('')}
                                </select>
                                <span class="text-sky-100 text-sm">${currentBoard?.descricao ? this.escapeHtml(currentBoard.descricao) : 'Gestão visual de tarefas e projetos'}</span>
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <label class="flex items-center gap-2 px-3 py-2 bg-white rounded-lg text-sky-700 text-sm">
                                <input id="kanban-show-auto" type="checkbox" class="rounded border-gray-300 text-sky-700 focus:ring-sky-500" ${showAuto ? 'checked' : ''}>
                                <span>Mostrar automáticas</span>
                            </label>
                            <button id="kanban-clear-auto" class="px-4 py-2 bg-white text-sky-700 rounded-lg hover:bg-sky-50 transition duration-300">
                                <i class="fas fa-broom mr-2"></i>Limpar automáticas
                            </button>
                            <button onclick="KanbanSystem.showTaskForm()" class="px-4 py-2 bg-white text-sky-700 rounded-lg hover:bg-sky-50 transition duration-300">
                                <i class="fas fa-plus mr-2"></i>Nova Tarefa
                            </button>
                            <button onclick="KanbanSystem.showBoardForm()" class="px-4 py-2 bg-sky-700 text-white rounded-lg hover:bg-sky-800 transition duration-300">
                                <i class="fas fa-columns mr-2"></i>Novo Quadro
                            </button>
                            <button onclick="KanbanSystem.showBoardSettings()" class="px-4 py-2 bg-sky-700 text-white rounded-lg hover:bg-sky-800 transition duration-300">
                                <i class="fas fa-cog mr-2"></i>Configurações
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="kanban-columns flex gap-3 overflow-x-auto pb-2">
                    ${this.config.columns.map(column => this.renderColumn(column, tasks)).join('')}
                </div>
            </div>
        `;

        boardContainer.innerHTML = boardHTML;
        try {
            const chk = document.getElementById('kanban-show-auto');
            if (chk) {
                chk.addEventListener('change', () => {
                    this.setShowAutoTasks(!!chk.checked);
                    this.renderBoard();
                });
            }
            const clearBtn = document.getElementById('kanban-clear-auto');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => this.clearAutoTasks());
            }
        } catch {}
        this.bindDragEvents();
    },

    getShowAutoTasks() {
        if (this._showAutoCache != null) return !!this._showAutoCache;
        let enabled = false;
        try {
            const raw = window.localStorage ? window.localStorage.getItem('kanban_show_auto_tasks') : '';
            enabled = raw === '1' || raw === 'true';
        } catch {}
        this._showAutoCache = enabled;
        return enabled;
    },

    setShowAutoTasks(enabled) {
        const val = !!enabled;
        this._showAutoCache = val;
        try {
            if (window.localStorage) window.localStorage.setItem('kanban_show_auto_tasks', val ? '1' : '0');
        } catch {}
    },

    isAutoTask(task) {
        try {
            if (!task) return false;
            const tags = Array.isArray(task.tags) ? task.tags.map(t => String(t).trim().toLowerCase()).filter(Boolean) : [];
            if (!tags.length) return false;
            const hasBriefing = tags.includes('briefing') || tags.some(t => t.startsWith('briefing:'));
            if (!hasBriefing) return false;
            const hasPipeline = tags.includes('3d') || tags.includes('orçamento') || tags.includes('orcamento') || tags.includes('checklist') || tags.includes('aprovação') || tags.includes('aprovacao');
            if (hasPipeline) return true;
            const title = task.titulo != null ? String(task.titulo).toLowerCase() : '';
            if (title.includes('(#') && title.includes(')')) return true;
            return true;
        } catch {
            return false;
        }
    },

    clearAutoTasks() {
        try {
            if (!window.ModuleSystem || !ModuleSystem.data) return;
            if (!ModuleSystem.data.kanban || !Array.isArray(ModuleSystem.data.kanban.tasks)) return;
            const total = ModuleSystem.data.kanban.tasks.length;
            const remaining = ModuleSystem.data.kanban.tasks.filter(t => !this.isAutoTask(t));
            const removed = total - remaining.length;
            if (!removed) {
                if (window.Utils && Utils.notifications && typeof Utils.notifications.info === 'function') {
                    Utils.notifications.info('Nenhuma tarefa automática encontrada.');
                }
                return;
            }
            if (!confirm(`Remover ${removed} tarefa(s) automática(s) do quadro?\n\nIsso não afeta briefings, apenas o Kanban.`)) return;
            ModuleSystem.data.kanban.tasks = remaining;
            try { ModuleSystem.saveData(); } catch {}
            if (window.Utils && Utils.notifications && typeof Utils.notifications.success === 'function') {
                Utils.notifications.success('Tarefas automáticas removidas do Kanban.');
            }
            this.renderBoard();
        } catch {}
    },

    // Renderizar coluna
    renderColumn(column, tasks) {
        const columnTasks = this.sortTasks(tasks.filter(task => task.status === column.id));
        const isOverLimit = column.limit && columnTasks.length > column.limit;
        
        return `
            <div class="kanban-column bg-gray-100 rounded-xl p-2 w-72 flex-shrink-0" data-column="${column.id}">
                <div class="column-header px-2 py-2">
                    <div class="flex items-center justify-between gap-2">
                        <h3 class="font-semibold text-gray-800 text-sm">${column.title}</h3>
                        <div class="flex items-center gap-1">
                            <span class="text-xs bg-gray-200 text-gray-700 rounded-full px-2 py-0.5">${columnTasks.length}</span>
                            ${column.limit ? `
                                <span class="text-xs rounded-full px-2 py-0.5 ${isOverLimit ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-600'}">
                                    ${columnTasks.length}/${column.limit}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="column-content space-y-2 px-1 pb-1 min-h-24 max-h-[70vh] overflow-y-auto" data-column="${column.id}">
                    ${columnTasks.map(task => this.renderTask(task)).join('')}
                </div>
                
                ${column.id !== 'done' ? `
                    <div class="px-1 pb-1">
                        <div class="kanban-composer hidden" data-composer="${column.id}">
                            <textarea rows="3"
                                      class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                                      placeholder="Digite um título para este cartão..."
                                      onkeydown="KanbanSystem.handleComposerKey(event, '${column.id}')"></textarea>
                            <div class="mt-2 flex items-center gap-2">
                                <button type="button"
                                        onclick="KanbanSystem.submitCardComposer('${column.id}')"
                                        class="px-3 py-2 bg-sky-700 text-white rounded-lg hover:bg-sky-800 transition duration-300 text-sm">
                                    Adicionar cartão
                                </button>
                                <button type="button"
                                        onclick="KanbanSystem.closeCardComposer('${column.id}')"
                                        class="px-3 py-2 text-gray-600 rounded-lg hover:bg-gray-200 transition duration-300 text-sm"
                                        aria-label="Cancelar">
                                    <i class="fas fa-times" aria-hidden="true"></i>
                                </button>
                                <button type="button"
                                        onclick="KanbanSystem.showTaskForm('${column.id}')"
                                        class="ml-auto px-3 py-2 text-gray-600 rounded-lg hover:bg-gray-200 transition duration-300 text-sm">
                                    Mais opções
                                </button>
                            </div>
                        </div>
                        <button type="button"
                                onclick="KanbanSystem.openCardComposer('${column.id}')"
                                class="kanban-add-btn w-full mt-2 px-2 py-2 rounded-lg text-left text-sm text-gray-600 hover:bg-gray-200 transition duration-300"
                                data-add-btn="${column.id}">
                            <i class="fas fa-plus mr-2"></i>Adicionar um cartão
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    },

    // Renderizar tarefa
    renderTask(task) {
        const priority = this.config.priorities[task.prioridade] || this.config.priorities.media;
        const due = task.dataVencimento ? new Date(`${task.dataVencimento}T23:59:59`) : null;
        const isOverdue = Boolean(due && due.getTime && !Number.isNaN(due.getTime()) && due < new Date() && task.status !== 'done');
        
        return `
            <div class="task-card group bg-white rounded-lg p-3 shadow-sm border border-gray-200 cursor-pointer hover:bg-gray-50 hover:shadow-md transition duration-300" 
                 data-task-id="${task.id}" draggable="true">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="inline-block h-2 w-10 ${priority.color} rounded-full"></span>
                        <span class="text-xs font-medium text-gray-500 truncate">${priority.text}</span>
                    </div>
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition duration-300">
                        <button onclick="KanbanSystem.showTaskForm(null, '${task.id}')" class="text-gray-400 hover:text-sky-700 transition duration-300">
                            <i class="fas fa-edit text-xs"></i>
                        </button>
                        <button onclick="KanbanSystem.deleteTask('${task.id}')" class="text-gray-400 hover:text-red-600 transition duration-300">
                            <i class="fas fa-trash text-xs"></i>
                        </button>
                    </div>
                </div>
                
                <h4 class="font-medium text-gray-800 mb-2 line-clamp-2 text-sm">${task.titulo}</h4>
                
                ${task.descricao ? `
                    <p class="text-xs text-gray-600 mb-3 line-clamp-2">${task.descricao}</p>
                ` : ''}
                
                ${task.tags && task.tags.length > 0 ? `
                    <div class="flex flex-wrap gap-1 mb-3">
                        ${task.tags.map(tag => `
                            <span class="text-[11px] px-2 py-0.5 bg-sky-100 text-sky-800 rounded-full">${tag}</span>
                        `).join('')}
                    </div>
                ` : ''}
                
                <div class="flex justify-between items-center text-xs text-gray-500">
                    <span class="flex items-center">
                        <i class="fas fa-user mr-1"></i>
                        ${task.responsavel || 'Não atribuído'}
                    </span>
                    ${task.dataVencimento ? `
                        <span class="flex items-center ${isOverdue ? 'text-red-600 font-medium' : ''}">
                            <i class="fas fa-calendar mr-1"></i>
                            ${Utils.formatters.formatDate(task.dataVencimento)}
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    },

    sortTasks(tasks) {
        const prio = { critica: 0, alta: 1, media: 2, baixa: 3 };
        return (Array.isArray(tasks) ? [...tasks] : []).sort((a, b) => {
            const ad = a && a.dataVencimento ? String(a.dataVencimento) : '';
            const bd = b && b.dataVencimento ? String(b.dataVencimento) : '';
            if (ad && bd && ad !== bd) return ad.localeCompare(bd);
            if (ad && !bd) return -1;
            if (!ad && bd) return 1;

            const ap = prio[(a && a.prioridade) ? String(a.prioridade) : ''] ?? 99;
            const bp = prio[(b && b.prioridade) ? String(b.prioridade) : ''] ?? 99;
            if (ap !== bp) return ap - bp;

            const ac = a && a.dataCriacao ? String(a.dataCriacao) : '';
            const bc = b && b.dataCriacao ? String(b.dataCriacao) : '';
            return ac.localeCompare(bc);
        });
    },

    openCardComposer(columnId) {
        const col = document.querySelector(`.kanban-column[data-column="${columnId}"]`);
        if (!col) return;
        const composer = col.querySelector(`.kanban-composer[data-composer="${columnId}"]`);
        const btn = col.querySelector(`.kanban-add-btn[data-add-btn="${columnId}"]`);
        if (!composer || !btn) return;

        btn.classList.add('hidden');
        composer.classList.remove('hidden');

        const textarea = composer.querySelector('textarea');
        if (textarea) {
            textarea.value = '';
            setTimeout(() => {
                try { textarea.focus(); } catch {}
            }, 0);
        }
    },

    closeCardComposer(columnId) {
        const col = document.querySelector(`.kanban-column[data-column="${columnId}"]`);
        if (!col) return;
        const composer = col.querySelector(`.kanban-composer[data-composer="${columnId}"]`);
        const btn = col.querySelector(`.kanban-add-btn[data-add-btn="${columnId}"]`);
        if (!composer || !btn) return;

        composer.classList.add('hidden');
        btn.classList.remove('hidden');

        const textarea = composer.querySelector('textarea');
        if (textarea) textarea.value = '';
    },

    handleComposerKey(e, columnId) {
        if (!e) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            this.closeCardComposer(columnId);
            return;
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.submitCardComposer(columnId);
        }
    },

    submitCardComposer(columnId) {
        const col = document.querySelector(`.kanban-column[data-column="${columnId}"]`);
        if (!col) return;
        const composer = col.querySelector(`.kanban-composer[data-composer="${columnId}"]`);
        if (!composer) return;
        const textarea = composer.querySelector('textarea');
        const titulo = textarea ? String(textarea.value || '').trim() : '';
        if (!titulo) {
            if (textarea) {
                try { textarea.focus(); } catch {}
            }
            if (window.Utils && Utils.notifications && typeof Utils.notifications.error === 'function') {
                Utils.notifications.error('Digite um título para o cartão.');
            }
            return;
        }

        try {
            if (!ModuleSystem.data.kanban) ModuleSystem.data.kanban = { boards: [], tasks: [] };
            if (!Array.isArray(ModuleSystem.data.kanban.tasks)) ModuleSystem.data.kanban.tasks = [];

            const nowIso = new Date().toISOString();
            const task = {
                id: Utils.generateId(),
                boardId: this.currentBoard,
                titulo,
                descricao: '',
                status: columnId,
                prioridade: 'media',
                responsavel: '',
                dataVencimento: '',
                tags: [],
                dataCriacao: nowIso,
                dataAtualizacao: nowIso
            };

            ModuleSystem.data.kanban.tasks.push(task);
            ModuleSystem.saveData();
            if (window.Utils && Utils.notifications && typeof Utils.notifications.success === 'function') {
                Utils.notifications.success('Cartão criado!');
            }
            this.renderBoard();
        } catch (error) {
            if (window.Utils && Utils.notifications && typeof Utils.notifications.error === 'function') {
                Utils.notifications.error('Erro ao criar cartão: ' + (error && error.message ? error.message : ''));
            }
        }
    },

    getBoards() {
        if (!window.ModuleSystem || !ModuleSystem.data) return [];
        if (!ModuleSystem.data.kanban) ModuleSystem.data.kanban = { boards: [], tasks: [] };
        if (!Array.isArray(ModuleSystem.data.kanban.boards)) ModuleSystem.data.kanban.boards = [];
        if (ModuleSystem.data.kanban.boards.length === 0) {
            const nowIso = new Date().toISOString();
            ModuleSystem.data.kanban.boards.push({
                id: Utils.generateId(),
                nome: 'Projetos SAMS',
                descricao: 'Gestão de tarefas dos projetos',
                dataCriacao: nowIso,
                ativo: true
            });
            ModuleSystem.saveData();
        }
        if (!this.currentBoard) this.currentBoard = ModuleSystem.data.kanban.boards[0].id;
        return ModuleSystem.data.kanban.boards.filter(b => b && b.id != null);
    },

    setCurrentBoard(boardId) {
        const id = boardId != null ? String(boardId) : '';
        const boards = this.getBoards();
        const exists = boards.some(b => String(b.id) === id);
        if (!exists) return;
        this.currentBoard = id;
        try { ModuleSystem.saveData(); } catch {}
        this.renderBoard();
    },

    escapeHtml(value) {
        const s = value == null ? '' : String(value);
        return s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    // Obter tarefas por board
    getTasksByBoard(boardId) {
        return ModuleSystem.data.kanban?.tasks?.filter(task => task.boardId === boardId) || [];
    },

    // Gerar formulário de tarefa
    generateTaskForm(task = null, defaultStatus = 'todo') {
        const isEdit = task !== null;
        const status = task?.status || defaultStatus;
        const formId = `task_${Date.now()}`;
        const current = this.getCurrentUser();
        const isManager = this.isAdminOrManager(current);
        const assignableUsers = this.getAssignableUsers();
        const currentId = current && current.id != null ? String(current.id) : '';
        const existingRespId = task && task.responsavelId != null ? String(task.responsavelId) : '';
        const existingRespUser =
            (existingRespId ? this.resolveUserById(existingRespId) : null) ||
            (task && task.responsavel ? this.resolveUserByName(task.responsavel) : null);
        const responsavelId =
            (existingRespUser && existingRespUser.id != null ? String(existingRespUser.id) : '') ||
            (currentId && assignableUsers.some(u => String(u.id) === currentId) ? currentId : (assignableUsers[0]?.id ? String(assignableUsers[0].id) : ''));
        const responsavelNome =
            (task && task.responsavel != null ? String(task.responsavel) : '') ||
            (existingRespUser && existingRespUser.name != null ? String(existingRespUser.name) : '') ||
            (current && current.name != null ? String(current.name) : '');

        const existingInvolvedIds = Array.isArray(task?.envolvidosIds) ? task.envolvidosIds.map(x => String(x)) : [];
        const existingInvolvedNames = Array.isArray(task?.envolvidos) ? task.envolvidos.map(x => String(x)) : [];
        const involvedSelected = new Set(existingInvolvedIds);
        if (involvedSelected.size === 0 && existingInvolvedNames.length > 0) {
            for (const n of existingInvolvedNames) {
                const u = this.resolveUserByName(n);
                if (u && u.id != null) involvedSelected.add(String(u.id));
            }
        }
        if (involvedSelected.size === 0 && responsavelId) involvedSelected.add(String(responsavelId));
        const extraInvolvedNames = (() => {
            if (existingInvolvedNames.length === 0) return [];
            const selectedIds = new Set(Array.from(involvedSelected).map(x => String(x)));
            const selectedUserNames = new Set(
                assignableUsers
                    .filter(u => u && u.id != null && selectedIds.has(String(u.id)))
                    .map(u => (u && u.name != null ? String(u.name).trim().toLowerCase() : ''))
                    .filter(Boolean)
            );
            const out = [];
            const seen = new Set();
            for (const raw of existingInvolvedNames) {
                const s = raw != null ? String(raw).trim() : '';
                if (!s) continue;
                const u = this.resolveUserByName(s);
                if (u && u.id != null && selectedIds.has(String(u.id))) continue;
                const k = s.toLowerCase();
                if (selectedUserNames.has(k)) continue;
                if (seen.has(k)) continue;
                seen.add(k);
                out.push(s);
            }
            return out;
        })();
        const envolvidosTextInitial = (() => {
            const idSet = new Set(Array.from(involvedSelected).map(x => String(x)));
            const names = [];
            for (const u of assignableUsers) {
                if (!u || u.id == null) continue;
                if (!idSet.has(String(u.id))) continue;
                const n = u.name || u.email || u.id;
                if (n) names.push(String(n));
            }
            const combined = [...names, ...extraInvolvedNames]
                .map(s => (s != null ? String(s).trim() : ''))
                .filter(Boolean);
            if (!combined.length && responsavelNome) combined.push(String(responsavelNome).trim());
            const out = [];
            const seen = new Set();
            for (const s of combined) {
                const k = s.toLowerCase();
                if (seen.has(k)) continue;
                seen.add(k);
                out.push(s);
            }
            return out.join(', ');
        })();
        
        return `
            <form id="task-form" data-action="${isEdit ? 'update' : 'create'}" ${isEdit ? `data-id="${task.id}"` : ''}>
                <div class="space-y-6">
                    <!-- Informações Básicas -->
                    <div class="bg-gray-50 p-6 rounded-lg">
                        <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <i class="fas fa-info-circle mr-2 text-blue-600"></i>
                            Informações da Tarefa
                        </h3>
                        <div class="space-y-4">
                            <div>
                                <label for="titulo_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Título *</label>
                                <input type="text" name="titulo" id="titulo_${formId}" value="${task?.titulo || ''}" required 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            </div>
                            <div>
                                <label for="descricao_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                                <textarea name="descricao" id="descricao_${formId}" rows="3" 
                                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                          placeholder="Descreva os detalhes da tarefa...">${task?.descricao || ''}</textarea>
                            </div>
                        </div>
                    </div>

                    <!-- Configurações -->
                    <div class="bg-gray-50 p-6 rounded-lg">
                        <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <i class="fas fa-cogs mr-2 text-purple-600"></i>
                            Configurações
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label for="status_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <select name="status" id="status_${formId}" 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    ${this.config.columns.map(col => `
                                        <option value="${col.id}" ${status === col.id ? 'selected' : ''}>${col.title}</option>
                                    `).join('')}
                                </select>
                            </div>
                            <div>
                                <label for="prioridade_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Prioridade</label>
                                <select name="prioridade" id="prioridade_${formId}" 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    ${Object.entries(this.config.priorities).map(([key, priority]) => `
                                        <option value="${key}" ${task?.prioridade === key ? 'selected' : ''}>${priority.text}</option>
                                    `).join('')}
                                </select>
                            </div>
                            <div>
                                <label for="responsavel_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Responsável</label>
                                <select name="responsavelId" id="responsavel_${formId}"
                                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    ${assignableUsers.map(u => `
                                        <option value="${this.escapeHtml(u.id)}" ${String(u.id) === String(responsavelId) ? 'selected' : ''}>${this.escapeHtml(u.name || u.email || u.id)}</option>
                                    `).join('')}
                                </select>
                                ${isManager ? `
                                    <div class="mt-3">
                                        <label for="responsavel_nome_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Responsável (nome editável)</label>
                                        <input type="text" name="responsavel_nome" id="responsavel_nome_${formId}" value="${this.escapeHtml(responsavelNome)}"
                                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                               placeholder="Ex: Sandro Alex">
                                    </div>
                                ` : ''}
                            </div>
                            <div>
                                <label for="dataVencimento_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Data de Vencimento</label>
                                <input type="date" name="dataVencimento" id="dataVencimento_${formId}" value="${task?.dataVencimento || ''}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            </div>
                            <div class="md:col-span-2">
                                <label for="envolvidos_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Envolvidos</label>
                                ${isManager ? `
                                    <textarea name="envolvidos_text" id="envolvidos_${formId}" rows="3"
                                              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                              placeholder="Separe por vírgula. Ex: Fornecedor X, Montador Y">${this.escapeHtml(envolvidosTextInitial)}</textarea>
                                ` : `
                                    <select name="envolvidos" id="envolvidos_${formId}" multiple
                                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                        ${assignableUsers.map(u => `
                                            <option value="${this.escapeHtml(u.id)}" ${involvedSelected.has(String(u.id)) ? 'selected' : ''}>${this.escapeHtml(u.name || u.email || u.id)}</option>
                                        `).join('')}
                                    </select>
                                `}
                            </div>
                        </div>
                    </div>

                    <!-- Tags -->
                    <div class="bg-gray-50 p-6 rounded-lg">
                        <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <i class="fas fa-tags mr-2 text-green-600"></i>
                            Tags
                        </h3>
                        <div>
                            <label for="tags_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Tags (separadas por vírgula)</label>
                            <input type="text" name="tags" id="tags_${formId}" value="${task?.tags?.join(', ') || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                   placeholder="design, urgente, cliente-abc">
                        </div>
                    </div>
                </div>
                
                <input type="hidden" name="boardId" value="${this.currentBoard}">
            </form>
        `;
    },

    // Mostrar formulário de tarefa
    showTaskForm(defaultStatus = 'todo', taskId = null) {
        const saveBtn = document.getElementById('kanban-save');
        if (saveBtn) saveBtn.style.display = '';
        this.modalSaveHandler = () => this.saveTask();
        Promise.resolve(this.ensureServerUsersLoaded(false)).finally(() => {
            if (taskId) {
                const task = ModuleSystem.data.kanban?.tasks?.find(t => t.id === taskId);
                if (task) {
                    this.openModal('Editar Tarefa', this.generateTaskForm(task));
                    try { this.bindTaskFormAssigneeSync(); } catch {}
                } else {
                    Utils.notifications.error('Tarefa não encontrada.');
                }
            } else {
                this.openModal('Nova Tarefa', this.generateTaskForm(null, defaultStatus));
                try { this.bindTaskFormAssigneeSync(); } catch {}
            }
        });
    },

    showTaskFormWithPrefill(prefill = {}, defaultStatus = 'todo') {
        const saveBtn = document.getElementById('kanban-save');
        if (saveBtn) saveBtn.style.display = '';
        this.modalSaveHandler = () => this.saveTask();
        Promise.resolve(this.ensureServerUsersLoaded(false)).finally(() => {
            this.openModal('Nova Tarefa', this.generateTaskForm(null, defaultStatus));
            try { this.bindTaskFormAssigneeSync(); } catch {}
            setTimeout(() => {
                try { this.applyTaskFormPrefill(prefill); } catch {}
            }, 0);
        });
    },

    bindTaskFormAssigneeSync() {
        const form = document.getElementById('task-form');
        if (!form) return;
        const sel = form.querySelector('select[name="responsavelId"]');
        const input = form.querySelector('input[name="responsavel_nome"]');
        if (!sel) return;

        const normalize = (v) => (v != null ? String(v).trim().toLowerCase() : '');
        const setInputFromSelect = () => {
            if (!input) return;
            const raw = sel.value != null ? String(sel.value).trim() : '';
            const u = raw ? this.resolveUserById(raw) : null;
            const label = u ? (u.name || u.email || u.id) : '';
            input.value = label ? String(label) : (input.value || '');
            try { input.dispatchEvent(new Event('input', { bubbles: true })); } catch {}
            try { input.dispatchEvent(new Event('change', { bubbles: true })); } catch {}
        };

        const setSelectFromInput = () => {
            if (!input) return;
            const v = String(input.value || '').trim();
            if (!v) return;
            const u = this.resolveUserByName(v);
            if (u && u.id != null) {
                sel.value = String(u.id);
                try { sel.dispatchEvent(new Event('change', { bubbles: true })); } catch {}
            }
        };

        if (sel.dataset.boundSync !== '1') {
            sel.dataset.boundSync = '1';
            sel.addEventListener('change', () => setInputFromSelect());
        }
        if (input && input.dataset.boundSync !== '1') {
            input.dataset.boundSync = '1';
            input.addEventListener('blur', () => setSelectFromInput());
        }
    },

    applyTaskFormPrefill(prefill = {}) {
        const root = document.getElementById(this.config.overlayId);
        const form = document.getElementById('task-form');
        if (!root || !form) return;

        const setVal = (selector, value) => {
            const el = root.querySelector(selector);
            if (!el) return;
            if (el.tagName === 'SELECT' && el.multiple && Array.isArray(value)) {
                const set = new Set(value.map(v => String(v)));
                Array.from(el.options).forEach(opt => {
                    opt.selected = set.has(String(opt.value));
                });
                try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch {}
                return;
            }
            el.value = value != null ? String(value) : '';
            try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch {}
            try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch {}
        };

        if (prefill.titulo != null) setVal('input[name="titulo"]', prefill.titulo);
        if (prefill.descricao != null) setVal('textarea[name="descricao"]', prefill.descricao);
        if (prefill.status != null) setVal('select[name="status"]', prefill.status);
        if (prefill.prioridade != null) setVal('select[name="prioridade"]', prefill.prioridade);
        if (prefill.dataVencimento != null) setVal('input[name="dataVencimento"]', prefill.dataVencimento);

        if (prefill.tags != null) {
            const v = Array.isArray(prefill.tags) ? prefill.tags.join(', ') : String(prefill.tags);
            setVal('input[name="tags"]', v);
        }

        if (prefill.responsavelId != null) setVal('select[name="responsavelId"]', prefill.responsavelId);
        if (prefill.responsavel != null) setVal('input[name="responsavel_nome"]', prefill.responsavel);

        const envolvidosTextEl = root.querySelector('textarea[name="envolvidos_text"]');
        if (envolvidosTextEl) {
            if (prefill.envolvidos != null) {
                const list = Array.isArray(prefill.envolvidos)
                    ? prefill.envolvidos
                    : String(prefill.envolvidos).split(/[\n,;]/g).map(s => s.trim()).filter(Boolean);
                setVal('textarea[name="envolvidos_text"]', list.join(', '));
            }
        } else {
            if (Array.isArray(prefill.envolvidosIds)) setVal('select[name="envolvidos"]', prefill.envolvidosIds);
        }
    },

    generateBoardForm(board = null) {
        const isEdit = board !== null;
        const formId = `board_${Date.now()}`;
        return `
            <form id="board-form" data-action="${isEdit ? 'update' : 'create'}" ${isEdit ? `data-id="${board.id}"` : ''}>
                <div class="space-y-6">
                    <div class="bg-gray-50 p-6 rounded-lg">
                        <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <i class="fas fa-columns mr-2 text-sky-600"></i>
                            Quadro
                        </h3>
                        <div class="space-y-4">
                            <div>
                                <label for="nome_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Nome *</label>
                                <input type="text" id="nome_${formId}" name="nome" value="${this.escapeHtml(board?.nome || '')}" required
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                                       placeholder="Ex: Projetos, Comercial, Produção">
                            </div>
                            <div>
                                <label for="descricao_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                                <textarea id="descricao_${formId}" name="descricao" rows="3"
                                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                                          placeholder="Opcional">${this.escapeHtml(board?.descricao || '')}</textarea>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        `;
    },

    showBoardForm(boardId = null) {
        const saveBtn = document.getElementById('kanban-save');
        if (saveBtn) saveBtn.style.display = '';
        const boards = this.getBoards();
        const board = boardId ? boards.find(b => String(b.id) === String(boardId)) : null;
        this.modalSaveHandler = () => this.saveBoard();
        this.openModal(board ? 'Editar Quadro' : 'Novo Quadro', this.generateBoardForm(board));
    },

    saveBoard() {
        const form = document.getElementById('board-form');
        if (!form) return;

        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) data[key] = value;

        const nome = data.nome != null ? String(data.nome).trim() : '';
        const descricao = data.descricao != null ? String(data.descricao).trim() : '';
        if (!nome) {
            Utils.notifications.error('O nome do quadro é obrigatório.');
            return;
        }

        if (!ModuleSystem.data.kanban) ModuleSystem.data.kanban = { boards: [], tasks: [] };
        if (!Array.isArray(ModuleSystem.data.kanban.boards)) ModuleSystem.data.kanban.boards = [];

        const action = form.getAttribute('data-action');
        const id = form.getAttribute('data-id');
        const nowIso = new Date().toISOString();

        if (action === 'create') {
            const board = {
                id: Utils.generateId(),
                nome,
                descricao,
                dataCriacao: nowIso,
                ativo: true
            };
            ModuleSystem.data.kanban.boards.push(board);
            this.currentBoard = board.id;
        } else if (action === 'update') {
            const idx = ModuleSystem.data.kanban.boards.findIndex(b => String(b.id) === String(id));
            if (idx !== -1) {
                ModuleSystem.data.kanban.boards[idx] = { ...ModuleSystem.data.kanban.boards[idx], nome, descricao };
            }
        }

        ModuleSystem.saveData();
        Utils.notifications.success('Quadro salvo com sucesso!');
        this.closeModal();
        this.renderBoard();
    },

    // Salvar tarefa
    async syncTaskToTarefasAdmin(task) {
        try {
            const user = this.getCurrentUser();
            if (!this.isAdminOrManager(user)) return null;
            if (!task) return null;

            const responsavelIdRaw = task.responsavelId != null ? String(task.responsavelId).trim() : '';
            const responsavelId = responsavelIdRaw ? Number(responsavelIdRaw) : null;
            if (!responsavelId || !Number.isFinite(responsavelId) || responsavelId <= 0) return null;

            const envolvidosIds = Array.isArray(task.envolvidosIds)
                ? task.envolvidosIds.map(x => Number(String(x))).filter(n => Number.isFinite(n) && n > 0)
                : [];

            const payload = {
                titulo: task.titulo != null ? String(task.titulo).trim() : '',
                descricao: task.descricao != null ? String(task.descricao).trim() : null,
                tipo: 'kanban',
                status: task.status != null ? String(task.status).trim().toLowerCase() : 'todo',
                prioridade: task.prioridade != null ? String(task.prioridade).trim().toLowerCase() : 'media',
                responsavel_id: responsavelId,
                envolvidos_ids: envolvidosIds,
                data_inicio: null,
                data_vencimento: task.dataVencimento ? String(task.dataVencimento).slice(0, 10) : null,
                origem_modulo: 'kanban',
                origem_id: null
            };

            const existingIdRaw = task.tarefasAdminId != null ? String(task.tarefasAdminId).trim() : '';
            const existingId = existingIdRaw ? Number(existingIdRaw) : null;
            if (existingId && Number.isFinite(existingId) && existingId > 0) {
                const r = await fetch('/api/crm/tarefas-admin/' + encodeURIComponent(String(existingId)), {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const j = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error((j && j.error) ? j.error : 'Falha ao sincronizar tarefa');
                return existingId;
            }

            const r = await fetch('/api/crm/tarefas-admin', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error((j && j.error) ? j.error : 'Falha ao sincronizar tarefa');
            const newId = j && j.id != null ? Number(j.id) : null;
            if (newId && Number.isFinite(newId) && newId > 0) return newId;
        } catch {}
        return null;
    },

    async saveTask() {
        const form = document.getElementById('task-form');
        if (!form) return;

        const formData = new FormData(form);
        const data = {};
        
        // Converter FormData para objeto
        for (let [key, value] of formData.entries()) {
            if (data[key] === undefined) {
                data[key] = value;
            } else if (Array.isArray(data[key])) {
                data[key].push(value);
            } else {
                data[key] = [data[key], value];
            }
        }

        // Validar campos obrigatórios
        if (!data.titulo) {
            Utils.notifications.error('O título é obrigatório.');
            return;
        }

        // Processar tags
        if (data.tags) {
            data.tags = data.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        } else {
            data.tags = [];
        }

        const action = form.getAttribute('data-action');
        const id = form.getAttribute('data-id');

        try {
            const parseList = (raw) => {
                const parts = String(raw || '').split(/[\n,;]/g).map(s => s.trim()).filter(Boolean);
                const out = [];
                const seen = new Set();
                for (const s of parts) {
                    const k = s.toLowerCase();
                    if (seen.has(k)) continue;
                    seen.add(k);
                    out.push(s);
                }
                return out;
            };

            const respIdSelRaw = formData.get('responsavelId');
            const respIdSel = respIdSelRaw != null ? String(respIdSelRaw).trim() : '';
            const respNameRaw = formData.get('responsavel_nome');
            const respName = respNameRaw != null ? String(respNameRaw).trim() : '';
            const normalize = (v) => (v != null ? String(v).trim().toLowerCase() : '');
            const selUser = respIdSel ? this.resolveUserById(respIdSel) : null;
            const selLabel = selUser ? (selUser.name || selUser.email || selUser.id) : '';
            const inputOverridesSelect = !!(respName && selLabel && normalize(respName) !== normalize(selLabel));
            if (respName && (!respIdSel || inputOverridesSelect)) {
                data.responsavel = respName;
                const u = this.resolveUserByName(respName);
                data.responsavelId = u && u.id != null ? String(u.id) : null;
            } else if (respIdSel) {
                data.responsavelId = respIdSel;
                data.responsavel = selLabel ? String(selLabel) : '';
            } else {
                data.responsavelId = null;
                data.responsavel = '';
            }

            const envolvidosTextEl = form.querySelector('textarea[name="envolvidos_text"]');
            if (envolvidosTextEl) {
                const list = parseList(envolvidosTextEl.value);
                const envolvidosIds = [];
                const envolvidosExtras = [];
                const envolvidosFinal = [];
                const seen = new Set();
                for (const raw of list) {
                    const s = raw != null ? String(raw).trim() : '';
                    if (!s) continue;
                    const k = s.toLowerCase();
                    if (seen.has(k)) continue;
                    seen.add(k);
                    const u = this.resolveUserByName(s);
                    if (u && u.id != null) {
                        envolvidosIds.push(String(u.id));
                        const uname = u.name || u.email || u.id;
                        if (uname) envolvidosFinal.push(String(uname));
                    } else {
                        envolvidosExtras.push(s);
                        envolvidosFinal.push(s);
                    }
                }
                data.envolvidosIds = envolvidosIds;
                data.envolvidosExtras = envolvidosExtras;
                data.envolvidos = envolvidosFinal;
            } else {
                const envolvidosIds = formData.getAll('envolvidos').map(v => String(v)).filter(Boolean);
                data.envolvidosIds = envolvidosIds;
            }

            if (data.responsavelId != null) data.responsavelId = String(data.responsavelId);

            this.applyAccessToAssignees(data);

            const saveBtn = document.getElementById('kanban-save');
            try { if (saveBtn) saveBtn.disabled = true; } catch {}

            if (action === 'create') {
                // Criar nova tarefa
                data.id = Utils.generateId();
                data.dataCriacao = new Date().toISOString();
                data.dataAtualizacao = new Date().toISOString();

                if (!ModuleSystem.data.kanban.tasks) {
                    ModuleSystem.data.kanban.tasks = [];
                }
                ModuleSystem.data.kanban.tasks.push(data);
            } else if (action === 'update') {
                // Atualizar tarefa existente
                const index = ModuleSystem.data.kanban.tasks.findIndex(t => t.id === id);
                if (index !== -1) {
                    data.dataAtualizacao = new Date().toISOString();
                    ModuleSystem.data.kanban.tasks[index] = { ...ModuleSystem.data.kanban.tasks[index], ...data };
                }
            }

            const tasksArr = Array.isArray(ModuleSystem?.data?.kanban?.tasks) ? ModuleSystem.data.kanban.tasks : [];
            const taskRef = tasksArr.find(t => t && String(t.id) === String(data.id || id));
            if (taskRef) {
                const serverId = await this.syncTaskToTarefasAdmin(taskRef);
                if (serverId) taskRef.tarefasAdminId = serverId;
            }

            ModuleSystem.saveData();
            Utils.notifications.success('Tarefa salva com sucesso!');
            try {
                const dash = window.ModuleSystem && ModuleSystem.dashboard ? ModuleSystem.dashboard : null;
                const dashRoot = document.getElementById('dashboardAgendaKanban');
                const dashContent = document.getElementById('dashboardContent');
                if (dash && dashRoot && dashContent && !dashContent.classList.contains('hidden') && typeof dash.renderAgendaKanban === 'function') {
                    dash.renderAgendaKanban();
                }
            } catch {}
            try { if (saveBtn) saveBtn.disabled = false; } catch {}
            this.closeModal();
            this.renderBoard();
        } catch (error) {
            try {
                const saveBtn = document.getElementById('kanban-save');
                if (saveBtn) saveBtn.disabled = false;
            } catch {}
            Utils.notifications.error('Erro ao salvar tarefa: ' + error.message);
        }
    },

    // Deletar tarefa
    async deleteTask(taskId) {
        if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
            try {
                const index = ModuleSystem.data.kanban.tasks.findIndex(t => t.id === taskId);
                if (index !== -1) {
                    const t = ModuleSystem.data.kanban.tasks[index];
                    const serverIdRaw = t && t.tarefasAdminId != null ? String(t.tarefasAdminId).trim() : '';
                    const serverId = serverIdRaw ? Number(serverIdRaw) : null;
                    ModuleSystem.data.kanban.tasks.splice(index, 1);
                    ModuleSystem.saveData();
                    if (serverId && Number.isFinite(serverId) && serverId > 0) {
                        try {
                            await fetch('/api/crm/tarefas-admin/' + encodeURIComponent(String(serverId)), {
                                method: 'DELETE',
                                credentials: 'include'
                            });
                        } catch {}
                    }
                    Utils.notifications.success('Tarefa excluída com sucesso!');
                    this.renderBoard();
                    try {
                        const dash = window.ModuleSystem && ModuleSystem.dashboard ? ModuleSystem.dashboard : null;
                        if (dash && typeof dash.refreshTarefasAdminApi === 'function') {
                            dash.refreshTarefasAdminApi(true);
                        }
                        if (dash && typeof dash.renderAgendaKanban === 'function') {
                            dash.renderAgendaKanban();
                        }
                    } catch {}
                } else {
                    Utils.notifications.error('Tarefa não encontrada.');
                }
            } catch (error) {
                Utils.notifications.error('Erro ao excluir tarefa: ' + error.message);
            }
        }
    },

    // Vincular eventos de drag and drop
    bindDragEvents() {
        const root = document.getElementById(this.config.boardId);
        if (!root) return;
        if (root.getAttribute('data-dnd-bound') === 'true') return;
        root.setAttribute('data-dnd-bound', 'true');

        root.addEventListener('dragstart', (e) => {
            const card = e.target && e.target.closest ? e.target.closest('.task-card') : null;
            if (!card) return;
            const taskId = card.getAttribute('data-task-id');
            if (!taskId) return;
            this.draggedCard = String(taskId);
            card.classList.add('opacity-60');
            try {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(taskId));
            } catch {}
        }, true);

        root.addEventListener('dragend', (e) => {
            const card = e.target && e.target.closest ? e.target.closest('.task-card') : null;
            if (card) card.classList.remove('opacity-60');
            this.draggedCard = null;
            if (this.activeDropColumn) {
                this.activeDropColumn.classList.remove('ring-2', 'ring-sky-400', 'ring-inset');
                this.activeDropColumn = null;
            }
        }, true);

        root.addEventListener('dragover', (e) => {
            const col = e.target && e.target.closest ? e.target.closest('.kanban-column[data-column]') : null;
            if (!col) return;
            e.preventDefault();
            try { e.dataTransfer.dropEffect = 'move'; } catch {}
            if (this.activeDropColumn && this.activeDropColumn !== col) {
                this.activeDropColumn.classList.remove('ring-2', 'ring-sky-400', 'ring-inset');
            }
            this.activeDropColumn = col;
            col.classList.add('ring-2', 'ring-sky-400', 'ring-inset');
        });

        root.addEventListener('dragleave', (e) => {
            if (!this.activeDropColumn) return;
            if (!this.activeDropColumn.contains(e.relatedTarget)) {
                this.activeDropColumn.classList.remove('ring-2', 'ring-sky-400', 'ring-inset');
                this.activeDropColumn = null;
            }
        });

        root.addEventListener('drop', (e) => {
            const col = e.target && e.target.closest ? e.target.closest('.kanban-column[data-column]') : null;
            if (!col) return;
            e.preventDefault();
            col.classList.remove('ring-2', 'ring-sky-400', 'ring-inset');
            if (this.activeDropColumn) this.activeDropColumn = null;

            let taskId = this.draggedCard;
            if (!taskId) {
                try { taskId = e.dataTransfer.getData('text/plain'); } catch {}
            }

            const newStatus = col.getAttribute('data-column');
            if (!taskId || !newStatus) return;
            this.moveTask(String(taskId), String(newStatus));
            this.draggedCard = null;
        });
    },

    // Mover tarefa
    moveTask(taskId, newStatus) {
        try {
            if (!ModuleSystem?.data?.kanban) return;
            if (!Array.isArray(ModuleSystem.data.kanban.tasks)) {
                this.normalizeKanbanData(false);
            }
            const tasks = Array.isArray(ModuleSystem.data.kanban.tasks) ? ModuleSystem.data.kanban.tasks : [];
            const task = tasks.find(t => t && String(t.id) === String(taskId));
            if (task) {
                task.status = newStatus;
                task.dataAtualizacao = new Date().toISOString();
                
                ModuleSystem.saveData();
                try {
                    const serverIdRaw = task.tarefasAdminId != null ? String(task.tarefasAdminId).trim() : '';
                    const serverId = serverIdRaw ? Number(serverIdRaw) : null;
                    if (serverId && Number.isFinite(serverId) && serverId > 0 && this.isAdminOrManager(this.getCurrentUser())) {
                        fetch('/api/crm/tarefas-admin/' + encodeURIComponent(String(serverId)), {
                            method: 'PUT',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: String(newStatus || '').toLowerCase() })
                        }).catch(() => {});
                    }
                } catch {}
                Utils.notifications.success('Tarefa movida com sucesso!');
                this.renderBoard();
                return;
            }
            Utils.notifications.error('Tarefa não encontrada para mover.');
        } catch (error) {
            Utils.notifications.error('Erro ao mover tarefa: ' + error.message);
        }
    },

    // Mostrar configurações do board
    showBoardSettings() {
        const boards = this.getBoards();
        const board = boards.find(b => b && b.id === this.currentBoard) || boards[0] || null;
        const settingsHTML = this.generateBoardForm(board);
        const saveBtn = document.getElementById('kanban-save');
        if (saveBtn) saveBtn.style.display = '';
        this.modalSaveHandler = () => this.saveBoard();
        this.openModal('Configurações do Quadro', settingsHTML);
    }
};


// Exportar para uso global
window.KanbanSystem = KanbanSystem;
