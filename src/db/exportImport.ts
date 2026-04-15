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
    version: '1.0',
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
      new Date(t.date).toISOString(),
      t.type,
      category,
      t.amount,
      t.currency,
      t.rate,
      `"${(t.comment || '').replace(/"/g, '""')}"`,
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
    imported: {
      transactions: 0,
      categories: 0,
      budgets: 0,
      goals: 0,
      recurringTemplates: 0,
      settings: 0,
      aiPatterns: 0,
    },
    errors: [],
    warnings: [],
  };

  try {
    // Импортируем категории первыми (нужны для транзакций)
    if (data.categories?.length) {
      const existingCategories = await db.categories.toArray();
      const existingIds = new Set(existingCategories.map(c => c.id));

      for (const category of data.categories) {
        try {
          const validation = validateCategory(category as Partial<Category>);
          if (!validation.isValid) {
            result.errors.push(`Invalid category "${category.name}": ${validation.errors.join('; ')}`);
            continue;
          }

          if (existingIds.has(category.id) && !mergeCategories) {
            result.warnings.push(`Category "${category.name}" already exists, skipped`);
            continue;
          }

          if (existingIds.has(category.id)) {
            await db.categories.update(category.id, category);
          } else {
            await db.categories.add(category);
          }
          result.imported.categories++;
        } catch (error) {
          result.errors.push(`Failed to import category "${category.name}": ${error}`);
        }
      }
    }

    // Импортируем транзакции
    if (data.transactions?.length) {
      for (const transaction of data.transactions) {
        try {
          const validation = validateTransaction(transaction as Partial<Transaction>);
          if (!validation.isValid) {
            result.errors.push(`Invalid transaction: ${validation.errors.join('; ')}`);
            continue;
          }

          // Проверяем категорию (если указана)
          if (transaction.categoryId) {
            const category = await db.categories.get(transaction.categoryId);
            if (!category) {
              result.warnings.push(
                `Transaction skipped: category "${transaction.categoryId}" not found`
              );
              continue;
            }
          }

          await db.transactions.add(transaction);
          result.imported.transactions++;
        } catch (error) {
          result.errors.push(`Failed to import transaction: ${error}`);
        }
      }
    }

    // Импортируем бюджеты
    if (data.budgets?.length) {
      for (const budget of data.budgets) {
        try {
          const validation = validateBudget(budget as Partial<Budget>);
          if (!validation.isValid) {
            result.errors.push(`Invalid budget: ${validation.errors.join('; ')}`);
            continue;
          }
          await db.budgets.add(budget);
          result.imported.budgets++;
        } catch (error) {
          result.errors.push(`Failed to import budget: ${error}`);
        }
      }
    }

    // Импортируем цели
    if (data.goals?.length) {
      for (const goal of data.goals) {
        try {
          const validation = validateGoal(goal as Partial<Goal>);
          if (!validation.isValid) {
            result.errors.push(`Invalid goal: ${validation.errors.join('; ')}`);
            continue;
          }
          await db.goals.add(goal);
          result.imported.goals++;
        } catch (error) {
          result.errors.push(`Failed to import goal: ${error}`);
        }
      }
    }

    // Импортируем шаблоны
    if (data.recurringTemplates?.length) {
      for (const template of data.recurringTemplates) {
        try {
          const validation = validateRecurringTemplate(template as Partial<RecurringTemplate>);
          if (!validation.isValid) {
            result.errors.push(`Invalid recurring template: ${validation.errors.join('; ')}`);
            continue;
          }
          await db.recurringTemplates.add(template);
          result.imported.recurringTemplates++;
        } catch (error) {
          result.errors.push(`Failed to import recurring template: ${error}`);
        }
      }
    }

    // Импортируем настройки (только разрешённые ключи, биометрия исключена)
    if (data.settings?.length) {
      for (const setting of data.settings) {
        try {
          if (BIOMETRIC_SETTING_KEYS.has(setting.key)) {
            result.warnings.push(`Biometric setting "${setting.key}" skipped (device-specific)`);
            continue;
          }
          if (!ALLOWED_SETTING_KEYS.has(setting.key)) {
            result.warnings.push(`Unknown setting "${setting.key}" skipped`);
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
          result.errors.push(`Failed to import setting "${setting.key}": ${error}`);
        }
      }
    }

    // Импортируем AI паттерны
    if (data.aiPatterns?.length) {
      for (const pattern of data.aiPatterns) {
        try {
          const validation = validateAIPattern(pattern as Partial<AIPattern>);
          if (!validation.isValid) {
            result.errors.push(`Invalid AI pattern: ${validation.errors.join('; ')}`);
            continue;
          }
          await db.aiPatterns.add(pattern);
          result.imported.aiPatterns++;
        } catch (error) {
          result.errors.push(`Failed to import AI pattern: ${error}`);
        }
      }
    }
  } catch (error) {
    result.success = false;
    result.errors.push(`Import failed: ${error}`);
  }

  return result;
}

/**
 * Импортирует данные из JSON-файла
 */
export async function importFromFile(file: File): Promise<ImportResult> {
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
          imported: {
            transactions: 0,
            categories: 0,
            budgets: 0,
            goals: 0,
            recurringTemplates: 0,
            settings: 0,
            aiPatterns: 0,
          },
          errors: [`Failed to parse file: ${error}`],
          warnings: [],
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        imported: {
          transactions: 0,
          categories: 0,
          budgets: 0,
          goals: 0,
          recurringTemplates: 0,
          settings: 0,
          aiPatterns: 0,
        },
        errors: ['Failed to read file'],
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
