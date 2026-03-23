/**
 * Тесты для утилит форматирования валюты
 * Проверяют корректность форматирования, парсинга и обработки input значений
 */

import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatAmountInput,
  parseAmountInput,
  parseAmountToNumber,
  handleAmountInputChange,
} from './formatCurrency';

describe('formatCurrency', () => {
  describe('базовое форматирование', () => {
    it('должен форматировать целое число как валюту RUB', () => {
      const result = formatCurrency(1000);
      expect(result).toMatch(/1\s?000\s?₽/);
    });

    it('должен форматировать число с копейками', () => {
      const result = formatCurrency(1234.56);
      expect(result).toMatch(/1\s?234,56\s?₽/);
    });

    it('должен форматировать строковое значение', () => {
      const result = formatCurrency('5000');
      expect(result).toMatch(/5\s?000\s?₽/);
    });

    it('должен форматировать строку с разделителями', () => {
      const result = formatCurrency('1 000 000');
      expect(result).toMatch(/1\s?000\s?000\s?₽/);
    });
  });

  describe('разные валюты', () => {
    it('должен форматировать в USD', () => {
      const result = formatCurrency(1000, 'USD');
      expect(result).toMatch(/1\s?000/);
      expect(result).toContain('$');
    });

    it('должен форматировать в EUR', () => {
      const result = formatCurrency(1000, 'EUR');
      expect(result).toMatch(/1\s?000/);
      expect(result).toContain('€');
    });
  });

  describe('граничные значения', () => {
    it('должен возвращать "0" для NaN', () => {
      expect(formatCurrency(NaN)).toBe('0');
    });

    it('должен возвращать "0" для невалидной строки', () => {
      expect(formatCurrency('abc')).toBe('0');
    });

    it('должен форматировать ноль', () => {
      const result = formatCurrency(0);
      expect(result).toMatch(/0\s?₽/);
    });

    it('должен форматировать отрицательное число', () => {
      const result = formatCurrency(-500);
      expect(result).toMatch(/-500/);
      expect(result).toContain('₽');
    });

    it('должен форматировать очень большое число', () => {
      const result = formatCurrency(999999999);
      expect(result).toMatch(/999\s?999\s?999/);
      expect(result).toContain('₽');
    });
  });

  describe('дробные числа', () => {
    it('должен округлять до 2 знаков после запятой', () => {
      const result = formatCurrency(100.999);
      expect(result).toMatch(/101/);
      expect(result).toContain('₽');
    });

    it('должен показывать копейки если есть', () => {
      const result = formatCurrency(100.5);
      expect(result).toMatch(/100,5/);
      expect(result).toContain('₽');
    });
  });
});

describe('formatAmountInput', () => {
  describe('форматирование для input', () => {
    it('должен добавлять разделители тысяч', () => {
      expect(formatAmountInput('1000')).toBe('1 000');
    });

    it('должен форматировать большие числа', () => {
      expect(formatAmountInput('1000000')).toBe('1 000 000');
    });

    it('должен возвращать пустую строку для пустого значения', () => {
      expect(formatAmountInput('')).toBe('');
    });

    it('должен сохранять дробную часть', () => {
      expect(formatAmountInput('1000.50')).toBe('1 000.50');
    });

    it('должен форматировать число с дробной частью без разделителя', () => {
      expect(formatAmountInput('12345.67')).toBe('12 345.67');
    });
  });
});

describe('parseAmountInput', () => {
  describe('удаление разделителей', () => {
    it('должен удалять пробелы-разделители', () => {
      expect(parseAmountInput('1 000')).toBe('1000');
    });

    it('должен удалять множественные разделители', () => {
      expect(parseAmountInput('1 000 000')).toBe('1000000');
    });

    it('должен возвращать пустую строку для пустого значения', () => {
      expect(parseAmountInput('')).toBe('');
    });

    it('должен сохранять дробную часть', () => {
      expect(parseAmountInput('1 000.50')).toBe('1000.50');
    });
  });
});

describe('parseAmountToNumber', () => {
  describe('парсинг в число', () => {
    it('должен парсить целое число', () => {
      expect(parseAmountToNumber('1000')).toBe(1000);
    });

    it('должен парсить число с разделителями', () => {
      expect(parseAmountToNumber('1 000 000')).toBe(1000000);
    });

    it('должен парсить число с дробной частью', () => {
      expect(parseAmountToNumber('1000.50')).toBe(1000.5);
    });

    it('должен возвращать 0 для невалидной строки', () => {
      expect(parseAmountToNumber('abc')).toBe(0);
    });

    it('должен возвращать 0 для пустой строки', () => {
      expect(parseAmountToNumber('')).toBe(0);
    });
  });
});

describe('handleAmountInputChange', () => {
  describe('обработчик изменения input', () => {
    it('должен форматировать валидное число', () => {
      expect(handleAmountInputChange('1000')).toBe('1 000');
    });

    it('должен форматировать число с разделителями', () => {
      expect(handleAmountInputChange('1000000')).toBe('1 000 000');
    });

    it('должен сохранять дробную часть', () => {
      expect(handleAmountInputChange('1000.50')).toBe('1 000.50');
    });

    it('должен возвращать исходное значение для невалидного ввода', () => {
      expect(handleAmountInputChange('abc')).toBe('abc');
    });

    it('должен разрешать ввод с точкой', () => {
      expect(handleAmountInputChange('1000.')).toBe('1 000.');
    });

    it('должен разрешать ввод только точки', () => {
      expect(handleAmountInputChange('.')).toBe('.');
    });

    it('должен разрешать ввод нуля', () => {
      expect(handleAmountInputChange('0')).toBe('0');
    });

    it('должен разрешать ввод нескольких нулей', () => {
      expect(handleAmountInputChange('000')).toBe('000');
    });
  });
});
