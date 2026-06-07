import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getHealthScoreData, getProblemDetectorIssues, type DetectedIssue } from '../../../db/premium';
import { getGoalsProgress, getBalanceByPeriod, type GoalProgress } from '../../../db/analytics';
import { calculateHealthScore, type HealthScoreResult, type MetricResult } from '../../../lib/healthScore';
import { HealthScoreGauge } from './HealthScoreGauge';
import { GoalsTimeline } from './GoalsTimeline';
import { EmptyState } from '../../components/EmptyState';
import { getPeriodRange, type Period } from '../../../lib/period';

interface HealthTabProps {
  period: Period;
}

const METRIC_DETAILS: Record<string, { what: string; howToImprove: string[] }> = {
  'Норма сбережений': {
    what: 'Доля дохода, которую вы откладываете. Норма: ≥ 20%. Рассчитывается как (доход − расходы) / доход × 100%.',
    howToImprove: [
      'Автоматически переводить 10–20% дохода на сберегательный счёт сразу после получения',
      'Использовать правило 50/30/20: нужды / желания / сбережения',
      'Найти 1–2 категории с перерасходом и сократить их на 10%',
    ],
  },
  'Обязательные расходы': {
    what: 'Доля трат на базовые нужды (жильё, еда, транспорт, здоровье). Норма: ≤ 50% от расходов.',
    howToImprove: [
      'Пересмотреть тарифы: интернет, мобильная связь, страховки',
      'Оптимизировать продуктовую корзину — списки и оптовые покупки',
      'Рассмотреть более дешёвую аренду или рефинансирование',
    ],
  },
  'Регулярность доходов': {
    what: 'Насколько стабилен ваш доход по месяцам. Измеряется коэффициентом вариации (CV). Чем ниже CV, тем лучше.',
    howToImprove: [
      'Диверсифицировать источники дохода (фриланс, инвестиции)',
      'Создать резервный фонд, чтобы сгладить месяцы с низким доходом',
      'Заключить контракты с фиксированной оплатой вместо разовых заказов',
    ],
  },
  'Резервный фонд': {
    what: 'Сколько месяцев вы можете прожить на текущий баланс. Норма: 3–6 месяцев расходов.',
    howToImprove: [
      'Начните откладывать хотя бы 500–1000 ₽ в неделю в отдельный счёт',
      'Не трогайте резерв без крайней необходимости — это ваша страховка',
      'Поставьте цель «3 месяца расходов» в разделе Цели для визуального прогресса',
    ],
  },
  'Диверсификация': {
    what: 'Насколько равномерно распределены ваши расходы по категориям. Измеряется индексом Херфиндаля-Хиршмана (HHI). Чем ниже, тем лучше.',
    howToImprove: [
      'Распределить расходы равномернее — не ставить одну категорию сильно выше других',
      'Проверить, нет ли скрытых трат, которые можно вынести в отдельные категории',
    ],
  },
  'Долговая нагрузка': {
    what: 'Доля дохода, уходящая на обслуживание долгов (кредиты, ипотека). Норма: ≤ 30%.',
    howToImprove: [
      'Погашать долги с наибольшей процентной ставкой в первую очередь',
      'Рассмотреть рефинансирование кредита на более выгодных условиях',
      'Не брать новые кредиты пока долговая нагрузка выше 30%',
    ],
  },
};

function MetricRow({ metric, isOpen, onToggle }: {
  metric: MetricResult;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const detail = METRIC_DETAILS[metric.name];
  const statusColor = metric.status === 'good' ? 'bg-emerald-500'
    : metric.status === 'warning' ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="border-b border-border/30 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 py-2.5 text-left hover:bg-muted/40 rounded-lg px-1 transition-colors"
      >
        <div className={`w-2 h-2 rounded-full ${statusColor} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-xs mb-0.5">
            <span className="text-muted-foreground">{metric.name}</span>
            <span className="font-semibold">{metric.subscore}/100</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${statusColor}`}
              style={{ width: `${metric.subscore}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{metric.label}</div>
        </div>
        {detail && (
          <div className="flex-shrink-0 text-muted-foreground ml-1">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        )}
      </button>

      <AnimatePresence>
        {isOpen && detail && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-3 pt-1 space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed">{detail.what}</p>
              <div>
                <div className="text-xs font-semibold mb-1">Как улучшить:</div>
                <ul className="space-y-1">
                  {detail.howToImprove.map((tip, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <span className="text-amber-500 flex-shrink-0 mt-0.5">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const HealthTab = ({ period }: HealthTabProps) => {
  const [health, setHealth] = useState<HealthScoreResult | null>(null);
  const [issues, setIssues] = useState<DetectedIssue[]>([]);
  const [goals, setGoals] = useState<GoalProgress[]>([]);
  const [monthlySavings, setMonthlySavings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openMetric, setOpenMetric] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { start, end } = getPeriodRange(period);
      const [healthData, detectedIssues, goalsData, balance] = await Promise.all([
        getHealthScoreData(),
        getProblemDetectorIssues(),
        getGoalsProgress(),
        getBalanceByPeriod(start, end),
      ]);
      if (cancelled) return;
      setHealth(calculateHealthScore(healthData));
      setIssues(detectedIssues);
      setGoals(goalsData);
      const days = (end - start) / 86400000;
      setMonthlySavings(((balance.income - balance.expenses) / days) * 30);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [period]);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="bg-muted rounded-2xl h-48 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Health Score */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="card-premium p-5">
          <h3 className="font-semibold mb-4 text-center">Финансовое здоровье</h3>
          {health ? (
            <>
              <HealthScoreGauge score={health.score} metrics={[]} />
              {/* Clickable metrics */}
              <div className="mt-4">
                {health.metrics.map(m => (
                  <MetricRow
                    key={m.name}
                    metric={m}
                    isOpen={openMetric === m.name}
                    onToggle={() => setOpenMetric(prev => prev === m.name ? null : m.name)}
                  />
                ))}
              </div>
            </>
          ) : (
            <EmptyState icon="Heart" title="Нет данных для расчёта" description="Добавьте категории и транзакции для анализа" />
          )}
        </div>
      </motion.div>

      {/* Goals Timeline */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="card-premium p-5">
          <GoalsTimeline goals={goals} monthlySavings={monthlySavings} />
        </div>
      </motion.div>

      {/* Recommendations */}
      {health && health.recommendations.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="card-premium p-5">
            <h3 className="font-semibold mb-3">План улучшения</h3>
            <div className="space-y-2">
              {health.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-muted rounded-xl">
                  <span className="text-amber-500 font-bold flex-shrink-0">{i + 1}.</span>
                  <span className="text-sm">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Problem Detector */}
      {issues.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="card-premium p-5">
            <h3 className="font-semibold mb-3">Детектор проблем</h3>
            <div className="space-y-2">
              {issues.map((issue, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border ${
                    issue.severity === 'danger'
                      ? 'border-red-500/20 bg-red-50 dark:bg-red-950/20'
                      : 'border-amber-500/20 bg-amber-50 dark:bg-amber-950/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{issue.severity === 'danger' ? '⚠️' : '⚡'}</span>
                    <span className="font-medium text-sm">{issue.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">{issue.description}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
