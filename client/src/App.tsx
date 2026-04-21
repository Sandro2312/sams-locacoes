import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Orcamento from "./pages/Orcamento";
import Blog from "./pages/Blog";
import BlogArtigo from "./pages/BlogArtigo";
import Feiras2026 from "./pages/Feiras2026";

// Componente que força saída do SPA para o CRM estático
function CrmRedirect() {
  if (typeof window !== "undefined") {
    window.location.replace("/crm/index.html");
  }
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a1628", color: "#c9a84c", fontFamily: "sans-serif", flexDirection: "column", gap: "16px" }}>
      <div style={{ fontSize: "24px", fontWeight: "bold" }}>SAMS CRM</div>
      <div style={{ fontSize: "14px", opacity: 0.7 }}>Redirecionando para o sistema...</div>
    </div>
  );
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/orcamento"} component={Orcamento} />
      <Route path={"/blog"} component={Blog} />
      <Route path={"/blog/:slug"} component={BlogArtigo} />
      <Route path={"/feiras-2026"} component={Feiras2026} />
      <Route path={"/404"} component={NotFound} />
      <Route path={"/crm"} component={CrmRedirect} />
      <Route path={"/crm/:rest*"} component={CrmRedirect} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
