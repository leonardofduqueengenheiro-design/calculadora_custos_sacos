import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Package,
  ChevronDown,
  ChevronUp,
  Check,
  Pencil,
  Link2,
  Link2Off,
  RefreshCw,
  Info,
} from "lucide-react";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";

interface MpRow {
  ordem: number;
  nome: string;
  custoKg: string;
  percentualUso: string;
  materiaPrimaId: number | null; // FK para o catálogo global
  saving: boolean;
}

// Catálogo global de MPs (vindo de Custos Variáveis)
interface MpGlobal {
  id: number;
  nome: string;
  custoKg: number;
}

function ProdutoCard({
  produto,
  mpsGlobais,
}: {
  produto: any;
  mpsGlobais: MpGlobal[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingNome, setEditingNome] = useState(false);
  const [nomeEdit, setNomeEdit] = useState(produto.nome);

  useEffect(() => {
    if (!editingNome) setNomeEdit(produto.nome);
  }, [produto.nome, editingNome]);

  const [mps, setMps] = useState<MpRow[]>(
    Array.from({ length: 5 }, (_, i) => {
      const existing = produto.materiasPrimas.find((m: any) => m.ordem === i + 1);
      return {
        ordem: i + 1,
        nome: existing?.nome ?? "",
        custoKg: existing?.custoKg != null ? existing.custoKg.toFixed(4) : "",
        percentualUso: existing?.percentualUso != null ? existing.percentualUso.toFixed(1) : "",
        materiaPrimaId: existing?.materiaPrimaId ?? null,
        saving: false,
      };
    })
  );

  // Sincronizar estado local quando dados do servidor mudam
  useEffect(() => {
    setMps(
      Array.from({ length: 5 }, (_, i) => {
        const existing = produto.materiasPrimas.find((m: any) => m.ordem === i + 1);
        return {
          ordem: i + 1,
          nome: existing?.nome ?? "",
          custoKg: existing?.custoKg != null ? existing.custoKg.toFixed(4) : "",
          percentualUso: existing?.percentualUso != null ? existing.percentualUso.toFixed(1) : "",
          materiaPrimaId: existing?.materiaPrimaId ?? null,
          saving: false,
        };
      })
    );
  }, [produto.materiasPrimas]);

  const updateNomeMutation = trpc.produtos.updateNome.useMutation();
  const updateMpMutation = trpc.produtos.updateMp.useMutation();
  const utils = trpc.useUtils();

  const totalPct = mps.reduce((s, m) => s + (parseFloat(m.percentualUso) || 0), 0);
  const pctOk = Math.abs(totalPct - 100) < 0.1 || totalPct === 0;

  const handleSaveNome = async () => {
    if (!nomeEdit.trim()) return;
    try {
      await updateNomeMutation.mutateAsync({ id: produto.id, nome: nomeEdit });
      await utils.produtos.list.invalidate();
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
        materiaPrimaId: mp.materiaPrimaId,
      });
      utils.produtos.list.invalidate();
      toast.success(`MP ${mp.ordem} salva!`);
    } catch {
      toast.error("Erro ao salvar matéria-prima");
    } finally {
      setMps(prev => prev.map((m, i) => i === idx ? { ...m, saving: false } : m));
    }
  };

  const handleMpChange = (idx: number, field: keyof MpRow, value: string | number | null) => {
    setMps(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  // Vincular uma linha de MP ao catálogo global
  const handleVincular = (idx: number, mpGlobalId: number | null) => {
    if (mpGlobalId === null) {
      // Desvincular: libera edição manual
      setMps(prev => prev.map((m, i) => i === idx ? { ...m, materiaPrimaId: null } : m));
      return;
    }
    const mpGlobal = mpsGlobais.find(m => m.id === mpGlobalId);
    if (!mpGlobal) return;
    setMps(prev => prev.map((m, i) =>
      i === idx
        ? {
            ...m,
            materiaPrimaId: mpGlobalId,
            nome: mpGlobal.nome,
            custoKg: mpGlobal.custoKg.toFixed(4),
          }
        : m
    ));
    toast.info(`MP vinculada a "${mpGlobal.nome}" — clique em Salvar para confirmar`);
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
              <div className="col-span-3">Vincular ao Catálogo</div>
              <div className="col-span-3">Nome da MP</div>
              <div className="col-span-2">Custo (R$/kg)</div>
              <div className="col-span-1">% Uso</div>
              <div className="col-span-2">Ação</div>
            </div>

            <div className="space-y-2">
              {mps.map((mp, idx) => {
                const vinculada = mp.materiaPrimaId !== null;
                return (
                  <div
                    key={mp.ordem}
                    className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg transition-colors"
                    style={{
                      background: vinculada ? "oklch(0.72 0.18 195 / 0.06)" : "transparent",
                      border: vinculada ? "1px solid oklch(0.72 0.18 195 / 0.2)" : "1px solid transparent",
                    }}
                  >
                    {/* Número */}
                    <div className="col-span-1">
                      <span className="text-xs text-muted-foreground font-mono">{mp.ordem}</span>
                    </div>

                    {/* Dropdown de vínculo ao catálogo */}
                    <div className="col-span-3">
                      <div className="flex items-center gap-1">
                        <select
                          value={mp.materiaPrimaId ?? ""}
                          onChange={e => handleVincular(idx, e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full h-8 rounded-md text-xs px-2 outline-none transition-colors"
                          style={{
                            background: "var(--background)",
                            color: vinculada ? "var(--primary)" : "var(--muted-foreground)",
                            border: `1px solid ${vinculada ? "oklch(0.72 0.18 195 / 0.4)" : "var(--border)"}`,
                          }}
                        >
                          <option value="">— Manual —</option>
                          {mpsGlobais.map(mg => (
                            <option key={mg.id} value={mg.id}>
                              {mg.nome} ({fmt(mg.custoKg)}/kg)
                            </option>
                          ))}
                        </select>
                        {vinculada && (
                          <Link2 className="h-3 w-3 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </div>

                    {/* Nome */}
                    <div className="col-span-3">
                      <Input
                        placeholder="Ex: PEAD virgem"
                        value={mp.nome}
                        onChange={e => handleMpChange(idx, "nome", e.target.value)}
                        disabled={vinculada}
                        className="h-8 text-sm bg-background/50"
                        style={vinculada ? { opacity: 0.7, cursor: "not-allowed" } : {}}
                      />
                    </div>

                    {/* Custo */}
                    <div className="col-span-2">
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0,00"
                          value={mp.custoKg}
                          onChange={e => handleMpChange(idx, "custoKg", e.target.value)}
                          disabled={vinculada}
                          className="h-8 text-sm bg-background/50 font-mono"
                          style={vinculada ? { opacity: 0.7, cursor: "not-allowed" } : {}}
                        />
                        {vinculada && (
                          <div
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                            title="Custo sincronizado automaticamente com Custos Variáveis"
                          >
                            <RefreshCw className="h-3 w-3 text-primary" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Percentual */}
                    <div className="col-span-1">
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

                    {/* Salvar */}
                    <div className="col-span-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-full text-xs"
                        onClick={() => handleSaveMp(idx)}
                        disabled={mp.saving}
                      >
                        {mp.saving ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Salvar"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Nota sobre vínculo */}
            <div className="mt-3 p-3 rounded-md bg-primary/5 border border-primary/20 flex items-start gap-2">
              <Info className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Vínculo automático:</strong> ao selecionar uma MP do catálogo (dropdown), o custo será atualizado automaticamente sempre que você alterar o valor em <strong className="text-foreground">Custos Variáveis</strong>. Linhas com <Link2 className="inline h-3 w-3 text-primary" /> têm custo somente-leitura e sincronizado.
              </p>
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
  const { data: mpsGlobais } = trpc.materiasPrimas.listParaVinculo.useQuery();
  const syncCustosMutation = trpc.produtos.syncCustos.useMutation();
  const utils = trpc.useUtils();

  const handleSyncCustos = async () => {
    try {
      const res = await syncCustosMutation.mutateAsync();
      await utils.produtos.list.invalidate();
      if (res.linhasAtualizadas > 0) {
        toast.success(`${res.linhasAtualizadas} linha(s) de MP atualizada(s) com os custos atuais!`);
      } else {
        toast.info("Nenhuma MP vinculada encontrada. Vincule MPs ao catálogo para sincronização automática.");
      }
    } catch {
      toast.error("Erro ao sincronizar custos");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando produtos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configuração de Produtos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Defina o nome e a composição de matérias-primas de cada produto. Vincule as MPs ao
            catálogo global para que os custos sejam atualizados automaticamente.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSyncCustos}
          disabled={syncCustosMutation.isPending}
          className="gap-2 flex-shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${syncCustosMutation.isPending ? "animate-spin" : ""}`} />
          Sincronizar Custos
        </Button>
      </div>

      {/* Banner explicativo */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Link2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-primary">Como funciona a sincronização?</p>
              <p className="text-xs text-muted-foreground">
                Cada linha de MP pode ser <strong className="text-foreground">vinculada</strong> a uma MP do catálogo global (aba <strong className="text-foreground">Custos Variáveis</strong>).
                Quando vinculada, o custo por kg é atualizado automaticamente sempre que você salvar um novo valor em Custos Variáveis — sem precisar editar cada produto manualmente.
                O percentual de uso (%) permanece editável em cada produto, pois pode variar conforme a fórmula de cada saco.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {produtos?.map(produto => (
          <ProdutoCard
            key={produto.id}
            produto={produto}
            mpsGlobais={mpsGlobais ?? []}
          />
        ))}
      </div>

      <Card className="border-border/30 bg-muted/20">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Dica:</strong> Para cada produto, informe até 5 matérias-primas
            com o custo por kg e o percentual de uso na mistura. A soma dos percentuais deve ser 100%.
            Use o dropdown <strong className="text-foreground">"Vincular ao Catálogo"</strong> para conectar cada MP ao registro global —
            assim, ao atualizar o preço de compra em Custos Variáveis, todos os produtos são atualizados automaticamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
