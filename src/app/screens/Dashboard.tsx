import { Bell, Camera, Calendar, TrendingUp } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { motion } from 'motion/react';
import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CategoryBadge } from '../components/CategoryBadge';
import { AmountDisplay } from '../components/AmountDisplay';
import { useAnalytics, getPeriodRange, PeriodType } from '../hooks/useAnalytics';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationPanel } from '../hooks/useNotificationPanel';
import { useBudgetNotifications } from '../hooks/useBudgetNotifications';
import { useBudgets } from '../hooks/useBudgets';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { NotificationsPanel } from '../components/NotificationsPanel';
import { BottomSheet } from '../components/BottomSheet';
import { MS_PER_MONTH, MS_PER_WEEK } from '../constants';
import { formatDateInputValue, parseDateInputValue } from '../utils/formatCurrency';
import { Transaction, Category } from '../../db/types';

// ==================== BalanceCard ====================

interface BalanceCardProps {
  totalBalance: number;
  income: number;
  expense: number;
  savingsAmount: number;
  freeBalance: number;
}

function BalanceCard({ totalBalance, income, expense, savingsAmount, freeBalance }: BalanceCardProps) {
  return (
    <div className="card-featured mb-5">
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="label-sm mb-1">Баланс</p>
          <p className="text-3xl font-bold tracking-[-0.02em] text-numeric">
            {totalBalance.toLocaleString('ru-RU')} ₽
          </p>
        </div>
        {savingsAmount > 0 && (
          <div className="px-2.5 py-1 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-900">
            <p className="text-[10px] text-green-700 dark:text-green-400 font-semibold leading-tight">Свободно</p>
            <p className="text-sm font-bold text-green-700 dark:text-green-400 text-numeric">
              {freeBalance.toLocaleString('ru-RU')} ₽
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <div className="flex-1 bg-green-50 dark:bg-green-950 rounded-2xl p-3 border border-green-100 dark:border-green-900">
          <p className="text-[10px] text-green-700 dark:text-green-400 uppercase tracking-[0.05em] font-semibold mb-1">
            Доходы
          </p>
          <p className="text-base font-bold text-green-700 dark:text-green-400 text-numeric">
            +{income.toLocaleString('ru-RU')} ₽
          </p>
        </div>
        <div className="flex-1 bg-red-50 dark:bg-red-950 rounded-2xl p-3 border border-red-100 dark:border-red-900">
          <p className="text-[10px] text-red-700 dark:text-red-400 uppercase tracking-[0.05em] font-semibold mb-1">
            Расходы
          </p>
          <p className="text-base font-bold text-red-700 dark:text-red-400 text-numeric">
            −{expense.toLocaleString('ru-RU')} ₽
          </p>
        </div>
      </div>
    </div>
  );
}

// ==================== ExpenseBreakdown ====================

interface ExpenseBreakdownProps {
  data: Array<{ name: string; value: number; color: string }>;
}

function ExpenseBreakdown({ data }: ExpenseBreakdownProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="px-5 py-4">
      <h2 className="font-bold mb-4">Расходы по категориям</h2>
      <div className="card-premium p-5">
        {data.length > 0 ? (
          <>
            <div className="flex items-center justify-center mb-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {data.slice(0, 5).map((item) => {
                const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                return (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{pct}%</span>
                      <span className="text-sm font-semibold">
                        {item.value.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <EmptyState emoji="📊" title="Нет данных" description="Добавьте транзакции за этот период, чтобы увидеть структуру расходов" />
        )}
      </div>
    </div>
  );
}

// ==================== RecentTransactions ====================

interface RecentTransactionsProps {
  transactions: Transaction[];
  categories: Category[];
}

function RecentTransactions({ transactions, categories }: RecentTransactionsProps) {
  return (
    <div className="px-5 pb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold">Последние операции</h2>
        <Link to="/history" className="text-sm text-violet-600 dark:text-violet-400">
          Все
        </Link>
      </div>
      <div className="card-premium overflow-hidden">
        {transactions.length > 0 ? (
          transactions.map((transaction, index) => {
            const category = categories.find(c => c.id === transaction.categoryId);
            const time = new Date(transaction.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            return (
              <div
                key={transaction.id}
                className={`flex items-center gap-3 p-4 ${
                  index !== transactions.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <CategoryBadge categoryId={transaction.categoryId as string | undefined} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{category?.name || 'Без категории'}</p>
                  {transaction.comment && (
                    <p className="text-xs text-muted-foreground truncate">{transaction.comment}</p>
                  )}
                </div>
                <div className="text-right">
                  <AmountDisplay amount={transaction.amount} type={transaction.type} size="md" />
                  <p className="text-xs text-muted-foreground">{time}</p>
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState emoji="💸" title="Нет транзакций" description="Добавьте первую транзакцию, чтобы начать учёт" />
        )}
      </div>
    </div>
  );
}

// ==================== BudgetProgressSection ====================

interface BudgetProgressSectionProps {
  expensesByCategory: Array<{ name: string; value: number; color: string; categoryId?: string }>;
  categories: Category[];
}

function BudgetProgressSection({ expensesByCategory, categories }: BudgetProgressSectionProps) {
  const { budgets } = useBudgets();

  const activeBudgets = useMemo(() => {
    return budgets
      .map(budget => {
        const cat = categories.find(c => c.id === budget.categoryId);
        const spent = expensesByCategory.find(e => e.categoryId === budget.categoryId)?.value ?? 0;
        const pct = budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0;
        return { budget, cat, spent, pct };
      })
      .filter(b => b.cat)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3);
  }, [budgets, categories, expensesByCategory]);

  if (activeBudgets.length === 0) return null;

  const getBarColor = (pct: number) =>
    pct > 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e';

  return (
    <div className="px-5 pb-2">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold">Бюджеты</h2>
        <Link to="/budgets" className="text-sm text-violet-600 dark:text-violet-400 flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5" />
          Все
        </Link>
      </div>
      <div className="card-premium overflow-hidden">
        {activeBudgets.map(({ budget, cat, spent, pct }, index) => (
          <div
            key={budget.id}
            className={`p-4 ${index !== activeBudgets.length - 1 ? 'border-b border-border' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat!.color }} />
                <span className="text-sm font-medium">{cat!.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{spent.toLocaleString('ru-RU')} ₽</span>
                <span className="text-xs text-muted-foreground">/</span>
                <span className="text-xs font-medium">{budget.amount.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: getBarColor(pct), transition: 'width 600ms cubic-bezier(0.34,1.56,0.64,1)' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

// ==================== Dashboard ====================

const AVATAR_COLORS = [
  'from-amber-400 to-pink-500',
  'from-violet-500 to-purple-600',
  'from-blue-400 to-cyan-500',
  'from-green-400 to-emerald-500',
  'from-orange-400 to-red-500',
  'from-pink-400 to-rose-500',
];

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: 'easeOut' as const }
  }),
};

export const Dashboard = () => {
  const [period, setPeriod] = useState<PeriodType>('month');
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date(Date.now() - MS_PER_MONTH));
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());
  const [isCustomPeriodOpen, setIsCustomPeriodOpen] = useState(false);

  const periodRange = period === 'custom'
    ? { start: customStartDate.getTime(), end: customEndDate.getTime() }
    : getPeriodRange(period);

  const { balance, currentBalance, expensesByCategory: analyticsExpenses, savingsAmount, freeBalance } = useAnalytics({ period, startDate: periodRange.start, endDate: periodRange.end });
  const { transactions } = useTransactions({ period, startDate: periodRange.start, endDate: periodRange.end });
  const { categories } = useCategories();
  const { user, updateProfile } = useAuth();
  const { hasUnread, notifications: panelNotifications, markAllRead, clearRead } = useNotificationPanel();
  const { checkBudgets } = useBudgetNotifications();
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    checkBudgets();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkBudgets();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [checkBudgets]);

  const income = balance?.income ?? 0;
  const expense = balance?.expenses ?? analyticsExpenses.reduce((sum, c) => sum + c.amount, 0);

  const expensesByCategory = useMemo(() =>
    analyticsExpenses.map(c => ({ name: c.categoryName, value: c.amount, color: c.color, categoryId: c.categoryId })),
    [analyticsExpenses]
  );

  const recentTransactions = useMemo(() => transactions.slice(0, 5), [transactions]);

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  const handleAvatarSelect = async (color: string) => {
    await updateProfile({ avatarColor: color });
    setIsAvatarDialogOpen(false);
  };

  const handlePeriodChange = (value: PeriodType) => {
    if (value === 'custom') {
      setIsCustomPeriodOpen(true);
    } else {
      setPeriod(value);
    }
  };

  return (
    <div className="pb-28 bg-background min-h-screen">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{getGreeting()},</p>
            <h1 className="text-[22px] font-bold tracking-[-0.02em]">{user?.name || 'Пользователь'}</h1>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              aria-label="Открыть уведомления"
              onClick={() => setIsNotificationsOpen(true)}
              className="w-10 h-10 rounded-full bg-card border border-border shadow-xs flex items-center justify-center relative hover:shadow-sm transition-shadow"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              {hasUnread && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-card" />
              )}
            </button>
            <button
              aria-label="Выбрать аватар"
              onClick={() => setIsAvatarDialogOpen(true)}
              className={`w-10 h-10 rounded-full bg-gradient-to-br ${user?.avatarColor || 'from-amber-400 to-pink-500'} flex items-center justify-center font-bold text-white relative group shadow-md`}
            >
              {getInitial(user?.name || 'U')}
              <Camera className="w-4 h-4 absolute opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>

        <motion.section custom={0} variants={sectionVariants} initial="hidden" animate="visible">
          <BalanceCard
            totalBalance={currentBalance}
            income={income}
            expense={expense}
            savingsAmount={savingsAmount}
            freeBalance={freeBalance}
          />
        </motion.section>

        {/* Period Switcher */}
        <div className="flex gap-1 p-1 bg-card rounded-xl border border-border shadow-xs">
          {[
            { value: 'day' as PeriodType, label: 'День' },
            { value: 'week' as PeriodType, label: 'Неделя' },
            { value: 'month' as PeriodType, label: 'Месяц' },
            { value: 'custom' as PeriodType, label: 'Период' },
          ].map(p => (
            <button
              key={p.value}
              onClick={() => handlePeriodChange(p.value)}
              className={`flex-1 py-2.5 px-3 rounded-[10px] text-sm transition-all duration-200 ${
                period === p.value
                  ? 'bg-muted shadow-sm font-semibold text-foreground'
                  : 'text-muted-foreground hover:text-foreground font-medium'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <motion.section custom={1} variants={sectionVariants} initial="hidden" animate="visible">
        <ExpenseBreakdown data={expensesByCategory} />
      </motion.section>

      <motion.section custom={2} variants={sectionVariants} initial="hidden" animate="visible">
        <BudgetProgressSection expensesByCategory={expensesByCategory} categories={categories} />
      </motion.section>

      <motion.section custom={3} variants={sectionVariants} initial="hidden" animate="visible">
      {/* Quick Links */}
      <div className="px-5 py-4">
        <div className="grid grid-cols-2 gap-2.5">
          <Link to="/budgets" className="card-premium p-4 flex items-center gap-3 hover:shadow-md transition-shadow duration-200 active:scale-[0.98]">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-red-50 dark:bg-red-950 flex items-center justify-center text-lg shadow-xs">
              💰
            </div>
            <div>
              <p className="text-sm font-semibold">Бюджеты</p>
              <p className="text-xs text-muted-foreground">Контроль лимитов</p>
            </div>
          </Link>

          <Link to="/goals" className="card-premium p-4 flex items-center gap-3 hover:shadow-md transition-shadow duration-200 active:scale-[0.98]">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-green-50 dark:bg-green-950 flex items-center justify-center text-lg shadow-xs">
              🎯
            </div>
            <div>
              <p className="text-sm font-semibold">Цели</p>
              <p className="text-xs text-muted-foreground">Накопления</p>
            </div>
          </Link>

          <Link to="/categories" className="card-premium p-4 flex items-center gap-3 hover:shadow-md transition-shadow duration-200 active:scale-[0.98]">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-lg shadow-xs">
              📂
            </div>
            <div>
              <p className="text-sm font-semibold">Категории</p>
              <p className="text-xs text-muted-foreground">Управление</p>
            </div>
          </Link>

          <Link to="/recurring" className="card-premium p-4 flex items-center gap-3 hover:shadow-md transition-shadow duration-200 active:scale-[0.98]">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-lg shadow-xs">
              🔄
            </div>
            <div>
              <p className="text-sm font-semibold">Повтор</p>
              <p className="text-xs text-muted-foreground">Регулярные платежи</p>
            </div>
          </Link>

          <Link to="/ai-assistant" className="col-span-2 card-premium p-4 flex items-center gap-3 hover:shadow-md transition-shadow duration-200 active:scale-[0.98]">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-lg shadow-xs">
              ✨
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">AI Помощник</p>
              <p className="text-xs text-muted-foreground">Аналитика и советы</p>
            </div>
            <span className="text-muted-foreground">→</span>
          </Link>
        </div>
      </div>
      </motion.section>

      <motion.section custom={4} variants={sectionVariants} initial="hidden" animate="visible">
        <RecentTransactions transactions={recentTransactions} categories={categories} />
      </motion.section>

      {/* Avatar Selection Dialog */}
      <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Выберите аватар</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            {AVATAR_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => handleAvatarSelect(color)}
                className={`w-16 h-16 rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-bold text-white text-xl hover:scale-110 transition-transform ${
                  user?.avatarColor === color ? 'ring-4 ring-violet-600' : ''
                }`}
              >
                {getInitial(user?.name || 'U')}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Period BottomSheet */}
      <BottomSheet
        isOpen={isCustomPeriodOpen}
        onClose={() => setIsCustomPeriodOpen(false)}
        title="Выберите период"
        side="top"
      >
        <div className="px-4 py-4 pb-8 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Дата начала</label>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <input
                aria-label="Дата начала периода"
                type="date"
                value={formatDateInputValue(customStartDate)}
                onChange={(e) => setCustomStartDate(parseDateInputValue(e.target.value))}
                className="flex-1 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Дата окончания</label>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <input
                aria-label="Дата окончания периода"
                type="date"
                value={formatDateInputValue(customEndDate)}
                onChange={(e) => setCustomEndDate(parseDateInputValue(e.target.value))}
                className="flex-1 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setCustomStartDate(new Date(Date.now() - MS_PER_WEEK));
                setCustomEndDate(new Date());
              }}
              className="flex-1 py-2 bg-muted rounded-xl font-medium"
            >
              Неделя
            </button>
            <button
              onClick={() => {
                setCustomStartDate(new Date(Date.now() - MS_PER_MONTH));
                setCustomEndDate(new Date());
              }}
              className="flex-1 py-2 bg-muted rounded-xl font-medium"
            >
              Месяц
            </button>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setIsCustomPeriodOpen(false)}
              className="flex-1 py-3 bg-muted rounded-xl font-medium"
            >
              Отмена
            </button>
            <button
              onClick={() => { setPeriod('custom'); setIsCustomPeriodOpen(false); }}
              className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-indigo-700 text-white rounded-xl font-medium"
            >
              Применить
            </button>
          </div>
        </div>
      </BottomSheet>

      <NotificationsPanel
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={panelNotifications}
        hasUnread={hasUnread}
        markAllRead={markAllRead}
        clearRead={clearRead}
      />
    </div>
  );
};
