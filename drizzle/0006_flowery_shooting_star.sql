CREATE TABLE `crm_rateio_alocacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`regra_id` int NOT NULL,
	`projeto_stand_id` int NOT NULL,
	`percentual` decimal(9,6) NOT NULL,
	`valor` decimal(14,2) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_rateio_alocacoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_rateio_regras` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transacao_id` int NOT NULL,
	`evento_id` int NOT NULL,
	`criterio` varchar(30) NOT NULL,
	`valor_origem` decimal(14,2) NOT NULL,
	`observacoes` text,
	`status` varchar(20) NOT NULL DEFAULT 'aprovado',
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_rateio_regras_id` PRIMARY KEY(`id`)
);
