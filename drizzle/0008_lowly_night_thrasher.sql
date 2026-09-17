CREATE TABLE `metas_reducao_categoria` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoria` varchar(50) NOT NULL,
	`percentual_meta` decimal(8,4) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `metas_reducao_categoria_id` PRIMARY KEY(`id`),
	CONSTRAINT `metas_reducao_categoria_categoria_unique` UNIQUE(`categoria`)
);
