const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface OGMetadata {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
}

function extractMeta(html: string, property: string): string | null {
  // Try og:property
  const ogRegex = new RegExp(
    `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`,
    'i'
  );
  let match = html.match(ogRegex);
  if (match) return match[1];

  // Try content first then property
  const reverseRegex = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
    'i'
  );
  match = html.match(reverseRegex);
  if (match) return match[1];

  return null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() : null;
}

function extractFavicon(html: string, baseUrl: string): string | null {
  const iconRegex = /<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']*)["']/i;
  const match = html.match(iconRegex);
  if (match) {
    const href = match[1];
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return 'https:' + href;
    try {
      return new URL(href, baseUrl).href;
    } catch {
      return null;
    }
  }
  // Default favicon
  try {
    return new URL('/favicon.ico', baseUrl).href;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(formattedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MaskBot/1.0; +https://mask.lovable.app)',
        'Accept': 'text/html',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only parse first 50KB
    const reader = response.body?.getReader();
    let html = '';
    const decoder = new TextDecoder();
    if (reader) {
      let bytes = 0;
      while (bytes < 50000) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        bytes += value.length;
      }
      reader.cancel();
    }

    const ogTitle = extractMeta(html, 'og:title');
    const ogDesc = extractMeta(html, 'og:description');
    const ogImage = extractMeta(html, 'og:image');
    const ogSiteName = extractMeta(html, 'og:site_name');

    let imageUrl = ogImage;
    if (imageUrl && !imageUrl.startsWith('http')) {
      try { imageUrl = new URL(imageUrl, formattedUrl).href; } catch { /* ignore */ }
    }

    const metadata: OGMetadata = {
      url: formattedUrl,
      title: ogTitle || extractMeta(html, 'twitter:title') || extractTitle(html),
      description: ogDesc || extractMeta(html, 'twitter:description') || extractMeta(html, 'description'),
      image: imageUrl || extractMeta(html, 'twitter:image'),
      siteName: ogSiteName,
      favicon: extractFavicon(html, formattedUrl),
    };

    return new Response(
      JSON.stringify(metadata),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' } }
    );
  } catch (error) {
    console.error('OG metadata error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to fetch metadata' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
