/**
 * Sistema de Auditoria - SAMS Locações
 * Registra todas as operações CRUD para fins de auditoria e histórico
 */

class AuditSystem {
    constructor() {
        this.auditLog = this.loadAuditLog();
        this.currentUser = null;
        this.init();
    }

    init() {
        console.log('🔍 Sistema de Auditoria inicializado');
        this.setupEventListeners();
        this.getCurrentUser();
    }

    getCurrentUser() {
        // Integração com o sistema de autenticação
        if (window.AuthSystem && window.AuthSystem.currentUser) {
            this.currentUser = window.AuthSystem.currentUser;
        } else {
            this.currentUser = {
                id: 'system',
                name: 'Sistema',
                email: 'system@samslocacoes.com'
            };
        }
    }

    setupEventListeners() {
        // Intercepta operações do ModuleSystem
        if (window.ModuleSystem) {
            this.interceptModuleOperations();
        }

        // Intercepta operações de formulários
        if (window.FormSystem) {
            this.interceptFormOperations();
        }
    }

    interceptModuleOperations() {
        const originalSave = window.ModuleSystem.saveData;
        const originalAddItem = window.ModuleSystem.addItem;
        const originalUpdateItem = window.ModuleSystem.updateItem;
        const originalDelete = window.ModuleSystem.deleteItem;

        // Intercepta adição de itens
        window.ModuleSystem.addItem = (module, data) => {
            console.log('🔍 AuditSystem interceptando addItem:', { module, data });
            
            // Executa a operação original
            const result = originalAddItem.call(window.ModuleSystem, module, data);
            
            // Registra a auditoria apenas se o item foi criado com sucesso
            if (result && data.id) {
                this.logOperation({
                    operation: 'CREATE',
                    module,
                    recordId: data.id,
                    oldData: null,
                    newData: data,
                    timestamp: new Date().toISOString(),
                    user: this.currentUser
                });
            }

            return result;
        };

        // Intercepta atualização de itens
        window.ModuleSystem.updateItem = (module, id, data) => {
            const oldData = this.getOldData(module, id);
            
            // Executa a operação original
            const result = originalUpdateItem.call(window.ModuleSystem, module, id, data);
            
            // Registra a auditoria
            this.logOperation({
                operation: 'UPDATE',
                module,
                recordId: id,
                oldData,
                newData: data,
                timestamp: new Date().toISOString(),
                user: this.currentUser
            });

            return result;
        };

        // Intercepta exclusão de dados
        window.ModuleSystem.deleteItem = (module, id) => {
            const oldData = this.getOldData(module, id);
            
            // Executa a operação original
            const result = originalDelete.call(window.ModuleSystem, module, id);
            
            // Registra a auditoria
            this.logOperation({
                operation: 'DELETE',
                module,
                recordId: id,
                oldData,
                newData: null,
                timestamp: new Date().toISOString(),
                user: this.currentUser
            });

            return result;
        };
    }

    interceptFormOperations() {
        // Monitora submissões de formulários
        document.addEventListener('submit', (e) => {
            if (e.target.classList.contains('sams-form')) {
                this.handleFormSubmission(e);
            }
        });
    }

    handleFormSubmission(event) {
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Determina o módulo e operação baseado no formulário
        const moduleInput = form.querySelector('input[name="module"]');
        const idInput = form.querySelector('input[name="id"]');
        
        if (moduleInput) {
            const module = moduleInput.value;
            const isUpdate = idInput && idInput.value;
            const operation = isUpdate ? 'UPDATE' : 'CREATE';
            
            setTimeout(() => {
                this.logFormOperation({
                    operation,
                    module,
                    recordId: isUpdate ? idInput.value : data.id,
                    formData: data,
                    timestamp: new Date().toISOString(),
                    user: this.currentUser
                });
            }, 100);
        }
    }

    getOldData(module, id) {
        if (!window.ModuleSystem || !window.ModuleSystem.data[module]) {
            return null;
        }

        return window.ModuleSystem.data[module].find(item => item.id === id) || null;
    }

    logOperation(auditEntry) {
        // Adiciona ID único para a entrada de auditoria
        auditEntry.auditId = this.generateAuditId();
        
        // Adiciona informações adicionais
        auditEntry.sessionId = this.getSessionId();
        auditEntry.ipAddress = this.getClientIP();
        auditEntry.userAgent = navigator.userAgent;
        
        // Calcula diferenças se for uma atualização
        if (auditEntry.operation === 'UPDATE' && auditEntry.oldData && auditEntry.newData) {
            auditEntry.changes = this.calculateChanges(auditEntry.oldData, auditEntry.newData);
        }

        // Adiciona ao log
        this.auditLog.push(auditEntry);
        
        // Salva no localStorage
        this.saveAuditLog();
        
        // Log no console para desenvolvimento
        console.log('📝 Operação auditada:', auditEntry);
        
        // Dispara evento personalizado
        this.dispatchAuditEvent(auditEntry);
    }

