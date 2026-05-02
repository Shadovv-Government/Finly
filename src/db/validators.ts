// src/db/validators.ts
// Валидация данных перед вставкой/обновлением в БД

import { validation as msg } from '../i18n/ru';
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
  MAX_AI_USAGE_COUNT,
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
      errors.push(msg.amountRequired);
    } else if (typeof data.amount !== 'number') {
      errors.push(msg.amountMustBeNumber);
    } else if (data.amount <= 0) {
      errors.push(msg.amountMustBePositive);
    } else if (data.amount > MAX_AMOUNT) {
      errors.push(msg.amountExceedsMax(MAX_AMOUNT));
    } else if (data.amount < MIN_AMOUNT) {
      warnings.push(msg.amountTooSmall(MIN_AMOUNT));
    }
  }

  // type
  if (!isUpdate || data.type !== undefined) {
    if (!data.type) {
      errors.push(msg.typeRequired);
    } else if (!VALID_TRANSACTION_TYPES.includes(data.type)) {
      errors.push(msg.typeInvalidFull(VALID_TRANSACTION_TYPES.join(', ')));
    }
  }

  // categoryId (опционален — если не указан, будет подставлена категория "Другое")
  if (!isUpdate || data.categoryId !== undefined) {
    if (data.categoryId !== undefined && typeof data.categoryId !== 'string') {
      errors.push(msg.categoryIdMustBeString);
    }
  }

  // date
  if (!isUpdate || data.date !== undefined) {
    if (!data.date) {
      errors.push(msg.dateRequired);
    } else if (typeof data.date !== 'number') {
      errors.push(msg.dateMustBeTimestamp);
    } else if (data.date > Date.now() + MAX_FUTURE_DATE_OFFSET) {
      warnings.push(msg.dateFuture);
    } else if (data.date < Date.now() - MAX_PAST_DATE_OFFSET) {
      warnings.push(msg.dateTooOld);
    }
  }

  // currency
  if (data.currency !== undefined) {
    if (typeof data.currency !== 'string') {
      errors.push(msg.currencyMustBeString);
    } else if (data.currency.length !== 3) {
      warnings.push(msg.currencyMustBe3Chars);
    }
  }

  // rate
  if (data.rate !== undefined) {
    if (typeof data.rate !== 'number' || data.rate <= 0) {
      errors.push(msg.rateMustBePositive);
    }
  }

  // comment
  if (data.comment !== undefined && data.comment !== null) {
    if (data.comment.length > MAX_COMMENT_LENGTH) {
      errors.push(msg.commentTooLong(MAX_COMMENT_LENGTH));
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
    errors.push(msg.categoryIdRequired);
  } else if (data.id && typeof data.id !== 'string') {
    errors.push(msg.categoryIdMustBeString);
  }

  // name
  if (!isUpdate || data.name !== undefined) {
    if (!data.name) {
      errors.push(msg.categoryNameRequired);
    } else if (data.name.length > MAX_NAME_LENGTH) {
      errors.push(msg.nameTooLong(MAX_NAME_LENGTH));
    } else if (data.name.trim().length === 0) {
      errors.push(msg.categoryNameBlank);
    }
  }

  // type
  if (!isUpdate || data.type !== undefined) {
    if (!data.type) {
      errors.push(msg.categoryTypeRequired);
    } else if (!VALID_TRANSACTION_TYPES.includes(data.type)) {
      errors.push(msg.typeInvalid(VALID_TRANSACTION_TYPES.join(', ')));
    }
  }

  // icon
  if (data.icon !== undefined) {
    if (typeof data.icon !== 'string') {
      errors.push(msg.iconMustBeString);
    } else if (data.icon.length > 10) {
      warnings.push(msg.categoryIconTooLong);
    }
  }

  // color
  if (data.color !== undefined) {
    if (typeof data.color !== 'string') {
      errors.push(msg.colorMustBeString);
    } else if (!/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
      warnings.push(msg.categoryColorInvalidFormat);
    }
  }

  // isSystem
  if (data.isSystem !== undefined && typeof data.isSystem !== 'boolean') {
    errors.push(msg.categoryIsSystemMustBeBool);
  }

  // parentId (опционально)
  if (data.parentId !== undefined && data.parentId !== null) {
    if (typeof data.parentId !== 'string') {
      errors.push(msg.categoryParentIdMustBeString);
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
      errors.push(msg.categoryIdRequired);
    } else if (typeof data.categoryId !== 'string') {
      errors.push(msg.categoryIdMustBeString);
    }
  }

  // amount
  if (!isUpdate || data.amount !== undefined) {
    if (data.amount === undefined || data.amount === null) {
      errors.push(msg.amountRequired);
    } else if (typeof data.amount !== 'number') {
      errors.push(msg.amountMustBeNumber);
    } else if (data.amount <= 0) {
      errors.push(msg.amountMustBePositive);
    } else if (data.amount > MAX_AMOUNT) {
      errors.push(msg.amountExceedsMax(MAX_AMOUNT));
    }
  }

  // period
  if (!isUpdate || data.period !== undefined) {
    if (!data.period) {
      errors.push(msg.budgetPeriodRequired);
    } else if (!VALID_PERIOD_TYPES.includes(data.period)) {
      errors.push(msg.budgetPeriodInvalid(VALID_PERIOD_TYPES.join(', ')));
    }
  }

  // startDate
  if (!isUpdate || data.startDate !== undefined) {
    if (!data.startDate) {
      errors.push(msg.budgetStartDateRequired);
    } else if (typeof data.startDate !== 'number') {
      errors.push(msg.budgetStartDateMustBeTimestamp);
    }
  }

  // currency
  if (data.currency !== undefined) {
    if (typeof data.currency !== 'string') {
      errors.push(msg.currencyMustBeString);
    } else if (data.currency.length !== 3) {
      warnings.push(msg.currencyMustBe3Chars);
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
      errors.push(msg.goalNameRequired);
    } else if (data.name.length > MAX_NAME_LENGTH) {
      errors.push(msg.nameTooLong(MAX_NAME_LENGTH));
    }
  }

  // targetAmount
  if (!isUpdate || data.targetAmount !== undefined) {
    if (data.targetAmount === undefined || data.targetAmount === null) {
      errors.push(msg.goalTargetAmountRequired);
    } else if (typeof data.targetAmount !== 'number') {
      errors.push(msg.goalTargetAmountMustBeNumber);
    } else if (data.targetAmount <= 0) {
      errors.push(msg.goalTargetAmountMustBePositive);
    }
  }

  // currentAmount
  if (data.currentAmount !== undefined) {
    if (typeof data.currentAmount !== 'number') {
      errors.push(msg.goalCurrentAmountMustBeNumber);
    } else if (data.currentAmount < 0) {
      errors.push(msg.goalCurrentAmountNegative);
    } else if (data.targetAmount && data.currentAmount > data.targetAmount) {
      warnings.push(msg.goalCurrentExceedsTarget);
    }
  }

  // deadline (опционально)
  if (data.deadline !== undefined && data.deadline !== null) {
    if (typeof data.deadline !== 'number') {
      errors.push(msg.goalDeadlineMustBeTimestamp);
    } else if (data.deadline < Date.now()) {
      warnings.push(msg.goalDeadlineInPast);
    }
  }

  // icon, color
  if (data.icon !== undefined && typeof data.icon !== 'string') {
    errors.push(msg.iconMustBeString);
  }
  if (data.color !== undefined && typeof data.color !== 'string') {
    errors.push(msg.colorMustBeString);
  }

  // isActive
  if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
    errors.push(msg.isActiveMustBeBool);
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
      errors.push(msg.amountRequired);
    } else if (typeof data.amount !== 'number') {
      errors.push(msg.amountMustBeNumber);
    } else if (data.amount <= 0) {
      errors.push(msg.amountMustBePositive);
    }
  }

  // type
  if (!isUpdate || data.type !== undefined) {
    if (!data.type) {
      errors.push(msg.typeRequired);
    } else if (!VALID_TRANSACTION_TYPES.includes(data.type)) {
      errors.push(msg.typeInvalid(VALID_TRANSACTION_TYPES.join(', ')));
    }
  }

  // categoryId
  if (!isUpdate || data.categoryId !== undefined) {
    if (!data.categoryId) {
      errors.push(msg.categoryIdRequired);
    } else if (typeof data.categoryId !== 'string') {
      errors.push(msg.categoryIdMustBeString);
    }
  }

  // interval
  if (!isUpdate || data.interval !== undefined) {
    if (!data.interval) {
      errors.push(msg.recurringIntervalRequired);
    } else if (!VALID_INTERVALS.includes(data.interval)) {
      errors.push(msg.recurringIntervalInvalid(VALID_INTERVALS.join(', ')));
    }
  }

  // nextDate
  if (!isUpdate || data.nextDate !== undefined) {
    if (!data.nextDate) {
      errors.push(msg.recurringNextDateRequired);
    } else if (typeof data.nextDate !== 'number') {
      errors.push(msg.recurringNextDateMustBeTimestamp);
    }
  }

  // isActive
  if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
    errors.push(msg.isActiveMustBeBool);
  }

  // comment (опционально)
  if (data.comment !== undefined && data.comment.length > MAX_COMMENT_LENGTH) {
    errors.push(msg.commentTooLong(MAX_COMMENT_LENGTH));
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
      errors.push(msg.aiPatternRequired);
    } else if (typeof data.pattern !== 'string') {
      errors.push(msg.aiPatternMustBeString);
    } else if (data.pattern.length < MIN_PATTERN_LENGTH) {
      errors.push(msg.aiPatternTooShort(MIN_PATTERN_LENGTH));
    } else if (data.pattern.length > MAX_PATTERN_LENGTH) {
      warnings.push(msg.aiPatternTooLong);
    }
  }

  // categoryId
  if (!isUpdate || data.categoryId !== undefined) {
    if (!data.categoryId) {
      errors.push(msg.categoryIdRequired);
    } else if (typeof data.categoryId !== 'string') {
      errors.push(msg.categoryIdMustBeString);
    }
  }

  // confidence
  if (data.confidence !== undefined) {
    if (typeof data.confidence !== 'number') {
      errors.push(msg.aiConfidenceMustBeNumber);
    } else if (data.confidence < MIN_AI_CONFIDENCE || data.confidence > MAX_AI_CONFIDENCE) {
      errors.push(msg.aiConfidenceRange(MIN_AI_CONFIDENCE, MAX_AI_CONFIDENCE));
    }
  }

  // usageCount
  if (data.usageCount !== undefined) {
    if (typeof data.usageCount !== 'number') {
      errors.push(msg.aiUsageCountMustBeNumber);
    } else if (data.usageCount < 0) {
      errors.push(msg.aiUsageCountNegative);
    } else if (data.usageCount > MAX_AI_USAGE_COUNT) {
      errors.push(msg.aiUsageCountExceedsMax(MAX_AI_USAGE_COUNT));
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
      `Ошибка валидации (${entityType}): ${result.errors.join('; ')}`
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
    throw new Error(`Ошибка валидации (${entityType}): ${result.errors.join('; ')}`);
  }

  return {
    data,
    warnings: result.warnings,
  };
}
