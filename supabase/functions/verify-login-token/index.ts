import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TokenRequest {
  action: 'generate' | 'verify';
  token?: string;
  userId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { action, token, userId }: TokenRequest = await req.json();

    if (action === 'generate') {
      // Generate a new secure token for a user
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "userId is required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Generate a secure random token
      const tokenBytes = new Uint8Array(32);
      crypto.getRandomValues(tokenBytes);
      const newToken = Array.from(tokenBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Store the token
      const { error: insertError } = await supabase
        .from('login_tokens')
        .insert({
          user_id: userId,
          token: newToken
        });

      if (insertError) {
        console.error("Error inserting token:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to generate token" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ token: newToken }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === 'verify') {
      // Verify a token and return user session
      if (!token) {
        return new Response(
          JSON.stringify({ error: "token is required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Find the token
      const { data: tokenData, error: fetchError } = await supabase
        .from('login_tokens')
        .select('user_id')
        .eq('token', token)
        .maybeSingle();

      if (fetchError || !tokenData) {
        return new Response(
          JSON.stringify({ error: "Invalid token" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Update last_used_at
      await supabase
        .from('login_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('token', token);

      // Generate a magic link for the user
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: `${tokenData.user_id}@token.local`,
        options: {
          redirectTo: '/'
        }
      });

      // For anonymous users, we need to use a different approach
      // Get the user and create a session directly
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
        tokenData.user_id
      );

      if (userError || !userData.user) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // For anonymous users, we'll return the user_id and let the client handle it
      // Since we can't create a session directly from edge function for anonymous users
      return new Response(
        JSON.stringify({ 
          success: true, 
          userId: tokenData.user_id,
          isAnonymous: userData.user.is_anonymous 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in verify-login-token:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
