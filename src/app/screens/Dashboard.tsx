import { Bell } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CategoryBadge } from '../components/CategoryBadge';
import { AmountDisplay } from '../components/AmountDisplay';
import { Target, Folder, Sparkles, DollarSign } from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';

export const Dashboard = () => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'custom'>('month');
  const { currentBalance, expensesByCategory: analyticsExpenses } = useAnalytics();
  const { transactions } = useTransactions();
  const { categories } = useCategories();

  // Calculate totals from analytics
  const income = currentBalance > 0 ? currentBalance : 0;
  const expense = analyticsExpenses.reduce((sum, c) => sum + c.amount, 0);
  const balance = currentBalance;

  // Transform analytics data for pie chart
  const expensesByCategory = analyticsExpenses.map(c => ({
    name: c.categoryName,
    value: c.amount,
    color: c.color,
  }));

  const recentTransactions = transactions.slice(0, 5);

  const periods = [
    { value: 'day', label: 'День' },
    { value: 'week', label: 'Неделя' },
    { value: 'month', label: 'Месяц' },
    { value: 'custom', label: 'Период' },
  ] as const;

  return (
    <div className="pb-20 bg-background min-h-screen">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 bg-gradient-to-br from-violet-600 to-indigo-700 text-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm opacity-90">Привет,</p>
            <h1 className="text-xl font-bold">Александр</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-pink-500 flex items-center justify-center font-bold">
              А
            </div>
          </div>
        </div>

        {/* Balance Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4">
          <p className="text-xs opacity-80 mb-1">Общий баланс</p>
          <p className="text-3xl font-bold mb-3">{balance.toLocaleString('ru-RU')} ₽</p>
          <div className="flex gap-4">
            <div className="flex-1">
              <p className="text-xs opacity-80">Доходы</p>
              <p className="text-lg font-semibold">+{income.toLocaleString('ru-RU')} ₽</p>
            </div>
            <div className="flex-1">
              <p className="text-xs opacity-80">Расходы</p>
              <p className="text-lg font-semibold">−{expense.toLocaleString('ru-RU')} ₽</p>
            </div>
          </div>
        </div>

        {/* Period Switcher */}
        <div className="flex gap-2">
          {periods.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                period === p.value 
                  ? 'bg-white text-violet-700' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expense Breakdown */}
      <div className="px-4 py-4">
        <h2 className="font-bold mb-4">Расходы по категориям</h2>
        <div className="bg-card rounded-2xl p-4 border border-border">
          {expensesByCategory.length > 0 ? (
            <>
              <div className="flex items-center justify-center mb-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {expensesByCategory.slice(0, 5).map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold">
                      {item.value.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">Нет данных</p>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <Link to="/budgets" className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:bg-muted transition-colors">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Бюджеты</p>
              <p className="text-xs text-muted-foreground">Контроль лимитов</p>
            </div>
          </Link>

          <Link to="/goals" className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:bg-muted transition-colors">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-950 flex items-center justify-center">
              <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Цели</p>
              <p className="text-xs text-muted-foreground">Накопления</p>
            </div>
          </Link>

          <Link to="/categories" className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:bg-muted transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
              <Folder className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Категории</p>
              <p className="text-xs text-muted-foreground">Управление</p>
            </div>
          </Link>

          <Link to="/ai-assistant" className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:bg-muted transition-colors">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium">AI Помощник</p>
              <p className="text-xs text-muted-foreground">Аналитика</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Последние операции</h2>
          <Link to="/history" className="text-sm text-violet-600 dark:text-violet-400">
            Все
          </Link>
        </div>
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction, index) => {
              const category = categories.find(c => c.id === transaction.categoryId);
              const date = new Date(transaction.date);
              const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
              return (
                <div
                  key={transaction.id}
                  className={`flex items-center gap-3 p-4 ${
                    index !== recentTransactions.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <CategoryBadge categoryId={transaction.categoryId} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{category?.name || 'Без категории'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {transaction.comment || ''}
                    </p>
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

      {/* FAB Button */}
      <Link 
        to="/add"
        className="fixed bottom-20 right-4 w-14 h-14 bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow z-40"
      >
        <span className="text-3xl leading-none mb-1">+</span>
      </Link>
    </div>
  );
};