    logFormOperation(auditEntry) {
        auditEntry.auditId = this.generateAuditId();
        auditEntry.type = 'FORM_SUBMISSION';
        auditEntry.sessionId = this.getSessionId();
        
        this.auditLog.push(auditEntry);
        this.saveAuditLog();
        
        console.log('📋 Submissão de formulário auditada:', auditEntry);
    }

    calculateChanges(oldData, newData) {
        const changes = {};
        
        // Compara todos os campos
        const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
        
        for (const key of allKeys) {
            const oldValue = oldData[key];
            const newValue = newData[key];
            
            if (oldValue !== newValue) {
                changes[key] = {
                    from: oldValue,
                    to: newValue
                };
            }
        }
        
        return changes;
    }

    generateAuditId() {
        if (!this._auditIdCounter) this._auditIdCounter = 0;
        return 'audit_' + (++this._auditIdCounter) + '_' + Math.random().toString(36).substr(2, 9);
    }

    getSessionId() {
        let sessionId = sessionStorage.getItem('sams_session_id');
        if (!sessionId) {
            if (!this._sessionIdCounter) this._sessionIdCounter = 0;
            sessionId = 'session_' + (++this._sessionIdCounter) + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('sams_session_id', sessionId);
        }
        return sessionId;
    }

    getClientIP() {
        // Em um ambiente real, isso seria obtido do servidor
        return 'localhost';
    }

    dispatchAuditEvent(auditEntry) {
        const event = new CustomEvent('auditLog', {
            detail: auditEntry
        });
        document.dispatchEvent(event);
    }

    // Métodos de consulta e relatórios
    getAuditHistory(filters = {}) {
        let filteredLog = [...this.auditLog];

        // Filtro por módulo
        if (filters.module) {
            filteredLog = filteredLog.filter(entry => entry.module === filters.module);
        }

        // Filtro por operação
        if (filters.operation) {
            filteredLog = filteredLog.filter(entry => entry.operation === filters.operation);
        }

        // Filtro por usuário
        if (filters.userId) {
            filteredLog = filteredLog.filter(entry => entry.user && entry.user.id === filters.userId);
        }

        // Filtro por período
        if (filters.startDate) {
            const startDate = new Date(filters.startDate);
            filteredLog = filteredLog.filter(entry => new Date(entry.timestamp) >= startDate);
        }

        if (filters.endDate) {
            const endDate = new Date(filters.endDate);
            filteredLog = filteredLog.filter(entry => new Date(entry.timestamp) <= endDate);
        }

        // Filtro por registro específico
        if (filters.recordId) {
            filteredLog = filteredLog.filter(entry => entry.recordId === filters.recordId);
        }

        // Ordena por timestamp (mais recente primeiro)
        filteredLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return filteredLog;
    }

    getRecordHistory(module, recordId) {
        return this.getAuditHistory({ module, recordId });
    }

    getUserActivity(userId, startDate = null, endDate = null) {
        const filters = { userId };
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        
        return this.getAuditHistory(filters);
    }

    getModuleStatistics(module = null) {
        const relevantLog = module ? 
            this.auditLog.filter(entry => entry.module === module) : 
            this.auditLog;

        const stats = {
            total: relevantLog.length,
            operations: {
                CREATE: 0,
                UPDATE: 0,
                DELETE: 0,
                FORM_SUBMISSION: 0
            },
            users: {},
            modules: {},
            timeline: {}
        };

        relevantLog.forEach(entry => {
            // Conta operações
            if (stats.operations[entry.operation] !== undefined) {
                stats.operations[entry.operation]++;
            }

            // Conta por usuário
            const userId = entry.user ? entry.user.id : 'unknown';
            stats.users[userId] = (stats.users[userId] || 0) + 1;

            // Conta por módulo
            if (entry.module) {
                stats.modules[entry.module] = (stats.modules[entry.module] || 0) + 1;
            }

            // Timeline (por dia)
            const date = entry.timestamp.split('T')[0];
            stats.timeline[date] = (stats.timeline[date] || 0) + 1;
        });

        return stats;
    }

    // Métodos de persistência
    loadAuditLog() {
        try {
            const stored = localStorage.getItem('sams_audit_log');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Erro ao carregar log de auditoria:', error);
            return [];
        }
    }

