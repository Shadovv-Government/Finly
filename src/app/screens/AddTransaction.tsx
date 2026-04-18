import { useState } from 'react';
import { X, Calendar, MessageSquare, Mic, Sparkles, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useCategories } from '../hooks/useCategories';
import { useTransactions } from '../hooks/useTransactions';
import { useBudgetNotifications } from '../hooks/useBudgetNotifications';
import { parseNaturalLanguage, findBestMatch } from '../../db/ai';
import {
  formatAmountInput,
  formatDateInputValue,
  parseAmountInput,
  parseDateInputValue,
} from '../utils/formatCurrency';
import { getLucideIcon } from '../utils/lucideIcons';

function CategoryIcon({ name, className, color }: { name: string; className?: string; color?: string }) {
  const IconComponent = getLucideIcon(name, Wallet);
  return <IconComponent className={className} style={{ color }} />;
}

export const AddTransaction = () => {
  const navigate = useNavigate();
  const { categories } = useCategories();
  const { add } = useTransactions();
  const { checkBudgets } = useBudgetNotifications();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [comment, setComment] = useState('');
  const [quickInput, setQuickInput] = useState('');
  const [isProcessingQuickInput, setIsProcessingQuickInput] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const filteredCategories = categories.filter(c =>
    c.type === type
  );

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const parsed = parseAmountInput(value);
    if (/^\d*\.?\d*$/.test(parsed)) {
      setAmount(parsed);
    }
  };

  // Обработка быстрого ввода
  const handleQuickInputProcess = async () => {
    if (!quickInput.trim()) return;
    
    setIsProcessingQuickInput(true);
    try {
      const parsed = parseNaturalLanguage(quickInput);
      if (parsed) {
        // Установить сумму
        if (parsed.amount > 0) {
          setAmount(parsed.amount.toString());
        }
        // Установить тип операции
        setType(parsed.type);
        // Установить комментарий
        if (parsed.comment) {
          setComment(parsed.comment);
          // Попробовать найти категорию по комментарию
          const match = await findBestMatch(parsed.comment);
          if (match && match.category.type === parsed.type) {
            setSelectedCategory(match.category.id);
            toast.success(`Категория определена: ${match.category.name}`);
          }
        }
        toast.success('Данные распознаны');
      } else {
        toast.error('Не удалось распознать. Укажите сумму, например: "кофе 450 рублей"');
      }
    } catch (error) {
      toast.error('Ошибка при обработке');
    } finally {
      setIsProcessingQuickInput(false);
    }
  };

  // Обработка Enter в поле быстрого ввода
  const handleQuickInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQuickInputProcess();
    }
  };

  const handleSave = async () => {
    if (!amount) {
      toast.error('Укажите сумму');
      return;
    }

    // Определяем категорию: выбранная или "Другое"
    let categoryId = selectedCategory;
    if (!categoryId) {
      const fallbackCategory = categories.find(
        c => c.id === (type === 'expense' ? 'cat_other_expense' : 'inc_other')
      );
      if (fallbackCategory) {
        categoryId = fallbackCategory.id;
        toast.info(`Категория не выбрана, используется "${fallbackCategory.name}"`);
      }
    }

    if (!categoryId) {
      toast.error('Ошибка: категория не найдена');
      return;
    }

    try {
      await add({
        amount: parseFloat(amount),
        type,
        categoryId,
        date: selectedDate.getTime(),
        comment: comment || undefined,
        currency: 'RUB',
        rate: 1,
      });
      toast.success('Транзакция добавлена');

      // Проверяем бюджеты и отправляем push-уведомления
      await checkBudgets();

      navigate('/');
    } catch (error) {
      toast.error('Ошибка при сохранении транзакции');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-border bg-card">
        <h1 className="text-lg font-bold">Новая операция</h1>
        <button
          aria-label="Закрыть экран добавления операции"
          onClick={() => navigate('/')}
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Quick Input */}
        <div className="px-4 py-4 bg-card border-b border-border">
          <div className="relative">
            <input
              aria-label="Быстрый ввод операции"
              type="text"
              placeholder="кофе 450 рублей в Старбаксе…"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyDown={handleQuickInputKeyDown}
              className="w-full px-4 py-3 pr-24 bg-muted rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button 
                onClick={handleQuickInputProcess}
                aria-label="Распознать быстрый ввод"
                disabled={isProcessingQuickInput || !quickInput.trim()}
                className="text-violet-600 hover:text-violet-700 disabled:text-muted-foreground transition-colors"
                title="Распознать"
              >
                <Sparkles className="w-5 h-5" />
              </button>
              <button aria-label="Голосовой ввод скоро будет доступен" className="text-muted-foreground">
                <Mic className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Type Toggle */}
        <div className="px-4 py-4">
          <div className="flex gap-2 p-1 bg-muted rounded-xl">
            <button
              onClick={() => setType('expense')}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                type === 'expense' 
                  ? 'bg-red-600 text-white' 
                  : 'text-muted-foreground'
              }`}
            >
              Расход
            </button>
            <button
              onClick={() => setType('income')}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                type === 'income' 
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
            value={formatAmountInput(amount)}
            onChange={handleAmountChange}
            className="w-full text-4xl font-bold text-center bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 rounded-lg"
          />
          <p className="text-center text-muted-foreground mt-2">₽</p>
        </div>

        {/* Category Grid */}
        <div className="px-4 py-4">
          <h3 className="text-sm font-medium mb-3">Категория</h3>
          <div className="grid grid-cols-4 gap-3 p-2 bg-muted rounded-xl">
            {filteredCategories.map(category => {
              const isSelected = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex flex-col items-center gap-2 p-2 rounded-lg transition-all ${
                    isSelected
                      ? 'bg-violet-100 dark:bg-violet-950 ring-2 ring-violet-600'
                      : 'hover:bg-accent'
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

        {/* Additional Fields */}
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <input
              aria-label="Дата операции"
              type="date"
              value={formatDateInputValue(selectedDate)}
              onChange={(e) => setSelectedDate(parseDateInputValue(e.target.value))}
              className="flex-1 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 rounded-md"
            />
          </div>
          <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border">
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
            <input
              aria-label="Комментарий"
              type="text"
              placeholder="Комментарий"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="flex-1 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="px-4 py-4 bg-card border-t border-border pb-[calc(1rem+env(safe-area-inset-bottom)+4rem)]">
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
