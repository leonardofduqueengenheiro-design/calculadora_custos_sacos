CREATE TABLE `historico_custo_mp` (
	`id` int AUTO_INCREMENT NOT NULL,
	`materia_prima_id` int NOT NULL,
	`nome_mp` varchar(100) NOT NULL,
	`custo_anterior` decimal(15,4) NOT NULL,
	`custo_novo` decimal(15,4) NOT NULL,
	`data_alteracao` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historico_custo_mp_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `produtos` ADD `preco_venda_padrao` decimal(15,4);