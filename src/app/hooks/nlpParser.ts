// Period parsing and NLP utilities for AI chat

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function fmt(n: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);
}

export interface Period {
  start: number;
  end: number;
  label: string;
  key: string;
}

export function extractPeriod(q: string): Period {
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

export function shiftPeriodBack(p: Period): Period {
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
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 2, 1).getTime(),
        end: new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime() - 1,
        label: 'Два месяца назад',
        key: '2m-ago',
      };
    default:
      return p;
  }
}

export const HELP_TEXT = `Я могу ответить на вопросы о ваших финансах:

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
