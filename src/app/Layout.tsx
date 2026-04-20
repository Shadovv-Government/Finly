import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
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
        <motion.div
          key={quickInputSessionKey}
          layout
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="pb-4"
        >
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

          <AnimatePresence mode="wait" initial={false}>
            {quickInputTab === 'ai' ? (
              <motion.div
                key="quick-input-ai"
                layout
                initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <AIQuickInput
                  onClose={() => setIsQuickInputOpen(false)}
                  autoStartVoice={quickInputAutoStartVoice}
                />
              </motion.div>
            ) : (
              <motion.div
                key="quick-input-manual"
                layout
                initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <AddTransactionForm onClose={() => setIsQuickInputOpen(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </BottomSheet>
    </div>
  );
};
