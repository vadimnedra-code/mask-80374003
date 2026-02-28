import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface DiscoveredContact {
  phone_hash: string;
  user_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
}

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function normalizePhone(phone: string): string {
  // Strip everything except digits and leading +
  let cleaned = phone.replace(/[^\d+]/g, '');
  // Ensure starts with +
  if (!cleaned.startsWith('+')) {
    // Assume Russian number if starts with 8
    if (cleaned.startsWith('8') && cleaned.length === 11) {
      cleaned = '+7' + cleaned.slice(1);
    } else {
      cleaned = '+' + cleaned;
    }
  }
  return cleaned;
}

export function useContactDiscovery() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiscoveredContact[]>([]);

  // Register own phone hash
  const registerPhoneHash = useCallback(async (phone: string) => {
    if (!user) return;
    const normalized = normalizePhone(phone);
    const hash = await sha256(normalized);
    
    await supabase
      .from('phone_hashes')
      .upsert({ user_id: user.id, phone_hash: hash }, { onConflict: 'user_id' });
  }, [user]);

  // Look up a single phone number
  const findByPhone = useCallback(async (phone: string) => {
    if (!user) return;
    setLoading(true);
    setResults([]);
    
    try {
      const normalized = normalizePhone(phone);
      const hash = await sha256(normalized);
      
      const { data, error } = await supabase.rpc('find_contacts_by_hash', {
        _hashes: [hash],
      });
      
      if (!error && data) {
        setResults(data as DiscoveredContact[]);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { loading, results, findByPhone, registerPhoneHash };
}
