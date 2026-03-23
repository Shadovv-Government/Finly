import { Calendar, MessageSquare, Mic, Sparkles } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { useTransactions } from '../hooks/useTransactions';
import { useNotifications } from '../hooks/useNotifications';
import { useTransactionForm } from '../hooks/useTransactionForm';

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
  const {
    formData,
    setFormData,
    quickInput,
    setQuickInput,
    isParsing,
    parseQuickInput,
    formatAmount,
    handleAmountChange,
  } = useTransactionForm();

  const filteredCategories = categories.filter(c => c.type === formData.type);

  // Обработка Enter в поле быстрого ввода
  const handleQuickInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      parseQuickInput();
    }
  };

  const handleSave = async () => {
    if (!formData.amount || !formData.categoryId) {
      return;
    }
    try {
      const category = categories.find(c => c.id === formData.categoryId);
      await add({
        amount: parseFloat(formData.amount),
        type: formData.type,
        categoryId: formData.categoryId,
        date: formData.date.getTime(),
        comment: formData.comment || undefined,
        currency: 'RUB',
        rate: 1,
      });

      notifyTransaction(formData.type, parseFloat(formData.amount), category?.name || 'Без категории');
      onClose();
    } catch (error) {
      // Обработка ошибки
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
              onClick={parseQuickInput}
              disabled={isParsing || !quickInput.trim()}
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
          type="tel"
          inputMode="decimal"
          placeholder="0"
          value={formatAmount(formData.amount)}
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
            const isSelected = formData.categoryId === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setFormData(prev => ({ ...prev, categoryId: category.id }))}
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
            value={formData.date.toISOString().split('T')[0]}
            onChange={(e) => setFormData(prev => ({ ...prev, date: new Date(e.target.value) }))}
            className="flex-1 bg-transparent outline-none"
          />
        </div>
        <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border">
          <MessageSquare className="w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Комментарий"
            value={formData.comment}
            onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
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
