/**
 * FormComponents - Componentes Reutilizáveis para Formulários
 * UI moderna com integração aos sistemas de validação e segurança
 * Versão: 1.0.0
 */

class FormComponents {
    constructor() {
        this.components = new Map();
        this.templates = new Map();
        this.eventHandlers = new Map();
        this.fieldCounter = 0;
        
        this.initializeComponents();
        this.loadTemplates();
        this.setupGlobalStyles();
        
        console.log('FormComponents inicializado');
    }

    getFieldCounter() {
        return ++this.fieldCounter;
    }

    /**
     * Inicialização dos componentes
     */
    initializeComponents() {
        // Registrar componentes básicos
        this.registerComponent('input', this.createInput.bind(this));
        this.registerComponent('select', this.createSelect.bind(this));
        this.registerComponent('textarea', this.createTextarea.bind(this));
        this.registerComponent('checkbox', this.createCheckbox.bind(this));
        this.registerComponent('radio', this.createRadio.bind(this));
        this.registerComponent('file', this.createFileInput.bind(this));
        this.registerComponent('date', this.createDateInput.bind(this));
        this.registerComponent('time', this.createTimeInput.bind(this));
        this.registerComponent('datetime', this.createDateTimeInput.bind(this));
        this.registerComponent('color', this.createColorInput.bind(this));
        this.registerComponent('range', this.createRangeInput.bind(this));
        
        // Componentes especializados
        this.registerComponent('phone', this.createPhoneInput.bind(this));
        this.registerComponent('email', this.createEmailInput.bind(this));
        this.registerComponent('cpf', this.createCPFInput.bind(this));
        this.registerComponent('cnpj', this.createCNPJInput.bind(this));
        this.registerComponent('cep', this.createCEPInput.bind(this));
        this.registerComponent('currency', this.createCurrencyInput.bind(this));
        this.registerComponent('password', this.createPasswordInput.bind(this));
        
        // Componentes compostos
        this.registerComponent('form', this.createForm.bind(this));
        this.registerComponent('fieldset', this.createFieldset.bind(this));
        this.registerComponent('modal-form', this.createModalForm.bind(this));
        this.registerComponent('wizard', this.createWizard.bind(this));
    }

    loadTemplates() {
        // Template base para campos
        this.templates.set('field-wrapper', `
            <div class="form-group mb-3" data-field="{fieldName}">
                <label class="form-label {labelClass}" for="{fieldId}">
                    {label}
                    {required}
                </label>
                <div class="input-wrapper">
                    {input}
                    {help}
                </div>
                <div class="feedback-container"></div>
            </div>
        `);

        // Template para formulário
        this.templates.set('form-wrapper', `
            <form class="modern-form {formClass}" data-module="{module}" novalidate>
                <div class="form-header">
                    <h3 class="form-title">{title}</h3>
                    {subtitle}
                </div>
                <div class="form-body">
                    {fields}
                </div>
                <div class="form-footer">
                    {actions}
                </div>
            </form>
        `);

        // Template para modal
        this.templates.set('modal-wrapper', `
            <div class="modal fade" id="{modalId}" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog {modalSize}">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">{title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            {content}
                        </div>
                        <div class="modal-footer">
                            {actions}
                        </div>
                    </div>
                </div>
            </div>
        `);
    }

