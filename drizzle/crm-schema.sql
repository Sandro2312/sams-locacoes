-- SAMS Locações CRM/ERP — Schema MySQL
-- Migrado de SQLite para MySQL/TiDB
-- 26 tabelas cobrindo: Users, Leads, Clientes, Comercial, Projetos, Financeiro, OS

SET FOREIGN_KEY_CHECKS = 0;

-- Users (CRM — separado dos users do site)
CREATE TABLE IF NOT EXISTS crm_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','manager','vendedor','projetista','montador','financeiro','juridico') NOT NULL DEFAULT 'vendedor',
  active TINYINT(1) NOT NULL DEFAULT 1,
  last_login DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Leads
CREATE TABLE IF NOT EXISTS crm_leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  telefone VARCHAR(50) NULL,
  whatsapp VARCHAR(50) NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'novo',
  origem VARCHAR(100) DEFAULT 'direto',
  segmento VARCHAR(100) NULL,
  evento_interesse VARCHAR(255) NULL,
  metragem_estimada DECIMAL(10,2) NULL,
  responsavel_id INT NULL,
  temperatura ENUM('frio','morno','quente') DEFAULT 'frio',
  proximo_contato DATE NULL,
  observacoes TEXT NULL,
  score INT DEFAULT 0,
  first_response_at DATETIME NULL,
  last_activity_at DATETIME NULL,
  utm_source VARCHAR(100) NULL,
  utm_medium VARCHAR(100) NULL,
  utm_campaign VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (responsavel_id) REFERENCES crm_users(id) ON DELETE SET NULL
);

-- Clientes
CREATE TABLE IF NOT EXISTS crm_clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  telefone VARCHAR(50) NULL,
  documento VARCHAR(50) NULL,
  cep VARCHAR(20) NULL,
  endereco VARCHAR(255) NULL,
  bairro VARCHAR(100) NULL,
  cidade VARCHAR(100) NULL,
  estado VARCHAR(50) NULL,
  segmento VARCHAR(100) NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Ativo',
  observacoes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Contatos
CREATE TABLE IF NOT EXISTS crm_contatos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  telefone VARCHAR(50) NULL,
  whatsapp VARCHAR(50) NULL,
  empresa VARCHAR(255) NULL,
  cargo VARCHAR(100) NULL,
  segmento VARCHAR(100) NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Ativo',
  tags TEXT NULL,
  observacoes TEXT NULL,
  origem VARCHAR(100) NULL,
  aniversario VARCHAR(20) NULL,
  datas_importantes TEXT NULL,
  responsavel_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (responsavel_id) REFERENCES crm_users(id) ON DELETE SET NULL
);

-- Cliente Arquivos
CREATE TABLE IF NOT EXISTS crm_cliente_arquivos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL DEFAULT 'outro',
  url TEXT NOT NULL,
  tamanho_kb INT NULL,
  observacoes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES crm_clientes(id) ON DELETE CASCADE
);

-- Lead Interactions
CREATE TABLE IF NOT EXISTS crm_lead_interactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lead_id INT NOT NULL,
  user_id INT NULL,
  tipo VARCHAR(50) NOT NULL DEFAULT 'nota',
  descricao TEXT NOT NULL,
  data_interacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES crm_users(id) ON DELETE SET NULL
);

-- Vendas
CREATE TABLE IF NOT EXISTS crm_vendas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NULL,
  lead_id INT NULL,
  responsavel_id INT NULL,
  valor DECIMAL(15,2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'aberta',
  data_venda DATE NULL,
  observacoes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES crm_clientes(id) ON DELETE SET NULL,
  FOREIGN KEY (responsavel_id) REFERENCES crm_users(id) ON DELETE SET NULL
);

-- Contas a Receber
CREATE TABLE IF NOT EXISTS crm_contas_receber (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NULL,
  venda_id INT NULL,
  contrato_id INT NULL,
  descricao VARCHAR(255) NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  vencimento DATE NOT NULL,
  status ENUM('pendente','pago','vencido','cancelado') NOT NULL DEFAULT 'pendente',
  data_pagamento DATE NULL,
  valor_pago DECIMAL(15,2) NULL,
  forma_pagamento VARCHAR(100) NULL,
  comprovante_url TEXT NULL,
  observacoes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES crm_clientes(id) ON DELETE SET NULL
);

-- Metas
CREATE TABLE IF NOT EXISTS crm_metas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendedor_id INT NOT NULL,
  ano_ref INT NOT NULL,
  mes_ref INT NOT NULL DEFAULT 0,
  valor_meta DECIMAL(15,2) NOT NULL,
  tipo ENUM('mensal','anual') NOT NULL DEFAULT 'mensal',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_metas_vendedor_periodo (vendedor_id, ano_ref, mes_ref, tipo),
  FOREIGN KEY (vendedor_id) REFERENCES crm_users(id) ON DELETE CASCADE
);

