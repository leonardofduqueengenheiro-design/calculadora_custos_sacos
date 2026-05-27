CREATE TABLE `materias_primas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ordem` int NOT NULL DEFAULT 1,
	`nome` varchar(100) NOT NULL,
	`custo_kg` decimal(15,4) NOT NULL DEFAULT '0',
	`percentual_uso` decimal(8,4) NOT NULL DEFAULT '0',
	`ativo` int NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `materias_primas_id` PRIMARY KEY(`id`)
);
