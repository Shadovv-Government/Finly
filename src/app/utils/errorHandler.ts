/**
 * Утилиты для обработки ошибок
 * Централизованная обработка и логирование ошибок
 */

/**
 * Типы ошибок приложения
 */
export enum AppErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  DATABASE = 'DATABASE_ERROR',
  NETWORK = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

/**
 * Базовый класс ошибки приложения
 */
export class AppError extends Error {
  public readonly type: AppErrorType;
  public readonly code?: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    type: AppErrorType = AppErrorType.UNKNOWN,
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.code = code;
    this.details = details;
  }

  /**
   * Конвертирует в простой объект для сериализации
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      code: this.code,
      details: this.details,
    };
  }
}

/**
 * Ошибка валидации
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, string[]>) {
    super(message, AppErrorType.VALIDATION, 'VALIDATION_FAILED', details);
    this.name = 'ValidationError';
  }
}

/**
 * Ошибка "не найдено"
 */
export class NotFoundError extends AppError {
  constructor(entity: string, id?: string | number) {
    const message = id 
      ? `${entity} с ID ${id} не найден`
      : `${entity} не найден`;
    super(message, AppErrorType.NOT_FOUND, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Ошибка базы данных
 */
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, AppErrorType.DATABASE, 'DATABASE_ERROR', {
      originalMessage: originalError?.message,
      originalStack: originalError?.stack,
    });
    this.name = 'DatabaseError';
  }
}

/**
 * Создаёт обработчик ошибок для async операций
 * @param onError - колбэк для обработки ошибки
 * @returns Функция-обёртка для обработки Promise
 */
export function createErrorHandler<T>(
  onError?: (error: Error) => void
): (promise: Promise<T>) => Promise<T | null> {
  return async (promise: Promise<T>): Promise<T | null> => {
    try {
      return await promise;
    } catch (error) {
      const appError = error instanceof AppError 
        ? error 
        : error instanceof Error 
          ? new DatabaseError(error.message, error)
          : new AppError('Неизвестная ошибка');
      
      onError?.(appError);
      return null;
    }
  };
}

/**
 * Логгирует ошибку в консоль (для разработки)
 */
export function logError(error: Error, context?: string): void {
  console.error(`[${context || 'AppError'}]`, error);
  
  if (error instanceof AppError && error.details) {
    console.error('Details:', error.details);
  }
}

/**
 * Форматирует ошибку для отображения пользователю
 */
export function formatErrorForUser(error: Error): string {
  if (error instanceof ValidationError) {
    return `Ошибка валидации: ${error.message}`;
  }
  
  if (error instanceof NotFoundError) {
    return error.message;
  }
  
  if (error instanceof DatabaseError) {
    return 'Ошибка базы данных. Попробуйте обновить страницу.';
  }
  
  if (error instanceof AppError) {
    return error.message;
  }
  
  return 'Произошла непредвиденная ошибка. Попробуйте позже.';
}

/**
 * Проверяет, является ли ошибка ошибкой сети
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return error.message.includes('network') || 
           error.message.includes('fetch') ||
           error.message.includes('Failed to fetch');
  }
  return false;
}

/**
 * Retry-логика для операций
 * @param fn - функция для выполнения
 * @param retries - количество попыток
 * @param delay - задержка между попытками (мс)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Если это не network error, не retry-им
      if (!isNetworkError(lastError)) {
        throw lastError;
      }
      
      // Ждём перед следующей попыткой (exponential backoff)
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError!;
}
