import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { router } from './routes';
import { useEffect, useState } from 'react';
import { processRecurringIfNeeded } from './utils/recurringProcessor';
import { useReducedMotion } from './hooks/useReducedMotion';

const AUTH_TIMEOUT_MS = 8000;

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useReducedMotion();

  useEffect(() => {
    if (!isLoading) return;
    const id = setTimeout(() => setTimedOut(true), AUTH_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading) {
      processRecurringIfNeeded().catch((err: unknown) => {
        console.error('[recurring] failed:', err);
      });
    }
  }, [isLoading]);

  if (isLoading && !timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppContent() {
  return (
    <AuthGuard>
      <RouterProvider router={router} />
    </AuthGuard>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SettingsProvider>
          <AuthProvider>
            <AppContent />
            <Toaster />
          </AuthProvider>
        </SettingsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
