import { bigint, date, decimal, index, int, mysqlEnum, mysqlTable, text, timestamp, tinyint, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

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

/**
 * Eventos comerciais consultados e acompanhados pelo CRM. Site e descrição
 * são opcionais para preservar os registros antigos e somente são sugeridos
 * após revisão humana na pesquisa assistida.
 */
export const crmEventos = mysqlTable("crm_eventos", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  organizadora: varchar("organizadora", { length: 255 }),
  local: varchar("local", { length: 255 }),
  endereco: text("endereco"),
  site: varchar("site", { length: 500 }),
  descricao: text("descricao"),
  dataInicio: varchar("data_inicio", { length: 50 }),
  dataFim: varchar("data_fim", { length: 50 }),
  status: varchar("status", { length: 50 }).notNull().default("Planejado"),
  taxasJson: text("taxas_json"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CrmEvento = typeof crmEventos.$inferSelect;
export type InsertCrmEvento = typeof crmEventos.$inferInsert;

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
 * Estado operacional do guia de fechamento. Valores financeiros continuam
 * calculados nas receitas, despesas e rateios de origem; este registro guarda
 * somente o avanço, as justificativas e a revisão humana por Projeto de Stand.
 */
export const crmProjetosStandFechamentos = mysqlTable("crm_projetos_stand_fechamentos", {
  id: int("id").autoincrement().primaryKey(),
  projetoStandId: int("projeto_stand_id").notNull().unique(),
  status: varchar("status", { length: 30 }).notNull().default("planejamento"),
  justificativaDivergencia: text("justificativa_divergencia"),
  observacoesRevisao: text("observacoes_revisao"),
  revisadoPor: int("revisado_por"),
  revisadoPorNome: varchar("revisado_por_nome", { length: 255 }),
  revisadoEm: timestamp("revisado_em"),
  createdBy: int("created_by").notNull(),
  updatedBy: int("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("crm_projetos_fechamentos_status_idx").on(table.status),
]);

/**
 * Checklist auditável de categorias financeiras. Cada categoria possui um
 * estado explícito, sem criar nem modificar lançamentos financeiros.
 */
export const crmProjetosStandFechamentoItens = mysqlTable("crm_projetos_stand_fechamento_itens", {
  id: int("id").autoincrement().primaryKey(),
  fechamentoId: int("fechamento_id").notNull(),
  categoria: varchar("categoria", { length: 50 }).notNull(),
  estado: varchar("estado", { length: 30 }).notNull().default("pendente"),
  valorEstimado: decimal("valor_estimado", { precision: 14, scale: 2 }),
  observacao: text("observacao"),
  atualizadoPor: int("atualizado_por").notNull(),
  atualizadoPorNome: varchar("atualizado_por_nome", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("crm_projetos_fechamento_itens_unique").on(table.fechamentoId, table.categoria),
  index("crm_projetos_fechamento_itens_fechamento_idx").on(table.fechamentoId),
]);

export type CrmProjetoStandFechamento = typeof crmProjetosStandFechamentos.$inferSelect;
export type InsertCrmProjetoStandFechamento = typeof crmProjetosStandFechamentos.$inferInsert;
export type CrmProjetoStandFechamentoItem = typeof crmProjetosStandFechamentoItens.$inferSelect;
export type InsertCrmProjetoStandFechamentoItem = typeof crmProjetosStandFechamentoItens.$inferInsert;

/**
 * Sessão financeira independente de venda ou Projeto de Stand. Ela organiza um
 * conjunto de receitas e despesas de um mesmo stand antes da confirmação humana
 * que cria os lançamentos nas tabelas financeiras de origem.
 */
export const crmLotesFinanceirosStand = mysqlTable("crm_lotes_financeiros_stand", {
  id: int("id").autoincrement().primaryKey(),
  codigo: varchar("codigo", { length: 60 }).notNull().unique(),
  clienteId: int("cliente_id").notNull(),
  eventoId: int("evento_id").notNull(),
  identificacaoStand: varchar("identificacao_stand", { length: 180 }).notNull(),
  centroCusto: varchar("centro_custo", { length: 220 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("rascunho"),
  observacoes: text("observacoes"),
  confirmadoPor: int("confirmado_por"),
  confirmadoPorNome: varchar("confirmado_por_nome", { length: 255 }),
  confirmadoEm: timestamp("confirmado_em"),
  createdBy: int("created_by").notNull(),
  updatedBy: int("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("crm_lotes_fin_stand_cliente_evento_idx").on(table.clienteId, table.eventoId),
  index("crm_lotes_fin_stand_status_idx").on(table.status),
]);

/**
 * Item em rascunho do lote. Receita parcela uma conta a receber na confirmação;
 * despesa parcela transações de saída. Os IDs criados são preservados aqui para
 * auditoria e nunca substituem os dados de origem.
 */
export const crmLotesFinanceirosStandItens = mysqlTable("crm_lotes_financeiros_stand_itens", {
  id: int("id").autoincrement().primaryKey(),
  loteId: int("lote_id").notNull(),
  natureza: varchar("natureza", { length: 20 }).notNull(),
  categoria: varchar("categoria", { length: 60 }).notNull().default("outros"),
  descricao: varchar("descricao", { length: 500 }).notNull(),
  valorTotal: decimal("valor_total", { precision: 14, scale: 2 }).notNull(),
  parcelas: int("parcelas").notNull().default(1),
  primeiroVencimento: date("primeiro_vencimento").notNull(),
  datasVencimento: text("datas_vencimento"),
  valoresParcelas: text("valores_parcelas"),
  formaPagamento: varchar("forma_pagamento", { length: 120 }),
  observacoes: text("observacoes"),
  status: varchar("status", { length: 30 }).notNull().default("rascunho"),
  lancamentosCriados: text("lancamentos_criados"),
  createdBy: int("created_by").notNull(),
  updatedBy: int("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("crm_lotes_fin_stand_itens_lote_idx").on(table.loteId),
  index("crm_lotes_fin_stand_itens_status_idx").on(table.status),
]);

export type CrmLoteFinanceiroStand = typeof crmLotesFinanceirosStand.$inferSelect;
export type InsertCrmLoteFinanceiroStand = typeof crmLotesFinanceirosStand.$inferInsert;
export type CrmLoteFinanceiroStandItem = typeof crmLotesFinanceirosStandItens.$inferSelect;
export type InsertCrmLoteFinanceiroStandItem = typeof crmLotesFinanceirosStandItens.$inferInsert;

/**
 * Metas comerciais e fechamento operacional de uma feira. Há no máximo um
 * registro por Evento; os totais financeiros e de captação continuam sendo
 * calculados nas tabelas de origem para não duplicar nem reescrever históricos.
 */
export const crmEventosResultados = mysqlTable("crm_eventos_resultados", {
  id: int("id").autoincrement().primaryKey(),
  eventoId: int("evento_id").notNull().unique(),
  status: varchar("status", { length: 30 }).notNull().default("planejamento"),
  objetivoComercial: varchar("objetivo_comercial", { length: 255 }),
  metaReunioes: int("meta_reunioes").notNull().default(0),
  reunioesRealizadas: int("reunioes_realizadas").notNull().default(0),
  metaLeads: int("meta_leads").notNull().default(0),
  metaPropostas: int("meta_propostas").notNull().default(0),
  metaReceita: decimal("meta_receita", { precision: 14, scale: 2 }).notNull().default("0"),
  resumoPosEvento: text("resumo_pos_evento"),
  aprendizados: text("aprendizados"),
  acoesFollowUp: text("acoes_follow_up"),
  encerradoEm: timestamp("encerrado_em"),
  encerradoPor: int("encerrado_por"),
  createdBy: int("created_by").notNull(),
  updatedBy: int("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("crm_eventos_resultados_status_idx").on(table.status),
]);

export type CrmEventoResultado = typeof crmEventosResultados.$inferSelect;
export type InsertCrmEventoResultado = typeof crmEventosResultados.$inferInsert;

/**
 * Orçamento técnico-comercial versionado de um Projeto de Stand. Cada versão
 * preserva a composição e os valores de custo/venda para comparação futura.
 */
export const crmOrcamentosTecnicos = mysqlTable("crm_orcamentos_tecnicos", {
  id: int("id").autoincrement().primaryKey(),
  projetoStandId: int("projeto_stand_id").notNull(),
  numeroVersao: int("numero_versao").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  status: varchar("status", { length: 40 }).notNull().default("rascunho"),
  subtotalCusto: decimal("subtotal_custo", { precision: 14, scale: 2 }).notNull().default("0"),
  subtotalVenda: decimal("subtotal_venda", { precision: 14, scale: 2 }).notNull().default("0"),
  desconto: decimal("desconto", { precision: 14, scale: 2 }).notNull().default("0"),
  valorVendaFinal: decimal("valor_venda_final", { precision: 14, scale: 2 }).notNull().default("0"),
  margem: decimal("margem", { precision: 14, scale: 2 }).notNull().default("0"),
  margemPercentual: decimal("margem_percentual", { precision: 9, scale: 4 }),
  composicaoPendente: tinyint("composicao_pendente").notNull().default(0),
  observacoes: text("observacoes"),
  criadoPor: int("criado_por").notNull(),
  criadoPorNome: varchar("criado_por_nome", { length: 255 }),
  aprovadoPor: int("aprovado_por"),
  aprovadoPorNome: varchar("aprovado_por_nome", { length: 255 }),
  aprovadoEm: timestamp("aprovado_em"),
  enviadoEm: timestamp("enviado_em"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("crm_orcamentos_tecnicos_projeto_versao_unique").on(table.projetoStandId, table.numeroVersao),
  index("crm_orcamentos_tecnicos_projeto_idx").on(table.projetoStandId),
  index("crm_orcamentos_tecnicos_status_idx").on(table.status),
]);

/** Itens da composição de cada versão; totais são gravados em centavos pelo servidor. */
export const crmOrcamentosTecnicosItens = mysqlTable("crm_orcamentos_tecnicos_itens", {
  id: int("id").autoincrement().primaryKey(),
  orcamentoTecnicoId: int("orcamento_tecnico_id").notNull(),
  categoria: varchar("categoria", { length: 80 }).notNull().default("outros"),
  descricao: varchar("descricao", { length: 500 }).notNull(),
  quantidade: decimal("quantidade", { precision: 14, scale: 3 }).notNull().default("1"),
  custoUnitario: decimal("custo_unitario", { precision: 14, scale: 2 }).notNull().default("0"),
  precoUnitario: decimal("preco_unitario", { precision: 14, scale: 2 }).notNull().default("0"),
  custoTotal: decimal("custo_total", { precision: 14, scale: 2 }).notNull().default("0"),
  valorTotal: decimal("valor_total", { precision: 14, scale: 2 }).notNull().default("0"),
  ordem: int("ordem").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("crm_orcamentos_tecnicos_itens_orcamento_idx").on(table.orcamentoTecnicoId),
]);

export type CrmOrcamentoTecnico = typeof crmOrcamentosTecnicos.$inferSelect;
export type InsertCrmOrcamentoTecnico = typeof crmOrcamentosTecnicos.$inferInsert;
export type CrmOrcamentoTecnicoItem = typeof crmOrcamentosTecnicosItens.$inferSelect;
export type InsertCrmOrcamentoTecnicoItem = typeof crmOrcamentosTecnicosItens.$inferInsert;

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
  iaAutorizada: int("ia_autorizada").notNull().default(0),
  iaAutorizadaEm: timestamp("ia_autorizada_em"),
  iaAutorizadaPor: int("ia_autorizada_por"),
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
  localAudiencia: varchar("local_audiencia", { length: 500 }),
  linkAudiencia: varchar("link_audiencia", { length: 2000 }),
  horaAudiencia: varchar("hora_audiencia", { length: 5 }),
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

/** Relação não destrutiva entre processo jurídico e documento mantido no Acervo. */
export const crmProcessosJuridicosDocumentos = mysqlTable("crm_processos_juridicos_documentos", {
  id: int("id").autoincrement().primaryKey(),
  processoId: int("processo_id").notNull(),
  acervoId: int("acervo_id").notNull(),
  classificacao: varchar("classificacao", { length: 60 }).notNull().default("outro"),
  categoriaDossie: varchar("categoria_dossie", { length: 60 }).notNull().default("dossie_geral"),
  tagsDossie: text("tags_dossie"),
  observacao: text("observacao"),
  anexadoPor: int("anexado_por").notNull(),
  anexadoPorNome: varchar("anexado_por_nome", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("crm_processos_documentos_processo_acervo_unique").on(table.processoId, table.acervoId),
  index("crm_processos_documentos_processo_idx").on(table.processoId, table.createdAt),
  index("crm_processos_documentos_acervo_idx").on(table.acervoId),
]);

export type CrmProcessoJuridico = typeof crmProcessosJuridicos.$inferSelect;
export type InsertCrmProcessoJuridico = typeof crmProcessosJuridicos.$inferInsert;
export type CrmProcessoJuridicoDocumento = typeof crmProcessosJuridicosDocumentos.$inferSelect;

/** Liga documentos já preservados no Acervo a uma audiência ou prazo específico. */
export const crmProcessosJuridicosPrazosDocumentos = mysqlTable("crm_processos_juridicos_prazos_documentos", {
  id: int("id").autoincrement().primaryKey(),
  prazoId: int("prazo_id").notNull(),
  documentoVinculoId: int("documento_vinculo_id").notNull(),
  anexadoPor: int("anexado_por").notNull(),
  anexadoPorNome: varchar("anexado_por_nome", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("crm_prazos_documentos_unique").on(table.prazoId, table.documentoVinculoId),
  index("crm_prazos_documentos_prazo_idx").on(table.prazoId),
]);

/** Peça preparada no CRM para revisão e protocolo manual no tribunal competente. */
export const crmProcessosJuridicosPecas = mysqlTable("crm_processos_juridicos_pecas", {
  id: int("id").autoincrement().primaryKey(),
  processoId: int("processo_id").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  tipo: varchar("tipo", { length: 60 }).notNull().default("peticao_intermediaria"),
  status: varchar("status", { length: 40 }).notNull().default("rascunho"),
  conteudo: text("conteudo"),
  checklist: text("checklist"),
  versaoAtual: int("versao_atual").notNull().default(1),
  aprovadoPor: int("aprovado_por"),
  aprovadoPorNome: varchar("aprovado_por_nome", { length: 255 }),
  aprovadoEm: timestamp("aprovado_em"),
  protocoloNumero: varchar("protocolo_numero", { length: 120 }),
  protocoladoEm: timestamp("protocolado_em"),
  reciboAcervoId: int("recibo_acervo_id"),
  createdBy: int("created_by").notNull(),
  createdByNome: varchar("created_by_nome", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("crm_pecas_processo_status_idx").on(table.processoId, table.status),
  index("crm_pecas_processo_atualizado_idx").on(table.processoId, table.updatedAt),
]);

/** Histórico imutável das revisões de uma peça jurídica. */
export const crmProcessosJuridicosPecasVersoes = mysqlTable("crm_processos_juridicos_pecas_versoes", {
  id: int("id").autoincrement().primaryKey(),
  pecaId: int("peca_id").notNull(),
  versao: int("versao").notNull(),
  conteudo: text("conteudo").notNull(),
  resumoAlteracoes: varchar("resumo_alteracoes", { length: 500 }),
  createdBy: int("created_by").notNull(),
  createdByNome: varchar("created_by_nome", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("crm_pecas_versoes_peca_versao_unique").on(table.pecaId, table.versao),
  index("crm_pecas_versoes_peca_idx").on(table.pecaId, table.createdAt),
]);

/** Resultados rastreáveis de IA assistiva; não são atos processuais nem decisões. */
export const crmProcessosJuridicosIaAnalises = mysqlTable("crm_processos_juridicos_ia_analises", {
  id: int("id").autoincrement().primaryKey(),
  processoId: int("processo_id").notNull(),
  documentoVinculoId: int("documento_vinculo_id"),
  tipo: varchar("tipo", { length: 40 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("gerado"),
  resultado: text("resultado").notNull(),
  fontes: text("fontes"),
  modelo: varchar("modelo", { length: 120 }),
  geradoPor: int("gerado_por").notNull(),
  geradoPorNome: varchar("gerado_por_nome", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("crm_ia_analises_processo_tipo_idx").on(table.processoId, table.tipo, table.createdAt),
  index("crm_ia_analises_documento_idx").on(table.documentoVinculoId),
]);

export type CrmProcessoJuridicoPeca = typeof crmProcessosJuridicosPecas.$inferSelect;
export type CrmProcessoJuridicoPecaVersao = typeof crmProcessosJuridicosPecasVersoes.$inferSelect;
export type CrmProcessoJuridicoIaAnalise = typeof crmProcessosJuridicosIaAnalises.$inferSelect;

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
