import { Outlet, useLocation } from 'react-router';
import { BottomNav } from './components/BottomNav';
import { AnimatePresence, motion } from 'motion/react';

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

export const Layout = () => {
  const location = useLocation();
  const hideNavOnPaths = ['/onboarding'];
  const showNav = !hideNavOnPaths.includes(location.pathname);

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        <PageTransition key={location.key}>
          <Outlet />
        </PageTransition>
      </AnimatePresence>
      {showNav && <BottomNav />}
    </div>
  );
};
