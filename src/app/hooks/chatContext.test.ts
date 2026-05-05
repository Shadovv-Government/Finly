import { describe, it, expect, beforeEach, vi } from 'vitest';
import { answerQuery } from './chatContext';
import { HELP_TEXT } from './nlpParser';
import * as analytics from '../../db/analytics';

vi.mock('../../db/analytics', () => ({
  getBalanceByPeriod:       vi.fn(),
  getExpensesByCategory:    vi.fn(),
  getMonthForecast:         vi.fn(),
  getSavingsRate:           vi.fn(),
  getAllBudgetsProgress:    vi.fn(),
  getGoalsProgress:         vi.fn(),
  getLargestTransactions:   vi.fn(),
  getAverageDailySpend:     vi.fn(),
  getRecurringUpcoming:     vi.fn(),
  findCategoryByName:       vi.fn(),
  getSpendByDayOfWeek:      vi.fn(),
  getAnomalousTransactions: vi.fn(),
  getIncomePattern:         vi.fn(),
}));

const m = analytics as unknown as Record<string, ReturnType<typeof vi.fn>>;
const CTX = {};

const dummyBalance  = { income: 80000, expenses: 50000, balance: 30000, periodStart: 0, periodEnd: 1 };
const dummySavings  = { income: 80000, expenses: 50000, saved: 30000, savingsRate: 37.5 };
const dummyForecast = { forecastTotal: 60000, spent: 45000, daysLeft: 10, dailyRate: 1500 };

