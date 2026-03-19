import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      {/* Fallback for the dummy dashboard/login routes requested in the prompt */}
      <Route path="/dashboard" component={() => (
        <div className="min-h-screen flex items-center justify-center flex-col gap-4">
          <h1 className="text-2xl font-bold font-display">Dashboard / Sign Up</h1>
          <p className="text-muted-foreground">This is a simulated page transition.</p>
          <a href="/" className="text-primary hover:underline">Go back home</a>
        </div>
      )} />
      <Route path="/dashboard/scrape" component={() => (
        <div className="min-h-screen flex items-center justify-center flex-col gap-4">
          <h1 className="text-2xl font-bold font-display">Scraping Tool Initiated</h1>
          <p className="text-muted-foreground">URL parameter captured successfully.</p>
          <a href="/" className="text-primary hover:underline">Go back home</a>
        </div>
      )} />
      <Route path="/login" component={() => (
        <div className="min-h-screen flex items-center justify-center flex-col gap-4">
          <h1 className="text-2xl font-bold font-display">Login Portal</h1>
          <a href="/" className="text-primary hover:underline">Go back home</a>
        </div>
      )} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
