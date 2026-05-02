// Conversational AI query router and chat context

import {
  getBalanceByPeriod,
  getExpensesByCategory,
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
import { fmt, extractPeriod, shiftPeriodBack, HELP_TEXT, Period } from './nlpParser';

export interface ChatCtx {
  lastTopic?: string;
  lastPeriod?: Period;
  lastCategoryId?: string;
  lastCategoryName?: string;
}

export async function answerQuery(
  text: string,
  ctx: ChatCtx,
): Promise<{ answer: string; newCtx: ChatCtx }> {
  const q = text.toLowerCase();
  const period = extractPeriod(q);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

  function reply(answer: string, topic: string, extra?: Partial<ChatCtx>) {
    return { answer, newCtx: { lastTopic: topic, lastPeriod: period, ...extra } };
  }

  // "А в прошлом?" — переключение периода в контексте предыдущего вопроса
  const isShift = /^(а|и)?\s*(в|за)?\s*прошл|а раньше|а как насчёт|а до этого/.test(q);
  if (isShift && ctx.lastTopic && ctx.lastPeriod) {
    const shifted = shiftPeriodBack(ctx.lastPeriod);
    const shiftedCtx = { ...ctx, lastPeriod: shifted };
    const synth = ctx.lastCategoryName
      ? `расходы на ${ctx.lastCategoryName} ${shifted.label}`
      : `${ctx.lastTopic} ${shifted.label}`;
    return answerQuery(synth, shiftedCtx);
  }

  if (/помощ|что.*умеешь|что.*спросить|help|справк|команд|возможност/.test(q))
    return { answer: HELP_TEXT, newCtx: ctx };

  if (/ближайш.*платеж|регулярн|подписк|платеж/.test(q)) {
    const upcoming = await getRecurringUpcoming(30);
    if (upcoming.length === 0) return reply('Ближайших регулярных платежей нет.', 'recurring');
    const list = upcoming.slice(0, 5).map(r => {
      const when = r.daysUntil <= 0 ? 'сегодня' : r.daysUntil === 1 ? 'завтра' : `через ${r.daysUntil} дн.`;
      return `• ${r.label} — ${fmt(r.amount)} ₽ (${when})`;
    }).join('\n');
    return reply(`Ближайшие платежи:\n${list}`, 'recurring');
  }

  if (/когда.*зарплат|когда.*доход.*приход|зарплат.*приход|доход.*когда/.test(q)) {
    const pat = await getIncomePattern();
    if (!pat.typicalDay) return reply('Пока недостаточно данных о доходах.', 'income-pattern');
    return reply(
      `Обычно доход приходит ~${pat.typicalDay}-го числа. Средняя сумма: ${fmt(pat.avgAmount)} ₽ (по ${pat.occurrences} поступлениям за 6 мес.).`,
      'income-pattern',
    );
  }

  if (/необычн.*трат|аномал|подозр|странн.*трат|крупн.*покупк/.test(q)) {
    const anomalies = await getAnomalousTransactions(period.start, period.end);
    if (anomalies.length === 0) return reply(`${period.label} аномально крупных трат не найдено.`, 'anomalies');
    const list = anomalies.map(a => {
      const label = a.comment ? `${a.categoryName} (${a.comment})` : a.categoryName;
      return `• ${label} — ${fmt(a.amount)} ₽ (в ${a.ratio}× больше обычного ~${fmt(a.avgForCategory)} ₽)`;
    }).join('\n');
    return reply(`Аномальные траты ${period.label.toLowerCase()}:\n${list}`, 'anomalies');
  }

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

  if (/как.*сэконом|совет.*экономи|экономи.*совет|сократить.*расход|уменьшить.*трат/.test(q)) {
    const byCat = await getExpensesByCategory(monthStart, now.getTime());
    if (byCat.length === 0) return reply('Пока нет данных о расходах этого месяца.', 'advice');
    const top = byCat[0];
    const sr = await getSavingsRate(monthStart, now.getTime());
    const adviceLines = [
      `Ваша главная статья расходов — «${top.categoryName}»: ${fmt(top.amount)} ₽ (${Math.round(top.percent)}% всех трат).`,
      `• Сократив её на 10% → сэкономите ~${fmt(top.amount * 0.1)} ₽/мес`,
      `• На 20% → ~${fmt(top.amount * 0.2)} ₽/мес`,
    ];
    if (sr.income > 0)
      adviceLines.push(`\nСейчас норма сбережений: ${Math.round(sr.savingsRate)}%. Рекомендуемый минимум — 20%.`);
    if (byCat.length > 1)
      adviceLines.push(`\nДругие крупные категории: ${byCat.slice(1, 3).map(c => `${c.categoryName} (${fmt(c.amount)} ₽)`).join(', ')}.`);
    return reply(adviceLines.join('\n'), 'advice');
  }

  if (/самы.*крупн|больш.*трат|крупн.*трат|крупные/.test(q)) {
    const top = await getLargestTransactions(5, period.start, period.end);
    if (top.length === 0) return reply(`${period.label} крупных расходов нет.`, 'largest');
    const list = top.map(t => {
      const label = t.comment ? `${t.categoryName} (${t.comment})` : t.categoryName;
      return `• ${label} — ${fmt(t.amount)} ₽`;
    }).join('\n');
    return reply(`Крупнейшие расходы ${period.label.toLowerCase()}:\n${list}`, 'largest');
  }

  if (/средн.*день|в среднем|дневн.*расход|средний.*расход|средн.*трат/.test(q)) {
    const avg = await getAverageDailySpend(period.start, period.end);
    return reply(`Средние расходы в день ${period.label.toLowerCase()}: ${fmt(avg)} ₽/день.`, 'daily-avg');
  }

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

  if (/цел|накопл|откладыва/.test(q)) {
    const goals = await getGoalsProgress();
    const active = goals.filter(g => g.isActive);
    if (active.length === 0) return reply('Активных целей нет.', 'goals');
    const lines = active.map(g =>
      `• «${g.name}»: ${fmt(g.currentAmount)} / ${fmt(g.targetAmount)} ₽ (${Math.round(g.percent)}%)`
    );
    return reply(`Ваши цели:\n${lines.join('\n')}`, 'goals');
  }

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

  if (/прогноз|конец месяц|сколько потрачу/.test(q)) {
    const f = await getMonthForecast();
    return reply(
      `Прогноз до конца месяца: ~${fmt(f.forecastTotal)} ₽\nУже потрачено: ${fmt(f.spent)} ₽\nОсталось дней: ${f.daysLeft}\nТемп: ${fmt(f.dailyRate)} ₽/день`,
      'forecast',
    );
  }

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

  if (/экономи|норм.*сбережен|сбережен|сберег/.test(q)) {
    const sr = await getSavingsRate(period.start, period.end);
    if (sr.income === 0) return reply('Нет данных по доходам за этот период.', 'savings');
    return reply(
      `Норма сбережений ${period.label.toLowerCase()}: ${Math.round(sr.savingsRate)}%\nДоходы: ${fmt(sr.income)} ₽\nРасходы: ${fmt(sr.expenses)} ₽\nСохранено: ${fmt(sr.saved)} ₽`,
      'savings',
    );
  }

  if (/баланс|остат/.test(q)) {
    const { balance, income, expenses } = await getBalanceByPeriod(period.start, period.end);
    return reply(
      `Баланс ${period.label.toLowerCase()}: ${fmt(balance)} ₽\nДоходы: ${fmt(income)} ₽\nРасходы: ${fmt(expenses)} ₽`,
      'balance',
    );
  }

  if (/доход|зарплат|получил/.test(q)) {
    const { income } = await getBalanceByPeriod(period.start, period.end);
    return reply(`Доходы ${period.label.toLowerCase()}: ${fmt(income)} ₽`, 'income');
  }

  const catMatch = await findCategoryByName(q);
  if (catMatch) {
    const expenses = await getExpensesByCategory(period.start, period.end);
    const cat = expenses.find(e => e.categoryId === catMatch.id);
    if (!cat)
      return reply(`${period.label} расходов на «${catMatch.name}» нет.`, 'category', { lastCategoryId: catMatch.id, lastCategoryName: catMatch.name });
    return reply(
      `${period.label} «${catMatch.name}»: ${fmt(cat.amount)} ₽`,
      'category',
      { lastCategoryId: catMatch.id, lastCategoryName: catMatch.name },
    );
  }

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