    setupGlobalStyles() {
        const styles = `
            <style id="form-components-styles">
                .modern-form {
                    background: #fff;
                    border-radius: 12px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    padding: 2rem;
                    margin: 1rem 0;
                }

                .form-header {
                    margin-bottom: 2rem;
                    border-bottom: 1px solid #e5e7eb;
                    padding-bottom: 1rem;
                }

                .form-title {
                    color: #1f2937;
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin: 0;
                }

                .form-subtitle {
                    color: #6b7280;
                    font-size: 0.875rem;
                    margin-top: 0.5rem;
                }

                .form-group {
                    position: relative;
                }

                .form-label {
                    display: block;
                    font-weight: 500;
                    color: #374151;
                    margin-bottom: 0.5rem;
                    font-size: 0.875rem;
                }

                .form-label.required::after {
                    content: " *";
                    color: #ef4444;
                }

                .form-control {
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    transition: all 0.2s ease;
                    background-color: #fff;
                }

                .form-control:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .form-control.is-valid {
                    border-color: #10b981;
                    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3e%3cpath fill='%2310b981' d='m2.3 6.73.94-.94 2.94 2.94L8.5 6.4l-.94-.94L4.5 8.5z'/%3e%3c/svg%3e");
                    background-repeat: no-repeat;
                    background-position: right 0.75rem center;
                    background-size: 1rem;
                    padding-right: 2.75rem;
                }

                .form-control.is-invalid {
                    border-color: #ef4444;
                    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' width='12' height='12' fill='none' stroke='%23ef4444'%3e%3ccircle cx='6' cy='6' r='4.5'/%3e%3cpath d='m5.5 5.5 1 1m0-1-1 1'/%3e%3c/svg%3e");
                    background-repeat: no-repeat;
                    background-position: right 0.75rem center;
                    background-size: 1rem;
                    padding-right: 2.75rem;
                }

                .invalid-feedback {
                    display: block;
                    color: #ef4444;
                    font-size: 0.75rem;
                    margin-top: 0.25rem;
                }

                .valid-feedback {
                    display: block;
                    color: #10b981;
                    font-size: 0.75rem;
                    margin-top: 0.25rem;
                }

                .form-help {
                    font-size: 0.75rem;
                    color: #6b7280;
                    margin-top: 0.25rem;
                }

                .input-group {
                    display: flex;
                    align-items: stretch;
                }

                .input-group-text {
                    padding: 0.75rem;
                    background-color: #f9fafb;
                    border: 1px solid #d1d5db;
                    border-right: 0;
                    border-radius: 8px 0 0 8px;
                    font-size: 0.875rem;
                    color: #6b7280;
                }

                .input-group .form-control {
                    border-radius: 0 8px 8px 0;
                }

                .btn {
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    font-weight: 500;
                    font-size: 0.875rem;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .btn-primary {
                    background-color: #3b82f6;
                    color: white;
                }

                .btn-primary:hover {
                    background-color: #2563eb;
                }

                .btn-secondary {
                    background-color: #6b7280;
                    color: white;
                }

                .btn-secondary:hover {
                    background-color: #4b5563;
                }

                .btn-success {
                    background-color: #10b981;
                    color: white;
                }

                .btn-success:hover {
                    background-color: #059669;
                }

                .btn-danger {
                    background-color: #ef4444;
                    color: white;
                }

                .btn-danger:hover {
                    background-color: #dc2626;
                }

                .btn-outline-primary {
                    background-color: transparent;
                    color: #3b82f6;
                    border: 1px solid #3b82f6;
                }

                .btn-outline-primary:hover {
                    background-color: #3b82f6;
                    color: white;
                }

                .form-footer {
                    margin-top: 2rem;
                    padding-top: 1rem;
                    border-top: 1px solid #e5e7eb;
                    display: flex;
                    gap: 1rem;
                    justify-content: flex-end;
                }

                .loading-spinner {
                    display: inline-block;
                    width: 1rem;
                    height: 1rem;
                    border: 2px solid transparent;
                    border-top: 2px solid currentColor;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .password-strength {
                    margin-top: 0.5rem;
                }

                .password-strength-bar {
                    height: 4px;
                    background-color: #e5e7eb;
                    border-radius: 2px;
                    overflow: hidden;
                }

                .password-strength-fill {
                    height: 100%;
                    transition: all 0.3s ease;
                    border-radius: 2px;
                }

                .strength-weak { background-color: #ef4444; width: 25%; }
                .strength-fair { background-color: #f59e0b; width: 50%; }
                .strength-good { background-color: #3b82f6; width: 75%; }
                .strength-strong { background-color: #10b981; width: 100%; }

                .wizard-steps {
                    display: flex;
                    margin-bottom: 2rem;
                }

                .wizard-step {
                    flex: 1;
                    text-align: center;
                    position: relative;
                    padding: 1rem;
                }

                .wizard-step::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    right: 0;
                    width: 100%;
                    height: 2px;
                    background-color: #e5e7eb;
                    z-index: -1;
                }

                .wizard-step:last-child::after {
                    display: none;
                }

                .wizard-step.active {
                    color: #3b82f6;
                }

                .wizard-step.completed {
                    color: #10b981;
                }

                .wizard-step.completed::after {
                    background-color: #10b981;
                }

                @media (max-width: 768px) {
                    .modern-form {
                        padding: 1rem;
                        margin: 0.5rem 0;
                    }
                    
                    .form-footer {
                        flex-direction: column;
                    }
                    
                    .btn {
                        width: 100%;
                        justify-content: center;
                    }
                }
            </style>
        `;

        if (!document.getElementById('form-components-styles')) {
            document.head.insertAdjacentHTML('beforeend', styles);
        }
    }

