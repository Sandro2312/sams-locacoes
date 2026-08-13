CREATE TABLE `crm_processos_juridicos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(40) NOT NULL,
	`numero_cnj` varchar(25),
	`titulo` varchar(255) NOT NULL,
	`ramo_processual` varchar(20) NOT NULL,
	`status` varchar(30) NOT NULL DEFAULT 'pre_processual',
	`sigiloso` int NOT NULL DEFAULT 0,
	`tribunal` varchar(120),
	`uf` varchar(2),
	`comarca` varchar(120),
	`vara` varchar(180),
	`grau` varchar(40),
	`classe_processual` varchar(180),
	`assunto` varchar(255),
	`polo_empresa` varchar(30),
	`valor_causa` decimal(14,2),
	`cliente_id` int,
	`lead_id` int,
	`fornecedor_id` int,
	`evento_id` int,
	`contrato_id` int,
	`parte_externa_nome` varchar(255),
	`responsavel_id` int,
	`responsavel_nome` varchar(255),
	`data_distribuicao` date,
	`proximo_prazo` date,
	`ultima_fonte_consulta` varchar(60),
	`ultima_consulta_em` timestamp,
	`observacoes` text,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_processos_juridicos_id` PRIMARY KEY(`id`),
	CONSTRAINT `crm_processos_juridicos_codigo_unique` UNIQUE(`codigo`),
	CONSTRAINT `crm_processos_juridicos_numero_cnj_unique` UNIQUE(`numero_cnj`)
);
--> statement-breakpoint
CREATE TABLE `crm_processos_juridicos_consultas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`processo_id` int NOT NULL,
	`fonte` varchar(60) NOT NULL,
	`numero_consultado` varchar(25) NOT NULL,
	`sucesso` int NOT NULL DEFAULT 0,
	`resumo` text,
	`consultado_por` int NOT NULL,
	`consultado_em` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_processos_juridicos_consultas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_processos_juridicos_prazos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`processo_id` int NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`tipo` varchar(60) NOT NULL DEFAULT 'prazo_processual',
	`data_prazo` date NOT NULL,
	`status` varchar(30) NOT NULL DEFAULT 'pendente',
	`responsavel_id` int,
	`responsavel_nome` varchar(255),
	`observacoes` text,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_processos_juridicos_prazos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `crm_processos_ramo_status_idx` ON `crm_processos_juridicos` (`ramo_processual`,`status`);--> statement-breakpoint
CREATE INDEX `crm_processos_responsavel_prazo_idx` ON `crm_processos_juridicos` (`responsavel_id`,`proximo_prazo`);--> statement-breakpoint
CREATE INDEX `crm_processos_cliente_idx` ON `crm_processos_juridicos` (`cliente_id`);--> statement-breakpoint
CREATE INDEX `crm_processos_lead_idx` ON `crm_processos_juridicos` (`lead_id`);--> statement-breakpoint
CREATE INDEX `crm_processos_consultas_processo_data_idx` ON `crm_processos_juridicos_consultas` (`processo_id`,`consultado_em`);--> statement-breakpoint
CREATE INDEX `crm_processos_prazos_processo_idx` ON `crm_processos_juridicos_prazos` (`processo_id`);--> statement-breakpoint
CREATE INDEX `crm_processos_prazos_data_status_idx` ON `crm_processos_juridicos_prazos` (`data_prazo`,`status`);