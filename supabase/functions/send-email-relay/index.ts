import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  artifactId?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // Check user permissions
    const { data: settings } = await supabase
      .from("user_ai_settings")
      .select("allow_outbound_email")
      .eq("user_id", userId)
      .single();

    if (!settings?.allow_outbound_email) {
      return new Response(
        JSON.stringify({ error: "Email relay not enabled in settings" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { to, subject, body, artifactId }: EmailRequest = await req.json();

    // Validate input
    if (!to || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending anonymous email to: ${to}`);

    // Create outbound message record
    const { data: outboundMsg, error: insertError } = await supabase
      .from("outbound_messages")
      .insert({
        user_id: userId,
        channel: "email",
        masked_to: to,
        subject: subject || "(no subject)",
        body_preview: body.slice(0, 100),
        artifact_id: artifactId || null,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create outbound message:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create message record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email via Resend
    // IMPORTANT: Use your verified domain in production
    // For testing, Resend allows sending to your own email from onboarding@resend.dev
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "MASK Relay <onboarding@resend.dev>", // Replace with your verified domain
      to: [to],
      subject: subject || "Message via MASK",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1a1a2e; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: #fff; margin: 0;">🎭 MASK Relay</h2>
            <p style="color: #888; margin: 5px 0 0;">Anonymous message</p>
          </div>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px;">
            <div style="background: #fff; padding: 20px; border-radius: 8px; white-space: pre-wrap;">${body}</div>
          </div>
          <p style="color: #888; font-size: 12px; text-align: center; margin-top: 20px;">
            This message was sent anonymously via MASK relay. The sender's identity is protected.
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      
      // Update outbound message status
      await supabase
        .from("outbound_messages")
        .update({
          status: "failed",
          error_message: emailError.message || "Failed to send",
        })
        .eq("id", outboundMsg.id);

      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully:", emailData?.id);

    // Update outbound message with success
    await supabase
      .from("outbound_messages")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        external_id: emailData?.id,
      })
      .eq("id", outboundMsg.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: outboundMsg.id,
        externalId: emailData?.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-email-relay:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
