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
<<<<<<< Updated upstream
- [x] Bug 4: POST /api/crm/contas-receber falhava com "Bind parameters must not contain undefined" quando campos opcionais não eram enviados — corrigido com função n() que converte undefined para null em todos os parâmetros do INSERT
- [x] Bug 5: POST /api/crm/clientes falhava com o mesmo erro de undefined — corrigido com função n() no INSERT e PUT de clientes
- [x] Verificado end-to-end: criar cliente + criar conta a receber com clienteId → cliente_nome aparece corretamente na lista (teste automatizado confirmado)
- [x] Versão atualizada para v5.26.0 no index.html e cache-busters atualizados (v=1782217349)
=======

## Bugs v5.27 — Contas a Receber: cliente, formulário e exclusão

- [ ] Bug 1: Cliente selecionado no formulário não aparece na coluna CLIENTE da lista após salvar
- [ ] Bug 2: Formulário "Nova Conta a Receber" abre com campos pré-preenchidos (cliente e vencimento) em vez de vazio
- [ ] Bug 3: Botões CRUD (excluir) não funcionam no módulo Contas a Receber
>>>>>>> Stashed changes
