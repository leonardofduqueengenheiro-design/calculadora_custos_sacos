import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatBRL } from "@/lib/format";
import { exportarComparacaoExcel, exportarComparacaoPdf } from "@/lib/exportComparacao";
import {
  Archive, ArrowRightLeft, CalendarRange, Database, Download,
  FileSpreadsheet, FileText, RefreshCw, RotateCcw, TrendingDown,
  TrendingUp, ChartNoAxesCombined,
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

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
  materia_prima: "Matéria-Prima",
};

const CORES_GRAFICO = ["#17c3b2", "#f6bd60", "#f28482", "#60a5fa", "#c084fc", "#fb7185"];

type Importacao = {
  id: number;
  nomeArquivo: string;
  origem: string;
  periodoInicio: string | null;
  periodoFim: string | null;
  mesesDetectados: string;
  numMeses: number;
  totalLinhas: number;
  linhasProcessadas: number;
  linhasIgnoradas: number;
  totalCustos: string;
  totalMateriaPrima: string;
  totalFaturamento: string;
  mediasPorCategoria: string;
  mediaMateriaPrima: string;
  mediaFaturamento: string;
  createdAt: Date | string;
};

type LinhaComparacao = {
  key: string;
  categoria: string;
  referencia: number;
  comparada: number;
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
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function periodo(importacao: Pick<Importacao, "periodoInicio" | "periodoFim" | "numMeses">) {
  if (!importacao.periodoInicio || !importacao.periodoFim) return "Período anterior não registrado";
  if (importacao.periodoInicio === importacao.periodoFim) return `${importacao.periodoInicio} · ${importacao.numMeses} mês`;
  return `${importacao.periodoInicio} a ${importacao.periodoFim} · ${importacao.numMeses} meses`;
}

function indicePeriodo(importacao: Importacao) {
  const match = importacao.periodoInicio?.match(/^(\d{2})\/(\d{4})$/);
  if (match) return Number(match[2]) * 12 + Number(match[1]) - 1;
  return new Date(importacao.createdAt).getTime() / 2_592_000_000;
}

function Delta({ value, aumentoFavoravel = false }: { value: number; aumentoFavoravel?: boolean }) {
  const positive = value > 0.005;
  const negative = value < -0.005;
  const color = positive
    ? (aumentoFavoravel ? "oklch(0.70 0.18 155)" : "oklch(0.65 0.22 25)")
    : negative
      ? (aumentoFavoravel ? "oklch(0.65 0.22 25)" : "oklch(0.70 0.18 155)")
      : "var(--muted-foreground)";
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums" style={{ color }}>
      {positive ? <TrendingUp className="h-3.5 w-3.5" /> : negative ? <TrendingDown className="h-3.5 w-3.5" /> : null}
      {value > 0 ? "+" : ""}{formatBRL(value, 2)}
    </span>
  );
}

function GraficoTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-xs shadow-lg" style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
      <p className="font-semibold">Média mensal</p>
      <p className="mt-1 tabular-nums">{formatBRL(Number(payload[0].value), 2)}</p>
    </div>
  );
}

