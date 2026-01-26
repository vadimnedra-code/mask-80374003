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
  fileIds?: string[];
  imageUrl?: string;
}

interface Attachment {
  filename: string;
  content: string; // base64
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

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

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

    const { to, subject, body, artifactId, fileIds, imageUrl }: EmailRequest = await req.json();

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

    console.log(`Sending anonymous email to: ${to}, with ${fileIds?.length || 0} files`);

    // Prepare attachments
    const attachments: Attachment[] = [];

    // Process attached files from studio-files bucket
    if (fileIds && fileIds.length > 0) {
      // Get file records
      const { data: fileRecords, error: filesError } = await supabase
        .from("studio_files")
        .select("*")
        .in("id", fileIds)
        .eq("user_id", userId);

      if (filesError) {
        console.error("Error fetching file records:", filesError);
      } else if (fileRecords && fileRecords.length > 0) {
        // Use service role client to download files
        const serviceClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        for (const fileRecord of fileRecords) {
          try {
            const { data: fileData, error: downloadError } = await serviceClient.storage
              .from("studio-files")
              .download(fileRecord.storage_path);

            if (downloadError) {
              console.error(`Error downloading file ${fileRecord.original_name}:`, downloadError);
              continue;
            }

            // Convert to base64
            const arrayBuffer = await fileData.arrayBuffer();
            const base64 = btoa(
              new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );

            attachments.push({
              filename: fileRecord.original_name,
              content: base64,
            });

            console.log(`Attached file: ${fileRecord.original_name}`);
          } catch (err) {
            console.error(`Failed to process file ${fileRecord.original_name}:`, err);
          }
        }
      }
    }

    // Process inline image URL (generated images)
    if (imageUrl && imageUrl.startsWith('data:image/')) {
      try {
        // Extract base64 from data URL
        const matches = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
        if (matches) {
          const extension = matches[1];
          const base64Data = matches[2];
          attachments.push({
            filename: `mask-generated-${Date.now()}.${extension}`,
            content: base64Data,
          });
          console.log("Attached generated image");
        }
      } catch (err) {
        console.error("Failed to process image URL:", err);
      }
    }

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

    // Build email options
    const emailOptions: any = {
      from: "MASK Relay <onboarding@resend.dev>",
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
            ${attachments.length > 0 ? `
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
                <p style="color: #666; font-size: 14px; margin: 0;">
                  📎 ${attachments.length} attachment(s) included
                </p>
              </div>
            ` : ''}
          </div>
          <p style="color: #888; font-size: 12px; text-align: center; margin-top: 20px;">
            This message was sent anonymously via MASK relay. The sender's identity is protected.
          </p>
        </div>
      `,
    };

    // Add attachments if any
    if (attachments.length > 0) {
      emailOptions.attachments = attachments;
    }

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send(emailOptions);

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

    console.log("Email sent successfully:", emailData?.id, `with ${attachments.length} attachments`);

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
        externalId: emailData?.id,
        attachmentCount: attachments.length,
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
