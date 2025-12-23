import { useState } from 'react';
import { Search, X, UserPlus, Users, Camera } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { useChats } from '@/hooks/useChats';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from './Avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface NewChatDialogProps {
  onClose: () => void;
  onChatCreated: (chatId: string) => void;
}

export const NewChatDialog = ({ onClose, onChatCreated }: NewChatDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [step, setStep] = useState<'select' | 'group-info'>('select');
  
  const { user } = useAuth();
  const { users, searchUsers } = useUsers();
  const { createChat, chats } = useChats();

  const filteredUsers = searchUsers(searchQuery).filter(
    (u) => u.user_id !== user?.id
  );

  const isGroupChat = selectedUsers.length > 1;

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleNext = () => {
    if (selectedUsers.length === 0) return;

    if (isGroupChat) {
      setStep('group-info');
    } else {
      handleCreateChat();
    }
  };

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) return;

    // Check if chat already exists (for 1-on-1)
    if (selectedUsers.length === 1) {
      const existingChat = chats.find(
        (c) =>
          !c.is_group &&
          c.participants.some((p) => p.user_id === selectedUsers[0])
      );

      if (existingChat) {
        onChatCreated(existingChat.id);
        onClose();
        return;
      }
    }

    setCreating(true);
    try {
      const { data, error } = await createChat(
        selectedUsers, 
        isGroupChat ? groupName || `Группа (${selectedUsers.length + 1})` : undefined
      );

      if (error) {
        console.error('Error creating chat:', error);
        toast.error('Не удалось создать чат');
        return;
      }

      if (data) {
        onChatCreated(data.id);
        onClose();
        toast.success(isGroupChat ? 'Группа создана' : 'Чат создан');
      }
    } catch (err) {
      console.error('Unexpected error creating chat:', err);
      toast.error('Произошла ошибка');
    } finally {
      setCreating(false);
    }
  };

  const selectedUsersData = selectedUsers.map(id => 
    users.find(u => u.user_id === id)
  ).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card rounded-3xl shadow-medium border border-border overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            {step === 'group-info' && (
              <button
                onClick={() => setStep('select')}
                className="p-2 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-lg font-semibold">
              {step === 'select' ? 'Новый чат' : 'Настройка группы'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'select' ? (
          <>
            {/* Search */}
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Поиск пользователей..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            {/* Selected users */}
            {selectedUsers.length > 0 && (
              <div className="px-4 pb-2">
                <div className="flex items-center gap-2 mb-2">
                  {isGroupChat && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Групповой чат ({selectedUsers.length} участников)
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((userId) => {
                    const selectedUser = users.find((u) => u.user_id === userId);
                    if (!selectedUser) return null;
                    return (
                      <button
                        key={userId}
                        onClick={() => toggleUser(userId)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm"
                      >
                        <span>{selectedUser.display_name}</span>
                        <X className="w-3 h-3" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Users list */}
            <div className="max-h-64 overflow-y-auto scrollbar-thin">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Пользователи не найдены
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.user_id}
                    onClick={() => toggleUser(u.user_id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors',
                      selectedUsers.includes(u.user_id) && 'bg-accent'
                    )}
                  >
                    <Avatar
                      src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.user_id}`}
                      alt={u.display_name}
                      size="md"
                      status={u.status as 'online' | 'offline' | 'away'}
                    />
                    <div className="flex-1 text-left">
                      <p className="font-medium">{u.display_name}</p>
                      {u.username && (
                        <p className="text-sm text-muted-foreground">@{u.username}</p>
                      )}
                    </div>
                    {selectedUsers.includes(u.user_id) && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-xs text-primary-foreground">✓</span>
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Create button */}
            <div className="p-4 border-t border-border">
              <button
                onClick={handleNext}
                disabled={selectedUsers.length === 0 || creating}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all',
                  selectedUsers.length > 0
                    ? 'gradient-primary text-primary-foreground shadow-glow'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {creating ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    {isGroupChat ? (
                      <>
                        <Users className="w-5 h-5" />
                        Далее
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5" />
                        Начать чат
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Group Info Step */}
            <div className="p-6">
              {/* Group Avatar Preview */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    <Users className="w-10 h-10 text-primary" />
                  </div>
                </div>
              </div>

              {/* Group Name Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Название группы</label>
                <input
                  type="text"
                  placeholder={`Группа (${selectedUsers.length + 1})`}
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-4 py-3 bg-muted rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Participants Preview */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Участники ({selectedUsers.length + 1})
                </label>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm">
                    <span>Вы</span>
                  </div>
                  {selectedUsersData.map((u) => (
                    <div
                      key={u?.user_id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm"
                    >
                      <span>{u?.display_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Create Group Button */}
            <div className="p-4 border-t border-border">
              <button
                onClick={handleCreateChat}
                disabled={creating}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium gradient-primary text-primary-foreground shadow-glow transition-all"
              >
                {creating ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    <Users className="w-5 h-5" />
                    Создать группу
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};