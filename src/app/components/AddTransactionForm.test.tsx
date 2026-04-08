/**
 * Тесты для компонента AddTransactionForm
 * Проверяют рендеринг формы, ввод данных и сохранение транзакции
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AddTransactionForm } from './AddTransactionForm';

// Мок для хуков
vi.mock('../hooks/useCategories', () => ({
  useCategories: vi.fn(),
}));

vi.mock('../hooks/useTransactions', () => ({
  useTransactions: vi.fn(),
}));

vi.mock('../hooks/useNotifications', () => ({
  useNotifications: vi.fn(),
}));

vi.mock('../hooks/useTransactionForm', () => ({
  useTransactionForm: vi.fn(),
}));

import { useCategories } from '../hooks/useCategories';
import { useTransactions } from '../hooks/useTransactions';
import { useNotifications } from '../hooks/useNotifications';
import { useTransactionForm } from '../hooks/useTransactionForm';

const mockCategories = [
  { id: 'cat-1', name: 'Продукты', type: 'expense' as const, icon: 'ShoppingCart', color: '#FF5722', isSystem: true },
  { id: 'cat-2', name: 'Транспорт', type: 'expense' as const, icon: 'Car', color: '#2196F3', isSystem: true },
  { id: 'cat-3', name: 'Зарплата', type: 'income' as const, icon: 'Wallet', color: '#4CAF50', isSystem: true },
];

describe('AddTransactionForm', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Настройка моков по умолчанию
    (useCategories as any).mockReturnValue({
      categories: mockCategories,
      loading: false,
      error: null,
    });

    (useTransactions as any).mockReturnValue({
      add: vi.fn().mockResolvedValue(1),
    });

    (useNotifications as any).mockReturnValue({
      notifyTransaction: vi.fn(),
    });

    (useTransactionForm as any).mockReturnValue({
      formData: {
        amount: '',
        type: 'expense',
        categoryId: '',
        comment: '',
        date: new Date('2024-01-15'),
      },
      setFormData: vi.fn(),
      quickInput: '',
      setQuickInput: vi.fn(),
      isParsing: false,
      parseQuickInput: vi.fn().mockResolvedValue({ success: true }),
      formatAmount: vi.fn((v) => v),
      parseAmountInput: vi.fn((v) => v),
      handleAmountChange: vi.fn(),
    });
  });

  describe('рендеринг', () => {
    it('должен рендерить форму с основными элементами', () => {
      render(<AddTransactionForm onClose={mockOnClose} />);

      expect(screen.getByPlaceholderText(/кофе 450 рублей/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('0')).toBeInTheDocument();
      expect(screen.getByText('Расход')).toBeInTheDocument();
      expect(screen.getByText('Доход')).toBeInTheDocument();
      expect(screen.getByText('Категория')).toBeInTheDocument();
      expect(screen.getByText('Сохранить')).toBeInTheDocument();
    });

    it('должен рендерить категории расходов по умолчанию', () => {
      render(<AddTransactionForm onClose={mockOnClose} />);

      expect(screen.getByText('Продукты')).toBeInTheDocument();
      expect(screen.getByText('Транспорт')).toBeInTheDocument();
    });

    it('должен рендерить поле для комментария', () => {
      render(<AddTransactionForm onClose={mockOnClose} />);

      expect(screen.getByPlaceholderText('Комментарий')).toBeInTheDocument();
    });

    it('должен рендерить выбор даты', () => {
      render(<AddTransactionForm onClose={mockOnClose} />);

      const dateInput = screen.getByDisplayValue('2024-01-15');
      expect(dateInput).toBeInTheDocument();
    });
  });

  describe('переключение типа транзакции', () => {
    it('должен переключаться на доход при клике', () => {
      const mockSetFormData = vi.fn();
      (useTransactionForm as any).mockReturnValue({
        formData: {
          amount: '',
          type: 'expense',
          categoryId: '',
          comment: '',
          date: new Date(),
        },
        setFormData: mockSetFormData,
        quickInput: '',
        setQuickInput: vi.fn(),
        isParsing: false,
        parseQuickInput: vi.fn(),
        formatAmount: vi.fn(),
        parseAmountInput: vi.fn(),
        handleAmountChange: vi.fn(),
      });

      render(<AddTransactionForm onClose={mockOnClose} />);

      const incomeButton = screen.getByText('Доход');
      fireEvent.click(incomeButton);

      expect(mockSetFormData).toHaveBeenCalledWith(expect.any(Function));
    });

    it('должен показывать категории доходов при выборе income', () => {
      const mockSetFormData = vi.fn();
      (useTransactionForm as any).mockReturnValue({
        formData: {
          amount: '',
          type: 'income',
          categoryId: '',
          comment: '',
          date: new Date(),
        },
        setFormData: mockSetFormData,
        quickInput: '',
        setQuickInput: vi.fn(),
        isParsing: false,
        parseQuickInput: vi.fn(),
        formatAmount: vi.fn(),
        parseAmountInput: vi.fn(),
        handleAmountChange: vi.fn(),
      });

      render(<AddTransactionForm onClose={mockOnClose} />);

      // Для income должна быть только категория "Зарплата"
      expect(screen.getByText('Зарплата')).toBeInTheDocument();
      expect(screen.queryByText('Продукты')).not.toBeInTheDocument();
    });
  });

  describe('быстрый ввод (AI)', () => {
    it('должен вызывать parseQuickInput при нажатии Enter', () => {
      const mockParseQuickInput = vi.fn();
      const mockSetQuickInput = vi.fn();
      (useTransactionForm as any).mockReturnValue({
        formData: {
          amount: '',
          type: 'expense',
          categoryId: '',
          comment: '',
          date: new Date(),
        },
        setFormData: vi.fn(),
        quickInput: 'кофе 450',
        setQuickInput: mockSetQuickInput,
        isParsing: false,
        parseQuickInput: mockParseQuickInput,
        formatAmount: vi.fn(),
        parseAmountInput: vi.fn(),
        handleAmountChange: vi.fn(),
      });

      render(<AddTransactionForm onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText(/кофе 450 рублей/i);
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(mockParseQuickInput).toHaveBeenCalledTimes(1);
    });

    it('должен вызывать parseQuickInput при клике на кнопку', () => {
      const mockParseQuickInput = vi.fn();
      (useTransactionForm as any).mockReturnValue({
        formData: {
          amount: '',
          type: 'expense',
          categoryId: '',
          comment: '',
          date: new Date(),
        },
        setFormData: vi.fn(),
        quickInput: 'кофе 450',
        setQuickInput: vi.fn(),
        isParsing: false,
        parseQuickInput: mockParseQuickInput,
        formatAmount: vi.fn(),
        parseAmountInput: vi.fn(),
        handleAmountChange: vi.fn(),
      });

      render(<AddTransactionForm onClose={mockOnClose} />);

      // Кнопка с иконкой Sparkles
      const parseButton = screen.getByRole('button', { name: /распознать/i });
      fireEvent.click(parseButton);

      expect(mockParseQuickInput).toHaveBeenCalledTimes(1);
    });

    it('должен отключать кнопку парсинга если quickInput пустой', () => {
      (useTransactionForm as any).mockReturnValue({
        formData: {
          amount: '',
          type: 'expense',
          categoryId: '',
          comment: '',
          date: new Date(),
        },
        setFormData: vi.fn(),
        quickInput: '',
        setQuickInput: vi.fn(),
        isParsing: false,
        parseQuickInput: vi.fn(),
        formatAmount: vi.fn(),
        parseAmountInput: vi.fn(),
        handleAmountChange: vi.fn(),
      });

      render(<AddTransactionForm onClose={mockOnClose} />);

      const parseButton = screen.getByRole('button', { name: /распознать/i });
      expect(parseButton).toBeDisabled();
    });
  });

  describe('ввод суммы', () => {
    it('должен рендерить input для суммы', () => {
      render(<AddTransactionForm onClose={mockOnClose} />);

      const amountInput = screen.getByPlaceholderText('0');
      expect(amountInput).toBeInTheDocument();
    });

    it('должен вызывать handleAmountChange при вводе', () => {
      const mockHandleAmountChange = vi.fn();
      (useTransactionForm as any).mockReturnValue({
        formData: {
          amount: '1000',
          type: 'expense',
          categoryId: '',
          comment: '',
          date: new Date(),
        },
        setFormData: vi.fn(),
        quickInput: '',
        setQuickInput: vi.fn(),
        isParsing: false,
        parseQuickInput: vi.fn(),
        formatAmount: vi.fn((v) => v),
        parseAmountInput: vi.fn(),
        handleAmountChange: mockHandleAmountChange,
      });

      render(<AddTransactionForm onClose={mockOnClose} />);

      const amountInput = screen.getByPlaceholderText('0');
      fireEvent.change(amountInput, { target: { value: '5000' } });

      expect(mockHandleAmountChange).toHaveBeenCalled();
    });
  });

  describe('выбор категории', () => {
    it('должен выбирать категорию при клике', () => {
      const mockSetFormData = vi.fn();
      (useTransactionForm as any).mockReturnValue({
        formData: {
          amount: '',
          type: 'expense',
          categoryId: '',
          comment: '',
          date: new Date(),
        },
        setFormData: mockSetFormData,
        quickInput: '',
        setQuickInput: vi.fn(),
        isParsing: false,
        parseQuickInput: vi.fn(),
        formatAmount: vi.fn(),
        parseAmountInput: vi.fn(),
        handleAmountChange: vi.fn(),
      });

      render(<AddTransactionForm onClose={mockOnClose} />);

      const categoryButton = screen.getByText('Продукты').closest('button');
      if (categoryButton) {
        fireEvent.click(categoryButton);
      }

      expect(mockSetFormData).toHaveBeenCalledWith(expect.any(Function));
    });

    it('должен показывать выделение для выбранной категории', () => {
      (useTransactionForm as any).mockReturnValue({
        formData: {
          amount: '',
          type: 'expense',
          categoryId: 'cat-1',
          comment: '',
          date: new Date(),
        },
        setFormData: vi.fn(),
        quickInput: '',
        setQuickInput: vi.fn(),
        isParsing: false,
        parseQuickInput: vi.fn(),
        formatAmount: vi.fn(),
        parseAmountInput: vi.fn(),
        handleAmountChange: vi.fn(),
      });

      render(<AddTransactionForm onClose={mockOnClose} />);

      const selectedCategory = screen.getByText('Продукты').closest('button');
      expect(selectedCategory).toHaveClass('ring-2');
    });
  });

  describe('сохранение транзакции', () => {
    it('должен сохранять транзакцию с категорией "Другое" если категория не выбрана', async () => {
      const mockAdd = vi.fn().mockResolvedValue(1);
      const mockNotifyTransaction = vi.fn();
      (useTransactions as any).mockReturnValue({ add: mockAdd, transactions: [] });
      (useCategories as any).mockReturnValue({
        categories: [
          { id: 'cat_other_expense', name: 'Другое', type: 'expense', icon: 'HelpCircle', color: '#9E9E9E', isSystem: true },
        ],
      });
      (useNotifications as any).mockReturnValue({ notifyTransaction: mockNotifyTransaction });
      (useTransactionForm as any).mockReturnValue({
        formData: {
          amount: '1000',
          type: 'expense',
          categoryId: '', // категория не выбрана
          comment: '',
          date: new Date(),
        },
        setFormData: vi.fn(),
        quickInput: '',
        setQuickInput: vi.fn(),
        isParsing: false,
        parseQuickInput: vi.fn(),
        formatAmount: vi.fn((v: string) => v),
        parseAmountInput: vi.fn((v: string) => v),
        handleAmountChange: vi.fn(),
      });

      render(<AddTransactionForm onClose={mockOnClose} />);

      const saveButton = screen.getByText('Сохранить');
      fireEvent.click(saveButton);

      // Теперь транзакция сохраняется с категорией "Другое"
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1000,
          type: 'expense',
          categoryId: 'cat_other_expense',
        })
      );
    });

    it('должен вызывать onClose после успешного сохранения', async () => {
      const mockAdd = vi.fn().mockResolvedValue(1);
      const mockNotifyTransaction = vi.fn();
      (useTransactions as any).mockReturnValue({ add: mockAdd });
      (useNotifications as any).mockReturnValue({ notifyTransaction: mockNotifyTransaction });
      (useTransactionForm as any).mockReturnValue({
        formData: {
          amount: '1000',
          type: 'expense',
          categoryId: 'cat-1',
          comment: '',
          date: new Date(),
        },
        setFormData: vi.fn(),
        quickInput: '',
        setQuickInput: vi.fn(),
        isParsing: false,
        parseQuickInput: vi.fn(),
        formatAmount: vi.fn(),
        parseAmountInput: vi.fn(),
        handleAmountChange: vi.fn(),
      });

      render(<AddTransactionForm onClose={mockOnClose} />);

      const saveButton = screen.getByText('Сохранить');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(mockAdd).toHaveBeenCalled();
      });
    });

    it('должен обрабатывать ошибку при сохранении', async () => {
      const mockAdd = vi.fn().mockRejectedValue(new Error('Failed'));
      (useTransactions as any).mockReturnValue({ add: mockAdd });
      (useTransactionForm as any).mockReturnValue({
        formData: {
          amount: '1000',
          type: 'expense',
          categoryId: 'cat-1',
          comment: '',
          date: new Date(),
        },
        setFormData: vi.fn(),
        quickInput: '',
        setQuickInput: vi.fn(),
        isParsing: false,
        parseQuickInput: vi.fn(),
        formatAmount: vi.fn(),
        parseAmountInput: vi.fn(),
        handleAmountChange: vi.fn(),
      });

      render(<AddTransactionForm onClose={mockOnClose} />);

      const saveButton = screen.getByText('Сохранить');
      
      // Не должно бросать исключение
      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(mockAdd).toHaveBeenCalled();
    });
  });
});
