// src/db/ai.ts
// AI-логика для авто-категоризации и умных подсказок

import { db } from './db';
import { AIPattern, TransactionType, Category } from './types';

export interface AIMatch {
  pattern: AIPattern;
  category: Category;
  confidence: number;
  matchedText: string;
}

export interface ParsedTransaction {
  amount: number;
  type: TransactionType;
  comment?: string;
  currency?: string;
  date?: number; // timestamp, если распознана дата
}

// ==================== Pattern Matching ====================

/**
 * Ищет лучший паттерн для данного комментария
 * Использует пословное匹配 с учётом confidence
 */
export async function findBestMatch(comment: string): Promise<AIMatch | null> {
  const patterns = await db.aiPatterns.toArray();
  const categories = await db.categories.toArray();
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  const lowerComment = comment.toLowerCase();
  let bestMatch: AIMatch | null = null;

  for (const pattern of patterns) {
    const lowerPattern = pattern.pattern.toLowerCase();
    
    // Проверяем вхождение паттерна в комментарий
    if (lowerComment.includes(lowerPattern)) {
      const category = categoryMap.get(pattern.categoryId);
      if (!category) continue;

      // Вычисляем скор: confidence * usageCount (для популярности)
      const score = pattern.confidence * (1 + Math.log10(pattern.usageCount + 1));

      if (!bestMatch || score > bestMatch.confidence) {
        bestMatch = {
          pattern,
          category,
          confidence: score,
          matchedText: lowerPattern,
        };
      }
    }
  }

  return bestMatch;
}

// ==================== Natural Language Parsing ====================

/**
 * Парсит текст в формате "кофе 450 рублей в Старбаксе"
 * Возвращает структурированные данные
 */
export function parseNaturalLanguage(text: string): ParsedTransaction | null {
  // Паттерны для извлечения суммы
  const amountPatterns = [
    /(\d+(?:[.,]\d+)?)\s*(?:руб(?:лей|ля|лю)?|₽|rub|r|usd|\$|eur|€)/i,
    /(\d+(?:[.,]\d+)?)\s*(?:тыс(?:яч)?|k|к)/i,
  ];

  let amount = 0;
  let currency = 'RUB';
  let type: TransactionType = 'expense';

  // Извлекаем сумму
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      amount = parseFloat(match[1].replace(',', '.'));
      
      // Проверяем масштаб (тысячи)
      if (match[0].toLowerCase().includes('тыс') || match[0].toLowerCase().includes('k')) {
        amount *= 1000;
      }

      // Определяем валюту
      if (match[0].toLowerCase().includes('usd') || match[0].includes('$')) {
        currency = 'USD';
      } else if (match[0].toLowerCase().includes('eur') || match[0].includes('€')) {
        currency = 'EUR';
      }

      break;
    }
  }

  if (amount === 0) return null;

  // Определяем тип (доход/расход)
  const incomeKeywords = ['получил', 'получила', 'пришла', 'зп', 'зарплата', 'доход', 'подарок', 'возврат'];
  const expenseKeywords = ['потратил', 'потратила', 'купил', 'купила', 'заплатил', 'заплатила', 'расход', 'трата'];

  const lowerText = text.toLowerCase();
  
  if (incomeKeywords.some(k => lowerText.includes(k))) {
    type = 'income';
  } else if (expenseKeywords.some(k => lowerText.includes(k))) {
    type = 'expense';
  }

  // ─── Извлекаем дату ────────────────────────────────────────────────────────
  const date = parseDateFromText(text);

  // Очищаем комментарий от суммы, валюты и даты
  let comment = text
    .replace(amountPatterns[0], '')
    .replace(amountPatterns[1], '')
    .replace(DATE_PATTERN, '')
    .trim();

  return {
    amount,
    type,
    comment: comment || undefined,
    currency,
    date,
  };
}

// ─── Парсинг даты из текста ──────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
  январ: 0, феврал: 1, март: 2, апрел: 3, май: 4, мая: 4,
  июн: 5, июл: 6, август: 7, сентябр: 8, октябр: 9, ноябр: 10, декабр: 11,
};

// Общий паттерн для всех форм дат — используется при очистке комментария
const DATE_PATTERN =
  /\b(сегодня|вчера|позавчера|завтра|понедельник|вторник|сред[ау]|четверг|пятниц[ау]|суббот[ау]|воскресень[ея])\b|\b\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?\b|\b\d{1,2}\s+(?:январ|феврал|март|апрел|май|мая|июн|июл|август|сентябр|октябр|ноябр|декабр)\w*(?:\s+\d{4})?\b/gi;

