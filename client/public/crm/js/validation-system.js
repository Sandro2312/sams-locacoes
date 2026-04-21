/**
 * Sistema de Validação Robusto para SAMS CRM/ERP
 * Garante a integridade dos dados nas operações CRUD
 */

class ValidationSystem {
    constructor() {
        this.rules = {
            leads: {
                nome: {
                    required: true,
                    minLength: 2,
                    maxLength: 100,
                    message: 'Nome deve ter entre 2 e 100 caracteres'
                },
                email: {
                    required: false,
                    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Email deve ter um formato válido'
                },
                telefone: {
                    required: false,
                    message: 'Telefone deve ser válido'
                },
                empresa: {
                    required: false,
                    maxLength: 100,
                    message: 'Nome da empresa deve ter no máximo 100 caracteres'
                },
                origem: {
                    required: false,
                    message: 'Origem deve ser válida'
                },
                status: {
                    required: false,
                    message: 'Status deve ser válido'
                }
            },
            clientes: {
                nome: {
                    required: true,
                    minLength: 2,
                    maxLength: 100,
                    message: 'Nome/Razão Social deve ter entre 2 e 100 caracteres'
                },
                documento: {
                    required: false,
                    message: 'CNPJ/CPF deve ser válido'
                },
                email: {
                    required: false,
                    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Email deve ter um formato válido'
                },
                telefone: {
                    required: false,
                    message: 'Telefone deve ser válido'
                },
                endereco: {
                    required: false,
                    maxLength: 200,
                    message: 'Endereço deve ter no máximo 200 caracteres'
                },
                responsavel: {
                    required: false,
                    maxLength: 100,
                    message: 'Responsável deve ser válido'
                },
                status: {
                    required: false,
                    message: 'Status deve ser válido'
                }
            },
            briefings: {
                titulo: {
                    required: true,
                    minLength: 3,
                    maxLength: 100,
                    message: 'Título deve ter entre 3 e 100 caracteres'
                },
                cliente: {
                    required: true,
                    message: 'Cliente é obrigatório'
                },
                descricao: {
                    required: true,
                    minLength: 10,
                    maxLength: 1000,
                    message: 'Descrição deve ter entre 10 e 1000 caracteres'
                },
                prazo: {
                    required: true,
                    pattern: /^\d{4}-\d{2}-\d{2}$/,
                    message: 'Data deve estar no formato YYYY-MM-DD'
                },
                orcamento: {
                    required: true,
                    pattern: /^\d+(\.\d{2})?$/,
                    message: 'Orçamento deve ser um valor válido'
                },
                status: {
                    required: true,
                    message: 'Status é obrigatório'
                }
            },

            // Validações para Campanhas de Marketing
            campanhas: {
                nome: {
                    required: true,
                    minLength: 3,
                    maxLength: 100,
                    message: 'Nome da campanha deve ter entre 3 e 100 caracteres'
                },
                tipo: {
                    required: true,
                    message: 'Tipo de campanha é obrigatório'
                },
                status: {
                    required: false,
                    message: 'Status deve ser válido'
                },
                data_inicio: {
                    required: false,
                    pattern: /^\d{4}-\d{2}-\d{2}$/,
                    message: 'Data de início deve estar no formato YYYY-MM-DD'
                },
                data_fim: {
                    required: false,
                    pattern: /^\d{4}-\d{2}-\d{2}$/,
                    message: 'Data de fim deve estar no formato YYYY-MM-DD'
                },
                orcamento: {
                    required: false,
                    pattern: /^\d+(\.\d{2})?$/,
                    min: 0,
                    message: 'Orçamento deve ser um valor válido e positivo'
                },
                meta_leads: {
                    required: false,
                    pattern: /^\d+$/,
                    min: 0,
                    message: 'Meta de leads deve ser um número inteiro positivo'
                },
                descricao: {
                    required: false,
                    maxLength: 1000,
                    message: 'Descrição não pode exceder 1000 caracteres'
                }
            },

            // Validações para Contatos/Segmentação
            contatos: {
                nome: {
                    required: true,
                    minLength: 2,
                    maxLength: 100,
                    pattern: /^[A-Za-zÀ-ÿ\s]+$/,
                    message: 'Nome deve conter apenas letras e espaços, entre 2 e 100 caracteres'
                },
                email: {
                    required: true,
                    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Email deve ter um formato válido'
                },
                telefone: {
                    required: false,
                    pattern: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
                    message: 'Telefone deve estar no formato (XX) XXXXX-XXXX'
                },
                empresa: {
                    required: false,
                    maxLength: 100,
                    message: 'Nome da empresa não pode exceder 100 caracteres'
                },
                cargo: {
                    required: false,
                    maxLength: 50,
                    message: 'Cargo não pode exceder 50 caracteres'
                },
                segmento: {
                    required: false,
                    message: 'Segmento deve ser válido'
                },
                status: {
                    required: false,
                    message: 'Status deve ser válido'
                },
                tags: {
                    required: false,
                    maxLength: 200,
                    message: 'Tags não podem exceder 200 caracteres'
                },
                observacoes: {
                    required: false,
                    maxLength: 500,
                    message: 'Observações não podem exceder 500 caracteres'
                }
            },
            projetos: {
                nome: {
                    required: true,
                    minLength: 3,
                    maxLength: 100,
                    message: 'Nome do projeto deve ter entre 3 e 100 caracteres'
                },
                briefing_id: {
                    required: false,
                    pattern: /^\d+$/,
                    message: 'Briefing deve ser válido'
                },
                responsavel_id: {
                    required: false,
                    pattern: /^\d+$/,
                    message: 'Gerente do projeto deve ser válido'
                },
                data_inicio: {
                    required: false,
                    pattern: /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})$/,
                    message: 'Data de início deve ser válida'
                },
                data_fim: {
                    required: false,
                    pattern: /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})$/,
                    message: 'Data de fim deve ser válida'
                },
                status: {
                    required: false,
                    enum: ['recebido', 'em_elaboracao', 'aguardando_revisao', 'revisao_cliente', 'aprovado', 'finalizado', 'cancelado'],
                    message: 'Status deve ser uma das opções válidas'
                },
                custo_estimado: {
                    required: false,
                    pattern: /^\d+([.,]\d{1,2})?$/,
                    message: 'Custo estimado deve ser um valor válido'
                },
                comissao_percentual: {
                    required: false,
                    pattern: /^\d+([.,]\d{1,2})?$/,
                    message: 'Comissão deve ser um valor válido'
                }
            },
            custos: {
                descricao: {
                    required: true,
                    minLength: 3,
                    maxLength: 200,
                    message: 'Descrição deve ter entre 3 e 200 caracteres'
                },
                valor: {
                    required: true,
                    pattern: /^\d+(\.\d{2})?$/,
                    message: 'Valor deve ser um número válido'
                },
                categoria: {
                    required: true,
                    enum: ['Material', 'Mão de Obra', 'Transporte', 'Equipamento', 'Outros'],
                    message: 'Categoria deve ser uma das opções válidas'
                },
                projeto: {
                    required: true,
                    message: 'Projeto é obrigatório'
                }
            },
            tarefas_administrativas: {
                titulo: {
                    required: true,
                    minLength: 3,
                    maxLength: 100,
                    message: 'Título deve ter entre 3 e 100 caracteres'
                },
                responsavel: {
                    required: true,
                    message: 'Responsável é obrigatório'
                },
                prazo: {
                    required: true,
                    pattern: /^\d{4}-\d{2}-\d{2}$/,
                    message: 'Prazo deve estar no formato YYYY-MM-DD'
                },
                prioridade: {
                    required: true,
                    enum: ['Baixa', 'Média', 'Alta', 'Urgente'],
                    message: 'Prioridade deve ser uma das opções válidas'
                },
                status: {
                    required: true,
                    enum: ['Pendente', 'Em Andamento', 'Concluída', 'Cancelada'],
                    message: 'Status deve ser uma das opções válidas'
                }
            },
            demandas_juridicas: {
                titulo: {
                    required: true,
                    minLength: 3,
                    maxLength: 100,
                    message: 'Título deve ter entre 3 e 100 caracteres'
                },
                tipo_demanda: {
                    required: true,
                    enum: ['Contrato', 'Trabalhista', 'Tributário', 'Cível', 'Outros'],
                    message: 'Tipo de demanda deve ser uma das opções válidas'
                },
                cliente: {
                    required: true,
                    message: 'Cliente é obrigatório'
                },
                advogado_responsavel: {
                    required: true,
                    message: 'Advogado responsável é obrigatório'
                },
                data_abertura: {
                    required: true,
                    pattern: /^\d{4}-\d{2}-\d{2}$/,
                    message: 'Data de abertura deve estar no formato YYYY-MM-DD'
                },
                status: {
                    required: true,
                    enum: ['Aberta', 'Em Análise', 'Resolvida', 'Arquivada'],
                    message: 'Status deve ser uma das opções válidas'
                }
            },
            adicionais: {
                nome: {
                    required: true,
                    minLength: 2,
                    maxLength: 100,
                    message: 'Nome do item deve ter entre 2 e 100 caracteres'
                },
                categoria: {
                    required: true,
                    enum: ['Decoração', 'Som e Luz', 'Mobiliário', 'Catering', 'Outros'],
                    message: 'Categoria deve ser uma das opções válidas'
                },
                valor_unitario: {
                    required: true,
                    pattern: /^\d+(\.\d{2})?$/,
                    message: 'Valor unitário deve ser um número válido'
                },
                quantidade_disponivel: {
                    required: true,
                    pattern: /^\d+$/,
                    message: 'Quantidade deve ser um número inteiro'
                },
                status: {
                    required: true,
                    enum: ['Disponível', 'Indisponível', 'Manutenção'],
                    message: 'Status deve ser uma das opções válidas'
                }
            }
        };
        
        this.errorMessages = [];
        this.init();
    }

    init() {
        console.log('[ValidationSystem] Sistema de validação inicializado');
    }

    /**
     * Valida um formulário completo
     */
    validateForm(module, data) {
        console.log(`[ValidationSystem] Iniciando validação para módulo: ${module}`);
        console.log(`[ValidationSystem] Dados recebidos:`, data);
        
        // Verificar se os dados são válidos
        if (!data || typeof data !== 'object') {
            console.error('[ValidationSystem] Dados inválidos fornecidos para validação:', data);
            this.addError('system', 'Dados inválidos fornecidos para validação');
            return false;
        }
        
        // Verificar se o módulo existe nas regras
        if (!this.rules[module]) {
            console.warn(`[ValidationSystem] Nenhuma regra de validação encontrada para o módulo: ${module}`);
            return true; // Se não há regras, considera válido
        }
        
        this.errorMessages = []; // Limpar erros anteriores
        const rules = this.rules[module];
        
        console.log(`[ValidationSystem] Regras encontradas para ${module}:`, Object.keys(rules));
        
        // Validar cada campo definido nas regras
        for (const fieldName in rules) {
            const fieldRules = rules[fieldName];
            const fieldValue = data[fieldName];
            
            console.log(`[ValidationSystem] Validando campo '${fieldName}' com valor:`, fieldValue);
            
            // Se o campo não está presente nos dados e é obrigatório
            if (fieldRules.required && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
                console.log(`[ValidationSystem] Campo obrigatório '${fieldName}' está vazio`);
                this.validateField(fieldName, fieldValue, fieldRules);
                continue;
            }
            
            // Se o campo não está presente e não é obrigatório, pular validação
            if (!fieldRules.required && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
                console.log(`[ValidationSystem] Campo opcional '${fieldName}' está vazio - ignorando validação`);
                continue;
            }
            
            // Validar o campo
            this.validateField(fieldName, fieldValue, fieldRules);
        }
        
        const isValid = this.errorMessages.length === 0;
        
        if (isValid) {
            console.log(`[ValidationSystem] ✅ Validação bem-sucedida para ${module}`);
        } else {
            console.log(`[ValidationSystem] ❌ Validação falhou para ${module}. Erros encontrados:`, this.errorMessages);
        }
        
        return isValid;
    }

    /**
     * Valida um campo individual
     */
    validateField(fieldName, value, rule) {
        let isValid = true;
        const fieldValue = value ? value.toString().trim() : '';

        // Log para debugging
        console.log(`[ValidationSystem] Validando campo '${fieldName}':`, {
            value: value,
            fieldValue: fieldValue,
            rule: rule
        });

        // Verificar se o campo é obrigatório
        if (rule.required && (!fieldValue || fieldValue === '')) {
            const errorMsg = rule.message || `${this.getFieldLabel(fieldName)} é obrigatório`;
            console.log(`[ValidationSystem] Campo obrigatório vazio: ${fieldName} - ${errorMsg}`);
            this.addError(fieldName, errorMsg);
            return false;
        }

        // Se o campo está vazio e não é obrigatório, é válido
        if (!fieldValue && !rule.required) {
            console.log(`[ValidationSystem] Campo opcional vazio aceito: ${fieldName}`);
            return true;
        }

        // Verificar comprimento mínimo
        if (rule.minLength && fieldValue.length < rule.minLength) {
            const errorMsg = rule.message || `${this.getFieldLabel(fieldName)} deve ter pelo menos ${rule.minLength} caracteres`;
            console.log(`[ValidationSystem] Comprimento mínimo não atendido: ${fieldName} - ${errorMsg}`);
            this.addError(fieldName, errorMsg);
            isValid = false;
        }

        // Verificar comprimento máximo
        if (rule.maxLength && fieldValue.length > rule.maxLength) {
            const errorMsg = rule.message || `${this.getFieldLabel(fieldName)} deve ter no máximo ${rule.maxLength} caracteres`;
            console.log(`[ValidationSystem] Comprimento máximo excedido: ${fieldName} - ${errorMsg}`);
            this.addError(fieldName, errorMsg);
            isValid = false;
        }

        // Verificar padrão (regex) - apenas se o campo não estiver vazio
        if (rule.pattern && fieldValue && !rule.pattern.test(fieldValue)) {
            const errorMsg = rule.message || `${this.getFieldLabel(fieldName)} não atende ao formato exigido`;
            console.log(`[ValidationSystem] Padrão não atendido: ${fieldName} - ${errorMsg}`);
            this.addError(fieldName, errorMsg);
            isValid = false;
        }

        // Verificar valores permitidos (enum) - apenas se o campo não estiver vazio
        if (rule.enum && fieldValue && !rule.enum.includes(fieldValue)) {
            const errorMsg = rule.message || `${this.getFieldLabel(fieldName)} deve ser um dos valores permitidos`;
            console.log(`[ValidationSystem] Valor não permitido: ${fieldName} - ${errorMsg}`);
            this.addError(fieldName, errorMsg);
            isValid = false;
        }

        // Validação customizada - apenas se o campo não estiver vazio
        if (rule.custom && typeof rule.custom === 'function' && fieldValue) {
            const customResult = rule.custom(fieldValue);
            if (!customResult) {
                const errorMsg = rule.message || `${this.getFieldLabel(fieldName)} é inválido`;
                console.log(`[ValidationSystem] Validação customizada falhou: ${fieldName} - ${errorMsg}`);
                this.addError(fieldName, errorMsg);
                isValid = false;
            }
        }

        if (isValid) {
            console.log(`[ValidationSystem] Campo válido: ${fieldName}`);
        }

        return isValid;
    }

    /**
     * Validação customizada para documentos (CPF/CNPJ)
     */
    validateDocument(document) {
        if (!document) return false;
        
        // Remove caracteres não numéricos
        const cleanDoc = document.replace(/\D/g, '');
        
        // Verifica CPF (11 dígitos)
        if (cleanDoc.length === 11) {
            return ValidationSystem.validateCPF(cleanDoc);
        }
        
        // Verifica CNPJ (14 dígitos)
        if (cleanDoc.length === 14) {
            return ValidationSystem.validateCNPJ(cleanDoc);
        }
        
        return false;
    }

    /**
     * Valida CPF
     */
    static validateCPF(cpf) {
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
    }

    /**
     * Valida CNPJ
     */
    static validateCNPJ(cnpj) {
        if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
            return false;
        }

        let length = cnpj.length - 2;
        let numbers = cnpj.substring(0, length);
        let digits = cnpj.substring(length);
        let sum = 0;
        let pos = length - 7;

        for (let i = length; i >= 1; i--) {
            sum += numbers.charAt(length - i) * pos--;
            if (pos < 2) pos = 9;
        }

        let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
        if (result !== parseInt(digits.charAt(0))) return false;

        length = length + 1;
        numbers = cnpj.substring(0, length);
        sum = 0;
        pos = length - 7;

        for (let i = length; i >= 1; i--) {
            sum += numbers.charAt(length - i) * pos--;
            if (pos < 2) pos = 9;
        }

        result = sum % 11 < 2 ? 0 : 11 - sum % 11;
        return result === parseInt(digits.charAt(1));
    }

    /**
     * Adiciona erro à lista
     */
    addError(field, message) {
        this.errorMessages.push({
            field: field,
            message: message
        });
    }

    /**
     * Retorna label amigável para o campo
     */
    getFieldLabel(fieldName) {
        const labels = {
            nome: 'Nome',
            email: 'Email',
            telefone: 'Telefone',
            empresa: 'Empresa',
            origem: 'Origem',
            status: 'Status',
            documento: 'CNPJ/CPF',
            endereco: 'Endereço',
            responsavel: 'Responsável'
        };
        
        return labels[fieldName] || fieldName;
    }

    /**
     * Retorna todos os erros de validação
     */
    getErrors() {
        return this.errorMessages;
    }

    /**
     * Retorna erros formatados para exibição
     */
    getFormattedErrors() {
        return this.errorMessages.map(error => error.message).join('\n');
    }

    /**
     * Método para obter erros de validação
     */
    getValidationErrors() {
        return this.errorMessages;
    }

    /**
     * Aplica máscara de telefone
     */
    static applyPhoneMask(value) {
        if (!value) return '';
        
        const numbers = value.replace(/\D/g, '');
        
        // Aplicar máscara progressiva baseada no número de dígitos
        if (numbers.length <= 2) {
            return numbers;
        } else if (numbers.length <= 6) {
            return numbers.replace(/(\d{2})(\d+)/, '($1) $2');
        } else if (numbers.length <= 10) {
            return numbers.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
        } else {
            return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        }
    }

    /**
     * Aplica máscara de CPF
     */
    static applyCPFMask(value) {
        if (!value) return '';
        
        const numbers = value.replace(/\D/g, '');
        return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    /**
     * Aplica máscara de CNPJ
     */
    static applyCNPJMask(value) {
        if (!value) return '';
        
        const numbers = value.replace(/\D/g, '');
        return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }

    /**
     * Detecta e aplica máscara apropriada para documento
     */
    static applyDocumentMask(value) {
        if (!value) return '';
        
        const numbers = value.replace(/\D/g, '');
        
        if (numbers.length <= 11) {
            return ValidationSystem.applyCPFMask(value);
        } else {
            return ValidationSystem.applyCNPJMask(value);
        }
    }

    /**
     * Aplica máscaras automaticamente nos campos do formulário
     * Método seguro que evita loops
     */
    static applyMasksToForm(formElement) {
        if (!formElement) return;

        // Aplicar máscara de telefone
        const phoneFields = formElement.querySelectorAll('input[name="telefone"]');
        phoneFields.forEach(field => {
            if (!field.dataset.maskApplied) {
                field.addEventListener('input', function(e) {
                    const cursorPos = e.target.selectionStart;
                    const oldValue = e.target.value;
                    const newValue = ValidationSystem.applyPhoneMask(oldValue);
                    
                    // Só atualizar se o valor realmente mudou e não está vazio
                    if (newValue !== oldValue && newValue.length > 0) {
                        e.target.value = newValue;
                        // Manter posição do cursor
                        const diff = newValue.length - oldValue.length;
                        const newCursorPos = Math.min(cursorPos + diff, newValue.length);
                        e.target.setSelectionRange(newCursorPos, newCursorPos);
                    }
                });
                field.dataset.maskApplied = 'true';
            }
        });

        // Aplicar máscara de documento
        const docFields = formElement.querySelectorAll('input[name="documento"]');
        docFields.forEach(field => {
            if (!field.dataset.maskApplied) {
                field.addEventListener('input', function(e) {
                    const cursorPos = e.target.selectionStart;
                    const oldValue = e.target.value;
                    const newValue = ValidationSystem.applyDocumentMask(oldValue);
                    
                    if (newValue !== oldValue) {
                        e.target.value = newValue;
                        // Manter posição do cursor
                        const newCursorPos = cursorPos + (newValue.length - oldValue.length);
                        e.target.setSelectionRange(newCursorPos, newCursorPos);
                    }
                });
                field.dataset.maskApplied = 'true';
            }
        });
    }
}

// Instância global do sistema de validação
window.ValidationSystem = new ValidationSystem();

console.log('[ValidationSystem] Sistema de validação carregado com sucesso');
