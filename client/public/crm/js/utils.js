// Utilitários SAMS Locações CRM/ERP
const Utils = {
    // Formatação de dados
    formatters: {
        // Formatar data para exibição
        formatDate(date, format = 'dd/mm/yyyy') {
            if (!date) return '';
            
            const d = new Date(date);
            if (isNaN(d.getTime())) return '';
            
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            
            switch (format) {
                case 'dd/mm/yyyy':
                    return `${day}/${month}/${year}`;
                case 'yyyy-mm-dd':
                    return `${year}-${month}-${day}`;
                case 'dd/mm':
                    return `${day}/${month}`;
                default:
                    return d.toLocaleDateString('pt-BR');
            }
        },

        // Formatar moeda
        formatCurrency(value) {
            if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
            
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }).format(value);
        },

        // Formatar CNPJ
        formatCNPJ(cnpj) {
            if (!cnpj) return '';
            
            const cleaned = cnpj.replace(/\D/g, '');
            if (cleaned.length !== 14) return cnpj;
            
            return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        },

        // Formatar CPF
        formatCPF(cpf) {
            if (!cpf) return '';
            
            const cleaned = cpf.replace(/\D/g, '');
            if (cleaned.length !== 11) return cpf;
            
            return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        },

        // Formatar telefone
        formatPhone(phone) {
            if (!phone) return '';
            
            const cleaned = phone.replace(/\D/g, '');
            
            if (cleaned.length === 10) {
                return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
            } else if (cleaned.length === 11) {
                return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
            }
            
            return phone;
        },

        // Formatar CEP
        formatCEP(cep) {
            if (!cep) return '';
            
            const cleaned = cep.replace(/\D/g, '');
            if (cleaned.length !== 8) return cep;
            
            return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
        }
    },

    // Validações
    validators: {
        // Validar email
        isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },

        // Validar CNPJ
        isValidCNPJ(cnpj) {
            const cleaned = cnpj.replace(/\D/g, '');
            
            if (cleaned.length !== 14) return false;
            if (/^(\d)\1+$/.test(cleaned)) return false;
            
            // Validação dos dígitos verificadores
            let sum = 0;
            let weight = 2;
            
            for (let i = 11; i >= 0; i--) {
                sum += parseInt(cleaned.charAt(i)) * weight;
                weight = weight === 9 ? 2 : weight + 1;
            }
            
            let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
            if (parseInt(cleaned.charAt(12)) !== digit) return false;
            
            sum = 0;
            weight = 2;
            
            for (let i = 12; i >= 0; i--) {
                sum += parseInt(cleaned.charAt(i)) * weight;
                weight = weight === 9 ? 2 : weight + 1;
            }
            
            digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
            return parseInt(cleaned.charAt(13)) === digit;
        },

        // Validar CPF
        isValidCPF(cpf) {
            const cleaned = cpf.replace(/\D/g, '');
            
            if (cleaned.length !== 11) return false;
            if (/^(\d)\1+$/.test(cleaned)) return false;
            
            let sum = 0;
            for (let i = 0; i < 9; i++) {
                sum += parseInt(cleaned.charAt(i)) * (10 - i);
            }
            
            let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
            if (parseInt(cleaned.charAt(9)) !== digit) return false;
            
            sum = 0;
            for (let i = 0; i < 10; i++) {
                sum += parseInt(cleaned.charAt(i)) * (11 - i);
            }
            
            digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
            return parseInt(cleaned.charAt(10)) === digit;
        },

        // Validar telefone
        isValidPhone(phone) {
            const cleaned = phone.replace(/\D/g, '');
            return cleaned.length === 10 || cleaned.length === 11;
        },

        // Validar CEP
        isValidCEP(cep) {
            const cleaned = cep.replace(/\D/g, '');
            return cleaned.length === 8;
        },

        // Validar campo obrigatório
        isRequired(value) {
            return value !== null && value !== undefined && String(value).trim() !== '';
        }
    },

    // Manipulação de DOM
    dom: {
        // Criar elemento com atributos
        createElement(tag, attributes = {}, content = '') {
            const element = document.createElement(tag);
            
            Object.keys(attributes).forEach(key => {
                if (key === 'className') {
                    element.className = attributes[key];
                } else if (key === 'innerHTML') {
                    element.innerHTML = attributes[key];
                } else {
                    element.setAttribute(key, attributes[key]);
                }
            });
            
            if (content) {
                element.textContent = content;
            }
            
            return element;
        },

        // Mostrar/ocultar elemento
        toggle(element, show = null) {
            if (typeof element === 'string') {
                element = document.getElementById(element);
            }
            
            if (!element) return;
            
            if (show === null) {
                element.classList.toggle('hidden');
            } else {
                element.classList.toggle('hidden', !show);
            }
        },

        // Adicionar classe com animação
        addClass(element, className, duration = 300) {
            if (typeof element === 'string') {
                element = document.getElementById(element);
            }
            
            if (!element) return;
            
            element.classList.add(className);
            
            if (duration > 0) {
                setTimeout(() => {
                    element.classList.add('transition-all');
                    element.style.transitionDuration = `${duration}ms`;
                }, 10);
            }
        },

        // Remover classe
        removeClass(element, className) {
            if (typeof element === 'string') {
                element = document.getElementById(element);
            }
            
            if (!element) return;
            
            element.classList.remove(className);
        }
    },

    // Notificações
    notifications: {
        // Mostrar notificação de sucesso
        success(message, duration = 3000) {
            this.show(message, 'success', duration);
        },

        // Mostrar notificação de erro
        error(message, duration = 5000) {
            this.show(message, 'error', duration);
        },

        // Mostrar notificação de aviso
        warning(message, duration = 4000) {
            this.show(message, 'warning', duration);
        },

        // Mostrar notificação de informação
        info(message, duration = 3000) {
            this.show(message, 'info', duration);
        },

        // Mostrar notificação genérica
        show(message, type = 'info', duration = 3000) {
            // Deduplicação: não empilhar notificações idênticas
            const dedupKey = `${type}:${String(message).trim()}`;
            const existing = document.querySelectorAll('[data-notif-key]');
            for (const el of existing) {
                if (el.getAttribute('data-notif-key') === dedupKey) return;
            }
            const notification = document.createElement('div');
            notification.setAttribute('data-notif-key', dedupKey);
            notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 translate-x-full`;
            
            const colors = {
                success: 'bg-green-500 text-white',
                error: 'bg-red-500 text-white',
                warning: 'bg-yellow-500 text-black',
                info: 'bg-blue-500 text-white'
            };
            
            const icons = {
                success: 'fas fa-check-circle',
                error: 'fas fa-exclamation-circle',
                warning: 'fas fa-exclamation-triangle',
                info: 'fas fa-info-circle'
            };
            
            notification.className += ` ${colors[type] || colors.info}`;
            
            notification.innerHTML = `
                <div class="flex items-center">
                    <i class="${icons[type] || icons.info} mr-3"></i>
                    <span class="flex-1">${message}</span>
                    <button class="ml-3 text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            // Animar entrada
            setTimeout(() => {
                notification.classList.remove('translate-x-full');
            }, 100);
            
            // Remover automaticamente
            if (duration > 0) {
                setTimeout(() => {
                    notification.classList.add('translate-x-full');
                    setTimeout(() => {
                        if (notification.parentElement) {
                            notification.remove();
                        }
                    }, 300);
                }, duration);
            }
        }
    },

    // Utilitários de dados
    data: {
        // Buscar em array de objetos
        search(array, query, fields = []) {
            if (!query || !Array.isArray(array)) return array;
            
            const searchTerm = query.toLowerCase();
            
            return array.filter(item => {
                if (fields.length === 0) {
                    // Buscar em todos os campos string
                    return Object.values(item).some(value => 
                        typeof value === 'string' && value.toLowerCase().includes(searchTerm)
                    );
                } else {
                    // Buscar apenas nos campos especificados
                    return fields.some(field => {
                        const value = item[field];
                        return typeof value === 'string' && value.toLowerCase().includes(searchTerm);
                    });
                }
            });
        },

        // Ordenar array de objetos
        sort(array, field, direction = 'asc') {
            if (!Array.isArray(array)) return array;
            
            return [...array].sort((a, b) => {
                let valueA = a[field];
                let valueB = b[field];
                
                // Tratar valores nulos/undefined
                if (valueA == null) valueA = '';
                if (valueB == null) valueB = '';
                
                // Converter para string para comparação
                valueA = String(valueA).toLowerCase();
                valueB = String(valueB).toLowerCase();
                
                if (direction === 'asc') {
                    return valueA.localeCompare(valueB);
                } else {
                    return valueB.localeCompare(valueA);
                }
            });
        },

        // Paginar array
        paginate(array, page = 1, itemsPerPage = 10) {
            if (!Array.isArray(array)) return { items: [], totalPages: 0, currentPage: 1 };
            
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const items = array.slice(startIndex, endIndex);
            const totalPages = Math.ceil(array.length / itemsPerPage);
            
            return {
                items,
                totalPages,
                currentPage: page,
                totalItems: array.length,
                hasNext: page < totalPages,
                hasPrev: page > 1
            };
        }
    },

    // Utilitários de localStorage
    storage: {
        // Salvar dados
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('Erro ao salvar no localStorage:', error);
                return false;
            }
        },

        // Recuperar dados
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error('Erro ao recuperar do localStorage:', error);
                return defaultValue;
            }
        },

        // Remover dados
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('Erro ao remover do localStorage:', error);
                return false;
            }
        },

        // Limpar todos os dados
        clear() {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                console.error('Erro ao limpar localStorage:', error);
                return false;
            }
        }
    },

    // Utilitários de URL
    url: {
        // Obter parâmetros da URL
        getParams() {
            const params = new URLSearchParams(window.location.search);
            const result = {};
            
            for (const [key, value] of params) {
                result[key] = value;
            }
            
            return result;
        },

        // Obter parâmetro específico
        getParam(name, defaultValue = null) {
            const params = new URLSearchParams(window.location.search);
            return params.get(name) || defaultValue;
        },

        // Atualizar URL sem recarregar
        updateParam(name, value) {
            const url = new URL(window.location);
            url.searchParams.set(name, value);
            window.history.pushState({}, '', url);
        },

        // Remover parâmetro da URL
        removeParam(name) {
            const url = new URL(window.location);
            url.searchParams.delete(name);
            window.history.pushState({}, '', url);
        }
    },

    // Utilitários de tempo
    time: {
        // Obter timestamp atual
        now() {
            return Date.now();
        },

        // Calcular diferença entre datas
        diff(date1, date2, unit = 'days') {
            const d1 = new Date(date1);
            const d2 = new Date(date2);
            const diffTime = Math.abs(d2 - d1);
            
            switch (unit) {
                case 'seconds':
                    return Math.floor(diffTime / 1000);
                case 'minutes':
                    return Math.floor(diffTime / (1000 * 60));
                case 'hours':
                    return Math.floor(diffTime / (1000 * 60 * 60));
                case 'days':
                    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
                case 'weeks':
                    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
                case 'months':
                    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
                case 'years':
                    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
                default:
                    return diffTime;
            }
        },

        // Adicionar tempo a uma data
        add(date, amount, unit = 'days') {
            const d = new Date(date);
            
            switch (unit) {
                case 'seconds':
                    d.setSeconds(d.getSeconds() + amount);
                    break;
                case 'minutes':
                    d.setMinutes(d.getMinutes() + amount);
                    break;
                case 'hours':
                    d.setHours(d.getHours() + amount);
                    break;
                case 'days':
                    d.setDate(d.getDate() + amount);
                    break;
                case 'weeks':
                    d.setDate(d.getDate() + (amount * 7));
                    break;
                case 'months':
                    d.setMonth(d.getMonth() + amount);
                    break;
                case 'years':
                    d.setFullYear(d.getFullYear() + amount);
                    break;
            }
            
            return d;
        }
    },

    // Debounce para otimizar performance
    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    },

    // Throttle para limitar execuções
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Gerar ID único
    generateId() {
        if (!this._idCounter) this._idCounter = 0;
        return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + (++this._idCounter).toString(36);
    }
};

