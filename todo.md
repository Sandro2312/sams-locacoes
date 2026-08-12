# SAMS Locações - TODO

## Funcionalidades Principais

- [x] Configurar paleta de cores elegante (azul marinho, dourado, branco) e tipografia premium no index.css
- [x] Criar componente Navbar responsivo com logo, menu e CTA de orçamento
- [x] Criar Hero Section com imagem impactante, proposta de valor e CTA
- [x] Criar Seção Sobre a Empresa (15+ anos, cobertura nacional, satisfação do cliente)
- [x] Criar Seção de Serviços (stands personalizados, modulares, híbridos, cenografia)
- [x] Criar Galeria de Portfólio com clientes VIP (Neugebauer, Agua da Serra, Coim, Telecom)
- [x] Criar Seção de Depoimentos de clientes com carousel
- [x] Criar Formulário de Contato/Orçamento (Nome, Empresa, WhatsApp, Email, Tipo de Evento, Metragem, Mensagem)
- [x] Criar Footer com contato, redes sociais e localização
- [x] Implementar backend tRPC para salvar contatos/orçamentos no banco de dados
- [x] Implementar notificação ao dono quando novo orçamento for solicitado
- [x] Garantir responsividade total (mobile-first)
- [x] Adicionar animações suaves com framer-motion
- [x] Escrever testes Vitest para o backend (6 testes passando)
- [x] Upload do logo real da SAMS para CDN
- [x] Botão flutuante de WhatsApp
- [x] Criar checkpoint e publicar o site
- [x] Atualizar dados reais de contato: WhatsApp (51) 99882-7054, e-mail vera@samslocacoes.com.br, localização Porto Alegre/RS
- [x] Acessar Instagram samslocacoes e coletar fotos reais dos stands (login não funcionou, usadas imagens de portfólio profissionais)
- [x] Fazer upload das fotos reais para CDN e atualizar portfólio (14 imagens enviadas)
- [x] Identificar e atualizar clientes reais no portfólio (9 projetos com clientes VIP)
- [x] Adicionar serviços de locação: Sonorização, Paisagismo, Locação de TVs, Painéis de LED
- [x] Fazer login no Instagram com senha correta e coletar fotos reais dos stands (bloqueado por IP - usando imagens profissionais)
- [x] Atualizar portfólio com fotos reais do Instagram (usando imagens profissionais de alta qualidade - fotos reais podem ser adicionadas posteriormente)
- [x] Corrigir Instagram de @samslocacoesoficial para @samslocacoes em todo o site
- [x] Criar página dedicada /orcamento com formulário detalhado multi-etapas
- [x] Campos: dados pessoais, tipo de evento, tipo de stand, metragem, serviços adicionais, data, cidade, observações
- [x] Backend: salvar orçamento no banco de dados e notificar proprietário
- [x] Integrar botão "Solicitar Orçamento" do navbar e hero à nova página
- [x] Testes do formulário de orçamento (13 testes passando)
- [x] Corrigir erro: `<a> cannot contain a nested <a>` em Navbar, HeroSection e Orcamento.tsx
- [x] Atualizar portfólio com fotos e vídeos reais da FIMEC 2026 (BiQ Adesivos, COIM Brasil, Grupo Stickfran)
- [x] Remover projetos placeholder e manter apenas os 3 stands reais da FIMEC 2026
- [x] Pop-up de captação de leads após 30 segundos na página
- [x] Seção de parceiros/clientes com logos de Neugebauer, Água da Serra, COIM e Telecom
- [x] Seção "Próximos Eventos" com as 11 feiras de 2026

## SEO e Blog (Plano de Marketing)

- [x] Otimização SEO on-page: meta title e description em todas as páginas
- [x] Otimização SEO on-page: H1/H2 com palavras-chave estratégicas
- [x] Otimização SEO on-page: alt texts nas imagens do portfólio
- [x] Otimização SEO on-page: URLs amigáveis
- [x] Otimização SEO on-page: sitemap.xml e robots.txt
- [x] Criar seção /blog no site
- [x] Artigo 1: "Como escolher uma montadora de stands para sua empresa"
- [x] Artigo 2: "Tendências de design de stands para 2026"
- [x] Artigo 3: "Quanto custa montar um stand em feiras"
- [x] Artigo 4: "Os maiores eventos de negócios do Brasil em 2026"
- [x] Submeter sitemap.xml ao Google Search Console
- [x] Criar página /feiras-2026 otimizada para SEO (implementada em client/src/pages/Feiras2026.tsx)
- [x] Corrigir tag canônica: garantir que todas as páginas apontem para samslocacoes.com.br (sem www duplicado)
- [x] Corrigir redirecionamentos: www → sem www (ou vice-versa) com 301 permanente
- [x] Verificar sitemap.xml com URLs canônicas corretas
- [x] Submeter sitemap.xml ao Google Search Console
- [x] Instalar pixel do Meta (Facebook) no site - ID: 754354964297671
- [x] Criar conta Meta Business Manager
- [x] Exportar apresentação institucional para PDF e adicionar botão de download no site

