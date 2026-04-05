// src/app/ai/types.ts

import { Category, Transaction } from '../../db/types';

// ==================== AI Match & Categorization ====================

export interface CategoryMatch {
  categoryId: string;
  category: Category;
  confidence: number; // 0-1
  source: 'pattern' | 'regex' | 'ml' | 'user';
  matchedText?: string;
}

export interface LearningSample {
  id?: number;
  comment: string;
  categoryId: string;
  correctedCategoryId?: string; // если пользователь исправил
  timestamp: number;
}

// ==================== AI Insights ====================

export type InsightType =
  | 'spending_increase'      // рост расходов в категории
  | 'spending_decrease'      // снижение расходов
  | 'unusual_transaction'    // необычная трата
  | 'subscription_detected' // обнаружена подписка
  | 'budget_forecast'       // прогноз бюджета
  | 'saving_opportunity'    // возможность экономии
  | 'goal_progress'         // прогресс цели
  | 'duplicate_suspicion'   // возможный дубликат
  | 'seasonal_pattern'      // сезонный паттерн
  | 'weekly_summary'        // еженедельная сводка;

export interface AIInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  icon: string; // lucide icon name
  color: string;
  priority: number; // 1-5 (1 = highest)
  data?: {
    categoryId?: string;
    transactionId?: number;
    goalId?: number;
    amount?: number;
    percent?: number;
    period?: string;
  };
  createdAt: number;
  dismissed?: boolean;
}

// ==================== AI Chat ====================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  insights?: AIInsight[]; // встроенные инсайты в сообщение
  quickActions?: QuickAction[];
}

export interface QuickAction {
  label: string;
  action: string; // identifier для обработки
  icon?: string;
}

// ==================== AI Analysis ====================

export interface SpendingAnalysis {
  totalExpenses: number;
  totalIncome: number;
  avgDailySpending: number;
  avgWeeklySpending: number;
  avgMonthlySpending: number;
  topCategories: Array<{
    categoryId: string;
    name: string;
    amount: number;
    percent: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  anomalies: Array<{
    transactionId: number;
    amount: number;
    categoryId: string;
    reason: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  subscriptions: Array<{
    name: string;
    amount: number;
    frequency: string;
    categoryId: string;
    confidence: number;
  }>;
  forecast: {
    endOfMonthExpenses: number;
    budgetRisk: 'low' | 'medium' | 'high';
    recommendations: string[];
  };
}

// ==================== AI Provider Interface ====================

export interface AIProvider {
  categorizeTransaction(comment: string): Promise<CategoryMatch | null>;
  generateInsights(transactions: Transaction[]): Promise<AIInsight[]>;
  analyzeSpending(transactions: Transaction[]): Promise<SpendingAnalysis>;
  chat(message: string, context: ChatContext): Promise<string>;
  detectAnomalies(transactions: Transaction[]): Promise<AIInsight[]>;
  learnFromCorrection(sample: LearningSample): Promise<void>;
}

export interface ChatContext {
  balance?: number;
  recentTransactions?: Transaction[];
  budgets?: Array<{ categoryId: string; limit: number }>;
  goals?: Array<{ name: string; target: number; current: number }>;
  preferences?: Record<string, any>;
}