    /**
     * Registro de componentes
     */
    registerComponent(name, factory) {
        this.components.set(name, factory);
    }

    /**
     * Criação de componentes básicos
     */
    createInput(config) {
        const {
            name,
            type = 'text',
            label,
            placeholder = '',
            required = false,
            value = '',
            help = '',
            className = '',
            attributes = {}
        } = config;

        const fieldId = `field_${name}_${this.getFieldCounter()}`;
        const selectAttributes = Object.entries(attributes)
            .map(([key, val]) => `${key}="${val}"`)
            .join(' ');

        const input = `
            <input 
                type="${type}" 
                class="form-control ${className}" 
                id="${fieldId}"
                name="${name}" 
                placeholder="${placeholder}"
                value="${value}"
                ${required ? 'required' : ''}
                ${inputAttributes}
            />
        `;

        return this.wrapField(fieldId, name, label, input, help, required);
    }

    createSelect(config) {
        const {
            name,
            label,
            options = [],
            required = false,
            value = '',
            help = '',
            className = '',
            multiple = false
        } = config;

        const fieldId = `field_${name}_${Date.now()}`;
        const optionsHtml = options.map(option => {
            const optValue = typeof option === 'object' ? option.value : option;
            const optLabel = typeof option === 'object' ? option.label : option;
            const selected = value === optValue ? 'selected' : '';
            return `<option value="${optValue}" ${selected}>${optLabel}</option>`;
        }).join('');

        const input = `
            <select 
                class="form-control ${className}" 
                id="${fieldId}"
                name="${name}" 
                ${required ? 'required' : ''}
                ${multiple ? 'multiple' : ''}
            >
                <option value="">Selecione...</option>
                ${optionsHtml}
            </select>
        `;

        return this.wrapField(fieldId, name, label, input, help, required);
    }

    createTextarea(config) {
        const {
            name,
            label,
            placeholder = '',
            required = false,
            value = '',
            help = '',
            className = '',
            rows = 4
        } = config;

        const fieldId = `field_${name}_${this.getFieldCounter()}`;

        const input = `
            <textarea 
                class="form-control ${className}" 
                id="${fieldId}"
                name="${name}" 
                placeholder="${placeholder}"
                rows="${rows}"
                ${required ? 'required' : ''}
            >${value}</textarea>
        `;

        return this.wrapField(fieldId, name, label, input, help, required);
    }

    createCheckbox(config) {
        const {
            name,
            label,
            required = false,
            checked = false,
            help = '',
            className = ''
        } = config;

        const fieldId = `field_${name}_${this.getFieldCounter()}`;

        const input = `
            <div class="form-check">
                <input 
                    type="checkbox" 
                    class="form-check-input ${className}" 
                    id="${fieldId}"
                    name="${name}" 
                    ${checked ? 'checked' : ''}
                    ${required ? 'required' : ''}
                />
                <label class="form-check-label" for="${fieldId}">
                    ${label}
                </label>
            </div>
        `;

        return this.wrapField(fieldId, name, '', input, help, required);
    }

    createRadio(config) {
        const {
            name,
            label,
            options = [],
            required = false,
            value = '',
            help = '',
            className = ''
        } = config;

        const optionsHtml = options.map((option, index) => {
            const optValue = typeof option === 'object' ? option.value : option;
            const optLabel = typeof option === 'object' ? option.label : option;
            const fieldId = `field_${name}_${index}_${this.getFieldCounter()}`;
            const checked = value === optValue ? 'checked' : '';

            return `
                <div class="form-check">
                    <input 
                        type="radio" 
                        class="form-check-input ${className}" 
                        id="${fieldId}"
                        name="${name}" 
                        value="${optValue}"
                        ${checked}
                        ${required ? 'required' : ''}
                    />
                    <label class="form-check-label" for="${fieldId}">
                        ${optLabel}
                    </label>
                </div>
            `;
        }).join('');

        return this.wrapField('', name, label, optionsHtml, help, required);
    }

    /**
     * Componentes especializados
     */
    createPhoneInput(config) {
        return this.createInput({
            ...config,
            type: 'tel',
            placeholder: config.placeholder || '(11) 99999-9999',
            attributes: {
                'data-mask': '(00) 00000-0000',
                'data-validation': 'phone'
            }
        });
    }

