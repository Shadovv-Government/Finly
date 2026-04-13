import { useRef, useState, useEffect } from 'react';
import { Plus, Mic, Sparkles, ArrowUp, Pause, Play, Lock, ChevronUp, Trash2 } from 'lucide-react';
import { parseNaturalLanguage, findBestMatch } from '../../db/ai';
import { useCategories } from '../hooks/useCategories';
import { useTransactions } from '../hooks/useTransactions';
import { useNotifications } from '../hooks/useNotifications';
import { useBudgetNotifications } from '../hooks/useBudgetNotifications';

interface QuickActionBarProps {
  onOpenForm: () => void;
}

const WAVEFORM = [3, 6, 10, 16, 22, 18, 24, 20, 14, 18, 24, 20, 16, 10, 14, 20, 24, 18, 12, 16, 22, 18, 12, 7, 4];

function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes}:${String(seconds).padStart(2, '0')},${String(centiseconds).padStart(2, '0')}`;
}

const VIOLET_GLOW = '0 0 20px rgba(139, 92, 246, 0.55)';
const SHIMMER_BG = 'linear-gradient(270deg, #7c3aed, #a78bfa, #6366f1, #8b5cf6, #7c3aed)';

export const QuickActionBar: React.FC<QuickActionBarProps> = ({ onOpenForm }) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lockProgress, setLockProgress] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const recognitionRef = useRef<any>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef(0);
  const pausedElapsedRef = useRef(0);

  const pointerStartY = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const longPressFired = useRef(false);
  const isHolding = useRef(false);
  const isRecordingRef = useRef(false);
  const isLockedRef = useRef(false);

  const activePointerIdRef = useRef<number | null>(null);
  const lastDeltaYRef = useRef(0);

  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);
  const isSwipingLeft = useRef(false);

  const SWIPE_THRESHOLD = 60;

  const { categories } = useCategories();
  const { add } = useTransactions();
  const { notifyTransaction } = useNotifications();
  const { checkBudgets } = useBudgetNotifications();

  // Restore pointer capture after re-render when recording starts
  useEffect(() => {
    if (isRecording && !isLocked && buttonRef.current && activePointerIdRef.current !== null) {
      try { buttonRef.current.setPointerCapture(activePointerIdRef.current); } catch { /* ignore */ }
    }
  }, [isRecording, isLocked]);

  const SpeechRecognitionAPI =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  // ── Timer ──────────────────────────────────────────────────────────────────

  const startTimer = (fromMs = 0) => {
    clearInterval(timerRef.current);
    startTimeRef.current = Date.now() - fromMs;
    timerRef.current = setInterval(() => setElapsed(Date.now() - startTimeRef.current), 50);
  };

  const stopTimer = () => {
    clearInterval(timerRef.current);
    setElapsed(0);
    pausedElapsedRef.current = 0;
  };

  // ── Voice ──────────────────────────────────────────────────────────────────

  const createRecognition = () => {
    if (!SpeechRecognitionAPI) return null;
    const r = new SpeechRecognitionAPI();
    r.lang = 'ru-RU';
    r.interimResults = true;
    r.continuous = true;
    r.onresult = (e: any) => {
      let t = '';
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setText(t);
    };
    r.onerror = (e: any) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      stopRecording(false);
    };
    r.onend = () => {
      if (isRecordingRef.current && !isLockedRef.current) setIsRecording(false);
    };
    return r;
  };

  const startRecording = () => {
    const r = createRecognition();
    if (!r) return;
    recognitionRef.current = r;
    r.start();
    isRecordingRef.current = true;
    setIsRecording(true);
    setIsPaused(false);
    startTimer(0);
  };

  const stopRecording = (keepText = true) => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    isRecordingRef.current = false;
    isLockedRef.current = false;
    setIsRecording(false);
    setIsLocked(false);
    setIsPaused(false);
    setLockProgress(0);
    stopTimer();
    if (!keepText) setText('');
  };

  const handlePause = () => {
    if (isPaused) {
      // Resume synchronously — stay in gesture context so iOS allows mic access
      const r = createRecognition();
      if (!r) return;
      recognitionRef.current = r;
      startTimer(pausedElapsedRef.current);
      setIsPaused(false);
      try {
        r.start();
      } catch {
        setTimeout(() => { try { r.start(); } catch { /* ignore */ } }, 120);
      }
    } else {
      pausedElapsedRef.current = elapsed;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      clearInterval(timerRef.current);
      setIsPaused(true);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (textOverride?: string) => {
    const t = (textOverride ?? text).trim();
    if (!t) return;
    const parsed = parseNaturalLanguage(t);
    if (!parsed) return;
    const match = await findBestMatch(t);
    const category = match
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
    await checkBudgets();
    setText('');
  };

  const handleSendLocked = () => {
    const captured = text;
    stopRecording(true);
    setTimeout(() => handleSubmit(captured), 0);
  };

  // ── Pointer handlers ───────────────────────────────────────────────────────

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isLocked) return;
    longPressFired.current = false;
    isHolding.current = true;
    pointerStartY.current = e.clientY;
    lastDeltaYRef.current = 0;
    activePointerIdRef.current = e.pointerId;
    buttonRef.current?.setPointerCapture(e.pointerId);
    longPressTimer.current = setTimeout(() => {
      if (isHolding.current) {
        longPressFired.current = true;
        startRecording();
        if (lastDeltaYRef.current > 60) {
          isLockedRef.current = true;
          setIsLocked(true);
        }
      }
    }, 250);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const deltaY = pointerStartY.current - e.clientY;
    lastDeltaYRef.current = deltaY;
    if (!isRecordingRef.current || isLockedRef.current) return;
    const progress = Math.max(0, Math.min(1, deltaY / 80));
    setLockProgress(progress);
    if (deltaY > 60) {
      isLockedRef.current = true;
      setIsLocked(true);
      setLockProgress(0);
    }
  };

  const handlePointerUp = () => {
    clearTimeout(longPressTimer.current);
    isHolding.current = false;
    if (isLockedRef.current) return;
    if (isRecordingRef.current) stopRecording(true);
  };

  const handleClick = () => {
    if (longPressFired.current) return;
    if (isRecordingRef.current) return;
    if (text.trim()) handleSubmit();
    else onOpenForm();
  };

  // ── Swipe-left-to-cancel ───────────────────────────────────────────────────

  const handleInputPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isRecording || isLocked) return;
    swipeStartX.current = e.clientX;
    swipeStartY.current = e.clientY;
    isSwipingLeft.current = false;
    inputContainerRef.current?.setPointerCapture(e.pointerId);
  };

  const handleInputPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isRecording || isLocked) return;
    const deltaX = swipeStartX.current - e.clientX;
    const deltaY = Math.abs(e.clientY - swipeStartY.current);
    if (!isSwipingLeft.current) {
      if (deltaX > 8 && deltaY < 20) isSwipingLeft.current = true;
      else if (deltaY > 20) return;
    }
    if (isSwipingLeft.current)
      setSwipeOffset(Math.max(0, Math.min(SWIPE_THRESHOLD + 16, deltaX)));
  };

  const handleInputPointerUp = () => {
    if (isSwipingLeft.current && swipeOffset >= SWIPE_THRESHOLD) stopRecording(false);
    setSwipeOffset(0);
    isSwipingLeft.current = false;
  };

  const swipeProgress = Math.min(1, swipeOffset / SWIPE_THRESHOLD);

  // ── Shared button style for pause/play (same shape as + button) ────────────

  const pausePlayBtn = (onClick: () => void, icon: React.ReactNode) => (
    <button
      onClick={onClick}
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-12 h-12 shrink-0 rounded-full bg-card border border-border flex items-center justify-center shadow-md active:scale-90 transition-transform"
    >
      {icon}
    </button>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 px-3 py-2 pointer-events-none">
      <div className="flex items-center gap-2 max-w-md mx-auto pointer-events-auto">

        {/* ── ПАУЗНЫЙ РЕЖИМ (залочено + пауза) ── */}
        {isRecording && isLocked && isPaused && (
          <>
            <button
              onClick={() => stopRecording(false)}
              className="w-12 h-12 shrink-0 rounded-full bg-card border border-border flex items-center justify-center active:scale-90 transition-transform"
            >
              <Trash2 className="w-5 h-5 text-foreground" />
            </button>

            <div
              className="flex-1 rounded-full p-px"
              style={{
                background: SHIMMER_BG,
                backgroundSize: '300% 300%',
                animation: 'qab-shimmer 1.2s ease infinite',
                boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)',
              }}
            >
              <div className="flex items-center gap-2 bg-violet-600 rounded-full px-3 h-12">
                <span className="text-white text-sm font-mono tabular-nums shrink-0">
                  {formatTime(elapsed)}
                </span>
                <div className="flex-1 flex items-center justify-between gap-px overflow-hidden">
                  {WAVEFORM.map((h, i) => (
                    <div key={i} className="w-0.5 rounded-full bg-white/75 shrink-0" style={{ height: `${h}px` }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Play above Send */}
            <div className="relative shrink-0">
              {pausePlayBtn(handlePause, <Play className="w-5 h-5 translate-x-0.5" />)}
              <button
                onClick={handleSendLocked}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center active:scale-90 transition-transform"
                style={{ boxShadow: VIOLET_GLOW }}
              >
                <ArrowUp className="w-5 h-5 text-white" />
              </button>
            </div>
          </>
        )}

        {/* ── ЗАЛОЧЕНО + ЗАПИСЬ ── */}
        {isRecording && isLocked && !isPaused && (
          <>
            <div
              className="flex-1 rounded-full p-px"
              style={{
                background: SHIMMER_BG,
                backgroundSize: '300% 300%',
                animation: 'qab-shimmer 1.2s ease infinite',
                boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)',
              }}
            >
              <div className="flex items-center gap-3 bg-card border border-violet-500 dark:border-violet-600 rounded-full px-4 h-12">
                <div className="w-2 h-2 shrink-0 rounded-full bg-violet-500 animate-pulse" />
                <span className="font-mono text-sm tabular-nums text-foreground">
                  {formatTime(elapsed)}
                </span>
                <button
                  onClick={() => stopRecording(false)}
                  className="flex-1 text-right text-sm text-violet-500 font-medium active:opacity-70"
                >
                  Отмена
                </button>
              </div>
            </div>

            {/* Pause above Send */}
            <div className="relative shrink-0">
              {pausePlayBtn(handlePause, <Pause className="w-5 h-5" />)}
              <button
                onClick={handleSendLocked}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center active:scale-90 transition-transform"
                style={{ boxShadow: VIOLET_GLOW }}
              >
                <ArrowUp className="w-5 h-5 text-white" />
              </button>
            </div>
          </>
        )}

        {/* ── ЗАПИСЬ (зажато, не залочено) ── */}
        {isRecording && !isLocked && (
          <>
            <div
              ref={inputContainerRef}
              className="flex-1 relative rounded-full p-px"
              style={{
                background: SHIMMER_BG,
                backgroundSize: '300% 300%',
                animation: 'qab-shimmer 1.2s ease infinite',
                boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)',
              }}
              onPointerDown={handleInputPointerDown}
              onPointerMove={handleInputPointerMove}
              onPointerUp={handleInputPointerUp}
              onPointerCancel={handleInputPointerUp}
            >
              <div
                className="flex items-center gap-3 bg-card rounded-full px-4 h-12"
                style={{
                  transform: `translateX(-${swipeOffset}px)`,
                  transition: swipeOffset === 0 ? 'transform 0.2s ease' : 'none',
                }}
              >
                <div className="w-2 h-2 shrink-0 rounded-full bg-violet-500 animate-pulse" />
                <span className="font-mono text-sm tabular-nums text-foreground">
                  {formatTime(elapsed)}
                </span>
                <span
                  className="flex-1 text-right text-sm text-muted-foreground select-none"
                  style={{ opacity: Math.max(0, 1 - swipeProgress * 2) }}
                >
                  {'< Влево — отмена'}
                </span>
              </div>
            </div>

            {/* Mic with lock badge */}
            <div className="relative shrink-0">
              <div
                className="absolute bottom-full left-1/2 mb-2 flex flex-col items-center pointer-events-none"
                style={{
                  transform: `translateX(-50%) translateY(${-lockProgress * 24}px)`,
                  opacity: 1 - lockProgress * 0.85,
                }}
              >
                <div className="bg-card border border-border rounded-2xl px-2.5 py-2 flex flex-col items-center gap-0.5 shadow-md">
                  <Lock className="w-4 h-4 text-foreground" />
                  <ChevronUp className="w-3 h-3 text-muted-foreground" />
                </div>
                <div className="w-2 h-2 bg-card border-b border-r border-border rotate-45 -mt-1" />
              </div>

              {/* Pulse rings */}
              <div className="absolute inset-0 rounded-full bg-violet-500 opacity-30 animate-ping scale-150" />
              <div
                className="absolute inset-0 rounded-full bg-violet-400 opacity-20 animate-ping scale-125"
                style={{ animationDelay: '0.3s' }}
              />
              <div
                className="absolute inset-0 rounded-full bg-indigo-400 opacity-15 animate-ping scale-175"
                style={{ animationDelay: '0.6s' }}
              />

              <button
                ref={buttonRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onClick={handleClick}
                className="relative w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-700 text-white select-none touch-none active:scale-90 transition-transform"
                style={{
                  boxShadow: VIOLET_GLOW,
                  transform: lockProgress > 0 ? `scale(${1 + lockProgress * 0.12})` : undefined,
                }}
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>
          </>
        )}

        {/* ── ОБЫЧНЫЙ РЕЖИМ ── */}
        {!isRecording && (
          <>
            <div className="flex-1 rounded-full border border-border">
              <div className="flex items-center gap-2 bg-card rounded-full px-4 h-[46px]">
                <input
                  type="text"
                  placeholder="Быстрый ввод..."
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm"
                  style={{ fontSize: '16px' }}
                />
              </div>
            </div>

            <div className="relative shrink-0">
              <button
                ref={buttonRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onClick={handleClick}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-700 text-white select-none touch-none active:scale-90 transition-transform"
                style={{ boxShadow: VIOLET_GLOW }}
              >
                {text.trim() ? <Sparkles className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
