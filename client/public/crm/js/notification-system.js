/**
 * NotificationSystem - Sistema Avançado de Notificações
 * Sistema completo de notificações com múltiplos tipos, posicionamento e animações
 * Versão: 1.0.0
 */

class NotificationSystem {
    constructor() {
        this.notifications = new Map();
        this.container = null;
        this.config = {
            position: 'top-right', // top-right, top-left, bottom-right, bottom-left, top-center, bottom-center
            maxNotifications: 5,
            defaultDuration: 5000,
            animationDuration: 300,
            stackSpacing: 10,
            enableSound: true,
            enableProgress: true,
            enableActions: true,
            enableGrouping: true
        };
        
        this.sounds = {
            success: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT',
            error: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT',
            warning: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT',
            info: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'
        };
        
        this.templates = {
            container: `
                <div id="notification-container" class="notification-container {position}">
                </div>
            `,
            notification: `
                <div class="notification notification-{type} {className}" data-id="{id}">
                    <div class="notification-content">
                        <div class="notification-icon">
                            <i class="{icon}"></i>
                        </div>
                        <div class="notification-body">
                            <div class="notification-title">{title}</div>
                            <div class="notification-message">{message}</div>
                            {actions}
                        </div>
                        {closeButton}
                    </div>
                    {progressBar}
                </div>
            `,
            action: `
                <button class="notification-action {actionClass}" onclick="{onclick}">
                    {text}
                </button>
            `,
            progressBar: `
                <div class="notification-progress">
                    <div class="notification-progress-bar"></div>
                </div>
            `
        };
        
        this.init();
        console.log('NotificationSystem inicializado');
    }

    init() {
        this.createContainer();
        this.setupStyles();
        this.setupEventListeners();
    }

    createContainer() {
        if (this.container) return;
        
        const containerHtml = this.templates.container
            .replace('{position}', this.config.position);
        
        document.body.insertAdjacentHTML('beforeend', containerHtml);
        this.container = document.getElementById('notification-container');
    }

