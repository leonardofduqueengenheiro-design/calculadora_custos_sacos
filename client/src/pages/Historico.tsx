import { trpc } from "@/lib/trpc";
import { formatBRL, formatPercent } from "@/lib/format";
import { toast } from "sonner";
import { Trash2, Printer, RefreshCw, History, Calculator, Target } from "lucide-react";
import { cn } from "@/lib/utils";

function handlePrint() {
  window.print();
}

export default function Historico() {
  const { data: simulacoes, isLoading, refetch } = trpc.simulacoes.list.useQuery();
  const del = trpc.simulacoes.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Simulação removida!"); } });
  const { data: resumo } = trpc.calculo.resumo.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>Histórico de Simulações</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Simulações salvas para comparação de cenários
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
            style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}
          >
            <Printer className="w-4 h-4" />
            Imprimir / PDF
          </button>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg transition-all hover:opacity-80"
            style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Resumo atual para impressão */}
      {resumo && (
        <div
          className="rounded-xl p-5 card-gradient"
          style={{ border: "1px solid var(--border)" }}
        >
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>Parâmetros Atuais</h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { l: "Custo Total/kg", v: formatBRL(resumo.custoTotalKg, 4) },
              { l: "Custo Fixo/kg", v: formatBRL(resumo.custoFixoKg, 4) },
              { l: "Custo MP/kg", v: formatBRL(resumo.custoMpKg, 4) },
              { l: "SIMPLES", v: formatPercent(resumo.aliquotaSimples, 1) },
              { l: "Produção Mensal", v: resumo.producaoMensal.toLocaleString("pt-BR") + " kg" },
            ].map(({ l, v }) => (
              <div key={l} className="rounded-lg p-3" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{l}</p>
                <p className="text-sm font-bold mt-0.5" style={{ color: "var(--foreground)" }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de simulações */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "var(--muted-foreground)" }} />
        </div>
      ) : !simulacoes?.length ? (
        <div
          className="rounded-xl p-12 text-center card-gradient"
          style={{ border: "1px solid var(--border)" }}
        >
          <History className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--muted-foreground)" }} />
          <p className="text-base font-medium" style={{ color: "var(--foreground)" }}>Nenhuma simulação salva</p>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Use o Simulador e clique em "Salvar" para registrar cenários aqui.
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                {["Tipo", "Data", "Preço / Margem Desejada", "Custo Total/kg", "Margem %", "Margem/kg", "Margem Mensal", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {simulacoes.map(s => {
                const isPositive = parseFloat(s.margemPercentual ?? "0") > 0;
                return (
                  <tr key={s.id} className="transition-colors" style={{ background: "var(--card)" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {s.tipo === "margem" ? (
                          <Calculator className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                        ) : (
                          <Target className="w-3.5 h-3.5" style={{ color: "oklch(0.70 0.18 155)" }} />
                        )}
                        <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                          {s.tipo === "margem" ? "Preço → Margem" : "Margem → Preço"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {new Date(s.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium tabular-nums" style={{ color: "var(--foreground)" }}>
                      {s.tipo === "margem"
                        ? formatBRL(parseFloat(s.precoVenda ?? "0"))
                        : formatPercent(parseFloat(s.margemDesejada ?? "0"))}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums" style={{ color: "var(--muted-foreground)" }}>
                      {formatBRL(parseFloat(s.custoTotalKg), 4)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-sm font-bold tabular-nums", isPositive ? "" : "")} style={{ color: isPositive ? "oklch(0.70 0.18 155)" : "oklch(0.65 0.22 25)" }}>
                        {formatPercent(parseFloat(s.margemPercentual ?? "0"))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums" style={{ color: isPositive ? "oklch(0.70 0.18 155)" : "oklch(0.65 0.22 25)" }}>
                      {formatBRL(parseFloat(s.margemUnitaria ?? "0"), 4)}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums" style={{ color: isPositive ? "oklch(0.70 0.18 155)" : "oklch(0.65 0.22 25)" }}>
                      {formatBRL(parseFloat(s.margemMensal ?? "0"), 0)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => del.mutate({ id: s.id })}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                        style={{ background: "oklch(0.65 0.22 25 / 0.12)", color: "oklch(0.65 0.22 25)" }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Estilos de impressão */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          aside, button, .no-print { display: none !important; }
          main { margin-left: 0 !important; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ccc; padding: 8px; font-size: 11px; color: black !important; background: white !important; }
          th { background: #f5f5f5 !important; font-weight: bold; }
          .card-gradient { background: white !important; border: 1px solid #ddd !important; }
          * { color: black !important; }
        }
      `}</style>
    </div>
  );
}
