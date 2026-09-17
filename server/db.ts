import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, analiseItens, analisesPeriodo, custosFixos, historicoCustoMp, historicoImportacoes, materiasPrimas, parametros, produtoMateriasPrimas, produtos, simulacoes, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Custos Fixos ────────────────────────────────────────────────────────────

export async function getCustosFixos() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(custosFixos).where(eq(custosFixos.ativo, 1));
}

export async function upsertCustoFixo(id: number | undefined, data: {
  categoria: typeof custosFixos.$inferInsert['categoria'];
  descricao: string;
  valorMensal: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (id) {
    await db.update(custosFixos)
      .set({ descricao: data.descricao, valorMensal: data.valorMensal, categoria: data.categoria })
      .where(eq(custosFixos.id, id));
    return id;
  } else {
    const result = await db.insert(custosFixos).values({
      categoria: data.categoria,
      descricao: data.descricao,
      valorMensal: data.valorMensal,
    });
    return (result as any)[0]?.insertId ?? null;
  }
}

export async function deleteCustoFixo(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(custosFixos).set({ ativo: 0 }).where(eq(custosFixos.id, id));
}

// ─── Parâmetros ──────────────────────────────────────────────────────────────

export async function getParametros() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(parametros);
}

export async function getParametro(chave: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(parametros).where(eq(parametros.chave, chave)).limit(1);
  return result[0] ?? null;
}

export async function setParametro(chave: string, valor: string, descricao?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(parametros)
    .values({ chave, valor, descricao })
    .onDuplicateKeyUpdate({ set: { valor, ...(descricao ? { descricao } : {}) } });
}

// ─── Histórico de Importações ─────────────────────────────────────────────────

export interface DadosHistoricoImportacao {
  nomeArquivo: string;
  origem?: "importacao" | "base_anterior";
  periodoInicio?: string | null;
  periodoFim?: string | null;
  mesesDetectados: string[];
  numMeses: number;
  totalLinhas: number;
  linhasProcessadas: number;
  linhasIgnoradas: number;
  totalCustos: number;
  totalMateriaPrima: number;
  totalFaturamento: number;
  mediasPorCategoria: Record<string, number>;
  mediaMateriaPrima: number;
  mediaFaturamento: number;
}

const CATEGORIAS_IMPORTACAO = [
  "folha_pagamento", "impostos_folha", "energia", "combustivel",
  "transporte_frete", "manutencao", "servicos", "comissoes", "diversos",
] as const;

function agruparCustosAtivos(custos: Array<{ categoria: string; valorMensal: string }>) {
  return custos.reduce<Record<string, number>>((acumulado, custo) => {
    acumulado[custo.categoria] = (acumulado[custo.categoria] ?? 0) + parseFloat(custo.valorMensal);
    return acumulado;
  }, {});
}

function parseMediasHistorico(valor: string): Record<string, number> {
  try {
    const dados = JSON.parse(valor) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(dados).filter(([, media]) => typeof media === "number" && Number.isFinite(media)) as Array<[string, number]>
    );
  } catch {
    return {};
  }
}

export async function getHistoricoImportacoes(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  await assegurarHistoricoBaseAnterior();
  return db.select().from(historicoImportacoes).orderBy(desc(historicoImportacoes.createdAt)).limit(limit);
}

export async function getImportacaoAtiva() {
  const db = await getDb();
  if (!db) return null;
  const parametroAtivo = await db.select().from(parametros)
    .where(eq(parametros.chave, "importacao_ativa_id"))
    .limit(1);
  const idAtivo = Number.parseInt(parametroAtivo[0]?.valor ?? "", 10);
  if (!Number.isInteger(idAtivo) || idAtivo <= 0) return null;
  const importacao = await db.select().from(historicoImportacoes)
    .where(eq(historicoImportacoes.id, idAtivo))
    .limit(1);
  return importacao[0] ?? null;
}

