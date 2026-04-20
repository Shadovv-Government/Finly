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
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-inset-bottom">
      <div className="relative mx-auto max-w-md px-3 pb-2">
        <div className="relative h-20 rounded-t-[2rem] border border-border bg-card/95 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-card/85">
          <div className="grid h-full grid-cols-5 items-end px-2 pb-2">
            {navItems.slice(0, 2).map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path;

              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex h-full flex-col items-center justify-center transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="mb-1 h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[10px]">{label}</span>
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
                  className={`flex h-full flex-col items-center justify-center transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="mb-1 h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[10px]">{label}</span>
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
              className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 via-fuchsia-600 to-indigo-700 text-white shadow-[0_10px_30px_rgba(109,40,217,0.45)] transition-transform active:scale-95"
            >
              <Sparkles className="h-7 w-7" strokeWidth={2.4} />
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
