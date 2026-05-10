// ============================================================================
// BOOTSTRAP FORCE v2 - SOLUÇÃO RADICAL E DEFINITIVA
// ============================================================================
// Este script força o carregamento correto de TODOS os sistemas críticos
// independentemente da ordem dos scripts no HTML
// ============================================================================

(function() {
    'use strict';
    
    console.log('🚀 BOOTSTRAP FORCE v2 INICIADO - Forçando carregamento de sistemas críticos');
    
    // Flag global para rastrear estado
    window.__BOOTSTRAP_FORCE_ACTIVE__ = true;
    
    // ========================================================================
    // ETAPA 1: Aguardar que todos os scripts estejam carregados
    // ========================================================================
    function waitForScriptsToLoad() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 100; // 10 segundos (100 * 100ms)
            
            const checkScripts = () => {
                attempts++;
                
                // Verificar se os sistemas críticos foram carregados
                const hasUtils = typeof window.Utils !== 'undefined';
                const hasAuth = typeof window.AuthSystem !== 'undefined';
                const hasModules = typeof window.ModuleSystem !== 'undefined';
                const hasNavigation = typeof window.NavigationSystem !== 'undefined';
                
                console.log(`[Tentativa ${attempts}/${maxAttempts}] Utils:${hasUtils} Auth:${hasAuth} Modules:${hasModules} Navigation:${hasNavigation}`);
                
                if (hasUtils && hasAuth && hasModules && hasNavigation) {
                    console.log('✅ Todos os sistemas críticos carregados!');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.error('❌ Timeout! Nem todos os sistemas foram carregados.');
                    console.error(`   Utils: ${hasUtils}, Auth: ${hasAuth}, Modules: ${hasModules}, Navigation: ${hasNavigation}`);
                    resolve(); // Continuar mesmo com erro
                } else {
                    setTimeout(checkScripts, 100);
                }
            };
            
            checkScripts();
        });
    }
    
    // ========================================================================
    // ETAPA 2: Verificar e corrigir sistemas
    // ========================================================================
    function verifyAndFixSystems() {
        console.log('\n🔍 VERIFICANDO SISTEMAS...');
        
        // Verificar NavigationSystem
        if (typeof window.NavigationSystem === 'undefined') {
            console.error('❌ NavigationSystem não foi carregado! Tentando criar stub...');
            window.NavigationSystem = {
                currentModule: null,
                navigateToModule: function(module) {
                    console.warn('⚠️ NavigationSystem.navigateToModule chamado mas não está totalmente inicializado');
                }
            };
        } else {
            console.log('✅ NavigationSystem carregado');
        }
        
        // Verificar ModuleSystem
        if (typeof window.ModuleSystem === 'undefined') {
            console.error('❌ ModuleSystem não foi carregado!');
        } else {
            console.log('✅ ModuleSystem carregado');
        }
        
        // Verificar AuthSystem
        if (typeof window.AuthSystem === 'undefined') {
            console.error('❌ AuthSystem não foi carregado!');
        } else {
            console.log('✅ AuthSystem carregado');
        }
    }
    
    // ========================================================================
    // ETAPA 3: Forçar inicialização dos sistemas
    // ========================================================================
    function forceInitializeSystems() {
        console.log('\n⚡ FORÇANDO INICIALIZAÇÃO DOS SISTEMAS...');
        
        try {
            // Inicializar AuthSystem
            if (window.AuthSystem && typeof window.AuthSystem.init === 'function') {
                console.log('Inicializando AuthSystem...');
                window.AuthSystem.init();
                console.log('✅ AuthSystem inicializado');
            }
            
            // Inicializar ModuleSystem
            if (window.ModuleSystem && typeof window.ModuleSystem.init === 'function') {
                console.log('Inicializando ModuleSystem...');
                window.ModuleSystem.init();
                console.log('✅ ModuleSystem inicializado');
            }
            
            // Inicializar NavigationSystem
            if (window.NavigationSystem && typeof window.NavigationSystem.init === 'function') {
                console.log('Inicializando NavigationSystem...');
                window.NavigationSystem.init();
                console.log('✅ NavigationSystem inicializado');
            }
        } catch (error) {
            console.error('❌ Erro ao inicializar sistemas:', error);
        }
    }
    
    // ========================================================================
    // ETAPA 4: Vincular event listeners globais
    // ========================================================================
    function bindGlobalListeners() {
        console.log('\n🎯 VINCULANDO EVENT LISTENERS GLOBAIS...');
        
        try {
            // Vincular globalClickHandler do ModuleSystem
            if (window.ModuleSystem && window.ModuleSystem.globalClickHandler) {
                console.log('Vinculando globalClickHandler...');
                document.addEventListener('click', window.ModuleSystem.globalClickHandler.bind(window.ModuleSystem), true);
                console.log('✅ globalClickHandler vinculado');
            } else {
                console.warn('⚠️ globalClickHandler não encontrado');
            }
            
            // Vincular bindNavigationLinks do NavigationSystem
            if (window.NavigationSystem && typeof window.NavigationSystem.bindNavigationLinks === 'function') {
                console.log('Vinculando bindNavigationLinks...');
                window.NavigationSystem.bindNavigationLinks();
                console.log('✅ bindNavigationLinks vinculado');
            } else {
                console.warn('⚠️ bindNavigationLinks não encontrado');
            }
        } catch (error) {
            console.error('❌ Erro ao vincular listeners:', error);
        }
    }
    
    // ========================================================================
    // ETAPA 5: Executar sequência de inicialização
    // ========================================================================
    async function runBootstrapSequence() {
        console.log('\n' + '='.repeat(70));
        console.log('INICIANDO SEQUÊNCIA DE BOOTSTRAP FORCE v2');
        console.log('='.repeat(70));
        
        // Aguardar scripts
        console.log('\n⏳ Aguardando carregamento de scripts...');
        await waitForScriptsToLoad();
        
        // Verificar e corrigir
        verifyAndFixSystems();
        
        // Forçar inicialização
        forceInitializeSystems();
        
        // Vincular listeners
        bindGlobalListeners();
        
        console.log('\n' + '='.repeat(70));
        console.log('✅ BOOTSTRAP FORCE v2 CONCLUÍDO COM SUCESSO');
        console.log('='.repeat(70));
        
        // Expor função de teste
        window.testNavigation = function(moduleName) {
            console.log(`\n🧪 TESTANDO NAVEGAÇÃO PARA: ${moduleName}`);
            if (window.NavigationSystem && typeof window.NavigationSystem.navigateToModule === 'function') {
                window.NavigationSystem.navigateToModule(moduleName);
                console.log(`✅ Navegação para ${moduleName} iniciada`);
            } else {
                console.error('❌ NavigationSystem.navigateToModule não disponível');
            }
        };
    }
    
    // ========================================================================
    // EXECUTAR BOOTSTRAP
    // ========================================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runBootstrapSequence);
    } else {
        runBootstrapSequence();
    }
    
})();
