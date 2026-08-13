CREATE TABLE `crm_projetos_stand` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(60) NOT NULL,
	`evento_id` int NOT NULL,
	`cliente_id` int NOT NULL,
	`contrato_id` int,
	`nome` varchar(255) NOT NULL,
	`referencia_stand` varchar(120),
	`pavilhao` varchar(120),
	`area_m2` varchar(30),
	`centro_custo` varchar(150),
	`status` varchar(30) NOT NULL DEFAULT 'planejado',
	`observacoes` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_projetos_stand_id` PRIMARY KEY(`id`),
	CONSTRAINT `crm_projetos_stand_codigo_unique` UNIQUE(`codigo`)
);
