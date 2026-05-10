// ============================================================================
// FORCE CLICKS - Força aceitação de cliques em módulos
// ============================================================================
// Este script detecta cliques em módulos e força a navegação mesmo se
// o event listener global não estiver funcionando
// ============================================================================

(function() {
    'use strict';
    
    console.log('🖱️ FORCE CLICKS INICIADO - Forçando aceitação de cliques em módulos');
    
    // Aguardar que o DOM esteja pronto
    function initForceClicks() {
        // Procurar por todos os elementos com data-module
        const moduleCards = document.querySelectorAll('[data-module]:not([data-page])');
        
        console.log(`🔍 Encontrados ${moduleCards.length} cards de módulos`);
        
        moduleCards.forEach((card, index) => {
            const moduleName = card.getAttribute('data-module');
            
            // Remover listeners antigos para evitar duplicação
            const newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);
            
            // Adicionar novo listener
            newCard.addEventListener('click', function(e) {
                console.log(`🎯 CLIQUE FORÇADO DETECTADO: ${moduleName}`);
                e.preventDefault();
                e.stopPropagation();
                
                // Forçar navegação
                if (window.NavigationSystem && typeof window.NavigationSystem.navigateToModule === 'function') {
                    console.log(`✅ Navegando para: ${moduleName}`);
                    window.NavigationSystem.navigateToModule(moduleName);
                } else if (window.ModuleSystem && typeof window.ModuleSystem.showModule === 'function') {
                    console.log(`✅ Usando ModuleSystem.showModule: ${moduleName}`);
                    window.ModuleSystem.showModule(moduleName);
                } else {
                    console.error(`❌ Nenhum sistema de navegação disponível para: ${moduleName}`);
                }
            }, false);
            
            console.log(`✅ Listener adicionado ao módulo: ${moduleName}`);
        });
    }
    
    // Executar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initForceClicks);
    } else {
        initForceClicks();
    }
    
    // Também executar após um pequeno delay para garantir
    setTimeout(initForceClicks, 1000);
    
})();
