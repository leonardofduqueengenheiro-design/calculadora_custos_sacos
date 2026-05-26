CREATE TABLE `custos_fixos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoria` enum('folha_pagamento','impostos_folha','energia','combustivel','transporte_frete','manutencao','servicos','comissoes','diversos') NOT NULL,
	`descricao` varchar(255) NOT NULL,
	`valor_mensal` decimal(15,2) NOT NULL DEFAULT '0',
	`ativo` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custos_fixos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parametros` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chave` varchar(100) NOT NULL,
	`valor` decimal(15,4) NOT NULL,
	`descricao` varchar(255),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `parametros_id` PRIMARY KEY(`id`),
	CONSTRAINT `parametros_chave_unique` UNIQUE(`chave`)
);
--> statement-breakpoint
CREATE TABLE `simulacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tipo` enum('margem','preco') NOT NULL,
	`preco_venda` decimal(15,4),
	`margem_desejada` decimal(8,4),
	`custo_total_kg` decimal(15,4) NOT NULL,
	`margem_unitaria` decimal(15,4),
	`margem_percentual` decimal(8,4),
	`margem_mensal` decimal(15,2),
	`preco_minimo` decimal(15,4),
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `simulacoes_id` PRIMARY KEY(`id`)
);
