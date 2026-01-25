export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["ai_action_type"]
          created_at: string
          id: string
          input_metadata: Json | null
          result_summary: string | null
          target_chat_id: string | null
          user_id: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["ai_action_type"]
          created_at?: string
          id?: string
          input_metadata?: Json | null
          result_summary?: string | null
          target_chat_id?: string | null
          user_id: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["ai_action_type"]
          created_at?: string
          id?: string
          input_metadata?: Json | null
          result_summary?: string | null
          target_chat_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_actions_target_chat_id_fkey"
            columns: ["target_chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_memory_items: {
        Row: {
          created_at: string
          encrypted_blob: string
          id: string
          metadata: Json | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_blob: string
          id?: string
          metadata?: Json | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_blob?: string
          id?: string
          metadata?: Json | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_permissions: {
        Row: {
          can_draft_reply: boolean
          can_extract_tasks: boolean
          can_summarise: boolean
          can_translate: boolean
          chat_id: string | null
          granted_at: string
          id: string
          user_id: string
        }
        Insert: {
          can_draft_reply?: boolean
          can_extract_tasks?: boolean
          can_summarise?: boolean
          can_translate?: boolean
          chat_id?: string | null
          granted_at?: string
          id?: string
          user_id: string
        }
        Update: {
          can_draft_reply?: boolean
          can_extract_tasks?: boolean
          can_summarise?: boolean
          can_translate?: boolean
          chat_id?: string | null
          granted_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_permissions_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_sessions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          mode: Database["public"]["Enums"]["ai_session_mode"]
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          mode?: Database["public"]["Enums"]["ai_session_mode"]
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          mode?: Database["public"]["Enums"]["ai_session_mode"]
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      call_participants: {
        Row: {
          call_id: string
          created_at: string
          id: string
          is_muted: boolean
          is_screen_sharing: boolean
          is_video_off: boolean
          joined_at: string | null
          left_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          call_id: string
          created_at?: string
          id?: string
          is_muted?: boolean
          is_screen_sharing?: boolean
          is_video_off?: boolean
          joined_at?: string | null
          left_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          call_id?: string
          created_at?: string
          id?: string
          is_muted?: boolean
          is_screen_sharing?: boolean
          is_video_off?: boolean
          joined_at?: string | null
          left_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_participants_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      call_peer_connections: {
        Row: {
          answer: Json | null
          call_id: string
          connection_state: string | null
          created_at: string
          from_user_id: string
          ice_candidates: Json[] | null
          id: string
          offer: Json | null
          to_user_id: string
          updated_at: string
        }
        Insert: {
          answer?: Json | null
          call_id: string
          connection_state?: string | null
          created_at?: string
          from_user_id: string
          ice_candidates?: Json[] | null
          id?: string
          offer?: Json | null
          to_user_id: string
          updated_at?: string
        }
        Update: {
          answer?: Json | null
          call_id?: string
          connection_state?: string | null
          created_at?: string
          from_user_id?: string
          ice_candidates?: Json[] | null
          id?: string
          offer?: Json | null
          to_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_peer_connections_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          answer: Json | null
          call_type: string
          callee_id: string
          caller_id: string
          chat_id: string
          created_at: string
          ended_at: string | null
          ice_candidates: Json[] | null
          id: string
          is_group_call: boolean
          max_participants: number | null
          offer: Json | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          answer?: Json | null
          call_type?: string
          callee_id: string
          caller_id: string
          chat_id: string
          created_at?: string
          ended_at?: string | null
          ice_candidates?: Json[] | null
          id?: string
          is_group_call?: boolean
          max_participants?: number | null
          offer?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          answer?: Json | null
          call_type?: string
          callee_id?: string
          caller_id?: string
          chat_id?: string
          created_at?: string
          ended_at?: string | null
          ice_candidates?: Json[] | null
          id?: string
          is_group_call?: boolean
          max_participants?: number | null
          offer?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          archived_at: string | null
          chat_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          muted_until: string | null
          pinned_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          chat_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          muted_until?: string | null
          pinned_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          chat_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          muted_until?: string | null
          pinned_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chats: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          group_avatar: string | null
          group_name: string | null
          id: string
          is_group: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_avatar?: string | null
          group_name?: string | null
          id?: string
          is_group?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_avatar?: string | null
          group_name?: string | null
          id?: string
          is_group?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      contact_nicknames: {
        Row: {
          contact_user_id: string
          created_at: string
          id: string
          nickname: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_user_id: string
          created_at?: string
          id?: string
          nickname: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_user_id?: string
          created_at?: string
          id?: string
          nickname?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      disappear_policies: {
        Row: {
          chat_id: string
          id: string
          set_by: string
          ttl_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          chat_id: string
          id?: string
          set_by: string
          ttl_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          chat_id?: string
          id?: string
          set_by?: string
          ttl_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disappear_policies_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: true
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      e2ee_identity_keys: {
        Row: {
          created_at: string
          id: string
          identity_key: string
          registration_id: number
          signing_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          identity_key: string
          registration_id: number
          signing_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          identity_key?: string
          registration_id?: number
          signing_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      e2ee_one_time_prekeys: {
        Row: {
          created_at: string
          id: string
          key_id: number
          public_key: string
          used: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_id: number
          public_key: string
          used?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_id?: number
          public_key?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      e2ee_prekey_bundles: {
        Row: {
          bundle: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bundle: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bundle?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      e2ee_signed_prekeys: {
        Row: {
          created_at: string
          id: string
          key_id: number
          public_key: string
          signature: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_id: number
          public_key: string
          signature: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_id?: number
          public_key?: string
          signature?: string
          user_id?: string
        }
        Relationships: []
      }
      group_invites: {
        Row: {
          chat_id: string
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          max_uses: number | null
          password_hash: string | null
          revoked_at: string | null
          token: string
          use_count: number | null
        }
        Insert: {
          chat_id: string
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          password_hash?: string | null
          revoked_at?: string | null
          token: string
          use_count?: number | null
        }
        Update: {
          chat_id?: string
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          password_hash?: string | null
          revoked_at?: string | null
          token?: string
          use_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "group_invites_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      locked_chats: {
        Row: {
          chat_id: string
          id: string
          locked_at: string | null
          user_id: string
        }
        Insert: {
          chat_id: string
          id?: string
          locked_at?: string | null
          user_id: string
        }
        Update: {
          chat_id?: string
          id?: string
          locked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locked_chats_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      login_tokens: {
        Row: {
          created_at: string
          id: string
          last_used_at: string | null
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_id: string
          content: string | null
          created_at: string
          deleted_at: string | null
          deleted_for_everyone: boolean | null
          encrypted_content: string | null
          expires_at: string | null
          id: string
          is_delivered: boolean
          is_encrypted: boolean | null
          is_read: boolean
          media_url: string | null
          message_type: string
          reply_to: string | null
          sender_id: string
          sender_ratchet_key: string | null
          updated_at: string
        }
        Insert: {
          chat_id: string
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_for_everyone?: boolean | null
          encrypted_content?: string | null
          expires_at?: string | null
          id?: string
          is_delivered?: boolean
          is_encrypted?: boolean | null
          is_read?: boolean
          media_url?: string | null
          message_type?: string
          reply_to?: string | null
          sender_id: string
          sender_ratchet_key?: string | null
          updated_at?: string
        }
        Update: {
          chat_id?: string
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_for_everyone?: boolean | null
          encrypted_content?: string | null
          expires_at?: string | null
          id?: string
          is_delivered?: boolean
          is_encrypted?: boolean | null
          is_read?: boolean
          media_url?: string | null
          message_type?: string
          reply_to?: string | null
          sender_id?: string
          sender_ratchet_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          last_seen: string | null
          phone: string | null
          show_last_seen: boolean
          show_online_status: boolean
          status: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          id?: string
          last_seen?: string | null
          phone?: string | null
          show_last_seen?: boolean
          show_online_status?: boolean
          status?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          last_seen?: string | null
          phone?: string | null
          show_last_seen?: boolean
          show_online_status?: boolean
          status?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          last_seen: string | null
          show_last_seen: boolean | null
          show_online_status: boolean | null
          status: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          last_seen?: string | null
          show_last_seen?: boolean | null
          show_online_status?: boolean | null
          status?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          last_seen?: string | null
          show_last_seen?: boolean | null
          show_online_status?: boolean | null
          status?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          keys_auth: string
          keys_p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          keys_auth: string
          keys_p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          keys_auth?: string
          keys_p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip_address: string
          request_count: number
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip_address: string
          request_count?: number
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          reason: string
          reported_user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          reason: string
          reported_user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          reason?: string
          reported_user_id?: string
        }
        Relationships: []
      }
      saved_messages: {
        Row: {
          chat_id: string
          id: string
          message_id: string
          saved_at: string | null
          user_id: string
        }
        Insert: {
          chat_id: string
          id?: string
          message_id: string
          saved_at?: string | null
          user_id: string
        }
        Update: {
          chat_id?: string
          id?: string
          message_id?: string
          saved_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_status: {
        Row: {
          chat_id: string
          id: string
          is_typing: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_id: string
          id?: string
          is_typing?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          id?: string
          is_typing?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_status_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ai_settings: {
        Row: {
          allow_chat_analysis: boolean
          allow_selected_chats_only: boolean
          created_at: string
          id: string
          memory_mode: Database["public"]["Enums"]["ai_memory_mode"]
          onboarding_completed: boolean
          preferred_language: string | null
          privacy_preset: string | null
          tone_style: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_chat_analysis?: boolean
          allow_selected_chats_only?: boolean
          created_at?: string
          id?: string
          memory_mode?: Database["public"]["Enums"]["ai_memory_mode"]
          onboarding_completed?: boolean
          preferred_language?: string | null
          privacy_preset?: string | null
          tone_style?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_chat_analysis?: boolean
          allow_selected_chats_only?: boolean
          created_at?: string
          id?: string
          memory_mode?: Database["public"]["Enums"]["ai_memory_mode"]
          onboarding_completed?: boolean
          preferred_language?: string | null
          privacy_preset?: string | null
          tone_style?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voip_tokens: {
        Row: {
          created_at: string
          device_token: string
          id: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_token: string
          id?: string
          platform?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_token?: string
          id?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_block_user: {
        Args: { _block: boolean; _target_user_id: string }
        Returns: boolean
      }
      admin_set_user_role: {
        Args: {
          _action: string
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: boolean
      }
      append_call_ice_candidate: {
        Args: { _call_id: string; _candidate: Json }
        Returns: undefined
      }
      append_group_call_ice_candidate: {
        Args: {
          _call_id: string
          _candidate: Json
          _from_user_id: string
          _to_user_id: string
        }
        Returns: undefined
      }
      chat_has_participants: { Args: { _chat_id: string }; Returns: boolean }
      cleanup_expired_messages: { Args: never; Returns: undefined }
      get_admin_analytics: { Args: never; Returns: Json }
      get_admin_users: { Args: never; Returns: Json }
      has_completed_ai_onboarding: {
        Args: { _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_call_member: {
        Args: { p_call_id: string; p_user_id: string }
        Returns: boolean
      }
      is_chat_participant: {
        Args: { _chat_id: string; _user_id: string }
        Returns: boolean
      }
      is_user_blocked: {
        Args: { _by_user_id: string; _user_id: string }
        Returns: boolean
      }
      join_group_via_invite: {
        Args: { _password?: string; _token: string }
        Returns: string
      }
    }
    Enums: {
      ai_action_type:
        | "summarise"
        | "extract_tasks"
        | "draft_reply"
        | "translate"
        | "privacy_check"
      ai_memory_mode: "none" | "local" | "cloud_encrypted"
      ai_session_mode: "chat" | "onboarding" | "incognito"
      app_role: "admin" | "moderator" | "user"
      group_role: "owner" | "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ai_action_type: [
        "summarise",
        "extract_tasks",
        "draft_reply",
        "translate",
        "privacy_check",
      ],
      ai_memory_mode: ["none", "local", "cloud_encrypted"],
      ai_session_mode: ["chat", "onboarding", "incognito"],
      app_role: ["admin", "moderator", "user"],
      group_role: ["owner", "admin", "member"],
    },
  },
} as const