    setupStyles() {
        const styles = `
            <style id="notification-system-styles">
                .notification-container {
                    position: fixed;
                    z-index: 9999;
                    pointer-events: none;
                    max-width: 400px;
                    width: 100%;
                }

                .notification-container.top-right {
                    top: 20px;
                    right: 20px;
                }

                .notification-container.top-left {
                    top: 20px;
                    left: 20px;
                }

                .notification-container.bottom-right {
                    bottom: 20px;
                    right: 20px;
                }

                .notification-container.bottom-left {
                    bottom: 20px;
                    left: 20px;
                }

                .notification-container.top-center {
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                }

                .notification-container.bottom-center {
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                }

                .notification {
                    background: #fff;
                    border-radius: 12px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                    margin-bottom: 10px;
                    overflow: hidden;
                    pointer-events: auto;
                    position: relative;
                    transform: translateX(100%);
                    transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                    border-left: 4px solid;
                    max-width: 100%;
                    word-wrap: break-word;
                }

                .notification.show {
                    transform: translateX(0);
                }

                .notification.hide {
                    transform: translateX(100%);
                    opacity: 0;
                }

                .notification-success {
                    border-left-color: #10b981;
                }

                .notification-error {
                    border-left-color: #ef4444;
                }

                .notification-warning {
                    border-left-color: #f59e0b;
                }

                .notification-info {
                    border-left-color: #3b82f6;
                }

                .notification-content {
                    display: flex;
                    align-items: flex-start;
                    padding: 16px;
                    gap: 12px;
                }

                .notification-icon {
                    flex-shrink: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    font-size: 14px;
                    color: #fff;
                }

                .notification-success .notification-icon {
                    background-color: #10b981;
                }

                .notification-error .notification-icon {
                    background-color: #ef4444;
                }

                .notification-warning .notification-icon {
                    background-color: #f59e0b;
                }

                .notification-info .notification-icon {
                    background-color: #3b82f6;
                }

                .notification-body {
                    flex: 1;
                    min-width: 0;
                }

                .notification-title {
                    font-weight: 600;
                    font-size: 14px;
                    color: #1f2937;
                    margin-bottom: 4px;
                    line-height: 1.4;
                }

                .notification-message {
                    font-size: 13px;
                    color: #6b7280;
                    line-height: 1.4;
                    margin-bottom: 8px;
                }

                .notification-actions {
                    display: flex;
                    gap: 8px;
                    margin-top: 8px;
                }

                .notification-action {
                    background: none;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    padding: 4px 12px;
                    font-size: 12px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .notification-action:hover {
                    background-color: #f9fafb;
                }

                .notification-action.primary {
                    background-color: #3b82f6;
                    border-color: #3b82f6;
                    color: #fff;
                }

                .notification-action.primary:hover {
                    background-color: #2563eb;
                }

                .notification-close {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: none;
                    border: none;
                    font-size: 18px;
                    color: #9ca3af;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                }

                .notification-close:hover {
                    background-color: #f3f4f6;
                    color: #6b7280;
                }

                .notification-progress {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background-color: rgba(0, 0, 0, 0.1);
                }

                .notification-progress-bar {
                    height: 100%;
                    background-color: currentColor;
                    transition: width linear;
                    width: 100%;
                }

                .notification-success .notification-progress-bar {
                    background-color: #10b981;
                }

                .notification-error .notification-progress-bar {
                    background-color: #ef4444;
                }

                .notification-warning .notification-progress-bar {
                    background-color: #f59e0b;
                }

                .notification-info .notification-progress-bar {
                    background-color: #3b82f6;
                }

                /* Animações para diferentes posições */
                .notification-container.top-left .notification,
                .notification-container.bottom-left .notification {
                    transform: translateX(-100%);
                }

                .notification-container.top-left .notification.show,
                .notification-container.bottom-left .notification.show {
                    transform: translateX(0);
                }

                .notification-container.top-left .notification.hide,
                .notification-container.bottom-left .notification.hide {
                    transform: translateX(-100%);
                }

                .notification-container.top-center .notification,
                .notification-container.bottom-center .notification {
                    transform: translateY(-100%);
                }

                .notification-container.top-center .notification.show,
                .notification-container.bottom-center .notification.show {
                    transform: translateY(0);
                }

                .notification-container.top-center .notification.hide,
                .notification-container.bottom-center .notification.hide {
                    transform: translateY(-100%);
                }

                /* Responsividade */
                @media (max-width: 480px) {
                    .notification-container {
                        left: 10px !important;
                        right: 10px !important;
                        max-width: none;
                        transform: none !important;
                    }

                    .notification {
                        margin-bottom: 8px;
                    }

                    .notification-content {
                        padding: 12px;
                    }

                    .notification-actions {
                        flex-direction: column;
                    }

                    .notification-action {
                        width: 100%;
                        text-align: center;
                    }
                }

                /* Tema escuro */
                @media (prefers-color-scheme: dark) {
                    .notification {
                        background: #1f2937;
                        color: #f9fafb;
                    }

                    .notification-title {
                        color: #f9fafb;
                    }

                    .notification-message {
                        color: #d1d5db;
                    }

                    .notification-close {
                        color: #9ca3af;
                    }

                    .notification-close:hover {
                        background-color: #374151;
                        color: #d1d5db;
                    }

                    .notification-action {
                        border-color: #4b5563;
                        color: #d1d5db;
                    }

                    .notification-action:hover {
                        background-color: #374151;
                    }
                }
            </style>
        `;

        if (!document.getElementById('notification-system-styles')) {
            document.head.insertAdjacentHTML('beforeend', styles);
        }
    }

    setupEventListeners() {
        // Listener para fechar notificações com ESC
        document.addEventListener('keydown', (e) => {
            // Só processar ESC se não estivermos em um campo de input
            if (e.key === 'Escape' && !e.target.matches('input, textarea, select')) {
                this.clearAll();
            }
        });

        // Listener para pausar/retomar ao hover
        if (this.container) {
            this.container.addEventListener('mouseenter', () => {
                this.pauseAll();
            });

            this.container.addEventListener('mouseleave', () => {
                this.resumeAll();
            });
        }
    }

    /**
     * Métodos principais de notificação
     */
    show(options) {
        const config = {
            type: 'info',
            title: '',
            message: '',
            duration: this.config.defaultDuration,
            persistent: false,
            actions: [],
            className: '',
            onShow: null,
            onHide: null,
            onClick: null,
            ...options
        };

        const id = this.generateId();
        const notification = this.createNotification(id, config);
        
        // Limitar número de notificações
        this.enforceMaxNotifications();
        
        // Adicionar ao container
        this.container.appendChild(notification.element);
        this.notifications.set(id, notification);
        
        // Animar entrada
        setTimeout(() => {
            notification.element.classList.add('show');
        }, 10);
        
        // Configurar auto-hide
        if (!config.persistent && config.duration > 0) {
            this.setupAutoHide(id, config.duration);
        }
        
        // Tocar som
        if (this.config.enableSound) {
            this.playSound(config.type);
        }
        
        // Callback onShow
        if (config.onShow) {
            config.onShow(id);
        }
        
        return id;
    }

    success(message, options = {}) {
        return this.show({
            type: 'success',
            title: options.title || 'Sucesso',
            message,
            ...options
        });
    }

