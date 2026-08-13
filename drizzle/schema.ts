import { bigint, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your tables here
export const contatos = mysqlTable("contatos", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  empresa: varchar("empresa", { length: 255 }).default(""),
  whatsapp: varchar("whatsapp", { length: 30 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  tipoEvento: varchar("tipoEvento", { length: 100 }).default(""),
  metragem: varchar("metragem", { length: 50 }).default(""),
  mensagem: text("mensagem"),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
});

export type Contato = typeof contatos.$inferSelect;
export type InsertContato = typeof contatos.$inferInsert;

export const orcamentos = mysqlTable("orcamentos", {
  id: int("id").autoincrement().primaryKey(),
  // Dados pessoais
  nome: varchar("nome", { length: 255 }).notNull(),
  empresa: varchar("empresa", { length: 255 }).notNull(),
  cargo: varchar("cargo", { length: 100 }),
  whatsapp: varchar("whatsapp", { length: 30 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  // Evento
  tipoEvento: varchar("tipoEvento", { length: 100 }).notNull(),
  nomeEvento: varchar("nomeEvento", { length: 255 }),
  dataEvento: varchar("dataEvento", { length: 50 }),
  localEvento: varchar("localEvento", { length: 255 }),
  cidadeEvento: varchar("cidadeEvento", { length: 100 }).notNull(),
  estadoEvento: varchar("estadoEvento", { length: 2 }).notNull(),
  // Stand
  tipoStand: varchar("tipoStand", { length: 100 }).notNull(),
  metragem: varchar("metragem", { length: 50 }).notNull(),
  altura: varchar("altura", { length: 50 }),
  formato: varchar("formato", { length: 100 }),
  // Serviços e detalhes
  servicosAdicionais: text("servicosAdicionais"),
  descricaoMarca: text("descricaoMarca"),
  referenciasVisuais: text("referenciasVisuais"),
  orcamentoPrevisto: varchar("orcamentoPrevisto", { length: 100 }),
  observacoes: text("observacoes"),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
});

export type Orcamento = typeof orcamentos.$inferSelect;
export type InsertOrcamento = typeof orcamentos.$inferInsert;

/**
 * Unidade de apuração para um stand de determinado cliente dentro de uma feira.
 * Os vínculos em despesas e receitas são opcionais para preservar o histórico
 * já existente e permitir adoção gradual nos novos lançamentos.
 */
export const crmProjetosStand = mysqlTable("crm_projetos_stand", {
  id: int("id").autoincrement().primaryKey(),
  codigo: varchar("codigo", { length: 60 }).notNull().unique(),
  eventoId: int("evento_id").notNull(),
  clienteId: int("cliente_id"),
  leadId: int("lead_id"),
  oportunidadeId: int("oportunidade_id"),
  contratoId: int("contrato_id"),
  nome: varchar("nome", { length: 255 }).notNull(),
  referenciaStand: varchar("referencia_stand", { length: 120 }),
  pavilhao: varchar("pavilhao", { length: 120 }),
  areaM2: varchar("area_m2", { length: 30 }),
  centroCusto: varchar("centro_custo", { length: 150 }),
  status: varchar("status", { length: 30 }).notNull().default("planejado"),
  situacaoComercial: varchar("situacao_comercial", { length: 30 }).notNull().default("prospecto"),
  observacoes: text("observacoes"),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CrmProjetoStand = typeof crmProjetosStand.$inferSelect;
export type InsertCrmProjetoStand = typeof crmProjetosStand.$inferInsert;

export const crmTickets = mysqlTable("crm_tickets", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  codigo: varchar("codigo", { length: 30 }).notNull().unique(),
  titulo: varchar("titulo", { length: 180 }).notNull(),
  descricao: text("descricao").notNull(),
  categoria: varchar("categoria", { length: 40 }).notNull().default("problema"),
  prioridade: varchar("prioridade", { length: 20 }).notNull().default("normal"),
  status: varchar("status", { length: 30 }).notNull().default("aberto"),
  solicitanteId: int("solicitante_id").notNull(),
  solicitanteNome: varchar("solicitante_nome", { length: 255 }).notNull(),
  solicitanteEmail: varchar("solicitante_email", { length: 255 }),
  responsavelId: int("responsavel_id"),
  responsavelNome: varchar("responsavel_nome", { length: 255 }),
  prazoAt: timestamp("prazo_at"),
  firstResponseAt: timestamp("first_response_at"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const crmTicketMensagens = mysqlTable("crm_ticket_mensagens", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  ticketId: bigint("ticket_id", { mode: "number" }).notNull(),
  autorId: int("autor_id").notNull(),
  autorNome: varchar("autor_nome", { length: 255 }).notNull(),
  tipoAutor: varchar("tipo_autor", { length: 20 }).notNull(),
  mensagem: text("mensagem"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const crmTicketAnexos = mysqlTable("crm_ticket_anexos", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  ticketId: bigint("ticket_id", { mode: "number" }).notNull(),
  mensagemId: bigint("mensagem_id", { mode: "number" }),
  nomeOriginal: varchar("nome_original", { length: 180 }).notNull(),
  arquivoKey: varchar("arquivo_key", { length: 500 }).notNull(),
  arquivoUrl: text("arquivo_url").notNull(),
  mimeType: varchar("mime_type", { length: 120 }).notNull(),
  tamanhoBytes: bigint("tamanho_bytes", { mode: "number" }).notNull().default(0),
  createdBy: int("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CrmTicket = typeof crmTickets.$inferSelect;
export type InsertCrmTicket = typeof crmTickets.$inferInsert;
