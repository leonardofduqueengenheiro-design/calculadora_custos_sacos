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
  RefreshCw,
  Info,
  AlertTriangle,
  DollarSign,
  Wrench,
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
  materiaPrimaId: number | null;
  saving: boolean;
}

interface MpGlobal {
  id: number;
  nome: string;
  custoKg: number;
}

interface CustoDesatualizado {
  produtoMpId: number;
  produtoId: number;
  ordem: number;
  nomeProdutoMp: string;
  materiaPrimaId: number;
  nomeGlobal: string;
  custoAtualProduto: number;
  custoGlobal: number;
}

function ProdutoCard({
  produto,
  mpsGlobais,
  desatualizados,
  onCorrigir,
}: {
  produto: any;
  mpsGlobais: MpGlobal[];
  desatualizados: CustoDesatualizado[];
  onCorrigir: (produtoId: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingNome, setEditingNome] = useState(false);
  const [nomeEdit, setNomeEdit] = useState(produto.nome);
  const [precoEdit, setPrecoEdit] = useState<string>(
    produto.precoVendaPadrao != null ? produto.precoVendaPadrao.toFixed(2) : ""
  );
  const [savingPreco, setSavingPreco] = useState(false);

  useEffect(() => {
    if (!editingNome) setNomeEdit(produto.nome);
  }, [produto.nome, editingNome]);

  useEffect(() => {
    setPrecoEdit(produto.precoVendaPadrao != null ? produto.precoVendaPadrao.toFixed(2) : "");
  }, [produto.precoVendaPadrao]);

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
  const updatePrecoMutation = trpc.produtos.updatePreco.useMutation();
  const utils = trpc.useUtils();

  const totalPct = mps.reduce((s, m) => s + (parseFloat(m.percentualUso) || 0), 0);
  const pctOk = Math.abs(totalPct - 100) < 0.1 || totalPct === 0;

  // MPs deste produto com custo desatualizado
  const mpDesatualizadasDoProduto = desatualizados.filter(d => d.produtoId === produto.id);
  const temDesatualizado = mpDesatualizadasDoProduto.length > 0;

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

  const handleSavePreco = async () => {
    setSavingPreco(true);
    try {
      const preco = precoEdit.trim() === "" ? null : parseFloat(precoEdit);
      await updatePrecoMutation.mutateAsync({
        id: produto.id,
        precoVendaPadrao: preco,
      });
      await utils.produtos.list.invalidate();
      toast.success("Preço padrão salvo!");
    } catch {
      toast.error("Erro ao salvar preço");
    } finally {
      setSavingPreco(false);
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
      utils.produtos.custosDesatualizados.invalidate();
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

  const handleVincular = (idx: number, mpGlobalId: number | null) => {
    if (mpGlobalId === null) {
      setMps(prev => prev.map((m, i) => i === idx ? { ...m, materiaPrimaId: null } : m));
      return;
    }
    const mpGlobal = mpsGlobais.find(m => m.id === mpGlobalId);
    if (!mpGlobal) return;
    setMps(prev => prev.map((m, i) =>
      i === idx
        ? { ...m, materiaPrimaId: mpGlobalId, nome: mpGlobal.nome, custoKg: mpGlobal.custoKg.toFixed(4) }
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
                {temDesatualizado && (
                  <Badge
                    variant="destructive"
                    className="text-xs gap-1 cursor-pointer"
                    onClick={() => setExpanded(true)}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {mpDesatualizadasDoProduto.length} MP{mpDesatualizadasDoProduto.length > 1 ? "s" : ""} desatualizada{mpDesatualizadasDoProduto.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Preço de venda padrão */}
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Preço padrão/kg"
                value={precoEdit}
                onChange={e => setPrecoEdit(e.target.value)}
                onBlur={handleSavePreco}
                onKeyDown={e => e.key === "Enter" && handleSavePreco()}
                className="h-7 text-xs w-32 font-mono"
                title="Preço de venda padrão (R$/kg) — pré-preenche Análise por Mix e Otimizador"
              />
              {savingPreco && <RefreshCw className="h-3 w-3 animate-spin text-primary" />}
            </div>
            {produto.custoMpKg > 0 && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Custo MP</p>
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

          {/* Alerta de custos desatualizados */}
          {temDesatualizado && (
            <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-400">Custos desatualizados detectados</p>
                  <div className="mt-1 space-y-1">
                    {mpDesatualizadasDoProduto.map(d => (
                      <p key={d.produtoMpId} className="text-xs text-muted-foreground">
                        <strong className="text-foreground">{d.nomeProdutoMp}</strong>: armazenado{" "}
                        <span className="font-mono text-red-400">{fmt(d.custoAtualProduto)}/kg</span>
                        {" "}→ catálogo{" "}
                        <span className="font-mono text-emerald-400">{fmt(d.custoGlobal)}/kg</span>
                      </p>
                    ))}
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10 flex-shrink-0"
                onClick={() => onCorrigir(produto.id)}
              >
                <Wrench className="h-3 w-3" />
                Corrigir
              </Button>
            </div>
          )}

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
                const desatualizada = desatualizados.some(
                  d => d.produtoId === produto.id && d.ordem === mp.ordem
                );
                return (
                  <div
                    key={mp.ordem}
                    className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg transition-colors"
                    style={{
                      background: desatualizada
                        ? "oklch(0.75 0.18 80 / 0.06)"
                        : vinculada
                        ? "oklch(0.72 0.18 195 / 0.06)"
                        : "transparent",
                      border: desatualizada
                        ? "1px solid oklch(0.75 0.18 80 / 0.3)"
                        : vinculada
                        ? "1px solid oklch(0.72 0.18 195 / 0.2)"
                        : "1px solid transparent",
                    }}
                  >
                    <div className="col-span-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground font-mono">{mp.ordem}</span>
                        {desatualizada && (
                          <span title="Custo desatualizado"><AlertTriangle className="h-3 w-3 text-amber-400" /></span>
                        )}
                      </div>
                    </div>

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
                        {vinculada && <Link2 className="h-3 w-3 text-primary flex-shrink-0" />}
                      </div>
                    </div>

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
                          <div className="absolute right-2 top-1/2 -translate-y-1/2" title="Custo sincronizado automaticamente">
                            <span title="Custo sincronizado automaticamente"><RefreshCw className="h-3 w-3 text-primary" /></span>
                          </div>
                        )}
                      </div>
                    </div>

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

            <div className="mt-3 p-3 rounded-md bg-primary/5 border border-primary/20 flex items-start gap-2">
              <Info className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Vínculo automático:</strong> ao selecionar uma MP do catálogo, o custo é atualizado automaticamente ao salvar em <strong className="text-foreground">Custos Variáveis</strong>. Linhas com <Link2 className="inline h-3 w-3 text-primary" /> têm custo somente-leitura.
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
  const { data: desatualizados = [] } = trpc.produtos.custosDesatualizados.useQuery();
  const syncCustosMutation = trpc.produtos.syncCustos.useMutation();
  const utils = trpc.useUtils();

  const totalDesatualizados = desatualizados.length;

  const handleSyncCustos = async () => {
    try {
      const res = await syncCustosMutation.mutateAsync();
      await utils.produtos.list.invalidate();
      await utils.produtos.custosDesatualizados.invalidate();
      if (res.linhasAtualizadas > 0) {
        toast.success(`${res.linhasAtualizadas} linha(s) de MP atualizada(s) com os custos atuais!`);
      } else {
        toast.info("Nenhuma MP vinculada encontrada.");
      }
    } catch {
      toast.error("Erro ao sincronizar custos");
    }
  };

  const syncCustosProdutoMutation = trpc.produtos.syncCustosProduto.useMutation();

  const handleCorrigirProduto = async (produtoId: number) => {
    try {
      const res = await syncCustosProdutoMutation.mutateAsync({ produtoId });
      await utils.produtos.list.invalidate();
      await utils.produtos.custosDesatualizados.invalidate();
      if (res.linhasAtualizadas > 0) {
        toast.success(`${res.linhasAtualizadas} MP(s) corrigida(s) para este produto!`);
      } else {
        toast.info("Nenhuma MP desatualizada encontrada para este produto.");
      }
    } catch {
      toast.error("Erro ao corrigir custos");
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
            Defina o nome, preço de venda padrão e composição de matérias-primas de cada produto.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalDesatualizados > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {totalDesatualizados} desatualizado{totalDesatualizados > 1 ? "s" : ""}
            </Badge>
          )}
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
      </div>

      {/* Banner explicativo */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <DollarSign className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-primary">Preço de Venda Padrão</p>
              <p className="text-xs text-muted-foreground">
                Informe o <strong className="text-foreground">preço de venda padrão (R$/kg)</strong> de cada produto no campo ao lado do nome.
                Esse valor pré-preenche automaticamente a <strong className="text-foreground">Análise por Mix</strong> e o <strong className="text-foreground">Otimizador de Mix</strong>,
                eliminando a necessidade de digitar os preços a cada uso. Você ainda pode ajustá-los manualmente nessas páginas quando necessário.
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
            desatualizados={desatualizados}
            onCorrigir={handleCorrigirProduto}
          />
        ))}
      </div>

      <Card className="border-border/30 bg-muted/20">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Dica:</strong> Para cada produto, informe até 5 matérias-primas com custo e percentual de uso (deve somar 100%).
            Use o dropdown <strong className="text-foreground">"Vincular ao Catálogo"</strong> para conectar cada MP ao registro global —
            assim, ao atualizar o preço em Custos Variáveis, todos os produtos são atualizados automaticamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
