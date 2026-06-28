import * as LucideIcons from 'lucide-react';
import { useState, useEffect } from 'react';
import { BottomSheet } from './BottomSheet';
import { useCategories } from '../hooks/useCategories';
import { useBudgets } from '../hooks/useBudgets';
import type { Budget } from '../../db/types';

function CategoryIcon({ name, className, color }: { name: string; className?: string; color?: string }) {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.Wallet;
  return <IconComponent className={className} style={{ color }} />;
}

interface AddBudgetFormProps {
  isOpen: boolean;
  onClose: () => void;
  budgetToEdit?: Budget | null;
}

export const AddBudgetForm: React.FC<AddBudgetFormProps> = ({
  isOpen,
  onClose,
  budgetToEdit,
}) => {
  const { add, update } = useBudgets();
  const { categories } = useCategories();
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<'week' | 'month'>('month');
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!budgetToEdit;

  // Sync when editing or opening
  useEffect(() => {
    if (isOpen) {
      if (budgetToEdit) {
        setSelectedCategoryId(budgetToEdit.categoryId);
        setAmount(budgetToEdit.amount.toString());
        setPeriod(budgetToEdit.period);
      } else {
        setSelectedCategoryId('');
        setAmount('');
        setPeriod('month');
      }
      setError(null);
    }
  }, [isOpen, budgetToEdit]);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!selectedCategoryId || !numAmount || numAmount <= 0) {
      setError('Заполните все поля');
      return;
    }

    try {
      const budgetData = {
        categoryId: selectedCategoryId,
        amount: numAmount,
        period,
        startDate: Date.now(),
        currency: 'RUB',
        notificationsEnabled: true,
      };

      if (isEditing && budgetToEdit?.id) {
        await update(budgetToEdit.id, budgetData);
      } else {
        await add(budgetData);
      }

      onClose();
    } catch {
      setError('Не удалось сохранить бюджет');
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Редактировать бюджет' : 'Новый бюджет'}
    >
      <div className="flex flex-col pb-4">
        {/* Amount Input */}
        <div className="px-4 py-6">
          <p className="text-sm text-muted-foreground mb-2 text-center">Лимит расходов</p>
          <div className="flex items-center justify-center gap-1">
            <input
              type="tel"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              className="w-full text-4xl font-bold text-center bg-transparent outline-none"
              autoFocus
            />
            <span className="text-2xl text-muted-foreground">₽</span>
          </div>
        </div>

        {/* Period Toggle */}
        <div className="px-4 py-3">
          <div className="flex gap-2 p-1 bg-muted rounded-xl">
            <button
              onClick={() => setPeriod('week')}
              className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${
                period === 'week'
                  ? 'bg-violet-600 text-white'
                  : 'text-muted-foreground'
              }`}
            >
              Неделя
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${
                period === 'month'
                  ? 'bg-violet-600 text-white'
                  : 'text-muted-foreground'
              }`}
            >
              Месяц
            </button>
          </div>
        </div>

        {/* Category Grid */}
        <div className="px-4 py-4">
          <h3 className="text-sm font-medium mb-3 text-muted-foreground">Категория</h3>
          <div className="grid grid-cols-4 gap-3">
            {expenseCategories.map(category => {
              const isSelected = selectedCategoryId === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                    isSelected
                      ? 'ring-2 ring-violet-600'
                      : 'bg-card border border-border'
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: category.color + '20' }}
                  >
                    <CategoryIcon name={category.icon} className="w-6 h-6" color={category.color} />
                  </div>
                  <span className="text-xs text-center leading-tight">
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-2">
            <p className="text-sm text-red-500 text-center">{error}</p>
          </div>
        )}

        {/* Save Button */}
        <div className="px-4 py-4">
          <button
            onClick={handleSubmit}
            className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-700 text-white rounded-xl font-semibold"
          >
            {isEditing ? 'Сохранить изменения' : 'Создать бюджет'}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};
