// src/app/ai/AIService.ts
// Основной AI-сервис для работы с паттернами, категоризацией и обучением

import { db } from '../../db/db';
import { Category, AIPattern } from '../../db/types';
import { findBestMatch, parseNaturalLanguage } from '../../db/ai';
import type {
  AIProvider,
  CategoryMatch,
  LearningSample,
  AIInsight,
  ChatContext,
  SpendingAnalysis,
} from './types';

/**
 * AI-сервис: обёртка над локальными AI-функциями с поддержкой обучения
 */
export class AIService implements AIProvider {
  private learningSamples: LearningSample[] = [];

  constructor() {
    this.loadLearningSamples();
  }

  // ==================== Categorization ====================

  /**
   * Категоризирует транзакцию по комментарию
   * Использует паттерны + regex + историю исправлений
   */
  async categorizeTransaction(comment: string): Promise<CategoryMatch | null> {
    if (!comment || comment.trim().length === 0) return null;

    // 1. Проверяем локальные паттерны
    const localMatch = await findBestMatch(comment);
    if (localMatch) {
      // Обновляем usageCount
      await db.aiPatterns.update(localMatch.pattern.id!, {
        usageCount: localMatch.pattern.usageCount + 1,
        lastUsed: Date.now(),
      });

      return {
        categoryId: localMatch.category.id,
        category: localMatch.category,
        confidence: localMatch.confidence,
        source: 'pattern',
        matchedText: localMatch.matchedText,
      };
    }

    // 2. Проверяем regex-паттерны
    const regexMatch = await this.matchByRegex(comment);
    if (regexMatch) return regexMatch;

    // 3. Проверяем историю исправлений пользователя
    const correctionMatch = await this.matchByCorrection(comment);
    if (correctionMatch) return correctionMatch;

    return null;
  }

  /**
   * Поиск по regex-паттернам в AIPattern
   */
  private async matchByRegex(comment: string): Promise<CategoryMatch | null> {
    const patterns = await db.aiPatterns.toArray();
    const categories = await db.categories.toArray();
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    const lowerComment = comment.toLowerCase();

    for (const pattern of patterns) {
      if (!pattern.regex) continue;

      try {
        const regex = new RegExp(pattern.regex, 'i');
        const match = lowerComment.match(regex);
        if (!match) continue;

        const category = categoryMap.get(pattern.categoryId);
        if (!category) continue;

        return {
          categoryId: pattern.categoryId,
          category,
          confidence: pattern.confidence,
          source: 'regex',
          matchedText: match[0],
        };
      } catch {
        // Invalid regex — пропускаем
        continue;
      }
    }

    return null;
  }

  /**
   * Поиск по истории исправлений пользователя
   */
  private async matchByCorrection(comment: string): Promise<CategoryMatch | null> {
    // Пока заглушка — в будущем здесь будет ML на основе исправлений
    const lowerComment = comment.toLowerCase();
    const samples = this.learningSamples.filter(s => s.comment.toLowerCase().includes(lowerComment));

    if (samples.length === 0) return null;

    // Берём самую частую категорию из исправлений
    const categoryCount = new Map<string, number>();
    for (const sample of samples) {
      const catId = sample.correctedCategoryId || sample.categoryId;
      categoryCount.set(catId, (categoryCount.get(catId) || 0) + 1);
    }

    const topCategoryId = Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    if (!topCategoryId) return null;

    const category = await db.categories.get(topCategoryId);
    if (!category) return null;

    return {
      categoryId: topCategoryId,
      category,
      confidence: 0.7,
      source: 'user',
      matchedText: comment,
    };
  }

  // ==================== Insights ====================

