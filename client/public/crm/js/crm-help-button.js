/**
 * CRM Help Button — Botão flutuante de ajuda contextual
 * SAMS Locações CRM v5.32
 * 
 * Exibe um botão "?" no canto inferior direito (acima do badge "Made with Manus").
 * Ao clicar, abre um painel lateral com:
 *   - Dicas rápidas do módulo atual
 *   - Atalhos de navegação
 *   - Lembretes operacionais
 *   - Banco de salmos e inspirações
 */
(function () {
    'use strict';

    // ── Banco de conteúdo de ajuda ────────────────────────────────────────────
    const HELP_CONTENT = {
        // Dicas por módulo
        modules: {
            marketing: {
                icon: '📣',
                title: 'Marketing — Gestão de Leads',
                tips: [
                    'Cadastre leads captados em feiras imediatamente após o evento para não perder o timing.',
                    'Use o campo "Origem" para rastrear de qual feira ou campanha veio cada lead.',
                    'Leads com status "Qualificado" devem ser transferidos para o módulo Comercial como oportunidades.',
                    'Filtre leads por status para priorizar os que estão "Em contato" ou "Proposta enviada".',
                ],
            },
            comercial: {
                icon: '💼',
                title: 'Comercial — Vendas e Contratos',
                tips: [
                    'Sempre vincule o Briefing a um Cliente e Evento para gerar o projeto automaticamente.',
                    'Use o Pipeline para visualizar em qual etapa cada negociação se encontra.',
                    'Contratos aprovados devem ser enviados para o módulo Projetos para início da execução.',
                    'Registre todas as interações com o cliente no histórico do briefing.',
                ],
            },
            projetos: {
                icon: '🏗️',
                title: 'Projetos — Desenvolvimento',
                tips: [
                    'Crie um Memorial Descritivo para cada projeto aprovado antes de iniciar a montagem.',
                    'Use o botão "Duplicar Versão" para criar revisões sem perder o histórico.',
                    'Vincule o projeto ao evento correto para facilitar a busca no Acervo.',
                    'Projetos com status "Aprovado" podem ser encaminhados para o módulo Montagem.',
                ],
            },
            montagem: {
                icon: '🔧',
                title: 'Montagem — Execução e Checklist',
                tips: [
                    'Preencha o checklist de montagem em tempo real durante a execução do stand.',
                    'Registre fotos do stand montado diretamente na Ordem de Serviço.',
                    'Use o campo "Observações" para registrar imprevistos e soluções adotadas.',
                    'Conclua a OS somente após a aprovação do cliente no local.',
                ],
            },
            financeiro: {
                icon: '💰',
                title: 'Financeiro — Custos e Receitas',
                tips: [
                    'Registre todas as despesas com fornecedores nas Transações para controle de custo por evento.',
                    'Contas a Receber vencidas devem ser atualizadas diariamente para manter o fluxo de caixa.',
                    'Use os filtros de período para gerar relatórios mensais e comparar com meses anteriores.',
                    'Comissões são calculadas automaticamente ao marcar uma venda como "Concluída".',
                ],
            },
            administrativo: {
                icon: '📋',
                title: 'Administrativo — Tarefas',
                tips: [
                    'Atribua tarefas com prazo e prioridade para cada membro da equipe.',
                    'Tarefas com prioridade "Crítica" aparecem em destaque no Kanban.',
                    'Use o Kanban para ter uma visão geral de todas as tarefas em andamento.',
                    'Tarefas concluídas ficam no histórico e podem ser consultadas a qualquer momento.',
                ],
            },
            juridico: {
                icon: '⚖️',
                title: 'Jurídico — Demandas e Contratos',
                tips: [
                    'Registre demandas judiciais e extrajudiciais com todos os documentos anexados.',
                    'Configure alertas de prazo para não perder datas importantes.',
                    'Vincule cada demanda ao cliente e contrato correspondente.',
                    'Use o campo "Status" para acompanhar o andamento de cada processo.',
                ],
            },
            kanban: {
                icon: '📌',
                title: 'Kanban — Gestão de Tarefas',
                tips: [
                    'Arraste os cards entre as colunas para atualizar o status das tarefas.',
                    'Use a cor do card para identificar a prioridade: vermelho = crítica, laranja = alta.',
                    'Crie quadros separados por módulo ou equipe para melhor organização.',
                    'Cards com prazo vencido aparecem com borda vermelha.',
                ],
            },
            acervo: {
                icon: '🗂️',
                title: 'Acervo — Documentos Históricos',
                tips: [
                    'Organize documentos por feira e evento para facilitar consultas futuras.',
                    'Integração com Google Drive: vincule pastas do Drive a cada evento.',
                    'Use a busca para encontrar documentos por nome, data ou cliente.',
                    'Mantenha os projetos aprovados arquivados no Acervo para referência futura.',
                ],
            },
            administracao: {
                icon: '⚙️',
                title: 'Administração — Sistema',
                tips: [
                    'Gerencie usuários e permissões no submódulo "Usuários".',
                    'Configure as comissões padrão por tipo de venda em "Comissões".',
                    'Acompanhe os logs de acesso e alterações em "Logs do Sistema".',
                    'Use "Configurações" para personalizar parâmetros do sistema.',
                ],
            },
            dashboard: {
                icon: '🏠',
                title: 'Dashboard — Visão Geral',
                tips: [
                    'O Dashboard exibe um resumo das atividades do dia e da agenda.',
                    'Clique em qualquer módulo para acessá-lo diretamente.',
                    'A Agenda mostra os eventos e prazos dos próximos dias.',
                    'Use o botão "Atualizar" na Agenda para sincronizar com os dados mais recentes.',
                ],
            },
        },

        // Atalhos rápidos
        shortcuts: [
            { label: 'Novo Lead', icon: '📣', action: "try{NavigationSystem.navigateToModule('marketing');NavigationSystem.navigateToPage('marketing','leads');}catch{}" },
            { label: 'Novo Cliente', icon: '👤', action: "try{NavigationSystem.navigateToModule('comercial');NavigationSystem.navigateToPage('comercial','clientes');}catch{}" },
            { label: 'Novo Briefing', icon: '📝', action: "try{NavigationSystem.navigateToModule('comercial');NavigationSystem.navigateToPage('comercial','briefings');}catch{}" },
            { label: 'Minhas Tarefas', icon: '✅', action: "try{NavigationSystem.navigateToModule('administrativo');NavigationSystem.navigateToPage('administrativo','tarefas');}catch{}" },
            { label: 'Kanban', icon: '📌', action: "try{NavigationSystem.navigateToModule('kanban');NavigationSystem.navigateToPage('kanban','board');}catch{}" },
            { label: 'Financeiro', icon: '💰', action: "try{NavigationSystem.navigateToModule('financeiro');}catch{}" },
        ],

        // Lembretes operacionais
        lembretes: [
            '📌 Verifique as Contas a Receber vencidas hoje.',
            '📌 Confira se há Briefings aguardando aprovação.',
            '📌 Atualize o checklist de montagem dos projetos em andamento.',
            '📌 Registre os leads captados na última feira.',
            '📌 Revise os projetos com prazo próximo e comunique a equipe.',
            '📌 Envie o relatório financeiro semanal para a gerência.',
        ],

        // Salmos e inspirações
        mensagens: [
            { tipo: 'salmo', texto: '"O Senhor é meu pastor; nada me faltará." — Salmo 23:1' },
            { tipo: 'salmo', texto: '"Entrega o teu caminho ao Senhor; confia nele, e ele agirá." — Salmo 37:5' },
            { tipo: 'salmo', texto: '"Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia." — Salmo 46:1' },
            { tipo: 'salmo', texto: '"Este é o dia que o Senhor fez; regozijemo-nos e alegremo-nos nele." — Salmo 118:24' },
            { tipo: 'salmo', texto: '"Confia no Senhor de todo o teu coração e não te apoies no teu próprio entendimento." — Provérbios 3:5' },
            { tipo: 'inspiracao', texto: '"Um cliente satisfeito é a melhor estratégia de negócios de todas." — Michael LeBoeuf' },
            { tipo: 'inspiracao', texto: '"A qualidade nunca é um acidente; é sempre o resultado de um esforço inteligente." — John Ruskin' },
            { tipo: 'inspiracao', texto: '"Excelência não é uma habilidade, é uma atitude." — Ralph Marston' },
            { tipo: 'inspiracao', texto: '"O sucesso é a soma de pequenos esforços repetidos dia após dia." — Robert Collier' },
        ],
    };

    // ── Estado ────────────────────────────────────────────────────────────────
    let _panelOpen = false;
    let _currentTab = 'dicas';
    let _btn = null;
    let _panel = null;

    // ── Detectar módulo atual ─────────────────────────────────────────────────
    function getCurrentModule() {
        try {
            if (window.NavigationSystem && window.NavigationSystem.currentModule) {
                return window.NavigationSystem.currentModule;
            }
        } catch {}
        return 'dashboard';
    }

    // ── Criar o botão flutuante ───────────────────────────────────────────────
    function createButton() {
        if (document.getElementById('crm-help-fab')) return;
        _btn = document.createElement('button');
        _btn.id = 'crm-help-fab';
        _btn.type = 'button';
        _btn.title = 'Ajuda e dicas do sistema';
        _btn.setAttribute('aria-label', 'Abrir painel de ajuda');
        _btn.innerHTML = '?';
        _btn.style.cssText = [
            'position:fixed',
            'bottom:60px',
            'right:16px',
            'z-index:9990',
            'width:40px',
            'height:40px',
            'border-radius:50%',
            'background:linear-gradient(135deg,#1e3a5f,#2563eb)',
            'color:white',
            'border:none',
            'font-size:18px',
            'font-weight:700',
            'cursor:pointer',
            'box-shadow:0 4px 12px rgba(37,99,235,0.4)',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'transition:transform 0.2s,box-shadow 0.2s',
            'line-height:1',
        ].join(';');
        _btn.addEventListener('mouseenter', () => {
            _btn.style.transform = 'scale(1.1)';
            _btn.style.boxShadow = '0 6px 20px rgba(37,99,235,0.5)';
        });
        _btn.addEventListener('mouseleave', () => {
            _btn.style.transform = 'scale(1)';
            _btn.style.boxShadow = '0 4px 12px rgba(37,99,235,0.4)';
        });
        _btn.addEventListener('click', togglePanel);
        document.body.appendChild(_btn);
    }

    // ── Criar o painel lateral ────────────────────────────────────────────────
    function createPanel() {
        if (document.getElementById('crm-help-panel')) return;
        _panel = document.createElement('div');
        _panel.id = 'crm-help-panel';
        _panel.style.cssText = [
            'position:fixed',
            'bottom:110px',
            'right:16px',
            'z-index:9989',
            'width:340px',
            'max-height:520px',
            'background:white',
            'border-radius:16px',
            'box-shadow:0 8px 32px rgba(0,0,0,0.18)',
            'overflow:hidden',
            'display:flex',
            'flex-direction:column',
            'font-family:inherit',
            'transform:scale(0.95) translateY(10px)',
            'opacity:0',
            'transition:transform 0.2s,opacity 0.2s',
            'pointer-events:none',
        ].join(';');
        document.body.appendChild(_panel);
        renderPanel();
    }

    // ── Renderizar conteúdo do painel ─────────────────────────────────────────
    function renderPanel() {
        if (!_panel) return;
        const mod = getCurrentModule();
        const modHelp = HELP_CONTENT.modules[mod] || HELP_CONTENT.modules['dashboard'];
        const msgIdx = Math.floor(Date.now() / 60000) % HELP_CONTENT.mensagens.length;
        const msg = HELP_CONTENT.mensagens[msgIdx];
        const lembreteIdx = Math.floor(Date.now() / 120000) % HELP_CONTENT.lembretes.length;
        const lembrete = HELP_CONTENT.lembretes[lembreteIdx];

        const tabs = [
            { id: 'dicas', label: 'Dicas', icon: '💡' },
            { id: 'atalhos', label: 'Atalhos', icon: '⚡' },
            { id: 'lembrete', label: 'Lembretes', icon: '📌' },
            { id: 'salmo', label: 'Inspiração', icon: '✝️' },
        ];

        _panel.innerHTML = `
            <!-- Cabeçalho -->
            <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:14px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
                <div style="display:flex;align-items:center;gap:8px;color:white">
                    <span style="font-size:18px">${modHelp.icon}</span>
                    <div>
                        <div style="font-size:13px;font-weight:700">Central de Ajuda</div>
                        <div style="font-size:11px;opacity:0.8">${modHelp.title}</div>
                    </div>
                </div>
                <button type="button" id="crm-help-close" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center">✕</button>
            </div>

            <!-- Abas -->
            <div style="display:flex;border-bottom:1px solid #e5e7eb;flex-shrink:0;background:#f9fafb">
                ${tabs.map(t => `
                    <button type="button" data-tab="${t.id}" style="flex:1;padding:8px 4px;font-size:11px;border:none;cursor:pointer;background:${_currentTab === t.id ? 'white' : 'transparent'};color:${_currentTab === t.id ? '#2563eb' : '#6b7280'};font-weight:${_currentTab === t.id ? '600' : '400'};border-bottom:${_currentTab === t.id ? '2px solid #2563eb' : '2px solid transparent'};transition:all 0.15s">
                        <div>${t.icon}</div>
                        <div>${t.label}</div>
                    </button>
                `).join('')}
            </div>

            <!-- Conteúdo -->
            <div id="crm-help-content" style="overflow-y:auto;flex:1;padding:14px 16px">
                ${renderTabContent(_currentTab, modHelp, msg, lembrete)}
            </div>

            <!-- Rodapé -->
            <div style="padding:10px 16px;border-top:1px solid #f3f4f6;background:#f9fafb;flex-shrink:0;font-size:11px;color:#9ca3af;text-align:center">
                SAMS Locações CRM • Pressione <kbd style="background:#e5e7eb;padding:1px 5px;border-radius:3px;font-size:10px">?</kbd> para abrir/fechar
            </div>
        `;

        // Bind eventos
        _panel.querySelector('#crm-help-close')?.addEventListener('click', closePanel);
        _panel.querySelectorAll('[data-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                _currentTab = btn.getAttribute('data-tab');
                renderPanel();
            });
        });
        _panel.querySelectorAll('[data-shortcut-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                try { eval(btn.getAttribute('data-shortcut-action')); } catch {}
                closePanel();
            });
        });
    }

    function renderTabContent(tab, modHelp, msg, lembrete) {
        if (tab === 'dicas') {
            return `
                <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:10px;display:flex;align-items:center;gap:6px">
                    <span>💡</span> Dicas para este módulo
                </div>
                <div style="display:flex;flex-direction:column;gap:8px">
                    ${modHelp.tips.map((tip, i) => `
                        <div style="background:#f0f9ff;border-left:3px solid #2563eb;border-radius:6px;padding:10px 12px;font-size:13px;color:#1e3a5f;line-height:1.5">
                            <span style="font-size:11px;font-weight:600;color:#2563eb;display:block;margin-bottom:3px">Dica ${i + 1}</span>
                            ${escHtml(tip)}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        if (tab === 'atalhos') {
            return `
                <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:10px;display:flex;align-items:center;gap:6px">
                    <span>⚡</span> Atalhos rápidos
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                    ${HELP_CONTENT.shortcuts.map(s => `
                        <button type="button" data-shortcut-action="${escHtml(s.action)}"
                                style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:10px 8px;cursor:pointer;text-align:center;transition:background 0.15s;font-size:12px;color:#374151">
                            <div style="font-size:20px;margin-bottom:4px">${s.icon}</div>
                            <div style="font-weight:500">${escHtml(s.label)}</div>
                        </button>
                    `).join('')}
                </div>
            `;
        }
        if (tab === 'lembrete') {
            return `
                <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:10px;display:flex;align-items:center;gap:6px">
                    <span>📌</span> Lembretes operacionais
                </div>
                <div style="display:flex;flex-direction:column;gap:8px">
                    ${HELP_CONTENT.lembretes.map((l, i) => `
                        <div style="background:${i === HELP_CONTENT.lembretes.indexOf(lembrete) ? '#fff7ed' : '#f9fafb'};border:1px solid ${i === HELP_CONTENT.lembretes.indexOf(lembrete) ? '#fed7aa' : '#e5e7eb'};border-radius:8px;padding:10px 12px;font-size:13px;color:#374151;line-height:1.5">
                            ${escHtml(l)}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        if (tab === 'salmo') {
            return `
                <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:10px;display:flex;align-items:center;gap:6px">
                    <span>✝️</span> Inspiração do momento
                </div>
                <div style="background:linear-gradient(135deg,#f5f3ff,#ede9fe);border-radius:12px;padding:20px;text-align:center;margin-bottom:12px">
                    <div style="font-size:28px;margin-bottom:12px">${msg.tipo === 'salmo' ? '✝️' : '⭐'}</div>
                    <div style="font-size:14px;color:#4c1d95;font-style:italic;line-height:1.6;font-weight:500">${escHtml(msg.texto)}</div>
                </div>
                <div style="display:flex;flex-direction:column;gap:8px">
                    ${HELP_CONTENT.mensagens.filter(m => m.tipo === 'salmo').slice(0, 3).map(m => `
                        <div style="background:#f5f3ff;border-left:3px solid #7c3aed;border-radius:6px;padding:10px 12px;font-size:12px;color:#4c1d95;font-style:italic;line-height:1.5">
                            ${escHtml(m.texto)}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        return '';
    }

    function escHtml(v) {
        return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ── Controles do painel ───────────────────────────────────────────────────
    function openPanel() {
        if (!_panel) createPanel();
        _panelOpen = true;
        renderPanel();
        _panel.style.pointerEvents = 'auto';
        requestAnimationFrame(() => {
            _panel.style.transform = 'scale(1) translateY(0)';
            _panel.style.opacity = '1';
        });
        if (_btn) _btn.style.background = 'linear-gradient(135deg,#2563eb,#1d4ed8)';
    }

    function closePanel() {
        if (!_panel) return;
        _panelOpen = false;
        _panel.style.transform = 'scale(0.95) translateY(10px)';
        _panel.style.opacity = '0';
        _panel.style.pointerEvents = 'none';
        if (_btn) _btn.style.background = 'linear-gradient(135deg,#1e3a5f,#2563eb)';
    }

    function togglePanel() {
        if (_panelOpen) closePanel();
        else openPanel();
    }

    // ── Atalho de teclado: tecla ? ────────────────────────────────────────────
    document.addEventListener('keydown', (e) => {
        if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
            const tag = (document.activeElement?.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
            togglePanel();
        }
        if (e.key === 'Escape' && _panelOpen) closePanel();
    });

    // ── Fechar ao clicar fora ─────────────────────────────────────────────────
    document.addEventListener('click', (e) => {
        if (!_panelOpen) return;
        if (_panel && _panel.contains(e.target)) return;
        if (_btn && _btn.contains(e.target)) return;
        closePanel();
    });

    // ── Atualizar dicas ao mudar de módulo ────────────────────────────────────
    let _lastModule = '';
    setInterval(() => {
        const mod = getCurrentModule();
        if (mod !== _lastModule) {
            _lastModule = mod;
            if (_panelOpen) renderPanel();
        }
    }, 500);

    // ── Inicializar ───────────────────────────────────────────────────────────
    function init() {
        // Só mostrar quando o usuário estiver logado (mainApp visível)
        const mainApp = document.getElementById('mainApp');
        if (!mainApp || mainApp.classList.contains('hidden') || mainApp.style.display === 'none') {
            setTimeout(init, 500);
            return;
        }
        createButton();
        createPanel();
        console.log('✅ [CRM Help Button] Inicializado');
    }

    // Aguardar o DOM estar pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1000));
    } else {
        setTimeout(init, 1000);
    }

    // Observar quando o mainApp se torna visível (após login)
    const observer = new MutationObserver(() => {
        const mainApp = document.getElementById('mainApp');
        if (mainApp && !mainApp.classList.contains('hidden') && mainApp.style.display !== 'none') {
            if (!document.getElementById('crm-help-fab')) {
                createButton();
                createPanel();
            }
        }
    });
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class', 'style'] });

    // Expor para uso externo
    window.CRMHelpButton = { open: openPanel, close: closePanel, toggle: togglePanel };
})();
