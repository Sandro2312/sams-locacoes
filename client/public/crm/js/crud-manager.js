/**
 * CRUDManager - Sistema de Gerenciamento CRUD Avançado
 * Operações completas com hooks, cache e integração com validação e segurança
 * Versão: 1.0.0
 */

class CRUDManager {
    constructor() {
        this.data = new Map();
        this.cache = new Map();
        this.hooks = new Map();
        this.relationships = new Map();
        this.indexes = new Map();
        this.eventListeners = new Map();
        
        this.initializeStorage();
        this.setupEventSystem();
        this.loadExistingData();
        
        console.log('CRUDManager inicializado');
    }

    /**
     * Inicialização e configuração
     */
    initializeStorage() {
        // Configurar estruturas de dados para cada módulo
        const modules = ['leads', 'clientes', 'briefings', 'projetos', 'usuarios', 'financeiro'];
        
        modules.forEach(module => {
            if (!this.data.has(module)) {
                this.data.set(module, new Map());
                this.cache.set(module, new Map());
                this.indexes.set(module, new Map());
                this.hooks.set(module, {
                    beforeCreate: [],
                    afterCreate: [],
                    beforeRead: [],
                    afterRead: [],
                    beforeUpdate: [],
                    afterUpdate: [],
                    beforeDelete: [],
                    afterDelete: [],
                    beforeValidate: [],
                    afterValidate: []
                });
            }
        });

        // Configurar relacionamentos
        this.setupRelationships();
    }

    setupRelationships() {
        // Lead -> Cliente (conversão)
        this.addRelationship('leads', 'clientes', 'one-to-one', 'convertedTo');
        
        // Cliente -> Briefings
        this.addRelationship('clientes', 'briefings', 'one-to-many', 'clienteId');
        
        // Briefing -> Projeto
        this.addRelationship('briefings', 'projetos', 'one-to-one', 'briefingId');
        
        // Cliente -> Projetos
        this.addRelationship('clientes', 'projetos', 'one-to-many', 'clienteId');
        
        // Projeto -> Financeiro
        this.addRelationship('projetos', 'financeiro', 'one-to-many', 'projetoId');
    }

    setupEventSystem() {
        // Sistema de eventos para sincronização
        this.eventBus = {
            events: new Map(),
            
            on(event, callback) {
                if (!this.events.has(event)) {
                    this.events.set(event, []);
                }
                this.events.get(event).push(callback);
            },
            
            emit(event, data) {
                if (this.events.has(event)) {
                    this.events.get(event).forEach(callback => {
                        try {
                            callback(data);
                        } catch (error) {
                            console.error(`Erro no evento ${event}:`, error);
                        }
                    });
                }
            },
            
            off(event, callback) {
                if (this.events.has(event)) {
                    const callbacks = this.events.get(event);
                    const index = callbacks.indexOf(callback);
                    if (index > -1) {
                        callbacks.splice(index, 1);
                    }
                }
            }
        };
    }

    loadExistingData() {
        // Carregar dados existentes do localStorage
        this.data.forEach((moduleData, module) => {
            const stored = localStorage.getItem(`${module}_data`);
            if (stored) {
                try {
                    const parsedData = JSON.parse(stored);
                    Object.entries(parsedData).forEach(([id, record]) => {
                        moduleData.set(id, record);
                        this.updateIndexes(module, record);
                    });
                } catch (error) {
                    console.error(`Erro ao carregar dados do módulo ${module}:`, error);
                }
            }
        });
    }

    /**
     * Operações CRUD principais
     */
    async create(module, data, options = {}) {
        try {
            // Executar hooks beforeCreate
            await this.executeHooks(module, 'beforeCreate', data);
            
            // Validar dados
            if (window.UnifiedValidator) {
                await this.executeHooks(module, 'beforeValidate', data);
                const validation = await window.UnifiedValidator.validateForm(module, data);
                await this.executeHooks(module, 'afterValidate', { data, validation });
                
                if (!validation.isValid) {
                    throw new Error(`Dados inválidos: ${this.formatValidationErrors(validation)}`);
                }
                
                data = validation.sanitizedData;
            }

            // Gerar ID único
            const id = this.generateId();
            
            // Preparar registro
            const record = {
                id,
                ...data,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                version: 1
            };

            // Criptografar dados sensíveis
            if (window.SecurityManager && options.encrypt) {
                record.encryptedData = await window.SecurityManager.encryptData(data);
            }

            // Salvar no storage
            const moduleData = this.data.get(module);
            moduleData.set(id, record);
            
            // Atualizar índices
            this.updateIndexes(module, record);
            
            // Persistir no localStorage
            await this.persistModule(module);
            
            // Limpar cache relacionado
            this.invalidateCache(module);
            
            // Executar hooks afterCreate
            await this.executeHooks(module, 'afterCreate', record);
            
            // Emitir evento
            this.eventBus.emit(`${module}:created`, record);
            
            // Log de auditoria
            if (window.AuditSystem) {
                window.AuditSystem.logOperation(module, 'create', record.id, null, record);
            }

            return { success: true, data: record, id };
            
        } catch (error) {
            console.error(`Erro ao criar ${module}:`, error);
            return { success: false, error: error.message };
        }
    }

