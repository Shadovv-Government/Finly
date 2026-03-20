import { Plus, Target, TrendingUp } from 'lucide-react';
import { useGoals } from '../hooks/useGoals';

export const Goals = () => {
  const { goals } = useGoals();

  return (
    <div className="pb-20 bg-background min-h-screen">
      {/* Header */}
      <div className="px-4 py-4 bg-card border-b border-border">
        <h1 className="text-xl font-bold">Цели и накопления</h1>
      </div>

      {/* Goals List */}
      <div className="px-4 py-4 space-y-4">
        {goals.length > 0 && goals.map(goal => {
          const percentage = (goal.currentAmount / goal.targetAmount) * 100;
          const remaining = goal.targetAmount - goal.currentAmount;
          const daysUntil = goal.deadline ? Math.ceil((goal.deadline - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
          const monthlyNeeded = daysUntil > 0 ? Math.ceil(remaining / (daysUntil / 30)) : 0;

          return (
            <div 
              key={goal.id} 
              className="bg-card rounded-2xl p-5 border border-border"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: goal.color + '20' }}
                  >
                    <Target className="w-6 h-6" style={{ color: goal.color }} />
                  </div>
                  <div>
                    <h3 className="font-bold">{goal.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {goal.deadline ? `до ${new Date(goal.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-2xl font-bold">
                      {goal.currentAmount.toLocaleString('ru-RU')} ₽
                    </span>
                    <span className="text-sm text-muted-foreground">
                      из {goal.targetAmount.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>

                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: goal.color
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-muted rounded-xl">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm">
                    <span className="text-muted-foreground">Откладывай </span>
                    <span className="font-semibold">{monthlyNeeded.toLocaleString('ru-RU')} ₽/мес</span>
                    <span className="text-muted-foreground"> чтобы достичь цели</span>
                  </p>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl font-medium">
                    Пополнить
                  </button>
                  <button className="flex-1 py-2 bg-muted text-foreground rounded-xl font-medium">
                    Изменить
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {goals.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Нет целей. Создайте первую цель!</p>
        )}
      </div>

      {/* Add Goal Button */}
      <div className="px-4 py-4">
        <button className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:bg-muted transition-colors">
          <Plus className="w-5 h-5" />
          Создать новую цель
        </button>
      </div>

      {/* Stats Card */}
      <div className="px-4 pb-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-2xl p-4 border border-green-200 dark:border-green-800">
          <h3 className="font-bold text-green-900 dark:text-green-100 mb-2">
            📊 Ваш прогресс
          </h3>
          <p className="text-sm text-green-800 dark:text-green-200 mb-2">
            Всего накоплено: {goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0).toLocaleString('ru-RU')} ₽
          </p>
          <p className="text-sm text-green-800 dark:text-green-200">
            Средний прогресс: {goals.length > 0 ? (goals.reduce((sum, g) => sum + ((g.currentAmount || 0) / (g.targetAmount || 1) * 100), 0) / goals.length).toFixed(0) : 0}%
          </p>
        </div>
      </div>
    </div>
  );
};
