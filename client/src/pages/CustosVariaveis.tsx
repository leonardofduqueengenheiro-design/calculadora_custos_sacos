import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";
import { Save, Info, Package, AlertTriangle, CheckCircle2, RefreshCw, History, X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

// ─── Linha de Matéria-Prima ───────────────────────────────────────────────────
type MP = { id: number; ordem: number; nome: string; custoKg: number; percentualUso: number };

function MpRow({ mp, onSaved, onVerHistorico }: { mp: MP; onSaved: () => void; onVerHistorico: (mp: MP) => void }) {
  const [nome, setNome] = useState(mp.nome);
  const [custo, setCusto] = useState(mp.custoKg.toFixed(4));
  const [pct, setPct] = useState(mp.percentualUso.toFixed(2));
  const [dirty, setDirty] = useState(false);

  const update = trpc.materiasPrimas.update.useMutation({
    onSuccess: () => { toast.success(`${nome} salvo com sucesso!`); setDirty(false); onSaved(); },
    onError: () => toast.error("Erro ao salvar matéria-prima"),
  });

  useEffect(() => {
    setNome(mp.nome);
    setCusto(mp.custoKg.toFixed(4));
    setPct(mp.percentualUso.toFixed(2));
    setDirty(false);
  }, [mp.id, mp.nome, mp.custoKg, mp.percentualUso]);

  const mark = () => setDirty(true);

  const save = () => {
    const c = parseFloat(custo.replace(",", "."));
    const p = parseFloat(pct.replace(",", "."));
    if (isNaN(c) || c < 0) { toast.error("Custo inválido"); return; }
    if (isNaN(p) || p < 0 || p > 100) { toast.error("Percentual deve ser entre 0 e 100"); return; }
    if (!nome.trim()) { toast.error("Nome é obrigatório"); return; }
    update.mutate({ id: mp.id, nome: nome.trim(), custoKg: c, percentualUso: p });
  };

  return (
    <div
      className="grid gap-3 items-center p-3 rounded-xl transition-all"
      style={{
        gridTemplateColumns: "2rem 1fr 160px 130px 44px 44px",
        background: dirty ? "oklch(0.25 0.06 140 / 0.4)" : "var(--muted)",
        border: `1px solid ${dirty ? "oklch(0.65 0.18 140 / 0.5)" : "var(--border)"}`,
      }}
    >
      {/* Número */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
      >
        {mp.ordem}
      </div>

      {/* Nome */}
      <input
        value={nome}
        onChange={e => { setNome(e.target.value); mark(); }}
        placeholder={`Matéria-Prima ${mp.ordem}`}
        className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all"
        style={{ background: "var(--input)", color: "var(--foreground)", border: "1px solid var(--border)" }}
      />

      {/* Custo por kg */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--muted-foreground)" }}>R$</span>
        <input
          value={custo}
          onChange={e => { setCusto(e.target.value); mark(); }}
          placeholder="0,0000"
          className="w-full rounded-lg py-2 text-sm font-mono outline-none transition-all"
          style={{
            background: "var(--input)",
            color: "oklch(0.72 0.18 60)",
            border: "1px solid var(--border)",
            paddingLeft: "2rem",
            paddingRight: "0.75rem",
            textAlign: "right",
          }}
        />
      </div>

      {/* Percentual */}
      <div className="relative">
        <input
          value={pct}
          onChange={e => { setPct(e.target.value); mark(); }}
          placeholder="0,00"
          className="w-full rounded-lg py-2 text-sm font-mono outline-none transition-all"
          style={{
            background: "var(--input)",
            color: "oklch(0.72 0.18 140)",
            border: "1px solid var(--border)",
            paddingLeft: "0.75rem",
            paddingRight: "2rem",
            textAlign: "right",
          }}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--muted-foreground)" }}>%</span>
      </div>

      {/* Histórico */}
      <button
        onClick={() => onVerHistorico(mp)}
        className="h-10 w-10 rounded-lg flex items-center justify-center transition-all"
        title="Ver histórico de variação de custo"
        style={{
          background: "var(--secondary)",
          color: "var(--secondary-foreground)",
          opacity: 0.8,
        }}
      >
        <History className="w-4 h-4" />
      </button>

      {/* Salvar */}
      <button
        onClick={save}
        disabled={!dirty || update.isPending}
        className="h-10 w-10 rounded-lg flex items-center justify-center transition-all"
        style={{
          background: dirty ? "oklch(0.65 0.18 140)" : "var(--secondary)",
          color: "white",
          opacity: dirty ? 1 : 0.4,
          cursor: dirty ? "pointer" : "not-allowed",
        }}
      >
        {update.isPending
          ? <RefreshCw className="w-4 h-4 animate-spin" />
          : <Save className="w-4 h-4" />
        }
      </button>
    </div>
  );
}

// ─── Modal de Histórico de Custo ─────────────────────────────────────────────
function HistoricoModal({ mp, open, onClose }: { mp: MP | null; open: boolean; onClose: () => void }) {
  const { data: historico, isLoading } = trpc.materiasPrimas.historico.useQuery(
    { materiaPrimaId: mp?.id ?? 0 },
    { enabled: open && mp != null }
  );

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 4 });
  const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

  // Dados para o gráfico — mais antigo primeiro
  const chartData = historico
    ? [...historico]
        .reverse()
        .map((h, i) => ({
          idx: i + 1,
          label: fmtDate(h.dataAlteracao),
          custo: parseFloat(h.custoNovo),
          custoAnterior: parseFloat(h.custoAnterior),
        }))
    : [];

  // Adicionar o custo atual como último ponto
  if (mp && chartData.length > 0) {
    // já está incluído como custoNovo do último registro
  }

  const variacao = historico && historico.length > 0
    ? parseFloat(historico[0].custoNovo) - parseFloat(historico[0].custoAnterior)
    : null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Histórico de Custo — {mp?.nome}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && (!historico || historico.length === 0) && (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
            <History className="h-8 w-8 opacity-30" />
            <p className="text-sm">Nenhuma alteração registrada ainda.</p>
            <p className="text-xs">O histórico é registrado automaticamente ao salvar um novo custo.</p>
          </div>
        )}

        {!isLoading && historico && historico.length > 0 && (
          <div className="space-y-4">
            {/* KPI de última variação */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
              <div>
                <p className="text-xs text-muted-foreground">Última alteração</p>
                <p className="text-sm font-medium">{fmtDate(historico[0].dataAlteracao)}</p>
              </div>
              <div className="ml-auto flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Anterior</p>
                  <p className="text-sm font-mono text-red-400">{fmt(parseFloat(historico[0].custoAnterior))}/kg</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Novo</p>
                  <p className="text-sm font-mono text-emerald-400">{fmt(parseFloat(historico[0].custoNovo))}/kg</p>
                </div>
                {variacao !== null && (
                  <div className="flex items-center gap-1">
                    {variacao > 0
                      ? <TrendingUp className="h-4 w-4 text-red-400" />
                      : variacao < 0
                      ? <TrendingDown className="h-4 w-4 text-emerald-400" />
                      : <Minus className="h-4 w-4 text-muted-foreground" />
                    }
                    <span className={`text-sm font-mono font-bold ${variacao > 0 ? "text-red-400" : variacao < 0 ? "text-emerald-400" : "text-muted-foreground"}`}>
                      {variacao > 0 ? "+" : ""}{fmt(variacao)}/kg
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Gráfico de evolução */}
            {chartData.length >= 2 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Evolução do custo (R$/kg)</p>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="idx" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      tickFormatter={v => `R$${v.toFixed(2)}`}
                      width={60}
                    />
                    <Tooltip
                      formatter={(v: number) => [fmt(v), "Custo"]}
                      labelFormatter={(l) => chartData[l - 1]?.label ?? ""}
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="custo"
                      stroke="oklch(0.72 0.18 60)"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "oklch(0.72 0.18 60)" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Tabela de histórico */}
            <div className="space-y-1 max-h-48 overflow-y-auto">
              <p className="text-xs text-muted-foreground mb-2">Registro completo ({historico.length} alteração{historico.length !== 1 ? "ões" : ""})</p>
              {historico.map((h, i) => {
                const delta = parseFloat(h.custoNovo) - parseFloat(h.custoAnterior);
                return (
                  <div key={h.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30 text-xs">
                    <span className="text-muted-foreground">{fmtDate(h.dataAlteracao)}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-muted-foreground line-through">{fmt(parseFloat(h.custoAnterior))}</span>
                      <span className="font-mono text-foreground font-medium">{fmt(parseFloat(h.custoNovo))}</span>
                      <Badge
                        variant={delta > 0 ? "destructive" : delta < 0 ? "default" : "secondary"}
                        className="text-xs font-mono"
                      >
                        {delta > 0 ? "+" : ""}{fmt(delta)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Card do SIMPLES ─────────────────────────────────────────────────────────
function SimplesCard() {
  const { data: params, refetch } = trpc.parametros.list.useQuery();
  const setParam = trpc.parametros.set.useMutation({
    onSuccess: () => { refetch(); toast.success("Alíquota do SIMPLES atualizada!"); },
  });

  const aliquota = params ? parseFloat(params.find(p => p.chave === "aliquota_simples")?.valor ?? "11") : 11;
  const [val, setVal] = useState(aliquota.toFixed(2));
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setVal(aliquota.toFixed(2)); setDirty(false); }, [aliquota]);

  const save = () => {
    const v = parseFloat(val.replace(",", "."));
    if (isNaN(v) || v < 0 || v > 100) { toast.error("Alíquota deve ser entre 0 e 100"); return; }
    setParam.mutate({ chave: "aliquota_simples", valor: v });
    setDirty(false);
  };

  return (
    <div className="rounded-xl p-6 card-gradient" style={{ border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "oklch(0.72 0.18 240 / 0.15)", border: "1px solid oklch(0.72 0.18 240 / 0.25)" }}>
          <Info className="w-5 h-5" style={{ color: "oklch(0.65 0.18 240)" }} />
        </div>
        <div>
          <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>Simples Nacional</h2>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Alíquota aplicada sobre o preço de venda</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-[180px]">
          <input
            value={val}
            onChange={e => { setVal(e.target.value); setDirty(true); }}
            placeholder="11,00"
            className="w-full rounded-lg py-2 text-sm font-mono outline-none transition-all"
            style={{
              background: "var(--input)",
              color: "oklch(0.72 0.18 240)",
              border: `1px solid ${dirty ? "oklch(0.65 0.18 240 / 0.5)" : "var(--border)"}`,
              paddingLeft: "0.75rem",
              paddingRight: "2rem",
              textAlign: "right",
            }}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--muted-foreground)" }}>%</span>
        </div>
        <button
          onClick={save}
          disabled={!dirty || setParam.isPending}
          className="h-10 w-10 rounded-lg flex items-center justify-center transition-all"
          style={{
            background: dirty ? "oklch(0.65 0.18 140)" : "var(--secondary)",
            color: "white",
            opacity: dirty ? 1 : 0.4,
            cursor: dirty ? "pointer" : "not-allowed",
          }}
        >
          {setParam.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        </button>
      </div>

      <div className="mt-3 flex items-start gap-2 p-3 rounded-lg text-xs"
        style={{ background: "var(--muted)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "oklch(0.65 0.18 240)" }} />
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Fórmula aplicada: <code className="px-1 rounded" style={{ background: "var(--muted)" }}>Margem = Preço − (Preço × {aliquota.toFixed(1)}%) − Custo Total</code>
        </p>
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function CustosVariaveis() {
  const { data: mps, refetch: refetchMps } = trpc.materiasPrimas.list.useQuery();
  const { data: ponderado, refetch: refetchPonderado } = trpc.materiasPrimas.custoMedioPonderado.useQuery();
  const { data: params } = trpc.parametros.list.useQuery();

  const [historicoMp, setHistoricoMp] = useState<MP | null>(null);

  const totalPct = ponderado?.totalPercentual ?? 0;
  const custoMedio = ponderado?.custo ?? 0;
  const pctOk = Math.abs(totalPct - 100) < 0.01;
  const producaoMensal = params ? parseFloat(params.find(p => p.chave === "producao_mensal_kg")?.valor ?? "31498") : 31498;
  const aliquotaSimples = params ? parseFloat(params.find(p => p.chave === "aliquota_simples")?.valor ?? "11") : 11;
  const precoVenda = 24;

  const onSaved = () => { refetchMps(); refetchPonderado(); };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>Custos Variáveis</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          Configure as matérias-primas com seus custos e percentuais de uso. O custo médio ponderado é calculado automaticamente.
        </p>
      </div>

      {/* Matérias-Primas */}
      <div className="rounded-xl p-6 card-gradient" style={{ border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "oklch(0.72 0.18 60 / 0.15)", border: "1px solid oklch(0.72 0.18 60 / 0.25)" }}>
              <Package className="w-5 h-5" style={{ color: "oklch(0.72 0.18 60)" }} />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>Matérias-Primas</h2>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Até 5 tipos — defina nome, custo por kg e percentual de uso</p>
            </div>
          </div>

          {/* Indicador de percentual total */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: pctOk ? "oklch(0.65 0.18 140 / 0.15)" : "oklch(0.65 0.18 25 / 0.15)",
              color: pctOk ? "oklch(0.65 0.18 140)" : "oklch(0.65 0.18 25)",
              border: `1px solid ${pctOk ? "oklch(0.65 0.18 140 / 0.3)" : "oklch(0.65 0.18 25 / 0.3)"}`,
            }}
          >
            {pctOk
              ? <><CheckCircle2 className="w-3.5 h-3.5" /> Total: 100%</>
              : <><AlertTriangle className="w-3.5 h-3.5" /> Total: {totalPct.toFixed(1)}%</>
            }
          </div>
        </div>

        {/* Cabeçalho das colunas */}
        <div className="grid gap-3 px-3 pb-2 text-xs font-medium" style={{ gridTemplateColumns: "2rem 1fr 160px 130px 44px 44px", color: "var(--muted-foreground)" }}>
          <div />
          <span>Nome da Matéria-Prima</span>
          <span className="text-right pr-2">Custo (R$/kg)</span>
          <span className="text-right pr-6">% de Uso</span>
          <span className="text-center">Hist.</span>
          <div />
        </div>

        {/* Linhas de MP */}
        <div className="space-y-2">
          {mps
            ? mps.map(mp => (
                <MpRow
                  key={mp.id}
                  mp={{ id: mp.id, ordem: mp.ordem, nome: mp.nome, custoKg: parseFloat(mp.custoKg), percentualUso: parseFloat(mp.percentualUso) }}
                  onSaved={onSaved}
                  onVerHistorico={setHistoricoMp}
                />
              ))
            : Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: "var(--muted)" }} />
              ))
          }
        </div>

        {/* Custo médio ponderado */}
        <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between rounded-xl p-4" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
            <div>
              <p className="text-xs uppercase tracking-wider font-medium" style={{ color: "var(--muted-foreground)" }}>Custo Médio Ponderado</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                Calculado automaticamente com base nos percentuais acima
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold" style={{ color: "oklch(0.72 0.18 60)" }}>
                {formatBRL(custoMedio, 4)}
              </p>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>por kg</p>
            </div>
          </div>
        </div>

        {/* Aviso se percentual != 100 */}
        {!pctOk && totalPct > 0 && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg text-xs"
            style={{ background: "oklch(0.65 0.18 25 / 0.1)", border: "1px solid oklch(0.65 0.18 25 / 0.3)", color: "oklch(0.65 0.18 25)" }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              A soma dos percentuais é <strong>{totalPct.toFixed(2)}%</strong>. Para um cálculo correto, o total deve ser exatamente <strong>100%</strong>. Ajuste os percentuais antes de usar o simulador.
            </span>
          </div>
        )}

        {/* Instrução */}
        <div className="mt-3 flex items-start gap-2 p-3 rounded-lg text-xs"
          style={{ background: "var(--muted)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--primary)" }} />
          <span>
            Preencha o nome, custo por kg e o percentual de uso de cada matéria-prima. Clique em <History className="inline w-3 h-3" /> para ver o histórico de variação de custo de cada MP. Clique no ícone de salvar (verde) após editar.
          </span>
        </div>
      </div>

      {/* SIMPLES */}
      <SimplesCard />

      {/* Impacto resumido */}
      <div className="rounded-xl p-6 card-gradient" style={{ border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-5">
          <Info className="w-4 h-4" style={{ color: "var(--primary)" }} />
          <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>Impacto no Custo por kg</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Custo MP Ponderado", valor: formatBRL(custoMedio, 4), desc: "Custo variável direto" },
            { label: `SIMPLES sobre R$${precoVenda}`, valor: formatBRL(precoVenda * aliquotaSimples / 100, 4), desc: `${aliquotaSimples}% do preço de venda` },
            { label: "Custo MP Mensal", valor: formatBRL(custoMedio * producaoMensal, 0), desc: `${producaoMensal.toLocaleString("pt-BR")} kg/mês` },
            { label: "SIMPLES Mensal Est.", valor: formatBRL(precoVenda * aliquotaSimples / 100 * producaoMensal, 0), desc: `Ao preço de R$${precoVenda}/kg` },
          ].map(({ label, valor, desc }) => (
            <div key={label} className="rounded-lg p-4" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>{label}</p>
              <p className="text-lg font-bold" style={{ color: "var(--foreground)" }}>{valor}</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Histórico */}
      <HistoricoModal
        mp={historicoMp}
        open={historicoMp !== null}
        onClose={() => setHistoricoMp(null)}
      />
    </div>
  );
}
