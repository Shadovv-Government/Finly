import { useState } from 'react';
import { X, Calendar, MessageSquare, Mic, MicOff, Sparkles, Wallet, Camera } from 'lucide-react';
import { motion } from 'motion/react';
import { sectionVariants } from '../utils/animations';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useCategories } from '../hooks/useCategories';
import { useTransactions } from '../hooks/useTransactions';
import { useBudgetNotifications } from '../hooks/useBudgetNotifications';
import { useSpeechInput } from '../hooks/useSpeechInput';
import { useReceiptScanner } from '../hooks/useReceiptScanner';
import type { ReceiptData } from '../hooks/useReceiptScanner';
import { ReceiptScannerModal } from '../components/ReceiptScannerModal';
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
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const speech = useSpeechInput();
  const scanner = useReceiptScanner();

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

  const processText = async (text: string) => {
    if (!text.trim()) return;
    
    setIsProcessingQuickInput(true);
    try {
      const parsed = parseNaturalLanguage(text);
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
        setQuickInput('');
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

  const handleQuickInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      processText(quickInput);
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

  const handleReceiptFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptFile(file);
    setShowReceiptModal(true);
    scanner.scan(file);
    e.target.value = '';
  };

  const CATEGORY_HINT_MAP: Record<string, string> = {
    'Продукты': 'cat_groceries',
    'Ресторан/Кафе': 'cat_food',
    'Транспорт': 'cat_transport',
    'Здоровье': 'cat_health',
    'Шопинг': 'cat_shopping',
    'Развлечения': 'cat_fun',
    'Коммунальные': 'cat_utilities',
    'АЗС': 'cat_transport',
  };

  const handleReceiptConfirm = (data: ReceiptData) => {
    if (data.amount !== null) setAmount(String(data.amount));
    if (data.merchant) setComment(data.merchant);
    if (data.date) setSelectedDate(parseDateInputValue(data.date));

    if (data.categoryHint) {
      const catId = CATEGORY_HINT_MAP[data.categoryHint];
      if (catId && categories.some((c) => c.id === catId && c.type === 'expense')) {
        setSelectedCategory(catId);
        setType('expense');
      }
    }

    setShowReceiptModal(false);
    scanner.reset();
    setReceiptFile(null);
  };

  const handleReceiptClose = () => {
    setShowReceiptModal(false);
    scanner.reset();
    setReceiptFile(null);
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
        <motion.section custom={0} variants={sectionVariants} initial="hidden" animate="visible">
        <div className="px-4 py-4 bg-card border-b border-border">
          <div className="relative">
            <input
              aria-label="Быстрый ввод операции"
              type="text"
              placeholder="кофе 450 рублей в Старбаксе…"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyDown={handleQuickInputKeyDown}
              className="w-full px-4 py-3 pr-32 bg-muted rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <label
                aria-label="Сканировать чек"
                className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
              >
                <Camera className="w-5 h-5" />
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={handleReceiptFile}
                />
              </label>
              <button 
                onClick={() => processText(quickInput)}
                aria-label="Распознать быстрый ввод"
                disabled={isProcessingQuickInput || !quickInput.trim()}
                className="text-primary hover:text-primary-light disabled:text-muted-foreground transition-colors"
                title="Распознать"
              >
                <Sparkles className="w-5 h-5" />
              </button>
              {speech.supported && (
                <button
                  type="button"
                  aria-label={speech.state === 'listening' ? 'Остановить запись' : 'Голосовой ввод'}
                  onClick={() => speech.start((transcript) => {
                    setQuickInput(transcript);
                    processText(transcript);
                  })}
                  className={`transition-colors ${
                    speech.state === 'listening'
                      ? 'text-red-500 animate-pulse'
                      : speech.state === 'error'
                      ? 'text-amber-500'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {speech.state === 'listening' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}
            </div>
          </div>
        </div>
        </motion.section>

        {/* Type Toggle */}
        <motion.section custom={1} variants={sectionVariants} initial="hidden" animate="visible">
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
        </motion.section>

        {/* Amount Input */}
        <motion.section custom={2} variants={sectionVariants} initial="hidden" animate="visible">
        <div className="px-4 py-6">
          <input
            aria-label="Сумма"
            type="tel"
            inputMode="decimal"
            placeholder="0"
            value={formatAmountInput(amount)}
            onChange={handleAmountChange}
            className="w-full text-4xl font-bold text-center bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
          />
          <p className="text-center text-muted-foreground mt-2">₽</p>
        </div>
        </motion.section>

        {/* Category Grid */}
        <motion.section custom={3} variants={sectionVariants} initial="hidden" animate="visible">
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
                      ? 'bg-primary/10 dark:bg-primary/15 ring-2 ring-primary'
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
        </motion.section>

        {/* Additional Fields */}
        <motion.section custom={4} variants={sectionVariants} initial="hidden" animate="visible">
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <input
              aria-label="Дата операции"
              type="date"
              value={formatDateInputValue(selectedDate)}
              onChange={(e) => setSelectedDate(parseDateInputValue(e.target.value))}
              className="flex-1 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
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
              className="flex-1 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
            />
          </div>
        </div>
        </motion.section>
      </div>

      {/* Save Button */}
      <motion.section custom={5} variants={sectionVariants} initial="hidden" animate="visible">
      <div className="px-4 py-4 bg-card border-t border-border pb-[calc(1rem+env(safe-area-inset-bottom)+4rem)]">
        <button
          onClick={handleSave}
          className="w-full py-4 text-white rounded-xl font-semibold shadow-lg transition-transform duration-150 hover:scale-[1.01] active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}
        >
          Сохранить
        </button>
      </div>
      </motion.section>

      {showReceiptModal && (
        <ReceiptScannerModal
          file={receiptFile}
          result={scanner.result}
          isLoading={scanner.isLoading}
          error={scanner.error}
          errorMessage={scanner.errorMessage}
          statusMessage={scanner.statusMessage}
          onConfirm={handleReceiptConfirm}
          onClose={handleReceiptClose}
        />
      )}
    </div>
  );
};