    createEmailInput(config) {
        return this.createInput({
            ...config,
            type: 'email',
            placeholder: config.placeholder || 'exemplo@email.com',
            attributes: {
                'data-validation': 'email'
            }
        });
    }

    createCPFInput(config) {
        return this.createInput({
            ...config,
            type: 'text',
            placeholder: config.placeholder || '000.000.000-00',
            attributes: {
                'data-mask': '000.000.000-00',
                'data-validation': 'cpf'
            }
        });
    }

    createCNPJInput(config) {
        return this.createInput({
            ...config,
            type: 'text',
            placeholder: config.placeholder || '00.000.000/0000-00',
            attributes: {
                'data-mask': '00.000.000/0000-00',
                'data-validation': 'cnpj'
            }
        });
    }

    createCEPInput(config) {
        return this.createInput({
            ...config,
            type: 'text',
            placeholder: config.placeholder || '00000-000',
            attributes: {
                'data-mask': '00000-000',
                'data-validation': 'cep'
            }
        });
    }

    createCurrencyInput(config) {
        return this.createInput({
            ...config,
            type: 'text',
            placeholder: config.placeholder || 'R$ 0,00',
            attributes: {
                'data-mask': 'currency',
                'data-validation': 'currency'
            }
        });
    }

    createPasswordInput(config) {
        const {
            name,
            label,
            required = false,
            help = '',
            showStrength = true
        } = config;

        const fieldId = `field_${name}_${this.getFieldCounter()}`;

        const input = `
            <div class="input-group">
                <input 
                    type="password" 
                    class="form-control" 
                    id="${fieldId}"
                    name="${name}" 
                    placeholder="Digite sua senha"
                    ${required ? 'required' : ''}
                    data-validation="password"
                />
                <button class="btn btn-outline-secondary" type="button" onclick="togglePassword('${fieldId}')">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
            ${showStrength ? `
                <div class="password-strength">
                    <div class="password-strength-bar">
                        <div class="password-strength-fill" id="${fieldId}_strength"></div>
                    </div>
                    <small class="form-text text-muted" id="${fieldId}_strength_text">
                        Digite uma senha para ver a força
                    </small>
                </div>
            ` : ''}
        `;

        return this.wrapField(fieldId, name, label, input, help, required);
    }

    createDateInput(config) {
        return this.createInput({
            ...config,
            type: 'date',
            attributes: {
                'data-validation': 'date'
            }
        });
    }

    createTimeInput(config) {
        return this.createInput({
            ...config,
            type: 'time',
            attributes: {
                'data-validation': 'time'
            }
        });
    }

    createDateTimeInput(config) {
        return this.createInput({
            ...config,
            type: 'datetime-local',
            attributes: {
                'data-validation': 'datetime'
            }
        });
    }

    createFileInput(config) {
        const {
            name,
            label,
            required = false,
            help = '',
            accept = '',
            multiple = false
        } = config;

        const fieldId = `field_${name}_${this.getFieldCounter()}`;

        const input = `
            <input 
                type="file" 
                class="form-control" 
                id="${fieldId}"
                name="${name}" 
                ${accept ? `accept="${accept}"` : ''}
                ${multiple ? 'multiple' : ''}
                ${required ? 'required' : ''}
            />
        `;

        return this.wrapField(fieldId, name, label, input, help, required);
    }

    createColorInput(config) {
        return this.createInput({
            ...config,
            type: 'color'
        });
    }

    createRangeInput(config) {
        const {
            name,
            label,
            min = 0,
            max = 100,
            step = 1,
            value = 50,
            required = false,
            help = ''
        } = config;

        const fieldId = `field_${name}_${this.getFieldCounter()}`;

        const input = `
            <div class="range-container">
                <input 
                    type="range" 
                    class="form-range" 
                    id="${fieldId}"
                    name="${name}" 
                    min="${min}"
                    max="${max}"
                    step="${step}"
                    value="${value}"
                    ${required ? 'required' : ''}
                    oninput="document.getElementById('${fieldId}_value').textContent = this.value"
                />
                <div class="range-value">
                    Valor: <span id="${fieldId}_value">${value}</span>
                </div>
            </div>
        `;

        return this.wrapField(fieldId, name, label, input, help, required);
    }

