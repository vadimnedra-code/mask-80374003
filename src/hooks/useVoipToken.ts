import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Capacitor } from '@capacitor/core';

export const useVoipToken = () => {
  const { user } = useAuth();
  const savedTokenRef = useRef<string | null>(null);

  // Save VoIP token to database
  const saveToken = useCallback(async (token: string): Promise<boolean> => {
    if (!user?.id || !token) {
      console.log('useVoipToken: Cannot save - no user or token');
      return false;
    }

    // Don't save if already saved
    if (savedTokenRef.current === token) {
      console.log('useVoipToken: Token already saved');
      return true;
    }

    try {
      const platform = Capacitor.getPlatform();
      
      const { error } = await supabase
        .from('voip_tokens')
        .upsert({
          user_id: user.id,
          device_token: token,
          platform: platform,
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('useVoipToken: Error saving token:', error);
        return false;
      }

      savedTokenRef.current = token;
      console.log('useVoipToken: Token saved successfully');
      return true;
    } catch (error) {
      console.error('useVoipToken: Error saving token:', error);
      return false;
    }
  }, [user?.id]);

  // Remove VoIP token from database
  const removeToken = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('voip_tokens')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('useVoipToken: Error removing token:', error);
        return false;
      }

      savedTokenRef.current = null;
      console.log('useVoipToken: Token removed successfully');
      return true;
    } catch (error) {
      console.error('useVoipToken: Error removing token:', error);
      return false;
    }
  }, [user?.id]);

  // Clear saved reference on logout
  useEffect(() => {
    if (!user) {
      savedTokenRef.current = null;
    }
  }, [user]);

  return {
    saveToken,
    removeToken,
  };
};
