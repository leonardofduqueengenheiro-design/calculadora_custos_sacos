import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Download, RefreshCw, ChevronRight, X } from "lucide-react";
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
};

interface PreviewData {
  numMeses: number;
  mesesDetectados: string[];
  totalLinhas: number;
  linhasProcessadas: number;
  linhasIgnoradas: string[];
  mediasPorCategoria: Record<string, number>;
  mediaMateriaPrima: number;
  mediaFaturamento: number;
  totalFaturamento: number;
  totalMateriaPrima: number;
  totalCustos: number;
}

type Step = "upload" | "preview" | "success";

export default function Importar() {
  const [step, setStep] = useState<Step>("upload");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const processFile = async (file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Formato inválido. Envie um arquivo .xlsx ou .xls");
      return;
    }
    setFileName(file.name);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const resp = await fetch("/api/upload/planilha", { method: "POST", body: formData });
      const data = await resp.json();
      if (!resp.ok || data.error) throw new Error(data.error || "Erro ao processar");
      setPreview(data.preview);
      setStep("preview");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar a planilha");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleConfirmar = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      const resp = await fetch("/api/upload/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediasPorCategoria: preview.mediasPorCategoria,
          mediaMateriaPrima: preview.mediaMateriaPrima,
          mediaFaturamento: preview.mediaFaturamento,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || data.error) throw new Error(data.error || "Erro ao salvar");
      // Invalidar cache do tRPC para atualizar dashboard
      await utils.custos.list.invalidate();
      await utils.calculo.resumo.invalidate();
      await utils.parametros.list.invalidate();
      setStep("success");
      toast.success("Dados importados com sucesso! Dashboard atualizado.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao confirmar importação");
    } finally {
      setLoading(false);
    }
  };

  const resetar = () => {
    setStep("upload");
    setPreview(null);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Cabeçalho */}
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
            Importar Planilha
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Faça upload da sua planilha de controle mensal para atualizar automaticamente os custos da calculadora
          </p>
        </div>
        <a
          href="/manus-storage/MODELO_CONTROLE_FINANCEIRO_SACOS_34f15913.xlsx"
          download="MODELO_CONTROLE_FINANCEIRO_SACOS.xlsx"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
          style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}
        >
          <Download className="w-4 h-4" />
          Baixar Modelo
        </a>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
        {[
          { key: "upload", label: "1. Upload" },
          { key: "preview", label: "2. Revisar" },
          { key: "success", label: "3. Concluído" },
        ].map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className="w-3 h-3" />}
            <span
              className="font-medium"
              style={{ color: step === s.key ? "var(--primary)" : step === "success" && s.key !== "success" ? "oklch(0.70 0.18 155)" : "var(--muted-foreground)" }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* STEP 1: Upload */}
      {step === "upload" && (
        <div className="space-y-4">
          {/* Zona de drop */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer rounded-xl p-6 text-center transition-all sm:p-12"
            style={{
              border: `2px dashed ${dragging ? "var(--primary)" : "var(--border)"}`,
              background: dragging ? "var(--primary)/5" : "var(--card)",
            }}
          >
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="w-10 h-10 animate-spin" style={{ color: "var(--primary)" }} />
                <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Processando planilha...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "var(--primary)/10" }}>
                  <Upload className="w-8 h-8" style={{ color: "var(--primary)" }} />
                </div>
                <div>
                  <p className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
                    Arraste sua planilha aqui
                  </p>
                  <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
                    ou clique para selecionar o arquivo (.xlsx ou .xls)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Instruções */}
          <div className="rounded-xl p-5" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
              Como funciona a importação
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { n: "1", t: "Preencha a planilha modelo", d: "Baixe o modelo acima e lance seus custos mensais conforme o padrão" },
                { n: "2", t: "Faça o upload", d: "Arraste o arquivo ou clique para selecionar. O sistema lê automaticamente todas as abas" },
                { n: "3", t: "Revise e confirme", d: "Veja o resumo dos dados extraídos e confirme para atualizar a calculadora" },
              ].map(item => (
                <div key={item.n} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ background: "var(--primary)", color: "white" }}>
                    {item.n}
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>{item.t}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tipos reconhecidos */}
          <div className="rounded-xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
              Tipos de lançamento reconhecidos automaticamente
            </h3>
            <div className="flex flex-wrap gap-2">
              {["Matéria-Prima", "Folha de Pagamento", "Impostos sobre Folha", "Energia Elétrica", "Combustível", "Transporte/Frete", "Manutenção/Peças", "Serviços", "Comissão", "Seguros", "Água/Saneamento", "Faturamento", "Diversos"].map(t => (
                <span key={t} className="px-2 py-1 rounded-md text-xs font-medium" style={{ background: "var(--muted)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Preview */}
      {step === "preview" && preview && (
        <div className="space-y-4">
          {/* Arquivo */}
          <div className="flex items-start justify-between gap-3 rounded-xl p-4 sm:items-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8" style={{ color: "oklch(0.70 0.18 155)" }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{fileName}</p>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {preview.totalLinhas} linhas lidas · {preview.linhasProcessadas} processadas · {preview.numMeses} mês(es) detectado(s)
                </p>
              </div>
            </div>
            <button onClick={resetar} className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" style={{ color: "var(--muted-foreground)" }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Período */}
          {preview.mesesDetectados.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>PERÍODO DETECTADO</p>
              <div className="flex flex-wrap gap-2">
                {preview.mesesDetectados.map(m => (
                  <span key={m} className="px-2 py-1 rounded-md text-xs font-medium" style={{ background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Resumo financeiro */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            {[
              { l: "Total Custos", v: formatBRL(preview.totalCustos, 0), c: "oklch(0.65 0.22 25)" },
              { l: "Total Matéria-Prima", v: formatBRL(preview.totalMateriaPrima, 0), c: "oklch(0.65 0.18 50)" },
              { l: "Total Faturamento", v: formatBRL(preview.totalFaturamento, 0), c: "oklch(0.70 0.18 155)" },
              { l: "Média Mensal (custos)", v: formatBRL(preview.totalCustos / preview.numMeses, 0), c: "var(--primary)" },
            ].map(({ l, v, c }) => (
              <div key={l} className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{l}</p>
                <p className="text-lg font-bold mt-1" style={{ color: c }}>{v}</p>
              </div>
            ))}
          </div>

          {/* Médias por categoria */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <div className="px-4 py-3" style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                Médias Mensais por Categoria (serão aplicadas na calculadora)
              </p>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {preview.mediaMateriaPrima > 0 && (
                <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--card)" }}>
                  <span className="text-sm" style={{ color: "var(--foreground)" }}>Matéria-Prima (total mensal)</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: "oklch(0.65 0.18 50)" }}>
                    {formatBRL(preview.mediaMateriaPrima, 2)}/mês
                  </span>
                </div>
              )}
              {Object.entries(preview.mediasPorCategoria).map(([cat, media]) => (
                <div key={cat} className="flex items-center justify-between px-4 py-3" style={{ background: "var(--card)" }}>
                  <span className="text-sm" style={{ color: "var(--foreground)" }}>
                    {CATEGORIA_LABELS[cat] || cat}
                  </span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>
                    {formatBRL(media, 2)}/mês
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Linhas ignoradas */}
          {preview.linhasIgnoradas.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: "oklch(0.65 0.22 25 / 0.08)", border: "1px solid oklch(0.65 0.22 25 / 0.3)" }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" style={{ color: "oklch(0.65 0.22 25)" }} />
                <p className="text-xs font-semibold" style={{ color: "oklch(0.65 0.22 25)" }}>
                  {preview.linhasIgnoradas.length} lançamento(s) não reconhecido(s) — serão ignorados
                </p>
              </div>
              <div className="space-y-1">
                {preview.linhasIgnoradas.slice(0, 5).map((l, i) => (
                  <p key={i} className="text-xs" style={{ color: "var(--muted-foreground)" }}>• {l}</p>
                ))}
                {preview.linhasIgnoradas.length > 5 && (
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>... e mais {preview.linhasIgnoradas.length - 5}</p>
                )}
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={resetar}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
              style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmar}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--primary)", color: "white" }}
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {loading ? "Atualizando..." : "Confirmar e Atualizar Calculadora"}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Sucesso */}
      {step === "success" && (
        <div className="rounded-xl p-12 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "oklch(0.70 0.18 155 / 0.15)" }}>
            <CheckCircle2 className="w-8 h-8" style={{ color: "oklch(0.70 0.18 155)" }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
            Calculadora Atualizada!
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
            Os custos foram importados com sucesso. O Dashboard e o Simulador já refletem os novos valores.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={resetar}
              className="rounded-lg px-4 py-2 text-center text-sm font-medium transition-all hover:opacity-80"
              style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}
            >
              Nova Importação
            </button>
            <a
              href="/"
              className="rounded-lg px-6 py-2 text-center text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: "var(--primary)", color: "white" }}
            >
              Ver Dashboard
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
