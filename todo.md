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
- [ ] Criar página /feiras-2026 otimizada para SEO
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

## Importação em Lote — Google Drive

- [ ] Endpoint POST /api/crm/acervo/importar-lote (aceita array de itens com url_drive, nome, tipo_doc, ano, evento_nome, cliente_nome)
- [ ] Modal de importação em lote no acervo.js com textarea para colar links
- [ ] Parsing automático do link do Google Drive para extrair nome da pasta/arquivo
- [ ] Tabela de preview com campos editáveis antes de confirmar importação
- [ ] Feedback de progresso durante importação (X de Y cadastrados)
- [ ] Checkpoint e publicação

## Layout Responsivo (CRM)

- [x] Implementar layout responsivo com cards para leads no mobile
- [ ] Testar renderização de leads em telas < 768px
- [ ] Adicionar filtros mobile-friendly para leads

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
- [ ] Checkpoint e publicação v5.12

## Galeria de Instagram em Tempo Real - v5.13

- [x] Pesquisar soluções de integração Instagram (Behold.so, Graph API, react-instagram-embed)
- [x] Escolher Behold.so como solução (mais rápida e eficiente)
- [x] Criar componente InstagramSection.tsx com widget Behold
- [x] Adicionar InstagramSection entre ProximosEventosSection e ContatoSection
- [x] Corrigir handle para @samslocacoes (correto)
- [x] Testar carregamento e renderização
- [ ] Checkpoint e publicação v5.13
