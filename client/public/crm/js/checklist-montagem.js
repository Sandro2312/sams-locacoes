/**
 * Sistema de Checklist de Montagem - SAMS CRM ERP
 * Versão: 1.0
 * Funcionalidades: Checklist detalhado, controle de qualidade, documentação fotográfica
 */

class ChecklistMontagem {
    constructor() {
        this.version = '1.0';
        this.debug = true;
        this.checklists = this.loadChecklists();
        this.templates = this.getChecklistTemplates();
        this.init();
    }

    init() {
        this.bindEvents();
        this.log('Sistema de Checklist de Montagem inicializado');
    }

    log(message) {
        if (this.debug) {
            console.log(`[ChecklistMontagem] ${message}`);
        }
    }

    // Templates de checklist por tipo de projeto
    getChecklistTemplates() {
        return {
            'stand_personalizado': {
                nome: 'Stand Personalizado',
                categorias: [
                    {
                        nome: 'Verificação de Materiais',
                        itens: [
                            'Conferir lista de materiais do memorial descritivo',
                            'Verificar qualidade dos materiais recebidos',
                            'Confirmar quantidades conforme especificação',
                            'Verificar integridade dos materiais (sem danos)',
                            'Conferir materiais especiais (acrílico, vidro, etc.)'
                        ]
                    },
                    {
                        nome: 'Estrutura e Montagem',
                        itens: [
                            'Verificar localização do stand conforme briefing',
                            'Conferir dimensões do espaço disponível',
                            'Montar estrutura base conforme projeto',
                            'Verificar nivelamento e estabilidade',
                            'Instalar painéis e divisórias',
                            'Verificar acabamentos e junções'
                        ]
                    },
                    {
                        nome: 'Instalações Técnicas',
                        itens: [
                            'Instalação elétrica conforme projeto',
                            'Teste de funcionamento de tomadas',
                            'Instalação de iluminação',
                            'Teste de sistema de iluminação',
                            'Instalação hidráulica (se aplicável)',
                            'Teste de sistema hidráulico'
                        ]
                    },
                    {
                        nome: 'Adicionais e Equipamentos',
                        itens: [
                            'Instalação de TVs/monitores',
                            'Configuração de sistema audiovisual',
                            'Instalação de painéis de LED',
                            'Configuração de sonorização',
                            'Instalação de mobiliário',
                            'Verificação de funcionamento de equipamentos'
                        ]
                    },
                    {
                        nome: 'Acabamentos e Detalhes',
                        itens: [
                            'Aplicação de adesivos e comunicação visual',
                            'Instalação de elementos decorativos',
                            'Limpeza geral do stand',
                            'Verificação de detalhes de acabamento',
                            'Organização do espaço interno',
                            'Teste final de todos os sistemas'
                        ]
                    },
                    {
                        nome: 'Controle de Qualidade',
                        itens: [
                            'Verificação geral de conformidade com projeto',
                            'Teste de segurança estrutural',
                            'Verificação de normas de segurança',
                            'Documentação fotográfica completa',
                            'Assinatura do cliente no documento de conformidade',
                            'Entrega das chaves e documentos'
                        ]
                    }
                ]
            },
            'stand_modular': {
                nome: 'Stand Modular',
                categorias: [
                    {
                        nome: 'Verificação de Componentes',
                        itens: [
                            'Conferir componentes modulares',
                            'Verificar conectores e encaixes',
                            'Conferir painéis e estruturas',
                            'Verificar acessórios de fixação'
                        ]
                    },
                    {
                        nome: 'Montagem Modular',
                        itens: [
                            'Montagem da estrutura base',
                            'Encaixe dos módulos conforme projeto',
                            'Verificação de estabilidade',
                            'Instalação de painéis'
                        ]
                    },
                    {
                        nome: 'Instalações e Acabamentos',
                        itens: [
                            'Instalação elétrica básica',
                            'Teste de iluminação',
                            'Aplicação de comunicação visual',
                            'Limpeza e organização'
                        ]
                    }
                ]
            }
        };
    }

    // Criar novo checklist
    createChecklist(projetoId, tipoStand, dadosAdicionais = {}) {
        const template = this.templates[tipoStand] || this.templates['stand_personalizado'];
        const checklist = {
            id: this.generateId(),
            projetoId: projetoId,
            tipo: tipoStand,
            nome: template.nome,
            status: 'Em Andamento',
            dataInicio: new Date().toISOString(),
            dataFim: null,
            responsavel: dadosAdicionais.responsavel || '',
            observacoes: dadosAdicionais.observacoes || '',
            categorias: template.categorias.map(categoria => ({
                nome: categoria.nome,
                concluida: false,
                itens: categoria.itens.map(item => ({
                    descricao: item,
                    concluido: false,
                    observacao: '',
                    foto: null,
                    dataVerificacao: null,
                    responsavel: ''
                }))
            })),
            fotos: [],
            documentoConformidade: null,
            assinaturaCliente: null
        };

        this.checklists.push(checklist);
        this.saveChecklists();
        this.log(`Checklist criado: ${checklist.id}`);
        return checklist;
    }

