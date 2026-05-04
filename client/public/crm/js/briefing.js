// Sistema de Briefing Detalhado - SAMS Locações CRM/ERP
const BriefingSystem = {
    // Configurações
    config: {
        modalId: 'briefing-modal',
        overlayId: 'briefing-overlay',
        promptOverlayId: 'briefing-prompt-overlay'
    },
    promptMode: 'geral',

    // Dados de configuração
    data: {
        eventos: [
            'Feira de Negócios',
            'Congresso Médico',
            'Feira de Tecnologia',
            'Evento Corporativo',
            'Lançamento de Produto',
            'Convenção',
            'Workshop',
            'Seminário',
            'Outro'
        ],
        localizacoes: [
            'Entrada Principal',
            'Corredor Central',
            'Área VIP',
            'Praça de Alimentação',
            'Área de Networking',
            'Auditório Principal',
            'Sala de Reuniões',
            'Área Externa',
            'Mezanino',
            'Subsolo'
        ],
        segmentosVenda: [
            'Corporativo',
            'Varejo',
            'Saúde',
            'Tecnologia',
            'Educação',
            'Alimentação',
            'Moda',
            'Automotivo',
            'Imobiliário',
            'Serviços'
        ],
        tiposSolucao: [
            'Personalizado',
            'Modular',
            'Híbrido',
            'Cenografia',
            'Locação'
        ],
        tiposStand: [
            'Stand Ilha (4 lados abertos)',
            'Stand Lateral (3 lados abertos)',
            'Stand de Canto (2 lados abertos)',
            'Stand Encostado (1 lado aberto)',
            'Stand Personalizado'
        ]
    },

    // Inicialização
    init() {
        this.createModalStructure();
        this.bindEvents();
    },

    // Criar estrutura do modal
    createModalStructure() {
        const existingModal = document.getElementById(this.config.modalId);
        if (existingModal) {
            existingModal.remove();
        }

        const modalHTML = `
            <div id="${this.config.overlayId}" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden">
                <div id="${this.config.modalId}" class="fixed inset-0 flex items-center justify-center p-4">
                    <div class="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
                        <div class="flex justify-between items-center p-6 border-b border-gray-200">
                            <h2 id="briefing-title" class="text-xl font-semibold text-gray-800">Briefing Detalhado</h2>
                            <button id="briefing-close" class="text-gray-400 hover:text-gray-600 transition duration-300">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <div id="briefing-content" class="p-6">
                            <!-- Conteúdo do briefing será inserido aqui -->
                        </div>
                        <div id="briefing-footer" class="flex justify-end space-x-3 p-6 border-t border-gray-200">
                            <button id="briefing-dashboard" class="px-4 py-2 text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition duration-300">
                                <i class="fas fa-home mr-2"></i>
                                Voltar ao Dashboard
                            </button>
                            <button id="briefing-cancel" class="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-300">
                                Cancelar
                            </button>
                            <button id="briefing-open-prompt" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-300">
                                <i class="fas fa-wand-magic-sparkles mr-2"></i>
                                Gerar Prompt IA
                            </button>
                            <button id="briefing-save" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300">
                                Salvar Briefing
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div id="${this.config.promptOverlayId}" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden" style="z-index: 9999;">
                <div class="fixed inset-0 flex items-center justify-center p-4">
                    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
                        <div class="flex justify-between items-center p-6 border-b border-gray-200">
                            <div class="flex items-center gap-2">
                                <div class="text-xl font-semibold text-gray-800">Prompt Gerado</div>
                                <span class="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">Pronto para usar</span>
                            </div>
                            <button id="briefing-prompt-close" class="text-gray-400 hover:text-gray-600 transition duration-300">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <div class="p-6">
                            <div class="text-sm text-gray-600 mb-4">Cole este prompt em qualquer IA generativa (ChatGPT, Claude, Gemini, Midjourney etc.) para obter sugestões de projeto, planta baixa e renders do stand.</div>
                            <div class="mb-4">
                                <div class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Otimizado para</div>
                                <div class="flex flex-wrap gap-2">
                                    <button type="button" class="briefing-ia-chip px-3 py-1.5 rounded-full border border-gray-300 bg-indigo-50 text-indigo-700 font-semibold" data-mode="geral">Geral (Texto)</button>
                                    <button type="button" class="briefing-ia-chip px-3 py-1.5 rounded-full border border-gray-300 bg-white text-gray-700 hover:border-indigo-400" data-mode="planta">Planta Baixa</button>
                                    <button type="button" class="briefing-ia-chip px-3 py-1.5 rounded-full border border-gray-300 bg-white text-gray-700 hover:border-indigo-400" data-mode="render">Render / Imagem</button>
                                    <button type="button" class="briefing-ia-chip px-3 py-1.5 rounded-full border border-gray-300 bg-white text-gray-700 hover:border-indigo-400" data-mode="bim">BIM / Revit</button>
                                </div>
                            </div>
                            <textarea id="briefing-prompt-box" class="w-full min-h-[320px] font-mono text-xs leading-6 p-4 bg-gray-900 text-gray-100 rounded-lg" readonly></textarea>
                        </div>
                        <div class="flex justify-end gap-3 p-6 border-t border-gray-200">
                            <button id="briefing-prompt-close-2" type="button" class="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-300">Fechar</button>
                            <button id="briefing-prompt-copy" type="button" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-300">Copiar Prompt</button>
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
        const closeBtn = document.getElementById('briefing-close');
        const cancelBtn = document.getElementById('briefing-cancel');
        const saveBtn = document.getElementById('briefing-save');
        const dashboardBtn = document.getElementById('briefing-dashboard');
        const openPromptBtn = document.getElementById('briefing-open-prompt');
        const promptOverlay = document.getElementById(this.config.promptOverlayId);
        const promptCloseBtn = document.getElementById('briefing-prompt-close');
        const promptCloseBtn2 = document.getElementById('briefing-prompt-close-2');
        const promptCopyBtn = document.getElementById('briefing-prompt-copy');

        // Fechar modal
        [overlay, closeBtn, cancelBtn].forEach(element => {
            element?.addEventListener('click', (e) => {
                if (e.target === overlay || e.target === closeBtn || e.target === cancelBtn) {
                    this.closeModal();
                }
            });
        });

        openPromptBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openPromptModal();
        });

        [promptOverlay, promptCloseBtn, promptCloseBtn2].forEach((element) => {
            element?.addEventListener('click', (e) => {
                if (e.target === promptOverlay || e.target === promptCloseBtn || e.target === promptCloseBtn2) {
                    this.closePromptModal();
                }
            });
        });

        promptCopyBtn?.addEventListener('click', () => this.copyPromptToClipboard());

        document.querySelectorAll('.briefing-ia-chip').forEach((btn) => {
            btn.addEventListener('click', () => {
                const mode = btn.getAttribute('data-mode') || 'geral';
                this.setPromptMode(mode);
            });
        });

        // Salvar briefing
        saveBtn?.addEventListener('click', () => {
            this.saveBriefing();
        });

        // Voltar ao Dashboard
        dashboardBtn?.addEventListener('click', () => {
            this.closeModal();
            if (window.NavigationSystem?.navigateToModule) {
                window.NavigationSystem.navigateToModule('dashboard');
            } else {
                console.warn('NavigationSystem não disponível. Redirecione manualmente para o dashboard.');
            }
        });

        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            // Só processar ESC se não estivermos em um campo de input
            if (e.key === 'Escape' && !e.target.matches('input, textarea, select')) {
                const po = document.getElementById(this.config.promptOverlayId);
                if (po && !po.classList.contains('hidden')) {
                    this.closePromptModal();
                    return;
                }
                if (overlay && !overlay.classList.contains('hidden')) {
                    this.closeModal();
                }
            }
        });

        if (eventoSelect && eventoSelect.value && !eventoSelect.getAttribute('data-autofill-initialized')) {
            eventoSelect.setAttribute('data-autofill-initialized', '1');
            try { eventoSelect.dispatchEvent(new Event('change', { bubbles: true })); } catch {}
        }
    },

    // Abrir modal
    openModal() {
        try { this.ensurePromptOverlay(); } catch {}
        const overlay = document.getElementById(this.config.overlayId);
        const content = document.getElementById('briefing-content');
        
        content.innerHTML = this.generateBriefingForm();
        try { this.ensurePromptButtonInFooter(); } catch {}
        overlay?.classList.remove('hidden');
        this.bindFormAutoFill();
        try { this.bindBriefingAI(content); } catch {}
        try { this.applySmartDefaults(content); } catch {}
        
        // Focar no primeiro input
        setTimeout(() => {
            const firstInput = content.querySelector('input, select, textarea');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    },

    // Fechar modal
    closeModal() {
        const overlay = document.getElementById(this.config.overlayId);
        if (overlay) {
            overlay.classList.add('hidden');
            return;
        }
        if (window.FormSystem && typeof FormSystem.closeModal === 'function') {
            FormSystem.closeModal();
        }
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
        const blocked = /(^|_)(empresa|responsavel|email|telefone|whatsapp|cpf|cnpj|endereco|rua|numero|cep|bairro|cidade|estado)(_|$)/i;

        for (const el of Array.from(form.elements)) {
            if (!el) continue;
            const name = el.name != null ? String(el.name) : '';
            if (!name) continue;
            if (name.endsWith('[]')) continue;
            if (blocked.test(name)) continue;

            const tag = (el.tagName || '').toLowerCase();
            const type = (el.type || '').toLowerCase();
            if (type === 'hidden' || type === 'password' || type === 'file') continue;

            if (type === 'checkbox') {
                if (!el.checked) continue;
                const v = el.value != null ? String(el.value).trim() : '';
                if (v) {
                    if (out[name] === undefined) out[name] = [v];
                    else if (Array.isArray(out[name])) out[name].push(v);
                    else out[name] = [out[name], v];
                } else {
                    out[name] = true;
                }
                continue;
            }
            if (type === 'radio') {
                if (!el.checked) continue;
                const v = el.value != null ? String(el.value).trim() : '';
                if (v) out[name] = v;
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

    storeSmartDefaults(form) {
        try {
            const cfg = window.CrmUiConfig;
            if (cfg && cfg.features && cfg.features.personalizationSmartDefaults === false) return;
        } catch {}
        const collected = this.collectSmartDefaultsFromForm(form);
        if (!collected || typeof collected !== 'object' || !Object.keys(collected).length) return;
        const all = this.readSmartDefaults();
        all.briefings = { ...(all.briefings || {}), ...collected };
        this.writeSmartDefaults(all);
    },

    applySmartDefaults(rootElement) {
        try {
            const cfg = window.CrmUiConfig;
            if (cfg && cfg.features && cfg.features.personalizationSmartDefaults === false) return;
        } catch {}
        const root = rootElement || document.getElementById('briefing-content') || document;
        const form = root.querySelector('form#briefing-form');
        if (!form) return;
        if (form.getAttribute('data-smart-defaults-applied') === '1') return;
        form.setAttribute('data-smart-defaults-applied', '1');

        const all = this.readSmartDefaults();
        const defs = all && all.briefings && typeof all.briefings === 'object' ? all.briefings : null;
        if (!defs) return;

        const esc = (v) => (window.CSS && typeof window.CSS.escape === 'function') ? window.CSS.escape(String(v)) : String(v);
        const setIfEmpty = (name, value) => {
            if (value == null) return;
            const els = Array.from(form.querySelectorAll(`[name="${esc(name)}"]`));
            if (!els.length) return;
            const first = els[0];
            const tag = (first.tagName || '').toLowerCase();
            const type = (first.type || '').toLowerCase();

            if (type === 'checkbox') {
                const checkedAny = els.some(e => e.checked);
                if (checkedAny) return;
                const arr = Array.isArray(value) ? value.map(v => String(v)) : [String(value)];
                for (const e of els) {
                    const v = e.value != null ? String(e.value) : '';
                    if (arr.includes(v)) {
                        e.checked = true;
                        e.dispatchEvent(new Event('change', { bubbles: true }));
                    }
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
                const cur = first.value != null ? String(first.value).trim() : '';
                if (cur) return;
                first.value = String(value);
                first.dispatchEvent(new Event('change', { bubbles: true }));
                return;
            }
        };

        for (const k of Object.keys(defs)) {
            setIfEmpty(k, defs[k]);
        }
    },

    ensurePromptButtonInFooter() {
        const footer = document.getElementById('briefing-footer');
        if (!footer) return;
        const existing = document.getElementById('briefing-open-prompt');
        if (existing) return;
        const saveBtn = document.getElementById('briefing-save');
        const btn = document.createElement('button');
        btn.id = 'briefing-open-prompt';
        btn.type = 'button';
        btn.className = 'px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-300';
        btn.textContent = 'Gerar Prompt IA';
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            this.openPromptModal();
        });
        if (saveBtn && saveBtn.parentNode === footer) {
            footer.insertBefore(btn, saveBtn);
        } else {
            footer.appendChild(btn);
        }
    },

    ensurePromptOverlay() {
        const existing = document.getElementById(this.config.promptOverlayId);
        if (existing) {
            if (existing.dataset && existing.dataset.bound === '1') return;
            this.bindPromptOverlayEvents();
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <div id="${this.config.promptOverlayId}" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden" style="z-index: 9999;">
                <div class="fixed inset-0 flex items-center justify-center p-4">
                    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
                        <div class="flex justify-between items-center p-6 border-b border-gray-200">
                            <div class="flex items-center gap-2">
                                <div class="text-xl font-semibold text-gray-800">Prompt Gerado</div>
                                <span class="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">Pronto para usar</span>
                            </div>
                            <button id="briefing-prompt-close" class="text-gray-400 hover:text-gray-600 transition duration-300" type="button">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <div class="p-6">
                            <div class="text-sm text-gray-600 mb-4">Cole este prompt em qualquer IA generativa (ChatGPT, Claude, Gemini, Midjourney etc.) para obter sugestões de projeto, planta baixa e renders do stand.</div>
                            <div class="mb-4">
                                <div class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Otimizado para</div>
                                <div class="flex flex-wrap gap-2">
                                    <button type="button" class="briefing-ia-chip px-3 py-1.5 rounded-full border border-gray-300 bg-indigo-50 text-indigo-700 font-semibold" data-mode="geral">Geral (Texto)</button>
                                    <button type="button" class="briefing-ia-chip px-3 py-1.5 rounded-full border border-gray-300 bg-white text-gray-700 hover:border-indigo-400" data-mode="planta">Planta Baixa</button>
                                    <button type="button" class="briefing-ia-chip px-3 py-1.5 rounded-full border border-gray-300 bg-white text-gray-700 hover:border-indigo-400" data-mode="render">Render / Imagem</button>
                                    <button type="button" class="briefing-ia-chip px-3 py-1.5 rounded-full border border-gray-300 bg-white text-gray-700 hover:border-indigo-400" data-mode="bim">BIM / Revit</button>
                                </div>
                            </div>
                            <textarea id="briefing-prompt-box" class="w-full min-h-[320px] font-mono text-xs leading-6 p-4 bg-gray-900 text-gray-100 rounded-lg" readonly></textarea>
                        </div>
                        <div class="flex justify-end gap-3 p-6 border-t border-gray-200">
                            <button id="briefing-prompt-close-2" type="button" class="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-300">Fechar</button>
                            <button id="briefing-prompt-copy" type="button" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-300">Copiar Prompt</button>
                        </div>
                    </div>
                </div>
            </div>
        `.trim();
        while (wrapper.firstChild) document.body.appendChild(wrapper.firstChild);
        this.bindPromptOverlayEvents();
    },

    bindPromptOverlayEvents() {
        const promptOverlay = document.getElementById(this.config.promptOverlayId);
        if (!promptOverlay) return;
        if (promptOverlay.dataset) promptOverlay.dataset.bound = '1';

        const promptCloseBtn = document.getElementById('briefing-prompt-close');
        const promptCloseBtn2 = document.getElementById('briefing-prompt-close-2');
        const promptCopyBtn = document.getElementById('briefing-prompt-copy');

        [promptOverlay, promptCloseBtn, promptCloseBtn2].forEach((element) => {
            element?.addEventListener('click', (e) => {
                if (e.target === promptOverlay || e.target === promptCloseBtn || e.target === promptCloseBtn2) {
                    this.closePromptModal();
                }
            });
        });

        promptCopyBtn?.addEventListener('click', () => this.copyPromptToClipboard());

        document.querySelectorAll('.briefing-ia-chip').forEach((btn) => {
            btn.addEventListener('click', () => {
                const mode = btn.getAttribute('data-mode') || 'geral';
                this.setPromptMode(mode);
            });
        });
    },

    openPromptModal() {
        this.ensurePromptOverlay();
        this.setPromptMode(this.promptMode || 'geral');
        this.updatePromptBox();
        const overlay = document.getElementById(this.config.promptOverlayId);
        overlay?.classList.remove('hidden');
    },

    closePromptModal() {
        const overlay = document.getElementById(this.config.promptOverlayId);
        overlay?.classList.add('hidden');
    },

    setPromptMode(mode) {
        const m = String(mode || '').trim().toLowerCase();
        this.promptMode = m || 'geral';
        document.querySelectorAll('.briefing-ia-chip').forEach((btn) => {
            const isActive = (btn.getAttribute('data-mode') || 'geral') === this.promptMode;
            btn.classList.toggle('bg-indigo-50', isActive);
            btn.classList.toggle('text-indigo-700', isActive);
            btn.classList.toggle('font-semibold', isActive);
            btn.classList.toggle('bg-white', !isActive);
            btn.classList.toggle('text-gray-700', !isActive);
        });
        this.updatePromptBox();
    },

    updatePromptBox() {
        const box = document.getElementById('briefing-prompt-box');
        if (!box) return;
        box.value = this.buildPrompt(this.promptMode);
    },

    copyPromptToClipboard() {
        const box = document.getElementById('briefing-prompt-box');
        if (!box) return;
        const value = box.value || '';
        const fallback = () => {
            try {
                box.removeAttribute('readonly');
                box.select();
                document.execCommand('copy');
            } catch {} finally {
                box.setAttribute('readonly', 'readonly');
            }
        };
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText(value).catch(() => fallback());
        } else {
            fallback();
        }
    },

    getFormValue(form, name) {
        const el = form ? form.querySelector(`[name="${name}"]`) : null;
        if (!el) return '';
        return String(el.value || '').trim();
    },

    getCheckedValues(form, name) {
        const list = form ? Array.from(form.querySelectorAll(`[name="${name}"]:checked`)) : [];
        return list.map((el) => String(el.value || '').trim()).filter(Boolean);
    },

    buildPrompt(mode) {
        const form = document.getElementById('briefing-form');
        const empresa = this.getFormValue(form, 'empresa') || '[Empresa não informada]';
        const nomeEvento = this.getFormValue(form, 'nomeEvento') || '[Evento não informado]';
        const tipoEvento = this.getFormValue(form, 'tipoEvento');
        const dataInicio = this.getFormValue(form, 'dataInicio');
        const dataTermino = this.getFormValue(form, 'dataTermino');
        const localEvento = this.getFormValue(form, 'localEvento');
        const tipoStand = this.getFormValue(form, 'tipoStand');
        const localizacaoStand = this.getFormValue(form, 'localizacaoStand');
        const metragem = this.getFormValue(form, 'metragem');
        const largura = this.getFormValue(form, 'largura');
        const profundidade = this.getFormValue(form, 'profundidade');
        const numeroStand = this.getFormValue(form, 'numeroStand');
        const tipoSolucao = this.getFormValue(form, 'tipoSolucao');
        const segmentoPrincipal = this.getFormValue(form, 'segmentoPrincipal');
        const publicoAlvo = this.getFormValue(form, 'publicoAlvo');
        const produtosServicos = this.getFormValue(form, 'produtosServicos');
        const objetivos = this.getFormValue(form, 'objetivos');
        const exposicaoProdutos = this.getFormValue(form, 'exposicaoProdutos');
        const mobilEquipamentos = this.getFormValue(form, 'mobilEquipamentos');
        const estiloDesejado = this.getFormValue(form, 'estiloDesejado');
        const paletaCores = this.getFormValue(form, 'paletaCores');
        const materiaisEspeciais = this.getCheckedValues(form, 'materiaisEspeciais');
        const impactoVisual = this.getFormValue(form, 'impactoVisual');
        const energiaEletrica = this.getFormValue(form, 'energiaEletrica');
        const internet = this.getFormValue(form, 'internet');
        const aguaEsgoto = this.getFormValue(form, 'aguaEsgoto');
        const arCondicionado = this.getFormValue(form, 'arCondicionado');
        const elementos = this.getCheckedValues(form, 'elementos');
        const orcamentoEstimado = this.getFormValue(form, 'orcamentoEstimado');
        const prazoAprovacao = this.getFormValue(form, 'prazoAprovacao');
        const prazoEntrega = this.getFormValue(form, 'prazoEntrega');
        const observacoes = this.getFormValue(form, 'observacoes');
        const standsReferencia = this.getFormValue(form, 'standsReferencia');
        const concorrencia = this.getFormValue(form, 'concorrencia');
        const restricoesEvento = this.getFormValue(form, 'restricoesEvento');
        const outrasInformacoes = this.getFormValue(form, 'outrasInformacoes');

        const dimensoes = largura && profundidade ? `${largura}m x ${profundidade}m` : (largura ? `${largura}m x [profundidade]` : (profundidade ? `[largura] x ${profundidade}m` : ''));

        const mapArea = (code) => {
            const m = {
                recepcao: 'Área de Recepção/Atendimento',
                demonstracao: 'Área de Demonstração/Produto',
                salaReuniao: 'Sala de Reunião Fechada',
                copaDeposito: 'Copa/Depósito',
                lounge: 'Espaço Lounge/Convivência',
                vendas: 'Área de Caixa/Vendas'
            };
            return m[code] || code;
        };

        const areasRaw = this.getCheckedValues(form, 'areasFuncionais');
        const areas = areasRaw.map(mapArea);
        const areaDetails = [];
        const recepcaoCapacidade = this.getFormValue(form, 'recepcaoCapacidade');
        const demonstracaoEspaco = this.getFormValue(form, 'demonstracaoEspaco');
        const salaReuniaoCapacidade = this.getFormValue(form, 'salaReuniaoCapacidade');
        const volumeMaterial = this.getFormValue(form, 'volumeMaterial');
        const loungeCapacidade = this.getFormValue(form, 'loungeCapacidade');
        if (recepcaoCapacidade) areaDetails.push(`Recepção: ${recepcaoCapacidade}`);
        if (demonstracaoEspaco) areaDetails.push(`Demonstração: ${demonstracaoEspaco}`);
        if (salaReuniaoCapacidade) areaDetails.push(`Sala de reunião: ${salaReuniaoCapacidade}`);
        if (volumeMaterial) areaDetails.push(`Copa/depósito: ${volumeMaterial}`);
        if (loungeCapacidade) areaDetails.push(`Lounge: ${loungeCapacidade}`);

        const blocoCliente = `CLIENTE: ${empresa}`;
        const blocoEvento = `EVENTO: ${nomeEvento}${tipoEvento ? ` (${tipoEvento})` : ''}${localEvento ? ` — ${localEvento}` : ''}${dataInicio ? ` | ${dataInicio}${dataTermino ? ' a ' + dataTermino : ''}` : ''}`;
        const blocoStand = [
            `STAND: ${tipoStand || 'Tipo não definido'}`,
            metragem ? `Metragem: ${metragem} m²` : '',
            dimensoes ? `Dimensões: ${dimensoes}` : '',
            numeroStand ? `Número: ${numeroStand}` : '',
            localizacaoStand ? `Localização: ${localizacaoStand}` : '',
            tipoSolucao ? `Tipo de solução: ${tipoSolucao}` : ''
        ].filter(Boolean).join(' | ');

        const blocoComercial = [
            segmentoPrincipal ? `Segmento: ${segmentoPrincipal}` : '',
            publicoAlvo ? `Público-alvo: ${publicoAlvo}` : '',
            produtosServicos ? `Produtos/serviços: ${produtosServicos}` : '',
            objetivos ? `Objetivos: ${objetivos}` : ''
        ].filter(Boolean).join('\n');

        const blocoLayout = [
            areas.length ? `Áreas obrigatórias: ${areas.join(', ')}` : '',
            areaDetails.length ? `Detalhes das áreas: ${areaDetails.join(' | ')}` : '',
            exposicaoProdutos ? `Exposição de produtos: ${exposicaoProdutos}` : '',
            mobilEquipamentos ? `Mobiliário/equipamentos: ${mobilEquipamentos}` : '',
            elementos.length ? `Elementos especiais: ${elementos.join(', ')}` : ''
        ].filter(Boolean).join('\n');

        const blocoIdentidade = [
            estiloDesejado ? `Estilo: ${estiloDesejado}` : '',
            paletaCores ? `Paleta de cores: ${paletaCores}` : '',
            materiaisEspeciais.length ? `Materiais: ${materiaisEspeciais.join(', ')}` : '',
            impactoVisual ? `Impacto visual: ${impactoVisual}` : ''
        ].filter(Boolean).join('\n');

        const blocoInfra = [
            energiaEletrica ? `Elétrica: ${energiaEletrica}` : '',
            internet ? `Internet: ${internet}` : '',
            aguaEsgoto ? `Água/esgoto: ${aguaEsgoto}` : '',
            arCondicionado ? `Ar condicionado: ${arCondicionado}` : ''
        ].filter(Boolean).join(' | ');

        const blocoFinanceiro = [
            orcamentoEstimado ? `Orçamento: ${orcamentoEstimado}` : '',
            prazoAprovacao ? `Aprovação até: ${prazoAprovacao}` : '',
            prazoEntrega ? `Entrega até: ${prazoEntrega}` : ''
        ].filter(Boolean).join(' | ');

        const blocoObs = [
            observacoes ? `Observações: ${observacoes}` : '',
            standsReferencia ? `Referências: ${standsReferencia}` : '',
            concorrencia ? `Concorrência: ${concorrencia}` : '',
            restricoesEvento ? `Restrições: ${restricoesEvento}` : '',
            outrasInformacoes ? `Outras infos: ${outrasInformacoes}` : ''
        ].filter(Boolean).join('\n');

        const normalizedMode = String(mode || 'geral').trim().toLowerCase();

        if (normalizedMode === 'planta') {
            return `Você é um arquiteto especialista em stands para feiras e eventos. Com base no briefing abaixo, elabore uma proposta detalhada de PLANTA BAIXA para o stand, incluindo:

1. Planta baixa esquemática com cotas (em texto ASCII ou descrição técnica detalhada)
2. Zoneamento funcional de todas as áreas
3. Posicionamento de mobiliário e equipamentos
4. Fluxo de circulação (visitantes e equipe)
5. Pontos de entrada, saída e acesso interno
6. Lista de materiais e especificações técnicas construtivas
7. Indicações de infraestrutura (elétrica, hidráulica, ar-condicionado)

═══════════════════════════════════════
BRIEFING DO STAND
═══════════════════════════════════════
${blocoCliente}
${blocoEvento}
${blocoStand}

INFORMAÇÕES COMERCIAIS:
${blocoComercial || 'Não informado'}

LAYOUT E FUNCIONALIDADES:
${blocoLayout || 'Não informado'}

IDENTIDADE VISUAL:
${blocoIdentidade || 'Não informado'}

INFRAESTRUTURA:
${blocoInfra || 'Não informado'}

ORÇAMENTO / PRAZO:
${blocoFinanceiro || 'Não informado'}

${blocoObs ? 'OBSERVAÇÕES:\n' + blocoObs : ''}
═══════════════════════════════════════

Forneça o resultado de forma clara e técnica, como se fosse uma memória descritiva de projeto arquitetônico. Indique também quaisquer inconsistências ou pontos que precisam ser esclarecidos com o cliente.`;
        }

        if (normalizedMode === 'render') {
            const estiloRender = estiloDesejado ? String(estiloDesejado).toLowerCase() : 'moderno';
            const coresRender = paletaCores || 'neutras com destaque na marca';
            const materiaisRender = materiaisEspeciais.length ? materiaisEspeciais.join(', ') : 'madeira, metal e vidro';
            return `/imagine prompt: Exhibition stand design for ${empresa}, ${tipoStand || 'island stand'}, ${metragem || '36'}sqm, ${estiloRender} style, colors: ${coresRender}, materials: ${materiaisRender}, ${elementos.length ? elementos.join(', ') : 'reception counter, meeting area, product display'}, ${localizacaoStand || 'trade show hall'} location, professional lighting${impactoVisual ? ', ' + impactoVisual : ''}, photorealistic 3D render, architectural visualization, high detail, 4K, cinematic lighting, wide angle perspective --ar 16:9 --v 6

---
CONTEXTO PARA GERAÇÃO DE IMAGEM:
• Empresa: ${empresa}
• Evento: ${nomeEvento}
• Stand: ${tipoStand} — ${metragem ? metragem + 'm²' : ''}${dimensoes ? ` (${dimensoes})` : ''}
• Estilo: ${estiloDesejado || 'Moderno'}
• Cores: ${paletaCores || 'A definir'}
• Materiais: ${materiaisEspeciais.join(', ') || 'A definir'}
• Elementos: ${elementos.join(', ') || 'Padrão'}
${observacoes ? '• Obs: ' + observacoes : ''}`;
        }

        if (normalizedMode === 'bim') {
            return `Você é um engenheiro especialista em modelagem BIM (Building Information Modeling) para stands e ambientes temporários. Com base no briefing abaixo, gere:

1. Memorial descritivo completo para modelagem no Revit/ArchiCAD
2. Lista de famílias BIM necessárias (mobiliário, estrutura, MEP)
3. Parâmetros técnicos para cada elemento construtivo
4. Indicações de LOD (Level of Development) recomendado
5. Checklist de instalações MEP (Mechanical, Electrical, Plumbing)
6. Estimativa de cargas elétricas com base nas especificações

═══════════════════════════════════════
BRIEFING DO STAND
═══════════════════════════════════════
${blocoCliente}
${blocoEvento}
${blocoStand}

LAYOUT E FUNCIONALIDADES:
${blocoLayout || 'Não informado'}

INFRAESTRUTURA:
${blocoInfra || 'Não informado'}

IDENTIDADE VISUAL / MATERIAIS:
${blocoIdentidade || 'Não informado'}

ORÇAMENTO / PRAZO:
${blocoFinanceiro || 'Não informado'}

${blocoObs ? 'OBSERVAÇÕES:\n' + blocoObs : ''}
═══════════════════════════════════════`;
        }

        return `Você é um arquiteto/designer de stands especialista em feiras e eventos corporativos. Analise o briefing abaixo e apresente uma proposta conceitual completa de projeto para o stand, incluindo:

1. CONCEITO CRIATIVO — Tema, narrativa visual e proposta estética
2. LAYOUT FUNCIONAL — Organização das áreas, fluxo de circulação e aproveitamento do espaço
3. IDENTIDADE VISUAL — Materiais, acabamentos, iluminação e impacto visual
4. INFRAESTRUTURA — Necessidades técnicas e instalações
5. DIFERENCIAIS — Elementos que farão o stand se destacar no evento
6. PONTOS DE ATENÇÃO — Possíveis desafios, restrições ou inconsistências no briefing

═══════════════════════════════════════
BRIEFING COMPLETO DO STAND
═══════════════════════════════════════
${blocoCliente}
${blocoEvento}

${blocoStand}

INFORMAÇÕES COMERCIAIS:
${blocoComercial || 'Não informado'}

LAYOUT E FUNCIONALIDADES:
${blocoLayout || 'Não informado'}

IDENTIDADE VISUAL:
${blocoIdentidade || 'Não informado'}

INFRAESTRUTURA NECESSÁRIA:
${blocoInfra || 'Não informado'}

ORÇAMENTO E PRAZO:
${blocoFinanceiro || 'Não informado'}

${blocoObs ? 'OBSERVAÇÕES ESPECIAIS:\n' + blocoObs : ''}
═══════════════════════════════════════

Apresente a proposta de forma clara, criativa e técnica, adequada para ser apresentada ao cliente e usada como base pelo time de projeto.`;
    },

    // Gerar formulário de briefing
    generateBriefingForm(record) {
        const r = record || {};
        const formId = `briefing_form_${r.id || 'new'}`;
        const get = (k) => (r[k] == null ? '' : String(r[k]));
        const list = (k) => {
            const v = r[k];
            if (Array.isArray(v)) return v.map((x) => String(x));
            if (v == null || v === '') return [];
            return [String(v)];
        };
        const isChecked = (k, val) => (list(k).includes(String(val)) ? 'checked' : '');
        const isSelected = (k, val) => (get(k) === String(val) ? 'selected' : '');
        const vendedorNome = r.responsavelUsuarioNome || '';
        const vendedorEmail = r.responsavelUsuarioEmail || '';
        const statusAtual = (r.status || 'Em Análise').toString().trim() || 'Em Análise';
        const statusOptions = ['Em Análise', 'Em Andamento', 'Aprovado', 'Concluído', 'Cancelado', 'Enviado'];
        const statusLocked = statusAtual === 'Enviado';
        const enviadoParaId = r.enviadoParaId != null ? r.enviadoParaId : (r.enviado_para_id != null ? r.enviado_para_id : '');
        const enviadoParaNome = r.enviadoParaNome || r.enviado_para_nome || '';
        const enviadoParaEmail = r.enviadoParaEmail || r.enviado_para_email || '';
        const enviadoEm = r.enviadoEm || r.enviado_em || '';
        const enviadoEmFmt = (() => {
            try {
                if (!enviadoEm) return '';
                const d = new Date(String(enviadoEm));
                if (isNaN(d.getTime())) return String(enviadoEm);
                return d.toLocaleString('pt-BR');
            } catch { return String(enviadoEm || ''); }
        })();
        return `
            <form id="briefing-form" class="space-y-8">
                <input type="hidden" name="id" value="${r.id || ''}">
                <div class="bg-indigo-50 p-5 rounded-lg border border-indigo-100">
                    <h3 class="text-lg font-semibold text-indigo-900 mb-4 flex items-center">
                        <i class="fas fa-user-tie mr-2 text-indigo-700"></i>
                        Vendedor Responsável
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-indigo-900 mb-2">Vendedor</label>
                            <input type="text" value="${vendedorNome}" disabled
                                   class="w-full px-3 py-2 border border-indigo-200 rounded-lg bg-white text-gray-900">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-indigo-900 mb-2">Email</label>
                            <input type="text" value="${vendedorEmail}" disabled
                                   class="w-full px-3 py-2 border border-indigo-200 rounded-lg bg-white text-gray-900">
                        </div>
                        <div class="md:col-span-2">
                            <label for="status_${formId}" class="block text-sm font-medium text-indigo-900 mb-2">Status</label>
                            <select name="status" id="status_${formId}"
                                    ${statusLocked ? 'disabled' : ''}
                                    class="w-full px-3 py-2 border border-indigo-200 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                                ${statusOptions.map(s => `<option value="${s}" ${statusAtual === s ? 'selected' : ''}>${s}</option>`).join('')}
                            </select>
                            ${statusLocked ? `<input type="hidden" name="status" value="Enviado">` : ''}
                        </div>
                        ${statusLocked ? `<div class="md:col-span-2 text-sm text-indigo-900 bg-white border border-indigo-200 rounded-lg p-3">Briefing enviado. Para alterar, duplique e crie uma nova versão.</div>` : ''}
                        <div class="md:col-span-2">
                            <label for="enviado_para_${formId}" class="block text-sm font-medium text-indigo-900 mb-2">Enviar ao Projetista/Arquiteto</label>
                            <div class="flex flex-col md:flex-row gap-2">
                                <select name="enviado_para_id" id="enviado_para_${formId}" data-initial="${enviadoParaId || ''}"
                                        ${statusLocked || !r.id ? 'disabled' : ''}
                                        class="flex-1 px-3 py-2 border border-indigo-200 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                                    <option value="">Selecionar usuário</option>
                                </select>
                                <button type="button" data-briefing-action="enviar-projetista"
                                        ${statusLocked || !r.id ? 'disabled' : ''}
                                        class="px-4 py-2 text-sm font-medium text-white ${statusLocked || !r.id ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} border border-transparent rounded-md">
                                    Enviar ao Projetista
                                </button>
                            </div>
                            ${statusLocked ? `<div class="mt-2 text-sm text-indigo-900">${enviadoParaNome ? `Enviado para ${enviadoParaNome}${enviadoParaEmail ? ` (${enviadoParaEmail})` : ''}${enviadoEmFmt ? ` em ${enviadoEmFmt}` : ''}.` : (enviadoEmFmt ? `Enviado em ${enviadoEmFmt}.` : 'Enviado.')}</div>` : ''}
                            ${!r.id ? `<div class="mt-2 text-sm text-indigo-900">Salve o briefing para habilitar o envio ao projetista.</div>` : ''}
                        </div>
                    </div>
                </div>

                <div class="bg-white border border-gray-200 rounded-lg p-4" data-briefing-ai="1">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div class="text-sm font-semibold text-gray-800">Assistente IA</div>
                            <div class="text-xs text-gray-500">Sugere preenchimento, melhora textos e gera uma apresentação a partir do briefing.</div>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                            <button type="button" data-briefing-ai-action="suggest"
                                    class="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition">
                                <i class="fas fa-wand-magic-sparkles mr-2"></i>Sugerir
                            </button>
                            <button type="button" data-briefing-ai-action="presentation"
                                    class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                                <i class="fas fa-file-powerpoint mr-2"></i>Apresentação
                            </button>
                        </div>
                    </div>
                    <div class="mt-3 hidden" data-briefing-ai-results></div>
                </div>
                <!-- Informações do Cliente -->
                <div class="bg-gray-50 p-6 rounded-lg">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-building mr-2 text-blue-600"></i>
                        Informações do Cliente
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="md:col-span-2">
                            <label for="clienteId_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Cliente Cadastrado</label>
                            <select name="clienteId" id="clienteId_${formId}" data-initial="${r.clienteId || ''}"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">(Opcional) Selecionar cliente cadastrado</option>
                            </select>
                        </div>
                        <div>
                            <label for="empresa_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Empresa *</label>
                            <input type="text" name="empresa" id="empresa_${formId}" required value="${r.empresa || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label for="responsavel_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Responsável *</label>
                            <input type="text" name="responsavel" id="responsavel_${formId}" required value="${r.responsavel || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label for="email_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                            <input type="email" name="email" id="email_${formId}" required value="${r.email || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label for="telefone_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Telefone *</label>
                            <input type="tel" name="telefone" id="telefone_${formId}" required value="${r.telefone || ''}"
                                   data-mask="phone"
                                   data-validation="phone"
                                   placeholder="(11) 99999-9999"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                    </div>
                </div>

                <!-- Informações do Evento -->
                <div class="bg-gray-50 p-6 rounded-lg">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-calendar-alt mr-2 text-green-600"></i>
                        Informações do Evento
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="md:col-span-2">
                            <label for="eventoId_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Evento Cadastrado</label>
                            <select name="eventoId" id="eventoId_${formId}" data-initial="${r.eventoId || ''}"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">(Opcional) Selecionar evento cadastrado</option>
                            </select>
                            <div class="mt-2 flex justify-end">
                                <button type="button" data-form-action="novo-evento"
                                        class="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg">
                                    <i class="fas fa-plus mr-2"></i>Novo Evento
                                </button>
                            </div>
                        </div>
                        <div>
                            <label for="nomeEvento_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Nome do Evento *</label>
                            <input type="text" name="nomeEvento" id="nomeEvento_${formId}" required value="${r.nomeEvento || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label for="tipoEvento_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Tipo de Evento *</label>
                            <select name="tipoEvento" id="tipoEvento_${formId}" required
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">Selecione o tipo</option>
                                ${this.data.eventos.map(evento => `<option value="${evento}" ${r.tipoEvento === evento ? 'selected' : ''}>${evento}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label for="dataInicio_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Data de Início *</label>
                            <input type="date" name="dataInicio" id="dataInicio_${formId}" required value="${r.dataInicio || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label for="dataTermino_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Data de Término *</label>
                            <input type="date" name="dataTermino" id="dataTermino_${formId}" required value="${r.dataTermino || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div class="md:col-span-2">
                            <label for="localEvento_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Local do Evento *</label>
                            <input type="text" name="localEvento" id="localEvento_${formId}" required value="${r.localEvento || ''}"
                                   placeholder="Ex: Centro de Convenções Anhembi"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                    </div>
                </div>

                <!-- Especificações do Stand -->
                <div class="bg-gray-50 p-6 rounded-lg">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-cube mr-2 text-purple-600"></i>
                        Especificações do Stand
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="tipoStand_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Tipo de Stand *</label>
                            <select name="tipoStand" id="tipoStand_${formId}" required
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">Selecione o tipo</option>
                                ${this.data.tiposStand.map(tipo => `<option value="${tipo}" ${r.tipoStand === tipo ? 'selected' : ''}>${tipo}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label for="localizacaoStand_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Localização no Evento *</label>
                            <select name="localizacaoStand" id="localizacaoStand_${formId}" required
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">Selecione a localização</option>
                                ${this.data.localizacoes.map(loc => `<option value="${loc}" ${r.localizacaoStand === loc ? 'selected' : ''}>${loc}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label for="metragem_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Metragem (m²) *</label>
                            <input type="number" name="metragem" id="metragem_${formId}" required min="1" step="0.1" value="${r.metragem || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label for="numeroStand_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Número do Stand</label>
                            <input type="text" name="numeroStand" id="numeroStand_${formId}" value="${r.numeroStand || ''}"
                                   placeholder="Ex: A-123"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div class="md:col-span-2">
                            <label for="dimensoes_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Dimensões (Largura x Profundidade)</label>
                            <div class="grid grid-cols-2 gap-2">
                                <input type="number" name="largura" id="largura_${formId}" placeholder="Largura (m)" step="0.1" value="${r.largura || ''}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <input type="number" name="profundidade" id="profundidade_${formId}" placeholder="Profundidade (m)" step="0.1" value="${r.profundidade || ''}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Informações Comerciais -->
                <div class="bg-gray-50 p-6 rounded-lg">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-handshake mr-2 text-indigo-600"></i>
                        Informações Comerciais
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="tipoSolucao_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Tipo de Solução *</label>
                            <select name="tipoSolucao" id="tipoSolucao_${formId}" required
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">Selecione</option>
                                ${this.data.tiposSolucao.map(tipo => `<option value="${tipo}" ${r.tipoSolucao === tipo ? 'selected' : ''}>${tipo}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label for="segmentoPrincipal_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Segmento Principal *</label>
                            <select name="segmentoPrincipal" id="segmentoPrincipal_${formId}" required
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">Selecione o segmento</option>
                                ${this.data.segmentosVenda.map(seg => `<option value="${seg}" ${r.segmentoPrincipal === seg ? 'selected' : ''}>${seg}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label for="publicoAlvo_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Público-Alvo</label>
                            <input type="text" name="publicoAlvo" id="publicoAlvo_${formId}" value="${r.publicoAlvo || ''}"
                                   placeholder="Ex: Profissionais de TI, Empresários"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div class="md:col-span-2">
                            <div class="flex items-center justify-between gap-2 mb-2">
                                <label for="produtosServicos_${formId}" class="block text-sm font-medium text-gray-700">Produtos/Serviços a Expor</label>
                                <div class="flex items-center gap-2">
                                    <button type="button" data-briefing-ai-voice="produtosServicos"
                                            class="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                                        <i class="fas fa-microphone mr-2"></i>Voz
                                    </button>
                                    <button type="button" data-ai-rewrite="produtosServicos"
                                            class="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                                        <i class="fas fa-pen mr-2"></i>Melhorar
                                    </button>
                                </div>
                            </div>
                            <textarea name="produtosServicos" id="produtosServicos_${formId}" rows="3"
                                      placeholder="Descreva os produtos ou serviços que serão apresentados no stand"
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">${r.produtosServicos || ''}</textarea>
                        </div>
                        <div class="md:col-span-2">
                            <div class="flex items-center justify-between gap-2 mb-2">
                                <label for="objetivos_${formId}" class="block text-sm font-medium text-gray-700">Objetivos do Stand</label>
                                <div class="flex items-center gap-2">
                                    <button type="button" data-briefing-ai-voice="objetivos"
                                            class="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                                        <i class="fas fa-microphone mr-2"></i>Voz
                                    </button>
                                    <button type="button" data-ai-rewrite="objetivos"
                                            class="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                                        <i class="fas fa-pen mr-2"></i>Melhorar
                                    </button>
                                </div>
                            </div>
                            <textarea name="objetivos" id="objetivos_${formId}" rows="3"
                                      placeholder="Ex: Geração de leads, lançamento de produto, networking"
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">${r.objetivos || ''}</textarea>
                        </div>
                </div>
            </div>

                <!-- Layout e Funcionalidades -->
                <div class="bg-gray-50 p-6 rounded-lg">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-project-diagram mr-2 text-indigo-600"></i>
                        Layout e Funcionalidades
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Áreas Funcionais Obrigatórias</label>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <label class="flex items-center space-x-2"><input type="checkbox" name="areasFuncionais" value="recepcao" ${isChecked('areasFuncionais','recepcao')} class="h-4 w-4 text-blue-600 border-gray-300 rounded"><span>Área de Recepção/Atendimento</span></label>
                                <input type="text" name="recepcaoCapacidade" value="${get('recepcaoCapacidade')}" placeholder="Qtde atendimentos simultâneos?" class="px-3 py-2 border border-gray-300 rounded-lg">
                                <label class="flex items-center space-x-2"><input type="checkbox" name="areasFuncionais" value="demonstracao" ${isChecked('areasFuncionais','demonstracao')} class="h-4 w-4 text-blue-600 border-gray-300 rounded"><span>Área de Demonstração/Produto</span></label>
                                <input type="text" name="demonstracaoEspaco" value="${get('demonstracaoEspaco')}" placeholder="Tamanho do produto/espaço?" class="px-3 py-2 border border-gray-300 rounded-lg">
                                <label class="flex items-center space-x-2"><input type="checkbox" name="areasFuncionais" value="salaReuniao" ${isChecked('areasFuncionais','salaReuniao')} class="h-4 w-4 text-blue-600 border-gray-300 rounded"><span>Sala de Reunião Fechada</span></label>
                                <input type="text" name="salaReuniaoCapacidade" value="${get('salaReuniaoCapacidade')}" placeholder="Para quantas pessoas?" class="px-3 py-2 border border-gray-300 rounded-lg">
                                <label class="flex items-center space-x-2"><input type="checkbox" name="areasFuncionais" value="copaDeposito" ${isChecked('areasFuncionais','copaDeposito')} class="h-4 w-4 text-blue-600 border-gray-300 rounded"><span>Copa/Depósito</span></label>
                                <input type="text" name="volumeMaterial" value="${get('volumeMaterial')}" placeholder="Volume de material a armazenar?" class="px-3 py-2 border border-gray-300 rounded-lg">
                                <label class="flex items-center space-x-2"><input type="checkbox" name="areasFuncionais" value="lounge" ${isChecked('areasFuncionais','lounge')} class="h-4 w-4 text-blue-600 border-gray-300 rounded"><span>Espaço Lounge/Convivência</span></label>
                                <input type="text" name="loungeCapacidade" value="${get('loungeCapacidade')}" placeholder="Qtde visitantes sentados?" class="px-3 py-2 border border-gray-300 rounded-lg">
                                <label class="flex items-center space-x-2"><input type="checkbox" name="areasFuncionais" value="vendas" ${isChecked('areasFuncionais','vendas')} class="h-4 w-4 text-blue-600 border-gray-300 rounded"><span>Área de Caixa/Vendas</span></label>
                            </div>
                        </div>
                        <div>
                            <label for="exposicaoProdutos_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Necessidade de Exposição de Produtos</label>
                            <textarea name="exposicaoProdutos" id="exposicaoProdutos_${formId}" rows="3" placeholder="Quais e quantos produtos? Dimensões e peso?" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">${r.exposicaoProdutos || ''}</textarea>
                        </div>
                        <div>
                            <label for="mobilEquipamentos_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Mobiliário e Equipamentos Essenciais</label>
                            <textarea name="mobilEquipamentos" id="mobilEquipamentos_${formId}" rows="3" placeholder="Mesas, cadeiras, monitores, totens, etc." class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">${r.mobilEquipamentos || ''}</textarea>
                        </div>
                    </div>
                </div>

                <!-- Identidade Visual e Comunicação -->
                <div class="bg-gray-50 p-6 rounded-lg">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-palette mr-2 text-pink-600"></i>
                        Identidade Visual e Comunicação
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="estiloDesejado_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Estilo Desejado</label>
                            <select name="estiloDesejado" id="estiloDesejado_${formId}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">Selecione...</option>
                                <option value="moderno" ${r.estiloDesejado === 'moderno' ? 'selected' : ''}>Moderno</option>
                                <option value="rustico" ${r.estiloDesejado === 'rustico' ? 'selected' : ''}>Rústico</option>
                                <option value="minimalista" ${r.estiloDesejado === 'minimalista' ? 'selected' : ''}>Minimalista</option>
                                <option value="tecnologico" ${r.estiloDesejado === 'tecnologico' ? 'selected' : ''}>Tecnológico</option>
                                <option value="ludico" ${r.estiloDesejado === 'ludico' ? 'selected' : ''}>Lúdico</option>
                            </select>
                        </div>
                        <div>
                            <label for="paletaCores_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Paleta de Cores</label>
                            <input type="text" name="paletaCores" id="paletaCores_${formId}" placeholder="Seguir manual de marca? Cor destaque?" value="${r.paletaCores || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Uso de Materiais Especiais</label>
                            <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                                <label class="flex items-center space-x-2"><input type="checkbox" name="materiaisEspeciais" value="madeira" ${isChecked('materiaisEspeciais','madeira')} class="h-4 w-4 text-blue-600 border-gray-300 rounded"><span>Madeira</span></label>
                                <label class="flex items-center space-x-2"><input type="checkbox" name="materiaisEspeciais" value="metal" ${isChecked('materiaisEspeciais','metal')} class="h-4 w-4 text-blue-600 border-gray-300 rounded"><span>Metal</span></label>
                                <label class="flex items-center space-x-2"><input type="checkbox" name="materiaisEspeciais" value="acrilico" ${isChecked('materiaisEspeciais','acrilico')} class="h-4 w-4 text-blue-600 border-gray-300 rounded"><span>Acrílico</span></label>
                                <label class="flex items-center space-x-2"><input type="checkbox" name="materiaisEspeciais" value="led" ${isChecked('materiaisEspeciais','led')} class="h-4 w-4 text-blue-600 border-gray-300 rounded"><span>LED</span></label>
                                <label class="flex items-center space-x-2"><input type="checkbox" name="materiaisEspeciais" value="vidro" ${isChecked('materiaisEspeciais','vidro')} class="h-4 w-4 text-blue-600 border-gray-300 rounded"><span>Vidro</span></label>
                                <label class="flex items-center space-x-2"><input type="checkbox" name="materiaisEspeciais" value="outros" ${isChecked('materiaisEspeciais','outros')} class="h-4 w-4 text-blue-600 border-gray-300 rounded"><span>Outros</span></label>
                            </div>
                        </div>
                        <div>
                            <label for="impactoVisual_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Necessidade de Impacto Visual</label>
                            <textarea name="impactoVisual" id="impactoVisual_${formId}" rows="3" placeholder="Altura, iluminação diferenciada, etc." class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">${get('impactoVisual')}</textarea>
                        </div>
                        <div>
                            <label for="arquivosMarca_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Arquivos de Marca</label>
                            <input type="file" name="arquivosMarca" id="arquivosMarca_${formId}" multiple class="w-full">
                        </div>
                    </div>
                </div>

                <!-- Infraestrutura -->
                <div class="bg-gray-50 p-6 rounded-lg">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-tools mr-2 text-red-600"></i>
                        Infraestrutura Necessária
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="energiaEletrica_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Energia Elétrica</label>
                            <select name="energiaEletrica" id="energiaEletrica_${formId}"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="" ${isSelected('energiaEletrica','')}>Não necessário</option>
                                <option value="110V" ${isSelected('energiaEletrica','110V')}>110V</option>
                                <option value="220V" ${isSelected('energiaEletrica','220V')}>220V</option>
                                <option value="Trifásico" ${isSelected('energiaEletrica','Trifásico')}>Trifásico</option>
                                <option value="Especial" ${isSelected('energiaEletrica','Especial')}>Especial (descrever nas observações)</option>
                            </select>
                        </div>
                        <div>
                            <label for="internet_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Internet/Wi-Fi</label>
                            <select name="internet" id="internet_${formId}"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="" ${isSelected('internet','')}>Não necessário</option>
                                <option value="Wi-Fi básico" ${isSelected('internet','Wi-Fi básico')}>Wi-Fi básico</option>
                                <option value="Internet dedicada" ${isSelected('internet','Internet dedicada')}>Internet dedicada</option>
                                <option value="Alta velocidade" ${isSelected('internet','Alta velocidade')}>Alta velocidade</option>
                            </select>
                        </div>
                        <div>
                            <label for="aguaEsgoto_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Água/Esgoto</label>
                            <select name="aguaEsgoto" id="aguaEsgoto_${formId}"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="" ${isSelected('aguaEsgoto','')}>Não necessário</option>
                                <option value="Água fria" ${isSelected('aguaEsgoto','Água fria')}>Água fria</option>
                                <option value="Água quente" ${isSelected('aguaEsgoto','Água quente')}>Água quente</option>
                                <option value="Esgoto" ${isSelected('aguaEsgoto','Esgoto')}>Esgoto</option>
                            </select>
                        </div>
                        <div>
                            <label for="arCondicionado_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Ar Condicionado</label>
                            <select name="arCondicionado" id="arCondicionado_${formId}"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="" ${isSelected('arCondicionado','')}>Não necessário</option>
                                <option value="Básico" ${isSelected('arCondicionado','Básico')}>Básico</option>
                                <option value="Reforçado" ${isSelected('arCondicionado','Reforçado')}>Reforçado</option>
                                <option value="Especial" ${isSelected('arCondicionado','Especial')}>Especial</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Elementos Especiais -->
                <div class="bg-gray-50 p-6 rounded-lg">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-magic mr-2 text-indigo-600"></i>
                        Elementos Especiais
                    </h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-3">Elementos desejados (marque todos que se aplicam):</label>
                            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                                ${this.generateCheckboxOptions([
                                    'Balcão de atendimento',
                                    'Área de reunião',
                                    'Espaço para demonstração',
                                    'Área de descanso',
                                    'Estoque/depósito',
                                    'Cozinha/copa',
                                    'Banheiro privativo',
                                    'Área VIP',
                                    'Palco/apresentação',
                                    'Telão/projeção',
                                    'Sistema de som',
                                    'Iluminação especial'
                                ], list('elementos'))}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Orçamento e Prazo -->
                <div class="bg-gray-50 p-6 rounded-lg">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-calculator mr-2 text-yellow-600"></i>
                        Orçamento e Prazo
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="orcamentoEstimado_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Orçamento Estimado</label>
                            <input type="text" name="orcamentoEstimado" id="orcamentoEstimado_${formId}"
                                   value="${get('orcamentoEstimado')}"
                                   placeholder="Ex: R$ 50.000,00"
                                   data-mask="currency"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label for="prazoAprovacao_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Prazo Limite para Aprovação</label>
                            <input type="date" name="prazoAprovacao" id="prazoAprovacao_${formId}"
                                   value="${get('prazoAprovacao')}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label for="prazoEntrega_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Prazo de Entrega</label>
                            <input type="date" name="prazoEntrega" id="prazoEntrega_${formId}"
                                   value="${get('prazoEntrega')}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div class="md:col-span-2">
                            <div class="flex items-center justify-between gap-2 mb-2">
                                <label for="observacoes_${formId}" class="block text-sm font-medium text-gray-700">Observações Especiais</label>
                                <div class="flex items-center gap-2">
                                    <button type="button" data-briefing-ai-voice="observacoes"
                                            class="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                                        <i class="fas fa-microphone mr-2"></i>Voz
                                    </button>
                                    <button type="button" data-ai-rewrite="observacoes"
                                            class="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                                        <i class="fas fa-pen mr-2"></i>Melhorar
                                    </button>
                                </div>
                            </div>
                            <textarea name="observacoes" id="observacoes_${formId}" rows="4"
                                      placeholder="Informações adicionais, requisitos especiais, restrições, etc."
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">${get('observacoes')}</textarea>
                        </div>
                    </div>
                </div>

                <!-- Considerações Adicionais -->
                <div class="bg-gray-50 p-6 rounded-lg">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-lightbulb mr-2 text-amber-600"></i>
                        Considerações Adicionais
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="standsReferencia_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Stands de Sucesso (Referência)</label>
                            <textarea name="standsReferencia" id="standsReferencia_${formId}" rows="3" placeholder="Fotos/exemplos e por quê" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">${get('standsReferencia')}</textarea>
                        </div>
                        <div>
                            <label for="concorrencia_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Stands da Concorrência</label>
                            <textarea name="concorrencia" id="concorrencia_${formId}" rows="3" placeholder="O que evitar ou superar" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">${get('concorrencia')}</textarea>
                        </div>
                        <div>
                            <label for="restricoesEvento_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Restrições do Evento</label>
                            <textarea name="restricoesEvento" id="restricoesEvento_${formId}" rows="3" placeholder="Regras específicas do pavilhão" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">${get('restricoesEvento')}</textarea>
                        </div>
                        <div>
                            <label for="outrasInformacoes_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Outras Informações Cruciais</label>
                            <textarea name="outrasInformacoes" id="outrasInformacoes_${formId}" rows="3" placeholder="Algo importante não perguntado" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">${get('outrasInformacoes')}</textarea>
                        </div>
                    </div>
                </div>
            </form>
        `;
    },

    bindFormAutoFill(rootElement) {
        const root = rootElement || document.getElementById('briefing-content') || document.getElementById('modal-content') || document;

        const clienteSelect = root.querySelector('select[name="clienteId"]');
        const eventoSelect = root.querySelector('select[name="eventoId"]');
        const novoEventoBtn = root.querySelector('[data-form-action="novo-evento"]');

        const getEventos = () => {
            const eventos = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.eventos)) ? ModuleSystem.data.eventos : [];
            return eventos;
        };

        const ensureEventoOptions = () => {
            if (!eventoSelect) return;
            const eventos = getEventos();
            const token = `len:${eventos.length}`;
            if (eventoSelect.getAttribute('data-populated') === token) return;
            const previous = eventoSelect.value;
            const initial = eventoSelect.getAttribute('data-initial') || '';
            const opts = [`<option value="">(Opcional) Selecionar evento cadastrado</option>`]
                .concat(eventos.length ? eventos.map(e => `<option value="${e.id}">${e.nome}</option>`) : [`<option value="" disabled>Nenhum evento cadastrado</option>`]);
            eventoSelect.innerHTML = opts.join('');
            if (previous) {
                eventoSelect.value = previous;
            } else if (initial) {
                eventoSelect.value = initial;
            }
            eventoSelect.setAttribute('data-populated', token);
        };

        const getClientes = () => {
            const clientes = (window.ModuleSystem && ModuleSystem.data && Array.isArray(ModuleSystem.data.clientes)) ? ModuleSystem.data.clientes : [];
            return clientes;
        };

        const ensureClienteOptions = () => {
            if (!clienteSelect) return;
            const clientes = getClientes();
            const token = `len:${clientes.length}`;
            if (clienteSelect.getAttribute('data-populated') === token) return;
            const previous = clienteSelect.value;
            const initial = clienteSelect.getAttribute('data-initial') || '';
            const opts = [`<option value="">(Opcional) Selecionar cliente cadastrado</option>`]
                .concat(clientes.map(c => `<option value="${c.id}">${c.nome}</option>`));
            clienteSelect.innerHTML = opts.join('');
            if (previous) {
                clienteSelect.value = previous;
            } else if (initial) {
                clienteSelect.value = initial;
            }
            clienteSelect.setAttribute('data-populated', token);
        };

        ensureEventoOptions();
        ensureClienteOptions();

        const projetistaSelect = root.querySelector('select[name="enviado_para_id"]');
        const enviarProjetistaBtn = root.querySelector('[data-briefing-action="enviar-projetista"]');

        const notifyError = (msg) => {
            try {
                if (window.NotificationSystem && typeof window.NotificationSystem.error === 'function') return window.NotificationSystem.error(msg);
                if (window.Utils && Utils.notifications && typeof Utils.notifications.error === 'function') return Utils.notifications.error(msg);
            } catch {}
            try { alert(msg); } catch {}
        };

        const notifySuccess = (msg) => {
            try {
                if (window.NotificationSystem && typeof window.NotificationSystem.success === 'function') return window.NotificationSystem.success(msg);
                if (window.Utils && Utils.notifications && typeof Utils.notifications.success === 'function') return Utils.notifications.success(msg);
            } catch {}
            try { alert(msg); } catch {}
        };

        const loadUsers = async () => {
            if (!projetistaSelect) return;
            const cached = (() => {
                try { return window.__samsUsersCache || null; } catch { return null; }
            })();
            const now = Date.now();
            if (cached && Array.isArray(cached.users) && cached.at && (now - cached.at) < 2 * 60 * 1000) {
                return cached.users;
            }
            const resp = await fetch('/api/crm/users', { credentials: 'include' });
            const users = await resp.json().catch(() => []);
            const list = Array.isArray(users) ? users : [];
            try { window.__samsUsersCache = { at: now, users: list }; } catch {}
            return list;
        };

        const ensureProjetistaOptions = async () => {
            if (!projetistaSelect) return;
            const token = projetistaSelect.getAttribute('data-users-populated');
            if (token === '1') return;
            const previous = projetistaSelect.value;
            const initial = projetistaSelect.getAttribute('data-initial') || '';
            let users = [];
            try { users = await loadUsers(); } catch { users = []; }
            const opts = [`<option value="">Selecionar usuário</option>`]
                .concat(users.length ? users.map(u => `<option value="${u.id}">${u.name}${u.email ? ` (${u.email})` : ''}</option>`) : [`<option value="" disabled>Nenhum usuário disponível</option>`]);
            projetistaSelect.innerHTML = opts.join('');
            if (previous) {
                projetistaSelect.value = previous;
            } else if (initial) {
                projetistaSelect.value = String(initial);
            }
            projetistaSelect.setAttribute('data-users-populated', '1');
        };

        ensureProjetistaOptions();

        if (enviarProjetistaBtn && !enviarProjetistaBtn.getAttribute('data-bound')) {
            enviarProjetistaBtn.setAttribute('data-bound', '1');
            enviarProjetistaBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const form = root.querySelector('form#briefing-form');
                const idEl = form ? form.querySelector('input[name="id"]') : null;
                const briefingId = idEl && idEl.value ? String(idEl.value).trim() : '';
                if (!briefingId) return notifyError('Salve o briefing antes de enviar ao projetista.');
                if (!projetistaSelect) return notifyError('Seleção de projetista não encontrada no formulário.');
                const destinatarioId = projetistaSelect.value ? String(projetistaSelect.value).trim() : '';
                if (!destinatarioId) return notifyError('Selecione o projetista/arquiteto antes de enviar.');
                const destinatarioNome = (() => {
                    try {
                        const opt = projetistaSelect.options[projetistaSelect.selectedIndex];
                        return opt ? String(opt.textContent || '').trim() : '';
                    } catch { return ''; }
                })();
                const msg = `Enviar o briefing #${briefingId}${destinatarioNome ? ` para ${destinatarioNome}` : ''}? Após enviar, o briefing ficará bloqueado para edição.`;
                try { if (!confirm(msg)) return; } catch {}

                const prevDisabled = enviarProjetistaBtn.disabled;
                enviarProjetistaBtn.disabled = true;
                try {
                    const resp = await fetch(`/api/crm/briefings/${encodeURIComponent(briefingId)}/enviar-projetista`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ enviado_para_id: destinatarioId })
                    });
                    const payload = await resp.json().catch(() => ({}));
                    if (!resp.ok) {
                        return notifyError(payload && payload.error ? payload.error : 'Falha ao enviar briefing ao projetista.');
                    }
                    const projetoId = payload && (payload.projetoId != null ? payload.projetoId : (payload.projeto_id != null ? payload.projeto_id : null));
                    notifySuccess(projetoId ? `Briefing enviado ao projetista. Projeto #${projetoId} criado.` : 'Briefing enviado ao projetista.');
                    try {
                        const closeBtn = document.getElementById('modal-close');
                        if (closeBtn) closeBtn.click();
                    } catch {}
                    try {
                        if (window.ComercialModule && typeof ComercialModule.loadBriefings === 'function') {
                            await ComercialModule.loadBriefings();
                        }
                    } catch {}
                } catch (err) {
                    console.warn('[BriefingSystem] Falha ao enviar ao projetista:', err);
                    notifyError('Falha ao enviar briefing ao projetista.');
                } finally {
                    enviarProjetistaBtn.disabled = prevDisabled;
                }
            });
        }

        if (eventoSelect && !eventoSelect.getAttribute('data-autofill-bound')) {
            eventoSelect.setAttribute('data-autofill-bound', '1');
            eventoSelect.addEventListener('change', () => {
                const selectedId = eventoSelect.value;
                if (!selectedId) return;
                const eventos = getEventos();
                const ev = eventos.find(e => String(e.id) === String(selectedId));
                if (!ev) return;

                const nomeEvento = root.querySelector('input[name="nomeEvento"]');
                const localEvento = root.querySelector('input[name="localEvento"]');
                const dataInicio = root.querySelector('input[name="dataInicio"]');
                const dataTermino = root.querySelector('input[name="dataTermino"]');
                const tipoEvento = root.querySelector('select[name="tipoEvento"]');

                const evNome = ev.nome || '';
                const evLocal = ev.local || ev.endereco || '';
                const evInicio = ev.dataInicio || ev.data_inicio || '';
                const evFim = ev.dataFim || ev.data_fim || '';
                const evTipo = ev.tipoEvento || ev.tipo_evento || ev.tipo || '';

                if (nomeEvento) nomeEvento.value = evNome;
                if (localEvento) localEvento.value = evLocal;
                if (dataInicio) dataInicio.value = String(evInicio).slice(0, 10);
                if (dataTermino) dataTermino.value = String(evFim).slice(0, 10);
                if (tipoEvento && evTipo) {
                    const v = String(evTipo);
                    const has = [...tipoEvento.options].some(o => String(o.value) === v);
                    if (has) tipoEvento.value = v;
                }
            });
        }

        if (novoEventoBtn && !novoEventoBtn.getAttribute('data-bound')) {
            novoEventoBtn.setAttribute('data-bound', '1');
            novoEventoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const form = root.querySelector('form#briefing-form');
                const draft = {};
                try {
                    if (form) {
                        const fd = new FormData(form);
                        for (const [k, v] of fd.entries()) {
                            if (draft[k] == null) draft[k] = v;
                        }
                    }
                } catch {}

                try {
                    window.__samsReturnToBriefingAfterEvent = { draft };
                } catch {}

                if (window.FormSystem && typeof FormSystem.showCreateForm === 'function') {
                    FormSystem.showCreateForm('eventos');
                    setTimeout(() => {
                        const clear = () => {
                            try { window.__samsReturnToBriefingAfterEvent = null; } catch {}
                        };
                        ['modal-cancel','modal-close','modal-dashboard'].forEach(id => {
                            const el = document.getElementById(id);
                            if (el) el.addEventListener('click', clear, { once: true });
                        });
                    }, 50);
                } else if (window.ModuleSystem && typeof ModuleSystem.showCreateForm === 'function') {
                    ModuleSystem.showCreateForm('eventos');
                }
            });
        }

        if (clienteSelect && !clienteSelect.getAttribute('data-autofill-bound')) {
            clienteSelect.setAttribute('data-autofill-bound', '1');
            clienteSelect.addEventListener('change', () => {
                const selectedId = clienteSelect.value;
                if (!selectedId) return;
                const clientes = getClientes();
                const cli = clientes.find(c => String(c.id) === String(selectedId));
                if (!cli) return;

                const empresaInput = root.querySelector('input[name="empresa"]');
                const responsavelInput = root.querySelector('input[name="responsavel"]');
                const emailInput = root.querySelector('input[name="email"]');
                const telefoneInput = root.querySelector('input[name="telefone"]');
                if (empresaInput && !empresaInput.value) empresaInput.value = cli.nome || '';
                if (responsavelInput && !responsavelInput.value && cli.responsavel) responsavelInput.value = cli.responsavel;
                if (emailInput && !emailInput.value) emailInput.value = cli.email || '';
                if (telefoneInput && !telefoneInput.value) telefoneInput.value = cli.telefone || '';
            });
        }

        const maxTries = 5;
        const tryFill = (n) => {
            ensureEventoOptions();
            ensureClienteOptions();
            if (n >= maxTries) return;
            const eventosEmpty = !!eventoSelect && eventoSelect.options.length <= 1 && getEventos().length === 0;
            const clientesEmpty = !!clienteSelect && clienteSelect.options.length <= 1 && getClientes().length === 0;
            if (eventosEmpty || clientesEmpty) {
                setTimeout(() => tryFill(n + 1), 150 * (n + 1));
            }
        };
        tryFill(0);
    },

    bindBriefingAI(rootElement) {
        const root = rootElement || document.getElementById('briefing-content') || document;
        const form = root.querySelector('form#briefing-form');
        if (!form) return;
        const wrap = root.querySelector('[data-briefing-ai="1"]');
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

        const resultsEl = wrap.querySelector('[data-briefing-ai-results]');
        const btnSuggest = wrap.querySelector('[data-briefing-ai-action="suggest"]');
        const btnPresentation = wrap.querySelector('[data-briefing-ai-action="presentation"]');
        const voiceBtns = Array.from(form.querySelectorAll('[data-briefing-ai-voice]'));
        const rewriteBtns = Array.from(form.querySelectorAll('[data-ai-rewrite]'));

        const escapeHtml = (value) => String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');

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
            try { [btnSuggest, btnPresentation].filter(Boolean).forEach((b) => { b.disabled = !!busy; }); } catch {}
        };

        const collectFormData = () => {
            const fd = new FormData(form);
            const out = {};
            for (const [k, v] of fd.entries()) {
                const key = String(k || '');
                const val = (typeof v === 'string') ? v.trim() : v;
                if (val == null || val === '') continue;
                if (out[key] === undefined) out[key] = val;
                else if (Array.isArray(out[key])) out[key].push(val);
                else out[key] = [out[key], val];
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
                            ${summary ? `<div class="text-xs text-gray-600 mt-1">${escapeHtml(summary)}</div>` : ''}
                        </div>
                        <div class="flex flex-wrap items-center gap-2 shrink-0">
                            <button type="button" data-briefing-ai-apply="autofill"
                                    class="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition text-sm">
                                Aplicar preenchimento
                            </button>
                            <button type="button" data-briefing-ai-apply="content"
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
                                        <span class="px-2 py-0.5 text-xs font-semibold rounded-full border ${badge(v.severity)}">${escapeHtml(v.severity || 'info')}</span>
                                        <div class="text-xs text-gray-700">
                                            <span class="font-semibold">${escapeHtml(v.field || '')}:</span>
                                            ${escapeHtml(v.message || '')}
                                            ${v.suggestion ? `<div class="text-gray-500 mt-0.5">${escapeHtml(v.suggestion)}</div>` : ''}
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
                                        <span class="font-semibold">${escapeHtml(s.field || '')}:</span>
                                        <span class="text-gray-600">${escapeHtml((s.suggestion || '').slice(0, 280))}${(s.suggestion || '').length > 280 ? '…' : ''}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;

            setResultsHtml(html);
            try {
                const applyAutofillBtn = wrap.querySelector('[data-briefing-ai-apply="autofill"]');
                const applyContentBtn = wrap.querySelector('[data-briefing-ai-apply="content"]');
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
                const resp = await apiPost('/api/crm/ai/form-assist', { formType: 'briefing', data });
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
            this.trackUiEvent('voice_start', 'briefings', { field: fieldName, mode: 'server' });
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
                    this.trackUiEvent('voice_done', 'briefings', { field: fieldName, mode: 'server', chars: String(text || '').length });
                    notify('Voz finalizada.', 'success');
                } catch (e) {
                    this.trackUiEvent('voice_error', 'briefings', { field: fieldName, mode: 'server' });
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
                    this.trackUiEvent('voice_start', 'briefings', { field: fieldName, mode: 'browser' });
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
                    rec.onerror = () => { this.trackUiEvent('voice_error', 'briefings', { field: fieldName, mode: 'browser' }); notify('Falha no reconhecimento de voz.', 'error'); };
                    rec.onend = () => { this.trackUiEvent('voice_done', 'briefings', { field: fieldName, mode: 'browser' }); notify('Voz finalizada.', 'success'); };
                    rec.start();
                    notify('Ouvindo...', 'info');
                    return;
                } catch {
                    this.trackUiEvent('voice_error', 'briefings', { field: fieldName, mode: 'browser' });
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
                const resp = await apiPost('/api/crm/ai/rewrite', { text, instruction: 'Reescreva para briefing: mais claro, estruturado e objetivo, mantendo o sentido.', tone: 'profissional' });
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
                        const line = `Sentimento (observações): <span class="font-semibold">${escapeHtml(sentiment)}</span>${confidence != null ? ` (${Math.round(confidence * 100)}%)` : ''}`;
                        const html = `<div data-briefing-ai-sentiment="1" class="mt-2 text-xs text-gray-600">${line}</div>`;
                        if (resultsEl) {
                            const existing = resultsEl.querySelector('[data-briefing-ai-sentiment="1"]');
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

        voiceBtns.forEach((b) => {
            if (!b || b.getAttribute('data-bound')) return;
            b.setAttribute('data-bound', '1');
            b.addEventListener('click', () => {
                const field = b.getAttribute('data-briefing-ai-voice') || '';
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

    buildChecklistTemplate(contextText) {
        const key = String(contextText || '').trim().toLowerCase();
        const base = [
            { fase: 'Comercial', item: 'Validar medidas e localização do estande' },
            { fase: 'Comercial', item: 'Confirmar regras e prazos do pavilhão' },
            { fase: 'Comercial', item: 'Mapear necessidades de elétrica/hidráulica/limpeza' },
            { fase: 'Projetos 3D', item: 'Definir conceito e referências do estande' },
            { fase: 'Projetos 3D', item: 'Gerar layout 3D inicial (V1)' },
            { fase: 'Projetos 3D', item: 'Rodada de aprovação com o cliente' },
            { fase: 'Projetos', item: 'Gerar lista de materiais e acabamentos' },
            { fase: 'Projetos', item: 'Planejar pontos elétricos e iluminação' },
            { fase: 'Montagem', item: 'Agendar carga/descarga e credenciamento' },
            { fase: 'Montagem', item: 'Conferir itens no almoxarifado e transporte' },
            { fase: 'Montagem', item: 'Registrar fotos da montagem (antes/durante/depois)' },
            { fase: 'Pós-evento', item: 'Registrar fotos da desmontagem e devolução' },
            { fase: 'Pós-evento', item: 'Conferir avarias e pendências financeiras' }
        ];

        if (key.includes('modular')) {
            return [
                ...base,
                { fase: 'Projetos', item: 'Selecionar kit modular e complementos' },
                { fase: 'Montagem', item: 'Conferir peças modulares e conexões' }
            ];
        }
        if (key.includes('locação') || key.includes('locacao')) {
            return [
                ...base,
                { fase: 'Comercial', item: 'Listar itens de locação e quantidades' },
                { fase: 'Montagem', item: 'Testar equipamentos locados antes do evento' }
            ];
        }
        if (key.includes('cenografia')) {
            return [
                ...base,
                { fase: 'Projetos', item: 'Validar acabamentos especiais e pintura' },
                { fase: 'Montagem', item: 'Separar ferragens e fixações específicas' }
            ];
        }
        if (key.includes('híbrido') || key.includes('hibrido')) {
            return [
                ...base,
                { fase: 'Projetos', item: 'Definir partes modulares vs. personalizadas' },
                { fase: 'Montagem', item: 'Separar equipe para montagem híbrida' }
            ];
        }
        return base;
    },

    computeOrcamentoSugerido(data) {
        const metragem = Number(String(data.metragem || '').replace(',', '.'));
        if (!isFinite(metragem) || metragem <= 0) return null;
        const tipo = String(data.tipoSolucao || '').toLowerCase();

        const basePorM2 = (() => {
            if (tipo.includes('personalizado')) return 2500;
            if (tipo.includes('híbrido') || tipo.includes('hibrido')) return 2200;
            if (tipo.includes('cenografia')) return 2600;
            if (tipo.includes('modular')) return 1800;
            if (tipo.includes('locação') || tipo.includes('locacao')) return 1400;
            return 2000;
        })();

        const tipoStand = String(data.tipoStand || '').toLowerCase();
        const fatorStand = (() => {
            if (tipoStand.includes('ilha')) return 1.1;
            if (tipoStand.includes('canto')) return 1.05;
            return 1.0;
        })();

        const bruto = metragem * basePorM2 * fatorStand;
        const min = 15000;
        return Math.round(Math.max(min, bruto));
    },

    ensureKanbanBoard() {
        if (!window.ModuleSystem || !ModuleSystem.data) return null;
        if (!ModuleSystem.data.kanban) {
            ModuleSystem.data.kanban = { boards: [], tasks: [] };
        }
        if (!Array.isArray(ModuleSystem.data.kanban.boards)) ModuleSystem.data.kanban.boards = [];
        if (!Array.isArray(ModuleSystem.data.kanban.tasks)) ModuleSystem.data.kanban.tasks = [];

        let board = ModuleSystem.data.kanban.boards.find(b => b && b.ativo);
        if (!board) {
            board = {
                id: Utils.generateId(),
                nome: 'Projetos SAMS',
                descricao: 'Gestão de tarefas dos projetos',
                dataCriacao: new Date().toISOString(),
                ativo: true
            };
            ModuleSystem.data.kanban.boards.push(board);
        }
        return board;
    },

    createPipelineTasks(briefingId, data) {
        const board = this.ensureKanbanBoard();
        if (!board) return;

        const now = new Date();
        const startDate = (() => {
            try {
                if (!data.dataInicio) return null;
                const d = new Date(data.dataInicio);
                return isNaN(d.getTime()) ? null : d;
            } catch {
                return null;
            }
        })();

        const daysBefore = (d) => {
            if (!startDate) return '';
            const dt = new Date(startDate.getTime() - d * 24 * 60 * 60 * 1000);
            return dt.toISOString().split('T')[0];
        };

        const baseTags = ['briefing', '3d', `briefing:${briefingId}`].filter(Boolean);
        const empresaTag = data.empresa ? [`cliente:${String(data.empresa).toLowerCase().replace(/\s+/g, '-')}`] : [];

        const tasks = [
            {
                titulo: `Revisar orçamento - ${data.empresa || 'Cliente'} (#${briefingId})`,
                descricao: `Tipo de solução: ${data.tipoSolucao || '—'} | Metragem: ${data.metragem || '—'}m²`,
                status: 'review',
                prioridade: 'alta',
                responsavel: '',
                dataVencimento: daysBefore(45),
                tags: ['comercial', 'orçamento', ...baseTags, ...empresaTag]
            },
            {
                titulo: `Conceito 3D (V1) - ${data.empresa || 'Cliente'} (#${briefingId})`,
                descricao: `Gerar layout 3D inicial e proposta visual para aprovação.`,
                status: 'todo',
                prioridade: 'alta',
                responsavel: '',
                dataVencimento: daysBefore(35),
                tags: ['projetos', '3d', ...baseTags, ...empresaTag]
            },
            {
                titulo: `Aprovação do cliente (3D/Arte) - ${data.empresa || 'Cliente'} (#${briefingId})`,
                descricao: `Consolidar feedback e aprovar versão final.`,
                status: 'todo',
                prioridade: 'media',
                responsavel: '',
                dataVencimento: daysBefore(25),
                tags: ['aprovação', 'cliente', ...baseTags, ...empresaTag]
            },
            {
                titulo: `Detalhamento executivo - ${data.empresa || 'Cliente'} (#${briefingId})`,
                descricao: `Detalhar medidas, materiais, elétrica/iluminação e lista de produção.`,
                status: 'backlog',
                prioridade: 'media',
                responsavel: '',
                dataVencimento: daysBefore(18),
                tags: ['projetos', 'execução', ...baseTags, ...empresaTag]
            },
            {
                titulo: `Checklist de montagem - ${data.empresa || 'Cliente'} (#${briefingId})`,
                descricao: `Garantir execução com conferência e fotos.`,
                status: 'backlog',
                prioridade: 'critica',
                responsavel: '',
                dataVencimento: daysBefore(5),
                tags: ['montagem', 'checklist', ...baseTags, ...empresaTag]
            }
        ];

        for (const t of tasks) {
            const task = {
                id: Utils.generateId(),
                boardId: board.id,
                titulo: t.titulo,
                descricao: t.descricao,
                status: t.status,
                prioridade: t.prioridade,
                responsavel: t.responsavel,
                dataVencimento: t.dataVencimento,
                tags: t.tags,
                dataCriacao: now.toISOString(),
                dataAtualizacao: now.toISOString()
            };
            ModuleSystem.data.kanban.tasks.push(task);
        }
        ModuleSystem.saveData();
    },

    // Gerar opções de checkbox (IDs únicos, opcionalmente com prefixo)
    generateCheckboxOptions(options, selectedValues, idPrefix = 'elemento') {
        let prefix = idPrefix;
        let selected = [];
        if (arguments.length === 2 && typeof selectedValues === 'string') {
            prefix = selectedValues;
            selected = [];
        } else {
            prefix = idPrefix;
            if (Array.isArray(selectedValues)) {
                selected = selectedValues.map((x) => String(x));
            } else if (selectedValues != null && selectedValues !== '') {
                selected = [String(selectedValues)];
            }
        }
        return options.map((option, index) => {
            const uniqueId = `${prefix}_${index}`;
            const isOn = selected.includes(String(option)) ? 'checked' : '';
            return `
            <div class="flex items-center">
                <input type="checkbox" name="elementos" value="${option}" id="${uniqueId}" ${isOn}
                       class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                <label for="${uniqueId}" class="ml-2 text-sm text-gray-700">${option}</label>
            </div>
        `}).join('');
    },

    // Salvar briefing
    async saveBriefing() {
        const form = document.getElementById('briefing-form');
        if (!form) return;

        // Validar campos obrigatórios via HTML5 (se disponível)
        if (typeof form.reportValidity === 'function' && !form.reportValidity()) {
            return;
        }

        const formData = new FormData(form);
        const data = {};

        // Helper: parse moeda BR (R$ 1.234,56) para número
        const parseCurrencyBR = (str) => {
            if (typeof str !== 'string') return 0;
            const cleaned = str.replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(/,(\d{2})$/, '.$1');
            const num = Number(cleaned);
            return isNaN(num) ? 0 : num;
        };

        // Converter FormData para objeto (suportando campos múltiplos)
        for (let [key, value] of formData.entries()) {
            if (data[key] !== undefined) {
                if (!Array.isArray(data[key])) data[key] = [data[key]];
                data[key].push(value);
            } else {
                data[key] = value;
            }
        }

        ['areasFuncionais', 'materiaisEspeciais', 'elementos'].forEach((k) => {
            if (data[k] === undefined) {
                data[k] = [];
            } else if (!Array.isArray(data[k])) {
                data[k] = [data[k]];
            }
        });

        // Normalizar numéricos
        ['metragem', 'largura', 'profundidade'].forEach((k) => {
            if (data[k] !== undefined && data[k] !== '') {
                data[k] = parseFloat(String(data[k]).replace(',', '.'));
            }
        });

        // Normalizar orçamento e sugestão automática
        if (data.orcamentoEstimado) {
            const v = parseCurrencyBR(String(data.orcamentoEstimado));
            data.orcamentoEstimado = v > 0 ? v : null;
            data.orcamento = data.orcamentoEstimado || 0;
        } else {
            const sugerido = this.computeOrcamentoSugerido(data);
            if (sugerido != null) {
                data.orcamentoSugerido = sugerido;
                data.orcamento = sugerido;
            }
        }

        // Validar campos obrigatórios
        const requiredFields = ['empresa', 'responsavel', 'email', 'telefone', 'nomeEvento', 'tipoEvento', 'dataInicio', 'dataTermino', 'localEvento', 'tipoStand', 'localizacaoStand', 'metragem', 'segmentoPrincipal'];
        
        for (let field of requiredFields) {
            if (!data[field]) {
                Utils.notifications.error(`O campo ${field} é obrigatório.`);
                return;
            }
        }

        // Checklist local (offline) e metadados
        data.dataCriacao = new Date().toISOString();
        data.status = data.status || 'Em Análise';
        data._checklistLocal = this.buildChecklistTemplate(data.tipoSolucao || data.tipoStand).map((it, idx) => ({
            id: Utils.generateId(),
            fase: it.fase,
            item: it.item,
            done: false,
            ordem: idx
        }));

        try {
            const idField = form.querySelector('input[name="id"]');
            const existingId = idField && idField.value ? String(idField.value).trim() : '';
            let resultId = null;
            if (existingId) {
                if (window.FormSystem && typeof FormSystem.updateItem === 'function') {
                    await FormSystem.updateItem('briefings', existingId, data);
                    resultId = existingId;
                    this.closeModal();
                } else if (window.ModuleSystem && typeof ModuleSystem.updateItem === 'function') {
                    ModuleSystem.updateItem('briefings', existingId, { ...data });
                    resultId = existingId;
                    this.closeModal();
                }
            } else {
                if (window.FormSystem && typeof FormSystem.createItem === 'function') {
                    resultId = await FormSystem.createItem('briefings', data);
                    this.closeModal();
                } else if (window.ModuleSystem && typeof ModuleSystem.addItem === 'function') {
                    resultId = ModuleSystem.addItem('briefings', { ...data });
                    this.closeModal();
                }
            }

            if (resultId != null && !existingId) {
                let enabled = false;
                try {
                    const raw = window.localStorage ? window.localStorage.getItem('briefing_auto_pipeline_tasks') : '';
                    enabled = raw === '1' || raw === 'true';
                } catch {}
                if (enabled) {
                    this.createPipelineTasks(resultId, data);
                }
            }

            try {
                const oppId = data.oportunidade_id ?? data.oportunidadeId ?? data.oportunidade;
                const oppIdStr = oppId != null ? String(oppId).trim() : '';
                if (oppIdStr) {
                    const iframe = document.querySelector('iframe[src^="/pipeline.html"]');
                    if (iframe && iframe.contentWindow) {
                        iframe.contentWindow.postMessage({ type: 'SAMS_PIPELINE_REFRESH' }, window.location.origin);
                    }
                }
            } catch {}

            try { this.storeSmartDefaults(form); } catch {}
            this.trackUiEvent('form_save', 'briefings', { action: existingId ? 'update' : 'create', ok: true });

            if (window.Utils && Utils.notifications && typeof Utils.notifications.success === 'function') {
                Utils.notifications.success('Briefing salvo com sucesso!');
            }
        } catch (error) {
            this.trackUiEvent('form_save', 'briefings', { action: 'unknown', ok: false });
            if (window.Utils && Utils.notifications && typeof Utils.notifications.error === 'function') {
                Utils.notifications.error('Erro ao salvar briefing: ' + (error && error.message ? error.message : String(error)));
            }
        }
    },

    // Mostrar briefing
    show() {
        this.openModal();
    }
};

// Exportar para uso global
window.BriefingSystem = BriefingSystem;
