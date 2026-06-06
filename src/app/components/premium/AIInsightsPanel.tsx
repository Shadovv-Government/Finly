import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Sparkles, WifiOff } from 'lucide-react';
import { buildAIContext } from '../../../db/premium';

export const AIInsightsPanel = () => {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);

  const generateReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ctx = await buildAIContext();
      const ctxStr = JSON.stringify(ctx, null, 2);

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Ты финансовый аналитик приложения Finly. Вот данные пользователя за неделю:\n\n${ctxStr}\n\nНапиши краткий отчёт (3-5 абзацев): главные тренды, сравнение с прошлым периодом, аномалии, предупреждения, советы по улучшению. Используй цифры из данных. Пиши на русском.`,
          }],
        }),
      });

      if (!response.ok) throw new Error('AI сервис недоступен');
      const data = await response.json();
      setReport(data.content || 'Не удалось сгенерировать отчёт');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }, []);

  const askQuestion = useCallback(async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const ctx = await buildAIContext();
      const ctxStr = JSON.stringify(ctx, null, 2);

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Ты финансовый аналитик. Вот данные пользователя:\n\n${ctxStr}\n\nВопрос пользователя: ${question}\n\nОтветь кратко и по делу, с конкретными цифрами. На русском.`,
          }],
        }),
      });

      if (!response.ok) throw new Error('AI сервис недоступен');
      const data = await response.json();
      setAnswer(data.content || 'Не удалось получить ответ');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }, [question]);

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (!isOnline) {
    return (
      <div className="card-premium p-5 text-center">
        <WifiOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Для AI-инсайтов нужен интернет</p>
        <p className="text-xs text-muted-foreground mt-1">Остальная аналитика работает офлайн</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Report */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="card-premium p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            Еженедельный AI-отчёт
          </h3>
          {!report && !loading && (
            <button
              onClick={generateReport}
              className="w-full py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors"
            >
              Сгенерировать отчёт
            </button>
          )}
          {loading && (
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
            </div>
          )}
          {report && (
            <div className="text-sm whitespace-pre-line">{report}</div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </motion.div>

      {/* Ask Question */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="card-premium p-5">
          <h3 className="font-semibold mb-3">Спроси о своих финансах</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Например: на чём я могу сэкономить?"
              className="flex-1 px-4 py-2 bg-muted rounded-xl text-sm outline-none border border-border focus:border-purple-500 transition-colors"
              onKeyDown={e => e.key === 'Enter' && askQuestion()}
            />
            <button
              onClick={askQuestion}
              disabled={loading || !question.trim()}
              className="px-4 py-2 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors disabled:opacity-50"
            >
              {loading ? '...' : '→'}
            </button>
          </div>
          {answer && (
            <div className="mt-4 p-3 bg-muted rounded-xl text-sm whitespace-pre-line">
              {answer}
            </div>
          )}
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>
      </motion.div>
    </div>
  );
};
