-- Migração: 0004_crm_projetos_stand.sql
-- Data: 2026-08-13
-- Descrição: Cria a unidade de apuração Projeto de Stand e adiciona vínculos
-- opcionais em despesas e contas a receber. Nenhum lançamento existente é alterado.

CREATE TABLE IF NOT EXISTS crm_projetos_stand (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(60) NOT NULL UNIQUE,
  evento_id INT NOT NULL,
  cliente_id INT NOT NULL,
  contrato_id INT NULL,
  nome VARCHAR(255) NOT NULL,
  referencia_stand VARCHAR(120) NULL,
  pavilhao VARCHAR(120) NULL,
  area_m2 VARCHAR(30) NULL,
  centro_custo VARCHAR(150) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'planejado',
  observacoes TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (evento_id) REFERENCES crm_eventos(id) ON DELETE RESTRICT,
  FOREIGN KEY (cliente_id) REFERENCES crm_clientes(id) ON DELETE RESTRICT,
  FOREIGN KEY (contrato_id) REFERENCES crm_contratos(id) ON DELETE SET NULL
);

ALTER TABLE crm_transacoes ADD COLUMN IF NOT EXISTS projeto_stand_id INT NULL;
ALTER TABLE crm_contas_receber ADD COLUMN IF NOT EXISTS evento_id INT NULL;
ALTER TABLE crm_contas_receber ADD COLUMN IF NOT EXISTS projeto_stand_id INT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_projetos_stand_evento ON crm_projetos_stand(evento_id);
CREATE INDEX IF NOT EXISTS idx_crm_projetos_stand_cliente ON crm_projetos_stand(cliente_id);
CREATE INDEX IF NOT EXISTS idx_crm_projetos_stand_status ON crm_projetos_stand(status);
CREATE INDEX IF NOT EXISTS idx_crm_transacoes_projeto_stand ON crm_transacoes(projeto_stand_id);
CREATE INDEX IF NOT EXISTS idx_crm_contas_receber_evento ON crm_contas_receber(evento_id);
CREATE INDEX IF NOT EXISTS idx_crm_contas_receber_projeto_stand ON crm_contas_receber(projeto_stand_id);
