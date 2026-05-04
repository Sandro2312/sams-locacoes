CREATE TABLE `contatos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`empresa` varchar(255) DEFAULT '',
	`whatsapp` varchar(30) NOT NULL,
	`email` varchar(320) NOT NULL,
	`tipoEvento` varchar(100) DEFAULT '',
	`metragem` varchar(50) DEFAULT '',
	`mensagem` text DEFAULT (''),
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contatos_id` PRIMARY KEY(`id`)
);