function parseDateFromText(text: string): number | undefined {
  const lower = text.toLowerCase();
  const now = new Date();

  // Относительные слова
  if (/\bсегодня\b/.test(lower)) return startOfDay(now).getTime();
  if (/\bвчера\b/.test(lower)) return startOfDay(addDays(now, -1)).getTime();
  if (/\bпозавчера\b/.test(lower)) return startOfDay(addDays(now, -2)).getTime();
  if (/\bзавтра\b/.test(lower)) return startOfDay(addDays(now, 1)).getTime();

  // День недели (последний прошедший)
  const weekdays = ['воскресень', 'понедельник', 'вторник', 'сред', 'четверг', 'пятниц', 'суббот'];
  for (let i = 0; i < weekdays.length; i++) {
    if (lower.includes(weekdays[i])) {
      let diff = now.getDay() - i;
      if (diff <= 0) diff += 7;
      return startOfDay(addDays(now, -diff)).getTime();
    }
  }

  // ДД.ММ или ДД/ММ или ДД.ММ.ГГГГ
  const dmMatch = text.match(/\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b/);
  if (dmMatch) {
    const day = parseInt(dmMatch[1], 10);
    const month = parseInt(dmMatch[2], 10) - 1;
    let year = now.getFullYear();
    if (dmMatch[3]) {
      year = parseInt(dmMatch[3], 10);
      if (year < 100) year += 2000;
    }
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      return new Date(year, month, day).getTime();
    }
  }

  // "5 января" / "15 марта 2024"
  const wordMatch = lower.match(
    /\b(\d{1,2})\s+(январ|феврал|март|апрел|май|мая|июн|июл|август|сентябр|октябр|ноябр|декабр)\w*(?:\s+(\d{4}))?\b/,
  );
  if (wordMatch) {
    const day = parseInt(wordMatch[1], 10);
    const month = MONTHS[wordMatch[2]];
    const year = wordMatch[3] ? parseInt(wordMatch[3], 10) : now.getFullYear();
    if (month !== undefined && day >= 1 && day <= 31) {
      return new Date(year, month, day).getTime();
    }
  }

  return undefined;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// ==================== AI Suggestions ====================

export interface AISuggestion {
  type: 'overspending' | 'unusual' | 'goal' | 'budget';
  message: string;
  priority: number;
  data?: any;
}

/**
 * Генерирует рекомендации на основе данных пользователя
 */
export async function generateSuggestions(): Promise<AISuggestion[]> {
  const suggestions: AISuggestion[] = [];

  // Получаем данные за текущий месяц
  const now = Date.now();
  const nowDate = new Date(now);
  const monthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).getTime();
  
  const { getExpensesByCategory, getAllBudgetsProgress, getGoalsProgress } = await import('./analytics');
  const expenses = await getExpensesByCategory(monthStart, now);
  const budgetProgress = await getAllBudgetsProgress(monthStart, now);
  const goals = await getGoalsProgress();

  // Проверка перерасхода
  for (const budget of budgetProgress) {
    if (budget.isOverBudget) {
      suggestions.push({
        type: 'overspending',
        message: `Перерасход по категории "${budget.categoryName}": ${budget.spent} ₽ из ${budget.limit} ₽`,
        priority: 1,
        data: budget,
      });
    } else if (budget.percent > 80) {
      suggestions.push({
        type: 'overspending',
        message: `Скоро перерасход по "${budget.categoryName}": ${Math.round(budget.percent)}% бюджета`,
        priority: 2,
        data: budget,
      });
    }
  }

  // Проверка целей
  for (const goal of goals) {
    if (goal.isActive && goal.monthlyNeeded && goal.monthlyNeeded > 0) {
      suggestions.push({
        type: 'goal',
        message: `Для цели "${goal.name}" нужно откладывать ${Math.round(goal.monthlyNeeded)} ₽/мес`,
        priority: 3,
        data: goal,
      });
    }
  }

  // Аномальные траты (упрощённо)
  if (expenses.length > 0) {
    const avgExpense = expenses.reduce((sum, e) => sum + e.amount, 0) / expenses.length;
    const maxExpense = expenses[0]; // Уже отсортировано
    
    if (maxExpense && maxExpense.amount > avgExpense * 3) {
      suggestions.push({
        type: 'unusual',
        message: `📊 Крупная трата: ${maxExpense.amount} ₽ в категории "${maxExpense.categoryName}"`,
        priority: 4,
        data: maxExpense,
      });
    }
  }

  return suggestions.sort((a, b) => a.priority - b.priority);
}
