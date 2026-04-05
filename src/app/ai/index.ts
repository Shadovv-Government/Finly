// src/app/ai/index.ts
// Экспорт AI-модуля

export { AIService, aiService } from './AIService';
export { generateAllInsights, generateWeeklySummary } from './InsightEngine';
export type {
  AIProvider,
  CategoryMatch,
  LearningSample,
  AIInsight,
  InsightType,
  ChatMessage,
  QuickAction,
  ChatContext,
  SpendingAnalysis,
} from './types';
