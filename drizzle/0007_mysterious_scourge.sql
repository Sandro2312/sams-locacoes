ALTER TABLE `crm_rateio_alocacoes` ADD CONSTRAINT `crm_rateio_alocacoes_regra_projeto_unique` UNIQUE(`regra_id`,`projeto_stand_id`);--> statement-breakpoint
ALTER TABLE `crm_rateio_regras` ADD CONSTRAINT `crm_rateio_regras_transacao_unique` UNIQUE(`transacao_id`);--> statement-breakpoint
CREATE INDEX `crm_rateio_alocacoes_projeto_idx` ON `crm_rateio_alocacoes` (`projeto_stand_id`);--> statement-breakpoint
CREATE INDEX `crm_rateio_regras_evento_idx` ON `crm_rateio_regras` (`evento_id`);