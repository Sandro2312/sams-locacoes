CREATE TABLE `crm_eventos_resultados` (
	`id` int AUTO_INCREMENT NOT NULL,
	`evento_id` int NOT NULL,
	`status` varchar(30) NOT NULL DEFAULT 'planejamento',
	`objetivo_comercial` varchar(255),
	`meta_reunioes` int NOT NULL DEFAULT 0,
	`meta_leads` int NOT NULL DEFAULT 0,
	`meta_propostas` int NOT NULL DEFAULT 0,
	`meta_receita` decimal(14,2) NOT NULL DEFAULT '0',
	`resumo_pos_evento` text,
	`aprendizados` text,
	`acoes_follow_up` text,
	`encerrado_em` timestamp,
	`encerrado_por` int,
	`created_by` int NOT NULL,
	`updated_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_eventos_resultados_id` PRIMARY KEY(`id`),
	CONSTRAINT `crm_eventos_resultados_evento_id_unique` UNIQUE(`evento_id`)
);
--> statement-breakpoint
CREATE INDEX `crm_eventos_resultados_status_idx` ON `crm_eventos_resultados` (`status`);