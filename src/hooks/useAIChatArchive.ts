import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { AIMessage } from './useAIChat';

export interface ArchivedSession {
  id: string;
  title: string | null;
  mode: string;
  created_at: string;
  is_active: boolean;
  message_count?: number;
  preview?: string;
}

export interface ArchivedMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export const useAIChatArchive = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ArchivedSession[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('ai_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      // Fetch message counts and previews
      const sessionsWithMeta: ArchivedSession[] = await Promise.all(
        data.map(async (s: any) => {
          const { count } = await supabase
            .from('ai_messages')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', s.id);

          const { data: previewMsg } = await supabase
            .from('ai_messages')
            .select('content')
            .eq('session_id', s.id)
            .eq('role', 'user')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          return {
            ...s,
            message_count: count ?? 0,
            preview: previewMsg?.content?.slice(0, 100) || null,
          };
        })
      );

      setSessions(sessionsWithMeta);
    }
    setLoading(false);
  }, [user?.id]);

  const saveSession = useCallback(async (
    messages: AIMessage[],
    title?: string
  ): Promise<string | null> => {
    if (!user?.id || messages.length === 0) return null;

    // Auto-generate title from first user message
    const autoTitle = title || 
      messages.find(m => m.role === 'user')?.content.slice(0, 60) || 
      'Сессия без названия';

    const { data: session, error: sessionError } = await supabase
      .from('ai_sessions')
      .insert({
        user_id: user.id,
        title: autoTitle,
        mode: 'chat' as any,
        is_active: false,
      })
      .select('id')
      .single();

    if (sessionError || !session) {
      console.error('Failed to create session:', sessionError);
      return null;
    }

    const messagesToInsert = messages.map(m => ({
      session_id: session.id,
      user_id: user.id,
      role: m.role,
      content: m.content,
    }));

    const { error: msgError } = await supabase
      .from('ai_messages')
      .insert(messagesToInsert);

    if (msgError) {
      console.error('Failed to save messages:', msgError);
      return null;
    }

    return session.id;
  }, [user?.id]);

  const loadSessionMessages = useCallback(async (sessionId: string): Promise<AIMessage[]> => {
    const { data, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];

    return data.map((m: any) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
      createdAt: new Date(m.created_at),
    }));
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    // Delete messages first (FK constraint)
    await supabase.from('ai_messages').delete().eq('session_id', sessionId);
    await supabase.from('ai_sessions').delete().eq('id', sessionId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  }, []);

  const renameSession = useCallback(async (sessionId: string, newTitle: string) => {
    const { error } = await supabase
      .from('ai_sessions')
      .update({ title: newTitle })
      .eq('id', sessionId);

    if (!error) {
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, title: newTitle } : s
      ));
    }
  }, []);

  // Build context string from archived session for injection into new requests
  const buildContextFromSession = useCallback(async (sessionId: string): Promise<string> => {
    const messages = await loadSessionMessages(sessionId);
    if (messages.length === 0) return '';

    const session = sessions.find(s => s.id === sessionId);
    const lines = messages.map(m => {
      const prefix = m.role === 'user' ? '👤 Пользователь' : '🤖 AI';
      return `${prefix}: ${m.content}`;
    });

    return `--- Архив: "${session?.title || 'Сессия'}" ---\n${lines.join('\n\n')}\n--- Конец архива ---`;
  }, [loadSessionMessages, sessions]);

  return {
    sessions,
    loading,
    fetchSessions,
    saveSession,
    loadSessionMessages,
    deleteSession,
    renameSession,
    buildContextFromSession,
  };
};
