import { useState, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Download,
  RefreshCw, ChevronRight, X, Tags, CircleAlert, BookmarkPlus, Trash2,
} from "lucide-react";
import { formatBRL } from "@/lib/format";
import { trpc } from "@/lib/trpc";

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
  faturamento: "Faturamento / Receita",
};

const DESTINOS_RECLASSIFICACAO = [
  { value: "manter_ignorado", label: "Manter ignorado" },
  { value: "materia_prima", label: "Matéria-Prima" },
  { value: "faturamento", label: "Faturamento / Receita" },
  { value: "folha_pagamento", label: "Folha de Pagamento" },
  { value: "impostos_folha", label: "Impostos sobre Folha" },
  { value: "energia", label: "Energia Elétrica" },
  { value: "combustivel", label: "Combustível" },
  { value: "transporte_frete", label: "Transporte / Frete" },
  { value: "manutencao", label: "Manutenção e Peças" },
  { value: "servicos", label: "Serviços" },
  { value: "comissoes", label: "Comissões" },
  { value: "diversos", label: "Diversos" },
] as const;

type DestinoReclassificacao = typeof DESTINOS_RECLASSIFICACAO[number]["value"];

interface ItemIgnorado {
  id: string;
  tipo: string;
  fornecedor: string;
  valor: number;
}

interface PreviewData {
  numMeses: number;
  mesesDetectados: string[];
  totalLinhas: number;
  linhasProcessadas: number;
  linhasIgnoradas: string[];
  itensIgnorados: ItemIgnorado[];
  linhasClassificadasPorRegras: number;
  mediasPorCategoria: Record<string, number>;
  mediaMateriaPrima: number;
  mediaFaturamento: number;
  totalFaturamento: number;
  totalMateriaPrima: number;
  totalCustos: number;
}

type HistoricoResumo = {
  id: number;
  periodoInicio: string | null;
  periodoFim: string | null;
  nomeArquivo: string;
};

type Step = "upload" | "preview" | "success";