    error(message, options = {}) {
        const persistent = options && options.persistent === true;
        const duration = (options && Object.prototype.hasOwnProperty.call(options, 'duration'))
            ? options.duration
            : (persistent ? 0 : 8000);
        return this.show({
            type: 'error',
            title: options.title || 'Erro',
            message,
            persistent,
            duration,
            ...options
        });
    }

    warning(message, options = {}) {
        return this.show({
            type: 'warning',
            title: options.title || 'Atenção',
            message,
            ...options
        });
    }

    info(message, options = {}) {
        return this.show({
            type: 'info',
            title: options.title || 'Informação',
            message,
            ...options
        });
    }

    /**
     * Métodos de controle
     */
    hide(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        notification.element.classList.add('hide');
        
        setTimeout(() => {
            if (notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }
            this.notifications.delete(id);
            
            if (notification.config.onHide) {
                notification.config.onHide(id);
            }
        }, this.config.animationDuration);

        // Limpar timer se existir
        if (notification.timer) {
            clearTimeout(notification.timer);
        }
    }

    clear(type = null) {
        const toRemove = [];
        
        this.notifications.forEach((notification, id) => {
            if (!type || notification.config.type === type) {
                toRemove.push(id);
            }
        });
        
        toRemove.forEach(id => this.hide(id));
    }

    clearAll() {
        this.notifications.forEach((notification, id) => {
            this.hide(id);
        });
    }

    update(id, options) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        // Atualizar configuração
        Object.assign(notification.config, options);
        
        // Recriar elemento
        const newElement = this.createNotificationElement(id, notification.config);
        notification.element.parentNode.replaceChild(newElement, notification.element);
        notification.element = newElement;
        
