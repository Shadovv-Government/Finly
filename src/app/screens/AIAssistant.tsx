import { useRef, useEffect, useState } from 'react';
import { Send, Sparkles, TrendingDown, AlertTriangle, Lightbulb, TrendingUp, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useAIInsights, type Insight } from '../hooks/useAIInsights';

function fmt(n: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);
}

const HINTS = [
  'Сколько потратил сегодня?',
  'Самые крупные траты',
  'Прогноз расходов',
  'Ближайшие платежи',
  'Сравни с прошлым месяцем',
  'Мои цели',
  'Средние расходы в день',
  'Что ты умеешь?',
];

const INSIGHT_CONFIG = {
  alert:    { Icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-950/40' },
  warning:  { Icon: TrendingDown,  color: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-950/40' },
  tip:      { Icon: Lightbulb,     color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/40' },
  positive: { Icon: TrendingUp,    color: 'text-emerald-500',bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
} as const;

function InsightCard({ insight }: { insight: Insight }) {
  const cfg = INSIGHT_CONFIG[insight.type];
  const Icon = insight.type === 'warning' && insight.id.startsWith('cat') ? TrendingDown : cfg.Icon;

  return (
    <div className="flex gap-3 p-4 bg-card border border-border rounded-2xl">
      <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold mb-0.5">{insight.title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="bg-card border border-border rounded-2xl px-4 py-3 flex gap-1 items-center">
        <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

function ChatBubble({
  role,
  message,
  suggestions,
  onSuggestion,
}: {
  role: 'user' | 'assistant';
  message: string;
  suggestions?: string[];
  onSuggestion?: (text: string) => void;
}) {
  const isUser = role === 'user';
  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
          isUser
            ? 'bg-violet-600 text-white'
            : 'bg-card border border-border text-foreground'
        }`}
      >
        {message}
      </div>
      {!isUser && suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2 max-w-[85%]">
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => onSuggestion?.(s)}
              className="text-xs px-3 py-1.5 bg-muted rounded-full hover:bg-accent transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const AIAssistant = () => {
  const { loading, isTyping, overview, insights, chatHistory, sendMessage } = useAIInsights();
  const [message, setMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  const handleSend = async () => {
    const text = message.trim();
    if (!text || isTyping) return;
    setMessage('');
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="pb-20 bg-background min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">AI Ассистент</h1>
            <p className="text-xs text-muted-foreground">Умный анализ финансов</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Weekly Overview */}
        <div className="px-4 pt-4">
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-3">Обзор за 7 дней</p>

            {loading || !overview ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Анализирую данные…</span>
              </div>
            ) : (
              <>
                <div className="flex gap-3 mb-4">
                  <div className="flex-1 bg-muted/60 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs text-muted-foreground">Доходы</span>
                    </div>
                    <p className="text-base font-bold">{fmt(overview.weekIncome)} ₽</p>
                  </div>
                  <div className="flex-1 bg-muted/60 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-xs text-muted-foreground">Расходы</span>
                    </div>
                    <p className="text-base font-bold">{fmt(overview.weekExpenses)} ₽</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {overview.weekBalance >= 0
                      ? `Баланс +${fmt(overview.weekBalance)} ₽`
                      : `Дефицит ${fmt(Math.abs(overview.weekBalance))} ₽`}
                  </span>
                  <span className="font-medium text-violet-600 dark:text-violet-400">
                    Экономия {overview.savingsRate}%
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Insights */}
        {(loading || insights.length > 0) && (
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm">Инсайты</h2>
              {insights.length > 0 && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {insights.length}
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Загрузка…</span>
              </div>
            ) : (
              <div className="space-y-2">
                {insights.map(insight => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat */}
        <div className="px-4 pt-4 pb-2">
          {chatHistory.length > 0 ? (
            <>
              <h2 className="font-bold text-sm mb-3">Чат</h2>
              <div className="space-y-2">
                {chatHistory.map((chat, index) => (
                  <ChatBubble
                    key={index}
                    role={chat.role}
                    message={chat.message}
                    suggestions={chat.suggestions}
                    onSuggestion={sendMessage}
                  />
                ))}
                {isTyping && <TypingBubble />}
              </div>
              <div ref={chatEndRef} />
            </>
          ) : !loading && (
            <>
              <p className="text-xs text-muted-foreground mb-2">Попробуйте спросить:</p>
              <div className="flex flex-wrap gap-2">
                {HINTS.map(hint => (
                  <button
                    key={hint}
                    onClick={() => sendMessage(hint)}
                    className="text-xs px-3 py-1.5 bg-muted rounded-full hover:bg-accent transition-colors"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-card border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Спросите о ваших финансах…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping}
            className="flex-1 px-4 py-2.5 bg-muted rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-600 disabled:opacity-60"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || isTyping}
            className="w-10 h-10 bg-violet-600 text-white rounded-xl flex items-center justify-center disabled:opacity-40 transition-opacity"
          >
            {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
