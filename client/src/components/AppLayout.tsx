import { Link, useLocation } from "wouter";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Zap,
  TrendingUp,
  History,
  Factory,
  ChevronRight,
  Upload,
  Package,
  BarChart3,
  Sparkles,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, description: "Visão geral" },
  { href: "/simulador", label: "Simulador", icon: TrendingUp, description: "Margem e preço" },
  { href: "/custos-fixos", label: "Custos Fixos", icon: Users, description: "Folha, energia, etc." },
  { href: "/custos-variaveis", label: "Custos Variáveis", icon: Zap, description: "Matéria-prima, SIMPLES" },
  { href: "/parametros", label: "Produção", icon: Factory, description: "Parâmetros operacionais" },
  { href: "/historico", label: "Histórico", icon: History, description: "Simulações salvas" },
  { href: "/produtos", label: "Produtos", icon: Package, description: "Composição de MPs" },
  { href: "/analise-mix", label: "Análise por Mix", icon: BarChart3, description: "Margem por produto" },
  { href: "/otimizador-mix", label: "Otimizador de Mix", icon: Sparkles, description: "Mix ideal para maior margem" },
  { href: "/importar", label: "Importar Planilha", icon: Upload, description: "Atualizar com Excel" },
];

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: "oklch(0.72 0.18 195 / 0.15)",
          border: "1px solid oklch(0.72 0.18 195 / 0.3)",
        }}
      >
        <Factory className="h-5 w-5" style={{ color: "var(--primary)" }} />
      </div>
      <div>
        <p className="text-sm font-semibold leading-tight" style={{ color: "var(--foreground)" }}>
          Gestão Industrial
        </p>
        <p className="text-xs leading-tight" style={{ color: "var(--muted-foreground)" }}>
          Sacos Plásticos
        </p>
      </div>
    </div>
  );
}

function NavigationContent({
  location,
  onNavigate,
}: {
  location: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Navegação principal">
        {navItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href} onClick={onNavigate}>
              <div
                className={cn(
                  "group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-150",
                  isActive ? "card-glow" : "hover:bg-white/5"
                )}
                style={
                  isActive
                    ? {
                        background: "oklch(0.72 0.18 195 / 0.12)",
                        border: "1px solid oklch(0.72 0.18 195 / 0.2)",
                      }
                    : undefined
                }
              >
                <Icon
                  className="h-4 w-4 shrink-0 transition-colors"
                  style={{ color: isActive ? "var(--primary)" : "var(--muted-foreground)" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight" style={{ color: "var(--foreground)" }}>
                    {item.label}
                  </p>
                  <p className="truncate text-xs leading-tight" style={{ color: "var(--muted-foreground)" }}>
                    {item.description}
                  </p>
                </div>
                {isActive && <ChevronRight className="h-3 w-3 shrink-0" style={{ color: "var(--primary)" }} />}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="border-t px-6 py-4" style={{ borderColor: "var(--sidebar-border)" }}>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Dados baseados em médias reais</p>
        <p className="mt-0.5 text-xs" style={{ color: "var(--muted-foreground)" }}>Período: 17 meses</p>
      </div>
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeItem = navItems.find((item) => item.href === location);

  return (
    <div className="flex min-h-screen overflow-x-clip" style={{ background: "var(--background)" }}>
      <aside
        className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col md:flex"
        style={{
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border)",
        }}
      >
        <div className="border-b px-6 py-6" style={{ borderColor: "var(--sidebar-border)" }}>
          <Brand />
        </div>
        <NavigationContent location={location} />
      </aside>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          className="w-[min(19rem,86vw)] gap-0 border-r p-0"
          style={{ background: "var(--sidebar-bg)", borderColor: "var(--sidebar-border)" }}
        >
          <SheetHeader className="border-b px-5 py-5 text-left" style={{ borderColor: "var(--sidebar-border)" }}>
            <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
            <Brand />
          </SheetHeader>
          <NavigationContent location={location} onNavigate={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className="min-w-0 flex-1 md:ml-64">
        <header
          className="sticky top-0 z-30 flex h-15 items-center gap-3 border-b px-4 backdrop-blur md:hidden"
          style={{
            background: "oklch(0.08 0.008 260 / 0.94)",
            borderColor: "var(--sidebar-border)",
            paddingTop: "env(safe-area-inset-top)",
            height: "calc(3.75rem + env(safe-area-inset-top))",
          }}
        >
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Abrir menu de navegação"
          >
            <Menu className="h-5 w-5" style={{ color: "var(--foreground)" }} />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              {activeItem?.label ?? "Gestão Industrial"}
            </p>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Sacos Plásticos</p>
          </div>
        </header>

        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
