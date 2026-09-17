import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatBRL, formatPercent, formatKg } from "@/lib/format";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Calculator, Target, Save, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

function ResultCard({
  label,
  value,
  sub,
  positive,
  large,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  large?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-5 card-gradient"
      style={{
        border: `1px solid ${positive === undefined ? "var(--border)" : positive ? "oklch(0.70 0.18 155 / 0.3)" : "oklch(0.65 0.22 25 / 0.3)"}`,
        background: positive === undefined ? undefined : positive ? "oklch(0.70 0.18 155 / 0.05)" : "oklch(0.65 0.22 25 / 0.05)",
      }}
    >
      <p className="text-xs font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>{label}</p>
      <p
        className={cn("font-bold tracking-tight", large ? "text-3xl" : "text-xl")}
        style={{ color: positive === undefined ? "var(--foreground)" : positive ? "oklch(0.70 0.18 155)" : "oklch(0.65 0.22 25)" }}
      >
        {value}
      </p>
      {sub && <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>{sub}</p>}
    </div>
  );
}

export default function Simulador() {
  const { data: resumo } = trpc.calculo.resumo.useQuery();
  const [precoVenda, setPrecoVenda] = useState("24.00");
  const [margemDesejada, setMargemDesejada] = useState("30");
  const [obsM, setObsM] = useState("");
  const [obsP, setObsP] = useState("");

  const simMargem = trpc.calculo.simularMargem.useMutation();
  const simPreco = trpc.calculo.simularPreco.useMutation();
  const { data: cenarios, refetch: refetchCenarios } = trpc.calculo.cenarios.useQuery({ precoBase: parseFloat(precoVenda) || 24 });

  const handleSimMargem = (salvar = false) => {
    const preco = parseFloat(precoVenda);
    if (isNaN(preco) || preco <= 0) { toast.error("Informe um preço válido"); return; }
    simMargem.mutate({ precoVenda: preco, salvar, observacao: obsM || undefined });
    if (salvar) toast.success("Simulação salva no histórico!");
  };

  const handleSimPreco = (salvar = false) => {
    const margem = parseFloat(margemDesejada);
    if (isNaN(margem) || margem < 0 || margem >= 89) { toast.error("Informe uma margem entre 0% e 88%"); return; }
    simPreco.mutate({ margemDesejada: margem, salvar, observacao: obsP || undefined });
    if (salvar) toast.success("Simulação salva no histórico!");
  };

  const mr = simMargem.data;
  const pr = simPreco.data;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>Simulador Financeiro</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          Simule margens e preços de venda. Custo total atual: <span className="font-semibold" style={{ color: "var(--primary)" }}>
            {resumo ? formatBRL(resumo.custoTotalKg, 4) : "—"}/kg
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Simulador 1: Preço → Margem */}
        <div className="rounded-xl p-4 sm:p-6 card-gradient space-y-5" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.72 0.18 195 / 0.15)", border: "1px solid oklch(0.72 0.18 195 / 0.25)" }}>
              <Calculator className="w-5 h-5" style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>Calcular Margem pelo Preço</h2>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Informe o preço de venda e veja a margem</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-2" style={{ color: "var(--foreground)" }}>Preço de Venda (R$/kg)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-medium" style={{ color: "var(--muted-foreground)" }}>R$</span>
              <input
                type="number"
                value={precoVenda}
                onChange={e => { setPrecoVenda(e.target.value); simMargem.reset(); }}
                step="0.01"
                min="0"
                placeholder="24.00"
                className="w-full text-xl font-bold rounded-lg py-3 pl-10 pr-12 outline-none transition-all text-right"
                style={{ background: "var(--input)", color: "var(--foreground)", border: "1px solid var(--primary)" }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--muted-foreground)" }}>/kg</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleSimMargem(false)}
              disabled={simMargem.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              {simMargem.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
              Calcular
            </button>
            <button
              onClick={() => handleSimMargem(true)}
              disabled={!mr}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90"
              style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
              title="Salvar no histórico"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>

          {mr && (
            <div className="space-y-3 animate-fade-in-up">
              <div className="divider-gradient" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ResultCard
                  label="Margem Percentual"
                  value={formatPercent(mr.margemPercentual)}
                  sub="Sobre o preço de venda"
                  positive={mr.margemPercentual > 0}
                  large
                />
                <ResultCard
                  label="Margem por kg"
                  value={formatBRL(mr.margemUnitaria, 4)}
                  sub="Após SIMPLES e custos"
                  positive={mr.margemUnitaria > 0}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ResultCard label="Margem Mensal" value={formatBRL(mr.margemMensal, 0)} sub="Produção mensal completa" positive={mr.margemMensal > 0} />
                <ResultCard label="Lucro Potencial Estoque" value={formatBRL(mr.lucroPotencialEstoque, 0)} sub="100 toneladas × margem" positive={mr.lucroPotencialEstoque > 0} />
              </div>
              <div className="rounded-lg p-3 space-y-1.5" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
                <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Decomposição por kg</p>
                {[
                  { l: "Preço de Venda", v: mr.precoVenda, cor: "var(--foreground)" },
                  { l: `SIMPLES (${mr.aliquotaSimples}%)`, v: -mr.simplesKg, cor: "oklch(0.65 0.18 240)" },
                  { l: "Matéria-Prima", v: -mr.custoMpKg, cor: "oklch(0.72 0.18 25)" },
                  { l: "Custos Fixos", v: -mr.custoFixoKg, cor: "oklch(0.72 0.18 195)" },
                  { l: "= Margem", v: mr.margemUnitaria, cor: mr.margemUnitaria > 0 ? "oklch(0.70 0.18 155)" : "oklch(0.65 0.22 25)" },
                ].map(({ l, v, cor }) => (
                  <div key={l} className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{l}</span>
                    <span className="text-xs font-medium tabular-nums" style={{ color: cor }}>{formatBRL(Math.abs(v), 4)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Simulador 2: Margem → Preço */}
        <div className="rounded-xl p-4 sm:p-6 card-gradient space-y-5" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.70 0.18 155 / 0.15)", border: "1px solid oklch(0.70 0.18 155 / 0.25)" }}>
              <Target className="w-5 h-5" style={{ color: "oklch(0.70 0.18 155)" }} />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>Calcular Preço pela Margem</h2>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Informe a margem desejada e veja o preço mínimo</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-2" style={{ color: "var(--foreground)" }}>Margem de Lucro Desejada (%)</label>
            <div className="relative">
              <input
                type="number"
                value={margemDesejada}
                onChange={e => { setMargemDesejada(e.target.value); simPreco.reset(); }}
                step="1"
                min="0"
                max="88"
                placeholder="30"
                className="w-full text-xl font-bold rounded-lg py-3 pl-4 pr-10 outline-none transition-all text-right"
                style={{ background: "var(--input)", color: "var(--foreground)", border: "1px solid oklch(0.70 0.18 155)" }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base font-medium" style={{ color: "var(--muted-foreground)" }}>%</span>
            </div>
            <p className="text-xs mt-1.5" style={{ color: "var(--muted-foreground)" }}>
              Margem máxima: {resumo ? formatPercent(89 - (resumo.aliquotaSimples ?? 11)) : "—"} (limitado pelo SIMPLES)
            </p>
          </div>

          {/* Atalhos de margem */}
          <div className="flex gap-2 flex-wrap">
            {[10, 20, 30, 40, 50].map(m => (
              <button
                key={m}
                onClick={() => { setMargemDesejada(m.toString()); simPreco.reset(); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                style={{
                  background: margemDesejada === m.toString() ? "oklch(0.70 0.18 155 / 0.2)" : "var(--secondary)",
                  color: margemDesejada === m.toString() ? "oklch(0.70 0.18 155)" : "var(--muted-foreground)",
                  border: `1px solid ${margemDesejada === m.toString() ? "oklch(0.70 0.18 155 / 0.4)" : "var(--border)"}`,
                }}
              >
                {m}%
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleSimPreco(false)}
              disabled={simPreco.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90"
              style={{ background: "oklch(0.70 0.18 155)", color: "oklch(0.10 0.008 260)" }}
            >
              {simPreco.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
              Calcular
            </button>
            <button
              onClick={() => handleSimPreco(true)}
              disabled={!pr}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90"
              style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
              title="Salvar no histórico"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>

          {pr && (
            <div className="space-y-3 animate-fade-in-up">
              <div className="divider-gradient" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ResultCard
                  label="Preço Mínimo de Venda"
                  value={formatBRL(pr.precoMinimo, 4)}
                  sub="Para atingir a margem desejada"
                  positive
                  large
                />
                <ResultCard
                  label="Margem Real"
                  value={formatPercent(pr.margemPercentual)}
                  sub="Verificação do cálculo"
                  positive={pr.margemPercentual > 0}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ResultCard label="Margem Mensal" value={formatBRL(pr.margemMensal, 0)} sub="Produção mensal completa" positive={pr.margemMensal > 0} />
                <ResultCard label="Lucro Potencial Estoque" value={formatBRL(pr.lucroPotencialEstoque, 0)} sub="100 toneladas × margem" positive={pr.lucroPotencialEstoque > 0} />
              </div>
              <div className="rounded-lg p-3 space-y-1.5" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
                <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Decomposição por kg</p>
                {[
                  { l: "Preço Mínimo", v: pr.precoMinimo, cor: "var(--foreground)" },
                  { l: `SIMPLES (${pr.aliquotaSimples}%)`, v: pr.simplesKg, cor: "oklch(0.65 0.18 240)" },
                  { l: "Matéria-Prima", v: pr.custoMpKg, cor: "oklch(0.72 0.18 25)" },
                  { l: "Custos Fixos", v: pr.custoFixoKg, cor: "oklch(0.72 0.18 195)" },
                  { l: "= Margem", v: pr.margemUnitaria, cor: "oklch(0.70 0.18 155)" },
                ].map(({ l, v, cor }) => (
                  <div key={l} className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{l}</span>
                    <span className="text-xs font-medium tabular-nums" style={{ color: cor }}>{formatBRL(v, 4)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabela de cenários */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="flex items-start justify-between gap-3 px-4 py-4 sm:items-center sm:px-6" style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>Tabela de Cenários Comparativos</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              Variações de ±20% sobre o preço base de {formatBRL(parseFloat(precoVenda) || 24)}/kg
            </p>
          </div>
          <button onClick={() => refetchCenarios()} className="p-2 rounded-lg transition-all hover:opacity-80" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Variação", "Preço de Venda", "Margem por kg", "Margem %", "Margem Mensal", "Status"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
            {cenarios?.cenarios.map(c => (
              <tr
                key={c.variacao}
                className="transition-colors"
                style={{
                  background: c.variacao === 0 ? "oklch(0.72 0.18 195 / 0.06)" : "var(--card)",
                }}
              >
                <td className="px-4 py-3">
                  <span
                    className="text-sm font-medium"
                    style={{ color: c.variacao === 0 ? "var(--primary)" : c.variacao > 0 ? "oklch(0.70 0.18 155)" : "oklch(0.65 0.22 25)" }}
                  >
                    {c.variacao === 0 ? "Base" : c.variacao > 0 ? `+${c.variacao}%` : `${c.variacao}%`}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-medium tabular-nums" style={{ color: "var(--foreground)" }}>
                  {formatBRL(c.preco)}
                </td>
                <td className="px-4 py-3 text-sm tabular-nums" style={{ color: c.lucrativo ? "oklch(0.70 0.18 155)" : "oklch(0.65 0.22 25)" }}>
                  {formatBRL(c.margemUnitaria, 4)}
                </td>
                <td className="px-4 py-3 text-sm tabular-nums font-medium" style={{ color: c.lucrativo ? "oklch(0.70 0.18 155)" : "oklch(0.65 0.22 25)" }}>
                  {formatPercent(c.margemPercentual)}
                </td>
                <td className="px-4 py-3 text-sm tabular-nums" style={{ color: c.lucrativo ? "oklch(0.70 0.18 155)" : "oklch(0.65 0.22 25)" }}>
                  {formatBRL(c.margemMensal, 0)}
                </td>
                <td className="px-4 py-3">
                  <span className={cn("text-xs px-2 py-1 rounded-full font-medium", c.lucrativo ? "badge-positive" : "badge-negative")}>
                    {c.lucrativo ? "Lucrativo" : "Prejuízo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
