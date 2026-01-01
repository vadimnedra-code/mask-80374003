import { useState, useEffect } from 'react';
import { X, Eye, Clock, Shield, ChevronRight, UserX } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BlockedUsersPanel } from './BlockedUsersPanel';

interface PrivacySettingsPanelProps {
  onClose: () => void;
}

export const PrivacySettingsPanel = ({ onClose }: PrivacySettingsPanelProps) => {
  const { user } = useAuth();
  const { blockedUsers } = useBlockedUsers();
  const [showLastSeen, setShowLastSeen] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('show_last_seen, show_online_status')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setShowLastSeen(data.show_last_seen ?? true);
        setShowOnlineStatus(data.show_online_status ?? true);
      }
      setLoading(false);
    };

    fetchSettings();
  }, [user]);

  const updateSetting = async (field: 'show_last_seen' | 'show_online_status', value: boolean) => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) {
        toast.error('Не удалось сохранить настройку');
        return;
      }

      if (field === 'show_last_seen') {
        setShowLastSeen(value);
      } else {
        setShowOnlineStatus(value);
      }
      
      toast.success('Настройка сохранена');
    } catch (err) {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (showBlockedUsers) {
    return <BlockedUsersPanel onClose={() => setShowBlockedUsers(false)} />;
  }

  return (
    <div className="fixed inset-0 z-50 bg-background animate-slide-in-right flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border bg-card pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold">Конфиденциальность</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-[env(safe-area-inset-bottom)]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 max-w-md mx-auto">
            {/* Info */}
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl">
              <Shield className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Настройки видимости</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Управляйте тем, что видят другие пользователи о вашей активности
                </p>
              </div>
            </div>

            {/* Online Status */}
            <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Eye className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <Label htmlFor="online-status" className="font-medium">
                    Статус онлайн
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Показывать когда вы в сети
                  </p>
                </div>
              </div>
              <Switch
                id="online-status"
                checked={showOnlineStatus}
                onCheckedChange={(checked) => updateSetting('show_online_status', checked)}
                disabled={saving}
              />
            </div>

            {/* Last Seen */}
            <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <Label htmlFor="last-seen" className="font-medium">
                    Последний визит
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Показывать время последней активности
                  </p>
                </div>
              </div>
              <Switch
                id="last-seen"
                checked={showLastSeen}
                onCheckedChange={(checked) => updateSetting('show_last_seen', checked)}
                disabled={saving}
              />
            </div>

            {/* Blocked Users */}
            <button
              onClick={() => setShowBlockedUsers(true)}
              className="w-full flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-destructive/10">
                  <UserX className="w-5 h-5 text-destructive" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Заблокированные</p>
                  <p className="text-xs text-muted-foreground">
                    {blockedUsers.length} заблокировано
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Privacy note */}
            <p className="text-xs text-muted-foreground text-center px-4">
              Если вы скроете свой статус, вы также не сможете видеть статус других пользователей
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
