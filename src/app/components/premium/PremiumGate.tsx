import { type ReactNode } from 'react';
import { usePremium } from '../../hooks/usePremium';
import { PremiumUpsell } from './PremiumUpsell';

interface PremiumGateProps {
  children: ReactNode;
}

export const PremiumGate = ({ children }: PremiumGateProps) => {
  const { isPremium, loading } = usePremium();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isPremium) {
    return <PremiumUpsell />;
  }

  return <>{children}</>;
};
