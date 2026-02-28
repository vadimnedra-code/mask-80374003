import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
}

const cache = new Map<string, LinkPreviewData | null>();

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;

export function extractFirstUrl(text: string | null): string | null {
  if (!text) return null;
  const match = text.match(URL_REGEX);
  return match ? match[0] : null;
}

export function useLinkPreview(text: string | null) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const url = extractFirstUrl(text);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!url) { setPreview(null); return; }

    if (cache.has(url)) {
      setPreview(cache.get(url) ?? null);
      return;
    }

    setLoading(true);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    supabase.functions.invoke('og-metadata', { body: { url } })
      .then(({ data, error }) => {
        if (ctrl.signal.aborted) return;
        if (error || !data?.title) {
          cache.set(url, null);
          setPreview(null);
        } else {
          cache.set(url, data as LinkPreviewData);
          setPreview(data as LinkPreviewData);
        }
      })
      .catch(() => { if (!ctrl.signal.aborted) { cache.set(url, null); setPreview(null); } })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });

    return () => ctrl.abort();
  }, [url]);

  return { preview, loading, url };
}
