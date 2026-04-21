/**
 * Sistema de Controle de Qualidade - SAMS CRM ERP
 * Versão: 1.0
 * Funcionalidades: Controle de qualidade, conformidade, auditoria e relatórios
 */

class QualityControl {
    constructor() {
        this.version = '1.0';
        this.debug = true;
        this.inspections = this.loadInspections();
        this.qualityStandards = this.getQualityStandards();
        this.nonConformities = this.loadNonConformities();
        this.init();
    }

    init() {
        this.bindEvents();
        this.log('Sistema de Controle de Qualidade inicializado');
    }

    log(message) {
        if (this.debug) {
            console.log(`[QualityControl] ${message}`);
        }
    }

    // Padrões de qualidade por categoria
    getQualityStandards() {
        return {
            estrutural: {
                nome: 'Qualidade Estrutural',
                criterios: [
                    {
                        item: 'Estabilidade da estrutura',
                        tolerancia: 'Máximo 2mm de desvio',
                        metodo: 'Medição com nível e régua',
                        criticidade: 'Alta'
                    },
                    {
                        item: 'Acabamento das junções',
                        tolerancia: 'Sem frestas visíveis',
                        metodo: 'Inspeção visual',
                        criticidade: 'Média'
                    },
                    {
                        item: 'Fixação dos painéis',
                        tolerancia: 'Resistência mínima 50kg',
                        metodo: 'Teste de tração',
                        criticidade: 'Alta'
                    }
                ]
            },
            eletrica: {
                nome: 'Qualidade Elétrica',
                criterios: [
                    {
                        item: 'Tensão nas tomadas',
                        tolerancia: '220V ±5%',
                        metodo: 'Multímetro',
                        criticidade: 'Alta'
                    },
                    {
                        item: 'Funcionamento da iluminação',
                        tolerancia: '100% das lâmpadas funcionando',
                        metodo: 'Teste visual',
                        criticidade: 'Média'
                    },
                    {
                        item: 'Isolamento dos cabos',
                        tolerancia: 'Resistência >1MΩ',
                        metodo: 'Megôhmetro',
                        criticidade: 'Alta'
                    }
                ]
            },
            visual: {
                nome: 'Qualidade Visual',
                criterios: [
                    {
                        item: 'Alinhamento da comunicação visual',
                        tolerancia: 'Máximo 1mm de desvio',
                        metodo: 'Régua e esquadro',
                        criticidade: 'Média'
                    },
                    {
                        item: 'Qualidade de impressão',
                        tolerancia: 'Sem manchas ou borrões',
                        metodo: 'Inspeção visual',
                        criticidade: 'Média'
                    },
                    {
                        item: 'Limpeza geral',
                        tolerancia: 'Ausência de sujeira visível',
                        metodo: 'Inspeção visual',
                        criticidade: 'Baixa'
                    }
                ]
            },
            funcional: {
                nome: 'Qualidade Funcional',
                criterios: [
                    {
                        item: 'Funcionamento de equipamentos',
                        tolerancia: '100% operacional',
                        metodo: 'Teste funcional',
                        criticidade: 'Alta'
                    },
                    {
                        item: 'Acessibilidade',
                        tolerancia: 'Conforme NBR 9050',
                        metodo: 'Medição e verificação',
                        criticidade: 'Alta'
                    },
                    {
                        item: 'Segurança',
                        tolerancia: 'Conforme NR-18',
                        metodo: 'Checklist de segurança',
                        criticidade: 'Alta'
                    }
                ]
            }
        };
    }

    // Criar nova inspeção de qualidade
    createInspection(checklistId, projetoId, dadosInspecao) {
        const inspection = {
            id: this.generateId(),
            checklistId: checklistId,
            projetoId: projetoId,
            tipo: dadosInspecao.tipo || 'completa',
            status: 'Em Andamento',
            dataInicio: new Date().toISOString(),
            dataFim: null,
            inspetor: dadosInspecao.inspetor || '',
            categorias: {},
            pontuacaoGeral: 0,
            aprovado: null,
            observacoes: dadosInspecao.observacoes || '',
            fotos: [],
            naoConformidades: []
        };

        // Inicializar categorias baseadas nos padrões
        Object.keys(this.qualityStandards).forEach(categoria => {
            inspection.categorias[categoria] = {
                nome: this.qualityStandards[categoria].nome,
                status: 'Pendente',
                pontuacao: 0,
                criterios: this.qualityStandards[categoria].criterios.map(criterio => ({
                    ...criterio,
                    aprovado: null,
                    observacao: '',
                    evidencia: null,
                    dataVerificacao: null
                }))
            };
        });

        this.inspections.push(inspection);
        this.saveInspections();
        this.log(`Inspeção criada: ${inspection.id}`);
        return inspection;
    }

