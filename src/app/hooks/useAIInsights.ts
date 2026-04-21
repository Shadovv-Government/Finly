import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getBalanceByPeriod,
  getExpensesByCategory,
  getCategoryMoMDelta,
  getMonthForecast,
  getSavingsRate,
  getAllBudgetsProgress,
  getGoalsProgress,
  getLargestTransactions,
  getAverageDailySpend,
  getRecurringUpcoming,
  findCategoryByName,
  getSpendByDayOfWeek,
  getAnomalousTransactions,
  getIncomePattern,
} from '../../db/analytics';

export interface Insight {
  id: string;
  type: 'warning' | 'alert' | 'tip' | 'positive';
  title: string;
  description: string;
}

export interface OverviewData {
  weekExpenses: number;
  weekIncome: number;
  weekBalance: number;
  savingsRate: number;
  topCategories: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  message: string;
}

export interface AIInsightsData {
  loading: boolean;
  isTyping: boolean;
  overview: OverviewData | null;
  insights: Insight[];
  chatHistory: ChatMessage[];
  sendMessage: (text: string) => Promise<void>;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function fmt(n: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);
}

// ── Period ────────────────────────────────────────────────────────────────────

interface Period {
  start: number;
  end: number;
  label: string;
  key: string; // for context shifts
}

function extractPeriod(q: string): Period {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  if (/сегодня|сегодняшн/.test(q))
    return { start: todayStart, end: now.getTime(), label: 'Сегодня', key: 'today' };
  if (/вчера/.test(q))
    return { start: todayStart - MS_PER_DAY, end: todayStart - 1, label: 'Вчера', key: 'yesterday' };
  if (/прошл.*недел/.test(q))
    return { start: now.getTime() - 14 * MS_PER_DAY, end: now.getTime() - 7 * MS_PER_DAY, label: 'На прошлой неделе', key: 'last-week' };
  if (/эта недел|за недел|последн.*недел|за 7/.test(q))
    return { start: now.getTime() - 7 * MS_PER_DAY, end: now.getTime(), label: 'За неделю', key: 'week' };
  if (/3 месяц|три месяц|квартал/.test(q))
    return { start: new Date(now.getFullYear(), now.getMonth() - 3, 1).getTime(), end: now.getTime(), label: 'За 3 месяца', key: '3m' };
  if (/6 месяц|шесть месяц|полгод/.test(q))
    return { start: new Date(now.getFullYear(), now.getMonth() - 6, 1).getTime(), end: now.getTime(), label: 'За 6 месяцев', key: '6m' };
  if (/прошл.*месяц|в прошлом/.test(q))
    return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(), end: monthStart - 1, label: 'В прошлом месяце', key: 'last-month' };
  return { start: monthStart, end: now.getTime(), label: 'В этом месяце', key: 'month' };
}