    // Atualizar item do checklist
    updateChecklistItem(checklistId, categoriaIndex, itemIndex, dados) {
        const checklist = this.getChecklist(checklistId);
        if (!checklist) return false;

        const item = checklist.categorias[categoriaIndex].itens[itemIndex];
        if (!item) return false;

        // Atualizar dados do item
        Object.assign(item, dados);
        
        if (dados.concluido) {
            item.dataVerificacao = new Date().toISOString();
        }

        // Verificar se categoria está completa
        const categoria = checklist.categorias[categoriaIndex];
        categoria.concluida = categoria.itens.every(item => item.concluido);

        // Verificar se checklist está completo
        const todasCategoriasConcluidas = checklist.categorias.every(cat => cat.concluida);
        if (todasCategoriasConcluidas && checklist.status !== 'Concluído') {
            checklist.status = 'Aguardando Aprovação';
        }

        this.saveChecklists();
        this.log(`Item atualizado: ${checklistId}`);
        return true;
    }

    // Adicionar foto ao checklist
    addPhoto(checklistId, categoriaIndex, itemIndex, fotoData) {
        const checklist = this.getChecklist(checklistId);
        if (!checklist) return false;

        const foto = {
            id: this.generateId(),
            url: fotoData.url,
            descricao: fotoData.descricao || '',
            timestamp: new Date().toISOString(),
            categoria: categoriaIndex,
            item: itemIndex
        };

        // Adicionar foto ao item específico
        if (categoriaIndex !== null && itemIndex !== null) {
            checklist.categorias[categoriaIndex].itens[itemIndex].foto = foto;
        }

        // Adicionar à galeria geral
        checklist.fotos.push(foto);
        this.saveChecklists();
        return foto;
    }

    // Finalizar checklist
    finalizarChecklist(checklistId, dadosFinalizacao) {
        const checklist = this.getChecklist(checklistId);
        if (!checklist) return false;

        checklist.status = 'Concluído';
        checklist.dataFim = new Date().toISOString();
        checklist.documentoConformidade = dadosFinalizacao.documentoConformidade;
        checklist.assinaturaCliente = dadosFinalizacao.assinaturaCliente;
        checklist.observacoesFinal = dadosFinalizacao.observacoesFinal || '';

        this.saveChecklists();
        this.log(`Checklist finalizado: ${checklistId}`);
        return true;
    }

    // Gerar relatório de conformidade
    gerarRelatorioConformidade(checklistId) {
        const checklist = this.getChecklist(checklistId);
        if (!checklist) return null;

        const totalItens = checklist.categorias.reduce((total, cat) => total + cat.itens.length, 0);
        const itensConcluidos = checklist.categorias.reduce((total, cat) => 
            total + cat.itens.filter(item => item.concluido).length, 0);
        
        const percentualConclusao = Math.round((itensConcluidos / totalItens) * 100);

        return {
            checklistId: checklist.id,
            projetoId: checklist.projetoId,
            tipo: checklist.tipo,
            status: checklist.status,
            dataInicio: checklist.dataInicio,
            dataFim: checklist.dataFim,
            responsavel: checklist.responsavel,
            totalItens: totalItens,
            itensConcluidos: itensConcluidos,
            percentualConclusao: percentualConclusao,
            categorias: checklist.categorias.map(cat => ({
                nome: cat.nome,
                concluida: cat.concluida,
                totalItens: cat.itens.length,
                itensConcluidos: cat.itens.filter(item => item.concluido).length
            })),
            fotos: checklist.fotos.length,
            observacoes: checklist.observacoes,
            documentoConformidade: checklist.documentoConformidade,
            assinaturaCliente: checklist.assinaturaCliente
        };
    }

