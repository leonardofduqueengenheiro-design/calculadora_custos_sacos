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
  Package,
  Calculator,
  TrendingUp,
  TrendingDown,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtKg = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kg";
const fmtPct = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";

interface ProdutoItem {
  produtoId: number;
  produtoNome: string;
  kgProduzido: string;
  precoVendaKg: string;
  custoMpKg: number;
}

interface ResultadoItem {
  produtoId: number;
  produtoNome: string;
  kgProduzido: number;
  precoVendaKg: number;
  custoMpKg: number;
  custoFixoKg: number;
  energiaVariavelKg: number;
  combustivelVariavelKg: number;
  freteVariavelKg: number;
  totalVariavelKg: number;
  custoTotalKg: number;
  simplesKg: number;
  margemUnitaria: number;
  margemPercentual: number;
  faturamento: number;
  lucro: number;
}

interface ResultadoCalculo {
  resultadoPorProduto: ResultadoItem[];
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
}

export default function AnaliseMix() {
  const { data: produtos, isLoading } = trpc.produtos.list.useQuery();
  const calcularMutation = trpc.analises.calcular.useMutation();
  const salvarMutation = trpc.analises.salvar.useMutation();
  const utils = trpc.useUtils();

  const [itens, setItens] = useState<ProdutoItem[]>([]);
  const [resultado, setResultado] = useState<ResultadoCalculo | null>(null);
  const [descricao, setDescricao] = useState("");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [observacao, setObservacao] = useState("");
  const [expandedProduto, setExpandedProduto] = useState<number | null>(null);
  const [showSalvar, setShowSalvar] = useState(false);

  // Inicializar itens quando produtos carregam — pré-preenche preço padrão se configurado
  useMemo(() => {
    if (produtos && itens.length === 0) {
      setItens(
        produtos.map(p => ({
          produtoId: p.id,
          produtoNome: p.nome,
          kgProduzido: "",
          precoVendaKg: p.precoVendaPadrao != null ? p.precoVendaPadrao.toFixed(2) : "",
          custoMpKg: p.custoMpKg,
        }))
      );
    }
  }, [produtos]);

  const handleChange = (idx: number, field: "kgProduzido" | "precoVendaKg", value: string) => {
    setItens(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
    setResultado(null);
  };

  const itensValidos = itens.filter(
    i => parseFloat(i.kgProduzido) > 0 && parseFloat(i.precoVendaKg) > 0
  );

  const handleCalcular = async () => {
    if (itensValidos.length === 0) {
      toast.error("Informe pelo menos um produto com kg e preço de venda");
      return;
    }
    try {
      const res = await calcularMutation.mutateAsync({
        itens: itensValidos.map(i => ({
          produtoId: i.produtoId,
          produtoNome: i.produtoNome,
          kgProduzido: parseFloat(i.kgProduzido),
          precoVendaKg: parseFloat(i.precoVendaKg),
          custoMpKg: i.custoMpKg,
        })),
      });
      setResultado(res);
      setShowSalvar(false);
      toast.success("Análise calculada com sucesso!");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao calcular");
    }
  };

  const handleSalvar = async () => {
    if (!resultado || !descricao.trim()) {
      toast.error("Informe uma descrição para salvar a análise");
      return;
    }
    try {
      await salvarMutation.mutateAsync({
        descricao,
        periodoInicio: periodoInicio || undefined,
        periodoFim: periodoFim || undefined,
        observacao: observacao || undefined,
        itens: itensValidos.map(i => ({
          produtoId: i.produtoId,
          produtoNome: i.produtoNome,
          kgProduzido: parseFloat(i.kgProduzido),
          precoVendaKg: parseFloat(i.precoVendaKg),
          custoMpKg: i.custoMpKg,
        })),
      });
      utils.analises.list.invalidate();
      toast.success("Análise salva com sucesso!");
      setShowSalvar(false);
      setDescricao("");
      setPeriodoInicio("");
      setPeriodoFim("");
      setObservacao("");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    }
  };

  const handleLimpar = () => {
    setItens(prev => prev.map(i => ({ ...i, kgProduzido: "", precoVendaKg: "" })));
    setResultado(null);
    setShowSalvar(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando produtos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Análise por Mix de Produtos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Informe o volume produzido e o preço de venda de cada produto para calcular a margem do período
        </p>
      </div>

      {/* Aviso de configuração */}
      {produtos && produtos.some(p => p.custoMpKg === 0) && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10">
          <Info className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-300">
            Alguns produtos ainda não têm matérias-primas configuradas. Acesse{" "}
            <strong>Produtos</strong> no menu para configurar a composição de cada produto.
          </p>
        </div>
      )}

      {/* Entrada de dados */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Dados do Período
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cabeçalho da tabela */}
          <div className="grid grid-cols-12 gap-3 text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
            <div className="col-span-4">Produto</div>
            <div className="col-span-3">Kg Produzido/Vendido</div>
            <div className="col-span-3">Preço de Venda (R$/kg)</div>
            <div className="col-span-2">Custo MP/kg</div>
          </div>

          <Separator />

          {itens.map((item, idx) => {
            const prod = produtos?.find(p => p.id === item.produtoId);
            const isExpanded = expandedProduto === item.produtoId;
            return (
              <div key={item.produtoId} className="space-y-2">
                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary/60" />
                      <span className="text-sm font-medium text-foreground">{item.produtoNome}</span>
                      {prod && prod.materiasPrimas.length > 0 && (
                        <button
                          onClick={() => setExpandedProduto(isExpanded ? null : item.produtoId)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      value={item.kgProduzido}
                      onChange={e => handleChange(idx, "kgProduzido", e.target.value)}
                      className="h-8 text-sm bg-background/50"
                    />
                  </div>
                  <div className="col-span-3">
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
                  <div className="col-span-2">
                    <span className="text-sm font-mono text-primary">
                      {item.custoMpKg > 0 ? fmt(item.custoMpKg) : "—"}
                    </span>
                  </div>
                </div>

                {/* Composição de MP expandida */}
                {isExpanded && prod && prod.materiasPrimas.length > 0 && (
                  <div className="ml-6 p-3 rounded-md bg-muted/30 border border-border/30">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Composição de Matéria-Prima:</p>
                    <div className="space-y-1">
                      {prod.materiasPrimas.filter(m => m.nome && m.percentualUso > 0).map(m => (
                        <div key={m.id} className="flex justify-between text-xs">
                          <span className="text-foreground/80">{m.nome}</span>
                          <span className="text-muted-foreground font-mono">
                            {m.percentualUso.toFixed(1)}% · {fmt(m.custoKg)}/kg
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-border/30 flex justify-between text-xs font-medium">
                      <span className="text-foreground">Custo ponderado:</span>
                      <span className="text-primary font-mono">{fmt(prod.custoMpKg)}/kg</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <Separator />

          {/* Totais de entrada */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {itensValidos.length} produto(s) com dados preenchidos ·{" "}
              {fmtKg(itensValidos.reduce((s, i) => s + parseFloat(i.kgProduzido || "0"), 0))} total
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleLimpar}>
                <RotateCcw className="h-3 w-3 mr-1" />
                Limpar
              </Button>
              <Button
                size="sm"
                onClick={handleCalcular}
                disabled={itensValidos.length === 0 || calcularMutation.isPending}
              >
                <Calculator className="h-3 w-3 mr-1" />
                {calcularMutation.isPending ? "Calculando..." : "Calcular Análise"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      {resultado && (
        <div className="space-y-4">
          {/* KPIs consolidados */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border/50">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Produzido</p>
                <p className="text-xl font-bold text-foreground mt-1">{fmtKg(resultado.totalKg)}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Faturamento Total</p>
                <p className="text-xl font-bold text-primary mt-1">{fmt(resultado.totalFaturamento)}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Lucro Total</p>
                <p className={`text-xl font-bold mt-1 ${resultado.totalLucro >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmt(resultado.totalLucro)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Margem Consolidada</p>
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

          {/* Custo fixo e energia variável */}
          {/* Nota explicativa sobre Custeio por Absorção */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <Info className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-300">Custeio por Absorção — Rateio de Custos Fixos</p>
                  <p className="text-xs text-muted-foreground">
                    Os custos fixos mensais (R$ {resultado.custoFixoKg > 0 ? (resultado.custoFixoKg * resultado.totalKg).toLocaleString('pt-BR', {style:'currency',currency:'BRL'}) : '—'}) são rateados pelo <strong className="text-foreground">volume total real do mix ({resultado.totalKg.toLocaleString('pt-BR', {minimumFractionDigits:0})} kg)</strong>, resultando em {fmt(resultado.custoFixoKg)}/kg.
                    Quanto maior o volume total produzido, menor o custo fixo por kg — e melhor a margem de todos os produtos.
                    Isso é o método de Custeio por Absorção: produzir mais dilui os custos fixos entre todos os produtos.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Os custos variáveis (energia, combustível e frete) também variam com o volume real: quanto mais se produz, maior o consumo total, mas o custo por kg permanece constante.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detalhamento de custos por kg */}
          <Card className="border-border/50">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3">Composição do Custo por kg (base: {resultado.totalKg.toLocaleString('pt-BR')} kg totais)</p>
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

          {/* Tabela por produto */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resultado por Produto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 text-xs text-muted-foreground font-medium uppercase">Produto</th>
                      <th className="text-right py-2 text-xs text-muted-foreground font-medium uppercase">Kg</th>
                      <th className="text-right py-2 text-xs text-muted-foreground font-medium uppercase">Preço/kg</th>
                      <th className="text-right py-2 text-xs text-muted-foreground font-medium uppercase">Custo Total/kg</th>
                      <th className="text-right py-2 text-xs text-muted-foreground font-medium uppercase">Margem/kg</th>
                      <th className="text-right py-2 text-xs text-muted-foreground font-medium uppercase">Margem %</th>
                      <th className="text-right py-2 text-xs text-muted-foreground font-medium uppercase">Faturamento</th>
                      <th className="text-right py-2 text-xs text-muted-foreground font-medium uppercase">Lucro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.resultadoPorProduto.map(r => (
                      <tr key={r.produtoId} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="py-3 font-medium text-foreground">{r.produtoNome}</td>
                        <td className="py-3 text-right font-mono text-foreground/80">{fmtKg(r.kgProduzido)}</td>
                        <td className="py-3 text-right font-mono text-foreground/80">{fmt(r.precoVendaKg)}</td>
                        <td className="py-3 text-right font-mono text-foreground/80">{fmt(r.custoTotalKg)}</td>
                        <td className={`py-3 text-right font-mono font-medium ${r.margemUnitaria >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {fmt(r.margemUnitaria)}
                        </td>
                        <td className="py-3 text-right">
                          <Badge variant={r.margemPercentual >= 0 ? "default" : "destructive"} className="font-mono text-xs">
                            {fmtPct(r.margemPercentual)}
                          </Badge>
                        </td>
                        <td className="py-3 text-right font-mono text-primary">{fmt(r.faturamento)}</td>
                        <td className={`py-3 text-right font-mono font-semibold ${r.lucro >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {fmt(r.lucro)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/20">
                      <td className="py-3 font-bold text-foreground">TOTAL</td>
                      <td className="py-3 text-right font-mono font-bold">{fmtKg(resultado.totalKg)}</td>
                      <td className="py-3" />
                      <td className="py-3" />
                      <td className="py-3" />
                      <td className="py-3 text-right">
                        <Badge variant={resultado.margemConsolidada >= 0 ? "default" : "destructive"} className="font-mono text-xs">
                          {fmtPct(resultado.margemConsolidada)}
                        </Badge>
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-primary">{fmt(resultado.totalFaturamento)}</td>
                      <td className={`py-3 text-right font-mono font-bold ${resultado.totalLucro >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {fmt(resultado.totalLucro)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Botões de ação */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => window.print()}>
              Imprimir Relatório
            </Button>
            <Button onClick={() => setShowSalvar(v => !v)}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Análise
            </Button>
          </div>

          {/* Formulário de salvar */}
          {showSalvar && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Salvar Análise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <Label className="text-xs text-muted-foreground">Descrição *</Label>
                    <Input
                      placeholder="Ex: Análise Maio 2026"
                      value={descricao}
                      onChange={e => setDescricao(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Período Início</Label>
                    <Input
                      type="date"
                      value={periodoInicio}
                      onChange={e => setPeriodoInicio(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Período Fim</Label>
                    <Input
                      type="date"
                      value={periodoFim}
                      onChange={e => setPeriodoFim(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Observação</Label>
                    <Input
                      placeholder="Opcional"
                      value={observacao}
                      onChange={e => setObservacao(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowSalvar(false)}>Cancelar</Button>
                  <Button size="sm" onClick={handleSalvar} disabled={salvarMutation.isPending}>
                    {salvarMutation.isPending ? "Salvando..." : "Confirmar Salvar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
