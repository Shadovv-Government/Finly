import { useState } from 'react';
import { Calendar, MessageSquare, Mic, Sparkles } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { useTransactions } from '../hooks/useTransactions';
import { useNotifications } from '../hooks/useNotifications';
import { parseNaturalLanguage, findBestMatch } from '../../db/ai';

function CategoryIcon({ name, className, color }: { name: string; className?: string; color?: string }) {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.Wallet;
  return <IconComponent className={className} style={{ color }} />;
}

interface AddTransactionFormProps {
  onClose: () => void;
}

export const AddTransactionForm: React.FC<AddTransactionFormProps> = ({ onClose }) => {
  const { categories } = useCategories();
  const { add } = useTransactions();
  const { notifyTransaction } = useNotifications();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [comment, setComment] = useState('');
  const [quickInput, setQuickInput] = useState('');
  const [isProcessingQuickInput, setIsProcessingQuickInput] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const filteredCategories = categories.filter(c => c.type === type);

  // Format amount with thousand separators
  const formatAmount = (value: string) => {
    if (!value) return '';
    const parts = value.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return parts.join('.');
  };

  // Remove formatting for storage
  const parseAmount = (value: string) => value.replace(/\s/g, '');

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const parsed = parseAmount(value);
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
            // toast.success(`Категория определена: ${match.category.name}`);
          }
        }
        // toast.success('Данные распознаны');
      } else {
        // toast.error('Не удалось распознать. Укажите сумму, например: "кофе 450 рублей"');
      }
    } catch (error) {
      // toast.error('Ошибка при обработке');
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
    if (!amount || !selectedCategory) {
      // toast.error('Заполните сумму и категорию');
      return;
    }
    try {
      const category = categories.find(c => c.id === selectedCategory);
      await add({
        amount: parseFloat(amount),
        type,
        categoryId: selectedCategory,
        date: selectedDate.getTime(),
        comment: comment || undefined,
        currency: 'RUB',
        rate: 1,
      });
      
      // Отправляем push-уведомление
      notifyTransaction(type, parseFloat(amount), category?.name || 'Без категории');
      
      // toast.success('Транзакция добавлена');
      onClose();
    } catch (error) {
      // toast.error('Ошибка при сохранении транзакции');
    }
  };

  return (
    <div className="flex flex-col pb-4">
      {/* Quick Input */}
      <div className="px-4 py-4">
        <div className="relative">
          <input
            type="text"
            placeholder="кофе 450 рублей в Старбаксе"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            onKeyDown={handleQuickInputKeyDown}
            className="w-full px-4 py-3 pr-24 bg-muted rounded-xl outline-none focus:ring-2 focus:ring-violet-600"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button 
              onClick={handleQuickInputProcess}
              disabled={isProcessingQuickInput || !quickInput.trim()}
              className="text-violet-600 hover:text-violet-700 disabled:text-muted-foreground transition-colors"
              title="Распознать"
            >
              <Sparkles className="w-5 h-5" />
            </button>
            <button className="text-muted-foreground">
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
          type="tel"
          inputMode="decimal"
          placeholder="0"
          value={formatAmount(amount)}
          onChange={handleAmountChange}
          className="w-full text-4xl font-bold text-center bg-transparent outline-none"
          autoFocus
        />
        <p className="text-center text-muted-foreground mt-2">₽</p>
      </div>

      {/* Category Grid */}
      <div className="px-4 py-4">
        <h3 className="text-sm font-medium mb-3">Категория</h3>
        <div className="grid grid-cols-4 gap-3">
          {filteredCategories.map(category => {
            const isSelected = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
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

      {/* Additional Fields */}
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="flex-1 bg-transparent outline-none"
          />
        </div>
        <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border">
          <MessageSquare className="w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Комментарий"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="flex-1 bg-transparent outline-none"
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
