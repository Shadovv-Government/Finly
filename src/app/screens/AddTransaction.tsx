import { useState } from 'react';
import { X, Calendar, MessageSquare, Mic } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useCategories } from '../hooks/useCategories';
import { useTransactions } from '../hooks/useTransactions';

export const AddTransaction = () => {
  const navigate = useNavigate();
  const { categories } = useCategories();
  const { add } = useTransactions();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [comment, setComment] = useState('');
  const [quickInput, setQuickInput] = useState('');

  const filteredCategories = categories.filter(c =>
    c.type === type
  );

  const handleNumberClick = (num: string) => {
    if (num === '.' && amount.includes('.')) return;
    setAmount(prev => prev + num);
  };

  const handleDelete = () => {
    setAmount(prev => prev.slice(0, -1));
  };

  const handleSave = async () => {
    if (!amount || !selectedCategory) {
      toast.error('Заполните сумму и категорию');
      return;
    }
    try {
      await add({
        amount: parseFloat(amount),
        type,
        categoryId: selectedCategory,
        date: Date.now(),
        comment: comment || undefined,
        currency: 'RUB',
        rate: 1,
      });
      toast.success('Транзакция добавлена');
      navigate('/');
    } catch (error) {
      toast.error('Ошибка при сохранении транзакции');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-border bg-card">
        <h1 className="text-lg font-bold">Новая операция</h1>
        <button 
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
              type="text"
              placeholder="кофе 450 рублей в Старбаксе"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              className="w-full px-4 py-3 pr-12 bg-muted rounded-xl outline-none focus:ring-2 focus:ring-violet-600"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Mic className="w-5 h-5" />
            </button>
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

        {/* Amount Display */}
        <div className="px-4 py-6 text-center">
          <p className="text-4xl font-bold">
            {amount || '0'} ₽
          </p>
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
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: category.color + '20' }}
                  >
                    {category.icon}
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
            <span>Сегодня, 20 марта</span>
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
      </div>

      {/* Number Pad */}
      <div className="px-4 py-4 bg-card border-t border-border">
        <div className="grid grid-cols-3 gap-2 mb-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '←'].map(key => (
            <button
              key={key}
              onClick={() => key === '←' ? handleDelete() : handleNumberClick(key)}
              className="h-14 rounded-xl bg-muted hover:bg-accent font-semibold text-lg"
            >
              {key}
            </button>
          ))}
        </div>
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
