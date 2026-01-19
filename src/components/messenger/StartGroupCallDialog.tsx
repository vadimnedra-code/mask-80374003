import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar } from './Avatar';
import { Phone, Video, Users, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface Participant {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  status: string | null;
}

interface StartGroupCallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatParticipants: Participant[];
  onStartCall: (participantIds: string[], callType: 'voice' | 'video') => void;
}

export const StartGroupCallDialog = ({
  isOpen,
  onClose,
  chatId,
  chatParticipants,
  onStartCall,
}: StartGroupCallDialogProps) => {
  const { user } = useAuth();
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Filter out current user and apply search
  const availableParticipants = chatParticipants.filter(p => 
    p.user_id !== user?.id &&
    p.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset selection when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedParticipants([]);
      setSearchQuery('');
    }
  }, [isOpen]);

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAll = () => {
    if (selectedParticipants.length === availableParticipants.length) {
      setSelectedParticipants([]);
    } else {
      setSelectedParticipants(availableParticipants.map(p => p.user_id));
    }
  };

  const handleStartCall = async (callType: 'voice' | 'video') => {
    if (selectedParticipants.length === 0) return;
    
    setIsLoading(true);
    try {
      onStartCall(selectedParticipants, callType);
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
            <Users className="w-5 h-5 text-[#00a884]" />
            Групповой звонок
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

          {/* Select all */}
          {availableParticipants.length > 1 && (
            <div className="flex items-center justify-between px-1">
              <span className="text-sm text-muted-foreground">
                Выбрано: {selectedParticipants.length} из {availableParticipants.length}
              </span>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {selectedParticipants.length === availableParticipants.length 
                  ? 'Снять все' 
                  : 'Выбрать всех'}
              </Button>
            </div>
          )}

          {/* Participants list */}
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {availableParticipants.map(participant => (
                <div
                  key={participant.user_id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                    selectedParticipants.includes(participant.user_id)
                      ? "bg-[#00a884]/10 border border-[#00a884]/30"
                      : "bg-muted/50 hover:bg-muted"
                  )}
                  onClick={() => toggleParticipant(participant.user_id)}
                >
                  <Checkbox
                    checked={selectedParticipants.includes(participant.user_id)}
                    onCheckedChange={() => toggleParticipant(participant.user_id)}
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
              ))}

              {availableParticipants.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery 
                    ? 'Участники не найдены' 
                    : 'Нет доступных участников'}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Call buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1 bg-[#00a884] hover:bg-[#00a884]/90"
              disabled={selectedParticipants.length === 0 || isLoading}
              onClick={() => handleStartCall('voice')}
            >
              <Phone className="w-4 h-4 mr-2" />
              Аудиозвонок
            </Button>
            <Button
              className="flex-1 bg-[#00a884] hover:bg-[#00a884]/90"
              disabled={selectedParticipants.length === 0 || isLoading}
              onClick={() => handleStartCall('video')}
            >
              <Video className="w-4 h-4 mr-2" />
              Видеозвонок
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Максимум 8 участников в групповом звонке
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
