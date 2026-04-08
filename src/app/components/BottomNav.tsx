import { Link, useLocation } from 'react-router';
import { Home, History, BarChart3, Settings } from 'lucide-react';

export const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Главная' },
    { path: '/history', icon: History, label: 'История' },
    { path: '/analytics', icon: BarChart3, label: 'Аналитика' },
    { path: '/settings', icon: Settings, label: 'Настройки' },
  ];

  return (
    <nav className="shrink-0 bg-card border-t border-border z-50 safe-area-inset-bottom">
      <div className="max-w-md mx-auto flex justify-around items-center h-16 px-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-6 h-6 mb-1" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px]">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
