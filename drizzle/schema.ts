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

// Fotografias imutáveis dos dados confirmados em cada importação de planilha.
// Preservam o período e as médias efetivamente utilizadas nos cálculos.
export const historicoImportacoes = mysqlTable("historico_importacoes", {
  id: int("id").autoincrement().primaryKey(),
  nomeArquivo: varchar("nome_arquivo", { length: 255 }).notNull(),
  origem: varchar("origem", { length: 30 }).notNull().default("importacao"),
  periodoInicio: varchar("periodo_inicio", { length: 10 }),
  periodoFim: varchar("periodo_fim", { length: 10 }),
  mesesDetectados: text("meses_detectados").notNull(),
  numMeses: int("num_meses").notNull().default(0),
  totalLinhas: int("total_linhas").notNull().default(0),
  linhasProcessadas: int("linhas_processadas").notNull().default(0),
  linhasIgnoradas: int("linhas_ignoradas").notNull().default(0),
  totalCustos: decimal("total_custos", { precision: 15, scale: 2 }).notNull().default("0"),
  totalMateriaPrima: decimal("total_materia_prima", { precision: 15, scale: 2 }).notNull().default("0"),
  totalFaturamento: decimal("total_faturamento", { precision: 15, scale: 2 }).notNull().default("0"),
  mediasPorCategoria: text("medias_por_categoria").notNull(),
  mediaMateriaPrima: decimal("media_materia_prima", { precision: 15, scale: 2 }).notNull().default("0"),
  mediaFaturamento: decimal("media_faturamento", { precision: 15, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type HistoricoImportacao = typeof historicoImportacoes.$inferSelect;
export type InsertHistoricoImportacao = typeof historicoImportacoes.$inferInsert;

// Regras reutilizáveis para classificar tipos antes não reconhecidos na importação.
export const regrasClassificacaoImportacao = mysqlTable("regras_classificacao_importacao", {
  id: int("id").autoincrement().primaryKey(),
  tipoNormalizado: varchar("tipo_normalizado", { length: 255 }).notNull().unique(),
  tipoExibicao: varchar("tipo_exibicao", { length: 255 }).notNull(),
  destino: varchar("destino", { length: 50 }).notNull(),
  ativo: int("ativo").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type RegraClassificacaoImportacao = typeof regrasClassificacaoImportacao.$inferSelect;
export type InsertRegraClassificacaoImportacao = typeof regrasClassificacaoImportacao.$inferInsert;

// Metas opcionais de redução percentual por categoria de custo.
// Só existem para as categorias que o usuário decidir acompanhar.
export const metasReducaoCategoria = mysqlTable("metas_reducao_categoria", {
  id: int("id").autoincrement().primaryKey(),
  categoria: varchar("categoria", { length: 50 }).notNull().unique(),
  percentualMeta: decimal("percentual_meta", { precision: 8, scale: 4 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type MetaReducaoCategoria = typeof metasReducaoCategoria.$inferSelect;
export type InsertMetaReducaoCategoria = typeof metasReducaoCategoria.$inferInsert;

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

// Produtos (até 4 tipos de sacos plásticos)
export const produtos = mysqlTable("produtos", {
  id: int("id").autoincrement().primaryKey(),
  ordem: int("ordem").notNull().default(1),
  nome: varchar("nome", { length: 150 }).notNull(),
  descricao: text("descricao"),
  // Preço de venda padrão por produto — pré-preenche Análise por Mix e Otimizador
  precoVendaPadrao: decimal("preco_venda_padrao", { precision: 15, scale: 4 }),
  ativo: int("ativo").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Produto = typeof produtos.$inferSelect;
export type InsertProduto = typeof produtos.$inferInsert;

// Composição de MP por produto (cada produto pode ter até 5 MPs com percentuais)
export const produtoMateriasPrimas = mysqlTable("produto_materias_primas", {
  id: int("id").autoincrement().primaryKey(),
  produtoId: int("produto_id").notNull(),
  ordem: int("ordem").notNull().default(1),
  nome: varchar("nome", { length: 100 }).notNull(),
  custoKg: decimal("custo_kg", { precision: 15, scale: 4 }).notNull().default("0"),
  percentualUso: decimal("percentual_uso", { precision: 8, scale: 4 }).notNull().default("0"),
  // FK opcional para o catálogo global de MPs (Custos Variáveis)
  // Quando preenchido, o custo é sincronizado automaticamente ao salvar a MP global
  materiaPrimaId: int("materia_prima_id"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProdutoMateriaPrima = typeof produtoMateriasPrimas.$inferSelect;
export type InsertProdutoMateriaPrima = typeof produtoMateriasPrimas.$inferInsert;

// Análises de período (mix de produtos)
export const analisesPeriodo = mysqlTable("analises_periodo", {
  id: int("id").autoincrement().primaryKey(),
  descricao: varchar("descricao", { length: 255 }).notNull(),
  periodoInicio: varchar("periodo_inicio", { length: 20 }),
  periodoFim: varchar("periodo_fim", { length: 20 }),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnalisePeriodo = typeof analisesPeriodo.$inferSelect;
export type InsertAnalisePeriodo = typeof analisesPeriodo.$inferInsert;

// Histórico de variação de custo de matéria-prima
export const historicoCustoMp = mysqlTable("historico_custo_mp", {
  id: int("id").autoincrement().primaryKey(),
  materiaPrimaId: int("materia_prima_id").notNull(),
  nomeMP: varchar("nome_mp", { length: 100 }).notNull(),
  custoAnterior: decimal("custo_anterior", { precision: 15, scale: 4 }).notNull(),
  custoNovo: decimal("custo_novo", { precision: 15, scale: 4 }).notNull(),
  dataAlteracao: timestamp("data_alteracao").defaultNow().notNull(),
});

export type HistoricoCustoMp = typeof historicoCustoMp.$inferSelect;
export type InsertHistoricoCustoMp = typeof historicoCustoMp.$inferInsert;

// Itens de cada análise de período
export const analiseItens = mysqlTable("analise_itens", {
  id: int("id").autoincrement().primaryKey(),
  analiseId: int("analise_id").notNull(),
  produtoId: int("produto_id").notNull(),
  produtoNome: varchar("produto_nome", { length: 150 }).notNull(),
  kgProduzido: decimal("kg_produzido", { precision: 15, scale: 2 }).notNull().default("0"),
  precoVendaKg: decimal("preco_venda_kg", { precision: 15, scale: 4 }).notNull().default("0"),
  custoMpKg: decimal("custo_mp_kg", { precision: 15, scale: 4 }).notNull().default("0"),
});

export type AnaliseItem = typeof analiseItens.$inferSelect;
export type InsertAnaliseItem = typeof analiseItens.$inferInsert;
