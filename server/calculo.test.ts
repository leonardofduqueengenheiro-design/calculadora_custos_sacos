import { describe, expect, it } from "vitest";

// Replicar a lógica de cálculo para testes
function calcularCustoFixoKg(totalFixos: number, producaoMensal: number): number {
  if (producaoMensal <= 0) return 0;
  return totalFixos / producaoMensal;
}

function calcularCustoTotalKg(custoFixoKg: number, custoMpKg: number): number {
  return custoFixoKg + custoMpKg;
}

function calcularPrecoMinimo(custoTotalKg: number, margemDesejada: number, aliquotaSimples: number): number {
  const denominador = 1 - margemDesejada / 100 - aliquotaSimples / 100;
  if (denominador <= 0) return 0;
  return custoTotalKg / denominador;
}

function calcularMargem(precoVenda: number, custoTotalKg: number, aliquotaSimples: number) {
  const simplesKg = precoVenda * (aliquotaSimples / 100);
  const margemUnitaria = precoVenda - simplesKg - custoTotalKg;
  const margemPercentual = precoVenda > 0 ? (margemUnitaria / precoVenda) * 100 : 0;
  return { simplesKg, margemUnitaria, margemPercentual };
}

// Replicar lógica de custo médio ponderado
function calcularCustoMpPonderado(mps: { custoKg: number; percentualUso: number }[]): number {
  const totalPct = mps.reduce((s, m) => s + m.percentualUso, 0);
  if (totalPct <= 0) return 0;
  const ponderado = mps.reduce((s, m) => s + m.custoKg * m.percentualUso, 0);
  return ponderado / totalPct;
}

describe("Custo Médio Ponderado de Matérias-Primas", () => {
  it("calcula corretamente com duas MPs", () => {
    const mps = [
      { custoKg: 7.00, percentualUso: 60 },
      { custoKg: 8.00, percentualUso: 40 },
    ];
    expect(calcularCustoMpPonderado(mps)).toBeCloseTo(7.40, 4);
  });

  it("retorna custo único quando há apenas uma MP com 100%", () => {
    const mps = [{ custoKg: 7.37, percentualUso: 100 }];
    expect(calcularCustoMpPonderado(mps)).toBeCloseTo(7.37, 4);
  });

  it("retorna 0 quando total de percentuais é 0", () => {
    const mps = [{ custoKg: 7.37, percentualUso: 0 }];
    expect(calcularCustoMpPonderado(mps)).toBe(0);
  });

  it("calcula corretamente com 5 MPs", () => {
    const mps = [
      { custoKg: 7.37, percentualUso: 60 },
      { custoKg: 7.80, percentualUso: 25 },
      { custoKg: 8.10, percentualUso: 10 },
      { custoKg: 6.50, percentualUso: 3 },
      { custoKg: 9.00, percentualUso: 2 },
    ];
    // (7.37*60 + 7.80*25 + 8.10*10 + 6.50*3 + 9.00*2) / 100
    const esperado = (7.37*60 + 7.80*25 + 8.10*10 + 6.50*3 + 9.00*2) / 100;
    expect(calcularCustoMpPonderado(mps)).toBeCloseTo(esperado, 4);
  });

  it("normaliza percentuais que não somam 100%", () => {
    // Se percentuais somam 50, ainda deve calcular a média ponderada corretamente
    const mps = [
      { custoKg: 7.00, percentualUso: 30 },
      { custoKg: 8.00, percentualUso: 20 },
    ];
    // (7*30 + 8*20) / 50 = (210 + 160) / 50 = 7.4
    expect(calcularCustoMpPonderado(mps)).toBeCloseTo(7.4, 4);
  });
});

describe("Cálculo de Custo Fixo por kg", () => {
  it("divide total de fixos pela produção mensal", () => {
    const result = calcularCustoFixoKg(285540.79, 31498);
    expect(result).toBeCloseTo(9.065, 2);
  });

  it("retorna 0 se produção for 0", () => {
    expect(calcularCustoFixoKg(100000, 0)).toBe(0);
  });
});

