import { useRef, useState } from 'react';
import { Plus, Mic, Sparkles, X, ArrowUp, Trash2 } from 'lucide-react';
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
  const [swipeOffset, setSwipeOffset] = useState(0);

  const recognitionRef = useRef<any>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const pointerStartY = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const longPressFired = useRef(false);
  const isHolding = useRef(false);
  // Refs mirror state so gesture handlers always read fresh values
  const isRecordingRef = useRef(false);
  const isLockedRef = useRef(false);

  // Swipe refs
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);
  const isSwipingLeft = useRef(false);

  const SWIPE_THRESHOLD = 60;

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

  // ── Mic gesture handlers (on action button) ────────────────────────────────

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isLocked) return;

    longPressFired.current = false;
    isHolding.current = true;
    pointerStartY.current = e.clientY;

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

    const deltaY = pointerStartY.current - e.clientY;
    const progress = Math.max(0, Math.min(1, deltaY / 60));
    setLockProgress(progress);

    if (deltaY > 55) {
      isLockedRef.current = true;
      setIsLocked(true);
      setLockProgress(0);
    }
  };

  const handlePointerUp = (_e: React.PointerEvent) => {
    clearTimeout(longPressTimer.current);
    isHolding.current = false;

    if (isLockedRef.current) return;

    if (isRecordingRef.current) {
      stopRecording(true);
    }
  };

  const handleClick = () => {
    // locked check MUST come before longPressFired — after a long-press lock,
    // longPressFired stays true and would otherwise swallow this tap
    if (isLockedRef.current) {
      stopRecording(true);
      return;
    }
    if (longPressFired.current) return;
    if (isRecordingRef.current) return;

    if (text.trim()) {
      handleSubmit();
    } else {
      onOpenForm();
    }
  };

  // ── Swipe-left-to-delete (on input container) ──────────────────────────────

  const handleInputPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    swipeStartX.current = e.clientX;
    swipeStartY.current = e.clientY;
    isSwipingLeft.current = false;
    inputContainerRef.current?.setPointerCapture(e.pointerId);
  };

  const handleInputPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const deltaX = swipeStartX.current - e.clientX;
    const deltaY = Math.abs(e.clientY - swipeStartY.current);

    if (!isSwipingLeft.current) {
      if (deltaX > 8 && deltaY < 20) {
        isSwipingLeft.current = true;
      } else if (deltaY > 20) {
        return;
      }
    }

    if (isSwipingLeft.current) {
      const offset = Math.max(0, Math.min(SWIPE_THRESHOLD + 16, deltaX));
      setSwipeOffset(offset);
    }
  };

  const handleInputPointerUp = () => {
    if (isSwipingLeft.current && swipeOffset >= SWIPE_THRESHOLD) {
      stopRecording(false);
    }
    setSwipeOffset(0);
    isSwipingLeft.current = false;
  };

  // ── UI helpers ─────────────────────────────────────────────────────────────

  const btnClass = isRecording
    ? 'bg-gradient-to-br from-red-500 to-rose-600'
    : 'bg-gradient-to-br from-violet-600 to-indigo-700';

  const BtnIcon = isRecording ? Mic : text.trim() ? Sparkles : Plus;

  const swipeProgress = Math.min(1, swipeOffset / SWIPE_THRESHOLD);
  const showTrash = swipeOffset > 8;

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
        {/* Input area with swipe-to-delete */}
        <div
          ref={inputContainerRef}
          className="flex-1 relative"
          onPointerDown={handleInputPointerDown}
          onPointerMove={handleInputPointerMove}
          onPointerUp={handleInputPointerUp}
          onPointerCancel={handleInputPointerUp}
        >
          {/* Trash icon revealed behind */}
          {showTrash && (
            <div
              className="absolute inset-y-0 right-0 flex items-center justify-center rounded-full bg-red-500 transition-none"
              style={{
                width: `${Math.max(40, swipeOffset)}px`,
                opacity: swipeProgress,
              }}
            >
              <Trash2
                className="w-4 h-4 text-white"
                style={{ transform: `scale(${0.6 + swipeProgress * 0.4})` }}
              />
            </div>
          )}

          {/* Text field */}
          <div
            className={`flex items-center gap-2 bg-card border rounded-full px-4 py-2.5 transition-colors ${
              isRecording ? 'border-red-400 dark:border-red-600' : 'border-violet-500 dark:border-violet-600'
            }`}
            style={{
              transform: `translateX(-${swipeOffset}px)`,
              transition: swipeOffset === 0 ? 'transform 0.2s ease' : 'none',
            }}
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
              style={{ fontSize: '16px' }}
            />
            {/* Cancel/clear button — visible with text OR while recording */}
            {(text || isRecording) && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  stopRecording(false);
                }}
                className="shrink-0 text-muted-foreground active:text-red-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Action button */}
        <div className="relative shrink-0">
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
