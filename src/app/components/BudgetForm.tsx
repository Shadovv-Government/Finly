import { useState, useEffect } from 'react';
import { Budget } from '../../db/types';
import { BottomSheet } from './BottomSheet';
import { useNotifications } from '../hooks/useNotifications';
import { useCategories } from '../hooks/useCategories';
import { Wallet } from 'lucide-react';
import { formatAmountInput, parseAmountInput } from '../utils/formatCurrency';
import { getLucideIcon } from '../utils/lucideIcons';

interface BudgetFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (budget: Omit<Budget, 'id'>) => Promise<void>;
  initialData?: Budget;
}

export const BudgetForm: React.FC<BudgetFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { notify } = useNotifications();
  const { categories } = useCategories();
  
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<'month' | 'week'>('month');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Заполнить форму данными при редактировании
  useEffect(() => {
    if (initialData) {
      setSelectedCategoryId(initialData.categoryId);
      setAmount(initialData.amount.toString());
      setPeriod(initialData.period);
    } else {
      // Сброс для нового бюджета
      setSelectedCategoryId('');
      setAmount('');
      setPeriod('month');
    }
  }, [initialData, isOpen]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const parsed = parseAmountInput(value);
    if (/^\d*\.?\d*$/.test(parsed)) {
      setAmount(parsed);
    }
  };

  const handleSubmit = async () => {
    const budgetAmount = parseFloat(amount);
    if (!selectedCategoryId) {
      notify('Выберите категорию', 'error');
      return;
    }

    if (!budgetAmount || budgetAmount <= 0) {
      notify('Введите сумму бюджета', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const startDate = Date.now();
      await onSubmit({
        categoryId: selectedCategoryId,
        amount: budgetAmount,
        period,
        startDate,
        currency: 'RUB',
      });

      notify(
        initialData ? 'Бюджет обновлен' : 'Бюджет создан',
        initialData ? `Бюджет обновлен` : `Бюджет на ${formatAmountInput(amount)} ₽ создан`
      );

      onClose();
    } catch (error) {
      notify('Ошибка при сохранении', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Фильтруем только категории расходов
  const expenseCategories = categories.filter(c => c.type === 'expense');

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Редактировать бюджет' : 'Новый бюджет'}
    >
      <div className="flex flex-col pb-4">
        {/* Выбор категории */}
        <div className="px-4 py-4">
          <label className="text-sm font-medium mb-3 block">Категория</label>
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-muted rounded-xl">
            {expenseCategories.map((category) => {
              const IconComponent = getLucideIcon(category.icon, Wallet);
              const isSelected = selectedCategoryId === category.id;
              
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                    isSelected
                      ? 'bg-primary/10 dark:bg-primary/15 ring-2 ring-primary'
                      : 'hover:bg-accent'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: category.color + '20' }}
                  >
                    <IconComponent
                      className="w-5 h-5"
                      style={{ color: category.color }}
                    />
                  </div>
                  <span className="text-xs text-center leading-tight line-clamp-2">
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Сумма бюджета */}
        <div className="px-4 py-4">
          <label className="text-sm font-medium mb-2 block">Лимит расходов</label>
          <input
            type="tel"
            inputMode="decimal"
            placeholder="0"
            value={formatAmountInput(amount)}
            onChange={handleAmountChange}
            className="w-full text-3xl font-bold text-center bg-transparent outline-none py-4"
          />
          <p className="text-center text-muted-foreground mt-2">₽</p>
        </div>

        {/* Переключатель периода */}
        <div className="px-4 py-4">
          <label className="text-sm font-medium mb-3 block">Период</label>
          <div className="flex gap-2 p-1 bg-muted rounded-xl">
            <button
              onClick={() => setPeriod('month')}
              className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                period === 'month'
                  ? 'bg-white dark:bg-card shadow-sm text-primary dark:text-primary-light'
                  : 'text-muted-foreground'
              }`}
            >
              Месяц
            </button>
            <button
              onClick={() => setPeriod('week')}
              className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                period === 'week'
                  ? 'bg-white dark:bg-card shadow-sm text-primary dark:text-primary-light'
                  : 'text-muted-foreground'
              }`}
            >
              Неделя
            </button>
          </div>
        </div>

        {/* Кнопка сохранения */}
        <div className="px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom)+4rem)]">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedCategoryId || !amount}
            className="w-full py-4 text-white rounded-xl font-semibold disabled:opacity-50 shadow-lg transition-transform duration-150 hover:scale-[1.01] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}
          >
            {isSubmitting ? 'Сохранение...' : initialData ? 'Сохранить изменения' : 'Создать бюджет'}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};
