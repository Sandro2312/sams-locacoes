CREATE TABLE `crm_processos_juridicos_ia_analises` (
	`id` int AUTO_INCREMENT NOT NULL,
	`processo_id` int NOT NULL,
	`documento_vinculo_id` int,
	`tipo` varchar(40) NOT NULL,
	`status` varchar(30) NOT NULL DEFAULT 'gerado',
	`resultado` text NOT NULL,
	`fontes` text,
	`modelo` varchar(120),
	`gerado_por` int NOT NULL,
	`gerado_por_nome` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_processos_juridicos_ia_analises_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_processos_juridicos_pecas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`processo_id` int NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`tipo` varchar(60) NOT NULL DEFAULT 'peticao_intermediaria',
	`status` varchar(40) NOT NULL DEFAULT 'rascunho',
	`conteudo` text,
	`checklist` text,
	`versao_atual` int NOT NULL DEFAULT 1,
	`aprovado_por` int,
	`aprovado_por_nome` varchar(255),
	`aprovado_em` timestamp,
	`protocolo_numero` varchar(120),
	`protocolado_em` timestamp,
	`recibo_acervo_id` int,
	`created_by` int NOT NULL,
	`created_by_nome` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_processos_juridicos_pecas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_processos_juridicos_pecas_versoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`peca_id` int NOT NULL,
	`versao` int NOT NULL,
	`conteudo` text NOT NULL,
	`resumo_alteracoes` varchar(500),
	`created_by` int NOT NULL,
	`created_by_nome` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_processos_juridicos_pecas_versoes_id` PRIMARY KEY(`id`),
	CONSTRAINT `crm_pecas_versoes_peca_versao_unique` UNIQUE(`peca_id`,`versao`)
);
--> statement-breakpoint
ALTER TABLE `crm_processos_juridicos` ADD `ia_autorizada` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_processos_juridicos` ADD `ia_autorizada_em` timestamp;--> statement-breakpoint
ALTER TABLE `crm_processos_juridicos` ADD `ia_autorizada_por` int;--> statement-breakpoint
ALTER TABLE `crm_processos_juridicos_documentos` ADD `categoria_dossie` varchar(60) DEFAULT 'dossie_geral' NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_processos_juridicos_documentos` ADD `tags_dossie` text;--> statement-breakpoint
CREATE INDEX `crm_ia_analises_processo_tipo_idx` ON `crm_processos_juridicos_ia_analises` (`processo_id`,`tipo`,`created_at`);--> statement-breakpoint
CREATE INDEX `crm_ia_analises_documento_idx` ON `crm_processos_juridicos_ia_analises` (`documento_vinculo_id`);--> statement-breakpoint
CREATE INDEX `crm_pecas_processo_status_idx` ON `crm_processos_juridicos_pecas` (`processo_id`,`status`);--> statement-breakpoint
CREATE INDEX `crm_pecas_processo_atualizado_idx` ON `crm_processos_juridicos_pecas` (`processo_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `crm_pecas_versoes_peca_idx` ON `crm_processos_juridicos_pecas_versoes` (`peca_id`,`created_at`);