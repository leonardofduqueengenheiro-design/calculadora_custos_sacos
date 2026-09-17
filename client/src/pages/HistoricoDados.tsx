import { trpc } from "@/lib/trpc";
import { formatBRL } from "@/lib/format";
import { Archive, CalendarRange, Database, FileSpreadsheet, RefreshCw } from "lucide-react";

const CATEGORIA_LABELS: Record<string, string> = {
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

function parseMedias(value: string): Record<string, number> {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter(([, media]) => typeof media === "number" && Number.isFinite(media)) as Array<[string, number]>
    );
  } catch {
    return {};
  }
}

function formatData(value: Date | string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function periodo(importacao: { periodoInicio: string | null; periodoFim: string | null; numMeses: number }) {
  if (!importacao.periodoInicio || !importacao.periodoFim) return "Período anterior não registrado";
  if (importacao.periodoInicio === importacao.periodoFim) return `${importacao.periodoInicio} · ${importacao.numMeses} mês`;
  return `${importacao.periodoInicio} a ${importacao.periodoFim} · ${importacao.numMeses} meses`;
}

export default function HistoricoDados() {
  const { data: importacoes, isLoading, refetch } = trpc.importacoes.list.useQuery();
  const { data: ativa } = trpc.importacoes.ativa.useQuery();

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
            Histórico de Dados Importados
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Cada confirmação preserva uma fotografia das médias usadas nos cálculos. Novas importações não substituem os registros anteriores.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all hover:opacity-80"
          style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {ativa && (
        <div
          className="flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ background: "oklch(0.70 0.18 155 / 0.10)", border: "1px solid oklch(0.70 0.18 155 / 0.28)" }}
        >
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "oklch(0.70 0.18 155)" }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Base atualmente usada nos cálculos</p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
                {periodo(ativa)} · {ativa.nomeArquivo}
              </p>
            </div>
          </div>
          <span className="self-start rounded-full px-2.5 py-1 text-xs font-semibold sm:self-auto" style={{ color: "oklch(0.70 0.18 155)", background: "oklch(0.70 0.18 155 / 0.12)" }}>
            ATIVA
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin" style={{ color: "var(--muted-foreground)" }} />
        </div>
      ) : !importacoes?.length ? (
        <div className="rounded-xl p-12 text-center card-gradient" style={{ border: "1px solid var(--border)" }}>
          <Archive className="mx-auto mb-3 h-10 w-10" style={{ color: "var(--muted-foreground)" }} />
          <p className="text-base font-medium" style={{ color: "var(--foreground)" }}>Nenhuma importação confirmada</p>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>Ao confirmar a próxima planilha, os dados e o período serão arquivados aqui.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {importacoes.map((importacao) => {
            const medias = parseMedias(importacao.mediasPorCategoria);
            const ehAtiva = ativa?.id === importacao.id;
            const categorias = Object.entries(medias).sort(([, a], [, b]) => b - a);

            return (
              <article
                key={importacao.id}
                className="overflow-hidden rounded-xl card-gradient"
                style={{ border: `1px solid ${ehAtiva ? "oklch(0.70 0.18 155 / 0.38)" : "var(--border)"}` }}
              >
                <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5" style={{ borderColor: "var(--border)" }}>
                  <div className="flex min-w-0 items-start gap-3">
                    <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--primary)" }} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold" style={{ color: "var(--foreground)" }}>{importacao.nomeArquivo}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
                        <span className="inline-flex items-center gap-1"><CalendarRange className="h-3.5 w-3.5" />{periodo(importacao)}</span>
                        <span>Confirmada em {formatData(importacao.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  {ehAtiva && <span className="self-start rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: "oklch(0.70 0.18 155)", background: "oklch(0.70 0.18 155 / 0.12)" }}>BASE ATIVA</span>}
                </div>

                <div className="grid grid-cols-2 gap-px sm:grid-cols-4" style={{ background: "var(--border)" }}>
                  {[
                    { label: "Custos no período", value: formatBRL(parseFloat(importacao.totalCustos), 0) },
                    { label: "Matéria-prima no período", value: formatBRL(parseFloat(importacao.totalMateriaPrima), 0) },
                    { label: "Faturamento identificado", value: formatBRL(parseFloat(importacao.totalFaturamento), 0) },
                    { label: "Linhas processadas", value: `${importacao.linhasProcessadas.toLocaleString("pt-BR")} de ${importacao.totalLinhas.toLocaleString("pt-BR")}` },
                  ].map((item) => (
                    <div key={item.label} className="p-3 sm:p-4" style={{ background: "var(--card)" }}>
                      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{item.label}</p>
                      <p className="mt-1 text-sm font-bold tabular-nums" style={{ color: "var(--foreground)" }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="p-4 sm:p-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Médias mensais aplicadas nesta importação</p>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                    {importacao.mediaMateriaPrima && parseFloat(importacao.mediaMateriaPrima) > 0 && (
                      <div className="flex items-center justify-between gap-3 border-b py-1.5 text-sm" style={{ borderColor: "var(--border)" }}>
                        <span style={{ color: "var(--foreground)" }}>Matéria-prima</span>
                        <span className="font-semibold tabular-nums" style={{ color: "oklch(0.72 0.18 25)" }}>{formatBRL(parseFloat(importacao.mediaMateriaPrima), 2)}/mês</span>
                      </div>
                    )}
                    {categorias.map(([categoria, media]) => (
                      <div key={categoria} className="flex items-center justify-between gap-3 border-b py-1.5 text-sm" style={{ borderColor: "var(--border)" }}>
                        <span style={{ color: "var(--foreground)" }}>{CATEGORIA_LABELS[categoria] ?? categoria}</span>
                        <span className="font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>{formatBRL(media, 2)}/mês</span>
                      </div>
                    ))}
                  </div>
                  {importacao.linhasIgnoradas > 0 && (
                    <p className="mt-3 text-xs" style={{ color: "oklch(0.78 0.18 75)" }}>{importacao.linhasIgnoradas} lançamento(s) não reconhecido(s) não foram aplicados.</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
