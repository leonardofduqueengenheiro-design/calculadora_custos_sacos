import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Zap,
  Settings,
  TrendingUp,
  History,
  Factory,
  ChevronRight,
  Upload,
  Package,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Visão geral",
  },
  {
    href: "/simulador",
    label: "Simulador",
    icon: TrendingUp,
    description: "Margem e preço",
  },
  {
    href: "/custos-fixos",
    label: "Custos Fixos",
    icon: Users,
    description: "Folha, energia, etc.",
  },
  {
    href: "/custos-variaveis",
    label: "Custos Variáveis",
    icon: Zap,
    description: "Matéria-prima, SIMPLES",
  },
  {
    href: "/parametros",
    label: "Produção",
    icon: Factory,
    description: "Parâmetros operacionais",
  },
  {
    href: "/historico",
    label: "Histórico",
    icon: History,
    description: "Simulações salvas",
  },
  {
    href: "/produtos",
    label: "Produtos",
    icon: Package,
    description: "Composição de MPs",
  },
  {
    href: "/analise-mix",
    label: "Análise por Mix",
    icon: BarChart3,
    description: "Margem por produto",
  },
  {
    href: "/otimizador-mix",
    label: "Otimizador de Mix",
    icon: Sparkles,
    description: "Mix ideal para maior margem",
  },
  {
    href: "/importar",
    label: "Importar Planilha",
    icon: Upload,
    description: "Atualizar com Excel",
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen" style={{ background: "var(--background)" }}>
      {/* Sidebar */}
      <aside
        className="fixed left-0 top-0 h-full w-64 flex flex-col z-40"
        style={{
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border)",
        }}
      >
        {/* Logo */}
        <div className="px-6 py-6 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "oklch(0.72 0.18 195 / 0.15)", border: "1px solid oklch(0.72 0.18 195 / 0.3)" }}
            >
              <Factory className="w-5 h-5" style={{ color: "var(--primary)" }} />
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
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 group",
                    isActive
                      ? "card-glow"
                      : "hover:bg-white/5"
                  )}
                  style={
                    isActive
                      ? {
                          background: "oklch(0.72 0.18 195 / 0.12)",
                          border: "1px solid oklch(0.72 0.18 195 / 0.2)",
                        }
                      : {}
                  }
                >
                  <Icon
                    className="w-4 h-4 flex-shrink-0 transition-colors"
                    style={{ color: isActive ? "var(--primary)" : "var(--muted-foreground)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium leading-tight"
                      style={{ color: isActive ? "var(--foreground)" : "var(--foreground)" }}
                    >
                      {item.label}
                    </p>
                    <p className="text-xs leading-tight truncate" style={{ color: "var(--muted-foreground)" }}>
                      {item.description}
                    </p>
                  </div>
                  {isActive && (
                    <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: "var(--primary)" }} />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Dados baseados em médias reais
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            Período: 17 meses
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 min-h-screen">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
