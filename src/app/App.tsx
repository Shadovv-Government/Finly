import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { router } from './routes';
import { useEffect } from 'react';
import { processRecurringIfNeeded } from './utils/recurringProcessor';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();

  // Process recurring payments on app start
  useEffect(() => {
    if (!isLoading) {
      processRecurringIfNeeded();
    }
  }, [isLoading]);

  if (isLoading) {
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
        <AuthProvider>
          <AppContent />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
