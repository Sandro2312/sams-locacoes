CREATE TABLE `crm_ticket_anexos` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`ticket_id` bigint NOT NULL,
	`mensagem_id` bigint,
	`nome_original` varchar(180) NOT NULL,
	`arquivo_key` varchar(500) NOT NULL,
	`arquivo_url` text NOT NULL,
	`mime_type` varchar(120) NOT NULL,
	`tamanho_bytes` bigint NOT NULL DEFAULT 0,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_ticket_anexos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_ticket_mensagens` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`ticket_id` bigint NOT NULL,
	`autor_id` int NOT NULL,
	`autor_nome` varchar(255) NOT NULL,
	`tipo_autor` varchar(20) NOT NULL,
	`mensagem` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_ticket_mensagens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_tickets` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`codigo` varchar(30) NOT NULL,
	`titulo` varchar(180) NOT NULL,
	`descricao` text NOT NULL,
	`categoria` varchar(40) NOT NULL DEFAULT 'problema',
	`prioridade` varchar(20) NOT NULL DEFAULT 'normal',
	`status` varchar(30) NOT NULL DEFAULT 'aberto',
	`solicitante_id` int NOT NULL,
	`solicitante_nome` varchar(255) NOT NULL,
	`solicitante_email` varchar(255),
	`responsavel_id` int,
	`responsavel_nome` varchar(255),
	`prazo_at` timestamp,
	`first_response_at` timestamp,
	`resolved_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_tickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `crm_tickets_codigo_unique` UNIQUE(`codigo`)
);
