import { useLocation, useParams } from "wouter";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Calendar, Clock, ArrowLeft, Tag, ArrowRight } from "lucide-react";
import { artigos } from "./Blog";

const conteudos: Record<string, { html: string }> = {
  "como-escolher-montadora-de-stands": {
    html: `
      <p>Participar de uma feira ou evento corporativo é uma oportunidade valiosa para a sua empresa gerar leads, fechar negócios e fortalecer a marca. Mas para aproveitar ao máximo esse investimento, a escolha da <strong>montadora de stands</strong> certa é fundamental.</p>

      <p>Neste artigo, reunimos os critérios mais importantes para você tomar a melhor decisão na hora de contratar uma <strong>empresa de montagem de stands para feiras</strong>.</p>

      <h2>1. Experiência no Mercado</h2>
      <p>O primeiro critério é a experiência. Uma <strong>montadora de stands</strong> com anos de atuação já enfrentou os desafios mais comuns do setor: prazos apertados, mudanças de projeto de última hora, logística complexa. Empresas como a <strong>SAMS Locações</strong>, com mais de 15 anos no mercado, carregam esse conhecimento acumulado que faz toda a diferença na execução.</p>
      <p>Pergunte: há quantos anos a empresa atua? Quantas feiras já atendeu? Quais são os maiores eventos em que já participou?</p>

      <h2>2. Portfólio de Projetos Realizados</h2>
      <p>Antes de contratar, solicite o portfólio. Analise a qualidade dos acabamentos, a criatividade dos projetos e a diversidade de clientes atendidos. Um bom portfólio de <strong>stands personalizados para feiras</strong> demonstra capacidade técnica e criativa.</p>
      <p>Observe se a empresa já atendeu clientes do seu setor ou de setores similares. Isso indica familiaridade com as necessidades específicas do seu mercado.</p>

      <h2>3. Capacidade de Atendimento Nacional</h2>
      <p>Se sua empresa participa de feiras em diferentes estados, é essencial contratar uma <strong>empresa de stands</strong> com cobertura nacional. Isso garante que o mesmo padrão de qualidade será entregue independentemente da cidade onde o evento acontece.</p>
      <p>A <strong>SAMS Locações</strong>, por exemplo, atende em todo o território nacional, com equipes especializadas que se deslocam para garantir a montagem e desmontagem em qualquer praça do Brasil.</p>

      <h2>4. Prazo de Entrega e Pontualidade</h2>
      <p>Em feiras e eventos, o prazo é inegociável. O stand precisa estar pronto antes da abertura ao público, sem exceções. Verifique a reputação da empresa em relação a prazos — converse com clientes anteriores ou leia avaliações no Google Meu Negócio.</p>
      <p>Uma <strong>montadora de stands confiável</strong> apresenta cronograma detalhado desde o início do projeto e cumpre cada etapa com rigor.</p>

      <h2>5. Serviços Complementares</h2>
      <p>Além da montagem estrutural, verifique se a empresa oferece serviços complementares como:</p>
      <ul>
        <li>Projeto 3D e renderização antes da execução</li>
        <li>Locação de mobiliário e equipamentos</li>
        <li>Sonorização e painéis de LED</li>
        <li>Paisagismo e decoração</li>
        <li>Desmontagem e logística pós-evento</li>
      </ul>
      <p>Contratar tudo com um único fornecedor simplifica a gestão e reduz riscos.</p>

      <h2>6. Transparência no Orçamento</h2>
      <p>Desconfie de orçamentos muito vagos ou que não detalham os itens incluídos. Uma boa <strong>empresa de montagem de stands</strong> apresenta proposta clara com especificação de materiais, serviços incluídos, prazo de execução e condições de pagamento.</p>

      <h2>Conclusão</h2>
      <p>Escolher a montadora de stands certa é um investimento estratégico. Priorize experiência, portfólio sólido, cobertura nacional e transparência. A <strong>SAMS Locações</strong> reúne todos esses atributos e está pronta para transformar a presença da sua empresa nas principais feiras do Brasil.</p>
      <p><strong>Solicite um orçamento gratuito</strong> e descubra como podemos ajudar sua empresa a se destacar.</p>
    `,
  },
  "tendencias-design-stands-2026": {
    html: `
      <p>O design de stands para feiras evoluiu significativamente nos últimos anos. Em 2026, as empresas que querem se destacar precisam estar atentas às tendências que combinam tecnologia, sustentabilidade e experiência do visitante.</p>

      <p>A <strong>SAMS Locações</strong> acompanha de perto essas transformações e traz neste artigo as principais <strong>tendências de design de stands para 2026</strong>.</p>

      <h2>1. Stands Imersivos com Tecnologia LED</h2>
      <p>Os <strong>painéis de LED</strong> de alta resolução deixaram de ser exclusividade de grandes marcas e se tornaram acessíveis para empresas de médio porte. Em 2026, a tendência é usar paredes e tetos de LED para criar ambientes imersivos que transportam o visitante para dentro da narrativa da marca.</p>
      <p>Stands com painéis LED de grande formato geram até 3x mais engajamento do que estruturas convencionais, segundo dados do setor de eventos.</p>

      <h2>2. Sustentabilidade como Diferencial</h2>
      <p>A preocupação ambiental chegou ao mercado de stands. Empresas estão optando por materiais recicláveis, estruturas reutilizáveis e sistemas de iluminação LED de baixo consumo. Além de reduzir o impacto ambiental, essa postura comunica valores importantes para o público B2B.</p>
      <p>Jardins verticais, madeira certificada e acabamentos naturais são elementos cada vez mais presentes nos <strong>stands personalizados para feiras</strong> em 2026.</p>

      <h2>3. Espaços de Relacionamento e Networking</h2>
      <p>O stand deixou de ser apenas um espaço de exposição de produtos. Em 2026, a tendência é criar <strong>áreas de relacionamento</strong> confortáveis, com sofás, mesas de reunião e até espaços para café. O objetivo é transformar o stand em um ponto de encontro que facilita conversas e negócios.</p>

      <h2>4. Identidade Visual Total e Coerência de Marca</h2>
      <p>Cada centímetro do stand precisa comunicar a identidade da marca. Em 2026, os projetos mais bem-sucedidos são aqueles que criam uma experiência visual coerente do chão ao teto, integrando cores, tipografia, iluminação e materiais de forma harmoniosa.</p>

      <h2>5. Stands Modulares de Alta Qualidade</h2>
      <p>A modularidade ganhou um upgrade em 2026. Os novos sistemas modulares permitem configurações altamente personalizadas, com acabamentos premium que antes só eram possíveis em stands sob medida. Isso democratizou o acesso a <strong>stands de alto impacto visual</strong> para empresas com orçamentos menores.</p>

      <h2>6. Integração Digital e QR Codes</h2>
      <p>A integração entre o stand físico e o digital é uma tendência consolidada. QR codes estrategicamente posicionados levam visitantes a catálogos digitais, vídeos institucionais e formulários de contato. Isso amplia o alcance do stand muito além do evento.</p>

      <h2>Conclusão</h2>
      <p>As tendências de 2026 apontam para stands mais tecnológicos, sustentáveis e centrados na experiência do visitante. A <strong>SAMS Locações</strong> está preparada para incorporar todas essas tendências nos seus projetos, garantindo que sua empresa se destaque nas principais feiras do Brasil.</p>
    `,
  },
  "quanto-custa-montar-stand-feiras": {
    html: `
      <p>Uma das perguntas mais frequentes que recebemos é: <strong>"Quanto custa montar um stand em feiras?"</strong>. A resposta honesta é: depende. Mas neste artigo vamos detalhar todos os fatores que influenciam o custo para que você possa planejar seu orçamento com inteligência.</p>

      <h2>Fatores que Determinam o Custo de um Stand</h2>

      <h3>1. Metragem do Stand</h3>
      <p>O tamanho é o principal fator de custo. Stands para feiras são geralmente medidos em metros quadrados (m²). Uma referência geral do mercado:</p>
      <ul>
        <li><strong>Stands pequenos (9 a 18 m²):</strong> ideais para empresas que estão começando a participar de feiras</li>
        <li><strong>Stands médios (20 a 36 m²):</strong> o mais comum para empresas de médio porte</li>
        <li><strong>Stands grandes (40 m² ou mais):</strong> para empresas que querem máximo impacto e presença de marca</li>
      </ul>

      <h3>2. Tipo de Estrutura</h3>
      <p>Existem três tipos principais de estrutura, cada um com faixa de preço diferente:</p>
      <ul>
        <li><strong>Stand modular:</strong> estrutura padronizada, mais econômica, com boa qualidade visual</li>
        <li><strong>Stand híbrido:</strong> combina elementos modulares com personalizações específicas</li>
        <li><strong>Stand personalizado:</strong> projeto exclusivo do zero, com maior investimento e maior impacto visual</li>
      </ul>

      <h3>3. Materiais e Acabamentos</h3>
      <p>A escolha dos materiais impacta diretamente no custo. Madeira MDF, vidro, aço, tecido tensionado, acrílico e alumínio têm preços diferentes. Acabamentos premium como pintura automotiva, revestimentos especiais e iluminação cênica elevam o valor do projeto.</p>

      <h3>4. Serviços Incluídos</h3>
      <p>Além da estrutura, considere no orçamento:</p>
      <ul>
        <li>Projeto 3D e aprovação visual</li>
        <li>Transporte e logística</li>
        <li>Montagem e desmontagem</li>
        <li>Mobiliário (mesas, cadeiras, balcões)</li>
        <li>Iluminação</li>
        <li>Sonorização e painéis de LED</li>
        <li>Paisagismo e decoração</li>
      </ul>

      <h3>5. Localização do Evento</h3>
      <p>Feiras em São Paulo, Rio de Janeiro e outras capitais costumam ter custos logísticos maiores. Para empresas sediadas no Sul do Brasil, participar de feiras em Novo Hamburgo, Caxias do Sul e Porto Alegre tende a ser mais econômico em termos de deslocamento.</p>

      <h2>Como Economizar sem Perder Qualidade</h2>
      <p>Algumas estratégias para otimizar o investimento:</p>
      <ul>
        <li><strong>Planeje com antecedência:</strong> contratações de última hora sempre custam mais</li>
        <li><strong>Reutilize a estrutura:</strong> stands modulares podem ser reconfigurados para diferentes feiras</li>
        <li><strong>Priorize o impacto visual:</strong> invista nos elementos que mais chamam atenção (fachada, iluminação, painel de LED)</li>
        <li><strong>Solicite múltiplos orçamentos:</strong> compare propostas de pelo menos 3 montadoras</li>
      </ul>

      <h2>Conclusão</h2>
      <p>O custo de montagem de um stand varia muito conforme metragem, tipo de estrutura e serviços incluídos. O mais importante é alinhar o investimento com os objetivos de negócio da sua empresa na feira.</p>
      <p>A <strong>SAMS Locações</strong> oferece orçamentos gratuitos e personalizados para cada projeto. Entre em contato e descubra a melhor solução para o seu orçamento.</p>
    `,
  },
  "maiores-eventos-negocios-brasil-2026": {
    html: `
      <p>O Brasil é um dos países com maior número de feiras e eventos corporativos da América Latina. Em 2026, o calendário está repleto de oportunidades para empresas que querem expandir seus negócios, gerar leads e fortalecer sua presença de marca.</p>

      <p>A <strong>SAMS Locações</strong> preparou este guia completo com os principais eventos de negócios do Brasil em 2026 para você planejar sua participação com antecedência.</p>

      <h2>Feiras de Destaque em 2026</h2>

      <h3>FEIPLAR — São Paulo/SP (Maio)</h3>
      <p>A Feira Internacional de Plásticos, Borracha e Afins é um dos maiores eventos do setor de plásticos da América Latina. Realizada no Expo Center Norte, em São Paulo, reúne expositores de todo o mundo e atrai compradores de mais de 60 países.</p>

      <h3>FISPAL FOOD SERVICE — São Paulo/SP (Junho)</h3>
      <p>Uma das maiores feiras de alimentação fora do lar do mundo. Realizada no Expo Center Norte, é obrigatória para empresas do setor de food service, hospitalidade e gastronomia.</p>

      <h3>AGRISHOW — Ribeirão Preto/SP (Junho)</h3>
      <p>A maior feira de tecnologia agrícola das Américas. Realizada em Ribeirão Preto, atrai produtores rurais, cooperativas e empresas do agronegócio de todo o Brasil e do exterior.</p>

      <h3>EXPODIRETO — Não-Me-Toque/RS (Julho)</h3>
      <p>Uma das maiores feiras de agronegócio do Sul do Brasil. Realizada em Não-Me-Toque, no Rio Grande do Sul, é referência para o setor agrícola da região.</p>

      <h3>FENAC — Novo Hamburgo/RS (Julho)</h3>
      <p>A Feira Nacional do Calçado é um dos eventos mais importantes do setor calçadista brasileiro. Realizada no Pavilhão FENAC, em Novo Hamburgo, reúne fabricantes, fornecedores e compradores do setor.</p>

      <h3>MERCOPAR — Caxias do Sul/RS (Agosto)</h3>
      <p>A maior feira de subcontratação industrial da América Latina. Realizada em Caxias do Sul, é referência para o setor metal-mecânico, automotivo e de manufatura.</p>

      <h3>FEIMEC — São Paulo/SP (Agosto)</h3>
      <p>A Feira Internacional de Máquinas e Equipamentos é um dos maiores eventos do setor industrial do Brasil. Realizada no Expo Center Norte, atrai compradores de toda a América Latina.</p>

      <h3>AUTOMEC — São Paulo/SP (Agosto)</h3>
      <p>A maior feira de autopeças e serviços automotivos da América Latina. Realizada no Expo Center Norte, é obrigatória para empresas do setor automotivo.</p>

      <h3>INTERMODAL — São Paulo/SP (Setembro)</h3>
      <p>A maior feira de logística, transporte e comércio exterior da América Latina. Realizada no Expo Center Norte, reúne empresas de logística, transportadoras e operadores de comércio exterior.</p>

      <h3>EXPOAGAS — Porto Alegre/RS (Outubro)</h3>
      <p>A maior feira do setor supermercadista do Rio Grande do Sul. Realizada em Porto Alegre, é referência para fornecedores e varejistas do setor de alimentos e bebidas.</p>

      <h2>Como se Preparar para as Feiras de 2026</h2>
      <p>Para aproveitar ao máximo cada evento, recomendamos:</p>
      <ul>
        <li><strong>Defina seus objetivos:</strong> geração de leads, lançamento de produto, fortalecimento de marca ou fechamento de negócios</li>
        <li><strong>Reserve o espaço com antecedência:</strong> os melhores locais se esgotam rapidamente</li>
        <li><strong>Contrate a montadora com pelo menos 60 dias de antecedência:</strong> isso garante tempo para projeto, aprovação e produção</li>
        <li><strong>Treine sua equipe:</strong> o stand é o palco, mas são as pessoas que fecham os negócios</li>
      </ul>

      <h2>Conclusão</h2>
      <p>O calendário de feiras de 2026 está cheio de oportunidades. A <strong>SAMS Locações</strong> já está confirmada em vários desses eventos e pode ajudar sua empresa a se destacar com um stand de alto impacto visual.</p>
      <p>Entre em contato agora e garanta seu orçamento para as feiras de 2026.</p>
    `,
  },
};

