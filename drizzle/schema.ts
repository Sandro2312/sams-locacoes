import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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