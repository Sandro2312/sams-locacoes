import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { contatos, orcamentos } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  contato: router({
    enviar: publicProcedure
      .input(z.object({
        nome: z.string().min(1),
        empresa: z.string().optional().default(""),
        whatsapp: z.string().min(1),
        email: z.string().email(),
        tipoEvento: z.string().optional().default(""),
        metragem: z.string().optional().default(""),
        mensagem: z.string().optional().default(""),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (db) {
          await db.insert(contatos).values({
            nome: input.nome,
            empresa: input.empresa,
            whatsapp: input.whatsapp,
            email: input.email,
            tipoEvento: input.tipoEvento,
            metragem: input.metragem,
            mensagem: input.mensagem,
          });
        }
        await notifyOwner({
          title: `Novo Contato - ${input.nome}`,
          content: `**Nome:** ${input.nome}\n**Empresa:** ${input.empresa || "—"}\n**WhatsApp:** ${input.whatsapp}\n**E-mail:** ${input.email}\n**Tipo de Evento:** ${input.tipoEvento || "—"}\n**Metragem:** ${input.metragem || "—"}\n**Mensagem:** ${input.mensagem || "—"}`,
        });
        return { success: true };
      }),

    listar: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(contatos).orderBy(contatos.criadoEm);
    }),
  }),

  orcamento: router({
    enviar: publicProcedure
      .input(z.object({
        // Etapa 1 - Dados Pessoais
        nome: z.string().min(1),
        empresa: z.string().min(1),
        cargo: z.string().optional().default(""),
        whatsapp: z.string().min(1),
        email: z.string().email(),
        // Etapa 2 - Evento
        tipoEvento: z.string().min(1),
        nomeEvento: z.string().optional().default(""),
        dataEvento: z.string().optional().default(""),
        localEvento: z.string().optional().default(""),
        cidadeEvento: z.string().min(1),
        estadoEvento: z.string().min(1),
        // Etapa 3 - Stand
        tipoStand: z.string().min(1),
        metragem: z.string().min(1),
        altura: z.string().optional().default(""),
        formato: z.string().optional().default(""),
        // Etapa 4 - Serviços
        servicosAdicionais: z.array(z.string()).optional().default([]),
        // Etapa 5 - Detalhes
        descricaoMarca: z.string().optional().default(""),
        referenciasVisuais: z.string().optional().default(""),
        orcamentoPrevisto: z.string().optional().default(""),
        observacoes: z.string().optional().default(""),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (db) {
          await db.insert(orcamentos).values({
            nome: input.nome,
            empresa: input.empresa,
            cargo: input.cargo,
            whatsapp: input.whatsapp,
            email: input.email,
            tipoEvento: input.tipoEvento,
            nomeEvento: input.nomeEvento,
            dataEvento: input.dataEvento,
            localEvento: input.localEvento,
            cidadeEvento: input.cidadeEvento,
            estadoEvento: input.estadoEvento,
            tipoStand: input.tipoStand,
            metragem: input.metragem,
            altura: input.altura,
            formato: input.formato,
            servicosAdicionais: input.servicosAdicionais.join(", "),
            descricaoMarca: input.descricaoMarca,
            referenciasVisuais: input.referenciasVisuais,
            orcamentoPrevisto: input.orcamentoPrevisto,
            observacoes: input.observacoes,
          });
        }

        const servicosStr = input.servicosAdicionais.length > 0
          ? input.servicosAdicionais.join(", ")
          : "Nenhum";

        await notifyOwner({
          title: `🏗️ Novo Orçamento Detalhado - ${input.empresa}`,
          content: `## Novo Orçamento Recebido\n\n**👤 Contato:** ${input.nome} (${input.cargo || "—"})\n**🏢 Empresa:** ${input.empresa}\n**📱 WhatsApp:** ${input.whatsapp}\n**📧 E-mail:** ${input.email}\n\n---\n\n**📅 Evento:** ${input.tipoEvento}${input.nomeEvento ? ` — ${input.nomeEvento}` : ""}\n**📍 Local:** ${input.cidadeEvento}/${input.estadoEvento}${input.localEvento ? ` — ${input.localEvento}` : ""}\n**🗓️ Data:** ${input.dataEvento || "A definir"}\n\n---\n\n**🏗️ Stand:** ${input.tipoStand}\n**📐 Metragem:** ${input.metragem}\n**📏 Altura:** ${input.altura || "A definir"}\n**🔲 Formato:** ${input.formato || "A definir"}\n\n**⚙️ Serviços Extras:** ${servicosStr}\n**💰 Orçamento Previsto:** ${input.orcamentoPrevisto || "A definir"}\n\n**📝 Observações:** ${input.observacoes || "—"}`,
        });

        return { success: true };
      }),

    listar: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(orcamentos).orderBy(orcamentos.criadoEm);
    }),
  }),
});

export type AppRouter = typeof appRouter;
