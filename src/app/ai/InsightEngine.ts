// src/app/ai/InsightEngine.ts
// Движок генерации аналитических инсайтов

import { db } from '../../db/db';
import { Transaction, Category } from '../../db/types';
import type { AIInsight, InsightType, SpendingAnalysis } from './types';
import { aiService } from './AIService';

// ==================== Constants ====================

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;
const MS_PER_MONTH = 30 * MS_PER_DAY;

// ==================== Insight Engine ====================

/**
 * Генерирует все инсайты для пользователя
 */
export async function generateAllInsights(): Promise<AIInsight[]> {
  const [transactions, categories, budgets, goals] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
    db.budgets.toArray(),
    db.goals.toArray(),
  ]);

  const insights: AIInsight[] = [];

  // 1. Инсайты из AI-сервиса
  const aiInsights = await aiService.generateInsights();
  insights.push(...aiInsights);

  // 2. Анализ аномалий
  const anomalies = await aiService.detectAnomalies(transactions);
  insights.push(...anomalies);

  // 3. Рост расходов по категориям
  const spendingIncreases = await detectSpendingIncrease(transactions, categories);
  insights.push(...spendingIncreases);

  // 4. Обнаружение подписок
  const subscriptions = await detectSubscriptions(transactions, categories);
  insights.push(...subscriptions);

  // 5. Прогноз бюджета
  const budgetForecasts = await forecastBudgets(budgets, categories);
  insights.push(...budgetForecasts);

  // 6. Прогресс целей
  const goalInsights = await analyzeGoalProgress(goals);
  insights.push(...goalInsights);

  // 7. Возможные дубликаты
  const duplicates = await detectPossibleDuplicates(transactions);
  insights.push(...duplicates);

  // Сортировка по приоритету
  return insights.sort((a, b) => a.priority - b.priority);
}

// ==================== Spending Increase Detection ====================

/**
 * Обнаружение роста расходов по категориям
 */
async function detectSpendingIncrease(
  transactions: Transaction[],
  categories: Category[]
): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];
  const now = Date.now();
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  // Расходы за текущий и предыдущий месяц
  const currentMonth = transactions.filter(
    t => t.type === 'expense' && t.date >= now - MS_PER_MONTH
  );
  const previousMonth = transactions.filter(
    t => t.type === 'expense' && t.date >= now - 2 * MS_PER_MONTH && t.date < now - MS_PER_MONTH
  );

  // Группировка по категориям
  const currentTotals = new Map<string, number>();
  const previousTotals = new Map<string, number>();

  for (const tx of currentMonth) {
    currentTotals.set(tx.categoryId, (currentTotals.get(tx.categoryId) || 0) + tx.amount);
  }
  for (const tx of previousMonth) {
    previousTotals.set(tx.categoryId, (previousTotals.get(tx.categoryId) || 0) + tx.amount);
  }

  // Поиск значительного роста (>30%)
  for (const [catId, currentAmount] of currentTotals) {
    const previousAmount = previousTotals.get(catId) || 0;
    if (previousAmount === 0) continue;

    const growth = ((currentAmount - previousAmount) / previousAmount) * 100;
    if (growth > 30) {
      const category = categoryMap.get(catId);
      insights.push({
        id: `spending-increase-${catId}-${now}`,
        type: 'spending_increase',
        title: `Рост расходов: ${category?.name || catId}`,
        description: `Расходы в категории "${category?.name}" выросли на ${Math.round(growth)}% по сравнению с прошлым месяцем (${previousAmount.toLocaleString('ru-RU')} ₽ → ${currentAmount.toLocaleString('ru-RU')} ₽)`,
        icon: 'TrendingUp',
        color: '#EF4444',
        priority: 2,
        data: {
          categoryId: catId,
          amount: currentAmount,
          percent: growth,
          period: 'month',
        },
        createdAt: now,
      });
    }
  }

  return insights;
}

// ==================== Subscription Detection ====================

/**
 * Обнаружение регулярных платежей (подписок)
 */
