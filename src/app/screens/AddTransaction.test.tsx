import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddTransaction } from './AddTransaction';

vi.mock('react-router', () => ({
  useNavigate: vi.fn(() => vi.fn()),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../hooks/useCategories', () => ({
  useCategories: vi.fn(),
}));

vi.mock('../hooks/useTransactions', () => ({
  useTransactions: vi.fn(),
}));

vi.mock('../hooks/useBudgetNotifications', () => ({
  useBudgetNotifications: vi.fn(),
}));

vi.mock('../hooks/useSpeechInput', () => ({
  useSpeechInput: vi.fn(),
}));

vi.mock('../hooks/useReceiptScanner', () => ({
  useReceiptScanner: vi.fn(),
}));

vi.mock('../../db/ai', () => ({
  parseNaturalLanguage: vi.fn(),
  findBestMatch: vi.fn(),
}));

import { useCategories } from '../hooks/useCategories';
import { useTransactions } from '../hooks/useTransactions';
import { useBudgetNotifications } from '../hooks/useBudgetNotifications';
import { useSpeechInput } from '../hooks/useSpeechInput';
import { useReceiptScanner } from '../hooks/useReceiptScanner';

const scannerState = {
  scan: vi.fn(),
  result: {
    amount: 450,
    merchant: 'Пятёрочка',
    date: '2026-04-22',
    confidence: 85,
    rawText: 'Пятёрочка\nИТОГО 450.00',
  },
  isLoading: false,
  error: null,
  reset: vi.fn(),
};

describe('AddTransaction receipt scanner integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useCategories as any).mockReturnValue({
      categories: [
        {
          id: 'cat_products',
          name: 'Продукты',
          type: 'expense',
          icon: 'ShoppingCart',
          color: '#22c55e',
        },
      ],
    });

    (useTransactions as any).mockReturnValue({
      add: vi.fn(),
    });

    (useBudgetNotifications as any).mockReturnValue({
      checkBudgets: vi.fn(),
    });

    (useSpeechInput as any).mockReturnValue({
      supported: false,
      state: 'idle',
      start: vi.fn(),
    });

    (useReceiptScanner as any).mockReturnValue(scannerState);
  });

  it('prefills amount, comment and date after confirming scanned receipt', async () => {
    const { container } = render(<AddTransaction />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    expect(fileInput).not.toBeNull();

    const file = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(scannerState.scan).toHaveBeenCalledWith(file);

    fireEvent.click(await screen.findByRole('button', { name: /использовать/i }));

    await waitFor(() => {
      expect(screen.getByLabelText('Сумма')).toHaveValue('450');
      expect(screen.getByLabelText('Комментарий')).toHaveValue('Пятёрочка');
      expect(screen.getByLabelText('Дата операции')).toHaveValue('2026-04-22');
    });

    expect(scannerState.reset).toHaveBeenCalled();
  });
});
