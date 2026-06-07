import type { GoalProgress } from '../../../db/analytics';

interface GoalsTimelineProps {
  goals: GoalProgress[];
  monthlySavings: number;
}

function monthsToReach(remaining: number, monthlySavings: number): string {
  if (monthlySavings <= 0) return '∞';
  const months = remaining / monthlySavings;
  if (months < 1) return '< 1 мес.';
  if (months < 12) return `~${Math.ceil(months)} мес.`;
  const years = months / 12;
  return `~${years.toFixed(1)} лет`;
}

export const GoalsTimeline = ({ goals, monthlySavings }: GoalsTimelineProps) => {
  const activeGoals = goals.filter(g => g.isActive !== false && g.remaining > 0);

  if (activeGoals.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        Нет активных целей — создайте их в разделе «Цели»
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-semibold mb-1">Прогноз достижения целей</h3>
      {monthlySavings > 0 && (
        <p className="text-xs text-muted-foreground mb-3">
          При текущей норме сбережений: {Math.round(monthlySavings).toLocaleString('ru-RU')} ₽/мес.
        </p>
      )}
      <div className="space-y-4">
        {activeGoals.map(goal => {
          const pct = Math.min(goal.percent, 100);
          return (
            <div key={goal.id}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">{goal.icon}</span>
                  <span className="text-sm font-medium">{goal.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.round(goal.currentAmount).toLocaleString('ru-RU')} / {Math.round(goal.targetAmount).toLocaleString('ru-RU')} ₽
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden mb-1">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: goal.color || '#a855f7' }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{Math.round(pct)}%</span>
                <span className="font-medium">
                  {goal.remaining > 0
                    ? `Ещё ${Math.round(goal.remaining).toLocaleString('ru-RU')} ₽ → ${monthsToReach(goal.remaining, monthlySavings)}`
                    : '✅ Цель достигнута!'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
