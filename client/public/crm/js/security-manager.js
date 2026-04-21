/**
 * SecurityManager - Sistema de Segurança Avançado
 * Responsável por sanitização, criptografia e proteção contra vulnerabilidades
 * Versão: 1.0.0
 */

class SecurityManager {
    constructor() {
        this.encryptionKey = this.generateEncryptionKey();
        this.xssPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /<iframe\b[^>]*>/gi,
            /<object\b[^>]*>/gi,
            /<embed\b[^>]*>/gi,
            /<link\b[^>]*>/gi,
            /<meta\b[^>]*>/gi
        ];
        
        this.sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
            /(--|\/\*|\*\/|;)/g,
            /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi
        ];

        this.init();
    }

    init() {
        console.log('SecurityManager inicializado');
        this.setupCSPHeaders();
        this.monitorSecurityEvents();
    }

    /**
     * Sanitização de entrada de dados
     */
    sanitizeInput(input, type = 'text') {
        if (!input || typeof input !== 'string') {
            return input;
        }

        let sanitized = input;

        switch (type) {
            case 'html':
                sanitized = this.sanitizeHTML(sanitized);
                break;
            case 'sql':
                sanitized = this.sanitizeSQL(sanitized);
                break;
            case 'email':
                sanitized = this.sanitizeEmail(sanitized);
                break;
            case 'phone':
                sanitized = this.sanitizePhone(sanitized);
                break;
            case 'cpf':
                sanitized = this.sanitizeCPF(sanitized);
                break;
            case 'cnpj':
                sanitized = this.sanitizeCNPJ(sanitized);
                break;
            default:
                sanitized = this.sanitizeText(sanitized);
        }

        return sanitized;
    }

    sanitizeHTML(input) {
        // Remove tags perigosos e scripts
        let sanitized = input;
        
        this.xssPatterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '');
        });

        // Escape caracteres especiais
        sanitized = sanitized
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');

        return sanitized;
    }

    sanitizeSQL(input) {
        let sanitized = input;
        
        this.sqlPatterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '');
        });

        return sanitized.trim();
    }

    sanitizeText(input) {
        return input
            .trim()
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '');
    }

    sanitizeEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const sanitized = this.sanitizeText(email.toLowerCase());
        return emailRegex.test(sanitized) ? sanitized : '';
    }

    sanitizePhone(phone) {
        return phone.replace(/[^\d\s\-\(\)\+]/g, '').trim();
    }

    sanitizeCPF(cpf) {
        return cpf.replace(/[^\d]/g, '');
    }

    sanitizeCNPJ(cnpj) {
        return cnpj.replace(/[^\d]/g, '');
    }

    /**
     * Sistema de Criptografia
     */
    generateEncryptionKey() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    async encryptData(data) {
        try {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(JSON.stringify(data));
            
            const key = await crypto.subtle.importKey(
                'raw',
                encoder.encode(this.encryptionKey.slice(0, 32)),
                { name: 'AES-GCM' },
                false,
                ['encrypt']
            );

            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                dataBuffer
            );

            const encryptedArray = new Uint8Array(encrypted);
            const result = new Uint8Array(iv.length + encryptedArray.length);
            result.set(iv);
            result.set(encryptedArray, iv.length);

            return btoa(String.fromCharCode(...result));
        } catch (error) {
            console.error('Erro na criptografia:', error);
            return null;
        }
    }

    async decryptData(encryptedData) {
        try {
            const decoder = new TextDecoder();
            const encoder = new TextEncoder();
            
            const data = new Uint8Array(atob(encryptedData).split('').map(char => char.charCodeAt(0)));
            const iv = data.slice(0, 12);
            const encrypted = data.slice(12);

            const key = await crypto.subtle.importKey(
                'raw',
                encoder.encode(this.encryptionKey.slice(0, 32)),
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            );

            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encrypted
            );

            return JSON.parse(decoder.decode(decrypted));
        } catch (error) {
            console.error('Erro na descriptografia:', error);
            return null;
        }
    }

    /**
     * Validação de Segurança
     */
    validateSecureInput(input, rules = {}) {
        const result = {
            isValid: true,
            errors: [],
            sanitized: input
        };

        if (!input) {
            result.isValid = false;
            result.errors.push('Campo obrigatório');
            return result;
        }

        // Sanitizar entrada
        result.sanitized = this.sanitizeInput(input, rules.type || 'text');

        // Verificar comprimento
        if (rules.minLength && result.sanitized.length < rules.minLength) {
            result.isValid = false;
            result.errors.push(`Mínimo de ${rules.minLength} caracteres`);
        }

        if (rules.maxLength && result.sanitized.length > rules.maxLength) {
            result.isValid = false;
            result.errors.push(`Máximo de ${rules.maxLength} caracteres`);
        }

        // Verificar padrões
        if (rules.pattern && !rules.pattern.test(result.sanitized)) {
            result.isValid = false;
            result.errors.push('Formato inválido');
        }

        // Verificar tentativas de XSS
        if (this.detectXSS(input)) {
            result.isValid = false;
            result.errors.push('Conteúdo não permitido detectado');
        }

        return result;
    }

    detectXSS(input) {
        return this.xssPatterns.some(pattern => pattern.test(input));
    }

    detectSQLInjection(input) {
        return this.sqlPatterns.some(pattern => pattern.test(input));
    }

    /**
     * Configuração de Segurança
     */
    setupCSPHeaders() {
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; img-src 'self' data:;";
        document.head.appendChild(meta);
    }

    monitorSecurityEvents() {
        // Monitor para tentativas de XSS - apenas scripts externos suspeitos
        document.addEventListener('DOMNodeInserted', (event) => {
            if (event.target.tagName === 'SCRIPT' && 
                event.target.src && 
                !event.target.src.startsWith(window.location.origin) &&
                !this.isWhitelistedScript(event.target.src)) {
                console.warn('Tentativa de inserção de script externo detectada:', event.target.src);
                event.target.remove();
            }
        });

        // Monitor para mudanças suspeitas no DOM - apenas scripts externos
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1 && node.tagName === 'SCRIPT') {
                            // Permitir scripts inline do próprio sistema
                            if (!node.src || 
                                node.src.startsWith(window.location.origin) ||
                                this.isWhitelistedScript(node.src)) {
                                return; // Script legítimo, não remover
                            }
                            console.warn('Script suspeito detectado e removido:', node.src || 'inline');
                            node.remove();
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    isWhitelistedScript(src) {
        const whitelist = [
            'cdn.jsdelivr.net',
            'cdnjs.cloudflare.com',
            'unpkg.com'
        ];
        return whitelist.some(domain => src.includes(domain));
    }

    /**
     * Utilitários de Segurança
     */
    generateSecureToken(length = 32) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    hashPassword(password) {
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
            .then(hash => Array.from(new Uint8Array(hash))
                .map(byte => byte.toString(16).padStart(2, '0'))
                .join(''));
    }

    validatePassword(password) {
        const rules = {
            minLength: 8,
            hasUpperCase: /[A-Z]/.test(password),
            hasLowerCase: /[a-z]/.test(password),
            hasNumbers: /\d/.test(password),
            hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        const errors = [];
        
        if (password.length < rules.minLength) {
            errors.push(`Senha deve ter pelo menos ${rules.minLength} caracteres`);
        }
        if (!rules.hasUpperCase) {
            errors.push('Senha deve conter pelo menos uma letra maiúscula');
        }
        if (!rules.hasLowerCase) {
            errors.push('Senha deve conter pelo menos uma letra minúscula');
        }
        if (!rules.hasNumbers) {
            errors.push('Senha deve conter pelo menos um número');
        }
        if (!rules.hasSpecialChars) {
            errors.push('Senha deve conter pelo menos um caractere especial');
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            strength: this.calculatePasswordStrength(password)
        };
    }

    calculatePasswordStrength(password) {
        let score = 0;
        
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;
        if (/[a-z]/.test(password)) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^A-Za-z0-9]/.test(password)) score += 1;
        
        const strength = ['Muito Fraca', 'Fraca', 'Regular', 'Boa', 'Forte', 'Muito Forte'];
        return strength[Math.min(score, 5)];
    }

    /**
     * Logs de Segurança
     */
    logSecurityEvent(event, details = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event: event,
            details: details,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        console.warn('Evento de Segurança:', logEntry);
        
        // Armazenar em localStorage para análise posterior
        const securityLogs = JSON.parse(localStorage.getItem('securityLogs') || '[]');
        securityLogs.push(logEntry);
        
        // Manter apenas os últimos 100 logs
        if (securityLogs.length > 100) {
            securityLogs.splice(0, securityLogs.length - 100);
        }
        
        localStorage.setItem('securityLogs', JSON.stringify(securityLogs));
    }

    getSecurityLogs() {
        return JSON.parse(localStorage.getItem('securityLogs') || '[]');
    }

    clearSecurityLogs() {
        localStorage.removeItem('securityLogs');
    }
}

// Instância global do SecurityManager
window.SecurityManager = new SecurityManager();

console.log('SecurityManager carregado com sucesso');