-- Regras de Comissão
CREATE TABLE IF NOT EXISTS crm_comissao_regras (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendedor_id INT NULL,
  base_percent DECIMAL(5,4) NOT NULL DEFAULT 0.03,
  bonus_percent DECIMAL(5,4) NOT NULL DEFAULT 0.05,
  bonus_threshold DECIMAL(5,4) NOT NULL DEFAULT 1.0,
  base_status ENUM('pagas','faturadas') NOT NULL DEFAULT 'pagas',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vendedor_id) REFERENCES crm_users(id) ON DELETE CASCADE
);

-- Auditoria
CREATE TABLE IF NOT EXISTS crm_auditoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id INT NULL,
  details TEXT NULL,
  ip VARCHAR(50) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES crm_users(id) ON DELETE SET NULL
);

-- Eventos (feiras e eventos corporativos)
CREATE TABLE IF NOT EXISTS crm_eventos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  organizadora VARCHAR(255) NULL,
  local VARCHAR(255) NULL,
  endereco TEXT NULL,
  data_inicio VARCHAR(50) NULL,
  data_fim VARCHAR(50) NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Planejado',
  taxas_json TEXT NULL,
  observacoes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Briefings
CREATE TABLE IF NOT EXISTS crm_briefings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa VARCHAR(255) NOT NULL,
  responsavel VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  telefone VARCHAR(50) NOT NULL,
  nome_evento VARCHAR(255) NOT NULL,
  tipo_evento VARCHAR(100) NOT NULL,
  data_inicio VARCHAR(50) NULL,
  data_termino VARCHAR(50) NULL,
  local_evento VARCHAR(255) NOT NULL,
  tipo_stand VARCHAR(100) NOT NULL,
  localizacao_stand VARCHAR(100) NOT NULL,
  metragem DECIMAL(10,2) NOT NULL,
  segmento_principal VARCHAR(100) NOT NULL,
  orcamento_estimado DECIMAL(15,2) NULL,
  status VARCHAR(100) NOT NULL DEFAULT 'Em Análise',
  payload_json LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Projetos
CREATE TABLE IF NOT EXISTS crm_projetos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  briefing_id INT NULL,
  oportunidade_id INT NULL,
  responsavel_id INT NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT NULL,
  area_m2 DECIMAL(10,2) NULL,
  tipo_stand VARCHAR(100) NULL,
  status ENUM('recebido','em_elaboracao','aguardando_revisao','revisao_cliente','aprovado','finalizado','cancelado') NOT NULL DEFAULT 'recebido',
  versao INT DEFAULT 1,
  observacoes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (briefing_id) REFERENCES crm_briefings(id) ON DELETE SET NULL,
  FOREIGN KEY (responsavel_id) REFERENCES crm_users(id) ON DELETE SET NULL
);

-- Projeto Arquivos
CREATE TABLE IF NOT EXISTS crm_projeto_arquivos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projeto_id INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  tipo ENUM('planta','render','memorial','orcamento','foto','outro') NOT NULL,
  url TEXT NOT NULL,
  tamanho_kb INT NULL,
  versao INT DEFAULT 1,
  observacoes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projeto_id) REFERENCES crm_projetos(id) ON DELETE CASCADE
);

-- Projeto Histórico
CREATE TABLE IF NOT EXISTS crm_projeto_historico (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projeto_id INT NOT NULL,
  user_id INT NULL,
  status_anterior VARCHAR(100) NULL,
  status_novo VARCHAR(100) NULL,
  comentario TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projeto_id) REFERENCES crm_projetos(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES crm_users(id) ON DELETE SET NULL
);

-- Orçamentos
CREATE TABLE IF NOT EXISTS crm_orcamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  oportunidade_id INT NULL,
  briefing_id INT NULL,
  projeto_id INT NULL,
  responsavel_id INT NULL,
  titulo VARCHAR(255) NOT NULL,
  versao INT DEFAULT 1,
  status ENUM('rascunho','enviado','aprovado','reprovado','revisao','cancelado') NOT NULL DEFAULT 'rascunho',
  validade_dias INT DEFAULT 15,
  observacoes TEXT NULL,
  desconto_percentual DECIMAL(5,2) DEFAULT 0,
  total_bruto DECIMAL(15,2) DEFAULT 0,
  total_liquido DECIMAL(15,2) DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (briefing_id) REFERENCES crm_briefings(id) ON DELETE SET NULL,
  FOREIGN KEY (projeto_id) REFERENCES crm_projetos(id) ON DELETE SET NULL,
  FOREIGN KEY (responsavel_id) REFERENCES crm_users(id) ON DELETE SET NULL
);

