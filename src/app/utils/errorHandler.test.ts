/**
 * Тесты для утилит обработки ошибок
 * Проверяют создание ошибок, валидацию и retry-логику
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AppErrorType,
  AppError,
  ValidationError,
  NotFoundError,
  DatabaseError,
  createErrorHandler,
  logError,
  formatErrorForUser,
  isNetworkError,
  withRetry,
} from './errorHandler';

describe('AppErrorType', () => {
  it('должен содержать правильные типы ошибок', () => {
    expect(AppErrorType.VALIDATION).toBe('VALIDATION_ERROR');
    expect(AppErrorType.NOT_FOUND).toBe('NOT_FOUND_ERROR');
    expect(AppErrorType.DATABASE).toBe('DATABASE_ERROR');
    expect(AppErrorType.NETWORK).toBe('NETWORK_ERROR');
    expect(AppErrorType.UNKNOWN).toBe('UNKNOWN_ERROR');
  });
});

describe('AppError', () => {
  describe('создание ошибки', () => {
    it('должен создавать ошибку с базовыми параметрами', () => {
      const error = new AppError('Test error');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('AppError');
      expect(error.message).toBe('Test error');
      expect(error.type).toBe(AppErrorType.UNKNOWN);
    });

    it('должен создавать ошибку с указанным типом', () => {
      const error = new AppError('Validation failed', AppErrorType.VALIDATION);
      
      expect(error.type).toBe(AppErrorType.VALIDATION);
    });

    it('должен создавать ошибку с кодом и деталями', () => {
      const error = new AppError(
        'Error',
        AppErrorType.DATABASE,
        'DB_001',
        { table: 'users' }
      );
      
      expect(error.code).toBe('DB_001');
      expect(error.details).toEqual({ table: 'users' });
    });
  });

  describe('toJSON', () => {
    it('должен сериализовать ошибку в объект', () => {
      const error = new AppError(
        'Test',
        AppErrorType.VALIDATION,
        'CODE',
        { field: 'name' }
      );
      
      expect(error.toJSON()).toEqual({
        name: 'AppError',
        message: 'Test',
        type: AppErrorType.VALIDATION,
        code: 'CODE',
        details: { field: 'name' },
      });
    });
  });
});

describe('ValidationError', () => {
  it('должен создавать ошибку валидации', () => {
    const error = new ValidationError('Invalid email');
    
    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe('ValidationError');
    expect(error.type).toBe(AppErrorType.VALIDATION);
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.message).toBe('Invalid email');
  });

  it('должен принимать детали валидации', () => {
    const error = new ValidationError('Invalid fields', {
      email: ['required'],
      name: ['too short'],
    });
    
    expect(error.details).toEqual({
      email: ['required'],
      name: ['too short'],
    });
  });
});

describe('NotFoundError', () => {
  it('должен создавать ошибку без ID', () => {
    const error = new NotFoundError('User');
    
    expect(error.name).toBe('NotFoundError');
    expect(error.type).toBe(AppErrorType.NOT_FOUND);
    expect(error.message).toBe('User не найден');
  });

  it('должен создавать ошибку с ID', () => {
    const error = new NotFoundError('Transaction', 123);
    
    expect(error.message).toBe('Transaction с ID 123 не найден');
  });

  it('должен создавать ошибку со строковым ID', () => {
    const error = new NotFoundError('Category', 'cat-123');
    
    expect(error.message).toBe('Category с ID cat-123 не найден');
  });
});

describe('DatabaseError', () => {
  it('должен создавать ошибку базы данных', () => {
    const error = new DatabaseError('Connection failed');
    
    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe('DatabaseError');
    expect(error.type).toBe(AppErrorType.DATABASE);
    expect(error.message).toBe('Connection failed');
  });

  it('должен сохранять оригинальную ошибку', () => {
    const originalError = new Error('Original');
    const error = new DatabaseError('DB failed', originalError);
    
    expect(error.details).toEqual({
      originalMessage: 'Original',
      originalStack: expect.any(String),
    });
  });
});

describe('createErrorHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('должен возвращать результат успешного promise', async () => {
    const handler = createErrorHandler<number>();
    const promise = Promise.resolve(42);
    
    const result = await handler(promise);
    
    expect(result).toBe(42);
  });

  it('должен возвращать null при ошибке', async () => {
    const handler = createErrorHandler<number>();
    const promise = Promise.reject(new Error('Failed'));
    
    const result = await handler(promise);
    
    expect(result).toBeNull();
  });

  it('должен вызывать onError колбэк', async () => {
    const onError = vi.fn();
    const handler = createErrorHandler<number>(onError);
    const promise = Promise.reject(new Error('Failed'));
    
    await handler(promise);
    
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('должен оборачивать не-AppError в DatabaseError', async () => {
    const onError = vi.fn();
    const handler = createErrorHandler(onError);
    const promise = Promise.reject(new Error('Regular error'));
    
    await handler(promise);
    
    const calledError = onError.mock.calls[0][0];
    expect(calledError).toBeInstanceOf(DatabaseError);
  });
});

describe('logError', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('должен логгировать ошибку в консоль', () => {
    const error = new Error('Test');
    logError(error, 'TestContext');
    
    expect(consoleErrorSpy).toHaveBeenCalledWith('[TestContext]', error);
  });

  it('должен использовать AppError по умолчанию', () => {
    const error = new Error('Test');
    logError(error);
    
    expect(consoleErrorSpy).toHaveBeenCalledWith('[AppError]', error);
  });

  it('должен логгировать детали AppError', () => {
    const error = new AppError('Test', AppErrorType.VALIDATION, 'CODE', {
      field: 'name',
    });
    logError(error);
    
    expect(consoleErrorSpy).toHaveBeenCalledWith('Details:', { field: 'name' });
  });
});

describe('formatErrorForUser', () => {
  it('должен форматировать ValidationError', () => {
    const error = new ValidationError('Invalid email');
    
    expect(formatErrorForUser(error)).toBe('Ошибка валидации: Invalid email');
  });

  it('должен форматировать NotFoundError', () => {
    const error = new NotFoundError('User', 123);
    
    expect(formatErrorForUser(error)).toBe('User с ID 123 не найден');
  });

  it('должен форматировать DatabaseError', () => {
    const error = new DatabaseError('DB failed');
    
    expect(formatErrorForUser(error)).toBe(
      'Ошибка базы данных. Попробуйте обновить страницу.'
    );
  });

  it('должен форматировать AppError', () => {
    const error = new AppError('Custom error');
    
    expect(formatErrorForUser(error)).toBe('Custom error');
  });

  it('должен форматировать неизвестную ошибку', () => {
    const error = new Error('Unknown');
    
    expect(formatErrorForUser(error)).toBe(
      'Произошла непредвиденная ошибка. Попробуйте позже.'
    );
  });
});

describe('isNetworkError', () => {
  it('должен возвращать true для network ошибки', () => {
    const error = new TypeError('Failed to fetch');
    
    expect(isNetworkError(error)).toBe(true);
  });

  it('должен возвращать false для обычной ошибки', () => {
    const error = new Error('Regular error');
    
    expect(isNetworkError(error)).toBe(false);
  });

  it('должен возвращать false для не-Error', () => {
    expect(isNetworkError('string')).toBe(false);
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  it('должен возвращать результат при первом успехе', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const promise = withRetry(fn);
    
    const result = await promise;
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('должен retry-ить при network ошибке', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce('success');
    
    const promise = withRetry(fn, 3, 100);
    
    // Продвигаем таймеры для retry
    await vi.advanceTimersByTimeAsync(300);
    
    const result = await promise;
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('должен бросать ошибку сразу если это не network error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Validation failed'));
    
    await expect(withRetry(fn)).rejects.toThrow('Validation failed');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('должен бросать ошибку после всех retry попыток', async () => {
    const fn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    
    const promise = withRetry(fn, 3, 100);
    const rejection = expect(promise).rejects.toThrow('Failed to fetch');
    
    // Продвигаем таймеры для всех retry (100ms + 200ms + 400ms)
    await vi.advanceTimersByTimeAsync(1000);
    
    await rejection;
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('должен использовать exponential backoff', async () => {
    const fn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    
    const promise = withRetry(fn, 3, 100);
    const settledPromise = promise.catch(() => {});
    
    // Первая retry через 100ms
    await vi.advanceTimersByTimeAsync(100);
    expect(fn).toHaveBeenCalledTimes(2);
    
    // Вторая retry через 200ms (итого 300ms)
    await vi.advanceTimersByTimeAsync(200);
    expect(fn).toHaveBeenCalledTimes(3);
    
    // Подавляем ошибку
    await settledPromise;
  });
});
