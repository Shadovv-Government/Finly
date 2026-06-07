import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Crown, Loader2, TrendingUp, BarChart2, Heart, Sparkles,
  Calendar, SlidersHorizontal, Activity, AlertTriangle,
  Wallet, Lightbulb, MessageCircle, Coffee, Target, Flag,
  CalendarDays, Check,
} from 'lucide-react';
import { db } from '../../../db/db';

const FEATURES = [
  { icon: TrendingUp,        label: 'ML-Прогноз',      color: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-950/50'   },
  { icon: BarChart2,         label: 'Год к году',       color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950/50'       },
  { icon: Heart,             label: 'Health Score',     color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
  { icon: Sparkles,          label: 'AI-Инсайты',       color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950/50'     },
  { icon: Calendar,          label: 'Heatmap',          color: 'text-orange-500',  bg: 'bg-orange-50 dark:bg-orange-950/50'   },
  { icon: SlidersHorizontal, label: 'What-If',          color: 'text-cyan-500',    bg: 'bg-cyan-50 dark:bg-cyan-950/50'       },
  { icon: Activity,          label: 'Тренды',           color: 'text-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-950/50'   },
  { icon: AlertTriangle,     label: 'Детектор проблем', color: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-950/50'         },
  { icon: Wallet,            label: 'Прогноз баланса',  color: 'text-teal-500',    bg: 'bg-teal-50 dark:bg-teal-950/50'       },
  { icon: Lightbulb,         label: 'План роста',       color: 'text-yellow-500',  bg: 'bg-yellow-50 dark:bg-yellow-950/50'   },
  { icon: MessageCircle,     label: 'AI-Чат',           color: 'text-violet-500',  bg: 'bg-violet-50 dark:bg-violet-950/50'   },
  { icon: Coffee,            label: 'Привычки',         color: 'text-rose-500',    bg: 'bg-rose-50 dark:bg-rose-950/50'       },
  { icon: CalendarDays,      label: 'Дни недели',       color: 'text-sky-500',     bg: 'bg-sky-50 dark:bg-sky-950/50'         },
  { icon: Target,            label: 'Бюджет vs Факт',   color: 'text-pink-500',    bg: 'bg-pink-50 dark:bg-pink-950/50'       },
  { icon: Flag,              label: 'Прогноз целей',    color: 'text-lime-600',    bg: 'bg-lime-50 dark:bg-lime-950/50'       },
];

const HIGHLIGHTS = ['Офлайн', 'Локально', 'Раз и навсегда'];

export const ProUpsellCompact = () => {
  const [activating, setActivating] = useState(false);

  const handleActivate = async () => {
    setActivating(true);
    try {
      await db.settings.put({ key: 'premium', value: true });
      window.location.reload();
    } catch {
      setActivating(false);
    }
  };

  return (
    <div className="pb-6">
      {/* Hero */}
      <div
        className="mx-0 rounded-2xl px-5 py-6 text-white text-center mb-4"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3 shadow-xl"
        >
          <Crown className="w-7 h-7 text-white" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="text-2xl font-bold tracking-tight mb-1">Pro</h2>
          <p className="text-white/80 text-sm mb-3">Глубокая аналитика вашего бюджета</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {HIGHLIGHTS.map(h => (
              <div key={h} className="flex items-center gap-1 bg-white/15 rounded-full px-2.5 py-0.5 text-xs font-medium">
                <Check className="w-3 h-3" />
                {h}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Features grid */}
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2 px-1">
        15 функций включено
      </p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 + i * 0.02 }}
            className="bg-card border border-border rounded-xl p-2.5 flex flex-col items-start gap-1.5"
          >
            <div className={`w-7 h-7 rounded-lg ${f.bg} flex items-center justify-center flex-shrink-0`}>
              <f.icon className={`w-3.5 h-3.5 ${f.color}`} />
            </div>
            <div className="text-[11px] font-semibold leading-tight">{f.label}</div>
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={handleActivate}
        disabled={activating}
        className="w-full py-3.5 rounded-2xl font-bold text-base text-white shadow-lg disabled:opacity-60 active:scale-[0.98] transition-transform"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
      >
        {activating ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Активируем…
          </span>
        ) : (
          <span className="inline-flex items-center justify-center gap-2">
            <Crown className="w-4 h-4" />
            Получить Pro
          </span>
        )}
      </motion.button>
      <p className="text-xs text-muted-foreground text-center mt-1.5">
        Тестовый режим — мгновенная активация
      </p>
    </div>
  );
};
