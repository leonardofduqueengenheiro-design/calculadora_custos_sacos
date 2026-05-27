import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getCustosFixos,
  upsertCustoFixo,
  deleteCustoFixo,
  getParametros,
  setParametro,
  getSimulacoes,
  saveSimulacao,
  deleteSimulacao,
  getMateriasPrimas,
  upsertMateriaPrima,
  getCustoMpPonderado,
} from "./db";

// ─── Lógica de cálculo financeiro ────────────────────────────────────────────

function calcularCustoFixoKg(totalFixos: number, producaoMensal: number): number {
  if (producaoMensal <= 0) return 0;
  return totalFixos / producaoMensal;
}

function calcularCustoTotalKg(custoFixoKg: number, custoMpKg: number): number {
  return custoFixoKg + custoMpKg;
}

/**
 * Preço de venda = Custo / (1 - Margem% - SIMPLES%)
 * SIMPLES é calculado sobre o preço de venda (variável)
 */
function calcularPrecoMinimo(custoTotalKg: number, margemDesejada: number, aliquotaSimples: number): number {
  const denominador = 1 - margemDesejada / 100 - aliquotaSimples / 100;
  if (denominador <= 0) return 0;
  return custoTotalKg / denominador;
}

/**
 * Margem = Preço - SIMPLES - Custo
 * SIMPLES = Preço × alíquota
 */
function calcularMargem(precoVenda: number, custoTotalKg: number, aliquotaSimples: number) {
  const simplesKg = precoVenda * (aliquotaSimples / 100);
  const margemUnitaria = precoVenda - simplesKg - custoTotalKg;
  const margemPercentual = precoVenda > 0 ? (margemUnitaria / precoVenda) * 100 : 0;
  return { simplesKg, margemUnitaria, margemPercentual };
}

// ─── Routers ─────────────────────────────────────────────────────────────────

const categoriaEnum = z.enum([
  "folha_pagamento",
  "impostos_folha",
  "energia",
  "combustivel",
  "transporte_frete",
  "manutencao",
  "servicos",
  "comissoes",
  "diversos",
]);

