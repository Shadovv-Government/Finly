import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './Layout';
import { Dashboard } from './screens/Dashboard';
import { TransactionHistory } from './screens/TransactionHistory';
import { Analytics } from './screens/Analytics';
import { Settings } from './screens/Settings';
import { Budgets } from './screens/Budgets';
import { Goals } from './screens/Goals';
import { Categories } from './screens/Categories';
import { AIAssistant } from './screens/AIAssistant';
import { Onboarding } from './screens/Onboarding';
import { ComponentShowcase } from './screens/ComponentShowcase';
import { Registration } from './screens/Registration';
import { PrivacyPolicy } from './screens/PrivacyPolicy';
import { TermsOfService } from './screens/TermsOfService';
import { useAuth } from './contexts/AuthContext';
import { LockScreen } from './screens/LockScreen';

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, biometric } = useAuth();
  if (!user) {
    return <Navigate to="/register" replace />;
  }
  if (biometric.isEnabled && biometric.isLocked) {
    return <LockScreen />;
  }
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: '/onboarding',
    Component: Onboarding,
  },
  {
    path: '/register',
    Component: Registration,
  },
  {
    path: '/privacy',
    Component: PrivacyPolicy,
  },
  {
    path: '/terms',
    Component: TermsOfService,
  },
  {
    path: '/',
    Component: () => (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, Component: Dashboard },
      { path: 'history', Component: TransactionHistory },
      { path: 'analytics', Component: Analytics },
      { path: 'settings', Component: Settings },
      { path: 'budgets', Component: Budgets },
      { path: 'goals', Component: Goals },
      { path: 'categories', Component: Categories },
      { path: 'ai-assistant', Component: AIAssistant },
      { path: 'components', Component: ComponentShowcase },
    ],
  },
]);