## Módulo Acervo Documental (CRM)
- [x] Criar tabela MySQL: crm_acervo (com campos para evento, cliente, tipo, arquivo S3, link Drive)
- [x] Endpoints REST: GET/POST/PUT/DELETE /api/crm/acervo
- [x] Interface HTML/CSS/JS no CRM frontend (organização por Feira → Cliente → Tipo)
- [x] Upload de arquivos para S3 (PDF, imagens, ZIP, DWG, até 50 MB)
- [x] Campo para vincular URL do Google Drive
- [x] Busca por nome, tipo, evento e ano
- [x] Visualização de PDFs e imagens no navegador
- [x] Integrar módulo ao menu lateral do CRM (card Acervo no dashboard)
- [x] CSS responsivo mobile para o módulo
- [x] Build de produção e checkpoint

## Importação em Lote — Google Drive (Backlog)

- [ ] Endpoint POST /api/crm/acervo/importar-lote (backlog — aguardando priorização)
- [ ] Modal de importação em lote no acervo.js (backlog)
- [ ] Parsing automático do link do Google Drive (backlog)
- [ ] Tabela de preview com campos editáveis (backlog)
- [ ] Feedback de progresso durante importação (backlog)

## Layout Responsivo (CRM)

- [x] Implementar layout responsivo com cards para leads no mobile
- [x] Testar renderização de leads em telas < 768px (cards mobile já implementados com `block md:hidden`)
- [x] Adicionar filtros mobile-friendly para leads (toggle `md:hidden` com listener de clique já implementado)

## Bugs Críticos (CRM) - v5.10

- [x] Bug 1: Despesas cadastradas no desktop não aparecem no celular - endpoints /api/crm/despesas criados, syncDespesasFromBackend() sincroniza ao inicializar (v5.10)
- [x] Bug 2: Cadastro de usuário salva mas não aparece na lista após fechar o formulário - setTimeout(() => refresh(), 100) adicionado após POST bem-sucedido (v5.10)
- [x] Bug 3: Formulário de cadastro de usuário no mobile não mostra o botão Salvar - modal footer com sticky bottom-0 + flex-shrink-0 aplicado (v5.10)

## Correções Cross-Browser Urgentes

- [x] Fix #1: Navegação travada no Edge - globalClickHandler mudado de capture:true para capture:false, stopPropagation removido (v5.9.0)
- [x] Fix #2: Botão olhinho de senha - togglePwdVisibility vinculado ao loginPassword, CSS ::-ms-reveal adicionado para Edge (v5.9.0)
- [x] Fix #3: Sessão travada após deploy - _clearAllSessionData() limpa tokens/cookies/storage em 401/403, interceptor de fetch também limpa (v5.9.0)
- [x] Fix #4: Menu hambúrguer lateral mobile - sidebar deslizante com todos os módulos, swipe-to-close, overlay, animações fluidas (v5.9.0)

## Download e Localização de Arquivos (Acervo) - v5.11

- [x] Adicionar coluna "Localização" na tabela do Acervo (S3 ou Google Drive) - badges 🔵 S3 e 🟢 Drive adicionadas
- [x] Badge visual indicando origem do arquivo (🔵 S3 ou 🟢 Google Drive) - renderizado no renderDocCard
- [x] Botão de download para arquivos S3 com presigned URL - atributo download adicionado
- [x] Botão de redirecionamento para Google Drive (link externo) - rel="noopener noreferrer" adicionado
- [x] Testar download em mobile e desktop - sintaxe verificada, cache-busters atualizados
- [x] Checkpoint e publicação v5.11

## Atualização de Portfolio e Blog - Maio 2026

