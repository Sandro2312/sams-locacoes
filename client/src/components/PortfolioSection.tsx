import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn, Star, Play } from "lucide-react";

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663116701243/YqfJkXFtpDqUvVsMHfnp8h";

const projetos = [
  // ── ExpoApras 2026 ──────────────────────────────────────────────────────────
  {
    id: 4,
    titulo: "Stand Neugebauer",
    cliente: "Neugebauer",
    evento: "ExpoApras 2026 — Pinhais/PR",
    categoria: "Personalizado",
    imagem: `${CDN}/STANDNEUGEBAUEREXPOAPRAS_90168df4.mp4`,
    video: `${CDN}/STANDNEUGEBAUEREXPOAPRAS_90168df4.mp4`,
    galeria: [] as string[],
    vip: true,
    descricao: "Stand de alto impacto para a Neugebauer na 43ª ExpoApras — maior feira supermercadista do Paraná. Projeto com identidade visual marcante, iluminação profissional e espaço de degustação. Expotrade Convention Center, Pinhais/PR.",
    feira: "ExpoApras 2026",
  },
  {
    id: 5,
    titulo: "Stand Aromasil",
    cliente: "Aromasil",
    evento: "ExpoApras 2026 — Pinhais/PR",
    categoria: "Personalizado",
    imagem: `${CDN}/STANDAROMASILEXPOAPRAS_1737f74e.mp4`,
    video: `${CDN}/STANDAROMASILEXPOAPRAS_1737f74e.mp4`,
    galeria: [] as string[],
    vip: false,
    descricao: "Stand personalizado para a Aromasil na ExpoApras 2026. Estrutura elegante com exposição de produtos e área de atendimento. 43ª Feira e Convenção Paranaense de Supermercados, Expotrade, Pinhais/PR.",
    feira: "ExpoApras 2026",
  },
  {
    id: 6,
    titulo: "Stand Popper",
    cliente: "Popper",
    evento: "ExpoApras 2026 — Pinhais/PR",
    categoria: "Personalizado",
    imagem: `${CDN}/STANDPOPPEREXPOAPRAS_819db55a.mp4`,
    video: `${CDN}/STANDPOPPEREXPOAPRAS_819db55a.mp4`,
    galeria: [] as string[],
    vip: false,
    descricao: "Stand criativo para a Popper na ExpoApras 2026. Projeto com layout funcional, identidade visual atrativa e excelente aproveitamento de espaço para exposição de produtos. Expotrade, Pinhais/PR.",
    feira: "ExpoApras 2026",
  },
  {
    id: 7,
    titulo: "Stand AlcaFoods",
    cliente: "AlcaFoods",
    evento: "ExpoApras 2026 — Pinhais/PR",
    categoria: "Personalizado",
    imagem: `${CDN}/STANDALCAFOODSEXPOAPRAS_a952fecc.mp4`,
    video: `${CDN}/STANDALCAFOODSEXPOAPRAS_a952fecc.mp4`,
    galeria: [] as string[],
    vip: false,
    descricao: "Stand completo para a AlcaFoods na ExpoApras 2026. Estrutura moderna com área de exposição de produtos alimentícios, iluminação destacada e identidade visual impactante. Expotrade, Pinhais/PR.",
    feira: "ExpoApras 2026",
  },
  // ── FIMEC 2026 ──────────────────────────────────────────────────────────────
  {
    id: 1,
    titulo: "Stand BiQ Adesivos",
    cliente: "BiQ Adesivos Bertoncouro",
    evento: "FIMEC 2026 — Novo Hamburgo/RS",
    categoria: "Personalizado",
    imagem: `${CDN}/BIQ-FIMEC2026(2)_a2069f32.jpeg`,
    video: `${CDN}/BIQ-FIMEC2026_bf465d42.mp4`,
    galeria: [
      `${CDN}/BIQ-FIMEC2026(2)_a2069f32.jpeg`,
      `${CDN}/BIQ-FIMEC2026(1)_6568c8ac.jpeg`,
      `${CDN}/BIQ-FIMEC2026_18287744.jpeg`,
    ],
    vip: true,
    descricao: "Stand premium de alto impacto para a BiQ Adesivos Bertoncouro na FIMEC 2026. Projeto com estrutura curvilínea, painéis LED de grande formato, parede verde e área de relacionamento. Um dos destaques da feira no Pavilhão FENAC, Novo Hamburgo/RS.",
    feira: "FIMEC 2026",
  },
  {
    id: 2,
    titulo: "Stand COIM Brasil",
    cliente: "COIM Brasil",
    evento: "FIMEC 2026 — Novo Hamburgo/RS",
    categoria: "Personalizado",
    imagem: `${CDN}/COIM-FIMEC2026_0b7df077.jpeg`,
    video: `${CDN}/COIM-FIMEC2026_5e571e23.mp4`,
    galeria: [
      `${CDN}/COIM-FIMEC2026_0b7df077.jpeg`,
    ],
    vip: true,
    descricao: "Stand sofisticado para a COIM Brasil na FIMEC 2026, com design em azul e branco, iluminação com réguas de LED, jardim vertical, área de reuniões e painel de sustentabilidade. Projeto que combina elegância e funcionalidade no Pavilhão FENAC, Novo Hamburgo/RS.",
    feira: "FIMEC 2026",
  },
  {
    id: 3,
    titulo: "Stand Grupo Stickfran",
    cliente: "Grupo Stickfran",
    evento: "FIMEC 2026 — Novo Hamburgo/RS",
    categoria: "Personalizado",
    imagem: `${CDN}/Stickfran-FIMEC2026_9ae9b6ef.jpeg`,
    video: `${CDN}/Stickfran-FIMEC2026_f6dafb06.mp4`,
    videoExtra: `${CDN}/Stickfran-FIMEC2026(1)_540a2ecf.mp4`,
    galeria: [
      `${CDN}/Stickfran-FIMEC2026_9ae9b6ef.jpeg`,
      `${CDN}/Stickfran-FIMEC2026(1)_2c6a8956.jpeg`,
    ],
    vip: true,
    descricao: "Stand de grande impacto para o Grupo Stickfran (TK / STK) na FIMEC 2026. Estrutura em preto com vitrines iluminadas exibindo a linha completa de componentes para calçados e artefatos. Painéis de LED e identidade visual marcante no Pavilhão FENAC, Novo Hamburgo/RS.",
    feira: "FIMEC 2026",
  },
];

