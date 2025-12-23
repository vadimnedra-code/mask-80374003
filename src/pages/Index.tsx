import { useState } from 'react';
import { ChatList } from '@/components/messenger/ChatList';
import { ChatView } from '@/components/messenger/ChatView';
import { EmptyState } from '@/components/messenger/EmptyState';
import { SettingsPanel } from '@/components/messenger/SettingsPanel';
import { CallScreen } from '@/components/messenger/CallScreen';
import { mockChats } from '@/data/mockData';
import { cn } from '@/lib/utils';

const Index = () => {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeCall, setActiveCall] = useState<{ userId: string; type: 'voice' | 'video'; name: string; avatar: string } | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const selectedChat = mockChats.find((chat) => chat.id === selectedChatId);

  const handleStartCall = (type: 'voice' | 'video') => {
    if (!selectedChat) return;
    const otherUser = selectedChat.participants.find((p) => p.id !== 'user-1');
    if (otherUser) {
      setActiveCall({ 
        userId: otherUser.id, 
        type,
        name: otherUser.name,
        avatar: otherUser.avatar,
      });
    }
  };

  const handleEndCall = () => {
    setActiveCall(null);
    setIsMuted(false);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      {/* Call Screen */}
      {activeCall && (
        <CallScreen
          participantName={activeCall.name}
          participantAvatar={activeCall.avatar}
          callType={activeCall.type}
          callStatus="active"
          isMuted={isMuted}
          onEndCall={handleEndCall}
          onToggleMute={() => setIsMuted(!isMuted)}
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
            chats={mockChats}
            selectedChatId={selectedChatId}
            onSelectChat={setSelectedChatId}
            onOpenSettings={() => setShowSettings(true)}
          />
        </div>

        {/* Main Content */}
        <div className={cn(
          'flex-1 transition-all duration-300',
          !selectedChatId ? 'hidden lg:block' : 'block'
        )}>
          {selectedChat ? (
            <ChatView
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
            <SettingsPanel onClose={() => setShowSettings(false)} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
