import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChevronDown } from 'lucide-react';
import { useMemo } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';

export const Analytics = () => {
  const { balance, expensesByCategory, spendingTrend } = useAnalytics();

  const income = balance?.income || 0;
  const expense = balance?.expenses || 0;
  const balanceAmount = balance?.balance || 0;

  // Bar chart data from spending trend (мемоизация)
  const weeklyData = useMemo(() => 
    spendingTrend.slice(0, 4).map((point, i) => ({
      week: `Нед ${i + 1}`,
      income: Math.round(point.amount * 0.8),
      expense: point.amount,
    })),
    [spendingTrend]
  );

  // Pie chart data (мемоизация)
  const pieData = useMemo(() => 
    expensesByCategory.map(c => ({
      name: c.categoryName,
      value: c.amount,
      color: c.color,
      percentage: expense > 0 ? (c.amount / expense) * 100 : 0,
    })).filter(c => c.value > 0).sort((a, b) => b.value - a.value),
    [expensesByCategory, expense]
  );

  return (
    <div className="pb-20 bg-background min-h-screen">
      {/* Header */}
      <div className="px-4 py-4 bg-card border-b border-border sticky top-0 z-10">
        <h1 className="text-xl font-bold mb-4">Аналитика</h1>
        
        {/* Period Selector */}
        <button className="w-full flex items-center justify-between px-4 py-3 bg-muted rounded-xl">
          <span className="font-medium">Март 2026</span>
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-4">
            <p className="text-xs opacity-90 mb-1">Доходы</p>
            <p className="text-lg font-bold">+{(income / 1000).toFixed(0)}K</p>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-rose-600 text-white rounded-2xl p-4">
            <p className="text-xs opacity-90 mb-1">Расходы</p>
            <p className="text-lg font-bold">−{(expense / 1000).toFixed(0)}K</p>
          </div>
          <div className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-2xl p-4">
            <p className="text-xs opacity-90 mb-1">Баланс</p>
            <p className="text-lg font-bold">{(balanceAmount / 1000).toFixed(0)}K</p>
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="px-4 py-4">
        <h2 className="font-bold mb-4">Доходы vs Расходы</h2>
        <div className="bg-card rounded-2xl p-4 border border-border">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData}>
              <XAxis dataKey="week" stroke="currentColor" className="text-muted-foreground text-xs" />
              <YAxis stroke="currentColor" className="text-muted-foreground text-xs" />
              <Bar dataKey="income" fill="#22c55e" radius={[8, 8, 0, 0]} />
              <Bar dataKey="expense" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm">Доходы</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm">Расходы</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="px-4 py-4">
        <h2 className="font-bold mb-4">Структура расходов</h2>
        <div className="bg-card rounded-2xl p-4 border border-border">
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-4">
                {pieData.slice(0, 5).map((category) => (
                  <div key={category.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                      <span className="text-sm">{category.name}</span>
                    </div>
                    <span className="text-sm font-semibold">{category.value.toLocaleString('ru-RU')} ₽</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">Нет данных</p>
          )}
        </div>
      </div>

      {/* Top Categories */}
      <div className="px-4 pb-4">
        <h2 className="font-bold mb-4">Топ категорий</h2>
        <div className="bg-card rounded-2xl p-4 border border-border space-y-4">
          {pieData.slice(0, 5).map((category, index) => (
            <div key={category.name}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-muted-foreground">
                    #{index + 1}
                  </span>
                  <span className="font-medium">{category.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{category.value.toLocaleString('ru-RU')} ₽</p>
                  <p className="text-xs text-muted-foreground">
                    {category.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${category.percentage}%`,
                    backgroundColor: category.color
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
