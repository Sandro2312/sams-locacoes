import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Phone, Mail, MapPin, Instagram, Facebook, Linkedin, CheckCircle2, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const tiposEvento = [
  "Feira Comercial",
  "Evento Corporativo",
  "Convenção",
  "Congresso",
  "Exposição",
  "Lançamento de Produto",
  "Outro",
];

const metragens = [
  "Até 20m²",
  "21m² a 40m²",
  "41m² a 60m²",
  "61m² a 80m²",
  "81m² a 100m²",
  "Acima de 100m²",
  "Não sei ainda",
];

export default function ContatoSection() {
  const [form, setForm] = useState({
    nome: "",
    empresa: "",
    whatsapp: "",
    email: "",
    tipoEvento: "",
    metragem: "",
    mensagem: "",
  });
  const [enviado, setEnviado] = useState(false);

  const enviarContato = trpc.contato.enviar.useMutation({
    onSuccess: () => {
      setEnviado(true);
      setForm({ nome: "", empresa: "", whatsapp: "", email: "", tipoEvento: "", metragem: "", mensagem: "" });
      toast.success("Mensagem enviada com sucesso! Entraremos em contato em breve.");
    },
    onError: (err) => {
      toast.error("Erro ao enviar mensagem. Tente novamente.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.whatsapp || !form.email) {
      toast.error("Por favor, preencha os campos obrigatórios.");
      return;
    }
    enviarContato.mutate(form);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <section id="contato" className="py-24 bg-[oklch(0.97_0.003_240)] overflow-hidden">
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
              Contato
            </span>
            <span className="section-divider" />
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-[oklch(0.18_0.07_240)] font-bold leading-tight mb-4">
            Vamos Criar Algo{" "}
            <span className="italic text-[oklch(0.75_0.14_75)]">Extraordinário</span>
          </h2>
          <p className="text-[oklch(0.5_0.02_240)] text-base max-w-2xl mx-auto font-sans leading-relaxed">
            Solicite um orçamento gratuito e personalizado. Nossa equipe entrará em contato em até 24 horas úteis.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-2 space-y-6"
          >
            <div className="bg-[oklch(0.22_0.07_240)] rounded-sm p-8 text-white">
              <h3 className="font-display text-xl font-bold mb-6 text-[oklch(0.85_0.10_78)]">
                Fale Conosco
              </h3>

              <div className="space-y-5">
                <a
                  href="https://wa.me/5551998827054"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 group"
                >
                  <div className="w-10 h-10 rounded-sm bg-[oklch(0.75_0.14_75)/20] flex items-center justify-center flex-shrink-0 group-hover:bg-[oklch(0.75_0.14_75)] transition-colors duration-300">
                    <Phone size={18} className="text-[oklch(0.75_0.14_75)] group-hover:text-[oklch(0.12_0.02_240)] transition-colors duration-300" />
                  </div>
                  <div>
                    <p className="font-heading text-xs text-white/50 tracking-wide uppercase mb-0.5">WhatsApp</p>
                    <p className="font-heading font-semibold text-white group-hover:text-[oklch(0.85_0.10_78)] transition-colors">(51) 99882-7054</p>
                  </div>
                </a>

                <a
                  href="mailto:vera@samslocacoes.com.br"
                  className="flex items-start gap-4 group"
                >
                  <div className="w-10 h-10 rounded-sm bg-[oklch(0.75_0.14_75)/20] flex items-center justify-center flex-shrink-0 group-hover:bg-[oklch(0.75_0.14_75)] transition-colors duration-300">
                    <Mail size={18} className="text-[oklch(0.75_0.14_75)] group-hover:text-[oklch(0.12_0.02_240)] transition-colors duration-300" />
                  </div>
                  <div>
                    <p className="font-heading text-xs text-white/50 tracking-wide uppercase mb-0.5">E-mail</p>
                    <p className="font-heading font-semibold text-white group-hover:text-[oklch(0.85_0.10_78)] transition-colors">vera@samslocacoes.com.br</p>
                  </div>
                </a>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-sm bg-[oklch(0.75_0.14_75)/20] flex items-center justify-center flex-shrink-0">
                    <MapPin size={18} className="text-[oklch(0.75_0.14_75)]" />
                  </div>
                  <div>
                    <p className="font-heading text-xs text-white/50 tracking-wide uppercase mb-0.5">Localização</p>
                    <p className="font-heading font-semibold text-white">Porto Alegre, RS</p>
                    <p className="text-white/60 text-xs font-sans mt-0.5">Atendimento em todo o Brasil</p>
                  </div>
                </div>

                <a
                  href="https://instagram.com/samslocacoes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 group"
                >
                  <div className="w-10 h-10 rounded-sm bg-[oklch(0.75_0.14_75)/20] flex items-center justify-center flex-shrink-0 group-hover:bg-[oklch(0.75_0.14_75)] transition-colors duration-300">
                    <Instagram size={18} className="text-[oklch(0.75_0.14_75)] group-hover:text-[oklch(0.12_0.02_240)] transition-colors duration-300" />
                  </div>
                  <div>
                    <p className="font-heading text-xs text-white/50 tracking-wide uppercase mb-0.5">Instagram</p>
                    <p className="font-heading font-semibold text-white group-hover:text-[oklch(0.85_0.10_78)] transition-colors">@samslocacoes</p>
                  </div>
                </a>

                <a
                  href="https://www.facebook.com/samslocacoesemontagem"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 group"
                >
                  <div className="w-10 h-10 rounded-sm bg-[oklch(0.75_0.14_75)/20] flex items-center justify-center flex-shrink-0 group-hover:bg-[#1877F2] transition-colors duration-300">
                    <Facebook size={18} className="text-[oklch(0.75_0.14_75)] group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div>
                    <p className="font-heading text-xs text-white/50 tracking-wide uppercase mb-0.5">Facebook</p>
                    <p className="font-heading font-semibold text-white group-hover:text-[oklch(0.85_0.10_78)] transition-colors">SAMS Locações e Montagem</p>
                  </div>
                </a>

                <a
                  href="https://www.linkedin.com/company/sams-locacoes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 group"
                >
                  <div className="w-10 h-10 rounded-sm bg-[oklch(0.75_0.14_75)/20] flex items-center justify-center flex-shrink-0 group-hover:bg-[#0A66C2] transition-colors duration-300">
                    <Linkedin size={18} className="text-[oklch(0.75_0.14_75)] group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div>
                    <p className="font-heading text-xs text-white/50 tracking-wide uppercase mb-0.5">LinkedIn</p>
                    <p className="font-heading font-semibold text-white group-hover:text-[oklch(0.85_0.10_78)] transition-colors">SAMS Locações</p>
                  </div>
                </a>
              </div>
            </div>

            {/* WhatsApp Quick CTA */}
            <a
              href="https://wa.me/5551998827054?text=Olá!%20Gostaria%20de%20solicitar%20um%20orçamento%20para%20montagem%20de%20stand."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-heading font-bold text-sm px-6 py-4 rounded-sm tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Falar pelo WhatsApp
            </a>

            {/* Download Apresentação Institucional */}
            <a
              href="https://d2xsxph8kpxj0f.cloudfront.net/310519663116701243/YqfJkXFtpDqUvVsMHfnp8h/SAMS_Locacoes_Apresentacao_Institucional_3b19fd26.pdf"
              target="_blank"
              rel="noopener noreferrer"
              download
              className="flex items-center justify-center gap-3 w-full border-2 border-[oklch(0.75_0.14_75)] hover:bg-[oklch(0.75_0.14_75)] text-[oklch(0.75_0.14_75)] hover:text-[oklch(0.12_0.02_240)] font-heading font-bold text-sm px-6 py-4 rounded-sm tracking-wide transition-all duration-300"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Baixar Apresentação Institucional
            </a>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-3"
          >
            {enviado ? (
              <div className="bg-white rounded-sm p-10 text-center shadow-lg h-full flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 size={32} className="text-green-600" />
                </div>
                <h3 className="font-display text-2xl font-bold text-[oklch(0.18_0.07_240)]">Mensagem Enviada!</h3>
                <p className="text-[oklch(0.5_0.02_240)] font-sans max-w-sm text-center">
                  Obrigado pelo contato! Nossa equipe retornará em até 24 horas úteis com um orçamento personalizado.
                </p>
                <button
                  onClick={() => setEnviado(false)}
                  className="mt-2 text-[oklch(0.75_0.14_75)] font-heading text-sm font-semibold hover:underline"
                >
                  Enviar nova mensagem
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white rounded-sm p-8 shadow-lg space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block font-heading text-xs font-semibold text-[oklch(0.22_0.07_240)] tracking-wide uppercase mb-2">
                      Nome Completo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="nome"
                      value={form.nome}
                      onChange={handleChange}
                      placeholder="Seu nome"
                      required
                      className="w-full border border-[oklch(0.88_0.01_240)] rounded-sm px-4 py-3 text-sm font-sans text-[oklch(0.22_0.07_240)] placeholder-[oklch(0.7_0.01_240)] focus:outline-none focus:border-[oklch(0.22_0.07_240)] focus:ring-1 focus:ring-[oklch(0.22_0.07_240)] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-heading text-xs font-semibold text-[oklch(0.22_0.07_240)] tracking-wide uppercase mb-2">
                      Empresa
                    </label>
                    <input
                      type="text"
                      name="empresa"
                      value={form.empresa}
                      onChange={handleChange}
                      placeholder="Nome da empresa"
                      className="w-full border border-[oklch(0.88_0.01_240)] rounded-sm px-4 py-3 text-sm font-sans text-[oklch(0.22_0.07_240)] placeholder-[oklch(0.7_0.01_240)] focus:outline-none focus:border-[oklch(0.22_0.07_240)] focus:ring-1 focus:ring-[oklch(0.22_0.07_240)] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block font-heading text-xs font-semibold text-[oklch(0.22_0.07_240)] tracking-wide uppercase mb-2">
                      WhatsApp <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="whatsapp"
                      value={form.whatsapp}
                      onChange={handleChange}
                      placeholder="(XX) XXXXX-XXXX"
                      required
                      className="w-full border border-[oklch(0.88_0.01_240)] rounded-sm px-4 py-3 text-sm font-sans text-[oklch(0.22_0.07_240)] placeholder-[oklch(0.7_0.01_240)] focus:outline-none focus:border-[oklch(0.22_0.07_240)] focus:ring-1 focus:ring-[oklch(0.22_0.07_240)] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-heading text-xs font-semibold text-[oklch(0.22_0.07_240)] tracking-wide uppercase mb-2">
                      E-mail <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="seu@email.com"
                      required
                      className="w-full border border-[oklch(0.88_0.01_240)] rounded-sm px-4 py-3 text-sm font-sans text-[oklch(0.22_0.07_240)] placeholder-[oklch(0.7_0.01_240)] focus:outline-none focus:border-[oklch(0.22_0.07_240)] focus:ring-1 focus:ring-[oklch(0.22_0.07_240)] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block font-heading text-xs font-semibold text-[oklch(0.22_0.07_240)] tracking-wide uppercase mb-2">
                      Tipo de Evento
                    </label>
                    <select
                      name="tipoEvento"
                      value={form.tipoEvento}
                      onChange={handleChange}
                      className="w-full border border-[oklch(0.88_0.01_240)] rounded-sm px-4 py-3 text-sm font-sans text-[oklch(0.22_0.07_240)] focus:outline-none focus:border-[oklch(0.22_0.07_240)] focus:ring-1 focus:ring-[oklch(0.22_0.07_240)] transition-colors bg-white"
                    >
                      <option value="">Selecione o tipo</option>
                      {tiposEvento.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-heading text-xs font-semibold text-[oklch(0.22_0.07_240)] tracking-wide uppercase mb-2">
                      Metragem do Stand
                    </label>
                    <select
                      name="metragem"
                      value={form.metragem}
                      onChange={handleChange}
                      className="w-full border border-[oklch(0.88_0.01_240)] rounded-sm px-4 py-3 text-sm font-sans text-[oklch(0.22_0.07_240)] focus:outline-none focus:border-[oklch(0.22_0.07_240)] focus:ring-1 focus:ring-[oklch(0.22_0.07_240)] transition-colors bg-white"
                    >
                      <option value="">Selecione a metragem</option>
                      {metragens.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-heading text-xs font-semibold text-[oklch(0.22_0.07_240)] tracking-wide uppercase mb-2">
                    Mensagem
                  </label>
                  <textarea
                    name="mensagem"
                    value={form.mensagem}
                    onChange={handleChange}
                    placeholder="Descreva seu projeto, a feira que irá participar, data do evento e qualquer informação relevante..."
                    rows={4}
                    className="w-full border border-[oklch(0.88_0.01_240)] rounded-sm px-4 py-3 text-sm font-sans text-[oklch(0.22_0.07_240)] placeholder-[oklch(0.7_0.01_240)] focus:outline-none focus:border-[oklch(0.22_0.07_240)] focus:ring-1 focus:ring-[oklch(0.22_0.07_240)] transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={enviarContato.isPending}
                  className="w-full flex items-center justify-center gap-2 bg-[oklch(0.22_0.07_240)] hover:bg-[oklch(0.18_0.07_240)] disabled:opacity-60 text-white font-heading font-bold text-sm px-8 py-4 rounded-sm tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  {enviarContato.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Solicitar Orçamento Gratuito
                    </>
                  )}
                </button>

                <p className="text-[oklch(0.6_0.02_240)] text-xs font-sans text-center">
                  Seus dados estão seguros. Não compartilhamos informações com terceiros.
                </p>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
