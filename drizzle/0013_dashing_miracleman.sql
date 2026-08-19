CREATE TABLE `crm_processos_juridicos_prazos_documentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prazo_id` int NOT NULL,
	`documento_vinculo_id` int NOT NULL,
	`anexado_por` int NOT NULL,
	`anexado_por_nome` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_processos_juridicos_prazos_documentos_id` PRIMARY KEY(`id`),
	CONSTRAINT `crm_prazos_documentos_unique` UNIQUE(`prazo_id`,`documento_vinculo_id`)
);
--> statement-breakpoint
ALTER TABLE `crm_processos_juridicos_prazos` ADD `local_audiencia` varchar(500);--> statement-breakpoint
ALTER TABLE `crm_processos_juridicos_prazos` ADD `link_audiencia` varchar(2000);--> statement-breakpoint
CREATE INDEX `crm_prazos_documentos_prazo_idx` ON `crm_processos_juridicos_prazos_documentos` (`prazo_id`);