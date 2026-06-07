import { useState } from 'react';
import { Sparkles, AlertTriangle, Lightbulb, TrendingDown, TrendingUp, Loader2, Crown, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { sectionVariants } from '../utils/animations';
import { useAIInsights, type Insight } from '../hooks/useAIInsights';
import { usePremium } from '../hooks/usePremium';
import { AIInsightsPanel } from '../components/premium/AIInsightsPanel';
import { ProUpsellCompact } from '../components/premium/ProUpsellCompact';

const INSIGHT_CONFIG = {
  alert:    { Icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-950/40' },
  warning:  { Icon: TrendingDown,  color: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-950/40' },
  tip:      { Icon: Lightbulb,     color: 'text-primary',    bg: 'bg-primary/10 dark:bg-primary/15' },
  positive: { Icon: TrendingUp,    color: 'text-emerald-500',bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
} as const;

function InsightCard({ insight }: { insight: Insight }) {
  const cfg = INSIGHT_CONFIG[insight.type];
  const Icon = insight.type === 'warning' && insight.id.startsWith('cat') ? TrendingDown : cfg.Icon;

  return (
    <div className="flex gap-3 p-4 bg-card border border-border rounded-2xl">
      <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold mb-0.5">{insight.title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
      </div>
    </div>
  );
}

export const AIAssistant = () => {
  const { loading, insights } = useAIInsights();
  const { isPremium } = usePremium();
  const [mainTab, setMainTab] = useState<'basic' | 'pro'>('basic');

  return (
    <div className="pb-28 bg-background min-h-screen flex flex-col">
      {/* Header */}
      <motion.section custom={0} variants={sectionVariants} initial="hidden" animate="visible">
        <div className="px-4 pt-6 pb-4 text-white" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Умный анализ финансов</p>
              <h1 className="text-xl font-bold">AI Ассистент</h1>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        </div>
      </motion.section>

      {/* Tab switcher */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          <button
            onClick={() => setMainTab('basic')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              mainTab === 'basic'
                ? 'bg-white dark:bg-card shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Базовая
          </button>
          <button
            onClick={() => setMainTab('pro')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
              mainTab === 'pro'
                ? 'bg-white dark:bg-card shadow-sm text-violet-600'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Crown className={`w-3.5 h-3.5 ${mainTab === 'pro' ? 'text-violet-600' : ''}`} />
            <span className="text-base font-bold">Pro</span>
          </button>
        </div>
      </div>

      {/* Basic tab */}
      {mainTab === 'basic' && (
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Insights */}
          <motion.section custom={1} variants={sectionVariants} initial="hidden" animate="visible">
            <div className="px-4 pt-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-sm">Инсайты</h2>
                {!loading && insights.length > 0 && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {insights.length}
                  </span>
                )}
              </div>
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Загрузка…</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {insights.map(insight => (
                    <InsightCard key={insight.id} insight={insight} />
                  ))}
                  {insights.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Всё выглядит хорошо — нет тревожных сигналов
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.section>

          {/* AI Chat upsell nudge */}
          <motion.section custom={2} variants={sectionVariants} initial="hidden" animate="visible">
            <div className="px-4 pt-4">
              <button
                onClick={() => setMainTab('pro')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100 dark:hover:bg-violet-950/50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">AI-Чат и глубокий анализ</p>
                  <p className="text-xs text-violet-600/70 dark:text-violet-400/70 mt-0.5">
                    Задавайте вопросы, получайте еженедельные отчёты и умные советы
                  </p>
                </div>
                <Crown className="w-4 h-4 text-violet-500 flex-shrink-0" />
              </button>
            </div>
          </motion.section>
        </div>
      )}

      {/* Pro tab */}
      {mainTab === 'pro' && (
        <div className="flex-1 overflow-y-auto px-4 pt-2">
          {isPremium ? (
            <AIInsightsPanel />
          ) : (
            <ProUpsellCompact />
          )}
        </div>
      )}
    </div>
  );
};
