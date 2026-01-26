import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithPhone: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phone: string, token: string, displayName?: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  signInAnonymously: () => Promise<{ error: Error | null; user: User | null }>;
  updateDisplayName: (displayName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const clearStaleSession = () => {
      try {
        const keys = Object.keys(localStorage).filter(
          (k) => k.includes('sb-') && k.endsWith('-auth-token')
        );
        keys.forEach((k) => localStorage.removeItem(k));
      } catch {
        // ignore (e.g. storage blocked)
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Handle critical auth failures
        if (event === 'SIGNED_OUT') {
          clearStaleSession();
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle password recovery event - redirect to password reset page
        if (event === 'PASSWORD_RECOVERY') {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(() => {
            window.location.href = `/auth?mode=reset${window.location.hash ?? ''}`;
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.warn('Session error, clearing:', error.message);
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Session check failed, clearing:', err);
        // Don't clear - Supabase will emit SIGNED_OUT if session is truly invalid
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName,
        }
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    return { error };
  };

  const signInWithPhone = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });
    return { error };
  };

  const verifyOtp = async (phone: string, token: string, displayName?: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    
    // После успешной верификации обновляем профиль с displayName
    if (!error && data.user && displayName) {
      await supabase.auth.updateUser({
        data: { display_name: displayName }
      });
      // Также обновляем профиль в таблице profiles
      await supabase
        .from('profiles')
        .update({ display_name: displayName, phone })
        .eq('user_id', data.user.id);
    } else if (!error && data.user) {
      // Сохраняем номер телефона в профиле
      await supabase
        .from('profiles')
        .update({ phone })
        .eq('user_id', data.user.id);
    }
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth?mode=reset`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  };

  const signInAnonymously = async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    return { error, user: data?.user ?? null };
  };

  const updateDisplayName = async (displayName: string) => {
    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName }
    });
    
    // Also update the profiles table
    if (!error && user) {
      await supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('user_id', user.id);
    }
    
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signInWithPhone, verifyOtp, signOut, resetPassword, updatePassword, signInAnonymously, updateDisplayName }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
