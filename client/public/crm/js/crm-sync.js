/*
 * Sincronização adaptativa multiusuário.
 * Atualiza listas críticas sem recarregar o navegador e nunca substitui
 * um formulário/modal que esteja em edição ativa.
 */
(function () {
    'use strict';

    const CrmSyncManager = {
        version: '1.0.0',
        intervalVisibleMs: 60000,
        minFocusIntervalMs: 15000,
        initialized: false,
        inFlight: false,
        pending: false,
        lastSyncAt: 0,
        lastReason: '',
        _timer: null,

        init() {
            if (this.initialized) return;
            this.initialized = true;
            this.ensureIndicator();

            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') this.requestSync('retorno à aba');
            });
            window.addEventListener('focus', () => this.requestSync('retorno ao CRM'));
            window.addEventListener('storage', (event) => {
                if (event.key === 'sams_module_data') this.requestSync('alteração em outra aba');
            });
            document.addEventListener('submit', () => {
                window.setTimeout(() => this.requestSync('salvamento local'), 1200);
            }, true);

            this._timer = window.setInterval(() => this.requestSync('sincronização periódica'), this.intervalVisibleMs);
            window.setTimeout(() => this.requestSync('abertura do CRM'), 1800);
        },

        getCurrentView() {
            const nav = window.NavigationSystem || {};
            return { module: String(nav.currentModule || ''), page: String(nav.currentPage || '') };
        },

        hasSession() {
            try {
                const auth = window.AuthSystem;
                return Boolean(auth?.getCurrentUser?.() || auth?.currentUser);
            } catch {
                return false;
            }
        },

        isPriorityView() {
            const { module, page } = this.getCurrentView();
            if (module === 'dashboard') return true;
            if (module === 'marketing' && ['leads', 'contatos'].includes(page)) return true;
            if (module === 'kanban') return true;
            if (module === 'administrativo' && page === 'tarefas') return true;
            if (module === 'comercial' && page === 'eventos') return true;
            if (module === 'financeiro') return true;
            if (module === 'juridico' && ['processos', 'prazos'].includes(page)) return true;
            return false;
        },

        isEditing() {
            if (document.body?.dataset?.crmSyncPause === 'true') return true;
            if (document.querySelector('[role="dialog"][aria-modal="true"], #form-modal:not(.hidden), #kanban-modal:not(.hidden), #kanban-overlay:not(.hidden)')) return true;
            const active = document.activeElement;
            if (!active || !['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) return false;
            return !active.matches('[type="search"], [data-crm-sync-search]');
        },

        formatTime(timestamp) {
            if (!timestamp) return 'Aguardando sincronização';
            try { return `Atualizado às ${new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`; } catch { return 'Dados atualizados'; }
        },

        ensureIndicator() {
            if (document.getElementById('crm-sync-status')) return;
            const indicator = document.createElement('button');
            indicator.id = 'crm-sync-status';
            indicator.type = 'button';
            indicator.setAttribute('aria-live', 'polite');
            indicator.setAttribute('aria-label', 'Atualizar dados do CRM');
            indicator.style.cssText = 'position:fixed;top:76px;right:16px;z-index:80;display:none;max-width:calc(100vw - 32px);border:1px solid #bfdbfe;border-radius:999px;background:#eff6ff;color:#1d4ed8;padding:7px 11px;font:600 12px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 4px 12px rgba(15,23,42,.12);cursor:pointer;';
            indicator.innerHTML = '<span aria-hidden="true">↻</span> <span data-crm-sync-text>Atualizar dados</span>';
            indicator.addEventListener('click', () => this.requestSync('atualização manual', true));
            document.body.appendChild(indicator);
        },

        setIndicator(message, tone) {
            this.ensureIndicator();
            const indicator = document.getElementById('crm-sync-status');
            const text = indicator?.querySelector('[data-crm-sync-text]');
            if (!indicator || !text) return;
            text.textContent = message;
            indicator.style.display = this.isPriorityView() && this.hasSession() ? 'inline-flex' : 'none';
            if (tone === 'pending') {
                indicator.style.background = '#fffbeb'; indicator.style.borderColor = '#fde68a'; indicator.style.color = '#92400e';
            } else if (tone === 'loading') {
                indicator.style.background = '#f8fafc'; indicator.style.borderColor = '#cbd5e1'; indicator.style.color = '#334155';
            } else {
                indicator.style.background = '#eff6ff'; indicator.style.borderColor = '#bfdbfe'; indicator.style.color = '#1d4ed8';
            }
        },

        requestSync(reason, force) {
            if (!this.hasSession() || document.visibilityState !== 'visible' || !this.isPriorityView()) return;
            const elapsed = Date.now() - this.lastSyncAt;
            if (!force && elapsed < this.minFocusIntervalMs && reason !== 'sincronização periódica') return;
            if (this.inFlight) return;
            if (this.isEditing()) {
                this.pending = true;
                this.setIndicator('Novos dados disponíveis — conclua a edição para atualizar', 'pending');
                return;
            }
            this.syncCurrentView(reason);
        },

        async syncCurrentView(reason) {
            if (this.inFlight || !this.hasSession() || !this.isPriorityView()) return;
            if (this.isEditing()) {
                this.pending = true;
                this.setIndicator('Novos dados disponíveis — conclua a edição para atualizar', 'pending');
                return;
            }
            this.inFlight = true;
            this.pending = false;
            this.setIndicator('Sincronizando dados…', 'loading');
            const { module, page } = this.getCurrentView();
            try {
                const nav = window.NavigationSystem;
                if (module === 'marketing' && page === 'leads') {
                    nav?.reloadLeadsList?.();
                } else if (module === 'marketing' && page === 'contatos') {
                    nav?.reloadContatosList?.();
                } else if (module === 'kanban') {
                    await window.KanbanSystem?.syncServerTasks?.();
                    if (document.getElementById('kanban-board')) window.KanbanSystem?.renderBoard?.();
                } else if (module === 'dashboard' || (module === 'administrativo' && page === 'tarefas')) {
                    const agenda = window.ModuleSystem?.dashboard;
                    await agenda?.refreshTarefasAdminApi?.(true);
                    agenda?.renderAgendaKanban?.();
                    nav?.reloadCurrentPage?.();
                } else if (module === 'financeiro') {
                    await window.ModuleSystem?.loadTransacoes?.();
                    nav?.reloadCurrentPage?.();
                } else if (module === 'comercial' && page === 'eventos') {
                    nav?.reloadEventosList?.();
                } else if (module === 'juridico') {
                    await window.JuridicoModule?.loadProcessos?.();
                } else {
                    nav?.reloadCurrentPage?.();
                }
                this.lastSyncAt = Date.now();
                this.lastReason = reason;
                this.setIndicator(this.formatTime(this.lastSyncAt), 'ready');
            } catch (error) {
                console.warn('[CrmSyncManager] Falha de sincronização:', error);
                this.setIndicator('Não foi possível atualizar agora — toque para tentar', 'pending');
            } finally {
                this.inFlight = false;
            }
        }
    };

    window.CrmSyncManager = CrmSyncManager;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => CrmSyncManager.init(), { once: true });
    else CrmSyncManager.init();
})();
