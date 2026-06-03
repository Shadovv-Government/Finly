import { useState, useRef, useCallback } from 'react';

type SpeechInputState = 'idle' | 'listening' | 'error';

export type SpeechErrorType =
  | 'not-allowed'
  | 'audio-capture'
  | 'no-speech'
  | 'network'
  | 'aborted'
  | 'language-not-supported'
  | 'service-not-allowed'
  | 'unknown';

interface UseSpeechInputResult {
  state: SpeechInputState;
  supported: boolean;
  lastError: SpeechErrorType | null;
  start: (onResult: (text: string) => void, onError?: (error: SpeechErrorType) => void) => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((event: { results: { [i: number]: { [j: number]: { transcript: string }; isFinal: boolean } } }) => void) | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionCtor;
    webkitSpeechRecognition: SpeechRecognitionCtor;
  }
}

/** iOS Safari сам управляет разрешением микрофона для SpeechRecognition —
 *  вызов getUserMedia перед ним ломает распознавание ('audio-capture'). */
const isIOS = typeof navigator !== 'undefined' &&
  /iPad|iPhone|iPod/.test(navigator.userAgent);

/**
 * Проверяет/запрашивает доступ к микрофону ровно один раз.
 *
 * - iOS Safari: SpeechRecognition сам показывает диалог — пропускаем getUserMedia.
 * - Permissions API 'granted'  → диалог не нужен, индикатор не мигает.
 * - Permissions API 'denied'   → сразу false.
 * - 'prompt' / нет API         → getUserMedia (нужен Android Chrome).
 */
async function ensureMicPermission(): Promise<boolean> {
  // iOS: SpeechRecognition сам запросит микрофон при первом старте
  if (isIOS) return true;

  // Проверяем состояние разрешения через Permissions API
  try {
    const result = await navigator.permissions.query({
      name: 'microphone' as PermissionName,
    });
    if (result.state === 'granted') return true;  // Уже разрешено — ничего не делаем
    if (result.state === 'denied')  return false;  // Явно запрещено
    // 'prompt' — идём в getUserMedia ниже
  } catch {
    // Firefox и старые браузеры не поддерживают 'microphone' в Permissions API —
    // fallback на getUserMedia
  }

  // Явный запрос микрофона: критичен для Android Chrome
  if (!navigator?.mediaDevices?.getUserMedia) {
    return true; // Небезопасный контекст — пробуем без запроса
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
    return true;
  } catch {
    return false;
  }
}

/** Человекочитаемое описание ошибки */
function errorMessage(type: SpeechErrorType): string {
  switch (type) {
    case 'not-allowed':
      return 'Доступ к микрофону запрещён. Разрешите его в настройках браузера.';
    case 'audio-capture':
      return 'Не удалось захватить аудио. Проверьте, что микрофон не занят другим приложением.';
    case 'no-speech':
      return 'Речь не распознана. Попробуйте ещё раз.';
    case 'network':
      return 'Сетевая ошибка. Проверьте подключение к интернету.';
    case 'aborted':
      return 'Запись прервана.';
    case 'language-not-supported':
      return 'Язык не поддерживается.';
    case 'service-not-allowed':
      return 'Сервис распознавания недоступен.';
    default:
      return 'Ошибка распознавания. Попробуйте ещё раз.';
  }
}

export { errorMessage as getSpeechErrorMessage, ensureMicPermission };

export function useSpeechInput(): UseSpeechInputResult {
  const [state, setState] = useState<SpeechInputState>('idle');
  const [lastError, setLastError] = useState<SpeechErrorType | null>(null);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);
  /** Флаг: была ли явная остановка пользователем (не системный onend) */
  const stoppedByUserRef = useRef(false);

  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const stop = useCallback(() => {
    stoppedByUserRef.current = true;
    try {
      recognitionRef.current?.abort();
    } catch {
      recognitionRef.current?.stop();
    }
    recognitionRef.current = null;
    setState('idle');
  }, []);

  const start = useCallback(async (onResult: (text: string) => void, onError?: (error: SpeechErrorType) => void) => {
    if (!supported) return;

    // Уже слушаем — останавливаем (toggle-поведение)
    if (recognitionRef.current) {
      stop();
      return;
    }

    // Запрос разрешения микрофона (с учётом платформы и Permissions API)
    const hasPermission = await ensureMicPermission();
    if (!hasPermission) {
      setLastError('not-allowed');
      setState('error');
      onError?.('not-allowed');
      setTimeout(() => setState('idle'), 2000);
      return;
    }

    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    const recognition = new Ctor();
    recognition.lang = 'ru-RU';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    // Непрерывный режим: на Android без него распознавание может
    // завершиться сразу, не дождавшись речи
    recognition.continuous = false;

    stoppedByUserRef.current = false;
    setLastError(null);

    recognition.onstart = () => setState('listening');

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript && event.results[0]?.isFinal !== false) {
        onResult(transcript);
      }
    };

    recognition.onerror = (event) => {
      const errorType: SpeechErrorType = (event.error as SpeechErrorType) || 'unknown';
      setLastError(errorType);
      setState('error');
      recognitionRef.current = null;
      onError?.(errorType);
      setTimeout(() => setState('idle'), 2000);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      // Не сбрасываем состояние, если это была системная ошибка —
      // onerror уже выставил 'error'
      if (!stoppedByUserRef.current) {
        // onend без onerror — нормальное завершение
        setState('idle');
      }
      stoppedByUserRef.current = false;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      // Браузер может выбросить синхронное исключение при start()
      setLastError('not-allowed');
      setState('error');
      recognitionRef.current = null;
      onError?.('not-allowed');
      setTimeout(() => setState('idle'), 2000);
    }
  }, [supported, stop]);

  return { state, supported, lastError, start, stop };
}
