import { useState } from 'react';
import { Link, Copy, RefreshCw, Lock, Clock, Users, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGroupInvites, CreateInviteOptions } from '@/hooks/useGroupInvites';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GroupInviteLinkPanelProps {
  chatId: string;
  groupName: string;
  onClose: () => void;
}

export const GroupInviteLinkPanel = ({ chatId, groupName, onClose }: GroupInviteLinkPanelProps) => {
  const { invites, createInvite, revokeInvite, getInviteLink, getActiveInvite, loading } = useGroupInvites(chatId);
  const [creating, setCreating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [password, setPassword] = useState('');
  const [expiresIn, setExpiresIn] = useState<'10m' | '30m' | '1h' | '1d' | '7d' | 'never'>('30m');
  const [maxUses, setMaxUses] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const activeInvite = getActiveInvite();

  const handleCreate = async () => {
    setCreating(true);
    
    const options: CreateInviteOptions = {
      expiresIn,
    };
    
    if (password.trim()) {
      options.password = password;
    }
    
    if (maxUses && parseInt(maxUses) > 0) {
      options.maxUses = parseInt(maxUses);
    }

    const { error } = await createInvite(options);
    setCreating(false);

    if (error) {
      toast.error('Не удалось создать ссылку');
    } else {
      toast.success('Ссылка создана');
      setPassword('');
      setMaxUses('');
      setShowAdvanced(false);
    }
  };

  const handleCopy = async () => {
    if (!activeInvite) return;
    
    const link = getInviteLink(activeInvite.token);
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Ссылка скопирована');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (inviteId: string) => {
    const { error } = await revokeInvite(inviteId);
    if (error) {
      toast.error('Не удалось отозвать ссылку');
    } else {
      toast.success('Ссылка отозвана');
    }
  };

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return 'Без срока';
    const date = new Date(expiresAt);
    if (date < new Date()) return 'Истекла';
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-4 space-y-6">
      {/* Active invite */}
      {activeInvite ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link className="w-4 h-4" />
            <span>Активная ссылка для приглашения</span>
          </div>
          
          <div className="bg-muted rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Input
                value={getInviteLink(activeInvite.token)}
                readOnly
                className="flex-1 bg-background"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {activeInvite.password_hash && (
                <div className="flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>Защищено паролем</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatExpiry(activeInvite.expires_at)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>
                  {activeInvite.use_count}
                  {activeInvite.max_uses ? ` / ${activeInvite.max_uses}` : ''} использований
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleCopy}
              >
                <Copy className="w-4 h-4 mr-2" />
                Копировать
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleRevoke(activeInvite.id)}
              >
                <X className="w-4 h-4 mr-2" />
                Отозвать
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center py-6">
            <Link className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Нет активной ссылки</p>
            <p className="text-sm text-muted-foreground/70">
              Создайте ссылку для приглашения в группу "{groupName}"
            </p>
          </div>

          {/* Advanced options toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="advanced" className="text-sm">Дополнительные настройки</Label>
            <Switch
              id="advanced"
              checked={showAdvanced}
              onCheckedChange={setShowAdvanced}
            />
          </div>

          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 pt-2"
            >
              <div>
                <Label htmlFor="password" className="text-sm">Пароль (необязательно)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Введите пароль для защиты ссылки"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="expiry" className="text-sm">Срок действия</Label>
              <Select value={expiresIn} onValueChange={(v) => setExpiresIn(v as typeof expiresIn)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10m">10 минут</SelectItem>
                    <SelectItem value="30m">30 минут (рекомендуется)</SelectItem>
                    <SelectItem value="1h">1 час</SelectItem>
                    <SelectItem value="1d">1 день</SelectItem>
                    <SelectItem value="7d">7 дней</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="maxUses" className="text-sm">Лимит использований (необязательно)</Label>
                <Input
                  id="maxUses"
                  type="number"
                  placeholder="Без ограничений"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  className="mt-1"
                  min="1"
                />
              </div>
            </motion.div>
          )}

          <Button
            onClick={handleCreate}
            disabled={creating}
            className="w-full"
          >
            {creating ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Link className="w-4 h-4 mr-2" />
            )}
            Создать ссылку
          </Button>
        </div>
      )}

      {/* Previous invites */}
      {invites.length > 1 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">История ссылок</p>
          {invites.slice(1).map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm"
            >
              <div className="flex items-center gap-2">
                <Link className="w-4 h-4 text-muted-foreground" />
                <span className="font-mono text-xs">{invite.token.slice(0, 8)}...</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {invite.use_count} исп.
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
