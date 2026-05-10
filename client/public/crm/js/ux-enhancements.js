// Sistema de Melhorias de UX para Formulários
// Funcionalidades avançadas de máscaras, autocomplete e sugestões

const UXEnhancements = {
    // Inicializar melhorias de UX
    init() {
        console.log('[UXEnhancements] Inicializando melhorias de UX...');
        this.setupGlobalEventListeners();
    },

    // Configurar event listeners globais
    setupGlobalEventListeners() {
        // Aplicar melhorias quando formulários são criados
        document.addEventListener('DOMContentLoaded', () => {
            this.enhanceExistingForms();
            // Injetar botões de retorno em modais existentes
            this.ensureBackButtonsInModals(document.body);
        });

        // Observer para novos formulários adicionados dinamicamente
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        const forms = node.querySelectorAll ? node.querySelectorAll('form') : [];
                        forms.forEach(form => this.enhanceForm(form));
                        if (node.tagName === 'FORM') {
                            this.enhanceForm(node);
                        }
                        // Garantir botões de retorno ao dashboard em modais/overlays novos
                        this.ensureBackButtonsInModals(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    },

    // Garante que modais e overlays tenham botão 'Voltar ao Dashboard'
    ensureBackButtonsInModals(root) {
        try {
            // 1) Modais Bootstrap: procurar por .modal-footer
            const footers = root.querySelectorAll ? root.querySelectorAll('.modal-footer') : [];
            footers.forEach(footer => {
                const hasBack = [...footer.querySelectorAll('button')].some(btn => (btn.textContent || '').toLowerCase().includes('voltar ao dashboard'));
                if (!hasBack) {
                    const modalEl = footer.closest('.modal');
                    const modalId = modalEl ? modalEl.id : `modal_${Date.now()}`;
                    const backBtn = this.createBackButton(() => this.handleBackNavigation(modalId, modalEl));
                    footer.insertAdjacentElement('afterbegin', backBtn);
                }
            });

            // 2) Overlays Tailwind: procurar containers com classes de overlay e rodapés/action-bars
            const overlaySelectors = [
                '.fixed.inset-0',
                '.bg-black.bg-opacity-50',
                '[id$="overlay"]',
                '[id*="overlay"]'
            ];
            const overlays = [];
            if (root.querySelectorAll) {
                overlaySelectors.forEach(sel => {
                    root.querySelectorAll(sel).forEach(el => overlays.push(el));
                });
            }
            overlays.forEach(overlay => {
                // Procurar uma área de ações/rodapé no modal associado
                const modal = overlay.querySelector('.fixed.inset-0.flex') || overlay.nextElementSibling;
                const footerArea = modal ? modal.querySelector('.modal-footer') || modal.querySelector('.actions') || modal.querySelector('.flex.justify-end') : null;
                const target = footerArea || modal || overlay;
                if (target) {
                    const hasBack = target.querySelector && [...target.querySelectorAll('button')].some(btn => (btn.textContent || '').toLowerCase().includes('voltar ao dashboard'));
                    if (!hasBack) {
                        const modalId = (modal && modal.id) ? modal.id : (overlay.id || `overlay_${Date.now()}`);
                        const backBtn = this.createBackButton(() => this.handleBackNavigation(modalId, modal));
                        if (footerArea) {
                            footerArea.insertAdjacentElement('afterbegin', backBtn);
                        } else if (modal) {
                            modal.appendChild(backBtn);
                        } else {
                            overlay.appendChild(backBtn);
                        }
                    }
                }
            });
        } catch (e) {
            console.warn('[UXEnhancements] Falha ao garantir botões de retorno em modais:', e);
        }
    },

    createBackButton(onclick) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-secondary';
        btn.innerHTML = '<i class="fas fa-arrow-left me-2"></i> Voltar ao Dashboard';
        btn.addEventListener('click', onclick);
        return btn;
    },

    handleBackNavigation(modalId, modalEl) {
        try {
            // Fechar/remover modal bootstrap se aplicável
            if (modalEl && window.bootstrap && bootstrap.Modal) {
                const instance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                instance.hide();
            }
            setTimeout(() => {
                if (modalEl) {
                    const wrapper = modalEl.closest('.modal');
                    if (wrapper) wrapper.remove(); else modalEl.remove();
                } else if (modalId) {
                    const el = document.getElementById(modalId);
                    if (el) el.remove();
                }
            }, 180);

            if (window.NavigationSystem && typeof window.NavigationSystem.navigateToModule === 'function') {
                window.NavigationSystem.navigateToModule('dashboard');
            } else if (typeof window.navigateToDashboard === 'function') {
                window.navigateToDashboard();
            }
        } catch (e) {
            console.warn('[UXEnhancements] Erro ao navegar de volta ao dashboard:', e);
            if (window.NavigationSystem && typeof window.NavigationSystem.navigateToModule === 'function') {
                window.NavigationSystem.navigateToModule('dashboard');
            }
        }
    },

    // Melhorar formulários existentes
    enhanceExistingForms() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => this.enhanceForm(form));
    },

    // Melhorar um formulário específico
    enhanceForm(form) {
        if (!form || form.hasAttribute('data-ux-enhanced')) return;
        
        form.setAttribute('data-ux-enhanced', 'true');
        
        this.applyAdvancedMasks(form);
        this.setupAutocomplete(form);
        this.addVisualFeedback(form);
        this.setupSmartValidation(form);
    },

    // Aplicar máscaras avançadas
    applyAdvancedMasks(form) {
        const inputs = form.querySelectorAll('input[type="text"], input[type="tel"], input[type="email"]');
        
        inputs.forEach(input => {
            const maskType = this.detectMaskType(input);
            if (maskType) {
                input.setAttribute('data-mask', maskType);
                this.setupMaskListener(input, maskType);
            }
        });
    },

    // Detectar tipo de máscara baseado no campo
    detectMaskType(input) {
        const name = input.name.toLowerCase();
        const type = input.type;
        
        // Não aplicar máscara em campos numéricos
        if (type === 'number') {
            return null;
        }
        
        // Excluir campos de texto simples que não precisam de máscara
        if (name.includes('nome') || name.includes('name') || 
            name.includes('empresa') || name.includes('company') ||
            name.includes('observacoes') || name.includes('descricao') ||
            name.includes('titulo') || name.includes('assunto')) {
            return null;
        }
        
        if (name.includes('telefone') || name.includes('phone') || type === 'tel') {
            return 'phone';
        }
        if (name.includes('cpf') || name.includes('cnpj') || name.includes('documento')) {
            return 'document';
        }
        if (name.includes('cep')) {
            return 'cep';
        }
        if (name.includes('centrocusto') || name.includes('centro_custo')) {
            return null;
        }
        if (name.includes('valor') || name.includes('preco') || name.includes('custo')) {
            return 'currency';
        }
        if (name.includes('percentual') || name.includes('porcentagem')) {
            return 'percentage';
        }
        
        return null;
    },

    // Configurar listener de máscara
    setupMaskListener(input, maskType) {
        input.addEventListener('input', (e) => {
            this.applyInputMask(e.target, maskType);
        });
        
        // Aplicar máscara inicial se já houver valor
        if (input.value) {
            this.applyInputMask(input, maskType);
        }
    },

    // Aplicar máscaras de entrada
    applyInputMask(input, maskType) {
        const originalValue = input.value;
        const cursorPosition = input.selectionStart;
        
        let maskedValue = originalValue;
        
        switch (maskType) {
            case 'phone':
                maskedValue = this.maskPhone(originalValue);
                break;
            case 'document':
                maskedValue = this.maskDocument(originalValue);
                break;
            case 'cep':
                maskedValue = this.maskCEP(originalValue);
                break;
            case 'currency':
                maskedValue = this.maskCurrency(originalValue);
                break;
            case 'percentage':
                maskedValue = this.maskPercentage(originalValue);
                break;
        }
        
        if (maskedValue !== originalValue) {
            input.value = maskedValue;
            
            // Manter posição do cursor
            setTimeout(() => {
                const newPosition = this.calculateCursorPosition(originalValue, maskedValue, cursorPosition);
                input.setSelectionRange(newPosition, newPosition);
            }, 0);
        }
    },

    // Máscara de telefone
    maskPhone(value) {
        const numbers = value.replace(/\D/g, '');
        
        if (numbers.length <= 10) {
            // Telefone fixo: (11) 1234-5678
            return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        } else {
            // Celular: (11) 91234-5678
            return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        }
    },

    // Máscara de documento (CPF/CNPJ)
    maskDocument(value) {
        const numbers = value.replace(/\D/g, '');
        
        if (numbers.length <= 11) {
            // CPF: 123.456.789-01
            return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        } else {
            // CNPJ: 12.345.678/0001-90
            return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        }
    },

    // Máscara de CEP
    maskCEP(value) {
        const numbers = value.replace(/\D/g, '');
        return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
    },

    // Máscara de moeda
    maskCurrency(value) {
        const numbers = value.replace(/\D/g, '');
        const numericValue = parseFloat(numbers) / 100;
        
        if (isNaN(numericValue) || numericValue === 0) {
            return '';
        }
        
        return numericValue.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    },

    // Máscara de porcentagem
    maskPercentage(value) {
        const numbers = value.replace(/\D/g, '');
        const numericValue = parseFloat(numbers) / 100;
        
        if (isNaN(numericValue)) {
            return '';
        }
        
        return numericValue.toLocaleString('pt-BR', {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    },

    // Calcular nova posição do cursor após aplicar máscara
    calculateCursorPosition(oldValue, newValue, oldPosition) {
        // Verificar se os valores são válidos
        if (!oldValue || oldValue.length === 0 || !newValue) {
            return 0;
        }
        
        // Se não houve mudança no valor, manter posição original
        if (oldValue === newValue) {
            return oldPosition;
        }
        
        // Lógica simples: manter posição relativa
        const ratio = oldPosition / oldValue.length;
        const newPosition = Math.round(ratio * newValue.length);
        
        // Garantir que a posição está dentro dos limites
        return Math.max(0, Math.min(newPosition, newValue.length));
    },

    // Configurar autocomplete inteligente
    setupAutocomplete(form) {
        const inputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]');
        
        inputs.forEach(input => {
            this.enhanceInputAutocomplete(input);
        });
    },

    // Melhorar autocomplete de um input
    enhanceInputAutocomplete(input) {
        const name = input.name.toLowerCase();
        
        // Configurações de autocomplete HTML5
        const autocompleteMap = {
            'nome': 'name',
            'email': 'email',
            'telefone': 'tel',
            'endereco': 'street-address',
            'cidade': 'address-level2',
            'estado': 'address-level1',
            'cep': 'postal-code',
            'empresa': 'organization',
            'cargo': 'organization-title'
        };
        
        if (autocompleteMap[name] && !input.hasAttribute('autocomplete')) {
            input.setAttribute('autocomplete', autocompleteMap[name]);
        }
        
        // Adicionar sugestões baseadas em dados existentes
        this.addDatalistSuggestions(input);
    },

    // Adicionar sugestões de datalist
    addDatalistSuggestions(input) {
        const name = input.name;
        const suggestions = this.getSuggestions(name);
        
        if (suggestions.length > 0) {
            if (!this.datalistCounter) this.datalistCounter = 0;
            const datalistId = `${name}-suggestions-${++this.datalistCounter}`;
            let datalist = document.createElement('datalist');
            datalist.id = datalistId;
            
            datalist.innerHTML = suggestions.map(s => `<option value="${s}"></option>`).join('');
            document.body.appendChild(datalist);
            input.setAttribute('list', datalistId);
        }
    },

    // Obter sugestões baseadas em dados existentes
    getSuggestions(fieldName) {
        const suggestions = new Set();
        
        // Buscar em dados do ModuleSystem se disponível
        if (window.ModuleSystem && window.ModuleSystem.data) {
            Object.values(window.ModuleSystem.data).forEach(moduleData => {
                if (Array.isArray(moduleData)) {
                    moduleData.forEach(item => {
                        if (item[fieldName] && typeof item[fieldName] === 'string' && item[fieldName].trim()) {
                            suggestions.add(item[fieldName].trim());
                        }
                    });
                }
            });
        }
        
        return Array.from(suggestions).slice(0, 10); // Limitar a 10 sugestões
    },

    // Adicionar feedback visual
    addVisualFeedback(form) {
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            // Feedback de foco
            input.addEventListener('focus', () => {
                input.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
            });
            
            input.addEventListener('blur', () => {
                input.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
            });
            
            // Feedback de validação
            input.addEventListener('input', () => {
                this.updateValidationFeedback(input);
            });
        });
    },

    // Atualizar feedback de validação
    updateValidationFeedback(input) {
        // Remover classes de erro anteriores
        input.classList.remove('border-red-500', 'border-green-500', 'bg-red-50', 'bg-green-50');
        
        // Remover mensagens de erro anteriores
        const existingError = input.parentNode.querySelector('.ux-error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Validação básica
        if (input.hasAttribute('required') && !input.value.trim()) {
            return; // Não mostrar erro para campos vazios obrigatórios até o blur
        }
        
        // Validação específica por tipo
        let isValid = true;
        let errorMessage = '';
        
        if (input.type === 'email' && input.value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            isValid = emailRegex.test(input.value);
            errorMessage = 'Email inválido';
        }
        
        // Aplicar feedback visual
        if (input.value) {
            if (isValid) {
                input.classList.add('border-green-500', 'bg-green-50');
            } else {
                input.classList.add('border-red-500', 'bg-red-50');
                this.showFieldError(input, errorMessage);
            }
        }
    },

    // Mostrar erro em campo
    showFieldError(input, message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'ux-error-message text-red-600 text-sm mt-1';
        errorElement.textContent = message;
        
        input.parentNode.appendChild(errorElement);
    },

    // Configurar validação inteligente
    setupSmartValidation(form) {
        // Validação em tempo real mais inteligente
        form.addEventListener('submit', (e) => {
            if (!this.validateForm(form)) {
                e.preventDefault();
                this.focusFirstError(form);
            }
        });
    },

    // Validar formulário
    validateForm(form) {
        let isValid = true;
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                this.showFieldError(input, 'Este campo é obrigatório');
                input.classList.add('border-red-500', 'bg-red-50');
                isValid = false;
            }
        });
        
        return isValid;
    },

    // Focar no primeiro erro
    focusFirstError(form) {
        const firstError = form.querySelector('.border-red-500');
        if (firstError) {
            firstError.focus();
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
};

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => UXEnhancements.init());
} else {
    UXEnhancements.init();
}

// Exportar globalmente
window.UXEnhancements = UXEnhancements;

console.log('[UXEnhancements] Sistema de melhorias de UX carregado');

// Hack: pointer-events para preservar valor no mousedown em campos com data-preserve-value
// Ajuste v1: remover alteração de pointer-events e executar na fase de bolha para não interferir com caret/foco
// Ajuste v2: ignorar interações dentro do overlay do FormSystem

document.addEventListener('mousedown', (e) => {
  const target = e.target;
  if (!target || !(target instanceof Element)) return;
  // Não interferir dentro do overlay do FormSystem
  if (target.closest('#modal-overlay')) return;
  if (target.matches('input[data-preserve-value="true"], select[data-preserve-value="true"], textarea[data-preserve-value="true"]')) {
    const val = (target.value || '').trim();
    const isEditable = !target.readOnly && !target.disabled;
    if (isEditable && val.length > 0) {
      // Apenas garantir foco sem mexer em pointer-events
      setTimeout(() => {
        try { target.focus(); } catch (err) { /* noop */ }
      }, 0);
    }
  }
}, false);
