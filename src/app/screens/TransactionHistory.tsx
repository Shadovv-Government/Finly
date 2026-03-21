import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { CategoryBadge } from '../components/CategoryBadge';
import { AmountDisplay } from '../components/AmountDisplay';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { Transaction } from '../../db/types';

export const TransactionHistory = () => {
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  // Group transactions by date
  const groupedTransactions = transactions
    .sort((a, b) => b.date - a.date)
    .reduce((groups, transaction) => {
      const dateKey = new Date(transaction.date).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(transaction);
      return groups;
    }, {} as Record<string, Transaction[]>);

  const filterCategories = [
    'Все',
    'Продукты',
    'Транспорт',
    'Кафе и рестораны',
    'Развлечения',
  ];

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
            placeholder="Поиск операций..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-muted rounded-xl outline-none focus:ring-2 focus:ring-violet-600"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-full whitespace-nowrap flex-shrink-0">
            <Filter className="w-4 h-4" />
            Март 2026
          </button>
          {filterCategories.map(filter => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter === selectedFilter ? null : filter)}
              className={`px-4 py-2 rounded-full whitespace-nowrap flex-shrink-0 ${
                filter === selectedFilter 
                  ? 'bg-violet-600 text-white' 
                  : 'bg-muted text-foreground'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      <div className="px-4 py-4">
        {Object.entries(groupedTransactions).map(([date, dayTransactions]) => (
          <div key={date} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">{date}</h3>
              <span className="text-sm text-muted-foreground">
                {dayTransactions.length} операций
              </span>
            </div>
            
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              {dayTransactions.length > 0 ? (
                dayTransactions.map((transaction, index) => {
                  const category = categories.find(c => c.id === transaction.categoryId);
                  const time = new Date(transaction.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div
                      key={transaction.id}
                      className={`flex items-center gap-3 p-4 ${
                        index !== dayTransactions.length - 1 ? 'border-b border-border' : ''
                      }`}
                    >
                      <CategoryBadge categoryId={transaction.categoryId} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {transaction.comment || category?.name || 'Без категории'}
                        </p>
                        {!transaction.comment && (
                          <p className="text-sm text-muted-foreground truncate">{time}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <AmountDisplay
                          amount={transaction.amount}
                          type={transaction.type}
                          size="md"
                        />
                        <p className="text-xs text-muted-foreground">{time}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-muted-foreground py-8">Нет транзакций</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      <div className="px-4 pb-4">
        <button className="w-full py-3 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:bg-muted transition-colors">
          Загрузить еще
        </button>
      </div>
    </div>
  );
};
