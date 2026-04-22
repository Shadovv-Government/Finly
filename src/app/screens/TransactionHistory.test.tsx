import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TransactionHistory } from './TransactionHistory';

vi.mock('../hooks/useTransactions', () => ({
  useTransactions: vi.fn(),
}));

vi.mock('../hooks/useCategories', () => ({
  useCategories: vi.fn(),
}));

vi.mock('../components/CategoryBadge', () => ({
  CategoryBadge: () => <div data-testid="category-badge" />,
}));

vi.mock('../components/AmountDisplay', () => ({
  AmountDisplay: ({ amount }: { amount: number }) => <div>{amount}</div>,
}));

vi.mock('../components/BottomSheet', () => ({
  BottomSheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';

describe('TransactionHistory swipe delete', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    (useTransactions as any).mockReturnValue({
      transactions: [
        {
          id: 1,
          amount: 1250,
          type: 'expense',
          categoryId: 'food',
          date: new Date('2026-04-22T12:00:00Z').getTime(),
          currency: 'RUB',
          rate: 1,
          comment: 'Обед',
          createdAt: Date.now(),
        },
      ],
      remove: vi.fn(),
    });

    (useCategories as any).mockReturnValue({
      categories: [
        {
          id: 'food',
          name: 'Еда',
          type: 'expense',
          color: '#ef4444',
          icon: 'UtensilsCrossed',
        },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the row after a short swipe without calling remove', () => {
    render(<TransactionHistory />);

    const row = screen.getByText('Обед').closest('[data-state]');
    const swipeTarget = row?.lastElementChild as HTMLElement | null;
    const remove = (useTransactions as any).mock.results[0].value.remove;

    expect(row).not.toBeNull();
    expect(swipeTarget).not.toBeNull();

    act(() => {
      fireEvent.touchStart(swipeTarget!, {
        touches: [{ clientX: 200, clientY: 100 }],
      });
      fireEvent.touchMove(swipeTarget!, {
        touches: [{ clientX: 150, clientY: 102 }],
      });
      fireEvent.touchEnd(swipeTarget!);
    });

    expect(row).toHaveAttribute('data-state', 'idle');
    expect(remove).not.toHaveBeenCalled();
    expect(swipeTarget).toHaveStyle({ transform: 'translateX(0px)' });
  });

  it('keeps the row mounted in deleting state before calling remove immediately', () => {
    render(<TransactionHistory />);

    const row = screen.getByText('Обед').closest('[data-state]');
    const swipeTarget = row?.lastElementChild as HTMLElement | null;
    const remove = (useTransactions as any).mock.results[0].value.remove;

    expect(row).not.toBeNull();
    expect(swipeTarget).not.toBeNull();

    act(() => {
      fireEvent.touchStart(swipeTarget!, {
        touches: [{ clientX: 200, clientY: 100 }],
      });
      fireEvent.touchMove(swipeTarget!, {
        touches: [{ clientX: 80, clientY: 102 }],
      });
      fireEvent.touchEnd(swipeTarget!);
    });

    expect(row).toHaveAttribute('data-state', 'deleting');
    expect(remove).not.toHaveBeenCalled();
  });

  it('ignores vertical gestures so scrolling does not trigger delete', () => {
    render(<TransactionHistory />);

    const row = screen.getByText('Обед').closest('[data-state]');
    const swipeTarget = row?.lastElementChild as HTMLElement | null;
    const remove = (useTransactions as any).mock.results[0].value.remove;

    expect(row).not.toBeNull();
    expect(swipeTarget).not.toBeNull();

    act(() => {
      fireEvent.touchStart(swipeTarget!, {
        touches: [{ clientX: 200, clientY: 100 }],
      });
      fireEvent.touchMove(swipeTarget!, {
        touches: [{ clientX: 188, clientY: 20 }],
      });
      fireEvent.touchEnd(swipeTarget!);
    });

    expect(row).toHaveAttribute('data-state', 'idle');
    expect(remove).not.toHaveBeenCalled();
    expect(swipeTarget).not.toHaveStyle({ transform: 'translateX(-12px)' });
  });
});
