import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Send, Sparkles, MessageSquare, Brain, Wallet } from 'lucide-react';
import { parseNaturalLanguage, findBestMatch, inferCategoryId } from '../../db/ai';
import { useMLModel } from '../hooks/useMLModel';
import { useCategories } from '../hooks/useCategories';
import { useTransactions } from '../hooks/useTransactions';
import { useNotifications } from '../hooks/useNotifications';
import { useBudgetNotifications } from '../hooks/useBudgetNotifications';
import { Category } from '../../db/types';
import { formatDateInputValue, parseDateInputValue } from '../utils/formatCurrency';
import { getLucideIcon } from '../utils/lucideIcons';
import { ensureMicPermission, getSpeechErrorMessage, revokeMicPermissionCache } from '../hooks/useSpeechInput';

interface ParsedResult {
  amount: number;
  amountStr: string;       // raw input string — avoids number→string rounding artifacts
  needsAmount?: boolean;  // true when no number was found in input — show editable field
  type: 'income' | 'expense';
  comment?: string;
  rawText: string;  // original input — used for ML feedback even when comment is stripped
  currency: string;
  category?: Category;
  date?: number;
  mlConfidence?: number;
  top3?: Array<{ categoryName: string; prob: number }>;
}

function CategoryIcon({ name, className, color }: { name: string; className?: string; color?: string }) {
  const IconComponent = getLucideIcon(name, Wallet);
  return <IconComponent className={className} style={{ color }} />;
}

interface AIQuickInputProps {
  onClose: () => void;
  autoStartVoice?: boolean;
}