function indiceMes(periodo: string | null | undefined) {
  const match = periodo?.match(/^(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const mes = Number(match[1]);
  const ano = Number(match[2]);
  return mes >= 1 && mes <= 12 ? ano * 12 + mes - 1 : null;
}

function existeSobreposicao(inicioA: string | null, fimA: string | null, inicioB: string | null, fimB: string | null) {
  const aInicio = indiceMes(inicioA);
  const aFim = indiceMes(fimA);
  const bInicio = indiceMes(inicioB);
  const bFim = indiceMes(fimB);
  return aInicio !== null && aFim !== null && bInicio !== null && bFim !== null && aInicio <= bFim && bInicio <= aFim;
}

function intervaloDaPrevia(preview: PreviewData) {
  return {
    inicio: preview.mesesDetectados[0] ?? null,
    fim: preview.mesesDetectados[preview.mesesDetectados.length - 1] ?? null,
  };
}

function aplicarReclassificacoes(preview: PreviewData, classificacoes: Record<string, DestinoReclassificacao>): PreviewData {
  const resultado: PreviewData = {
    ...preview,
    linhasIgnoradas: [...preview.linhasIgnoradas],
    itensIgnorados: [...preview.itensIgnorados],
    mediasPorCategoria: { ...preview.mediasPorCategoria },
  };

  for (const item of preview.itensIgnorados) {
    const destino = classificacoes[item.id] ?? "manter_ignorado";
    if (destino === "manter_ignorado") continue;

    resultado.linhasProcessadas += 1;
    if (destino === "materia_prima") {
      resultado.totalMateriaPrima += item.valor;
      resultado.mediaMateriaPrima = resultado.totalMateriaPrima / resultado.numMeses;
    } else if (destino === "faturamento") {
      resultado.totalFaturamento += item.valor;
      resultado.mediaFaturamento = resultado.totalFaturamento / resultado.numMeses;
    } else {
      resultado.totalCustos += item.valor;
      resultado.mediasPorCategoria[destino] = (resultado.mediasPorCategoria[destino] ?? 0) + item.valor / resultado.numMeses;
    }
    resultado.itensIgnorados = resultado.itensIgnorados.filter(ignorado => ignorado.id !== item.id);
  }

  resultado.linhasIgnoradas = resultado.itensIgnorados
    .map(item => `${item.tipo} (${item.fornecedor}) — R$ ${item.valor.toFixed(2)}`);
  return resultado;
}

export default function Importar() {
  const [step, setStep] = useState<Step>("upload");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [fileName, setFileName] = useState("");
  const [classificacoes, setClassificacoes] = useState<Record<string, DestinoReclassificacao>>({});
  const [salvarComoRegra, setSalvarComoRegra] = useState<Record<string, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const { data: importacoes } = trpc.importacoes.list.useQuery();
  const { data: regras } = trpc.importacoes.regras.useQuery();
  const salvarRegra = trpc.importacoes.salvarRegra.useMutation();
  const desativarRegra = trpc.importacoes.desativarRegra.useMutation({
    onSuccess: () => {
      utils.importacoes.regras.invalidate();
      toast.success("Regra removida.");
    },
    onError: error => toast.error(error.message || "Não foi possível remover a regra."),
  });

  const previewRevisada = useMemo(
    () => preview ? aplicarReclassificacoes(preview, classificacoes) : null,
    [preview, classificacoes]
  );

  const periodosSobrepostos = useMemo(() => {
    if (!previewRevisada || !importacoes) return [];
    const intervalo = intervaloDaPrevia(previewRevisada);
    return (importacoes as HistoricoResumo[]).filter(importacao =>
      existeSobreposicao(intervalo.inicio, intervalo.fim, importacao.periodoInicio, importacao.periodoFim)
    );
  }, [previewRevisada, importacoes]);

  const processFile = async (file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Formato inválido. Envie um arquivo .xlsx ou .xls");
      return;
    }
    setFileName(file.name);
    setClassificacoes({});
    setSalvarComoRegra({});
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const resp = await fetch("/api/upload/planilha", { method: "POST", body: formData });
      const data = await resp.json();
      if (!resp.ok || data.error) throw new Error(data.error || "Erro ao processar");
      setPreview(data.preview as PreviewData);
      setStep("preview");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar a planilha");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleConfirmar = async () => {
    if (!previewRevisada) return;
    setLoading(true);
    try {
      const regrasSelecionadas = preview?.itensIgnorados.filter(item =>
        salvarComoRegra[item.id] && (classificacoes[item.id] ?? "manter_ignorado") !== "manter_ignorado"
      ) ?? [];
      const regrasPorTipo = new Map<string, { tipoExibicao: string; destino: Exclude<DestinoReclassificacao, "manter_ignorado"> }>();
      for (const item of regrasSelecionadas) {
        const destino = classificacoes[item.id];
        if (destino && destino !== "manter_ignorado") {
          regrasPorTipo.set(item.tipo.trim().toLocaleLowerCase("pt-BR"), { tipoExibicao: item.tipo, destino });
        }
      }
      await Promise.all(Array.from(regrasPorTipo.values()).map(regra => salvarRegra.mutateAsync(regra)));
      const resp = await fetch("/api/upload/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeArquivo: fileName,
          mesesDetectados: previewRevisada.mesesDetectados,
          numMeses: previewRevisada.numMeses,
          totalLinhas: previewRevisada.totalLinhas,
          linhasProcessadas: previewRevisada.linhasProcessadas,
          linhasIgnoradas: previewRevisada.itensIgnorados.length,
          totalCustos: previewRevisada.totalCustos,
          totalMateriaPrima: previewRevisada.totalMateriaPrima,
          totalFaturamento: previewRevisada.totalFaturamento,
          mediasPorCategoria: previewRevisada.mediasPorCategoria,
          mediaMateriaPrima: previewRevisada.mediaMateriaPrima,
          mediaFaturamento: previewRevisada.mediaFaturamento,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || data.error) throw new Error(data.error || "Erro ao salvar");
      await Promise.all([
        utils.custos.list.invalidate(),
        utils.calculo.resumo.invalidate(),
        utils.parametros.list.invalidate(),
        utils.importacoes.list.invalidate(),
        utils.importacoes.ativa.invalidate(),
        utils.importacoes.regras.invalidate(),
      ]);
      setStep("success");
      toast.success("Dados importados, período registrado e histórico preservado!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao confirmar importação");
    } finally {
      setLoading(false);
    }
  };

  const resetar = () => {
    setStep("upload");
    setPreview(null);
    setClassificacoes({});
    setSalvarComoRegra({});
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const intervalo = previewRevisada ? intervaloDaPrevia(previewRevisada) : null;
  const itensReclassificados = Object.values(classificacoes).filter(destino => destino !== "manter_ignorado").length;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>Importar Planilha</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Envie a planilha de controle, revise os itens e confirme para atualizar as médias da calculadora.
          </p>
        </div>
        <a
          href="/manus-storage/MODELO_CONTROLE_FINANCEIRO_LUKPLAST_V2_79d1c97b.xlsx"
          download="MODELO_CONTROLE_FINANCEIRO_LUKPLAST.xlsx"
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all hover:opacity-80"
          style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}
        >
          <Download className="h-4 w-4" /> Baixar Modelo
        </a>
      </div>

      <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
        {[{ key: "upload", label: "1. Upload" }, { key: "preview", label: "2. Revisar" }, { key: "success", label: "3. Concluído" }].map((item, index) => (
          <div key={item.key} className="flex items-center gap-2">
            {index > 0 && <ChevronRight className="h-3 w-3" />}
            <span className="font-medium" style={{ color: step === item.key ? "var(--primary)" : step === "success" && item.key !== "success" ? "oklch(0.70 0.18 155)" : "var(--muted-foreground)" }}>{item.label}</span>
          </div>
        ))}
      </div>

      {step === "upload" && (
        <div className="space-y-4">
          <div
            onDragOver={event => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer rounded-xl p-6 text-center transition-all sm:p-12"
            style={{ border: `2px dashed ${dragging ? "var(--primary)" : "var(--border)"}`, background: dragging ? "var(--primary)/5" : "var(--card)" }}
          >
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
            {loading ? (
              <div className="flex flex-col items-center gap-3"><RefreshCw className="h-10 w-10 animate-spin" style={{ color: "var(--primary)" }} /><p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Processando planilha...</p></div>
            ) : (
              <div className="flex flex-col items-center gap-3"><div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "var(--primary)/10" }}><Upload className="h-8 w-8" style={{ color: "var(--primary)" }} /></div><div><p className="text-base font-semibold" style={{ color: "var(--foreground)" }}>Arraste sua planilha aqui</p><p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>ou clique para selecionar o arquivo (.xlsx ou .xls)</p></div></div>
            )}
          </div>

          <div className="rounded-xl p-5" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
            <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--foreground)" }}>Como funciona a importação</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                { n: "1", t: "Preencha os campos essenciais", d: "Informe Vencimento, Valor, Fornecedor/Descrição e Tipo." },
                { n: "2", t: "Faça o upload", d: "O sistema identifica o período e separa os lançamentos automaticamente." },
                { n: "3", t: "Revise antes de confirmar", d: "Reclassifique itens ignorados e verifique aviso de sobreposição de períodos." },
              ].map(item => <div key={item.n} className="flex gap-3"><div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--primary)", color: "white" }}>{item.n}</div><div><p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>{item.t}</p><p className="mt-0.5 text-xs" style={{ color: "var(--muted-foreground)" }}>{item.d}</p></div></div>)}
            </div>
          </div>
          {regras && regras.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="mb-3 flex items-center gap-2"><BookmarkPlus className="h-4 w-4" style={{ color: "var(--primary)" }} /><h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Regras de classificação salvas</h3></div>
              <div className="flex flex-wrap gap-2">{regras.map(regra => <span key={regra.id} className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs" style={{ background: "var(--muted)", color: "var(--foreground)", border: "1px solid var(--border)" }}><span><strong>{regra.tipoExibicao}</strong> → {CATEGORIA_LABELS[regra.destino] ?? regra.destino}</span><button onClick={() => desativarRegra.mutate({ id: regra.id })} disabled={desativarRegra.isPending} className="rounded p-0.5 hover:opacity-70" title="Remover regra" aria-label={`Remover regra ${regra.tipoExibicao}`}><Trash2 className="h-3 w-3" /></button></span>)}</div>
            </div>
          )}
        </div>
      )}

      {step === "preview" && previewRevisada && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3 rounded-xl p-4 sm:items-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex min-w-0 items-center gap-3"><FileSpreadsheet className="h-8 w-8 shrink-0" style={{ color: "oklch(0.70 0.18 155)" }} /><div className="min-w-0"><p className="truncate text-sm font-semibold" style={{ color: "var(--foreground)" }}>{fileName}</p><p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{previewRevisada.totalLinhas} linhas lidas · {previewRevisada.linhasProcessadas} processadas · {previewRevisada.numMeses} mês(es) detectado(s)</p></div></div>
            <button onClick={resetar} className="rounded-lg p-1.5 hover:opacity-70" style={{ color: "var(--muted-foreground)" }} aria-label="Remover arquivo"><X className="h-4 w-4" /></button>
          </div>

          {preview && preview.linhasClassificadasPorRegras > 0 && (
            <div className="flex items-start gap-2 rounded-xl p-4" style={{ background: "oklch(0.70 0.18 155 / 0.09)", border: "1px solid oklch(0.70 0.18 155 / 0.28)" }}>
              <BookmarkPlus className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "oklch(0.70 0.18 155)" }} />
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}><strong style={{ color: "var(--foreground)" }}>{preview.linhasClassificadasPorRegras} lançamento(s)</strong> foram classificados automaticamente por regras salvas anteriormente.</p>
            </div>
          )}

          {intervalo?.inicio && intervalo?.fim && (
            <div className="rounded-xl p-4" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
              <p className="mb-2 text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>PERÍODO DETECTADO</p>
              <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{intervalo.inicio} a {intervalo.fim} · {previewRevisada.numMeses} mês(es)</p>
              <div className="mt-3 flex flex-wrap gap-2">{previewRevisada.mesesDetectados.map(mes => <span key={mes} className="rounded-md px-2 py-1 text-xs font-medium" style={{ background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)" }}>{mes}</span>)}</div>
            </div>
          )}

          {periodosSobrepostos.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: "oklch(0.78 0.18 75 / 0.10)", border: "1px solid oklch(0.78 0.18 75 / 0.35)" }}>
              <div className="flex gap-2"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "oklch(0.78 0.18 75)" }} /><div><p className="text-sm font-semibold" style={{ color: "oklch(0.85 0.16 85)" }}>Há período sobreposto no histórico</p><p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>Esta planilha cobre meses já arquivados em: {periodosSobrepostos.map(item => `${item.periodoInicio}–${item.periodoFim}`).join(", ")}. Confirme apenas se esta é uma versão atualizada do mesmo período.</p></div></div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            {[
              { label: "Total Custos", value: formatBRL(previewRevisada.totalCustos, 0), color: "oklch(0.65 0.22 25)" },
              { label: "Total Matéria-Prima", value: formatBRL(previewRevisada.totalMateriaPrima, 0), color: "oklch(0.65 0.18 50)" },
              { label: "Total Faturamento", value: formatBRL(previewRevisada.totalFaturamento, 0), color: "oklch(0.70 0.18 155)" },
              { label: "Média Mensal (custos)", value: formatBRL(previewRevisada.totalCustos / previewRevisada.numMeses, 0), color: "var(--primary)" },
            ].map(item => <div key={item.label} className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}><p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{item.label}</p><p className="mt-1 text-lg font-bold" style={{ color: item.color }}>{item.value}</p></div>)}
          </div>

          <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)" }}>
            <div className="px-4 py-3" style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Médias Mensais por Categoria (serão aplicadas na calculadora)</p></div>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {previewRevisada.mediaMateriaPrima > 0 && <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--card)" }}><span className="text-sm" style={{ color: "var(--foreground)" }}>Matéria-Prima (total mensal)</span><span className="text-sm font-bold tabular-nums" style={{ color: "oklch(0.65 0.18 50)" }}>{formatBRL(previewRevisada.mediaMateriaPrima, 2)}/mês</span></div>}
              {Object.entries(previewRevisada.mediasPorCategoria).sort(([a], [b]) => a.localeCompare(b)).map(([categoria, media]) => <div key={categoria} className="flex items-center justify-between px-4 py-3" style={{ background: "var(--card)" }}><span className="text-sm" style={{ color: "var(--foreground)" }}>{CATEGORIA_LABELS[categoria] || categoria}</span><span className="text-sm font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>{formatBRL(media, 2)}/mês</span></div>)}
            </div>
          </div>

          {preview && preview.itensIgnorados.length > 0 && (
            <div className="overflow-hidden rounded-xl" style={{ background: "oklch(0.78 0.18 75 / 0.06)", border: "1px solid oklch(0.78 0.18 75 / 0.3)" }}>
              <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "oklch(0.78 0.18 75 / 0.25)" }}>
                <div className="flex items-center gap-2"><Tags className="h-4 w-4" style={{ color: "oklch(0.78 0.18 75)" }} /><p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Revisar lançamentos não reconhecidos</p></div>
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{itensReclassificados} reclassificado(s) · {previewRevisada.itensIgnorados.length} continuará(ão) ignorado(s)</span>
              </div>
              <div className="max-h-96 overflow-auto">
                <table className="w-full min-w-[820px] text-left">
                  <thead style={{ background: "var(--muted)" }}><tr>{["Tipo original", "Fornecedor", "Valor", "Aplicar como", "Usar nas próximas"].map(cabecalho => <th key={cabecalho} className="px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>{cabecalho}</th>)}</tr></thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                    {preview.itensIgnorados.map(item => {
                      const destino = classificacoes[item.id] ?? "manter_ignorado";
                      return <tr key={item.id} style={{ background: "var(--card)" }}><td className="max-w-64 truncate px-4 py-2.5 text-sm" style={{ color: "var(--foreground)" }}>{item.tipo}</td><td className="max-w-56 truncate px-4 py-2.5 text-xs" style={{ color: "var(--muted-foreground)" }}>{item.fornecedor}</td><td className="px-4 py-2.5 text-sm font-medium tabular-nums" style={{ color: "var(--foreground)" }}>{formatBRL(item.valor, 2)}</td><td className="px-4 py-2.5"><select value={destino} onChange={event => setClassificacoes(atual => ({ ...atual, [item.id]: event.target.value as DestinoReclassificacao }))} className="w-52 rounded-md px-2 py-1.5 text-xs outline-none" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}>{DESTINOS_RECLASSIFICACAO.map(opcao => <option key={opcao.value} value={opcao.value}>{opcao.label}</option>)}</select></td><td className="px-4 py-2.5"><label className="flex items-center gap-2 text-xs" style={{ color: destino === "manter_ignorado" ? "var(--muted-foreground)" : "var(--foreground)" }}><input type="checkbox" checked={Boolean(salvarComoRegra[item.id])} disabled={destino === "manter_ignorado"} onChange={event => setSalvarComoRegra(atual => ({ ...atual, [item.id]: event.target.checked }))} /><span>Salvar regra</span></label></td></tr>;
                    })}
                  </tbody>
                </table>
              </div>
              <p className="px-4 py-3 text-xs" style={{ color: "var(--muted-foreground)" }}>Marque “Salvar regra” para que esse mesmo Tipo seja classificado automaticamente nos próximos arquivos. Lançamentos de SIMPLES devem permanecer ignorados para evitar duplicidade, pois o imposto já é calculado à parte.</p>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={resetar} className="rounded-lg px-4 py-2 text-sm font-medium transition-all hover:opacity-80" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}>Cancelar</button>
            <button onClick={handleConfirmar} disabled={loading} className="flex items-center justify-center gap-2 rounded-lg px-6 py-2 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50" style={{ background: "var(--primary)", color: "white" }}>{loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{loading ? "Atualizando..." : "Confirmar e Atualizar Calculadora"}</button>
          </div>
        </div>
      )}

      {step === "success" && (
        <div className="rounded-xl p-12 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "oklch(0.70 0.18 155 / 0.15)" }}><CheckCircle2 className="h-8 w-8" style={{ color: "oklch(0.70 0.18 155)" }} /></div>
          <h2 className="mb-2 text-xl font-bold" style={{ color: "var(--foreground)" }}>Calculadora Atualizada!</h2>
          <p className="mb-6 text-sm" style={{ color: "var(--muted-foreground)" }}>Os custos foram importados com sucesso. Esta base foi registrada no histórico, e o Dashboard e o Simulador já refletem os novos valores.</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center"><button onClick={resetar} className="rounded-lg px-4 py-2 text-center text-sm font-medium transition-all hover:opacity-80" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}>Nova Importação</button><a href="/" className="rounded-lg px-6 py-2 text-center text-sm font-semibold transition-all hover:opacity-90" style={{ background: "var(--primary)", color: "white" }}>Ver Dashboard</a><a href="/historico-dados" className="rounded-lg px-4 py-2 text-center text-sm font-medium transition-all hover:opacity-80" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}>Ver Histórico de Dados</a></div>
        </div>
      )}
    </div>
  );
}
