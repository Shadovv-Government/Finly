import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from './components/ui/sonner';
import { router } from './routes';

export default function App() {
  useEffect(() => {
    // Check if onboarding is completed
    const hasCompletedOnboarding = localStorage.getItem('finly-onboarding-completed');
    if (!hasCompletedOnboarding && window.location.pathname !== '/onboarding') {
      window.location.href = '/onboarding';
    }
  }, []);

  return (
    <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider>
  );
}
