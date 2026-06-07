import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { Sparkles, WifiOff, Send, Loader2, AlertTriangle, TrendingDown, Lightbulb, TrendingUp, Trash2 } from 'lucide-react';
import { useAIInsights } from '../../hooks/useAIInsights';
import { useAIChat } from '../../hooks/useAIChat';
import { buildAIContext } from '../../../db/premium';

// ── Insight cards ────────────────────────────────────────────────────────────

const INSIGHT_CONFIG = {
  alert:    { Icon: AlertTriangle, color: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-950/40' },
  warning:  { Icon: TrendingDown,  color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950/40' },
  tip:      { Icon: Lightbulb,     color: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-950/40' },
  positive: { Icon: TrendingUp,    color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
} as const;

// ── Markdown renderer ────────────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  const parseBold = (s: string): React.ReactNode => {
    const parts = s.split(/\*\*(.*?)\*\*/g);
    if (parts.length === 1) return s;
    return parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p);
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    elements.push(
      <ul key={key++} className="list-disc list-inside space-y-1 my-2 text-sm">
        {listItems.map((item, i) => <li key={i}>{parseBold(item)}</li>)}
      </ul>
    );
    listItems = [];
  };

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flushList();
      elements.push(<h4 key={key++} className="font-semibold text-sm mt-3 mb-1">{parseBold(line.slice(3))}</h4>);
    } else if (line.startsWith('# ')) {
      flushList();
      elements.push(<h3 key={key++} className="font-bold text-base mt-3 mb-1">{parseBold(line.slice(2))}</h3>);
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      listItems.push(line.slice(2));
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      elements.push(<p key={key++} className="text-sm mb-2 leading-relaxed">{parseBold(line)}</p>);
    }
  }
  flushList();
  return elements;
}

// ── Chat suggestion pills ─────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Мой баланс',
  'Расходы за месяц',
  'Состояние бюджетов',
  'Мои цели',
  'Прогноз до конца месяца',
];

// ── Main component ───────────────────────────────────────────────────────────

export const AIInsightsPanel = () => {
  const { loading: insightsLoading, insights } = useAIInsights();
  const { messages, isLoading: chatLoading, isOffline, sendMessage, clearHistory } = useAIChat();
  const [input, setInput] = useState('');
  const [report, setReport] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || chatLoading) return;
    setInput('');
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const generateReport = useCallback(async () => {
    setReportLoading(true);
    setReportError(null);
    try {
      const ctx = await buildAIContext();
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Ты финансовый аналитик приложения Finly. Вот данные пользователя:\n\n${JSON.stringify(ctx, null, 2)}\n\nНапиши краткий отчёт (3-5 абзацев): главные тренды, сравнение с прошлым периодом, аномалии, предупреждения, советы. Используй цифры из данных. На русском. Markdown: **жирный** для важных цифр, ## для разделов, - для списков.`,
          }],
        }),
      });
      if (!response.ok) throw new Error('AI сервис недоступен');
      const data = await response.json();
      setReport(data.content || 'Не удалось сгенерировать отчёт');
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setReportLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">

      {/* ── Insights ──────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="card-premium p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              Инсайты
            </h3>
            {!insightsLoading && insights.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {insights.length}
              </span>
            )}
          </div>

          {insightsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : insights.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Всё выглядит хорошо — нет тревожных сигналов
            </p>
          ) : (
            <div className="space-y-2">
              {insights.map(insight => {
                const cfg = INSIGHT_CONFIG[insight.type];
                return (
                  <div key={insight.id} className="flex gap-3 p-3 bg-card border border-border rounded-2xl">
                    <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                      <cfg.Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold mb-0.5">{insight.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Chat ──────────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="card-premium p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Спросить AI</h3>
            <div className="flex items-center gap-2">
              {isOffline && (
                <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                  <WifiOff className="w-3 h-3" />
                  офлайн
                </span>
              )}
              {messages.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                  title="Очистить историю"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="max-h-[320px] overflow-y-auto mb-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => { if (!chatLoading) void sendMessage(s); }}
                    className="text-xs px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[82%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  }`}
                >
                  {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                  {msg.isOffline && (
                    <span className="block text-[10px] opacity-60 mt-1">офлайн-ответ</span>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-muted px-3 py-2 rounded-2xl rounded-bl-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Введите вопрос…"
              disabled={chatLoading}
              className="flex-1 text-sm px-4 py-2.5 rounded-2xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-purple-500/40 placeholder:text-muted-foreground"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || chatLoading}
              className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 active:scale-95 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Weekly report (premium-only) ──────────────────────────────────── */}
      {isOnline && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="card-premium p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              Еженедельный AI-отчёт
            </h3>
            {!report && !reportLoading && (
              <button
                onClick={generateReport}
                className="w-full py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 active:scale-[0.98] transition-all"
              >
                Сгенерировать отчёт
              </button>
            )}
            {reportLoading && (
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
              </div>
            )}
            {report && (
              <>
                <div>{renderMarkdown(report)}</div>
                <button
                  onClick={() => setReport(null)}
                  className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Обновить отчёт
                </button>
              </>
            )}
            {reportError && <p className="text-sm text-red-500">{reportError}</p>}
          </div>
        </motion.div>
      )}

      {!isOnline && (
        <div className="card-premium p-5 text-center">
          <WifiOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">AI-отчёт требует интернета</p>
          <p className="text-xs text-muted-foreground mt-1">Инсайты и чат работают офлайн</p>
        </div>
      )}
    </div>
  );
};
