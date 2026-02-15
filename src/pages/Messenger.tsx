import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ChatList } from '@/components/messenger/ChatListDB';
import { ChatViewDB } from '@/components/messenger/ChatViewDB';
import { EmptyState } from '@/components/messenger/EmptyState';
import { SettingsPanelDB } from '@/components/messenger/SettingsPanelDB';
import { ProfileEditPanel } from '@/components/messenger/ProfileEditPanel';
import { CallScreen } from '@/components/messenger/CallScreen';
import { GroupCallScreen } from '@/components/messenger/GroupCallScreen';
import { NewChatDialog } from '@/components/messenger/NewChatDialog';
import { SearchPanel } from '@/components/messenger/SearchPanel';
import { IncomingCallDialog } from '@/components/messenger/IncomingCallDialog';
import { IdleWarningDialog } from '@/components/messenger/IdleWarningDialog';
import { AIOnboardingWizard } from '@/components/ai/AIOnboardingWizard';
import { AIStudioPanel } from '@/components/studio/AIStudioPanel';
import { useAuth } from '@/hooks/useAuth';
import { useChats } from '@/hooks/useChats';
import { useProfile } from '@/hooks/useProfile';
import { useWebRTC, fetchTurnCredentials } from '@/hooks/useWebRTC';
import { useGroupWebRTC } from '@/hooks/useGroupWebRTC';
import { useIncomingCalls } from '@/hooks/useIncomingCalls';
import { useCallKit } from '@/hooks/useCallKit';
import { useVoipToken } from '@/hooks/useVoipToken';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAppLifecycle } from '@/hooks/useAppLifecycle';
import { useAISettings } from '@/hooks/useAISettings';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const Messenger = () => {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showAIOnboarding, setShowAIOnboarding] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [callParticipant, setCallParticipant] = useState<{ name: string; avatar: string } | null>(null);

  const { user, loading: authLoading } = useAuth();
  const { chats, loading: chatsLoading, createChat, deleteChat, togglePinChat, refetch: refetchChats } = useChats();
  const { updateStatus } = useProfile(user?.id);
  const { needsOnboarding, loading: aiSettingsLoading } = useAISettings();
  const navigate = useNavigate();
  
  const { incomingCall, clearIncomingCall } = useIncomingCalls();
  const { saveToken } = useVoipToken();
  
  // Initialize push notifications and document title
  usePushNotifications();
  useDocumentTitle();
  
  // Pre-warm TURN credentials so calls connect faster
  useEffect(() => {
    if (user) {
      fetchTurnCredentials().catch(() => {});
    }
  }, [user]);
  
  // App lifecycle management - keeps app open for 10 min, tracks activity
  const { 
    showIdleWarning, 
    dismissIdleWarning, 
    keepActive,
    wakeLockActive 
  } = useAppLifecycle({
    minActiveTime: 5 * 60 * 1000, // 5 minutes minimum
    idleWarningTime: 4 * 60 * 1000, // Show warning after 4 min idle
    idleCloseTime: 60 * 1000, // Close 1 min after warning
    keepScreenOn: true,
    onIdleWarning: () => {
      console.log('[Messenger] User idle, showing warning');
    },
    onIdleClose: () => {
      console.log('[Messenger] Closing due to inactivity');
      // On mobile, we can't really "close" the app, but we can show a notification
      toast.info('Сессия завершена из-за неактивности');
    },
  });
  
  // CallKit integration for iOS native call UI
  const { initialize: initializeCallKit, isAvailable: isCallKitAvailable } = useCallKit({
    onCallAnswered: async (connectionId) => {
      console.log('CallKit: Call answered via native UI:', connectionId);
      // The connectionId is the call_id - accept it directly (incomingCall state may not be hydrated yet)
      if (connectionId) {
        await handleAcceptIncomingCall(connectionId);
      }
    },
    onTokenReceived: async (token) => {
      console.log('CallKit: VoIP token received, saving...');
      await saveToken(token);
    },
  });
  
  const {
    callState,
    getPeerConnection,
    diagnosticLogs,
    copyDiagnosticReport,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
    changeVideoQuality,
    cancelReconnect,
    forceReconnect,
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

  // Group call WebRTC
  const {
    callState: groupCallState,
    startGroupCall,
    joinGroupCall,
    leaveCall: leaveGroupCall,
    inviteToCall,
    toggleMute: toggleGroupMute,
    toggleVideo: toggleGroupVideo,
    startScreenShare,
    stopScreenShare,
    switchCamera: switchGroupCamera,
  } = useGroupWebRTC({
    onCallEnded: () => {
      toast.info('Групповой звонок завершён');
    },
    onParticipantJoined: (participant) => {
      toast.info(`${participant.display_name || 'Участник'} присоединился`);
    },
    onParticipantLeft: (participant) => {
      toast.info(`${participant.display_name || 'Участник'} покинул звонок`);
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
      // Use replace so the user can't accidentally back-swipe into /auth from within the app
      navigate('/auth', { replace: true });
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

  // Show AI onboarding if needed
  useEffect(() => {
    if (!aiSettingsLoading && needsOnboarding && user) {
      setShowAIOnboarding(true);
    }
  }, [aiSettingsLoading, needsOnboarding, user]);

  if (authLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const selectedChat = chats.find((chat) => chat.id === selectedChatId);
  
  // Get display name for the selected chat
  const getSelectedChatName = () => {
    if (!selectedChat) return undefined;
    if (selectedChat.is_group) return selectedChat.group_name || 'Группа';
    const otherParticipant = selectedChat.participants.find((p) => p.user_id !== user.id);
    return otherParticipant?.display_name || 'Чат';
  };
  
  // Send message to selected chat (for AI integration)
  const sendMessageToChat = useCallback(async (content: string) => {
    if (!selectedChatId || !user?.id) return;
    
    const { error } = await supabase
      .from('messages')
      .insert({
        chat_id: selectedChatId,
        sender_id: user.id,
        content,
        message_type: 'text',
      });
      
    if (error) {
      console.error('Error sending message from AI:', error);
      toast.error('Не удалось отправить сообщение');
    }
  }, [selectedChatId, user?.id]);

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

  const handleStartGroupCall = async (participantIds: string[], type: 'voice' | 'video') => {
    if (!selectedChat) return;
    
    try {
      await startGroupCall(selectedChat.id, participantIds, type);
    } catch (error) {
      toast.error('Не удалось начать групповой звонок. Проверьте доступ к микрофону и камере.');
    }
  };

  const handleEndGroupCall = () => {
    leaveGroupCall();
  };

  const handleAcceptIncomingCall = useCallback(async (callIdOverride?: string) => {
    const callId = callIdOverride ?? incomingCall?.id;
    if (!callId) return;

    try {
      // Use already hydrated incomingCall if it matches, otherwise fetch minimal info
      if (incomingCall && incomingCall.id === callId) {
        setCallParticipant({
          name: incomingCall.caller_name || 'Unknown',
          avatar: incomingCall.caller_avatar || '',
        });
      } else {
        const { data: call, error } = await supabase
          .from('calls')
          .select('caller_id')
          .eq('id', callId)
          .single();
        if (error || !call) throw error || new Error('Call not found');

        const { data: callerProfile } = await supabase
          .from('profiles_public')
          .select('display_name, avatar_url')
          .eq('user_id', call.caller_id)
          .maybeSingle();

        setCallParticipant({
          name: callerProfile?.display_name || 'Unknown',
          avatar:
            callerProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${call.caller_id}`,
        });
      }

      await acceptCall(callId);
      if (incomingCall?.id === callId) clearIncomingCall();
    } catch (error) {
      toast.error('Не удалось принять звонок. Проверьте доступ к микрофону и камере.');
      setCallParticipant(null);
      if (incomingCall?.id === callId) clearIncomingCall();
    }
  }, [incomingCall, acceptCall, clearIncomingCall]);

  const handleRejectIncomingCall = useCallback(async () => {
    if (!incomingCall) return;
    console.log('[Messenger] Rejecting incoming call:', incomingCall.id);
    
    try {
      await rejectCall(incomingCall.id);
    } catch (error) {
      console.error('[Messenger] Error rejecting call:', error);
    }
    
    // Always clear incoming call state, even if rejectCall fails
    console.log('[Messenger] Clearing incoming call state');
    clearIncomingCall();
  }, [incomingCall, rejectCall, clearIncomingCall]);

  const handleSearchSelectMessage = (chatId: string, messageId: string) => {
    setSelectedChatId(chatId);
    setHighlightedMessageId(messageId);
    // Clear highlight after animation
    setTimeout(() => setHighlightedMessageId(null), 3000);
  };

  const isInCall = callState.status !== 'idle' && callParticipant;
  const isInGroupCall = groupCallState.status !== 'idle';
  
  // Debug: Log incoming call state changes
  useEffect(() => {
    console.log('[Messenger] incomingCall state:', incomingCall ? {
      id: incomingCall.id,
      caller: incomingCall.caller_name,
      type: incomingCall.call_type,
      status: incomingCall.status
    } : null);
    console.log('[Messenger] isInCall:', isInCall);
    console.log('[Messenger] Should show IncomingCallDialog:', !!(incomingCall && !isInCall));
  }, [incomingCall, isInCall]);

  return (
    <div className="h-full w-full overflow-hidden bg-background flex flex-col safe-area-top">
      {/* AI Onboarding Wizard */}
      {showAIOnboarding && (
        <AIOnboardingWizard onComplete={() => setShowAIOnboarding(false)} />
      )}

      {/* AI Studio Panel */}
      {showAIChat && (
        <AIStudioPanel onClose={() => setShowAIChat(false)} />
      )}

      {/* Idle Warning Dialog */}
      <IdleWarningDialog
        isOpen={showIdleWarning && !isInCall && !isInGroupCall}
        onStayActive={keepActive}
        onClose={dismissIdleWarning}
        timeRemaining={60}
      />
      
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
          reconnectionState={callState.reconnectionState}
          getPeerConnection={getPeerConnection}
          diagnosticLogs={diagnosticLogs}
          onCopyDiagnosticReport={copyDiagnosticReport}
          error={callState.error}
          onEndCall={handleEndCall}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onSwitchCamera={switchCamera}
          onChangeVideoQuality={changeVideoQuality}
          onForceReconnect={forceReconnect}
          onCancelReconnect={cancelReconnect}
        />
      )}

      {/* Group Call Screen */}
      {isInGroupCall && selectedChat && (
        <GroupCallScreen
          callState={groupCallState}
          chatId={selectedChat.id}
          onLeaveCall={handleEndGroupCall}
          onToggleMute={toggleGroupMute}
          onToggleVideo={toggleGroupVideo}
          onSwitchCamera={switchGroupCamera}
          onStartScreenShare={startScreenShare}
          onStopScreenShare={stopScreenShare}
          onInviteParticipants={inviteToCall}
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
      <div className="flex flex-1 min-h-0 h-full overflow-hidden touch-action-pan-y">
        {/* Sidebar - Chat List */}
        <div
          className={cn(
            'w-full lg:w-[380px] lg:min-w-[380px] border-r border-border transition-all duration-300 h-full overflow-hidden',
            selectedChatId ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'
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
            onOpenAIChat={() => setShowAIChat(true)}
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
          'flex-1 h-full min-h-0 overflow-hidden transition-all duration-300 flex flex-col',
          !selectedChatId ? 'hidden lg:flex' : 'flex'
        )}>
          {selectedChat ? (
            <ChatViewDB
              chat={selectedChat}
              chats={chats}
              onBack={() => setSelectedChatId(null)}
              onStartCall={handleStartCall}
              onStartGroupCall={handleStartGroupCall}
              highlightedMessageId={highlightedMessageId}
              onOpenAIChat={() => setShowAIChat(true)}
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
