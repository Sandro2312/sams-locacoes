CREATE TABLE `crm_projetos_stand_fechamento_itens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fechamento_id` int NOT NULL,
	`categoria` varchar(50) NOT NULL,
	`estado` varchar(30) NOT NULL DEFAULT 'pendente',
	`valor_estimado` decimal(14,2),
	`observacao` text,
	`atualizado_por` int NOT NULL,
	`atualizado_por_nome` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_projetos_stand_fechamento_itens_id` PRIMARY KEY(`id`),
	CONSTRAINT `crm_projetos_fechamento_itens_unique` UNIQUE(`fechamento_id`,`categoria`)
);
--> statement-breakpoint
CREATE TABLE `crm_projetos_stand_fechamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projeto_stand_id` int NOT NULL,
	`status` varchar(30) NOT NULL DEFAULT 'planejamento',
	`justificativa_divergencia` text,
	`observacoes_revisao` text,
	`revisado_por` int,
	`revisado_por_nome` varchar(255),
	`revisado_em` timestamp,
	`created_by` int NOT NULL,
	`updated_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_projetos_stand_fechamentos_id` PRIMARY KEY(`id`),
	CONSTRAINT `crm_projetos_stand_fechamentos_projeto_stand_id_unique` UNIQUE(`projeto_stand_id`)
);
--> statement-breakpoint
CREATE INDEX `crm_projetos_fechamento_itens_fechamento_idx` ON `crm_projetos_stand_fechamento_itens` (`fechamento_id`);--> statement-breakpoint
CREATE INDEX `crm_projetos_fechamentos_status_idx` ON `crm_projetos_stand_fechamentos` (`status`);