import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { CategoryBadge } from '../components/CategoryBadge';
import { useBudgets } from '../hooks/useBudgets';
import { useCategories } from '../hooks/useCategories';
import { useAnalytics } from '../hooks/useAnalytics';
import { useState, useMemo } from 'react';
import { Budget } from '../../db/types';
import { BudgetForm } from '../components/BudgetForm';

export const Budgets = () => {
  const [periodFilter, setPeriodFilter] = useState<'month' | 'week'>('month');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>(undefined);
  const [deletingBudgetId, setDeletingBudgetId] = useState<number | null>(null);

  const { budgets, add, update, remove } = useBudgets();
  const { categories } = useCategories();
  const { expensesByCategory } = useAnalytics({ period: periodFilter });

  // Фильтруем бюджеты по периоду
  const filteredBudgets = useMemo(() => {
    return budgets.filter(b => b.period === periodFilter);
  }, [budgets, periodFilter]);

  // Вычисляем общие суммы
  const totalBudget = useMemo(() => {
    return filteredBudgets.reduce((sum, b) => sum + b.amount, 0);
  }, [filteredBudgets]);

  const totalSpent = useMemo(() => {
    return filteredBudgets.reduce((sum, budget) => {
      const spent = expensesByCategory.find(c => c.categoryId === budget.categoryId)?.amount || 0;
      return sum + spent;
    }, 0);
  }, [filteredBudgets, expensesByCategory]);

  const totalRemaining = totalBudget - totalSpent;

  // Открыть форму для нового бюджета
  const handleAddBudget = () => {
    setEditingBudget(undefined);
    setIsFormOpen(true);
  };

  // Открыть форму для редактирования
  const handleEditBudget = (budget: Budget) => {
    setEditingBudget(budget);
    setIsFormOpen(true);
  };

  // Обработка отправки формы
  const handleSubmit = async (budgetData: Omit<Budget, 'id'>) => {
    if (editingBudget?.id) {
      // Редактирование
      await update(editingBudget.id, budgetData);
    } else {
      // Создание нового
      await add(budgetData);
    }
  };

  // Удалить бюджет
  const handleDeleteConfirm = async () => {
    if (deletingBudgetId === null) return;
    await remove(deletingBudgetId);
    setDeletingBudgetId(null);
  };

  // Получаем цвет прогресс-бара
  const getProgressColor = (percentage: number): string => {
    if (percentage > 90) return '#ef4444'; // красный
    if (percentage >= 70) return '#f59e0b'; // оранжевый
    return '#22c55e'; // зеленый
  };

  return (
    <div className="pb-20 bg-background min-h-screen">
      {/* Header */}
      <div className="px-4 py-4 bg-card border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Бюджеты</h1>
          <button
            onClick={handleAddBudget}
            className="w-9 h-9 bg-violet-600 hover:bg-violet-700 text-white rounded-xl flex items-center justify-center transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Period Switcher */}
      <div className="px-4 py-3">
        <div className="flex gap-2 p-1 bg-muted rounded-xl">
          <button
            onClick={() => setPeriodFilter('month')}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
              periodFilter === 'month'
                ? 'bg-white dark:bg-card shadow-sm text-violet-600 dark:text-violet-400'
                : 'text-muted-foreground'
            }`}
          >
            Месяц
          </button>
          <button
            onClick={() => setPeriodFilter('week')}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
              periodFilter === 'week'
                ? 'bg-white dark:bg-card shadow-sm text-violet-600 dark:text-violet-400'
                : 'text-muted-foreground'
            }`}
          >
            Неделя
          </button>
        </div>
      </div>

      {/* Total Budget Card */}
      {filteredBudgets.length > 0 && (
        <div className="px-4 py-3">
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="mb-3">
              <p className="text-sm text-muted-foreground mb-1">Потрачено</p>
              <p className="text-2xl font-bold">
                {totalSpent.toLocaleString('ru-RU')} / {totalBudget.toLocaleString('ru-RU')} ₽
              </p>
            </div>

            <div className="h-3 bg-muted rounded-full overflow-hidden mb-2">
              <div
                className="h-full transition-all duration-500 rounded-full"
                style={{
                  width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%`,
                  backgroundColor: getProgressColor((totalSpent / totalBudget) * 100)
                }}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Осталось: <span className="font-semibold text-foreground">{Math.max(0, totalRemaining).toLocaleString('ru-RU')} ₽</span>
            </p>
          </div>
        </div>
      )}

      {/* Budget List */}
      <div className="px-4 py-3 space-y-3">
        {filteredBudgets.map(budget => {
          const category = categories.find(c => c.id === budget.categoryId);
          const spent = expensesByCategory.find(c => c.categoryId === budget.categoryId)?.amount || 0;
          const percentage = (spent / budget.amount) * 100;
          const remaining = budget.amount - spent;
          const isOver = percentage >= 100;
          const isWarning = percentage >= 80;

          return (
            <div key={budget.id} className="bg-card rounded-2xl p-4 border border-border">
              <div className="flex items-center gap-3 mb-3">
                <CategoryBadge categoryId={budget.categoryId} size="md" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{category?.name}</p>
                    {isWarning && (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-950 rounded-lg">
                        <AlertCircle className="w-3 h-3 text-yellow-600 dark:text-yellow-500" />
                        <span className="text-xs font-medium text-yellow-600 dark:text-yellow-500">
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {spent.toLocaleString('ru-RU')} / {budget.amount.toLocaleString('ru-RU')} ₽
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEditBudget(budget)}
                    className="w-8 h-8 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </button>
                  <button
                    onClick={() => setDeletingBudgetId(budget.id!)}
                    className="w-8 h-8 bg-red-100 dark:bg-red-950 rounded-lg flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-900 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${Math.min(percentage, 100)}%`,
                      backgroundColor: getProgressColor(percentage)
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className={isOver ? 'text-red-600 dark:text-red-500 font-semibold' : 'text-muted-foreground'}>
                    Осталось: {Math.max(0, remaining).toLocaleString('ru-RU')} ₽
                  </span>
                  <span className={`font-semibold ${
                    isOver ? 'text-red-600 dark:text-red-500' : 'text-foreground'
                  }`}>
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredBudgets.length === 0 && (
        <div className="px-4 py-12 text-center">
          <p className="text-muted-foreground">
            Нет бюджетов на этот период.
          </p>
          <button
            onClick={handleAddBudget}
            className="mt-4 px-6 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors"
          >
            Создать первый бюджет
          </button>
        </div>
      )}

      {/* Форма добавления/редактирования бюджета */}
      <BudgetForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingBudget(undefined);
        }}
        onSubmit={handleSubmit}
        initialData={editingBudget}
      />

      {deletingBudgetId !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2">Удалить бюджет?</h3>
            <p className="text-muted-foreground mb-6">Это действие нельзя отменить.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingBudgetId(null)}
                className="flex-1 py-3 bg-muted rounded-xl font-medium"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
