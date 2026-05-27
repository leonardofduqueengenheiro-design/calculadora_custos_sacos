import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatBRL, formatKg } from "@/lib/format";
import { toast } from "sonner";
import { Save, Factory, Package, Calendar, Sun, Zap } from "lucide-react";

function ParamField({
  label,
  chave,
  value,
  prefix,
  suffix,
  step,
  min,
  description,
  onSave,
}: {
  label: string;
  chave: string;
  value: number;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  description?: string;
  onSave: (chave: string, valor: number) => void;
}) {
  const [local, setLocal] = useState(value.toString());
  const dirty = parseFloat(local) !== value;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{label}</label>
      {description && <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{description}</p>}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          {prefix && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--muted-foreground)" }}>{prefix}</span>
          )}
          <input
            type="number"
            value={local}
            onChange={e => setLocal(e.target.value)}
            step={step ?? 1}
            min={min ?? 0}
            className="w-full text-base font-semibold rounded-lg py-2.5 outline-none transition-all"
            style={{
              background: "var(--input)",
              color: "var(--foreground)",
              border: `1px solid ${dirty ? "var(--primary)" : "var(--border)"}`,
              paddingLeft: prefix ? "2.5rem" : "0.75rem",
              paddingRight: suffix ? "3rem" : "0.75rem",
              textAlign: "right",
            }}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--muted-foreground)" }}>{suffix}</span>
          )}
        </div>
        <button
          onClick={() => {
            const num = parseFloat(local);
            if (isNaN(num)) { toast.error("Valor inválido"); return; }
            onSave(chave, num);
          }}
          disabled={!dirty}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
          style={{
            background: dirty ? "var(--primary)" : "var(--secondary)",
            color: dirty ? "var(--primary-foreground)" : "var(--muted-foreground)",
            opacity: dirty ? 1 : 0.5,
            cursor: dirty ? "pointer" : "not-allowed",
          }}
        >
          <Save className="w-3.5 h-3.5" />
          Salvar
        </button>
      </div>
    </div>
  );
}

export default function Parametros() {
  const { data: params, refetch } = trpc.parametros.list.useQuery();
  const { data: resumo } = trpc.calculo.resumo.useQuery();
  const setParam = trpc.parametros.set.useMutation({
    onSuccess: () => { refetch(); toast.success("Parâmetro atualizado!"); },
  });

  const paramMap: Record<string, number> = {};
  if (params) {
    for (const p of params) paramMap[p.chave] = parseFloat(p.valor);
  }

  const producaoMensal = paramMap['producao_mensal_kg'] ?? 31498;
  const producaoDiaria = paramMap['producao_diaria_kg'] ?? 1500;
  const estoque = paramMap['estoque_atual_kg'] ?? 100000;
  const precoVenda = paramMap['preco_venda_atual'] ?? 24;
  const energiaPercentualFixo = paramMap['energia_percentual_fixo'] ?? 20;

  const handleSave = (chave: string, valor: number) => {
    setParam.mutate({ chave, valor });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>Parâmetros de Produção</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          Configure os parâmetros operacionais que afetam os cálculos de custo e margem.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produção */}
        <div className="rounded-xl p-6 card-gradient space-y-5" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.72 0.18 195 / 0.15)", border: "1px solid oklch(0.72 0.18 195 / 0.25)" }}>
              <Factory className="w-5 h-5" style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>Produção</h2>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Capacidade produtiva da fábrica</p>
            </div>
          </div>
          <ParamField label="Produção Média Mensal" chave="producao_mensal_kg" value={producaoMensal} suffix="kg/mês" step={100} description="Quantidade média de sacos plásticos produzidos por mês em kg" onSave={handleSave} />
          <ParamField label="Produção Média Diária" chave="producao_diaria_kg" value={producaoDiaria} suffix="kg/dia" step={50} description="Quantidade média de sacos plásticos produzidos por dia em kg" onSave={handleSave} />
        </div>

        {/* Energia Mista */}
        <div className="rounded-xl p-6 card-gradient space-y-5" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.72 0.18 120 / 0.15)", border: "1px solid oklch(0.72 0.18 120 / 0.25)" }}>
              <Zap className="w-5 h-5" style={{ color: "oklch(0.72 0.18 120)" }} />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>Energia Elétrica</h2>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Distribuição entre custo fixo e variável</p>
            </div>
          </div>
          <ParamField
            label="Percentual Fixo da Energia"
            chave="energia_percentual_fixo"
            value={energiaPercentualFixo}
            suffix="%"
            step={5}
            min={0}
            description={`Parte da conta de energia que é fixa (estrutura/iluminação). O restante (${100 - energiaPercentualFixo}%) é variável e proporcional à produção.`}
            onSave={handleSave}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3 text-center" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Energia Fixa</p>
              <p className="text-lg font-bold" style={{ color: "var(--foreground)" }}>{energiaPercentualFixo}%</p>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Vai para custo fixo/kg</p>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Energia Variável</p>
              <p className="text-lg font-bold" style={{ color: "oklch(0.72 0.18 120)" }}>{100 - energiaPercentualFixo}%</p>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Proporcional à produção</p>
            </div>
          </div>
        </div>

        {/* Estoque e Preço */}
        <div className="rounded-xl p-6 card-gradient space-y-5" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.70 0.18 45 / 0.15)", border: "1px solid oklch(0.70 0.18 45 / 0.25)" }}>
              <Package className="w-5 h-5" style={{ color: "oklch(0.70 0.18 45)" }} />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>Estoque e Preço</h2>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Estoque atual e preço de referência</p>
            </div>
          </div>
          <ParamField label="Estoque Atual de Matéria-Prima" chave="estoque_atual_kg" value={estoque} suffix="kg" step={1000} description="Quantidade atual de matéria-prima em estoque (afeta o custo real por kg)" onSave={handleSave} />
          <ParamField label="Preço de Venda Atual" chave="preco_venda_atual" value={precoVenda} prefix="R$" suffix="/kg" step={0.01} description="Preço de venda atual usado como referência no dashboard" onSave={handleSave} />
        </div>
      </div>

      {/* Indicadores derivados */}
      <div className="rounded-xl p-6 card-gradient" style={{ border: "1px solid var(--border)" }}>
        <h2 className="text-base font-semibold mb-4" style={{ color: "var(--foreground)" }}>Indicadores Derivados</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: Calendar,
              label: "Dias de Produção/Mês",
              valor: (producaoMensal / producaoDiaria).toFixed(1) + " dias",
              desc: "Baseado na produção mensal ÷ diária",
            },
            {
              icon: Sun,
              label: "Meses de Estoque",
              valor: (estoque / producaoMensal).toFixed(1) + " meses",
              desc: "Estoque atual ÷ produção mensal",
            },
            {
              icon: Package,
              label: "Faturamento Potencial",
              valor: formatBRL(estoque * precoVenda, 0),
              desc: "Estoque × preço de venda atual",
            },
            {
              icon: Factory,
              label: "Custo Fixo por kg",
              valor: resumo ? formatBRL(resumo.custoFixoKg, 4) : "—",
              desc: "Custos fixos ÷ produção mensal",
            },
          ].map(({ icon: Icon, label, valor, desc }) => (
            <div key={label} className="rounded-lg p-4" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</span>
              </div>
              <p className="text-lg font-bold" style={{ color: "var(--foreground)" }}>{valor}</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
