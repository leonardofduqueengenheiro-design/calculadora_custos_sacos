CREATE TABLE `regras_classificacao_importacao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tipo_normalizado` varchar(255) NOT NULL,
	`tipo_exibicao` varchar(255) NOT NULL,
	`destino` varchar(50) NOT NULL,
	`ativo` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `regras_classificacao_importacao_id` PRIMARY KEY(`id`),
	CONSTRAINT `regras_classificacao_importacao_tipo_normalizado_unique` UNIQUE(`tipo_normalizado`)
);
