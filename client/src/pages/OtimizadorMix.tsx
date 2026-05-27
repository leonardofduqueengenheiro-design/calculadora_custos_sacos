import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Info,
  ArrowRight,
  Target,
  BarChart2,
  PieChart as PieChartIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from "recharts";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtKg = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " kg";
const fmtPct = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";

// Paleta de cores para os produtos
const CORES = [
  "oklch(0.72 0.18 195)",   // ciano primário
  "oklch(0.75 0.18 145)",   // verde
  "oklch(0.72 0.18 280)",   // roxo
  "oklch(0.75 0.18 55)",    // âmbar
];
const CORES_HEX = ["#22d3ee", "#4ade80", "#a78bfa", "#fbbf24"];

interface ProdutoInput {
  produtoId: number;
  produtoNome: string;
  precoVendaKg: string;
  custoMpKg: number;
  kgAtual: string;
  kgMinimo: string;
  kgMaximo: string;
  showRestricoes: boolean;
}

interface ResultadoOtimizado {
  produtoId: number;
  produtoNome: string;
  precoVendaKg: number;
  custoMpKg: number;
  custoTotalKg: number;
  margemUnitaria: number;
  margemPercentual: number;
  simplesKg: number;
  kgAtual: number;
  kgOtimizado: number;
  kgDelta: number;
  participacaoPct: number;
  faturamento: number;
  lucro: number;
}

interface ResultadoOtimizacao {
  resultadoOtimizado: ResultadoOtimizado[];
  totalKg: number;
  totalFaturamento: number;
  totalLucro: number;
  margemConsolidada: number;
  custoFixoKg: number;
  totalVariavelKg: number;
  energiaVariavelKg: number;
  combustivelVariavelKg: number;
  freteVariavelKg: number;
  aliquotaSimples: number;
  comparacao: {
    totalKgAtual: number;
    totalLucroAtual: number | null;
    totalFaturamentoAtual: number | null;
    margemAtual: number | null;
    ganhoLucro: number | null;
    ganhoMargem: number | null;
  } | null;
}

// Tooltip customizado para o gráfico de barras
function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-card/95 p-3 shadow-xl text-xs space-y-1">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-mono font-medium text-foreground">
            {entry.value.toLocaleString("pt-BR", { minimumFractionDigits: 0 })} kg
          </span>
        </div>
      ))}
    </div>
  );
}

// Tooltip customizado para o gráfico de pizza
function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-lg border border-border/50 bg-card/95 p-3 shadow-xl text-xs space-y-1">
      <p className="font-semibold text-foreground">{d.name}</p>
      <p className="text-muted-foreground">
        Volume: <span className="font-mono text-foreground">{fmtKg(d.value)}</span>
      </p>
      <p className="text-muted-foreground">
        Participação: <span className="font-mono text-primary">{fmtPct(d.payload.participacaoPct)}</span>
      </p>
      <p className="text-muted-foreground">
        Margem/kg: <span className="font-mono text-emerald-400">{fmt(d.payload.margemUnitaria)}</span>
      </p>
    </div>
  );
}

