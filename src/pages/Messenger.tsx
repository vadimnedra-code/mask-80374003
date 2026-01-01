import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatList } from '@/components/messenger/ChatListDB';
import { ChatViewDB } from '@/components/messenger/ChatViewDB';
import { EmptyState } from '@/components/messenger/EmptyState';
import { SettingsPanelDB } from '@/components/messenger/SettingsPanelDB';
import { ProfileEditPanel } from '@/components/messenger/ProfileEditPanel';
import { CallScreen } from '@/components/messenger/CallScreen';
import { NewChatDialog } from '@/components/messenger/NewChatDialog';
import { SearchPanel } from '@/components/messenger/SearchPanel';
import { IncomingCallDialog } from '@/components/messenger/IncomingCallDialog';
import { useAuth } from '@/hooks/useAuth';
import { useChats } from '@/hooks/useChats';
import { useProfile } from '@/hooks/useProfile';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useIncomingCalls } from '@/hooks/useIncomingCalls';
import { useCallKit } from '@/hooks/useCallKit';
import { useVoipToken } from '@/hooks/useVoipToken';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const Messenger = () => {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [callParticipant, setCallParticipant] = useState<{ name: string; avatar: string } | null>(null);

  const { user, loading: authLoading } = useAuth();
  const { chats, loading: chatsLoading, createChat, deleteChat, togglePinChat, refetch: refetchChats } = useChats();
  const { updateStatus } = useProfile(user?.id);
  const navigate = useNavigate();
  
  const { incomingCall, clearIncomingCall } = useIncomingCalls();
  const { saveToken } = useVoipToken();
  
  // Initialize push notifications and document title
  usePushNotifications();
  useDocumentTitle();
  
  // CallKit integration for iOS native call UI
  const { initialize: initializeCallKit, isAvailable: isCallKitAvailable } = useCallKit({
    onCallAnswered: async (connectionId) => {
      console.log('CallKit: Call answered via native UI:', connectionId);
      // The connectionId is the call_id - accept it via WebRTC
      if (connectionId) {
        await handleAcceptIncomingCall();
      }
    },
    onTokenReceived: async (token) => {
      console.log('CallKit: VoIP token received, saving...');
      await saveToken(token);
    },
  });
  
  const {
    callState,
    peerConnection,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
    changeVideoQuality,
  } = useWebRTC({
    onCallEnded: () => {
      setCallParticipant(null);
      toast.info('Звонок завершён');
    },
    onCallRejected: () => {
      setCallParticipant(null);
      toast.info('Звонок отклонён');
    },
  });

  // Initialize CallKit on iOS
  useEffect(() => {
    if (user && isCallKitAvailable()) {
      initializeCallKit();
    }
  }, [user, isCallKitAvailable, initializeCallKit]);

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
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const selectedChat = chats.find((chat) => chat.id === selectedChatId);

  const handleStartCall = async (type: 'voice' | 'video') => {
    if (!selectedChat) return;
    const otherParticipant = selectedChat.participants.find((p) => p.user_id !== user.id);
    if (!otherParticipant) return;
    
    setCallParticipant({
      name: otherParticipant.display_name,
      avatar: otherParticipant.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherParticipant.user_id}`,
    });
    
    try {
      await startCall(otherParticipant.user_id, selectedChat.id, type);
    } catch (error) {
      toast.error('Не удалось начать звонок. Проверьте доступ к микрофону и камере.');
      setCallParticipant(null);
    }
  };

  const handleEndCall = () => {
    endCall();
    setCallParticipant(null);
  };

  const handleAcceptIncomingCall = async () => {
    if (!incomingCall) return;
    
    setCallParticipant({
      name: incomingCall.caller_name || 'Unknown',
      avatar: incomingCall.caller_avatar || '',
    });
    
    try {
      await acceptCall(incomingCall.id);
      clearIncomingCall();
    } catch (error) {
      toast.error('Не удалось принять звонок. Проверьте доступ к микрофону и камере.');
      setCallParticipant(null);
      clearIncomingCall();
    }
  };

  const handleRejectIncomingCall = async () => {
    if (!incomingCall) return;
    await rejectCall(incomingCall.id);
    clearIncomingCall();
  };

  const handleSearchSelectMessage = (chatId: string, messageId: string) => {
    setSelectedChatId(chatId);
    setHighlightedMessageId(messageId);
    // Clear highlight after animation
    setTimeout(() => setHighlightedMessageId(null), 3000);
  };

  const isInCall = callState.status !== 'idle' && callParticipant;

  return (
    <div className="h-full w-full overflow-hidden bg-background flex flex-col">
      {/* Incoming Call Dialog */}
      {incomingCall && !isInCall && (
        <IncomingCallDialog
          call={incomingCall}
          onAccept={handleAcceptIncomingCall}
          onReject={handleRejectIncomingCall}
        />
      )}

      {/* Call Screen */}
      {isInCall && (
        <CallScreen
          participantName={callParticipant.name}
          participantAvatar={callParticipant.avatar}
          callType={callState.callType}
          callStatus={callState.status as 'calling' | 'ringing' | 'connecting' | 'active'}
          isMuted={callState.isMuted}
          isVideoOff={callState.isVideoOff}
          localStream={callState.localStream}
          remoteStream={callState.remoteStream}
          peerConnectionState={callState.peerConnectionState}
          peerConnection={peerConnection}
          error={callState.error}
          onEndCall={handleEndCall}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onSwitchCamera={switchCamera}
          onChangeVideoQuality={changeVideoQuality}
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
      <div className="flex flex-1 min-h-0">
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
            onOpenProfileEdit={() => setShowProfileEdit(true)}
            onNewChat={() => setShowNewChat(true)}
            onOpenSearch={() => setShowSearch(true)}
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
            onDeleteChat={async (chatId) => {
              const { error } = await deleteChat(chatId);
              if (error) {
                toast.error('Не удалось удалить чат');
              } else {
                if (selectedChatId === chatId) {
                  setSelectedChatId(null);
                }
                toast.success('Чат удалён');
              }
            }}
            onTogglePinChat={async (chatId) => {
              const chat = chats.find(c => c.id === chatId);
              const { error } = await togglePinChat(chatId);
              if (error) {
                toast.error('Не удалось изменить закрепление');
              } else {
              toast.success(chat?.pinned_at ? 'Чат откреплён' : 'Чат закреплён');
              }
            }}
            onRefresh={async () => {
              await refetchChats();
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
              highlightedMessageId={highlightedMessageId}
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

        {/* Profile Edit Panel */}
        {showProfileEdit && (
          <ProfileEditPanel 
            onClose={() => setShowProfileEdit(false)} 
            onOpenSettings={() => setShowSettings(true)}
          />
        )}

        {/* Search Panel */}
        {showSearch && (
          <SearchPanel
            onClose={() => setShowSearch(false)}
            onSelectMessage={handleSearchSelectMessage}
            onStartChat={(chatId) => {
              setSelectedChatId(chatId);
              setShowSearch(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Messenger;
