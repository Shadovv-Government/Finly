import { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { BottomNav } from './components/BottomNav';
import { BottomSheet } from './components/BottomSheet';
import { AIQuickInput } from './components/AIQuickInput';

export const Layout = () => {
  const location = useLocation();
  const hideNavOnPaths = ['/onboarding'];
  const showNav = !hideNavOnPaths.includes(location.pathname);
  const [isQuickInputOpen, setIsQuickInputOpen] = useState(false);
  const [quickInputSessionKey, setQuickInputSessionKey] = useState(0);
  const [quickInputAutoStartVoice, setQuickInputAutoStartVoice] = useState(false);

  const openQuickInput = (autoStartVoice: boolean) => {
    setQuickInputAutoStartVoice(autoStartVoice);
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
        <AIQuickInput
          key={quickInputSessionKey}
          onClose={() => setIsQuickInputOpen(false)}
          autoStartVoice={quickInputAutoStartVoice}
        />
      </BottomSheet>
    </div>
  );
};