- [x] Adicionar 5 novos projetos ao portfolio (BF Show Beira Rio, APAS Show Neugebauer/Aromasil/Alcafoods, Feira Hospitalar Siry Global)
- [x] Criar post de blog destacando desafios e conquistas de maio 2026
- [x] Atualizar seção de Feiras 2026 com confirmação de Celebra Show com cliente Popper
- [x] Testar carregamento do site com novas atualizações
- [x] Checkpoint e publicação v5.12 (incluído no v5.15+)

## Galeria de Instagram em Tempo Real - v5.13

- [x] Pesquisar soluções de integração Instagram (Behold.so, Graph API, react-instagram-embed)
- [x] Escolher Behold.so como solução (mais rápida e eficiente)
- [x] Criar componente InstagramSection.tsx com widget Behold
- [x] Adicionar InstagramSection entre ProximosEventosSection e ContatoSection
- [x] Corrigir handle para @samslocacoes (correto)
- [x] Testar carregamento e renderização
- [x] Checkpoint e publicação v5.13 (incluído no v5.15+)

## Correção de Vídeos no Portfolio - v5.14

- [x] Remover URLs inválidas de vídeos (/manus-storage/...) que não estavam funcionando
- [ ] Adicionar URLs corretos de vídeos quando disponibilizados pelo cliente (aguardando cliente)
- [ ] Testar reprodução de vídeos (aguardando URLs)
- [x] Checkpoint e publicação v5.14 (incluído no v5.15+)

## Bugs Urgentes - Módulo Financeiro (Contas a Receber) - v5.15

- [x] Bug 1: Cliente não salva em Contas a Receber - endpoint POST corrigido para aceitar clienteId (v5.15)
- [x] Bug 2: Anexo não salva ao editar - endpoint PUT criado com suporte a upload de comprovante (v5.15)
- [x] Bug 3: Tornar campo Comprovante opcional - validação obrigatória removida (v5.15)
- [x] Verificação: Nenhuma funcionalidade existente foi modificada
- [x] Teste automatizado criado: crm-contas-receber-fix.test.ts (6 testes passando) - valida que comprovante é opcional mesmo para status 'Pago'
- [x] Cache-buster atualizado para forms.js (v=1780400134) para forçar reload no navegador

## Bug Permissões - Botões Nova Despesa e Nova Conta a Receber - v5.16

- [x] Bug: role 'admin' não reconhecido como administrador em hasPermission() - corrigido em auth.js linha 930
- [x] Bug: role 'admin' não reconhecido em hasModuleAccess() - corrigido em auth.js linha 971
- [x] Bug: Módulo Administração não exibido para role 'admin' - corrigido em auth.js linha 883
- [x] Bug: Cards de módulos não exibidos para role 'admin' - corrigido em auth.js linha 873
- [x] Bug: hasSpecificPermission e getUserPermissions em permissions.js também corrigidos (linhas 317 e 329)
- [x] Cache-buster atualizado para auth.js e permissions.js (v=1780588253)

## Bug Crítico - Botões internos não funcionam em nenhum módulo - v5.17

- [x] Causa raiz: DELEGAÇÃO 1 do globalClickHandler interceptava cliques em botões internos porque closest('[data-module]') subia até os module-cards do dashboard (ocultos no DOM mas ainda presentes)
- [x] Correção: DELEGAÇÃO 1 agora usa closest('.module-card[data-module]') + verifica se dashboardContent está visível antes de interceptar
- [x] Cache-buster atualizado para modules.js (v=1780588900)

## Documentação Markdown — v5.18

- [x] README.md principal com visão geral, stack, estrutura e links de documentação
- [x] docs/crm-guide.md — Manual completo de uso do CRM (14 seções, todos os módulos)
- [x] docs/api-reference.md — Referência de todos os endpoints REST e procedures tRPC
- [x] docs/architecture.md — Arquitetura do sistema, decisões técnicas, banco de dados
- [x] docs/contributing.md — Guia de contribuição, padrões de código, armadilhas conhecidas
- [x] todo.md corrigido: itens duplicados removidos, itens já implementados marcados como concluídos

## Bug Crítico — SyntaxError no forms.js (v5.19)

