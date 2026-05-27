import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Package, ChevronDown, ChevronUp, Check, Pencil } from "lucide-react";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";

interface MpRow {
  ordem: number;
  nome: string;
  custoKg: string;
  percentualUso: string;
  saving: boolean;
}

function ProdutoCard({ produto }: { produto: any }) {
  const [expanded, setExpanded] = useState(false);
  const [editingNome, setEditingNome] = useState(false);
  const [nomeEdit, setNomeEdit] = useState(produto.nome);
  const [mps, setMps] = useState<MpRow[]>(
    Array.from({ length: 5 }, (_, i) => {
      const existing = produto.materiasPrimas.find((m: any) => m.ordem === i + 1);
      return {
        ordem: i + 1,
        nome: existing?.nome ?? "",
        custoKg: existing?.custoKg?.toFixed(4) ?? "",
        percentualUso: existing?.percentualUso?.toFixed(1) ?? "",
        saving: false,
      };
    })
  );

  const updateNomeMutation = trpc.produtos.updateNome.useMutation();
  const updateMpMutation = trpc.produtos.updateMp.useMutation();
  const utils = trpc.useUtils();

  const totalPct = mps.reduce((s, m) => s + (parseFloat(m.percentualUso) || 0), 0);
  const pctOk = Math.abs(totalPct - 100) < 0.1 || totalPct === 0;

  const handleSaveNome = async () => {
    if (!nomeEdit.trim()) return;
    try {
      await updateNomeMutation.mutateAsync({ id: produto.id, nome: nomeEdit });
      utils.produtos.list.invalidate();
      setEditingNome(false);
      toast.success("Nome atualizado!");
    } catch {
      toast.error("Erro ao salvar nome");
    }
  };

  const handleSaveMp = async (idx: number) => {
    const mp = mps[idx];
    setMps(prev => prev.map((m, i) => i === idx ? { ...m, saving: true } : m));
    try {
      await updateMpMutation.mutateAsync({
        produtoId: produto.id,
        ordem: mp.ordem,
        nome: mp.nome,
        custoKg: parseFloat(mp.custoKg) || 0,
        percentualUso: parseFloat(mp.percentualUso) || 0,
      });
      utils.produtos.list.invalidate();
      toast.success(`MP ${mp.ordem} salva!`);
    } catch {
      toast.error("Erro ao salvar matéria-prima");
    } finally {
      setMps(prev => prev.map((m, i) => i === idx ? { ...m, saving: false } : m));
    }
  };

  const handleMpChange = (idx: number, field: keyof MpRow, value: string) => {
    setMps(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Package className="h-4 w-4 text-primary" />
            </div>
            {editingNome ? (
              <div className="flex items-center gap-2">
                <Input
                  value={nomeEdit}
                  onChange={e => setNomeEdit(e.target.value)}
                  className="h-7 text-sm w-48"
                  onKeyDown={e => e.key === "Enter" && handleSaveNome()}
                  autoFocus
                />
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveNome}>
                  <Check className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{produto.nome}</CardTitle>
                <button
                  onClick={() => setEditingNome(true)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {produto.custoMpKg > 0 && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Custo MP ponderado</p>
                <p className="text-sm font-mono font-bold text-primary">{fmt(produto.custoMpKg)}/kg</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(v => !v)}
              className="text-muted-foreground"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {expanded ? "Fechar" : "Configurar MPs"}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          <Separator />

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-foreground">Composição de Matérias-Primas</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Total:</span>
                <Badge
                  variant={pctOk ? "default" : "destructive"}
                  className="font-mono text-xs"
                >
                  {fmtPct(totalPct)}
                </Badge>
                {!pctOk && totalPct > 0 && (
                  <span className="text-xs text-red-400">Deve somar 100%</span>
                )}
              </div>
            </div>

            {/* Cabeçalho */}
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-1">
              <div className="col-span-1">#</div>
              <div className="col-span-4">Nome da MP</div>
              <div className="col-span-3">Custo (R$/kg)</div>
              <div className="col-span-2">% Uso</div>
              <div className="col-span-2">Ação</div>
            </div>

            <div className="space-y-2">
              {mps.map((mp, idx) => (
                <div key={mp.ordem} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-1">
                    <span className="text-xs text-muted-foreground font-mono">{mp.ordem}</span>
                  </div>
                  <div className="col-span-4">
                    <Input
                      placeholder="Ex: PEAD virgem"
                      value={mp.nome}
                      onChange={e => handleMpChange(idx, "nome", e.target.value)}
                      className="h-8 text-sm bg-background/50"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      value={mp.custoKg}
                      onChange={e => handleMpChange(idx, "custoKg", e.target.value)}
                      className="h-8 text-sm bg-background/50 font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="0"
                      value={mp.percentualUso}
                      onChange={e => handleMpChange(idx, "percentualUso", e.target.value)}
                      className="h-8 text-sm bg-background/50 font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-full text-xs"
                      onClick={() => handleSaveMp(idx)}
                      disabled={mp.saving}
                    >
                      {mp.saving ? "..." : "Salvar"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {totalPct > 0 && pctOk && (
              <div className="mt-3 p-3 rounded-md bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-emerald-400 font-medium">✓ Composição válida</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    Custo ponderado: {fmt(
                      mps.reduce((s, m) => s + (parseFloat(m.custoKg) || 0) * (parseFloat(m.percentualUso) || 0), 0) / 100
                    )}/kg
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function Produtos() {
  const { data: produtos, isLoading } = trpc.produtos.list.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando produtos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuração de Produtos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Defina o nome e a composição de matérias-primas de cada produto. O custo médio ponderado
          será usado automaticamente na análise por mix.
        </p>
      </div>

      <div className="space-y-4">
        {produtos?.map(produto => (
          <ProdutoCard key={produto.id} produto={produto} />
        ))}
      </div>

      <Card className="border-border/30 bg-muted/20">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Como funciona:</strong> Para cada produto, informe até 5 matérias-primas
            com o custo por kg e o percentual de uso na mistura. A soma dos percentuais deve ser 100%.
            O custo médio ponderado é calculado automaticamente e usado na Análise por Mix de Produtos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