describe("Cálculo de Custo Total por kg", () => {
  it("soma custo fixo e matéria-prima", () => {
    const result = calcularCustoTotalKg(9.065, 8.234);
    expect(result).toBeCloseTo(17.299, 2);
  });
});

describe("Cálculo de Margem", () => {
  it("calcula margem corretamente com SIMPLES de 11%", () => {
    const { simplesKg, margemUnitaria, margemPercentual } = calcularMargem(24, 17.299, 11);
    expect(simplesKg).toBeCloseTo(2.64, 2);
    expect(margemUnitaria).toBeCloseTo(4.061, 2);
    expect(margemPercentual).toBeCloseTo(16.92, 1);
  });

  it("retorna margem negativa quando preço é menor que custo + SIMPLES", () => {
    const { margemUnitaria } = calcularMargem(15, 17.299, 11);
    expect(margemUnitaria).toBeLessThan(0);
  });

  it("SIMPLES é calculado sobre o preço de venda, não sobre o custo", () => {
    const preco = 30;
    const { simplesKg } = calcularMargem(preco, 10, 11);
    expect(simplesKg).toBeCloseTo(preco * 0.11, 4);
  });
});

describe("Cálculo de Preço Mínimo", () => {
  it("calcula preço mínimo para margem de 30% com SIMPLES de 11%", () => {
    // Custo / (1 - 0.30 - 0.11) = Custo / 0.59
    const preco = calcularPrecoMinimo(17.299, 30, 11);
    expect(preco).toBeCloseTo(17.299 / 0.59, 2);
  });

  it("verifica que margem calculada sobre preço mínimo é a margem desejada", () => {
    const custo = 17.299;
    const margemDesejada = 30;
    const simples = 11;
    const preco = calcularPrecoMinimo(custo, margemDesejada, simples);
    const { margemPercentual } = calcularMargem(preco, custo, simples);
    expect(margemPercentual).toBeCloseTo(margemDesejada, 1);
  });

  it("retorna 0 quando denominador é <= 0 (margem + simples >= 100%)", () => {
    expect(calcularPrecoMinimo(10, 90, 11)).toBe(0);
  });

  it("calcula preço para margem de 20%", () => {
    const preco = calcularPrecoMinimo(17.299, 20, 11);
    const { margemPercentual } = calcularMargem(preco, 17.299, 11);
    expect(margemPercentual).toBeCloseTo(20, 1);
  });
});

describe("Dados reais do cliente", () => {
  const totalFixos = 285540.79;
  const producaoMensal = 31498;
  const custoMpKg = 8.234;
  const aliquotaSimples = 11;
  const precoVenda = 24;

  it("custo fixo por kg com dados reais", () => {
    const custoFixoKg = calcularCustoFixoKg(totalFixos, producaoMensal);
    expect(custoFixoKg).toBeGreaterThan(8);
    expect(custoFixoKg).toBeLessThan(11);
  });

  it("margem atual com preço de R$24,00 é positiva", () => {
    const custoFixoKg = calcularCustoFixoKg(totalFixos, producaoMensal);
    const custoTotalKg = calcularCustoTotalKg(custoFixoKg, custoMpKg);
    const { margemUnitaria, margemPercentual } = calcularMargem(precoVenda, custoTotalKg, aliquotaSimples);
    expect(margemUnitaria).toBeGreaterThan(0);
    expect(margemPercentual).toBeGreaterThan(0);
  });

  it("preço mínimo para 30% de margem é maior que R$24", () => {
    const custoFixoKg = calcularCustoFixoKg(totalFixos, producaoMensal);
    const custoTotalKg = calcularCustoTotalKg(custoFixoKg, custoMpKg);
    const precoMinimo = calcularPrecoMinimo(custoTotalKg, 30, aliquotaSimples);
    expect(precoMinimo).toBeGreaterThan(24);
  });
});