    // Renderizar interface do checklist
    renderChecklistInterface(checklistId) {
        const checklist = this.getChecklist(checklistId);
        if (!checklist) return '<div class="alert alert-error">Checklist não encontrado</div>';

        return `
            <div class="checklist-container bg-white rounded-lg shadow-lg">
                <div class="checklist-header p-6 border-b border-gray-200">
                    <div class="flex justify-between items-center">
                        <div>
                            <h2 class="text-2xl font-bold text-gray-800">${checklist.nome}</h2>
                            <p class="text-gray-600">Projeto ID: ${checklist.projetoId}</p>
                        </div>
                        <div class="text-right">
                            <span class="px-3 py-1 rounded-full text-sm font-medium ${this.getStatusClass(checklist.status)}">
                                ${checklist.status}
                            </span>
                            <p class="text-sm text-gray-500 mt-1">
                                Iniciado: ${new Date(checklist.dataInicio).toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                    </div>
                </div>

                <div class="checklist-content p-6">
                    ${checklist.categorias.map((categoria, catIndex) => `
                        <div class="categoria-section mb-8">
                            <div class="categoria-header flex items-center mb-4">
                                <div class="w-8 h-8 rounded-full flex items-center justify-center mr-3 ${categoria.concluida ? 'bg-green-500' : 'bg-gray-300'}">
                                    <i class="fas ${categoria.concluida ? 'fa-check text-white' : 'fa-clock text-gray-600'}"></i>
                                </div>
                                <h3 class="text-lg font-semibold text-gray-800">${categoria.nome}</h3>
                                <span class="ml-auto text-sm text-gray-500">
                                    ${categoria.itens.filter(item => item.concluido).length}/${categoria.itens.length}
                                </span>
                            </div>

                            <div class="itens-list space-y-3">
                                ${categoria.itens.map((item, itemIndex) => `
                                    <div class="item-row flex items-start p-3 border border-gray-200 rounded-lg ${item.concluido ? 'bg-green-50' : 'bg-white'}">
                                        <div class="flex items-center mr-3">
                                            <input type="checkbox" 
                                                   ${item.concluido ? 'checked' : ''}
                                                   onchange="checklistMontagem.toggleItem('${checklistId}', ${catIndex}, ${itemIndex})"
                                                   class="w-5 h-5 text-green-600 focus:ring-green-500 border-gray-300 rounded">
                                        </div>
                                        <div class="flex-1">
                                            <p class="text-gray-800 ${item.concluido ? 'line-through' : ''}">${item.descricao}</p>
                                            ${item.observacao ? `<p class="text-sm text-gray-600 mt-1">${item.observacao}</p>` : ''}
                                            ${item.dataVerificacao ? `<p class="text-xs text-gray-500 mt-1">Verificado em: ${new Date(item.dataVerificacao).toLocaleString('pt-BR')}</p>` : ''}
                                        </div>
                                        <div class="flex items-center space-x-2">
                                            <button onclick="checklistMontagem.addObservacao('${checklistId}', ${catIndex}, ${itemIndex})"
                                                    class="text-blue-600 hover:text-blue-800" title="Adicionar observação">
                                                <i class="fas fa-comment"></i>
                                            </button>
                                            <button onclick="checklistMontagem.addFoto('${checklistId}', ${catIndex}, ${itemIndex})"
                                                    class="text-green-600 hover:text-green-800" title="Adicionar foto">
                                                <i class="fas fa-camera"></i>
                                            </button>
                                            ${item.foto ? `<i class="fas fa-image text-green-500" title="Foto anexada"></i>` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="checklist-footer p-6 border-t border-gray-200 bg-gray-50">
                    <div class="flex justify-between items-center">
                        <div class="text-sm text-gray-600">
                            Progresso: ${this.calcularProgresso(checklist)}%
                        </div>
                        <div class="space-x-3">
                            <button onclick="checklistMontagem.salvarChecklist('${checklistId}')"
                                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                Salvar Progresso
                            </button>
                            ${this.calcularProgresso(checklist) === 100 ? `
                                <button onclick="checklistMontagem.finalizarChecklistInterface('${checklistId}')"
                                        class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                                    Finalizar Checklist
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Métodos auxiliares
    getChecklist(id) {
        return this.checklists.find(checklist => checklist.id === id);
    }

    calcularProgresso(checklist) {
        const totalItens = checklist.categorias.reduce((total, cat) => total + cat.itens.length, 0);
        const itensConcluidos = checklist.categorias.reduce((total, cat) => 
            total + cat.itens.filter(item => item.concluido).length, 0);
        return Math.round((itensConcluidos / totalItens) * 100);
    }

    getStatusClass(status) {
        const classes = {
            'Em Andamento': 'bg-yellow-100 text-yellow-800',
            'Aguardando Aprovação': 'bg-blue-100 text-blue-800',
            'Concluído': 'bg-green-100 text-green-800',
            'Cancelado': 'bg-red-100 text-red-800'
        };
        return classes[status] || 'bg-gray-100 text-gray-800';
    }

    toggleItem(checklistId, categoriaIndex, itemIndex) {
        const checklist = this.getChecklist(checklistId);
        if (!checklist) return;

        const item = checklist.categorias[categoriaIndex].itens[itemIndex];
        item.concluido = !item.concluido;
        
        this.updateChecklistItem(checklistId, categoriaIndex, itemIndex, {
            concluido: item.concluido
        });
    }

    // Métodos de persistência
    loadChecklists() {
        try {
            const data = localStorage.getItem('sams_checklists_montagem');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            this.log('Erro ao carregar checklists: ' + error.message);
            return [];
        }
    }

    saveChecklists() {
        try {
            localStorage.setItem('sams_checklists_montagem', JSON.stringify(this.checklists));
        } catch (error) {
            this.log('Erro ao salvar checklists: ' + error.message);
        }
    }

    generateId() {
        return 'checklist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    bindEvents() {
        // Eventos serão vinculados quando necessário
    }
}

// Inicializar sistema
const checklistMontagem = new ChecklistMontagem();
window.checklistMontagem = checklistMontagem;