export default function OtimizadorMix() {
  const { data: produtos, isLoading } = trpc.produtos.list.useQuery();
  const otimizarMutation = trpc.analises.otimizar.useMutation();

  const [volumeTotal, setVolumeTotal] = useState("");
  const [produtosInput, setProdutosInput] = useState<ProdutoInput[]>([]);
  const [resultado, setResultado] = useState<ResultadoOtimizacao | null>(null);
  const [chartView, setChartView] = useState<"barras" | "pizza">("barras");

  // Inicializar inputs quando produtos carregam
  useMemo(() => {
    if (produtos && produtos.length > 0 && produtosInput.length === 0) {
      setProdutosInput(
        produtos.map(p => ({
          produtoId: p.id,
          produtoNome: p.nome,
          precoVendaKg: "",
          custoMpKg: p.custoMpKg,
          kgAtual: "",
          kgMinimo: "",
          kgMaximo: "",
          showRestricoes: false,
        }))
      );
    }
  }, [produtos]);

  const handleChange = (idx: number, field: keyof ProdutoInput, value: string | boolean) => {
    setProdutosInput(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const produtosValidos = produtosInput.filter(p => parseFloat(p.precoVendaKg) > 0);

  const handleOtimizar = async () => {
    const vol = parseFloat(volumeTotal);
    if (!vol || vol <= 0) {
      toast.error("Informe o volume total de produção");
      return;
    }
    if (produtosValidos.length === 0) {
      toast.error("Informe o preço de venda de pelo menos um produto");
      return;
    }

    try {
      const res = await otimizarMutation.mutateAsync({
        volumeTotalKg: vol,
        produtos: produtosValidos.map(p => ({
          produtoId: p.produtoId,
          produtoNome: p.produtoNome,
          precoVendaKg: parseFloat(p.precoVendaKg),
          custoMpKg: p.custoMpKg,
          kgAtual: parseFloat(p.kgAtual) || 0,
          kgMinimo: parseFloat(p.kgMinimo) || 0,
          kgMaximo: parseFloat(p.kgMaximo) || undefined,
        })),
      });
      setResultado(res as ResultadoOtimizacao);
      toast.success("Otimização concluída!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao otimizar");
    }
  };

  // Dados para o gráfico de barras (atual vs otimizado)
  const dadosBarras = useMemo(() => {
    if (!resultado) return [];
    return resultado.resultadoOtimizado.map(r => ({
      nome: r.produtoNome.length > 16 ? r.produtoNome.slice(0, 14) + "…" : r.produtoNome,
      nomeCompleto: r.produtoNome,
      atual: r.kgAtual,
      otimizado: r.kgOtimizado,
    }));
  }, [resultado]);

  // Dados para o gráfico de pizza (participação % no mix otimizado)
  const dadosPizza = useMemo(() => {
    if (!resultado) return [];
    return resultado.resultadoOtimizado.map((r, i) => ({
      name: r.produtoNome,
      value: r.kgOtimizado,
      participacaoPct: r.participacaoPct,
      margemUnitaria: r.margemUnitaria,
      color: CORES_HEX[i % CORES_HEX.length],
    }));
  }, [resultado]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground text-sm">Carregando produtos...</div>
      </div>
    );
  }

  if (!produtos || produtos.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Otimizador de Mix</h1>
          <p className="text-muted-foreground text-sm mt-1">Encontre o mix ideal para maximizar sua margem de lucro</p>
        </div>
        <Card className="border-border/50">
          <CardContent className="pt-6 text-center text-muted-foreground">
            Nenhum produto cadastrado. Acesse a página <strong>Produtos</strong> para cadastrar seus produtos antes de usar o otimizador.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Otimizador de Mix de Produção</h1>
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          Informe o volume total disponível e os preços de venda de cada produto. O sistema calcula a distribuição ideal de kg para maximizar sua margem de lucro total.
        </p>
      </div>

      {/* Card explicativo */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-primary">Como funciona a otimização?</p>
              <p className="text-xs text-muted-foreground">
                O algoritmo calcula a <strong className="text-foreground">margem unitária por kg</strong> de cada produto (preço − SIMPLES − custo MP − custo fixo rateado − variáveis) e aloca o volume total priorizando os produtos mais rentáveis.
                Você pode definir volumes mínimos (comprometidos com clientes) e máximos (capacidade de venda) por produto.
                O custo fixo é rateado pelo volume total informado — quanto maior o volume, menor o custo fixo por kg.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulário de entrada */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Parâmetros de Otimização
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Volume total */}
          <div className="max-w-xs">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Volume Total a Produzir (kg) *</Label>
            <Input
              type="number"
              min="1"
              step="100"
              placeholder="Ex: 31498"
              value={volumeTotal}
              onChange={e => setVolumeTotal(e.target.value)}
              className="mt-1 bg-background/50"
            />
            <p className="text-xs text-muted-foreground mt-1">Capacidade total do período (mês, semana, etc.)</p>
          </div>

          <Separator />

          {/* Cabeçalho da tabela */}
          <div className="grid grid-cols-12 gap-3 text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
            <div className="col-span-4">Produto</div>
            <div className="col-span-2">Custo MP/kg</div>
            <div className="col-span-2">Preço Venda/kg *</div>
            <div className="col-span-2">Kg Atual</div>
            <div className="col-span-2">Restrições</div>
          </div>

          <Separator />

          {produtosInput.map((item, idx) => (
            <div key={item.produtoId} className="space-y-2">
              <div className="grid grid-cols-12 gap-3 items-center">
                {/* Nome */}
                <div className="col-span-4 flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: CORES_HEX[idx % CORES_HEX.length] }}
                  />
                  <span className="text-sm font-medium text-foreground">{item.produtoNome}</span>
                </div>

                {/* Custo MP */}
                <div className="col-span-2">
                  <span className="text-sm font-mono text-primary">
                    {item.custoMpKg > 0 ? fmt(item.custoMpKg) : "—"}
                  </span>
                </div>

                {/* Preço de venda */}
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={item.precoVendaKg}
                    onChange={e => handleChange(idx, "precoVendaKg", e.target.value)}
                    className="h-8 text-sm bg-background/50"
                  />
                </div>

                {/* Kg atual */}
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="0"
                    value={item.kgAtual}
                    onChange={e => handleChange(idx, "kgAtual", e.target.value)}
                    className="h-8 text-sm bg-background/50"
                  />
                </div>

                {/* Toggle restrições */}
                <div className="col-span-2">
                  <button
                    onClick={() => handleChange(idx, "showRestricoes", !item.showRestricoes)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.showRestricoes ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {item.showRestricoes ? "Ocultar" : "Definir"}
                  </button>
                </div>
              </div>

              {/* Restrições expandidas */}
              {item.showRestricoes && (
                <div className="ml-6 p-3 rounded-md bg-muted/20 border border-border/30 grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Volume Mínimo (kg)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      placeholder="0 (sem mínimo)"
                      value={item.kgMinimo}
                      onChange={e => handleChange(idx, "kgMinimo", e.target.value)}
                      className="h-8 text-sm mt-1 bg-background/50"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Pedidos já comprometidos</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Volume Máximo (kg)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      placeholder="Sem limite"
                      value={item.kgMaximo}
                      onChange={e => handleChange(idx, "kgMaximo", e.target.value)}
                      className="h-8 text-sm mt-1 bg-background/50"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Capacidade máxima de venda</p>
                  </div>
                </div>
              )}
            </div>
          ))}

          <Separator />

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {produtosValidos.length} produto(s) com preço informado
            </p>
            <Button
              onClick={handleOtimizar}
              disabled={produtosValidos.length === 0 || !volumeTotal || otimizarMutation.isPending}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {otimizarMutation.isPending ? "Otimizando..." : "Calcular Mix Ideal"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {resultado && (
        <div className="space-y-5">
          {/* KPIs de comparação */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border/50">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Volume Total</p>
                <p className="text-xl font-bold text-foreground mt-1">{fmtKg(resultado.totalKg)}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Faturamento Otimizado</p>
                <p className="text-xl font-bold text-primary mt-1">{fmt(resultado.totalFaturamento)}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Lucro Otimizado</p>
                <p className={`text-xl font-bold mt-1 ${resultado.totalLucro >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmt(resultado.totalLucro)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Margem Otimizada</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className={`text-xl font-bold ${resultado.margemConsolidada >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {fmtPct(resultado.margemConsolidada)}
                  </p>
                  {resultado.margemConsolidada >= 0
                    ? <TrendingUp className="h-4 w-4 text-emerald-400" />
                    : <TrendingDown className="h-4 w-4 text-red-400" />}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ganho vs mix atual */}
          {resultado.comparacao && resultado.comparacao.ganhoLucro !== null && (
            <Card className={`border-2 ${resultado.comparacao.ganhoLucro >= 0 ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/40 bg-red-500/5"}`}>
              <CardContent className="pt-4">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-3">
                    <ArrowRight className={`h-5 w-5 ${resultado.comparacao.ganhoLucro >= 0 ? "text-emerald-400" : "text-red-400"}`} />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Ganho de Lucro vs Mix Atual</p>
                      <p className={`text-2xl font-bold ${resultado.comparacao.ganhoLucro >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {resultado.comparacao.ganhoLucro >= 0 ? "+" : ""}{fmt(resultado.comparacao.ganhoLucro)}
                      </p>
                    </div>
                  </div>
                  {resultado.comparacao.ganhoMargem !== null && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Ganho de Margem</p>
                      <p className={`text-2xl font-bold ${resultado.comparacao.ganhoMargem >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {resultado.comparacao.ganhoMargem >= 0 ? "+" : ""}{fmtPct(resultado.comparacao.ganhoMargem)}
                      </p>
                    </div>
                  )}
                  {resultado.comparacao.margemAtual !== null && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Margem Atual</p>
                      <p className="text-2xl font-bold text-foreground/70">{fmtPct(resultado.comparacao.margemAtual)}</p>
                    </div>
                  )}
                  {resultado.comparacao.totalLucroAtual !== null && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Lucro Atual</p>
                      <p className="text-2xl font-bold text-foreground/70">{fmt(resultado.comparacao.totalLucroAtual)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabela comparativa */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-primary" />
                Tabela Comparativa — Mix Atual vs Mix Otimizado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 text-xs text-muted-foreground font-medium uppercase">Produto</th>
                      <th className="text-right py-2 text-xs text-muted-foreground font-medium uppercase">Margem/kg</th>
                      <th className="text-right py-2 text-xs text-muted-foreground font-medium uppercase">Margem %</th>
                      <th className="text-right py-2 text-xs text-muted-foreground font-medium uppercase">Kg Atual</th>
                      <th className="text-right py-2 text-xs text-muted-foreground font-medium uppercase">Kg Otimizado</th>
                      <th className="text-right py-2 text-xs text-muted-foreground font-medium uppercase">Δ Kg</th>
                      <th className="text-right py-2 text-xs text-muted-foreground font-medium uppercase">Part. %</th>
                      <th className="text-right py-2 text-xs text-muted-foreground font-medium uppercase">Lucro Otimizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.resultadoOtimizado
                      .slice()
                      .sort((a, b) => b.margemUnitaria - a.margemUnitaria)
                      .map((r, i) => {
                        const corIdx = resultado.resultadoOtimizado.findIndex(x => x.produtoId === r.produtoId);
                        return (
                          <tr key={r.produtoId} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ background: CORES_HEX[corIdx % CORES_HEX.length] }}
                                />
                                <span className="font-medium text-foreground">{r.produtoNome}</span>
                                {i === 0 && (
                                  <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30 ml-1">
                                    Mais rentável
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className={`py-3 text-right font-mono font-medium ${r.margemUnitaria >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {fmt(r.margemUnitaria)}
                            </td>
                            <td className="py-3 text-right">
                              <Badge
                                variant={r.margemPercentual >= 0 ? "default" : "destructive"}
                                className="font-mono text-xs"
                              >
                                {fmtPct(r.margemPercentual)}
                              </Badge>
                            </td>
                            <td className="py-3 text-right font-mono text-foreground/70">
                              {r.kgAtual > 0 ? fmtKg(r.kgAtual) : "—"}
                            </td>
                            <td className="py-3 text-right font-mono font-semibold text-foreground">
                              {fmtKg(r.kgOtimizado)}
                            </td>
                            <td className="py-3 text-right font-mono">
                              {r.kgAtual > 0 ? (
                                <span className={r.kgDelta >= 0 ? "text-emerald-400" : "text-red-400"}>
                                  {r.kgDelta >= 0 ? "+" : ""}{fmtKg(r.kgDelta)}
                                </span>
                              ) : "—"}
                            </td>
                            <td className="py-3 text-right font-mono text-primary">
                              {fmtPct(r.participacaoPct)}
                            </td>
                            <td className={`py-3 text-right font-mono font-semibold ${r.lucro >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {fmt(r.lucro)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/20">
                      <td className="py-3 font-bold text-foreground">TOTAL OTIMIZADO</td>
                      <td className="py-3" />
                      <td className="py-3 text-right">
                        <Badge
                          variant={resultado.margemConsolidada >= 0 ? "default" : "destructive"}
                          className="font-mono text-xs"
                        >
                          {fmtPct(resultado.margemConsolidada)}
                        </Badge>
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-foreground/70">
                        {resultado.comparacao ? fmtKg(resultado.comparacao.totalKgAtual) : "—"}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-foreground">
                        {fmtKg(resultado.totalKg)}
                      </td>
                      <td className="py-3" />
                      <td className="py-3 text-right font-mono font-bold text-primary">100%</td>
                      <td className={`py-3 text-right font-mono font-bold ${resultado.totalLucro >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {fmt(resultado.totalLucro)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Gráficos */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {chartView === "barras"
                    ? <><BarChart2 className="h-4 w-4 text-primary" /> Comparativo de Volume por Produto</>
                    : <><PieChartIcon className="h-4 w-4 text-primary" /> Participação no Mix Otimizado</>
                  }
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={chartView === "barras" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setChartView("barras")}
                    className="gap-1 text-xs"
                  >
                    <BarChart2 className="h-3 w-3" />
                    Barras
                  </Button>
                  <Button
                    variant={chartView === "pizza" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setChartView("pizza")}
                    className="gap-1 text-xs"
                  >
                    <PieChartIcon className="h-3 w-3" />
                    Pizza
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {chartView === "barras" ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Comparação entre o volume atual informado e o volume otimizado sugerido para cada produto.
                    Produtos com maior margem unitária recebem maior alocação de volume.
                  </p>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={dadosBarras}
                      margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                      barCategoryGap="30%"
                      barGap={4}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                      <XAxis
                        dataKey="nome"
                        tick={{ fill: "oklch(0.7 0 0)", fontSize: 12 }}
                        axisLine={{ stroke: "oklch(1 0 0 / 0.1)" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "oklch(0.7 0 0)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={v => v.toLocaleString("pt-BR")}
                        width={70}
                      />
                      <Tooltip content={<BarTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: 12, color: "oklch(0.7 0 0)" }}
                      />
                      {dadosBarras.some(d => d.atual > 0) && (
                        <Bar
                          dataKey="atual"
                          name="Kg Atual"
                          fill="oklch(0.6 0.05 220)"
                          radius={[4, 4, 0, 0]}
                          opacity={0.7}
                        />
                      )}
                      <Bar
                        dataKey="otimizado"
                        name="Kg Otimizado"
                        radius={[4, 4, 0, 0]}
                      >
                        {dadosBarras.map((_, i) => (
                          <Cell key={i} fill={CORES_HEX[i % CORES_HEX.length]} />
                        ))}
                        <LabelList
                          dataKey="otimizado"
                          position="top"
                          style={{ fill: "oklch(0.8 0 0)", fontSize: 11 }}
                          formatter={(v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Distribuição percentual do volume total no mix otimizado. Produtos com maior margem unitária têm maior participação.
                  </p>
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={dadosPizza}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={120}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {dadosPizza.map((entry, i) => (
                            <Cell key={i} fill={entry.color} stroke="transparent" />
                          ))}
                          <LabelList
                            dataKey="participacaoPct"
                            position="outside"
                            style={{ fill: "oklch(0.8 0 0)", fontSize: 11 }}
                            formatter={(v: number) => fmtPct(v)}
                          />
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Legenda lateral */}
                    <div className="space-y-3 min-w-[200px]">
                      {dadosPizza.map((d, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div
                            className="w-3 h-3 rounded-sm mt-0.5 flex-shrink-0"
                            style={{ background: d.color }}
                          />
                          <div>
                            <p className="text-sm font-medium text-foreground">{d.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {fmtKg(d.value)} · {fmtPct(d.participacaoPct)}
                            </p>
                            <p className="text-xs text-emerald-400 font-mono">
                              Margem: {fmt(d.margemUnitaria)}/kg
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detalhamento de custos */}
          <Card className="border-border/50">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3">
                Base de Cálculo — Custo por kg (volume: {fmtKg(resultado.totalKg)})
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Custo Fixo rateado: </span>
                  <span className="font-mono text-foreground font-medium">{fmt(resultado.custoFixoKg)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Energia variável: </span>
                  <span className="font-mono text-foreground font-medium">{fmt(resultado.energiaVariavelKg)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Combustível variável: </span>
                  <span className="font-mono text-foreground font-medium">{fmt(resultado.combustivelVariavelKg)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Frete variável: </span>
                  <span className="font-mono text-foreground font-medium">{fmt(resultado.freteVariavelKg)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total variável/kg: </span>
                  <span className="font-mono text-primary font-semibold">{fmt(resultado.totalVariavelKg)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">SIMPLES: </span>
                  <span className="font-mono text-foreground font-medium">{resultado.aliquotaSimples}% sobre faturamento</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