    // Avaliar critério de qualidade
    evaluateCriteria(inspectionId, categoria, criterioIndex, avaliacao) {
        const inspection = this.getInspection(inspectionId);
        if (!inspection) return false;

        const criterio = inspection.categorias[categoria].criterios[criterioIndex];
        if (!criterio) return false;

        // Atualizar critério
        criterio.aprovado = avaliacao.aprovado;
        criterio.observacao = avaliacao.observacao || '';
        criterio.evidencia = avaliacao.evidencia || null;
        criterio.dataVerificacao = new Date().toISOString();

        // Se não aprovado, criar não conformidade
        if (!avaliacao.aprovado) {
            this.createNonConformity(inspectionId, categoria, criterioIndex, avaliacao);
        }

        // Recalcular pontuação da categoria
        this.calculateCategoryScore(inspection, categoria);
        
        // Recalcular pontuação geral
        this.calculateOverallScore(inspection);

        this.saveInspections();
        this.log(`Critério avaliado: ${inspectionId} - ${categoria}`);
        return true;
    }

    // Criar não conformidade
    createNonConformity(inspectionId, categoria, criterioIndex, dados) {
        const nonConformity = {
            id: this.generateId(),
            inspectionId: inspectionId,
            categoria: categoria,
            criterioIndex: criterioIndex,
            descricao: dados.observacao || 'Não conformidade identificada',
            criticidade: dados.criticidade || 'Média',
            status: 'Aberta',
            dataIdentificacao: new Date().toISOString(),
            responsavel: dados.responsavel || '',
            prazoCorrecao: dados.prazoCorrecao || null,
            acaoCorretiva: '',
            dataCorrecao: null,
            evidenciaCorrecao: null,
            verificadoPor: ''
        };

        this.nonConformities.push(nonConformity);
        
        // Adicionar à inspeção
        const inspection = this.getInspection(inspectionId);
        if (inspection) {
            inspection.naoConformidades.push(nonConformity.id);
        }

        this.saveNonConformities();
        this.saveInspections();
        return nonConformity;
    }

    // Corrigir não conformidade
    correctNonConformity(nonConformityId, dadosCorrecao) {
        const nonConformity = this.getNonConformity(nonConformityId);
        if (!nonConformity) return false;

        nonConformity.acaoCorretiva = dadosCorrecao.acaoCorretiva;
        nonConformity.dataCorrecao = new Date().toISOString();
        nonConformity.evidenciaCorrecao = dadosCorrecao.evidenciaCorrecao || null;
        nonConformity.verificadoPor = dadosCorrecao.verificadoPor || '';
        nonConformity.status = 'Corrigida';

        this.saveNonConformities();
        this.log(`Não conformidade corrigida: ${nonConformityId}`);
        return true;
    }

    // Calcular pontuação da categoria
    calculateCategoryScore(inspection, categoria) {
        const cat = inspection.categorias[categoria];
        const criterios = cat.criterios;
        const totalCriterios = criterios.length;
        const criteriosAprovados = criterios.filter(c => c.aprovado === true).length;
        
        cat.pontuacao = Math.round((criteriosAprovados / totalCriterios) * 100);
        
        // Definir status da categoria
        if (cat.pontuacao >= 90) {
            cat.status = 'Excelente';
        } else if (cat.pontuacao >= 80) {
            cat.status = 'Bom';
        } else if (cat.pontuacao >= 70) {
            cat.status = 'Aceitável';
        } else {
            cat.status = 'Inadequado';
        }
    }

    // Calcular pontuação geral
    calculateOverallScore(inspection) {
        const categorias = Object.values(inspection.categorias);
        const totalPontuacao = categorias.reduce((sum, cat) => sum + cat.pontuacao, 0);
        inspection.pontuacaoGeral = Math.round(totalPontuacao / categorias.length);
        
        // Determinar aprovação geral
        inspection.aprovado = inspection.pontuacaoGeral >= 80 && inspection.naoConformidades.length === 0;
    }

