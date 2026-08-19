import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type BlogLeadFormProps = {
  articleSlug: string;
  articleTitle: string;
};

export default function BlogLeadForm({ articleSlug, articleTitle }: BlogLeadFormProps) {
  const [form, setForm] = useState({ nome: "", empresa: "", email: "", whatsapp: "" });
  const [submitted, setSubmitted] = useState(false);

  const captureLead = trpc.contato.enviar.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setForm({ nome: "", empresa: "", email: "", whatsapp: "" });
      toast.success("Recebemos seu pedido. Nossa equipe entrará em contato em breve.");
    },
    onError: () => toast.error("Não foi possível enviar agora. Tente novamente em instantes."),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.nome.trim() || !form.email.trim() || !form.whatsapp.trim()) {
      toast.error("Preencha nome, e-mail e WhatsApp para continuar.");
      return;
    }

    captureLead.mutate({
      ...form,
      tipoEvento: "Interesse a partir de conteúdo do blog",
      metragem: "",
      mensagem: `Conversão pelo artigo: ${articleTitle}\nSlug: /blog/${articleSlug}`,
      origemCaptacao: "blog_artigo",
      utmSource: "blog",
      utmMedium: "artigo",
      utmCampaign: articleSlug,
    });
  };

  if (submitted) {
    return (
      <section aria-live="polite" className="mt-12 border border-emerald-200 bg-emerald-50 p-7 sm:p-8">
        <div className="flex items-start gap-4">
          <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={26} aria-hidden="true" />
          <div>
            <h2 className="font-display text-xl font-bold text-[oklch(0.18_0.07_240)]">Pedido recebido</h2>
            <p className="mt-2 font-sans text-sm leading-relaxed text-[oklch(0.40_0.02_240)]">
              Obrigado pelo interesse. A equipe da SAMS receberá este contato com a referência do artigo que você consultou.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="blog-lead-form-title" className="mt-12 bg-[oklch(0.18_0.07_240)] p-7 sm:p-8">
      <div className="max-w-2xl">
        <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.85_0.10_78)]">Planeje sua participação</p>
        <h2 id="blog-lead-form-title" className="mt-3 font-display text-2xl font-bold leading-tight text-white">
          Quer transformar este planejamento em um stand?
        </h2>
        <p className="mt-3 font-sans text-sm leading-relaxed text-white/75">
          Deixe seus dados e receba um contato personalizado. Registramos a origem deste pedido para preparar uma conversa mais alinhada ao tema que você pesquisou.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
        <label className="font-heading text-xs font-semibold uppercase tracking-wide text-white/80">
          Nome <span className="text-[oklch(0.85_0.10_78)]">*</span>
          <input
            name="nome"
            autoComplete="name"
            value={form.nome}
            onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
            className="mt-2 w-full border border-white/25 bg-white px-4 py-3 font-sans text-sm text-[oklch(0.18_0.07_240)] outline-none ring-0 transition-colors focus:border-[oklch(0.85_0.10_78)] focus:ring-2 focus:ring-[oklch(0.85_0.10_78)/35]"
            required
          />
        </label>
        <label className="font-heading text-xs font-semibold uppercase tracking-wide text-white/80">
          Empresa
          <input
            name="empresa"
            autoComplete="organization"
            value={form.empresa}
            onChange={(event) => setForm((current) => ({ ...current, empresa: event.target.value }))}
            className="mt-2 w-full border border-white/25 bg-white px-4 py-3 font-sans text-sm text-[oklch(0.18_0.07_240)] outline-none ring-0 transition-colors focus:border-[oklch(0.85_0.10_78)] focus:ring-2 focus:ring-[oklch(0.85_0.10_78)/35]"
          />
        </label>
        <label className="font-heading text-xs font-semibold uppercase tracking-wide text-white/80">
          E-mail <span className="text-[oklch(0.85_0.10_78)]">*</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            className="mt-2 w-full border border-white/25 bg-white px-4 py-3 font-sans text-sm text-[oklch(0.18_0.07_240)] outline-none ring-0 transition-colors focus:border-[oklch(0.85_0.10_78)] focus:ring-2 focus:ring-[oklch(0.85_0.10_78)/35]"
            required
          />
        </label>
        <label className="font-heading text-xs font-semibold uppercase tracking-wide text-white/80">
          WhatsApp <span className="text-[oklch(0.85_0.10_78)]">*</span>
          <input
            name="whatsapp"
            type="tel"
            autoComplete="tel"
            value={form.whatsapp}
            onChange={(event) => setForm((current) => ({ ...current, whatsapp: event.target.value }))}
            className="mt-2 w-full border border-white/25 bg-white px-4 py-3 font-sans text-sm text-[oklch(0.18_0.07_240)] outline-none ring-0 transition-colors focus:border-[oklch(0.85_0.10_78)] focus:ring-2 focus:ring-[oklch(0.85_0.10_78)/35]"
            required
          />
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={captureLead.isPending}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[oklch(0.75_0.14_75)] px-6 py-3 font-heading text-sm font-bold tracking-wide text-[oklch(0.12_0.02_240)] transition-colors hover:bg-[oklch(0.85_0.10_78)] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
          >
            {captureLead.isPending ? <Loader2 className="animate-spin" size={17} aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
            {captureLead.isPending ? "Enviando..." : "Quero falar sobre meu projeto"}
          </button>
          <p className="mt-3 font-sans text-xs leading-relaxed text-white/60">
            Seus dados serão usados apenas para responder a este pedido. A origem do artigo é registrada para medir o interesse por conteúdo.
          </p>
        </div>
      </form>
    </section>
  );
}