    /**
     * Componentes compostos
     */
    createForm(config) {
        const {
            module,
            title,
            subtitle = '',
            fields = [],
            actions = [],
            className = '',
            onSubmit = null
        } = config;

        const formId = `form_${module}_${this.getFieldCounter()}`;
        const fieldsHtml = fields.map(field => this.createComponent(field.type, field)).join('');
        const actionsHtml = actions.map(action => this.createButton(action)).join('');

        const form = this.templates.get('form-wrapper')
            .replace('{formClass}', className)
            .replace('{module}', module)
            .replace('{title}', title)
            .replace('{subtitle}', subtitle ? `<p class="form-subtitle">${subtitle}</p>` : '')
            .replace('{fields}', fieldsHtml)
            .replace('{actions}', actionsHtml);

        // Configurar eventos
        setTimeout(() => {
            const formElement = document.getElementById(formId);
            if (formElement && onSubmit) {
                formElement.addEventListener('submit', onSubmit);
            }
            
            // Configurar validação em tempo real
            if (window.UnifiedValidator) {
                window.UnifiedValidator.setupRealtimeValidation(module, formElement);
            }
        }, 100);

        return form;
    }

    createModalForm(config) {
        const {
            id,
            title,
            size = 'modal-lg',
            form,
            actions = []
        } = config;

        const modalId = id || `modal_${this.getFieldCounter()}`;
        const formHtml = this.createForm(form);

        // Garantir botão "Voltar ao Dashboard" por padrão
        const hasBack = actions.some(action => (action.text || '').toLowerCase().includes('voltar ao dashboard'));
        const finalActions = hasBack ? actions : [
            {
                text: 'Voltar ao Dashboard',
                className: 'btn-secondary',
                onclick: `FormComponents.backToDashboard('${modalId}')`,
                icon: 'fas fa-arrow-left me-2'
            },
            ...actions
        ];

        const actionsHtml = finalActions.map(action => this.createButton(action)).join('');

        return this.templates.get('modal-wrapper')
            .replace('{modalId}', modalId)
            .replace('{modalSize}', size)
            .replace('{title}', title)
            .replace('{content}', formHtml)
            .replace('{actions}', actionsHtml);
    }

    createFieldset(config) {
        const {
            legend,
            fields = [],
            className = ''
        } = config;

        const fieldsHtml = fields.map(field => this.createComponent(field.type, field)).join('');

        return `
            <fieldset class="form-fieldset ${className}">
                <legend class="form-legend">${legend}</legend>
                ${fieldsHtml}
            </fieldset>
        `;
    }

