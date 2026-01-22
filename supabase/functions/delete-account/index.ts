import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to get their ID
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Create admin client for deletion operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Delete user data in order (respecting foreign keys)
    // 1. Delete message reactions
    await adminClient
      .from('message_reactions')
      .delete()
      .eq('user_id', userId);

    // 2. Delete messages sent by user
    await adminClient
      .from('messages')
      .delete()
      .eq('sender_id', userId);

    // 3. Delete saved messages
    await adminClient
      .from('saved_messages')
      .delete()
      .eq('user_id', userId);

    // 4. Delete typing status
    await adminClient
      .from('typing_status')
      .delete()
      .eq('user_id', userId);

    // 5. Delete chat participants
    await adminClient
      .from('chat_participants')
      .delete()
      .eq('user_id', userId);

    // 6. Delete contact nicknames (both as owner and as contact)
    await adminClient
      .from('contact_nicknames')
      .delete()
      .or(`user_id.eq.${userId},contact_user_id.eq.${userId}`);

    // 7. Delete blocked users (both as blocker and blocked)
    await adminClient
      .from('blocked_users')
      .delete()
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

    // 8. Delete call participants
    await adminClient
      .from('call_participants')
      .delete()
      .eq('user_id', userId);

    // 9. Delete call peer connections
    await adminClient
      .from('call_peer_connections')
      .delete()
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);

    // 10. Delete calls (as caller or callee)
    await adminClient
      .from('calls')
      .delete()
      .or(`caller_id.eq.${userId},callee_id.eq.${userId}`);

    // 11. Delete group invites created by user
    await adminClient
      .from('group_invites')
      .delete()
      .eq('created_by', userId);

    // 12. Delete locked chats
    await adminClient
      .from('locked_chats')
      .delete()
      .eq('user_id', userId);

    // 13. Delete login tokens
    await adminClient
      .from('login_tokens')
      .delete()
      .eq('user_id', userId);

    // 14. Delete push subscriptions
    await adminClient
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);

    // 15. Delete voip tokens
    await adminClient
      .from('voip_tokens')
      .delete()
      .eq('user_id', userId);

    // 16. Delete E2EE keys
    await adminClient
      .from('e2ee_identity_keys')
      .delete()
      .eq('user_id', userId);

    await adminClient
      .from('e2ee_signed_prekeys')
      .delete()
      .eq('user_id', userId);

    await adminClient
      .from('e2ee_one_time_prekeys')
      .delete()
      .eq('user_id', userId);

    await adminClient
      .from('e2ee_prekey_bundles')
      .delete()
      .eq('user_id', userId);

    // 17. Delete disappear policies set by user
    await adminClient
      .from('disappear_policies')
      .delete()
      .eq('set_by', userId);

    // 18. Delete public profile
    await adminClient
      .from('profiles_public')
      .delete()
      .eq('user_id', userId);

    // 19. Delete profile
    await adminClient
      .from('profiles')
      .delete()
      .eq('user_id', userId);

    // 20. Delete chats created by user (that have no other participants)
    // First get chats created by user
    const { data: userChats } = await adminClient
      .from('chats')
      .select('id')
      .eq('created_by', userId);

    if (userChats) {
      for (const chat of userChats) {
        // Check if chat has other participants
        const { count } = await adminClient
          .from('chat_participants')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat.id);

        if (count === 0) {
          await adminClient
            .from('chats')
            .delete()
            .eq('id', chat.id);
        }
      }
    }

    // 21. Finally, delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting auth user:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-account:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
