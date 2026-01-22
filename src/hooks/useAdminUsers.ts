import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface AdminUser {
  user_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  status: string | null;
  last_seen: string | null;
  created_at: string;
  bio: string | null;
  roles: string[] | null;
  times_blocked: number;
  message_count: number;
}

export const useAdminUsers = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: rpcError } = await supabase.rpc('get_admin_users');
      
      if (rpcError) {
        console.error('Error fetching admin users:', rpcError);
        setError(rpcError.message);
        return;
      }
      
      setUsers((data as unknown as AdminUser[]) || []);
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const setUserRole = useCallback(async (targetUserId: string, role: 'admin' | 'moderator' | 'user', action: 'add' | 'remove') => {
    try {
      const { error: rpcError } = await supabase.rpc('admin_set_user_role', {
        _target_user_id: targetUserId,
        _role: role,
        _action: action
      });
      
      if (rpcError) {
        console.error('Error setting role:', rpcError);
        toast.error('Ошибка изменения роли');
        return false;
      }
      
      toast.success(action === 'add' ? 'Роль добавлена' : 'Роль удалена');
      await fetchUsers();
      return true;
    } catch (err) {
      console.error('Error:', err);
      toast.error('Ошибка изменения роли');
      return false;
    }
  }, [fetchUsers]);

  const blockUser = useCallback(async (targetUserId: string, block: boolean) => {
    try {
      const { error: rpcError } = await supabase.rpc('admin_block_user', {
        _target_user_id: targetUserId,
        _block: block
      });
      
      if (rpcError) {
        console.error('Error blocking user:', rpcError);
        toast.error('Ошибка блокировки');
        return false;
      }
      
      toast.success(block ? 'Пользователь заблокирован' : 'Пользователь разблокирован');
      await fetchUsers();
      return true;
    } catch (err) {
      console.error('Error:', err);
      toast.error('Ошибка блокировки');
      return false;
    }
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
    setUserRole,
    blockUser
  };
};
