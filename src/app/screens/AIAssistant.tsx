import { useRef, useEffect, useState } from 'react';
import { Send, Sparkles, TrendingDown, AlertTriangle, Lightbulb, TrendingUp, Loader2 } from 'lucide-react';
import { useAIInsights, type Insight } from '../hooks/useAIInsights';

function fmt(n: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);
}

function InsightCard({ insight }: { insight: Insight }) {
  const map = {
    alert:    { Icon: AlertTriangle,  bg: 'bg-red-100 dark:bg-red-950',    text: 'text-red-600 dark:text-red-400' },
    warning:  { Icon: AlertTriangle,  bg: 'bg-yellow-100 dark:bg-yellow-950', text: 'text-yellow-600 dark:text-yellow-400' },
    tip:      { Icon: Lightbulb,      bg: 'bg-violet-100 dark:bg-violet-950', text: 'text-violet-600 dark:text-violet-400' },
    positive: { Icon: TrendingUp,     bg: 'bg-green-100 dark:bg-green-950',  text: 'text-green-600 dark:text-green-400' },
  } as const;

  const { Icon: BaseIcon, bg, text } = map[insight.type];
  const Icon = insight.type === 'warning' && insight.id.startsWith('cat') ? TrendingDown : BaseIcon;

  return (
    <div className="bg-card rounded-2xl p-4 border border-border">
      <div className="flex gap-3">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${text}`} />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold mb-1">{insight.title}</h4>
          <p className="text-sm text-muted-foreground">{insight.description}</p>
        </div>
      </div>
    </div>
  );
}

export const AIAssistant = () => {
  const { loading, overview, insights, chatHistory, sendMessage } = useAIInsights();
  const [message, setMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSend = async () => {
    const text = message.trim();
    if (!text) return;
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
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">AI Ассистент</h1>
            <p className="text-xs text-muted-foreground">Умный анализ финансов</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Weekly Overview */}
        <div className="px-4 py-4">
          <div className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5" />
              <h2 className="font-bold">AI Обзор недели</h2>
            </div>
            {loading || !overview ? (
              <div className="flex items-center gap-2 opacity-80">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Анализирую данные…</span>
              </div>
            ) : (
              <>
                <p className="text-sm opacity-90 mb-4">
                  За последние 7 дней расходы {fmt(overview.weekExpenses)} ₽,
                  доходы {fmt(overview.weekIncome)} ₽.
                  {overview.weekBalance >= 0
                    ? ` Баланс вырос на ${fmt(overview.weekBalance)} ₽.`
                    : ` Дефицит ${fmt(Math.abs(overview.weekBalance))} ₽.`}
                </p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-xl p-3">
                    <p className="text-xs opacity-80">Экономия</p>
                    <p className="text-lg font-bold">{overview.savingsRate}%</p>
                  </div>
                  <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-xl p-3">
                    <p className="text-xs opacity-80">Категорий</p>
                    <p className="text-lg font-bold">{overview.topCategories}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Insights */}
        <div className="px-4 py-4">
          <h3 className="font-bold mb-3">Важные инсайты</h3>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Загрузка…</span>
            </div>
          ) : insights.length === 0 ? (
            <p className="text-sm text-muted-foreground">Всё в порядке, инсайтов нет.</p>
          ) : (
            <div className="space-y-3">
              {insights.map(insight => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          )}
        </div>

        {/* Chat History */}
        {chatHistory.length > 0 && (
          <div className="px-4 py-4">
            <h3 className="font-bold mb-3">История вопросов</h3>
            <div className="space-y-3">
              {chatHistory.map((chat, index) => (
                <div
                  key={index}
                  className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 ${
                      chat.role === 'user'
                        ? 'bg-violet-600 text-white'
                        : 'bg-card border border-border'
                    }`}
                  >
                    <p className="text-sm">{chat.message}</p>
                  </div>
                </div>
              ))}
            </div>
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Prompt hints */}
        {chatHistory.length === 0 && !loading && (
          <div className="px-4 pb-4">
            <p className="text-xs text-muted-foreground mb-2">Попробуйте спросить:</p>
            <div className="flex flex-wrap gap-2">
              {['Сколько потратил?', 'Какой баланс?', 'Прогноз расходов', 'Сравни с прошлым месяцем'].map(hint => (
                <button
                  key={hint}
                  onClick={() => sendMessage(hint)}
                  className="text-xs px-3 py-1.5 bg-muted rounded-full hover:bg-accent transition-colors"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="px-4 py-4 bg-card border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Спросите о ваших финансах…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 px-4 py-3 bg-muted rounded-xl outline-none focus:ring-2 focus:ring-violet-600"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="w-12 h-12 bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-xl flex items-center justify-center disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