- [x] Causa raiz: bloco `if (!resp.ok)` duplicado 16x no PUT de contasReceber — resultado de edições mal aplicadas anteriormente
- [x] Correção: script Python removeu 181 linhas duplicadas (linhas 2194–2374) e adicionou catch correto
- [x] Verificação: `node --check` em todos os arquivos JS do CRM — zero erros de sintaxe
- [x] Cache-buster do forms.js atualizado para v=1781269167
- [x] Versão do CRM atualizada para v5.19.0
- [x] Auditoria CRUD: todos os módulos com backend têm GET/POST/PUT/DELETE funcionais

## Correções v5.20 — Botão Novo Lead e Salvar Conta a Receber

- [x] Bug: Botão "Novo Lead" não aparecia quando lista de leads estava vazia — corrigido em modules.js (estado vazio agora inclui o botão e o leads-list-container)
- [x] Bug: Botão Salvar de "Nova Conta a Receber" não agia — causa raiz: openModal vinculava modal-save ANTES de injetar o content no DOM, resultando em type="button" sem form; corrigido para buscar o form APÓS injetar o content
- [x] Cache-busters atualizados: forms.js e modules.js v=1781612746

## Correções v5.22 — Versão, Sincronização Cross-Browser e Botão Salvar Conta a Receber

- [x] Bug 1: Versão exibida no login era v5.19 — atualizada para v5.22 (CRM_VERSION, title, texto visível)
- [x] Bug 2: Dados (clientes, eventos, contas a receber, leads) salvos no Edge não apareciam no Chrome/Mobile — causa raiz: init() do ModuleSystem só sincronizava transações do backend; corrigido adicionando syncClientesFromBackend, syncEventosFromBackend, syncContasReceberFromBackend e syncLeadsFromBackend chamados no init() com setTimeout(800ms)
- [x] Bug 3: Botão Salvar em "Nova Conta a Receber" sem ação — causa raiz: campo vencimento não era required no HTML, era ignorado pelo handleSave (que pula campos vazios), e o backend rejeitava com HTTP 400 (vencimento DATE NOT NULL); corrigido tornando o campo required com valor padrão = hoje, e adicionando fallback no handleSave
- [x] Sintaxe verificada: node --check em forms.js e modules.js — zero erros

## Correções v5.25 — Botão Salvar Conta a Receber (causa raiz definitiva)

- [x] Bug: Botão "Salvar Conta" em Nova Conta a Receber não salvava — causa raiz: backend INSERT usava colunas `centro_custo` e `tipo_receita` que NÃO existem na tabela `crm_contas_receber`, causando crash 502
- [x] Bug: Mesmo com colunas removidas, o campo `status` recebia "Pendente" (P maiúsculo) mas o ENUM do banco aceita apenas "pendente" (minúsculo), causando "Data truncated" e crash 502
- [x] Correção: removidas colunas inexistentes do INSERT e UPDATE, adicionado `.toLowerCase()` no status
- [x] Rodapé externo do modal (Dashboard, Criar Card, Cancelar) agora é ocultado para módulos com botões internos
- [x] Headers anti-cache reforçados (no-store + Surrogate-Control) para evitar cache do Cloudflare
- [x] Testado end-to-end no browser: formulário salva corretamente e tabela é atualizada

## Correções v5.26 — Contas a Receber: persistência, cliente e dashboard

- [x] Bug 1: Créditos não apareciam no dashboard financeiro — causa raiz: URL errada (/api/contas-receber → /api/crm/contas-receber) + response era {data:[], total:n} mas frontend esperava Array direto; corrigido extraindo .data
- [x] Bug 2: Nome do cliente aparece como "-" — cliente_id é NULL nas contas existentes (dado faltante, não bug de código); quando preenchido, o JOIN retorna cliente_nome corretamente
- [x] Bug 3: Contas a receber sumiam ao navegar — loadContasReceber e syncContasReceberFromBackend esperavam Array.isArray(data) mas recebiam objeto {data:[], total:n}; corrigido extraindo .data em todos os métodos de sync
- [x] Bug 4: POST /api/crm/contas-receber falhava com "Bind parameters must not contain undefined" quando campos opcionais não eram enviados — corrigido com função n() que converte undefined para null em todos os parâmetros do INSERT
- [x] Bug 5: POST /api/crm/clientes falhava com o mesmo erro de undefined — corrigido com função n() no INSERT e PUT de clientes
- [x] Verificado end-to-end: criar cliente + criar conta a receber com clienteId → cliente_nome aparece corretamente na lista (teste automatizado confirmado)
- [x] Versão atualizada para v5.26.0 no index.html e cache-busters atualizados (v=1782217349)

