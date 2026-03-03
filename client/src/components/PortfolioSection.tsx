import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn, Star } from "lucide-react";

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663116701243/YqfJkXFtpDqUvVsMHfnp8h";

const projetos = [
  {
    id: 1,
    titulo: "Stand Neugebauer",
    cliente: "Neugebauer",
    evento: "Fispal Food Service",
    categoria: "Personalizado",
    imagem: `${CDN}/stand-2_8fb438ec.jpg`,
    vip: true,
    descricao: "Stand premium com design exclusivo para a tradicional marca de chocolates, destacando a identidade visual da marca com iluminação especial.",
  },
  {
    id: 2,
    titulo: "Stand Água da Serra",
    cliente: "Água da Serra",
    evento: "Expo Bebidas",
    categoria: "Personalizado",
    imagem: `${CDN}/stand-3_15ff9616.jpg`,
    vip: true,
    descricao: "Projeto sofisticado com elementos naturais e modernos, refletindo a pureza e qualidade da marca de águas premium.",
  },
  {
    id: 3,
    titulo: "Stand COIM",
    cliente: "COIM",
    evento: "Feiplastic",
    categoria: "Híbrido",
    imagem: `${CDN}/stand-6_84c9a245.jpg`,
    vip: true,
    descricao: "Stand híbrido de alto impacto para empresa do setor químico, com área de demonstração e espaço para reuniões de negócios.",
  },
  {
    id: 4,
    titulo: "Stand Telecom",
    cliente: "Telecom",
    evento: "Campus Party",
    categoria: "Personalizado",
    imagem: `${CDN}/stand-premium_73b70ee2.webp`,
    vip: true,
    descricao: "Stand tecnológico com integração de displays interativos e estrutura futurista para empresa do setor de telecomunicações.",
  },
  {
    id: 5,
    titulo: "Stand Corporativo",
    cliente: "Cliente Corporativo",
    evento: "Feira Internacional",
    categoria: "Modular",
    imagem: `${CDN}/stand-4_2b54c8c6.jpg`,
    vip: false,
    descricao: "Stand modular elegante com acabamento premium e sinalização de alto impacto para evento internacional.",
  },
  {
    id: 6,
    titulo: "Cenografia Corporativa",
    cliente: "Evento Corporativo",
    evento: "Convenção Nacional",
    categoria: "Cenografia",
    imagem: `${CDN}/cenografia-1_7f6fa172.webp`,
    vip: false,
    descricao: "Cenografia completa para convenção nacional com palco, iluminação cênica e ambientação temática.",
  },
];

const categorias = ["Todos", "Personalizado", "Modular", "Híbrido", "Cenografia"];