    // Finalizar inspeção
    finalizeInspection(inspectionId, dadosFinalizacao) {
        const inspection = this.getInspection(inspectionId);
        if (!inspection) return false;

        inspection.status = 'Concluída';
        inspection.dataFim = new Date().toISOString();
        inspection.observacoes = dadosFinalizacao.observacoes || inspection.observacoes;
        
        // Recalcular pontuação final
        this.calculateOverallScore(inspection);

        this.saveInspections();
        this.log(`Inspeção finalizada: ${inspectionId}`);
        return true;
    }

    // Gerar relatório de qualidade
    generateQualityReport(inspectionId) {
        const inspection = this.getInspection(inspectionId);
        if (!inspection) return null;

        const naoConformidades = this.nonConformities.filter(nc => 
            inspection.naoConformidades.includes(nc.id)
        );

        return {
            inspecao: {
                id: inspection.id,
                projetoId: inspection.projetoId,
                checklistId: inspection.checklistId,
                status: inspection.status,
                dataInicio: inspection.dataInicio,
                dataFim: inspection.dataFim,
                inspetor: inspection.inspetor,
                pontuacaoGeral: inspection.pontuacaoGeral,
                aprovado: inspection.aprovado
            },
            categorias: Object.entries(inspection.categorias).map(([key, cat]) => ({
                categoria: key,
                nome: cat.nome,
                status: cat.status,
                pontuacao: cat.pontuacao,
                criteriosTotal: cat.criterios.length,
                criteriosAprovados: cat.criterios.filter(c => c.aprovado === true).length,
                criteriosReprovados: cat.criterios.filter(c => c.aprovado === false).length
            })),
            naoConformidades: {
                total: naoConformidades.length,
                abertas: naoConformidades.filter(nc => nc.status === 'Aberta').length,
                corrigidas: naoConformidades.filter(nc => nc.status === 'Corrigida').length,
                criticas: naoConformidades.filter(nc => nc.criticidade === 'Alta').length,
                detalhes: naoConformidades
            },
            recomendacoes: this.generateRecommendations(inspection)
        };
    }

    // Gerar recomendações
    generateRecommendations(inspection) {
        const recommendations = [];
        
        Object.entries(inspection.categorias).forEach(([key, cat]) => {
            if (cat.pontuacao < 80) {
                recommendations.push({
                    categoria: cat.nome,
                    prioridade: cat.pontuacao < 60 ? 'Alta' : 'Média',
                    recomendacao: `Melhorar processos de ${cat.nome.toLowerCase()} - pontuação atual: ${cat.pontuacao}%`
                });
            }
        });

        if (inspection.naoConformidades.length > 0) {
            recommendations.push({
                categoria: 'Não Conformidades',
                prioridade: 'Alta',
                recomendacao: `Corrigir ${inspection.naoConformidades.length} não conformidade(s) identificada(s)`
            });
        }

        return recommendations;
    }

