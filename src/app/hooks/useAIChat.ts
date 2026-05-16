import { useState, useCallback, useRef } from 'react';
import { chatCompletion, type AIMessage } from '../../services/ai/aiClient';
import { buildFinancialSnapshot } from '../../services/ai/contextBuilder';
import { answerQuery, type ChatCtx } from './chatContext';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  isOffline?: boolean;
}

const SYSTEM_PERSONA =
  'Ты финансовый ассистент приложения Finly. Отвечай кратко и по делу на русском языке.\n' +
  'Используй данные пользователя ниже для точных ответов. Не придумывай цифры.';

export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const localCtxRef = useRef<ChatCtx>({});

  const sendMessage = useCallback(async (text: string) => {
    // Capture history before appending new user message
    const prevMessages = messagesRef.current;
    const withUser: ChatMessage[] = [...prevMessages, { role: 'user', content: text }];
    messagesRef.current = withUser;
    setMessages(withUser);
    setIsLoading(true);

    try {
      const snapshot = await buildFinancialSnapshot();
      const systemPrompt = `${SYSTEM_PERSONA}\n\n${snapshot}`;

      const history: AIMessage[] = prevMessages.map(m => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: text });

      const reply = await chatCompletion(systemPrompt, history);
      const withAssistant: ChatMessage[] = [...messagesRef.current, { role: 'assistant', content: reply }];
      messagesRef.current = withAssistant;
      setMessages(withAssistant);
      setIsOffline(false);
    } catch {
      const { answer, newCtx } = await answerQuery(text, localCtxRef.current);
      localCtxRef.current = newCtx;
      const withFallback: ChatMessage[] = [...messagesRef.current, { role: 'assistant', content: answer, isOffline: true }];
      messagesRef.current = withFallback;
      setMessages(withFallback);
      setIsOffline(true);
    } finally {
      setIsLoading(false);
    }
  }, []); // stable ref — no messages dependency needed

  const clearHistory = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
    localCtxRef.current = {};
    setIsOffline(false);
  }, []);

  return { messages, isLoading, isOffline, sendMessage, clearHistory };
}