const feiras = ["Todos", "ExpoApras 2026", "FIMEC 2026"];

type Projeto = typeof projetos[0] & { videoExtra?: string };

export default function PortfolioSection() {
  const [filtroFeira, setFiltroFeira] = useState("Todos");
  const [selecionado, setSelecionado] = useState<Projeto | null>(null);
  const [fotoAtiva, setFotoAtiva] = useState(0);
  const [videoAtivo, setVideoAtivo] = useState<string | null>(null);

  const filtrados = filtroFeira === "Todos"
    ? projetos
    : projetos.filter((p) => p.feira === filtroFeira);

  const abrirProjeto = (projeto: Projeto) => {
    setSelecionado(projeto);
    setFotoAtiva(0);
    // Para projetos só com vídeo (sem galeria de fotos), abre direto no vídeo
    if (projeto.galeria.length === 0 && projeto.video) {
      setVideoAtivo(projeto.video);
    } else {
      setVideoAtivo(null);
    }
  };

  const vipClientes = ["Neugebauer", "BiQ Adesivos", "COIM Brasil", "Grupo Stickfran"];

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
            Portfólio de{" "}
            <span className="italic text-[oklch(0.75_0.14_75)]">Stands Personalizados</span>
          </h2>
          <p className="text-[oklch(0.5_0.02_240)] text-base max-w-2xl mx-auto font-sans leading-relaxed">
            Conheça os <strong>stands personalizados para feiras</strong> que realizamos nas principais feiras do Brasil — <strong>ExpoApras 2026</strong> (Pinhais/PR) e <strong>FIMEC 2026</strong> (Novo Hamburgo/RS). <strong>Montagem de estandes corporativos</strong> com qualidade e pontualidade.
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
            {vipClientes.map((c) => (
              <span key={c} className="font-heading font-bold text-[oklch(0.85_0.10_78)] text-sm tracking-wide border-r border-white/20 last:border-0 pr-6 last:pr-0">
                {c}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Feira Filter Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {feiras.map((feira) => (
            <button
              key={feira}
              onClick={() => setFiltroFeira(feira)}
              className={`px-5 py-2 rounded-sm font-heading text-xs font-semibold tracking-wide transition-all duration-200 ${
                filtroFeira === feira
                  ? "bg-[oklch(0.22_0.07_240)] text-white shadow-md"
                  : "bg-[oklch(0.97_0.003_240)] text-[oklch(0.4_0.02_240)] hover:bg-[oklch(0.94_0.005_240)]"
              }`}
            >
              {feira}
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
                onClick={() => abrirProjeto(projeto)}
              >
                <div className="aspect-[4/3] overflow-hidden relative bg-[oklch(0.12_0.08_240)]">
                  {projeto.galeria.length > 0 ? (
                    <img
                      src={projeto.imagem}
                      alt={`Stand personalizado ${projeto.cliente} - Montagem de stands para feiras - SAMS Locações`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <video
                      src={projeto.video}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )}
                  {/* Video indicator */}
                  {projeto.video && (
                    <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                      <Play size={14} className="text-white ml-0.5" fill="white" />
                    </div>
                  )}
                  {/* Feira badge */}
                  <div className="absolute top-3 left-3 bg-[oklch(0.75_0.14_75)] text-[oklch(0.12_0.02_240)] px-2.5 py-1 rounded-full text-[10px] font-heading font-bold tracking-wide">
                    {projeto.feira}
                  </div>
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
                  <div className="absolute top-10 left-3 flex items-center gap-1 bg-[oklch(0.22_0.07_240)/90] text-[oklch(0.85_0.10_78)] px-2.5 py-1 rounded-full text-xs font-heading font-bold tracking-wide">
                    <Star size={10} fill="currentColor" />
                    VIP
                  </div>
                )}

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
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setSelecionado(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative max-w-4xl w-full bg-[oklch(0.18_0.07_240)] rounded-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelecionado(null)}
                className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-[oklch(0.75_0.14_75)] hover:text-[oklch(0.12_0.02_240)] transition-colors"
              >
                <X size={18} />
              </button>

              {/* Media viewer */}
              <div className="aspect-video overflow-hidden bg-black">
                {videoAtivo ? (
                  <video
                    key={videoAtivo}
                    src={videoAtivo}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                ) : selecionado.galeria.length > 0 ? (
                  <img
                    src={selecionado.galeria[fotoAtiva]}
                    alt={selecionado.titulo}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video
                    key={selecionado.video}
                    src={selecionado.video}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              {/* Thumbnails + video toggle */}
              {(selecionado.galeria.length > 0 || selecionado.videoExtra) && (
                <div className="flex items-center gap-2 px-4 pt-3 pb-1 overflow-x-auto">
                  {selecionado.galeria.map((foto, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setFotoAtiva(idx); setVideoAtivo(null); }}
                      className={`flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-all ${
                        !videoAtivo && fotoAtiva === idx
                          ? "border-[oklch(0.75_0.14_75)]"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={foto} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                  {selecionado.video && selecionado.galeria.length > 0 && (
                    <button
                      onClick={() => setVideoAtivo(selecionado.video!)}
                      className={`flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-all flex items-center justify-center bg-[oklch(0.12_0.08_240)] ${
                        videoAtivo === selecionado.video
                          ? "border-[oklch(0.75_0.14_75)]"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                      title="Assistir vídeo"
                    >
                      <Play size={20} className="text-white" fill="white" />
                    </button>
                  )}
                  {selecionado.videoExtra && (
                    <button
                      onClick={() => setVideoAtivo(selecionado.videoExtra!)}
                      className={`flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-all flex items-center justify-center bg-[oklch(0.12_0.08_240)] ${
                        videoAtivo === selecionado.videoExtra
                          ? "border-[oklch(0.75_0.14_75)]"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                      title="Assistir vídeo 2"
                    >
                      <div className="flex flex-col items-center">
                        <Play size={16} className="text-white" fill="white" />
                        <span className="text-white text-[9px] font-heading mt-0.5">2</span>
                      </div>
                    </button>
                  )}
                </div>
              )}

              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-xl font-bold text-white mb-1">{selecionado.titulo}</h3>
                    <p className="text-[oklch(0.75_0.14_75)] text-sm font-heading">{selecionado.cliente} · {selecionado.evento}</p>
                  </div>
                  <span className="bg-[oklch(0.75_0.14_75)/20] text-[oklch(0.85_0.10_78)] px-3 py-1 rounded-full text-xs font-heading border border-[oklch(0.75_0.14_75)/30] whitespace-nowrap">
                    {selecionado.feira}
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
