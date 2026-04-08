import { useRef, useState } from 'react';
import { Plus, Mic, Sparkles, X, ArrowUp } from 'lucide-react';
import { parseNaturalLanguage, findBestMatch } from '../../db/ai';
import { useCategories } from '../hooks/useCategories';
import { useTransactions } from '../hooks/useTransactions';
import { useNotifications } from '../hooks/useNotifications';

interface QuickActionBarProps {
  onOpenForm: () => void;
}

export const QuickActionBar: React.FC<QuickActionBarProps> = ({ onOpenForm }) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockProgress, setLockProgress] = useState(0); // 0–1

  const recognitionRef = useRef<any>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pointerStartY = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const longPressFired = useRef(false);
  const isHolding = useRef(false);
  // Refs mirror state so gesture handlers always read fresh values
  const isRecordingRef = useRef(false);
  const isLockedRef = useRef(false);

  const { categories } = useCategories();
  const { add } = useTransactions();
  const { notifyTransaction } = useNotifications();

  const SpeechRecognitionAPI =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  // ── Voice ──────────────────────────────────────────────────────────────────

  const startRecording = () => {
    if (!SpeechRecognitionAPI) return;
    const r = new SpeechRecognitionAPI();
    r.lang = 'ru-RU';
    r.interimResults = true;
    r.continuous = true;

    r.onresult = (e: any) => {
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      setText(transcript);
    };

    r.onerror = () => stopRecording(false);
    r.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = r;
    r.start();
    isRecordingRef.current = true;
    setIsRecording(true);
  };

  const stopRecording = (keepText = true) => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    isRecordingRef.current = false;
    isLockedRef.current = false;
    setIsRecording(false);
    setIsLocked(false);
    setLockProgress(0);
    if (!keepText) setText('');
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const t = text.trim();
    if (!t) return;

    const parsed = parseNaturalLanguage(t);
    if (!parsed) return;

    const match = await findBestMatch(t);
    const category =
      match
        ? categories.find(c => c.id === match.pattern.categoryId)
        : categories.find(c => c.type === parsed.type);

    await add({
      amount: parsed.amount,
      type: parsed.type,
      categoryId: category?.id ?? categories[0]?.id,
      date: Date.now(),
      comment: parsed.comment,
      currency: parsed.currency || 'RUB',
      rate: 1,
    });

    notifyTransaction(parsed.type, parsed.amount, category?.name ?? 'Без категории');
    setText('');
  };

  // ── Gesture handlers ────────────────────────────────────────────────────────

  const handlePointerDown = (e: React.PointerEvent) => {
    // If locked → clicking stops recording (handled by onClick)
    if (isLocked) return;

    longPressFired.current = false;
    isHolding.current = true;
    pointerStartY.current = e.clientY;

    // Capture pointer so move/up events follow finger even outside button
    buttonRef.current?.setPointerCapture(e.pointerId);

    longPressTimer.current = setTimeout(() => {
      if (isHolding.current) {
        longPressFired.current = true;
        startRecording();
      }
    }, 250);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isRecording || isLocked) return;

    const deltaY = pointerStartY.current - e.clientY; // positive = moved up
    const progress = Math.max(0, Math.min(1, deltaY / 60));
    setLockProgress(progress);

    if (deltaY > 55) {
      // Lock: keep recording without holding
      isLockedRef.current = true;
      setIsLocked(true);
      setLockProgress(0);
    }
  };

  const handlePointerUp = (_e: React.PointerEvent) => {
    clearTimeout(longPressTimer.current);
    isHolding.current = false;

    if (isLockedRef.current) return; // keep recording until user taps

    if (isRecordingRef.current) {
      stopRecording(true); // stop and keep transcript
    }
  };

  const handleClick = () => {
    if (longPressFired.current) {
      // Long-press already handled recording start; suppress click
      return;
    }
    if (isLockedRef.current) {
      stopRecording(true);
      return;
    }
    if (isRecordingRef.current) return;

    if (text.trim()) {
      handleSubmit();
    } else {
      onOpenForm();
    }
  };

  // ── UI helpers ─────────────────────────────────────────────────────────────

  const btnClass = isRecording
    ? 'bg-gradient-to-br from-red-500 to-rose-600'
    : 'bg-gradient-to-br from-violet-600 to-indigo-700';

  const BtnIcon = isRecording ? Mic : text.trim() ? Sparkles : Plus;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 px-3 py-2 pointer-events-none">
      {/* Lock / hint indicators */}
      {isRecording && !isLocked && lockProgress > 0.15 && (
        <div className="flex justify-center mb-2 pointer-events-none">
          <div
            className="flex items-center gap-1.5 px-3 py-1 bg-card border border-border rounded-full text-xs text-muted-foreground"
            style={{ opacity: lockProgress }}
          >
            <ArrowUp className="w-3 h-3" />
            Тяните вверх для фиксации
          </div>
        </div>
      )}

      {isLocked && (
        <div className="flex justify-center mb-2 pointer-events-none">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-950 rounded-full text-xs text-red-500 border border-red-200 dark:border-red-800">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Запись • нажмите чтобы остановить
          </div>
        </div>
      )}

      {/* Bar */}
      <div className="flex items-center gap-2 max-w-md mx-auto pointer-events-auto">
        {/* Text field */}
        <div
          className={`flex-1 flex items-center gap-2 bg-card border rounded-full px-4 py-2.5 transition-colors ${
            isRecording ? 'border-red-400 dark:border-red-600' : 'border-border'
          }`}
        >
          {isRecording && (
            <div className="w-2 h-2 shrink-0 rounded-full bg-red-500 animate-pulse" />
          )}
          <input
            type="text"
            placeholder={isRecording ? 'Говорите...' : 'Быстрый ввод...'}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !isRecording && handleSubmit()}
            readOnly={isRecording}
            className="flex-1 min-w-0 bg-transparent outline-none text-sm"
          />
          {text && !isRecording && (
            <button onClick={() => setText('')} className="shrink-0 text-muted-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action button */}
        <div className="relative shrink-0">
          {/* Pulse rings while recording */}
          {isRecording && (
            <>
              <div className="absolute inset-0 rounded-full bg-red-400 opacity-25 animate-ping scale-150" />
              <div
                className="absolute inset-0 rounded-full bg-red-300 opacity-20 animate-ping scale-125"
                style={{ animationDelay: '0.25s' }}
              />
            </>
          )}

          <button
            ref={buttonRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={handleClick}
            className={`relative w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-150 active:scale-90 select-none touch-none ${btnClass} text-white`}
            style={{
              // Grow slightly when lock progress builds up
              transform: lockProgress > 0 ? `scale(${1 + lockProgress * 0.15})` : undefined,
            }}
          >
            <BtnIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
