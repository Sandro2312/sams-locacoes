const FormSystem = {
    _notifyOnce(key, message, type = 'error', ttlMs = 1200) {
        try {
            const now = Date.now();
            const storeKey = `__forms_notify_${key}`;
            const last = window[storeKey] || 0;
            if (now - last < ttlMs) return;
            window[storeKey] = now;
            if (window.NotificationSystem && typeof window.NotificationSystem[type] === 'function') {
                window.NotificationSystem[type](message);
            }
        } catch {
            try { alert(message); } catch {}
        }
    },
    config: {
        modalId: 'crud-modal',
        overlayId: 'modal-overlay'
    },
    escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    },

    async ensureEventosLoaded() {
        try {
            if (!window.ModuleSystem || !ModuleSystem.data) return;

            const now = Date.now();
            if (this._eventosLoadedAt && (now - this._eventosLoadedAt) < 5 * 60 * 1000) return;

            const localEventos = Array.isArray(ModuleSystem.data.eventos) ? [...ModuleSystem.data.eventos] : [];
            let apiEventos = [];
            try {
                const response = await fetch('/api/crm/eventos', { credentials: 'include' });
                const data = await response.json().catch(() => []);
                if (response.ok && Array.isArray(data)) apiEventos = data;
            } catch {}

            if (apiEventos.length === 0 && localEventos.length > 0) {
                this._eventosLoadedAt = now;
                return;
            }

            const byId = new Map();
            for (const e of localEventos) if (e && e.id != null) byId.set(String(e.id), e);
            for (const e of apiEventos) if (e && e.id != null) byId.set(String(e.id), e);
            const merged = Array.from(byId.values());

            ModuleSystem.data.eventos = merged;
            if (typeof ModuleSystem.saveData === 'function') ModuleSystem.saveData();
            this._eventosLoadedAt = now;
        } catch {}
    },

    async ensureOportunidadesLoaded() {
        try {
            if (!window.ModuleSystem || !ModuleSystem.data) return;

            const now = Date.now();
            if (this._oportunidadesLoadedAt && (now - this._oportunidadesLoadedAt) < 3 * 60 * 1000) return;

            const local = Array.isArray(ModuleSystem.data.oportunidades) ? [...ModuleSystem.data.oportunidades] : [];
            let apiList = [];
            try {
                const response = await fetch('/api/crm/oportunidades', { credentials: 'include' });
                const data = await response.json().catch(() => []);
                if (response.ok && Array.isArray(data)) apiList = data;
            } catch {}

            if (apiList.length === 0 && local.length > 0) {
                this._oportunidadesLoadedAt = now;
                return;
            }

            const byId = new Map();
            for (const o of local) if (o && o.id != null) byId.set(String(o.id), o);
            for (const o of apiList) if (o && o.id != null) byId.set(String(o.id), o);
            const merged = Array.from(byId.values());

            ModuleSystem.data.oportunidades = merged;
            if (typeof ModuleSystem.saveData === 'function') ModuleSystem.saveData();
            this._oportunidadesLoadedAt = now;
        } catch {}
    },

    setupCentroCustoAutocomplete(form) {
        if (!form) return;
        const input = form.querySelector('input[name="centroCusto"]');
        if (!input) return;
        if (input.dataset && input.dataset.ccAutocompleteBound === '1') return;

        input.removeAttribute('list');

        const dropdownId = `cc-dd-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const dropdown = document.createElement('div');
        dropdown.id = dropdownId;
        dropdown.dataset.ccCentroCustoDropdown = '1';
        dropdown.className = 'hidden fixed bg-white border border-gray-200 rounded-lg shadow-lg overflow-auto max-h-56 text-sm z-[60]';
        document.body.appendChild(dropdown);

        if (input.dataset) input.dataset.ccAutocompleteBound = '1';

        const debounce = (fn, wait) => {
            if (window.Utils && typeof Utils.debounce === 'function') return Utils.debounce(fn, wait);
            let t;
            return (...args) => {
                clearTimeout(t);
                t = setTimeout(() => fn(...args), wait);
            };
        };

        const buildNames = (query) => {
            const eventos = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.eventos)) ? ModuleSystem.data.eventos : [];
            const q = (query || '').trim().toLowerCase();

            const names = [];
            const seen = new Set();

            for (const ev of eventos) {
                const nome = ev && ev.nome != null ? String(ev.nome).trim() : '';
                if (!nome) continue;
                if (q && !nome.toLowerCase().includes(q)) continue;
                const key = nome.toLowerCase();
                if (seen.has(key)) continue;
                seen.add(key);
                names.push(nome);
                if (names.length >= 40) break;
            }

            if (!q) names.sort((a, b) => a.localeCompare(b, 'pt-BR'));
            return names;
        };

        const positionDropdown = () => {
            const rect = input.getBoundingClientRect();
            dropdown.style.left = `${Math.max(0, rect.left)}px`;
            dropdown.style.top = `${rect.bottom + 6}px`;
            dropdown.style.width = `${Math.max(180, rect.width)}px`;
        };

        const hide = () => {
            dropdown.classList.add('hidden');
            dropdown.innerHTML = '';
        };

        const render = async () => {
            await this.ensureEventosLoaded();
            const query = (input.value || '').trim();
            if (query.length < 2) {
                hide();
                return;
            }
            const names = buildNames(query);
            if (names.length === 0) {
                hide();
                return;
            }

            positionDropdown();
            dropdown.innerHTML = names.map(n => {
                const safe = this.escapeHtml(n);
                return `<button type="button" data-cc-value="${safe}" class="block w-full text-left px-3 py-2 hover:bg-gray-50">${safe}</button>`;
            }).join('');
            dropdown.classList.remove('hidden');
        };

        const renderDebounced = debounce(render, 120);
        input.addEventListener('input', renderDebounced);
        input.addEventListener('focus', () => {
            if (((input.value || '').trim()).length >= 2) renderDebounced();
        });
        input.addEventListener('blur', () => setTimeout(hide, 140));
        dropdown.addEventListener('mousedown', (e) => {
            e.preventDefault();
        });
        dropdown.addEventListener('click', (e) => {
            const btn = e.target && e.target.closest ? e.target.closest('button[data-cc-value]') : null;
            if (!btn) return;
            const value = btn.getAttribute('data-cc-value') || '';
            input.value = value;
            try { input.dispatchEvent(new Event('input', { bubbles: true })); } catch {}
            try { input.dispatchEvent(new Event('change', { bubbles: true })); } catch {}
            try { input.focus(); } catch {}
            hide();
        });

        window.addEventListener('resize', () => {
            if (!dropdown.classList.contains('hidden')) positionDropdown();
        });
        window.addEventListener('scroll', () => {
            if (!dropdown.classList.contains('hidden')) positionDropdown();
        }, true);

        render().catch(() => {});
    },

    // Inicializar sistema
    init() {
        console.log('[FormSystem] Inicializando sistema de formulários...');
        this.createModalStructure();
        this.bindEvents();
        
        // Sobrescrever funções do ModuleSystem com contexto preservado
        if (window.ModuleSystem) {
            console.log('[FormSystem] Sobrescrevendo funções do ModuleSystem...');
            ModuleSystem.showCreateForm = ((module) => this.showCreateForm(module)).bind(this);
            ModuleSystem.showUpdateForm = ((module, id) => this.showUpdateForm(module, id)).bind(this);
            ModuleSystem.showDetails = ((module, id) => this.showDetails(module, id)).bind(this);
            console.log('[FormSystem] Funções sobrescritas com sucesso');
        }
        
        console.log('[FormSystem] Sistema inicializado com sucesso');
    },

    // Criar estrutura do modal
    createModalStructure() {
        // Remover modal existente se houver
        const existingOverlay = document.getElementById(this.config.overlayId);
        if (existingOverlay) {
            existingOverlay.remove();
        }

        // Criar estrutura do modal
        const modalHTML = `
            <div id="${this.config.overlayId}" class="fixed inset-0 bg-black bg-opacity-50 hidden" style="z-index:2147483000; overflow-y:auto; -webkit-overflow-scrolling:touch;">
                <div class="flex items-start justify-center" style="min-height:100%; padding:8px;">
                    <div class="bg-white rounded-lg shadow-xl w-full" style="max-width:min(100%, 1280px); display:flex; flex-direction:column; max-height:calc(100dvh - 16px); margin:auto;">
                        <div class="flex justify-between items-center border-b flex-shrink-0" style="padding:12px 16px;">
                            <h2 id="modal-title" class="font-semibold text-gray-900" style="font-size:clamp(15px,4vw,20px); padding-right:8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:calc(100% - 40px);"></h2>
                            <button id="modal-close" class="text-gray-400 hover:text-gray-600 flex-shrink-0" title="Fechar modal" aria-label="Fechar modal" style="padding:4px;">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        <div id="modal-content" style="padding:12px 16px; overflow-y:auto; flex:1; -webkit-overflow-scrolling:touch;">
                            <!-- Conteúdo será inserido aqui -->
                        </div>
                        <div id="modal-footer" class="border-t bg-gray-50 flex-shrink-0 sticky bottom-0" style="padding:10px 16px; display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end; align-items:center; z-index:10;">
                            <button type="button" id="modal-dashboard" class="text-white bg-gray-600 rounded-md hover:bg-gray-700" style="padding:8px 12px; font-size:13px; font-weight:500; white-space:nowrap;">
                                Dashboard
                            </button>
                            <button type="button" id="modal-kanban" class="text-white bg-emerald-600 rounded-md hover:bg-emerald-700 hidden" style="padding:8px 12px; font-size:13px; font-weight:500; white-space:nowrap;">
                                Criar Card
                            </button>
                            <button type="button" id="modal-cancel" class="text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50" style="padding:8px 12px; font-size:13px; font-weight:500; white-space:nowrap;">
                                Cancelar
                            </button>
                            <button type="submit" id="modal-save" form="crud-form" class="text-white bg-blue-600 rounded-md hover:bg-blue-700" style="padding:8px 16px; font-size:13px; font-weight:600; white-space:nowrap; min-width:80px;">
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
        console.log('[FormSystem] Vinculando eventos do modal...');
        
        const overlay = document.getElementById(this.config.overlayId);
        const closeBtn = document.getElementById('modal-close');
        const cancelBtn = document.getElementById('modal-cancel');
        const saveBtn = document.getElementById('modal-save');
        const dashboardBtn = document.getElementById('modal-dashboard');
        const kanbanBtn = document.getElementById('modal-kanban');

        // Fechar modal
        [closeBtn, cancelBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.closeModal());
            }
        });

        // Fechar ao clicar no overlay
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeModal();
                }
            });

            // Delegação: fechar modal por botões internos com data-close-modal
            overlay.addEventListener('click', (e) => {
                const closeTrigger = e.target && e.target.closest && e.target.closest('[data-close-modal]');
                if (closeTrigger) {
                    e.preventDefault();
                    this.closeModal();
                }
            });
        }

        // Voltar ao Dashboard
        if (dashboardBtn) {
            dashboardBtn.addEventListener('click', () => {
                this.closeModal();
                if (window.NavigationSystem && typeof window.NavigationSystem.navigateToModule === 'function') {
                    window.NavigationSystem.navigateToModule('dashboard');
                } else {
                    console.warn('[FormSystem] NavigationSystem não disponível.');
                }
            });
        }

        if (kanbanBtn && kanbanBtn.getAttribute('data-bound') !== 'true') {
            kanbanBtn.setAttribute('data-bound', 'true');
            kanbanBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const role = kanbanBtn.getAttribute('data-role');
                if (role === 'briefing-prompt') {
                    if (window.BriefingSystem && typeof window.BriefingSystem.openPromptModal === 'function') {
                        window.BriefingSystem.openPromptModal();
                    }
                    return;
                }
                this.openKanbanFromCurrentForm();
            });
        }

        // Salvar formulário
        // Listener de clique removido para evitar dupla execução do handleSave; o fluxo de submit do formulário cobre o caso

        // Vincular eventos de formulário
        document.addEventListener('submit', async (e) => {
            const form = e.target;
            if (form && form.id === 'crud-form') {
                e.preventDefault();
                await this.handleSave(e);
            }
        });

        console.log('[FormSystem] Eventos vinculados com sucesso');
    },

    // Abrir modal
    openModal(title, content) {
        console.log('[FormSystem] Abrindo modal:', title);
        
        const overlay = document.getElementById(this.config.overlayId);
        const titleElement = document.getElementById('modal-title');
        const contentElement = document.getElementById('modal-content');

        try {
            const footer = document.getElementById('modal-footer');
            if (footer) footer.classList.remove('hidden');
            const saveBtn = document.getElementById('modal-save');
            if (saveBtn) {
                saveBtn.type = 'submit';
                saveBtn.setAttribute('form', 'crud-form');
                saveBtn.onclick = null;
                saveBtn.classList.remove('hidden');
                saveBtn.disabled = false;
                saveBtn.textContent = 'Salvar';
            }
            const kanbanBtn = document.getElementById('modal-kanban');
            if (kanbanBtn) {
                kanbanBtn.removeAttribute('data-role');
                kanbanBtn.textContent = 'Criar Card';
                kanbanBtn.className = 'px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md hover:bg-emerald-700 hidden';
            }
            const cancelBtn = document.getElementById('modal-cancel');
            if (cancelBtn) {
                cancelBtn.classList.remove('hidden');
                cancelBtn.textContent = 'Cancelar';
                cancelBtn.disabled = false;
            }
            const dashboardBtn = document.getElementById('modal-dashboard');
            if (dashboardBtn) {
                dashboardBtn.classList.remove('hidden');
                dashboardBtn.disabled = false;
            }
        } catch {}

        if (titleElement) titleElement.textContent = title;
        if (contentElement) contentElement.innerHTML = content;

        // Vincular modal-save APÓS injetar o content no DOM
        // Se o formulário já tem botões internos próprios, ocultar o rodapé externo do modal
        try {
            const saveBtn = document.getElementById('modal-save');
            const footer = document.getElementById('modal-footer');
            const footerForm = (() => {
                if (!contentElement) return null;
                const f = contentElement.querySelector('form');
                return f && f.id ? f : null;
            })();
            // Detectar se o form já tem botões de submit internos (btn-submit ou type=submit dentro do form)
            const formHasInternalButtons = (() => {
                if (!footerForm) return false;
                return !!(footerForm.querySelector('button[type="submit"], .btn-submit, button.btn-submit'));
            })();
            if (formHasInternalButtons) {
                // Ocultar o rodapé externo — o form tem seus próprios botões
                if (footer) footer.classList.add('hidden');
            } else {
                if (footer) footer.classList.remove('hidden');
                if (saveBtn) {
                    if (footerForm) {
                        saveBtn.type = 'submit';
                        saveBtn.setAttribute('form', footerForm.id);
                    } else {
                        saveBtn.type = 'submit';
                        saveBtn.setAttribute('form', 'crud-form');
                    }
                }
            }
        } catch {}
        
        if (overlay) {
            overlay.classList.remove('hidden');
            
            // Focar no primeiro input apenas uma vez, sem interferir na navegação posterior
            setTimeout(() => {
                const firstInput = overlay.querySelector('input, select, textarea');
                if (firstInput && !overlay.dataset.focusApplied) {
                    firstInput.focus();
                    overlay.dataset.focusApplied = 'true';
                }
            }, 100);

            // Inicializar validação em tempo real e eventos do formulário inserido dinamicamente
            try {
                const form = overlay.querySelector('#crud-form');
                if (form && window.UnifiedValidator && typeof window.UnifiedValidator.setupRealtimeValidation === 'function') {
                    const module = form.dataset.module;
                    if (module) {
                        window.UnifiedValidator.setupRealtimeValidation(module, form);
                    }
                }
                if (form && typeof this.attachModuleSpecificEvents === 'function') {
                    const module = form.dataset.module;
                    this.attachModuleSpecificEvents(module, form);
                }
                this.updateKanbanButtonState(title, form);
            } catch (e) {
                console.warn('[FormSystem] Falha ao configurar validação dinâmica do formulário:', e);
            }

            try {
                const briefingForm = overlay.querySelector('#briefing-form');
                if (briefingForm) {
                    const saveBtn = document.getElementById('modal-save');
                    if (saveBtn) {
                        saveBtn.type = 'button';
                        saveBtn.removeAttribute('form');
                        saveBtn.textContent = 'Salvar Briefing';
                        saveBtn.onclick = (e) => {
                            try { e && e.preventDefault && e.preventDefault(); } catch {}
                            if (window.BriefingSystem && typeof window.BriefingSystem.saveBriefing === 'function') {
                                window.BriefingSystem.saveBriefing();
                            }
                        };
                    }

                    const promptBtn = document.getElementById('modal-kanban');
                    if (promptBtn) {
                        promptBtn.className = 'px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700';
                        promptBtn.textContent = 'Gerar Prompt IA';
                        promptBtn.setAttribute('data-role', 'briefing-prompt');
                        promptBtn.classList.remove('hidden');
                    }
                }
            } catch {}
        }
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

    canCreateKanbanFromForms() {
        const u = this.getCurrentUser();
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

        const authRank = u ? rankFromAuthRole(u.role) : 0;
        let moduleRank = 0;
        try {
            const email = normalize(u?.email);
            const modUser = email && ModuleSystem?.data?.usuarios
                ? ModuleSystem.data.usuarios.find(x => normalize(x?.email) === email)
                : null;
            if (modUser) moduleRank = rankFromNivelAcesso(modUser.nivel_acesso);
        } catch {}

        const rank = Math.max(authRank, moduleRank);
        const hasPermission = (window.PermissionSystem && typeof window.PermissionSystem.hasPermission === 'function')
            ? window.PermissionSystem.hasPermission('kanban.tasks.create')
            : true;

        return rank >= 1 && hasPermission;
    },

    updateKanbanButtonState(modalTitle, form) {
        const btn = document.getElementById('modal-kanban');
        if (!btn) return;
        const canUse = this.canCreateKanbanFromForms() && form && form.id === 'crud-form';
        if (!canUse) {
            btn.classList.add('hidden');
            btn.removeAttribute('data-kanban-prefill');
            return;
        }

        const prefill = this.buildKanbanPrefillFromForm(modalTitle, form);
        btn.setAttribute('data-kanban-prefill', JSON.stringify(prefill));
        btn.classList.remove('hidden');
    },

    buildKanbanPrefillFromForm(modalTitle, form) {
        const fd = new FormData(form);
        const moduleKey = form.dataset && form.dataset.module ? String(form.dataset.module) : '';
        const recId = form.dataset && form.dataset.id ? String(form.dataset.id) : '';

        const labels = {
            leads: 'Lead',
            clientes: 'Cliente',
            contatos: 'Contato',
            campanhas: 'Campanha',
            eventos: 'Evento',
            projetos: 'Projeto',
            custos: 'Custo',
            transacoes: 'Despesa',
            contasReceber: 'Conta a Receber',
            tarefas_administrativas: 'Tarefa Administrativa',
            demandasJuridicas: 'Demanda Jurídica',
            adicionais: 'Adicional',
            usuarios: 'Usuário'
        };
        const label = labels[moduleKey] || (moduleKey ? moduleKey : 'Registro');

        const pick = (...keys) => {
            for (const k of keys) {
                const v = fd.get(k);
                if (v != null && String(v).trim() !== '') return String(v).trim();
            }
            return '';
        };

        const nome = pick('nome', 'titulo', 'empresa', 'cliente', 'razaoSocial', 'assunto', 'evento', 'email', 'telefone');
        const titulo = nome ? `[${label}] ${nome}` : (modalTitle ? `[${label}] ${String(modalTitle)}` : `[${label}]`);

        const descricaoParts = [];
        if (label) descricaoParts.push(`Origem: ${label}${recId ? ` #${recId}` : ''}${moduleKey ? ` (${moduleKey})` : ''}`);
        const email = pick('email');
        const telefone = pick('telefone', 'celular', 'whatsapp');
        const cidade = pick('cidade');
        if (email) descricaoParts.push(`Email: ${email}`);
        if (telefone) descricaoParts.push(`Telefone: ${telefone}`);
        if (cidade) descricaoParts.push(`Cidade: ${cidade}`);
        const obs = pick('observacoes', 'descricao');
        if (obs) descricaoParts.push(obs);

        const tags = [];
        if (moduleKey) tags.push(moduleKey);
        if (label && label.toLowerCase() !== moduleKey.toLowerCase()) tags.push(label.toLowerCase());

        return {
            titulo,
            descricao: descricaoParts.join('\n'),
            tags
        };
    },

    openKanbanFromCurrentForm() {
        const btn = document.getElementById('modal-kanban');
        if (!btn) return;
        const raw = btn.getAttribute('data-kanban-prefill') || '';
        let prefill = {};
        try { prefill = raw ? JSON.parse(raw) : {}; } catch { prefill = {}; }

        const open = () => {
            try {
                if (window.KanbanSystem && typeof window.KanbanSystem.init === 'function') window.KanbanSystem.init();
                if (window.KanbanSystem && typeof window.KanbanSystem.showTaskFormWithPrefill === 'function') {
                    window.KanbanSystem.showTaskFormWithPrefill(prefill, 'todo');
                } else if (window.KanbanSystem && typeof window.KanbanSystem.showTaskForm === 'function') {
                    window.KanbanSystem.showTaskForm('todo');
                }
            } catch (e) {
                console.warn('[FormSystem] Falha ao abrir Kanban:', e);
            }
        };

        this.closeModal();

        if (window.NavigationSystem && typeof window.NavigationSystem.ensureKanbanSystemReady === 'function') {
            window.NavigationSystem.ensureKanbanSystemReady(open);
        } else {
            open();
        }
    },

    // Fechar modal
    closeModal() {
        console.log('[FormSystem] Fechando modal...');
        const overlay = document.getElementById(this.config.overlayId);
        if (overlay) {
            overlay.classList.add('hidden');
            // Resetar flag de foco para próxima abertura
            delete overlay.dataset.focusApplied;
        }
        // Restaurar o rodapé externo para o próximo modal que precisar dele
        try {
            const footer = document.getElementById('modal-footer');
            if (footer) footer.classList.remove('hidden');
        } catch {}
        try {
            const lists = document.querySelectorAll('datalist[data-cc-centro-custo="1"]');
            lists.forEach(el => el.remove());
            const dropdowns = document.querySelectorAll('div[data-cc-centro-custo-dropdown="1"]');
            dropdowns.forEach(el => el.remove());
            if (this._ccDatalistIds && typeof this._ccDatalistIds.clear === 'function') {
                this._ccDatalistIds.clear();
            }
        } catch {}
    },

    getCurrentUserId() {
        try {
            const u = window.AuthSystem && AuthSystem.currentUser ? AuthSystem.currentUser : null;
            if (u && u.id != null) return String(u.id);
        } catch {}
        try {
            const v = localStorage.getItem('sams_last_user_id') || '';
            return v ? String(v) : '';
        } catch {
            return '';
        }
    },

    trackUiEvent(name, module, meta) {
        try {
            if (window.CrmTelemetry && typeof window.CrmTelemetry.track === 'function') {
                window.CrmTelemetry.track(name, module, meta && typeof meta === 'object' ? meta : undefined);
            }
        } catch {}
    },

    getSmartDefaultsKey() {
        const uid = this.getCurrentUserId();
        if (!uid) return '';
        return `sams_smart_defaults_${uid}`;
    },

    readSmartDefaults() {
        try {
            const key = this.getSmartDefaultsKey();
            if (!key) return {};
            const raw = localStorage.getItem(key);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return {};
            return parsed;
        } catch {
            return {};
        }
    },

    writeSmartDefaults(payload) {
        try {
            const key = this.getSmartDefaultsKey();
            if (!key) return;
            const data = payload && typeof payload === 'object' ? payload : {};
            localStorage.setItem(key, JSON.stringify({ ...data, _at: Date.now() }));
        } catch {}
    },

    collectSmartDefaultsFromForm(form) {
        const out = {};
        if (!form || !form.elements) return out;
        const blocked = /(^|_)(nome|email|telefone|whatsapp|cpf|cnpj|endereco|rua|numero|cep|bairro|cidade|estado)(_|$)/i;
        const allowedModuleField = (el) => {
            const tag = (el.tagName || '').toLowerCase();
            const type = (el.type || '').toLowerCase();
            if (type === 'hidden' || type === 'password' || type === 'file') return false;
            if (tag === 'select') return true;
            if (type === 'checkbox' || type === 'radio') return true;
            if (el && el.dataset && el.dataset.smartDefault === '1') return true;
            return false;
        };

        for (const el of Array.from(form.elements)) {
            if (!el) continue;
            const name = el.name != null ? String(el.name) : '';
            if (!name) continue;
            if (name.endsWith('[]')) continue;
            if (blocked.test(name)) continue;
            if (!allowedModuleField(el)) continue;

            const tag = (el.tagName || '').toLowerCase();
            const type = (el.type || '').toLowerCase();

            if (type === 'checkbox') {
                if (el.checked) out[name] = true;
                continue;
            }
            if (type === 'radio') {
                if (el.checked && el.value != null && String(el.value).trim() !== '') out[name] = String(el.value);
                continue;
            }
            if (tag === 'select') {
                const v = el.value != null ? String(el.value).trim() : '';
                if (v) out[name] = v;
                continue;
            }
        }
        return out;
    },

    storeSmartDefaults(module, form) {
        try {
            const cfg = window.CrmUiConfig;
            if (cfg && cfg.features && cfg.features.personalizationSmartDefaults === false) return;
        } catch {}
        const m = module != null ? String(module) : '';
        if (!m) return;
        const collected = this.collectSmartDefaultsFromForm(form);
        if (!collected || typeof collected !== 'object' || !Object.keys(collected).length) return;
        const all = this.readSmartDefaults();
        all[m] = { ...(all[m] || {}), ...collected };
        this.writeSmartDefaults(all);
    },

    applySmartDefaults(module, rootElement) {
        try {
            const cfg = window.CrmUiConfig;
            if (cfg && cfg.features && cfg.features.personalizationSmartDefaults === false) return;
        } catch {}
        const m = module != null ? String(module) : '';
        if (!m) return;
        const root = rootElement || document.getElementById('modal-content') || document;
        const form = root.querySelector('form#crud-form');
        if (!form) return;
        if (form.getAttribute('data-smart-defaults-applied') === '1') return;
        form.setAttribute('data-smart-defaults-applied', '1');

        const all = this.readSmartDefaults();
        const defs = all && all[m] && typeof all[m] === 'object' ? all[m] : null;
        if (!defs) return;

        const esc = (v) => (window.CSS && typeof window.CSS.escape === 'function') ? window.CSS.escape(String(v)) : String(v);
        const setIfEmpty = (name, value) => {
            if (value == null) return;
            const el = form.querySelector(`[name="${esc(name)}"]`);
            if (!el) return;
            const tag = (el.tagName || '').toLowerCase();
            const type = (el.type || '').toLowerCase();
            if (type === 'checkbox') {
                if (!el.checked && value === true) {
                    el.checked = true;
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
                return;
            }
            if (type === 'radio') {
                const already = form.querySelector(`[name="${esc(name)}"]:checked`);
                if (already) return;
                const target = form.querySelector(`[name="${esc(name)}"][value="${esc(value)}"]`);
                if (target) {
                    target.checked = true;
                    target.dispatchEvent(new Event('change', { bubbles: true }));
                }
                return;
            }
            if (tag === 'select') {
                const cur = el.value != null ? String(el.value).trim() : '';
                if (cur) return;
                el.value = String(value);
                el.dispatchEvent(new Event('change', { bubbles: true }));
                return;
            }
        };

        for (const k of Object.keys(defs)) {
            setIfEmpty(k, defs[k]);
        }
    },

    // Processar salvamento
    async handleSave(event) {
        console.log('[FormSystem] Processando salvamento...');

        // Evitar dupla submissão do mesmo formulário
        if (this._isSaving) {
            console.warn('[FormSystem] Salvamento já em andamento, ignorando submissão duplicada.');
            return;
        }

        this._isSaving = true;
        try {
            
            const form = document.getElementById('crud-form');
            if (!form) {
                console.error('[FormSystem] Formulário não encontrado');
            return;
            }

            const formData = new FormData(form);
            const data = {};

            for (let [key, value] of formData.entries()) {
                const cleanValue = typeof value === 'string' ? value.trim() : value;
                if (cleanValue === '' || cleanValue === null || cleanValue === undefined) continue;

                const normalizedKey = typeof key === 'string' && key.endsWith('[]') ? key.slice(0, -2) : key;
                if (data[normalizedKey] === undefined) {
                    data[normalizedKey] = cleanValue;
                } else if (Array.isArray(data[normalizedKey])) {
                    data[normalizedKey].push(cleanValue);
                } else {
                    data[normalizedKey] = [data[normalizedKey], cleanValue];
                }
            }
            
            console.log('[FormSystem] Dados coletados do formulário:', data);

            const action = form.dataset.action;
            const module = form.dataset.module;
            const id = form.dataset.id;

            const notifyError = (msg) => {
                if (window.NotificationSystem && typeof window.NotificationSystem.error === 'function') {
                    window.NotificationSystem.error(msg);
                } else {
                    alert(msg);
                }
            };

            const readFileAsBase64 = async (file) => {
                const f = file;
                return await new Promise((resolve, reject) => {
                    try {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const res = reader.result != null ? String(reader.result) : '';
                            const base64 = res.includes('base64,') ? res.split('base64,').pop() : res;
                            resolve(String(base64 || ''));
                        };
                        reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
                        reader.readAsDataURL(f);
                    } catch (e) {
                        reject(e);
                    }
                });
            };

            try {
                const comprovanteFromData = data.comprovante;
                if (comprovanteFromData && typeof comprovanteFromData === 'object' && comprovanteFromData instanceof File) {
                    delete data.comprovante;
                }
            } catch {}

            if (module === 'transacoes' || module === 'contasReceber') {
                const fileInput = form.querySelector('input[name="comprovante"]');
                const file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;

                const statusRaw = data.status != null ? String(data.status) : '';
                const isPaid = statusRaw.trim().toLowerCase() === 'pago';

                const getExistingHasComprovante = () => {
                    try {
                        if (!window.ModuleSystem || !ModuleSystem.data) return false;
                        if (module === 'transacoes') {
                            const list = Array.isArray(ModuleSystem.data.transacoes) ? ModuleSystem.data.transacoes : [];
                            const t = id ? list.find(x => x && x.id != null && String(x.id) === String(id)) : null;
                            return !!(t && (t.comprovanteDataBase64 || t.comprovante_data_base64 || t.comprovanteNome || t.comprovante_nome));
                        }
                        if (module === 'contasReceber') {
                            const list = Array.isArray(ModuleSystem.data.contasReceber) ? ModuleSystem.data.contasReceber : [];
                            const c = id ? list.find(x => x && x.id != null && String(x.id) === String(id)) : null;
                            const comp = c && c.comprovante && typeof c.comprovante === 'object' ? c.comprovante : null;
                            return !!(comp && comp.nome) || !!(c && (c.comprovanteNome || c.comprovante_nome));
                        }
                        return false;
                    } catch {
                        return false;
                    }
                };

                if (module === 'transacoes') {
                    const recorrencia = data.recorrencia != null ? String(data.recorrencia) : '';
                    const qtdRaw = data.recorrenciaQtd != null ? data.recorrenciaQtd : (data.recorrencia_qtd != null ? data.recorrencia_qtd : null);
                    const qtd = qtdRaw != null && String(qtdRaw).trim() !== '' ? parseInt(String(qtdRaw), 10) : 1;
                    const isRecorrente = recorrencia && recorrencia !== 'nenhuma' && Number.isFinite(qtd) && qtd > 1;
                    if (isPaid && isRecorrente) {
                        notifyError('Para despesas recorrentes, cadastre como Pendente e anexe o comprovante ao pagar cada parcela.');
                        return;
                    }
                }

                // Comprovante agora é opcional, mesmo para status Pago

                if (file) {
                    const maxBytes = module === 'contasReceber' ? (12 * 1024 * 1024) : (4 * 1024 * 1024);
                    if (file.size > maxBytes) {
                        notifyError(`Comprovante muito grande. Limite: ${module === 'contasReceber' ? '12MB' : '4MB'}.`);
                        return;
                    }
                    const base64 = await readFileAsBase64(file);
                    if (!base64) {
                        notifyError('Comprovante inválido.');
                        return;
                    }
                    if (module === 'transacoes') {
                        data.comprovanteNome = file.name || 'comprovante';
                        data.comprovanteMime = file.type || null;
                    } else {
                        data.comprovanteName = file.name || 'comprovante';
                        data.comprovanteMime = file.type || null;
                    }
                    data.comprovanteDataBase64 = base64;
                }
            }

            // Validar dados se ValidationSystem estiver disponível
            if (window.ValidationSystem && typeof window.ValidationSystem.validateForm === 'function') {
                try {
                    const isValid = window.ValidationSystem.validateForm(module, data);
                    if (!isValid) {
                        const errors = window.ValidationSystem.getValidationErrors();
                        console.warn('[FormSystem] Validação falhou:', errors);
                        console.warn('[FormSystem] Detalhes dos erros de validação:', JSON.stringify(errors, null, 2));
                        
                        // Mostrar erros específicos para debugging
                        if (Array.isArray(errors) && errors.length > 0) {
                            errors.forEach((error, index) => {
                                console.warn(`[FormSystem] Erro ${index + 1}:`, error);
                            });
                        }
                        
                        return; // Parar se validação falhar
                    }
                } catch (validationError) {
                    console.warn('[FormSystem] Erro na validação, continuando sem validação:', validationError);
                }
            }

            console.log('[FormSystem] Dados do formulário:', { action, module, id, data });

            // Processar baseado na ação
            if (action === 'create') {
                const createdId = await this.createItem(module, data);
                try { this.storeSmartDefaults(module, form); } catch {}
                this.trackUiEvent('form_save', module, { action: 'create', ok: createdId != null });
            } else if (action === 'update') {
                await this.updateItem(module, id, data);
                try { this.storeSmartDefaults(module, form); } catch {}
                this.trackUiEvent('form_save', module, { action: 'update', ok: true });
            }
        } finally {
            this._isSaving = false;
        }
    },

    // Criar item
    async createItem(module, data) {
        try {
            console.log('[FormSystem] Criando item:', module, data);
            let createdId = null;
            
            // Conversões específicas por módulo
            if (module === 'transacoes') {
                if (typeof data.valor === 'string') {
                    const parsed = parseFloat(data.valor);
                    if (!isNaN(parsed)) data.valor = parsed;
                }
                if (!data.data) {
                    const today = new Date();
                    const yyyy = today.getFullYear();
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    data.data = `${yyyy}-${mm}-${dd}`;
                }
            }
            if (module === 'contasReceber') {
                if (typeof data.valor === 'string') {
                    const parsed = parseFloat(String(data.valor).replace(',', '.'));
                    if (!isNaN(parsed)) data.valor = parsed;
                }
                if (data.clienteId != null && data.clienteId !== '') data.clienteId = Number(data.clienteId); else data.clienteId = null;
                if (data.vendaId != null && data.vendaId !== '') data.vendaId = Number(data.vendaId); else data.vendaId = null;
                if ((data.clienteNome == null || data.clienteNome === '') && data.clienteId != null && data.clienteId !== '' && window.ModuleSystem && ModuleSystem.data) {
                    const cid = String(data.clienteId);
                    const all = [
                        ...(Array.isArray(ModuleSystem.data.clientes) ? ModuleSystem.data.clientes : []),
                        ...(Array.isArray(ModuleSystem.data.leads) ? ModuleSystem.data.leads : [])
                    ];
                    const found = all.find(c => c && c.id != null && String(c.id) === cid);
                    if (found) {
                        data.clienteNome = found.nome || found.razao_social || found.empresa || data.clienteNome;
                        if (found.email && !data.clienteEmail) data.clienteEmail = found.email;
                    }
                }
                if ((data.centroCusto == null || data.centroCusto === '') && data.centro_custo != null && data.centro_custo !== '') {
                    data.centroCusto = data.centro_custo;
                }
                if (data.centroCusto != null && String(data.centroCusto).trim() !== '') {
                    const cc = String(data.centroCusto).trim();
                    data.centroCusto = cc;
                    data.centro_custo = cc;
                }
                if (!data.status) data.status = 'Pendente';
                if (!data.tipoReceita) data.tipoReceita = 'stand';
                // NÃO preencher vencimento automaticamente - o campo é obrigatório (required)
                // e deve ser preenchido explicitamente pelo usuário
                if (!data.vencimento || String(data.vencimento).trim() === '') {
                    delete data.vencimento; // deixa o backend rejeitar com 400 se vier vazio
                }
                if (data.status === 'Pago' && !data.dataPagamento) {
                    const today = new Date();
                    const yyyy = today.getFullYear();
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    data.dataPagamento = `${yyyy}-${mm}-${dd}`;
                }
            }
            // Conversões específicas para eventos
            if (module === 'eventos') {
                try {
                    const taxas = {};
                    ['limpeza','eletrica','hidraulica'].forEach(k => {
                        const raw = data[`taxas_${k}`];
                        if (raw !== undefined && raw !== null && raw !== '') {
                            const num = typeof raw === 'string' ? parseFloat(raw) : raw;
                            if (!isNaN(num)) taxas[k] = num;
                        }
                        delete data[`taxas_${k}`];
                    });
                    if (Object.keys(taxas).length > 0) {
                        data.taxas = taxas;
                    }
                    if (!data.status) data.status = 'Planejado';
                } catch (e) {
                    console.warn('[FormSystem] Falha ao normalizar dados de eventos:', e);
                }
            }
            
            const normalizeLeadStatus = (v) => {
                const raw = v != null ? String(v).trim() : '';
                if (!raw) return 'novo';
                const low = raw.toLowerCase();
                const map = {
                    'novo': 'novo',
                    'contatado': 'contato',
                    'contato': 'contato',
                    'qualificado': 'qualificado',
                    'proposta enviada': 'proposta_enviada',
                    'proposta_enviada': 'proposta_enviada',
                    'negociação': 'negociacao',
                    'negociacao': 'negociacao',
                    'convertido': 'convertido',
                    'perdido': 'perdido',
                    'inativo': 'inativo'
                };
                return map[low] || low;
            };

            const normalizeNivelInteresse = (v) => {
                const raw = v != null ? String(v).trim() : '';
                if (!raw) return null;
                const low = raw.toLowerCase();
                if (low === 'baixo') return 'Baixo';
                if (low === 'médio' || low === 'medio') return 'Médio';
                if (low === 'alto') return 'Alto';
                if (low === 'muito alto' || low === 'muito_alto' || low === 'muitoalto') return 'Muito Alto';
                return raw;
            };

            const deriveTemperaturaFromNivelInteresse = (nivel) => {
                const n = normalizeNivelInteresse(nivel);
                if (!n) return null;
                if (n === 'Baixo') return 'frio';
                if (n === 'Médio') return 'morno';
                if (n === 'Alto') return 'quente';
                if (n === 'Muito Alto') return 'quente';
                return null;
            };

            // Fluxo especial para leads: tentar sincronizar com backend, com fallback local
            if (module === 'leads' || module === 'marketing_leads') {
                const normalizeOrigem = (v) => {
                    const raw = v != null ? String(v).trim() : '';
                    if (!raw) return '';
                    const low = raw.toLowerCase();
                    const map = {
                        'site institucional': 'site_institucional',
                        'site': 'site_organico',
                        'site_organico': 'site_organico',
                        'redes sociais': 'instagram',
                        'redes_sociais': 'instagram',
                        'instagram': 'instagram',
                        'facebook ads': 'facebook_ads',
                        'linkedin ads': 'linkedin_ads',
                        'indicação': 'indicacao',
                        'indicacao': 'indicacao',
                        'google ads': 'google_ads',
                        'google_ads': 'google_ads',
                        'whatsapp': 'whatsapp',
                        'whatsapp business': 'whatsapp_business',
                        'email': 'email',
                        'email marketing': 'email_marketing',
                        'feira': 'feira',
                        'evento/feira': 'evento_feira',
                        'evento feira': 'evento_feira',
                        'telemarketing': 'telemarketing',
                        'direto': 'direto',
                        'outros': 'direto'
                    };
                    return map[low] || raw;
                };

                // Garantir que a data de contato esteja definida (YYYY-MM-DD)
                try {
                    if (!data.dataContato) {
                        if (data.data) {
                            data.dataContato = data.data;
                        } else {
                            const today = new Date();
                            const yyyy = today.getFullYear();
                            const mm = String(today.getMonth() + 1).padStart(2, '0');
                            const dd = String(today.getDate()).padStart(2, '0');
                            data.dataContato = `${yyyy}-${mm}-${dd}`;
                        }
                    }
                } catch (e) {
                    console.warn('[FormSystem] Falha ao calcular dataContato, seguindo sem definir:', e);
                }

                try {
                    const resp = await fetch('/api/crm/leads', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            nome: data.nome || '',
                            email: data.email || '',
                            telefone: data.telefone || '',
                            whatsapp: data.whatsapp || null,
                            status: normalizeLeadStatus(data.status),
                            empresa: data.empresa || null,
                            cargo: data.cargo || null,
                            origem: normalizeOrigem(data.origem),
                            segmento: data.segmento || null,
                            evento_interesse: data.evento_interesse || data.eventoInteresse || null,
                            metragem_estimada: data.metragem_estimada || data.metragemEstimada || null,
                            temperatura: data.temperatura || deriveTemperaturaFromNivelInteresse(data.nivel_interesse || data.nivelInteresse),
                            nivel_interesse: normalizeNivelInteresse(data.nivel_interesse || data.nivelInteresse),
                            interesses: data.interesses ? (Array.isArray(data.interesses) ? data.interesses : [data.interesses]) : [],
                            orcamento_estimado: data.orcamento_estimado || data.orcamentoEstimado || null,
                            prazo_projeto: data.prazo_projeto || data.prazoProjeto || null,
                            proximos_passos: data.proximos_passos || data.proximosPassos || null,
                            observacoes: data.observacoes || null,
                            proximo_contato: data.proximo_contato || data.proximoContato || null
                        })
                    });
                    const payload = await resp.json().catch(() => ({}));
                    if (resp.ok && payload && payload.id) {
                        // Salvar localmente com ID do backend para evitar divergência
                        const newItem = { ...data, id: payload.id };
                        if (window.ModuleSystem && typeof ModuleSystem.addItem === 'function') {
                            ModuleSystem.addItem('leads', newItem);
                        }
                        createdId = payload.id;
                    } else {
                        const msg = (payload && payload.error) ? payload.error : 'Falha ao salvar lead no servidor';
                        this._notifyOnce('lead_create_err', msg, 'error');
                        console.warn('[FormSystem] POST /api/leads não OK, usando fallback local');
                        if (window.ModuleSystem && typeof ModuleSystem.addItem === 'function') {
                            createdId = ModuleSystem.addItem('leads', { ...data, _localOnly: true });
                        }
                    }
                } catch (err) {
                    this._notifyOnce('lead_create_err', 'Falha ao salvar lead no servidor', 'error');
                    console.warn('[FormSystem] Falha ao criar lead no backend, usando fallback local:', err);
                    if (window.ModuleSystem && typeof ModuleSystem.addItem === 'function') {
                        createdId = ModuleSystem.addItem('leads', { ...data, _localOnly: true });
                    }
                }
            } else if (module === 'contatos' || module === 'marketing_contatos') {
                try {
                    const resp = await fetch('/api/crm/contatos', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            nome: data.nome || '',
                            email: data.email || null,
                            telefone: data.telefone || null,
                            whatsapp: data.whatsapp || null,
                            empresa: data.empresa || null,
                            cargo: data.cargo || null,
                            segmento: data.segmento || null,
                            status: data.status || 'Ativo',
                            tags: data.tags || null,
                            observacoes: data.observacoes || null,
                            origem: data.origem || null,
                            aniversario: data.aniversario || data.data_aniversario || data.dataAniversario || null,
                            datas_importantes: data.datas_importantes || data.datasImportantes || null,
                            responsavel_id: data.responsavel_id ?? data.responsavelId ?? null,
                            lead_id: data.lead_id ?? data.leadId ?? null,
                            cliente_id: data.cliente_id ?? data.clienteId ?? null
                        })
                    });
                    const payload = await resp.json().catch(() => ({}));
                    if (resp.ok && payload && payload.id != null) {
                        const newItem = { ...data, id: payload.id };
                        if (window.ModuleSystem && typeof ModuleSystem.addItem === 'function') {
                            ModuleSystem.addItem('contatos', newItem);
                        }
                        createdId = payload.id;
                    } else {
                        console.warn('[FormSystem] POST /api/contatos não OK, usando fallback local');
                        if (window.ModuleSystem && typeof ModuleSystem.addItem === 'function') {
                            createdId = ModuleSystem.addItem('contatos', { ...data, _localOnly: true });
                        }
                    }
                } catch (err) {
                    console.warn('[FormSystem] Falha ao criar contato no backend, usando fallback local:', err);
                    if (window.ModuleSystem && typeof ModuleSystem.addItem === 'function') {
                        createdId = ModuleSystem.addItem('contatos', { ...data, _localOnly: true });
                    }
                }
            } else if (module === 'eventos') {
                try {
                    const resp = await fetch('/api/crm/eventos', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(data)
                    });
                    const payload = await resp.json().catch(() => ({}));
                    if (resp.ok && payload && payload.id != null) {
                        const newItem = { ...data, id: payload.id };
                        if (window.ModuleSystem && typeof ModuleSystem.addItem === 'function') {
                            ModuleSystem.addItem('eventos', newItem);
                        }
                        createdId = payload.id;
                    } else {
                        console.warn('[FormSystem] POST /api/eventos não OK, usando fallback local');
                        if (window.ModuleSystem && typeof ModuleSystem.addItem === 'function') {
                            createdId = ModuleSystem.addItem('eventos', { ...data });
                        }
                    }
                } catch (err) {
                    console.warn('[FormSystem] Falha ao criar evento no backend, usando fallback local:', err);
                    if (window.ModuleSystem && typeof ModuleSystem.addItem === 'function') {
                        createdId = ModuleSystem.addItem('eventos', { ...data });
                    }
                }
            } else if (module === 'projetos') {
                const toNum = (v) => {
                    if (v == null || v === '') return null;
                    const n = Number(String(v).replace(',', '.'));
                    return Number.isFinite(n) ? n : null;
                };
                const toInt = (v) => {
                    const n = toNum(v);
                    return Number.isFinite(n) ? Math.trunc(n) : null;
                };
                const normStatus = (v) => {
                    const s = v != null ? String(v).trim().toLowerCase() : '';
                    const map = { planejamento: 'recebido', em_andamento: 'em_elaboracao', pausado: 'aguardando_revisao', concluido: 'finalizado' };
                    const out = map[s] || s;
                    const allowed = new Set(['recebido','em_elaboracao','aguardando_revisao','revisao_cliente','aprovado','finalizado','cancelado']);
                    return allowed.has(out) ? out : 'recebido';
                };
                const payload = {
                    titulo: data.nome || '',
                    descricao: data.descricao != null && String(data.descricao).trim() !== '' ? String(data.descricao) : null,
                    observacoes: data.observacoes != null && String(data.observacoes).trim() !== '' ? String(data.observacoes) : null,
                    briefing_id: toInt(data.briefing_id ?? data.briefingId),
                    oportunidade_id: toInt(data.oportunidade_id ?? data.oportunidadeId ?? data.oportunidade),
                    responsavel_id: toInt(data.responsavel_id ?? data.gerente_id ?? data.responsavelId ?? data.gerenteId),
                    area_m2: toNum(data.area_m2 ?? data.areaM2),
                    tipo_stand: data.tipo_stand != null && String(data.tipo_stand).trim() !== '' ? String(data.tipo_stand).trim() : null,
                    status: normStatus(data.status),
                    custo_estimado: toNum(data.custo_estimado ?? data.custoEstimado),
                    comissao_percentual: toNum(data.comissao_percentual ?? data.comissaoPercentual)
                };
                try {
                    const resp = await fetch('/api/crm/projetos', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(payload)
                    });
                    const json = await resp.json().catch(() => ({}));
                    if (resp.ok && json && json.id != null) {
                        const newItem = {
                            ...data,
                            id: json.id,
                            nome: data.nome || payload.titulo,
                            briefing_id: payload.briefing_id,
                            oportunidade_id: payload.oportunidade_id,
                            responsavel_id: payload.responsavel_id,
                            area_m2: payload.area_m2,
                            tipo_stand: payload.tipo_stand,
                            status: payload.status,
                            custo_estimado: payload.custo_estimado,
                            comissao_percentual: payload.comissao_percentual
                        };
                        if (window.ModuleSystem && typeof ModuleSystem.addItem === 'function') {
                            ModuleSystem.addItem('projetos', newItem);
                        }
                        createdId = json.id;
                    } else {
                        console.warn('[FormSystem] POST /api/projetos não OK, usando fallback local');
                        if (window.ModuleSystem && typeof ModuleSystem.addItem === 'function') {
                            createdId = ModuleSystem.addItem('projetos', { ...data, status: payload.status });
                        }
                    }
                } catch (err) {
                    console.warn('[FormSystem] Falha ao criar projeto no backend, usando fallback local:', err);
                    if (window.ModuleSystem && typeof ModuleSystem.addItem === 'function') {
                        createdId = ModuleSystem.addItem('projetos', { ...data, status: payload.status });
                    }
                }
            } else if (module === 'memoriais') {
                try {
                    const projetoId = data.projeto_id ? Number(data.projeto_id) : null;
                    if (!projetoId) throw new Error('projeto_id é obrigatório');
                    const mkList = (text) => String(text || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                    const mobiliario = mkList(data.mobiliario_linhas).map(line => {
                        const m = line.match(/^(\d+)[xX]\s*(.+)$/);
                        if (m) return { quantidade: Number(m[1]), descricao: m[2] };
                        return { quantidade: 1, descricao: line };
                    });
                    const eletrica = mkList(data.eletrica_linhas).map(s => ({ item: s }));
                    const comunicacao = mkList(data.comunicacao_linhas).map(s => ({ item: s }));
                    const conteudo = {
                        cliente: data.cliente ?? null,
                        evento: data.evento ?? null,
                        local: data.local ?? null,
                        data_evento: data.data_evento ?? null,
                        area_m2: data.area_m2 != null && data.area_m2 !== '' ? Number(String(data.area_m2).replace(',', '.')) : null,
                        numero_projeto: data.numero_projeto ?? null,
                        data_emissao: data.data_emissao ?? null,
                        aprovacao_ate: data.aprovacao_ate ?? null,
                        piso: data.piso ?? null,
                        fachada: data.fachada ?? null,
                        deposito_copa: data.deposito_copa ?? null,
                        circulacao_exposicao: data.circulacao_exposicao ?? null,
                        mobiliario,
                        eletrica_iluminacao: eletrica,
                        comunicacao_visual: comunicacao,
                        manutencao: data.manutencao ?? null,
                        observacoes: data.observacoes ?? null,
                        valor_total: data.valor_total != null && data.valor_total !== '' ? Number(String(data.valor_total).replace(',', '.')) : null,
                        valor_por_extenso: data.valor_por_extenso ?? null,
                        assinante_cliente: data.assinante_cliente ?? null,
                        data_assinatura_cliente: data.data_assinatura_cliente ?? null,
                        responsavel_sams: data.responsavel_sams ?? null,
                        data_responsavel_sams: data.data_responsavel_sams ?? null
                    };
                    const payload = {
                        titulo: data.titulo || '',
                        status: data.status || 'rascunho',
                        aprovado_por: data.aprovado_por || null,
                        data_aprovacao: data.data_aprovacao || null,
                        valido_ate: data.valido_ate || null,
                        arquivo_url: data.arquivo_url || null,
                        arquivo_nome: data.arquivo_nome || null,
                        arquivo_tipo: data.arquivo_tipo || null,
                        conteudo_json: JSON.stringify(conteudo)
                    };
                    const resp = await fetch(`/api/crm/projetos/${projetoId}/memoriais`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(payload)
                    });
                    const json = await resp.json().catch(() => ({}));
                    if (resp.ok && json && json.id != null) {
                        const newItem = { ...payload, id: json.id, projeto_id: projetoId, versao: json.versao };
                        if (window.ModuleSystem && typeof ModuleSystem.addItem === 'function') {
                            ModuleSystem.addItem('memoriais', newItem);
                        }
                        createdId = json.id;
                    } else {
                        console.warn('[FormSystem] POST /api/projetos/:id/memoriais não OK');
                        if (window.NotificationSystem && typeof window.NotificationSystem.error === 'function') {
                            window.NotificationSystem.error('Falha ao criar memorial no servidor');
                        }
                    }
                } catch (err) {
                    console.warn('[FormSystem] Falha ao criar memorial:', err);
                    if (window.NotificationSystem && typeof window.NotificationSystem.error === 'function') {
                        window.NotificationSystem.error('Falha ao criar memorial');
                    }
                }
            } else if (module === 'briefings') {
                try {
                    const resp = await fetch('/api/crm/briefings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(data)
                    });
                    const payload = await resp.json().catch(() => ({}));
                    if (resp.ok && payload && payload.id != null) {
                        const newItem = { ...data, id: payload.id };
                        if (window.ModuleSystem && typeof ModuleSystem.addItem === 'function') {
                            ModuleSystem.addItem('briefings', newItem);
                        }
                        createdId = payload.id;
                    } else {
                        console.warn('[FormSystem] POST /api/briefings não OK, usando fallback local');
                        if (window.ModuleSystem && typeof ModuleSystem.addItem === 'function') {
                            createdId = ModuleSystem.addItem('briefings', { ...data });
                        }
                    }
                } catch (err) {
                    console.warn('[FormSystem] Falha ao criar briefing no backend, usando fallback local:', err);
                    if (window.ModuleSystem && typeof ModuleSystem.addItem === 'function') {
                        createdId = ModuleSystem.addItem('briefings', { ...data });
                    }
                }
            } else if (module === 'transacoes') {
                const parseYmd = (s) => {
                    const raw = s != null ? String(s).trim() : '';
                    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                    if (!m) return null;
                    const y = Number(m[1]);
                    const mo = Number(m[2]);
                    const d = Number(m[3]);
                    if (!y || !mo || !d) return null;
                    return new Date(y, mo - 1, d);
                };
                const formatYmd = (dt) => {
                    const yyyy = dt.getFullYear();
                    const mm = String(dt.getMonth() + 1).padStart(2, '0');
                    const dd = String(dt.getDate()).padStart(2, '0');
                    return `${yyyy}-${mm}-${dd}`;
                };
                const addDays = (base, days) => {
                    const dt = new Date(base.getFullYear(), base.getMonth(), base.getDate());
                    dt.setDate(dt.getDate() + Number(days || 0));
                    return dt;
                };
                const addMonths = (base, monthsToAdd) => {
                    const day = base.getDate();
                    const totalMonths = (base.getFullYear() * 12) + base.getMonth() + Number(monthsToAdd || 0);
                    const y = Math.floor(totalMonths / 12);
                    const m = totalMonths % 12;
                    const lastDay = new Date(y, m + 1, 0).getDate();
                    const d = Math.min(day, lastDay);
                    return new Date(y, m, d);
                };

                const recorrencia = (data.recorrencia != null && String(data.recorrencia).trim() !== '')
                    ? String(data.recorrencia).trim()
                    : 'nenhuma';
                const qtdRaw = data.recorrenciaQtd != null ? data.recorrenciaQtd : (data.recorrencia_qtd != null ? data.recorrencia_qtd : null);
                let recorrenciaQtd = qtdRaw != null && String(qtdRaw).trim() !== '' ? parseInt(String(qtdRaw), 10) : 1;
                if (!Number.isFinite(recorrenciaQtd) || recorrenciaQtd < 1) recorrenciaQtd = 1;
                if (recorrenciaQtd > 240) recorrenciaQtd = 240;

                const baseDate = parseYmd(data.data) || new Date();
                const isRecorrente = recorrencia !== 'nenhuma' && recorrenciaQtd > 1;

                const normalizeItem = (item) => {
                    const out = { ...item };
                    if (out.status == null || String(out.status).trim() === '') out.status = 'Pendente';
                    out.recorrencia = recorrencia;
                    if (isRecorrente) out.recorrenciaQtd = recorrenciaQtd;
                    return out;
                };

                const buildApiPayload = (item) => ({
                    descricao: item.descricao || item.nome || '',
                    tipo: item.tipo || 'pagar',
                    valor: parseFloat(String(item.valor || 0).replace(',', '.')) || 0,
                    status: item.status || 'Pendente',
                    centro_custo: item.centroCusto || item.centro_custo || null,
                    data: item.data || null,
                    observacoes: item.observacoes || null,
                    evento_id: item.eventoId || item.evento_id || null,
                    cliente_id: item.clienteId || item.cliente_id || null,
                    recorrencia: item.recorrencia || 'nenhuma',
                    recorrencia_grupo_id: item.recorrenciaGrupoId || null,
                    recorrencia_indice: item.recorrenciaIndice || null
                });

                const postTransacao = async (item) => {
                    try {
                        const resp = await fetch('/api/crm/transacoes', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify(buildApiPayload(item))
                        });
                        const json = await resp.json().catch(() => ({}));
                        if (resp.ok && json && json.id != null) {
                            return json.id;
                        } else {
                            console.warn('[FormSystem] POST /api/crm/transacoes não OK:', json);
                            // Fallback local
                            if (window.ModuleSystem && typeof ModuleSystem.addItem === 'function') {
                                return ModuleSystem.addItem('transacoes', { ...item, _localOnly: true });
                            }
                        }
                    } catch (err) {
                        console.warn('[FormSystem] Falha ao criar transação no backend, usando fallback local:', err);
                        if (window.ModuleSystem && typeof ModuleSystem.addItem === 'function') {
                            return ModuleSystem.addItem('transacoes', { ...item, _localOnly: true });
                        }
                    }
                    return null;
                };

                if (!isRecorrente) {
                    const payload = normalizeItem({ ...data, recorrenciaQtd: 1 });
                    createdId = await postTransacao(payload);
                } else {
                    const groupId = `rec_${Date.now()}`;
                    const getDueDate = (index) => {
                        switch (recorrencia) {
                            case 'diaria': return addDays(baseDate, index);
                            case 'semanal': return addDays(baseDate, 7 * index);
                            case 'quinzenal': return addDays(baseDate, 14 * index);
                            case 'mensal': return addMonths(baseDate, index);
                            case 'bimestral': return addMonths(baseDate, 2 * index);
                            case 'trimestral': return addMonths(baseDate, 3 * index);
                            case 'semestral': return addMonths(baseDate, 6 * index);
                            case 'anual': return addMonths(baseDate, 12 * index);
                            default: return addMonths(baseDate, index);
                        }
                    };

                    for (let i = 0; i < recorrenciaQtd; i++) {
                        const dt = getDueDate(i);
                        const item = normalizeItem({
                            ...data,
                            data: formatYmd(dt),
                            recorrenciaGrupoId: groupId,
                            recorrenciaIndice: i + 1
                        });
                        if (i > 0) {
                            item.status = 'Pendente';
                            delete item.dataPagamento;
                            delete item.formaPagamento;
                        }
                        const newId = await postTransacao(item);
                        if (i === 0) createdId = newId;
                    }
                }
            } else if (module === 'clientes') {
                try {
                    const payloadToSend = {
                        ...data,
                        documento: data.documento ?? data.cnpj ?? null
                    };
                    const resp = await fetch('/api/crm/clientes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(payloadToSend)
                    });
                    const payload = await resp.json().catch(() => ({}));
                    if (resp.ok && payload && payload.id != null) {
                        const newItem = { ...data, id: payload.id, documento: payloadToSend.documento };
                        if (window.ModuleSystem && typeof ModuleSystem.addItem === 'function') {
                            ModuleSystem.addItem('clientes', newItem);
                        }
                        createdId = payload.id;
                    } else {
                        console.warn('[FormSystem] POST /api/clientes não OK, usando fallback local');
                        if (window.ModuleSystem && typeof ModuleSystem.addItem === 'function') {
                            createdId = ModuleSystem.addItem('clientes', { ...data });
                        }
                    }
                } catch (err) {
                    console.warn('[FormSystem] Falha ao criar cliente no backend, usando fallback local:', err);
                    if (window.ModuleSystem && typeof ModuleSystem.addItem === 'function') {
                        createdId = ModuleSystem.addItem('clientes', { ...data });
                    }
                }
            } else if (module === 'contasReceber') {
                // Delegado ao ContasReceberModule
                if (window.ContasReceberModule && typeof window.ContasReceberModule.handleCreate === 'function') {
                    const result = await window.ContasReceberModule.handleCreate(data);
                    createdId = result.id;
                } else {
                    console.error('[FormSystem] ContasReceberModule não disponível para POST');
                    throw new Error('Módulo de Contas a Receber não carregado.');
                }
                        } else {
                // Delegar geração de ID ao ModuleSystem para demais módulos
                const newItem = { ...data };
                if (window.ModuleSystem && typeof ModuleSystem.addItem === 'function') {
                    const assignedId = ModuleSystem.addItem(module, newItem);
                    console.log('[FormSystem] Item criado com ID atribuído pelo ModuleSystem:', assignedId);
                    createdId = assignedId;
                } else {
                    console.error('[FormSystem] ModuleSystem.addItem não disponível');
                }
            }

            if (module === 'eventos' && createdId != null && window.__samsReturnToBriefingAfterEvent && window.FormSystem && typeof FormSystem.showCreateForm === 'function') {
                const ctx = window.__samsReturnToBriefingAfterEvent;
                try { window.__samsReturnToBriefingAfterEvent = null; } catch {}

                const draft = (ctx && ctx.draft && typeof ctx.draft === 'object') ? ctx.draft : {};
                draft.eventoId = createdId;

                FormSystem.showCreateForm('briefings');
                setTimeout(() => {
                    try {
                        const root = document.getElementById('modal-content') || document;
                        const form = root.querySelector('form#briefing-form');
                        if (!form) return;

                        Object.entries(draft).forEach(([name, value]) => {
                            const el = form.querySelector(`[name="${CSS.escape(name)}"]`);
                            if (!el) return;
                            const tag = (el.tagName || '').toLowerCase();
                            if (tag === 'select' || tag === 'textarea' || tag === 'input') {
                                el.value = value != null ? String(value) : '';
                            }
                        });

                        const eventoSelect = form.querySelector('select[name="eventoId"]');
                        if (eventoSelect) {
                            eventoSelect.value = String(createdId);
                            try { eventoSelect.dispatchEvent(new Event('change', { bubbles: true })); } catch {}
                        }
                    } catch {}
                }, 80);

                return createdId;
            }
            
            // Fechar modal e atualizar interface
            this.closeModal();
            if (module === 'leads' || module === 'marketing_leads') {
                if (window.NavigationSystem && typeof window.NavigationSystem.reloadLeadsList === 'function') {
                    window.NavigationSystem.reloadLeadsList();
                } else if (window.MarketingModule && typeof window.MarketingModule.loadLeads === 'function') {
                    window.MarketingModule.loadLeads();
                } else if (window.NavigationSystem && typeof window.NavigationSystem.reloadCurrentPage === 'function') {
                    window.NavigationSystem.reloadCurrentPage();
                } else if (typeof window !== 'undefined' && window.location) {
                    window.location.reload();
                }
                return createdId;
            }
            if (module === 'contatos' || module === 'marketing_contatos') {
                if (window.NavigationSystem && typeof window.NavigationSystem.reloadContatosList === 'function') {
                    window.NavigationSystem.reloadContatosList();
                } else if (window.MarketingModule && typeof window.MarketingModule.loadContatos === 'function') {
                    window.MarketingModule.loadContatos();
                } else if (window.NavigationSystem && typeof window.NavigationSystem.reloadCurrentPage === 'function') {
                    window.NavigationSystem.reloadCurrentPage();
                }
                return createdId;
            }
            if (module === 'campanhas' || module === 'marketing_campanhas') {
                if (window.NavigationSystem && typeof window.NavigationSystem.reloadCampanhasList === 'function') {
                    window.NavigationSystem.reloadCampanhasList();
                } else if (window.MarketingModule && typeof window.MarketingModule.loadCampanhas === 'function') {
                    window.MarketingModule.loadCampanhas();
                } else if (window.NavigationSystem && typeof window.NavigationSystem.reloadCurrentPage === 'function') {
                    window.NavigationSystem.reloadCurrentPage();
                }
                return createdId;
            }

            const refreshTarget = (module === 'transacoes' || module === 'contasReceber') ? 'financeiro' : module;
            if (window.formIntegration && typeof window.formIntegration.refreshModuleData === 'function') {
                window.formIntegration.refreshModuleData(refreshTarget);
            } else if (window.NavigationSystem && typeof window.NavigationSystem.reloadCurrentPage === 'function') {
                window.NavigationSystem.reloadCurrentPage();
            } else if (window.NavigationSystem && typeof window.NavigationSystem.navigateToModule === 'function') {
                window.NavigationSystem.navigateToModule(refreshTarget);
            } else if (typeof window !== 'undefined' && window.location) {
                window.location.reload();
            }
            return createdId;
        } catch (error) {
            console.error('[FormSystem] Erro ao criar item:', error);
            return null;
        }
    },

    // Atualizar item
    async updateItem(module, id, data) {
        try {
            console.log('[FormSystem] Atualizando item:', module, id, data);
            
            // Conversões específicas por módulo
            if (module === 'transacoes') {
                if (typeof data.valor === 'string') {
                    const parsed = parseFloat(data.valor);
                    if (!isNaN(parsed)) data.valor = parsed;
                }
            }
            if (module === 'contasReceber') {
                if (typeof data.valor === 'string') {
                    const parsed = parseFloat(String(data.valor).replace(',', '.'));
                    if (!isNaN(parsed)) data.valor = parsed;
                }
                if (data.clienteId != null && data.clienteId !== '') data.clienteId = Number(data.clienteId); else data.clienteId = null;
                if (data.vendaId != null && data.vendaId !== '') data.vendaId = Number(data.vendaId); else data.vendaId = null;
                if ((data.clienteNome == null || data.clienteNome === '') && data.clienteId != null && data.clienteId !== '' && window.ModuleSystem && ModuleSystem.data) {
                    const cid = String(data.clienteId);
                    const all = [
                        ...(Array.isArray(ModuleSystem.data.clientes) ? ModuleSystem.data.clientes : []),
                        ...(Array.isArray(ModuleSystem.data.leads) ? ModuleSystem.data.leads : [])
                    ];
                    const found = all.find(c => c && c.id != null && String(c.id) === cid);
                    if (found) {
                        data.clienteNome = found.nome || found.razao_social || found.empresa || data.clienteNome;
                        if (found.email && !data.clienteEmail) data.clienteEmail = found.email;
                    }
                }
                if ((data.centroCusto == null || data.centroCusto === '') && data.centro_custo != null && data.centro_custo !== '') {
                    data.centroCusto = data.centro_custo;
                }
                if (data.centroCusto != null && String(data.centroCusto).trim() !== '') {
                    const cc = String(data.centroCusto).trim();
                    data.centroCusto = cc;
                    data.centro_custo = cc;
                }
                if (data.status === 'Pago' && !data.dataPagamento) {
                    const today = new Date();
                    const yyyy = today.getFullYear();
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    data.dataPagamento = `${yyyy}-${mm}-${dd}`;
                }
            }
            if (module === 'eventos') {
                try {
                    const taxas = {};
                    ['limpeza','eletrica','hidraulica'].forEach(k => {
                        const raw = data[`taxas_${k}`];
                        if (raw !== undefined && raw !== null && raw !== '') {
                            const num = typeof raw === 'string' ? parseFloat(raw) : raw;
                            if (!isNaN(num)) taxas[k] = num;
                        }
                        delete data[`taxas_${k}`];
                    });
                    if (Object.keys(taxas).length > 0) {
                        data.taxas = { ...(data.taxas || {}), ...taxas };
                    }
                } catch {}
            }
            
            if (module === 'leads' || module === 'marketing_leads') {
                const normalizeOrigem = (v) => {
                    const raw = v != null ? String(v).trim() : '';
                    if (!raw) return null;
                    const low = raw.toLowerCase();
                    const map = {
                        'site institucional': 'site_institucional',
                        'site': 'site_organico',
                        'site_organico': 'site_organico',
                        'redes sociais': 'instagram',
                        'redes_sociais': 'instagram',
                        'instagram': 'instagram',
                        'facebook ads': 'facebook_ads',
                        'linkedin ads': 'linkedin_ads',
                        'indicação': 'indicacao',
                        'indicacao': 'indicacao',
                        'google ads': 'google_ads',
                        'google_ads': 'google_ads',
                        'whatsapp': 'whatsapp',
                        'whatsapp business': 'whatsapp_business',
                        'email': 'email',
                        'email marketing': 'email_marketing',
                        'feira': 'feira',
                        'evento/feira': 'evento_feira',
                        'evento feira': 'evento_feira',
                        'telemarketing': 'telemarketing',
                        'direto': 'direto',
                        'outros': 'direto'
                    };
                    return map[low] || raw;
                };
                const idStr = id != null ? String(id).trim() : '';
                const idIsNumeric = /^[0-9]+$/.test(idStr);
                let localOnly = !idIsNumeric;
                try {
                    const existing = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.leads))
                        ? ModuleSystem.data.leads.find(l => l && l.id != null && String(l.id) === idStr)
                        : null;
                    if (existing && existing._localOnly === true) localOnly = true;
                } catch {}

                if (localOnly) {
                    if (window.ModuleSystem && typeof ModuleSystem.updateItem === 'function') {
                        ModuleSystem.updateItem('leads', id, { ...data, _localOnly: true });
                    }
                    this.closeModal();
                    if (window.NavigationSystem && typeof window.NavigationSystem.reloadLeadsList === 'function') {
                        window.NavigationSystem.reloadLeadsList();
                    } else if (window.MarketingModule && typeof window.MarketingModule.loadLeads === 'function') {
                        window.MarketingModule.loadLeads();
                    } else if (window.NavigationSystem && typeof window.NavigationSystem.reloadCurrentPage === 'function') {
                        window.NavigationSystem.reloadCurrentPage();
                    }
                    return;
                }
                try {
                    const resp = await fetch(`/api/crm/leads/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            nome: data.nome,
                            email: data.email,
                            telefone: data.telefone,
                            whatsapp: data.whatsapp || null,
                            status: normalizeLeadStatus(data.status),
                            empresa: data.empresa || null,
                            cargo: data.cargo || null,
                            origem: normalizeOrigem(data.origem),
                            segmento: data.segmento || null,
                            evento_interesse: data.evento_interesse || data.eventoInteresse || null,
                            metragem_estimada: data.metragem_estimada || data.metragemEstimada || null,
                            temperatura: data.temperatura || deriveTemperaturaFromNivelInteresse(data.nivel_interesse || data.nivelInteresse),
                            nivel_interesse: normalizeNivelInteresse(data.nivel_interesse || data.nivelInteresse),
                            interesses: data.interesses ? (Array.isArray(data.interesses) ? data.interesses : [data.interesses]) : [],
                            orcamento_estimado: data.orcamento_estimado || data.orcamentoEstimado || null,
                            prazo_projeto: data.prazo_projeto || data.prazoProjeto || null,
                            proximos_passos: data.proximos_passos || data.proximosPassos || null,
                            observacoes: data.observacoes || null,
                            proximo_contato: data.proximo_contato || data.proximoContato || null
                        })
                    });
                    const payload = await resp.json().catch(() => ({}));
                    if (!resp.ok) {
                        const msg = (payload && payload.error) ? payload.error : 'Falha ao atualizar lead no servidor';
                        this._notifyOnce('lead_update_err', msg, 'error');
                        console.warn('[FormSystem] PUT /api/leads/:id não OK, atualizando apenas localmente');
                        if (payload && (payload.error === 'ID inválido' || payload.error === 'Lead não encontrado')) {
                            data._localOnly = true;
                        }
                    }
                    if (window.ModuleSystem && typeof ModuleSystem.updateItem === 'function') {
                        ModuleSystem.updateItem('leads', id, data);
                    }
                } catch (err) {
                    this._notifyOnce('lead_update_err', 'Falha ao atualizar lead no servidor', 'error');
                    console.warn('[FormSystem] Falha ao atualizar lead no backend, atualizando apenas localmente:', err);
                    if (window.ModuleSystem && typeof ModuleSystem.updateItem === 'function') {
                        ModuleSystem.updateItem('leads', id, { ...data, _localOnly: true });
                    }
                }
                // Atualizar lista imediatamente
                this.closeModal();
                if (window.NavigationSystem && typeof window.NavigationSystem.reloadLeadsList === 'function') {
                    window.NavigationSystem.reloadLeadsList();
                } else if (window.MarketingModule && typeof window.MarketingModule.loadLeads === 'function') {
                    window.MarketingModule.loadLeads();
                } else if (window.NavigationSystem && typeof window.NavigationSystem.reloadCurrentPage === 'function') {
                    window.NavigationSystem.reloadCurrentPage();
                }
                return;
            } else if (module === 'contatos' || module === 'marketing_contatos') {
                try {
                    const resp = await fetch(`/api/crm/contatos/${encodeURIComponent(id)}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            nome: data.nome,
                            email: data.email,
                            telefone: data.telefone,
                            whatsapp: data.whatsapp || null,
                            empresa: data.empresa,
                            cargo: data.cargo,
                            segmento: data.segmento,
                            status: data.status,
                            tags: data.tags,
                            observacoes: data.observacoes,
                            origem: data.origem,
                            aniversario: data.aniversario || data.data_aniversario || data.dataAniversario || null,
                            datas_importantes: data.datas_importantes || data.datasImportantes || null,
                            responsavel_id: data.responsavel_id ?? data.responsavelId ?? null,
                            lead_id: data.lead_id ?? data.leadId,
                            cliente_id: data.cliente_id ?? data.clienteId
                        })
                    });
                    if (!resp.ok) console.warn('[FormSystem] PUT /api/contatos/:id não OK, atualizando apenas localmente');
                    if (window.ModuleSystem && typeof ModuleSystem.updateItem === 'function') {
                        ModuleSystem.updateItem('contatos', id, data);
                    }
                } catch (err) {
                    console.warn('[FormSystem] Falha ao atualizar contato no backend, atualizando apenas localmente:', err);
                    if (window.ModuleSystem && typeof ModuleSystem.updateItem === 'function') {
                        ModuleSystem.updateItem('contatos', id, { ...data, _localOnly: true });
                    }
                }
                this.closeModal();
                if (window.NavigationSystem && typeof window.NavigationSystem.reloadContatosList === 'function') {
                    window.NavigationSystem.reloadContatosList();
                } else if (window.MarketingModule && typeof window.MarketingModule.loadContatos === 'function') {
                    window.MarketingModule.loadContatos();
                } else if (window.NavigationSystem && typeof window.NavigationSystem.reloadCurrentPage === 'function') {
                    window.NavigationSystem.reloadCurrentPage();
                }
                return;
            } else if (module === 'eventos') {
                try {
                    const resp = await fetch(`/api/crm/eventos/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(data)
                    });
                    if (!resp.ok) {
                        console.warn('[FormSystem] PUT /api/eventos/:id não OK, atualizando apenas localmente');
                    }
                } catch (err) {
                    console.warn('[FormSystem] Falha ao atualizar evento no backend, atualizando apenas localmente:', err);
                } finally {
                    if (window.ModuleSystem && typeof ModuleSystem.updateItem === 'function') {
                        ModuleSystem.updateItem('eventos', id, data);
                    }
                }
            } else if (module === 'memoriais') {
                try {
                    const mkList = (text) => String(text || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                    const mobiliario = mkList(data.mobiliario_linhas).map(line => {
                        const m = line.match(/^(\d+)[xX]\s*(.+)$/);
                        if (m) return { quantidade: Number(m[1]), descricao: m[2] };
                        return { quantidade: 1, descricao: line };
                    });
                    const eletrica = mkList(data.eletrica_linhas).map(s => ({ item: s }));
                    const comunicacao = mkList(data.comunicacao_linhas).map(s => ({ item: s }));
                    const conteudo = {
                        cliente: data.cliente ?? null,
                        evento: data.evento ?? null,
                        local: data.local ?? null,
                        data_evento: data.data_evento ?? null,
                        area_m2: data.area_m2 != null && data.area_m2 !== '' ? Number(String(data.area_m2).replace(',', '.')) : null,
                        numero_projeto: data.numero_projeto ?? null,
                        data_emissao: data.data_emissao ?? null,
                        aprovacao_ate: data.aprovacao_ate ?? null,
                        piso: data.piso ?? null,
                        fachada: data.fachada ?? null,
                        deposito_copa: data.deposito_copa ?? null,
                        circulacao_exposicao: data.circulacao_exposicao ?? null,
                        mobiliario,
                        eletrica_iluminacao: eletrica,
                        comunicacao_visual: comunicacao,
                        manutencao: data.manutencao ?? null,
                        observacoes: data.observacoes ?? null,
                        valor_total: data.valor_total != null && data.valor_total !== '' ? Number(String(data.valor_total).replace(',', '.')) : null,
                        valor_por_extenso: data.valor_por_extenso ?? null,
                        assinante_cliente: data.assinante_cliente ?? null,
                        data_assinatura_cliente: data.data_assinatura_cliente ?? null,
                        responsavel_sams: data.responsavel_sams ?? null,
                        data_responsavel_sams: data.data_responsavel_sams ?? null
                    };
                    const payload = {
                        titulo: data.titulo ?? null,
                        status: data.status ?? null,
                        aprovado_por: data.aprovado_por ?? null,
                        data_aprovacao: data.data_aprovacao ?? null,
                        valido_ate: data.valido_ate ?? null,
                        arquivo_url: data.arquivo_url ?? null,
                        arquivo_nome: data.arquivo_nome ?? null,
                        arquivo_tipo: data.arquivo_tipo ?? null,
                        conteudo_json: JSON.stringify(conteudo)
                    };
                    const resp = await fetch(`/api/crm/memoriais/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(payload)
                    });
                    if (!resp.ok) {
                        console.warn('[FormSystem] PUT /api/memoriais/:id não OK, atualizando localmente');
                    }
                    if (window.ModuleSystem && typeof ModuleSystem.updateItem === 'function') {
                        ModuleSystem.updateItem('memoriais', id, { id, ...payload });
                    }
                } catch (err) {
                    console.warn('[FormSystem] Falha ao atualizar memorial:', err);
                    if (window.NotificationSystem && typeof window.NotificationSystem.error === 'function') {
                        window.NotificationSystem.error('Falha ao atualizar memorial');
                    }
                }
            } else if (module === 'briefings') {
                try {
                    const resp = await fetch(`/api/crm/briefings/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(data)
                    });
                    const payload = await resp.json().catch(() => ({}));
                    if (!resp.ok) {
                        const msg = (payload && payload.error) ? payload.error : 'Falha ao atualizar briefing';
                        if (window.NotificationSystem && typeof window.NotificationSystem.error === 'function') {
                            window.NotificationSystem.error(msg);
                        } else if (window.Utils && Utils.notifications && typeof Utils.notifications.error === 'function') {
                            Utils.notifications.error(msg);
                        }
                        throw new Error(msg);
                    }
                } catch (err) {
                    console.warn('[FormSystem] Falha ao atualizar briefing no backend:', err);
                    throw err;
                } finally {
                    if (typeof window !== 'undefined') {
                        const overlay = document.getElementById(this.config.overlayId);
                        const form = overlay ? overlay.querySelector('#briefing-form') : null;
                        if (form) {
                            const saveBtn = document.getElementById('modal-save');
                            if (saveBtn) saveBtn.disabled = false;
                        }
                    }
                }
                if (window.ModuleSystem && typeof ModuleSystem.updateItem === 'function') {
                    ModuleSystem.updateItem('briefings', id, data);
                }
            } else if (module === 'clientes') {
                try {
                    const payloadToSend = {
                        ...data,
                        documento: data.documento ?? data.cnpj ?? null
                    };
                    const resp = await fetch(`/api/crm/clientes/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(payloadToSend)
                    });
                    if (!resp.ok) {
                        console.warn('[FormSystem] PUT /api/clientes/:id não OK, atualizando apenas localmente');
                    }
                } catch (err) {
                    console.warn('[FormSystem] Falha ao atualizar cliente no backend, atualizando apenas localmente:', err);
                } finally {
                    if (window.ModuleSystem && typeof ModuleSystem.updateItem === 'function') {
                        ModuleSystem.updateItem('clientes', id, data);
                    }
                }
            } else if (module === 'projetos') {
                const toNum = (v) => {
                    if (v == null || v === '') return null;
                    const n = Number(String(v).replace(',', '.'));
                    return Number.isFinite(n) ? n : null;
                };
                const toInt = (v) => {
                    const n = toNum(v);
                    return Number.isFinite(n) ? Math.trunc(n) : null;
                };
                const normStatus = (v) => {
                    const s = v != null ? String(v).trim().toLowerCase() : '';
                    const map = { planejamento: 'recebido', em_andamento: 'em_elaboracao', pausado: 'aguardando_revisao', concluido: 'finalizado' };
                    const out = map[s] || s;
                    const allowed = new Set(['recebido','em_elaboracao','aguardando_revisao','revisao_cliente','aprovado','finalizado','cancelado']);
                    return allowed.has(out) ? out : null;
                };
                const payload = {
                    titulo: data.nome != null && String(data.nome).trim() !== '' ? String(data.nome).trim() : null,
                    descricao: data.descricao != null && String(data.descricao).trim() !== '' ? String(data.descricao) : null,
                    observacoes: data.observacoes != null && String(data.observacoes).trim() !== '' ? String(data.observacoes) : null,
                    briefing_id: toInt(data.briefing_id ?? data.briefingId),
                    oportunidade_id: toInt(data.oportunidade_id ?? data.oportunidadeId ?? data.oportunidade),
                    responsavel_id: toInt(data.responsavel_id ?? data.gerente_id ?? data.responsavelId ?? data.gerenteId),
                    area_m2: toNum(data.area_m2 ?? data.areaM2),
                    tipo_stand: data.tipo_stand != null && String(data.tipo_stand).trim() !== '' ? String(data.tipo_stand).trim() : null,
                    status: normStatus(data.status),
                    custo_estimado: toNum(data.custo_estimado ?? data.custoEstimado),
                    comissao_percentual: toNum(data.comissao_percentual ?? data.comissaoPercentual)
                };
                try {
                    const resp = await fetch(`/api/crm/projetos/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(payload)
                    });
                    if (!resp.ok) console.warn('[FormSystem] PUT /api/projetos/:id não OK, atualizando apenas localmente');
                } catch (err) {
                    console.warn('[FormSystem] Falha ao atualizar projeto no backend, atualizando apenas localmente:', err);
                } finally {
                    if (window.ModuleSystem && typeof ModuleSystem.updateItem === 'function') {
                        ModuleSystem.updateItem('projetos', id, {
                            ...data,
                            briefing_id: payload.briefing_id ?? data.briefing_id,
                            oportunidade_id: payload.oportunidade_id ?? data.oportunidade_id,
                            responsavel_id: payload.responsavel_id ?? data.responsavel_id,
                            area_m2: payload.area_m2 ?? data.area_m2,
                            tipo_stand: payload.tipo_stand ?? data.tipo_stand,
                            status: payload.status ?? data.status,
                            custo_estimado: payload.custo_estimado ?? data.custo_estimado,
                            comissao_percentual: payload.comissao_percentual ?? data.comissao_percentual
                        });
                    }
                }
            } else if (module === 'contasReceber') {
                // Delegado ao ContasReceberModule
                if (window.ContasReceberModule && typeof window.ContasReceberModule.handleUpdate === 'function') {
                    await window.ContasReceberModule.handleUpdate(id, data);
                } else {
                    console.error('[FormSystem] ContasReceberModule não disponível para PUT');
                    throw new Error('Módulo de Contas a Receber não carregado.');
                }
                        } else if (module === 'transacoes') {
                // Atualizar transação via API REST
                try {
                    const resp = await fetch(`/api/crm/transacoes/${encodeURIComponent(id)}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            descricao: data.descricao || data.nome || '',
                            tipo: data.tipo || 'pagar',
                            valor: parseFloat(String(data.valor || 0).replace(',', '.')) || 0,
                            status: data.status || 'Pendente',
                            centro_custo: data.centroCusto || data.centro_custo || null,
                            data: data.data || null,
                            observacoes: data.observacoes || null,
                            evento_id: data.eventoId || data.evento_id || null,
                            cliente_id: data.clienteId || data.cliente_id || null
                        })
                    });
                    if (!resp.ok) {
                        console.warn('[FormSystem] PUT /api/crm/transacoes/:id não OK, atualizando apenas localmente');
                    }
                } catch (err) {
                    console.warn('[FormSystem] Falha ao atualizar transação no backend, atualizando apenas localmente:', err);
                } finally {
                    if (window.ModuleSystem && typeof ModuleSystem.updateItem === 'function') {
                        ModuleSystem.updateItem('transacoes', id, data);
                    }
                }
            } else {
                // Atualizar no ModuleSystem para demais módulos
                if (window.ModuleSystem && typeof ModuleSystem.updateItem === 'function') {
                    ModuleSystem.updateItem(module, id, data);
                } else {
                    console.error('[FormSystem] ModuleSystem.updateItem não disponível');
                }
            }
            
            // Fechar modal e atualizar interface
            this.closeModal();
            if (module === 'campanhas' || module === 'marketing_campanhas') {
                if (window.NavigationSystem && typeof window.NavigationSystem.reloadCampanhasList === 'function') {
                    window.NavigationSystem.reloadCampanhasList();
                } else if (window.MarketingModule && typeof window.MarketingModule.loadCampanhas === 'function') {
                    window.MarketingModule.loadCampanhas();
                } else if (window.NavigationSystem && typeof window.NavigationSystem.reloadCurrentPage === 'function') {
                    window.NavigationSystem.reloadCurrentPage();
                }
                return;
            }
            const refreshTarget = (module === 'transacoes' || module === 'contasReceber') ? 'financeiro' : (module === 'marketing_leads' ? 'leads' : module);
            if (window.formIntegration && typeof window.formIntegration.refreshModuleData === 'function') {
                window.formIntegration.refreshModuleData(refreshTarget);
            } else if (window.NavigationSystem && typeof window.NavigationSystem.reloadCurrentPage === 'function') {
                window.NavigationSystem.reloadCurrentPage();
            } else if (window.NavigationSystem && typeof window.NavigationSystem.navigateToModule === 'function') {
                window.NavigationSystem.navigateToModule(refreshTarget);
            } else {
                if (typeof window !== 'undefined' && window.location) {
                    window.location.reload();
                }
            }
        } catch (error) {
            console.error('[FormSystem] Erro ao atualizar item:', error);
        }
    },

    // Mostrar formulário de criação
    showCreateForm(module) {
        console.log('[FormSystem] Mostrando formulário de criação para:', module);
        
        let title, formHtml;
        
        switch (module) {
            case 'leads':
            case 'marketing_leads':
                title = 'Novo Lead';
                formHtml = this.getLeadForm();
                break;
            case 'clientes':
                title = 'Novo Cliente';
                formHtml = this.getClienteForm();
                try { window.__samsClienteCreateDefaults = null; } catch {}
                break;
            case 'projetos':
                title = 'Novo Projeto';
                formHtml = this.getProjetoForm();
                break;
            case 'memoriais':
                title = 'Novo Memorial';
                formHtml = this.getMemorialForm();
                break;
            case 'briefings':
                title = 'Novo Briefing';
                formHtml = (typeof BriefingSystem !== 'undefined' && BriefingSystem.generateBriefingForm)
                    ? `${BriefingSystem.generateBriefingForm(null)}`
                    : `<form id="crud-form" data-action="create" data-module="briefings"><div class="p-4 text-sm text-gray-700">Formulário de briefing não disponível. Preencha título e descrição.</div><div class="grid gap-3 p-4"><input type="text" name="titulo" placeholder="Título" class="border rounded px-3 py-2"/><textarea name="descricao" placeholder="Descrição" class="border rounded px-3 py-2"></textarea><select name="status" class="border rounded px-3 py-2"><option value="Em Análise" selected>Em Análise</option><option value="Em Andamento">Em Andamento</option><option value="Aprovado">Aprovado</option><option value="Concluído">Concluído</option><option value="Cancelado">Cancelado</option><option value="Enviado">Enviado</option></select></div></form>`;
                break;
            case 'tarefas':
                title = 'Nova Tarefa';
                formHtml = this.getTarefaForm();
                break;
            case 'financeiro':
            case 'transacoes':
                title = 'Nova Despesa';
                formHtml = this.getFinanceiroForm();
                break;
            case 'contasReceber':
                title = 'Nova Conta a Receber';
                // Limpar defaults anteriores para garantir formulário vazio
                try {
                    const _sd = window.FormSystem && typeof window.FormSystem.readSmartDefaults === 'function' ? window.FormSystem.readSmartDefaults() : null;
                    if (_sd && _sd.contasReceber) {
                        delete _sd.contasReceber;
                        if (typeof window.FormSystem.saveSmartDefaults === 'function') window.FormSystem.saveSmartDefaults(_sd);
                    }
                } catch (_e0) {}
                formHtml = this.getContaReceberForm();
                // Após abrir o modal, garantir lista de clientes atualizada e popular o select
                Promise.resolve().then(async () => {
                    try {
                        if (window.ModuleSystem && typeof ModuleSystem.syncClientesFromBackend === 'function') {
                            await ModuleSystem.syncClientesFromBackend();
                        }
                    } catch (_e) {}
                    try {
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
                        // Encontrar o select de cliente dentro do modal aberto
                        const modalContent = document.getElementById('modal-content');
                        if (!modalContent) return;
                        const form = modalContent.querySelector('form#crud-form[data-module="contasReceber"]');
                        if (!form) return;
                        const sel = form.querySelector('select[name="clienteId"]');
                        if (!sel) return;
                        // Só repopular se o select ainda tem apenas a opção placeholder
                        if (allClientes.length === 0) return;
                        const currentVal = sel.value;
                        // Remover options antigas (exceto o placeholder)
                        while (sel.options.length > 1) sel.remove(1);
                        allClientes.forEach(c => {
                            const nome = c.nome || c.razao_social || c.empresa || `ID ${c.id}`;
                            const email = c.email ? ` • ${c.email}` : '';
                            const opt = document.createElement('option');
                            opt.value = c.id;
                            opt.textContent = `${nome}${email}`;
                            sel.appendChild(opt);
                        });
                        // Restaurar valor selecionado se havia um
                        if (currentVal) sel.value = currentVal;
                    } catch (_e2) {}
                });
                break;
            case 'marketing_campanhas':
                title = 'Nova Campanha';
                formHtml = this.getCampaignForm();
                break;
            case 'marketing_contatos':
                title = 'Novo Contato';
                formHtml = this.getContactForm();
                break;
            case 'usuarios':
                title = 'Novo Usuário';
                formHtml = this.getUsuarioForm();
                break;
            case 'eventos':
                title = 'Novo Evento';
                formHtml = this.getEventoForm();
                break;
            case 'demandasJuridicas':
                title = 'Nova Demanda Jurídica';
                formHtml = this.getDemandaJuridicaForm();
                break;
            default:
                console.error('[FormSystem] Módulo não implementado:', module);
                return;
        }
        
        this.openModal(title, formHtml);
        try { this.applySmartDefaults(module, document.getElementById('modal-content') || document); } catch {}
        // Módulos com botões internos próprios: ocultar o rodapé externo explicitamente
        try {
            const _modulesWithInternalButtons = ['contasReceber', 'transacoes', 'financeiro', 'demandasJuridicas', 'tarefas'];
            const _footer = document.getElementById('modal-footer');
            const _saveBtn = document.getElementById('modal-save');
            const _contentEl = document.getElementById('modal-content');
            const _form = _contentEl ? _contentEl.querySelector('form') : null;
            const _hasInternal = _form ? !!_form.querySelector('button[type="submit"], .btn-submit') : false;
            if (_hasInternal || _modulesWithInternalButtons.includes(module)) {
                if (_footer) _footer.classList.add('hidden');
                if (_saveBtn) _saveBtn.classList.add('hidden');
            } else {
                if (_saveBtn) {
                    _saveBtn.textContent = 'Salvar';
                    if (module === 'clientes') _saveBtn.textContent = 'Salvar Cliente';
                    if (module === 'eventos') _saveBtn.textContent = 'Salvar Evento';
                }
            }
        } catch {}
        if (module === 'briefings') {
            try {
                const root = document.getElementById('modal-content') || document;
                if (window.BriefingSystem && typeof BriefingSystem.bindFormAutoFill === 'function') {
                    BriefingSystem.bindFormAutoFill(root);
                }
                const defaults = (typeof window !== 'undefined' && window.__samsBriefingCreateDefaults) ? window.__samsBriefingCreateDefaults : null;
                if (defaults && typeof defaults === 'object') {
                    const form = root.querySelector('#briefing-form');
                    const setIfEmpty = (name, value) => {
                        if (value == null) return;
                        const v = String(value);
                        if (!v.trim()) return;
                        const el = form ? form.querySelector(`[name="${name}"]`) : null;
                        if (!el) return;
                        const cur = el.value != null ? String(el.value) : '';
                        if (cur.trim()) return;
                        el.value = v;
                        try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch {}
                        try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch {}
                    };

                    if (form) {
                        setIfEmpty('empresa', defaults.empresa);
                        setIfEmpty('responsavel', defaults.responsavel);
                        setIfEmpty('email', defaults.email);
                        setIfEmpty('telefone', defaults.telefone);
                        setIfEmpty('nomeEvento', defaults.nomeEvento);
                        setIfEmpty('segmentoPrincipal', defaults.segmentoPrincipal);

                        const oppIdRaw = defaults.oportunidade_id ?? defaults.oportunidadeId ?? defaults.oportunidade;
                        const oppId = oppIdRaw != null ? String(oppIdRaw).trim() : '';
                        if (oppId) {
                            let hidden = form.querySelector('input[name="oportunidade_id"]');
                            if (!hidden) {
                                hidden = document.createElement('input');
                                hidden.type = 'hidden';
                                hidden.name = 'oportunidade_id';
                                form.appendChild(hidden);
                            }
                            hidden.value = oppId;
                        }
                    }
                }
                try { window.__samsBriefingCreateDefaults = null; } catch {}
            } catch {}
        }
        if (module === 'projetos') {
            try {
                const root = document.getElementById('modal-content') || document;
                this.bindProjetoAutoFill(root);
                this.bindProjetoArquivos(root);
            } catch {}
        }
        if (module === 'memoriais') {
            try {
                const root = document.getElementById('modal-content') || document;
                this.bindMemorialAI(root);
            } catch {}
        }
        if (module === 'eventos') {
            try {
                const root = document.getElementById('modal-content') || document;
                this.bindEventoAI(root);
            } catch {}
        }
    },

    bindProjetoArquivos(rootElement) {
        const root = rootElement || document;
        const form = root.querySelector('form#crud-form[data-module="projetos"]');
        if (!form) return;
        const projetoId = form.getAttribute('data-id') ? String(form.getAttribute('data-id')).trim() : '';
        if (!projetoId) return;

        const section = root.querySelector('[data-projeto-arquivos-section="1"]');
        if (!section) return;
        if (section.getAttribute('data-bound') === '1') return;
        section.setAttribute('data-bound', '1');

        const listEl = section.querySelector('[data-projeto-arquivos-list="1"]');
        const approvedEl = section.querySelector('[data-projeto-arquivo-aprovado="1"]');
        const inputNome = section.querySelector('input[name="projeto_arquivo_nome"]');
        const inputUrl = section.querySelector('input[name="projeto_arquivo_url"]');
        const inputTipo = section.querySelector('select[name="projeto_arquivo_tipo"]');
        const inputObs = section.querySelector('input[name="projeto_arquivo_obs"]');
        const btnAdd = section.querySelector('[data-projeto-arquivo-add="1"]');
        const btnRefresh = section.querySelector('[data-projeto-arquivo-refresh="1"]');

        const apiJson = async (url, init) => {
            const r = await fetch(url, { credentials: 'include', ...(init || {}) });
            const j = await r.json().catch(() => null);
            if (!r.ok) throw new Error((j && j.error) ? j.error : 'Falha na operação');
            return j;
        };

        const renderApproved = (proj) => {
            if (!approvedEl) return;
            const a = proj && proj.arquivo_aprovado ? proj.arquivo_aprovado : null;
            if (!a || !a.url) {
                approvedEl.innerHTML = `<div class="text-sm text-gray-500">Nenhum arquivo aprovado definido ainda.</div>`;
                return;
            }
            const nome = a.nome ? this.escapeHtml(String(a.nome)) : 'Arquivo aprovado';
            const url = this.escapeHtml(String(a.url));
            const tipo = a.tipo ? this.escapeHtml(String(a.tipo)) : '';
            approvedEl.innerHTML = `
                <div class="flex flex-col gap-1">
                    <div class="text-sm font-medium text-gray-900">${nome}${tipo ? ` <span class="text-xs text-gray-500">(${tipo})</span>` : ''}</div>
                    <div class="text-sm"><a class="text-indigo-600 hover:text-indigo-900" href="${url}" target="_blank" rel="noopener">Abrir arquivo aprovado</a></div>
                </div>
            `;
        };

        const renderList = (arquivos) => {
            if (!listEl) return;
            const rows = Array.isArray(arquivos) ? arquivos : [];
            if (!rows.length) {
                listEl.innerHTML = `<div class="text-sm text-gray-500">Nenhum arquivo anexado ainda.</div>`;
                return;
            }
            listEl.innerHTML = `
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Arquivo</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Versão</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${rows.map(f => {
                                const id = f && f.id != null ? String(f.id) : '';
                                const nome = this.escapeHtml(String(f && f.nome != null ? f.nome : 'Arquivo'));
                                const tipo = this.escapeHtml(String(f && f.tipo != null ? f.tipo : ''));
                                const url = this.escapeHtml(String(f && f.url != null ? f.url : ''));
                                const versao = f && f.versao != null ? String(f.versao) : '1';
                                const aprovado = !!(f && (f.is_aprovado || Number(f.aprovado || 0) === 1));
                                const badge = aprovado ? `<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Aprovado</span>` : `<span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">Não aprovado</span>`;
                                return `
                                    <tr>
                                        <td class="px-4 py-2 text-sm text-gray-900">
                                            <a class="text-indigo-600 hover:text-indigo-900" href="${url}" target="_blank" rel="noopener">${nome}</a>
                                        </td>
                                        <td class="px-4 py-2 text-sm text-gray-700">${tipo || '—'}</td>
                                        <td class="px-4 py-2 text-sm text-gray-700">${this.escapeHtml(versao)}</td>
                                        <td class="px-4 py-2 text-sm">${badge}</td>
                                        <td class="px-4 py-2 text-sm text-right space-x-2">
                                            <button type="button" data-acao="aprovar" data-arquivo-id="${this.escapeHtml(id)}"
                                                    class="text-green-700 hover:text-green-900" title="Marcar como aprovado para montagem">
                                                <i class="fas fa-check-circle"></i>
                                            </button>
                                            <button type="button" data-acao="excluir" data-arquivo-id="${this.escapeHtml(id)}"
                                                    class="text-red-700 hover:text-red-900" title="Excluir">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            const btns = Array.from(listEl.querySelectorAll('button[data-acao]'));
            for (const b of btns) {
                b.addEventListener('click', async () => {
                    const acao = b.getAttribute('data-acao');
                    const arqId = b.getAttribute('data-arquivo-id');
                    if (!acao || !arqId) return;
                    try {
                        if (acao === 'aprovar') {
                            if (!confirm('Marcar este arquivo como a versão aprovada para montagem? Isso substituirá qualquer aprovação anterior.')) return;
                            await apiJson(`/api/projetos/${encodeURIComponent(projetoId)}/arquivos/${encodeURIComponent(arqId)}/aprovar`, { method: 'PUT' });
                            await refresh();
                            return;
                        }
                        if (acao === 'excluir') {
                            if (!confirm('Excluir este arquivo do projeto?')) return;
                            await apiJson(`/api/projetos/${encodeURIComponent(projetoId)}/arquivos/${encodeURIComponent(arqId)}`, { method: 'DELETE' });
                            await refresh();
                            return;
                        }
                    } catch (e) {
                        if (window.NotificationSystem && typeof window.NotificationSystem.error === 'function') {
                            window.NotificationSystem.error(e && e.message ? e.message : 'Erro');
                        } else {
                            alert(e && e.message ? e.message : 'Erro');
                        }
                    }
                });
            }
        };

        const refresh = async () => {
            try {
                if (listEl) listEl.innerHTML = `<div class="text-sm text-gray-500">Carregando...</div>`;
                const payload = await apiJson(`/api/projetos/${encodeURIComponent(projetoId)}`);
                const proj = payload && payload.projeto ? payload.projeto : null;
                const arquivos = payload && payload.arquivos ? payload.arquivos : [];
                renderApproved(proj);
                renderList(arquivos);
            } catch (e) {
                if (listEl) listEl.innerHTML = `<div class="text-sm text-red-600">${e && e.message ? e.message : 'Erro ao carregar arquivos'}</div>`;
            }
        };

        const addArquivo = async () => {
            const nome = inputNome && inputNome.value != null ? String(inputNome.value).trim() : '';
            const url = inputUrl && inputUrl.value != null ? String(inputUrl.value).trim() : '';
            const tipo = inputTipo && inputTipo.value != null ? String(inputTipo.value).trim().toLowerCase() : '';
            const observacoes = inputObs && inputObs.value != null ? String(inputObs.value).trim() : '';
            if (!nome) return (window.NotificationSystem && NotificationSystem.error) ? NotificationSystem.error('Informe o nome do arquivo.') : alert('Informe o nome do arquivo.');
            if (!url) return (window.NotificationSystem && NotificationSystem.error) ? NotificationSystem.error('Informe a URL do arquivo.') : alert('Informe a URL do arquivo.');
            if (!tipo) return (window.NotificationSystem && NotificationSystem.error) ? NotificationSystem.error('Selecione o tipo.') : alert('Selecione o tipo.');

            await apiJson(`/api/projetos/${encodeURIComponent(projetoId)}/arquivos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, tipo, url, observacoes: observacoes || null })
            });
            if (inputNome) inputNome.value = '';
            if (inputUrl) inputUrl.value = '';
            if (inputObs) inputObs.value = '';
            if (inputTipo) inputTipo.value = 'outro';
            await refresh();
        };

        if (btnAdd) btnAdd.addEventListener('click', () => { addArquivo().catch(() => {}); });
        if (btnRefresh) btnRefresh.addEventListener('click', () => { refresh().catch(() => {}); });

        refresh().catch(() => {});
    },

    bindEventoAI(rootElement) {
        const root = rootElement || document;
        const form = root.querySelector('form#crud-form[data-module="eventos"]');
        if (!form) return;
        const wrap = root.querySelector('[data-evento-ai="1"]');
        if (!wrap) return;
        if (wrap.getAttribute('data-bound') === '1') return;
        wrap.setAttribute('data-bound', '1');

        const openButtons = Array.from(wrap.querySelectorAll('[data-evento-ai-open]'));

        const copyText = async (text) => {
            const t = String(text || '');
            try {
                if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                    await navigator.clipboard.writeText(t);
                    return true;
                }
            } catch {}
            return false;
        };

        const notifyOk = (m) => {
            if (window.Toast && typeof window.Toast.show === 'function') return window.Toast.show(m, 'success');
            if (window.NotificationSystem && typeof window.NotificationSystem.success === 'function') return window.NotificationSystem.success(m);
            alert(m);
        };
        const notifyErr = (m) => {
            if (window.Toast && typeof window.Toast.show === 'function') return window.Toast.show(m, 'error');
            if (window.NotificationSystem && typeof window.NotificationSystem.error === 'function') return window.NotificationSystem.error(m);
            alert(m);
        };

        const buildPrompt = () => {
            const fd = new FormData(form);
            const nome = (fd.get('nome') || '').trim();
            const local = (fd.get('local') || '').trim();
            const endereco = (fd.get('endereco') || '').trim();
            const dtInicio = (fd.get('dataInicio') || '').trim();

            if (!nome) {
                throw new Error('Preencha o nome do evento para gerar o prompt.');
            }

            let p = `Atue como um SDR (Sales Development Representative) especialista no mercado de montagem de stands e eventos.\n`;
            p += `Estou buscando potenciais clientes (expositores) para prospecção.\n\n`;
            p += `Por favor, faça uma busca atualizada na internet sobre o evento **${nome}**`;
            if (local) p += ` que acontecerá no local **${local}**`;
            if (endereco) p += ` (${endereco})`;
            if (dtInicio) p += ` com início em **${dtInicio}**`;
            p += `.\n\n`;
            p += `Liste 15 a 20 empresas que costumam expor nesse evento ou que já confirmaram presença para a próxima edição.\n`;
            p += `Para cada empresa, estruture a resposta no seguinte formato:\n`;
            p += `- **Nome da Empresa**\n`;
            p += `- **Ramo de Atuação**\n`;
            p += `- **Possível cargo do tomador de decisão** (ex: Analista de Marketing, Gerente de Eventos, Trade Marketing)\n`;
            p += `- **Por que é um bom lead** (breve justificativa sobre o tamanho do stand que costumam montar)\n\n`;
            p += `Não invente nomes de empresas se não tiver certeza; prefira as que são reais expositoras do setor.`;

            return p;
        };

        const openAiUrl = async (type) => {
            try {
                const prompt = buildPrompt();
                const copied = await copyText(prompt);
                if (copied) {
                    notifyOk(`Prompt copiado! Cole no ${type} para buscar os leads.`);
                } else {
                    notifyErr(`Prompt gerado, mas o navegador bloqueou a cópia automática. Tente novamente.`);
                    return;
                }

                let url = '';
                if (type === 'chatgpt') url = 'https://chatgpt.com/';
                else if (type === 'claude') url = 'https://claude.ai/';
                else if (type === 'gemini') url = 'https://gemini.google.com/';

                if (url) {
                    const w = window.open(url, '_blank');
                    if (!w) notifyErr(`Pop-up bloqueado. O prompt está copiado, abra o ${type} manualmente.`);
                }
            } catch (e) {
                notifyErr(e && e.message ? e.message : 'Falha ao gerar prompt');
            }
        };

        for (const btn of openButtons) {
            btn.addEventListener('click', () => {
                const t = btn.getAttribute('data-evento-ai-open');
                openAiUrl(t).catch(() => {});
            });
        }
    },

    bindMemorialAI(rootElement) {
        const root = rootElement || document;
        const form = root.querySelector('form#crud-form[data-module="memoriais"]');
        if (!form) return;
        const wrap = root.querySelector('[data-memorial-ai="1"]');
        if (!wrap) return;
        if (wrap.getAttribute('data-bound') === '1') return;
        wrap.setAttribute('data-bound', '1');

        const btn = wrap.querySelector('[data-memorial-ai-generate="1"]');
        const openButtons = Array.from(wrap.querySelectorAll('[data-memorial-ai-open]'));
        const out = wrap.querySelector('[data-memorial-ai-text="1"]');
        const box = wrap.querySelector('[data-memorial-ai-box="1"]');

        const copyText = async (text) => {
            const t = String(text || '');
            try {
                if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                    await navigator.clipboard.writeText(t);
                    return true;
                }
            } catch {}
            try {
                const ta = document.createElement('textarea');
                ta.value = t;
                ta.setAttribute('readonly', 'readonly');
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                return true;
            } catch {
                return false;
            }
        };

        const notifyOk = (msg) => {
            if (window.NotificationSystem && typeof window.NotificationSystem.success === 'function') {
                window.NotificationSystem.success(msg);
            } else {
                alert(msg);
            }
        };
        const notifyErr = (msg) => {
            if (window.NotificationSystem && typeof window.NotificationSystem.error === 'function') {
                window.NotificationSystem.error(msg);
            } else {
                alert(msg);
            }
        };

        const apiJson = async (url) => {
            const r = await fetch(url, { credentials: 'include' });
            const j = await r.json().catch(() => null);
            if (!r.ok) throw new Error((j && j.error) ? j.error : 'Falha ao carregar');
            return j;
        };

        const getVal = (name) => {
            const el = form.querySelector(`[name="${name}"]`);
            return el && el.value != null ? String(el.value).trim() : '';
        };

        const buildPrompt = (ctx) => {
            const safe = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : '—');
            const cliente = safe(ctx.cliente);
            const evento = safe(ctx.evento);
            const local = safe(ctx.local);
            const dataEvento = safe(ctx.data_evento);
            const areaM2 = safe(ctx.area_m2);
            const tipoStand = safe(ctx.tipo_stand);
            const budget = safe(ctx.budget);
            const objetivo = safe(ctx.objetivo);
            const publico = safe(ctx.publico);
            const tema = safe(ctx.tema);
            const arquivoAprovado = ctx.arquivo_aprovado_url ? `${ctx.arquivo_aprovado_nome || 'Arquivo aprovado'}: ${ctx.arquivo_aprovado_url}` : '—';
            const obs = safe(ctx.obs);

            return `Você é um arquiteto/projetista especialista em stands e eventos. Gere um Memorial Descritivo preliminar para montagem com base nos dados abaixo.

Regras:
- Se faltar informação, liste “Pendências / Perguntas” no final.
- Use linguagem objetiva, técnica e orientada à execução.
- Estruture em seções e listas.
- Inclua: escopo, materiais/itens, elétrica/iluminação, comunicação visual, mobiliário, acabamentos, logística e checklist de montagem.
- Gere também uma “Lista de Materiais e Itens” separada, com colunas: Item, Categoria (Produzir/Locar/Comprar), Quantidade estimada (se não souber, “a definir”), Observações.

DADOS DO PROJETO (BRIEFING + PROJETO)
Cliente/Empresa: ${cliente}
Evento: ${evento}
Local: ${local}
Data do evento (montagem/abertura/desmontagem): ${dataEvento}
Área (m²) e dimensões do stand: ${areaM2}
Tipo de stand: ${tipoStand}
Orçamento estimado/budget: ${budget}
Objetivo do stand: ${objetivo}
Público-alvo: ${publico}
Referências visuais/tema: ${tema}
Arquivos do projeto aprovados (link): ${arquivoAprovado}
Observações do memorial atual: ${obs}

REQUISITOS E ITENS SOLICITADOS
- Comunicação visual: ${safe(ctx.comunicacao_visual)}
- Mobiliário: ${safe(ctx.mobiliario)}
- Elétrica/Iluminação: ${safe(ctx.eletrica)}

ENTREGA
1) Memorial Descritivo (com seções)
2) Lista de Materiais e Itens (tabela)
3) Checklist de Montagem (pré, durante, pós)
4) Pendências e Perguntas para validação`;
        };

        const generate = async () => {
            const projetoId = getVal('projeto_id');
            if (!projetoId) throw new Error('Selecione um projeto.');

            const payload = await apiJson(`/api/projetos/${encodeURIComponent(projetoId)}`);
            const proj = payload && payload.projeto ? payload.projeto : {};
            const aprovado = proj && proj.arquivo_aprovado ? proj.arquivo_aprovado : null;

            const ctx = {
                cliente: getVal('cliente') || proj.briefing_empresa || proj.lead_nome || '',
                evento: getVal('evento') || proj.briefing_evento || proj.evento_nome || '',
                local: getVal('local') || proj.briefing_local || '',
                data_evento: getVal('data_evento') || proj.briefing_data_inicio || '',
                area_m2: getVal('area_m2') || proj.area_m2 || '',
                tipo_stand: proj.tipo_stand || '',
                budget: proj.briefing_orcamento_estimado || '',
                objetivo: '',
                publico: '',
                tema: '',
                arquivo_aprovado_url: aprovado && aprovado.url ? String(aprovado.url) : '',
                arquivo_aprovado_nome: aprovado && aprovado.nome ? String(aprovado.nome) : '',
                comunicacao_visual: getVal('comunicacao_linhas'),
                mobiliario: getVal('mobiliario_linhas'),
                eletrica: getVal('eletrica_linhas'),
                obs: getVal('observacoes')
            };

            const prompt = buildPrompt(ctx);
            if (out) out.value = prompt;
            if (box) box.classList.remove('hidden');

            const copied = await copyText(prompt);
            if (copied) notifyOk('Prompt do memorial copiado. Cole na IA para gerar o rascunho.');
            else notifyOk('Prompt do memorial gerado. Copie manualmente do campo.');
            return prompt;
        };

        if (btn) btn.addEventListener('click', () => {
            generate().catch((e) => notifyErr(e && e.message ? e.message : 'Falha ao gerar prompt'));
        });

        const openAi = async (provider) => {
            const p = String(provider || '').trim().toLowerCase();
            const url =
                p === 'chatgpt' ? 'https://chat.openai.com/' :
                p === 'claude' ? 'https://claude.ai/' :
                p === 'gemini' ? 'https://gemini.google.com/app' :
                '';
            if (!url) throw new Error('Provedor inválido');
            const prompt = await generate();
            try {
                const w = window.open(url, '_blank');
                if (!w) {
                    notifyErr('Pop-up bloqueado. Libere pop-ups para abrir a IA.');
                    return;
                }
                notifyOk('IA aberta em nova aba. O prompt já está copiado para colar.');
            } catch {
                notifyOk('Prompt copiado. Abra a IA e cole o texto.');
            }
            return prompt;
        };

        for (const b of openButtons) {
            b.addEventListener('click', () => {
                const prov = b.getAttribute('data-memorial-ai-open');
                openAi(prov).catch((e) => notifyErr(e && e.message ? e.message : 'Falha ao abrir IA'));
            });
        }
    },

    // Mostrar formulário de edição
    showUpdateForm(module, id) {
        console.log('[FormSystem] Mostrando formulário de edição para:', module, id);
        
        if (!id) {
            console.error('[FormSystem] ID não fornecido para edição');
            return;
        }

        // Buscar dados do registro
        const record = this.getRecordData(module, id);
        if (!record) {
            console.error('[FormSystem] Registro não encontrado:', module, id);
            return;
        }

        let title, formHtml;
        
        switch (module) {
            case 'leads':
            case 'marketing_leads':
                title = 'Editar Lead';
                formHtml = this.getLeadForm(id);
                break;
            case 'clientes':
                title = 'Editar Cliente';
                formHtml = this.getClienteForm(id);
                break;
            case 'projetos':
                title = 'Editar Projeto';
                formHtml = this.getProjetoForm(id);
                break;
            case 'memoriais':
                title = 'Editar Memorial';
                formHtml = this.getMemorialForm(id);
                break;
            case 'briefings':
                title = 'Editar Briefing';
                formHtml = (typeof BriefingSystem !== 'undefined' && BriefingSystem.generateBriefingForm)
                    ? `${BriefingSystem.generateBriefingForm(record)}`
                    : (() => { const r = record || {}; const s = (r.status || 'Em Análise'); return `<form id=\"crud-form\" data-action=\"update\" data-module=\"briefings\" data-id=\"${id || ''}\"><div class=\"grid gap-3 p-4\"><input type=\"text\" name=\"titulo\" value=\"${r.titulo || ''}\" placeholder=\"Título\" class=\"border rounded px-3 py-2\"/><textarea name=\"descricao\" placeholder=\"Descrição\" class=\"border rounded px-3 py-2\">${r.descricao || ''}</textarea><select name=\"status\" class=\"border rounded px-3 py-2\"><option value=\"Em Análise\" ${s==='Em Análise'?'selected':''}>Em Análise</option><option value=\"Em Andamento\" ${s==='Em Andamento'?'selected':''}>Em Andamento</option><option value=\"Aprovado\" ${s==='Aprovado'?'selected':''}>Aprovado</option><option value=\"Concluído\" ${s==='Concluído'?'selected':''}>Concluído</option><option value=\"Cancelado\" ${s==='Cancelado'?'selected':''}>Cancelado</option><option value=\"Enviado\" ${s==='Enviado'?'selected':''}>Enviado</option></select></div></form>`; })();
                break;
            case 'tarefas':
                title = 'Editar Tarefa';
                formHtml = this.getTarefaForm(id);
                break;
            case 'financeiro':
            case 'transacoes':
                title = 'Editar Despesa';
                formHtml = this.getFinanceiroForm(id);
                break;
            case 'contasReceber':
                title = 'Editar Conta a Receber';
                formHtml = this.getContaReceberForm(id);
                // Bug 2 Fix: popular select de clientes com selectedId explícito (evita race condition)
                // O selectedId é extraído do registro ANTES da chamada assíncrona,
                // garantindo que o valor correto seja definido após as opções carregarem.
                {
                    const _crRecord = this.getRecordData('contasReceber', id) || {};
                    const _crSelectedId = String(_crRecord.clienteId ?? _crRecord.cliente_id ?? '');
                    Promise.resolve().then(async () => {
                        try {
                            if (window.ModuleSystem && typeof ModuleSystem.syncClientesFromBackend === 'function') {
                                await ModuleSystem.syncClientesFromBackend();
                            }
                        } catch (_e) {}
                        try {
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
                            const modalContent = document.getElementById('modal-content');
                            if (!modalContent) return;
                            const form = modalContent.querySelector('form#crud-form[data-module="contasReceber"]');
                            if (!form) return;
                            const sel = form.querySelector('select[name="clienteId"]');
                            if (!sel || allClientes.length === 0) return;
                            // Usar o selectedId capturado ANTES da chamada async (evita race condition)
                            const targetVal = _crSelectedId || sel.value;
                            while (sel.options.length > 1) sel.remove(1);
                            allClientes.forEach(c => {
                                const nome = c.nome || c.razao_social || c.empresa || `ID ${c.id}`;
                                const email = c.email ? ` • ${c.email}` : '';
                                const opt = document.createElement('option');
                                opt.value = String(c.id);
                                opt.textContent = `${nome}${email}`;
                                sel.appendChild(opt);
                            });
                            // Definir o valor após popular as opções
                            if (targetVal) {
                                sel.value = targetVal;
                                // Se ainda não encontrou, tentar comparação numérica
                                if (sel.value !== targetVal) {
                                    const numTarget = parseInt(targetVal, 10);
                                    const matchOpt = Array.from(sel.options).find(o => parseInt(o.value, 10) === numTarget);
                                    if (matchOpt) sel.value = matchOpt.value;
                                }
                            }
                        } catch (_e2) {}
                    });
                }
                break;
            case 'marketing_campanhas':
                title = 'Editar Campanha';
                formHtml = this.getCampaignForm(id);
                break;
            case 'marketing_contatos':
                title = 'Editar Contato';
                formHtml = this.getContactForm(id);
                break;
            case 'usuarios':
                title = 'Editar Usuário';
                formHtml = this.getUsuarioForm(id);
                break;
            case 'eventos':
                title = 'Editar Evento';
                formHtml = this.getEventoForm(id);
                break;
            case 'demandasJuridicas':
                title = 'Editar Demanda Jurídica';
                formHtml = this.getDemandaJuridicaForm(id);
                break;
            default:
                console.error('[FormSystem] Módulo não reconhecido:', module);
                return;
        }
        
        this.openModal(title, formHtml);
        
        // Vincular eventos específicos após abrir o modal
        if (module === 'eventos') {
            try {
                const root = document.getElementById('modal-content') || document;
                this.bindEventoAI(root);
            } catch {}
        }
        // Módulos com botões internos próprios: ocultar o rodapé externo explicitamente
        try {
            const _modulesWithInternalButtons = ['contasReceber', 'transacoes', 'financeiro', 'demandasJuridicas', 'tarefas'];
            const _footer = document.getElementById('modal-footer');
            const _saveBtn = document.getElementById('modal-save');
            const _contentEl = document.getElementById('modal-content');
            const _form = _contentEl ? _contentEl.querySelector('form') : null;
            const _hasInternal = _form ? !!_form.querySelector('button[type="submit"], .btn-submit') : false;
            if (_hasInternal || _modulesWithInternalButtons.includes(module)) {
                if (_footer) _footer.classList.add('hidden');
                if (_saveBtn) _saveBtn.classList.add('hidden');
            } else {
                if (_saveBtn) {
                    if (module !== 'briefings') {
                        _saveBtn.textContent = 'Salvar';
                        if (module === 'clientes') _saveBtn.textContent = 'Atualizar Cliente';
                        if (module === 'eventos') _saveBtn.textContent = 'Atualizar Evento';
                    }
                }
            }
        } catch {}
        if (module === 'briefings') {
            try {
                const root = document.getElementById('modal-content') || document;
                if (window.BriefingSystem && typeof BriefingSystem.bindFormAutoFill === 'function') {
                    BriefingSystem.bindFormAutoFill(root);
                }
                const saveBtn = document.getElementById('modal-save');
                const st = record && record.status != null ? String(record.status).trim() : '';
                if (saveBtn && st === 'Enviado') {
                    saveBtn.disabled = true;
                    saveBtn.textContent = 'Enviado';
                    saveBtn.className = 'px-4 py-2 text-sm font-medium text-white bg-gray-400 border border-transparent rounded-md cursor-not-allowed';
                } else if (saveBtn) {
                    saveBtn.disabled = false;
                }
            } catch {}
        }
        if (module === 'projetos') {
            try { this.bindProjetoAutoFill(document.getElementById('modal-content') || document); } catch {}
        }
    },

    bindProjetoAutoFill(rootElement) {
        const root = rootElement || document;
        const form = root.querySelector('form#crud-form[data-module="projetos"]');
        if (!form) return;

        const oportunidadeSelect = form.querySelector('select[name="oportunidade_id"]');
        const briefingSelect = form.querySelector('select[name="briefing_id"]');
        const nomeInput = form.querySelector('input[name="nome"]');
        const areaInput = form.querySelector('input[name="area_m2"]');
        const tipoInput = form.querySelector('input[name="tipo_stand"]');
        const custoInput = form.querySelector('input[name="custo_estimado"]');

        const bindOportunidades = async () => {
            if (!oportunidadeSelect) return;
            if (oportunidadeSelect.getAttribute('data-bound') === '1') return;
            oportunidadeSelect.setAttribute('data-bound', '1');

            await this.ensureOportunidadesLoaded();
            const list = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.oportunidades)) ? ModuleSystem.data.oportunidades : [];
            const current = oportunidadeSelect.getAttribute('data-initial') || oportunidadeSelect.value || '';
            const mkLabel = (op) => {
                const id = op && op.id != null ? String(op.id) : '';
                const lead = op && (op.lead_nome || op.leadNome) ? String(op.lead_nome || op.leadNome).trim() : '';
                const evento = op && (op.evento_nome || op.eventoNome) ? String(op.evento_nome || op.eventoNome).trim() : '';
                const etapa = op && op.etapa ? String(op.etapa).trim() : '';
                const parts = [lead, evento].filter(Boolean).join(' • ');
                const right = [parts, etapa].filter(Boolean).join(' — ');
                return `#${id}${right ? ' — ' + right : ''}`;
            };

            const sorted = [...list].sort((a, b) => {
                const aa = (a && (a.updated_at || a.created_at)) ? String(a.updated_at || a.created_at) : '';
                const bb = (b && (b.updated_at || b.created_at)) ? String(b.updated_at || b.created_at) : '';
                return bb.localeCompare(aa);
            });

            oportunidadeSelect.innerHTML = `<option value="">(Opcional) Vincular oportunidade...</option>` + sorted.map(op => {
                const id = op && op.id != null ? String(op.id) : '';
                if (!id) return '';
                const selected = current && String(current) === id ? 'selected' : '';
                const label = this.escapeHtml(mkLabel(op));
                return `<option value="${this.escapeHtml(id)}" ${selected}>${label}</option>`;
            }).filter(Boolean).join('');
        };

        const getBriefing = (id) => {
            const all = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.briefings)) ? ModuleSystem.data.briefings : [];
            return all.find(b => b && b.id != null && String(b.id) === String(id)) || null;
        };
        const getClienteNome = (briefing) => {
            if (!briefing) return '';
            const direct = briefing.empresa || briefing.clienteNome || briefing.cliente || briefing.razao_social || '';
            if (direct) return String(direct);
            const cid = briefing.clienteId ?? briefing.cliente_id;
            if (cid == null) return '';
            const clientes = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.clientes)) ? ModuleSystem.data.clientes : [];
            const leads = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.leads)) ? ModuleSystem.data.leads : [];
            const all = [...clientes, ...leads];
            const found = all.find(c => c && c.id != null && String(c.id) === String(cid));
            if (!found) return '';
            return String(found.nome || found.razao_social || found.empresa || '');
        };
        const getEventoNome = (briefing) => {
            if (!briefing) return '';
            const direct = briefing.nomeEvento || briefing.nome_evento || briefing.evento_nome || briefing.evento || '';
            if (direct) return String(direct);
            const eid = briefing.eventoId ?? briefing.evento_id;
            if (eid == null) return '';
            const eventos = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.eventos)) ? ModuleSystem.data.eventos : [];
            const found = eventos.find(e => e && e.id != null && String(e.id) === String(eid));
            if (!found) return '';
            return String(found.nome || found.titulo || '');
        };

        const setNomeAuto = () => {
            if (!briefingSelect || !nomeInput) return;
            const b = briefingSelect.value ? getBriefing(briefingSelect.value) : null;
            const cliente = getClienteNome(b).trim();
            const evento = getEventoNome(b).trim();
            const auto = [cliente, evento].filter(Boolean).join(' • ');
            const cur = String(nomeInput.value || '').trim();
            const prevAuto = String(nomeInput.getAttribute('data-auto') || '').trim();
            if (!cur || cur === prevAuto) {
                nomeInput.value = auto || cur;
                nomeInput.setAttribute('data-auto', auto);
            }
        };

        const ensurePrecoM2 = async () => {
            if (this._projetosPrecoM2Loaded) return;
            this._projetosPrecoM2Loaded = true;
            try {
                const resp = await fetch('/api/crm/settings/projetos', { credentials: 'include' });
                const json = await resp.json().catch(() => ({}));
                this._projetosPrecoM2 = (resp.ok && json && json.precoM2PorTipo) ? json.precoM2PorTipo : {};
            } catch {
                this._projetosPrecoM2 = {};
            }
        };

        const calcCusto = async () => {
            if (!areaInput || !tipoInput || !custoInput) return;
            await ensurePrecoM2();
            const area = areaInput.value != null && String(areaInput.value).trim() !== '' ? Number(String(areaInput.value).replace(',', '.')) : NaN;
            const tipo = String(tipoInput.value || '').trim().toLowerCase();
            const preco = (this._projetosPrecoM2 && this._projetosPrecoM2[tipo] != null) ? Number(this._projetosPrecoM2[tipo]) : NaN;
            if (Number.isFinite(area) && Number.isFinite(preco)) custoInput.value = String((area * preco).toFixed(2));
        };

        if (briefingSelect) briefingSelect.addEventListener('change', () => { setNomeAuto(); });
        if (areaInput) areaInput.addEventListener('input', () => { calcCusto(); });
        if (tipoInput) tipoInput.addEventListener('input', () => { calcCusto(); });

        bindOportunidades().catch(() => {});
        setNomeAuto();
        calcCusto();
    },

    // Mostrar detalhes (alias para showReadForm para compatibilidade)
    showDetails(module, id) {
        return this.showReadForm(module, id);
    },

    // Mostrar formulário de visualização (somente leitura)
    showReadForm(module, id) {
        console.log('[FormSystem] Mostrando visualização para:', module, id);
        
        if (!id) {
            console.error('[FormSystem] ID não fornecido para visualização');
            return;
        }

        // Buscar dados do registro
        const record = this.getRecordData(module, id);
        if (!record) {
            console.error('[FormSystem] Registro não encontrado:', module, id);
            return;
        }

        let title, content;
        
        switch (module) {
            case 'leads':
            case 'marketing_leads':
                title = 'Detalhes do Lead';
                content = this.getLeadReadView(record);
                break;
            case 'campanhas':
            case 'marketing_campanhas':
                title = 'Detalhes da Campanha';
                content = this.getCampaignReadView(record);
                break;
            case 'contatos':
            case 'marketing_contatos':
                title = 'Detalhes do Contato';
                content = this.getContatoReadView(record);
                break;
            case 'clientes':
                title = 'Detalhes do Cliente';
                content = this.getClienteReadView(record);
                break;
            case 'usuarios':
                title = 'Detalhes do Usuário';
                content = this.getUsuarioReadView(record);
                break;
            case 'transacoes':
            case 'financeiro':
                title = 'Detalhes da Transação';
                content = this.getTransacaoReadView(record);
                break;
            case 'contasReceber':
                title = 'Detalhes da Conta a Receber';
                content = this.getContaReceberReadView(record);
                break;
            case 'briefings':
                title = 'Detalhes do Briefing';
                content = this.getBriefingReadView(record);
                break;
            case 'memoriais':
                title = 'Detalhes do Memorial';
                content = this.getMemorialReadView(record);
                break;
            default:
                console.warn('[FormSystem] Visualização não implementada para módulo:', module, '- abrindo formulário de edição como fallback');
                return this.showUpdateForm(module, id);
        }
        
        this.openModal(title, content);
        try {
            const footer = document.getElementById('modal-footer');
            if (footer) footer.classList.add('hidden');
        } catch {}
        if (module === 'briefings') {
            this.loadBriefingChecklist(id, record);
        }
    },

    getBriefingReadView(briefing) {
        const b = briefing || {};
        const formatDateBR = (value) => {
            try {
                if (!value) return '—';
                const d = new Date(value);
                if (isNaN(d.getTime())) return String(value);
                return d.toLocaleDateString('pt-BR');
            } catch {
                return value ? String(value) : '—';
            }
        };

        const formatCurrencyBR = (value) => {
            try {
                const n = typeof value === 'string' ? parseFloat(value) : Number(value);
                if (!isFinite(n)) return '—';
                return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            } catch {
                return value ? String(value) : '—';
            }
        };

        const orc = b.orcamentoEstimado ? formatCurrencyBR(b.orcamentoEstimado) : (b.orcamentoSugerido ? formatCurrencyBR(b.orcamentoSugerido) : (b.orcamento ? formatCurrencyBR(b.orcamento) : '—'));
        const metragem = (b.metragem || b.area || '—');
        const id = b.id != null ? String(b.id) : '';
        const checklistContainerId = `briefing-checklist-${id}`;

        return `
            <div class="space-y-6">
                <div class="bg-white border border-gray-200 rounded-lg p-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Empresa</div>
                            <div class="text-sm text-gray-900 font-medium">${b.empresa || '—'}</div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Evento</div>
                            <div class="text-sm text-gray-900 font-medium">${b.nomeEvento || b.evento || '—'}</div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Tipo de Solução</div>
                            <div class="text-sm text-gray-900">${b.tipoSolucao || '—'}</div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Tipo de Stand</div>
                            <div class="text-sm text-gray-900">${b.tipoStand || '—'}</div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Metragem</div>
                            <div class="text-sm text-gray-900">${metragem}</div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Orçamento</div>
                            <div class="text-sm text-gray-900 font-semibold">${orc}</div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</div>
                            <div class="text-sm text-gray-900">${b.status || '—'}</div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Criado em</div>
                            <div class="text-sm text-gray-900">${formatDateBR(b.dataCriacao)}</div>
                        </div>
                    </div>
                </div>

                <div class="bg-white border border-gray-200 rounded-lg p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-800">Checklist de Montagem/Operação</h3>
                        <button type="button" class="text-sm text-blue-600 hover:text-blue-800" data-briefing-checklist-reload="${id}">
                            Recarregar
                        </button>
                    </div>
                    <div id="${checklistContainerId}" class="space-y-2 text-sm text-gray-700">
                        <div class="text-gray-500">Carregando checklist...</div>
                    </div>
                </div>
            </div>
        `;
    },

    getMemorialForm(id = null) {
        const m = id ? (ModuleSystem.data.memoriais || []).find(x => String(x.id) === String(id)) : {};
        const projetos = Array.isArray(ModuleSystem.data.projetos) ? ModuleSystem.data.projetos : [];
        const status = (m && m.status) ? String(m.status).toLowerCase() : 'rascunho';
        const valido = (m && m.valido_ate) ? String(m.valido_ate).slice(0,10) : '';
        const aprovadoPor = (m && m.aprovado_por) ? String(m.aprovado_por) : '';
        const dataAprovacao = (m && m.data_aprovacao) ? String(m.data_aprovacao).slice(0,10) : '';
        const c = (() => { try { return m && m.conteudo_json ? JSON.parse(m.conteudo_json) : {}; } catch { return {}; } })();
        const mobText = Array.isArray(c.mobiliario) ? c.mobiliario.map(it => `${it.quantidade||''}x ${it.descricao||''}`.trim()).join('\n') : '';
        const eleText = Array.isArray(c.eletrica_iluminacao) ? c.eletrica_iluminacao.map(it => it.item || it).join('\n') : '';
        const comText = Array.isArray(c.comunicacao_visual) ? c.comunicacao_visual.map(it => it.item || it).join('\n') : '';
        const today = (() => { try { return new Date().toISOString().slice(0,10); } catch { return ''; } })();
        const dataEmissao = c?.data_emissao || (!id ? today : '');
        const aprovacaoAte = c?.aprovacao_ate || (valido || '');
        return `
            <form id="crud-form" data-action="${id ? 'update' : 'create'}" data-module="memoriais" data-id="${id || ''}" autocomplete="on">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Projeto *</label>
                        <select name="projeto_id" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" ${id ? 'disabled' : ''} required>
                            <option value="">Selecione um projeto...</option>
                            ${projetos.map(p => `<option value="${p.id}" ${String(m?.projeto_id||'')===String(p.id)?'selected':''}>${p.nome || p.titulo || ('Projeto #'+p.id)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Título *</label>
                        <input type="text" name="titulo" value="${m?.titulo || ''}" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select name="status" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="rascunho" ${status==='rascunho'?'selected':''}>Rascunho</option>
                            <option value="aguardando_aprovacao" ${status==='aguardando_aprovacao'?'selected':''}>Aguardando Aprovação</option>
                            <option value="aprovado" ${status==='aprovado'?'selected':''}>Aprovado</option>
                            <option value="reprovado" ${status==='reprovado'?'selected':''}>Reprovado</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Validade</label>
                        <input type="date" name="valido_ate" value="${valido}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div class="md:col-span-2 bg-white border border-gray-200 rounded-lg p-4" data-memorial-ai="1">
                        <div class="flex items-center justify-between gap-3">
                            <div>
                                <div class="text-sm font-semibold text-gray-800">IA (rascunho do memorial)</div>
                                <div class="text-xs text-gray-500 mt-1">Gera um prompt com base no memorial + projeto aprovado para acelerar a elaboração.</div>
                            </div>
                            <div class="flex flex-wrap items-center gap-2">
                                <button type="button" data-memorial-ai-generate="1"
                                        class="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-300">
                                    <i class="fas fa-wand-magic-sparkles mr-2"></i>Gerar prompt
                                </button>
                                <button type="button" data-memorial-ai-open="chatgpt"
                                        class="px-3 py-2 bg-white text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition duration-300">
                                    ChatGPT
                                </button>
                                <button type="button" data-memorial-ai-open="claude"
                                        class="px-3 py-2 bg-white text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition duration-300">
                                    Claude
                                </button>
                                <button type="button" data-memorial-ai-open="gemini"
                                        class="px-3 py-2 bg-white text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition duration-300">
                                    Gemini
                                </button>
                            </div>
                        </div>
                        <div class="hidden mt-3" data-memorial-ai-box="1">
                            <label class="block text-xs font-medium text-gray-600 mb-1">Prompt gerado</label>
                            <textarea rows="8" readonly data-memorial-ai-text="1"
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"></textarea>
                            <div class="text-xs text-gray-500 mt-2">Cole este texto em uma IA para gerar o rascunho e depois traga o resultado para ajustar e salvar.</div>
                        </div>
                    </div>
                    <div class="md:col-span-2">
                        <div class="text-sm font-semibold text-gray-800 mb-1">Identificação</div>
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Cliente</label>
                                <input type="text" name="cliente" value="${c?.cliente || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Evento</label>
                                <input type="text" name="evento" value="${c?.evento || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Local</label>
                                <input type="text" name="local" value="${c?.local || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Data do Evento</label>
                                <input type="date" name="data_evento" value="${c?.data_evento || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Área (m²)</label>
                                <input type="number" step="0.01" name="area_m2" value="${c?.area_m2 ?? ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Número do Projeto</label>
                                <input type="text" name="numero_projeto" value="${c?.numero_projeto || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Data de Emissão</label>
                                <input type="date" name="data_emissao" value="${dataEmissao || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Aprovação até</label>
                                <input type="date" name="aprovacao_ate" value="${aprovacaoAte || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            </div>
                        </div>
                    </div>
                    <div class="md:col-span-2">
                        <div class="text-sm font-semibold text-gray-800 mb-1">Descrição Técnica</div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Piso</label>
                                <textarea name="piso" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg">${c?.piso || ''}</textarea>
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Fachada / Testeira</label>
                                <textarea name="fachada" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg">${c?.fachada || ''}</textarea>
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Depósito / Copa</label>
                                <textarea name="deposito_copa" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg">${c?.deposito_copa || ''}</textarea>
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Circulação e Exposição Interna</label>
                                <textarea name="circulacao_exposicao" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg">${c?.circulacao_exposicao || ''}</textarea>
                            </div>
                        </div>
                    </div>
                    <div class="md:col-span-2">
                        <div class="text-sm font-semibold text-gray-800 mb-1">Mobiliário</div>
                        <textarea name="mobiliario_linhas" rows="3" placeholder="1x Balcão\n4x Banqueta" class="w-full px-3 py-2 border border-gray-300 rounded-lg">${mobText}</textarea>
                    </div>
                    <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div class="text-sm font-semibold text-gray-800 mb-1">Elétrica / Iluminação</div>
                            <textarea name="eletrica_linhas" rows="3" placeholder="1 ponto elétrico\n2 refletores" class="w-full px-3 py-2 border border-gray-300 rounded-lg">${eleText}</textarea>
                        </div>
                        <div>
                            <div class="text-sm font-semibold text-gray-800 mb-1">Comunicação Visual</div>
                            <textarea name="comunicacao_linhas" rows="3" placeholder="Logo na testeira\nPlaca informativa" class="w-full px-3 py-2 border border-gray-300 rounded-lg">${comText}</textarea>
                        </div>
                    </div>
                    <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-600 mb-1">Manutenção</label>
                            <textarea name="manutencao" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg">${c?.manutencao || ''}</textarea>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                            <textarea name="observacoes" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg">${c?.observacoes || ''}</textarea>
                        </div>
                    </div>
                    <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-600 mb-1">Valor Total (R$)</label>
                            <input type="number" step="0.01" name="valor_total" value="${c?.valor_total ?? ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-600 mb-1">Valor por extenso</label>
                            <input type="text" name="valor_por_extenso" value="${c?.valor_por_extenso || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        </div>
                    </div>
                    <div class="md:col-span-2">
                        <div class="text-sm font-semibold text-gray-800 mb-1">Aprovação (Metadados)</div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Aprovado por</label>
                                <input type="text" name="aprovado_por" value="${aprovadoPor}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Data da Aprovação</label>
                                <input type="date" name="data_aprovacao" value="${dataAprovacao}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            </div>
                        </div>
                    </div>
                    <div class="md:col-span-2">
                        <div class="text-sm font-semibold text-gray-800 mb-1">Assinaturas (Documento)</div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Assinatura do Cliente (Nome/Cargo)</label>
                                <input type="text" name="assinante_cliente" value="${c?.assinante_cliente || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Data (Cliente)</label>
                                <input type="text" name="data_assinatura_cliente" value="${c?.data_assinatura_cliente || ''}" placeholder="___/___/______" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Responsável SAMS (Nome/Cargo)</label>
                                <input type="text" name="responsavel_sams" value="${c?.responsavel_sams || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Data (SAMS)</label>
                                <input type="text" name="data_responsavel_sams" value="${c?.data_responsavel_sams || ''}" placeholder="___/___/______" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            </div>
                        </div>
                    </div>
                    <input type="hidden" name="conteudo_json">
                </div>
            </form>
        `;
    },

    getMemorialReadView(row) {
        const toBR = (s) => { try { if (!s) return '—'; const d = new Date(s); if (isNaN(d.getTime())) return s; return d.toLocaleDateString('pt-BR'); } catch { return s || '—'; } };
        const c = (() => { try { return row && row.conteudo_json ? JSON.parse(row.conteudo_json) : {}; } catch { return {}; } })();
        return `
            <div class="space-y-6">
                <div class="bg-white border border-gray-200 rounded-lg p-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Título</div><div class="text-sm text-gray-900 font-medium">${row.titulo || '—'}</div></div>
                        <div><div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Versão</div><div class="text-sm text-gray-900 font-medium">v${row.versao || 1}</div></div>
                        <div><div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</div><div class="text-sm text-gray-900 font-medium">${row.status || '—'}</div></div>
                        <div><div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Validade</div><div class="text-sm text-gray-900 font-medium">${toBR(row.valido_ate)}</div></div>
                    </div>
                </div>
                <div class="bg-white border border-gray-200 rounded-lg p-6">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Evento</div><div class="text-sm text-gray-900 font-medium">${c.evento || '—'}</div></div>
                        <div><div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Local</div><div class="text-sm text-gray-900 font-medium">${c.local || '—'}</div></div>
                        <div><div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Área (m²)</div><div class="text-sm text-gray-900 font-medium">${c.area_m2 || '—'}</div></div>
                    </div>
                </div>
                <div class="bg-white border border-gray-200 rounded-lg p-6">
                    <div class="text-sm font-semibold text-gray-800 mb-2">Descrição Técnica</div>
                    <div class="text-sm text-gray-900"><strong>Piso:</strong> ${c.piso || '—'}</div>
                    <div class="text-sm text-gray-900"><strong>Fachada/Testeira:</strong> ${c.fachada || '—'}</div>
                    <div class="text-sm text-gray-900"><strong>Depósito/Copa:</strong> ${c.deposito_copa || '—'}</div>
                    <div class="text-sm text-gray-900"><strong>Circulação/Exposição:</strong> ${c.circulacao_exposicao || '—'}</div>
                </div>
            </div>
        `;
    },

    async loadBriefingChecklist(briefingId, record) {
        const id = briefingId != null ? String(briefingId) : '';
        const container = document.getElementById(`briefing-checklist-${id}`);
        if (!container) return;

        const renderItems = (items, source) => {
            if (!Array.isArray(items) || items.length === 0) {
                container.innerHTML = `<div class="text-gray-500">Checklist indisponível.</div>`;
                return;
            }

            container.innerHTML = items.map(item => {
                const itemId = (item && item.id != null) ? String(item.id) : '';
                const title = (item && (item.item || item.title || item.titulo)) ? (item.item || item.title || item.titulo) : '';
                const completed = !!(item && (item.done || item.completed || item.concluida));
                const disabled = source === 'api' ? '' : 'disabled';
                return `
                    <label class="flex items-center gap-3 p-2 rounded hover:bg-gray-50">
                        <input type="checkbox" class="h-4 w-4" ${completed ? 'checked' : ''} ${disabled} data-checklist-item-id="${itemId}" data-checklist-source="${source}">
                        <span class="${completed ? 'line-through text-gray-400' : 'text-gray-800'}">${title}</span>
                    </label>
                `;
            }).join('');

            const reloadBtn = document.querySelector(`[data-briefing-checklist-reload="${id}"]`);
            if (reloadBtn) {
                reloadBtn.onclick = () => this.loadBriefingChecklist(briefingId, record);
            }

            const checkboxes = container.querySelectorAll('input[type="checkbox"][data-checklist-item-id]');
            checkboxes.forEach(cb => {
                cb.addEventListener('change', async (e) => {
                    const source = e.target.getAttribute('data-checklist-source');
                    if (source !== 'api') return;
                    const itemId = e.target.getAttribute('data-checklist-item-id');
                    const done = !!e.target.checked;
                    try {
                        await fetch(`/api/crm/checklist/${encodeURIComponent(itemId)}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ done })
                        });
                    } catch {}
                });
            });
        };

        container.innerHTML = `<div class="text-gray-500">Carregando checklist...</div>`;

        let apiItems = null;
        const numericId = Number(briefingId);
        if (isFinite(numericId) && String(numericId) === String(briefingId)) {
            try {
                const response = await fetch(`/api/crm/briefings/${numericId}/checklist`, { credentials: 'include' });
                const data = await response.json().catch(() => null);
                if (response.ok && Array.isArray(data)) apiItems = data;
            } catch {}
        }
        if (apiItems) {
            renderItems(apiItems, 'api');
            return;
        }

        const localItems = (record && Array.isArray(record.checklist)) ? record.checklist : ((record && Array.isArray(record._checklistLocal)) ? record._checklistLocal : null);
        renderItems(localItems, 'local');
    },

    // Gerar visualização somente leitura para lead
    getLeadReadView(lead) {
        return `
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6 border border-blue-200">
                <h3 class="text-xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-user mr-3 text-blue-600"></i>Informações do Lead
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
                        <div class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-lg">
                            ${lead.nome || 'Não informado'}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            ${lead.email || 'Não informado'}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            ${lead.telefone || 'Não informado'}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Empresa</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            ${lead.empresa || 'Não informado'}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Origem</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            ${lead.origem || 'Não informado'}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                ${lead.status === 'Novo' ? 'bg-blue-100 text-blue-800' : 
                                  lead.status === 'Contatado' ? 'bg-yellow-100 text-yellow-800' :
                                  lead.status === 'Qualificado' ? 'bg-green-100 text-green-800' :
                                  lead.status === 'Perdido' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}">
                                ${lead.status || 'Não definido'}
                            </span>
                        </div>
                    </div>
                </div>
                
                ${lead.observacoes ? `
                    <div class="mt-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg min-h-[100px]">
                            ${lead.observacoes}
                        </div>
                    </div>
                ` : ''}
                
                <div class="mt-6 pt-4 border-t border-gray-200">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                            <strong>Criado em:</strong> ${lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : 'Não informado'}
                        </div>
                        <div>
                            <strong>Última atualização:</strong> ${lead.updated_at ? new Date(lead.updated_at).toLocaleDateString('pt-BR') : 'Não informado'}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="flex justify-end space-x-4 pt-6 border-t">
                <button type="button" onclick="FormSystem.closeModal()" 
                        class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-300"
                        title="Fechar visualização"
                        aria-label="Fechar visualização">
                    <i class="fas fa-times mr-2"></i>Fechar
                </button>
                <button type="button" onclick="FormSystem.showUpdateForm('leads', '${lead.id}')" 
                        class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300"
                        title="Editar este lead"
                        aria-label="Editar este lead">
                    <i class="fas fa-edit mr-2"></i>Editar Lead
                </button>
            </div>
        `;
    },

    // Visualização somente leitura para Campanha
    getCampaignReadView(campaign) {
        const fmtBRL = (v) => {
            try {
                const num = typeof v === 'string' ? parseFloat(v) : v;
                if (isNaN(num)) return v || 'Não informado';
                return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            } catch { return v || 'Não informado'; }
        };
        const fmtDate = (d) => {
            try { return d ? new Date(d).toLocaleDateString('pt-BR') : 'Não informado'; } catch { return d || 'Não informado'; }
        };
        const periodo = `${fmtDate(campaign?.data_inicio)} - ${fmtDate(campaign?.data_fim)}`;

        return `
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6 border border-blue-200">
                <h3 class="text-xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-bullhorn mr-3 text-blue-600"></i>Informações da Campanha
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                        <div class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-lg">${campaign?.nome || 'Não informado'}</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">${campaign?.tipo || 'Não informado'}</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">${campaign?.status || 'Não informado'}</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Período</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">${periodo}</div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 class="text-md font-semibold text-gray-800 mb-3"><i class="fas fa-wallet mr-2 text-green-600"></i>Orçamento e Meta</h4>
                    <div class="space-y-2 text-sm">
                        <div><span class="font-medium text-gray-700">Orçamento:</span> ${fmtBRL(campaign?.orcamento)}</div>
                        <div><span class="font-medium text-gray-700">Meta de Leads:</span> ${campaign?.meta_leads ?? 'Não informado'}</div>
                    </div>
                </div>
                <div class="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 class="text-md font-semibold text-gray-800 mb-3"><i class="fas fa-chart-line mr-2 text-indigo-600"></i>Desempenho</h4>
                    <div class="space-y-2 text-sm">
                        <div><span class="font-medium text-gray-700">Leads Gerados:</span> ${campaign?.leads_gerados ?? 0}</div>
                        <div><span class="font-medium text-gray-700">Conversões:</span> ${campaign?.conversoes ?? 0}</div>
                    </div>
                </div>
            </div>

            <div class="bg-white p-4 rounded-lg border border-gray-200 mt-6">
                <h4 class="text-md font-semibold text-gray-800 mb-3"><i class="fas fa-align-left mr-2 text-gray-600"></i>Descrição</h4>
                <p class="text-sm text-gray-700 whitespace-pre-line">${campaign?.descricao || 'Sem descrição.'}</p>
            </div>
        `;
    },

    // Visualização somente leitura para Contato
    getContatoReadView(contato) {
        const fmtDate = (d) => {
            try { return d ? new Date(d).toLocaleDateString('pt-BR') : 'Não informado'; } catch { return d || 'Não informado'; }
        };
        const tags = (contato?.tags || '')
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);
        const status = contato?.status || '';
        const statusClass = window.UIHelpers ? UIHelpers.computeStatusClass(status) : (status ? 'bg-blue-100 text-blue-800' : '');
        const prefillTitle = `Follow-up: ${contato?.nome || 'Contato'}`;
        const canCreateKanban = typeof this.canCreateKanbanFromForms === 'function' ? this.canCreateKanbanFromForms() : false;
        return `
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6 border border-blue-200">
                <h3 class="text-xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-address-book mr-3 text-blue-600"></i>Informações do Contato
                </h3>
                ${(status) ? `
                <div class="mb-4">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">
                        ${status || 'Não informado'}
                    </span>
                </div>` : ''}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
                        <div class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-lg">
                            ${contato?.nome || 'Não informado'}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            ${contato?.email || 'Não informado'}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            ${contato?.telefone || 'Não informado'}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Empresa</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            ${contato?.empresa || 'Não informado'}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Cargo</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            ${contato?.cargo || 'Não informado'}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Segmento</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            ${contato?.segmento || 'Não informado'}
                        </div>
                    </div>
                </div>

                ${tags.length ? `
                <div class="mt-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                    <div class="flex flex-wrap gap-2">
                        ${tags.map(tag => `<span class=\"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800\">${tag}</span>`).join('')}
                    </div>
                </div>` : ''}

                ${contato?.observacoes ? `
                    <div class="mt-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg min-h-[100px]">
                            ${contato.observacoes}
                        </div>
                    </div>
                ` : ''}

                <div class="mt-6 pt-4 border-t border-gray-200">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                            <strong>Data de cadastro:</strong> ${fmtDate(contato?.data_cadastro)}
                        </div>
                        <div>
                            <strong>Última atualização:</strong> ${contato?.updated_at ? fmtDate(contato.updated_at) : 'Não informado'}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="flex justify-end space-x-4 pt-6 border-t">
                <button type="button" onclick="FormSystem.closeModal()" 
                        class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-300"
                        title="Fechar visualização"
                        aria-label="Fechar visualização">
                    <i class="fas fa-times mr-2"></i>Fechar
                </button>
                <button type="button"
                        onclick="FormSystem.closeModal(); if (window.NavigationSystem && typeof window.NavigationSystem.navigateToModule === 'function') { window.NavigationSystem.navigateToModule('dashboard'); } else { console.warn('[FormSystem] NavigationSystem não disponível.'); }"
                        class="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition duration-300"
                        title="Ir para Dashboard"
                        aria-label="Ir para Dashboard">
                    <i class="fas fa-tachometer-alt mr-2"></i>Ir para Dashboard
                </button>
                ${canCreateKanban ? `
                <button type="button"
                        onclick="(function(){ try { FormSystem.closeModal(); var prefill = { titulo: '${prefillTitle.replace(/'/g, "\\'")}', descricao: 'Origem: Contato #${String(contato?.id || '').replace(/'/g, "\\'")}\\nNome: ${String(contato?.nome || '').replace(/'/g, "\\'")}\\nEmail: ${String(contato?.email || '').replace(/'/g, "\\'")}\\nTelefone: ${String(contato?.telefone || '').replace(/'/g, "\\'")}', tags: ['marketing_contatos','contato'] }; var open = function(){ try { if (window.KanbanSystem && typeof window.KanbanSystem.init === 'function') { window.KanbanSystem.init(); } if (window.KanbanSystem && typeof window.KanbanSystem.showTaskFormWithPrefill === 'function') { window.KanbanSystem.showTaskFormWithPrefill(prefill, 'todo'); } else if (window.KanbanSystem && typeof window.KanbanSystem.showTaskForm === 'function') { window.KanbanSystem.showTaskForm('todo'); } } catch(e) { console.warn('[FormSystem] Falha ao abrir Kanban:', e); } }; if (window.NavigationSystem && typeof window.NavigationSystem.ensureKanbanSystemReady === 'function') { window.NavigationSystem.ensureKanbanSystemReady(open); } else { open(); } } catch(e) { console.warn('Falha ao abrir tarefa:', e); } })()"
                        class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-300"
                        title="Criar tarefa no Kanban"
                        aria-label="Criar tarefa no Kanban">
                    <i class="fas fa-tasks mr-2"></i>Criar Tarefa
                </button>
                ` : ''}
                <button type="button" onclick="FormSystem.showUpdateForm('marketing_contatos', '${contato.id}')" 
                        class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300"
                        title="Editar este contato"
                        aria-label="Editar este contato">
                    <i class="fas fa-edit mr-2"></i>Editar Contato
                </button>
            </div>
        `;
    },

    // Visualização somente leitura para Cliente
    getClienteReadView(cliente) {
        const fmtDate = (d) => {
            try { return d ? new Date(d).toLocaleDateString('pt-BR') : 'Não informado'; } catch { return d || 'Não informado'; }
        };
        const status = cliente?.status || '';
        const segmento = cliente?.segmento || cliente?.categoria || cliente?.setor || '';
        const statusClass = window.UIHelpers ? UIHelpers.computeStatusClass(status) : '';
        const segmentoClass = window.UIHelpers ? UIHelpers.computeSegmentClass(segmento) : '';
        const addressParts = [cliente?.endereco, cliente?.bairro, cliente?.cidade, cliente?.estado, cliente?.cep].filter(Boolean);
        const mapUrl = addressParts.length ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressParts.join(', '))}` : '';
        return `
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6 border border-blue-200">
                <h3 class="text-xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-handshake mr-3 text-blue-600"></i>Informações do Cliente
                </h3>
                ${(status || segmento) ? `
                <div class="flex flex-wrap items-center gap-2 mb-4">
                    ${status ? `<span class="px-2 py-1 rounded-full text-xs font-semibold ${statusClass}"><i class="fas fa-circle mr-1 text-[10px]"></i>${status}</span>` : ''}
                    ${segmento ? `<span class="px-2 py-1 rounded-full text-xs font-semibold ${segmentoClass}"><i class="fas fa-tag mr-1"></i>${segmento}</span>` : ''}
                </div>
                ` : ''}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Nome/Razão Social</label>
                        <div class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-lg">${cliente?.nome || 'Não informado'}</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">${cliente?.email || 'Não informado'}</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">${cliente?.telefone || 'Não informado'}</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Documento (CPF/CNPJ)</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">${cliente?.documento || 'Não informado'}</div>
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Endereço</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">${cliente?.endereco || 'Não informado'}</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">CEP</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">${cliente?.cep || 'Não informado'}</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Bairro</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">${cliente?.bairro || 'Não informado'}</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">${cliente?.cidade || 'Não informado'}</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">${cliente?.estado || 'Não informado'}</div>
                    </div>
                </div>

                ${cliente?.observacoes ? `
                    <div class="mt-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg min-h-[100px]">${cliente.observacoes}</div>
                    </div>
                ` : ''}

                <div class="mt-6 pt-4 border-t border-gray-200">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div><strong>Criado em:</strong> ${fmtDate(cliente?.created_at)}</div>
                        <div><strong>Última atualização:</strong> ${fmtDate(cliente?.updated_at)}</div>
                    </div>
                </div>
            </div>

            <div class="flex justify-end space-x-4 pt-6 border-t">
                <button type="button" onclick="FormSystem.closeModal()" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-300" title="Fechar visualização" aria-label="Fechar visualização">
                    <i class="fas fa-times mr-2"></i>Fechar
                </button>
                ${mapUrl ? `<a href="${mapUrl}" target="_blank" rel="noopener" class="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition duration-300" title="Ver localização no mapa" aria-label="Ver localização no mapa">
                    <i class="fas fa-map-marker-alt mr-2"></i>Ver no mapa
                </a>` : ''}
                <button type="button" onclick="FormSystem.showUpdateForm('clientes', '${cliente?.id}')" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300" title="Editar este cliente" aria-label="Editar este cliente">
                    <i class="fas fa-edit mr-2"></i>Editar Cliente
                </button>
            </div>
        `;
    },

    // Buscar dados do registro
    getRecordData(module, id) {
        try {
            // Mapear módulos para dados
            const moduleDataMap = {
                'leads': 'leads',
                'marketing_leads': 'leads',
                'clientes': 'clientes',
                'projetos': 'projetos',
                'memoriais': 'memoriais',
                'briefings': 'briefings',
                'tarefas': 'tarefas',
                'financeiro': 'transacoes',
                'transacoes': 'transacoes',
                'contasReceber': 'contasReceber',
                'marketing_campanhas': 'campanhas',
                'campanhas': 'campanhas',
                'marketing_contatos': 'contatos',
                'contatos': 'contatos',
                'eventos': 'eventos',
                'demandasJuridicas': 'demandasJuridicas',
                'usuarios': 'usuarios'
            };

            const dataKey = moduleDataMap[module];
            if (!dataKey) {
                console.error('[FormSystem] Dados do módulo não encontrados:', module);
                return null;
            }

            const moduleData = ModuleSystem.data[dataKey];
            if (!moduleData) {
                console.error('[FormSystem] Registro não encontrado:', module, id);
                return null;
            }

            const record = moduleData.find(item => String(item.id) === String(id));
            console.log('[FormSystem] Dados carregados para edição:', record);
            return record;
        } catch (error) {
            console.error('[FormSystem] Erro ao carregar dados:', error);
            return null;
        }
    },

    // Formulário de Projeto
    getProjetoForm(id = null) {
        const projeto = id ? ModuleSystem.data.projetos?.find(p => String(p.id) === String(id)) : {};
        const formId = `projeto_${id || 'new'}`;
        
        const usuarios = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.usuarios)) ? ModuleSystem.data.usuarios : [];
        const candidatos = usuarios.filter(u => {
            const role = String(u.role || u.perfil || u.cargo || '').toLowerCase();
            const nivel = String(u.nivel_acesso || '').toLowerCase();
            return role.includes('arquit') || role.includes('engen') || role.includes('projet') || nivel === 'admin' || nivel === 'gerente';
        });
        const briefingSelected = projeto.briefing_id ?? projeto.briefingId ?? projeto.briefingId ?? projeto.briefing_id;
        const oportunidadeSelected = projeto.oportunidade_id ?? projeto.oportunidadeId ?? projeto.oportunidade ?? '';
        const responsavelSelected = projeto.responsavel_id ?? projeto.responsavelId ?? projeto.gerente_id ?? projeto.gerenteId;
        const status = projeto.status != null && String(projeto.status).trim() !== '' ? String(projeto.status).toLowerCase() : 'recebido';

        return `
            <form id="crud-form" data-action="${id ? 'update' : 'create'}" data-module="projetos" data-id="${id || ''}" autocomplete="on">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label for="nome_projeto_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Nome do Projeto *</label>
                        <input type="text" id="nome_projeto_${formId}" name="nome" value="${projeto.nome || ''}" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label for="oportunidade_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Oportunidade (Pipeline)</label>
                        <select id="oportunidade_${formId}" name="oportunidade_id" data-initial="${oportunidadeSelected}"
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="">(Opcional) Vincular oportunidade...</option>
                            ${oportunidadeSelected ? `<option value="${this.escapeHtml(String(oportunidadeSelected))}" selected>Oportunidade #${this.escapeHtml(String(oportunidadeSelected))}</option>` : ''}
                        </select>
                    </div>
                    <div>
                        <label for="briefing_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Briefing</label>
                        <select id="briefing_${formId}" name="briefing_id" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Selecione um briefing...</option>
                            ${ModuleSystem.data.briefings ? ModuleSystem.data.briefings.map(b => {
                                const empresa = b.empresa || b.cliente_nome || b.nome_cliente || '';
                                const evento = b.nome_evento || b.evento_nome || b.nomeEvento || '';
                                const label = (empresa || evento) ? [empresa, evento].filter(Boolean).join(' • ') : (b.titulo || ('Briefing #' + b.id));
                                return `<option value="${b.id}" ${String(briefingSelected) === String(b.id) ? 'selected' : ''}>${label}</option>`;
                            }).join('') : ''}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Gerente do Projeto (Arq./Eng.)</label>
                        <select name="responsavel_id" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Selecione um responsável...</option>
                            ${(candidatos || []).map(u => `<option value="${u.id}" ${String(responsavelSelected) === String(u.id) ? 'selected' : ''}>${u.nome || u.name || ('Usuário #' + u.id)}</option>`).join('')}
                        </select>
                        <div class="mt-2 flex flex-wrap gap-2">
                            <button type="button" data-form-action="reload-projetistas"
                                    class="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition duration-300">
                                Atualizar lista
                            </button>
                            <button type="button" data-form-action="toggle-projetista-form"
                                    class="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition duration-300">
                                Cadastrar Arq/Eng
                            </button>
                        </div>
                        <div class="mt-3 hidden" data-projetista-form>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label class="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                                    <input type="text" data-projetista-field="nome"
                                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                </div>
                                <div>
                                    <label class="block text-xs font-medium text-gray-600 mb-1">Email</label>
                                    <input type="email" data-projetista-field="email"
                                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                </div>
                                <div>
                                    <label class="block text-xs font-medium text-gray-600 mb-1">Senha</label>
                                    <input type="password" data-projetista-field="senha"
                                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                </div>
                            </div>
                            <div class="mt-3 flex flex-wrap gap-2">
                                <button type="button" data-form-action="save-projetista"
                                        class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-300">
                                    Salvar
                                </button>
                                <button type="button" data-form-action="cancel-projetista"
                                        class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-300">
                                    Cancelar
                                </button>
                            </div>
                            <div class="mt-2 text-xs text-gray-500">
                                O cadastro requer permissão de Administrador.
                            </div>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Data de Início</label>
                        <input type="date" name="data_inicio" value="${projeto.data_inicio || ''}"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Data de Fim</label>
                        <input type="date" name="data_fim" value="${projeto.data_fim || ''}"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <input type="hidden" name="area_m2" value="${projeto.area_m2 ?? ''}">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select name="status" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="recebido" ${status === 'recebido' ? 'selected' : ''}>Recebido</option>
                            <option value="em_elaboracao" ${status === 'em_elaboracao' ? 'selected' : ''}>Em elaboração</option>
                            <option value="aguardando_revisao" ${status === 'aguardando_revisao' ? 'selected' : ''}>Aguardando revisão</option>
                            <option value="revisao_cliente" ${status === 'revisao_cliente' ? 'selected' : ''}>Revisão cliente</option>
                            <option value="aprovado" ${status === 'aprovado' ? 'selected' : ''}>Aprovado</option>
                            <option value="finalizado" ${status === 'finalizado' ? 'selected' : ''}>Finalizado</option>
                            <option value="cancelado" ${status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                        </select>
                    </div>
                    <input type="hidden" name="tipo_stand" value="${projeto.tipo_stand ?? ''}">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Custo Estimado (R$)</label>
                        <input type="number" name="custo_estimado" value="${projeto.custo_estimado ?? ''}" step="0.01" min="0"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Comissão (%)</label>
                        <input type="number" name="comissao_percentual" value="${projeto.comissao_percentual ?? ''}" step="0.01" min="0"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                        <textarea name="descricao" rows="3" 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">${projeto.descricao || ''}</textarea>
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                        <textarea name="observacoes" rows="2" 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">${projeto.observacoes || ''}</textarea>
                    </div>
                </div>
            </form>
            ${id ? `
                <div class="mt-6 bg-white border border-gray-200 rounded-lg p-4" data-projeto-arquivos-section="1">
                    <div class="flex items-center justify-between gap-3">
                        <div>
                            <div class="text-sm font-semibold text-gray-800">Arquivos do Projeto</div>
                            <div class="text-xs text-gray-500 mt-1">Marque o arquivo aprovado para evitar confusão na montagem.</div>
                        </div>
                        <button type="button" data-projeto-arquivo-refresh="1"
                                class="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition duration-300">
                            <i class="fas fa-sync-alt mr-2"></i>Atualizar
                        </button>
                    </div>

                    <div class="mt-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
                        <div class="text-xs text-gray-600 mb-2">Arquivo aprovado para montagem</div>
                        <div data-projeto-arquivo-aprovado="1"><div class="text-sm text-gray-500">Carregando...</div></div>
                    </div>

                    <div class="mt-4 grid grid-cols-1 md:grid-cols-10 gap-3 items-end">
                        <div class="md:col-span-3">
                            <label class="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                            <input type="text" name="projeto_arquivo_nome"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                   placeholder="Ex: Projeto v3 (PDF)">
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                            <select name="projeto_arquivo_tipo"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="outro">Outro</option>
                                <option value="planta">Planta</option>
                                <option value="render">Render</option>
                                <option value="orcamento">Orçamento</option>
                                <option value="memorial">Memorial</option>
                                <option value="foto">Foto</option>
                            </select>
                        </div>
                        <div class="md:col-span-4">
                            <label class="block text-xs font-medium text-gray-600 mb-1">URL</label>
                            <input type="text" name="projeto_arquivo_url"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                   placeholder="Link do PDF/Drive/Dropbox">
                        </div>
                        <div class="md:col-span-1">
                            <button type="button" data-projeto-arquivo-add="1"
                                    class="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <div class="md:col-span-10">
                            <label class="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                            <input type="text" name="projeto_arquivo_obs"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                   placeholder="Opcional">
                        </div>
                    </div>

                    <div class="mt-4" data-projeto-arquivos-list="1"></div>
                </div>
            ` : ''}
        `;
    },

    // Formulário de Custo
    getCustoForm(id = null) {
        const custo = id ? ModuleSystem.data.custos?.find(c => String(c.id) === String(id)) : {};
        
        return `
            <form id="crud-form" data-action="${id ? 'update' : 'create'}" data-module="custos" data-id="${id || ''}" autocomplete="on">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Descrição do Custo *</label>
                        <input type="text" name="descricao" value="${custo.descricao || ''}" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Projeto Relacionado</label>
                        <select name="projeto_id" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Selecione um projeto...</option>
                            ${ModuleSystem.data.projetos ? ModuleSystem.data.projetos.map(p => 
                                `<option value="${p.id}" ${custo.projeto_id === p.id ? 'selected' : ''}>${p.nome}</option>`
                            ).join('') : ''}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                        <select name="categoria" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Selecione...</option>
                            <option value="equipamentos" ${custo.categoria === 'equipamentos' ? 'selected' : ''}>Equipamentos</option>
                            <option value="pessoal" ${custo.categoria === 'pessoal' ? 'selected' : ''}>Pessoal</option>
                            <option value="transporte" ${custo.categoria === 'transporte' ? 'selected' : ''}>Transporte</option>
                            <option value="alimentacao" ${custo.categoria === 'alimentacao' ? 'selected' : ''}>Alimentação</option>
                            <option value="decoracao" ${custo.categoria === 'decoracao' ? 'selected' : ''}>Decoração</option>
                            <option value="marketing" ${custo.categoria === 'marketing' ? 'selected' : ''}>Marketing</option>
                            <option value="terceirizados" ${custo.categoria === 'terceirizados' ? 'selected' : ''}>Terceirizados</option>
                            <option value="outros" ${custo.categoria === 'outros' ? 'selected' : ''}>Outros</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Valor *</label>
                        <input type="number" name="valor" value="${custo.valor || ''}" required step="0.01"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Data do Custo</label>
                        <input type="date" name="data_custo" value="${custo.data_custo || ''}"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Fornecedor</label>
                        <input type="text" name="fornecedor" value="${custo.fornecedor || ''}"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select name="status" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="orcado" ${custo.status === 'orcado' ? 'selected' : ''}>Orçado</option>
                            <option value="aprovado" ${custo.status === 'aprovado' ? 'selected' : ''}>Aprovado</option>
                            <option value="pago" ${custo.status === 'pago' ? 'selected' : ''}>Pago</option>
                            <option value="cancelado" ${custo.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Responsável</label>
                        <select name="responsavel_id" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Selecione um responsável...</option>
                            ${ModuleSystem.data.usuarios ? ModuleSystem.data.usuarios.map(u => 
                                `<option value="${u.id}" ${custo.responsavel_id === u.id ? 'selected' : ''}>${u.nome}</option>`
                            ).join('') : ''}
                        </select>
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                        <textarea name="observacoes" rows="3" 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">${custo.observacoes || ''}</textarea>
                    </div>
                </div>
            </form>
        `;
    },

    // Formulário Financeiro (Transações)
    getFinanceiroForm(id = null) {
        const transacao = id ? ModuleSystem.data.transacoes?.find(t => String(t.id) === String(id)) : {};
        const formId = `transacao_${id || 'new'}`;
        const vencimento = (transacao?.data || '').slice(0, 10);
        const dataPagamento = (transacao?.dataPagamento ?? transacao?.data_pagamento ?? '').slice(0, 10);
        const tipo = transacao?.tipo != null && String(transacao.tipo).trim() !== '' ? String(transacao.tipo) : 'pagar';
        const status = transacao?.status != null && String(transacao.status).trim() !== '' ? String(transacao.status) : 'Pendente';
        const recorrencia = transacao?.recorrencia != null && String(transacao.recorrencia).trim() !== '' ? String(transacao.recorrencia) : 'nenhuma';
        const recorrenciaQtd = transacao?.recorrenciaQtd != null ? Number(transacao.recorrenciaQtd) : 1;
        const comprovanteNome = transacao?.comprovanteNome ?? transacao?.comprovante_nome ?? '';
        return `
            <form id="crud-form" data-action="${id ? 'update' : 'create'}" data-module="transacoes" data-id="${id || ''}" autocomplete="on">
                <div class="bg-gradient-to-r from-red-50 to-rose-50 p-6 rounded-lg mb-6 border border-red-200">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-money-bill-wave mr-3 text-red-600"></i>${id ? 'Editar' : 'Nova'} Despesa
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="md:col-span-2">
                            <label for="descricao_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Descrição *</label>
                            <input type="text" id="descricao_${formId}" name="descricao" value="${transacao?.descricao || ''}" required 
                                   placeholder="Ex: Pagamento de fornecedor, aluguel, compra de material"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                        </div>

                        <div>
                            <label for="fornecedor_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Fornecedor</label>
                            <input type="text" id="fornecedor_${formId}" name="fornecedor" value="${transacao?.fornecedor ?? ''}"
                                   placeholder="Opcional"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                        </div>

                        <div>
                            <label for="centro_custo_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Centro de Custos</label>
                            <input type="text" id="centro_custo_${formId}" name="centroCusto" value="${transacao?.centroCusto || ''}"
                                   placeholder="Ex: Evento XPTO - Locação / Montagem"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                        </div>

                        <div>
                            <label for="categoria_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                            <input type="text" id="categoria_${formId}" name="categoria" value="${transacao?.categoria ?? ''}"
                                   placeholder="Ex: Transporte, Material, Terceirizados"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                        </div>

                        <div>
                            <label for="valor_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Valor (R$) *</label>
                            <input type="number" id="valor_${formId}" name="valor" value="${transacao?.valor ?? ''}" step="0.01" min="0" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                        </div>

                        <div>
                            <label for="data_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Vencimento *</label>
                            <input type="date" id="data_${formId}" name="data" value="${vencimento}" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                        </div>

                        <div>
                            <label for="recorrencia_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Recorrência</label>
                            <select id="recorrencia_${formId}" name="recorrencia"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                                ${[
                                    { value: 'nenhuma', label: 'Não recorrente' },
                                    { value: 'diaria', label: 'Diária' },
                                    { value: 'semanal', label: 'Semanal' },
                                    { value: 'quinzenal', label: 'Quinzenal' },
                                    { value: 'mensal', label: 'Mensal' },
                                    { value: 'bimestral', label: 'Bimestral' },
                                    { value: 'trimestral', label: 'Trimestral' },
                                    { value: 'semestral', label: 'Semestral' },
                                    { value: 'anual', label: 'Anual' }
                                ].map(o => `<option value="${o.value}" ${recorrencia === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
                            </select>
                        </div>

                        <div>
                            <label for="recorrencia_qtd_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Repetições</label>
                            <input type="number" id="recorrencia_qtd_${formId}" name="recorrenciaQtd" value="${Number.isFinite(recorrenciaQtd) && recorrenciaQtd > 0 ? recorrenciaQtd : 1}" min="1" max="240" step="1"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                        </div>

                        <div>
                            <label for="status_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                            <select id="status_${formId}" name="status" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                                ${['Pendente','Pago','Vencido','Cancelado'].map(s => `<option value="${s}" ${status === s ? 'selected' : ''}>${s}</option>`).join('')}
                            </select>
                        </div>

                        <div>
                            <label for="data_pagamento_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Data de Pagamento</label>
                            <input type="date" id="data_pagamento_${formId}" name="dataPagamento" value="${dataPagamento}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                        </div>

                        <div>
                            <label for="forma_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Forma de Pagamento</label>
                            <input type="text" id="forma_${formId}" name="formaPagamento" value="${transacao?.formaPagamento ?? transacao?.forma_pagamento ?? ''}"
                                   placeholder="Ex: Pix, Boleto, Transferência"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                        </div>

                        <div class="md:col-span-2">
                            <label for="comprovante_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Comprovante (arquivo)</label>
                            <input id="comprovante_${formId}" type="file" name="comprovante" accept="application/pdf,image/*"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white">
                            <div class="text-xs text-gray-600 mt-1">Obrigatório apenas quando o status for Pago.</div>
                            ${comprovanteNome ? `<div class="text-xs text-gray-700 mt-1">Atual: ${this.escapeHtml(String(comprovanteNome))}</div>` : ''}
                        </div>

                        <div class="md:col-span-2">
                            <label for="obs_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                            <textarea id="obs_${formId}" name="observacoes" rows="3" placeholder="Observações adicionais (opcional)"
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">${transacao?.observacoes || ''}</textarea>
                        </div>
                    </div>
                </div>

                <input type="hidden" name="tipo" value="${this.escapeHtml(tipo)}">

                <div class="flex justify-end space-x-4 pt-6 border-t">
                    <button type="button" onclick="FormSystem.closeModal()" 
                            class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-300">
                        <i class="fas fa-times mr-2"></i>Cancelar
                    </button>
                    <button type="submit" 
                            class="btn-submit px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-300">
                        <i class="fas fa-save mr-2"></i>${id ? 'Atualizar' : 'Salvar'} Despesa
                    </button>
                </div>
            </form>
        `;
    },

    // Formulário de Contas a Receber — delegado ao ContasReceberModule
    getContaReceberForm(id = null) {
        if (window.ContasReceberModule && typeof window.ContasReceberModule.getForm === 'function') {
            return window.ContasReceberModule.getForm(id);
        }
        // Fallback mínimo caso o módulo não tenha carregado
        return '<p class="text-red-500 p-4">Erro: módulo de Contas a Receber não carregado. Recarregue a página.</p>';
    },
        // Formulário de Cliente (Comercial) com Busca CEP/CNPJ e validação unificada
    getClienteForm(id = null) {
        const cliente = id ? ModuleSystem.data.clientes?.find(c => String(c.id) === String(id)) : {};
        const formId = `cliente-${id || 'new'}`;
        const defaults = (!id && typeof window !== 'undefined' && window.__samsClienteCreateDefaults) ? window.__samsClienteCreateDefaults : null;
        const defResp = defaults && defaults.responsavel_id != null ? String(defaults.responsavel_id) : '';
        const defEvento = defaults && defaults.evento_id != null ? String(defaults.evento_id) : '';
        const usuarios = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.usuarios)) ? ModuleSystem.data.usuarios : [];
        const eventos = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.eventos)) ? ModuleSystem.data.eventos : [];
        return `
            <form id="crud-form" data-action="${id ? 'update' : 'create'}" data-module="clientes" data-id="${id || ''}" autocomplete="on">
                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6 border border-blue-200">
                    <h3 class="text-xl font-bold text-gray-800 mb-2">
                        <i class="fas fa-handshake mr-3 text-blue-600"></i>${id ? 'Editar' : 'Novo'} Cliente
                    </h3>
                    <p class="text-sm text-gray-600">Cliente qualificado do CRM. Integração com CEP e CNPJ.</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label for="${formId}-documento" class="block text-sm font-medium text-gray-700 mb-2">Documento (CPF/CNPJ) *</label>
                        <div class="flex gap-2">
                            <input type="text" id="${formId}-documento" name="documento" value="${cliente?.documento || ''}" required autofocus
                                   placeholder="00.000.000/0000-00"
                                   class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg">
                            <button type="button" data-form-action="busca-cnpj" class="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg">
                                <i class="fas fa-search mr-2"></i>Buscar CNPJ
                            </button>
                            <button type="button" data-form-action="extract-document"
                                    class="px-4 py-2 bg-white text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50">
                                <i class="fas fa-id-card mr-2"></i>Imagem
                            </button>
                        </div>
                        <p class="text-xs text-gray-500 mt-1">Usa BrasilAPI para preencher dados da empresa.</p>
                        <input type="file" accept="image/*" class="hidden" data-form-action="extract-document-input">
                    </div>

                    <div>
                        <label for="${formId}-nome" class="block text-sm font-medium text-gray-700 mb-2">Nome/Razão Social *</label>
                        <input type="text" id="${formId}-nome" name="nome" value="${cliente?.nome || ''}" required 
                               placeholder="Ex: SAMS Locações Ltda"
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg">
                    </div>

                    <div>
                        <label for="${formId}-email" class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                        <input type="email" id="${formId}-email" name="email" value="${cliente?.email || ''}" required 
                               placeholder="contato@empresa.com"
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg">
                    </div>

                    <div>
                        <label for="${formId}-telefone" class="block text-sm font-medium text-gray-700 mb-2">Telefone *</label>
                        <input type="tel" id="${formId}-telefone" name="telefone" value="${cliente?.telefone || ''}" required 
                               placeholder="(11) 99999-9999"
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg">
                    </div>

                    <div class="md:col-span-2 border border-gray-200 rounded-lg p-4 bg-white" data-cliente-contato-vinculo>
                        <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                            <h4 class="text-sm font-semibold text-gray-800">Vincular Contato existente</h4>
                            <input type="hidden" name="contato_id" value="" data-selected-contato-id>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                            <div class="md:col-span-2">
                                <label class="block text-xs font-medium text-gray-700 mb-1">Buscar contato</label>
                                <input type="text"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                       placeholder="Nome, email, telefone ou empresa"
                                       autocomplete="off"
                                       data-contato-search>
                            </div>
                            <div class="flex gap-2">
                                <button type="button"
                                        class="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                                        data-form-action="limpar-contato">
                                    Limpar
                                </button>
                                <button type="button"
                                        class="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg hidden"
                                        data-form-action="vincular-contato">
                                    Vincular
                                </button>
                            </div>
                        </div>
                        <div class="mt-3 text-sm text-gray-500" data-contato-selected></div>
                        <div class="mt-3 text-sm text-gray-600" data-contato-results>Digite para buscar.</div>
                    </div>

                    ${id ? '' : `
                    <div>
                        <label for="${formId}-responsavel" class="block text-sm font-medium text-gray-700 mb-2">Responsável</label>
                        <select id="${formId}-responsavel" name="responsavel_id"
                                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg">
                            <option value="">(Sem responsável)</option>
                            ${usuarios.map(u => {
                                const uid = u.id != null ? String(u.id) : '';
                                const uname = u.name || u.nome || `Usuário #${uid}`;
                                const selected = defResp !== '' && uid === defResp ? 'selected' : '';
                                return `<option value="${uid}" ${selected}>${uname}</option>`;
                            }).join('')}
                        </select>
                    </div>

                    <div>
                        <label for="${formId}-evento" class="block text-sm font-medium text-gray-700 mb-2">Evento Alvo</label>
                        <select id="${formId}-evento" name="evento_id"
                                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg">
                            <option value="">(Sem evento)</option>
                            ${eventos.map(e => {
                                const eid = e.id != null ? String(e.id) : '';
                                const ename = e.nome || e.titulo || `Evento #${eid}`;
                                const selected = defEvento !== '' && eid === defEvento ? 'selected' : '';
                                return `<option value="${eid}" ${selected}>${ename}</option>`;
                            }).join('')}
                        </select>
                    </div>
                    `}

                    <div>
                        <label for="${formId}-cep" class="block text-sm font-medium text-gray-700 mb-2">CEP *</label>
                        <div class="flex gap-2">
                            <input type="text" id="${formId}-cep" name="cep" value="${cliente?.cep || ''}" required 
                                   placeholder="00000-000"
                                   class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg">
                            <button type="button" data-form-action="busca-cep" class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
                                <i class="fas fa-search mr-2"></i>Buscar CEP
                            </button>
                        </div>
                        <p class="text-xs text-gray-500 mt-1">Busca ViaCEP e auto-preenche endereço.</p>
                    </div>

                    <div class="md:col-span-2">
                        <label for="${formId}-endereco" class="block text-sm font-medium text-gray-700 mb-2">Endereço *</label>
                        <input type="text" id="${formId}-endereco" name="endereco" value="${cliente?.endereco || ''}" required 
                               placeholder="Logradouro, número, complemento"
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg">
                    </div>

                    <div>
                        <label for="${formId}-bairro" class="block text-sm font-medium text-gray-700 mb-2">Bairro</label>
                        <input type="text" id="${formId}-bairro" name="bairro" value="${cliente?.bairro || ''}"
                               placeholder="Bairro"
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg">
                    </div>
                    <div>
                        <label for="${formId}-cidade" class="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                        <input type="text" id="${formId}-cidade" name="cidade" value="${cliente?.cidade || ''}"
                               placeholder="Cidade"
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg">
                    </div>
                    <div>
                        <label for="${formId}-estado" class="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                        <input type="text" id="${formId}-estado" name="estado" value="${cliente?.estado || ''}"
                               placeholder="UF"
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg">
                    </div>

                    <div>
                        <label for="${formId}-segmento" class="block text-sm font-medium text-gray-700 mb-2">Segmento</label>
                        <select id="${formId}-segmento" name="segmento" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="">Selecione o segmento</option>
                            <option value="Tecnologia" ${cliente?.segmento === 'Tecnologia' ? 'selected' : ''}>Tecnologia</option>
                            <option value="Saúde" ${cliente?.segmento === 'Saúde' ? 'selected' : ''}>Saúde</option>
                            <option value="Educação" ${cliente?.segmento === 'Educação' ? 'selected' : ''}>Educação</option>
                            <option value="Varejo" ${cliente?.segmento === 'Varejo' ? 'selected' : ''}>Varejo</option>
                            <option value="Indústria" ${cliente?.segmento === 'Indústria' ? 'selected' : ''}>Indústria</option>
                            <option value="Serviços" ${cliente?.segmento === 'Serviços' ? 'selected' : ''}>Serviços</option>
                            <option value="Eventos" ${cliente?.segmento === 'Eventos' ? 'selected' : ''}>Eventos</option>
                            <option value="Outros" ${cliente?.segmento === 'Outros' ? 'selected' : ''}>Outros</option>
                        </select>
                    </div>

                    <div class="md:col-span-2 border border-gray-200 rounded-lg p-4 bg-white" data-briefings-history>
                        <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                            <h4 class="text-sm font-semibold text-gray-800">Briefings deste cliente</h4>
                            <button type="button" data-form-action="open-briefing"
                                    class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
                                <i class="fas fa-plus mr-2"></i>Novo Briefing
                            </button>
                        </div>
                        <div class="text-sm text-gray-500" data-briefings-history-list>Carregando...</div>
                    </div>

                    <div class="md:col-span-2 border border-gray-200 rounded-lg p-4 bg-white" data-client-files>
                        <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                            <h4 class="text-sm font-semibold text-gray-800">Arquivos deste cliente</h4>
                            <div class="flex items-center gap-2">
                                <label class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg cursor-pointer">
                                    <input type="file" multiple class="hidden" data-form-action="upload-client-files">
                                    <i class="fas fa-paperclip mr-2"></i>Anexar
                                </label>
                                <button type="button" data-form-action="refresh-client-files"
                                        class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg">
                                    <i class="fas fa-sync-alt mr-2"></i>Atualizar
                                </button>
                            </div>
                        </div>
                        <div class="text-sm text-gray-500" data-client-files-list>Carregando...</div>
                    </div>
                </div>
            </form>
        `;
    },

    // Visualização somente leitura da Transação
    getTransacaoReadView(transacao) {
        const valor = (() => {
            const n = typeof transacao?.valor === 'number' ? transacao.valor : parseFloat(transacao?.valor);
            return isNaN(n) ? 'Não informado' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        })();

        const dataBR = transacao?.data ? new Date(transacao.data).toLocaleDateString('pt-BR') : 'Não informado';
        const tipoBadge = transacao?.tipo === 'pagar' ? 'bg-red-100 text-red-800' : transacao?.tipo === 'receber' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
        const statusBadge = transacao?.status === 'pago' ? 'bg-emerald-100 text-emerald-800' : transacao?.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' : transacao?.status === 'cancelado' ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-800';

        return `
            <div class="bg-gradient-to-r from-red-50 to-rose-50 p-6 rounded-lg mb-6 border border-red-200">
                <h3 class="text-xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-money-bill-wave mr-3 text-red-600"></i>Despesa
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                        <div class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-lg">
                            ${transacao?.descricao || 'Não informado'}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tipoBadge}">
                                ${transacao?.tipo || 'Não informado'}
                            </span>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Valor</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            ${valor}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge}">
                                ${transacao?.status || 'Não informado'}
                            </span>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Vencimento</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            ${dataBR}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Centro de Custos</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            ${transacao?.centroCusto || 'Não informado'}
                        </div>
                    </div>
                </div>
                ${transacao?.observacoes ? `
                    <div class="mt-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg min-h-[100px]">
                            ${transacao.observacoes}
                        </div>
                    </div>
                ` : ''}
                ${(transacao?.comprovanteUrl || transacao?.comprovante_url) ? `
                    <div class="mt-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Comprovante</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-3">
                            <i class="fas fa-paperclip text-gray-500"></i>
                            <a href="${transacao.comprovanteUrl || transacao.comprovante_url}" target="_blank" rel="noopener noreferrer"
                               class="text-blue-600 hover:text-blue-800 underline text-sm truncate" title="Abrir comprovante">
                                ${transacao.comprovanteNome || 'Ver comprovante'}
                            </a>
                            <span class="ml-auto text-xs text-gray-400">Clique para abrir</span>
                        </div>
                    </div>
                ` : ''}
            </div>
            <div class="flex justify-end space-x-4 pt-6 border-t">
                <button type="button" onclick="FormSystem.closeModal()" 
                        class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-300"
                        title="Fechar visualização" aria-label="Fechar visualização">
                    <i class="fas fa-times mr-2"></i>Fechar
                </button>
                <button type="button" onclick="FormSystem.showUpdateForm('financeiro', '${transacao?.id}')" 
                        class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-300"
                        title="Editar esta despesa" aria-label="Editar esta despesa">
                    <i class="fas fa-edit mr-2"></i>Editar Despesa
                </button>
            </div>
        `;
    },

    // Visualização somente leitura da Conta a Receber
    getContaReceberReadView(conta) {
        const valor = (() => {
            const n = typeof conta?.valor === 'number' ? conta.valor : Number(String(conta?.valor ?? '').replace(',', '.'));
            return Number.isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Não informado';
        })();

        const fmtDate = (d) => {
            if (!d) return 'Não informado';
            try { return new Date(String(d).slice(0, 10)).toLocaleDateString('pt-BR'); } catch { return String(d); }
        };

        const status = conta?.status || 'Pendente';
        const statusBadge = (() => {
            const s = String(status).toLowerCase();
            if (s.includes('pago') || s.includes('baix')) return 'bg-emerald-100 text-emerald-800';
            if (s.includes('pend')) return 'bg-yellow-100 text-yellow-800';
            if (s.includes('venc')) return 'bg-red-100 text-red-800';
            if (s.includes('cancel')) return 'bg-gray-200 text-gray-700';
            return 'bg-gray-100 text-gray-800';
        })();

        const clienteNome = conta?.clienteNome || conta?.cliente_nome || 'Não informado';
        const clienteEmail = conta?.clienteEmail || conta?.cliente_email || '';
        const tipoReceita = conta?.tipoReceita || conta?.tipo_receita || 'Não informado';
        const centroCusto = conta?.centroCusto || conta?.centro_custo || 'Não informado';

        return `
            <div class="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg mb-6 border border-green-200">
                <h3 class="text-xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-hand-holding-usd mr-3 text-green-600"></i>Conta a Receber
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
                        <div class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-lg">
                            ${clienteNome}${clienteEmail ? `<div class="text-sm text-gray-600 mt-1">${clienteEmail}</div>` : ''}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge}">
                                ${status}
                            </span>
                        </div>
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                        <div class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-lg">
                            ${conta?.descricao || 'Não informado'}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            ${tipoReceita}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Valor</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            ${valor}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Vencimento</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            ${fmtDate(conta?.vencimento)}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Data de Pagamento</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            ${fmtDate(conta?.dataPagamento ?? conta?.data_pagamento)}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Forma de Pagamento</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            ${conta?.formaPagamento ?? conta?.forma_pagamento ?? 'Não informado'}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Venda (ID)</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            ${conta?.vendaId ?? conta?.venda_id ?? 'Não informado'}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Centro de Custos</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            ${centroCusto}
                        </div>
                    </div>
                </div>

                ${conta?.observacoes ? `
                    <div class="mt-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg min-h-[100px]">
                            ${conta.observacoes}
                        </div>
                    </div>
                ` : ''}
            </div>
            <div class="flex justify-end space-x-4 pt-6 border-t">
                <button type="button" onclick="FormSystem.closeModal()"
                        class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-300"
                        title="Fechar visualização" aria-label="Fechar visualização">
                    <i class="fas fa-times mr-2"></i>Fechar
                </button>
                <button type="button" onclick="FormSystem.showUpdateForm('contasReceber', '${conta?.id}')"
                        class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-300"
                        title="Editar esta conta a receber" aria-label="Editar esta conta a receber">
                    <i class="fas fa-edit mr-2"></i>Editar Conta
                </button>
            </div>
        `;
    },

    // Formulário de Tarefa Administrativa
    getTarefaAdministrativaForm(id = null) {
        const tarefa = id ? ModuleSystem.data.tarefas_administrativas?.find(t => String(t.id) === String(id)) : {};
        
        return `
            <form id="crud-form" data-action="${id ? 'update' : 'create'}" data-module="tarefas_administrativas" data-id="${id || ''}" autocomplete="on">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Título da Tarefa *</label>
                        <input type="text" name="titulo" value="${tarefa.titulo || ''}" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Responsável *</label>
                        <select name="responsavel_id" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Selecione um responsável...</option>
                            ${ModuleSystem.data.usuarios ? ModuleSystem.data.usuarios.map(u => 
                                `<option value="${u.id}" ${tarefa.responsavel_id === u.id ? 'selected' : ''}>${u.nome}</option>`
                            ).join('') : ''}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Projeto Relacionado</label>
                        <select name="projeto_id" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Selecione um projeto...</option>
                            ${ModuleSystem.data.projetos ? ModuleSystem.data.projetos.map(p => 
                                `<option value="${p.id}" ${tarefa.projeto_id === p.id ? 'selected' : ''}>${p.nome}</option>`
                            ).join('') : ''}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Prazo</label>
                        <input type="date" name="prazo" value="${tarefa.prazo || ''}"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Prioridade</label>
                        <select name="prioridade" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="baixa" ${tarefa.prioridade === 'baixa' ? 'selected' : ''}>Baixa</option>
                            <option value="media" ${tarefa.prioridade === 'media' ? 'selected' : ''}>Média</option>
                            <option value="alta" ${tarefa.prioridade === 'alta' ? 'selected' : ''}>Alta</option>
                            <option value="urgente" ${tarefa.prioridade === 'urgente' ? 'selected' : ''}>Urgente</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select name="status" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="pendente" ${tarefa.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                            <option value="em_andamento" ${tarefa.status === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
                            <option value="concluida" ${tarefa.status === 'concluida' ? 'selected' : ''}>Concluída</option>
                            <option value="cancelada" ${tarefa.status === 'cancelada' ? 'selected' : ''}>Cancelada</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                        <select name="categoria" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Selecione...</option>
                            <option value="documentacao" ${tarefa.categoria === 'documentacao' ? 'selected' : ''}>Documentação</option>
                            <option value="financeiro" ${tarefa.categoria === 'financeiro' ? 'selected' : ''}>Financeiro</option>
                            <option value="juridico" ${tarefa.categoria === 'juridico' ? 'selected' : ''}>Jurídico</option>
                            <option value="rh" ${tarefa.categoria === 'rh' ? 'selected' : ''}>Recursos Humanos</option>
                            <option value="compras" ${tarefa.categoria === 'compras' ? 'selected' : ''}>Compras</option>
                            <option value="manutencao" ${tarefa.categoria === 'manutencao' ? 'selected' : ''}>Manutenção</option>
                            <option value="outros" ${tarefa.categoria === 'outros' ? 'selected' : ''}>Outros</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Tempo Estimado (horas)</label>
                        <input type="number" name="tempo_estimado" value="${tarefa.tempo_estimado || ''}" step="0.5"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                        <textarea name="descricao" rows="3" 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">${tarefa.descricao || ''}</textarea>
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                        <textarea name="observacoes" rows="2" 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">${tarefa.observacoes || ''}</textarea>
                    </div>
                </div>
            </form>
        `;
    },

    // Formulário de Demanda Jurídica
    getDemandaJuridicaForm(id = null) {
        const demanda = id ? ModuleSystem.data.demandasJuridicas?.find(d => String(d.id) === String(id)) : {};
        
        return `
            <form id="crud-form" data-action="${id ? 'update' : 'create'}" data-module="demandasJuridicas" data-id="${id || ''}" autocomplete="on">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Título da Demanda *</label>
                        <input type="text" name="titulo" value="${demanda.titulo || ''}" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Cliente Relacionado</label>
                        <select name="cliente_id" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Selecione um cliente...</option>
                            ${ModuleSystem.data.clientes ? ModuleSystem.data.clientes.map(c => 
                                `<option value="${c.id}" ${demanda.cliente_id === c.id ? 'selected' : ''}>${c.nome}</option>`
                            ).join('') : ''}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Demanda</label>
                        <select name="tipo_demanda" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Selecione...</option>
                            <option value="contrato" ${demanda.tipo_demanda === 'contrato' ? 'selected' : ''}>Contrato</option>
                            <option value="licenca" ${demanda.tipo_demanda === 'licenca' ? 'selected' : ''}>Licença</option>
                            <option value="alvara" ${demanda.tipo_demanda === 'alvara' ? 'selected' : ''}>Alvará</option>
                            <option value="trabalhista" ${demanda.tipo_demanda === 'trabalhista' ? 'selected' : ''}>Trabalhista</option>
                            <option value="tributario" ${demanda.tipo_demanda === 'tributario' ? 'selected' : ''}>Tributário</option>
                            <option value="civil" ${demanda.tipo_demanda === 'civil' ? 'selected' : ''}>Civil</option>
                            <option value="regulamentacao" ${demanda.tipo_demanda === 'regulamentacao' ? 'selected' : ''}>Regulamentação</option>
                            <option value="outros" ${demanda.tipo_demanda === 'outros' ? 'selected' : ''}>Outros</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Data de Abertura</label>
                        <input type="date" name="data_abertura" value="${demanda.data_abertura || ''}"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Prazo Legal</label>
                        <input type="date" name="prazo_legal" value="${demanda.prazo_legal || ''}"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Responsável Jurídico</label>
                        <select name="responsavel_id" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Selecione um responsável...</option>
                            ${ModuleSystem.data.usuarios ? ModuleSystem.data.usuarios.filter(u => u.departamento === 'juridico').map(u => 
                                `<option value="${u.id}" ${demanda.responsavel_id === u.id ? 'selected' : ''}>${u.nome}</option>`
                            ).join('') : ''}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select name="status" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="aberta" ${demanda.status === 'aberta' ? 'selected' : ''}>Aberta</option>
                            <option value="em_analise" ${demanda.status === 'em_analise' ? 'selected' : ''}>Em Análise</option>
                            <option value="aguardando_documentos" ${demanda.status === 'aguardando_documentos' ? 'selected' : ''}>Aguardando Documentos</option>
                            <option value="em_andamento" ${demanda.status === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
                            <option value="concluida" ${demanda.status === 'concluida' ? 'selected' : ''}>Concluída</option>
                            <option value="cancelada" ${demanda.status === 'cancelada' ? 'selected' : ''}>Cancelada</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Prioridade</label>
                        <select name="prioridade" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="baixa" ${demanda.prioridade === 'baixa' ? 'selected' : ''}>Baixa</option>
                            <option value="media" ${demanda.prioridade === 'media' ? 'selected' : ''}>Média</option>
                            <option value="alta" ${demanda.prioridade === 'alta' ? 'selected' : ''}>Alta</option>
                            <option value="urgente" ${demanda.prioridade === 'urgente' ? 'selected' : ''}>Urgente</option>
                        </select>
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Descrição da Demanda</label>
                        <textarea name="descricao" rows="3" 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">${demanda.descricao || ''}</textarea>
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Documentos Necessários</label>
                        <textarea name="documentos_necessarios" rows="2" 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">${demanda.documentos_necessarios || ''}</textarea>
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                        <textarea name="observacoes" rows="2" 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">${demanda.observacoes || ''}</textarea>
                    </div>
                </div>
            </form>
        `;
    },

    // Formulário de Adicional
    getAdicionalForm(id = null) {
        const adicional = id ? ModuleSystem.data.adicionais?.find(a => String(a.id) === String(id)) : {};
        
        return `
            <form id="crud-form" data-action="${id ? 'update' : 'create'}" data-module="adicionais" data-id="${id || ''}" autocomplete="on">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Nome do Item *</label>
                        <input type="text" name="nome" value="${adicional.nome || ''}" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                        <select name="categoria" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Selecione...</option>
                            <option value="equipamento_audio" ${adicional.categoria === 'equipamento_audio' ? 'selected' : ''}>Equipamento de Áudio</option>
                            <option value="equipamento_video" ${adicional.categoria === 'equipamento_video' ? 'selected' : ''}>Equipamento de Vídeo</option>
                            <option value="iluminacao" ${adicional.categoria === 'iluminacao' ? 'selected' : ''}>Iluminação</option>
                            <option value="mobiliario" ${adicional.categoria === 'mobiliario' ? 'selected' : ''}>Mobiliário</option>
                            <option value="decoracao" ${adicional.categoria === 'decoracao' ? 'selected' : ''}>Decoração</option>
                            <option value="estrutura" ${adicional.categoria === 'estrutura' ? 'selected' : ''}>Estrutura</option>
                            <option value="servico" ${adicional.categoria === 'servico' ? 'selected' : ''}>Serviço</option>
                            <option value="outros" ${adicional.categoria === 'outros' ? 'selected' : ''}>Outros</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Valor Unitário *</label>
                        <input type="number" name="valor_unitario" value="${adicional.valor_unitario || ''}" required step="0.01"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Unidade de Medida</label>
                        <select name="unidade_medida" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="unidade" ${adicional.unidade_medida === 'unidade' ? 'selected' : ''}>Unidade</option>
                            <option value="hora" ${adicional.unidade_medida === 'hora' ? 'selected' : ''}>Hora</option>
                            <option value="dia" ${adicional.unidade_medida === 'dia' ? 'selected' : ''}>Dia</option>
                            <option value="metro" ${adicional.unidade_medida === 'metro' ? 'selected' : ''}>Metro</option>
                            <option value="metro_quadrado" ${adicional.unidade_medida === 'metro_quadrado' ? 'selected' : ''}>Metro Quadrado</option>
                            <option value="kg" ${adicional.unidade_medida === 'kg' ? 'selected' : ''}>Quilograma</option>
                            <option value="litro" ${adicional.unidade_medida === 'litro' ? 'selected' : ''}>Litro</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Quantidade Disponível</label>
                        <input type="number" name="quantidade_disponivel" value="${adicional.quantidade_disponivel || ''}"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Fornecedor</label>
                        <input type="text" name="fornecedor" value="${adicional.fornecedor || ''}"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select name="status" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="disponivel" ${adicional.status === 'disponivel' ? 'selected' : ''}>Disponível</option>
                            <option value="indisponivel" ${adicional.status === 'indisponivel' ? 'selected' : ''}>Indisponível</option>
                            <option value="manutencao" ${adicional.status === 'manutencao' ? 'selected' : ''}>Em Manutenção</option>
                            <option value="descontinuado" ${adicional.status === 'descontinuado' ? 'selected' : ''}>Descontinuado</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Tempo de Setup (minutos)</label>
                        <input type="number" name="tempo_setup" value="${adicional.tempo_setup || ''}"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                        <textarea name="descricao" rows="3" 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">${adicional.descricao || ''}</textarea>
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Especificações Técnicas</label>
                        <textarea name="especificacoes_tecnicas" rows="2" 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">${adicional.especificacoes_tecnicas || ''}</textarea>
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                        <textarea name="observacoes" rows="2" 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">${adicional.observacoes || ''}</textarea>
                    </div>
                </div>
            </form>
        `;
    },

    // Aplicar máscaras e validações em tempo real com proteção especial para email
    applyRealTimeValidation(form) {
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            // Evitar aplicar eventos duplicados
            if (input.dataset.realTimeValidationApplied) {
                return;
            }
            input.dataset.realTimeValidationApplied = 'true';
            
            // Aplicar máscaras baseadas no tipo de campo (com debounce para evitar conflitos)
            if (input.name === 'telefone') {
                let phoneTimeout;
                input.addEventListener('input', (e) => {
                    clearTimeout(phoneTimeout);
                    phoneTimeout = setTimeout(() => {
                        if (window.ValidationSystem && document.contains(e.target)) {
                            const cursorPosition = e.target.selectionStart;
                            const oldValue = e.target.value;
                            const newValue = ValidationSystem.applyPhoneMask(oldValue);
                            
                            // Só atualizar se o valor realmente mudou e não está vazio
                            if (newValue !== oldValue && newValue.length > 0) {
                                e.target.value = newValue;
                                // Manter posição do cursor após aplicar máscara
                                setTimeout(() => {
                                    if (document.contains(e.target)) {
                                        // Calcular nova posição do cursor baseada na diferença de tamanho
                                        const diff = newValue.length - oldValue.length;
                                        const newCursorPos = Math.min(cursorPosition + diff, newValue.length);
                                        e.target.setSelectionRange(newCursorPos, newCursorPos);
                                    }
                                }, 0);
                            }
                        }
                    }, 50); // Debounce de 50ms
                });
            }
            
            if (input.name === 'cnpj_cpf' || input.name === 'documento') {
                let docTimeout;
                input.addEventListener('input', (e) => {
                    clearTimeout(docTimeout);
                    docTimeout = setTimeout(() => {
                        if (window.ValidationSystem && document.contains(e.target)) {
                            const cursorPosition = e.target.selectionStart;
                            const oldValue = e.target.value;
                            const newValue = ValidationSystem.applyDocumentMask(oldValue);
                            
                            // Só atualizar se o valor realmente mudou
                            if (newValue !== oldValue) {
                                e.target.value = newValue;
                                // Manter posição do cursor após aplicar máscara
                                setTimeout(() => {
                                    if (document.contains(e.target)) {
                                        e.target.setSelectionRange(cursorPosition, cursorPosition);
                                    }
                                }, 0);
                            }
                        }
                    }, 50); // Debounce de 50ms
                });
            }
            
            // Validação em tempo real ao sair do campo (com proteções especiais)
            input.addEventListener('blur', (e) => {
                // Verificar se o formulário ainda existe e não foi resetado
                if (!form.parentNode || !document.contains(form)) {
                    return;
                }
                
                // Proteção especial para campo email - evitar validação que pode causar reset
                if (e.target.name === 'email') {
                    // Aguardar mais tempo para email para evitar conflitos
                    setTimeout(() => {
                        if (document.activeElement !== e.target && 
                            form.parentNode && 
                            document.contains(form) &&
                            document.contains(e.target) &&
                            e.target.value.trim() !== '') {
                            this.validateSingleField(form, e.target);
                        }
                    }, 500); // Timeout maior para email
                } else {
                    // Aguardar um pouco para garantir que o usuário realmente saiu do campo
                    setTimeout(() => {
                        // Verificações adicionais de segurança
                        if (document.activeElement !== e.target && 
                            form.parentNode && 
                            document.contains(form) &&
                            document.contains(e.target)) {
                            this.validateSingleField(form, e.target);
                        }
                    }, 200); // Timeout maior para evitar conflitos
                }
            });
            
            // Remover erro ao começar a digitar (com proteções e debounce)
            let errorTimeout;
            input.addEventListener('input', (e) => {
                clearTimeout(errorTimeout);
                errorTimeout = setTimeout(() => {
                    // Verificar se o elemento ainda existe no DOM
                    if (!document.contains(e.target)) {
                        return;
                    }
                    
                    if (e.target.classList.contains('border-red-500')) {
                        e.target.classList.remove('border-red-500');
                        const errorMessage = e.target.parentNode.querySelector('.error-message');
                        if (errorMessage) {
                            errorMessage.remove();
                        }
                    }
                }, 100); // Debounce para evitar múltiplas execuções
            });
        });
    },

    // Validar campo individual com proteções
    validateSingleField(form, field) {
        // Verificações de segurança antes de validar
        if (!form || !field || !document.contains(form) || !document.contains(field)) {
            return;
        }
        
        // Não validar campos vazios para evitar interferências
        if (!field.value || field.value.trim() === '') {
            return;
        }
        
        const module = form.dataset.module;
        const fieldName = field.name;
        const fieldValue = field.value;
        
        // Proteção especial para campo origem - não validar para evitar limpeza
        if (fieldName === 'origem') {
            return;
        }
        
        if (window.ValidationSystem && typeof window.ValidationSystem.validateForm === 'function') {
            try {
                const data = { [fieldName]: fieldValue };
                const isValid = window.ValidationSystem.validateForm(module, data);
                
                if (!isValid) {
                    const errors = window.ValidationSystem.getValidationErrors();
                    if (errors[fieldName]) {
                        // Verificar novamente se o campo ainda existe antes de aplicar erro
                        if (document.contains(field)) {
                            field.classList.add('border-red-500');
                            
                            // Remover mensagem de erro anterior
                            const existingError = field.parentNode.querySelector('.error-message');
                            if (existingError) {
                                existingError.remove();
                            }
                            
                            // Adicionar nova mensagem de erro
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'error-message text-red-500 text-sm mt-1';
                            errorDiv.textContent = errors[fieldName];
                            field.parentNode.appendChild(errorDiv);
                        }
                    }
                } else {
                    // Campo válido - remover erros se existirem
                    if (document.contains(field)) {
                        field.classList.remove('border-red-500');
                        const errorMessage = field.parentNode.querySelector('.error-message');
                        if (errorMessage) {
                            errorMessage.remove();
                        }
                    }
                }
            } catch (error) {
                console.warn('[FormSystem] Erro na validação individual:', error);
            }
        }
    },

    // Funções auxiliares para validação e exibição de erros
    clearFormErrors(form) {
        const errorElements = form.querySelectorAll('.border-red-500, .text-red-500');
        errorElements.forEach(element => {
            element.classList.remove('border-red-500', 'text-red-500');
        });
        
        const errorMessages = form.querySelectorAll('.error-message');
        errorMessages.forEach(message => message.remove());
    },

    displayFormErrors(form, errors) {
        Object.keys(errors).forEach(fieldName => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (field) {
                field.classList.add('border-red-500');
                
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message text-red-500 text-sm mt-1';
                errorDiv.textContent = errors[fieldName];
                field.parentNode.appendChild(errorDiv);
            }
        });
    },

    // Melhorar experiência do usuário com tooltips e ajuda
    addFieldHelpers(form) {
        const helpTexts = {
            telefone: 'Formato: (11) 99999-9999',
            cnpj_cpf: 'Digite apenas números - a máscara será aplicada automaticamente',
            documento: 'Digite apenas números - a máscara será aplicada automaticamente',
            email: 'Digite um email válido (exemplo@dominio.com)',
            data_evento: 'Selecione a data do evento',
            data_inicio: 'Data de início do projeto',
            data_fim: 'Data prevista para conclusão',
            prazo: 'Data limite para conclusão da tarefa',
            data_abertura: 'Data de abertura da demanda',
            valor: 'Digite apenas números (ex: 1500.00)',
            valor_unitario: 'Valor por unidade do item',
            quantidade_disponivel: 'Quantidade em estoque'
        };

        Object.keys(helpTexts).forEach(fieldName => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (field) {
                // Adicionar texto de ajuda
                const helpText = document.createElement('div');
                helpText.className = 'text-xs text-gray-500 mt-1';
                helpText.textContent = helpTexts[fieldName];
                field.parentNode.appendChild(helpText);
                
                // Adicionar tooltip
                field.title = helpTexts[fieldName];
            }
        });
    },

    // Método getLeadForm para compatibilidade
    getLeadForm(id = null) {
        // Verificar se MarketingForms está disponível
        const marketingForms = (typeof window !== 'undefined' && window.MarketingForms) ? window.MarketingForms : null;
        if (marketingForms && typeof marketingForms.getLeadForm === 'function') return marketingForms.getLeadForm(id);
        
        // Fallback básico se MarketingForms não estiver carregado
        const lead = id ? ModuleSystem.data.leads?.find(l => String(l.id) === String(id)) : {};
        const formId = `lead-form-${id || 'new'}`;
        return `
            <form id="crud-form" data-action="${id ? 'update' : 'create'}" data-module="leads" data-id="${id || ''}">
                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6 border border-blue-200">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-user-plus mr-3 text-blue-600"></i>Informações do Lead
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label for="${formId}-nome" class="block text-sm font-medium text-gray-700 mb-2">Nome Completo *</label>
                            <input type="text" id="${formId}-nome" name="nome" value="${lead.nome || ''}" required 
                                   placeholder="Ex: João Silva"
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg">
                        </div>
                        <div>
                            <label for="${formId}-email" class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                            <input type="email" id="${formId}-email" name="email" value="${lead.email || ''}" required 
                                   placeholder="exemplo@empresa.com"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label for="${formId}-telefone" class="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                            <input type="tel" id="${formId}-telefone" name="telefone" value="${lead.telefone || ''}" 
                                   placeholder="(11) 99999-9999"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label for="${formId}-empresa" class="block text-sm font-medium text-gray-700 mb-2">Empresa</label>
                            <input type="text" id="${formId}-empresa" name="empresa" value="${lead.empresa || ''}" 
                                   placeholder="Nome da empresa"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label for="${formId}-origem" class="block text-sm font-medium text-gray-700 mb-2">Origem</label>
                            <select id="${formId}-origem" name="origem" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option value="">Selecione a origem</option>
                                <option value="Site" ${lead.origem === 'Site' ? 'selected' : ''}>Site</option>
                                <option value="Redes Sociais" ${lead.origem === 'Redes Sociais' ? 'selected' : ''}>Redes Sociais</option>
                                <option value="Indicação" ${lead.origem === 'Indicação' ? 'selected' : ''}>Indicação</option>
                                <option value="Google Ads" ${lead.origem === 'Google Ads' ? 'selected' : ''}>Google Ads</option>
                                <option value="Outros" ${lead.origem === 'Outros' ? 'selected' : ''}>Outros</option>
                            </select>
                        </div>
                        <div>
                            <label for="${formId}-status" class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <select id="${formId}-status" name="status" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option value="Novo" ${lead.status === 'Novo' ? 'selected' : ''}>Novo</option>
                                <option value="Contatado" ${lead.status === 'Contatado' ? 'selected' : ''}>Contatado</option>
                                <option value="Qualificado" ${lead.status === 'Qualificado' ? 'selected' : ''}>Qualificado</option>
                                <option value="Perdido" ${lead.status === 'Perdido' ? 'selected' : ''}>Perdido</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="flex justify-end space-x-4 pt-6 border-t">
                    <button type="button" onclick="FormSystem.closeModal()" 
                            class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-300"
                            title="Cancelar e fechar modal"
                            aria-label="Cancelar e fechar modal">
                        <i class="fas fa-times mr-2"></i>Cancelar
                    </button>
                    <button type="submit" 
                            class="btn-submit px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300"
                            data-loading="false"
                            aria-busy="false">
                        <i class="fas fa-save mr-2"></i>${id ? 'Atualizar' : 'Salvar'} Lead
                    </button>
                </div>
            </form>
        `;
    },

    // Formulários de Marketing
    getMarketingLeadForm(id = null) {
        // Verificar se MarketingForms está disponível
        const marketingForms = (typeof window !== 'undefined' && window.MarketingForms) ? window.MarketingForms : null;
        if (marketingForms && typeof marketingForms.getLeadForm === 'function') return marketingForms.getLeadForm(id);
        
        // Fallback básico se MarketingForms não estiver carregado
        return this.getLeadForm(id);
    },

    getMarketingCampaignForm(id = null) {
        // Verificar se MarketingForms está disponível
        const marketingForms = (typeof window !== 'undefined' && window.MarketingForms) ? window.MarketingForms : null;
        if (marketingForms && typeof marketingForms.getCampaignForm === 'function') return marketingForms.getCampaignForm(id);
        
        // Fallback básico se MarketingForms não estiver carregado
        return this.getCampaignForm(id);
    },

    getMarketingContactForm(id = null) {
        // Verificar se MarketingForms está disponível
        const marketingForms = (typeof window !== 'undefined' && window.MarketingForms) ? window.MarketingForms : null;
        if (marketingForms && typeof marketingForms.getContactForm === 'function') return marketingForms.getContactForm(id);
        
        // Fallback básico se MarketingForms não estiver carregado
        const contact = id ? ModuleSystem.data.contatos?.find(c => String(c.id) === String(id)) : {};
        const formId = `contact-${id || 'new'}`;
        return `
            <form id="crud-form" data-action="${id ? 'update' : 'create'}" data-module="contatos" data-id="${id || ''}">
                <div class="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg mb-6 border border-green-200">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-address-book mr-3 text-green-600"></i>Informações do Contato
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label for="contact-nome-${formId}" class="block text-sm font-medium text-gray-700 mb-2">Nome Completo *</label>
                            <input type="text" id="contact-nome-${formId}" name="nome" value="${contact.nome || ''}" required 
                                   placeholder="Ex: João Silva"
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-lg">
                        </div>
                        <div>
                            <label for="contact-email-${formId}" class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                            <input type="email" id="contact-email-${formId}" name="email" value="${contact.email || ''}" required 
                                   placeholder="exemplo@empresa.com"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                        </div>
                        <div>
                            <label for="contact-telefone-${formId}" class="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                            <input type="tel" id="contact-telefone-${formId}" name="telefone" value="${contact.telefone || ''}" 
                                   placeholder="(11) 99999-9999"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                        </div>
                        <div>
                            <label for="contact-empresa-${formId}" class="block text-sm font-medium text-gray-700 mb-2">Empresa</label>
                            <input type="text" id="contact-empresa-${formId}" name="empresa" value="${contact.empresa || ''}" 
                                   placeholder="Nome da empresa"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                        </div>
                    </div>
                </div>
                
                <div class="flex justify-end space-x-4 pt-6 border-t">
                    <button type="button" onclick="FormSystem.closeModal()" 
                            class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-300"
                            title="Cancelar e fechar modal"
                            aria-label="Cancelar e fechar modal">
                        <i class="fas fa-times mr-2"></i>Cancelar
                    </button>
                    <button type="submit" 
                            class="btn-submit px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-300"
                            data-loading="false"
                            aria-busy="false">
                        <i class="fas fa-save mr-2"></i>${id ? 'Atualizar' : 'Salvar'} Contato
                    </button>
                </div>
            </form>
        `;
    },

    // Formulário de Campanha de Marketing
    getCampaignForm(id = null) {
        // Verificar se MarketingForms está disponível
        const marketingForms = (typeof window !== 'undefined' && window.MarketingForms) ? window.MarketingForms : null;
        if (marketingForms && typeof marketingForms.getCampaignForm === 'function') return marketingForms.getCampaignForm(id);
        
        // Fallback básico se MarketingForms não estiver carregado
        const campaign = id ? ModuleSystem.data.campanhas?.find(c => String(c.id) === String(id)) : {};
        const formId = `campaign-${id || 'new'}`;
        return `
            <form id="crud-form" data-action="${id ? 'update' : 'create'}" data-module="campanhas" data-id="${id || ''}">
                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6 border border-blue-200">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-bullhorn mr-3 text-blue-600"></i>Informações da Campanha
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="md:col-span-2">
                            <label for="campaign-nome-${formId}" class="block text-sm font-medium text-gray-700 mb-2">Nome da Campanha *</label>
                            <input type="text" id="campaign-nome-${formId}" name="nome" value="${campaign.nome || ''}" required 
                                   placeholder="Ex: Campanha Black Friday 2024"
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg">
                        </div>
                        <div>
                            <label for="campaign-tipo-${formId}" class="block text-sm font-medium text-gray-700 mb-2">Tipo de Campanha *</label>
                            <select id="campaign-tipo-${formId}" name="tipo" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option value="">Selecione o tipo</option>
                                <option value="Email Marketing" ${campaign.tipo === 'Email Marketing' ? 'selected' : ''}>📧 Email Marketing</option>
                                <option value="Redes Sociais" ${campaign.tipo === 'Redes Sociais' ? 'selected' : ''}>📱 Redes Sociais</option>
                                <option value="Google Ads" ${campaign.tipo === 'Google Ads' ? 'selected' : ''}>🔍 Google Ads</option>
                                <option value="Facebook Ads" ${campaign.tipo === 'Facebook Ads' ? 'selected' : ''}>📘 Facebook Ads</option>
                                <option value="LinkedIn Ads" ${campaign.tipo === 'LinkedIn Ads' ? 'selected' : ''}>💼 LinkedIn Ads</option>
                                <option value="WhatsApp" ${campaign.tipo === 'WhatsApp' ? 'selected' : ''}>💬 WhatsApp</option>
                                <option value="SMS" ${campaign.tipo === 'SMS' ? 'selected' : ''}>📱 SMS</option>
                                <option value="Evento" ${campaign.tipo === 'Evento' ? 'selected' : ''}>🎪 Evento</option>
                                <option value="Webinar" ${campaign.tipo === 'Webinar' ? 'selected' : ''}>🖥️ Webinar</option>
                                <option value="Outros" ${campaign.tipo === 'Outros' ? 'selected' : ''}>📋 Outros</option>
                            </select>
                        </div>
                        <div>
                            <label for="campaign-status-${formId}" class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <select id="campaign-status-${formId}" name="status" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option value="Planejamento" ${campaign.status === 'Planejamento' ? 'selected' : ''}>📋 Planejamento</option>
                                <option value="Ativa" ${campaign.status === 'Ativa' ? 'selected' : ''}>🟢 Ativa</option>
                                <option value="Pausada" ${campaign.status === 'Pausada' ? 'selected' : ''}>⏸️ Pausada</option>
                                <option value="Finalizada" ${campaign.status === 'Finalizada' ? 'selected' : ''}>✅ Finalizada</option>
                                <option value="Cancelada" ${campaign.status === 'Cancelada' ? 'selected' : ''}>❌ Cancelada</option>
                            </select>
                        </div>
                        <div>
                            <label for="campaign-data-inicio-${formId}" class="block text-sm font-medium text-gray-700 mb-2">Data de Início</label>
                            <input type="date" id="campaign-data-inicio-${formId}" name="data_inicio" value="${campaign.data_inicio || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label for="campaign-data-fim-${formId}" class="block text-sm font-medium text-gray-700 mb-2">Data de Fim</label>
                            <input type="date" id="campaign-data-fim-${formId}" name="data_fim" value="${campaign.data_fim || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label for="campaign-orcamento-${formId}" class="block text-sm font-medium text-gray-700 mb-2">Orçamento (R$)</label>
                            <input type="number" id="campaign-orcamento-${formId}" name="orcamento" value="${campaign.orcamento || ''}" step="0.01" min="0"
                                   placeholder="0,00" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label for="campaign-meta-leads-${formId}" class="block text-sm font-medium text-gray-700 mb-2">Meta de Leads</label>
                            <input type="number" id="campaign-meta-leads-${formId}" name="meta_leads" value="${campaign.meta_leads || ''}" min="0"
                                   placeholder="Ex: 100" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div class="md:col-span-2">
                            <label for="campaign-descricao-${formId}" class="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                            <textarea id="campaign-descricao-${formId}" name="descricao" rows="4" 
                                      placeholder="Descreva os objetivos, público-alvo e estratégias da campanha..."
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">${campaign.descricao || ''}</textarea>
                        </div>
                    </div>
                </div>
            </form>
        `;
    },

    // Formulário de Contato/Segmentação
    getContactForm(id = null) {
        // Verificar se MarketingForms está disponível
        const marketingForms = (typeof window !== 'undefined' && window.MarketingForms) ? window.MarketingForms : null;
        if (marketingForms && typeof marketingForms.getContactForm === 'function') return marketingForms.getContactForm(id);
        
        // Fallback básico se MarketingForms não estiver carregado
        const contact = id ? ModuleSystem.data.contatos?.find(c => String(c.id) === String(id)) : {};
        return `
            <form id="crud-form" data-action="${id ? 'update' : 'create'}" data-module="contatos" data-id="${id || ''}">
                <div class="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg mb-6 border border-green-200">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-address-book mr-3 text-green-600"></i>Informações do Contato
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Nome Completo *</label>
                            <input type="text" name="nome" value="${contact.nome || ''}" required 
                                   placeholder="Nome completo do contato"
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-lg">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                            <input type="email" name="email" value="${contact.email || ''}" required
                                   placeholder="email@exemplo.com"
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                            <input type="tel" name="telefone" value="${contact.telefone || ''}"
                                   placeholder="(11) 99999-9999" data-mask="phone" maxlength="15"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Empresa</label>
                            <input type="text" name="empresa" value="${contact.empresa || ''}"
                                   placeholder="Nome da empresa"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Cargo</label>
                            <input type="text" name="cargo" value="${contact.cargo || ''}"
                                   placeholder="Ex: Gerente de Marketing"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Segmento</label>
                            <select name="segmento" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                                <option value="">Selecione o segmento</option>
                                <option value="Tecnologia" ${contact.segmento === 'Tecnologia' ? 'selected' : ''}>Tecnologia</option>
                                <option value="Saúde" ${contact.segmento === 'Saúde' ? 'selected' : ''}>Saúde</option>
                                <option value="Educação" ${contact.segmento === 'Educação' ? 'selected' : ''}>Educação</option>
                                <option value="Varejo" ${contact.segmento === 'Varejo' ? 'selected' : ''}>Varejo</option>
                                <option value="Indústria" ${contact.segmento === 'Indústria' ? 'selected' : ''}>Indústria</option>
                                <option value="Serviços" ${contact.segmento === 'Serviços' ? 'selected' : ''}>Serviços</option>
                                <option value="Eventos" ${contact.segmento === 'Eventos' ? 'selected' : ''}>Eventos</option>
                                <option value="Outros" ${contact.segmento === 'Outros' ? 'selected' : ''}>Outros</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <select name="status" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                                <option value="Ativo" ${contact.status === 'Ativo' ? 'selected' : ''}>✅ Ativo</option>
                                <option value="Inativo" ${contact.status === 'Inativo' ? 'selected' : ''}>⏸️ Inativo</option>
                                <option value="Bloqueado" ${contact.status === 'Bloqueado' ? 'selected' : ''}>🚫 Bloqueado</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Tags/Categorias</label>
                            <input type="text" name="tags" value="${contact.tags || ''}"
                                   placeholder="Ex: cliente-vip, evento-2024, newsletter"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                            <textarea name="observacoes" rows="3" 
                                      placeholder="Informações adicionais sobre o contato..."
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">${contact.observacoes || ''}</textarea>
                        </div>
                    </div>
                </div>
            </form>
        `;
    },

    // Formulário de Usuário (Administração)
    getUsuarioForm(id = null) {
        const usuario = id ? ModuleSystem.data.usuarios?.find(u => u.id == id) : {};
        const formId = `usuario-${id || 'new'}`;
        return `
            <form id="crud-form" data-action="${id ? 'update' : 'create'}" data-module="usuarios" data-id="${id || ''}">
                <div class="bg-gradient-to-r from-purple-50 to-violet-50 p-6 rounded-lg mb-6 border border-purple-200">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-user-cog mr-3 text-purple-600"></i>Informações do Usuário
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label for="${formId}-nome" class="block text-sm font-medium text-gray-700 mb-2">Nome Completo *</label>
                            <input type="text" id="${formId}-nome" name="nome" value="${usuario?.nome || ''}" required 
                                   placeholder="Ex: João Silva"
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-lg">
                        </div>
                        <div>
                            <label for="${formId}-email" class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                            <input type="email" id="${formId}-email" name="email" value="${usuario?.email || ''}" required 
                                   placeholder="exemplo@empresa.com"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                        </div>
                        <div>
                            <label for="${formId}-telefone" class="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                            <input type="tel" id="${formId}-telefone" name="telefone" value="${usuario?.telefone || ''}"
                                   placeholder="(11) 99999-9999" data-mask="phone" maxlength="15"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                        </div>
                        <div>
                            <label for="${formId}-departamento" class="block text-sm font-medium text-gray-700 mb-2">Departamento</label>
                            <select id="${formId}-departamento" name="departamento" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                                <option value="">Selecione o departamento</option>
                                ${['Comercial','Marketing','Financeiro','Administrativo','Jurídico','Montagem','Projetos','TI','RH','Direção','Outros'].map(dep => `<option value="${dep}" ${usuario?.departamento === dep ? 'selected' : ''}>${dep}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label for="${formId}-nivel" class="block text-sm font-medium text-gray-700 mb-2">Nível de Acesso</label>
                            <select id="${formId}-nivel" name="nivel_acesso" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                                <option value="">Selecione o nível</option>
                                ${['Admin','Gestor','Usuário'].map(n => `<option value="${n}" ${usuario?.nivel_acesso === n ? 'selected' : ''}>${n}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label for="${formId}-status" class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <select id="${formId}-status" name="status" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                                ${['Ativo','Inativo','Bloqueado'].map(s => `<option value="${s}" ${usuario?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                            </select>
                        </div>
                        ${!id ? `
                        <div class="md:col-span-2">
                            <label for="${formId}-senha" class="block text-sm font-medium text-gray-700 mb-2">Senha *</label>
                            <input type="password" id="${formId}-senha" name="senha" placeholder="Defina uma senha para o usuário" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                        </div>` : ''}
                        <div class="md:col-span-2">
                            <label for="${formId}-observacoes" class="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                            <textarea id="${formId}-observacoes" name="observacoes" rows="3" 
                                      placeholder="Informações adicionais sobre o usuário..."
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">${usuario?.observacoes || ''}</textarea>
                        </div>
                    </div>
                </div>
                <div class="flex justify-end space-x-4 pt-6 border-t">
                    <button type="button" onclick="FormSystem.closeModal()" 
                            class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-300">
                        <i class="fas fa-times mr-2"></i>Cancelar
                    </button>
                    <button type="submit" 
                            class="btn-submit px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-300">
                        <i class="fas fa-save mr-2"></i>${id ? 'Atualizar' : 'Salvar'} Usuário
                    </button>
                </div>
            </form>
        `;
    }
,
    // Formulário de Evento (Módulo Comercial)
    getEventoForm(id = null) {
        const evento = id ? ModuleSystem.data.eventos?.find(e => e.id == id) : {};
        const formId = `evento-${id || 'new'}`;
        return `
            <form id="crud-form" data-action="${id ? 'update' : 'create'}" data-module="eventos" data-id="${id || ''}">
                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6 border border-blue-200">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-calendar-alt mr-3 text-blue-600"></i>${id ? 'Editar Evento' : 'Novo Evento'}
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="md:col-span-2">
                            <label for="${formId}-nome" class="block text-sm font-medium text-gray-700 mb-2">Nome do Evento *</label>
                            <input type="text" id="${formId}-nome" name="nome" value="${evento?.nome || ''}" required
                                   placeholder="Ex: Feira de Tecnologia 2025"
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg">
                        </div>
                        <div>
                            <label for="${formId}-organizadora" class="block text-sm font-medium text-gray-700 mb-2">Organizadora</label>
                            <input type="text" id="${formId}-organizadora" name="organizadora" value="${evento?.organizadora || ''}"
                                   placeholder="Ex: Tech Events"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label for="${formId}-local" class="block text-sm font-medium text-gray-700 mb-2">Local</label>
                            <input type="text" id="${formId}-local" name="local" value="${evento?.local || ''}"
                                   placeholder="Ex: Expo Center Norte"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div class="md:col-span-2">
                            <label for="${formId}-endereco" class="block text-sm font-medium text-gray-700 mb-2">Endereço</label>
                            <input type="text" id="${formId}-endereco" name="endereco" value="${evento?.endereco || ''}"
                                   placeholder="Rua, número, bairro, cidade/UF"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label for="${formId}-dataInicio" class="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
                            <input type="date" id="${formId}-dataInicio" name="dataInicio" value="${evento?.dataInicio || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label for="${formId}-dataFim" class="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
                            <input type="date" id="${formId}-dataFim" name="dataFim" value="${evento?.dataFim || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label for="${formId}-status" class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <select id="${formId}-status" name="status" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                ${['Planejado','Confirmado','Concluído','Cancelado'].map(s => `<option value="${s}" ${evento?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Taxa de Limpeza (R$)</label>
                            <input type="number" step="0.01" name="taxas_limpeza" value="${evento?.taxas?.limpeza ?? ''}"
                                   placeholder="0,00"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Taxa Elétrica (R$)</label>
                            <input type="number" step="0.01" name="taxas_eletrica" value="${evento?.taxas?.eletrica ?? ''}"
                                   placeholder="0,00"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Taxa Hidráulica (R$)</label>
                            <input type="number" step="0.01" name="taxas_hidraulica" value="${evento?.taxas?.hidraulica ?? ''}"
                                   placeholder="0,00"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div class="md:col-span-2">
                            <label for="${formId}-observacoes" class="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                            <textarea id="${formId}-observacoes" name="observacoes" rows="3"
                                      placeholder="Informações adicionais do evento..."
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">${evento?.observacoes || ''}</textarea>
                        </div>
                        <div class="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4 mt-2" data-evento-ai="1">
                            <div class="flex items-center justify-between gap-3">
                                <div>
                                    <div class="text-sm font-semibold text-blue-800">IA (Prospecção de Leads)</div>
                                    <div class="text-xs text-blue-600 mt-1">Gera um prompt para buscar expositores deste evento na internet e encontrar potenciais leads.</div>
                                </div>
                                <div class="flex flex-wrap items-center gap-2">
                                    <button type="button" data-evento-ai-open="chatgpt"
                                            class="px-3 py-2 bg-white text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-100 transition duration-300">
                                        ChatGPT
                                    </button>
                                    <button type="button" data-evento-ai-open="claude"
                                            class="px-3 py-2 bg-white text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-100 transition duration-300">
                                        Claude
                                    </button>
                                    <button type="button" data-evento-ai-open="gemini"
                                            class="px-3 py-2 bg-white text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-100 transition duration-300">
                                        Gemini
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        `;
    },

    bindLeadAI(form) {
        if (!form) return;
        const wrap = form.querySelector('[data-lead-ai="1"]');
        if (!wrap) return;
        try {
            const cfg = window.CrmUiConfig;
            const disabledByFlag = cfg && cfg.features && cfg.features.aiForms === false;
            const disabledByExp = cfg && cfg.experiments && cfg.experiments.aiPanels && cfg.experiments.aiPanels.variant === 'off';
            const disabledByServer = cfg && cfg.aiEnabled === false;
            if (disabledByFlag || disabledByExp || disabledByServer) {
                wrap.classList.add('hidden');
                return;
            }
        } catch {}
        if (wrap.getAttribute('data-bound') === '1') return;
        wrap.setAttribute('data-bound', '1');

        const resultsEl = wrap.querySelector('[data-lead-ai-results]');
        const imageInput = wrap.querySelector('[data-lead-ai-image-input]');
        const btnSuggest = wrap.querySelector('[data-lead-ai-action="suggest"]');
        const btnPresentation = wrap.querySelector('[data-lead-ai-action="presentation"]');
        const btnExtract = wrap.querySelector('[data-lead-ai-action="extract-image"]');
        const voiceBtns = Array.from(form.querySelectorAll('[data-lead-ai-voice]'));

        const notify = (msg, type = 'info') => {
            if (window.Toast && typeof window.Toast.show === 'function') return window.Toast.show(msg, type);
            if (window.NotificationSystem && typeof window.NotificationSystem[type] === 'function') return window.NotificationSystem[type](msg);
            alert(msg);
        };

        const setResultsHtml = (html) => {
            if (!resultsEl) return;
            resultsEl.innerHTML = html || '';
            resultsEl.classList.toggle('hidden', !(html && String(html).trim()));
        };

        const setBusy = (busy) => {
            try { wrap.setAttribute('aria-busy', busy ? 'true' : 'false'); } catch {}
            try {
                [btnSuggest, btnPresentation, btnExtract].filter(Boolean).forEach((b) => { b.disabled = !!busy; });
            } catch {}
        };

        const collectFormData = () => {
            const fd = new FormData(form);
            const out = {};
            for (const [k, v] of fd.entries()) {
                const key = String(k || '');
                const baseKey = key.endsWith('[]') ? key.slice(0, -2) : key;
                const val = (typeof v === 'string') ? v.trim() : v;
                if (val == null || val === '') continue;
                if (out[baseKey] === undefined) out[baseKey] = val;
                else if (Array.isArray(out[baseKey])) out[baseKey].push(val);
                else out[baseKey] = [out[baseKey], val];
            }
            return out;
        };

        const setFieldValue = (name, value) => {
            if (!name) return;
            const esc = (v) => (window.CSS && typeof window.CSS.escape === 'function') ? window.CSS.escape(String(v)) : String(v);
            const el = form.querySelector(`[name="${esc(name)}"]`);
            if (!el) return;
            if (el.type === 'checkbox') {
                el.checked = !!value;
                el.dispatchEvent(new Event('change', { bubbles: true }));
                return;
            }
            if (el.type === 'radio') {
                const radio = form.querySelector(`[name="${esc(name)}"][value="${esc(value)}"]`);
                if (radio) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change', { bubbles: true }));
                }
                return;
            }
            el.value = value == null ? '' : String(value);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        };

        const applyAutofill = (autofill) => {
            const patch = (autofill && typeof autofill === 'object') ? autofill : {};
            Object.keys(patch).forEach((k) => {
                const v = patch[k];
                if (v == null) return;
                if (Array.isArray(v)) return;
                setFieldValue(k, v);
            });
        };

        const applyContentSuggestions = (items) => {
            const list = Array.isArray(items) ? items : [];
            for (const it of list) {
                if (!it) continue;
                const field = it.field != null ? String(it.field) : '';
                const suggestion = it.suggestion != null ? String(it.suggestion) : '';
                if (!field || !suggestion) continue;
                setFieldValue(field, suggestion);
            }
        };

        const apiPost = async (url, body) => {
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body || {})
            });
            const payload = await resp.json().catch(() => ({}));
            if (!resp.ok) {
                const msg = payload && payload.error ? payload.error : `Falha (${resp.status})`;
                throw new Error(msg);
            }
            return payload;
        };

        const renderAssist = (data) => {
            const summary = data && data.summary ? String(data.summary) : '';
            const validations = Array.isArray(data && data.validations) ? data.validations : [];
            const contentSuggestions = Array.isArray(data && data.contentSuggestions) ? data.contentSuggestions : [];
            const inferred = data && data.inferred ? data.inferred : null;
            const inferredTemp = inferred && inferred.temperatura ? String(inferred.temperatura) : '';

            const badge = (severity) => {
                const s = String(severity || 'info');
                if (s === 'error') return 'bg-red-50 text-red-800 border-red-200';
                if (s === 'warning') return 'bg-amber-50 text-amber-800 border-amber-200';
                return 'bg-blue-50 text-blue-800 border-blue-200';
            };

            const html = `
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <div class="text-sm font-semibold text-gray-800">Resultado IA</div>
                            ${summary ? `<div class="text-xs text-gray-600 mt-1">${this.escapeHtml(summary)}</div>` : ''}
                            ${inferredTemp ? `<div class="text-xs text-gray-600 mt-1">Sugestão de temperatura: <span class="font-semibold">${this.escapeHtml(inferredTemp)}</span></div>` : ''}
                        </div>
                        <div class="flex flex-wrap items-center gap-2 shrink-0">
                            <button type="button" data-lead-ai-apply="autofill"
                                    class="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition text-sm">
                                Aplicar preenchimento
                            </button>
                            <button type="button" data-lead-ai-apply="content"
                                    class="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition text-sm">
                                Aplicar textos
                            </button>
                        </div>
                    </div>
                    ${validations.length ? `
                        <div class="mt-3">
                            <div class="text-xs font-semibold text-gray-700 mb-2">Validações</div>
                            <div class="space-y-2">
                                ${validations.map(v => `
                                    <div class="flex items-start gap-2">
                                        <span class="px-2 py-0.5 text-xs font-semibold rounded-full border ${badge(v.severity)}">${this.escapeHtml(v.severity || 'info')}</span>
                                        <div class="text-xs text-gray-700">
                                            <span class="font-semibold">${this.escapeHtml(v.field || '')}:</span>
                                            ${this.escapeHtml(v.message || '')}
                                            ${v.suggestion ? `<div class="text-gray-500 mt-0.5">${this.escapeHtml(v.suggestion)}</div>` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${contentSuggestions.length ? `
                        <div class="mt-3">
                            <div class="text-xs font-semibold text-gray-700 mb-2">Sugestões de conteúdo</div>
                            <div class="space-y-2">
                                ${contentSuggestions.map(s => `
                                    <div class="text-xs text-gray-700">
                                        <span class="font-semibold">${this.escapeHtml(s.field || '')}:</span>
                                        <span class="text-gray-600">${this.escapeHtml((s.suggestion || '').slice(0, 280))}${(s.suggestion || '').length > 280 ? '…' : ''}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;

            setResultsHtml(html);
            try {
                const applyAutofillBtn = wrap.querySelector('[data-lead-ai-apply="autofill"]');
                const applyContentBtn = wrap.querySelector('[data-lead-ai-apply="content"]');
                if (applyAutofillBtn && !applyAutofillBtn.getAttribute('data-bound')) {
                    applyAutofillBtn.setAttribute('data-bound', '1');
                    applyAutofillBtn.addEventListener('click', () => {
                        applyAutofill(data.autofill);
                        notify('Preenchimento aplicado.', 'success');
                    });
                }
                if (applyContentBtn && !applyContentBtn.getAttribute('data-bound')) {
                    applyContentBtn.setAttribute('data-bound', '1');
                    applyContentBtn.addEventListener('click', () => {
                        applyContentSuggestions(data.contentSuggestions);
                        notify('Textos aplicados.', 'success');
                    });
                }
            } catch {}
        };

        const suggest = async () => {
            setBusy(true);
            setResultsHtml(`<div class="text-sm text-gray-600">Gerando sugestões...</div>`);
            try {
                const data = collectFormData();
                const resp = await apiPost('/api/crm/ai/form-assist', { formType: 'lead', data });
                renderAssist(resp);
            } catch (e) {
                notify(e && e.message ? e.message : 'Falha ao gerar sugestões', 'error');
                setResultsHtml('');
            } finally {
                setBusy(false);
            }
        };

        const generatePresentation = async () => {
            setBusy(true);
            setResultsHtml(`<div class="text-sm text-gray-600">Gerando apresentação...</div>`);
            try {
                const data = collectFormData();
                const context = JSON.stringify(data);
                const resp = await apiPost('/api/crm/ai/presentation', { audience: 'Cliente', context });
                const html = resp && resp.html ? String(resp.html) : '';
                if (!html) throw new Error('Apresentação gerada sem HTML');
                const w = window.open('', '_blank', 'noopener');
                if (w && w.document) {
                    w.document.open();
                    w.document.write(html);
                    w.document.close();
                } else {
                    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank', 'noopener');
                    setTimeout(() => URL.revokeObjectURL(url), 60_000);
                }
                setResultsHtml(`<div class="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">Apresentação gerada em uma nova aba.</div>`);
            } catch (e) {
                notify(e && e.message ? e.message : 'Falha ao gerar apresentação', 'error');
                setResultsHtml('');
            } finally {
                setBusy(false);
            }
        };

        const extractFromImage = async (file) => {
            if (!file) return;
            if (file.size > 2_000_000) {
                notify('Imagem muito grande. Use uma imagem menor (até 2MB).', 'warning');
                return;
            }
            setBusy(true);
            setResultsHtml(`<div class="text-sm text-gray-600">Lendo imagem...</div>`);
            try {
                const dataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
                    reader.onload = () => resolve(String(reader.result || ''));
                    reader.readAsDataURL(file);
                });
                const resp = await apiPost('/api/crm/ai/extract-image', { imageDataUrl: dataUrl, purpose: 'business_card' });
                const fields = resp && resp.fields ? resp.fields : {};
                if (fields && typeof fields === 'object') {
                    if (fields.nome) setFieldValue('nome', fields.nome);
                    if (fields.empresa) setFieldValue('empresa', fields.empresa);
                    if (fields.cargo) setFieldValue('cargo', fields.cargo);
                    if (fields.email) setFieldValue('email', fields.email);
                    if (fields.telefone) setFieldValue('telefone', fields.telefone);
                    if (fields.whatsapp) setFieldValue('whatsapp', fields.whatsapp);
                }
                setResultsHtml(`<div class="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">Dados extraídos e aplicados no formulário.</div>`);
            } catch (e) {
                notify(e && e.message ? e.message : 'Falha ao extrair dados da imagem', 'error');
                setResultsHtml('');
            } finally {
                setBusy(false);
            }
        };

        const analyzeSentimentDebounced = (() => {
            let t = null;
            let lastRunAt = 0;
            return (text) => {
                const now = Date.now();
                if (now - lastRunAt < 4500) return;
                clearTimeout(t);
                t = setTimeout(async () => {
                    lastRunAt = Date.now();
                    try {
                        const resp = await apiPost('/api/crm/ai/sentiment', { text });
                        const sentiment = resp && resp.sentiment ? String(resp.sentiment) : '';
                        const confidence = resp && typeof resp.confidence === 'number' ? resp.confidence : null;
                        if (!sentiment) return;
                        const line = `Sentimento (observações): <span class="font-semibold">${this.escapeHtml(sentiment)}</span>${confidence != null ? ` (${Math.round(confidence * 100)}%)` : ''}`;
                        const html = `<div data-lead-ai-sentiment="1" class="mt-2 text-xs text-gray-600">${line}</div>`;
                        if (resultsEl) {
                            const existing = resultsEl.querySelector('[data-lead-ai-sentiment="1"]');
                            if (existing) existing.outerHTML = html;
                            else resultsEl.insertAdjacentHTML('beforeend', html);
                            resultsEl.classList.remove('hidden');
                        }
                    } catch {}
                }, 900);
            };
        })();

        if (btnSuggest) btnSuggest.addEventListener('click', () => { suggest().catch(() => {}); });
        if (btnPresentation) btnPresentation.addEventListener('click', () => { generatePresentation().catch(() => {}); });
        if (btnExtract && imageInput) {
            btnExtract.addEventListener('click', () => { try { imageInput.click(); } catch {} });
            if (!imageInput.getAttribute('data-bound')) {
                imageInput.setAttribute('data-bound', '1');
                imageInput.addEventListener('change', () => {
                    const f = imageInput.files && imageInput.files[0] ? imageInput.files[0] : null;
                    if (f) extractFromImage(f).catch(() => {});
                    try { imageInput.value = ''; } catch {}
                });
            }
        }

        const voiceRecorders = new Map();
        const canServerTranscribe = () => {
            try {
                const cfg = window.CrmUiConfig;
                if (cfg && cfg.aiEnabled === false) return false;
                if (cfg && cfg.features && cfg.features.aiVoiceTranscription === false) return false;
                return true;
            } catch {
                return true;
            }
        };
        const pickMimeType = () => {
            try {
                const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg'];
                if (!window.MediaRecorder || typeof window.MediaRecorder.isTypeSupported !== 'function') return '';
                for (const t of types) {
                    if (window.MediaRecorder.isTypeSupported(t)) return t;
                }
            } catch {}
            return '';
        };
        const blobToDataUrl = async (blob) => {
            return await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = () => reject(new Error('Falha ao ler áudio'));
                reader.onload = () => resolve(String(reader.result || ''));
                reader.readAsDataURL(blob);
            });
        };
        const transcribeBlob = async (blob, fieldName) => {
            const cfg = window.CrmUiConfig;
            const maxBytes = cfg && cfg.limits && typeof cfg.limits.maxAudioBytes === 'number' ? cfg.limits.maxAudioBytes : 2_000_000;
            if (blob.size > maxBytes) throw new Error(`Áudio muito grande (máx. ${Math.floor(maxBytes / 1024)}KB)`);
            const audioDataUrl = await blobToDataUrl(blob);
            const resp = await apiPost('/api/crm/ai/transcribe', { audioDataUrl, language: 'pt', prompt: `Transcreva a fala do usuário para texto em pt-BR. Campo: ${fieldName}` });
            return resp && resp.text ? String(resp.text) : '';
        };
        const startServerRecorder = async (fieldName, btn) => {
            if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
                notify('Microfone indisponível neste navegador.', 'warning');
                return;
            }
            if (!window.MediaRecorder) {
                notify('Gravação de áudio não suportada neste navegador.', 'warning');
                return;
            }
            const existing = voiceRecorders.get(fieldName);
            if (existing && existing.recorder) {
                try { existing.recorder.stop(); } catch {}
                return;
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = pickMimeType();
            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            const chunks = [];
            voiceRecorders.set(fieldName, { recorder, stream, chunks });
            if (btn) {
                if (!btn.getAttribute('data-orig-html')) btn.setAttribute('data-orig-html', btn.innerHTML);
                btn.innerHTML = `<i class="fas fa-stop mr-2"></i>Parar`;
                btn.setAttribute('data-recording', '1');
            }
            this.trackUiEvent('voice_start', 'leads', { field: fieldName, mode: 'server' });
            recorder.ondataavailable = (e) => { if (e && e.data && e.data.size) chunks.push(e.data); };
            recorder.onerror = () => { notify('Falha ao gravar áudio.', 'error'); };
            recorder.onstop = async () => {
                try {
                    voiceRecorders.delete(fieldName);
                    try { stream.getTracks().forEach(t => t.stop()); } catch {}
                    if (btn) {
                        const orig = btn.getAttribute('data-orig-html');
                        if (orig != null) btn.innerHTML = orig;
                        btn.removeAttribute('data-recording');
                    }
                    const blob = new Blob(chunks, { type: (recorder && recorder.mimeType) ? recorder.mimeType : 'audio/webm' });
                    if (!blob.size) return;
                    notify('Transcrevendo...', 'info');
                    const text = await transcribeBlob(blob, fieldName);
                    const esc = (v) => (window.CSS && typeof window.CSS.escape === 'function') ? window.CSS.escape(String(v)) : String(v);
                    const target = form.querySelector(`[name="${esc(fieldName)}"]`);
                    if (target) {
                        const prev = target.value != null ? String(target.value) : '';
                        const next = prev && prev.trim() ? `${prev.trim()} ${text}`.trim() : String(text || '').trim();
                        target.value = next;
                        target.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    this.trackUiEvent('voice_done', 'leads', { field: fieldName, mode: 'server', chars: String(text || '').length });
                    notify('Voz finalizada.', 'success');
                } catch (e) {
                    this.trackUiEvent('voice_error', 'leads', { field: fieldName, mode: 'server' });
                    notify(e && e.message ? e.message : 'Falha ao transcrever', 'error');
                }
            };
            recorder.start();
            notify('Gravando... toque novamente para parar.', 'info');
        };
        const startVoice = (fieldName, btn) => {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const esc = (v) => (window.CSS && typeof window.CSS.escape === 'function') ? window.CSS.escape(String(v)) : String(v);
            const target = form.querySelector(`[name="${esc(fieldName)}"]`);
            if (!target) return;
            if (SpeechRecognition) {
                try {
                    const rec = new SpeechRecognition();
                    rec.lang = 'pt-BR';
                    rec.interimResults = true;
                    rec.maxAlternatives = 1;
                    let finalText = '';
                    this.trackUiEvent('voice_start', 'leads', { field: fieldName, mode: 'browser' });
                    rec.onresult = (ev) => {
                        let interim = '';
                        for (let i = ev.resultIndex; i < ev.results.length; i++) {
                            const r = ev.results[i];
                            const t = r && r[0] && r[0].transcript ? String(r[0].transcript) : '';
                            if (r.isFinal) finalText += t + ' ';
                            else interim += t;
                        }
                        const combined = (finalText + interim).trim();
                        target.value = combined;
                        target.dispatchEvent(new Event('input', { bubbles: true }));
                    };
                    rec.onerror = () => { this.trackUiEvent('voice_error', 'leads', { field: fieldName, mode: 'browser' }); notify('Falha no reconhecimento de voz.', 'error'); };
                    rec.onend = () => { this.trackUiEvent('voice_done', 'leads', { field: fieldName, mode: 'browser' }); notify('Voz finalizada.', 'success'); };
                    rec.start();
                    notify('Ouvindo...', 'info');
                    return;
                } catch {
                    this.trackUiEvent('voice_error', 'leads', { field: fieldName, mode: 'browser' });
                }
            }
            if (!canServerTranscribe()) {
                notify('Reconhecimento de voz indisponível no momento.', 'warning');
                return;
            }
            startServerRecorder(fieldName, btn).catch((e) => notify(e && e.message ? e.message : 'Falha ao iniciar voz', 'error'));
        };

        voiceBtns.forEach((b) => {
            if (!b || b.getAttribute('data-bound')) return;
            b.setAttribute('data-bound', '1');
            b.addEventListener('click', () => {
                const field = b.getAttribute('data-lead-ai-voice') || '';
                if (!field) return;
                startVoice(field, b);
            });
        });

        const obs = form.querySelector('textarea[name="observacoes"]');
        if (obs && !obs.getAttribute('data-ai-bound')) {
            obs.setAttribute('data-ai-bound', '1');
            obs.addEventListener('input', () => {
                const text = String(obs.value || '').trim();
                if (text.length < 40) return;
                analyzeSentimentDebounced(text);
            });
        }
    },

    bindContactAI(form) {
        if (!form) return;
        const wrap = form.querySelector('[data-contact-ai="1"]');
        if (!wrap) return;
        try {
            const cfg = window.CrmUiConfig;
            const disabledByFlag = cfg && cfg.features && cfg.features.aiForms === false;
            const disabledByExp = cfg && cfg.experiments && cfg.experiments.aiPanels && cfg.experiments.aiPanels.variant === 'off';
            const disabledByServer = cfg && cfg.aiEnabled === false;
            if (disabledByFlag || disabledByExp || disabledByServer) {
                wrap.classList.add('hidden');
                return;
            }
        } catch {}
        if (wrap.getAttribute('data-bound') === '1') return;
        wrap.setAttribute('data-bound', '1');

        const resultsEl = wrap.querySelector('[data-contact-ai-results]');
        const imageInput = wrap.querySelector('[data-contact-ai-image-input]');
        const btnSuggest = wrap.querySelector('[data-contact-ai-action="suggest"]');
        const btnPresentation = wrap.querySelector('[data-contact-ai-action="presentation"]');
        const btnExtract = wrap.querySelector('[data-contact-ai-action="extract-image"]');
        const voiceBtns = Array.from(form.querySelectorAll('[data-contact-ai-voice]'));
        const rewriteBtns = Array.from(form.querySelectorAll('[data-ai-rewrite]'));

        const notify = (msg, type = 'info') => {
            if (window.Toast && typeof window.Toast.show === 'function') return window.Toast.show(msg, type);
            if (window.NotificationSystem && typeof window.NotificationSystem[type] === 'function') return window.NotificationSystem[type](msg);
            alert(msg);
        };

        const setResultsHtml = (html) => {
            if (!resultsEl) return;
            resultsEl.innerHTML = html || '';
            resultsEl.classList.toggle('hidden', !(html && String(html).trim()));
        };

        const setBusy = (busy) => {
            try { wrap.setAttribute('aria-busy', busy ? 'true' : 'false'); } catch {}
            try { [btnSuggest, btnPresentation, btnExtract].filter(Boolean).forEach((b) => { b.disabled = !!busy; }); } catch {}
        };

        const collectFormData = () => {
            const fd = new FormData(form);
            const out = {};
            for (const [k, v] of fd.entries()) {
                const key = String(k || '');
                const baseKey = key.endsWith('[]') ? key.slice(0, -2) : key;
                const val = (typeof v === 'string') ? v.trim() : v;
                if (val == null || val === '') continue;
                if (out[baseKey] === undefined) out[baseKey] = val;
                else if (Array.isArray(out[baseKey])) out[baseKey].push(val);
                else out[baseKey] = [out[baseKey], val];
            }
            return out;
        };

        const esc = (v) => (window.CSS && typeof window.CSS.escape === 'function') ? window.CSS.escape(String(v)) : String(v);
        const setFieldValue = (name, value) => {
            if (!name) return;
            const el = form.querySelector(`[name="${esc(name)}"]`);
            if (!el) return;
            if (el.type === 'checkbox') {
                el.checked = !!value;
                el.dispatchEvent(new Event('change', { bubbles: true }));
                return;
            }
            if (el.type === 'radio') {
                const radio = form.querySelector(`[name="${esc(name)}"][value="${esc(value)}"]`);
                if (radio) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change', { bubbles: true }));
                }
                return;
            }
            el.value = value == null ? '' : String(value);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        };

        const apiPost = async (url, body) => {
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body || {})
            });
            const payload = await resp.json().catch(() => ({}));
            if (!resp.ok) {
                const msg = payload && payload.error ? payload.error : `Falha (${resp.status})`;
                throw new Error(msg);
            }
            return payload;
        };

        const applyAutofill = (autofill) => {
            const patch = (autofill && typeof autofill === 'object') ? autofill : {};
            Object.keys(patch).forEach((k) => {
                const v = patch[k];
                if (v == null) return;
                if (Array.isArray(v)) return;
                setFieldValue(k, v);
            });
        };

        const applyContentSuggestions = (items) => {
            const list = Array.isArray(items) ? items : [];
            for (const it of list) {
                if (!it) continue;
                const field = it.field != null ? String(it.field) : '';
                const suggestion = it.suggestion != null ? String(it.suggestion) : '';
                if (!field || !suggestion) continue;
                setFieldValue(field, suggestion);
            }
        };

        const renderAssist = (data) => {
            const summary = data && data.summary ? String(data.summary) : '';
            const validations = Array.isArray(data && data.validations) ? data.validations : [];
            const contentSuggestions = Array.isArray(data && data.contentSuggestions) ? data.contentSuggestions : [];

            const badge = (severity) => {
                const s = String(severity || 'info');
                if (s === 'error') return 'bg-red-50 text-red-800 border-red-200';
                if (s === 'warning') return 'bg-amber-50 text-amber-800 border-amber-200';
                return 'bg-blue-50 text-blue-800 border-blue-200';
            };

            const html = `
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <div class="text-sm font-semibold text-gray-800">Resultado IA</div>
                            ${summary ? `<div class="text-xs text-gray-600 mt-1">${this.escapeHtml(summary)}</div>` : ''}
                        </div>
                        <div class="flex flex-wrap items-center gap-2 shrink-0">
                            <button type="button" data-contact-ai-apply="autofill"
                                    class="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition text-sm">
                                Aplicar preenchimento
                            </button>
                            <button type="button" data-contact-ai-apply="content"
                                    class="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition text-sm">
                                Aplicar textos
                            </button>
                        </div>
                    </div>
                    ${validations.length ? `
                        <div class="mt-3">
                            <div class="text-xs font-semibold text-gray-700 mb-2">Validações</div>
                            <div class="space-y-2">
                                ${validations.map(v => `
                                    <div class="flex items-start gap-2">
                                        <span class="px-2 py-0.5 text-xs font-semibold rounded-full border ${badge(v.severity)}">${this.escapeHtml(v.severity || 'info')}</span>
                                        <div class="text-xs text-gray-700">
                                            <span class="font-semibold">${this.escapeHtml(v.field || '')}:</span>
                                            ${this.escapeHtml(v.message || '')}
                                            ${v.suggestion ? `<div class="text-gray-500 mt-0.5">${this.escapeHtml(v.suggestion)}</div>` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${contentSuggestions.length ? `
                        <div class="mt-3">
                            <div class="text-xs font-semibold text-gray-700 mb-2">Sugestões de conteúdo</div>
                            <div class="space-y-2">
                                ${contentSuggestions.map(s => `
                                    <div class="text-xs text-gray-700">
                                        <span class="font-semibold">${this.escapeHtml(s.field || '')}:</span>
                                        <span class="text-gray-600">${this.escapeHtml((s.suggestion || '').slice(0, 280))}${(s.suggestion || '').length > 280 ? '…' : ''}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;

            setResultsHtml(html);
            try {
                const applyAutofillBtn = wrap.querySelector('[data-contact-ai-apply="autofill"]');
                const applyContentBtn = wrap.querySelector('[data-contact-ai-apply="content"]');
                if (applyAutofillBtn && !applyAutofillBtn.getAttribute('data-bound')) {
                    applyAutofillBtn.setAttribute('data-bound', '1');
                    applyAutofillBtn.addEventListener('click', () => {
                        applyAutofill(data.autofill);
                        notify('Preenchimento aplicado.', 'success');
                    });
                }
                if (applyContentBtn && !applyContentBtn.getAttribute('data-bound')) {
                    applyContentBtn.setAttribute('data-bound', '1');
                    applyContentBtn.addEventListener('click', () => {
                        applyContentSuggestions(data.contentSuggestions);
                        notify('Textos aplicados.', 'success');
                    });
                }
            } catch {}
        };

        const suggest = async () => {
            setBusy(true);
            setResultsHtml(`<div class="text-sm text-gray-600">Gerando sugestões...</div>`);
            try {
                const data = collectFormData();
                const resp = await apiPost('/api/crm/ai/form-assist', { formType: 'contato', data });
                renderAssist(resp);
            } catch (e) {
                notify(e && e.message ? e.message : 'Falha ao gerar sugestões', 'error');
                setResultsHtml('');
            } finally {
                setBusy(false);
            }
        };

        const generatePresentation = async () => {
            setBusy(true);
            setResultsHtml(`<div class="text-sm text-gray-600">Gerando apresentação...</div>`);
            try {
                const data = collectFormData();
                const context = JSON.stringify(data);
                const resp = await apiPost('/api/crm/ai/presentation', { audience: 'Cliente', context });
                const html = resp && resp.html ? String(resp.html) : '';
                if (!html) throw new Error('Apresentação gerada sem HTML');
                const w = window.open('', '_blank', 'noopener');
                if (w && w.document) {
                    w.document.open();
                    w.document.write(html);
                    w.document.close();
                } else {
                    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank', 'noopener');
                    setTimeout(() => URL.revokeObjectURL(url), 60_000);
                }
                setResultsHtml(`<div class="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">Apresentação gerada em uma nova aba.</div>`);
            } catch (e) {
                notify(e && e.message ? e.message : 'Falha ao gerar apresentação', 'error');
                setResultsHtml('');
            } finally {
                setBusy(false);
            }
        };

        const extractFromImage = async (file) => {
            if (!file) return;
            if (file.size > 2_000_000) {
                notify('Imagem muito grande. Use uma imagem menor (até 2MB).', 'warning');
                return;
            }
            setBusy(true);
            setResultsHtml(`<div class="text-sm text-gray-600">Lendo imagem...</div>`);
            try {
                const dataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
                    reader.onload = () => resolve(String(reader.result || ''));
                    reader.readAsDataURL(file);
                });
                const resp = await apiPost('/api/crm/ai/extract-image', { imageDataUrl: dataUrl, purpose: 'business_card' });
                const fields = resp && resp.fields ? resp.fields : {};
                if (fields && typeof fields === 'object') {
                    if (fields.nome) setFieldValue('nome', fields.nome);
                    if (fields.empresa) setFieldValue('empresa', fields.empresa);
                    if (fields.cargo) setFieldValue('cargo', fields.cargo);
                    if (fields.email) setFieldValue('email', fields.email);
                    if (fields.telefone) setFieldValue('telefone', fields.telefone);
                    if (fields.whatsapp) setFieldValue('whatsapp', fields.whatsapp);
                }
                setResultsHtml(`<div class="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">Dados extraídos e aplicados no formulário.</div>`);
            } catch (e) {
                notify(e && e.message ? e.message : 'Falha ao extrair dados da imagem', 'error');
                setResultsHtml('');
            } finally {
                setBusy(false);
            }
        };

        const analyzeSentimentDebounced = (() => {
            let t = null;
            let lastRunAt = 0;
            return (text) => {
                const now = Date.now();
                if (now - lastRunAt < 4500) return;
                clearTimeout(t);
                t = setTimeout(async () => {
                    lastRunAt = Date.now();
                    try {
                        const resp = await apiPost('/api/crm/ai/sentiment', { text });
                        const sentiment = resp && resp.sentiment ? String(resp.sentiment) : '';
                        const confidence = resp && typeof resp.confidence === 'number' ? resp.confidence : null;
                        if (!sentiment) return;
                        const line = `Sentimento: <span class="font-semibold">${this.escapeHtml(sentiment)}</span>${confidence != null ? ` (${Math.round(confidence * 100)}%)` : ''}`;
                        const html = `<div data-contact-ai-sentiment="1" class="mt-2 text-xs text-gray-600">${line}</div>`;
                        if (resultsEl) {
                            const existing = resultsEl.querySelector('[data-contact-ai-sentiment="1"]');
                            if (existing) existing.outerHTML = html;
                            else resultsEl.insertAdjacentHTML('beforeend', html);
                            resultsEl.classList.remove('hidden');
                        }
                    } catch {}
                }, 900);
            };
        })();

        const voiceRecorders = new Map();
        const canServerTranscribe = () => {
            try {
                const cfg = window.CrmUiConfig;
                if (cfg && cfg.aiEnabled === false) return false;
                if (cfg && cfg.features && cfg.features.aiVoiceTranscription === false) return false;
                return true;
            } catch {
                return true;
            }
        };
        const pickMimeType = () => {
            try {
                const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg'];
                if (!window.MediaRecorder || typeof window.MediaRecorder.isTypeSupported !== 'function') return '';
                for (const t of types) {
                    if (window.MediaRecorder.isTypeSupported(t)) return t;
                }
            } catch {}
            return '';
        };
        const blobToDataUrl = async (blob) => {
            return await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = () => reject(new Error('Falha ao ler áudio'));
                reader.onload = () => resolve(String(reader.result || ''));
                reader.readAsDataURL(blob);
            });
        };
        const transcribeBlob = async (blob, fieldName) => {
            const cfg = window.CrmUiConfig;
            const maxBytes = cfg && cfg.limits && typeof cfg.limits.maxAudioBytes === 'number' ? cfg.limits.maxAudioBytes : 2_000_000;
            if (blob.size > maxBytes) throw new Error(`Áudio muito grande (máx. ${Math.floor(maxBytes / 1024)}KB)`);
            const audioDataUrl = await blobToDataUrl(blob);
            const resp = await apiPost('/api/crm/ai/transcribe', { audioDataUrl, language: 'pt', prompt: `Transcreva a fala do usuário para texto em pt-BR. Campo: ${fieldName}` });
            return resp && resp.text ? String(resp.text) : '';
        };
        const startServerRecorder = async (fieldName, btn) => {
            if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
                notify('Microfone indisponível neste navegador.', 'warning');
                return;
            }
            if (!window.MediaRecorder) {
                notify('Gravação de áudio não suportada neste navegador.', 'warning');
                return;
            }
            const existing = voiceRecorders.get(fieldName);
            if (existing && existing.recorder) {
                try { existing.recorder.stop(); } catch {}
                return;
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = pickMimeType();
            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            const chunks = [];
            voiceRecorders.set(fieldName, { recorder, stream, chunks });
            if (btn) {
                if (!btn.getAttribute('data-orig-html')) btn.setAttribute('data-orig-html', btn.innerHTML);
                btn.innerHTML = `<i class="fas fa-stop mr-2"></i>Parar`;
                btn.setAttribute('data-recording', '1');
            }
            this.trackUiEvent('voice_start', 'contatos', { field: fieldName, mode: 'server' });
            recorder.ondataavailable = (e) => { if (e && e.data && e.data.size) chunks.push(e.data); };
            recorder.onerror = () => { notify('Falha ao gravar áudio.', 'error'); };
            recorder.onstop = async () => {
                try {
                    voiceRecorders.delete(fieldName);
                    try { stream.getTracks().forEach(t => t.stop()); } catch {}
                    if (btn) {
                        const orig = btn.getAttribute('data-orig-html');
                        if (orig != null) btn.innerHTML = orig;
                        btn.removeAttribute('data-recording');
                    }
                    const blob = new Blob(chunks, { type: (recorder && recorder.mimeType) ? recorder.mimeType : 'audio/webm' });
                    if (!blob.size) return;
                    notify('Transcrevendo...', 'info');
                    const text = await transcribeBlob(blob, fieldName);
                    const target = form.querySelector(`[name="${esc(fieldName)}"]`);
                    if (target) {
                        const prev = target.value != null ? String(target.value) : '';
                        const next = prev && prev.trim() ? `${prev.trim()} ${text}`.trim() : String(text || '').trim();
                        target.value = next;
                        target.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    this.trackUiEvent('voice_done', 'contatos', { field: fieldName, mode: 'server', chars: String(text || '').length });
                    notify('Voz finalizada.', 'success');
                } catch (e) {
                    this.trackUiEvent('voice_error', 'contatos', { field: fieldName, mode: 'server' });
                    notify(e && e.message ? e.message : 'Falha ao transcrever', 'error');
                }
            };
            recorder.start();
            notify('Gravando... toque novamente para parar.', 'info');
        };
        const startVoice = (fieldName, btn) => {
            const target = form.querySelector(`[name="${esc(fieldName)}"]`);
            if (!target) return;
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                try {
                    const rec = new SpeechRecognition();
                    rec.lang = 'pt-BR';
                    rec.interimResults = true;
                    rec.maxAlternatives = 1;
                    let finalText = '';
                    this.trackUiEvent('voice_start', 'contatos', { field: fieldName, mode: 'browser' });
                    rec.onresult = (ev) => {
                        let interim = '';
                        for (let i = ev.resultIndex; i < ev.results.length; i++) {
                            const r = ev.results[i];
                            const t = r && r[0] && r[0].transcript ? String(r[0].transcript) : '';
                            if (r.isFinal) finalText += t + ' ';
                            else interim += t;
                        }
                        const combined = (finalText + interim).trim();
                        target.value = combined;
                        target.dispatchEvent(new Event('input', { bubbles: true }));
                    };
                    rec.onerror = () => { this.trackUiEvent('voice_error', 'contatos', { field: fieldName, mode: 'browser' }); notify('Falha no reconhecimento de voz.', 'error'); };
                    rec.onend = () => { this.trackUiEvent('voice_done', 'contatos', { field: fieldName, mode: 'browser' }); notify('Voz finalizada.', 'success'); };
                    rec.start();
                    notify('Ouvindo...', 'info');
                    return;
                } catch {
                    this.trackUiEvent('voice_error', 'contatos', { field: fieldName, mode: 'browser' });
                }
            }
            if (!canServerTranscribe()) {
                notify('Reconhecimento de voz indisponível no momento.', 'warning');
                return;
            }
            startServerRecorder(fieldName, btn).catch((e) => notify(e && e.message ? e.message : 'Falha ao iniciar voz', 'error'));
        };

        const rewriteField = async (field) => {
            if (!field) return;
            const el = form.querySelector(`[name="${esc(field)}"]`);
            if (!el) return;
            const text = String(el.value || '').trim();
            if (!text) {
                notify('Preencha o texto antes de melhorar.', 'warning');
                return;
            }
            setBusy(true);
            try {
                const resp = await apiPost('/api/crm/ai/rewrite', { text, instruction: 'Melhore clareza e organização para CRM mantendo o sentido.', tone: 'profissional' });
                if (resp && resp.text) {
                    el.value = String(resp.text);
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    notify(resp.summary || 'Texto melhorado.', 'success');
                }
            } catch (e) {
                notify(e && e.message ? e.message : 'Falha ao melhorar texto', 'error');
            } finally {
                setBusy(false);
            }
        };

        if (btnSuggest) btnSuggest.addEventListener('click', () => { suggest().catch(() => {}); });
        if (btnPresentation) btnPresentation.addEventListener('click', () => { generatePresentation().catch(() => {}); });
        if (btnExtract && imageInput) {
            btnExtract.addEventListener('click', () => { try { imageInput.click(); } catch {} });
            if (!imageInput.getAttribute('data-bound')) {
                imageInput.setAttribute('data-bound', '1');
                imageInput.addEventListener('change', () => {
                    const f = imageInput.files && imageInput.files[0] ? imageInput.files[0] : null;
                    if (f) extractFromImage(f).catch(() => {});
                    try { imageInput.value = ''; } catch {}
                });
            }
        }

        voiceBtns.forEach((b) => {
            if (!b || b.getAttribute('data-bound')) return;
            b.setAttribute('data-bound', '1');
            b.addEventListener('click', () => {
                const field = b.getAttribute('data-contact-ai-voice') || '';
                if (!field) return;
                startVoice(field, b);
            });
        });

        rewriteBtns.forEach((b) => {
            if (!b || b.getAttribute('data-bound')) return;
            b.setAttribute('data-bound', '1');
            b.addEventListener('click', () => {
                const field = b.getAttribute('data-ai-rewrite') || '';
                if (!field) return;
                rewriteField(field).catch(() => {});
            });
        });

        const obs = form.querySelector('textarea[name="observacoes"]');
        if (obs && !obs.getAttribute('data-ai-bound')) {
            obs.setAttribute('data-ai-bound', '1');
            obs.addEventListener('input', () => {
                const text = String(obs.value || '').trim();
                if (text.length < 40) return;
                analyzeSentimentDebounced(text);
            });
        }
    },
    // Eventos específicos por módulo (CEP/CNPJ para clientes)
    attachModuleSpecificEvents(module, form) {
        if (!form) return;

        if (module === 'transacoes' || module === 'financeiro' || module === 'contasReceber') {
            this.setupCentroCustoAutocomplete(form);
            return;
        }

        if (module === 'eventos') {
            try {
                const root = document.getElementById('modal-content') || document;
                this.bindEventoAI(root);
            } catch {}
            return;
        }

        if (module === 'leads' || module === 'marketing_leads') {
            const toast = (msg, type = 'info') => {
                if (window.Toast && typeof window.Toast.show === 'function') return window.Toast.show(msg, type);
                if (window.NotificationSystem && typeof window.NotificationSystem[type] === 'function') return window.NotificationSystem[type](msg);
                alert(msg);
            };

            try { this.bindLeadAI(form); } catch {}

            const btn = form.querySelector('[data-form-action="convert-to-contato"]');
            if (!btn) return;
            if (btn.getAttribute('data-bound') === 'true') return;
            btn.setAttribute('data-bound', 'true');

            const rawId = form.getAttribute('data-id') || (form.dataset && form.dataset.id) || '';
            const leadIdFromAttr = rawId != null && String(rawId).trim() !== '' ? Number(String(rawId).trim()) : null;

            const collectLeadPayloadFromForm = () => {
                const fd = new FormData(form);
                const data = {};
                for (const [k, v] of fd.entries()) {
                    const clean = typeof v === 'string' ? v.trim() : v;
                    if (clean === '' || clean == null) continue;
                    const key = typeof k === 'string' && k.endsWith('[]') ? k.slice(0, -2) : k;
                    if (data[key] === undefined) data[key] = clean;
                    else if (Array.isArray(data[key])) data[key].push(clean);
                    else data[key] = [data[key], clean];
                }
                return {
                    nome: data.nome || '',
                    email: data.email || '',
                    telefone: data.telefone || '',
                    empresa: data.empresa || null,
                    cargo: data.cargo || null,
                    origem: data.origem || null,
                    status: data.status || null,
                    segmento: data.segmento || null,
                    evento_interesse: data.evento_interesse || data.eventoInteresse || null,
                    metragem_estimada: data.metragem_estimada || data.metragemEstimada || null,
                    temperatura: data.temperatura || null,
                    nivel_interesse: data.nivel_interesse || data.nivelInteresse || null,
                    interesses: data.interesses ? (Array.isArray(data.interesses) ? data.interesses : [data.interesses]) : [],
                    orcamento_estimado: data.orcamento_estimado || data.orcamentoEstimado || null,
                    prazo_projeto: data.prazo_projeto || data.prazoProjeto || null,
                    proximos_passos: data.proximos_passos || data.proximosPassos || null,
                    observacoes: data.observacoes || null,
                    proximo_contato: data.proximo_contato || data.proximoContato || null
                };
            };

            const reloadAfterConvert = () => {
                try { FormSystem.closeModal(); } catch {}
                if (window.NavigationSystem && typeof window.NavigationSystem.reloadLeadsList === 'function') {
                    window.NavigationSystem.reloadLeadsList();
                    return;
                }
                if (window.MarketingModule && typeof window.MarketingModule.loadLeads === 'function') {
                    window.MarketingModule.loadLeads();
                    return;
                }
                if (window.NavigationSystem && typeof window.NavigationSystem.reloadCurrentPage === 'function') {
                    window.NavigationSystem.reloadCurrentPage();
                    return;
                }
                try { window.location.reload(); } catch {}
            };

            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const ok = confirm('Converter este Lead em um Contato? Isso criará (se necessário) um Cliente e vinculará o Contato.');
                if (!ok) return;

                const prevText = btn.textContent;
                btn.disabled = true;
                btn.textContent = 'Convertendo...';
                try {
                    let leadId = leadIdFromAttr;
                    const leadPayload = collectLeadPayloadFromForm();
                    if (!leadId || !Number.isFinite(leadId) || leadId <= 0) {
                        const syncResp = await fetch('/api/crm/leads', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify(leadPayload)
                        });
                        const syncPayload = await syncResp.json().catch(() => ({}));
                        if (!syncResp.ok || !syncPayload || !syncPayload.id) {
                            const msg = syncPayload && syncPayload.error ? syncPayload.error : 'Não foi possível sincronizar o lead para converter';
                            throw new Error(msg);
                        }
                        leadId = Number(syncPayload.id);
                        try {
                            form.dataset.id = String(leadId);
                            form.setAttribute('data-id', String(leadId));
                        } catch {}
                        try {
                            const oldId = rawId != null ? String(rawId) : '';
                            const list = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.leads)) ? ModuleSystem.data.leads : null;
                            if (list) {
                                const idx = list.findIndex(l => l && l.id != null && String(l.id) === String(oldId));
                                if (idx >= 0) {
                                    list[idx] = { ...list[idx], ...leadPayload, id: leadId, _localOnly: false };
                                    ModuleSystem.saveData();
                                }
                            }
                        } catch {}
                    }

                    const tryConvertViaEndpoint = async () => {
                        const resp = await fetch(`/api/crm/leads/${leadId}/convert-to-contato`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ createCliente: false })
                        });
                        const payload = await resp.json().catch(() => ({}));
                        if (!resp.ok) {
                            const msg = payload && payload.error ? payload.error : 'Falha ao converter lead';
                            const err = new Error(msg);
                            err._status = resp.status;
                            err._payload = payload;
                            throw err;
                        }
                        const contatoId = payload && payload.contato_id != null ? String(payload.contato_id) : '';
                        const clienteId = payload && payload.cliente_id != null ? String(payload.cliente_id) : '';
                        if (!contatoId) {
                            const err = new Error('Conversão concluída sem retorno do contato');
                            err._status = resp.status;
                            err._payload = payload;
                            throw err;
                        }
                        return { contatoId, clienteId };
                    };

                    const fallbackConvert = async () => {
                        const nome = leadPayload.nome || '';
                        if (!nome) throw new Error('Lead sem nome para converter');

                        const contatoResp = await fetch('/api/crm/contatos', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({
                                nome,
                                email: leadPayload.email || null,
                                telefone: leadPayload.telefone || null,
                                whatsapp: leadPayload.whatsapp || null,
                                empresa: leadPayload.empresa || null,
                                cargo: leadPayload.cargo || null,
                                segmento: leadPayload.segmento || null,
                                status: 'Ativo',
                                observacoes: leadPayload.observacoes || null,
                                origem: 'lead',
                                lead_id: leadId
                            })
                        });
                        const contatoJson = await contatoResp.json().catch(() => ({}));
                        if (!contatoResp.ok || !contatoJson || !contatoJson.id) {
                            const msg = contatoJson && contatoJson.error ? contatoJson.error : 'Falha ao criar contato';
                            throw new Error(msg);
                        }
                        const contatoId = String(contatoJson.id);

                        const clienteId = '';

                        try {
                            await fetch(`/api/crm/leads/${encodeURIComponent(String(leadId))}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ status: 'convertido' })
                            });
                        } catch {}

                        return { contatoId, clienteId };
                    };

                    let contatoId = '';
                    let clienteId = '';
                    try {
                        const out = await tryConvertViaEndpoint();
                        contatoId = out.contatoId;
                        clienteId = out.clienteId;
                    } catch (primaryErr) {
                        console.warn('[FormSystem] Falha ao converter via endpoint, tentando fallback:', primaryErr);
                        const out = await fallbackConvert();
                        contatoId = out.contatoId;
                        clienteId = out.clienteId;
                    }

                    try {
                        const contatoResp = await fetch(`/api/crm/contatos/${encodeURIComponent(contatoId)}`, { credentials: 'include' });
                        const contatoPayload = await contatoResp.json().catch(() => null);
                        if (contatoResp.ok && contatoPayload && contatoPayload.id != null) {
                            if (window.ModuleSystem && ModuleSystem.data) {
                                ModuleSystem.data.contatos = Array.isArray(ModuleSystem.data.contatos) ? ModuleSystem.data.contatos : [];
                                const idx = ModuleSystem.data.contatos.findIndex(c => c && c.id != null && String(c.id) === String(contatoPayload.id));
                                if (idx >= 0) ModuleSystem.data.contatos[idx] = { ...ModuleSystem.data.contatos[idx], ...contatoPayload };
                                else ModuleSystem.data.contatos.push(contatoPayload);
                                ModuleSystem.saveData();
                            }
                        }
                    } catch {}

                    try {
                        if (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.leads)) {
                            const lid = String(leadId);
                            const lidx = ModuleSystem.data.leads.findIndex(l => l && l.id != null && String(l.id) === lid);
                            if (lidx >= 0) {
                                ModuleSystem.data.leads.splice(lidx, 1);
                                ModuleSystem.saveData();
                            }
                        }
                    } catch {}

                    toast(`Lead convertido. Contato #${contatoId}${clienteId ? ` | Cliente #${clienteId}` : ''}`, 'success');

                    try { FormSystem.closeModal(); } catch {}
                    if (window.NavigationSystem && typeof window.NavigationSystem.navigateToPage === 'function') {
                        window.NavigationSystem.navigateToPage('marketing', 'contatos');
                        setTimeout(() => {
                            try {
                                if (window.ModuleSystem && typeof ModuleSystem.showDetails === 'function') {
                                    ModuleSystem.showDetails('marketing_contatos', contatoId);
                                }
                            } catch {}
                        }, 150);
                    } else {
                        reloadAfterConvert();
                    }
                } catch (err) {
                    const msg = err && err.message ? err.message : 'Falha ao converter lead';
                    toast(msg, 'error');
                    try { alert(msg); } catch {}
                } finally {
                    btn.disabled = false;
                    btn.textContent = prevText;
                }
            });
            return;
        }

        if (module === 'contatos' || module === 'marketing_contatos') {
            const toast = (msg, type = 'info') => {
                if (window.Toast && typeof window.Toast.show === 'function') return window.Toast.show(msg, type);
                if (window.NotificationSystem && typeof window.NotificationSystem[type] === 'function') return window.NotificationSystem[type](msg);
                alert(msg);
            };

            try { this.bindContactAI(form); } catch {}

            const btn = form.querySelector('[data-form-action="create-task"]');
            if (!btn) return;
            if (btn.getAttribute('data-bound') === 'true') return;
            btn.setAttribute('data-bound', 'true');

            const rawId = form.getAttribute('data-id') || (form.dataset && form.dataset.id) || '';
            const contatoId = rawId != null && String(rawId).trim() !== '' ? Number(String(rawId).trim()) : null;
            if (!contatoId || !Number.isFinite(contatoId) || contatoId <= 0) {
                btn.disabled = true;
                return;
            }

            const toYmd = (d) => {
                const dt = (d instanceof Date) ? d : new Date(d);
                if (Number.isNaN(dt.getTime())) return '';
                const y = dt.getFullYear();
                const m = String(dt.getMonth() + 1).padStart(2, '0');
                const day = String(dt.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
            };

            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const nome = (form.querySelector('[name="nome"]')?.value || '').trim();
                const email = (form.querySelector('[name="email"]')?.value || '').trim();
                const telefone = (form.querySelector('[name="telefone"]')?.value || '').trim();
                const whatsapp = (form.querySelector('[name="whatsapp"]')?.value || '').trim();
                const empresa = (form.querySelector('[name="empresa"]')?.value || '').trim();

                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const dataVencimento = toYmd(tomorrow);

                const current =
                    (window.AuthSystem && typeof window.AuthSystem.getCurrentUser === 'function')
                        ? (window.AuthSystem.getCurrentUser() || null)
                        : ((window.AuthSystem && window.AuthSystem.currentUser) ? window.AuthSystem.currentUser : null);
                const responsavelId = current && current.id != null ? String(current.id) : null;

                const descricaoParts = [];
                descricaoParts.push(`Contato #${contatoId}`);
                if (nome) descricaoParts.push(`Nome: ${nome}`);
                if (empresa) descricaoParts.push(`Empresa: ${empresa}`);
                if (email) descricaoParts.push(`Email: ${email}`);
                if (telefone) descricaoParts.push(`Telefone: ${telefone}`);
                if (whatsapp) descricaoParts.push(`WhatsApp: ${whatsapp}`);
                const descricao = descricaoParts.join('\n');

                try {
                    const titulo = nome ? `Ligar para ${nome}` : `Ligar para Contato #${contatoId}`;
                    const prefill = {
                        titulo,
                        descricao,
                        status: 'todo',
                        prioridade: 'media',
                        dataVencimento: dataVencimento || null,
                        responsavelId: responsavelId || null,
                        tags: ['marketing_contatos', 'contato', `contato-${contatoId}`, 'followup']
                    };

                    try {
                        const open = () => {
                            try {
                                if (window.KanbanSystem && typeof window.KanbanSystem.init === 'function') {
                                    window.KanbanSystem.init();
                                }
                            } catch {}
                            try {
                                if (window.KanbanSystem && typeof window.KanbanSystem.showTaskFormWithPrefill === 'function') {
                                    window.KanbanSystem.showTaskFormWithPrefill(prefill, 'todo');
                                    return;
                                }
                            } catch {}
                            try {
                                if (window.KanbanSystem && typeof window.KanbanSystem.showTaskForm === 'function') {
                                    window.KanbanSystem.showTaskForm('todo');
                                }
                            } catch {}
                        };

                        if (window.NavigationSystem && typeof window.NavigationSystem.ensureKanbanSystemReady === 'function') {
                            window.NavigationSystem.ensureKanbanSystemReady(() => {
                                setTimeout(() => open(), 120);
                            });
                            return;
                        }
                    } catch {}
                    toast('Abra o Kanban para criar a tarefa.', 'warning');
                } catch (err) {
                    toast(err && err.message ? err.message : 'Falha ao abrir tarefa', 'error');
                }
            });
            return;
        }

        if (module === 'memoriais') {
            const projetos = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.projetos)) ? ModuleSystem.data.projetos : [];
            const getProjeto = (id) => projetos.find(p => p && String(p.id) === String(id)) || null;
            const safeFill = (name, value) => {
                const el = form.querySelector(`[name="${name}"]`);
                if (!el) return;
                if (String(el.value || '').trim() !== '') return;
                if (value == null) return;
                const v = String(value).trim();
                if (!v) return;
                el.value = v;
            };
            const safeFillNumber = (name, value) => {
                const el = form.querySelector(`[name="${name}"]`);
                if (!el) return;
                if (String(el.value || '').trim() !== '') return;
                const n = Number(String(value).replace(',', '.'));
                if (!Number.isFinite(n)) return;
                el.value = String(n);
            };
            const applyFromProjeto = () => {
                const sel = form.querySelector('select[name="projeto_id"]');
                const pid = sel && sel.value ? sel.value : null;
                const p = pid ? getProjeto(pid) : null;
                if (!p) return;
                safeFill('cliente', p.briefing_empresa || p.lead_nome || '');
                safeFill('evento', p.briefing_evento || p.evento_nome || '');
                safeFill('local', p.briefing_local || '');
                safeFillNumber('area_m2', p.area_m2);
                safeFill('numero_projeto', p.id != null ? String(p.id) : '');
                try {
                    if (p.briefing_data_inicio) safeFill('data_evento', String(p.briefing_data_inicio).slice(0, 10));
                } catch {}
            };
            form.querySelector('select[name="projeto_id"]')?.addEventListener('change', () => {
                applyFromProjeto();
            });
            applyFromProjeto();
            return;
        }

        if (module === 'projetos') {
            const toast = (msg, type = 'info') => {
                if (window.Toast && typeof window.Toast.show === 'function') return window.Toast.show(msg, type);
                if (window.NotificationSystem && typeof window.NotificationSystem[type] === 'function') return window.NotificationSystem[type](msg);
                alert(msg);
            };

            const normalize = (v) => (v != null ? String(v).trim().toLowerCase() : '');
            const isArqEngProjetos = (u) => {
                const r = normalize(u?.role || u?.perfil || u?.cargo);
                const nivel = normalize(u?.nivel_acesso);
                if (nivel === 'admin' || nivel === 'gerente' || nivel === 'gestor') return true;
                return r === 'projetos' || r.includes('arquit') || r.includes('engen') || r.includes('projet');
            };

            const getBriefingById = (id) => {
                const list = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.briefings)) ? ModuleSystem.data.briefings : [];
                return list.find(b => String(b.id) === String(id)) || null;
            };

            const loadUsuarios = async () => {
                try {
                    const resp = await fetch('/api/crm/users', { credentials: 'include' });
                    const data = await resp.json().catch(() => []);
                    if (resp.ok && Array.isArray(data)) {
                        ModuleSystem.data.usuarios = data.map(u => ({ ...u, nome: u.nome || u.name }));
                        if (window.ModuleSystem && typeof ModuleSystem.saveData === 'function') ModuleSystem.saveData();
                        return ModuleSystem.data.usuarios;
                    }
                } catch {}
                return (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.usuarios)) ? ModuleSystem.data.usuarios : [];
            };

            const refreshResponsavelOptions = async () => {
                const select = form.querySelector('select[name="responsavel_id"]');
                if (!select) return;
                const before = select.value;
                const usuarios = await loadUsuarios();
                const candidatos = (usuarios || []).filter(isArqEngProjetos);
                select.innerHTML = `<option value="">Selecione um responsável...</option>` + candidatos.map(u => {
                    const label = u.nome || u.name || u.email || ('Usuário #' + u.id);
                    return `<option value="${u.id}">${label}</option>`;
                }).join('');
                if (before) select.value = before;
            };

            const applyBriefingDerivedFields = () => {
                const briefingSelect = form.querySelector('select[name="briefing_id"]');
                const nomeInput = form.querySelector('input[name="nome"]');
                const areaHidden = form.querySelector('input[name="area_m2"]');
                const tipoHidden = form.querySelector('input[name="tipo_stand"]');
                const briefingId = briefingSelect && briefingSelect.value ? briefingSelect.value : '';
                const b = briefingId ? getBriefingById(briefingId) : null;
                if (!b) return;

                const area = b.metragem != null && b.metragem !== '' ? Number(b.metragem) : (b.area_m2 != null ? Number(b.area_m2) : null);
                const tipo = b.tipo_stand != null ? String(b.tipo_stand) : (b.tipo != null ? String(b.tipo) : '');
                if (areaHidden && area != null && Number.isFinite(area)) areaHidden.value = String(area);
                if (tipoHidden && tipo) tipoHidden.value = tipo;

                if (nomeInput && String(nomeInput.value || '').trim() === '') {
                    const empresa = b.empresa || b.cliente_nome || b.nome_cliente || '';
                    const evento = b.nome_evento || b.evento_nome || b.nomeEvento || '';
                    if (empresa && evento) nomeInput.value = `${empresa} • ${evento}`;
                }
            };

            const computeCostIfPossible = async () => {
                try {
                    const areaHidden = form.querySelector('input[name="area_m2"]');
                    const tipoHidden = form.querySelector('input[name="tipo_stand"]');
                    const custoInput = form.querySelector('input[name="custo_estimado"]');
                    if (!areaHidden || !tipoHidden || !custoInput) return;
                    if (String(custoInput.value || '').trim() !== '') return;

                    const area = Number(String(areaHidden.value || '').replace(',', '.'));
                    const tipo = String(tipoHidden.value || '').trim();
                    if (!Number.isFinite(area) || !tipo) return;

                    let settings = null;
                    try {
                        const resp = await fetch('/api/crm/settings/projetos', { credentials: 'include' });
                        settings = await resp.json().catch(() => null);
                    } catch {}
                    const map = settings && settings.precoM2PorTipo ? settings.precoM2PorTipo : {};
                    const preco = map[tipo] != null ? Number(String(map[tipo]).replace(',', '.')) : null;
                    if (!Number.isFinite(preco)) return;
                    custoInput.value = String(Math.round(area * preco * 100) / 100);
                } catch {}
            };

            const toggleInlineForm = (show) => {
                const box = form.querySelector('[data-projetista-form]');
                if (!box) return;
                const shouldShow = show != null ? !!show : box.classList.contains('hidden');
                if (shouldShow) box.classList.remove('hidden');
                else box.classList.add('hidden');
            };

            const getInlineValue = (k) => {
                const el = form.querySelector(`[data-projetista-field="${k}"]`);
                return el ? String(el.value || '').trim() : '';
            };

            const clearInlineForm = () => {
                ['nome','email','senha'].forEach(k => {
                    const el = form.querySelector(`[data-projetista-field="${k}"]`);
                    if (el) el.value = '';
                });
            };

            const canCreate = () => {
                const u = (FormSystem && typeof FormSystem.getCurrentUser === 'function') ? FormSystem.getCurrentUser() : null;
                const r = normalize(u?.role);
                return r === 'admin' || r === 'administrador';
            };

            form.querySelector('[data-form-action="reload-projetistas"]')?.addEventListener('click', async (e) => {
                e.preventDefault();
                await refreshResponsavelOptions();
                toast('Lista atualizada.', 'success');
            });

            form.querySelector('[data-form-action="toggle-projetista-form"]')?.addEventListener('click', (e) => {
                e.preventDefault();
                toggleInlineForm();
            });

            form.querySelector('[data-form-action="cancel-projetista"]')?.addEventListener('click', (e) => {
                e.preventDefault();
                clearInlineForm();
                toggleInlineForm(false);
            });

            form.querySelector('[data-form-action="save-projetista"]')?.addEventListener('click', async (e) => {
                e.preventDefault();
                if (!canCreate()) {
                    toast('Sem permissão para cadastrar. Faça login como Administrador.', 'error');
                    return;
                }
                const nome = getInlineValue('nome');
                const email = getInlineValue('email').toLowerCase();
                const senha = getInlineValue('senha');
                if (!nome || !email || !senha) {
                    toast('Preencha Nome, Email e Senha.', 'error');
                    return;
                }
                try {
                    const resp = await fetch('/api/crm/admin/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ name: nome, email, password: senha, role: 'projetos', active: 1 })
                    });
                    const json = await resp.json().catch(() => ({}));
                    if (!resp.ok) {
                        toast(json && json.error ? json.error : 'Falha ao cadastrar Arq/Eng.', 'error');
                        return;
                    }
                    const newId = json && json.id != null ? String(json.id) : '';
                    clearInlineForm();
                    toggleInlineForm(false);
                    await refreshResponsavelOptions();
                    const select = form.querySelector('select[name="responsavel_id"]');
                    if (select && newId) select.value = newId;
                    toast('Arq/Eng cadastrado e disponível para seleção.', 'success');
                } catch {
                    toast('Falha ao cadastrar Arq/Eng.', 'error');
                }
            });

            form.querySelector('select[name="briefing_id"]')?.addEventListener('change', async () => {
                applyBriefingDerivedFields();
                await computeCostIfPossible();
            });

            refreshResponsavelOptions().then(() => {}).catch(() => {});
            applyBriefingDerivedFields();
            computeCostIfPossible().then(() => {}).catch(() => {});
            return;
        }

        if (module !== 'clientes') return;

        const safeDispatch = (el, type = 'input') => {
            try { el && el.dispatchEvent(new Event(type, { bubbles: true })); } catch {}
        };

        // Botão de busca de CEP
        const btnCEP = form.querySelector('[data-form-action="busca-cep"]');
        if (btnCEP) {
            btnCEP.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const cepInput = form.querySelector('[name="cep"]');
                if (!cepInput) return;
                const cep = (cepInput.value || '').trim();

                try {
                    let filledByValidator = false;
                    if (window.UnifiedValidator && typeof window.UnifiedValidator.validateField === 'function') {
                        const result = await window.UnifiedValidator.validateField('clientes', 'cep', cep, window.UnifiedValidator.getFormData(form));
                        if (typeof window.UnifiedValidator.displayFieldValidation === 'function') {
                            window.UnifiedValidator.displayFieldValidation(cepInput, result);
                        }
                        if (result && result.data) {
                            window.UnifiedValidator.autoFillFields(form, result.data);
                            filledByValidator = true;
                        }
                        if (result && result.formatted && result.formatted !== cepInput.value) {
                            cepInput.value = result.formatted;
                            safeDispatch(cepInput);
                        }
                    }

                    // Fallback ViaCEP se o validador não preencher dados
                    if (!filledByValidator) {
                        const cleanCep = (cep || '').replace(/\D/g, '');
                        if (cleanCep.length === 8) {
                            const resp = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                            const data = await resp.json();
                            if (data && !data.erro) {
                                const mapping = {
                                    cep: data.cep || cep,
                                    endereco: [data.logradouro, data.complemento].filter(Boolean).join(', '),
                                    bairro: data.bairro || '',
                                    cidade: data.localidade || '',
                                    estado: data.uf || ''
                                };
                                Object.entries(mapping).forEach(([k, v]) => {
                                    const field = form.querySelector(`[name="${k}"]`);
                                    if (field && v && !field.value) { field.value = v; safeDispatch(field); }
                                });
                            }
                        }
                    }
                } catch (err) {
                    console.warn('[FormSystem] Falha na busca de CEP:', err);
                }
            });
        }

        // Botão de busca de CNPJ
        const btnCNPJ = form.querySelector('[data-form-action="busca-cnpj"]');
        if (btnCNPJ) {
            btnCNPJ.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const docInput = form.querySelector('[name="documento"]');
                if (!docInput) return;
                const raw = (docInput.value || '').replace(/\D/g, '');
                if (raw.length !== 14) {
                    if (window.UnifiedValidator && typeof window.UnifiedValidator.displayFieldValidation === 'function') {
                        window.UnifiedValidator.displayFieldValidation(docInput, {
                            isValid: false,
                            errors: ['CNPJ inválido'],
                            sanitized: docInput.value,
                            formatted: docInput.value
                        });
                    }
                    return;
                }

                try {
                    const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${raw}`);
                    const data = await resp.json();
                    if (resp.ok && data) {
                        const mapping = {
                            nome: data.nome_fantasia || data.razao_social || '',
                            cep: data.cep || '',
                            endereco: [data.logradouro, data.numero, data.complemento].filter(Boolean).join(', '),
                            bairro: data.bairro || '',
                            cidade: data.municipio || data.cidade || '',
                            estado: data.uf || data.estado || '',
                            telefone: data.telefone || ''
                        };

                        if (window.UnifiedValidator) {
                            if (mapping.cep) mapping.cep = window.UnifiedValidator.formatValue(mapping.cep, 'cep');
                            window.UnifiedValidator.autoFillFields(form, mapping);
                            // Formatar documento com o formatador do UnifiedValidator
                            docInput.value = window.UnifiedValidator.formatValue(raw, 'document');
                        } else {
                            Object.entries(mapping).forEach(([k, v]) => {
                                const field = form.querySelector(`[name="${k}"]`);
                                if (field && v && !field.value) { field.value = v; safeDispatch(field); }
                            });
                            docInput.value = raw;
                        }
                        safeDispatch(docInput);
                    } else {
                        console.warn('[FormSystem] BrasilAPI CNPJ não retornou OK:', data?.message || resp.status);
                    }
                } catch (err) {
                    console.warn('[FormSystem] Falha na busca de CNPJ:', err);
                }
            });
        }

        const btnExtractDoc = form.querySelector('[data-form-action="extract-document"]');
        const inputExtractDoc = form.querySelector('input[type="file"][data-form-action="extract-document-input"]');
        if (btnExtractDoc && inputExtractDoc) {
            const canUse = () => {
                try {
                    const cfg = window.CrmUiConfig;
                    if (cfg && cfg.aiEnabled === false) return false;
                    if (cfg && cfg.features && cfg.features.aiForms === false) return false;
                    return true;
                } catch {
                    return true;
                }
            };
            if (!canUse()) {
                try { btnExtractDoc.classList.add('hidden'); } catch {}
            } else {
                btnExtractDoc.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try { inputExtractDoc.click(); } catch {}
                });
                inputExtractDoc.addEventListener('change', async () => {
                    const file = inputExtractDoc.files && inputExtractDoc.files[0] ? inputExtractDoc.files[0] : null;
                    try { inputExtractDoc.value = ''; } catch {}
                    if (!file) return;
                    try {
                        const cfg = window.CrmUiConfig;
                        const maxBytes = cfg && cfg.limits && typeof cfg.limits.maxImageBytes === 'number' ? cfg.limits.maxImageBytes : 2_000_000;
                        if (file.size > maxBytes) {
                            if (window.NotificationSystem && typeof window.NotificationSystem.warning === 'function') {
                                window.NotificationSystem.warning('Imagem muito grande. Use uma imagem menor.');
                            } else {
                                alert('Imagem muito grande. Use uma imagem menor.');
                            }
                            return;
                        }
                        const dataUrl = await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onerror = () => reject(new Error('Falha ao ler imagem'));
                            reader.onload = () => resolve(String(reader.result || ''));
                            reader.readAsDataURL(file);
                        });
                        if (window.NotificationSystem && typeof window.NotificationSystem.info === 'function') {
                            window.NotificationSystem.info('Extraindo dados...');
                        }
                        const resp = await fetch('/api/crm/ai/extract-document', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ imageDataUrl: dataUrl, docType: 'cadastro' })
                        });
                        const json = await resp.json().catch(() => ({}));
                        if (!resp.ok) throw new Error(json && json.error ? json.error : `Falha (${resp.status})`);
                        const fields = json && json.fields ? json.fields : {};
                        const mapping = {
                            documento: fields.documento || '',
                            nome: fields.nome || '',
                            email: fields.email || '',
                            telefone: fields.telefone || '',
                            cep: fields.cep || '',
                            endereco: fields.endereco || '',
                            bairro: fields.bairro || '',
                            cidade: fields.cidade || '',
                            estado: fields.estado || ''
                        };
                        if (window.UnifiedValidator) {
                            if (mapping.cep) mapping.cep = window.UnifiedValidator.formatValue(mapping.cep, 'cep');
                            if (mapping.documento) mapping.documento = window.UnifiedValidator.formatValue(String(mapping.documento).replace(/\D/g, ''), 'document');
                            window.UnifiedValidator.autoFillFields(form, mapping);
                        } else {
                            Object.entries(mapping).forEach(([k, v]) => {
                                const field = form.querySelector(`[name="${k}"]`);
                                if (field && v && !field.value) { field.value = v; safeDispatch(field); }
                            });
                        }
                        try { this.trackUiEvent('image_extract', 'clientes', { type: 'document' }); } catch {}
                        if (window.NotificationSystem && typeof window.NotificationSystem.success === 'function') {
                            window.NotificationSystem.success('Dados aplicados no formulário.');
                        } else {
                            alert('Dados aplicados no formulário.');
                        }
                    } catch (e) {
                        try { this.trackUiEvent('image_extract_error', 'clientes', { type: 'document' }); } catch {}
                        const msg = e && e.message ? e.message : 'Falha ao extrair dados';
                        if (window.NotificationSystem && typeof window.NotificationSystem.error === 'function') {
                            window.NotificationSystem.error(msg);
                        } else {
                            alert(msg);
                        }
                    }
                });
            }
        }

        const getInputValue = (name) => {
            const el = form.querySelector(`[name="${name}"]`);
            return el ? String(el.value || '').trim() : '';
        };

        const normalize = (v) => (v != null ? String(v).trim().toLowerCase() : '');

        const openBriefingWithPrefill = () => {
            const clienteId = form.getAttribute('data-id');
            const prefill = {
                clienteId: (clienteId != null && String(clienteId).trim() !== '') ? String(clienteId).trim() : '',
                empresa: getInputValue('nome'),
                email: getInputValue('email'),
                telefone: getInputValue('telefone'),
                responsavel: ''
            };

            if (window.BriefingSystem && typeof BriefingSystem.generateBriefingForm === 'function') {
                const html = `${BriefingSystem.generateBriefingForm(prefill)}`;
                FormSystem.openModal('Novo Briefing', html);
                try {
                    const root = document.getElementById('modal-content') || document;
                    if (window.BriefingSystem && typeof BriefingSystem.bindFormAutoFill === 'function') {
                        BriefingSystem.bindFormAutoFill(root);
                    }
                } catch {}
            } else {
                FormSystem.showCreateForm('briefings');
            }
        };

        form.querySelectorAll('[data-form-action="open-briefing"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                openBriefingWithPrefill();
            });
        });

        const toast = (msg, type = 'info') => {
            if (window.Toast && typeof window.Toast.show === 'function') return window.Toast.show(msg, type);
            if (window.NotificationSystem && typeof window.NotificationSystem[type] === 'function') return window.NotificationSystem[type](msg);
            alert(msg);
        };

        const contatoBox = form.querySelector('[data-cliente-contato-vinculo]');
        const contatoSearch = form.querySelector('[data-contato-search]');
        const contatoResults = form.querySelector('[data-contato-results]');
        const contatoSelected = form.querySelector('[data-contato-selected]');
        const contatoHidden = form.querySelector('input[name="contato_id"][data-selected-contato-id]');
        const btnClearContato = form.querySelector('[data-form-action="limpar-contato"]');
        const btnVincularContato = form.querySelector('[data-form-action="vincular-contato"]');

        const clienteId = (() => {
            const raw = form.getAttribute('data-id');
            const n = raw != null && String(raw).trim() !== '' ? Number(String(raw).trim()) : null;
            return n && Number.isFinite(n) && n > 0 ? n : null;
        })();

        const safeFillIfEmpty = (name, value) => {
            const el = form.querySelector(`[name="${name}"]`);
            if (!el) return;
            if (String(el.value || '').trim() !== '') return;
            if (value == null) return;
            const v = String(value).trim();
            if (!v) return;
            el.value = v;
            safeDispatch(el);
        };

        const setSelectedContato = (c) => {
            const id = c && c.id != null ? String(c.id) : '';
            if (contatoHidden) contatoHidden.value = id;
            if (contatoSelected) {
                if (!id) {
                    contatoSelected.textContent = '';
                } else {
                    const nome = c && c.nome ? String(c.nome) : `Contato #${id}`;
                    const email = c && c.email ? String(c.email) : '';
                    const tel = c && c.telefone ? String(c.telefone) : '';
                    const empresa = c && c.empresa ? String(c.empresa) : '';
                    contatoSelected.textContent = `${nome}${email ? ' • ' + email : ''}${tel ? ' • ' + tel : ''}${empresa ? ' • ' + empresa : ''}`;
                }
            }
            if (btnVincularContato) {
                if (clienteId && id) btnVincularContato.classList.remove('hidden');
                else btnVincularContato.classList.add('hidden');
            }
        };

        const renderContatoResults = (items) => {
            if (!contatoResults) return;
            if (!items || !items.length) {
                contatoResults.textContent = 'Nenhum contato encontrado.';
                return;
            }
            contatoResults.innerHTML = `
                <div class="border border-gray-200 rounded-lg overflow-hidden">
                    ${items.map(c => {
                        const nome = c && c.nome ? String(c.nome) : '';
                        const email = c && c.email ? String(c.email) : '';
                        const tel = c && c.telefone ? String(c.telefone) : '';
                        const empresa = c && c.empresa ? String(c.empresa) : '';
                        return `
                            <button type="button"
                                    class="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
                                    data-pick-contato-id="${String(c.id)}">
                                <div class="text-sm font-medium text-gray-800">${nome || ('Contato #' + String(c.id))}</div>
                                <div class="text-xs text-gray-500">${[email, tel, empresa].filter(Boolean).join(' • ') || '—'}</div>
                            </button>
                        `;
                    }).join('')}
                </div>
            `;
            contatoResults.querySelectorAll('button[data-pick-contato-id]').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const id = btn.getAttribute('data-pick-contato-id');
                    const picked = items.find(x => String(x.id) === String(id)) || null;
                    if (!picked) return;
                    setSelectedContato(picked);
                    safeFillIfEmpty('email', picked.email);
                    safeFillIfEmpty('telefone', picked.telefone);
                    safeFillIfEmpty('nome', picked.empresa);
                    if (contatoResults) contatoResults.textContent = 'Contato selecionado.';
                });
            });
        };

        let contatoSearchTimer = null;
        const runContatoSearch = async () => {
            if (!contatoSearch || !contatoResults) return;
            const q = String(contatoSearch.value || '').trim();
            if (!q) {
                contatoResults.textContent = 'Digite para buscar.';
                return;
            }
            contatoResults.textContent = 'Buscando...';
            try {
                const resp = await fetch(`/api/crm/contatos?q=${encodeURIComponent(q)}&limit=10`, { credentials: 'include' });
                const data = await resp.json().catch(() => ([]));
                if (!resp.ok) {
                    const msg = data && data.error ? data.error : 'Falha ao buscar contatos';
                    throw new Error(msg);
                }
                renderContatoResults(Array.isArray(data) ? data : []);
            } catch (err) {
                contatoResults.textContent = 'Falha ao buscar contatos.';
                console.warn('[FormSystem] Busca de contatos falhou:', err);
            }
        };

        if (contatoBox && contatoSearch && contatoResults) {
            contatoSearch.addEventListener('input', () => {
                if (contatoSearchTimer) clearTimeout(contatoSearchTimer);
                contatoSearchTimer = setTimeout(() => {
                    runContatoSearch().catch(() => {});
                }, 220);
            });
        }

        if (btnClearContato) {
            btnClearContato.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (contatoHidden) contatoHidden.value = '';
                if (contatoSearch) contatoSearch.value = '';
                if (contatoSelected) contatoSelected.textContent = '';
                if (contatoResults) contatoResults.textContent = 'Digite para buscar.';
                if (btnVincularContato) btnVincularContato.classList.add('hidden');
            });
        }

        if (btnVincularContato) {
            btnVincularContato.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!clienteId) return;
                const contatoId = contatoHidden && contatoHidden.value ? Number(String(contatoHidden.value).trim()) : null;
                if (!contatoId || !Number.isFinite(contatoId) || contatoId <= 0) return;
                btnVincularContato.disabled = true;
                try {
                    const resp = await fetch(`/api/crm/contatos/${contatoId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ cliente_id: clienteId })
                    });
                    const payload = await resp.json().catch(() => ({}));
                    if (!resp.ok) {
                        const msg = payload && payload.error ? payload.error : 'Falha ao vincular contato';
                        throw new Error(msg);
                    }
                    toast('Contato vinculado ao cliente.', 'success');
                    btnVincularContato.classList.add('hidden');
                } catch (err) {
                    toast(err && err.message ? err.message : 'Falha ao vincular contato', 'error');
                } finally {
                    btnVincularContato.disabled = false;
                }
            });
        }

        const historyBox = form.querySelector('[data-briefings-history]');
        const historyList = form.querySelector('[data-briefings-history-list]');

        const loadBriefings = async () => {
            try {
                const resp = await fetch('/api/crm/briefings', { credentials: 'include' });
                const data = await resp.json().catch(() => []);
                if (resp.ok && Array.isArray(data)) {
                    ModuleSystem.data.briefings = data;
                    if (window.ModuleSystem && typeof ModuleSystem.saveData === 'function') ModuleSystem.saveData();
                }
            } catch {}
        };

        const findBriefingsForCliente = () => {
            const list = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.briefings)) ? ModuleSystem.data.briefings : [];
            const nome = normalize(getInputValue('nome'));
            const email = normalize(getInputValue('email'));
            const tel = normalize(getInputValue('telefone'));
            const clienteId = (() => {
                const raw = form.getAttribute('data-id');
                return raw != null && String(raw).trim() !== '' ? String(raw).trim() : '';
            })();
            const out = list.filter(b => {
                if (clienteId) {
                    const bid = b?.clienteId ?? b?.cliente_id ?? (b?.payload && (b.payload.clienteId ?? b.payload.cliente_id)) ?? null;
                    if (bid != null && String(bid) === String(clienteId)) return true;
                }
                const bEmpresa = normalize(b?.empresa);
                const bEmail = normalize(b?.email);
                const bTel = normalize(b?.telefone);
                if (email && bEmail && bEmail === email) return true;
                if (nome && bEmpresa && bEmpresa === nome) return true;
                if (tel && bTel && bTel === tel && nome && bEmpresa === nome) return true;
                return false;
            });
            out.sort((a, b) => {
                const ax = a?.updated_at || a?.created_at || a?.id || 0;
                const bx = b?.updated_at || b?.created_at || b?.id || 0;
                return String(bx).localeCompare(String(ax));
            });
            return out;
        };

        const fmtDate = (d) => {
            if (!d) return '—';
            try {
                const x = new Date(String(d).slice(0, 10));
                return isNaN(x.getTime()) ? '—' : x.toLocaleDateString('pt-BR');
            } catch { return '—'; }
        };

        const renderHistory = () => {
            if (!historyBox || !historyList) return;
            const nome = normalize(getInputValue('nome'));
            const email = normalize(getInputValue('email'));
            if (!nome && !email) {
                historyList.textContent = 'Preencha Nome e/ou Email para listar briefings vinculados.';
                return;
            }
            const items = findBriefingsForCliente();
            if (!items.length) {
                historyList.textContent = 'Nenhum briefing encontrado para este cliente.';
                return;
            }
            historyList.innerHTML = `
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="text-left text-gray-600">
                                <th class="py-2 pr-3">Evento</th>
                                <th class="py-2 pr-3">Status</th>
                                <th class="py-2 pr-3">Período</th>
                                <th class="py-2">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            ${items.map(b => `
                                <tr>
                                    <td class="py-2 pr-3">${b?.nome_evento || '—'}</td>
                                    <td class="py-2 pr-3">${b?.status || '—'}</td>
                                    <td class="py-2 pr-3">${fmtDate(b?.data_inicio)} — ${fmtDate(b?.data_termino)}</td>
                                    <td class="py-2">
                                        <button type="button"
                                                class="text-blue-600 hover:text-blue-900"
                                                onclick="FormSystem.showUpdateForm('briefings','${String(b?.id ?? '').replace(/'/g, "\\'")}')">
                                            Abrir
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        };

        const rerenderOn = ['nome', 'email', 'telefone'].map(n => form.querySelector(`[name="${n}"]`)).filter(Boolean);
        rerenderOn.forEach(el => el.addEventListener('input', () => { renderHistory(); }));

        if (historyBox) {
            loadBriefings().then(() => { renderHistory(); }).catch(() => { renderHistory(); });
        }

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

        const escapeHtml = (v) => {
            const s = v == null ? '' : String(v);
            return s
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
                .replaceAll("'", '&#39;');
        };

        const filesBox = form.querySelector('[data-client-files]');
        const filesListEl = form.querySelector('[data-client-files-list]');
        const uploadInput = form.querySelector('[data-form-action="upload-client-files"]');
        const refreshBtn = form.querySelector('[data-form-action="refresh-client-files"]');

        const getClienteId = () => {
            const raw = form.getAttribute('data-id');
            const id = raw != null ? String(raw).trim() : '';
            return id;
        };

        const fmtBytes = (bytes) => {
            const n = Number(bytes);
            if (!Number.isFinite(n) || n <= 0) return '—';
            const kb = n / 1024;
            if (kb < 1024) return `${Math.round(kb)} KB`;
            const mb = kb / 1024;
            if (mb < 1024) return `${Math.round(mb * 10) / 10} MB`;
            const gb = mb / 1024;
            return `${Math.round(gb * 10) / 10} GB`;
        };

        const renderFiles = (items) => {
            if (!filesBox || !filesListEl) return;
            const clienteId = getClienteId();
            if (!clienteId) {
                filesListEl.textContent = 'Para anexar arquivos, preencha os campos obrigatórios. Ao escolher um arquivo, o cliente será salvo automaticamente e o anexo será enviado.';
                if (uploadInput) uploadInput.disabled = false;
                if (refreshBtn) refreshBtn.disabled = true;
                return;
            }
            if (uploadInput) uploadInput.disabled = false;
            if (refreshBtn) refreshBtn.disabled = false;

            const list = Array.isArray(items) ? items : [];
            if (!list.length) {
                filesListEl.textContent = 'Nenhum arquivo anexado para este cliente.';
                return;
            }
            filesListEl.innerHTML = `
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="text-left text-gray-600">
                                <th class="py-2 pr-3">Arquivo</th>
                                <th class="py-2 pr-3">Tamanho</th>
                                <th class="py-2 pr-3">Enviado</th>
                                <th class="py-2">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            ${list.map(f => {
                                const fid = f && f.id != null ? String(f.id) : '';
                                const nome = escapeHtml(f?.nome || f?.name || `Arquivo ${fid}`);
                                const tamanho = fmtBytes(f?.tamanho_bytes ?? f?.size_bytes ?? f?.size);
                                const criado = fmtDate(f?.created_at || f?.createdAt);
                                const href = `/api/clientes/${encodeURIComponent(clienteId)}/files/${encodeURIComponent(fid)}/download`;
                                return `
                                    <tr>
                                        <td class="py-2 pr-3">${nome}</td>
                                        <td class="py-2 pr-3">${tamanho}</td>
                                        <td class="py-2 pr-3">${criado}</td>
                                        <td class="py-2 flex items-center gap-3">
                                            <a href="${href}" class="text-blue-600 hover:text-blue-900" target="_blank" rel="noopener">Baixar</a>
                                            <button type="button"
                                                    class="text-red-600 hover:text-red-800"
                                                    data-file-id="${fid}"
                                                    data-file-action="delete">Excluir</button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        };

        const loadFiles = async () => {
            if (!filesBox || !filesListEl) return;
            const clienteId = getClienteId();
            if (!clienteId) {
                renderFiles([]);
                return;
            }
            filesListEl.textContent = 'Carregando...';
            try {
                const resp = await fetch(`/api/crm/clientes/${encodeURIComponent(clienteId)}/files`, { credentials: 'include' });
                const data = await resp.json().catch(() => []);
                if (!resp.ok) {
                    const msg = data && data.error ? data.error : 'Falha ao carregar arquivos do cliente.';
                    filesListEl.textContent = msg;
                    return;
                }
                renderFiles(Array.isArray(data) ? data : []);
            } catch {
                filesListEl.textContent = 'Falha ao carregar arquivos do cliente.';
            }
        };

        const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onerror = () => reject(new Error('Falha ao ler arquivo'));
            r.onload = () => {
                const res = r.result != null ? String(r.result) : '';
                const idx = res.indexOf(',');
                if (idx === -1) return reject(new Error('Falha ao processar arquivo'));
                resolve(res.slice(idx + 1));
            };
            r.readAsDataURL(file);
        });

        const uploadFiles = async (files) => {
            const ensureClienteId = async () => {
                const existing = getClienteId();
                if (existing) return existing;

                try {
                    if (typeof form.reportValidity === 'function' && !form.reportValidity()) {
                        notify('warning', 'Preencha os campos obrigatórios para salvar o cliente antes de anexar.');
                        return null;
                    }
                } catch {}

                const formData = new FormData(form);
                const data = {};
                for (let [key, value] of formData.entries()) {
                    const cleanValue = typeof value === 'string' ? value.trim() : value;
                    if (cleanValue !== '' && cleanValue !== null && cleanValue !== undefined) {
                        data[key] = cleanValue;
                    }
                }

                try {
                    notify('warning', 'Salvando cliente para anexar arquivos...');
                    const payloadToSend = { ...data, documento: data.documento ?? data.cnpj ?? null };
                    const resp = await fetch('/api/crm/clientes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(payloadToSend)
                    });
                    const json = await resp.json().catch(() => ({}));
                    if (!resp.ok || !json || json.id == null) {
                        const msg = json && json.error ? json.error : 'Falha ao salvar cliente.';
                        notify('error', msg);
                        return null;
                    }

                    const createdId = String(json.id);
                    form.setAttribute('data-id', createdId);
                    form.setAttribute('data-action', 'update');
                    try {
                        if (window.ModuleSystem && typeof ModuleSystem.addItem === 'function') {
                            ModuleSystem.addItem('clientes', { ...data, id: json.id, documento: payloadToSend.documento });
                        }
                    } catch {}
                    notify('success', 'Cliente salvo. Anexando arquivos...');
                    await loadFiles();
                    return createdId;
                } catch (e) {
                    notify('error', 'Falha ao salvar cliente.');
                    return null;
                }
            };

            const clienteId = await ensureClienteId();
            if (!clienteId) return;
            const list = Array.from(files || []).filter(Boolean);
            if (!list.length) return;
            for (const f of list) {
                const maxBytes = 12 * 1024 * 1024;
                if (f.size && f.size > maxBytes) {
                    notify('error', `Arquivo muito grande: ${f.name}. Limite: 12MB.`);
                    continue;
                }
                try {
                    const base64 = await readFileAsBase64(f);
                    const resp = await fetch(`/api/crm/clientes/${encodeURIComponent(clienteId)}/files`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            name: f.name || 'arquivo',
                            mime: f.type || 'application/octet-stream',
                            dataBase64: base64
                        })
                    });
                    const json = await resp.json().catch(() => ({}));
                    if (!resp.ok) {
                        const msg = json && json.error ? json.error : 'Falha ao anexar arquivo.';
                        notify('error', msg);
                    } else {
                        notify('success', `Arquivo anexado: ${f.name}`);
                    }
                } catch {
                    notify('error', `Falha ao anexar arquivo: ${f.name}`);
                }
            }
            if (uploadInput) uploadInput.value = '';
            await loadFiles();
        };

        if (uploadInput && !uploadInput.dataset.bound) {
            uploadInput.dataset.bound = '1';
            uploadInput.addEventListener('change', async () => {
                await uploadFiles(uploadInput.files);
            });
        }
        if (refreshBtn && !refreshBtn.dataset.bound) {
            refreshBtn.dataset.bound = '1';
            refreshBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await loadFiles();
            });
        }
        if (filesListEl && !filesListEl.dataset.boundDelete) {
            filesListEl.dataset.boundDelete = '1';
            filesListEl.addEventListener('click', async (e) => {
                const btn = e.target && e.target.closest('[data-file-action="delete"]');
                if (!btn) return;
                e.preventDefault();
                const fid = btn.getAttribute('data-file-id');
                const clienteId = getClienteId();
                if (!fid || !clienteId) return;
                const ok = confirm('Excluir este arquivo?');
                if (!ok) return;
                try {
                    const resp = await fetch(`/api/crm/clientes/${encodeURIComponent(clienteId)}/files/${encodeURIComponent(fid)}`, {
                        method: 'DELETE',
                        credentials: 'include'
                    });
                    const json = await resp.json().catch(() => ({}));
                    if (!resp.ok) {
                        const msg = json && json.error ? json.error : 'Erro ao excluir arquivo.';
                        notify('error', msg);
                        return;
                    }
                    notify('success', 'Arquivo excluído.');
                    await loadFiles();
                } catch {
                    notify('error', 'Erro ao excluir arquivo.');
                }
            });
        }
        if (filesBox) {
            loadFiles().then(() => {}).catch(() => {});
        }
    }
,
    // Visualização somente leitura para Usuário
    getUsuarioReadView(usuario) {
        return `
            <div class="bg-gradient-to-r from-purple-50 to-violet-50 p-6 rounded-lg mb-6 border border-purple-200">
                <h3 class="text-xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-user-cog mr-3 text-purple-600"></i>Informações do Usuário
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
                        <div class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-lg">
                            ${usuario?.nome || 'Não informado'}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            ${usuario?.email || 'Não informado'}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            ${usuario?.telefone || 'Não informado'}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Departamento</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            ${usuario?.departamento || 'Não informado'}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Nível de Acesso</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                ${usuario?.nivel_acesso === 'Admin' ? 'bg-purple-100 text-purple-800' : 
                                  usuario?.nivel_acesso === 'Gestor' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}">
                                ${usuario?.nivel_acesso || 'Usuário'}
                            </span>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                ${usuario?.status === 'Ativo' ? 'bg-green-100 text-green-800' : 
                                  usuario?.status === 'Bloqueado' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">
                                ${usuario?.status || 'Inativo'}
                            </span>
                        </div>
                    </div>
                </div>
                ${usuario?.observacoes ? `
                    <div class="mt-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                        <div class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg min-h-[100px]">
                            ${usuario.observacoes}
                        </div>
                    </div>
                ` : ''}
                <div class="mt-6 pt-4 border-t border-gray-200">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                            <strong>Criado em:</strong> ${usuario?.created_at ? new Date(usuario.created_at).toLocaleDateString('pt-BR') : 'Não informado'}
                        </div>
                        <div>
                            <strong>Última atualização:</strong> ${usuario?.updated_at ? new Date(usuario.updated_at).toLocaleDateString('pt-BR') : 'Não informado'}
                        </div>
                    </div>
                </div>
            </div>
            <div class="flex justify-end space-x-4 pt-6 border-t">
                <button type="button" onclick="FormSystem.closeModal()" 
                        class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-300"
                        title="Fechar visualização"
                        aria-label="Fechar visualização">
                    <i class="fas fa-times mr-2"></i>Fechar
                </button>
                <button type="button" onclick="FormSystem.showUpdateForm('usuarios', '${usuario?.id}')" 
                        class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-300"
                        title="Editar este usuário"
                        aria-label="Editar este usuário">
                    <i class="fas fa-edit mr-2"></i>Editar Usuário
                </button>
            </div>
        `;
    }
};

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    FormSystem.init();
});

// Exportar FormSystem globalmente
window.FormSystem = FormSystem;

console.log('[FormSystem] Sistema de formulários carregado - Versão 3.5');
