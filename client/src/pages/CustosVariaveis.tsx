import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatBRL, formatPercent } from "@/lib/format";
import { toast } from "sonner";
import { Save, Info, Zap, Percent } from "lucide-react";

function ParamCard({
  icon: Icon,
  title,
  description,
  chave,
  value,
  prefix,
  suffix,
  step,
  min,
  max,
  accentColor,
  onSave,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  chave: string;
  value: number;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
  accentColor?: string;
  onSave: (chave: string, valor: number) => void;
}) {
  const [localValue, setLocalValue] = useState(value.toString());
  const [dirty, setDirty] = useState(false);

  const handleChange = (v: string) => {
    setLocalValue(v);
    setDirty(parseFloat(v) !== value);
  };

  const handleSave = () => {
    const num = parseFloat(localValue);
    if (isNaN(num) || num < (min ?? 0)) {
      toast.error("Valor inválido");
      return;
    }
    onSave(chave, num);
    setDirty(false);
  };

  const color = accentColor || "var(--primary)";

  return (
    <div
      className="rounded-xl p-6 card-gradient"
      style={{ border: `1px solid var(--border)` }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}/15`, border: `1px solid ${color}/25` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>{title}</h3>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>{description}</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            {prefix && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
                {prefix}
              </span>
            )}
            <input
              type="number"
              value={localValue}
              onChange={e => handleChange(e.target.value)}
              step={step ?? 0.01}
              min={min ?? 0}
              max={max}
              className="w-full text-lg font-bold rounded-lg py-3 outline-none transition-all"
              style={{
                background: "var(--input)",
                color: "var(--foreground)",
                border: `1px solid ${dirty ? color : "var(--border)"}`,
                paddingLeft: prefix ? "2.5rem" : "1rem",
                paddingRight: suffix ? "3rem" : "1rem",
                textAlign: "right",
              }}
            />
            {suffix && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
                {suffix}
              </span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={!dirty}
            className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all"
            style={{
              background: dirty ? color : "var(--secondary)",
              color: dirty ? "var(--primary-foreground)" : "var(--muted-foreground)",
              opacity: dirty ? 1 : 0.6,
              cursor: dirty ? "pointer" : "not-allowed",
            }}
          >
            <Save className="w-4 h-4" />
            Salvar
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--muted-foreground)" }}>
          Valor atual: <span className="font-medium" style={{ color: "var(--foreground)" }}>
            {prefix}{parseFloat(localValue || "0").toFixed(4)}{suffix}
          </span>
        </p>
      </div>
    </div>
  );
}

export default function CustosVariaveis() {
  const { data: params, refetch } = trpc.parametros.list.useQuery();
  const { data: resumo } = trpc.calculo.resumo.useQuery();
  const setParam = trpc.parametros.set.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Parâmetro atualizado com sucesso!");
    },
  });

  const paramMap: Record<string, number> = {};
  if (params) {
    for (const p of params) paramMap[p.chave] = parseFloat(p.valor);
  }

  const custoMpKg = paramMap['custo_mp_kg'] ?? 8.234;
  const aliquotaSimples = paramMap['aliquota_simples'] ?? 11;
  const producaoMensal = paramMap['producao_mensal_kg'] ?? 31498;

  const handleSave = (chave: string, valor: number) => {
    setParam.mutate({ chave, valor });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>Custos Variáveis</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          Custos que variam com a produção e o faturamento. Atualize sempre que houver reajuste.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ParamCard
          icon={Zap}
          title="Custo de Matéria-Prima"
          description="Custo por kg de matéria-prima consumida, calculado com base no total comprado menos o estoque atual de 100 toneladas."
          chave="custo_mp_kg"
          value={custoMpKg}
          prefix="R$"
          suffix="/kg"
          step={0.0001}
          min={0}
          accentColor="oklch(0.72 0.18 25)"
          onSave={handleSave}
        />
        <ParamCard
          icon={Percent}
          title="Alíquota do SIMPLES Nacional"
          description="Percentual do SIMPLES sobre o faturamento bruto. É um custo variável pois incide sobre o preço de venda. Valor padrão: 11%."
          chave="aliquota_simples"
          value={aliquotaSimples}
          suffix="%"
          step={0.1}
          min={0}
          max={30}
          accentColor="oklch(0.65 0.18 240)"
          onSave={handleSave}
        />
      </div>

      {/* Impacto no custo por kg */}
      <div
        className="rounded-xl p-6 card-gradient"
        style={{ border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-5">
          <Info className="w-4 h-4" style={{ color: "var(--primary)" }} />
          <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
            Impacto no Custo por kg
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Custo MP por kg", valor: formatBRL(custoMpKg, 4), desc: "Custo variável direto" },
            { label: "SIMPLES sobre R$24,00", valor: formatBRL(24 * aliquotaSimples / 100, 4), desc: `${aliquotaSimples}% do preço de venda` },
            { label: "Custo MP Mensal", valor: formatBRL(custoMpKg * producaoMensal, 0), desc: `${producaoMensal.toLocaleString("pt-BR")} kg/mês` },
            { label: "SIMPLES Mensal Est.", valor: formatBRL(24 * aliquotaSimples / 100 * producaoMensal, 0), desc: "Ao preço atual de R$24/kg" },
          ].map(({ label, valor, desc }) => (
            <div key={label} className="rounded-lg p-4" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>{label}</p>
              <p className="text-lg font-bold" style={{ color: "var(--foreground)" }}>{valor}</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>{desc}</p>
            </div>
          ))}
        </div>

        <div
          className="mt-4 p-4 rounded-lg flex items-start gap-3"
          style={{ background: "oklch(0.65 0.18 240 / 0.08)", border: "1px solid oklch(0.65 0.18 240 / 0.2)" }}
        >
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "oklch(0.65 0.18 240)" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Como o SIMPLES é calculado</p>
            <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
              O SIMPLES Nacional incide sobre o <strong>preço de venda</strong>, não sobre o custo. Por isso, é tratado como um desconto direto no preço de venda.
              Fórmula: <code className="px-1 rounded text-xs" style={{ background: "var(--muted)" }}>Margem = Preço − (Preço × {aliquotaSimples}%) − Custo Total</code>
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
              Para calcular o preço mínimo com margem desejada: <code className="px-1 rounded text-xs" style={{ background: "var(--muted)" }}>Preço = Custo ÷ (1 − Margem% − {aliquotaSimples}%)</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