export default function BlogArtigo() {
  const params = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const slug = params.slug;

  const artigo = artigos.find((a) => a.slug === slug);
  const conteudo = conteudos[slug];

  if (!artigo || !conteudo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Artigo não encontrado</h1>
          <button onClick={() => navigate("/blog")} className="text-[oklch(0.75_0.14_75)] font-semibold">
            Voltar ao Blog
          </button>
        </div>
      </div>
    );
  }

  const outrosArtigos = artigos.filter((a) => a.slug !== slug).slice(0, 2);

  return (
    <>
      <Helmet>
        <title>{artigo.titulo} | SAMS Locações</title>
        <meta name="description" content={artigo.resumo} />
        <link rel="canonical" href={`https://samslocacoes.com.br/blog/${artigo.slug}`} />
        <meta property="og:title" content={artigo.titulo} />
        <meta property="og:description" content={artigo.resumo} />
        <meta property="og:image" content={artigo.imagem} />
        <meta property="og:url" content={`https://samslocacoes.com.br/blog/${artigo.slug}`} />
        <meta property="og:type" content="article" />
      </Helmet>
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero do Artigo */}
      <section className="relative pt-32 pb-16 bg-[oklch(0.18_0.07_240)] overflow-hidden">
        <div className="absolute inset-0">
          <img src={artigo.imagem} alt={artigo.titulo} className="w-full h-full object-cover opacity-20" />
        </div>
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <button
              onClick={() => navigate("/blog")}
              className="flex items-center gap-2 text-white/60 hover:text-white text-sm font-sans mb-6 transition-colors"
            >
              <ArrowLeft size={16} />
              Voltar ao Blog
            </button>

            <div className="flex items-center gap-4 mb-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-heading font-semibold text-[oklch(0.85_0.10_78)] uppercase tracking-wide">
                <Tag size={12} />
                {artigo.categoria}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-white/60 font-sans">
                <Calendar size={12} />
                {artigo.data}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-white/60 font-sans">
                <Clock size={12} />
                {artigo.tempoLeitura} de leitura
              </span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white font-bold leading-tight">
              {artigo.titulo}
            </h1>
          </motion.div>
        </div>
      </section>

      {/* Conteúdo do Artigo */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Texto principal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-2"
            >
              <div
                className="prose prose-lg max-w-none
                  prose-headings:font-display prose-headings:text-[oklch(0.18_0.07_240)] prose-headings:font-bold
                  prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                  prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                  prose-p:text-[oklch(0.4_0.02_240)] prose-p:leading-relaxed prose-p:font-sans prose-p:mb-4
                  prose-strong:text-[oklch(0.22_0.07_240)]
                  prose-ul:text-[oklch(0.4_0.02_240)] prose-ul:font-sans
                  prose-li:mb-2"
                dangerouslySetInnerHTML={{ __html: conteudo.html }}
              />

              {/* CTA inline */}
              <div className="mt-12 bg-[oklch(0.97_0.003_240)] border border-[oklch(0.92_0.005_240)] rounded-sm p-8">
                <h3 className="font-display text-xl text-[oklch(0.18_0.07_240)] font-bold mb-3">
                  Precisa de uma montadora de stands confiável?
                </h3>
                <p className="text-[oklch(0.5_0.02_240)] text-sm font-sans mb-5">
                  A SAMS Locações tem mais de 15 anos de experiência em montagem de stands para feiras e eventos em todo o Brasil. Solicite seu orçamento gratuito agora.
                </p>
                <button
                  onClick={() => navigate("/orcamento")}
                  className="bg-[oklch(0.75_0.14_75)] hover:bg-[oklch(0.82_0.12_78)] text-[oklch(0.12_0.02_240)] font-heading font-bold text-sm px-6 py-3 rounded-sm tracking-wide transition-all duration-300"
                >
                  Solicitar Orçamento Gratuito
                </button>
              </div>
            </motion.div>

            {/* Sidebar */}
            <motion.aside
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="lg:col-span-1"
            >
              {/* Sobre a SAMS */}
              <div className="bg-[oklch(0.18_0.07_240)] rounded-sm p-6 mb-6">
                <h3 className="font-heading text-sm font-bold text-[oklch(0.85_0.10_78)] uppercase tracking-wide mb-3">
                  Sobre a SAMS Locações
                </h3>
                <p className="text-white/70 text-sm font-sans leading-relaxed mb-4">
                  Especialistas em montagem de stands para feiras e eventos corporativos há mais de 15 anos. Atendimento em todo o Brasil.
                </p>
                <a
                  href="https://wa.me/5551998827054"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[oklch(0.75_0.14_75)] font-heading font-semibold text-sm hover:gap-3 transition-all duration-200"
                >
                  Falar pelo WhatsApp
                  <ArrowRight size={14} />
                </a>
              </div>

              {/* Outros artigos */}
              <div>
                <h3 className="font-heading text-sm font-bold text-[oklch(0.4_0.02_240)] uppercase tracking-wide mb-4">
                  Outros Artigos
                </h3>
                <div className="space-y-4">
                  {outrosArtigos.map((outro) => (
                    <div
                      key={outro.slug}
                      className="group cursor-pointer"
                      onClick={() => navigate(`/blog/${outro.slug}`)}
                    >
                      <div className="aspect-[16/9] rounded-sm overflow-hidden mb-2">
                        <img
                          src={outro.imagem}
                          alt={outro.titulo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <h4 className="font-display text-sm text-[oklch(0.18_0.07_240)] font-bold leading-tight group-hover:text-[oklch(0.75_0.14_75)] transition-colors duration-200">
                        {outro.titulo}
                      </h4>
                    </div>
                  ))}
                </div>
              </div>
            </motion.aside>
          </div>
        </div>
      </section>

      <Footer />
    </div>
    </>
  );
}
