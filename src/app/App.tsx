import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { router } from './routes';
import { useEffect } from 'react';
import { processRecurringIfNeeded } from './utils/recurringProcessor';
import { useReducedMotion } from './hooks/useReducedMotion';

function AppContent() {
  const { isLoading } = useAuth();
  useReducedMotion();

  // Run recurring processor once auth is ready
  useEffect(() => {
    if (!isLoading) {
      processRecurringIfNeeded().catch((err: unknown) => {
        console.error('[recurring] failed:', err);
      });
    }
  }, [isLoading]);

  // RouterProvider renders immediately — ProtectedRoute handles isLoading internally
  // so there is no global auth gate delaying the router and LCP.
  return <RouterProvider router={router} />;
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
