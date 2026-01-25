import { useState, useCallback, useRef } from 'react';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
}

export type AIAction = 'chat' | 'summarise' | 'extract_tasks' | 'draft_reply' | 'translate' | 'privacy_check' | 'custom_query';

interface StreamChatOptions {
  messages: AIMessage[];
  action?: AIAction;
  chatContent?: string;
  targetLanguage?: string;
  toneStyle?: string;
  incognito?: boolean;
  onDelta: (delta: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export const useAIChat = () => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isIncognito, setIsIncognito] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const streamChat = useCallback(async ({
    messages: inputMessages,
    action = 'chat',
    chatContent,
    targetLanguage,
    toneStyle,
    incognito = false,
    onDelta,
    onDone,
    onError,
  }: StreamChatOptions) => {
    const token = localStorage.getItem('sb-wenxswpqgbzwaowdjdqc-auth-token');
    if (!token) {
      onError('Not authenticated');
      return;
    }

    const authData = JSON.parse(token);
    const accessToken = authData?.access_token;

    if (!accessToken) {
      onError('No access token');
      return;
    }

    abortControllerRef.current = new AbortController();

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: inputMessages.map(m => ({ role: m.role, content: m.content })),
          action,
          chatContent,
          targetLanguage,
          toneStyle,
          incognito,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            onDone();
            return;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) onDelta(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) onDelta(content);
          } catch { /* ignore */ }
        }
      }

      onDone();
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        onDone();
        return;
      }
      console.error('AI chat error:', error);
      onError((error as Error).message);
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: AIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    let assistantContent = '';

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => 
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content: assistantContent,
          createdAt: new Date(),
        }];
      });
    };

    await streamChat({
      messages: [...messages, userMessage],
      action: 'chat',
      incognito: isIncognito,
      onDelta: updateAssistant,
      onDone: () => setIsLoading(false),
      onError: (error) => {
        setIsLoading(false);
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Ошибка: ${error}`,
          createdAt: new Date(),
        }]);
      },
    });
  }, [messages, isIncognito, streamChat]);

  const performAction = useCallback(async (
    action: AIAction,
    chatContent: string,
    options?: { targetLanguage?: string; toneStyle?: string; userQuery?: string }
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      let result = '';

      // For custom_query, the userQuery becomes the message content
      const messageContent = action === 'custom_query' && options?.userQuery
        ? options.userQuery
        : 'Execute action';

      streamChat({
        messages: [{ id: '1', role: 'user', content: messageContent, createdAt: new Date() }],
        action,
        chatContent,
        targetLanguage: options?.targetLanguage,
        toneStyle: options?.toneStyle,
        incognito: isIncognito,
        onDelta: (chunk) => { result += chunk; },
        onDone: () => resolve(result),
        onError: reject,
      });
    });
  }, [isIncognito, streamChat]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const cancelRequest = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  }, []);

  return {
    messages,
    isLoading,
    isIncognito,
    setIsIncognito,
    sendMessage,
    performAction,
    clearMessages,
    cancelRequest,
  };
};
