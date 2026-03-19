import { useEffect } from 'react';
import { Switch, Route, useLocation, Router as WouterRouter } from 'wouter';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { Toaster } from 'sonner';
import LoginPage from '@/pages/LoginPage';
import OverviewPage from '@/pages/OverviewPage';
import UsersPage from '@/pages/UsersPage';
import UserDetailPage from '@/pages/UserDetailPage';
import JobsPage from '@/pages/JobsPage';
import PaymentsPage from '@/pages/PaymentsPage';
import PlansPage from '@/pages/PlansPage';
import PackagesPage from '@/pages/PackagesPage';
import ApiKeysPage from '@/pages/ApiKeysPage';
import SettingsPage from '@/pages/SettingsPage';
import AnnouncementsPage from '@/pages/AnnouncementsPage';
import IpBlocklistPage from '@/pages/IpBlocklistPage';
import AuditLogPage from '@/pages/AuditLogPage';
import AdminsPage from '@/pages/AdminsPage';

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

function RedirectToDefault() {
  const { admin, loading } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (!loading) {
      if (admin) setLocation('/overview');
      else setLocation('/login');
    }
  }, [admin, loading]);
  return null;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/overview" component={OverviewPage} />
      <Route path="/users/:id" component={UserDetailPage} />
      <Route path="/users" component={UsersPage} />
      <Route path="/jobs" component={JobsPage} />
      <Route path="/payments" component={PaymentsPage} />
      <Route path="/plans" component={PlansPage} />
      <Route path="/packages" component={PackagesPage} />
      <Route path="/api-keys" component={ApiKeysPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/announcements" component={AnnouncementsPage} />
      <Route path="/ip-blocklist" component={IpBlocklistPage} />
      <Route path="/audit-log" component={AuditLogPage} />
      <Route path="/admins" component={AdminsPage} />
      <Route component={RedirectToDefault} />
    </Switch>
  );
}

export default function App() {
  return (
    <WouterRouter base={base}>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <AppRoutes />
      </AuthProvider>
    </WouterRouter>
  );
}
