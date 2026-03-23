import { useState, useCallback } from 'react';
import { TransactionType } from '../../db/types';
import { parseNaturalLanguage, findBestMatch } from '../../db/ai';
import { formatAmountInput, parseAmountInput } from '../utils/formatCurrency';

export interface TransactionFormData {
  amount: string;
  type: TransactionType;
  categoryId: string;
  comment: string;
  date: Date;
}

export interface UseTransactionFormReturn {
  formData: TransactionFormData;
  setFormData: React.Dispatch<React.SetStateAction<TransactionFormData>>;
  quickInput: string;
  setQuickInput: (value: string) => void;
  isParsing: boolean;
  parseQuickInput: () => Promise<{ success: boolean; error?: string }>;
  formatAmount: (value: string) => string;
  parseAmountInput: (value: string) => string;
  handleAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Хук для управления формой добавления транзакции
 * Выносит бизнес-логику из UI-компонента AddTransactionForm
 */
export function useTransactionForm(): UseTransactionFormReturn {
  const [formData, setFormData] = useState<TransactionFormData>({
    amount: '',
    type: 'expense',
    categoryId: '',
    comment: '',
    date: new Date(),
  });

  const [quickInput, setQuickInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  // Форматирование суммы с разделителями тысяч
  const formatAmount = useCallback((value: string): string => {
    return formatAmountInput(value);
  }, []);

  // Удаление форматирования для хранения
  const parseAmountValue = useCallback((value: string): string => {
    return parseAmountInput(value);
  }, []);

  // Обработчик изменения суммы
  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const parsed = parseAmountValue(value);
      if (/^\d*\.?\d*$/.test(parsed)) {
        setFormData(prev => ({ ...prev, amount: parsed }));
      }
    },
    [parseAmountValue]
  );

  // Обработка быстрого ввода (AI-парсинг)
  const parseQuickInput = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!quickInput.trim()) {
      return { success: false, error: 'Введите текст' };
    }

    setIsParsing(true);
    try {
      const parsed = parseNaturalLanguage(quickInput);
      
      if (parsed) {
        // Обновляем форму распознанными данными
        setFormData(prev => ({
          ...prev,
          amount: parsed.amount > 0 ? parsed.amount.toString() : prev.amount,
          type: parsed.type,
          comment: parsed.comment || prev.comment,
        }));

        // Пытаемся найти категорию по комментарию
        if (parsed.comment) {
          const match = await findBestMatch(parsed.comment);
          if (match && match.category.type === parsed.type) {
            setFormData(prev => ({ ...prev, categoryId: match.category.id }));
          }
        }

        return { success: true };
      }

      return { success: false, error: 'Не удалось распознать. Укажите сумму, например: "кофе 450 рублей"' };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Ошибка при обработке' 
      };
    } finally {
      setIsParsing(false);
    }
  }, [quickInput]);

  return {
    formData,
    setFormData,
    quickInput,
    setQuickInput,
    isParsing,
    parseQuickInput,
    formatAmount,
    parseAmountInput,
    handleAmountChange,
  };
}
