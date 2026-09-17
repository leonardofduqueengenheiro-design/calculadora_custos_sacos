import { trpc } from "@/lib/trpc";
import { formatBRL, formatPercent, formatKg } from "@/lib/format";
import {
  TrendingUp, TrendingDown, DollarSign, Package,
  BarChart3, Layers, ArrowRight, RefreshCw
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  glowClass,
  accentColor,
  delay = 0,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  glowClass?: string;
  accentColor?: string;
  delay?: number;
}) {
  return (
    <div
      className={cn("rounded-xl p-4 sm:p-6 card-gradient animate-fade-in-up", glowClass)}
      style={{
        animationDelay: `${delay}ms`,
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: `${accentColor || "oklch(0.72 0.18 195)"}/15`, border: `1px solid ${accentColor || "oklch(0.72 0.18 195)"}/25` }}
        >
          <Icon className="w-5 h-5" style={{ color: accentColor || "var(--primary)" }} />
        </div>
        {trend && trendLabel && (
          <span className={cn("text-xs px-2 py-1 rounded-full font-medium",
            trend === "up" ? "badge-positive" : trend === "down" ? "badge-negative" : "badge-neutral"
          )}>
            {trend === "up" ? "▲" : trend === "down" ? "▼" : "—"} {trendLabel}
          </span>
        )}
      </div>
      <p className="text-sm font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>{title}</p>
      <p className="metric-value" style={{ color: "var(--foreground)" }}>{value}</p>
      {subtitle && (
        <p className="text-xs mt-2" style={{ color: "var(--muted-foreground)" }}>{subtitle}</p>
      )}
    </div>
  );
}

function CustoBar({ label, valor, total, cor }: { label: string; valor: number; total: number; cor: string }) {
  const pct = total > 0 ? (valor / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-sm" style={{ color: "var(--foreground)" }}>{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{pct.toFixed(1)}%</span>
          <span className="text-sm font-medium tabular-nums" style={{ color: "var(--foreground)" }}>
            {formatBRL(valor)}
          </span>
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: cor }}
        />
      </div>
    </div>
  );
}

