// AI Studio types

export type ArtifactType = 'document' | 'summary' | 'presentation' | 'image' | 'table' | 'text';
export type CommChannel = 'email' | 'sms' | 'voice';
export type CommStatus = 'pending' | 'sent' | 'delivered' | 'failed';

export interface StudioFile {
  id: string;
  user_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  storage_path: string;
  is_vault: boolean;
  ttl_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudioArtifact {
  id: string;
  user_id: string;
  artifact_type: ArtifactType;
  title: string;
  source_file_id: string | null;
  storage_path: string | null;
  text_content: string | null;
  metadata: Record<string, unknown>;
  is_vault: boolean;
  ttl_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutboundMessage {
  id: string;
  user_id: string;
  channel: CommChannel;
  masked_to: string;
  subject: string | null;
  body_preview: string | null;
  artifact_id: string | null;
  status: CommStatus;
  external_id: string | null;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
}

export interface CallSession {
  id: string;
  user_id: string;
  masked_number: string;
  duration_seconds: number;
  status: string;
  external_call_id: string | null;
  created_at: string;
  ended_at: string | null;
}

export interface ExtendedAISettings {
  allow_file_analysis: boolean;
  allow_outbound_email: boolean;
  allow_outbound_sms: boolean;
  allow_outbound_calls: boolean;
  always_confirm_before_send: boolean;
}

export type StudioAction = 
  | 'convert'
  | 'summarise'
  | 'extract_tasks'
  | 'extract_table'
  | 'generate_presentation'
  | 'generate_image'
  | 'send_email'
  | 'send_sms'
  | 'voice_call';

export interface StudioMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
  attachments?: StudioFile[];
  artifacts?: StudioArtifact[];
}
