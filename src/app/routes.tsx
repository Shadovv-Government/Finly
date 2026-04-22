import type { ComponentType, ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './Layout';
import { useAuth } from './contexts/AuthContext';
import { LockScreen } from './screens/LockScreen';

const lazyRoute = <T extends Record<string, ComponentType<any>>>(
  loader: () => Promise<T>,
  exportName: keyof T,
) => async () => {
  const mod = await loader();
  return { Component: mod[exportName] };
};

export function resolveProtectedRoute({
  user,
  onboardingComplete,
  biometricEnabled,
  biometricLocked,
}: {
  user: { id: string } | null;
  onboardingComplete: boolean;
  biometricEnabled: boolean;
  biometricLocked: boolean;
}): '/register' | '/onboarding' | 'lock' | null {
  if (!user) return '/register';
  if (!onboardingComplete) return '/onboarding';
  if (biometricEnabled && biometricLocked) return 'lock';
  return null;
}

// Protected route wrapper
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, biometric, onboardingComplete } = useAuth();
  const redirect = resolveProtectedRoute({
    user,
    onboardingComplete,
    biometricEnabled: biometric.isEnabled,
    biometricLocked: biometric.isLocked,
  });

  if (redirect === '/register' || redirect === '/onboarding') {
    return <Navigate to={redirect} replace />;
  }
  if (redirect === 'lock') {
    return <LockScreen />;
  }
  return <>{children}</>;
}

function AppLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/onboarding',
    lazy: lazyRoute(() => import('./screens/Onboarding'), 'Onboarding'),
  },
  {
    path: '/register',
    lazy: lazyRoute(() => import('./screens/Registration'), 'Registration'),
  },
  {
    path: '/privacy',
    lazy: lazyRoute(() => import('./screens/PrivacyPolicy'), 'PrivacyPolicy'),
  },
  {
    path: '/terms',
    lazy: lazyRoute(() => import('./screens/TermsOfService'), 'TermsOfService'),
  },
  {
    path: '/',
    Component: () => (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    HydrateFallback: AppLoading,
    children: [
      { index: true, lazy: lazyRoute(() => import('./screens/Dashboard'), 'Dashboard') },
      { path: 'history', lazy: lazyRoute(() => import('./screens/TransactionHistory'), 'TransactionHistory') },
      { path: 'analytics', lazy: lazyRoute(() => import('./screens/Analytics'), 'Analytics') },
      { path: 'settings', lazy: lazyRoute(() => import('./screens/Settings'), 'Settings') },
      { path: 'budgets', lazy: lazyRoute(() => import('./screens/Budgets'), 'Budgets') },
      { path: 'goals', lazy: lazyRoute(() => import('./screens/Goals'), 'Goals') },
      { path: 'recurring', lazy: lazyRoute(() => import('./screens/RecurringScreen'), 'Recurring') },
      { path: 'categories', lazy: lazyRoute(() => import('./screens/Categories'), 'Categories') },
      { path: 'ai-assistant', lazy: lazyRoute(() => import('./screens/AIAssistant'), 'AIAssistant') },
      { path: 'components', lazy: lazyRoute(() => import('./screens/ComponentShowcase'), 'ComponentShowcase') },
    ],
  },
]);
