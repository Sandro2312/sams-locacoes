import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Quote, Star, ChevronLeft, ChevronRight } from "lucide-react";

const depoimentos = [
  {
    id: 1,
    nome: "Rodrigo Almeida",
    cargo: "Gerente de Marketing",
    empresa: "Neugebauer",
    texto: "A SAMS Locações superou todas as nossas expectativas! O stand ficou absolutamente incrível, refletindo perfeitamente a identidade da nossa marca. A equipe foi extremamente profissional e pontual. Com certeza voltaremos a trabalhar juntos!",
    estrelas: 5,
    inicial: "R",
  },
  {
    id: 2,
    nome: "Fernanda Costa",
    cargo: "Diretora Comercial",
    empresa: "Água da Serra",
    texto: "Trabalhar com a SAMS foi uma experiência excepcional. Desde o primeiro briefing até a desmontagem, tudo foi conduzido com maestria. O stand atraiu muito mais visitantes do que esperávamos e geramos ótimos negócios na feira.",
    estrelas: 5,
    inicial: "F",
  },
  {
    id: 3,
    nome: "Carlos Eduardo",
    cargo: "Coordenador de Eventos",
    empresa: "COIM",
    texto: "Empresa séria e comprometida. Entregaram o projeto no prazo, dentro do orçamento e com qualidade impecável. A atenção aos detalhes e o acabamento do stand foram elogiados por todos os visitantes. Recomendo sem hesitar!",
    estrelas: 5,
    inicial: "C",
  },
  {
    id: 4,
    nome: "Ana Paula Mendes",
    cargo: "Gerente de Eventos",
    empresa: "Telecom",
    texto: "Ficamos impressionados com a criatividade e a execução do projeto. A SAMS entendeu exatamente o que precisávamos e entregou um stand tecnológico e moderno que representou perfeitamente nossa empresa. Parceria de longo prazo garantida!",
    estrelas: 5,
    inicial: "A",
  },
  {
    id: 5,
    nome: "Marcos Vieira",
    cargo: "CEO",
    empresa: "Empresa Parceira",
    texto: "Já participamos de mais de 10 feiras com a SAMS Locações e a qualidade é sempre consistente. A equipe é dedicada, criativa e resolve qualquer imprevisto com agilidade. São muito mais que fornecedores, são parceiros estratégicos.",
    estrelas: 5,
    inicial: "M",
  },
];

export default function DepoimentosSection() {
  const [atual, setAtual] = useState(0);

  const anterior = () => setAtual((prev) => (prev === 0 ? depoimentos.length - 1 : prev - 1));
  const proximo = () => setAtual((prev) => (prev === depoimentos.length - 1 ? 0 : prev + 1));

  const dep = depoimentos[atual];

  return (
    <section id="depoimentos" className="py-24 bg-navy-gradient overflow-hidden relative">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.75_0.14_75)/40] to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.75_0.14_75)/40] to-transparent" />

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
              Depoimentos
            </span>
            <span className="section-divider" />
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white font-bold leading-tight mb-4">
            O Que Nossos{" "}
            <span className="italic text-[oklch(0.75_0.14_75)]">Clientes Dizem</span>
          </h2>
          <p className="text-white/60 text-base max-w-xl mx-auto font-sans leading-relaxed">
            A satisfação dos nossos clientes é nossa maior conquista. Veja o que eles têm a dizer sobre nossa parceria.
          </p>
        </motion.div>

        {/* Main Testimonial */}
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={dep.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-sm p-8 sm:p-12 text-center"
            >
              {/* Quote icon */}
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-[oklch(0.75_0.14_75)] flex items-center justify-center shadow-lg">
                <Quote size={18} className="text-[oklch(0.12_0.02_240)]" fill="currentColor" />
              </div>

              {/* Stars */}
              <div className="flex items-center justify-center gap-1 mb-6">
                {Array.from({ length: dep.estrelas }).map((_, i) => (
                  <Star key={i} size={18} className="text-[oklch(0.75_0.14_75)]" fill="currentColor" />
                ))}
              </div>

              {/* Testimonial text */}
              <p className="text-white/90 text-lg sm:text-xl font-sans leading-relaxed italic mb-8 max-w-2xl mx-auto">
                "{dep.texto}"
              </p>

              {/* Author */}
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[oklch(0.75_0.14_75)] flex items-center justify-center font-display font-bold text-[oklch(0.12_0.02_240)] text-lg">
                  {dep.inicial}
                </div>
                <div className="text-left">
                  <p className="font-heading font-bold text-white text-sm">{dep.nome}</p>
                  <p className="text-[oklch(0.75_0.14_75)] text-xs font-heading">{dep.cargo}</p>
                  <p className="text-white/50 text-xs font-sans">{dep.empresa}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={anterior}
              className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:border-[oklch(0.75_0.14_75)] hover:text-[oklch(0.75_0.14_75)] transition-all duration-200"
            >
              <ChevronLeft size={18} />
            </button>

            {/* Dots */}
            <div className="flex items-center gap-2">
              {depoimentos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setAtual(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === atual
                      ? "w-6 h-2 bg-[oklch(0.75_0.14_75)]"
                      : "w-2 h-2 bg-white/30 hover:bg-white/50"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={proximo}
              className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:border-[oklch(0.75_0.14_75)] hover:text-[oklch(0.75_0.14_75)] transition-all duration-200"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-16 pt-16 border-t border-white/10"
        >
          {[
            { value: "500+", label: "Projetos Entregues" },
            { value: "15+", label: "Anos de Experiência" },
            { value: "100%", label: "Cobertura Nacional" },
            { value: "98%", label: "Satisfação dos Clientes" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="font-display text-3xl sm:text-4xl font-bold text-[oklch(0.75_0.14_75)] mb-1">{stat.value}</p>
              <p className="text-white/60 text-xs font-heading tracking-wide uppercase">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