export const AIQuickInput: React.FC<AIQuickInputProps> = ({
  onClose,
  autoStartVoice = false,
}) => {
  const [mode, setMode] = useState<'voice' | 'chat'>('voice');
  const [isRecording, setIsRecording] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [statusText, setStatusText] = useState('Нажмите для записи');
  const [countdown, setCountdown] = useState<number | null>(null);

  const recognitionRef = useRef<any>(null);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingResultRef = useRef<ParsedResult | null>(null);
  const didAutoStartVoiceRef = useRef(false);
  const liveTranscriptRef = useRef('');
  const shouldProcessOnEndRef = useRef(false);
  const hasProcessedTranscriptRef = useRef(false);

  const { categories } = useCategories();
  const { add } = useTransactions();
  const { notify, notifyTransaction } = useNotifications();
  const { checkBudgets } = useBudgetNotifications();
  const { classify, recordUserChoice } = useMLModel();

  const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const hasVoice = !!SpeechRecognitionAPI;

  // Очищаем таймеры при анмаунте
  useEffect(() => {
    return () => {
      clearAutoSubmit();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const clearAutoSubmit = () => {
    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null; }
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    setCountdown(null);
  };

  // Сохранение транзакции (принимает result напрямую для авто-отправки)
  const doSave = useCallback(async (result: ParsedResult) => {
    clearAutoSubmit();
    if (!result.amount) {
      notify('Укажите сумму', 'Введите сумму перед сохранением');
      return;
    }
    setIsAdding(true);
    try {
      const fallbackId = result.type === 'expense' ? 'cat_other_expense' : 'inc_other';
      let category =
        result.category ??
        categories.find(c => c.id === fallbackId) ??
        categories.find(c => c.name === 'Другое' && c.type === result.type);
        
      if (!category) {
        category = categories.find(c => c.type === result.type);
      }


      // Защита: если ни ML, ни system fallback не дали категорию — НЕ сохраняем
      // в первую попавшуюся (раньше так все молча уходило в "Еда").
      if (!category) {
        notify('Категория не определена', 'Попробуйте уточнить описание операции');
        setIsAdding(false);
        return;
      }

      await add({
        amount: result.amount,
        type: result.type,
        categoryId: category.id,
        date: result.date ?? Date.now(),
        comment: result.comment,
        currency: result.currency,
        rate: 1,
      });
      notifyTransaction(result.type, result.amount, category?.name ?? 'Без категории');
      await checkBudgets();

      // Feed the user's confirmed/corrected category back into the classifier.
      // Prefer stripped comment (no amount/date noise), fall back to raw input text.
      const feedbackText = result.comment || result.rawText;
      if (feedbackText && category) {
        recordUserChoice(
          feedbackText,
          category.name,
          result.type,
          result.amount,
          result.date ? new Date(result.date) : undefined,
        );
      }

      onClose();
    } catch {
      notify('Не удалось сохранить операцию', 'Попробуйте ещё раз');
      setIsAdding(false);
    }
  }, [categories, add, notify, notifyTransaction, checkBudgets, onClose, recordUserChoice]);

  const handleSave = () => {
    if (parsedResult) doSave(parsedResult);
  };

  const handleCategorySelect = (categoryName: string) => {
    const selected = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
    if (selected) setParsedResult(prev => prev ? { ...prev, category: selected } : null);
  };

  // Запускаем обратный отсчёт и авто-отправку после голосового ввода
  const handleDiscard = () => {
    clearAutoSubmit();
    pendingResultRef.current = null;
    setParsedResult(null);
    setStatusText('Нажмите для записи');
  };

  const buildResult = useCallback(async (text: string, _fromVoice: boolean): Promise<ParsedResult | null> => {
    if (!text.trim()) return null;

    const parsed = parseNaturalLanguage(text);
    // If no amount found, still build a partial result — let user fill it in
    const needsAmount = !parsed;
    const amount = parsed?.amount ?? 0;
    let type: 'income' | 'expense' = parsed?.type ?? 'expense';

    let category: Category | undefined;
    let mlConfidence: number | undefined;

    const mlInput = parsed?.comment ?? text;
    const mlResult = await classify(mlInput, amount || undefined, parsed?.date ? new Date(parsed.date) : undefined);
    if (mlResult && mlResult.confidence > 0.4) {
      category = categories.find(c => c.name.toLowerCase() === mlResult.categoryName.toLowerCase());
      mlConfidence = mlResult.confidence;
      if (type === 'expense' && mlResult.type === 'income') {
        const hasIncomeHint = /получил|получила|пришла|зп|зарплата|доход|подарок|возврат/i.test(text);
        if (hasIncomeHint) type = mlResult.type;
      }
    }

    if (!category) {
      const match = await findBestMatch(text);
      if (match) {
        category = categories.find(c => c.id === match.pattern.categoryId);
      }
    }

    if (!category) {
      const catId = inferCategoryId(mlInput, type);
      if (catId) category = categories.find(c => c.id === catId);
    }

    if (!category) {
      const fallbackId = type === 'expense' ? 'cat_other_expense' : 'inc_other';
      category = categories.find(c => c.id === fallbackId);
    }

    const top3 = mlResult?.top3?.filter(t => t.categoryName !== 'Uncategorized');

    return {
      amount,
      amountStr: amount > 0 ? String(amount) : '',
      needsAmount,
      type,
      comment: parsed?.comment,
      rawText: text,
      currency: parsed?.currency || 'RUB',
      category,
      date: parsed?.date,
      mlConfidence,
      top3,
    };
  }, [categories, classify]);

  const parseText = useCallback(async (text: string, fromVoice = false) => {
    const result = await buildResult(text, fromVoice);
    if (!result) {
      setStatusText('Не удалось распознать. Попробуйте ещё раз.');
      return;
    }
    setParsedResult(result);
    if (fromVoice) {
      clearAutoSubmit();
      pendingResultRef.current = result;
      setStatusText('Проверьте результат и нажмите "Добавить"');
    }
  }, [buildResult]);

  const processVoiceTranscript = useCallback(async (transcript: string) => {
    const normalizedTranscript = transcript.trim();
    if (!normalizedTranscript || hasProcessedTranscriptRef.current) return;
    hasProcessedTranscriptRef.current = true;
    await parseText(normalizedTranscript, true);
  }, [parseText]);

  const startRecording = useCallback(async () => {
    if (!hasVoice) return;

    // Запрос микрофона (однократно, с учётом платформы)
    const hasPermission = await ensureMicPermission();
    if (!hasPermission) {
      setStatusText(getSpeechErrorMessage('not-allowed'));
      return;
    }

    liveTranscriptRef.current = '';
    shouldProcessOnEndRef.current = false;
    hasProcessedTranscriptRef.current = false;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'ru-RU';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join('');
      liveTranscriptRef.current = transcript;
      setStatusText(transcript);

      if (e.results[e.results.length - 1].isFinal) {
        shouldProcessOnEndRef.current = false;
        setIsRecording(false);
        processVoiceTranscript(transcript);
      }
    };

    recognition.onerror = (e: any) => {
      recognitionRef.current = null;
      setIsRecording(false);
      const errorType = e?.error || 'unknown';
      if (errorType === 'not-allowed') {
        revokeMicPermissionCache();
      }
      setStatusText(getSpeechErrorMessage(errorType));
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsRecording(false);

      if (!shouldProcessOnEndRef.current) return;

      shouldProcessOnEndRef.current = false;
      const transcript = liveTranscriptRef.current.trim();
      if (!transcript) {
        setStatusText('Не удалось распознать. Попробуйте ещё раз.');
        return;
      }

      void processVoiceTranscript(transcript);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsRecording(true);
      setStatusText('Слушаю...');
    } catch {
      // Синхронное исключение при start() — бывает на Android
      revokeMicPermissionCache();
      recognitionRef.current = null;
      setStatusText(getSpeechErrorMessage('not-allowed'));
    }
  }, [SpeechRecognitionAPI, hasVoice, processVoiceTranscript]);

  const stopRecording = () => {
    shouldProcessOnEndRef.current = true;
    recognitionRef.current?.stop();
    setIsRecording(false);
    setStatusText('Обработка записи...');
  };

  useEffect(() => {
    if (!autoStartVoice || !hasVoice || didAutoStartVoiceRef.current) return;
    didAutoStartVoiceRef.current = true;
    setMode('voice');
    startRecording();
  }, [autoStartVoice, hasVoice, startRecording]);

  const handleMicPress = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput('');
    await parseText(text, false);
  };

  const switchMode = (m: 'voice' | 'chat') => {
    clearAutoSubmit();
    pendingResultRef.current = null;
    setMode(m);
    setParsedResult(null);
    setStatusText('Нажмите для записи');
    if (isRecording) stopRecording();
  };

  return (
    <div className="flex flex-col items-center px-4 pb-8 pt-2">
      {/* Mode Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6 w-full max-w-xs">
        <button
          onClick={() => switchMode('voice')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'voice' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'
          }`}
        >
          <Mic className="w-4 h-4" />
          Голос
        </button>
        <button
          onClick={() => switchMode('chat')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'chat' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Текст
        </button>
      </div>

      {/* Parsed Result Preview */}
      {parsedResult && (
        <div className="w-full mb-6 bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-violet-600" />
            <span className="text-sm font-medium text-violet-600">Распознано</span>
            {parsedResult.mlConfidence !== undefined && (
              <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                <Brain className="w-3 h-3" />
                ML {Math.round(parsedResult.mlConfidence * 100)}%
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mb-2">
            {parsedResult.needsAmount ? (
              <div className="flex flex-col gap-1 flex-1">
                {parsedResult.rawText ? (
                  <p className="text-xs text-muted-foreground truncate">«{parsedResult.rawText}»</p>
                ) : null}
                <div className="flex items-center gap-1">
                  <span className={`text-2xl font-bold ${parsedResult.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>
                    {parsedResult.type === 'expense' ? '−' : '+'}
                  </span>
                  <input
                    autoFocus
                    type="tel"
                    inputMode="decimal"
                    placeholder="0"
                    value={parsedResult.amountStr}
                    onChange={e => {
                      const raw = e.target.value;
                      const val = parseFloat(raw.replace(',', '.')) || 0;
                      setParsedResult(prev => prev ? { ...prev, amount: val, amountStr: raw } : null);
                    }}
                    className={`text-2xl font-bold w-28 bg-transparent border-b-2 border-violet-400 focus:outline-none placeholder:text-muted-foreground ${parsedResult.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}
                  />
                  <span className="text-2xl font-bold text-muted-foreground">₽</span>
                </div>
              </div>
            ) : (
              <span className={`text-2xl font-bold ${parsedResult.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>
                {parsedResult.type === 'expense' ? '−' : '+'}
                {parsedResult.amount.toLocaleString('ru-RU')} ₽
              </span>
            )}
            {parsedResult.category && (
              <div
                className="flex items-center gap-2 px-3 py-1 rounded-xl"
                style={{ backgroundColor: parsedResult.category.color + '20' }}
              >
                <CategoryIcon
                  name={parsedResult.category.icon}
                  className="w-4 h-4"
                  color={parsedResult.category.color}
                />
                <span className="text-sm">{parsedResult.category.name}</span>
              </div>
            )}
          </div>
          {parsedResult.top3 && parsedResult.top3.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-3 mt-1">
              {!parsedResult.mlConfidence && (
                <span className="w-full text-xs text-muted-foreground mb-1">Возможно, это:</span>
              )}
              {parsedResult.top3.map(({ categoryName, prob }) => {
                const cat = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
                const isSelected = parsedResult.category?.name.toLowerCase() === categoryName.toLowerCase();
                return (
                  <button
                    key={categoryName}
                    onClick={() => handleCategorySelect(categoryName)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-all ${
                      isSelected
                        ? 'ring-2 ring-violet-600 bg-violet-50 dark:bg-violet-950'
                        : 'bg-muted hover:bg-accent'
                    }`}
                  >
                    {cat && <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" color={cat.color} />}
                    <span>{categoryName}</span>
                    <span className="text-xs text-muted-foreground">{Math.round(prob * 100)}%</span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between gap-2 mb-2">
            {parsedResult.comment && (
              <p className="text-sm text-muted-foreground">{parsedResult.comment}</p>
            )}
            <input
              aria-label="Дата операции"
              type="date"
              value={formatDateInputValue(parsedResult.date ?? Date.now())}
              onChange={e => {
                const newDate = parseDateInputValue(e.target.value).getTime();
                setParsedResult(prev => prev ? { ...prev, date: newDate } : null);
              }}
              className="text-xs bg-transparent border-b border-dashed border-muted-foreground/50 text-muted-foreground focus:outline-none focus:border-primary text-right flex-shrink-0"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleDiscard}
              className="flex-1 py-2.5 bg-muted rounded-xl text-sm font-medium"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={isAdding || !parsedResult.amount}
              className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-60 transition-all"
            >
              {isAdding
                ? 'Добавление...'
                : countdown !== null
                ? `Добавить (${countdown})`
                : 'Добавить'}
            </button>
          </div>
        </div>
      )}

      {/* Voice Mode */}
      {mode === 'voice' && !parsedResult && (
        <div className="flex flex-col items-center gap-6 py-4">
          <style>{`
            @keyframes voiceBar {
              0%   { transform: scaleY(0.15); }
              100% { transform: scaleY(1); }
            }
          `}</style>
          <div className="flex flex-col items-center gap-5">
            <button
              onClick={handleMicPress}
              aria-label={isRecording ? 'Остановить запись' : 'Начать запись'}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 active:scale-95 ${
                isRecording
                  ? 'bg-gradient-to-br from-violet-500 to-indigo-600 scale-110'
                  : 'bg-gradient-to-br from-violet-600 to-indigo-700'
              }`}
            >
              <Mic className="w-9 h-9 text-white" />
            </button>

            {/* Sound bars — Perplexity style */}
            <div className="flex items-center gap-[5px]" style={{ height: '48px' }}>
              {[
                { maxH: 14, dur: 820, delay: 0 },
                { maxH: 22, dur: 650, delay: 120 },
                { maxH: 34, dur: 740, delay: 55 },
                { maxH: 44, dur: 600, delay: 200 },
                { maxH: 48, dur: 700, delay: 80 },
                { maxH: 44, dur: 620, delay: 160 },
                { maxH: 34, dur: 760, delay: 40 },
                { maxH: 22, dur: 680, delay: 220 },
                { maxH: 14, dur: 840, delay: 100 },
              ].map(({ maxH, dur, delay }, i) => (
                <div
                  key={i}
                  style={{
                    width: '3px',
                    height: `${maxH}px`,
                    borderRadius: '2px',
                    backgroundColor: isRecording ? 'rgb(139, 92, 246)' : 'rgb(196, 181, 253)',
                    transformOrigin: 'center',
                    animation: isRecording
                      ? `voiceBar ${dur}ms ease-in-out ${delay}ms infinite alternate`
                      : 'none',
                    transform: isRecording ? undefined : 'scaleY(0.18)',
                    transition: isRecording ? undefined : 'transform 0.4s ease, background-color 0.3s',
                  }}
                />
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground text-center max-w-[220px] min-h-[40px]">
            {hasVoice ? statusText : 'Голосовой ввод не поддерживается в этом браузере'}
          </p>
        </div>
      )}

      {/* Chat Mode */}
      {mode === 'chat' && !parsedResult && (
        <div className="w-full py-4">
          <p className="text-sm text-muted-foreground text-center mb-5">
            Опишите операцию в свободной форме
          </p>
          <div className="relative">
            <input
              aria-label="Описание операции"
              type="text"
              placeholder="кофе 450 рублей в Старбаксе…"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleChatSend()}
              className="w-full px-4 py-3 pr-12 bg-muted rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-sm"
            />
            <button
              onClick={handleChatSend}
              aria-label="Отправить описание"
              disabled={!chatInput.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-600 disabled:text-muted-foreground transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