const custosRouter = router({
  list: publicProcedure.query(async () => {
    return getCustosFixos();
  }),

  upsert: publicProcedure
    .input(z.object({
      id: z.number().optional(),
      categoria: categoriaEnum,
      descricao: z.string().min(1),
      valorMensal: z.number().min(0),
    }))
    .mutation(async ({ input }) => {
      return upsertCustoFixo(input.id, {
        categoria: input.categoria,
        descricao: input.descricao,
        valorMensal: input.valorMensal.toFixed(2),
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteCustoFixo(input.id);
      return { success: true };
    }),
});

const parametrosRouter = router({
  list: publicProcedure.query(async () => {
    return getParametros();
  }),

  set: publicProcedure
    .input(z.object({
      chave: z.string(),
      valor: z.number(),
    }))
    .mutation(async ({ input }) => {
      await setParametro(input.chave, input.valor.toFixed(4));
      return { success: true };
    }),
});

const calculoRouter = router({
  resumo: publicProcedure.query(async () => {
    const [custos, params] = await Promise.all([getCustosFixos(), getParametros()]);

    const paramMap: Record<string, number> = {};
    for (const p of params) paramMap[p.chave] = parseFloat(p.valor);

    const totalFixos = custos.reduce((sum, c) => sum + parseFloat(c.valorMensal), 0);
    const producaoMensal = paramMap['producao_mensal_kg'] ?? 31498;
    const custoMpKgPonderado = await getCustoMpPonderado();
    const custoMpKg = custoMpKgPonderado > 0 ? custoMpKgPonderado : (paramMap['custo_mp_kg'] ?? 7.37);
    const aliquotaSimples = paramMap['aliquota_simples'] ?? 11;
    const precoVenda = paramMap['preco_venda_atual'] ?? 24;
    const estoque = paramMap['estoque_atual_kg'] ?? 100000;
    const producaoDiaria = paramMap['producao_diaria_kg'] ?? 1500;
    const mps = await getMateriasPrimas();

    const custoFixoKg = calcularCustoFixoKg(totalFixos, producaoMensal);
    const custoTotalKg = calcularCustoTotalKg(custoFixoKg, custoMpKg);
    const { margemUnitaria, margemPercentual, simplesKg } = calcularMargem(precoVenda, custoTotalKg, aliquotaSimples);
    const margemMensal = margemUnitaria * producaoMensal;
    const faturamentoMensal = precoVenda * producaoMensal;
    const lucroPotencialEstoque = margemUnitaria * estoque;
    const mesesEstoque = producaoMensal > 0 ? estoque / producaoMensal : 0;
    const totalPercentual = mps.reduce((s, m) => s + parseFloat(m.percentualUso), 0);

    return {
      totalFixosMensal: totalFixos,
      custoFixoKg,
      custoMpKg,
      custoTotalKg,
      aliquotaSimples,
      precoVenda,
      simplesKg,
      margemUnitaria,
      margemPercentual,
      margemMensal,
      faturamentoMensal,
      producaoMensal,
      producaoDiaria,
      estoque,
      lucroPotencialEstoque,
      mesesEstoque,
      materiasPrimas: mps.map(m => ({
        id: m.id,
        ordem: m.ordem,
        nome: m.nome,
        custoKg: parseFloat(m.custoKg),
        percentualUso: parseFloat(m.percentualUso),
      })),
      totalPercentual,
    };
  }),

  simularMargem: publicProcedure
    .input(z.object({
      precoVenda: z.number().min(0),
      salvar: z.boolean().optional(),
      observacao: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const [custos, params] = await Promise.all([getCustosFixos(), getParametros()]);
      const paramMap: Record<string, number> = {};
      for (const p of params) paramMap[p.chave] = parseFloat(p.valor);

      const totalFixos = custos.reduce((sum, c) => sum + parseFloat(c.valorMensal), 0);
      const producaoMensal = paramMap['producao_mensal_kg'] ?? 31498;
      const custoMpKgPonderado = await getCustoMpPonderado();
      const custoMpKg = custoMpKgPonderado > 0 ? custoMpKgPonderado : (paramMap['custo_mp_kg'] ?? 7.37);
      const aliquotaSimples = paramMap['aliquota_simples'] ?? 11;
      const estoque = paramMap['estoque_atual_kg'] ?? 100000;

      const custoFixoKg = calcularCustoFixoKg(totalFixos, producaoMensal);
      const custoTotalKg = calcularCustoTotalKg(custoFixoKg, custoMpKg);
      const { margemUnitaria, margemPercentual, simplesKg } = calcularMargem(input.precoVenda, custoTotalKg, aliquotaSimples);
      const margemMensal = margemUnitaria * producaoMensal;
      const lucroPotencialEstoque = margemUnitaria * estoque;

      if (input.salvar) {
        await saveSimulacao({
          tipo: 'margem',
          precoVenda: input.precoVenda.toFixed(4),
          custoTotalKg: custoTotalKg.toFixed(4),
          margemUnitaria: margemUnitaria.toFixed(4),
          margemPercentual: margemPercentual.toFixed(4),
          margemMensal: margemMensal.toFixed(2),
          observacao: input.observacao,
        });
      }

      return {
        precoVenda: input.precoVenda,
        custoTotalKg,
        custoFixoKg,
        custoMpKg,
        simplesKg,
        margemUnitaria,
        margemPercentual,
        margemMensal,
        lucroPotencialEstoque,
        aliquotaSimples,
      };
    }),

  simularPreco: publicProcedure
    .input(z.object({
      margemDesejada: z.number().min(0).max(99),
      salvar: z.boolean().optional(),
      observacao: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const [custos, params] = await Promise.all([getCustosFixos(), getParametros()]);
      const paramMap: Record<string, number> = {};
      for (const p of params) paramMap[p.chave] = parseFloat(p.valor);

      const totalFixos = custos.reduce((sum, c) => sum + parseFloat(c.valorMensal), 0);
      const producaoMensal = paramMap['producao_mensal_kg'] ?? 31498;
      const custoMpKgPonderado2 = await getCustoMpPonderado();
      const custoMpKg = custoMpKgPonderado2 > 0 ? custoMpKgPonderado2 : (paramMap['custo_mp_kg'] ?? 7.37);
      const aliquotaSimples = paramMap['aliquota_simples'] ?? 11;
      const estoque = paramMap['estoque_atual_kg'] ?? 100000;

      const custoFixoKg = calcularCustoFixoKg(totalFixos, producaoMensal);
      const custoTotalKg = calcularCustoTotalKg(custoFixoKg, custoMpKg);
      const precoMinimo = calcularPrecoMinimo(custoTotalKg, input.margemDesejada, aliquotaSimples);
      const { margemUnitaria, margemPercentual, simplesKg } = calcularMargem(precoMinimo, custoTotalKg, aliquotaSimples);
      const margemMensal = margemUnitaria * producaoMensal;
      const lucroPotencialEstoque = margemUnitaria * estoque;

      if (input.salvar) {
        await saveSimulacao({
          tipo: 'preco',
          margemDesejada: input.margemDesejada.toFixed(4),
          precoMinimo: precoMinimo.toFixed(4),
          custoTotalKg: custoTotalKg.toFixed(4),
          margemUnitaria: margemUnitaria.toFixed(4),
          margemPercentual: margemPercentual.toFixed(4),
          margemMensal: margemMensal.toFixed(2),
          observacao: input.observacao,
        });
      }

      return {
        margemDesejada: input.margemDesejada,
        precoMinimo,
        custoTotalKg,
        custoFixoKg,
        custoMpKg,
        simplesKg,
        margemUnitaria,
        margemPercentual,
        margemMensal,
        lucroPotencialEstoque,
        aliquotaSimples,
      };
    }),

  cenarios: publicProcedure
    .input(z.object({
      precoBase: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const [custos, params] = await Promise.all([getCustosFixos(), getParametros()]);
      const paramMap: Record<string, number> = {};
      for (const p of params) paramMap[p.chave] = parseFloat(p.valor);

      const totalFixos = custos.reduce((sum, c) => sum + parseFloat(c.valorMensal), 0);
      const producaoMensal = paramMap['producao_mensal_kg'] ?? 31498;
      const custoMpKgPonderado3 = await getCustoMpPonderado();
      const custoMpKg = custoMpKgPonderado3 > 0 ? custoMpKgPonderado3 : (paramMap['custo_mp_kg'] ?? 7.37);
      const aliquotaSimples = paramMap['aliquota_simples'] ?? 11;
      const precoBase = input.precoBase ?? paramMap['preco_venda_atual'] ?? 24;

      const custoFixoKg = calcularCustoFixoKg(totalFixos, producaoMensal);
      const custoTotalKg = calcularCustoTotalKg(custoFixoKg, custoMpKg);

      // Gerar 9 cenários: -20%, -15%, -10%, -5%, atual, +5%, +10%, +15%, +20%
      const variacoes = [-20, -15, -10, -5, 0, 5, 10, 15, 20];
      const cenarios = variacoes.map(v => {
        const preco = precoBase * (1 + v / 100);
        const { margemUnitaria, margemPercentual } = calcularMargem(preco, custoTotalKg, aliquotaSimples);
        return {
          variacao: v,
          preco: parseFloat(preco.toFixed(4)),
          margemUnitaria: parseFloat(margemUnitaria.toFixed(4)),
          margemPercentual: parseFloat(margemPercentual.toFixed(2)),
          margemMensal: parseFloat((margemUnitaria * producaoMensal).toFixed(2)),
          lucrativo: margemUnitaria > 0,
        };
      });

      return { cenarios, custoTotalKg, precoBase };
    }),
});

const materiasPrimasRouter = router({
  list: publicProcedure.query(async () => {
    return getMateriasPrimas();
  }),

  update: publicProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().min(1),
      custoKg: z.number().min(0),
      percentualUso: z.number().min(0).max(100),
    }))
    .mutation(async ({ input }) => {
      await upsertMateriaPrima(input.id, {
        nome: input.nome,
        custoKg: input.custoKg.toFixed(4),
        percentualUso: input.percentualUso.toFixed(4),
      });
      return { success: true };
    }),

  custoMedioPonderado: publicProcedure.query(async () => {
    const custo = await getCustoMpPonderado();
    const mps = await getMateriasPrimas();
    const totalPct = mps.reduce((s, m) => s + parseFloat(m.percentualUso), 0);
    return { custo, totalPercentual: totalPct };
  }),
});

const simulacoesRouter = router({
  list: publicProcedure.query(async () => {
    return getSimulacoes(50);
  }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteSimulacao(input.id);
      return { success: true };
    }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  custos: custosRouter,
  parametros: parametrosRouter,
  calculo: calculoRouter,
  simulacoes: simulacoesRouter,
  materiasPrimas: materiasPrimasRouter,
});

export type AppRouter = typeof appRouter;
