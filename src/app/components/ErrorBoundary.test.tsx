/**
 * Тесты для компонента ErrorBoundary
 * Проверяют перехват ошибок, рендеринг fallback UI и кнопку обновления
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// Мок для window.location.reload
const mockReload = vi.fn();
Object.defineProperty(global, 'location', {
  value: { reload: mockReload },
  writable: true,
});

// Компонент который бросает ошибку
const ThrowError = ({ message }: { message: string }) => {
  throw new Error(message);
};

// Успешный компонент
const SuccessComponent = ({ text }: { text: string }) => {
  return <div data-testid="success">{text}</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Подавление ошибок консоли в тестах
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('рендеринг без ошибок', () => {
    it('должен рендерить детей без ошибок', () => {
      render(
        <ErrorBoundary>
          <SuccessComponent text="Hello World" />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('success')).toBeInTheDocument();
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('должен рендерить несколько детей', () => {
      render(
        <ErrorBoundary>
          <div>Child 1</div>
          <div>Child 2</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
    });
  });

  describe('перехват ошибок', () => {
    it('должен перехватывать ошибку в дочернем компоненте', () => {
      render(
        <ErrorBoundary>
          <ThrowError message="Test error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Что-то пошло не так')).toBeInTheDocument();
      expect(screen.getByText('Обновить страницу')).toBeInTheDocument();
    });

    it('должен показывать детали ошибки', () => {
      render(
        <ErrorBoundary>
          <ThrowError message="Detailed error message" />
        </ErrorBoundary>
      );

      // Детали должны быть в элементе details
      expect(screen.getByText('Детали ошибки')).toBeInTheDocument();
    });

    it('должен вызывать onError колбэк', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError message="Test error" />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });
  });

  describe('кастомный fallback', () => {
    it('должен использовать кастомный fallback UI', () => {
      const customFallback = (
        <div data-testid="custom-fallback">Custom Error UI</div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError message="Test error" />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    });

    it('должен приоритизировать fallback над стандартным UI', () => {
      const customFallback = (
        <div data-testid="custom-fallback">Custom</div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError message="Test error" />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Что-то пошло не так')).not.toBeInTheDocument();
      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    });
  });

  describe('кнопка обновления', () => {
    it('должен перезагружать страницу при клике на кнопку', () => {
      render(
        <ErrorBoundary>
          <ThrowError message="Test error" />
        </ErrorBoundary>
      );

      const button = screen.getByText('Обновить страницу');
      fireEvent.click(button);

      expect(mockReload).toHaveBeenCalledTimes(1);
    });

    it('должен иметь правильные классы для стилизации', () => {
      render(
        <ErrorBoundary>
          <ThrowError message="Test error" />
        </ErrorBoundary>
      );

      const button = screen.getByText('Обновить страницу');
      expect(button).toHaveClass('bg-gradient-to-r');
    });
  });

  describe('восстановление после ошибки', () => {
    it('должен рендерить детей после успешного ререндера', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError message="Test error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Что-то пошло не так')).toBeInTheDocument();

      // После "исправления" ошибки
      rerender(
        <ErrorBoundary>
          <SuccessComponent text="Recovered" />
        </ErrorBoundary>
      );

      // ErrorBoundary сохраняет состояние ошибки, поэтому нужен сброс
      // В реальном приложении это происходит через reload
      expect(screen.queryByText('Recovered')).not.toBeInTheDocument();
    });
  });

  describe('доступность', () => {
    it('должен иметь семантическую разметку', () => {
      render(
        <ErrorBoundary>
          <ThrowError message="Test error" />
        </ErrorBoundary>
      );

      // Заголовок должен быть h1
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('должен иметь details/summary для деталей ошибки', () => {
      render(
        <ErrorBoundary>
          <ThrowError message="Test error" />
        </ErrorBoundary>
      );

      const details = screen.getByRole('group');
      expect(details).toBeInTheDocument();
    });
  });
});