// Tooltip customizado para o gráfico break-even
function BreakEvenTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      className="rounded-lg p-3 text-xs shadow-xl"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        color: "var(--foreground)",
        minWidth: 180,
      }}
    >
      <p className="font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>
        Volume: {Number(label).toLocaleString("pt-BR")} kg
      </p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex justify-between gap-4">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-medium tabular-nums">{formatBRL(entry.value, 0)}</span>
        </div>
      ))}
      {payload.length === 2 && (
        <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex justify-between gap-4">
            <span style={{ color: payload[0].value > payload[1].value ? "oklch(0.70 0.18 155)" : "oklch(0.65 0.22 25)" }}>
              {payload[0].value > payload[1].value ? "Lucro" : "Prejuízo"}
            </span>
            <span className="font-bold tabular-nums" style={{ color: payload[0].value > payload[1].value ? "oklch(0.70 0.18 155)" : "oklch(0.65 0.22 25)" }}>
              {formatBRL(Math.abs(payload[0].value - payload[1].value), 0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { data: resumo, isLoading, refetch } = trpc.calculo.resumo.useQuery();
  const { data: custos } = trpc.custos.list.useQuery();
  const { data: importacaoAtiva } = trpc.importacoes.ativa.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" style={{ color: "var(--muted-foreground)" }} />
      </div>
    );
  }

  if (!resumo) return null;

  const isLucrativo = resumo.margemUnitaria > 0;

  // Agrupar custos por categoria
  const custosPorCategoria: Record<string, number> = {};
  if (custos) {
    for (const c of custos) {
      const cat = c.categoria;
      custosPorCategoria[cat] = (custosPorCategoria[cat] || 0) + parseFloat(c.valorMensal);
    }
  }

  const CORES_CAT: Record<string, string> = {
    folha_pagamento: "oklch(0.72 0.18 195)",
    impostos_folha: "oklch(0.65 0.18 240)",
    energia: "oklch(0.78 0.18 75)",
    combustivel: "oklch(0.70 0.18 45)",
    transporte_frete: "oklch(0.72 0.18 155)",
    manutencao: "oklch(0.65 0.18 300)",
    servicos: "oklch(0.70 0.18 330)",
    comissoes: "oklch(0.72 0.18 25)",
    diversos: "oklch(0.60 0.015 260)",
  };

  const LABELS_CAT: Record<string, string> = {
    folha_pagamento: "Folha de Pagamento",
    impostos_folha: "Impostos s/ Folha",
    energia: "Energia Elétrica",
    combustivel: "Combustível",
    transporte_frete: "Transporte / Frete",
    manutencao: "Manutenção",
    servicos: "Serviços",
    comissoes: "Comissões",
    diversos: "Diversos",
  };

  const totalCustos = resumo.totalFixosMensal + resumo.custoMpKg * resumo.producaoMensal;

  // ─── Dados do Break-Even Chart ────────────────────────────────────────────
  // Custo Total = Custos Fixos Mensais + (Custo MP/kg × Volume)
  // Receita Total = Preço de Venda × Volume × (1 - alíquota SIMPLES)
  // Ponto de equilíbrio: volume onde Receita = Custo Total
  const custoFixoMensal = resumo.totalFixosMensal;
  const custoVarKg = resumo.custoMpKg + (resumo.totalVariavelKg ?? 0); // custo variável por kg (MP + energia + combustível + frete variáveis)
  const receitaLiquidaKg = resumo.precoVenda * (1 - resumo.aliquotaSimples / 100); // receita líquida por kg (descontando SIMPLES)

  // Volume do ponto de equilíbrio: CustoFixo + CustoVar*V = ReceitaLiq*V
  // CustoFixo = (ReceitaLiq - CustoVar) * V
  // V = CustoFixo / (ReceitaLiq - CustoVar)
  const margemContribuicaoKg = receitaLiquidaKg - custoVarKg;
  const volumeBreakEven = margemContribuicaoKg > 0
    ? Math.round(custoFixoMensal / margemContribuicaoKg)
    : null;

  // Gerar pontos do gráfico: de 0 até 2× a produção mensal atual
  const maxVolume = Math.max(resumo.producaoMensal * 2, volumeBreakEven ? volumeBreakEven * 1.5 : resumo.producaoMensal * 2);
  const steps = 10;
  const stepSize = Math.round(maxVolume / steps);

  const breakEvenData = Array.from({ length: steps + 1 }, (_, i) => {
    const volume = i * stepSize;
    const receitaTotal = receitaLiquidaKg * volume;
    const custoTotal = custoFixoMensal + custoVarKg * volume;
    return {
      volume,
      "Receita Líquida": Math.round(receitaTotal),
      "Custo Total": Math.round(custoTotal),
    };
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
            Dashboard Financeiro
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            {importacaoAtiva?.periodoInicio && importacaoAtiva?.periodoFim
              ? `Base ativa: ${importacaoAtiva.periodoInicio} a ${importacaoAtiva.periodoFim} · ${importacaoAtiva.numMeses} mês(es)`
              : importacaoAtiva
                ? "Base ativa anterior — período não registrado"
                : "Base ativa sem período de importação registrado"}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
          style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Custo Total por kg"
          value={formatBRL(resumo.custoTotalKg, 4)}
          subtitle={`Fixo: ${formatBRL(resumo.custoFixoKg, 4)} + MP: ${formatBRL(resumo.custoMpKg, 4)}`}
          icon={Layers}
          accentColor="oklch(0.72 0.18 195)"
          glowClass="card-glow"
          delay={0}
        />
        <KpiCard
          title="Margem Atual"
          value={formatPercent(resumo.margemPercentual)}
          subtitle={`${formatBRL(resumo.margemUnitaria, 4)}/kg ao preço de ${formatBRL(resumo.precoVenda)}`}
          icon={isLucrativo ? TrendingUp : TrendingDown}
          trend={isLucrativo ? "up" : "down"}
          trendLabel={isLucrativo ? "Lucrativo" : "Prejuízo"}
          accentColor={isLucrativo ? "oklch(0.70 0.18 155)" : "oklch(0.65 0.22 25)"}
          glowClass={isLucrativo ? "card-glow-success" : "card-glow-danger"}
          delay={80}
        />
        <KpiCard
          title="Faturamento Mensal"
          value={formatBRL(resumo.faturamentoMensal, 0)}
          subtitle={`${formatKg(resumo.producaoMensal)} × ${formatBRL(resumo.precoVenda)}/kg`}
          icon={DollarSign}
          accentColor="oklch(0.78 0.18 75)"
          delay={160}
        />
        <KpiCard
          title="Lucro Mensal Estimado"
          value={formatBRL(resumo.margemMensal, 0)}
          subtitle={`Potencial estoque: ${formatBRL(resumo.lucroPotencialEstoque, 0)}`}
          icon={BarChart3}
          trend={resumo.margemMensal > 0 ? "up" : "down"}
          trendLabel={resumo.margemMensal > 0 ? "Positivo" : "Negativo"}
          accentColor={resumo.margemMensal > 0 ? "oklch(0.70 0.18 155)" : "oklch(0.65 0.22 25)"}
          delay={240}
        />
      </div>

      {/* Break-Even Chart — linha inteira */}
      <div
        className="rounded-xl p-4 sm:p-6 card-gradient animate-fade-in-up"
        style={{ border: "1px solid var(--border)", animationDelay: "300ms" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
              Ponto de Equilíbrio — Break-Even Chart
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              Cruzamento entre Receita Líquida e Custo Total por volume de produção mensal (kg)
            </p>
          </div>

          {/* Indicadores do break-even */}
          <div className="flex flex-wrap gap-3">
            <div
              className="rounded-lg px-4 py-2 text-center"
              style={{ background: "oklch(0.70 0.18 155 / 0.10)", border: "1px solid oklch(0.70 0.18 155 / 0.25)" }}
            >
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Ponto de Equilíbrio</p>
              <p className="text-sm font-bold tabular-nums" style={{ color: "oklch(0.70 0.18 155)" }}>
                {volumeBreakEven != null ? `${volumeBreakEven.toLocaleString("pt-BR")} kg` : "—"}
              </p>
            </div>
            <div
              className="rounded-lg px-4 py-2 text-center"
              style={{ background: "oklch(0.72 0.18 195 / 0.10)", border: "1px solid oklch(0.72 0.18 195 / 0.25)" }}
            >
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Produção Atual</p>
              <p className="text-sm font-bold tabular-nums" style={{ color: "oklch(0.72 0.18 195)" }}>
                {formatKg(resumo.producaoMensal)}
              </p>
            </div>
            <div
              className="rounded-lg px-4 py-2 text-center"
              style={{
                background: isLucrativo ? "oklch(0.70 0.18 155 / 0.10)" : "oklch(0.65 0.22 25 / 0.10)",
                border: `1px solid ${isLucrativo ? "oklch(0.70 0.18 155 / 0.25)" : "oklch(0.65 0.22 25 / 0.25)"}`,
              }}
            >
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                {volumeBreakEven != null && resumo.producaoMensal > volumeBreakEven ? "Folga acima do PE" : "Déficit abaixo do PE"}
              </p>
              <p className="text-sm font-bold tabular-nums" style={{ color: isLucrativo ? "oklch(0.70 0.18 155)" : "oklch(0.65 0.22 25)" }}>
                {volumeBreakEven != null
                  ? `${Math.abs(resumo.producaoMensal - volumeBreakEven).toLocaleString("pt-BR")} kg`
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="h-[260px] sm:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={breakEvenData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.35 0.01 260)"
              vertical={false}
            />
            <XAxis
              dataKey="volume"
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              tick={{ fill: "oklch(0.55 0.01 260)", fontSize: 11 }}
              axisLine={{ stroke: "oklch(0.35 0.01 260)" }}
              tickLine={false}
              label={{
                value: "Volume (kg/mês)",
                position: "insideBottom",
                offset: -2,
                fill: "oklch(0.50 0.01 260)",
                fontSize: 11,
              }}
            />
            <YAxis
              tickFormatter={(v) =>
                v >= 1_000_000
                  ? `R$${(v / 1_000_000).toFixed(1)}M`
                  : `R$${(v / 1_000).toFixed(0)}k`
              }
              tick={{ fill: "oklch(0.55 0.01 260)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={72}
            />
            <Tooltip content={<BreakEvenTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 16, color: "oklch(0.65 0.01 260)" }}
            />

            {/* Linha vertical no ponto de equilíbrio */}
            {volumeBreakEven != null && (
              <ReferenceLine
                x={volumeBreakEven}
                stroke="oklch(0.78 0.18 75)"
                strokeDasharray="5 4"
                strokeWidth={1.5}
                label={{
                  value: `PE: ${(volumeBreakEven / 1000).toFixed(1)}k kg`,
                  position: "top",
                  fill: "oklch(0.78 0.18 75)",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )}

            {/* Linha vertical na produção atual */}
            <ReferenceLine
              x={resumo.producaoMensal}
              stroke="oklch(0.72 0.18 195)"
              strokeDasharray="5 4"
              strokeWidth={1.5}
              label={{
                value: `Atual: ${(resumo.producaoMensal / 1000).toFixed(1)}k kg`,
                position: "insideTopRight",
                fill: "oklch(0.72 0.18 195)",
                fontSize: 11,
                fontWeight: 600,
              }}
            />

            <Line
              type="monotone"
              dataKey="Receita Líquida"
              stroke="oklch(0.70 0.18 155)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: "oklch(0.70 0.18 155)" }}
            />
            <Line
              type="monotone"
              dataKey="Custo Total"
              stroke="oklch(0.65 0.22 25)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: "oklch(0.65 0.22 25)" }}
            />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legenda explicativa */}
        <div className="mt-4 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            <span className="font-medium" style={{ color: "oklch(0.70 0.18 155)" }}>Receita Líquida</span>
            {" "}= Preço de Venda × Volume × (1 − SIMPLES {resumo.aliquotaSimples}%)
          </div>
          <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            <span className="font-medium" style={{ color: "oklch(0.65 0.22 25)" }}>Custo Total</span>
            {" "}= Custos Fixos ({formatBRL(custoFixoMensal, 0)}/mês) + Var. ({formatBRL(custoVarKg, 4)}/kg × Volume)
          </div>
          <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            <span className="font-medium" style={{ color: "oklch(0.78 0.18 75)" }}>Ponto de Equilíbrio</span>
            {" "}= volume mínimo para cobrir todos os custos sem lucro nem prejuízo
          </div>
        </div>
      </div>

      {/* Segunda linha */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Decomposição de custos */}
        <div
          className="lg:col-span-2 rounded-xl p-4 sm:p-6 card-gradient animate-fade-in-up"
          style={{ border: "1px solid var(--border)", animationDelay: "320ms" }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
                Composição dos Custos Mensais
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                Total: {formatBRL(totalCustos, 0)}/mês
              </p>
            </div>
            <Link href="/custos-fixos">
              <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
                Editar <ArrowRight className="w-3 h-3" />
              </button>
            </Link>
          </div>

          <div className="space-y-4">
            {/* Matéria-prima */}
            <CustoBar
              label="Matéria-Prima (variável)"
              valor={resumo.custoMpKg * resumo.producaoMensal}
              total={totalCustos}
              cor="oklch(0.72 0.18 25)"
            />
            {/* Custos fixos por categoria */}
            {Object.entries(custosPorCategoria)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, valor]) => (
                <CustoBar
                  key={cat}
                  label={LABELS_CAT[cat] || cat}
                  valor={valor}
                  total={totalCustos}
                  cor={CORES_CAT[cat] || "oklch(0.60 0.015 260)"}
                />
              ))}
          </div>
        </div>

        {/* Painel de análise */}
        <div className="space-y-4">
          {/* Estoque */}
          <div
            className="rounded-xl p-5 card-gradient animate-fade-in-up"
            style={{ border: "1px solid var(--border)", animationDelay: "400ms" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4" style={{ color: "var(--primary)" }} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Análise de Estoque</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Estoque atual</span>
                <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{formatKg(resumo.estoque)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Meses de produção</span>
                <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{resumo.mesesEstoque.toFixed(1)} meses</span>
              </div>
              <div className="divider-gradient" />
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Lucro potencial</span>
                <span
                  className="text-sm font-bold"
                  style={{ color: resumo.lucroPotencialEstoque > 0 ? "oklch(0.70 0.18 155)" : "oklch(0.65 0.22 25)" }}
                >
                  {formatBRL(resumo.lucroPotencialEstoque, 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Decomposição do preço */}
          <div
            className="rounded-xl p-5 card-gradient animate-fade-in-up"
            style={{ border: "1px solid var(--border)", animationDelay: "480ms" }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
              Decomposição do Preço ({formatBRL(resumo.precoVenda)}/kg)
            </h3>
            <div className="space-y-2.5">
              {[
                { label: "Matéria-Prima", valor: resumo.custoMpKg, cor: "oklch(0.72 0.18 25)" },
                { label: "Custos Fixos", valor: resumo.custoFixoKg, cor: "oklch(0.72 0.18 195)" },
                { label: `SIMPLES (${resumo.aliquotaSimples}%)`, valor: resumo.simplesKg, cor: "oklch(0.65 0.18 240)" },
                { label: "Margem", valor: resumo.margemUnitaria, cor: resumo.margemUnitaria > 0 ? "oklch(0.70 0.18 155)" : "oklch(0.65 0.22 25)" },
              ].map(({ label, valor, cor }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cor }} />
                  <span className="text-xs flex-1" style={{ color: "var(--muted-foreground)" }}>{label}</span>
                  <span className="text-xs font-medium tabular-nums" style={{ color: "var(--foreground)" }}>
                    {formatBRL(valor, 4)}
                  </span>
                  <span className="text-xs w-12 text-right" style={{ color: "var(--muted-foreground)" }}>
                    {resumo.precoVenda > 0 ? formatPercent((valor / resumo.precoVenda) * 100, 1) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Atalho simulador */}
          <Link href="/simulador">
            <div
              className="rounded-xl p-5 cursor-pointer transition-all hover:opacity-90 animate-fade-in-up"
              style={{
                background: "oklch(0.72 0.18 195 / 0.10)",
                border: "1px solid oklch(0.72 0.18 195 / 0.25)",
                animationDelay: "560ms",
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--primary)" }}>Abrir Simulador</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>Simule preços e margens</p>
                </div>
                <ArrowRight className="w-5 h-5" style={{ color: "var(--primary)" }} />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
