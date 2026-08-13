import { bigint, date, decimal, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

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

/**
 * Regra aprovada para distribuir uma despesa compartilhada de evento sem
 * modificar a transação de origem. Cada despesa pode ter no máximo uma regra.
 */
export const crmRateioRegras = mysqlTable("crm_rateio_regras", {
  id: int("id").autoincrement().primaryKey(),
  transacaoId: int("transacao_id").notNull(),
  eventoId: int("evento_id").notNull(),
  criterio: varchar("criterio", { length: 30 }).notNull(),
  valorOrigem: decimal("valor_origem", { precision: 14, scale: 2 }).notNull(),
  observacoes: text("observacoes"),
  status: varchar("status", { length: 20 }).notNull().default("aprovado"),
  createdBy: int("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("crm_rateio_regras_transacao_unique").on(table.transacaoId),
  index("crm_rateio_regras_evento_idx").on(table.eventoId),
]);

/**
 * Livro de alocações de uma regra de rateio. O somatório deve ser exatamente
 * igual ao valor da despesa de origem, preservando rastreabilidade por stand.
 */
export const crmRateioAlocacoes = mysqlTable("crm_rateio_alocacoes", {
  id: int("id").autoincrement().primaryKey(),
  regraId: int("regra_id").notNull(),
  projetoStandId: int("projeto_stand_id").notNull(),
  percentual: decimal("percentual", { precision: 9, scale: 6 }).notNull(),
  valor: decimal("valor", { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("crm_rateio_alocacoes_regra_projeto_unique").on(table.regraId, table.projetoStandId),
  index("crm_rateio_alocacoes_projeto_idx").on(table.projetoStandId),
]);

export type CrmRateioRegra = typeof crmRateioRegras.$inferSelect;
export type CrmRateioAlocacao = typeof crmRateioAlocacoes.$inferSelect;

/**
 * Processo judicial persistente. O ramo é obrigatório para separar o fluxo
 * Trabalhista do Cível; documentos pessoais não são duplicados nesta tabela.
 */
export const crmProcessosJuridicos = mysqlTable("crm_processos_juridicos", {
  id: int("id").autoincrement().primaryKey(),
  codigo: varchar("codigo", { length: 40 }).notNull().unique(),
  numeroCnj: varchar("numero_cnj", { length: 25 }).unique(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  ramoProcessual: varchar("ramo_processual", { length: 20 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("pre_processual"),
  sigiloso: int("sigiloso").notNull().default(0),
  tribunal: varchar("tribunal", { length: 120 }),
  uf: varchar("uf", { length: 2 }),
  comarca: varchar("comarca", { length: 120 }),
  vara: varchar("vara", { length: 180 }),
  grau: varchar("grau", { length: 40 }),
  classeProcessual: varchar("classe_processual", { length: 180 }),
  assunto: varchar("assunto", { length: 255 }),
  poloEmpresa: varchar("polo_empresa", { length: 30 }),
  valorCausa: decimal("valor_causa", { precision: 14, scale: 2 }),
  clienteId: int("cliente_id"),
  leadId: int("lead_id"),
  fornecedorId: int("fornecedor_id"),
  eventoId: int("evento_id"),
  contratoId: int("contrato_id"),
  parteExternaNome: varchar("parte_externa_nome", { length: 255 }),
  responsavelId: int("responsavel_id"),
  responsavelNome: varchar("responsavel_nome", { length: 255 }),
  dataDistribuicao: date("data_distribuicao"),
  proximoPrazo: date("proximo_prazo"),
  ultimaFonteConsulta: varchar("ultima_fonte_consulta", { length: 60 }),
  ultimaConsultaEm: timestamp("ultima_consulta_em"),
  observacoes: text("observacoes"),
  createdBy: int("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("crm_processos_ramo_status_idx").on(table.ramoProcessual, table.status),
  index("crm_processos_responsavel_prazo_idx").on(table.responsavelId, table.proximoPrazo),
  index("crm_processos_cliente_idx").on(table.clienteId),
  index("crm_processos_lead_idx").on(table.leadId),
]);

/** Agenda jurídica com histórico de prazos por processo. */
export const crmProcessosJuridicosPrazos = mysqlTable("crm_processos_juridicos_prazos", {
  id: int("id").autoincrement().primaryKey(),
  processoId: int("processo_id").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  tipo: varchar("tipo", { length: 60 }).notNull().default("prazo_processual"),
  dataPrazo: date("data_prazo").notNull(),
  status: varchar("status", { length: 30 }).notNull().default("pendente"),
  responsavelId: int("responsavel_id"),
  responsavelNome: varchar("responsavel_nome", { length: 255 }),
  observacoes: text("observacoes"),
  createdBy: int("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("crm_processos_prazos_processo_idx").on(table.processoId),
  index("crm_processos_prazos_data_status_idx").on(table.dataPrazo, table.status),
]);

/** Log de consultas externas; mantém fonte e resultado resumido para revisão humana. */
export const crmProcessosJuridicosConsultas = mysqlTable("crm_processos_juridicos_consultas", {
  id: int("id").autoincrement().primaryKey(),
  processoId: int("processo_id").notNull(),
  fonte: varchar("fonte", { length: 60 }).notNull(),
  numeroConsultado: varchar("numero_consultado", { length: 25 }).notNull(),
  sucesso: int("sucesso").notNull().default(0),
  resumo: text("resumo"),
  consultadoPor: int("consultado_por").notNull(),
  consultadoEm: timestamp("consultado_em").defaultNow().notNull(),
}, (table) => [
  index("crm_processos_consultas_processo_data_idx").on(table.processoId, table.consultadoEm),
]);

export type CrmProcessoJuridico = typeof crmProcessosJuridicos.$inferSelect;
export type InsertCrmProcessoJuridico = typeof crmProcessosJuridicos.$inferInsert;

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