-- Orçamento Itens
CREATE TABLE IF NOT EXISTS crm_orcamento_itens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orcamento_id INT NOT NULL,
  categoria ENUM('projeto','materiais','locacao','mao_de_obra','transporte','taxas_pavilhao','outros') NOT NULL,
  descricao VARCHAR(255) NOT NULL,
  quantidade DECIMAL(10,3) DEFAULT 1,
  unidade VARCHAR(20) DEFAULT 'un',
  valor_unitario DECIMAL(15,2) DEFAULT 0,
  valor_total DECIMAL(15,2) DEFAULT 0,
  observacoes TEXT NULL,
  FOREIGN KEY (orcamento_id) REFERENCES crm_orcamentos(id) ON DELETE CASCADE
);

-- Contratos
CREATE TABLE IF NOT EXISTS crm_contratos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  oportunidade_id INT NULL,
  cliente_id INT NULL,
  responsavel_id INT NULL,
  numero VARCHAR(100) UNIQUE NULL,
  titulo VARCHAR(255) NOT NULL,
  valor_contratado DECIMAL(15,2) NOT NULL DEFAULT 0,
  status ENUM('rascunho','aguardando_assinatura','assinado','em_execucao','encerrado','cancelado') NOT NULL DEFAULT 'rascunho',
  data_assinatura DATE NULL,
  data_inicio DATE NULL,
  data_fim DATE NULL,
  condicoes_pagamento TEXT NULL,
  arquivo_url TEXT NULL,
  observacoes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES crm_clientes(id) ON DELETE SET NULL,
  FOREIGN KEY (responsavel_id) REFERENCES crm_users(id) ON DELETE SET NULL
);

-- Contrato Parcelas
CREATE TABLE IF NOT EXISTS crm_contrato_parcelas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contrato_id INT NOT NULL,
  numero_parcela INT NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  vencimento DATE NOT NULL,
  status ENUM('pendente','pago','vencido','cancelado') NOT NULL DEFAULT 'pendente',
  data_pagamento DATE NULL,
  valor_pago DECIMAL(15,2) NULL,
  observacoes TEXT NULL,
  FOREIGN KEY (contrato_id) REFERENCES crm_contratos(id) ON DELETE CASCADE
);

-- Ordens de Serviço
CREATE TABLE IF NOT EXISTS crm_ordens_servico (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contrato_id INT NULL,
  oportunidade_id INT NULL,
  evento_id INT NULL,
  responsavel_id INT NULL,
  numero VARCHAR(100) UNIQUE NULL,
  titulo VARCHAR(255) NOT NULL,
  tipo ENUM('montagem','desmontagem','manutencao') NOT NULL DEFAULT 'montagem',
  status ENUM('planejada','confirmada','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'planejada',
  data_inicio DATETIME NULL,
  data_fim DATETIME NULL,
  local_evento VARCHAR(255) NULL,
  credenciais TEXT NULL,
  observacoes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (contrato_id) REFERENCES crm_contratos(id) ON DELETE SET NULL,
  FOREIGN KEY (evento_id) REFERENCES crm_eventos(id) ON DELETE SET NULL,
  FOREIGN KEY (responsavel_id) REFERENCES crm_users(id) ON DELETE SET NULL
);

-- OS Equipe
CREATE TABLE IF NOT EXISTS crm_os_equipe (
  id INT AUTO_INCREMENT PRIMARY KEY,
  os_id INT NOT NULL,
  user_id INT NULL,
  nome_externo VARCHAR(255) NULL,
  funcao VARCHAR(100) NULL,
  confirmado TINYINT(1) DEFAULT 0,
  FOREIGN KEY (os_id) REFERENCES crm_ordens_servico(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES crm_users(id) ON DELETE SET NULL
);

-- OS Materiais
CREATE TABLE IF NOT EXISTS crm_os_materiais (
  id INT AUTO_INCREMENT PRIMARY KEY,
  os_id INT NOT NULL,
  descricao VARCHAR(255) NOT NULL,
  quantidade DECIMAL(10,3) DEFAULT 1,
  unidade VARCHAR(20) DEFAULT 'un',
  status ENUM('pendente','separado','enviado','devolvido') DEFAULT 'pendente',
  FOREIGN KEY (os_id) REFERENCES crm_ordens_servico(id) ON DELETE CASCADE
);

-- OS Fotos
CREATE TABLE IF NOT EXISTS crm_os_fotos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  os_id INT NOT NULL,
  url TEXT NOT NULL,
  tipo ENUM('antes','durante','depois','avaria') NOT NULL,
  descricao TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (os_id) REFERENCES crm_ordens_servico(id) ON DELETE CASCADE
);

-- Oportunidades (pipeline kanban)
CREATE TABLE IF NOT EXISTS crm_oportunidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lead_id INT NOT NULL,
  briefing_id INT NULL,
  projeto_id INT NULL,
  contrato_id INT NULL,
  responsavel_id INT NULL,
  etapa ENUM(
    'novo_lead','em_contato','briefing_recebido','projeto_em_andamento',
    'proposta_enviada','negociacao','contrato_assinado',
    'em_producao','em_montagem','concluido','perdido'
  ) NOT NULL DEFAULT 'novo_lead',
  valor_estimado DECIMAL(15,2) NULL,
  valor_contratado DECIMAL(15,2) NULL,
  motivo_perda TEXT NULL,
  evento_id INT NULL,
  data_evento DATE NULL,
  observacoes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE,
  FOREIGN KEY (briefing_id) REFERENCES crm_briefings(id) ON DELETE SET NULL,
  FOREIGN KEY (projeto_id) REFERENCES crm_projetos(id) ON DELETE SET NULL,
  FOREIGN KEY (contrato_id) REFERENCES crm_contratos(id) ON DELETE SET NULL,
  FOREIGN KEY (responsavel_id) REFERENCES crm_users(id) ON DELETE SET NULL,
  FOREIGN KEY (evento_id) REFERENCES crm_eventos(id) ON DELETE SET NULL
);

