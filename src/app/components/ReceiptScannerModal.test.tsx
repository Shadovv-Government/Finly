import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReceiptScannerModal } from './ReceiptScannerModal';
import type { ReceiptData, ReceiptScanError } from '../hooks/useReceiptScanner';

const mockFile = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' });

const mockResult: ReceiptData = {
  amount: 450,
  merchant: 'Пятёрочка',
  date: '2026-04-22',
  confidence: 85,
  rawText: 'Пятёрочка\nИТОГО 450.00',
};

describe('ReceiptScannerModal', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:receipt-preview'),
      revokeObjectURL: vi.fn(),
    });
  });

  it('shows spinner while loading', () => {
    render(
      <ReceiptScannerModal
        file={mockFile}
        result={null}
        isLoading={true}
        error={null}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Распознаю чек...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /использовать/i })).toBeNull();
  });

  it('shows editable fields with parsed values on success', () => {
    render(
      <ReceiptScannerModal
        file={mockFile}
        result={mockResult}
        isLoading={false}
        error={null}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue('450')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Пятёрочка')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-04-22')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /использовать/i })).toBeInTheDocument();
  });

  it('shows low confidence warning when error is low_confidence', () => {
    render(
      <ReceiptScannerModal
        file={mockFile}
        result={mockResult}
        isLoading={false}
        error={'low_confidence' as ReceiptScanError}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/низкой точностью/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /использовать/i })).toBeInTheDocument();
  });

  it('calls onConfirm with edited data when user changes amount', () => {
    const onConfirm = vi.fn();

    render(
      <ReceiptScannerModal
        file={mockFile}
        result={mockResult}
        isLoading={false}
        error={null}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByDisplayValue('450'), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: /использовать/i }));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 500 })
    );
  });

  it('calls onClose when cancel is clicked', () => {
    const onClose = vi.fn();

    render(
      <ReceiptScannerModal
        file={mockFile}
        result={mockResult}
        isLoading={false}
        error={null}
        onConfirm={vi.fn()}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /отмена/i }));

    expect(onClose).toHaveBeenCalled();
  });
});
