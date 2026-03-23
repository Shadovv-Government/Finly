/**
 * Константы приложения Finly
 * Централизованное хранилище магических чисел и значений
 */

// ==================== Время ====================

/** Миллисекунд в секунде */
export const MS_PER_SECOND = 1000;

/** Миллисекунд в минуте */
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;

/** Миллисекунд в часе */
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;

/** Миллисекунд в дне */
export const MS_PER_DAY = 24 * MS_PER_HOUR;

/** Миллисекунд в неделе */
export const MS_PER_WEEK = 7 * MS_PER_DAY;

/** Миллисекунд в месяце (приблизительно 30 дней) */
export const MS_PER_MONTH = 30 * MS_PER_DAY;

/** Миллисекунд в году (приблизительно 365 дней) */
export const MS_PER_YEAR = 365 * MS_PER_DAY;

// ==================== Валидация ====================

/** Максимальная сумма транзакции (1 млрд) */
export const MAX_AMOUNT = 1_000_000_000;

/** Минимальная сумма транзакции */
export const MIN_AMOUNT = 0.01;

/** Максимальная длина комментария */
export const MAX_COMMENT_LENGTH = 500;

/** Максимальная длина названия */
export const MAX_NAME_LENGTH = 100;

/** Допустимое отклонение даты в будущем (1 день) */
export const MAX_FUTURE_DATE_OFFSET = MS_PER_DAY;

/** Допустимое отклонение даты в прошлом (10 лет) */
export const MAX_PAST_DATE_OFFSET = 10 * MS_PER_YEAR;

// ==================== Периоды ====================

/** Периоды для аналитики */
export const ANALYTICS_PERIODS = ['day', 'week', 'month', 'year', 'custom'] as const;

/** Периоды для бюджетов */
export const BUDGET_PERIODS = ['week', 'month'] as const;

/** Интервалы повторяющихся платежей */
export const RECURRING_INTERVALS = ['daily', 'weekly', 'monthly', 'yearly'] as const;

// ==================== Валюты ====================

/** Валюты по умолчанию */
export const DEFAULT_CURRENCY = 'RUB';

/** Основные валюты */
export const SUPPORTED_CURRENCIES = ['RUB', 'USD', 'EUR'] as const;

// ==================== Темы ====================

/** Режимы темы */
export const THEME_MODES = ['light', 'dark', 'system'] as const;

/** Тема по умолчанию */
export const DEFAULT_THEME = 'light';

// ==================== UI ====================

/** Количество последних транзакций на дашборде */
export const DASHBOARD_RECENT_TRANSACTIONS = 5;

/** Количество категорий для отображения в превью */
export const PREVIEW_CATEGORIES_COUNT = 5;

/** Максимальное количество точек на графике трендов */
export const MAX_TREND_POINTS = 12;

// ==================== AI ====================

/** Минимальная длина паттерна для обучения */
export const MIN_PATTERN_LENGTH = 2;

/** Максимальная длина паттерна */
export const MAX_PATTERN_LENGTH = 50;

/** Начальная уверенность AI паттерна */
export const INITIAL_AI_CONFIDENCE = 0.5;

/** Шаг изменения уверенности при положительном фидбеке */
export const AI_CONFIDENCE_DELTA_POSITIVE = 0.1;

/** Шаг изменения уверенности при отрицательном фидбеке */
export const AI_CONFIDENCE_DELTA_NEGATIVE = -0.15;

/** Минимальная уверенность паттерна */
export const MIN_AI_CONFIDENCE = 0.1;

/** Максимальная уверенность паттерна */
export const MAX_AI_CONFIDENCE = 1;

// ==================== Стоп-слова для AI ====================

export const AI_STOP_WORDS = new Set([
  // English
  'the', 'and', 'for', 'was', 'were', 'been', 'being',
  // Russian
  'и', 'в', 'на', 'с', 'к', 'по', 'под', 'над',
  // Глаголы покупки
  'купил', 'купила', 'купить', 'потратил', 'потратила',
  'заплатил', 'заплатила', 'получил', 'получила',
]);
