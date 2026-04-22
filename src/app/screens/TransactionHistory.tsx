import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Filter, X, Calendar, ChevronDown, Trash2 } from 'lucide-react';
import { CategoryBadge } from '../components/CategoryBadge';
import { AmountDisplay } from '../components/AmountDisplay';
import { BottomSheet } from '../components/BottomSheet';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { Transaction } from '../../db/types';

const PAGE_SIZE = 50;
const SWIPE_THRESHOLD = 72;

function SwipeableRow({ onDelete, children }: { onDelete: () => void; children: React.ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentOffsetRef = useRef(0);

  const translate = (x: number, animated: boolean) => {
    if (!contentRef.current) return;
    contentRef.current.style.transition = animated ? 'transform 0.22s ease' : 'none';
    contentRef.current.style.transform = `translateX(${x}px)`;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentOffsetRef.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startXRef.current;
    if (dx < 0) {
      const offset = Math.max(dx, -(SWIPE_THRESHOLD + 24));
      currentOffsetRef.current = offset;
      translate(offset, false);
    }
  };

  const handleTouchEnd = () => {
    if (currentOffsetRef.current < -SWIPE_THRESHOLD) {
      translate(-300, true);
      setTimeout(onDelete, 200);
    } else {
      translate(0, true);
    }
    currentOffsetRef.current = 0;
  };

  return (
    <div className="relative overflow-hidden">
      <div className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-red-500">
        <Trash2 className="w-5 h-5 text-white" />
      </div>
      <div
        ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

export const TransactionHistory = () => {
  const { transactions, remove } = useTransactions();
  const { categories } = useCategories();

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
      filtered = filtered.filter(t => t.date >= new Date(y, m - 1, d).getTime());
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
    <div className="pb-20 bg-background min-h-screen">
      {/* Header */}
      <div className="px-4 py-4 bg-card border-b border-border sticky top-0 z-10">
        <h1 className="text-xl font-bold mb-4">История операций</h1>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск: комментарий, категория, сумма..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-muted rounded-xl outline-none focus:ring-2 focus:ring-violet-600"
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

        {/* Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <button
            onClick={() => setIsFilterOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap flex-shrink-0 transition-all ${
              hasActiveFilters ? 'bg-violet-600 text-white' : 'bg-muted text-foreground'
            }`}
          >
            <Filter className="w-4 h-4" />
            Фильтры
          </button>

          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-1 px-3 py-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full whitespace-nowrap flex-shrink-0 text-sm"
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
              {new Date(dateFrom).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
              {dateTo ? ` — ${new Date(dateTo).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}` : ''}
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

      {/* Transaction List */}
      <div className="px-4 py-4">
        {Object.keys(groupedTransactions).length > 0 ? (() => {
          const groupEntries = Object.entries(groupedTransactions);
          let shownGroups: [string, Transaction[]][] = [];
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
              {shownGroups.map(([date, dayTransactions]) => (
                <div key={date} className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-muted-foreground">{date}</h3>
                    <span className="text-sm text-muted-foreground">{dayTransactions.length} операций</span>
                  </div>
                  <div className="bg-card rounded-2xl border border-border overflow-hidden">
                    {dayTransactions.map((transaction, index) => {
                      const category = categories.find(c => c.id === transaction.categoryId);
                      const time = new Date(transaction.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                      return (
                        <SwipeableRow
                          key={transaction.id}
                          onDelete={() => transaction.id !== undefined && remove(transaction.id)}
                        >
                          <div className={`flex items-center gap-3 p-4 bg-card ${index !== dayTransactions.length - 1 ? 'border-b border-border' : ''}`}>
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
                    })}
                  </div>
                </div>
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
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {hasActiveFilters ? 'Ничего не найдено' : 'Нет транзакций'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="mt-3 px-6 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filters BottomSheet */}
      <BottomSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Фильтры"
        side="top"
      >
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
                      ? 'bg-white dark:bg-card shadow-sm text-violet-600 dark:text-violet-400'
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
                    ? 'bg-white dark:bg-card shadow-sm text-violet-600 dark:text-violet-400'
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
                      ? 'bg-violet-100 dark:bg-violet-950 ring-2 ring-violet-600'
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
              onClick={() => { clearAllFilters(); setIsFilterOpen(false); }}
              className="flex-1 py-3 bg-muted rounded-xl font-medium text-sm"
            >
              Сбросить
            </button>
            <button
              onClick={() => setIsFilterOpen(false)}
              className="flex-[2] py-3 bg-gradient-to-r from-violet-600 to-indigo-700 text-white rounded-xl font-semibold text-sm"
            >
              Применить
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};
