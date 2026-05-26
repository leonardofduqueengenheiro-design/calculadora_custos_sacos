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
