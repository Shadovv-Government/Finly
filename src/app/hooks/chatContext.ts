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

export interface ChatAnswer {
  answer: string;
  newCtx: ChatCtx;
  suggestions: string[];
}

interface IntentResult {
  answer: string;
  extra?: Partial<ChatCtx>;
}

interface Intent {
  id: string;
  patterns: RegExp[];
  handle: (q: string, ctx: ChatCtx, period: Period, now: Date) => Promise<IntentResult | null>;
  suggestions: string[];
}

const INTENTS: Intent[] = [
  {
    id: 'help',
    patterns: [/помощ|что.*умеешь|что.*спросить|help|справк|команд|возможност/],
    handle: async () => ({ answer: HELP_TEXT }),
    suggestions: ['Расходы за месяц', 'Баланс', 'Мои цели'],
  },
  {
    id: 'recurring',
    patterns: [/ближайш.*платеж|регулярн|подписк|платеж/],
    handle: async () => {
      const upcoming = await getRecurringUpcoming(30);
      if (upcoming.length === 0) return { answer: 'Ближайших регулярных платежей нет.' };
      const list = upcoming.slice(0, 5).map(r => {
        const when = r.daysUntil <= 0 ? 'сегодня' : r.daysUntil === 1 ? 'завтра' : `через ${r.daysUntil} дн.`;
        return `• ${r.label} — ${fmt(r.amount)} ₽ (${when})`;
      }).join('\n');
      return { answer: `Ближайшие платежи:\n${list}` };
    },
    suggestions: ['Бюджеты', 'Прогноз до конца месяца', 'Аномальные траты'],
  },
  {
    id: 'income-pattern',
    patterns: [/когда.*зарплат|когда.*доход.*приход|зарплат.*приход|доход.*когда/],
    handle: async () => {
      const pat = await getIncomePattern();
      if (!pat.typicalDay) return { answer: 'Пока недостаточно данных о доходах.' };
      return {
        answer: `Обычно доход приходит ~${pat.typicalDay}-го числа. Средняя сумма: ${fmt(pat.avgAmount)} ₽ (по ${pat.occurrences} поступлениям за 6 мес.).`,
      };
    },
    suggestions: ['Доходы за месяц', 'Норма сбережений', 'Баланс'],
  },
  {
    id: 'anomalies',
    patterns: [/необычн.*трат|аномал|подозр|странн.*трат|крупн.*покупк/],
    handle: async (_q, _ctx, period) => {
      const anomalies = await getAnomalousTransactions(period.start, period.end);
      if (anomalies.length === 0) return { answer: `${period.label} аномально крупных трат не найдено.` };
      const list = anomalies.map(a => {
        const label = a.comment ? `${a.categoryName} (${a.comment})` : a.categoryName;
        return `• ${label} — ${fmt(a.amount)} ₽ (в ${a.ratio}× больше обычного ~${fmt(a.avgForCategory)} ₽)`;
      }).join('\n');
      return { answer: `Аномальные траты ${period.label.toLowerCase()}:\n${list}` };
    },
    suggestions: ['Самые крупные траты', 'Расходы по категориям', 'Как сэкономить?'],
  },
  {
    id: 'day-of-week',
    patterns: [/в какой.*день|по дням|день.*недели|когда.*трач/],
    handle: async (_q, _ctx, _period, now) => {
      const days = await getSpendByDayOfWeek(
        new Date(now.getFullYear(), now.getMonth() - 3, 1).getTime(),
        now.getTime(),
      );
      const max = days.reduce((a, b) => b.amount > a.amount ? b : a);
      const min = days.filter(d => d.amount > 0).reduce((a, b) => b.amount < a.amount ? b : a, max);
      const sorted = [...days].sort((a, b) => b.amount - a.amount).slice(0, 3);
      const list = sorted.map(d => `• ${d.dayLabel}: ${fmt(d.amount)} ₽`).join('\n');
      return {
        answer: `Больше всего тратите в ${max.dayLabel} (${fmt(max.amount)} ₽), меньше всего в ${min.dayLabel} (${fmt(min.amount)} ₽).\n\nТоп-3 дня:\n${list}`,
      };
    },
    suggestions: ['Средний расход в день', 'Расходы за неделю', 'Аномальные траты'],
  },
  {
    id: 'advice',
    patterns: [/как.*сэконом|совет.*экономи|экономи.*совет|сократить.*расход|уменьшить.*трат/],
    handle: async (_q, _ctx, _period, now) => {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const byCat = await getExpensesByCategory(monthStart, now.getTime());
      if (byCat.length === 0) return { answer: 'Пока нет данных о расходах этого месяца.' };
      const top = byCat[0];
      const sr = await getSavingsRate(monthStart, now.getTime());
      const lines = [
        `Ваша главная статья расходов — «${top.categoryName}»: ${fmt(top.amount)} ₽ (${Math.round(top.percent)}% всех трат).`,
        `• Сократив её на 10% → сэкономите ~${fmt(top.amount * 0.1)} ₽/мес`,
        `• На 20% → ~${fmt(top.amount * 0.2)} ₽/мес`,
      ];
      if (sr.income > 0) lines.push(`\nСейчас норма сбережений: ${Math.round(sr.savingsRate)}%. Рекомендуемый минимум — 20%.`);
      if (byCat.length > 1) lines.push(`\nДругие крупные категории: ${byCat.slice(1, 3).map(c => `${c.categoryName} (${fmt(c.amount)} ₽)`).join(', ')}.`);
      return { answer: lines.join('\n') };
    },
    suggestions: ['Бюджеты', 'Расходы по категориям', 'Прогноз до конца месяца'],
  },
  {
    id: 'largest',
    patterns: [/самы.*крупн|больш.*трат|крупн.*трат|крупные|крупнейш/],
    handle: async (_q, _ctx, period) => {
      const top = await getLargestTransactions(5, period.start, period.end);
      if (top.length === 0) return { answer: `${period.label} крупных расходов нет.` };
      const list = top.map(t => {
        const label = t.comment ? `${t.categoryName} (${t.comment})` : t.categoryName;
        return `• ${label} — ${fmt(t.amount)} ₽`;
      }).join('\n');
      return { answer: `Крупнейшие расходы ${period.label.toLowerCase()}:\n${list}` };
    },
    suggestions: ['Аномальные траты', 'Расходы по категориям', 'А за прошлый месяц?'],
  },
  {
    id: 'daily-avg',
    patterns: [/средн.*день|в среднем|дневн.*расход|средний.*расход|средн.*трат/],
    handle: async (_q, _ctx, period) => {
      const avg = await getAverageDailySpend(period.start, period.end);
      return { answer: `Средние расходы в день ${period.label.toLowerCase()}: ${fmt(avg)} ₽/день.` };
    },
    suggestions: ['Прогноз до конца месяца', 'Расходы за месяц', 'Сравнить с прошлым'],
  },
  {
    id: 'goals-timeline',
    patterns: [/когда.*накопл|когда.*достигн|сколько.*времени.*цел/],
    handle: async (_q, _ctx, _period, now) => {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const goals = await getGoalsProgress();
      const active = goals.filter(g => g.isActive && g.percent < 100);
      if (active.length === 0) return { answer: 'Активных незавершённых целей нет.' };
      const sr = await getSavingsRate(monthStart, now.getTime());
      if (sr.saved <= 0) return { answer: 'Не могу рассчитать — в этом месяце пока нет положительных накоплений.' };
      const lines = active.slice(0, 3).map(g => {
        const months = Math.ceil(g.remaining / sr.saved);
        return `• «${g.name}»: ${fmt(g.remaining)} ₽ → ~${months} мес.`;
      });
      return { answer: `При темпе ${fmt(sr.saved)} ₽/мес:\n${lines.join('\n')}` };
    },
    suggestions: ['Мои цели', 'Норма сбережений', 'Баланс'],
  },
  {
    id: 'goals',
    patterns: [/цел|накопл|откладыва/],
    handle: async () => {
      const goals = await getGoalsProgress();
      const active = goals.filter(g => g.isActive);
      if (active.length === 0) return { answer: 'Активных целей нет.' };
      const lines = active.map(g =>
        `• «${g.name}»: ${fmt(g.currentAmount)} / ${fmt(g.targetAmount)} ₽ (${Math.round(g.percent)}%)`
      );
      return { answer: `Ваши цели:\n${lines.join('\n')}` };
    },
    suggestions: ['Когда накоплю?', 'Норма сбережений', 'Баланс'],
  },
  {
    id: 'budget',
    patterns: [/бюджет/],
    handle: async (_q, _ctx, _period, now) => {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const budgets = await getAllBudgetsProgress(monthStart, now.getTime());
      if (budgets.length === 0) return { answer: 'Бюджеты не настроены.' };
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
      return { answer: `Бюджеты этого месяца:\n${lines.join('\n')}` };
    },
    suggestions: ['Как сэкономить?', 'Расходы по категориям', 'Прогноз до конца месяца'],
  },
  {
    id: 'forecast',
    patterns: [/прогноз|конец месяц|сколько потрачу/],
    handle: async () => {
      const f = await getMonthForecast();
      return {
        answer: `Прогноз до конца месяца: ~${fmt(f.forecastTotal)} ₽\nУже потрачено: ${fmt(f.spent)} ₽\nОсталось дней: ${f.daysLeft}\nТемп: ${fmt(f.dailyRate)} ₽/день`,
      };
    },
    suggestions: ['Средний расход в день', 'Бюджеты', 'Сравнить с прошлым'],
  },
  {
    id: 'compare',
    patterns: [/сравн|расход.*прошл|прошл.*расход/],
    handle: async (_q, _ctx, _period, now) => {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
      const [thisM, lastM] = await Promise.all([
        getBalanceByPeriod(monthStart, now.getTime()),
        getBalanceByPeriod(lastMonthStart, monthStart - 1),
      ]);
      const diff = thisM.expenses - lastM.expenses;
      const pct = lastM.expenses > 0 ? Math.round(diff / lastM.expenses * 100) : 0;
      const sign = diff >= 0 ? '+' : '';
      return {
        answer: `Расходы: ${fmt(lastM.expenses)} ₽ → ${fmt(thisM.expenses)} ₽\nИзменение: ${sign}${fmt(diff)} ₽ (${sign}${pct}%)`,
      };
    },
    suggestions: ['Расходы по категориям', 'Норма сбережений', 'Баланс'],
  },
  {
    id: 'savings',
    patterns: [/экономи|норм.*сбережен|сбережен|сберег/],
    handle: async (_q, _ctx, period) => {
      const sr = await getSavingsRate(period.start, period.end);
      if (sr.income === 0) return { answer: 'Нет данных по доходам за этот период.' };
      return {
        answer: `Норма сбережений ${period.label.toLowerCase()}: ${Math.round(sr.savingsRate)}%\nДоходы: ${fmt(sr.income)} ₽\nРасходы: ${fmt(sr.expenses)} ₽\nСохранено: ${fmt(sr.saved)} ₽`,
      };
    },
    suggestions: ['Баланс', 'Как сэкономить?', 'Мои цели'],
  },
  {
    id: 'balance',
    patterns: [/баланс|остат/],
    handle: async (_q, _ctx, period) => {
      const { balance, income, expenses } = await getBalanceByPeriod(period.start, period.end);
      return {
        answer: `Баланс ${period.label.toLowerCase()}: ${fmt(balance)} ₽\nДоходы: ${fmt(income)} ₽\nРасходы: ${fmt(expenses)} ₽`,
      };
    },
    suggestions: ['Расходы за месяц', 'Прогноз до конца месяца', 'Норма сбережений'],
  },
  {
    id: 'income',
    patterns: [/доход|зарплат|получил/],
    handle: async (_q, _ctx, period) => {
      const { income } = await getBalanceByPeriod(period.start, period.end);
      return { answer: `Доходы ${period.label.toLowerCase()}: ${fmt(income)} ₽` };
    },
    suggestions: ['Баланс', 'Норма сбережений', 'Когда зарплата?'],
  },
  {
    id: 'category',
    patterns: [/.+/],
    handle: async (q, _ctx, period) => {
      const catMatch = await findCategoryByName(q);
      if (!catMatch) return null;
      const expenses = await getExpensesByCategory(period.start, period.end);
      const cat = expenses.find(e => e.categoryId === catMatch.id);
      if (!cat) {
        return {
          answer: `${period.label} расходов на «${catMatch.name}» нет.`,
          extra: { lastCategoryId: catMatch.id, lastCategoryName: catMatch.name },
        };
      }
      return {
        answer: `${period.label} «${catMatch.name}»: ${fmt(cat.amount)} ₽`,
        extra: { lastCategoryId: catMatch.id, lastCategoryName: catMatch.name },
      };
    },
    suggestions: ['А за прошлый месяц?', 'Расходы по категориям', 'Бюджеты'],
  },
  {
    id: 'expenses',
    patterns: [/расход|потрат|трат/],
    handle: async (_q, _ctx, period) => {
      const byCat = await getExpensesByCategory(period.start, period.end);
      if (byCat.length === 0) return { answer: `${period.label} расходов нет.` };
      const total = byCat.reduce((s, c) => s + c.amount, 0);
      const top = byCat.slice(0, 3).map(c => `${c.categoryName}: ${fmt(c.amount)} ₽`).join(', ');
      return { answer: `Расходы ${period.label.toLowerCase()}: ${fmt(total)} ₽\nТоп: ${top}` };
    },
    suggestions: ['Расходы по категориям', 'Самые крупные траты', 'Прогноз до конца месяца'],
  },
];