export default function PortfolioSection() {
  const [filtro, setFiltro] = useState("Todos");
  const [selecionado, setSelecionado] = useState<typeof projetos[0] | null>(null);

  const filtrados = filtro === "Todos" ? projetos : projetos.filter((p) => p.categoria === filtro);

  return (
    <section id="portfolio" className="py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="section-divider" />
            <span className="font-heading text-xs font-semibold tracking-[0.25em] uppercase text-[oklch(0.75_0.14_75)]">
              Portfólio
            </span>
            <span className="section-divider" />
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-[oklch(0.18_0.07_240)] font-bold leading-tight mb-4">
            Projetos que{" "}
            <span className="italic text-[oklch(0.75_0.14_75)]">Encantam</span>
          </h2>
          <p className="text-[oklch(0.5_0.02_240)] text-base max-w-2xl mx-auto font-sans leading-relaxed">
            Conheça alguns dos projetos que realizamos para grandes marcas brasileiras. 
            Cada stand conta uma história de excelência e dedicação.
          </p>
        </motion.div>

        {/* VIP Clients Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-[oklch(0.22_0.07_240)] rounded-sm p-6 mb-10 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <Star size={20} className="text-[oklch(0.75_0.14_75)]" fill="currentColor" />
            <span className="font-heading font-semibold text-white text-sm tracking-wide">Clientes VIP</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {["Neugebauer", "Água da Serra", "COIM", "Telecom"].map((c) => (
              <span key={c} className="font-heading font-bold text-[oklch(0.85_0.10_78)] text-sm tracking-wide border-r border-white/20 last:border-0 pr-6 last:pr-0">
                {c}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setFiltro(cat)}
              className={`px-5 py-2 rounded-sm font-heading text-xs font-semibold tracking-wide transition-all duration-200 ${
                filtro === cat
                  ? "bg-[oklch(0.22_0.07_240)] text-white shadow-md"
                  : "bg-[oklch(0.97_0.003_240)] text-[oklch(0.4_0.02_240)] hover:bg-[oklch(0.94_0.005_240)]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence>
            {filtrados.map((projeto, i) => (
              <motion.div
                key={projeto.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, delay: 0.05 * i }}
                className="group relative rounded-sm overflow-hidden cursor-pointer card-elegant bg-[oklch(0.97_0.003_240)]"
                onClick={() => setSelecionado(projeto)}
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={projeto.imagem}
                    alt={projeto.titulo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.12_0.08_240)/90] via-[oklch(0.12_0.08_240)/40] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                  <div className="p-5 w-full">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-display font-bold text-lg leading-tight">{projeto.titulo}</p>
                        <p className="text-[oklch(0.85_0.10_78)] text-xs font-heading tracking-wide">{projeto.evento}</p>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-[oklch(0.75_0.14_75)] flex items-center justify-center">
                        <ZoomIn size={16} className="text-[oklch(0.12_0.02_240)]" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* VIP Badge */}
                {projeto.vip && (
                  <div className="absolute top-3 left-3 flex items-center gap-1 bg-[oklch(0.75_0.14_75)] text-[oklch(0.12_0.02_240)] px-2.5 py-1 rounded-full text-xs font-heading font-bold tracking-wide">
                    <Star size={10} fill="currentColor" />
                    VIP
                  </div>
                )}

                {/* Category badge */}
                <div className="absolute top-3 right-3 bg-[oklch(0.22_0.07_240)/80] backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-heading tracking-wide">
                  {projeto.categoria}
                </div>

                {/* Bottom info */}
                <div className="p-4">
                  <p className="font-display font-semibold text-[oklch(0.18_0.07_240)] text-base">{projeto.titulo}</p>
                  <p className="text-[oklch(0.5_0.02_240)] text-xs font-heading mt-0.5">{projeto.cliente} · {projeto.evento}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Instagram CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mt-12"
        >
          <p className="text-[oklch(0.5_0.02_240)] text-sm font-sans mb-3">
            Veja mais projetos no nosso Instagram
          </p>
          <a
            href="https://instagram.com/samslocacoesoficial"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-[oklch(0.22_0.07_240)] text-[oklch(0.22_0.07_240)] hover:bg-[oklch(0.22_0.07_240)] hover:text-white font-heading font-semibold text-sm px-6 py-3 rounded-sm tracking-wide transition-all duration-300"
          >
            @samslocacoesoficial
          </a>
        </motion.div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selecionado && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelecionado(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative max-w-3xl w-full bg-[oklch(0.18_0.07_240)] rounded-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelecionado(null)}
                className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-[oklch(0.75_0.14_75)] hover:text-[oklch(0.12_0.02_240)] transition-colors"
              >
                <X size={18} />
              </button>

              <div className="aspect-video overflow-hidden">
                <img
                  src={selecionado.imagem}
                  alt={selecionado.titulo}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-xl font-bold text-white mb-1">{selecionado.titulo}</h3>
                    <p className="text-[oklch(0.75_0.14_75)] text-sm font-heading">{selecionado.cliente} · {selecionado.evento}</p>
                  </div>
                  <span className="bg-[oklch(0.75_0.14_75)/20] text-[oklch(0.85_0.10_78)] px-3 py-1 rounded-full text-xs font-heading border border-[oklch(0.75_0.14_75)/30]">
                    {selecionado.categoria}
                  </span>
                </div>
                <p className="text-white/70 text-sm font-sans mt-3 leading-relaxed">{selecionado.descricao}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
