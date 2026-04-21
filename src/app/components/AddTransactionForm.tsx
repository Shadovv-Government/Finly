import { useState, useEffect } from 'react';
import { Calendar, MessageSquare, Sparkles } from 'lucide-react';
import { Wallet } from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { useTransactions } from '../hooks/useTransactions';
import { useNotifications } from '../hooks/useNotifications';
import { useBudgetNotifications } from '../hooks/useBudgetNotifications';
import { useTransactionForm } from '../hooks/useTransactionForm';
import { formatDateInputValue, parseDateInputValue } from '../utils/formatCurrency';
import { getLucideIcon } from '../utils/lucideIcons';
import { useMLModel } from '../hooks/useMLModel';

function CategoryIcon({ name, className, color }: { name: string; className?: string; color?: string }) {
  const IconComponent = getLucideIcon(name, Wallet);
  return <IconComponent className={className} style={{ color }} />;
}

interface AddTransactionFormProps {
  onClose: () => void;
}

export const AddTransactionForm: React.FC<AddTransactionFormProps> = ({ onClose }) => {
  const { categories } = useCategories();
  const { add } = useTransactions();
  const { notify, notifyTransaction } = useNotifications();
  const { checkBudgets } = useBudgetNotifications();
  const {
    formData,
    setFormData,
    formatAmount,
    handleAmountChange,
  } = useTransactionForm();

  const [mlSuggestion, setMlSuggestion] = useState<{ categoryId: string; confidence: number } | null>(null);
  const { classify, recordUserChoice } = useMLModel({ autoLoad: true });

  // Debounced ML classification: runs 500ms after comment stops changing
  useEffect(() => {
    const comment = formData.comment.trim();
    if (!comment) {
      setMlSuggestion(null);
      return;
    }
    const timer = setTimeout(async () => {
      const amount = parseFloat(formData.amount) || undefined;
      const result = await classify(comment, amount, formData.date);
      if (result && result.confidence > 0.4) {
        const cat = categories.find(
          c => c.name.toLowerCase() === result.categoryName.toLowerCase() && c.type === formData.type,
        );
        if (cat) {
          setMlSuggestion({ categoryId: cat.id, confidence: result.confidence });
          // Auto-select predicted category only if user hasn't chosen one yet
          setFormData(prev => prev.categoryId ? prev : { ...prev, categoryId: cat.id });
        } else {
          setMlSuggestion(null);
        }
      } else {
        setMlSuggestion(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.comment, formData.amount, formData.date, formData.type, classify, categories, setFormData]);

  const filteredCategories = categories.filter(c => c.type === formData.type);

  const handleSave = async () => {
    if (!formData.amount) {
      notify('Укажите сумму', 'Добавьте сумму операции перед сохранением');
      return;
    }

    // Определяем категорию: выбранная или "Другое"
    let categoryId = formData.categoryId;
    if (!categoryId) {
      const fallbackCategory = categories.find(
        c => c.id === (formData.type === 'expense' ? 'cat_other_expense' : 'inc_other')
      );
      if (fallbackCategory) {
        categoryId = fallbackCategory.id;
      }
    }

    if (!categoryId) {
      notify('Категория не найдена', 'Выберите категорию или проверьте список категорий');
      return;
    }

    try {
      const category = categories.find(c => c.id === categoryId);
      await add({
        amount: parseFloat(formData.amount),
        type: formData.type,
        categoryId,
        date: formData.date.getTime(),
        comment: formData.comment || undefined,
        currency: 'RUB',
        rate: 1,
      });

      notifyTransaction(formData.type, parseFloat(formData.amount), category?.name || 'Без категории');
      await checkBudgets();

      // Teach the classifier: manual category selection with a comment is a correction signal
      if (formData.comment && category) {
        recordUserChoice(
          formData.comment,
          category.name,
          formData.type,
          parseFloat(formData.amount),
          formData.date,
        );
      }

      onClose();
    } catch (error) {
      notify('Не удалось сохранить операцию', 'Попробуйте ещё раз');
    }
  };

  return (
    <div className="flex flex-col pb-4">
      {/* Type Toggle */}
      <div className="px-4 py-4">
        <div className="flex gap-2 p-1 bg-muted rounded-xl">
          <button
            onClick={() => setFormData(prev => ({ ...prev, type: 'expense' }))}
            className={`flex-1 py-2 rounded-lg font-medium transition-all ${
              formData.type === 'expense'
                ? 'bg-red-600 text-white'
                : 'text-muted-foreground'
            }`}
          >
            Расход
          </button>
          <button
            onClick={() => setFormData(prev => ({ ...prev, type: 'income' }))}
            className={`flex-1 py-2 rounded-lg font-medium transition-all ${
              formData.type === 'income'
                ? 'bg-green-600 text-white'
                : 'text-muted-foreground'
            }`}
          >
            Доход
          </button>
        </div>
      </div>

      {/* Amount Input */}
      <div className="px-4 py-6">
        <input
          aria-label="Сумма"
          type="tel"
          inputMode="decimal"
          placeholder="0"
          value={formatAmount(formData.amount)}
          onChange={handleAmountChange}
          className="w-full text-4xl font-bold text-center bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 rounded-lg"
        />
        <p className="text-center text-muted-foreground mt-2">₽</p>
      </div>

      {/* Category Grid */}
      <div className="px-4 py-4">
        <h3 className="text-sm font-medium mb-3">Категория</h3>
        <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-muted rounded-xl">
          {filteredCategories.map(category => {
            const isSelected = formData.categoryId === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setFormData(prev => ({ ...prev, categoryId: category.id }))}
                className={`relative flex flex-col items-center gap-2 p-2 rounded-lg transition-all ${
                  isSelected
                    ? 'bg-violet-100 dark:bg-violet-950 ring-2 ring-violet-600'
                    : 'hover:bg-accent'
                }`}
              >
                {mlSuggestion?.categoryId === category.id && (
                  <Sparkles className="absolute top-0.5 right-0.5 w-3 h-3 text-violet-500" />
                )}
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

      {/* Additional Fields */}
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <input
            aria-label="Дата операции"
            type="date"
            value={formatDateInputValue(formData.date)}
            onChange={(e) => setFormData(prev => ({ ...prev, date: parseDateInputValue(e.target.value) }))}
            className="flex-1 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 rounded-md"
          />
        </div>
        <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border">
          <MessageSquare className="w-5 h-5 text-muted-foreground" />
          <input
            aria-label="Комментарий"
            type="text"
            placeholder="Комментарий"
            value={formData.comment}
            onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
            className="flex-1 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 rounded-md"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom)+4rem)]">
        <button
          onClick={handleSave}
          className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-700 text-white rounded-xl font-semibold"
        >
          Сохранить
        </button>
      </div>
    </div>
  );
};