const FALLBACK_SUGGESTIONS = ['Помощь', 'Расходы за месяц', 'Баланс'];

export async function answerQuery(text: string, ctx: ChatCtx): Promise<ChatAnswer> {
  const q = text.toLowerCase();
  const period = extractPeriod(q);
  const now = new Date();

  const isShift = /^(а|и)?\s*(в|за)?\s*прошл|а раньше|а как насчёт|а до этого/.test(q);
  if (isShift && ctx.lastTopic && ctx.lastPeriod) {
    const shifted = shiftPeriodBack(ctx.lastPeriod);
    const shiftedCtx = { ...ctx, lastPeriod: shifted };
    const synth = ctx.lastCategoryName
      ? `расходы на ${ctx.lastCategoryName} ${shifted.label}`
      : `${ctx.lastTopic} ${shifted.label}`;
    return answerQuery(synth, shiftedCtx);
  }

  for (const intent of INTENTS) {
    if (!intent.patterns.some(p => p.test(q))) continue;
    const result = await intent.handle(q, ctx, period, now);
    if (result === null) continue;
    return {
      answer: result.answer,
      newCtx: { lastTopic: intent.id, lastPeriod: period, ...result.extra },
      suggestions: intent.suggestions,
    };
  }

  return {
    answer: 'Не понял вопрос. Напишите «помощь» чтобы увидеть всё, что я умею.',
    newCtx: ctx,
    suggestions: FALLBACK_SUGGESTIONS,
  };
}