    async read(module, id = null, options = {}) {
        try {
            // Executar hooks beforeRead
            await this.executeHooks(module, 'beforeRead', { id, options });
            
            const moduleData = this.data.get(module);
            let result;

            if (id) {
                // Buscar registro específico
                const cacheKey = `${module}:${id}`;
                
                if (this.cache.get(module).has(cacheKey) && !options.skipCache) {
                    result = this.cache.get(module).get(cacheKey);
                } else {
                    result = moduleData.get(id);
                    if (result) {
                        this.cache.get(module).set(cacheKey, result);
                    }
                }
                
                // Descriptografar se necessário
                if (result && result.encryptedData && window.SecurityManager) {
                    const decryptedData = await window.SecurityManager.decryptData(result.encryptedData);
                    result = { ...result, ...decryptedData };
                }
                
            } else {
                // Buscar todos os registros
                result = Array.from(moduleData.values());
                
                // Aplicar filtros
                if (options.filter) {
                    result = this.applyFilters(result, options.filter);
                }
                
                // Aplicar ordenação
                if (options.sort) {
                    result = this.applySorting(result, options.sort);
                }
                
                // Aplicar paginação
                if (options.pagination) {
                    result = this.applyPagination(result, options.pagination);
                }
            }
            
            // Executar hooks afterRead
            await this.executeHooks(module, 'afterRead', result);
            
            // Emitir evento
            this.eventBus.emit(`${module}:read`, { id, result });
            
            return { success: true, data: result };
            
        } catch (error) {
            console.error(`Erro ao ler ${module}:`, error);
            return { success: false, error: error.message };
        }
    }

    async update(module, id, data, options = {}) {
        try {
            const moduleData = this.data.get(module);
            const existingRecord = moduleData.get(id);
            
            if (!existingRecord) {
                throw new Error('Registro não encontrado');
            }

            // Executar hooks beforeUpdate
            await this.executeHooks(module, 'beforeUpdate', { id, data, existing: existingRecord });
            
            // Validar dados
            if (window.UnifiedValidator) {
                await this.executeHooks(module, 'beforeValidate', data);
                const validation = await window.UnifiedValidator.validateForm(module, data);
                await this.executeHooks(module, 'afterValidate', { data, validation });
                
                if (!validation.isValid) {
                    throw new Error(`Dados inválidos: ${this.formatValidationErrors(validation)}`);
                }
                
                data = validation.sanitizedData;
            }

            // Preparar registro atualizado
            const updatedRecord = {
                ...existingRecord,
                ...data,
                updatedAt: new Date().toISOString(),
                version: existingRecord.version + 1
            };

            // Criptografar dados sensíveis
            if (window.SecurityManager && options.encrypt) {
                updatedRecord.encryptedData = await window.SecurityManager.encryptData(data);
            }

            // Salvar no storage
            moduleData.set(id, updatedRecord);
            
            // Atualizar índices
            this.updateIndexes(module, updatedRecord);
            
            // Persistir no localStorage
            await this.persistModule(module);
            
            // Limpar cache relacionado
            this.invalidateCache(module, id);
            
            // Executar hooks afterUpdate
            await this.executeHooks(module, 'afterUpdate', { 
                id, 
                data: updatedRecord, 
                previous: existingRecord 
            });
            
            // Emitir evento
            this.eventBus.emit(`${module}:updated`, { 
                id, 
                data: updatedRecord, 
                previous: existingRecord 
            });
            
            // Log de auditoria
            if (window.AuditSystem) {
                window.AuditSystem.logOperation(module, 'update', id, existingRecord, updatedRecord);
            }

            return { success: true, data: updatedRecord };
            
        } catch (error) {
            console.error(`Erro ao atualizar ${module}:`, error);
            return { success: false, error: error.message };
        }
    }

