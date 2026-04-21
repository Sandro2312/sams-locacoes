/**
 * UnifiedValidator - Sistema de Validação Unificado
 * Substitui sistemas fragmentados com validação dinâmica e em tempo real
 * Versão: 1.0.0
 */

class UnifiedValidator {
    constructor() {
        this.rules = new Map();
        this.customValidators = new Map();
        this.errorMessages = new Map();
        this.validationCache = new Map();
        
        this.initializeDefaultRules();
        this.initializeBrazilianValidators();
        this.setupEventListeners();
        
        console.log('UnifiedValidator inicializado');
    }

    /**
     * Inicialização das regras padrão
     */
    initializeDefaultRules() {
        // Regras para diferentes módulos
        this.setModuleRules('leads', {
            nome: {
                required: true,
                minLength: 2,
                maxLength: 100,
                pattern: /^[a-zA-ZÀ-ÿ\s]+$/,
                sanitize: 'text'
            },
            email: {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                sanitize: 'email',
                async: 'checkEmailExists'
            },
            telefone: {
                required: true,
                pattern: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
                sanitize: 'phone',
                format: 'phone'
            },
            whatsapp: {
                required: false,
                pattern: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
                sanitize: 'phone',
                format: 'phone'
            },
            empresa: {
                required: false,
                minLength: 2,
                maxLength: 100,
                sanitize: 'text'
            },
            origem: {
                required: true,
                // Opções normalizadas aceitas pelo backend
                options: [
                    'google_ads',
                    'instagram',
                    'indicacao',
                    'site_organico',
                    'ligacao_ativa',
                    'whatsapp',
                    'email',
                    'feira',
                    'direto',
                    'facebook_ads',
                    'linkedin_ads',
                    'site_institucional',
                    'whatsapp_business',
                    'email_marketing',
                    'evento_feira',
                    'telemarketing'
                ]
            },
            segmento: {
                required: false,
                sanitize: 'text',
                format: 'segmento'
            }
        });

        this.setModuleRules('clientes', {
            nome: {
                required: true,
                minLength: 2,
                maxLength: 100,
                pattern: /^[a-zA-ZÀ-ÿ\s]+$/,
                sanitize: 'text'
            },
            email: {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                sanitize: 'email',
                async: 'checkEmailExists'
            },
            telefone: {
                required: true,
                pattern: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
                sanitize: 'phone',
                format: 'phone'
            },
            documento: {
                required: true,
                custom: 'validateDocument',
                sanitize: 'document',
                format: 'document'
            },
            endereco: {
                required: true,
                minLength: 10,
                maxLength: 200,
                sanitize: 'text'
            },
            cep: {
                required: true,
                pattern: /^\d{5}-\d{3}$/,
                format: 'cep',
                async: 'validateCEP'
            },
            estado: {
                required: false,
                sanitize: 'text',
                format: 'uf',
                pattern: /^[A-Z]{2}$/
            },
            segmento: {
                required: false,
                sanitize: 'text',
                format: 'segmento'
            }
        });

        // Regras para contatos (fallback/marketing)
        this.setModuleRules('contatos', {
            nome: {
                required: true,
                minLength: 2,
                maxLength: 100,
                pattern: /^[a-zA-ZÀ-ÿ\s]+$/,
                sanitize: 'text'
            },
            email: {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                sanitize: 'email'
            },
            telefone: {
                required: false,
                pattern: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
                sanitize: 'phone',
                format: 'phone'
            },
            whatsapp: {
                required: false,
                pattern: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
                sanitize: 'phone',
                format: 'phone'
            },
            empresa: {
                required: false,
                minLength: 2,
                maxLength: 100,
                sanitize: 'text'
            },
            cargo: {
                required: false,
                minLength: 2,
                maxLength: 100,
                sanitize: 'text'
            },
            segmento: {
                required: false,
                sanitize: 'text',
                format: 'segmento'
            },
            status: {
                required: false,
                sanitize: 'text'
            },
            tags: {
                required: false,
                sanitize: 'text'
            },
            observacoes: {
                required: false,
                sanitize: 'html'
            }
        });

        this.setModuleRules('briefings', {
            titulo: {
                required: true,
                minLength: 5,
                maxLength: 100,
                sanitize: 'text'
            },
            descricao: {
                required: true,
                minLength: 20,
                maxLength: 1000,
                sanitize: 'html'
            },
            prazo: {
                required: true,
                type: 'date',
                min: new Date().toISOString().split('T')[0]
            },
            orcamento: {
                required: true,
                type: 'number',
                min: 0,
                format: 'currency'
            }
        });

        this.setModuleRules('projetos', {
            nome: {
                required: true,
                minLength: 3,
                maxLength: 100,
                sanitize: 'text'
            },
            descricao: {
                required: true,
                minLength: 10,
                maxLength: 500,
                sanitize: 'html'
            },
            dataInicio: {
                required: true,
                type: 'date'
            },
            dataFim: {
                required: true,
                type: 'date',
                custom: 'validateDateRange'
            },
            status: {
                required: true,
                options: ['planejamento', 'em_andamento', 'pausado', 'concluido', 'cancelado']
            },
            prioridade: {
                required: true,
                options: ['baixa', 'media', 'alta', 'urgente']
            }
        });
    }

