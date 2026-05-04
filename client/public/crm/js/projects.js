// Sistema de Versionamento de Projetos - SAMS Locações CRM/ERP
const ProjectVersioningSystem = {
    // Configurações
    config: {
        modalId: 'project-modal',
        overlayId: 'project-overlay',
        versionModalId: 'version-modal',
        versionOverlayId: 'version-overlay'
    },

    // Inicialização
    init() {
        this.createModalStructures();
        this.bindEvents();
    },

    // Criar estruturas dos modais
    createModalStructures() {
        this.createProjectModal();
        this.createVersionModal();
    },

    // Criar modal principal de projeto
    createProjectModal() {
        const existingModal = document.getElementById(this.config.modalId);
        if (existingModal) {
            existingModal.remove();
        }

        const modalHTML = `
            <div id="${this.config.overlayId}" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden">
                <div id="${this.config.modalId}" class="fixed inset-0 flex items-center justify-center p-4">
                    <div class="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
                        <div class="flex justify-between items-center p-6 border-b border-gray-200">
                            <h2 id="project-title" class="text-xl font-semibold text-gray-800">Projeto</h2>
                            <button id="project-close" class="text-gray-400 hover:text-gray-600 transition duration-300">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <div id="project-content" class="p-6">
                            <!-- Conteúdo do projeto será inserido aqui -->
                        </div>
                        <div id="project-footer" class="flex justify-between items-center p-6 border-t border-gray-200">
                            <div id="project-actions-left" class="flex space-x-3">
                                <!-- Ações à esquerda -->
                            </div>
                            <div class="flex space-x-3">
                                <button id="project-dashboard" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition duration-300">
                                    Voltar ao Dashboard
                                </button>
                                <button id="project-cancel" class="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-300">
                                    Cancelar
                                </button>
                                <button id="project-save" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300">
                                    Salvar Projeto
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    // Criar modal de versão
    createVersionModal() {
        const existingModal = document.getElementById(this.config.versionModalId);
        if (existingModal) {
            existingModal.remove();
        }

        const modalHTML = `
            <div id="${this.config.versionOverlayId}" class="fixed inset-0 bg-black bg-opacity-50 z-60 hidden">
                <div id="${this.config.versionModalId}" class="fixed inset-0 flex items-center justify-center p-4">
                    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div class="flex justify-between items-center p-6 border-b border-gray-200">
                            <h2 id="version-title" class="text-xl font-semibold text-gray-800">Nova Versão</h2>
                            <button id="version-close" class="text-gray-400 hover:text-gray-600 transition duration-300">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <div id="version-content" class="p-6">
                            <!-- Conteúdo da versão será inserido aqui -->
                        </div>
                        <div class="flex justify-end space-x-3 p-6 border-t border-gray-200">
                            <button id="version-dashboard" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition duration-300">Voltar ao Dashboard</button>
                            <button id="version-cancel" class="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-300">
                                Cancelar
                            </button>
                            <button id="version-save" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-300">
                                Criar Versão
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    // Vincular eventos
    bindEvents() {
        // Eventos do modal principal
        const overlay = document.getElementById(this.config.overlayId);
        const closeBtn = document.getElementById('project-close');
        const cancelBtn = document.getElementById('project-cancel');
        const saveBtn = document.getElementById('project-save');
        const dashboardBtn = document.getElementById('project-dashboard');

        [overlay, closeBtn, cancelBtn].forEach(element => {
            element?.addEventListener('click', (e) => {
                if (e.target === overlay || e.target === closeBtn || e.target === cancelBtn) {
                    this.closeProjectModal();
                }
            });
        });

        saveBtn?.addEventListener('click', () => {
            this.saveProject();
        });

        dashboardBtn?.addEventListener('click', () => {
            this.closeProjectModal();
            if (window.NavigationSystem?.navigateToModule) {
                window.NavigationSystem.navigateToModule('dashboard');
            } else {
                console.warn('NavigationSystem não disponível. Redirecione manualmente para o dashboard.');
            }
        });
        // Eventos do modal de versão
        const versionOverlay = document.getElementById(this.config.versionOverlayId);
        const versionCloseBtn = document.getElementById('version-close');
        const versionCancelBtn = document.getElementById('version-cancel');
        const versionSaveBtn = document.getElementById('version-save');
        const versionDashboardBtn = document.getElementById('version-dashboard');

        [versionOverlay, versionCloseBtn, versionCancelBtn].forEach(element => {
            element?.addEventListener('click', (e) => {
                if (e.target === versionOverlay || e.target === versionCloseBtn || e.target === versionCancelBtn) {
                    this.closeVersionModal();
                }
            });
        });

        versionSaveBtn?.addEventListener('click', () => {
            this.saveVersion();
        });

        versionDashboardBtn?.addEventListener('click', () => {
            this.closeVersionModal();
            if (window.NavigationSystem?.navigateToModule) {
                window.NavigationSystem.navigateToModule('dashboard');
            } else {
                console.warn('NavigationSystem não disponível. Redirecione manualmente para o dashboard.');
            }
        });
        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            // Só processar ESC se não estivermos em um campo de input
            if (e.key === 'Escape' && !e.target.matches('input, textarea, select')) {
                if (!document.getElementById(this.config.versionOverlayId).classList.contains('hidden')) {
                    this.closeVersionModal();
                } else if (!document.getElementById(this.config.overlayId).classList.contains('hidden')) {
                    this.closeProjectModal();
                }
            }
        });
    },

    // Abrir modal de projeto
    openProjectModal(title, content, projectId = null) {
        const overlay = document.getElementById(this.config.overlayId);
        const modalTitle = document.getElementById('project-title');
        const modalContent = document.getElementById('project-content');
        const actionsLeft = document.getElementById('project-actions-left');

        modalTitle.textContent = title;
        modalContent.innerHTML = content;
        
        // Adicionar botão de nova versão se for edição
        if (projectId) {
            actionsLeft.innerHTML = `
                <button id="new-version-btn" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-300">
                    <i class="fas fa-plus mr-2"></i>Nova Versão
                </button>
                <button id="view-versions-btn" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-300">
                    <i class="fas fa-history mr-2"></i>Histórico
                </button>
            `;

            // Vincular eventos dos botões
            document.getElementById('new-version-btn')?.addEventListener('click', () => {
                this.showNewVersionForm(projectId);
            });

            document.getElementById('view-versions-btn')?.addEventListener('click', () => {
                this.showVersionHistory(projectId);
            });
        } else {
            actionsLeft.innerHTML = '';
        }

        overlay.classList.remove('hidden');
        
        // Focar no primeiro input
        setTimeout(() => {
            const firstInput = modalContent.querySelector('input, select, textarea');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    },

    // Fechar modal de projeto
    closeProjectModal() {
        const overlay = document.getElementById(this.config.overlayId);
        overlay.classList.add('hidden');
    },

    // Abrir modal de versão
    openVersionModal(title, content) {
        const overlay = document.getElementById(this.config.versionOverlayId);
        const modalTitle = document.getElementById('version-title');
        const modalContent = document.getElementById('version-content');

        modalTitle.textContent = title;
        modalContent.innerHTML = content;
        overlay.classList.remove('hidden');
        
        // Focar no primeiro input
        setTimeout(() => {
            const firstInput = modalContent.querySelector('input, select, textarea');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    },

    // Fechar modal de versão
    closeVersionModal() {
        const overlay = document.getElementById(this.config.versionOverlayId);
        overlay.classList.add('hidden');
    },

    // Gerar formulário de projeto
    generateProjectForm(project = null) {
        const isEdit = project !== null;
        const formId = `project_${project?.id || 'new'}_${Math.random().toString(36).substr(2, 9)}`;
        
        return `
            <form id="project-form" data-action="${isEdit ? 'update' : 'create'}" ${isEdit ? `data-id="${project.id}"` : ''}>
                <!-- Informações Básicas -->
                <div class="bg-gray-50 p-6 rounded-lg mb-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-info-circle mr-2 text-blue-600"></i>
                        Informações Básicas
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="nome_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Nome do Projeto *</label>
                            <input type="text" name="nome" id="nome_${formId}" value="${project?.nome || ''}" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label for="cliente_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Cliente *</label>
                            <input type="text" name="cliente" id="cliente_${formId}" value="${project?.cliente || ''}" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label for="tipo_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Tipo de Projeto *</label>
                            <select name="tipo" id="tipo_${formId}" required 
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">Selecione...</option>
                                <option value="Stand Personalizado" ${project?.tipo === 'Stand Personalizado' ? 'selected' : ''}>Stand Personalizado</option>
                                <option value="Stand Modular" ${project?.tipo === 'Stand Modular' ? 'selected' : ''}>Stand Modular</option>
                                <option value="Cenografia" ${project?.tipo === 'Cenografia' ? 'selected' : ''}>Cenografia</option>
                                <option value="Arquitetura Efêmera" ${project?.tipo === 'Arquitetura Efêmera' ? 'selected' : ''}>Arquitetura Efêmera</option>
                                <option value="Montagem Completa" ${project?.tipo === 'Montagem Completa' ? 'selected' : ''}>Montagem Completa</option>
                            </select>
                        </div>
                        <div>
                            <label for="status_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <select name="status" id="status_${formId}" 
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="Planejamento" ${project?.status === 'Planejamento' ? 'selected' : ''}>Planejamento</option>
                                <option value="Em Desenvolvimento" ${project?.status === 'Em Desenvolvimento' ? 'selected' : ''}>Em Desenvolvimento</option>
                                <option value="Aprovação Cliente" ${project?.status === 'Aprovação Cliente' ? 'selected' : ''}>Aprovação Cliente</option>
                                <option value="Produção" ${project?.status === 'Produção' ? 'selected' : ''}>Produção</option>
                                <option value="Montagem" ${project?.status === 'Montagem' ? 'selected' : ''}>Montagem</option>
                                <option value="Concluído" ${project?.status === 'Concluído' ? 'selected' : ''}>Concluído</option>
                                <option value="Cancelado" ${project?.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                            </select>
                        </div>
                        <div>
                            <label for="dataInicio_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Data de Início</label>
                            <input type="date" name="dataInicio" id="dataInicio_${formId}" value="${project?.dataInicio || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label for="dataEntrega_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Data de Entrega</label>
                            <input type="date" name="dataEntrega" id="dataEntrega_${formId}" value="${project?.dataEntrega || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                    </div>
                </div>

                <!-- Memorial Descritivo -->
                <div class="bg-gray-50 p-6 rounded-lg mb-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-file-alt mr-2 text-green-600"></i>
                        Memorial Descritivo
                    </h3>
                    <div class="space-y-4">
                        <div>
                            <label for="descricaoGeral_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Descrição Geral *</label>
                            <textarea name="descricaoGeral" id="descricaoGeral_${formId}" rows="4" required 
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      placeholder="Descreva o conceito geral do projeto, objetivos e características principais...">${project?.descricaoGeral || ''}</textarea>
                        </div>
                        <div>
                            <label for="especificacoesTecnicas_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Especificações Técnicas</label>
                            <textarea name="especificacoesTecnicas" id="especificacoesTecnicas_${formId}" rows="4" 
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      placeholder="Materiais, dimensões, estruturas, instalações elétricas, etc...">${project?.especificacoesTecnicas || ''}</textarea>
                        </div>
                        <div>
                            <label for="elementosVisuais_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Elementos Visuais</label>
                            <textarea name="elementosVisuais" id="elementosVisuais_${formId}" rows="3" 
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      placeholder="Cores, logotipos, painéis, iluminação, decoração...">${project?.elementosVisuais || ''}</textarea>
                        </div>
                        <div>
                            <label for="funcionalidades_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Funcionalidades</label>
                            <textarea name="funcionalidades" id="funcionalidades_${formId}" rows="3" 
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      placeholder="Áreas de atendimento, exposição, reunião, armazenamento...">${project?.funcionalidades || ''}</textarea>
                        </div>
                    </div>
                </div>

                <!-- Orçamento e Recursos -->
                <div class="bg-gray-50 p-6 rounded-lg">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-calculator mr-2 text-purple-600"></i>
                        Orçamento e Recursos
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="valorProjeto_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Valor do Projeto</label>
                            <input type="text" name="valorProjeto" id="valorProjeto_${formId}" value="${project?.valorProjeto || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                   placeholder="R$ 0,00">
                        </div>
                        <div>
                            <label for="responsavelTecnico_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Responsável Técnico</label>
                            <input type="text" name="responsavelTecnico" id="responsavelTecnico_${formId}" value="${project?.responsavelTecnico || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div class="md:col-span-2">
                            <label for="observacoes_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                            <textarea name="observacoes" id="observacoes_${formId}" rows="3" 
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      placeholder="Informações adicionais, restrições, requisitos especiais...">${project?.observacoes || ''}</textarea>
                        </div>
                    </div>
                </div>

                ${isEdit ? `
                    <!-- Informações da Versão Atual -->
                    <div class="bg-blue-50 p-4 rounded-lg mt-6">
                        <h4 class="text-md font-semibold text-blue-800 mb-2">Versão Atual</h4>
                        <p class="text-sm text-blue-700">
                            <strong>Versão:</strong> ${project.versaoAtual || '1.0'} | 
                            <strong>Última Atualização:</strong> ${Utils.formatters.formatDate(project.dataAtualizacao)}
                        </p>
                    </div>
                ` : ''}
            </form>
        `;
    },

    // Gerar formulário de nova versão
    generateVersionForm(projectId) {
        const project = ModuleSystem.data.projetos?.find(p => p.id == projectId);
        if (!project) return '<p class="text-red-600">Projeto não encontrado.</p>';

        const formId = `version_${projectId}_${Math.random().toString(36).substr(2, 9)}`;

        return `
            <form id="version-form" data-project-id="${projectId}">
                <div class="space-y-6">
                    <!-- Informações da Nova Versão -->
                    <div class="bg-gray-50 p-6 rounded-lg">
                        <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <i class="fas fa-code-branch mr-2 text-green-600"></i>
                            Nova Versão do Projeto
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label for="numeroVersao_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Número da Versão *</label>
                                <input type="text" name="numeroVersao" id="numeroVersao_${formId}" required 
                                       value="${this.getNextVersion(project.versaoAtual || '1.0')}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            </div>
                            <div>
                                <label for="tipoAlteracao_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Tipo de Alteração *</label>
                                <select name="tipoAlteracao" id="tipoAlteracao_${formId}" required 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    <option value="">Selecione...</option>
                                    <option value="Correção">Correção</option>
                                    <option value="Melhoria">Melhoria</option>
                                    <option value="Nova Funcionalidade">Nova Funcionalidade</option>
                                    <option value="Alteração Cliente">Alteração Cliente</option>
                                    <option value="Otimização">Otimização</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Descrição das Alterações -->
                    <div class="bg-gray-50 p-6 rounded-lg">
                        <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <i class="fas fa-edit mr-2 text-blue-600"></i>
                            Descrição das Alterações
                        </h3>
                        <div class="space-y-4">
                            <div>
                                <label for="resumoAlteracoes_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Resumo das Alterações *</label>
                                <textarea name="resumoAlteracoes" id="resumoAlteracoes_${formId}" rows="3" required 
                                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                          placeholder="Descreva brevemente as principais alterações desta versão..."></textarea>
                            </div>
                            <div>
                                <label for="alteracoesDetalhadas_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Alterações Detalhadas</label>
                                <textarea name="alteracoesDetalhadas" id="alteracoesDetalhadas_${formId}" rows="5" 
                                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                          placeholder="Detalhe todas as modificações, adições e remoções..."></textarea>
                            </div>
                            <div>
                                <label for="justificativa_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Justificativa</label>
                                <textarea name="justificativa" id="justificativa_${formId}" rows="3" 
                                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                          placeholder="Motivo das alterações, solicitações do cliente, melhorias identificadas..."></textarea>
                            </div>
                        </div>
                    </div>

                    <!-- Impactos -->
                    <div class="bg-gray-50 p-6 rounded-lg">
                        <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <i class="fas fa-exclamation-triangle mr-2 text-orange-600"></i>
                            Impactos da Versão
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label for="impactoCronograma_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Impacto no Cronograma</label>
                                <select name="impactoCronograma" id="impactoCronograma_${formId}" 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    <option value="">Selecione...</option>
                                    <option value="Nenhum">Nenhum</option>
                                    <option value="Baixo">Baixo (1-2 dias)</option>
                                    <option value="Médio">Médio (3-7 dias)</option>
                                    <option value="Alto">Alto (mais de 7 dias)</option>
                                </select>
                            </div>
                            <div>
                                <label for="impactoOrcamento_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Impacto no Orçamento</label>
                                <select name="impactoOrcamento" id="impactoOrcamento_${formId}" 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    <option value="">Selecione...</option>
                                    <option value="Nenhum">Nenhum</option>
                                    <option value="Baixo">Baixo (até 5%)</option>
                                    <option value="Médio">Médio (5-15%)</option>
                                    <option value="Alto">Alto (mais de 15%)</option>
                                </select>
                            </div>
                            <div class="md:col-span-2">
                                <label for="observacoesImpacto_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Observações sobre Impactos</label>
                                <textarea name="observacoesImpacto" id="observacoesImpacto_${formId}" rows="2" 
                                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                          placeholder="Detalhes sobre os impactos identificados..."></textarea>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        `;
    },

    // Obter próxima versão
    getNextVersion(currentVersion) {
        const parts = currentVersion.split('.');
        const major = parseInt(parts[0]) || 1;
        const minor = parseInt(parts[1]) || 0;
        
        return `${major}.${minor + 1}`;
    },

    // Salvar projeto
    saveProject() {
        const form = document.getElementById('project-form');
        if (!form) return;

        const formData = new FormData(form);
        const data = {};
        
        // Converter FormData para objeto
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        // Validar campos obrigatórios
        const requiredFields = ['nome', 'cliente', 'tipo', 'descricaoGeral'];
        
        for (let field of requiredFields) {
            if (!data[field]) {
                Utils.notifications.error(`O campo ${field} é obrigatório.`);
                return;
            }
        }

        const action = form.getAttribute('data-action');
        const id = form.getAttribute('data-id');

        try {
            if (action === 'create') {
                // Criar novo projeto
                data.id = Utils.generateId();
                data.dataCriacao = new Date().toISOString();
                data.dataAtualizacao = new Date().toISOString();
                data.versaoAtual = '1.0';
                data.versoes = [{
                    numero: '1.0',
                    data: new Date().toISOString(),
                    tipo: 'Criação',
                    resumo: 'Versão inicial do projeto',
                    autor: AuthSystem.currentUser.nome
                }];

                ModuleSystem.addItem('projetos', data);
            } else if (action === 'update') {
                // Atualizar projeto existente
                data.dataAtualizacao = new Date().toISOString();
                ModuleSystem.updateItem('projetos', id, data);
            }

            Utils.notifications.success('Projeto salvo com sucesso!');
            this.closeProjectModal();
            
            // Recarregar página se estiver no módulo projetos
            if (NavigationSystem.currentModule === 'projetos') {
                NavigationSystem.loadCurrentPage();
            }
        } catch (error) {
            Utils.notifications.error('Erro ao salvar projeto: ' + error.message);
        }
    },

    // Salvar versão
    saveVersion() {
        const form = document.getElementById('version-form');
        if (!form) return;

        const formData = new FormData(form);
        const data = {};
        
        // Converter FormData para objeto
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        // Validar campos obrigatórios
        const requiredFields = ['numeroVersao', 'tipoAlteracao', 'resumoAlteracoes'];
        
        for (let field of requiredFields) {
            if (!data[field]) {
                Utils.notifications.error(`O campo ${field} é obrigatório.`);
                return;
            }
        }

        const projectId = form.getAttribute('data-project-id');
        const project = ModuleSystem.data.projetos?.find(p => p.id == projectId);
        
        if (!project) {
            Utils.notifications.error('Projeto não encontrado.');
            return;
        }

        try {
            // Criar nova versão
            const newVersion = {
                numero: data.numeroVersao,
                data: new Date().toISOString(),
                tipo: data.tipoAlteracao,
                resumo: data.resumoAlteracoes,
                detalhes: data.alteracoesDetalhadas,
                justificativa: data.justificativa,
                impactoCronograma: data.impactoCronograma,
                impactoOrcamento: data.impactoOrcamento,
                observacoesImpacto: data.observacoesImpacto,
                autor: AuthSystem.currentUser.nome
            };

            // Atualizar projeto
            if (!project.versoes) project.versoes = [];
            project.versoes.push(newVersion);
            project.versaoAtual = data.numeroVersao;
            project.dataAtualizacao = new Date().toISOString();

            ModuleSystem.updateItem('projetos', projectId, project);

            Utils.notifications.success('Nova versão criada com sucesso!');
            this.closeVersionModal();
            
            // Recarregar o projeto
            this.showProject(projectId);
        } catch (error) {
            Utils.notifications.error('Erro ao criar versão: ' + error.message);
        }
    },

    // Mostrar projeto
    showProject(id = null) {
        if (id) {
            const project = ModuleSystem.data.projetos?.find(p => p.id == id);
            if (project) {
                this.openProjectModal('Editar Projeto', this.generateProjectForm(project), id);
            } else {
                Utils.notifications.error('Projeto não encontrado.');
            }
        } else {
            this.openProjectModal('Novo Projeto', this.generateProjectForm());
        }
    },

    // Mostrar formulário de nova versão
    showNewVersionForm(projectId) {
        this.openVersionModal('Nova Versão', this.generateVersionForm(projectId));
    },

    // Mostrar histórico de versões
    showVersionHistory(projectId) {
        const project = ModuleSystem.data.projetos?.find(p => p.id == projectId);
        if (!project || !project.versoes) {
            Utils.notifications.error('Nenhuma versão encontrada.');
            return;
        }

        const versionsHTML = `
            <div class="space-y-4">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">Histórico de Versões - ${project.nome}</h3>
                <div class="space-y-3">
                    ${project.versoes.map(version => `
                        <div class="bg-white border border-gray-200 rounded-lg p-4">
                            <div class="flex justify-between items-start mb-2">
                                <div>
                                    <span class="text-lg font-semibold text-blue-600">v${version.numero}</span>
                                    <span class="ml-2 px-2 py-1 text-xs font-semibold rounded-full 
                                        ${version.tipo === 'Criação' ? 'bg-green-100 text-green-800' : 
                                          version.tipo === 'Correção' ? 'bg-red-100 text-red-800' : 
                                          'bg-blue-100 text-blue-800'}">
                                        ${version.tipo}
                                    </span>
                                </div>
                                <div class="text-sm text-gray-500">
                                    ${Utils.formatters.formatDate(version.data)} | ${version.autor}
                                </div>
                            </div>
                            <p class="text-gray-700 mb-2">${version.resumo}</p>
                            ${version.detalhes ? `
                                <details class="text-sm text-gray-600">
                                    <summary class="cursor-pointer font-medium">Ver detalhes</summary>
                                    <div class="mt-2 p-3 bg-gray-50 rounded">
                                        <p class="whitespace-pre-line">${version.detalhes}</p>
                                        ${version.justificativa ? `
                                            <div class="mt-2 pt-2 border-t border-gray-200">
                                                <strong>Justificativa:</strong> ${version.justificativa}
                                            </div>
                                        ` : ''}
                                    </div>
                                </details>
                            ` : ''}
                        </div>
                    `).reverse().join('')}
                </div>
            </div>
        `;

        this.openVersionModal('Histórico de Versões', versionsHTML);
        
        // Ocultar botão salvar para visualização
        document.getElementById('version-save').style.display = 'none';
    }
};

// Exportar para uso global
window.ProjectVersioningSystem = ProjectVersioningSystem;