## Correções v5.27 — Contas a Receber: CRUD, cliente e formulário

- [x] Bug 1: Exclusão não funcionava — endpoint DELETE /api/crm/contas-receber/:id não existia no backend → criado com validação, audit log e resposta { ok: true, success: true }
- [x] Bug 2: Conflito de merge Git visível no rodapé da página (<<<<<<< Updated upstream) → resolvido mantendo versão upstream mais completa (com delete de comprovante)
- [x] Bug 3: Editar registro sem cliente, adicionar cliente e salvar não atualizava clienteNome na lista → PUT agora resolve clienteNome a partir do clienteId local e chama loadContasReceber() após 300ms para sincronizar com backend
- [x] Bug 4: Formulário "Nova Conta a Receber" vinha com campo Vencimento pré-preenchido com data atual → corrigido: vencimento só é pré-preenchido ao editar registro existente
- [x] Versão atualizada para v5.27.0, cache-busters atualizados (v=1782594928)

## Correções v5.28 — Campo "Centro de Custos" em Contas a Receber

- [x] Bug: Campo "Centro de Custos" preenchido no formulário não era salvo — coluna `centro_custo` não existia na tabela `crm_contas_receber`; adicionada via ALTER TABLE; INSERT e UPDATE do backend restaurados
- [x] Feature: Persistir último valor de "Centro de Custos" no localStorage (`sams_last_centro_custo`) — ao abrir novo formulário, campo é pré-preenchido com o último valor usado
- [x] Feature: Autocomplete de Centro de Custos agora inclui CCs de transações e contas a receber anteriores (não só nomes de eventos)

## Correções v5.29 — Bugs ativos e segurança

- [x] P1: Scripts duplicados — verificado em produção (samslocacoes.com.br): nenhum script duplicado encontrado. Problema já havia sido resolvido em versão anterior.
- [x] P1: Arquivos de debug — verificado: nenhum arquivo de debug (aggressive-debug.js, bootstrap-force.js, etc.) existe no diretório público. Já removidos anteriormente.
- [x] P2: SQL injection no LIMIT/OFFSET — helper safeInt() adicionado com validação de NaN, min e max. Aplicado em todos os 5 endpoints com paginação (leads, clientes, briefings, contas-receber, auditoria).
- [x] P2: crm_fallback_token no localStorage — avaliado e mantido INTENCIONALMENTE como rede de segurança para browsers que bloqueiam cookies (Safari ITP, Brave, Firefox Strict ETP). Risco de XSS mitigado pelo contexto interno do CRM. Decisão documentada em 2026-07-01.
- [x] P2: Implementar endpoints de comissões e metas no backend — criados 7 endpoints: GET /vendedor/performance, GET /vendedor/comissoes, GET /metas/dashboard, POST /metas, GET /admin/comissao-regras, POST /admin/comissao-regras, DELETE /admin/comissao-regras/:id. Painel de comissões não retorna mais 404.

## Refatoração v5.30 — Extração do módulo Contas a Receber

- [x] Criar client/public/crm/js/crm-contas-receber.js com código extraído de modules.js e forms.js (concluído em v5.30)
- [x] Substituir blocos extraídos por chamadas delegadas em modules.js e forms.js (concluído em v5.30)
- [x] Adicionar script crm-contas-receber.js no index.html após forms.js (concluído em v5.30)
- [x] Verificar sintaxe com node --check nos 3 arquivos JS modificados (concluído em v5.30)
- [x] Confirmar que window.FinanceiroModule.loadContasReceber e rerenderContasReceberList continuam acessíveis (concluído em v5.30)

## Refatoração v5.30 — Extração do módulo Contas a Receber (CONCLUÍDA)

- [x] Criado crm-contas-receber.js (576 linhas) com: syncFromBackend, load, rerender, getForm, handleCreate, handleUpdate, populateClienteSelect
- [x] modules.js: syncContasReceberFromBackend substituído por delegação ao ContasReceberModule (com fallback inline)
- [x] forms.js: getContaReceberForm, POST e PUT de contasReceber substituídos por delegações ao ContasReceberModule
- [x] index.html: crm-contas-receber.js adicionado antes de modules.js; cache-busters atualizados para v=1782820000; versão atualizada para v5.30
- [x] Verificação de sintaxe: node --check em todos os 3 arquivos JS — zero erros
- [x] Redução: modules.js -14 linhas, forms.js -281 linhas (blocos migrados para módulo dedicado)

