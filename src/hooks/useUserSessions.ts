import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UserSession {
  id: string;
  device_name: string | null;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  is_current: boolean;
  last_active_at: string;
  created_at: string;
}

function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('OPR') || ua.includes('Opera')) return 'Opera';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Неизвестный';
}

function detectOS(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Неизвестная ОС';
}

function detectDevice(): string {
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone|iPad/i.test(ua)) return 'Мобильное устройство';
  return 'Десктоп';
}

export function useUserSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const currentSessionId = typeof window !== 'undefined' ? sessionStorage.getItem('mask_session_id') : null;

  const fetchSessions = useCallback(async () => {
    if (!user) { setSessions([]); setLoading(false); return; }

    const { data } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('last_active_at', { ascending: false });

    setSessions((data as UserSession[]) || []);
    setLoading(false);
  }, [user]);

  // Register or update current session on mount
  useEffect(() => {
    if (!user) return;

    const registerSession = async () => {
      let sid = sessionStorage.getItem('mask_session_id');

      if (sid) {
        // Update last_active
        await supabase
          .from('user_sessions')
          .update({ last_active_at: new Date().toISOString(), is_current: true })
          .eq('id', sid)
          .eq('user_id', user.id);
      } else {
        // Create new session
        const { data } = await supabase
          .from('user_sessions')
          .insert({
            user_id: user.id,
            device_name: detectDevice(),
            browser: detectBrowser(),
            os: detectOS(),
            is_current: true,
          })
          .select('id')
          .single();

        if (data) {
          sessionStorage.setItem('mask_session_id', data.id);
        }
      }

      // Mark other sessions as not current
      const currentSid = sessionStorage.getItem('mask_session_id');
      if (currentSid) {
        await supabase
          .from('user_sessions')
          .update({ is_current: false })
          .eq('user_id', user.id)
          .neq('id', currentSid);
      }

      fetchSessions();
    };

    registerSession();
  }, [user, fetchSessions]);

  return { sessions, loading, refetch: fetchSessions, currentSessionId };
}
