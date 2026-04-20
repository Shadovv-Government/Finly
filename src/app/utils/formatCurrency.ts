/**
 * Утилиты для форматирования и парсинга валютных значений
 * Устраняет дублирование кода форматирования по всему проекту
 */

/**
 * Форматирует числовое значение как валюту с разделителями тысяч
 * @param amount - Сумма (число или строка)
 * @param currency - Код валюты (по умолчанию RUB)
 * @returns Отформатированная строка (например, "1 000 ₽")
 */
export function formatCurrency(amount: number | string, currency: string = 'RUB'): string {
  const num = typeof amount === 'string' 
    ? parseFloat(amount.replace(/\s/g, '')) 
    : amount;
  
  if (isNaN(num)) return '0';

  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Форматирует сумму с разделителями тысяч без символа валюты
 * Для использования в input полях
 * @param value - Строковое значение суммы
 * @returns Отформатированная строка (например, "1 000")
 */
export function formatAmountInput(value: string): string {
  if (!value) return '';
  const parts = value.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.join('.');
}

/**
 * Удаляет разделители тысяч из строки для парсинга
 * @param value - Строка с разделителями (например, "1 000")
 * @returns Чистая строка для парсинга (например, "1000")
 */
export function parseAmountInput(value: string): string {
  return value
    .replace(/\s*(рублей|рубля|рублю|руб\.?|р\.?|₽|rub|r|usd|\$|eur|€)\s*$/i, '')
    .replace(/\s/g, '');
}

/**
 * Парсит строковое значение в число
 * @param value - Строка с суммой
 * @returns Число или NaN если не удалось распарсить
 */
export function parseAmountToNumber(value: string): number {
  return parseFloat(parseAmountInput(value)) || 0;
}

/**
 * Обработчик изменения для input с форматированием суммы
 * @param value - Текущее значение input
 * @returns Отформатированное значение для установки в input
 */
export function handleAmountInputChange(value: string): string {
  const parsed = parseAmountInput(value);
  if (/^\d*\.?\d*$/.test(parsed)) {
    return formatAmountInput(parsed);
  }
  return value;
}

/**
 * Форматирует timestamp/Date в локальное значение для input[type="date"] без UTC-сдвига.
 */
export function formatDateInputValue(value: number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Парсит значение input[type="date"] в локальную дату на полночь.
 */
export function parseDateInputValue(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}
