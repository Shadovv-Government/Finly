import { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';
import * as Icons from 'lucide-react';
import { RecurringTemplate, RecurringInterval } from '../../db/types';
import { BottomSheet } from './BottomSheet';
import { useNotifications } from '../hooks/useNotifications';
import { useCategories } from '../hooks/useCategories';
import { RECURRING_INTERVALS } from '../constants';
import { formatAmountInput, parseAmountInput } from '../utils/formatCurrency';

interface RecurringTemplateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (template: Omit<RecurringTemplate, 'id'>) => Promise<void>;
  initialData?: RecurringTemplate;
}

const INTERVAL_LABELS: Record<RecurringInterval, string> = {
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
  yearly: 'Ежегодно',
};

export const RecurringTemplateForm: React.FC<RecurringTemplateFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { notify } = useNotifications();
  const { categories } = useCategories();

  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [interval, setInterval] = useState<RecurringInterval>('monthly');
  const [firstDate, setFirstDate] = useState('');
  const [comment, setComment] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Заполнить форму данными при редактировании
  useEffect(() => {
    if (initialData) {
      setSelectedCategoryId(initialData.categoryId);
      setAmount(initialData.amount.toString());
      setType(initialData.type);
      setInterval(initialData.interval);
      setFirstDate(new Date(initialData.nextDate).toISOString().split('T')[0]);
      setComment(initialData.comment || '');
      setIsActive(initialData.isActive);
    } else {
      setSelectedCategoryId('');
      setAmount('');
      setType('expense');
      setInterval('monthly');
      setFirstDate(new Date().toISOString().split('T')[0]);
      setComment('');
      setIsActive(true);
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
    const templateAmount = parseFloat(amount);
    if (!selectedCategoryId) {
      notify('⚠️ Выберите категорию', 'error');
      return;
    }

    if (!templateAmount || templateAmount <= 0) {
      notify('⚠️ Введите сумму', 'error');
      return;
    }

    if (!firstDate) {
      notify('⚠️ Укажите дату первого платежа', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        amount: templateAmount,
        type,
        categoryId: selectedCategoryId,
        interval,
        nextDate: new Date(firstDate).getTime(),
        isActive,
        comment: comment.trim() || undefined,
      });

      notify(
        initialData ? '✅ Шаблон обновлен' : '✅ Шаблон создан',
        initialData
          ? `Шаблон обновлен`
          : `${INTERVAL_LABELS[interval]} — ${formatAmountInput(amount)} ₽`
      );

      onClose();
    } catch (error) {
      notify('❌ Ошибка при сохранении', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Редактировать шаблон' : 'Новый шаблон'}
    >
      <div className="flex flex-col pb-4">
        {/* Тип операции */}
        <div className="px-4 py-4">
          <label className="text-sm font-medium mb-3 block">Тип операции</label>
          <div className="flex gap-2 p-1 bg-muted rounded-xl">
            <button
              onClick={() => setType('expense')}
              className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                type === 'expense'
                  ? 'bg-white dark:bg-card shadow-sm text-red-600 dark:text-red-400'
                  : 'text-muted-foreground'
              }`}
            >
              Расход
            </button>
            <button
              onClick={() => setType('income')}
              className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                type === 'income'
                  ? 'bg-white dark:bg-card shadow-sm text-green-600 dark:text-green-400'
                  : 'text-muted-foreground'
              }`}
            >
              Доход
            </button>
          </div>
        </div>

        {/* Сумма */}
        <div className="px-4 py-4">
          <label className="text-sm font-medium mb-2 block">Сумма</label>
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

        {/* Выбор категории */}
        <div className="px-4 py-4">
          <label className="text-sm font-medium mb-3 block">Категория</label>
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-muted rounded-xl">
            {categories
              .filter(c => c.type === type)
              .map((category) => {
                const IconComponent = (Icons[category.icon as keyof typeof Icons] as React.ElementType) || Icons.Wallet;
                const isSelected = selectedCategoryId === category.id;

                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                      isSelected
                        ? 'bg-violet-100 dark:bg-violet-950 ring-2 ring-violet-600'
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

        {/* Интервал */}
        <div className="px-4 py-4">
          <label className="text-sm font-medium mb-3 block">Интервал</label>
          <div className="grid grid-cols-2 gap-2">
            {RECURRING_INTERVALS.map((int) => (
              <button
                key={int}
                onClick={() => setInterval(int)}
                className={`flex items-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                  interval === int
                    ? 'bg-violet-600 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                <Clock className="w-4 h-4" />
                {INTERVAL_LABELS[int]}
              </button>
            ))}
          </div>
        </div>

        {/* Дата первого платежа */}
        <div className="px-4 py-4">
          <label className="text-sm font-medium mb-2 block">Дата первого платежа</label>
          <div className="flex items-center gap-3 p-4 bg-muted rounded-xl">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <input
              type="date"
              value={firstDate}
              onChange={(e) => setFirstDate(e.target.value)}
              className="flex-1 bg-transparent outline-none"
            />
          </div>
        </div>

        {/* Комментарий */}
        <div className="px-4 py-4">
          <label className="text-sm font-medium mb-2 block">Комментарий (необязательно)</label>
          <input
            type="text"
            placeholder="Например: Аренда квартиры"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full px-4 py-3 bg-muted rounded-xl outline-none focus:ring-2 focus:ring-violet-600"
          />
        </div>

        {/* Активность */}
        {!initialData && (
          <div className="px-4 py-4">
            <label className="flex items-center justify-between p-4 bg-muted rounded-xl cursor-pointer">
              <span className="text-sm font-medium">Активный шаблон</span>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-5 h-5 accent-violet-600"
              />
            </label>
          </div>
        )}

        {/* Кнопка сохранения */}
        <div className="px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom)+4rem)]">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedCategoryId || !amount}
            className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-700 text-white rounded-xl font-semibold disabled:opacity-50"
          >
            {isSubmitting ? 'Сохранение...' : initialData ? 'Сохранить изменения' : 'Создать шаблон'}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
