import { Outlet, useLocation } from 'react-router';
import { BottomNav } from './components/BottomNav';

export const Layout = () => {
  const location = useLocation();
  const hideNavOnPaths = ['/onboarding'];
  const showNav = !hideNavOnPaths.includes(location.pathname);

  return (
    <div className="flex flex-col bg-background overflow-hidden" style={{ height: '100dvh' }}>
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
      {showNav && <BottomNav />}
    </div>
  );
};
