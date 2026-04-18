import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import Signup from "@/pages/signup";
import AuthCallback from "@/pages/auth/callback";
import Scrape from "@/pages/scrape";
import JobsList from "@/pages/jobs/index";
import JobDetail from "@/pages/jobs/[id]";
import Credits from "@/pages/credits";
import Settings from "@/pages/settings";

import { useAuth } from "@/hooks/use-auth";
import { SuspendedScreen } from "@/components/SuspendedScreen";
import { MaintenanceScreen } from "@/components/MaintenanceScreen";
import { usePlatformSettings } from "@/hooks/use-platform-settings";
import { useEffect } from "react";

const queryClient = new QueryClient();

function AuthGuard({ children, requireAuth = true }: { children: React.ReactNode, requireAuth?: boolean }) {
  const { user, profile, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (requireAuth && !user) {
      setLocation("/login");
    } else if (!requireAuth && user) {
      setLocation("/scrape");
    }
  }, [user, isLoading, requireAuth, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (requireAuth && !user) return null;
  if (!requireAuth && user) return null;

  if (requireAuth && user && profile?.is_suspended) {
    return <SuspendedScreen profile={profile} />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth/callback">
        <AuthCallback />
      </Route>

      <Route path="/login">
        <AuthGuard requireAuth={false}><Login /></AuthGuard>
      </Route>
      <Route path="/signup">
        <AuthGuard requireAuth={false}><Signup /></AuthGuard>
      </Route>

      <Route path="/">
        {() => {
          const { user, isLoading } = useAuth();
          const [_, setLocation] = useLocation();
          
          useEffect(() => {
            if (isLoading) return;
            if (user) setLocation("/scrape");
            else setLocation("/login");
          }, [user, isLoading, setLocation]);
          
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

function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { settings, isLoading } = usePlatformSettings();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (settings?.maintenance_mode) {
    return <MaintenanceScreen />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <MaintenanceGate>
          <Router />
        </MaintenanceGate>
      </WouterRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

export default App;
