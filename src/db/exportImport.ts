// src/db/exportImport.ts
// Экспорт и импорт данных для переноса и резервного копирования

import { db } from './db';
import {
  Transaction,
  Category,
  Budget,
  Goal,
  RecurringTemplate,
  AIPattern,
} from './types';
import {
  validateTransaction,
  validateCategory,
  validateBudget,
  validateGoal,
  validateRecurringTemplate,
  validateAIPattern,
} from './validators';

// Строго типизированные настройки
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  baseCurrency: string;
  onboardingComplete: boolean;
}

// Тип для ключа настройки
export type SettingKey = keyof AppSettings;

// Тип для значения настройки
export type SettingValue = AppSettings[SettingKey];

export interface ExportData {
  version: string;
  exportedAt: number;
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  goals: Goal[];
  recurringTemplates: RecurringTemplate[];
  settings: Array<{ key: string; value: SettingValue | unknown }>;
  aiPatterns: AIPattern[];
}

export interface ImportResult {
  success: boolean;
  imported: {
    transactions: number;
    categories: number;
    budgets: number;
    goals: number;
    recurringTemplates: number;
    settings: number;
    aiPatterns: number;
  };
  errors: string[];
  warnings: string[];
}

// Ключи биометрии не экспортируются — они привязаны к конкретному устройству
const BIOMETRIC_SETTING_KEYS = new Set([
  'biometric_enabled',
  'biometric_credential_id',
  'biometric_last_active',
]);

// Разрешённые ключи настроек при импорте
const ALLOWED_SETTING_KEYS = new Set<string>([
  'theme',
  'baseCurrency',
  'onboardingComplete',
]);
const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_RECORDS = 10000;
const SUPPORTED_VERSION = '1.0';

function createEmptyImportedCounts(): ImportResult['imported'] {
  return {
    transactions: 0,
    categories: 0,
    budgets: 0,
    goals: 0,
    recurringTemplates: 0,
    settings: 0,
    aiPatterns: 0,
  };
}

function shouldEscapeCSVFormula(value: string): boolean {
  return /^[=+\-@\t\r]/.test(value);
}

function toCSVCell(value: unknown): string {
  const text = String(value ?? '');
  const safeText = shouldEscapeCSVFormula(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

function countImportRecords(data: ExportData): number {
  return (
    (data.transactions?.length ?? 0) +
    (data.categories?.length ?? 0) +
    (data.budgets?.length ?? 0) +
    (data.goals?.length ?? 0) +
    (data.recurringTemplates?.length ?? 0) +
    (data.settings?.length ?? 0) +
    (data.aiPatterns?.length ?? 0)
  );
}

// ==================== Export ====================

/**
 * Экспортирует все данные базы в JSON-формат
 */
export async function exportData(): Promise<ExportData> {
  const [
    transactions,
    categories,
    budgets,
    goals,
    recurringTemplates,
    settings,
    aiPatterns,
  ] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
    db.budgets.toArray(),
    db.goals.toArray(),
    db.recurringTemplates.toArray(),
    db.settings.toArray(),
    db.aiPatterns.toArray(),
  ]);

  return {
    version: SUPPORTED_VERSION,
    exportedAt: Date.now(),
    transactions,
    categories,
    budgets,
    goals,
    recurringTemplates,
    settings: settings.filter(s => !BIOMETRIC_SETTING_KEYS.has(s.key)),
    aiPatterns,
  };
}

/**
 * Экспортирует данные в JSON-файл для скачивания
 */
