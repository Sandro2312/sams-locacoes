/**
 * Formulários Específicos do Módulo de Marketing - SAMS CRM/ERP
 * Implementa formulários intuitivos e responsivos para gestão de campanhas e contatos
 */

class MarketingForms {
    constructor() {
        this.initializeEventListeners();
    }

    // Formulário de Campanha de Marketing
    getCampaignForm(id = null) {
        const campaign = id ? (ModuleSystem.data.campanhas?.find(c => String(c.id) === String(id)) || {}) : {};
        const formId = `campaign_form_${id || 'new'}`;
        
        return `
            <form id="crud-form" data-action="${id ? 'update' : 'create'}" data-module="campanhas" data-id="${id || ''}" autocomplete="on">
                <!-- Informações Básicas da Campanha -->
                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6 border border-blue-200">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-megaphone mr-3 text-blue-600"></i>Informações da Campanha
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="md:col-span-2">
                            <label for="${formId}_nome" class="block text-sm font-medium text-gray-700 mb-2">
                                Nome da Campanha *
                                <span class="text-xs text-gray-500">(Título identificador)</span>
                            </label>
                            <input type="text" id="${formId}_nome" name="nome" value="${campaign.nome || ''}" required 
                                   placeholder="Ex: Campanha Black Friday 2024"
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg">
                        </div>
                        <div>
                            <label for="${formId}_tipo" class="block text-sm font-medium text-gray-700 mb-2">
                                Tipo de Campanha *
                            </label>
                            <select id="${formId}_tipo" name="tipo" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">Selecione o tipo</option>
                                <option value="Email Marketing" ${campaign.tipo === 'Email Marketing' ? 'selected' : ''}>📧 Email Marketing</option>
                                <option value="Redes Sociais" ${campaign.tipo === 'Redes Sociais' ? 'selected' : ''}>📱 Redes Sociais</option>
                                <option value="Google Ads" ${campaign.tipo === 'Google Ads' ? 'selected' : ''}>🔍 Google Ads</option>
                                <option value="Facebook Ads" ${campaign.tipo === 'Facebook Ads' ? 'selected' : ''}>📘 Facebook Ads</option>
                                <option value="LinkedIn Ads" ${campaign.tipo === 'LinkedIn Ads' ? 'selected' : ''}>💼 LinkedIn Ads</option>
                                <option value="WhatsApp Business" ${campaign.tipo === 'WhatsApp Business' ? 'selected' : ''}>💬 WhatsApp Business</option>
                                <option value="Evento/Feira" ${campaign.tipo === 'Evento/Feira' ? 'selected' : ''}>🎪 Evento/Feira</option>
                                <option value="Telemarketing" ${campaign.tipo === 'Telemarketing' ? 'selected' : ''}>📞 Telemarketing</option>
                                <option value="Mala Direta" ${campaign.tipo === 'Mala Direta' ? 'selected' : ''}>📮 Mala Direta</option>
                                <option value="Integrada" ${campaign.tipo === 'Integrada' ? 'selected' : ''}>🔄 Campanha Integrada</option>
                            </select>
                        </div>
                        <div>
                            <label for="${formId}_status" class="block text-sm font-medium text-gray-700 mb-2">
                                Status da Campanha
                            </label>
                            <select id="${formId}_status" name="status" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="Planejamento" ${campaign.status === 'Planejamento' ? 'selected' : ''}>📋 Planejamento</option>
                                <option value="Aprovação" ${campaign.status === 'Aprovação' ? 'selected' : ''}>⏳ Aguardando Aprovação</option>
                                <option value="Ativa" ${campaign.status === 'Ativa' ? 'selected' : ''}>🚀 Ativa</option>
                                <option value="Pausada" ${campaign.status === 'Pausada' ? 'selected' : ''}>⏸️ Pausada</option>
                                <option value="Finalizada" ${campaign.status === 'Finalizada' ? 'selected' : ''}>✅ Finalizada</option>
                                <option value="Cancelada" ${campaign.status === 'Cancelada' ? 'selected' : ''}>❌ Cancelada</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Período e Orçamento -->
                <div class="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg mb-6 border border-green-200">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-calendar-alt mr-3 text-green-600"></i>Período e Orçamento
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label for="${formId}_data_inicio" class="block text-sm font-medium text-gray-700 mb-2">
                                Data de Início *
                            </label>
                            <input id="${formId}_data_inicio" type="date" name="data_inicio" value="${campaign.data_inicio || ''}" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                        </div>
                        <div>
                            <label for="${formId}_data_fim" class="block text-sm font-medium text-gray-700 mb-2">
                                Data de Término *
                            </label>
                            <input id="${formId}_data_fim" type="date" name="data_fim" value="${campaign.data_fim || ''}" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                        </div>
                        <div>
                            <label for="${formId}_orcamento" class="block text-sm font-medium text-gray-700 mb-2">
                                Orçamento Total (R$)
                            </label>
                            <input id="${formId}_orcamento" type="number" name="orcamento" value="${campaign.orcamento || ''}" 
                                   placeholder="0,00" step="0.01" min="0"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                        </div>
                        <div>
                            <label for="${formId}_investimento_realizado" class="block text-sm font-medium text-gray-700 mb-2">
                                Investimento Realizado (R$)
                            </label>
                            <input id="${formId}_investimento_realizado" type="number" name="investimento_realizado" value="${campaign.investimento_realizado || ''}" 
                                   placeholder="0,00" step="0.01" min="0"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                        </div>
                    </div>
                </div>

                <!-- Objetivos e Métricas -->
                <div class="bg-gradient-to-r from-purple-50 to-violet-50 p-6 rounded-lg mb-6 border border-purple-200">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-target mr-3 text-purple-600"></i>Objetivos e Métricas
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label for="${formId}_objetivo" class="block text-sm font-medium text-gray-700 mb-2">
                                Objetivo Principal *
                            </label>
                            <select id="${formId}_objetivo" name="objetivo" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                                <option value="">Selecione o objetivo</option>
                                <option value="Geração de Leads" ${campaign.objetivo === 'Geração de Leads' ? 'selected' : ''}>🎯 Geração de Leads</option>
                                <option value="Conversão de Vendas" ${campaign.objetivo === 'Conversão de Vendas' ? 'selected' : ''}>💰 Conversão de Vendas</option>
                                <option value="Brand Awareness" ${campaign.objetivo === 'Brand Awareness' ? 'selected' : ''}>🌟 Reconhecimento da Marca</option>
                                <option value="Engajamento" ${campaign.objetivo === 'Engajamento' ? 'selected' : ''}>👥 Engajamento</option>
                                <option value="Retenção de Clientes" ${campaign.objetivo === 'Retenção de Clientes' ? 'selected' : ''}>🔄 Retenção de Clientes</option>
                                <option value="Lançamento de Produto" ${campaign.objetivo === 'Lançamento de Produto' ? 'selected' : ''}>🚀 Lançamento de Produto</option>
                            </select>
                        </div>
                        <div>
                            <label for="${formId}_publico_alvo" class="block text-sm font-medium text-gray-700 mb-2">
                                Público-Alvo
                            </label>
                            <select id="${formId}_publico_alvo" name="publico_alvo" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                                <option value="">Selecione o público</option>
                                <option value="Leads Frios" ${campaign.publico_alvo === 'Leads Frios' ? 'selected' : ''}>❄️ Leads Frios</option>
                                <option value="Leads Mornos" ${campaign.publico_alvo === 'Leads Mornos' ? 'selected' : ''}>🌡️ Leads Mornos</option>
                                <option value="Leads Quentes" ${campaign.publico_alvo === 'Leads Quentes' ? 'selected' : ''}>🔥 Leads Quentes</option>
                                <option value="Clientes Ativos" ${campaign.publico_alvo === 'Clientes Ativos' ? 'selected' : ''}>✅ Clientes Ativos</option>
                                <option value="Clientes Inativos" ${campaign.publico_alvo === 'Clientes Inativos' ? 'selected' : ''}>😴 Clientes Inativos</option>
                                <option value="Prospects" ${campaign.publico_alvo === 'Prospects' ? 'selected' : ''}>🎯 Prospects</option>
                                <option value="Geral" ${campaign.publico_alvo === 'Geral' ? 'selected' : ''}>🌐 Público Geral</option>
                            </select>
                        </div>
                        <div>
                            <label for="${formId}_meta_leads" class="block text-sm font-medium text-gray-700 mb-2">
                                Meta de Leads
                            </label>
                            <input id="${formId}_meta_leads" type="number" name="meta_leads" value="${campaign.meta_leads || ''}" 
                                   placeholder="Ex: 100" min="0"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                        </div>
                        <div>
                            <label for="${formId}_meta_conversoes" class="block text-sm font-medium text-gray-700 mb-2">
                                Meta de Conversões
                            </label>
                            <input id="${formId}_meta_conversoes" type="number" name="meta_conversoes" value="${campaign.meta_conversoes || ''}" 
                                   placeholder="Ex: 10" min="0"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                        </div>
                    </div>
                </div>

                <!-- Canais e Estratégias -->
                <div class="bg-gradient-to-r from-teal-50 to-cyan-50 p-6 rounded-lg mb-6 border border-teal-200">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-broadcast-tower mr-3 text-teal-600"></i>Canais e Estratégias
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Canais Utilizados
                                <span class="text-xs text-gray-500">(Múltipla seleção)</span>
                            </label>
                            <div class="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
                                <label class="flex items-center space-x-2">
                                    <input type="checkbox" name="canais" value="Email" ${campaign.canais?.includes('Email') ? 'checked' : ''} class="rounded">
                                    <span class="text-sm">📧 Email</span>
                                </label>
                                <label class="flex items-center space-x-2">
                                    <input type="checkbox" name="canais" value="WhatsApp" ${campaign.canais?.includes('WhatsApp') ? 'checked' : ''} class="rounded">
                                    <span class="text-sm">💬 WhatsApp</span>
                                </label>
                                <label class="flex items-center space-x-2">
                                    <input type="checkbox" name="canais" value="Facebook" ${campaign.canais?.includes('Facebook') ? 'checked' : ''} class="rounded">
                                    <span class="text-sm">📘 Facebook</span>
                                </label>
                                <label class="flex items-center space-x-2">
                                    <input type="checkbox" name="canais" value="Instagram" ${campaign.canais?.includes('Instagram') ? 'checked' : ''} class="rounded">
                                    <span class="text-sm">📸 Instagram</span>
                                </label>
                                <label class="flex items-center space-x-2">
                                    <input type="checkbox" name="canais" value="LinkedIn" ${campaign.canais?.includes('LinkedIn') ? 'checked' : ''} class="rounded">
                                    <span class="text-sm">💼 LinkedIn</span>
                                </label>
                                <label class="flex items-center space-x-2">
                                    <input type="checkbox" name="canais" value="Google Ads" ${campaign.canais?.includes('Google Ads') ? 'checked' : ''} class="rounded">
                                    <span class="text-sm">🔍 Google Ads</span>
                                </label>
                                <label class="flex items-center space-x-2">
                                    <input type="checkbox" name="canais" value="Telefone" ${campaign.canais?.includes('Telefone') ? 'checked' : ''} class="rounded">
                                    <span class="text-sm">📞 Telefone</span>
                                </label>
                                <label class="flex items-center space-x-2">
                                    <input type="checkbox" name="canais" value="Eventos" ${campaign.canais?.includes('Eventos') ? 'checked' : ''} class="rounded">
                                    <span class="text-sm">🎪 Eventos</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label for="${formId}_segmentacao" class="block text-sm font-medium text-gray-700 mb-2">
                                Segmentação
                            </label>
                            <select id="${formId}_segmentacao" name="segmentacao" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 mb-3">
                                <option value="">Selecione a segmentação</option>
                                <option value="Geográfica" ${campaign.segmentacao === 'Geográfica' ? 'selected' : ''}>🌍 Geográfica</option>
                                <option value="Demográfica" ${campaign.segmentacao === 'Demográfica' ? 'selected' : ''}>👥 Demográfica</option>
                                <option value="Comportamental" ${campaign.segmentacao === 'Comportamental' ? 'selected' : ''}>🎯 Comportamental</option>
                                <option value="Psicográfica" ${campaign.segmentacao === 'Psicográfica' ? 'selected' : ''}>🧠 Psicográfica</option>
                                <option value="Por Interesse" ${campaign.segmentacao === 'Por Interesse' ? 'selected' : ''}>❤️ Por Interesse</option>
                                <option value="Por Histórico" ${campaign.segmentacao === 'Por Histórico' ? 'selected' : ''}>📊 Por Histórico</option>
                            </select>
                            
                            <label for="${formId}_prioridade" class="block text-sm font-medium text-gray-700 mb-2">
                                Prioridade da Campanha
                            </label>
                            <select id="${formId}_prioridade" name="prioridade" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
                                <option value="Baixa" ${campaign.prioridade === 'Baixa' ? 'selected' : ''}>🟢 Baixa</option>
                                <option value="Média" ${campaign.prioridade === 'Média' ? 'selected' : ''}>🟡 Média</option>
                                <option value="Alta" ${campaign.prioridade === 'Alta' ? 'selected' : ''}>🟠 Alta</option>
                                <option value="Crítica" ${campaign.prioridade === 'Crítica' ? 'selected' : ''}>🔴 Crítica</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Descrição e Observações -->
                <div class="bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-lg border border-orange-200">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-edit mr-3 text-orange-600"></i>Descrição e Observações
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label for="${formId}_descricao" class="block text-sm font-medium text-gray-700 mb-2">
                                Descrição da Campanha *
                            </label>
                            <textarea id="${formId}_descricao" name="descricao" rows="5" required
                                      placeholder="Descreva os detalhes da campanha, estratégias, canais utilizados, mensagens principais..."
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500">${campaign.descricao || ''}</textarea>
                        </div>
                        <div>
                            <label for="${formId}_observacoes" class="block text-sm font-medium text-gray-700 mb-2">
                                Observações Internas
                            </label>
                            <textarea id="${formId}_observacoes" name="observacoes" rows="3"
                                      placeholder="Anotações internas, lições aprendidas, ajustes necessários..."
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 mb-3">${campaign.observacoes || ''}</textarea>
                            
                            <label for="${formId}_responsavel" class="block text-sm font-medium text-gray-700 mb-2">
                                Responsável pela Campanha
                            </label>
                            <input id="${formId}_responsavel" type="text" name="responsavel" value="${campaign.responsavel || ''}"
                                   placeholder="Nome do responsável"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
                        </div>
                    </div>
                </div>
            </form>

            <script>
                // Máscara para campos de telefone
                document.querySelectorAll('[data-mask="phone"]').forEach(input => {
                    input.addEventListener('input', function(e) {
                        let value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 11) {
                            value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
                            if (value.length < 14) {
                                value = value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
                            }
                        }
                        e.target.value = value;
                    });
                });
                
                // Validação de datas
                const dataInicio = document.querySelector('input[name="data_inicio"]');
                const dataFim = document.querySelector('input[name="data_fim"]');
                
                if (dataInicio && dataFim) {
                    dataInicio.addEventListener('change', function() {
                        dataFim.min = this.value;
                    });
                    
                    dataFim.addEventListener('change', function() {
                        if (this.value < dataInicio.value) {
                            alert('A data de término não pode ser anterior à data de início.');
                            this.value = '';
                        }
                    });
                }
            </script>
        `;
    }

