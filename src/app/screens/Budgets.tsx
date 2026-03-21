import { Plus, AlertCircle, Lightbulb } from 'lucide-react';
import { CategoryBadge } from '../components/CategoryBadge';
import { useBudgets } from '../hooks/useBudgets';
import { useCategories } from '../hooks/useCategories';
import { useAnalytics } from '../hooks/useAnalytics';

export const Budgets = () => {
  const { budgets } = useBudgets();
  const { categories } = useCategories();
  const { expensesByCategory } = useAnalytics();

  return (
    <div className="pb-20 bg-background min-h-screen">
      {/* Header */}
      <div className="px-4 py-4 bg-card border-b border-border">
        <h1 className="text-xl font-bold">Бюджеты</h1>
      </div>

      {/* Budget List */}
      <div className="px-4 py-4 space-y-3">
        {budgets.map(budget => {
          const category = categories.find(c => c.id === budget.categoryId);
          const spent = expensesByCategory.find(c => c.categoryId === budget.categoryId)?.amount || 0;
          const percentage = (spent / budget.amount) * 100;
          const isWarning = percentage >= 80;
          const isOver = percentage >= 100;

          let barColor = 'bg-green-500';
          if (isOver) barColor = 'bg-red-500';
          else if (isWarning) barColor = 'bg-yellow-500';

          return (
            <div key={budget.id} className="bg-card rounded-2xl p-4 border border-border">
              <div className="flex items-center gap-3 mb-3">
                <CategoryBadge categoryId={budget.categoryId} size="md" />
                <div className="flex-1">
                  <p className="font-medium">{category?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {spent.toLocaleString('ru-RU')} / {budget.amount.toLocaleString('ru-RU')} ₽
                  </p>
                </div>
                {isWarning && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-950 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
                    <span className="text-xs font-medium text-yellow-600 dark:text-yellow-500">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} transition-all rounded-full`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Осталось: {Math.max(0, budget.amount - spent).toLocaleString('ru-RU')} ₽
                  </span>
                  <span className={isOver ? 'text-red-600 dark:text-red-500 font-semibold' : 'text-muted-foreground'}>
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Budget Button */}
      <div className="px-4 py-4">
        <button className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:bg-muted transition-colors">
          <Plus className="w-5 h-5" />
          Добавить бюджет
        </button>
      </div>

      {/* Info Card */}
      <div className="px-4 pb-4">
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 rounded-2xl p-4 border border-violet-200 dark:border-violet-800">
          <h3 className="font-bold text-violet-900 dark:text-violet-100 mb-2 flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Совет
          </h3>
          <p className="text-sm text-violet-800 dark:text-violet-200">
            Установите бюджеты для контроля расходов. Вы получите уведомление при достижении 80% лимита.
          </p>
        </div>
      </div>
    </div>
  );
};
