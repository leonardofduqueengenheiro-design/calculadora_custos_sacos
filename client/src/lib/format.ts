export function formatBRL(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return "R$ —";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return "—%";
  return `${value.toFixed(decimals).replace(".", ",")}%`;
}

export function formatKg(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + " kg";
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export const CATEGORIAS: Record<string, string> = {
  folha_pagamento: "Folha de Pagamento",
  impostos_folha: "Impostos sobre Folha",
  energia: "Energia Elétrica",
  combustivel: "Combustível",
  transporte_frete: "Transporte / Frete",
  manutencao: "Manutenção e Peças",
  servicos: "Serviços",
  comissoes: "Comissões",
  diversos: "Diversos",
};

export const CATEGORIA_CORES: Record<string, string> = {
  folha_pagamento: "oklch(0.72 0.18 195)",
  impostos_folha: "oklch(0.65 0.18 240)",
  energia: "oklch(0.78 0.18 75)",
  combustivel: "oklch(0.70 0.18 45)",
  transporte_frete: "oklch(0.72 0.18 155)",
  manutencao: "oklch(0.65 0.18 300)",
  servicos: "oklch(0.70 0.18 330)",
  comissoes: "oklch(0.72 0.18 25)",
  diversos: "oklch(0.60 0.015 260)",
};
