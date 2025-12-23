import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatList } from '@/components/messenger/ChatListDB';
import { ChatViewDB } from '@/components/messenger/ChatViewDB';
import { EmptyState } from '@/components/messenger/EmptyState';
import { SettingsPanelDB } from '@/components/messenger/SettingsPanelDB';
import { CallScreen } from '@/components/messenger/CallScreen';
import { NewChatDialog } from '@/components/messenger/NewChatDialog';
import { useAuth } from '@/hooks/useAuth';
import { useChats } from '@/hooks/useChats';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const Messenger = () => {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [activeCall, setActiveCall] = useState<{ participantName: string; avatarUrl: string; type: 'voice' | 'video' } | null>(null);

  const { user, loading: authLoading } = useAuth();
  const { chats, loading: chatsLoading, createChat } = useChats();
  const { updateStatus } = useProfile(user?.id);
  const navigate = useNavigate();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Update online status - run once on mount and cleanup on unmount
  useEffect(() => {
    if (!user) return;
    
    // Set online status once
    updateStatus('online');

    const handleBeforeUnload = () => {
      updateStatus('offline');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updateStatus('offline');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const selectedChat = chats.find((chat) => chat.id === selectedChatId);

  const handleStartCall = (type: 'voice' | 'video') => {
    if (!selectedChat) return;
    const otherParticipant = selectedChat.participants.find((p) => p.user_id !== user.id);
    if (otherParticipant) {
      setActiveCall({ 
        participantName: otherParticipant.display_name,
        avatarUrl: otherParticipant.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherParticipant.user_id}`,
        type 
      });
    }
  };

  const handleEndCall = () => {
    setActiveCall(null);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      {/* Call Screen */}
      {activeCall && (
        <CallScreen
          user={{
            id: 'call-user',
            name: activeCall.participantName,
            avatar: activeCall.avatarUrl,
            status: 'online',
          }}
          callType={activeCall.type}
          onEndCall={handleEndCall}
        />
      )}

      {/* New Chat Dialog */}
      {showNewChat && (
        <NewChatDialog
          onClose={() => setShowNewChat(false)}
          onChatCreated={(chatId) => {
            setSelectedChatId(chatId);
            setShowNewChat(false);
          }}
        />
      )}

      {/* Main Layout */}
      <div className="flex h-full">
        {/* Sidebar - Chat List */}
        <div
          className={cn(
            'w-full lg:w-[380px] lg:min-w-[380px] border-r border-border transition-all duration-300',
            selectedChatId ? 'hidden lg:block' : 'block'
          )}
        >
          <ChatList
            chats={chats}
            selectedChatId={selectedChatId}
            onSelectChat={setSelectedChatId}
            onOpenSettings={() => setShowSettings(true)}
            onNewChat={() => setShowNewChat(true)}
            onStartChatWithUser={async (userId) => {
              try {
                // Check if chat already exists
                const existingChat = chats.find(
                  (c) => !c.is_group && c.participants.some((p) => p.user_id === userId)
                );
                if (existingChat) {
                  setSelectedChatId(existingChat.id);
                  return;
                }
                // Create new chat directly
                const { data, error } = await createChat([userId]);
                if (error) {
                  console.error('Error creating chat:', error);
                  toast.error('Не удалось создать чат');
                  return;
                }
                if (data) {
                  setSelectedChatId(data.id);
                  toast.success('Чат создан');
                }
              } catch (err) {
                console.error('Unexpected error:', err);
                toast.error('Произошла ошибка');
              }
            }}
            loading={chatsLoading}
          />
        </div>

        {/* Main Content */}
        <div className={cn(
          'flex-1 transition-all duration-300',
          !selectedChatId ? 'hidden lg:block' : 'block'
        )}>
          {selectedChat ? (
            <ChatViewDB
              chat={selectedChat}
              onBack={() => setSelectedChatId(null)}
              onStartCall={handleStartCall}
            />
          ) : (
            <EmptyState />
          )}
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="fixed inset-0 z-40 lg:relative lg:w-[380px] lg:min-w-[380px] lg:border-l lg:border-border">
            <SettingsPanelDB onClose={() => setShowSettings(false)} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Messenger;
