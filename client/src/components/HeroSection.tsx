import { motion } from "framer-motion";
import { ChevronDown, Award, MapPin, Users } from "lucide-react";
import { Link } from "wouter";

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663116701243/YqfJkXFtpDqUvVsMHfnp8h/stand-5_ea936cfd.jpg";

const stats = [
  { icon: Award, value: "15+", label: "Anos de Experiência" },
  { icon: MapPin, value: "Nacional", label: "Cobertura em Todo Brasil" },
  { icon: Users, value: "500+", label: "Clientes Satisfeitos" },
];

export default function HeroSection() {

  const scrollDown = () => {
    const el = document.querySelector("#sobre");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${HERO_BG})` }}
      />

      {/* Dark overlay with navy gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.12_0.08_240)/95] via-[oklch(0.16_0.07_240)/85] to-[oklch(0.10_0.06_240)/90]" />

      {/* Gold accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[oklch(0.75_0.14_75)] to-transparent" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl text-center pt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 border border-[oklch(0.75_0.14_75)/50] bg-[oklch(0.75_0.14_75)/10] text-[oklch(0.85_0.10_78)] px-4 py-1.5 rounded-full text-xs font-heading font-semibold tracking-[0.2em] uppercase mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[oklch(0.75_0.14_75)] animate-pulse" />
            Especialistas em Stands & Cenografia
          </div>

          {/* Main Headline */}
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white font-bold leading-tight mb-4">
            Transformamos{" "}
            <span className="text-gold-gradient italic">Espaços</span>
            <br />
            em{" "}
            <span className="text-gold-gradient italic">Experiências</span>
          </h1>

          {/* Subtitle */}
          <p className="text-white/70 text-lg sm:text-xl max-w-2xl mx-auto mb-8 font-sans leading-relaxed">
            Há mais de <strong className="text-[oklch(0.85_0.10_78)]">15 anos</strong> criando stands e cenografias que encantam, 
            conectam marcas ao seu público e geram resultados reais em feiras e eventos corporativos em todo o Brasil.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/orcamento">
              <a className="w-full sm:w-auto bg-[oklch(0.75_0.14_75)] hover:bg-[oklch(0.82_0.12_78)] text-[oklch(0.12_0.02_240)] font-heading font-bold text-base px-8 py-4 rounded-sm tracking-wide transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-0.5">
                Solicitar Orçamento Gratuito
              </a>
            </Link>
            <button
              onClick={() => document.querySelector("#portfolio")?.scrollIntoView({ behavior: "smooth" })}
              className="w-full sm:w-auto border border-white/30 hover:border-[oklch(0.75_0.14_75)] text-white hover:text-[oklch(0.85_0.10_78)] font-heading font-semibold text-base px-8 py-4 rounded-sm tracking-wide transition-all duration-300 backdrop-blur-sm"
            >
              Ver Nosso Portfólio
            </button>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto"
          >
            {stats.map((stat, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-sm px-6 py-5 hover:border-[oklch(0.75_0.14_75)/50] transition-all duration-300"
              >
                <stat.icon size={22} className="text-[oklch(0.75_0.14_75)]" />
                <span className="font-display text-2xl font-bold text-white">{stat.value}</span>
                <span className="text-white/60 text-xs font-heading tracking-wide text-center">{stat.label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll Down Indicator */}
      <button
        onClick={scrollDown}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 hover:text-[oklch(0.75_0.14_75)] transition-colors animate-bounce"
        aria-label="Rolar para baixo"
      >
        <ChevronDown size={32} />
      </button>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[oklch(0.98_0.003_240)] to-transparent" />
    </section>
  );
}