    // Renderizar interface de inspeção
    renderInspectionInterface(inspectionId) {
        const inspection = this.getInspection(inspectionId);
        if (!inspection) return '<div class="alert alert-error">Inspeção não encontrada</div>';

        return `
            <div class="inspection-container bg-white rounded-lg shadow-lg">
                <div class="inspection-header p-6 border-b border-gray-200">
                    <div class="flex justify-between items-center">
                        <div>
                            <h2 class="text-2xl font-bold text-gray-800">Inspeção de Qualidade</h2>
                            <p class="text-gray-600">Projeto ID: ${inspection.projetoId}</p>
                        </div>
                        <div class="text-right">
                            <div class="text-3xl font-bold ${this.getScoreColor(inspection.pontuacaoGeral)}">
                                ${inspection.pontuacaoGeral}%
                            </div>
                            <p class="text-sm text-gray-500">Pontuação Geral</p>
                        </div>
                    </div>
                </div>

                <div class="inspection-content p-6">
                    ${Object.entries(inspection.categorias).map(([key, categoria]) => `
                        <div class="categoria-section mb-8">
                            <div class="categoria-header flex items-center justify-between mb-4">
                                <h3 class="text-lg font-semibold text-gray-800">${categoria.nome}</h3>
                                <div class="flex items-center space-x-3">
                                    <span class="px-3 py-1 rounded-full text-sm font-medium ${this.getStatusClass(categoria.status)}">
                                        ${categoria.status}
                                    </span>
                                    <span class="text-lg font-bold ${this.getScoreColor(categoria.pontuacao)}">
                                        ${categoria.pontuacao}%
                                    </span>
                                </div>
                            </div>

                            <div class="criterios-list space-y-3">
                                ${categoria.criterios.map((criterio, index) => `
                                    <div class="criterio-row p-4 border border-gray-200 rounded-lg ${this.getCriterioClass(criterio.aprovado)}">
                                        <div class="flex items-start justify-between">
                                            <div class="flex-1">
                                                <h4 class="font-medium text-gray-800">${criterio.item}</h4>
                                                <p class="text-sm text-gray-600">Tolerância: ${criterio.tolerancia}</p>
                                                <p class="text-sm text-gray-600">Método: ${criterio.metodo}</p>
                                                ${criterio.observacao ? `<p class="text-sm text-blue-600 mt-2">${criterio.observacao}</p>` : ''}
                                            </div>
                                            <div class="flex items-center space-x-2">
                                                <span class="px-2 py-1 rounded text-xs font-medium ${this.getCriticalityClass(criterio.criticidade)}">
                                                    ${criterio.criticidade}
                                                </span>
                                                <div class="flex space-x-1">
                                                    <button onclick="qualityControl.evaluateCriteriaInterface('${inspectionId}', '${key}', ${index}, true)"
                                                            class="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 ${criterio.aprovado === true ? 'ring-2 ring-green-300' : ''}">
                                                        ✓
                                                    </button>
                                                    <button onclick="qualityControl.evaluateCriteriaInterface('${inspectionId}', '${key}', ${index}, false)"
                                                            class="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 ${criterio.aprovado === false ? 'ring-2 ring-red-300' : ''}">
                                                        ✗
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="inspection-footer p-6 border-t border-gray-200 bg-gray-50">
                    <div class="flex justify-between items-center">
                        <div class="text-sm text-gray-600">
                            Não Conformidades: ${inspection.naoConformidades.length}
                        </div>
                        <div class="space-x-3">
                            <button onclick="qualityControl.saveInspection('${inspectionId}')"
                                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                Salvar Inspeção
                            </button>
                            <button onclick="qualityControl.finalizeInspectionInterface('${inspectionId}')"
                                    class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                                Finalizar Inspeção
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Métodos auxiliares
    getInspection(id) {
        return this.inspections.find(inspection => inspection.id === id);
    }

    getNonConformity(id) {
        return this.nonConformities.find(nc => nc.id === id);
    }

    getScoreColor(score) {
        if (score >= 90) return 'text-green-600';
        if (score >= 80) return 'text-blue-600';
        if (score >= 70) return 'text-yellow-600';
        return 'text-red-600';
    }

    getStatusClass(status) {
        const classes = {
            'Excelente': 'bg-green-100 text-green-800',
            'Bom': 'bg-blue-100 text-blue-800',
            'Aceitável': 'bg-yellow-100 text-yellow-800',
            'Inadequado': 'bg-red-100 text-red-800',
            'Pendente': 'bg-gray-100 text-gray-800'
        };
        return classes[status] || 'bg-gray-100 text-gray-800';
    }

    getCriterioClass(aprovado) {
        if (aprovado === true) return 'bg-green-50 border-green-200';
        if (aprovado === false) return 'bg-red-50 border-red-200';
        return 'bg-white';
    }

    getCriticalityClass(criticidade) {
        const classes = {
            'Alta': 'bg-red-100 text-red-800',
            'Média': 'bg-yellow-100 text-yellow-800',
            'Baixa': 'bg-green-100 text-green-800'
        };
        return classes[criticidade] || 'bg-gray-100 text-gray-800';
    }

    // Métodos de persistência
    loadInspections() {
        try {
            const data = localStorage.getItem('sams_quality_inspections');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            this.log('Erro ao carregar inspeções: ' + error.message);
            return [];
        }
    }

    saveInspections() {
        try {
            localStorage.setItem('sams_quality_inspections', JSON.stringify(this.inspections));
        } catch (error) {
            this.log('Erro ao salvar inspeções: ' + error.message);
        }
    }

    loadNonConformities() {
        try {
            const data = localStorage.getItem('sams_non_conformities');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            this.log('Erro ao carregar não conformidades: ' + error.message);
            return [];
        }
    }

    saveNonConformities() {
        try {
            localStorage.setItem('sams_non_conformities', JSON.stringify(this.nonConformities));
        } catch (error) {
            this.log('Erro ao salvar não conformidades: ' + error.message);
        }
    }

    generateId() {
        return 'qc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    bindEvents() {
        // Eventos serão vinculados quando necessário
    }
}

// Inicializar sistema
const qualityControl = new QualityControl();
window.qualityControl = qualityControl;