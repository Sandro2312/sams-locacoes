CREATE TABLE `crm_processos_juridicos_documentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`processo_id` int NOT NULL,
	`acervo_id` int NOT NULL,
	`classificacao` varchar(60) NOT NULL DEFAULT 'outro',
	`observacao` text,
	`anexado_por` int NOT NULL,
	`anexado_por_nome` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_processos_juridicos_documentos_id` PRIMARY KEY(`id`),
	CONSTRAINT `crm_processos_documentos_processo_acervo_unique` UNIQUE(`processo_id`,`acervo_id`)
);
--> statement-breakpoint
CREATE INDEX `crm_processos_documentos_processo_idx` ON `crm_processos_juridicos_documentos` (`processo_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `crm_processos_documentos_acervo_idx` ON `crm_processos_juridicos_documentos` (`acervo_id`);