// Lógica do Break-Even Chart (replicada do Dashboard)
function calcularBreakEven(
  custoFixoMensal: number,
  custoVarKg: number,
  precoVenda: number,
  aliquotaSimples: number
): number | null {
  const receitaLiquidaKg = precoVenda * (1 - aliquotaSimples / 100);
  const margemContribuicaoKg = receitaLiquidaKg - custoVarKg;
  if (margemContribuicaoKg <= 0) return null;
  return custoFixoMensal / margemContribuicaoKg;
}

describe("Break-Even Chart — Ponto de Equilíbrio", () => {
  it("calcula o volume de equilíbrio corretamente", () => {
    // custoFixo=150000, custoVar=7.37/kg, preço=24, simples=11%
    // receitaLiq = 24 * 0.89 = 21.36
    // margemContrib = 21.36 - 7.37 = 13.99
    // PE = 150000 / 13.99 ≈ 10722 kg
    const pe = calcularBreakEven(150000, 7.37, 24, 11);
    expect(pe).not.toBeNull();
    expect(pe!).toBeCloseTo(150000 / (24 * 0.89 - 7.37), 0);
  });

  it("retorna null quando margem de contribuição é zero ou negativa", () => {
    // preço líquido = custo variável → sem contribuição para fixos
    const pe = calcularBreakEven(100000, 21.36, 24, 11); // 24*0.89=21.36 = custoVar
    expect(pe).toBeNull();
  });

  it("produção acima do PE gera lucro positivo", () => {
    const pe = calcularBreakEven(150000, 7.37, 24, 11)!;
    const producaoAcima = pe * 1.5;
    const receitaLiq = 24 * 0.89 * producaoAcima;
    const custoTotal = 150000 + 7.37 * producaoAcima;
    expect(receitaLiq).toBeGreaterThan(custoTotal);
  });

  it("produção abaixo do PE gera prejuízo", () => {
    const pe = calcularBreakEven(150000, 7.37, 24, 11)!;
    const producaoAbaixo = pe * 0.5;
    const receitaLiq = 24 * 0.89 * producaoAbaixo;
    const custoTotal = 150000 + 7.37 * producaoAbaixo;
    expect(receitaLiq).toBeLessThan(custoTotal);
  });

  it("no ponto de equilíbrio receita ≈ custo total", () => {
    const pe = calcularBreakEven(150000, 7.37, 24, 11)!;
    const receitaLiq = 24 * 0.89 * pe;
    const custoTotal = 150000 + 7.37 * pe;
    expect(Math.abs(receitaLiq - custoTotal)).toBeLessThan(1); // diferença < R$1
  });

  it("com dados reais do cliente, PE é menor que produção atual", () => {
    const pe = calcularBreakEven(259487, 7.0541, 24, 11)!;
    const producaoAtual = 31498;
    expect(pe).toBeGreaterThan(0);
    expect(producaoAtual).toBeGreaterThan(pe); // produção atual acima do PE = lucrativo
  });
});

// ─── Lógica de energia mista ─────────────────────────────────────────────────
function calcularCustosComEnergiaMista(
  custos: { categoria: string; valor: number }[],
  energiaPercentualFixo: number,
  producaoMensal: number
) {
  let totalFixos = 0;
  let energiaVariavelTotal = 0;
  for (const c of custos) {
    if (c.categoria === "energia_eletrica") {
      totalFixos += c.valor * (energiaPercentualFixo / 100);
      energiaVariavelTotal += c.valor * (1 - energiaPercentualFixo / 100);
    } else {
      totalFixos += c.valor;
    }
  }
  const energiaVariavelKg = producaoMensal > 0 ? energiaVariavelTotal / producaoMensal : 0;
  return { totalFixos, energiaVariavelKg };
}

