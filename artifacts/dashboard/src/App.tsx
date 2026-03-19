import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner"; // Using sonner as requested
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Scrape from "@/pages/scrape";
import JobsList from "@/pages/jobs/index";
import JobDetail from "@/pages/jobs/[id]";
import Credits from "@/pages/credits";
import Settings from "@/pages/settings";

import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

const queryClient = new QueryClient();

function AuthGuard({ children, requireAuth = true }: { children: React.ReactNode, requireAuth?: boolean }) {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    
    // In a real app with working Supabase, uncomment this to enforce routing
    // if (requireAuth && !user) {
    //   setLocation("/login");
    // } else if (!requireAuth && user) {
    //   setLocation("/scrape");
    // }
  }, [user, isLoading, location, requireAuth, setLocation]);

  // If loading, show skeleton page
  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      {/* Public / Auth Routes */}
      <Route path="/login">
        <AuthGuard requireAuth={false}><Login /></AuthGuard>
      </Route>
      <Route path="/signup">
        <AuthGuard requireAuth={false}><Signup /></AuthGuard>
      </Route>

      {/* Protected Dashboard Routes */}
      <Route path="/">
        {() => {
          window.location.replace("/dashboard/scrape");
          return null;
        }}
      </Route>
      <Route path="/scrape">
        <AuthGuard><Scrape /></AuthGuard>
      </Route>
      <Route path="/jobs">
        <AuthGuard><JobsList /></AuthGuard>
      </Route>
      <Route path="/jobs/:id">
        <AuthGuard><JobDetail /></AuthGuard>
      </Route>
      <Route path="/credits">
        <AuthGuard><Credits /></AuthGuard>
      </Route>
      <Route path="/settings">
        <AuthGuard><Settings /></AuthGuard>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

export default App;
