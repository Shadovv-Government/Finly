import { useState } from 'react';
import { ArrowLeft, TrendingUp, BarChart2, Heart, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PremiumGate } from '../components/premium/PremiumGate';
import { PredictiveTab } from '../components/premium/PredictiveTab';
import { ComparativeTab } from '../components/premium/ComparativeTab';
import { HealthTab } from '../components/premium/HealthTab';
import { AIInsightsPanel } from '../components/premium/AIInsightsPanel';
import { PERIODS, type Period } from '../../lib/period';

type Tab = 'predictive' | 'comparative' | 'health' | 'ai';

const TABS: { key: Tab; Icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { key: 'predictive',  Icon: TrendingUp, label: 'Прогнозы'  },
  { key: 'comparative', Icon: BarChart2,  label: 'Сравнения' },
  { key: 'health',      Icon: Heart,      label: 'Здоровье'  },
  { key: 'ai',          Icon: Sparkles,   label: 'AI'        },
];

export const PremiumAnalytics = () => {
  const [tab, setTab] = useState<Tab>('predictive');
  const [period, setPeriod] = useState<Period>('1m');
  const navigate = useNavigate();

  const showPeriod = tab !== 'ai';

  return (
    <PremiumGate>
      <div className="pb-28 min-h-screen bg-background">
        {/* Gradient header */}
        <div
          className="px-5 pt-5 pb-4 text-white"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
        >
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 -ml-1.5 rounded-xl bg-white/15 hover:bg-white/25 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-xs text-white/70 font-medium">Расширенная аналитика</p>
              <h1 className="text-xl font-bold leading-tight tracking-[-0.01em]">Premium</h1>
            </div>
          </div>
        </div>

        {/* Controls bar */}
        <div className="px-4 pt-3 pb-1 space-y-2 bg-background border-b border-border/40">
          {/* Period picker */}
          {showPeriod && (
            <div className="flex gap-1 p-1 bg-muted/60 rounded-xl">
              {PERIODS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    period === p.key
                      ? 'bg-white dark:bg-card shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Tab bar */}
          <div className="flex gap-1">
            {TABS.map(({ key, Icon, label }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-[11px] font-semibold transition-all ${
                    active
                      ? 'bg-primary/10 text-primary dark:text-primary-light'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-primary dark:text-primary-light' : ''}`} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pt-4">
          {tab === 'predictive'  && <PredictiveTab  period={period} />}
          {tab === 'comparative' && <ComparativeTab period={period} />}
          {tab === 'health'      && <HealthTab      period={period} />}
          {tab === 'ai'          && <AIInsightsPanel />}
        </div>
      </div>
    </PremiumGate>
  );
};