describe("Energia Elétrica Mista (Fixo + Variável)", () => {
  it("separa energia em 20% fixo e 80% variável", () => {
    const custos = [
      { categoria: "energia_eletrica", valor: 22694 },
      { categoria: "folha_pagamento", valor: 126146 },
    ];
    const { totalFixos, energiaVariavelKg } = calcularCustosComEnergiaMista(custos, 20, 31498);
    expect(totalFixos).toBeCloseTo(126146 + 22694 * 0.20, 0);
    expect(energiaVariavelKg).toBeCloseTo((22694 * 0.80) / 31498, 4);
  });

  it("com 100% fixo, energia variável por kg é zero", () => {
    const custos = [{ categoria: "energia_eletrica", valor: 10000 }];
    const { totalFixos, energiaVariavelKg } = calcularCustosComEnergiaMista(custos, 100, 31498);
    expect(totalFixos).toBeCloseTo(10000, 0);
    expect(energiaVariavelKg).toBeCloseTo(0, 4);
  });

  it("com 0% fixo, toda energia é variável", () => {
    const custos = [{ categoria: "energia_eletrica", valor: 10000 }];
    const { totalFixos, energiaVariavelKg } = calcularCustosComEnergiaMista(custos, 0, 10000);
    expect(totalFixos).toBeCloseTo(0, 0);
    expect(energiaVariavelKg).toBeCloseTo(1.0, 4);
  });

  it("custo total por kg inclui energia variável", () => {
    const custoFixoKg = 5.00;
    const custoMpKg = 7.37;
    const energiaVariavelKg = 0.58;
    const custoTotal = custoFixoKg + custoMpKg + energiaVariavelKg;
    expect(custoTotal).toBeCloseTo(12.95, 2);
  });
});

// ─── Análise por Mix de Produtos ─────────────────────────────────────────────
function calcularAnaliseMix(
  itens: { kgProduzido: number; precoVendaKg: number; custoMpKg: number }[],
  custoFixoKg: number,
  energiaVariavelKg: number,
  aliquotaSimples: number
) {
  const resultados = itens.map(item => {
    const custoTotalKg = custoFixoKg + item.custoMpKg + energiaVariavelKg;
    const simplesKg = item.precoVendaKg * (aliquotaSimples / 100);
    const margemUnitaria = item.precoVendaKg - simplesKg - custoTotalKg;
    const margemPercentual = item.precoVendaKg > 0 ? (margemUnitaria / item.precoVendaKg) * 100 : 0;
    const faturamento = item.precoVendaKg * item.kgProduzido;
    const lucro = margemUnitaria * item.kgProduzido;
    return { custoTotalKg, simplesKg, margemUnitaria, margemPercentual, faturamento, lucro };
  });
  const totalFaturamento = resultados.reduce((s, r) => s + r.faturamento, 0);
  const totalLucro = resultados.reduce((s, r) => s + r.lucro, 0);
  const margemConsolidada = totalFaturamento > 0 ? (totalLucro / totalFaturamento) * 100 : 0;
  return { resultados, totalFaturamento, totalLucro, margemConsolidada };
}

