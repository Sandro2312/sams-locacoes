/**
 * crm-veruska.js — Assistente virtual Veruska para o CRM da SAMS Locações
 * Substitui o crm-help-button.js
 * - Avatar flutuante com rosto ilustrado (mascote)
 * - Janela de chat com abas: Conversar (IA) e Dicas (conteúdo estático)
 * - Saudação automática uma vez por sessão/dia
 * - Integração com /api/crm/assistente/perguntar
 */
(function () {
    'use strict';

    // ── HELP_CONTENT migrado do crm-help-button.js ────────────────────────────
    const HELP_CONTENT = {
        modules: {
            marketing: {
                icon: '📣',
                title: 'Marketing — Leads e Prospecção',
                tips: [
                    'Cadastre novos leads com o máximo de informações possível para facilitar a qualificação.',
                    'Use o Pipeline para acompanhar o status de cada negociação em andamento.',
                    'Registre todas as interações com o lead para manter o histórico completo.',
                    'Leads qualificados devem ser convertidos em Clientes no módulo Comercial.',
                ],
            },
            comercial: {
                icon: '💼',
                title: 'Comercial — Clientes e Briefings',
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
        shortcuts: [
            { label: 'Novo Lead', icon: '📣', action: "try{NavigationSystem.navigateToModule('marketing');NavigationSystem.navigateToPage('marketing','leads');}catch{}" },
            { label: 'Novo Cliente', icon: '👤', action: "try{NavigationSystem.navigateToModule('comercial');NavigationSystem.navigateToPage('comercial','clientes');}catch{}" },
            { label: 'Novo Briefing', icon: '📝', action: "try{NavigationSystem.navigateToModule('comercial');NavigationSystem.navigateToPage('comercial','briefings');}catch{}" },
            { label: 'Minhas Tarefas', icon: '✅', action: "try{NavigationSystem.navigateToModule('administrativo');NavigationSystem.navigateToPage('administrativo','tarefas');}catch{}" },
            { label: 'Kanban', icon: '📌', action: "try{NavigationSystem.navigateToModule('kanban');NavigationSystem.navigateToPage('kanban','board');}catch{}" },
            { label: 'Financeiro', icon: '💰', action: "try{NavigationSystem.navigateToModule('financeiro');}catch{}" },
        ],
        lembretes: [
            '📌 Verifique as Contas a Receber vencidas hoje.',
            '📌 Confira se há Briefings aguardando aprovação.',
            '📌 Atualize o checklist de montagem dos projetos em andamento.',
            '📌 Registre os leads captados na última feira.',
            '📌 Revise os projetos com prazo próximo e comunique a equipe.',
            '📌 Envie o relatório financeiro semanal para a gerência.',
        ],
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
    let _open = false;
    let _tab = 'conversar'; // 'conversar' | 'dicas'
    let _chatHistory = []; // { role: 'user'|'assistant', content: string }
    let _thinking = false;
    let _avatar = null;
    let _panel = null;
    let _balloon = null;

    // ── Detectar módulo atual ─────────────────────────────────────────────────
    function getCurrentModule() {
        try {
            if (window.NavigationSystem && window.NavigationSystem.currentModule) {
                return window.NavigationSystem.currentModule;
            }
        } catch {}
        return 'dashboard';
    }

    // ── SVG do rosto da Veruska ───────────────────────────────────────────────
    function veruskaFaceSVG(size) {
        return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <!-- Cabelo -->
            <ellipse cx="32" cy="18" rx="22" ry="14" fill="#1a1a2e"/>
            <ellipse cx="14" cy="30" rx="5" ry="12" fill="#1a1a2e"/>
            <ellipse cx="50" cy="30" rx="5" ry="12" fill="#1a1a2e"/>
            <!-- Rosto -->
            <ellipse cx="32" cy="36" rx="18" ry="20" fill="#fdd9b5"/>
            <!-- Bochechas -->
            <ellipse cx="20" cy="42" rx="5" ry="3" fill="#f4a0a0" opacity="0.5"/>
            <ellipse cx="44" cy="42" rx="5" ry="3" fill="#f4a0a0" opacity="0.5"/>
            <!-- Olhos -->
            <ellipse cx="24" cy="36" rx="3" ry="3.5" fill="white"/>
            <ellipse cx="40" cy="36" rx="3" ry="3.5" fill="white"/>
            <circle cx="24.5" cy="36.5" r="2" fill="#1a1a2e"/>
            <circle cx="40.5" cy="36.5" r="2" fill="#1a1a2e"/>
            <circle cx="25.2" cy="35.8" r="0.7" fill="white"/>
            <circle cx="41.2" cy="35.8" r="0.7" fill="white"/>
            <!-- Sobrancelhas -->
            <path d="M21 32 Q24 30 27 32" stroke="#1a1a2e" stroke-width="1.5" stroke-linecap="round" fill="none"/>
            <path d="M37 32 Q40 30 43 32" stroke="#1a1a2e" stroke-width="1.5" stroke-linecap="round" fill="none"/>
            <!-- Nariz -->
            <ellipse cx="32" cy="41" rx="2" ry="1.5" fill="#e8a87c"/>
            <!-- Sorriso -->
            <path d="M26 46 Q32 51 38 46" stroke="#c0392b" stroke-width="2" stroke-linecap="round" fill="none"/>
            <!-- Dentes -->
            <path d="M27 46.5 Q32 50 37 46.5" stroke="white" stroke-width="1.5" stroke-linecap="round" fill="none"/>
            <!-- Cabelo franja -->
            <path d="M12 22 Q18 14 32 12 Q46 14 52 22" stroke="#1a1a2e" stroke-width="8" stroke-linecap="round" fill="none"/>
            <!-- Brinco -->
            <circle cx="14" cy="38" r="2.5" fill="#f59e0b"/>
            <circle cx="50" cy="38" r="2.5" fill="#f59e0b"/>
        </svg>`;
    }

    // ── Criar avatar flutuante ────────────────────────────────────────────────
    function createAvatar() {
        if (document.getElementById('veruska-avatar')) return;
        _avatar = document.createElement('button');
        _avatar.id = 'veruska-avatar';
        _avatar.type = 'button';
        _avatar.title = 'Veruska — Assistente SAMS';
        _avatar.setAttribute('aria-label', 'Abrir assistente Veruska');
        _avatar.innerHTML = veruskaFaceSVG(44);
        _avatar.style.cssText = [
            'position:fixed',
            'bottom:16px',
            'right:16px',
            'z-index:9990',
            'width:56px',
            'height:56px',
            'border-radius:50%',
            'background:linear-gradient(135deg,#1e3a5f,#2563eb)',
            'border:3px solid white',
            'box-shadow:0 4px 16px rgba(37,99,235,0.45)',
            'cursor:pointer',
            'padding:4px',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'transition:transform 0.2s,box-shadow 0.2s',
            'outline:none',
        ].join(';');
        _avatar.addEventListener('mouseenter', function() {
            _avatar.style.transform = 'scale(1.1)';
            _avatar.style.boxShadow = '0 6px 24px rgba(37,99,235,0.6)';
        });
        _avatar.addEventListener('mouseleave', function() {
            _avatar.style.transform = 'scale(1)';
            _avatar.style.boxShadow = '0 4px 16px rgba(37,99,235,0.45)';
        });
        _avatar.addEventListener('click', togglePanel);
        document.body.appendChild(_avatar);
    }

    // ── Balão de saudação automático ──────────────────────────────────────────
    function showGreetingBalloon() {
        var key = 'veruska_greeted_' + new Date().toDateString();
        if (sessionStorage.getItem(key) || localStorage.getItem(key)) return;
        sessionStorage.setItem(key, '1');
        localStorage.setItem(key, '1');

        _balloon = document.createElement('div');
        _balloon.id = 'veruska-balloon';
        _balloon.style.cssText = [
            'position:fixed',
            'bottom:82px',
            'right:16px',
            'z-index:9989',
            'background:white',
            'border:1px solid #e5e7eb',
            'border-radius:12px 12px 4px 12px',
            'box-shadow:0 4px 16px rgba(0,0,0,0.12)',
            'padding:10px 14px',
            'font-size:13px',
            'color:#1e3a5f',
            'max-width:220px',
            'line-height:1.4',
            'cursor:pointer',
            'animation:veruska-pop 0.3s ease',
        ].join(';');
        _balloon.innerHTML = '<strong>Oi, sou a Veruska!</strong><br>Precisa de ajuda com alguma coisa? 😊';
        _balloon.addEventListener('click', function() {
            hideBalloon();
            openPanel('conversar');
        });
        document.body.appendChild(_balloon);

        // Injetar animação CSS se ainda não existir
        if (!document.getElementById('veruska-style')) {
            var style = document.createElement('style');
            style.id = 'veruska-style';
            style.textContent = '@keyframes veruska-pop{from{opacity:0;transform:scale(0.8) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}';
            document.head.appendChild(style);
        }

        // Sumir após 6 segundos
        setTimeout(hideBalloon, 6000);
    }

    function hideBalloon() {
        if (_balloon && _balloon.parentNode) {
            _balloon.style.opacity = '0';
            _balloon.style.transition = 'opacity 0.3s';
            setTimeout(function() {
                if (_balloon && _balloon.parentNode) _balloon.parentNode.removeChild(_balloon);
                _balloon = null;
            }, 300);
        }
    }

    // ── Criar/renderizar o painel ─────────────────────────────────────────────
    function createPanel() {
        if (document.getElementById('veruska-panel')) {
            _panel = document.getElementById('veruska-panel');
            return;
        }
        _panel = document.createElement('div');
        _panel.id = 'veruska-panel';
        _panel.style.cssText = [
            'position:fixed',
            'bottom:82px',
            'right:16px',
            'z-index:9989',
            'width:340px',
            'max-width:calc(100vw - 32px)',
            'max-height:560px',
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
            'border:1px solid #e5e7eb',
        ].join(';');
        document.body.appendChild(_panel);
        renderPanel();
    }

    function renderPanel() {
        if (!_panel) return;
        var mod = getCurrentModule();
        var modHelp = HELP_CONTENT.modules[mod] || HELP_CONTENT.modules['dashboard'];
        var msgIdx = Math.floor(Date.now() / 60000) % HELP_CONTENT.mensagens.length;
        var msg = HELP_CONTENT.mensagens[msgIdx];
        var lembreteIdx = Math.floor(Date.now() / 120000) % HELP_CONTENT.lembretes.length;
        var lembrete = HELP_CONTENT.lembretes[lembreteIdx];

        _panel.innerHTML =
            // Cabeçalho
            '<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:12px 14px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">' +
                '<div style="display:flex;align-items:center;gap:10px;color:white">' +
                    '<div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0">' +
                        veruskaFaceSVG(30) +
                    '</div>' +
                    '<div>' +
                        '<div style="font-size:14px;font-weight:700">Veruska</div>' +
                        '<div style="font-size:11px;opacity:0.8">Assistente SAMS Locações</div>' +
                    '</div>' +
                '</div>' +
                '<button type="button" id="veruska-close" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0">✕</button>' +
            '</div>' +
            // Abas
            '<div style="display:flex;border-bottom:1px solid #e5e7eb;flex-shrink:0;background:#f9fafb">' +
                '<button type="button" data-vtab="conversar" style="flex:1;padding:9px 4px;font-size:12px;border:none;cursor:pointer;background:' + (_tab === 'conversar' ? 'white' : 'transparent') + ';color:' + (_tab === 'conversar' ? '#2563eb' : '#6b7280') + ';font-weight:' + (_tab === 'conversar' ? '600' : '400') + ';border-bottom:' + (_tab === 'conversar' ? '2px solid #2563eb' : '2px solid transparent') + '">' +
                    '<div style="font-size:16px">💬</div><div>Conversar</div>' +
                '</button>' +
                '<button type="button" data-vtab="dicas" style="flex:1;padding:9px 4px;font-size:12px;border:none;cursor:pointer;background:' + (_tab === 'dicas' ? 'white' : 'transparent') + ';color:' + (_tab === 'dicas' ? '#2563eb' : '#6b7280') + ';font-weight:' + (_tab === 'dicas' ? '600' : '400') + ';border-bottom:' + (_tab === 'dicas' ? '2px solid #2563eb' : '2px solid transparent') + '">' +
                    '<div style="font-size:16px">' + modHelp.icon + '</div><div>Dicas</div>' +
                '</button>' +
            '</div>' +
            // Conteúdo
            '<div id="veruska-content" style="overflow-y:auto;flex:1;min-height:0">' +
                (_tab === 'conversar' ? renderChatTab() : renderDicasTab(modHelp, msg, lembrete)) +
            '</div>' +
            // Rodapé
            '<div style="padding:8px 12px;border-top:1px solid #f3f4f6;background:#f9fafb;flex-shrink:0;font-size:11px;color:#9ca3af;text-align:center">' +
                'SAMS Locações CRM • <kbd style="background:#e5e7eb;padding:1px 5px;border-radius:3px;font-size:10px">?</kbd> para abrir/fechar' +
            '</div>';

        // Bind eventos
        var closeBtn = _panel.querySelector('#veruska-close');
        if (closeBtn) closeBtn.addEventListener('click', togglePanel);

        var tabBtns = _panel.querySelectorAll('[data-vtab]');
        tabBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                _tab = btn.getAttribute('data-vtab');
                renderPanel();
                if (_tab === 'conversar') {
                    setTimeout(scrollChatToBottom, 50);
                    setTimeout(focusChatInput, 80);
                }
            });
        });

        if (_tab === 'conversar') {
            bindChatEvents();
            setTimeout(scrollChatToBottom, 50);
        } else {
            bindDicasEvents();
        }
    }

    // ── Aba Conversar ─────────────────────────────────────────────────────────
    function renderChatTab() {
        var msgs = '';
        if (_chatHistory.length === 0) {
            msgs = '<div style="text-align:center;padding:20px 16px;color:#6b7280">' +
                '<div style="font-size:32px;margin-bottom:8px">👋</div>' +
                '<div style="font-size:13px;font-weight:600;color:#374151;margin-bottom:4px">Olá! Sou a Veruska.</div>' +
                '<div style="font-size:12px;line-height:1.5">Posso consultar dados do sistema para você — pendências financeiras, eventos, clientes e muito mais.</div>' +
                '<div style="font-size:11px;color:#9ca3af;margin-top:8px">Exemplos de perguntas:</div>' +
                '<div style="font-size:11px;color:#2563eb;margin-top:4px;line-height:1.8">' +
                    '"Quais contas estão vencidas?"<br>"Me mostra os eventos deste mês"<br>"Qual o resumo financeiro de julho?"' +
                '</div>' +
            '</div>';
        } else {
            _chatHistory.forEach(function(m) {
                var isUser = m.role === 'user';
                msgs += '<div style="display:flex;justify-content:' + (isUser ? 'flex-end' : 'flex-start') + ';margin-bottom:8px;padding:0 12px">' +
                    '<div style="max-width:85%;background:' + (isUser ? '#2563eb' : '#f3f4f6') + ';color:' + (isUser ? 'white' : '#1f2937') + ';border-radius:' + (isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px') + ';padding:8px 12px;font-size:13px;line-height:1.5;white-space:pre-wrap;word-break:break-word">' +
                        escapeHtml(m.content) +
                    '</div>' +
                '</div>';
            });
        }

        if (_thinking) {
            msgs += '<div style="display:flex;justify-content:flex-start;margin-bottom:8px;padding:0 12px">' +
                '<div style="background:#f3f4f6;border-radius:12px 12px 12px 4px;padding:10px 14px;font-size:13px;color:#6b7280">' +
                    '<span style="animation:veruska-pop 0.5s infinite alternate">●</span> ' +
                    '<span style="animation:veruska-pop 0.5s 0.15s infinite alternate">●</span> ' +
                    '<span style="animation:veruska-pop 0.5s 0.3s infinite alternate">●</span>' +
                '</div>' +
            '</div>';
        }

        return '<div id="veruska-chat-msgs" style="padding:12px 0;min-height:200px;max-height:340px;overflow-y:auto">' + msgs + '</div>' +
            '<div style="padding:10px 12px;border-top:1px solid #f3f4f6;display:flex;gap:8px;flex-shrink:0">' +
                '<input id="veruska-input" type="text" placeholder="Pergunte algo..." ' +
                    'style="flex:1;border:1px solid #d1d5db;border-radius:8px;padding:8px 10px;font-size:13px;outline:none;font-family:inherit" ' +
                    'maxlength="500" ' + (_thinking ? 'disabled' : '') + '/>' +
                '<button type="button" id="veruska-send" ' +
                    'style="background:#2563eb;color:white;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;font-size:13px;flex-shrink:0;' + (_thinking ? 'opacity:0.5;cursor:not-allowed' : '') + '" ' +
                    (_thinking ? 'disabled' : '') + '>Enviar</button>' +
            '</div>';
    }

    function bindChatEvents() {
        var input = document.getElementById('veruska-input');
        var sendBtn = document.getElementById('veruska-send');
        if (!input || !sendBtn) return;

        function sendMessage() {
            var text = input.value.trim();
            if (!text || _thinking) return;
            input.value = '';
            _chatHistory.push({ role: 'user', content: text });
            _thinking = true;
            renderPanel();
            setTimeout(scrollChatToBottom, 30);

            fetch('/api/crm/assistente/perguntar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    pergunta: text,
                    historico: _chatHistory.slice(0, -1).slice(-8),
                }),
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                _thinking = false;
                if (data.error) {
                    _chatHistory.push({ role: 'assistant', content: '⚠️ ' + data.error });
                } else {
                    _chatHistory.push({ role: 'assistant', content: data.resposta });
                }
                renderPanel();
                setTimeout(scrollChatToBottom, 30);
                setTimeout(focusChatInput, 50);
            })
            .catch(function(e) {
                _thinking = false;
                _chatHistory.push({ role: 'assistant', content: '⚠️ Erro de conexão. Tente novamente.' });
                renderPanel();
                setTimeout(scrollChatToBottom, 30);
            });
        }

        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    function scrollChatToBottom() {
        var msgs = document.getElementById('veruska-chat-msgs');
        if (msgs) msgs.scrollTop = msgs.scrollHeight;
    }

    function focusChatInput() {
        var input = document.getElementById('veruska-input');
        if (input) { try { input.focus(); } catch {} }
    }

    // ── Aba Dicas ─────────────────────────────────────────────────────────────
    function renderDicasTab(modHelp, msg, lembrete) {
        var tipsHtml = modHelp.tips.map(function(t) {
            return '<li style="margin-bottom:6px;line-height:1.5">' + escapeHtml(t) + '</li>';
        }).join('');

        var shortcutsHtml = HELP_CONTENT.shortcuts.map(function(s) {
            return '<button type="button" data-shortcut-action="' + escapeAttr(s.action) + '" ' +
                'style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 6px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;font-size:11px;color:#374151;min-width:0;flex:1">' +
                '<span style="font-size:18px">' + s.icon + '</span>' +
                '<span style="text-align:center;word-break:break-word">' + escapeHtml(s.label) + '</span>' +
            '</button>';
        }).join('');

        var lembretesHtml = HELP_CONTENT.lembretes.map(function(l, i) {
            var isActive = i === HELP_CONTENT.lembretes.indexOf(lembrete);
            return '<div style="background:' + (isActive ? '#fff7ed' : '#f9fafb') + ';border:1px solid ' + (isActive ? '#fed7aa' : '#e5e7eb') + ';border-radius:8px;padding:8px 10px;font-size:12px;color:#374151;line-height:1.5;margin-bottom:6px">' +
                escapeHtml(l) +
            '</div>';
        }).join('');

        var salmosHtml = HELP_CONTENT.mensagens.filter(function(m) { return m.tipo === 'salmo'; }).slice(0, 3).map(function(m) {
            return '<div style="background:#f0f9ff;border-left:3px solid #2563eb;padding:8px 10px;border-radius:0 8px 8px 0;font-size:12px;color:#1e3a5f;font-style:italic;line-height:1.5;margin-bottom:6px">' +
                escapeHtml(m.texto) +
            '</div>';
        }).join('');

        var inspHtml = HELP_CONTENT.mensagens.filter(function(m) { return m.tipo === 'inspiracao'; }).slice(0, 2).map(function(m) {
            return '<div style="background:#f0fdf4;border-left:3px solid #16a34a;padding:8px 10px;border-radius:0 8px 8px 0;font-size:12px;color:#14532d;font-style:italic;line-height:1.5;margin-bottom:6px">' +
                escapeHtml(m.texto) +
            '</div>';
        }).join('');

        return '<div style="padding:12px 14px;overflow-y:auto">' +
            // Dicas do módulo
            '<div style="margin-bottom:14px">' +
                '<div style="font-size:12px;font-weight:700;color:#1e3a5f;margin-bottom:8px;display:flex;align-items:center;gap:6px">' +
                    '<span>' + modHelp.icon + '</span>' +
                    '<span>' + escapeHtml(modHelp.title) + '</span>' +
                '</div>' +
                '<ul style="margin:0;padding-left:18px;color:#374151;font-size:12px">' + tipsHtml + '</ul>' +
            '</div>' +
            // Atalhos
            '<div style="margin-bottom:14px">' +
                '<div style="font-size:12px;font-weight:700;color:#1e3a5f;margin-bottom:8px">⚡ Atalhos Rápidos</div>' +
                '<div style="display:flex;flex-wrap:wrap;gap:6px">' + shortcutsHtml + '</div>' +
            '</div>' +
            // Lembretes
            '<div style="margin-bottom:14px">' +
                '<div style="font-size:12px;font-weight:700;color:#1e3a5f;margin-bottom:8px">📌 Lembretes Operacionais</div>' +
                lembretesHtml +
            '</div>' +
            // Salmos
            '<div style="margin-bottom:14px">' +
                '<div style="font-size:12px;font-weight:700;color:#1e3a5f;margin-bottom:8px">✝️ Inspiração do Dia</div>' +
                salmosHtml +
            '</div>' +
            // Inspirações
            '<div>' +
                '<div style="font-size:12px;font-weight:700;color:#1e3a5f;margin-bottom:8px">💡 Reflexão</div>' +
                inspHtml +
            '</div>' +
        '</div>';
    }

    function bindDicasEvents() {
        var btns = _panel ? _panel.querySelectorAll('[data-shortcut-action]') : [];
        btns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var action = btn.getAttribute('data-shortcut-action');
                try { eval(action); } catch {}
                togglePanel();
            });
        });
    }

    // ── Abrir/fechar painel ───────────────────────────────────────────────────
    function togglePanel() {
        hideBalloon();
        if (_open) {
            closePanel();
        } else {
            openPanel(_tab);
        }
    }

    function openPanel(tab) {
        if (tab) _tab = tab;
        hideBalloon();
        createPanel();
        _open = true;
        _panel.style.pointerEvents = 'auto';
        requestAnimationFrame(function() {
            _panel.style.transform = 'scale(1) translateY(0)';
            _panel.style.opacity = '1';
        });
        if (_tab === 'conversar') {
            setTimeout(scrollChatToBottom, 100);
            setTimeout(focusChatInput, 150);
        }
    }

    function closePanel() {
        _open = false;
        if (_panel) {
            _panel.style.transform = 'scale(0.95) translateY(10px)';
            _panel.style.opacity = '0';
            _panel.style.pointerEvents = 'none';
        }
    }

    // ── Atalho de teclado "?" ─────────────────────────────────────────────────
    document.addEventListener('keydown', function(e) {
        if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            var tag = document.activeElement ? document.activeElement.tagName : '';
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            togglePanel();
        }
    });

    // ── Fechar ao clicar fora ─────────────────────────────────────────────────
    document.addEventListener('click', function(e) {
        if (!_open) return;
        if (_panel && _panel.contains(e.target)) return;
        if (_avatar && _avatar.contains(e.target)) return;
        closePanel();
    });

    // ── Helpers ───────────────────────────────────────────────────────────────
    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function escapeAttr(str) {
        return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // ── Inicialização ─────────────────────────────────────────────────────────
    function init() {
        // Remover botão antigo se ainda existir
        var old = document.getElementById('crm-help-fab');
        if (old && old.parentNode) old.parentNode.removeChild(old);
        var oldPanel = document.getElementById('crm-help-panel');
        if (oldPanel && oldPanel.parentNode) oldPanel.parentNode.removeChild(oldPanel);

        createAvatar();
        setTimeout(showGreetingBalloon, 2000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expor para uso externo (ex: abrir a partir de outros módulos)
    window.VeruskaAssistente = { open: openPanel, close: closePanel, toggle: togglePanel };
})();
