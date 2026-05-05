import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { BottomNav } from './components/BottomNav';
import { BottomSheet } from './components/BottomSheet';
import { ErrorBoundary } from './components/ErrorBoundary';

const AIQuickInput = lazy(() => import('./components/AIQuickInput').then(m => ({ default: m.AIQuickInput })));
const AddTransactionForm = lazy(() => import('./components/AddTransactionForm').then(m => ({ default: m.AddTransactionForm })));

type QuickInputTab = 'ai' | 'manual';

export const Layout = () => {
  const SHEET_SWITCH_DELAY_MS = 240;
  const location = useLocation();
  const hideNavOnPaths = ['/onboarding'];
  const showNav = !hideNavOnPaths.includes(location.pathname);
  const [isQuickInputOpen, setIsQuickInputOpen] = useState(false);
  const [quickInputSessionKey, setQuickInputSessionKey] = useState(0);
  const [quickInputAutoStartVoice, setQuickInputAutoStartVoice] = useState(false);
  const [quickInputTab, setQuickInputTab] = useState<QuickInputTab>('ai');
  const sheetSwitchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openQuickInput = (autoStartVoice: boolean) => {
    setQuickInputAutoStartVoice(autoStartVoice);
    setQuickInputTab('ai');
    setQuickInputSessionKey(prev => prev + 1);
    setIsQuickInputOpen(true);
  };

  const closeQuickInput = () => {
    if (sheetSwitchTimerRef.current) {
      clearTimeout(sheetSwitchTimerRef.current);
      sheetSwitchTimerRef.current = null;
    }
    setIsQuickInputOpen(false);
  };

  const handleQuickInputTabChange = (nextTab: QuickInputTab) => {
    if (nextTab === quickInputTab) return;

    if (sheetSwitchTimerRef.current) {
      clearTimeout(sheetSwitchTimerRef.current);
    }

    setQuickInputAutoStartVoice(false);
    setIsQuickInputOpen(false);

    sheetSwitchTimerRef.current = setTimeout(() => {
      setQuickInputTab(nextTab);
      setQuickInputSessionKey(prev => prev + 1);
      setIsQuickInputOpen(true);
      sheetSwitchTimerRef.current = null;
    }, SHEET_SWITCH_DELAY_MS);
  };

  useEffect(() => {
    return () => {
      if (sheetSwitchTimerRef.current) {
        clearTimeout(sheetSwitchTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <ErrorBoundary key={location.pathname}>
        <Outlet />
      </ErrorBoundary>
      {showNav && (
        <BottomNav
          onOpenQuickInput={() => openQuickInput(false)}
          onStartVoiceQuickInput={() => openQuickInput(true)}
        />
      )}

      <BottomSheet
        isOpen={isQuickInputOpen}
        onClose={closeQuickInput}
        title="Быстрый ввод"
      >
        <div key={quickInputSessionKey} className="pb-4">
          <div className="px-4 pt-4">
            <div className="flex gap-1 rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() => handleQuickInputTabChange('ai')}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                  quickInputTab === 'ai'
                    ? 'bg-card text-primary shadow-sm'
                    : 'text-muted-foreground'
                }`}
              >
                AI
              </button>
              <button
                type="button"
                onClick={() => handleQuickInputTabChange('manual')}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                  quickInputTab === 'manual'
                    ? 'bg-card text-primary shadow-sm'
                    : 'text-muted-foreground'
                }`}
              >
                Вручную
              </button>
            </div>
          </div>

          <Suspense fallback={<div className="h-32" />}>
            {quickInputTab === 'ai' ? (
              <AIQuickInput
                onClose={closeQuickInput}
                autoStartVoice={quickInputAutoStartVoice}
              />
            ) : (
              <AddTransactionForm onClose={closeQuickInput} />
            )}
          </Suspense>
        </div>
      </BottomSheet>
    </div>
  );
};