describe("Análise por Mix de Produtos", () => {
  it("calcula margem corretamente para produto único", () => {
    const { resultados } = calcularAnaliseMix(
      [{ kgProduzido: 10000, precoVendaKg: 24, custoMpKg: 7.37 }],
      7.76, 0.58, 11
    );
    expect(resultados[0].custoTotalKg).toBeCloseTo(15.71, 2);
    expect(resultados[0].simplesKg).toBeCloseTo(2.64, 2);
    expect(resultados[0].margemUnitaria).toBeCloseTo(5.65, 2);
    expect(resultados[0].faturamento).toBeCloseTo(240000, 0);
  });

  it("calcula margem consolidada corretamente para mix de dois produtos", () => {
    const { totalFaturamento, totalLucro, margemConsolidada } = calcularAnaliseMix(
      [
        { kgProduzido: 10000, precoVendaKg: 22, custoMpKg: 6.50 },
        { kgProduzido: 5000, precoVendaKg: 28, custoMpKg: 8.00 },
      ],
      7.76, 0.58, 11
    );
    expect(totalFaturamento).toBeCloseTo(360000, 0);
    expect(margemConsolidada).toBeGreaterThan(0);
  });

  it("produto com preço abaixo do custo gera lucro negativo", () => {
    const { resultados } = calcularAnaliseMix(
      [{ kgProduzido: 5000, precoVendaKg: 12, custoMpKg: 7.37 }],
      7.76, 0.58, 11
    );
    expect(resultados[0].margemUnitaria).toBeLessThan(0);
    expect(resultados[0].lucro).toBeLessThan(0);
  });

  it("margem consolidada é ponderada pelo faturamento de cada produto", () => {
    const { margemConsolidada, resultados } = calcularAnaliseMix(
      [
        { kgProduzido: 20000, precoVendaKg: 24, custoMpKg: 7.37 },
        { kgProduzido: 1000, precoVendaKg: 30, custoMpKg: 9.00 },
      ],
      7.76, 0.58, 11
    );
    // Margem consolidada deve ser mais próxima do produto com maior faturamento
    expect(margemConsolidada).toBeGreaterThan(0);
    expect(resultados[1].margemPercentual).toBeGreaterThan(resultados[0].margemPercentual);
  });
});

// ─── Lógica de custos mistos: energia + combustível + frete ──────────────────
function calcularCustosMistos(
  custos: { categoria: string; valor: number }[],
  energiaPercentualFixo: number,
  combustivelPercentualFixo: number,
  fretePercentualFixo: number,
  producaoMensal: number
) {
  let totalFixos = 0;
  let energiaVariavelTotal = 0;
  let combustivelVariavelTotal = 0;
  let freteVariavelTotal = 0;

  for (const c of custos) {
    if (c.categoria === "energia_eletrica") {
      totalFixos += c.valor * (energiaPercentualFixo / 100);
      energiaVariavelTotal += c.valor * (1 - energiaPercentualFixo / 100);
    } else if (c.categoria === "combustivel") {
      totalFixos += c.valor * (combustivelPercentualFixo / 100);
      combustivelVariavelTotal += c.valor * (1 - combustivelPercentualFixo / 100);
    } else if (c.categoria === "transporte_frete") {
      totalFixos += c.valor * (fretePercentualFixo / 100);
      freteVariavelTotal += c.valor * (1 - fretePercentualFixo / 100);
    } else {
      totalFixos += c.valor;
    }
  }

  const energiaVariavelKg = producaoMensal > 0 ? energiaVariavelTotal / producaoMensal : 0;
  const combustivelVariavelKg = producaoMensal > 0 ? combustivelVariavelTotal / producaoMensal : 0;
  const freteVariavelKg = producaoMensal > 0 ? freteVariavelTotal / producaoMensal : 0;
  const totalVariavelKg = energiaVariavelKg + combustivelVariavelKg + freteVariavelKg;

  return { totalFixos, totalVariavelKg, energiaVariavelKg, combustivelVariavelKg, freteVariavelKg };
}

