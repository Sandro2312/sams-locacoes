import { useEffect, useRef } from "react";

const parceiros = [
  {
    nome: "Neugebauer",
    logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663116701243/YqfJkXFtpDqUvVsMHfnp8h/neugebauer_677b7f41.png",
    bg: "bg-white",
  },
  {
    nome: "Água da Serra",
    logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663116701243/YqfJkXFtpDqUvVsMHfnp8h/agua-da-serra_187df9e2.png",
    bg: "bg-white",
  },
  {
    nome: "COIM",
    logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663116701243/YqfJkXFtpDqUvVsMHfnp8h/coim_bacbdc70.png",
    bg: "bg-white",
  },
  {
    nome: "Brasil Telecom",
    logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663116701243/YqfJkXFtpDqUvVsMHfnp8h/brasil-telecom_2ecf2122.png",
    bg: "bg-white",
  },
];

// Duplicar para efeito de loop contínuo
const allParceiros = [...parceiros, ...parceiros, ...parceiros];

export default function ParceirosSection() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let animationId: number;
    let position = 0;
    const speed = 0.5; // px por frame
    const singleSetWidth = track.scrollWidth / 3;

    const animate = () => {
      position += speed;
      if (position >= singleSetWidth) {
        position = 0;
      }
      track.style.transform = `translateX(-${position}px)`;
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    // Pausar ao passar o mouse
    const pause = () => cancelAnimationFrame(animationId);
    const resume = () => { animationId = requestAnimationFrame(animate); };

    track.addEventListener("mouseenter", pause);
    track.addEventListener("mouseleave", resume);

    return () => {
      cancelAnimationFrame(animationId);
      track.removeEventListener("mouseenter", pause);
      track.removeEventListener("mouseleave", resume);
    };
  }, []);

  return (
    <section className="py-16 bg-zinc-950 border-t border-zinc-800">
      <div className="container mb-10 text-center">
        <p className="text-amber-500 text-sm font-semibold uppercase tracking-widest mb-2">
          Clientes que confiam na SAMS
        </p>
        <h2 className="text-3xl font-bold text-white">
          Marcas que já transformamos em experiência
        </h2>
        <p className="text-zinc-400 mt-3 max-w-xl mx-auto">
          Empresas líderes de mercado escolheram a SAMS Locações para representar
          suas marcas nas principais feiras e eventos do Brasil.
        </p>
      </div>

      {/* Carrossel */}
      <div className="overflow-hidden relative">
        {/* Gradiente esquerda */}
        <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-zinc-950 to-transparent pointer-events-none" />
        {/* Gradiente direita */}
        <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-zinc-950 to-transparent pointer-events-none" />

        <div
          ref={trackRef}
          className="flex items-center gap-8 will-change-transform"
          style={{ width: "max-content" }}
        >
          {allParceiros.map((parceiro, idx) => (
            <div
              key={idx}
              className="flex-shrink-0 w-52 h-28 bg-white rounded-xl shadow-md flex items-center justify-center px-6 py-4 hover:shadow-amber-500/20 hover:shadow-lg transition-shadow duration-300 cursor-default"
            >
              <img
                src={parceiro.logo}
                alt={`Logo ${parceiro.nome}`}
                className="max-h-16 max-w-full object-contain transition-all duration-300"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Contador de clientes */}
      <div className="container mt-12 flex flex-wrap justify-center gap-8">
        <div className="text-center">
          <p className="text-3xl font-bold text-amber-500">500+</p>
          <p className="text-zinc-400 text-sm mt-1">Clientes atendidos</p>
        </div>
        <div className="w-px bg-zinc-700 hidden sm:block" />
        <div className="text-center">
          <p className="text-3xl font-bold text-amber-500">15+</p>
          <p className="text-zinc-400 text-sm mt-1">Anos de experiência</p>
        </div>
        <div className="w-px bg-zinc-700 hidden sm:block" />
        <div className="text-center">
          <p className="text-3xl font-bold text-amber-500">100%</p>
          <p className="text-zinc-400 text-sm mt-1">Satisfação garantida</p>
        </div>
        <div className="w-px bg-zinc-700 hidden sm:block" />
        <div className="text-center">
          <p className="text-3xl font-bold text-amber-500">Nacional</p>
          <p className="text-zinc-400 text-sm mt-1">Atendimento em todo Brasil</p>
        </div>
      </div>
    </section>
  );
}
