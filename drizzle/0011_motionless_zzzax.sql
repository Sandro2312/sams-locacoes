CREATE TABLE `crm_orcamentos_tecnicos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projeto_stand_id` int NOT NULL,
	`numero_versao` int NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`status` varchar(40) NOT NULL DEFAULT 'rascunho',
	`subtotal_custo` decimal(14,2) NOT NULL DEFAULT '0',
	`subtotal_venda` decimal(14,2) NOT NULL DEFAULT '0',
	`desconto` decimal(14,2) NOT NULL DEFAULT '0',
	`valor_venda_final` decimal(14,2) NOT NULL DEFAULT '0',
	`margem` decimal(14,2) NOT NULL DEFAULT '0',
	`margem_percentual` decimal(9,4),
	`observacoes` text,
	`criado_por` int NOT NULL,
	`criado_por_nome` varchar(255),
	`aprovado_por` int,
	`aprovado_por_nome` varchar(255),
	`aprovado_em` timestamp,
	`enviado_em` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_orcamentos_tecnicos_id` PRIMARY KEY(`id`),
	CONSTRAINT `crm_orcamentos_tecnicos_projeto_versao_unique` UNIQUE(`projeto_stand_id`,`numero_versao`)
);
--> statement-breakpoint
CREATE TABLE `crm_orcamentos_tecnicos_itens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orcamento_tecnico_id` int NOT NULL,
	`categoria` varchar(80) NOT NULL DEFAULT 'outros',
	`descricao` varchar(500) NOT NULL,
	`quantidade` decimal(14,3) NOT NULL DEFAULT '1',
	`custo_unitario` decimal(14,2) NOT NULL DEFAULT '0',
	`preco_unitario` decimal(14,2) NOT NULL DEFAULT '0',
	`custo_total` decimal(14,2) NOT NULL DEFAULT '0',
	`valor_total` decimal(14,2) NOT NULL DEFAULT '0',
	`ordem` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_orcamentos_tecnicos_itens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `crm_orcamentos_tecnicos_projeto_idx` ON `crm_orcamentos_tecnicos` (`projeto_stand_id`);--> statement-breakpoint
CREATE INDEX `crm_orcamentos_tecnicos_status_idx` ON `crm_orcamentos_tecnicos` (`status`);--> statement-breakpoint
CREATE INDEX `crm_orcamentos_tecnicos_itens_orcamento_idx` ON `crm_orcamentos_tecnicos_itens` (`orcamento_tecnico_id`);