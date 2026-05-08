// Debug script para verificar estado do CRM após hard refresh
(function() {
    console.log('=== CRM DEBUG SCRIPT INICIADO ===');
    
    // Função para verificar estado a cada 2 segundos
    let checkCount = 0;
    const maxChecks = 15;
    
    function checkSystemState() {
        checkCount++;
        console.log(`\n📊 CHECK #${checkCount}/${maxChecks}`);
        
        // 1. Verificar se sistemas estão disponíveis
        console.log('1️⃣ Sistemas Disponíveis:');
        console.log('   - AuthSystem:', typeof window.AuthSystem !== 'undefined' ? '✅' : '❌');
        console.log('   - ModuleSystem:', typeof window.ModuleSystem !== 'undefined' ? '✅' : '❌');
        console.log('   - NavigationSystem:', typeof window.NavigationSystem !== 'undefined' ? '✅' : '❌');
        console.log('   - FormSystem:', typeof window.FormSystem !== 'undefined' ? '✅' : '❌');
        
        // 2. Verificar estado de inicialização
        if (window.ModuleSystem) {
            console.log('2️⃣ ModuleSystem Estado:');
            console.log('   - initialized:', window.ModuleSystem.initialized);
            console.log('   - eventsInitialized:', window.ModuleSystem.eventsInitialized);
            console.log('   - globalClickHandler:', typeof window.ModuleSystem.globalClickHandler);
        }
        
        if (window.NavigationSystem) {
            console.log('3️⃣ NavigationSystem Estado:');
            console.log('   - initialized:', window.NavigationSystem.initialized);
            console.log('   - currentModule:', window.NavigationSystem.currentModule);
            console.log('   - currentPage:', window.NavigationSystem.currentPage);
        }
        
        // 3. Verificar listeners
        console.log('4️⃣ Event Listeners:');
        const dashboardContent = document.getElementById('dashboardContent');
        const moduleContent = document.getElementById('moduleContent');
        console.log('   - dashboardContent existe:', dashboardContent ? '✅' : '❌');
        console.log('   - moduleContent existe:', moduleContent ? '✅' : '❌');
        
        // 4. Verificar cards de módulos
        const moduleCards = document.querySelectorAll('[data-module]');
        console.log(`5️⃣ Module Cards: ${moduleCards.length} encontrados`);
        moduleCards.forEach((card, i) => {
            console.log(`   - Card ${i + 1}: data-module="${card.getAttribute('data-module')}"`);
        });
        
        // 5. Verificar se o listener está ativo
        if (window.ModuleSystem && window.ModuleSystem.globalClickHandler) {
            console.log('6️⃣ Global Click Handler: ✅ ATIVO');
            
            // Testar o handler manualmente
            console.log('7️⃣ Testando handler manualmente...');
            const testCard = document.querySelector('[data-module="marketing"]');
            if (testCard) {
                console.log('   - Card de Marketing encontrado, disparando clique de teste...');
                const event = new MouseEvent('click', { bubbles: true, cancelable: true });
                testCard.dispatchEvent(event);
                console.log('   - Clique de teste disparado');
            }
        } else {
            console.log('6️⃣ Global Click Handler: ❌ NÃO ATIVO');
        }
        
        // Continuar verificando se ainda há sistemas não inicializados
        if (checkCount < maxChecks) {
            const allReady = 
                typeof window.ModuleSystem !== 'undefined' && 
                window.ModuleSystem.initialized &&
                window.ModuleSystem.eventsInitialized &&
                typeof window.NavigationSystem !== 'undefined' &&
                window.NavigationSystem.initialized;
            
            if (!allReady) {
                setTimeout(checkSystemState, 2000);
            } else {
                console.log('\n✅ TODOS OS SISTEMAS PRONTOS!');
            }
        }
    }
    
    // Iniciar verificação após 1 segundo
    setTimeout(checkSystemState, 1000);
    
    // Adicionar função global para testar clique manualmente
    window.testModuleClick = function(moduleName) {
        console.log(`🧪 Testando clique no módulo: ${moduleName}`);
        const card = document.querySelector(`[data-module="${moduleName}"]`);
        if (!card) {
            console.error(`❌ Card não encontrado para módulo: ${moduleName}`);
            return;
        }
        
        console.log('Disparando clique...');
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        card.dispatchEvent(event);
        console.log('Clique disparado');
    };
    
    console.log('📝 Use window.testModuleClick("marketing") para testar manualmente');
})();