async function detectSubscriptions(
  transactions: Transaction[],
  categories: Category[]
): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];
  const now = Date.now();
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  // Ищем транзакции с одинаковой суммой и интервалом
  const expenseMap = new Map<string, Transaction[]>();

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    const key = `${tx.categoryId}-${tx.amount}`;
    if (!expenseMap.has(key)) expenseMap.set(key, []);
    expenseMap.get(key)!.push(tx);
  }

  for (const [key, txs] of expenseMap.entries()) {
    if (txs.length < 3) continue; // Минимум 3 повторения

    // Проверяем регулярность
    const sorted = txs.sort((a, b) => b.date - a.date);
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      intervals.push(sorted[i - 1].date - sorted[i].date);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // Если отклонение небольшое — это подписка
    if (stdDev < avgInterval * 0.2) {
      const category = categoryMap.get(sorted[0].categoryId);
      const daysInterval = avgInterval / MS_PER_DAY;
      let frequency = 'ежемесячно';
      if (daysInterval < 10) frequency = 'еженедельно';
      else if (daysInterval > 300) frequency = 'ежегодно';

      insights.push({
        id: `subscription-${key}-${now}`,
        type: 'subscription_detected',
        title: `Обнаружена подписка: ${category?.name || 'Неизвестно'}`,
        description: `Регулярный платёж ${sorted[0].amount.toLocaleString('ru-RU')} ₽ ${frequency} в категории "${category?.name}"`,
        icon: 'Repeat',
        color: '#8B5CF6',
        priority: 3,
        data: {
          categoryId: sorted[0].categoryId,
          amount: sorted[0].amount,
        },
        createdAt: now,
      });
    }
  }

  return insights;
}

// ==================== Budget Forecast ====================

/**
 * Прогноз перерасхода бюджетов
 */
async function forecastBudgets(
  budgets: Array<{ categoryId: string; amount: number; period: string; startDate: number }>,
  categories: Category[]
): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];
  const now = Date.now();
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  for (const budget of budgets) {
    const daysInPeriod = budget.period === 'week' ? 7 : 30;
    const daysPassed = (now - budget.startDate) / MS_PER_DAY;
    const daysRemaining = daysInPeriod - daysPassed;

    if (daysRemaining <= 0) continue;

    // Получаем расходы за период
    const periodExpenses = await db.transactions
      .where('date')
      .between(budget.startDate, now)
      .and(t => t.categoryId === budget.categoryId && t.type === 'expense')
      .toArray();

    const spent = periodExpenses.reduce((sum, t) => sum + t.amount, 0);
    const remaining = budget.amount - spent;
    const dailyBudget = remaining / daysRemaining;
    const projectedOverspend = dailyBudget < 0;

    if (projectedOverspend || spent > budget.amount * 0.8) {
      const category = categoryMap.get(budget.categoryId);
      const percent = (spent / budget.amount) * 100;

      insights.push({
        id: `budget-forecast-${budget.categoryId}-${now}`,
        type: 'budget_forecast',
        title: projectedOverspend
          ? `Перерасход: ${category?.name}`
          : `Скоро перерасход: ${category?.name}`,
        description: projectedOverspend
          ? `Бюджет "${category?.name}" будет превышен. Потрачено ${spent.toLocaleString('ru-RU')} ₽ из ${budget.amount.toLocaleString('ru-RU')} ₽`
          : `Использовано ${Math.round(percent)}% бюджета "${category?.name}"`,
        icon: projectedOverspend ? 'AlertTriangle' : 'AlertCircle',
        color: projectedOverspend ? '#EF4444' : '#F59E0B',
        priority: projectedOverspend ? 1 : 2,
        data: {
          categoryId: budget.categoryId,
          amount: spent,
          percent,
        },
        createdAt: now,
      });
    }
  }

  return insights;
}

// ==================== Goal Progress Analysis ====================

/**
 * Анализ прогресса целей
 */
