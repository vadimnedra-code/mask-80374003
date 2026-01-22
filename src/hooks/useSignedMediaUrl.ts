import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type UseSignedMediaUrlState = {
  url: string | null;
  loading: boolean;
  error: string | null;
};

const cache = new Map<string, string>();

function extractChatMediaPath(inputUrl: string): string | null {
  // Already a signed url
  if (inputUrl.includes("/storage/v1/object/sign/chat-media/")) {
    const parts = inputUrl.split("/storage/v1/object/sign/chat-media/");
    if (parts.length < 2) return null;
    return decodeURIComponent(parts[1].split("?")[0] ?? "");
  }

  // Public URL format
  if (inputUrl.includes("/storage/v1/object/public/chat-media/")) {
    const parts = inputUrl.split("/storage/v1/object/public/chat-media/");
    if (parts.length < 2) return null;
    return decodeURIComponent(parts[1].split("?")[0] ?? "");
  }

  // Fallback: direct bucket prefix
  const marker = "chat-media/";
  const idx = inputUrl.indexOf(marker);
  if (idx !== -1) {
    return decodeURIComponent(inputUrl.slice(idx + marker.length).split("?")[0] ?? "");
  }

  return null;
}

/**
 * Converts a stored chat-media URL (often generated via getPublicUrl)
 * into a signed URL that works with private buckets.
 */
export function useSignedMediaUrl(
  originalUrl: string | null | undefined,
  opts?: { expiresIn?: number },
): UseSignedMediaUrlState {
  const expiresIn = opts?.expiresIn ?? 60 * 60; // 1h

  const cacheKey = useMemo(() => (originalUrl ? `v1:${originalUrl}` : null), [originalUrl]);

  const [state, setState] = useState<UseSignedMediaUrlState>({
    url: originalUrl ?? null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!originalUrl) {
      setState({ url: null, loading: false, error: null });
      return;
    }

    // Non-http assets should be used as-is (blob:, data:, etc.)
    if (!/^https?:\/\//i.test(originalUrl)) {
      setState({ url: originalUrl, loading: false, error: null });
      return;
    }

    // If it's already signed, use it as-is.
    if (originalUrl.includes("/storage/v1/object/sign/chat-media/")) {
      setState({ url: originalUrl, loading: false, error: null });
      return;
    }

    const path = extractChatMediaPath(originalUrl);
    if (!path) {
      setState({ url: originalUrl, loading: false, error: null });
      return;
    }

    const cached = cacheKey ? cache.get(cacheKey) : null;
    if (cached) {
      setState({ url: cached, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState({ url: originalUrl, loading: true, error: null });

    (async () => {
      try {
        const { data, error } = await supabase.storage
          .from("chat-media")
          .createSignedUrl(path, expiresIn);

        if (cancelled) return;

        if (error || !data?.signedUrl) {
          setState({ url: originalUrl, loading: false, error: error?.message ?? "signedUrl_missing" });
          return;
        }

        if (cacheKey) cache.set(cacheKey, data.signedUrl);
        setState({ url: data.signedUrl, loading: false, error: null });
      } catch (e) {
        if (cancelled) return;
        setState({
          url: originalUrl,
          loading: false,
          error: e instanceof Error ? e.message : "unknown_error",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [originalUrl, expiresIn, cacheKey]);

  return state;
}
