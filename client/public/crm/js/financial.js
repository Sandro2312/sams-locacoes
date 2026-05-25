// Sistema Financeiro Completo - SAMS Locações CRM/ERP
const FinancialSystem = {
    // Configurações
    config: {
        modalId: 'financial-modal',
        overlayId: 'financial-overlay',
        comissaoVendedor: 0.05, // 5%
        comissaoGerente: 0.02,  // 2%
        impostos: {
            pis: 0.0065,      // 0.65%
            cofins: 0.03,     // 3%
            csll: 0.01,       // 1%
            irpj: 0.015,      // 1.5%
            iss: 0.05         // 5%
        }
    },

    // Inicialização
    init() {
        this.createModalStructure();
        this.bindEvents();
        this.initializeData();
    },

    // Inicializar dados financeiros
    initializeData() {
        if (typeof ModuleSystem !== 'undefined' && ModuleSystem.data) {
            if (!ModuleSystem.data.financeiro) {
                ModuleSystem.data.financeiro = {
                    orcamentos: [],
                    contratos: [],
                    faturas: [],
                    comissoes: [],
                    despesas: [],
                    receitas: []
                };
                ModuleSystem.saveData();
            }
        }
        this.syncDespesasFromBackend();
    },

    async syncDespesasFromBackend() {
        try {
            const resp = await fetch('/api/crm/despesas', { credentials: 'include' });
            if (!resp.ok) return;
            const despesas = await resp.json().catch(() => []);
            if (Array.isArray(despesas) && ModuleSystem.data && ModuleSystem.data.financeiro) {
                ModuleSystem.data.financeiro.despesas = despesas;
                ModuleSystem.saveData();
            }
        } catch (e) {
            console.warn('[FinancialSystem] Falha ao sincronizar despesas:', e);
        }
    },

    async saveDespesaToBackend(despesa) {
        try {
            const isNew = !despesa.id || despesa.id.toString().startsWith('local_');
            const method = isNew ? 'POST' : 'PUT';
            const url = isNew ? '/api/crm/despesas' : `/api/crm/despesas/${despesa.id}`;
            
            const resp = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    descricao: despesa.descricao,
                    tipo: despesa.tipo,
                    valor: despesa.valor,
                    status: despesa.status,
                    centro_custo: despesa.centro_custo,
                    data: despesa.data,
                    observacoes: despesa.observacoes,
                    evento_id: despesa.evento_id,
                    cliente_id: despesa.cliente_id,
                    recorrencia: despesa.recorrencia,
                    recorrencia_qtd: despesa.recorrencia_qtd
                })
            });
            
            if (!resp.ok) throw new Error('Falha ao salvar despesa no servidor');
            const result = await resp.json().catch(() => ({}));
            
            if (isNew && result.id) {
                despesa.id = result.id;
            }
            
            return result;
        } catch (e) {
            console.warn('[FinancialSystem] Falha ao salvar despesa no backend:', e);
            throw e;
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
                    <div class="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] flex flex-col">
                        <div class="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
                            <h2 id="financial-title" class="text-xl font-semibold text-gray-800">Financeiro</h2>
                            <button id="financial-close" class="text-gray-400 hover:text-gray-600 transition duration-300">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <div id="financial-content" class="p-6 overflow-y-auto flex-1">
                            <!-- Conteúdo será inserido aqui -->
                        </div>
                        <div class="flex justify-end space-x-3 p-6 border-t border-gray-200 flex-shrink-0 sticky bottom-0 bg-white z-10">
                            <button id="financial-dashboard" class="px-4 py-2 text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition duration-300">
                                <i class="fas fa-home mr-2"></i>
                                Voltar ao Dashboard
                            </button>
                            <button id="financial-cancel" class="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-300">
                                Cancelar
                            </button>
                            <button id="financial-save" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300">
                                Salvar
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
        const closeBtn = document.getElementById('financial-close');
        const cancelBtn = document.getElementById('financial-cancel');
        const saveBtn = document.getElementById('financial-save');
        const dashboardBtn = document.getElementById('financial-dashboard');

        [overlay, closeBtn, cancelBtn].forEach(element => {
            element?.addEventListener('click', (e) => {
                if (e.target === overlay || e.target === closeBtn || e.target === cancelBtn) {
                    this.closeModal();
                }
            });
        });

        saveBtn?.addEventListener('click', () => {
            this.saveFinancialItem();
        });

        dashboardBtn?.addEventListener('click', () => {
            this.closeModal();
            if (window.NavigationSystem && typeof window.NavigationSystem.navigateToModule === 'function') {
                window.NavigationSystem.navigateToModule('dashboard');
            } else {
                console.warn('[FinancialSystem] NavigationSystem não disponível.');
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
        const modalTitle = document.getElementById('financial-title');
        const modalContent = document.getElementById('financial-content');

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

    // Fechar modal
    closeModal() {
        const overlay = document.getElementById(this.config.overlayId);
        overlay.classList.add('hidden');
    },

    // Gerar formulário de orçamento
    generateOrcamentoForm(orcamento = null) {
        const isEdit = orcamento !== null;
        const formId = `orcamento_${Date.now()}`;
        
        return `
            <form id="orcamento-form" data-action="${isEdit ? 'update' : 'create'}" ${isEdit ? `data-id="${orcamento.id}"` : ''}>
                <!-- Informações do Cliente -->
                <div class="bg-gray-50 p-6 rounded-lg mb-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-user mr-2 text-blue-600"></i>
                        Informações do Cliente
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="cliente_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Cliente *</label>
                            <input type="text" name="cliente" id="cliente_${formId}" value="${orcamento?.cliente || ''}" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label for="documento_${formId}" class="block text-sm font-medium text-gray-700 mb-2">CNPJ/CPF</label>
                            <input type="text" name="documento" id="documento_${formId}" value="${orcamento?.documento || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label for="contato_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Contato</label>
                            <input type="text" name="contato" id="contato_${formId}" value="${orcamento?.contato || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label for="telefone_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                            <input type="tel" name="telefone" id="telefone_${formId}" value="${orcamento?.telefone || ''}"
                                   data-mask="phone"
                                   data-validation="phone"
                                   placeholder="(11) 99999-9999"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                    </div>
                </div>

                <!-- Detalhes do Orçamento -->
                <div class="bg-gray-50 p-6 rounded-lg mb-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-file-invoice-dollar mr-2 text-green-600"></i>
                        Detalhes do Orçamento
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="numero_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Número do Orçamento</label>
                            <input type="text" name="numero" id="numero_${formId}" value="${orcamento?.numero || this.generateOrcamentoNumber()}" readonly
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100">
                        </div>
                        <div>
                            <label for="dataValidade_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Data de Validade *</label>
                            <input type="date" name="dataValidade" id="dataValidade_${formId}" value="${orcamento?.dataValidade || ''}" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label for="vendedor_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Vendedor *</label>
                            <select name="vendedor" id="vendedor_${formId}" required 
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">Selecione...</option>
                                <option value="João Silva" ${orcamento?.vendedor === 'João Silva' ? 'selected' : ''}>João Silva</option>
                                <option value="Maria Santos" ${orcamento?.vendedor === 'Maria Santos' ? 'selected' : ''}>Maria Santos</option>
                                <option value="Pedro Costa" ${orcamento?.vendedor === 'Pedro Costa' ? 'selected' : ''}>Pedro Costa</option>
                            </select>
                        </div>
                        <div>
                            <label for="status_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <select name="status" id="status_${formId}"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="Pendente" ${orcamento?.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                                <option value="Enviado" ${orcamento?.status === 'Enviado' ? 'selected' : ''}>Enviado</option>
                                <option value="Aprovado" ${orcamento?.status === 'Aprovado' ? 'selected' : ''}>Aprovado</option>
                                <option value="Rejeitado" ${orcamento?.status === 'Rejeitado' ? 'selected' : ''}>Rejeitado</option>
                                <option value="Expirado" ${orcamento?.status === 'Expirado' ? 'selected' : ''}>Expirado</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Itens do Orçamento -->
                <div class="bg-gray-50 p-6 rounded-lg mb-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-gray-800 flex items-center">
                            <i class="fas fa-list mr-2 text-purple-600"></i>
                            Itens do Orçamento
                        </h3>
                        <button type="button" id="add-item-btn" class="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-300">
                            <i class="fas fa-plus mr-1"></i>Adicionar Item
                        </button>
                    </div>
                    <div id="itens-container">
                        ${this.generateItensHTML(orcamento?.itens || [])}
                    </div>
                    <div class="mt-4 p-4 bg-white rounded-lg border">
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span class="font-medium text-gray-700">Subtotal:</span>
                                <span id="subtotal" class="ml-2 font-semibold">R$ 0,00</span>
                            </div>
                            <div>
                                <span class="font-medium text-gray-700">Desconto:</span>
                                <span id="desconto-total" class="ml-2 font-semibold">R$ 0,00</span>
                            </div>
                            <div>
                                <span class="font-medium text-gray-700">Impostos:</span>
                                <span id="impostos-total" class="ml-2 font-semibold">R$ 0,00</span>
                            </div>
                            <div class="text-lg">
                                <span class="font-medium text-gray-700">Total:</span>
                                <span id="total-geral" class="ml-2 font-bold text-green-600">R$ 0,00</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Condições Comerciais -->
                <div class="bg-gray-50 p-6 rounded-lg">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-handshake mr-2 text-orange-600"></i>
                        Condições Comerciais
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="formaPagamento_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Forma de Pagamento</label>
                            <select name="formaPagamento" id="formaPagamento_${formId}"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">Selecione...</option>
                                <option value="À Vista" ${orcamento?.formaPagamento === 'À Vista' ? 'selected' : ''}>À Vista</option>
                                <option value="30 dias" ${orcamento?.formaPagamento === '30 dias' ? 'selected' : ''}>30 dias</option>
                                <option value="30/60 dias" ${orcamento?.formaPagamento === '30/60 dias' ? 'selected' : ''}>30/60 dias</option>
                                <option value="30/60/90 dias" ${orcamento?.formaPagamento === '30/60/90 dias' ? 'selected' : ''}>30/60/90 dias</option>
                            </select>
                        </div>
                        <div>
                            <label for="prazoEntrega_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Prazo de Entrega</label>
                            <input type="text" name="prazoEntrega" id="prazoEntrega_${formId}" value="${orcamento?.prazoEntrega || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                   placeholder="Ex: 15 dias úteis">
                        </div>
                        <div class="md:col-span-2">
                            <label for="observacoes_${formId}" class="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                            <textarea name="observacoes" id="observacoes_${formId}" rows="3" 
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      placeholder="Condições especiais, garantias, etc...">${orcamento?.observacoes || ''}</textarea>
                        </div>
                    </div>
                </div>
            </form>
        `;
    },

    // Gerar HTML dos itens
    generateItensHTML(itens) {
        if (!itens || itens.length === 0) {
            const uniqueId = `item_${Date.now()}`;
            return `
                <div class="item-row bg-white p-4 rounded-lg border mb-3">
                    <div class="grid grid-cols-1 md:grid-cols-6 gap-3">
                        <div class="md:col-span-2">
                            <label for="item_descricao_${uniqueId}" class="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                            <input type="text" name="item_descricao[]" id="item_descricao_${uniqueId}" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label for="item_quantidade_${uniqueId}" class="block text-sm font-medium text-gray-700 mb-1">Qtd</label>
                            <input type="number" name="item_quantidade[]" id="item_quantidade_${uniqueId}" min="1" value="1"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 item-quantidade">
                        </div>
                        <div>
                            <label for="item_valor_${uniqueId}" class="block text-sm font-medium text-gray-700 mb-1">Valor Unit.</label>
                            <input type="text" name="item_valor[]" id="item_valor_${uniqueId}" 
                                   data-mask="currency"
                                   placeholder="R$ 0,00"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 item-valor">
                        </div>
                        <div>
                            <label for="item_desconto_${uniqueId}" class="block text-sm font-medium text-gray-700 mb-1">Desconto %</label>
                            <input type="number" name="item_desconto[]" id="item_desconto_${uniqueId}" min="0" max="100" value="0"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 item-desconto">
                        </div>
                        <div class="flex items-end">
                            <button type="button" class="remove-item-btn w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-300">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="mt-2 text-right">
                        <span class="text-sm font-medium text-gray-700">Total do Item: </span>
                        <span class="item-total font-semibold text-green-600">R$ 0,00</span>
                    </div>
                </div>
            `;
        }

        return itens.map((item, index) => {
            const uniqueId = `item_${Date.now()}_${index}`;
            return `
            <div class="item-row bg-white p-4 rounded-lg border mb-3">
                <div class="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div class="md:col-span-2">
                        <label for="item_descricao_${uniqueId}" class="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                        <input type="text" name="item_descricao[]" id="item_descricao_${uniqueId}" value="${item.descricao || ''}"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label for="item_quantidade_${uniqueId}" class="block text-sm font-medium text-gray-700 mb-1">Qtd</label>
                        <input type="number" name="item_quantidade[]" id="item_quantidade_${uniqueId}" min="1" value="${item.quantidade || 1}"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 item-quantidade">
                    </div>
                    <div>
                            <label for="item_valor_${uniqueId}" class="block text-sm font-medium text-gray-700 mb-1">Valor Unit.</label>
                            <input type="text" name="item_valor[]" id="item_valor_${uniqueId}" value="${Utils.formatters.formatCurrency(item.valor || 0)}"
                                   data-mask="currency"
                                   placeholder="R$ 0,00"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 item-valor">
                        </div>
                    <div>
                        <label for="item_desconto_${uniqueId}" class="block text-sm font-medium text-gray-700 mb-1">Desconto %</label>
                        <input type="number" name="item_desconto[]" id="item_desconto_${uniqueId}" min="0" max="100" value="${item.desconto || 0}"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 item-desconto">
                    </div>
                    <div class="flex items-end">
                        <button type="button" class="remove-item-btn w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-300">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="mt-2 text-right">
                    <span class="text-sm font-medium text-gray-700">Total do Item: </span>
                    <span class="item-total font-semibold text-green-600">${Utils.formatters.formatCurrency(this.calculateItemTotal(item))}</span>
                </div>
            </div>
        `}).join('');
    },

    // Calcular total do item
    calculateItemTotal(item) {
        const quantidade = parseFloat(item.quantidade) || 0;
        const valor = parseFloat(item.valor) || 0;
        const desconto = parseFloat(item.desconto) || 0;
        
        const subtotal = quantidade * valor;
        const valorDesconto = subtotal * (desconto / 100);
        
        return subtotal - valorDesconto;
    },

    // Gerar número do orçamento
    generateOrcamentoNumber() {
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const count = (ModuleSystem.data.financeiro?.orcamentos?.length || 0) + 1;
        
        return `ORC-${year}${month}-${String(count).padStart(4, '0')}`;
    },

    // Calcular comissões
    calculateComissoes(valor, vendedor) {
        const comissaoVendedor = valor * this.config.comissaoVendedor;
        const comissaoGerente = valor * this.config.comissaoGerente;
        
        return {
            vendedor: {
                nome: vendedor,
                valor: comissaoVendedor,
                percentual: this.config.comissaoVendedor * 100
            },
            gerente: {
                valor: comissaoGerente,
                percentual: this.config.comissaoGerente * 100
            },
            total: comissaoVendedor + comissaoGerente
        };
    },

    // Calcular impostos
    calculateImpostos(valor) {
        const impostos = {};
        let totalImpostos = 0;
        
        for (let [imposto, aliquota] of Object.entries(this.config.impostos)) {
            const valorImposto = valor * aliquota;
            impostos[imposto] = {
                aliquota: aliquota * 100,
                valor: valorImposto
            };
            totalImpostos += valorImposto;
        }
        
        return {
            detalhes: impostos,
            total: totalImpostos
        };
    },

    // Salvar item financeiro
    saveFinancialItem() {
        const form = document.getElementById('orcamento-form');
        if (!form) return;

        const formData = new FormData(form);
        const data = {};
        
        // Converter FormData para objeto
        for (let [key, value] of formData.entries()) {
            if (key.includes('[]')) {
                const cleanKey = key.replace('[]', '');
                if (!data[cleanKey]) data[cleanKey] = [];
                data[cleanKey].push(value);
            } else {
                data[key] = value;
            }
        }

        // Processar itens
        const itens = [];
        if (data.item_descricao) {
            for (let i = 0; i < data.item_descricao.length; i++) {
                if (data.item_descricao[i]) {
                    itens.push({
                        descricao: data.item_descricao[i],
                        quantidade: parseFloat(data.item_quantidade[i]) || 1,
                        valor: this.parseCurrency(data.item_valor[i]) || 0,
                        desconto: parseFloat(data.item_desconto[i]) || 0
                    });
                }
            }
        }

        // Calcular totais
        let subtotal = 0;
        let totalDesconto = 0;
        
        itens.forEach(item => {
            const itemSubtotal = item.quantidade * item.valor;
            const itemDesconto = itemSubtotal * (item.desconto / 100);
            subtotal += itemSubtotal;
            totalDesconto += itemDesconto;
        });

        const valorLiquido = subtotal - totalDesconto;
        const impostos = this.calculateImpostos(valorLiquido);
        const comissoes = this.calculateComissoes(valorLiquido, data.vendedor);
        const total = valorLiquido + impostos.total;

        // Montar objeto final
        const orcamento = {
            ...data,
            itens,
            subtotal,
            totalDesconto,
            valorLiquido,
            impostos: impostos.detalhes,
            totalImpostos: impostos.total,
            total,
            comissoes,
            dataCriacao: new Date().toISOString(),
            dataAtualizacao: new Date().toISOString()
        };

        const action = form.getAttribute('data-action');
        const id = form.getAttribute('data-id');

        try {
            if (action === 'create') {
                orcamento.id = Utils.generateId();
                if (!ModuleSystem.data.financeiro.orcamentos) {
                    ModuleSystem.data.financeiro.orcamentos = [];
                }
                ModuleSystem.data.financeiro.orcamentos.push(orcamento);
            } else if (action === 'update') {
                const index = ModuleSystem.data.financeiro.orcamentos.findIndex(o => o.id == id);
                if (index !== -1) {
                    ModuleSystem.data.financeiro.orcamentos[index] = { ...orcamento, id };
                }
            }

            ModuleSystem.saveData();
            Utils.notifications.success('Orçamento salvo com sucesso!');
            this.closeModal();
            
            // Recarregar página se estiver no módulo financeiro
            if (NavigationSystem.currentModule === 'financeiro') {
                NavigationSystem.loadCurrentPage();
            }
        } catch (error) {
            Utils.notifications.error('Erro ao salvar orçamento: ' + error.message);
        }
    },

    // Converter string de moeda para número
    parseCurrency(value) {
        if (!value) return 0;
        return parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
    },

    // Mostrar orçamento
    showOrcamento(id = null) {
        if (id) {
            const orcamento = ModuleSystem.data.financeiro?.orcamentos?.find(o => o.id == id);
            if (orcamento) {
                this.openModal('Editar Orçamento', this.generateOrcamentoForm(orcamento));
            } else {
                Utils.notifications.error('Orçamento não encontrado.');
            }
        } else {
            this.openModal('Novo Orçamento', this.generateOrcamentoForm());
        }

        // Vincular eventos específicos do formulário
        this.bindFormEvents();
    },

    // Vincular eventos do formulário
    bindFormEvents() {
        // Adicionar item
        document.getElementById('add-item-btn')?.addEventListener('click', () => {
            const container = document.getElementById('itens-container');
            const newItem = document.createElement('div');
            newItem.innerHTML = this.generateItensHTML([{}]);
            container.appendChild(newItem.firstElementChild);
            this.bindItemEvents();
            this.updateTotals();
        });

        this.bindItemEvents();
        this.updateTotals();
    },

    // Vincular eventos dos itens
    bindItemEvents() {
        // Remover item
        document.querySelectorAll('.remove-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemRow = e.target.closest('.item-row');
                if (document.querySelectorAll('.item-row').length > 1) {
                    itemRow.remove();
                    this.updateTotals();
                } else {
                    Utils.notifications.warning('Deve haver pelo menos um item no orçamento.');
                }
            });
        });

        // Atualizar totais quando valores mudarem
        document.querySelectorAll('.item-quantidade, .item-valor, .item-desconto').forEach(input => {
            input.addEventListener('input', () => {
                this.updateItemTotal(input.closest('.item-row'));
                this.updateTotals();
            });
        });

        // Formatar valores monetários
        document.querySelectorAll('.item-valor').forEach(input => {
            input.addEventListener('blur', (e) => {
                const value = this.parseCurrency(e.target.value);
                e.target.value = Utils.formatters.formatCurrency(value);
            });
        });
    },

    // Atualizar total do item
    updateItemTotal(itemRow) {
        const quantidade = parseFloat(itemRow.querySelector('.item-quantidade').value) || 0;
        const valor = this.parseCurrency(itemRow.querySelector('.item-valor').value) || 0;
        const desconto = parseFloat(itemRow.querySelector('.item-desconto').value) || 0;
        
        const subtotal = quantidade * valor;
        const valorDesconto = subtotal * (desconto / 100);
        const total = subtotal - valorDesconto;
        
        itemRow.querySelector('.item-total').textContent = Utils.formatters.formatCurrency(total);
    },

    // Atualizar totais gerais
    updateTotals() {
        let subtotal = 0;
        let totalDesconto = 0;
        
        document.querySelectorAll('.item-row').forEach(row => {
            const quantidade = parseFloat(row.querySelector('.item-quantidade').value) || 0;
            const valor = this.parseCurrency(row.querySelector('.item-valor').value) || 0;
            const desconto = parseFloat(row.querySelector('.item-desconto').value) || 0;
            
            const itemSubtotal = quantidade * valor;
            const itemDesconto = itemSubtotal * (desconto / 100);
            
            subtotal += itemSubtotal;
            totalDesconto += itemDesconto;
        });
        
        const valorLiquido = subtotal - totalDesconto;
        const impostos = this.calculateImpostos(valorLiquido);
        const total = valorLiquido + impostos.total;
        
        document.getElementById('subtotal').textContent = Utils.formatters.formatCurrency(subtotal);
        document.getElementById('desconto-total').textContent = Utils.formatters.formatCurrency(totalDesconto);
        document.getElementById('impostos-total').textContent = Utils.formatters.formatCurrency(impostos.total);
        document.getElementById('total-geral').textContent = Utils.formatters.formatCurrency(total);
    }
};

// Exportar para uso global
window.FinancialSystem = FinancialSystem;