export async function salvarHistoricoImportacao(dados: DadosHistoricoImportacao) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const resultado = await db.insert(historicoImportacoes).values({
    nomeArquivo: dados.nomeArquivo,
    origem: dados.origem ?? "importacao",
    periodoInicio: dados.periodoInicio ?? null,
    periodoFim: dados.periodoFim ?? null,
    mesesDetectados: JSON.stringify(dados.mesesDetectados),
    numMeses: dados.numMeses,
    totalLinhas: dados.totalLinhas,
    linhasProcessadas: dados.linhasProcessadas,
    linhasIgnoradas: dados.linhasIgnoradas,
    totalCustos: dados.totalCustos.toFixed(2),
    totalMateriaPrima: dados.totalMateriaPrima.toFixed(2),
    totalFaturamento: dados.totalFaturamento.toFixed(2),
    mediasPorCategoria: JSON.stringify(dados.mediasPorCategoria),
    mediaMateriaPrima: dados.mediaMateriaPrima.toFixed(2),
    mediaFaturamento: dados.mediaFaturamento.toFixed(2),
  });
  return Number((resultado as any)[0]?.insertId ?? 0);
}

export async function definirImportacaoAtiva(id: number) {
  await setParametro("importacao_ativa_id", String(id), "ID do histórico de dados ativo nos cálculos");
}

/** Restaura as médias arquivadas e marca a fotografia escolhida como base ativa. */
export async function restaurarHistoricoImportacao(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const registros = await db.select().from(historicoImportacoes)
    .where(eq(historicoImportacoes.id, id))
    .limit(1);
  const registro = registros[0];
  if (!registro) throw new Error("Base histórica não encontrada.");

  const medias = parseMediasHistorico(registro.mediasPorCategoria);
  const existentes = await db.select().from(custosFixos).where(eq(custosFixos.ativo, 1));
  const labels: Record<string, string> = {
    folha_pagamento: "Folha de Pagamento",
    impostos_folha: "Impostos sobre Folha",
    energia: "Energia Elétrica",
    combustivel: "Combustível",
    transporte_frete: "Transporte / Frete",
    manutencao: "Manutenção e Peças",
    servicos: "Serviços Terceirizados",
    comissoes: "Comissões",
    diversos: "Diversos",
  };

  for (const categoria of CATEGORIAS_IMPORTACAO) {
    const valor = Number.isFinite(medias[categoria]) ? medias[categoria] : 0;
    const daCategoria = existentes.filter(custo => custo.categoria === categoria);
    if (daCategoria.length > 0) {
      for (const custo of daCategoria) {
        await db.update(custosFixos)
          .set({ valorMensal: valor.toFixed(2), descricao: `${labels[categoria]} (restaurado do histórico)` })
          .where(eq(custosFixos.id, custo.id));
      }
    } else {
      await db.insert(custosFixos).values({
        categoria,
        descricao: `${labels[categoria]} (restaurado do histórico)`,
        valorMensal: valor.toFixed(2),
        ativo: 1,
      });
    }
  }

  await setParametro("total_mp_mensal", registro.mediaMateriaPrima, "Total mensal de MP restaurado do histórico");
  await setParametro("faturamento_mensal_importado", registro.mediaFaturamento, "Faturamento mensal restaurado do histórico");
  await definirImportacaoAtiva(registro.id);
  return registro;
}

/**
 * Antes da primeira atualização após esta funcionalidade, registra os valores
 * correntes para que nenhuma base previamente usada seja perdida.
 */
export async function assegurarHistoricoBaseAnterior() {
  const ativa = await getImportacaoAtiva();
  if (ativa) return ativa.id;

  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [custosAtivos, parametrosAtuais] = await Promise.all([
    db.select().from(custosFixos).where(eq(custosFixos.ativo, 1)),
    db.select().from(parametros),
  ]);
  const mediasPorCategoria = agruparCustosAtivos(custosAtivos);
  const paramMap = Object.fromEntries(parametrosAtuais.map(parametro => [parametro.chave, parseFloat(parametro.valor)]));
  const existeBase = Object.keys(mediasPorCategoria).length > 0 || paramMap.total_mp_mensal > 0 || paramMap.faturamento_mensal_importado > 0;
  if (!existeBase) return null;

  const id = await salvarHistoricoImportacao({
    nomeArquivo: "Base anterior à implantação do histórico (01/2025–04/2026)",
    origem: "base_anterior",
    periodoInicio: "01/2025",
    periodoFim: "04/2026",
    mesesDetectados: [],
    numMeses: 17,
    totalLinhas: 0,
    linhasProcessadas: 0,
    linhasIgnoradas: 0,
    totalCustos: Object.values(mediasPorCategoria).reduce((soma, valor) => soma + valor, 0),
    totalMateriaPrima: paramMap.total_mp_mensal ?? 0,
    totalFaturamento: paramMap.faturamento_mensal_importado ?? 0,
    mediasPorCategoria,
    mediaMateriaPrima: paramMap.total_mp_mensal ?? 0,
    mediaFaturamento: paramMap.faturamento_mensal_importado ?? 0,
  });
  if (id > 0) await definirImportacaoAtiva(id);
  return id || null;
}


