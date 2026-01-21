import { useState } from 'react';
import { Crown, Shield, User, MoreVertical, UserMinus, UserCog } from 'lucide-react';
import { useGroupRoles, GroupRole, Participant } from '@/hooks/useGroupRoles';
import { Avatar } from './Avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface GroupParticipantsListProps {
  chatId: string;
  onClose?: () => void;
}

const ROLE_ICONS: Record<GroupRole, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  member: User,
};

const ROLE_LABELS: Record<GroupRole, string> = {
  owner: 'Владелец',
  admin: 'Админ',
  member: 'Участник',
};

const ROLE_COLORS: Record<GroupRole, string> = {
  owner: 'text-yellow-500',
  admin: 'text-blue-500',
  member: 'text-muted-foreground',
};

export const GroupParticipantsList = ({ chatId, onClose }: GroupParticipantsListProps) => {
  const { user } = useAuth();
  const {
    participants,
    myRole,
    loading,
    canManageParticipants,
    setRole,
    removeParticipant,
    transferOwnership,
  } = useGroupRoles(chatId);

  const [confirmAction, setConfirmAction] = useState<{
    type: 'remove' | 'transfer' | 'demote';
    participant: Participant;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleSetRole = async (userId: string, newRole: GroupRole) => {
    setActionLoading(true);
    const { error } = await setRole(userId, newRole);
    setActionLoading(false);

    if (error) {
      toast.error(error.message || 'Не удалось изменить роль');
    } else {
      toast.success('Роль изменена');
    }
  };

  const handleRemove = async () => {
    if (!confirmAction || confirmAction.type !== 'remove') return;

    setActionLoading(true);
    const { error } = await removeParticipant(confirmAction.participant.user_id);
    setActionLoading(false);
    setConfirmAction(null);

    if (error) {
      toast.error(error.message || 'Не удалось удалить участника');
    } else {
      toast.success(`${confirmAction.participant.display_name} удалён из группы`);
    }
  };

  const handleTransfer = async () => {
    if (!confirmAction || confirmAction.type !== 'transfer') return;

    setActionLoading(true);
    const { error } = await transferOwnership(confirmAction.participant.user_id);
    setActionLoading(false);
    setConfirmAction(null);

    if (error) {
      toast.error(error.message || 'Не удалось передать владение');
    } else {
      toast.success(`Вы передали владение группой ${confirmAction.participant.display_name}`);
    }
  };

  // Sort: owner first, then admins, then members
  const sortedParticipants = [...participants].sort((a, b) => {
    const order: Record<GroupRole, number> = { owner: 0, admin: 1, member: 2 };
    return order[a.role] - order[b.role];
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-sm text-muted-foreground">
          {participants.length} участников
        </span>
        {canManageParticipants() && (
          <span className="text-xs text-primary">Вы {ROLE_LABELS[myRole]}</span>
        )}
      </div>

      {sortedParticipants.map((participant) => {
        const RoleIcon = ROLE_ICONS[participant.role];
        const isMe = participant.user_id === user?.id;
        const canManageThis = 
          canManageParticipants() && 
          !isMe && 
          participant.role !== 'owner' &&
          !(myRole === 'admin' && participant.role === 'admin');

        return (
          <div
            key={participant.user_id}
            className="flex items-center gap-3 px-4 py-2 hover:bg-muted/50 transition-colors"
          >
            <Avatar
              src={participant.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.user_id}`}
              alt={participant.display_name}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">
                  {participant.display_name}
                  {isMe && <span className="text-muted-foreground"> (Вы)</span>}
                </span>
              </div>
              <div className={cn("flex items-center gap-1 text-xs", ROLE_COLORS[participant.role])}>
                <RoleIcon className="w-3 h-3" />
                <span>{ROLE_LABELS[participant.role]}</span>
              </div>
            </div>

            {canManageThis && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {myRole === 'owner' && participant.role === 'member' && (
                    <DropdownMenuItem onClick={() => handleSetRole(participant.user_id, 'admin')}>
                      <Shield className="w-4 h-4 mr-2" />
                      Назначить админом
                    </DropdownMenuItem>
                  )}
                  {myRole === 'owner' && participant.role === 'admin' && (
                    <DropdownMenuItem onClick={() => handleSetRole(participant.user_id, 'member')}>
                      <User className="w-4 h-4 mr-2" />
                      Снять админа
                    </DropdownMenuItem>
                  )}
                  {myRole === 'owner' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setConfirmAction({ type: 'transfer', participant })}
                      >
                        <Crown className="w-4 h-4 mr-2" />
                        Передать владение
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setConfirmAction({ type: 'remove', participant })}
                  >
                    <UserMinus className="w-4 h-4 mr-2" />
                    Удалить из группы
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      })}

      {/* Confirmation dialogs */}
      <AlertDialog open={confirmAction?.type === 'remove'} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить участника?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.participant.display_name} будет удалён из группы и не сможет видеть новые сообщения.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAction?.type === 'transfer'} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Передать владение?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.participant.display_name} станет владельцем группы. Вы станете администратором.
              Это действие нельзя отменить самостоятельно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTransfer}
              disabled={actionLoading}
            >
              {actionLoading ? 'Передача...' : 'Передать'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
