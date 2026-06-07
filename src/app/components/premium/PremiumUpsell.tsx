import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Crown, Loader2, TrendingUp, BarChart2, Heart, Sparkles,
  Calendar, SlidersHorizontal, Activity, AlertTriangle,
  Wallet, Lightbulb, MessageCircle, Coffee, Target, Flag,
  CalendarDays, Check,
} from 'lucide-react';
import { db } from '../../../db/db';

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  color: string;
  bg: string;
}

const FEATURES: Feature[] = [
  { icon: TrendingUp,        label: 'ML-Прогноз',       desc: 'Расходы на 30 дней вперёд',     color: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-950/50'  },
  { icon: BarChart2,         label: 'Год к году',        desc: 'Сравнение трат по месяцам',     color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950/50'      },
  { icon: Heart,             label: 'Health Score',      desc: '6 метрик финансового здоровья', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/50'},
  { icon: Sparkles,          label: 'AI-Инсайты',        desc: 'Авто-анализ и советы',          color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950/50'    },
  { icon: Calendar,          label: 'Heatmap',           desc: 'Годовой календарь трат',        color: 'text-orange-500',  bg: 'bg-orange-50 dark:bg-orange-950/50'  },
  { icon: SlidersHorizontal, label: 'What-If',           desc: 'Симулятор сокращения трат',     color: 'text-cyan-500',    bg: 'bg-cyan-50 dark:bg-cyan-950/50'      },
  { icon: Activity,          label: 'Тренды',            desc: 'STL-декомпозиция сезонности',   color: 'text-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-950/50'  },
  { icon: AlertTriangle,     label: 'Детектор проблем',  desc: 'Раннее предупреждение',         color: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-950/50'        },
  { icon: Wallet,            label: 'Прогноз баланса',   desc: 'Cash flow на 3 месяца',         color: 'text-teal-500',    bg: 'bg-teal-50 dark:bg-teal-950/50'      },
  { icon: Lightbulb,         label: 'План роста',        desc: 'Персональные рекомендации',     color: 'text-yellow-500',  bg: 'bg-yellow-50 dark:bg-yellow-950/50'  },
  { icon: MessageCircle,     label: 'AI-Чат',            desc: 'Вопросы о своих финансах',      color: 'text-violet-500',  bg: 'bg-violet-50 dark:bg-violet-950/50'  },
  { icon: Coffee,            label: 'Привычки',          desc: 'Эффект малых регулярных трат',  color: 'text-rose-500',    bg: 'bg-rose-50 dark:bg-rose-950/50'      },
  { icon: CalendarDays,      label: 'Дни недели',        desc: 'Когда тратишь больше всего',    color: 'text-sky-500',     bg: 'bg-sky-50 dark:bg-sky-950/50'        },
  { icon: Target,            label: 'Бюджет vs Факт',    desc: 'Контроль лимитов в деталях',   color: 'text-pink-500',    bg: 'bg-pink-50 dark:bg-pink-950/50'      },
  { icon: Flag,              label: 'Прогноз целей',     desc: 'ETA по каждой цели',            color: 'text-lime-600',    bg: 'bg-lime-50 dark:bg-lime-950/50'      },
];

const HIGHLIGHTS = [
  'Все данные хранятся локально',
  'Работает офлайн',
  'Единоразовая покупка',
];

export const PremiumUpsell = () => {
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <div
        className="px-5 pt-12 pb-8 text-white text-center"
        style={{ background: 'linear-gradient(160deg, #7c3aed, #a855f7, #c084fc)' }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-5 shadow-xl"
        >
          <Crown className="w-10 h-10 text-white" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Pro</h1>
          <p className="text-white/80 text-base mb-5">
            Глубокая аналитика вашего бюджета
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {HIGHLIGHTS.map(h => (
              <div key={h} className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1 text-xs font-medium">
                <Check className="w-3 h-3" />
                {h}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Features grid */}
      <div className="flex-1 px-4 pt-6 pb-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3 px-1">
          15 функций включено
        </p>
        <div className="grid grid-cols-3 gap-2.5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.03 }}
              className="bg-card border border-border rounded-2xl p-3 flex flex-col items-start gap-2"
            >
              <div className={`w-9 h-9 rounded-xl ${f.bg} flex items-center justify-center flex-shrink-0`}>
                <f.icon className={`w-4.5 h-4.5 ${f.color}`} />
              </div>
              <div>
                <div className="text-xs font-semibold leading-tight">{f.label}</div>
                <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{f.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-10 pt-2">
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          onClick={handleActivate}
          disabled={activating}
          className="w-full py-4 rounded-2xl font-bold text-lg text-white shadow-lg disabled:opacity-60 active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
        >
          {activating ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Активируем…
            </span>
          ) : (
            <span className="inline-flex items-center justify-center gap-2">
              <Crown className="w-5 h-5" />
              Получить Pro
            </span>
          )}
        </motion.button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Тестовый режим — мгновенная активация
        </p>
      </div>
    </div>
  );
};