    // Formulário de Lead para Marketing
    getLeadForm(id = null) {
        const lead = id ? (ModuleSystem.data.leads?.find(l => String(l.id) === String(id)) || {}) : {};
        const formId = `lead_form_${id || 'new'}`;
        const statusKeyRaw = lead && lead.status != null ? String(lead.status).trim().toLowerCase() : '';
        const statusKey = (() => {
            const map = {
                novo: 'novo',
                contatado: 'contato',
                contato: 'contato',
                qualificado: 'qualificado',
                'proposta enviada': 'proposta_enviada',
                proposta_enviada: 'proposta_enviada',
                'em negociação': 'negociacao',
                negociação: 'negociacao',
                negociacao: 'negociacao',
                convertido: 'convertido',
                perdido: 'perdido',
                inativo: 'inativo'
            };
            return map[statusKeyRaw] || statusKeyRaw;
        })();
        const origemKeyRaw = lead && lead.origem != null ? String(lead.origem).trim().toLowerCase() : '';
        const origemKey = (() => {
            const map = {
                'site institucional': 'site_institucional',
                site: 'site_organico',
                site_organico: 'site_organico',
                'redes sociais': 'instagram',
                instagram: 'instagram',
                'google ads': 'google_ads',
                google_ads: 'google_ads',
                'facebook ads': 'facebook_ads',
                facebook_ads: 'facebook_ads',
                'linkedin ads': 'linkedin_ads',
                linkedin_ads: 'linkedin_ads',
                'whatsapp business': 'whatsapp_business',
                whatsapp_business: 'whatsapp_business',
                'email marketing': 'email_marketing',
                email_marketing: 'email_marketing',
                'evento/feira': 'evento_feira',
                evento_feira: 'evento_feira',
                indicação: 'indicacao',
                indicacao: 'indicacao',
                telemarketing: 'telemarketing',
                direto: 'direto',
                outros: 'direto'
            };
            return map[origemKeyRaw] || origemKeyRaw;
        })();
        const alreadyConverted = statusKey === 'contato' || statusKey === 'convertido';
        
        return `
            <form id="crud-form" data-action="${id ? 'update' : 'create'}" data-module="leads" data-id="${id || ''}" autocomplete="on">
                ${id ? `
                <div class="bg-white border border-gray-200 rounded-lg p-4 mb-6">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div class="text-sm font-semibold text-gray-800">Ações rápidas</div>
                            <div class="text-xs text-gray-500">Cria/vincula um Contato a partir deste Lead.</div>
                        </div>
                        <button type="button"
                                class="px-4 py-2 rounded-lg text-white transition ${alreadyConverted ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}"
                                data-form-action="convert-to-contato"
                                ${alreadyConverted ? 'disabled' : ''}>
                            <i class="fas fa-user-check mr-2"></i>${alreadyConverted ? 'Já convertido' : 'Converter em Contato'}
                        </button>
                    </div>
                </div>
                ` : ''}

                <div class="bg-white border border-gray-200 rounded-lg p-4 mb-6" data-lead-ai="1">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div class="text-sm font-semibold text-gray-800">Assistente IA</div>
                            <div class="text-xs text-gray-500">Sugere preenchimento, validações, análise de texto e gera uma apresentação a partir dos dados.</div>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                            <button type="button" data-lead-ai-action="suggest"
                                    class="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition">
                                <i class="fas fa-wand-magic-sparkles mr-2"></i>Sugerir
                            </button>
                            <button type="button" data-lead-ai-action="presentation"
                                    class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                                <i class="fas fa-file-powerpoint mr-2"></i>Apresentação
                            </button>
                            <button type="button" data-lead-ai-action="extract-image"
                                    class="px-3 py-2 bg-white text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                                <i class="fas fa-id-card mr-2"></i>Imagem
                            </button>
                        </div>
                    </div>
                    <div class="mt-3 hidden" data-lead-ai-results></div>
                    <input type="file" accept="image/*" class="hidden" data-lead-ai-image-input>
                </div>

                <!-- Informações Básicas do Lead -->
                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6 border border-blue-200">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-user-plus mr-3 text-blue-600"></i>Informações Básicas do Lead
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label for="${formId}_nome" class="block text-sm font-medium text-gray-700 mb-2">
                                Nome Completo *
                                <span class="text-xs text-gray-500">(Pessoa de contato)</span>
                            </label>
                            <input type="text" id="${formId}_nome" name="nome" value="${lead.nome || ''}" required 
                                   autocomplete="name" placeholder="Ex: João Silva Santos"
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg">
                        </div>
                        <div>
                            <label for="${formId}_email" class="block text-sm font-medium text-gray-700 mb-2">
                                Email Principal *
                            </label>
                            <input type="email" id="${formId}_email" name="email" value="${lead.email || ''}" required
                                   autocomplete="email" placeholder="contato@empresa.com.br"
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label for="${formId}_telefone" class="block text-sm font-medium text-gray-700 mb-2">
                                Telefone Principal *
                            </label>
                            <input type="tel" id="${formId}_telefone" name="telefone" value="${lead.telefone || ''}" required
                                   autocomplete="tel" placeholder="(11) 99999-9999"
                                   data-mask="phone" maxlength="15"
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label for="${formId}_whatsapp" class="block text-sm font-medium text-gray-700 mb-2">
                                WhatsApp
                                <span class="text-xs text-gray-500">(Opcional)</span>
                            </label>
                            <input type="tel" id="${formId}_whatsapp" name="whatsapp" value="${lead.whatsapp || ''}"
                                   placeholder="(11) 99999-9999" data-mask="phone" maxlength="15"
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label for="${formId}_empresa" class="block text-sm font-medium text-gray-700 mb-2">
                                Empresa/Organização
                            </label>
                            <input type="text" id="${formId}_empresa" name="empresa" value="${lead.empresa || ''}"
                                   autocomplete="organization" placeholder="Nome da empresa"
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label for="${formId}_cargo" class="block text-sm font-medium text-gray-700 mb-2">
                                Cargo/Função
                            </label>
                            <input type="text" id="${formId}_cargo" name="cargo" value="${lead.cargo || ''}"
                                   placeholder="Ex: Gerente de Marketing"
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                    </div>
                </div>

                <!-- Qualificação de Marketing -->
                <div class="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg mb-6 border border-green-200">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-chart-line mr-3 text-green-600"></i>Qualificação de Marketing
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label for="${formId}_origem" class="block text-sm font-medium text-gray-700 mb-2">
                                Origem do Lead *
                            </label>
                            <select id="${formId}_origem" name="origem" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                                <option value="">Selecione a origem</option>
                                <option value="site_organico" ${origemKey === 'site_organico' ? 'selected' : ''}>🌐 Site (Orgânico)</option>
                                <option value="site_institucional" ${origemKey === 'site_institucional' ? 'selected' : ''}>🌐 Site Institucional</option>
                                <option value="instagram" ${origemKey === 'instagram' ? 'selected' : ''}>📸 Instagram / Redes Sociais</option>
                                <option value="google_ads" ${origemKey === 'google_ads' ? 'selected' : ''}>🔍 Google Ads</option>
                                <option value="facebook_ads" ${origemKey === 'facebook_ads' ? 'selected' : ''}>📘 Facebook Ads</option>
                                <option value="linkedin_ads" ${origemKey === 'linkedin_ads' ? 'selected' : ''}>💼 LinkedIn Ads</option>
                                <option value="ligacao_ativa" ${origemKey === 'ligacao_ativa' ? 'selected' : ''}>📞 Ligação Ativa</option>
                                <option value="whatsapp" ${origemKey === 'whatsapp' ? 'selected' : ''}>💬 WhatsApp</option>
                                <option value="whatsapp_business" ${origemKey === 'whatsapp_business' ? 'selected' : ''}>💬 WhatsApp Business</option>
                                <option value="email" ${origemKey === 'email' ? 'selected' : ''}>📧 Email</option>
                                <option value="email_marketing" ${origemKey === 'email_marketing' ? 'selected' : ''}>📧 Email Marketing</option>
                                <option value="feira" ${origemKey === 'feira' ? 'selected' : ''}>🎪 Feira</option>
                                <option value="evento_feira" ${origemKey === 'evento_feira' ? 'selected' : ''}>🎪 Evento/Feira</option>
                                <option value="indicacao" ${origemKey === 'indicacao' ? 'selected' : ''}>👥 Indicação</option>
                                <option value="telemarketing" ${origemKey === 'telemarketing' ? 'selected' : ''}>📞 Telemarketing</option>
                                <option value="direto" ${origemKey === 'direto' ? 'selected' : ''}>📋 Direto / Outros</option>
                            </select>
                        </div>
                        <div>
                            <label for="${formId}_status" class="block text-sm font-medium text-gray-700 mb-2">
                                Status do Lead
                            </label>
                            <select id="${formId}_status" name="status" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                                <option value="novo" ${statusKey === 'novo' ? 'selected' : ''}>🆕 Novo</option>
                                <option value="contato" ${statusKey === 'contato' ? 'selected' : ''}>📞 Contatado</option>
                                <option value="qualificado" ${statusKey === 'qualificado' ? 'selected' : ''}>✅ Qualificado</option>
                                <option value="proposta_enviada" ${statusKey === 'proposta_enviada' ? 'selected' : ''}>📋 Proposta Enviada</option>
                                <option value="negociacao" ${statusKey === 'negociacao' ? 'selected' : ''}>🤝 Em Negociação</option>
                                <option value="convertido" ${statusKey === 'convertido' ? 'selected' : ''}>🎉 Convertido</option>
                                <option value="perdido" ${statusKey === 'perdido' ? 'selected' : ''}>❌ Perdido</option>
                                <option value="inativo" ${statusKey === 'inativo' ? 'selected' : ''}>😴 Inativo</option>
                            </select>
                        </div>
                        <div>
                            <label for="${formId}_nivel_interesse" class="block text-sm font-medium text-gray-700 mb-2">
                                Nível de Interesse
                            </label>
                            <select id="${formId}_nivel_interesse" name="nivel_interesse" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                                <option value="Baixo" ${lead.nivel_interesse === 'Baixo' ? 'selected' : ''}>❄️ Baixo</option>
                                <option value="Médio" ${lead.nivel_interesse === 'Médio' ? 'selected' : ''}>🌡️ Médio</option>
                                <option value="Alto" ${lead.nivel_interesse === 'Alto' ? 'selected' : ''}>🔥 Alto</option>
                                <option value="Muito Alto" ${lead.nivel_interesse === 'Muito Alto' ? 'selected' : ''}>🚀 Muito Alto</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Interesses e Necessidades -->
                <div class="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg mb-6 border border-purple-200">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-bullseye mr-3 text-purple-600"></i>Interesses e Necessidades
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Produtos/Serviços de Interesse
                            </label>
                            <div class="space-y-2">
                                <label class="flex items-center">
                                    <input type="checkbox" name="interesses[]" value="Stand Personalizado" 
                                           ${lead.interesses?.includes('Stand Personalizado') ? 'checked' : ''}
                                           class="mr-2 text-purple-600 focus:ring-purple-500">
                                    🎨 Stand Personalizado
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" name="interesses[]" value="Stand Modular"
                                           ${lead.interesses?.includes('Stand Modular') ? 'checked' : ''}
                                           class="mr-2 text-purple-600 focus:ring-purple-500">
                                    🧩 Stand Modular
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" name="interesses[]" value="Locação de Equipamentos"
                                           ${lead.interesses?.includes('Locação de Equipamentos') ? 'checked' : ''}
                                           class="mr-2 text-purple-600 focus:ring-purple-500">
                                    📺 Locação de Equipamentos
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" name="interesses[]" value="Projeto Completo"
                                           ${lead.interesses?.includes('Projeto Completo') ? 'checked' : ''}
                                           class="mr-2 text-purple-600 focus:ring-purple-500">
                                    🎯 Projeto Completo
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" name="interesses[]" value="Consultoria"
                                           ${lead.interesses?.includes('Consultoria') ? 'checked' : ''}
                                           class="mr-2 text-purple-600 focus:ring-purple-500">
                                    💡 Consultoria
                                </label>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Orçamento Estimado (R$)
                            </label>
                            <select name="orcamento_estimado" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 mb-4">
                                <option value="">Selecione a faixa</option>
                                <option value="Até R$ 10.000" ${lead.orcamento_estimado === 'Até R$ 10.000' ? 'selected' : ''}>💰 Até R$ 10.000</option>
                                <option value="R$ 10.000 - R$ 25.000" ${lead.orcamento_estimado === 'R$ 10.000 - R$ 25.000' ? 'selected' : ''}>💰💰 R$ 10.000 - R$ 25.000</option>
                                <option value="R$ 25.000 - R$ 50.000" ${lead.orcamento_estimado === 'R$ 25.000 - R$ 50.000' ? 'selected' : ''}>💰💰💰 R$ 25.000 - R$ 50.000</option>
                                <option value="R$ 50.000 - R$ 100.000" ${lead.orcamento_estimado === 'R$ 50.000 - R$ 100.000' ? 'selected' : ''}>💎 R$ 50.000 - R$ 100.000</option>
                                <option value="Acima de R$ 100.000" ${lead.orcamento_estimado === 'Acima de R$ 100.000' ? 'selected' : ''}>💎💎 Acima de R$ 100.000</option>
                                <option value="A definir" ${lead.orcamento_estimado === 'A definir' ? 'selected' : ''}>❓ A definir</option>
                            </select>
                            
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Prazo do Projeto
                            </label>
                            <select name="prazo_projeto" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                                <option value="">Selecione o prazo</option>
                                <option value="Urgente (até 15 dias)" ${lead.prazo_projeto === 'Urgente (até 15 dias)' ? 'selected' : ''}>🚨 Urgente (até 15 dias)</option>
                                <option value="1 mês" ${lead.prazo_projeto === '1 mês' ? 'selected' : ''}>📅 1 mês</option>
                                <option value="2-3 meses" ${lead.prazo_projeto === '2-3 meses' ? 'selected' : ''}>📅📅 2-3 meses</option>
                                <option value="3-6 meses" ${lead.prazo_projeto === '3-6 meses' ? 'selected' : ''}>📅📅📅 3-6 meses</option>
                                <option value="Mais de 6 meses" ${lead.prazo_projeto === 'Mais de 6 meses' ? 'selected' : ''}>📅📅📅📅 Mais de 6 meses</option>
                                <option value="Ainda não definido" ${lead.prazo_projeto === 'Ainda não definido' ? 'selected' : ''}>❓ Ainda não definido</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Observações e Próximos Passos -->
                <div class="bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-lg border border-orange-200">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-clipboard-list mr-3 text-orange-600"></i>Observações e Próximos Passos
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <div class="flex items-center justify-between gap-2 mb-2">
                                <label class="block text-sm font-medium text-gray-700">
                                    Observações do Lead
                                </label>
                                <button type="button" data-lead-ai-voice="observacoes"
                                        class="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                                    <i class="fas fa-microphone mr-2"></i>Voz
                                </button>
                            </div>
                            <textarea name="observacoes" rows="4"
                                      placeholder="Informações importantes sobre o lead, necessidades específicas, contexto da conversa..."
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500">${lead.observacoes || ''}</textarea>
                        </div>
                        <div>
                            <div class="flex items-center justify-between gap-2 mb-2">
                                <label class="block text-sm font-medium text-gray-700">
                                    Próximos Passos
                                </label>
                                <button type="button" data-lead-ai-voice="proximos_passos"
                                        class="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                                    <i class="fas fa-microphone mr-2"></i>Voz
                                </button>
                            </div>
                            <textarea name="proximos_passos" rows="2"
                                      placeholder="Ações planejadas, follow-up, reuniões agendadas..."
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 mb-3">${lead.proximos_passos || ''}</textarea>
                            
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Responsável pelo Lead
                            </label>
                            <input type="text" name="responsavel" value="${lead.responsavel || ''}"
                                   placeholder="Nome do responsável"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
                        </div>
                    </div>
                </div>
            </form>

            <script>
                // Aplicar máscaras para telefone
                document.addEventListener('DOMContentLoaded', function() {
                    const phoneInputs = document.querySelectorAll('input[data-mask="phone"]');
                    phoneInputs.forEach(input => {
                        input.addEventListener('input', function(e) {
                            const cursorPos = e.target.selectionStart;
                            let value = e.target.value.replace(/\\D/g, '');
                            let formattedValue = '';
                            
                            // Aplicar máscara progressiva
                            if (value.length <= 2) {
                                formattedValue = value;
                            } else if (value.length <= 6) {
                                formattedValue = value.replace(/(\\d{2})(\\d+)/, '($1) $2');
                            } else if (value.length <= 10) {
                                formattedValue = value.replace(/(\\d{2})(\\d{4})(\\d+)/, '($1) $2-$3');
                            } else {
                                formattedValue = value.replace(/(\\d{2})(\\d{5})(\\d{4})/, '($1) $2-$3');
                            }
                            
                            // Só atualizar se o valor mudou
                            if (formattedValue !== e.target.value) {
                                e.target.value = formattedValue;
                                // Ajustar posição do cursor
                                const diff = formattedValue.length - e.target.value.length;
                                const newCursorPos = Math.min(cursorPos + diff, formattedValue.length);
                                e.target.setSelectionRange(newCursorPos, newCursorPos);
                            }
                        });
                    });
                });
            </script>
        `;
    }