describe("Custos Mistos — Combustível e Frete", () => {
  it("separa combustível em 30% fixo e 70% variável", () => {
    const custos = [{ categoria: "combustivel", valor: 6003 }];
    const { totalFixos, combustivelVariavelKg } = calcularCustosMistos(custos, 20, 30, 40, 31498);
    expect(totalFixos).toBeCloseTo(6003 * 0.30, 0);
    expect(combustivelVariavelKg).toBeCloseTo((6003 * 0.70) / 31498, 4);
  });

  it("separa frete em 40% fixo e 60% variável", () => {
    const custos = [{ categoria: "transporte_frete", valor: 18334 }];
    const { totalFixos, freteVariavelKg } = calcularCustosMistos(custos, 20, 30, 40, 31498);
    expect(totalFixos).toBeCloseTo(18334 * 0.40, 0);
    expect(freteVariavelKg).toBeCloseTo((18334 * 0.60) / 31498, 4);
  });

  it("totalVariavelKg soma energia + combustível + frete variáveis", () => {
    const custos = [
      { categoria: "energia_eletrica", valor: 22694 },
      { categoria: "combustivel", valor: 6003 },
      { categoria: "transporte_frete", valor: 18334 },
    ];
    const { totalVariavelKg, energiaVariavelKg, combustivelVariavelKg, freteVariavelKg } =
      calcularCustosMistos(custos, 20, 30, 40, 31498);
    expect(totalVariavelKg).toBeCloseTo(energiaVariavelKg + combustivelVariavelKg + freteVariavelKg, 6);
  });

  it("outros custos vão integralmente para fixos", () => {
    const custos = [
      { categoria: "folha_pagamento", valor: 126146 },
      { categoria: "servicos", valor: 19551 },
    ];
    const { totalFixos, totalVariavelKg } = calcularCustosMistos(custos, 20, 30, 40, 31498);
    expect(totalFixos).toBeCloseTo(126146 + 19551, 0);
    expect(totalVariavelKg).toBeCloseTo(0, 4);
  });

  it("com 100% fixo em todos, variável por kg é zero", () => {
    const custos = [
      { categoria: "energia_eletrica", valor: 10000 },
      { categoria: "combustivel", valor: 5000 },
      { categoria: "transporte_frete", valor: 8000 },
    ];
    const { totalVariavelKg } = calcularCustosMistos(custos, 100, 100, 100, 31498);
    expect(totalVariavelKg).toBeCloseTo(0, 4);
  });
});

// ─── Otimizador de Mix de Produção ───────────────────────────────────────────

/**
 * Algoritmo de otimização gulosa (greedy):
 * 1. Calcular margem unitária de cada produto
 * 2. Alocar mínimos garantidos
 * 3. Ordenar por margem decrescente
 * 4. Alocar volume restante nos mais rentáveis (respeitando máximos)
 */
function otimizarMix(
  produtos: {
    id: number;
    precoVendaKg: number;
    custoMpKg: number;
    kgMinimo?: number;
    kgMaximo?: number;
  }[],
  volumeTotalKg: number,
  custoFixoKg: number,
  totalVariavelKg: number,
  aliquotaSimples: number
) {
  // Calcular margem unitária de cada produto
  const comMargem = produtos.map(p => {
    const custoTotalKg = custoFixoKg + p.custoMpKg + totalVariavelKg;
    const simplesKg = p.precoVendaKg * (aliquotaSimples / 100);
    const margemUnitaria = p.precoVendaKg - simplesKg - custoTotalKg;
    return { ...p, margemUnitaria, kgMinimo: p.kgMinimo ?? 0 };
  });

  // Alocar mínimos
  const alocacao: Record<number, number> = {};
  for (const p of comMargem) alocacao[p.id] = p.kgMinimo;
  let restante = volumeTotalKg - comMargem.reduce((s, p) => s + p.kgMinimo, 0);

  // Ordenar por margem decrescente
  const ordenados = [...comMargem].sort((a, b) => b.margemUnitaria - a.margemUnitaria);

  // Alocar restante nos mais rentáveis
  for (const p of ordenados) {
    if (restante <= 0) break;
    const espaco = p.kgMaximo !== undefined
      ? Math.max(0, p.kgMaximo - alocacao[p.id])
      : restante;
    const alocar = Math.min(restante, espaco);
    alocacao[p.id] += alocar;
    restante -= alocar;
  }

  const totalLucro = comMargem.reduce((s, p) => s + p.margemUnitaria * alocacao[p.id], 0);
  return { alocacao, totalLucro, comMargem };
}

