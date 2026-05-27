CREATE TABLE `analise_itens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analise_id` int NOT NULL,
	`produto_id` int NOT NULL,
	`produto_nome` varchar(150) NOT NULL,
	`kg_produzido` decimal(15,2) NOT NULL DEFAULT '0',
	`preco_venda_kg` decimal(15,4) NOT NULL DEFAULT '0',
	`custo_mp_kg` decimal(15,4) NOT NULL DEFAULT '0',
	CONSTRAINT `analise_itens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analises_periodo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`descricao` varchar(255) NOT NULL,
	`periodo_inicio` varchar(20),
	`periodo_fim` varchar(20),
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analises_periodo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `produto_materias_primas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`produto_id` int NOT NULL,
	`ordem` int NOT NULL DEFAULT 1,
	`nome` varchar(100) NOT NULL,
	`custo_kg` decimal(15,4) NOT NULL DEFAULT '0',
	`percentual_uso` decimal(8,4) NOT NULL DEFAULT '0',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `produto_materias_primas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `produtos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ordem` int NOT NULL DEFAULT 1,
	`nome` varchar(150) NOT NULL,
	`descricao` text,
	`ativo` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `produtos_id` PRIMARY KEY(`id`)
);
