// Bootstrap Force - Força inicialização completa do CRM após hard refresh
(function() {
    'use strict';
    
    console.log('🚀 BOOTSTRAP FORCE INICIADO');
    
    // Função para verificar e forçar inicialização
    function forceBootstrap() {
        console.log('🔧 Executando bootstrap forçado...');
        
        // 1. Verificar se os sistemas existem
        if (!window.ModuleSystem) {
            console.error('❌ ModuleSystem não disponível');
            return;
        }
        
        if (!window.NavigationSystem) {
            console.error('❌ NavigationSystem não disponível');
            return;
        }
        
        // 2. Forçar reinicialização mesmo se já foi inicializado
        console.log('2️⃣ Forçando reinicialização dos sistemas...');
        
        // Reset flags de inicialização
        window.ModuleSystem.initialized = false;
        window.ModuleSystem.eventsInitialized = false;
        
        if (window.NavigationSystem) {
            window.NavigationSystem.initialized = false;
        }
        
        // 3. Reinicializar ModuleSystem
        try {
            console.log('3️⃣ Reinicializando ModuleSystem...');
            window.ModuleSystem.init();
            console.log('✅ ModuleSystem reinicializado');
        } catch (e) {
            console.error('❌ Erro ao reinicializar ModuleSystem:', e);
        }
        
        // 4. Reinicializar NavigationSystem
        try {
            console.log('4️⃣ Reinicializando NavigationSystem...');
            if (window.NavigationSystem.init) {
                window.NavigationSystem.init();
            }
            console.log('✅ NavigationSystem reinicializado');
        } catch (e) {
            console.error('❌ Erro ao reinicializar NavigationSystem:', e);
        }
        
        // 5. Verificar se listeners estão ativos
        console.log('5️⃣ Verificando listeners...');
        if (window.ModuleSystem.globalClickHandler) {
            console.log('✅ Global Click Handler está ativo');
        } else {
            console.error('❌ Global Click Handler não está ativo');
        }
        
        // 6. Adicionar listeners de fallback para cards de módulos
        console.log('6️⃣ Adicionando listeners de fallback para cards...');
        const moduleCards = document.querySelectorAll('[data-module]');
        let fallbackCount = 0;
        
        moduleCards.forEach((card) => {
            const moduleName = card.getAttribute('data-module');
            
            // Verificar se já tem listener
            if (card.hasAttribute('data-listener-bound')) {
                return;
            }
            
            // Adicionar listener de fallback
            card.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log(`🎯 [FALLBACK] Clique detectado no módulo: ${moduleName}`);
                
                if (window.NavigationSystem && typeof window.NavigationSystem.navigateToModule === 'function') {
                    window.NavigationSystem.navigateToModule(moduleName);
                } else {
                    console.error('NavigationSystem não disponível');
                }
            });
            
            card.setAttribute('data-listener-bound', 'true');
            fallbackCount++;
        });
        
        console.log(`✅ ${fallbackCount} listeners de fallback adicionados`);
        
        // 7. Adicionar listeners de fallback para elementos de navegação
        console.log('7️⃣ Adicionando listeners de fallback para navegação...');
        const navElements = document.querySelectorAll('[data-nav-page], [data-nav-module]');
        let navFallbackCount = 0;
        
        navElements.forEach((el) => {
            if (el.hasAttribute('data-nav-listener-bound')) {
                return;
            }
            
            el.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const page = el.getAttribute('data-nav-page');
                const module = el.getAttribute('data-nav-module') || (window.NavigationSystem ? window.NavigationSystem.currentModule : null);
                
                if (page && module && window.NavigationSystem) {
                    console.log(`🎯 [FALLBACK] Navegando para: ${module}/${page}`);
                    window.NavigationSystem.navigateToPage(module, page);
                } else if (module && !page && window.NavigationSystem) {
                    console.log(`🎯 [FALLBACK] Navegando para módulo: ${module}`);
                    window.NavigationSystem.navigateToModule(module);
                }
            });
            
            el.setAttribute('data-nav-listener-bound', 'true');
            navFallbackCount++;
        });
        
        console.log(`✅ ${navFallbackCount} listeners de navegação adicionados`);
        
        // 8. Marcar bootstrap como completo
        window.__bootstrapForceComplete = true;
        console.log('✅ BOOTSTRAP FORCE COMPLETO');
    }
    
    // Executar bootstrap após 1 segundo (garantir que scripts foram carregados)
    setTimeout(forceBootstrap, 1000);
    
    // Executar novamente a cada 5 segundos se ainda não estiver completo
    let retryCount = 0;
    const retryInterval = setInterval(() => {
        retryCount++;
        if (!window.__bootstrapForceComplete && retryCount < 5) {
            console.log(`🔄 Tentativa ${retryCount} de bootstrap forçado...`);
            forceBootstrap();
        } else {
            clearInterval(retryInterval);
        }
    }, 5000);
    
    // Expor função globalmente para teste manual
    window.forceBootstrapNow = forceBootstrap;
    console.log('📝 Use window.forceBootstrapNow() para forçar bootstrap manualmente');
})();
