import { useState, useMemo, useEffect } from 'react';
import { Search, Filter, X, Calendar, ChevronDown, Wallet, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { sectionVariants } from '../utils/animations';
import { EmptyState } from '../components/EmptyState';
import { CategoryBadge } from '../components/CategoryBadge';
import { AmountDisplay } from '../components/AmountDisplay';
import { BottomSheet } from '../components/BottomSheet';
import { SwipeableRow } from '../components/SwipeableRow';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { Transaction, Category } from '../../db/types';
import { formatDateInputValue, parseDateInputValue, formatAmountInput } from '../utils/formatCurrency';
import { getLucideIcon } from '../utils/lucideIcons';

const PAGE_SIZE = 50;

// ==================== TransactionItem ====================

interface TransactionItemProps {
  transaction: Transaction;
  category: Category | undefined;
  isLast: boolean;
  onDelete: () => void;
  onEdit: () => void;
}

function TransactionItem({ transaction, category, isLast, onDelete, onEdit }: TransactionItemProps) {
  const time = new Date(transaction.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return (
    <SwipeableRow onDelete={onDelete} onEdit={onEdit}>
      <div className={`flex items-center gap-3 p-4 bg-card ${isLast ? '' : 'border-b border-border'}`}>
        <CategoryBadge categoryId={transaction.categoryId as string | undefined} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{category?.name || 'Без категории'}</p>
          {transaction.comment && (
            <p className="text-sm text-muted-foreground truncate">{transaction.comment}</p>
          )}
        </div>
        <div className="text-right">
          <AmountDisplay amount={transaction.amount} type={transaction.type} size="md" />
          <p className="text-xs text-muted-foreground">{time}</p>
        </div>
      </div>
    </SwipeableRow>
  );
}

// ==================== EditTransactionSheet ====================

interface EditTransactionSheetProps {
  transaction: Transaction | null;
  categories: Category[];
  onClose: () => void;
  onSave: (id: number, updates: Partial<Transaction>) => Promise<void>;
}

function CategoryIcon({ name, className, color }: { name: string; className?: string; color?: string }) {
  const Icon = getLucideIcon(name, Wallet);
  return <Icon className={className} style={{ color }} />;
}

function parseRuAmount(v: string): number {
  const s = v.replace(/[^\d.,]/g, '');
  if (!s) return 0;
  
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  
  if (lastDot > -1 && lastComma > -1) {
    if (lastComma > lastDot) return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
    return parseFloat(s.replace(/,/g, '')) || 0;
  }
  if (lastComma > -1) return parseFloat(s.replace(/,/g, '.')) || 0;
  return parseFloat(s) || 0;
}

function EditTransactionSheet({ transaction, categories, onClose, onSave }: EditTransactionSheetProps) {
  const [type, setType] = useState<'income' | 'expense'>(transaction?.type ?? 'expense');
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '');
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? '');
  const [date, setDate] = useState<Date>(transaction ? new Date(transaction.date) : new Date());
  const [comment, setComment] = useState(transaction?.comment ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!transaction) return;
    setType(transaction.type);
    setAmount(String(transaction.amount));
    setCategoryId(transaction.categoryId ?? '');
    setDate(new Date(transaction.date));
    setComment(transaction.comment ?? '');
  }, [transaction]);

  const filteredCategories = useMemo(
    () => categories.filter(c => c.type === type),
    [categories, type],
  );

  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
    setCategoryId('');
  };

  const handleSave = async () => {
    if (!transaction?.id || !amount || !categoryId) return;
    setSaving(true);
    try {
      await onSave(transaction.id, {
        type,
        amount: parseRuAmount(amount),
        categoryId,
        date: date.getTime(),
        comment: comment.trim() || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={!!transaction} onClose={onClose} title="Редактировать">
      <div className="flex flex-col pb-4">
        {/* Тип */}
        <div className="px-4 py-4">
          <div className="flex gap-2 p-1 bg-muted rounded-xl">
            {(['expense', 'income'] as const).map(t => (
              <button
                key={t}
                onClick={() => handleTypeChange(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  type === t
                    ? t === 'expense'
                      ? 'bg-red-600 text-white'
                      : 'bg-green-600 text-white'
                    : 'text-muted-foreground'
                }`}
              >
                {t === 'expense' ? 'Расход' : 'Доход'}
              </button>
            ))}
          </div>
        </div>

        {/* Сумма */}
        <div className="px-4 py-6">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={formatAmountInput(amount)}
            onChange={e => setAmount(e.target.value.replace(/\s/g, ''))}
            className="w-full text-4xl font-bold text-center bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
          />
          <p className="text-center text-muted-foreground mt-2">₽</p>
        </div>

        {/* Категории */}
        <div className="px-4 py-4">
          <h3 className="text-sm font-medium mb-3">Категория</h3>
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-muted rounded-xl">
            {filteredCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryId(cat.id)}
                className={`flex flex-col items-center gap-2 p-2 rounded-lg transition-all ${
                  categoryId === cat.id
                    ? 'bg-primary/10 dark:bg-primary/15 ring-2 ring-primary'
                    : 'hover:bg-accent'
                }`}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: cat.color + '20' }}
                >
                  <CategoryIcon name={cat.icon} className="w-6 h-6" color={cat.color} />
                </div>
                <span className="text-xs text-center leading-tight truncate w-full">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Дата и комментарий */}
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border">
            <Calendar className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <input
              type="date"
              value={formatDateInputValue(date)}
              onChange={e => setDate(parseDateInputValue(e.target.value))}
              className="flex-1 bg-transparent focus-visible:outline-none"
            />
          </div>
          <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border">
            <MessageSquare className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Комментарий (необязательно)"
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="flex-1 bg-transparent focus-visible:outline-none"
            />
          </div>
        </div>

        {/* Кнопки */}
        <div className="px-4 pb-[calc(1rem+env(safe-area-inset-bottom)+4rem)] flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-muted rounded-xl font-medium text-sm">
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!amount || !categoryId || saving}
            className="flex-[2] py-4 text-white rounded-xl font-semibold text-sm disabled:opacity-50 shadow-lg transition-all duration-200 hover:scale-[1.01] active:scale-[0.98]" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}
          >
            Сохранить
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

// ==================== TransactionFilters ====================

interface TransactionFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filterType: 'all' | 'expense' | 'income';
  setFilterType: (v: 'all' | 'expense' | 'income') => void;
  selectedCategory: string | null;
  setSelectedCategory: (v: string | null) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  filterCategories: Category[];
  onClearAll: () => void;
}

function TransactionFilters({
  isOpen, onClose, filterType, setFilterType, selectedCategory, setSelectedCategory,
  dateFrom, setDateFrom, dateTo, setDateTo, filterCategories, onClearAll,
}: TransactionFiltersProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Фильтры" side="top">
      <div className="flex flex-col pb-4">
        {/* Тип операции */}
        <div className="px-4 py-4">
          <label className="text-sm font-medium mb-3 block">Тип операции</label>
          <div className="flex gap-2 p-1 bg-muted rounded-xl">
            {([
              { value: 'all' as const, label: 'Все' },
              { value: 'expense' as const, label: 'Расходы' },
              { value: 'income' as const, label: 'Доходы' },
            ]).map(item => (
              <button
                key={item.value}
                onClick={() => { setFilterType(item.value); setSelectedCategory(null); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterType === item.value
                    ? 'bg-white dark:bg-card shadow-sm text-primary'
                    : 'text-muted-foreground'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* По категории */}
        <div className="px-4 py-4">
          <label className="text-sm font-medium mb-3 block">Категория</label>
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-muted rounded-xl">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                !selectedCategory
                  ? 'bg-white dark:bg-card shadow-sm text-primary'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              Все
            </button>
            {filterCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-primary/10 dark:bg-primary/15 ring-2 ring-primary'
                    : 'hover:bg-accent'
                }`}
              >
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="truncate">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* По дате */}
        <div className="px-4 py-4">
          <label className="text-sm font-medium mb-3 block">Период</label>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 p-3 bg-muted rounded-xl">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm"
              />
            </div>
            <span className="text-muted-foreground self-center">—</span>
            <div className="flex-1 flex items-center gap-2 p-3 bg-muted rounded-xl">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* Кнопки */}
        <div className="px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom)+4rem)] flex gap-3">
          <button
            onClick={() => { onClearAll(); onClose(); }}
            className="flex-1 py-3 bg-muted rounded-xl font-medium text-sm"
          >
            Сбросить
          </button>
          <button
            onClick={onClose}
            className="flex-[2] py-3 text-white rounded-xl font-semibold text-sm shadow-md transition-all duration-200 hover:scale-[1.01] active:scale-[0.98]" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}
          >
            Применить
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

// ==================== TransactionHistory ====================

export const TransactionHistory = () => {
  const { transactions, loading, remove, update } = useTransactions();
  const { categories } = useCategories();
  const categoriesMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [visiblePages, setVisiblePages] = useState(1);

  const filterCategories = useMemo(() => {
    if (filterType === 'expense') return categories.filter(c => c.type === 'expense');
    if (filterType === 'income') return categories.filter(c => c.type === 'income');
    return categories;
  }, [categories, filterType]);

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    if (filterType === 'expense') filtered = filtered.filter(t => t.type === 'expense');
    else if (filterType === 'income') filtered = filtered.filter(t => t.type === 'income');

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        const amountStr = t.amount.toString().replace(/[.,\s]/g, '');
        const queryNum = query.replace(/[.,\s]/g, '');
        return t.comment?.toLowerCase().includes(query)
          || cat?.name.toLowerCase().includes(query)
          || amountStr.includes(queryNum);
      });
    }

    if (selectedCategory) filtered = filtered.filter(t => t.categoryId === selectedCategory);

    if (dateFrom) {
      const [y, m, d] = dateFrom.split('-').map(Number);
      filtered = filtered.filter(t => t.date >= new Date(y, m - 1, d, 0, 0, 0, 0).getTime());
    }
    if (dateTo) {
      const [y, m, d] = dateTo.split('-').map(Number);
      filtered = filtered.filter(t => t.date <= new Date(y, m - 1, d, 23, 59, 59, 999).getTime());
    }

    return filtered.sort((a, b) => b.date - a.date);
  }, [transactions, searchQuery, selectedCategory, dateFrom, dateTo, filterType, categories]);

  const groupedTransactions = useMemo(() => {
    return filteredTransactions.reduce((groups, transaction) => {
      const dateKey = new Date(transaction.date).toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric',
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(transaction);
      return groups;
    }, {} as Record<string, Transaction[]>);
  }, [filteredTransactions]);

  const hasActiveFilters = searchQuery || selectedCategory || dateFrom || dateTo || filterType !== 'all';

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setDateFrom('');
    setDateTo('');
    setFilterType('all');
  };

  useEffect(() => { setVisiblePages(1); }, [searchQuery, selectedCategory, dateFrom, dateTo, filterType]);

  return (
    <div className="pb-28 bg-background min-h-screen">
      {/* Header */}
      <motion.section custom={0} variants={sectionVariants} initial="hidden" animate="visible">
      <div className="px-5 pt-4 pb-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold tracking-[-0.01em] mb-4">История операций</h1>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск: комментарий, категория, сумма..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-muted rounded-xl outline-none focus:ring-2 focus:ring-primary/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
          <button
            onClick={() => setIsFilterOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap flex-shrink-0 transition-all ${
              hasActiveFilters ? 'bg-primary text-white' : 'bg-muted text-foreground'
            }`}
          >
            <Filter className="w-4 h-4" />
            Фильтры
          </button>

          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-1 px-3 py-2 bg-primary/10 dark:bg-primary/15 text-primary dark:text-primary-light rounded-full whitespace-nowrap flex-shrink-0 text-sm"
            >
              {categories.find(c => c.id === selectedCategory)?.name}
              <X className="w-3 h-3" />
            </button>
          )}
          {dateFrom && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="flex items-center gap-1 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full whitespace-nowrap flex-shrink-0 text-sm"
            >
              {new Date(dateFrom + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
              {dateTo ? ` — ${new Date(dateTo + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}` : ''}
              <X className="w-3 h-3" />
            </button>
          )}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="px-3 py-2 text-muted-foreground rounded-full whitespace-nowrap flex-shrink-0 text-sm hover:text-foreground transition-colors"
            >
              Сбросить
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <div className="mt-2 text-sm text-muted-foreground">
            Найдено: {filteredTransactions.length} операций
          </div>
        )}
      </div>
      </motion.section>

      {/* Transaction List */}
      <div className="px-5 py-4">
        {loading && transactions.length === 0 ? (
          <div className="space-y-4">
            <div className="h-6 bg-muted/50 rounded w-24 mb-3 animate-pulse" />
            <div className="card-premium overflow-hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={`flex items-center gap-3 p-4 bg-card ${i !== 5 ? 'border-b border-border' : ''}`}>
                  <div className="w-12 h-12 rounded-xl bg-muted/50 animate-pulse flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted/50 rounded w-1/3 mb-2 animate-pulse" />
                    <div className="h-3 bg-muted/50 rounded w-1/2 animate-pulse" />
                  </div>
                  <div className="text-right">
                    <div className="h-5 bg-muted/50 rounded w-16 mb-2 animate-pulse ml-auto" />
                    <div className="h-3 bg-muted/50 rounded w-10 animate-pulse ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : Object.keys(groupedTransactions).length > 0 ? (() => {
          const groupEntries = Object.entries(groupedTransactions);
          const shownGroups: [string, Transaction[]][] = [];
          let count = 0;

          for (const [date, txs] of groupEntries) {
            if (count + txs.length <= PAGE_SIZE * visiblePages) {
              shownGroups.push([date, txs]);
              count += txs.length;
            } else {
              const remaining = PAGE_SIZE * visiblePages - count;
              if (remaining > 0) shownGroups.push([date, txs.slice(0, remaining)]);
              break;
            }
          }

          const shownCount = shownGroups.reduce((sum, [, txs]) => sum + txs.length, 0);
          const hasMore = shownCount < filteredTransactions.length;

          return (
            <>
              {shownGroups.map(([date, dayTransactions], gi) => (
                <motion.section key={date} custom={1 + gi} variants={sectionVariants} initial="hidden" animate="visible">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-muted-foreground">{date}</h3>
                    <span className="text-sm text-muted-foreground">
                      {dayTransactions.length} {
                        ['операция', 'операции', 'операций'][
                          (dayTransactions.length % 100 > 4 && dayTransactions.length % 100 < 20) ? 2 :
                          [2, 0, 1, 1, 1, 2][Math.min(dayTransactions.length % 10, 5)]
                        ]
                      }
                    </span>
                  </div>
                  <div className="card-premium overflow-hidden">
                    {dayTransactions.map((transaction, index) => {
                      const category = categoriesMap.get(transaction.categoryId);
                      return (
                        <TransactionItem
                          key={transaction.id}
                          transaction={transaction}
                          category={category}
                          isLast={index === dayTransactions.length - 1}
                          onDelete={async () => {
                            if (transaction.id !== undefined) {
                              try {
                                await remove(transaction.id);
                                setVisiblePages(1);
                              } catch (e) {
                                console.error('Failed to remove transaction', e);
                              }
                            }
                          }}
                          onEdit={() => setEditingTransaction(transaction)}
                        />
                      );
                    })}
                  </div>
                </div>
                </motion.section>
              ))}

              {hasMore && (
                <div className="flex justify-center py-4">
                  <button
                    onClick={() => setVisiblePages(p => p + 1)}
                    className="flex items-center gap-2 px-6 py-3 bg-card border border-border rounded-xl font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <ChevronDown className="w-5 h-5" />
                    Загрузить ещё
                    <span className="text-muted-foreground text-sm">
                      ({filteredTransactions.length - shownCount} из {filteredTransactions.length})
                    </span>
                  </button>
                </div>
              )}
            </>
          );
        })() : (
          <motion.section custom={0} variants={sectionVariants} initial="hidden" animate="visible">
          <EmptyState icon="Banknote" title="Нет транзакций" description="Здесь будут отображаться все ваши операции" />
          </motion.section>
        )}
      </div>

      <TransactionFilters
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filterType={filterType}
        setFilterType={setFilterType}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        filterCategories={filterCategories}
        onClearAll={clearAllFilters}
      />

      <EditTransactionSheet
        transaction={editingTransaction}
        categories={categories}
        onClose={() => setEditingTransaction(null)}
        onSave={async (id, updates) => { await update(id, updates); setVisiblePages(1); }}
      />
    </div>
  );
};
