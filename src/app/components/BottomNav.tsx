import { useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { Home, History, BarChart3, Settings, Sparkles } from 'lucide-react';

interface BottomNavProps {
  onOpenQuickInput: () => void;
  onStartVoiceQuickInput: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  onOpenQuickInput,
  onStartVoiceQuickInput,
}) => {
  const location = useLocation();
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  const navItems = [
    { path: '/', icon: Home, label: 'Главная' },
    { path: '/history', icon: History, label: 'История' },
    { path: '/analytics', icon: BarChart3, label: 'Аналитика' },
    { path: '/settings', icon: Settings, label: 'Настройки' },
  ];

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleActionPointerDown = () => {
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      onStartVoiceQuickInput();
    }, 350);
  };

  const handleActionPointerEnd = () => {
    clearLongPress();
  };

  const handleActionClick = () => {
    if (!longPressTriggeredRef.current) {
      onOpenQuickInput();
    }
    longPressTriggeredRef.current = false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="relative mx-auto max-w-md px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="relative h-[4.5rem] rounded-[2rem] border border-border bg-card/90 shadow-md backdrop-blur-xl supports-[backdrop-filter]:bg-card/80 pointer-events-auto">
          <div className="grid h-full grid-cols-5 items-end px-3 pb-2.5">
            {navItems.slice(0, 2).map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path;

              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex h-full flex-col items-center justify-center transition-all duration-200 ${
                    isActive
                      ? 'text-primary scale-110'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon
                    className="mb-1 h-5 w-5 transition-transform duration-300 ease-out"
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className="text-[10px] font-medium">{label}</span>
                </Link>
              );
            })}

            <div aria-hidden="true" />

            {navItems.slice(2).map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path;

              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex h-full flex-col items-center justify-center transition-all duration-200 ${
                    isActive
                      ? 'text-primary scale-110'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon
                    className="mb-1 h-5 w-5 transition-transform duration-300 ease-out"
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className="text-[10px] font-medium">{label}</span>
                </Link>
              );
            })}
          </div>

          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-5">
            <button
              type="button"
              aria-label="Открыть быстрый AI-ввод"
              onPointerDown={handleActionPointerDown}
              onPointerUp={handleActionPointerEnd}
              onPointerLeave={handleActionPointerEnd}
              onPointerCancel={handleActionPointerEnd}
              onClick={handleActionClick}
              className="flex h-[4rem] w-[4rem] items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-lg transition-transform active:scale-95"
            >
              <Sparkles className="h-7 w-7" strokeWidth={2.2} />
            </button>
            <p className="mt-1 text-center text-[10px] font-medium text-muted-foreground">
              AI ввод
            </p>
          </div>
        </div>
      </div>
    </nav>
  );
};