    async delete(module, id, options = {}) {
        try {
            const moduleData = this.data.get(module);
            const existingRecord = moduleData.get(id);
            
            if (!existingRecord) {
                throw new Error('Registro não encontrado');
            }

            // Executar hooks beforeDelete
            await this.executeHooks(module, 'beforeDelete', { id, data: existingRecord });
            
            // Verificar relacionamentos
            if (!options.force) {
                const relationships = this.checkRelationships(module, id);
                if (relationships.length > 0) {
                    throw new Error(`Não é possível excluir: existem relacionamentos com ${relationships.join(', ')}`);
                }
            }

            // Soft delete ou hard delete
            if (options.softDelete) {
                const deletedRecord = {
                    ...existingRecord,
                    deletedAt: new Date().toISOString(),
                    isDeleted: true,
                    version: existingRecord.version + 1
                };
                
                moduleData.set(id, deletedRecord);
                await this.persistModule(module);
                
                // Executar hooks afterDelete
                await this.executeHooks(module, 'afterDelete', { 
                    id, 
                    data: deletedRecord, 
                    softDelete: true 
                });
                
                return { success: true, data: deletedRecord, softDelete: true };
                
            } else {
                // Hard delete
                moduleData.delete(id);
                
                // Remover dos índices
                this.removeFromIndexes(module, existingRecord);
                
                // Persistir no localStorage
                await this.persistModule(module);
                
                // Limpar cache relacionado
                this.invalidateCache(module, id);
                
                // Executar hooks afterDelete
                await this.executeHooks(module, 'afterDelete', { 
                    id, 
                    data: existingRecord, 
                    softDelete: false 
                });
            }
            
            // Emitir evento
            this.eventBus.emit(`${module}:deleted`, { id, data: existingRecord });
            
            // Log de auditoria
            if (window.AuditSystem) {
                window.AuditSystem.logOperation(module, 'delete', id, existingRecord, null);
            }

            return { success: true, id };
            
        } catch (error) {
            console.error(`Erro ao excluir ${module}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sistema de Hooks
     */
    addHook(module, event, callback) {
        if (this.hooks.has(module) && this.hooks.get(module)[event]) {
            this.hooks.get(module)[event].push(callback);
        }
    }

    removeHook(module, event, callback) {
        if (this.hooks.has(module) && this.hooks.get(module)[event]) {
            const hooks = this.hooks.get(module)[event];
            const index = hooks.indexOf(callback);
            if (index > -1) {
                hooks.splice(index, 1);
            }
        }
    }

    async executeHooks(module, event, data) {
        if (this.hooks.has(module) && this.hooks.get(module)[event]) {
            const hooks = this.hooks.get(module)[event];
            for (const hook of hooks) {
                try {
                    await hook(data);
                } catch (error) {
                    console.error(`Erro no hook ${event} do módulo ${module}:`, error);
                }
            }
        }
    }

    /**
     * Sistema de Relacionamentos
     */
    addRelationship(fromModule, toModule, type, foreignKey) {
        if (!this.relationships.has(fromModule)) {
            this.relationships.set(fromModule, []);
        }
        
        this.relationships.get(fromModule).push({
            toModule,
            type,
            foreignKey
        });
    }

    checkRelationships(module, id) {
        const relatedModules = [];
        
        this.relationships.forEach((relationships, fromModule) => {
            relationships.forEach(rel => {
                if (rel.toModule === module) {
                    const fromData = this.data.get(fromModule);
                    const hasRelated = Array.from(fromData.values()).some(record => 
                        record[rel.foreignKey] === id && !record.isDeleted
                    );
                    
                    if (hasRelated) {
                        relatedModules.push(fromModule);
                    }
                }
            });
        });
        
        return relatedModules;
    }

    async getRelated(module, id, relatedModule) {
        const relationships = this.relationships.get(module) || [];
        const relationship = relationships.find(rel => rel.toModule === relatedModule);
        
        if (!relationship) {
            return { success: false, error: 'Relacionamento não encontrado' };
        }

        const relatedData = this.data.get(relatedModule);
        const related = Array.from(relatedData.values()).filter(record => 
            record[relationship.foreignKey] === id && !record.isDeleted
        );

        return { success: true, data: related };
    }

    /**
     * Sistema de Cache
     */
    invalidateCache(module, id = null) {
        const moduleCache = this.cache.get(module);
        
        if (id) {
            moduleCache.delete(`${module}:${id}`);
        } else {
            moduleCache.clear();
        }
    }

    /**
     * Sistema de Índices
     */
    updateIndexes(module, record) {
        const moduleIndexes = this.indexes.get(module);
        
        // Índice por email (se existir)
        if (record.email) {
            if (!moduleIndexes.has('email')) {
                moduleIndexes.set('email', new Map());
            }
            moduleIndexes.get('email').set(record.email, record.id);
        }
        
        // Índice por documento (se existir)
        if (record.documento) {
            if (!moduleIndexes.has('documento')) {
                moduleIndexes.set('documento', new Map());
            }
            moduleIndexes.get('documento').set(record.documento, record.id);
        }
        
        // Índice por status (se existir)
        if (record.status) {
            if (!moduleIndexes.has('status')) {
                moduleIndexes.set('status', new Map());
            }
            if (!moduleIndexes.get('status').has(record.status)) {
                moduleIndexes.get('status').set(record.status, new Set());
            }
            moduleIndexes.get('status').get(record.status).add(record.id);
        }
    }

    removeFromIndexes(module, record) {
        const moduleIndexes = this.indexes.get(module);
        
        // Remover dos índices
        moduleIndexes.forEach((index, indexName) => {
            if (indexName === 'email' && record.email) {
                index.delete(record.email);
            } else if (indexName === 'documento' && record.documento) {
                index.delete(record.documento);
            } else if (indexName === 'status' && record.status) {
                const statusSet = index.get(record.status);
                if (statusSet) {
                    statusSet.delete(record.id);
                    if (statusSet.size === 0) {
                        index.delete(record.status);
                    }
                }
            }
        });
    }

    /**
     * Utilitários
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    async persistModule(module) {
        const moduleData = this.data.get(module);
        const dataObject = {};
        
        moduleData.forEach((record, id) => {
            dataObject[id] = record;
        });
        
        localStorage.setItem(`${module}_data`, JSON.stringify(dataObject));
    }

    formatValidationErrors(validation) {
        const errors = [];
        Object.entries(validation.fields).forEach(([field, result]) => {
            if (!result.isValid) {
                errors.push(`${field}: ${result.errors.join(', ')}`);
            }
        });
        return errors.join('; ');
    }

    applyFilters(data, filters) {
        return data.filter(record => {
            return Object.entries(filters).every(([key, value]) => {
                if (typeof value === 'object' && value.operator) {
                    switch (value.operator) {
                        case 'contains':
                            return record[key] && record[key].toLowerCase().includes(value.value.toLowerCase());
                        case 'equals':
                            return record[key] === value.value;
                        case 'gt':
                            return record[key] > value.value;
                        case 'lt':
                            return record[key] < value.value;
                        case 'gte':
                            return record[key] >= value.value;
                        case 'lte':
                            return record[key] <= value.value;
                        default:
                            return record[key] === value.value;
                    }
                } else {
                    return record[key] === value;
                }
            });
        });
    }

    applySorting(data, sort) {
        return data.sort((a, b) => {
            const { field, direction = 'asc' } = sort;
            const aVal = a[field];
            const bVal = b[field];
            
            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    applyPagination(data, pagination) {
        const { page = 1, limit = 10 } = pagination;
        const start = (page - 1) * limit;
        const end = start + limit;
        
        return {
            data: data.slice(start, end),
            pagination: {
                page,
                limit,
                total: data.length,
                totalPages: Math.ceil(data.length / limit)
            }
        };
    }

    /**
     * Métodos de conveniência
     */
    async findByEmail(module, email) {
        const moduleIndexes = this.indexes.get(module);
        if (moduleIndexes && moduleIndexes.has('email')) {
            const id = moduleIndexes.get('email').get(email);
            if (id) {
                return await this.read(module, id);
            }
        }
        return { success: false, error: 'Email não encontrado' };
    }

    async findByDocument(module, documento) {
        const moduleIndexes = this.indexes.get(module);
        if (moduleIndexes && moduleIndexes.has('documento')) {
            const id = moduleIndexes.get('documento').get(documento);
            if (id) {
                return await this.read(module, id);
            }
        }
        return { success: false, error: 'Documento não encontrado' };
    }

    async findByStatus(module, status) {
        const moduleIndexes = this.indexes.get(module);
        if (moduleIndexes && moduleIndexes.has('status')) {
            const ids = moduleIndexes.get('status').get(status);
            if (ids) {
                const results = [];
                for (const id of ids) {
                    const result = await this.read(module, id);
                    if (result.success) {
                        results.push(result.data);
                    }
                }
                return { success: true, data: results };
            }
        }
        return { success: true, data: [] };
    }

    // Estatísticas e relatórios
    getStats(module) {
        const moduleData = this.data.get(module);
        const records = Array.from(moduleData.values()).filter(r => !r.isDeleted);
        
        return {
            total: records.length,
            active: records.filter(r => r.status === 'ativo').length,
            inactive: records.filter(r => r.status === 'inativo').length,
            createdToday: records.filter(r => {
                const today = new Date().toDateString();
                return new Date(r.createdAt).toDateString() === today;
            }).length,
            updatedToday: records.filter(r => {
                const today = new Date().toDateString();
                return new Date(r.updatedAt).toDateString() === today;
            }).length
        };
    }
}

// Instância global do CRUDManager
window.CRUDManager = new CRUDManager();

console.log('CRUDManager carregado com sucesso');