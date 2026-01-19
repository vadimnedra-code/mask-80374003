import { useState, useEffect } from 'react';
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
import { GroupCallParticipant } from '@/types/groupCall';

interface ChatParticipant {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  status: string | null;
}

interface InviteToCallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  currentParticipants: GroupCallParticipant[];
  onInvite: (participantIds: string[]) => Promise<void>;
  maxParticipants?: number;
}

export const InviteToCallDialog = ({
  isOpen,
  onClose,
  chatId,
  currentParticipants,
  onInvite,
  maxParticipants = 8,
}: InviteToCallDialogProps) => {
  const { user } = useAuth();
  const [chatParticipants, setChatParticipants] = useState<ChatParticipant[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Fetch chat participants when dialog opens
  useEffect(() => {
    if (!isOpen || !chatId) return;

    const fetchChatParticipants = async () => {
      setIsFetching(true);
      try {
        const { data: participants, error } = await supabase
          .from('chat_participants')
          .select(`
            user_id,
            profiles_public!chat_participants_user_id_fkey (
              display_name,
              avatar_url,
              status
            )
          `)
          .eq('chat_id', chatId);

        if (error) throw error;

        const mapped: ChatParticipant[] = (participants || []).map((p: any) => ({
          user_id: p.user_id,
          display_name: p.profiles_public?.display_name || 'Unknown',
          avatar_url: p.profiles_public?.avatar_url,
          status: p.profiles_public?.status,
        }));

        setChatParticipants(mapped);
      } catch (err) {
        console.error('Error fetching chat participants:', err);
      } finally {
        setIsFetching(false);
      }
    };

    fetchChatParticipants();
    setSelectedParticipants([]);
    setSearchQuery('');
  }, [isOpen, chatId]);

  // Get user IDs already in the call
  const participantIds = new Set([
    user?.id,
    ...currentParticipants.map(p => p.user_id),
  ]);

  // Filter out current user and participants already in call
  const availableParticipants = chatParticipants.filter(p => 
    !participantIds.has(p.user_id) &&
    p.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate how many more can join
  const currentCount = currentParticipants.length + 1; // +1 for self
  const slotsRemaining = maxParticipants - currentCount;
  const canSelectMore = selectedParticipants.length < slotsRemaining;

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else if (canSelectMore || prev.includes(userId)) {
        return [...prev, userId];
      }
      return prev;
    });
  };

  const selectAll = () => {
    if (selectedParticipants.length === Math.min(availableParticipants.length, slotsRemaining)) {
      setSelectedParticipants([]);
    } else {
      setSelectedParticipants(
        availableParticipants.slice(0, slotsRemaining).map(p => p.user_id)
      );
    }
  };

  const handleInvite = async () => {
    if (selectedParticipants.length === 0) return;
    
    setIsLoading(true);
    try {
      await onInvite(selectedParticipants);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#00a884]" />
            Пригласить в звонок
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск участников..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status info */}
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-muted-foreground">
              {slotsRemaining > 0 
                ? `Свободно мест: ${slotsRemaining}` 
                : 'Звонок заполнен'}
            </span>
            {availableParticipants.length > 1 && slotsRemaining > 0 && (
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {selectedParticipants.length === Math.min(availableParticipants.length, slotsRemaining)
                  ? 'Снять все' 
                  : 'Выбрать доступных'}
              </Button>
            )}
          </div>

          {/* Participants list */}
          <ScrollArea className="h-[300px] pr-4">
            {isFetching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {availableParticipants.map(participant => {
                  const isSelected = selectedParticipants.includes(participant.user_id);
                  const isDisabled = !isSelected && !canSelectMore;
                  
                  return (
                    <div
                      key={participant.user_id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg transition-colors",
                        isDisabled 
                          ? "opacity-50 cursor-not-allowed" 
                          : "cursor-pointer",
                        isSelected
                          ? "bg-[#00a884]/10 border border-[#00a884]/30"
                          : "bg-muted/50 hover:bg-muted"
                      )}
                      onClick={() => !isDisabled && toggleParticipant(participant.user_id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        disabled={isDisabled}
                        onCheckedChange={() => !isDisabled && toggleParticipant(participant.user_id)}
                        className="data-[state=checked]:bg-[#00a884] data-[state=checked]:border-[#00a884]"
                      />
                      <Avatar
                        src={participant.avatar_url || ''}
                        alt={participant.display_name}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {participant.display_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {participant.status === 'online' ? 'В сети' : 'Не в сети'}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {availableParticipants.length === 0 && !isFetching && (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery 
                      ? 'Участники не найдены' 
                      : slotsRemaining === 0 
                        ? 'Достигнут лимит участников' 
                        : 'Все участники чата уже в звонке'}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Invite button */}
          <Button
            className="w-full bg-[#00a884] hover:bg-[#00a884]/90"
            disabled={selectedParticipants.length === 0 || isLoading}
            onClick={handleInvite}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4 mr-2" />
            )}
            Пригласить {selectedParticipants.length > 0 && `(${selectedParticipants.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