    createWizard(config) {
        const {
            steps = [],
            currentStep = 0,
            onStepChange = null
        } = config;

        const wizardId = `wizard_${this.getFieldCounter()}`;
        const stepsHtml = steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const statusClass = isCompleted ? 'completed' : (isActive ? 'active' : '');

            return `
                <div class="wizard-step ${statusClass}" data-step="${index}">
                    <div class="step-number">${index + 1}</div>
                    <div class="step-title">${step.title}</div>
                </div>
            `;
        }).join('');

        const currentStepContent = steps[currentStep] ? 
            this.createForm(steps[currentStep].form) : '';

        return `
            <div class="wizard-container" id="${wizardId}">
                <div class="wizard-steps">
                    ${stepsHtml}
                </div>
                <div class="wizard-content">
                    ${currentStepContent}
                </div>
            </div>
        `;
    }

    /**
     * Utilitários
     */
    createComponent(type, config) {
        const factory = this.components.get(type);
        if (!factory) {
            console.error(`Componente '${type}' não encontrado`);
            return '';
        }
        return factory(config);
    }

    createButton(config) {
        const {
            text,
            type = 'button',
            className = 'btn-primary',
            onclick = '',
            disabled = false,
            icon = ''
        } = config;

        const iconHtml = icon ? `<i class="${icon}"></i>` : '';

        return `
            <button 
                type="${type}" 
                class="btn ${className}" 
                ${onclick ? `onclick="${onclick}"` : ''}
                ${disabled ? 'disabled' : ''}
            >
                ${iconHtml}
                ${text}
            </button>
        `;
    }

    wrapField(fieldId, fieldName, label, input, help, required) {
        const requiredHtml = required ? '<span class="text-danger">*</span>' : '';
        const helpHtml = help ? `<small class="form-help">${help}</small>` : '';

        return this.templates.get('field-wrapper')
            .replace('{fieldId}', fieldId)
            .replace('{fieldName}', fieldName)
            .replace('{label}', label)
            .replace('{labelClass}', required ? 'required' : '')
            .replace('{required}', requiredHtml)
            .replace('{input}', input)
            .replace('{help}', helpHtml);
    }

    /**
     * Métodos de conveniência
     */
    renderForm(containerId, config) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container '${containerId}' não encontrado`);
            return;
        }

        const formHtml = this.createForm(config);
        container.innerHTML = formHtml;
    }

    renderModal(config) {
        // Garantir que o modal tenha um ID consistente
        if (!config.id) {
            config.id = `modal_${this.getFieldCounter()}`;
        }

        const modalHtml = this.createModalForm(config);
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const el = document.getElementById(config.id);
        if (!el) {
            console.error(`[FormComponents] Elemento do modal '${config.id}' não encontrado`);
            return null;
        }

        // Mostrar modal com Bootstrap (se disponível)
        if (window.bootstrap && bootstrap.Modal) {
            const modal = new bootstrap.Modal(el);
            modal.show();
            return modal;
        } else {
            // Fallback simples: mostrar via classe 'show'
            el.classList.add('show');
            el.style.display = 'block';
            return el;
        }
    }

    backToDashboard(modalId) {
        try {
            const el = document.getElementById(modalId);
            if (el && window.bootstrap && bootstrap.Modal) {
                const instance = bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el);
                instance.hide();
            }
            // Remover modal do DOM após ocultar para evitar resíduos
            setTimeout(() => {
                const modalContainer = document.getElementById(modalId);
                if (modalContainer) {
                    const wrapper = modalContainer.closest('.modal');
                    if (wrapper) {
                        wrapper.remove();
                    } else {
                        modalContainer.remove();
                    }
                }
            }, 200);

            if (window.NavigationSystem && typeof window.NavigationSystem.navigateToModule === 'function') {
                window.NavigationSystem.navigateToModule('dashboard');
            } else if (typeof window.navigateToDashboard === 'function') {
                window.navigateToDashboard();
            } else if (typeof window.location !== 'undefined') {
                window.location.href = '/?module=dashboard';
            } else {
                console.warn('[FormComponents] NavigationSystem não disponível.');
            }
        } catch (e) {
            console.warn('[FormComponents] Falha ao voltar ao dashboard:', e);
            if (window.NavigationSystem && typeof window.NavigationSystem.navigateToModule === 'function') {
                window.NavigationSystem.navigateToModule('dashboard');
            }
        }
    }

    // Validação de formulário
    async validateForm(formElement) {
        const module = formElement.dataset.module;
        if (!module || !window.UnifiedValidator) {
            return { isValid: true };
        }

        const formData = new FormData(formElement);
        const data = Object.fromEntries(formData.entries());
        
        return await window.UnifiedValidator.validateForm(module, data);
    }

    // Submissão de formulário
    async submitForm(formElement, options = {}) {
        const module = formElement.dataset.module;
        if (!module || !window.CRUDManager) {
            console.error('Módulo ou CRUDManager não encontrado');
            return;
        }

        // Validar formulário
        const validation = await this.validateForm(formElement);
        if (!validation.isValid) {
            this.displayFormErrors(formElement, validation);
            return { success: false, errors: validation };
        }

        // Submeter dados
        const formData = new FormData(formElement);
        const data = Object.fromEntries(formData.entries());
        
        const result = options.id ? 
            await window.CRUDManager.update(module, options.id, data) :
            await window.CRUDManager.create(module, data);

        if (result.success) {
            this.showSuccess('Dados salvos com sucesso!');
            if (options.onSuccess) {
                options.onSuccess(result);
            }
        } else {
            this.showError(result.error);
        }

        return result;
    }

    displayFormErrors(formElement, validation) {
        Object.entries(validation.fields).forEach(([fieldName, result]) => {
            const field = formElement.querySelector(`[name="${fieldName}"]`);
            if (field && !result.isValid) {
                window.UnifiedValidator.displayFieldValidation(field, result);
            }
        });
    }

    showSuccess(message) {
        if (window.NotificationSystem) {
            window.NotificationSystem.success(message);
        } else {
            alert(message);
        }
    }

    showError(message) {
        if (window.NotificationSystem) {
            window.NotificationSystem.error(message);
        } else {
            alert(message);
        }
    }
}

// Funções globais de utilidade
window.togglePassword = function(fieldId) {
    const field = document.getElementById(fieldId);
    const button = field.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (field.type === 'password') {
        field.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        field.type = 'password';
        icon.className = 'fas fa-eye';
    }
};

// Instância global do FormComponents
window.FormComponents = new FormComponents();

console.log('FormComponents carregado com sucesso');
