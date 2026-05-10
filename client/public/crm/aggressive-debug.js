// Aggressive Debug - Força navegação e mostra erros detalhados
(function() {
    'use strict';
    
    console.log('🔥 AGGRESSIVE DEBUG INICIADO');
    
    // Função para testar navegação
    window.testNavigation = function(moduleName) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🧪 TESTE DE NAVEGAÇÃO: ${moduleName}`);
        console.log('='.repeat(60));
        
        try {
            // 1. Verificar se NavigationSystem existe
            console.log('1️⃣ Verificando NavigationSystem...');
            if (!window.NavigationSystem) {
                console.error('❌ NavigationSystem não existe!');
                return;
            }
            console.log('✅ NavigationSystem existe');
            
            // 2. Verificar se navigateToModule existe
            console.log('2️⃣ Verificando navigateToModule...');
            if (typeof window.NavigationSystem.navigateToModule !== 'function') {
                console.error('❌ navigateToModule não é uma função!');
                return;
            }
            console.log('✅ navigateToModule é uma função');
            
            // 3. Verificar AuthSystem
            console.log('3️⃣ Verificando AuthSystem...');
            if (!window.AuthSystem) {
                console.error('❌ AuthSystem não existe!');
                return;
            }
            console.log('✅ AuthSystem existe');
            
            // 4. Verificar usuário atual
            console.log('4️⃣ Verificando usuário atual...');
            const currentUser = window.AuthSystem.currentUser;
            if (!currentUser) {
                console.error('❌ Usuário não autenticado!');
                return;
            }
            console.log('✅ Usuário autenticado:', currentUser.email, 'Role:', currentUser.role);
            
            // 5. Verificar acesso ao módulo
            console.log(`5️⃣ Verificando acesso ao módulo ${moduleName}...`);
            const hasAccess = window.AuthSystem.hasModuleAccess(moduleName);
            console.log(`   - hasModuleAccess('${moduleName}'):`, hasAccess);
            if (!hasAccess) {
                console.error(`❌ Sem acesso ao módulo ${moduleName}`);
                return;
            }
            console.log(`✅ Acesso permitido ao módulo ${moduleName}`);
            
            // 6. Verificar elementos DOM
            console.log('6️⃣ Verificando elementos DOM...');
            const dashboardContent = document.getElementById('dashboardContent');
            const moduleContent = document.getElementById('moduleContent');
            console.log('   - dashboardContent:', dashboardContent ? '✅ Existe' : '❌ Não existe');
            console.log('   - moduleContent:', moduleContent ? '✅ Existe' : '❌ Não existe');
            
            if (!dashboardContent || !moduleContent) {
                console.error('❌ Elementos DOM não encontrados!');
                return;
            }
            
            // 7. Chamar navigateToModule
            console.log(`7️⃣ Chamando navigateToModule('${moduleName}')...`);
            window.NavigationSystem.navigateToModule(moduleName);
            console.log('✅ navigateToModule chamado');
            
            // 8. Verificar estado após navegação
            setTimeout(() => {
                console.log('8️⃣ Verificando estado após navegação...');
                console.log('   - currentModule:', window.NavigationSystem.currentModule);
                console.log('   - dashboardContent.classList.contains("hidden"):', dashboardContent.classList.contains('hidden'));
                console.log('   - moduleContent.classList.contains("hidden"):', moduleContent.classList.contains('hidden'));
                console.log('   - moduleContent.innerHTML.length:', moduleContent.innerHTML.length);
                
                if (moduleContent.innerHTML.length === 0) {
                    console.error('❌ moduleContent está vazio!');
                } else {
                    console.log('✅ moduleContent tem conteúdo');
                }
                
                // 9. Verificar cards de páginas
                console.log('9️⃣ Verificando cards de páginas...');
                const pageCards = document.querySelectorAll('.page-card');
                console.log(`   - Encontrados ${pageCards.length} page-cards`);
                pageCards.forEach((card, i) => {
                    console.log(`   - Card ${i + 1}: data-page="${card.getAttribute('data-page')}" data-module="${card.getAttribute('data-module')}"`);
                });
                
                // 10. Verificar listeners
                console.log('🔟 Verificando listeners...');
                if (window.ModuleSystem && window.ModuleSystem.globalClickHandler) {
                    console.log('   - globalClickHandler: ✅ Ativo');
                } else {
                    console.log('   - globalClickHandler: ❌ Não ativo');
                }
                
                console.log(`\n✅ TESTE COMPLETO PARA ${moduleName}`);
                console.log('='.repeat(60));
            }, 500);
            
        } catch (error) {
            console.error('❌ ERRO DURANTE TESTE:', error);
            console.error('Stack:', error.stack);
        }
    };
    
    // Expor função global
    console.log('📝 Use window.testNavigation("marketing") para testar navegação');
    console.log('📝 Use window.testNavigation("comercial") para testar navegação');
    console.log('📝 Use window.testNavigation("projetos") para testar navegação');
})();
