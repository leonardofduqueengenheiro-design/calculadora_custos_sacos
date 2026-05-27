import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";
import { Save, Info, Percent, Package, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";

// ─── Linha de Matéria-Prima ───────────────────────────────────────────────────
type MP = { id: number; ordem: number; nome: string; custoKg: number; percentualUso: number };

function MpRow({ mp, onSaved }: { mp: MP; onSaved: () => void }) {
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
        gridTemplateColumns: "2rem 1fr 160px 130px 44px",
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

// ─── Card do SIMPLES ─────────────────────────────────────────────────────────
function SimplesCard() {
  const { data: params, refetch } = trpc.parametros.list.useQuery();
  const setParam = trpc.parametros.set.useMutation({
    onSuccess: () => { refetch(); toast.success("Alíquota do SIMPLES atualizada!"); },
  });

  const aliquota = params ? parseFloat(params.find(p => p.chave === "aliquota_simples")?.valor ?? "11") : 11;
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(aliquota.toFixed(2));

  useEffect(() => { if (!editing) setVal(aliquota.toFixed(2)); }, [aliquota, editing]);

  const save = () => {
    const n = parseFloat(val.replace(",", "."));
    if (isNaN(n) || n < 0 || n > 50) { toast.error("Alíquota deve ser entre 0% e 50%"); return; }
    setParam.mutate({ chave: "aliquota_simples", valor: n });
    setEditing(false);
  };

  return (
    <div className="rounded-xl p-6 card-gradient" style={{ border: "1px solid var(--border)" }}>
      <div className="flex items-start gap-4 mb-5">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "oklch(0.65 0.18 240 / 0.15)", border: "1px solid oklch(0.65 0.18 240 / 0.25)" }}>
          <Percent className="w-6 h-6" style={{ color: "oklch(0.65 0.18 240)" }} />
        </div>
        <div>
          <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>Alíquota do SIMPLES Nacional</h3>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            Percentual sobre o faturamento bruto. Incide diretamente sobre o preço de venda.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          {editing ? (
            <input
              value={val}
              onChange={e => setVal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && save()}
              autoFocus
              className="w-full rounded-lg px-4 py-3 text-xl font-bold outline-none"
              style={{ background: "oklch(0.97 0.05 80)", color: "var(--foreground)", border: "2px solid oklch(0.65 0.18 240)" }}
            />
          ) : (
            <div
              className="rounded-lg px-4 py-3 cursor-pointer transition-all"
              style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
              onClick={() => setEditing(true)}
            >
              <span className="text-2xl font-bold" style={{ color: "oklch(0.72 0.18 60)" }}>{aliquota.toFixed(2)}%</span>
            </div>
          )}
        </div>
        {editing ? (
          <button
            onClick={save}
            className="px-4 py-3 rounded-lg text-sm font-medium"
            style={{ background: "oklch(0.65 0.18 140)", color: "white" }}
          >
            <Save className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-3 rounded-lg text-sm font-medium"
            style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
          >
            Editar
          </button>
        )}
      </div>

      <div className="mt-4 p-3 rounded-lg flex items-start gap-2"
        style={{ background: "oklch(0.65 0.18 240 / 0.08)", border: "1px solid oklch(0.65 0.18 240 / 0.2)" }}>
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
        <div className="grid gap-3 px-3 pb-2 text-xs font-medium" style={{ gridTemplateColumns: "2rem 1fr 160px 130px 44px", color: "var(--muted-foreground)" }}>
          <div />
          <span>Nome da Matéria-Prima</span>
          <span className="text-right pr-2">Custo (R$/kg)</span>
          <span className="text-right pr-6">% de Uso</span>
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
            Preencha o nome, custo por kg e o percentual de uso de cada matéria-prima. Matérias-primas com percentual 0% não influenciam no custo médio ponderado. Clique no ícone de salvar (verde) em cada linha após editar.
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
    </div>
  );
}