export async function exportToFile(filename: string = 'finly-export.json'): Promise<void> {
  const data = await exportData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Экспортирует транзакции в CSV-формат
 */
export async function exportToCSV(): Promise<string> {
  const transactions = await db.transactions.toArray();
  const categories = await db.categories.toArray();
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  const headers = [
    'ID',
    'Date',
    'Type',
    'Category',
    'Amount',
    'Currency',
    'Rate',
    'Comment',
  ];

  const rows = transactions.map(t => {
    const category = t.categoryId ? (categoryMap.get(t.categoryId) || 'Unknown') : 'Без категории';
    return [
      t.id,
      toCSVCell(new Date(t.date).toISOString()),
      toCSVCell(t.type),
      toCSVCell(category),
      t.amount,
      toCSVCell(t.currency),
      t.rate,
      toCSVCell(t.comment || ''),
    ];
  });

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Экспортирует транзакции в CSV-файл
 */
export async function exportCSVToFile(filename: string = 'finly-transactions.csv'): Promise<void> {
  const csv = await exportToCSV();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==================== Import ====================

/**
 * Импортирует данные из JSON-объекта
 */
export async function importData(
  data: ExportData,
  options: {
    mergeCategories?: boolean;
    mergeSettings?: boolean;
  } = {}
): Promise<ImportResult> {
  const {
    mergeCategories = true,
    mergeSettings = true,
  } = options;

  const result: ImportResult = {
    success: true,
    imported: createEmptyImportedCounts(),
    errors: [],
    warnings: [],
  };

  if (countImportRecords(data) > MAX_IMPORT_RECORDS) {
    return {
      success: false,
      imported: createEmptyImportedCounts(),
      errors: [`Импорт превышает максимальное количество записей (${MAX_IMPORT_RECORDS})`],
      warnings: [],
    };
  }

  // Проверка версии схемы
  if (!data.version) {
    result.warnings.push('Версия файла не указана. Возможна несовместимость данных.');
  } else if (data.version !== SUPPORTED_VERSION) {
    result.warnings.push(`Версия файла (${data.version}) не поддерживается. Ожидается ${SUPPORTED_VERSION}. Данные могут быть некорректны.`);
  }

  try {
    await db.transaction(
      'rw',
      [
        db.categories,
        db.transactions,
        db.budgets,
        db.goals,
        db.recurringTemplates,
        db.settings,
        db.aiPatterns,
      ],
      async () => {
        // Импортируем категории первыми (нужны для транзакций)
        if (data.categories?.length) {
          const existingCategories = await db.categories.toArray();
          const existingIds = new Set(existingCategories.map(c => c.id));

          for (const category of data.categories) {
            try {
              const validation = validateCategory(category as Partial<Category>);
              if (!validation.isValid) {
                result.errors.push(`Некорректная категория "${category.name}": ${validation.errors.join('; ')}`);
                continue;
              }

              if (existingIds.has(category.id) && !mergeCategories) {
                result.warnings.push(`Категория "${category.name}" уже существует, пропущена`);
                continue;
              }

              if (existingIds.has(category.id)) {
                await db.categories.update(category.id, category);
              } else {
                await db.categories.put(category);
              }
              result.imported.categories++;
            } catch (error) {
              result.errors.push(`Ошибка импорта категории "${category.name}": ${error}`);
            }
          }
        }

        if (data.transactions?.length) {
          for (const transaction of data.transactions) {
            try {
              const validation = validateTransaction(transaction as Partial<Transaction>);
              if (!validation.isValid) {
                result.errors.push(`Некорректная операция: ${validation.errors.join('; ')}`);
                continue;
              }

              if (transaction.categoryId) {
                const category = await db.categories.get(transaction.categoryId);
                if (!category) {
                  result.warnings.push(
                    `Операция пропущена: категория "${transaction.categoryId}" не найдена`
                  );
                  continue;
                }
              }

              await db.transactions.put(transaction);
              result.imported.transactions++;
            } catch (error) {
              result.errors.push(`Ошибка импорта операции: ${error}`);
            }
          }
        }

        if (data.budgets?.length) {
          for (const budget of data.budgets) {
            try {
              const validation = validateBudget(budget as Partial<Budget>);
              if (!validation.isValid) {
                result.errors.push(`Некорректный бюджет: ${validation.errors.join('; ')}`);
                continue;
              }
              await db.budgets.put(budget);
              result.imported.budgets++;
            } catch (error) {
              result.errors.push(`Ошибка импорта бюджета: ${error}`);
            }
          }
        }

        if (data.goals?.length) {
          for (const goal of data.goals) {
            try {
              const validation = validateGoal(goal as Partial<Goal>);
              if (!validation.isValid) {
                result.errors.push(`Некорректная цель: ${validation.errors.join('; ')}`);
                continue;
              }
              await db.goals.put(goal);
              result.imported.goals++;
            } catch (error) {
              result.errors.push(`Ошибка импорта цели: ${error}`);
            }
          }
        }

        if (data.recurringTemplates?.length) {
          for (const template of data.recurringTemplates) {
            try {
              const validation = validateRecurringTemplate(template as Partial<RecurringTemplate>);
              if (!validation.isValid) {
                result.errors.push(`Некорректный регулярный платёж: ${validation.errors.join('; ')}`);
                continue;
              }
              await db.recurringTemplates.put(template);
              result.imported.recurringTemplates++;
            } catch (error) {
              result.errors.push(`Ошибка импорта регулярного платежа: ${error}`);
            }
          }
        }

        if (data.settings?.length) {
          for (const setting of data.settings) {
            try {
              if (BIOMETRIC_SETTING_KEYS.has(setting.key)) {
                result.warnings.push(`Биометрическая настройка "${setting.key}" пропущена (привязана к устройству)`);
                continue;
              }
              if (!ALLOWED_SETTING_KEYS.has(setting.key)) {
                result.warnings.push(`Неизвестная настройка "${setting.key}" пропущена`);
                continue;
              }
              if (mergeSettings) {
                await db.settings.put(setting);
              } else {
                const existing = await db.settings.get(setting.key);
                if (!existing) {
                  await db.settings.put(setting);
                }
              }
              result.imported.settings++;
            } catch (error) {
              result.errors.push(`Ошибка импорта настройки "${setting.key}": ${error}`);
            }
          }
        }

        if (data.aiPatterns?.length) {
          for (const pattern of data.aiPatterns) {
            try {
              const validation = validateAIPattern(pattern as Partial<AIPattern>);
              if (!validation.isValid) {
                result.errors.push(`Некорректный AI-паттерн: ${validation.errors.join('; ')}`);
                continue;
              }
              await db.aiPatterns.put(pattern);
              result.imported.aiPatterns++;
            } catch (error) {
              result.errors.push(`Ошибка импорта AI-паттерна: ${error}`);
            }
          }
        }

        if (result.errors.length > 0) {
          throw new Error('Импорт отменён: обнаружены ошибки валидации');
        }
      }
    );
  } catch (error) {
    result.success = false;
    result.imported = createEmptyImportedCounts();
    if (!result.errors.some(message => message.includes('Импорт не выполнен:'))) {
      result.errors.push(`Импорт не выполнен: ${error}`);
    }
  }

  return result;
}

/**
 * Импортирует данные из JSON-файла
 */
export async function importFromFile(file: File): Promise<ImportResult> {
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return {
      success: false,
      imported: createEmptyImportedCounts(),
      errors: [`Файл слишком большой. Максимальный размер: ${MAX_IMPORT_FILE_BYTES} байт`],
      warnings: [],
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const result = await importData(data);
        resolve(result);
      } catch (error) {
        resolve({
          success: false,
          imported: createEmptyImportedCounts(),
          errors: [`Ошибка чтения файла: ${error}`],
          warnings: [],
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        imported: createEmptyImportedCounts(),
        errors: ['Не удалось прочитать файл'],
        warnings: [],
      });
    };

    reader.readAsText(file);
  });
}

// ==================== Clear Data ====================

/**
 * Очищает все данные базы (сброс к начальному состоянию)
 */
export async function clearAllData(): Promise<void> {
  await Promise.all([
    db.transactions.clear(),
    db.budgets.clear(),
    db.goals.clear(),
    db.recurringTemplates.clear(),
    db.aiPatterns.clear(),
    db.settings.clear(),
    // Категории не очищаем - они системные
  ]);
}

/**
 * Очищает только пользовательские данные (сохраняет системные категории и настройки)
 */
export async function clearUserData(): Promise<void> {
  await Promise.all([
    db.transactions.clear(),
    db.budgets.clear(),
    db.goals.clear(),
    db.recurringTemplates.clear(),
    db.aiPatterns.clear(),
  ]);
}