    /**
     * Validadores específicos para dados brasileiros
     */
    initializeBrazilianValidators() {
        // Validador de CPF
        this.addCustomValidator('validateCPF', (value) => {
            const cpf = value.replace(/[^\d]/g, '');
            
            if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
                return { isValid: false, message: 'CPF inválido' };
            }

            let sum = 0;
            for (let i = 0; i < 9; i++) {
                sum += parseInt(cpf.charAt(i)) * (10 - i);
            }
            let remainder = (sum * 10) % 11;
            if (remainder === 10 || remainder === 11) remainder = 0;
            if (remainder !== parseInt(cpf.charAt(9))) {
                return { isValid: false, message: 'CPF inválido' };
            }

            sum = 0;
            for (let i = 0; i < 10; i++) {
                sum += parseInt(cpf.charAt(i)) * (11 - i);
            }
            remainder = (sum * 10) % 11;
            if (remainder === 10 || remainder === 11) remainder = 0;
            if (remainder !== parseInt(cpf.charAt(10))) {
                return { isValid: false, message: 'CPF inválido' };
            }

            return { isValid: true };
        });

        // Validador de CNPJ
        this.addCustomValidator('validateCNPJ', (value) => {
            const cnpj = value.replace(/[^\d]/g, '');
            
            if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
                return { isValid: false, message: 'CNPJ inválido' };
            }

            const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
            const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

            let sum = 0;
            for (let i = 0; i < 12; i++) {
                sum += parseInt(cnpj.charAt(i)) * weights1[i];
            }
            let remainder = sum % 11;
            const digit1 = remainder < 2 ? 0 : 11 - remainder;

            if (digit1 !== parseInt(cnpj.charAt(12))) {
                return { isValid: false, message: 'CNPJ inválido' };
            }

            sum = 0;
            for (let i = 0; i < 13; i++) {
                sum += parseInt(cnpj.charAt(i)) * weights2[i];
            }
            remainder = sum % 11;
            const digit2 = remainder < 2 ? 0 : 11 - remainder;

            if (digit2 !== parseInt(cnpj.charAt(13))) {
                return { isValid: false, message: 'CNPJ inválido' };
            }

            return { isValid: true };
        });

        // Validador de documento (CPF ou CNPJ)
        this.addCustomValidator('validateDocument', (value) => {
            const cleaned = value.replace(/[^\d]/g, '');
            
            if (cleaned.length === 11) {
                return this.customValidators.get('validateCPF')(value);
            } else if (cleaned.length === 14) {
                return this.customValidators.get('validateCNPJ')(value);
            } else {
                return { isValid: false, message: 'Documento deve ser CPF (11 dígitos) ou CNPJ (14 dígitos)' };
            }
        });

        // Validador de range de datas
        this.addCustomValidator('validateDateRange', (endDate, formData) => {
            const startDate = formData.dataInicio;
            if (!startDate) {
                return { isValid: false, message: 'Data de início deve ser preenchida primeiro' };
            }

            if (new Date(endDate) <= new Date(startDate)) {
                return { isValid: false, message: 'Data de fim deve ser posterior à data de início' };
            }

            return { isValid: true };
        });

        // Validador assíncrono de CEP
        this.addAsyncValidator('validateCEP', async (cep) => {
            const cleanCep = cep.replace(/[^\d]/g, '');
            
            if (cleanCep.length !== 8) {
                return { isValid: false, message: 'CEP deve ter 8 dígitos' };
            }

            try {
                const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const data = await response.json();
                
                if (data.erro) {
                    return { isValid: false, message: 'CEP não encontrado' };
                }

                return { 
                    isValid: true, 
                    data: {
                        endereco: data.logradouro,
                        bairro: data.bairro,
                        cidade: data.localidade,
                        estado: data.uf
                    }
                };
            } catch (error) {
                return { isValid: false, message: 'Erro ao validar CEP' };
            }
        });

        // Validador assíncrono de email
        this.addAsyncValidator('checkEmailExists', async (email) => {
            // Simular verificação de email existente
            const existingEmails = JSON.parse(localStorage.getItem('existingEmails') || '[]');
            
            if (existingEmails.includes(email.toLowerCase())) {
                return { isValid: false, message: 'Este email já está cadastrado' };
            }

            return { isValid: true };
        });
    }

    /**
     * Configuração de regras por módulo
     */
    setModuleRules(module, rules) {
        this.rules.set(module, rules);
    }

    getModuleRules(module) {
        return this.rules.get(module) || {};
    }

    /**
     * Validadores customizados
     */
    addCustomValidator(name, validator) {
        this.customValidators.set(name, validator);
    }

    addAsyncValidator(name, validator) {
        this.customValidators.set(name, validator);
    }

    /**
     * Validação principal
     */
    async validateField(module, fieldName, value, formData = {}) {
        const rules = this.getModuleRules(module);
        const fieldRules = rules[fieldName];
        
        if (!fieldRules) {
            return { isValid: true, sanitized: value };
        }

        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            sanitized: value,
            formatted: value,
            data: {}
        };

        // Sanitização
        if (fieldRules.sanitize && window.SecurityManager) {
            result.sanitized = window.SecurityManager.sanitizeInput(value, fieldRules.sanitize);
        }

        // Formatação
        if (fieldRules.format) {
            result.formatted = this.formatValue(result.sanitized, fieldRules.format);
        }

        // Validação obrigatória
        if (fieldRules.required && (!result.sanitized || result.sanitized.trim() === '')) {
            result.isValid = false;
            result.errors.push('Campo obrigatório');
            return result;
        }

        // Se campo não é obrigatório e está vazio, retorna válido
        if (!fieldRules.required && (!result.sanitized || result.sanitized.trim() === '')) {
            return result;
        }

        // Validação de comprimento
        if (fieldRules.minLength && result.sanitized.length < fieldRules.minLength) {
            result.isValid = false;
            result.errors.push(`Mínimo de ${fieldRules.minLength} caracteres`);
        }

        if (fieldRules.maxLength && result.sanitized.length > fieldRules.maxLength) {
            result.isValid = false;
            result.errors.push(`Máximo de ${fieldRules.maxLength} caracteres`);
        }

        // Validação de padrão
        if (fieldRules.pattern && !fieldRules.pattern.test(result.sanitized)) {
            result.isValid = false;
            result.errors.push('Formato inválido');
        }

        // Validação de tipo
        if (fieldRules.type) {
            const typeValidation = this.validateType(result.sanitized, fieldRules.type, fieldRules);
            if (!typeValidation.isValid) {
                result.isValid = false;
                result.errors.push(...typeValidation.errors);
            }
        }

        // Validação de opções
        if (fieldRules.options && !fieldRules.options.includes(result.sanitized)) {
            result.isValid = false;
            result.errors.push('Opção inválida');
        }

        // Validação customizada
        if (fieldRules.custom && this.customValidators.has(fieldRules.custom)) {
            const customResult = this.customValidators.get(fieldRules.custom)(result.sanitized, formData);
            if (!customResult.isValid) {
                result.isValid = false;
                result.errors.push(customResult.message);
            }
        }

        // Validação assíncrona
        if (fieldRules.async && this.customValidators.has(fieldRules.async)) {
            try {
                const asyncResult = await this.customValidators.get(fieldRules.async)(result.sanitized, formData);
                if (!asyncResult.isValid) {
                    result.isValid = false;
                    result.errors.push(asyncResult.message);
                } else if (asyncResult.data) {
                    result.data = asyncResult.data;
                }
            } catch (error) {
                result.isValid = false;
                result.errors.push('Erro na validação');
            }
        }

        return result;
    }

    /**
     * Validação de formulário completo
     */
    async validateForm(module, formData) {
        const rules = this.getModuleRules(module);
        const results = {};
        let isFormValid = true;

        // Validar cada campo
        for (const [fieldName, value] of Object.entries(formData)) {
            const fieldResult = await this.validateField(module, fieldName, value, formData);
            results[fieldName] = fieldResult;
            
            if (!fieldResult.isValid) {
                isFormValid = false;
            }
        }

        // Verificar campos obrigatórios não preenchidos
        for (const [fieldName, fieldRules] of Object.entries(rules)) {
            if (fieldRules.required && !formData.hasOwnProperty(fieldName)) {
                results[fieldName] = {
                    isValid: false,
                    errors: ['Campo obrigatório'],
                    sanitized: '',
                    formatted: ''
                };
                isFormValid = false;
            }
        }

        return {
            isValid: isFormValid,
            fields: results,
            sanitizedData: this.getSanitizedData(results),
            formattedData: this.getFormattedData(results)
        };
    }

    /**
     * Validação em tempo real
     */
    setupRealtimeValidation(module, formElement) {
        const rules = this.getModuleRules(module);
        
        Object.keys(rules).forEach(fieldName => {
            const field = formElement.querySelector(`[name="${fieldName}"]`);
            if (!field) return;

            // Debounce para evitar validações excessivas
            let timeout;
            
            field.addEventListener('input', async (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(async () => {
                    const formData = this.getFormData(formElement);
                    const result = await this.validateField(module, fieldName, e.target.value, formData);
                    
                    this.displayFieldValidation(field, result);
                    
                    // Auto-formatação
                    if (result.formatted !== e.target.value) {
                        e.target.value = result.formatted;
                    }
                    
                    // Auto-preenchimento (ex: CEP)
                    if (result.data) {
                        this.autoFillFields(formElement, result.data);
                    }
                }, 300);
            });

            // Validação ao sair do campo
            field.addEventListener('blur', async (e) => {
                const formData = this.getFormData(formElement);
                const result = await this.validateField(module, fieldName, e.target.value, formData);
                this.displayFieldValidation(field, result);
            });
        });
    }

    /**
     * Utilitários
     */
    validateType(value, type, rules = {}) {
        const result = { isValid: true, errors: [] };

        switch (type) {
            case 'email':
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    result.isValid = false;
                    result.errors.push('Email inválido');
                }
                break;
                
            case 'number':
                const num = parseFloat(value);
                if (isNaN(num)) {
                    result.isValid = false;
                    result.errors.push('Deve ser um número');
                } else {
                    if (rules.min !== undefined && num < rules.min) {
                        result.isValid = false;
                        result.errors.push(`Valor mínimo: ${rules.min}`);
                    }
                    if (rules.max !== undefined && num > rules.max) {
                        result.isValid = false;
                        result.errors.push(`Valor máximo: ${rules.max}`);
                    }
                }
                break;
                
            case 'date':
                const date = new Date(value);
                if (isNaN(date.getTime())) {
                    result.isValid = false;
                    result.errors.push('Data inválida');
                } else {
                    if (rules.min && date < new Date(rules.min)) {
                        result.isValid = false;
                        result.errors.push(`Data mínima: ${rules.min}`);
                    }
                    if (rules.max && date > new Date(rules.max)) {
                        result.isValid = false;
                        result.errors.push(`Data máxima: ${rules.max}`);
                    }
                }
                break;
        }

        return result;
    }

    formatValue(value, format) {
        switch (format) {
            case 'segmento': {
                if (!value) return '';
                const raw = (value || '').toString().trim().replace(/\s+/g, ' ');
                // Preservar acentos e fazer Title Case simples, mantendo hífens
                const toTitle = (str) => str.replace(/([\p{L}][\p{L}'’]*)/gu, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
                // Tratar partes separadas por hífen como palavras independentes
                const parts = raw.split('-').map(p => toTitle(p));
                const titled = parts.join('-');
                return titled;
            }
            case 'document': {
                const digits = (value || '').toString().replace(/[^\d]/g, '');
                if (digits.length <= 11) {
                    // CPF
                    if (digits.length === 11) {
                        return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                    }
                    return value;
                } else {
                    // CNPJ
                    if (digits.length === 14) {
                        return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
                    }
                    return value;
                }
            }
            case 'phone':
                const phone = value.replace(/[^\d]/g, '');
                if (phone.length === 11) {
                    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
                } else if (phone.length === 10) {
                    return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
                }
                return value;
                
            case 'cep':
                const cep = value.replace(/[^\d]/g, '');
                if (cep.length === 8) {
                    return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
                }
                return value;
                
            case 'cpf':
                const cpf = value.replace(/[^\d]/g, '');
                if (cpf.length === 11) {
                    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                }
                return value;
                
            case 'cnpj':
                const cnpj = value.replace(/[^\d]/g, '');
                if (cnpj.length === 14) {
                    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
                }
                return value;
                
            case 'currency':
                const num = parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.'));
                if (!isNaN(num)) {
                    return new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                    }).format(num);
                }
                return value;
            
            case 'uf': {
                const letters = (value || '').toString().replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2);
                return letters;
            }
                
            default:
                return value;
        }
    }

    getFormData(formElement) {
        const formData = {};
        const inputs = formElement.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            if (input.name) {
                formData[input.name] = input.value;
            }
        });
        
        return formData;
    }

    getSanitizedData(results) {
        const sanitized = {};
        Object.entries(results).forEach(([field, result]) => {
            sanitized[field] = result.sanitized;
        });
        return sanitized;
    }

    getFormattedData(results) {
        const formatted = {};
        Object.entries(results).forEach(([field, result]) => {
            formatted[field] = result.formatted;
        });
        return formatted;
    }

    displayFieldValidation(field, result) {
        // Remove validações anteriores
        this.clearFieldValidation(field);
        
        const container = field.parentElement;
        
        if (!result.isValid) {
            field.classList.add('is-invalid');
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'invalid-feedback';
            errorDiv.textContent = result.errors[0];
            container.appendChild(errorDiv);
        } else {
            field.classList.add('is-valid');
        }
    }

    clearFieldValidation(field) {
        field.classList.remove('is-valid', 'is-invalid');
        const feedback = field.parentElement.querySelector('.invalid-feedback, .valid-feedback');
        if (feedback) {
            feedback.remove();
        }
    }

    autoFillFields(formElement, data) {
        Object.entries(data).forEach(([fieldName, value]) => {
            const field = formElement.querySelector(`[name="${fieldName}"]`);
            if (field && !field.value) {
                field.value = value;
                field.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
    }

    setupEventListeners() {
        // Listener global para formulários
        document.addEventListener('DOMContentLoaded', () => {
            const forms = document.querySelectorAll('form[data-module]');
            forms.forEach(form => {
                const module = form.dataset.module;
                this.setupRealtimeValidation(module, form);
            });
        });
    }
}

// Instância global do UnifiedValidator
window.UnifiedValidator = new UnifiedValidator();

console.log('UnifiedValidator carregado com sucesso');
