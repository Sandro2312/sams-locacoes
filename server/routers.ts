import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { contatos } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  contato: router({
    enviar: publicProcedure
      .input(
        z.object({
          nome: z.string().min(1, "Nome é obrigatório"),
          empresa: z.string().optional().default(""),
          whatsapp: z.string().min(1, "WhatsApp é obrigatório"),
          email: z.string().email("E-mail inválido"),
          tipoEvento: z.string().optional().default(""),
          metragem: z.string().optional().default(""),
          mensagem: z.string().optional().default(""),
        })
      )
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

        // Notify owner about new contact
        await notifyOwner({
          title: `Novo Orçamento - ${input.nome}`,
          content: `**Nome:** ${input.nome}\n**Empresa:** ${input.empresa || "Não informado"}\n**WhatsApp:** ${input.whatsapp}\n**E-mail:** ${input.email}\n**Tipo de Evento:** ${input.tipoEvento || "Não informado"}\n**Metragem:** ${input.metragem || "Não informado"}\n**Mensagem:** ${input.mensagem || "Não informado"}`,
        });

        return { success: true };
      }),

    listar: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(contatos).orderBy(contatos.criadoEm);
    }),
  }),
});

export type AppRouter = typeof appRouter;
