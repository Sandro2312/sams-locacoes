// Sistema de Permissões Granulares - SAMS Locações CRM/ERP
const PermissionSystem = {
    // Configurações de permissões
    config: {
        modalId: 'permission-modal',
        overlayId: 'permission-overlay'
    },

    // Definição de permissões por módulo
    modulePermissions: {
        marketing: {
            name: 'Marketing',
            permissions: {
                'marketing.leads.view': 'Visualizar leads',
                'marketing.leads.create': 'Criar leads',
                'marketing.leads.edit': 'Editar leads',
                'marketing.leads.delete': 'Excluir leads',
                'marketing.campanhas.view': 'Visualizar campanhas',
                'marketing.campanhas.create': 'Criar campanhas',
                'marketing.campanhas.edit': 'Editar campanhas',
                'marketing.campanhas.delete': 'Excluir campanhas',
                'marketing.contatos.view': 'Visualizar contatos',
                'marketing.contatos.create': 'Criar contatos',
                'marketing.contatos.edit': 'Editar contatos',
                'marketing.contatos.delete': 'Excluir contatos',
                'marketing.relatorios.view': 'Visualizar relatórios'
            }
        },
        comercial: {
            name: 'Comercial',
            permissions: {
                'comercial.clientes.view': 'Visualizar clientes',
                'comercial.clientes.create': 'Criar clientes',
                'comercial.clientes.edit': 'Editar clientes',
                'comercial.clientes.delete': 'Excluir clientes',
                'comercial.eventos.view': 'Visualizar eventos',
                'comercial.eventos.create': 'Criar eventos',
                'comercial.eventos.edit': 'Editar eventos',
                'comercial.eventos.delete': 'Excluir eventos',
                'comercial.briefings.view': 'Visualizar briefings',
                'comercial.briefings.create': 'Criar briefings',
                'comercial.briefings.edit': 'Editar briefings',
                'comercial.briefings.delete': 'Excluir briefings'
            }
        },
        projetos: {
            name: 'Projetos',
            permissions: {
                'projetos.projetos.view': 'Visualizar projetos',
                'projetos.projetos.create': 'Criar projetos',
                'projetos.projetos.edit': 'Editar projetos',
                'projetos.projetos.delete': 'Excluir projetos',
                'projetos.versoes.view': 'Visualizar versões',
                'projetos.versoes.create': 'Criar versões',
                'projetos.versoes.edit': 'Editar versões',
                'projetos.versoes.delete': 'Excluir versões',
                'projetos.arquivos.view': 'Visualizar arquivos',
                'projetos.arquivos.upload': 'Fazer upload de arquivos',
                'projetos.arquivos.download': 'Baixar arquivos',
                'projetos.arquivos.delete': 'Excluir arquivos'
            }
        },
        montagem: {
            name: 'Montagem',
            permissions: {
                'montagem.checklists.view': 'Visualizar checklists',
                'montagem.checklists.create': 'Criar checklists',
                'montagem.checklists.edit': 'Editar checklists',
                'montagem.checklists.delete': 'Excluir checklists',
                'montagem.execucao.view': 'Visualizar execução',
                'montagem.execucao.update': 'Atualizar execução',
                'montagem.fotos.view': 'Visualizar fotos',
                'montagem.fotos.upload': 'Fazer upload de fotos',
                'montagem.fotos.delete': 'Excluir fotos'
            }
        },
        financeiro: {
            name: 'Financeiro',
            permissions: {
                'financeiro.custos.view': 'Visualizar despesas',
                'financeiro.custos.create': 'Criar despesas',
                'financeiro.custos.edit': 'Editar despesas',
                'financeiro.custos.delete': 'Excluir despesas',
                'financeiro.receitas.view': 'Visualizar receitas',
                'financeiro.receitas.create': 'Criar receitas',
                'financeiro.receitas.edit': 'Editar receitas',
                'financeiro.receitas.delete': 'Excluir receitas',
                'financeiro.boletos.view': 'Visualizar boletos',
                'financeiro.boletos.create': 'Criar boletos',
                'financeiro.orcamentos.view': 'Visualizar orçamentos',
                'financeiro.orcamentos.create': 'Criar orçamentos',
                'financeiro.orcamentos.edit': 'Editar orçamentos',
                'financeiro.orcamentos.delete': 'Excluir orçamentos',
                'financeiro.contratos.view': 'Visualizar contratos',
                'financeiro.contratos.create': 'Criar contratos',
                'financeiro.contratos.edit': 'Editar contratos',
                'financeiro.contratos.delete': 'Excluir contratos',
                'financeiro.comissoes.view': 'Visualizar comissões',
                'financeiro.comissoes.calculate': 'Calcular comissões',
                'financeiro.relatorios.view': 'Visualizar relatórios financeiros',
                'financeiro.relatorios.export': 'Exportar relatórios'
            }
        },
        administrativo: {
            name: 'Administrativo',
            permissions: {
                'administrativo.fornecedores.view': 'Visualizar fornecedores',
                'administrativo.fornecedores.create': 'Criar fornecedores',
                'administrativo.fornecedores.edit': 'Editar fornecedores',
                'administrativo.fornecedores.delete': 'Excluir fornecedores',
                'administrativo.estoque.view': 'Visualizar estoque',
                'administrativo.estoque.update': 'Atualizar estoque',
                'administrativo.compras.view': 'Visualizar compras',
                'administrativo.compras.create': 'Criar compras',
                'administrativo.compras.approve': 'Aprovar compras'
            }
        },
        juridico: {
            name: 'Jurídico',
            permissions: {
                'juridico.contratos.view': 'Visualizar contratos',
                'juridico.contratos.create': 'Criar contratos',
                'juridico.contratos.edit': 'Editar contratos',
                'juridico.contratos.approve': 'Aprovar contratos',
                'juridico.demandas.view': 'Visualizar demandas',
                'juridico.demandas.create': 'Criar demandas',
                'juridico.demandas.edit': 'Editar demandas',
                'juridico.demandas.close': 'Fechar demandas',
                'juridico.documentos.view': 'Visualizar documentos',
                'juridico.documentos.upload': 'Fazer upload de documentos',
                'juridico.prazos.view': 'Visualizar prazos',
                'juridico.prazos.manage': 'Gerenciar prazos'
            }
        },
        kanban: {
            name: 'Kanban',
            permissions: {
                'kanban.boards.view': 'Visualizar quadros',
                'kanban.boards.create': 'Criar quadros',
                'kanban.boards.edit': 'Editar quadros',
                'kanban.boards.delete': 'Excluir quadros',
                'kanban.tasks.view': 'Visualizar tarefas',
                'kanban.tasks.create': 'Criar tarefas',
                'kanban.tasks.edit': 'Editar tarefas',
                'kanban.tasks.delete': 'Excluir tarefas',
                'kanban.tasks.move': 'Mover tarefas',
                'kanban.tasks.assign': 'Atribuir tarefas'
            }
        },
        administracao: {
            name: 'Administração',
            permissions: {
                'admin.users.view': 'Visualizar usuários',
                'admin.users.create': 'Criar usuários',
                'admin.users.edit': 'Editar usuários',
                'admin.users.delete': 'Excluir usuários',
                'admin.permissions.view': 'Visualizar permissões',
                'admin.permissions.edit': 'Editar permissões',
                'admin.settings.view': 'Visualizar configurações',
                'admin.settings.edit': 'Editar configurações',
                'admin.logs.view': 'Visualizar logs',
                'admin.backup.create': 'Criar backups',
                'admin.backup.restore': 'Restaurar backups'
            }
        },
        acervo: {
            name: 'Acervo Documental',
            permissions: {
                'acervo.documentos.view': 'Visualizar documentos',
                'acervo.documentos.create': 'Adicionar documentos',
                'acervo.documentos.edit': 'Editar documentos',
                'acervo.documentos.delete': 'Excluir documentos',
                'acervo.arquivos.upload': 'Fazer upload de arquivos',
                'acervo.arquivos.download': 'Baixar arquivos',
                'acervo.drive.link': 'Vincular Google Drive'
            }
        }
    },

    // Perfis de permissão predefinidos
    permissionProfiles: {
        administrador: {
            name: 'Administrador',
            description: 'Acesso total ao sistema',
            permissions: 'all'
        },
        gerente: {
            name: 'Gerente',
            description: 'Acesso a múltiplos módulos com permissões de gestão',
            permissions: [
                // Marketing
                'marketing.leads.view', 'marketing.leads.create', 'marketing.leads.edit',
                'marketing.campanhas.view', 'marketing.campanhas.create', 'marketing.campanhas.edit',
                'marketing.relatorios.view',
                // Comercial
                'comercial.clientes.view', 'comercial.clientes.create', 'comercial.clientes.edit',
                'comercial.eventos.view', 'comercial.eventos.create', 'comercial.eventos.edit',
                'comercial.briefings.view', 'comercial.briefings.create', 'comercial.briefings.edit',
                // Projetos
                'projetos.projetos.view', 'projetos.projetos.create', 'projetos.projetos.edit',
                'projetos.versoes.view', 'projetos.versoes.create', 'projetos.versoes.edit',
                'projetos.arquivos.view', 'projetos.arquivos.upload', 'projetos.arquivos.download',
                // Financeiro
                'financeiro.orcamentos.view', 'financeiro.orcamentos.create', 'financeiro.orcamentos.edit',
                'financeiro.contratos.view', 'financeiro.comissoes.view', 'financeiro.relatorios.view',
                // Kanban
                'kanban.boards.view', 'kanban.tasks.view', 'kanban.tasks.create', 'kanban.tasks.edit', 'kanban.tasks.move', 'kanban.tasks.assign'
            ]
        },
        vendedor: {
            name: 'Vendedor',
            description: 'Foco em atividades comerciais e relacionamento com clientes',
            permissions: [
                // Marketing
                'marketing.leads.view', 'marketing.leads.create', 'marketing.leads.edit',
                // Comercial
                'comercial.clientes.view', 'comercial.clientes.create', 'comercial.clientes.edit',
                'comercial.eventos.view', 'comercial.briefings.view', 'comercial.briefings.create',
                // Financeiro (limitado)
                'financeiro.orcamentos.view', 'financeiro.orcamentos.create',
                // Kanban
                'kanban.boards.view', 'kanban.tasks.view', 'kanban.tasks.create', 'kanban.tasks.edit'
            ]
        },
        projetista: {
            name: 'Projetista',
            description: 'Especializado em desenvolvimento e gestão de projetos',
            permissions: [
                // Projetos
                'projetos.projetos.view', 'projetos.projetos.create', 'projetos.projetos.edit',
                'projetos.versoes.view', 'projetos.versoes.create', 'projetos.versoes.edit',
                'projetos.arquivos.view', 'projetos.arquivos.upload', 'projetos.arquivos.download',
                // Comercial (limitado)
                'comercial.briefings.view',
                // Kanban
                'kanban.boards.view', 'kanban.tasks.view', 'kanban.tasks.create', 'kanban.tasks.edit'
            ]
        },
        montador: {
            name: 'Montador',
            description: 'Foco na execução e montagem de projetos',
            permissions: [
                // Montagem
                'montagem.checklists.view', 'montagem.execucao.view', 'montagem.execucao.update',
                'montagem.fotos.view', 'montagem.fotos.upload',
                // Projetos (limitado)
                'projetos.projetos.view', 'projetos.arquivos.view', 'projetos.arquivos.download',
                // Kanban
                'kanban.boards.view', 'kanban.tasks.view', 'kanban.tasks.edit'
            ]
        },
        financeiro: {
            name: 'Financeiro',
            description: 'Especializado em gestão financeira e contratos',
            permissions: [
                // Financeiro
                'financeiro.orcamentos.view', 'financeiro.orcamentos.create', 'financeiro.orcamentos.edit',
                'financeiro.contratos.view', 'financeiro.contratos.create', 'financeiro.contratos.edit',
                'financeiro.comissoes.view', 'financeiro.comissoes.calculate',
                'financeiro.relatorios.view', 'financeiro.relatorios.export',
                // Comercial (limitado)
                'comercial.clientes.view',
                // Administrativo (limitado)
                'administrativo.fornecedores.view', 'administrativo.compras.view',
                // Kanban
                'kanban.boards.view', 'kanban.tasks.view', 'kanban.tasks.create', 'kanban.tasks.edit'
            ]
        },
        juridico: {
            name: 'Jurídico',
            description: 'Especializado em questões legais e contratuais',
            permissions: [
                // Jurídico
                'juridico.contratos.view', 'juridico.contratos.create', 'juridico.contratos.edit', 'juridico.contratos.approve',
                'juridico.demandas.view', 'juridico.demandas.create', 'juridico.demandas.edit', 'juridico.demandas.close',
                'juridico.documentos.view', 'juridico.documentos.upload',
                'juridico.prazos.view', 'juridico.prazos.manage',
                // Financeiro (limitado)
                'financeiro.contratos.view',
                // Kanban
                'kanban.boards.view', 'kanban.tasks.view', 'kanban.tasks.create', 'kanban.tasks.edit'
            ]
        },
        visualizador: {
            name: 'Visualizador',
            description: 'Acesso apenas para visualização',
            permissions: [
                'marketing.leads.view', 'marketing.campanhas.view', 'marketing.relatorios.view',
                'comercial.clientes.view', 'comercial.eventos.view', 'comercial.briefings.view',
                'projetos.projetos.view', 'projetos.versoes.view', 'projetos.arquivos.view', 'projetos.arquivos.download',
                'montagem.checklists.view', 'montagem.execucao.view', 'montagem.fotos.view',
                'financeiro.orcamentos.view', 'financeiro.contratos.view', 'financeiro.relatorios.view',
                'administrativo.fornecedores.view', 'administrativo.estoque.view', 'administrativo.compras.view',
                'juridico.contratos.view', 'juridico.demandas.view', 'juridico.documentos.view', 'juridico.prazos.view',
                'kanban.boards.view', 'kanban.tasks.view'
            ]
        }
    },

    // Inicialização
    init() {
        this.createModalStructure();
        this.bindEvents();
        this.initializePermissions();
    },

    // Inicializar permissões no sistema de autenticação
    initializePermissions() {
        // Integrar com AuthSystem se disponível
        if (typeof AuthSystem !== 'undefined') {
            // Adicionar método de verificação de permissão ao AuthSystem
            AuthSystem.hasSpecificPermission = (permission) => {
                const currentUser = AuthSystem.getCurrentUser();
                if (!currentUser) return false;
                
                // Administrador tem todas as permissões
                if (currentUser.role === 'administrador') return true;
                
                // Verificar permissões específicas do usuário
                const userPermissions = currentUser.permissions || [];
                return userPermissions.includes(permission);
            };

            // Adicionar método para obter todas as permissões do usuário
            AuthSystem.getUserPermissions = () => {
                const currentUser = AuthSystem.getCurrentUser();
                if (!currentUser) return [];
                
                if (currentUser.role === 'administrador') return 'all';
                
                return currentUser.permissions || [];
            };

            // Adicionar método para definir permissões do usuário
            AuthSystem.setUserPermissions = (userId, permissions) => {
                const users = AuthSystem.getAllUsers();
                const userIndex = users.findIndex(u => u.id === userId);
                
                if (userIndex !== -1) {
                    users[userIndex].permissions = permissions;
                    AuthSystem.saveUsers(users);
                    return true;
                }
                return false;
            };
        }
    },

    // Criar estrutura do modal
    createModalStructure() {
        const existingModal = document.getElementById(this.config.modalId);
        if (existingModal) {
            existingModal.remove();
        }

        const modalHTML = `
            <div id="${this.config.overlayId}" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden">
                <div id="${this.config.modalId}" class="fixed inset-0 flex items-center justify-center p-4">
                    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div class="flex justify-between items-center p-6 border-b border-gray-200">
                            <h2 id="permission-title" class="text-xl font-semibold text-gray-800">Gerenciar Permissões</h2>
                            <button id="permission-close" class="text-gray-400 hover:text-gray-600 transition duration-300"
                                    title="Fechar modal"
                                    aria-label="Fechar modal">
                                <i class="fas fa-times text-xl" aria-hidden="true"></i>
                            </button>
                        </div>
                        <div id="permission-content" class="p-6">
                            <!-- Conteúdo será inserido aqui -->
                        </div>
                        <div class="flex justify-end space-x-3 p-6 border-t border-gray-200">
                            <button id="permission-dashboard" class="px-4 py-2 text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition duration-300">
                                <i class="fas fa-home mr-2"></i>
                                Voltar ao Dashboard
                            </button>
                            <button id="permission-cancel" class="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-300">
                                Cancelar
                            </button>
                            <button id="permission-save" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300">
                                Salvar Permissões
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
        const overlay = document.getElementById(this.config.overlayId);
        const closeBtn = document.getElementById('permission-close');
        const cancelBtn = document.getElementById('permission-cancel');
        const saveBtn = document.getElementById('permission-save');
        const dashboardBtn = document.getElementById('permission-dashboard');
        [overlay, closeBtn, cancelBtn].forEach(element => {
            element?.addEventListener('click', (e) => {
                if (e.target === overlay || e.target === closeBtn || e.target === cancelBtn) {
                    this.closeModal();
                }
            });
        });

        saveBtn?.addEventListener('click', () => {
            this.savePermissions();
        });

        dashboardBtn?.addEventListener('click', () => {
            this.closeModal();
            if (window.NavigationSystem && typeof window.NavigationSystem.navigateToModule === 'function') {
                window.NavigationSystem.navigateToModule('dashboard');
            } else {
                console.warn('[PermissionSystem] NavigationSystem não disponível.');
            }
        });

        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            // Só processar ESC se não estivermos em um campo de input
            if (e.key === 'Escape' && !e.target.matches('input, textarea, select') && !document.getElementById(this.config.overlayId).classList.contains('hidden')) {
                this.closeModal();
            }
        });
    },

    // Abrir modal
    openModal(title, content) {
        const overlay = document.getElementById(this.config.overlayId);
        const modalTitle = document.getElementById('permission-title');
        const modalContent = document.getElementById('permission-content');

        modalTitle.textContent = title;
        modalContent.innerHTML = content;
        overlay.classList.remove('hidden');
    },

    // Fechar modal
    closeModal() {
        const overlay = document.getElementById(this.config.overlayId);
        overlay.classList.add('hidden');
    },

    // Mostrar editor de permissões para usuário
    showUserPermissions(userId) {
        if (typeof AuthSystem === 'undefined') {
            Utils.notifications.error('Sistema de autenticação não disponível.');
            return;
        }

        const users = AuthSystem.getAllUsers();
        const user = users.find(u => u.id === userId);
        
        if (!user) {
            Utils.notifications.error('Usuário não encontrado.');
            return;
        }

        const content = this.generatePermissionEditor(user);
        this.openModal(`Permissões - ${user.name}`, content);
    },

    // Gerar editor de permissões sem os headers de usuário (para integrar em outros modais)
    generatePermissionCheckboxes(userPermissions = [], isAdmin = false) {
        const adminWarning = isAdmin ? `
            <div class="bg-purple-50 border border-purple-200 p-4 rounded-lg mb-4" id="admin-permission-warning">
                <div class="flex items-center">
                    <i class="fas fa-crown text-purple-600 mr-2"></i>
                    <span class="text-purple-800 font-medium">Este usuário é administrador e possui todas as permissões automaticamente. As seleções abaixo serão salvas, mas o administrador ignora essas restrições.</span>
                </div>
            </div>
        ` : '<div id="admin-permission-warning" class="hidden"></div>';

        return `
            ${adminWarning}
            <div class="space-y-4">
                <div class="bg-gray-50 p-4 rounded-lg mb-4">
                    <h4 class="text-sm font-semibold text-gray-800 mb-2">Aplicar Perfil Predefinido</h4>
                    <div class="flex flex-wrap gap-2">
                        ${Object.entries(this.permissionProfiles).map(([profileKey, profile]) => `
                            <button type="button" onclick="PermissionSystem.applyProfile('${profileKey}')"
                                    class="text-xs px-3 py-1.5 border border-gray-300 bg-white rounded hover:bg-gray-100 transition duration-300"
                                    title="${profile.description}">
                                ${profile.name}
                            </button>
                        `).join('')}
                    </div>
                </div>

                ${Object.entries(this.modulePermissions).map(([moduleKey, module]) => `
                    <div class="border border-gray-200 rounded-lg" data-perm-module="${moduleKey}">
                        <div class="bg-gray-50 p-3 border-b border-gray-200">
                            <div class="flex items-center justify-between">
                                <h5 class="font-medium text-sm text-gray-800">${module.name}</h5>
                                <div class="flex space-x-2">
                                    <button type="button" onclick="PermissionSystem.selectAllModule('${moduleKey}')"
                                            class="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 transition duration-300">
                                        Selecionar Todos
                                    </button>
                                    <button type="button" onclick="PermissionSystem.deselectAllModule('${moduleKey}')"
                                            class="text-xs px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 transition duration-300">
                                        Desmarcar Todos
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="p-3">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                ${Object.entries(module.permissions).map(([permKey, permName], index) => {
                                    const checkboxId = `perm-${permKey.replace(/\./g, '-')}-${index}`;
                                    return `
                                    <label for="${checkboxId}" class="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" id="${checkboxId}" name="permissions" value="${permKey}" 
                                               ${userPermissions.includes(permKey) ? 'checked' : ''}
                                               class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                                        <span class="text-xs text-gray-700">${permName}</span>
                                    </label>
                                `;}).join('')}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // Gerar editor de permissões
    generatePermissionEditor(user) {
        const userPermissions = user.permissions || [];
        const isAdmin = user.role === 'administrador';

        return `
            <form id="permission-form" data-user-id="${user.id}">
                <div class="space-y-6">
                    <!-- Informações do Usuário -->
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <div class="flex items-center space-x-4">
                            <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <i class="fas fa-user text-blue-600 text-xl"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-semibold text-gray-800">${user.name}</h3>
                                <p class="text-gray-600">${user.email}</p>
                                <p class="text-sm text-gray-500">Nível: ${AuthSystem.accessLevels[user.role]?.name || user.role}</p>
                            </div>
                        </div>
                    </div>

                    ${isAdmin ? `
                        <div class="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                            <div class="flex items-center">
                                <i class="fas fa-crown text-purple-600 mr-2"></i>
                                <span class="text-purple-800 font-medium">Este usuário é administrador e possui todas as permissões automaticamente.</span>
                            </div>
                        </div>
                    ` : `
                        <!-- Perfis Predefinidos -->
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <h4 class="text-md font-semibold text-gray-800 mb-3">Perfis Predefinidos</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                ${Object.entries(this.permissionProfiles).map(([profileKey, profile]) => `
                                    <button type="button" onclick="PermissionSystem.applyProfile('${profileKey}')"
                                            class="text-left p-3 border border-gray-200 rounded-lg hover:bg-white hover:shadow-sm transition duration-300">
                                        <div class="font-medium text-gray-800">${profile.name}</div>
                                        <div class="text-sm text-gray-600">${profile.description}</div>
                                    </button>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Permissões por Módulo -->
                        <div class="space-y-4">
                            <h4 class="text-md font-semibold text-gray-800">Permissões Detalhadas</h4>
                            ${Object.entries(this.modulePermissions).map(([moduleKey, module]) => `
                                <div class="border border-gray-200 rounded-lg">
                                    <div class="bg-gray-50 p-4 border-b border-gray-200">
                                        <div class="flex items-center justify-between">
                                            <h5 class="font-medium text-gray-800">${module.name}</h5>
                                            <div class="flex space-x-2">
                                                <button type="button" onclick="PermissionSystem.selectAllModule('${moduleKey}')"
                                                        class="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 transition duration-300">
                                                    Selecionar Todos
                                                </button>
                                                <button type="button" onclick="PermissionSystem.deselectAllModule('${moduleKey}')"
                                                        class="text-xs px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 transition duration-300">
                                                    Desmarcar Todos
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="p-4">
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            ${Object.entries(module.permissions).map(([permKey, permName], index) => {
                                                const checkboxId = `perm-${permKey.replace(/\./g, '-')}-${index}`;
                                                return `
                                                <label for="${checkboxId}" class="flex items-center space-x-2 cursor-pointer">
                                                    <input type="checkbox" id="${checkboxId}" name="permissions" value="${permKey}" 
                                                           ${userPermissions.includes(permKey) ? 'checked' : ''}
                                                           class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                                                    <span class="text-sm text-gray-700">${permName}</span>
                                                </label>
                                            `;}).join('')}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </form>
        `;
    },

    // Aplicar perfil predefinido
    applyProfile(profileKey) {
        const profile = this.permissionProfiles[profileKey];
        if (!profile) return;

        // Desmarcar todas as permissões
        document.querySelectorAll('input[name="permissions"]').forEach(checkbox => {
            checkbox.checked = false;
        });

        // Marcar permissões do perfil
        if (profile.permissions === 'all') {
            document.querySelectorAll('input[name="permissions"]').forEach(checkbox => {
                checkbox.checked = true;
            });
        } else if (Array.isArray(profile.permissions)) {
            profile.permissions.forEach(permission => {
                const checkbox = document.querySelector(`input[name="permissions"][value="${permission}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }

        Utils.notifications.success(`Perfil "${profile.name}" aplicado com sucesso!`);
    },

    // Selecionar todas as permissões de um módulo
    selectAllModule(moduleKey) {
        const module = this.modulePermissions[moduleKey];
        if (!module) return;

        Object.keys(module.permissions).forEach(permKey => {
            const checkbox = document.querySelector(`input[name="permissions"][value="${permKey}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    },

    // Desmarcar todas as permissões de um módulo
    deselectAllModule(moduleKey) {
        const module = this.modulePermissions[moduleKey];
        if (!module) return;

        Object.keys(module.permissions).forEach(permKey => {
            const checkbox = document.querySelector(`input[name="permissions"][value="${permKey}"]`);
            if (checkbox) {
                checkbox.checked = false;
            }
        });
    },

     // Salvar permissões
    async savePermissions() {
        const form = document.getElementById('permission-form');
        if (!form) return;
        const userId = form.getAttribute('data-user-id');
        const formData = new FormData(form);
        const permissions = formData.getAll('permissions');

        // Derivar lista de módulos a partir das permissões marcadas
        // Cada permissão tem o formato "modulo.acao" ou apenas "modulo"
        const modulesSet = new Set();
        permissions.forEach(p => {
            const mod = String(p).split('.')[0].toLowerCase();
            if (mod) modulesSet.add(mod);
        });
        const modules = Array.from(modulesSet);

        try {
            // Salvar no banco via API
            const resp = await fetch(`/api/crm/users/${userId}/modules`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modules, permissions })
            });
            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                Utils.notifications.error('Erro ao salvar permissões: ' + (err.error || resp.status));
                return;
            }
            Utils.notifications.success('Permissões salvas com sucesso!');
            this.closeModal();
            // Recarregar a lista de usuários se estiver no módulo de administração
            if (typeof NavigationSystem !== 'undefined' && NavigationSystem.getCurrentModule && NavigationSystem.getCurrentModule() === 'administracao') {
                NavigationSystem.loadModulePage('administracao', 'usuarios');
            }
        } catch (error) {
            Utils.notifications.error('Erro ao salvar permissões: ' + error.message);
        }
    },

    // Verificar se usuário tem permissão específica
    hasPermission(permission) {
        if (typeof AuthSystem !== 'undefined' && AuthSystem.hasSpecificPermission) {
            return AuthSystem.hasSpecificPermission(permission);
        }
        return false;
    },

    hasModuleAccess(module) {
        try {
            if (typeof AuthSystem === 'undefined' || typeof AuthSystem.getCurrentUser !== 'function') return false;
            const currentUser = AuthSystem.getCurrentUser();
            if (!currentUser) return false;
            const role = currentUser.role != null ? String(currentUser.role).toLowerCase() : '';
            if (role === 'administrador' || role === 'admin') return true;

            const modules = Array.isArray(currentUser.modules) ? currentUser.modules.map(x => String(x)) : [];
            if (modules.includes(String(module))) return true;

            const perms = Array.isArray(currentUser.permissions) ? currentUser.permissions : [];
            const prefix = String(module || '').trim().toLowerCase() + '.';
            if (!prefix || prefix === '.') return false;
            return perms.some(p => p && String(p).toLowerCase().startsWith(prefix));
        } catch {
            return false;
        }
    },

    // Obter todas as permissões disponíveis
    getAllPermissions() {
        const allPermissions = [];
        Object.values(this.modulePermissions).forEach(module => {
            allPermissions.push(...Object.keys(module.permissions));
        });
        return allPermissions;
    },

    // Obter permissões por módulo
    getModulePermissions(moduleKey) {
        return this.modulePermissions[moduleKey] || null;
    }
};

// Exportar para uso global
window.PermissionSystem = PermissionSystem;