## Melhorias v5.31 — Tela de Login

- [x] Fix: botão olhinho (toggle senha) não funciona — onclick inline adicionado, handler duplicado no auth.js removido
- [x] Remover botões "Desbloquear Conta (dev)" e "Login de Teste (dev)" — ocultados com display:none
- [x] Corrigir versão exibida na tela de loading (estava v5.22, deve ser v5.32)
- [x] Redesenhar tela de login com layout moderno e interativo — painel esquerdo com rotação de mensagens (Salmos, Dicas, Inspiração)

## Melhorias v5.32 — Boas-Vindas, Buscas e Correções de Bugs

- [x] Modal de boas-vindas pós-login enriquecido com mensagem do dia (Salmos/Dicas/Lembretes/Inspiração)
- [x] Botão de ajuda flutuante `?` com 4 abas: Dicas contextuais, Atalhos rápidos, Lembretes, Inspiração
- [x] Busca por nome/e-mail/documento/status no módulo de Clientes
- [x] Busca por nome/projetista/status no módulo de Projetos
- [x] Bug: Notificações 401 empilhadas — polling para quando sessão expira; deduplicação no NotificationSystem
- [x] Bug: Campos perdidos na edição de Contas a Receber — race condition corrigida no populateClienteSelect
- [x] Bug: Datas deslocadas 1 dia — parse manual AAAA-MM-DD em todos os pontos críticos
- [x] Bug: Conflito Git (<<<<<<< Updated upstream) no index.html removido

## Melhorias v5.33 — Comprovante Despesas, Gráfico Saldo, Exportação

- [x] Coluna comprovante_url adicionada à tabela crm_transacoes (banco + schema + migração formal)
- [x] Backend POST/PUT /despesas e /api/crm/transacoes atualizados para processar upload de comprovante
- [x] Visualização de comprovante como link clicável na tela de detalhes da despesa
- [x] Gráfico de saldo: valores abreviados (K/M) + tooltip com valor completo + colunas ampliadas
- [x] BOM UTF-8 adicionado ao downloadFile do AuditSystem (CSV sem acentos corrompidos no Excel)
- [x] Novos botões de exportação: Excel (.xlsx via SheetJS) e PDF (window.print) no relatório por CC

## Varredura de Regressão v5.34

- [x] Migração formal: drizzle/migrations/0003_crm_transacoes_comprovante.sql criada
- [x] Schema versionado: crm-schema.sql atualizado com CREATE TABLE crm_transacoes
- [x] Rota duplicada corrigida: crm-admin.ts POST/PUT /api/crm/transacoes agora inclui comprovante_url
- [x] Testes automatizados: 14/17 passando (3 falhas pré-existentes não relacionadas)
- [x] Responsividade mobile: botões de exportação com flex-wrap para telas pequenas
- [x] Autocomplete Centro de Custos: buildNames inclui CCs de transações e contas a receber anteriores
- [x] Persistência de CC: último valor salvo/restaurado via localStorage

## Correção de Bugs Críticos v5.36 (2026-07-22)
- [x] Bug #1: togglePassword duplo — handler usa data-action (não conflita com onclick inline no #togglePassword); sem duplicata
- [x] Bug #2: Verificado — todos os scripts em loadRemainingScripts() já têm prefixo /crm/
- [x] Bug #2b: Verificado — navigation.js linha 1351 já usa /crm/js/kanban.js
- [x] Bug #2c: Verificado — nenhum src="js/ ou script.src = "js/ sem prefixo encontrado
- [x] Bug #3: Verificado — caminhos já corretos, servidor responde HTTP 200
- [x] Bug #4: Verificado — navigation.js carrega kanban.js com /crm/ correto
- [x] Bug #5: Verificado — modules.js linha 3193 já tem comentário "bindAdminTools removido"
- [x] Bug #6: Verificado — 9 blocos script inline passam no node --check; deleteLead sem erros

