import { trpc } from "@/lib/trpc";
import { formatBRL, formatPercent, formatKg, formatNumber } from "@/lib/format";
import {
  TrendingUp, TrendingDown, DollarSign, Package,
  BarChart3, Layers, ArrowRight, RefreshCw
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

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
      className={cn("rounded-xl p-6 card-gradient animate-fade-in-up", glowClass)}
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

export default function Dashboard() {
  const { data: resumo, isLoading, refetch } = trpc.calculo.resumo.useQuery();
  const { data: custos } = trpc.custos.list.useQuery();

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
            Dashboard Financeiro
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Indicadores baseados em médias de 17 meses de operação
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Segunda linha */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Decomposição de custos */}
        <div
          className="lg:col-span-2 rounded-xl p-6 card-gradient animate-fade-in-up"
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
                { label: "SIMPLES (11%)", valor: resumo.simplesKg, cor: "oklch(0.65 0.18 240)" },
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
