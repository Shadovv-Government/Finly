import { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { BottomNav } from './components/BottomNav';
import { BottomSheet } from './components/BottomSheet';
import { AIQuickInput } from './components/AIQuickInput';
import { AddTransactionForm } from './components/AddTransactionForm';

type QuickInputTab = 'ai' | 'manual';

export const Layout = () => {
  const location = useLocation();
  const hideNavOnPaths = ['/onboarding'];
  const showNav = !hideNavOnPaths.includes(location.pathname);
  const [isQuickInputOpen, setIsQuickInputOpen] = useState(false);
  const [quickInputSessionKey, setQuickInputSessionKey] = useState(0);
  const [quickInputAutoStartVoice, setQuickInputAutoStartVoice] = useState(false);
  const [quickInputTab, setQuickInputTab] = useState<QuickInputTab>('ai');

  const openQuickInput = (autoStartVoice: boolean) => {
    setQuickInputAutoStartVoice(autoStartVoice);
    setQuickInputTab('ai');
    setQuickInputSessionKey(prev => prev + 1);
    setIsQuickInputOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Outlet />
      {showNav && (
        <BottomNav
          onOpenQuickInput={() => openQuickInput(false)}
          onStartVoiceQuickInput={() => openQuickInput(true)}
        />
      )}

      <BottomSheet
        isOpen={isQuickInputOpen}
        onClose={() => setIsQuickInputOpen(false)}
        title="Быстрый ввод"
      >
        <div key={quickInputSessionKey} className="pb-4">
          <div className="px-4 pt-4">
            <div className="flex gap-1 rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() => setQuickInputTab('ai')}
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
                onClick={() => setQuickInputTab('manual')}
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

          {quickInputTab === 'ai' ? (
            <AIQuickInput
              onClose={() => setIsQuickInputOpen(false)}
              autoStartVoice={quickInputAutoStartVoice}
            />
          ) : (
            <AddTransactionForm onClose={() => setIsQuickInputOpen(false)} />
          )}
        </div>
      </BottomSheet>
    </div>
  );
};