    saveAuditLog() {
        try {
            // Mantém apenas os últimos 10000 registros para evitar problemas de performance
            if (this.auditLog.length > 10000) {
                this.auditLog = this.auditLog.slice(-10000);
            }
            
            localStorage.setItem('sams_audit_log', JSON.stringify(this.auditLog));
        } catch (error) {
            console.error('Erro ao salvar log de auditoria:', error);
        }
    }

    exportAuditLog(format = 'json', filters = {}) {
        const data = this.getAuditHistory(filters);
        
        if (format === 'csv') {
            return this.exportToCSV(data);
        } else if (format === 'json') {
            return JSON.stringify(data, null, 2);
        }
        
        return data;
    }

    exportToCSV(data) {
        if (data.length === 0) return '';

        const headers = ['Timestamp', 'Operation', 'Module', 'Record ID', 'User', 'Changes'];
        const rows = data.map(entry => [
            entry.timestamp,
            entry.operation,
            entry.module || '',
            entry.recordId || '',
            entry.user ? entry.user.name : '',
            entry.changes ? JSON.stringify(entry.changes) : ''
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        return csvContent;
    }

    clearAuditLog() {
        if (confirm('Tem certeza que deseja limpar todo o histórico de auditoria? Esta ação não pode ser desfeita.')) {
            this.auditLog = [];
            this.saveAuditLog();
            console.log('🗑️ Log de auditoria limpo');
        }
    }

    // Interface para visualização
    showAuditViewer() {
        const modal = this.createAuditModal();
        document.body.appendChild(modal);
        this.populateAuditViewer(modal);
    }

    createAuditModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden">
                <div class="flex items-center justify-between p-6 border-b">
                    <h2 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-history mr-2"></i>
                        Histórico de Auditoria
                    </h2>
                    <button class="close-audit-modal text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <div class="p-6">
                    <!-- Filtros -->
                    <div class="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <select id="audit-module-filter" class="border rounded px-3 py-2">
                            <option value="">Todos os Módulos</option>
                            <option value="leads">Leads</option>
                            <option value="clientes">Clientes</option>
                            <option value="eventos">Eventos</option>
                            <option value="usuarios">Usuários</option>
                            <option value="briefings">Briefings</option>
                            <option value="projetos">Projetos</option>
                        </select>
                        
                        <select id="audit-operation-filter" class="border rounded px-3 py-2">
                            <option value="">Todas as Operações</option>
                            <option value="CREATE">Criação</option>
                            <option value="UPDATE">Atualização</option>
                            <option value="DELETE">Exclusão</option>
                        </select>
                        
                        <input type="date" id="audit-date-filter" class="border rounded px-3 py-2">
                        
                        <button id="apply-audit-filters" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                            <i class="fas fa-filter mr-2"></i>Filtrar
                        </button>
                    </div>
                    
                    <!-- Estatísticas -->
                    <div id="audit-stats" class="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <!-- Será preenchido dinamicamente -->
                    </div>
                    
                    <!-- Lista de auditoria -->
                    <div class="overflow-auto max-h-96">
                        <table class="w-full border-collapse border border-gray-300">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="border border-gray-300 px-4 py-2 text-left">Data/Hora</th>
                                    <th class="border border-gray-300 px-4 py-2 text-left">Operação</th>
                                    <th class="border border-gray-300 px-4 py-2 text-left">Módulo</th>
                                    <th class="border border-gray-300 px-4 py-2 text-left">Usuário</th>
                                    <th class="border border-gray-300 px-4 py-2 text-left">Alterações</th>
                                </tr>
                            </thead>
                            <tbody id="audit-table-body">
                                <!-- Será preenchido dinamicamente -->
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Ações -->
                    <div class="mt-6 flex justify-between items-center">
                        <div>
                            <button id="export-audit-json" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-2">
                                <i class="fas fa-download mr-2"></i>Exportar JSON
                            </button>
                            <button id="export-audit-csv" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                                <i class="fas fa-file-csv mr-2"></i>Exportar CSV
                            </button>
                        </div>
                        <button id="audit-back-dashboard" class="px-4 py-2 border border-gray-300 rounded text-gray-700 bg-gray-100 hover:bg-gray-200 transition">
                            <i class="fas fa-arrow-left mr-2"></i>Voltar ao Dashboard
                        </button>
                        <button id="clear-audit-log" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
                            <i class="fas fa-trash mr-2"></i>Limpar Histórico
                        </button>
                    </div>
                </div>
            </div>
        `;
    
        // Event listeners
        modal.querySelector('.close-audit-modal').addEventListener('click', () => {
            modal.remove();
        });
    
        // Voltar ao Dashboard
        const backBtn = modal.querySelector('#audit-back-dashboard');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                modal.remove();
                if (window.NavigationSystem && typeof NavigationSystem.navigateToModule === 'function') {
                    NavigationSystem.navigateToModule('dashboard');
                } else {
                    try {
                        window.location.href = '/?module=dashboard';
                    } catch (e) {
                        console.warn('[AuditSystem] Não foi possível navegar para o dashboard.', e);
                    }
                }
            });
        }
    
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    
        return modal;
    }

    populateAuditViewer(modal) {
        const applyFilters = () => {
            const moduleFilter = modal.querySelector('#audit-module-filter').value;
            const operationFilter = modal.querySelector('#audit-operation-filter').value;
            const dateFilter = modal.querySelector('#audit-date-filter').value;

            const filters = {};
            if (moduleFilter) filters.module = moduleFilter;
            if (operationFilter) filters.operation = operationFilter;
            if (dateFilter) filters.startDate = dateFilter;

            const filteredData = this.getAuditHistory(filters);
            this.updateAuditTable(modal, filteredData);
            this.updateAuditStats(modal, filteredData);
        };

        // Event listeners para filtros
        modal.querySelector('#apply-audit-filters').addEventListener('click', applyFilters);

        // Event listeners para exportação
        modal.querySelector('#export-audit-json').addEventListener('click', () => {
            const data = this.exportAuditLog('json');
            this.downloadFile('audit-log.json', data, 'application/json');
        });

        modal.querySelector('#export-audit-csv').addEventListener('click', () => {
            const data = this.exportAuditLog('csv');
            this.downloadFile('audit-log.csv', data, 'text/csv');
        });

        modal.querySelector('#clear-audit-log').addEventListener('click', () => {
            this.clearAuditLog();
            applyFilters(); // Atualiza a visualização
        });

        // Carrega dados iniciais
        applyFilters();
    }

    updateAuditTable(modal, data) {
        const tbody = modal.querySelector('#audit-table-body');
        tbody.innerHTML = '';

        data.slice(0, 100).forEach(entry => { // Limita a 100 registros para performance
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            
            const operationClass = {
                'CREATE': 'text-green-600',
                'UPDATE': 'text-blue-600',
                'DELETE': 'text-red-600'
            }[entry.operation] || 'text-gray-600';

            row.innerHTML = `
                <td class="border border-gray-300 px-4 py-2 text-sm">
                    ${new Date(entry.timestamp).toLocaleString('pt-BR')}
                </td>
                <td class="border border-gray-300 px-4 py-2">
                    <span class="px-2 py-1 rounded text-xs font-semibold ${operationClass}">
                        ${entry.operation}
                    </span>
                </td>
                <td class="border border-gray-300 px-4 py-2 text-sm">
                    ${entry.module || '-'}
                </td>
                <td class="border border-gray-300 px-4 py-2 text-sm">
                    ${entry.user ? entry.user.name : 'Sistema'}
                </td>
                <td class="border border-gray-300 px-4 py-2 text-sm">
                    ${entry.changes ? Object.keys(entry.changes).length + ' campo(s)' : '-'}
                </td>
            `;

            tbody.appendChild(row);
        });

        if (data.length > 100) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="5" class="border border-gray-300 px-4 py-2 text-center text-gray-500">
                    ... e mais ${data.length - 100} registros. Use os filtros para refinar a busca.
                </td>
            `;
            tbody.appendChild(row);
        }
    }

    updateAuditStats(modal, data) {
        const statsContainer = modal.querySelector('#audit-stats');
        const stats = this.getModuleStatistics();

        statsContainer.innerHTML = `
            <div class="bg-blue-50 p-4 rounded">
                <div class="text-2xl font-bold text-blue-600">${data.length}</div>
                <div class="text-sm text-gray-600">Total de Registros</div>
            </div>
            <div class="bg-green-50 p-4 rounded">
                <div class="text-2xl font-bold text-green-600">${stats.operations.CREATE}</div>
                <div class="text-sm text-gray-600">Criações</div>
            </div>
            <div class="bg-yellow-50 p-4 rounded">
                <div class="text-2xl font-bold text-yellow-600">${stats.operations.UPDATE}</div>
                <div class="text-sm text-gray-600">Atualizações</div>
            </div>
            <div class="bg-red-50 p-4 rounded">
                <div class="text-2xl font-bold text-red-600">${stats.operations.DELETE}</div>
                <div class="text-sm text-gray-600">Exclusões</div>
            </div>
        `;
    }

    downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    window.AuditSystem = new AuditSystem();
});

// Exporta globalmente
window.AuditSystem = window.AuditSystem || AuditSystem;