export default function HistoricoDados() {
  const utils = trpc.useUtils();
  const { data: registros, isLoading, refetch } = trpc.importacoes.list.useQuery();
  const { data: ativa } = trpc.importacoes.ativa.useQuery();
  const [baseId, setBaseId] = useState<number | null>(null);
  const [compararId, setCompararId] = useState<number | null>(null);
  const [categoriaEvolucao, setCategoriaEvolucao] = useState("materia_prima");

  const importacoes = (registros ?? []) as Importacao[];
  const importacoesOrdenadas = useMemo(
    () => [...importacoes].sort((a, b) => indicePeriodo(a) - indicePeriodo(b)),
    [importacoes]
  );
  const restaurar = trpc.importacoes.restaurar.useMutation({
    onSuccess: async resultado => {
      await Promise.all([
        utils.importacoes.list.invalidate(),
        utils.importacoes.ativa.invalidate(),
        utils.custos.list.invalidate(),
        utils.calculo.resumo.invalidate(),
        utils.parametros.list.invalidate(),
      ]);
      toast.success(`Base restaurada: ${resultado.registro.nomeArquivo}`);
    },
    onError: error => toast.error(error.message || "Não foi possível restaurar esta base."),
  });

  useEffect(() => {
    if (!importacoesOrdenadas.length) return;
    setBaseId(atual => {
      const atualIndice = importacoesOrdenadas.findIndex(item => item.id === atual);
      return atualIndice >= 0 && atualIndice < importacoesOrdenadas.length - 1
        ? atual
        : importacoesOrdenadas[0].id;
    });
  }, [importacoesOrdenadas]);

  useEffect(() => {
    if (!importacoesOrdenadas.length || baseId === null) return;
    setCompararId(atual => {
      const indiceBase = importacoesOrdenadas.findIndex(item => item.id === baseId);
      const indiceAtual = importacoesOrdenadas.findIndex(item => item.id === atual);
      if (indiceAtual > indiceBase) return atual;
      return importacoesOrdenadas[indiceBase + 1]?.id ?? null;
    });
  }, [importacoesOrdenadas, baseId]);

  const base = useMemo(() => importacoes.find(item => item.id === baseId) ?? null, [importacoes, baseId]);
  const comparacao = useMemo(() => importacoes.find(item => item.id === compararId) ?? null, [importacoes, compararId]);
  const mediasBase = useMemo(() => base ? parseMedias(base.mediasPorCategoria) : {}, [base]);
  const mediasComparacao = useMemo(() => comparacao ? parseMedias(comparacao.mediasPorCategoria) : {}, [comparacao]);

  const categoriasDisponiveis = useMemo(() => {
    const categorias = new Set<string>(["materia_prima"]);
    importacoes.forEach(importacao => Object.keys(parseMedias(importacao.mediasPorCategoria)).forEach(categoria => categorias.add(categoria)));
    return Array.from(categorias).sort((a, b) => (CATEGORIA_LABELS[a] ?? a).localeCompare(CATEGORIA_LABELS[b] ?? b));
  }, [importacoes]);

  useEffect(() => {
    if (!categoriasDisponiveis.includes(categoriaEvolucao)) setCategoriaEvolucao(categoriasDisponiveis[0] ?? "materia_prima");
  }, [categoriaEvolucao, categoriasDisponiveis]);

  const dadosEvolucao = useMemo(() => importacoesOrdenadas.map(importacao => {
    const medias = parseMedias(importacao.mediasPorCategoria);
    return {
      periodo: importacao.periodoInicio && importacao.periodoFim && importacao.periodoInicio !== importacao.periodoFim
        ? `${importacao.periodoInicio}–${importacao.periodoFim}`
        : importacao.periodoInicio ?? formatData(importacao.createdAt).slice(0, 10),
      valor: categoriaEvolucao === "materia_prima" ? parseFloat(importacao.mediaMateriaPrima) : (medias[categoriaEvolucao] ?? 0),
    };
  }), [importacoesOrdenadas, categoriaEvolucao]);

  const linhasComparacao = useMemo<LinhaComparacao[]>(() => {
    if (!base || !comparacao) return [];
    const categorias = Array.from(new Set([...Object.keys(mediasBase), ...Object.keys(mediasComparacao)])).sort();
    return [
      { key: "materia_prima", categoria: "Matéria-Prima", referencia: parseFloat(base.mediaMateriaPrima), comparada: parseFloat(comparacao.mediaMateriaPrima) },
      ...categorias.map(categoria => ({
        key: categoria,
        categoria: CATEGORIA_LABELS[categoria] ?? categoria,
        referencia: mediasBase[categoria] ?? 0,
        comparada: mediasComparacao[categoria] ?? 0,
      })),
    ];
  }, [base, comparacao, mediasBase, mediasComparacao]);

  const resumoComparacao = useMemo(() => !base || !comparacao ? [] : [
    { indicador: "Média mensal de custos", referencia: parseFloat(base.totalCustos) / base.numMeses, comparada: parseFloat(comparacao.totalCustos) / comparacao.numMeses },
    { indicador: "Média mensal de matéria-prima", referencia: parseFloat(base.mediaMateriaPrima), comparada: parseFloat(comparacao.mediaMateriaPrima) },
    { indicador: "Média mensal de faturamento", referencia: parseFloat(base.mediaFaturamento), comparada: parseFloat(comparacao.mediaFaturamento), aumentoFavoravel: true },
  ], [base, comparacao]);

  const dadosExportacao = useMemo(() => base && comparacao ? {
    referencia: { nome: base.nomeArquivo, periodo: periodo(base) },
    comparada: { nome: comparacao.nomeArquivo, periodo: periodo(comparacao) },
    linhas: linhasComparacao.map(linha => ({ categoria: linha.categoria, referencia: linha.referencia, comparada: linha.comparada })),
    resumo: resumoComparacao,
  } : null, [base, comparacao, linhasComparacao, resumoComparacao]);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>Histórico de Dados Importados</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>Cada confirmação preserva uma fotografia das médias usadas nos cálculos. Novas importações não apagam bases anteriores.</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all hover:opacity-80" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}><RefreshCw className="h-4 w-4" />Atualizar</button>
      </div>

      {ativa && (
        <div className="flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between" style={{ background: "oklch(0.70 0.18 155 / 0.10)", border: "1px solid oklch(0.70 0.18 155 / 0.28)" }}>
          <div className="flex items-start gap-3"><Database className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "oklch(0.70 0.18 155)" }} /><div><p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Base atualmente usada nos cálculos</p><p className="mt-0.5 text-xs" style={{ color: "var(--muted-foreground)" }}>{periodo(ativa as Importacao)} · {ativa.nomeArquivo}</p></div></div>
          <span className="self-start rounded-full px-2.5 py-1 text-xs font-semibold sm:self-auto" style={{ color: "oklch(0.70 0.18 155)", background: "oklch(0.70 0.18 155 / 0.12)" }}>ATIVA</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex h-48 items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin" style={{ color: "var(--muted-foreground)" }} /></div>
      ) : !importacoes.length ? (
        <div className="rounded-xl p-12 text-center card-gradient" style={{ border: "1px solid var(--border)" }}><Archive className="mx-auto mb-3 h-10 w-10" style={{ color: "var(--muted-foreground)" }} /><p className="text-base font-medium" style={{ color: "var(--foreground)" }}>Nenhuma importação confirmada</p><p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>Ao confirmar a próxima planilha, os dados e o período serão arquivados aqui.</p></div>
      ) : (
        <>
          <section className="rounded-xl p-4 sm:p-5 card-gradient" style={{ border: "1px solid var(--border)" }}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-2"><ChartNoAxesCombined className="h-5 w-5" style={{ color: "var(--primary)" }} /><div><h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>Evolução dos custos por categoria</h2><p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Média mensal registrada em cada importação confirmada.</p></div></div>
              <label className="flex items-center gap-2 text-xs" style={{ color: "var(--muted-foreground)" }}>Categoria<select value={categoriaEvolucao} onChange={event => setCategoriaEvolucao(event.target.value)} className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}>{categoriasDisponiveis.map(categoria => <option key={categoria} value={categoria}>{CATEGORIA_LABELS[categoria] ?? categoria}</option>)}</select></label>
            </div>
            {importacoes.length < 2 ? <p className="mt-4 rounded-lg p-3 text-sm" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>Confirme mais uma importação para formar a linha de evolução.</p> : <div className="mt-5 h-64 sm:h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={dadosEvolucao} margin={{ top: 12, right: 16, left: 5, bottom: 4 }}><XAxis dataKey="periodo" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={{ stroke: "#334155" }} tickLine={false} /><YAxis tickFormatter={value => `R$ ${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={72} /><Tooltip content={<GraficoTooltip />} /><Line type="monotone" dataKey="valor" stroke={CORES_GRAFICO[0]} strokeWidth={3} dot={{ r: 4, fill: CORES_GRAFICO[0], strokeWidth: 0 }} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer></div>}
          </section>

          <section className="rounded-xl p-4 sm:p-5 card-gradient" style={{ border: "1px solid var(--border)" }}>
            <div className="mb-4 flex items-center gap-2"><ArrowRightLeft className="h-5 w-5" style={{ color: "var(--primary)" }} /><div><h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>Comparar duas importações</h2><p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Período seguinte − período inicial. Para custos, verde indica redução e vermelho indica aumento.</p></div></div>
            {importacoes.length < 2 ? <p className="rounded-lg p-3 text-sm" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>Confirme mais uma importação para habilitar a comparação lado a lado.</p> : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5"><span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Período inicial (referência)</span><select value={baseId ?? ""} onChange={event => setBaseId(Number(event.target.value))} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}>{importacoesOrdenadas.slice(0, -1).map(item => <option key={item.id} value={item.id}>{periodo(item)} — {item.nomeArquivo}</option>)}</select></label>
                  <label className="space-y-1.5"><span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Período seguinte (comparado)</span><select value={compararId ?? ""} onChange={event => setCompararId(Number(event.target.value))} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}>{importacoesOrdenadas.filter(item => indicePeriodo(item) > (base ? indicePeriodo(base) : -Infinity)).map(item => <option key={item.id} value={item.id}>{periodo(item)} — {item.nomeArquivo}</option>)}</select></label>
                </div>
                {dadosExportacao && <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => void exportarComparacaoExcel(dadosExportacao).catch(() => toast.error("Não foi possível gerar o Excel."))} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all hover:opacity-80" style={{ background: "oklch(0.70 0.18 155 / 0.12)", color: "oklch(0.75 0.18 155)", border: "1px solid oklch(0.70 0.18 155 / 0.25)" }}><FileSpreadsheet className="h-4 w-4" />Exportar Excel</button><button onClick={() => void exportarComparacaoPdf(dadosExportacao).catch(() => toast.error("Não foi possível gerar o PDF."))} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all hover:opacity-80" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}><FileText className="h-4 w-4" />Exportar PDF</button><span className="inline-flex items-center gap-1 self-center text-xs" style={{ color: "var(--muted-foreground)" }}><Download className="h-3.5 w-3.5" />Baixa a comparação selecionada</span></div>}
                {base && comparacao && <div className="mt-5 overflow-hidden rounded-lg" style={{ border: "1px solid var(--border)" }}><div className="overflow-x-auto"><table className="w-full min-w-[680px]"><thead><tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}><th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Categoria</th><th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Período inicial</th><th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Período seguinte</th><th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Variação</th></tr></thead><tbody className="divide-y" style={{ borderColor: "var(--border)" }}>{linhasComparacao.map(linha => <tr key={linha.key} style={{ background: "var(--card)" }}><td className="px-4 py-3 text-sm" style={{ color: "var(--foreground)" }}>{linha.categoria}</td><td className="px-4 py-3 text-right text-sm tabular-nums" style={{ color: "var(--muted-foreground)" }}>{formatBRL(linha.referencia, 2)}/mês</td><td className="px-4 py-3 text-right text-sm font-medium tabular-nums" style={{ color: "var(--foreground)" }}>{formatBRL(linha.comparada, 2)}/mês</td><td className="px-4 py-3 text-right"><Delta value={linha.comparada - linha.referencia} /></td></tr>)}</tbody></table></div><div className="grid grid-cols-1 gap-px border-t sm:grid-cols-3" style={{ background: "var(--border)", borderColor: "var(--border)" }}>{resumoComparacao.map(item => <div key={item.indicador} className="p-3" style={{ background: "var(--card)" }}><p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{item.indicador}</p><div className="mt-1 flex items-center justify-between gap-2"><span className="text-sm font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>{formatBRL(item.comparada, 0)}</span><Delta value={item.comparada - item.referencia} aumentoFavoravel={item.aumentoFavoravel} /></div></div>)}</div></div>}
              </>
            )}
          </section>

          <div className="space-y-4">
            {importacoes.map(importacao => {
              const medias = parseMedias(importacao.mediasPorCategoria);
              const ehAtiva = ativa?.id === importacao.id;
              const categorias = Object.entries(medias).sort(([, a], [, b]) => b - a);
              return <article key={importacao.id} className="overflow-hidden rounded-xl card-gradient" style={{ border: `1px solid ${ehAtiva ? "oklch(0.70 0.18 155 / 0.38)" : "var(--border)"}` }}><div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5" style={{ borderColor: "var(--border)" }}><div className="flex min-w-0 items-start gap-3"><FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--primary)" }} /><div className="min-w-0"><p className="truncate text-sm font-semibold" style={{ color: "var(--foreground)" }}>{importacao.nomeArquivo}</p><div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: "var(--muted-foreground)" }}><span className="inline-flex items-center gap-1"><CalendarRange className="h-3.5 w-3.5" />{periodo(importacao)}</span><span>Confirmada em {formatData(importacao.createdAt)}</span></div></div></div>{ehAtiva ? <span className="self-start rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: "oklch(0.70 0.18 155)", background: "oklch(0.70 0.18 155 / 0.12)" }}>BASE ATIVA</span> : <button disabled={restaurar.isPending} onClick={() => restaurar.mutate({ id: importacao.id })} className="flex items-center gap-2 self-start rounded-lg px-3 py-2 text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}><RotateCcw className="h-3.5 w-3.5" />Restaurar esta base</button>}</div><div className="grid grid-cols-2 gap-px sm:grid-cols-4" style={{ background: "var(--border)" }}>{[{ label: "Custos no período", value: formatBRL(parseFloat(importacao.totalCustos), 0) }, { label: "Matéria-prima no período", value: formatBRL(parseFloat(importacao.totalMateriaPrima), 0) }, { label: "Faturamento identificado", value: formatBRL(parseFloat(importacao.totalFaturamento), 0) }, { label: "Linhas processadas", value: `${importacao.linhasProcessadas.toLocaleString("pt-BR")} de ${importacao.totalLinhas.toLocaleString("pt-BR")}` }].map(item => <div key={item.label} className="p-3 sm:p-4" style={{ background: "var(--card)" }}><p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{item.label}</p><p className="mt-1 text-sm font-bold tabular-nums" style={{ color: "var(--foreground)" }}>{item.value}</p></div>)}</div><div className="p-4 sm:p-5"><p className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Médias mensais aplicadas nesta importação</p><div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">{parseFloat(importacao.mediaMateriaPrima) > 0 && <div className="flex items-center justify-between gap-3 border-b py-1.5 text-sm" style={{ borderColor: "var(--border)" }}><span style={{ color: "var(--foreground)" }}>Matéria-prima</span><span className="font-semibold tabular-nums" style={{ color: "oklch(0.72 0.18 25)" }}>{formatBRL(parseFloat(importacao.mediaMateriaPrima), 2)}/mês</span></div>}{categorias.map(([categoria, media]) => <div key={categoria} className="flex items-center justify-between gap-3 border-b py-1.5 text-sm" style={{ borderColor: "var(--border)" }}><span style={{ color: "var(--foreground)" }}>{CATEGORIA_LABELS[categoria] ?? categoria}</span><span className="font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>{formatBRL(media, 2)}/mês</span></div>)}</div>{importacao.linhasIgnoradas > 0 && <p className="mt-3 text-xs" style={{ color: "oklch(0.78 0.18 75)" }}>{importacao.linhasIgnoradas} lançamento(s) não reconhecido(s) não foram aplicados.</p>}</div></article>;
            })}
          </div>
        </>
      )}
    </div>
  );
}
