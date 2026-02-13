import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar } from './Avatar';
import { UserPlus, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface UserProfile {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  status: string | null;
}

interface AddToChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  isGroup: boolean;
  currentParticipantIds: string[];
  chatName?: string;
  onChatConverted?: (newChatId: string) => void;
}

export const AddToChatDialog = ({
  isOpen,
  onClose,
  chatId,
  isGroup,
  currentParticipantIds,
  chatName,
  onChatConverted,
}: AddToChatDialogProps) => {
  const { user } = useAuth();
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [groupName, setGroupName] = useState('');

  // Fetch all users the current user shares chats with (visible via profiles_public)
  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchUsers = async () => {
      setIsFetching(true);
      try {
        const { data, error } = await supabase
          .from('profiles_public')
          .select('user_id, display_name, avatar_url, status')
          .order('display_name');

        if (error) throw error;
        setAllUsers((data || []) as UserProfile[]);
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setIsFetching(false);
      }
    };

    fetchUsers();
    setSelectedUsers([]);
    setSearchQuery('');
    setGroupName('');
  }, [isOpen, user]);

  // Filter out current participants and apply search
  const availableUsers = allUsers.filter(u =>
    !currentParticipantIds.includes(u.user_id) &&
    u.user_id !== user?.id &&
    u.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAdd = async () => {
    if (selectedUsers.length === 0) return;
    setIsLoading(true);

    try {
      if (isGroup) {
        // Simply add participants to existing group chat
        const inserts = selectedUsers.map(uid => ({
          chat_id: chatId,
          user_id: uid,
          role: 'member',
        }));

        const { error } = await supabase
          .from('chat_participants')
          .insert(inserts);

        if (error) throw error;
        toast.success(`Добавлено ${selectedUsers.length} участник(ов)`);
        onClose();
      } else {
        // Convert 1-on-1 to group: create new group chat with all participants
        const allParticipantIds = [...currentParticipantIds, ...selectedUsers];
        
        // Generate group name from participant names if not provided
        let finalGroupName = groupName.trim();
        if (!finalGroupName) {
          const names = allUsers
            .filter(u => allParticipantIds.includes(u.user_id))
            .map(u => u.display_name.split(' ')[0]);
          // Add current user's name
          const { data: myProfile } = await supabase
            .from('profiles_public')
            .select('display_name')
            .eq('user_id', user!.id)
            .single();
          if (myProfile) names.unshift(myProfile.display_name.split(' ')[0]);
          finalGroupName = names.slice(0, 4).join(', ');
        }

        // Create new group chat
        const { data: newChat, error: chatError } = await supabase
          .from('chats')
          .insert({
            is_group: true,
            group_name: finalGroupName,
            created_by: user!.id,
          })
          .select('id')
          .single();

        if (chatError) throw chatError;

        // First add the current user as owner (RLS requires this before adding others)
        const { error: ownerError } = await supabase
          .from('chat_participants')
          .insert({
            chat_id: newChat.id,
            user_id: user!.id,
            role: 'owner',
          });

        if (ownerError) throw ownerError;

        // Then add other participants
        const otherIds = [...new Set([...allParticipantIds.filter(id => id !== user!.id)])];
        
        if (otherIds.length > 0) {
          const otherInserts = otherIds.map(uid => ({
            chat_id: newChat.id,
            user_id: uid,
            role: 'member',
          }));

          const { error: partError } = await supabase
            .from('chat_participants')
            .insert(otherInserts);

          if (partError) throw partError;
        }

        toast.success('Группа создана');
        onChatConverted?.(newChat.id);
        onClose();
      }
    } catch (err) {
      console.error('Error adding participants:', err);
      toast.error('Не удалось добавить участников');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            {isGroup ? 'Добавить участников' : 'Создать группу'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Group name input (only for 1-on-1 conversion) */}
          {!isGroup && (
            <Input
              placeholder="Название группы (необязательно)"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск пользователей..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selection count */}
          <div className="px-1">
            <span className="text-sm text-muted-foreground">
              Выбрано: {selectedUsers.length}
            </span>
          </div>

          {/* Users list */}
          <ScrollArea className="h-[300px] pr-4">
            {isFetching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {availableUsers.map(u => {
                  const isSelected = selectedUsers.includes(u.user_id);
                  return (
                    <div
                      key={u.user_id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                        isSelected
                          ? "bg-primary/10 border border-primary/30"
                          : "bg-muted/50 hover:bg-muted"
                      )}
                      onClick={() => toggleUser(u.user_id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleUser(u.user_id)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <Avatar
                        src={u.avatar_url || ''}
                        alt={u.display_name}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {u.display_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {u.status === 'online' ? 'В сети' : 'Не в сети'}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {availableUsers.length === 0 && !isFetching && (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery
                      ? 'Пользователи не найдены'
                      : 'Нет доступных пользователей'}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Add button */}
          <Button
            className="w-full"
            disabled={selectedUsers.length === 0 || isLoading}
            onClick={handleAdd}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4 mr-2" />
            )}
            {isGroup
              ? `Добавить ${selectedUsers.length > 0 ? `(${selectedUsers.length})` : ''}`
              : `Создать группу ${selectedUsers.length > 0 ? `(${selectedUsers.length + currentParticipantIds.length})` : ''}`
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
