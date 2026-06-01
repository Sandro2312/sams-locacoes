/**
 * PATCH: Correção de Bugs - Contas a Receber
 * Autor: Sandro2312/sams-locacoes
 * Data: 2026-06-01
 * 
 * BUGS CORRIGIDOS:
 * 1. ✅ Comprovante obrigatório quando deveria ser opcional
 * 2. ✅ Falta de campos ao salvar receita
 * 3. ✅ Mensagem confusa sobre comprovante
 */

// Sistema de Gerenciamento de Contas a Receber - CORRIGIDO
const ContasReceberModule = {
    // Gerar formulário corrigido
    generateReceiptForm(receipt = null) {
        const isEdit = receipt !== null;
        const formId = `receipt_${Date.now()}`;
        
        return `
            <form id="contas-receber-form" data-action="${isEdit ? 'update' : 'create'}" data-id="${receipt?.id || ''}">
                
                <!-- Informações Básicas -->
                <div class="bg-green-50 p-6 rounded-lg mb-6 border border-green-200">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-receipt mr-2 text-green-600"></i>
                        Nova Conta a Receber
                    </h3>
                    
                    <!-- Descrição -->
                    <div class="mb-4">
                        <label for="descricao_${formId}" class="block text-sm font-medium text-gray-700 mb-2">
                            Descrição *
                        </label>
                        <input 
                            type="text" 
                            id="descricao_${formId}" 
                            name="descricao" 
                            value="${receipt?.descricao || ''}"
                            placeholder="Ex: Locação stand, sinal de contrato, adicional"
                            required
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                    </div>

                    <!-- Cliente e Venda -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label for="cliente_${formId}" class="block text-sm font-medium text-gray-700 mb-2">
                                Cliente *
                            </label>
                            <select 
                                id="cliente_${formId}" 
                                name="clienteId" 
                                required
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            >
                                <option value="">Selecione um cliente</option>
                            </select>
                        </div>
                        <div>
                            <label for="venda_${formId}" class="block text-sm font-medium text-gray-700 mb-2">
                                Venda (ID)
                            </label>
                            <input 
                                type="text" 
                                id="venda_${formId}" 
                                name="vendaId" 
                                value="${receipt?.vendaId || ''}"
                                placeholder="Opcional"
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            >
                        </div>
                    </div>

                    <!-- Centro de Custos e Tipo -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label for="centroCusto_${formId}" class="block text-sm font-medium text-gray-700 mb-2">
                                Centro de Custos
                            </label>
                            <input 
                                type="text" 
                                id="centroCusto_${formId}" 
                                name="centroCusto" 
                                value="${receipt?.centroCusto || ''}"
                                placeholder="Ex: Evento XPTO - Locação / Montagem"
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            >
                        </div>
                        <div>
                            <label for="tipo_${formId}" class="block text-sm font-medium text-gray-700 mb-2">
                                Tipo *
                            </label>
                            <select 
                                id="tipo_${formId}" 
                                name="tipoReceita" 
                                required
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            >
                                <option value="stand" ${receipt?.tipoReceita === 'stand' ? 'selected' : ''}>Stand</option>
                                <option value="servico" ${receipt?.tipoReceita === 'servico' ? 'selected' : ''}>Serviço</option>
                                <option value="aluguel" ${receipt?.tipoReceita === 'aluguel' ? 'selected' : ''}>Aluguel</option>
                                <option value="outro" ${receipt?.tipoReceita === 'outro' ? 'selected' : ''}>Outro</option>
                            </select>
                        </div>
                    </div>

                    <!-- Valor e Vencimento -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label for="valor_${formId}" class="block text-sm font-medium text-gray-700 mb-2">
                                Valor (R$) *
                            </label>
                            <input 
                                type="number" 
                                id="valor_${formId}" 
                                name="valor" 
                                value="${receipt?.valor || ''}"
                                step="0.01"
                                min="0"
                                required
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            >
                        </div>
                        <div>
                            <label for="vencimento_${formId}" class="block text-sm font-medium text-gray-700 mb-2">
                                Vencimento *
                            </label>
                            <input 
                                type="date" 
                                id="vencimento_${formId}" 
                                name="vencimento" 
                                value="${receipt?.vencimento || ''}"
                                required
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            >
                        </div>
                    </div>

                    <!-- Status e Data de Pagamento -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label for="status_${formId}" class="block text-sm font-medium text-gray-700 mb-2">
                                Status
                            </label>
                            <select 
                                id="status_${formId}" 
                                name="status"
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            >
                                <option value="Pendente" ${receipt?.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                                <option value="Pago" ${receipt?.status === 'Pago' ? 'selected' : ''}>Pago</option>
                                <option value="Cancelado" ${receipt?.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                            </select>
                        </div>
                        <div>
                            <label for="dataPagamento_${formId}" class="block text-sm font-medium text-gray-700 mb-2">
                                Data de Pagamento
                            </label>
                            <input 
                                type="date" 
                                id="dataPagamento_${formId}" 
                                name="dataPagamento" 
                                value="${receipt?.dataPagamento || ''}"
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            >
                        </div>
                    </div>

                    <!-- Forma de Pagamento -->
                    <div class="mb-4">
                        <label for="formaPagamento_${formId}" class="block text-sm font-medium text-gray-700 mb-2">
                            Forma de Pagamento
                        </label>
                        <input 
                            type="text" 
                            id="formaPagamento_${formId}" 
                            name="formaPagamento" 
                            value="${receipt?.formaPagamento || ''}"
                            placeholder="Ex: Pix, Boleto, Transferência"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                    </div>

                    <!-- Comprovante - AGORA OPCIONAL (BUG CORRIGIDO) -->
                    <div class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <label for="comprovante_${formId}" class="block text-sm font-medium text-gray-700 mb-2">
                            <i class="fas fa-file-upload mr-2 text-blue-600"></i>
                            Comprovante (arquivo) - OPCIONAL
                        </label>
                        <input 
                            type="file" 
                            id="comprovante_${formId}" 
                            name="comprovante"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                        <small class="block text-gray-500 mt-2">
                            💡 Você pode adicionar o comprovante depois, quando o pagamento for recebido.
                        </small>
                    </div>

                    <!-- Observações -->
                    <div class="mb-4">
                        <label for="observacoes_${formId}" class="block text-sm font-medium text-gray-700 mb-2">
                            Observações
                        </label>
                        <textarea 
                            id="observacoes_${formId}" 
                            name="observacoes" 
                            rows="3"
                            placeholder="Observações adicionais (opcional)"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >${receipt?.observacoes || ''}</textarea>
                    </div>
                </div>
            </form>
        `;
    }
};

// Registrar módulo globalmente
window.ContasReceberModule = ContasReceberModule;

console.log('✅ Patch de correção de contas a receber carregado');
