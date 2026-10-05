-- Migração: 0024_recuperar_schema_juridico.sql
-- Data: 2026-10-05
-- Descrição: recupera de forma aditiva as tabelas do módulo Jurídico ausentes
--              na base restaurada. Não altera ou remove dados existentes.

CREATE TABLE IF NOT EXISTS crm_processos_juridicos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(40) NOT NULL UNIQUE,
  numero_cnj VARCHAR(25) NULL UNIQUE,
  titulo VARCHAR(255) NOT NULL,
  ramo_processual VARCHAR(20) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pre_processual',
  sigiloso TINYINT NOT NULL DEFAULT 0,
  tribunal VARCHAR(120) NULL,
  uf VARCHAR(2) NULL,
  comarca VARCHAR(120) NULL,
  vara VARCHAR(180) NULL,
  grau VARCHAR(40) NULL,
  classe_processual VARCHAR(180) NULL,
  assunto VARCHAR(255) NULL,
  polo_empresa VARCHAR(30) NULL,
  valor_causa DECIMAL(14,2) NULL,
  cliente_id INT NULL,
  lead_id INT NULL,
  fornecedor_id INT NULL,
  evento_id INT NULL,
  contrato_id INT NULL,
  parte_externa_nome VARCHAR(255) NULL,
  responsavel_id INT NULL,
  responsavel_nome VARCHAR(255) NULL,
  data_distribuicao DATE NULL,
  proximo_prazo DATE NULL,
  ultima_fonte_consulta VARCHAR(60) NULL,
  ultima_consulta_em TIMESTAMP NULL,
  ia_autorizada TINYINT NOT NULL DEFAULT 0,
  ia_autorizada_em TIMESTAMP NULL,
  ia_autorizada_por INT NULL,
  observacoes TEXT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_crm_processos_ramo_status (ramo_processual, status),
  INDEX idx_crm_processos_responsavel_prazo (responsavel_id, proximo_prazo),
  INDEX idx_crm_processos_cliente (cliente_id),
  INDEX idx_crm_processos_lead (lead_id)
);

CREATE TABLE IF NOT EXISTS crm_processos_juridicos_prazos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  processo_id INT NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  tipo VARCHAR(60) NOT NULL DEFAULT 'prazo_processual',
  data_prazo DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pendente',
  responsavel_id INT NULL,
  responsavel_nome VARCHAR(255) NULL,
  local_audiencia VARCHAR(500) NULL,
  link_audiencia VARCHAR(2000) NULL,
  hora_audiencia VARCHAR(5) NULL,
  observacoes TEXT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_crm_processos_prazos_processo (processo_id),
  INDEX idx_crm_processos_prazos_data_status (data_prazo, status)
);

CREATE TABLE IF NOT EXISTS crm_processos_juridicos_consultas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  processo_id INT NOT NULL,
  fonte VARCHAR(60) NOT NULL,
  numero_consultado VARCHAR(25) NOT NULL,
  sucesso TINYINT NOT NULL DEFAULT 0,
  resumo TEXT NULL,
  consultado_por INT NOT NULL,
  consultado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_crm_processos_consultas_processo_data (processo_id, consultado_em)
);

CREATE TABLE IF NOT EXISTS crm_processos_juridicos_documentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  processo_id INT NOT NULL,
  acervo_id INT NOT NULL,
  classificacao VARCHAR(60) NOT NULL DEFAULT 'outro',
  categoria_dossie VARCHAR(60) NOT NULL DEFAULT 'dossie_geral',
  tags_dossie TEXT NULL,
  observacao TEXT NULL,
  anexado_por INT NOT NULL,
  anexado_por_nome VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_crm_processos_documentos_processo_acervo (processo_id, acervo_id),
  INDEX idx_crm_processos_documentos_processo (processo_id, created_at),
  INDEX idx_crm_processos_documentos_acervo (acervo_id)
);

CREATE TABLE IF NOT EXISTS crm_processos_juridicos_prazos_documentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prazo_id INT NOT NULL,
  documento_vinculo_id INT NOT NULL,
  anexado_por INT NOT NULL,
  anexado_por_nome VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_crm_prazos_documentos (prazo_id, documento_vinculo_id),
  INDEX idx_crm_prazos_documentos_prazo (prazo_id)
);

CREATE TABLE IF NOT EXISTS crm_processos_juridicos_pecas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  processo_id INT NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  tipo VARCHAR(60) NOT NULL DEFAULT 'peticao_intermediaria',
  status VARCHAR(40) NOT NULL DEFAULT 'rascunho',
  conteudo TEXT NULL,
  checklist TEXT NULL,
  versao_atual INT NOT NULL DEFAULT 1,
  aprovado_por INT NULL,
  aprovado_por_nome VARCHAR(255) NULL,
  aprovado_em TIMESTAMP NULL,
  protocolo_numero VARCHAR(120) NULL,
  protocolado_em TIMESTAMP NULL,
  recibo_acervo_id INT NULL,
  created_by INT NOT NULL,
  created_by_nome VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_crm_pecas_processo_status (processo_id, status),
  INDEX idx_crm_pecas_processo_atualizado (processo_id, updated_at)
);

CREATE TABLE IF NOT EXISTS crm_processos_juridicos_pecas_versoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  peca_id INT NOT NULL,
  versao INT NOT NULL,
  conteudo TEXT NOT NULL,
  resumo_alteracoes VARCHAR(500) NULL,
  created_by INT NOT NULL,
  created_by_nome VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_crm_pecas_versoes_peca_versao (peca_id, versao),
  INDEX idx_crm_pecas_versoes_peca (peca_id, created_at)
);

CREATE TABLE IF NOT EXISTS crm_processos_juridicos_ia_analises (
  id INT AUTO_INCREMENT PRIMARY KEY,
  processo_id INT NOT NULL,
  documento_vinculo_id INT NULL,
  tipo VARCHAR(40) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'gerado',
  resultado TEXT NOT NULL,
  fontes TEXT NULL,
  modelo VARCHAR(120) NULL,
  gerado_por INT NOT NULL,
  gerado_por_nome VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_crm_ia_analises_processo_tipo (processo_id, tipo, created_at),
  INDEX idx_crm_ia_analises_documento (documento_vinculo_id)
);