-- Briefing Checklist
CREATE TABLE IF NOT EXISTS crm_briefing_checklist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  briefing_id INT NOT NULL,
  fase VARCHAR(100) NOT NULL,
  item VARCHAR(255) NOT NULL,
  done TINYINT(1) NOT NULL DEFAULT 0,
  ordem INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (briefing_id) REFERENCES crm_briefings(id) ON DELETE CASCADE
);

-- Tarefas Admin
CREATE TABLE IF NOT EXISTS crm_tarefas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT NULL,
  responsavel_id INT NULL,
  status ENUM('pendente','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'pendente',
  prioridade ENUM('baixa','media','alta','urgente') NOT NULL DEFAULT 'media',
  data_vencimento DATE NULL,
  modulo VARCHAR(100) NULL,
  referencia_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (responsavel_id) REFERENCES crm_users(id) ON DELETE SET NULL
);

-- Configurações do sistema CRM
CREATE TABLE IF NOT EXISTS crm_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chave VARCHAR(100) NOT NULL UNIQUE,
  valor TEXT NULL,
  descricao VARCHAR(255) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_responsavel ON crm_leads(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_temperatura ON crm_leads(temperatura);
CREATE INDEX IF NOT EXISTS idx_crm_oportunidades_etapa ON crm_oportunidades(etapa);
CREATE INDEX IF NOT EXISTS idx_crm_oportunidades_responsavel ON crm_oportunidades(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_crm_briefings_status ON crm_briefings(status);
CREATE INDEX IF NOT EXISTS idx_crm_contas_status ON crm_contas_receber(status);
CREATE INDEX IF NOT EXISTS idx_crm_contas_vencimento ON crm_contas_receber(vencimento);
CREATE INDEX IF NOT EXISTS idx_crm_auditoria ON crm_auditoria(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_crm_os_status ON crm_ordens_servico(status);
CREATE INDEX IF NOT EXISTS idx_crm_os_tipo ON crm_ordens_servico(tipo);

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================
-- Tabela: crm_transacoes (Financeiro — Despesas e Receitas)
-- Adicionada ao schema versionado em 2026-07-15 (v5.33)
-- A tabela já existia em produção mas não estava documentada aqui.
-- A coluna comprovante_url foi adicionada via webdev_execute_sql em v5.33.
-- =============================================================
CREATE TABLE IF NOT EXISTS crm_transacoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  descricao VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  valor DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NULL DEFAULT 'pendente',
  centro_custo VARCHAR(100) NULL,
  data DATE NULL,
  observacoes TEXT NULL,
  comprovante_url TEXT NULL,
  evento_id INT NULL,
  cliente_id INT NULL,
  created_by INT NULL,
  recorrencia VARCHAR(20) NULL,
  recorrencia_grupo_id VARCHAR(50) NULL,
  recorrencia_indice INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_crm_transacoes_tipo ON crm_transacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_crm_transacoes_data ON crm_transacoes(data);
CREATE INDEX IF NOT EXISTS idx_crm_transacoes_centro_custo ON crm_transacoes(centro_custo);