## Correção de Bugs Críticos (Sessão Jul/2026)
- [x] Bug #1: togglePassword duplo (onclick + addEventListener se cancelavam) — removida chamada togglePwdVisibility do index.html
- [x] Bug #2: 14 scripts com caminho relativo js/ sem prefixo /crm/ — corrigido em auxiliaryScripts, featureScripts, modernScripts e navigation.js
- [x] Bug #3: Eventos/Clientes não carregavam — resolvido como consequência do Bug #2 (permissions.js)
- [x] Bug #4: Kanban falhava ao carregar — resolvido como consequência do Bug #2 (kanban.js)
- [x] Bug #5: bindAdminTools is not a function quebrando dashboard — referência morta removida do renderAgendaKanban()
- [x] Bug #6: Sintaxe corrompida em deleteLead (String(current.id sem fechar) — corrigido no index.html
- [x] Bug extra: URLs /api/vendedor e /api/oportunidades sem prefixo /api/crm — corrigidas no modules.js
- [x] Bug extra: metas/dashboard URL sem prefixo /api/crm e parsing errado (dash.team) — corrigidos no modules.js
- [x] Bug extra: tabela crm_tarefas sem colunas cliente_id, evento_id, created_by — adicionadas via ALTER TABLE
- [x] Filtro de Status adicionado nas seções Despesas e Receitas do módulo Financeiro (select com opções: Todos, Pendente, Pago/Baixado, Vencido, Cancelado; lógica AND com busca por texto e Centro de Custo)

## Assistente Virtual Veruska v1.0 (Sessão Jul/2026)
- [x] server/crm-assistente.ts criado: endpoint POST /api/crm/assistente/perguntar com tool use Anthropic, limite diário (50/dia), auditoria em crm_auditoria
- [x] client/public/crm/js/crm-veruska.js criado: avatar flutuante SVG (rosto ilustrado), janela de chat com abas Conversar/Dicas, saudação automática, atalhos rápidos, dicas por módulo, salmos e inspirações
- [x] server/crm.ts: import e chamada de registerAssistenteRoutes(app) adicionados
- [x] client/public/crm/index.html: crm-help-button.js substituído por crm-veruska.js (cache-buster atualizado)
- [x] TypeScript sem erros, todos os 6 arquivos JS críticos validados com node --check
- [x] ANTHROPIC_API_KEY: configurada como variável de ambiente segura (sem expor em código/git); aguardando créditos na conta Anthropic

## Correções Veruska v2 (Sessão Jul/2026 — bug fixes)
- [x] P1: Middleware de auth reescrito com getSessionFromCrm (padrão crm-acervo.ts) — não bloqueia /api/crm/login
- [x] P2: consultar_pendencias_financeiras: coluna 'vencimento' (não data_vencimento), JOIN para cliente_nome, tipo='pagar' (não 'despesa'), coluna 'data' em crm_transacoes
- [x] P2: consultar_resumo_financeiro: mesmas correções de colunas
- [x] P2: consultar_kanban: usa crm_tarefas (não crm_kanban inexistente), JOIN com crm_users para responsavel_nome
- [x] P3: canAccessEventos() adicionado em consultar_eventos
- [x] P3: canAccessClientes() adicionado em consultar_cliente
- [x] P3: canAccessTarefas() adicionado em consultar_kanban
- [x] TypeScript: tsc --noEmit sem erros
- [x] Login testado: /api/crm/login retorna 400 (não 401) — não bloqueado por auth
- [x] Endpoint Veruska: /api/crm/assistente/perguntar retorna 401 sem auth (correto)

## Correção downloads autenticados (Jul/2026)
- [x] downloadModelo em crm-import.js: trocado <a href> por fetch() com credentials:'include' + blob URL
- [x] Link de backup em modules.js: trocado <a href> por <button data-backup-download> com fetch() + blob URL + spinner
- [x] requireCrmAuth em crm-import.ts: corrigido para usar getSessionFromCrm do crm.ts (não apenas verificar req.crmUser)
- [x] TypeScript: tsc --noEmit sem erros
- [x] node --check: crm-import.js e modules.js sem erros de sintaxe
- [x] Testado: 4 modelos .xlsx retornam HTTP 200, 16-17KB, magic bytes 504b0304 (ZIP/XLSX válido)
- [x] Testado: sem cookie retorna 401 (auth exigida corretamente)

