ALTER TABLE `crm_projetos_stand` MODIFY COLUMN `cliente_id` int;--> statement-breakpoint
ALTER TABLE `crm_projetos_stand` ADD `lead_id` int;--> statement-breakpoint
ALTER TABLE `crm_projetos_stand` ADD `oportunidade_id` int;--> statement-breakpoint
ALTER TABLE `crm_projetos_stand` ADD `situacao_comercial` varchar(30) DEFAULT 'prospecto' NOT NULL;