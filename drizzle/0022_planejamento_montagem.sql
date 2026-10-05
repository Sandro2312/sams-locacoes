-- Migração: 0022_planejamento_montagem.sql
-- Data: 2026-10-05
-- Descrição: amplia Ordens de Serviço para planejamento e apontamento operacional.
-- Não cria, altera ou confirma lançamentos financeiros.

ALTER TABLE crm_ordens_servico
  ADD COLUMN IF NOT EXISTS projeto_stand_id INT NULL,
  ADD COLUMN IF NOT EXISTS complexidade VARCHAR(20) NOT NULL DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS data_inicio_real DATETIME NULL,
  ADD COLUMN IF NOT EXISTS data_fim_real DATETIME NULL;

ALTER TABLE crm_os_equipe
  ADD COLUMN IF NOT EXISTS horas_planejadas DECIMAL(8,2) NULL,
  ADD COLUMN IF NOT EXISTS horas_reais DECIMAL(8,2) NULL;

ALTER TABLE crm_os_materiais
  ADD COLUMN IF NOT EXISTS quantidade_real DECIMAL(10,3) NULL,
  ADD COLUMN IF NOT EXISTS observacoes TEXT NULL;

CREATE TABLE IF NOT EXISTS crm_os_ocorrencias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  os_id INT NOT NULL,
  tipo VARCHAR(40) NOT NULL,
  severidade VARCHAR(20) NOT NULL DEFAULT 'media',
  descricao TEXT NOT NULL,
  custo_estimado DECIMAL(14,2) NULL,
  resolvida TINYINT(1) NOT NULL DEFAULT 0,
  created_by INT NULL,
  created_by_nome VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  FOREIGN KEY (os_id) REFERENCES crm_ordens_servico(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_crm_os_projeto_stand ON crm_ordens_servico(projeto_stand_id);
CREATE INDEX IF NOT EXISTS idx_crm_os_periodo ON crm_ordens_servico(data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_crm_os_equipe_user ON crm_os_equipe(user_id, os_id);
CREATE INDEX IF NOT EXISTS idx_crm_os_ocorrencias_os ON crm_os_ocorrencias(os_id, resolvida);
