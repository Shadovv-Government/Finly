import { useState, useRef, useCallback } from 'react';

type SpeechInputState = 'idle' | 'listening' | 'error';

interface UseSpeechInputResult {
  state: SpeechInputState;
  supported: boolean;
  start: (onResult: (text: string) => void) => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionCtor;
    webkitSpeechRecognition: SpeechRecognitionCtor;
  }
}

export function useSpeechInput(): UseSpeechInputResult {
  const [state, setState] = useState<SpeechInputState>('idle');
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);

  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setState('idle');
  }, []);

  const start = useCallback((onResult: (text: string) => void) => {
    if (!supported) return;

    if (recognitionRef.current) {
      stop();
      return;
    }

    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    const recognition = new Ctor();
    recognition.lang = 'ru-RU';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setState('listening');

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript) onResult(transcript);
    };

    recognition.onerror = () => {
      setState('error');
      recognitionRef.current = null;
      setTimeout(() => setState('idle'), 1500);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setState('idle');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [supported, stop]);

  return { state, supported, start, stop };
}
