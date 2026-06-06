import { useState } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PremiumGate } from '../components/premium/PremiumGate';
import { PredictiveTab } from '../components/premium/PredictiveTab';
import { ComparativeTab } from '../components/premium/ComparativeTab';
import { HealthTab } from '../components/premium/HealthTab';
import { AIInsightsPanel } from '../components/premium/AIInsightsPanel';

type Tab = 'predictive' | 'comparative' | 'health';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'predictive', label: 'Прогнозы', icon: '🔮' },
  { key: 'comparative', label: 'Сравнения', icon: '📊' },
  { key: 'health', label: 'Здоровье', icon: '💚' },
];

export const PremiumAnalytics = () => {
  const [tab, setTab] = useState<Tab>('predictive');
  const navigate = useNavigate();

  return (
    <PremiumGate>
      <div className="pb-28 bg-background min-h-screen">
        {/* Header */}
        <div className="px-5 pt-4 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold tracking-[-0.01em] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Premium Аналитика
            </h1>
          </div>

          {/* Tab Bar */}
          <div className="flex gap-1 p-1 bg-muted rounded-xl">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  tab === t.key
                    ? 'bg-white dark:bg-card shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="mr-1">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-5">
          {tab === 'predictive' && <PredictiveTab />}
          {tab === 'comparative' && <ComparativeTab />}
          {tab === 'health' && <HealthTab />}
        </div>

        {/* AI Insights (always visible) */}
        <div className="px-5 mt-6">
          <AIInsightsPanel />
        </div>
      </div>
    </PremiumGate>
  );
};
