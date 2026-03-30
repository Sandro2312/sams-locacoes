import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Calendar, Clock, ArrowRight, Tag } from "lucide-react";

export const artigos = [
  {
    slug: "como-escolher-montadora-de-stands",
    titulo: "Como Escolher uma Montadora de Stands para Sua Empresa",
    resumo: "Descubra os critérios essenciais para escolher a empresa certa para montar o stand da sua empresa em feiras e eventos corporativos. Experiência, portfólio e prazo são apenas o começo.",
    categoria: "Dicas",
    data: "28 de março de 2026",
    tempoLeitura: "6 min",
    imagem: "https://d2xsxph8kpxj0f.cloudfront.net/310519663116701243/YqfJkXFtpDqUvVsMHfnp8h/COIM-FIMEC2026_0b7df077.jpeg",
    palavrasChave: ["montadora de stands", "empresa de stands", "como escolher montadora"],
  },
  {
    slug: "tendencias-design-stands-2026",
    titulo: "Tendências de Design de Stands para 2026",
    resumo: "O mercado de stands evoluiu muito. Confira as principais tendências de design, materiais e tecnologia que vão dominar as feiras e eventos corporativos em 2026.",
    categoria: "Tendências",
    data: "25 de março de 2026",
    tempoLeitura: "7 min",
    imagem: "https://d2xsxph8kpxj0f.cloudfront.net/310519663116701243/YqfJkXFtpDqUvVsMHfnp8h/BIQ-FIMEC2026(2)_a2069f32.jpeg",
    palavrasChave: ["tendências stands 2026", "design de stands", "stands modernos"],
  },
  {
    slug: "quanto-custa-montar-stand-feiras",
    titulo: "Quanto Custa Montar um Stand em Feiras? Guia Completo de Preços",
    resumo: "Entenda os fatores que influenciam o custo de montagem de stands para feiras: metragem, tipo de estrutura, serviços adicionais e como planejar seu orçamento com inteligência.",
    categoria: "Orçamento",
    data: "20 de março de 2026",
    tempoLeitura: "8 min",
    imagem: "https://d2xsxph8kpxj0f.cloudfront.net/310519663116701243/YqfJkXFtpDqUvVsMHfnp8h/Stickfran-FIMEC2026_9ae9b6ef.jpeg",
    palavrasChave: ["custo montagem stand", "preço stand feira", "orçamento stand"],
  },
  {
    slug: "maiores-eventos-negocios-brasil-2026",
    titulo: "Os Maiores Eventos de Negócios do Brasil em 2026",
    resumo: "Calendário completo com as principais feiras e eventos corporativos do Brasil em 2026. Saiba onde e quando sua empresa deve marcar presença para gerar mais negócios.",
    categoria: "Eventos",
    data: "15 de março de 2026",
    tempoLeitura: "5 min",
    imagem: "https://d2xsxph8kpxj0f.cloudfront.net/310519663116701243/YqfJkXFtpDqUvVsMHfnp8h/stand-5_ea936cfd.jpg",
    palavrasChave: ["feiras de negócios 2026", "eventos corporativos Brasil", "calendário feiras 2026"],
  },
];

export default function Blog() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero do Blog */}
      <section className="bg-[oklch(0.18_0.07_240)] pt-32 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 border border-[oklch(0.75_0.14_75)/50] bg-[oklch(0.75_0.14_75)/10] text-[oklch(0.85_0.10_78)] px-4 py-1.5 rounded-full text-xs font-heading font-semibold tracking-[0.2em] uppercase mb-6">
              Blog SAMS Locações
            </div>
            <h1 className="font-display text-4xl sm:text-5xl text-white font-bold leading-tight mb-4">
              Dicas e Tendências sobre{" "}
              <span className="italic text-[oklch(0.75_0.14_75)]">Montagem de Stands</span>
            </h1>
            <p className="text-white/70 text-lg max-w-2xl mx-auto font-sans leading-relaxed">
              Conteúdo especializado sobre stands para feiras, eventos corporativos, tendências de design e estratégias para maximizar o impacto da sua marca.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Grid de Artigos */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {artigos.map((artigo, i) => (
              <motion.article
                key={artigo.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group cursor-pointer bg-white border border-[oklch(0.92_0.005_240)] rounded-sm overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                onClick={() => navigate(`/blog/${artigo.slug}`)}
              >
                {/* Imagem */}
                <div className="aspect-[16/9] overflow-hidden">
                  <img
                    src={artigo.imagem}
                    alt={`${artigo.titulo} - Blog SAMS Locações`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Conteúdo */}
                <div className="p-6">
                  {/* Categoria e meta */}
                  <div className="flex items-center gap-4 mb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-heading font-semibold text-[oklch(0.75_0.14_75)] uppercase tracking-wide">
                      <Tag size={12} />
                      {artigo.categoria}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-[oklch(0.6_0.02_240)] font-sans">
                      <Calendar size={12} />
                      {artigo.data}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-[oklch(0.6_0.02_240)] font-sans">
                      <Clock size={12} />
                      {artigo.tempoLeitura}
                    </span>
                  </div>

                  {/* Título */}
                  <h2 className="font-display text-xl text-[oklch(0.18_0.07_240)] font-bold leading-tight mb-3 group-hover:text-[oklch(0.75_0.14_75)] transition-colors duration-200">
                    {artigo.titulo}
                  </h2>

                  {/* Resumo */}
                  <p className="text-[oklch(0.5_0.02_240)] text-sm font-sans leading-relaxed mb-4">
                    {artigo.resumo}
                  </p>

                  {/* CTA */}
                  <div className="flex items-center gap-2 text-[oklch(0.75_0.14_75)] font-heading font-semibold text-sm group-hover:gap-3 transition-all duration-200">
                    Ler artigo completo
                    <ArrowRight size={16} />
                  </div>
                </div>
              </motion.article>
            ))}
          </div>

          {/* CTA de Orçamento */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-16 bg-[oklch(0.18_0.07_240)] rounded-sm p-10 text-center"
          >
            <h2 className="font-display text-2xl sm:text-3xl text-white font-bold mb-4">
              Pronto para montar seu stand?
            </h2>
            <p className="text-white/70 text-base font-sans mb-6 max-w-xl mx-auto">
              Solicite um orçamento gratuito e descubra como a SAMS Locações pode transformar a presença da sua empresa nas feiras de 2026.
            </p>
            <button
              onClick={() => navigate("/orcamento")}
              className="bg-[oklch(0.75_0.14_75)] hover:bg-[oklch(0.82_0.12_78)] text-[oklch(0.12_0.02_240)] font-heading font-bold text-sm px-8 py-4 rounded-sm tracking-wide transition-all duration-300 shadow-xl hover:shadow-2xl"
            >
              Solicitar Orçamento Gratuito
            </button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
