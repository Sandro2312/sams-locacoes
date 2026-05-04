import { Calendar, MapPin, ExternalLink } from "lucide-react";

interface Evento {
  nome: string;
  datas: string;
  local: string;
  cidade: string;
  estado: string;
  mes: string;
  cor: string;
}

const eventos: Evento[] = [
  {
    nome: "BF SHOW — 1ª Edição",
    datas: "18 a 20 de maio de 2026",
    local: "Distrito Anhembi",
    cidade: "São Paulo",
    estado: "SP",
    mes: "MAI",
    cor: "from-violet-600 to-violet-800",
  },
  {
    nome: "PREVENSUL",
    datas: "18 a 20 de maio de 2026",
    local: "Centro de Eventos da PUCRS",
    cidade: "Porto Alegre",
    estado: "RS",
    mes: "MAI",
    cor: "from-blue-600 to-blue-800",
  },
  {
    nome: "CELEBRA SHOW",
    datas: "31 de maio a 03 de junho de 2026",
    local: "Expo Center Norte",
    cidade: "São Paulo",
    estado: "SP",
    mes: "JUN",
    cor: "from-pink-600 to-pink-800",
  },
  {
    nome: "BRASIL BRAU",
    datas: "09 a 11 de junho de 2026",
    local: "São Paulo Expo",
    cidade: "São Paulo",
    estado: "SP",
    mes: "JUN",
    cor: "from-amber-600 to-amber-800",
  },
  {
    nome: "FISPAL TECNOLOGIA",
    datas: "16 a 19 de junho de 2026",
    local: "São Paulo Expo",
    cidade: "São Paulo",
    estado: "SP",
    mes: "JUN",
    cor: "from-orange-600 to-orange-800",
  },
  {
    nome: "EXPOSUPER",
    datas: "16 a 18 de junho de 2026",
    local: "Expocentro Balneário Camboriú",
    cidade: "Balneário Camboriú",
    estado: "SC",
    mes: "JUN",
    cor: "from-teal-600 to-teal-800",
  },
  {
    nome: "FORMÓBILE",
    datas: "30 de junho a 03 de julho de 2026",
    local: "São Paulo Expo",
    cidade: "São Paulo",
    estado: "SP",
    mes: "JUL",
    cor: "from-emerald-600 to-emerald-800",
  },
  {
    nome: "FRESH PRODUCE",
    datas: "04 a 05 de agosto de 2026",
    local: "São Paulo",
    cidade: "São Paulo",
    estado: "SP",
    mes: "AGO",
    cor: "from-green-600 to-green-800",
  },
  {
    nome: "MOVELSUL",
    datas: "17 a 20 de agosto de 2026",
    local: "Fenavinho",
    cidade: "Bento Gonçalves",
    estado: "RS",
    mes: "AGO",
    cor: "from-cyan-600 to-cyan-800",
  },
  {
    nome: "FEBRATEX",
    datas: "18 a 21 de agosto de 2026",
    local: "Parque Vila Germânica",
    cidade: "Blumenau",
    estado: "SC",
    mes: "AGO",
    cor: "from-indigo-600 to-indigo-800",
  },
  {
    nome: "EXPOAGAS",
    datas: "18 a 21 de agosto de 2026",
    local: "FIERGS",
    cidade: "Porto Alegre",
    estado: "RS",
    mes: "AGO",
    cor: "from-red-600 to-red-800",
  },
];

export default function ProximosEventosSection() {
  const whatsappBase = "https://wa.me/5551998827054?text=";

  const handleContato = (evento: Evento) => {
    const msg = encodeURIComponent(
      `Olá! Tenho interesse em montar um stand na ${evento.nome} (${evento.datas}) em ${evento.cidade}/${evento.estado}. Gostaria de solicitar um orçamento.`
    );
    window.open(`${whatsappBase}${msg}`, "_blank");
  };

  return (
    <section id="proximos-eventos" className="py-20 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-sm font-semibold tracking-widest uppercase mb-4">
            Agenda 2026
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Próximos <span className="text-amber-400">Eventos</span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            A SAMS Locações estará presente nas principais feiras do Brasil em 2026.
            Solicite seu orçamento com antecedência e garanta o melhor stand para sua empresa.
          </p>
        </div>

        {/* Grid de eventos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {eventos.map((evento, index) => (
            <div
              key={index}
              className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-amber-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10"
            >
              {/* Faixa colorida do mês */}
              <div className={`h-1.5 w-full bg-gradient-to-r ${evento.cor}`} />

              <div className="p-6">
                {/* Badge do mês */}
                <div className="flex items-start justify-between mb-4">
                  <span
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${evento.cor} text-white text-xs font-black tracking-widest`}
                  >
                    {evento.mes}
                  </span>
                  <span className="text-xs text-zinc-500 font-medium bg-zinc-800 px-2 py-1 rounded-full">
                    2026
                  </span>
                </div>

                {/* Nome do evento */}
                <h3 className="text-white font-bold text-lg leading-tight mb-3 group-hover:text-amber-400 transition-colors">
                  {evento.nome}
                </h3>

                {/* Datas */}
                <div className="flex items-start gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span className="text-zinc-300 text-sm">{evento.datas}</span>
                </div>

                {/* Local */}
                <div className="flex items-start gap-2 mb-5">
                  <MapPin className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-zinc-300 text-sm block">{evento.local}</span>
                    <span className="text-zinc-500 text-xs">
                      {evento.cidade} / {evento.estado}
                    </span>
                  </div>
                </div>

                {/* Botão de orçamento */}
                <button
                  onClick={() => handleContato(evento)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-500/10 hover:bg-amber-500 border border-amber-500/40 hover:border-amber-500 text-amber-400 hover:text-zinc-900 rounded-xl text-sm font-semibold transition-all duration-200"
                >
                  <ExternalLink className="w-4 h-4" />
                  Solicitar Orçamento
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* CTA inferior */}
        <div className="mt-14 text-center">
          <p className="text-zinc-400 mb-4">
            Sua feira não está na lista? Entre em contato — atendemos em todo o Brasil.
          </p>
          <a
            href="https://wa.me/5551998827054?text=Olá!%20Gostaria%20de%20solicitar%20um%20orçamento%20para%20montagem%20de%20stand."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-zinc-900 font-bold rounded-full transition-colors duration-200 shadow-lg shadow-amber-500/30"
          >
            <Calendar className="w-5 h-5" />
            Solicitar Orçamento para Outro Evento
          </a>
        </div>
      </div>
    </section>
  );
}