  /**
   * Генерирует инсайты на основе транзакций
   * Делегирует в db/ai.ts generateSuggestions()
   */
  async generateInsights(): Promise<AIInsight[]> {
    const { generateSuggestions } = await import('../../db/ai');
    const suggestions = await generateSuggestions();

    return suggestions.map((s, i) => ({
      id: `insight-${Date.now()}-${i}`,
      type: s.type === 'overspending' ? 'budget_forecast' :
            s.type === 'unusual' ? 'unusual_transaction' :
            s.type === 'goal' ? 'goal_progress' :
            'saving_opportunity',
      title: s.message.split(':')[0] || s.message,
      description: s.message,
      icon: s.type === 'overspending' ? 'AlertTriangle' :
            s.type === 'unusual' ? 'Eye' :
            s.type === 'goal' ? 'Target' :
            'Lightbulb',
      color: s.type === 'overspending' ? '#EF4444' :
             s.type === 'unusual' ? '#F59E0B' :
             s.type === 'goal' ? '#10B981' :
             '#3B82F6',
      priority: s.priority,
      data: s.data,
      createdAt: Date.now(),
    }));
  }

  /**
   * Обнаружение аномалий в транзакциях
   */
  async detectAnomalies(transactions: Array<{ amount: number; categoryId: string; date: number }>): Promise<AIInsight[]> {
    if (transactions.length < 5) return [];

    const amounts = transactions.map(t => t.amount);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((sum, a) => sum + Math.pow(a - avg, 2), 0) / amounts.length);

    const anomalies: AIInsight[] = [];

    for (const tx of transactions) {
      const zScore = Math.abs((tx.amount - avg) / stdDev);
      if (zScore > 2) {
        anomalies.push({
          id: `anomaly-${Date.now()}-${tx.amount}`,
          type: 'unusual_transaction',
          title: `Необычная трата: ${tx.amount} ₽`,
          description: `Эта трата отклоняется от среднего на ${Math.round(zScore)} стандартных отклонений`,
          icon: 'AlertCircle',
          color: '#EF4444',
          priority: zScore > 3 ? 1 : 2,
          data: { amount: tx.amount, categoryId: tx.categoryId },
          createdAt: Date.now(),
        });
      }
    }

