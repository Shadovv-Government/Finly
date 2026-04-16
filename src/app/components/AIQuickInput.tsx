import { useState, useRef } from 'react';
import { Mic, MicOff, Send, Sparkles, MessageSquare, Brain } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { parseNaturalLanguage, findBestMatch } from '../../db/ai';
import { useMLModel } from '../hooks/useMLModel';
import { useCategories } from '../hooks/useCategories';
import { useTransactions } from '../hooks/useTransactions';
import { useNotifications } from '../hooks/useNotifications';
import { useBudgetNotifications } from '../hooks/useBudgetNotifications';
import { Category } from '../../db/types';

interface ParsedResult {
  amount: number;
  type: 'income' | 'expense';
  comment?: string;
  currency: string;
  category?: Category;
  date?: number;
  mlConfidence?: number;
}

function CategoryIcon({ name, className, color }: { name: string; className?: string; color?: string }) {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;
  const IconComponent = Object.prototype.hasOwnProperty.call(icons, name) ? icons[name] : LucideIcons.Wallet;
  return <IconComponent className={className} style={{ color }} />;
}

interface AIQuickInputProps {
  onClose: () => void;
}

export const AIQuickInput: React.FC<AIQuickInputProps> = ({ onClose }) => {
  const [mode, setMode] = useState<'voice' | 'chat'>('voice');
  const [isRecording, setIsRecording] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [statusText, setStatusText] = useState('Нажмите для записи');

  const recognitionRef = useRef<any>(null);
  const { categories } = useCategories();
  const { add } = useTransactions();
  const { notifyTransaction } = useNotifications();
  const { checkBudgets } = useBudgetNotifications();
  const { ready: mlReady, classify } = useMLModel();

  const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const hasVoice = !!SpeechRecognitionAPI;

  const parseText = async (text: string) => {
    const parsed = parseNaturalLanguage(text);
    if (!parsed) {
      setStatusText('Не удалось распознать. Попробуйте ещё раз.');
      return;
    }

    let category: Category | undefined;
    let mlConfidence: number | undefined;
    let type = parsed.type;

    // Пробуем ML модель (если загружена)
    const mlResult = mlReady ? classify(parsed.comment ?? text) : null;

    if (mlResult && mlResult.confidence > 0.4) {
      // Ищем категорию по имени (ML возвращает русское название)
      category = categories.find(
        c => c.name.toLowerCase() === mlResult.categoryName.toLowerCase(),
      );
      mlConfidence = mlResult.confidence;
      // Тип из ML перекрывает keyword-detection только если нет явных ключевых слов
      if (parsed.type === 'expense' && mlResult.type === 'income') {
        // Проверяем, были ли явные income-ключевые слова — если нет, доверяем ML
        const hasIncomeHint = /получил|получила|пришла|зп|зарплата|доход|подарок|возврат/i.test(text);
        if (!hasIncomeHint) type = mlResult.type;
      }
    }

    // Fallback: rule-based паттерны из БД
    if (!category) {
      const match = await findBestMatch(text);
      category = match
        ? categories.find(c => c.id === match.pattern.categoryId)
        : categories.find(c => c.type === type);
    }

    setParsedResult({
      amount: parsed.amount,
      type,
      comment: parsed.comment,
      currency: parsed.currency || 'RUB',
      category,
      date: parsed.date,
      mlConfidence,
    });
  };

  const startRecording = () => {
    if (!hasVoice) return;
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'ru-RU';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join('');
      setStatusText(transcript);

      if (e.results[e.results.length - 1].isFinal) {
        parseText(transcript);
        setIsRecording(false);
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
      setStatusText('Ошибка. Попробуйте ещё раз.');
    };

    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setStatusText('Слушаю...');
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const handleMicPress = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput('');
    await parseText(text);
  };

  const handleSave = async () => {
    if (!parsedResult) return;
    setIsAdding(true);
    try {
      const category = parsedResult.category ?? categories.find(c => c.type === parsedResult.type);
      await add({
        amount: parsedResult.amount,
        type: parsedResult.type,
        categoryId: category?.id ?? categories[0]?.id,
        date: parsedResult.date ?? Date.now(),
        comment: parsedResult.comment,
        currency: parsedResult.currency,
        rate: 1,
      });
      notifyTransaction(parsedResult.type, parsedResult.amount, category?.name ?? 'Без категории');

      // Проверяем бюджеты и отправляем push-уведомления
      await checkBudgets();

      onClose();
    } catch {
      setIsAdding(false);
    }
  };

  const handleDiscard = () => {
    setParsedResult(null);
    setStatusText('Нажмите для записи');
  };

  const switchMode = (m: 'voice' | 'chat') => {
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
            <span
              className={`text-2xl font-bold ${
                parsedResult.type === 'expense' ? 'text-red-500' : 'text-green-500'
              }`}
            >
              {parsedResult.type === 'expense' ? '−' : '+'}
              {parsedResult.amount.toLocaleString('ru-RU')} ₽
            </span>
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
          {(parsedResult.comment || parsedResult.date) && (
            <div className="flex items-center justify-between gap-2 mb-1">
              {parsedResult.comment && (
                <p className="text-sm text-muted-foreground">{parsedResult.comment}</p>
              )}
              {parsedResult.date && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(parsedResult.date).toLocaleDateString('ru-RU', {
                    day: 'numeric', month: 'short',
                  })}
                </span>
              )}
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleDiscard}
              className="flex-1 py-2.5 bg-muted rounded-xl text-sm font-medium"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={isAdding}
              className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-60"
            >
              {isAdding ? 'Добавление...' : 'Добавить'}
            </button>
          </div>
        </div>
      )}

      {/* Voice Mode */}
      {mode === 'voice' && !parsedResult && (
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="relative flex items-center justify-center">
            {isRecording && (
              <>
                <div className="absolute w-36 h-36 rounded-full bg-violet-400/20 animate-ping" />
                <div
                  className="absolute w-28 h-28 rounded-full bg-violet-400/30 animate-ping"
                  style={{ animationDelay: '0.2s' }}
                />
              </>
            )}
            <button
              onClick={handleMicPress}
              className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 active:scale-95 ${
                isRecording
                  ? 'bg-gradient-to-br from-red-500 to-rose-600'
                  : 'bg-gradient-to-br from-violet-600 to-indigo-700'
              }`}
            >
              {isRecording ? (
                <MicOff className="w-10 h-10 text-white" />
              ) : (
                <Mic className="w-10 h-10 text-white" />
              )}
            </button>
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
              type="text"
              placeholder="кофе 450 рублей в Старбаксе..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleChatSend()}
              autoFocus
              className="w-full px-4 py-3 pr-12 bg-muted rounded-xl outline-none focus:ring-2 focus:ring-violet-600 text-sm"
            />
            <button
              onClick={handleChatSend}
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