    // Formulário de Contato/Segmentação
    getContactForm(id = null) {
        const contact = id ? (ModuleSystem.data.contatos?.find(c => String(c.id) === String(id)) || {}) : {};
        const current =
            (window.AuthSystem && typeof window.AuthSystem.getCurrentUser === 'function')
                ? (window.AuthSystem.getCurrentUser() || null)
                : ((window.AuthSystem && window.AuthSystem.currentUser) ? window.AuthSystem.currentUser : null);
        const currentRole = current && current.role != null ? String(current.role).toLowerCase() : '';
        const canAssign = currentRole === 'administrador' || currentRole === 'admin' || currentRole === 'gerente' || currentRole === 'gerencia' || currentRole === 'gerência' || currentRole === 'gestor' || currentRole === 'gestao' || currentRole === 'gestão';
        const currentId = current && current.id != null ? String(current.id) : '';
        const usuarios = Array.isArray(ModuleSystem.data.usuarios) ? ModuleSystem.data.usuarios : [];
        const normalize = (v) => (v != null ? String(v).trim().toLowerCase() : '');
        const vendedores = usuarios.filter(u => {
            const r = normalize(u?.role || u?.perfil || u?.cargo);
            return r === 'vendedor' || r === 'comercial' || r === 'vendas' || 
                   r === 'administrador' || r === 'admin' || 
                   r === 'gerente' || r === 'gerencia' || r === 'marketing';
        });
        const responsavelSelectedRaw = contact.responsavel_id ?? contact.responsavelId ?? '';
        const responsavelSelected = responsavelSelectedRaw != null && String(responsavelSelectedRaw).trim() !== '' ? String(responsavelSelectedRaw) : '';
        const responsavelIdValue = responsavelSelected || '';
        const responsavelNameValue = (() => {
            const key = responsavelIdValue ? String(responsavelIdValue) : '';
            const u = key ? usuarios.find(x => x && x.id != null && String(x.id) === key) : null;
            if (u) return u.nome || u.name || u.email || key;
            return contact.responsavel_text || contact.responsavelText || '';
        })();
        
        return `
            <form id="crud-form" data-action="${id ? 'update' : 'create'}" data-module="contatos" data-id="${id || ''}" autocomplete="on">
                ${id ? `
                <div class="bg-white border border-gray-200 rounded-lg p-4 mb-6">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div class="text-sm font-semibold text-gray-800">Ações rápidas</div>
                            <div class="text-xs text-gray-500">Crie um lembrete/tarefa de follow-up para este contato.</div>
                        </div>
                        <button type="button"
                                class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition"
                                data-form-action="create-task">
                            <i class="fas fa-tasks mr-2"></i>Criar Tarefa
                        </button>
                    </div>
                </div>
                ` : ''}

                <div class="bg-white border border-gray-200 rounded-lg p-4 mb-6" data-contact-ai="1">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div class="text-sm font-semibold text-gray-800">Assistente IA</div>
                            <div class="text-xs text-gray-500">Sugere preenchimento, validações, reescrita de texto, e gera uma apresentação.</div>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                            <button type="button" data-contact-ai-action="suggest"
                                    class="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition">
                                <i class="fas fa-wand-magic-sparkles mr-2"></i>Sugerir
                            </button>
                            <button type="button" data-contact-ai-action="presentation"
                                    class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                                <i class="fas fa-file-powerpoint mr-2"></i>Apresentação
                            </button>
                            <button type="button" data-contact-ai-action="extract-image"
                                    class="px-3 py-2 bg-white text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                                <i class="fas fa-id-card mr-2"></i>Imagem
                            </button>
                        </div>
                    </div>
                    <div class="mt-3 hidden" data-contact-ai-results></div>
                    <input type="file" accept="image/*" class="hidden" data-contact-ai-image-input>
                </div>
                <!-- Informações Pessoais -->
                <div class="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-lg mb-6 border border-blue-200">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-user-circle mr-3 text-blue-600"></i>Informações Pessoais
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Nome Completo *
                            </label>
                            <input type="text" name="nome" value="${contact.nome || ''}" required 
                                   autocomplete="name" placeholder="Ex: Maria Silva Santos"
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Email Principal *
                            </label>
                            <input type="email" name="email" value="${contact.email || ''}" required
                                   autocomplete="email" placeholder="contato@empresa.com.br"
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Telefone Principal *
                            </label>
                            <input type="tel" name="telefone" value="${contact.telefone || ''}" required
                                   autocomplete="tel" placeholder="(11) 99999-9999"
                                   data-mask="phone" maxlength="15"
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                WhatsApp
                                <span class="text-xs text-gray-500">(Opcional)</span>
                            </label>
                            <input type="tel" name="whatsapp" value="${contact.whatsapp || ''}"
                                   placeholder="(11) 99999-9999" data-mask="phone" maxlength="15"
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                    </div>
                </div>

                <div class="bg-gradient-to-r from-amber-50 to-yellow-50 p-6 rounded-lg mb-6 border border-amber-200">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-calendar-alt mr-3 text-amber-600"></i>Datas Importantes
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Aniversário</label>
                            <input type="date" name="aniversario" value="${(contact.aniversario || contact.data_aniversario || '').toString().slice(0, 10)}"
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                            <div class="mt-1 text-xs text-gray-500">Ao salvar, o sistema cria/atualiza um lembrete na agenda.</div>
                        </div>
                        <div>
                            <div class="flex items-center justify-between gap-2 mb-2">
                                <label class="block text-sm font-medium text-gray-700">Outras datas/observações</label>
                                <div class="flex items-center gap-2">
                                    <button type="button" data-contact-ai-voice="datas_importantes"
                                            class="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                                        <i class="fas fa-microphone mr-2"></i>Voz
                                    </button>
                                    <button type="button" data-ai-rewrite="datas_importantes"
                                            class="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                                        <i class="fas fa-pen mr-2"></i>Melhorar
                                    </button>
                                </div>
                            </div>
                            <textarea name="datas_importantes" rows="3"
                                      placeholder="Ex: data de renovação, datas de eventos, preferências..."
                                      class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500">${contact.datas_importantes || contact.datasImportantes || ''}</textarea>
                        </div>
                    </div>
                </div>

                <!-- Informações Profissionais -->
                <div class="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-lg mb-6 border border-green-200">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-briefcase mr-3 text-green-600"></i>Informações Profissionais
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Empresa/Organização
                            </label>
                            <input type="text" name="empresa" value="${contact.empresa || ''}"
                                   autocomplete="organization" placeholder="Nome da empresa"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Cargo/Função
                            </label>
                            <input type="text" name="cargo" value="${contact.cargo || ''}"
                                   placeholder="Ex: Gerente de Marketing"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Departamento
                            </label>
                            <select name="departamento" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                                <option value="">Selecione o departamento</option>
                                <option value="Marketing" ${contact.departamento === 'Marketing' ? 'selected' : ''}>Marketing</option>
                                <option value="Vendas" ${contact.departamento === 'Vendas' ? 'selected' : ''}>Vendas</option>
                                <option value="Comercial" ${contact.departamento === 'Comercial' ? 'selected' : ''}>Comercial</option>
                                <option value="Eventos" ${contact.departamento === 'Eventos' ? 'selected' : ''}>Eventos</option>
                                <option value="Comunicação" ${contact.departamento === 'Comunicação' ? 'selected' : ''}>Comunicação</option>
                                <option value="Diretoria" ${contact.departamento === 'Diretoria' ? 'selected' : ''}>Diretoria</option>
                                <option value="Outros" ${contact.departamento === 'Outros' ? 'selected' : ''}>Outros</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                LinkedIn
                                <span class="text-xs text-gray-500">(Opcional)</span>
                            </label>
                            <input type="url" name="linkedin" value="${contact.linkedin || ''}"
                                   placeholder="https://linkedin.com/in/perfil"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                        </div>
                    </div>
                </div>

                <!-- Segmentação e Classificação -->
                <div class="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg mb-6 border border-purple-200">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-tags mr-3 text-purple-600"></i>Segmentação e Classificação
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Categoria do Contato
                            </label>
                            <select name="categoria" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                                <option value="Lead" ${contact.categoria === 'Lead' ? 'selected' : ''}>🎯 Lead</option>
                                <option value="Prospect" ${contact.categoria === 'Prospect' ? 'selected' : ''}>👀 Prospect</option>
                                <option value="Cliente" ${contact.categoria === 'Cliente' ? 'selected' : ''}>✅ Cliente</option>
                                <option value="Ex-Cliente" ${contact.categoria === 'Ex-Cliente' ? 'selected' : ''}>📋 Ex-Cliente</option>
                                <option value="Parceiro" ${contact.categoria === 'Parceiro' ? 'selected' : ''}>🤝 Parceiro</option>
                                <option value="Fornecedor" ${contact.categoria === 'Fornecedor' ? 'selected' : ''}>🏭 Fornecedor</option>
                                <option value="Influenciador" ${contact.categoria === 'Influenciador' ? 'selected' : ''}>⭐ Influenciador</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Nível de Interesse
                            </label>
                            <select name="nivel_interesse" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                                <option value="Baixo" ${contact.nivel_interesse === 'Baixo' ? 'selected' : ''}>❄️ Baixo</option>
                                <option value="Médio" ${contact.nivel_interesse === 'Médio' ? 'selected' : ''}>🌡️ Médio</option>
                                <option value="Alto" ${contact.nivel_interesse === 'Alto' ? 'selected' : ''}>🔥 Alto</option>
                                <option value="Muito Alto" ${contact.nivel_interesse === 'Muito Alto' ? 'selected' : ''}>🚀 Muito Alto</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Origem do Contato
                            </label>
                            <select name="origem" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                                <option value="">Selecione a origem</option>
                                <option value="Site Institucional" ${contact.origem === 'Site Institucional' ? 'selected' : ''}>🌐 Site Institucional</option>
                                <option value="Redes Sociais" ${contact.origem === 'Redes Sociais' ? 'selected' : ''}>📱 Redes Sociais</option>
                                <option value="Google Ads" ${contact.origem === 'Google Ads' ? 'selected' : ''}>🔍 Google Ads</option>
                                <option value="Indicação" ${contact.origem === 'Indicação' ? 'selected' : ''}>👥 Indicação</option>
                                <option value="Evento/Feira" ${contact.origem === 'Evento/Feira' ? 'selected' : ''}>🎪 Evento/Feira</option>
                                <option value="Email Marketing" ${contact.origem === 'Email Marketing' ? 'selected' : ''}>📧 Email Marketing</option>
                                <option value="Telemarketing" ${contact.origem === 'Telemarketing' ? 'selected' : ''}>📞 Telemarketing</option>
                                <option value="WhatsApp" ${contact.origem === 'WhatsApp' ? 'selected' : ''}>💬 WhatsApp</option>
                                <option value="Outros" ${contact.origem === 'Outros' ? 'selected' : ''}>📋 Outros</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Vendedor Responsável
                            </label>
                            ${canAssign ? `
                                <select name="responsavel_id" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                                    <option value="">Não atribuído</option>
                                    ${vendedores.map(u => `
                                        <option value="${u.id}" ${String(u.id) === String(responsavelIdValue) ? 'selected' : ''}>${u.nome || u.name || u.email || u.id}</option>
                                    `).join('')}
                                </select>
                            ` : `
                                <input type="text" value="${responsavelNameValue || 'Não atribuído'}" disabled
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700">
                            `}
                        </div>
                    </div>
                </div>

                <!-- Preferências e Observações -->
                <div class="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-lg border border-orange-200">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-heart mr-3 text-orange-600"></i>Preferências e Observações
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Interesses/Produtos
                            </label>
                            <div class="space-y-2">
                                <label class="flex items-center">
                                    <input type="checkbox" name="interesses[]" value="Stand Personalizado" 
                                           ${contact.interesses?.includes('Stand Personalizado') ? 'checked' : ''}
                                           class="mr-2 text-orange-600 focus:ring-orange-500">
                                    Stand Personalizado
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" name="interesses[]" value="Stand Modular"
                                           ${contact.interesses?.includes('Stand Modular') ? 'checked' : ''}
                                           class="mr-2 text-orange-600 focus:ring-orange-500">
                                    Stand Modular
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" name="interesses[]" value="Locação de Equipamentos"
                                           ${contact.interesses?.includes('Locação de Equipamentos') ? 'checked' : ''}
                                           class="mr-2 text-orange-600 focus:ring-orange-500">
                                    Locação de Equipamentos
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" name="interesses[]" value="Projeto Completo"
                                           ${contact.interesses?.includes('Projeto Completo') ? 'checked' : ''}
                                           class="mr-2 text-orange-600 focus:ring-orange-500">
                                    Projeto Completo
                                </label>
                            </div>
                        </div>
                        <div>
                            <div class="flex items-center justify-between gap-2 mb-2">
                                <label class="block text-sm font-medium text-gray-700">Observações Gerais</label>
                                <div class="flex items-center gap-2">
                                    <button type="button" data-contact-ai-voice="observacoes"
                                            class="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                                        <i class="fas fa-microphone mr-2"></i>Voz
                                    </button>
                                    <button type="button" data-ai-rewrite="observacoes"
                                            class="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                                        <i class="fas fa-pen mr-2"></i>Melhorar
                                    </button>
                                </div>
                            </div>
                            <textarea name="observacoes" rows="6"
                                      placeholder="Informações importantes sobre o contato, preferências de comunicação, histórico de interações..."
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500">${contact.observacoes || ''}</textarea>
                        </div>
                    </div>
                </div>
            </form>

        `;
    }

    // Inicializar event listeners
    initializeEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📋 MarketingForms: Formulários de marketing carregados com sucesso!');
        });
    }
}

// Instanciar a classe
window.MarketingForms = new MarketingForms();