function shiftPeriodBack(p: Period): Period {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  switch (p.key) {
    case 'today':
    case 'yesterday': {
      const s = p.start - MS_PER_DAY;
      return { start: s, end: s + MS_PER_DAY - 1, label: 'Позавчера', key: 'day-before' };
    }
    case 'week':
      return { start: now.getTime() - 14 * MS_PER_DAY, end: now.getTime() - 7 * MS_PER_DAY, label: 'На прошлой неделе', key: 'last-week' };
    case 'month':
      return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(), end: monthStart - 1, label: 'В прошлом месяце', key: 'last-month' };
    case 'last-month':
      return { start: new Date(now.getFullYear(), now.getMonth() - 2, 1).getTime(), end: new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime() - 1, label: 'Два месяца назад', key: '2m-ago' };
    default:
      return p;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface ChatCtx {
  lastTopic?: string;
  lastPeriod?: Period;
  lastCategoryId?: string;
  lastCategoryName?: string;
}

// ── Help text ─────────────────────────────────────────────────────────────────

const HELP_TEXT = `Я могу ответить на вопросы о ваших финансах:

📊 Расходы
• «сколько потратил» / «сегодня» / «за неделю» / «в прошлом месяце»
• «расходы на [категорию]» — например «расходы на еду»
• «самые крупные траты»
• «средние расходы в день»
• «необычные траты» — аномально высокие покупки
• «в какой день трачу больше»

💰 Доходы и баланс
• «мои доходы» / «какой баланс»
• «норма сбережений»
• «когда приходит зарплата»

📈 Сравнения и советы
• «сравни с прошлым месяцем»
• «как сэкономить»
• «прогноз до конца месяца»

🎯 Цели и бюджеты
• «мои цели» / «когда накоплю»
• «статус бюджетов»
• «ближайшие платежи»

💡 После любого ответа можно спросить «а в прошлом?» чтобы сравнить с предыдущим периодом.`;

// ── Query router ──────────────────────────────────────────────────────────────

async function answerQuery(text: string, ctx: ChatCtx): Promise<{ answer: string; newCtx: ChatCtx }> {
  const q = text.toLowerCase();
  const period = extractPeriod(q);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

  function reply(answer: string, topic: string, extra?: Partial<ChatCtx>) {
    return { answer, newCtx: { lastTopic: topic, lastPeriod: period, ...extra } };
  }

  // ── "А в прошлом?" context shift ──────────────────────────────────────────
  const isShift = /^(а|и)?\s*(в|за)?\s*прошл|а раньше|а как насчёт|а до этого/.test(q);
  if (isShift && ctx.lastTopic && ctx.lastPeriod) {
    const shifted = shiftPeriodBack(ctx.lastPeriod);
    const shiftedCtx = { ...ctx, lastPeriod: shifted };
    // Re-run same topic with shifted period
    const synth = ctx.lastCategoryName
      ? `расходы на ${ctx.lastCategoryName} ${shifted.label}`
      : `${ctx.lastTopic} ${shifted.label}`;
    return answerQuery(synth, shiftedCtx);
  }

  // ── Help ───────────────────────────────────────────────────────────────────
  if (/помощ|что.*умеешь|что.*спросить|help|справк|команд|возможност/.test(q))
    return { answer: HELP_TEXT, newCtx: ctx };

  // ── Recurring payments ────────────────────────────────────────────────────
  if (/ближайш.*платеж|регулярн|подписк|платеж/.test(q)) {
    const upcoming = await getRecurringUpcoming(30);
    if (upcoming.length === 0) return reply('Ближайших регулярных платежей нет.', 'recurring');
    const list = upcoming.slice(0, 5).map(r => {
      const when = r.daysUntil <= 0 ? 'сегодня' : r.daysUntil === 1 ? 'завтра' : `через ${r.daysUntil} дн.`;
      return `• ${r.label} — ${fmt(r.amount)} ₽ (${when})`;
    }).join('\n');
    return reply(`Ближайшие платежи:\n${list}`, 'recurring');
  }

  // ── Income pattern ────────────────────────────────────────────────────────
  if (/когда.*зарплат|когда.*доход.*приход|зарплат.*приход|доход.*когда/.test(q)) {
    const pat = await getIncomePattern();
    if (!pat.typicalDay) return reply('Пока недостаточно данных о доходах.', 'income-pattern');
    return reply(
      `Обычно доход приходит ~${pat.typicalDay}-го числа. Средняя сумма: ${fmt(pat.avgAmount)} ₽ (по ${pat.occurrences} поступлениям за 6 мес.).`,
      'income-pattern',
    );
  }

  // ── Anomalous transactions ────────────────────────────────────────────────
  if (/необычн.*трат|аномал|подозр|странн.*трат|крупн.*покупк/.test(q)) {
    const anomalies = await getAnomalousTransactions(period.start, period.end);
    if (anomalies.length === 0) return reply(`${period.label} аномально крупных трат не найдено.`, 'anomalies');
    const list = anomalies.map(a => {
      const label = a.comment ? `${a.categoryName} (${a.comment})` : a.categoryName;
      return `• ${label} — ${fmt(a.amount)} ₽ (в ${a.ratio}× больше обычного ~${fmt(a.avgForCategory)} ₽)`;
    }).join('\n');
    return reply(`Аномальные траты ${period.label.toLowerCase()}:\n${list}`, 'anomalies');
  }

  // ── Day of week ───────────────────────────────────────────────────────────
  if (/в какой.*день|по дням|день.*недели|когда.*трач/.test(q)) {
    const days = await getSpendByDayOfWeek(
      new Date(now.getFullYear(), now.getMonth() - 3, 1).getTime(),
      now.getTime(),
    );
    const max = days.reduce((a, b) => b.amount > a.amount ? b : a);
    const min = days.filter(d => d.amount > 0).reduce((a, b) => b.amount < a.amount ? b : a, max);
    const sorted = [...days].sort((a, b) => b.amount - a.amount).slice(0, 3);
    const list = sorted.map(d => `• ${d.dayLabel}: ${fmt(d.amount)} ₽`).join('\n');
    return reply(
      `Больше всего тратите в ${max.dayLabel} (${fmt(max.amount)} ₽), меньше всего в ${min.dayLabel} (${fmt(min.amount)} ₽).\n\nТоп-3 дня:\n${list}`,
      'day-of-week',
    );
  }

  // ── Savings advice ────────────────────────────────────────────────────────
  if (/как.*сэконом|совет.*экономи|экономи.*совет|сократить.*расход|уменьшить.*трат/.test(q)) {
    const byCat = await getExpensesByCategory(monthStart, now.getTime());
    if (byCat.length === 0) return reply('Пока нет данных о расходах этого месяца.', 'advice');
    const top = byCat[0];
    const saving10 = top.amount * 0.1;
    const saving20 = top.amount * 0.2;
    const sr = await getSavingsRate(monthStart, now.getTime());
    const adviceLines = [
      `Ваша главная статья расходов — «${top.categoryName}»: ${fmt(top.amount)} ₽ (${Math.round(top.percent)}% всех трат).`,
      `• Сократив её на 10% → сэкономите ~${fmt(saving10)} ₽/мес`,
      `• На 20% → ~${fmt(saving20)} ₽/мес`,
    ];
    if (sr.income > 0) {
      adviceLines.push(`\nСейчас норма сбережений: ${Math.round(sr.savingsRate)}%. Рекомендуемый минимум — 20%.`);
    }
    if (byCat.length > 1) {
      adviceLines.push(`\nДругие крупные категории: ${byCat.slice(1, 3).map(c => `${c.categoryName} (${fmt(c.amount)} ₽)`).join(', ')}.`);
    }
    return reply(adviceLines.join('\n'), 'advice');
  }

  // ── Largest transactions ──────────────────────────────────────────────────
  if (/самы.*крупн|больш.*трат|крупн.*трат|крупные/.test(q)) {
    const top = await getLargestTransactions(5, period.start, period.end);
    if (top.length === 0) return reply(`${period.label} крупных расходов нет.`, 'largest');
    const list = top.map(t => {
      const label = t.comment ? `${t.categoryName} (${t.comment})` : t.categoryName;
      return `• ${label} — ${fmt(t.amount)} ₽`;
    }).join('\n');
    return reply(`Крупнейшие расходы ${period.label.toLowerCase()}:\n${list}`, 'largest');
  }

  // ── Average daily ─────────────────────────────────────────────────────────
  if (/средн.*день|в среднем|дневн.*расход|средний.*расход|средн.*трат/.test(q)) {
    const avg = await getAverageDailySpend(period.start, period.end);
    return reply(`Средние расходы в день ${period.label.toLowerCase()}: ${fmt(avg)} ₽/день.`, 'daily-avg');
  }

  // ── Goal ETA ──────────────────────────────────────────────────────────────
  if (/когда.*накопл|когда.*достигн|сколько.*времени.*цел/.test(q)) {
    const goals = await getGoalsProgress();
    const active = goals.filter(g => g.isActive && g.percent < 100);
    if (active.length === 0) return reply('Активных незавершённых целей нет.', 'goals');
    const sr = await getSavingsRate(monthStart, now.getTime());
    if (sr.saved <= 0) return reply('Не могу рассчитать — в этом месяце пока нет положительных накоплений.', 'goals');
    const lines = active.slice(0, 3).map(g => {
      const months = Math.ceil(g.remaining / sr.saved);
      return `• «${g.name}»: ${fmt(g.remaining)} ₽ → ~${months} мес.`;
    });
    return reply(`При темпе ${fmt(sr.saved)} ₽/мес:\n${lines.join('\n')}`, 'goals');
  }

  // ── Goals list ────────────────────────────────────────────────────────────
  if (/цел|накопл|откладыва/.test(q)) {
    const goals = await getGoalsProgress();
    const active = goals.filter(g => g.isActive);
    if (active.length === 0) return reply('Активных целей нет.', 'goals');
    const lines = active.map(g =>
      `• «${g.name}»: ${fmt(g.currentAmount)} / ${fmt(g.targetAmount)} ₽ (${Math.round(g.percent)}%)`
    );
    return reply(`Ваши цели:\n${lines.join('\n')}`, 'goals');
  }

  // ── Budgets ───────────────────────────────────────────────────────────────
  if (/бюджет/.test(q)) {
    const budgets = await getAllBudgetsProgress(monthStart, now.getTime());
    if (budgets.length === 0) return reply('Бюджеты не настроены.', 'budget');
    const lines: string[] = [];
    budgets.filter(b => b.isOverBudget).forEach(b =>
      lines.push(`• ❌ ${b.categoryName}: ${fmt(b.spent)} / ${fmt(b.limit)} ₽`)
    );
    budgets.filter(b => !b.isOverBudget && b.percent >= 80).forEach(b =>
      lines.push(`• ⚠️ ${b.categoryName}: ${fmt(b.spent)} / ${fmt(b.limit)} ₽ (${Math.round(b.percent)}%)`)
    );
    budgets.filter(b => !b.isOverBudget && b.percent < 80).forEach(b =>
      lines.push(`• ✅ ${b.categoryName}: ${fmt(b.spent)} / ${fmt(b.limit)} ₽ (${Math.round(b.percent)}%)`)
    );
    return reply(`Бюджеты этого месяца:\n${lines.join('\n')}`, 'budget');
  }

  // ── Forecast ──────────────────────────────────────────────────────────────
  if (/прогноз|конец месяц|сколько потрачу/.test(q)) {
    const f = await getMonthForecast();
    return reply(
      `Прогноз до конца месяца: ~${fmt(f.forecastTotal)} ₽\nУже потрачено: ${fmt(f.spent)} ₽\nОсталось дней: ${f.daysLeft}\nТемп: ${fmt(f.dailyRate)} ₽/день`,
      'forecast',
    );
  }

  // ── MoM comparison ────────────────────────────────────────────────────────
  if (/сравн|расход.*прошл|прошл.*расход/.test(q)) {
    const [thisM, lastM] = await Promise.all([
      getBalanceByPeriod(monthStart, now.getTime()),
      getBalanceByPeriod(lastMonthStart, monthStart - 1),
    ]);
    const diff = thisM.expenses - lastM.expenses;
    const pct = lastM.expenses > 0 ? Math.round(diff / lastM.expenses * 100) : 0;
    const sign = diff >= 0 ? '+' : '';
    return reply(
      `Расходы: ${fmt(lastM.expenses)} ₽ → ${fmt(thisM.expenses)} ₽\nИзменение: ${sign}${fmt(diff)} ₽ (${sign}${pct}%)`,
      'compare',
    );
  }

  // ── Savings rate ──────────────────────────────────────────────────────────
  if (/экономи|норм.*сбережен|сбережен|сберег/.test(q)) {
    const sr = await getSavingsRate(period.start, period.end);
    if (sr.income === 0) return reply('Нет данных по доходам за этот период.', 'savings');
    return reply(
      `Норма сбережений ${period.label.toLowerCase()}: ${Math.round(sr.savingsRate)}%\nДоходы: ${fmt(sr.income)} ₽\nРасходы: ${fmt(sr.expenses)} ₽\nСохранено: ${fmt(sr.saved)} ₽`,
      'savings',
    );
  }

  // ── Balance ───────────────────────────────────────────────────────────────
  if (/баланс|остат/.test(q)) {
    const { balance, income, expenses } = await getBalanceByPeriod(period.start, period.end);
    return reply(
      `Баланс ${period.label.toLowerCase()}: ${fmt(balance)} ₽\nДоходы: ${fmt(income)} ₽\nРасходы: ${fmt(expenses)} ₽`,
      'balance',
    );
  }

  // ── Income ────────────────────────────────────────────────────────────────
  if (/доход|зарплат|получил/.test(q)) {
    const { income } = await getBalanceByPeriod(period.start, period.end);
    return reply(`Доходы ${period.label.toLowerCase()}: ${fmt(income)} ₽`, 'income');
  }

  // ── Category-specific ────────────────────────────────────────────────────
  const catMatch = await findCategoryByName(q);
  if (catMatch) {
    const expenses = await getExpensesByCategory(period.start, period.end);
    const cat = expenses.find(e => e.categoryId === catMatch.id);
    if (!cat) return reply(`${period.label} расходов на «${catMatch.name}» нет.`, 'category', { lastCategoryId: catMatch.id, lastCategoryName: catMatch.name });
    return reply(
      `${period.label} «${catMatch.name}»: ${fmt(cat.amount)} ₽`,
      'category',
      { lastCategoryId: catMatch.id, lastCategoryName: catMatch.name },
    );
  }

  // ── General expenses ─────────────────────────────────────────────────────
  if (/расход|потрат|трат/.test(q)) {
    const byCat = await getExpensesByCategory(period.start, period.end);
    if (byCat.length === 0) return reply(`${period.label} расходов нет.`, 'expenses');
    const total = byCat.reduce((s, c) => s + c.amount, 0);
    const top = byCat.slice(0, 3).map(c => `${c.categoryName}: ${fmt(c.amount)} ₽`).join(', ');
    return reply(
      `Расходы ${period.label.toLowerCase()}: ${fmt(total)} ₽\nТоп: ${top}`,
      'expenses',
    );
  }

  return { answer: 'Не понял вопрос. Напишите «помощь» чтобы увидеть всё, что я умею.', newCtx: ctx };
}

// ── Insights ──────────────────────────────────────────────────────────────────

async function buildInsights(): Promise<Insight[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const [deltas, forecast, budgets, sr, lastSr, upcoming, goals] = await Promise.all([
    getCategoryMoMDelta(),
    getMonthForecast(),
    getAllBudgetsProgress(monthStart, now.getTime()),
    getSavingsRate(monthStart, now.getTime()),
    getSavingsRate(lastMonthStart, monthStart - 1),
    getRecurringUpcoming(3),
    getGoalsProgress(),
  ]);

  const result: Insight[] = [];

  // Budget over/near
  budgets.filter(b => b.isOverBudget).forEach(b => {
    result.push({ id: `budget-over-${b.categoryId}`, type: 'alert', title: `Бюджет «${b.categoryName}» превышен`, description: `Потрачено ${fmt(b.spent)} ₽ при лимите ${fmt(b.limit)} ₽ (${Math.round(b.percent)}%).` });
  });
  budgets.filter(b => !b.isOverBudget && b.percent >= 80).forEach(b => {
    result.push({ id: `budget-near-${b.categoryId}`, type: 'warning', title: `Бюджет «${b.categoryName}» почти исчерпан`, description: `Использовано ${Math.round(b.percent)}% — осталось ${fmt(b.limit - b.spent)} ₽.` });
  });

  // Recurring today/tomorrow
  upcoming.filter(r => r.daysUntil <= 1).forEach(r => {
    result.push({ id: `recurring-${r.nextDate}`, type: 'alert', title: `Платёж ${r.daysUntil <= 0 ? 'сегодня' : 'завтра'}`, description: `${r.label} — ${fmt(r.amount)} ₽` });
  });

  // Goal completed
  goals.filter(g => g.isActive && g.percent >= 100).forEach(g => {
    result.push({ id: `goal-done-${g.id}`, type: 'positive', title: `Цель «${g.name}» достигнута!`, description: `Накоплено ${fmt(g.currentAmount)} ₽ — поздравляем!` });
  });

  // Goal near deadline
  goals.filter(g => g.isActive && g.deadline && g.percent < 100).forEach(g => {
    const daysLeft = Math.ceil((g.deadline! - now.getTime()) / MS_PER_DAY);
    if (daysLeft > 0 && daysLeft <= 30) {
      result.push({ id: `goal-deadline-${g.id}`, type: 'warning', title: `Цель «${g.name}» — осталось ${daysLeft} дн.`, description: `Накоплено ${Math.round(g.percent)}% (${fmt(g.currentAmount)} / ${fmt(g.targetAmount)} ₽).` });
    }
  });

  // Category > 50% of total
  const totalExpenses = deltas.reduce((s, d) => s + d.thisMonth, 0);
  const bigCat = deltas.find(d => totalExpenses > 0 && d.thisMonth / totalExpenses > 0.5);
  if (bigCat) {
    result.push({ id: 'big-cat', type: 'warning', title: `«${bigCat.categoryName}» — ${Math.round(bigCat.thisMonth / totalExpenses * 100)}% расходов`, description: 'Одна категория занимает больше половины всех трат этого месяца.' });
  }

  // Top growing category
  const growing = deltas.find(d => d.deltaPercent > 20 && d.thisMonth > 500);
  if (growing) {
    result.push({ id: 'cat-growth', type: 'warning', title: `Рост расходов: ${growing.categoryName}`, description: `+${Math.round(growing.deltaPercent)}% к прошлому месяцу (+${fmt(growing.delta)} ₽).` });
  }

  // Month forecast
  if (forecast.daysPassed >= 5 && forecast.forecastTotal > forecast.spent * 1.3) {
    result.push({ id: 'forecast', type: 'tip', title: 'Прогноз расходов на месяц', description: `При текущем темпе вы потратите ~${fmt(forecast.forecastTotal)} ₽ до конца месяца (сейчас ${fmt(forecast.spent)} ₽).` });
  }

  // This month better than last (expenses ≥10% lower)
  if (lastSr.expenses > 0 && sr.expenses < lastSr.expenses * 0.9) {
    const saved = lastSr.expenses - sr.expenses;
    result.push({ id: 'less-spending', type: 'positive', title: 'Тратите меньше, чем в прошлом месяце', description: `Расходы снизились на ${fmt(saved)} ₽ (${Math.round((1 - sr.expenses / lastSr.expenses) * 100)}%).` });
  }

  // Savings rate change
  if (sr.income > 0 && lastSr.income > 0) {
    const diff = sr.savingsRate - lastSr.savingsRate;
    if (diff > 5) {
      result.push({ id: 'savings-up', type: 'positive', title: 'Норма сбережений выросла', description: `Сохраняете ${Math.round(sr.savingsRate)}% дохода — на ${Math.round(diff)} п.п. больше, чем в прошлом месяце.` });
    } else if (diff < -5) {
      result.push({ id: 'savings-down', type: 'warning', title: 'Норма сбережений снизилась', description: `Сохраняете ${Math.round(sr.savingsRate)}% — на ${Math.round(Math.abs(diff))} п.п. меньше, чем в прошлом месяце.` });
    }
  }

  // No spending today (day ≥ 3)
  if (now.getDate() >= 3) {
    const todayCount = await import('../../db/db').then(({ db }) =>
      db.transactions.where('date').between(todayStart, now.getTime()).count()
    );
    if (todayCount === 0) {
      result.push({ id: 'no-spend-today', type: 'positive', title: 'Без трат сегодня', description: 'Вы ещё ничего не потратили сегодня — отличный результат!' });
    }
  }

  // Top spending category tip
  const topCat = [...deltas].sort((a, b) => b.thisMonth - a.thisMonth)[0];
  if (topCat && topCat.thisMonth > 1000) {
    result.push({ id: 'top-cat', type: 'tip', title: `Главная статья: ${topCat.categoryName}`, description: `${fmt(topCat.thisMonth)} ₽ в этом месяце${topCat.lastMonth > 0 ? ` (было ${fmt(topCat.lastMonth)} ₽)` : ''}.` });
  }

  return result.slice(0, 8);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAIInsights(): AIInsightsData {
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const ctxRef = useRef<ChatCtx>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const now = new Date();
        const weekAgo = now.getTime() - 7 * MS_PER_DAY;
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        const [weekBalance, byCat, sr, insightList] = await Promise.all([
          getBalanceByPeriod(weekAgo, now.getTime()),
          getExpensesByCategory(monthStart, now.getTime()),
          getSavingsRate(monthStart, now.getTime()),
          buildInsights(),
        ]);

        if (cancelled) return;
        setOverview({
          weekExpenses: weekBalance.expenses,
          weekIncome: weekBalance.income,
          weekBalance: weekBalance.balance,
          savingsRate: Math.round(sr.savingsRate),
          topCategories: byCat.length,
        });
        setInsights(insightList);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    setChatHistory(prev => [...prev, { role: 'user', message: text }]);
    setIsTyping(true);
    try {
      const { answer, newCtx } = await answerQuery(text, ctxRef.current);
      ctxRef.current = newCtx;
      setChatHistory(prev => [...prev, { role: 'assistant', message: answer }]);
    } finally {
      setIsTyping(false);
    }
  }, []);

  return { loading, isTyping, overview, insights, chatHistory, sendMessage };
}
