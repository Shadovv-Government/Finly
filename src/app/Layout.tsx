import { useEffect, useRef, useState } from 'react';
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
  const [quickInputContentHeight, setQuickInputContentHeight] = useState<number | null>(null);
  const aiPaneRef = useRef<HTMLDivElement>(null);
  const manualPaneRef = useRef<HTMLDivElement>(null);

  const openQuickInput = (autoStartVoice: boolean) => {
    setQuickInputAutoStartVoice(autoStartVoice);
    setQuickInputTab('ai');
    setQuickInputSessionKey(prev => prev + 1);
    setIsQuickInputOpen(true);
  };

  useEffect(() => {
    if (!isQuickInputOpen) {
      setQuickInputContentHeight(null);
      return;
    }

    const updateHeight = () => {
      const activePane = quickInputTab === 'ai' ? aiPaneRef.current : manualPaneRef.current;
      if (!activePane) return;
      setQuickInputContentHeight(activePane.getBoundingClientRect().height);
    };

    updateHeight();

    if (typeof ResizeObserver === 'undefined') return;

    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });

    if (aiPaneRef.current) resizeObserver.observe(aiPaneRef.current);
    if (manualPaneRef.current) resizeObserver.observe(manualPaneRef.current);

    return () => resizeObserver.disconnect();
  }, [isQuickInputOpen, quickInputSessionKey, quickInputTab]);

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

          <div
            className="overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={quickInputContentHeight ? { height: `${quickInputContentHeight}px` } : undefined}
          >
            <AnimatePresence initial={false} mode="sync">
              {quickInputTab === 'ai' ? (
                <motion.div
                  key="quick-input-ai"
                  ref={aiPaneRef}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                >
                  <AIQuickInput
                    onClose={() => setIsQuickInputOpen(false)}
                    autoStartVoice={quickInputAutoStartVoice}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="quick-input-manual"
                  ref={manualPaneRef}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                >
                  <AddTransactionForm onClose={() => setIsQuickInputOpen(false)} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};
