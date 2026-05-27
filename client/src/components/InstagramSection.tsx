import { motion } from "framer-motion";
import { Instagram, ExternalLink } from "lucide-react";

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
            Veja os bastidores, montagens e eventos da SAMS Locações no Instagram. Conteúdo exclusivo, dicas de design de stands e muito mais.
          </p>
        </motion.div>

        {/* Instagram Feed Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-white rounded-lg shadow-lg overflow-hidden border border-[oklch(0.92_0.005_240)]"
        >
          {/* Instagram Embed - Behold Widget */}
          <div className="w-full">
            <iframe
              src="https://behold.so/embed/samslocacoes"
              style={{
                width: "100%",
                height: "600px",
                border: "none",
                borderRadius: "8px",
              }}
              title="SAMS Locações Instagram Feed"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            />
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
            href="https://instagram.com/samslocacoes"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#833AB4] to-[#FD1D1D] text-white font-heading font-semibold rounded-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <Instagram size={20} />
            Siga-nos no Instagram
            <ExternalLink size={16} />
          </a>
          <p className="text-[oklch(0.5_0.02_240)] text-sm mt-4 font-sans">
            @samslocacoes • Acompanhe nossos stands, eventos e bastidores em tempo real
          </p>
        </motion.div>
      </div>
    </section>
  );
}
