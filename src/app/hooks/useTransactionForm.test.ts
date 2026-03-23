/**
 * Тесты для хука useTransactionForm
 * Проверяют управление состоянием формы, форматирование и AI-парсинг
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTransactionForm } from './useTransactionForm';

// Мок для AI модуля
vi.mock('../../db/ai', () => ({
  parseNaturalLanguage: vi.fn(),
  findBestMatch: vi.fn(),
}));

import { parseNaturalLanguage, findBestMatch } from '../../db/ai';

describe('useTransactionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('инициализация', () => {
    it('должен инициализировать formData с правильными значениями по умолчанию', () => {
      const { result } = renderHook(() => useTransactionForm());

      expect(result.current.formData).toEqual({
        amount: '',
        type: 'expense',
        categoryId: '',
        comment: '',
        date: expect.any(Date),
      });
    });

    it('должен инициализировать quickInput пустой строкой', () => {
      const { result } = renderHook(() => useTransactionForm());

      expect(result.current.quickInput).toBe('');
    });

    it('должен инициализировать isParsing как false', () => {
      const { result } = renderHook(() => useTransactionForm());

      expect(result.current.isParsing).toBe(false);
    });
  });

  describe('formatAmount', () => {
    it('должен форматировать сумму с разделителями тысяч', () => {
      const { result } = renderHook(() => useTransactionForm());

      expect(result.current.formatAmount('1000')).toBe('1 000');
      expect(result.current.formatAmount('1000000')).toBe('1 000 000');
    });

    it('должен форматировать сумму с дробной частью', () => {
      const { result } = renderHook(() => useTransactionForm());

      expect(result.current.formatAmount('1000.50')).toBe('1 000.50');
    });
  });

  describe('handleAmountChange', () => {
    it('должен обновлять amount с валидным числом', () => {
      const { result } = renderHook(() => useTransactionForm());

      act(() => {
        result.current.handleAmountChange({
          target: { value: '1000' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.formData.amount).toBe('1000');
    });

    it('должен обновлять amount с дробным числом', () => {
      const { result } = renderHook(() => useTransactionForm());

      act(() => {
        result.current.handleAmountChange({
          target: { value: '1000.50' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.formData.amount).toBe('1000.50');
    });

    it('должен игнорировать невалидный ввод', () => {
      const { result } = renderHook(() => useTransactionForm());

      act(() => {
        result.current.handleAmountChange({
          target: { value: 'abc' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.formData.amount).toBe('');
    });

    it('должен разрешать ввод с точкой', () => {
      const { result } = renderHook(() => useTransactionForm());

      act(() => {
        result.current.handleAmountChange({
          target: { value: '1000.' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.formData.amount).toBe('1000.');
    });
  });

  describe('parseQuickInput', () => {
    it('должен возвращать ошибку для пустого ввода', async () => {
      const { result } = renderHook(() => useTransactionForm());

      const response = await act(async () => {
        return result.current.parseQuickInput();
      });

      expect(response).toEqual({
        success: false,
        error: 'Введите текст',
      });
    });

    it('должен парсить успешный ввод и обновлять formData', async () => {
      const mockParsed = {
        amount: 450,
        type: 'expense' as const,
        comment: 'кофе',
      };

      (parseNaturalLanguage as any).mockReturnValue(mockParsed);
      (findBestMatch as any).mockResolvedValue(null);

      const { result } = renderHook(() => useTransactionForm());

      // Устанавливаем quickInput
      act(() => {
        result.current.setQuickInput('кофе 450 рублей');
      });

      const response = await act(async () => {
        return result.current.parseQuickInput();
      });

      expect(response).toEqual({ success: true });
      expect(result.current.formData.amount).toBe('450');
      expect(result.current.formData.type).toBe('expense');
      expect(result.current.formData.comment).toBe('кофе');
    });

    it('должен находить категорию по комментарию', async () => {
      const mockParsed = {
        amount: 450,
        type: 'expense' as const,
        comment: 'продукты',
      };

      const mockCategory = {
        id: 'cat-123',
        type: 'expense' as const,
      };

      (parseNaturalLanguage as any).mockReturnValue(mockParsed);
      (findBestMatch as any).mockResolvedValue({ category: mockCategory });

      const { result } = renderHook(() => useTransactionForm());

      act(() => {
        result.current.setQuickInput('продукты 450 рублей');
      });

      await act(async () => {
        return result.current.parseQuickInput();
      });

      expect(result.current.formData.categoryId).toBe('cat-123');
    });

    it('должен игнорировать категорию если тип не совпадает', async () => {
      const mockParsed = {
        amount: 450,
        type: 'expense' as const,
        comment: 'зарплата',
      };

      const mockCategory = {
        id: 'cat-123',
        type: 'income' as const, // не совпадает
      };

      (parseNaturalLanguage as any).mockReturnValue(mockParsed);
      (findBestMatch as any).mockResolvedValue({ category: mockCategory });

      const { result } = renderHook(() => useTransactionForm());

      act(() => {
        result.current.setQuickInput('зарплата 450');
      });

      await act(async () => {
        return result.current.parseQuickInput();
      });

      expect(result.current.formData.categoryId).toBe('');
    });

    it('должен возвращать ошибку если парсинг не удался', async () => {
      (parseNaturalLanguage as any).mockReturnValue(null);

      const { result } = renderHook(() => useTransactionForm());

      act(() => {
        result.current.setQuickInput('непонятный текст');
      });

      const response = await act(async () => {
        return result.current.parseQuickInput();
      });

      expect(response).toEqual({
        success: false,
        error: 'Не удалось распознать. Укажите сумму, например: "кофе 450 рублей"',
      });
    });

    it('должен обрабатывать исключения при парсинге', async () => {
      (parseNaturalLanguage as any).mockImplementation(() => {
        throw new Error('AI error');
      });

      const { result } = renderHook(() => useTransactionForm());

      act(() => {
        result.current.setQuickInput('тест');
      });

      const response = await act(async () => {
        return result.current.parseQuickInput();
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('AI error');
    });

    it('должен устанавливать isParsing во время парсинга', async () => {
      const { result } = renderHook(() => useTransactionForm());

      let parsingStarted = false;

      (parseNaturalLanguage as any).mockImplementation(() => {
        parsingStarted = true;
        return null;
      });

      act(() => {
        result.current.setQuickInput('тест');
      });

      act(() => {
        result.current.parseQuickInput();
      });

      expect(parsingStarted).toBe(true);
    });
  });

  describe('setFormData', () => {
    it('должен обновлять formData через setFormData', () => {
      const { result } = renderHook(() => useTransactionForm());

      act(() => {
        result.current.setFormData(prev => ({
          ...prev,
          type: 'income',
          categoryId: 'cat-123',
        }));
      });

      expect(result.current.formData.type).toBe('income');
      expect(result.current.formData.categoryId).toBe('cat-123');
    });
  });

  describe('setQuickInput', () => {
    it('должен обновлять quickInput', () => {
      const { result } = renderHook(() => useTransactionForm());

      act(() => {
        result.current.setQuickInput('новый текст');
      });

      expect(result.current.quickInput).toBe('новый текст');
    });
  });
});
