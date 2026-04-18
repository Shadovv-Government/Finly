// src/app/utils/recurringProcessor.ts
// Автообработка повторяющихся платежей при старте приложения

import { processDueTemplates } from '../../db/recurring';
import { logError } from './errorHandler';

const LAST_PROCESSED_KEY = 'recurringLastProcessed';

/**
 * Обрабатывает просроченные шаблоны, если с последней обработки прошло > 1 часа
 */
export async function processRecurringIfNeeded(): Promise<void> {
  try {
    const now = Date.now();
    const lastProcessed = localStorage.getItem(LAST_PROCESSED_KEY);
    const minInterval = 60 * 60 * 1000; // 1 час

    if (lastProcessed) {
      const elapsed = now - parseInt(lastProcessed, 10);
      if (elapsed < minInterval) {
        return; // Слишком часто не вызываем
      }
    }

    const result = await processDueTemplates();

    localStorage.setItem(LAST_PROCESSED_KEY, now.toString());

    if (result.errors.length > 0) {
      for (const err of result.errors) {
        logError(
          new Error(`Recurring template ${err.templateId}: ${err.error}`),
          'recurringProcessor.processRecurringIfNeeded'
        );
      }
    }
  } catch (error) {
    logError(
      error instanceof Error ? error : new Error('Unknown recurring processor error'),
      'recurringProcessor.processRecurringIfNeeded'
    );
  }
}
