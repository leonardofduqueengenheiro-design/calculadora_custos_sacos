import {
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Custos fixos mensais por categoria
export const custosFixos = mysqlTable("custos_fixos", {
  id: int("id").autoincrement().primaryKey(),
  categoria: mysqlEnum("categoria", [
    "folha_pagamento",
    "impostos_folha",
    "energia",
    "combustivel",
    "transporte_frete",
    "manutencao",
    "servicos",
    "comissoes",
    "diversos",
  ]).notNull(),
  descricao: varchar("descricao", { length: 255 }).notNull(),
  valorMensal: decimal("valor_mensal", { precision: 15, scale: 2 }).notNull().default("0"),
  ativo: int("ativo").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustoFixo = typeof custosFixos.$inferSelect;
export type InsertCustoFixo = typeof custosFixos.$inferInsert;

// Parâmetros gerais da operação
export const parametros = mysqlTable("parametros", {
  id: int("id").autoincrement().primaryKey(),
  chave: varchar("chave", { length: 100 }).notNull().unique(),
  valor: decimal("valor", { precision: 15, scale: 4 }).notNull(),
  descricao: varchar("descricao", { length: 255 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Parametro = typeof parametros.$inferSelect;
export type InsertParametro = typeof parametros.$inferInsert;

// Histórico de simulações
export const simulacoes = mysqlTable("simulacoes", {
  id: int("id").autoincrement().primaryKey(),
  tipo: mysqlEnum("tipo", ["margem", "preco"]).notNull(),
  precoVenda: decimal("preco_venda", { precision: 15, scale: 4 }),
  margemDesejada: decimal("margem_desejada", { precision: 8, scale: 4 }),
  custoTotalKg: decimal("custo_total_kg", { precision: 15, scale: 4 }).notNull(),
  margemUnitaria: decimal("margem_unitaria", { precision: 15, scale: 4 }),
  margemPercentual: decimal("margem_percentual", { precision: 8, scale: 4 }),
  margemMensal: decimal("margem_mensal", { precision: 15, scale: 2 }),
  precoMinimo: decimal("preco_minimo", { precision: 15, scale: 4 }),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Simulacao = typeof simulacoes.$inferSelect;
export type InsertSimulacao = typeof simulacoes.$inferInsert;

// Matérias-primas (múltiplas, até 5)
export const materiasPrimas = mysqlTable("materias_primas", {
  id: int("id").autoincrement().primaryKey(),
  ordem: int("ordem").notNull().default(1), // 1 a 5
  nome: varchar("nome", { length: 100 }).notNull(),
  custoKg: decimal("custo_kg", { precision: 15, scale: 4 }).notNull().default("0"),
  percentualUso: decimal("percentual_uso", { precision: 8, scale: 4 }).notNull().default("0"), // 0 a 100
  ativo: int("ativo").default(1).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MateriaPrima = typeof materiasPrimas.$inferSelect;
export type InsertMateriaPrima = typeof materiasPrimas.$inferInsert;
