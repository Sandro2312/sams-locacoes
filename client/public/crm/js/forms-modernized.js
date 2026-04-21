/**
 * SAMS Locações - Sistema de Formulários Modernizado v4.0
 * Sistema de formulários integrado com validação avançada
 * Compatível com FormSystem existente
 */

// Sistema de Formulários Modernizado
const FormSystemModernized = {
    // Configuração do sistema
    config: {
        version: '4.0',
        debug: true,
        autoValidation: true,
        realTimeValidation: true
    },

    // Estado do sistema
    state: {
        initialized: false,
        activeForm: null,
        validationRules: {},
        formInstances: new Map()
    },

    /**
     * Inicialização do sistema
     */
    init() {
        try {
            console.log('🚀 Inicializando FormSystemModernized v4.0...');
            
            this.state.initialized = true;
            this.setupEventListeners();
            this.registerValidationRules();
            
            console.log('✅ FormSystemModernized inicializado com sucesso');
            return true;
        } catch (error) {
            console.error('❌ Erro ao inicializar FormSystemModernized:', error);
            return false;
        }
    },

    /**
     * Configurar event listeners globais
     */
    setupEventListeners() {
        // Event listeners para formulários modernizados
        document.addEventListener('submit', (e) => {
            if (e.target.classList.contains('modernized-form')) {
                this.handleFormSubmit(e);
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target.closest('.modernized-form')) {
                this.handleRealTimeValidation(e);
            }
        });
    },

    /**
     * Registrar regras de validação
     */
    registerValidationRules() {
        this.state.validationRules = {
            required: (value) => value && value.trim() !== '',
            email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
            phone: (value) => /^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(value),
            cpf: (value) => this.validateCPF(value),
            cnpj: (value) => this.validateCNPJ(value)
        };
    },

    /**
     * Manipular submissão de formulário
     */
    handleFormSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const module = form.dataset?.module;

        // Evitar submissão de transações pelo sistema modernizado; delegar para FormSystem padrão
        if (module === 'transacoes' && window.FormSystem?.handleSave) {
            if (!this.validateForm(form)) {
                console.log('❌ Formulário inválido');
                return;
            }
            console.log('🔁 Delegando submit de transações para FormSystem');
            window.FormSystem.handleSave(event);
            return;
        }
        
        if (this.validateForm(form)) {
            console.log('✅ Formulário válido, processando...');
            this.processForm(form);
        } else {
            console.log('❌ Formulário inválido');
        }
    },

    /**
     * Validação em tempo real
     */
    handleRealTimeValidation(event) {
        if (this.config.realTimeValidation) {
            const field = event.target;
            this.validateField(field);
        }
    },

    /**
     * Validar formulário completo
     */
    validateForm(form) {
        const fields = form.querySelectorAll('[data-validation]');
        let isValid = true;

        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        return isValid;
    },

    /**
     * Validar campo individual
     */
    validateField(field) {
        const rules = field.dataset.validation?.split('|') || [];
        const value = field.value;
        let isValid = true;

        for (const rule of rules) {
            const validator = this.state.validationRules[rule];
            if (validator && !validator(value)) {
                this.showFieldError(field, rule);
                isValid = false;
                break;
            }
        }

        if (isValid) {
            this.clearFieldError(field);
        }

        return isValid;
    },

    /**
     * Mostrar erro no campo
     */
    showFieldError(field, rule) {
        field.classList.add('error');
        
        let errorElement = field.parentNode.querySelector('.error-message');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'error-message text-red-500 text-sm mt-1';
            field.parentNode.appendChild(errorElement);
        }

        const errorMessages = {
            required: 'Este campo é obrigatório',
            email: 'Email inválido',
            phone: 'Telefone inválido',
            cpf: 'CPF inválido',
            cnpj: 'CNPJ inválido'
        };

        errorElement.textContent = errorMessages[rule] || 'Campo inválido';
    },

    /**
     * Limpar erro do campo
     */
    clearFieldError(field) {
        field.classList.remove('error');
        const errorElement = field.parentNode.querySelector('.error-message');
        if (errorElement) {
            errorElement.remove();
        }
    },

    /**
     * Processar formulário válido
     */
    processForm(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        console.log('📝 Dados do formulário:', data);
        
        // Integração com sistemas existentes
        if (typeof ModuleSystem !== 'undefined' && form.dataset.module) {
            ModuleSystem.addItem(form.dataset.module, data);
        }
    },

    /**
     * Validar CPF
     */
    validateCPF(cpf) {
        cpf = cpf.replace(/[^\d]/g, '');
        
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
            return false;
        }

        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cpf.charAt(i)) * (10 - i);
        }
        
        let remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.charAt(9))) return false;

        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cpf.charAt(i)) * (11 - i);
        }
        
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        
        return remainder === parseInt(cpf.charAt(10));
    },

    /**
     * Validar CNPJ
     */
    validateCNPJ(cnpj) {
        cnpj = cnpj.replace(/[^\d]/g, '');
        
        if (cnpj.length !== 14) return false;

        const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(cnpj.charAt(i)) * weights1[i];
        }

        let remainder = sum % 11;
        const digit1 = remainder < 2 ? 0 : 11 - remainder;

        if (digit1 !== parseInt(cnpj.charAt(12))) return false;

        sum = 0;
        for (let i = 0; i < 13; i++) {
            sum += parseInt(cnpj.charAt(i)) * weights2[i];
        }

        remainder = sum % 11;
        const digit2 = remainder < 2 ? 0 : 11 - remainder;

        return digit2 === parseInt(cnpj.charAt(13));
    },

    /**
     * Criar formulário modernizado
     */
    createForm(config) {
        const form = document.createElement('form');
        form.className = 'modernized-form space-y-4';
        form.dataset.module = config.module || '';

        config.fields?.forEach(fieldConfig => {
            const fieldElement = this.createField(fieldConfig);
            form.appendChild(fieldElement);
        });

        return form;
    },

    /**
     * Criar campo de formulário
     */
    createField(config) {
        const wrapper = document.createElement('div');
        wrapper.className = 'form-field';

        if (config.label) {
            const label = document.createElement('label');
            label.textContent = config.label;
            label.className = 'block text-sm font-medium text-gray-700 mb-1';
            wrapper.appendChild(label);
        }

        const input = document.createElement(config.type === 'textarea' ? 'textarea' : 'input');
        input.type = config.type || 'text';
        input.name = config.name;
        input.placeholder = config.placeholder || '';
        input.className = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';
        
        if (config.validation) {
            input.dataset.validation = config.validation;
        }

        wrapper.appendChild(input);
        return wrapper;
    },

    /**
     * Utilitários
     */
    utils: {
        formatPhone(value) {
            return value.replace(/\D/g, '').replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
        },

        formatCPF(value) {
            return value.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        },

        formatCNPJ(value) {
            return value.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        }
    }
};

// Compatibilidade com sistema existente
if (typeof window !== 'undefined') {
    window.FormSystemModernized = FormSystemModernized;
    
    // Auto-inicialização quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            FormSystemModernized.init();
        });
    } else {
        FormSystemModernized.init();
    }
}

console.log('📦 FormSystemModernized v4.0 carregado com sucesso');