        // Animar
        setTimeout(() => {
            newElement.classList.add('show');
        }, 10);
    }

    /**
     * Métodos de configuração
     */
    configure(options) {
        Object.assign(this.config, options);
        
        // Recriar container se a posição mudou
        if (options.position && this.container) {
            this.container.className = `notification-container ${options.position}`;
        }
    }

    setPosition(position) {
        this.configure({ position });
    }

    /**
     * Métodos internos
     */
    createNotification(id, config) {
        const element = this.createNotificationElement(id, config);
        
        return {
            id,
            element,
            config,
            timer: null,
            paused: false,
            startTime: Date.now(),
            remainingTime: config.duration
        };
    }

    createNotificationElement(id, config) {
        const icons = {
            success: 'fas fa-check',
            error: 'fas fa-times',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info'
        };

        const actionsHtml = config.actions.length > 0 ? 
            `<div class="notification-actions">
                ${config.actions.map(action => this.createActionHtml(action)).join('')}
            </div>` : '';

        const closeButtonHtml =
            `<button class="notification-close" onclick="window.NotificationSystem.hide('${id}')">&times;</button>`;

        const progressBarHtml = this.config.enableProgress && !config.persistent ? 
            this.templates.progressBar : '';

        const html = this.templates.notification
            .replace('{id}', id)
            .replace('{type}', config.type)
            .replace('{className}', config.className)
            .replace('{icon}', icons[config.type] || icons.info)
            .replace('{title}', config.title)
            .replace('{message}', config.message)
            .replace('{actions}', actionsHtml)
            .replace('{closeButton}', closeButtonHtml)
            .replace('{progressBar}', progressBarHtml);

        const div = document.createElement('div');
        div.innerHTML = html;
        const element = div.firstElementChild;

        // Configurar eventos
        if (config.onClick) {
            element.addEventListener('click', () => config.onClick(id));
        }

        // Configurar barra de progresso
        if (this.config.enableProgress && !config.persistent && config.duration > 0) {
            const progressBar = element.querySelector('.notification-progress-bar');
            if (progressBar) {
                progressBar.style.transitionDuration = `${config.duration}ms`;
                setTimeout(() => {
                    progressBar.style.width = '0%';
                }, 10);
            }
        }

        return element;
    }

    createActionHtml(action) {
        return this.templates.action
            .replace('{actionClass}', action.className || '')
            .replace('{onclick}', action.onClick || '')
            .replace('{text}', action.text);
    }

    setupAutoHide(id, duration) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        notification.timer = setTimeout(() => {
            this.hide(id);
        }, duration);
    }

    enforceMaxNotifications() {
        const notifications = Array.from(this.notifications.values());
        const excess = notifications.length - this.config.maxNotifications + 1;
        
        if (excess > 0) {
            const oldest = notifications
                .sort((a, b) => a.startTime - b.startTime)
                .slice(0, excess);
            
            oldest.forEach(notification => {
                this.hide(notification.id);
            });
        }
    }

    pauseAll() {
        this.notifications.forEach((notification) => {
            if (notification.timer && !notification.paused) {
                clearTimeout(notification.timer);
                notification.remainingTime = notification.config.duration - (Date.now() - notification.startTime);
                notification.paused = true;
                
                // Pausar barra de progresso
                const progressBar = notification.element.querySelector('.notification-progress-bar');
                if (progressBar) {
                    progressBar.style.animationPlayState = 'paused';
                }
            }
        });
    }

    resumeAll() {
        this.notifications.forEach((notification) => {
            if (notification.paused) {
                notification.startTime = Date.now();
                notification.paused = false;
                
                if (notification.remainingTime > 0) {
                    this.setupAutoHide(notification.id, notification.remainingTime);
                }
                
                // Retomar barra de progresso
                const progressBar = notification.element.querySelector('.notification-progress-bar');
                if (progressBar) {
                    progressBar.style.animationPlayState = 'running';
                }
            }
        });
    }

    playSound(type) {
        if (!this.config.enableSound || !this.sounds[type]) return;
        
        try {
            const audio = new Audio(this.sounds[type]);
            audio.volume = 0.3;
            audio.play().catch(() => {
                // Ignorar erros de reprodução de áudio
            });
        } catch (error) {
            // Ignorar erros de áudio
        }
    }

    generateId() {
        if (!this.idCounter) this.idCounter = 0;
        return `notification_${++this.idCounter}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Métodos de conveniência para integração
     */
    showValidationErrors(errors) {
        if (Array.isArray(errors)) {
            errors.forEach(error => {
                this.error(error, { duration: 8000 });
            });
        } else if (typeof errors === 'object') {
            Object.entries(errors).forEach(([field, message]) => {
                this.error(`${field}: ${message}`, { duration: 8000 });
            });
        } else {
            this.error(errors, { duration: 8000 });
        }
    }

    showFormSuccess(message = 'Dados salvos com sucesso!') {
        return this.success(message, {
            actions: [
                {
                    text: 'Ver detalhes',
                    className: 'primary',
                    onClick: 'window.NotificationSystem.showDetails()'
                }
            ]
        });
    }

    showConfirmation(message, onConfirm, onCancel = null) {
        return this.warning(message, {
            persistent: true,
            actions: [
                {
                    text: 'Confirmar',
                    className: 'primary',
                    onClick: () => {
                        if (onConfirm) onConfirm();
                        this.hide(arguments[0]); // Hide this notification
                    }
                },
                {
                    text: 'Cancelar',
                    onClick: () => {
                        if (onCancel) onCancel();
                        this.hide(arguments[0]); // Hide this notification
                    }
                }
            ]
        });
    }

    showProgress(message, progress = 0) {
        const id = this.info(message, {
            persistent: true,
            className: 'notification-progress-custom'
        });
        
        // Atualizar progresso
        setTimeout(() => {
            const notification = this.notifications.get(id);
            if (notification) {
                const progressBar = notification.element.querySelector('.notification-progress-bar');
                if (progressBar) {
                    progressBar.style.width = `${progress}%`;
                }
            }
        }, 100);
        
        return id;
    }

    updateProgress(id, progress, message = null) {
        const notification = this.notifications.get(id);
        if (!notification) return;
        
        if (message) {
            const messageElement = notification.element.querySelector('.notification-message');
            if (messageElement) {
                messageElement.textContent = message;
            }
        }
        
        const progressBar = notification.element.querySelector('.notification-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        if (progress >= 100) {
            setTimeout(() => this.hide(id), 1000);
        }
    }

    // Métodos para integração com outros sistemas
    showCRUDSuccess(operation, entity) {
        const messages = {
            create: `${entity} criado com sucesso!`,
            update: `${entity} atualizado com sucesso!`,
            delete: `${entity} excluído com sucesso!`,
            read: `${entity} carregado com sucesso!`
        };
        
        return this.success(messages[operation] || 'Operação realizada com sucesso!');
    }

    showCRUDError(operation, entity, error) {
        const messages = {
            create: `Erro ao criar ${entity}`,
            update: `Erro ao atualizar ${entity}`,
            delete: `Erro ao excluir ${entity}`,
            read: `Erro ao carregar ${entity}`
        };
        
        return this.error(`${messages[operation] || 'Erro na operação'}: ${error}`);
    }

    showSecurityAlert(message, severity = 'high') {
        const config = {
            high: { type: 'error', persistent: true },
            medium: { type: 'warning', duration: 10000 },
            low: { type: 'info', duration: 5000 }
        };
        
        return this.show({
            ...config[severity],
            title: 'Alerta de Segurança',
            message,
            className: 'security-alert'
        });
    }
}

// Instância global
window.NotificationSystem = new NotificationSystem();

console.log('NotificationSystem carregado com sucesso');
