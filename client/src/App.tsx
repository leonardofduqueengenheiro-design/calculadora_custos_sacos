import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import CustosFixos from "./pages/CustosFixos";
import CustosVariaveis from "./pages/CustosVariaveis";
import Parametros from "./pages/Parametros";
import Simulador from "./pages/Simulador";
import Historico from "./pages/Historico";
import HistoricoDados from "./pages/HistoricoDados";
import Importar from "./pages/Importar";
import Produtos from "./pages/Produtos";
import AnaliseMix from "./pages/AnaliseMix";
import OtimizadorMix from "./pages/OtimizadorMix";
import AppLayout from "./components/AppLayout";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/custos-fixos" component={CustosFixos} />
        <Route path="/custos-variaveis" component={CustosVariaveis} />
        <Route path="/parametros" component={Parametros} />
        <Route path="/simulador" component={Simulador} />
        <Route path="/historico" component={Historico} />
        <Route path="/historico-dados" component={HistoricoDados} />
        <Route path="/importar" component={Importar} />
        <Route path="/produtos" component={Produtos} />
        <Route path="/analise-mix" component={AnaliseMix} />
        <Route path="/otimizador-mix" component={OtimizadorMix} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster theme="dark" position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