// ─── Matérias-Primas ─────────────────────────────────────────────────────────

export async function getMateriasPrimas() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(materiasPrimas).where(eq(materiasPrimas.ativo, 1));
  return result.sort((a, b) => a.ordem - b.ordem);
}

export async function upsertMateriaPrima(id: number, data: { nome: string; custoKg: string; percentualUso: string; }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(materiasPrimas)
    .set({ nome: data.nome, custoKg: data.custoKg, percentualUso: data.percentualUso })
    .where(eq(materiasPrimas.id, id));
}

export async function getCustoMpPonderado(): Promise<number> {
  const mps = await getMateriasPrimas();
  if (mps.length === 0) return 0;
  const totalPct = mps.reduce((s, m) => s + parseFloat(m.percentualUso), 0);
  if (totalPct <= 0) return 0;
  const ponderado = mps.reduce((s, m) => s + parseFloat(m.custoKg) * parseFloat(m.percentualUso), 0);
  return ponderado / totalPct;
}

// ─── Simulações ──────────────────────────────────────────────────────────────

export async function getSimulacoes(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(simulacoes);
  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
}

export async function saveSimulacao(data: typeof simulacoes.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(simulacoes).values(data);
  return (result as any)[0]?.insertId ?? null;
}

export async function deleteSimulacao(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(simulacoes).where(eq(simulacoes.id, id));
}

// ─── Produtos ───────────────────────────────────────────────────────────────────────────────

export async function getProdutos() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(produtos).where(eq(produtos.ativo, 1));
  return result.sort((a, b) => a.ordem - b.ordem);
}

