export interface GroupCallParticipant {
  id: string;
  call_id: string;
  user_id: string;
  status: 'pending' | 'ringing' | 'connecting' | 'active' | 'left';
  joined_at: string | null;
  left_at: string | null;
  is_muted: boolean;
  is_video_off: boolean;
  is_screen_sharing: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  display_name?: string;
  avatar_url?: string;
  // Runtime data
  stream?: MediaStream;
  screenStream?: MediaStream;
}

export interface GroupCallPeerConnection {
  id: string;
  call_id: string;
  from_user_id: string;
  to_user_id: string;
  offer: RTCSessionDescriptionInit | null;
  answer: RTCSessionDescriptionInit | null;
  ice_candidates: RTCIceCandidateInit[];
  connection_state: string;
  created_at: string;
  updated_at: string;
  // Runtime
  peerConnection?: RTCPeerConnection;
}

export interface GroupCallState {
  callId: string | null;
  status: 'idle' | 'starting' | 'ringing' | 'connecting' | 'active' | 'ended';
  callType: 'voice' | 'video';
  isGroupCall: boolean;
  participants: GroupCallParticipant[];
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  error: string | null;
}

export interface GroupCallInfo {
  id: string;
  caller_id: string;
  callee_id: string;
  chat_id: string;
  status: string;
  call_type: string;
  is_group_call: boolean;
  max_participants: number;
  created_at: string;
}