describe("Otimizador de Mix de Produção", () => {
  const custoFixoKg = 9.065;
  const totalVariavelKg = 0.80;
  const aliquotaSimples = 11;
  const volumeTotal = 31498;

  it("aloca todo o volume no produto mais rentável quando sem restrições", () => {
    const produtos = [
      { id: 1, precoVendaKg: 28, custoMpKg: 7.00 },  // maior margem
      { id: 2, precoVendaKg: 22, custoMpKg: 8.00 },  // menor margem
    ];
    const { alocacao } = otimizarMix(produtos, volumeTotal, custoFixoKg, totalVariavelKg, aliquotaSimples);
    expect(alocacao[1]).toBeCloseTo(volumeTotal, 0);
    expect(alocacao[2]).toBeCloseTo(0, 0);
  });

  it("respeita volume mínimo do produto menos rentável", () => {
    const produtos = [
      { id: 1, precoVendaKg: 28, custoMpKg: 7.00, kgMinimo: 0 },
      { id: 2, precoVendaKg: 22, custoMpKg: 8.00, kgMinimo: 5000 },
    ];
    const { alocacao } = otimizarMix(produtos, volumeTotal, custoFixoKg, totalVariavelKg, aliquotaSimples);
    expect(alocacao[2]).toBeGreaterThanOrEqual(5000);
    expect(alocacao[1] + alocacao[2]).toBeCloseTo(volumeTotal, 0);
  });

  it("respeita volume máximo do produto mais rentável", () => {
    const produtos = [
      { id: 1, precoVendaKg: 28, custoMpKg: 7.00, kgMaximo: 10000 },
      { id: 2, precoVendaKg: 22, custoMpKg: 8.00 },
    ];
    const { alocacao } = otimizarMix(produtos, volumeTotal, custoFixoKg, totalVariavelKg, aliquotaSimples);
    expect(alocacao[1]).toBeLessThanOrEqual(10000 + 0.01);
    expect(alocacao[1] + alocacao[2]).toBeCloseTo(volumeTotal, 0);
  });

  it("lucro otimizado é maior ou igual ao lucro de distribuição uniforme", () => {
    const produtos = [
      { id: 1, precoVendaKg: 28, custoMpKg: 7.00 },
      { id: 2, precoVendaKg: 22, custoMpKg: 8.00 },
      { id: 3, precoVendaKg: 25, custoMpKg: 7.50 },
    ];
    const { totalLucro: lucroOtimizado } = otimizarMix(produtos, volumeTotal, custoFixoKg, totalVariavelKg, aliquotaSimples);

    // Calcular lucro com distribuição uniforme (1/3 cada)
    const kgUniforme = volumeTotal / 3;
    const lucroUniforme = produtos.reduce((s, p) => {
      const custoTotalKg = custoFixoKg + p.custoMpKg + totalVariavelKg;
      const simplesKg = p.precoVendaKg * (aliquotaSimples / 100);
      const margem = p.precoVendaKg - simplesKg - custoTotalKg;
      return s + margem * kgUniforme;
    }, 0);

    expect(lucroOtimizado).toBeGreaterThanOrEqual(lucroUniforme - 0.01);
  });

  it("produto com margem negativa recebe apenas o mínimo obrigatório", () => {
    const produtos = [
      { id: 1, precoVendaKg: 28, custoMpKg: 7.00 },
      { id: 2, precoVendaKg: 12, custoMpKg: 8.00, kgMinimo: 1000 }, // preço abaixo do custo
    ];
    const { alocacao, comMargem } = otimizarMix(produtos, volumeTotal, custoFixoKg, totalVariavelKg, aliquotaSimples);
    const prod2 = comMargem.find(p => p.id === 2)!;
    expect(prod2.margemUnitaria).toBeLessThan(0);
    expect(alocacao[2]).toBeCloseTo(1000, 0); // apenas o mínimo
  });

  it("soma das alocações é igual ao volume total", () => {
    const produtos = [
      { id: 1, precoVendaKg: 26, custoMpKg: 7.00, kgMinimo: 3000, kgMaximo: 15000 },
      { id: 2, precoVendaKg: 24, custoMpKg: 7.37, kgMinimo: 5000, kgMaximo: 20000 },
      { id: 3, precoVendaKg: 22, custoMpKg: 8.00, kgMinimo: 2000 },
    ];
    const { alocacao } = otimizarMix(produtos, volumeTotal, custoFixoKg, totalVariavelKg, aliquotaSimples);
    const somaTotal = Object.values(alocacao).reduce((s, v) => s + v, 0);
    expect(somaTotal).toBeCloseTo(volumeTotal, 0);
  });
});

