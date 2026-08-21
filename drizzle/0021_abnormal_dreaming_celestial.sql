ALTER TABLE `crm_eventos` ADD COLUMN `site` varchar(500) NULL AFTER `endereco`;
ALTER TABLE `crm_eventos` ADD COLUMN `descricao` text NULL AFTER `site`;
