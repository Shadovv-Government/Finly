import { Outlet, useLocation } from 'react-router';
import { BottomNav } from './components/BottomNav';

export const Layout = () => {
  const location = useLocation();
  const hideNavOnPaths = ['/onboarding'];
  const showNav = !hideNavOnPaths.includes(location.pathname);

  return (
    <div className="min-h-screen bg-background">
      <Outlet />
      {showNav && <BottomNav />}
    </div>
  );
};
