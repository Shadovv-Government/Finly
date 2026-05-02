/**
 * Тесты для валидаторов данных
 * Проверяют валидацию транзакций, категорий, бюджетов и целей
 */

import { describe, it, expect, vi } from 'vitest';
import {
  validateTransaction,
  validateCategory,
  validateBudget,
  validateGoal,
  validateRecurringTemplate,
  validateAIPattern,
  assertValid,
  validateWithWarnings,
} from './validators';

describe('validateTransaction', () => {
  describe('валидация amount', () => {
    it('должен проходить для валидной суммы', () => {
      const result = validateTransaction({
        amount: 1000,
        type: 'expense',
        categoryId: 'cat-1',
        date: Date.now(),
        currency: 'RUB',
        rate: 1,
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('должен ошибаться для отрицательной суммы', () => {
      const result = validateTransaction({
        amount: -100,
        type: 'expense',
        categoryId: 'cat-1',
        date: Date.now(),
        currency: 'RUB',
        rate: 1,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Сумма должна быть больше 0');
    });

    it('должен ошибаться для нулевой суммы', () => {
      const result = validateTransaction({
        amount: 0,
        type: 'expense',
        categoryId: 'cat-1',
        date: Date.now(),
        currency: 'RUB',
        rate: 1,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Сумма должна быть больше 0');
    });

    it('должен ошибаться для отсутствующей суммы', () => {
      const result = validateTransaction({
        type: 'expense',
        categoryId: 'cat-1',
        date: Date.now(),
      } as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Сумма обязательна');
    });

    it('должен предупреждать для очень маленькой суммы', () => {
      const result = validateTransaction({
        amount: 0.001,
        type: 'expense',
        categoryId: 'cat-1',
        date: Date.now(),
        currency: 'RUB',
        rate: 1,
      });

      expect(result.warnings.some(w => w.includes('Сумма очень маленькая'))).toBe(true);
    });
  });

  describe('валидация type', () => {
    it('должен проходить для expense', () => {
      const result = validateTransaction({
        amount: 1000,
        type: 'expense',
        categoryId: 'cat-1',
        date: Date.now(),
      });

      expect(result.isValid).toBe(true);
    });

    it('должен проходить для income', () => {
      const result = validateTransaction({
        amount: 5000,
        type: 'income',
        categoryId: 'cat-2',
        date: Date.now(),
      });

      expect(result.isValid).toBe(true);
    });

    it('должен ошибаться для невалидного типа', () => {
      const result = validateTransaction({
        amount: 1000,
        type: 'invalid' as any,
        categoryId: 'cat-1',
        date: Date.now(),
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Неверный тип операции'))).toBe(true);
    });

    it('должен ошибаться для отсутствующего типа', () => {
      const result = validateTransaction({
        amount: 1000,
        categoryId: 'cat-1',
        date: Date.now(),
      } as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Тип операции обязателен');
    });
  });

  describe('валидация categoryId', () => {
    it('должен проходить для валидного categoryId', () => {
      const result = validateTransaction({
        amount: 1000,
        type: 'expense',
        categoryId: 'cat-1',
        date: Date.now(),
      });

      expect(result.isValid).toBe(true);
    });

    it('должен проходить для транзакции без categoryId (опционален)', () => {
      const result = validateTransaction({
        amount: 1000,
        type: 'expense',
        date: Date.now(),
      } as any);

      expect(result.isValid).toBe(true);
    });

    it('должен ошибаться для некорректного categoryId (не string)', () => {
      const result = validateTransaction({
        amount: 1000,
        type: 'expense',
        categoryId: 123,
        date: Date.now(),
      } as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ID категории должен быть строкой');
    });
  });

  describe('валидация date', () => {
    it('должен проходить для текущей даты', () => {
      const result = validateTransaction({
        amount: 1000,
        type: 'expense',
        categoryId: 'cat-1',
        date: Date.now(),
      });

      expect(result.isValid).toBe(true);
    });

    it('должен предупреждать для даты в будущем', () => {
      const futureDate = Date.now() + 86400000 * 2; // 2 дня в будущем

      const result = validateTransaction({
        amount: 1000,
        type: 'expense',
        categoryId: 'cat-1',
        date: futureDate,
      });

      expect(result.warnings).toContain('Дата в будущем');
    });

    it('должен предупреждать для даты более 10 лет назад', () => {
      const pastDate = Date.now() - 86400000 * 365 * 11; // 11 лет назад

      const result = validateTransaction({
        amount: 1000,
        type: 'expense',
        categoryId: 'cat-1',
        date: pastDate,
      });

      expect(result.warnings).toContain('Дата более 10 лет назад');
    });
  });

  describe('валидация comment', () => {
    it('должен проходить для короткого комментария', () => {
      const result = validateTransaction({
        amount: 1000,
        type: 'expense',
        categoryId: 'cat-1',
        date: Date.now(),
        comment: 'Кофе',
      });

      expect(result.isValid).toBe(true);
    });

    it('должен ошибаться для слишком длинного комментария', () => {
      const result = validateTransaction({
        amount: 1000,
        type: 'expense',
        categoryId: 'cat-1',
        date: Date.now(),
        comment: 'a'.repeat(501),
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Комментарий превышает максимальную длину'))).toBe(true);
    });
  });

  describe('isUpdate режим', () => {
    it('должен пропускать отсутствующие поля при обновлении', () => {
      const result = validateTransaction({
        amount: 1000,
      }, true);

      expect(result.isValid).toBe(true);
    });
  });
});

describe('validateCategory', () => {
  describe('валидация id', () => {
    it('должен требовать id при создании', () => {
      const result = validateCategory({
        name: 'Продукты',
        type: 'expense',
        icon: 'shopping-cart',
        color: '#FF5722',
        isSystem: true,
      } as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ID категории обязателен');
    });

    it('должен пропускать id при обновлении', () => {
      const result = validateCategory({
        name: 'Новое название',
      }, true);

      expect(result.isValid).toBe(true);
    });
  });

  describe('валидация name', () => {
    it('должен проходить для валидного названия', () => {
      const result = validateCategory({
        id: 'cat-1',
        name: 'Продукты',
        type: 'expense',
        icon: 'shopping-cart',
        color: '#FF5722',
        isSystem: true,
      });

      expect(result.isValid).toBe(true);
    });

    it('должен ошибаться для пустого названия', () => {
      const result = validateCategory({
        id: 'cat-1',
        name: '',
        type: 'expense',
        icon: 'shopping-cart',
        color: '#FF5722',
        isSystem: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Название категории обязательно');
    });

    it('должен ошибаться для названия из пробелов', () => {
      const result = validateCategory({
        id: 'cat-1',
        name: '   ',
        type: 'expense',
        icon: 'shopping-cart',
        color: '#FF5722',
        isSystem: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Название не может быть пустым или состоять только из пробелов');
    });

    it('должен ошибаться для слишком длинного названия', () => {
      const result = validateCategory({
        id: 'cat-1',
        name: 'a'.repeat(101),
        type: 'expense',
        icon: 'shopping-cart',
        color: '#FF5722',
        isSystem: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Название превышает максимальную длину'))).toBe(true);
    });
  });

  describe('валидация type', () => {
    it('должен проходить для expense', () => {
      const result = validateCategory({
        id: 'cat-1',
        name: 'Продукты',
        type: 'expense',
        icon: 'shopping-cart',
        color: '#FF5722',
        isSystem: true,
      });

      expect(result.isValid).toBe(true);
    });

    it('должен проходить для income', () => {
      const result = validateCategory({
        id: 'cat-1',
        name: 'Зарплата',
        type: 'income',
        icon: 'wallet',
        color: '#4CAF50',
        isSystem: true,
      });

      expect(result.isValid).toBe(true);
    });

    it('должен ошибаться для невалидного типа', () => {
      const result = validateCategory({
        id: 'cat-1',
        name: 'Категория',
        type: 'invalid' as any,
        icon: 'shopping-cart',
        color: '#FF5722',
        isSystem: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Неверный тип'))).toBe(true);
    });
  });

  describe('валидация color', () => {
    it('должен предупреждать для невалидного hex цвета', () => {
      const result = validateCategory({
        id: 'cat-1',
        name: 'Категория',
        type: 'expense',
        icon: 'shopping-cart',
        color: 'invalid',
        isSystem: true,
      });

      expect(result.warnings.some(w => w.includes('Цвет должен быть в формате hex'))).toBe(true);
    });

    it('должен проходить для валидного hex цвета', () => {
      const result = validateCategory({
        id: 'cat-1',
        name: 'Категория',
        type: 'expense',
        icon: 'shopping-cart',
        color: '#FF5722',
        isSystem: true,
      });

      expect(result.isValid).toBe(true);
    });
  });
});

describe('validateBudget', () => {
  describe('базовая валидация', () => {
    it('должен проходить для валидного бюджета', () => {
      const result = validateBudget({
        categoryId: 'cat-1',
        amount: 10000,
        period: 'month',
        startDate: Date.now(),
        currency: 'RUB',
      });

      expect(result.isValid).toBe(true);
    });

    it('должен ошибаться для отрицательной суммы', () => {
      const result = validateBudget({
        categoryId: 'cat-1',
        amount: -1000,
        period: 'month',
        startDate: Date.now(),
        currency: 'RUB',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Сумма должна быть больше 0');
    });

    it('должен ошибаться для невалидного периода', () => {
      const result = validateBudget({
        categoryId: 'cat-1',
        amount: 10000,
        period: 'year' as any,
        startDate: Date.now(),
        currency: 'RUB',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Неверный период'))).toBe(true);
    });
  });
});

describe('validateGoal', () => {
  describe('базовая валидация', () => {
    it('должен проходить для валидной цели', () => {
      const result = validateGoal({
        name: 'Накопить на отпуск',
        targetAmount: 100000,
        currentAmount: 10000,
        icon: 'plane',
        color: '#2196F3',
        isActive: true,
      });

      expect(result.isValid).toBe(true);
    });

    it('должен ошибаться для отрицательной текущей суммы', () => {
      const result = validateGoal({
        name: 'Накопить на отпуск',
        targetAmount: 100000,
        currentAmount: -1000,
        icon: 'plane',
        color: '#2196F3',
        isActive: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Текущая сумма не может быть отрицательной');
    });

    it('должен предупреждать если текущая сумма больше целевой', () => {
      const result = validateGoal({
        name: 'Накопить на отпуск',
        targetAmount: 10000,
        currentAmount: 50000,
        icon: 'plane',
        color: '#2196F3',
        isActive: true,
      });

      expect(result.warnings).toContain('Текущая сумма превышает целевую');
    });
  });
});

describe('validateRecurringTemplate', () => {
  it('должен проходить для валидного шаблона', () => {
    const result = validateRecurringTemplate({
      amount: 1000,
      type: 'expense',
      categoryId: 'cat-1',
      interval: 'monthly',
      nextDate: Date.now() + 86400000,
      isActive: true,
    });

    expect(result.isValid).toBe(true);
  });

  it('должен ошибаться для невалидного интервала', () => {
    const result = validateRecurringTemplate({
      amount: 1000,
      type: 'expense',
      categoryId: 'cat-1',
      interval: 'invalid' as any,
      nextDate: Date.now() + 86400000,
      isActive: true,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('Неверный интервал'))).toBe(true);
  });
});

describe('validateAIPattern', () => {
  it('должен проходить для валидного паттерна', () => {
    const result = validateAIPattern({
      pattern: 'старбакс',
      categoryId: 'cat-1',
      confidence: 0.8,
      usageCount: 5,
    });

    expect(result.isValid).toBe(true);
  });

  it('должен ошибаться для слишком короткого паттерна', () => {
    const result = validateAIPattern({
      pattern: 'а',
      categoryId: 'cat-1',
      confidence: 0.8,
      usageCount: 5,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('Шаблон должен быть не менее'))).toBe(true);
  });

  it('должен ошибаться для невалидной уверенности', () => {
    const result = validateAIPattern({
      pattern: 'старбакс',
      categoryId: 'cat-1',
      confidence: 1.5,
      usageCount: 5,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('Уверенность должна быть от'))).toBe(true);
  });
});

describe('assertValid', () => {
  it('должен бросать ошибку если валидация не пройдена', () => {
    const result = { isValid: false, errors: ['Error 1', 'Error 2'], warnings: [] };

    expect(() => assertValid(result, 'Transaction')).toThrow(
      'Ошибка валидации (Transaction): Error 1; Error 2'
    );
  });

  it('должен проходить если валидация пройдена', () => {
    const result = { isValid: true, errors: [], warnings: [] };

    expect(() => assertValid(result, 'Transaction')).not.toThrow();
  });
});

describe('validateWithWarnings', () => {
  it('должен возвращать данные и предупреждения', () => {
    const mockData = { amount: 1000 };
    const mockValidator = vi.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: ['Warning 1'],
    });

    const result = validateWithWarnings(mockData, mockValidator, 'Transaction');

    expect(result.data).toEqual(mockData);
    expect(result.warnings).toEqual(['Warning 1']);
  });

  it('должен бросать ошибку если валидация не пройдена', () => {
    const mockData = { amount: -1000 };
    const mockValidator = vi.fn().mockReturnValue({
      isValid: false,
      errors: ['Invalid amount'],
      warnings: [],
    });

    expect(() => validateWithWarnings(mockData, mockValidator, 'Transaction'))
      .toThrow('Ошибка валидации (Transaction): Invalid amount');
  });
});
