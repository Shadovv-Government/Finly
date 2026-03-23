// src/db/validators.ts
// Валидация данных перед вставкой/обновлением в БД

import {
  Transaction,
  Category,
  Budget,
  Goal,
  RecurringTemplate,
  AIPattern,
  TransactionType,
  PeriodType,
  RecurringInterval,
} from './types';
import {
  MAX_AMOUNT,
  MIN_AMOUNT,
  MAX_COMMENT_LENGTH,
  MAX_NAME_LENGTH,
  MAX_FUTURE_DATE_OFFSET,
  MAX_PAST_DATE_OFFSET,
  MIN_PATTERN_LENGTH,
  MAX_PATTERN_LENGTH,
  MIN_AI_CONFIDENCE,
  MAX_AI_CONFIDENCE,
} from '../app/constants';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const VALID_TRANSACTION_TYPES: TransactionType[] = ['income', 'expense'];
const VALID_PERIOD_TYPES: PeriodType[] = ['week', 'month'];
const VALID_INTERVALS: RecurringInterval[] = ['daily', 'weekly', 'monthly', 'yearly'];

// ==================== Transaction Validation ====================

export function validateTransaction(
  data: Partial<Transaction>,
  isUpdate: boolean = false
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // amount
  if (!isUpdate || data.amount !== undefined) {
    if (data.amount === undefined || data.amount === null) {
      errors.push('Amount is required');
    } else if (typeof data.amount !== 'number') {
      errors.push('Amount must be a number');
    } else if (data.amount <= 0) {
      errors.push('Amount must be greater than 0');
    } else if (data.amount > MAX_AMOUNT) {
      errors.push(`Amount exceeds maximum (${MAX_AMOUNT})`);
    } else if (data.amount < MIN_AMOUNT) {
      warnings.push(`Amount is very small (< ${MIN_AMOUNT})`);
    }
  }

  // type
  if (!isUpdate || data.type !== undefined) {
    if (!data.type) {
      errors.push('Transaction type is required');
    } else if (!VALID_TRANSACTION_TYPES.includes(data.type)) {
      errors.push(`Invalid transaction type. Must be one of: ${VALID_TRANSACTION_TYPES.join(', ')}`);
    }
  }

  // categoryId
  if (!isUpdate || data.categoryId !== undefined) {
    if (!data.categoryId) {
      errors.push('Category ID is required');
    } else if (typeof data.categoryId !== 'string') {
      errors.push('Category ID must be a string');
    }
  }

  // date
  if (!isUpdate || data.date !== undefined) {
    if (!data.date) {
      errors.push('Date is required');
    } else if (typeof data.date !== 'number') {
      errors.push('Date must be a timestamp (number)');
    } else if (data.date > Date.now() + MAX_FUTURE_DATE_OFFSET) {
      warnings.push('Date is in the future');
    } else if (data.date < Date.now() - MAX_PAST_DATE_OFFSET) {
      // 10 years ago
      warnings.push('Date is more than 10 years ago');
    }
  }

  // currency
  if (data.currency !== undefined) {
    if (typeof data.currency !== 'string') {
      errors.push('Currency must be a string');
    } else if (data.currency.length !== 3) {
      warnings.push('Currency should be a 3-letter code (e.g., RUB, USD)');
    }
  }

  // rate
  if (data.rate !== undefined) {
    if (typeof data.rate !== 'number' || data.rate <= 0) {
      errors.push('Exchange rate must be a positive number');
    }
  }

  // comment
  if (data.comment !== undefined && data.comment !== null) {
    if (data.comment.length > MAX_COMMENT_LENGTH) {
      errors.push(`Comment exceeds maximum length (${MAX_COMMENT_LENGTH} characters)`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ==================== Category Validation ====================

export function validateCategory(
  data: Partial<Category>,
  isUpdate: boolean = false
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // id (только для создания)
  if (!isUpdate && !data.id) {
    errors.push('Category ID is required');
  } else if (data.id && typeof data.id !== 'string') {
    errors.push('Category ID must be a string');
  }

  // name
  if (!isUpdate || data.name !== undefined) {
    if (!data.name) {
      errors.push('Category name is required');
    } else if (data.name.length > MAX_NAME_LENGTH) {
      errors.push(`Name exceeds maximum length (${MAX_NAME_LENGTH} characters)`);
    } else if (data.name.trim().length === 0) {
      errors.push('Name cannot be empty or whitespace only');
    }
  }

  // type
  if (!isUpdate || data.type !== undefined) {
    if (!data.type) {
      errors.push('Category type is required');
    } else if (!VALID_TRANSACTION_TYPES.includes(data.type)) {
      errors.push(`Invalid type. Must be one of: ${VALID_TRANSACTION_TYPES.join(', ')}`);
    }
  }

  // icon
  if (data.icon !== undefined) {
    if (typeof data.icon !== 'string') {
      errors.push('Icon must be a string');
    } else if (data.icon.length > 10) {
      warnings.push('Icon seems too long (expected emoji or short name)');
    }
  }

  // color
  if (data.color !== undefined) {
    if (typeof data.color !== 'string') {
      errors.push('Color must be a string');
    } else if (!/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
      warnings.push('Color should be a hex code (e.g., #FF5722)');
    }
  }

  // isSystem
  if (data.isSystem !== undefined && typeof data.isSystem !== 'boolean') {
    errors.push('isSystem must be a boolean');
  }

  // parentId (опционально)
  if (data.parentId !== undefined && data.parentId !== null) {
    if (typeof data.parentId !== 'string') {
      errors.push('Parent ID must be a string');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ==================== Budget Validation ====================

export function validateBudget(
  data: Partial<Budget>,
  isUpdate: boolean = false
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // categoryId
  if (!isUpdate || data.categoryId !== undefined) {
    if (!data.categoryId) {
      errors.push('Category ID is required');
    } else if (typeof data.categoryId !== 'string') {
      errors.push('Category ID must be a string');
    }
  }

  // amount
  if (!isUpdate || data.amount !== undefined) {
    if (data.amount === undefined || data.amount === null) {
      errors.push('Amount is required');
    } else if (typeof data.amount !== 'number') {
      errors.push('Amount must be a number');
    } else if (data.amount <= 0) {
      errors.push('Amount must be greater than 0');
    } else if (data.amount > MAX_AMOUNT) {
      errors.push(`Amount exceeds maximum (${MAX_AMOUNT})`);
    }
  }

  // period
  if (!isUpdate || data.period !== undefined) {
    if (!data.period) {
      errors.push('Period is required');
    } else if (!VALID_PERIOD_TYPES.includes(data.period)) {
      errors.push(`Invalid period. Must be one of: ${VALID_PERIOD_TYPES.join(', ')}`);
    }
  }

  // startDate
  if (!isUpdate || data.startDate !== undefined) {
    if (!data.startDate) {
      errors.push('Start date is required');
    } else if (typeof data.startDate !== 'number') {
      errors.push('Start date must be a timestamp (number)');
    }
  }

  // currency
  if (data.currency !== undefined) {
    if (typeof data.currency !== 'string') {
      errors.push('Currency must be a string');
    } else if (data.currency.length !== 3) {
      warnings.push('Currency should be a 3-letter code (e.g., RUB, USD)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ==================== Goal Validation ====================

export function validateGoal(
  data: Partial<Goal>,
  isUpdate: boolean = false
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // name
  if (!isUpdate || data.name !== undefined) {
    if (!data.name) {
      errors.push('Goal name is required');
    } else if (data.name.length > MAX_NAME_LENGTH) {
      errors.push(`Name exceeds maximum length (${MAX_NAME_LENGTH} characters)`);
    }
  }

  // targetAmount
  if (!isUpdate || data.targetAmount !== undefined) {
    if (data.targetAmount === undefined || data.targetAmount === null) {
      errors.push('Target amount is required');
    } else if (typeof data.targetAmount !== 'number') {
      errors.push('Target amount must be a number');
    } else if (data.targetAmount <= 0) {
      errors.push('Target amount must be greater than 0');
    }
  }

  // currentAmount
  if (data.currentAmount !== undefined) {
    if (typeof data.currentAmount !== 'number') {
      errors.push('Current amount must be a number');
    } else if (data.currentAmount < 0) {
      errors.push('Current amount cannot be negative');
    } else if (data.targetAmount && data.currentAmount > data.targetAmount) {
      warnings.push('Current amount exceeds target amount');
    }
  }

  // deadline (опционально)
  if (data.deadline !== undefined && data.deadline !== null) {
    if (typeof data.deadline !== 'number') {
      errors.push('Deadline must be a timestamp (number)');
    } else if (data.deadline < Date.now()) {
      warnings.push('Deadline is in the past');
    }
  }

  // icon, color
  if (data.icon !== undefined && typeof data.icon !== 'string') {
    errors.push('Icon must be a string');
  }
  if (data.color !== undefined && typeof data.color !== 'string') {
    errors.push('Color must be a string');
  }

  // isActive
  if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
    errors.push('isActive must be a boolean');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ==================== RecurringTemplate Validation ====================

export function validateRecurringTemplate(
  data: Partial<RecurringTemplate>,
  isUpdate: boolean = false
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // amount
  if (!isUpdate || data.amount !== undefined) {
    if (data.amount === undefined || data.amount === null) {
      errors.push('Amount is required');
    } else if (typeof data.amount !== 'number') {
      errors.push('Amount must be a number');
    } else if (data.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }
  }

  // type
  if (!isUpdate || data.type !== undefined) {
    if (!data.type) {
      errors.push('Transaction type is required');
    } else if (!VALID_TRANSACTION_TYPES.includes(data.type)) {
      errors.push(`Invalid type. Must be one of: ${VALID_TRANSACTION_TYPES.join(', ')}`);
    }
  }

  // categoryId
  if (!isUpdate || data.categoryId !== undefined) {
    if (!data.categoryId) {
      errors.push('Category ID is required');
    } else if (typeof data.categoryId !== 'string') {
      errors.push('Category ID must be a string');
    }
  }

  // interval
  if (!isUpdate || data.interval !== undefined) {
    if (!data.interval) {
      errors.push('Interval is required');
    } else if (!VALID_INTERVALS.includes(data.interval)) {
      errors.push(`Invalid interval. Must be one of: ${VALID_INTERVALS.join(', ')}`);
    }
  }

  // nextDate
  if (!isUpdate || data.nextDate !== undefined) {
    if (!data.nextDate) {
      errors.push('Next date is required');
    } else if (typeof data.nextDate !== 'number') {
      errors.push('Next date must be a timestamp (number)');
    }
  }

  // isActive
  if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
    errors.push('isActive must be a boolean');
  }

  // comment (опционально)
  if (data.comment !== undefined && data.comment.length > MAX_COMMENT_LENGTH) {
    errors.push(`Comment exceeds maximum length (${MAX_COMMENT_LENGTH} characters)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ==================== AIPattern Validation ====================

export function validateAIPattern(
  data: Partial<AIPattern>,
  isUpdate: boolean = false
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // pattern
  if (!isUpdate || data.pattern !== undefined) {
    if (!data.pattern) {
      errors.push('Pattern is required');
    } else if (typeof data.pattern !== 'string') {
      errors.push('Pattern must be a string');
    } else if (data.pattern.length < MIN_PATTERN_LENGTH) {
      errors.push(`Pattern must be at least ${MIN_PATTERN_LENGTH} characters`);
    } else if (data.pattern.length > MAX_PATTERN_LENGTH) {
      warnings.push('Pattern seems too long');
    }
  }

  // categoryId
  if (!isUpdate || data.categoryId !== undefined) {
    if (!data.categoryId) {
      errors.push('Category ID is required');
    } else if (typeof data.categoryId !== 'string') {
      errors.push('Category ID must be a string');
    }
  }

  // confidence
  if (data.confidence !== undefined) {
    if (typeof data.confidence !== 'number') {
      errors.push('Confidence must be a number');
    } else if (data.confidence < MIN_AI_CONFIDENCE || data.confidence > MAX_AI_CONFIDENCE) {
      errors.push(`Confidence must be between ${MIN_AI_CONFIDENCE} and ${MAX_AI_CONFIDENCE}`);
    }
  }

  // usageCount
  if (data.usageCount !== undefined) {
    if (typeof data.usageCount !== 'number') {
      errors.push('Usage count must be a number');
    } else if (data.usageCount < 0) {
      errors.push('Usage count cannot be negative');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ==================== Helper Functions ====================

/**
 * Бросает исключение если валидация не пройдена
 */
export function assertValid(
  result: ValidationResult,
  entityType: string
): asserts result is ValidationResult & { isValid: true } {
  if (!result.isValid) {
    throw new Error(
      `${entityType} validation failed: ${result.errors.join('; ')}`
    );
  }
}

/**
 * Валидирует и возвращает результат с предупреждениями
 */
export function validateWithWarnings<T>(
  data: T,
  validator: (data: T) => ValidationResult,
  entityType: string
): { data: T; warnings: string[] } {
  const result = validator(data);
  
  if (!result.isValid) {
    throw new Error(`${entityType} validation failed: ${result.errors.join('; ')}`);
  }

  return {
    data,
    warnings: result.warnings,
  };
}
