import { motion } from "framer-motion";
import { Instagram, ExternalLink, Camera, Star, Heart } from "lucide-react";

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663116701243/YqfJkXFtpDqUvVsMHfnp8h";
const CDN2 = "/manus-storage";

// Fotos reais dos projetos para o grid visual do Instagram
const instagramPosts = [
  {
    img: `${CDN2}/BeiraRio-BFShow2026-1_22cfe1a9.jpeg`,
    label: "Calçados Beira Rio · BF Show 2026",
  },
  {
    img: `${CDN2}/Neugebauer-Exposuper2026-2_b7e3c807.webp`,
    label: "Neugebauer · Exposuper 2026",
  },
  {
    img: `${CDN2}/Popper-CelebraShow2026-1_a8a105e2.jpg`,
    label: "Popper · Celebra Show 2026",
  },
  {
    img: `${CDN2}/SiryGlobal-Hospitalar2026-1_a4a914a2.jpeg`,
    label: "Siry Global · Hospitalar 2026",
  },
  {
    img: `${CDN}/BIQ-FIMEC2026(2)_a2069f32.jpeg`,
    label: "BiQ Adesivos · FIMEC 2026",
  },
  {
    img: `${CDN}/COIM-FIMEC2026_0b7df077.jpeg`,
    label: "COIM Brasil · FIMEC 2026",
  },
];

export default function InstagramSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-white to-[oklch(0.98_0.001_240)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="section-divider" />
            <span className="font-heading text-xs font-semibold tracking-[0.25em] uppercase text-[oklch(0.75_0.14_75)]">
              Redes Sociais
            </span>
            <span className="section-divider" />
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-[oklch(0.18_0.07_240)] font-bold leading-tight mb-4">
            Acompanhe nossos{" "}
            <span className="italic text-[oklch(0.75_0.14_75)]">Stands em Tempo Real</span>
          </h2>
          <p className="text-[oklch(0.5_0.02_240)] text-base max-w-2xl mx-auto font-sans leading-relaxed">
            Veja os bastidores, montagens e eventos da SAMS Locações no Instagram. Conteúdo exclusivo,
            dicas de design de stands e muito mais.
          </p>
        </motion.div>

        {/* Instagram Profile Card + Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[oklch(0.92_0.005_240)]"
        >
          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row items-center gap-6 px-6 py-8 border-b border-[oklch(0.93_0.005_240)] bg-gradient-to-r from-white to-[oklch(0.98_0.005_240)]">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCB045] p-0.5">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                  <img
                    src="https://d2xsxph8kpxj0f.cloudfront.net/310519663116701243/YqfJkXFtpDqUvVsMHfnp8h/sams-logo_9fc7a984.jpg"
                    alt="SAMS Locações"
                    className="w-full h-full object-cover rounded-full"
                    loading="lazy"
                  />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-[#833AB4] to-[#FD1D1D] rounded-full p-1">
                <Instagram size={12} className="text-white" />
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-heading font-bold text-xl text-[oklch(0.18_0.07_240)] mb-0.5">
                @samslocacoesoficial
              </h3>
              <p className="text-[oklch(0.5_0.02_240)] text-sm font-sans mb-3">
                Montadora de Stands · Feiras e Eventos Corporativos · Todo o Brasil
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-6 text-sm">
                <div className="text-center">
                  <span className="font-bold text-[oklch(0.18_0.07_240)] block">500+</span>
                  <span className="text-[oklch(0.6_0.02_240)]">Projetos</span>
                </div>
                <div className="w-px h-8 bg-[oklch(0.9_0.005_240)]" />
                <div className="text-center">
                  <span className="font-bold text-[oklch(0.18_0.07_240)] block">15+</span>
                  <span className="text-[oklch(0.6_0.02_240)]">Anos</span>
                </div>
                <div className="w-px h-8 bg-[oklch(0.9_0.005_240)]" />
                <div className="text-center">
                  <span className="font-bold text-[oklch(0.18_0.07_240)] block">BR</span>
                  <span className="text-[oklch(0.6_0.02_240)]">Nacional</span>
                </div>
              </div>
            </div>

            {/* Follow Button */}
            <a
              href="https://instagram.com/samslocacoesoficial"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#833AB4] to-[#FD1D1D] text-white font-heading font-semibold text-sm rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              <Instagram size={16} />
              Seguir
            </a>
          </div>

          {/* Photo Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-0.5 bg-[oklch(0.93_0.005_240)]">
            {instagramPosts.map((post, i) => (
              <motion.a
                key={i}
                href="https://instagram.com/samslocacoesoficial"
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className="relative group aspect-square overflow-hidden bg-[oklch(0.95_0.005_240)] block"
                aria-label={post.label}
              >
                <img
                  src={post.img}
                  alt={post.label}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center gap-2">
                    <Heart size={24} className="text-white fill-white" />
                    <span className="text-white text-xs font-heading font-semibold text-center px-2 leading-tight">
                      {post.label}
                    </span>
                  </div>
                </div>
                {/* Instagram icon badge */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="bg-white/90 rounded-full p-1">
                    <Instagram size={12} className="text-[#833AB4]" />
                  </div>
                </div>
              </motion.a>
            ))}
          </div>

          {/* Footer CTA */}
          <div className="px-6 py-5 text-center bg-[oklch(0.99_0.001_240)] border-t border-[oklch(0.93_0.005_240)]">
            <p className="text-[oklch(0.5_0.02_240)] text-sm font-sans mb-3">
              Veja mais projetos, bastidores e novidades no nosso perfil
            </p>
            <a
              href="https://instagram.com/samslocacoesoficial"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-heading font-semibold text-[oklch(0.18_0.07_240)] hover:text-[oklch(0.75_0.14_75)] transition-colors duration-200"
            >
              <ExternalLink size={14} />
              Ver mais no Instagram
            </a>
          </div>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mt-12"
        >
          <a
            href="https://instagram.com/samslocacoesoficial"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#833AB4] to-[#FD1D1D] text-white font-heading font-semibold rounded-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <Instagram size={20} />
            Siga-nos no Instagram
            <ExternalLink size={16} />
          </a>
          <p className="text-[oklch(0.5_0.02_240)] text-sm mt-4 font-sans">
            @samslocacoesoficial • Acompanhe nossos stands, eventos e bastidores em tempo real
          </p>
        </motion.div>
      </div>
    </section>
  );
}
