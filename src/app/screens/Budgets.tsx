import { useState, useEffect } from 'react';
import { Plus, AlertCircle, Lightbulb, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { BottomSheet } from '../components/BottomSheet';
import { CategoryBadge } from '../components/CategoryBadge';
import { AddBudgetForm } from '../components/AddBudgetForm';
import { useBudgets } from '../hooks/useBudgets';
import { useCategories } from '../hooks/useCategories';
import { useAnalytics } from '../hooks/useAnalytics';
import { aiService } from '../ai';

export const Budgets = () => {
  const { budgets, loading, remove } = useBudgets();
  const { categories } = useCategories();
  const { expensesByCategory } = useAnalytics();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<any>(null);
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);

  // Генерируем AI-рекомендации при загрузке
  useEffect(() => {
    (async () => {
      try {
        const allTransactions = await import('../../db/operations').then(m => m.getAllTransactions());
        const analysis = await aiService.analyzeSpending(allTransactions);
        setAiRecommendations(analysis.forecast.recommendations.slice(0, 2));
      } catch {
        // AI недоступен — показываем стандартный совет
      }
    })();
  }, [budgets]);

  const handleEdit = (budget: any) => {
    setEditingBudget(budget);
    setIsAddOpen(true);
  };

  const handleDeleteClick = (budget: any) => {
    setBudgetToDelete(budget);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (budgetToDelete) {
      await remove(budgetToDelete.id);
      setIsDeleteConfirmOpen(false);
      setBudgetToDelete(null);
    }
  };

  const handleCloseAdd = () => {
    setIsAddOpen(false);
    setEditingBudget(null);
  };

  if (loading) {
    return (
      <div className="pb-20 bg-background min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="pb-20 bg-background min-h-screen">
      {/* Header */}
      <div className="px-4 py-4 bg-card border-b border-border">
        <h1 className="text-xl font-bold">Бюджеты</h1>
      </div>

      {/* Budget List */}
      <div className="px-4 py-4 space-y-3">
        {budgets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">У вас пока нет бюджетов</p>
            <p className="text-sm text-muted-foreground mt-1">
              Добавьте первый бюджет для контроля расходов
            </p>
          </div>
        )}

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
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{category?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {budget.period === 'week' ? 'в неделю' : 'в месяц'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(budget)}
                    className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(budget)}
                    className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-950 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {/* Progress bar */}
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} transition-all duration-500 rounded-full`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {spent.toLocaleString('ru-RU')} / {budget.amount.toLocaleString('ru-RU')} ₽
                  </span>
                  <span className={isOver ? 'text-red-600 dark:text-red-500 font-semibold' : 'text-muted-foreground'}>
                    {percentage.toFixed(1)}%
                  </span>
                </div>

                {/* Status badges */}
                <div className="flex items-center gap-2">
                  {isOver && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-950 rounded-lg">
                      <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-500" />
                      <span className="text-xs font-medium text-red-600 dark:text-red-500">
                        Превышен
                      </span>
                    </div>
                  )}
                  {isWarning && !isOver && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-950 rounded-lg">
                      <AlertCircle className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-500" />
                      <span className="text-xs font-medium text-yellow-600 dark:text-yellow-500">
                        Почти лимит
                      </span>
                    </div>
                  )}
                  {!isWarning && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-950 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-500" />
                      <span className="text-xs font-medium text-green-600 dark:text-green-500">
                        В норме
                      </span>
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    Осталось: {Math.max(0, budget.amount - spent).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Budget Button */}
      <div className="px-4 py-4">
        <button
          onClick={() => setIsAddOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:bg-muted transition-colors"
        >
          <Plus className="w-5 h-5" />
          Добавить бюджет
        </button>
      </div>

      {/* AI Tips or Default Tip */}
      <div className="px-4 pb-4">
        {aiRecommendations.length > 0 ? (
          <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 rounded-2xl p-4 border border-violet-200 dark:border-violet-800">
            <h3 className="font-bold text-violet-900 dark:text-violet-100 mb-2 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              AI-рекомендации
            </h3>
            <ul className="space-y-2">
              {aiRecommendations.map((rec, i) => (
                <li key={i} className="text-sm text-violet-800 dark:text-violet-200 flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 rounded-2xl p-4 border border-violet-200 dark:border-violet-800">
            <h3 className="font-bold text-violet-900 dark:text-violet-100 mb-2 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Совет
            </h3>
            <p className="text-sm text-violet-800 dark:text-violet-200">
              Установите бюджеты для контроля расходов. Вы получите уведомление при достижении 80% лимита.
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Budget Form */}
      <AddBudgetForm
        isOpen={isAddOpen}
        onClose={handleCloseAdd}
        budgetToEdit={editingBudget}
      />

      {/* Delete Confirmation */}
      <BottomSheet
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Удалить бюджет?"
      >
        <div className="px-4 py-6">
          <p className="text-center text-muted-foreground mb-6">
            Вы уверены, что хотите удалить этот бюджет? Это действие нельзя отменить.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleDeleteConfirm}
              className="w-full py-4 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
            >
              Удалить
            </button>
            <button
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="w-full py-4 bg-muted rounded-xl font-semibold hover:bg-muted/80 transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};
