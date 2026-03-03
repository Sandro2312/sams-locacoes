import { motion } from "framer-motion";
import { CheckCircle2, TrendingUp, Heart, Globe } from "lucide-react";

const SOBRE_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663116701243/YqfJkXFtpDqUvVsMHfnp8h/stand-luxury_e10317d6.jpg";

const diferenciais = [
  {
    icon: TrendingUp,
    title: "15+ Anos de Expertise",
    desc: "Décadas de experiência transformando espaços em experiências memoráveis para as maiores feiras e eventos do Brasil.",
  },
  {
    icon: Globe,
    title: "Cobertura Nacional",
    desc: "Atendemos em todo o território nacional, levando excelência e pontualidade a qualquer cidade do Brasil.",
  },
  {
    icon: Heart,
    title: "Foco na Satisfação",
    desc: "Nossa missão é superar as expectativas de cada cliente, do briefing à desmontagem, com atenção a cada detalhe.",
  },
  {
    icon: CheckCircle2,
    title: "Entrega Garantida",
    desc: "Comprometimento total com prazos e qualidade. Seu stand pronto no dia certo, sem surpresas.",
  },
];

export default function SobreSection() {
  return (
    <section id="sobre" className="py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Image Side */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative rounded-sm overflow-hidden shadow-2xl aspect-[4/3]">
              <img
                src={SOBRE_IMG}
                alt="Stand SAMS Locações"
                className="w-full h-full object-cover"
              />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.18_0.07_240)/60] to-transparent" />
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-6 -right-6 bg-[oklch(0.22_0.07_240)] text-white rounded-sm p-6 shadow-2xl">
              <p className="font-display text-4xl font-bold text-[oklch(0.75_0.14_75)]">15+</p>
              <p className="font-heading text-xs tracking-widest uppercase text-white/70 mt-1">Anos de<br/>Experiência</p>
            </div>

            {/* Gold accent corner */}
            <div className="absolute -top-4 -left-4 w-24 h-24 border-t-2 border-l-2 border-[oklch(0.75_0.14_75)] rounded-tl-sm" />
          </motion.div>

          {/* Content Side */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          >
            {/* Section label */}
            <div className="flex items-center gap-3 mb-4">
              <span className="section-divider" />
              <span className="font-heading text-xs font-semibold tracking-[0.25em] uppercase text-[oklch(0.75_0.14_75)]">
                Sobre a SAMS Locações
              </span>
            </div>

            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-[oklch(0.18_0.07_240)] font-bold leading-tight mb-6">
              Excelência em Cada{" "}
              <span className="italic text-[oklch(0.75_0.14_75)]">Detalhe</span>
            </h2>

            <p className="text-[oklch(0.4_0.02_240)] text-base leading-relaxed mb-4 font-sans">
              A <strong className="text-[oklch(0.22_0.07_240)]">SAMS Locações</strong> é uma empresa especializada na criação, 
              desenvolvimento e montagem de stands personalizados para feiras, eventos corporativos e exposições. 
              Com mais de 15 anos de trajetória no mercado, construímos uma reputação sólida baseada em qualidade, 
              inovação e comprometimento.
            </p>

            <p className="text-[oklch(0.4_0.02_240)] text-base leading-relaxed mb-8 font-sans">
              Entendemos que um stand vai muito além de uma estrutura física — ele é a extensão da identidade 
              da sua marca e o ponto de conexão direta com seu público. Por isso, cada projeto é tratado com 
              dedicação exclusiva, do conceito à desmontagem.
            </p>

            {/* Diferenciais Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {diferenciais.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 * i }}
                  className="flex gap-3 p-4 rounded-sm bg-[oklch(0.97_0.003_240)] hover:bg-[oklch(0.94_0.005_240)] transition-colors duration-200 group"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[oklch(0.22_0.07_240)] flex items-center justify-center group-hover:bg-[oklch(0.75_0.14_75)] transition-colors duration-300">
                    <item.icon size={18} className="text-[oklch(0.75_0.14_75)] group-hover:text-[oklch(0.22_0.07_240)] transition-colors duration-300" />
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-[oklch(0.22_0.07_240)] text-sm mb-1">{item.title}</p>
                    <p className="text-[oklch(0.5_0.02_240)] text-xs leading-relaxed font-sans">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
