-- Migração: 0025_compras_gerais_financeiro.sql
-- Data: 2026-10-05
-- Descrição: registra compras gerais e vincula entrada/parcelas às Contas a Pagar existentes.
-- A migração é apenas aditiva; não altera lançamentos financeiros já existentes.

ALTER TABLE crm_transacoes
  ADD COLUMN IF NOT EXISTS fornecedor VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS categoria VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(120) NULL,
  ADD COLUMN IF NOT EXISTS data_pagamento DATE NULL,
  ADD COLUMN IF NOT EXISTS compra_id INT NULL,
  ADD COLUMN IF NOT EXISTS parcela_numero INT NULL;

CREATE TABLE IF NOT EXISTS crm_compras (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(60) NOT NULL UNIQUE,
  descricao VARCHAR(255) NOT NULL,
  fornecedor VARCHAR(255) NULL,
  categoria VARCHAR(80) NOT NULL DEFAULT 'outros',
  valor_total DECIMAL(14,2) NOT NULL,
  valor_entrada DECIMAL(14,2) NOT NULL DEFAULT 0,
  valor_financiado DECIMAL(14,2) NOT NULL DEFAULT 0,
  parcelas INT NOT NULL DEFAULT 0,
  data_entrada DATE NULL,
  primeiro_vencimento DATE NULL,
  forma_pagamento_entrada VARCHAR(120) NULL,
  forma_pagamento_parcelas VARCHAR(120) NULL,
  centro_custo VARCHAR(150) NULL,
  evento_id INT NULL,
  cliente_id INT NULL,
  projeto_stand_id INT NULL,
  observacoes TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ativo',
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_transacoes_compra ON crm_transacoes(compra_id);
CREATE INDEX IF NOT EXISTS idx_crm_compras_evento ON crm_compras(evento_id);
CREATE INDEX IF NOT EXISTS idx_crm_compras_projeto ON crm_compras(projeto_stand_id);
CREATE INDEX IF NOT EXISTS idx_crm_compras_status ON crm_compras(status);
