import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TokenRequest {
  action: 'generate' | 'verify' | 'login';
  token?: string;
  userId?: string;
  secretKey?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { action, token, userId, secretKey }: TokenRequest = await req.json();

    if (action === 'generate') {
      // Generate/store a login token for a user
      console.log("Generate action called with userId:", userId, "secretKey provided:", !!secretKey);
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "userId is required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Use the secretKey provided by client, or generate a new one
      let tokenToStore = secretKey;
      if (!tokenToStore) {
        const tokenBytes = new Uint8Array(32);
        crypto.getRandomValues(tokenBytes);
        tokenToStore = Array.from(tokenBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      }

      console.log("Token to store (first 10 chars):", tokenToStore.substring(0, 10) + "...");

      // Delete any existing tokens for this user first
      const { error: deleteError } = await supabase
        .from('login_tokens')
        .delete()
        .eq('user_id', userId);
      
      if (deleteError) {
        console.error("Error deleting old tokens:", deleteError);
      }

      // Store the token
      const { data: insertData, error: insertError } = await supabase
        .from('login_tokens')
        .insert({
          user_id: userId,
          token: tokenToStore
        })
        .select();

      if (insertError) {
        console.error("Error inserting token:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to generate token", details: insertError.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("Token inserted successfully:", insertData);

      return new Response(
        JSON.stringify({ token: tokenToStore, success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === 'login') {
      // Login with secret key - find user and return session info
      if (!secretKey) {
        return new Response(
          JSON.stringify({ error: "secretKey is required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("Attempting login with secret key:", secretKey.substring(0, 10) + "...");

      // Find the token
      const { data: tokenData, error: fetchError } = await supabase
        .from('login_tokens')
        .select('user_id')
        .eq('token', secretKey)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching token:", fetchError);
        return new Response(
          JSON.stringify({ error: "Database error" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (!tokenData) {
        console.log("Token not found in database");
        return new Response(
          JSON.stringify({ error: "Invalid key", code: "INVALID_KEY" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("Found user for token:", tokenData.user_id);

      // Update last_used_at
      await supabase
        .from('login_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('token', secretKey);

      // Get user info
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
        tokenData.user_id
      );

      if (userError || !userData.user) {
        console.error("User not found:", userError);
        return new Response(
          JSON.stringify({ error: "User not found", code: "USER_NOT_FOUND" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Generate a magic link for the user to sign in
      // For anonymous users, we'll create a temporary email and use magic link
      const tempEmail = `anon-${tokenData.user_id}@mask.local`;
      
      // First, update user to have this email if they don't have one
      if (!userData.user.email) {
        await supabase.auth.admin.updateUserById(tokenData.user_id, {
          email: tempEmail,
          email_confirm: true
        });
      }

      const userEmail = userData.user.email || tempEmail;

      // Generate magic link
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: userEmail,
        options: {
          redirectTo: '/'
        }
      });

      if (linkError) {
        console.error("Error generating magic link:", linkError);
        return new Response(
          JSON.stringify({ error: "Failed to generate login link" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Extract the token hash from the link
      const hashed_token = linkData.properties?.hashed_token;
      const verification_type = linkData.properties?.verification_type;

      console.log("Generated magic link for user:", userEmail);

      // Get profile info
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', tokenData.user_id)
        .maybeSingle();

      return new Response(
        JSON.stringify({ 
          success: true, 
          userId: tokenData.user_id,
          email: userEmail,
          token_hash: hashed_token,
          verification_type: verification_type,
          displayName: profile?.display_name,
          isAnonymous: userData.user.is_anonymous 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === 'verify') {
      // Verify a token (legacy - kept for compatibility)
      if (!token) {
        return new Response(
          JSON.stringify({ error: "token is required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

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

      await supabase
        .from('login_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('token', token);

      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
        tokenData.user_id
      );

      if (userError || !userData.user) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

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
