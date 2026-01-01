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
  const [isVideoOff, setIsVideoOff] = useState(false);

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
    setIsVideoOff(false);
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-background">
      {/* Call Screen */}
      {activeCall && (
        <CallScreen
          participantName={activeCall.name}
          participantAvatar={activeCall.avatar}
          callType={activeCall.type}
          callStatus="active"
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          localStream={null}
          remoteStream={null}
          peerConnectionState={null}
          getPeerConnection={() => null}
          error={null}
          onEndCall={handleEndCall}
          onToggleMute={() => setIsMuted(!isMuted)}
          onToggleVideo={() => setIsVideoOff(!isVideoOff)}
          onSwitchCamera={() => console.log('Switch camera not available in mock mode')}
        />
      )}

      {/* Main Layout */}
      <div className="flex h-full w-full">
        {/* Sidebar - Chat List */}
        <div
          className={cn(
            'w-full md:w-[320px] lg:w-[380px] md:min-w-[320px] lg:min-w-[380px] border-r border-border transition-all duration-300 flex-shrink-0',
            selectedChatId ? 'hidden md:block' : 'block'
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
          'flex-1 min-w-0 transition-all duration-300',
          !selectedChatId ? 'hidden md:block' : 'block'
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
          <div className="fixed inset-0 z-40 md:relative md:w-[320px] lg:w-[380px] md:min-w-[320px] lg:min-w-[380px] md:border-l md:border-border">
            <SettingsPanel onClose={() => setShowSettings(false)} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