    return anomalies.sort((a, b) => a.priority - b.priority);
  }

  // ==================== Analysis ====================

  /**
   * Полный анализ расходов
   */
  async analyzeSpending(transactions: Array<{ amount: number; type: string; categoryId: string; date: number }>): Promise<SpendingAnalysis> {
    const expenses = transactions.filter(t => t.type === 'expense');
    const income = transactions.filter(t => t.type === 'income');

    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const daysInRange = Math.max(1, Math.ceil((now - Math.min(...expenses.map(t => t.date))) / dayMs));

    const avgDailySpending = totalExpenses / daysInRange;

    // Top категории
    const categoryTotals = new Map<string, number>();
    for (const tx of expenses) {
      categoryTotals.set(tx.categoryId, (categoryTotals.get(tx.categoryId) || 0) + tx.amount);
    }

    const categories = await db.categories.toArray();
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    const topCategories = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([catId, amount]) => ({
        categoryId: catId,
        name: categoryMap.get(catId)?.name || catId,
        amount,
        percent: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        trend: 'stable' as const, // TODO: сравнение с предыдущим периодом
      }));

    // Прогноз до конца месяца
    const nowDate = new Date();
    const daysInMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 0).getDate();
    const daysPassed = nowDate.getDate();
    const endOfMonthExpenses = avgDailySpending * (daysInMonth - daysPassed);

    return {
      totalExpenses,
      totalIncome,
      avgDailySpending,
      avgWeeklySpending: avgDailySpending * 7,
      avgMonthlySpending: avgDailySpending * 30,
      topCategories,
      anomalies: [], // заполняется отдельно
      subscriptions: [], // TODO: обнаружение подписок
      forecast: {
        endOfMonthExpenses: Math.round(endOfMonthExpenses),
        budgetRisk: endOfMonthExpenses > totalIncome * 0.8 ? 'high' : endOfMonthExpenses > totalIncome * 0.5 ? 'medium' : 'low',
        recommendations: this.generateRecommendations(topCategories, avgDailySpending),
      },
    };
  }

  // ==================== Chat ====================

  /**
   * AI-чат (заглушка — в будущем интеграция с LLM API)
   */
  async chat(message: string, context: ChatContext = {}): Promise<string> {
    const lowerMessage = message.toLowerCase();

    // Базовые ответы на частые вопросы
    if (lowerMessage.includes('баланс') || lowerMessage.includes('сколько')) {
      if (context.balance !== undefined) {
        return `Ваш текущий баланс: ${context.balance.toLocaleString('ru-RU')} ₽`;
      }
      return 'Я не могу определить ваш баланс. Попробуйте другой вопрос.';
    }

    if (lowerMessage.includes('расход') || lowerMessage.includes('потратил')) {
      return 'Чтобы увидеть подробную аналитику расходов, перейдите на экран "Аналитика".';
    }

    if (lowerMessage.includes('бюджет')) {
      return `У вас ${context.budgets?.length || 0} активных бюджетов. Перейдите на экран "Бюджеты" для управления.`;
    }

    if (lowerMessage.includes('цел') || lowerMessage.includes('накоп')) {
      if (context.goals && context.goals.length > 0) {
        const goalNames = context.goals.map(g => g.name).join(', ');
        return `Ваши цели: ${goalNames}. Перейдите на экран "Цели" для подробностей.`;
      }
      return 'У вас пока нет активных целей. Хотите создать?';
    }

    if (lowerMessage.includes('совет') || lowerMessage.includes('рекоменд')) {
      return 'Рекомендую проверить экран "Аналитика" — там есть инсайты по вашим расходам.';
    }

    return 'Я пока учусь, но могу помочь с навигацией. Попробуйте спросить о балансе, расходах, бюджетах или целях.';
  }

  // ==================== Learning ====================

  /**
   * Обучение на исправлении пользователя
   */
  async learnFromCorrection(sample: LearningSample): Promise<void> {
    this.learningSamples.push(sample);

    // Если пользователь исправил категорию — создаём новый паттерн
    if (sample.correctedCategoryId && sample.correctedCategoryId !== sample.categoryId) {
      const words = sample.comment.toLowerCase().split(/\s+/).filter(w => w.length > 2);

      for (const word of words) {
        // Проверяем, есть ли уже паттерн
        const existing = await db.aiPatterns.toArray().then(
          patterns => patterns.find(p => p.pattern === word && p.categoryId === sample.correctedCategoryId)
        );

        if (!existing) {
          await db.aiPatterns.add({
            pattern: word,
            categoryId: sample.correctedCategoryId,
            confidence: 0.5, // Начальная уверенность
            usageCount: 1,
            lastUsed: Date.now(),
            createdBy: 'user',
          });
        }
      }
    }
  }

  /**
   * Загрузка истории обучения (пока в памяти)
   */
  private async loadLearningSamples(): Promise<void> {
    // В будущем — загрузка из IndexedDB
    this.learningSamples = [];
  }

  // ==================== Helpers ====================

  /**
   * Генерация рекомендаций на основе расходов
   */
  private generateRecommendations(
    topCategories: Array<{ name: string; amount: number; percent: number }>,
    avgDailySpending: number
  ): string[] {
    const recommendations: string[] = [];

    if (topCategories.length > 0) {
      const top = topCategories[0];
      if (top.percent > 30) {
        recommendations.push(`Большая часть расходов — "${top.name}" (${Math.round(top.percent)}%). Попробуйте установить бюджет.`);
      }
    }

    if (avgDailySpending > 5000) {
      recommendations.push('Ваши ежедневные расходы довольно высокие. Проверьте, нет ли ненужных трат.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Отличная работа! Ваши расходы выглядят разумно.');
    }

    return recommendations;
  }

  /**
   * Парсинг естественного языка (обёртка над db/ai.ts)
   */
  parseNaturalLanguage(text: string) {
    return parseNaturalLanguage(text);
  }
}

// Singleton
export const aiService = new AIService();
