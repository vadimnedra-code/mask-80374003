import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WINDOW_MS = 60 * 1000; // 1 minute window
const DEFAULT_MAX_REQUESTS = 10;

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function checkRateLimit(
  ip: string,
  endpoint: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS
): Promise<RateLimitResult> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);

  // Clean up old entries and get current count
  const { data: existing } = await supabase
    .from("rate_limits")
    .select("id, request_count, window_start")
    .eq("ip_address", ip)
    .eq("endpoint", endpoint)
    .gte("window_start", windowStart.toISOString())
    .order("window_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const count = existing.request_count + 1;
    
    if (count > maxRequests) {
      const resetAt = new Date(new Date(existing.window_start).getTime() + WINDOW_MS);
      return { allowed: false, remaining: 0, resetAt };
    }

    await supabase
      .from("rate_limits")
      .update({ request_count: count })
      .eq("id", existing.id);

    return { 
      allowed: true, 
      remaining: maxRequests - count, 
      resetAt: new Date(new Date(existing.window_start).getTime() + WINDOW_MS)
    };
  }

  // Create new rate limit entry
  await supabase
    .from("rate_limits")
    .insert({
      ip_address: ip,
      endpoint: endpoint,
      request_count: 1,
      window_start: now.toISOString()
    });

  return { 
    allowed: true, 
    remaining: maxRequests - 1, 
    resetAt: new Date(now.getTime() + WINDOW_MS)
  };
}

export function rateLimitResponse(resetAt: Date): Response {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  return new Response(
    JSON.stringify({ 
      error: "Too many requests. Please try again later.",
      retryAfter: Math.ceil((resetAt.getTime() - Date.now()) / 1000)
    }),
    { 
      status: 429, 
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "Retry-After": Math.ceil((resetAt.getTime() - Date.now()) / 1000).toString()
      } 
    }
  );
}

export function getClientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
    || req.headers.get("x-real-ip") 
    || "unknown";
}