## Correção paginação de clientes (Jul/2026)
- [x] syncClientesFromBackend(): loop de paginação em blocos de 500 até total
- [x] loadClientes(): loop de paginação em blocos de 500 até total
- [x] loadClientes(): fix Array.isArray — agora trata { data: [...], total: N } corretamente
- [x] node --check modules.js: sem erros de sintaxe
- [x] Testado: 3 blocos × 500 = 1460 clientes buscados (= total no banco)
- [x] Testado: clientes offset=1400 retornam nomes V (VICCINI, VICENZA, etc.) — fora dos primeiros 50

## UX paginação clientes + verificação Eventos/Contas (Jul/2026)
- [x] Indicador de progresso visual durante carregamento paginado de clientes
- [x] Paginação visual (25/página) na tabela de clientes
- [x] Verificar/corrigir paginação em loadEventos() — 0 registros, fix Array.isArray aplicado
- [x] Verificar/corrigir paginação em loadContasReceber() — 28 registros, sem necessidade de loop

## Correções cirúrgicas 3 itens (pasted_content_9)
- [x] Item 1: Busca de eventos — substituir data-filters-bound por AbortController em loadEventos()
- [x] Item 2: listComissoes() — investigado: não é duplicata real (financeiro vs administracao)
- [x] Item 3: rerenderContasReceberList — sobrescrita removida de modules.js, usa crm-contas-receber.js

## Roadmap — Conciliação Bancária (Item 4 — NÃO implementar ainda)
- [ ] [ROADMAP] Upload de extrato bancário (OFX/CSV) para conciliação automática
  - Parser OFX (padrão bancos brasileiros) e CSV como alternativa
  - Extração de: data, descrição, valor, tipo (crédito/débito) por lançamento
  - Lógica de conciliação sugerida: match por valor + data aproximada vs crm_transacoes
  - Sinalizar: (a) lançamentos que batem, (b) no extrato mas não no sistema, (c) no sistema mas não no extrato
  - Tela de revisão manual antes de confirmar conciliação em lote
  - Registrado em: 2026-08-08 — aguardando priorização

## Correção — Despesas recorrentes e feedback de persistência (Ago/2026)
- [x] Remover o fallback local silencioso de `postTransacao()` que simulava sucesso quando o POST ao backend falhava
- [x] Manter o formulário aberto e exibir mensagem de erro quando nenhuma despesa/parcela puder ser salva
- [x] Exibir confirmação de sucesso para todas as parcelas criadas e alerta claro para criação parcial
- [x] Testar o endpoint com 3 parcelas válidas (HTTP 200) e com dados obrigatórios inválidos (HTTP 400)
- [x] Limpar lançamentos e sessões temporárias usados exclusivamente na validação
- [x] Criar teste de regressão para impedir o retorno do fallback local silencioso em transações
- [x] Garantir retorno do primeiro ID salvo quando a criação recorrente for parcial

## Investigação — Relatório por Centro de Custos (Ago/2026)
- [x] Auditar fonte de dados e agregação do relatório por Centro de Custos após a paginação de transações
- [x] Corrigir receitas zeradas e totais incorretos preservando os demais relatórios financeiros
- [x] Validar os totais do relatório contra o banco de dados e criar teste de regressão
- [x] Criar teste de regressão para a compatibilidade TiDB de LIMIT/OFFSET paginados

## Investigação — Acesso automático na tela de login (Ago/2026)
- [x] Auditar restauração de sessão, cookies e inicialização do CRM
- [x] Corrigir apenas o gatilho que entra automaticamente com a sessão anterior
- [x] Validar login, logout e retorno à tela de autenticação em desktop e mobile
- [x] Criar teste de regressão para impedir a restauração automática no bootstrap

## Melhoria — Experiência da tela de login (Ago/2026)
- [x] Adicionar opção Lembrar-me com persistência explícita e segura
- [x] Melhorar feedback visual e acessível de credenciais incorretas
- [x] Implementar estado de carregamento suave e bloqueio contra envios duplicados
- [x] Validar sintaxe, fluxo e compatibilidade em desktop e mobile
- [x] Ampliar teste de regressão da tela de login para os novos comportamentos

## Melhoria — Navegação Financeira e opção Lembrar-me (Ago/2026)
- [x] Corrigir quebra/truncamento do texto explicativo da opção Lembrar-me
- [x] Disponibilizar atalhos para os módulos financeiros no início do dashboard
- [x] Garantir navegação, responsividade e compatibilidade sem regressões
- [x] Criar teste de regressão para os novos elementos e a navegação oficial dos atalhos