async function analyzeGoalProgress(
  goals: Array<{ id?: number; name: string; targetAmount: number; currentAmount: number; deadline?: number; isActive: boolean; monthlyNeeded?: number }>
): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];
  const now = Date.now();

  for (const goal of goals) {
    if (!goal.isActive) continue;

    const progress = (goal.currentAmount / goal.targetAmount) * 100;

    if (progress >= 100) {
      insights.push({
        id: `goal-done-${goal.id}-${now}`,
        type: 'goal_progress',
        title: `Цель достигнута: ${goal.name}`,
        description: `Поздравляем! Вы накопили ${goal.currentAmount.toLocaleString('ru-RU')} ₽`,
        icon: 'CheckCircle2',
        color: '#10B981',
        priority: 1,
        data: { goalId: goal.id, amount: goal.currentAmount },
        createdAt: now,
      });
    } else if (goal.deadline) {
      const daysLeft = (goal.deadline - now) / MS_PER_DAY;
      const monthlyNeeded = goal.monthlyNeeded || 0;

      if (daysLeft < 30 && progress < 80) {
        insights.push({
          id: `goal-at-risk-${goal.id}-${now}`,
          type: 'goal_progress',
          title: `Цель под угрозой: ${goal.name}`,
          description: `До цели осталось ${Math.round(daysLeft)} дней, но собрано только ${Math.round(progress)}%. Нужно откладывать ${monthlyNeeded.toLocaleString('ru-RU')} ₽/мес`,
          icon: 'Clock',
          color: '#F59E0B',
          priority: 2,
          data: { goalId: goal.id, amount: monthlyNeeded, percent: progress },
          createdAt: now,
        });
      }
    }
  }

  return insights;
}

// ==================== Duplicate Detection ====================

/**
 * Обнаружение возможных дубликатов транзакций
 */
async function detectPossibleDuplicates(transactions: Transaction[]): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];
  const now = Date.now();

  // Ищем транзакции с одинаковой суммой, категорией и близкой датой (в пределах 1 часа)
  const sorted = [...transactions].sort((a, b) => b.date - a.date);

  for (let i = 0; i < sorted.length - 1; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const tx1 = sorted[i];
      const tx2 = sorted[j];

      const timeDiff = Math.abs(tx1.date - tx2.date);
      const sameAmount = tx1.amount === tx2.amount;
      const sameCategory = tx1.categoryId === tx2.categoryId;
      const closeInTime = timeDiff < 60 * 60 * 1000; // 1 час

      if (sameAmount && sameCategory && closeInTime) {
        insights.push({
          id: `duplicate-${tx1.id}-${tx2.id}-${now}`,
          type: 'duplicate_suspicion',
          title: 'Возможен дубликат',
          description: `Транзакции на ${tx1.amount.toLocaleString('ru-RU')} ₽ с разницей в ${Math.round(timeDiff / 60000)} мин`,
          icon: 'Copy',
          color: '#F59E0B',
          priority: 3,
          createdAt: now,
        });
      }

      // Если транзакции далеко друг от друга — дальше не ищем
      if (!closeInTime) break;
    }
  }

  return insights;
}

// ==================== Weekly Summary ====================

/**
 * Еженедельная сводка
 */
export async function generateWeeklySummary(): Promise<AIInsight | null> {
  const now = Date.now();
  const weekAgo = now - MS_PER_WEEK;

  const transactions = await db.transactions
    .where('date')
    .between(weekAgo, now)
    .toArray();

  const expenses = transactions.filter(t => t.type === 'expense');
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);

  const categories = await db.categories.toArray();
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  const topCategory = expenses.reduce<Map<string, number>>((map, tx) => {
    map.set(tx.categoryId, (map.get(tx.categoryId) || 0) + tx.amount);
    return map;
  }, new Map());

  const topCatId = Array.from(topCategory.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topCat = topCatId ? categoryMap.get(topCatId) : null;

  return {
    id: `weekly-summary-${now}`,
    type: 'weekly_summary',
    title: 'Еженедельная сводка',
    description: topCat
      ? `За неделю потрачено ${totalExpenses.toLocaleString('ru-RU')} ₽. Больше всего расходов в "${topCat.name}"`
      : `За неделю потрачено ${totalExpenses.toLocaleString('ru-RU')} ₽`,
    icon: 'BarChart3',
    color: '#3B82F6',
    priority: 4,
    data: { amount: totalExpenses, period: 'week' },
    createdAt: now,
  };
}
