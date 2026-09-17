import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatBRL, CATEGORIAS, CATEGORIA_CORES } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIAS_LIST = Object.entries(CATEGORIAS) as [string, string][];

type CategoriaKey = "folha_pagamento" | "impostos_folha" | "energia" | "combustivel" | "transporte_frete" | "manutencao" | "servicos" | "comissoes" | "diversos";

interface EditState {
  id?: number;
  categoria: CategoriaKey;
  descricao: string;
  valorMensal: string;
}

function EditRow({
  state,
  onChange,
  onSave,
  onCancel,
  isNew,
}: {
  state: EditState;
  onChange: (s: EditState) => void;
  onSave: () => void;
  onCancel: () => void;
  isNew?: boolean;
}) {
  return (
    <tr style={{ background: "oklch(0.72 0.18 195 / 0.06)" }}>
      <td className="px-4 py-3">
        <select
          value={state.categoria}
          onChange={e => onChange({ ...state, categoria: e.target.value as CategoriaKey })}
          className="w-full text-sm rounded-lg px-3 py-2 outline-none focus:ring-1"
          style={{
            background: "var(--input)",
            color: "var(--foreground)",
            border: "1px solid var(--border)",
          }}
        >
          {CATEGORIAS_LIST.map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={state.descricao}
          onChange={e => onChange({ ...state, descricao: e.target.value })}
          placeholder="Descrição do custo"
          className="w-full text-sm rounded-lg px-3 py-2 outline-none focus:ring-1"
          style={{
            background: "var(--input)",
            color: "var(--foreground)",
            border: "1px solid var(--border)",
          }}
        />
      </td>
      <td className="px-4 py-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--muted-foreground)" }}>R$</span>
          <input
            type="number"
            value={state.valorMensal}
            onChange={e => onChange({ ...state, valorMensal: e.target.value })}
            placeholder="0,00"
            step="0.01"
            min="0"
            className="w-full text-sm rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-1 text-right"
            style={{
              background: "var(--input)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
            }}
          />
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onSave}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
            style={{ background: "oklch(0.70 0.18 155 / 0.15)", color: "oklch(0.70 0.18 155)" }}
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
            style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function CustosFixos() {
  const { data: custos, isLoading, refetch } = trpc.custos.list.useQuery();
  const upsert = trpc.custos.upsert.useMutation({ onSuccess: () => { refetch(); toast.success("Custo salvo com sucesso!"); setEditing(null); setAdding(false); } });
  const del = trpc.custos.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Custo removido!"); } });

  const [editing, setEditing] = useState<EditState | null>(null);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState<EditState>({ categoria: "folha_pagamento", descricao: "", valorMensal: "" });

  const handleSave = (state: EditState) => {
    const valor = parseFloat(state.valorMensal);
    if (!state.descricao.trim() || isNaN(valor)) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }
    upsert.mutate({ id: state.id, categoria: state.categoria, descricao: state.descricao, valorMensal: valor });
  };

  const total = custos?.reduce((sum, c) => sum + parseFloat(c.valorMensal), 0) ?? 0;

  // Agrupar por categoria
  const grupos: Record<string, typeof custos> = {};
  if (custos) {
    for (const c of custos) {
      if (!grupos[c.categoria]) grupos[c.categoria] = [];
      grupos[c.categoria]!.push(c);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>Custos Fixos Mensais</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Gerencie todos os custos fixos por categoria. Total: <span className="font-semibold" style={{ color: "var(--primary)" }}>{formatBRL(total)}/mês</span>
          </p>
        </div>
        <button
          onClick={() => { setAdding(true); setNewItem({ categoria: "folha_pagamento", descricao: "", valorMensal: "" }); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          <Plus className="w-4 h-4" /> Adicionar Custo
        </button>
      </div>

      {/* Resumo por categoria */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {CATEGORIAS_LIST.map(([key, label]) => {
          const subtotal = grupos[key]?.reduce((s, c) => s + parseFloat(c.valorMensal), 0) ?? 0;
          const pct = total > 0 ? (subtotal / total) * 100 : 0;
          return (
            <div key={key} className="rounded-lg p-3 card-gradient" style={{ border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: CATEGORIA_CORES[key] }} />
                <span className="text-xs font-medium truncate" style={{ color: "var(--muted-foreground)" }}>{label}</span>
              </div>
              <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{formatBRL(subtotal, 0)}</p>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{pct.toFixed(1)}%</p>
            </div>
          );
        })}
      </div>

      {/* Tabela */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
          <thead>
            <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Categoria</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Descrição</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Valor Mensal</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
            {adding && (
              <EditRow
                state={newItem}
                onChange={setNewItem}
                onSave={() => handleSave(newItem)}
                onCancel={() => setAdding(false)}
                isNew
              />
            )}
            {isLoading ? (
              <tr><td colSpan={4} className="text-center py-8"><RefreshCw className="w-5 h-5 animate-spin mx-auto" style={{ color: "var(--muted-foreground)" }} /></td></tr>
            ) : custos?.map(c => (
              editing?.id === c.id ? (
                <EditRow
                  key={c.id}
                  state={editing}
                  onChange={setEditing}
                  onSave={() => handleSave(editing)}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <tr key={c.id} className="transition-colors" style={{ background: "var(--card)" }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CATEGORIA_CORES[c.categoria] || "var(--muted-foreground)" }} />
                      <span className="text-sm" style={{ color: "var(--foreground)" }}>{CATEGORIAS[c.categoria] || c.categoria}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--muted-foreground)" }}>{c.descricao}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium tabular-nums" style={{ color: "var(--foreground)" }}>
                    {formatBRL(parseFloat(c.valorMensal))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => setEditing({ id: c.id, categoria: c.categoria as CategoriaKey, descricao: c.descricao, valorMensal: c.valorMensal })}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                        style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => del.mutate({ id: c.id })}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                        style={{ background: "oklch(0.65 0.22 25 / 0.12)", color: "oklch(0.65 0.22 25)" }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            ))}
            {/* Total */}
            <tr style={{ background: "var(--muted)", borderTop: "2px solid var(--border)" }}>
              <td colSpan={2} className="px-4 py-3 text-sm font-bold" style={{ color: "var(--foreground)" }}>TOTAL CUSTOS FIXOS MENSAIS</td>
              <td className="px-4 py-3 text-right text-sm font-bold tabular-nums" style={{ color: "var(--primary)" }}>{formatBRL(total)}</td>
              <td />
            </tr>
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