// Configuração e helpers de UI compartilhados (badges, classes, etc.)
window.UIConfig = window.UIConfig || {
    badges: {
        status: [
            { match: (s) => ["ativo", "ativa"].includes(s), cls: 'bg-green-100 text-green-800' },
            { match: (s) => ["pendente", "aguardando"].includes(s) || s.includes('em avaliação') || s.includes('em avaliacao'), cls: 'bg-yellow-100 text-yellow-800' },
            { match: (s) => ["bloqueado", "bloqueada"].some(w => s.includes(w)), cls: 'bg-red-100 text-red-800' },
            { match: (s) => ["inativo","inativa","cancelado","cancelada","desativado"].some(w => s.includes(w)), cls: 'bg-gray-200 text-gray-700' },
            { match: (s) => ["vip","premium"].some(w => s.includes(w)), cls: 'bg-purple-100 text-purple-800' },
            { match: () => true, cls: 'bg-blue-100 text-blue-800' }
        ],
        segment: [
            { match: (s) => ["enterprise","corporativo"].some(w => s.includes(w)), cls: 'bg-purple-100 text-purple-800' },
            { match: (s) => ["pme","smb","pequena","média","media"].some(w => s.includes(w)), cls: 'bg-blue-100 text-blue-800' },
            { match: (s) => ["governo","publico","público"].some(w => s.includes(w)), cls: 'bg-yellow-100 text-yellow-800' },
            { match: (s) => ["startup","startups"].some(w => s.includes(w)), cls: 'bg-pink-100 text-pink-800' },
            { match: () => true, cls: 'bg-indigo-100 text-indigo-800' }
        ]
    }
};

window.UIHelpers = window.UIHelpers || {
    computeStatusClass(status) {
        const s = (status || '').toString().trim().toLowerCase();
        const rule = UIConfig.badges.status.find(r => r.match(s));
        return rule ? rule.cls : '';
    },
    computeSegmentClass(segmento) {
        const s = (segmento || '').toString().trim().toLowerCase();
        if (!s) return '';
        const rule = UIConfig.badges.segment.find(r => r.match(s));
        return rule ? rule.cls : '';
    },
    renderSegmentBadge(segmento) {
        const seg = (segmento || '').toString().trim();
        if (!seg) return '';
        const cls = UIHelpers.computeSegmentClass(seg);
        return `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${cls}">${seg}</span>`;
    }
};

// Exportar para uso global
window.Utils = Utils;