export async function upsertProduto(id: number, data: { nome: string; descricao?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(produtos)
    .set({ nome: data.nome, descricao: data.descricao ?? null })
    .where(eq(produtos.id, id));
}

export async function getProdutoMateriasPrimas(produtoId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(produtoMateriasPrimas).where(eq(produtoMateriasPrimas.produtoId, produtoId));
  return result.sort((a, b) => a.ordem - b.ordem);
}

export async function upsertProdutoMp(data: {
  produtoId: number;
  ordem: number;
  nome: string;
  custoKg: string;
  percentualUso: string;
  materiaPrimaId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Verifica se já existe registro para esse produto+ordem
  const existing = await db.select().from(produtoMateriasPrimas)
    .where(eq(produtoMateriasPrimas.produtoId, data.produtoId))
    .then(rows => rows.find(r => r.ordem === data.ordem));
  if (existing) {
    await db.update(produtoMateriasPrimas)
      .set({
        nome: data.nome,
        custoKg: data.custoKg,
        percentualUso: data.percentualUso,
        materiaPrimaId: data.materiaPrimaId ?? null,
      })
      .where(eq(produtoMateriasPrimas.id, existing.id));
  } else {
    await db.insert(produtoMateriasPrimas).values({
      produtoId: data.produtoId,
      ordem: data.ordem,
      nome: data.nome,
      custoKg: data.custoKg,
      percentualUso: data.percentualUso,
      materiaPrimaId: data.materiaPrimaId ?? null,
    });
  }
}

/**
 * Propaga o novo custo de uma MP global para todos os produtos que a referenciam.
 * Chamado automaticamente após salvar uma MP em Custos Variáveis.
 */
export async function propagarCustoMpParaProdutos(materiaPrimaId: number, novoCustoKg: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.update(produtoMateriasPrimas)
    .set({ custoKg: novoCustoKg })
    .where(eq(produtoMateriasPrimas.materiaPrimaId, materiaPrimaId));
  // Retorna o número de linhas afetadas
  return (result as any)[0]?.affectedRows ?? 0;
}

export async function getCustoPonderadoProduto(produtoId: number): Promise<number> {
  const mps = await getProdutoMateriasPrimas(produtoId);
  if (mps.length === 0) return 0;
  const totalPct = mps.reduce((s, m) => s + parseFloat(m.percentualUso), 0);
  if (totalPct <= 0) return 0;
  const ponderado = mps.reduce((s, m) => s + parseFloat(m.custoKg) * parseFloat(m.percentualUso), 0);
  return ponderado / totalPct;
}

// ─── Análises de Período ─────────────────────────────────────────────────────────────────

export async function getAnalises() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(analisesPeriodo);
  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getAnaliseItens(analiseId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(analiseItens).where(eq(analiseItens.analiseId, analiseId));
}

export async function saveAnalise(data: {
  descricao: string;
  periodoInicio?: string;
  periodoFim?: string;
  observacao?: string;
  itens: Array<{
    produtoId: number;
    produtoNome: string;
    kgProduzido: string;
    precoVendaKg: string;
    custoMpKg: string;
  }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(analisesPeriodo).values({
    descricao: data.descricao,
    periodoInicio: data.periodoInicio,
    periodoFim: data.periodoFim,
    observacao: data.observacao,
  });
  const analiseId = (result as any)[0]?.insertId;
  if (analiseId && data.itens.length > 0) {
    await db.insert(analiseItens).values(
      data.itens.map(item => ({ ...item, analiseId }))
    );
  }
  return analiseId;
}

export async function deleteAnalise(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(analiseItens).where(eq(analiseItens.analiseId, id));
  await db.delete(analisesPeriodo).where(eq(analisesPeriodo.id, id));
}

// ─── Preço de Venda Padrão por Produto ───────────────────────────────────────

export async function updatePrecoVendaPadrao(produtoId: number, preco: string | null) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(produtos)
    .set({ precoVendaPadrao: preco })
    .where(eq(produtos.id, produtoId));
}

// ─── Histórico de Custo de MP ─────────────────────────────────────────────────

export async function registrarHistoricoCustoMp(data: {
  materiaPrimaId: number;
  nomeMP: string;
  custoAnterior: string;
  custoNovo: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(historicoCustoMp).values(data);
}

export async function getHistoricoCustoMp(materiaPrimaId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(historicoCustoMp)
    .where(eq(historicoCustoMp.materiaPrimaId, materiaPrimaId));
  return result
    .sort((a, b) => new Date(b.dataAlteracao).getTime() - new Date(a.dataAlteracao).getTime())
    .slice(0, limit);
}

// ─── Verificação de Custos Desatualizados ─────────────────────────────────────

/**
 * Retorna as linhas de produto_materias_primas vinculadas cujo custo difere do catálogo global.
 * Tolerancia de 0.0001 para evitar falsos positivos de arredondamento.
 */
export async function getCustosDesatualizados() {
  const mps = await getMateriasPrimas();
  const db = await getDb();
  if (!db) return [];

  const desatualizados: Array<{
    produtoMpId: number;
    produtoId: number;
    ordem: number;
    nomeProdutoMp: string;
    materiaPrimaId: number;
    nomeGlobal: string;
    custoAtualProduto: number;
    custoGlobal: number;
  }> = [];

  for (const mp of mps) {
    const custoGlobal = parseFloat(mp.custoKg);
    const linhasVinculadas = await db.select().from(produtoMateriasPrimas)
      .where(eq(produtoMateriasPrimas.materiaPrimaId, mp.id));
    for (const linha of linhasVinculadas) {
      const custoAtual = parseFloat(linha.custoKg);
      if (Math.abs(custoAtual - custoGlobal) > 0.0001) {
        desatualizados.push({
          produtoMpId: linha.id,
          produtoId: linha.produtoId,
          ordem: linha.ordem,
          nomeProdutoMp: linha.nome,
          materiaPrimaId: mp.id,
          nomeGlobal: mp.nome,
          custoAtualProduto: custoAtual,
          custoGlobal,
        });
      }
    }
  }

  return desatualizados;
}
