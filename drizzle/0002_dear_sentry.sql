CREATE TABLE `orcamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`empresa` varchar(255) NOT NULL,
	`cargo` varchar(100),
	`whatsapp` varchar(30) NOT NULL,
	`email` varchar(320) NOT NULL,
	`tipoEvento` varchar(100) NOT NULL,
	`nomeEvento` varchar(255),
	`dataEvento` varchar(50),
	`localEvento` varchar(255),
	`cidadeEvento` varchar(100) NOT NULL,
	`estadoEvento` varchar(2) NOT NULL,
	`tipoStand` varchar(100) NOT NULL,
	`metragem` varchar(50) NOT NULL,
	`altura` varchar(50),
	`formato` varchar(100),
	`servicosAdicionais` text,
	`descricaoMarca` text,
	`referenciasVisuais` text,
	`orcamentoPrevisto` varchar(100),
	`observacoes` text,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orcamentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `contatos` MODIFY COLUMN `mensagem` text;