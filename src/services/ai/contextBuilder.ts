import {
  getBalanceByPeriod,
  getExpensesByCategory,
  getAllBudgetsProgress,
  getGoalsProgress,
  getRecurringUpcoming,
  getSavingsRate,
} from '../../db/analytics';

const fmt = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/\u00A0/g, ' ');

export async function buildFinancialSnapshot(): Promise<string> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = now.getTime();

  const [balance, categories, budgets, goals, upcoming, savings] = await Promise.all([
    getBalanceByPeriod(monthStart, end).catch(() => ({ income: 0, expenses: 0, balance: 0, periodStart: monthStart, periodEnd: end })),
    getExpensesByCategory(monthStart, end).catch(() => []),
    getAllBudgetsProgress(monthStart, end).catch(() => []),
    getGoalsProgress().catch(() => []),
    getRecurringUpcoming(30).catch(() => []),
    getSavingsRate(monthStart, end).catch(() => ({ income: 0, expenses: 0, saved: 0, savingsRate: 0 })),
  ]);

  const monthName = now.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
  const lines: string[] = [
    `Финансовый профиль пользователя (${monthName}):`,
    `Баланс: ${fmt(balance.balance)} ₽`,
    `Доходы за месяц: ${fmt(balance.income)} ₽ | Расходы: ${fmt(balance.expenses)} ₽`,
  ];

  if (savings.income > 0) {
    lines.push(`Норма сбережений: ${Math.round(savings.savingsRate)}%`);
  }

  if (categories.length > 0) {
    const top = categories.slice(0, 5)
      .map(c => `${c.categoryName} ${fmt(c.amount)} ₽`)
      .join(', ');
    lines.push(`Топ категории расходов: ${top}`);
  }

  if (budgets.length > 0) {
    const budgetStr = budgets
      .map(b => {
        const flag = b.isOverBudget ? '[over]' : b.percent >= 80 ? '[warn]' : '[ok]';
        return `${b.categoryName} ${fmt(b.spent)}/${fmt(b.limit)} ₽ ${flag}`;
      })
      .join(', ');
    lines.push(`Бюджеты: ${budgetStr}`);
  }

  const activeGoals = goals.filter(g => g.isActive && g.percent < 100);
  if (activeGoals.length > 0) {
    const goalStr = activeGoals
      .slice(0, 3)
      .map(g => `"${g.name}" ${fmt(g.currentAmount)}/${fmt(g.targetAmount)} ₽ (${Math.round(g.percent)}%)`)
      .join(', ');
    lines.push(`Цели накопления: ${goalStr}`);
  }

  if (upcoming.length > 0) {
    const payStr = upcoming
      .slice(0, 3)
      .map(r => {
        const when =
          r.daysUntil <= 0 ? 'сегодня' :
          r.daysUntil === 1 ? 'завтра' :
          `через ${r.daysUntil} дн.`;
        return `${r.label} ${fmt(r.amount)} ₽ (${when})`;
      })
      .join(', ');
    lines.push(`Ближайшие платежи: ${payStr}`);
  }

  return lines.join('\n');
}
