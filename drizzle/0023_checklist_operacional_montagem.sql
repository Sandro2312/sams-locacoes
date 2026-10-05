-- Migração: 0023_checklist_operacional_montagem.sql
-- Data: 2026-10-05
-- Descrição: checklist operacional auditável por Ordem de Serviço.
-- Segurança: estrutura aditiva; não cria nem altera lançamentos financeiros.

CREATE TABLE IF NOT EXISTS crm_os_checklist_itens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  os_id INT NOT NULL,
  codigo VARCHAR(80) NOT NULL,
  categoria VARCHAR(120) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  obrigatorio TINYINT(1) NOT NULL DEFAULT 1,
  concluido TINYINT(1) NOT NULL DEFAULT 0,
  observacao TEXT NULL,
  concluido_por INT NULL,
  concluido_por_nome VARCHAR(255) NULL,
  concluido_em DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_crm_os_checklist_os FOREIGN KEY (os_id) REFERENCES crm_ordens_servico(id) ON DELETE CASCADE,
  UNIQUE KEY uq_crm_os_checklist_item (os_id, codigo),
  KEY idx_crm_os_checklist_os (os_id, concluido)
);
