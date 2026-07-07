/**
 * SAMS CRM — Módulo de Logout Automático por Inatividade
 * =========================================================
 * Detecta inatividade do usuário e executa logout automático após o tempo configurado.
 *
 * Fluxo:
 *   1. Usuário fica inativo por IDLE_TIMEOUT ms  →  exibe modal de aviso
 *   2. Contador regressivo de WARNING_DURATION s  →  se não houver interação, faz logout
 *   3. Qualquer interação (mouse, teclado, toque, scroll) reinicia o timer
 *   4. Botão "Continuar" no modal também reinicia o timer
 *
 * Integração:
 *   - IdleTimer.start() é chamado pelo AuthSystem.showMainApp()
 *   - IdleTimer.stop()  é chamado pelo AuthSystem.logout()
 */

const IdleTimer = (() => {
    // ── Configurações ──────────────────────────────────────────────────────────
    const IDLE_TIMEOUT    = 15 * 60 * 1000; // 15 minutos de inatividade → exibe aviso
    const WARNING_DURATION = 60;             // 60 segundos de contagem regressiva
    const STORAGE_KEY     = 'sams_crm_last_activity';

    // ── Estado interno ─────────────────────────────────────────────────────────
    let idleTimer       = null;
    let countdownTimer  = null;
    let countdownValue  = WARNING_DURATION;
    let isWarningVisible = false;
    let isRunning       = false;

    // ── Eventos que contam como atividade ──────────────────────────────────────
    const ACTIVITY_EVENTS = [
        'mousemove', 'mousedown', 'keydown', 'touchstart',
        'touchmove', 'scroll', 'wheel', 'click', 'focus'
    ];

    // ── Criar o modal de aviso (inserido uma única vez no DOM) ─────────────────
    function createWarningModal() {
        if (document.getElementById('idleWarningModal')) return;

        const modal = document.createElement('div');
        modal.id = 'idleWarningModal';
        modal.setAttribute('role', 'alertdialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'idleWarningTitle');
        modal.style.cssText = [
            'display:none',
            'position:fixed',
            'inset:0',
            'z-index:99999',
            'align-items:center',
            'justify-content:center',
            'background:rgba(15,23,42,0.75)',
            'backdrop-filter:blur(4px)',
            '-webkit-backdrop-filter:blur(4px)',
        ].join(';');

        modal.innerHTML = `
            <div style="
                background:#fff;
                border-radius:20px;
                padding:36px 32px;
                max-width:420px;
                width:calc(100% - 32px);
                box-shadow:0 24px 64px rgba(0,0,0,0.35);
                text-align:center;
                position:relative;
                animation:idleFadeIn 0.25s ease;
            ">
                <!-- Ícone -->
                <div style="
                    width:64px;height:64px;
                    background:linear-gradient(135deg,#fef3c7,#fde68a);
                    border-radius:50%;
                    display:flex;align-items:center;justify-content:center;
                    margin:0 auto 20px;
                ">
                    <i class="fas fa-clock" style="font-size:26px;color:#d97706"></i>
                </div>

                <!-- Título -->
                <h3 id="idleWarningTitle" style="
                    font-size:1.25rem;font-weight:800;color:#1e293b;margin-bottom:8px;
                ">Sessão prestes a expirar</h3>

                <!-- Subtítulo -->
                <p style="font-size:0.875rem;color:#64748b;margin-bottom:24px;line-height:1.5">
                    Por segurança, você será desconectado automaticamente por inatividade.
                </p>

                <!-- Contador regressivo -->
                <div style="
                    display:inline-flex;align-items:center;justify-content:center;
                    width:80px;height:80px;
                    border-radius:50%;
                    background:linear-gradient(135deg,#1e40af,#3b82f6);
                    box-shadow:0 4px 16px rgba(59,130,246,0.4);
                    margin-bottom:24px;
                ">
                    <span id="idleCountdown" style="
                        font-size:2rem;font-weight:900;color:#fff;line-height:1;
                    ">${WARNING_DURATION}</span>
                </div>

                <!-- Barra de progresso -->
                <div style="
                    width:100%;height:4px;
                    background:#e2e8f0;
                    border-radius:2px;
                    margin-bottom:24px;
                    overflow:hidden;
                ">
                    <div id="idleProgressBar" style="
                        height:100%;width:100%;
                        background:linear-gradient(90deg,#1e40af,#3b82f6);
                        border-radius:2px;
                        transition:width 1s linear;
                    "></div>
                </div>

                <!-- Botões -->
                <div style="display:flex;gap:12px;justify-content:center">
                    <button id="idleLogoutNowBtn" style="
                        padding:10px 20px;
                        background:#f1f5f9;color:#64748b;
                        border:1.5px solid #e2e8f0;border-radius:10px;
                        font-size:0.875rem;font-weight:600;cursor:pointer;
                    ">
                        <i class="fas fa-sign-out-alt" style="margin-right:6px"></i>Sair agora
                    </button>
                    <button id="idleContinueBtn" style="
                        padding:10px 24px;
                        background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;
                        border:none;border-radius:10px;
                        font-size:0.875rem;font-weight:700;cursor:pointer;
                        box-shadow:0 4px 12px rgba(59,130,246,0.35);
                    ">
                        <i class="fas fa-check" style="margin-right:6px"></i>Continuar conectado
                    </button>
                </div>
            </div>

            <style>
                @keyframes idleFadeIn {
                    from { opacity:0; transform:scale(0.92) translateY(12px); }
                    to   { opacity:1; transform:scale(1)    translateY(0);    }
                }
            </style>
        `;

        document.body.appendChild(modal);

        // Botão "Continuar conectado"
        document.getElementById('idleContinueBtn').addEventListener('click', () => {
            resetTimer();
            hideWarning();
        });

        // Botão "Sair agora"
        document.getElementById('idleLogoutNowBtn').addEventListener('click', () => {
            hideWarning();
            doLogout();
        });
    }

    // ── Exibir o modal de aviso ────────────────────────────────────────────────
    function showWarning() {
        if (isWarningVisible) return;
        isWarningVisible = true;

        const modal = document.getElementById('idleWarningModal');
        if (!modal) return;

        countdownValue = WARNING_DURATION;
        updateCountdown();

        modal.style.display = 'flex';

        // Focar no botão "Continuar" para acessibilidade
        setTimeout(() => {
            const btn = document.getElementById('idleContinueBtn');
            if (btn) btn.focus();
        }, 50);

        // Iniciar contagem regressiva
        clearInterval(countdownTimer);
        countdownTimer = setInterval(() => {
            countdownValue--;
            updateCountdown();

            if (countdownValue <= 0) {
                clearInterval(countdownTimer);
                hideWarning();
                doLogout();
            }
        }, 1000);
    }

    // ── Ocultar o modal de aviso ───────────────────────────────────────────────
    function hideWarning() {
        isWarningVisible = false;
        clearInterval(countdownTimer);

        const modal = document.getElementById('idleWarningModal');
        if (modal) modal.style.display = 'none';
    }

    // ── Atualizar contador e barra de progresso ────────────────────────────────
    function updateCountdown() {
        const el = document.getElementById('idleCountdown');
        if (el) el.textContent = countdownValue;

        const bar = document.getElementById('idleProgressBar');
        if (bar) {
            const pct = (countdownValue / WARNING_DURATION) * 100;
            bar.style.width = pct + '%';
            // Mudar cor conforme urgência
            if (countdownValue <= 10) {
                bar.style.background = 'linear-gradient(90deg,#dc2626,#ef4444)';
            } else if (countdownValue <= 20) {
                bar.style.background = 'linear-gradient(90deg,#d97706,#f59e0b)';
            }
        }
    }

    // ── Executar logout via AuthSystem ─────────────────────────────────────────
    function doLogout() {
        stop();
        if (window.AuthSystem && typeof AuthSystem.logout === 'function') {
            AuthSystem.logout();
            // Exibir mensagem de sessão expirada após o logout
            setTimeout(() => {
                if (typeof AuthSystem.showMessage === 'function') {
                    AuthSystem.showMessage(
                        '⏱ Sessão encerrada por inatividade. Faça login novamente.',
                        'warning'
                    );
                }
            }, 400);
        } else {
            // Fallback: recarregar a página
            window.location.reload();
        }
    }

    // ── Reiniciar o timer de inatividade ──────────────────────────────────────
    function resetTimer() {
        if (!isRunning) return;

        // Se o aviso estiver visível, ocultá-lo ao detectar atividade
        if (isWarningVisible) {
            hideWarning();
        }

        // Registrar timestamp da última atividade (para sincronização entre abas)
        try { localStorage.setItem(STORAGE_KEY, Date.now().toString()); } catch {}

        clearTimeout(idleTimer);
        idleTimer = setTimeout(showWarning, IDLE_TIMEOUT);
    }

    // ── Listener de atividade ─────────────────────────────────────────────────
    function onActivity() {
        resetTimer();
    }

    // ── Sincronização entre abas (via localStorage) ───────────────────────────
    function onStorageChange(e) {
        if (e.key === STORAGE_KEY) {
            // Outra aba teve atividade — reiniciar o timer nesta aba também
            if (isRunning && !isWarningVisible) {
                clearTimeout(idleTimer);
                idleTimer = setTimeout(showWarning, IDLE_TIMEOUT);
            }
        }
    }

    // ── API pública ───────────────────────────────────────────────────────────

    /**
     * Iniciar o timer de inatividade.
     * Deve ser chamado após login bem-sucedido (AuthSystem.showMainApp).
     */
    function start() {
        if (isRunning) return;
        isRunning = true;

        createWarningModal();

        // Registrar atividade inicial
        try { localStorage.setItem(STORAGE_KEY, Date.now().toString()); } catch {}

        // Vincular eventos de atividade
        ACTIVITY_EVENTS.forEach(evt => {
            document.addEventListener(evt, onActivity, { passive: true, capture: true });
        });

        // Sincronização entre abas
        window.addEventListener('storage', onStorageChange);

        // Iniciar o timer
        idleTimer = setTimeout(showWarning, IDLE_TIMEOUT);

        console.log(`[IdleTimer] ✅ Iniciado — logout automático após ${IDLE_TIMEOUT / 60000} min de inatividade`);
    }

    /**
     * Parar o timer de inatividade.
     * Deve ser chamado no logout (AuthSystem.logout).
     */
    function stop() {
        if (!isRunning) return;
        isRunning = false;

        clearTimeout(idleTimer);
        clearInterval(countdownTimer);
        hideWarning();

        ACTIVITY_EVENTS.forEach(evt => {
            document.removeEventListener(evt, onActivity, { capture: true });
        });

        window.removeEventListener('storage', onStorageChange);

        try { localStorage.removeItem(STORAGE_KEY); } catch {}

        console.log('[IdleTimer] 🛑 Parado');
    }

    /**
     * Retorna o tempo restante (ms) até o aviso de inatividade.
     * Útil para debug.
     */
    function getStatus() {
        return {
            isRunning,
            isWarningVisible,
            idleTimeoutMs: IDLE_TIMEOUT,
            warningDurationSec: WARNING_DURATION,
        };
    }

    return { start, stop, getStatus };
})();

// Exportar para uso global
window.IdleTimer = IdleTimer;
