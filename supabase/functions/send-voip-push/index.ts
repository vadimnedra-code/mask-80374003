import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// APNs configuration
const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID") || "";
const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID") || "";
const APNS_PRIVATE_KEY = Deno.env.get("APNS_PRIVATE_KEY") || "";
const APNS_BUNDLE_ID = Deno.env.get("APNS_BUNDLE_ID") || "com.mask.messenger";
const APNS_PRODUCTION = Deno.env.get("APNS_PRODUCTION") === "true";

// Generate JWT for APNs authentication
async function generateAPNsJWT(): Promise<string> {
  const header = {
    alg: "ES256",
    kid: APNS_KEY_ID,
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: APNS_TEAM_ID,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const data = encoder.encode(`${headerB64}.${payloadB64}`);

  // Import private key
  const pemContents = APNS_PRIVATE_KEY.replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    data
  );

  // Convert signature from DER to raw format
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

// Send VoIP push notification via APNs
async function sendVoIPPush(
  deviceToken: string,
  callerId: string,
  callerName: string,
  callId: string,
  isVideo: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!APNS_TEAM_ID || !APNS_KEY_ID || !APNS_PRIVATE_KEY) {
      console.error("APNs credentials not configured");
      return { success: false, error: "APNs credentials not configured" };
    }

    const jwt = await generateAPNsJWT();
    
    const apnsHost = APNS_PRODUCTION
      ? "api.push.apple.com"
      : "api.sandbox.push.apple.com";

    const payload = {
      aps: {
        alert: {
          title: callerName,
          body: isVideo ? "Видеозвонок" : "Голосовой звонок",
        },
        sound: "default",
      },
      caller_id: callerId,
      caller_name: callerName,
      call_id: callId,
      call_type: isVideo ? "video" : "voice",
    };

    console.log(`Sending VoIP push to ${deviceToken.substring(0, 20)}...`);

    const response = await fetch(
      `https://${apnsHost}/3/device/${deviceToken}`,
      {
        method: "POST",
        headers: {
          "authorization": `bearer ${jwt}`,
          "apns-topic": `${APNS_BUNDLE_ID}.voip`,
          "apns-push-type": "voip",
          "apns-priority": "10",
          "apns-expiration": "0",
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`APNs error: ${response.status} - ${errorText}`);
      return { success: false, error: `APNs error: ${response.status}` };
    }

    console.log("VoIP push sent successfully");
    return { success: true };
  } catch (error) {
    console.error("Error sending VoIP push:", error);
    return { success: false, error: String(error) };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { callee_id, caller_id, caller_name, call_id, is_video } = await req.json();

    if (!callee_id || !caller_id || !call_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Looking up VoIP token for user: ${callee_id}`);

    // Get callee's VoIP token
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from("voip_tokens")
      .select("device_token, platform")
      .eq("user_id", callee_id)
      .single();

    if (tokenError || !tokenData) {
      console.log("No VoIP token found for user:", callee_id);
      return new Response(
        JSON.stringify({ error: "No VoIP token found", sent: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found token for platform: ${tokenData.platform}`);

    // Only iOS supports VoIP push via CallKit
    if (tokenData.platform !== "ios") {
      console.log("VoIP push only supported on iOS");
      return new Response(
        JSON.stringify({ error: "VoIP push only supported on iOS", sent: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send VoIP push
    const result = await sendVoIPPush(
      tokenData.device_token,
      caller_id,
      caller_name || "Неизвестный",
      call_id,
      is_video ?? false
    );

    return new Response(
      JSON.stringify({ sent: result.success, error: result.error }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-voip-push:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