// ─── Sincronização de Custos de MP entre Catálogo e Produtos ─────────────────

/**
 * Simula a lógica de propagação de custo: dado um mapa de materiaPrimaId → novoCusto,
 * atualiza as linhas de produto_materias_primas que têm esse vínculo.
 */
function propagarCustosSimulado(
  linhasProduto: { ordem: number; nome: string; custoKg: number; materiaPrimaId: number | null }[],
  atualizacoes: Record<number, number> // materiaPrimaId → novoCustoKg
) {
  return linhasProduto.map(linha => {
    if (linha.materiaPrimaId !== null && atualizacoes[linha.materiaPrimaId] !== undefined) {
      return { ...linha, custoKg: atualizacoes[linha.materiaPrimaId] };
    }
    return linha;
  });
}

describe("Sincronização de Custos de MP", () => {
  const linhasBase = [
    { ordem: 1, nome: "PEAD virgem", custoKg: 7.00, materiaPrimaId: 1 },
    { ordem: 2, nome: "Reciclado", custoKg: 4.50, materiaPrimaId: 2 },
    { ordem: 3, nome: "Aditivo", custoKg: 12.00, materiaPrimaId: null }, // manual, sem vínculo
  ];

  it("atualiza apenas as linhas vinculadas ao catálogo", () => {
    const resultado = propagarCustosSimulado(linhasBase, { 1: 7.80 });
    expect(resultado[0].custoKg).toBeCloseTo(7.80, 2);
    expect(resultado[1].custoKg).toBeCloseTo(4.50, 2); // não alterado
    expect(resultado[2].custoKg).toBeCloseTo(12.00, 2); // manual, não alterado
  });

  it("não altera linhas sem vínculo (materiaPrimaId null)", () => {
    const resultado = propagarCustosSimulado(linhasBase, { 1: 8.00, 2: 5.00 });
    expect(resultado[2].custoKg).toBeCloseTo(12.00, 2);
    expect(resultado[2].materiaPrimaId).toBeNull();
  });

  it("atualiza múltiplas MPs ao mesmo tempo", () => {
    const resultado = propagarCustosSimulado(linhasBase, { 1: 9.00, 2: 6.00 });
    expect(resultado[0].custoKg).toBeCloseTo(9.00, 2);
    expect(resultado[1].custoKg).toBeCloseTo(6.00, 2);
  });

  it("custo ponderado recalculado após propagação reflete novo valor", () => {
    const percentuais = [60, 30, 10]; // % de uso de cada MP
    const linhasAtualizadas = propagarCustosSimulado(linhasBase, { 1: 8.00 });
    const custoTotal = linhasAtualizadas.reduce((s, l, i) => s + l.custoKg * percentuais[i], 0);
    const custoMedio = custoTotal / 100;
    // 8.00*60% + 4.50*30% + 12.00*10% = 4.80 + 1.35 + 1.20 = 7.35
    expect(custoMedio).toBeCloseTo(7.35, 2);
  });

  it("sem atualizações, nenhuma linha é alterada", () => {
    const resultado = propagarCustosSimulado(linhasBase, {});
    expect(resultado[0].custoKg).toBeCloseTo(7.00, 2);
    expect(resultado[1].custoKg).toBeCloseTo(4.50, 2);
    expect(resultado[2].custoKg).toBeCloseTo(12.00, 2);
  });
});
