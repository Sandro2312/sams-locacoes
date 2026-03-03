import { motion } from "framer-motion";
import { Layers, Grid3X3, Blend, Palette, Wrench, Lightbulb } from "lucide-react";

const servicos = [
  {
    icon: Palette,
    title: "Stands Personalizados",
    desc: "Projetos exclusivos desenvolvidos sob medida para refletir a identidade única da sua marca. Do conceito ao projeto 3D, criamos ambientes que impressionam.",
    features: ["Projeto 3D exclusivo", "Materiais premium", "Identidade visual total", "Acabamento impecável"],
    highlight: true,
  },
  {
    icon: Grid3X3,
    title: "Stands Modulares",
    desc: "Solução econômica e de montagem ágil, ideal para empresas que participam de múltiplos eventos. Flexibilidade sem abrir mão da qualidade.",
    features: ["Montagem rápida", "Custo-benefício", "Reutilizável", "Configurações flexíveis"],
    highlight: false,
  },
  {
    icon: Blend,
    title: "Stands Híbridos",
    desc: "A combinação perfeita entre estrutura modular e elementos personalizados. O melhor dos dois mundos para maximizar impacto e otimizar investimento.",
    features: ["Personalização parcial", "Versatilidade", "Custo otimizado", "Alta performance visual"],
    highlight: false,
  },
  {
    icon: Lightbulb,
    title: "Cenografia para Eventos",
    desc: "Transformamos qualquer ambiente em uma experiência imersiva e memorável. Cenografias corporativas para palcos, auditórios e eventos temáticos.",
    features: ["Ambientação completa", "Iluminação cênica", "Elementos temáticos", "Impacto visual máximo"],
    highlight: false,
  },
  {
    icon: Layers,
    title: "Locação de Stands",
    desc: "Alugue estruturas de alto padrão para seu evento com toda a praticidade. Stands prontos para uso com design moderno e montagem incluída.",
    features: ["Entrega e montagem", "Manutenção inclusa", "Desmontagem pós-evento", "Modelos variados"],
    highlight: false,
  },
  {
    icon: Wrench,
    title: "Suporte Completo",
    desc: "Do planejamento à desmontagem, nossa equipe especializada está presente em cada etapa para garantir que tudo ocorra com perfeição.",
    features: ["Consultoria prévia", "Acompanhamento no evento", "Suporte técnico", "Logística nacional"],
    highlight: false,
  },
];

export default function ServicosSection() {
  return (
    <section id="servicos" className="py-24 bg-[oklch(0.97_0.003_240)] overflow-hidden">
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
              Nossos Serviços
            </span>
            <span className="section-divider" />
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-[oklch(0.18_0.07_240)] font-bold leading-tight mb-4">
            Soluções Completas para{" "}
            <span className="italic text-[oklch(0.75_0.14_75)]">Seu Evento</span>
          </h2>
          <p className="text-[oklch(0.5_0.02_240)] text-base max-w-2xl mx-auto font-sans leading-relaxed">
            Da concepção à desmontagem, oferecemos um portfólio completo de serviços para que sua marca 
            brilhe em qualquer feira ou evento corporativo.
          </p>
        </motion.div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicos.map((servico, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              className={`relative group rounded-sm overflow-hidden card-elegant ${
                servico.highlight
                  ? "bg-[oklch(0.22_0.07_240)] text-white"
                  : "bg-white text-[oklch(0.22_0.07_240)]"
              }`}
            >
              {/* Top accent line */}
              <div className={`h-1 w-full ${servico.highlight ? "bg-[oklch(0.75_0.14_75)]" : "bg-gradient-to-r from-[oklch(0.22_0.07_240)] to-[oklch(0.75_0.14_75)]"}`} />

              <div className="p-7">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-sm flex items-center justify-center mb-5 ${
                  servico.highlight
                    ? "bg-[oklch(0.75_0.14_75)/20] border border-[oklch(0.75_0.14_75)/30]"
                    : "bg-[oklch(0.97_0.003_240)] border border-[oklch(0.88_0.01_240)]"
                }`}>
                  <servico.icon
                    size={22}
                    className={servico.highlight ? "text-[oklch(0.75_0.14_75)]" : "text-[oklch(0.22_0.07_240)]"}
                  />
                </div>

                <h3 className={`font-display text-xl font-bold mb-3 ${
                  servico.highlight ? "text-white" : "text-[oklch(0.18_0.07_240)]"
                }`}>
                  {servico.title}
                </h3>

                <p className={`text-sm leading-relaxed mb-5 font-sans ${
                  servico.highlight ? "text-white/70" : "text-[oklch(0.5_0.02_240)]"
                }`}>
                  {servico.desc}
                </p>

                {/* Features */}
                <ul className="space-y-2">
                  {servico.features.map((feat, j) => (
                    <li key={j} className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        servico.highlight ? "bg-[oklch(0.75_0.14_75)]" : "bg-[oklch(0.75_0.14_75)]"
                      }`} />
                      <span className={`text-xs font-heading ${
                        servico.highlight ? "text-white/80" : "text-[oklch(0.4_0.02_240)]"
                      }`}>
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-12"
        >
          <button
            onClick={() => document.querySelector("#contato")?.scrollIntoView({ behavior: "smooth" })}
            className="bg-[oklch(0.22_0.07_240)] hover:bg-[oklch(0.18_0.07_240)] text-white font-heading font-semibold text-sm px-8 py-4 rounded-sm tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            Solicitar Orçamento Personalizado
          </button>
        </motion.div>
      </div>
    </section>
  );
}
