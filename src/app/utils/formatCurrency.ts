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
  return value.replace(/\s/g, '');
}

/**
 * Парсит строковое значение в число
 * @param value - Строка с суммой
 * @returns Число или NaN если не удалось распарсить
 */
export function parseAmountToNumber(value: string): number {
  const cleaned = value.replace(/\s/g, '');
  return parseFloat(cleaned) || 0;
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
