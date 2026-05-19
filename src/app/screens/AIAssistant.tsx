import { useEffect, useRef, useState } from 'react';
import { Sparkles, TrendingDown, AlertTriangle, Lightbulb, TrendingUp, Loader2, Send, WifiOff } from 'lucide-react';
import { useAIInsights, type Insight } from '../hooks/useAIInsights';
import { useAIChat } from '../hooks/useAIChat';

const INSIGHT_CONFIG = {
  alert:    { Icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-950/40' },
  warning:  { Icon: TrendingDown,  color: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-950/40' },
  tip:      { Icon: Lightbulb,     color: 'text-primary', bg: 'bg-primary/10 dark:bg-primary/15' },
  positive: { Icon: TrendingUp,    color: 'text-emerald-500',bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
} as const;

const SUGGESTIONS = [
  'Мой баланс',
  'Расходы за месяц',
  'Состояние бюджетов',
  'Мои цели',
  'Прогноз до конца месяца',
];

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

export const AIAssistant = () => {
  const { loading, insights } = useAIInsights();
  const { messages, isLoading, isOffline, sendMessage } = useAIChat();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="pb-28 bg-background min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 text-white" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">Умный анализ финансов</p>
            <h1 className="text-xl font-bold">AI Ассистент</h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Insights */}
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm">Инсайты</h2>
            {!loading && insights.length > 0 && (
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

        {/* Chat */}
        <div className="px-4 pt-5 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm">Спросить AI</h2>
            {isOffline && (
              <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <WifiOff className="w-3 h-3" />
                офлайн
              </span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 mb-3 min-h-[80px]">
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => { if (!isLoading) void sendMessage(s); }}
                    className="text-xs px-3 py-1.5 rounded-full bg-primary/5 dark:bg-primary/10 text-primary dark:text-primary-light border border-primary/20 dark:border-primary/30 hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-br-sm'
                      : 'bg-card border border-border text-foreground rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-card border border-border px-3 py-2 rounded-2xl rounded-bl-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 sticky bottom-0 pb-2 bg-background">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Введите вопрос…"
              className="flex-1 text-sm px-4 py-2.5 rounded-2xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center disabled:opacity-40 transition-all duration-200 hover:bg-primary-light active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