describe('answerQuery — маршрутизация интентов', () => {
  beforeEach(() => vi.clearAllMocks());

  // ---- Помощь -------------------------------------------------------

  it('help: возвращает HELP_TEXT', async () => {
    const { answer } = await answerQuery('помощь', CTX);
    expect(answer).toBe(HELP_TEXT);
  });

  it('help: срабатывает на "что умеешь"', async () => {
    const { answer } = await answerQuery('что ты умеешь', CTX);
    expect(answer).toBe(HELP_TEXT);
  });

  // ---- Регулярные платежи -------------------------------------------

  it('recurring: вызывает getRecurringUpcoming(30)', async () => {
    m.getRecurringUpcoming.mockResolvedValue([
      { label: 'Netflix', amount: 990, daysUntil: 3 },
    ]);
    const { answer, newCtx } = await answerQuery('ближайшие платежи', CTX);
    expect(m.getRecurringUpcoming).toHaveBeenCalledWith(30);
    expect(answer).toContain('Netflix');
    expect(newCtx.lastTopic).toBe('recurring');
  });

  it('recurring: сообщает об отсутствии платежей', async () => {
    m.getRecurringUpcoming.mockResolvedValue([]);
    const { answer } = await answerQuery('регулярные платежи', CTX);
    expect(answer).toContain('нет');
  });

  // ---- Паттерн дохода -----------------------------------------------

  it('income-pattern: показывает типичный день зарплаты', async () => {
    m.getIncomePattern.mockResolvedValue({ typicalDay: 5, avgAmount: 120000, occurrences: 6 });
    const { answer } = await answerQuery('когда зарплата придёт', CTX);
    expect(m.getIncomePattern).toHaveBeenCalled();
    expect(answer).toContain('5-го');
  });

  it('income-pattern: сообщает о нехватке данных', async () => {
    m.getIncomePattern.mockResolvedValue({ typicalDay: null, avgAmount: 0, occurrences: 0 });
    const { answer } = await answerQuery('когда зарплата приходит', CTX);
    expect(answer).toContain('недостаточно данных');
  });

  // ---- Аномалии -----------------------------------------------------

  it('anomalies: показывает аномальные траты', async () => {
    m.getAnomalousTransactions.mockResolvedValue([
      { categoryName: 'Рестораны', comment: '', amount: 15000, ratio: 4, avgForCategory: 3750 },
    ]);
    const { answer } = await answerQuery('необычные траты', CTX);
    expect(m.getAnomalousTransactions).toHaveBeenCalled();
    expect(answer).toContain('Рестораны');
  });

  it('anomalies: сообщает если аномалий нет', async () => {
    m.getAnomalousTransactions.mockResolvedValue([]);
    const { answer } = await answerQuery('аномальные расходы', CTX);
    expect(answer).toContain('не найдено');
  });

  // ---- День недели --------------------------------------------------

  it('day-of-week: показывает топ-дни трат', async () => {
    const days = [
      { dayLabel: 'Понедельник', amount: 5000 },
      { dayLabel: 'Пятница',     amount: 12000 },
      { dayLabel: 'Воскресенье', amount: 2000 },
      { dayLabel: 'Вторник',     amount: 4000 },
      { dayLabel: 'Среда',       amount: 3000 },
      { dayLabel: 'Четверг',     amount: 3500 },
      { dayLabel: 'Суббота',     amount: 8000 },
    ];
    m.getSpendByDayOfWeek.mockResolvedValue(days);
    const { answer } = await answerQuery('по дням недели', CTX);
    expect(m.getSpendByDayOfWeek).toHaveBeenCalled();
    expect(answer).toContain('Пятница');
  });

  // ---- Советы по экономии -------------------------------------------

  it('advice: вызывает getExpensesByCategory и getSavingsRate', async () => {
    m.getExpensesByCategory.mockResolvedValue([
      { categoryId: 'c1', categoryName: 'Еда', amount: 30000, percent: 60, icon: '', color: '' },
    ]);
    m.getSavingsRate.mockResolvedValue(dummySavings);
    const { answer } = await answerQuery('как сэкономить', CTX);
    expect(m.getExpensesByCategory).toHaveBeenCalled();
    expect(m.getSavingsRate).toHaveBeenCalled();
    expect(answer).toContain('Еда');
  });

  // ---- Крупные траты ------------------------------------------------

  it('largest: показывает список крупнейших расходов', async () => {
    m.getLargestTransactions.mockResolvedValue([
      { categoryName: 'Электроника', comment: 'Телефон', amount: 85000 },
    ]);
    const { answer } = await answerQuery('самые крупные траты', CTX);
    expect(m.getLargestTransactions).toHaveBeenCalledWith(5, expect.any(Number), expect.any(Number));
    expect(answer).toContain('Телефон');
  });

  it('largest: сообщает если крупных расходов нет', async () => {
    m.getLargestTransactions.mockResolvedValue([]);
    const { answer } = await answerQuery('крупные траты', CTX);
    expect(answer).toContain('нет');
  });

  // ---- Средние расходы в день ---------------------------------------

  it('daily-avg: показывает средний расход', async () => {
    m.getAverageDailySpend.mockResolvedValue(2500);
    const { answer } = await answerQuery('средний расход в день', CTX);
    expect(m.getAverageDailySpend).toHaveBeenCalled();
    expect(answer).toMatch(/2[\s\u202F\u00A0]500/);
  });

  // ---- Цели ---------------------------------------------------------

  it('goals: показывает активные цели', async () => {
    m.getGoalsProgress.mockResolvedValue([
      { id: 1, name: 'Отпуск', targetAmount: 150000, currentAmount: 60000,
        percent: 40, remaining: 90000, icon: '', color: '', isActive: true },
    ]);
    const { answer } = await answerQuery('мои цели', CTX);
    expect(m.getGoalsProgress).toHaveBeenCalled();
    expect(answer).toContain('Отпуск');
  });

  it('goals: сообщает если нет активных целей', async () => {
    m.getGoalsProgress.mockResolvedValue([]);
    const { answer } = await answerQuery('мои накопления', CTX);
    expect(answer).toContain('нет');
  });

  // ---- Когда накоплю ------------------------------------------------

  it('goals-eta: рассчитывает срок достижения цели', async () => {
    m.getGoalsProgress.mockResolvedValue([
      { id: 1, name: 'Машина', targetAmount: 1000000, currentAmount: 100000,
        percent: 10, remaining: 900000, icon: '', color: '', isActive: true },
    ]);
    m.getSavingsRate.mockResolvedValue({ ...dummySavings, saved: 30000 });
    const { answer } = await answerQuery('когда накоплю на цель', CTX);
    expect(m.getSavingsRate).toHaveBeenCalled();
    expect(answer).toContain('мес');
  });

  // ---- Бюджеты ------------------------------------------------------

  it('budget: показывает статус бюджетов', async () => {
    m.getAllBudgetsProgress.mockResolvedValue([
      { categoryId: 'c', categoryName: 'Еда', spent: 5000, limit: 10000,
        percent: 50, isOverBudget: false, icon: '', color: '' },
    ]);
    const { answer } = await answerQuery('бюджет', CTX);
    expect(m.getAllBudgetsProgress).toHaveBeenCalled();
    expect(answer).toContain('Еда');
  });

  it('budget: сообщает если бюджеты не настроены', async () => {
    m.getAllBudgetsProgress.mockResolvedValue([]);
    const { answer } = await answerQuery('бюджет на месяц', CTX);
    expect(answer).toContain('не настроены');
  });

  // ---- Прогноз ------------------------------------------------------

  it('forecast: показывает прогноз расходов', async () => {
    m.getMonthForecast.mockResolvedValue(dummyForecast);
    const { answer } = await answerQuery('прогноз до конца месяца', CTX);
    expect(m.getMonthForecast).toHaveBeenCalled();
    expect(answer).toContain('Прогноз');
  });

  // ---- Сравнение периодов -------------------------------------------

  it('compare: вызывает getBalanceByPeriod дважды', async () => {
    m.getBalanceByPeriod.mockResolvedValue(dummyBalance);
    const { answer, newCtx } = await answerQuery('сравнение расходов с прошлым', CTX);
    expect(m.getBalanceByPeriod).toHaveBeenCalledTimes(2);
    expect(answer).toContain('Изменение');
    expect(newCtx.lastTopic).toBe('compare');
  });

  // ---- Норма сбережений ---------------------------------------------

  it('savings: показывает норму сбережений', async () => {
    m.getSavingsRate.mockResolvedValue(dummySavings);
    const { answer } = await answerQuery('норма сбережений', CTX);
    expect(m.getSavingsRate).toHaveBeenCalled();
    expect(answer).toContain('сбережений');
  });

  it('savings: сообщает если нет данных по доходам', async () => {
    m.getSavingsRate.mockResolvedValue({ income: 0, expenses: 0, saved: 0, savingsRate: 0 });
    const { answer } = await answerQuery('сберегаю ли я достаточно', CTX);
    expect(answer).toContain('Нет данных');
  });

  // ---- Баланс -------------------------------------------------------

  it('balance: показывает баланс за период', async () => {
    m.getBalanceByPeriod.mockResolvedValue(dummyBalance);
    const { answer, newCtx } = await answerQuery('мой баланс', CTX);
    expect(m.getBalanceByPeriod).toHaveBeenCalledOnce();
    expect(answer).toContain('Баланс');
    expect(newCtx.lastTopic).toBe('balance');
  });

  // ---- Доходы -------------------------------------------------------

  it('income: показывает сумму доходов', async () => {
    m.getBalanceByPeriod.mockResolvedValue(dummyBalance);
    const { answer, newCtx } = await answerQuery('мои доходы', CTX);
    expect(answer).toContain('Доходы');
    expect(newCtx.lastTopic).toBe('income');
  });

  // ---- Расходы по категории -----------------------------------------

  it('category: показывает расходы на найденную категорию', async () => {
    m.findCategoryByName.mockResolvedValue({ id: 'cat-food', name: 'Еда' });
    m.getExpensesByCategory.mockResolvedValue([
      { categoryId: 'cat-food', categoryName: 'Еда', amount: 12000, percent: 25, icon: '', color: '' },
    ]);
    const { answer, newCtx } = await answerQuery('еда', CTX);
    expect(m.findCategoryByName).toHaveBeenCalled();
    expect(answer).toContain('Еда');
    expect(answer).toMatch(/12[\s  ]000/);
    expect(newCtx.lastCategoryId).toBe('cat-food');
  });

  it('category: сообщает если расходов на категорию нет', async () => {
    m.findCategoryByName.mockResolvedValue({ id: 'cat-sport', name: 'Спорт' });
    m.getExpensesByCategory.mockResolvedValue([]);
    const { answer } = await answerQuery('спорт', CTX);
    expect(answer).toContain('нет');
  });

  // ---- Общие расходы ------------------------------------------------

  it('expenses: показывает расходы по категориям', async () => {
    m.findCategoryByName.mockResolvedValue(null);
    m.getExpensesByCategory.mockResolvedValue([
      { categoryId: 'c1', categoryName: 'Транспорт', amount: 8000, percent: 20, icon: '', color: '' },
    ]);
    const { answer, newCtx } = await answerQuery('сколько потратил', CTX);
    expect(m.getExpensesByCategory).toHaveBeenCalled();
    expect(answer).toContain('Расходы');
    expect(newCtx.lastTopic).toBe('expenses');
  });

  // ---- Сдвиг периода ------------------------------------------------

  it('shift: рекурсивный вызов при "а в прошлом" с lastCategoryName', async () => {
    m.findCategoryByName.mockResolvedValue({ id: 'cat-food', name: 'Еда' });
    m.getExpensesByCategory.mockResolvedValue([
      { categoryId: 'cat-food', categoryName: 'Еда', amount: 9000, percent: 30, icon: '', color: '' },
    ]);
    const ctx = {
      lastTopic: 'category',
      lastPeriod: { start: 0, end: 1, label: 'В этом месяце', key: 'this-month', unit: 'month' as const, offset: 0 },
      lastCategoryName: 'Еда',
      lastCategoryId: 'cat-food',
    };
    const { answer } = await answerQuery('а в прошлом', ctx);
    expect(m.getExpensesByCategory).toHaveBeenCalled();
    expect(answer).not.toContain('Не понял');
  });

  // ---- Неизвестный запрос -------------------------------------------

  it('unknown: возвращает дефолтный ответ', async () => {
    m.findCategoryByName.mockResolvedValue(null);
    const { answer } = await answerQuery('абракадабра xyz', CTX);
    expect(answer).toContain('Не понял');
    expect(answer).toContain('помощь');
  });

  // ---- Suggestions --------------------------------------------------

  it('suggestions: всегда возвращает непустой массив', async () => {
    m.getBalanceByPeriod.mockResolvedValue(dummyBalance);
    const { suggestions } = await answerQuery('баланс', CTX);
    expect(suggestions).toBeInstanceOf(Array);
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('suggestions: возвращает массив даже на fallback', async () => {
    m.findCategoryByName.mockResolvedValue(null);
    const { suggestions } = await answerQuery('абракадабра xyz', CTX);
    expect(suggestions).toBeInstanceOf(Array);
    expect(suggestions.length).toBeGreaterThan(0);
  });
});
