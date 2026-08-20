CREATE TABLE `crm_lotes_financeiros_stand` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(60) NOT NULL,
	`cliente_id` int NOT NULL,
	`evento_id` int NOT NULL,
	`identificacao_stand` varchar(180) NOT NULL,
	`centro_custo` varchar(220) NOT NULL,
	`status` varchar(30) NOT NULL DEFAULT 'rascunho',
	`observacoes` text,
	`confirmado_por` int,
	`confirmado_por_nome` varchar(255),
	`confirmado_em` timestamp,
	`created_by` int NOT NULL,
	`updated_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_lotes_financeiros_stand_id` PRIMARY KEY(`id`),
	CONSTRAINT `crm_lotes_financeiros_stand_codigo_unique` UNIQUE(`codigo`)
);
--> statement-breakpoint
CREATE TABLE `crm_lotes_financeiros_stand_itens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lote_id` int NOT NULL,
	`natureza` varchar(20) NOT NULL,
	`categoria` varchar(60) NOT NULL DEFAULT 'outros',
	`descricao` varchar(500) NOT NULL,
	`valor_total` decimal(14,2) NOT NULL,
	`parcelas` int NOT NULL DEFAULT 1,
	`primeiro_vencimento` date NOT NULL,
	`forma_pagamento` varchar(120),
	`observacoes` text,
	`status` varchar(30) NOT NULL DEFAULT 'rascunho',
	`lancamentos_criados` text,
	`created_by` int NOT NULL,
	`updated_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_lotes_financeiros_stand_itens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `crm_lotes_fin_stand_cliente_evento_idx` ON `crm_lotes_financeiros_stand` (`cliente_id`,`evento_id`);--> statement-breakpoint
CREATE INDEX `crm_lotes_fin_stand_status_idx` ON `crm_lotes_financeiros_stand` (`status`);--> statement-breakpoint
CREATE INDEX `crm_lotes_fin_stand_itens_lote_idx` ON `crm_lotes_financeiros_stand_itens` (`lote_id`);--> statement-breakpoint
CREATE INDEX `crm_lotes_fin_stand_itens_status_idx` ON `crm_lotes_financeiros_stand_itens` (`status`);